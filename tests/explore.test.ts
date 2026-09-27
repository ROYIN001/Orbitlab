/**
 * The Explore level's precomputed settings (src/ui/explore.ts): what it shows
 * is what the vehicle flies, what the Engineer level changed is reported and
 * can be undone, and a lesson can still ask for the guidance to be shown.
 */
import { describe, expect, it } from 'vitest';
import { AUTO_GUIDANCE_FIELDS, autoGuidanceRows, engineerSettings, hasAdjustments, heaviestPassing, withoutEngineerSettings } from '../src/ui/explore';
import { guidanceForVehicle } from '../src/physics/defaults';
import { Simulation } from '../src/physics/simulation';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { BUILTIN_LESSONS } from '../src/lessons/catalog';
import { lessonFileText, readLesson, type FileIssue } from '../src/lessons/lesson-file';
import { EXPLORE_CHART_IDS, CHART_IDS } from '../src/ui/telemetry-charts';
import { rigidMission } from './rigid-harness';
import type { DynamicsConfig, MissionConfig } from '../src/types';
import { liftShare, marginalMission, missionVerdict, payloadStep } from '../src/ui/panel';
import { siteById } from '../src/data/sites';
import { satelliteById } from '../src/data/satellites';
import { orbitById } from '../src/data/orbits';
import { launchWindows, planMission, resolveTarget } from '../src/physics/mission';
import { probeInsertion } from '../src/physics/autotune';
import { DEFAULT_FAILURE } from '../src/physics/defaults';
import { RAD } from '../src/physics/constants';

describe('computed guidance', () => {
  it('shows the pitch programme the simulation flies, in the units of the fields it replaces', () => {
    const cfg = rigidMission('iss');
    const flown = new Simulation(cfg, { headless: true }).cfg.guidance;
    const rows = autoGuidanceRows(guidanceForVehicle(vehicleById(cfg.vehicleId), undefined, 'sixDof'), {});
    expect(rows.map((r) => r.key)).toEqual([...AUTO_GUIDANCE_FIELDS]);
    const value = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    // Soyuz-2.1a's own six-DOF programme (src/data/vehicles.ts)
    expect(value).toMatchObject({ pitchOverAltitude: 50, kickAngle: 4, kickDuration: 12, maxTurnRate: 0.5 });
    expect(value.gravityTurnEnd).toBe(flown.gravityTurnEnd / 1000);
    expect(value.loftAltitude).toBe(flown.loftAltitude / 1000);
    for (const key of ['pitchOverAltitude', 'kickAngle', 'kickDuration', 'maxTurnRate'] as const) expect(value[key]).toBe(flown[key]);
    expect(rows.every((r) => !r.adjusted)).toBe(true);
  });

  it('has a programme of its own for every vehicle in the catalogue', () => {
    for (const spec of VEHICLES) {
      for (const model of ['pointMass', 'sixDof'] as const) {
        const rows = autoGuidanceRows(guidanceForVehicle(spec, undefined, model), {});
        expect(rows.every((r) => Number.isFinite(r.value)), `${spec.id}/${model}`).toBe(true);
      }
    }
  });

  it('marks the values the Engineer level or the auto-tuner changed, and flies them', () => {
    const spec = vehicleById('falcon9');
    const overrides = { kickAngle: 2.5, loftAltitude: 80e3 };
    const rows = autoGuidanceRows({ ...guidanceForVehicle(spec), ...overrides }, overrides);
    expect(rows.filter((r) => r.adjusted).map((r) => [r.key, r.value])).toEqual([['kickAngle', 2.5], ['loftAltitude', 80]]);
  });

  it('lists a changed limit or parking orbit too, so every value flown instead of a computed one is shown', () => {
    const spec = vehicleById('soyuz21a');
    expect(autoGuidanceRows(guidanceForVehicle(spec), {}).map((r) => r.key)).toEqual([...AUTO_GUIDANCE_FIELDS]);
    const overrides = { maxAccel: 20, parkingAltitude: 250e3 };
    const rows = autoGuidanceRows({ ...guidanceForVehicle(spec), ...overrides }, overrides);
    expect(rows.slice(AUTO_GUIDANCE_FIELDS.length).map((r) => [r.key, r.value, r.adjusted])).toEqual([['maxAccel', 20, true], ['parkingAltitude', 250, true]]);
  });
});

describe('Engineer settings carried into Explore', () => {
  const base: DynamicsConfig = { model: 'sixDof', wind: 'shear', seed: 7 };

  it('names each Engineer-only setting a flight carries, and nothing for a plain one', () => {
    expect(engineerSettings(undefined)).toEqual([]);
    expect(engineerSettings(base)).toEqual([]);
    const set: DynamicsConfig = { ...base, flex: { slosh: true }, explicitGuidance: { law: 'peg' }, navigation: { grade: 'tactical' } };
    expect(engineerSettings(set)).toEqual(['flex', 'navigation', 'explicitGuidance']);
  });

  it('goes back to the computed values keeping the model, the wind and the seed', () => {
    const set: DynamicsConfig = { ...base, control: { feedForward: 0.5 }, controlFaults: { faults: [] } };
    expect(withoutEngineerSettings(set)).toEqual(base);
    expect(set.control).toBeDefined(); // a copy, not the caller's object
  });

  it('counts a guidance override or an Engineer setting as an adjustment', () => {
    expect(hasAdjustments({}, base)).toBe(false);
    expect(hasAdjustments({ maxAccel: 20 }, base)).toBe(true);
    expect(hasAdjustments({}, { ...base, flex: { bending: true } })).toBe(true);
  });
});

