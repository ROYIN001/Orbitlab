/**
 * A design lesson's figures (roadmap T01, Phase 4 map §4.1 and §4.2): the
 * numbers a design is graded on (`DesignMeasureId`, src/lessons/types.ts),
 * read off the D06 satellite model and the lifetime analysis (P07) and handed
 * to the grader as data (`DesignKey`), as a case sheet's key is. It lives in
 * src/design, outside src/lessons, because the figures read the propagator's
 * air and the lifetime run flies it, and src/lessons may not import the
 * propagator (tests/propagator.test.ts); the grade itself is
 * src/lessons/design-lesson.ts `gradeDesign`.
 *
 * ONE NUMBER, ONE WAY. Every figure is `designFigures`'s
 * (src/design/satellite-model.ts) on the lesson's design date and ECSS level,
 * converted to the measure's unit; the lifetime is the satellite bench's own
 * run (`designLifetimeRequest`, which the bench now builds its run with too):
 * the mean-element method from the design orbit on the design date at the
 * lesson's level, for the life plus 25 years — longer when a lesson's bound
 * on the lifetime lies beyond that — so the student reads on the bench the
 * very numbers the lesson grades. Two measures the model does not give are
 * worked out here from the D07 cores, over a fixed window of
 * `DESIGN_WINDOW_DAYS` from the design date:
 * - the longest wait between looks at the requirements' place
 *   (`revisitGaps`, src/orbit/coverage.ts), within half the swath straight
 *   down, the window's two ends counted as waits (D07's rule for an open
 *   window), so a design that sees the place only once in the window waits
 *   at least as long as its edges;
 * - the data a day: the time the design's station hears it above its lowest
 *   elevation (`contactTime`) a day, times the design's rate; nothing when
 *   the link has no margin at the worst range, where it does not close.
 *
 * REPRODUCIBLE (map R6): the lesson fixes the date and the level — never the
 * measured series, which the deploy job refreshes daily — so the instructor's
 * re-check (src/lessons/recheck.ts, T02) works the same figures out again
 * from the record's design, date and level, within the engine tolerances.
 *
 * DOM-free, SI inside; values come out in each measure's unit
 * (src/lessons/design-lesson.ts `DESIGN_MEASURES`).
 */
import { DEG } from '../physics/constants';
import type { LifetimeRequest } from '../physics/lifetime-job';
import { satelliteDesignProblems } from '../config/satellite-design';
import { STATIONS } from '../orbit/applications-setup';
import { contactTime, revisitGaps } from '../orbit/coverage';
import { YEAR } from '../orbit/disposal';
import { levelActivity, type EcssLevel } from '../orbit/satellite-air';
import type { DesignKey, DesignLesson, DesignMeasureId } from '../lessons/types';
import type { MissionRequirements } from './requirements';
import { lifetimeSpacecraft } from './satellite-area';
import { designOrbit } from './satellite-handoff';
import { designDateJd, designFigures, designFromTemplate, designHandoff, type SatelliteFigures } from './satellite-model';
import type { SatelliteDesign } from './satellite-spec';

/** The window the revisit and the data a day are worked out over, days from the design date: a month of passes. */
export const DESIGN_WINDOW_DAYS = 30;

/** The measures only the lifetime run gives. */
const LIFETIME: readonly DesignMeasureId[] = ['sat.lifetime', 'sat.disposal25y'];

/** What a design is worked out for: the lesson's fixed date and level, what it asks about, and what it asks. */
export interface DesignFigureOptions {
  /** the design date, `YYYY-MM-DD` (UTC) */
  date: string;
  level: EcssLevel;
  /** the measures to work out beyond the closed forms (every closed form is always given) */
  measures: readonly DesignMeasureId[];
  /** the place the revisit looks at (`sat.revisitMax`) */
  requirements?: MissionRequirements;
  /** the largest bound a criterion puts on the lifetime, years: the run lasts past it */
  lifetimeBound?: number;
}

/** A design's figures in the measures' units, without the locks (the caller's: `brokenDesignLocks`). */
export type DesignValues = Omit<DesignKey, 'lockBroken'>;

