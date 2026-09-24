import { describe, expect, it } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { G0 } from '../src/physics/constants';
import {
  VehicleModel, engineStartupS, engineTailoffS, startupFactor, tailoffFactor,
  LIQUID_STARTUP_S, SOLID_STARTUP_S, LIQUID_TAILOFF_S, SOLID_TAILOFF_S, TAILOFF_SPAN,
} from '../src/physics/vehicle';

/**
 * Engine start-up and shutdown transients (roadmap P02). What matters is not
 * the exact shape of the rise and the decay but that they are *transients of
 * the same engine*: every newton-second comes out of the tanks at the engine's
 * own Isp, whatever the step length, and a stage that runs dry ends with its
 * tanks empty rather than with its tail-off propellant stranded.
 */

/** Burn the active stage from ignition to the end of its tail-off in vacuum. */
function burnOut(vm: VehicleModel, dt: number, throttle = 1): { impulse: number; used: number; t: number } {
  const st = vm.active!;
  const before = st.propellant;
  vm.igniteStage(st, 0);
  let t = 0;
  let impulse = 0;
  for (let guard = 0; guard < 1e6; guard++) {
    const thr = vm.thrust(t, 0, st.burnedOut ? 0 : throttle, dt);
    if (!thr.burning) break;
    vm.consume(t, st.burnedOut ? 0 : throttle, dt);
    impulse += thr.thrust * dt;
    t += dt;
  }
  return { impulse, used: before - st.propellant, t };
}

describe('engine start-up and tail-off', () => {
  it('rises to full thrust in the start-up time and decays with the tail-off constant', () => {
    const merlin = vehicleById('falcon9').stages[0].engine;
    expect(engineStartupS(merlin)).toBe(LIQUID_STARTUP_S);
    expect(engineTailoffS(merlin)).toBe(LIQUID_TAILOFF_S);
    expect(startupFactor(merlin, 0)).toBe(0);
    expect(startupFactor(merlin, LIQUID_STARTUP_S / 2)).toBeCloseTo(0.5, 12);
    expect(startupFactor(merlin, LIQUID_STARTUP_S)).toBe(1);
    expect(tailoffFactor(merlin, 0)).toBe(1);
    expect(tailoffFactor(merlin, LIQUID_TAILOFF_S)).toBeCloseTo(Math.exp(-1), 12);
    expect(tailoffFactor(merlin, TAILOFF_SPAN * LIQUID_TAILOFF_S)).toBe(0);
    const srb = vehicleById('h3').stages[0].boosters![0].engine;
    expect(srb.solid).toBe(true);
    expect(engineStartupS(srb)).toBe(SOLID_STARTUP_S);
    expect(engineTailoffS(srb)).toBe(SOLID_TAILOFF_S);
  });

  it('averages a step exactly: one long step and many short ones carry the same impulse', () => {
    const e = vehicleById('falcon9').stages[1].engine;
    for (const [since, span] of [[0, 1], [0.2, 0.3], [0.9, 0.5], [3, 1]] as const) {
      let fine = 0;
      const n = 1000;
      for (let i = 0; i < n; i++) fine += startupFactor(e, since + (i + 0.5) * span / n) * span / n;
      expect(startupFactor(e, since, span) * span).toBeCloseTo(fine, 6);
      let fineTail = 0;
      for (let i = 0; i < n; i++) fineTail += tailoffFactor(e, since + (i + 0.5) * span / n) * span / n;
      expect(tailoffFactor(e, since, span) * span).toBeCloseTo(fineTail, 6);
    }
  });

  it('burns every kilogram at the engine Isp, through the start-up, the burn and the tail-off', () => {
    for (const dt of [0.01, 0.1, 0.5]) {
      const vm = new VehicleModel(vehicleById('falcon9'), 0);
      const e = vm.active!.spec.engine;
      const { impulse, used } = burnOut(vm, dt);
      // the tanks are dry: the tail-off burned the propellant the depletion
      // sensor shut the engine down with
      expect(vm.usablePropellant(vm.active!), `dt ${dt}`).toBeLessThan(1e-6 * vm.active!.spec.propellantMass);
      expect(impulse / used, `dt ${dt}`).toBeCloseTo(G0 * e.ispVac, 6);
    }
  });

  it('delivers after a commanded cut-off exactly the tail-off it announced', () => {
    const vm = new VehicleModel(vehicleById('falcon9'), 5000);
    const st = vm.active!;
    vm.igniteStage(st, 0);
    const dt = 0.1;
    let t = 0;
    for (; t < 20 - 1e-9; t += dt) {
      vm.thrust(t, 0, 1, dt);
      vm.consume(t, 1, dt);
    }
    const mass = vm.totalMass();
    const announced = vm.tailoffDeltaV(t, 0, mass) * mass;
    vm.cutoffStage(st, t);
    let impulse = 0;
    for (let i = 0; i < 1000; i++, t += dt) {
      const thr = vm.thrust(t, 0, 0, dt);
      if (!thr.burning) break;
      vm.consume(t, 0, dt);
      impulse += thr.thrust * dt;
    }
    expect(announced).toBeGreaterThan(0);
    expect(impulse / announced).toBeCloseTo(1, 9);
    // and it is over after the tail-off span
    expect(vm.inTransient(t)).toBe(false);
  });

  it('takes four Soyuz strap-ons off the stack over a second, not in one step', () => {
    // 3.3 MN disappearing inside one 10 ms step was what the six-DOF attitude
    // loop answered with a nose dip at T+01:59.
    const vm = new VehicleModel(vehicleById('soyuz21a'), 7000);
    const st = vm.active!;
    vm.igniteStage(st, -2.5);
    for (const b of st.boosters) vm.igniteBooster(b, -2.5);
    const dt = 0.01;
    let last = vm.thrust(-2.5, 0, 1, dt).thrust;
    let biggestDrop = 0;
    let burnout = NaN;
    for (let t = -2.5; t < 200; t += dt) {
      const thr = vm.thrust(t, 0, 1, dt);
      if (t > 1) biggestDrop = Math.max(biggestDrop, last - thr.thrust);
      last = thr.thrust;
      const res = vm.consume(t, 1, dt);
      if (res.boosterBurnout.length && Number.isNaN(burnout)) burnout = t;
    }
    expect(burnout).toBeGreaterThan(100);
    const strapOns = st.boosters.reduce((sum, b) => sum + b.spec.engine.count * b.spec.count * b.spec.engine.thrustVac, 0);
    expect(strapOns).toBeGreaterThan(3e6);
    // the largest single-step loss is a few per cent of what the strap-ons make
    expect(biggestDrop / strapOns).toBeLessThan(0.05);
  });

  it('spins an engine up from nothing on the pad', () => {
    const vm = new VehicleModel(vehicleById('falcon9'), 0);
    const st = vm.active!;
    vm.igniteStage(st, -2.5);
    const full = st.spec.engine.count * st.spec.engine.thrustVac;
    expect(vm.thrust(-2.5, 0, 1).thrust).toBe(0);
    expect(vm.thrust(-2.0, 0, 1).thrust / full).toBeCloseTo(0.5, 9);
    expect(vm.inTransient(-2.0)).toBe(true);
    expect(vm.thrust(-1.5, 0, 1).thrust / full).toBeCloseTo(1, 12);
    expect(vm.inTransient(-1.5)).toBe(false);
  });
});
