/**
 * The test stand (roadmap D04): an engine, or a cluster of them, fired on the
 * ground or in a vacuum cell from ignition to the end of its tail-off.
 *
 * It is the flight's own engine model, not a second one. The stand is a
 * one-stage vehicle with no fairing and no payload, driven through
 * `VehicleModel` exactly as tests/engine-transients.test.ts's `burnOut`
 * drives it: `igniteStage`, then `thrust` and `consume` at the same `t` and
 * `dt` every step, then `cutoffStage` for a commanded shutdown. So a firing
 * carries everything a flight carries — the start-up rise and the tail-off
 * (P02), the minimum-throttle clamp, a solid motor's regressive profile, the
 * depletion sensor that shuts a stage down with its tail-off propellant still
 * aboard — and every newton-second comes out of the tanks at the Isp the
 * flight delivers at that pressure.
 *
 * Two firings the model would run and the stand refuses:
 *
 * - **A vacuum-only engine at any pressure above zero.** Such an engine has no
 *   sea-level operating point, so `engineThrustSL` returns its vacuum thrust
 *   and the model would report full vacuum thrust at sea level
 *   (src/physics/vehicle.ts, `engineThrustSL`); its `thrustSL`/`ispSL` fields
 *   are placeholders, not data (src/data/vehicles.ts, "VACUUM-ONLY ENGINES").
 *   It is fired in a vacuum cell (pressure 0) or not at all.
 * - **A commanded shutdown of a solid motor.** A solid cannot be shut down,
 *   but `VehicleModel.cutoffStage` does not check `solid`, so the stand does.
 *
 * What the stand does not know: start-up and tail-off are the fleet's
 * constants (1.0 s / 0.3 s rise, 0.25 s / 1.0 s decay constant) unless the
 * engine sets `startupS`/`tailoffS`, not per-engine published transients; and
 * a delivered sea-level Isp is back-solved from `thrustSL` and the vacuum
 * mass flow, so it can differ from the `ispSL` a data file quotes (by up to
 * 6.9 % in the catalogue, tests/physics-core.test.ts). Mixture ratio and
 * propellant family are not part of the engine model at all.
 *
 * DOM-free, SI units (N, kg, kg/s, s, Pa).
 */
import type { EngineSpec, VehicleSpec } from '../types';
import { G0 } from '../physics/constants';
import { VehicleModel } from '../physics/vehicle';

export interface StaticFireOptions {
  /** engines on the stand, fired together */
  count: number;
  /** propellant loaded, kg */
  propellantKg: number;
  /** ambient pressure, Pa: 0 is a vacuum cell, P0 standard sea level, `atmosphere(h).p` a pad at altitude h */
  pressurePa: number;
  /**
   * Commanded throttle, (0, 1]. The model raises a command below the engine's
   * `minThrottle` to that minimum (an engine without one cannot throttle at
   * all), and a solid always burns at 1 — as in flight.
   */
  throttle: number;
  /** commanded shutdown, s after ignition (liquid engines only); absent, the engine burns to depletion */
  cutoffS?: number;
  /** step, s; the samples are step means, exact integrals of thrust and flow over the step */
  dt: number;
}

export interface StaticFireSample {
  /** start of the step, s after ignition */
  t: number;
  /** length of the step, s (shorter than `dt` only for the step that ends at `cutoffS`) */
  dt: number;
  /** mean thrust over the step, N */
  thrust: number;
  /** mean mass flow over the step, kg/s */
  mdot: number;
  /** delivered specific impulse, thrust / (G0 · mdot), s */
  isp: number;
}

export type StaticFireRefusal = 'vacuumOnlyAtPressure' | 'solidShutdown';

export interface StaticFireResult {
  samples: StaticFireSample[];
  /** total impulse, N·s: Σ thrust · dt */
  impulse: number;
  /** propellant burned, kg */
  propellantUsed: number;
  /**
   * Ignition to shutdown, s: the commanded cut-off, or the moment the depletion
   * sensor shut the engine down with its tail-off propellant aboard. The
   * tail-off after it is not counted (see `duration`).
   */
  burnTime: number;
  /** ignition to the end of the tail-off, s: the last step with thrust */
  duration: number;
  /** largest step-mean thrust, N (a solid's head-end peak, less the grain burned during its start-up) */
  peakThrust: number;
  /** the firing the stand would not run, and why; everything else is then empty */
  refused?: StaticFireRefusal;
}

