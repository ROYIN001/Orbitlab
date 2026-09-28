/**
 * Roadmap D01: the parts catalogue. The engines, stage bodies, strap-on
 * bodies and fairings that the 21 catalogue vehicles in src/data/vehicles.ts
 * are built from: 55 engine parts, 50 stage bodies, 14 strap-on bodies and
 * 17 fairings.
 *
 * UPSTREAM OF THE SPEC, NOT A REPLACEMENT. A vehicle is still a `VehicleSpec`
 * and the physics still only ever sees a spec. The catalogue is where a spec's
 * hardware numbers come from, through the emitters at the end of this file,
 * and `VehicleSpec` carries no reference back to a part. So the validator's
 * field lists (src/config/vehicle-spec.ts), mission files and design files are
 * untouched. The re-expressed fleet emits the very specs the literals did
 * before D01: tests/d01-vehicles-identity.test.ts compares them value for
 * value with a fixture recorded before this file existed, and
 * tests/d01-fleet-fingerprint.test.ts flies 27 fleet cases against hashes
 * recorded at the same point.
 *
 * TypeScript rather than JSON, so every thrust keeps its `X * kN` expression
 * exactly as it was written: `256.4 * kN` is 256399.99999999997, not 256400,
 * and the identity fixture pins that.
 *
 * WHAT IS A PART, AND WHAT IS AN INSTALLATION. A part holds the hardware: an
 * engine's thrust and Isp; a stage or strap-on body's masses, size and engine
 * installation (part and count: the dry mass includes the engines); a
 * fairing's mass, size and own adapter cone. Everything else belongs to where
 * the part is installed and stays in the vehicle's assembly in vehicles.ts:
 * staging delays, restart, the throttle while strap-ons burn, an air-lit
 * strap-on's ignition time, how many strap-ons, livery and drawing hints, and
 * the fairing's jettison altitude and published jettison time (an operator's
 * callout, not hardware; see `FairingSpec.sepTime`).
 *
 * IDS AND NAMES. A body's `stageId` and `name`, and an engine's `name`, are
 * emitted verbatim. They key the side tables (`PROPELLANT_LOADS`,
 * `STAGE_STEERING`, `STAGE_RCS`, the engine layouts), the exhaust colour (the
 * Merlin regex in src/render/exhaust.ts), the localized stage names and the
 * tests' published burn times. A part's own `id` is the
 * catalogue key. It is unique within its list (engines, stage bodies,
 * strap-on bodies, fairings) and never reaches a spec: several bodies emit
 * the same `stageId` (four R-7 cores are all `blokA`).
 *
 * VARIANTS. Two parts are one only when every emitted number agrees: the J-2
 * is one part, installed five times on the S-II and once on the S-IVB. Where
 * the numbers differ the parts are separate and `variantOf` links them: the
 * RD-0124A differs from the RD-0124 only in having no `minThrottle`, and that
 * field is read by the throttle model (src/physics/vehicle.ts).
 *
 * LUMPED ENTRIES, AND WHY `count` IS LOAD-BEARING. Four engine parts are not
 * one real engine (`kind: 'lumped'`): YF-75 (two engines' 167.17 kN total at
 * count 1), YF-24C (main engine and four verniers), RD-0213 + RD-0214 (main
 * engine and vernier block) and Raptor 2 / RVac (a blend of sea-level Raptors
 * and RVacs). They are kept verbatim at the count they have always had,
 * because `count` reaches far beyond thrust: the default nozzle ring and the
 * six-DOF chamber split, engine-out, the recovery engine choice, and the
 * Falcon octaweb gate (`count === 9`). Re-counting one changes that vehicle's
 * flights. Two more are `kind: 'cluster'`: per-engine figures under a cluster
 * name (YF-21C, four YF-20C) or for two models counted as one
 * (RD-0210/0211, three RD-0210 and one RD-0211).
 *
 * INTERSTAGES are not parts with mass. The data has none: an adapter is drawn
 * geometry (`interstageHeight` in src/physics/frame.ts), and the six-DOF model
 * adds no mass for it. Giving a catalogue vehicle an interstage with mass or
 * length would change its six-DOF flights, because the stack layout feeds the
 * geometry, the aero tables and the abort model. src/design/interstages.ts
 * derives them as massless display parts.
 *
 * SOURCES. Every part says where its numbers come from, as far as the file
 * they came from records it. Many figures were never cited there; those parts
 * say so (`UNCITED`) rather than borrow a source that was not used.
 */
import type { BoosterGroupSpec, EngineSpec, FairingSpec, StageSpec } from '../types';
import type { PropellantFamily } from '../physics/rigid/vehicle-data';

const kN = 1000;

/**
 * 'engine': one engine model, figures per engine, `count` counts engines.
 * 'cluster': figures per engine under a cluster's name, or for two models
 * counted as one; `count` still counts engines.
 * 'lumped': not one real engine. The figures total or blend several engines,
 * so `count` does not count engines and must never be changed (see the file
 * comment).
 */
export type EngineKind = 'engine' | 'cluster' | 'lumped';

export interface EnginePart {
  /** catalogue key, unique among engine parts */
  id: string;
  kind: EngineKind;
  /** what it burns. The six-DOF mass model still reads a stage's by stage id (`PROPELLANT_LOADS`); tests/parts.test.ts holds the two to agreement */
  family: PropellantFamily;
  /** emitted verbatim into `EngineSpec.name` */
  name: string;
  /** N per engine, s: the `EngineSpec` fields of the same names */
  thrustSL: number;
  thrustVac: number;
  ispSL: number;
  ispVac: number;
  minThrottle?: number;
  solid?: boolean;
  peakFactor?: number;
  vacuumOnly?: boolean;
  startupS?: number;
  tailoffS?: number;
  /** the part this one is a version of: a derivative, a vacuum or strap-on version, or an older build */
  variantOf?: string;
  /** no vehicle flies it any more, by the repo's own records (the C01 historical vehicles, H-IIA's retirement) */
  historical?: true;
  /** where the numbers come from */
  source: string;
  note?: string;
}

/** A stage body: one lump, whose dry mass includes its engines. kg, m. */
export interface StageBodyPart {
  /** catalogue key, unique among stage bodies */
  id: string;
  /** emitted as `StageSpec.id` */
  stageId: string;
  /** emitted verbatim as `StageSpec.name` */
  name: string;
  dryMass: number;
  propellantMass: number;
  diameter: number;
  length: number;
  engine: { part: string; count: number };
  variantOf?: string;
  source: string;
  note?: string;
}

/** A strap-on body, masses per unit as in `BoosterGroupSpec`. */
export type BoosterBodyPart = StageBodyPart;

export interface FairingPart {
  /** catalogue key, unique among fairings */
  id: string;
  mass: number;
  diameter: number;
  length: number;
  /** its own lower cone, counted in `length` (`FairingSpec.adapter`) */
  adapter?: number;
  source: string;
  note?: string;
}

/** Figures the pre-D01 data never cited; its header says: public sources (user guides, press kits, encyclopedic summaries), rounded, ±10 %. */
export const UNCITED = 'not cited in the data (public sources, rounded, ±10 %)';

const W = 'https://en.wikipedia.org/wiki/';
const C01 = 'astronautix.com, the Saturn V Flight Manual SA-503 and the AS-506 launch vehicle flight evaluation report; sea-level Isp = vacuum Isp × sea-level/vacuum thrust';

