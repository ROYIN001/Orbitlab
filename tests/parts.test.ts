/**
 * Roadmap D01: the parts catalogue (src/data/parts.ts).
 *
 * The decisive checks live elsewhere: tests/d01-vehicles-identity.test.ts
 * holds the emitted fleet to the specs recorded before the catalogue, value
 * for value, and tests/d01-fleet-fingerprint.test.ts flies them. This file
 * holds the catalogue to itself and to the tables that are still keyed by
 * stage id.
 *
 * Usage is found by value, not by asking the catalogue: every stage, strap-on
 * group and fairing of every vehicle must be emitted, hardware field for
 * hardware field, by exactly one part. That proves the fleet is expressible on
 * the catalogue and that no two parts are duplicates, independently of how
 * src/data/vehicles.ts names them.
 *
 * Every comparison here is exact (`toEqual`, `toBe`): the catalogue is data,
 * and nothing in it is computed.
 */
import { describe, expect, it } from 'vitest';
import {
  BOOSTER_BODIES, ENGINE_PARTS, FAIRING_PARTS, STAGE_BODIES, boosterSpec, enginePart, engineSpec, fairingSpec, stageSpec,
  type BoosterBodyPart, type EnginePart, type FairingPart, type StageBodyPart,
} from '../src/data/parts';
import { VEHICLES } from '../src/data/vehicles';
import { PROPELLANT_LOADS } from '../src/physics/rigid/vehicle-data';
import { vehicleSpecProblems } from '../src/config/vehicle-spec';
import { copyOf } from './custom-vehicle-harness';

/** Deep equality of plain data: same own keys (in any order), values `Object.is` at the leaves. */
function isDeepStrictEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length
    && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && isDeepStrictEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}
const pick = (o: object, keys: readonly string[]): Record<string, unknown> =>
  Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, (o as Record<string, unknown>)[k]]));
const STAGE_HARDWARE = ['id', 'name', 'dryMass', 'propellantMass', 'engine', 'diameter', 'length'] as const;
const BOOSTER_HARDWARE = ['id', 'name', 'dryMass', 'propellantMass', 'engine', 'diameter', 'length'] as const;
const FAIRING_HARDWARE = ['mass', 'diameter', 'length', 'adapter'] as const;

/** Which parts each vehicle is built from, found by matching the emitted hardware fields. */
function usage() {
  const stages = new Map<StageBodyPart, Set<string>>();
  const boosters = new Map<BoosterBodyPart, Set<string>>();
  const fairings = new Map<FairingPart, Set<string>>();
  const unmatched: string[] = [];
  const note = <T>(map: Map<T, Set<string>>, part: T, vehicle: string) => {
    if (!map.has(part)) map.set(part, new Set());
    map.get(part)!.add(vehicle);
  };
  for (const v of VEHICLES) {
    v.stages.forEach((stage, i) => {
      const want = pick(stage, STAGE_HARDWARE);
      const hits = STAGE_BODIES.filter((b) => isDeepStrictEqual(pick(stageSpec(b), STAGE_HARDWARE), want));
      if (hits.length !== 1) unmatched.push(`${v.id} stage ${i} (${stage.id}): ${hits.length} bodies`);
      else note(stages, hits[0], v.id);
      (stage.boosters ?? []).forEach((group, g) => {
        const wantB = pick(group, BOOSTER_HARDWARE);
        const hitsB = BOOSTER_BODIES.filter((b) => isDeepStrictEqual(pick(boosterSpec(b, group.count), BOOSTER_HARDWARE), wantB));
        if (hitsB.length !== 1) unmatched.push(`${v.id} stage ${i} group ${g} (${group.id}): ${hitsB.length} bodies`);
        else note(boosters, hitsB[0], v.id);
      });
    });
    if (v.fairing) {
      const wantF = pick(v.fairing, FAIRING_HARDWARE);
      const hitsF = FAIRING_PARTS.filter((f) => isDeepStrictEqual(pick(fairingSpec(f, { sepAltitude: 0 }), FAIRING_HARDWARE), wantF));
      if (hitsF.length !== 1) unmatched.push(`${v.id} fairing: ${hitsF.length} parts`);
      else note(fairings, hitsF[0], v.id);
    }
  }
  const engines = new Map<EnginePart, Set<string>>();
  for (const [body, vehicles] of [...stages, ...boosters]) {
    for (const vehicle of vehicles) note(engines, enginePart(body.engine.part), vehicle);
  }
  return { stages, boosters, fairings, engines, unmatched };
}
const USE = usage();

