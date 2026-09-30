/**
 * The D06 cores turned round (roadmap D07, docs/ROADMAP-PART2-3.md; Phase 4
 * map §3 item 4): a requirement in, the satellite that meets it out. D06
 * asks "what does this satellite do?"; D07 asks "what satellite does this
 * mission need?", and answers with the same formulas run backwards, so the
 * design it hands to the D06 bench gives back exactly the requirement it
 * was sized for (tests/d07-inverses.test.ts feeds every answer into its D06
 * or O04 function and asks for the requirement to 1e-9):
 *
 * - the camera's focal length for a ground sample distance, f = h·p/GSD
 *   (`groundSampleDistance`, src/orbit/applications.ts), and the aperture
 *   that resolves it, D = 1.22·λ·h/GSD (`diffractionGsd`,
 *   src/orbit/imaging.ts);
 * - the data rate that brings a day's data down in the day's contact,
 *   volume / time (TU Delft reader p. 200: 8 Mbit/s for a 120-minute orbit
 *   is 57.6 Gbit, 96 Mbit/s over a 10-minute pass);
 * - the EIRP that closes the downlink at a margin (`designControlTable`,
 *   src/orbit/link.ts), and the transmitter power that gives it (`eirp`);
 * - the highest rate a link carries at a margin (`maxDataRate`);
 * - the array and the battery (src/orbit/power.ts) for the longest eclipse
 *   of the year, at the β angle nearest zero (src/orbit/eclipse.ts) — for a
 *   sun-synchronous orbit, the one its local time of the node allows.
 *
 * MODEL CHOICES are the D06 cores' own (map risk R7): the Sun is
 * `sunDirectionEci`, the Earth the sphere of radius `R_EARTH`, the eclipse
 * the closed form of a circular orbit (SMAD, as TU Delft reproduces it).
 *
 * THE DESIGN'S OWN FIGURES (the integration of D06 and D07): where an
 * inverse needs the satellite's antenna, the ground receiver or the
 * wavelength its aperture must resolve, it reads them from the design as
 * the D06 bench does (src/design/satellite-link.ts: `designDownlinkAt`,
 * `txPowerForDesign`, `apertureForDesign`), where it used to take them as
 * options — so a design sized here and worked out there gives one number
 * one way (tests/d07-trades.test.ts).
 *
 * DOM-free, SI units and radians inside (the design stores degrees and hours,
 * src/design/satellite-spec.ts). It reads src/orbit only, never the
 * propagator itself (tests/propagator.test.ts).
 */
import { DEG, R_EARTH } from '../physics/constants';
import { betaAngle, circularPeriod, eclipseDuration } from '../orbit/eclipse';
import type { Orbit } from '../orbit/kepler';
import { designControlTable, maxDataRate, slantRange } from '../orbit/link';
import { PATH_EFFICIENCY, SOLAR_FLUX_1AU, WORST_SUN_ANGLE, arrayArea, arrayPowerRequired, batteryCapacity } from '../orbit/power';
import type { ArrayArea, ArrayMount, DesignControlInput, PowerRegulation } from '../orbit/satellite-cores';
import { cameraWavelength, designDownlink } from './satellite-link';
import type { SatelliteDesign } from './satellite-spec';

const DAY = 86400;
const PHI = (Math.sqrt(5) - 1) / 2;

function positive(name: string, x: number): void {
  if (!(Number.isFinite(x) && x > 0)) throw new RangeError(`${name} must be above zero: ${x}`);
}

// ─── the camera ─────────────────────────────────────────────────────────────

/**
 * The focal length that gives ground sample distance `gsd` straight down
 * from altitude `h` with pixel pitch `pitch` (all m), m: h·p/GSD, the
 * inverse of `groundSampleDistance`. THEOS-2's 0.5 m from its 621 km with a
 * 13 µm pitch needs 16.1 m (O04's example camera): folded optics, as every
 * sub-metre imager flies.
 */
