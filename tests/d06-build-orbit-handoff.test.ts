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
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  handoffFromFlight, handoffFromState, lifetimeSpacecraft, parseHandoff, type HandoffFrame, type HandoffSpacecraft,
} from '../src/orbit/handoff';
import { handoffOrbit, playgroundLifetimeCraft } from '../src/orbit/playground-model';
import { craftFromHandoff, deltaVAvailable } from '../src/orbit/budget';
import { apsidesToAE, nodeLocalTime, orbitFacts, stateAt, sunSynchronousInclination } from '../src/orbit/kepler';
import { tumblingBoxArea } from '../src/orbit/reentry';
import { spacecraftFor } from '../src/physics/propagator/spacecraft';
import { SATELLITES, satelliteById } from '../src/data/satellites';
import { DEG, G0, MU_EARTH, R_EARTH } from '../src/physics/constants';
import type { SatelliteKind, SatelliteSpec } from '../src/types';
import { designOrbit, handoffFromDesign, type DesignHandoffInput } from '../src/design/satellite-handoff';
import type { SatelliteDesign } from '../src/design/satellite-spec';
import type { BuildScreenHost } from '../src/ui/build/build-screen';
import type { AppLevel } from '../src/ui/app-mode';
import type { OrbitHandoff } from '../src/orbit/handoff';

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

/*
 * Two test designs, not templates (track B makes those), with every field a
 * design has; only the orbit, the bus, the engine and the kind reach a
 * hand-off. The imager is sun-synchronous with its descending node at 10:30
 * (ascending at 22:30), its inclination left at a rounded 98.2° as a student
 * might type it; the CubeSat has NAPA-2's published size and mass, 20 ×
 * 10 × 34.05 cm and 10 kg (src/data/napa2.ts, after Janes 2021:
 * https://www.janes.com/defence-intelligence-insights/defence-news/spacex-launches-royal-thai-air-forces-second-earth-observation-satellite),
 * in a fixed plane. Nothing is compared with those figures here: they are
 * inputs, and the NAPA-2 lifetime check (+8.0 % against 25 %) waits for the
 * template and the drag area (tracks B and A4).
 */
