/**
 * Roadmap D02/D03: the engine parts' own masses (`EnginePart.mass` in
 * src/data/parts.ts).
 *
 * New data, so this holds it to its own rules: every figure has sources and
 * says what it includes, every missing figure says why, the labels that say
 * how far a figure can be trusted are applied as the file defines them, a solid
 * motor's figure is its inert mass, and nothing of it reaches a spec. That last
 * rule is proven by tests/d01-vehicles-identity.test.ts and
 * tests/d01-fleet-fingerprint.test.ts, which are not touched; the check here
 * only makes the failure easier to read.
 *
 * The comparisons are exact: the data are typed in, nothing is computed.
 */
import { describe, expect, it } from 'vitest';
import { BOOSTER_BODIES, ENGINE_PARTS, STAGE_BODIES, enginePart, enginePartOf, engineSpec, stageSpec } from '../src/data/parts';
import { VEHICLES } from '../src/data/vehicles';

const BODIES = [...STAGE_BODIES, ...BOOSTER_BODIES];
const WIKIPEDIA = /^https?:\/\/[a-z-]+\.wikipedia\.org\//;

describe('D02/D03 engine masses: every figure has its sources', () => {
  it('gives every engine part a mass, with http(s) sources, what it includes and a note', () => {
    expect(ENGINE_PARTS).toHaveLength(55);
    for (const p of ENGINE_PARTS) {
      const m = p.mass;
      expect([p.id, m.kg === null || (Number.isFinite(m.kg) && m.kg > 0)]).toEqual([p.id, true]);
      expect([p.id, m.sources.length > 0 && m.sources.every((u) => /^https?:\/\/\S+$/.test(u))]).toEqual([p.id, true]);
      expect([p.id, m.what.trim().length > 0, m.note.trim().length > 0]).toEqual([p.id, true, true]);
    }
  });

  it('leaves a mass null only where no source publishes one, and says why', () => {
    const nulls = ENGINE_PARTS.filter((p) => p.mass.kg === null);
    expect(nulls.map((p) => p.id).sort()).toEqual(['curie', 'l25', 'psomxl', 'raptor2-rvac']);
    for (const p of ENGINE_PARTS) expect([p.id, p.mass.kg === null]).toEqual([p.id, p.mass.basis === 'unpublished']);
    // the reason is in the note, as the verifier gave it
    for (const p of nulls) expect([p.id, /\bno\b|\bnot published\b|unpublished/i.test(p.mass.note)]).toEqual([p.id, true]);
  });

  it('labels Wikipedia-only and inferred figures as such', () => {
    const count = (basis: string) => ENGINE_PARTS.filter((p) => p.mass.basis === basis).length;
    expect({
      published: count('published'), secondary: count('secondary'), wikipediaOnly: count('wikipediaOnly'),
      inferred: count('inferred'), unpublished: count('unpublished'),
    }).toEqual({ published: 32, secondary: 6, wikipediaOnly: 5, inferred: 8, unpublished: 4 });
    for (const p of ENGINE_PARTS) {
      const m = p.mass;
      // a Wikipedia-only figure has Wikipedia among its sources
      if (m.basis === 'wikipediaOnly') expect([p.id, m.sources.some((u) => WIKIPEDIA.test(u))]).toEqual([p.id, true]);
      // a figure whose every source is an encyclopedia cannot be called published or secondary
      if (m.sources.every((u) => WIKIPEDIA.test(u))) expect([p.id, ['wikipediaOnly', 'inferred', 'unpublished'].includes(m.basis)]).toEqual([p.id, true]);
      // an inference says so in the note, and so does a low-confidence figure
      if (m.basis === 'inferred') expect([p.id, m.note.startsWith('INFERRED') || m.note.includes('INFERRED')]).toEqual([p.id, true]);
      if (m.lowConfidence) expect([p.id, m.note.includes('LOW CONFIDENCE')]).toEqual([p.id, true]);
    }
    expect(ENGINE_PARTS.filter((p) => p.mass.lowConfidence).map((p) => p.id).sort()).toEqual(['be4', 'mvac', 'vinci']);
  });

  it('keeps the data frozen with the part', () => {
    for (const p of ENGINE_PARTS) expect([p.id, Object.isFrozen(p.mass) && Object.isFrozen(p.mass.sources)]).toEqual([p.id, true]);
  });
});

