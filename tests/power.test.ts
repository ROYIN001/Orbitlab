/**
 * Power (roadmap D06; Phase 4 map §2.2 B), held to published worked
 * examples and its constants to their sources:
 *
 * - V-P1–V-P3: B.T.C. Zandbergen, *Spacecraft bus design and sizing*
 *   (AE1222-II reader), TU Delft 2020, pp. 120, 133, 134; Eq. [81] p. 125;
 *   Table 42 p. 125 (Britton & Miller, NASA Glenn, 2000):
 *   https://repository.tudelft.nl/file/File_124a068a-158f-4b40-a44f-9ba407a14845
 * - V-P4 (commercial, secondary only): Valispace, *EPS sizing tutorial*:
 *   https://www.valispace.com/wp-content/uploads/2018/12/EPS-sizing-tutorial-1.pdf
 * - Template constants: MIT OCW 16.851 Satellite Engineering (Fall 2003),
 *   Problem Set 4 solution, Table 1 and its MATLAB listing:
 *   https://ocw.mit.edu/courses/16-851-satellite-engineering-fall-2003/81f80cdc5f01208a496a412a52b00a71_ps4_cg_solution.pdf
 * - The solar flux: IAU 2015 Resolution B3 (Prša et al., AJ 152:41, 2016),
 *   https://arxiv.org/abs/1510.07674 ; NASA Earth Fact Sheet,
 *   https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html ; the
 *   2027 perihelion and aphelion from the US Naval Observatory,
 *   https://aa.usno.navy.mil/api/seasons?year=2027
 * - Cycles: Neubauer et al., NASA/TM—2007-215044 (NASA Glenn),
 *   https://ntrs.nasa.gov/api/citations/20080006656/downloads/20080006656.pdf ;
 *   the Landsat WRS-2 nodal period as in tests/kepler.test.ts (USGS
 *   calibration parameter file LT05CPF_19900101_19900331).
 *
 * Each tolerance is written in the comment before its first comparison; a
 * bound changed after seeing a result says so. Published defects are
 * recorded as source defects, not tuned away.
 */
import { describe, expect, it } from 'vitest';
import {
  BATTERY_TO_LOAD_EFFICIENCY, CELL_DEGRADATION_PER_YEAR, DOD_GUIDANCE, FLOWN_BATTERIES, INHERENT_DEGRADATION, JULIAN_YEAR, MOUNT_FACTOR,
  PATH_EFFICIENCY, SOLAR_FLUX_1AU, WORST_SUN_ANGLE, arrayArea, arrayPowerRequired, batteryCapacity, cyclesPerYear, powerCore, solarFlux,
  type ArrayAreaInput,
} from '../src/orbit/power';
import { C_LIGHT } from '../src/orbit/applications';
import { P_SUN } from '../src/physics/propagator/forces';
import { AU } from '../src/physics/propagator/ephemeris';
import { julianDate } from '../src/physics/orbital';
import { DEG } from '../src/physics/constants';

const H = 3600;
const WH = 3600;
const jdUtc = (y: number, mo: number, d: number, h: number, mi: number): number => julianDate(new Date(Date.UTC(y, mo - 1, d, h, mi)));

