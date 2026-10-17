/**
 * The aerial perspective over the globe and its clouds under the scattering
 * sky (V02; render/atmosphere.ts `AERIAL`, render/scene.ts). Source-level:
 * the GLSL lines below must stand in the shaders as written, and the march
 * is replayed in float64 next to them and checked against an independent
 * fine integral of the same single-scattering model; the view segment's ends
 * are replayed in float32 op by op. The constructor and `update` run against
 * a stand-in renderer with no GL behind it. No WebGL pixel claims.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SceneManager } from '../src/render/scene';
import { AERIAL, ATMOSPHERE_HEIGHT } from '../src/render/atmosphere';
import { R_EARTH } from '../src/physics/constants';
import type { VisualFrame } from '../src/physics/frame';

const gpu = vi.hoisted(() => ({ floatTargets: true }));
vi.mock('../src/render/webgl-renderer', () => ({
  createWebGLRenderer: () => ({
    setPixelRatio() {}, getPixelRatio: () => 1, shadowMap: {}, compile() {}, render() {},
    setRenderTarget() {}, getRenderTarget: () => null,
    capabilities: { getMaxAnisotropy: () => 1 },
    extensions: { has: (n: string) => gpu.floatTargets && n === 'EXT_color_buffer_float' },
    getDrawingBufferSize: (v: THREE.Vector2) => v.set(64, 32),
    setClearColor() {},
  }),
}));

interface Internals {
  earthMat: THREE.ShaderMaterial;
  physicalSky: { mesh: THREE.Mesh; transmittance: THREE.Texture; multiScatter: THREE.Texture } | null;
}

const tex = () => ({ day: new THREE.Texture(), night: new THREE.Texture(), spec: new THREE.Texture(), normal: new THREE.Texture(), clouds: new THREE.Texture() });
function build(floatTargets: boolean): { sm: SceneManager; my: Internals } {
  gpu.floatTargets = floatTargets;
  const sm = new SceneManager({ addEventListener() {} } as unknown as HTMLCanvasElement, tex());
  return { sm, my: sm as unknown as Internals };
}
/** a frame at `alt` over the equator, the sun at `sun` (ECI) */
function at(sm: SceneManager, alt: number, sun = { x: 1, y: 0, z: 0 }): void {
  sm.origin = { x: R_EARTH + alt, y: 0, z: 0 };
  sm.camera.position.set(0, 0, 0);
  sm.update({ theta: 0, t: 0 } as VisualFrame, sun, alt);
}

beforeEach(() => {
  vi.stubGlobal('window', { devicePixelRatio: 1 });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => null }) });
  vi.spyOn(SceneManager.prototype as unknown as { drawMarker(): void }, 'drawMarker').mockImplementation(() => {});
  vi.spyOn(SceneManager.prototype as unknown as { updateEnvironment(): void }, 'updateEnvironment').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