// ---------------------------------------------------------------- engines
//
// VACUUM-ONLY ENGINES. `EngineSpec` requires a sea-level pair, but an upper- or
// kick-stage engine that only ever ignites above ~100 km has no published
// sea-level operating point (an RL10 nozzle would not even flow full at sea
// level). For those engines the `thrustSL` / `ispSL` fields are NOT data: they
// are placeholders, and the recurring 250 / 260 / 280 s values below are where
// they came from. They carry `vacuumOnly: true` (audit item B27), which is
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
// EVERY solid in the fleet carries its own factor, and
// tests/data-consistency.test.ts enforces that (`every solid motor declares its
// published peak/mean thrust ratio`). Until that wave only three did and the
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
export const ENGINE_PARTS: readonly EnginePart[] = [
  // --- R-7 (Soyuz-2) and its upper stages
  { id: 'rd107a', kind: 'engine', family: 'kerolox', name: 'RD-107A', thrustSL: 839.5 * kN, thrustVac: 1019.9 * kN, ispSL: 263.3, ispVac: 320.2, minThrottle: 0.5,
    source: UNCITED, note: 'one engine: four chambers and two verniers' },
  { id: 'rd108a', kind: 'engine', family: 'kerolox', name: 'RD-108A', thrustSL: 792.4 * kN, thrustVac: 921.9 * kN, ispSL: 257.7, ispVac: 320.6, minThrottle: 0.5,
    source: UNCITED, note: 'one engine: four chambers and four verniers' },
  { id: 'rd0110', kind: 'engine', family: 'kerolox', name: 'RD-0110', thrustSL: 200 * kN, thrustVac: 298 * kN, ispSL: 250, ispVac: 326, minThrottle: 0.5, vacuumOnly: true,
    source: UNCITED },
  { id: 'rd0124', kind: 'engine', family: 'kerolox', name: 'RD-0124', thrustSL: 200 * kN, thrustVac: 294.3 * kN, ispSL: 250, ispVac: 359, minThrottle: 0.5, vacuumOnly: true,
    source: UNCITED },
  { id: 's592', kind: 'engine', family: 'hypergolic', name: 'S5.92', thrustSL: 15 * kN, thrustVac: 19.85 * kN, ispSL: 250, ispVac: 333.2, vacuumOnly: true,
    source: UNCITED },
  // --- Proton-M / Briz-M
  { id: 'rd276', kind: 'engine', family: 'hypergolic', name: 'RD-276', thrustSL: 1745 * kN, thrustVac: 1915 * kN, ispSL: 288, ispVac: 316, minThrottle: 0.6,
    source: UNCITED },
  { id: 'rd0210', kind: 'cluster', family: 'hypergolic', name: 'RD-0210/0211', thrustSL: 500 * kN, thrustVac: 582 * kN, ispSL: 280, ispVac: 327,
    source: UNCITED, note: 'three RD-0210 and one RD-0211, flown as four engines with one set of figures' },
  { id: 'rd0213', kind: 'lumped', family: 'hypergolic', name: 'RD-0213 + RD-0214', thrustSL: 520 * kN, thrustVac: 613.8 * kN, ispSL: 280, ispVac: 325,
    source: UNCITED, note: 'the RD-0213 main engine and the RD-0214 vernier block as one entry, count 1' },
  { id: 's598m', kind: 'engine', family: 'hypergolic', name: 'S5.98M', thrustSL: 15 * kN, thrustVac: 19.62 * kN, ispSL: 250, ispVac: 326, vacuumOnly: true,
    source: UNCITED },
  // --- Angara-A5
  { id: 'rd191', kind: 'engine', family: 'kerolox', name: 'RD-191', thrustSL: 1920 * kN, thrustVac: 2090 * kN, ispSL: 310.7, ispVac: 337.5, minThrottle: 0.3,
    source: UNCITED },
  { id: 'rd0124a', kind: 'engine', family: 'kerolox', name: 'RD-0124A', thrustSL: 200 * kN, thrustVac: 294.3 * kN, ispSL: 250, ispVac: 359, vacuumOnly: true,
    variantOf: 'rd0124', source: UNCITED, note: 'as the RD-0124, without its minimum throttle: a fixed-thrust engine in the model' },
  // --- Falcon 9 / Falcon Heavy
  { id: 'merlin1d', kind: 'engine', family: 'kerolox', name: 'Merlin 1D', thrustSL: 845 * kN, thrustVac: 914 * kN, ispSL: 282, ispVac: 311, minThrottle: 0.4,
    source: UNCITED },
  { id: 'mvac', kind: 'engine', family: 'kerolox', name: 'Merlin Vacuum', thrustSL: 700 * kN, thrustVac: 981 * kN, ispSL: 250, ispVac: 348, minThrottle: 0.4, vacuumOnly: true,
    variantOf: 'merlin1d', source: UNCITED },
  // --- Atlas V / Vulcan
  { id: 'rd180', kind: 'engine', family: 'kerolox', name: 'RD-180', thrustSL: 3827 * kN, thrustVac: 4152 * kN, ispSL: 311.3, ispVac: 337.8, minThrottle: 0.47,
    source: UNCITED },
  { id: 'gem63', kind: 'engine', family: 'solid', name: 'GEM-63', thrustSL: 1180 * kN, thrustVac: 1300 * kN, ispSL: 254, ispVac: 279, solid: true, peakFactor: 1.27,
    source: `${W}Graphite-Epoxy_Motor (published peak 1 649.6 kN, for peakFactor); mean thrust and Isp ${UNCITED}` },
  { id: 'rl10c1', kind: 'engine', family: 'hydrolox', name: 'RL10C-1', thrustSL: 60 * kN, thrustVac: 101.8 * kN, ispSL: 280, ispVac: 449.7, vacuumOnly: true,
    source: UNCITED },
  { id: 'be4', kind: 'engine', family: 'methalox', name: 'BE-4', thrustSL: 2400 * kN, thrustVac: 2600 * kN, ispSL: 310, ispVac: 340, minThrottle: 0.4,
    source: UNCITED },
  { id: 'gem63xl', kind: 'engine', family: 'solid', name: 'GEM-63XL', thrustSL: 1340 * kN, thrustVac: 1460 * kN, ispSL: 254, ispVac: 279, solid: true, peakFactor: 1.41,
    variantOf: 'gem63', source: `${W}Graphite-Epoxy_Motor (published peak 2 061 kN, for peakFactor); mean thrust and Isp ${UNCITED}` },
  { id: 'rl10c11', kind: 'engine', family: 'hydrolox', name: 'RL10C-1-1', thrustSL: 60 * kN, thrustVac: 106 * kN, ispSL: 280, ispVac: 453.8, vacuumOnly: true,
    variantOf: 'rl10c1', source: UNCITED },
  // --- Ariane 6
  { id: 'vulcain21', kind: 'engine', family: 'hydrolox', name: 'Vulcain 2.1', thrustSL: 960 * kN, thrustVac: 1370 * kN, ispSL: 318, ispVac: 431,
    source: UNCITED },
  // P120C: 141.4 t of grain burned in ~135 s means a *mean* mass flow of about
  // 1042 kg/s, i.e. a mean vacuum thrust near 2 846 kN — the 4 323-4 650 kN
  // figures quoted for this motor are the peak of a regressive grain, which the
  // simulation adds on top (see `solidProfile`). The earlier 3 200/3 400 kN pair
  // was the peak used as a mean and burned the grain out about 20 s early.
  { id: 'p120c', kind: 'engine', family: 'solid', name: 'P120C', thrustSL: 2677 * kN, thrustVac: 2845.6 * kN, ispSL: 262, ispVac: 278.5, solid: true, peakFactor: 1.52,
    source: `${W}P120C ; ${W}Vega_C (peak 4 323 kN)`, note: 'Vega-C first stage and Ariane 6 strap-on' },
  { id: 'vinci', kind: 'engine', family: 'hydrolox', name: 'Vinci', thrustSL: 100 * kN, thrustVac: 180 * kN, ispSL: 280, ispVac: 457, vacuumOnly: true,
    source: UNCITED },
  // --- Long March 5
  { id: 'yf77', kind: 'engine', family: 'hydrolox', name: 'YF-77', thrustSL: 510 * kN, thrustVac: 700 * kN, ispSL: 310, ispVac: 430,
    source: UNCITED },
  { id: 'yf100', kind: 'engine', family: 'kerolox', name: 'YF-100', thrustSL: 1200 * kN, thrustVac: 1340 * kN, ispSL: 300, ispVac: 335,
    source: UNCITED },
  { id: 'yf75d', kind: 'engine', family: 'hydrolox', name: 'YF-75D', thrustSL: 50 * kN, thrustVac: 88.36 * kN, ispSL: 280, ispVac: 442, vacuumOnly: true,
    variantOf: 'yf75', source: UNCITED, note: 'per engine, unlike the lumped YF-75 part it derives from' },
  // --- H3
  { id: 'le9', kind: 'engine', family: 'hydrolox', name: 'LE-9', thrustSL: 1220 * kN, thrustVac: 1471 * kN, ispSL: 352, ispVac: 425, minThrottle: 0.63,
    source: UNCITED },
  { id: 'srb3', kind: 'engine', family: 'solid', name: 'SRB-3', thrustSL: 1650 * kN, thrustVac: 1780 * kN, ispSL: 265, ispVac: 283.6, solid: true, peakFactor: 1.29,
    variantOf: 'srba3', source: `${W}H3_(rocket) (published peak 2 300 kN, for peakFactor); mean thrust and Isp ${UNCITED}` },
  { id: 'le5b3', kind: 'engine', family: 'hydrolox', name: 'LE-5B-3', thrustSL: 80 * kN, thrustVac: 137 * kN, ispSL: 280, ispVac: 448, vacuumOnly: true,
    variantOf: 'le5b', source: UNCITED },
  // --- PSLV-XL
  { id: 's139', kind: 'engine', family: 'solid', name: 'S139', thrustSL: 3000 * kN, thrustVac: 3400 * kN, ispSL: 237, ispVac: 269, solid: true, peakFactor: 1.43,
    source: `${W}Polar_Satellite_Launch_Vehicle (published peak 4 846.9 kN, for peakFactor); mean thrust and Isp ${UNCITED}` },
  { id: 'psomxl', kind: 'engine', family: 'solid', name: 'PSOM-XL', thrustSL: 420 * kN, thrustVac: 460 * kN, ispSL: 240, ispVac: 262, solid: true, peakFactor: 1.53,
    source: `${W}Polar_Satellite_Launch_Vehicle (published peak 703.5 kN, for peakFactor); mean thrust and Isp ${UNCITED}` },
  { id: 'vikas', kind: 'engine', family: 'hypergolic', name: 'Vikas', thrustSL: 725 * kN, thrustVac: 803 * kN, ispSL: 262, ispVac: 293,
    source: UNCITED },
  // HPS3 (PSLV PS3): the 240 kN figure is the peak of the grain. 7 600 kg burned
  // in the published 126.7 s is a 60 kg/s mean flow, i.e. ~174 kN mean vacuum
  // thrust — the same correction as P120C above, and the second half of audit
  // item B22 (docs/history/AUDIT-2026-09-16.md). The old pair burned the grain out in
  // 91.6 s, 27.7 % short.
  { id: 'hps3', kind: 'engine', family: 'solid', name: 'HPS3', thrustSL: 150 * kN, thrustVac: 174 * kN, ispSL: 260, ispVac: 295, solid: true, peakFactor: 1.44,
    source: `${W}Polar_Satellite_Launch_Vehicle` },
  { id: 'l25', kind: 'engine', family: 'hypergolic', name: 'L-2-5', thrustSL: 5 * kN, thrustVac: 7.3 * kN, ispSL: 260, ispVac: 308, vacuumOnly: true,
    source: UNCITED },
  // --- Electron
  // Rutherford: 24 kN sea level / 25.8 kN vacuum, Isp 311 / 343 s. Both numbers
  // are quoted: the infobox gives 24 kN at sea level and 25.8 kN in vacuum for
  // the same engine, and 25.8 kN is what the vacuum variant below has always
  // carried. An earlier draft rounded the vacuum figure down to 25 kN; it is
  // quoted here as published. The file before that wave carried 24.9 / 27.5 kN,
  // which burned the 9.7 t first stage in 132 s against a published MECO near
  // T+152 s; at the published pair the nine-engine mean mass flow is 68.4 kg/s
  // and the stage burns 142 s. This is a correction to an existing vehicle
  // (Electron) made by the fleet-data wave — see the Electron entry in the
  // reference-timeline table.
  { id: 'rutherford', kind: 'engine', family: 'kerolox', name: 'Rutherford', thrustSL: 24 * kN, thrustVac: 25.8 * kN, ispSL: 311, ispVac: 343, minThrottle: 0.5,
    source: `${W}Rutherford_(rocket_engine)` },
  { id: 'rutherford-vac', kind: 'engine', family: 'kerolox', name: 'Rutherford Vacuum', thrustSL: 18 * kN, thrustVac: 25.8 * kN, ispSL: 260, ispVac: 343, minThrottle: 0.5, vacuumOnly: true,
    variantOf: 'rutherford', source: `${W}Rutherford_(rocket_engine)` },
  { id: 'curie', kind: 'engine', family: 'hypergolic', name: 'Curie', thrustSL: 0.1 * kN, thrustVac: 0.12 * kN, ispSL: 250, ispVac: 320, vacuumOnly: true,
    source: UNCITED },
  // --- Vega-C (Avio / ESA). Solid mean thrusts are derived from grain mass /
  // published burn time, as for P120C above.
  { id: 'zefiro40', kind: 'engine', family: 'solid', name: 'Zefiro 40', thrustSL: 1033 * kN, thrustVac: 1122.9 * kN, ispSL: 270, ispVac: 293.5, solid: true, peakFactor: 1.16,
    source: `${W}Vega_C` },
  { id: 'zefiro9', kind: 'engine', family: 'solid', name: 'Zefiro 9', thrustSL: 234 * kN, thrustVac: 256.4 * kN, ispSL: 270, ispVac: 295.9, solid: true, peakFactor: 1.24,
    source: `${W}Vega_C` },
  { id: 'avum-plus', kind: 'engine', family: 'hypergolic', name: 'AVUM+ (RD-869)', thrustSL: 1.9 * kN, thrustVac: 2.42 * kN, ispSL: 248, ispVac: 315.8, vacuumOnly: true,
    source: `${W}Vega_C` },
  // --- Long March 2D / 3B (SAST / CALT). N2O4/UDMH.
  // The YF-21C cluster is 4 x YF-20C at 740.4 kN sea level each; vacuum thrust
  // follows from the same mass flow at the published 289 s vacuum Isp.
  { id: 'yf21c', kind: 'cluster', family: 'hypergolic', name: 'YF-21C (4× YF-20C)', thrustSL: 740.4 * kN, thrustVac: 823 * kN, ispSL: 260, ispVac: 289,
    source: `${W}Long_March_2D ; ${W}Long_March_3B`, note: 'figures per YF-20C, installed as four' },
  // YF-24C/E = YF-22C main (742.04 kN, 300 s) + 4 YF-23C verniers (47.1 kN total, 289 s),
  // lumped into one entry with the combined thrust and the flow-weighted Isp.
  { id: 'yf24c', kind: 'lumped', family: 'hypergolic', name: 'YF-24C (YF-22C + 4× YF-23C)', thrustSL: 700 * kN, thrustVac: 789.14 * kN, ispSL: 265.5, ispVac: 299.4,
    source: `${W}Long_March_2D ; ${W}Long_March_3B`, note: 'main engine and four verniers as one entry, count 1; flies the CZ-3B/E second stage (YF-24E) too' },
  // CZ-3B/E strap-on: one YF-25 (the booster variant of the YF-20), 740.4 kN sea level.
  { id: 'yf25', kind: 'engine', family: 'hypergolic', name: 'YF-25', thrustSL: 740.4 * kN, thrustVac: 820.9 * kN, ispSL: 260.66, ispVac: 289,
    variantOf: 'yf21c', source: `${W}Long_March_3B`, note: 'the strap-on version of the YF-20, whose figures the YF-21C part carries per engine' },
  // CZ-3B third stage: 2 x YF-75 at 167.17 kN total, 438 s vacuum.
  { id: 'yf75', kind: 'lumped', family: 'hydrolox', name: 'YF-75', thrustSL: 120 * kN, thrustVac: 167.17 * kN, ispSL: 314.5, ispVac: 438, vacuumOnly: true,
    source: `${W}Long_March_3B`, note: 'two engines’ total thrust at count 1' },
  // --- H-IIA 202 (MHI / JAXA), retired after flight 50 on 28 June 2025.
  { id: 'le7a', kind: 'engine', family: 'hydrolox', name: 'LE-7A', thrustSL: 843 * kN, thrustVac: 1098 * kN, ispSL: 337.8, ispVac: 440, historical: true,
    source: `${W}H-IIA` },
  // SRB-A3: 66.8 t of grain in ~100 s is a 668 kg/s mean flow, i.e. ~1 858 kN mean
  // vacuum thrust; the 2 260-2 520 kN figures are the peak of the regressive grain.
  { id: 'srba3', kind: 'engine', family: 'solid', name: 'SRB-A3', thrustSL: 1736 * kN, thrustVac: 1857.9 * kN, ispSL: 265, ispVac: 283.6, solid: true, peakFactor: 1.22, historical: true,
    source: `${W}H-IIA` },
  { id: 'le5b', kind: 'engine', family: 'hydrolox', name: 'LE-5B', thrustSL: 90 * kN, thrustVac: 137 * kN, ispSL: 293.7, ispVac: 447, vacuumOnly: true, historical: true,
    source: `${W}H-IIA` },
  // --- Starship
  { id: 'raptor2', kind: 'engine', family: 'methalox', name: 'Raptor 2', thrustSL: 2300 * kN, thrustVac: 2500 * kN, ispSL: 327, ispVac: 347, minThrottle: 0.4,
    source: UNCITED },
  { id: 'raptor2-rvac', kind: 'lumped', family: 'methalox', name: 'Raptor 2 / RVac', thrustSL: 2000 * kN, thrustVac: 2400 * kN, ispSL: 320, ispVac: 365, minThrottle: 0.4,
    variantOf: 'raptor2', source: UNCITED, note: 'three sea-level Raptors and three RVacs blended into one figure, count 6' },
  // --- C01 historical vehicles. Published figures (astronautix.com, the
  // Saturn V Flight Manual SA-503 and the AS-506 launch vehicle flight
  // evaluation report); sea-level Isp taken as vacuum Isp × sea-level/vacuum
  // thrust, the ratio a fixed nozzle delivers.
  { id: 'rd107-8d74ps', kind: 'engine', family: 'kerolox', name: 'RD-107 (8D74PS)', thrustSL: 813 * kN, thrustVac: 1000 * kN, ispSL: 248.8, ispVac: 306, historical: true,
    variantOf: 'rd107a', source: C01, note: 'the 1957 R-7 strap-ons: four chambers plus two verniers, fixed thrust' },
  { id: 'rd108-8d75ps', kind: 'engine', family: 'kerolox', name: 'RD-108 (8D75PS)', thrustSL: 745 * kN, thrustVac: 941 * kN, ispSL: 243.8, ispVac: 308, historical: true,
    variantOf: 'rd108a', source: C01, note: 'the 1957 R-7 core' },
  { id: 'rd107-8d74k', kind: 'engine', family: 'kerolox', name: 'RD-107 (8D74K)', thrustSL: 821 * kN, thrustVac: 1000 * kN, ispSL: 257, ispVac: 313, historical: true,
    variantOf: 'rd107a', source: C01, note: 'Vostok-K’s strap-ons' },
  { id: 'rd108-8d75k', kind: 'engine', family: 'kerolox', name: 'RD-108 (8D75K)', thrustSL: 745 * kN, thrustVac: 941 * kN, ispSL: 249.4, ispVac: 315, historical: true,
    variantOf: 'rd108a', source: C01, note: 'Vostok-K’s core' },
  { id: 'rd0109', kind: 'engine', family: 'kerolox', name: 'RD-0109', thrustSL: 40 * kN, thrustVac: 54.5 * kN, ispSL: 240, ispVac: 323.5, vacuumOnly: true, historical: true,
    source: C01, note: 'Blok E: one fixed chamber, steered by four turbine-exhaust nozzles' },
  { id: 'f1', kind: 'engine', family: 'kerolox', name: 'F-1', thrustSL: 6770 * kN, thrustVac: 7770 * kN, ispSL: 264.9, ispVac: 304, historical: true,
    source: C01, note: 'fixed thrust; five on the S-IC' },
  { id: 'j2', kind: 'engine', family: 'hydrolox', name: 'J-2', thrustSL: 486 * kN, thrustVac: 1033 * kN, ispSL: 200, ispVac: 421, vacuumOnly: true, historical: true,
    source: C01, note: 'five on the S-II, one on the S-IVB, which restarts for the translunar injection' },
];

