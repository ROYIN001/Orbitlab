/**
 * The Engineer level's flight readiness review (roadmap D04) as the screen
 * shows it, src/design/review-model.ts: the mission built from the screen's
 * choices, the checklist the review's result is laid out as, and the
 * hand-over of the reviewed mission to the Launch section.
 *
 * All identities and "it happened" checks, fixed before the first run:
 * - the mission is the one tests/design-readiness.test.ts builds for the
 *   same choice (satellite, payload, guidance, launch time at the first
 *   window for a set plane);
 * - the checklist's fails are exactly the review's (`canFly` ⇔ no row fails),
 *   its verdict row is the review's verdict, and every sentence it names can
 *   be said in en, ru and th with the numbers it is given;
 * - `readinessVerdict` is the review's verdict, text and all;
 * - the hand-over is taken whole by the Launch panel's own parser, with the
 *   orbit, site, launch time and dynamics of the mission reviewed, a
 *   catalogue vehicle by its id alone and a design with its spec.
 */
import { describe, expect, it } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { siteById } from '../src/data/sites';
import { satelliteById } from '../src/data/satellites';
import { launchWindows } from '../src/physics/mission';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { readiness, readinessVerdict } from '../src/design/readiness';
import {
  CHECKLIST_SECTIONS, PROBE_END_KEYS, PROBE_END_OTHER, REVIEW_ORBITS, checklist, checklistCounts, defaultReviewChoice, fitReviewChoice,
  reviewChoiceProblem, reviewHandoff, reviewLaunchTime, reviewMission, reviewSites, type ReviewChoice,
} from '../src/design/review-model';
import { remixDraft, remixResult } from '../src/design/explore-model';
import { missionFileText, parseMissionDocument, type MissionState } from '../src/config/mission-file';
import { defaultDynamics } from '../src/physics/rigid/config';
import type { VehicleSpec } from '../src/types';
import { copyOf } from './custom-vehicle-harness';
import { expectKey, expectSayable } from './sayable-harness';

const FROM = new Date(Date.UTC(2026, 8, 15, 12, 0, 0));

/** Falcon 9 remixed with its second stage stretched to `stretch` (the Explore level's own draft). */
function stretchedFalcon(stretch: number): VehicleSpec {
  const d = remixDraft('falcon9', 'falcon-9-remix-r1', 'Falcon 9 remix');
  d.edit.stages[1].stretch = stretch;
  const r = remixResult(d);
  if (!r.ok) throw new Error('refused');
  return r.spec;
}

const onThePanel = (): MissionState => ({
  vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbitId: 'iss', orbit: { ...orbitById('iss') },
  launchTime: new Date('2026-09-28T09:00:00Z'), guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE },
  boosterRecovery: false, payloadMass: satelliteById('crew').mass, dynamics: defaultDynamics('soyuz21a'), padId: 'site31',
});

/** Everything a checklist promises, for one review. */
function expectChecklist(spec: VehicleSpec, r: ReturnType<typeof readiness>): ReturnType<typeof checklist> {
  const list = checklist(spec, r);
  expect(list.map((s) => s.id)).toEqual(CHECKLIST_SECTIONS);
  for (const s of list) {
    expect(s.rows.length, s.id).toBeGreaterThan(0);
    for (const row of s.rows) if (row.text) expectSayable(row.text);
  }
  expect(checklistCounts(list).fail === 0).toBe(r.canFly);
  const verdict = list.find((s) => s.id === 'verdict')!;
  if (r.verdict) expect(verdict.rows).toEqual([{ level: r.verdict.level, text: null }]);
  return list;
}

