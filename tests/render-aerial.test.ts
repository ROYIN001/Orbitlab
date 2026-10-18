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

const gpu = vi.hoisted(() => ({ floatTargets: true, frags: [] as string[] }));
vi.mock('../src/render/webgl-renderer', () => ({
  createWebGLRenderer: () => ({
    setPixelRatio() {}, getPixelRatio: () => 1, shadowMap: {}, compile() {},
    // the fragment shaders of what is drawn, so the tables' passes can be read
    render(scene: { children?: { material?: { fragmentShader?: string } }[] }) {
      for (const c of scene.children ?? []) if (c.material?.fragmentShader) gpu.frags.push(c.material.fragmentShader);
    },
    setRenderTarget() {}, getRenderTarget: () => null,
    capabilities: { getMaxAnisotropy: () => 1 },
    extensions: { has: (n: string) => gpu.floatTargets && n === 'EXT_color_buffer_float' },
    getDrawingBufferSize: (v: THREE.Vector2) => v.set(64, 32),
    setClearColor() {},
  }),
}));

interface Internals {
  earthMat: THREE.ShaderMaterial;
  physicalSky: { mesh: THREE.Mesh; transmittance: THREE.Texture; multiScatter: THREE.Texture; skyLight: THREE.Texture } | null;
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
  'vec3 hazeLight = uSunIlluminance + (uSceneSun - uSunIlluminance) * T;',
  'vec3 seen = col * T + L * hazeLight;',
];
const EARTH_LINE = 'if (uAerial > 0.5) col = aerialPerspective(col, uAerialCam, -viewDir, RG, sunDir);';
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
    expect(u.uSkyLight.value).toBe(my.physicalSky!.skyLight);
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
    for (const k of ['uTransmittance', 'uMultiScatter', 'uSkyLight', 'uAerial', 'uSunIlluminance', 'uSceneSun', 'earthCentre', 'uAerialCam', 'sunDir']) {
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
      // what the haze blends to where the ground shows through (the haze's light, below): the scene's own sun
      expect(u.uSceneSun.value, `${alt} m`).toBe(3.3);
      // the sun's disc and glare are the lens's, not the air's: 8 at every height, as before
      expect(skyU.uSunDisc.value, `${alt} m`).toBe(8);
    }
    const frag = (my.physicalSky!.mesh.material as THREE.ShaderMaterial).fragmentShader;
    expect(frag).toContain('L += (disc * 50.0 * limb + glow) * uSunDisc * (r > RT ? T : transmittance(r, mu));');
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

// ------------------------------------------------------------------ the haze's light

const f32 = Math.fround;
/**
 * The haze's light as `aerialPerspective` computes it, E + (S − E)·T, op by
 * op in float32 (fused into one multiply-add it rounds once instead of twice,
 * which changes nothing at either end).
 */
const hazeLight = (E: number, S: number, T: number) => f32(f32(E) + f32(f32(f32(S) - f32(E)) * f32(T)));

