/**
 * The Engineer level's test stand as data (roadmap D04, "a static fire"): the
 * engines a student can bolt to it, the air it fires in, and what the firing
 * says beside what the catalogue publishes.
 *
 * The firing itself is src/design/static-fire.ts, the flight's own engine
 * model run on a one-stage vehicle. This module only chooses its inputs and
 * reads its output, so nothing here can make a firing differ from a flight:
 *
 * - WHICH ENGINE. The engines of the vehicle on the bench — each stage's, and
 *   one strap-on of each group — loaded with the propellant they burn there,
 *   or any engine part of the D01 catalogue, loaded with its share of the
 *   first catalogue body that flies it (so its burn lasts as long as it does
 *   on that stage). A lumped catalogue entry is several engines counted as
 *   one, so its count is the data's and cannot change (src/data/parts.ts).
 * - THE AIR. A vacuum chamber (0 Pa), standard sea level (P0) or a launch
 *   site's altitude, `atmosphere(h).p` — the pressure the flight's engine
 *   model reads there (src/physics/atmosphere.ts, the US Standard Atmosphere
 *   near the ground).
 * - THE PUBLISHED FIGURES BESIDE IT. At full thrust the steady thrust at 0 Pa
 *   and at P0 is the catalogue's by construction, and so is the vacuum Isp;
 *   the model's sea-level Isp is worked out from the sea-level thrust and the
 *   vacuum mass flow (`deliveredIspSL`), so it departs from the quoted one by
 *   what the quoted pair is inconsistent by (up to 6.9 %, RD-108A). A solid's
 *   catalogue thrust is its MEAN (grain over published burn time) and its
 *   published peak is kept as a ratio to it, `peakFactor`; the product is the
 *   published peak within 0.5 % (the table in src/data/parts.ts,
 *   tests/design-static-fire.test.ts). Anywhere between 0 and P0 nobody
 *   publishes a figure: the model blends the two linearly in pressure.
 * - WHAT IS AN ESTIMATE. The start-up and the tail-off are the fleet's
 *   generic constants unless the engine sets its own (src/physics/vehicle.ts,
 *   `LIQUID_STARTUP_S` …), not published transients, and the model keeps the
 *   Isp constant through both. The screen labels them so (`standTransients`).
 *
 * DOM-free, SI (N, kg, kg/s, s, Pa); the screen converts to kN and kPa.
 */
import type { EngineSpec, VehicleSpec } from '../types';
import { BOOSTER_BODIES, ENGINE_PARTS, STAGE_BODIES, engineSpec, enginePartOf, type EnginePart } from '../data/parts';
import { G0, P0 } from '../physics/constants';
import { atmosphere } from '../physics/atmosphere';
import { TAILOFF_SPAN, engineIsp, engineMassFlow, engineStartupS, engineTailoffS, engineThrust } from '../physics/vehicle';
import { staticFire, type StaticFireResult, type StaticFireSample } from './static-fire';

/** An engine on the stand, with the load it is fired with unless the student changes it. */
export interface StandEngine {
  /** 'stage:<i>', 'booster:<i>:<g>' (one strap-on of group g), or 'part:<id>' */
  key: string;
  /** the engine as installed there; `count` is how many that installation has */
  engine: EngineSpec;
  /** the catalogue part it was emitted from, or null (a design's own figures) */
  part: EnginePart | null;
  count: number;
  /** a lumped catalogue entry: the count is the data's, not a count of engines */
  countLocked: boolean;
  /** the propellant it burns where it comes from, kg */
  propellantKg: number;
  stageIndex?: number;
  group?: number;
}

/** Each stage's engines and one strap-on of each group, in stack order, as the vehicle carries them. */
export function vehicleStandEngines(spec: VehicleSpec): StandEngine[] {
  const out: StandEngine[] = [];
  spec.stages.forEach((st, i) => {
    const part = enginePartOf(st.engine);
    out.push({
      key: `stage:${i}`, engine: st.engine, part, count: st.engine.count, countLocked: part?.kind === 'lumped',
      propellantKg: st.propellantMass, stageIndex: i,
    });
    (st.boosters ?? []).forEach((b, g) => {
      const bp = enginePartOf(b.engine);
      out.push({
        key: `booster:${i}:${g}`, engine: b.engine, part: bp, count: b.engine.count, countLocked: bp?.kind === 'lumped',
        propellantKg: b.propellantMass, stageIndex: i, group: g,
      });
    });
  });
  return out;
}

