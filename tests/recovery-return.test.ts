/**
 * Flying a spent first stage back: the guidance pieces on their own
 * (src/physics/sim/return-guidance.ts), the grid fins as actuators
 * (src/physics/rigid/surfaces.ts), and whole point-mass flights to Landing
 * Zones 1 and 2 and to a drone ship. The six-DOF return is flown in
 * tests/rigid-return.test.ts, Falcon Heavy's three cores in six-DOF in
 * tests/heavy/falcon-heavy-returns.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { flyWithReturns } from './return-harness';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { landingZoneById } from '../src/data/landing-zones';
import { recoveryReserves } from '../src/physics/vehicle';
import {
  boostbackCommand, brakingHeight, distanceFromTarget, divertAcceleration, entryStep, predictDescent, targetPosition,
  type DescentModel, type ReturnTarget,
} from '../src/physics/sim/return-guidance';
import { allocateSurfaces, gridFinSurfaces, stepSurfaces, surfaceWrench } from '../src/physics/rigid/surfaces';
import { add, dot, norm, normalize, scale, sub, v3 } from '../src/physics/vec3';
import { DEG, MU_EARTH, R_EARTH } from '../src/physics/constants';
import { enuFrame, groundPositionEci, groundVelocityEci } from '../src/physics/orbital';
import type { MissionConfig, RecoveryPlan } from '../src/types';

const GMST0 = 1.234;
const CAPE: ReturnTarget = { kind: 'pad', id: 'lz1', lat: 28.48575 * DEG, lon: -80.54294 * DEG, alt: 3, radius: 43 };
const STAGE: DescentModel = { cd: 1.2, area: Math.PI * 1.83 ** 2 * 1.5, j2: false };

/** A stage above the Cape at `alt`, moving `east`/`north`/`up` m/s over the ground. */
function above(target: ReturnTarget, alt: number, east: number, north: number, up: number, t = 0) {
  const r = groundPositionEci(target.lat, target.lon, alt, GMST0);
  const f = enuFrame(r);
  const v = add(groundVelocityEci(r), add(add(scale(f.east, east), scale(f.north, north)), scale(f.up, up)));
  return { r, v, t, mass: 40000, propellant: 10000 };
}

describe('return guidance', () => {
  it('predicts a vertical drop in vacuum-like conditions', () => {
    // Straight down from 100 km with a negligible drag area: the time is the free fall's.
    const s = above(CAPE, 100e3, 0, 0, 0);
    const p = predictDescent(s, { cd: 1, area: 1e-9, j2: false }, CAPE.alt);
    expect(p.landed).toBe(true);
    const g = MU_EARTH / (R_EARTH + 50e3) ** 2;
    expect(p.t).toBeCloseTo(Math.sqrt(2 * 100e3 / g), -1);
    expect(distanceFromTarget(p.r, CAPE, GMST0, p.t)).toBeLessThan(1500); // Coriolis only
  });

  it('steps the entry burn through armed, burning and done', () => {
    const burn = { targetSpeed: 700, reserve: 1000 };
    expect(entryStep('pending', true, 80e3, 900, 5000, burn)).toEqual({ state: 'pending', burn: false });
    expect(entryStep('pending', true, 69e3, 650, 5000, burn)).toEqual({ state: 'armed', burn: false });
    expect(entryStep('armed', true, 60e3, 750, 5000, burn)).toEqual({ state: 'burning', burn: true });
    expect(entryStep('burning', true, 55e3, 690, 5000, burn)).toEqual({ state: 'done', burn: false });
    expect(entryStep('burning', true, 55e3, 900, 900, burn)).toEqual({ state: 'done', burn: false });
    expect(entryStep('armed', true, 24e3, 900, 5000, burn)).toEqual({ state: 'done', burn: false });
  });

  it('brakes over the vacuum distance where there is no air, and over less where there is', () => {
    const common = { surfaceAlt: 0, vDown: 300, vTouch: 2, mass: 40000, thrust: () => 800e3, flow: 0, cd: 1.2, area: 15, gravity: 9.8 };
    const vacuum = (300 ** 2 - 2 ** 2) / (2 * (800e3 / 40000 - 9.8));
    expect(brakingHeight({ ...common, alt: 400e3 })).toBeCloseTo(vacuum, -1);
    expect(brakingHeight({ ...common, alt: 5000 })).toBeLessThan(0.8 * vacuum);
  });

  it('solves the boostback: the velocity it asks for puts the landing point on the pad', () => {
    // 60 km downrange east of LZ-1, climbing, still moving away at 1.2 km/s.
    const s = above(CAPE, 70e3, 1200, 0, 900);
    const east = enuFrame(s.r).east;
    s.r = add(s.r, scale(east, 60e3));
    const before = predictDescent(s, STAGE, CAPE.alt);
    const c = boostbackCommand(s, STAGE, CAPE, GMST0);
    expect(distanceFromTarget(before.r, CAPE, GMST0, before.t)).toBeGreaterThan(50e3);
    // It points back west, in the horizontal plane.
    expect(dot(c.dir, east)).toBeLessThan(-0.9);
    expect(Math.abs(dot(c.dir, normalize(s.r)))).toBeLessThan(1e-9);
    // One Newton step of the solution takes most of the miss out.
    let state = { ...s, v: add(s.v, scale(c.dir, c.dvNeeded)) };
    for (let i = 0; i < 4; i++) {
      const next = boostbackCommand(state, STAGE, CAPE, GMST0);
      state = { ...state, v: add(state.v, scale(next.dir, next.dvNeeded)) };
    }
    const after = predictDescent(state, STAGE, CAPE.alt);
    expect(distanceFromTarget(after.r, CAPE, GMST0, after.t)).toBeLessThan(20);
  });

  it('diverts towards the target and against the drift over the ground', () => {
    const s = above(CAPE, 2000, 0, 0, -200);
    expect(norm(divertAcceleration(s.r, s.v, CAPE, GMST0, 0, 10))).toBeLessThan(1e-6);
    const f = enuFrame(s.r);
    const east = add(s.r, scale(f.east, 100));
    expect(dot(divertAcceleration(east, s.v, CAPE, GMST0, 0, 10), f.east)).toBeLessThan(0);
    const drifting = add(s.v, scale(f.north, 20));
    expect(dot(divertAcceleration(s.r, drifting, CAPE, GMST0, 0, 10), f.north)).toBeLessThan(0);
    expect(norm(sub(targetPosition(CAPE, GMST0, 0), groundPositionEci(CAPE.lat, CAPE.lon, CAPE.alt, GMST0)))).toBeLessThan(1e-6);
  });
});