/** The model and the march, as they stand in `AERIAL`. */
const SHADER_LINES = [
  'const vec3 RAY_S = vec3(5.802e-6, 13.558e-6, 33.1e-6);',
  'const float RAY_H = 8000.0;',
  'const float MIE_S = 3.996e-6;',
  'const float MIE_E = 4.40e-6;',
  'const float MIE_H = 1200.0;',
  'const float MIE_G = 0.8;',
  'const vec3 OZONE = vec3(0.650e-6, 1.881e-6, 0.085e-6);',
  'float oz = max(0.0, 1.0 - abs(h - 25000.0) / 15000.0);',
  'float muH = -sqrt(max(0.0, (r - RG) * (r + RG)) / (r * r));',
  'float vis = smoothstep(muH - 0.004, muH + 0.004, muS);',
  'return vis * texture2D(uTransmittance, transmittanceUv(r, max(muS, muH + 0.004))).rgb;',
  '#define AERIAL_N 10',
  'float tc = -dot(o, dir);',
  'vec3 pc = o + dir * tc;',
  'float rp2 = dot(pc, pc);',
  'float tStart = max(0.0, tc - sqrt(max(0.0, RT * RT - rp2)));',
  'float tEnd = rp2 < rEnd * rEnd ? tc - sqrt(rEnd * rEnd - rp2) : tc;',
  'float len = max(tEnd - tStart, 0.0);',
  'float c = dot(dir, sunDir), pr = rayleighPhase(c), pm = miePhase(c);',
  'vec3 pEnd = o + dir * tEnd;',
  'float sa = -len;',
  'for (int i = 0; i < AERIAL_N; i++) {',
  'float x = 1.0 - float(i + 1) / float(AERIAL_N);',
  'float sb = -x * x * len;',
  'float dt = sb - sa;',
  'vec3 p = pEnd + dir * (0.5 * (sa + sb));',
  'float muS = dot(p, sunDir) / rp;',
  'Medium m = medium(rp - RG);',
  'vec3 S = (m.scatR * pr + vec3(m.scatM * pm)) * sunlight(rp, muS) + (m.scatR + vec3(m.scatM)) * multiScatter(rp, muS);',
  'vec3 stepT = exp(-m.ext * dt);',
  'L += T * S * (vec3(1.0) - stepT) / max(m.ext, vec3(1e-12));',
  'T *= stepT;',
  'vec3 L = aerial(cam - earthCentre, dir, rEnd, sunDir, T);',
  'vec3 seen = col * T + L * uSunIlluminance;',
];
const EARTH_LINE = 'if (uAerial > 0.5) col = aerialPerspective(col, camPos, -viewDir, RG, sunDir);';
const CLOUD_LINES = [
  '#define AERIAL_N 6',
  'uniform vec3 sunDir;',
  'if (uAerial > 0.5) {',
  'if (gl_FragColor.a < 0.004) discard;',
  'vec3 dirW = normalize((vec4(-vViewPosition, 0.0) * viewMatrix).xyz);',
  'vec3 upW = normalize(cameraPosition + dirW * length(vViewPosition) - earthCentre);',
];

