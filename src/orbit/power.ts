/**
 * Power (roadmap D06, docs/ROADMAP-PART2-3.md; Phase 4 map §2.2 B): the
 * solar array and the battery a satellite needs, as SMAD sizes them — the
 * method TU Delft's reader (Zandbergen, *Spacecraft bus design and
 * sizing*, 2020, ch. 6) and MIT OCW 16.851 teach.
 *
 * 1. What the array must make in daylight, `arrayPowerRequired`: the loads
 *    by day through the regulator (efficiency X_d), plus the energy the
 *    loads draw through the eclipse, stored and given back through the
 *    battery (X_e), all delivered in the daylight part of the orbit.
 * 2. How big that array is, `arrayArea`: the flux, the cells' efficiency,
 *    the inherent losses of an assembled panel (I_d), the worst angle the
 *    Sun makes with it, and the output lost each year (L_d = (1 − d)^years),
 *    so it still makes enough at the end of life; a spinner's cells, round
 *    a cylinder, need π times the area of a panel facing the Sun.
 * 3. The battery, `batteryCapacity`: the eclipse's energy over the depth
 *    of discharge allowed and the battery-to-load efficiency (TU Delft
 *    Eq. [81]). How deep a battery may be discharged depends on how many
 *    times it will be (`cyclesPerYear`): flown values are in
 *    `FLOWN_BATTERIES`.
 *
 * The eclipse and the daylight per orbit come from src/orbit/eclipse.ts.
 * tests/power.test.ts holds each function to the published worked examples
 * (V-P1–V-P4) and the constants to their sources.
 *
 * TEMPLATE DEFAULTS. The efficiencies, degradations and depths of
 * discharge below are typical textbook figures, each with its source; a
 * design that uses one is using a textbook default, not its own hardware's
 * figure, and the satellite builder says so.
 *
 * DOM-free, SI units inside: W, W/m², m², s, J (1 Wh = 3600 J), rad.
 */
import { DEG } from '../physics/constants';
import { AU, sunPosition } from '../physics/propagator/ephemeris';
import type {
  ArrayArea, ArrayAreaInput, ArrayMount, ArrayPowerInput, BatteryInput, FlownDepthOfDischarge, PowerCore, PowerRegulation,
} from './satellite-cores';

export type {
  ArrayArea, ArrayAreaInput, ArrayMount, ArrayPowerInput, BatteryInput, FlownDepthOfDischarge, PowerRegulation,
} from './satellite-cores';

// ─── sunlight ───────────────────────────────────────────────────────────────

/**
 * The solar flux at 1 AU, W/m²: 1361, the IAU's nominal total solar
 * irradiance (IAU 2015 Resolution B3; Prša et al., AJ 152:41, 2016,
 * arXiv:1510.07674, p. 3 — the solar-cycle-23 mean TSI, 1361 ± 1 W/m²),
 * as NASA's Earth fact sheet gives it (1361.0 W/m²).
 *
 * Textbooks of the 1990s and 2000s use 1367 or 1368 W/m² (SMAD 3rd ed.;
 * TU Delft; MIT 16.851; Valispace's tutorial), the value before the
 * TIM/SORCE measurements, 0.4 % higher; worked examples are checked with
 * their own figure. The propagator's sunlight pressure `P_SUN` = 4.56e-6
 * N/m² (src/physics/propagator/forces.ts) is that older 1367 W/m² over c,
 * left as it is so no lifetime changes (a 0.4 % difference in a force the
 * mean method leaves out).
 */
export const SOLAR_FLUX_1AU = 1361;

/**
 * The solar flux at the Earth on Julian date `jd`, W/m²: `SOLAR_FLUX_1AU`
 * × (1 AU / r)², r the Sun's distance from `sunPosition` (Montenbruck &
 * Gill's series, 0.1 % in distance; the inverse square is TU Delft's
 * Eq. [79], p. 124). The Earth's eccentric orbit swings it
 * by ±3.4 % over a year: about 1408 W/m² at perihelion in early January,
 * 1317 W/m² at aphelion in early July.
 */
export function solarFlux(jd: number): number {
  const s = sunPosition(jd);
  const r = Math.hypot(s[0], s[1], s[2]);
  return SOLAR_FLUX_1AU * (AU / r) ** 2;
}

// ─── template defaults (sourced) ────────────────────────────────────────────

