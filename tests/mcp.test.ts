/**
 * WebMCP tool handlers (`src/mcp.ts`), against a minimal fake of the app
 * shell — no DOM, no real `Simulation`, no real `FlightRecorder`/`ReplayPlayer`.
 * `createMcpTools` only ever touches the `McpAppHost` surface, so the fake
 * below is enough to pin every handler's validation and behaviour; the
 * DOM-touching half (`registerMcpTools`'s `navigator.modelContext` /
 * `document.modelContext` lookup) gets one smoke test confirming it never
 * throws when neither exists, which is the normal case in this `node` test
 * environment and in any browser without WebMCP support.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { createMcpTools, registerMcpTools, type McpAppHost, type WebMcpTool } from '../src/mcp';
import { vehicleById } from '../src/data/vehicles';
import { siteById } from '../src/data/sites';
import { satelliteById } from '../src/data/satellites';
import { orbitById } from '../src/data/orbits';
import { guidanceForVehicle, DEFAULT_FAILURE } from '../src/physics/defaults';
import { missionVerdict, type Feasibility } from '../src/ui/panel';
import { planMission, resolveTarget } from '../src/physics/mission';
import { DEG, RAD } from '../src/physics/constants';
import { defaultDynamics } from '../src/physics/rigid/config';
import type { RigidCommand, RigidTelemetry } from '../src/physics/rigid/telemetry';
import type { CameraMode } from '../src/render/cameras';
import type { Simulation, SimEvent, TelemetrySample } from '../src/physics/simulation';
import type { VisualFrame } from '../src/physics/frame';
import type { MissionConfig } from '../src/types';

// ────────────────────────────────────────────────────────────────── fakes

function makeFrame(overrides: Partial<VisualFrame> = {}): VisualFrame {
  const zero = { x: 0, y: 0, z: 0 };
  return {
    t: 120, status: 'ascent', ascentPhase: 'gravityTurn', note: 'ascent',
    r: zero, v: zero, dir: { x: 0, y: 1, z: 0 },
    throttle: 1, thrust: 1e6, mass: 5e5,
    altitude: 60000, altitudeAGL: 60000, airspeed: 1800, speed: 1850, vz: 900,
    q: 18000, mach: 5.4, gLoad: 2.1, pressure: 3000,
    theta: 0, jd: 2461000.5, lat: 45.1, lon: 63.2,
    downrange: 80000, pitchCmd: 42,
    elements: { a: 6.7e6, e: 0.02, i: 0.9, raan: 0, argp: 0, nu: 0, energy: -3e7, h: 5e10, u: 0, periapsisAlt: 190000, apoapsisAlt: 220000, period: 5400 },
    stages: [
      // 'blokA' is soyuz21a's real first-stage id, so the name-lookup path is
      // exercised for real; 'spacecraft' is not any vehicle's stage id, so it
      // exercises the synthetic-stage fallback instead.
      { id: 'blokA', index: 0, attached: true, burning: true, propellantFraction: 0.4, isSpacecraft: false },
      { id: 'spacecraft', index: 1, attached: true, burning: false, propellantFraction: 1, isSpacecraft: true },
    ],
    boosters: [],
    activeStageIndex: 0,
    fairingAttached: true,
    payloadSeparated: false,
    destroyed: false,
    liftoff: true,
    debris: [],
    eventCount: 2,
    nextBurnTime: -1,
    dvRemaining: 4200,
    maxQ: { value: 18000, t: 60, alt: 12000 },
    losses: { dvThrust: 3200, gravity: 950, drag: 120, steering: 60 },
    ...overrides,
  } as VisualFrame;
}

const EVENTS: SimEvent[] = [
  { t: 10, key: 'evt.liftoff', severity: 'info' },
  { t: 60, key: 'evt.maxQ', severity: 'info' },
  { t: 155, key: 'evt.meco', severity: 'major', params: { stage: 'Blok A (core)' } },
];

function rigidTelemetry(rate = 0): RigidTelemetry {
  return {
    modelVersion: 'sixdof-1', attitudeQ: { w: 1, x: 0, y: 0, z: 0 },
    omegaBody: { x: rate, y: 0, z: 0 }, cgBody: { x: 20, y: 0, z: 0 },
    inertiaBody: [1, 0, 0, 0, 2, 0, 0, 0, 2], renderOffsetBody: { x: -20, y: 0, z: 0 },
    controlMode: 'auto', engineDeflections: { 's1.engine.0': [0.01, -0.02] },
    engineDirectionsBody: { 's1.engine.0': { x: 1, y: 0, z: 0 } },
    engineThrottles: { 's1.engine.0': 0.8 }, rcsPropellantKg: 30, saturated: false,
    angleOfAttack: 0, sideslip: 0, aeroWithinEnvelope: true, windECI: { x: 0, y: 0, z: 0 },
    rawQuaternionNormError: 0,
  };
}

function makeFakeSim(cfg: MissionConfig): Simulation {
  const sample: TelemetrySample = {
    t: 0, alt: 0, vInertial: 0, vAir: 0, q: 0, mach: 0, gLoad: 1, mass: 310000, thrust: 0,
    throttle: 0, pitch: 90, ap: 0, pe: 0, inc: 51.6, dvRemaining: 9000, downrange: 0,
    lat: 45.965, lon: 63.305, stage: 0, phase: 'prelaunch',
  };
  return {
    cfg,
    vehicleSpec: vehicleById(cfg.vehicleId),
    site: siteById(cfg.siteId),
    satellite: satelliteById(cfg.satelliteId),
    telemetry: [sample, { ...sample, t: 1.5, alt: 40, vInertial: 12 }],
    events: EVENTS.slice(0, 2),
  } as unknown as Simulation;
}

interface FakePanelState {
  dynamics?: MissionConfig['dynamics'];
  vehicleId: string;
  satelliteId: string;
  siteId: string;
  orbitId: string;
  orbit: MissionConfig['orbit'];
  launchTime: Date;
  guidanceOverrides: MissionConfig['guidance'] extends infer G ? Partial<G> : never;
  failure: MissionConfig['failure'];
  boosterRecovery: boolean;
  recoveryPlan?: MissionConfig['recoveryPlan'];
  payloadMass: number;
}

class FakePanel {
  state: FakePanelState = {
    vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbitId: 'iss',
    orbit: { ...orbitById('iss') }, launchTime: new Date('2026-09-20T12:00:00Z'),
    guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    payloadMass: satelliteById('crew').mass,
  };
  renderCount = 0;
  siteReassigned = false;
  /** mirrors `SetupPanel`'s private `tunedFor`, to pin the same staleness bug (review major #3) */
  private tunedFor = this.missionSignature();
  render(): void { this.renderCount++; }
  private missionSignature(): string {
    const s = this.state;
    return `${s.vehicleId}|${s.siteId}|${s.orbitId}|${s.orbit.perigee}|${s.orbit.apogee}|${s.orbit.inclination}|${s.payloadMass}|${s.satelliteId}`;
  }
  /** mirrors `SetupPanel#changed`: what every one of the panel's own edit handlers calls. */
  changed(): void {
    const sig = this.missionSignature();
    if (sig !== this.tunedFor) {
      this.tunedFor = sig;
      if (Object.keys(this.state.guidanceOverrides).length > 0) this.state.guidanceOverrides = {};
    }
    this.render();
    this.siteReassigned = false;
  }
  /** mirrors the corrected `SetupPanel#applyExternalEdit` (review major #1): assigns
   *  rather than OR's `siteReassigned`, and clears it again after computing the
   *  verdict it returns, so it stays genuinely one-shot. */
  applyExternalEdit(opts?: { siteReassigned?: boolean }): Feasibility {
    this.siteReassigned = !!opts?.siteReassigned;
    this.tunedFor = this.missionSignature();
    this.render();
    const verdict = this.feasibility();
    this.siteReassigned = false;
    return verdict;
  }
  getConfig(): MissionConfig {
    const s = this.state;
    return {
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: { ...s.orbit },
      launchTime: new Date(s.launchTime.getTime()),
      guidance: { ...guidanceForVehicle(vehicleById(s.vehicleId), undefined, s.dynamics?.model), ...s.guidanceOverrides },
      failure: { ...s.failure }, boosterRecovery: s.boosterRecovery, payloadMassOverride: s.payloadMass,
      ...(s.boosterRecovery && s.recoveryPlan ? { recoveryPlan: structuredClone(s.recoveryPlan) } : {}),
      guidanceResolved: true,
      dynamics: s.dynamics ? { ...s.dynamics } : undefined,
    };
  }
  feasibility() {
    const s = this.state;
    const site = siteById(s.siteId);
    const spec = vehicleById(s.vehicleId);
    // Like `SetupPanel#refresh`: one plan per verdict, and null when the
    // planner rejects the configuration.
    let plan = null;
    try { plan = planMission(this.getConfig(), site, spec); } catch { plan = null; }
    return missionVerdict({
      spec, site, orbit: s.orbit, satellite: satelliteById(s.satelliteId), payloadMass: s.payloadMass,
      inclinationDeg: resolveTarget(s.orbit, site, s.launchTime).inclination * RAD,
      plan, failureMode: s.failure.mode, siteReassigned: this.siteReassigned,
    });
  }
}