/**
 * A catalogue engine part on its own: the count and the share of propellant
 * it has on the first catalogue body that flies it (stage bodies first), so
 * one Merlin 1D gets a ninth of Falcon 9's first stage and burns as long.
 * A part no body flies gets 100 s of full-thrust flow.
 */
export function catalogueStandEngine(part: EnginePart): StandEngine {
  const body = [...STAGE_BODIES, ...BOOSTER_BODIES].find((b) => b.engine.part === part.id);
  const locked = part.kind === 'lumped';
  const count = locked && body ? body.engine.count : 1;
  const engine = engineSpec(part, count);
  const propellantKg = body ? body.propellantMass * (count / body.engine.count) : count * engineMassFlow(engine) * 100;
  return { key: `part:${part.id}`, engine, part, count, countLocked: locked, propellantKg };
}

/** Every engine part of the catalogue, in its order. */
export const standCatalogue = (): StandEngine[] => ENGINE_PARTS.map(catalogueStandEngine);

/** Where the stand fires: a vacuum chamber, standard sea level, or a launch site's altitude. */
export type StandAir = 'vacuum' | 'seaLevel' | 'pad';
export const STAND_AIRS: readonly StandAir[] = ['vacuum', 'seaLevel', 'pad'];

/** Ambient pressure, Pa, for `air`; `padAltitudeM` is read only for 'pad'. */
export function standPressurePa(air: StandAir, padAltitudeM: number): number {
  if (air === 'vacuum') return 0;
  if (air === 'seaLevel') return P0;
  return atmosphere(padAltitudeM).p;
}

/**
 * The throttle an engine actually fires at for a command, as the flight's
 * model clamps it (src/physics/vehicle.ts): a solid always at 1, a liquid no
 * lower than its `minThrottle`, and one without a `minThrottle` cannot
 * throttle at all. `why` says which rule moved the command, if one did.
 */
export function standThrottle(engine: EngineSpec, command: number): { level: number; why: 'solid' | 'fixed' | 'minimum' | null } {
  const cmd = Math.min(1, Math.max(0, command));
  if (engine.solid) return { level: 1, why: cmd < 1 ? 'solid' : null };
  const min = engine.minThrottle ?? 1;
  if (cmd >= min) return { level: cmd, why: null };
  return { level: min, why: engine.minThrottle === undefined ? 'fixed' : 'minimum' };
}

/** What the student set on the stand. */
export interface StandInputs {
  count: number;
  propellantKg: number;
  air: StandAir;
  /** for 'pad', m */
  padAltitudeM: number;
  /** commanded, (0, 1] */
  throttle: number;
  /** commanded shutdown, s after ignition; absent, it burns to depletion */
  cutoffS?: number;
}

/** The longest firing the stand draws at its finest step; a longer one gets a coarser step. */
const FINE_STEPS = 40_000;
/** The finest step, s: a liquid engine's start-up (1 s) in a hundred samples. */
const FINE_DT = 0.01;

/**
 * The step of a firing, s: 0.01 s up to a 400 s firing, then as many steps
 * as a 400 s firing has. The samples are exact step means, so the totals do
 * not depend on it (tests/design-static-fire.test.ts); only the curves' detail
 * does.
 */
export function standStep(engine: EngineSpec, i: StandInputs): number {
  const flow = i.count * engineMassFlow(engine) * standThrottle(engine, i.throttle).level;
  let burn = flow > 0 ? i.propellantKg / flow : 0;
  if (i.cutoffS !== undefined) burn = Math.min(burn, i.cutoffS);
  const span = burn + engineStartupS(engine) + TAILOFF_SPAN * engineTailoffS(engine);
  return Math.max(FINE_DT, span / FINE_STEPS);
}

