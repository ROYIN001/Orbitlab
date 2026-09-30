/**
 * The flight readiness review (roadmap D04): everything the program can say
 * about a vehicle on a mission before it flies, as one checklist, and whether
 * it may fly.
 *
 * It is a composition of checks that already exist, in the order a reviewer
 * would take them, so that the builder cannot say something the setup panel or
 * the flight would contradict:
 *
 * 1. `vehicleSpecProblems` — the validator (src/config/vehicle-spec.ts); a spec
 *    it refuses is not reviewed further, since no mission would fly it;
 * 2. `designWarnings` — the design on its own (src/design/warnings.ts);
 * 3. `planMission` — the planner's mission plan;
 * 4. `missionCapability` — what the plan says the stack can deliver;
 * 5. `probeInsertion` — a headless flight of the ascent and the insertion;
 * 6. `missionVerdict` — the setup panel's own verdict (src/config/verdict.ts);
 * 7. notices: six-DOF is experimental for a vehicle of one's own, and the
 *    guidance programme is not tuned for it.
 *
 * The one place the review departs from the setup panel is the probe. The
 * panel flies it only when the static budget calls the mission marginal —
 * short of the orbit on paper, or at 90 % of the rated payload or more
 * (`marginalMission`) — because for the catalogue the ratings are published
 * figures and a comfortable margin on them is real. A vehicle of one's own has
 * ratings its designer typed (the spec requires them and nothing computes them
 * yet: the Phase 3 map's question 7), and an inflated rating makes every
 * mission look comfortable and skips the probe. So for any vehicle that is
 * not a catalogue entry the probe ALWAYS flies; for a catalogue entry the
 * review gates it exactly as the panel does, and so gives the panel's verdict.
 * The probe is flown point-mass, as the panel flies it, and can only make the
 * verdict worse.
 *
 * `fail` anywhere means "do not fly": the review's `canFly` is false. A `warn`
 * is for the reader; an `info` is a notice.
 *
 * Cost: one plan (a millisecond or two) and, for a vehicle of one's own, one
 * probe flight (7–95 ms across the fleet, `probeInsertion`); worth debouncing
 * in a builder that reviews on every edit.
 *
 * DOM-free except for the verdict's text, which `missionVerdict` localizes
 * through `t()` (it runs in node). SI units.
 */
import type { MissionConfig, VehicleSpec } from '../types';
import { siteById } from '../data/sites';
import { satelliteById } from '../data/satellites';
import { planMission, resolveTarget, type MissionPlan } from '../physics/mission';
import { probeInsertion, type InsertionProbe } from '../physics/autotune';
import { RAD } from '../physics/constants';
import { marginalMission, missionCapability, missionVerdict, type Capability, type Feasibility } from '../config/verdict';
import { designWarnings, isCatalogueEntry } from './warnings';

/**
 * The mission a vehicle is reviewed for: a `MissionConfig` without the vehicle,
 * which is the one under review. A whole `MissionConfig` is accepted too; the
 * vehicle it names (`vehicleId`, `vehicleSpec`) is ignored.
 */
export type ReadinessMission = Omit<MissionConfig, 'vehicleId' | 'vehicleSpec'>;

export type ReadinessStep = 'design' | 'plan' | 'capability' | 'probe' | 'verdict' | 'notice';
export type ReadinessLevel = 'ok' | 'info' | 'warn' | 'fail';

export interface ReadinessItem {
  step: ReadinessStep;
  /**
   * What the item says, as a key for the builder's text: a design warning's
   * code (`noLiftoff`, `invalid`…), `noPlan`, `capability`, `reachesOrbit` /
   * `noInsertion` / `probeFailed`, the verdict's `cause`, or a notice
   * (`sixDofExperimental`, `guidanceNotTuned`).
   */
  code: string;
  level: ReadinessLevel;
  /** the numbers behind it, SI */
  params: Record<string, number>;
  /** a design warning's stage, strap-on group, validator path and field */
  stage?: number;
  booster?: number;
  path?: string;
  field?: string;
  /** the probe: the event its flight ended on, when it ended in one */
  event?: string;
}

export interface Readiness {
  items: ReadinessItem[];
  /** the worst level of any item */
  level: ReadinessLevel;
  /** nothing failed: the vehicle may fly this mission */
  canFly: boolean;
  /** the setup panel's verdict on the mission, or null for a spec the validator refused */
  verdict: Feasibility | null;
  plan: MissionPlan | null;
  capability: Capability | null;
  /** the probe's flight, or null when it was not flown (or could not be) */
  insertion: InsertionProbe | null;
}

const RANK: Record<ReadinessLevel, number> = { ok: 0, info: 1, warn: 2, fail: 3 };

/**
 * The review's step 6 on its own: the setup panel's verdict on `mission` for
 * `spec`, given the plan and the probe the review came to (either may be
 * null, as in the review). Pure and cheap — no flight — and it is where the
 * review's only text comes from (`Feasibility.text`, through `t()`), so a
 * screen that ran the review elsewhere (the Engineer level flies it in a
 * worker, which has no reader's language) calls this again to say the same
 * verdict in the reader's language, and again when the language changes.
 */