describe('the solar flux', () => {
  it('is the IAU’s nominal 1361 W/m² at 1 AU, as NASA’s fact sheet gives it', () => {
    // IAU 2015 B3, p. 3: "1 S⊙ = 1361 W m−2" (nominal, exact); NASA Earth Fact Sheet: 1361.0 W/m². Exact.
    expect(SOLAR_FLUX_1AU).toBe(1361);
    expect(powerCore.SOLAR_FLUX_1AU).toBe(1361);
  });

  it('is 0.4 % below the older 1367 W/m² the propagator’s sunlight pressure is written with', () => {
    // P_SUN = 4.56e-6 N/m² (forces.ts) is 1367 W/m² over c; to its three significant figures it holds 1367 ± 1.5
    // W/m². Tolerance fixed before the first run: that 1.5 W/m². Recorded, not changed: P_SUN feeds P07's
    // lifetimes, and the difference is 0.44 %.
    expect(Math.abs(P_SUN * C_LIGHT - 1367)).toBeLessThanOrEqual(1.5);
    expect(P_SUN * C_LIGHT).toBeGreaterThan(SOLAR_FLUX_1AU);
  });

  it('follows the inverse square over the year: perihelion, aphelion and the ±3.4 % swing', () => {
    // At USNO's 2027 perihelion (3 Jan 02:33 UTC) and aphelion (5 Jul 05:06 UTC), against 1361 × (AU/r)² with
    // the fact sheet's mean perihelion 147.095 and aphelion 152.100 million km. Tolerance fixed before the
    // first run: 0.2 % (sunPosition's 0.1 % in distance, squared). The daily extremes of 2027 within 3 days
    // of USNO's dates (the Moon moves the Earth's own perihelion a day or two either way of the smooth
    // orbit's), and their ratio within 0.4 % of (152.100/147.095)², the "±3.4 %" of the map.
    const peri = SOLAR_FLUX_1AU * (AU / 147.095e9) ** 2, aph = SOLAR_FLUX_1AU * (AU / 152.100e9) ** 2;
    const jdPeri = jdUtc(2027, 1, 3, 2, 33), jdAph = jdUtc(2027, 7, 5, 5, 6);
    expect(Math.abs(solarFlux(jdPeri) / peri - 1)).toBeLessThanOrEqual(0.002);
    expect(Math.abs(solarFlux(jdAph) / aph - 1)).toBeLessThanOrEqual(0.002);
    const start = jdUtc(2027, 1, 1, 0, 0);
    let hi = { jd: 0, f: -Infinity }, lo = { jd: 0, f: Infinity };
    for (let d = 0; d < 365; d++) {
      const f = solarFlux(start + d);
      if (f > hi.f) hi = { jd: start + d, f };
      if (f < lo.f) lo = { jd: start + d, f };
    }
    expect(Math.abs(hi.jd - jdPeri)).toBeLessThanOrEqual(3);
    expect(Math.abs(lo.jd - jdAph)).toBeLessThanOrEqual(3);
    expect(Math.abs(hi.f / lo.f / (152.100 / 147.095) ** 2 - 1)).toBeLessThanOrEqual(0.004);
  });
});

