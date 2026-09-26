/**
 * The propellant a plan costs (roadmap O03, docs/ROADMAP-PART2-3.md): the
 * spacecraft in orbit — one a flight handed on (S03) with what is left in
 * its tanks, or one described by hand — against the plan's burns, by the
 * rocket equation (Tsiolkovsky): each burn takes the spacecraft from m to
 * m·exp(−Δv/(Isp·g₀)), and lasts as long as its engine takes to burn the
 * difference. Where the tanks run dry the plan stops being flyable, and the
 * budget says how far short it is.
 *
 * DOM-free, SI units; tests/budget.test.ts holds it to the rocket equation.
 */
import { G0 } from '../physics/constants';
import { norm } from '../physics/vec3';
import type { Plan } from './maneuvers';
import type { OrbitHandoff } from './handoff';
import { SATELLITES } from '../data/satellites';

/** A spacecraft with an engine: its mass now (tanks and all), what is in the tanks, the engine's Isp and thrust. */
export interface Craft {
  mass: number;
  propellant: number;
  /** s */
  isp: number;
  /** N */
  thrust: number;
}

export interface BurnBudget {
  /** m/s */
  dv: number;
  /** kg burned, the mass before and after */
  propellant: number;
  massBefore: number;
  massAfter: number;
  /** how long the engine runs, s */
  duration: number;
  /** the tanks ran dry before this burn was done */
  short: boolean;
}

export interface Budget {
  craft: Craft;
  /** the Δv the tanks hold, m/s */
  available: number;
  burns: BurnBudget[];
  /** kg the plan burns, and what is left (never below zero) */
  used: number;
  left: number;
  enough: boolean;
  /** m/s the plan needs beyond what the tanks hold (0 when enough) */
  shortfall: number;
}

/** The exhaust speed Isp·g₀, m/s. */
export const exhaustSpeed = (isp: number): number => isp * G0;

/** What a spacecraft's tanks hold as Δv: Isp·g₀·ln(m / (m − propellant)), m/s. */
export function deltaVAvailable(c: Pick<Craft, 'mass' | 'propellant' | 'isp'>): number {
  const dry = c.mass - Math.max(0, Math.min(c.propellant, c.mass));
  return dry > 0 ? exhaustSpeed(c.isp) * Math.log(c.mass / dry) : Infinity;
}

/**
 * The budget of `plan` for `craft`. A spiral (Edelbaum) is one long burn of
 * the plan's whole Δv; impulsive plans are their burns in turn.
 */
export function budgetFor(plan: Pick<Plan, 'burns' | 'spiral' | 'totalDv'>, craft: Craft): Budget {
  const ve = exhaustSpeed(craft.isp), mdot = craft.thrust / ve;
  const dvs = plan.spiral ? [plan.totalDv] : plan.burns.map((b) => norm(b.dv));
  let mass = craft.mass, tank = craft.propellant, used = 0, dry = false;
  const burns: BurnBudget[] = dvs.map((dv) => {
    const after = mass * Math.exp(-dv / ve), need = mass - after;
    const short = dry || need > tank + 1e-9;
    const burned = short ? Math.max(0, tank) : need;
    const b: BurnBudget = { dv, propellant: burned, massBefore: mass, massAfter: mass - burned, duration: mdot > 0 ? burned / mdot : Infinity, short };
    mass -= burned; tank -= burned; used += burned;
    if (short) dry = true;
    return b;
  });
  const available = deltaVAvailable(craft), total = dvs.reduce((s, x) => s + x, 0);
  const enough = !dry;
  return { craft, available, burns, used, left: Math.max(0, craft.propellant - used), enough, shortfall: enough ? 0 : Math.max(0, total - available) };
}

/** The spacecraft after a plan flown: lighter by what it burned. */
export function craftAfter(b: Budget): Craft {
  return { ...b.craft, mass: b.craft.mass - b.used, propellant: b.left };
}

/** A handed-on spacecraft with an engine, as a craft; null when it has none. */
export function craftFromHandoff(h: Pick<OrbitHandoff, 'spacecraft'>): Craft | null {
  const p = h.spacecraft.propulsion;
  return p ? { mass: h.spacecraft.mass, propellant: p.propellantMass, isp: p.isp, thrust: p.thrust } : null;
}

/**
 * A spacecraft to start from when there is none from a flight: the
 * catalogue's weather satellite (src/data/satellites.ts) — 1 800 kg, 42 %
 * of it propellant, a 400 N engine of Isp 315 s — a typical geostationary
 * bus.
 */
export function defaultCraft(): Craft {
  const w = SATELLITES.find((s) => s.id === 'weather')!;
  const p = w.propulsion!;
  return { mass: w.mass, propellant: p.propellantFraction * w.mass, isp: p.isp, thrust: p.thrust };
}
