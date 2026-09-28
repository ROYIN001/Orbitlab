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
 * never re-recorded after that commit: a difference is a change to a built-in
 * vehicle and fails here, whatever caused it.
 *
 * What the JSON pins and what it leaves out, on purpose:
 * - keys are sorted recursively, so key order is left out. It reaches no
 *   catalogue flight; it only shows in the bytes of a mission file that
 *   carries an inline custom copy of a spec (src/config/mission-file.ts);
 * - JSON prints each double in its shortest round-trip form, so values are
 *   pinned exactly: `256.4 * kN` is 256399.99999999997, not 256400;
 * - JSON cannot see an `undefined`-valued key (it drops it), nor tell −0 from
 *   0, nor print NaN or ±Infinity. The second test closes those gaps: the data
 *   holds none of them, and an emitter that filled an absent optional field
 *   with `undefined` would otherwise pass the snapshot unseen.
 */
import { describe, expect, it } from 'vitest';
import { VEHICLES } from '../src/data/vehicles';

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
  it('equal the pre-D01 literals, value for value', async () => {
    expect(VEHICLES).toHaveLength(21);
    await expect(`${JSON.stringify(sortKeys(VEHICLES), null, 1)}\n`).toMatchFileSnapshot('./fixtures/vehicles-pre-d01.json');
  });

  it('carry no undefined-valued key, and nothing else JSON would hide', () => {
    expect(jsonBlindSpots(VEHICLES, 'VEHICLES', [])).toEqual([]);
  });
});
