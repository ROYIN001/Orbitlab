/**
 * D06's radio link (roadmap D06, docs/ROADMAP-PART2-3.md; Phase 4 map §2.2 E),
 * src/orbit/link.ts, held to published design control tables and to the
 * analytic forms it is built from:
 *
 * - V-L1: JPL DESCANSO 18 (MarCO), Table 5-4, every line of its four columns;
 * - V-L2: Palo et al. 2014, Table 1, a LEO X-band CubeSat link, whose
 *   published defects are recorded here, not tuned away;
 * - V-L3: ITU-R P.525-5's free-space loss;
 * - the slant range against SMAD's "range to horizon" column (TU Delft
 *   reader, App. H) and against `lookAngles` (O04);
 * - `designControlTable` against O04's `linkBudget`, and `maxDataRate` as its
 *   inverse.
 *
 * Each tolerance is written in the comment above its comparisons, before the
 * first run.
 */
import { describe, expect, it } from 'vitest';
import { DEG, R_EARTH } from '../src/physics/constants';
import { BOLTZMANN_DB, dishGain, freeSpaceLoss, linkBudget, lookAngles } from '../src/orbit/applications';
import {
  LINK_MARGIN_THRESHOLD, REQUIRED_EBN0, designControlTable, eirp, linkCore, maxDataRate, maxPassDuration, slantRange,
} from '../src/orbit/link';

const dB = (x: number) => 10 * Math.log10(x);
/** dBm to watts */
const wattsOfDbm = (dbm: number) => 10 ** ((dbm - 30) / 10);
const ebN0Of = (id: string) => REQUIRED_EBN0.find((r) => r.id === id)!;

/**
 * V-L1. Kobayashi, Shihabi & Taylor, *Mars Cube One Telecommunications
 * Subsystem Design*, JPL DESCANSO Design and Performance Summary Series 18
 * (2021), Table 5-4 "X-band downlink link budget", doc pp. 58–59:
 * https://descanso.jpl.nasa.gov/DPSummary/DESCANSO18_MarCO.pdf
 *
 * The four columns as printed (losses printed negative there, positive
 * here). Inputs: lines 4, 5, 7–10, 12, 14, 16–19, 21, 33, 35, 36. Results
 * the model must reproduce: 11 (EIRP), 13 (free-space loss), 20 (received),
 * 25 (N₀), 26 (P_t/N₀), 34 (data rate in dB), 37 (required P_t/N₀),
 * 38 (margin) and 40 (margin over the 3 dB threshold, line 39). The range is
 * the km figure of line 12; line 3 gives the same in AU.
 *
 * Tolerance, the map's, fixed before the first run: **±0.1 dB on every
 * line.** The table prints most lines to 0.1 dB and its inputs are rounded
 * too, so a line computed from them may differ from the printed one by up to
 * about a unit in its last digit.
 */
const MARCO = [
  { name: 'LGA to 34 m', rate: 62.5, circuit: 0.7, gain: 7.6, pointing: 13.4, rangeKm: 15e6, pol: 1.4, dsnGain: 68.3, tsys: 30.5, modLoss: 1.63,
    eirp: 30.1, fsl: 254.4, received: -157.8, n0: -183.8, ptN0: 26.0, rateDb: 18.0, required: 20.12, margin: 5.8, over: 2.8 },
  { name: 'MGA to 34 m', rate: 62.5, circuit: 0.9, gain: 8.4, pointing: 0.8, rangeKm: 74.8e6, pol: 0.31, dsnGain: 68.3, tsys: 30.5, modLoss: 1.63,
    eirp: 43.3, fsl: 268.4, received: -157.5, n0: -183.8, ptN0: 26.3, rateDb: 18.0, required: 20.12, margin: 6.1, over: 3.1 },
  { name: 'HGA to 34 m', rate: 1000, circuit: 1.3, gain: 29.2, pointing: 2.8, rangeKm: 160e6, pol: 0.11, dsnGain: 68.3, tsys: 30.5, modLoss: 0.44,
    eirp: 61.7, fsl: 275.0, received: -145.5, n0: -183.8, ptN0: 38.2, rateDb: 30.0, required: 30.97, margin: 7.3, over: 4.3 },
  { name: 'HGA to 70 m', rate: 8000, circuit: 1.3, gain: 29.2, pointing: 2.8, rangeKm: 160e6, pol: 0.11, dsnGain: 74.3, tsys: 24.8, modLoss: 0.23,
    eirp: 61.7, fsl: 275.0, received: -139.5, n0: -184.7, ptN0: 45.2, rateDb: 39.0, required: 39.79, margin: 5.4, over: 2.4 },
] as const;
const MARCO_COMMON = { frequency: 8414e6, rfPowerDbm: 36.6, atmosphere: 0.15, dsnPointing: 0.1, wind: 0.1, implementation: 0.63, threshold: -0.1, marginThreshold: 3.0 };

