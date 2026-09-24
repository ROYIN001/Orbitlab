/**
 * The live equations panel's numbers (roadmap E02), DOM-free: every equation
 * the panel shows, with the values of the displayed instant substituted, and —
 * where the simulation gives an independent left-hand side — a balance check.
 *
 * The numbers come from the frame's equation record (src/physics/eom.ts), all
 * at one step's start or end, so a replayed frame balances as a live one does.
 * SI units throughout; the panel scales them for display.
 */
import { G0, J2_EARTH, MU_EARTH, OMEGA_EARTH, R_EARTH } from '../physics/constants';
import { atmosphere } from '../physics/atmosphere';
import type { EomRecord } from '../physics/eom';
import type { VisualFrame } from '../physics/frame';
import { gravity, gravityJ2 } from '../physics/gravity';
import { matVecMul, quatInverseRotate, quatMultiply, quatNormalize, type Mat3, type Quat } from '../physics/rigid/math';
import { add, cross, dot, norm, scale, sub } from '../physics/vec3';
import type { StageState } from '../physics/vehicle';
import { LOOP_AXES, loopView, triple, type LoopAxis } from './loop-view';
import { aeroAngles, type Notation } from './notation';

export type EquationLevel = 'explore' | 'engineer';
export type EquationId = 'newton' | 'dynamicPressure' | 'drag' | 'rocket' | 'budget'
  | 'pressureThrust' | 'visViva' | 'gravity' | 'aeroAngles' | 'euler' | 'quaternion' | 'control';
/** The Explore mode's set, then what the Engineer mode adds (the owner's split, 2026-09-24). */
export const EXPLORE_EQUATIONS: readonly EquationId[] = ['newton', 'dynamicPressure', 'drag', 'rocket', 'budget'];
export const ENGINEER_EQUATIONS: readonly EquationId[] = [...EXPLORE_EQUATIONS, 'pressureThrust', 'visViva', 'gravity', 'aeroAngles', 'euler', 'quaternion', 'control'];
export const equationsFor = (level: EquationLevel): readonly EquationId[] => (level === 'engineer' ? ENGINEER_EQUATIONS : EXPLORE_EQUATIONS);

/** Left against right: the residual in the equation's unit and relative to the larger side. */
export interface Check { left: number; right: number; residual: number; relative: number; ok: boolean }
export interface AxisRow { axis: LoopAxis; left: number; right: number }
export interface Equation {
  id: EquationId;
  /** false: nothing for this equation to act on at this instant; `reason` names why (a dictionary key). */
  available: boolean;
  reason?: string;
  /** The values substituted, SI, by name. */
  values: Record<string, number>;
  /** Per-axis rows, in the notation's axes (Euler's equation, the control law). */
  rows?: AxisRow[];
  check?: Check;
  /** A dictionary key for a remark on this instant (a limiter, a model difference). */
  note?: string;
}

/** What the panel needs besides the frame: the launch site and the active stage, from the frame-backed view. */
export interface EquationContext {
  siteLatitudeDeg: number;
  siteAltitudeM: number;
  activeStage: StageState | null;
  usablePropellant: (stage: StageState) => number;
}

function check(left: number, right: number, tolerance: number, floor = 1e-9): Check {
  const residual = Math.abs(left - right), scaleOf = Math.max(Math.abs(left), Math.abs(right), floor);
  return { left, right, residual, relative: residual / scaleOf, ok: residual / scaleOf <= tolerance || residual <= floor };
}
const none = (id: EquationId, reason: string): Equation => ({ id, available: false, reason, values: {} });
const integrated = (e: EomRecord | undefined): e is EomRecord => !!e && (e.integrator === 'rigid' || e.integrator === 'pointMass');

/** Newton's second law along the flight: m·a = F + F_A + m·g, against the step's measured mean acceleration. */
function newton(e: EomRecord | undefined): Equation {
  if (!e) return none('newton', 'eq.none.noStep');
  const sum = add(add(e.thrustAccel, e.aeroAccel), e.gravityAccel), m = e.mass;
  const values = { m, thrust: norm(e.thrustAccel) * m, aero: norm(e.aeroAccel) * m, weight: norm(e.gravityAccel) * m,
    accel: norm(sum), measured: norm(e.measuredAccel), loadFactor: norm(add(e.thrustAccel, e.aeroAccel)) / G0,
    residual: norm(sub(e.measuredAccel, sum)) };
  if (!integrated(e)) return { id: 'newton', available: true, values, note: 'eq.note.coastStep' };
  // Vector residual, relative to the measured acceleration: the step's mean against its start.
  const c = check(values.measured, values.accel, 0.01);
  return { id: 'newton', available: true, values, check: { ...c, residual: values.residual, relative: values.residual / Math.max(values.measured, 1e-9),
    ok: values.residual / Math.max(values.measured, 1e-9) <= 0.01 } };
}