/**
 * The design a lesson starts from: a template's, made as the designer makes
 * one (`designFromTemplate`), or a copy of the file's own.
 */
export function designLessonStart(start: DesignLesson['start'], id = 'lesson', name = ''): SatelliteDesign {
  if ('template' in start) return designFromTemplate(start.template, id, name || start.template);
  return JSON.parse(JSON.stringify(start.design)) as SatelliteDesign;
}

/** The Julian date (UTC) a design date starts on; a date the lesson reader would refuse throws. */
export function designJd(date: string): number {
  const jd = designDateJd(date);
  if (jd === null) throw new RangeError(`not a design date: ${date}`);
  return jd;
}

/** How long the lifetime run flies, years: the life and IADC's 25 years, or past the lesson's largest bound on the lifetime. */
export function lifetimeHorizon(design: Pick<SatelliteDesign, 'lifeYears'>, bound?: number): number {
  const base = design.lifeYears + 25;
  return bound !== undefined && Number.isFinite(bound) && bound >= base ? Math.ceil(bound) + 1 : base;
}

/**
 * The lifetime run the satellite bench flies (D06; map §2.6 b), for `years`:
 * P07's mean-element method from the design in its orbit on Julian date
 * `jd`, J2–J4 and drag in NRLMSISE-00 at the ECSS `level`, the Sun, the Moon
 * and sunlight pressure left out, the design's wet mass and drag area. Null
 * for a design the hand-off refuses.
 */
export function designLifetimeRequest(design: SatelliteDesign, jd: number, level: EcssLevel, years: number): LifetimeRequest | null {
  const h = designHandoff(design, jd, design.name || design.template);
  if (!h) return null;
  return {
    r0: h.r, v0: h.v, jd0: h.jd,
    options: {
      method: 'mean', duration: years * YEAR,
      forces: { j2: true, j3j4: true, drag: true, sun: false, moon: false, srp: false, activity: levelActivity(level) },
      spacecraft: lifetimeSpacecraft(design), samples: 600, tolerance: 1e-9,
    },
  };
}

const finite = (v: number | null | undefined): number | null => (v === null || v === undefined || !Number.isFinite(v) ? null : v);

/** The closed-form measures, from the model's figures, in their units. */
function closedValues(fig: SatelliteFigures): Partial<Record<DesignMeasureId, number | null>> {
  return {
    'sat.mass': fig.mass.wet.value,
    'sat.eclipseMax': fig.eclipse.worst.value / 60,
    'sat.powerMargin': fig.power.margin === null ? null : fig.power.margin.value * 100,
    'sat.batteryDod': finite(fig.power.depth.value * 100),
    'sat.dvMargin': fig.dv.margin.value,
    'sat.linkMargin': fig.link.margin.value,
    'sat.gsd': fig.camera ? fig.camera.gsd.value : null,
    'sat.swath': fig.camera?.swath ? fig.camera.swath.value / 1000 : null,
    'sat.wheelMargin': fig.attitude.wheelMargin ? finite(fig.attitude.wheelMargin.value) : null,
    'sat.torquerDipole': fig.attitude.torquerDipole.value,
  };
}

/** The longest wait between looks at the requirements' place, days, over the window; null with no camera, no place, or no look. */
export function designRevisit(design: SatelliteDesign, fig: SatelliteFigures, jd: number, req: MissionRequirements | undefined): number | null {
  const swath = fig.camera?.swath?.value;
  if (!req || swath === undefined) return null;
  const o = designOrbit(design.orbit, jd);
  const target = { lat: req.target.lat * DEG, lon: req.target.lon * DEG, h: 0 };
  const rv = revisitGaps(o, target, swath / 2, jd, DESIGN_WINDOW_DAYS, req.daylightOnly);
  if (!rv.looks.length) return null;
  return Math.max(rv.gaps.length ? rv.maxGap : 0, rv.firstAfter, rv.lastBefore);
}