class FakeRecorder {
  events: SimEvent[] = [];
  startTime = -10;
  headTime = 200;
  headFrame = makeFrame();
  /** when set, `recordNow()` returns this instead of `headFrame` — lets a test
   *  tell a stale stored frame apart from what recording "right now" gives
   *  back, the way the real `FlightRecorder` does (review major #3). */
  liveFrame: VisualFrame | null = null;
  get head(): VisualFrame | null { return this.headFrame; }
  recordNow(): VisualFrame { return this.liveFrame ?? this.headFrame; }
}

class FakePlayer {
  live = true;
  playing = false;
  cursor = 200;
  replayFrame: VisualFrame | null = null;
  events: SimEvent[] = [];
  frame(): VisualFrame | null { return this.replayFrame; }
  lastEvent(t: number): SimEvent | null {
    let out: SimEvent | null = null;
    for (const e of this.events) { if (e.t <= t + 1e-6) out = e; else break; }
    return out;
  }
  nextEvent(t: number): SimEvent | null {
    for (const e of this.events) if (e.t > t + 1e-6) return e;
    return null;
  }
}

class FakeHost implements McpAppHost {
  panel = new FakePanel();
  recorder = new FakeRecorder();
  player = new FakePlayer();
  sim: Simulation | null = null;
  camMode: CameraMode = 'exterior';
  playing = false;
  warp = 1;
  replayWarp = 1;
  calls: string[] = [];
  setCamera(mode: CameraMode): void { this.camMode = mode; this.calls.push(`setCamera:${mode}`); }
  togglePlay(): void {
    this.calls.push('togglePlay');
    if (this.player.live) this.playing = !this.playing; else this.player.playing = !this.player.playing;
  }
  /** mirrors `App.setWarp`: sets whichever clock is active and nothing else (no DOM selector to sync here). */
  setWarp(v: number): void {
    this.calls.push(`setWarp:${v}`);
    if (this.player.live) this.warp = v; else this.replayWarp = v;
  }
  seek(time: number): void {
    this.calls.push(`seek:${time}`);
    this.player.cursor = Math.max(this.recorder.startTime, Math.min(this.recorder.headTime, time));
    this.player.live = this.player.cursor >= this.recorder.headTime;
  }
  goLive(): void { this.calls.push('goLive'); this.player.live = true; this.player.cursor = this.recorder.headTime; }
  skip(): void { this.calls.push('skip'); }
  previousEvent(): void { this.calls.push('previousEvent'); }
  preview(cfg: MissionConfig): void { this.calls.push('preview'); this.sim = makeFakeSim(cfg); this.playing = false; }
  launch(cfg: MissionConfig): void { this.calls.push('launch'); this.sim = makeFakeSim(cfg); this.playing = true; }
}

