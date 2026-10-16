/**
 * What an engine's exhaust leaves in the air (roadmap V03), from its engine and
 * its propellant. Pure data, no Three.js: the Watch narration reads it too.
 */
import type { EngineSpec } from '../types';
import { PROPELLANT_LOADS } from '../physics/rigid/vehicle-data';

export type ExhaustKind = 'solid' | 'kerolox' | 'keroloxGG' | 'hydrolox' | 'methalox' | 'hypergolic';

// What a stage with no `PROPELLANT_LOADS` entry burns, by its engine's name:
// the historical vehicles' stages, and a custom build's, which gets an id of
// its own while its engine keeps the part's name (src/design/assemble.ts), so
// these lists know every engine part's name (tests/exhaust-trails.test.ts holds
// each to its part's family). A designation ending in a digit refuses only a
// further digit, so a variant letter still matches (RL10C-1, LE-5B-3, LE-7A,
// YF-21C, S5.98M) but a longer number does not (RL100; YF-20 in YF-209); a
// name (Vinci, Raptor, Merlin) need only begin a word of the engine's.
const HYDROLOX = /\b(?:vulcain|vinci|(?:j-?2|rl-?10|rs-?25|rs-?68|le-?[579]|hm-?7|yf-?7[357]|ce-?20)(?![0-9]))/i;
const METHALOX = /\b(?:raptor|(?:be-?4|tq-?12|yf-?209)(?![0-9]))/i;
// also Soyuz's KTDU and Vostok's TDU, Proton's upper stages (RD-0210 to
// RD-0214), Vega's AVUM, Electron's Curie and PSLV's fourth stage (L-2-5)
const HYPERGOLIC = /\b(?:k?tdu|vikas|aestus|(?:super)?draco|briz|fregat|avum|curie|(?:rd-?2[57][0-9]|rd-?021[0-4]|s5\.9[28]|yf-?2[0-9]|yf-?40|aj-?10|l-2-5)(?![0-9]))/i;
// Kerosene engines whose turbopump is driven by an open-cycle gas generator
// burning the main propellants fuel-rich, its sooty turbine exhaust leaving
// the vehicle unburnt: a darker trail.
// - Merlin: "a fuel-rich open-cycle gas generator"
//   (en.wikipedia.org/wiki/Merlin_(rocket_engine)); a first stage's Merlin 1D
//   dumps the turbine exhaust from a duct of its own beside the nozzle.
// - F-1: the generator burns about 17.5 US gal/s of RP-1 with 5.1 of oxygen,
//   O/F about 0.4 by mass against the chamber's 2.27, and its exhaust is
//   ducted into the nozzle extension as a film coolant
//   (enginehistory.org/Rockets/RPE08.11/OneSecond.shtml): the dark sheath
//   round a Saturn V's plume below the nozzles.
// - RD-0110 (Soyuz's Blok I): "a fuel rich gas generator" whose output leaves
//   through the stage's four steering nozzles (en.wikipedia.org/wiki/RD-0110,
//   ru.wikipedia.org/wiki/РД-0110). A variant (RD-0110R) matches too,
//   taken to work alike.
// - RD-0109 (Vostok's Blok E): open cycle, the turbopump on the main
//   propellants, the turbine gas dumped through the stage's control nozzles
//   (ru.wikipedia.org/wiki/РД-0109); the sources found do not give the
//   generator's mixture, taken as fuel-rich like its bureau's RD-0110.
// Blok I and Blok E light 150–175 km up, far above where trails.ts's smoke has
// faded, so in the catalogue only the Falcons' and the Saturn V's first stages
// show the darker trail. Not YF-100 nor YF-115: oxidiser-rich staged
// combustion (en.wikipedia.org/wiki/YF-100, /YF-115), their turbine gas burnt
// in the main chamber, like RD-180, RD-191 and RD-0124's. The R-7's RD-107
// and RD-108 turn their turbines with steam from hydrogen peroxide: no soot.
const GAS_GENERATOR = /\b(?:merlin|(?:f-?1|rd-?0109|rd-?0110)(?![0-9]))/i;

/** What a stage's (or a strap-on group's) exhaust leaves behind. */
export function exhaustKind(stage: { id: string; engine: EngineSpec }): ExhaustKind {
  const family = PROPELLANT_LOADS[stage.id]?.family;
  if (stage.engine.solid || family === 'solid') return 'solid';
  if (family === 'hydrolox' || family === 'methalox' || family === 'hypergolic') return family;
  const name = stage.engine.name;
  if (!family) {
    if (HYDROLOX.test(name)) return 'hydrolox';
    if (METHALOX.test(name)) return 'methalox';
    if (HYPERGOLIC.test(name)) return 'hypergolic';
  }
  // Kerosene from here: Falcon 9 and Soyuz keep no entry, as both burn it, and
  // an engine the lists above do not know is taken to burn it too.
  return GAS_GENERATOR.test(name) ? 'keroloxGG' : 'kerolox';
}
