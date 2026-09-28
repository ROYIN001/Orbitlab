/**
 * Roadmap D02: remix a real rocket (src/design/remix.ts).
 *
 * The acceptance the Phase 3 map sets (§3.1):
 * - with no ops a remix IS the S02 copy, for all 21 vehicles (`toStrictEqual`
 *   `copyOf`), so it flies identically by construction; and one strap-on
 *   vehicle of another kind than the two S02 already flies (H3, solid
 *   strap-ons) is flown point-mass to prove it (`toEqual` on the recording,
 *   failure injection off);
 * - every result of a fuzz of ops passes the custom-vehicle validator, and
 *   what the remix refuses it refuses with a code;
 * - a stretch changes Δv exactly as the rocket equation, applied to the
 *   budget core's phases (src/design/budget.ts), predicts;
 * - a swap changes the dry mass by the engines' published masses;
 * - a lumped or cluster engine is never re-counted.
 *
 * Tolerances were fixed before the first run: identities are exact
 * (`toStrictEqual`, `toBe`), the Δv prediction 1e-12 relative (it adds the
 * same masses in another order), the hand-worked stretch lengths 1e-12 m.
 */
import { describe, expect, it } from 'vitest';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { BOOSTER_BODIES, ENGINE_PARTS, FAIRING_PARTS, enginePartOf, engineSpec } from '../src/data/parts';
import { PART_ID_PATTERN, RESERVED_PART_IDS, vehicleSpecProblems } from '../src/config/vehicle-spec';
import { isCataloguePartId } from '../src/physics/rigid/vehicle-data';
import { interstageHeight } from '../src/physics/frame';
import { stageBudgets, totalDv } from '../src/design/budget';
import { FAMILY_MIXTURE_RATIO } from '../src/design/propellant';
import { RemixRefused, newPartId, remix, type RemixOp, type RemixRefusal } from '../src/design/remix';
import type { VehicleSpec } from '../src/types';
import { copyOf, fly, mission } from './custom-vehicle-harness';

const refusal = (f: () => unknown): RemixRefusal | 'accepted' | string => {
  try { f(); return 'accepted'; } catch (e) { return e instanceof RemixRefused ? e.code : `threw ${(e as Error).message}`; }
};

describe('D02 remix: no ops is the S02 copy', () => {
  it('equals copyOf for every catalogue vehicle, with nothing estimated', () => {
    expect(VEHICLES).toHaveLength(21);
    for (const v of VEHICLES) {
      const r = remix(v, [], `${v.id}-copy`, v.name);
      expect(r.spec).toStrictEqual(copyOf(v.id));
      expect(r.estimates).toEqual([]);
      expect(r.spec).not.toBe(v);
      expect(r.spec.stages[0]).not.toBe(v.stages[0]);
    }
  });

  it('flies H3’s identity remix point-mass exactly as H3', () => {
    const h3 = vehicleById('h3');
    const original = fly(mission('h3', 'pointMass'), 7200);
    const copy = fly(mission('h3', 'pointMass', remix(h3, [], 'h3-copy', h3.name).spec), 7200);
    expect(mission('h3', 'pointMass').failure.mode).toBe('none');
    expect(original.flight.done).toBe(true);
    expect(original.flight.status).not.toBe('failed');
    expect(original.flight.events.some((e) => e.key === 'evt.boosterSep')).toBe(true);
    expect(copy.flight).toEqual(original.flight);
  }, 240_000);
});