function tool(tools: WebMcpTool[], name: string): WebMcpTool {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`no such tool: ${name}`);
  return t;
}

let host: FakeHost;
let tools: WebMcpTool[];
beforeEach(() => {
  host = new FakeHost();
  tools = createMcpTools(host);
});

// ──────────────────────────────────────────────────────────────── tests

describe('createMcpTools', () => {
  it('builds the documented tools, each with a name, schema and annotations', () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual([
      'read_flight_state', 'list_missions', 'configure_mission', 'launch_mission',
      'control_playback', 'set_flight_control', 'seek', 'set_camera', 'get_events', 'export_csv',
    ]);
    expect(new Set(names).size).toBe(names.length);
    for (const t of tools) {
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.inputSchema.type).toBe('object');
      expect(typeof t.execute).toBe('function');
    }
  });
});

describe('list_missions', () => {
  it('lists the fleet, sites, satellites and orbit presets', () => {
    const out = tool(tools, 'list_missions').execute({}) as { vehicles: unknown[]; sites: unknown[]; satellites: unknown[]; orbitPresets: unknown[] };
    expect(out.vehicles.length).toBeGreaterThanOrEqual(18);
    expect(out.sites.length).toBeGreaterThanOrEqual(15);
    expect(out.satellites.length).toBeGreaterThan(0);
    expect(out.orbitPresets.length).toBeGreaterThan(0);
  });
});

describe('read_flight_state', () => {
  it('returns copied rigid telemetry from the selected replay frame, including detached bodies', () => {
    host.sim = makeFakeSim(host.panel.getConfig());
    host.player.live = false;
    host.recorder.headFrame = makeFrame({ rigid: rigidTelemetry(9) });
    const rigid = rigidTelemetry(0.2), detached = rigidTelemetry(0.4);
    host.player.replayFrame = makeFrame({ t: 30, rigid,
      debris: [{ id: 7, name: 'Stage 1', rigid: detached, outcome: 'landed' }] as VisualFrame['debris'] });
    const out = tool(tools, 'read_flight_state').execute({}) as any;
    expect(out.frame.rigid.omegaBody.x).toBe(0.2);
    expect(out.frame.detachedBodies[0]).toMatchObject({ id: 7, outcome: 'landed', rigid: { omegaBody: { x: 0.4 } } });
    out.frame.rigid.engineDeflections['s1.engine.0'][0] = 99;
    out.frame.rigid.attitudeQ.w = 0;
    out.frame.detachedBodies[0].rigid.engineDirectionsBody['s1.engine.0'].x = -1;
    expect(rigid.engineDeflections['s1.engine.0'][0]).toBe(0.01);
    expect(rigid.attitudeQ.w).toBe(1);
    expect(detached.engineDirectionsBody!['s1.engine.0'].x).toBe(1);
  });

  it('is a safe no-op with no mission configured', () => {
    const out = tool(tools, 'read_flight_state').execute({}) as { hasMission: boolean };
    expect(out.hasMission).toBe(false);
  });

  it('summarises the live head frame when a mission is running', () => {
    host.sim = makeFakeSim(host.panel.getConfig());
    const out = tool(tools, 'read_flight_state').execute({}) as any;
    expect(out.hasMission).toBe(true);
    expect(out.mode).toBe('live');
    expect(out.vehicle.id).toBe('soyuz21a');
    expect(out.frame.status).toBe('ascent');
    expect(out.frame.altitudeKm).toBeCloseTo(60, 5);
    expect(out.frame.apoapsisKm).toBeCloseTo(220, 5);
    expect(out.frame.periapsisKm).toBeCloseTo(190, 5);
    expect(out.frame.stage.index).toBe(0);
    expect(out.frame.stage.name).toBe('Blok A (core)');
  });

  it('falls back to the frame\'s own stage id when it names no spec stage (the synthetic spacecraft stage)', () => {
    host.sim = makeFakeSim(host.panel.getConfig());
    host.recorder.headFrame = makeFrame({ activeStageIndex: 1 });
    const out = tool(tools, 'read_flight_state').execute({}) as any;
    expect(out.frame.stage.index).toBe(1);
    expect(out.frame.stage.isSpacecraft).toBe(true);
    expect(out.frame.stage.name).toBe('Spacecraft propulsion');
  });

  it('in live mode, uses recordNow() rather than the (possibly stale) stored head frame (regression, review major #3)', () => {
    host.sim = makeFakeSim(host.panel.getConfig());
    host.player.live = true;
    host.player.cursor = 2005;
    // The stored head lags the live cursor, as it legitimately can during a
    // sparse-cadence coast (`FlightRecorder`'s store interval is up to 30 s
    // there) — `recorder.head` alone would return this stale frame.
    host.recorder.headFrame = makeFrame({ t: 1980, altitude: 384560 });
    host.recorder.liveFrame = makeFrame({ t: 2005, altitude: 386950 });
    const out = tool(tools, 'read_flight_state').execute({}) as any;
    expect(out.frame.timeS).toBe(out.cursorTimeS);
    expect(out.frame.timeS).toBe(2005);
    expect(out.frame.altitudeKm).toBeCloseTo(386.95, 5);
  });

  it('reads the replay frame while scrubbed behind the head', () => {
    host.sim = makeFakeSim(host.panel.getConfig());
    host.player.live = false;
    host.player.replayFrame = makeFrame({ t: 30, status: 'ascent', altitude: 8000 });
    host.player.events = EVENTS;
    host.player.cursor = 30;
    const out = tool(tools, 'read_flight_state').execute({}) as any;
    expect(out.mode).toBe('replay');
    expect(out.frame.altitudeKm).toBeCloseTo(8, 5);
    expect(out.lastEvent.key).toBe('evt.liftoff');
    expect(out.nextEvent.key).toBe('evt.maxQ');
  });
});

