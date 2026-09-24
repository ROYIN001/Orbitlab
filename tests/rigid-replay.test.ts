import { describe, expect, it, vi } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { captureFrame, cloneFrame, interpolateFrames } from '../src/physics/frame';
import { createFrameSimView } from '../src/replay/simview';
import { FlightRecorder } from '../src/replay/recorder';
import { ReplayPlayer } from '../src/replay/player';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE } from '../src/physics/defaults';
import { orbitById } from '../src/data/orbits';
import { type RigidTelemetry, cloneRigidTelemetry, interpolateRigidTelemetry } from '../src/physics/rigid/telemetry';
import { quatAngularDistance, quatFromAxisAngle, quatRotate } from '../src/physics/rigid/math';
import { v3 } from '../src/physics/vec3';
import { rigidMission } from './rigid-harness';

function rigid(): RigidTelemetry {
  return { modelVersion: 'test-6dof-v1', bodyId: 'stack', configurationId: 's1+s2',
    attitudeQ: { w: 1, x: 0, y: 0, z: 0 }, omegaBody: v3(0.1, 0.2, 0.3),
    cgBody: v3(20, 0, 0), inertiaBody: [2, 0, 0, 0, 3, 0, 0, 0, 4], renderOffsetBody: v3(-20, 0, 0),
    controlMode: 'auto', commandRatesBody: v3(), commandThrottle: 1, engineDeflections: { 's1.engine.0': [0.01, 0.02] },
    engineDirectionsBody: { 's1.engine.0': v3(1, 0, 0) }, engineThrottles: { 's1.engine.0': 1 },
    rcsPropellantKg: 20, saturated: false, angleOfAttack: 0.01, sideslip: 0.02,
    aeroWithinEnvelope: true, windECI: v3(1, 2, 3), rawQuaternionNormError: 1e-13 };
}
function fixture() {
  const sim = new Simulation({ vehicleId: 'falcon9', satelliteId: 'starlink', siteId: 'cape', orbit: orbitById('leo'),
    launchTime: new Date('2026-09-19T12:00:00Z'), guidance: { ...DEFAULT_GUIDANCE },
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false }, { headless: true });
  sim.state.rigid = rigid();
  sim.debris.push({ id: 1, name: 'test stage', r: { ...sim.state.r }, v: v3(), dir: v3(1, 0, 0),
    mass: 1, area: 1, cd: 1, alive: true, createdAt: 0, rigid: { ...rigid(), bodyId: 'debris-1' },
    visual: { kind: 'stage', diameter: 2, length: 10, color: '#ffffff' } });
  return sim;
}