/** Every own property whose value is undefined, by path. */
function undefinedKeys(v: unknown, path: string, out: string[] = []): string[] {
  if (Array.isArray(v)) v.forEach((x, i) => undefinedKeys(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (x === undefined) out.push(`${path}.${k}`);
      else undefinedKeys(x, `${path}.${k}`, out);
    }
  }
  return out;
}

describe('D01 parts catalogue: the fleet is built from it', () => {
  it('holds 55 engine parts, 50 stage bodies, 14 strap-on bodies and 17 fairings for the 21 vehicles', () => {
    // The roadmap's D01 row and plan.item.D01 quote 55 engines and 21 vehicles.
    expect([VEHICLES.length, ENGINE_PARTS.length, STAGE_BODIES.length, BOOSTER_BODIES.length, FAIRING_PARTS.length]).toEqual([21, 55, 50, 14, 17]);
  });

  it('emits every stage, strap-on group and fairing of the fleet from exactly one part', () => {
    expect(USE.unmatched).toEqual([]);
  });

  it('uses every part in some vehicle', () => {
    const unused = (list: readonly { id: string }[], used: Map<unknown, unknown>) => list.filter((p) => !used.has(p)).map((p) => p.id);
    expect({
      engines: unused(ENGINE_PARTS, USE.engines), stages: unused(STAGE_BODIES, USE.stages),
      boosters: unused(BOOSTER_BODIES, USE.boosters), fairings: unused(FAIRING_PARTS, USE.fairings),
    }).toEqual({ engines: [], stages: [], boosters: [], fairings: [] });
  });

  it('keeps ids unique within each list, and every reference resolves', () => {
    for (const list of [ENGINE_PARTS, STAGE_BODIES, BOOSTER_BODIES, FAIRING_PARTS] as readonly (readonly { id: string }[])[]) {
      expect(new Set(list.map((p) => p.id)).size).toBe(list.length);
    }
    for (const body of [...STAGE_BODIES, ...BOOSTER_BODIES]) {
      expect(() => enginePart(body.engine.part)).not.toThrow();
      expect(Number.isInteger(body.engine.count) && body.engine.count >= 1).toBe(true);
    }
    const ids = (list: readonly { id: string }[]) => new Set(list.map((p) => p.id));
    const variants: [readonly { id: string; variantOf?: string }[], Set<string>][] = [
      [ENGINE_PARTS, ids(ENGINE_PARTS)], [STAGE_BODIES, ids(STAGE_BODIES)], [BOOSTER_BODIES, ids(BOOSTER_BODIES)]];
    for (const [list, known] of variants) {
      for (const p of list) if (p.variantOf !== undefined) expect([p.id, known.has(p.variantOf) && p.variantOf !== p.id]).toEqual([p.id, true]);
    }
    for (const p of [...ENGINE_PARTS, ...STAGE_BODIES, ...BOOSTER_BODIES, ...FAIRING_PARTS]) expect(p.source.length).toBeGreaterThan(0);
  });
});

