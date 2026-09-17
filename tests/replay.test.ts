/**
 * Flight recorder and replay seeking.
 *
 * Records a headless Falcon 9 mission through `FlightRecorder.advance` — the
 * same path the app uses — and checks the properties the scrubber depends on:
 * the recording is bounded, every event is on a frame boundary, seeking
 * interpolates, the ends clamp, and a seek is a pure function of the recording.
 */
import { describe, it, expect } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { FlightRecorder } from '../src/replay/recorder';
import { ReplayPlayer } from '../src/replay/player';
import { createFrameSimView } from '../src/replay/simview';
import { interpolateFrames } from '../src/physics/frame';
import { phaseInfo } from '../src/ui/phase';
import { DEFAULT_GUIDANCE, DEFAULT_FAILURE } from '../src/physics/defaults';
import { orbitById } from '../src/data/orbits';
import type { FailureConfig, MissionConfig } from '../src/types';

const cfg = (failure: Partial<FailureConfig> = {}): MissionConfig => ({
  vehicleId: 'falcon9',
  satelliteId: 'starlink',
  siteId: 'cape',
  orbit: orbitById('iss'),
  launchTime: new Date(Date.UTC(2026, 8, 15, 12, 0, 0)),
  guidance: { ...DEFAULT_GUIDANCE },
  failure: { ...DEFAULT_FAILURE, ...failure },
  boosterRecovery: false,
});

/** Fly a mission through the recorder, as the animation loop does. */
function record(maxTime = 1800, rec = new FlightRecorder(), c = cfg()): { sim: Simulation; rec: FlightRecorder } {
  const sim = new Simulation(c, { headless: true });
  rec.start(sim);
  let guard = 0;
  while (!sim.done && sim.state.t < maxTime && guard++ < 20000) {
    rec.advance(1, 5000);
  }
  return { sim, rec };
}

const recorded = record();

/**
 * Measured retained heap of one stored frame, bytes.
 *
 * Not the recorder's own estimator — that is the thing under test. This is the
 * most pessimistic figure anyone has measured for a frame of this shape
 * (heapUsed delta across a whole 6-hour Ariane 64 recording, which also charges
 * the simulation's own telemetry growth to the recording); the isolated
 * measurement, releasing the frame array and diffing heapUsed either side, is
 * 2 656 B for this Falcon 9 mission and 4 721 B for the Ariane. Asserting
 * against the pessimistic number means the bound holds under either reading.
 */
const MEASURED_BYTES_PER_FRAME = 11000;
/** The memory budget from the wave-2 brief, bytes. */
const BUDGET = 150e6;

