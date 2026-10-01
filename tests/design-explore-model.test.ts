/**
 * The Build section's Explore level as data (roadmap D02, D03),
 * src/design/explore-model.ts.
 *
 * What it promises, and how each is checked (all identities, fixed before the
 * first run; no tolerance anywhere in this file):
 * - a remix with no change is the catalogue vehicle itself under the draft's
 *   id and name, and its stage-by-stage figures are the catalogue vehicle's
 *   exactly, for all 21 (`toStrictEqual` on the whole table);
 * - state → vehicle → saved (as JSON, as the design store and a design file
 *   keep it) → opened → vehicle gives the same vehicle, field for field, for
 *   all 21 catalogue copies, for remixes of every op, for a remix of a saved
 *   remix, and for parts designs; a parts design opens in the parts builder
 *   with the same choices it was made of;
 * - what the remix and the assembly refuse comes back as a refusal with its
 *   code and where, not as an exception;
 * - the engines offered are never a lumped or cluster entry (but the one a
 *   stage has), never another propellant family, never a vacuum engine on
 *   the pad, and a solid stage's motor is never swapped;
 * - computed ratings apply to the vehicle they were computed for, and to no
 *   other.
 */
import { describe, expect, it } from 'vitest';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { ENGINE_PARTS, enginePart, enginePartOf } from '../src/data/parts';
import { PART_ID_PATTERN, vehicleSpecProblems } from '../src/config/vehicle-spec';
import { remix } from '../src/design/remix';
import { stageTable, watchPayload } from '../src/design/stage-table';
import {
  DesignStoreError, LocalDesignStore, designDocument, designFileText, parseDesignDocument, readDesignFileText, type DesignStorage,
} from '../src/design/design-store';
import {
  asOwnBody, designChecks, draftFromSpec, engineOptions, exploreChecks, fitEngine, newDesignId, newStage, partsDraft, partsEngineOptions,
  partsResult, ratingsSignature, remixDraft, remixEngineOptions, remixOps, remixResult, sameSpec,
  type Draft, type DesignResult, type PartsEdit, type RemixEdit,
} from '../src/design/explore-model';
import type { VehicleSpec } from '../src/types';

const built = (r: DesignResult): VehicleSpec => {
  if (!r.ok) throw new Error(`refused: ${JSON.stringify(r.refusal)}`);
  return r.spec;
};
/** Through JSON, as the design store and a design file keep a design. */
const viaJson = (spec: VehicleSpec): VehicleSpec => JSON.parse(JSON.stringify(spec)) as VehicleSpec;
/** Open a saved vehicle and build it again. */
function reopen(spec: VehicleSpec) {
  const back = draftFromSpec(viaJson(spec), 'rec-1');
  return { back, spec: built(back.mode === 'remix' ? remixResult(back.draft) : partsResult(back.draft)) };
}

function remixOf(id: string, change: (e: RemixEdit) => void = () => {}): Draft<RemixEdit> {
  const d = remixDraft(id, `${id}-remix-t1`, `${vehicleById(id).name} remix`);
  change(d.edit);
  return d;
}
function partsOf(change: (e: PartsEdit) => void = () => {}): Draft<PartsEdit> {
  const d = partsDraft('parts-t1', 'Parts test');
  change(d.edit);
  return d;
}

