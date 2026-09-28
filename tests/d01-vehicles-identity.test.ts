/**
 * Roadmap D01: the fleet's specs as they were before the parts catalogue.
 *
 * The catalogue (src/data/parts.ts) sits upstream of `VehicleSpec`: the 21
 * catalogue vehicles are re-expressed on it, and what they emit must be the
 * very specs the pre-D01 literals were. The physics only ever sees a spec, and
 * it is deterministic, so value-identical specs mean bit-identical flights;
 * tests/d01-fleet-fingerprint.test.ts flies them to prove it.
 *
 * The fixture was written once, from `VEHICLES` as it stood before
 * src/data/vehicles.ts was touched, in the commit that added this file. It is
 * never re-recorded by the catalogue's own work: a difference is a change to a
 * built-in vehicle and fails here, whatever caused it. So the test reads the
 * fixture and compares; it is not a snapshot, and `vitest -u` (which the repo
 * uses to rewrite src/lessons/assessment/flights.json) cannot rewrite it.
 *
 * Re-recorded once, for a change to the data made on purpose elsewhere: main's
 * F11 (2026-09-28, docs/VALIDATION.md) gave Falcon Heavy's side boosters and
 * core Falcon 9 Block 5's published first-stage masses and a max-Q bucket. The
 * fixture and the key-order hash were then written from main's own literal
 * `VEHICLES` (its src/data/vehicles.ts at 3d713b5, before the catalogue), not
 * from the catalogue, so this test still proves the catalogue emits exactly
 * the fleet main flies. Only Falcon Heavy changed.
 *
 * What the JSON pins and what it leaves out, on purpose:
 * - keys are sorted recursively, so key order is left out of the fixture. It
 *   reaches no catalogue flight; it only shows in the bytes of a mission file
 *   that carries an inline custom copy of a spec (src/config/mission-file.ts).
 *   The third test pins it anyway, by the SHA-256 of `JSON.stringify(VEHICLES)`
 *   unsorted, computed from eedd035's `VEHICLES` (the pre-D01 HEAD) in the D01
 *   review;
 * - JSON prints each double in its shortest round-trip form, so values are
 *   pinned exactly: `256.4 * kN` is 256399.99999999997, not 256400;
 * - JSON cannot see an `undefined`-valued key (it drops it), nor tell −0 from
 *   0, nor print NaN or ±Infinity. The second test closes those gaps: the data
 *   holds none of them, and an emitter that filled an absent optional field
 *   with `undefined` would otherwise pass the snapshot unseen.
 */
import { describe, expect, it } from 'vitest';
import { VEHICLES } from '../src/data/vehicles';
// as text, through Vite's `?raw` (tsconfig types only `vite/client`, no `node:fs`)
import FIXTURE from './fixtures/vehicles-pre-d01.json?raw';

/**
 * SHA-256 of `JSON.stringify(VEHICLES)`, unsorted, from main's literal fleet at
 * 3d713b5 (F11 included); 30 987 characters. At eedd035, the pre-D01 HEAD, it
 * was f891238e…, 30 926 characters.
 */
const PRE_D01_UNSORTED_SHA256 = '420d7d170991740362d985e602da126d94c4efb4187ac167a102be108c93f420';

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

describe('D01: the catalogue vehicles, recorded before the parts catalogue', () => {
  it('equal the pre-D01 literals, value for value', () => {
    expect(VEHICLES).toHaveLength(21);
    // read and compared, never written: a mismatch fails, even under `vitest -u`
    expect(`${JSON.stringify(sortKeys(VEHICLES), null, 1)}\n`).toBe(FIXTURE);
  });

  it('carry no undefined-valued key, and nothing else JSON would hide', () => {
    expect(jsonBlindSpots(VEHICLES, 'VEHICLES', [])).toEqual([]);
  });

  it('keep the pre-D01 key order too', async () => {
    const unsorted = JSON.stringify(VEHICLES);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(unsorted));
    const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    expect([unsorted.length, hex]).toEqual([30987, PRE_D01_UNSORTED_SHA256]);
  });
});