describe('V-L1: MarCO\'s X-band downlink, JPL DESCANSO 18 Table 5-4 (D06)', () => {
  const TOL = 0.1; // dB, every line (see above)
  for (const c of MARCO) {
    it(`closes every line of the ${c.name} column within 0.1 dB`, () => {
      const m = MARCO_COMMON;
      const turbo = ebN0Of('turbo-1/6');
      expect(turbo.ebN0).toBe(m.threshold);
      const e = eirp(wattsOfDbm(m.rfPowerDbm), c.circuit, c.gain, c.pointing);
      const t = designControlTable({
        eirp: e, frequency: m.frequency, range: c.rangeKm * 1e3, rxGain: c.dsnGain, systemTemperature: c.tsys,
        losses: m.atmosphere + c.pol + m.dsnPointing + m.wind, dataRate: c.rate, requiredEbN0: turbo.ebN0,
        implementationLoss: c.modLoss + m.implementation,
      });
      // line 11, and the rest in dBm where the table is
      expect(Math.abs(e + 30 - c.eirp)).toBeLessThan(TOL);
      expect(Math.abs(t.pathLoss - c.fsl)).toBeLessThan(TOL);
      expect(Math.abs(t.received + 30 - c.received)).toBeLessThan(TOL);
      expect(Math.abs(t.n0 + 30 - c.n0)).toBeLessThan(TOL);
      expect(Math.abs(t.ptOverN0 - c.ptN0)).toBeLessThan(TOL);
      expect(Math.abs(dB(c.rate) - c.rateDb)).toBeLessThan(TOL);
      expect(Math.abs(t.requiredPtOverN0 - c.required)).toBeLessThan(TOL);
      expect(Math.abs(t.margin - c.margin)).toBeLessThan(TOL);
      // line 40 = line 38 − line 39; as a rate: the highest rate at the 3 dB threshold is that much above line 5
      expect(LINK_MARGIN_THRESHOLD).toBe(m.marginThreshold);
      const top = maxDataRate(t.ptOverN0, turbo.ebN0, LINK_MARGIN_THRESHOLD, c.modLoss + m.implementation);
      expect(Math.abs(dB(top / c.rate) - c.over)).toBeLessThan(TOL);
    });
  }

  it('gives the map\'s recomputed HGA figures: loss 275.03 dB, P_t/N₀ 38.27, required 30.97, margin 7.30', () => {
    // the map (§1.3, §2.2 E) recomputed these with the code's constants;
    // tolerance ±0.005 dB, half a unit in the map's last digit
    const c = MARCO[2], m = MARCO_COMMON;
    const t = designControlTable({
      eirp: eirp(wattsOfDbm(m.rfPowerDbm), c.circuit, c.gain, c.pointing), frequency: m.frequency, range: c.rangeKm * 1e3,
      rxGain: c.dsnGain, systemTemperature: c.tsys, losses: m.atmosphere + c.pol + m.dsnPointing + m.wind, dataRate: c.rate,
      requiredEbN0: m.threshold, implementationLoss: c.modLoss + m.implementation,
    });
    expect(Math.abs(t.pathLoss - 275.03)).toBeLessThan(0.005);
    expect(Math.abs(t.ptOverN0 - 38.27)).toBeLessThan(0.005);
    expect(Math.abs(t.requiredPtOverN0 - 30.97)).toBeLessThan(0.005);
    expect(Math.abs(t.margin - 7.30)).toBeLessThan(0.005);
  });
});

