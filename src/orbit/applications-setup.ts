/**
 * The Orbit section's applications (roadmap O04), apart from their drawing:
 * the settings the user chooses — which application, the ground station,
 * the downlink, the camera — and the reports they make on the orbit in the
 * playground; and a Thai satellite's catalogue orbit as a playground orbit.
 *
 * The ground station is typed in or picked from a few cities; it is never
 * sent anywhere and never asked of the browser (no geolocation).
 *
 * DOM-free: src/ui/orbit/applications-panel.ts draws it,
 * tests/applications.test.ts holds it.
 */
import { DEG } from '../physics/constants';
import { wrap2pi } from '../physics/orbital';
import {
  GEO_RADIUS, coverageFraction, dailyTrackSpacing, eciToEcef, footprintAngle, groundSampleDistance, linkBudget, lookAngles,
  repeatGridSpacing, sideReach, signalDelay, swathWidth, type GroundStation, type LinkBudget, type LookAngles,
} from './applications';
import { apsidesToAE, orbitFacts, raanForLocalTime, stateAt, type Orbit, type OrbitState } from './kepler';
import type { ThaiSatellite } from '../data/thai-satellites';

export type AppKind = 'comms' | 'eo' | 'thai';
export const APP_KINDS: readonly AppKind[] = ['comms', 'eo', 'thai'];

/** Places to stand, public coordinates, deg: Thailand's regions and where the program is written. */
export const STATIONS: readonly { id: string; lat: number; lon: number }[] = [
  { id: 'bangkok', lat: 13.7563, lon: 100.5018 },
  { id: 'chiangMai', lat: 18.7883, lon: 98.9853 },
  { id: 'hatYai', lat: 7.0086, lon: 100.4747 },
  { id: 'ubon', lat: 15.2448, lon: 104.8473 },
  { id: 'stPetersburg', lat: 59.9386, lon: 30.3141 },
  { id: 'moscow', lat: 55.7558, lon: 37.6173 },
];

export interface AppSettings {
  kind: AppKind;
  /** a preset's id, or 'custom' for typed coordinates */
  stationId: string;
  station: GroundStation;
  /** comms: the lowest elevation a dish works at, for the footprint, rad */
  minElevation: number;
  /** comms, Engineer: the downlink (SI; the page shows GHz, dBW, m, %, K, dB, Mbit/s) */
  link: { frequency: number; eirp: number; diameter: number; efficiency: number; noiseTemperature: number; losses: number; dataRate: number };
  /** eo: the camera — its swath, m, ground sample distance, m, and how far the satellite tilts, rad */
  camera: { swath: number; gsd: number; tilt: number };
  /** Engineer: the camera from its optics instead — focal length and pixel pitch, m, and pixels across */
  optics: { focalLength: number; pixelPitch: number; pixels: number } | null;
  /** thai: the satellite whose orbit is in the playground, if one is */
  thaiId: string | null;
}

/**
 * Starting settings: Bangkok; a dish working down to 10° elevation; a
 * Ku-band downlink of the direct-to-home kind (example values, not any one
 * satellite's); THEOS-2's camera as published (0.5 m, 10.3 km, tilting to 45°).
 */
export function defaultApps(kind: AppKind): AppSettings {
  const b = STATIONS[0];
  return {
    kind, stationId: b.id, station: { lat: b.lat * DEG, lon: b.lon * DEG, h: 0 },
    minElevation: 10 * DEG,
    link: { frequency: 12e9, eirp: 52, diameter: 0.75, efficiency: 0.65, noiseTemperature: 150, losses: 3, dataRate: 30e6 },
    camera: { swath: 10.3e3, gsd: 0.5, tilt: 45 * DEG },
    optics: null,
    thaiId: null,
  };
}

export const stationOf = (id: string): GroundStation | null => {
  const s = STATIONS.find((x) => x.id === id);
  return s ? { lat: s.lat * DEG, lon: s.lon * DEG, h: 0 } : null;
};