// ---------------------------------------------------------------- stage bodies
export const STAGE_BODIES: readonly StageBodyPart[] = [
  // THE R-7 CORE, IN TWO VARIANTS — and the split is the point, not an accident.
  //
  // Blok A's published masses (https://en.wikipedia.org/wiki/Soyuz-2_(rocket) ):
  // gross 99 765 kg, empty 6 545 kg, propellant 63 800 kg LOX + 26 300 kg RP-1 =
  // 90 100 kg. The dry mass is exactly right here. The propellant was
  // 87 000 kg, 3.4 % light — and note that the published figures do not close
  // among themselves either (99 765 − 6 545 = 93 220 kg, 3 120 kg above the
  // LOX+RP-1 sum), so 90 100 kg is itself a ±3 t number.
  //
  // Soyuz-2.1a and 2.1b fly the SAME core. But 2.1a is the application's
  // default mission and the one vehicle whose whole published timeline is
  // pinned as a regression band (booster separation T+118 s, core cut-off
  // T+287 s, SECO T+528 s — tests/fleet-defaults.test.ts), and 3 100 kg more
  // core propellant moves core cut-off by ~10 s. Ten seconds is inside that
  // band, but it would be spent on a figure that is itself uncertain by more
  // than the change.
  //
  // So the correction lands where it is free: 2.1b, which has no published-clock
  // regression band, takes the audited load, and 2.1a keeps the 87 000 kg that
  // reproduces its callouts. That is a deliberate, documented divergence between
  // two records of the same hardware, not two independent estimates — which is
  // why 2.1b's body is a variant of 2.1a's and both stand on one strap-on body.
  // See docs/history/AUDIT-2026-09-16.md, data proposals, "soyuz Blok A".
  { id: 'blokA-soyuz21a', stageId: 'blokA', name: 'Blok A (core)', dryMass: 6545, propellantMass: 87000, diameter: 2.95, length: 27.8,
    engine: { part: 'rd108a', count: 1 }, source: `${W}Soyuz-2_(rocket) (dry mass); 87 000 kg held to the published 2.1a clock` },
  { id: 'blokA-soyuz21b', stageId: 'blokA', name: 'Blok A (core)', dryMass: 6545, propellantMass: 90100, diameter: 2.95, length: 27.8,
    engine: { part: 'rd108a', count: 1 }, variantOf: 'blokA-soyuz21a', source: `${W}Soyuz-2_(rocket) (63 800 LOX + 26 300 RP-1)` },
  { id: 'blokI-rd0110', stageId: 'blokI', name: 'Blok I (3rd stage, RD-0110)', dryMass: 2410, propellantMass: 22900, diameter: 2.66, length: 6.7,
    engine: { part: 'rd0110', count: 1 }, source: UNCITED },
  { id: 'blokI-rd0124', stageId: 'blokI', name: 'Blok I (3rd stage)', dryMass: 2355, propellantMass: 23000, diameter: 2.66, length: 6.7,
    engine: { part: 'rd0124', count: 1 }, variantOf: 'blokI-rd0110', source: UNCITED },
  { id: 'fregat', stageId: 'fregat', name: 'Fregat-M', dryMass: 1050, propellantMass: 5350, diameter: 3.35, length: 1.5,
    engine: { part: 's592', count: 1 }, source: UNCITED },
  // Proton's first stage is 4.1 m, not 7.4 m: audit item B23. 7.4 m is the SPAN
  // across the six outboard fuel tanks, and `VehicleModel.frontalArea()` turns
  // the widest attached stage diameter into a full circle — pi(7.4/2)^2 =
  // 43.0 m^2 against a real frontal area of about 25 m^2 (the 4.1 m core,
  // 13.2 m^2, plus six ~1.6 m tanks, 12.1 m^2). Proton was flying with 70 % too
  // much drag through the whole atmospheric phase.
  //
  // The tanks are NOT a strap-on body: they feed the six RD-276 through the
  // flight and are jettisoned with the stage, so modelling them as separable
  // boosters would invent a staging event Proton does not have. Instead the
  // stage carries its real diameter and the vehicle carries a `dragArea`
  // override (src/data/vehicles.ts).
  { id: 'p1', stageId: 'p1', name: 'First stage (6× RD-276)', dryMass: 30600, propellantMass: 419400, diameter: 4.1, length: 21.2,
    engine: { part: 'rd276', count: 6 }, source: `${UNCITED}; diameter: audit item B23` },
  { id: 'p2', stageId: 'p2', name: 'Second stage', dryMass: 11000, propellantMass: 156100, diameter: 4.1, length: 17,
    engine: { part: 'rd0210', count: 4 }, source: UNCITED },
  { id: 'p3', stageId: 'p3', name: 'Third stage', dryMass: 3500, propellantMass: 46600, diameter: 4.1, length: 6.5,
    engine: { part: 'rd0213', count: 1 }, source: UNCITED },
  { id: 'brizm', stageId: 'brizm', name: 'Briz-M', dryMass: 2370, propellantMass: 19800, diameter: 4.0, length: 2.6,
    engine: { part: 's598m', count: 1 }, source: UNCITED, note: 'Proton-M and Angara-A5' },
  { id: 'urm1core', stageId: 'urm1core', name: 'URM-1 core', dryMass: 9000, propellantMass: 128800, diameter: 2.9, length: 25.7,
    engine: { part: 'rd191', count: 1 }, source: UNCITED, note: 'the same URM-1 module as the strap-on body urm1' },
  { id: 'urm2', stageId: 'urm2', name: 'URM-2', dryMass: 4000, propellantMass: 35800, diameter: 3.6, length: 6.9,
    engine: { part: 'rd0124a', count: 1 }, source: UNCITED },
  // Published first-stage masses: 287 400 kg LOX + 123 500 kg RP-1 and a
  // 22 200 kg empty stage (Espace & Exploration no. 39, May 2017, as cited by
  // Wikipedia's "Falcon 9 Block 5"). The 395 700 / 25 600 kg flown before cut
  // the burn ~10 % short of five flights' webcast telemetry (docs/VALIDATION.md,
  // F1). Falcon Heavy's cores keep their own figures.
  { id: 's1', stageId: 's1', name: 'First stage (9× Merlin 1D)', dryMass: 22200, propellantMass: 410900, diameter: 3.66, length: 42,
    engine: { part: 'merlin1d', count: 9 }, source: 'Espace & Exploration no. 39 (May 2017), as cited by Wikipedia’s “Falcon 9 Block 5”' },
  { id: 's2', stageId: 's2', name: 'Second stage (Merlin Vacuum)', dryMass: 4300, propellantMass: 108000, diameter: 3.66, length: 15,
    engine: { part: 'mvac', count: 1 }, source: UNCITED, note: 'Falcon 9 and Falcon Heavy' },
  // The centre core's real differences from a side booster are its heavier
  // structure and the throttle-down while the sides burn (an installation
  // field in vehicles.ts); its engines are the same Merlin 1D.
  { id: 'core', stageId: 'core', name: 'Center core', dryMass: 28000, propellantMass: 395700, diameter: 3.66, length: 42,
    engine: { part: 'merlin1d', count: 9 }, variantOf: 's1', source: UNCITED },
  { id: 'ccb', stageId: 'ccb', name: 'Common Core Booster (RD-180)', dryMass: 21054, propellantMass: 284089, diameter: 3.81, length: 32.5,
    engine: { part: 'rd180', count: 1 }, source: UNCITED },
  { id: 'centaur3', stageId: 'centaur3', name: 'Centaur III (RL10C-1)', dryMass: 2243, propellantMass: 20830, diameter: 3.05, length: 12.7,
    engine: { part: 'rl10c1', count: 1 }, source: UNCITED },
  // AUDIT ITEM B21 — the one finding whose two verifiers pointed in opposite
  // directions, decided from the primary evidence.
  //
  // The candidates were 353 400 kg (Wikipedia's 382 000 kg gross minus
  // 28 600 kg dry) and 481 700 kg (366 500 kg LOX + 115 200 kg LNG). Three
  // independent checks all pick the larger one:
  //
  //  1. ULA's own LNG load is 254 000 lb = 115 200 kg
  //     ( https://www.nasaspaceflight.com/2024/01/vulcan-launch-peregrine-inaugural-flight/ ).
  //     With Wikipedia's gross that leaves 238 200 kg of LOX, a mixture ratio
  //     of 2.07 — methalox runs near 3.4-3.6, and the BE-4 cannot be flown a
  //     third oxidiser-lean.
  //  2. ULA says the core holds "more than a million pounds of liquid
  //     propellant, about 50 percent more propellant mass than the Atlas 5's
  //     first stage"
  //     ( https://spaceflightnow.com/2021/08/25/ula-readies-vulcan-booster-for-cryogenic-tanking-test/ ).
  //     Atlas V's CCB is 284 089 kg here, so 50 % more is 426 000 kg and "more
  //     than a million pounds" is >453 600 kg. 481 700 kg is 1 062 000 lb and
  //     clears both; 353 400 kg is 779 000 lb and clears neither.
  //  3. Burn time. At the model's own mass flow (2 x 2 600 kN / 340 s vac =
  //     1 559 kg/s) the old 430 000 kg burned 275.8 s against a published
  //     299 s, and 353 400 kg would burn 227 s — 24 % short and measurably
  //     WORSE against the published-timeline goal. 481 700 kg burns 309 s,
  //     which the max-Q throttle bucket lengthens further, bracketing 299 s
  //     from the other side.
  //
  // Wikipedia's 382 000 kg gross is simply inconsistent with its own
  // 4 893 kN / 299 s pair (that combination needs ~439 t at full flow), which
  // is probably where the file's 430 000 kg came from in the first place. Both
  // verifiers agreed on the dry mass, and it is taken as published.
  { id: 'v1', stageId: 'v1', name: 'First stage (2× BE-4)', dryMass: 28600, propellantMass: 481700, diameter: 5.4, length: 33.3,
    engine: { part: 'be4', count: 2 }, source: `audit item B21: ${W}Vulcan_Centaur (dry mass); nasaspaceflight.com 2024-01 and spaceflightnow.com 2021-08-25 (propellant)` },
  { id: 'centaur5', stageId: 'centaur5', name: 'Centaur V (2× RL10C-1-1)', dryMass: 5000, propellantMass: 54000, diameter: 5.4, length: 11.7,
    engine: { part: 'rl10c11', count: 2 }, source: UNCITED },
  { id: 'llpm', stageId: 'llpm', name: 'Core (Vulcain 2.1)', dryMass: 15700, propellantMass: 145000, diameter: 5.4, length: 29,
    engine: { part: 'vulcain21', count: 1 }, source: UNCITED },
  { id: 'ulpm', stageId: 'ulpm', name: 'Upper stage (Vinci)', dryMass: 5300, propellantMass: 31000, diameter: 5.4, length: 11.6,
    engine: { part: 'vinci', count: 1 }, source: UNCITED },
  // Vega-C (Avio / ESA): P120C 141 400 kg / 135.7 s, Z40 36 239 kg / 92.9 s,
  // Z9 10 567 kg / 119.6 s, AVUM+ 740 kg / 2.42 kN / 315.8 s.
  { id: 'p120c', stageId: 'p120c', name: 'P120C (first stage)', dryMass: 11200, propellantMass: 141400, diameter: 3.4, length: 13.5,
    engine: { part: 'p120c', count: 1 }, source: `${W}Vega_C`, note: 'the Vega-C casing; Ariane 6’s strap-on is the body p120c among the strap-ons' },
  { id: 'z40', stageId: 'z40', name: 'Zefiro 40 (second stage)', dryMass: 3230, propellantMass: 36239, diameter: 2.3, length: 7.6,
    engine: { part: 'zefiro40', count: 1 }, source: `${W}Vega_C` },
  { id: 'z9', stageId: 'z9', name: 'Zefiro 9 (third stage)', dryMass: 929, propellantMass: 10567, diameter: 1.9, length: 4.12,
    engine: { part: 'zefiro9', count: 1 }, source: `${W}Vega_C` },
  { id: 'avum', stageId: 'avum', name: 'AVUM+ (fourth stage)', dryMass: 695, propellantMass: 740, diameter: 2.18, length: 2.04,
    engine: { part: 'avum-plus', count: 1 }, source: `${W}Vega_C` },
  // Long March 2D: Encyclopedia Astronautica CZ-2D (stage 1 L-180 gross
  // 192 700 / empty 9 500 / 170 s, stage 2 L-35 gross 39 550 / empty 4 000 /
  // 135 s), cross-checked against Wikipedia.
  { id: 'cz2d1', stageId: 'cz2d1', name: 'First stage (YF-21C, 4× YF-20C)', dryMass: 9500, propellantMass: 183200, diameter: 3.35, length: 27.91,
    engine: { part: 'yf21c', count: 4 }, source: `http://www.astronautix.com/c/changzheng2d.html ; ${W}Long_March_2D` },
  { id: 'cz2d2', stageId: 'cz2d2', name: 'Second stage (YF-24C)', dryMass: 4000, propellantMass: 35550, diameter: 3.35, length: 10.9,
    engine: { part: 'yf24c', count: 1 }, source: `http://www.astronautix.com/c/changzheng2d.html ; ${W}Long_March_2D` },
  // Long March 3B/E: first stage 186 200 kg at 2 961.6 kN / 158 s; second stage
  // 49 400 kg at 742 kN, 185 s; third stage 2× YF-75 at 167.17 kN, 478 s.
  { id: 'cz3b1', stageId: 'cz3b1', name: 'First stage (YF-21C, 4× YF-20C)', dryMass: 9800, propellantMass: 186200, diameter: 3.35, length: 24.76,
    engine: { part: 'yf21c', count: 4 }, source: `${W}Long_March_3B` },
  { id: 'cz3b2', stageId: 'cz3b2', name: 'Second stage (YF-24E)', dryMass: 4000, propellantMass: 49400, diameter: 3.35, length: 12.92,
    engine: { part: 'yf24c', count: 1 }, source: `${W}Long_March_3B` },
  { id: 'cz3b3', stageId: 'cz3b3', name: 'Third stage (2× YF-75, cryogenic)', dryMass: 2800, propellantMass: 18200, diameter: 3.0, length: 12.38,
    engine: { part: 'yf75', count: 1 }, source: `${W}Long_March_3B` },
  // H-IIA's first stage: THE PUBLISHED MASSES. Encyclopedia Astronautica
  // H-2A-1: gross 113 600 kg / empty 13 600 kg / propellant 100 000 kg
  // ( http://www.astronautix.com/h/h-2a-1.html , agreeing with
  // https://en.wikipedia.org/wiki/H-IIA ).
  //
  // The file carried 12 000 kg for a year, and the reason was never physical:
  // it was tests/ascent.test.ts's fleet-wide `idealDeltaV > 9 500 m/s` sanity
  // floor, measured at 9 528 m/s with 12 000 / 2 800 kg and 9 390 m/s with the
  // published pair. That measurement was made with the PRE-B13 delta-v
  // accounting, which ignored the parallel boosters and the fairing; with B13's
  // correction the same vehicle measures 12 121 m/s and the published masses
  // clear the floor with 2.5 km/s to spare. The floor did not have to move after
  // all, and the previous wave's hand-off said to re-measure rather than lower
  // it. Re-measured, and the deviation is gone.
  { id: 'h2a1', stageId: 'h2a1', name: 'First stage (LE-7A)', dryMass: 13600, propellantMass: 100000, diameter: 4.0, length: 37.2,
    engine: { part: 'le7a', count: 1 }, source: `http://www.astronautix.com/h/h-2a-1.html ; ${W}H-IIA` },
  // Masses from Encyclopedia Astronautica H-2A-2 (gross 19 600 kg, empty
  // 3 000 kg). The 2 800 kg the file used to carry was the same non-physical
  // deviation as the first stage's 12 000 kg, and it is gone with it.
  { id: 'h2a2', stageId: 'h2a2', name: 'Second stage (LE-5B)', dryMass: 3000, propellantMass: 16600, diameter: 4.0, length: 9.2,
    engine: { part: 'le5b', count: 1 }, source: 'http://www.astronautix.com/h/h-2a-2.html' },
  // Long March 5: core CZ-5-500 gross 186 900 kg / propellant 165 300 kg /
  // 492 s. The tankage was 27 t (3 %) light against the published liftoff mass,
  // which inflated the liftoff thrust-to-weight to 1.29 against a real 1.27.
  // Core and boosters are now the published gross masses: 21 600 + 165 300 and
  // 12 000 + 144 600. Burn times follow at 498 s (published 492) and 177 s
  // (published 173), both inside the file's 10 % convention.
  { id: 'cz5core', stageId: 'cz5core', name: 'Core (2× YF-77)', dryMass: 21600, propellantMass: 165300, diameter: 5.0, length: 33,
    engine: { part: 'yf77', count: 2 }, source: `${W}Long_March_5` },
  { id: 'cz5s2', stageId: 'cz5s2', name: 'Second stage (2× YF-75D)', dryMass: 5500, propellantMass: 25000, diameter: 5.0, length: 12,
    engine: { part: 'yf75d', count: 2 }, source: UNCITED },
  { id: 'h3s1', stageId: 'h3s1', name: 'First stage (2× LE-9)', dryMass: 20000, propellantMass: 225000, diameter: 5.2, length: 37,
    engine: { part: 'le9', count: 2 }, source: UNCITED },
  { id: 'h3s2', stageId: 'h3s2', name: 'Second stage (LE-5B-3)', dryMass: 3700, propellantMass: 23300, diameter: 5.2, length: 12,
    engine: { part: 'le5b3', count: 1 }, source: UNCITED },
  { id: 'ps1', stageId: 'ps1', name: 'PS1 (S139 solid)', dryMass: 30200, propellantMass: 138200, diameter: 2.8, length: 20,
    engine: { part: 's139', count: 1 }, source: UNCITED },
  { id: 'ps2', stageId: 'ps2', name: 'PS2 (Vikas)', dryMass: 5300, propellantMass: 41000, diameter: 2.8, length: 12.8,
    engine: { part: 'vikas', count: 1 }, source: UNCITED },
  { id: 'ps3', stageId: 'ps3', name: 'PS3 (HPS3 solid)', dryMass: 1100, propellantMass: 7600, diameter: 2.0, length: 3.6,
    engine: { part: 'hps3', count: 1 }, source: `${W}Polar_Satellite_Launch_Vehicle (7 600 kg in 126.7 s)` },
  { id: 'ps4', stageId: 'ps4', name: 'PS4 (2× L-2-5)', dryMass: 920, propellantMass: 2500, diameter: 1.3, length: 2.6,
    engine: { part: 'l25', count: 2 }, source: UNCITED },
  { id: 'e1', stageId: 'e1', name: 'First stage (9× Rutherford)', dryMass: 850, propellantMass: 9700, diameter: 1.2, length: 12.1,
    engine: { part: 'rutherford', count: 9 }, source: UNCITED },
  { id: 'e2', stageId: 'e2', name: 'Second stage (Rutherford Vacuum)', dryMass: 220, propellantMass: 2300, diameter: 1.2, length: 2.4,
    engine: { part: 'rutherford-vac', count: 1 }, source: UNCITED },
  { id: 'curie', stageId: 'curie', name: 'Curie kick stage', dryMass: 30, propellantMass: 150, diameter: 1.2, length: 0.5,
    engine: { part: 'curie', count: 1 }, source: UNCITED },
  { id: 'superheavy', stageId: 'superheavy', name: 'Super Heavy (33× Raptor)', dryMass: 220000, propellantMass: 3500000, diameter: 9, length: 71,
    engine: { part: 'raptor2', count: 33 }, source: UNCITED },
  { id: 'ship', stageId: 'ship', name: 'Ship (3× Raptor + 3× RVac)', dryMass: 130000, propellantMass: 1500000, diameter: 9, length: 52,
    engine: { part: 'raptor2-rvac', count: 6 }, source: UNCITED },
  // C01. Sputnik's core: 97.5 t, 90 t of it propellant, the load that puts it on
  // the 215 × 939 km orbit it reached (270 t in all against the 267 t quoted).
  { id: 'blokA-8k71ps', stageId: 'blokA', name: 'Blok A (core, RD-108)', dryMass: 7500, propellantMass: 90000, diameter: 2.95, length: 26,
    engine: { part: 'rd108-8d75ps', count: 1 }, variantOf: 'blokA-soyuz21a', source: 'http://www.astronautix.com/s/sputnik8k71ps.html' },
  { id: 'blokA-8k72k', stageId: 'blokA', name: 'Blok A (core, RD-108)', dryMass: 6800, propellantMass: 93000, diameter: 2.95, length: 28,
    engine: { part: 'rd108-8d75k', count: 1 }, variantOf: 'blokA-soyuz21a', source: 'http://www.astronautix.com/v/vostok8k72k.html' },
  // Blok E: 1.44 t dry, 7.78 t of propellant, RD-0109.
  { id: 'blokE', stageId: 'blokE', name: 'Blok E (RD-0109)', dryMass: 1440, propellantMass: 7780, diameter: 2.56, length: 3.1,
    engine: { part: 'rd0109', count: 1 }, source: 'http://www.astronautix.com/v/vostok8k72k.html' },
  // Saturn V SA-506: S-IC 135 t dry + 2 145 t; S-II 40 t dry (with its aft
  // interstage) + 443 t; S-IVB 15.3 t dry (with the instrument unit) + 109 t.
  { id: 'sic', stageId: 'sic', name: 'S-IC (5× F-1)', dryMass: 135000, propellantMass: 2145000, diameter: 10.1, length: 42,
    engine: { part: 'f1', count: 5 }, source: `${W}Saturn_V ; AS-506 flight evaluation report` },
  { id: 'sii', stageId: 'sii', name: 'S-II (5× J-2)', dryMass: 40000, propellantMass: 443000, diameter: 10.1, length: 24.9,
    engine: { part: 'j2', count: 5 }, source: `${W}Saturn_V ; AS-506 flight evaluation report`, note: 'dry mass includes its aft interstage' },
  { id: 'sivb', stageId: 'sivb', name: 'S-IVB (J-2) + IU', dryMass: 15300, propellantMass: 109000, diameter: 6.6, length: 18.8,
    engine: { part: 'j2', count: 1 }, source: `${W}Saturn_V ; AS-506 flight evaluation report`, note: 'dry mass includes the instrument unit' },
];

