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
 * catalogue's exactly. So for a ground-lit engine that has an ε, the p_c in
 * its record is shown and checked against the one it flies
 * (tests/nozzle-law.test.ts), never flown: the Merlin 1D flies 12.05 MPa for
 * its published 9.7.
 *
 * PROVENANCE. Every number here has its entry in `NOZZLE_SOURCES` (and each γ
 * in `NOZZLE_GAMMA_SOURCES`), field by field: a published `source`, or an
 * `estimate` with the reasoning. The two tables are kept apart so that the
 * flight, which reads only the numbers, does not ship the text (the bundle
 * budget, D-38). tests/nozzle-law.test.ts holds every engine any built-in
 * vehicle or catalogue part flies to an entry here, and every number to exactly
 * one source or estimate and every source to a number. An engine name with no
 * entry (a custom engine in a mission file) flies `FALLBACK_NOZZLE` in
 * src/physics/nozzle.ts, which is an estimate and says so.
 */

import type { PropellantFamily } from '../physics/rigid/vehicle-data';

/** Where one number of the table comes from: a published `source`, or an `estimate` and why. */
export type Provenance = { source: string } | { estimate: string };

export interface NozzleRecord {
  family: PropellantFamily;
  /** nozzle area ratio A_e/A_t */
  expansionRatio?: number;
  /** chamber pressure at full thrust, Pa */
  chamberPressure?: number;
  /** exit diameter of one nozzle, m, and the nozzles in one count unit */
  exitDiameter?: { value: number; nozzles: number };
}

/** Each number of a `NozzleRecord` with where it comes from, and a note on the record. */
export interface NozzleProvenance {
  expansionRatio?: Provenance;
  chamberPressure?: Provenance;
  exitDiameter?: Provenance;
  note?: string;
}

/**
 * γ of the exhaust in a one-dimensional isentropic nozzle, by propellant. One
 * number per family is the usual preliminary-design simplification; real
 * exhaust shifts in composition along the nozzle. Hydrolox is the 1.26
 * Schmucker uses for the SSME (NASA TM-77396, 1984, Appendix); the others are
 * estimates in the range of frozen-flow exhaust for each family
 * (`NOZZLE_GAMMA_SOURCES`).
 */
export const NOZZLE_GAMMA: Readonly<Record<PropellantFamily, number>> = {
  hydrolox: 1.26,
  kerolox: 1.22,
  methalox: 1.22,
  hypergolic: 1.24,
  solid: 1.18,
};

const MPa = 1e6;
const INCH = 0.0254;
/**
 * the J-2's exit, m: its throat area times its area ratio, π·d²/4 = 170.4 in² × 27.5,
 * √(4 · 170.4 · 27.5/π) in = 77.24 in; written out, since a call here would ship in every chunk
 * that reads the table (tests/nozzle-law.test.ts recomputes it)
 */
const J2_EXIT = 1.9619589574852854;

