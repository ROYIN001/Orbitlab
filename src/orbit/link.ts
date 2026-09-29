/**
 * The satellite builder's radio link (roadmap D06, docs/ROADMAP-PART2-3.md;
 * Phase 4 map §2.2 E): the downlink written as a design control table, the
 * way JPL and NASA write one, so a student's design closes (or does not) with
 * a margin in decibels, and the highest data rate and the longest pass that
 * set how much of a day's data comes down.
 *
 * It builds on O04's arithmetic in src/orbit/applications.ts — the free-space
 * loss `freeSpaceLoss` (ITU-R P.525-5), `BOLTZMANN_DB` — and adds what
 * `linkBudget` leaves out:
 * - the EIRP from the transmitter's power in watts, its line and pointing
 *   losses and its antenna gain;
 * - the slant range at the station's lowest working elevation;
 * - the receiving antenna's gain given directly, as the DSN's tables give it
 *   (810-005), rather than from a dish size;
 * - the P_t/N₀ the data rate and its coding need, and the margin;
 * - the inverse, the highest rate a link carries at a margin;
 * - the longest pass, straight overhead.
 * With the same inputs `designControlTable` and `linkBudget` give the same
 * received power and C/N₀ (tests/link.test.ts holds them together).
 *
 * UNITS. SI inside, decibels where a link budget is written in them: dBW,
 * dBi, dB, dB-Hz. Losses are positive numbers of decibels, subtracted, as in
 * `LinkInput.losses`; the tables this is checked against print them negative.
 * The Earth is the sphere of radius `R_EARTH`, as in every D06 closed form
 * (map risk R7).
 *
 * Validation (tests/link.test.ts): V-L1, JPL DESCANSO 18 (MarCO) Table 5-4,
 * every line of all four columns within 0.1 dB; V-L2, Palo et al. 2014
 * (NTRS 20150000169) Table 1, the margin within 0.6 dB, its defects
 * recorded; V-L3, ITU-R P.525-5's free-space loss.
 */
import { R_EARTH } from '../physics/constants';
import { BOLTZMANN_DB, freeSpaceLoss } from './applications';
import type { DesignControlInput, DesignControlTable, LinkCore, RequiredEbN0 } from './satellite-cores';

/**
 * The transmitter's EIRP, dBW: 10·log₁₀(P) − line loss + antenna gain −
 * pointing loss, power `power` in W, losses in dB (positive), gain in dBi
 * (D06). The pointing loss is the transmitting antenna's off its target
 * (attitude's `pointingLoss`); MarCO's table counts it inside the EIRP
 * (Table 5-4, line 11 = lines 7 + 8 + 9 + 10), so it may be given here or
 * among the path's `losses` — not both.
 */
export function eirp(power: number, lineLoss: number, gain: number, pointingLoss = 0): number {
  return 10 * Math.log10(power) - lineLoss + gain - pointingLoss;
}

/**
 * The slant range from a station on the ground to a satellite at radius `r`
 * (m) seen at elevation ε (rad), m: √(r² − R²cos²ε) − R·sin ε, the triangle
 * of the Earth's centre, the station and the satellite (D06). Straight up it
 * is the altitude; at ε = 0 the range to the horizon √(r² − R²), SMAD's
 * column that tests/link.test.ts holds it to.
 */
export function slantRange(r: number, elevation: number): number {
  const c = R_EARTH * Math.cos(elevation);
  return Math.sqrt(r * r - c * c) - R_EARTH * Math.sin(elevation);
}

/**
 * One downlink's design control table (D06), the lines of JPL DESCANSO 18's
 * Table 5-4 (MarCO) in dBW rather than dBm:
 * - path loss L = `freeSpaceLoss(range, frequency)`;
 * - received power P_r = EIRP − L − losses + G_r, dBW;
 * - the noise density N₀ = k·T_sys, dBW/Hz;
 * - P_t/N₀ = P_r − N₀, dB-Hz (the total power; a residual carrier's share,
 *   MarCO's "carrier suppression", is the carrier loop's business, not the
 *   data's);
 * - the P_t/N₀ required = 10·log₁₀(R_b) + threshold E_b/N₀ + modulation and
 *   implementation losses, dB-Hz (MarCO line 37);
 * - margin = P_t/N₀ − required, dB (line 38).
 */
