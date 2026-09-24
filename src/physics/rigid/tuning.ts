/**
 * Tuning the attitude autopilot on its linearised loop (roadmap E04): the
 * loop recorded in flight (G04) with other gains or another feed-forward
 * weight — the plant does not depend on them, so its frequency response is
 * computed once per model and every trial is arithmetic on it — and a search
 * for the gains that meet a phase and a gain margin over a flight's models.
 */
import { closedLoopGrowth, curveFromTable, marginsFromCurve, openLoopUnstable, plantTable, type LinearAxis, type LinearModel, type PlaneMargins, type PlaneModel, type PlantTable } from './linear';

export interface TrialGains {
  /** K_θ and K_ω, 1/s */
  kTheta: number;
  kOmega: number;
  /** Weight of the aerodynamic feed-forward, 0–1. */
  feedForward: number;
}

export function flownGains(p: PlaneModel): TrialGains {
  return { kTheta: p.kTheta, kOmega: p.kOmega, feedForward: p.feedForward ?? 1 };
}
export function withGains(p: PlaneModel, g: TrialGains): PlaneModel {
  return { ...p, kTheta: g.kTheta, kOmega: g.kOmega, feedForward: g.feedForward };
}

const tables = new WeakMap<PlaneModel, PlantTable>();
/** The plant's frequency response, computed once per recorded plane. */
export function tableOf(p: PlaneModel, T: number): PlantTable {
  let table = tables.get(p);
  if (!table) { table = plantTable(p, T); tables.set(p, table); }
  return table;
}

/** A recorded plane's margins with trial gains (the plant's table is shared with every other trial). */
export function trialMargins(p: PlaneModel, T: number, g: TrialGains, ffError = 0, withStability = true): PlaneMargins {
  const trial = withGains(p, g);
  if (p.actuator === 'none') return { active: false, stable: false, growthRate: NaN, growthFrequency: NaN, openLoopUnstable: 0 };
  const m = marginsFromCurve(curveFromTable(trial, tableOf(p, T), ffError));
  const growth = withStability ? closedLoopGrowth(trial, T, ffError) : { rate: NaN, frequency: NaN };
  return { active: true, stable: withStability ? growth.rate < 1e-3 : true, growthRate: growth.rate, growthFrequency: growth.frequency,
    openLoopUnstable: withStability ? openLoopUnstable(trial, T, ffError) : 0, ...m };
}

export interface TuneTargets {
  /** Phase margin, deg, and gain margin (above the crossover, and of gain reduction below it), dB. */
  pmDeg: number;
  gmDb: number;
}
export const TUNE_DEFAULT_TARGETS: TuneTargets = { pmDeg: 45, gmDb: 6 };

export interface TuneCase { t: number; plane: PlaneModel }

export interface TuneResult {
  gains: TrialGains;
  /** Every case meets the targets and is stable. */
  feasible: boolean;
  /** The worst case at these gains: its margins and when it was linearised. */
  worst: { t: number; pmDeg?: number; gmDb?: number; gmLowDb?: number; stable: boolean };
  /** The lowest crossover over the cases, rad/s. */
  crossoverRadS?: number;
  cases: number;
}

/** The planes of a channel's models to tune over: active ones, evenly decimated to at most `max`. */
export function tuneCases(models: readonly LinearModel[], axes: readonly LinearAxis[], max = 16): TuneCase[] {
  const all: TuneCase[] = [];
  for (const m of models) for (const axis of axes) if (m.planes[axis].actuator !== 'none') all.push({ t: m.t, plane: m.planes[axis] });
  if (all.length <= max) return all;
  const stride = all.length / max;
  return Array.from({ length: max }, (_, i) => all[Math.min(all.length - 1, Math.round(i * stride))]);
}

interface Scored { gains: TrialGains; ok: boolean; score: number; deficit: number; worst: TuneResult['worst']; wc?: number }

function score(cases: readonly TuneCase[], T: number, g: TrialGains, targets: TuneTargets): Scored {
  let wc = Infinity, deficit = Infinity, ok = true;
  let worst: TuneResult['worst'] = { t: cases[0]?.t ?? 0, stable: true };
  for (const c of cases) {
    const m = trialMargins(c.plane, T, g, 0, false);
    const pm = m.pmDeg ?? -180, gm = m.gmDb ?? Infinity, low = m.gmLowDb === undefined ? -Infinity : m.gmLowDb;
    // How far each margin is from its target, as a fraction of it (negative: short).
    const d = Math.min((pm - targets.pmDeg) / targets.pmDeg, (gm - targets.gmDb) / targets.gmDb, (-low - targets.gmDb) / targets.gmDb);
    if (d < deficit) { deficit = d; worst = { t: c.t, pmDeg: m.pmDeg, gmDb: m.gmDb, gmLowDb: m.gmLowDb, stable: true }; }
    if (d < 0 || m.wcRadS === undefined) ok = false;
    wc = Math.min(wc, m.wcRadS ?? 0);
  }
  // The attitude loop's bandwidth is K_θ, with the rate loop kept at least twice as fast.
  return { gains: g, ok, score: g.kTheta, deficit, worst, wc: Number.isFinite(wc) ? wc : undefined };
}

