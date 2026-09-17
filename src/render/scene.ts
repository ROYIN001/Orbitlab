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
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { Vec3 } from '../physics/vec3';
import type { VisualFrame } from '../physics/frame';
import { R_EARTH } from '../physics/constants';
import { skyState, type SkyState } from './sky';
import { clamp01, hash11, smoothstep } from './noise';

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
/*
 * Both custom shaders end with the two body chunks three.js appends to every
 * built-in material:
 *
 *   #include <tonemapping_fragment>   ACES filmic at `toneMappingExposure`
 *   #include <colorspace_fragment>    linear -> sRGB for the output buffer
 *
 * Only the *body* chunks. three already injects `tonemapping_pars_fragment`
 * and `colorspace_pars_fragment` into the prefix of every non-raw
 * ShaderMaterial (WebGLProgram, prefixFragment), and neither has an include
 * guard, so adding the pars chunks here would redeclare `toneMappingExposure`
 * and redefine ACESFilmicToneMapping — a GLSL redefinition error that makes
 * the planet disappear. `tonemapping_fragment` compiles to nothing when
 * TONE_MAPPING is undefined, so this is safe whatever the renderer is set to.
 *
 * Every constant below is tuned for the *tone-mapped* pipeline: the encoder
 * lifts the midtones hard (linear 0.05 leaves as 0.20, 0.30 as 0.66), so the
 * night lights, the limb rim and the specular term are all a fraction of what
 * they were when the shader wrote raw linear values into an sRGB buffer.
 */