// ---------------------------------------------------------------- strap-on bodies
export const BOOSTER_BODIES: readonly BoosterBodyPart[] = [
  { id: 'blokBVGD-soyuz2', stageId: 'blokBVGD', name: 'Blok B/V/G/D boosters', dryMass: 3784, propellantMass: 39600, diameter: 2.68, length: 19.6,
    engine: { part: 'rd107a', count: 1 }, source: UNCITED, note: 'Soyuz-2.1a and 2.1b' },
  { id: 'urm1', stageId: 'urm1', name: 'URM-1 boosters', dryMass: 9000, propellantMass: 128800, diameter: 2.9, length: 25.7,
    engine: { part: 'rd191', count: 1 }, source: UNCITED, note: 'the same URM-1 module as the stage body urm1core' },
  { id: 'side', stageId: 'side', name: 'Side boosters', dryMass: 25600, propellantMass: 395700, diameter: 3.66, length: 42,
    engine: { part: 'merlin1d', count: 9 }, source: UNCITED, note: 'Falcon 9 first stages on the old 25 600 / 395 700 kg figures' },
  // GEM-63 inert mass 5 100 kg = the 49 300 kg gross minus the 44 200 kg grain
  // quoted on the same page.
  { id: 'gem63', stageId: 'gem63', name: 'GEM-63 solid boosters', dryMass: 5100, propellantMass: 44200, diameter: 1.6, length: 20,
    engine: { part: 'gem63', count: 1 }, source: `${W}Atlas_V` },
  // GEM-63XL inert mass 5 177 kg, grain 47 853 kg — both published. (The
  // audit's "~4 521 kg" is not on that page; 5 177 kg is the 53 030 kg gross
  // minus the 47 853 kg grain, and the two agree to the kilogram.)
  { id: 'gem63xl', stageId: 'gem63xl', name: 'GEM-63XL solid boosters', dryMass: 5177, propellantMass: 47853, diameter: 1.6, length: 22,
    engine: { part: 'gem63xl', count: 1 }, source: `${W}Graphite-Epoxy_Motor` },
  { id: 'p120c', stageId: 'p120c', name: 'P120C solid boosters', dryMass: 13000, propellantMass: 142000, diameter: 3.4, length: 13.5,
    engine: { part: 'p120c', count: 1 }, source: UNCITED, note: 'the Ariane 6 casing; Vega-C’s first stage is the stage body p120c' },
  // CZ-3B/E: 4 boosters of 41 100 kg at 740.4 kN / 140 s.
  { id: 'cz3bb', stageId: 'cz3bb', name: 'Liquid strap-on boosters (YF-25)', dryMass: 3000, propellantMass: 41100, diameter: 2.25, length: 16.1,
    engine: { part: 'yf25', count: 1 }, source: `${W}Long_March_3B` },
  // SRB-A3 grain and inert masses, burnout ~100 s and separation ~108 s are the
  // audited figures.
  { id: 'srba', stageId: 'srba', name: 'SRB-A3 solid boosters', dryMass: 8700, propellantMass: 66800, diameter: 2.5, length: 15.1,
    engine: { part: 'srba3', count: 1 }, source: `docs/history/AUDIT-2026-09-16.md ; ${W}H-IIA` },
  // Long March 5 booster CZ-5-300: gross 156 600 kg each, 173 s.
  { id: 'k3', stageId: 'k3', name: 'Kerolox boosters (2× YF-100 each)', dryMass: 12000, propellantMass: 144600, diameter: 3.35, length: 26.3,
    engine: { part: 'yf100', count: 2 }, source: `${W}Long_March_5` },
  { id: 'srb3', stageId: 'srb3', name: 'SRB-3 solid boosters', dryMass: 8700, propellantMass: 66800, diameter: 2.5, length: 14.6,
    engine: { part: 'srb3', count: 1 }, source: UNCITED, note: 'the SRB-A3 casing’s masses, 0.5 m shorter' },
  // PSLV-XL's six PSOM-XL are one motor in one casing. They are two bodies
  // because the ground-lit four and the air-lit pair are two strap-on groups
  // with ids of their own, which the side tables key separately.
  { id: 'psomg', stageId: 'psomg', name: 'PSOM-XL (ground-lit)', dryMass: 2010, propellantMass: 12200, diameter: 1.0, length: 12,
    engine: { part: 'psomxl', count: 1 }, source: UNCITED },
  { id: 'psoma', stageId: 'psoma', name: 'PSOM-XL (air-lit)', dryMass: 2010, propellantMass: 12200, diameter: 1.0, length: 12,
    engine: { part: 'psomxl', count: 1 }, variantOf: 'psomg', source: UNCITED, note: 'the ground-lit body, lit in the air: `igniteAt` is its installation' },
  // C01: boosters 43 t each (Sputnik); Vostok-K's from the same page as its Blok E.
  { id: 'blokBVGD-8k71ps', stageId: 'blokBVGD', name: 'Blok B/V/G/D boosters', dryMass: 3500, propellantMass: 39500, diameter: 2.68, length: 19,
    engine: { part: 'rd107-8d74ps', count: 1 }, variantOf: 'blokBVGD-soyuz2', source: 'http://www.astronautix.com/s/sputnik8k71ps.html' },
  { id: 'blokBVGD-8k72k', stageId: 'blokBVGD', name: 'Blok B/V/G/D boosters', dryMass: 3450, propellantMass: 39250, diameter: 2.68, length: 19.8,
    engine: { part: 'rd107-8d74k', count: 1 }, variantOf: 'blokBVGD-soyuz2', source: 'http://www.astronautix.com/v/vostok8k72k.html' },
];