describe('configure_mission', () => {
  it('uses the same physics defaults as the panel when switching vehicles', () => {
    const configure = tool(tools, 'configure_mission');
    configure.execute({ vehicleId: 'electron' });
    expect(host.panel.state.dynamics?.model).toBe('sixDof');
    configure.execute({ vehicleId: 'falcon9' });
    expect(host.panel.state.dynamics).toEqual(defaultDynamics('falcon9'));
    configure.execute({ vehicleId: 'soyuz21a' });
    expect(host.panel.state.dynamics).toEqual(defaultDynamics('soyuz21a'));
    configure.execute({ vehicleId: 'electron' });
    expect(host.panel.state.dynamics).toEqual(defaultDynamics('electron'));
  });

  it('preserves an explicit current-vehicle model, but accepts explicit overrides with a vehicle change', () => {
    const configure = tool(tools, 'configure_mission');
    configure.execute({ vehicleId: 'falcon9', physicsModel: 'pointMass', windScenario: 'crosswind', windSeed: 123 });
    configure.execute({ vehicleId: 'falcon9', payloadMassKg: 3000 });
    expect(host.panel.state.dynamics).toEqual({ model: 'pointMass', wind: 'crosswind', seed: 123 });
    configure.execute({ vehicleId: 'soyuz21a', windScenario: 'shear', windSeed: 10 });
    expect(host.panel.state.dynamics).toEqual({ model: 'sixDof', wind: 'shear', seed: 10 });
  });

  it('rejects an unknown vehicle with a clear, listing error', () => {
    expect(() => tool(tools, 'configure_mission').execute({ vehicleId: 'saturn-v' }))
      .toThrowError(/Unknown vehicleId "saturn-v"/);
  });

  it('applies a valid configuration, re-renders the panel and previews it', () => {
    const out = tool(tools, 'configure_mission').execute({ vehicleId: 'falcon9', satelliteId: 'starlink', siteId: 'cape', payloadMassKg: 8000 }) as any;
    expect(out.ok).toBe(true);
    expect(out.notices).toEqual([]);
    expect(host.panel.state.vehicleId).toBe('falcon9');
    expect(host.panel.state.siteId).toBe('cape');
    expect(host.panel.state.payloadMass).toBe(8000);
    expect(host.panel.renderCount).toBe(1);
    expect(host.calls).toContain('preview');
    expect(host.calls).not.toContain('launch');
    expect(out.config.vehicleId).toBe('falcon9');
    expect(out.config.payloadMassKg).toBe(8000);
    expect(['ok', 'warn', 'fail']).toContain(out.feasibility.level);
  });

  it('reassigns the site with a notice when the vehicle cannot fly from it', () => {
    // Baikonur (the default site) is not in Falcon 9's site list.
    const out = tool(tools, 'configure_mission').execute({ vehicleId: 'falcon9' }) as any;
    expect(out.notices.length).toBe(1);
    expect(out.notices[0]).toMatch(/Site reassigned/);
    expect(vehicleById('falcon9').sites).toContain(host.panel.state.siteId);
  });

  it('rejects a site the chosen vehicle does not fly from', () => {
    expect(() => tool(tools, 'configure_mission').execute({ vehicleId: 'falcon9', siteId: 'baikonur' }))
      .toThrowError(/does not fly from "baikonur"/);
  });

  it('switches the orbit to custom when a custom field is given, in the right units', () => {
    const out = tool(tools, 'configure_mission').execute({ perigeeKm: 300, apogeeKm: 500, inclinationDeg: 97.4 }) as any;
    expect(host.panel.state.orbitId).toBe('custom');
    expect(host.panel.state.orbit.perigee).toBeCloseTo(300000, 3);
    expect(host.panel.state.orbit.apogee).toBeCloseTo(500000, 3);
    expect(out.config.orbit.perigeeKm).toBeCloseTo(300, 5);
    expect(out.config.orbit.apogeeKm).toBeCloseTo(500, 5);
  });

  it('rejects an unknown orbit preset id', () => {
    expect(() => tool(tools, 'configure_mission').execute({ orbitId: 'trans-lunar' }))
      .toThrowError(/Unknown orbitId "trans-lunar"/);
  });

  it('validates guidance overrides against the panel-measured ranges', () => {
    expect(() => tool(tools, 'configure_mission').execute({ guidance: { kickAngleDeg: 90 } }))
      .toThrowError(/guidance\.kickAngleDeg must be between 0 and 45/);
    expect(() => tool(tools, 'configure_mission').execute({ guidance: { notAField: 1 } }))
      .toThrowError(/Unknown guidance field "notAField"/);
    const out = tool(tools, 'configure_mission').execute({ guidance: { kickAngleDeg: 4, loftAltitudeKm: 80 } }) as any;
    expect(host.panel.state.guidanceOverrides.kickAngle).toBe(4);
    expect(host.panel.state.guidanceOverrides.loftAltitude).toBe(80000);
    expect(out.config.guidance.kickAngleDeg).toBe(4);
    expect(out.config.guidance.loftAltitudeKm).toBe(80);
  });

  it('rejects a non-ISO launch time', () => {
    expect(() => tool(tools, 'configure_mission').execute({ launchTimeIso: 'not a date' }))
      .toThrowError(/not a valid ISO 8601/);
  });

  it('rejects booster recovery on a vehicle that has none', () => {
    expect(() => tool(tools, 'configure_mission').execute({ vehicleId: 'soyuz21a', boosterRecovery: true }))
      .toThrowError(/has no first-stage recovery option/);
  });

  it('sets where each recovered stage lands, checks it against the vehicle and the site, and clears it with null', () => {
    const configure = tool(tools, 'configure_mission');
    const out = configure.execute({ vehicleId: 'falconheavy', siteId: 'ksc39a', satelliteId: 'comsat', orbitId: 'gto', boosterRecovery: true,
      recoveryPlan: { core: { kind: 'droneShip' }, boosters: [{ kind: 'landingZone', zoneId: 'lz1' }, { kind: 'landingZone', zoneId: 'lz2' }] } }) as any;
    expect(host.panel.state.recoveryPlan?.boosters?.[1]).toEqual({ kind: 'landingZone', zoneId: 'lz2' });
    expect(out.config.recoveryPlan.core).toEqual({ kind: 'droneShip' });
    // Starbase's tower is not a place a flight from Kennedy can reach; a kind that does not exist
    expect(() => configure.execute({ recoveryPlan: { core: { kind: 'landingZone', zoneId: 'olm' } } })).toThrowError(/boosterRecovery/);
    expect(() => configure.execute({ recoveryPlan: { core: { kind: 'teleport' } } })).toThrowError(/must be one of/);
    expect(() => configure.execute({ recoveryPlan: { core: { kind: 'landingZone', zoneId: 'lz9' } } })).toThrowError(/Unknown landing zone/);
    // a rejected edit leaves the plan as it was
    expect(host.panel.state.recoveryPlan?.core).toEqual({ kind: 'droneShip' });
    configure.execute({ recoveryPlan: null });
    expect(host.panel.state.recoveryPlan).toBeUndefined();
    // a plan belongs to one vehicle at one site
    configure.execute({ recoveryPlan: { core: { kind: 'expended' } } });
    configure.execute({ vehicleId: 'falcon9' });
    expect(host.panel.state.recoveryPlan).toBeUndefined();
  });

  it('takes a suborbital target for Starship only, with its perigee below the ground', () => {
    const configure = tool(tools, 'configure_mission');
    const out = configure.execute({ vehicleId: 'starship', siteId: 'starbase', suborbital: true, perigeeKm: -15, apogeeKm: 213, inclinationDeg: 26.2, payloadMassKg: 0 }) as any;
    expect(host.panel.state.orbit.suborbital).toBe(true);
    expect(host.panel.state.orbit.perigee).toBe(-15000);
    expect(out.config.orbit.suborbital).toBe(true);
    expect(() => configure.execute({ perigeeKm: 50 })).toThrowError(/at most 0/);
    expect(() => configure.execute({ vehicleId: 'falcon9', siteId: 'cape' })).toThrowError(/suborbital target/);
    // an orbit again needs a perigee above the air and a payload
    expect(() => configure.execute({ suborbital: false })).toThrowError(/setup\.perigee must be at least 100/);
    configure.execute({ suborbital: false, perigeeKm: 213, payloadMassKg: 1000 });
    expect(host.panel.state.orbit.suborbital).toBeUndefined();
    const missions = tool(tools, 'list_missions').execute({}) as any;
    expect(missions.vehicles.find((v: any) => v.id === 'starship').suborbitalCapable).toBe(true);
    expect(missions.landingZones.map((z: any) => z.id)).toEqual(['lz1', 'lz2', 'olm']);
  });

  it('rejects a custom perigee above the apogee', () => {
    expect(() => tool(tools, 'configure_mission').execute({ perigeeKm: 800, apogeeKm: 200 }))
      .toThrowError(/perigee \(800\.0 km\) must not exceed apogee \(200\.0 km\)/);
  });

  it('does not throw on a valid but infeasible mission; reports it through feasibility instead (review major #1)', () => {
    const out = tool(tools, 'configure_mission').execute({ vehicleId: 'electron', siteId: 'mahia', payloadMassKg: 9000 }) as any;
    expect(out.ok).toBe(true);
    expect(out.feasibility.level).toBe('fail');
    expect(host.calls).toContain('preview'); // applied and previewed, like the panel would
  });

  it('a guidance override applied together with a mission change survives a later, unrelated panel edit (regression, review major #3)', () => {
    tool(tools, 'configure_mission').execute({ vehicleId: 'atlasv551', siteId: 'cape', orbitId: 'gto', guidance: { kickAngleDeg: 3.5, loftAltitudeKm: 120 } });
    expect(host.panel.state.guidanceOverrides.kickAngle).toBe(3.5);
    // Simulate the operator then touching an unrelated control through the
    // panel's own path, which always ends in `changed()`. Before the fix this
    // saw a stale `tunedFor` signature and silently cleared the override.
    host.panel.state.boosterRecovery = false;
    host.panel.changed();
    expect(host.panel.state.guidanceOverrides.kickAngle).toBe(3.5);
    expect(host.panel.state.guidanceOverrides.loftAltitude).toBe(120000);
  });

  it('reports the site-reassigned warning through the returned feasibility (not just the notice text)', () => {
    // Baikonur (the default site) is not in Falcon 9's site list.
    const out = tool(tools, 'configure_mission').execute({ vehicleId: 'falcon9' }) as any;
    expect(out.notices.length).toBe(1);
    expect(out.feasibility.level).toBe('warn');
    expect(out.feasibility.text).toMatch(/previous site/i);
    // The flag itself is one-shot (review major #1): cleared once this call's
    // verdict has been computed, so it never masks a later call's verdict.
    expect(host.panel.siteReassigned).toBe(false);
  });

  it('the site-reassigned warning is genuinely one-shot: it does not mask a later call\'s verdict (regression, review major #1)', () => {
    // Baikonur is not in Falcon 9's site list, so this reassigns the site and
    // (correctly) reports the warning once.
    const first = tool(tools, 'configure_mission').execute({ vehicleId: 'falcon9' }) as any;
    expect(first.feasibility.text).toMatch(/previous site/i);
    expect(host.panel.siteReassigned).toBe(false); // cleared, not left sticky
    // A second, unrelated edit must not still see the first edit's
    // reassignment: before the fix this returned the same stale "site
    // reassigned" verdict instead of the failure-armed one.
    const second = tool(tools, 'configure_mission').execute({ failureMode: 'engineOut' }) as any;
    expect(second.notices).toEqual([]);
    expect(second.feasibility.text).not.toMatch(/previous site/i);
    expect(second.feasibility.text).toMatch(/armed|engineOut|engine/i);
    // And a third call with no reassignment and no failure keeps reporting
    // fresh verdicts rather than being stuck on the first one.
    const third = tool(tools, 'configure_mission').execute({ failureMode: 'none', payloadMassKg: 100 }) as any;
    expect(third.feasibility.text).not.toMatch(/previous site/i);
  });

  it('is transactional: a throw part-way through never leaves a partial edit on panel.state (regression, review major #2)', () => {
    const before = JSON.parse(JSON.stringify(host.panel.state));
    // vehicleId is written before siteId is validated and rejected.
    expect(() => tool(tools, 'configure_mission').execute({ vehicleId: 'falcon9', siteId: 'baikonur' }))
      .toThrowError(/does not fly from "baikonur"/);
    expect(JSON.parse(JSON.stringify(host.panel.state))).toEqual(before);
    expect(host.panel.renderCount).toBe(0);

    // guidance fails after satelliteId (and its payload mass) were set.
    expect(() => tool(tools, 'configure_mission').execute({ satelliteId: 'crew', guidance: { kickAngleDeg: 99 } }))
      .toThrowError(/guidance\.kickAngleDeg must be between/);
    expect(JSON.parse(JSON.stringify(host.panel.state))).toEqual(before);
    expect(host.panel.renderCount).toBe(0);
  });

  it('a throw in launch_mission\'s configure step is also transactional, and never launches', () => {
    const before = JSON.parse(JSON.stringify(host.panel.state));
    expect(() => tool(tools, 'launch_mission').execute({ vehicleId: 'falcon9', siteId: 'baikonur' }))
      .toThrowError(/does not fly from "baikonur"/);
    expect(JSON.parse(JSON.stringify(host.panel.state))).toEqual(before);
    expect(host.calls).not.toContain('launch');
    expect(host.sim).toBeNull();
  });

  it('an explicit orbitId "custom" gets the custom preset\'s own name/description, not a leftover preset\'s', () => {
    const out = tool(tools, 'configure_mission').execute({ orbitId: 'custom' }) as any;
    expect(host.panel.state.orbitId).toBe('custom');
    expect(host.panel.state.orbit.name).not.toBe(orbitById('iss').name);
    expect(out.config.orbit.id).toBe('custom');
  });

  it('rejects an out-of-band failure time', () => {
    expect(() => tool(tools, 'configure_mission').execute({ failureTimeS: 1e9 }))
      .toThrowError(/"failureTimeS" must be between 0 and 2000/);
  });

  it.each([
    { perigeeKm: 99 }, { inclinationDeg: 181 }, { ltanHours: -1 },
    { payloadMassKg: 0 }, { apogeeKm: Number.MAX_VALUE },
    { launchTimeIso: '2026-02-30T12:00:00Z' }, { launchTimeIso: '2026-09-20T12:00' },
  ])('rejects invalid input transactionally instead of silently clamping: %j', (input) => {
    const before = JSON.stringify(host.panel.state);
    expect(() => tool(tools, 'configure_mission').execute(input)).toThrowError();
    expect(JSON.stringify(host.panel.state)).toBe(before);
    expect(host.calls).not.toContain('preview');
  });
});

