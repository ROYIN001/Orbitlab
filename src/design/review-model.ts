/**
 * The Engineer level's flight readiness review (roadmap D04) as data: the
 * mission a vehicle is reviewed for, built from the few choices the screen
 * offers, and the review's result (src/design/readiness.ts) laid out as the
 * checklist the screen shows — keys and numbers, as src/design/warning-text.ts
 * gives the builder's warnings, so the screen only says them.
 *
 * THE MISSION. The Launch panel's own lists: its orbit presets (all but
 * "custom", whose perigee, apogee and plane need the panel's own fields) and,
 * for the vehicle, the launch sites it flies from, as the panel lists them. The
 * payload is a mass and nothing else — the rideshare dispenser with the mass
 * overridden, as "Fly it" hands a design over (src/design/build-handoff.ts) —
 * so the review and the flight it hands over judge the same mission. The
 * launch time is the Launch panel's, moved to the first launch window after
 * it for an orbit whose plane is set (the station's, a sun-synchronous one),
 * as the panel's Explore level does and as tests/design-readiness.test.ts
 * flies it; otherwise the verdict would only say the time misses the plane.
 * Failures off, no booster recovery, the vehicle's own guidance programme
 * (`guidanceForVehicle`, the six-DOF one when the mission is flown six-DOF, as
 * the panel resolves it), calm air and the fleet tests' seed. Six-DOF is the
 * panel's default for a catalogue vehicle and point-mass for one of one's own
 * (roadmap D03); the review's probe flies point-mass either way, as the
 * panel's does.
 *
 * THE CHECKLIST, in the review's order: the specification (the validator), the
 * design (its warnings, and the Explore level's own check), the planner's
 * feasibility on paper, the probe flight, the verdict, and the notices. A
 * section with nothing to say says it is clear; a section the review never
 * reached (a spec the validator refuses stops it) says so. The plan's rows
 * are never worse than `warn`: what they describe fails the mission through
 * the verdict, which is where the review's `fail` for it is — one reason, not
 * two. The probe's row is the review's own: `fail` when the flight did not
 * reach orbit.
 *
 * DOM-free, SI in (kg, m, m/s, s); the screen formats the numbers.
 */
import type { MissionConfig, OrbitSpec, VehicleSpec } from '../types';
import { ORBIT_PRESETS, orbitById } from '../data/orbits';
import { SITES, siteById, type SiteExtra } from '../data/sites';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../physics/defaults';
import { ASCENT_MARGIN_REQUIRED, launchWindows } from '../physics/mission';
import { defaultDynamics } from '../physics/rigid/config';
import type { Readiness, ReadinessItem, ReadinessLevel, ReadinessMission } from './readiness';
import { HANDOFF_SATELLITE, HANDOFF_SEED, handoffDocument } from './build-handoff';
import type { MissionDocument } from '../config/mission-file';
import { isCatalogueEntry, type DesignWarning } from './warnings';
import { exploreChecks } from './explore-model';
import { exploreCheckText, warningText, type DesignText, type TextLevel } from './warning-text';

/** The orbits the review offers: the Launch panel's presets, but its "custom" one. */
export const REVIEW_ORBITS: readonly OrbitSpec[] = ORBIT_PRESETS.filter((o) => o.id !== 'custom');

/** The sites the review offers for a vehicle: its own, in the Launch panel's order. */
export const reviewSites = (spec: VehicleSpec): SiteExtra[] => SITES.filter((s) => spec.sites.includes(s.id));

/** What the student chooses for the review. */
export interface ReviewChoice {
  orbitId: string;
  siteId: string;
  payloadKg: number;
  /** fly the mission handed over in six-DOF (the review's probe is point-mass either way) */
  sixDof: boolean;
}

/** The review's starting mission for a vehicle: to the 500 km preset from its first site, flown as Launch would fly it. */
export function defaultReviewChoice(spec: VehicleSpec, payloadKg: number): ReviewChoice {
  return {
    orbitId: 'leo', siteId: spec.sites[0], payloadKg,
    sixDof: isCatalogueEntry(spec) && defaultDynamics(spec.id).model === 'sixDof',
  };
}

/**
 * The choice made to fit another vehicle: its site kept when the vehicle flies
 * from it, else the vehicle's first; six-DOF only where it is the Launch
 * panel's default (a vehicle of one's own flies it only when asked again).
 */
export function fitReviewChoice(spec: VehicleSpec, c: ReviewChoice, payloadKg: number): ReviewChoice {
  return {
    orbitId: REVIEW_ORBITS.some((o) => o.id === c.orbitId) ? c.orbitId : 'leo',
    siteId: spec.sites.includes(c.siteId) ? c.siteId : spec.sites[0],
    payloadKg,
    sixDof: isCatalogueEntry(spec) && defaultDynamics(spec.id).model === 'sixDof',
  };
}

