/**
 * Shared by the custom-satellite tests (roadmap D06; Phase 4 map §2.6 c): a
 * catalogue satellite copied under an id of its own, the missions it flies,
 * and a flight recorded as plain data with the satellite's id set apart.
 *
 * The missions exercise what a satellite brings to a flight:
 * - `comsat`: Falcon 9 from the Cape to GEO — the comsat's own 490 N apogee
 *   engine is the last stage, and its first three apogee burns fall in the
 *   first day;
 * - `crew`: Soyuz-2.1a from Baikonur to the ISS and on to docking (G07) — the
 *   crew kind and its engine are what open the rendezvous, and `crewed` what
 *   opens the launch abort (G06).
 */
import { fly } from './custom-vehicle-harness';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE } from '../src/physics/defaults';
import { defaultDynamics } from '../src/physics/rigid/config';
import { orbitById } from '../src/data/orbits';
import { satelliteById } from '../src/data/satellites';
import type { MissionConfig, SatelliteSpec } from '../src/types';

export const SAT_LAUNCH = new Date(Date.UTC(2026, 8, 15, 12, 0, 0));

/** A catalogue satellite, deep-copied under an id of its own. */
export function satelliteCopyOf(id: string, extra: Partial<SatelliteSpec> = {}): SatelliteSpec {
  return { ...structuredClone(satelliteById(id)), id: `${id}-copy`, derivedFrom: id, ...extra };
}

export type HarnessSatellite = 'comsat' | 'crew';

const MISSIONS: Record<HarnessSatellite, Omit<MissionConfig, 'satelliteId' | 'dynamics' | 'launchTime'>> = {
  comsat: { vehicleId: 'falcon9', siteId: 'cape', orbit: orbitById('geo'),
    guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false },
  crew: { vehicleId: 'soyuz21a', siteId: 'baikonur', orbit: orbitById('iss'),
    guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, rendezvous: { profile: 'twoOrbit' } },
};

/** How long each mission is flown, s: the comsat's first day (three apogee burns), the crew to docking. */
export const SAT_FLIGHT_TIME: Record<HarnessSatellite, number> = { comsat: 86400, crew: 7200 * 3 };

/** The satellite's mission, flown with the catalogue satellite or with `custom`. */
export function satelliteMission(id: HarnessSatellite, model: 'pointMass' | 'sixDof', custom?: SatelliteSpec): MissionConfig {
  const m = structuredClone(MISSIONS[id]);
  return { ...m, launchTime: SAT_LAUNCH, satelliteId: custom?.id ?? id, ...(custom ? { satelliteSpec: custom } : {}),
    dynamics: { ...defaultDynamics(m.vehicleId), model } };
}

/**
 * Fly a mission as the custom-vehicle tests do (`fly`, the animation loop's
 * recorder), with each event's `satId` set apart: the id is the designer's
 * label for the satellite, which the presentation layer names it by, and no
 * part of the flight. Everything else is returned as recorded.
 */
export function flySatellite(cfg: MissionConfig, maxTime: number) {
  const { flight } = fly(cfg, maxTime);
  const satIds = new Set<string>();
  const events = flight.events.map((e) => {
    if (typeof e.params?.satId !== 'string') return e;
    satIds.add(e.params.satId);
    return { ...e, params: { ...e.params, satId: '(the satellite)' } };
  });
  return { satIds, flight: { ...flight, events } };
}
