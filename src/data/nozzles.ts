/**
 * The engines' nozzles: what the thrust law needs beyond the thrust and Isp
 * pair (src/physics/nozzle.ts, owner decision of 2026-10-17 on the throttle,
 * the ambient-pressure term and vacuum engines lit in the air).
 *
 * Keyed by `EngineSpec.name` as the catalogue and the historical vehicles emit
 * it — the convention of the engine layouts (src/data/engine-layout.ts) and the
 * exhaust colours — so a spec the physics sees, a dispersed copy of it or a
 * stage after a mixture shift finds its nozzle without the spec carrying one.
 * The specs themselves are unchanged (tests/d01-vehicles-identity.test.ts).
 *
 * WHAT A RECORD HOLDS, per `count` unit as the thrust is (one engine; one of a
 * cluster's; the whole of a lumped entry):
 * - `family`: the propellant, for the ratio of specific heats γ of a one-
 *   dimensional isentropic nozzle (`NOZZLE_GAMMA`).
 * - `expansionRatio` ε = A_e/A_t and/or `chamberPressure` p_c at full thrust.
 * - `exitDiameter` of one nozzle and how many nozzles a count unit has, where
 *   it is published.
 *
 * HOW THE LAW USES THEM. An engine with a sea-level operating point in the data
 * takes its exit area from its own pair, A_e = (F_vac − F_SL)/p₀ — the exact
 * full-flow law at sea level, so the catalogue's sea-level thrust is kept to the
 * newton — and its ε from the record, or, where only p_c is published, the ε
 * that closes F_vac = p_c·(A_e/ε)·C_F,vac(ε). A vacuum-only engine has no
 * sea-level pair (its `thrustSL` is a placeholder), so its exit area comes from
 * the record: the published exit diameter, or A_e = ε·F_vac/(p_c·C_F,vac(ε))
 * from its published ε and p_c (ideal C_F: a real one is 2–4 % lower, so the
 * area is that much small). The chamber pressure the law then flies is always
 * the one that closes F_vac with that geometry, so the vacuum thrust is the
 * catalogue's exactly.
 *
 * PROVENANCE. Every number is a `NozzleFigure`: a published value with its
 * source, or an `estimate` with the reasoning. tests/nozzle-law.test.ts holds
 * every engine any built-in vehicle or catalogue part flies to an entry here
 * and every figure to one of the two. An engine name with no entry (a custom
 * engine in a mission file) flies `fallbackNozzle` in src/physics/nozzle.ts,
 * which is an estimate and says so.
 */
import type { PropellantFamily } from '../physics/rigid/vehicle-data';

/** A number with where it comes from: a published `source`, or an `estimate` and why. */
export type NozzleFigure = { value: number; source: string } | { value: number; estimate: string };

export interface NozzleRecord {
  family: PropellantFamily;
  /** nozzle area ratio A_e/A_t */
  expansionRatio?: NozzleFigure;
  /** chamber pressure at full thrust, Pa */
  chamberPressure?: NozzleFigure;
  /** exit diameter of one nozzle, m, and the nozzles in one count unit */
  exitDiameter?: NozzleFigure & { nozzles: number };
  note?: string;
}

/**
 * γ of the exhaust in a one-dimensional isentropic nozzle, by propellant. One
 * number per family is the usual preliminary-design simplification; real
 * exhaust shifts in composition along the nozzle. Hydrolox is the 1.26
 * Schmucker uses for the SSME (NASA TM-77396, 1984, Appendix); the others are
 * estimates in the range of frozen-flow exhaust for each family.
 */
export const NOZZLE_GAMMA: Readonly<Record<PropellantFamily, NozzleFigure>> = {
  hydrolox: { value: 1.26, source: 'R. H. Schmucker, Flow processes in overexpanded chemical rocket nozzles, Part 1: Flow separation, NASA TM-77396 (1984), Appendix (SSME, κ = 1.26), https://ntrs.nasa.gov/citations/19840011402' },
  kerolox: { value: 1.22, estimate: 'frozen-flow exhaust of LOX and kerosene, typically 1.2–1.24' },
  methalox: { value: 1.22, estimate: 'frozen-flow exhaust of LOX and methane, typically 1.2–1.24' },
  hypergolic: { value: 1.24, estimate: 'frozen-flow exhaust of N₂O₄ and a hydrazine, typically 1.22–1.26' },
  solid: { value: 1.18, estimate: 'aluminised composite propellant exhaust with condensed alumina, typically 1.15–1.2' },
};

const W = 'https://en.wikipedia.org/wiki/';
const MPa = 1e6;

