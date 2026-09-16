/**
 * Three.js scene with a floating origin: every object is positioned relative
 * to `origin` (the tracked vehicle, in ECI metres) so that float32 precision
 * is preserved near the camera. Scene axes coincide with ECI axes (Z = north).
 *
 * The scene is driven from a `VisualFrame`: Earth orientation, cloud drift, sky
 * colour, fog and exposure are all functions of the frame, so a replayed flight
 * renders identically to the live run.
 */
import * as THREE from 'three';
import type { Vec3 } from '../physics/vec3';
import type { VisualFrame } from '../physics/frame';
import { R_EARTH } from '../physics/constants';
import { skyState, type SkyState } from './sky';
import { hash11 } from './noise';

const EARTH_VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
    #include <logdepthbuf_vertex>
  }
`;
const EARTH_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D specMap;
  uniform vec3 sunDir;
  uniform vec3 camPos;
  uniform float rimGain;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    #include <logdepthbuf_fragment>
    vec3 n = normalize(vNormalW);
    float cosSun = dot(n, sunDir);
    float dayF = smoothstep(-0.12, 0.25, cosSun);
    vec3 day = texture2D(dayMap, vUv).rgb;
    vec3 night = texture2D(nightMap, vUv).rgb;
    vec3 col = day * (0.12 + 1.0 * max(cosSun, 0.0));
    col = mix(night * 1.4 + day * 0.03, col, dayF);
    float spec = texture2D(specMap, vUv).r;
    vec3 viewDir = normalize(camPos - vPosW);
    vec3 h = normalize(sunDir + viewDir);
    float s = pow(max(dot(n, h), 0.0), 48.0) * spec * dayF * 0.7;
    col += vec3(s * 0.9, s * 0.95, s);
    float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 4.5);
    col += vec3(0.30, 0.55, 1.0) * rim * (0.26 * dayF + 0.03) * rimGain;
    gl_FragColor = vec4(col, 1.0);
  }
`;
const ATMO_VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
    #include <logdepthbuf_vertex>
  }
`;
const ATMO_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 sunDir;
  uniform vec3 camPos;
  uniform float rimGain;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    #include <logdepthbuf_fragment>
    vec3 n = normalize(vNormalW);
    vec3 viewDir = normalize(camPos - vPosW);
    float d = max(dot(n, viewDir), 0.0);
    float band = smoothstep(0.0, 0.32, d) * (1.0 - smoothstep(0.32, 0.95, d));
    float lit = 0.2 + 0.8 * smoothstep(-0.25, 0.35, dot(n, sunDir));
    // warm scattering right at the terminator, cool blue elsewhere
    float sunset = smoothstep(-0.25, 0.05, dot(n, sunDir)) * (1.0 - smoothstep(0.05, 0.4, dot(n, sunDir)));
    vec3 col = mix(vec3(0.35, 0.6, 1.0), vec3(1.0, 0.55, 0.25), sunset * 0.8) * band * lit;
    gl_FragColor = vec4(col * rimGain, band * lit * 0.85 * rimGain);
  }
`;

/**
 * "Fog disabled" distances. Every fogged material in this scene is metre-scale
 * pad/vehicle geometry within a few tens of km of the camera; the Earth globe,
 * the atmosphere shell, the clouds and the star field all opt out of fog, so a
 * near plane of 1e9 m guarantees a fog factor of exactly 0 everywhere.
 */
const FOG_OFF_NEAR = 1e9;
const FOG_OFF_FAR = 2e9;

export interface EarthTextures {
  day: THREE.Texture;
  night: THREE.Texture;
  spec: THREE.Texture;
  clouds: THREE.Texture | null;
}

