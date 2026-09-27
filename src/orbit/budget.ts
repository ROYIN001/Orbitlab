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

/**
 * What is wrong with a spacecraft, or null when it can be budgeted (audit
 * 2026-09-27 A2): a mass above zero, propellant from none to less than that
 * mass — the tanks are part of the spacecraft, so something is always left
 * when they are dry — and an engine with an Isp and a thrust. The first
 * problem found, in the order of the fields.
 */
export type CraftProblem = 'mass' | 'propellant' | 'propellantOverMass' | 'isp' | 'thrust';

export function craftProblem(c: Craft): CraftProblem | null {
  if (!(Number.isFinite(c.mass) && c.mass > 0)) return 'mass';
  if (!(Number.isFinite(c.propellant) && c.propellant >= 0)) return 'propellant';
  if (!(c.propellant < c.mass)) return 'propellantOverMass';
  if (!(Number.isFinite(c.isp) && c.isp > 0)) return 'isp';
  if (!(Number.isFinite(c.thrust) && c.thrust > 0)) return 'thrust';
  return null;
}

/** The ranges of the own spacecraft's fields (O03), SI. */
export const CRAFT_LIMITS = {
  mass: { min: 10, max: 20_000 },
  propellant: { min: 0, max: 15_000 },
  isp: { min: 50, max: 5000 },
  thrust: { min: 0.01, max: 5000 },
} as const;

/**
 * The most propellant a spacecraft of `mass` may be set to carry (audit
 * 2026-09-27 A2): the field's range, and 1 kg below the mass, so that the
 * slider's far end is still a spacecraft.
 */
export const maxPropellant = (mass: number): number =>
  Math.max(CRAFT_LIMITS.propellant.min, Math.min(CRAFT_LIMITS.propellant.max, mass - 1));

function check(c: Craft): void {
  const p = craftProblem(c);
  if (p) throw new RangeError(`not a spacecraft to budget (${p}): ${JSON.stringify(c)}`);
}

/**
 * What a spacecraft's tanks hold as Δv: Isp·g₀·ln(m / (m − propellant)), m/s.
 * Always finite: a craft craftProblem() rejects is thrown out (audit
 * 2026-09-27 A2 — more propellant than mass once made this Infinity).
 */
export function deltaVAvailable(c: Craft): number {
  check(c);
  return exhaustSpeed(c.isp) * Math.log(c.mass / (c.mass - c.propellant));
}

/**
 * The budget of `plan` for `craft`. A spiral (Edelbaum) is one long burn of
 * the plan's whole Δv; impulsive plans are their burns in turn. The craft
 * must pass craftProblem() (it throws otherwise, audit 2026-09-27 A2).
 */
export function budgetFor(plan: Pick<Plan, 'burns' | 'spiral' | 'totalDv'>, craft: Craft): Budget {
  check(craft);
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

/**
 * Why a plan's final orbit may not be carried on from ("Carry on from the
 * new orbit"), or null when it may (audit 2026-09-27 A3):
 * - 'notYet': nothing to carry on from yet — no burn, and the plan still
 *   running (a spiral under way);
 * - 'craft': the chosen spacecraft cannot be one (craftProblem, A2);
 * - 'fuel': its tanks run dry before the plan is flown, so the orbit at the
 *   end is the ideal plan's, not one this spacecraft gets to.
 * With no spacecraft chosen (Δv only) the ideal plan is what was asked for,
 * and it may be carried on from, as before.
 */
export type AdoptBlock = 'notYet' | 'craft' | 'fuel';

export function adoptBlock(plan: Pick<Plan, 'burns' | 'spiral' | 'totalDv' | 'arrival'>, now: number, craft: Craft | null): AdoptBlock | null {
  if (plan.arrival > now && plan.burns.length === 0) return 'notYet';
  if (!craft) return null;
  if (craftProblem(craft)) return 'craft';
  return budgetFor(plan, craft).enough ? null : 'fuel';
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