/**
 * V-L2. S. Palo et al., "Expanding CubeSat Capabilities with a Low Cost
 * Transceiver", 28th AIAA/USU Conference on Small Satellites (2014), Table 1
 * "Downlink Budget (X-Band)", p. 5, NTRS 20150000169:
 * https://ntrs.nasa.gov/api/citations/20150000169/downloads/20150000169.pdf
 *
 * Printed: 8380 MHz; 1 W; 0.4 dB system losses; 0 dBic; EIRP −0.4 dBW;
 * 2566 km; "Spreading Loss+Atm Attenuation −141.17 dB/m²"; PFD −141.57
 * dBW/m²; "Space Loss −119.1 dB"; 11.28 m at 57 %: 17.55 dB-m², 57.47 dBic;
 * received −94.53 dBm; G/T 34.69 dB/K; C/N₀ 81.28 dB-Hz; 12.5 Mbps; Eb/N₀
 * 10.32 dB; required 5.52 dB (OQPSK, BER 10⁻⁶); margin 4.79 dB.
 *
 * Two inputs are not printed and are taken from the printed lines, not
 * tuned: the atmosphere, the spreading line less the spreading loss
 * 10·log₁₀(4πd²) (P.525-5 Eq. (3)); the system temperature, the gain less
 * G/T.
 *
 * Tolerances, fixed before the first run:
 * - the margin: **±0.6 dB** (the map's), because the source's own lines
 *   disagree by about 0.5 dB (below);
 * - the gain, printed to 0.01 dB: ±0.01 dB;
 * - the defects, as the map recomputed them: space loss 179.10 dB, and C/N₀
 *   81.8 dB-Hz from the table's own inputs: ±0.05 dB.
 *
 * SOURCE DEFECTS, recorded, not tuned away:
 * - "Space Loss −119.1 dB" is not the free-space loss at 2566 km (179.10
 *   dB). It is that loss 60 dB short, the loss of 2566 m rather than km;
 * - "Received Signal Power −94.53 dBm" does not follow from its PFD and
 *   effective area (−141.57 + 17.55 = −124.02 dBW, −94.02 dBm); its C/N₀
 *   81.28 dB-Hz follows from the −94.53, so it carries the same 0.5 dB, and
 *   so does its margin;
 * - the text gives Eb/N₀ 10.23 dB, the table 10.32 (81.28 − 70.97);
 * - the text rounds the margin down to 4.7 dB.
 */
describe('V-L2: a LEO X-band CubeSat downlink, Palo et al. 2014 Table 1 (D06)', () => {
  const f = 8380e6, d = 2566e3, rate = 12.5e6;
  const atmosphere = 141.17 - dB(4 * Math.PI * d * d);
  const gain = dishGain(11.28, f, 0.57);
  const tsys = 10 ** ((57.47 - 34.69) / 10);
  const oqpsk = ebN0Of('oqpsk-conv');
  const t = designControlTable({
    eirp: eirp(1, 0.4, 0), frequency: f, range: d, rxGain: 57.47, systemTemperature: tsys, losses: atmosphere, dataRate: rate,
    requiredEbN0: oqpsk.ebN0, implementationLoss: 0,
  });

  it('closes with the published margin within 0.6 dB', () => {
    expect(oqpsk.ebN0).toBe(5.52);
    expect(eirp(1, 0.4, 0)).toBeCloseTo(-0.4, 12);
    expect(Math.abs(gain - 57.47)).toBeLessThan(0.01);
    expect(Math.abs(t.margin - 4.79)).toBeLessThan(0.6);
  });

  it('records the source\'s defects: its "space loss" is 60 dB short, and its C/N₀ is 0.5 dB below its own inputs', () => {
    expect(Math.abs(t.pathLoss - 179.1)).toBeLessThan(0.05);
    // 119.1 dB is the free-space loss of 2566 m, not km: 20·log₁₀(1000) = 60 dB short
    expect(Math.abs(freeSpaceLoss(2566, f) - 119.1)).toBeLessThan(0.05);
    // from its own inputs C/N₀ is 81.8 dB-Hz, and the received power −94.02 dBm, not −94.53
    expect(Math.abs(t.ptOverN0 - 81.8)).toBeLessThan(0.05);
    expect(Math.abs(t.received + 30 - (-141.57 + 17.55 + 30))).toBeLessThan(0.05);
    // the printed C/N₀ follows from the printed received power instead
    expect(Math.abs(-94.53 - 30 - BOLTZMANN_DB - dB(tsys) - 81.28)).toBeLessThan(0.05);
    // the printed margin is consistent with the printed C/N₀: 81.28 − 70.97 − 5.52
    expect(Math.abs(81.28 - dB(rate) - oqpsk.ebN0 - 4.79)).toBeLessThan(0.02);
  });

  it('is O04\'s linkBudget with the dish given as a gain', () => {
    // the same link through linkBudget, the dish as its diameter and efficiency: identical to 1e-9 dB
    const b = linkBudget({ eirp: -0.4, frequency: f, range: d, diameter: 11.28, efficiency: 0.57, noiseTemperature: tsys, losses: atmosphere, dataRate: rate });
    const same = designControlTable({ eirp: -0.4, frequency: f, range: d, rxGain: gain, systemTemperature: tsys, losses: atmosphere, dataRate: rate, requiredEbN0: 5.52, implementationLoss: 0 });
    expect(Math.abs(same.received - b.carrier)).toBeLessThan(1e-9);
    expect(Math.abs(same.ptOverN0 - b.cOverN0)).toBeLessThan(1e-9);
    expect(Math.abs(same.margin - (b.ebOverN0 - 5.52))).toBeLessThan(1e-9);
    expect(Math.abs(same.pathLoss - b.pathLoss)).toBeLessThan(1e-9);
  });
});