/** Parts designs of every kind the builder makes. */
function partsCases(): [string, Draft<PartsEdit>][] {
  return [
    ['Falcon 9 bodies (the builder\'s first design)', partsOf()],
    ['bodies of one\'s own, strap-ons, another fairing, another site', partsOf((e) => {
      e.stages = [newStage(0), newStage(1)];
      e.groups = [{ body: 'gem63', count: 2 }];
      e.fairing = { part: 'vegac' };
      e.sites = ['kourou'];
    })],
    ['a catalogue body with another engine, a body used twice, no fairing', partsOf((e) => {
      e.stages = [
        { body: { kind: 'catalogue', id: 's1' }, engine: { part: 'rd180', count: 2 } },
        { body: { kind: 'catalogue', id: 's2' }, engine: { part: 'mvac', count: 1 } },
        { body: { kind: 'catalogue', id: 's2' }, engine: { part: 'rd0124', count: 1 } },
      ];
      e.fairing = null;
    })],
    ['three stages: hydrolox core with solids, a swapped upper, a hypergolic body of one\'s own', partsOf((e) => {
      e.sites = ['tanegashima'];
      e.stages = [
        { body: { kind: 'catalogue', id: 'h3s1' }, engine: { part: 'le9', count: 2 } },
        { body: { kind: 'catalogue', id: 'h3s2' }, engine: { part: 'rl10c11', count: 1 } },
        { body: { kind: 'own', body: { dryMass: 1000, propellantMass: 5000, diameter: 3, length: 2, family: 'hypergolic', name: 'Kick' } }, engine: { part: 's598m', count: 1 } },
      ];
      e.groups = [{ body: 'srb3', count: 2 }, { body: 'srb3', count: 2 }];
      e.fairing = { part: 'h3', sepAltitude: 150e3 };
    })],
    ['a solid first stage of one\'s own', partsOf((e) => {
      e.stages = [
        { body: { kind: 'own', body: { dryMass: 12000, propellantMass: 140000, diameter: 3.4, length: 14, family: 'solid' } }, engine: { part: 'p120c', count: 1 } },
        { body: { kind: 'catalogue', id: 'z40' }, engine: { part: 'zefiro40', count: 1 } },
        { body: { kind: 'catalogue', id: 'avum' }, engine: { part: 'avum-plus', count: 1 } },
      ];
      e.fairing = { part: 'vegac' };
      e.sites = ['kourou'];
    })],
  ];
}

describe('a remix with no change is the catalogue vehicle (D02)', () => {
  it('builds each of the 21 as the catalogue vehicle under the draft\'s id and name, with its published ratings and no estimate', () => {
    for (const v of VEHICLES) {
      const d = remixOf(v.id);
      expect(remixOps(v, d.edit)).toEqual([]);
      const r = remixResult(d);
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      expect(r.spec, v.id).toStrictEqual(remix(v, [], d.id, d.name).spec);
      expect({ ...r.spec, id: v.id, name: v.name, derivedFrom: undefined }).toEqual({ ...v, derivedFrom: undefined });
      expect(r.ratings, v.id).toBe('published');
      expect(r.estimates, v.id).toEqual([]);
      expect(vehicleSpecProblems(r.spec), v.id).toEqual([]);
      expect(d.payloadKg).toBe(watchPayload(v));
    }
  });

  it('shows exactly the catalogue vehicle\'s stage-by-stage figures at the Watch level\'s payload', () => {
    for (const v of VEHICLES) {
      const r = built(remixResult(remixOf(v.id)));
      expect(stageTable(r, watchPayload(v)), v.id).toStrictEqual(stageTable(v, watchPayload(v)));
    }
  });
});