describe('the review’s mission, from the screen’s choices', () => {
  it('is the mission the readiness tests fly: the dispenser at the payload, the vehicle’s guidance, the first window for a set plane', () => {
    const spec = vehicleById('falcon9');
    for (const orbitId of ['leo', 'iss', 'sso']) {
      const c: ReviewChoice = { orbitId, siteId: 'cape', payloadKg: 5000, sixDof: false };
      const m = reviewMission(spec, c, FROM);
      const orbit = orbitById(orbitId);
      const t = orbit.raanMode === 'free' ? FROM : launchWindows(orbit, siteById('cape'), FROM, 1)[0].time;
      expect(m).toEqual({
        satelliteId: 'cubesats', siteId: 'cape', orbit, launchTime: t,
        guidance: guidanceForVehicle(spec), guidanceResolved: true, failure: DEFAULT_FAILURE, boosterRecovery: false,
        payloadMassOverride: 5000, dynamics: { model: 'pointMass', wind: 'calm', seed: 20260919 },
      });
      expect(reviewLaunchTime(orbit, 'cape', FROM).getTime()).toBe(t.getTime());
    }
    // six-DOF flies the six-DOF programme, as the panel resolves it
    const six = reviewMission(spec, { orbitId: 'leo', siteId: 'cape', payloadKg: 5000, sixDof: true }, FROM);
    expect(six.guidance).toEqual(guidanceForVehicle(spec, DEFAULT_GUIDANCE, 'sixDof'));
    expect(six.dynamics?.model).toBe('sixDof');
  });

  it('offers the Launch panel’s presets but its custom one, and the vehicle’s own sites', () => {
    expect(REVIEW_ORBITS.map((o) => o.id)).not.toContain('custom');
    expect(REVIEW_ORBITS.length).toBeGreaterThan(8);
    for (const id of ['falcon9', 'soyuz21a', 'electron']) {
      const v = vehicleById(id);
      expect(reviewSites(v).map((s) => s.id).sort()).toEqual([...v.sites].sort());
    }
  });

  it('starts from the Launch panel’s defaults and keeps what still fits another vehicle', () => {
    const f9 = vehicleById('falcon9');
    expect(defaultReviewChoice(f9, 11000)).toEqual({ orbitId: 'leo', siteId: f9.sites[0], payloadKg: 11000, sixDof: true });
    const own = copyOf('falcon9');
    expect(defaultReviewChoice(own, 5000).sixDof).toBe(false);
    const kept = fitReviewChoice(vehicleById('electron'), { orbitId: 'sso', siteId: 'cape', payloadKg: 1, sixDof: true }, 150);
    expect(kept).toEqual({ orbitId: 'sso', siteId: vehicleById('electron').sites[0], payloadKg: 150, sixDof: true });
    expect(reviewChoiceProblem(f9, { ...defaultReviewChoice(f9, 0.5) })).toBe('payload');
    expect(reviewChoiceProblem(f9, { ...defaultReviewChoice(f9, 100), orbitId: 'custom' })).toBe('orbit');
    expect(reviewChoiceProblem(f9, { ...defaultReviewChoice(f9, 100), siteId: 'baikonur' })).toBe('site');
    expect(reviewChoiceProblem(f9, defaultReviewChoice(f9, 100))).toBeNull();
  });
});

describe('the checklist', () => {
  it('Falcon 9 to the 500 km preset at half its rating: ready, the probe not flown, as the Launch panel would', () => {
    const spec = vehicleById('falcon9');
    const c = defaultReviewChoice(spec, spec.payloadLEO / 2);
    const r = readiness(spec, reviewMission(spec, c, FROM));
    expect(r.canFly).toBe(true);
    const list = expectChecklist(spec, r);
    const section = (id: string) => list.find((s) => s.id === id)!;
    expect(section('spec').rows.map((x) => x.text?.key)).toEqual(['build.eng.review.spec.ok']);
    expect(section('probe').rows.map((x) => x.text?.key)).toEqual(['build.eng.review.probe.notFlown']);
    expect(section('plan').rows[0].text?.key).toBe('build.eng.review.plan.margin');
    expect(section('notices').rows.map((x) => x.text?.key)).toEqual(['build.eng.review.notice.none']);
    expect(r.verdict?.cause).toBe('ready');
  });

  it('a stretched and overloaded Falcon 9 remix: does not fly, and says why — the probe and the verdict', () => {
    const spec = stretchedFalcon(2);
    const c = { ...defaultReviewChoice(spec, 40000) };
    const r = readiness(spec, reviewMission(spec, c, FROM));
    expect(r.canFly).toBe(false);
    const list = expectChecklist(spec, r);
    const probe = list.find((s) => s.id === 'probe')!;
    expect(probe.level).toBe('fail');
    expect(['build.eng.review.probe.noOrbit', 'build.eng.review.probe.noOrbitNever']).toContain(probe.rows[0].text?.key);
    const verdict = list.find((s) => s.id === 'verdict')!;
    expect(verdict.level).toBe('fail');
    // a remix flies another rocket's guidance: said
    expect(list.find((s) => s.id === 'notices')!.rows.map((x) => x.text?.key)).toContain('build.eng.review.notice.guidance');
    expect(checklistCounts(list).fail).toBeGreaterThanOrEqual(2);
  });

  it('a clean copy flies the probe and reaches orbit; asked for six-DOF, it says six-DOF is experimental', () => {
    const spec = copyOf('falcon9');
    const r = readiness(spec, reviewMission(spec, { orbitId: 'leo', siteId: 'cape', payloadKg: 5000, sixDof: true }, FROM));
    const list = expectChecklist(spec, r);
    expect(list.find((s) => s.id === 'probe')!.rows[0].text?.key).toBe('build.eng.review.probe.orbit');
    expect(list.find((s) => s.id === 'notices')!.rows.map((x) => x.text?.key))
      .toEqual(['build.eng.review.notice.sixDof', 'build.eng.review.notice.guidance']);
  });

  it('a spec the validator refuses stops the review: the later sections say they were not reached', () => {
    const spec = copyOf('falcon9');
    spec.stages[1].engine.ispVac = -1;
    const r = readiness(spec, reviewMission(spec, { orbitId: 'leo', siteId: 'cape', payloadKg: 5000, sixDof: false }, FROM));
    expect(r.canFly).toBe(false);
    const list = expectChecklist(spec, r);
    expect(list.find((s) => s.id === 'spec')!.level).toBe('fail');
    for (const id of ['design', 'plan', 'probe', 'verdict']) {
      expect(list.find((s) => s.id === id)!.rows.map((x) => x.text?.key), id).toEqual(['build.eng.review.notReached']);
    }
  });

  it('has a sentence for every way the probe can end, and one for any other', () => {
    for (const key of [...Object.values(PROBE_END_KEYS), PROBE_END_OTHER]) expectKey(key);
    for (const evt of Object.keys(PROBE_END_KEYS)) expectKey(evt);
  });
});