describe('D01 parts catalogue: agreement with the tables still keyed by stage id', () => {
  it('gives every body the propellant family PROPELLANT_LOADS gives its stage id, where it has an entry', () => {
    const disagree: string[] = [];
    const noEntry = new Set<string>();
    for (const body of [...STAGE_BODIES, ...BOOSTER_BODIES]) {
      const load = PROPELLANT_LOADS[body.stageId];
      const family = enginePart(body.engine.part).family;
      if (!load) noEntry.add(body.stageId);
      else if (load.family !== family) disagree.push(`${body.id}: part ${family}, PROPELLANT_LOADS ${load.family}`);
    }
    expect(disagree).toEqual([]);
    // The stages the six-DOF mass model keeps on their accepted split
    // (vehicle-data.ts: Falcon 9, Falcon Heavy and the Soyuz R-7). A new body
    // without an entry would fall back to liquid tanks there, so it must be
    // noticed here.
    expect([...noEntry].sort()).toEqual(['blokA', 'blokBVGD', 'blokI', 'core', 's1', 's2', 'side']);
    // With no table to hold them to, the 13 bodies behind those ids are held
    // to what is stated here by hand: every R-7 block (the RD-107/108 family,
    // RD-0110, RD-0124) and every Falcon stage (Merlin) burns LOX and kerosene.
    const unkeyed = [...STAGE_BODIES, ...BOOSTER_BODIES].filter((b) => noEntry.has(b.stageId));
    expect(unkeyed).toHaveLength(13);
    expect(unkeyed.filter((b) => enginePart(b.engine.part).family !== 'kerolox').map((b) => b.id)).toEqual([]);
  });

  it('marks an engine solid exactly where its family is solid, and gives variants their parent’s family', () => {
    for (const p of ENGINE_PARTS) {
      expect([p.id, p.solid === true]).toEqual([p.id, p.family === 'solid']);
      if (p.peakFactor !== undefined) expect([p.id, p.solid]).toEqual([p.id, true]);
      if (p.variantOf) expect([p.id, p.family]).toEqual([p.id, enginePart(p.variantOf).family]);
    }
    expect(ENGINE_PARTS.filter((p) => p.solid).map((p) => p.id).sort())
      .toEqual(['gem63', 'gem63xl', 'hps3', 'p120c', 'psomxl', 's139', 'srb3', 'srba3', 'zefiro40', 'zefiro9']);
  });

  it('installs each lumped engine at the one count it has always had', () => {
    // `count` is load-bearing (the file comment in src/data/parts.ts):
    // re-counting a lumped entry changes that vehicle's flights.
    const counts = new Map<string, Set<number>>();
    for (const body of [...STAGE_BODIES, ...BOOSTER_BODIES]) {
      if (enginePart(body.engine.part).kind === 'engine') continue;
      if (!counts.has(body.engine.part)) counts.set(body.engine.part, new Set());
      counts.get(body.engine.part)!.add(body.engine.count);
    }
    expect(Object.fromEntries([...counts].map(([id, c]) => [`${enginePart(id).kind} ${id}`, [...c]])))
      .toEqual({ 'cluster rd0210': [4], 'lumped rd0213': [1], 'cluster yf21c': [4], 'lumped yf24c': [1], 'lumped yf75': [1], 'lumped raptor2-rvac': [6] });
  });

  it('calls an engine historical exactly when only retired vehicles fly it', () => {
    // Retired by the repo's own records: the C01 history vehicles and H-IIA 202
    // ("Retired 28 June 2025 after 50 flights").
    const retired = new Set(['sputnik8k71ps', 'vostok8k72k', 'saturnv', 'h2a202']);
    for (const [part, vehicles] of USE.engines) {
      expect([part.id, part.historical === true]).toEqual([part.id, [...vehicles].every((v) => retired.has(v))]);
    }
  });

  it('passes the custom-vehicle validator for every catalogue vehicle', () => {
    for (const v of VEHICLES) expect({ [v.id]: vehicleSpecProblems(copyOf(v.id)) }).toEqual({ [v.id]: [] });
  });
});

