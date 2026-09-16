/**
 * Deterministic hash / value-noise helpers.
 *
 * Every animated "random" quantity in the renderer (plume flicker, smoke puff
 * direction, debris tumble rate, camera shake) is derived from these functions
 * seeded with the mission time from the `VisualFrame` and a constant per-object
 * seed. Nothing in `src/render` may call `Math.random` for animation, otherwise
 * a replayed flight would not look identical to the live run.
 */

/** Hash a single float into 0..1. */
export function hash11(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453123;
  return s - Math.floor(s);
}

/** Hash two floats into 0..1. */
export function hash21(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** Hash a float into -1..1. */
export function hash11s(n: number): number {
  return hash11(n) * 2 - 1;
}

/** Smooth 1-D value noise in 0..1 with period-free continuous interpolation. */
export function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash11(i) * (1 - u) + hash11(i + 1) * u;
}

/** Fractal value noise in 0..1. */
export function fbm1(x: number, octaves = 3): number {
  let a = 0.5;
  let sum = 0;
  let norm = 0;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += a * noise1(x * f + i * 17.3);
    norm += a;
    a *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

/** Signed fractal noise in -1..1. */
export function fbm1s(x: number, octaves = 3): number {
  return fbm1(x, octaves) * 2 - 1;
}

/** 2-D smooth value noise in 0..1 (used for terrain displacement). */
export function noise2(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash21(ix, iy);
  const b = hash21(ix + 1, iy);
  const c = hash21(ix, iy + 1);
  const d = hash21(ix + 1, iy + 1);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

/** 2-D fractal noise in 0..1. */
export function fbm2(x: number, y: number, octaves = 4): number {
  let a = 0.5, sum = 0, norm = 0, f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += a * noise2(x * f + i * 5.7, y * f - i * 3.1);
    norm += a;
    a *= 0.5;
    f *= 2.07;
  }
  return sum / norm;
}

/** Turn a string into a stable numeric seed. */
export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** Frame-rate independent exponential smoothing (critically damped approach). */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return target + (current - target) * Math.exp(-lambda * dt);
}

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1e-9));
  return t * t * (3 - 2 * t);
}