/** A firing and the figures the screen shows of it. */
export interface StandRun {
  pressurePa: number;
  /** the throttle it fired at (`standThrottle`) */
  level: number;
  dt: number;
  result: StaticFireResult;
  /** delivered specific impulse over the whole firing, s: impulse / (G0 · propellant burned) */
  deliveredIsp: number;
  /** total impulse over the burn time, N (a solid's catalogue thrust is this kind of mean) */
  meanThrust: number;
  /** the model's steady thrust at this pressure and level, N: count × F(p) × level (a solid's mean level, 1) */
  steadyThrust: number;
  /** the model's Isp at this pressure, s */
  steadyIsp: number;
  /** propellant left in the tanks after the tail-off, kg */
  leftKg: number;
}

/**
 * Fire `engine` on the stand. Throws what `staticFire` throws for inputs no
 * stand could run (no engines, no propellant); a firing the stand refuses
 * comes back with `result.refused` and no samples.
 */
export function runStand(engine: EngineSpec, i: StandInputs): StandRun {
  const pressurePa = standPressurePa(i.air, i.padAltitudeM);
  const { level } = standThrottle(engine, i.throttle);
  const dt = standStep(engine, i);
  const result = staticFire(engine, {
    count: i.count, propellantKg: i.propellantKg, pressurePa, throttle: i.throttle, dt,
    ...(i.cutoffS !== undefined ? { cutoffS: i.cutoffS } : {}),
  });
  const fired = !result.refused && result.propellantUsed > 0;
  return {
    pressurePa, level, dt, result,
    deliveredIsp: fired ? result.impulse / (G0 * result.propellantUsed) : Number.NaN,
    meanThrust: fired && result.burnTime > 0 ? result.impulse / result.burnTime : Number.NaN,
    steadyThrust: i.count * engineThrust(engine, pressurePa) * level,
    steadyIsp: engineIsp(engine, pressurePa),
    leftKg: fired ? Math.max(0, i.propellantKg - result.propellantUsed) : i.propellantKg,
  };
}

/** A figure of the comparison table: what is published and what the stand measured. */
export type StandFigure = 'thrustSL' | 'thrustVac' | 'thrustPad' | 'meanSL' | 'meanVac' | 'meanPad' | 'peakVac' | 'ispSL' | 'ispVac' | 'ispPad';

export interface StandRow {
  figure: StandFigure;
  /** the catalogue's (the engine's own data for a design's engine); null where nobody publishes one */
  published: number | null;
  /** a vacuum engine's sea-level pair: a placeholder in the data, not a figure (src/data/parts.ts) */
  notData?: true;
  /** what the stand measured, or null where it did not fire in that air */
  stand: number | null;
  /** stand / published − 1, where both exist and they measure the same thing */
  difference: number | null;
  unit: 'N' | 's';
}

/**
 * The model beside the data, for a firing in `air`. Rows for the other air
 * keep the published figure with no stand value, so a student sees both of
 * the catalogue's operating points whichever one was fired. A throttled
 * liquid engine's thrust is not compared with a full-thrust figure; its Isp
 * is (the model's Isp does not depend on the throttle).
 */
export function standComparison(engine: EngineSpec, count: number, air: StandAir, run: StandRun): StandRow[] {
  const fired = !run.result.refused && run.result.samples.length > 0;
  const solid = !!engine.solid;
  const here = (a: StandAir): boolean => fired && air === a;
  const diff = (stand: number | null, published: number | null, comparable = true): number | null =>
    stand !== null && published !== null && published > 0 && comparable ? stand / published - 1 : null;
  const rows: StandRow[] = [];
  const fullLevel = run.level === 1;
  // thrust: a liquid's steady thrust, a solid's mean
  const thrustStand = (a: StandAir): number | null => (here(a) ? (solid ? run.meanThrust : run.steadyThrust) : null);
  const sl = engine.vacuumOnly ? null : count * engine.thrustSL;
  const vac = count * engine.thrustVac;
  const [fSL, fVac, fPad]: StandFigure[] = solid ? ['meanSL', 'meanVac', 'meanPad'] : ['thrustSL', 'thrustVac', 'thrustPad'];
  rows.push({ figure: fSL, published: sl, ...(engine.vacuumOnly ? { notData: true as const } : {}), stand: thrustStand('seaLevel'),
    difference: diff(thrustStand('seaLevel'), sl, solid || fullLevel), unit: 'N' });
  rows.push({ figure: fVac, published: vac, stand: thrustStand('vacuum'), difference: diff(thrustStand('vacuum'), vac, solid || fullLevel), unit: 'N' });
  if (air === 'pad') rows.push({ figure: fPad, published: null, stand: thrustStand('pad'), difference: null, unit: 'N' });
  if (solid) {
    const peak = vac * (engine.peakFactor ?? 1.2);
    const stand = here('vacuum') ? run.result.peakThrust : null;
    rows.push({ figure: 'peakVac', published: peak, stand, difference: diff(stand, peak), unit: 'N' });
  }
  const ispStand = (a: StandAir): number | null => (here(a) ? run.deliveredIsp : null);
  const ispSL = engine.vacuumOnly ? null : engine.ispSL;
  rows.push({ figure: 'ispSL', published: ispSL, ...(engine.vacuumOnly ? { notData: true as const } : {}), stand: ispStand('seaLevel'),
    difference: diff(ispStand('seaLevel'), ispSL), unit: 's' });
  rows.push({ figure: 'ispVac', published: engine.ispVac, stand: ispStand('vacuum'), difference: diff(ispStand('vacuum'), engine.ispVac), unit: 's' });
  if (air === 'pad') rows.push({ figure: 'ispPad', published: null, stand: ispStand('pad'), difference: null, unit: 's' });
  return rows;
}