const RD107 = `${W}RD-107 (family tables, citing lpre.de and NPO Energomash)`;
const YF20 = `${W}YF-20 (the base engine's infobox)`;
const EUCASS_LE5B = 'N. Nagao et al., The modified fuel turbopump of 2nd stage engine for H3 launch vehicle, EUCASS 2017-189, Table 1, https://www.eucass.eu/doi/EUCASS2017-189.pdf';
/** an estimate for a small pressure-fed or kick-stage engine with nothing published */
const SMALL = 'nothing published: a small vacuum engine of this class, ε in the tens';

export const NOZZLES: Readonly<Record<string, NozzleRecord>> = {
  // --- R-7 family
  'RD-107A': { family: 'kerolox', chamberPressure: { value: 6.0 * MPa, source: RD107 } },
  'RD-108A': { family: 'kerolox', chamberPressure: { value: 5.44 * MPa, source: RD107 } },
  'RD-107 (8D74)': { family: 'kerolox', chamberPressure: { value: 5.88 * MPa, source: RD107 } },
  'RD-107 (8D74PS)': { family: 'kerolox', chamberPressure: { value: 5.88 * MPa, source: `${RD107}: the 8D74's figure, taken for the 1957 build` } },
  'RD-107 (8D74K)': { family: 'kerolox', chamberPressure: { value: 5.88 * MPa, source: `${RD107}: the 8D74's figure, taken for the Vostok build` } },
  'RD-108 (8D75)': { family: 'kerolox', chamberPressure: { value: 5.10 * MPa, source: RD107 } },
  'RD-108 (8D75PS)': { family: 'kerolox', chamberPressure: { value: 5.10 * MPa, source: `${RD107}: the 8D75's figure, taken for the 1957 build` } },
  'RD-108 (8D75K)': { family: 'kerolox', chamberPressure: { value: 5.10 * MPa, source: `${RD107}: the 8D75's figure, taken for the Vostok build` } },
  'RD-0110': { family: 'kerolox', chamberPressure: { value: 6.8 * MPa, source: `${W}RD-0110 (KBKhA)` },
    expansionRatio: { value: 30, estimate: 'not published: the ε at which an ideal nozzle gives its 326 s against the RD-107A’s 319 s at ε 19.5 (same family and cycle)' } },
  'RD-0124': { family: 'kerolox', chamberPressure: { value: 15.69 * MPa, source: 'http://www.lpre.de/kbkha/RD-0124/index.htm' },
    expansionRatio: { value: 250, estimate: 'not published: the ε at which an ideal nozzle gives its 359 s against the RD-191’s 337.5 s at ε 37 (staged combustion both); four such nozzles fit its 2.4 m envelope' } },
  'RD-0124A': { family: 'kerolox', chamberPressure: { value: 15.69 * MPa, source: 'http://www.lpre.de/kbkha/RD-0124/index.htm (the RD-0124’s)' },
    expansionRatio: { value: 250, estimate: 'as the RD-0124, whose nozzles it keeps' } },
  'RD-0109': { family: 'kerolox', chamberPressure: { value: 5.0 * MPa, source: `${W}RD-0109 (KBKhA)` },
    expansionRatio: { value: 26, estimate: 'not published: the ε at which an ideal nozzle gives its 323.5 s against the RD-107A’s 319 s at ε 19.5' } },
  'S5.92': { family: 'hypergolic', chamberPressure: { value: 9.61 * MPa, source: `${W}S5.92` },
    expansionRatio: { value: 64, estimate: 'not published: the ε at which an ideal nozzle gives its 327 s against the RD-276’s 316 s at ε 26.2' } },
  // --- Proton, Angara
  'RD-276': { family: 'hypergolic', expansionRatio: { value: 26.2, source: `${W}RD-275` }, chamberPressure: { value: 16.5 * MPa, source: `${W}RD-275` } },
  'RD-0210/0211': { family: 'hypergolic', chamberPressure: { value: 14.7 * MPa, source: `${W}RD-0210 (KBKhA)` } },
  'RD-0213 + RD-0214': { family: 'hypergolic', chamberPressure: { value: 14.7 * MPa, source: `${W}RD-0212 (the RD-0210 family’s figure)` } },
  'S5.98M': { family: 'hypergolic', chamberPressure: { value: 9.8 * MPa, source: `${W}S5.98M` },
    expansionRatio: { value: 74, estimate: 'not published: the ε at which an ideal nozzle gives its 328.6 s against the RD-276’s 316 s at ε 26.2' } },
  'RD-191': { family: 'kerolox', expansionRatio: { value: 37, source: `${W}RD-191` }, chamberPressure: { value: 25.8 * MPa, source: `${W}RD-191` } },
  // --- Falcon
  'Merlin 1D': { family: 'kerolox', expansionRatio: { value: 16, source: `${W}Merlin_(rocket_engine) (Merlin 1D)` }, chamberPressure: { value: 9.7 * MPa, source: `${W}Merlin_(rocket_engine) (Aviation Week, 2011)` } },
  'Merlin Vacuum': { family: 'kerolox', expansionRatio: { value: 165, source: `${W}Merlin_(rocket_engine) (SpaceX Falcon 9 page and Payload User’s Guide, 2015)` },
    chamberPressure: { value: 9.7 * MPa, source: `${W}Merlin_(rocket_engine): the Merlin 1D’s chamber, which the vacuum engine shares` },
    note: 'exit diameter 3.30 m from ε and p_c, the 3.3 m usually quoted' },
  // --- Atlas V, Vulcan
  'RD-180': { family: 'kerolox', expansionRatio: { value: 36.87, source: `${W}RD-180` }, chamberPressure: { value: 26.7 * MPa, source: `${W}RD-180` } },
  'GEM-63': { family: 'solid', expansionRatio: { value: 14, estimate: 'a 14:1 fixed carbon-phenolic nozzle by a forum post (rocketryforum.com), not found in Northrop Grumman’s data sheet' } },
  'GEM-63XL': { family: 'solid', expansionRatio: { value: 14, estimate: 'as the GEM-63' } },
  'RL10C-1': { family: 'hydrolox', expansionRatio: { value: 130, source: `${W}RL10 (variants table; Aerojet Rocketdyne)` },
    exitDiameter: { value: 1.45, nozzles: 1, source: `${W}RL10 (variants table)` } },
  'RL10C-1-1': { family: 'hydrolox', expansionRatio: { value: 155, source: `${W}RL10 (variants table; Aerojet Rocketdyne data sheet)` },
    exitDiameter: { value: 1.57, nozzles: 1, source: `${W}RL10 (variants table)` } },
  'BE-4': { family: 'methalox', chamberPressure: { value: 14 * MPa, source: `${W}BE-4 (Ars Technica, 2016-03-09)` } },
  // --- Ariane 6, Vega-C
  'Vulcain 2.1': { family: 'hydrolox', chamberPressure: { value: 12.08 * MPa, source: `${W}Vulcain_(rocket_engine) (ESA)` } },
  'P120C': { family: 'solid', expansionRatio: { value: 16, estimate: 'not published: a large first-stage solid of the P80’s class' } },
  'Vinci': { family: 'hydrolox', expansionRatio: { value: 240, source: `${W}Vinci_(rocket_engine) (ArianeGroup data sheet)` },
    chamberPressure: { value: 6.0 * MPa, source: `${W}Vinci_(rocket_engine) (ArianeGroup data sheet)` } },
  'Zefiro 40': { family: 'solid', expansionRatio: { value: 25, estimate: 'not published: a second-stage solid between the P120C and the Zefiro 9' } },
  'Zefiro 9': { family: 'solid', expansionRatio: { value: 58, source: 'ESA, Successful first test for Vega’s Zefiro 9 engine (2005-12-28): “the nozzle expansion ratio was reduced from 58 to 16” for the sea-level test, https://www.marsdaily.com/reports/Successful_First_Test_For_Vegas_Zefiro_9_Engine.html' } },
  'AVUM+ (RD-869)': { family: 'hypergolic', expansionRatio: { value: 60, estimate: SMALL }, chamberPressure: { value: 1.8 * MPa, estimate: 'a pressure-fed engine of this class' } },
  // --- Long March
  'YF-77': { family: 'hydrolox', expansionRatio: { value: 49, source: `${W}YF-77` }, chamberPressure: { value: 10.1 * MPa, source: `${W}YF-77` } },
  'YF-100': { family: 'kerolox', expansionRatio: { value: 35, source: `${W}YF-100` }, chamberPressure: { value: 18 * MPa, source: `${W}YF-100` } },
  'YF-75D': { family: 'hydrolox', expansionRatio: { value: 80, source: `${W}YF-75D (Nan 2013, IAC-13-C4.1)` }, chamberPressure: { value: 4.1 * MPa, source: `${W}YF-75D (Nan 2013, IAC-13-C4.1)` } },
  'YF-75': { family: 'hydrolox', expansionRatio: { value: 80, source: `${W}YF-75` }, chamberPressure: { value: 3.76 * MPa, source: `${W}YF-75` },
    note: 'lumped: the two engines’ total, so the exit area is both nozzles’' },
  'YF-21C (4× YF-20C)': { family: 'hypergolic', expansionRatio: { value: 12.69, source: `${YF20}, taken for the YF-20C` }, chamberPressure: { value: 7.1 * MPa, source: `${YF20}, taken for the YF-20C` } },
  'YF-24C (YF-22C + 4× YF-23C)': { family: 'hypergolic', chamberPressure: { value: 7.1 * MPa, source: `${YF20}: the family’s chamber, taken for the YF-22C` } },
  'YF-25': { family: 'hypergolic', expansionRatio: { value: 12.69, source: `${YF20}, taken for its strap-on version` }, chamberPressure: { value: 7.1 * MPa, source: `${YF20}, taken for its strap-on version` } },
  // --- Japan
  'LE-9': { family: 'hydrolox', expansionRatio: { value: 37, source: `${W}LE-9 (MHI Technical Review)` }, chamberPressure: { value: 10.0 * MPa, source: `${W}LE-9` } },
  'LE-7A': { family: 'hydrolox', expansionRatio: { value: 51.9, source: `${W}LE-7` }, chamberPressure: { value: 12.0 * MPa, source: `${W}LE-7` } },
  'LE-5B-3': { family: 'hydrolox', expansionRatio: { value: 110, source: EUCASS_LE5B }, chamberPressure: { value: 3.61 * MPa, source: EUCASS_LE5B } },
  'LE-5B': { family: 'hydrolox', expansionRatio: { value: 110, source: `${EUCASS_LE5B} (LE-5B-2)` }, chamberPressure: { value: 3.58 * MPa, source: `${EUCASS_LE5B} (LE-5B-2)` } },
  'SRB-3': { family: 'solid', expansionRatio: { value: 12, estimate: 'not published: a strap-on solid of the SRB-A’s class' } },
  'SRB-A3': { family: 'solid', expansionRatio: { value: 12, estimate: 'not published: a strap-on solid of this class' } },
  // --- India
  'S139': { family: 'solid', expansionRatio: { value: 8, estimate: 'not published: an early large first-stage solid' } },
  'PSOM-XL': { family: 'solid', expansionRatio: { value: 10, estimate: 'not published: a small strap-on solid' } },
  'Vikas': { family: 'hypergolic', chamberPressure: { value: 5.85 * MPa, source: `${W}Vikas_(rocket_engine) (the upgraded engine’s 58.5 bar)` } },
  'HPS3': { family: 'solid', expansionRatio: { value: 50, estimate: 'not published: an upper-stage solid' } },
  'L-2-5': { family: 'hypergolic', expansionRatio: { value: 60, estimate: SMALL }, chamberPressure: { value: 0.9 * MPa, estimate: 'a pressure-fed engine of this class' } },
  // --- Electron
  'Rutherford': { family: 'kerolox', expansionRatio: { value: 15, estimate: 'not published: a sea-level kerolox bell, the Merlin 1D’s 16 or a little less' } },
  'Rutherford Vacuum': { family: 'kerolox', expansionRatio: { value: 60, estimate: SMALL }, chamberPressure: { value: 1.2 * MPa, estimate: 'not published: an electric-pump engine of this size' } },
  'Curie': { family: 'hypergolic', expansionRatio: { value: 60, estimate: SMALL }, chamberPressure: { value: 1.0 * MPa, estimate: 'a pressure-fed engine of this class' } },
  // --- Starship
  'Raptor 2': { family: 'methalox', expansionRatio: { value: 34.34, source: `${W}SpaceX_Raptor (sea-level nozzle)` }, chamberPressure: { value: 30 * MPa, source: `${W}SpaceX_Raptor (Raptor 2)` } },
  'Raptor 2 / RVac': { family: 'methalox', chamberPressure: { value: 30 * MPa, source: `${W}SpaceX_Raptor (Raptor 2)` },
    note: 'lumped: a blend of sea-level Raptors and RVacs, so ε is the one that closes the blended pair' },
  // --- Saturn V, Mercury-Redstone
  'F-1': { family: 'kerolox', expansionRatio: { value: 16, source: `${W}Rocketdyne_F-1 (NASA F-1 fact sheet)` }, chamberPressure: { value: 7.0 * MPa, source: `${W}Rocketdyne_F-1` } },
  'Rocketdyne F-1': { family: 'kerolox', expansionRatio: { value: 16, source: `${W}Rocketdyne_F-1 (NASA F-1 fact sheet)` }, chamberPressure: { value: 7.0 * MPa, source: `${W}Rocketdyne_F-1` } },
  'J-2': { family: 'hydrolox', expansionRatio: { value: 27.5, source: `${W}Rocketdyne_J-2 (NASA J-2 fact sheet)` }, chamberPressure: { value: 5.26 * MPa, source: `${W}Rocketdyne_J-2` } },
  'Rocketdyne J-2': { family: 'hydrolox', expansionRatio: { value: 27.5, source: `${W}Rocketdyne_J-2 (NASA J-2 fact sheet)` }, chamberPressure: { value: 5.26 * MPa, source: `${W}Rocketdyne_J-2` } },
  'Rocketdyne A-7': { family: 'kerolox', expansionRatio: { value: 4, estimate: 'not published here: an early alcohol–oxygen sea-level engine, whose sea-level/vacuum thrust of 0.886 fits ε ≈ 4 at about 2 MPa' } },
};