/**
 * SMAD's path efficiencies from the array to the loads, by day (X_d) and
 * through the battery in eclipse (X_e), for the two ways of regulating an
 * array: direct energy transfer (DET) and peak-power tracking (PPT). As
 * tabulated in MIT OCW 16.851 Satellite Engineering (2003), Problem Set 4
 * solution, Table 1:
 * https://ocw.mit.edu/courses/16-851-satellite-engineering-fall-2003/81f80cdc5f01208a496a412a52b00a71_ps4_cg_solution.pdf
 * TU Delft's reader (p. 120) takes 80 % and 60 % "for first design
 * purposes". Template defaults.
 */
export const PATH_EFFICIENCY: Readonly<Record<PowerRegulation, { readonly Xd: number; readonly Xe: number }>> = {
  DET: { Xd: 0.85, Xe: 0.65 },
  PPT: { Xd: 0.8, Xe: 0.6 },
};

/** The inherent degradation I_d of an assembled array (design, shadowing, temperature): 0.77, SMAD's worst case (MIT 16.851 PS4, Table 1). A template default. */
export const INHERENT_DEGRADATION = 0.77;

/**
 * The worst angle between the Sun and a body-fixed array's normal over a
 * year, rad: 23.5°, the Sun's declination at the solstices (MIT 16.851 PS4,
 * Table 1; TU Delft p. 133). A template default for body-mounted panels
 * and spinners.
 */
export const WORST_SUN_ANGLE = 23.5 * DEG;

/** Solar cell technologies with a sourced degradation. */
export type CellType = 'Si' | 'GaAs' | 'multijunction';

/**
 * The output a cell type loses each year, 0–1: silicon 3.75 %, gallium
 * arsenide 2.75 %, multijunction 0.5 %, worst case (MIT 16.851 PS4, Table
 * 1). TU Delft (p. 124) gives, for GEO, silicon 4 % and gallium arsenide
 * 1–1.5 % a year. Template defaults.
 */
export const CELL_DEGRADATION_PER_YEAR: Readonly<Record<CellType, number>> = {
  Si: 0.0375,
  GaAs: 0.0275,
  multijunction: 0.005,
};

/** The battery-to-load efficiency η_BAT: 0.9 (MIT 16.851 PS4, Table 1; TU Delft p. 125, "usually … in the range 90%"). A template default. */
export const BATTERY_TO_LOAD_EFFICIENCY = 0.9;

/**
 * Depth-of-discharge limits, 0–1, as sourced guidance: in low orbit SMAD's
 * worst case, nickel–hydrogen 40 % and nickel–cadmium 10 % (MIT 16.851
 * PS4, Table 1); in GEO, with only about 90 eclipses a year, "much higher
 * values (80%)" (TU Delft p. 125). Flown values: `FLOWN_BATTERIES`.
 */
export const DOD_GUIDANCE = {
  leo: { NiH2: 0.4, NiCd: 0.1 },
  geo: 0.8,
} as const;

/** How much more cell area a mount needs than a panel facing the Sun, on top of cos θ (TU Delft p. 133): a spinner's cells go round a cylinder, and only its projection, 1/π of them, faces the Sun. */
export const MOUNT_FACTOR: Readonly<Record<ArrayMount, number>> = {
  tracking: 1,
  body: 1,
  spinner: Math.PI,
};

/** A Julian year, s: what `cyclesPerYear` counts over. */
export const JULIAN_YEAR = 365.25 * 86400;

// ─── the array ──────────────────────────────────────────────────────────────

const inUnit = (x: number): boolean => x > 0 && x <= 1;
const nonNegative = (x: number): boolean => x >= 0 && Number.isFinite(x);

/**
 * The power the array must give in daylight, W (TU Delft p. 120; SMAD):
 *
 *   P_sa = (P_e·T_e/X_e + P_d·T_d/X_d) / T_d
 *
 * The eclipse's loads reach the loads through the battery (X_e), the day's
 * directly (X_d), and both are made while the Sun shines, T_d a
 * revolution. Throws a `RangeError` for a daylight of no length, a
 * negative load or time, or an efficiency outside (0, 1].
 */