describe('launch_mission', () => {
  it('with no arguments, launches whatever is currently configured', () => {
    const out = tool(tools, 'launch_mission').execute({}) as any;
    expect(out.ok).toBe(true);
    expect(out.mode).toBe('live');
    expect(out.playing).toBe(true);
    expect(host.calls).toContain('launch');
    expect(host.calls).not.toContain('preview');
    expect(host.sim).not.toBeNull();
    expect(out.config.vehicleId).toBe('soyuz21a'); // the panel's default
  });

  it('with arguments, configures then launches', () => {
    const out = tool(tools, 'launch_mission').execute({ vehicleId: 'electron', satelliteId: 'cubesats', siteId: 'mahia' }) as any;
    expect(out.config.vehicleId).toBe('electron');
    expect(host.panel.state.vehicleId).toBe('electron');
    expect(host.sim?.vehicleSpec.id).toBe('electron');
  });
});

describe('set_flight_control', () => {
  let commands: RigidCommand[];
  beforeEach(() => {
    host.panel.state.dynamics = defaultDynamics('soyuz21a');
    host.sim = makeFakeSim(host.panel.getConfig());
    commands = [];
    host.sim.setRigidCommand = command => { commands.push(command); };
  });

  it('converts manual ISO body rates (p, q, r) to the simulator\'s axes in radians and applies finite-actuator commands', () => {
    const out = tool(tools, 'set_flight_control').execute({ mode: 'manual', rollRateDegS: 2, pitchRateDegS: -3, yawRateDegS: 5, throttle: 0.6 }) as any;
    expect(out.ok).toBe(true);
    // The simulator's x is the nose, y the belly side, z the left: x = p, y = r, z = −q (src/ui/notation.ts).
    expect(commands).toEqual([{ mode: 'manual', rates: { x: 2 * DEG, y: 5 * DEG, z: 3 * DEG }, throttle: 0.6 }]);
    expect(out.ratesRadS).toEqual({ p: 2 * DEG, q: -3 * DEG, r: 5 * DEG });
    tool(tools, 'set_flight_control').execute({ mode: 'auto' });
    expect(commands[1]).toEqual({ mode: 'auto', rates: { x: 0, y: 0, z: 0 }, throttle: 1 });
  });

  it.each([
    { mode: 'invalid' }, { mode: 'manual', rollRateDegS: 5.01 },
    { mode: 'manual', pitchRateDegS: -6 }, { mode: 'manual', yawRateDegS: NaN },
    { mode: 'manual', throttle: -0.1 }, { mode: 'manual', throttle: 1.1 },
  ])('rejects invalid commands atomically: %j', input => {
    expect(() => tool(tools, 'set_flight_control').execute(input)).toThrow();
    expect(commands).toEqual([]);
  });

  it('does not mutate flight controls from replay or a point-mass mission', () => {
    host.player.live = false;
    expect(tool(tools, 'set_flight_control').execute({ mode: 'manual' })).toMatchObject({ ok: false, reason: expect.stringContaining('Replay') });
    expect(host.calls).not.toContain('goLive');
    host.player.live = true;
    host.sim!.cfg.dynamics = { model: 'pointMass', wind: 'calm', seed: 0 };
    expect(tool(tools, 'set_flight_control').execute({ mode: 'manual' })).toMatchObject({ ok: false });
    expect(commands).toEqual([]);
  });
});

