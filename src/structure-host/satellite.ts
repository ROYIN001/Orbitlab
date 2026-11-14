/**
 * The Structure section's educational satellite as the rest of Orbitlab
 * reads a satellite: a `SatelliteDesign`, which the Orbit section's hand-off
 * (`designHandoff`) and the Launch section's mission (`designMissionDocument`)
 * take as they take one from the satellite builder.
 *
 * Made from the section's plain figures (`SatelliteRecord`,
 * src/structure/handoff.ts) on NAPA-2's 6U science template (Orbitlab's one
 * CubeSat template): the parts list's mass as the dry mass (no propellant: no
 * engine), the 3U body, the cell area on a spinner's mount, the battery, the
 * loads as orbit averages, a circular sun-synchronous orbit at the record's
 * altitude and node time, and no camera figures (the pilot's cameras have
 * none). Its comms and attitude figures stay the template's and are not used
 * by the hand-offs. In the app's own bundle; DOM-free.
 */
import { boxInertia } from '../data/satellite-templates';
import { dragArea } from '../design/satellite-area';
import { designFromTemplate, ssoInclinationDeg } from '../design/satellite-model';
import type { SatelliteDesign } from '../design/satellite-spec';
import type { HandoffPreview, SatelliteRecord } from '../structure/handoff';

export function satelliteDesign(r: SatelliteRecord): SatelliteDesign {
  const base = designFromTemplate('napa2', r.id, r.name);
  const size = { ...r.size };
  return {
    ...base,
    kind: 'science',
    orbit: {
      perigee: r.orbit.altitude, apogee: r.orbit.altitude,
      inclination: ssoInclinationDeg(r.orbit.altitude, r.orbit.altitude) ?? base.orbit.inclination, sso: true, ltan: r.orbit.ltan,
    },
    lifeYears: r.lifeYears,
    bus: { ...base.bus, dryMass: r.massKg, size },
    power: { ...base.power, payloadW: r.payloadW, busW: r.busW, arrayArea: r.cellArea, mount: 'spinner', batteryWh: r.batteryWh, dod: r.dod },
    propulsion: null,
    adcs: { ...base.adcs, inertia: boxInertia(r.massKg, size) },
    payload: null,
    sources: ['Orbitlab Structure section, EduSat-3U: a concept for learning (src/structure/edusat.ts)'],
  };
}

/** What the app would send of a satellite: the figures its hand-offs carry, read off its own record. */
export function handoffPreview(sat: SatelliteDesign): HandoffPreview {
  return {
    name: sat.name,
    massKg: sat.bus.dryMass + (sat.propulsion?.propellant ?? 0),
    size: { ...sat.bus.size },
    dragArea: dragArea(sat), cd: sat.bus.cd, cr: sat.bus.cr,
    perigee: sat.orbit.perigee, apogee: sat.orbit.apogee, inclination: sat.orbit.inclination, sso: !!sat.orbit.sso,
  };
}