describe('the verdict in the reader’s language', () => {
  it('readinessVerdict is the review’s own verdict, text and all', () => {
    const cases: [VehicleSpec, ReviewChoice][] = [
      [vehicleById('falcon9'), { orbitId: 'leo', siteId: 'cape', payloadKg: 11000, sixDof: false }],
      [vehicleById('falcon9'), { orbitId: 'leo', siteId: 'cape', payloadKg: 30000, sixDof: false }],
      [vehicleById('soyuz21a'), { orbitId: 'iss', siteId: 'baikonur', payloadKg: 5000, sixDof: false }],
      [stretchedFalcon(1.2), { orbitId: 'leo', siteId: 'cape', payloadKg: 5000, sixDof: false }],
    ];
    for (const [spec, c] of cases) {
      const m = reviewMission(spec, c, FROM);
      const r = readiness(spec, m);
      expect(readinessVerdict(spec, m, r.plan, r.insertion), `${spec.id} ${c.payloadKg}`).toEqual(r.verdict);
    }
  });
});

describe('"Fly it" after the review', () => {
  it('hands over the mission reviewed, which the Launch panel takes whole', () => {
    const cases: [VehicleSpec, ReviewChoice, boolean][] = [
      [vehicleById('falcon9'), { orbitId: 'iss', siteId: 'cape', payloadKg: 7000, sixDof: true }, false],
      [stretchedFalcon(1.2), { orbitId: 'sso', siteId: 'vandenberg', payloadKg: 3000, sixDof: false }, true],
    ];
    for (const [spec, c, carriesSpec] of cases) {
      const m = reviewMission(spec, c, FROM);
      const doc = reviewHandoff(spec, c, m);
      expect('vehicleSpec' in doc.mission, spec.id).toBe(carriesSpec);
      const parsed = parseMissionDocument(JSON.parse(missionFileText(doc)), onThePanel());
      expect(parsed.usable, spec.id).toBe(true);
      expect(parsed.issues, spec.id).toEqual([]);
      const s = parsed.state;
      expect([s.vehicleId, s.orbitId, s.siteId, s.payloadMass, s.satelliteId]).toEqual([spec.id, c.orbitId, c.siteId, c.payloadKg, 'cubesats']);
      expect(s.launchTime.getTime()).toBe(m.launchTime.getTime());
      expect(s.dynamics?.model).toBe(c.sixDof ? 'sixDof' : 'pointMass');
      if (carriesSpec) expect(s.vehicleSpec).toEqual(spec);
      else expect(s.vehicleSpec).toBeUndefined();
    }
  });
});
