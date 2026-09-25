/**
 * Instanced billboard smoke.
 *
 * One technique: every puff's position, size and opacity are
 * computed in the vertex shader from a per-instance seed and the mission time,
 * so the CPU does no per-particle work and a replayed flight produces exactly
 * the same cloud.
 *
 *  - `GroundSmoke`  the steam/soot cloud that billows sideways out of the flame
 *                   trench at ignition and rises around the pad.
 *  - `PadGlow`      the lit patch of concrete under the engines.
 */
import * as THREE from 'three';

const HASH = /* glsl */ `
  float h11(float n) { return fract(sin(n * 127.1) * 43758.5453123); }
`;

const BILLBOARD_HEAD = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute float iSeed;
  varying vec2 vUv;
  varying float vAlpha;
  varying vec3 vTint;
` + HASH;

const GROUND_VERT = BILLBOARD_HEAD + /* glsl */ `
  uniform float uT;        // seconds since first-stage ignition
  uniform float uEmitDur;  // length of the emission window, s
  uniform float uLife;     // puff lifetime, s
  uniform float uSpeed;    // initial outward speed, m/s
  uniform float uR0;       // radius of the trench mouth, m
  uniform float uSize;     // base puff radius, m
  uniform float uJetA;     // trench azimuth in the local frame, rad
  uniform float uRise;     // vertical rise rate, relative to the fast layer
  uniform float uGrow;     // how fast a puff widens, per second of its age
  uniform vec3 uDrift;     // the surface wind that carries the cloud, m/s, pad axes
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uHot;
  void main() {
    vUv = uv;
    float id = iSeed;
    float birth = id * uEmitDur;
    float age = uT - birth;
    float rnd = h11(id * 57.3 + 3.1);
    float rnd2 = h11(id * 91.7 + 8.9);
    float rnd3 = h11(id * 23.9 + 1.7);
    float life = uLife * (0.7 + 0.6 * rnd3);
    float alive = step(0.0, age) * (1.0 - step(life, age));
    float ang = uJetA + (rnd - 0.5) * 1.9 + step(0.5, rnd2) * PI;
    float spd = uSpeed * (0.45 + 1.0 * rnd2);
    float tau = 1.5;
    float a = max(age, 0.0);
    float rr = uR0 + spd * tau * (1.0 - exp(-a / tau));
    float y = 1.5 + uRise * (1.1 + 4.2 * rnd) * pow(a, 1.15) + rr * 0.10;
    vec3 centre = vec3(cos(ang) * rr, y, sin(ang) * rr) + uDrift * a;
    float size = uSize * (0.55 + 0.9 * rnd) * (1.0 + a * uGrow) * alive;
    float fade = smoothstep(0.0, 0.35, a) * (1.0 - smoothstep(life * 0.4, life, a));
    vAlpha = fade * uOpacity * alive;
    vTint = mix(uHot, uColor, smoothstep(0.0, 1.1, a));
    vec4 mv = modelViewMatrix * vec4(centre, 1.0);
    mv.xy += position.xy * size;
    gl_Position = projectionMatrix * mv;
    #include <logdepthbuf_vertex>
  }