function dynamicPressure(e: EomRecord | undefined, frame: VisualFrame): Equation {
  const rho = e ? e.density : atmosphere(Math.max(0, frame.altitude)).rho, a = e ? e.soundSpeed : atmosphere(Math.max(0, frame.altitude)).a;
  const V = e ? e.airspeed : frame.airspeed;
  if (!(rho > 0)) return none('dynamicPressure', 'eq.none.noAir');
  return { id: 'dynamicPressure', available: true, values: { rho, V, q: 0.5 * rho * V * V, a, mach: a > 0 ? V / a : 0 } };
}

/** Drag along the airflow and lift across it; in six-DOF the axial and normal coefficients of the vehicle's tables. */
function drag(e: EomRecord | undefined): Equation {
  if (!integrated(e) || !(e.dynamicPressure > 0) || !(e.airspeed > 1)) return none('drag', 'eq.none.noAir');
  const force = scale(e.aeroAccel, e.mass), air = scale(e.airVelocity, 1 / e.airspeed);
  const D = -dot(force, air), L = norm(sub(force, scale(air, -D))), qS = e.dynamicPressure * e.referenceArea;
  const values: Record<string, number> = { q: e.dynamicPressure, S: e.referenceArea, D, L, cd: D / qS, cl: L / qS };
  if (e.integrator === 'pointMass') {
    values.cdModel = e.dragCoefficient ?? 0;
    return { id: 'drag', available: true, values, check: check(D, values.cdModel * qS, 1e-6, 1) };
  }
  // Six-DOF: the same force in body axes, split into the tables' axial and normal parts.
  if (e.q0) {
    const body = quatInverseRotate(e.q0, force);
    values.ca = -body.x / qS; values.cn = Math.hypot(body.y, body.z) / qS;
  }
  return { id: 'drag', available: true, values, note: 'eq.note.sixDofAero' };
}

/** The rocket equation for the active stage, and the Δv the app shows for all that remain. */
function rocket(e: EomRecord | undefined, frame: VisualFrame, ctx: EquationContext): Equation {
  const stage = ctx.activeStage;
  if (!stage || stage.spec.isSpacecraft || frame.payloadSeparated) return none('rocket', 'eq.none.noStage');
  const isp = stage.spec.engine.ispVac, m0 = e?.mass ?? frame.mass, mp = Math.max(0, ctx.usablePropellant(stage)), mf = m0 - mp;
  if (!(mf > 0) || !(m0 > 0)) return none('rocket', 'eq.none.noStage');
  return { id: 'rocket', available: true, values: { isp, ve: isp * G0, m0, mp, mf, dv: isp * G0 * Math.log(m0 / mf), dvAll: frame.dvRemaining },
    ...(stage.boosters.some((b) => b.attached) ? { note: 'eq.note.boosters' } : {}) };
}

/** The ascent's Δv book: ideal less gravity, drag and steering equals the gain in inertial speed. */
function budget(e: EomRecord | undefined, frame: VisualFrame, ctx: EquationContext): Equation {
  if (!frame.liftoff) return none('budget', 'eq.none.prelaunch');
  const losses = e?.losses ?? frame.losses, speed = e?.speedEnd ?? frame.speed;
  const v0 = OMEGA_EARTH * (R_EARTH + ctx.siteAltitudeM) * Math.cos(ctx.siteLatitudeDeg * Math.PI / 180);
  const net = losses.dvThrust - losses.gravity - losses.drag - losses.steering;
  const values = { ideal: losses.dvThrust, gravity: losses.gravity, drag: losses.drag, steering: losses.steering, net, v0, speed, gain: speed - v0 };
  if (frame.status !== 'ascent' || !e) return { id: 'budget', available: true, values, note: 'eq.note.budgetFrozen' };
  const c = check(values.gain, net, 0.01, 5);
  return { id: 'budget', available: true, values, check: c };
}

function pressureThrust(e: EomRecord | undefined): Equation {
  if (!e || !(e.vacuumThrust > 0)) return none('pressureThrust', 'eq.none.enginesOff');
  const model = e.vacuumThrust - e.pressure * e.exitArea;
  return { id: 'pressureThrust', available: true, values: { vac: e.vacuumThrust, p: e.pressure, Ae: e.exitArea, loss: e.pressure * e.exitArea, thrust: model },
    check: check(e.thrust, model, 1e-9, 1), ...(e.exitArea === 0 ? { note: 'eq.note.vacuumOnly' } : {}) };
}

