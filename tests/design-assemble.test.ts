/**
 * Roadmap D03: the parts builder's assembly (src/design/assemble.ts).
 *
 * The acceptance (the Phase 3 map, §3.2):
 * - every catalogue vehicle, described as a design made of its own parts and
 *   its own installation, assembles to exactly its stages, strap-ons, engines,
 *   masses, dimensions, staging and fairing (`toStrictEqual`), and so to the
 *   same ideal Δv and liftoff thrust (`toBe`);
 * - the required fields a design leaves out are filled, and each such fill is
 *   reported as a default or an estimate;
 * - every design of a seeded fuzz that the assembly accepts passes the
 *   custom-vehicle validator, and what it refuses it refuses with a code.
 *
 * The parts are found by value, as tests/parts.test.ts finds them, not by
 * asking src/data/vehicles.ts how it named them, so the check does not share
 * the assembly's own reading of the catalogue. All comparisons are exact.
 */
import { describe, expect, it } from 'vitest';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { SITES } from '../src/data/sites';
import {
  BOOSTER_BODIES, ENGINE_PARTS, FAIRING_PARTS, STAGE_BODIES, boosterSpec, enginePart, engineSpec, fairingSpec, stageSpec,
} from '../src/data/parts';
import { PART_ID_PATTERN, vehicleSpecProblems } from '../src/config/vehicle-spec';
import { idealDeltaV, liftoffThrust } from '../src/physics/vehicle';
import { stackLayout } from '../src/physics/frame';
import {
  AssembleRefused, FLEET_MAX_ACCEL, FLEET_MAX_Q, assemble, type AssembleRefusal, type CustomBody, type DesignStage, type PartsDesign,
} from '../src/design/assemble';
import type { PropellantFamily } from '../src/physics/rigid/vehicle-data';
import type { VehicleSpec } from '../src/types';

const HARDWARE = ['id', 'name', 'dryMass', 'propellantMass', 'engine', 'diameter', 'length'];
/** Equal plain data, key order aside. */
const same = (a: unknown, b: unknown): boolean => JSON.stringify(sortDeep(a)) === JSON.stringify(sortDeep(b));
function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortDeep((v as Record<string, unknown>)[k])]));
  return v;
}
const pick = (o: object, keys: readonly string[]): Record<string, unknown> =>
  Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, (o as Record<string, unknown>)[k]]));
const omit = (o: object, keys: readonly string[]): Record<string, unknown> =>
  Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

/** A catalogue vehicle as a parts design: each part found by its emitted hardware, the rest of each field its installation. */
function designOf(v: VehicleSpec): PartsDesign {
  const stages: DesignStage[] = v.stages.map((st) => {
    const bodies = STAGE_BODIES.filter((b) => same(pick(stageSpec(b), HARDWARE), pick(st, HARDWARE)));
    expect([v.id, st.id, bodies.length]).toEqual([v.id, st.id, 1]);
    const boosters = (st.boosters ?? []).map((g) => {
      const hits = BOOSTER_BODIES.filter((b) => same(pick(boosterSpec(b, g.count), HARDWARE), pick(g, HARDWARE)));
      expect([v.id, g.id, hits.length]).toEqual([v.id, g.id, 1]);
      return { body: hits[0].id, count: g.count, install: omit(g, [...HARDWARE, 'count']) };
    });
    return { body: bodies[0].id, install: omit(st, [...HARDWARE, 'boosters']), ...(boosters.length ? { boosters } : {}) };
  });
  let fairing: PartsDesign['fairing'] = null;
  if (v.fairing) {
    const hits = FAIRING_PARTS.filter((f) => same(pick(fairingSpec(f, { sepAltitude: 0 }), ['mass', 'diameter', 'length', 'adapter']),
      pick(v.fairing!, ['mass', 'diameter', 'length', 'adapter'])));
    expect([v.id, hits.length]).toEqual([v.id, 1]);
    fairing = { part: hits[0].id, ...(pick(v.fairing, ['sepAltitude', 'sepTime', 'color']) as { sepAltitude: number }) };
  }
  return {
    id: `${v.id}-parts`, name: v.name, sites: [...v.sites], stages, fairing, country: v.country, manufacturer: v.manufacturer,
    ratings: { payloadLEO: v.payloadLEO, payloadGTO: v.payloadGTO, ...(v.payloadSSO !== undefined ? { payloadSSO: v.payloadSSO } : {}) },
    maxQ: v.maxQ, maxAccel: v.maxAccel, derivedFrom: v.id,
  };
}