describe('grid fins', () => {
  const fins = gridFinSurfaces('s1', 42, 3.66, 3);
  const cg = v3(15, 0, 0);

  it('give the moment asked of them within their travel, nothing without air', () => {
    const q = 20e3;
    const wanted = v3(2e4, -1.5e5, 8e4);
    const deflections = allocateSurfaces(fins, wanted, q, 1, cg);
    const got = surfaceWrench(fins, deflections, q, 1, cg).momentBody;
    // Up to the small regularisation that keeps the split well-posed.
    expect(norm(sub(got, wanted))).toBeLessThan(1e-4 * norm(wanted));
    expect(allocateSurfaces(fins, wanted, 0, 1, cg)).toEqual([0, 0, 0, 0]);
    // Far beyond their authority they stop at the stops.
    const saturated = allocateSurfaces(fins, v3(0, 1e9, 0), q, 1, cg);
    for (const d of saturated) expect(Math.abs(d)).toBeLessThanOrEqual(20 * DEG + 1e-12);
  });

  it('push the other way in a stream from the nose', () => {
    const d = [0.1, 0.1, 0, 0];
    const base = surfaceWrench(fins, d, 1e4, 1, cg).forceBody;
    const nose = surfaceWrench(fins, d, 1e4, -1, cg).forceBody;
    expect(norm(add(base, nose))).toBeLessThan(1e-9);
  });

  it('move at their rate limit', () => {
    const next = stepSurfaces(fins, [0, 0, 0, 0], [0.3, -0.3, 0, 0.01], 0.1);
    expect(Math.abs(next[0])).toBeLessThanOrEqual(30 * DEG * 0.1 + 1e-12);
    expect(next[0]).toBeCloseTo(-next[1], 12);
    expect(next[2]).toBe(0);
  });
});

describe('recovery reserves', () => {
  it('keep the original reserve without a plan, the return reserve for a landing zone, none for an expended body', () => {
    const f9 = vehicleById('falcon9'), fh = vehicleById('falconheavy');
    expect(recoveryReserves(f9, false)).toEqual({ core: 0, boosters: 0 });
    expect(recoveryReserves(f9, true)).toEqual({ core: 0.12, boosters: 0.12 });
    expect(recoveryReserves(f9, true, { core: { kind: 'landingZone', zoneId: 'lz1' } }).core).toBe(0.15);
    expect(recoveryReserves(fh, true, { core: { kind: 'droneShip' }, boosters: [{ kind: 'landingZone', zoneId: 'lz1' }] }))
      .toEqual({ core: 0.12, boosters: 0.15 });
    expect(recoveryReserves(fh, true, { boosters: [{ kind: 'droneShip' }] })).toEqual({ core: 0, boosters: 0.12 });
  });
});