describe('aerial perspective: wired into the globe and the clouds (V02)', () => {
  it('stands in the globe shader as replayed below, and reads the sky\'s own tables', () => {
    const { sm, my } = build(true);
    const frag = my.earthMat.fragmentShader;
    for (const line of [...SHADER_LINES, EARTH_LINE]) expect(frag, line).toContain(line);
    expect(AERIAL).toContain('uniform sampler2D uTransmittance;');
    const u = my.earthMat.uniforms;
    expect(u.uTransmittance.value).toBe(my.physicalSky!.transmittance);
    expect(u.uMultiScatter.value).toBe(my.physicalSky!.multiScatter);
    const skyU = (my.physicalSky!.mesh.material as THREE.ShaderMaterial).uniforms;
    expect(skyU.uTransmittance.value).toBe(u.uTransmittance.value);
    expect(skyU.uMultiScatter.value).toBe(u.uMultiScatter.value);
    expect(sm.physicalSkyEnabled).toBe(true);
    expect(u.uAerial.value).toBe(1);
  });

  it('is patched into the clouds\' material, sharing the globe\'s uniforms', () => {
    const { sm, my } = build(true);
    const mat = sm.cloudMesh!.material as THREE.MeshLambertMaterial;
    const shader = { uniforms: {} as Record<string, THREE.IUniform>, fragmentShader: THREE.ShaderLib.lambert.fragmentShader, vertexShader: THREE.ShaderLib.lambert.vertexShader };
    mat.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
    const frag = shader.fragmentShader;
    for (const line of [...CLOUD_LINES, ...SHADER_LINES.filter((l) => l !== '#define AERIAL_N 10')]) expect(frag, line).toContain(line);
    // the model after three's own declarations, the haze once the colour is set and before it is tone-mapped
    expect(frag.indexOf('#define AERIAL_N 6')).toBeGreaterThan(frag.indexOf('#include <common>'));
    expect(frag.indexOf('if (gl_FragColor.a < 0.004) discard;')).toBeGreaterThan(frag.indexOf('#include <opaque_fragment>'));
    expect(frag.indexOf('if (gl_FragColor.a < 0.004) discard;')).toBeLessThan(frag.indexOf('#include <tonemapping_fragment>'));
    for (const k of ['uTransmittance', 'uMultiScatter', 'uAerial', 'uSunIlluminance', 'earthCentre', 'sunDir']) {
      expect(shader.uniforms[k], k).toBe(my.earthMat.uniforms[k]);
    }
    // the cloud sphere the march ends on is the mesh's own
    const geo = sm.cloudMesh!.geometry as THREE.SphereGeometry;
    expect(geo.parameters.radius).toBe(R_EARTH + 9000);
  });

  it('follows the sky: on with the scattering sky, off under the gradient, which keeps the rim', () => {
    const { sm, my } = build(true);
    const u = my.earthMat.uniforms;
    at(sm, 400e3);
    expect(u.uAerial.value).toBe(1);
    expect(u.rimGain.value).toBe(0);
    sm.setPhysicalSky(false); // the governor's fallback, `?sky=gradient`
    at(sm, 400e3);
    expect(u.uAerial.value).toBe(0);
    expect(u.rimGain.value).toBe(1);
    at(sm, 2);
    expect(u.rimGain.value).toBe(0.25);
    sm.setPhysicalSky(true);
    at(sm, 2);
    expect(u.uAerial.value).toBe(1);
    expect(u.rimGain.value).toBe(0);
    // no float targets: no tables, no aerial perspective, the gradient's rim
    const none = build(false);
    at(none.sm, 400e3);
    expect(none.my.earthMat.uniforms.uAerial.value).toBe(0);
    expect(none.my.earthMat.uniforms.uTransmittance.value).toBeNull();
    expect(none.my.earthMat.uniforms.rimGain.value).toBe(1);
  });

  it('sees one sun with the sky pass: its tuned noon on the ground, the scene\'s own in space', () => {
    const { sm, my } = build(true);
    const skyU = (my.physicalSky!.mesh.material as THREE.ShaderMaterial).uniforms;
    const u = my.earthMat.uniforms;
    for (const [alt, want] of [[2, 8], [12e3, 8], [400e3, 3.3], [72e3, 3.3]] as const) {
      at(sm, alt);
      expect(u.uSunIlluminance.value, `${alt} m`).toBeCloseTo(want, 12);
      expect(skyU.uSunIlluminance.value, `${alt} m`).toBe(u.uSunIlluminance.value);
    }
    at(sm, 42e3);
    expect(u.uSunIlluminance.value).toBeGreaterThan(3.3);
    expect(u.uSunIlluminance.value).toBeLessThan(8);
    expect(skyU.uSunIlluminance.value).toBe(u.uSunIlluminance.value);
  });
});

// ------------------------------------------------------------------ the model, in float64