const refusal = (f: () => unknown): AssembleRefusal | 'accepted' | string => {
  try { f(); return 'accepted'; } catch (e) { return e instanceof AssembleRefused ? e.code : `threw ${(e as Error).message}`; }
};

describe('D03 assemble: the catalogue from its own parts', () => {
  it('reproduces every catalogue vehicle’s stages, strap-ons and fairing exactly', () => {
    const heights: Record<string, [number, number]> = {};
    for (const v of VEHICLES) {
      const { spec, estimates } = assemble(designOf(v));
      expect(spec.stages).toStrictEqual(v.stages);
      expect(spec.fairing).toStrictEqual(v.fairing);
      expect(estimates).toEqual([]);
      for (const payload of [0, v.payloadLEO / 2]) expect([v.id, idealDeltaV(spec, payload)]).toEqual([v.id, idealDeltaV(v, payload)]);
      expect(liftoffThrust(spec)).toBe(liftoffThrust(v));
      expect(vehicleSpecProblems(spec)).toEqual([]);
      // the stated height is the drawn one, where the catalogue's is typed
      expect(spec.height).toBe(stackLayout(v).total + (v.fairing?.length ?? 0));
      heights[v.id] = [v.height, Math.round(spec.height * 100) / 100];
    }
    // recorded, not a bound: typed catalogue height against the drawn stack, m
    console.log(`assemble heights (typed, drawn): ${JSON.stringify(heights)}`);
  });
});

describe('D03 assemble: the fields a design leaves out', () => {
  const soyuz = designOf(vehicleById('soyuz21a'));
  const { ratings: _r, maxQ: _q, maxAccel: _a, country: _c, manufacturer: _m, derivedFrom: _d, ...bare } = soyuz;

  it('fills ratings with 0, the limits with the fleet’s medians and the country from the first site, and says which', () => {
    const { spec, estimates } = assemble({ ...bare, fairing: { part: 'soyuz21a' } });
    expect([spec.payloadLEO, spec.payloadGTO, 'payloadSSO' in spec]).toEqual([0, 0, false]);
    expect([FLEET_MAX_Q, FLEET_MAX_ACCEL]).toEqual([40e3, 50]);
    expect([spec.maxQ, spec.maxAccel, spec.country, spec.manufacturer]).toEqual([40e3, 50, 'KZ', '']);
    expect(spec.fairing!.sepAltitude).toBe(115e3);
    expect(estimates).toEqual([{ code: 'fairingSepAltitude' }, { code: 'noRatings' }, { code: 'maxQDefault' }, { code: 'maxAccelDefault' }]);
    expect('derivedFrom' in spec).toBe(false);
    expect(vehicleSpecProblems(spec)).toEqual([]);
  });

  it('takes computed ratings when the design carries them', () => {
    const { spec, estimates } = assemble({ ...bare, ratings: { payloadLEO: 7000, payloadGTO: 0, payloadSSO: 4000 } });
    expect([spec.payloadLEO, spec.payloadGTO, spec.payloadSSO]).toEqual([7000, 0, 4000]);
    expect(estimates.map((e) => e.code)).not.toContain('noRatings');
  });
});

