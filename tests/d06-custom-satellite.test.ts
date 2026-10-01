/**
 * A designed satellite flies in Launch as an inline spec (roadmap D06; Phase
 * 4 map §2.6 c, the owner's option B, 2026-09-29).
 *
 * The acceptance, fixed before the first run, as S02's for a custom vehicle
 * (tests/custom-vehicle.test.ts): a custom spec that is a deep copy of a
 * catalogue satellite, under an id of its own, flies a recording IDENTICAL to
 * the catalogue satellite's — frames, events, telemetry, plan and elements,
 * compared with `toEqual`, no tolerance — in point mass here and in six DOF
 * in tests/heavy/custom-satellite-sixdof.test.ts, the comsat (its own apogee
 * engine) and the crew ship (the rendezvous and docking it opens), including
 * through the flight worker's structured-clone transport. The one difference
 * allowed is the satellite's id in the events' `satId`, which is the
 * designer's label and what the interface names the satellite by; it is set
 * apart and checked on its own.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { FlightRecorder } from '../src/replay/recorder';
import { SimCore } from '../src/session/core';
import { WorkerSession, type SessionWorker } from '../src/session/session';
import type { FromCore, ToCore } from '../src/session/protocol';
import { missionSatellite, satelliteById } from '../src/data/satellites';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { validateConfigInput, type ConfigInput } from '../src/config/validation';
import { handoffFromFlight, parseHandoff } from '../src/orbit/handoff';
import { spacecraftFor } from '../src/physics/propagator/spacecraft';
import { localizeEventParams, satelliteName } from '../src/ui/names';
import { setLang, t } from '../src/i18n';
import { missionDocument } from '../src/config/mission-file';
import { defaultMissionState, lessonConfig } from '../src/lessons/config';
import { brokenLocks } from '../src/lessons/grader';
import { BUILTIN_LESSONS } from '../src/lessons/catalog';
import type { LessonFlight } from '../src/lessons/types';
import { defaultDynamics } from '../src/physics/rigid/config';
import type { MissionConfig, SatelliteSpec } from '../src/types';
import { SAT_FLIGHT_TIME, flySatellite, satelliteCopyOf, satelliteMission, type HarnessSatellite } from './custom-satellite-harness';

describe('custom satellites (D06): identical flights', () => {
  // six-DOF: tests/heavy/custom-satellite-sixdof.test.ts
  for (const id of ['comsat', 'crew'] as HarnessSatellite[]) {
    it(`flies a copy of ${id} exactly as ${id}, point mass`, () => {
      const original = flySatellite(satelliteMission(id, 'pointMass'), SAT_FLIGHT_TIME[id]);
      const copy = flySatellite(satelliteMission(id, 'pointMass', satelliteCopyOf(id)), SAT_FLIGHT_TIME[id]);
      expect(original.flight.status).not.toBe('failed');
      expect(copy.flight).toEqual(original.flight);
      // the satellite's own events name it by its own id
      expect([...original.satIds]).toEqual([id]);
      expect([...copy.satIds]).toEqual([`${id}-copy`]);
      const keys = original.flight.events.map((e) => e.key);
      expect(keys).toContain('evt.payloadSep');
      // what each mission is for: the comsat's apogee engine burns, the crew ship docks
      if (id === 'comsat') expect(original.flight.events.filter((e) => e.key === 'evt.burnStart' && e.t > 10_000).length).toBeGreaterThanOrEqual(2);
      else expect(original.flight.frames.at(-1)!.rendezvous?.phase).toMatch(/^(capture|docked)$/);
    }, 240_000);
  }

  it('flies the spec\'s own engine and size, not the catalogue\'s', () => {
    // So the identity above is the spec flying, not the catalogue entry looked up by origin.
    const base = satelliteCopyOf('comsat');
    const own = satelliteCopyOf('comsat', { propulsion: { ...base.propulsion!, thrust: 980 }, size: { width: 2, height: 4, depth: 3 } });
    const a = flySatellite(satelliteMission('comsat', 'pointMass', base), 21_000);
    const b = flySatellite(satelliteMission('comsat', 'pointMass', own), 21_000);
    // the first apogee burn (ignition at 17 632 s in the catalogue's flight), on the satellite's own engine
    const engine = (f: typeof a) => Math.max(...f.flight.telemetry.filter((s) => s.t > 17_700 && s.t < 18_000).map((s) => s.thrust));
    expect(engine(a)).toBe(490);
    expect(engine(b)).toBe(980);
    expect(b.flight.frames[0].payloadHeight).toBe(4);
    expect(a.flight.frames[0].payloadHeight).toBe(5);
  }, 120_000);

  it('keeps a copy identical when it carries its own drag area, C_D and C_R, which the hand-off then takes', () => {
    // The ascent does not read them (they are the orbit's figures, S03 and P07); the hand-off does.
    const own = { area: 12.5, cd: 2.4, cr: 1.5 };
    const cfg = (custom?: SatelliteSpec): MissionConfig => ({ ...satelliteMission('crew', 'pointMass', custom), rendezvous: undefined });
    const flyTo = (c: MissionConfig) => {
      const sim = new Simulation(c, { headless: true });
      const rec = new FlightRecorder();
      rec.start(sim);
      while (!sim.done && sim.state.t < 800) rec.advance(2, 1e9);
      return { sim, rec };
    };
    const a = flyTo(cfg());
    const b = flyTo(cfg(satelliteCopyOf('crew', own)));
    const strip = (r: FlightRecorder) => r.frames.map(({ vehicleName: _, ...f }) => structuredClone(f));
    expect(strip(b.rec)).toEqual(strip(a.rec));
    const handoff = ({ sim, rec }: ReturnType<typeof flyTo>) => {
      const frame = rec.frames.at(-1)!;
      const stage = frame.stages.find((st) => st.isSpacecraft);
      const spec = stage ? sim.vehicle.stages[stage.index]?.spec : undefined;
      return handoffFromFlight({ frame, satellite: sim.satellite, payloadMass: sim.cfg.payloadMassOverride ?? sim.satellite.mass,
        spacecraftStage: stage && spec ? { dryMass: spec.dryMass, propellant: stage.propellantFraction * spec.propellantMass } : null,
        vehicleName: sim.vehicleSpec.name, mission: null, label: 'test' });
    };
    const ha = handoff(a), hb = handoff(b);
    expect(ha.spacecraft).toMatchObject({ area: spacecraftFor('crew', 1).area, cd: 2.2, cr: 1.3 });
    expect(hb.spacecraft).toEqual({ ...ha.spacecraft, ...own });
    expect(hb.r).toEqual(ha.r);
    expect(parseHandoff(JSON.parse(JSON.stringify(hb)))).toEqual(hb);
  }, 120_000);

  it('survives structuredClone and the flight worker\'s transport', () => {
    const copy = satelliteCopyOf('crew');
    const cfg = satelliteMission('crew', 'pointMass', copy);
    expect(structuredClone(cfg)).toEqual(cfg);
    const original = flySatellite(satelliteMission('crew', 'pointMass'), 400);
    // The flight worker gets the spec inside the config, structured-cloned as postMessage does.
    const replies: FromCore[] = [];
    const core = new SimCore({ post: (m) => replies.push(structuredClone(m)), later: (fn) => fn(), now: () => 0 });
    const worker: SessionWorker = {
      onmessage: null, onerror: null, onmessageerror: null,
      postMessage: (m: ToCore) => core.handle(structuredClone(m)), terminate: () => {},
    };
    const session = new WorkerSession(cfg, worker, 1, (m) => { throw new Error(m); });
    const flush = () => { while (replies.length) worker.onmessage?.({ data: replies.shift()! } as MessageEvent<FromCore>); };
    flush();
    for (let i = 0; i < 200; i++) { session.advance(2, 1e9); flush(); }
    const inWorker = (core as unknown as { sim: Simulation }).sim;
    expect(inWorker.satellite).toEqual(copy);
    expect(inWorker.satellite).not.toBe(copy);
    expect(session.sim.satellite).toEqual(copy);
    const mirrored = session.recorder.frames.map(({ vehicleName: _, ...frame }) => structuredClone(frame));
    expect(mirrored.length).toBeGreaterThan(50);
    expect(mirrored).toEqual(original.flight.frames.slice(0, mirrored.length));
  }, 120_000);
});

describe('custom satellites (D06): one resolver', () => {
  it('resolves the inline spec, else the catalogue', () => {
    const custom = satelliteCopyOf('comsat');
    expect(missionSatellite({ satelliteId: 'comsat' })).toBe(satelliteById('comsat'));
    expect(missionSatellite({ satelliteId: custom.id, satelliteSpec: custom })).toBe(custom);
    expect(() => missionSatellite({ satelliteId: 'comsat', satelliteSpec: custom })).toThrow(/comsat-copy/);
    expect(() => missionSatellite({ satelliteId: 'nothing' })).toThrow(/Unknown satellite/);
  });

  it('gives a custom satellite its own name, untranslated, wherever the interface names it', () => {
    const g = globalThis as { document?: unknown };
    if (!g.document) g.document = { documentElement: {} };
    const mine = satelliteCopyOf('comsat', { id: 'my-sat', name: 'My first satellite' });
    try {
      for (const lang of ['en', 'ru', 'th'] as const) {
        setLang(lang);
        expect(satelliteName(mine)).toBe('My first satellite');
        // the payload separation event names it by its id, which no dictionary knows
        const text = t('evt.payloadSep', localizeEventParams(vehicleById('falcon9'), { name: mine.name, satId: mine.id }));
        expect(text, lang).toContain('My first satellite');
        // the catalogue's copy it came from is still translated
        if (lang !== 'en') expect(satelliteName(satelliteById('comsat'))).not.toBe(satelliteById('comsat').name);
      }
    } finally { setLang('en'); }
  });
});

describe('custom satellites (D06): a lesson that locks one', () => {
  it('holds its locked satellite to the spec, not only the id', () => {
    const mine = satelliteCopyOf('earthObs', { id: 'my-imager', name: 'My imager' });
    const mission = missionDocument({ ...defaultMissionState(), vehicleId: 'falcon9', siteId: 'cape', orbitId: 'sso', orbit: orbitById('sso'),
      satelliteId: mine.id, satelliteSpec: mine, payloadMass: mine.mass, dynamics: defaultDynamics('falcon9') });
    const lesson = { locked: ['setup.satellite' as const], mission };
    const flown = (edit?: (s: SatelliteSpec) => void) => lessonConfig(mission, (s) => { if (edit) edit(s.satelliteSpec!); });
    expect(brokenLocks(lesson, { cfg: flown() } as LessonFlight)).toEqual([]);
    expect(brokenLocks(lesson, { cfg: flown((s) => { s.propulsion!.thrust = 400; }) } as LessonFlight)).toEqual(['setup.satellite']);
    // the catalogue's lessons are held as before
    const catalogue = BUILTIN_LESSONS.find((l) => l.locked.includes('setup.satellite'))!;
    expect(brokenLocks(catalogue, { cfg: lessonConfig(catalogue.mission) } as LessonFlight)).toEqual([]);
  });
});

describe('custom satellites (D06): a mission holds one to the same checks as any other', () => {
  const input = (spec: unknown, extra: Partial<ConfigInput> = {}): ConfigInput => ({
    vehicleId: 'soyuz21a', satelliteId: (spec as SatelliteSpec | null)?.id ?? 'x', satelliteSpec: spec as SatelliteSpec, siteId: 'baikonur',
    orbit: orbitById('iss'), launchTime: new Date(Date.UTC(2026, 8, 15, 12)), payloadMass: 7150, guidanceOverrides: {},
    failure: { mode: 'none', time: 0, stage: 0 }, boosterRecovery: false, ...extra,
  });

  it('accepts a copy, and refuses a malformed one or one the mission does not name', () => {
    const crew = satelliteCopyOf('crew');
    expect(validateConfigInput(input(crew))).toEqual([]);
    expect(validateConfigInput(input({ ...crew, mass: NaN }))).toEqual([
      { field: 'setup.satellite', code: 'satelliteSpec', detail: 'mass must be a finite number (got NaN)' }]);
    expect(validateConfigInput(input(crew, { satelliteId: 'other' }))).toEqual([
      { field: 'setup.satellite', code: 'satelliteSpec', detail: 'id is "crew-copy", but the mission names satellite "other"' }]);
    expect(validateConfigInput(input(null, { satelliteId: 'crew' }))).toEqual([
      { field: 'setup.satellite', code: 'satelliteSpec', detail: 'the satellite must be a satellite (got null)' }]);
    // without a spec, an id the catalogue does not know is a bad selection, as before
    expect(validateConfigInput(input(undefined, { satelliteId: 'crew-copy' }))).toEqual([{ field: 'setup.satellite', code: 'selection' }]);
  });

  it('opens the rendezvous and the launch abort by the satellite\'s own figures, not its id', () => {
    const crew = satelliteCopyOf('crew');
    expect(validateConfigInput(input(crew, { rendezvous: { profile: 'twoOrbit' }, failure: { mode: 'launchAbort', time: 30, stage: 0 } }))).toEqual([]);
    // no engine: no flight on to the station; no crew: nothing for the escape to save
    const { propulsion: _, ...noEngine } = crew;
    expect(validateConfigInput(input(noEngine, { rendezvous: { profile: 'twoOrbit' } }))).toEqual([{ field: 'setup.rendezvous', code: 'rendezvousUnavailable' }]);
    const { crewed: __, ...uncrewed } = crew;
    expect(validateConfigInput(input(uncrewed, { failure: { mode: 'launchAbort', time: 30, stage: 0 } })))
      .toEqual([{ field: 'setup.failureMode', code: 'failureUnavailable' }]);
  });
});
