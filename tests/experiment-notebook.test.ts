import { describe, expect, it } from 'vitest';
import {
  captureExperimentRun, changedMissionInputs, compareExperiment, loadNotebook, saveNotebook, saveNotebookRevision, validateNotebookData,
  NOTEBOOK_MAX_BYTES, NOTEBOOK_MAX_ENTRIES, NOTEBOOK_STORAGE_KEY,
  type ExperimentEntry, type ExperimentRunInput, type NotebookData,
} from '../src/experiments/notebook';
import { missionDocument } from '../src/config/mission-file';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE } from '../src/physics/defaults';
import { experimentsEn, experimentsRu, experimentsTh } from '../src/i18n/experiments';
import { Simulation } from '../src/physics/simulation';
import { flownMission } from '../src/lessons/progress';
import { DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { vehicleById } from '../src/data/vehicles';

const input = (): ExperimentRunInput => ({
  label: 'Falcon 9 baseline', app: '0.1.0+test', t: 21, clock: 20, status: 'ascent', complete: false, actions: [], events: [],
  mission: missionDocument({
    vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbitId: 'leo', orbit: { ...orbitById('leo') },
    payloadMass: 1000, launchTime: new Date('2026-10-02T12:00:00Z'), guidanceOverrides: { kickAngle: 5, kickDuration: 8 },
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
  }),
  telemetry: [0, 10, 20, 21].map((t) => ({
    t, alt: t * 10, vInertial: t, vAir: t, q: t * 100, gLoad: 1 + t / 20, mass: 200_000,
    pitch: 90, ap: 500_000, pe: 499_000, inc: 28.5, dvRemaining: 500 - t, downrange: t,
  })),
});

const entry = (): ExperimentEntry => ({
  id: 'test-entry', createdAt: '2026-10-02T12:00:00.000Z', title: 'Payload',
  prediction: 'Increasing payload should reduce remaining delta-v.', variable: 'payloadMass',
  baseline: captureExperimentRun(input(), new Date('2026-10-02T12:00:00Z'))!, conclusion: '',
});
const data = (): NotebookData => ({ version: 1, experiments: [entry()] });

describe('experiment evidence', () => {
  it('accepts real flown settings and preserves replay clock, phase and partial status', () => {
    const sim = new Simulation({
      vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: { ...orbitById('leo') },
      launchTime: new Date('2026-10-02T12:00:00Z'), payloadMassOverride: 1000,
      guidance: guidanceForVehicle(vehicleById('falcon9'), DEFAULT_GUIDANCE), guidanceResolved: true,
      failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    });
    while (sim.state.t < 120) sim.step(sim.suggestedDt());
    const captured = captureExperimentRun({
      label: 'actual flight', mission: flownMission(sim.cfg), telemetry: sim.telemetry, events: sim.events, actions: sim.actions,
      app: 'test-build', t: sim.state.t, clock: 30, status: 'ascent', complete: false,
    });
    expect(captured).not.toBeNull();
    expect(captured).toMatchObject({ clock: 30, status: 'ascent', complete: false, t: sim.state.t });
    expect(captured!.sampleEnd).toBeLessThanOrEqual(30);
    expect(captured!.sampleCount).toBeLessThan(sim.telemetry.length);
    expect(captured!.mission.mission.guidanceOverrides).toEqual(sim.cfg.guidance);
  });

  it('freezes flown inputs, command journal and figures, excluding future telemetry and events', () => {
    const source = input();
    source.actions = [{ kind: 'commandAbort', t: 18 }];
    source.events = [{ key: 'evt.targetOrbit', t: 21, severity: 'info' }];
    const captured = captureExperimentRun(source)!;
    expect(captured).toMatchObject({ sampleCount: 3, sampleStart: 0, sampleEnd: 20, t: 21, clock: 20 });
    expect(captured.figures.find((f) => f.key === 'maxQ')).toMatchObject({ value: 2, unit: 'kPa' });
    expect(captured.figures.find((f) => f.key === 'insertion')).toBeUndefined();
    source.mission.mission.payloadMass = 9000;
    source.actions[0].t = 19;
    expect(captured.mission.mission.payloadMass).toBe(1000);
    expect(captured.actions[0].t).toBe(18);
  });

  it('keeps missing/nonfinite measurements as null rather than inventing a zero', () => {
    const source = input(); source.telemetry = source.telemetry.map((sample) => ({ ...sample, inc: NaN }));
    const captured = captureExperimentRun(source)!;
    expect(captured.figures.find((f) => f.key === 'inclination')?.value).toBeNull();
    expect(validateNotebookData({ version: 1, experiments: [{ ...entry(), baseline: captured }] })).not.toBeNull();
  });

  it('does not capture a prelaunch frame, empty telemetry or an invalid mission', () => {
    expect(captureExperimentRun({ ...input(), status: 'prelaunch' })).toBeNull();
    expect(captureExperimentRun({ ...input(), telemetry: [] })).toBeNull();
    const source = input(); source.mission.mission.payloadMass = -1;
    expect(captureExperimentRun(source)).toBeNull();
  });

  it('counts separate guidance leaves and ignores preset display metadata', () => {
    const a = input().mission, b = structuredClone(a);
    b.mission.orbitId = 'custom'; b.mission.orbit.id = 'custom';
    b.mission.orbit.name = 'Custom display name'; b.mission.orbit.description = 'Display description';
    expect(changedMissionInputs(a, b)).toEqual([]);
    b.mission.guidanceOverrides.kickAngle = 6; b.mission.guidanceOverrides.kickDuration = 9;
    expect(changedMissionInputs(a, b).map((c) => c.path)).toEqual(['guidanceOverrides.kickAngle', 'guidanceOverrides.kickDuration']);
  });

  it('distinguishes a missing trial, unchanged mission and wrong or multiple variables', () => {
    const e = entry(); expect(compareExperiment(e).notices).toEqual(['missingTrial']);
    e.trial = structuredClone(e.baseline);
    expect(compareExperiment(e).notices).toContain('noChange');
    e.trial.mission.mission.guidanceOverrides.kickAngle = 6;
    expect(compareExperiment(e).notices).toContain('wrongVariable');
    e.trial.mission.mission.payloadMass = 1100;
    expect(compareExperiment(e).notices).toContain('multipleChanges');
  });

  it('reports build, actions, phase, partial captures and time horizon differences independently', () => {
    const e = entry(); e.trial = structuredClone(e.baseline);
    e.trial.mission.mission.payloadMass = 1100; e.trial.app = '0.1.0+other';
    e.trial.actions = [{ kind: 'commandAbort', t: 12 }]; e.trial.status = 'failed'; e.trial.sampleEnd = 19;
    expect(compareExperiment(e).notices).toEqual(['differentBuild', 'differentActions', 'incomplete', 'differentHorizon', 'differentStatus']);
    e.trial = structuredClone(e.baseline); e.baseline.complete = true; e.trial.complete = true;
    e.baseline.clock = e.baseline.t; e.trial.clock = e.trial.t;
    e.trial.mission.mission.payloadMass = 1100;
    expect(compareExperiment(e).notices).toEqual([]);
  });

  it('does not attribute a replay outcome to manual commands from after its display clock', () => {
    const e = entry(); e.trial = structuredClone(e.baseline);
    e.trial.mission.mission.payloadMass = 1100;
    e.trial.actions = [{ kind: 'commandAbort', t: 21 }];
    expect(compareExperiment(e).notices).not.toContain('differentActions');
    e.trial.actions[0].t = 19;
    expect(compareExperiment(e).notices).toContain('differentActions');
  });

  it('compares command meaning without depending on JSON object key order', () => {
    const e = entry(); e.trial = structuredClone(e.baseline);
    e.baseline.actions = [{ kind: 'commandAbort', t: 15 }];
    e.trial.actions = [{ t: 15, kind: 'commandAbort' }];
    expect(compareExperiment(e).notices).not.toContain('differentActions');
  });

  it('explains that point-mass runs do not test the selected wind scenarios', () => {
    const e = entry(); e.variable = 'dynamics.wind';
    e.baseline.mission.mission.dynamics = { model: 'pointMass', wind: 'calm', seed: 42 };
    e.trial = structuredClone(e.baseline); e.trial.mission.mission.dynamics!.wind = 'crosswind';
    expect(compareExperiment(e).notices).toContain('windInactive');
  });
});

describe('bounded notebook persistence', () => {
  it('round-trips a complete notebook and returns detached data to archive callers', () => {
    const map = new Map<string, string>(); const store = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
    expect(loadNotebook(store).status).toBe('empty');
    const original = data(); expect(saveNotebook(original, store)).toBe(true);
    expect(loadNotebook(store)).toEqual({ status: 'loaded', data: original, revision: JSON.stringify(original) });
    const checked = validateNotebookData(original)!; checked.experiments[0].baseline.mission.mission.payloadMass = 2222;
    expect(original.experiments[0].baseline.mission.mission.payloadMass).toBe(1000);
    expect(map.has(NOTEBOOK_STORAGE_KEY)).toBe(true);
  });

  it('reports corruption and quota/access failures without deleting existing storage', () => {
    let raw = '{corrupt'; const store = { getItem: () => raw, setItem: () => { throw new Error('quota'); } };
    expect(loadNotebook(store).status).toBe('invalid');
    expect(saveNotebook(data(), store)).toBe(false); expect(raw).toBe('{corrupt');
    raw = 'x'.repeat(NOTEBOOK_MAX_BYTES + 1); expect(loadNotebook(store).status).toBe('invalid');
    expect(loadNotebook({ getItem() { throw new Error('denied'); } }).status).toBe('unavailable');
  });

  it('refuses stale-tab writes and does not overwrite data hidden by an earlier failed read', () => {
    let raw: string | null = null;
    const store = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
    const a = loadNotebook(store), b = loadNotebook(store);
    expect(saveNotebookRevision(data(), a.revision, store)).toBe('saved');
    const saved = raw;
    expect(saveNotebookRevision({ version: 1, experiments: [] }, b.revision, store)).toBe('changed');
    expect(raw).toBe(saved);
    const denied = loadNotebook({ getItem() { throw new Error('denied'); } });
    expect(saveNotebookRevision(denied.data, denied.revision, store)).toBe('changed');
    raw = '{corrupt';
    const damaged = loadNotebook(store);
    expect(damaged.revision).toBe('{corrupt');
    // Explicit replacement remains possible against the exact unreadable data seen.
    expect(saveNotebookRevision(data(), damaged.revision, store)).toBe('saved');
  });

  it('rejects newer schemas, excessive entries, duplicates, unsafe keys, cycles and invalid units', () => {
    expect(validateNotebookData({ ...data(), version: 2 })).toBeNull();
    expect(validateNotebookData({ version: 1, experiments: Array(NOTEBOOK_MAX_ENTRIES + 1).fill(entry()) })).toBeNull();
    expect(validateNotebookData({ version: 1, experiments: [entry(), entry()] })).toBeNull();
    expect(validateNotebookData(JSON.parse('{"version":1,"experiments":[],"__proto__":{}}'))).toBeNull();
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
    expect(validateNotebookData(cyclic)).toBeNull();
    const malformed = data(); malformed.experiments[0].baseline.figures[0].unit = 'g';
    expect(validateNotebookData(malformed)).toBeNull();
  });

  it('rejects missing provenance, unsupported mission formats and actions beyond the capture', () => {
    const original = data();
    const mutate = (fn: (e: ExperimentEntry) => void) => { const bad = structuredClone(original); fn(bad.experiments[0]); return validateNotebookData(bad); };
    expect(mutate((e) => { e.baseline.app = ''; })).toBeNull();
    expect(mutate((e) => { e.baseline.mission.version = 99; })).toBeNull();
    expect(mutate((e) => { e.baseline.mission.version = 1; e.baseline.mission.mission.vehicleSpec = structuredClone(vehicleById('falcon9')); })).toBeNull();
    expect(mutate((e) => { e.baseline.mission.mission.launchTime = '2026-02-30T12:00:00Z'; })).toBeNull();
    expect(mutate((e) => { e.baseline.capturedAt = '2026-10-02T12:00'; })).toBeNull();
    expect(mutate((e) => { e.baseline.clock = e.baseline.t + 1; })).toBeNull();
    expect(mutate((e) => { e.baseline.complete = true; })).toBeNull();
    expect(mutate((e) => { e.baseline.actions = [{ kind: 'commandAbort', t: 22 }]; })).toBeNull();
    expect(mutate((e) => { e.baseline.sampleEnd = 30; })).toBeNull();
    expect(mutate((e) => { e.variable = 'missing.input'; })).toBeNull();
    expect(mutate((e) => { e.baseline.figures.push({ key: 'insertion', unit: 's', value: 99999 }); })).toBeNull();
    expect(mutate((e) => { e.baseline.figures.find((f) => f.key === 'maxQTime')!.value = -99999; })).toBeNull();
  });
});

it('keeps English, Russian and Thai notebook keys and placeholders aligned', () => {
  const placeholders = (value: string) => [...value.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).sort();
  for (const dict of [experimentsRu, experimentsTh]) {
    expect(Object.keys(dict).sort()).toEqual(Object.keys(experimentsEn).sort());
    for (const key of Object.keys(experimentsEn)) expect(placeholders(dict[key]), key).toEqual(placeholders(experimentsEn[key]));
  }
});