describe('state → vehicle → saved → opened → vehicle', () => {
  it('opens each of the 21 unchanged remixes as the vehicle saved, still with its published ratings', () => {
    for (const v of VEHICLES) {
      const spec = built(remixResult(remixOf(v.id)));
      const { back, spec: again } = reopen(spec);
      expect(again, v.id).toEqual(spec);
      expect(back.draft.recordId).toBe('rec-1');
      expect(back.draft.id).toBe(spec.id);
      expect(back.draft.name).toBe(spec.name);
      const r = back.mode === 'remix' ? remixResult(back.draft) : partsResult(back.draft);
      expect(r.ok && r.ratings, v.id).toBe('published');
    }
  });

  it('opens a remix of every op as the vehicle saved, as the base of a remix with nothing changed', () => {
    const cases: [string, Draft<RemixEdit>][] = [
      ['Falcon 9, second stage stretched 25 %', remixOf('falcon9', (e) => { e.stages[1].stretch = 1.25; })],
      ['Falcon 9, first stage on two RD-180, second on an RD-0124', remixOf('falcon9', (e) => {
        e.stages[0].engine = { part: 'rd180', count: 2 };
        e.stages[1].engine = { part: 'rd0124', count: 1 };
      })],
      ['Soyuz-2.1a, its strap-ons off and four GEM-63 on', remixOf('soyuz21a', (e) => { e.removedGroups = [0]; e.addedGroups = [{ body: 'gem63', count: 4 }]; })],
      ['Atlas V 551, Vulcan\'s fairing and a shorter core', remixOf('atlasv551', (e) => { e.fairing = 'vulcan'; e.stages[0].stretch = 0.8; })],
      ['Ariane 64 with half its strap-ons\' groups kept and a stretched upper stage', remixOf('ariane64', (e) => { e.stages[1].stretch = 1.5; })],
      ['Electron with 12 engines', remixOf('electron', (e) => { e.stages[0].engine = { part: 'rutherford', count: 12 }; })],
    ];
    for (const [what, d] of cases) {
      const r = remixResult(d);
      expect(r.ok, what).toBe(true);
      if (!r.ok) continue;
      expect(r.ratings, what).toBe('base');
      expect(r.estimates.map((e) => e.code), what).toContain('originRatings');
      expect(vehicleSpecProblems(r.spec), what).toEqual([]);
      const { back, spec } = reopen(r.spec);
      expect(back.mode, what).toBe('remix');
      expect(spec, what).toEqual(r.spec);
    }
  });

  it('remixes a saved remix again: the second stretch starts from the first', () => {
    const first = built(remixResult(remixOf('falcon9', (e) => { e.stages[1].stretch = 1.25; })));
    const back = draftFromSpec(viaJson(first), null);
    expect(back.mode).toBe('remix');
    const d = back.draft as Draft<RemixEdit>;
    d.edit.stages[1].stretch = 1.2;
    const second = built(remixResult(d));
    expect(second.stages[1].propellantMass).toBeCloseTo(vehicleById('falcon9').stages[1].propellantMass * 1.25 * 1.2, 6);
    expect(second.derivedFrom).toBe('falcon9');
    expect(reopen(second).spec).toEqual(second);
  });

  it('opens a parts design in the parts builder, with the choices it was made of, as the vehicle saved', () => {
    for (const [what, d] of partsCases()) {
      const r = partsResult(d);
      expect(r.ok, what).toBe(true);
      if (!r.ok) continue;
      expect(vehicleSpecProblems(r.spec), what).toEqual([]);
      const { back, spec } = reopen(r.spec);
      expect(back.mode, what).toBe('parts');
      expect(back.draft.edit, what).toEqual(d.edit);
      expect(spec, what).toEqual(r.spec);
    }
  });

  it('keeps a design whole through the design store and a design file', async () => {
    const data = new Map<string, string>();
    const storage: DesignStorage = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); } };
    let n = 0;
    const store = new LocalDesignStore(() => storage, () => new Date('2026-09-28T00:00:00Z'), () => `rec-${++n}`);
    for (const d of [remixOf('falcon9', (e) => { e.stages[1].stretch = 1.4; }), partsCases()[3][1]]) {
      const spec = built('base' in d.edit ? remixResult(d as Draft<RemixEdit>) : partsResult(d as Draft<PartsEdit>));
      const saved = await store.save({ kind: 'vehicle', name: spec.name, design: spec });
      const kept = await store.get(saved.id);
      const opened = draftFromSpec(kept!.design as VehicleSpec, kept!.id);
      expect(built(opened.mode === 'remix' ? remixResult(opened.draft) : partsResult(opened.draft))).toEqual(spec);
      const file = parseDesignDocument(readDesignFileText(designFileText(designDocument(saved))));
      expect(file.issues).toEqual([]);
      expect(file.input!.design).toEqual(spec);
    }
    // the store refuses a design with no name, with its own code
    await expect(store.save({ kind: 'vehicle', name: ' ', design: built(partsResult(partsOf())) })).rejects.toBeInstanceOf(DesignStoreError);
  });
});

