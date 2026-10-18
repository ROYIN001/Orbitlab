/**
 * The thrust law: what one engine gives at an ambient pressure and a level
 * (owner decision of 2026-10-17, option (b): the attached-flow law plus flow
 * separation; vacuum engines lit in the air fly what their nozzle really
 * gives). Every thrust in the simulation comes from `engineThrustAt`.
 *
 * ATTACHED FLOW. The vacuum thrust is ṁ·v_e + p_e·A_e. At a level λ — a
 * throttle setting, a solid's thrust profile, the start-up and tail-off — the
 * mass flow and the chamber pressure scale with λ and the exit velocity does
 * not, so the exit pressure scales with it too and the vacuum thrust is
 * λ·F_vac. The air presses on the exit area whatever the level:
 *
 *     F = λ·F_vac − p_a·A_e
 *
 * At λ = 1 and p₀ it is the catalogue's sea-level thrust exactly, since
 * A_e = (F_vac − F_SL)/p₀ for an engine with a sea-level pair.
 *
 * SEPARATION. Deep throttle low in the air, or a vacuum nozzle lit in it, puts
 * the wall pressure far below ambient and the boundary layer separates inside
 * the bell. Where is from Schmucker's criterion (NASA TM-77396, 1984, eq. 11):
 * separation begins where the wall pressure falls to
 *
 *     p_i/p_a = (1.88·M_i − 1)^−0.64,      M_i ≤ 5 (no data above it)
 *
 * with M_i the wall Mach number there. The wall pressure is the one-
 * dimensional isentropic one for the engine's ε and γ (src/data/nozzles.ts),
 * scaled with λ. Downstream of the separation point the wall sees nearly the
 * ambient pressure (Schmucker §2: the pressure "increases only a little after
 * the sharp pressure increase, until it almost reaches the surrounding
 * pressure"; the plateau "is practically impossible to determine"), so the
 * nozzle flies as if cut off there:
 *
 *     F = λ·p_c·A_t·C_F,vac(ε_s) − p_a·A_t·ε_s
 *
 * which equals the attached law at ε_s = ε and lies above it once separated:
 * the difference is ∫(p_a − p_w) dA over the separated part. Floored at 0 (a
 * start-up in the first instant, before the chamber has pressure).
 *
 * QUALIFIED SEA-LEVEL OPERATION STAYS ATTACHED. The one-dimensional wall
 * pressure understates the pressure at the end of a real contoured bell (the
 * flow turning back towards the axis raises it): for the SSME, Schmucker's
 * wall-pressure distribution gives 0.0019·p_c at the exit, 2.4 times the
 * one-dimensional 0.00080·p_c for ε 69 at γ 1.26. With the one-dimensional
 * pressure the criterion would separate Vulcain 2.1, LE-7A, YF-77, LE-9 and
 * the R-7's chambers at full thrust on the pad, which they are qualified to
 * run with the flow attached
 * (the catalogue's sea-level thrust is that point). So an engine with a
 * sea-level pair gets the least factor on its wall pressure that keeps
 * (λ = 1, p₀) attached (`wallFactor`, 1 for most of the fleet, up to 2.5 for
 * Vulcain 2.1); a vacuum engine, with no sea-level point, gets 1. Checked by
 * tests/nozzle-law.test.ts over every catalogue engine.
 *
 * SIDE LOADS. A separated nozzle sees asymmetric side loads (Schmucker's
 * Part 2). No sourced criterion for when they break an engine is modelled: the
 * flight reports the separated flow (`evt.nozzleSeparation`) and flies the
 * thrust.
 *
 * DOM-free, SI units.
 */
import { P0 } from './constants';
import type { EngineSpec } from '../types';
import { NOZZLES, NOZZLE_GAMMA, type NozzleRecord } from '../data/nozzles';

/** Schmucker's criterion, p_i/p_a at the wall Mach number M (capped at 5, and at 1 below M ≈ 1.06). */
export function schmuckerRatio(mach: number): number {
  const m = Math.min(5, Math.max(1, mach));
  return Math.min(1, (1.88 * m - 1) ** -0.64);
}