/** A firing longer than this many steps is a mistake in the inputs, not a test (a day at 1 s is 86 400). */
const MAX_STEPS = 2_000_000;

function refusal(refused: StaticFireRefusal): StaticFireResult {
  return { samples: [], impulse: 0, propellantUsed: 0, burnTime: 0, duration: 0, peakThrust: 0, refused };
}

/**
 * Fire `count` of `engine` with `propellantKg` aboard at ambient `pressurePa`,
 * from ignition at t = 0 until the tail-off is over.
 *
 * Throws a `RangeError` for inputs no stand could run (no engines, no
 * propellant, a throttle outside (0, 1], a step that is not positive); returns
 * a result with `refused` for a firing the model would run and must not (see
 * the module comment).
 */
export function staticFire(engine: EngineSpec, o: StaticFireOptions): StaticFireResult {
  if (!Number.isInteger(o.count) || o.count < 1) throw new RangeError(`count must be a whole number of engines, at least 1 (got ${o.count})`);
  if (!(o.propellantKg > 0) || !Number.isFinite(o.propellantKg)) throw new RangeError(`propellantKg must be more than 0 (got ${o.propellantKg})`);
  if (!(o.pressurePa >= 0) || !Number.isFinite(o.pressurePa)) throw new RangeError(`pressurePa must be 0 or more (got ${o.pressurePa})`);
  if (!(o.throttle > 0 && o.throttle <= 1)) throw new RangeError(`throttle must be in (0, 1] (got ${o.throttle})`);
  if (!(o.dt > 0) || !Number.isFinite(o.dt)) throw new RangeError(`dt must be more than 0 (got ${o.dt})`);
  if (o.cutoffS !== undefined && !(o.cutoffS > 0)) throw new RangeError(`cutoffS must be more than 0 (got ${o.cutoffS})`);
  if (engine.vacuumOnly && o.pressurePa > 0) return refusal('vacuumOnlyAtPressure');
  if (engine.solid && o.cutoffS !== undefined) return refusal('solidShutdown');

  // The stand: one stage and nothing else. `VehicleModel` reads the stage's
  // masses, engine and strap-ons (none), and the vehicle's fairing (none) and
  // recovery fields (absent: no propellant held back). Dry mass only enters
  // `totalMass`, which a firing never asks for.
  const stand = {
    id: 'stand', name: engine.name, fairing: null,
    stages: [{ id: 'stand', name: engine.name, dryMass: 0, propellantMass: o.propellantKg, engine: { ...engine, count: o.count }, diameter: 1, length: 1 }],
  } as unknown as VehicleSpec;
  const vm = new VehicleModel(stand, 0);
  const st = vm.active!;
  const samples: StaticFireSample[] = [];
  let impulse = 0;
  let peakThrust = 0;
  let t = 0;
  vm.igniteStage(st, 0);
  for (let step = 0; ; step++) {
    if (step >= MAX_STEPS) throw new RangeError(`the firing did not end within ${MAX_STEPS} steps of ${o.dt} s`);
    // The step that reaches the commanded cut-off ends on it, so the shutdown
    // is at `cutoffS` exactly whatever the step length.
    let h = o.dt;
    let next = t + h;
    if (o.cutoffS !== undefined && !st.cutoff) {
      if (t >= o.cutoffS) vm.cutoffStage(st, t);
      else if (next >= o.cutoffS) { h = o.cutoffS - t; next = o.cutoffS; }
    }
    const cmd = st.cutoff || st.burnedOut ? 0 : o.throttle;
    const thr = vm.thrust(t, o.pressurePa, cmd, h);
    if (!thr.burning) break;
    vm.consume(t, cmd, h);
    samples.push({ t, dt: h, thrust: thr.thrust, mdot: thr.mdot, isp: thr.thrust / (G0 * thr.mdot) });
    impulse += thr.thrust * h;
    peakThrust = Math.max(peakThrust, thr.thrust);
    t = next;
  }
  return {
    samples, impulse, peakThrust,
    propellantUsed: o.propellantKg - st.propellant,
    burnTime: st.cutoff || st.burnedOut ? st.cutoffTime : t,
    duration: t,
  };
}