describe('refused, with the reason (D02, D03)', () => {
  const refusal = (r: DesignResult) => (r.ok ? null : r.refusal);

  it('refuses a remix the remix refuses, with its code and the stage it is about', () => {
    expect(refusal(remixResult(remixOf('longmarch3be', (e) => { e.stages[2].engine = { part: 'yf75', count: 2 }; }))))
      .toMatchObject({ code: 'lumpedRecount', stage: 2 });
    expect(refusal(remixResult(remixOf('falcon9', (e) => { e.stages[1].engine = { part: 'rl10c11', count: 1 }; }))))
      .toMatchObject({ code: 'familyMismatch', stage: 1 });
    expect(refusal(remixResult(remixOf('falcon9', (e) => { e.stages[0].engine = { part: 'mvac', count: 1 }; }))))
      .toMatchObject({ code: 'vacuumEngineOnPad', stage: 0 });
    expect(refusal(remixResult(remixOf('vegac', (e) => { e.stages[0].engine = { part: 'zefiro40', count: 1 }; }))))
      .toMatchObject({ code: 'solidMotor', stage: 0 });
    expect(refusal(remixResult(remixOf('falcon9', (e) => { e.stages[0].engine = { part: 'merlin1d', count: 51 }; }))))
      .toMatchObject({ code: 'badCount', stage: 0 });
    expect(refusal(remixResult(remixOf('soyuz21a', (e) => { e.addedGroups = [1, 2, 3, 4].map(() => ({ body: 'gem63', count: 2 })); }))))
      .toMatchObject({ code: 'tooManyGroups' });
    // Super Heavy twice as long is past the validator's 100 m: out of limits, on stage 1
    const long = refusal(remixResult(remixOf('starship', (e) => { e.stages[0].stretch = 2; })));
    expect(long?.code).toBe('outOfLimits');
    expect(long?.detail).toBeTypeOf('string');
  });

  it('refuses a parts design the assembly refuses, and says which field of a body of one\'s own is wrong', () => {
    expect(refusal(partsResult(partsOf((e) => { e.stages = []; })))).toMatchObject({ code: 'noStages' });
    expect(refusal(partsResult(partsOf((e) => { e.stages = [0, 1, 2, 3, 4, 5, 6].map((i) => newStage(i)); })))).toMatchObject({ code: 'tooManyStages' });
    expect(refusal(partsResult(partsOf((e) => { e.stages[1] = { body: { kind: 'catalogue', id: 's2' }, engine: { part: 'rl10c11', count: 1 } }; }))))
      .toMatchObject({ code: 'familyMismatch', stage: 1 });
    expect(refusal(partsResult(partsOf((e) => { e.stages[0] = { ...newStage(0), engine: { part: 'mvac', count: 1 } }; }))))
      .toMatchObject({ code: 'vacuumEngineOnPad', stage: 0 });
    expect(refusal(partsResult(partsOf((e) => { e.stages[1] = { body: { kind: 'own', body: { dryMass: 2000, propellantMass: 18000, diameter: 3, length: 12, family: 'hydrolox' } }, engine: { part: 'yf75', count: 2 } }; }))))
      .toMatchObject({ code: 'lumpedRecount', stage: 1 });
    const zero = partsOf((e) => { e.stages[1] = newStage(1); (e.stages[1].body as { body: { dryMass: number } }).body.dryMass = 0; });
    expect(refusal(partsResult(zero))).toEqual({ code: 'fieldRange', stage: 1, field: 'dryMass', min: 0, max: 1e6 });
    const wide = partsOf((e) => { e.stages[0] = newStage(0); (e.stages[0].body as { body: { diameter: number } }).body.diameter = 16; });
    expect(refusal(partsResult(wide))).toEqual({ code: 'fieldRange', stage: 0, field: 'diameter', min: 0, max: 15 });
    expect(refusal(partsResult({ ...partsOf(), name: '  ' }))).toEqual({ code: 'noName' });
    expect(refusal(partsResult({ ...partsOf(), payloadKg: Number.NaN }))).toEqual({ code: 'badPayload' });
  });
});