describe('the haze\'s light: the sky\'s where nothing shows through the air, the scene\'s sun where the ground does', () => {
  it('takes the sky\'s illuminance where T = 0 and the scene\'s sun where T = 1, at every height of the climb', () => {
    const { sm, my } = build(true);
    const u = my.earthMat.uniforms;
    // E from the sky's ground factor: 8 up to 12 km, falling to the scene's sun at 72 km
    for (const [alt, want] of [[12e3, 8], [20e3, 7.77], [30e3, 6.98], [45e3, 5.30], [60e3, 3.79]] as const) {
      at(sm, alt);
      const E = u.uSunIlluminance.value as number, S = u.uSceneSun.value as number;
      expect(E, `${alt} m`).toBeCloseTo(want, 2);
      expect(hazeLight(E, S, 0), `${alt} m`).toBe(f32(E));
      // within one float32 step of 3.3 (2^-22 at 3.3)
      expect(Math.abs(hazeLight(E, S, 1) - f32(S)), `${alt} m`).toBeLessThanOrEqual(2 ** -22);
      let last = Infinity;
      for (let T = 0; T <= 1; T += 1 / 64) {
        const h = hazeLight(E, S, T);
        expect(h, `${alt} m, T ${T}`).toBeLessThanOrEqual(last);
        last = h;
      }
    }
  });

  it('meets the sky at the horizon and is near the scene\'s sun straight down, from 30 km', () => {
    const { sm, my } = build(true);
    at(sm, 30e3);
    const u = my.earthMat.uniforms;
    const E = u.uSunIlluminance.value as number, S = u.uSceneSun.value as number;
    const limb = Math.asin(RG / (RG + 30e3)) * 180 / Math.PI;
    const light = (off: number): V => {
      const { o, dir } = view(30e3, off);
      const { T } = aerial(o, dir, RG, sunOver(o, dir, 35, 90), 10);
      return T.map((t) => hazeLight(E, S, t)) as V;
    };
    // measured, E 6.98 and S 3.3: (6.36, 6.90, 6.98) 0.02° inside the limb (under a pixel of the views), where
    // T is 0.17, 0.02 and 0.0003; (3.51, 3.76, 4.15) at nadir, where T is 0.94, 0.88, 0.77. Taken at E alone,
    // as the sky pass takes it, the haze's light would be 6.98 in every channel at both
    const horizon = light(limb - 0.02), down = light(0);
    for (let c = 0; c < 3; c++) {
      expect(horizon[c] / E, `horizon, channel ${c}`).toBeGreaterThan(0.9);
      expect(down[c] / S, `nadir, channel ${c}`).toBeLessThan(1.3);
      expect(down[c]).toBeGreaterThan(S);
    }
    expect(horizon[2] / E).toBeGreaterThan(0.99);
    // from nadir to the horizon the haze's light rises without a step: the air's transmittance falls smoothly
    let prev = light(0);
    for (const off of [10, 30, 50, 65, 75, limb - 5, limb - 2, limb - 1, limb - 0.5, limb - 0.2, limb - 0.02]) {
      const cur = light(off);
      for (let c = 0; c < 3; c++) expect(cur[c], `${off}°, channel ${c}`).toBeGreaterThanOrEqual(prev[c]);
      prev = cur;
    }
  }, 30000);

  it('changes nothing in orbit: there the sky\'s illuminance is the scene\'s sun, so the haze is col·T + L·E bit for bit', () => {
    const { sm, my } = build(true);
    const u = my.earthMat.uniforms;
    for (const alt of [72e3, 100e3, 400e3, 35786e3]) {
      at(sm, alt);
      const E = u.uSunIlluminance.value as number, S = u.uSceneSun.value as number;
      expect(E, `${alt} m`).toBe(S);
      for (const T of [0, 1e-7, 0.016, 0.5, 0.77, 0.94, 1]) expect(hazeLight(E, S, T), `${alt} m, T ${T}`).toBe(f32(E));
    }
  });
});

// ------------------------------------------------------------------ sunlight through the air

const SUN_LINES = [
  'return sunlight(r, muS) / sunlight(r, 1.0);',
  'return texture2D(uSkyLight, vec2(0.5 + (muS * 0.5 + 0.5) * 63.0, 0.5 + (r - RG) / (RT - RG) * 15.0) / vec2(64.0, 16.0)).rgb;',
  'return (max(cosN, 0.0) * sunlight(r, muS) + skyLight(r, muS)) / (sunlight(r, 1.0) + skyLight(r, 1.0));',
];
const EARTH_SUN = 'if (uAerial > 0.5) col = day * (0.09 + 0.95 * daylight(RG, cosSun, cosSunGeo));';
const EARTH_GLINT = ['vec3 glint = vec3(s * 0.9, s * 0.95, s);', 'if (uAerial > 0.5) glint *= sunColour(RG, cosSunGeo);', 'col += glint;'];
const CLOUD_SUN = 'gl_FragColor.rgb = aerialPerspective(gl_FragColor.rgb * sunColour(RG + 9000.0, dot(upW, sunDir)), uAerialCam, dirW, RG + 9000.0, sunDir);';
/** `sunColour`, the table read exactly */
function sunColour(r: number, muS: number): V {
  const s = sunlight(r, muS), noon = sunlight(r, 1);
  return [0, 1, 2].map((k) => s[k] / noon[k]) as V;
}

