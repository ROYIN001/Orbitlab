/**
 * Launch vehicle definitions.
 *
 * Numbers are drawn from public sources (manufacturer user guides, press kits,
 * encyclopedic summaries) and rounded. Solid motors use an average thrust so
 * that propellant mass / mass-flow gives the published burn time; the
 * simulation applies a regressive thrust profile on top of that. Where dry
 * masses are not published they are estimated from stage mass fractions.
 * Treat every figure as approximate (±10 %).
 *
 * FAIRING JETTISON. Six vehicles carry a `fairing.sepTime`, the operator's own
 * published callout, because their operators publish one and fly it: Soyuz-2.1a
 * and 2.1b 157 s, Ariane 64 200 s, Vega-C 220 s, Long March 2D 220 s, Long
 * March 3B/E 215 s, H-IIA 202 250 s. The rest stay on the physical
 * free-molecular-heating placard, and the altitude floor applies to both, so a
 * trajectory still deep in the atmosphere at its published time does not shed
 * the fairing there. See `FairingSpec.sepTime` in src/types.ts for why a
 * published time is modelled instead of a back-solved heat-flux limit.
 *
 * Solid-booster jettison delays follow audit item B24
 * (docs/history/AUDIT-2026-09-16.md): Atlas V GEM-63 5 s, Vulcan GEM-63XL 6 s, H3
 * SRB-3 6 s, Long March 5 kerolox strap-ons 3 s, H-IIA SRB-A 8 s. Ariane 6's
 * P120C keeps 2 s: its separation gap was burn duration, not delay, and was
 * fixed by the B22 mean-thrust correction on the motor itself.
 */
import type { VehicleSpec, EngineSpec, StageSpec, BoosterGroupSpec } from '../types';

const kN = 1000;

// ---------------------------------------------------------------- engines
//
// VACUUM-ONLY ENGINES. `EngineSpec` requires a sea-level pair, but an upper- or
// kick-stage engine that only ever ignites above ~100 km has no published
// sea-level operating point (an RL10 nozzle would not even flow full at sea
// level). For those engines the `thrustSL` / `ispSL` fields are NOT data: they
// are placeholders, and the recurring 250 / 260 / 280 s values below are where
// they came from. They now carry `vacuumOnly: true` (audit item B27), which is
// what stops the model ever using them: `engineThrust` returns the vacuum
// figure at every pressure for such an engine, so a future abort or
// suborbital-hop scenario cannot silently fly invented numbers, and
// tests/data-consistency.test.ts checks the delivered sea-level Isp only for
// the engines that really are ground-lit.
//
// SOLID MOTORS. `thrustVac` is the MEAN thrust (grain mass / published burn
// time); `peakFactor` is the published peak divided by that mean, which
// `solidProfile` flies as a regressive ramp on top of it.
//
// EVERY solid in the fleet now carries its own factor, and
// tests/data-consistency.test.ts enforces that (`every solid motor declares its
// published peak/mean thrust ratio`). Until this wave only three did and the
// other seven fell back on a 1.2 default that was nobody's published number —
// which mattered on the pad, because `liftoffThrust` flies the head of the ramp:
// PSLV-XL's S139 peaks at 1.43 x mean and its PSOM-XL at 1.53, so the fleet
// default under-reported that vehicle's liftoff thrust by a fifth.
//
//   motor      published peak        mean (this file)   peak/mean   source
//   P120C      4 323 kN             2 845.6 kN          1.52        Vega C
//   Zefiro 40  1 304 kN             1 122.9 kN          1.16        Vega C
//   Zefiro 9     317 kN               256.4 kN          1.24        Vega C
//   SRB-A3     2 260 kN             1 857.9 kN          1.22        H-IIA
//   SRB-3      2 300 kN             1 780 kN            1.29        H3
//   GEM-63     1 649.6 kN           1 300 kN            1.27        GEM
//   GEM-63XL   2 061 kN             1 460 kN            1.41        GEM
//   S139       4 846.9 kN           3 400 kN            1.43        PSLV
//   PSOM-XL      703.5 kN             460 kN            1.53        PSLV
//   HPS3         250 kN               174 kN            1.44        PSLV
//
// Sources: https://en.wikipedia.org/wiki/Vega_C ,
// https://en.wikipedia.org/wiki/Graphite-Epoxy_Motor ,
// https://en.wikipedia.org/wiki/H3_(rocket) ,
// https://en.wikipedia.org/wiki/Polar_Satellite_Launch_Vehicle ,
// https://en.wikipedia.org/wiki/H-IIA
const RD107A: EngineSpec = { name: 'RD-107A', count: 1, thrustSL: 839.5 * kN, thrustVac: 1019.9 * kN, ispSL: 263.3, ispVac: 320.2, minThrottle: 0.5 };
const RD108A: EngineSpec = { name: 'RD-108A', count: 1, thrustSL: 792.4 * kN, thrustVac: 921.9 * kN, ispSL: 257.7, ispVac: 320.6, minThrottle: 0.5 };
const RD0110: EngineSpec = { name: 'RD-0110', count: 1, thrustSL: 200 * kN, thrustVac: 298 * kN, ispSL: 250, ispVac: 326, minThrottle: 0.5, vacuumOnly: true };
const RD0124: EngineSpec = { name: 'RD-0124', count: 1, thrustSL: 200 * kN, thrustVac: 294.3 * kN, ispSL: 250, ispVac: 359, minThrottle: 0.5, vacuumOnly: true };
const S592: EngineSpec = { name: 'S5.92', count: 1, thrustSL: 15 * kN, thrustVac: 19.85 * kN, ispSL: 250, ispVac: 333.2, vacuumOnly: true };
const RD276: EngineSpec = { name: 'RD-276', count: 6, thrustSL: 1745 * kN, thrustVac: 1915 * kN, ispSL: 288, ispVac: 316, minThrottle: 0.6 };
const RD0210: EngineSpec = { name: 'RD-0210/0211', count: 4, thrustSL: 500 * kN, thrustVac: 582 * kN, ispSL: 280, ispVac: 327 };
const RD0213: EngineSpec = { name: 'RD-0213 + RD-0214', count: 1, thrustSL: 520 * kN, thrustVac: 613.8 * kN, ispSL: 280, ispVac: 325 };
const S598M: EngineSpec = { name: 'S5.98M', count: 1, thrustSL: 15 * kN, thrustVac: 19.62 * kN, ispSL: 250, ispVac: 326, vacuumOnly: true };
const RD191: EngineSpec = { name: 'RD-191', count: 1, thrustSL: 1920 * kN, thrustVac: 2090 * kN, ispSL: 310.7, ispVac: 337.5, minThrottle: 0.3 };
const RD0124A: EngineSpec = { name: 'RD-0124A', count: 1, thrustSL: 200 * kN, thrustVac: 294.3 * kN, ispSL: 250, ispVac: 359, vacuumOnly: true };
const MERLIN1D: EngineSpec = { name: 'Merlin 1D', count: 9, thrustSL: 845 * kN, thrustVac: 914 * kN, ispSL: 282, ispVac: 311, minThrottle: 0.4 };
const MVAC: EngineSpec = { name: 'Merlin Vacuum', count: 1, thrustSL: 700 * kN, thrustVac: 981 * kN, ispSL: 250, ispVac: 348, minThrottle: 0.4, vacuumOnly: true };
const RD180: EngineSpec = { name: 'RD-180', count: 1, thrustSL: 3827 * kN, thrustVac: 4152 * kN, ispSL: 311.3, ispVac: 337.8, minThrottle: 0.47 };
const GEM63: EngineSpec = { name: 'GEM-63', count: 1, thrustSL: 1180 * kN, thrustVac: 1300 * kN, ispSL: 254, ispVac: 279, solid: true, peakFactor: 1.27 };
const RL10C1: EngineSpec = { name: 'RL10C-1', count: 1, thrustSL: 60 * kN, thrustVac: 101.8 * kN, ispSL: 280, ispVac: 449.7, vacuumOnly: true };
const BE4: EngineSpec = { name: 'BE-4', count: 2, thrustSL: 2400 * kN, thrustVac: 2600 * kN, ispSL: 310, ispVac: 340, minThrottle: 0.4 };
const GEM63XL: EngineSpec = { name: 'GEM-63XL', count: 1, thrustSL: 1340 * kN, thrustVac: 1460 * kN, ispSL: 254, ispVac: 279, solid: true, peakFactor: 1.41 };
const RL10C11_X2: EngineSpec = { name: 'RL10C-1-1', count: 2, thrustSL: 60 * kN, thrustVac: 106 * kN, ispSL: 280, ispVac: 453.8, vacuumOnly: true };
const VULCAIN21: EngineSpec = { name: 'Vulcain 2.1', count: 1, thrustSL: 960 * kN, thrustVac: 1370 * kN, ispSL: 318, ispVac: 431 };
// P120C: 141.4 t of grain burned in ~135 s means a *mean* mass flow of about
// 1042 kg/s, i.e. a mean vacuum thrust near 2 846 kN — the 4 323-4 650 kN
// figures quoted for this motor are the peak of a regressive grain, which the
// simulation adds on top (see `solidProfile`). The earlier 3 200/3 400 kN pair
// was the peak used as a mean and burned the grain out about 20 s early.
// https://en.wikipedia.org/wiki/P120C
const P120C: EngineSpec = { name: 'P120C', count: 1, thrustSL: 2677 * kN, thrustVac: 2845.6 * kN, ispSL: 262, ispVac: 278.5, solid: true, peakFactor: 1.52 };
const VINCI: EngineSpec = { name: 'Vinci', count: 1, thrustSL: 100 * kN, thrustVac: 180 * kN, ispSL: 280, ispVac: 457, vacuumOnly: true };
const YF77: EngineSpec = { name: 'YF-77', count: 2, thrustSL: 510 * kN, thrustVac: 700 * kN, ispSL: 310, ispVac: 430 };
const YF100_X2: EngineSpec = { name: 'YF-100', count: 2, thrustSL: 1200 * kN, thrustVac: 1340 * kN, ispSL: 300, ispVac: 335 };
const YF75D_X2: EngineSpec = { name: 'YF-75D', count: 2, thrustSL: 50 * kN, thrustVac: 88.36 * kN, ispSL: 280, ispVac: 442, vacuumOnly: true };
const LE9_X2: EngineSpec = { name: 'LE-9', count: 2, thrustSL: 1220 * kN, thrustVac: 1471 * kN, ispSL: 352, ispVac: 425, minThrottle: 0.63 };
const SRB3: EngineSpec = { name: 'SRB-3', count: 1, thrustSL: 1650 * kN, thrustVac: 1780 * kN, ispSL: 265, ispVac: 283.6, solid: true, peakFactor: 1.29 };
const LE5B3: EngineSpec = { name: 'LE-5B-3', count: 1, thrustSL: 80 * kN, thrustVac: 137 * kN, ispSL: 280, ispVac: 448, vacuumOnly: true };
const S139: EngineSpec = { name: 'S139', count: 1, thrustSL: 3000 * kN, thrustVac: 3400 * kN, ispSL: 237, ispVac: 269, solid: true, peakFactor: 1.43 };
const PSOM_XL: EngineSpec = { name: 'PSOM-XL', count: 1, thrustSL: 420 * kN, thrustVac: 460 * kN, ispSL: 240, ispVac: 262, solid: true, peakFactor: 1.53 };
const VIKAS: EngineSpec = { name: 'Vikas', count: 1, thrustSL: 725 * kN, thrustVac: 803 * kN, ispSL: 262, ispVac: 293 };
// HPS3 (PSLV PS3): the 240 kN figure is the peak of the grain. 7 600 kg burned
// in the published 126.7 s is a 60 kg/s mean flow, i.e. ~174 kN mean vacuum
// thrust — the same correction as P120C above, and the second half of audit
// item B22 (docs/history/AUDIT-2026-09-16.md). The old pair burned the grain out in
// 91.6 s, 27.7 % short. https://en.wikipedia.org/wiki/Polar_Satellite_Launch_Vehicle
const HPS3: EngineSpec = { name: 'HPS3', count: 1, thrustSL: 150 * kN, thrustVac: 174 * kN, ispSL: 260, ispVac: 295, solid: true, peakFactor: 1.44 };
const PS4_L25: EngineSpec = { name: 'L-2-5', count: 2, thrustSL: 5 * kN, thrustVac: 7.3 * kN, ispSL: 260, ispVac: 308, vacuumOnly: true };
// Rutherford: 24 kN sea level / 25.8 kN vacuum, Isp 311 / 343 s.
// https://en.wikipedia.org/wiki/Rutherford_(rocket_engine)
// Both numbers are quoted: the infobox gives 24 kN at sea level and 25.8 kN in
// vacuum for the same engine, and 25.8 kN is what `RUTHERFORD_VAC` below has
// always carried for the second-stage variant. An earlier draft of this wave
// rounded the vacuum figure down to 25 kN; it is quoted here as published.
// The file before this wave carried 24.9 / 27.5 kN, which burned the 9.7 t
// first stage in 132 s against a published MECO near T+152 s; at the published
// pair the nine-engine mean mass flow is 68.4 kg/s and the stage burns 142 s.
// This is a correction to an existing vehicle (Electron) made by the fleet-data
// wave — see the Electron entry in the reference-timeline table.
const RUTHERFORD: EngineSpec = { name: 'Rutherford', count: 9, thrustSL: 24 * kN, thrustVac: 25.8 * kN, ispSL: 311, ispVac: 343, minThrottle: 0.5 };
const RUTHERFORD_VAC: EngineSpec = { name: 'Rutherford Vacuum', count: 1, thrustSL: 18 * kN, thrustVac: 25.8 * kN, ispSL: 260, ispVac: 343, minThrottle: 0.5, vacuumOnly: true };
const CURIE: EngineSpec = { name: 'Curie', count: 1, thrustSL: 0.1 * kN, thrustVac: 0.12 * kN, ispSL: 250, ispVac: 320, vacuumOnly: true };
// --- Vega-C (Avio / ESA). https://en.wikipedia.org/wiki/Vega_C
// Solid mean thrusts are derived from grain mass / published burn time, as for P120C above.
const ZEFIRO40: EngineSpec = { name: 'Zefiro 40', count: 1, thrustSL: 1033 * kN, thrustVac: 1122.9 * kN, ispSL: 270, ispVac: 293.5, solid: true, peakFactor: 1.16 };
const ZEFIRO9: EngineSpec = { name: 'Zefiro 9', count: 1, thrustSL: 234 * kN, thrustVac: 256.4 * kN, ispSL: 270, ispVac: 295.9, solid: true, peakFactor: 1.24 };
const AVUM_PLUS: EngineSpec = { name: 'AVUM+ (RD-869)', count: 1, thrustSL: 1.9 * kN, thrustVac: 2.42 * kN, ispSL: 248, ispVac: 315.8, vacuumOnly: true };