describe('the engines a stage is offered', () => {
  it('offers, for every stage of the catalogue, its own engine first and otherwise only ordinary engines of its family, none of them vacuum engines on the pad', () => {
    for (const v of VEHICLES) {
      v.stages.forEach((st, i) => {
        const o = remixEngineOptions(v, i, null);
        const own = enginePartOf(st.engine)!;
        expect(o.options[0], `${v.id} ${i}`).toBe(own);
        if (own.solid) {
          expect(o.options).toEqual([own]);
          expect(o.swapLocked).toBe('solid');
          expect(o.countLocked).toBe('solid');
          return;
        }
        for (const p of o.options.slice(1)) {
          expect(p.kind, `${v.id} ${i} ${p.id}`).toBe('engine');
          expect(p.family).toBe(own.family);
          expect(p.solid).toBeFalsy();
          if (i === 0) expect(p.vacuumOnly, `${v.id} ${i} ${p.id}`).toBeFalsy();
        }
        // a lumped or cluster entry keeps its count; an ordinary engine does not
        expect(o.countLocked, `${v.id} ${i}`).toBe(own.kind === 'engine' ? null : own.kind);
      });
    }
  });

  it('says what it left out: lumped and cluster entries, and vacuum engines on the pad', () => {
    const cz3b = vehicleById('longmarch3be');
    // the only lumped hydrolox entry is the YF-75 the third stage has: nothing is left out
    expect(remixEngineOptions(cz3b, 2, null).leftOut.lumped).toBe(false);
    expect(remixEngineOptions(vehicleById('protonm'), 1, null).leftOut.lumped).toBe(true);
    expect(remixEngineOptions(vehicleById('falcon9'), 0, null).leftOut.vacuum).toBe(true);
    expect(remixEngineOptions(vehicleById('falcon9'), 1, null).leftOut.vacuum).toBe(false);
  });

  it('gives a body of one\'s own the engines of its family, and a solid body one motor', () => {
    const solid = engineOptions({ family: 'solid', installed: null, selected: null, groundLit: true, solidBody: true });
    expect(solid.options.length).toBeGreaterThan(0);
    expect(solid.options.every((p) => p.solid && p.kind === 'engine')).toBe(true);
    expect(solid.countLocked).toBe('solid');
    const hydrolox = partsEngineOptions({ body: { kind: 'own', body: { dryMass: 1, propellantMass: 1, diameter: 1, length: 1, family: 'hydrolox' } }, engine: { part: 'le9', count: 1 } }, 0);
    expect(hydrolox.options.every((p) => p.family === 'hydrolox' && !p.vacuumOnly && p.kind === 'engine')).toBe(true);
    expect(hydrolox.options.map((p) => p.id)).toContain('le9');
  });

  it('fits a stage with an engine it may carry when its body, its family or its place changes', () => {
    const own = newStage(1);
    // a vacuum engine moved to the bottom of the stack gives way to the first engine offered on the pad
    const moved = fitEngine(own, 0);
    expect(enginePart(moved.engine.part).vacuumOnly).toBeFalsy();
    expect(enginePart(moved.engine.part).family).toBe('kerolox');
    // a family changed to hydrolox takes a hydrolox engine; one changed to solid, a motor, once
    const ownBody = (own.body as Extract<typeof own.body, { kind: 'own' }>).body;
    const h = fitEngine({ ...own, body: { kind: 'own', body: { ...ownBody, family: 'hydrolox' } } }, 1);
    expect(enginePart(h.engine.part).family).toBe('hydrolox');
    const s = fitEngine({ ...own, engine: { part: 'rd0124', count: 3 }, body: { kind: 'own', body: { ...ownBody, family: 'solid' } } }, 1);
    expect(enginePart(s.engine.part).solid).toBe(true);
    expect(s.engine.count).toBe(1);
    // a catalogue body goes back to its own engine
    const c = fitEngine({ body: { kind: 'catalogue', id: 's2' }, engine: { part: 'rl10c11', count: 2 } }, 1);
    expect(c.engine).toEqual({ part: 'mvac', count: 1 });
    // a body made one's own keeps its figures, dry mass as flown
    const f9 = built(partsResult(partsOf()));
    const mine = asOwnBody(partsOf().edit.stages[1], f9.stages[1]);
    expect(mine.body).toEqual({ kind: 'own', body: { dryMass: 4300, propellantMass: 108000, diameter: 3.66, length: 15, family: 'kerolox' } });
  });

  it('never offers a lumped or cluster entry to swap to, anywhere in the catalogue', () => {
    const lumped = ENGINE_PARTS.filter((p) => p.kind !== 'engine');
    for (const v of VEHICLES) {
      v.stages.forEach((_, i) => {
        const offered = remixEngineOptions(v, i, null).options.slice(1);
        for (const p of lumped) expect(offered, `${v.id} ${i}`).not.toContain(p);
      });
    }
  });
});

