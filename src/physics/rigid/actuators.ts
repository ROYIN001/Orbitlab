/** Finite actuators. All positions and wrenches are body-frame SI quantities. */
import { add, cross, dot, norm, rotateAxis, scale, sub, v3, type Vec3 } from '../vec3';
import { G0 } from '../constants';

export interface Wrench { forceBody: Vec3; momentBody: Vec3 }
export interface EngineActuatorSpec {
  id: string;
  positionBody: Vec3;
  directionBody: Vec3;
  /** Available thrust at this pressure. Do not reapply upstream engine-out or throttle factors. */
  maxThrust: number;
  minThrottle?: number;
  /** Zero, one or two orthogonal hinge axes, perpendicular to the nominal thrust. */
  gimbalAxesBody: readonly Vec3[];
  maxGimbalRad: number;
  maxGimbalRateRadS: number;
  timeConstantS: number;
}
export interface EngineActuatorState { deflections: number[]; throttle: number }
export interface EngineCommand extends EngineActuatorState { enabled?: boolean }
export interface EngineWrench extends Wrench {
  engines: { id: string; forceBody: Vec3; momentBody: Vec3; directionBody: Vec3; thrust: number; deflections: number[] }[];
}
export interface EngineAllocation {
  commands: EngineCommand[];
  wrench: EngineWrench;
  residualMomentBody: Vec3;
  saturated: boolean;
}
export interface RcsThrusterSpec {
  id: string; positionBody: Vec3; directionBody: Vec3;
  maxThrust: number; isp: number;
}
export interface RcsAllocation { duties: number[]; wrench: Wrench; residualMomentBody: Vec3; saturated: boolean }

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const zeroWrench = (): Wrench => ({ forceBody: v3(), momentBody: v3() });
const finiteVector = (v: Vec3): boolean => [v.x, v.y, v.z].every(Number.isFinite);
const unit = (v: Vec3): Vec3 => {
  const length = norm(v);
  if (!finiteVector(v) || !(length > 0)) throw new RangeError('Actuator direction must be finite and nonzero');
  return scale(v, 1 / length);
};
const nonnegative = (...values: number[]): void => {
  if (values.some(value => !Number.isFinite(value) || value < 0)) throw new RangeError('Actuator parameters must be finite and nonnegative');
};
function validateEngine(spec: EngineActuatorSpec): void {
  nonnegative(spec.maxThrust, spec.maxGimbalRad, spec.maxGimbalRateRadS, spec.timeConstantS, spec.minThrottle ?? 0);
  if (!finiteVector(spec.positionBody) || (spec.minThrottle ?? 0) > 1 || spec.maxGimbalRad >= Math.PI / 2 || spec.gimbalAxesBody.length > 2) {
    throw new RangeError('Invalid engine geometry or actuator limits');
  }
  const direction = unit(spec.directionBody);
  const axes = spec.gimbalAxesBody.map(unit);
  if (axes.some(axis => Math.abs(dot(axis, direction)) > 1e-8)
    || (axes.length === 2 && Math.abs(dot(axes[0], axes[1])) > 1e-8)) {
    throw new RangeError('Gimbal axes must be perpendicular to thrust and to each other');
  }
}
function limitedDeflections(values: readonly number[], count: number, limit: number): number[] {
  if (values.length !== count || values.some(value => !Number.isFinite(value))) throw new RangeError('Invalid gimbal command dimension');
  const length = Math.hypot(...values);
  return values.map(value => value * (length > limit && length > 0 ? limit / length : 1));
}
function commandedThrottle(value: number, spec: EngineActuatorSpec): number {
  if (!Number.isFinite(value)) throw new RangeError('Throttle must be finite');
  return value <= 0 ? 0 : clamp(value, spec.minThrottle ?? 0, 1);
}

export function createEngineStates(specs: readonly EngineActuatorSpec[]): EngineActuatorState[] {
  return specs.map(spec => {
    validateEngine(spec);
    return { deflections: spec.gimbalAxesBody.map(() => 0), throttle: 0 };
  });
}