describe('flight recorder', () => {
  it('records a bounded number of frames for a full ascent', () => {
    const { rec, sim } = recorded;
    expect(rec.frames.length).toBeGreaterThan(100);
    // ~10 Hz through the ascent, far less through the coast: a 1 800 s mission
    // must stay well under the 18 000 frames a flat 10 Hz recording would take.
    expect(rec.frames.length).toBeLessThan(12000);
    expect(sim.state.t).toBeGreaterThan(400);
  });

  it('stays inside the memory budget on a measured, not an estimated, basis', () => {
    const { rec } = recorded;
    // What this mission actually costs, priced at the measured rate.
    expect(rec.frames.length * MEASURED_BYTES_PER_FRAME).toBeLessThan(BUDGET);
    // And what the *worst case* costs: the backstop has to land under the
    // budget, or it is not a backstop. This is the assertion the old test
    // could never make, because it priced the recording with the same
    // estimator it was checking.
    expect(rec.frameLimit * MEASURED_BYTES_PER_FRAME).toBeLessThan(BUDGET);
    // The estimator is allowed to be approximate, but not wrong by an order of
    // magnitude: it must land within 4x of the measured figure either way.
    const stats = rec.stats();
    expect(stats.bytesPerFrame).toBeGreaterThan(MEASURED_BYTES_PER_FRAME / 4);
    expect(stats.bytesPerFrame).toBeLessThan(MEASURED_BYTES_PER_FRAME * 4);
    expect(stats.bytes).toBeLessThan(BUDGET);
  });

  it('decimates the oldest coast frames instead of growing without limit', () => {
    // A ceiling low enough that the backstop fires part-way up the ascent.
    const small = new FlightRecorder(400);
    const { rec } = record(2400, small);
    expect(rec.stats().decimations).toBeGreaterThan(0);
    // The bound is real: the old version raised its own ceiling whenever the
    // coast pass came up empty, so this could sit at several thousand.
    expect(rec.frames.length).toBeLessThanOrEqual(rec.frameLimit);
    expect(rec.frameLimit).toBeLessThanOrEqual(600);
    // and every event still has a frame at its exact time
    for (const e of rec.events) {
      const i = rec.indexAt(e.t);
      const exact = Math.abs(rec.frames[i].t - e.t) < 1e-9
        || (i + 1 < rec.frames.length && Math.abs(rec.frames[i + 1].t - e.t) < 1e-9);
      expect(exact, `decimation dropped the frame at ${e.key} T+${e.t}`).toBe(true);
    }
  });

  it('records the state after a flight termination, not the state before it', () => {
    // The break-up aborts the step that triggered it, so the post-transition
    // capture lands on the same timestamp as the pre-transition one and has to
    // replace the head rather than be dropped as out of order.
    const { rec } = record(300, new FlightRecorder(), cfg({ mode: 'rangeSafety', time: 60 }));
    expect(rec.head!.status).toBe('failed');
    expect(rec.head!.destroyed).toBe(true);
    const loss = rec.events.find((e) => e.key === 'evt.vehicleLost');
    expect(loss).toBeDefined();
    const i = rec.indexAt(loss!.t);
    expect(Math.abs(rec.frames[i].t - loss!.t)).toBeLessThan(1e-9);
    // seeking to the loss shows the destroyed vehicle, seeking a second before does not
    const p = new ReplayPlayer(rec);
    expect(p.frameAt(loss!.t)!.destroyed).toBe(true);
    expect(p.frameAt(loss!.t - 1)!.destroyed).toBe(false);
  });

  it('records frames in strictly increasing mission time', () => {
    const { rec } = recorded;
    for (let i = 1; i < rec.frames.length; i++) {
      expect(rec.frames[i].t).toBeGreaterThan(rec.frames[i - 1].t);
    }
  });

  it('starts on the pad at T-10 s', () => {
    const { rec } = recorded;
    expect(rec.startTime).toBeCloseTo(-10, 6);
    expect(rec.frames[0].status).toBe('prelaunch');
  });

  it('has a frame at every event time', () => {
    const { rec } = recorded;
    expect(rec.events.length).toBeGreaterThan(5);
    for (const e of rec.events) {
      const i = rec.indexAt(e.t);
      const exact = Math.abs(rec.frames[i].t - e.t) < 1e-9
        || (i + 1 < rec.frames.length && Math.abs(rec.frames[i + 1].t - e.t) < 1e-9);
      expect(exact, `no frame at ${e.key} T+${e.t}`).toBe(true);
    }
  });

  it('copies the event log rather than aliasing the simulation', () => {
    const { rec, sim } = recorded;
    expect(rec.events).not.toBe(sim.events);
    expect(rec.events.length).toBe(sim.events.length);
  });

  it('keeps the dense cadence through the ascent and thins the coast', () => {
    const { rec } = recorded;
    let ascentGapMax = 0;
    let coastGapMax = 0;
    for (let i = 1; i < rec.frames.length; i++) {
      const gap = rec.frames[i].t - rec.frames[i - 1].t;
      const s = rec.frames[i - 1].status;
      if (s === 'ascent') ascentGapMax = Math.max(ascentGapMax, gap);
      if (s === 'coast' && rec.frames[i - 1].altitude > 140e3) coastGapMax = Math.max(coastGapMax, gap);
    }
    // 0.1 s cadence plus one simulation step of slack
    expect(ascentGapMax).toBeLessThan(0.45);
    if (coastGapMax > 0) expect(coastGapMax).toBeLessThanOrEqual(31);
  });
});