describe('the array’s power (V-P1, V-P2, V-P4)', () => {
  it('TU Delft p. 120: 450 W round Mars, 6.7 h orbit with 1.25 h of eclipse, 80 %/60 % → 734.5 W', () => {
    // Tolerance, fixed before the first run (map V-P1): ±0.1 W, the book's last digit. Also its steps: 562.5 W
    // by day and 750 W in eclipse (exact), and 4003.1 Wh an orbit (±0.1 Wh), which the array delivers in
    // the 5.45 h of daylight.
    const i = { dayLoad: 450, eclipseLoad: 450, Td: 5.45 * H, Te: 1.25 * H, Xd: 0.8, Xe: 0.6 };
    const psa = arrayPowerRequired(i);
    expect(Math.abs(psa - 734.5)).toBeLessThanOrEqual(0.1);
    expect(Math.abs((psa * i.Td) / WH - 4003.1)).toBeLessThanOrEqual(0.1);
    expect(arrayPowerRequired({ ...i, eclipseLoad: 0 })).toBeCloseTo(562.5, 12);
    expect(arrayPowerRequired({ ...i, dayLoad: 0, Td: i.Te })).toBeCloseTo(750, 12);
  });

  it('TU Delft p. 134, problem 5: 200 W, 3 h orbit, 58 min eclipse → 408 W', () => {
    // Tolerance, fixed before the first run (map V-P2): ±0.5 W — the book prints the answer to the watt
    // (408); the exact value is 408.5 W.
    const psa = arrayPowerRequired({ dayLoad: 200, eclipseLoad: 200, Td: 3 * H - 58 * 60, Te: 58 * 60, Xd: 0.8, Xe: 0.6 });
    expect(Math.abs(psa - 408)).toBeLessThanOrEqual(0.5);
  });

  it('Valispace: 810 W by day over 5481.5 s, 688.5 W in 982.5 s of eclipse, 0.8/0.6 → 1218.2 W', () => {
    // Tolerance, fixed before the first run (map V-P4): ±0.1 W. A commercial tutorial, used as a secondary
    // check only. SOURCE DEFECT (recorded): §3.2.1 says the eclipse load is 810 W, but every number it
    // computes uses 688.5 W (the check of its battery below shows which).
    const psa = arrayPowerRequired({ dayLoad: 810, eclipseLoad: 688.5, Td: 5481.50255205, Te: 982.523770149, Xd: 0.8, Xe: 0.6 });
    expect(Math.abs(psa - 1218.2)).toBeLessThanOrEqual(0.1);
  });

  it('is MIT 16.851’s psa_det and psa_ppt with SMAD’s efficiencies', () => {
    // The MATLAB listing: psa = ((epn*Te)/Xe + (dpn*Td)/Xd)/Td. An identity; tolerance 1e-12 relative.
    const epn = 310, dpn = 420, Te = 2130, Td = 3790;
    for (const reg of ['DET', 'PPT'] as const) {
      const { Xd, Xe } = PATH_EFFICIENCY[reg];
      const mit = ((epn * Te) / Xe + (dpn * Td) / Xd) / Td;
      expect(Math.abs(arrayPowerRequired({ dayLoad: dpn, eclipseLoad: epn, Td, Te, Xd, Xe }) / mit - 1)).toBeLessThan(1e-12);
    }
  });

  it('refuses a daylight of no length, negative loads or an efficiency outside (0, 1]', () => {
    const ok = { dayLoad: 100, eclipseLoad: 100, Td: 3600, Te: 2000, Xd: 0.8, Xe: 0.6 };
    expect(() => arrayPowerRequired({ ...ok, Td: 0 })).toThrow(RangeError);
    expect(() => arrayPowerRequired({ ...ok, Te: -1 })).toThrow(RangeError);
    expect(() => arrayPowerRequired({ ...ok, dayLoad: -5 })).toThrow(RangeError);
    expect(() => arrayPowerRequired({ ...ok, Xe: 0 })).toThrow(RangeError);
    expect(() => arrayPowerRequired({ ...ok, Xd: 1.2 })).toThrow(RangeError);
    expect(arrayPowerRequired({ ...ok, Te: 0, eclipseLoad: 0 })).toBeCloseTo(125, 12);
  });
});