describe('lessons in Explore', () => {
  it('shows the guidance for the lesson that asks the student to change it, and for no other', () => {
    const revealed = BUILTIN_LESSONS.filter((l) => l.reveal?.includes('setup.guidance')).map((l) => l.id);
    expect(revealed).toEqual(['guid-maxq']);
    const maxq = BUILTIN_LESSONS.find((l) => l.id === 'guid-maxq')!;
    expect(maxq.mode).toBe('explore');
    expect(maxq.locked).not.toContain('setup.guidance');
  });

  it('reads `reveal` from a lesson file and warns of a key it does not know', () => {
    const raw = JSON.parse(lessonFileText(BUILTIN_LESSONS.filter((l) => l.id === 'guid-maxq'))).lessons[0];
    raw.reveal = ['setup.guidance', 'setup.everything'];
    const issues: FileIssue[] = [];
    const lesson = readLesson(raw, 'lessons[0]', issues);
    expect(lesson?.reveal).toEqual(['setup.guidance']);
    expect(issues.map((i) => `${i.level}:${i.code}`)).toEqual(['warn:invalid']);
  });

  it('keeps on Explore\'s chart picker every chart its lessons point the student to', () => {
    // 1.4 reads Δv left, 2.1 the dynamic pressure, 3.3 the load factor
    for (const id of ['dv', 'q', 'g'] as const) expect(EXPLORE_CHART_IDS).toContain(id);
    for (const id of EXPLORE_CHART_IDS) expect(CHART_IDS).toContain(id);
  });
});

describe('the pre-flight light and its fixes', () => {
  const soyuz = vehicleById('soyuz21a');
  const baikonur = siteById('baikonur');
  const iss = orbitById('iss');
  const crew = satelliteById('crew');
  const launchTime = launchWindows(iss, baikonur, new Date('2026-09-27T00:00:00Z'), 1)[0].time;
  const config = (payloadMass: number, at = launchTime): MissionConfig => ({
    vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', orbit: { ...iss }, launchTime: at,
    guidance: guidanceForVehicle(soyuz), guidanceResolved: true, failure: { ...DEFAULT_FAILURE },
    boosterRecovery: false, payloadMassOverride: payloadMass,
  });
  /** The verdict as the panel reaches it: the plan, and the insertion flown when the budget calls it marginal. */
  const verdict = (payloadMass: number, at = launchTime) => {
    const cfg = config(payloadMass, at);
    const plan = planMission(cfg, baikonur, soyuz);
    const insertion = marginalMission(soyuz, crew, payloadMass, plan, iss)
      ? probeInsertion({ ...cfg, dynamics: { model: 'pointMass', wind: 'calm', seed: 20260919 } }) : null;
    return missionVerdict({ spec: soyuz, site: baikonur, orbit: iss, satellite: crew, payloadMass,
      inclinationDeg: resolveTarget(iss, baikonur, at).inclination * RAD, plan, insertion, failureMode: 'none', siteReassigned: false });
  };

  it('names the cause of each verdict, and says when the launch misses its window', () => {
    expect(verdict(5000)).toMatchObject({ level: 'ok', cause: 'ready', offWindow: false });
    expect(verdict(7150)).toMatchObject({ level: 'warn', cause: 'margin' });
    expect(verdict(9500)).toMatchObject({ level: 'fail', cause: 'overCapacity' });
    const late = verdict(5000, new Date(launchTime.getTime() + 5 * 3600e3));
    expect(late).toMatchObject({ level: 'warn', cause: 'ready', offWindow: true });
  });

  it('lightens an overloaded Soyuz to the heaviest payload its verdict passes, and no further', () => {
    const passes = (m: number) => verdict(m).level !== 'fail';
    const mass = heaviestPassing(9500, payloadStep(soyuz), passes);
    expect(mass).not.toBeNull();
    expect(passes(mass!)).toBe(true);
    expect(passes(mass! + payloadStep(soyuz))).toBe(false);
    expect(mass!).toBeLessThanOrEqual(soyuz.payloadLEO);
  });

  it('bisects to the last passing step, and gives up when not even one step passes', () => {
    const calls: number[] = [];
    expect(heaviestPassing(10_000, 100, (m) => { calls.push(m); return m <= 4321; })).toBe(4300);
    expect(calls.length).toBeLessThan(12);
    expect(heaviestPassing(10_000, 100, () => false)).toBeNull();
    expect(heaviestPassing(50, 100, () => true)).toBeNull();
    expect(heaviestPassing(800, 100, () => true)).toBe(800);
  });

  it('draws what each vehicle lifts on a scale where Electron and Saturn V both fit', () => {
    const shares = VEHICLES.map((v) => liftShare(v.payloadLEO));
    for (const share of shares) { expect(share).toBeGreaterThan(0); expect(share).toBeLessThanOrEqual(1); }
    expect(liftShare(vehicleById('electron').payloadLEO)).toBeLessThan(liftShare(vehicleById('falcon9').payloadLEO));
    expect(liftShare(vehicleById('falcon9').payloadLEO)).toBeLessThan(liftShare(vehicleById('saturnv').payloadLEO));
  });
});
