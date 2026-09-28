/**
 * Where the Sun and the Moon are (roadmap P07), for their pull on a satellite
 * and for sunlight pressure: the low-precision series of Montenbruck & Gill,
 * which live in `../ephemeris-series.ts` so that the flight's own Moon
 * (`lunar/ephemeris.ts`, C01) can fall back on them without importing the
 * propagator.
 */
export { AU, moonPosition, sunPosition, type V3 } from '../ephemeris-series';