/** Gimbal lag and vector rate limit are applied before the force is evaluated. */
export function stepEngineActuators(
  specs: readonly EngineActuatorSpec[], states: readonly EngineActuatorState[],
  commands: readonly EngineCommand[], dt: number,
): EngineActuatorState[] {
  nonnegative(dt);
  if (states.length !== specs.length || commands.length !== specs.length) throw new RangeError('Engine state/command count mismatch');
  return specs.map((spec, index) => {
    validateEngine(spec);
    const current = limitedDeflections(states[index].deflections, spec.gimbalAxesBody.length, spec.maxGimbalRad);
    const command = commands[index];
    const target = limitedDeflections(command.deflections, spec.gimbalAxesBody.length, spec.maxGimbalRad);
    const change = target.map((value, axis) => value - current[axis]);
    const length = Math.hypot(...change);
    const rate = spec.maxGimbalRateRadS, lag = spec.timeConstantS;
    let travel = 0;
    if (rate > 0 && length > 0) {
      // Exact held-target solution of vector rate-limited first-order lag.
      // After leaving the slew-limited regime, continue the exponential from
      // that transition, instead of applying the final angle for the whole dt.
      const switchTime = lag > 0 ? Math.max(0, (length - rate * lag) / rate) : length / rate;
      travel = dt <= switchTime ? rate * dt : lag > 0
        ? length - Math.min(length, rate * lag) * Math.exp(-(dt - switchTime) / lag) : length;
    }
    const factor = length > 0 ? travel / length : 0;
    return {
      deflections: current.map((value, axis) => value + change[axis] * factor),
      // Throttle magnitude comes from the upstream engine model; no invented
      // valve response. A disabled engine has zero force immediately.
      throttle: command.enabled === false ? 0 : commandedThrottle(command.throttle, spec),
    };
  });
}

export function engineWrench(
  specs: readonly EngineActuatorSpec[], states: readonly EngineActuatorState[], cgBody: Vec3,
): EngineWrench {
  if (!finiteVector(cgBody) || states.length !== specs.length) throw new RangeError('Invalid engine mass geometry');
  const wrench: EngineWrench = { ...zeroWrench(), engines: [] };
  for (let index = 0; index < specs.length; index++) {
    const spec = specs[index];
    validateEngine(spec);
    const state = states[index];
    const angles = limitedDeflections(state.deflections, spec.gimbalAxesBody.length, spec.maxGimbalRad);
    let directionBody = unit(spec.directionBody);
    for (let axis = 0; axis < angles.length; axis++) directionBody = rotateAxis(directionBody, unit(spec.gimbalAxesBody[axis]), angles[axis]);
    const thrust = spec.maxThrust * commandedThrottle(state.throttle, spec);
    const forceBody = scale(directionBody, thrust);
    const momentBody = cross(sub(spec.positionBody, cgBody), forceBody);
    wrench.forceBody = add(wrench.forceBody, forceBody);
    wrench.momentBody = add(wrench.momentBody, momentBody);
    wrench.engines.push({ id: spec.id, forceBody, momentBody, directionBody, thrust, deflections: angles });
  }
  return wrench;
}

/**
 * Convex bounded least squares by accelerated projected gradient descent.
 * Variables are normalized actuator fractions. Column norms set a conservative
 * Lipschitz step; projection preserves box limits and circular TVC travel.
 */
