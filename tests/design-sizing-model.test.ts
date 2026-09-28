/**
 * The Engineer level's sizing page (roadmap D05) as data,
 * src/design/sizing-model.ts, on top of the sizing that
 * tests/design-sizing.test.ts holds to the planner and the flight model.
 *
 * Fixed before the first run:
 * - the page starts on the very request design-sizing.test.ts sizes and
 *   flies (1 t to the 500 km preset from Kourou);
 * - every engine the page offers a stage is one `sizeVehicle` sizes with
 *   (it never refuses one for what it is: solid, lumped, vacuum on the pad);
 * - every refusal and every estimate is said in en, ru and th with the
 *   numbers its sentence needs, the whole-vehicle ones once;
 * - "Open in the builder": the sized vehicle opens in the Explore level's
 *   parts builder, and the builder rebuilds exactly it, field for field;
 * - "Check readiness": the review flies the mission it was sized for. The
 *   outcome is a finding recorded in design-sizing.test.ts (it runs out of
 *   propellant at the bare design Δv, reaches orbit at +500 m/s); here it is
 *   checked that the review's checklist says so, and that the verdict still
 *   fails for want of a payload rating until one is computed.
 */
import { describe, expect, it } from 'vitest';
import { enginePart } from '../src/data/parts';
import { orbitById } from '../src/data/orbits';
import { SizingRefused, sizeVehicle, type SizingRequest } from '../src/design/sizing';
import {
  SIZING_ESTIMATE_KEYS, SIZING_MAX_STAGES, SIZING_REFUSAL_KEYS, SIZING_TEXT_KEYS, defaultSizingRequest, nextSizingStage, sizedReviewChoice,
  sizingEngines, sizingEstimateTexts, sizingOutcome,
} from '../src/design/sizing-model';
import { draftFromSpec, partsResult, sameSpec, type Draft, type PartsEdit } from '../src/design/explore-model';
import { readiness } from '../src/design/readiness';
import { checklist, reviewMission } from '../src/design/review-model';
import { MAX_STAGES } from '../src/config/vehicle-spec';
import { expectKey, expectSayable } from './sayable-harness';

const FROM = new Date(Date.UTC(2026, 8, 15, 12, 0, 0));

describe('the page’s first request', () => {
  it('is the 1 t launcher design-sizing.test.ts sizes and flies, and it sizes', () => {
    const req = defaultSizingRequest();
    expect(req).toMatchObject({
      payloadKg: 1000, orbit: orbitById('leo'), siteId: 'kourou', extraDvMps: 0,
      stages: [
        { enginePart: 'rutherford', epsilon: 0.08, diameterM: 1.8, targetTW: 1.3 },
        { enginePart: 'rutherford-vac', epsilon: 0.09, diameterM: 1.8, targetTW: 0.7 },
      ],
    });
    const out = sizingOutcome(req);
    expect(out.ok).toBe(true);
    expect(SIZING_MAX_STAGES).toBeLessThanOrEqual(MAX_STAGES);
    expect(nextSizingStage(req.stages[1])).toMatchObject({ enginePart: 'rutherford-vac', diameterM: 1.8, targetTW: 0.7 });
  });
});

describe('the engines a stage may take', () => {
  it('are liquid single engines, never a vacuum one on the first stage, and sizeVehicle takes every one', () => {
    const first = sizingEngines(0), upper = sizingEngines(1);
    expect(first.length).toBeGreaterThan(10);
    expect(first.some((p) => p.vacuumOnly)).toBe(false);
    expect(upper.some((p) => p.vacuumOnly)).toBe(true);
    for (const p of upper) {
      expect(p.solid, p.id).toBeFalsy();
      expect(p.kind, p.id).toBe('engine');
    }
    const base = defaultSizingRequest();
    for (const [i, list] of [[0, first], [1, upper]] as const) {
      for (const p of list) {
        const stages = base.stages.map((s, k) => (k === i ? { ...s, enginePart: p.id } : s));
        try {
          sizeVehicle({ ...base, stages });
        } catch (e) {
          expect(e, `${i} ${p.id}`).toBeInstanceOf(SizingRefused);
          // sized with, not refused for what it is
          expect(['solidMotor', 'lumpedEngine', 'vacuumEngineOnPad', 'unknownPart'], `${i} ${p.id}`).not.toContain((e as SizingRefused).code);
        }
      }
    }
  });
});

