/**
 * The equations of motion as the simulation has just solved them (roadmap
 * E02), for the live equations panel: the terms of Newton's second law at the
 * start of a flight step, the step's mean acceleration, and what the panel
 * substitutes into the other equations — each value taken at the step's start
 * or at its end, never mixed, so a replayed frame reads as consistently as a
 * live one. A record only: nothing in the physics reads it, and it is not part
 * of the telemetry.
 */
import { P0 } from './constants';
import type { Losses } from './sim/types';
import type { Quat } from './rigid/math';
import type { Vec3 } from './vec3';
import { engineThrustSL, type StageState } from './vehicle';
import type { EngineSpec } from '../types';

/** How the step was integrated. */
export type EomIntegrator = 'rigid' | 'pointMass' | 'kepler' | 'heldCoast';

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
  /** Thrust delivered, N; the running engines' vacuum thrust, N, and exit area, m², each at its level. */
  thrust: number;
  vacuumThrust: number;
  exitArea: number;
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

/** Nozzle exit area of one engine, m², from its sea-level and vacuum thrust: T = T_vac − p·A_e. */
export function engineExitArea(e: EngineSpec): number {
  return (e.thrustVac - engineThrustSL(e)) / P0;
}

/** Σ n·level·T_vac and Σ n·level·A_e over the active stage's core and boosters, at the levels `VehicleModel.thrust` returned. */
export function runningEngines(stage: StageState | null | undefined, coreLevel: number, boosterLevels: readonly number[]): { vacuumThrust: number; exitArea: number } {
  if (!stage) return { vacuumThrust: 0, exitArea: 0 };
  const e = stage.spec.engine, n = e.count * stage.engineFraction;
  let vacuumThrust = n * e.thrustVac * coreLevel, exitArea = n * engineExitArea(e) * coreLevel;
  stage.boosters.forEach((b, group) => {
    const level = boosterLevels[group] ?? 0;
    if (!(level > 0)) return;
    const nb = b.spec.engine.count * b.spec.count;
    vacuumThrust += nb * b.spec.engine.thrustVac * level;
    exitArea += nb * engineExitArea(b.spec.engine) * level;
  });
  return { vacuumThrust, exitArea };
}

const copy = (v: Vec3): Vec3 => ({ x: v.x, y: v.y, z: v.z });

export function cloneEom(e: EomRecord | undefined): EomRecord | undefined {
  if (!e) return undefined;
  return { ...e, r: copy(e.r), v: copy(e.v), airVelocity: copy(e.airVelocity), thrustAccel: copy(e.thrustAccel), aeroAccel: copy(e.aeroAccel),
    gravityAccel: copy(e.gravityAccel), measuredAccel: copy(e.measuredAccel), losses: { ...e.losses },
    ...(e.omega0 ? { omega0: copy(e.omega0) } : {}), ...(e.omega1 ? { omega1: copy(e.omega1) } : {}),
    ...(e.q0 ? { q0: { ...e.q0 } } : {}), ...(e.q1 ? { q1: { ...e.q1 } } : {}) };
}
