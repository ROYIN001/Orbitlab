/**
 * Booster recovery with no plan (`RecoveryMode` 'downrange', what the Build
 * panel flies when recovery is ticked and no landing place is picked): every
 * recovered stage flies an entry burn and a landing burn wherever it comes
 * down (src/physics/sim/debris.ts `stepDebris`; six-DOF,
 * src/physics/rigid/debris-runtime.ts `guidance`). Each burn raises its event,
 * `evt.entryBurnStart` and then `evt.landingBurnStart`, as a targeted return's
 * do, and the flight recorder pins the frames of the step that raised it
 * (`FlightRecorder.pullEvents`): the burn is on the timeline, a thinned
 * recording keeps its frames, and the span a burn lights in has the burn
 * lit at its later end, so a replay keeps the stage on the straight line
 * there (`interpolateFrames`) rather than on a curve for a body falling
 * freely. Before, these burns raised nothing.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { FlightRecorder } from '../src/replay/recorder';
import { lessonConfig } from '../src/lessons/config';
import { missionDoc } from '../src/lessons/builtin/common';
import type { SimEvent } from '../src/physics/sim/types';

const BURNS = ['evt.entryBurnStart', 'evt.landingBurnStart'];

/** A point-mass mission to LEO with booster recovery and no plan, recorded until its recovered stages are down. */
function record(vehicleId: string, siteId: string, payloadMass: number, maxFrames?: number) {
  const sim = new Simulation(lessonConfig(missionDoc({ vehicleId, siteId, satelliteId: 'cubesats', payloadMass, orbitId: 'leo',
    boosterRecovery: true, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 } })), { headless: true });
  const recorder = new FlightRecorder(maxFrames);
  recorder.start(sim);
  let down = Infinity;
  // A point-mass flight runs up to a step ahead of the recording (T02), so it goes on until the recording has the landings too.
  while (sim.state.t < 1500 && !sim.isFailed() && recorder.clock < down + 60) {
    recorder.advance(1);
    const recovered = sim.debris.filter((d) => d.recovery);
    if (down === Infinity && recovered.length > 0 && recovered.every((d) => !d.alive)) down = sim.state.t;
  }
  expect(down, 'every recovered stage came down').toBeLessThan(Infinity);
  return { sim, recorder };
}

/** The recorded burn events, by stage name. */
function burnsOf(events: readonly SimEvent[]): Map<string, SimEvent[]> {
  const by = new Map<string, SimEvent[]>();
  for (const e of events) if (BURNS.includes(e.key)) by.set(String(e.params?.name), [...by.get(String(e.params?.name)) ?? [], e]);
  return by;
}

/** Each event's frame: stored at its very time, with the stage it names alive and burning in it. */
function expectPinned(recorder: FlightRecorder, e: SimEvent, ids: readonly number[]): void {
  const frame = recorder.frames[recorder.indexAt(e.t)];
  expect(frame.t, `${e.key} at T+${e.t}`).toBe(e.t);
  const lit = frame.debris.filter((d) => ids.includes(d.id) && d.alive && d.burning);
  expect(lit.length, `${e.params?.name} burning at ${e.key}`).toBeGreaterThan(0);
}

describe('an untargeted recovery\'s burns', () => {
  it('raise their events, entry burn first, and each is pinned to a frame the stage burns in (Falcon 9)', () => {
    const { sim, recorder } = record('falcon9', 'cape', 1000);
    const stage = sim.debris.find((d) => d.recovery)!;
    expect(stage.recovery!.target).toBeUndefined();
    expect(stage.outcome).toBe('landed');
    const burns = burnsOf(recorder.events).get(stage.name) ?? [];
    // one event for each burn: the landing burn's gaps (its bang-bang throttling) raise no more
    expect(burns.map((e) => e.key)).toEqual(BURNS);
    expect(burns.map((e) => e.params)).toEqual([{ name: stage.name }, { name: stage.name }]);
    const landed = recorder.events.find((e) => e.key === 'evt.boosterLanded')!;
    expect(burns[0].t).toBeLessThan(burns[1].t);
    expect(burns[1].t).toBeLessThanOrEqual(landed.t);
    for (const e of burns) {
      expect(e.severity).toBe('info');
      expectPinned(recorder, e, [stage.id]);
    }
  });

  it('keep their frames when the recording is thinned hard', () => {
    const { sim, recorder } = record('falcon9', 'cape', 1000, 300);
    expect(recorder.decimationCount).toBeGreaterThan(0);
    const stage = sim.debris.find((d) => d.recovery)!;
    const burns = burnsOf(recorder.events).get(stage.name) ?? [];
    expect(burns.map((e) => e.key)).toEqual(BURNS);
    for (const e of burns) expectPinned(recorder, e, [stage.id]);
  });

  it('raise them for every recovered body, the centre core\'s landing burn in the upper stage\'s coast (Falcon Heavy)', () => {
    const { sim, recorder } = record('falconheavy', 'ksc39a', 1000);
    const recovered = sim.debris.filter((d) => d.recovery);
    expect(recovered).toHaveLength(3);
    const burns = burnsOf(recorder.events);
    for (const name of new Set(recovered.map((d) => d.name))) {
      const bodies = recovered.filter((d) => d.name === name);
      const events = burns.get(name) ?? [];
      // the two side boosters share their name and their burns' instants
      expect(events.filter((e) => e.key === BURNS[0]), name).toHaveLength(bodies.length);
      expect(events.filter((e) => e.key === BURNS[1]), name).toHaveLength(bodies.length);
      for (const e of events) expectPinned(recorder, e, bodies.map((d) => d.id));
    }
    // The centre core lights its landing burn after the upper stage has shut down, between frames 10–20 s apart.
    const core = recovered.find((d) => d.name !== recovered[0].name)!;
    const landing = burns.get(core.name)!.find((e) => e.key === BURNS[1])!;
    const k = recorder.indexAt(landing.t);
    const before = recorder.frames[k - 1];
    expect(before.status).toBe('coast');
    expect(landing.t - before.t).toBeGreaterThanOrEqual(10);
    expect(before.debris.find((d) => d.id === core.id)!.burning).toBe(false);
  });
});