describe('D03 assemble: engines and bodies of one’s own', () => {
  it('changes a catalogue body’s dry mass by the engines’ published masses, and gives it an id of its own', () => {
    const { spec, estimates } = assemble({ id: 'mine', name: 'Mine', sites: ['cape'], fairing: { part: 'falcon9', sepAltitude: 110e3 },
      stages: [{ body: 's1', engine: { part: 'rd180', count: 1 } }, { body: 's2' }] });
    expect(spec.stages[0]).toMatchObject({ id: 's1-r1', name: 'RD-180', dryMass: 22200 + 5480 - 9 * 467 });
    expect(spec.stages[0].engine).toStrictEqual(engineSpec('rd180', 1));
    expect(spec.stages[1].id).toBe('s2');
    expect(estimates.map((e) => e.code)).toEqual(['noRatings', 'maxQDefault', 'maxAccelDefault']);
    expect(vehicleSpecProblems(spec)).toEqual([]);
  });

  it('builds a body of one’s own through the same emitter, and holds its engine to the body’s propellant', () => {
    const tank: CustomBody = { dryMass: 3000, propellantMass: 40000, diameter: 2.5, length: 14, family: 'kerolox' };
    const { spec } = assemble({ id: 'mine', name: 'Mine', sites: ['kourou'], fairing: null,
      stages: [{ body: tank, engine: { part: 'merlin1d', count: 1 } }, { body: { ...tank, dryMass: 800, propellantMass: 8000, length: 5, name: 'Upper' }, engine: { part: 'mvac', count: 1 } }] });
    expect(spec.stages.map((s) => [s.id, s.name])).toEqual([['stage1-r1', 'Merlin 1D'], ['stage2-r1', 'Upper']]);
    expect(Object.keys(spec.stages[0])).toEqual(['id', 'name', 'dryMass', 'propellantMass', 'engine', 'diameter', 'length']);
    expect(vehicleSpecProblems(spec)).toEqual([]);
    const cases: [DesignStage, AssembleRefusal][] = [
      [{ body: tank, engine: { part: 'le9', count: 1 } }, 'familyMismatch'],
      [{ body: { ...tank, family: 'solid' }, engine: { part: 'merlin1d', count: 1 } }, 'familyMismatch'],
      [{ body: tank }, 'noEngine'],
      [{ body: { ...tank, family: 'hydrolox' }, engine: { part: 'rl10c1', count: 1 } }, 'vacuumEngineOnPad'],
      [{ body: { ...tank, dryMass: -1 }, engine: { part: 'merlin1d', count: 1 } }, 'outOfLimits'],
      [{ body: 'cz3b3', engine: { part: 'yf75', count: 2 } }, 'lumpedRecount'],
      [{ body: 'z9', engine: { part: 'rd180', count: 1 } }, 'solidMotor'],
      // a catalogue body's tanks hold what its own engine burns: Falcon 9's kerolox first stage with a hydrolox engine
      [{ body: 's1', engine: { part: 'le9', count: 2 } }, 'familyMismatch'],
      [{ body: 'nothing' }, 'unknownPart'],
    ];
    for (const [stage, code] of cases) {
      expect([stage, refusal(() => assemble({ id: 'x', name: 'x', sites: ['kourou'], fairing: null, stages: [stage] }))]).toEqual([stage, code]);
    }
    // a solid body of one's own takes a solid motor
    const solid = assemble({ id: 's', name: 'S', sites: ['kourou'], fairing: null,
      stages: [{ body: { dryMass: 2000, propellantMass: 20000, diameter: 2, length: 8, family: 'solid' }, engine: { part: 'zefiro40', count: 1 } }] });
    expect(solid.spec.stages[0].engine.solid).toBe(true);
    expect(refusal(() => assemble({ id: 'x', name: 'x', sites: ['kourou'], fairing: null, stages: [{ body: 's1' }, { body: 's2', boosters: [{ body: 'gem63', count: 2 }] }] })))
      .toBe('boostersNotOnFirstStage');
    expect(refusal(() => assemble({ id: 'x', name: 'x', sites: ['atlantis'], fairing: null, stages: [{ body: 's1' }] }))).toBe('unknownSite');
  });

  it('gives a catalogue body used twice an id of its own the second time', () => {
    const { spec } = assemble({ id: 'twice', name: 'Twice', sites: ['cape'], fairing: null, stages: [{ body: 's1' }, { body: 's2' }, { body: 's2' }] });
    expect(spec.stages.map((s) => s.id)).toEqual(['s1', 's2', 's2-r1']);
    expect(vehicleSpecProblems(spec)).toEqual([]);
  });
});