export function designControlTable(i: DesignControlInput): DesignControlTable {
  const pathLoss = freeSpaceLoss(i.range, i.frequency);
  const received = i.eirp - pathLoss - i.losses + i.rxGain;
  const n0 = BOLTZMANN_DB + 10 * Math.log10(i.systemTemperature);
  const ptOverN0 = received - n0;
  const requiredPtOverN0 = 10 * Math.log10(i.dataRate) + i.requiredEbN0 + i.implementationLoss;
  return { pathLoss, received, n0, ptOverN0, requiredPtOverN0, margin: ptOverN0 - requiredPtOverN0 };
}

/**
 * The highest data rate a link carries, bit/s: 10^((C/N₀ − E_b/N₀ − L − M)/10)
 * for C/N₀ in dB-Hz, the coding's threshold E_b/N₀, a margin M and the
 * modulation and implementation losses L in dB (D06; D07's "maximum data
 * rate at the margin"). The inverse of `designControlTable`: at that rate
 * the table's margin is M.
 */
export function maxDataRate(cOverN0: number, requiredEbN0: number, margin: number, implementationLoss = 0): number {
  return 10 ** ((cOverN0 - requiredEbN0 - implementationLoss - margin) / 10);
}

/**
 * The longest pass over a station, straight overhead, s: (P/π)·λ_max (D06,
 * D07). A circular orbit sweeps 2π/P rad of Earth central angle a second and
 * an overhead pass crosses the footprint's whole width, 2·λ_max, with
 * λ_max = `footprintAngle(r, ε_min)` (Wertz & Larson's Earth-coverage form).
 * It leaves out the Earth turning under the pass, a fraction of a per cent
 * for a low orbit (tests/passes.test.ts holds `findPassesOf` to it).
 */
export function maxPassDuration(period: number, lambdaMax: number): number {
  return (period / Math.PI) * lambdaMax;
}

/**
 * Threshold E_b/N₀ values, each as its source prints it (D06, map §2.2 E).
 * CCSDS 130.1-G, which tabulates them by code, returned 404 when the map
 * was made, so these come from the two design control tables the link is
 * validated against. A design stores the value it uses
 * (`SatelliteDesign.comms.requiredEbN0`); these are where it starts.
 */
export const REQUIRED_EBN0: readonly RequiredEbN0[] = [
  {
    id: 'turbo-1/6',
    scheme: 'turbo code, rate 1/6',
    errorRate: { kind: 'FER', value: 1e-4 },
    ebN0: -0.1,
    source: 'Kobayashi, Shihabi & Taylor, Mars Cube One Telecommunications Subsystem Design, JPL DESCANSO 18 (2021), Table 5-4, line 36: https://descanso.jpl.nasa.gov/DPSummary/DESCANSO18_MarCO.pdf',
  },
  {
    id: 'oqpsk-conv',
    scheme: 'OQPSK with convolutional coding',
    errorRate: { kind: 'BER', value: 1e-6 },
    ebN0: 5.52,
    source: 'Palo et al., Expanding CubeSat Capabilities with a Low Cost Transceiver, 28th AIAA/USU SmallSat (2014), Table 1, NTRS 20150000169: https://ntrs.nasa.gov/api/citations/20150000169/downloads/20150000169.pdf',
  },
];

/**
 * The margin a link is held to, dB: MarCO's "margin threshold" (DESCANSO 18,
 * Table 5-4, line 39), 3 dB for every antenna and dish. A sourced default
 * for D07's "highest rate at the margin"; the design may ask for more.
 */
export const LINK_MARGIN_THRESHOLD = 3;

export const linkCore = { eirp, slantRange, designControlTable, maxDataRate, maxPassDuration } satisfies LinkCore;
