/**
 * Build → Orbit with no launch (roadmap D06, docs/ROADMAP-PART2-3.md; Phase 4
 * map §2.6 a, track C1): a designed satellite handed to the Orbit section as
 * the S03 hand-off (src/orbit/handoff.ts), and what the Orbit section's tools
 * then read from it — the lifetime dialog (P07) its mass, area, C_D and C_R.
 *
 * REFERENCES. None published: a hand-off is a transform of the figures it is
 * given, so every check here is analytic — a figure copied must arrive
 * exactly, and a state made from elements must give the same elements back
 * to within floating-point round-off. The tolerances are written in each
 * test before its first comparison.
 */
import { describe, expect, it } from 'vitest';
import { handoffFromState, lifetimeSpacecraft, parseHandoff, type HandoffSpacecraft } from '../src/orbit/handoff';
import { playgroundLifetimeCraft } from '../src/orbit/playground-model';
import { spacecraftFor } from '../src/physics/propagator/spacecraft';

const JD = 2461312.5; // 2026-09-29 00:00 UTC

describe('the lifetime dialog\'s spacecraft, from a hand-off (P07)', () => {
  const sc: HandoffSpacecraft = { mass: 812.5, area: 3.25, cd: 2.4, cr: 1.45, kind: 'earthObs', propulsion: { thrust: 22, isp: 220, propellantMass: 62.5 } };
  const h = handoffFromState({ r: { x: 7e6, y: 0, z: 0 }, v: { x: 0, y: 7546, z: 0 }, jd: JD, spacecraft: sc, label: 'test' });

  it('is the hand-off\'s mass, area, C_D and C_R, as a copy the form may edit', () => {
    // exact: the four figures are copied, not computed
    const craft = lifetimeSpacecraft(h);
    expect(craft).toEqual({ mass: 812.5, area: 3.25, cd: 2.4, cr: 1.45 });
    craft.area = 99;
    expect(h.spacecraft.area).toBe(3.25);
  });

  it('from the playground: the one handed on at the craft\'s mass, else the science class\'s estimate (O03, as before)', () => {
    // exact: these are the playground's rules as they stood before they left its DOM part
    expect(playgroundLifetimeCraft(h, { mass: 700 })).toEqual({ ...sc, mass: 700 });
    expect(playgroundLifetimeCraft(h, null)).toEqual(sc);
    expect(playgroundLifetimeCraft(null, { mass: 1800 })).toEqual({ ...spacecraftFor('science', 1800), kind: 'science', propulsion: null });
    expect(playgroundLifetimeCraft(null, null)).toEqual({ ...spacecraftFor('science', 1000), kind: 'science', propulsion: null });
    // what the playground then hands the dialog is a sound hand-off
    expect(parseHandoff(JSON.parse(JSON.stringify(handoffFromState({ r: { x: 7e6, y: 0, z: 0 }, v: { x: 0, y: 7546, z: 0 }, jd: JD,
      spacecraft: playgroundLifetimeCraft(h, { mass: 700 }), label: 'pg' }))))).not.toBeNull();
  });
});
