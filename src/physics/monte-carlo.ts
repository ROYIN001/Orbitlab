/**
 * Monte Carlo insertion accuracy (roadmap G05): the mission flown many times in six-DOF, each run
 * with its vehicle and air dispersed (src/physics/dispersion.ts), to the end of the powered ascent;
 * the spread of the orbits the runs are left in is the insertion's accuracy, and a regression of
 * each orbit element on the numbers drawn says which dispersion drives it.
 *
 * Pure and synchronous: `flyRun` flies one run, `summarizeMonteCarlo` reads a set. The app flies the
 * runs in a pool of workers (src/physics/monte-carlo-job.ts).
 */
import type { MissionConfig, VehicleSpec } from '../types';
import { Simulation } from './simulation';
import { elementsFromState } from './orbital';
import { RAD } from './constants';
import { ORBIT_INSERTION_FLOOR } from './mission';
import {
  cloneDispersions, DEFAULT_DISPERSIONS, drawDispersion, PROPULSION_KEYS, propulsionElements, validDispersions,
  type DispersionDraw, type DispersionKey, type DispersionSettings, type DrawnRun,
} from './dispersion';

export type GuidanceLaw = 'standard' | 'peg' | 'igm';
export const GUIDANCE_LAWS: readonly GuidanceLaw[] = ['standard', 'peg', 'igm'];

/** A Monte Carlo set: how many runs, from which seed, what is dispersed, and whether all three laws fly it. */
export interface MonteCarloConfig {
  runs: number;
  seed: number;
  dispersions: DispersionSettings;
  /** fly every run with the standard law, PEG and IGM (three times the flights) */
  compareLaws: boolean;
}
export const MONTE_CARLO_RUNS = { min: 20, max: 2000, default: 200 } as const;
export function defaultMonteCarlo(): MonteCarloConfig {
  return { runs: MONTE_CARLO_RUNS.default, seed: 1, dispersions: cloneDispersions(DEFAULT_DISPERSIONS), compareLaws: false };
}
export function validMonteCarloConfig(value: unknown): value is MonteCarloConfig {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<MonteCarloConfig>;
  return Number.isInteger(v.runs) && v.runs! >= MONTE_CARLO_RUNS.min && v.runs! <= MONTE_CARLO_RUNS.max
    && Number.isInteger(v.seed) && v.seed! >= 0 && v.seed! <= 0xffffffff
    && validDispersions(v.dispersions) && typeof v.compareLaws === 'boolean';
}

/** The laws a set flies: the mission's own, or all three. */
export function monteCarloLaws(cfg: MissionConfig, mc: Pick<MonteCarloConfig, 'compareLaws'>): GuidanceLaw[] {
  return mc.compareLaws ? [...GUIDANCE_LAWS] : [cfg.dynamics?.explicitGuidance?.law ?? 'standard'];
}

/** The seed a point-mass mission's six-DOF runs fly with (the fleet's). */
export const MONTE_CARLO_DYNAMICS_SEED = 20260919;

/** The mission one run flies: six-DOF (G05 flies six-DOF only), under `law`. */
export function runMission(cfg: MissionConfig, law: GuidanceLaw): MissionConfig {
  const base = cfg.dynamics?.model === 'sixDof' ? cfg.dynamics : { model: 'sixDof' as const, wind: cfg.dynamics?.wind ?? 'calm', seed: cfg.dynamics?.seed ?? MONTE_CARLO_DYNAMICS_SEED };
  const { explicitGuidance: _own, ...rest } = base;
  const cycleS = cfg.dynamics?.explicitGuidance?.cycleS;
  return { ...cfg, dynamics: law === 'standard' ? rest : { ...rest, explicitGuidance: { law, ...(cycleS !== undefined ? { cycleS } : {}) } } };
}

/** How a run's ascent ended: in orbit, short of one (its periapsis in the air), or with the vehicle lost. */
export type RunOutcome = 'inserted' | 'short' | 'lost';

/** One run: its orbit at the end of the powered ascent (the tail-off over), and the numbers it drew. */
export interface MonteCarloRun {
  index: number;
  law: GuidanceLaw;
  outcome: RunOutcome;
  /** the event that ended it, when it was lost */
  reason?: string;
  perigeeKm: number;
  apogeeKm: number;
  inclinationDeg: number;
  /** Δv the stack has left, m/s */
  dvLeft: number;
  /** mission time of the cut-off, s */
  cutoffS: number;
  maxQkPa: number;
  /** the largest q·α of the ascent, kPa·° */
  maxQAlpha: number;
  /** the standard normal numbers drawn, in `drawLayout` order */
  z: number[];
  /** wall time, ms */
  ms: number;
}