function allocate(
  columns: readonly (readonly number[])[], target: readonly number[], lo: number,
  groups: readonly (readonly number[])[] = [],
): number[] {
  const x = columns.map(() => 0);
  if (lo < 0 && columns.length > 0) {
    // Interior TVC solution: x=Aᵀ(AAᵀ)^-1 b. At most three torque rows,
    // independent of engine count. Discard zero-authority rows, detect other
    // rank loss, and use the bounded solver whenever this point is infeasible.
    const rows = target.map((_, row) => row).filter(row => columns.some(column => Math.abs(column[row]) > 1e-14));
    const gram = rows.map(row => [...rows.map(other => columns.reduce((sum, column) => sum + column[row] * column[other], 0)), target[row]]);
    const pivotFloor = Math.max(1e-30, ...gram.map((row, index) => Math.abs(row[index]))) * 1e-12;
    let fullRank = true;
    for (let col = 0; col < rows.length; col++) {
      let pivot = col;
      for (let row = col + 1; row < rows.length; row++) if (Math.abs(gram[row][col]) > Math.abs(gram[pivot][col])) pivot = row;
      if (Math.abs(gram[pivot][col]) <= pivotFloor) { fullRank = false; break; }
      [gram[col], gram[pivot]] = [gram[pivot], gram[col]];
      const divisor = gram[col][col];
      for (let entry = col; entry <= rows.length; entry++) gram[col][entry] /= divisor;
      for (let row = 0; row < rows.length; row++) {
        if (row === col) continue;
        const factor = gram[row][col];
        for (let entry = col; entry <= rows.length; entry++) gram[row][entry] -= factor * gram[col][entry];
      }
    }
    if (fullRank) {
      const candidate = columns.map(column => rows.reduce((sum, row, index) => sum + column[row] * gram[index][rows.length], 0));
      if (candidate.every(value => Number.isFinite(value) && value >= lo - 1e-12 && value <= 1 + 1e-12)
        && groups.every(group => Math.hypot(...group.map(axis => candidate[axis])) <= 1 + 1e-12)) {
        return candidate.map(value => clamp(value, lo, 1));
      }
    }
  }
  let extrapolated = [...x];
  let acceleration = 1;
  const lipschitz = columns.reduce((sum, column) => sum + column.reduce((s, value) => s + value * value, 0), 0);
  if (!(lipschitz > 0)) return x;
  const step = 1 / lipschitz;
  for (let iteration = 0; iteration < 256; iteration++) {
    const residual = [...target];
    columns.forEach((column, axis) => column.forEach((value, row) => { residual[row] -= value * extrapolated[axis]; }));
    const next = columns.map((column, axis) => extrapolated[axis] + step * column.reduce((sum, value, row) => sum + value * residual[row], 0));
    for (const group of groups) {
      const length = Math.hypot(...group.map(axis => next[axis]));
      if (length > 1) for (const axis of group) next[axis] /= length;
    }
    // The TVC disk lies inside [-1,1]^2. Project onto it before the box;
    // clipping first would incorrectly rotate an asymmetric saturated demand.
    next.forEach((value, axis) => { next[axis] = clamp(value, lo, 1); });
    const change = Math.max(0, ...next.map((value, axis) => Math.abs(value - x[axis])));
    const nextAcceleration = (1 + Math.sqrt(1 + 4 * acceleration * acceleration)) / 2;
    extrapolated = next.map((value, axis) => value + (acceleration - 1) / nextAcceleration * (value - x[axis]));
    next.forEach((value, axis) => { x[axis] = value; });
    acceleration = nextAcceleration;
    if (change < 1e-11) break;
  }
  return x;
}

/**
 * Small-angle TVC allocation; returned wrench is evaluated with the actual
 * nonlinear rotations. No virtual roll torque is supplied to an underactuated
 * engine layout. Rate/lag are enforced separately by stepEngineActuators.
 */
export function allocateEngineGimbals(
  specs: readonly EngineActuatorSpec[], throttles: readonly number[], desiredMomentBody: Vec3, cgBody: Vec3,
): EngineAllocation {
  if (throttles.length !== specs.length || !finiteVector(desiredMomentBody)) throw new RangeError('Invalid thrust allocation input');
  const commands = createEngineStates(specs).map((state, index) => ({ ...state, throttle: commandedThrottle(throttles[index], specs[index]) }));
  const baseline = engineWrench(specs, commands, cgBody);
  const target = sub(desiredMomentBody, baseline.momentBody);
  const columns: number[][] = [];
  const groups: number[][] = [];
  for (let index = 0; index < specs.length; index++) {
    const spec = specs[index];
    const group: number[] = [];
    for (const axis of spec.gimbalAxesBody) {
      const dForce = scale(cross(unit(axis), unit(spec.directionBody)), spec.maxThrust * commands[index].throttle * spec.maxGimbalRad);
      const torque = cross(sub(spec.positionBody, cgBody), dForce);
      group.push(columns.length);
      columns.push([torque.x, torque.y, torque.z]);
    }
    groups.push(group);
  }
  // Scale each torque row by its available authority. Long axial moment arms
  // must not numerically drown out the weaker, but feasible, roll axis. The
  // reported residual is still the unscaled physical moment in N m.
  const authority = [0, 1, 2].map(row => Math.hypot(...columns.map(column => column[row])) || 1);
  const normalizedColumns = columns.map(column => column.map((value, row) => value / authority[row]));
  const fractions = allocate(normalizedColumns, [target.x, target.y, target.z].map((value, row) => value / authority[row]), -1, groups);
  let axisIndex = 0;
  for (let index = 0; index < commands.length; index++) {
    commands[index].deflections = specs[index].gimbalAxesBody.map(() => fractions[axisIndex++] * specs[index].maxGimbalRad);
  }
  const wrench = engineWrench(specs, commands, cgBody);
  const residualMomentBody = sub(desiredMomentBody, wrench.momentBody);
  const saturated = norm(residualMomentBody) > Math.max(1e-6, 0.005 * norm(desiredMomentBody))
    || commands.some((command, index) => specs[index].maxGimbalRad > 0 && Math.hypot(...command.deflections) >= specs[index].maxGimbalRad * (1 - 1e-7));
  return { commands, wrench, residualMomentBody, saturated };
}