describe('what the page says', () => {
  const small = defaultSizingRequest();

  it('says every refusal in words, the staging problems with the staging page’s sentences and numbers', () => {
    const cases: [SizingRequest, string][] = [
      [{ ...small, stages: [] }, 'noStages'],
      [{ ...small, stages: [{ ...small.stages[0], enginePart: 'p120c' }, small.stages[1]] }, 'solidMotor'],
      [{ ...small, stages: [{ ...small.stages[0], enginePart: 'mvac' }, small.stages[1]] }, 'vacuumEngineOnPad'],
      [{ ...small, stages: [{ ...small.stages[0], enginePart: 'yf21c' }, small.stages[1]] }, 'lumpedEngine'],
      [{ ...small, stages: [{ ...small.stages[0], epsilon: 1.2 }, small.stages[1]] }, 'badInput'],
      [{ ...small, siteId: 'atlantis' }, 'unknownSite'],
      [{ ...small, stages: [{ ...small.stages[0], epsilon: 0.3 }] }, 'beyondLimit'],
      [{ ...small, payloadKg: 150000, stages: [{ ...small.stages[0], targetTW: 3 }, small.stages[1]] }, 'tooManyEngines'],
    ];
    for (const [req, code] of cases) {
      const out = sizingOutcome(req);
      expect(out.ok, code).toBe(false);
      if (out.ok) continue;
      expect(out.code).toBe(code);
      expectSayable(out.refusal);
      if (code === 'beyondLimit') expect(out.refusal.values.limit).toBeDefined();
    }
    for (const key of Object.values(SIZING_REFUSAL_KEYS)) expectKey(key);
    for (const key of SIZING_TEXT_KEYS) expectKey(key);
  });

  it('says the estimates and defaults once each, the lengths once for the whole vehicle', () => {
    const out = sizingOutcome(small);
    if (!out.ok) throw new Error('refused');
    const said = sizingEstimateTexts(out.sizing, small);
    for (const s of said) expectSayable(s);
    const keys = said.map((s) => s.key);
    expect(new Set(keys.map((k, i) => `${k}|${JSON.stringify(said[i].subject)}`)).size).toBe(keys.length);
    expect(keys.filter((k) => k === 'build.eng.size.est.lengthFromVolume').length).toBe(1);
    expect(keys.filter((k) => k === SIZING_ESTIMATE_KEYS.lengthAllowance).length).toBe(1);
    expect(keys).toEqual(expect.arrayContaining([SIZING_ESTIMATE_KEYS.fairingChosen, SIZING_ESTIMATE_KEYS.lastStageRestartable, 'build.est.noRatings']));
    // the restart is the last stage's
    expect(said.find((s) => s.key === SIZING_ESTIMATE_KEYS.lastStageRestartable)?.subject).toEqual({ kind: 'stage', n: 2 });
    // ranked: warnings, estimates, defaults
    const rank = { fail: 0, warn: 1, note: 2, default: 3 };
    expect(said.map((s) => rank[s.level])).toEqual([...said.map((s) => rank[s.level])].sort((a, b) => a - b));
  });

  it('warns when the engines chosen outweigh the structure ε leaves them', () => {
    // RD-191 is heavy for a small stage: ε 0.03 of a 1 t launcher's first stage is less than one engine's 2.3 t
    const req: SizingRequest = { ...small, stages: [{ enginePart: 'rd191', epsilon: 0.03, diameterM: 2, targetTW: 1.3 }, small.stages[1]] };
    const out = sizingOutcome(req);
    if (!out.ok) throw new Error(`refused ${out.code}`);
    const warn = sizingEstimateTexts(out.sizing, req).filter((s) => s.key === SIZING_ESTIMATE_KEYS.enginesOutweighStructure);
    expect(warn.map((w) => [w.level, w.subject])).toEqual([['warn', { kind: 'stage', n: 1 }]]);
    const v = warn[0].values as Record<string, { value: number }>;
    expect(v.engines.value).toBe((enginePart('rd191').mass.kg ?? 0) * out.sizing.stages[0].engines);
    expect(v.engines.value).toBeGreaterThanOrEqual(v.dry.value);
  });
});

describe('what the sized launcher goes on to', () => {
  it('opens in the Explore level’s parts builder, which rebuilds exactly it', () => {
    for (const req of [defaultSizingRequest(), { ...defaultSizingRequest(), extraDvMps: 500, fairing: null }, {
      ...defaultSizingRequest(), payloadKg: 3000, orbit: orbitById('sso'), siteId: 'vandenberg',
      stages: [
        { enginePart: 'merlin1d', epsilon: 0.06, diameterM: 3.66, targetTW: 1.3 },
        { enginePart: 'mvac', epsilon: 0.07, diameterM: 3.66, targetTW: 0.8 },
        { enginePart: 'rl10c1', epsilon: 0.12, diameterM: 3.05, targetTW: 0.4 },
      ],
    } satisfies SizingRequest]) {
      const out = sizingOutcome({ ...req, id: 'sized-t1', name: 'Sized' });
      if (!out.ok) throw new Error('refused');
      const opened = draftFromSpec(out.sizing.spec, null);
      expect(opened.mode).toBe('parts');
      const rebuilt = partsResult(opened.draft as Draft<PartsEdit>);
      if (!rebuilt.ok) throw new Error('rebuild refused');
      expect(sameSpec(rebuilt.spec, out.sizing.spec)).toBe(true);
    }
  });

  it('is reviewed for the mission it was sized for; bare, its test flight runs dry short of orbit (the recorded finding)', () => {
    const run = (extraDvMps: number) => {
      const req = { ...defaultSizingRequest(), extraDvMps };
      const out = sizingOutcome(req);
      if (!out.ok) throw new Error('refused');
      const spec = out.sizing.spec;
      const c = sizedReviewChoice(req);
      expect(c).toEqual({ orbitId: 'leo', siteId: 'kourou', payloadKg: 1000, sixDof: false });
      const r = readiness(spec, reviewMission(spec, c, FROM));
      return { r, list: checklist(spec, r) };
    };
    const bare = run(0);
    expect(bare.r.canFly).toBe(false);
    const probe = bare.list.find((s) => s.id === 'probe')!.rows[0].text!;
    expect(probe.key).toBe(bare.r.insertion!.bestPerigee >= 0 ? 'build.eng.review.probe.noOrbit' : 'build.eng.review.probe.noOrbitNever');
    expect(probe.values.end).toEqual({ key: 'build.eng.review.end.outOfPropellant' });
    const margin = run(500);
    expect(margin.list.find((s) => s.id === 'probe')!.rows[0].text?.key).toBe('build.eng.review.probe.orbit');
    // no payload rating yet: the Launch panel's verdict cannot call it ready
    expect(margin.r.verdict?.cause).toBe('noRating');
  });
});