const RG = R_EARTH, RT = R_EARTH + ATMOSPHERE_HEIGHT;
type V = [number, number, number];
const RAY: V = [5.802e-6, 13.558e-6, 33.1e-6], OZONE: V = [0.650e-6, 1.881e-6, 0.085e-6];
const MIE_S = 3.996e-6, MIE_E = 4.40e-6, MIE_G = 0.8;
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const madd = (o: V, d: V, t: number): V => [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
const unit = (v: V): V => { const n = Math.hypot(...v); return [v[0] / n, v[1] / n, v[2] / n]; };
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function medium(h: number): { scatR: V; scatM: number; ext: V } {
  const dr = Math.exp(-h / 8000), dm = Math.exp(-h / 1200), oz = Math.max(0, 1 - Math.abs(h - 25000) / 15000);
  return { scatR: RAY.map((s) => s * dr) as V, scatM: MIE_S * dm, ext: RAY.map((s, i) => s * dr + MIE_E * dm + OZONE[i] * oz) as V };
}
const rayleighPhase = (c: number) => 3 / (16 * Math.PI) * (1 + c * c);
const miePhase = (c: number) => { const g2 = MIE_G * MIE_G; return 3 / (8 * Math.PI) * ((1 - g2) * (1 + c * c)) / ((2 + g2) * Math.pow(1 + g2 - 2 * MIE_G * c, 1.5)); };
/** what the transmittance table holds, integrated finely: radius r, cosine mu, to the top of the atmosphere */
function transmittance(r: number, mu: number): V {
  const d = -r * mu + Math.sqrt(Math.max(0, r * r * mu * mu + (RT - r) * (RT + r)));
  const n = 120, dt = d / n, tau: V = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * dt, m = medium(Math.sqrt(r * r + t * t + 2 * r * mu * t) - RG);
    for (let k = 0; k < 3; k++) tau[k] += m.ext[k] * dt;
  }
  return tau.map((x) => Math.exp(-x)) as V;
}
/** `sunlight` of the shader, the table read exactly */
function sunlight(r: number, muS: number): V {
  const muH = -Math.sqrt(Math.max(0, (r - RG) * (r + RG)) / (r * r));
  const vis = smooth(muH - 0.004, muH + 0.004, muS);
  return vis === 0 ? [0, 0, 0] : transmittance(r, Math.max(muS, muH + 0.004)).map((x) => vis * x) as V;
}
function segment(o: V, dir: V, rEnd: number): { tStart: number; tEnd: number } {
  const tc = -dot(o, dir), pc = madd(o, dir, tc), rp2 = dot(pc, pc);
  return { tStart: Math.max(0, tc - Math.sqrt(Math.max(0, RT * RT - rp2))), tEnd: rp2 < rEnd * rEnd ? tc - Math.sqrt(rEnd * rEnd - rp2) : tc };
}

/** `aerial`, line by line, single scattering only (the multiple-scattering table read as 0) */
function aerial(o: V, dir: V, rEnd: number, sun: V, n: number): { L: V; T: V } {
  const { tStart, tEnd } = segment(o, dir, rEnd);
  const len = Math.max(tEnd - tStart, 0);
  const c = dot(dir, sun), pr = rayleighPhase(c), pm = miePhase(c);
  const pEnd = madd(o, dir, tEnd);
  const L: V = [0, 0, 0], T: V = [1, 1, 1];
  let sa = -len;
  for (let i = 0; i < n; i++) {
    const x = 1 - (i + 1) / n;
    const sb = -x * x * len, dt = sb - sa;
    const p = madd(pEnd, dir, 0.5 * (sa + sb));
    sa = sb;
    const rp = Math.hypot(...p), muS = dot(p, sun) / rp, m = medium(rp - RG), Ts = sunlight(rp, muS);
    for (let k = 0; k < 3; k++) {
      const S = (m.scatR[k] * pr + m.scatM * pm) * Ts[k], stepT = Math.exp(-m.ext[k] * dt);
      L[k] += T[k] * S * (1 - stepT) / Math.max(m.ext[k], 1e-12);
      T[k] *= stepT;
    }
  }
  return { L, T };
}

/**
 * The same single scattering integrated independently: the trapezoid rule on
 * a grid of 1 000 steps packed cubically towards the far end, the optical
 * depth from the camera summed by the trapezoid rule as well.
 */