function stableEverywhere(cases: readonly TuneCase[], T: number, g: TrialGains): boolean {
  return cases.every((c) => closedLoopGrowth(withGains(c.plane, g), T, 0).rate < 1e-3);
}

/**
 * The gains that meet the targets over every case with the widest attitude bandwidth — the highest
 * K_θ — searched over K_ω and the ratio K_θ/K_ω from 0.25 to 0.5: the rate loop at least twice as
 * fast as the attitude loop, which gives the rigid double integrator a damping ratio of 0.7 to 1
 * (ζ = ½√(K_ω/K_θ)). Then refined; every candidate is checked for closed-loop stability, since a
 * Bode margin alone does not show it. If none meets the targets, the stable gains that come
 * nearest, marked infeasible.
 */
export function autoTune(cases: readonly TuneCase[], T: number, targets: TuneTargets, feedForward: number, verify: readonly TuneCase[] = cases): TuneResult {
  // Search on the sampled cases; then check the answer on every case, and search again with the
  // worst one that fails added (a resonance can sit at one instant of the flight only).
  let set = [...cases], result = searchGains(set, T, targets, feedForward);
  for (let round = 0; round < 4 && result.feasible; round++) {
    let failing: { c: TuneCase; d: number } | undefined;
    for (const c of verify) {
      if (set.some((x) => x.plane === c.plane)) continue;
      const s = score([c], T, result.gains, targets);
      const d = s.ok && stableEverywhere([c], T, result.gains) ? Infinity : s.deficit;
      if (d !== Infinity && (!failing || d < failing.d)) failing = { c, d };
    }
    if (!failing) break;
    set = [...set, failing.c];
    result = searchGains(set, T, targets, feedForward);
  }
  // The answer's worst case, over every case.
  const all = [...new Map([...set, ...verify].map((c) => [c.plane, c])).values()], final = score(all, T, result.gains, targets), stable = stableEverywhere(all, T, result.gains);
  return { ...result, feasible: result.feasible && final.ok && stable, worst: { ...final.worst, stable }, crossoverRadS: final.wc, cases: all.length };
}

function searchGains(cases: readonly TuneCase[], T: number, targets: TuneTargets, feedForward: number): TuneResult {
  if (!cases.length) return { gains: { kTheta: 1.5, kOmega: 3, feedForward }, feasible: false, worst: { t: 0, stable: false }, cases: 0 };
  const grid = (kOmegas: number[], ratios: number[]) => kOmegas.flatMap((kOmega) => ratios.map((r) => score(cases, T, { kTheta: r * kOmega, kOmega, feedForward }, targets)));
  const kOmegas = Array.from({ length: 36 }, (_, i) => 0.2 * 100 ** (i / 35)), ratios = [0.25, 0.3, 0.35, 0.4, 0.45, 0.5];
  const pick = (list: Scored[]): Scored | undefined => {
    for (const s of [...list].filter((c) => c.ok).sort((a, b) => b.score - a.score)) if (stableEverywhere(cases, T, s.gains)) return s;
    return undefined;
  };
  let best = pick(grid(kOmegas, ratios));
  if (best) {
    // Refine between the coarse grid's neighbours.
    const k = best.gains.kOmega, r = best.gains.kTheta / k, f = 100 ** (1 / 35);
    const fine = Array.from({ length: 9 }, (_, i) => k * f ** ((i - 4) / 4));
    const fineRatios = [0.9, 0.95, 1, 1.05, 1.1].map((x) => Math.min(0.5, Math.max(0.25, r * x)));
    best = pick([best, ...grid(fine, fineRatios)]) ?? best;
    return { gains: best.gains, feasible: true, worst: { ...best.worst, stable: true }, crossoverRadS: best.wc, cases: cases.length };
  }
  // Nothing meets the targets: the stable candidate with the smallest shortfall.
  const all = grid(kOmegas, ratios).sort((a, b) => b.deficit - a.deficit);
  const nearest = all.find((s) => stableEverywhere(cases, T, s.gains)) ?? all[0];
  return { gains: nearest.gains, feasible: false, worst: { ...nearest.worst, stable: stableEverywhere(cases, T, nearest.gains) }, crossoverRadS: nearest.wc, cases: cases.length };
}