// --- Long March 2D / 3B (SAST / CALT). N2O4/UDMH.
// https://en.wikipedia.org/wiki/Long_March_2D , https://en.wikipedia.org/wiki/Long_March_3B
// The YF-21C cluster is 4 x YF-20C at 740.4 kN sea level each; vacuum thrust
// follows from the same mass flow at the published 289 s vacuum Isp.
const YF21C: EngineSpec = { name: 'YF-21C (4× YF-20C)', count: 4, thrustSL: 740.4 * kN, thrustVac: 823 * kN, ispSL: 260, ispVac: 289 };
// YF-24C/E = YF-22C main (742.04 kN, 300 s) + 4 YF-23C verniers (47.1 kN total, 289 s),
// lumped into one entry with the combined thrust and the flow-weighted Isp.
const YF24C: EngineSpec = { name: 'YF-24C (YF-22C + 4× YF-23C)', count: 1, thrustSL: 700 * kN, thrustVac: 789.14 * kN, ispSL: 265.5, ispVac: 299.4 };
// CZ-3B/E strap-on: one YF-25 (the booster variant of the YF-20), 740.4 kN sea level.
const YF25: EngineSpec = { name: 'YF-25', count: 1, thrustSL: 740.4 * kN, thrustVac: 820.9 * kN, ispSL: 260.66, ispVac: 289 };
// CZ-3B third stage: 2 x YF-75 at 167.17 kN total, 438 s vacuum.
const YF75_X2: EngineSpec = { name: 'YF-75', count: 1, thrustSL: 120 * kN, thrustVac: 167.17 * kN, ispSL: 314.5, ispVac: 438, vacuumOnly: true };

// --- H-IIA 202 (MHI / JAXA). https://en.wikipedia.org/wiki/H-IIA
const LE7A: EngineSpec = { name: 'LE-7A', count: 1, thrustSL: 843 * kN, thrustVac: 1098 * kN, ispSL: 337.8, ispVac: 440 };
// SRB-A3: 66.8 t of grain in ~100 s is a 668 kg/s mean flow, i.e. ~1 858 kN mean
// vacuum thrust; the 2 260-2 520 kN figures are the peak of the regressive grain.
const SRB_A: EngineSpec = { name: 'SRB-A3', count: 1, thrustSL: 1736 * kN, thrustVac: 1857.9 * kN, ispSL: 265, ispVac: 283.6, solid: true, peakFactor: 1.22 };
const LE5B: EngineSpec = { name: 'LE-5B', count: 1, thrustSL: 90 * kN, thrustVac: 137 * kN, ispSL: 293.7, ispVac: 447, vacuumOnly: true };

const RAPTOR_SL_X33: EngineSpec = { name: 'Raptor 2', count: 33, thrustSL: 2300 * kN, thrustVac: 2500 * kN, ispSL: 327, ispVac: 347, minThrottle: 0.4 };
const RAPTOR_SHIP: EngineSpec = { name: 'Raptor 2 / RVac', count: 6, thrustSL: 2000 * kN, thrustVac: 2400 * kN, ispSL: 320, ispVac: 365, minThrottle: 0.4 };

// ---------------------------------------------------------------- helpers
const f9Booster = (id: string, name: string, count: number): BoosterGroupSpec => ({
  id, name, count, dryMass: 25600, propellantMass: 395700, engine: MERLIN1D,
  diameter: 3.66, length: 42, sepDelay: 2, color: '#f2f2f2',
});
const briz = (): StageSpec => ({
  id: 'brizm', name: 'Briz-M', dryMass: 2370, propellantMass: 19800, engine: S598M,
  diameter: 4.0, length: 2.6, restartable: true, sepDelay: 2, ignitionDelay: 3, color: '#d8d8d8',
});
const f9Stage2 = (): StageSpec => ({
  id: 's2', name: 'Second stage (Merlin Vacuum)', dryMass: 4300, propellantMass: 108000, engine: MVAC,
  diameter: 3.66, length: 15, restartable: true, sepDelay: 3, ignitionDelay: 4, color: '#f2f2f2', accentColor: '#222',
});