/**
 * V-L3. ITU-R Recommendation P.525-5 (11/2024), *Calculation of free-space
 * attenuation*, Annex §2.3: https://www.itu.int/rec/R-REC-P.525/en
 * - Eq. (5): L_bf = 20·log₁₀(4πd/λ) dB, exact;
 * - Eq. (6): L_bf = 32.4 + 20·log₁₀ f + 20·log₁₀ d, f in MHz, d in km.
 * 36 000 km at 4 GHz: 195.6 dB (docs/VALIDATION.md §5 O04; P.525 prints the
 * formula, not this number).
 *
 * Tolerances, fixed before the first run:
 * - Eq. (5): 1e-9 dB (the same formula);
 * - Eq. (6): ±0.05 dB, the map's: its 32.4 is 20·log₁₀(4π·10⁹/c) = 32.447
 *   rounded, a constant 0.047 dB;
 * - 195.6 dB: ±0.05 dB.
 */
describe('V-L3: the free-space loss is ITU-R P.525-5\'s (D06)', () => {
  const cases = [
    { d: 36_000e3, f: 4e9 }, { d: 160e9, f: 8414e6 }, { d: 2566e3, f: 8380e6 }, { d: 700e3, f: 437e6 }, { d: 1e3, f: 2.4e9 },
  ];
  it('is Eq. (5) exactly and Eq. (6) within 0.05 dB', () => {
    for (const { d, f } of cases) {
      const lambda = 299_792_458 / f;
      expect(Math.abs(freeSpaceLoss(d, f) - 20 * Math.log10((4 * Math.PI * d) / lambda))).toBeLessThan(1e-9);
      expect(Math.abs(freeSpaceLoss(d, f) - (32.4 + 20 * Math.log10(f / 1e6) + 20 * Math.log10(d / 1e3)))).toBeLessThan(0.05);
    }
  });
  it('loses 195.6 dB over 36 000 km at 4 GHz', () => {
    expect(Math.abs(designControlTable({
      eirp: 0, frequency: 4e9, range: 36_000e3, rxGain: 0, systemTemperature: 290, losses: 0, dataRate: 1, requiredEbN0: 0, implementationLoss: 0,
    }).pathLoss - 195.6)).toBeLessThan(0.05);
  });
});

/**
 * The slant range. Reference 1: SMAD's "Earth Satellite Parameters" table,
 * column "Range to Horizon (km)", as reproduced in B.T.C. Zandbergen,
 * *Spacecraft bus design and sizing*, TU Delft (2020), Appendix H, book
 * p. 274 (PDF p. 288):
 * https://repository.tudelft.nl/file/File_124a068a-158f-4b40-a44f-9ba407a14845
 * — the slant range at 0° elevation. All 41 rows. Tolerance, fixed before the
 * first run: ±0.5 km, half a unit in the printed digit.
 *
 * Reference 2, geometric: O04's `lookAngles` from a station on the equator
 * at sea level (WGS-84 radius R_EARTH there, its vertical the radius) to a
 * satellite in the equatorial plane — the sphere's triangle exactly. Range
 * within 1 mm at elevations from 0° to 90°, the rounding of thousands of km.
 */