export function focalLengthForGsd(h: number, pitch: number, gsd: number): number {
  positive('h', h);
  positive('pitch', pitch);
  positive('gsd', gsd);
  return (h * pitch) / gsd;
}

/**
 * The smallest aperture that resolves `gsd` from `h` at wavelength
 * `wavelength` (all m), m: 1.22·λ·h/GSD, the inverse of `diffractionGsd`
 * (Rayleigh's criterion). A camera with a smaller one is limited by its
 * optics, however fine its pixels (D06: labelled a self-consistency figure,
 * as no free worked example was found).
 */
export function apertureForGsd(h: number, wavelength: number, gsd: number): number {
  positive('h', h);
  positive('wavelength', wavelength);
  positive('gsd', gsd);
  return (1.22 * wavelength * h) / gsd;
}

/** The aperture a design's camera needs for `gsd` from `h`, m: `apertureForGsd` at the camera's own wavelength (`cameraWavelength`). */
export function apertureForDesign(design: Pick<SatelliteDesign, 'payload'>, h: number, gsd: number): number {
  return apertureForGsd(h, cameraWavelength(design.payload), gsd);
}

// ─── the downlink ───────────────────────────────────────────────────────────

/**
 * The data rate that brings `volume` bits down in `contact` s of contact,
 * bit/s: volume / time. TU Delft's reader, p. 200: 8 Mbit/s of images over
 * a 120-minute orbit is 57.6 Gbit (7.2 GB); over a 10-minute pass that is
 * 96 Mbit/s. Infinity with no contact at all.
 */
export function requiredDataRate(volume: number, contact: number): number {
  if (!(Number.isFinite(volume) && volume >= 0)) throw new RangeError(`the volume must be 0 bit or more: ${volume}`);
  if (!(contact >= 0)) throw new RangeError(`the contact must be 0 s or more: ${contact}`);
  return contact === 0 ? (volume === 0 ? 0 : Infinity) : volume / contact;
}

/**
 * The EIRP that closes the downlink `link` with margin `margin` dB, dBW:
 * the design control table's margin grows one decibel for each decibel of
 * EIRP, so it is the table's margin at 0 dBW taken from the margin asked.
 * Fed back into `designControlTable` it gives that margin.
 */
export function requiredEirp(link: Omit<DesignControlInput, 'eirp'>, margin: number): number {
  if (!Number.isFinite(margin)) throw new RangeError(`the margin must be a number of dB: ${margin}`);
  return margin - designControlTable({ ...link, eirp: 0 }).margin;
}

/**
 * The transmitter power that gives EIRP `eirpDbw` (dBW) through a line loss
 * and a pointing loss (dB, positive) and an antenna of gain `gain` (dBi), W:
 * 10^((EIRP + line loss + pointing loss − gain)/10), the inverse of `eirp`
 * (src/orbit/link.ts).
 */
export function txPowerForEirp(eirpDbw: number, lineLoss: number, gain: number, pointingLoss = 0): number {
  if (![eirpDbw, lineLoss, gain, pointingLoss].every(Number.isFinite)) throw new RangeError('the EIRP, the losses and the gain must be numbers of dB');
  return 10 ** ((eirpDbw + lineLoss + pointingLoss - gain) / 10);
}

/** A downlink from a satellite at altitude `altitude` (m) to a station working down to elevation `minEl` (rad), everything but the rate. */
export interface DownlinkAt extends Omit<DesignControlInput, 'range' | 'dataRate'> {
  altitude: number;
  minEl: number;
}

/**
 * The design's downlink from altitude `altitude` (m) down to its station's
 * lowest elevation (`comms.minElDeg`), as `maxRateAtMargin` takes it: the
 * design's transmitter, antenna and pointing, and the receiver it carries,
 * read as the D06 bench reads them (`designDownlink`).
 */
