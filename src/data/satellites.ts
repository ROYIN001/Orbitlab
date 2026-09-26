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
  // C01: the payloads of the historical missions, as flown.
  { id: 'sputnik1', kind: 'science', name: 'Sputnik-1 (PS-1)', mass: 83.6, typicalOrbit: 'leo', description: 'The first artificial satellite: a 58 cm polished sphere with four whip antennas and two radio transmitters. No propulsion.', size: { width: 0.58, height: 0.58, depth: 0.58 } },
  { id: 'vostok3ka', kind: 'crew', name: 'Vostok 3KA', mass: 4730, typicalOrbit: 'leo', description: "Gagarin's Vostok: a 2.3 m descent sphere on an instrument module. Its TDU-1 engine only brought it home, so Blok E put it in orbit.", size: { width: 2.43, height: 4.4, depth: 2.43 } },
  { id: 'apollo', kind: 'crew', name: 'Apollo CSM + LM', mass: 45700, typicalOrbit: 'leo', description: 'Apollo 11: command and service module, the lunar module and its adapter, 45.7 t. The S-IVB made the translunar injection; the service engine was kept for the Moon.', crewed: true, size: { width: 3.9, height: 11, depth: 3.9 } },
];

export const satelliteById = (id: string): SatelliteSpec => {
  const s = SATELLITES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown satellite ${id}`);
  return s;
};
