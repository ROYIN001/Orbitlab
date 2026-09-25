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
  // Falcon 9 and Soyuz keep no entry: both burn kerosene. A Merlin's gas
  // generator dumps its fuel-rich exhaust beside the nozzle: a darker trail.
  return /merlin/i.test(stage.engine.name) ? 'keroloxGG' : 'kerolox';
}