/** The data the design brings down a day, Gbit: its rate over the time its station hears it a day; 0 where the link does not close. */
export function designDataPerDay(design: SatelliteDesign, fig: SatelliteFigures, jd: number): number | null {
  const s = STATIONS.find((x) => x.id === design.comms.station);
  if (!s) return null;
  if (fig.link.margin.value < 0) return 0;
  const o = designOrbit(design.orbit, jd);
  const heard = contactTime(o, [{ lat: s.lat * DEG, lon: s.lon * DEG, h: 0 }], design.comms.minElDeg * DEG, jd, DESIGN_WINDOW_DAYS);
  return (heard.perDay * design.comms.dataRate) / 1e9;
}

/** What the lifetime run gives, in the measures' units: `lifetime` is its answer, s, or null when still up at the run's end. */
function lifetimeValues(design: SatelliteDesign, fig: SatelliteFigures, horizon: number, lifetime: number | null): DesignValues {
  const values: Partial<Record<DesignMeasureId, number | null>> = { 'sat.lifetime': lifetime === null ? horizon : lifetime / YEAR };
  const out: DesignValues = { values, ...(lifetime === null ? { lifetimeCapped: true } : {}) };
  if (fig.orbit.region !== 'leo') { values['sat.disposal25y'] = null; return out; }
  // the bench's rule (src/ui/build/satellite-bench.ts): with no engine the air has it from the start, the
  // mission and 25 years; with one the budget holds the orbit through the mission, so 25 years from then
  const limit = (design.propulsion ? 0 : design.lifeYears) + 25;
  values['sat.disposal25y'] = lifetime !== null && lifetime <= limit * YEAR ? 1 : 0;
  return { ...out, disposalLimit: limit };
}

/** The figures that need no lifetime run, and what the run, if any, must be. */
function prepare(design: SatelliteDesign, opts: DesignFigureOptions):
  { refused: true } | { refused: false; fig: SatelliteFigures; values: Partial<Record<DesignMeasureId, number | null>>; run: { req: LifetimeRequest; horizon: number } | null } {
  if (satelliteDesignProblems(design).length) return { refused: true };
  const jd = designJd(opts.date);
  const fig = designFigures(design, jd, { level: opts.level });
  const values = closedValues(fig);
  if (opts.measures.includes('sat.revisitMax')) values['sat.revisitMax'] = designRevisit(design, fig, jd, opts.requirements);
  if (opts.measures.includes('sat.dataPerDay')) values['sat.dataPerDay'] = designDataPerDay(design, fig, jd);
  if (!opts.measures.some((m) => LIFETIME.includes(m))) return { refused: false, fig, values, run: null };
  const horizon = lifetimeHorizon(design, opts.lifetimeBound);
  const req = designLifetimeRequest(design, jd, opts.level, horizon);
  if (!req) return { refused: true };
  return { refused: false, fig, values, run: { req, horizon } };
}

/**
 * A design's figures for a design lesson, the lifetime flown by `lifetime`
 * (the page's worker job, `runLifetimeJob`; its answer, s, or null when the
 * satellite is still up at the run's end). A design the checker refuses has
 * none (`refused`).
 */
export async function designValues(design: SatelliteDesign, opts: DesignFigureOptions,
  lifetime: (req: LifetimeRequest) => Promise<number | null>): Promise<DesignValues> {
  const p = prepare(design, opts);
  if (p.refused) return { values: {}, refused: true };
  if (!p.run) return { values: p.values };
  const life = lifetimeValues(design, p.fig, p.run.horizon, await lifetime(p.run.req));
  return { ...life, values: { ...p.values, ...life.values } };
}

/** `designValues` with the lifetime flown here and now (the re-check's worker, Node): the same figures, one call. */
export function designValuesNow(design: SatelliteDesign, opts: DesignFigureOptions, lifetime: (req: LifetimeRequest) => number | null): DesignValues {
  const p = prepare(design, opts);
  if (p.refused) return { values: {}, refused: true };
  if (!p.run) return { values: p.values };
  const life = lifetimeValues(design, p.fig, p.run.horizon, lifetime(p.run.req));
  return { ...life, values: { ...p.values, ...life.values } };
}