// ---------------------------------------------------------------- fairings
export const FAIRING_PARTS: readonly FairingPart[] = [
  // The 4.11 m fairing, 11.43 m long with its own adapter cone down to Blok I
  // (TASS/RIA: the 4.11 × 11.43 m payload unit), for the crewed and the cargo
  // flights alike; with the escape tower on its nose the head of a crewed stack
  // is 15.59 m (owner's figures, 2026-09-25). It was drawn and flown at
  // 3.7 × 10.1 m on a 1.7 m adapter of its own.
  { id: 'soyuz21a', mass: 1000, diameter: 4.11, length: 11.43, adapter: 2.2, source: 'TASS/RIA (the 4.11 × 11.43 m payload unit); owner’s figures, 2026-09-25' },
  { id: 'soyuz21b', mass: 1500, diameter: 4.11, length: 11.4, source: UNCITED },
  { id: 'protonm', mass: 2000, diameter: 4.35, length: 15, source: UNCITED, note: 'Proton-M and Angara-A5' },
  { id: 'falcon9', mass: 1900, diameter: 5.2, length: 13.1, source: UNCITED, note: 'Falcon 9 and Falcon Heavy' },
  { id: 'atlasv551', mass: 3524, diameter: 5.4, length: 20.7, source: UNCITED },
  { id: 'vulcan', mass: 3500, diameter: 5.4, length: 15.5, source: UNCITED },
  { id: 'ariane64', mass: 2900, diameter: 5.4, length: 20, source: UNCITED },
  { id: 'vegac', mass: 500, diameter: 3.3, length: 9.0, source: `${W}Vega_C (3.3 m)` },
  { id: 'longmarch2d', mass: 800, diameter: 3.35, length: 6.98, source: UNCITED },
  { id: 'longmarch3be', mass: 2000, diameter: 4.2, length: 9.56, source: UNCITED },
  { id: 'h2a202', mass: 1400, diameter: 4.07, length: 12, source: UNCITED, note: 'the 4S fairing' },
  { id: 'longmarch5', mass: 3000, diameter: 5.2, length: 12.3, source: UNCITED },
  { id: 'h3', mass: 2400, diameter: 5.2, length: 12, source: UNCITED },
  { id: 'pslvxl', mass: 1150, diameter: 3.2, length: 8.3, source: UNCITED },
  { id: 'electron', mass: 50, diameter: 1.2, length: 2.5, source: UNCITED },
  { id: 'sputnik8k71ps', mass: 300, diameter: 2.95, length: 2.2, source: 'http://www.astronautix.com/s/sputnik8k71ps.html', note: 'PS-1’s conical nose shroud' },
  { id: 'vostok8k72k', mass: 800, diameter: 2.6, length: 5, source: 'http://www.astronautix.com/v/vostok8k72k.html', note: 'the shroud over the spacecraft’s instrument section' },
];