describe('the array’s area (V-P3, V-P4)', () => {
  const base: ArrayAreaInput = { Psa: 1000, flux: 100, cellEff: 1, Id: 1, sunAngle: 0, degPerYear: 0, years: 0, mount: 'tracking' };

  it('TU Delft p. 133: 1000 W at 100 W/m² → 10, 10.9 and 34.26 m²', () => {
    // Tolerance, fixed before the first run (map V-P3): ±0.01 m². The panels give 100 W/m² facing the Sun,
    // so S·η·I_d = 100 (flux 100, η = I_d = 1, no ageing). A wing turned to the Sun: 10 m². Body-fixed, the
    // Sun up to 23.5° off: 10/cos 23.5° (the book rounds the factor to 1.09 and prints 10.9). A spinner:
    // π × that, 34.26 m² (the book multiplies the unrounded 10.905).
    expect(Math.abs(arrayArea(base).area - 10)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(arrayArea({ ...base, mount: 'body', sunAngle: 23.5 * DEG }).area - 10.9)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(arrayArea({ ...base, mount: 'spinner', sunAngle: 23.5 * DEG }).area - 34.26)).toBeLessThanOrEqual(0.01);
    // two wings share the same 10 m² (5 m² each): the area does not depend on how it is split
    expect(arrayArea({ ...base, Psa: 500 }).area * 2).toBeCloseTo(arrayArea(base).area, 12);
  });

  it('Valispace’s chain: 1368 W/m², 36 % cells, 0.92 %/yr over 5 years → 332.05 W/m² and 3.669 m²', () => {
    // Beyond the map's V-P4 row, tolerances fixed before the first run: L_d to 1e-9 (printed to 12 digits),
    // P_BOL and P_EOL ±0.01 W/m², the area ±0.001 m².
    // SOURCE DEFECT (recorded): §2.1.3 prints the inherent degradation as 0.954838648874 — its lifetime
    // factor L_d — and the worst angle as "1.0 h". Its 347.757983984 W/m² = 492.48 × I_d·cos θ gives
    // I_d·cos θ = 0.706136, which is SMAD's worst-case pair I_d = 0.77 and θ = 23.5° (MIT Table 1): those
    // are used here, an inference from its own numbers, labelled as one.
    const a = arrayArea({ Psa: 1218.18193037, flux: 1368, cellEff: 0.36, Id: 0.77, sunAngle: 23.5 * DEG, degPerYear: 0.0092, years: 5, mount: 'tracking' });
    expect(Math.abs(a.lifeFactor - 0.954838648874)).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(a.pBol - 347.757983984)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(a.pEol - 332.052763562)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(a.area - 3.66863963818)).toBeLessThanOrEqual(0.001);
  });

  it('is MIT 16.851’s powerBeginningLife and powerEndLife', () => {
    // The listing: power_BOL = power_output·Id·cos θ; power_EOL = power_BOL·(1 − d)^life, with power_output
    // 300.74 W/m² for multijunction cells ("22% * 1,367 W/m^2"). An identity; tolerance 1e-12 relative.
    // SOURCE DEFECT (recorded, not used): its size_batteries turns the eclipse from seconds to minutes (/60)
    // and calls P·t "Watt hours" — watt-minutes, 60 times the capacity.
    const theta = WORST_SUN_ANGLE, life = 7;
    const a = arrayArea({ Psa: 900, flux: 1367, cellEff: 0.22, Id: INHERENT_DEGRADATION, sunAngle: theta, degPerYear: CELL_DEGRADATION_PER_YEAR.multijunction, years: life, mount: 'tracking' });
    const bol = 300.74 * 0.77 * Math.cos(theta), eol = bol * (1 - 0.005) ** life;
    expect(Math.abs(a.pBol / bol - 1)).toBeLessThan(1e-12);
    expect(Math.abs(a.pEol / eol - 1)).toBeLessThan(1e-12);
    expect(Math.abs(a.area / (900 / eol) - 1)).toBeLessThan(1e-12);
  });

  it('ages as (1 − d)^years and a spinner needs π times a panel', () => {
    // Identities; tolerance 1e-12 relative.
    const young = arrayArea({ ...base, degPerYear: 0.0375 }), old = arrayArea({ ...base, degPerYear: 0.0375, years: 10 });
    expect(young.lifeFactor).toBe(1);
    expect(Math.abs(old.lifeFactor / 0.9625 ** 10 - 1)).toBeLessThan(1e-12);
    expect(Math.abs(old.area / (young.area / 0.9625 ** 10) - 1)).toBeLessThan(1e-12);
    expect(MOUNT_FACTOR.spinner).toBe(Math.PI);
    expect(arrayArea({ ...base, mount: 'body' }).area).toBe(arrayArea(base).area);
  });

  it('refuses what no array is', () => {
    expect(() => arrayArea({ ...base, flux: 0 })).toThrow(RangeError);
    expect(() => arrayArea({ ...base, cellEff: 0 })).toThrow(RangeError);
    expect(() => arrayArea({ ...base, Id: 1.1 })).toThrow(RangeError);
    expect(() => arrayArea({ ...base, sunAngle: Math.PI / 2 })).toThrow(RangeError);
    expect(() => arrayArea({ ...base, degPerYear: 1 })).toThrow(RangeError);
    expect(() => arrayArea({ ...base, years: -1 })).toThrow(RangeError);
    expect(() => arrayArea({ ...base, Psa: -1 })).toThrow(RangeError);
    expect(() => arrayArea({ ...base, mount: 'kite' as never })).toThrow(RangeError);
    expect(() => arrayArea({ ...base, mount: 'toString' as never })).toThrow(RangeError);
  });
});

