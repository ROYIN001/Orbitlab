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
 * And a second time, for F14 (2026-09-28, docs/VALIDATION.md): Proton-M's
 * published first- and second-stage propellant loads, and Proton-M's and
 * Angara-A5's fairing jettison rule (`fairing.sepAfterIgnition`), and
 * Angara-A5's six-DOF kick (`guidanceDefaultsSixDof`). Written the
 * same way, from the literal `VEHICLES` of the branch that made the change
 * (its src/data/vehicles.ts at c2aabb4, 3d713b5 plus F14, before it met the
 * catalogue, with the kick added); the catalogue after the merge emits it
 * byte for byte. Only Proton-M and Angara-A5 changed.
 *
 * Re-recorded a third time, for audit PHY-01 (2026-10-01, docs/VALIDATION.md
 * §3, "Soyuz-2.1a's strap-ons fly a zero-lift turn"): Soyuz-2.1a's six-DOF
 * programme takes a 6° kick (was 4°) and `closedLoopStart: 140`. Only those two
 * values of `soyuz21a.guidanceDefaultsSixDof` changed; the fixture's diff is
 * those lines, and the unsorted string grew from 30 987 to 31 009 characters.
 *
 * A fourth, for Soyuz-2 on its real flight (2026-10-01,
 * docs/VALIDATION.md §3, "Soyuz-2.1a flies its stored pitch programme"): the
 * RD-107A and RD-108A take Arianespace's figures and the strap-on and core
 * bodies their published loads; the strap-ons get their thrust step and
 * commanded cut-off and a 0.4 s separation delay, the cores `cutoffAt`, both
 * vehicles `padBurnS` and a stored `pitchProgram`, Blok I an aft skirt, and
 * Soyuz-2.1a's fairing its crewed mass and T+153.3 s. Only `soyuz21a` and
 * `soyuz21b` changed; the unsorted string grew to 31 994 characters.
 *
 * And a fifth, for Soyuz-2's hot staging and its two payload sections
 * (2026-10-01, docs/VALIDATION.md §3, "Soyuz-2.1a: hot staging, and a crewed
 * and a cargo flight"): Blok I's `hotStage` lead and 1.02 s separation delay,
 * the cores' `cutoffAt` from the 2.1a cyclogram, the skirts' times from
 * Blok I's ignition, Soyuz-2.1a's cargo fairing (11S517A2, 3.0 m) and
 * cyclogram with a `crewedProfile` (11S517A3) and a `cargoShipProfile`
 * (Progress MS's programme), the refitted crewed programme, and Soyuz-2.1b's
 * fairing at Arianespace's T+208.4 s. Only `soyuz21a` and `soyuz21b` changed;
 * 32 724 characters before it met main's F14, 32 830 with it.
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
 * SHA-256 of `JSON.stringify(VEHICLES)`, unsorted, with Soyuz-2's hot staging
 * and payload sections and F14 (Proton-M's published loads, Proton-M's and
 * Angara-A5's fairing rule, Angara-A5's kick); 32 830 characters. Without F14
 * it was fcc33cb8…, 32 724 characters; main with F14 alone 2793a05e…, 31 119;
 * with Soyuz-2 on its real flight 0b6d8d1b…,
 * 31 994 characters; with Soyuz-2.1a's PHY-01 programme
 * 04d88a36…, 31 009 characters; from main's literal fleet at 3d713b5 (F11
 * included) 420d7d17…, 30 987 characters; at eedd035, the pre-D01 HEAD,
 * f891238e…, 30 926 characters.
 */
const PRE_D01_UNSORTED_SHA256 = '08ff49794f9601fbb3548bd97b1aa63274cbd3b50796dead2d67550b911b3130';

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
    expect([unsorted.length, hex]).toEqual([32830, PRE_D01_UNSORTED_SHA256]);
  });
});
