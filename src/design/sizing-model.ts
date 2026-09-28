/**
 * The Engineer level's sizing page (roadmap D05) as data: the request it
 * starts from, the engines a sized stage may take, what `sizeVehicle`
 * (src/design/sizing.ts) refuses and what in its result is an estimate or a
 * default — each as a key and its numbers, as src/design/warning-text.ts
 * gives the builder's — and what the sized launcher is reviewed and opened
 * with. The sizing itself is sizing.ts's, unchanged.
 *
 * THE STARTING REQUEST is the one tests/design-sizing.test.ts sizes and
 * flies: 1 t to the 500 km preset from Kourou on two kerolox stages
 * (Rutherford and Rutherford Vacuum, ε 0.08 and 0.09, 1.8 m, T/W 1.3 and
 * 0.7), with no extra Δv. Flown as it is sized, that launcher runs out of
 * propellant short of orbit, and needs about +500 m/s: the design Δv is the
 * planner's allowance, the low end of what the fleet loses, and the flight
 * carries the 800 kg fairing chosen for it well into its second burn. The
 * page starts there on purpose and says so; the readiness review shows it.
 *
 * THE ENGINES a stage may take are what `sizeVehicle` sizes with: liquid, one
 * real engine a count can multiply (no lumped entry, no cluster), and none
 * that only works in vacuum on the first stage.
 *
 * DOM-free, SI (kg, m, m/s).
 */
import { ENGINE_PARTS, enginePart, lockedEngineCount, type EnginePart } from '../data/parts';
import { orbitById } from '../data/orbits';
import { siteById } from '../data/sites';
import { MAX_STAGES } from '../config/vehicle-spec';
import { LENGTH_ALLOWANCE_DIAMETERS, SizingRefused, sizeVehicle, type Sizing, type SizingEstimate, type SizingRefusal, type SizingRequest } from './sizing';
import { ESTIMATE_KEYS, estimateText, type DesignText, type EstimateCode } from './warning-text';
import { STAGING_PROBLEM_KEYS, problemValues } from './staging-model';
import type { StagingProblem } from './optimal-staging';
import type { ReviewChoice } from './review-model';

/** How many stages the page sizes (the optimal-staging page's bound, well inside the validator's). */
export const SIZING_MAX_STAGES = Math.min(5, MAX_STAGES);
/** The inputs' bounds, SI: ε as a fraction, diameter in m, T/W, payload in kg, extra Δv in m/s. */
export const SIZING_LIMITS = { epsilon: [0.02, 0.5], diameter: [0.3, 15], tw: [0.1, 5], payload: [1, 200000], extraDv: [0, 5000] } as const;

/** The page's first request: the 1 t launcher tests/design-sizing.test.ts sizes and flies. */
export function defaultSizingRequest(): SizingRequest {
  return {
    payloadKg: 1000, orbit: orbitById('leo'), siteId: 'kourou', extraDvMps: 0,
    stages: [
      { enginePart: 'rutherford', epsilon: 0.08, diameterM: 1.8, targetTW: 1.3 },
      { enginePart: 'rutherford-vac', epsilon: 0.09, diameterM: 1.8, targetTW: 0.7 },
    ],
  };
}

/** A stage added on top: the stage below's engine where it may fly there, a little narrower, T/W 0.7. */
export function nextSizingStage(below: SizingRequest['stages'][number]): SizingRequest['stages'][number] {
  return { enginePart: below.enginePart, epsilon: Math.min(0.2, below.epsilon + 0.02), diameterM: below.diameterM, targetTW: 0.7 };
}

/** The engines stage `index` may be sized with, in the catalogue's order. */
export function sizingEngines(index: number): EnginePart[] {
  return ENGINE_PARTS.filter((p) => p.kind === 'engine' && !p.solid && lockedEngineCount(p.id) === undefined && !(index === 0 && p.vacuumOnly));
}

// ─── refusals ───────────────────────────────────────────────────────────────

type OwnRefusal = Exclude<SizingRefusal, StagingProblem>;

/** Each refusal of `sizeVehicle` that is its own; the staging problems have the staging page's sentences. */
export const SIZING_REFUSAL_KEYS: Readonly<Record<OwnRefusal, string>> = {
  noStages: 'build.eng.size.refuse.noStages',
  unknownPart: 'build.eng.size.refuse.unknownPart',
  unknownSite: 'build.eng.size.refuse.unknownSite',
  solidMotor: 'build.eng.size.refuse.solidMotor',
  lumpedEngine: 'build.eng.size.refuse.lumpedEngine',
  vacuumEngineOnPad: 'build.eng.size.refuse.vacuumEngineOnPad',
  badInput: 'build.eng.size.refuse.badInput',
  tooManyEngines: 'build.eng.size.refuse.tooManyEngines',
  outOfLimits: 'build.eng.size.refuse.outOfLimits',
};

const isStagingProblem = (c: SizingRefusal): c is StagingProblem => c in STAGING_PROBLEM_KEYS;

/** A refusal as a sentence, about the stage it names. */
export function sizingRefusalText(e: SizingRefused, req: SizingRequest): DesignText {
  const subject = e.stage !== null ? { kind: 'stage' as const, n: e.stage + 1 } : null;
  if (isStagingProblem(e.code)) {
    const stages = req.stages.map((s) => ({ ispS: enginePartOrNull(s.enginePart)?.ispVac ?? 0, epsilon: s.epsilon }));
    const v = problemValues(e.code, stages);
    return {
      key: STAGING_PROBLEM_KEYS[e.code], level: 'fail', subject,
      values: { ...(v.limit !== undefined ? { limit: { value: v.limit, unit: 'speed' as const } } : {}), ...(v.stage !== undefined ? { stage: { value: v.stage, unit: 'count' as const } } : {}) },
    };
  }
  return { key: SIZING_REFUSAL_KEYS[e.code], level: 'fail', subject, values: {}, detail: e.message };
}