describe('D02/D03 engine masses: what a figure means', () => {
  it('gives a solid motor its inert mass, which belongs to the motor’s own body', () => {
    for (const p of ENGINE_PARTS.filter((x) => x.solid)) {
      expect([p.id, p.mass.what.startsWith('INERT'), p.mass.what.includes('belongs to the motor’s own body')]).toEqual([p.id, true, true]);
    }
    // Recorded, not tuned: each solid body's dry mass beside its motor's
    // published inert mass. Five agree exactly; the rest are where the sources
    // and the flown data draw the line differently (the notes say which), and
    // the flown data are not changed by this data.
    const row = (kind: string) => (b: (typeof BODIES)[number]) => [`${kind} ${b.id} (${b.engine.part})`, [b.dryMass, enginePart(b.engine.part).mass.kg]];
    const solid = (b: (typeof BODIES)[number]) => enginePart(b.engine.part).solid === true;
    const table = Object.fromEntries([...STAGE_BODIES.filter(solid).map(row('stage')), ...BOOSTER_BODIES.filter(solid).map(row('strap-on'))]);
    expect(table).toEqual({
      'stage p120c (p120c)': [11200, 11200], 'stage z40 (zefiro40)': [3230, 3230], 'stage z9 (zefiro9)': [929, 929],
      'stage ps1 (s139)': [30200, 30200], 'stage ps3 (hps3)': [1100, 1100],
      'strap-on gem63 (gem63)': [5100, 5035], 'strap-on gem63xl (gem63xl)': [5177, 5352], 'strap-on p120c (p120c)': [13000, 11200],
      'strap-on srba (srba3)': [8700, 10600], 'strap-on srb3 (srb3)': [8700, 9000],
      'strap-on psomg (psomxl)': [2010, null], 'strap-on psoma (psomxl)': [2010, null],
    });
  });

  it('never gives a liquid stage engines heavier than the stage that carries them', () => {
    // A sanity bound on the new data against the flown data: the dry mass
    // includes the engines, so count × mass must be below it. The margin is
    // recorded (smallest share of dry mass left for the rest of the stage).
    let tightest = { id: '', rest: Infinity };
    for (const b of BODIES) {
      const p = enginePart(b.engine.part);
      if (p.solid || p.mass.kg === null) continue;
      const engines = b.engine.count * p.mass.kg;
      expect([b.id, engines < b.dryMass]).toEqual([b.id, true]);
      const rest = 1 - engines / b.dryMass;
      if (rest < tightest.rest) tightest = { id: b.id, rest };
    }
    // Vulcan's first stage: two BE-4 at the low-confidence 5 400 kg are 38 % of its 28 600 kg
    expect(tightest.id).toBe('v1');
    expect(tightest.rest).toBe(1 - 10800 / 28600);
  });
});

describe('D02/D03 engine masses: never flown', () => {
  it('emits no mass into any EngineSpec, so the catalogue specs are unchanged', () => {
    const ENGINE_FIELDS = new Set(['name', 'count', 'thrustSL', 'thrustVac', 'ispSL', 'ispVac', 'minThrottle', 'solid', 'peakFactor', 'vacuumOnly', 'startupS', 'tailoffS']);
    for (const p of ENGINE_PARTS) expect(Object.keys(engineSpec(p, 1)).filter((k) => !ENGINE_FIELDS.has(k))).toEqual([]);
    for (const v of VEHICLES) {
      for (const st of v.stages) {
        for (const e of [st.engine, ...(st.boosters ?? []).map((b) => b.engine)]) {
          expect(Object.keys(e).filter((k) => !ENGINE_FIELDS.has(k))).toEqual([]);
        }
      }
    }
  });

  it('finds the engine part a spec’s engine was emitted from, and none for an engine a designer changed', () => {
    for (const b of BODIES) expect([b.id, enginePartOf(stageSpec(b).engine)?.id]).toEqual([b.id, b.engine.part]);
    for (const v of VEHICLES) {
      for (const st of v.stages) expect([v.id, st.id, enginePartOf(st.engine) !== null]).toEqual([v.id, st.id, true]);
    }
    const merlin = engineSpec('merlin1d', 9);
    expect(enginePartOf({ ...merlin, count: 7 })?.id).toBe('merlin1d');
    expect(enginePartOf({ ...merlin, thrustVac: merlin.thrustVac + 1 })).toBeNull();
    expect(enginePartOf({ ...merlin, minThrottle: undefined })).toBeNull();
    const { minThrottle: _, ...noThrottle } = merlin;
    expect(enginePartOf(noThrottle)).toBeNull();
    // RD-0124 and RD-0124A differ only in minThrottle, and each is found as itself
    expect(enginePartOf(engineSpec('rd0124', 1))?.id).toBe('rd0124');
    expect(enginePartOf(engineSpec('rd0124a', 1))?.id).toBe('rd0124a');
  });
});