const HORIZON: [number, number][] = [
  [0, 0], [100, 1134], [150, 1391], [200, 1610], [250, 1803], [300, 1979], [350, 2142], [400, 2294], [450, 2438], [500, 2575],
  [550, 2705], [600, 2831], [650, 2952], [700, 3069], [750, 3183], [800, 3293], [850, 3401], [900, 3506], [950, 3608], [1000, 3709],
  [1250, 4184], [1500, 4624], [2000, 5433], [2500, 6176], [3000, 6875], [3500, 7543], [4000, 8187], [4500, 8812], [5000, 9422],
  [6000, 10608], [7000, 11760], [8000, 12886], [9000, 13993], [10000, 15085], [15000, 20405], [20000, 25595], [20184, 25785],
  [25000, 30723], [30000, 35815], [35000, 40884], [35786, 41679],
];

describe('the slant range (D06)', () => {
  it('is SMAD\'s range to the horizon at 0° elevation, every row within 0.5 km', () => {
    for (const [hKm, rangeKm] of HORIZON) {
      expect(Math.abs(slantRange(R_EARTH + hKm * 1e3, 0) / 1e3 - rangeKm), `${hKm} km`).toBeLessThan(0.5);
    }
  });

  it('is the altitude straight up, and shrinks as the satellite climbs the sky', () => {
    const r = R_EARTH + 621e3;
    expect(Math.abs(slantRange(r, 90 * DEG) - 621e3)).toBeLessThan(1e-6);
    let last = Infinity;
    for (let el = 0; el <= 90; el += 5) {
      const s = slantRange(r, el * DEG);
      expect(s).toBeLessThan(last);
      last = s;
    }
  });

  it('agrees with lookAngles on the equator within 1 mm', () => {
    const station = { lat: 0, lon: 0, h: 0 };
    for (const hKm of [400, 621, 1200, 20_184, 35_786]) {
      const r = R_EARTH + hKm * 1e3;
      for (const gammaDeg of [0.001, 1, 5, 10, 15, 30, 60]) {
        const g = gammaDeg * DEG;
        const look = lookAngles(station, { x: r * Math.cos(g), y: r * Math.sin(g), z: 0 });
        if (look.elevation < 0) continue;
        expect(Math.abs(slantRange(r, look.elevation) - look.range), `${hKm} km, ${gammaDeg}°`).toBeLessThan(1e-3);
      }
    }
  });
});

describe('the highest data rate, and the longest pass (D06, D07)', () => {
  it('carries the rate at which the table\'s margin is the one asked for (round trip, 1e-9 dB)', () => {
    for (const margin of [0, 3, 6.5]) {
      for (const implementationLoss of [0, 1.07]) {
        const base = { eirp: 5, frequency: 8.2e9, range: 1800e3, rxGain: 45, systemTemperature: 200, losses: 2, requiredEbN0: 2.5, implementationLoss };
        const probe = designControlTable({ ...base, dataRate: 1 });
        const top = maxDataRate(probe.ptOverN0, base.requiredEbN0, margin, implementationLoss);
        expect(Math.abs(designControlTable({ ...base, dataRate: top }).margin - margin)).toBeLessThan(1e-9);
      }
    }
  });

  it('gives Palo et al.\'s 12.5 Mbit/s back from its printed C/N₀, Eb/N₀ and margin (within 0.02 dB, three lines printed to 0.01)', () => {
    expect(Math.abs(dB(maxDataRate(81.28, 5.52, 4.79) / 12.5e6))).toBeLessThan(0.02);
  });

  it('lasts (P/π)·λ_max straight overhead: half an orbit when the footprint reaches a quarter of the way round', () => {
    expect(maxPassDuration(5400, Math.PI / 2)).toBe(2700);
    expect(maxPassDuration(5677, 0.3)).toBeCloseTo((5677 * 0.3) / Math.PI, 12);
  });
});

describe('the sourced threshold Eb/N₀ values (D06)', () => {
  it('are the two design control tables\' lines, each with its source and URL', () => {
    expect(REQUIRED_EBN0.map((r) => [r.id, r.ebN0, r.errorRate.kind, r.errorRate.value])).toEqual([
      ['turbo-1/6', -0.1, 'FER', 1e-4],
      ['oqpsk-conv', 5.52, 'BER', 1e-6],
    ]);
    for (const r of REQUIRED_EBN0) expect(r.source).toMatch(/https:\/\//);
    expect(new Set(REQUIRED_EBN0.map((r) => r.id)).size).toBe(REQUIRED_EBN0.length);
  });

  it('are what the core exports', () => {
    expect(Object.keys(linkCore).sort()).toEqual(['designControlTable', 'eirp', 'maxDataRate', 'maxPassDuration', 'slantRange']);
  });
});
