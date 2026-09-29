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
import {
  handoffFromFlight, handoffFromState, lifetimeSpacecraft, parseHandoff, type HandoffFrame, type HandoffSpacecraft,
} from '../src/orbit/handoff';
import { playgroundLifetimeCraft } from '../src/orbit/playground-model';
import { craftFromHandoff } from '../src/orbit/budget';
import { spacecraftFor } from '../src/physics/propagator/spacecraft';
import { SATELLITES, satelliteById } from '../src/data/satellites';
import { MU_EARTH, R_EARTH } from '../src/physics/constants';
import type { SatelliteSpec } from '../src/types';

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

describe('a flight\'s hand-off prefers the satellite\'s own area, C_D and C_R (D06, map §2.6)', () => {
  // a frame in a 500 km circular orbit: what a flight's recording says at the hand-off
  const rc = R_EARTH + 500e3, vc = Math.sqrt(MU_EARTH / rc);
  const frame: HandoffFrame = { status: 'orbit', t: 600, jd: JD, r: { x: rc, y: 0, z: 0 }, v: { x: 0, y: vc, z: 0 }, elements: { e: 0, periapsisAlt: 500e3 } };
  /** as main.ts `orbitHandoffNow` hands one on: an engine's stage full, else the payload at its launch mass */
  const fly = (satellite: SatelliteSpec) => {
    const p = satellite.propulsion;
    return handoffFromFlight({
      frame, satellite, payloadMass: satellite.mass,
      spacecraftStage: p ? { dryMass: satellite.mass * (1 - p.propellantFraction), propellant: satellite.mass * p.propellantFraction } : null,
      vehicleName: 'test', mission: null, label: 'test',
    });
  };

  it('gives every catalogue satellite exactly the hand-off it had: none has figures of its own', () => {
    // exact, key order included: a built-in flight's hand-off must not change by a bit (Principle 7)
    expect(SATELLITES.filter((s) => s.area !== undefined || s.cd !== undefined || s.cr !== undefined)).toEqual([]);
    for (const s of SATELLITES) {
      const h = fly(s);
      const p = s.propulsion;
      const mass = p ? s.mass * (1 - p.propellantFraction) + s.mass * p.propellantFraction : s.mass;
      // the spacecraft as handoffFromFlight built it before D06
      const before = { ...spacecraftFor(s.kind, mass), kind: s.kind,
        propulsion: p ? { thrust: p.thrust, isp: p.isp, propellantMass: s.mass * p.propellantFraction } : null };
      expect(JSON.stringify(h.spacecraft), s.id).toBe(JSON.stringify(before));
    }
  });

  it('takes the satellite\'s own figures, each on its own, and reads back as sound', () => {
    // exact: the figures are copied, not computed
    const earthObs = satelliteById('earthObs');
    const estimate = fly(earthObs).spacecraft;
    const own = fly({ ...earthObs, area: 4.2, cd: 2.5, cr: 1.6 });
    expect(own.spacecraft).toEqual({ ...estimate, area: 4.2, cd: 2.5, cr: 1.6 });
    expect(parseHandoff(JSON.parse(JSON.stringify(own)))).toEqual(own);
    // the lifetime dialog reads them, opened from Launch or, handed on, from the playground
    const figures = { mass: estimate.mass, area: 4.2, cd: 2.5, cr: 1.6 };
    expect(lifetimeSpacecraft(own)).toEqual(figures);
    expect(lifetimeSpacecraft({ spacecraft: playgroundLifetimeCraft(own, craftFromHandoff(own)) })).toEqual(figures);
    // one figure given, the others the class's estimates
    expect(fly({ ...earthObs, area: 4.2 }).spacecraft).toEqual({ ...estimate, area: 4.2 });
    expect(fly({ ...earthObs, cd: 2.5 }).spacecraft).toEqual({ ...estimate, cd: 2.5 });
    expect(fly({ ...earthObs, cr: 1.6 }).spacecraft).toEqual({ ...estimate, cr: 1.6 });
  });

  it('falls back to the estimate for a figure a hand-off cannot carry, so it still reads back', () => {
    const cubesats = satelliteById('cubesats');
    const estimate = fly(cubesats).spacecraft;
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const h = fly({ ...cubesats, area: bad, cd: bad, cr: bad });
      expect(h.spacecraft, String(bad)).toEqual(estimate);
      expect(parseHandoff(JSON.parse(JSON.stringify(h)))).not.toBeNull();
    }
  });
});