// ---------------------------------------------------------------- vehicles
//
// THE R-7 CORE, IN TWO VARIANTS — and the split is the point, not an accident.
//
// Blok A's published masses (https://en.wikipedia.org/wiki/Soyuz-2_(rocket) ):
// gross 99 765 kg, empty 6 545 kg, propellant 63 800 kg LOX + 26 300 kg RP-1 =
// 90 100 kg. The dry mass is exactly right in this file. The propellant was
// 87 000 kg, 3.4 % light — and note that the published figures do not close
// among themselves either (99 765 − 6 545 = 93 220 kg, 3 120 kg above the
// LOX+RP-1 sum), so 90 100 kg is itself a ±3 t number.
//
// Soyuz-2.1a and 2.1b fly the SAME core, so one helper is the honest shape. But
// 2.1a is the application's default mission and the one vehicle whose whole
// published timeline is pinned as a regression band (booster separation T+118 s,
// core cut-off T+287 s, SECO T+528 s — tests/fleet-defaults.test.ts), and
// 3 100 kg more core propellant moves core cut-off by ~10 s. Ten seconds is
// inside that band, but it would be spent on a figure that is itself uncertain
// by more than the change.
//
// So the correction lands where it is free: 2.1b, which has no published-clock
// regression band, takes the audited load, and 2.1a keeps the 87 000 kg that
// reproduces its callouts. That is a deliberate, documented divergence between
// two records of the same hardware, not two independent estimates — which is why
// they are two named helpers over one shared booster set rather than a copied
// literal. See docs/history/AUDIT-2026-09-16.md, data proposals, "soyuz Blok A".
const soyuzBoosters = (): BoosterGroupSpec[] => ([{
  id: 'blokBVGD', name: 'Blok B/V/G/D boosters', count: 4, dryMass: 3784, propellantMass: 39600,
  engine: RD107A, diameter: 2.68, length: 19.6, sepDelay: 1, conicalTop: true, color: '#c9c7bd',
}]);
/** Blok A as flown by Soyuz-2.1a: 87 000 kg, held to the published 2.1a clock. */
const soyuz21aCore = (): StageSpec => ({
  id: 'blokA', name: 'Blok A (core)', dryMass: 6545, propellantMass: 87000, engine: RD108A,
  diameter: 2.95, length: 27.8, color: '#c9c7bd', accentColor: '#5a6b4c', profile: 'r7Core',
  boosters: soyuzBoosters(),
});
/** Blok A with the published 90 100 kg load (63 800 LOX + 26 300 RP-1). */
const soyuz21bCore = (): StageSpec => ({
  id: 'blokA', name: 'Blok A (core)', dryMass: 6545, propellantMass: 90100, engine: RD108A,
  diameter: 2.95, length: 27.8, color: '#c9c7bd', accentColor: '#5a6b4c', profile: 'r7Core',
  boosters: soyuzBoosters(),
});

/**
 * The reference orbit each `payload*` rating is quoted FOR.
 *
 * Audit item B26 (docs/history/AUDIT-2026-09-16.md): the setup panel shows a bare
 * "Rated LEO payload" and the fleet matrix grades against the same number, but a
 * rating is meaningless without the orbit it was measured to — Soyuz-2.1a's
 * 7 430 kg is to 240 km × 51.6° FROM BAIKONUR and drops to 6 800 kg from
 * Plesetsk, and the fleet matrix's own presets are 420-600 km, which costs
 * 150-300 m/s more than any of them. Where the model cannot reach a published
 * rating, this is the field that says what the rating was actually a rating for.
 *
 * Exported as data rather than as a `VehicleSpec` field because `src/types.ts`
 * belongs to another wave; the UI can render it by id, and the wave that owns
 * types.ts can fold it into `VehicleSpec` unchanged. Altitudes in km,
 * inclination in degrees, `site` is the launch site the rating is quoted from.
 */
export interface RatingOrbit {
  /** which rating this describes */
  rating: 'LEO' | 'SSO' | 'GTO';
  perigeeKm: number;
  apogeeKm: number;
  inclinationDeg: number;
  siteId: string;
  source: string;
}

export const RATING_ORBITS: Record<string, RatingOrbit[]> = {
  soyuz21a: [{ rating: 'LEO', perigeeKm: 240, apogeeKm: 240, inclinationDeg: 51.6, siteId: 'baikonur', source: 'https://en.wikipedia.org/wiki/Soyuz-2_(rocket)' }],
  soyuz21b: [{ rating: 'LEO', perigeeKm: 240, apogeeKm: 240, inclinationDeg: 51.6, siteId: 'baikonur', source: 'https://en.wikipedia.org/wiki/Soyuz-2_(rocket)' }],
  vulcan: [
    { rating: 'LEO', perigeeKm: 420, apogeeKm: 420, inclinationDeg: 51.6, siteId: 'cape', source: 'https://en.wikipedia.org/wiki/Vulcan_Centaur' },
    { rating: 'SSO', perigeeKm: 800, apogeeKm: 800, inclinationDeg: 98.6, siteId: 'vandenberg', source: 'https://en.wikipedia.org/wiki/Vulcan_Centaur' },
  ],
  vegac: [
    { rating: 'SSO', perigeeKm: 700, apogeeKm: 700, inclinationDeg: 98.2, siteId: 'kourou', source: 'https://www.esa.int/Enabling_Support/Space_Transportation/Vega/Vega-C' },
  ],
  longmarch2d: [
    { rating: 'LEO', perigeeKm: 200, apogeeKm: 200, inclinationDeg: 41, siteId: 'jiuquan', source: 'http://www.astronautix.com/c/changzheng2d.html' },
  ],
  longmarch5: [
    { rating: 'LEO', perigeeKm: 200, apogeeKm: 200, inclinationDeg: 19.5, siteId: 'wenchang', source: 'https://en.wikipedia.org/wiki/Long_March_5' },
    { rating: 'SSO', perigeeKm: 700, apogeeKm: 700, inclinationDeg: 98.2, siteId: 'wenchang', source: 'https://en.wikipedia.org/wiki/Long_March_5' },
  ],
};

