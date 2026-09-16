/**
 * Three.js scene with a floating origin: every object is positioned relative
 * to `origin` (the tracked vehicle, in ECI metres) so that float32 precision
 * is preserved near the camera. Scene axes coincide with ECI axes (Z = north).
 *
 * Rendering path: MSAA render target → bloom → tone mapping / sRGB output.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { Vec3 } from '../physics/vec3';
import { R_EARTH } from '../physics/constants';

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
  uniform sampler2D normalMap;
  uniform float normalScale;
  uniform vec3 sunDir;
  uniform vec3 camPos;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  // tangent-space normal perturbation from screen-space derivatives (no tangent attribute needed)
  vec3 perturbNormal(vec3 N, vec3 p, vec2 uv, vec3 mapN) {
    vec3 q0 = dFdx(p);
    vec3 q1 = dFdy(p);
    vec2 st0 = dFdx(uv);
    vec2 st1 = dFdy(uv);
    vec3 q1perp = cross(q1, N);
    vec3 q0perp = cross(N, q0);
    vec3 T = q1perp * st0.x + q0perp * st1.x;
    vec3 B = q1perp * st0.y + q0perp * st1.y;
    float det = max(dot(T, T), dot(B, B));
    float scale = (det == 0.0) ? 0.0 : inversesqrt(det);
    return normalize(T * (mapN.x * scale) + B * (mapN.y * scale) + N * mapN.z);
  }
  void main() {
    #include <logdepthbuf_fragment>
    vec3 nGeo = normalize(vNormalW);
    vec3 mapN = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
    mapN.xy *= normalScale;
    vec3 n = perturbNormal(nGeo, vPosW, vUv, mapN);
    float cosSunGeo = dot(nGeo, sunDir);
    float cosSun = dot(n, sunDir);
    float dayF = smoothstep(-0.12, 0.25, cosSunGeo);
    vec3 day = texture2D(dayMap, vUv).rgb;
    vec3 night = texture2D(nightMap, vUv).rgb;
    // warm terminator tint
    float twilight = smoothstep(-0.15, 0.05, cosSunGeo) * (1.0 - smoothstep(0.05, 0.35, cosSunGeo));
    vec3 lit = day * (0.10 + 1.05 * max(cosSun, 0.0)) * mix(vec3(1.0), vec3(1.15, 0.85, 0.65), twilight * 0.7);
    vec3 col = mix(night * 1.6 + day * 0.02, lit, dayF);
    float spec = texture2D(specMap, vUv).r;
    vec3 viewDir = normalize(camPos - vPosW);
    vec3 h = normalize(sunDir + viewDir);
    float s = pow(max(dot(n, h), 0.0), 60.0) * spec * dayF * 0.45;
    col += vec3(s * 0.9, s * 0.95, s);
    float rim = pow(1.0 - max(dot(nGeo, viewDir), 0.0), 3.0);
    col += vec3(0.28, 0.52, 1.0) * rim * (0.5 * dayF + 0.05);
    gl_FragColor = vec4(col, 1.0);
  }
`;
const ATMO_VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec3 vPosW;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
    #include <logdepthbuf_vertex>
  }
`;
/**
 * Atmosphere shell rendered from both sides. The glow of a pixel is derived from the
 * lowest altitude reached by its view ray (a cheap stand-in for the scattering integral):
 * rays grazing the limb are bright, rays through the upper atmosphere fade exponentially,
 * rays leaving the atmosphere upward are weighted by an approximate Chapman path factor.
 * Works for a camera on the pad, inside the atmosphere and in orbit.
 */
const ATMO_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 sunDir;
  uniform vec3 camPos;
  uniform vec3 earthCenter;
  uniform float earthR;
  uniform float shellR;
  varying vec3 vPosW;
  void main() {
    #include <logdepthbuf_fragment>
    bool inside = distance(camPos, earthCenter) < shellR;
    // use the far side of the shell when inside it, the near side when outside
    if (gl_FrontFacing == inside) discard;
    vec3 u = normalize(vPosW - camPos);
    vec3 c = camPos - earthCenter;
    float tca = -dot(c, u);
    float band;
    vec3 pc;
    if (tca > 0.0) {
      pc = c + u * tca;
      float hmin = length(pc) - earthR;
      if (hmin >= 0.0) {
        band = exp(-hmin / 24000.0) + 0.18 * exp(-hmin / 90000.0);
      } else {
        // ray hits the ground: haze grows toward the limb with the slant path
        float cosT = sqrt(max(0.0, 1.0 - pow(max(0.0, 1.0 + hmin / earthR), 2.0)));
        band = 0.04 / (cosT + 0.04);
      }
    } else {
      // ray moving away from the Earth: short path, weighted by elevation above the horizon
      pc = c;
      float h0 = max(0.0, length(c) - earthR);
      float sinE = clamp(dot(u, normalize(c)), 0.0, 1.0);
      band = (exp(-h0 / 24000.0) + 0.18 * exp(-h0 / 90000.0)) * 0.03 / (sinE + 0.03);
    }
    if (inside) band *= 0.7;
    vec3 nc = normalize(pc);
    float sun = dot(nc, sunDir);
    float lit = 0.05 + 0.95 * smoothstep(-0.2, 0.3, sun);
    // blue glow on the day side, orange near the terminator
    float twilight = smoothstep(-0.25, 0.0, sun) * (1.0 - smoothstep(0.0, 0.3, sun));
    vec3 col = mix(vec3(0.35, 0.6, 1.0), vec3(1.0, 0.5, 0.22), twilight * 0.85) * band * lit * 0.9;
    gl_FragColor = vec4(col, 1.0);
  }