function integral(o: V, dir: V, rEnd: number, sun: V): { L: V; T: V } {
  const { tStart, tEnd } = segment(o, dir, rEnd);
  const L: V = [0, 0, 0], tau: V = [0, 0, 0];
  const c = dot(dir, sun), pr = rayleighPhase(c), pm = miePhase(c), len = tEnd - tStart;
  const n = 1000;
  let prev: { t: number; ext: V; J: V } | null = null;
  for (let i = 0; i <= n; i++) {
    const t = tEnd - Math.pow(1 - i / n, 3) * len, p = madd(o, dir, t), rp = Math.hypot(...p);
    const m = medium(rp - RG), Ts = sunlight(rp, dot(p, sun) / rp);
    const cur = { t, ext: m.ext, J: [0, 1, 2].map((k) => (m.scatR[k] * pr + m.scatM * pm) * Ts[k]) as V };
    if (prev) {
      const dt = cur.t - prev.t;
      for (let k = 0; k < 3; k++) {
        const before = tau[k];
        tau[k] += 0.5 * (prev.ext[k] + cur.ext[k]) * dt;
        L[k] += 0.5 * (prev.J[k] * Math.exp(-before) + cur.J[k] * Math.exp(-tau[k])) * dt;
      }
    }
    prev = cur;
  }
  return { L, T: tau.map((x) => Math.exp(-x)) as V };
}

/** A camera `alt` over the north pole and a ray `off` degrees from its nadir, towards +x. */
function view(alt: number, off: number): { o: V; dir: V } {
  const a = off * Math.PI / 180;
  return { o: [0, 0, RG + alt], dir: [Math.sin(a), 0, -Math.cos(a)] };
}
/**
 * The sun `el` degrees over the horizon of the point where the ray meets the
 * ground, `az` degrees round from straight ahead along the ray (0: the sun in
 * front of the camera, 180: behind it).
 */
function sunOver(o: V, dir: V, el: number, az: number): V {
  const up = unit(madd(o, dir, segment(o, dir, RG).tEnd));
  const along = madd(dir, up, -dot(dir, up));
  const fwd = Math.hypot(...along) > 1e-6 ? unit(along) : ([1, 0, 0] as V);
  const side: V = [up[1] * fwd[2] - up[2] * fwd[1], up[2] * fwd[0] - up[0] * fwd[2], up[0] * fwd[1] - up[1] * fwd[0]];
  const e = el * Math.PI / 180, z = az * Math.PI / 180;
  return unit([0, 1, 2].map((k) => Math.cos(e) * (Math.cos(z) * fwd[k] + Math.sin(z) * side[k]) + Math.sin(e) * up[k]) as V);
}

interface Errors { worstL: number; worstT: number; rmsL: number; rmsT: number }
/**
 * L's error relative to the ray's brightest channel (or to 0.2 % of the
 * illuminance where the ray is darker), T's relative to T (or to 0.02 where
 * almost nothing gets through).
 */
function compare(alt: number, rEnd: number, n: number): Errors {
  const limb = Math.asin(RG / (RG + alt)) * 180 / Math.PI;
  let worstL = 0, worstT = 0, sL = 0, sT = 0, k = 0;
  for (const off of [0, 30, 60, limb - 5, limb - 1, limb - 0.2]) {
    for (const [el, az] of [[60, 0], [20, 180], [5, 0], [5, 180], [1, 90], [-2, 0]]) {
      const { o, dir } = view(alt, off);
      const sun = sunOver(o, dir, el, az);
      const ref = integral(o, dir, rEnd, sun), got = aerial(o, dir, rEnd, sun, n);
      const lmax = Math.max(...ref.L, 0.002);
      const eL = Math.max(...[0, 1, 2].map((c) => Math.abs(got.L[c] - ref.L[c]) / lmax));
      const eT = Math.max(...[0, 1, 2].map((c) => Math.abs(got.T[c] - ref.T[c]) / Math.max(ref.T[c], 0.02)));
      worstL = Math.max(worstL, eL); worstT = Math.max(worstT, eT);
      sL += eL * eL; sT += eT * eT; k++;
    }
  }
  return { worstL, worstT, rmsL: Math.sqrt(sL / k), rmsT: Math.sqrt(sT / k) };
}

