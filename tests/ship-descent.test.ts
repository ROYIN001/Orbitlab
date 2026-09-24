/**
 * A suborbital target and the ship that flies itself home from it (roadmap
 * item 10b): the planner and the cut-off, Starship's flaps as actuators
 * (src/physics/rigid/surfaces.ts), the belly-first attitude and table
 * (src/physics/sim/ship-descent.ts), and Flight 5 flown whole in the
 * point-mass model, from Starbase to a splashdown in the Indian Ocean. The
 * same flight in six-DOF is tests/heavy/starship-flight5.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { siteById } from '../src/data/sites';
import { flight5Config, flyHome } from './ship-descent-harness';
import { planMission, SUBORBITAL_CUTOFF_ALTITUDE } from '../src/physics/mission';
import { ellipseVelocityAt } from '../src/physics/guidance';
import { allocateSurfaces, shipFlapSurfaces, surfaceAuthority, surfaceFlow, surfaceNeutralMoment, surfaceWrench } from '../src/physics/rigid/surfaces';
import { shipDescentAeroTable } from '../src/physics/rigid/aero-tables';
import {
  bellyFirstAttitude, descentAeroForce, descentAngleOfAttack, ENTRY_ANGLE_OF_ATTACK, BELLYFLOP_ANGLE_OF_ATTACK, SHIP_LANDING_PROPELLANT,
} from '../src/physics/sim/ship-descent';
import { add, cross, dot, norm, normalize, scale, sub, v3 } from '../src/physics/vec3';
import { DEG, MU_EARTH, R_EARTH } from '../src/physics/constants';

describe('a suborbital target', () => {
  it('is planned as a cut-off climbing at 150 km, with no burns after it', () => {
    const cfg = flight5Config('pointMass');
    const plan = planMission(cfg, siteById('starbase'), vehicleById('starship'));
    expect(plan.target.suborbital).toBe(true);
    expect(plan.burns).toEqual([]);
    expect(plan.insertionAltitude).toBe(SUBORBITAL_CUTOFF_ALTITUDE);
    expect(plan.insertionApoapsis).toBe(213e3);
    // The ellipse the guidance aims at climbs at 120-odd m/s at 150 km.
    const at = ellipseVelocityAt(R_EARTH + 150e3, plan.suborbitalAim!);
    expect(at.radial).toBeGreaterThan(100);
    expect(at.radial).toBeLessThan(150);
    const speed2 = at.horizontal ** 2 + at.radial ** 2;
    expect(Math.sqrt(speed2)).toBeCloseTo(Math.sqrt(MU_EARTH * (2 / (R_EARTH + 150e3) - 1 / plan.target.a)), 6);
  });

  it('leaves an orbit plan exactly as it was', () => {
    const cfg = { ...flight5Config('pointMass'), orbit: orbitById('leo') };
    const plan = planMission(cfg, siteById('starbase'), vehicleById('starship'));
    expect(plan.target.suborbital).toBeUndefined();
    expect(plan.suborbitalAim).toBeUndefined();
    expect(plan.burns.length).toBeGreaterThan(0);
  });
});

describe("Starship's flaps", () => {
  const flaps = shipFlapSurfaces('ship', 52, 9);
  const cg = v3(24, 0, 0);
  const q = 5e3;

  it('push only in a stream that meets them, by the square of it', () => {
    const bellyFirst = surfaceFlow(flaps, v3(0, 0, 80));
    for (const f of bellyFirst) expect(f).toBeCloseTo(Math.sin(65 * DEG) ** 2, 12);
    // Nose first (after the flip) they are edge on; from the back they are in the lee.
    for (const f of surfaceFlow(flaps, v3(-80, 0, 0))) expect(f).toBe(0);
    for (const f of surfaceFlow(flaps, v3(0, 0, -80))) expect(f).toBe(0);
  });

  it('never pull: folded they make nothing, fully out their whole drag', () => {
    const flow = surfaceFlow(flaps, v3(0, 0, 80));
    const folded = surfaceWrench(flaps, flaps.map((f) => -f.maxDeflectionRad), q, flow, cg).forceBody;
    expect(norm(folded)).toBeLessThan(1e-6);
    const out = surfaceWrench(flaps, flaps.map((f) => f.maxDeflectionRad), q, flow, cg).forceBody;
    // 2 × 18 m² + 2 × 32 m² of plate at a drag coefficient of 1.2, against the fall.
    expect(-out.z).toBeCloseTo(q * flow[0] * 1.2 * 100 * Math.sin(65 * DEG), 6);
  });

  it('pitch, roll and yaw the ship independently about their trim', () => {
    const flow = surfaceFlow(flaps, v3(0, 0, 80));
    const neutral = surfaceNeutralMoment(flaps, q, flow, cg);
    for (const wanted of [v3(3e5, 0, 0), v3(0, 5e5, 0), v3(0, 0, 2e5), v3(-1e5, -4e5, 1e5)]) {
      const target = add(neutral, wanted);
      const deflections = allocateSurfaces(flaps, target, q, flow, cg);
      const got = surfaceWrench(flaps, deflections, q, flow, cg).momentBody;
      expect(norm(sub(got, target))).toBeLessThan(1e-3 * norm(target));
    }
    const authority = surfaceAuthority(flaps, q, cg, flow);
    expect(authority.x).toBeGreaterThan(0);
    expect(authority.y).toBeGreaterThan(authority.z);
  });
});

describe('flying belly first', () => {
  it('holds the nose at the angle of attack above the flight path, belly to it', () => {
    const up = v3(0, 0, 1), heading = v3(1, 0, 0);
    for (const gamma of [-1 * DEG, -30 * DEG, -89.9 * DEG]) {
      const vDir = normalize(add(scale(heading, Math.cos(gamma)), scale(up, Math.sin(gamma))));
      const { nose, belly } = bellyFirstAttitude(vDir, up, heading, 70 * DEG);
      expect(Math.acos(dot(nose, vDir)) / DEG).toBeCloseTo(70, 6);
      expect(dot(nose, belly)).toBeCloseTo(0, 12);
      expect(dot(belly, vDir)).toBeCloseTo(Math.sin(70 * DEG), 9);
      // The nose above the path, in the vertical plane of the flight.
      expect(dot(cross(vDir, nose), cross(heading, up))).toBeGreaterThan(0);
    }
  });

  it('eases from the hypersonic angle to the belly flop as it slows', () => {
    expect(descentAngleOfAttack(25)).toBe(ENTRY_ANGLE_OF_ATTACK);
    expect(descentAngleOfAttack(0.3)).toBe(BELLYFLOP_ANGLE_OF_ATTACK);
    expect(descentAngleOfAttack(2)).toBeGreaterThan(ENTRY_ANGLE_OF_ATTACK);
    expect(descentAngleOfAttack(2)).toBeLessThan(BELLYFLOP_ANGLE_OF_ATTACK);
  });

  it('gets lift from its tilted belly, about a third of the drag at 70°', () => {
    const S = Math.PI * 4.5 ** 2;
    const table = shipDescentAeroTable(52, 9, S);
    const vAir = v3(7000, 0, 0);
    const { nose } = bellyFirstAttitude(v3(1, 0, 0), v3(0, 0, 1), v3(1, 0, 0), 70 * DEG);
    const force = descentAeroForce(table, S, nose, vAir, 1e-4, 300);
    const drag = -force.x, lift = force.z;
    expect(drag).toBeGreaterThan(0);
    expect(lift / drag).toBeGreaterThan(0.25);
    expect(lift / drag).toBeLessThan(0.45);
    // Broadside the table's centre of pressure sits a little behind the middle.
    expect(table.planformX).toBeGreaterThan(22);
    expect(table.planformX).toBeLessThan(26);
  });
});

describe('Flight 5, point-mass', () => {
  it('catches the booster, cuts off on target, and splashes the ship down in the Indian Ocean', { timeout: 120_000 }, () => {
    const sim = flyHome(new Simulation(flight5Config('pointMass'), { headless: true }));
    const at = (key: string) => sim.events.find((e) => e.key === key);
    expect(at('evt.boosterCaught')).toBeDefined();
    const cutoff = at('evt.suborbitalTarget');
    expect(cutoff, sim.events.map((e) => e.key).join(', ')).toBeDefined();
    // Flight 5 cut off at about T+8:30 and splashed down at T+1:05:40.
    expect(cutoff!.t).toBeGreaterThan(420);
    expect(cutoff!.t).toBeLessThan(540);
    const vent = at('evt.shipVent')!;
    expect(vent.params!.kept).toBe(SHIP_LANDING_PROPELLANT / 1000);
    expect(at('evt.shipEntry')).toBeDefined();
    expect(at('evt.shipFlip')).toBeDefined();
    const down = at('evt.shipSplashdown');
    expect(down, sim.events.map((e) => `${e.key} ${JSON.stringify(e.params)}`).join('\n')).toBeDefined();
    expect(down!.t).toBeGreaterThan(55 * 60);
    expect(down!.t).toBeLessThan(70 * 60);
    expect(down!.params!.speed as number).toBeLessThan(3);
    // Off Western Australia: the eastern Indian Ocean.
    expect(down!.params!.lat as number).toBeGreaterThan(-35);
    expect(down!.params!.lat as number).toBeLessThan(-5);
    expect(down!.params!.lon as number).toBeGreaterThan(75);
    expect(down!.params!.lon as number).toBeLessThan(115);
    expect(sim.state.status).toBe('landed');
    expect(sim.state.note).toBe('splashdown');
    expect(sim.done).toBe(true);
    // The events come in the order they were flown.
    const order = ['evt.seco', 'evt.suborbitalTarget', 'evt.shipVent', 'evt.shipEntry', 'evt.shipFlip', 'evt.shipSplashdown'];
    const times = order.map((key) => at(key)!.t);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('sits on the water turning with the Earth once it is down', { timeout: 120_000 }, () => {
    const sim = flyHome(new Simulation(flight5Config('pointMass'), { headless: true }));
    const before = { lat: sim.state.lat, lon: sim.state.lon, t: sim.state.t };
    for (let i = 0; i < 60; i++) sim.step(sim.suggestedDt());
    expect(sim.state.t).toBeGreaterThan(before.t + 30);
    expect(sim.state.lat).toBeCloseTo(before.lat, 6);
    expect(sim.state.lon).toBeCloseTo(before.lon, 6);
    expect(sim.state.status).toBe('landed');
  });
});
