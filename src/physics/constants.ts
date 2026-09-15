/**
 * Physical constants (SI units unless noted).
 * Values follow WGS-84 / IERS conventions where applicable.
 */

/** Standard gravitational parameter of Earth, m^3/s^2 */
export const MU_EARTH = 3.986004418e14;
/** Mean equatorial radius of Earth, m */
export const R_EARTH = 6378137.0;
/** Mean radius used for altitude bookkeeping (spherical Earth model), m */
export const R_EARTH_MEAN = 6371000.0;
/** Earth rotation rate, rad/s (sidereal) */
export const OMEGA_EARTH = 7.2921159e-5;
/** J2 zonal harmonic (oblateness) */
export const J2_EARTH = 1.08262668e-3;
/** Standard gravity, m/s^2 */
export const G0 = 9.80665;
/** Sea level standard pressure, Pa */
export const P0 = 101325;
/** Sidereal day, s */
export const SIDEREAL_DAY = 86164.0905;
/** Solar day, s */
export const SOLAR_DAY = 86400;
/** Geostationary altitude above the equatorial radius, m */
export const GEO_ALTITUDE = 35786000;

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;
