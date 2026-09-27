/**
 * What an Earth-imaging satellite's instrument can see of a place it passes
 * over (roadmap P2.5, for M02): whether the place falls within the ground
 * the instrument can image on that pass, from its published geometry
 * (src/data/sensors.ts), judged at the pass's highest point — the nearest
 * the place comes to the track, where a camera looks least far off and a
 * radar, which looks square to the track, takes its picture.
 *
 * - **An optical camera** needs daylight. One fixed to look straight down
 *   (Landsat, Sentinel-2) sees a strip of its swath's width under the track:
 *   the place must be within half the swath of it. An agile one (Pléiades,
 *   WorldView, THEOS-2) turns the whole satellite to look up to its largest
 *   off-nadir angle: the place must be within that angle, as seen from the
 *   satellite.
 * - **A radar (SAR)** makes its own light and sees through cloud, by day and
 *   night, but only to the side and within a band of incidence angles (at
 *   the ground, between the vertical and the beam): too steep and the picture
 *   folds on itself, too shallow and too little comes back. Some look to one
 *   side of the track only (Sentinel-1 to the right).
 *
 * That a satellite can image a place is not that it does: that takes its
 * operator's tasking and, for a camera, a clear sky.
 *
 * DOM-free; tests/sensors.test.ts holds it to the swath geometry and to the
 * revisit periods the missions publish.
 */
import { SENSORS, type SensorSpec } from '../data/sensors';
import type { Overflight } from './overflights';

const DEG = Math.PI / 180;
/** The mean Earth radius, m (src/orbit/overflights.ts measures the ground with it). */
const R_MEAN = 6371e3;

export type SensorKind = 'optical' | 'sar';

export interface Sensor {
  name: string;
  norad: readonly number[];
  kind: SensorKind;
  instrument: string;
  /** the standard mode's swath at nadir, m */
  swath: number;
  /** a fixed camera's swath centre, m to the right of the track by day */
  shift: number;
  /** optical: the largest off-nadir angle it looks at, rad; 0 fixed; null agile, no angle published */
  lookMax: number | null;
  /** radar: the incidence angles it images at, rad */
  incidence: readonly [number, number] | null;
  /** radar: the side it looks to, where published */
  side: 'right' | 'left' | 'both' | null;
  /** its finest ground resolution, m */
  resolution: number;
  /** the date the operator ended it, if it has */
  retired: string | null;
  sources: readonly string[];
}

/** A published entry in SI. */
export function sensorOf(s: SensorSpec): Sensor {
  return {
    name: s.name, norad: s.norad, kind: s.kind, instrument: s.instrument,
    swath: s.swathKm * 1e3, shift: (s.shiftKm ?? 0) * 1e3,
    lookMax: s.lookMaxDeg === null ? null : (s.lookMaxDeg ?? 0) * DEG,
    incidence: s.incidenceDeg ? [s.incidenceDeg[0] * DEG, s.incidenceDeg[1] * DEG] : null,
    side: s.side ?? null, resolution: s.resolutionM, retired: s.retired ?? null, sources: s.sources,
  };
}

const BY_NORAD = new Map<number, Sensor>();
for (const spec of SENSORS) { const s = sensorOf(spec); for (const n of s.norad) BY_NORAD.set(n, s); }

/** The instrument of the satellite with this catalogue number, if its figures are published. */
export const sensorFor = (norad: number): Sensor | null => BY_NORAD.get(norad) ?? null;

/**
 * How far along the ground from the point below a satellite at `altitude`
 * (m) it sees when it looks `offNadir` (rad) off straight down, m, on a
 * sphere: the Earth-centre angle is asin((R + h)/R · sin η) − η.
 */
export function groundReach(offNadir: number, altitude: number): number {
  const s = ((R_MEAN + altitude) / R_MEAN) * Math.sin(offNadir);
  return s >= 1 ? NaN : (Math.asin(s) - offNadir) * R_MEAN;
}

export type ImagingVerdict =
  | { can: true; reason: 'swath' | 'agile' | 'sar' }
  | { can: false; reason: 'retired' | 'dark' | 'outsideSwath' | 'tooFarOff' | 'incidence' | 'wrongSide' }
  | { can: null; reason: 'noLimit' };

/** Whether the instrument can image the place on this overflight, and why (not); `can` null where it cannot be judged. */
export function canImage(s: Sensor, f: Overflight): ImagingVerdict {
  if (s.retired) return { can: false, reason: 'retired' };
  if (s.kind === 'optical') {
    if (!f.daylight) return { can: false, reason: 'dark' };
    if (s.lookMax === null) return { can: null, reason: 'noLimit' };
    if (s.lookMax === 0) {
      // the place's distance across the track, positive to the right
      const across = f.side === 'right' ? f.groundRange : -f.groundRange;
      return Math.abs(across - s.shift) <= s.swath / 2 ? { can: true, reason: 'swath' } : { can: false, reason: 'outsideSwath' };
    }
    return f.offNadir <= s.lookMax ? { can: true, reason: 'agile' } : { can: false, reason: 'tooFarOff' };
  }
  if (s.side === 'right' || s.side === 'left') { if (f.side !== s.side) return { can: false, reason: 'wrongSide' }; }
  const [lo, hi] = s.incidence ?? [0, Math.PI / 2];
  return f.incidence >= lo && f.incidence <= hi ? { can: true, reason: 'sar' } : { can: false, reason: 'incidence' };
}
