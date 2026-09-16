/**
 * Instanced billboard smoke.
 *
 * Two effects share one technique: every puff's position, size and opacity are
 * computed in the vertex shader from a per-instance seed and the mission time,
 * so the CPU does no per-particle work and a replayed flight produces exactly
 * the same cloud.
 *
 *  - `GroundSmoke`  the steam/soot cloud that billows sideways out of the flame
 *                   trench at ignition and rises around the pad.
 *  - `AscentTrail`  the smoke column left behind the vehicle in the lower
 *                   atmosphere; puffs are placed along the line from the
 *                   vehicle back towards the pad, so it needs no history.
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
    float y = 1.5 + (1.1 + 4.2 * rnd) * pow(a, 1.15) + rr * 0.10;
    vec3 centre = vec3(cos(ang) * rr, y, sin(ang) * rr);
    float size = uSize * (0.55 + 0.9 * rnd) * (1.0 + a * 0.34) * alive;
    float fade = smoothstep(0.0, 0.35, a) * (1.0 - smoothstep(life * 0.4, life, a));
    vAlpha = fade * uOpacity * alive;
    vTint = mix(uHot, uColor, smoothstep(0.0, 1.1, a));
    vec4 mv = modelViewMatrix * vec4(centre, 1.0);
    mv.xy += position.xy * size;
    gl_Position = projectionMatrix * mv;
    #include <logdepthbuf_vertex>
  }
`;

const TRAIL_VERT = BILLBOARD_HEAD + /* glsl */ `
  uniform float uT;
  uniform vec3 uBack;     // unit vector from the vehicle back down the trail
  uniform float uLength;  // trail length, m
  uniform float uSize;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uHot;
  void main() {
    vUv = uv;
    float id = iSeed;
    float u = id;                                  // 0 at the vehicle, 1 at the far end
    float rnd = h11(id * 37.7 + 5.3);
    float rnd2 = h11(id * 71.3 + 11.9);
    float d = u * uLength;
    vec3 drift = vec3(sin(id * 41.0 + uT * 0.25), 0.0, cos(id * 29.0 + uT * 0.2)) * (uSize * 1.4 * u);
    vec3 centre = uBack * d + drift + vec3((rnd - 0.5), (rnd2 - 0.5), (rnd - rnd2)) * uSize * u * 2.0;
    float size = uSize * (0.6 + 0.8 * rnd) * (0.35 + 2.6 * u);
    vAlpha = uOpacity * smoothstep(0.0, 0.04, u) * (1.0 - smoothstep(0.55, 1.0, u));
    vTint = mix(uHot, uColor, smoothstep(0.0, 0.12, u));
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
    gl_FragColor = vec4(vTint * t.rgb, a);
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
  const lobes: Array<[number, number, number]> = [
    [64, 64, 44], [46, 52, 26], [82, 50, 24], [54, 84, 25], [84, 80, 22], [64, 40, 22],
  ];
  for (const [x, y, r] of lobes) {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.82)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.34)');
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

  constructor(opts: { count?: number; trenchAzimuth: number; mouthRadius: number; puffSize: number; speed: number; color?: number; hot?: number }) {
    this.geo = billboardGeometry(opts.count ?? 200);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: GROUND_VERT, fragmentShader: PUFF_FRAG,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        uT: { value: -1 }, uEmitDur: { value: 16 }, uLife: { value: 26 }, uSpeed: { value: opts.speed },
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
  update(tSinceIgnition: number, intensity: number): void {
    const u = this.mat.uniforms;
    u.uT.value = tSinceIgnition;
    u.uOpacity.value = Math.max(0, Math.min(1, intensity)) * 0.8;
    this.mesh.visible = tSinceIgnition > -0.2 && (u.uOpacity.value as number) > 0.004;
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
  }
}

/** Smoke column trailing the vehicle in the lower atmosphere. */
export class AscentTrail {
  readonly mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  private geo: THREE.InstancedBufferGeometry;
  private back = new THREE.Vector3(0, -1, 0);

  constructor(count = 150) {
    this.geo = billboardGeometry(count);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: TRAIL_VERT, fragmentShader: PUFF_FRAG,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        uT: { value: 0 }, uBack: { value: this.back }, uLength: { value: 1000 }, uSize: { value: 8 },
        uOpacity: { value: 0 }, uColor: { value: new THREE.Color(0xc9ccd2) }, uHot: { value: new THREE.Color(0xffb870) },
        uMap: { value: puffTexture() },
      },
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
  }

  /**
   * @param backDir unit vector (scene space) pointing from the vehicle back along its path
   * @param length trail length, m
   * @param size base puff radius, m
   * @param opacity 0..1
   */
  update(t: number, backDir: THREE.Vector3, length: number, size: number, opacity: number): void {
    const u = this.mat.uniforms;
    (u.uBack.value as THREE.Vector3).copy(backDir);
    u.uT.value = t;
    u.uLength.value = length;
    u.uSize.value = size;
    u.uOpacity.value = Math.max(0, Math.min(1, opacity));
    this.mesh.visible = opacity > 0.01;
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