export function arrayPowerRequired(i: ArrayPowerInput): number {
  if (!(i.Td > 0) || !Number.isFinite(i.Td)) throw new RangeError(`Td must be more than 0 s (got ${i.Td})`);
  if (!nonNegative(i.Te)) throw new RangeError(`Te must be 0 s or more (got ${i.Te})`);
  if (!nonNegative(i.dayLoad) || !nonNegative(i.eclipseLoad)) throw new RangeError(`the loads must be 0 W or more (got ${i.dayLoad}, ${i.eclipseLoad})`);
  if (!inUnit(i.Xd) || !inUnit(i.Xe)) throw new RangeError(`Xd and Xe must be in (0, 1] (got ${i.Xd}, ${i.Xe})`);
  return ((i.eclipseLoad * i.Te) / i.Xe + (i.dayLoad * i.Td) / i.Xd) / i.Td;
}

/**
 * The array that gives `Psa` at the end of life (TU Delft pp. 123–124,
 * Eqs. [74], [77], [78], and p. 133; MIT 16.851 PS4):
 *
 *   P_BOL = S·η·I_d·cos θ       W/m² facing the Sun at the worst angle θ
 *   L_d   = (1 − d)^years       the output left after the years
 *   P_EOL = P_BOL·L_d
 *   A     = (P_sa / P_EOL) × the mount's factor (π for a spinner)
 *
 * `pBol` and `pEol` are per square metre of array facing the Sun; `area`
 * is the cells to fit. A tracking wing that turns to the Sun has θ = 0 (a
 * wing turning about one axis still sees β or the season's angle: the
 * caller gives θ). Throws a `RangeError` for a flux or power below zero, an
 * efficiency or I_d outside (0, 1], θ outside [0°, 90°), a degradation
 * outside [0, 1) or negative years.
 */
export function arrayArea(i: ArrayAreaInput): ArrayArea {
  if (!nonNegative(i.Psa)) throw new RangeError(`Psa must be 0 W or more (got ${i.Psa})`);
  if (!(i.flux > 0) || !Number.isFinite(i.flux)) throw new RangeError(`the flux must be more than 0 W/m² (got ${i.flux})`);
  if (!inUnit(i.cellEff) || !inUnit(i.Id)) throw new RangeError(`cellEff and Id must be in (0, 1] (got ${i.cellEff}, ${i.Id})`);
  if (!(i.sunAngle >= 0 && i.sunAngle < Math.PI / 2)) throw new RangeError(`sunAngle must be in [0, π/2) rad (got ${i.sunAngle})`);
  if (!(i.degPerYear >= 0 && i.degPerYear < 1)) throw new RangeError(`degPerYear must be in [0, 1) (got ${i.degPerYear})`);
  if (!nonNegative(i.years)) throw new RangeError(`years must be 0 or more (got ${i.years})`);
  const factor = MOUNT_FACTOR[i.mount];
  if (factor === undefined) throw new RangeError(`not a mount: ${String(i.mount)}`);
  const pBol = i.flux * i.cellEff * i.Id * Math.cos(i.sunAngle);
  const lifeFactor = (1 - i.degPerYear) ** i.years;
  const pEol = pBol * lifeFactor;
  return { pBol, pEol, lifeFactor, area: (i.Psa / pEol) * factor };
}

// ─── the battery ────────────────────────────────────────────────────────────

/**
 * The battery's capacity, J (TU Delft Eq. [81], p. 125):
 *
 *   E_BAT = P·t / (DoD·η_BAT)
 *
 * the eclipse's load over the eclipse, over the share of the battery that
 * may be used each cycle and the battery-to-load efficiency. In joules, SI;
 * batteries are rated in Wh (÷ 3600), as the design stores them. Throws a
 * `RangeError` for a negative load or time, or a DoD or efficiency outside
 * (0, 1] — an efficiency above 1 would make energy (Valispace's tutorial
 * divides by 1.045, a defect tests/power.test.ts records).
 */
export function batteryCapacity(i: BatteryInput): number {
  if (!nonNegative(i.eclipseLoad) || !nonNegative(i.Te)) throw new RangeError(`the load and the eclipse must be 0 or more (got ${i.eclipseLoad} W, ${i.Te} s)`);
  if (!inUnit(i.dod)) throw new RangeError(`dod must be in (0, 1] (got ${i.dod})`);
  if (!inUnit(i.eff)) throw new RangeError(`eff must be in (0, 1] (got ${i.eff})`);
  return (i.eclipseLoad * i.Te) / (i.dod * i.eff);
}

