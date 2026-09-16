import type { OrbitSpec } from '../types';

const km = 1000;

export const ORBIT_PRESETS: OrbitSpec[] = [
  { id: 'leo', name: 'Low Earth orbit (500 km)', perigee: 500 * km, apogee: 500 * km, inclination: 'site', argPerigee: 0, raanMode: 'free', description: 'Generic circular LEO at the minimum inclination of the launch site.' },
  { id: 'iss', name: 'ISS orbit (420 km, 51.6°)', perigee: 420 * km, apogee: 420 * km, inclination: 51.64, argPerigee: 0, raanMode: 'iss', description: 'Circular orbit in the plane of the International Space Station. The launch window is set by the station\'s ascending node.' },
  { id: 'starlink', name: 'Starlink shell (550 km, 53°)', perigee: 550 * km, apogee: 550 * km, inclination: 53.0, argPerigee: 0, raanMode: 'free', description: 'First-generation Starlink shell.' },
  { id: 'sso', name: 'Sun-synchronous (600 km)', perigee: 600 * km, apogee: 600 * km, inclination: 'sso', argPerigee: 0, raanMode: 'ltan', ltan: 10.5, description: 'Retrograde near-polar orbit whose plane precesses 360° per year under J2, keeping a constant local solar time (LTAN 10:30).' },
  { id: 'polar', name: 'Polar (800 km, 90°)', perigee: 800 * km, apogee: 800 * km, inclination: 90, argPerigee: 0, raanMode: 'free', description: 'Circular polar orbit covering the whole globe.' },
  { id: 'gps', name: 'MEO – GPS (20 180 km, 55°)', perigee: 20180 * km, apogee: 20180 * km, inclination: 55, argPerigee: 0, raanMode: 'free', description: 'Semi-synchronous 12-hour orbit used by GPS.' },
  { id: 'glonass', name: 'MEO – GLONASS (19 130 km, 64.8°)', perigee: 19130 * km, apogee: 19130 * km, inclination: 64.8, argPerigee: 0, raanMode: 'free', description: '11 h 15 min orbit of the GLONASS constellation, reachable directly from Plesetsk.' },
  { id: 'gto', name: 'Geostationary transfer orbit', perigee: 250 * km, apogee: 35786 * km, inclination: 'site', argPerigee: 0, raanMode: 'free', description: 'Elliptical transfer with apogee at geostationary altitude; the satellite circularises with its own propulsion.' },
  { id: 'geo', name: 'Geostationary (35 786 km, 0°)', perigee: 35786 * km, apogee: 35786 * km, inclination: 0, argPerigee: 0, raanMode: 'free', description: 'Direct injection into GEO: parking orbit, transfer burn at the node, combined plane change and circularisation at apogee.' },
  { id: 'molniya', name: 'Molniya (600 × 39 750 km, 63.4°)', perigee: 600 * km, apogee: 39750 * km, inclination: 63.4, argPerigee: 270, raanMode: 'free', description: 'Highly elliptical 12-hour orbit at the critical inclination; apogee dwells over the northern hemisphere.' },
  { id: 'tundra', name: 'Tundra (24 400 × 47 170 km, 63.4°)', perigee: 24400 * km, apogee: 47170 * km, inclination: 63.4, argPerigee: 270, raanMode: 'free', description: 'Geosynchronous highly-elliptical orbit at the critical inclination.' },
  { id: 'custom', name: 'Custom orbit', perigee: 400 * km, apogee: 400 * km, inclination: 51.6, argPerigee: 0, raanMode: 'free', description: 'Set perigee, apogee, inclination, argument of perigee and RAAN yourself.' },
];

export const orbitById = (id: string): OrbitSpec => {
  const o = ORBIT_PRESETS.find((x) => x.id === id);
  if (!o) throw new Error(`Unknown orbit ${id}`);
  return o;
};