const imager: SatelliteDesign = {
  id: 'test-imager', name: 'Test imager', template: 'earthObs', kind: 'earthObs',
  orbit: { perigee: 695e3, apogee: 705e3, inclination: 98.2, sso: true, ltan: 22.5 },
  lifeYears: 5,
  bus: { dryMass: 750, size: { width: 1.8, height: 2.4, depth: 1.6 }, cd: 2.4, cr: 1.4 },
  power: { payloadW: 300, busW: 250, arrayArea: 8, cellEff: 0.28, Id: 0.77, degPerYear: 0.0275, mount: 'tracking', regulation: 'PPT',
    batteryWh: 1200, dod: 0.3, batteryEff: 0.9 },
  propulsion: { thrust: 22, isp: 220, propellant: 62.5 },
  adcs: { mode: 'threeAxis', inertia: [400, 450, 300], pointingDeg: 0.05, wheelH: 12, residualDipole: 1, cpOffset: 0.2 },
  comms: { txPowerW: 10, frequency: 8.2e9, txAntennaD: 0.3, lineLoss: 1, dataRate: 150e6, requiredEbN0: 5.52, station: 'bangkok', minElDeg: 5 },
  payload: { focalLength: 3.6, pixelPitch: 7e-6, pixels: 12000, aperture: 0.6, bits: 12 },
};
const cubesat: SatelliteDesign = {
  id: 'test-6u', name: 'Test 6U', template: 'cubesat6u', kind: 'science',
  orbit: { perigee: 500e3, apogee: 500e3, inclination: 97.4, sso: false, ltan: 10, raan: 45 },
  lifeYears: 3,
  bus: { dryMass: 10, size: { width: 0.2, height: 0.1, depth: 0.3405 }, cd: 2.2, cr: 1.3 },
  power: { payloadW: 5, busW: 8, arrayArea: 0.12, cellEff: 0.28, Id: 0.77, degPerYear: 0.0275, mount: 'body', regulation: 'DET',
    batteryWh: 40, dod: 0.2, batteryEff: 0.9 },
  propulsion: null,
  adcs: { mode: 'threeAxis', inertia: [0.1, 0.12, 0.05], pointingDeg: 1, wheelH: 0.01, residualDipole: 0.01, cpOffset: 0.01 },
  comms: { txPowerW: 2, frequency: 2.2e9, txAntennaD: 0.1, lineLoss: 1, dataRate: 1e6, requiredEbN0: 5.52, station: 'bangkok', minElDeg: 10 },
  payload: null,
};
/** A stand-in for track A4's `dragArea` (src/design/satellite-area.ts, not landed on this base): the tumbling body alone. */
const bodyArea = (d: SatelliteDesign): number => tumblingBoxArea([d.bus.size.width, d.bus.size.height, d.bus.size.depth]);
const input: DesignHandoffInput = { jd: JD, dragArea: bodyArea, label: 'from the Build section' };
const wet = (d: SatelliteDesign): number => d.bus.dryMass + (d.propulsion ? d.propulsion.propellant : 0);
const roundTrip = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe('Build → Orbit: a design handed on with no launch (D06, map §2.6 a)', () => {
  it('reads back as sound and carries what the design says', () => {
    // exact: parseHandoff gives back what it is given, and every spacecraft figure is copied (the wet mass is one sum, dry + propellant)
    for (const d of [imager, cubesat]) {
      const h = handoffFromDesign(d, input)!;
      expect(h, d.id).not.toBeNull();
      expect(parseHandoff(roundTrip(h))).toEqual(h);
      expect(h.spacecraft).toEqual({
        mass: wet(d), area: bodyArea(d), cd: d.bus.cd, cr: d.bus.cr, kind: d.kind,
        propulsion: d.propulsion ? { thrust: d.propulsion.thrust, isp: d.propulsion.isp, propellantMass: d.propulsion.propellant } : null,
      });
      // the state is the design's orbit at its epoch, stateAt(…, 0, true), as the map says
      const s = stateAt(designOrbit(d.orbit, JD), 0, true);
      expect(h.r).toEqual([s.r.x, s.r.y, s.r.z]);
      expect(h.v).toEqual([s.v.x, s.v.y, s.v.z]);
      expect(h.jd).toBe(JD);
      expect(h.label).toBe('from the Build section');
      // no launch: no mission, no vehicle, no mission time
      expect(h.origin).toEqual({ mission: null, vehicleName: '', missionTime: 0 });
    }
    expect(handoffFromDesign(imager, input)!.spacecraft.mass).toBe(812.5);
  });

  it('is in the orbit the design asks for', () => {
    // Tolerances, fixed before the first comparison: the orbit goes elements → state → elements (handoffOrbit, as the
    // playground loads it) in double precision, so the apsis altitudes come back within 1 mm, the angles within 1e-9 rad
    // and the node's local time within 1e-9 h.
    const MM = 1e-3, ANGLE = 1e-9, HOURS = 1e-9;
    const back = handoffOrbit(handoffFromDesign(imager, input)!);
    const facts = orbitFacts(back, true);
    expect(Math.abs(facts.perigeeAlt - 695e3)).toBeLessThan(MM);
    expect(Math.abs(facts.apogeeAlt - 705e3)).toBeLessThan(MM);
    // sun-synchronous: J2's inclination for that size and shape (98.188°), not the rounded 98.2° stored
    const sso = sunSynchronousInclination(apsidesToAE(695e3, 705e3))!;
    expect(Math.abs(back.i - sso)).toBeLessThan(ANGLE);
    expect(Math.abs(sso - 98.2 * DEG)).toBeGreaterThan(1e-4);
    expect(facts.sunSynchronous).toBe(true);
    expect(Math.abs(nodeLocalTime(back.raan, JD) - 22.5)).toBeLessThan(HOURS);
    // a fixed plane: the stored inclination and node; a local time is read only with sso
    const fixed = handoffOrbit(handoffFromDesign(cubesat, input)!);
    const f = orbitFacts(fixed, true);
    expect(Math.abs(f.perigeeAlt - 500e3)).toBeLessThan(MM);
    expect(Math.abs(f.apogeeAlt - 500e3)).toBeLessThan(MM);
    expect(Math.abs(fixed.i - 97.4 * DEG)).toBeLessThan(ANGLE);
    expect(Math.abs(fixed.raan - 45 * DEG)).toBeLessThan(ANGLE);
    // where no orbit of that size is sun-synchronous, the stored inclination (the design's checker reports the flag)
    const high = designOrbit({ perigee: 8000e3, apogee: 8000e3, inclination: 60, sso: true, ltan: 10 }, JD);
    expect(sunSynchronousInclination(high)).toBeNull();
    expect(high.i).toBe(60 * DEG);
  });

  it('gives the lifetime dialog the design\'s mass, area, C_D and C_R, and the planner its engine', () => {
    // exact: the four figures are copied from the design (the mass is dry + propellant) and must arrive unchanged
    for (const d of [imager, cubesat]) {
      const h = parseHandoff(roundTrip(handoffFromDesign(d, input)))!;
      const figures = { mass: wet(d), area: bodyArea(d), cd: d.bus.cd, cr: d.bus.cr };
      // opened on the hand-off itself
      expect(lifetimeSpacecraft(h), d.id).toEqual(figures);
      // opened from the playground it went to: setHandoff makes the launch craft from it
      // (src/ui/orbit/playground.ts), and the dialog gets the orbit flown now with that spacecraft
      const pg = handoffFromState({ r: { x: h.r[0], y: h.r[1], z: h.r[2] }, v: { x: h.v[0], y: h.v[1], z: h.v[2] }, jd: h.jd,
        spacecraft: playgroundLifetimeCraft(h, craftFromHandoff(h)), label: 'pg' });
      expect(lifetimeSpacecraft(parseHandoff(roundTrip(pg))!), d.id).toEqual(figures);
    }
    // The planner's craft is the design's engine with full tanks, so its Δv is the design's. Tolerance: 1e-12
    // relative, the rocket equation evaluated here and in deltaVAvailable in double precision.
    const craft = craftFromHandoff(handoffFromDesign(imager, input)!)!;
    expect(craft).toEqual({ mass: 812.5, propellant: 62.5, isp: 220, thrust: 22 });
    const dv = 220 * G0 * Math.log(812.5 / 750);
    expect(Math.abs(deltaVAvailable(craft) - dv) / dv).toBeLessThan(1e-12);
    expect(craftFromHandoff(handoffFromDesign(cubesat, input)!)).toBeNull();
  });

  it('carries any of the eight kinds, and refuses a design the hand-off cannot carry', () => {
    const kinds: SatelliteKind[] = ['comsat', 'earthObs', 'weather', 'navigation', 'science', 'cubesats', 'starlink', 'crew'];
    for (const kind of kinds) expect(handoffFromDesign({ ...cubesat, kind }, input)?.spacecraft.kind).toBe(kind);
    // no orbit above the atmosphere: the perigee at 90 km, under the hand-off's 100 km
    expect(handoffFromDesign({ ...cubesat, orbit: { ...cubesat.orbit, perigee: 90e3 } }, input)).toBeNull();
    // a figure not above zero, or not a number
    expect(handoffFromDesign(cubesat, { ...input, dragArea: () => 0 })).toBeNull();
    expect(handoffFromDesign({ ...cubesat, bus: { ...cubesat.bus, cd: 0 } }, input)).toBeNull();
    expect(handoffFromDesign({ ...cubesat, bus: { ...cubesat.bus, cr: -1 } }, input)).toBeNull();
    expect(handoffFromDesign({ ...cubesat, bus: { ...cubesat.bus, dryMass: Number.NaN } }, input)).toBeNull();
    expect(handoffFromDesign({ ...imager, propulsion: { ...imager.propulsion!, thrust: 0 } }, input)).toBeNull();
  });

  it('is what the Build screen hands main.ts to open in the Orbit section (tsc checks it)', () => {
    type ToOrbit = NonNullable<BuildScreenHost['toOrbit']>;
    expectTypeOf<Parameters<ToOrbit>>().toEqualTypeOf<[OrbitHandoff, AppLevel]>();
    expectTypeOf<NonNullable<ReturnType<typeof handoffFromDesign>>>().toEqualTypeOf<OrbitHandoff>();
  });
});