export function designDownlinkAt(design: Pick<SatelliteDesign, 'comms' | 'adcs'>, altitude: number): DownlinkAt {
  const dl = designDownlink(design);
  return {
    eirp: dl.eirp, frequency: dl.frequency, rxGain: dl.rxGain, systemTemperature: dl.systemTemperature, losses: dl.losses,
    requiredEbN0: dl.requiredEbN0, implementationLoss: dl.implementationLoss, altitude, minEl: design.comms.minElDeg * DEG,
  };
}

/** The transmitter power that gives the design EIRP `eirpDbw` (dBW) through its own line, antenna and pointing: `txPowerForEirp`, W. */
export function txPowerForDesign(design: Pick<SatelliteDesign, 'comms' | 'adcs'>, eirpDbw: number): number {
  const dl = designDownlink(design);
  return txPowerForEirp(eirpDbw, dl.lineLoss, dl.txGain, dl.pointingLoss);
}

/**
 * The highest data rate the downlink carries with margin `margin` dB at its
 * worst, the slant range at the lowest elevation the station works at
 * (`slantRange`), bit/s: `maxDataRate` on the table's P_t/N₀ (D07's "maximum
 * data rate at the margin"). Fed back into `designControlTable` it gives
 * that margin.
 */
export function maxRateAtMargin(link: DownlinkAt, margin: number): number {
  const { altitude, minEl, ...rest } = link;
  const range = slantRange(R_EARTH + altitude, minEl);
  const t = designControlTable({ ...rest, range, dataRate: 1 });
  return maxDataRate(t.ptOverN0, link.requiredEbN0, margin, link.implementationLoss);
}

// ─── the array and the battery ──────────────────────────────────────────────

/** β samples a day over the year the worst is looked for in. */
const BETA_SAMPLES_PER_DAY = 4;

/**
 * The β angle nearest zero over the `days` from Julian date `jd0` — the
 * longest eclipse of that time for a circular orbit — and when (D07). β is
 * sampled four times a day as the node drifts (J2) and the Sun moves; where
 * it changes sign between two samples the Sun crosses the orbit plane, and
 * that moment is found by bisection (β = 0 there); otherwise the smallest
 * |β| is refined by golden section to a minute. A sun-synchronous orbit's
 * node keeps pace with the mean Sun, so its β stays away from zero by what
 * its local time allows (a dawn–dusk orbit's never comes near); any other
 * low orbit's crosses zero within weeks.
 */
export function worstBeta(o: Orbit, jd0: number, days = 365.25): { beta: number; jd: number } {
  positive('days', days);
  const n = Math.max(2, Math.ceil(days * BETA_SAMPLES_PER_DAY));
  const at = (jd: number): number => betaAngle(o, jd, true);
  let bestJd = jd0, best = at(jd0);
  let prevJd = jd0, prev = best;
  for (let k = 1; k <= n; k++) {
    const jd = jd0 + (days * k) / n, b = at(jd);
    if (prev === 0 || Math.sign(b) !== Math.sign(prev)) {
      if (prev === 0) return { beta: 0, jd: prevJd };
      // the Sun crosses the plane between the two: bisect to a second
      let lo = prevJd, hi = jd;
      while ((hi - lo) * DAY > 1) {
        const mid = (lo + hi) / 2;
        if (Math.sign(at(mid)) === Math.sign(prev)) lo = mid; else hi = mid;
      }
      const jdz = (lo + hi) / 2;
      return { beta: at(jdz), jd: jdz };
    }
    if (Math.abs(b) < Math.abs(best)) { best = b; bestJd = jd; }
    prevJd = jd; prev = b;
  }
  // golden section on |β| over the samples either side of the smallest
  const step = days / n;
  let a = Math.max(jd0, bestJd - step), b = Math.min(jd0 + days, bestJd + step);
  let x1 = b - PHI * (b - a), x2 = a + PHI * (b - a);
  let f1 = Math.abs(at(x1)), f2 = Math.abs(at(x2));
  while ((b - a) * DAY > 60) {
    if (f1 > f2) { a = x1; x1 = x2; f1 = f2; x2 = a + PHI * (b - a); f2 = Math.abs(at(x2)); }
    else { b = x2; x2 = x1; f2 = f1; x1 = b - PHI * (b - a); f1 = Math.abs(at(x1)); }
  }
  const mid = (a + b) / 2, bm = at(mid);
  return Math.abs(bm) < Math.abs(best) ? { beta: bm, jd: mid } : { beta: best, jd: bestJd };
}

