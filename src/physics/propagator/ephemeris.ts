/**
 * Where the Sun and the Moon are (roadmap P07), for their pull on a satellite
 * and for sunlight pressure. The low-precision series of Montenbruck & Gill,
 * *Satellite Orbits* (Springer 2000), §3.3.2: the Sun to about 0.1 % in
 * distance and 1′ in direction, the Moon to a few hundred kilometres and a few
 * arc-minutes — far below what a third-body perturbation needs. Positions are
 * geocentric, equatorial (the ecliptic of J2000 turned by the obliquity), m.
 */

export type V3 = [number, number, number];

const DEG = Math.PI / 180;
const ARCSEC = DEG / 3600;
/** Obliquity of the ecliptic at J2000, rad. */
const EPS = 23.43929111 * DEG;
export const AU = 1.495978707e11;

const frac = (x: number): number => x - Math.floor(x);

function fromEcliptic(lon: number, lat: number, r: number): V3 {
  const x = r * Math.cos(lon) * Math.cos(lat), y = r * Math.sin(lon) * Math.cos(lat), z = r * Math.sin(lat);
  return [x, Math.cos(EPS) * y - Math.sin(EPS) * z, Math.sin(EPS) * y + Math.cos(EPS) * z];
}

/** The Sun's geocentric position, m, at Julian date `jd`. */
export function sunPosition(jd: number): V3 {
  const T = (jd - 2451545.0) / 36525;
  const M = 2 * Math.PI * frac(0.9931267 + 99.9973583 * T);
  const lon = 2 * Math.PI * frac(0.7859444 + M / (2 * Math.PI) + (6892 * Math.sin(M) + 72 * Math.sin(2 * M)) / 1296e3);
  const r = (149.619 - 2.499 * Math.cos(M) - 0.021 * Math.cos(2 * M)) * 1e9;
  return fromEcliptic(lon, 0, r);
}

/** The Moon's geocentric position, m, at Julian date `jd`. */
export function moonPosition(jd: number): V3 {
  const T = (jd - 2451545.0) / 36525;
  const L0 = frac(0.606433 + 1336.851344 * T);
  const l = 2 * Math.PI * frac(0.374897 + 1325.55241 * T);
  const lp = 2 * Math.PI * frac(0.993133 + 99.997361 * T);
  const D = 2 * Math.PI * frac(0.827361 + 1236.853086 * T);
  const F = 2 * Math.PI * frac(0.259086 + 1342.227825 * T);
  const dL = 22640 * Math.sin(l) - 4586 * Math.sin(l - 2 * D) + 2370 * Math.sin(2 * D) + 769 * Math.sin(2 * l)
    - 668 * Math.sin(lp) - 412 * Math.sin(2 * F) - 212 * Math.sin(2 * l - 2 * D) - 206 * Math.sin(l + lp - 2 * D)
    + 192 * Math.sin(l + 2 * D) - 165 * Math.sin(lp - 2 * D) - 125 * Math.sin(D) - 110 * Math.sin(l + lp)
    + 148 * Math.sin(l - lp) - 55 * Math.sin(2 * F - 2 * D);
  const lon = 2 * Math.PI * frac(L0 + dL / 1296e3);
  const S = F + (dL + 412 * Math.sin(2 * F) + 541 * Math.sin(lp)) * ARCSEC;
  const h = F - 2 * D;
  const N = -526 * Math.sin(h) + 44 * Math.sin(l + h) - 31 * Math.sin(-l + h) - 23 * Math.sin(lp + h)
    + 11 * Math.sin(-lp + h) - 25 * Math.sin(-2 * l + F) + 21 * Math.sin(-l + F);
  const lat = (18520 * Math.sin(S) + N) * ARCSEC;
  const r = (385000 - 20905 * Math.cos(l) - 3699 * Math.cos(2 * D - l) - 2956 * Math.cos(2 * D)
    - 570 * Math.cos(2 * l) + 246 * Math.cos(2 * l - 2 * D) - 205 * Math.cos(lp - 2 * D)
    - 171 * Math.cos(l + 2 * D) - 152 * Math.cos(l + lp - 2 * D)) * 1e3;
  return fromEcliptic(lon, lat, r);
}