describe('D02 remix: the mass rules', () => {
  it('changes a swapped stage’s dry mass by the engines’ published masses, and gives it an id and name of its own', () => {
    const f9 = vehicleById('falcon9');
    // nine Merlin 1D (467 kg each) out, one RD-180 (5 480 kg) in
    const r = remix(f9, [{ op: 'swapEngine', target: { stage: 0 }, part: 'rd180', count: 1 }], 'f9-rd180', 'F9 RD-180');
    const s1 = r.spec.stages[0];
    expect(s1.dryMass).toBe(22200 + 5480 - 9 * 467);
    expect(s1.engine).toStrictEqual(engineSpec('rd180', 1));
    expect(s1.id).toBe('s1-r1');
    expect(isCataloguePartId(s1.id)).toBe(false);
    expect(s1.name).toBe('RD-180');
    expect(r.estimates).toEqual([{ code: 'originRatings' }]);
    // one Merlin Vacuum (550 kg) out, two RL10C-1-1 (188.2 kg each) in; the first stage keeps its id
    const r2 = remix(f9, [{ op: 'swapEngine', target: { stage: 1 }, part: 'rl10c11', count: 2 }], 'f9-rl10', 'F9 RL10');
    expect(r2.spec.stages[1].dryMass).toBe(4300 + 2 * 188.2 - 550);
    expect(r2.spec.stages[1].name).toBe('2× RL10C-1-1');
    expect(r2.spec.stages[0].id).toBe('s1');
    // Curie has no published mass: the dry mass is left, and that is an estimate
    const electron = vehicleById('electron');
    const r3 = remix(electron, [{ op: 'swapEngine', target: { stage: 1 }, part: 'curie', count: 1 }], 'e-curie', 'E');
    expect(r3.spec.stages[1].dryMass).toBe(electron.stages[1].dryMass);
    expect(r3.estimates).toEqual([{ code: 'engineMassUnknown', stage: 1 }, { code: 'originRatings' }]);
    // a strap-on group swaps the same way: Angara's URM-1 RD-191 (2 290 kg) for two YF-100 (1 920 kg each)
    const r4 = remix(vehicleById('angaraa5'), [{ op: 'swapEngine', target: { stage: 0, group: 0 }, part: 'yf100', count: 2 }], 'a5-yf', 'A5');
    expect(r4.spec.stages[0].boosters![0].dryMass).toBe(9000 + 2 * 1920 - 2290);
    expect(r4.spec.stages[0].boosters![0].id).toBe('urm1-r1');
    // the same installation again changes nothing, id included
    const same = remix(f9, [{ op: 'swapEngine', target: { stage: 0 }, part: 'merlin1d', count: 9 }], 'f9-same', 'F9');
    expect(same.spec.stages).toStrictEqual(copyOf('falcon9').stages);
  });

  it('stretches the propellant, the tank structure and the length, and keeps the stage’s id', () => {
    const f9 = vehicleById('falcon9');
    const k = 1.25;
    const r = remix(f9, [{ op: 'stretch', target: { stage: 1 }, factor: k }], 'f9-long', 'F9 long');
    const s2 = r.spec.stages[1];
    expect(s2.id).toBe('s2');
    expect(s2.propellantMass).toBe(108000 * k);
    // the Merlin Vacuum's 550 kg stays; the other 3 750 kg scales with the load
    expect(s2.dryMass).toBe(550 + k * (4300 - 550));
    // the extra load's volume at 3.66 m: kerolox, 1 141 / 810 kg/m³, the family's ratio 2.6 (s2 has no table entry)
    const of = 2.6 / 3.6;
    const perKg = of / 1141 + (1 - of) / 810;
    const tank = 108000 * perKg / (Math.PI * 3.66 * 3.66 / 4);
    expect(Math.abs(s2.length - (15 + (k - 1) * tank))).toBeLessThan(1e-12);
    expect(r.estimates).toEqual([
      { code: 'tankMassScaled', stage: 1 }, { code: 'lengthFromVolume', stage: 1 }, { code: 'originRatings' },
    ]);
    // the stated height moves by exactly what the stage gained
    expect(Math.abs(r.spec.height - (70 + (k - 1) * tank))).toBeLessThan(1e-12);
  });

  it('scales a length in proportion where the load would not fit the stage, and a solid’s whole case', () => {
    // Proton's first stage holds much of its load in six outboard tanks: at its 4.1 m core the volume needs more than its 21.2 m
    const p = remix(vehicleById('protonm'), [{ op: 'stretch', target: { stage: 0 }, factor: 1.1 }], 'p-long', 'P');
    expect(p.spec.stages[0].length).toBe(21.2 * 1.1);
    expect(p.estimates).toContainEqual({ code: 'lengthProportional', stage: 0 });
    // Zefiro 9: the inert mass is the motor's case, all of it scaled with the grain
    const z = remix(vehicleById('vegac'), [{ op: 'stretch', target: { stage: 2 }, factor: 1.2 }], 'v-long', 'V');
    expect(z.spec.stages[2].dryMass).toBe(929 * 1.2);
    expect(z.spec.stages[2].length).toBe(4.12 * 1.2);
    expect(z.estimates.slice(0, 2)).toEqual([{ code: 'solidCaseScaled', stage: 2 }, { code: 'lengthProportional', stage: 2 }]);
    // the family ratios are the medians of the six-DOF table's own entries
    expect(FAMILY_MIXTURE_RATIO).toEqual({ kerolox: 2.6, hydrolox: 5.88, methalox: 3.6, hypergolic: 2.1 });
  });

  it('changes Δv as the rocket equation on the budget core’s phases predicts', () => {
    // The prediction: the origin's phases (src/design/budget.ts), every mass
    // below the stretched stage's burnout raised by the extra propellant and
    // dry mass, the stretched stage's burnout mass by the extra dry mass, and
    // Δv = ve ln(m0/mf) again. The dry mass is worked here from the published
    // engine mass, not read off the remix.
    const cases: [string, number, number][] = [['falcon9', 1, 1.25], ['saturnv', 1, 0.8], ['electron', 0, 1.1], ['angaraa5', 1, 1.5], ['h3', 1, 1.3]];
    for (const [id, stage, k] of cases) {
      const v = vehicleById(id);
      const payload = v.payloadLEO / 2;
      const st = v.stages[stage];
      const fixed = st.engine.count * enginePartOf(st.engine)!.mass.kg!;
      const dDry = fixed + k * (st.dryMass - fixed) - st.dryMass;
      const dProp = (k - 1) * st.propellantMass;
      const predicted = stageBudgets(v, payload).map((ph) => {
        const atIgnition = ph.stageIndex <= stage ? dProp + dDry : 0;
        const atBurnout = ph.stageIndex < stage ? dProp + dDry : ph.stageIndex === stage ? dDry : 0;
        const m0 = ph.m0 + atIgnition;
        const mf = ph.mf + atBurnout;
        return ph.dv === 0 ? 0 : ph.ve * Math.log(m0 / mf);
      });
      const r = remix(v, [{ op: 'stretch', target: { stage }, factor: k }], `${id}-s`, id);
      const phases = stageBudgets(r.spec, payload);
      expect(phases.map((p) => [p.stageIndex, p.phase])).toEqual(stageBudgets(v, payload).map((p) => [p.stageIndex, p.phase]));
      phases.forEach((p, i) => expect([id, i, Math.abs(p.dv - predicted[i]) <= 1e-12 * Math.max(1, predicted[i])]).toEqual([id, i, true]));
      const want = predicted.reduce((a, b) => a + b, 0);
      expect(Math.abs(totalDv(phases) - want) / want).toBeLessThan(1e-12);
      // and the stretch moved Δv the way a stretch should: up for more propellant, down for less
      expect(Math.sign(totalDv(phases) - totalDv(stageBudgets(v, payload)))).toBe(Math.sign(k - 1));
    }
  });
});