describe('control_playback', () => {
  it('is a safe no-op with no mission configured, for every action', () => {
    for (const action of ['play', 'pause', 'live', 'skip_next', 'skip_previous']) {
      const out = tool(tools, 'control_playback').execute({ action }) as any;
      expect(out.ok).toBe(false);
    }
  });

  it('rejects an unknown action', () => {
    expect(() => tool(tools, 'control_playback').execute({ action: 'rewind' })).toThrowError(/"action" must be one of/);
  });

  it('play/pause act on the live flight while at the head', () => {
    host.sim = makeFakeSim(host.panel.getConfig());
    host.player.live = true;
    host.playing = false;
    let out = tool(tools, 'control_playback').execute({ action: 'play' }) as any;
    expect(out.playing).toBe(true);
    expect(host.playing).toBe(true);
    out = tool(tools, 'control_playback').execute({ action: 'play' }) as any; // idempotent
    expect(host.calls.filter((c) => c === 'togglePlay').length).toBe(1);
    out = tool(tools, 'control_playback').execute({ action: 'pause' }) as any;
    expect(out.playing).toBe(false);
    expect(host.playing).toBe(false);
  });

  it('play/pause act on the replay cursor while scrubbed behind the head', () => {
    host.sim = makeFakeSim(host.panel.getConfig());
    host.player.live = false;
    host.player.playing = false;
    const out = tool(tools, 'control_playback').execute({ action: 'play' }) as any;
    expect(out.mode).toBe('replay');
    expect(host.player.playing).toBe(true);
    expect(host.playing).toBe(false); // the live flight is untouched
  });

  it('"live" returns to the recording head', () => {
    host.sim = makeFakeSim(host.panel.getConfig());
    host.player.live = false;
    tool(tools, 'control_playback').execute({ action: 'live' });
    expect(host.calls).toContain('goLive');
  });

  it('"skip_next"/"skip_previous" delegate to the app', () => {
    host.sim = makeFakeSim(host.panel.getConfig());
    tool(tools, 'control_playback').execute({ action: 'skip_next' });
    tool(tools, 'control_playback').execute({ action: 'skip_previous' });
    expect(host.calls).toContain('skip');
    expect(host.calls).toContain('previousEvent');
  });

  it('"warp" sets the warp of whichever clock is active, and validates its argument', () => {
    host.sim = makeFakeSim(host.panel.getConfig());
    host.player.live = true;
    tool(tools, 'control_playback').execute({ action: 'warp', warp: 50 });
    expect(host.warp).toBe(50);
    host.player.live = false;
    tool(tools, 'control_playback').execute({ action: 'warp', warp: 5 });
    expect(host.replayWarp).toBe(5);
    expect(() => tool(tools, 'control_playback').execute({ action: 'warp' })).toThrowError(/"warp" must be a finite number/);
    expect(() => tool(tools, 'control_playback').execute({ action: 'warp', warp: -1 })).toThrowError(/positive number/);
  });
});