export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly earthGroup = new THREE.Group();
  readonly earthMesh: THREE.Mesh;
  readonly cloudMesh: THREE.Mesh | null;
  readonly atmoMesh: THREE.Mesh;
  readonly stars: THREE.Points;
  readonly sun: THREE.DirectionalLight;
  readonly ambient: THREE.AmbientLight;
  readonly hemi: THREE.HemisphereLight;
  private earthMat: THREE.ShaderMaterial;
  private atmoMat: THREE.ShaderMaterial;
  private starsMat: THREE.PointsMaterial;
  /**
   * One Fog instance that stays attached to the scene for the whole flight.
   *
   * Assigning `scene.fog = null` flips the `USE_FOG` define on every material
   * in the scene and forces a full shader recompile at whatever altitude the
   * haze switches off: measured at 98.9 ms (≈6 dropped frames) on the frame
   * where it happened, with the program count jumping 39 → 49. "No fog" is
   * therefore expressed by pushing `near`/`far` past anything the fogged
   * materials can ever reach, which costs one uniform upload.
   */
  private fog = new THREE.Fog(0x000000, FOG_OFF_NEAR, FOG_OFF_FAR);
  private shadowPos = new THREE.Vector3();
  private shadowRadius = 400;
  private shadowOn = false;
  /** the shadow map has been rendered at least once (see `update`) */
  private shadowPrimed = false;
  private sd = new THREE.Vector3(1, 0, 0);
  private qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  private qz = new THREE.Quaternion();
  private zAxis = new THREE.Vector3(0, 0, 1);
  private camEci = new THREE.Vector3();
  private camUp = new THREE.Vector3();
  private hazeColor = new THREE.Color(0.62, 0.68, 0.76);
  private pmrem: THREE.PMREMGenerator;
  private envCanvas: HTMLCanvasElement;
  private envTex: THREE.CanvasTexture;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private envKey = -1;
  /** saved scissor box, so `prewarm` can restore it (see `prewarm`) */
  private prevScissor = new THREE.Vector4();
  private envSky = new THREE.Color();
  private envHorizon = new THREE.Color();
  private envGround = new THREE.Color();
  origin: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(canvas: HTMLCanvasElement, tex: EarthTextures) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    // PCFSoftShadowMap was removed in three 0.18x and silently downgrades to
    // PCFShadowMap with a console warning on every renderer build
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.5, 5e9);
    this.camera.up.set(0, 0, 1);
    // attached once and never detached, so the USE_FOG define never flips
    this.scene.fog = this.fog;

    // Earth
    tex.day.colorSpace = THREE.SRGBColorSpace;
    tex.night.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.SphereGeometry(R_EARTH, 128, 96);
    this.earthMat = new THREE.ShaderMaterial({
      vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG,
      uniforms: {
        dayMap: { value: tex.day }, nightMap: { value: tex.night }, specMap: { value: tex.spec },
        sunDir: { value: new THREE.Vector3(1, 0, 0) }, camPos: { value: new THREE.Vector3() },
        rimGain: { value: 1 },
      },
    });
    this.earthMesh = new THREE.Mesh(geo, this.earthMat);
    this.earthGroup.add(this.earthMesh);
    if (tex.clouds) {
      const cm = new THREE.MeshLambertMaterial({ map: tex.clouds, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
      cm.alphaMap = tex.clouds;
      this.cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH + 9000, 96, 64), cm);
      this.earthGroup.add(this.cloudMesh);
    } else {
      this.cloudMesh = null;
    }
    this.atmoMat = new THREE.ShaderMaterial({
      vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.FrontSide,
      uniforms: { sunDir: { value: new THREE.Vector3(1, 0, 0) }, camPos: { value: new THREE.Vector3() }, rimGain: { value: 1 } },
    });
    this.atmoMesh = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH + 110e3, 96, 64), this.atmoMat);
    this.earthGroup.add(this.atmoMesh);
    this.scene.add(this.earthGroup);

    // stars: fixed pseudo-random field, generated once at construction
    const N = 3500;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // deterministic spiral distribution (no Math.random, so the sky is stable)
      const u = -1 + (2 * i + 1) / N;
      const ph = i * 2.39996323;
      const rr = Math.sqrt(Math.max(0, 1 - u * u));
      const R = 4e8;
      pos[i * 3] = R * rr * Math.cos(ph);
      pos[i * 3 + 1] = R * rr * Math.sin(ph);
      pos[i * 3 + 2] = R * u;
      const b = 0.45 + 0.55 * hash11(i * 1.37);
      const tint = hash11(i * 3.91 + 7);
      col[i * 3] = b * (tint < 0.25 ? 1.0 : 0.88);
      col[i * 3 + 1] = b * 0.92;
      col[i * 3 + 2] = b * (tint > 0.75 ? 1.0 : 0.9);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.starsMat = new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, fog: false });
    this.stars = new THREE.Points(sg, this.starsMat);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    // lights
    this.sun = new THREE.DirectionalLight(0xfff4e0, 3.3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.6;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    // Fill light is near-neutral: a saturated blue ambient at this strength
    // repaints every vehicle slate blue and hides the per-vehicle liveries.
    this.ambient = new THREE.AmbientLight(0xc4c7cc, 0.3);
    this.scene.add(this.ambient);
    this.hemi = new THREE.HemisphereLight(0xa8c0e0, 0x6a5a46, 0.35);
    this.scene.add(this.hemi);

    // A tiny procedural sky/ground environment probe. Without one, every
    // metallic material (lattice towers, engine bells, Starship's steel) has
    // nothing to reflect and renders almost black.
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.pmrem.compileEquirectangularShader();
    this.envCanvas = document.createElement('canvas');
    this.envCanvas.width = 64;
    this.envCanvas.height = 32;
    this.envTex = new THREE.CanvasTexture(this.envCanvas);
    this.envTex.mapping = THREE.EquirectangularReflectionMapping;
    this.envTex.colorSpace = THREE.SRGBColorSpace;
    this.scene.environmentIntensity = 0.45;
    // Build a first probe immediately. `scene.environment` is part of every lit
    // material's program cache key (the ENVMAP define), so leaving it null until
    // the first rendered frame would make `prewarm` compile the whole scene in
    // its no-env variant and then recompile each material the first time it is
    // actually drawn — measured as a 13-14 ms hitch on the booster-separation
    // frame, when the debris materials first reach the renderer.
    this.updateEnvironment(skyState(0.4, 0));
  }

  /**
   * Regenerate the environment probe when the sky has changed appreciably.
   * The key is coarse (5 × 5 buckets) so a whole launch triggers a handful of
   * PMREM passes over a 64 × 32 source rather than one per frame.
   */
  private updateEnvironment(sky: SkyState): void {
    const key = Math.round(sky.dayFactor * 4) * 8 + Math.round(sky.groundFactor * 4);
    if (key === this.envKey) return;
    this.envKey = key;
    const g = this.envCanvas.getContext('2d')!;
    const W = this.envCanvas.width, H = this.envCanvas.height;
    const sky1 = this.envSky.copy(sky.color).multiplyScalar(1.15);
    const horizon = this.envHorizon.copy(sky.color).lerp(this.hazeColor, 0.45 * sky.dayFactor);
    const ground = this.envGround.setRGB(0.20, 0.19, 0.16).multiplyScalar(0.25 + 0.75 * sky.dayFactor * sky.groundFactor);
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, `#${sky1.getHexString()}`);
    grad.addColorStop(0.48, `#${horizon.getHexString()}`);
    grad.addColorStop(0.52, `#${ground.getHexString()}`);
    grad.addColorStop(1, `#${ground.getHexString()}`);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    this.envTex.needsUpdate = true;
    const rt = this.pmrem.fromEquirectangular(this.envTex);
    this.envRT?.dispose();
    this.envRT = rt;
    this.scene.environment = rt.texture;
  }

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  /** Convert an ECI position (m) into scene coordinates relative to the origin. */
  toScene(v: Vec3, out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(v.x - this.origin.x, v.y - this.origin.y, v.z - this.origin.z);
  }

  /**
   * Restrict the shadow map to a small region (the pad) so a 1024² map still
   * produces crisp shadows at a site that is 6000 km from the scene origin.
   */
  setShadowFocus(pos: THREE.Vector3, radius: number, enabled: boolean): void {
    this.shadowPos.copy(pos);
    this.shadowRadius = radius;
    this.shadowOn = enabled;
  }

  /** Per-frame update of Earth orientation, sun direction, sky and exposure. */
  update(frame: VisualFrame, sunDir: Vec3, cameraAltitude: number): void {
    // Earth orientation: geometry is Y-up with the texture seam handled by the
    // SphereGeometry convention (u=0.5 at +X); rotate X by 90° so the pole is +Z,
    // then spin about Z by the sidereal angle.
    this.qz.setFromAxisAngle(this.zAxis, frame.theta);
    this.earthMesh.quaternion.copy(this.qz).multiply(this.qx);
    if (this.cloudMesh) {
      this.qz.setFromAxisAngle(this.zAxis, frame.theta + frame.t * 4e-7);
      this.cloudMesh.quaternion.copy(this.qz).multiply(this.qx);
    }
    this.earthGroup.position.set(-this.origin.x, -this.origin.y, -this.origin.z);
    const sd = this.sd.set(sunDir.x, sunDir.y, sunDir.z).normalize();
    (this.earthMat.uniforms.sunDir.value as THREE.Vector3).copy(sd);
    (this.atmoMat.uniforms.sunDir.value as THREE.Vector3).copy(sd);
    (this.earthMat.uniforms.camPos.value as THREE.Vector3).copy(this.camera.position);
    (this.atmoMat.uniforms.camPos.value as THREE.Vector3).copy(this.camera.position);
    this.stars.position.copy(this.camera.position);

    const camEci = this.camEci.set(
      this.camera.position.x + this.origin.x,
      this.camera.position.y + this.origin.y,
      this.camera.position.z + this.origin.z,
    );
    this.camUp.copy(camEci);
    const sunElev = this.camUp.lengthSq() > 1 ? this.camUp.normalize().dot(sd) : 1;
    const sky = skyState(sunElev, cameraAltitude);
    this.updateEnvironment(sky);
    this.renderer.setClearColor(sky.color, 1);
    this.renderer.toneMappingExposure = sky.exposure;
    this.starsMat.opacity = sky.stars;
    this.ambient.intensity = sky.ambient;
    this.hemi.intensity = sky.hemi;
    this.hemi.position.copy(sky.groundFactor > 0.5 ? this.camUp : sd);
    const rim = 0.25 + 0.75 * (1 - sky.groundFactor);
    this.earthMat.uniforms.rimGain.value = rim;
    this.atmoMat.uniforms.rimGain.value = rim;

    // Horizon haze near the pad only. The Fog object is never detached (see
    // the field comment): above the haze layer its distances are pushed out of
    // range instead, which leaves the USE_FOG define — and therefore every
    // compiled program — untouched for the whole flight.
    this.fog.color.copy(sky.color).lerp(this.hazeColor, 0.35 * sky.dayFactor);
    if (sky.fogFar > 0) {
      this.fog.near = sky.fogNear;
      this.fog.far = sky.fogFar;
    } else {
      this.fog.near = FOG_OFF_NEAR;
      this.fog.far = FOG_OFF_FAR;
    }

    // Sun placement: always close to the focus point, with a tight shadow
    // frustum around it. A directional light's direction is `position −
    // target`, so putting the light 2 km from the pad instead of 10 000 km
    // down the sun vector does not change the lighting by so much as a bit.
    //
    // `castShadow` deliberately never changes. It feeds NUM_DIR_LIGHT_SHADOWS,
    // which is part of the program cache key, so flipping it mid-ascent
    // recompiles every lit material in the scene — the same multi-frame hitch
    // that detaching the fog used to cause. What `shadowOn` gates is the only
    // part that actually costs per-frame time: re-rendering the shadow map.
    // Outside the pad region the vehicle is far outside the shadow frustum, and
    // three's shadow lookup returns "lit" for coordinates outside it.
    const d = Math.max(2000, this.shadowRadius * 6);
    this.sun.position.copy(this.shadowPos).addScaledVector(sd, d);
    this.sun.target.position.copy(this.shadowPos);
    const cam = this.sun.shadow.camera;
    cam.left = -this.shadowRadius; cam.right = this.shadowRadius;
    cam.top = this.shadowRadius; cam.bottom = -this.shadowRadius;
    cam.near = 1; cam.far = d * 2.2;
    cam.updateProjectionMatrix();
    // One forced pass on the first frame allocates the depth texture: sampling
    // a never-rendered shadow map is what produces the "mismatch between
    // texture format and sampler type" GL errors.
    if (this.shadowOn || !this.shadowPrimed) {
      this.shadowPrimed = true;
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.sun.target.updateMatrixWorld();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Pay every one-off rendering cost of a freshly built mission up front, while
   * the user is still looking at the vehicle on the pad, instead of as a
   * multi-frame hitch part-way up the ascent.
   *
   * Two separate costs are involved.
   *
   * `renderer.compile` walks the scene with `traverse` (not `traverseVisible`),
   * so it builds the shader program of every material, including the plumes and
   * the ground smoke that are hidden until ignition. It must run with the
   * environment probe already attached — `scene.environment` is part of the
   * program cache key, so compiling with it null would build the whole scene in
   * its no-env variant and recompile each material on first draw. The probe is
   * therefore created in the constructor.
   *
   * What `compile` does *not* do is build the per-material uniform list, bind
   * the vertex attributes or upload the geometry buffers; three does that the
   * first time a mesh is really drawn. Every plume, nozzle glow, ignition flash
   * and ground-smoke puff becomes visible within one frame of each other at
   * ignition, and that frame measured 19.5 ms of CPU time (draw calls 81 → 114)
   * — over a dropped frame, right at T-3 s. So draw one throwaway frame with
   * everything forced visible, clipped by the scissor box to a single pixel so
   * the fill cost is nil and nothing reaches the screen (this runs inside
   * `setupViews`, before the next animation frame paints).
   */
  prewarm(): void {
    this.renderer.compile(this.scene, this.camera);
    const hidden: THREE.Object3D[] = [];
    this.scene.traverse((o) => { if (!o.visible) { o.visible = true; hidden.push(o); } });
    const scissorTest = this.renderer.getScissorTest();
    this.renderer.getScissor(this.prevScissor);
    this.renderer.setScissor(0, 0, 1, 1);
    this.renderer.setScissorTest(true);
    // The shadow pass has to run on this frame, not be suppressed: sampling a
    // shadow map whose depth texture has never been rendered is what raises
    // `GL_INVALID_OPERATION: mismatch between texture format and sampler type`.
    // The focus region is still at its defaults here, which does not matter —
    // the first real `update` re-aims the shadow camera and re-renders it.
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
    this.shadowPrimed = true;
    this.renderer.setScissorTest(scissorTest);
    const s = this.prevScissor;
    this.renderer.setScissor(s.x, s.y, s.z, s.w);
    for (const o of hidden) o.visible = false;
    // Leave a complete image in the drawing buffer. `prewarm` is called from a
    // DOM event handler (a panel change), not from inside the animation frame,
    // so the compositor can pick the buffer up before the next real frame is
    // drawn; with `preserveDrawingBuffer` off, a buffer in which only one pixel
    // was written is undefined everywhere else.
    this.render();
  }

  /**
   * Release the GPU resources owned by the scene itself. SceneManager currently
   * lives for the lifetime of the app, so nothing calls this yet; it exists so
   * that the wave-2 recorder can tear a scene down without leaking the PMREM
   * render target, the environment canvas texture or the Earth/atmosphere
   * shaders. Per-mission resources are owned by RocketView / LaunchPadView and
   * disposed in `setupViews`.
   */
  dispose(): void {
    this.scene.environment = null;
    this.envRT?.dispose();
    this.envRT = null;
    this.envTex.dispose();
    this.pmrem.dispose();
    this.earthMat.dispose();
    this.atmoMat.dispose();
    this.starsMat.dispose();
    this.earthMesh.geometry.dispose();
    this.atmoMesh.geometry.dispose();
    this.stars.geometry.dispose();
    if (this.cloudMesh) {
      this.cloudMesh.geometry.dispose();
      const cm = this.cloudMesh.material as THREE.MeshLambertMaterial;
      cm.map?.dispose();
      cm.dispose();
    }
    for (const u of ['dayMap', 'nightMap', 'specMap'] as const) {
      const tex = this.earthMat.uniforms[u]?.value;
      if (tex instanceof THREE.Texture) tex.dispose();
    }
    this.scene.clear();
  }
}

export function loadEarthTextures(base: string): Promise<EarthTextures> {
  const loader = new THREE.TextureLoader();
  const load = (name: string) => new Promise<THREE.Texture | null>((resolve) => {
    loader.load(`${base}textures/${name}`, (t) => { t.anisotropy = 4; resolve(t); }, undefined, () => resolve(null));
  });
  return Promise.all([load('earth_atmos_2048.jpg'), load('earth_lights_2048.png'), load('earth_specular_2048.jpg'), load('earth_clouds_1024.png')]).then(
    ([day, night, spec, clouds]) => ({
      day: day ?? proceduralTexture('#2a5ea8', '#3f7a3a'),
      night: night ?? proceduralTexture('#000000', '#000000'),
      spec: spec ?? proceduralTexture('#ffffff', '#000000'),
      clouds,
    }),
  );
}

/** Fallback texture when the image files are missing (stylised ocean/land noise). */
function proceduralTexture(ocean: string, land: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = ocean;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = land;
  for (let i = 0; i < 60; i++) {
    const u = hash11(i * 1.9);
    const v = hash11(i * 4.3 + 11);
    g.beginPath();
    g.ellipse(u * 512, 40 + v * 180, 20 + u * 60, 10 + v * 30, u * 3, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