/** The order of a run's draws: which quantity, and of which stage or strap-on group (or wind axis). */
export type DrawSlot = Omit<DispersionDraw, 'z'>;
export function drawLayout(spec: VehicleSpec): DrawSlot[] {
  const out: DrawSlot[] = [];
  for (const e of propulsionElements(spec)) for (const key of PROPULSION_KEYS) out.push({ key, element: e.id });
  out.push({ key: 'density' }, { key: 'wind', axis: 'east' }, { key: 'wind', axis: 'north' });
  return out;
}

/** Longest a run may fly before it is called lost, mission s. */
const RUN_TIME_LIMIT_S = 3 * 3600;

/**
 * Fly one run to the end of its powered ascent — the first moment it is neither on the pad nor in
 * the ascent and its engines' tail-off is over — or to its loss. The loop records nothing it does
 * not need (no attitude-loop record, no equation record): the flight is the same.
 */
export function flyRun(cfg: MissionConfig, drawn: DrawnRun, law: GuidanceLaw): MonteCarloRun {
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const sim = new Simulation(runMission(cfg, law), { headless: true, equations: false, rigidOptions: { recordLoop: false }, dispersion: drawn.dispersion });
  let cutoffS = NaN, maxQAlpha = 0, guard = 0;
  while (sim.state.status !== 'failed' && sim.state.t < RUN_TIME_LIMIT_S && guard++ < 5_000_000) {
    const s = sim.state;
    if (s.status !== 'prelaunch' && s.status !== 'ascent') {
      if (Number.isNaN(cutoffS)) cutoffS = s.t;
      if (s.status === 'burn' || !sim.vehicle.inTransient(s.t)) break;
    }
    sim.step(sim.suggestedDt());
    const after = sim.state;
    if (after.status === 'ascent' && after.rigid) maxQAlpha = Math.max(maxQAlpha, after.q / 1000 * Math.hypot(after.rigid.angleOfAttack, after.rigid.sideslip) * RAD);
  }
  const s = sim.state, el = elementsFromState(s.r, s.v);
  const lost = s.status === 'failed' || Number.isNaN(cutoffS);
  const reason = lost ? [...sim.events].reverse().find((e) => e.severity === 'fail')?.key ?? 'evt.timeout' : undefined;
  const outcome: RunOutcome = lost ? 'lost' : el.e < 1 && el.periapsisAlt >= ORBIT_INSERTION_FLOOR - 3e3 ? 'inserted' : 'short';
  const ended = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    index: drawn.index, law, outcome, ...(reason ? { reason } : {}),
    perigeeKm: el.periapsisAlt / 1000, apogeeKm: el.e < 1 ? el.apoapsisAlt / 1000 : Infinity, inclinationDeg: el.i * RAD,
    dvLeft: sim.vehicle.deltaVRemaining(), cutoffS: Number.isNaN(cutoffS) ? s.t : cutoffS,
    maxQkPa: s.maxQ.value / 1000, maxQAlpha, z: drawn.draws.map((d) => d.z), ms: ended - started,
  };
}

/** Run `index` of a set: its draws for this vehicle, flown under `law`. */
export function flyMonteCarloRun(cfg: MissionConfig, spec: VehicleSpec, mc: MonteCarloConfig, index: number, law: GuidanceLaw): MonteCarloRun {
  return flyRun(cfg, drawDispersion(spec, mc.dispersions, mc.seed, index), law);
}

/** What the runs are aimed at: the insertion orbit the mission plans. */
export interface InsertionTarget { perigeeKm: number; apogeeKm: number; inclinationDeg: number }
export function insertionTargetOf(cfg: MissionConfig): InsertionTarget {
  const plan = new Simulation(runMission(cfg, 'standard'), { headless: true, equations: false, rigidOptions: { recordLoop: false } }).plan;
  return { perigeeKm: plan.insertionAltitude / 1000, apogeeKm: Math.max(plan.insertionAltitude, plan.insertionApoapsis) / 1000,
    inclinationDeg: plan.ascentInclination * RAD };
}

// --- statistics ---

export type OutputKey = 'perigeeKm' | 'apogeeKm' | 'inclinationDeg' | 'dvLeft';
export const OUTPUT_KEYS: readonly OutputKey[] = ['perigeeKm', 'apogeeKm', 'inclinationDeg', 'dvLeft'];

export interface OutputStats { n: number; mean: number; sigma: number; min: number; max: number; bias?: number }
export interface Ellipse { cx: number; cy: number; a: number; b: number; angle: number }
/** Each dispersion's share of an output's variance, from the regression; `other` is what it leaves unexplained. */
export interface Sensitivity { shares: Partial<Record<DispersionKey, number>>; other: number; rSquared: number; ok: boolean }
export interface LawSummary {
  law: GuidanceLaw;
  runs: number;
  inserted: number;
  short: number;
  lost: number;
  /** why runs were lost, by event key */
  reasons: Record<string, number>;
  stats: Record<OutputKey, OutputStats>;
  /** the 3σ ellipse of (perigee, apogee), km */
  ellipse?: Ellipse;
  sensitivity: Record<OutputKey, Sensitivity>;
}
export interface MonteCarloSummary { target: InsertionTarget; laws: LawSummary[] }