describe('rigid recording and replay', () => {
  it('uses the calibrated rigid frame budget, resets for legacy, and preserves explicit limits', () => {
    const sim = new Simulation(rigidMission('iss'), { headless: true });
    const rec = new FlightRecorder(); rec.start(sim);
    // Independent retained-heap observation: actual Soyuz stack clones use
    // 10.16–10.21 kB/frame; the estimate must include its 41-engine maps.
    expect(rec.stats().bytesPerFrame).toBeGreaterThan(10_100);
    expect(rec.stats().bytesPerFrame).toBeLessThan(12_000);
    expect(rec.frameLimit).toBe(6000);
    rec.start(fixture());
    expect(rec.frameLimit).toBe(12000);
    const explicit = new FlightRecorder(400); explicit.start(sim);
    expect(explicit.frameLimit).toBe(400);
  });

  it('deep-copies every mutable rigid field through capture, clone and interpolation', () => {
    const sim = fixture(), frame = captureFrame(sim), snapshot = structuredClone(frame);
    sim.state.rigid!.attitudeQ.w = 0;
    sim.state.rigid!.engineDirectionsBody!['s1.engine.0'].y = 100;
    sim.state.rigid!.engineThrottles!['s1.engine.0'] = 0;
    sim.debris[0].rigid!.engineDeflections['s1.engine.0'][0] = 123;
    expect(frame).toEqual(snapshot);
    const right = cloneFrame(frame); right.t += 10;
    for (const copy of [cloneFrame(frame), interpolateFrames(frame, right, frame.t + 5), interpolateFrames(frame, right, right.t)]) {
      copy.rigid!.attitudeQ.x = 8;
      copy.rigid!.omegaBody.y = 8;
      copy.rigid!.commandRatesBody!.x = 8;
      copy.rigid!.cgBody.x = 8;
      copy.rigid!.renderOffsetBody.x = 8;
      (copy.rigid!.inertiaBody as unknown as number[])[0] = 8;
      copy.rigid!.windECI.x = 8;
      copy.rigid!.engineDeflections['s1.engine.0'][0] = 8;
      copy.rigid!.engineDirectionsBody!['s1.engine.0'].x = 8;
      copy.rigid!.engineThrottles!['s1.engine.0'] = 8;
      copy.debris[0].rigid!.engineDeflections['s1.engine.0'][0] = 8;
      copy.debris[0].rigid!.engineDirectionsBody!['s1.engine.0'].x = 8;
      expect(frame).toEqual(snapshot);
      expect(right.rigid).toEqual(snapshot.rigid);
    }
  });

  it('preserves roll, q/-q equivalence, and left-frame control/failure facts', () => {
    const a = captureFrame(fixture()), b = cloneFrame(a);
    a.t = 0; b.t = 10;
    a.rigid!.attitudeQ = quatFromAxisAngle(v3(1, 0, 0), 170 * Math.PI / 180);
    b.rigid!.attitudeQ = quatFromAxisAngle(v3(1, 0, 0), -170 * Math.PI / 180);
    b.rigid!.controlMode = 'manual'; b.rigid!.saturated = true;
    b.rigid!.engineThrottles!['s1.engine.0'] = 0;
    b.rigid!.engineThrottles!['new-engine'] = 1;
    b.rigid!.engineDeflections['new-engine'] = [0.1];
    const mid = interpolateFrames(a, b, 5);
    expect(quatAngularDistance(mid.rigid!.attitudeQ, quatFromAxisAngle(v3(1, 0, 0), Math.PI))).toBeLessThan(1e-12);
    expect(mid.dir).toEqual(quatRotate(mid.rigid!.attitudeQ, v3(1, 0, 0)));
    expect(mid.rigid!.controlMode).toBe('auto'); expect(mid.rigid!.saturated).toBe(false);
    expect(mid.rigid!.engineThrottles).toEqual({ 's1.engine.0': 1 });
    expect(mid.rigid!.engineDeflections['new-engine']).toBeUndefined();
    expect(interpolateFrames(a, b, 10)).toEqual(b);
    const negative = cloneRigidTelemetry(a.rigid)!;
    for (const key of ['w', 'x', 'y', 'z'] as const) negative.attitudeQ[key] *= -1;
    expect(quatAngularDistance(interpolateRigidTelemetry(a.rigid, negative, 0.5)!.attitudeQ, a.rigid!.attitudeQ)).toBeLessThan(1e-12);
  });

  it('never blends across staging/identity/model boundaries and adopts the exact right endpoint', () => {
    const a = captureFrame(fixture()); a.t = 10;
    for (const field of ['bodyId', 'configurationId', 'modelVersion'] as const) {
      const b = cloneFrame(a); b.t = 20;
      b.rigid![field] = 'changed'; b.rigid!.attitudeQ = quatFromAxisAngle(v3(0, 1, 0), 1);
      b.rigid!.cgBody.x = 5; b.r.x += 20; b.mass /= 2;
      const before = interpolateFrames(a, b, 19.999);
      expect(before.rigid).toEqual(a.rigid); expect(before.r).toEqual(a.r); expect(before.mass).toBe(a.mass);
      expect(interpolateFrames(a, b, 20)).toEqual(b);
    }
    const b = cloneFrame(a); b.t = 20; b.stages[0].attached = false;
    b.rigid!.attitudeQ = quatFromAxisAngle(v3(0, 1, 0), 1);
    // Old schema-2 payloads may lack IDs; the recorded stage boundary still guards them.
    delete a.rigid!.bodyId; delete b.rigid!.bodyId; delete a.rigid!.configurationId; delete b.rigid!.configurationId;
    expect(interpolateFrames(a, b, 15).rigid).toEqual(a.rigid);
  });

  it('interpolates continuous CG geometry and existing debris roll without admitting future debris', () => {
    const a = captureFrame(fixture()), b = cloneFrame(a); a.t = 0; b.t = 10;
    b.rigid!.cgBody.x = 10; b.rigid!.renderOffsetBody.x = -10;
    b.debris[0].rigid!.attitudeQ = quatFromAxisAngle(v3(1, 0, 0), 1);
    b.debris.push({ ...b.debris[0], id: 2 });
    const mid = interpolateFrames(a, b, 5);
    expect(mid.rigid!.cgBody.x).toBe(15); expect(mid.rigid!.renderOffsetBody.x).toBe(-15);
    expect(mid.debris).toHaveLength(1);
    expect(quatAngularDistance(mid.debris[0].rigid!.attitudeQ, quatFromAxisAngle(v3(1, 0, 0), 0.5))).toBeLessThan(1e-12);
    const changed = cloneFrame(b); changed.debris[0].rigid!.bodyId = 'another-body';
    expect(interpolateFrames(a, changed, 5).debris[0].rigid).toEqual(a.debris[0].rigid);
  });

  it('frame-backed views do not mutate recording and refresh rigid debris at the same timestamp', () => {
    const sim = fixture(), frame = captureFrame(sim), snapshot = structuredClone(frame), view = createFrameSimView(sim);
    view.setFrame(frame);
    view.sim.state.rigid!.engineThrottles!['s1.engine.0'] = 0;
    view.sim.debris[0].rigid!.engineDirectionsBody!['s1.engine.0'].z = 99;
    expect(frame).toEqual(snapshot);
    const sameTime = cloneFrame(frame); sameTime.debris[0].rigid!.omegaBody.x = 42;
    view.setFrame(sameTime);
    expect(view.sim.debris[0].rigid!.omegaBody.x).toBe(42);
    const legacy = cloneFrame(frame); delete legacy.rigid; delete legacy.debris[0].rigid;
    view.setFrame(legacy);
    expect(view.sim.state.rigid).toBeUndefined(); expect(view.sim.debris[0].rigid).toBeUndefined();
  });
});

