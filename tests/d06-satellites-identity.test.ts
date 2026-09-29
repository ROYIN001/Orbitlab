/**
 * Roadmap D06: the satellite classes as they were before the satellite
 * builder (Phase 4, docs/ROADMAP-PART2-3.md).
 *
 * `SATELLITES` (src/data/satellites.ts) feeds the launch physics: a class's
 * `mass`, `propulsion` and `size` become the spacecraft stage and the payload
 * the flight carries (src/physics/vehicle.ts, src/physics/simulation.ts), and
 * its ids reach mission files, validation and the MCP enum. The D06 templates
 * are a table of their own and must leave these entries as they are; built-in
 * flights must not change (Principle 7). No other test pins `SATELLITES`
 * itself: the D01 fingerprints fly only `cubesats`, and a change to `size`
 * shows only in the six-DOF fingerprints of the heavy suite, which CI does not
 * run.
 *
 * The fixture was written once, from `SATELLITES` as it stood at c5e2437,
 * before any Phase 4 work touched it, in the commit that added this file (by
 * a one-off Node script with the same `sortKeys` and the same
 * `JSON.stringify(…, null, 1)` as below). It is never re-recorded by the
 * builder's own work: a difference is a change to a built-in satellite class
 * and fails here, whatever caused it. So the test reads the fixture and
 * compares, exactly as tests/d01-vehicles-identity.test.ts does; it is not a
 * snapshot, and `vitest -u` cannot rewrite it.
 *
 * What the JSON pins and what it leaves out, on purpose (as in D01):
 * - keys are sorted recursively, so key order is left out of the fixture; the
 *   third test pins it anyway, by the SHA-256 of `JSON.stringify(SATELLITES)`
 *   unsorted, computed at c5e2437 by the same script;
 * - JSON prints each double in its shortest round-trip form, so values are
 *   pinned exactly;
 * - JSON cannot see an `undefined`-valued key, nor tell −0 from 0, nor print
 *   NaN or ±Infinity: the second test closes those gaps.
 */
import { describe, expect, it } from 'vitest';
import { SATELLITES } from '../src/data/satellites';
// as text, through Vite's `?raw` (tsconfig types only `vite/client`, no `node:fs`)
import FIXTURE from './fixtures/satellites-pre-d06.json?raw';

/** SHA-256 of `JSON.stringify(SATELLITES)`, unsorted, at c5e2437; 3 295 characters. */
const PRE_D06_UNSORTED_SHA256 = '00402ea837070a6d649aadcc23f2a7ea71bd028538f7d4e2c967385daa3bc2da';

const sortKeys = (v: unknown): unknown => (Array.isArray(v) ? v.map(sortKeys)
  : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]))
    : v);

/** Every own property that JSON would not show faithfully, by path. */
function jsonBlindSpots(v: unknown, path: string, out: string[]): string[] {
  if (v === undefined) out.push(`${path} is undefined`);
  else if (typeof v === 'number' && !Number.isFinite(v)) out.push(`${path} is ${v}`);
  else if (Object.is(v, -0)) out.push(`${path} is -0`);
  else if (typeof v === 'function' || typeof v === 'symbol' || typeof v === 'bigint') out.push(`${path} is a ${typeof v}`);
  else if (Array.isArray(v)) v.forEach((x, i) => jsonBlindSpots(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') {
    for (const k of Reflect.ownKeys(v)) {
      if (typeof k === 'symbol') { out.push(`${path} has a symbol key`); continue; }
      jsonBlindSpots((v as Record<string, unknown>)[k], `${path}.${k}`, out);
    }
  }
  return out;
}

describe('D06: the satellite classes, recorded before the satellite builder', () => {
  it('equal the pre-D06 entries, value for value', () => {
    expect(SATELLITES).toHaveLength(11);
    // read and compared, never written: a mismatch fails, even under `vitest -u`
    expect(`${JSON.stringify(sortKeys(SATELLITES), null, 1)}\n`).toBe(FIXTURE);
  });

  it('carry no undefined-valued key, and nothing else JSON would hide', () => {
    expect(jsonBlindSpots(SATELLITES, 'SATELLITES', [])).toEqual([]);
  });

  it('keep the pre-D06 key order too', async () => {
    const unsorted = JSON.stringify(SATELLITES);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(unsorted));
    const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    expect([unsorted.length, hex]).toEqual([3295, PRE_D06_UNSORTED_SHA256]);
  });
});
