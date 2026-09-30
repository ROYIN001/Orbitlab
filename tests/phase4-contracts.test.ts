/**
 * The Phase 4 contracts (roadmap D06, D07; Phase 4 map step 0.3): the types
 * the tracks compile against — `SatelliteDesign` and `SatelliteTemplate`
 * (src/design/satellite-spec.ts), `MissionRequirements`
 * (src/design/requirements.ts) and the cores' signatures
 * (src/orbit/satellite-cores.ts) — held to the types they must agree with
 * elsewhere. src/design may not import the propagator (tests/propagator.test.ts),
 * so where a design type spells out a propagator type, this test holds the
 * two together; tsc does the checking, the runtime lines anchor the data.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { SatelliteDesign } from '../src/design/satellite-spec';
import type { MissionRequirements } from '../src/design/requirements';
import type { HandoffSpacecraft } from '../src/orbit/handoff';
import type { OrbitCores } from '../src/orbit/satellite-cores';
import { ECSS_LEVELS, type EcssLevel } from '../src/physics/propagator/activity';
import type { SatelliteKind } from '../src/types';

describe('Phase 4 contracts', () => {
  it('ask for the lifetime at one of ECSS\'s three fixed levels, the ones the propagator has', () => {
    expectTypeOf<MissionRequirements['activity']>().toEqualTypeOf<EcssLevel>();
    expect(Object.keys(ECSS_LEVELS)).toEqual(['low', 'moderate', 'high']);
  });

  it('give a design a kind the S03 hand-off carries, so Build → Orbit needs no format change', () => {
    expectTypeOf<SatelliteDesign['kind']>().toEqualTypeOf<SatelliteKind>();
    expectTypeOf<SatelliteDesign['kind']>().toEqualTypeOf<HandoffSpacecraft['kind']>();
  });

  it('gather every orbit core the map lists', () => {
    expectTypeOf<keyof OrbitCores>().toEqualTypeOf<'eclipse' | 'power' | 'disposal' | 'attitude' | 'link' | 'imaging'>();
  });
});
