/**
 * Shared by the custom-vehicle tests (roadmap S02): a catalogue vehicle copied
 * under an id of its own, the missions they fly, and a flight recorded to its
 * end as plain data.
 */
import { Simulation } from '../src/physics/simulation';
import { FlightRecorder } from '../src/replay/recorder';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE } from '../src/physics/defaults';
import { defaultDynamics } from '../src/physics/rigid/config';
import { orbitById } from '../src/data/orbits';
import { vehicleById } from '../src/data/vehicles';
import type { BoosterGroupSpec, MissionConfig, StageSpec, VehicleSpec } from '../src/types';

export const LAUNCH = new Date(Date.UTC(2026, 8, 15, 12, 0, 0));

/** A catalogue vehicle, deep-copied under an id of its own. */
export function copyOf(id: string, extra: Partial<VehicleSpec> = {}): VehicleSpec {
  return { ...structuredClone(vehicleById(id)), id: `${id}-copy`, derivedFrom: id, ...extra };
}

/**
 * Custom vehicles whose stages reach the six-DOF branches no catalogue stage
 * reaches (the fixes before roadmap D03 offers six-DOF as experimental):
 *
 * - `scratch-new-ids`, with no origin and stage ids the catalogue does not
 *   know: a first stage of twelve Merlin 1D (more engines than the generic
 *   ring's eight bells), two liquid strap-ons of two RD-191 each and two solid
 *   GEM 63, a four-RL10 second stage and a Zefiro 9 solid third stage;
 * - `falcon9-copy` with five engines on its `s1`, which only a nine-engine
 *   `s1` gives the octaweb branch;
 * - `soyuz21a-copy` with two engines on Blok A and on each Blok B–Γ and
 *   three on Blok I, which only one engine gives the R-7 branches.
 *
 * Every part is a catalogue part, deep-copied, so the figures are real ones;
 * only the counts and ids are the designer's. None of them is meant to be a
 * good rocket.
 */
export function scratchVehicles(): VehicleSpec[] {
  const part = <T>(vehicle: string, id: string): T => {
    const spec = vehicleById(vehicle);
    const found = spec.stages.flatMap((s) => [s, ...(s.boosters ?? [])]).find((p) => p.id === id);
    if (!found) throw new Error(`${vehicle} has no ${id}`);
    return structuredClone(found) as T;
  };
  const { derivedFrom: _, ...origin } = copyOf('falcon9');
  const core: StageSpec = { ...part<StageSpec>('falcon9', 's1'), id: 'x1', name: 'Core' };
  core.engine.count = 12;
  const liquid: BoosterGroupSpec = { ...part<BoosterGroupSpec>('angaraa5', 'urm1'), id: 'xl', name: 'Liquid strap-ons', count: 2 };
  liquid.engine.count = 2;
  const solid: BoosterGroupSpec = { ...part<BoosterGroupSpec>('atlasv551', 'gem63'), id: 'xs', name: 'Solid strap-ons', count: 2 };
  core.boosters = [liquid, solid];
  const second: StageSpec = { ...part<StageSpec>('vulcan', 'centaur5'), id: 'x2', name: 'Second stage' };
  second.engine.count = 4;
  const third: StageSpec = { ...part<StageSpec>('vegac', 'z9'), id: 'x3', name: 'Solid third stage' };
  const newIds: VehicleSpec = { ...origin, id: 'scratch-new-ids', name: 'Scratch', stages: [core, second, third] };
  const falcon = copyOf('falcon9');
  falcon.stages[0].engine.count = 5;
  const soyuz = copyOf('soyuz21a');
  soyuz.stages[0].engine.count = 2;
  soyuz.stages[0].boosters![0].engine.count = 2;
  soyuz.stages[1].engine.count = 3;
  return [newIds, falcon, soyuz];
}

const MISSIONS: Record<'falcon9' | 'soyuz21a', Omit<MissionConfig, 'vehicleId' | 'dynamics' | 'launchTime'>> = {
  falcon9: { satelliteId: 'starlink', siteId: 'cape', orbit: orbitById('starlink'),
    guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false },
  soyuz21a: { satelliteId: 'crew', siteId: 'baikonur', orbit: orbitById('iss'),
    guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false },
};

/** The vehicle's mission, flown by the catalogue vehicle or by `custom`. */
export function mission(id: 'falcon9' | 'soyuz21a', model: 'pointMass' | 'sixDof', custom?: VehicleSpec): MissionConfig {
  return { ...structuredClone(MISSIONS[id]), launchTime: LAUNCH, vehicleId: custom?.id ?? id,
    ...(custom ? { vehicleSpec: custom } : {}), dynamics: { ...defaultDynamics(id), model } };
}

/**
 * Fly a mission through the recorder, as the animation loop does, to its end
 * or `maxTime`. Every frame records the vehicle's name, which is the
 * designer's and no part of the flight: it is returned apart.
 */
export function fly(cfg: MissionConfig, maxTime: number) {
  const sim = new Simulation(cfg, { headless: true });
  const rec = new FlightRecorder();
  rec.start(sim);
  let guard = 0;
  while (!sim.done && sim.state.t < maxTime && guard++ < 50000) rec.advance(2, 1e9);
  const names = new Set(rec.frames.map((f) => f.vehicleName));
  return {
    names,
    flight: {
      t: sim.state.t, status: sim.state.status, done: sim.done,
      frames: rec.frames.map(({ vehicleName: _, ...frame }) => structuredClone(frame)), events: structuredClone(rec.events),
      telemetry: structuredClone(sim.telemetry), plan: structuredClone(sim.plan), elements: structuredClone(sim.state.elements),
    },
  };
}