function rcsWrench(specs: readonly RcsThrusterSpec[], duties: readonly number[], cgBody: Vec3): Wrench {
  if (specs.length !== duties.length || !finiteVector(cgBody)) throw new RangeError('Invalid RCS allocation geometry');
  const wrench = zeroWrench();
  specs.forEach((spec, index) => {
    nonnegative(spec.maxThrust, spec.isp);
    if (!(spec.isp > 0) || !finiteVector(spec.positionBody) || !Number.isFinite(duties[index])) throw new RangeError('Invalid RCS specification');
    const force = scale(unit(spec.directionBody), spec.maxThrust * clamp(duties[index], 0, 1));
    wrench.forceBody = add(wrench.forceBody, force);
    wrench.momentBody = add(wrench.momentBody, cross(sub(spec.positionBody, cgBody), force));
  });
  return wrench;
}

/** Allocate physical positive-thrust jets to torque and zero requested net force. */
export function allocateRcs(
  specs: readonly RcsThrusterSpec[], desiredMomentBody: Vec3, cgBody: Vec3, characteristicLength = 1,
): RcsAllocation {
  if (!finiteVector(desiredMomentBody) || !Number.isFinite(characteristicLength) || characteristicLength <= 0) throw new RangeError('Invalid RCS target');
  const columns = specs.map(spec => {
    const wrench = rcsWrench([spec], [1], cgBody);
    const m = scale(wrench.momentBody, 1 / characteristicLength);
    return [wrench.forceBody.x, wrench.forceBody.y, wrench.forceBody.z, m.x, m.y, m.z];
  });
  const target = scale(desiredMomentBody, 1 / characteristicLength);
  const duties = allocate(columns, [0, 0, 0, target.x, target.y, target.z], 0);
  const wrench = rcsWrench(specs, duties, cgBody);
  const residualMomentBody = sub(desiredMomentBody, wrench.momentBody);
  return {
    duties, wrench, residualMomentBody,
    saturated: norm(residualMomentBody) > Math.max(1e-7, 0.005 * norm(desiredMomentBody)) || duties.some(duty => duty > 1 - 1e-7),
  };
}

/** Fuel-limited average wrench over dt; no propellant means no torque or force. */
export function stepRcs(
  specs: readonly RcsThrusterSpec[], duties: readonly number[], propellantKg: number, dt: number, cgBody: Vec3,
): { wrench: Wrench; propellantKg: number; consumedKg: number; activeFraction: number; duties: number[] } {
  nonnegative(propellantKg, dt);
  // Validate before any budget arithmetic; invalid Isp cannot quietly create fuel.
  rcsWrench(specs, duties, cgBody);
  const requested = specs.reduce((sum, spec, index) => sum + spec.maxThrust * clamp(duties[index], 0, 1) / (spec.isp * G0) * dt, 0);
  const activeFraction = propellantKg <= 0 ? 0 : requested > propellantKg ? propellantKg / requested : 1;
  const actual = duties.map(duty => clamp(duty, 0, 1) * activeFraction);
  const consumedKg = Math.min(propellantKg, requested);
  return { wrench: rcsWrench(specs, actual, cgBody), propellantKg: Math.max(0, propellantKg - consumedKg), consumedKg, activeFraction, duties: actual };
}
