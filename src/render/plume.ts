/**
 * Layered rocket exhaust plume.
 *
 * Each engine group gets one `Plume`: a bright inner core, a translucent outer
 * sheath (both additively blended, custom shader) and — for solid motors — a
 * dark smoke shroud. The shape is computed in the vertex shader from the
 * ambient pressure so the plume balloons out as the vehicle leaves the
 * atmosphere; sea-level plumes carry Mach disks (shock diamonds) that fade with
 * altitude. All turbulence is a function of the mission time passed in from the
 * frame, never of `Math.random`, so replays look identical.
 */
import * as THREE from 'three';
import { P0 } from '../physics/constants';

const PLUME_VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  uniform float uTime;
  uniform float uVac;
  uniform float uSeed;
  uniform float uFlare;
  uniform float uTurb;
  varying float vK;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying float vAng;
  void main() {
    float k = clamp(-position.y, 0.0, 1.0);   // 0 at the nozzle exit, 1 at the tip
    vK = k;
    float ang = atan(position.z, position.x);
    vAng = ang;
    float sea = 1.0 + 0.55 * k - 0.28 * k * k;
    float vac = 1.0 + 2.60 * pow(k, 0.55);
    float rad = mix(sea, vac, uVac) * uFlare;
    rad *= 1.0 - smoothstep(0.70, 1.0, k) * 0.88;              // close the tip
    float n = sin(k * 11.0 + uTime * 9.0 + uSeed * 31.0 + ang * 3.0)
            * sin(k * 23.0 - uTime * 14.0 + uSeed * 7.0 + ang * 2.0);
    rad *= 1.0 + uTurb * n * smoothstep(0.04, 0.55, k) * 0.20;
    vec3 p = vec3(position.x * rad, position.y, position.z * rad);
    vec3 nrm = normalize(vec3(p.x, 0.22, p.z));
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vPosW = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * nrm);
    gl_Position = projectionMatrix * viewMatrix * wp;
    #include <logdepthbuf_vertex>
  }
`;

const PLUME_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 uCore;
  uniform vec3 uEdge;
  uniform vec3 uTip;
  uniform float uOpacity;
  uniform float uMach;
  uniform float uMachFreq;
  uniform float uTime;
  uniform float uSeed;
  uniform float uEdgeGain;
  varying float vK;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying float vAng;
  void main() {
    #include <logdepthbuf_fragment>
    float k = vK;
    vec3 n = normalize(vNormalW);
    vec3 vd = normalize(cameraPosition - vPosW);
    float fres = 1.0 - abs(dot(n, vd));
    vec3 col = mix(uCore, uEdge, smoothstep(0.0, 0.40, k));
    col = mix(col, uTip, smoothstep(0.40, 1.0, k));
    // shock diamonds: stationary cells just below the nozzle, sea level only
    float md = 0.5 + 0.5 * sin(k * uMachFreq - 0.7 + sin(uTime * 3.0 + uSeed * 9.0) * 0.12);
    float diamonds = pow(md, 7.0) * (1.0 - smoothstep(0.03, 0.42, k)) * uMach;
    col += vec3(1.0, 0.94, 0.80) * diamonds * 1.8;
    float flick = 0.92 + 0.08 * sin(uTime * 31.0 + uSeed * 53.0 + vAng);
    float a = uOpacity * (0.16 + uEdgeGain * fres * fres) * (1.0 - smoothstep(0.30, 1.0, k));
    a *= smoothstep(0.0, 0.04, k) * flick;
    // Tone-mapped like every other material in the scene (see the note in
    // render/scene.ts): the core is deliberately driven past 1.0 so ACES
    // blows it out to white and the orange survives only at the edges, which
    // is exactly how an exposed camera sees a first-stage plume.
    gl_FragColor = vec4(col * (1.0 + diamonds * 1.2), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor.a = clamp(a, 0.0, 1.0);
  }
`;

const SMOKE_VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  uniform float uTime;
  uniform float uSeed;
  varying float vK;
  void main() {
    float k = clamp(-position.y, 0.0, 1.0);
    vK = k;
    float ang = atan(position.z, position.x);
    float rad = (0.8 + 2.4 * pow(k, 0.7)) * (1.0 + 0.16 * sin(k * 9.0 + uTime * 5.0 + uSeed * 20.0 + ang * 2.0));
    vec3 p = vec3(position.x * rad, position.y, position.z * rad);
    vec4 wp = modelMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewMatrix * wp;
    #include <logdepthbuf_vertex>
  }