describe('aerial perspective: the march against an independent integral (float64)', () => {
  // each case integrates 36 rays finely: about 2 s alone, more on a shared machine
  it('replays a view to the ground from 400 km within a few per cent', () => {
    const e = compare(400e3, RG, 10);
    // measured: L worst 4.7 % (a ray 1° inside the limb, the sun 5° up ahead of it), RMS 1.4 %; T worst 4.5 %
    // (0.2° inside the limb, where under 2 % of the blue gets through), RMS 2.7 %
    expect(e.worstL).toBeLessThan(0.06);
    expect(e.rmsL).toBeLessThan(0.02);
    expect(e.worstT).toBeLessThan(0.06);
    expect(e.rmsT).toBeLessThan(0.035);
  }, 30000);

  it('replays a view to the ground from 30 km within a few per cent', () => {
    const e = compare(30e3, RG, 10);
    // measured: L worst 1.6 %, RMS 0.6 %; T worst 1.9 %, RMS 0.9 %
    expect(e.worstL).toBeLessThan(0.03);
    expect(e.rmsL).toBeLessThan(0.01);
    expect(e.worstT).toBeLessThan(0.03);
    expect(e.rmsT).toBeLessThan(0.01);
  }, 30000);

  it('replays a view to the clouds\' layer from 400 km with the clouds\' six samples', () => {
    const e = compare(400e3, RG + 9000, 6);
    // measured: L worst 4.6 %, RMS 2.7 %; T worst 3.5 %, RMS 2.0 %
    expect(e.worstL).toBeLessThan(0.06);
    expect(e.rmsL).toBeLessThan(0.035);
    expect(e.worstT).toBeLessThan(0.05);
    expect(e.rmsT).toBeLessThan(0.025);
  }, 30000);

  it('adds no light where the whole stretch is in the Earth\'s shadow, and dims by the same transmittance', () => {
    const { o, dir } = view(400e3, 20);
    const sun = sunOver(o, dir, -25, 0);
    const got = aerial(o, dir, RG, sun, 10), ref = integral(o, dir, RG, sun);
    expect(Math.max(...got.L)).toBe(0);
    expect(Math.max(...ref.L)).toBe(0);
    for (let c = 0; c < 3; c++) expect(got.T[c]).toBeCloseTo(ref.T[c], 2);
  }, 30000);
});

// ------------------------------------------------------------------ sunlight through the air

const SUN_LINES = [
  'return sunlight(r, muS) / exp(-(RAY_S * RAY_H * exp(-h / RAY_H) + vec3(MIE_E * MIE_H * exp(-h / MIE_H)) + OZONE * 15000.0));',
];
const EARTH_SUN = 'if (uAerial > 0.5) col = day * (0.09 + 0.95 * max(cosSun, 0.0) * sunColour(RG, cosSunGeo));';
const CLOUD_SUN = 'gl_FragColor.rgb = aerialPerspective(gl_FragColor.rgb * sunColour(RG + 9000.0, dot(upW, sunDir)), cameraPosition, dirW, RG + 9000.0, sunDir);';
/** `sunColour`, the table read exactly */
function sunColour(r: number, muS: number): V {
  const h = r - RG, s = sunlight(r, muS);
  return [0, 1, 2].map((k) => s[k] / Math.exp(-(RAY[k] * 8000 * Math.exp(-h / 8000) + MIE_E * 1200 * Math.exp(-h / 1200) + OZONE[k] * 15000))) as V;
}