export interface CommsReport {
  look: LookAngles;
  visible: boolean;
  /** s: up and down to a station like this one, and a question with its answer */
  hop: number;
  roundTrip: number;
  /** the same for a satellite 550 km straight up (a Starlink shell), s */
  leoHop: number;
  /** the footprint above the minimum elevation: its Earth central angle, rad, and share of the surface */
  footprint: number;
  share: number;
  link: LinkBudget;
}

/** The ground station and the satellite at state `s` (the Earth turned by its sidereal angle). */
export function commsReport(a: AppSettings, s: OrbitState): CommsReport {
  const look = lookAngles(a.station, eciToEcef(s.r, s.theta));
  const r = Math.hypot(s.r.x, s.r.y, s.r.z);
  const footprint = Math.max(0, footprintAngle(r, a.minElevation));
  return {
    look, visible: look.elevation > 0,
    hop: signalDelay(look.range, look.range), roundTrip: signalDelay(look.range, look.range, look.range, look.range),
    leoHop: signalDelay(550e3, 550e3),
    footprint, share: coverageFraction(footprint),
    link: linkBudget({ ...a.link, range: look.range }),
  };
}

export interface EoReport {
  swath: number;
  gsd: number;
  /** pixels across the swath */
  pixels: number;
  /** m between the day's tracks at the station's latitude, and the share of it a straight-down strip covers */
  spacing: number;
  nadirShare: number;
  /** m to either side the satellite can look by tilting, and whether that closes the gap between the day's tracks */
  reach: number | null;
  closesGap: boolean;
  /** the local time at the descending node, hours (the ascending node's ± 12) */
  ltdn: number;
  /** the equator's repeat grid, m, when the cycle is known (a Thai satellite's published one) */
  repeatSpacing: number | null;
}

/** The camera on the orbit flown now. */
export function eoReport(a: AppSettings, o: Orbit, s: OrbitState, j2: boolean, repeatRevs: number | null, ltan: number): EoReport {
  const h = Math.max(1, s.alt);
  let swath = a.camera.swath, gsd = a.camera.gsd, pixels = swath / gsd;
  if (a.optics) {
    gsd = groundSampleDistance(h, a.optics.pixelPitch, a.optics.focalLength);
    pixels = a.optics.pixels;
    swath = swathWidth(h, 2 * Math.atan((pixels * a.optics.pixelPitch) / (2 * a.optics.focalLength))) ?? pixels * gsd;
  }
  const spacing = dailyTrackSpacing(orbitFacts(o, j2).revsPerDay, a.station.lat);
  const reach = sideReach(h, a.camera.tilt);
  return {
    swath, gsd, pixels, spacing, nadirShare: Math.min(1, swath / spacing),
    reach, closesGap: reach !== null && 2 * reach + swath >= spacing,
    ltdn: (ltan + 12) % 24,
    repeatSpacing: repeatRevs ? repeatGridSpacing(repeatRevs) : null,
  };
}

/**
 * A Thai satellite's catalogue orbit as a playground orbit at `jd0`: a
 * geostationary one over its slot; a low one at its perigee and apogee and
 * inclination, turned to its published local time at the descending node
 * when there is one. A nominal orbit — the catalogue's shape, not where the
 * satellite is today.
 */
export function thaiOrbit(sat: ThaiSatellite, jd0: number): Orbit {
  const o = sat.orbit;
  if (o.kind === 'geo') {
    const base: Orbit = { a: GEO_RADIUS, e: 0, i: 0, raan: 0, argp: 0, m0: 0, jd0 };
    // turned about the pole until the point below is the slot
    const lon = stateAt(base, 0, false).lon;
    return { ...base, raan: wrap2pi(o.longitude * DEG - lon) };
  }
  const { a, e } = apsidesToAE(o.perigee * 1e3, o.apogee * 1e3);
  const raan = sat.ltdn ? raanForLocalTime(((sat.ltdn[0] + sat.ltdn[1]) / 2 + 12) % 24, jd0) : 0;
  return { a, e, i: o.inclination * DEG, raan, argp: 0, m0: 0, jd0 };
}
