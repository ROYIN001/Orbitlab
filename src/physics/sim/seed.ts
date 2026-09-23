/** Deterministic seeding: physics never calls Math.random. */

/** 32-bit mixing of the launch epoch (ms) and the vehicle id into a PRNG seed. */
export function hashSeed(epochMs: number, ...parts: string[]): number {
  let h = Math.imul(epochMs >>> 0, 2654435761) ^ Math.imul(Math.floor(epochMs / 4294967296), 40503);
  for (const p of parts) {
    for (let i = 0; i < p.length; i++) h = (Math.imul(h ^ p.charCodeAt(i), 16777619) >>> 0);
  }
  return h >>> 0;
}

/** Mulberry32: small, fast, deterministic PRNG (replaces Math.random in physics). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
