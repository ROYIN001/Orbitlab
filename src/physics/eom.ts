/**
 * The equations of motion as the simulation has just solved them (roadmap
 * E02), for the live equations panel: the terms of Newton's second law at the
 * start of a flight step, the step's mean acceleration, and what the panel
 * substitutes into the other equations — each value taken at the step's start
 * or at its end, never mixed, so a replayed frame reads as consistently as a
 * live one. A record only: nothing in the physics reads it, and it is not part
 * of the telemetry.
 */
import type { Losses } from './sim/types';
import type { Quat } from './rigid/math';
import type { Vec3 } from './vec3';
import type { StageState } from './vehicle';
import { engineExitArea, nozzleFlow } from './nozzle';
import type { EngineSpec } from '../types';

/** How the step was integrated. */
export type EomIntegrator = 'rigid' | 'pointMass' | 'coast' | 'heldCoast';

export interface EomRecord {
  /** Step start, s, and length, s. */
  t: number;
  dt: number;
  integrator: EomIntegrator;
  // --- at the step start
  mass: number;
  r: Vec3;
  v: Vec3;
  density: number;
  soundSpeed: number;
  pressure: number;
  airspeed: number;
  /** Velocity relative to the air (wind included in six-DOF), ECI, m/s. */
  airVelocity: Vec3;
  dynamicPressure: number;
  mach: number;
  /**
   * Thrust delivered, N; the running engines' vacuum thrust at their levels,
   * N, and their exit area, m², whatever the level (the air presses on the
   * whole exit at any throttle: the thrust law, src/physics/nozzle.ts).
   */
  thrust: number;
  vacuumThrust: number;
  exitArea: number;
  /** a running engine's flow separates inside its nozzle, so the thrust is above vacuumThrust − p·exitArea */
  separated?: boolean;
  /** Aerodynamic reference area, m², and the drag coefficient of the point-mass model (absent in six-DOF). */
  referenceArea: number;
  dragCoefficient?: number;
  /** Specific forces at the step start, ECI, m/s²: engines (and attitude thrusters), air, gravity. */
  thrustAccel: Vec3;
  aeroAccel: Vec3;
  gravityAccel: Vec3;
  /** The step's mean acceleration, (v_end − v_start)/dt, ECI, m/s². */
  measuredAccel: Vec3;
  // --- at the step end
  speedEnd: number;
  losses: Losses;
  /** Six-DOF: body rates, rad/s, and attitude at the step's start and end. */
  omega0?: Vec3;
  omega1?: Vec3;
  q0?: Quat;
  q1?: Quat;
}

export { engineExitArea } from './nozzle';

/**
 * Σ n·level·T_vac and Σ n·A_e over the active stage's core and boosters at the
 * levels `VehicleModel.thrust` returned (an engine counts with its whole exit
 * area once it runs at all), and whether any of them runs with the flow
 * separated in its nozzle at ambient pressure `pressure`.
 */
export function runningEngines(stage: StageState | null | undefined, coreLevel: number, boosterLevels: readonly number[],
  hot?: { stage: StageState; level: number }, pressure = 0): { vacuumThrust: number; exitArea: number; separated: boolean } {
  if (!stage) return { vacuumThrust: 0, exitArea: 0, separated: false };
  let vacuumThrust = 0, exitArea = 0, separated = false;
  const add = (e: EngineSpec, n: number, level: number): void => {
    if (!(level > 0) || !(n > 0)) return;
    vacuumThrust += n * e.thrustVac * level;
    exitArea += n * engineExitArea(e);
    if (pressure > 0 && nozzleFlow(e, pressure, level).separated) separated = true;
  };
  // the engines the core really runs, as `VehicleModel.enginesRunning` counts them (a partial light-up, `litEngines`)
  add(stage.spec.engine, (stage.litEngines ? stage.litEngines.length : stage.spec.engine.count) * stage.engineFraction, coreLevel);
  stage.boosters.forEach((b, group) => add(b.spec.engine, b.spec.engine.count * b.spec.count, boosterLevels[group] ?? 0));
  // a hot stage lit above it, firing through the truss (`VehicleModel.hotStage`)
  if (hot) add(hot.stage.spec.engine, (hot.stage.litEngines ? hot.stage.litEngines.length : hot.stage.spec.engine.count) * hot.stage.engineFraction, hot.level);
  return { vacuumThrust, exitArea, separated };
}

const copy = (v: Vec3): Vec3 => ({ x: v.x, y: v.y, z: v.z });

export function cloneEom(e: EomRecord | undefined): EomRecord | undefined {
  if (!e) return undefined;
  return { ...e, r: copy(e.r), v: copy(e.v), airVelocity: copy(e.airVelocity), thrustAccel: copy(e.thrustAccel), aeroAccel: copy(e.aeroAccel),
    gravityAccel: copy(e.gravityAccel), measuredAccel: copy(e.measuredAccel), losses: { ...e.losses },
    ...(e.omega0 ? { omega0: copy(e.omega0) } : {}), ...(e.omega1 ? { omega1: copy(e.omega1) } : {}),
    ...(e.q0 ? { q0: { ...e.q0 } } : {}), ...(e.q1 ? { q1: { ...e.q1 } } : {}) };
}