`;

const SMOKE_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vK;
  void main() {
    #include <logdepthbuf_fragment>
    float a = uOpacity * smoothstep(0.05, 0.35, vK) * (1.0 - smoothstep(0.45, 1.0, vK));
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Unit cylinder with the nozzle exit at y = 0, extending to y = -1. */
let sharedGeo: THREE.CylinderGeometry | null = null;
function plumeGeometry(): THREE.CylinderGeometry {
  if (!sharedGeo) {
    sharedGeo = new THREE.CylinderGeometry(1, 1, 1, 22, 14, true);
    sharedGeo.translate(0, -0.5, 0);
    sharedGeo.userData.shared = true;
  }
  return sharedGeo;
}

export type PlumeKind = 'liquid' | 'solid' | 'vernier' | 'hypergolic' | 'hydrogen';

export interface PlumeOptions {
  /** effective radius of the engine cluster at the nozzle exit, m */
  radius: number;
  /** plume length at full throttle at sea level, m */
  length: number;
  kind: PlumeKind;
  /** stable per-plume seed in 0..1 */
  seed: number;
}

const PALETTE: Record<PlumeKind, { core: number; edge: number; tip: number; light: number; smoke: number | null }> = {
  liquid: { core: 0xfff6e0, edge: 0xffb254, tip: 0xff6a1e, light: 0xffa850, smoke: null },
  solid: { core: 0xfffdf0, edge: 0xffd070, tip: 0xff9a3a, light: 0xffc070, smoke: 0x8d8b86 },
  vernier: { core: 0xfff0d0, edge: 0xff9e46, tip: 0xff6a20, light: 0xffa050, smoke: null },
  hypergolic: { core: 0xffe6c8, edge: 0xffa060, tip: 0xc8621e, light: 0xff9050, smoke: 0xb08060 },
  hydrogen: { core: 0xe8f2ff, edge: 0x9ec4ff, tip: 0x5c86e0, light: 0xbcd4ff, smoke: null },
};

export class Plume {
  readonly group = new THREE.Group();
  /** current plume length, m (the caller can place a light along it) */
  length = 0;
  private core: THREE.Mesh;
  private sheath: THREE.Mesh;
  private smoke: THREE.Mesh | null = null;
  private coreMat: THREE.ShaderMaterial;
  private sheathMat: THREE.ShaderMaterial;
  private smokeMat: THREE.ShaderMaterial | null = null;
  private opts: PlumeOptions;
  /** warm colour a caller should use for the engine light */
  readonly lightColor: number;

  constructor(opts: PlumeOptions) {
    this.opts = opts;
    const pal = PALETTE[opts.kind];
    const geo = plumeGeometry();
    const mk = (core: number, edge: number, tip: number, opacity: number, flare: number, turb: number, edgeGain: number) =>
      new THREE.ShaderMaterial({
        vertexShader: PLUME_VERT, fragmentShader: PLUME_FRAG,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 }, uVac: { value: 0 }, uSeed: { value: opts.seed }, uFlare: { value: flare },
          uTurb: { value: turb }, uCore: { value: new THREE.Color(core) }, uEdge: { value: new THREE.Color(edge) },
          uTip: { value: new THREE.Color(tip) }, uOpacity: { value: opacity }, uMach: { value: 0 },
          uMachFreq: { value: 42 }, uEdgeGain: { value: edgeGain },
        },
      });
    this.coreMat = mk(pal.core, pal.edge, pal.tip, 0.95, 0.42, 0.55, 0.55);
    this.sheathMat = mk(pal.edge, pal.tip, pal.tip, 0.26, 1.05, 1.0, 1.8);
    this.core = new THREE.Mesh(geo, this.coreMat);
    this.sheath = new THREE.Mesh(geo, this.sheathMat);
    this.core.frustumCulled = false;
    this.sheath.frustumCulled = false;
    this.group.add(this.sheath, this.core);
    if (pal.smoke !== null) {
      this.smokeMat = new THREE.ShaderMaterial({
        vertexShader: SMOKE_VERT, fragmentShader: SMOKE_FRAG,
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 }, uSeed: { value: opts.seed }, uColor: { value: new THREE.Color(pal.smoke) }, uOpacity: { value: 0.3 } },
      });
      this.smoke = new THREE.Mesh(geo, this.smokeMat);
      this.smoke.frustumCulled = false;
      this.group.add(this.smoke);
    }
    this.lightColor = pal.light;
    this.group.visible = false;
  }

  /**
   * @param throttle 0..1 engine throttle (0 = shut down)
   * @param pressure ambient pressure, Pa
   * @param t mission time, s (drives all turbulence)
   */
  update(throttle: number, pressure: number, t: number): void {
    if (throttle <= 0.015) {
      this.group.visible = false;
      this.length = 0;
      return;
    }
    this.group.visible = true;
    const o = this.opts;
    const vac = Math.max(0, Math.min(1, 1 - pressure / P0));
    const seaF = 1 - vac;
    const thr = Math.max(0.15, Math.min(1, throttle));
    // length grows strongly as the ambient pressure falls
    const L = o.length * (0.55 + 0.75 * thr) * (1 + 2.1 * vac * vac);
    const R = o.radius;
    this.core.scale.set(R, L * 0.62, R);
    this.sheath.scale.set(R, L, R);
    if (this.smoke) this.smoke.scale.set(R, L * 1.35, R);
    const set = (m: THREE.ShaderMaterial, opacityBase: number) => {
      m.uniforms.uTime.value = t;
      m.uniforms.uVac.value = vac;
      m.uniforms.uMach.value = seaF * seaF * (o.kind === 'hydrogen' ? 0.4 : 1) * thr;
      m.uniforms.uMachFreq.value = 34 + 26 * seaF;
      m.uniforms.uOpacity.value = opacityBase * (0.55 + 0.45 * thr);
    };
    set(this.coreMat, 0.95);
    set(this.sheathMat, o.kind === 'hydrogen' ? 0.18 : 0.26);
    if (this.smokeMat) {
      this.smokeMat.uniforms.uTime.value = t;
      this.smokeMat.uniforms.uOpacity.value = 0.34 * seaF + 0.1;
    }
    this.length = L;
  }

  dispose(): void {
    this.coreMat.dispose();
    this.sheathMat.dispose();
    this.smokeMat?.dispose();
  }
}