describe('computed ratings', () => {
  it('apply to the vehicle they were computed for, and to no other', () => {
    const d = partsOf();
    const first = partsResult(d);
    if (!first.ok) throw new Error('refused');
    expect(first.ratings).toBe('none');
    expect(first.spec.payloadLEO).toBe(0);
    expect(first.estimates.map((e) => e.code)).toContain('noRatings');
    d.ratings = { signature: first.signature, payloadLEO: 12345, payloadGTO: 4321 };
    const rated = partsResult(d);
    if (!rated.ok) throw new Error('refused');
    expect(rated.ratings).toBe('computed');
    expect([rated.spec.payloadLEO, rated.spec.payloadGTO]).toEqual([12345, 4321]);
    expect(rated.estimates.map((e) => e.code)).not.toContain('noRatings');
    // the name and the payload are not the vehicle: the ratings stay
    const renamed = partsResult({ ...d, name: 'Another name', payloadKg: 1 });
    expect(renamed.ok && renamed.ratings).toBe('computed');
    // any change to the vehicle leaves them behind
    const changed = partsOf((e) => { e.stages[0].engine = { part: 'merlin1d', count: 8 }; });
    changed.ratings = d.ratings;
    const r = partsResult(changed);
    expect(r.ok && r.ratings).toBe('none');
  });

  it('replace a remix\'s base ratings, its SSO rating included, while the remix is unchanged', () => {
    const d = remixOf('falcon9', (e) => { e.stages[1].stretch = 1.3; });
    const base = remixResult(d);
    if (!base.ok) throw new Error('refused');
    expect(base.ratings).toBe('base');
    expect(base.ratingsOwner).toBe(vehicleById('falcon9').name);
    d.ratings = { signature: base.signature, payloadLEO: 20000, payloadGTO: 7000 };
    const rated = remixResult(d);
    if (!rated.ok) throw new Error('refused');
    expect(rated.ratings).toBe('computed');
    expect(rated.spec.payloadLEO).toBe(20000);
    expect(rated.spec.payloadSSO).toBeUndefined();
    expect(rated.estimates.map((e) => e.code)).not.toContain('originRatings');
    expect(ratingsSignature(rated.spec)).toBe(base.signature);
    // saved and opened again, they are still the vehicle's computed ones
    const { back, spec } = reopen(rated.spec);
    expect(spec).toEqual(rated.spec);
    const again = remixResult(back.draft as Draft<RemixEdit>);
    expect(again.ok && again.ratings).toBe('computed');
  });
});

describe('what the screen says about a design', () => {
  it('flags a stage of one\'s own lighter than its engines, and no catalogue stage', () => {
    const light = built(partsResult(partsOf((e) => {
      e.stages[0] = { body: { kind: 'own', body: { dryMass: 1000, propellantMass: 100000, diameter: 3, length: 20, family: 'kerolox' } }, engine: { part: 'rd180', count: 1 } };
    })));
    expect(exploreChecks(light)).toEqual([{ code: 'dryBelowEngines', level: 'warn', stage: 0, dryMass: 1000, enginesMass: 5480 }]);
    for (const v of VEHICLES) expect(exploreChecks(v), v.id).toEqual([]);
  });

  it('puts the fails first', () => {
    const d = remixOf('soyuz21a', (e) => { e.removedGroups = [0]; });
    const texts = designChecks(built(remixResult(d)), d.payloadKg);
    expect(texts[0].key).toBe('build.warn.noLiftoff');
    const levels = texts.map((x) => x.level);
    expect(levels.length).toBeGreaterThan(1);
    const firstOther = levels.findIndex((l) => l !== 'fail');
    expect(firstOther === -1 || levels.slice(firstOther).every((l) => l !== 'fail')).toBe(true);
  });

  it('gives a new design an id of its own, whatever its name', () => {
    const now = Date.UTC(2026, 8, 28);
    expect(newDesignId('Falcon 9 remix', now)).toMatch(/^falcon-9-remix-[a-z0-9]{1,6}$/);
    expect(newDesignId('จรวดของฉัน', now)).toMatch(/^design-[a-z0-9]{1,6}$/);
    expect(newDesignId('Моя ракета', now)).toMatch(/^design-[a-z0-9]{1,6}$/);
    expect(newDesignId('Ščéptre', now)).toMatch(/^sceptre-/);
    for (const name of ['falcon9', '-', '', 'x'.repeat(200), '   Saturn V   ', 'a/b\\c']) {
      const id = newDesignId(name, now);
      expect(PART_ID_PATTERN.test(id), name).toBe(true);
      expect(VEHICLES.some((v) => v.id === id), name).toBe(false);
    }
    expect(sameSpec({ a: 1, b: [1, { c: 2, d: 3 }] }, { b: [1, { d: 3, c: 2 }], a: 1 })).toBe(true);
  });
});