/** Why a choice cannot be reviewed: a payload that is not a mass the Launch panel takes (1 kg up), an orbit or site not on offer. */
export type ChoiceProblem = 'payload' | 'orbit' | 'site';

export function reviewChoiceProblem(spec: VehicleSpec, c: ReviewChoice): ChoiceProblem | null {
  if (!(Number.isFinite(c.payloadKg) && c.payloadKg >= 1)) return 'payload';
  if (!REVIEW_ORBITS.some((o) => o.id === c.orbitId)) return 'orbit';
  if (!spec.sites.includes(c.siteId) || !SITES.some((s) => s.id === c.siteId)) return 'site';
  return null;
}

/**
 * The launch time the mission flies: `from`, or for an orbit whose plane is set
 * the first launch window after it (the panel's own `launchWindows`).
 */
export function reviewLaunchTime(orbit: OrbitSpec, siteId: string, from: Date): Date {
  if (orbit.raanMode === 'free') return new Date(from.getTime());
  const first = launchWindows(orbit, siteById(siteId), from, 1)[0];
  return new Date((first?.time ?? from).getTime());
}

/** The mission the review flies for `spec`, from the student's choice and the Launch panel's time. */
export function reviewMission(spec: VehicleSpec, c: ReviewChoice, from: Date): ReadinessMission {
  const orbit = { ...orbitById(c.orbitId) };
  const model: NonNullable<MissionConfig['dynamics']>['model'] = c.sixDof ? 'sixDof' : 'pointMass';
  return {
    satelliteId: HANDOFF_SATELLITE, siteId: c.siteId, orbit,
    launchTime: reviewLaunchTime(orbit, c.siteId, from),
    guidance: guidanceForVehicle(spec, DEFAULT_GUIDANCE, model), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: c.payloadKg,
    dynamics: { model, wind: 'calm', seed: HANDOFF_SEED },
  };
}

/** "Fly it" after the review: the reviewed mission, as the document the Launch panel reads. */
export function reviewHandoff(spec: VehicleSpec, c: ReviewChoice, mission: ReadinessMission): MissionDocument {
  return handoffDocument(spec, c.payloadKg, mission.launchTime, c.sixDof ? 'sixDof' : 'pointMass', { orbitId: c.orbitId, siteId: c.siteId });
}

// ─── the checklist ──────────────────────────────────────────────────────────

export type ChecklistSectionId = 'spec' | 'design' | 'plan' | 'probe' | 'verdict' | 'notices';
export const CHECKLIST_SECTIONS: readonly ChecklistSectionId[] = ['spec', 'design', 'plan', 'probe', 'verdict', 'notices'];

export interface ChecklistRow {
  level: ReadinessLevel;
  /** what the row says, as a key and its numbers; the verdict's row has none (its text is the verdict's own) */
  text: DesignText | null;
}

export interface ChecklistSection {
  id: ChecklistSectionId;
  /** the worst level of its rows */
  level: ReadinessLevel;
  rows: ChecklistRow[];
}

const RANK: Record<ReadinessLevel, number> = { ok: 0, info: 1, warn: 2, fail: 3 };
const worst = (rows: readonly ChecklistRow[]): ReadinessLevel =>
  rows.reduce<ReadinessLevel>((w, r) => (RANK[r.level] > RANK[w] ? r.level : w), 'ok');

/** A sentence of the review's own: its key, the level it is shown at, and its numbers. */
function say(key: string, level: ReadinessLevel, values: DesignText['values'] = {}): ChecklistRow {
  const shown: TextLevel = level === 'fail' ? 'fail' : level === 'warn' ? 'warn' : 'note';
  return { level, text: { key, level: shown, subject: null, values } };
}

/** How the probe's flight ended, by the event it ended on; one sentence for any other. */
export const PROBE_END_KEYS: Readonly<Record<string, string>> = {
  'evt.noLiftoff': 'build.eng.review.end.noLiftoff',
  'evt.outOfPropellant': 'build.eng.review.end.outOfPropellant',
  'evt.insertionAbandoned': 'build.eng.review.end.insertionAbandoned',
  'evt.vehicleLost': 'build.eng.review.end.vehicleLost',
  'evt.reentry': 'build.eng.review.end.reentry',
};
export const PROBE_END_OTHER = 'build.eng.review.end.other';

/**
 * The review laid out as the screen's checklist. `spec` is the vehicle
 * reviewed (for the Explore level's own check on it).
 */