/** The numbers the thrust law flies, per engine name; where each comes from is `NOZZLE_SOURCES`. */
export const NOZZLES: Readonly<Record<string, NozzleRecord>> = {
  // --- R-7 family
  'RD-107A': { family: 'kerolox', chamberPressure: 6 * MPa },
  'RD-108A': { family: 'kerolox', chamberPressure: 5.44 * MPa },
  'RD-107 (8D74)': { family: 'kerolox', chamberPressure: 5.88 * MPa },
  'RD-107 (8D74PS)': { family: 'kerolox', chamberPressure: 5.88 * MPa },
  'RD-107 (8D74K)': { family: 'kerolox', chamberPressure: 5.88 * MPa },
  'RD-108 (8D75)': { family: 'kerolox', chamberPressure: 5.1 * MPa },
  'RD-108 (8D75PS)': { family: 'kerolox', chamberPressure: 5.1 * MPa },
  'RD-108 (8D75K)': { family: 'kerolox', chamberPressure: 5.1 * MPa },
  'RD-0110': { family: 'kerolox', expansionRatio: 30, chamberPressure: 6.8 * MPa },
  'RD-0124': { family: 'kerolox', expansionRatio: 250, chamberPressure: 15.69 * MPa },
  'RD-0124A': { family: 'kerolox', expansionRatio: 250, chamberPressure: 15.69 * MPa },
  'RD-0109': { family: 'kerolox', expansionRatio: 25.1, chamberPressure: 5 * MPa },
  'S5.92': { family: 'hypergolic', expansionRatio: 64, chamberPressure: 9.61 * MPa },
  // --- Proton, Angara
  'RD-276': { family: 'hypergolic', expansionRatio: 26.2, chamberPressure: 16.5 * MPa },
  'RD-0210/0211': { family: 'hypergolic', chamberPressure: 14.7 * MPa },
  'RD-0213 + RD-0214': { family: 'hypergolic', chamberPressure: 14.7 * MPa },
  'S5.98M': { family: 'hypergolic', expansionRatio: 74, chamberPressure: 9.8 * MPa },
  'RD-191': { family: 'kerolox', expansionRatio: 37, chamberPressure: 25.8 * MPa },
  // --- Falcon
  'Merlin 1D': { family: 'kerolox', expansionRatio: 16, chamberPressure: 9.7 * MPa },
  'Merlin Vacuum': { family: 'kerolox', expansionRatio: 165, chamberPressure: 9.7 * MPa },
  // --- Atlas V, Vulcan
  'RD-180': { family: 'kerolox', expansionRatio: 36.87, chamberPressure: 26.7 * MPa },
  'GEM-63': { family: 'solid', expansionRatio: 14 },
  'GEM-63XL': { family: 'solid', expansionRatio: 14 },
  'RL10C-1': { family: 'hydrolox', expansionRatio: 130, exitDiameter: { value: 57 * INCH, nozzles: 1 } },
  'RL10C-1-1': { family: 'hydrolox', expansionRatio: 155, exitDiameter: { value: 62 * INCH, nozzles: 1 } },
  'BE-4': { family: 'methalox', chamberPressure: 14 * MPa },
  // --- Ariane 6, Vega-C
  'Vulcain 2.1': { family: 'hydrolox', chamberPressure: 12.08 * MPa },
  'P120C': { family: 'solid', expansionRatio: 16 },
  'Vinci': { family: 'hydrolox', expansionRatio: 174, chamberPressure: 6 * MPa, exitDiameter: { value: 1.82, nozzles: 1 } },
  'Zefiro 40': { family: 'solid', expansionRatio: 25 },
  'Zefiro 9': { family: 'solid', expansionRatio: 58 },
  'AVUM+ (RD-869)': { family: 'hypergolic', expansionRatio: 60, chamberPressure: 2.04 * MPa },
  // --- Long March
  'YF-77': { family: 'hydrolox', expansionRatio: 49, chamberPressure: 10.1 * MPa },
  'YF-100': { family: 'kerolox', expansionRatio: 35, chamberPressure: 18 * MPa },
  'YF-75D': { family: 'hydrolox', expansionRatio: 80, chamberPressure: 4.1 * MPa },
  'YF-75': { family: 'hydrolox', expansionRatio: 80, chamberPressure: 3.76 * MPa },
  'YF-21C (4× YF-20C)': { family: 'hypergolic', expansionRatio: 12.69, chamberPressure: 7.1 * MPa },
  'YF-24C (YF-22C + 4× YF-23C)': { family: 'hypergolic', chamberPressure: 7.1 * MPa },
  'YF-25': { family: 'hypergolic', expansionRatio: 12.69, chamberPressure: 7.1 * MPa },
  // --- Japan
  'LE-9': { family: 'hydrolox', expansionRatio: 37, chamberPressure: 10 * MPa },
  'LE-7A': { family: 'hydrolox', expansionRatio: 51.9, chamberPressure: 12 * MPa },
  'LE-5B-3': { family: 'hydrolox', expansionRatio: 110, chamberPressure: 3.61 * MPa },
  'LE-5B': { family: 'hydrolox', expansionRatio: 110, chamberPressure: 3.58 * MPa },
  'SRB-3': { family: 'solid', expansionRatio: 12 },
  'SRB-A3': { family: 'solid', expansionRatio: 12 },
  // --- India
  'S139': { family: 'solid', expansionRatio: 8 },
  'PSOM-XL': { family: 'solid', expansionRatio: 10 },
  'Vikas': { family: 'hypergolic', chamberPressure: 5.85 * MPa },
  'HPS3': { family: 'solid', expansionRatio: 50 },
  'L-2-5': { family: 'hypergolic', expansionRatio: 60, chamberPressure: 0.9 * MPa },
  // --- Electron
  'Rutherford': { family: 'kerolox', expansionRatio: 15 },
  'Rutherford Vacuum': { family: 'kerolox', expansionRatio: 60, chamberPressure: 12.3 * MPa },
  'Curie': { family: 'hypergolic', expansionRatio: 60, chamberPressure: 1 * MPa },
  // --- Starship
  'Raptor 2': { family: 'methalox', expansionRatio: 34.34, chamberPressure: 30 * MPa },
  'Raptor 2 / RVac': { family: 'methalox', chamberPressure: 30 * MPa },
  // --- Saturn V, Mercury-Redstone
  'F-1': { family: 'kerolox', expansionRatio: 16, chamberPressure: 7 * MPa },
  'Rocketdyne F-1': { family: 'kerolox', expansionRatio: 16, chamberPressure: 7 * MPa },
  'J-2': { family: 'hydrolox', expansionRatio: 27.5, chamberPressure: 5.26 * MPa, exitDiameter: { value: J2_EXIT, nozzles: 1 } },
  'Rocketdyne J-2': { family: 'hydrolox', expansionRatio: 27.5, chamberPressure: 5.26 * MPa, exitDiameter: { value: J2_EXIT, nozzles: 1 } },
  'Rocketdyne A-7': { family: 'kerolox', expansionRatio: 4 },
};

