/**
 * What today's elliptic path of propagateKepler (src/physics/orbital.ts) returns, pinned bit for bit
 * (tests/fixtures/astro/kepler/today-elliptic.json, made by make_elliptic_pin.mjs there). It is what "elliptic results
 * identical to today's" is checked against when the e >= 1 fallback is replaced by keplerUniversal (PF-15). The file
 * is a file of its own because it must pass before src/astro/base/kepler.ts exists. The sines and cosines are V8's own,
 * the same on every machine for one Node version.
 */
import { expect, it } from 'vitest';
import pin from './fixtures/astro/kepler/today-elliptic.json';
import { propagateKepler } from '../src/physics/orbital';

const vec = (p: number[]) => ({ x: p[0], y: p[1], z: p[2] });

it("today's elliptic results, pinned", () => {
  expect(pin.cases).toHaveLength(204);
  for (const c of pin.cases) {
    const got = propagateKepler(vec(c.r), vec(c.v), c.dt);
    const want = [...c.r1, ...c.v1];
    [got.r.x, got.r.y, got.r.z, got.v.x, got.v.y, got.v.z].forEach((x, i) => expect(x, `${c.label}, number ${i}`).toBe(want[i]));
  }
});