const fly = (vehicleId: string, payload: number, orbit: MissionConfig['orbit'], plan?: RecoveryPlan) =>
  flyWithReturns({ vehicleId, payload, orbit, plan, model: 'pointMass' });

describe('point-mass returns', () => {
  it('flies Falcon 9 back to Landing Zone 1 (Bandwagon-1)', { timeout: 120_000 }, () => {
    const sim = fly('falcon9', 1300, { ...orbitById('custom'), perigee: 590e3, apogee: 590e3, inclination: 45.4 },
      { core: { kind: 'landingZone', zoneId: 'lz1' } });
    const stage = sim.debris.find((d) => d.recovery)!;
    expect(stage.outcome).toBe('landed');
    expect(stage.recovery!.missDistance!).toBeLessThan(landingZoneById('lz1').radius);
    const keys = sim.events.map((e) => e.key);
    for (const key of ['evt.boostbackStart', 'evt.boostbackEnd', 'evt.entryBurnStart', 'evt.landingBurnStart']) expect(keys).toContain(key);
    expect(sim.events.find((e) => e.key === 'evt.boosterLandedZone')?.params?.zone).toBe('LZ-1');
    // Ordered as flown.
    const at = (key: string) => sim.events.find((e) => e.key === key)!.t;
    expect(at('evt.boostbackStart')).toBeLessThan(at('evt.boostbackEnd'));
    expect(at('evt.boostbackEnd')).toBeLessThan(at('evt.entryBurnStart'));
    expect(at('evt.entryBurnStart')).toBeLessThan(at('evt.landingBurnStart'));
  });

  it('flies Falcon Heavy\'s side boosters to LZ-1 and LZ-2 and its core to a drone ship (Arabsat-6A)', { timeout: 120_000 }, () => {
    const sim = fly('falconheavy', 6465, orbitById('gto'), {
      core: { kind: 'droneShip' }, boosters: [{ kind: 'landingZone', zoneId: 'lz1' }, { kind: 'landingZone', zoneId: 'lz2' }],
    });
    const zones = sim.events.filter((e) => e.key === 'evt.boosterLandedZone').map((e) => e.params?.zone).sort();
    expect(zones).toEqual(['LZ-1', 'LZ-2']);
    expect(sim.events.some((e) => e.key === 'evt.boosterLandedShip')).toBe(true);
    for (const d of sim.debris.filter((b) => b.recovery)) {
      expect(d.outcome).toBe('landed');
      expect(d.recovery!.missDistance!).toBeLessThan(d.recovery!.target!.radius);
    }
    // The ship is stationed where the core comes down, some 900 km downrange
    // (Of Course I Still Love You was 967 km out for the real flight).
    const core = sim.debris.find((d) => d.recovery?.target?.kind === 'droneShip')!;
    const ship = targetPosition(core.recovery!.target!, sim.plan.gmst0, 0);
    const pad = groundPositionEci(sim.site.latitude * DEG, sim.site.longitude * DEG, 0, sim.plan.gmst0);
    const range = R_EARTH * Math.acos(dot(normalize(ship), normalize(pad)));
    expect(range).toBeGreaterThan(700e3);
    expect(range).toBeLessThan(1200e3);
  });

  it('flies Super Heavy back into the arms of the Starbase tower', { timeout: 120_000 }, () => {
    const sim = flyWithReturns({ vehicleId: 'starship', siteId: 'starbase', payload: 15600, orbit: orbitById('leo'),
      plan: { core: { kind: 'landingZone', zoneId: 'olm' } }, model: 'pointMass' });
    const booster = sim.debris.find((d) => d.recovery)!;
    expect(booster.recovery!.caught).toBe(true);
    expect(booster.outcome).toBe('landed');
    expect(booster.recovery!.missDistance!).toBeLessThan(landingZoneById('olm').radius);
    expect(sim.events.some((e) => e.key === 'evt.boosterCaught')).toBe(true);
    // Held by the arms, its base 46 m above the ground at the pad.
    const height = norm(booster.r) - R_EARTH - sim.site.altitude;
    expect(height).toBeGreaterThan(40);
    expect(height).toBeLessThan(50);
  });

  it('keeps the original downrange recovery when there is no plan', () => {
    const sim = fly('falcon9', 1000, orbitById('leo'));
    const stage = sim.debris.find((d) => d.recovery)!;
    expect(stage.recovery!.target).toBeUndefined();
    expect(stage.outcome).toBe('landed');
    expect(sim.events.some((e) => e.key.startsWith('evt.boostback'))).toBe(false);
  });
});