describe('accepted command recording', () => {
  function coasting() {
    const sim = new Simulation({ ...fixture().cfg,
      dynamics: { model: 'sixDof', wind: 'calm', seed: 73 } }, { headless: true });
    sim.state.status = 'coast'; sim.state.altitude = 200e3; sim.state.nextBurnTime = -1;
    // Isolate command chronology from orbital guidance: physics integration has
    // separate analytical tests, while the real command validation is retained.
    sim.suggestedDt = () => 0.01;
    sim.step = dt => { sim.state.t += dt; return dt; };
    const recorder = new FlightRecorder(3); recorder.start(sim);
    return { sim, recorder, player: new ReplayPlayer(recorder) };
  }

  it('pins immediate mode/rates/throttle without teleporting the physical state or admitting future commands', () => {
    const { sim, recorder, player } = coasting();
    recorder.advance(5);
    const at = sim.state.t, actual = structuredClone(sim.state.rigid!);
    const command = { mode: 'manual' as const, rates: v3(0.01, -0.02, 0.03), throttle: 0.6 };
    sim.setRigidCommand(command);
    const event = sim.events.at(-1)!;
    // The event records ISO 1151 rates (U07): p = x, q = −z, r = y of the simulator's body axes.
    expect(event).toEqual({ t: at, key: 'evt.controlCommand', severity: 'info', params: {
      mode: 'manual', rollRateRadS: 0.01, pitchRateRadS: -0.03, yawRateRadS: -0.02, throttle: 0.6,
    } });
    expect(sim.state.rigid).toEqual({ ...actual, controlMode: 'manual', commandRatesBody: command.rates, commandThrottle: 0.6 });
    recorder.captureChangedState();
    expect(recorder.headTime).toBe(at);
    const before = player.frameAt(at - 0.001)!.rigid!, exact = player.frameAt(at)!.rigid!;
    expect(before.controlMode).toBe('auto'); expect(before.commandRatesBody).toEqual(v3()); expect(before.commandThrottle).toBe(1);
    expect(exact.controlMode).toBe('manual'); expect(exact.commandRatesBody).toEqual(command.rates); expect(exact.commandThrottle).toBe(0.6);
    command.rates.x = 4;
    exact.commandRatesBody!.x = 5;
    expect(sim.rigidRuntime!.command.rates.x).toBe(0.01);
    expect(recorder.head!.rigid!.commandRatesBody!.x).toBe(0.01);
  });

  it('deduplicates identical commands, rejects invalid changes atomically, and keeps the final same-time command', () => {
    const { sim, recorder, player } = coasting(); recorder.advance(5);
    const command = { mode: 'manual' as const, rates: v3(0.01, 0.02, 0.03), throttle: 0.6 };
    sim.setRigidCommand(command); recorder.captureChangedState();
    const count = sim.events.length, saved = structuredClone(sim.state.rigid);
    sim.setRigidCommand({ ...command, rates: { ...command.rates } });
    expect(sim.events).toHaveLength(count);
    expect(() => sim.setRigidCommand({ ...command, rates: v3(1, 0, 0) })).toThrow(RangeError);
    expect(sim.events).toHaveLength(count); expect(sim.state.rigid).toEqual(saved);
    expect(sim.rigidRuntime!.command).toEqual(command);
    sim.setRigidCommand({ ...command, throttle: 0.4 }); recorder.captureChangedState();
    expect(recorder.events.filter(event => event.key === 'evt.controlCommand').map(event => event.params!.throttle)).toEqual([0.6, 0.4]);
    expect(new Set(recorder.frames.map(frame => frame.t)).size).toBe(recorder.frames.length);
    expect(player.frameAt(sim.state.t - 0.001)!.rigid!.controlMode).toBe('auto');
    expect(player.frameAt(sim.state.t)!.rigid!.commandThrottle).toBe(0.4);
  });

  it('captures external commands before rendering/advancing, even inside a 30-second coast recording interval', () => {
    const { sim, recorder, player } = coasting(); recorder.advance(5);
    const manualTime = sim.state.t;
    sim.setRigidCommand({ mode: 'manual', rates: v3(0.01, 0, 0), throttle: 0.5 });
    recorder.recordNow(); // MCP changes are observed here without a UI callback.
    recorder.advance(5);
    const autoTime = sim.state.t;
    sim.setRigidCommand({ mode: 'auto', rates: v3(), throttle: 1 });
    recorder.advance(1); // Must pin before integration moves the live clock.
    expect(recorder.frames.some(frame => frame.t === autoTime && frame.rigid!.controlMode === 'auto')).toBe(true);
    expect(player.frameAt(manualTime)!.rigid!.controlMode).toBe('manual');
    expect(player.frameAt(autoTime - 0.001)!.rigid!.controlMode).toBe('manual');
    expect(player.frameAt(autoTime)!.rigid!.controlMode).toBe('auto');
    recorder.advance(90, 10000); recorder.recordNow();
    expect(recorder.stats().decimations).toBeGreaterThan(0);
    expect(player.frameAt(manualTime)!.rigid!.commandRatesBody).toEqual(v3(0.01, 0, 0));
    expect(player.frameAt(autoTime)!.rigid!.commandRatesBody).toEqual(v3());
  });
});