describe('sunlight through the air on the ground and the cloud tops', () => {
  it('stands in the globe\'s and the clouds\' shaders, under the scattering sky only', () => {
    const { sm, my } = build(true);
    const frag = my.earthMat.fragmentShader;
    for (const line of [...SUN_LINES, EARTH_SUN]) expect(frag, line).toContain(line);
    // the gradient sky's line is kept as it was, and the patch only replaces it under uAerial
    expect(frag).toContain('vec3 col = day * (0.09 + 0.95 * max(cosSun, 0.0));');
    const shader = { uniforms: {} as Record<string, THREE.IUniform>, fragmentShader: THREE.ShaderLib.lambert.fragmentShader, vertexShader: '' };
    (sm.cloudMesh!.material as THREE.Material).onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
    expect(shader.fragmentShader).toContain(CLOUD_SUN);
  });

  it('leaves noon as it was drawn, reddens a low sun and leaves a set one dark', () => {
    for (const h of [0, 9000]) {
      const noon = sunColour(RG + h, 1);
      // the closed-form column overhead against the integrated table: a part in a thousand
      for (const c of noon) expect(Math.abs(c - 1), `${h} m`).toBeLessThan(2e-3);
      const low = sunColour(RG + h, Math.sin(4 * Math.PI / 180));
      expect(low[0]).toBeGreaterThan(low[1]);
      expect(low[1]).toBeGreaterThan(low[2]);
      expect(low[2]).toBeLessThan(0.5);
      expect(Math.max(...sunColour(RG + h, Math.sin(-4 * Math.PI / 180)))).toBe(0);
    }
    // the cloud tops see the sun 2° under the ground's horizon (theirs is 3° down)
    expect(Math.max(...sunColour(RG, Math.sin(-2 * Math.PI / 180)))).toBe(0);
    expect(sunColour(RG + 9000, Math.sin(-2 * Math.PI / 180))[0]).toBeGreaterThan(0.01);
  });
});

// ------------------------------------------------------------------ the segment's ends, in float32

const f = Math.fround;
const add32 = (a: number, b: number) => f(a + b), mul32 = (a: number, b: number) => f(a * b);
const dot32 = (a: V, b: V) => add32(add32(mul32(a[0], b[0]), mul32(a[1], b[1])), mul32(a[2], b[2]));
const madd32 = (o: V, d: V, t: number): V => [add32(o[0], mul32(d[0], t)), add32(o[1], mul32(d[1], t)), add32(o[2], mul32(d[2], t))];
/** the shader's tEnd and far end, op by op in float32 (no FMA) */
function end32(o: V, dir: V, rEnd: number): { tEnd: number; pEnd: V } {
  const tc = -dot32(o, dir), pc = madd32(o, dir, tc), rp2 = dot32(pc, pc), r2 = mul32(f(rEnd), f(rEnd));
  const tEnd = rp2 < r2 ? add32(tc, -f(Math.sqrt(add32(r2, -rp2)))) : tc;
  return { tEnd, pEnd: madd32(o, dir, tEnd) };
}

describe('aerial perspective: the far end in float32', () => {
  it.each([400e3, 36000e3])('lands on the ground across the disc and up to its edge from %s m', (alt) => {
    const up = unit([0.37, -0.52, 0.769]), side = unit([up[1], -up[0], 0]);
    const o = up.map((u) => f(u * (RG + alt))) as V, r = RG + alt;
    let worstAlt = 0, checked = 0;
    // perigees from 2 000 km below the surface to 10 m below it: the disc to its very edge
    for (const depth of [2000e3, 300e3, 50e3, 5e3, 500, 50, 10]) {
      const sa = (RG - depth) / r, ca = Math.sqrt(1 - sa * sa);
      const dir = unit([0, 1, 2].map((k) => -ca * up[k] + sa * side[k]) as V).map(f) as V;
      const { pEnd } = end32(o, dir, RG);
      worstAlt = Math.max(worstAlt, Math.abs(Math.hypot(...pEnd) - RG));
      checked++;
    }
    expect(checked).toBe(7);
    // the end is on the sphere to within float32's own metre at 6 400 km, and the ulps of the camera's position
    expect(worstAlt).toBeLessThan(alt > 1e6 ? 40 : 4);
  });

  it('meets the perigee where the rounding puts a fragment on a ray just clear of the sphere', () => {
    const o: V = [0, 0, f(RG + 400e3)];
    const r = RG + 400e3;
    // a ray whose perigee is 1 m over the surface: no root, the stretch ends at the perigee
    const sa = (RG + 1) / r, dir = [f(sa), 0, f(-Math.sqrt(1 - sa * sa))] as V;
    const { tEnd, pEnd } = end32(o, dir, RG);
    const tc = -dot32(o, dir);
    expect(tEnd).toBe(tc);
    expect(Math.abs(Math.hypot(...pEnd) - RG)).toBeLessThan(5);
  });
});

