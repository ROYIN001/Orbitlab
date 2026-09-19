/** Educational terminal-restart timing estimates, not Falcon hardware data. */
export const TERMINAL_RESTART = { ignitionDelayS: 0.5, thrustRiseS: 0.3, contactSpeedMs: 3 } as const;

export interface MinimumBurnPrediction {
  massKg: number; propellantKg: number; downwardMs: number;
  minimumThrustN: number; minimumFlowKgS: number; gravityMs2: number;
  /** Axial drag force is k * vAir * abs(vAir), with k in kg/m. */
  dragKgM: number; windUpMs?: number;
  ignitionDelayS?: number; thrustRiseS?: number; contactSpeedMs?: number;
}

/** Predicted vertical distance to the terminal speed after one finite restart.
 * A small longitudinal midpoint calculation includes decreasing mass, axial
 * drag and start-up delay/rise. Guidance only: it never advances flight state.
 * Attitude/atmosphere are held over this short near-ground prediction, so a
 * disturbed or depleted stage may still fail the actual contact predicate. */
export function minimumBurnDistance(p: MinimumBurnPrediction): number {
  const delay = p.ignitionDelayS ?? TERMINAL_RESTART.ignitionDelayS;
  const rise = p.thrustRiseS ?? TERMINAL_RESTART.thrustRiseS;
  const target = p.contactSpeedMs ?? TERMINAL_RESTART.contactSpeedMs;
  const nonnegative = [p.massKg, p.propellantKg, p.minimumThrustN, p.minimumFlowKgS, p.gravityMs2,
    p.dragKgM, delay, rise, target];
  if (nonnegative.some(v => !Number.isFinite(v) || v < 0) || p.massKg <= p.propellantKg
    || !Number.isFinite(p.downwardMs) || !Number.isFinite(p.windUpMs ?? 0)) throw new RangeError('Invalid terminal burn prediction');
  if (p.minimumThrustN <= 0 || p.propellantKg <= 0) return Infinity;
  let mass = p.massKg, fuel = p.propellantKg, down = p.downwardMs, distance = 0;
  const fraction = (t: number) => t < delay ? 0 : rise === 0 ? 1 : Math.min(1, (t - delay) / rise);
  const acceleration = (v: number, m: number, thrustFraction: number) => {
    const airDown = v + (p.windUpMs ?? 0);
    return p.gravityMs2 - (p.minimumThrustN * thrustFraction + p.dragKgM * airDown * Math.abs(airDown)) / m;
  };
  for (let t = 0; t < 120; t += 0.025) {
    const h = 0.025, f = fraction(t + h / 2), used = p.minimumFlowKgS * f * h;
    if (used > fuel) return Infinity;
    const a0 = acceleration(down, mass, fraction(t));
    const a = acceleration(down + a0 * h / 2, mass - used / 2, f);
    const next = down + a * h;
    if (t >= delay && down > target && next <= target && a < 0) {
      const duration = (target - down) / a;
      return Math.max(0, distance + down * duration + a * duration * duration / 2);
    }
    distance += down * h + a * h * h / 2;
    down = next; mass -= used; fuel -= used;
  }
  return Infinity;
}