describe('recorder fixed rigid ticks', () => {
  function toy() {
    const sim = fixture();
    // Only replace the dynamics kernel: captureFrame and the recorder remain
    // production code, making timing/budget tests independent of flight tuning.
    Object.defineProperty(sim, 'rigidRuntime', { value: {} });
    sim.suggestedDt = () => 0.01;
    const steps: number[] = [];
    sim.step = dt => { steps.push(dt); sim.state.t += dt; return dt; };
    const rec = new FlightRecorder(); rec.start(sim);
    return { sim, rec, steps };
  }

  it('retains fractional render time, obeys an off-grid event, and reports only actual elapsed time', () => {
    const { sim, rec, steps } = toy(), start = sim.state.t, boundary = start + 0.015;
    sim.suggestedDt = () => sim.state.t < boundary - 1e-10 ? Math.min(0.01, boundary - sim.state.t) : 0.01;
    sim.step = dt => {
      steps.push(dt); sim.state.t += dt;
      if (Math.abs(sim.state.t - boundary) < 1e-10) sim.events.push({ t: boundary, key: 'test.boundary', severity: 'info' });
      return dt;
    };
    expect(rec.advance(0.008)).toBe(0);
    expect(rec.advance(0.008)).toBeCloseTo(0.015, 12);
    expect(steps).toHaveLength(2); expect(steps[0]).toBe(0.01); expect(steps[1]).toBeCloseTo(0.005, 12);
    expect(rec.frames.some(frame => Math.abs(frame.t - boundary) < 1e-10)).toBe(true);
    expect(rec.advance(0.009)).toBeCloseTo(0.01, 12);
  });

  it('drops overload backlog after a step/time budget and clears fractional time on restart', () => {
    const { sim, rec, steps } = toy();
    expect(rec.advance(1.003, 2)).toBeCloseTo(0.02, 12);
    expect(rec.advance(0.007)).toBeCloseTo(0.01, 12);
    expect(steps).toHaveLength(3);
    rec.advance(0.004); rec.start(sim);
    expect(rec.advance(0.006)).toBe(0);
    const clock = vi.spyOn(performance, 'now').mockReturnValue(100);
    try {
      const advanced = rec.advance(1, 5000, 0);
      expect(advanced).toBeGreaterThan(0);
      expect(advanced).toBeLessThanOrEqual(0.04); // rigid deadline checked within four control ticks
      expect(rec.advance(0.003)).toBe(0); // .006 remainder + .003, no queued seconds
    } finally { clock.mockRestore(); }
  });

  it('does not report requested time as advanced when a transition terminates without motion', () => {
    const { sim, rec } = toy(), before = sim.state.t;
    sim.step = () => { sim.state.status = 'failed'; sim.state.destroyed = true;
      sim.events.push({ t: before, key: 'evt.vehicleLost', severity: 'fail' }); return 0; };
    expect(rec.advance(1)).toBe(0); expect(sim.state.t).toBe(before); expect(rec.head!.destroyed).toBe(true);
  });

  it('flies the same 10-second countdown plus 1-second rigid segment at 30/60/120 FPS and burst warp', () => {
    const config = { ...fixture().cfg, dynamics: { model: 'sixDof' as const, wind: 'shear' as const, seed: 73 } };
    const results = [30, 60, 120, 1].map(fps => {
      const sim = new Simulation(config, { headless: true }), rec = new FlightRecorder(); rec.start(sim);
      let advanced = 0;
      for (let frame = 0; frame < fps * 11; frame++) advanced += rec.advance(1 / fps, 5000);
      expect(advanced).toBeCloseTo(11, 9); expect(sim.state.t).toBeCloseTo(1, 9);
      expect(sim.state.status).not.toBe('failed');
      return { frame: captureFrame(sim), events: [...rec.events], times: rec.frames.map(frame => frame.t) };
    });
    for (const result of results.slice(1)) expect(result).toEqual(results[0]);
  }, 20000);

  it('replays multiple complete vehicle/debris rolls after heavy coast frames are decimated', () => {
    const { sim } = toy(), rec = new FlightRecorder(3), start = sim.state.t;
    sim.state.status = 'coast'; sim.state.altitude = 200e3; sim.state.nextBurnTime = -1;
    sim.state.rigid!.omegaBody = v3(0.6, 0, 0);
    sim.debris[0].rigid!.omegaBody = v3(0, 0, 0.4);
    sim.step = dt => {
      sim.state.t += dt;
      sim.state.rigid!.attitudeQ = quatFromAxisAngle(v3(1, 0, 0), 0.6 * (sim.state.t - start));
      sim.debris[0].rigid!.attitudeQ = quatFromAxisAngle(v3(0, 0, 1), 0.4 * (sim.state.t - start));
      return dt;
    };
    rec.start(sim); rec.advance(90, 10000); rec.recordNow();
    expect(rec.stats().decimations).toBeGreaterThan(0);
    expect(rec.frames.length).toBeLessThanOrEqual(3);
    expect(rec.stats().rotationWindows).toHaveLength(2);
    const player = new ReplayPlayer(rec);
    for (const elapsed of [7.123, 15, 35.555, 60, 75.25]) {
      const frame = player.frameAt(start + elapsed)!;
      expect(frame.rigid!.replayAttitudeAvailable).toBe(true);
      expect(quatAngularDistance(frame.rigid!.attitudeQ, quatFromAxisAngle(v3(1, 0, 0), 0.6 * elapsed))).toBeLessThan(1e-10);
      expect(quatAngularDistance(frame.debris[0].rigid!.attitudeQ, quatFromAxisAngle(v3(0, 0, 1), 0.4 * elapsed))).toBeLessThan(1e-10);
      expect(frame.dir).toEqual(quatRotate(frame.rigid!.attitudeQ, v3(1, 0, 0)));
    }
  });
});