describe('seeking', () => {
  it('returns the prelaunch frame when seeking to T-10', () => {
    const { rec } = recorded;
    const p = new ReplayPlayer(rec);
    p.seek(-10);
    const f = p.frame()!;
    expect(f.t).toBeCloseTo(-10, 6);
    expect(f.status).toBe('prelaunch');
    expect(f.liftoff).toBe(false);
    expect(f.thrust).toBe(0);
  });

  it('clamps a seek before the start and past the head', () => {
    const { rec } = recorded;
    const p = new ReplayPlayer(rec);
    p.seek(-1e6);
    expect(p.cursor).toBeCloseTo(rec.startTime, 6);
    p.seek(rec.headTime + 1e6);
    expect(p.cursor).toBeCloseTo(rec.headTime, 6);
    expect(p.live).toBe(true);
    expect(p.frame()!.t).toBeCloseTo(rec.headTime, 6);
  });

  it('enters replay mode when scrubbing back and returns to live at the head', () => {
    const { rec } = recorded;
    const p = new ReplayPlayer(rec);
    p.seek(60);
    expect(p.live).toBe(false);
    p.goLive();
    expect(p.live).toBe(true);
    expect(p.cursor).toBeCloseTo(rec.headTime, 6);
  });

  it('interpolates altitude monotonically through the ascent', () => {
    const { rec } = recorded;
    const p = new ReplayPlayer(rec);
    let prev = -Infinity;
    // 20 s → 120 s is inside the first stage burn, where altitude rises monotonically
    for (let t = 20; t <= 120; t += 0.37) {
      const f = p.frameAt(t)!;
      expect(f.t).toBeCloseTo(t, 6);
      expect(f.altitude).toBeGreaterThan(prev);
      prev = f.altitude;
    }
  });

  it('interpolates between two recorded frames rather than snapping to one', () => {
    const { rec } = recorded;
    const i = rec.indexAt(80);
    const a = rec.frames[i];
    const b = rec.frames[i + 1];
    expect(b.t).toBeGreaterThan(a.t);
    const mid = (a.t + b.t) / 2;
    const f = interpolateFrames(a, b, mid);
    expect(f.t).toBeCloseTo(mid, 9);
    const lo = Math.min(a.altitude, b.altitude);
    const hi = Math.max(a.altitude, b.altitude);
    expect(f.altitude).toBeGreaterThanOrEqual(lo);
    expect(f.altitude).toBeLessThanOrEqual(hi);
    // the body axis stays a unit vector through the slerp
    expect(Math.hypot(f.dir.x, f.dir.y, f.dir.z)).toBeCloseTo(1, 9);
    // discrete state comes from the earlier frame
    expect(f.status).toBe(a.status);
    expect(f.stages.map((s) => s.attached)).toEqual(a.stages.map((s) => s.attached));
    expect(f.payloadSeparated).toBe(a.payloadSeparated);
    expect(f.debris.length).toBe(a.debris.length);
  });

  it('never mutates the recording', () => {
    const { rec } = recorded;
    const i = rec.indexAt(95);
    const a = rec.frames[i];
    const before = JSON.stringify(a);
    interpolateFrames(a, rec.frames[i + 1], (a.t + rec.frames[i + 1].t) / 2);
    expect(JSON.stringify(a)).toBe(before);
  });

  it('hands out a copy when the seek lands exactly on a recorded frame', () => {
    // The common case, not an edge case: every event time is a stored
    // timestamp, so clicking a chip on the event bar takes this path. The
    // returned frame travels into ui/map.ts and ui/onboard.ts through
    // `createFrameSimView`, so it must not alias the recording.
    const { rec } = recorded;
    const p = new ReplayPlayer(rec);
    const i = rec.indexAt(100);
    const stored = rec.frames[i];
    const before = JSON.stringify(stored);
    const f = p.frameAt(stored.t)!;
    expect(f).not.toBe(stored);
    expect(f.elements).not.toBe(stored.elements);
    expect(f.stages).not.toBe(stored.stages);
    expect(f.debris).not.toBe(stored.debris);
    f.elements.a = -1;
    f.stages[0].attached = !f.stages[0].attached;
    f.r.x = 0;
    f.maxQ.value = -1;
    f.losses.gravity = -1;
    if (f.debris.length > 0) f.debris[0].r.x = 0;
    expect(JSON.stringify(stored)).toBe(before);
    // the same holds for the degenerate interpolation paths
    const g = interpolateFrames(stored, stored, stored.t);
    g.elements.e = -1;
    g.stages[0].attached = !g.stages[0].attached;
    expect(JSON.stringify(stored)).toBe(before);
  });

  it('carries the Δv loss budget on the frame', () => {
    const { rec, sim } = recorded;
    const head = rec.head!;
    expect(head.losses.gravity).toBeGreaterThan(0);
    expect(head.losses.drag).toBeGreaterThan(0);
    expect(head.losses.dvThrust).toBeGreaterThan(1000);
    expect(head.losses).not.toBe(sim.state.losses);
    // monotonic, so an interpolated frame sits between its neighbours
    const i = rec.indexAt(90);
    const a = rec.frames[i], b = rec.frames[i + 1];
    const mid = interpolateFrames(a, b, (a.t + b.t) / 2);
    expect(mid.losses.gravity).toBeGreaterThanOrEqual(a.losses.gravity);
    expect(mid.losses.gravity).toBeLessThanOrEqual(b.losses.gravity);
  });

  it('is deterministic: the same seek produces a deep-equal frame', () => {
    const { rec } = recorded;
    const p = new ReplayPlayer(rec);
    for (const t of [-7.5, 3.25, 71.6, 145.9, 400.4]) {
      if (t > rec.headTime) continue;
      const one = p.frameAt(t)!;
      const two = p.frameAt(t)!;
      expect(two).toEqual(one);
      // and again from a second player over the same recording
      const q = new ReplayPlayer(rec);
      expect(q.frameAt(t)!).toEqual(one);
    }
  });

  it('propagates position with Kepler between two coasting frames', () => {
    const { rec } = recorded;
    let i = -1;
    for (let k = 0; k + 1 < rec.frames.length; k++) {
      const a = rec.frames[k], b = rec.frames[k + 1];
      if (a.status === 'coast' && b.status === 'coast' && a.thrust <= 0 && b.t - a.t > 5) { i = k; break; }
    }
    if (i < 0) return; // this mission inserts directly, with no long coast
    const a = rec.frames[i], b = rec.frames[i + 1];
    const mid = interpolateFrames(a, b, (a.t + b.t) / 2);
    const rMid = Math.hypot(mid.r.x, mid.r.y, mid.r.z);
    const chord = {
      x: (a.r.x + b.r.x) / 2, y: (a.r.y + b.r.y) / 2, z: (a.r.z + b.r.z) / 2,
    };
    const rChord = Math.hypot(chord.x, chord.y, chord.z);
    // the arc bulges outside the straight-line chord
    expect(rMid).toBeGreaterThan(rChord - 1);
    // and the interpolated state is still a physical one
    expect(Math.hypot(mid.v.x, mid.v.y, mid.v.z)).toBeGreaterThan(1000);
  });

  it('walks the event list forwards and backwards', () => {
    const { rec } = recorded;
    const p = new ReplayPlayer(rec);
    const first = rec.events[0].t;
    const next = p.nextEventTime(first);
    expect(next).not.toBeNull();
    expect(next!).toBeGreaterThan(first);
    expect(p.prevEventTime(next!)).toBeCloseTo(first, 6);
    expect(p.prevEventTime(rec.startTime)).toBeNull();
    expect(p.nextEventTime(rec.headTime + 1)).toBeNull();
    const last = p.lastEvent(rec.headTime);
    expect(last).not.toBeNull();
    expect(last!.t).toBeLessThanOrEqual(rec.headTime + 1e-6);
  });
});