/** Vis-viva: the semi-major axis from r and v, and the apsides, against the orbit the app shows. */
function visViva(frame: VisualFrame): Equation {
  const r = norm(frame.r), v = norm(frame.v), inv = 2 / r - (v * v) / MU_EARTH;
  if (!(inv > 0)) return { id: 'visViva', available: true, values: { r, v, a: Infinity, mu: MU_EARTH }, note: 'eq.note.escape' };
  const a = 1 / inv, h = norm(cross(frame.r, frame.v)), ecc = Math.sqrt(Math.max(0, 1 - (h * h) / (MU_EARTH * a)));
  const apo = a * (1 + ecc) - R_EARTH, peri = a * (1 - ecc) - R_EARTH;
  return { id: 'visViva', available: true, values: { r, v, mu: MU_EARTH, a, h, e: ecc, apo, peri },
    check: check(apo, frame.elements.apoapsisAlt, 1e-4, 50), ...(peri < 0 ? { note: 'eq.note.suborbital' } : {}) };
}

/** Gravity with Earth's oblateness (J2), against the gravity the step used. */
function gravityEquation(e: EomRecord | undefined, frame: VisualFrame): Equation {
  const r = e?.r ?? frame.r, rm = norm(r), central = norm(gravity(r)), full = gravityJ2(r), j2 = norm(sub(full, gravity(r)));
  const values = { r: rm, mu: MU_EARTH, central, j2, total: norm(full), latitude: Math.asin(r.z / rm), J2: J2_EARTH };
  if (!e) return { id: 'gravity', available: true, values };
  // Six-DOF and the long coasts fly J2; the point-mass ascent flies a central field.
  const used = norm(e.gravityAccel), model = e.integrator === 'pointMass' || e.integrator === 'kepler' ? central : norm(full);
  return { id: 'gravity', available: true, values: { ...values, used }, check: check(used, model, 1e-9, 1e-9),
    ...(e.integrator === 'pointMass' || e.integrator === 'kepler' ? { note: 'eq.note.centralGravity' } : {}) };
}

/** α and β from the velocity relative to the air in the standard's body axes. */
function aeroAngleEquation(frame: VisualFrame, n: Notation): Equation {
  const rigid = frame.rigid, V = frame.airspeed;
  if (!rigid || !(V > 1) || !(frame.q > 0)) return none('aeroAngles', rigid ? 'eq.none.noAir' : 'eq.none.sixDof');
  const { alpha, beta } = aeroAngles(rigid.angleOfAttack, rigid.sideslip);
  const along = V * Math.cos(alpha) * Math.cos(beta), across = V * Math.sin(beta), normal = V * Math.sin(alpha) * Math.cos(beta);
  // ISO (u, v, w): v to the right, w to the belly; ГОСТ (V_x, V_y, V_z): V_y to the top, V_z to the right.
  return { id: 'aeroAngles', available: true, values: n === 'iso' ? { V, u: along, v: across, w: normal, alpha, beta }
    : { V, vx: along, vy: -normal, vz: across, alpha, beta } };
}

/** Euler's equation, I·ω̇ + ω × Iω = M, with ω̇ measured over the step and M the actuators' and the air's. */
function euler(e: EomRecord | undefined, frame: VisualFrame, n: Notation): Equation {
  const rigid = frame.rigid, loop = rigid?.attitudeLoop;
  if (!rigid) return none('euler', 'eq.none.sixDof');
  if (!e?.omega0 || !e.omega1 || !loop || !(e.dt > 0)) return none('euler', 'eq.none.noStep');
  const I = rigid.inertiaBody as Mat3, omegaDot = scale(sub(e.omega1, e.omega0), 1 / e.dt), w = scale(add(e.omega0, e.omega1), 0.5);
  const left = add(matVecMul(I, omegaDot), cross(w, matVecMul(I, w)));
  const right = add(add(loop.engineMomentBody, loop.rcsMomentBody), loop.aeroMomentBody);
  const l = triple(left, n), r = triple(right, n);
  const rows = LOOP_AXES.map((axis) => ({ axis, left: l[axis], right: r[axis] }));
  // Judged against the moments themselves: the engines and the air each carry hundreds of kN·m
  // through max-q and nearly cancel, so their small net is no scale for the residual.
  const residual = norm(sub(left, right));
  const size = Math.max(norm(left), norm(right), norm(loop.engineMomentBody) + norm(loop.rcsMomentBody) + norm(loop.aeroMomentBody), 1);
  return { id: 'euler', available: true, values: { residual, size, Ixx: I[0], Iyy: I[4], Izz: I[8] }, rows,
    check: { left: norm(left), right: norm(right), residual, relative: residual / size, ok: residual / size <= 0.01 },
    ...(rigid.flex ? { note: 'eq.note.flexCoupling' } : {}) };
}