/**
 * Charge–discharge cycles a year for an orbit of `period` s, one eclipse a
 * revolution: a Julian year over the period — 5 844 at 90 minutes, "more
 * than 5,000 cycles per year" in low orbit (NASA/TM—2007-215044, p. 2).
 * An upper bound: a dawn–dusk sun-synchronous orbit has eclipse-free
 * months, and GEO has eclipses only in two seasons of about 45 days, some
 * 90 a year, not 365 (`worstEclipse` and `sampledEclipse` show which).
 */
export function cyclesPerYear(period: number): number {
  if (!(period > 0) || !Number.isFinite(period)) throw new RangeError(`the period must be more than 0 s (got ${period})`);
  return JULIAN_YEAR / period;
}

// ─── flown batteries (sourced guidance) ─────────────────────────────────────

/** A flown battery's depth of discharge, with the life and cycles it was sized for. */
export interface FlownBattery extends FlownDepthOfDischarge {
  /** as the table gives it */
  launched: string;
  /** years the battery was sized for */
  lifeYears: number;
  /** the table's "less than" cycles over that life, where it gives one */
  maxCycles?: number;
  /** °C, the range the table gives */
  temperatureC: readonly [number, number];
  /** the DoD is an upper bound ("< 10 %") */
  dodAtMost?: true;
  note?: string;
}

const BRITTON =
  'D.L. Britton and T.B. Miller, Battery Fundamentals and Operations, NASA Glenn Research Center, April 2000; '
  + 'as Table 42 in B.T.C. Zandbergen, Spacecraft bus design and sizing, TU Delft 2020, p. 125';

/**
 * Depths of discharge that flew, as sourced guidance for choosing one
 * (map §2.2 B): Britton & Miller's sample battery configurations, as
 * reproduced in TU Delft's reader, Table 42. All nickel batteries of
 * 1999–2003; low orbits kept 10–30 %, a GEO battery with 90 cycles a year
 * 73 %. Launch dates are the table's (written in 2000, so Aqua's and
 * HST's are plans).
 */
export const FLOWN_BATTERIES: readonly FlownBattery[] = [
  { spacecraft: 'Landsat-7', launched: 'April 1999', battery: '2 × 50 Ah NiH₂, 17 cells each', orbit: 'LEO', lifeYears: 5, maxCycles: 30000, dod: 0.17, temperatureC: [0, 10], source: BRITTON },
  { spacecraft: 'EOS Terra', launched: 'December 1999', battery: '2 × 50 Ah NiH₂, 54 cells each', orbit: 'LEO', lifeYears: 5, maxCycles: 30000, dod: 0.3, temperatureC: [-5, 10], source: BRITTON },
  {
    spacecraft: 'TDRS-H', launched: 'June 2000', battery: '1 × 110 Ah NiH₂, three 8-cell packs and one 5-cell pack', orbit: 'GEO', lifeYears: 15, dod: 0.73,
    temperatureC: [5, 5], note: 'assuming 3 failed cells', source: BRITTON,
  },
  { spacecraft: 'EOS PM-1 Aqua', launched: 'May 2002', battery: '1 × 160 Ah NiH₂, 24 cells', orbit: 'LEO', lifeYears: 6, maxCycles: 35000, dod: 0.3, temperatureC: [0, 10], source: BRITTON },
  {
    spacecraft: 'POES L, M', launched: 'September 2000, June 2002', battery: '3 × 40 Ah NiCd, 17 cells each', orbit: 'LEO', lifeYears: 2, dod: 0.21,
    temperatureC: [5, 5], note: 'LEO/polar; 2 years design, 3 years goal; the table prints "DOD 0 21%"', source: BRITTON,
  },
  {
    spacecraft: 'HST', launched: '2003 battery change-out, Servicing Mission 4', battery: '6 × 80 Ah NiH₂, 22 cells each', orbit: 'LEO', lifeYears: 5, maxCycles: 32000,
    dod: 0.1, dodAtMost: true, temperatureC: [-5, 5], source: BRITTON,
  },
];

/** The module against its contract (src/orbit/satellite-cores.ts). */
export const powerCore = {
  SOLAR_FLUX_1AU, solarFlux, arrayPowerRequired, arrayArea, batteryCapacity, cyclesPerYear,
} satisfies PowerCore;
