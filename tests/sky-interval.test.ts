/**
 * The physical sky's view-ray interval and sample placement (V02), replayed in
 * float32 on the CPU. Source-level: the GLSL lines below must stand in the
 * sky pass as written, and the replay follows them op by op (no FMA), so a
 * change to either side shows here. No WebGL pixel claims.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PhysicalSky, ATMOSPHERE_HEIGHT } from '../src/render/atmosphere';
import { R_EARTH } from '../src/physics/constants';

const SHADER_LINES = [
  'float r = max(length(o), RG + 1.0);',
  'float tc = -dot(o, dir);',
  'vec3 pc = o + dir * tc;',
  'float rp2 = dot(pc, pc);',
  'float h = sqrt(max(0.0, RT * RT - rp2));',
  'float tStart = max(0.0, tc - h), tEnd = tc + h;',
  'if (tc > 0.0 && rp2 < RG * RG) tEnd = tc - sqrt(RG * RG - rp2);',
  'float len = tEnd - tStart;',
  'float tLow = r > RT ? clamp(tc, tStart, tEnd) : tStart;',
  'float f = (tLow - tStart) / len;',
  'float kA = len / max(f, 1e-6), kB = len / max(1.0 - f, 1e-6);',
  'float sa = tStart - tLow;',
  'float x = float(i + 1) / float(N) - f;',
  'float sb = x * abs(x) * (x < 0.0 ? kA : kB);',
];

const f32 = Math.fround;
const RG = f32(R_EARTH), RT = f32(R_EARTH + ATMOSPHERE_HEIGHT);
type V = [number, number, number];
const add = (a: number, b: number) => f32(a + b), mul = (a: number, b: number) => f32(a * b);
const dot = (a: V, b: V) => add(add(mul(a[0], b[0]), mul(a[1], b[1])), mul(a[2], b[2]));
const madd = (o: V, d: V, t: number): V => [add(o[0], mul(d[0], t)), add(o[1], mul(d[1], t)), add(o[2], mul(d[2], t))];

/** The shader's [tStart, tEnd] and the 24 sample offsets from tLow, in float32. */
function march(o: V, dir: V): { tStart: number; tEnd: number; tLow: number; offsets: number[] } {
  const r = Math.max(f32(Math.sqrt(dot(o, o))), add(RG, 1));
  const tc = -dot(o, dir);
  const pc = madd(o, dir, tc);
  const rp2 = dot(pc, pc);
  const h = f32(Math.sqrt(Math.max(0, add(mul(RT, RT), -rp2))));
  const tStart = Math.max(0, add(tc, -h));
  let tEnd = add(tc, h);
  if (tc > 0 && rp2 < mul(RG, RG)) tEnd = add(tc, -f32(Math.sqrt(add(mul(RG, RG), -rp2))));
  const offsets: number[] = [];
  if (!(tEnd > tStart)) return { tStart, tEnd, tLow: tStart, offsets };
  const len = add(tEnd, -tStart);
  const tLow = r > RT ? Math.min(tEnd, Math.max(tStart, tc)) : tStart;
  const f = f32(add(tLow, -tStart) / len);
  const kA = f32(len / Math.max(f, 1e-6)), kB = f32(len / Math.max(add(1, -f), 1e-6));
  offsets.push(add(tStart, -tLow));
  for (let i = 0; i < 24; i++) {
    const x = add(f32((i + 1) / 24), -f);
    offsets.push(mul(mul(x, Math.abs(x)), x < 0 ? kA : kB));
  }
  return { tStart, tEnd, tLow, offsets };
}

/** float64 reference of the ray's stretch of atmosphere: [tStart, tEnd] and its perigee altitude. */
function reference(o: V, dir: V): { tStart: number; tEnd: number; perigee: number; ground: boolean } {
  const a = dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2;
  const tc = -(o[0] * dir[0] + o[1] * dir[1] + o[2] * dir[2]) / a;
  const rp = Math.hypot(o[0] + dir[0] * tc, o[1] + dir[1] * tc, o[2] + dir[2] * tc);
  const Rt = R_EARTH + ATMOSPHERE_HEIGHT, h = Math.sqrt(Math.max(0, (Rt - rp) * (Rt + rp) / a));
  const ground = tc > 0 && rp < R_EARTH;
  const tEnd = ground ? tc - Math.sqrt((R_EARTH - rp) * (R_EARTH + rp) / a) : tc + h;
  return { tStart: Math.max(0, tc - h), tEnd, perigee: rp - R_EARTH, ground };
}