`;

const PUFF_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying float vAlpha;
  varying vec3 vTint;
  void main() {
    #include <logdepthbuf_fragment>
    vec4 t = texture2D(uMap, vUv);
    float a = t.a * vAlpha;
    if (a < 0.004) discard;
    // tone mapping + sRGB output, exactly as three appends them to a built-in
    // material (see the note in render/scene.ts) — without this the puffs are
    // the only grey in the frame that is not tone-mapped and read as charcoal
    gl_FragColor = vec4(vTint * t.rgb, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

let puffTex: THREE.Texture | null = null;
/** Soft lumpy blob used for every smoke billboard. */
export function puffTexture(): THREE.Texture {
  if (puffTex) return puffTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 128, 128);
  // a few overlapping soft lobes give the blob a cauliflower silhouette
  // A soft, low-peak blob rather than an opaque disc. Billboard smoke gives
  // itself away at the silhouette: with a hard edge every puff reads as a
  // separate sprite, while a long alpha tail lets neighbouring puffs merge into
  // one mass and only the accumulation of many of them becomes opaque.
  const lobes: Array<[number, number, number]> = [
    [64, 64, 50], [44, 50, 30], [84, 48, 28], [52, 86, 29], [86, 82, 26], [64, 38, 25],
    [38, 72, 22], [90, 64, 20],
  ];
  for (const [x, y, r] of lobes) {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.60)');
    grad.addColorStop(0.42, 'rgba(255,255,255,0.30)');
    grad.addColorStop(0.75, 'rgba(255,255,255,0.09)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.shared = true;
  puffTex = tex;
  return tex;
}

function billboardGeometry(count: number): THREE.InstancedBufferGeometry {
  const plane = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = plane.index;
  geo.attributes.position = plane.attributes.position;
  geo.attributes.uv = plane.attributes.uv;
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = (i + 0.5) / count;
  geo.setAttribute('iSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  geo.instanceCount = count;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  plane.dispose();
  return geo;
}

/** Pad cloud: steam and soot pushed sideways out of the flame trench. */
export class GroundSmoke {
  readonly mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  private geo: THREE.InstancedBufferGeometry;

  /** peak opacity of this layer (see `update`) */
  private peak: number;

  constructor(opts: {
    count?: number; trenchAzimuth: number; mouthRadius: number; puffSize: number; speed: number;
    color?: number; hot?: number;
    /** length of the emission window, s */
    emitDuration?: number;
    /** puff lifetime, s */
    life?: number;
    /** vertical rise rate relative to the default */
    rise?: number;
    /** how fast a puff widens, per second of its age (0.34 by default) */
    grow?: number;
    /** peak opacity 0..1 */
    opacity?: number;
  }) {
    this.geo = billboardGeometry(opts.count ?? 200);
    this.peak = opts.opacity ?? 0.8;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: GROUND_VERT, fragmentShader: PUFF_FRAG,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        uT: { value: -1 }, uEmitDur: { value: opts.emitDuration ?? 16 }, uLife: { value: opts.life ?? 26 },
        uSpeed: { value: opts.speed }, uRise: { value: opts.rise ?? 1 }, uGrow: { value: opts.grow ?? 0.34 }, uDrift: { value: new THREE.Vector3() },
        uR0: { value: opts.mouthRadius }, uSize: { value: opts.puffSize }, uJetA: { value: opts.trenchAzimuth },
        uOpacity: { value: 0 }, uColor: { value: new THREE.Color(opts.color ?? 0xd8dbe0) },
        uHot: { value: new THREE.Color(opts.hot ?? 0xffd6a0) }, uMap: { value: puffTexture() },
      },
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
  }

  /**
   * @param tSinceIgnition mission time minus first-stage ignition time, s
   * @param intensity overall strength 0..1 (throttle × proximity to the pad)
   */
  update(tSinceIgnition: number, intensity: number, drift?: THREE.Vector3): void {
    const u = this.mat.uniforms;
    if (drift) (u.uDrift.value as THREE.Vector3).copy(drift);
    u.uT.value = tSinceIgnition;
    u.uOpacity.value = Math.max(0, Math.min(1, intensity)) * this.peak;
    this.mesh.visible = tSinceIgnition > -0.2 && (u.uOpacity.value as number) > 0.004;
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
  }
}

let glowTex: THREE.Texture | null = null;
function glowTexture(): THREE.Texture {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,238,200,1)');
  grad.addColorStop(0.3, 'rgba(255,170,70,0.55)');
  grad.addColorStop(1, 'rgba(255,120,30,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.shared = true;
  glowTex = tex;
  return tex;
}

/** Additive patch of light thrown on the concrete by the engines. */
export class PadGlow {
  readonly mesh: THREE.Mesh;
  private mat: THREE.MeshBasicMaterial;
  private geo: THREE.PlaneGeometry;

  constructor(radius: number) {
    this.geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
    this.geo.rotateX(-Math.PI / 2);
    this.mat = new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.position.y = 0.6;
    this.mesh.renderOrder = 2;
  }

  /** @param intensity 0..1 */
  update(intensity: number, t: number): void {
    const flick = 0.9 + 0.1 * Math.sin(t * 23.7);
    this.mat.opacity = Math.max(0, Math.min(1, intensity)) * flick;
    this.mesh.visible = this.mat.opacity > 0.01;
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
  }
}