/** Area ratio of isentropic flow at Mach M. */
export function areaRatioAt(mach: number, gamma: number): number {
  const k = (gamma + 1) / (2 * (gamma - 1));
  return (1 / mach) * ((2 / (gamma + 1)) * (1 + ((gamma - 1) / 2) * mach * mach)) ** k;
}

/** Supersonic Mach number at area ratio a ≥ 1. */
export function machAt(areaRatio: number, gamma: number): number {
  if (!(areaRatio > 1)) return 1;
  let lo = 1, hi = 2;
  while (areaRatioAt(hi, gamma) < areaRatio && hi < 100) hi *= 2;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (areaRatioAt(mid, gamma) < areaRatio) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Static over stagnation pressure at Mach M. */
export function pressureRatioAt(mach: number, gamma: number): number {
  return (1 + ((gamma - 1) / 2) * mach * mach) ** (-gamma / (gamma - 1));
}

/** Ideal vacuum thrust coefficient of a nozzle of area ratio a: F_vac/(p_c·A_t). */
export function vacuumThrustCoefficient(areaRatio: number, gamma: number): number {
  const pr = pressureRatioAt(machAt(areaRatio, gamma), gamma);
  const big = Math.sqrt(gamma) * (2 / (gamma + 1)) ** ((gamma + 1) / (2 * (gamma - 1)));
  return big * Math.sqrt((2 * gamma / (gamma - 1)) * (1 - pr ** ((gamma - 1) / gamma))) + Math.max(1, areaRatio) * pr;
}

/** Where a nozzle's numbers came from. */
export type NozzleBasis = 'data' | 'estimate';

/** One engine's nozzle as the law flies it, per `count` unit. */
export interface NozzleModel {
  /** exit area, m² (0: no pressure term at all — an engine whose two thrusts are equal) */
  exitArea: number;
  expansionRatio: number;
  gamma: number;
  /** chamber pressure at λ = 1 that closes F_vac with this geometry, Pa */
  chamberPressure: number;
  /** one-dimensional exit pressure at λ = 1, Pa, and the exit Mach number */
  exitPressure: number;
  exitMach: number;
  /** factor on the wall pressure in the separation test (see the module comment) */
  wallFactor: number;
  /** `data`: src/data/nozzles.ts holds the engine; `estimate`: `fallbackNozzle` */
  basis: NozzleBasis;
  /** tabulated over ln(area ratio) from the throat to the exit, for the separated thrust */
  lnA: Float64Array;
  /** ln(wallFactor·p_c·p̂/criterion): the ambient pressure over λ at which separation sits at that area */
  lnSep: Float64Array;
  /** C_F,vac of the nozzle cut off there */
  cf: Float64Array;
}

const TABLE_POINTS = 64;

/** ε that closes F_vac = p_c·(A_e/ε)·C_F,vac(ε), clamped to [1.5, 2000]. */
function areaRatioFor(thrustVac: number, chamberPressure: number, exitArea: number, gamma: number): number {
  const f = (eps: number) => chamberPressure * (exitArea / eps) * vacuumThrustCoefficient(eps, gamma);
  let lo = 1.5, hi = 2000;
  if (f(lo) <= thrustVac) return lo;
  if (f(hi) >= thrustVac) return hi;
  for (let i = 0; i < 80; i++) {
    const mid = Math.sqrt(lo * hi);
    if (f(mid) > thrustVac) lo = mid;
    else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

/**
 * The nozzle an engine the table does not hold is flown with (a custom engine
 * in a mission file): an estimate, γ 1.22, and
 * - with a sea-level pair: its own exit area and the ε that closes F_vac at a
 *   chamber pressure of 7 MPa;
 * - vacuum-only: ε 100 at 5 MPa, the exit area following from F_vac.
 */
export const FALLBACK_NOZZLE: Readonly<{ gamma: number; chamberPressureSL: number; vacuumExpansionRatio: number; vacuumChamberPressure: number }> = {
  gamma: 1.22, chamberPressureSL: 7e6, vacuumExpansionRatio: 100, vacuumChamberPressure: 5e6,
};

function build(e: EngineSpec, record: NozzleRecord | undefined): NozzleModel {
  const fv = e.thrustVac;
  const groundLit = !e.vacuumOnly;
  const gamma = record ? NOZZLE_GAMMA[record.family] : FALLBACK_NOZZLE.gamma;
  let exitArea: number;
  let eps: number;
  if (groundLit) {
    exitArea = Math.max(0, (fv - e.thrustSL) / P0);
    if (exitArea <= 0 || !(fv > 0)) return attachedOnly(gamma, record ? 'data' : 'estimate');
    if (record?.expansionRatio) eps = record.expansionRatio;
    else eps = areaRatioFor(fv, record?.chamberPressure ?? FALLBACK_NOZZLE.chamberPressureSL, exitArea, gamma);
  } else {
    if (!(fv > 0)) return attachedOnly(gamma, record ? 'data' : 'estimate');
    if (record?.exitDiameter) {
      exitArea = record.exitDiameter.nozzles * Math.PI * record.exitDiameter.value ** 2 / 4;
      eps = record.expansionRatio ?? areaRatioFor(fv, record.chamberPressure ?? FALLBACK_NOZZLE.vacuumChamberPressure, exitArea, gamma);
    } else {
      eps = record?.expansionRatio ?? FALLBACK_NOZZLE.vacuumExpansionRatio;
      const pc = record?.chamberPressure ?? FALLBACK_NOZZLE.vacuumChamberPressure;
      exitArea = eps * fv / (pc * vacuumThrustCoefficient(eps, gamma));
    }
  }
  eps = Math.max(1.5, eps);
  const throat = exitArea / eps;
  const chamberPressure = fv / (throat * vacuumThrustCoefficient(eps, gamma));
  const exitMach = machAt(eps, gamma);
  const exitPressure = chamberPressure * pressureRatioAt(exitMach, gamma);
  // the least factor that keeps the qualified sea-level point attached
  const wallFactor = groundLit ? Math.max(1, (schmuckerRatio(exitMach) * P0 / exitPressure) * (1 + 1e-9)) : 1;
  const lnA = new Float64Array(TABLE_POINTS), lnSep = new Float64Array(TABLE_POINTS), cf = new Float64Array(TABLE_POINTS);
  const top = Math.log(eps);
  for (let i = 0; i < TABLE_POINTS; i++) {
    const x = (top * i) / (TABLE_POINTS - 1);
    const a = Math.exp(x), m = machAt(a, gamma);
    lnA[i] = x;
    lnSep[i] = Math.log(wallFactor * chamberPressure * pressureRatioAt(m, gamma) / schmuckerRatio(m));
    cf[i] = vacuumThrustCoefficient(a, gamma);
  }
  // the exit point exactly, so the separated law meets the attached one there
  cf[TABLE_POINTS - 1] = fv / (chamberPressure * throat);
  return { exitArea, expansionRatio: eps, gamma, chamberPressure, exitPressure, exitMach, wallFactor,
    basis: record ? 'data' : 'estimate', lnA, lnSep, cf };
}

function attachedOnly(gamma: number, basis: NozzleBasis): NozzleModel {
  const empty = new Float64Array(0);
  return { exitArea: 0, expansionRatio: 1, gamma, chamberPressure: 0, exitPressure: 0, exitMach: 1, wallFactor: 1, basis, lnA: empty, lnSep: empty, cf: empty };
}

interface CacheEntry { fv: number; fsl: number; vac: boolean; name: string; model: NozzleModel }
const cache = new WeakMap<EngineSpec, CacheEntry>();

/** The nozzle of one engine (cached per spec object; recomputed if its thrusts change). */
export function nozzleModel(e: EngineSpec): NozzleModel {
  const hit = cache.get(e);
  const vac = e.vacuumOnly === true;
  if (hit && hit.fv === e.thrustVac && hit.fsl === e.thrustSL && hit.vac === vac && hit.name === e.name) return hit.model;
  const model = build(e, Object.prototype.hasOwnProperty.call(NOZZLES, e.name) ? NOZZLES[e.name] : undefined);
  cache.set(e, { fv: e.thrustVac, fsl: e.thrustSL, vac, name: e.name, model });
  return model;
}

/** Exit area of one engine, m². */
export function engineExitArea(e: EngineSpec): number {
  return nozzleModel(e).exitArea;
}

/** The flow in one engine's nozzle at ambient pressure p and level λ. */
export interface NozzleFlow {
  /** thrust of one engine, N */
  thrust: number;
  /** the flow separates inside the nozzle */
  separated: boolean;
  /** area ratio at the separation point (the nozzle's own ε when attached) */
  separationAreaRatio: number;
}

/** Separated thrust and where it separates; `null` while the flow is attached. */
function separated(m: NozzleModel, p: number, level: number): { thrust: number; areaRatio: number } | null {
  if (level * m.wallFactor * m.exitPressure >= schmuckerRatio(m.exitMach) * p) return null;
  const target = Math.log(p / level);
  const n = m.lnA.length;
  let x: number, cf: number;
  if (target >= m.lnSep[0]) {
    x = 0; cf = m.cf[0];
  } else {
    // lnSep falls monotonically from the throat to the exit
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (m.lnSep[mid] > target) lo = mid;
      else hi = mid;
    }
    const f = (m.lnSep[lo] - target) / (m.lnSep[lo] - m.lnSep[hi]);
    x = m.lnA[lo] + f * (m.lnA[hi] - m.lnA[lo]);
    cf = m.cf[lo] + f * (m.cf[hi] - m.cf[lo]);
  }
  const throat = m.exitArea / m.expansionRatio, a = Math.exp(x);
  return { thrust: Math.max(0, level * m.chamberPressure * throat * cf - p * throat * a), areaRatio: a };
}

/**
 * THE thrust law: one engine at ambient pressure `p` (Pa) and level `level`
 * (throttle × solid profile × start-up or tail-off), N.
 */
export function engineThrustAt(e: EngineSpec, p: number, level: number): number {
  if (!(level > 0)) return 0;
  const fv = e.thrustVac;
  if (!(p > 0)) return level * fv;
  const m = nozzleModel(e);
  if (!(m.exitArea > 0)) return level * fv;
  const sep = separated(m, p, level);
  return sep ? sep.thrust : Math.max(0, level * fv - p * m.exitArea);
}

/** `engineThrustAt` with whether, and where, the flow separates. */
export function nozzleFlow(e: EngineSpec, p: number, level: number): NozzleFlow {
  const m = nozzleModel(e);
  if (!(level > 0)) return { thrust: 0, separated: false, separationAreaRatio: m.expansionRatio };
  if (!(p > 0) || !(m.exitArea > 0)) return { thrust: level * e.thrustVac, separated: false, separationAreaRatio: m.expansionRatio };
  const sep = separated(m, p, level);
  return sep ? { thrust: sep.thrust, separated: true, separationAreaRatio: sep.areaRatio }
    : { thrust: Math.max(0, level * e.thrustVac - p * m.exitArea), separated: false, separationAreaRatio: m.expansionRatio };
}

/**
 * The level at which one engine gives `thrust` at ambient pressure `p`: the
 * inverse of `engineThrustAt`, which rises monotonically with the level.
 * Unbounded above (a request above full thrust returns a level above 1, for
 * the caller to clamp), 0 for no thrust.
 */
export function engineLevelFor(e: EngineSpec, p: number, thrust: number): number {
  if (!(thrust > 0) || !(e.thrustVac > 0)) return 0;
  const m = nozzleModel(e);
  const attached = (thrust + Math.max(0, p) * m.exitArea) / e.thrustVac;
  if (!(p > 0) || !(m.exitArea > 0) || !separated(m, p, attached)) return attached;
  // separated: the thrust is above the attached law's, so the level is below `attached`
  let lo = 0, hi = attached;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (engineThrustAt(e, p, mid) < thrust) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Ambient pressure above which one engine's flow separates in its nozzle at
 * level λ, Pa: λ·wallFactor·p_e over Schmucker's ratio at the exit. 0 for an
 * engine with no exit-area term.
 */
export function separationPressure(e: EngineSpec, level = 1): number {
  const m = nozzleModel(e);
  return m.exitArea > 0 ? (level * m.wallFactor * m.exitPressure) / schmuckerRatio(m.exitMach) : 0;
}