export function readinessVerdict(spec: VehicleSpec, mission: ReadinessMission, plan: MissionPlan | null, insertion: InsertionProbe | null): Feasibility {
  const site = siteById(mission.siteId);
  const satellite = satelliteById(mission.satelliteId);
  return missionVerdict({
    spec, site, orbit: mission.orbit, satellite, payloadMass: mission.payloadMassOverride ?? satellite.mass,
    inclinationDeg: resolveTarget(mission.orbit, site, mission.launchTime).inclination * RAD,
    plan, insertion, failureMode: mission.failure.mode, siteReassigned: false,
  });
}

/**
 * Review `spec` for `mission`. The payload is the mission's
 * `payloadMassOverride`, else its satellite's mass, as the flight takes it.
 */
export function readiness(spec: VehicleSpec, mission: ReadinessMission): Readiness {
  const items: ReadinessItem[] = [];
  const done = (verdict: Feasibility | null, plan: MissionPlan | null, capability: Capability | null, insertion: InsertionProbe | null): Readiness => {
    const level = items.reduce<ReadinessLevel>((worst, i) => (RANK[i.level] > RANK[worst] ? i.level : worst), 'ok');
    return { items, level, canFly: level !== 'fail', verdict, plan, capability, insertion };
  };
  const catalogue = isCatalogueEntry(spec);
  const satellite = satelliteById(mission.satelliteId);
  const payloadMass = mission.payloadMassOverride ?? satellite.mass;

  // 1–2. The validator, then the design on its own (designWarnings runs the
  // validator first and stops there when it refuses the spec).
  const warnings = designWarnings(spec, payloadMass, mission.siteId);
  for (const w of warnings) {
    const { code, level, params, ...where } = w;
    items.push({ step: 'design', code, level, params, ...where });
  }
  if (warnings.some((w) => w.code === 'invalid' || w.code === 'vacuumEngineOnPad')) return done(null, null, null, null);

  // 3–4. The plan and what it says the stack can deliver. The panel treats a
  // planner that throws as no plan, and the verdict then judges the mass and
  // the corridor only; so does the review, and says so.
  //
  // The vehicle is `spec` and nothing else. A caller may hand over a whole
  // `MissionConfig` (the setup panel's `getConfig()` is one), which names the
  // vehicle it was set up for and, for a custom one, carries its spec; left
  // in, a catalogue entry reviewed on such a mission flew the probe with the
  // other vehicle's spec, `missionVehicle` refused the pair, and a mission
  // the probe fails came out as a `probeFailed` warning (found in review).
  const { vehicleId: _vehicleId, vehicleSpec: _vehicleSpec, ...flown } = mission as ReadinessMission & Partial<Pick<MissionConfig, 'vehicleId' | 'vehicleSpec'>>;
  const cfg: MissionConfig = { ...flown, vehicleId: spec.id, ...(catalogue ? {} : { vehicleSpec: spec }) };
  const site = siteById(mission.siteId);
  let plan: MissionPlan | null = null;
  try { plan = planMission(cfg, site, spec); } catch { plan = null; }
  let capability: Capability | null = null;
  if (!plan) items.push({ step: 'plan', code: 'noPlan', level: 'warn', params: {} });
  else {
    capability = missionCapability(spec, satellite, payloadMass, plan);
    items.push({ step: 'capability', code: 'capability', level: 'info', params: {
      ascentMargin: plan.ascentMargin, ascentShortfall: capability.ascentShortfall, burnShortfall: capability.burnShortfall,
      singleShot: capability.singleShot ? 1 : 0, stranded: capability.stranded ? 1 : 0,
    } });
  }

  // 5. The probe: always for a vehicle of one's own, the panel's gate for a
  // catalogue entry; point-mass either way, as the panel flies it.
  let insertion: InsertionProbe | null = null;
  if (!catalogue || (plan && marginalMission(spec, satellite, payloadMass, plan, mission.orbit))) {
    try {
      insertion = probeInsertion({ ...cfg, dynamics: { ...(cfg.dynamics ?? { wind: 'calm', seed: 20260919 }), model: 'pointMass' } });
    } catch { insertion = null; }
    if (!insertion) items.push({ step: 'probe', code: 'probeFailed', level: 'warn', params: {} });
    else {
      items.push({ step: 'probe', code: insertion.reachesOrbit ? 'reachesOrbit' : 'noInsertion', level: insertion.reachesOrbit ? 'ok' : 'fail',
        params: { tInsertion: insertion.tInsertion, bestPerigee: insertion.bestPerigee, apoapsis: insertion.apoapsis },
        ...(insertion.endedWith ? { event: insertion.endedWith } : {}) });
    }
  }

  // 6. The setup panel's verdict, on everything above.
  const verdict = readinessVerdict(spec, mission, plan, insertion);
  items.push({ step: 'verdict', code: verdict.cause, level: verdict.level, params: {} });

  // 7. Notices for a vehicle of one's own.
  if (!catalogue) {
    // Point-mass is the default for a vehicle of one's own; six-DOF flies it
    // on generic stand-ins for what the catalogue keys by stage id (engine
    // chambers, propellant layout, attitude thrusters): the Phase 3 map, §4.3.
    if (mission.dynamics?.model === 'sixDof') items.push({ step: 'notice', code: 'sixDofExperimental', level: 'info', params: {} });
    // The programme flown is the spec's own `guidanceDefaults` — its origin's,
    // for a copy or a remix — tuned for another vehicle or for none.
    items.push({ step: 'notice', code: 'guidanceNotTuned', level: 'info', params: {} });
  }
  return done(verdict, plan, capability, insertion);
}
