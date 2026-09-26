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
import type { MissionConfig, VehicleSpec } from '../src/types';

export const LAUNCH = new Date(Date.UTC(2026, 8, 15, 12, 0, 0));

/** A catalogue vehicle, deep-copied under an id of its own. */
export function copyOf(id: string, extra: Partial<VehicleSpec> = {}): VehicleSpec {
  return { ...structuredClone(vehicleById(id)), id: `${id}-copy`, derivedFrom: id, ...extra };
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