describe('the battery (TU Delft Eq. [81], V-P4)', () => {
  it('is P·t/(DoD·η), in joules', () => {
    // Eq. [81], p. 125. An identity; tolerance 1e-12 relative: 100 W for 36 min at 30 % DoD and 90 % is
    // 800 kJ, 222.2 Wh.
    const e = batteryCapacity({ eclipseLoad: 100, Te: 36 * 60, dod: 0.3, eff: 0.9 });
    expect(Math.abs(e / 800e3 - 1)).toBeLessThan(1e-12);
    expect(Math.abs(e / WH / (2000 / 9) - 1)).toBeLessThan(1e-12);
  });

  it('gives Valispace’s eclipse energy from 688.5 W, not the 810 W its text says, and refuses its 1.045 efficiency', () => {
    // Tolerance fixed before the first run: ±0.01 Wh on its printed 187.907671041 Wh (P·t, DoD = η = 1).
    // SOURCE DEFECTS (recorded): (1) the text's 810 W would give 221.07 Wh; (2) it then divides by a "battery
    // efficiency" of 1.045 and a DoD of 35 %, 513.76 Wh — an efficiency above 1, which makes energy.
    // batteryCapacity refuses it; at the 90 % TU Delft gives (p. 125), the same battery would be 596.5 Wh.
    const te = 982.523770149;
    expect(Math.abs(batteryCapacity({ eclipseLoad: 688.5, Te: te, dod: 1, eff: 1 }) / WH - 187.907671041)).toBeLessThanOrEqual(0.01);
    expect(Math.abs((810 * te) / WH - 187.907671041)).toBeGreaterThan(30);
    expect(() => batteryCapacity({ eclipseLoad: 688.5, Te: te, dod: 0.35, eff: 1.045 })).toThrow(RangeError);
    expect(Math.abs(187.907671041 / (0.35 * 1.045) - 513.759866141)).toBeLessThan(1e-6);
  });

  it('refuses a DoD or an efficiency outside (0, 1], or a negative load', () => {
    const ok = { eclipseLoad: 100, Te: 2000, dod: 0.3, eff: 0.9 };
    expect(() => batteryCapacity({ ...ok, dod: 0 })).toThrow(RangeError);
    expect(() => batteryCapacity({ ...ok, dod: 1.5 })).toThrow(RangeError);
    expect(() => batteryCapacity({ ...ok, eff: 0 })).toThrow(RangeError);
    expect(() => batteryCapacity({ ...ok, eclipseLoad: -1 })).toThrow(RangeError);
    expect(batteryCapacity({ ...ok, Te: 0 })).toBe(0);
  });
});

