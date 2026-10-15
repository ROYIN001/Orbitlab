/**
 * What an engine's exhaust leaves in the air (roadmap V03), from its engine and
 * its propellant. Pure data, no Three.js: the Watch narration reads it too.
 */
import type { EngineSpec } from '../types';
import { PROPELLANT_LOADS } from '../physics/rigid/vehicle-data';

export type ExhaustKind = 'solid' | 'kerolox' | 'keroloxGG' | 'hydrolox' | 'methalox' | 'hypergolic';

/** What a stage's (or a strap-on group's) exhaust leaves behind. */
export function exhaustKind(stage: { id: string; engine: EngineSpec }): ExhaustKind {
  const family = PROPELLANT_LOADS[stage.id]?.family;
  if (stage.engine.solid || family === 'solid') return 'solid';
  if (family === 'hydrolox' || family === 'methalox' || family === 'hypergolic') return family;

  const name = stage.engine.name;
  // Engine-name fallback for historical vehicles (Saturn V, Vostok, etc.) and custom builds
  if (!family) {
    if (/\b(j-?2|rl-?10|rs-?25|rs-?68|le-?[579]|vulcain|vinci|hm-?7|yf-?7[357]|ce-?20)\b/i.test(name)) {
      return 'hydrolox';
    }
    if (/\b(raptor|be-?4|tq-?12|yf-?209)\b/i.test(name)) {
      return 'methalox';
    }
    if (/\b(rd-?2[57][0-9]|s5\.[89][0-9]|ktdu|tdu|vikas|ps4|yf-?2[0-9]|yf-?40|aestus|aj-?10|draco|superdraco|briz|fregat)\b/i.test(name)) {
      return 'hypergolic';
    }
  }

  // Open-cycle gas-generator kerolox engines (Merlin 1D, Saturn V F-1, RD-0109/0110)
  // dump fuel-rich turbine exhaust alongside the main plume, leaving a darker soot trail.
  if (/\b(merlin|f-?1|rd-?010[59]|rd-?0110|yf-?100|yf-?115)\b/i.test(name)) {
    return 'keroloxGG';
  }
  return 'kerolox';
}