const EARTH_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D specMap;
  uniform sampler2D normalMap;
  uniform float normalScale;
  uniform vec3 sunDir;
  uniform vec3 camPos;
  uniform float rimGain;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  /**
   * Tangent-space normal perturbation built from screen-space derivatives
   * (Mikkelsen's method, the same one three's bump/normal chunks use). The
   * sphere carries no tangent attribute and generating one for a 128x96 globe
   * would double its vertex data for a term that is only ever a shading
   * detail.
   */
  vec3 perturbNormal(vec3 N, vec3 p, vec2 uv, vec3 mapN) {
    vec3 q0 = dFdx(p), q1 = dFdy(p);
    vec2 st0 = dFdx(uv), st1 = dFdy(uv);
    vec3 q1perp = cross(q1, N), q0perp = cross(N, q0);
    vec3 T = q1perp * st0.x + q0perp * st1.x;
    vec3 B = q1perp * st0.y + q0perp * st1.y;
    float det = max(dot(T, T), dot(B, B));
    float scale = (det == 0.0) ? 0.0 : inversesqrt(det);
    return normalize(T * (mapN.x * scale) + B * (mapN.y * scale) + N * mapN.z);
  }
  void main() {
    #include <logdepthbuf_fragment>
    vec3 nGeo = normalize(vNormalW);
    // Relief. The normal map is a real elevation derivative, so it shades
    // mountain ranges and ocean trenches by the sun's own direction — the
    // Himalayas, the Andes and the Rockies pick up a terminator shadow instead
    // of staying as flat as the photograph they are painted with.
    vec3 mapN = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
    mapN.xy *= normalScale;
    vec3 n = normalScale > 0.001 ? perturbNormal(nGeo, vPosW, vUv, mapN) : nGeo;
    // Day/night is a planet-scale quantity: taking it from the perturbed
    // normal would let a hillside flip its own local time and scatter city
    // lights across the sunlit side.
    float cosSunGeo = dot(nGeo, sunDir);
    float cosSun = dot(n, sunDir);
    float dayF = smoothstep(-0.12, 0.25, cosSunGeo);
    vec3 day = texture2D(dayMap, vUv).rgb;
    vec3 night = texture2D(nightMap, vUv).rgb;
    vec3 col = day * (0.09 + 0.95 * max(cosSun, 0.0));
    col = mix(night * 0.55 + day * 0.012, col, dayF);
    float spec = texture2D(specMap, vUv).r;
    vec3 viewDir = normalize(camPos - vPosW);
    vec3 h = normalize(sunDir + viewDir);
    // Sun glint off water. Tighter and weaker than it was: tone mapping lifts
    // it hard, and a broad pow-48 lobe at the old gain blew out into a haze
    // blob over the ocean instead of reading as a glint. It uses the geometric
    // normal: a 110-power lobe off a perturbed normal turns the relief into
    // glitter wherever the specular map bleeds onto a coast.
    float s = pow(max(dot(nGeo, h), 0.0), 110.0) * spec * dayF * 0.30;
    col += vec3(s * 0.9, s * 0.95, s);
    float rim = pow(1.0 - max(dot(nGeo, viewDir), 0.0), 4.5);
    col += vec3(0.30, 0.55, 1.0) * rim * (0.14 * dayF + 0.008) * rimGain;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
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
    // Brightest exactly at the silhouette, where the line of sight runs the
    // longest way through the shell, and falling away towards the sub-camera
    // point. The previous band peaked at d = 0.32 — about 70° in from the limb
    // — which put a broad additive lobe in the middle of the sunlit disc; once
    // the shader was tone-mapped that lobe blew out into a white blob sitting
    // on the planet.
    float band = pow(1.0 - d, 3.0);
    float lit = 0.2 + 0.8 * smoothstep(-0.25, 0.35, dot(n, sunDir));
    // warm scattering right at the terminator, cool blue elsewhere
    float sunset = smoothstep(-0.25, 0.05, dot(n, sunDir)) * (1.0 - smoothstep(0.05, 0.4, dot(n, sunDir)));
    vec3 col = mix(vec3(0.35, 0.6, 1.0), vec3(1.0, 0.55, 0.25), sunset * 0.8) * band * lit;
    // additive rim: the alpha term is the blend weight, so the colour is
    // tone-mapped and encoded first and only then scaled into the buffer
    gl_FragColor = vec4(col * rimGain, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor.a = band * lit * 0.62 * rimGain;
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

/** Full-sun intensity of the key light (outside the Earth's shadow). */
const SUN_INTENSITY = 3.3;

/**
 * Bloom. The threshold is in LINEAR light, above the tone mapper: 1.0 is what
 * an ACES-exposed frame renders as white, so only the plume core, the ignition
 * flash, the sun and the brightest specular glints cross it. A daytime pad —
 * concrete at 0.5, sky at 0.3 — stays entirely below and does not glow.
 */
const BLOOM_THRESHOLD = 1.0;
const BLOOM_RADIUS = 0.5;
/** …at the pad, where the haze already scatters, and in vacuum, where it does not. */
const BLOOM_GROUND = 0.32;
const BLOOM_SPACE = 0.62;

/**
 * Galactic north pole in equatorial (≈ ECI) coordinates: α = 192.86°,
 * δ = +27.13°. The Milky Way is the great circle perpendicular to it, which is
 * where the extra faint stars are packed.
 */
const GAL_POLE = new THREE.Vector3(-0.8677, -0.1978, 0.4560).normalize();

const WHITE = new THREE.Color(1, 1, 1);
/** warm bounce off soil and concrete at the pad */
const TERRAIN_BOUNCE = new THREE.Color(0x6a5a46);
/** Earth-shine: sunlight bounced off ocean and cloud, seen from orbit */
const EARTH_BOUNCE = new THREE.Color(0x5a86c0);
/** sunlight above the haze */
const SUN_WHITE = new THREE.Color(0xfff4e0);
/** sunlight through a long slant path near the horizon */
const SUN_LOW = new THREE.Color(0xff9d5c);

const STAR_VERT = /* glsl */ `
  #include <common>
  attribute vec3 aColor;
  attribute float aSize;
  varying vec3 vCol;
  void main() {
    vCol = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize;
  }
`;
const STAR_FRAG = /* glsl */ `
  #include <common>
  uniform float uOpacity;
  varying vec3 vCol;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    // Gaussian point spread instead of a hard square: a 1-pixel square is what
    // made the old field read as graph paper rather than sky
    float g = exp(-dot(d, d) * 17.0);
    float a = g * uOpacity;
    if (a < 0.006) discard;
    gl_FragColor = vec4(vCol, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface EarthTextures {
  day: THREE.Texture;
  night: THREE.Texture;
  spec: THREE.Texture;
  /** elevation-derived normal map; relief shading is skipped when it is missing */
  normal: THREE.Texture | null;
  clouds: THREE.Texture | null;
}

/** Strength of the Earth's relief shading (0 disables the whole term). */
const RELIEF_STRENGTH = 0.85;

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
  /** Earth-shine fill from nadir, the only fill light there is in vacuum */
  readonly albedo: THREE.DirectionalLight;
  /** screen-space marker for the tracked vehicle when it is too small to see */
  readonly marker: THREE.Sprite;
  private earthMat: THREE.ShaderMaterial;
  private atmoMat: THREE.ShaderMaterial;
  private starsMat: THREE.ShaderMaterial;
  private markerMat: THREE.SpriteMaterial;
  private markerTex: THREE.CanvasTexture;
  private markerCanvas: HTMLCanvasElement;
  private markerLabel = '';
  /** viewport size in CSS pixels, kept for the marker's angular-size test */
  private viewH = 1;
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
  /** scratch for the light rebalance and the eclipse test (no per-frame allocation) */
  private envBasis = new THREE.Matrix4();
  private envX = new THREE.Vector3();
  private envZ = new THREE.Vector3();
  private envQuat = new THREE.Quaternion();
  private hemiSky = new THREE.Color();
  private hemiGround = new THREE.Color();
  private perp = new THREE.Vector3();
  private originV = new THREE.Vector3();
  origin: Vec3 = { x: 0, y: 0, z: 0 };
  /** post-processing chain: MSAA scene target -> bloom -> tone map + sRGB */
  private composer: EffectComposer;
  private sceneTarget: THREE.WebGLRenderTarget;
  private bloomPass: UnrealBloomPass;
  /** clear colour pre-compensated for the output pass's tone mapping */
  private clearColor = new THREE.Color();
  private clearKey = '';

  constructor(canvas: HTMLCanvasElement, tex: EarthTextures) {
    // `antialias` is a request for a multisampled *default* framebuffer, and
    // the scene is no longer drawn into one — every frame goes through the
    // composer's own 4x target (see the end of this constructor). Asking for
    // both would allocate a multisample buffer for the canvas that nothing ever
    // draws into.
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
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
        // A sampler uniform must be bound to something even when the feature is
        // off: an unbound sampler2D reads as unit 0 and would sample the day map
        // as if it were a normal map.
        normalMap: { value: tex.normal ?? flatNormalTexture() },
        normalScale: { value: tex.normal ? RELIEF_STRENGTH : 0 },
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

    this.stars = buildStarField();
    this.starsMat = this.stars.material as THREE.ShaderMaterial;
    this.scene.add(this.stars);

    // lights
    this.sun = new THREE.DirectionalLight(0xfff4e0, SUN_INTENSITY);
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
    // Earth-shine: in vacuum the only fill is sunlight bounced off the planet,
    // arriving from nadir and distinctly blue. Created here and never removed —
    // the light count is part of every lit material's program cache key, so
    // adding one mid-flight would recompile the whole scene.
    this.albedo = new THREE.DirectionalLight(0x7ea8d8, 0);
    this.scene.add(this.albedo);
    this.scene.add(this.albedo.target);

    // Space-view marker: the vehicle is ~0.03 px across from the default space
    // camera, so beyond a few hundred km it is represented by a fixed-size
    // sprite instead (see `updateMarker`).
    this.markerCanvas = document.createElement('canvas');
    this.markerCanvas.width = 320;
    this.markerCanvas.height = 128;
    this.markerTex = new THREE.CanvasTexture(this.markerCanvas);
    this.markerTex.colorSpace = THREE.SRGBColorSpace;
    this.drawMarker('');
    // `depthTest: false` on purpose. The sprite is a flat quad at the
    // vehicle's own depth, and from a few thousand kilometres away the Earth's
    // near surface is *closer* than that plane over part of the quad — so with
    // depth testing the marker was sliced off by the planet's bulge mid-word.
    // It is a screen-space annotation; it always draws on top.
    this.markerMat = new THREE.SpriteMaterial({ map: this.markerTex, transparent: true, depthWrite: false, depthTest: false, opacity: 0, sizeAttenuation: false, fog: false });
    this.marker = new THREE.Sprite(this.markerMat);
    this.marker.renderOrder = 10;
    this.marker.visible = false;
    this.marker.frustumCulled = false;
    this.scene.add(this.marker);

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
    this.updateEnvironment(skyState(0.4, 0), 0.4);

    // ------------------------------------------------- post-processing
    //
    // The scene is drawn into a half-float multisampled target, bloomed, and
    // resolved to the canvas by an `OutputPass` that applies exactly the tone
    // mapping and sRGB encoding the materials used to apply themselves: three
    // compiles every material with `NoToneMapping` while a render target is
    // bound (WebGLRenderer, `getParameters`), so the two never both run.
    //
    // The chain is ALWAYS in the path, even with bloom switched off, and the
    // toggle only flips `bloomPass.enabled`. Rendering to the canvas one frame
    // and to a target the next would flip the tone-mapping and colour-space
    // defines on every material in the scene, and the recompile that follows is
    // the same multi-frame hitch the fog and the shadow flags are carefully
    // written to avoid. Switching bloom off then costs one full-screen blit,
    // not a stall.
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.sceneTarget = new THREE.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), {
      type: THREE.HalfFloatType, samples: 4, depthBuffer: true, stencilBuffer: false,
    });
    this.sceneTarget.texture.name = 'orbitlab.scene';
    this.composer = new EffectComposer(this.renderer, this.sceneTarget);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(Math.max(1, size.x), Math.max(1, size.y)), BLOOM_GROUND, BLOOM_RADIUS, BLOOM_THRESHOLD);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
  }

  /** Turn the bloom pass on or off (the rest of the chain always runs). */
  setBloom(on: boolean): void {
    this.bloomPass.enabled = on;
  }

  get bloomEnabled(): boolean {
    return this.bloomPass.enabled;
  }

  /**
   * Regenerate the environment probe when the sky has changed appreciably.
   * The key is coarse (5 × 5 buckets) so a whole launch triggers a handful of
   * PMREM passes over a 64 × 32 source rather than one per frame.
   */
  private updateEnvironment(sky: SkyState, sunElev: number): void {
    // The sun's *elevation* is part of the key, the azimuth never is: the probe
    // is oriented so the sun always sits at u = 0.5 (see `orientEnvironment`).
    const elevBucket = Math.round((Math.max(-1, Math.min(1, sunElev)) + 1) * 6);
    const key = (Math.round(sky.dayFactor * 4) * 8 + Math.round(sky.groundFactor * 4)) * 16 + elevBucket;
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

    // The sun itself. Without a bright, small highlight in the probe there is
    // nothing for a metal to reflect but a flat gradient, and every metallic
    // surface — engine bells, lattice towers, Starship's steel — renders as a
    // dull, near-black shape. `equirectUv` maps a direction to
    // u = atan2(z, x)/2π + 0.5, v = asin(y)/π + 0.5, and the canvas is uploaded
    // flipped (flipY), so v = 1 is the top row.
    const v = 0.5 + Math.asin(Math.max(-1, Math.min(1, sunElev))) / Math.PI;
    const cx = W * 0.5;
    const cy = (1 - v) * H;
    const rad = W * 0.085;
    const halo = g.createRadialGradient(cx, cy, 0, cx, cy, rad * 3.4);
    halo.addColorStop(0, 'rgba(255,248,230,0.95)');
    halo.addColorStop(0.16, 'rgba(255,236,196,0.55)');
    halo.addColorStop(0.5, 'rgba(255,224,180,0.16)');
    halo.addColorStop(1, 'rgba(255,220,170,0)');
    g.fillStyle = halo;
    g.beginPath();
    g.arc(cx, cy, rad * 3.4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fffdf6';
    g.beginPath();
    g.arc(cx, cy, rad, 0, Math.PI * 2);
    g.fill();

    this.envTex.needsUpdate = true;
    const rt = this.pmrem.fromEquirectangular(this.envTex);
    this.envRT?.dispose();
    this.envRT = rt;
    this.scene.environment = rt.texture;
  }

  /**
   * Rotate the environment probe so its +Y is the camera's local up and its +X
   * is the horizontal direction of the sun.
   *
   * Without this the probe's sky/ground split sits on the world Y axis, which
   * near a launch site is some arbitrary direction through the planet — a pad
   * at 45° latitude reflected half sky and half dirt on every horizontal
   * surface. Pinning the sun to a fixed azimuth in probe space is also what
   * lets the probe be cached: only its elevation can change the image.
   */
  private orientEnvironment(up: THREE.Vector3, sd: THREE.Vector3): void {
    this.envX.copy(sd).addScaledVector(up, -sd.dot(up));
    if (this.envX.lengthSq() < 1e-8) this.envX.set(up.z, up.x, up.y).cross(up);
    this.envX.normalize();
    this.envZ.crossVectors(this.envX, up).normalize();
    this.envBasis.makeBasis(this.envX, up, this.envZ);
    this.envQuat.setFromRotationMatrix(this.envBasis);
    this.scene.environmentRotation.setFromQuaternion(this.envQuat);
  }

  /** Repaint the marker sprite's canvas (only when the vehicle name changes). */
  private drawMarker(label: string): void {
    const c = this.markerCanvas;
    const g = c.getContext('2d')!;
    const W = c.width, H = c.height;
    g.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.38, r = 26;
    // Everything is drawn twice, dark then light. The marker has to stay
    // legible against a black sky and against sunlit cloud in the same pass,
    // and a single light stroke disappears over the second.
    const ring = (): void => {
      for (const a0 of [0.35, Math.PI - 0.35, Math.PI + 0.35, -0.35]) {
        g.beginPath();
        g.arc(cx, cy, r, a0, a0 + 0.9);
        g.stroke();
      }
      for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * (r + 3), cy + Math.sin(a) * (r + 3));
        g.lineTo(cx + Math.cos(a) * (r + 9), cy + Math.sin(a) * (r + 9));
        g.stroke();
      }
    };
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.lineWidth = 5.5;
    ring();
    g.strokeStyle = 'rgba(168,220,255,0.98)';
    g.lineWidth = 2.4;
    ring();
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.beginPath();
    g.arc(cx, cy, 4.4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(214,240,255,0.95)';
    g.beginPath();
    g.arc(cx, cy, 2.6, 0, Math.PI * 2);
    g.fill();
    if (label) {
      // shrink to fit rather than clip: "Falcon 9 Block 5" and
      // "Союз-2.1а" are very different widths at the same point size
      let px = 17;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (; px > 9; px--) {
        g.font = `600 ${px}px "Helvetica Neue", Arial, sans-serif`;
        if (g.measureText(label).width <= W - 16) break;
      }
      const ty = H * 0.80;
      const tw = g.measureText(label).width;
      // a dark plate behind the caption, so the name reads over white cloud
      g.fillStyle = 'rgba(8,12,18,0.52)';
      const bw = tw + 16, bh = px + 10;
      const bx = cx - bw / 2, by = ty - bh / 2;
      const rr = bh / 2;
      g.beginPath();
      g.moveTo(bx + rr, by);
      g.arcTo(bx + bw, by, bx + bw, by + bh, rr);
      g.arcTo(bx + bw, by + bh, bx, by + bh, rr);
      g.arcTo(bx, by + bh, bx, by, rr);
      g.arcTo(bx, by, bx + bw, by, rr);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(224,242,255,0.96)';
      g.fillText(label, cx, ty);
    }
    this.markerLabel = label;
    this.markerTex.needsUpdate = true;
  }

  /**
   * Show the marker only once the vehicle itself has stopped being visible.
   *
   * A 70 m stack seen from the default space camera (~12 000 km away, 45° fov)
   * subtends about 0.03 px, so the space view is otherwise an empty planet with
   * coloured lines on it. The sprite has `sizeAttenuation = false`, which in
   * three means a constant *angular* size, so its scale is set from the fov and
   * the viewport height to land on a fixed number of pixels at any distance.
   *
   * @param vehicleSize longest dimension of the tracked object, m
   */
  private updateMarker(frame: VisualFrame, vehicleSize: number): void {
    if (frame.vehicleName && frame.vehicleName !== this.markerLabel) this.drawMarker(frame.vehicleName);
    const d = this.camera.position.length();
    const halfFov = Math.tan((this.camera.fov * Math.PI) / 360);
    // projected height of the vehicle, in CSS pixels
    const px = d > 1 ? (vehicleSize / d / (2 * halfFov)) * this.viewH : 1e9;
    const fade = 1 - smoothstep(6, 22, px);
    const on = fade > 0.01 && !frame.destroyed && d > 1;
    this.marker.visible = on;
    if (!on) return;
    this.markerMat.opacity = fade * 0.92;
    // 96 px tall on screen, whatever the distance and whatever the fov is.
    // The caption is about an eighth of the sprite, so anything much smaller
    // renders the vehicle name at under ten pixels and it stops being readable.
    const s = (96 / this.viewH) * 2 * halfFov;
    this.marker.scale.set(s * (this.markerCanvas.width / this.markerCanvas.height), s, 1);
  }

  // `setVehicleLabel(name)` used to live here, to override the marker's label
  // from outside. Nothing ever called it (`noUnusedLocals` does not catch a
  // public method, so it sat here unnoticed through two waves) and the label
  // is carried on the frame as `vehicleName`, which is the frame-driven answer.
  // Deleted rather than wired up.

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.viewH = Math.max(1, h);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  /**
   * Re-read `devicePixelRatio`. Called when the window moves to a display with
   * different scaling, or when the page is zoomed; `main.ts` watches for it.
   */
  setPixelRatio(): void {
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    if (pr === this.renderer.getPixelRatio()) return;
    this.renderer.setPixelRatio(pr);
    this.composer.setPixelRatio(pr);
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

  /**
   * Per-frame update of Earth orientation, sun direction, sky and exposure.
   *
   * @param vehicleSize longest dimension of the tracked object, m — only the
   *        space-view marker uses it, and only to decide when the real geometry
   *        has become too small to see. The default is a mid-size launcher.
   */
  update(frame: VisualFrame, sunDir: Vec3, cameraAltitude: number, vehicleSize = 55): void {
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
    // `camUp` becomes the local vertical for the hemisphere light, the
    // environment probe and the Earth-shine fill, so it must be a unit vector
    // even in the degenerate frame where the camera sits on the Earth's centre
    if (this.camUp.lengthSq() <= 1) this.camUp.copy(this.zAxis);
    const sunElev = this.camUp.normalize().dot(sd);
    const sky = skyState(sunElev, cameraAltitude);
    this.updateEnvironment(sky, sunElev);
    this.orientEnvironment(this.camUp, sd);
    this.renderer.toneMappingExposure = sky.exposure;
    this.setSkyClearColor(sky);
    // Bloom is a scattering effect, and what scatters changes with altitude: at
    // the pad the air already does it (and the haze in `sky.ts` is that term),
    // in vacuum only the camera does, and that is where the plume, the city
    // lights and the sun have nothing between them and the lens.
    this.bloomPass.strength = BLOOM_GROUND + (BLOOM_SPACE - BLOOM_GROUND) * (1 - sky.groundFactor);
    this.starsMat.uniforms.uOpacity.value = sky.stars;
    this.stars.visible = sky.stars > 0.004;
    const rim = 0.25 + 0.75 * (1 - sky.groundFactor);
    this.earthMat.uniforms.rimGain.value = rim;
    this.atmoMat.uniforms.rimGain.value = rim;

    // ---------------------------------------------------------- eclipse
    // A cylindrical shadow behind the Earth with a soft edge: `shadow` is 1 in
    // full sun, 0 deep in the umbra. Crossing the 4 %-of-a-radius penumbra band
    // takes about half a minute of orbital motion, which is what makes umbra
    // entry read as a sunset rather than as a switch — no wall-clock ramp, so a
    // replay at any warp reproduces it exactly. The same test also keeps a
    // night launch dark, which is why it is applied on the pad too.
    const o = this.originV.set(this.origin.x, this.origin.y, this.origin.z);
    const along = o.dot(sd);
    this.perp.copy(o).addScaledVector(sd, -along);
    // Two soft edges, not one hard one. The radial term is the penumbra at the
    // limb; the along-track term is what a point ON the surface crosses, and
    // testing `along < 0` alone would switch the sun off the instant it sets —
    // a visible pop on the pad. 6 % of a radius is roughly 3.4° of solar
    // elevation, i.e. the length of a real sunset.
    const behind = smoothstep(0, -R_EARTH * 0.06, along);
    const radial = smoothstep(R_EARTH * 0.985, R_EARTH * 1.03, this.perp.length());
    const shadow = o.lengthSq() < 1 ? 1 : 1 - behind * (1 - radial);
    // Atmospheric extinction, which only exists while there is atmosphere
    // between the camera and the sun: a low sun is both weaker and redder, and
    // without this the vehicle on the pad is lit like noon under an orange sky.
    const low = sky.groundFactor * (1 - sky.dayFactor);
    this.sun.intensity = SUN_INTENSITY * shadow * (1 - 0.45 * low);
    this.sun.color.copy(SUN_WHITE).lerp(SUN_LOW, low);

    // ------------------------------------------------- fill-light balance
    // How much of the sky the Earth covers from here, and how much of the disc
    // is lit. At the pad both are 1; at GEO the planet is a small, mostly
    // irrelevant lamp.
    const rMag = Math.max(R_EARTH, o.length());
    const earthArc = Math.asin(Math.min(1, R_EARTH / rMag)) / (Math.PI / 2);
    const litDisc = clamp01(0.5 + 0.5 * (rMag > 1 ? o.dot(sd) / rMag : 1));
    const earthFill = earthArc * (0.12 + 0.88 * litDisc);
    const g = sky.groundFactor;
    this.ambient.intensity = sky.ambient;
    // The hemisphere axis is pinned to local up at every altitude. It used to
    // snap from up to the sun direction as the ground factor crossed 0.5, i.e.
    // a visible lighting pop at ~47 km, half way through the ascent.
    this.hemi.position.copy(this.camUp);
    this.hemi.intensity = sky.hemi * (g + (1 - g) * earthFill) * (0.25 + 0.75 * shadow);
    // Desaturate the sky fill towards white so it lifts the shadowed side
    // without repainting it: at full strength the blue drowns the liveries.
    this.hemiSky.copy(sky.color).lerp(WHITE, 0.55).multiplyScalar(1.1);
    this.hemi.color.copy(this.hemiSky);
    // ...and cross-fade the bounce from terrain brown to Earth albedo blue,
    // because in vacuum there is no ground below, only the planet.
    this.hemiGround.copy(TERRAIN_BOUNCE).lerp(EARTH_BOUNCE, 1 - g);
    this.hemi.groundColor.copy(this.hemiGround);
    // Earth-shine proper: a directional fill arriving from nadir. Only in
    // space — near the pad the hemisphere light is already the ground bounce.
    this.albedo.position.copy(this.shadowPos).addScaledVector(this.camUp, -Math.max(2000, this.shadowRadius * 6));
    this.albedo.target.position.copy(this.shadowPos);
    this.albedo.target.updateMatrixWorld();
    this.albedo.intensity = 0.75 * (1 - g) * earthFill;

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
    this.updateMarker(frame, vehicleSize);
  }

  /**
   * Set the clear colour so the sky still looks like `sky.color` after the
   * output pass.
   *
   * The clear colour is the sky: the only thing behind the planet, the pad and
   * the vehicle. Drawing straight to the canvas it was written out untouched,
   * because a clear is not a fragment and no tone mapping runs on it — the
   * colours in `sky.ts` are literally what reached the screen, and they were
   * tuned that way. Once the frame goes through a render target the clear ends
   * up in the linear buffer with everything else and the output pass ACES-maps
   * it, which lifts the midtones hard: the noon sky came out pale and washed.
   *
   * So the colour handed to `setClearColor` is the one that ACES maps ONTO the
   * authored sky, found by inverting the tone curve. Everything else in the
   * scene is unaffected — it was always tone-mapped, and still is, once.
   */
  private setSkyClearColor(sky: SkyState): void {
    const c = sky.color;
    const key = `${c.r.toFixed(4)},${c.g.toFixed(4)},${c.b.toFixed(4)},${sky.exposure.toFixed(3)}`;
    if (key !== this.clearKey) {
      this.clearKey = key;
      inverseACES(c, sky.exposure, this.clearColor);
    }
    this.renderer.setClearColor(this.clearColor, 1);
  }

  render(): void {
    this.composer.render();
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
    // Compile with the composer's target bound. `compile` builds each program
    // for whatever render target is current, and the tone-mapping and
    // colour-space defines differ between the canvas and a linear target — so
    // compiling against the canvas would produce the one variant the app never
    // draws, and every material would be compiled a second time on first use.
    this.renderer.setRenderTarget(this.sceneTarget);
    this.renderer.compile(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
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
    // through the composer, for the same reason `compile` is: this throwaway
    // frame has to exercise the programs the real frames use
    this.composer.render();
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
    this.markerMat.dispose();
    this.markerTex.dispose();
    this.earthMesh.geometry.dispose();
    this.atmoMesh.geometry.dispose();
    this.stars.geometry.dispose();
    if (this.cloudMesh) {
      this.cloudMesh.geometry.dispose();
      const cm = this.cloudMesh.material as THREE.MeshLambertMaterial;
      cm.map?.dispose();
      cm.dispose();
    }
    for (const u of ['dayMap', 'nightMap', 'specMap', 'normalMap'] as const) {
      const tex = this.earthMat.uniforms[u]?.value;
      if (tex instanceof THREE.Texture) tex.dispose();
    }
    // the composer owns both swap targets and every pass's own buffers
    this.composer.dispose();
    this.scene.clear();
  }
}

/**
 * Deterministic star field: a magnitude power law, per-star colour temperature
 * and size, and a band of faint stars packed around the galactic equator that
 * reads as the Milky Way without shipping a catalogue or a texture.
 *
 * Star counts roughly triple per magnitude step, so brightness is drawn as a
 * high power of a uniform hash: a handful of first-magnitude stars, a few
 * hundred you can pick out, and thousands at the threshold of visibility.
 * Nothing here uses `Math.random`, so the sky is identical on every run.
 */
function buildStarField(): THREE.Points {
  const FIELD = 3600;
  const BAND = 2400;
  const N = FIELD + BAND;
  const R = 4e8;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const size = new Float32Array(N);
  // an orthonormal frame with the galactic pole as its axis, so the band stars
  // can be generated directly in galactic latitude
  const gz = GAL_POLE.clone();
  const gx = new THREE.Vector3(0, 0, 1).cross(gz).normalize();
  const gy = new THREE.Vector3().crossVectors(gz, gx).normalize();
  const dir = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    if (i < FIELD) {
      // Fibonacci sphere: an even all-sky spread with no clumping
      const u = -1 + (2 * i + 1) / FIELD;
      const ph = i * 2.39996323;
      const rr = Math.sqrt(Math.max(0, 1 - u * u));
      dir.set(rr * Math.cos(ph), rr * Math.sin(ph), u);
    } else {
      // galactic band: latitude concentrated within a few degrees of b = 0
      const j = i - FIELD;
      const lon = (j * 2.39996323) % (Math.PI * 2);
      const s = hash11(j * 1.93 + 0.7) - 0.5;
      const b = Math.sign(s) * Math.pow(Math.abs(s) * 2, 2.4) * 0.28;
      const cb = Math.cos(b), sb = Math.sin(b);
      dir.copy(gx).multiplyScalar(cb * Math.cos(lon))
        .addScaledVector(gy, cb * Math.sin(lon))
        .addScaledVector(gz, sb);
    }
    pos[i * 3] = R * dir.x;
    pos[i * 3 + 1] = R * dir.y;
    pos[i * 3 + 2] = R * dir.z;
    // magnitude: few bright, many faint (band stars are unresolved, so dimmer)
    const mag = Math.pow(hash11(i * 1.37 + 3.1), i < FIELD ? 4.2 : 6.0);
    const b = (i < FIELD ? 0.10 : 0.05) + (i < FIELD ? 0.95 : 0.40) * mag;
    // colour temperature: most stars are white-ish, a few red or blue
    const tint = hash11(i * 3.91 + 7) * 2 - 1;
    const warm = Math.max(0, tint), cool = Math.max(0, -tint);
    col[i * 3] = b * (1 - 0.16 * cool);
    col[i * 3 + 1] = b * (1 - 0.07 * cool - 0.10 * warm);
    col[i * 3 + 2] = b * (1 - 0.34 * warm);
    size[i] = 1.1 + 3.4 * Math.pow(mag, 0.8) * (i < FIELD ? 1 : 0.55);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uOpacity: { value: 1 } },
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}

export function loadEarthTextures(base: string): Promise<EarthTextures> {
  const loader = new THREE.TextureLoader();
  const load = (name: string) => new Promise<THREE.Texture | null>((resolve) => {
    loader.load(`${base}textures/${name}`, (t) => { t.anisotropy = 4; resolve(t); }, undefined, () => resolve(null));
  });
  return Promise.all([
    load('earth_atmos_2048.jpg'), load('earth_lights_2048.png'), load('earth_specular_2048.jpg'),
    load('earth_normal_2048.jpg'), load('earth_clouds_1024.png'),
  ]).then(
    ([day, night, spec, normal, clouds]) => ({
      day: day ?? proceduralTexture('#2a5ea8', '#3f7a3a'),
      night: night ?? proceduralTexture('#000000', '#000000'),
      spec: spec ?? proceduralTexture('#ffffff', '#000000'),
      // A normal map holds vectors, not colour: it must stay in the no-transfer
      // colour space or every slope is decoded through the sRGB curve.
      normal,
      clouds,
    }),
  );
}

/**
 * three's ACES filmic curve, in JS, exactly as `tonemapping_pars_fragment`
 * compiles it: the two colour-space matrices around the RRT+ODT rational fit.
 */
function acesForward(r: number, g: number, b: number, exposure: number, out: [number, number, number]): void {
  const k = exposure / 0.6;
  const x = r * k, y = g * k, z = b * k;
  // ACESInputMat. The GLSL constructor takes COLUMNS, so these are its rows —
  // each one sums to 1, which is the check that they have been transposed.
  let ir = 0.59719 * x + 0.35458 * y + 0.04823 * z;
  let ig = 0.07600 * x + 0.90834 * y + 0.01566 * z;
  let ib = 0.02840 * x + 0.13383 * y + 0.83777 * z;
  const fit = (v: number): number => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.4329510) + 0.238081);
  ir = fit(ir); ig = fit(ig); ib = fit(ib);
  // ACESOutputMat
  out[0] = clamp01(1.60475 * ir - 0.53108 * ig - 0.07367 * ib);
  out[1] = clamp01(-0.10208 * ir + 1.10813 * ig - 0.00605 * ib);
  out[2] = clamp01(-0.00327 * ir - 0.07276 * ig + 1.07602 * ib);
}

const acesTmp: [number, number, number] = [0, 0, 0];

/**
 * Invert `acesForward`: find the linear colour the curve maps onto `target`.
 *
 * The curve mixes the channels through two matrices, so there is no per-channel
 * closed form, but it is monotone and close to a gain over this range — the
 * ratio iteration below lands within a thousandth in a handful of steps, and it
 * runs at most once per sky-colour change, not per frame. Targets at or above
 * the curve's saturation point have no pre-image and are left at the largest
 * value that does.
 */
function inverseACES(target: THREE.Color, exposure: number, out: THREE.Color): THREE.Color {
  const t = [Math.min(target.r, 0.995), Math.min(target.g, 0.995), Math.min(target.b, 0.995)];
  let r = t[0], g = t[1], b = t[2];
  // 40 damped steps: the blue of a noon sky has to travel from 0.87 to about
  // 2.0 (ACES compresses hard up there), and a dozen steps stopped 2 % short —
  // visible as a slightly warm sky. It runs on a sky-colour change, not a frame.
  for (let i = 0; i < 40; i++) {
    acesForward(r, g, b, exposure, acesTmp);
    const dr = acesTmp[0] > 1e-6 ? t[0] / acesTmp[0] : 1;
    const dg = acesTmp[1] > 1e-6 ? t[1] / acesTmp[1] : 1;
    const db = acesTmp[2] > 1e-6 ? t[2] / acesTmp[2] : 1;
    if (Math.abs(dr - 1) < 1e-4 && Math.abs(dg - 1) < 1e-4 && Math.abs(db - 1) < 1e-4) break;
    // damped, so a channel that overshoots on one step does not oscillate
    r = Math.max(0, r * (1 + 0.75 * (dr - 1)));
    g = Math.max(0, g * (1 + 0.75 * (dg - 1)));
    b = Math.max(0, b * (1 + 0.75 * (db - 1)));
  }
  return out.setRGB(r, g, b, THREE.LinearSRGBColorSpace);
}

/** Flat tangent-space normal (0, 0, 1), for when the relief map is missing. */
function flatNormalTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 2;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgb(128,128,255)';
  g.fillRect(0, 0, 2, 2);
  const t = new THREE.CanvasTexture(c);
  t.userData.shared = true;
  return t;
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