export function statsOf(values: readonly number[], target?: number): OutputStats {
  const n = values.length;
  if (!n) return { n: 0, mean: NaN, sigma: NaN, min: NaN, max: NaN };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  return { n, mean, sigma: Math.sqrt(variance), min: Math.min(...values), max: Math.max(...values),
    ...(target !== undefined ? { bias: mean - target } : {}) };
}

/** The k-σ ellipse of points (x, y): centre, semi-axes and the major axis's angle from x, rad. */
export function ellipseOf(xs: readonly number[], ys: readonly number[], k = 3): Ellipse | undefined {
  const n = xs.length;
  if (n < 3) return undefined;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  sxx /= n - 1; syy /= n - 1; sxy /= n - 1;
  const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const l1 = tr / 2 + disc, l2 = Math.max(0, tr / 2 - disc);
  const angle = Math.abs(sxy) < 1e-15 ? (sxx >= syy ? 0 : Math.PI / 2) : Math.atan2(l1 - sxx, sxy);
  return { cx: mx, cy: my, a: k * Math.sqrt(l1), b: k * Math.sqrt(l2), angle };
}

/** Least squares with an intercept: the coefficients of the columns of `x` (rows are runs). */
export function regress(x: readonly number[][], y: readonly number[]): { coef: number[]; rSquared: number } | undefined {
  const n = y.length, p = x[0]?.length ?? 0;
  if (n < p + 2) return undefined;
  const my = y.reduce((a, b) => a + b, 0) / n;
  const mx = Array.from({ length: p }, (_, j) => x.reduce((a, row) => a + row[j], 0) / n);
  // Normal equations on centred columns (the intercept drops out), solved by Gaussian elimination.
  const a = Array.from({ length: p }, () => new Array<number>(p + 1).fill(0));
  for (let i = 0; i < n; i++) {
    const dy = y[i] - my;
    for (let j = 0; j < p; j++) {
      const dj = x[i][j] - mx[j];
      a[j][p] += dj * dy;
      for (let k = j; k < p; k++) a[j][k] += dj * (x[i][k] - mx[k]);
    }
  }
  for (let j = 0; j < p; j++) for (let k = 0; k < j; k++) a[j][k] = a[k][j];
  for (let col = 0; col < p; col++) {
    let pivot = col;
    for (let r = col + 1; r < p; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    if (Math.abs(a[pivot][col]) < 1e-12) return undefined;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let r = 0; r < p; r++) {
      if (r === col) continue;
      const f = a[r][col] / a[col][col];
      for (let k = col; k <= p; k++) a[r][k] -= f * a[col][k];
    }
  }
  const coef = a.map((row, j) => row[p] / row[j]);
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    let fit = my;
    for (let j = 0; j < p; j++) fit += coef[j] * (x[i][j] - mx[j]);
    ssTot += (y[i] - my) ** 2; ssRes += (y[i] - fit) ** 2;
  }
  return { coef, rSquared: ssTot > 0 ? 1 - ssRes / ssTot : 0 };
}

/** Runs per regressor below which the shares are not worth showing. */
export const SENSITIVITY_RUNS_PER_TERM = 3;

/**
 * Each dispersion's share of an output's variance: the regression of the output on the numbers the
 * switched-on quantities drew, each term's b²·var(z) over the output's variance, summed per
 * quantity. What is left — the IMU's and the gusts' realisations, and what is not linear — is
 * `other`.
 */
export function sensitivityOf(runs: readonly MonteCarloRun[], layout: readonly DrawSlot[], settings: Readonly<DispersionSettings>, output: OutputKey): Sensitivity {
  const columns = layout.map((slot, j) => ({ slot, j })).filter(({ slot }) => settings[slot.key].enabled && settings[slot.key].sigma > 0);
  const empty: Sensitivity = { shares: {}, other: 1, rSquared: 0, ok: false };
  const y = runs.map((r) => r[output]);
  if (!columns.length || runs.length < SENSITIVITY_RUNS_PER_TERM * columns.length || !y.every(Number.isFinite)) return empty;
  const x = runs.map((r) => columns.map(({ j }) => r.z[j]));
  const fit = regress(x, y);
  if (!fit) return empty;
  const my = y.reduce((a, b) => a + b, 0) / y.length;
  const vy = y.reduce((a, b) => a + (b - my) ** 2, 0) / (y.length - 1);
  if (!(vy > 0)) return empty;
  const shares: Partial<Record<DispersionKey, number>> = {};
  columns.forEach(({ j, slot }, c) => {
    const col = runs.map((r) => r.z[j]), m = col.reduce((a, b) => a + b, 0) / col.length;
    const vz = col.reduce((a, b) => a + (b - m) ** 2, 0) / (col.length - 1);
    shares[slot.key] = (shares[slot.key] ?? 0) + fit.coef[c] ** 2 * vz / vy;
  });
  const explained = Object.values(shares).reduce((a, b) => a + (b ?? 0), 0);
  return { shares, other: Math.max(0, 1 - explained), rSquared: fit.rSquared, ok: true };
}