describe('D03 assemble: a fuzz of designs', () => {
  it('gives every design it accepts to the validator clean, and refuses with a code', () => {
    // Fixed before the run: every accepted design has no validator problem
    // and unique ids of the validator's pattern; every throw is an
    // AssembleRefused; at least a quarter of the 600 designs are accepted.
    // Recorded at review: once a catalogue body was held to its own
    // propellant family, drawing ANY engine for one left 139 of 600 accepted
    // (23 %, under the floor). The floor stays; the draw now picks a
    // catalogue body's other engine as custom() picks one, from its family
    // with a 10 % chance of any, which exercises the refusal and accepts 162.
    let seed = 20260929;
    const rand = (): number => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick1 = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
    const families: PropellantFamily[] = ['kerolox', 'hydrolox', 'methalox', 'hypergolic', 'solid'];
    const custom = (): { body: CustomBody; engine: { part: string; count: number } } => {
      const family = pick1(families);
      const engines = ENGINE_PARTS.filter((p) => rand() < 0.1 || p.family === family);
      const bad = rand() < 0.05;
      return {
        body: { dryMass: bad ? -5 : 200 + 3e4 * rand(), propellantMass: 2e3 + 4e5 * rand(), diameter: 0.8 + 5 * rand(), length: 3 + 40 * rand(), family },
        engine: { part: pick1(engines).id, count: 1 + Math.floor(rand() * 9) },
      };
    };
    const refused = new Map<string, number>();
    const problems: string[] = [];
    let accepted = 0;
    const N = 600;
    for (let n = 0; n < N; n++) {
      const stages: DesignStage[] = Array.from({ length: 1 + Math.floor(rand() * 4) }, () => {
        if (rand() < 0.4) return custom();
        const body = pick1(STAGE_BODIES);
        if (rand() >= 0.3) return { body: body.id };
        // another engine, as custom() picks one: of the body's own propellant, now and then any
        const family = enginePart(body.engine.part).family;
        const engines = ENGINE_PARTS.filter((p) => rand() < 0.1 || p.family === family);
        return { body: body.id, engine: { part: pick1(engines).id, count: 1 + Math.floor(rand() * 9) } };
      });
      if (rand() < 0.35) {
        stages[0].boosters = Array.from({ length: 1 + Math.floor(rand() * 2) }, () => {
          const g = rand() < 0.3 ? custom() : { body: pick1(BOOSTER_BODIES).id };
          return { ...g, count: 1 + Math.floor(rand() * 6), ...(rand() < 0.15 ? { install: { igniteAt: 30 } } : {}) };
        });
      }
      const design: PartsDesign = {
        id: `fuzz-${n}`, name: `Fuzz ${n}`, sites: [pick1(SITES).id], stages,
        fairing: rand() < 0.8 ? { part: pick1(FAIRING_PARTS).id, sepAltitude: 110e3 } : null,
      };
      let spec: VehicleSpec;
      try {
        spec = assemble(design).spec;
      } catch (e) {
        if (!(e instanceof AssembleRefused)) problems.push(`${n} threw ${(e as Error).message}`);
        else refused.set(e.code, (refused.get(e.code) ?? 0) + 1);
        continue;
      }
      accepted++;
      const issues = vehicleSpecProblems(spec);
      if (issues.length) problems.push(`${n} ${JSON.stringify(design)}: ${JSON.stringify(issues)}`);
      const ids = spec.stages.flatMap((s) => [s.id, ...(s.boosters ?? []).map((b) => b.id)]);
      if (new Set(ids).size !== ids.length || !ids.every((id) => PART_ID_PATTERN.test(id))) problems.push(`${n} ids ${ids.join(',')}`);
    }
    expect(problems).toEqual([]);
    expect(accepted / N).toBeGreaterThan(0.25);
    console.log(`assemble fuzz: ${N} designs, ${accepted} accepted; refusals ${JSON.stringify(Object.fromEntries([...refused].sort()))}`);
  });
});
