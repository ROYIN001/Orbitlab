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
 * reach orbit. When it did, the orbit said is the one at the first moment
 * after the climb that its perigee was above `ORBIT_INSERTION_FLOOR`, where
 * the probe stops — not the target orbit, which the flight goes on to. A flight the probe calls
 * "reaches orbit" because it was still flying, never lost, at its horizon
 * without ever clearing the floor (`tInsertion` −1) is said as exactly that,
 * as a note: the verdict counts it as orbit, the test saw no orbit above the
 * floor (found in review: it read "reached orbit −1 s after liftoff").
 *
 * DOM-free, SI in (kg, m, m/s, s); the screen formats the numbers.
 */
import type { MissionConfig, OrbitSpec, VehicleSpec } from '../types';
import { ORBIT_PRESETS, orbitById } from '../data/orbits';
import { SITES, siteById, type SiteExtra } from '../data/sites';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../physics/defaults';
import { ASCENT_MARGIN_REQUIRED, ORBIT_INSERTION_FLOOR, launchWindows } from '../physics/mission';
import { INSERTION_PROBE_HORIZON } from '../physics/autotune';
import { defaultDynamics } from '../physics/rigid/config';
import type { Readiness, ReadinessItem, ReadinessLevel, ReadinessMission } from './readiness';
import { HANDOFF_SATELLITE, HANDOFF_SEED, handoffDocument } from './build-handoff';
import type { MissionDocument } from '../config/mission-file';
import { isCatalogueEntry, type DesignWarning } from './warnings';
import { exploreChecks, ratingsSignature } from './explore-model';
import type { ComputedRatings } from './ratings';
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

/**
 * The vehicle on the bench with the payload ratings the review computed for it
 * (src/design/ratings.ts, estimates): its LEO and GTO ratings replaced, and any
 * SSO rating it carried dropped. That one was typed, or its origin's published
 * figure for another vehicle (a saved remix of Vega-C or Long March 2D, which
 * rate GTO at 0 and so are offered the computation), never computed; kept, a
 * mission to a sun-synchronous orbit was judged against it beside computed
 * LEO and GTO ratings (found in review). Without it the verdict judges that
 * orbit against the computed LEO rating (`ratedPayload`), as it does for a
 * design the Explore level rated (explore-model.ts `remixResult`).
 */
export function withComputedRatings(spec: VehicleSpec, r: Pick<ComputedRatings, 'payloadLEO' | 'payloadGTO'>): VehicleSpec {
  const { payloadSSO: _sso, ...rest } = spec;
  return { ...rest, payloadLEO: r.payloadLEO.kg, payloadGTO: r.payloadGTO.kg };
}

/**
 * `next` is `prev` rated: the same vehicle but for its id, its name and its
 * ratings (`ratingsSignature`). The review keeps the mission it was on for
 * it — the payload typed, the site, six-DOF — since the ratings change the
 * verdict, not the mission (found in review: the payload went back to the
 * bench's while the page said the review had run again).
 */
export const sameVehicleRated = (prev: VehicleSpec, next: VehicleSpec): boolean =>
  isCatalogueEntry(prev) === isCatalogueEntry(next) && ratingsSignature(prev) === ratingsSignature(next);

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
  /**
   * R3.4: the piece of hardware the row is about, as a ref of the bench's
   * drawing (src/design/exploded.ts: 'stage:1', 'booster:0:1', 'fairing'),
   * so the review can point at it. Decided from the item's typed fields,
   * never from its words; absent when the row is about the whole vehicle.
   */
  target?: string;
}

/**
 * R3.4: the part a design warning or readiness item is about, from its
 * stage, strap-on group, validator path or code — or null when it concerns
 * the vehicle or the mission as a whole (Δv, a missing plan, the verdict).
 */
export function readinessTarget(item: { code: string; stage?: number; booster?: number; path?: string }): string | null {
  const path = item.path ?? '';
  const booster = /^stages\[(\d+)\]\.boosters\[(\d+)\]/.exec(path);
  if (booster) return `booster:${booster[1]}:${booster[2]}`;
  const stage = /^stages\[(\d+)\]/.exec(path);
  if (stage) return `stage:${stage[1]}`;
  if (path.startsWith('fairing') || item.code === 'upperWiderThanFairing') return 'fairing';
  if (item.booster !== undefined && item.booster >= 0) return `booster:${item.stage ?? 0}:${item.booster}`;
  if (item.stage !== undefined && item.stage >= 0) return `stage:${item.stage}`;
  return null;
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

/**
 * A shortfall on paper the checklist calls one, m/s: one that rounds to at
 * least 1 m/s. A launcher sized by src/design/sizing.ts sits exactly on the
 * planner's line, and its shortfall is then a rounding residue (1e-10 m/s),
 * which "0 m/s short" would misstate. The verdict's own note has no such
 * floor; for a vehicle on the line it is the verdict's text, not this.
 */
export const SHORTFALL_SAID = 0.5;

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
  const warned = (i: ReadinessItem): ChecklistRow => {
    const target = readinessTarget(i);
    return { level: i.level, text: warningText(i as unknown as DesignWarning), ...(target ? { target } : {}) };
  };
  const notReached = [say('build.eng.review.notReached', 'info')];

  const sections: Record<ChecklistSectionId, ChecklistRow[]> = {
    spec: specItems.length ? specItems.map(warned) : [say('build.eng.review.spec.ok', 'ok')],
    design: [], plan: [], probe: [], verdict: [], notices: [],
  };
  if (specItems.length) sections.design = notReached;
  else {
    const rows = [...design.map(warned), ...(refused ? [] : exploreChecks(spec).map((c) => ({ level: c.level, text: exploreCheckText(c), target: `stage:${c.stage}` }) as ChecklistRow))];
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
      if (p.ascentShortfall >= SHORTFALL_SAID) {
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
      const floor = { value: ORBIT_INSERTION_FLOOR, unit: 'km' as const };
      const pe = probe.params.bestPerigee;
      if (probe.params.tInsertion >= 0) {
        // the orbit at the first moment after the climb with its perigee above the floor, where the probe stops: not the target orbit
        sections.probe = [say('build.eng.review.probe.orbit', 'ok', {
          t: { value: probe.params.tInsertion, unit: 'count' }, floor,
          pe: { value: pe, unit: 'km' }, ap: { value: probe.params.apoapsis, unit: 'km' },
        })];
      } else {
        // Flown to the horizon without being lost, and never above the floor: what the probe (and so the verdict)
        // counts as reaching orbit — a long, low coast (Vulcan's and Angara-A5's remixes to the 500 km preset
        // coast at a 137 km perigee) — said as that, never as an orbit reached at "−1 s".
        const t = { value: INSERTION_PROBE_HORIZON, unit: 'count' as const };
        sections.probe = [Number.isFinite(pe)
          ? say('build.eng.review.probe.horizon', 'info', { t, floor, pe: { value: pe, unit: 'km' } })
          : say('build.eng.review.probe.horizonNever', 'info', { t })];
      }
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