// ------------------------------------------------------------------ the sky pass behind the globe

const SKIP_LINE = 'if (tc > 0.0 && rp2 < (RG - 1e4) * (RG - 1e4)) tEnd = tStart;';
/** the sky pass's verdict, op by op in float32: true = the ray is not marched */
function skipped32(o: V, dir: V): boolean {
  const tc = -dot32(o, dir), pc = madd32(o, dir, tc), rp2 = dot32(pc, pc), k = add32(f(RG), -1e4);
  return tc > 0 && rp2 < mul32(k, k);
}

describe('the sky pass leaves the inside of the disc to the globe', () => {
  it('stands in the sky pass after the interval it shortens', () => {
    const { my } = build(true);
    const frag = (my.physicalSky!.mesh.material as THREE.ShaderMaterial).fragmentShader;
    expect(frag).toContain(SKIP_LINE);
    expect(frag.indexOf(SKIP_LINE)).toBeGreaterThan(frag.indexOf('if (tc > 0.0 && rp2 < RG * RG) tEnd = tc - sqrt(RG * RG - rp2);'));
    expect(frag.indexOf(SKIP_LINE)).toBeLessThan(frag.indexOf('if (tEnd > tStart) {'));
  });

  it('only where the globe\'s mesh covers the ray: its facets lie under 3 km below the sphere', () => {
    const { sm } = build(true);
    const geo = sm.earthMesh.geometry as THREE.SphereGeometry;
    expect([geo.parameters.radius, geo.parameters.widthSegments, geo.parameters.heightSegments]).toEqual([R_EARTH, 128, 96]);
    const pos = geo.attributes.position, idx = geo.index!;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
    let deepest = 0;
    for (let i = 0; i < idx.count; i += 3) {
      a.fromBufferAttribute(pos, idx.getX(i)); b.fromBufferAttribute(pos, idx.getX(i + 1)); c.fromBufferAttribute(pos, idx.getX(i + 2));
      n.subVectors(b, a).cross(c.clone().sub(a));
      if (n.lengthSq() === 0) continue;
      // the facet's plane comes closest to the centre at |n̂·a|
      deepest = Math.max(deepest, R_EARTH - Math.abs(n.normalize().dot(a)));
    }
    expect(deepest).toBeGreaterThan(1000);
    expect(deepest).toBeLessThan(3000);
  });

  it.each([2, 30e3, 400e3, 36000e3])('marches every ray the globe may leave uncovered from %s m, in float32', (alt) => {
    const up = unit([0.37, -0.52, 0.769]), side = unit([up[1], -up[0], 0]);
    const o = up.map((u) => f(u * (RG + alt))) as V, r = RG + alt;
    const ray = (depth: number): V => {
      const sa = (RG - depth) / r, ca = Math.sqrt(1 - sa * sa);
      return unit([0, 1, 2].map((k) => -ca * up[k] + sa * side[k]) as V).map(f) as V;
    };
    // through the facets' depth and a little past it: marched; well inside the disc: left to the globe
    for (const depth of [-50e3, -10, 10, 1000, 3000, 9000]) expect(skipped32(o, ray(depth)), `${depth} m`).toBe(false);
    for (const depth of [11e3, 50e3, 1000e3]) expect(skipped32(o, ray(depth)), `${depth} m`).toBe(true);
  });
});