export function checklist(spec: VehicleSpec, r: Readiness): ChecklistSection[] {
  const byStep = (step: ReadinessItem['step']): ReadinessItem[] => r.items.filter((i) => i.step === step);
  const design = byStep('design');
  const specItems = design.filter((i) => i.code === 'invalid');
  const refused = specItems.length > 0 || design.some((i) => i.code === 'vacuumEngineOnPad');
  const warned = (i: ReadinessItem): ChecklistRow => ({ level: i.level, text: warningText(i as unknown as DesignWarning) });
  const notReached = [say('build.eng.review.notReached', 'info')];

  const sections: Record<ChecklistSectionId, ChecklistRow[]> = {
    spec: specItems.length ? specItems.map(warned) : [say('build.eng.review.spec.ok', 'ok')],
    design: [], plan: [], probe: [], verdict: [], notices: [],
  };
  if (specItems.length) sections.design = notReached;
  else {
    const rows = [...design.map(warned), ...(refused ? [] : exploreChecks(spec).map((c) => ({ level: c.level, text: exploreCheckText(c) }) as ChecklistRow))];
    rows.sort((a, b) => RANK[b.level] - RANK[a.level]);
    sections.design = rows.length ? rows : [say('build.eng.review.design.ok', 'ok')];
  }

  if (refused) {
    sections.plan = notReached;
    sections.probe = notReached;
    sections.verdict = notReached;
  } else {
    // the planner's feasibility, on paper
    const noPlan = byStep('plan').some((i) => i.code === 'noPlan');
    const cap = byStep('capability')[0];
    if (noPlan) sections.plan = [say('build.eng.review.plan.none', 'warn')];
    else if (cap) {
      const p = cap.params;
      const rows: ChecklistRow[] = [];
      const need = { value: ASCENT_MARGIN_REQUIRED, unit: 'speed' as const };
      if (p.ascentShortfall > 0) {
        rows.push(say(p.singleShot ? 'build.eng.review.plan.shortSingle' : 'build.eng.review.plan.short', 'warn',
          { dv: { value: p.ascentShortfall, unit: 'speed' }, need }));
      } else rows.push(say('build.eng.review.plan.margin', 'ok', { margin: { value: p.ascentMargin, unit: 'speed' }, need }));
      if (p.stranded) rows.push(say('build.eng.review.plan.stranded', 'warn'));
      else if (p.singleShot) rows.push(say('build.eng.review.plan.singleShot', 'info'));
      if (p.burnShortfall > 0) rows.push(say('build.eng.review.plan.burnShort', 'warn', { dv: { value: p.burnShortfall, unit: 'speed' } }));
      sections.plan = rows;
    }

    // the probe flight, or why none was flown
    const probe = byStep('probe')[0];
    if (!probe) sections.probe = [say('build.eng.review.probe.notFlown', 'ok')];
    else if (probe.code === 'probeFailed') sections.probe = [say('build.eng.review.probe.failed', 'warn')];
    else if (probe.code === 'reachesOrbit') {
      sections.probe = [say('build.eng.review.probe.orbit', 'ok', {
        t: { value: probe.params.tInsertion, unit: 'count' },
        pe: { value: probe.params.bestPerigee, unit: 'km' }, ap: { value: probe.params.apoapsis, unit: 'km' },
      })];
    } else {
      const end = { key: PROBE_END_KEYS[probe.event ?? ''] ?? PROBE_END_OTHER };
      // a "perigee" below the ground is a ballistic arc, not an orbit it held: said as never having held one
      const held = Number.isFinite(probe.params.bestPerigee) && probe.params.bestPerigee >= 0;
      sections.probe = [held
        ? say('build.eng.review.probe.noOrbit', 'fail', { end, pe: { value: probe.params.bestPerigee, unit: 'km' } })
        : say('build.eng.review.probe.noOrbitNever', 'fail', { end })];
    }

    // the verdict: its own text, at its own level
    const v = byStep('verdict')[0];
    if (v) sections.verdict = [{ level: v.level, text: null }];
  }

  for (const n of byStep('notice')) {
    sections.notices.push(say(n.code === 'sixDofExperimental' ? 'build.eng.review.notice.sixDof' : 'build.eng.review.notice.guidance', 'info'));
  }
  if (!sections.notices.length) sections.notices.push(say('build.eng.review.notice.none', 'ok'));

  return CHECKLIST_SECTIONS.map((id) => ({ id, level: worst(sections[id]), rows: sections[id] }));
}

/** How many rows fail, and how many warn: the review's summary line. */
export function checklistCounts(sections: readonly ChecklistSection[]): { fail: number; warn: number } {
  let fail = 0, warn = 0;
  for (const s of sections) for (const r of s.rows) { if (r.level === 'fail') fail++; else if (r.level === 'warn') warn++; }
  return { fail, warn };
}