const unit = (v: V): V => { const n = Math.hypot(...v); return [v[0] / n, v[1] / n, v[2] / n]; };
const UP = unit([0.37, -0.52, 0.769]);
const SIDE = unit([UP[1] * 0.1 - UP[2] * 0.9, UP[2] * 0.2 - UP[0] * 0.1, UP[0] * 0.9 - UP[1] * 0.2]);
const camera = (alt: number): V => UP.map((u) => f32(u * (R_EARTH + alt))) as V;
/** a float32 ray th from the nadir towards SIDE */
const ray = (th: number): V => UP.map((u, i) => f32(-Math.cos(th) * u + Math.sin(th) * SIDE[i])) as V;

describe('physical sky: the view ray through the atmosphere (V02)', () => {
  it('stands in the sky pass as replayed here', () => {
    const sky = new PhysicalSky({} as THREE.WebGLRenderer);
    const frag = (sky.mesh.material as THREE.ShaderMaterial).fragmentShader;
    for (const line of SHADER_LINES) expect(frag, line).toContain(line);
    sky.dispose();
  });

  it.each([400e3, 36000e3, 400000e3])('leaves no ray through the visible limb empty from %s m', (alt) => {
    // the black ring: re-projecting the entry point cut short 3 % of these rays from 400 km and 88 % from 400 000 km
    const o = camera(alt), r = R_EARTH + alt;
    const thG = Math.asin(R_EARTH / r), thT = Math.asin((R_EARTH + ATMOSPHERE_HEIGHT) / r);
    let checked = 0;
    for (let i = 0; i < 4000; i++) {
      const dir = ray(thG + ((thT - thG) * (i + 0.5)) / 4000);
      const ref = reference(o, dir);
      if (ref.ground || ref.perigee > 60e3 || ref.perigee < 100) continue;
      const m = march(o, dir);
      expect(m.tEnd - m.tStart).toBeGreaterThan(0.99 * (ref.tEnd - ref.tStart));
      checked++;
    }
    expect(checked).toBeGreaterThan(2000);
  });

  it.each([2, 30e3])('fills the whole sky from %s m above the ground', (alt) => {
    // a perigee clamped to the camera emptied every ray more than ~10° above the pad's horizon
    const o = camera(alt);
    for (let i = 0; i < 2000; i++) {
      const dir = ray(Math.PI / 2 + ((Math.PI / 2) * (i + 0.5)) / 2000);
      const ref = reference(o, dir), m = march(o, dir);
      expect(m.tStart).toBe(0);
      expect(Math.abs(m.tEnd - ref.tEnd)).toBeLessThan(10);
    }
  });

  it('crowds the samples at the lowest point from orbit and at the camera from the pad', () => {
    const steps = (offsets: number[]) => offsets.slice(1).map((s, i) => s - offsets[i]);
    const finest = (offsets: number[]) => { const d = steps(offsets); return d.indexOf(Math.min(...d)); };
    // through the limb from 400 km: the finest steps either side of the perigee, the 24 tiling the chord
    const o = camera(400e3);
    const limb = ray(Math.asin((R_EARTH + 10e3) / (R_EARTH + 400e3)));
    const m = march(o, limb), ref = reference(o, limb);
    expect(m.offsets[0] + m.tLow).toBeCloseTo(m.tStart, -1);
    expect(m.offsets[24] + m.tLow).toBeCloseTo(m.tEnd, -1);
    expect(Math.abs(m.tLow - ref.tStart - (ref.tEnd - ref.tStart) / 2)).toBeLessThan(10);
    expect([11, 12]).toContain(finest(m.offsets));
    // straight down from 400 km: the finest step ends on the ground
    expect(finest(march(o, ray(0)).offsets)).toBe(23);
    // straight up from the pad: the finest step starts at the camera, u² as on any view from the air
    const pad = march(camera(2), ray(Math.PI));
    expect(finest(pad.offsets)).toBe(0);
    expect(pad.offsets[1] / pad.offsets[24]).toBeCloseTo(1 / 576, 6);
  });
});