describe('D02 remix: what it refuses', () => {
  it('never re-counts a lumped or cluster engine', () => {
    // Long March 3B/E's third stage: YF-75 is two engines' thrust at count 1
    expect(refusal(() => remix(vehicleById('longmarch3be'), [{ op: 'swapEngine', target: { stage: 2 }, part: 'yf75', count: 2 }], 'x', 'x'))).toBe('lumpedRecount');
    // Proton's second stage: RD-0210/0211 is a cluster of four
    expect(refusal(() => remix(vehicleById('protonm'), [{ op: 'swapEngine', target: { stage: 1 }, part: 'rd0210', count: 3 }], 'x', 'x'))).toBe('lumpedRecount');
    expect(refusal(() => remix(vehicleById('falcon9'), [{ op: 'swapEngine', target: { stage: 1 }, part: 'raptor2-rvac', count: 1 }], 'x', 'x'))).toBe('lumpedRecount');
    // at the count it has always had, it may go on another stage
    const ok = remix(vehicleById('falcon9'), [{ op: 'swapEngine', target: { stage: 1 }, part: 'yf75', count: 1 }], 'x', 'x');
    expect(ok.spec.stages[1].engine).toStrictEqual(engineSpec('yf75', 1));
  });

  it('refuses a solid motor swap, a vacuum engine on the pad, bad counts and factors, and a fifth strap-on group', () => {
    const f9 = vehicleById('falcon9');
    const cases: [VehicleSpec, RemixOp, RemixRefusal][] = [
      [vehicleById('vegac'), { op: 'swapEngine', target: { stage: 0 }, part: 'rd180', count: 1 }, 'solidMotor'],
      [f9, { op: 'swapEngine', target: { stage: 1 }, part: 'zefiro9', count: 1 }, 'solidMotor'],
      [f9, { op: 'swapEngine', target: { stage: 0 }, part: 'rl10c1', count: 9 }, 'vacuumEngineOnPad'],
      [f9, { op: 'swapEngine', target: { stage: 0 }, part: 'merlin1d', count: 0 }, 'badCount'],
      [f9, { op: 'swapEngine', target: { stage: 0 }, part: 'merlin1d', count: 51 }, 'badCount'],
      [f9, { op: 'swapEngine', target: { stage: 0 }, part: 'no-such-engine', count: 1 }, 'unknownPart'],
      [f9, { op: 'stretch', target: { stage: 1 }, factor: 0 }, 'badFactor'],
      [f9, { op: 'stretch', target: { stage: 1 }, factor: Number.NaN }, 'badFactor'],
      [f9, { op: 'stretch', target: { stage: 0 }, factor: 3 }, 'outOfLimits'],
      [f9, { op: 'stretch', target: { stage: 2 }, factor: 1.1 }, 'noSuchStage'],
      [f9, { op: 'stretch', target: { stage: 0, group: 0 }, factor: 1.1 }, 'noSuchGroup'],
      [f9, { op: 'removeBoosters', group: 0 }, 'noSuchGroup'],
      [f9, { op: 'addBoosters', body: 'gem63', count: 13 }, 'badCount'],
      [f9, { op: 'addBoosters', body: 'nothing', count: 2 }, 'unknownPart'],
      [f9, { op: 'fairing', part: 'nothing' }, 'unknownPart'],
    ];
    for (const [v, op, code] of cases) expect([op, refusal(() => remix(v, [op], 'x', 'x'))]).toEqual([op, code]);
    const atlas = vehicleById('atlasv551');
    const four = (['gem63xl', 'srb3', 'p120c', 'cz3bb'] as const).map((body): RemixOp => ({ op: 'addBoosters', body, count: 2 }));
    expect(refusal(() => remix(atlas, four.slice(0, 3), 'x', 'x'))).toBe('accepted');
    const e = (() => { try { remix(atlas, four, 'x', 'x'); return null; } catch (err) { return err as RemixRefused; } })();
    expect([e?.code, e?.op]).toEqual(['tooManyGroups', 3]);
  });
});