describe('cycles and flown depths of discharge', () => {
  it('a 90-minute orbit is 5 844 cycles a year, "more than 5,000" (NASA/TM—2007-215044)', () => {
    // The TM runs Li-ion cells on "a real-time LEO time scale (55 min for charge, 35 min for discharge)" (p. 4),
    // and says LEO missions "accumulate more than 5,000 cycles per year" (p. 2). Exact: a Julian year over 5400 s.
    expect(Math.abs(cyclesPerYear((55 + 35) * 60) - 5844)).toBeLessThan(1e-9);
    expect(cyclesPerYear((55 + 35) * 60)).toBeGreaterThan(5000);
    expect(JULIAN_YEAR).toBe(31_557_600);
  });

  it('keeps each flown battery within the cycles it was sized for', () => {
    // Table 42's "less than" cycle counts over each life, against one eclipse a revolution. Landsat-7, Terra
    // and Aqua fly the WRS-2 orbit (705 km), nodal period 5933.0472 s (USGS, as in tests/kepler.test.ts); HST
    // flies higher than 280 km, so above 90 min a revolution. A bound: cycles over the life ≤ the table's.
    const WRS2 = 5933.0472, rows = FLOWN_BATTERIES.filter((b) => b.maxCycles !== undefined);
    expect(rows.map((b) => b.spacecraft)).toEqual(['Landsat-7', 'EOS Terra', 'EOS PM-1 Aqua', 'HST']);
    for (const b of rows) {
      const period = b.spacecraft === 'HST' ? 90 * 60 : WRS2;
      expect(cyclesPerYear(period) * b.lifeYears, b.spacecraft).toBeLessThanOrEqual(b.maxCycles!);
    }
  });

  it('holds Table 42 as sourced guidance: low orbits shallow, GEO deep', () => {
    // TU Delft p. 125: "all data are for spacecraft in LEO. In GEO, much higher values (80%) can be attained
    // for DOD as eclipses are much less frequent." (The table's TDRS-H is in fact GEO, 73 %.) Checked: every
    // row carries the source; every LEO DoD at most 30 %, below the GEO one, which is at most 80 %; every
    // NiH₂ LEO row within SMAD's 40 % (MIT Table 1). The NiCd row (POES, 21 % over a 2-year design life) is
    // above SMAD's 10 % NiCd worst case, which is for long lives: noted, not asserted.
    expect(FLOWN_BATTERIES).toHaveLength(6);
    const geo = FLOWN_BATTERIES.filter((b) => b.orbit === 'GEO'), leo = FLOWN_BATTERIES.filter((b) => b.orbit === 'LEO');
    expect(geo.map((b) => [b.spacecraft, b.dod])).toEqual([['TDRS-H', 0.73]]);
    for (const b of FLOWN_BATTERIES) {
      expect(b.source).toMatch(/Britton and T\.B\. Miller.*Table 42.*p\. 125/);
      expect(b.dod).toBeGreaterThan(0);
    }
    for (const b of leo) {
      expect(b.dod, b.spacecraft).toBeLessThanOrEqual(0.3);
      expect(b.dod, b.spacecraft).toBeLessThan(geo[0].dod);
      if (/NiH₂/.test(b.battery)) expect(b.dod, b.spacecraft).toBeLessThanOrEqual(DOD_GUIDANCE.leo.NiH2);
    }
    expect(geo[0].dod).toBeLessThanOrEqual(DOD_GUIDANCE.geo);
    expect(FLOWN_BATTERIES.find((b) => b.spacecraft === 'HST')?.dodAtMost).toBe(true);
  });

  it('refuses a period that is not a positive number', () => {
    expect(() => cyclesPerYear(0)).toThrow(RangeError);
    expect(() => cyclesPerYear(Number.NaN)).toThrow(RangeError);
  });
});

describe('the template defaults, as their sources print them', () => {
  it('are MIT 16.851 PS4 Table 1’s and TU Delft’s values', () => {
    // Transcription: exact.
    expect(PATH_EFFICIENCY).toEqual({ DET: { Xd: 0.85, Xe: 0.65 }, PPT: { Xd: 0.8, Xe: 0.6 } });
    expect(INHERENT_DEGRADATION).toBe(0.77);
    expect(WORST_SUN_ANGLE).toBe(23.5 * DEG);
    expect(CELL_DEGRADATION_PER_YEAR).toEqual({ Si: 0.0375, GaAs: 0.0275, multijunction: 0.005 });
    expect(BATTERY_TO_LOAD_EFFICIENCY).toBe(0.9);
    expect(DOD_GUIDANCE).toEqual({ leo: { NiH2: 0.4, NiCd: 0.1 }, geo: 0.8 });
  });

  it('is the module the satellite model is written against', () => {
    expect(powerCore.arrayArea).toBe(arrayArea);
    expect(powerCore.cyclesPerYear).toBe(cyclesPerYear);
  });
});