function enginePartOrNull(id: string): EnginePart | null {
  try { return enginePart(id); } catch { return null; }
}

/** The request sized, or why not. Anything else `sizeVehicle` throws is a bug, and is thrown on. */
export type SizingOutcome = { ok: true; sizing: Sizing } | { ok: false; refusal: DesignText; code: SizingRefusal };

export function sizingOutcome(req: SizingRequest): SizingOutcome {
  try {
    return { ok: true, sizing: sizeVehicle(req) };
  } catch (e) {
    if (e instanceof SizingRefused) return { ok: false, refusal: sizingRefusalText(e, req), code: e.code };
    throw e;
  }
}

// ─── estimates and defaults ─────────────────────────────────────────────────

type OwnEstimate = Exclude<SizingEstimate['code'], EstimateCode>;

/** The sizing's own estimates and defaults; the assembly's are warning-text.ts's. */
export const SIZING_ESTIMATE_KEYS: Readonly<Record<OwnEstimate, string>> = {
  lengthAllowance: 'build.eng.size.est.lengthAllowance',
  fairingChosen: 'build.eng.size.est.fairingChosen',
  lastStageRestartable: 'build.eng.size.est.lastStageRestartable',
  enginesOutweighStructure: 'build.eng.size.est.enginesOutweighStructure',
  splitIgnoresFairing: 'build.eng.size.est.splitIgnoresFairing',
};
/** The volume estimate reads differently for a stage sized whole than for a stretched one. */
export const SIZED_LENGTH_KEY = 'build.eng.size.est.lengthFromVolume';

/** Estimates said once for the whole vehicle, not per stage: every stage has them. */
const WHOLE_VEHICLE: ReadonlySet<SizingEstimate['code']> = new Set(['lengthFromVolume', 'lengthAllowance']);

/**
 * The sizing's estimates as sentences, each once: those every stage carries
 * (the lengths) said once for the vehicle; the country a sized design takes
 * from its site said as the default it is. `enginesOutweighStructure` is a
 * warning, not an estimate: ε is then too low for the engines chosen.
 */
export function sizingEstimateTexts(s: Sizing, req: SizingRequest): DesignText[] {
  const out: DesignText[] = [];
  const seen = new Set<string>();
  for (const e of s.estimates) {
    const whole = WHOLE_VEHICLE.has(e.code);
    const k = `${e.code}|${whole ? '' : e.stage ?? ''}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const subject = !whole && e.stage !== undefined ? { kind: 'stage' as const, n: e.stage + 1 } : null;
    switch (e.code) {
      case 'lengthFromVolume':
        out.push({ key: SIZED_LENGTH_KEY, level: 'note', subject: null, values: {} });
        break;
      case 'lengthAllowance':
        out.push({ key: SIZING_ESTIMATE_KEYS.lengthAllowance, level: 'note', subject: null, values: { d: { value: LENGTH_ALLOWANCE_DIAMETERS, unit: 'tw' } } });
        break;
      case 'fairingChosen': {
        const f = s.spec.fairing;
        out.push({ key: SIZING_ESTIMATE_KEYS.fairingChosen, level: 'default', subject: null,
          values: f ? { d: { value: f.diameter, unit: 'm' }, mass: { value: f.mass, unit: 'mass' } } : {} });
        break;
      }
      case 'lastStageRestartable':
        out.push({ key: SIZING_ESTIMATE_KEYS.lastStageRestartable, level: 'default', subject, values: {} });
        break;
      case 'enginesOutweighStructure': {
        const i = e.stage ?? 0;
        const part = enginePart(req.stages[i].enginePart);
        out.push({ key: SIZING_ESTIMATE_KEYS.enginesOutweighStructure, level: 'warn', subject, values: {
          engines: { value: (part.mass.kg ?? 0) * s.stages[i].engines, unit: 'mass' }, dry: { value: s.stages[i].dryMass, unit: 'mass' },
        } });
        break;
      }
      case 'splitIgnoresFairing':
        out.push({ key: SIZING_ESTIMATE_KEYS.splitIgnoresFairing, level: 'note', subject: null, values: {} });
        break;
      default:
        out.push(estimateText({ code: e.code, ...(e.stage !== undefined ? { stage: e.stage } : {}) }, { country: siteById(req.siteId).country }));
    }
  }
  // warnings first, then estimates, then defaults
  const rank = { fail: 0, warn: 1, note: 2, default: 3 } as const;
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

/** The keys the sizing's estimates may be said with: its own and the assembly's (for the tests' coverage check). */
export const SIZING_TEXT_KEYS: readonly string[] = [
  ...Object.values(SIZING_ESTIMATE_KEYS), SIZED_LENGTH_KEY, ...Object.values(SIZING_REFUSAL_KEYS), ...Object.values(STAGING_PROBLEM_KEYS),
  ...(['noRatings', 'maxQDefault', 'maxAccelDefault', 'countryDefault', 'engineMassUnknown', 'fairingSepAltitude'] as const).map((c) => ESTIMATE_KEYS[c]),
];

// ─── what the sized launcher goes on to ─────────────────────────────────────

/** The readiness review of the sized launcher: the mission it was sized for, flown point-mass. */
export function sizedReviewChoice(req: SizingRequest): ReviewChoice {
  return { orbitId: req.orbit.id, siteId: req.siteId, payloadKg: req.payloadKg, sixDof: false };
}

