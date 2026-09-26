/**
 * The forces on a satellite over days to decades (roadmap P07), each one
 * switchable, in the equatorial inertial frame the rest of the simulator uses
 * (z along the Earth's axis):
 *
 * - **Gravity**: the central term and the zonal harmonics J2, J3, J4 (EGM96,
 *   unnormalised). J2 turns the orbit's plane and its line of apsides; J3 —
 *   the Earth's pear shape — slowly swings the eccentricity (the "frozen
 *   orbit" of an Earth-observation satellite sits where it balances J2);
 *   J4 refines both.
 * - **Drag** in an atmosphere turning with the Earth (density.ts: NRLMSISE-00's
 *   level for the Sun's activity, Harris–Priester's diurnal bulge; the
 *   activity fixed, or measured and forecast, R05): −½ ρ C_D (A/m) |v_r| v_r.
 * - **The Sun and the Moon** as third bodies, direct pull less the pull on
 *   the Earth (the part that matters is their tide across the orbit).
 * - **Sunlight pressure** on a sphere ("cannonball"): P_⊙ C_R (A/m) (AU/d)²
 *   away from the Sun, switched off in the Earth's cylindrical shadow.
 *
 * This is the long-term propagator only; the ascent and the 6-DOF orbit
 * verdict (`physicalApsides`) never call it.
 */
import { MU_EARTH, OMEGA_EARTH, R_EARTH, J2_EARTH } from '../constants';
import { AU, moonPosition, sunPosition, type V3 } from './ephemeris';
import { airDensity, heightKm } from './density';
import { ECSS_LEVELS, indicesAt, type Activity } from './activity';

export const J3_EARTH = -2.53265649e-6;
export const J4_EARTH = -1.61962159e-6;
export const MU_SUN = 1.32712440018e20;
export const MU_MOON = 4.9048695e12;
/** Solar radiation pressure at 1 AU on an absorbing surface, N/m². */
export const P_SUN = 4.56e-6;

export interface ForceModel {
  j2: boolean;
  /** J3 and J4 together */
  j3j4: boolean;
  drag: boolean;
  sun: boolean;
  moon: boolean;
  srp: boolean;
  /** the Sun's and the geomagnetic field's activity, for the density (R05) */
  activity: Activity;
}

export const ALL_FORCES: ForceModel = { j2: true, j3j4: true, drag: true, sun: true, moon: true, srp: true, activity: ECSS_LEVELS.moderate };

export interface Spacecraft {
  mass: number;
  /** cross-section, m², for drag and sunlight alike */
  area: number;
  /** drag coefficient */
  cd: number;
  /** radiation-pressure coefficient (1 absorbing, 2 mirror) */
  cr: number;
}

/** The central term and the zonal harmonics, m/s². */
export function gravityAcceleration(r: V3, j2: boolean, j3j4: boolean): V3 {
  const [x, y, z] = r;
  const r2 = x * x + y * y + z * z, rr = Math.sqrt(r2);
  const mu = MU_EARTH, R = R_EARTH;
  const k = -mu / (r2 * rr);
  let ax = k * x, ay = k * y, az = k * z;
  const zr2 = (z * z) / r2;
  if (j2) {
    const c = (-1.5 * J2_EARTH * mu * R * R) / (r2 * r2 * rr);
    ax += c * x * (1 - 5 * zr2);
    ay += c * y * (1 - 5 * zr2);
    az += c * z * (3 - 5 * zr2);
  }
  if (j3j4) {
    const r7 = r2 * r2 * r2 * rr;
    const c3 = (-2.5 * J3_EARTH * mu * R * R * R) / r7;
    const f3 = 3 * z - (7 * z * z * z) / r2;
    ax += c3 * x * f3;
    ay += c3 * y * f3;
    az += c3 * (6 * z * z - (7 * z * z * z * z) / r2 - 0.6 * r2);
    const c4 = (1.875 * J4_EARTH * mu * R ** 4) / r7;
    const f4 = 1 - 14 * zr2 + 21 * zr2 * zr2;
    ax += c4 * x * f4;
    ay += c4 * y * f4;
    az += c4 * z * (5 - (70 / 3) * zr2 + 21 * zr2 * zr2);
  }
  return [ax, ay, az];
}

/** Pull of a third body at `s` (m from the Earth's centre) on a satellite at `r`, less its pull on the Earth. */
export function thirdBody(r: V3, s: V3, mu: number): V3 {
  const d: V3 = [s[0] - r[0], s[1] - r[1], s[2] - r[2]];
  const dn = Math.hypot(d[0], d[1], d[2]), sn = Math.hypot(s[0], s[1], s[2]);
  const kd = mu / dn ** 3, ks = mu / sn ** 3;
  return [kd * d[0] - ks * s[0], kd * d[1] - ks * s[1], kd * d[2] - ks * s[2]];
}

/** Whether `r` is in the Earth's shadow, taken as a cylinder behind it, with the Sun at `s`. */
export function inShadow(r: V3, s: V3): boolean {
  const sn = Math.hypot(s[0], s[1], s[2]);
  const along = (r[0] * s[0] + r[1] * s[1] + r[2] * s[2]) / sn;
  if (along >= 0) return false;
  const px = r[0] - (along * s[0]) / sn, py = r[1] - (along * s[1]) / sn, pz = r[2] - (along * s[2]) / sn;
  return Math.hypot(px, py, pz) < R_EARTH;
}

/** Everything on the satellite at `r`, `v` (m, m/s) at Julian date `jd`, m/s². */
export function acceleration(r: V3, v: V3, jd: number, f: ForceModel, sc: Spacecraft, bulgeN = 4): V3 {
  const a = gravityAcceleration(r, f.j2, f.j3j4);
  const needSun = f.sun || f.srp || f.drag;
  const sun = needSun ? sunPosition(jd) : null;
  if (f.drag) {
    const alt = heightKm(r);
    if (alt < 1000) {
      const rho = airDensity(r, alt, sun!, bulgeN, indicesAt(f.activity, jd));
      // air turning with the Earth: v_rel = v − ω × r
      const vr: V3 = [v[0] + OMEGA_EARTH * r[1], v[1] - OMEGA_EARTH * r[0], v[2]];
      const vm = Math.hypot(vr[0], vr[1], vr[2]);
      const k = -0.5 * rho * sc.cd * (sc.area / sc.mass) * vm;
      a[0] += k * vr[0]; a[1] += k * vr[1]; a[2] += k * vr[2];
    }
  }
  if (f.sun) {
    const t = thirdBody(r, sun!, MU_SUN);
    a[0] += t[0]; a[1] += t[1]; a[2] += t[2];
  }
  if (f.moon) {
    const t = thirdBody(r, moonPosition(jd), MU_MOON);
    a[0] += t[0]; a[1] += t[1]; a[2] += t[2];
  }
  if (f.srp && !inShadow(r, sun!)) {
    const d: V3 = [r[0] - sun![0], r[1] - sun![1], r[2] - sun![2]];
    const dn = Math.hypot(d[0], d[1], d[2]);
    const k = (P_SUN * sc.cr * (sc.area / sc.mass) * AU * AU) / (dn * dn * dn);
    a[0] += k * d[0]; a[1] += k * d[1]; a[2] += k * d[2];
  }
  return a;
}