describe('seek', () => {
  it('is a safe no-op with no mission configured', () => {
    const out = tool(tools, 'seek').execute({ timeS: 30 }) as any;
    expect(out.ok).toBe(false);
  });

  it('rejects a non-numeric time', () => {
    expect(() => tool(tools, 'seek').execute({ timeS: 'soon' })).toThrowError(/"timeS" must be a finite number/);
  });

  it('moves the cursor and reports the resulting mode', () => {
    host.sim = makeFakeSim(host.panel.getConfig());
    const out = tool(tools, 'seek').execute({ timeS: 30 }) as any;
    expect(out.ok).toBe(true);
    expect(out.cursorTimeS).toBe(30);
    expect(out.mode).toBe('replay');
    expect(host.calls).toContain('seek:30');
  });
});

describe('set_camera', () => {
  it('rejects an unknown mode', () => {
    expect(() => tool(tools, 'set_camera').execute({ mode: 'drone' })).toThrowError(/"mode" must be one of/);
  });

  it('switches the camera', () => {
    const out = tool(tools, 'set_camera').execute({ mode: 'onboard' }) as any;
    expect(out.ok).toBe(true);
    expect(out.camera).toBe('onboard');
    expect(host.camMode).toBe('onboard');
  });
});

describe('get_events', () => {
  it('is empty with no mission configured', () => {
    const out = tool(tools, 'get_events').execute({}) as any;
    expect(out.hasMission).toBe(false);
    expect(out.events).toEqual([]);
  });

  it('filters by sinceS and caps at limit', () => {
    host.sim = makeFakeSim(host.panel.getConfig());
    host.recorder.events = EVENTS;
    let out = tool(tools, 'get_events').execute({}) as any;
    expect(out.totalCount).toBe(3);
    expect(out.events.map((e: any) => e.key)).toEqual(['evt.liftoff', 'evt.maxQ', 'evt.meco']);
    out = tool(tools, 'get_events').execute({ sinceS: 50 }) as any;
    expect(out.events.map((e: any) => e.key)).toEqual(['evt.maxQ', 'evt.meco']);
    out = tool(tools, 'get_events').execute({ limit: 1 }) as any;
    expect(out.events.length).toBe(1);
    expect(out.totalCount).toBe(3);
  });

  it('rejects a wrong-type sinceS or limit', () => {
    host.sim = makeFakeSim(host.panel.getConfig());
    expect(() => tool(tools, 'get_events').execute({ sinceS: '50' })).toThrowError(/"sinceS" must be a finite number/);
    expect(() => tool(tools, 'get_events').execute({ limit: '2' })).toThrowError(/"limit" must be a finite number/);
    expect(() => tool(tools, 'get_events').execute({ limit: 0 })).toThrowError(/"limit" must be a positive integer/);
    expect(() => tool(tools, 'get_events').execute({ limit: 1.5 })).toThrowError(/"limit" must be a positive integer/);
  });
});