export const VEHICLES: VehicleSpec[] = [
  {
    id: 'soyuz21a', name: 'Soyuz-2.1a', country: 'RU', manufacturer: 'RKTs Progress',
    // 7 430 kg to 240 km / 51.6 deg FROM BAIKONUR (6 800 kg from Plesetsk,
    // 7 460 kg from Vostochny). The file carried 7 020 kg, which matches no
    // published site; see RATING_ORBITS above and audit item B26.
    // https://en.wikipedia.org/wiki/Soyuz-2_(rocket)
    height: 46.3, payloadLEO: 7430, payloadGTO: 0,
    // Soyuz publishes a fairing callout and flies it: T+157 s on the crewed
    // profile. On the heating placard alone this trajectory shed it at T+176 s,
    // ~12 % late, which was one of the recorded disagreements with the published
    // timeline. See `FairingSpec.sepTime` in src/types.ts for why the published
    // TIME is modelled rather than a back-solved heat-flux placard.
    // The 4.11 m fairing, 11.43 m long with its own adapter cone down to Blok I
    // (TASS/RIA: the 4.11 × 11.43 m payload unit), for the crewed and the cargo
    // flights alike; with the escape tower on its nose the head of a crewed
    // stack is 15.59 m, and the stack 46.3–51.4 m (owner's figures,
    // 2026-09-25): 46.85 m drawn, 51.0 m with the tower. It was drawn and flown
    // at 3.7 × 10.1 m on a 1.7 m adapter of its own.
    fairing: { mass: 1000, diameter: 4.11, length: 11.43, adapter: 2.2, sepAltitude: 95e3, sepTime: 157, color: '#e8e8e8' },
    // A crewed launch carries the escape tower and the fairing's abort motors (G06).
    escapeSystem: 'soyuz',
    stages: [
      soyuz21aCore(),
      { id: 'blokI', name: 'Blok I (3rd stage, RD-0110)', dryMass: 2410, propellantMass: 22900, engine: RD0110, diameter: 2.66, length: 6.7, sepDelay: 0, ignitionDelay: 0, color: '#c9c7bd', profile: 'r7Upper' },
    ],
    sites: ['baikonur', 'plesetsk', 'vostochny'], maxQ: 40e3, maxAccel: 60,
    crewCapable: true,
    // The R-7 has no upper stage that can make up a slow start: its Blok I fires
    // once and whatever orbit it is in at cut-off is final. A 1.5 deg kick costs
    // about 450 m/s of gravity and steering loss against a 3 deg one (measured
    // 1211 + 364 m/s vs 1105 + 260 m/s on the 7.15 t crew mission), which is the
    // difference between reaching the parking orbit and falling 30 km short of
    // it. 3 deg / 0.3 deg/s keeps max Q at 34 kPa, inside the 40 kPa placard,
    // and holds booster separation, core cut-off and SECO on their published
    // times (120 / 294 / 535 s against 118 / 287 / 528 s).
    guidanceDefaults: { kickAngle: 3, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    // Flown as a rigid body: an early, longer kick and a faster turn allowance, the
    // programme that passed the calm, crosswind and shear reference missions with
    // the actuator limits unchanged (docs/SIXDOF-ACCEPTANCE.md).
    guidanceDefaultsSixDof: { pitchOverAltitude: 50, kickAngle: 4, kickDuration: 12, maxTurnRate: 0.5 },
    notes: 'The crew/cargo launcher for Soyuz MS and Progress: R-7 boosters and core with the RD-0110 third stage, direct insertion.',
  },
  {
    id: 'soyuz21b', name: 'Soyuz-2.1b / Fregat-M', country: 'RU', manufacturer: 'RKTs Progress',
    // 8 670 kg to 240 km / 51.6 deg from Baikonur (was 8 200 kg, which is no
    // published site's figure). https://en.wikipedia.org/wiki/Soyuz-2_(rocket)
    height: 46.3, payloadLEO: 8670, payloadGTO: 1900, payloadSSO: 4900,
    fairing: { mass: 1500, diameter: 4.11, length: 11.4, sepAltitude: 95e3, sepTime: 157, color: '#e8e8e8' },
    stages: [
      // The audited 90 100 kg Blok A load — see the comment on the two core
      // helpers above for why 2.1a keeps 87 000 kg and only 2.1b takes this.
      soyuz21bCore(),
      { id: 'blokI', name: 'Blok I (3rd stage)', dryMass: 2355, propellantMass: 23000, engine: RD0124, diameter: 2.66, length: 6.7, sepDelay: 0, ignitionDelay: 0, color: '#c9c7bd', profile: 'r7Upper' },
      { id: 'fregat', name: 'Fregat-M', dryMass: 1050, propellantMass: 5350, engine: S592, diameter: 3.35, length: 1.5, restartable: true, sepDelay: 2, ignitionDelay: 3, color: '#b8b0a0' },
    ],
    sites: ['baikonur', 'plesetsk', 'vostochny'], maxQ: 40e3, maxAccel: 60,
    // As Soyuz-2.1a; the Fregat finishes the orbit so the Blok I hands over on a shallow arc.
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    notes: 'R-7 family; four conical strap-on boosters, hot-staged third stage, restartable Fregat upper stage.',
  },
  {
    id: 'protonm', name: 'Proton-M / Briz-M', country: 'RU', manufacturer: 'Khrunichev',
    height: 58.2, payloadLEO: 23000, payloadGTO: 6920,
    fairing: { mass: 2000, diameter: 4.35, length: 15, sepAltitude: 120e3, color: '#e8e8e8' },
    stages: [
      // 4.1 m, not 7.4 m: audit item B23. 7.4 m is the SPAN across the six
      // outboard fuel tanks, and `VehicleModel.frontalArea()` turns the widest
      // attached stage diameter into a full circle — pi(7.4/2)^2 = 43.0 m^2
      // against a real frontal area of about 25 m^2 (the 4.1 m core, 13.2 m^2,
      // plus six ~1.6 m tanks, 12.1 m^2). Proton was flying with 70 % too much
      // drag through the whole atmospheric phase, which is also part of why it
      // is destroyed at 50 % payload.
      //
      // The tanks are NOT a BoosterGroupSpec: they feed the six RD-276 through
      // the flight and are jettisoned with the stage, so modelling them as
      // separable boosters would invent a staging event Proton does not have.
      // Instead the stage carries its real diameter and the vehicle carries a
      // `dragArea` override — the first use of a field that had been declared
      // and set by nothing (audit item B39).
      { id: 'p1', name: 'First stage (6× RD-276)', dryMass: 30600, propellantMass: 419400, engine: RD276, diameter: 4.1, length: 21.2, color: '#d9d9d9', accentColor: '#7a7a7a' },
      { id: 'p2', name: 'Second stage', dryMass: 11000, propellantMass: 156100, engine: RD0210, diameter: 4.1, length: 17, sepDelay: 0, ignitionDelay: 0, color: '#d9d9d9' },
      { id: 'p3', name: 'Third stage', dryMass: 3500, propellantMass: 46600, engine: RD0213, diameter: 4.1, length: 6.5, sepDelay: 1, ignitionDelay: 1, color: '#d9d9d9' },
      briz(),
    ],
    sites: ['baikonur'], maxQ: 40e3, maxAccel: 55,
    // The 4.1 m core plus six 1.6 m outboard tanks, as a reference area rather
    // than as a circle around the span (audit item B23). It is dropped once the
    // first stage separates in the sense that matters — the override is only
    // ever wider than what is left above it — and the fairing (4.35 m,
    // 14.9 m^2) is inside it too.
    dragArea: 25,
    // Heavy and draggy: it needs a fast pitch-over or it climbs too steeply and
    // falls back through the atmosphere.
    //
    // The loft follows the fleet's own rule — set for a stack whose next stage
    // lights below 0.4 g — applied to the stage that was exempt from it by
    // accident. The Briz-M lights at 19.6 kN under 22-30 t, i.e. 0.065-0.09 g,
    // by far the weakest hand-over in the fleet, and the lofted hand-off used to
    // skip it because `nextStageAccel` excludes a weak final stage (see
    // `GuidanceInputs.kickStageAccel`). Without it the third stage cut off level
    // at the insertion altitude and the Briz-M sank out of the orbit it was
    // meant to close: with 5.75 t aboard the insertion bottomed out at 94 km,
    // with 7.15 t the stack was destroyed at 46 kPa. With it the same 5.75 t
    // insertion bottoms out at 139 km. 150 km is the figure Angara-A5 already
    // carries for the same hardware above the same kind of hand-over.
    guidanceDefaults: { kickAngle: 6, maxTurnRate: 0.3, pitchMax: 25, loftAltitude: 150e3 },
    notes: 'Hypergolic heavy-lift launcher; Briz-M performs multi-burn GTO/GEO insertions.',
  },
  {
    id: 'angaraa5', name: 'Angara-A5 / Briz-M', country: 'RU', manufacturer: 'Khrunichev',
    height: 55.4, payloadLEO: 24500, payloadGTO: 5400,
    fairing: { mass: 2000, diameter: 4.35, length: 15, sepAltitude: 120e3, color: '#e8e8e8' },
    stages: [
      {
        id: 'urm1core', name: 'URM-1 core', dryMass: 9000, propellantMass: 128800, engine: RD191,
        diameter: 2.9, length: 25.7, color: '#f0f0f0', accentColor: '#c33', throttleWithBoosters: 0.3,
        boosters: [{ id: 'urm1', name: 'URM-1 boosters', count: 4, dryMass: 9000, propellantMass: 128800, engine: RD191, diameter: 2.9, length: 25.7, sepDelay: 1, color: '#f0f0f0' }],
      },
      { id: 'urm2', name: 'URM-2', dryMass: 4000, propellantMass: 35800, engine: RD0124A, diameter: 3.6, length: 6.9, sepDelay: 1, ignitionDelay: 1, color: '#f0f0f0' },
      briz(),
    ],
    sites: ['plesetsk', 'vostochny'], maxQ: 40e3, maxAccel: 50,
    // Low liftoff T/W with the core throttled to 30 %; lofts so that the URM-2 takes over climbing.
    guidanceDefaults: { kickAngle: 4, maxTurnRate: 0.3, pitchMax: 25, loftAltitude: 150e3 },
    notes: 'Modular kerolox launcher; core throttles to 30 % while four identical URM-1 boosters burn.',
  },
  {
    id: 'falcon9', name: 'Falcon 9 Block 5', country: 'US', manufacturer: 'SpaceX',
    height: 70, payloadLEO: 22800, payloadGTO: 8300, payloadSSO: 15000,
    fairing: { mass: 1900, diameter: 5.2, length: 13.1, sepAltitude: 110e3, color: '#f4f4f4' },
    stages: [
      // Published first-stage masses: 287 400 kg LOX + 123 500 kg RP-1 and a
      // 22 200 kg empty stage (Espace & Exploration no. 39, May 2017, as cited
      // by Wikipedia's "Falcon 9 Block 5"). The 395 700 / 25 600 kg flown before
      // cut the burn ~10 % short of five flights' webcast telemetry
      // (docs/VALIDATION.md, F1). Falcon Heavy's cores keep their own figures.
      { id: 's1', name: 'First stage (9× Merlin 1D)', dryMass: 22200, propellantMass: 410900, engine: MERLIN1D, diameter: 3.66, length: 42, color: '#f2f2f2', accentColor: '#1a1a1a', gridFins: true, legs: true },
      f9Stage2(),
    ],
    sites: ['cape', 'ksc39a', 'vandenberg'], maxQ: 40e3, maxAccel: 45,
    // 22 kPa, not the real ~33 kPa peak. Raising it was measured across
    // 26/30/33 kPa and with the bucket removed (table in docs/PHYSICS.md §6a):
    // the max-Q marker only reaches T+61 s even with no throttle-down at all,
    // still short of the published 65-80 s, because when q peaks is set by the
    // ascent profile rather than by the bucket. With the published first-stage
    // masses MECO and fairing jettison stay inside their windows either way,
    // but a later, deeper bucket moves the early ascent further from five
    // flights' webcast telemetry (docs/VALIDATION.md), so it stays.
    maxQThrottle: { qStart: 22e3, qEnd: 22e3, throttle: 0.75 },
    // A return to the launch site keeps 15 % instead: measured on Bandwagon-1
    // (1.3 t to 590 km at 45.4°), 13 % is the least that lands on LZ-1 in the
    // point-mass model, and 15 % touches down with 13.0 t to spare (both with
    // the published first-stage masses above).
    recoverable: true, recoveryReserve: 0.12, returnReserve: 0.15, crewCapable: true,
    // Shallow kick and a slow pitch program put MECO near 65 km, which is what the published timeline implies.
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    // Flown as a rigid body the stack cannot make the point-mass program's late
    // dive (the load relief holds it within 15° of the wind), so the 1.5° kick
    // left it climbing too steeply: the flight-path angle 5-20° above five
    // flights' webcast telemetry from T+40 s and ~10 km high by T+140 s. A 3.5°
    // kick was fitted on CRS-16, Iridium NEXT 8 and GPS III SV01 and checked on
    // SSO-A and Bangabandhu-1 (docs/VALIDATION.md, F5).
    guidanceDefaultsSixDof: { kickAngle: 3.5 },
    notes: 'Partially reusable; enabling booster recovery reserves propellant for the boost-back/landing burns.',
  },
  {
    id: 'falconheavy', name: 'Falcon Heavy', country: 'US', manufacturer: 'SpaceX',
    height: 70, payloadLEO: 63800, payloadGTO: 26700,
    fairing: { mass: 1900, diameter: 5.2, length: 13.1, sepAltitude: 110e3, color: '#f4f4f4' },
    stages: [
      {
        // The centre core's real differences from a side booster are its heavier
        // structure and the throttle-down while the sides burn, and both are
        // modelled below; it used to point at a `MERLIN1D_FH_CORE` alias that
        // was `{ ...MERLIN1D }` with no overrides, implying a distinction in the
        // engine that the data did not carry.
        id: 'core', name: 'Center core', dryMass: 28000, propellantMass: 395700, engine: MERLIN1D,
        diameter: 3.66, length: 42, color: '#f2f2f2', accentColor: '#1a1a1a', gridFins: true, legs: true,
        throttleWithBoosters: 0.55,
        boosters: [f9Booster('side', 'Side boosters', 2)],
      },
      f9Stage2(),
    ],
    sites: ['cape', 'ksc39a'], maxQ: 40e3, maxAccel: 45,
    // Side boosters flown back to LZ-1 and LZ-2 keep 15 %: at 12 % they run
    // into their landing reserve before the boostback is done (Arabsat-6A,
    // 6.5 t to GTO, point-mass model).
    recoverable: true, recoveryReserve: 0.12, returnReserve: 0.15,
    // As Falcon 9, with a loft for the long second-stage burn under a heavy payload.
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.3, pitchMax: 25, loftAltitude: 150e3 },
    notes: 'Three Falcon 9 cores; the center core throttles down until side-booster separation.',
  },
  {
    id: 'atlasv551', name: 'Atlas V 551', country: 'US', manufacturer: 'ULA',
    height: 62.2, payloadLEO: 18850, payloadGTO: 8900,
    fairing: { mass: 3524, diameter: 5.4, length: 20.7, sepAltitude: 110e3, color: '#f4f4f4' },
    stages: [
      {
        id: 'ccb', name: 'Common Core Booster (RD-180)', dryMass: 21054, propellantMass: 284089, engine: RD180,
        diameter: 3.81, length: 32.5, color: '#c8792a', accentColor: '#7a4a17',
        // GEM-63 inert mass 5 100 kg = the 49 300 kg gross minus the 44 200 kg
        // grain quoted on the same page. https://en.wikipedia.org/wiki/Atlas_V
        boosters: [{ id: 'gem63', name: 'GEM-63 solid boosters', count: 5, dryMass: 5100, propellantMass: 44200, engine: GEM63, diameter: 1.6, length: 20, sepDelay: 5, color: '#f4f4f4' }],
      },
      { id: 'centaur3', name: 'Centaur III (RL10C-1)', dryMass: 2243, propellantMass: 20830, engine: RL10C1, diameter: 3.05, length: 12.7, restartable: true, sepDelay: 3, ignitionDelay: 10, color: '#e5e5e5' },
    ],
    sites: ['cape', 'vandenberg'], maxQ: 45e3, maxAccel: 49,
    maxQThrottle: { qStart: 22e3, qEnd: 22e3, throttle: 0.6 },
    // Five solids give a high initial T/W so it turns early; the loft is what the low-thrust Centaur III needs.
    guidanceDefaults: { kickAngle: 6, maxTurnRate: 0.3, pitchMax: 25, loftAltitude: 150e3 },
    // As a rigid body the booster cannot hold the 25-35° angle of attack the point
    // mass pitches over at near max-Q, and hands the Centaur a flatter arc; a
    // larger kick gives the same hand-off without it (docs/SIXDOF-ACCEPTANCE.md).
    guidanceDefaultsSixDof: { kickAngle: 8 },
    notes: 'Five solid boosters, kerolox core and a high-Isp hydrogen Centaur upper stage. The RD-180 throttles down through max-Q.',
  },
  {
    id: 'vulcan', name: 'Vulcan Centaur VC4', country: 'US', manufacturer: 'ULA',
    // VC4 ratings, which is what the record is named for. 24 400 / 12 100 kg is
    // the VC6 class (25 600 / 14 400 with six GEM-63XL); VC4 is 21 400 kg to the
    // ISS orbit, 11 600 kg to GTO and 18 500 kg to sun-synchronous.
    // https://en.wikipedia.org/wiki/Vulcan_Centaur  — audit item B26.
    height: 61.6, payloadLEO: 21400, payloadGTO: 11600, payloadSSO: 18500,
    fairing: { mass: 3500, diameter: 5.4, length: 15.5, sepAltitude: 110e3, color: '#f4f4f4' },
    stages: [
      {
        // AUDIT ITEM B21 — the one finding whose two verifiers pointed in
        // opposite directions, decided here from the primary evidence.
        //
        // The candidates were 353 400 kg (Wikipedia's 382 000 kg gross minus
        // 28 600 kg dry) and 481 700 kg (366 500 kg LOX + 115 200 kg LNG).
        // Three independent checks all pick the larger one:
        //
        //  1. ULA's own LNG load is 254 000 lb = 115 200 kg
        //     ( https://www.nasaspaceflight.com/2024/01/vulcan-launch-peregrine-inaugural-flight/ ).
        //     With Wikipedia's gross that leaves 238 200 kg of LOX, a mixture
        //     ratio of 2.07 — methalox runs near 3.4-3.6, and the BE-4 cannot
        //     be flown a third oxidiser-lean.
        //  2. ULA says the core holds "more than a million pounds of liquid
        //     propellant, about 50 percent more propellant mass than the
        //     Atlas 5's first stage"
        //     ( https://spaceflightnow.com/2021/08/25/ula-readies-vulcan-booster-for-cryogenic-tanking-test/ ).
        //     Atlas V's CCB is 284 089 kg in this file, so 50 % more is
        //     426 000 kg and "more than a million pounds" is >453 600 kg.
        //     481 700 kg is 1 062 000 lb and clears both; 353 400 kg is
        //     779 000 lb and clears neither.
        //  3. Burn time. At the model's own mass flow (2 x 2 600 kN / 340 s vac
        //     = 1 559 kg/s) the old 430 000 kg burned 275.8 s against a
        //     published 299 s, and 353 400 kg would burn 227 s — 24 % short and
        //     measurably WORSE against the published-timeline goal. 481 700 kg
        //     burns 309 s, which the max-Q throttle bucket lengthens further,
        //     bracketing 299 s from the other side.
        //
        // Wikipedia's 382 000 kg gross is simply inconsistent with its own
        // 4 893 kN / 299 s pair (that combination needs ~439 t at full flow),
        // which is probably where the file's 430 000 kg came from in the first
        // place. Both verifiers agreed on the dry mass, and it is taken as
        // published.
        id: 'v1', name: 'First stage (2× BE-4)', dryMass: 28600, propellantMass: 481700, engine: BE4,
        diameter: 5.4, length: 33.3, color: '#f4f4f4', accentColor: '#c0392b',
        // GEM-63XL inert mass 5 177 kg, grain 47 853 kg — both published.
        // https://en.wikipedia.org/wiki/Graphite-Epoxy_Motor  (the audit's
        // "~4 521 kg" is not on that page; 5 177 kg is the 53 030 kg gross minus
        // the 47 853 kg grain, and the two agree to the kilogram.)
        boosters: [{ id: 'gem63xl', name: 'GEM-63XL solid boosters', count: 4, dryMass: 5177, propellantMass: 47853, engine: GEM63XL, diameter: 1.6, length: 22, sepDelay: 6, color: '#f4f4f4' }],
      },
      { id: 'centaur5', name: 'Centaur V (2× RL10C-1-1)', dryMass: 5000, propellantMass: 54000, engine: RL10C11_X2, diameter: 5.4, length: 11.7, restartable: true, sepDelay: 3, ignitionDelay: 10, color: '#e5e5e5' },
    ],
    sites: ['cape', 'vandenberg'], maxQ: 45e3, maxAccel: 49,
    maxQThrottle: { qStart: 25e3, qEnd: 25e3, throttle: 0.7 },
    // Centaur V has a thrust-to-weight near 0.3, so the booster has to hand over
    // climbing — but with the audited 481.7 t first stage (see B21 above) the
    // booster now burns 309 s instead of 276 s, and a 150 km loft on top of that
    // is more than the Centaur can hold: vulcan/iss/50 flattened and broke up at
    // T+1233 s. Measured over kick 1.5-6 deg x rate 0.3/0.45 x loft 0-250 km x
    // pitch ceiling 25/35 deg (96 guidance points x 9 fleet rows), 80 km is the
    // loft that takes every row the vehicle has the delta-v for: leo and iss at
    // 25 % and 50 %, all three GTO rows, insertion T+999-1182 s. The two 90 %
    // rows stay lost at every point in that grid, which is why they are still
    // KNOWN_GUIDANCE_FAILURES rather than a tuning gap.
    //
    // `parkingAltitude: 250e3` is the other half, and it is a statement about
    // the stage rather than a fitted constant. The library default asks every
    // vehicle for a 200 km parking orbit; Centaur V is a high-energy hydrogen
    // stage that arrives fast and shallow, and aimed at 200 km it cut off on the
    // apoapsis with the perigee still at 137-150 km — 50-60 km under the orbit
    // it had been asked for, on every one of the 96 guidance points swept. Aimed
    // at 250 km, which is where ULA's own low-orbit insertions sit, it closes
    // the transfer it was given: measured 238-250 x 497 km. The 9-row matrix is
    // unchanged by it (leo/iss 25-50 % and all three GTO rows accepted) and the
    // ascent auto-tuner, which grades a candidate against the orbit the PLAN
    // asked for, stops reporting every point in its grid as an insertion miss.
    // Centaur V lights at 0.27-0.3 g under a near-rated payload and cannot hold
    // altitude at any attitude, so the core has to hand it a high, climbing
    // arc: 40° of pitch authority and a 150 km loft. At 30° / 80 km the 90 %
    // LEO and ISS rows fell back into the air with 3.4-3.6 km/s aboard.
    guidanceDefaults: { kickAngle: 3, maxTurnRate: 0.3, pitchMax: 40, loftAltitude: 150e3, parkingAltitude: 250e3 },
    notes: 'Methalox first stage with up to six solids; Centaur V is a long-coast hydrogen upper stage.',
  },
  {
    id: 'ariane64', name: 'Ariane 64', country: 'EU', manufacturer: 'ArianeGroup',
    height: 62, payloadLEO: 21600, payloadGTO: 11500, payloadSSO: 15000,
    fairing: { mass: 2900, diameter: 5.4, length: 20, sepAltitude: 115e3, sepTime: 200, color: '#f4f4f4' },
    stages: [
      {
        id: 'llpm', name: 'Core (Vulcain 2.1)', dryMass: 15700, propellantMass: 145000, engine: VULCAIN21,
        diameter: 5.4, length: 29, color: '#f4f4f4', accentColor: '#1d4f91',
        boosters: [{ id: 'p120c', name: 'P120C solid boosters', count: 4, dryMass: 13000, propellantMass: 142000, engine: P120C, diameter: 3.4, length: 13.5, sepDelay: 2, color: '#f4f4f4' }],
      },
      { id: 'ulpm', name: 'Upper stage (Vinci)', dryMass: 5300, propellantMass: 31000, engine: VINCI, diameter: 5.4, length: 11.6, restartable: true, sepDelay: 3, ignitionDelay: 6, color: '#f4f4f4' },
    ],
    sites: ['kourou'], maxQ: 55e3, maxAccel: 45,
    // P120C solids turn the vehicle quickly; the Vinci upper stage needs the loft.
    // pitchMin 10: with the P120Cs still burning the closed loop used to
    // command the stack level or slightly nose-down at 70 km (it sees the
    // boosters' thrust, not the 0.84 g core that is left after they drop), and
    // the Vulcain then spent its burn climbing back — handing Vinci a sagging
    // arc under 13.5-19.4 t. Never pitching below 10° keeps that altitude.
    guidanceDefaults: { kickAngle: 6, maxTurnRate: 0.3, pitchMax: 35, pitchMin: 10, loftAltitude: 150e3 },
    notes: 'Hydrogen core with four P120C solids; the Vinci upper stage restarts for multi-orbit missions.',
  },
  {
    // Avio / ESA Vega-C. Stage masses, thrusts, Isp and burn times:
    // https://en.wikipedia.org/wiki/Vega_C  (P120C 141 400 kg / 135.7 s,
    // Z40 36 239 kg / 92.9 s, Z9 10 567 kg / 119.6 s, AVUM+ 740 kg / 2.42 kN /
    // 315.8 s, liftoff 210 t, 3.3 m fairing, 2 300 kg to the 700 km polar
    // reference orbit). Motor qualification: https://www.esa.int/Enabling_Support/Space_Transportation/Vega/Vega-C
    id: 'vegac', name: 'Vega-C', country: 'EU', manufacturer: 'Avio / ESA',
    // `payloadLEO` is the fleet-wide convention: the capability to a LOW (about
    // 200 km) reference orbit, which ESA quotes as 3.3 t
    // (https://www.esa.int/Enabling_Support/Space_Transportation/Vega/Vega-C).
    // The widely-quoted 2 300 kg is the *reference mission*, 700 km polar, and
    // is carried in `payloadSSO` where it belongs — grading Vega-C's fleet
    // matrix against 2 300 kg would have made its acceptance record look better
    // than every other vehicle's for no physical reason.
    height: 34.8, payloadLEO: 3300, payloadGTO: 0, payloadSSO: 2300,
    // Vega-C drops the fairing at about T+3:40. `sepAltitude` is only the
    // fallback ceiling — the simulation jettisons on the free-molecular heating
    // placard, which this trajectory clears at T+187 s and ~112 km.
    fairing: { mass: 500, diameter: 3.3, length: 9.0, sepAltitude: 120e3, sepTime: 220, color: '#f0f0f0' },
    stages: [
      // published burn time 135.7 s (booster burnout ~T+135 s)
      { id: 'p120c', name: 'P120C (first stage)', dryMass: 11200, propellantMass: 141400, engine: P120C, diameter: 3.4, length: 13.5, color: '#f0f0f0', accentColor: '#1d4f91' },
      // published burn time 92.9 s
      { id: 'z40', name: 'Zefiro 40 (second stage)', dryMass: 3230, propellantMass: 36239, engine: ZEFIRO40, diameter: 2.3, length: 7.6, sepDelay: 1, ignitionDelay: 1, color: '#f0f0f0' },
      // published burn time 119.6 s
      { id: 'z9', name: 'Zefiro 9 (third stage)', dryMass: 929, propellantMass: 10567, engine: ZEFIRO9, diameter: 1.9, length: 4.12, sepDelay: 2, ignitionDelay: 2, color: '#f0f0f0' },
      { id: 'avum', name: 'AVUM+ (fourth stage)', dryMass: 695, propellantMass: 740, engine: AVUM_PLUS, diameter: 2.18, length: 2.04, restartable: true, sepDelay: 2, ignitionDelay: 4, color: '#d8d8d8' },
    ],
    sites: ['kourou'], maxQ: 55e3, maxAccel: 60,
    // Three solid stages that cannot throttle or shut down, then a 2.4 kN kick
    // stage at 0.06 g. The stack has to arrive at Z9 burnout already high and
    // fast, so it lofts; the P120C turns quickly (high T/W) and the pitch
    // ceiling is left wide so closed-loop guidance can hold the arc up.
    guidanceDefaults: { kickAngle: 6, maxTurnRate: 0.45, pitchMax: 35, loftAltitude: 150e3 },
    notes: 'Three solid stages (P120C, Zefiro 40, Zefiro 9) and the restartable liquid AVUM+ kick stage. The P120C is shared with Ariane 6 as a strap-on.',
  },
  {
    // SAST Long March 2D. Stage data: Encyclopedia Astronautica CZ-2D
    // (stage 1 L-180 gross 192 700 / empty 9 500 / 170 s, stage 2 L-35 gross
    // 39 550 / empty 4 000 / 135 s) cross-checked against
    // https://en.wikipedia.org/wiki/Long_March_2D (232 250 kg liftoff,
    // 2 961.6 kN, 41.056 m, 3.35 m, 3 500 kg LEO / 1 300 kg SSO, flies from
    // Jiuquan, Taiyuan and Xichang). http://www.astronautix.com/c/changzheng2d.html
    id: 'longmarch2d', name: 'Long March 2D', country: 'CN', manufacturer: 'SAST',
    height: 41.06, payloadLEO: 3500, payloadGTO: 0, payloadSSO: 1300,
    fairing: { mass: 800, diameter: 3.35, length: 6.98, sepAltitude: 120e3, sepTime: 220, color: '#f0f0f0' },
    stages: [
      // published burn time 170 s (first/second stage separation ~T+160 s)
      { id: 'cz2d1', name: 'First stage (YF-21C, 4× YF-20C)', dryMass: 9500, propellantMass: 183200, engine: YF21C, diameter: 3.35, length: 27.91, color: '#f0f0f0', accentColor: '#b0332a' },
      // published burn time 135 s
      { id: 'cz2d2', name: 'Second stage (YF-24C)', dryMass: 4000, propellantMass: 35550, engine: YF24C, diameter: 3.35, length: 10.9, sepDelay: 1, ignitionDelay: 1, color: '#f0f0f0' },
    ],
    sites: ['jiuquan', 'taiyuan', 'xichang'], maxQ: 45e3, maxAccel: 60,
    // Two hypergolic stages with no restart: the second stage has to fly the
    // insertion in one burn, so the ascent stays shallow and finishes climbing
    // on the second stage rather than lofting.
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    notes: "China's workhorse for sun-synchronous remote-sensing satellites: two hypergolic stages, flown from all three inland launch centres.",
  },
  {
    // CALT Long March 3B/E. https://en.wikipedia.org/wiki/Long_March_3B
    // 458 970 kg liftoff, 56.3 m; 4 boosters of 41 100 kg at 740.4 kN / 140 s;
    // first stage 186 200 kg at 2 961.6 kN / 158 s; second stage 49 400 kg at
    // 742 kN, Isp 298 s / 185 s; third stage 2× YF-75 at 167.17 kN, Isp 438 s /
    // 478 s; 5 500 kg to GTO from Xichang.
    id: 'longmarch3be', name: 'Long March 3B/E', country: 'CN', manufacturer: 'CALT',
    height: 56.3, payloadLEO: 11500, payloadGTO: 5500,
    // CZ-3B/E drops the fairing at about T+215 s. On the heating placard alone
    // this trajectory shed it at T+223 s, ~4 % late and outside the 2 % band a
    // point callout is quoted to; flown on the published time, like the other
    // operators who publish one.
    fairing: { mass: 2000, diameter: 4.2, length: 9.56, sepAltitude: 115e3, sepTime: 215, color: '#f0f0f0' },
    stages: [
      // published burn time 158 s (stage separation ~T+158 s); boosters 140 s, separation ~T+140 s
      {
        id: 'cz3b1', name: 'First stage (YF-21C, 4× YF-20C)', dryMass: 9800, propellantMass: 186200, engine: YF21C,
        diameter: 3.35, length: 24.76, color: '#f0f0f0', accentColor: '#b0332a',
        boosters: [{ id: 'cz3bb', name: 'Liquid strap-on boosters (YF-25)', count: 4, dryMass: 3000, propellantMass: 41100, engine: YF25, diameter: 2.25, length: 16.1, sepDelay: 2, conicalTop: true, color: '#f0f0f0' }],
      },
      // published burn time 185 s
      { id: 'cz3b2', name: 'Second stage (YF-24E)', dryMass: 4000, propellantMass: 49400, engine: YF24C, diameter: 3.35, length: 12.92, sepDelay: 1, ignitionDelay: 1, color: '#f0f0f0' },
      // published burn time 478 s
      { id: 'cz3b3', name: 'Third stage (2× YF-75, cryogenic)', dryMass: 2800, propellantMass: 18200, engine: YF75_X2, diameter: 3.0, length: 12.38, restartable: true, sepDelay: 2, ignitionDelay: 4, color: '#f0f0f0' },
    ],
    sites: ['xichang'], maxQ: 45e3, maxAccel: 55,
    // Four liquid strap-ons give a 1.34 liftoff T/W, so the turn starts early;
    // the hydrogen third stage is a long, gentle burn that needs the ascent
    // handed over high, hence the loft and the tighter pitch ceiling.
    guidanceDefaults: { kickAngle: 4, maxTurnRate: 0.3, pitchMax: 25, loftAltitude: 150e3 },
    notes: "China's main geostationary launcher: four liquid strap-ons, two hypergolic stages and a restartable YF-75 hydrogen third stage.",
  },
  {
    // MHI / JAXA H-IIA 202, retired after flight 50 on 28 June 2025.
    // https://en.wikipedia.org/wiki/H-IIA  (LE-7A 1 098 kN / 440 s / 390 s burn,
    // first stage 100 t propellant of a 113.6 t stage; SRB-A 2 260 kN peak,
    // 120 s quoted burn; LE-5B 137 kN / 447 s / 534 s; 53 m; 4.1 t to GTO from
    // Tanegashima). SRB-A grain and inert masses, burnout ~100 s and separation
    // ~108 s are the audited figures.
    id: 'h2a202', name: 'H-IIA 202 (historical)', country: 'JP', manufacturer: 'MHI / JAXA',
    height: 53, payloadLEO: 10000, payloadGTO: 4100, payloadSSO: 3600,
    // 4S fairing; H-IIA jettisons it at about T+4:05 near 150 km. As elsewhere
    // this is only the fallback ceiling: the heating placard fires first, at
    // T+164-172 s on these trajectories.
    fairing: { mass: 1400, diameter: 4.07, length: 12, sepAltitude: 150e3, sepTime: 250, color: '#f4f4f4' },
    stages: [
      // published core cut-off ~396 s (390 s quoted burn time)
      {
        // THE PUBLISHED MASSES, as of this wave. Encyclopedia Astronautica
        // H-2A-1: gross 113 600 kg / empty 13 600 kg / propellant 100 000 kg
        // ( http://www.astronautix.com/h/h-2a-1.html , agreeing with
        // https://en.wikipedia.org/wiki/H-IIA ).
        //
        // The file carried 12 000 kg for a year, and the reason was never
        // physical: it was tests/ascent.test.ts's fleet-wide
        // `idealDeltaV > 9 500 m/s` sanity floor, measured at 9 528 m/s with
        // 12 000 / 2 800 kg and 9 390 m/s with the published pair. That
        // measurement was made with the PRE-B13 delta-v accounting, which
        // ignored the parallel boosters and the fairing; with B13's correction
        // the same vehicle measures 12 121 m/s and the published masses clear
        // the floor with 2.5 km/s to spare. The floor did not have to move
        // after all, and the previous wave's hand-off said to re-measure rather
        // than lower it. Re-measured, and the deviation is gone.
        id: 'h2a1', name: 'First stage (LE-7A)', dryMass: 13600, propellantMass: 100000, engine: LE7A,
        diameter: 4.0, length: 37.2, color: '#e2762a', accentColor: '#f4f4f4',
        // published burnout ~100 s, separation ~108 s
        boosters: [{ id: 'srba', name: 'SRB-A3 solid boosters', count: 2, dryMass: 8700, propellantMass: 66800, engine: SRB_A, diameter: 2.5, length: 15.1, sepDelay: 8, color: '#f4f4f4' }],
      },
      // published burn time 534 s. Masses from Encyclopedia Astronautica
      // H-2A-2 (gross 19 600 kg, empty 3 000 kg):
      // http://www.astronautix.com/h/h-2a-2.html . The 2 800 kg the file used to
      // carry was the same non-physical deviation as the first stage's
      // 12 000 kg, and it is gone with it.
      { id: 'h2a2', name: 'Second stage (LE-5B)', dryMass: 3000, propellantMass: 16600, engine: LE5B, diameter: 4.0, length: 9.2, restartable: true, sepDelay: 6, ignitionDelay: 6, color: '#f4f4f4' },
    ],
    sites: ['tanegashima'], maxQ: 40e3, maxAccel: 50,
    // Two SRB-A give a 1.75 liftoff T/W and burn out at T+100 s, after which the
    // LE-7A pushes a light core for another five minutes: the vehicle has to be
    // well over on its side before the solids go, or the core spends its whole
    // burn climbing and the 137 kN LE-5B is handed a steep, slow trajectory. A
    // 4° kick was measured at 11 of the 12 fleet cases against 7 for 1.5°; with
    // the sourced propellant loads it now takes all nine of its non-geometry
    // cases (the three sun-synchronous rows are ruled out by Tanegashima's
    // azimuth corridor). No loft: the core burn is long enough to place the
    // apogee by itself.
    guidanceDefaults: { kickAngle: 4, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    notes: 'Retired 28 June 2025 after 50 flights. Hydrogen LE-7A core with two SRB-A solids and a restartable LE-5B upper stage; the direct ancestor of H3.',
  },
  {
    // https://en.wikipedia.org/wiki/Long_March_5 — core CZ-5-500 gross
    // 186 900 kg / propellant 165 300 kg / 492 s; booster CZ-5-300 gross
    // 156 600 kg each / 173 s; liftoff 851 800 kg; 25 t to a 200 km LEO,
    // 14 t to GTO, 15 t to a 700 km sun-synchronous orbit.
    id: 'longmarch5', name: 'Long March 5', country: 'CN', manufacturer: 'CALT',
    height: 57, payloadLEO: 25000, payloadGTO: 14000, payloadSSO: 15000,
    fairing: { mass: 3000, diameter: 5.2, length: 12.3, sepAltitude: 120e3, color: '#f4f4f4' },
    stages: [
      {
        // The tankage was 27 t (3 %) light against the published liftoff mass,
        // which inflated the liftoff thrust-to-weight to 1.29 against a real
        // 1.27. Core and boosters are now the published gross masses: 21 600 +
        // 165 300 and 12 000 + 144 600, which puts the stack at 846.8 t dry of
        // payload. Burn times follow at 498 s (published 492) and 177 s
        // (published 173), both inside the file's 10 % convention.
        id: 'cz5core', name: 'Core (2× YF-77)', dryMass: 21600, propellantMass: 165300, engine: YF77,
        diameter: 5.0, length: 33, color: '#f4f4f4', accentColor: '#1f5fbf',
        boosters: [{ id: 'k3', name: 'Kerolox boosters (2× YF-100 each)', count: 4, dryMass: 12000, propellantMass: 144600, engine: YF100_X2, diameter: 3.35, length: 26.3, sepDelay: 3, color: '#f4f4f4' }],
      },
      { id: 'cz5s2', name: 'Second stage (2× YF-75D)', dryMass: 5500, propellantMass: 25000, engine: YF75D_X2, diameter: 5.0, length: 12, restartable: true, sepDelay: 2, ignitionDelay: 4, color: '#f4f4f4' },
    ],
    sites: ['wenchang'], maxQ: 40e3, maxAccel: 45,
    // Hydrogen core with kerolox boosters: a gentle turn keeps the long core burn efficient.
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.45, pitchMax: 35, loftAltitude: 0 },
    notes: "China's heavy-lift launcher: hydrogen core with four kerolox boosters.",
  },
  {
    id: 'h3', name: 'H3-22', country: 'JP', manufacturer: 'MHI / JAXA',
    height: 63, payloadLEO: 10000, payloadGTO: 4000, payloadSSO: 4000,
    fairing: { mass: 2400, diameter: 5.2, length: 12, sepAltitude: 120e3, color: '#f4f4f4' },
    stages: [
      {
        id: 'h3s1', name: 'First stage (2× LE-9)', dryMass: 20000, propellantMass: 225000, engine: LE9_X2,
        diameter: 5.2, length: 37, color: '#f4f4f4', accentColor: '#d35400',
        boosters: [{ id: 'srb3', name: 'SRB-3 solid boosters', count: 2, dryMass: 8700, propellantMass: 66800, engine: SRB3, diameter: 2.5, length: 14.6, sepDelay: 6, color: '#f4f4f4' }],
      },
      { id: 'h3s2', name: 'Second stage (LE-5B-3)', dryMass: 3700, propellantMass: 23300, engine: LE5B3, diameter: 5.2, length: 12, restartable: true, sepDelay: 3, ignitionDelay: 5, color: '#f4f4f4' },
    ],
    sites: ['tanegashima'], maxQ: 40e3, maxAccel: 45,
    // Two SRB-3 and a high-Isp core; the shallow kick matches the published SRB separation time.
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    notes: 'Expander-bleed LE-9 hydrogen engines with two SRB-3 solids.',
  },
  {
    id: 'pslvxl', name: 'PSLV-XL', country: 'IN', manufacturer: 'ISRO',
    height: 44, payloadLEO: 3800, payloadGTO: 1425, payloadSSO: 1750,
    fairing: { mass: 1150, diameter: 3.2, length: 8.3, sepAltitude: 115e3, color: '#f4f4f4' },
    stages: [
      {
        id: 'ps1', name: 'PS1 (S139 solid)', dryMass: 30200, propellantMass: 138200, engine: S139,
        diameter: 2.8, length: 20, color: '#f4f4f4', accentColor: '#e67e22',
        boosters: [
          { id: 'psomg', name: 'PSOM-XL (ground-lit)', count: 4, dryMass: 2010, propellantMass: 12200, engine: PSOM_XL, diameter: 1.0, length: 12, sepDelay: 2, color: '#f4f4f4' },
          { id: 'psoma', name: 'PSOM-XL (air-lit)', count: 2, dryMass: 2010, propellantMass: 12200, engine: PSOM_XL, diameter: 1.0, length: 12, igniteAt: 25, sepDelay: 2, color: '#f4f4f4' },
        ],
      },
      { id: 'ps2', name: 'PS2 (Vikas)', dryMass: 5300, propellantMass: 41000, engine: VIKAS, diameter: 2.8, length: 12.8, sepDelay: 1, ignitionDelay: 1, color: '#f4f4f4' },
      { id: 'ps3', name: 'PS3 (HPS3 solid)', dryMass: 1100, propellantMass: 7600, engine: HPS3, diameter: 2.0, length: 3.6, sepDelay: 2, ignitionDelay: 2, color: '#f4f4f4' },
      { id: 'ps4', name: 'PS4 (2× L-2-5)', dryMass: 920, propellantMass: 2500, engine: PS4_L25, diameter: 1.3, length: 2.6, restartable: true, sepDelay: 2, ignitionDelay: 3, color: '#f4f4f4' },
    ],
    sites: ['sriharikota'], maxQ: 70e3, maxAccel: 60,
    // Four alternating stages; a gentle turn keeps PS2 high enough for the solid PS3.
    // An 80 km loft: the 0.2 g PS4 cannot hold altitude, so PS3 hands it over
    // climbing instead of level at 210 km.
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.3, pitchMax: 25, loftAltitude: 80e3 },
    notes: 'Four alternating solid/liquid stages; two of six strap-ons are air-lit at T+25 s.',
  },
  {
    id: 'electron', name: 'Electron', country: 'NZ/US', manufacturer: 'Rocket Lab',
    height: 18, payloadLEO: 300, payloadGTO: 0, payloadSSO: 200,
    fairing: { mass: 50, diameter: 1.2, length: 2.5, sepAltitude: 105e3, color: '#111' },
    stages: [
      { id: 'e1', name: 'First stage (9× Rutherford)', dryMass: 850, propellantMass: 9700, engine: RUTHERFORD, diameter: 1.2, length: 12.1, color: '#111', accentColor: '#333' },
      { id: 'e2', name: 'Second stage (Rutherford Vacuum)', dryMass: 220, propellantMass: 2300, engine: RUTHERFORD_VAC, diameter: 1.2, length: 2.4, sepDelay: 1, ignitionDelay: 2, color: '#111' },
      { id: 'curie', name: 'Curie kick stage', dryMass: 30, propellantMass: 150, engine: CURIE, diameter: 1.2, length: 0.5, restartable: true, sepDelay: 2, ignitionDelay: 3, color: '#222' },
    ],
    sites: ['mahia', 'wallops'], maxQ: 50e3, maxAccel: 60,
    // Small and high T/W: it turns over quickly, which is why max-Q comes at about 65 s.
    guidanceDefaults: { kickAngle: 6, maxTurnRate: 0.45, pitchMax: 35, loftAltitude: 0 },
    notes: 'Small carbon-composite launcher with electric-pump Rutherford engines and a Curie kick stage.',
  },
  {
    id: 'starship', name: 'Starship (Super Heavy)', country: 'US', manufacturer: 'SpaceX',
    height: 123, payloadLEO: 100000, payloadGTO: 27000,
    fairing: null,
    stages: [
      { id: 'superheavy', name: 'Super Heavy (33× Raptor)', dryMass: 220000, propellantMass: 3500000, engine: RAPTOR_SL_X33, diameter: 9, length: 71, color: '#a8a9ad', accentColor: '#3b3b3b', gridFins: true },
      { id: 'ship', name: 'Ship (3× Raptor + 3× RVac)', dryMass: 130000, propellantMass: 1500000, engine: RAPTOR_SHIP, diameter: 9, length: 52, restartable: true, sepDelay: 0, ignitionDelay: 0, color: '#a8a9ad', accentColor: '#1c1c1c', flaps: true },
    ],
    sites: ['starbase', 'cape'], maxQ: 35e3, maxAccel: 40,
    maxQThrottle: { qStart: 25e3, qEnd: 25e3, throttle: 0.8 },
    // Flown back to the tower's arms Super Heavy keeps 11 %: 9 % is the least
    // the arms catch it with (point-mass, 15.6 t to a 500 km orbit), 11 %
    // arrives with 72 t to spare.
    recoverable: true, recoveryReserve: 0.07, returnReserve: 0.11, crewCapable: true,
    // Very high T/W and a hot-staged ship; a shallow kick keeps max-Q inside the 35 kPa placard.
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    notes: 'Fully reusable two-stage methalox system; hot-staged ship, integrated payload bay (no fairing).',
  },
];