/** What sizes the array and the battery (D06's `SatelliteDesign.power`, in SI). */
export interface PowerSizingInput {
  /** a circular orbit (the closed-form eclipse); its epoch places the node and the Sun */
  orbit: Orbit;
  /** the year looked through, from the orbit's epoch, days (default 365.25) */
  days?: number;
  /** the loads in daylight and through the eclipse, W */
  dayLoad: number;
  eclipseLoad: number;
  regulation: PowerRegulation;
  /** cell efficiency, inherent degradation I_d, output lost a year, all 0–1; the years of life */
  cellEff: number;
  Id: number;
  degPerYear: number;
  years: number;
  mount: ArrayMount;
  /** the worst angle of the Sun off the array, rad (default: 0 for a wing that tracks it, 23.5° for body panels and spinners, `WORST_SUN_ANGLE`) */
  sunAngle?: number;
  /** W/m² (default `SOLAR_FLUX_1AU`, 1361) */
  flux?: number;
  /** the depth of discharge allowed and the battery-to-load efficiency, 0–1 */
  dod: number;
  batteryEff: number;
}

export interface PowerSizing {
  /** the worst β, rad, and when, Julian date */
  beta: number;
  jd: number;
  /** the two-body period, and in it the eclipse and the daylight at that β, s */
  period: number;
  eclipse: number;
  daylight: number;
  /** what the array must give in daylight, W */
  arrayPower: number;
  /** the array (`arrayArea`): per m² at beginning and end of life, and the area, m² */
  array: ArrayArea;
  /** the battery, J and Wh */
  battery: number;
  batteryWh: number;
}

/**
 * The array and the battery for the longest eclipse of the year (D07, map §3
 * item 4): the worst β (`worstBeta`), the closed-form eclipse there
 * (`eclipseDuration`), then D06's `arrayPowerRequired`, `arrayArea` and
 * `batteryCapacity` with the regulation's path efficiencies
 * (`PATH_EFFICIENCY`). Circular orbits only: an ellipse's eclipse depends on
 * where its perigee is, which D06's sampled eclipse follows.
 */
export function powerAtWorstBeta(i: PowerSizingInput): PowerSizing {
  if (!(i.orbit.e < 1e-3)) throw new RangeError(`a circular orbit only (e = ${i.orbit.e}); an ellipse's eclipse is the D06 bench's sampled one`);
  if (!Object.hasOwn(PATH_EFFICIENCY, i.regulation)) throw new RangeError(`not a regulation: ${String(i.regulation)}`);
  const h = i.orbit.a - R_EARTH;
  const { beta, jd } = worstBeta(i.orbit, i.orbit.jd0, i.days ?? 365.25);
  const period = circularPeriod(h);
  const eclipse = eclipseDuration(h, beta);
  const daylight = period - eclipse;
  const { Xd, Xe } = PATH_EFFICIENCY[i.regulation];
  const arrayPower = arrayPowerRequired({ dayLoad: i.dayLoad, eclipseLoad: i.eclipseLoad, Td: daylight, Te: eclipse, Xd, Xe });
  const array = arrayArea({
    Psa: arrayPower, flux: i.flux ?? SOLAR_FLUX_1AU, cellEff: i.cellEff, Id: i.Id,
    sunAngle: i.sunAngle ?? (i.mount === 'tracking' ? 0 : WORST_SUN_ANGLE),
    degPerYear: i.degPerYear, years: i.years, mount: i.mount,
  });
  const battery = batteryCapacity({ eclipseLoad: i.eclipseLoad, Te: eclipse, dod: i.dod, eff: i.batteryEff });
  return { beta, jd, period, eclipse, daylight, arrayPower, array, battery, batteryWh: battery / 3600 };
}
