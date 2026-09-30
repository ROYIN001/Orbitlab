/**
 * Which way the Moon faces (roadmap C01, docs/PHYSICS.md §13.10): its pole and
 * prime meridian, the IAU/WGCCRE 2009 model (Archinal et al., *Celestial
 * Mechanics and Dynamical Astronomy* 109, 2011) with its thirteen periodic
 * terms — the physical librations, up to 3.9° in the pole's right ascension
 * and 3.6° in the meridian — in the ICRF, precessed to the simulation's mean
 * equator of date. The body frame is the model's, which the mean-Earth frame
 * that Apollo's landing sites are given in follows to a few hundred metres.
 */
import { v3, type Vec3 } from '../vec3';
import { precessionFromJ2000, TDB_MINUS_UTC_1969 } from './ephemeris';

const DEG = Math.PI / 180;

/** The Moon's body axes in the simulation's ECI, as the columns of a row-major matrix (x to 0° E on the equator, z the north pole). */
export function moonBodyToEci(jdUtc: number): number[] {
  const d = jdUtc + TDB_MINUS_UTC_1969 / 86400 - 2451545.0, T = d / 36525;
  const E = [
    125.045 - 0.0529921 * d, 250.089 - 0.1059842 * d, 260.008 + 13.0120009 * d, 176.625 + 13.3407154 * d,
    357.529 + 0.9856003 * d, 311.589 + 26.4057084 * d, 134.963 + 13.0649930 * d, 276.617 + 0.3287146 * d,
    34.226 + 1.7484877 * d, 15.134 - 0.1589763 * d, 119.743 + 0.0036096 * d, 239.961 + 0.1643573 * d,
    25.053 + 12.9590088 * d,
  ].map((x) => x * DEG);
  const s = (i: number) => Math.sin(E[i - 1]), c = (i: number) => Math.cos(E[i - 1]);
  const alpha = (269.9949 + 0.0031 * T - 3.8787 * s(1) - 0.1204 * s(2) + 0.0700 * s(3) - 0.0172 * s(4) + 0.0072 * s(6)
    - 0.0052 * s(10) + 0.0043 * s(13)) * DEG;
  const delta = (66.5392 + 0.0130 * T + 1.5419 * c(1) + 0.0239 * c(2) - 0.0278 * c(3) + 0.0068 * c(4) - 0.0029 * c(6)
    + 0.0009 * c(7) + 0.0008 * c(10) - 0.0009 * c(13)) * DEG;
  const W = (38.3213 + 13.17635815 * d - 1.4e-12 * d * d + 3.5610 * s(1) + 0.1208 * s(2) - 0.0642 * s(3) + 0.0158 * s(4)
    + 0.0252 * s(5) - 0.0066 * s(6) - 0.0047 * s(7) - 0.0046 * s(8) + 0.0028 * s(9) + 0.0052 * s(10) + 0.0040 * s(11)
    + 0.0019 * s(12) - 0.0044 * s(13)) * DEG;
  // body → ICRF: Rz(α + 90°) · Rx(90° − δ) · Rz(W)
  const a = alpha + Math.PI / 2, b = Math.PI / 2 - delta;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cw = Math.cos(W), sw = Math.sin(W);
  const m = [
    ca * cw - sa * cb * sw, -ca * sw - sa * cb * cw, sa * sb,
    sa * cw + ca * cb * sw, -sa * sw + ca * cb * cw, -ca * sb,
    sb * sw, sb * cw, cb,
  ];
  const p = precessionFromJ2000(jdUtc);
  const out: number[] = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) out.push(p[i * 3] * m[j] + p[i * 3 + 1] * m[3 + j] + p[i * 3 + 2] * m[6 + j]);
  return out;
}

/** A point on (or above) the Moon, selenographic latitude and east longitude in degrees and radius in m, in the ECI of date, from the Moon's centre. */
export function selenographicToEci(latDeg: number, lonDeg: number, radius: number, jdUtc: number): Vec3 {
  const m = moonBodyToEci(jdUtc);
  const la = latDeg * DEG, lo = lonDeg * DEG;
  const x = radius * Math.cos(la) * Math.cos(lo), y = radius * Math.cos(la) * Math.sin(lo), z = radius * Math.sin(la);
  return v3(m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z);
}

/** Selenographic latitude and east longitude (deg) and radius (m) of an ECI offset from the Moon's centre. */
export function eciToSelenographic(rel: Vec3, jdUtc: number): { lat: number; lon: number; r: number } {
  const m = moonBodyToEci(jdUtc);
  // body = Mᵀ · eci
  const x = m[0] * rel.x + m[3] * rel.y + m[6] * rel.z, y = m[1] * rel.x + m[4] * rel.y + m[7] * rel.z, z = m[2] * rel.x + m[5] * rel.y + m[8] * rel.z;
  const r = Math.hypot(x, y, z);
  return { lat: Math.asin(z / r) / DEG, lon: Math.atan2(y, x) / DEG, r };
}