export const vehicleById = (id: string): VehicleSpec => {
  const v = VEHICLES.find((x) => x.id === id);
  if (!v) throw new Error(`Unknown vehicle ${id}`);
  return v;
};

/** A vehicle of the catalogue above (as against a custom one, roadmap S02). */
export const isCatalogueVehicle = (id: string): boolean => VEHICLES.some((x) => x.id === id);

/**
 * The vehicle a mission flies (roadmap S02): its inline spec when it carries a
 * custom vehicle, else the catalogue's. The one way to resolve a mission's
 * vehicle — the simulation, the flight worker, the auto-tuner and the Monte
 * Carlo workers (which get the spec inside the config they are sent), the
 * setup panel and WebMCP all come through here.
 */
export function missionVehicle(cfg: { vehicleId: string; vehicleSpec?: VehicleSpec }): VehicleSpec {
  if (!cfg.vehicleSpec) return vehicleById(cfg.vehicleId);
  if (cfg.vehicleSpec.id !== cfg.vehicleId) throw new Error(`The mission's vehicle ${cfg.vehicleId} is not its custom vehicle ${cfg.vehicleSpec.id}`);
  return cfg.vehicleSpec;
}

/**
 * The id a vehicle's id-keyed data are looked up by (roadmap S02): its own,
 * or, for a custom vehicle made from a catalogue one, that vehicle's
 * (`VehicleSpec.derivedFrom`). A custom vehicle with no origin keys nothing
 * and gets the generic behaviour.
 */
export const vehicleDataId = (spec: VehicleSpec): string => spec.derivedFrom ?? spec.id;