describe('frame-backed simulation view', () => {
  // The mechanism the orbital map and the onboard overlay ride on: they still
  // take a `Simulation`, so they are handed one whose clock is the seeked frame.
  it('truncates the clock, the state vector, the debris and the logs to the frame', () => {
    const { rec, sim } = recorded;
    const view = createFrameSimView(sim);
    const p = new ReplayPlayer(rec);
    const early = p.frameAt(80)!;
    view.setFrame(early);
    expect(view.sim.state.t).toBeCloseTo(80, 6);
    expect(view.sim.state.r.x).toBeCloseTo(early.r.x, 6);
    expect(view.sim.state.altitude).toBeCloseTo(early.altitude, 6);
    expect(view.sim.state.losses.gravity).toBeCloseTo(early.losses.gravity, 6);
    expect(view.sim.debris.length).toBe(early.debris.length);
    for (const e of view.sim.events) expect(e.t).toBeLessThanOrEqual(80 + 1e-6);
    expect(view.sim.events.length).toBeLessThan(sim.events.length);
    for (const s of view.sim.telemetry) expect(s.t).toBeLessThanOrEqual(80 + 1e-6);
    // julianDate() is inherited and reads the shadowed clock
    expect(view.sim.julianDate()).toBeLessThan(sim.julianDate());
    // the live simulation is untouched
    expect(sim.state.t).toBeGreaterThan(400);
  });

  it('rewinds the vehicle, not just the active stage index', () => {
    const { rec, sim } = recorded;
    const view = createFrameSimView(sim);
    const p = new ReplayPlayer(rec);
    const early = p.frameAt(60)!; // first stage still attached and burning
    view.setFrame(early);
    expect(view.sim.vehicle.activeIndex).toBe(early.activeStageIndex);
    expect(view.sim.vehicle.fairingAttached).toBe(early.fairingAttached);
    // `vehicle.stages` used to stay fully live, which made deltaVRemaining()
    // an incoherent mix of a rewound activeIndex and live propellant.
    expect(view.sim.vehicle.stages.map((s) => s.attached)).toEqual(early.stages.map((s) => s.attached));
    expect(view.sim.vehicle.stages[0].attached).toBe(true);
    expect(sim.vehicle.stages[0].attached).toBe(false);
    const st = view.sim.vehicle.stages[0];
    expect(st.propellant / st.spec.propellantMass).toBeCloseTo(early.stages[0].propellantFraction, 6);
    expect(view.sim.vehicle.deltaVRemaining()).toBeGreaterThan(sim.vehicle.deltaVRemaining());
    // and the live vehicle is untouched
    expect(sim.vehicle.activeIndex).toBeGreaterThan(0);
  });
});

describe('phase narration', () => {
  it('names the phase, the last callout and the next one for a seeked frame', () => {
    const { rec } = recorded;
    const p = new ReplayPlayer(rec);
    const ascent = p.frameAt(60)!;
    const info = phaseInfo(ascent, rec.events);
    expect(info.titleKey).toMatch(/^hud\./);
    expect(info.detailKey).toMatch(/^phase\.detail\./);
    expect(info.lastEvent!.t).toBeLessThanOrEqual(60 + 1e-6);
    expect(info.nextEvent!.t).toBeGreaterThan(60);
    // the narration is a pure function of (frame, events)
    expect(phaseInfo(p.frameAt(60)!, rec.events)).toEqual(info);
  });

  it('reports the pad before liftoff and never looks ahead of the cursor', () => {
    const { rec } = recorded;
    const p = new ReplayPlayer(rec);
    const pad = phaseInfo(p.frameAt(-10)!, rec.events);
    expect(pad.titleKey).toBe('hud.status.prelaunch');
    expect(pad.lastEvent).toBeNull();
    expect(pad.nextEvent!.t).toBeGreaterThan(-10);
    expect(phaseInfo(null, rec.events).lastEvent).toBeNull();
  });
});