// ---------------------------------------------------------------- lookups
/**
 * The list by id, each part frozen: the emitters hand out fresh specs, so an
 * edit to a vehicle never reaches the catalogue, and freezing makes sure an
 * edit to a part cannot either (a builder copies a part to change it).
 */
function index<T extends { id: string; engine?: object }>(list: readonly T[], what: string): ReadonlyMap<string, T> {
  const out = new Map<string, T>();
  for (const part of list) {
    if (out.has(part.id)) throw new Error(`Duplicate ${what} ${part.id}`);
    if (part.engine) Object.freeze(part.engine);
    out.set(part.id, Object.freeze(part));
  }
  Object.freeze(list);
  return out;
}
const ENGINES = index(ENGINE_PARTS, 'engine part');
const STAGES = index(STAGE_BODIES, 'stage body');
const BOOSTERS = index(BOOSTER_BODIES, 'strap-on body');
const FAIRINGS = index(FAIRING_PARTS, 'fairing');

function find<T>(map: ReadonlyMap<string, T>, id: string, what: string): T {
  const part = map.get(id);
  if (!part) throw new Error(`Unknown ${what} ${id}`);
  return part;
}
export const enginePart = (id: string): EnginePart => find(ENGINES, id, 'engine part');
export const stageBody = (id: string): StageBodyPart => find(STAGES, id, 'stage body');
export const boosterBody = (id: string): BoosterBodyPart => find(BOOSTERS, id, 'strap-on body');
export const fairingPart = (id: string): FairingPart => find(FAIRINGS, id, 'fairing');