// --- Provenance: read by the tests and the docs, never by the flight (so the bundle leaves it out)

// plain literals, not templates: an interpolated template is kept by the bundler as a statement

/** Where each γ comes from. */
export const NOZZLE_GAMMA_SOURCES: Readonly<Record<PropellantFamily, Provenance>> = {
  hydrolox: { source: 'R. H. Schmucker, Flow processes in overexpanded chemical rocket nozzles, Part 1: Flow separation, NASA TM-77396 (1984), Appendix (SSME, κ = 1.26), https://ntrs.nasa.gov/citations/19840011402' },
  kerolox: { estimate: 'frozen-flow exhaust of LOX and kerosene, typically 1.2–1.24' },
  methalox: { estimate: 'frozen-flow exhaust of LOX and methane, typically 1.2–1.24' },
  hypergolic: { estimate: 'frozen-flow exhaust of N₂O₄ and a hydrazine, typically 1.22–1.26' },
  solid: { estimate: 'aluminised composite propellant exhaust with condensed alumina, typically 1.15–1.2' },
};

/** Where every number of `NOZZLES` comes from, field by field (tests/nozzle-law.test.ts holds the two tables to each other). */
export const NOZZLE_SOURCES: Readonly<Record<string, NozzleProvenance>> = {
  // --- R-7 family
  'RD-107A': {
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/RD-107 (family tables, citing lpre.de and NPO Energomash)' },
  },
  'RD-108A': {
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/RD-107 (family tables, citing lpre.de and NPO Energomash)' },
  },
  'RD-107 (8D74)': {
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/RD-107 (family tables, citing lpre.de and NPO Energomash)' },
  },
  'RD-107 (8D74PS)': {
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/RD-107 (family tables, citing lpre.de and NPO Energomash): the 8D74\'s figure, taken for the 1957 build' },
  },
  'RD-107 (8D74K)': {
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/RD-107 (family tables, citing lpre.de and NPO Energomash): the 8D74\'s figure, taken for the Vostok build' },
  },
  'RD-108 (8D75)': {
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/RD-107 (family tables, citing lpre.de and NPO Energomash)' },
  },
  'RD-108 (8D75PS)': {
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/RD-107 (family tables, citing lpre.de and NPO Energomash): the 8D75\'s figure, taken for the 1957 build' },
  },
  'RD-108 (8D75K)': {
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/RD-107 (family tables, citing lpre.de and NPO Energomash): the 8D75\'s figure, taken for the Vostok build' },
  },
  'RD-0110': {
    expansionRatio: { estimate: 'not published (searched 2026-10-17: Wikipedia, russianspaceweb.com/rd0110.html, astronautix): the ε at which an ideal nozzle gives its 326 s against the RD-107A’s 319 s at the ε ≈ 19 its pair and chamber pressure close at (same family and cycle); the ratio of ideal C_F gives 29.6. Its four nozzles, 0.48 m each at this ε, sit inside the engine’s 2 240 mm (russianspaceweb.com)' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/RD-0110 (KBKhA)' },
  },
  'RD-0124': {
    expansionRatio: { estimate: 'not published (searched 2026-10-17): the ε at which an ideal nozzle gives its 359 s against the RD-191’s 337.5 s at ε 37 (staged combustion both); four such nozzles fit its 2.4 m envelope. ESA (“RD-0124”, 2004) says it keeps the RD-0110’s dimensions with a higher chamber pressure and larger area ratios, which is the direction this takes' },
    chamberPressure: { source: 'http://www.lpre.de/kbkha/RD-0124/index.htm' },
  },
  'RD-0124A': {
    expansionRatio: { estimate: 'as the RD-0124, whose nozzles it keeps' },
    chamberPressure: { source: 'http://www.lpre.de/kbkha/RD-0124/index.htm (the RD-0124’s)' },
  },
  'RD-0109': {
    expansionRatio: { estimate: 'not published: the ε at which an ideal nozzle gives its 323.5 s against the RD-107A’s 319 s at its ε ≈ 19 (the ratio of ideal C_F gives 25.1)' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/RD-0109 (KBKhA)' },
  },
  'S5.92': {
    expansionRatio: { estimate: 'not published (searched 2026-10-17): the ε at which an ideal nozzle gives its 327 s against the RD-276’s 316 s at ε 26.2. The 0.30 m exit it gives sits well inside the engine’s envelope, 677 × 838 × 1 028 mm as a search of the S5.92 pages reported it on 2026-10-17 (the pages themselves could not be opened from this session)' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/S5.92' },
  },
  // --- Proton, Angara
  'RD-276': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/RD-275' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/RD-275' },
  },
  'RD-0210/0211': {
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/RD-0210 (KBKhA)' },
  },
  'RD-0213 + RD-0214': {
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/RD-0212 (the RD-0210 family’s figure)' },
  },
  'S5.98M': {
    expansionRatio: { estimate: 'not published: the ε at which an ideal nozzle gives its 328.6 s against the RD-276’s 316 s at ε 26.2. A lower bound more than a best value: a 20 kN engine loses more to its boundary layer than the RD-276 and needs a larger ε for the same Isp; the engine’s overall diameter, 948 mm (Wikipedia, S5.98M), bounds the exit at 0.71 m² against the 0.08 m² this gives' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/S5.98M' },
  },
  'RD-191': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/RD-191' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/RD-191' },
  },
  // --- Falcon
  'Merlin 1D': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/Merlin_(rocket_engine) (Merlin 1D)' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/Merlin_(rocket_engine) (Aviation Week, 2011)' },
  },
  'Merlin Vacuum': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/Merlin_(rocket_engine) (SpaceX Falcon 9 page and Payload User’s Guide, 2015)' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/Merlin_(rocket_engine): the Merlin 1D’s chamber, which the vacuum engine shares' },
    note: 'exit diameter 3.30 m from ε and p_c, the 3.3 m usually quoted',
  },
  // --- Atlas V, Vulcan
  'RD-180': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/RD-180' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/RD-180' },
  },
  'GEM-63': {
    expansionRatio: { estimate: 'a 14:1 fixed carbon-phenolic nozzle by a forum post (rocketryforum.com), not found in Northrop Grumman’s data sheet' },
  },
  'GEM-63XL': {
    expansionRatio: { estimate: 'as the GEM-63' },
  },
  'RL10C-1': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/RL10 (variants table; Aerojet Rocketdyne)' },
    exitDiameter: { source: 'L3Harris (Aerojet Rocketdyne), RL10 engine spec sheet (2024), https://www.l3harris.com/all-capabilities/rl10-engine: nozzle diameter 57 in (RL10C-1, Atlas V)' },
  },
  'RL10C-1-1': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/RL10 (variants table; Aerojet Rocketdyne data sheet)' },
    exitDiameter: { source: 'L3Harris (Aerojet Rocketdyne), RL10 engine spec sheet (2024), https://www.l3harris.com/all-capabilities/rl10-engine: nozzle diameter 62 in (RL10C-1-1)' },
  },
  'BE-4': {
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/BE-4 (Ars Technica, 2016-03-09)' },
  },
  // --- Ariane 6, Vega-C
  'Vulcain 2.1': {
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/Vulcain_(rocket_engine) (ESA)' },
  },
  'P120C': {
    expansionRatio: { estimate: 'not published: a large first-stage solid of the P80’s class' },
  },
  'Vinci': {
    expansionRatio: { source: 'H. Coperet (Airbus Safran Launchers), Vinci engine thermo-structural composite nozzle extension for Ariane 6, IAC-17-C4.1.7 (2017): the extension “is 1872 mm high with an inlet diameter of 655 mm (Σ 22.5) and an exit diameter of 1820 mm (Σ 174)”, https://iafastro.directory/iac/paper/id/37293/summary/' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/Vinci_(rocket_engine) (ArianeGroup data sheet)' },
    exitDiameter: { source: 'H. Coperet (Airbus Safran Launchers), Vinci engine thermo-structural composite nozzle extension for Ariane 6, IAC-17-C4.1.7 (2017): the extension “is 1872 mm high with an inlet diameter of 655 mm (Σ 22.5) and an exit diameter of 1820 mm (Σ 174)”, https://iafastro.directory/iac/paper/id/37293/summary/' },
    note: 'Wikipedia’s ε 240 is the deployable extension of the Ariane 5 ME design; Ariane 6 flies the fixed two-cone one',
  },
  'Zefiro 40': {
    expansionRatio: { estimate: 'not published: a second-stage solid between the P120C and the Zefiro 9' },
  },
  'Zefiro 9': {
    expansionRatio: { source: 'ESA, Successful first test for Vega’s Zefiro 9 engine (2005-12-28): “the nozzle expansion ratio was reduced from 58 to 16” for the sea-level test, https://www.marsdaily.com/reports/Successful_First_Test_For_Vegas_Zefiro_9_Engine.html' },
  },
  'AVUM+ (RD-869)': {
    expansionRatio: { estimate: 'nothing published: a small vacuum engine of this class, ε in the tens (not in the RD-843’s published figures, searched 2026-10-17)' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/RD-843 (infobox, 2.04 MPa; the AVUM+ flies the RD-843, which uses the RD-869’s chamber: src/data/parts.ts). The infobox’s own citation was not checked: the page could not be opened from this session' },
  },
  // --- Long March
  'YF-77': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/YF-77' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/YF-77' },
  },
  'YF-100': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/YF-100' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/YF-100' },
  },
  'YF-75D': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/YF-75D (Nan 2013, IAC-13-C4.1)' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/YF-75D (Nan 2013, IAC-13-C4.1)' },
  },
  'YF-75': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/YF-75' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/YF-75' },
    note: 'lumped: the two engines’ total, so the exit area is both nozzles’',
  },
  'YF-21C (4× YF-20C)': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/YF-20 (the base engine\'s infobox), taken for the YF-20C' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/YF-20 (the base engine\'s infobox), taken for the YF-20C' },
  },
  'YF-24C (YF-22C + 4× YF-23C)': {
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/YF-20 (the base engine\'s infobox): the family’s chamber, taken for the YF-22C' },
  },
  'YF-25': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/YF-20 (the base engine\'s infobox), taken for its strap-on version' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/YF-20 (the base engine\'s infobox), taken for its strap-on version' },
  },
  // --- Japan
  'LE-9': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/LE-9 (MHI Technical Review)' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/LE-9' },
  },
  'LE-7A': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/LE-7' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/LE-7' },
  },
  'LE-5B-3': {
    expansionRatio: { source: 'N. Nagao et al., The modified fuel turbopump of 2nd stage engine for H3 launch vehicle, EUCASS 2017-189, Table 1, https://www.eucass.eu/doi/EUCASS2017-189.pdf' },
    chamberPressure: { source: 'N. Nagao et al., The modified fuel turbopump of 2nd stage engine for H3 launch vehicle, EUCASS 2017-189, Table 1, https://www.eucass.eu/doi/EUCASS2017-189.pdf' },
  },
  'LE-5B': {
    expansionRatio: { source: 'N. Nagao et al., The modified fuel turbopump of 2nd stage engine for H3 launch vehicle, EUCASS 2017-189, Table 1, https://www.eucass.eu/doi/EUCASS2017-189.pdf (LE-5B-2)' },
    chamberPressure: { source: 'N. Nagao et al., The modified fuel turbopump of 2nd stage engine for H3 launch vehicle, EUCASS 2017-189, Table 1, https://www.eucass.eu/doi/EUCASS2017-189.pdf (LE-5B-2)' },
  },
  'SRB-3': {
    expansionRatio: { estimate: 'not published: a strap-on solid of the SRB-A’s class' },
  },
  'SRB-A3': {
    expansionRatio: { estimate: 'not published: a strap-on solid of this class' },
  },
  // --- India
  'S139': {
    expansionRatio: { estimate: 'not published: an early large first-stage solid' },
  },
  'PSOM-XL': {
    expansionRatio: { estimate: 'not published: a small strap-on solid' },
  },
  'Vikas': {
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/Vikas_(rocket_engine) (the upgraded engine’s 58.5 bar)' },
  },
  'HPS3': {
    expansionRatio: { estimate: 'not published: an upper-stage solid' },
  },
  'L-2-5': {
    expansionRatio: { estimate: 'nothing published: a small vacuum engine of this class, ε in the tens' },
    chamberPressure: { estimate: 'not published: a pressure-fed engine of this class (ISRO, “ISRO successfully conducts long duration hot tests”, 2024: the PS4 engine is pressure-fed, 7.33 kN in vacuum)' },
  },
  // --- Electron
  'Rutherford': {
    expansionRatio: { estimate: 'not published: a sea-level kerolox bell, the Merlin 1D’s 16 or a little less' },
  },
  'Rutherford Vacuum': {
    expansionRatio: { estimate: 'nothing published: a small vacuum engine of this class, ε in the tens' },
    chamberPressure: { estimate: 'not published: the sea-level Rutherford’s chamber, since Rocket Lab says the two engines are identical but for the nozzle (rocketlabusa.com, “Rocket Lab qualifies second stage of Electron launch vehicle”, 2016); 12.3 MPa is the pressure the sea-level engine’s pair and its ε 15 close at' },
  },
  'Curie': {
    expansionRatio: { estimate: 'nothing published: a small vacuum engine of this class, ε in the tens' },
    chamberPressure: { estimate: 'a pressure-fed engine of this class' },
  },
  // --- Starship
  'Raptor 2': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/SpaceX_Raptor (sea-level nozzle). Uncertain: 34.34:1 is the 2019 Raptor’s (FAA, Appendix G exhaust plume calculations (2019), https://www.faa.gov/sites/faa.gov/files/space/stakeholder_engagement/spacex_starship/Appendix_G_Exhaust_Plume_Calculations.pdf: a 34.34:1 chamber nozzle at 3 669.5 psia; search summary); Raptor 2 opened the throat behind the same exit (Everyday Astronaut, Raptor 1 vs Raptor 2), so its ε is lower. The exit this record flies comes from the catalogue’s thrust pair, 1.585 m, against the 1.31 m (25.718 in radius) of FAA, Appendix G (2022), https://www.faa.gov/sites/faa.gov/files/2022-06/AppendixG_ExhaustPlumeCalculations.pdf, also a search summary; the pages themselves could not be opened, 2026-10-18' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/SpaceX_Raptor (Raptor 2)' },
  },
  'Raptor 2 / RVac': {
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/SpaceX_Raptor (Raptor 2)' },
    note: 'lumped: a blend of sea-level Raptors and RVacs, so ε is the one that closes the blended pair',
  },
  // --- Saturn V, Mercury-Redstone
  'F-1': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/Rocketdyne_F-1 (NASA F-1 fact sheet)' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/Rocketdyne_F-1' },
  },
  'Rocketdyne F-1': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/Rocketdyne_F-1 (NASA F-1 fact sheet)' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/Rocketdyne_F-1' },
  },
  'J-2': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/Rocketdyne_J-2 (NASA J-2 fact sheet)' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/Rocketdyne_J-2' },
    exitDiameter: { source: 'derived: the thrust chamber’s 170.4 in² throat (Aircraft Engine Historical Society, U.S. Manned Rocket Propulsion Evolution, part 8.22, https://www.enginehistory.org/Rockets/RPE08.22/RPE08.22.shtml) times the 27.5 area ratio, 1.96 m; one nozzle for the S-II’s and the S-IVB’s builds, which fly different thrusts' },
  },
  'Rocketdyne J-2': {
    expansionRatio: { source: 'https://en.wikipedia.org/wiki/Rocketdyne_J-2 (NASA J-2 fact sheet)' },
    chamberPressure: { source: 'https://en.wikipedia.org/wiki/Rocketdyne_J-2' },
    exitDiameter: { source: 'derived: the thrust chamber’s 170.4 in² throat (Aircraft Engine Historical Society, U.S. Manned Rocket Propulsion Evolution, part 8.22, https://www.enginehistory.org/Rockets/RPE08.22/RPE08.22.shtml) times the 27.5 area ratio, 1.96 m; one nozzle for the S-II’s and the S-IVB’s builds, which fly different thrusts' },
  },
  'Rocketdyne A-7': {
    expansionRatio: { estimate: 'not published here: an early alcohol–oxygen sea-level engine, whose sea-level/vacuum thrust of 0.886 fits ε ≈ 4 at about 2 MPa' },
  },
};
