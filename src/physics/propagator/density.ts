/**
 * The density of the upper atmosphere for orbit decay (roadmap P07, R05,
 * P2.5): NRLMSISE-00 (msis.ts) at the satellite's place and time, for the
 * day's solar and geomagnetic indices (activity.ts) — its effective mass
 * density for drag, the anomalous oxygen included (GTD7D). ECSS-E-ST-10-04C
 * (§8.3.3) names it for orbit-decay work, and puts its uncertainty at about
 * 15 % in mean conditions (Annex G.5).
 *
 * Until P2.5 the density was NRLMSISE-00's day-and-season average at the
 * height (ECSS's tables) spread through the day by Harris–Priester's bulge.
 * The model itself carries what that could not: the density's rise to the
 * summer and to the equinoxes, its latitude, its dependence on the day's
 * flux as well as its 81-day mean, and the day's geomagnetic activity.
 *
 * The model reads geodetic height, latitude and longitude, the day of the
 * year, the UT and the local solar time; `msisInput` finds them for a
 * position in the inertial frame at a Julian date (UT), the Earth turned by
 * the sidereal time. Above 2500 km it returns no air: hydrogen there weighs
 * under 10⁻¹⁶ kg/m³, and the long-term propagator does not spend the model's
 * microseconds on it.
 *
 * Used by the long-term propagator only: the ascent keeps its own atmosphere
 * (src/physics/atmosphere.ts). tests/msis.test.ts holds the model to its
 * reference; tests/activity.test.ts holds the density to ECSS's tables and
 * the decay to satellites' published re-entry dates.
 */
import { gmst } from '../orbital';
import type { V3 } from './ephemeris';
import { msisDensity, type MsisInput } from './msis';
import type { Indices } from './activity';
import { geodetic } from '../geodesy';

/** The WGS-84 geodetic latitude and height, shared with the return from orbit (src/physics/geodesy.ts). */
export { geodetic };

/** No air above this height, m. */
export const TOP_OF_ATMOSPHERE = 2_500_000;

/** Height above the WGS-84 ellipsoid, km, of an ECI position, m. */
export function heightKm(r: V3): number {
  return geodetic(r[0], r[1], r[2]).h / 1000;
}

const DEG = 180 / Math.PI;

/**
 * NRLMSISE-00's input for an ECI position `r` (m) at Julian date `jd` (UT)
 * with the day's indices: geodetic place, day of the year, UT, and the local
 * solar time as the model's authors ask for it, UT + longitude/15.
 */
export function msisInput(r: V3, jd: number, i: Indices, out: MsisInput = { doy: 1, sec: 0, alt: 0, lat: 0, lon: 0, lst: 0, f107a: 0, f107: 0, ap: 0 }): MsisInput {
  const th = gmst(jd);
  const c = Math.cos(th), s = Math.sin(th);
  const x = c * r[0] + s * r[1], y = -s * r[0] + c * r[1];
  const g = geodetic(x, y, r[2]);
  const t = (jd - 2440587.5) * 86400000;
  const day = Math.floor(t / 86400000);
  const sec = (t - day * 86400000) / 1000;
  const lon = Math.atan2(y, x) * DEG;
  out.doy = day - Math.floor(Date.UTC(new Date(t).getUTCFullYear(), 0, 1) / 86400000) + 1;
  out.sec = sec;
  out.alt = g.h / 1000;
  out.lat = g.lat * DEG;
  out.lon = lon;
  out.lst = (((sec / 3600 + lon / 15) % 24) + 24) % 24;
  out.f107a = i.f107a;
  out.f107 = i.f107;
  out.ap = i.ap;
  return out;
}

const scratch: MsisInput = { doy: 1, sec: 0, alt: 0, lat: 0, lon: 0, lst: 0, f107a: 0, f107: 0, ap: 0 };

/** The air's density for drag, kg/m³, at an ECI position `r` (m) at Julian date `jd` (UT), for the day's indices. */
export function airDensity(r: V3, jd: number, i: Indices): number {
  const input = msisInput(r, jd, i, scratch);
  if (input.alt * 1000 > TOP_OF_ATMOSPHERE) return 0;
  return msisDensity(input);
}
