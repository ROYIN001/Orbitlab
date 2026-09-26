import type { SatelliteSpec } from '../types';

export const SATELLITES: SatelliteSpec[] = [
  { id: 'comsat', kind: 'comsat', name: 'Communications satellite', mass: 5500, typicalOrbit: 'geo', description: 'Large geostationary bus with two solar wings and reflector antennas (e.g. Express-AM, Intelsat). Carries a 490 N apogee engine.', propulsion: { thrust: 490, isp: 321, propellantFraction: 0.45 }, size: { width: 2.5, height: 5, depth: 2.5 } },
  { id: 'earthObs', kind: 'earthObs', name: 'Earth-observation satellite', mass: 2200, typicalOrbit: 'sso', description: 'Optical imaging spacecraft in a sun-synchronous orbit (e.g. Resurs-P, WorldView).', propulsion: { thrust: 22, isp: 225, propellantFraction: 0.1 }, size: { width: 1.8, height: 4.5, depth: 1.8 } },
  { id: 'weather', kind: 'weather', name: 'Weather satellite', mass: 1800, typicalOrbit: 'geo', description: 'Geostationary meteorological satellite (e.g. Elektro-L, GOES).', propulsion: { thrust: 400, isp: 315, propellantFraction: 0.42 }, size: { width: 2, height: 3.5, depth: 2 } },
  { id: 'navigation', kind: 'navigation', name: 'Navigation satellite', mass: 1400, typicalOrbit: 'glonass', description: 'GNSS spacecraft for MEO constellations (e.g. GLONASS-K, GPS III).', propulsion: { thrust: 400, isp: 310, propellantFraction: 0.3 }, size: { width: 1.8, height: 3, depth: 1.8 } },
  { id: 'science', kind: 'science', name: 'Science / astronomy satellite', mass: 2700, typicalOrbit: 'polar', description: 'Space observatory or research platform (e.g. Spektr-RG, Fermi).', propulsion: { thrust: 22, isp: 225, propellantFraction: 0.08 }, size: { width: 2.5, height: 5.5, depth: 2.5 } },
  { id: 'cubesats', kind: 'cubesats', name: 'CubeSat rideshare dispenser', mass: 300, typicalOrbit: 'sso', description: 'Rideshare dispenser releasing a cluster of small satellites. No propulsion of its own.', size: { width: 1, height: 1.2, depth: 1 } },
  { id: 'starlink', kind: 'starlink', name: 'Starlink batch (60 × 260 kg)', mass: 15600, typicalOrbit: 'starlink', description: 'Flat-packed stack of broadband satellites; the launcher upper stage performs the orbit raising.', size: { width: 3.5, height: 5, depth: 2.5 } },
  { id: 'crew', kind: 'crew', name: 'Crewed spacecraft', mass: 7150, typicalOrbit: 'iss', description: 'Crew capsule with service module (e.g. Soyuz MS, Crew Dragon). Raises its own orbit to the station with a 3.9 kN engine.', crewed: true, propulsion: { thrust: 3920, isp: 302, propellantFraction: 0.12 }, size: { width: 2.7, height: 7, depth: 2.7 } },
  // Crew Dragon as Demo-2 flew it (roadmap C01): 13,055 kg — the capsule with
  // its propellant, about 10,755 kg, and the trunk, about 2,300 kg (GCAT
  // S45623, S46024; estimates). 4.0 m across, 8.1 m tall with the trunk, the
  // capsule 4.5 m of it (en.wikipedia, SpaceX Dragon 2); flown
  // on top of Falcon 9 without a fairing. It raises its own orbit with Dracos,
  // which the model does not fly: the flight ends at separation.
  { id: 'crewDragon', kind: 'crewDragon', name: 'Crew Dragon', mass: 13055, typicalOrbit: 'iss', description: 'SpaceX crew capsule and its trunk, flown on top of Falcon 9 without a fairing. Its own Draco thrusters take it on to the station.', crewed: true, size: { width: 4.0, height: 8.1, depth: 4.0 }, exposed: { diameter: 4.0, length: 8.1, noseLength: 4.5 }, carriers: ['falcon9'] },
  // C01: the spacecraft of the first R-7 flights (docs/PHYSICS.md §13.6).
  // PS-1: 83.6 kg, a 0.58 m sphere with four whip aerials of 2.4 and 2.9 m.
  { id: 'ps1', kind: 'ps1', name: 'Sputnik 1 (PS-1)', mass: 83.6, typicalOrbit: 'custom', description: 'The first artificial satellite: a polished 58 cm sphere with four whip aerials and two radio transmitters.', size: { width: 0.58, height: 0.58, depth: 0.58 }, carriers: ['sputnik8k71ps'] },
  // Vostok 3KA: 4,725 kg; the 2.3 m descent sphere (2,460 kg) on the
  // 2.43 × 2.25 m instrument module. Its retro engine only brings it down.
  { id: 'vostok3ka', kind: 'vostok', name: 'Vostok 3KA', mass: 4725, typicalOrbit: 'custom', description: 'The first crewed spacecraft: a 2.3 m descent sphere on an instrument module with the retro engine.', crewed: true, size: { width: 2.43, height: 4.4, depth: 2.43 }, carriers: ['vostokk'] },
  // Freedom 7 (MR-3): 1,832.6 kg at launch with its escape tower, 1.892 m
  // across, 7.9 m with the tower (NASA, *Postlaunch Report for Mercury-Redstone
  // No. 3*, 1961). Flown on the stack as it stood; it comes home on its own
  // parachutes (`MERCURY_CAPSULE`, src/physics/rigid/escape.ts).
  { id: 'mercury', kind: 'mercury', name: 'Mercury capsule', mass: 1832.6, typicalOrbit: 'custom', description: 'The first American crewed spacecraft: a one-man capsule under a solid-rocket escape tower, landing in the sea on parachutes.', crewed: true, size: { width: 1.892, height: 7.9, depth: 1.892 }, exposed: { diameter: 1.892, length: 7.9, noseLength: 7.9 }, carriers: ['mercuryredstone'], descent: 'mercury' },
];

export const satelliteById = (id: string): SatelliteSpec => {
  const s = SATELLITES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown satellite ${id}`);
  return s;
};