/** Quaternion kinematics, q̇ = ½ q ⊗ ω, against the step's change of attitude. */
function quaternion(e: EomRecord | undefined, frame: VisualFrame): Equation {
  if (!frame.rigid) return none('quaternion', 'eq.none.sixDof');
  if (!e?.q0 || !e.q1 || !e.omega0 || !e.omega1 || !(e.dt > 0)) return none('quaternion', 'eq.none.noStep');
  const q1 = dotQ(e.q0, e.q1) < 0 ? negQ(e.q1) : e.q1;
  const measured = scaleQ(subQ(q1, e.q0), 1 / e.dt), mid = quatNormalize(scaleQ(addQ(e.q0, q1), 0.5));
  const w = scale(add(e.omega0, e.omega1), 0.5), model = scaleQ(quatMultiply(mid, { w: 0, ...w }), 0.5);
  const residual = normQ(subQ(measured, model)), size = Math.max(normQ(measured), normQ(model), 1e-6);
  return { id: 'quaternion', available: true, values: { measured: normQ(measured), model: normQ(model), residual, norm: normQ(e.q1) - 1,
    qw: e.q1.w, qx: e.q1.x, qy: e.q1.y, qz: e.q1.z, omega: norm(w) },
    check: { left: normQ(measured), right: normQ(model), residual, relative: residual / size, ok: residual / size <= 0.01 || residual < 1e-7 } };
}
const addQ = (a: Quat, b: Quat): Quat => ({ w: a.w + b.w, x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const subQ = (a: Quat, b: Quat): Quat => ({ w: a.w - b.w, x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scaleQ = (a: Quat, k: number): Quat => ({ w: a.w * k, x: a.x * k, y: a.y * k, z: a.z * k });
const negQ = (a: Quat): Quat => scaleQ(a, -1);
const dotQ = (a: Quat, b: Quat): number => a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;
const normQ = (a: Quat): number => Math.sqrt(dotQ(a, a));

/** The attitude loop's two gains on the pitch axis: ω_d = K_θ·e, ε = K_ω·(ω_d − ω̂) (G03 shows every axis). */
function control(frame: VisualFrame, n: Notation): Equation {
  const view = loopView(frame.rigid, n);
  if (!frame.rigid) return none('control', 'eq.none.sixDof');
  if (!view) return none('control', 'eq.none.noLoop');
  const axis: LoopAxis = 'pitch', limited = view.limits.stopping[axis] || view.limits.rate[axis], accelLimited = view.limits.acceleration[axis];
  const values = { e: view.errorDeg?.[axis] ?? NaN, kTheta: view.gains.attitude[axis], wd: view.commandDegS[axis], w: view.sensedDegS[axis],
    kOmega: view.gains.rate[axis], eps: view.accelerationDegS2[axis] };
  const rows: AxisRow[] = LOOP_AXES.map((a) => ({ axis: a, left: view.commandDegS[a], right: view.gains.attitude[a] * (view.errorDeg?.[a] ?? NaN) }));
  if (view.mode === 'manual') return { id: 'control', available: true, values, rows, note: 'eq.note.manual' };
  return { id: 'control', available: true, values, rows,
    ...(limited ? { note: 'eq.note.rateLimited' } : accelLimited ? { note: 'eq.note.accelerationLimited' }
      : { check: check(values.wd, values.kTheta * values.e, 1e-6, 1e-9) }) };
}

/** Every equation of a level at this instant. */
export function equations(frame: VisualFrame, ctx: EquationContext, level: EquationLevel, n: Notation): Equation[] {
  const e = frame.eom;
  return equationsFor(level).map((id) => {
    switch (id) {
      case 'newton': return newton(e);
      case 'dynamicPressure': return dynamicPressure(e, frame);
      case 'drag': return drag(e);
      case 'rocket': return rocket(e, frame, ctx);
      case 'budget': return budget(e, frame, ctx);
      case 'pressureThrust': return pressureThrust(e);
      case 'visViva': return visViva(frame);
      case 'gravity': return gravityEquation(e, frame);
      case 'aeroAngles': return aeroAngleEquation(frame, n);
      case 'euler': return euler(e, frame, n);
      case 'quaternion': return quaternion(e, frame);
      case 'control': return control(frame, n);
    }
  });
}