describe('D02 remix: strap-ons, fairing, ids and the origin', () => {
  it('adds and removes strap-on groups', () => {
    const f9 = vehicleById('falcon9');
    const r = remix(f9, [{ op: 'addBoosters', body: 'gem63', count: 2 }], 'f9-gem', 'F9 GEM');
    expect(r.spec.stages[0].boosters).toHaveLength(1);
    expect(r.spec.stages[0].boosters![0]).toMatchObject({ id: 'gem63', count: 2, dryMass: 5100, propellantMass: 44200 });
    expect(r.spec.stages[0].id).toBe('s1');
    // a second group of the same body gets an id of its own
    const fh = remix(vehicleById('falconheavy'), [{ op: 'addBoosters', body: 'side', count: 2, igniteAt: 30 }], 'fh-4', 'FH');
    expect(fh.spec.stages[0].boosters!.map((b) => [b.id, b.igniteAt])).toEqual([['side', undefined], ['side-r1', 30]]);
    const bare = remix(vehicleById('atlasv551'), [{ op: 'removeBoosters', group: 0 }], 'a-0', 'A');
    expect('boosters' in bare.spec.stages[0]).toBe(false);
    expect(vehicleSpecProblems(bare.spec)).toEqual([]);
  });

  it('fits another fairing, jettisoned as the origin’s was, and moves the height by the drawn stack', () => {
    const f9 = vehicleById('falcon9');
    const r = remix(f9, [{ op: 'fairing', part: 'atlasv551' }], 'f9-big', 'F9');
    expect(r.spec.fairing).toStrictEqual({ mass: 3524, diameter: 5.4, length: 20.7, sepAltitude: 110e3, color: '#f4f4f4' });
    // 7.6 m more fairing, and the adapter from the 3.66 m stage to 5.4 m instead of 5.2 m
    const expected = 70 + (20.7 - 13.1) + (interstageHeight(3.66, 5.4) - interstageHeight(3.66, 5.2));
    expect(Math.abs(r.spec.height - expected)).toBeLessThan(1e-12);
    // no fairing to take the jettison from: the fleet's median altitude, an estimate
    const s = remix(vehicleById('saturnv'), [{ op: 'fairing', part: 'falcon9' }], 'sv-f', 'SV');
    expect(s.spec.fairing!.sepAltitude).toBe(115e3);
    expect(s.estimates).toEqual([{ code: 'fairingSepAltitude' }, { code: 'originRatings' }]);
  });

  it('keeps the catalogue origin through a remix of a remix, and the escape tower only where the origin has it', () => {
    const soyuz = vehicleById('soyuz21a');
    const once = remix(soyuz, [{ op: 'stretch', target: { stage: 1 }, factor: 1.05 }], 'soyuz-a', 'A').spec;
    expect([once.derivedFrom, once.escapeSystem]).toEqual(['soyuz21a', 'soyuz']);
    const twice = remix(once, [{ op: 'fairing', part: 'soyuz21b' }], 'soyuz-b', 'B').spec;
    expect([twice.derivedFrom, twice.escapeSystem]).toEqual(['soyuz21a', 'soyuz']);
    expect(vehicleSpecProblems(twice)).toEqual([]);
    const { derivedFrom: _, ...orphan } = once;
    expect('escapeSystem' in remix(orphan, [], 'o', 'O').spec).toBe(false);
  });

  it('makes new ids the validator takes, that no catalogue part and nothing reserved uses', () => {
    const taken = new Set(['s1-r1', 'x-r1']);
    expect(newPartId(taken, 's1')).toBe('s1-r2');
    expect(newPartId(new Set(), 'Blok A (core)')).toBe('Blok-A-core--r1');
    expect(newPartId(new Set(), '---')).toBe('part-r1');
    const long = newPartId(new Set(), 'x'.repeat(80));
    expect(PART_ID_PATTERN.test(long)).toBe(true);
    for (const id of ['s1', 'stage', 'fairing', 'blokA', 'урм']) {
      const made = newPartId(new Set(), id);
      expect([made, PART_ID_PATTERN.test(made), RESERVED_PART_IDS.includes(made), isCataloguePartId(made)]).toEqual([made, true, false, false]);
    }
  });
});