export function summarizeMonteCarlo(runs: readonly MonteCarloRun[], layout: readonly DrawSlot[], settings: Readonly<DispersionSettings>,
  target: InsertionTarget): MonteCarloSummary {
  const laws = GUIDANCE_LAWS.filter((law) => runs.some((r) => r.law === law));
  return {
    target,
    laws: laws.map((law) => {
      const all = runs.filter((r) => r.law === law), inserted = all.filter((r) => r.outcome === 'inserted');
      const reasons: Record<string, number> = {};
      for (const r of all) if (r.reason) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
      const targetOf: Record<OutputKey, number | undefined> = { perigeeKm: target.perigeeKm, apogeeKm: target.apogeeKm, inclinationDeg: target.inclinationDeg, dvLeft: undefined };
      const stats = Object.fromEntries(OUTPUT_KEYS.map((k) => [k, statsOf(inserted.map((r) => r[k]), targetOf[k])])) as Record<OutputKey, OutputStats>;
      const sensitivity = Object.fromEntries(OUTPUT_KEYS.map((k) => [k, sensitivityOf(inserted, layout, settings, k)])) as Record<OutputKey, Sensitivity>;
      const ellipse = ellipseOf(inserted.map((r) => r.perigeeKm), inserted.map((r) => r.apogeeKm));
      return { law, runs: all.length, inserted: inserted.length, short: all.filter((r) => r.outcome === 'short').length,
        lost: all.filter((r) => r.outcome === 'lost').length, reasons, stats, ...(ellipse ? { ellipse } : {}), sensitivity };
    }),
  };
}

/** Counts per bin of `values` over [lo, hi]. */
export function histogram(values: readonly number[], bins: number, lo = Math.min(...values), hi = Math.max(...values)): { lo: number; hi: number; counts: number[] } {
  const counts = new Array<number>(bins).fill(0);
  const span = hi - lo;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    const i = span > 0 ? Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / span * bins))) : Math.floor(bins / 2);
    counts[i]++;
  }
  return { lo, hi, counts };
}

// --- CSV ---

function slotColumn(slot: DrawSlot): string {
  if (slot.key === 'wind') return `wind_${slot.axis}_ms`;
  if (slot.key === 'density') return 'density_pct';
  return `${slot.element}_${slot.key}_pct`;
}
const fixed = (v: number, digits: number): string => (Number.isFinite(v) ? v.toFixed(digits) : '');
/** A text field, quoted when it holds a comma, a quote or a line break. */
const csvText = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
/** Every run, one row: its orbit, how it ended, and what it drew (as the deviation it flew: %, m/s). */
export function monteCarloCsv(runs: readonly MonteCarloRun[], layout: readonly DrawSlot[], settings: Readonly<DispersionSettings>): string {
  const head = ['run', 'law', 'outcome', 'reason', 'perigee_km', 'apogee_km', 'inclination_deg', 'dv_left_ms', 'cutoff_s', 'max_q_kpa', 'max_qalpha_kpa_deg',
    ...layout.map(slotColumn)];
  const value = (slot: DrawSlot, z: number | undefined): string => {
    const s = settings[slot.key];
    return z === undefined || !Number.isFinite(z) ? '' : (s.enabled ? s.sigma * z : 0).toFixed(4);
  };
  const rows = [...runs].sort((a, b) => a.index - b.index || GUIDANCE_LAWS.indexOf(a.law) - GUIDANCE_LAWS.indexOf(b.law)).map((r) => [
    r.index, r.law, r.outcome, csvText(r.reason ?? ''), fixed(r.perigeeKm, 3), fixed(r.apogeeKm, 3), fixed(r.inclinationDeg, 4),
    fixed(r.dvLeft, 1), fixed(r.cutoffS, 2), fixed(r.maxQkPa, 2), fixed(r.maxQAlpha, 1),
    ...layout.map((slot, j) => value(slot, r.z[j])),
  ].join(','));
  return [head.join(','), ...rows].join('\n') + '\n';
}