describe('export_csv', () => {
  it('is unavailable with no mission configured', () => {
    const out = tool(tools, 'export_csv').execute({}) as any;
    expect(out.ok).toBe(false);
  });

  it('builds a CSV header, one row per telemetry sample and an event section', () => {
    host.sim = makeFakeSim(host.panel.getConfig());
    const out = tool(tools, 'export_csv').execute({}) as any;
    expect(out.ok).toBe(true);
    expect(out.filename).toBe('orbitlab_soyuz21a_iss.csv');
    const lines: string[] = out.csv.split('\n');
    expect(lines[0]).toBe('t_s,alt_m,v_inertial_ms,v_air_ms,q_pa,mach,g_load,mass_kg,thrust_n,throttle,pitch_deg,apoapsis_m,periapsis_m,inclination_deg,dv_remaining_ms,downrange_m,lat_deg,lon_deg,stage,phase');
    expect(lines[1].startsWith('0,')).toBe(true);
    expect(lines).toContain('# events');
    expect(lines.some((l) => l.includes('evt.liftoff'))).toBe(true);
  });
});

describe('registerMcpTools', () => {
  it('never throws when there is no WebMCP host (the normal case here: environment "node")', () => {
    expect(() => registerMcpTools(host)).not.toThrow();
  });

  it('registers every tool and unregisters on pagehide when a modelContext is present', () => {
    const registered: string[] = [];
    let abortSeen = false;
    (globalThis as any).document = {
      modelContext: {
        registerTool: (t: WebMcpTool, opts?: { signal?: AbortSignal }) => {
          registered.push(t.name);
          opts?.signal?.addEventListener('abort', () => { abortSeen = true; });
        },
      },
    };
    const listeners: Array<() => void> = [];
    (globalThis as any).window = { addEventListener: (_: string, fn: () => void) => listeners.push(fn) };
    try {
      registerMcpTools(host);
      expect(registered.length).toBe(10);
      for (const fn of listeners) fn();
      expect(abortSeen).toBe(true);
    } finally {
      delete (globalThis as any).document;
      delete (globalThis as any).window;
    }
  });
});

// --- P05 ---
describe('configure_mission: the flexible body', () => {
  it('merges flex settings, keeps them across vehicle and wind edits, and resets a field with null', () => {
    const configure = tool(tools, 'configure_mission');
    configure.execute({ vehicleId: 'falcon9', flex: { bending: true, notch: true, notchZetaZero: 0.01 } });
    expect(host.panel.state.dynamics?.flex).toEqual({ bending: true, notch: true, notchZetaZero: 0.01 });
    configure.execute({ flex: { slosh: true, imuStation: 0.4 } });
    configure.execute({ vehicleId: 'soyuz21a', windScenario: 'shear' });
    expect(host.panel.state.dynamics).toMatchObject({ model: 'sixDof', wind: 'shear',
      flex: { bending: true, notch: true, notchZetaZero: 0.01, slosh: true, imuStation: 0.4 } });
    configure.execute({ flex: { imuStation: null } });
    expect(host.panel.state.dynamics?.flex).toEqual({ bending: true, notch: true, notchZetaZero: 0.01, slosh: true });
  });

  it('rejects an unknown field and a value outside its range, leaving the settings as they were', () => {
    const configure = tool(tools, 'configure_mission');
    configure.execute({ flex: { bending: true } });
    expect(() => configure.execute({ flex: { stiffness: 2 } })).toThrow(/Unknown flex field "stiffness"/);
    expect(() => configure.execute({ flex: { notchFrequencyScale: 5 } })).toThrow(/setup\.flex\.notchFrequencyScale must be at most 2/);
    expect(() => configure.execute({ flex: { notch: 'yes' } })).toThrow(/setup\.flex\.notch is not a valid selection/);
    expect(host.panel.state.dynamics?.flex).toEqual({ bending: true });
  });

  it('describes the flex object in its input schema', () => {
    const schema = tool(tools, 'configure_mission').inputSchema as { properties: Record<string, { properties?: Record<string, unknown> }> };
    expect(Object.keys(schema.properties.flex.properties!)).toEqual(['slosh', 'bending', 'notch', 'imuStation', 'notchZetaZero',
      'notchZetaPole', 'notchFrequencyScale', 'bandwidthRatio', 'sloshDamping', 'bendingDamping']);
  });
});
