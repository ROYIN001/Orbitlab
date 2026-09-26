/**
 * Drawing a placement test from the bank (roadmap E03). Every draw follows the
 * same blueprint — the same number of questions from each area at each level
 * of difficulty — so two students (or one student before and after the
 * lessons) sit tests of the same shape with different questions. The seed
 * decides everything: which questions, the order of their options and the
 * numbers in the calculations, so a test can be re-created from its seed.
 */
import { DOMAINS, type Domain } from '../types';
import type { AssessmentKind, Level, PreparedQuestion, Question } from './types';

/** How many questions of each level each area gets: 4 × 5 areas + 5 for the basics = 25. */
export const BLUEPRINT: Readonly<Record<Domain, readonly Level[]>> = {
  1: [1, 1, 2, 2, 3],
  2: [1, 2, 2, 3],
  3: [1, 2, 2, 3],
  4: [1, 2, 2, 3],
  5: [1, 2, 2, 3],
  6: [1, 2, 2, 3],
};
/** The order the areas are asked in: the basics first, then the lessons' own order (area 2 is track 1's). */
export const DOMAIN_ORDER: readonly Domain[] = [1, 2, 3, 4, 5, 6];
export const TEST_LENGTH = DOMAINS.reduce((n, d) => n + BLUEPRINT[d].length, 0);

/** A small, fast, seedable generator (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const pick = <T>(items: readonly T[], random: () => number): T => items[Math.floor(random() * items.length)];

/** Round a drawn value onto its step, without binary noise. */
function onStep(value: number, step: number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  return Number((Math.round(value / step) * step).toFixed(decimals));
}

/** A question as one student sees it. */
export function prepareQuestion(q: Question, random: () => number): PreparedQuestion {
  switch (q.type) {
    case 'choice':
      return { id: q.id, order: q.fixedOrder ? q.options.map((_, i) => i) : shuffle(q.options.map((_, i) => i), random) };
    case 'numeric': {
      const values: Record<string, number> = {};
      for (const p of q.params) {
        const steps = Math.round((p.max - p.min) / p.step);
        values[p.name] = onStep(p.min + Math.floor(random() * (steps + 1)) * p.step, p.step);
      }
      return { id: q.id, values };
    }
    case 'vehicle': {
      const vehicle = pick(q.vehicles, random);
      const others = shuffle(q.vehicles.filter((v) => v !== vehicle), random).slice(0, 3);
      return { id: q.id, vehicle, vehicleOptions: shuffle([vehicle, ...others], random) };
    }
  }
}

/**
 * Draw a test. `exclude`: questions already asked (a post-test leaves out the
 * placement test's); a slot with nothing left falls back to them, then to the
 * nearest level, so a small bank still yields a full test.
 */
export function drawTest(bank: readonly Question[], seed: number, exclude: ReadonlySet<string> = new Set()): PreparedQuestion[] {
  const random = rng(seed);
  const chosen: Question[] = [];
  for (const domain of DOMAIN_ORDER) {
    const skills = new Set<string>();
    for (const level of BLUEPRINT[domain]) {
      const taken = (q: Question): boolean => chosen.includes(q);
      const tiers: Array<(q: Question) => boolean> = [
        (q) => q.level === level && !exclude.has(q.id) && !skills.has(q.skill),
        (q) => q.level === level && !exclude.has(q.id),
        (q) => q.level === level,
        (q) => Math.abs(q.level - level) === 1 && !exclude.has(q.id),
        () => true,
      ];
      let pool: Question[] = [];
      for (const tier of tiers) {
        pool = bank.filter((q) => q.domain === domain && !taken(q) && tier(q));
        if (pool.length) break;
      }
      if (!pool.length) continue;
      const q = pick(pool, random);
      chosen.push(q);
      skills.add(q.skill);
    }
  }
  return chosen.map((q) => prepareQuestion(q, random));
}

/** The kind of the next test: a placement test first, a post-test after. */
export function nextKind(done: readonly { kind: AssessmentKind; finishedAt?: string }[]): AssessmentKind {
  return done.some((a) => a.kind === 'pre' && a.finishedAt) ? 'post' : 'pre';
}