/** The start-up and tail-off the model flies for this engine, s, and whether they are the fleet's generic ones. */
export function standTransients(engine: EngineSpec): { startupS: number; tailoffTauS: number; tailoffSpanS: number; generic: boolean } {
  const tau = engineTailoffS(engine);
  return {
    startupS: engineStartupS(engine), tailoffTauS: tau, tailoffSpanS: TAILOFF_SPAN * tau,
    generic: engine.startupS === undefined && engine.tailoffS === undefined,
  };
}

/** Curves of a firing for the charts: thrust in kN, mass flow in kg/s, Isp in s, against time in s. */
export interface StandCurves {
  t: number[];
  thrustKN: number[];
  mdot: number[];
  /** NaN where nothing flows (the chart leaves a gap) */
  isp: number[];
}

/**
 * The samples of `result` from `from` to `to` s as curves, at most
 * `maxPoints` of them. Each sample is a step mean, so it is drawn at the
 * middle of its step; a window that starts at ignition starts at the zero
 * thrust of ignition. Thinning keeps every `k`-th sample and the last, so a
 * transient keeps its shape at the scale it is drawn at.
 */
export function standCurves(result: StaticFireResult, from = 0, to = Infinity, maxPoints = 1500): StandCurves {
  const inWindow = result.samples.filter((s) => s.t + s.dt > from && s.t < to);
  const stride = Math.max(1, Math.ceil(inWindow.length / Math.max(2, maxPoints)));
  const kept: StaticFireSample[] = inWindow.filter((_, i) => i % stride === 0);
  if (inWindow.length && kept[kept.length - 1] !== inWindow[inWindow.length - 1]) kept.push(inWindow[inWindow.length - 1]);
  const out: StandCurves = { t: [], thrustKN: [], mdot: [], isp: [] };
  if (from <= 0 && inWindow.length) {
    out.t.push(0); out.thrustKN.push(0); out.mdot.push(0); out.isp.push(Number.NaN);
  }
  for (const s of kept) {
    out.t.push(s.t + s.dt / 2);
    out.thrustKN.push(s.thrust / 1000);
    out.mdot.push(s.mdot);
    out.isp.push(s.mdot > 0 ? s.isp : Number.NaN);
  }
  return out;
}

/**
 * The windows the transients are drawn in, s: from ignition to a little past
 * full thrust, and from a little before shutdown to the end of the tail-off
 * (null when the firing never reached a shutdown, which cannot happen on a
 * stand that fires to depletion or to a cut-off, but a refused one has none).
 */
export function transientWindows(engine: EngineSpec, result: StaticFireResult): { startup: [number, number]; tailoff: [number, number] | null } {
  const tr = standTransients(engine);
  const end = result.duration;
  const startup: [number, number] = [0, Math.min(end, tr.startupS + Math.max(0.5, tr.startupS))];
  if (!result.samples.length) return { startup, tailoff: null };
  const lead = Math.max(0.5, 0.4 * tr.tailoffSpanS);
  return { startup, tailoff: [Math.max(0, result.burnTime - lead), end] };
}