describe('D02 remix: a fuzz of ops', () => {
  it('gives every result it accepts to the validator clean, refuses with a code, and never touches the catalogue', () => {
    // A seeded fuzz (mulberry32): 30 op lists per vehicle, one to four ops
    // each, parameters drawn from ranges that include what must be refused.
    // Fixed before the run: every accepted result has no validator problem;
    // every throw is a RemixRefused; at least a quarter of the lists are
    // accepted whole (a list is refused if any one op is) and every kind of op
    // is accepted somewhere; the catalogue is unchanged.
    const before = JSON.stringify(VEHICLES);
    let seed = 20260928;
    const rand = (): number => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
    const target = (v: VehicleSpec): { stage: number; group?: number } => {
      // now and then one past the end, to be refused
      const stage = rand() < 0.05 ? v.stages.length : Math.floor(rand() * v.stages.length);
      const groups = v.stages[0].boosters?.length ?? 0;
      if (stage === 0 && groups > 0 && rand() < 0.4) return { stage: 0, group: rand() < 0.1 ? groups : Math.floor(rand() * groups) };
      return { stage };
    };
    const op = (v: VehicleSpec): RemixOp => {
      const kind = pick(['stretch', 'swapEngine', 'addBoosters', 'removeBoosters', 'fairing'] as const);
      switch (kind) {
        case 'stretch': return { op: 'stretch', target: target(v), factor: rand() < 0.05 ? -1 : 0.4 + 2.2 * rand() };
        case 'swapEngine': return { op: 'swapEngine', target: target(v), part: pick(ENGINE_PARTS).id, count: 1 + Math.floor(rand() * (rand() < 0.1 ? 60 : 12)) };
        case 'addBoosters': return { op: 'addBoosters', body: pick(BOOSTER_BODIES).id, count: 1 + Math.floor(rand() * 8), ...(rand() < 0.2 ? { igniteAt: 20 + 40 * rand() } : {}) };
        case 'removeBoosters': return { op: 'removeBoosters', group: Math.floor(rand() * 3) };
        default: return { op: 'fairing', part: pick(FAIRING_PARTS).id };
      }
    };
    const accepted = new Map<string, number>();
    const refused = new Map<string, number>();
    const problems: string[] = [];
    let lists = 0;
    for (const v of VEHICLES) {
      for (let n = 0; n < 30; n++) {
        lists++;
        const ops = Array.from({ length: 1 + Math.floor(rand() * 4) }, () => op(v));
        let result;
        try {
          result = remix(v, ops, `${v.id}-fuzz-${n}`, `Fuzz ${n}`);
        } catch (e) {
          if (!(e instanceof RemixRefused)) problems.push(`${v.id} ${JSON.stringify(ops)} threw ${(e as Error).message}`);
          else refused.set(e.code, (refused.get(e.code) ?? 0) + 1);
          continue;
        }
        for (const o of ops) accepted.set(o.op, (accepted.get(o.op) ?? 0) + 1);
        const issues = vehicleSpecProblems(result.spec);
        if (issues.length) problems.push(`${v.id} ${JSON.stringify(ops)}: ${JSON.stringify(issues)}`);
        if (result.spec.derivedFrom !== v.id) problems.push(`${v.id}: derivedFrom ${result.spec.derivedFrom}`);
        if (!result.estimates.some((e) => e.code === 'originRatings')) problems.push(`${v.id}: no originRatings`);
      }
    }
    expect(problems).toEqual([]);
    const acceptedLists = lists - [...refused.values()].reduce((a, b) => a + b, 0);
    expect(acceptedLists / lists).toBeGreaterThan(0.25);
    expect([...accepted.keys()].sort()).toEqual(['addBoosters', 'fairing', 'removeBoosters', 'stretch', 'swapEngine']);
    expect(JSON.stringify(VEHICLES)).toBe(before);
    // recorded for the validation notes
    console.log(`remix fuzz: ${lists} lists, ${acceptedLists} accepted; refusals ${JSON.stringify(Object.fromEntries([...refused].sort()))}`);
  });
});