describe('D01 parts catalogue: the emitters', () => {
  it('never emit an undefined-valued key from the catalogue', () => {
    const out: string[] = [];
    for (const p of ENGINE_PARTS) undefinedKeys(engineSpec(p, 1), `engine ${p.id}`, out);
    for (const b of STAGE_BODIES) undefinedKeys(stageSpec(b), `stage ${b.id}`, out);
    for (const b of BOOSTER_BODIES) undefinedKeys(boosterSpec(b, 1), `booster ${b.id}`, out);
    for (const f of FAIRING_PARTS) undefinedKeys(fairingSpec(f, { sepAltitude: 1 }), `fairing ${f.id}`, out);
    expect(out).toEqual([]);
  });

  it('copy an optional field only when it is defined, keep zeros and false, and fill no default', () => {
    const bare: EnginePart = {
      id: 'bare', kind: 'engine', family: 'kerolox', name: 'Bare', thrustSL: 1, thrustVac: 2, ispSL: 3, ispVac: 4,
      minThrottle: undefined, solid: undefined, peakFactor: undefined, vacuumOnly: undefined, startupS: undefined, tailoffS: undefined,
      variantOf: undefined, historical: undefined, note: undefined, source: 'test',
    };
    expect(engineSpec(bare, 2)).toStrictEqual({ name: 'Bare', count: 2, thrustSL: 1, thrustVac: 2, ispSL: 3, ispVac: 4 });
    expect(engineSpec({ ...bare, minThrottle: 0, solid: false, vacuumOnly: false }, 1))
      .toStrictEqual({ name: 'Bare', count: 1, thrustSL: 1, thrustVac: 2, ispSL: 3, ispVac: 4, minThrottle: 0, solid: false, vacuumOnly: false });

    const body: StageBodyPart = { id: 'b', stageId: 'b', name: 'B', dryMass: 1, propellantMass: 2, diameter: 3, length: 4,
      engine: { part: 'merlin1d', count: 1 }, variantOf: undefined, note: undefined, source: 'test' };
    const stage = stageSpec(body, { sepDelay: 0, ignitionDelay: 0, restartable: undefined, boosters: undefined, color: undefined });
    expect(Object.keys(stage)).toEqual(['id', 'name', 'dryMass', 'propellantMass', 'engine', 'diameter', 'length', 'sepDelay', 'ignitionDelay']);
    expect([stage.sepDelay, stage.ignitionDelay]).toEqual([0, 0]);
    expect(Object.keys(boosterSpec(body, 3, { igniteAt: undefined, sepDelay: 0 })))
      .toEqual(['id', 'name', 'count', 'dryMass', 'propellantMass', 'engine', 'diameter', 'length', 'sepDelay']);
    const fairing: FairingPart = { id: 'f', mass: 1, diameter: 2, length: 3, adapter: undefined, source: 'test' };
    expect(fairingSpec(fairing, { sepAltitude: 0, sepTime: undefined, color: undefined })).toStrictEqual({ mass: 1, diameter: 2, length: 3, sepAltitude: 0 });
    expect(undefinedKeys(stage, 'stage')).toEqual([]);
  });

  it('never emit catalogue metadata, and refuse a hardware field passed as an installation', () => {
    for (const p of ENGINE_PARTS) {
      const keys = Object.keys(engineSpec(p, 1));
      for (const meta of ['id', 'kind', 'family', 'variantOf', 'historical', 'source', 'note']) expect(keys).not.toContain(meta);
    }
    expect(Object.keys(stageSpec('s1'))).not.toContain('stageId');
    expect(() => stageSpec('s1', { dryMass: 1 } as never)).toThrow(/dryMass is not a field of a stage installation/);
    expect(() => boosterSpec('side', 2, { engine: {} } as never)).toThrow(/engine is not a field of a strap-on installation/);
    expect(() => fairingSpec('falcon9', { sepAltitude: 1, mass: 5 } as never)).toThrow(/mass is not a field of a fairing installation/);
    expect(() => stageSpec('no-such-body')).toThrow(/Unknown stage body/);
  });

  it('hand out fresh specs from frozen parts, so an edit reaches neither another vehicle nor the catalogue', () => {
    const a = stageSpec('s2');
    const b = stageSpec('s2');
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(a.engine).not.toBe(b.engine);
    for (const list of [ENGINE_PARTS, STAGE_BODIES, BOOSTER_BODIES, FAIRING_PARTS] as readonly (readonly object[])[]) {
      expect(Object.isFrozen(list) && list.every((p) => Object.isFrozen(p))).toBe(true);
    }
    expect(STAGE_BODIES.every((b) => Object.isFrozen(b.engine)) && BOOSTER_BODIES.every((b) => Object.isFrozen(b.engine))).toBe(true);
    const falcon9 = VEHICLES.find((v) => v.id === 'falcon9')!;
    const heavy = VEHICLES.find((v) => v.id === 'falconheavy')!;
    expect(falcon9.stages[1]).toEqual(heavy.stages[1]);
    expect(falcon9.stages[1]).not.toBe(heavy.stages[1]);
  });
});