describe('sunlight through the air on the ground and the cloud tops', () => {
  it('stands in the globe\'s and the clouds\' shaders, under the scattering sky only', () => {
    const { sm, my } = build(true);
    const frag = my.earthMat.fragmentShader;
    for (const line of [...SUN_LINES, EARTH_SUN, ...EARTH_GLINT]) expect(frag, line).toContain(line);
    // the gradient sky's lines are kept as they were, and the patch only replaces them under uAerial
    expect(frag).toContain('vec3 col = day * (0.09 + 0.95 * max(cosSun, 0.0));');
    expect(frag.indexOf(EARTH_GLINT[1])).toBe(frag.indexOf(EARTH_GLINT[0]) + EARTH_GLINT[0].length + 1);
    const shader = { uniforms: {} as Record<string, THREE.IUniform>, fragmentShader: THREE.ShaderLib.lambert.fragmentShader, vertexShader: '' };
    (sm.cloudMesh!.material as THREE.Material).onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
    expect(shader.fragmentShader).toContain(CLOUD_SUN);
  });

  it('leaves noon as it was drawn, reddens a low sun and leaves a set one dark', () => {
    for (const h of [0, 9000]) {
      const noon = sunColour(RG + h, 1);
      // the same table read overhead: exactly 1
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

// ------------------------------------------------------------------ the sky's light on a level surface

const SKYLIGHT_LINES = [
  'float muS = (vUv.x * 64.0 - 0.5) / 63.0 * 2.0 - 1.0;',
  'float r = RG + (vUv.y * 16.0 - 0.5) / 15.0 * (RT - RG);',
  'vec3 sunDir = vec3(sqrt(max(0.0, 1.0 - muS * muS)), 0.0, muS);',
  'const int SQ = 8, N = 16;',
  'float u = (float(a) + 0.5) / float(SQ), st = sqrt(u), ph = PI * (float(b) + 0.5) / float(SQ);',
  'vec3 dir = vec3(st * cos(ph), st * sin(ph), sqrt(1.0 - u));',
  'float d = max(toSphere(r, dir.z, RT), 0.0);',
  'float c = dot(dir, sunDir), pr = rayleighPhase(c), pm = miePhase(c);',
  'float x = float(i + 1) / float(N), sb = x * x * d, dt = sb - sa;',
  'vec3 p = vec3(0.0, 0.0, r) + dir * (0.5 * (sa + sb));',
  'float rp = length(p), mu = dot(p, sunDir) / rp;',
  'vec3 S = (m.scatR * pr + vec3(m.scatM * pm)) * sunlight(rp, mu) + (m.scatR + vec3(m.scatM)) * multiScatter(rp, mu);',
  'E += T * S * (vec3(1.0) - stepT) / max(m.ext, vec3(1e-12));',
  'E *= PI / float(SQ * SQ);',
];

// The tables the passes read, in float64 and read bilinearly as the GPU reads them: the transmittance
// (here 512 x 128, finer than the GPU's 256 x 64) and MULTISCATTER_FRAG's 32 x 32, ported line by line.
const H_TOP = Math.sqrt((RT - RG) * (RT + RG));
function bilerp(tab: V[], w: number, h: number, u: number, v: number): V {
  const x = Math.min(w - 1, Math.max(0, u * w - 0.5)), y = Math.min(h - 1, Math.max(0, v * h - 0.5));
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), fx = x - x0, fy = y - y0;
  const a = tab[y0 * w + x0], b = tab[y0 * w + x1], c = tab[y1 * w + x0], d = tab[y1 * w + x1];
  return [0, 1, 2].map((k) => (a[k] * (1 - fx) + b[k] * fx) * (1 - fy) + (c[k] * (1 - fx) + d[k] * fx) * fy) as V;
}
let transTab: V[] | null = null;
function transmittanceT(r: number, mu: number): V {
  if (!transTab) {
    transTab = [];
    for (let j = 0; j < 128; j++) for (let i = 0; i < 512; i++) {
      const u = (i + 0.5) / 512, rho = H_TOP * (j + 0.5) / 128, rr = Math.sqrt(rho * rho + RG * RG);
      const dmin = RT - rr, dd = dmin + u * (rho + H_TOP - dmin);
      transTab.push(transmittance(rr, Math.min(1, Math.max(-1, (H_TOP * H_TOP - rho * rho - dd * dd) / (2 * rr * dd)))));
    }
  }
  const rho = Math.sqrt(Math.max(0, (r - RG) * (r + RG)));
  const dd = Math.max(0, -r * mu + Math.sqrt(Math.max(0, r * r * mu * mu + (RT - r) * (RT + r))));
  return bilerp(transTab, 512, 128, (dd - (RT - r)) / Math.max(rho + H_TOP - (RT - r), 1), rho / H_TOP);
}
function sunlightT(r: number, muS: number): V {
  const muH = -Math.sqrt(Math.max(0, (r - RG) * (r + RG)) / (r * r)), vis = smooth(muH - 0.004, muH + 0.004, muS);
  return vis === 0 ? [0, 0, 0] : transmittanceT(r, Math.max(muS, muH + 0.004)).map((x) => vis * x) as V;
}
const hitsGround = (r: number, mu: number) => mu < 0 && r * r * mu * mu + (RG - r) * (RG + r) >= 0;
function toSphere(r: number, mu: number, R: number): number {
  const disc = r * r * mu * mu + (R - r) * (R + r);
  if (disc < 0) return -1;
  const q = Math.sqrt(disc), d0 = -r * mu - q, d1 = -r * mu + q;
  return d0 > 0 ? d0 : (d1 > 0 ? d1 : -1);
}
let psiTab: V[] | null = null;
function multiScatter(r: number, muS: number): V {
  if (!psiTab) {
    psiTab = [];
    for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) {
      const mS = (i + 0.5) / 32 * 2 - 1, rr = RG + (j + 0.5) / 32 * (RT - RG), sun: V = [Math.sqrt(Math.max(0, 1 - mS * mS)), 0, mS];
      const L2: V = [0, 0, 0], fms: V = [0, 0, 0];
      for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) {
        const th = Math.PI * (a + 0.5) / 8, ph = Math.acos(1 - 2 * (b + 0.5) / 8);
        const dir: V = [Math.cos(th) * Math.sin(ph), Math.sin(th) * Math.sin(ph), Math.cos(ph)];
        const dG = hitsGround(rr, dir[2]) ? toSphere(rr, dir[2], RG) : -1, dd = dG > 0 ? dG : toSphere(rr, dir[2], RT);
        if (dd <= 0) continue;
        const T: V = [1, 1, 1], dt = dd / 20;
        for (let q = 0; q < 20; q++) {
          const t = (q + 0.5) * dt, p: V = [dir[0] * t, dir[1] * t, rr + dir[2] * t], rp = Math.hypot(...p), m = medium(rp - RG);
          const mu = dot(p, sun) / rp, Ts = hitsGround(rp, mu) ? [0, 0, 0] : transmittanceT(rp, mu);
          for (let k = 0; k < 3; k++) {
            const S = m.scatR[k] + m.scatM, stepT = Math.exp(-m.ext[k] * dt), integ = (1 - stepT) / Math.max(m.ext[k], 1e-12);
            L2[k] += T[k] * integ * S * Ts[k] / (4 * Math.PI);
            fms[k] += T[k] * integ * S;
            T[k] *= stepT;
          }
        }
        if (dG > 0) {
          const p = unit([dir[0] * dG, dir[1] * dG, rr + dir[2] * dG]), c = Math.max(0, dot(p, sun)), Tg = transmittanceT(RG + 1, c);
          for (let k = 0; k < 3; k++) L2[k] += T[k] * Tg[k] * c * 0.3 / Math.PI;
        }
      }
      psiTab.push([0, 1, 2].map((k) => (L2[k] / 64) / Math.max(1 - fms[k] / 64, 1e-3)) as V);
    }
  }
  return bilerp(psiTab, 32, 32, muS * 0.5 + 0.5, (r - RG) / (RT - RG));
}
/**
 * SKYLIGHT_FRAG's texel at radius r and sun cosine muS, with sq x sq directions and n steps (8 and 16 in the
 * shader); with many more, the fine integral it is checked against.
 */
function skyLight(r: number, muS: number, sq: number, n: number): V {
  const sun: V = [Math.sqrt(Math.max(0, 1 - muS * muS)), 0, muS], E: V = [0, 0, 0];
  for (let a = 0; a < sq; a++) for (let b = 0; b < sq; b++) {
    const u = (a + 0.5) / sq, st = Math.sqrt(u), ph = Math.PI * (b + 0.5) / sq;
    const dir: V = [st * Math.cos(ph), st * Math.sin(ph), Math.sqrt(1 - u)];
    const d = Math.max(toSphere(r, dir[2], RT), 0), c = dot(dir, sun), pr = rayleighPhase(c), pm = miePhase(c);
    const T: V = [1, 1, 1];
    let sa = 0;
    for (let i = 0; i < n; i++) {
      const x = (i + 1) / n, sb = x * x * d, dt = sb - sa, t = 0.5 * (sa + sb);
      sa = sb;
      const p: V = [dir[0] * t, dir[1] * t, r + dir[2] * t], rp = Math.hypot(...p), mu = dot(p, sun) / rp;
      const m = medium(rp - RG), Ts = sunlightT(rp, mu), ms = multiScatter(rp, mu);
      for (let k = 0; k < 3; k++) {
        const S = (m.scatR[k] * pr + m.scatM * pm) * Ts[k] + (m.scatR[k] + m.scatM) * ms[k], stepT = Math.exp(-m.ext[k] * dt);
        E[k] += T[k] * S * (1 - stepT) / Math.max(m.ext[k], 1e-12);
        T[k] *= stepT;
      }
    }
  }
  return E.map((x) => Math.PI * x / (sq * sq)) as V;
}
/** `daylight` on level ground (cosN = muS), the tables read as the GPU reads them */
function daylight(r: number, muS: number): V {
  const s = sunlightT(r, muS), sky = skyLight(r, muS, 8, 16), sn = sunlightT(r, 1), skyN = skyLight(r, 1, 8, 16);
  return [0, 1, 2].map((k) => (Math.max(muS, 0) * s[k] + sky[k]) / (sn[k] + skyN[k])) as V;
}
const ELEVATIONS = [90, 60, 40, 20, 10, 5, 2, 0, -2, -4];

describe('the sky\'s light on a level surface, which lights the ground with the sun', () => {
  it('is a table the scattering sky fills after the multiple scattering it reads, as replayed here', () => {
    gpu.frags.length = 0;
    const { sm } = build(true);
    at(sm, 400e3);
    const at8 = gpu.frags.findIndex((f) => f.includes('const int SQ = 8, N = 16;'));
    expect(at8).toBeGreaterThan(gpu.frags.findIndex((f) => f.includes('const int SQ = 8, N = 20;')));
    expect(gpu.frags.findIndex((f) => f.includes('const int SQ = 8, N = 20;'))).toBeGreaterThan(-1);
    for (const line of SKYLIGHT_LINES) expect(gpu.frags[at8], line).toContain(line);
  });

  it('matches a fine integral of the same model on the ground and at the cloud tops', () => {
    for (const h of [0, 9000]) {
      const r = RG + h, ref1 = skyLight(r, 1, 32, 200), sn = sunlightT(r, 1);
      let worst = 0;
      for (const el of ELEVATIONS) {
        const mu = Math.sin(el * Math.PI / 180), got = skyLight(r, mu, 8, 16), ref = skyLight(r, mu, 32, 200);
        // the error in the light on the ground, as a share of noon's (sun and sky)
        worst = Math.max(worst, ...[0, 1, 2].map((k) => Math.abs(got[k] - ref[k]) / (sn[k] + ref1[k])));
      }
      console.log(`sky light, ${h} m: worst error ${(100 * worst).toFixed(2)} % of noon's light`);
      // measured: 0.33 % on the ground, 0.21 % at 9 km
      expect(worst, `${h} m`).toBeLessThan(0.005);
    }
  }, 60000);

  it('keeps level ground as it was at noon, white under a middle sun, and dark once the twilight is over', () => {
    const white = (c: V): V => c.map((x) => 0.09 + 0.95 * x) as V;
    const noon = daylight(RG, 1);
    for (const c of noon) expect(c).toBeCloseTo(1, 12);
    const mu20 = Math.sin(20 * Math.PI / 180);
    const sunOnly = white(sunColour(RG, mu20).map((x) => x * mu20) as V), withSky = white(daylight(RG, mu20));
    console.log(`white ground, sun 20 deg up: sun only B/R ${(sunOnly[2] / sunOnly[0]).toFixed(3)}, with the sky ${(withSky[2] / withSky[0]).toFixed(3)}`);
    // measured: 0.749 with the sun alone, 0.889 with the sky
    expect(sunOnly[2] / sunOnly[0]).toBeLessThan(0.76);
    expect(withSky[2] / withSky[0]).toBeGreaterThan(0.88);
    // the twilight sky still lights the ground a little after sunset, and nothing does once it is over
    expect(Math.max(...daylight(RG, Math.sin(-2 * Math.PI / 180)))).toBeGreaterThan(0);
    expect(Math.max(...daylight(RG, Math.sin(-8 * Math.PI / 180)))).toBeLessThan(1e-3);
  }, 60000);
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
    // (measured: 0.36 m from 400 km, 1.44 m from 36 000 km)
    expect(worstAlt).toBeLessThan(alt > 1e6 ? 4 : 1);
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

const SKIP_LINE = 'if (tc > 0.0 && rp2 < (RG - 2.5e4) * (RG - 2.5e4)) tEnd = tStart;';
/** the sky pass's verdict, op by op in float32: true = the ray is not marched */
function skipped32(o: V, dir: V): boolean {
  const tc = -dot32(o, dir), pc = madd32(o, dir, tc), rp2 = dot32(pc, pc), k = add32(f(RG), -2.5e4);
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

  it('only where the globe\'s mesh covers the ray: the WGS-84 ellipsoid\'s facets lie under 25 km below the sphere', () => {
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
    // the drawn Earth is the WGS-84 ellipsoid (D-51): its pole is 21 385 m under the sphere, and the facets cut a little deeper
    expect(deepest).toBeGreaterThan(R_EARTH / 298.257223563);
    expect(deepest).toBeLessThan(25e3);
  });

  it.each([2, 30e3, 400e3, 36000e3])('marches every ray the globe may leave uncovered from %s m, in float32', (alt) => {
    const up = unit([0.37, -0.52, 0.769]), side = unit([up[1], -up[0], 0]);
    const o = up.map((u) => f(u * (RG + alt))) as V, r = RG + alt;
    const ray = (depth: number): V => {
      const sa = (RG - depth) / r, ca = Math.sqrt(1 - sa * sa);
      return unit([0, 1, 2].map((k) => -ca * up[k] + sa * side[k]) as V).map(f) as V;
    };
    // through the ellipsoid's pole and its facets' depth and a little past it: marched; well inside the disc: left to the globe
    for (const depth of [-50e3, -10, 10, 1000, 3000, 9000, 21.4e3, 22.3e3, 24e3]) expect(skipped32(o, ray(depth)), `${depth} m`).toBe(false);
    for (const depth of [26e3, 50e3, 1000e3]) expect(skipped32(o, ray(depth)), `${depth} m`).toBe(true);
  });
});