// ---------------------------------------------------------------- emitters
//
// One rule for all four: an optional field is copied only when it is defined,
// and no default is ever filled in. A spec's absent field and its zero are
// different things to the code that reads it — Blok I's `sepDelay: 0` is not
// the flight's `?? 2` default — so the emitters must neither drop a zero nor
// invent a value, and must never write an `undefined`-valued key.
// Keys come out in the order the pre-D01 literals wrote them: the hardware
// fields first, then the installation's in the order the assembly gives them.

/** What a vehicle adds to a stage body where it installs it. */
export type StageInstall = Partial<Pick<StageSpec, 'restartable' | 'sepDelay' | 'ignitionDelay' | 'throttleWithBoosters' | 'boosters'
  | 'color' | 'accentColor' | 'profile' | 'fins' | 'gridFins' | 'legs' | 'flaps' | 'nozzleLength'>>;
/** What a vehicle adds to a strap-on body, besides how many. */
export type BoosterInstall = Partial<Pick<BoosterGroupSpec, 'igniteAt' | 'sepDelay' | 'color' | 'conicalTop' | 'baseOffset'>>;
/** What a vehicle adds to a fairing: when it is jettisoned, and its livery. */
export type FairingInstall = Pick<FairingSpec, 'sepAltitude'> & Partial<Pick<FairingSpec, 'sepTime' | 'color'>>;