`;
const CLOUD_VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vNormalW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;
const CLOUD_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D map;
  uniform vec3 sunDir;
  varying vec2 vUv;
  varying vec3 vNormalW;
  void main() {
    #include <logdepthbuf_fragment>
    vec4 c = texture2D(map, vUv);
    float a = c.a * c.g * 0.92;
    if (a < 0.01) discard;
    vec3 n = normalize(vNormalW);
    float cosSun = dot(n, sunDir);
    float dayF = smoothstep(-0.12, 0.25, cosSun);
    float twilight = smoothstep(-0.15, 0.05, cosSun) * (1.0 - smoothstep(0.05, 0.35, cosSun));
    vec3 lit = vec3(0.06 + 1.0 * max(cosSun, 0.0)) * mix(vec3(1.0), vec3(1.2, 0.82, 0.62), twilight * 0.7);
    // night side: clouds are barely visible and only dim the city lights below
    vec3 col = mix(vec3(0.03), lit, dayF);
    gl_FragColor = vec4(col, a);
  }
`;

export interface EarthTextures {
  day: THREE.Texture;
  night: THREE.Texture;
  spec: THREE.Texture;
  normal: THREE.Texture | null;
  clouds: THREE.Texture | null;
}

function radialSprite(size: number, inner: string, mid: string, outer: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, mid);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
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
  readonly brightStars: THREE.Points;
  readonly sun: THREE.DirectionalLight;
  readonly ambient: THREE.AmbientLight;
  readonly hemi: THREE.HemisphereLight;
  readonly sunSprite: THREE.Sprite;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private earthMat: THREE.ShaderMaterial;
  private atmoMat: THREE.ShaderMaterial;
  private starsMat: THREE.PointsMaterial;
  private brightStarsMat: THREE.PointsMaterial;
  private cloudMat: THREE.ShaderMaterial | null = null;
  private textures: EarthTextures;
  private dayPixels: { data: Uint8ClampedArray; w: number; h: number } | null = null;
  origin: Vec3 = { x: 0, y: 0, z: 0 };
  private cloudDrift = 0;
  /** reusable temporaries */
  private qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  private qz = new THREE.Quaternion();
  private tmpV = new THREE.Vector3();
  private tmpSun = new THREE.Vector3();
  private skyColor = new THREE.Color();
  private nightColor = new THREE.Color(0.015, 0.02, 0.05);
  private dayColor = new THREE.Color(0.22, 0.45, 0.92);

  constructor(canvas: HTMLCanvasElement, tex: EarthTextures) {
    this.textures = tex;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.5, 5e9);
    this.camera.up.set(0, 0, 1);

    // Earth
    tex.day.colorSpace = THREE.SRGBColorSpace;
    tex.night.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.SphereGeometry(R_EARTH, 160, 120);
    this.earthMat = new THREE.ShaderMaterial({
      vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG,
      uniforms: {
        dayMap: { value: tex.day }, nightMap: { value: tex.night }, specMap: { value: tex.spec },
        normalMap: { value: tex.normal ?? flatNormalTexture() }, normalScale: { value: tex.normal ? 0.9 : 0 },
        sunDir: { value: new THREE.Vector3(1, 0, 0) }, camPos: { value: new THREE.Vector3() },
      },
    });
    this.earthMesh = new THREE.Mesh(geo, this.earthMat);
    this.earthGroup.add(this.earthMesh);
    if (tex.clouds) {
      // clouds share the Earth's day/night lighting so they never glow over the night side
      this.cloudMat = new THREE.ShaderMaterial({
        vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false,
        uniforms: { map: { value: tex.clouds }, sunDir: { value: new THREE.Vector3(1, 0, 0) } },
      });
      this.cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH + 9000, 128, 96), this.cloudMat);
      this.cloudMesh.renderOrder = 1;
      this.earthGroup.add(this.cloudMesh);
    } else {
      this.cloudMesh = null;
    }
    const shellR = R_EARTH + 220e3;
    this.atmoMat = new THREE.ShaderMaterial({
      vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: {
        sunDir: { value: new THREE.Vector3(1, 0, 0) }, camPos: { value: new THREE.Vector3() },
        earthCenter: { value: new THREE.Vector3() }, earthR: { value: R_EARTH }, shellR: { value: shellR },
      },
    });
    this.atmoMesh = new THREE.Mesh(new THREE.SphereGeometry(shellR, 128, 96), this.atmoMat);
    this.atmoMesh.renderOrder = 2;
    this.earthGroup.add(this.atmoMesh);
    this.scene.add(this.earthGroup);

    // stars: a dense faint layer and a sparse bright layer
    const mkStars = (N: number, size: number, bright: number) => {
      const pos = new Float32Array(N * 3);
      const col = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const u = Math.random() * 2 - 1;
        const ph = Math.random() * Math.PI * 2;
        const rr = Math.sqrt(1 - u * u);
        const R = 4e8;
        pos[i * 3] = R * rr * Math.cos(ph);
        pos[i * 3 + 1] = R * rr * Math.sin(ph);
        pos[i * 3 + 2] = R * u;
        const b = bright * (0.55 + Math.random() * 0.45);
        const tint = Math.random();
        col[i * 3] = b * (tint < 0.2 ? 1.0 : tint > 0.85 ? 0.8 : 0.95);
        col[i * 3 + 1] = b * 0.92;
        col[i * 3 + 2] = b * (tint > 0.8 ? 1.0 : 0.9);
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, map: radialSprite(32, 'rgba(255,255,255,1)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0)') });
      return { points: new THREE.Points(sg, mat), mat };
    };
    const s1 = mkStars(5000, 1.8, 0.8);
    const s2 = mkStars(350, 3.6, 1.4);
    this.stars = s1.points; this.starsMat = s1.mat;
    this.brightStars = s2.points; this.brightStarsMat = s2.mat;
    this.scene.add(this.stars, this.brightStars);

    // sun glare sprite (far away along the sun direction; occluded by the Earth)
    const sunMat = new THREE.SpriteMaterial({ map: radialSprite(256, 'rgba(255,255,250,1)', 'rgba(255,230,180,0.55)', 'rgba(255,200,120,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.sunSprite = new THREE.Sprite(sunMat);
    this.sunSprite.scale.set(9e6, 9e6, 1);
    this.scene.add(this.sunSprite);

    // lights
    this.sun = new THREE.DirectionalLight(0xfff4e0, 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -160; sc.right = 160; sc.top = 160; sc.bottom = -160;
    sc.near = 1e7 - 800; sc.far = 1e7 + 800;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.5;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.ambient = new THREE.AmbientLight(0x8090b0, 0.4);
    this.scene.add(this.ambient);
    this.hemi = new THREE.HemisphereLight(0x9fb8ff, 0x4a3a2a, 0.9);
    this.scene.add(this.hemi);

    // post-processing: MSAA target → bloom → output (tone mapping + sRGB)
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.45, 0.55, 1.0);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  resize(w: number, h: number): void {
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pr);
    this.composer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  /** Convert an ECI position (m) into scene coordinates relative to the origin. */
  toScene(v: Vec3, out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(v.x - this.origin.x, v.y - this.origin.y, v.z - this.origin.z);
  }

  /** Per-frame update of Earth rotation, sun direction and sky colour. */
  update(theta: number, sunDir: Vec3, cameraAltitude: number): void {
    // Earth orientation: geometry is Y-up; rotate X by 90° so the pole is +Z,
    // then spin about Z by the sidereal angle.
    this.qz.setFromAxisAngle(this.tmpV.set(0, 0, 1), theta);
    this.earthMesh.quaternion.copy(this.qz).multiply(this.qx);
    if (this.cloudMesh) {
      this.cloudDrift += 0.0000002;
      this.qz.setFromAxisAngle(this.tmpV.set(0, 0, 1), theta + this.cloudDrift);
      this.cloudMesh.quaternion.copy(this.qz).multiply(this.qx);
    }
    this.earthGroup.position.set(-this.origin.x, -this.origin.y, -this.origin.z);
    const sd = this.tmpSun.set(sunDir.x, sunDir.y, sunDir.z).normalize();
    (this.earthMat.uniforms.sunDir.value as THREE.Vector3).copy(sd);
    (this.atmoMat.uniforms.sunDir.value as THREE.Vector3).copy(sd);
    if (this.cloudMat) (this.cloudMat.uniforms.sunDir.value as THREE.Vector3).copy(sd);
    (this.earthMat.uniforms.camPos.value as THREE.Vector3).copy(this.camera.position);
    (this.atmoMat.uniforms.camPos.value as THREE.Vector3).copy(this.camera.position);
    (this.atmoMat.uniforms.earthCenter.value as THREE.Vector3).copy(this.earthGroup.position);
    this.sun.position.copy(sd).multiplyScalar(1e7);
    this.sun.target.position.set(0, 0, 0);
    // shadows only matter near the ground (pad, tower, rocket)
    this.sun.castShadow = cameraAltitude < 30e3;
    this.stars.position.copy(this.camera.position);
    this.brightStars.position.copy(this.camera.position);
    this.sunSprite.position.copy(this.camera.position).addScaledVector(sd, 1.2e8);
    // sky: blue near the ground, black above ~90 km; darker at night
    const camPosEci = this.tmpV.set(this.camera.position.x + this.origin.x, this.camera.position.y + this.origin.y, this.camera.position.z + this.origin.z);
    const sunElev = camPosEci.normalize().dot(sd);
    const dayF = THREE.MathUtils.smoothstep(sunElev, -0.15, 0.2);
    const f = 1 - THREE.MathUtils.smoothstep(cameraAltitude, 6e3, 70e3);
    this.skyColor.copy(this.dayColor).multiplyScalar(dayF * f).add(this.nightColor.clone().multiplyScalar(f));
    this.renderer.setClearColor(this.skyColor, 1);
    const starVis = 1 - f * (0.3 + 0.7 * dayF);
    this.starsMat.opacity = starVis;
    this.brightStarsMat.opacity = starVis;
    this.ambient.intensity = 0.35 + 0.6 * f * dayF;
    this.hemi.intensity = 0.85 + 0.5 * f * dayF;
    // sky light comes from above near the ground and from the sun in space; blend smoothly
    this.hemi.position.copy(camPosEci).multiplyScalar(f).addScaledVector(sd, 1 - f).normalize();
    // bloom is strongest in space (plumes, city lights, sun glare)
    this.bloom.strength = 0.35 + 0.35 * (1 - f);
  }

  /**
   * Average land colour of the day map around a site (linear RGB), used to tint the local
   * ground so the pad scenery blends into the globe when zooming out. Returns null when
   * the texture is unavailable or the site is surrounded by ocean.
   */
  sampleGroundColor(latDeg: number, lonDeg: number): THREE.Color | null {
    if (!this.dayPixels) {
      const img = this.textures.day.image as HTMLImageElement | undefined;
      if (!img || !img.width) return null;
      try {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d', { willReadFrequently: true })!;
        g.drawImage(img, 0, 0);
        this.dayPixels = { data: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
      } catch {
        return null;
      }
    }
    const { data, w, h } = this.dayPixels;
    const cx = Math.round(((lonDeg + 180) / 360) * w);
    const cy = Math.round(((90 - latDeg) / 180) * h);
    let r = 0, gg = 0, b = 0, n = 0;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const x = ((cx + dx) % w + w) % w;
        const y = Math.max(0, Math.min(h - 1, cy + dy));
        const i = (y * w + x) * 4;
        const pr = data[i], pg = data[i + 1], pb = data[i + 2];
        if (pb > Math.max(pr, pg) * 1.05) continue; // ocean
        r += pr; gg += pg; b += pb; n++;
      }
    }
    if (n < 4) return null;
    return new THREE.Color().setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace);
  }

  render(): void {
    this.composer.render();
  }
}

function flatNormalTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 2;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgb(128,128,255)';
  g.fillRect(0, 0, 2, 2);
  return new THREE.CanvasTexture(c);
}

export function loadEarthTextures(base: string): Promise<EarthTextures> {
  const loader = new THREE.TextureLoader();
  const load = (name: string) => new Promise<THREE.Texture | null>((resolve) => {
    loader.load(`${base}textures/${name}`, (t) => { t.anisotropy = 8; resolve(t); }, undefined, () => resolve(null));
  });
  return Promise.all([load('earth_atmos_2048.jpg'), load('earth_lights_2048.png'), load('earth_specular_2048.jpg'), load('earth_normal_2048.jpg'), load('earth_clouds_1024.png')]).then(
    ([day, night, spec, normal, clouds]) => ({
      day: day ?? proceduralTexture('#2a5ea8', '#3f7a3a'),
      night: night ?? proceduralTexture('#000000', '#000000'),
      spec: spec ?? proceduralTexture('#ffffff', '#000000'),
      normal,
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
    g.beginPath();
    g.ellipse(Math.random() * 512, 40 + Math.random() * 180, 20 + Math.random() * 60, 10 + Math.random() * 30, Math.random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