const STAGE_INSTALL_FIELDS: ReadonlySet<string> = new Set(['restartable', 'sepDelay', 'ignitionDelay', 'throttleWithBoosters', 'boosters',
  'color', 'accentColor', 'profile', 'fins', 'gridFins', 'legs', 'flaps', 'nozzleLength']);
const BOOSTER_INSTALL_FIELDS: ReadonlySet<string> = new Set(['igniteAt', 'sepDelay', 'color', 'conicalTop', 'baseOffset']);
const FAIRING_INSTALL_FIELDS: ReadonlySet<string> = new Set(['sepAltitude', 'sepTime', 'color']);
const ENGINE_OPTIONAL_FIELDS = ['minThrottle', 'solid', 'peakFactor', 'vacuumOnly', 'startupS', 'tailoffS'] as const;

/**
 * The installation's defined fields, in its own order. A hardware field in an
 * installation is refused rather than let it overwrite the part's.
 */
function installed(install: object, allowed: ReadonlySet<string>, what: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(install)) {
    if (!allowed.has(key)) throw new Error(`${key} is not a field of a ${what} installation`);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/** The `EngineSpec` of `count` of an engine part. */
export function engineSpec(part: EnginePart | string, count: number): EngineSpec {
  const p = typeof part === 'string' ? enginePart(part) : part;
  const out: EngineSpec = { name: p.name, count, thrustSL: p.thrustSL, thrustVac: p.thrustVac, ispSL: p.ispSL, ispVac: p.ispVac };
  for (const key of ENGINE_OPTIONAL_FIELDS) {
    const value = p[key];
    if (value !== undefined) (out as unknown as Record<string, unknown>)[key] = value;
  }
  return out;
}

/** A stage body installed in a vehicle, as the `StageSpec` it flies. */
export function stageSpec(body: StageBodyPart | string, install: StageInstall = {}): StageSpec {
  const b = typeof body === 'string' ? stageBody(body) : body;
  return {
    id: b.stageId, name: b.name, dryMass: b.dryMass, propellantMass: b.propellantMass,
    engine: engineSpec(b.engine.part, b.engine.count), diameter: b.diameter, length: b.length,
    ...installed(install, STAGE_INSTALL_FIELDS, 'stage'),
  };
}

/** `count` of a strap-on body installed around a stage, as the `BoosterGroupSpec` it flies. */
export function boosterSpec(body: BoosterBodyPart | string, count: number, install: BoosterInstall = {}): BoosterGroupSpec {
  const b = typeof body === 'string' ? boosterBody(body) : body;
  return {
    id: b.stageId, name: b.name, count, dryMass: b.dryMass, propellantMass: b.propellantMass,
    engine: engineSpec(b.engine.part, b.engine.count), diameter: b.diameter, length: b.length,
    ...installed(install, BOOSTER_INSTALL_FIELDS, 'strap-on'),
  };
}

/** A fairing installed on a vehicle, as the `FairingSpec` it flies. */
export function fairingSpec(part: FairingPart | string, install: FairingInstall): FairingSpec {
  const f = typeof part === 'string' ? fairingPart(part) : part;
  return {
    mass: f.mass, diameter: f.diameter, length: f.length, ...(f.adapter !== undefined ? { adapter: f.adapter } : {}),
    ...installed(install, FAIRING_INSTALL_FIELDS, 'fairing'),
  } as FairingSpec;
}
