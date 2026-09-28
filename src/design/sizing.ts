/**
 * Parametric sizing (roadmap D05; the Phase 3 map, §3.4): a launcher sized
 * from what it must do — a payload, an orbit, a launch site — and a few
 * choices per stage: the engine, the structural ratio ε, the diameter and the
 * thrust-to-weight at ignition.
 *
 * 1. THE DESIGN Δv is the planner's own ascent cost to the orbit
 *    (`ascentCost` in src/physics/mission.ts: the perigee speed of the orbit,
 *    the fleet's ascent-loss allowance, less the Earth's rotation credit for
 *    this site and plane) plus the margin the planner wants before it aims an
 *    ascent at an orbit (`ASCENT_MARGIN_REQUIRED`). So the planner's
 *    `ascentMargin` for the sized vehicle is that margin, to rounding: the
 *    vehicle is sized to exactly the line the planner draws. The loss
 *    allowance is the low end of what the fleet spends (see its doc comment);
 *    a small or low-thrust vehicle spends more, which only a flight shows
 *    (src/design/readiness.ts flies the probe), and `extraDvMps` adds Δv on
 *    top for such a vehicle. Measured: a 1 t launcher sized for Kourou at the
 *    bare design Δv runs out of propellant short of orbit, and needs about
 *    +500 m/s (tests/design-sizing.test.ts records it).
 * 2. THE SPLIT of that Δv among the stages is the optimal one
 *    (`optimalStaging`, src/design/optimal-staging.ts), for the payload. It
 *    ignores the fairing, which only the first stage carries: the split is
 *    the fairing-free optimum, a little off optimal, but not off in Δv.
 * 3. THE MASSES are worked from the top down so that each stage delivers its
 *    share exactly with the fairing on the first stage: a stage lifting M on
 *    a share Δv_i at exhaust speed c_i and ratio ε_i has mass
 *    M(n − 1)/(1 − nε), n = exp(Δv_i/c_i). Σ Δv_i is then the design Δv, and
 *    the flight model's own ideal Δv (`idealDeltaV`: vacuum Isp, the fairing
 *    dropped at the first staging) reproduces it (tests/design-sizing.test.ts).
 *    ε includes the engines, as a stage's dry mass does; where the chosen
 *    engines alone outweigh ε's structure the result says so
 *    (`enginesOutweighStructure`), since ε is then too low for them.
 * 4. THE ENGINES: as few as meet the target T/W at ignition — sea-level thrust
 *    over the liftoff mass for the first stage, vacuum thrust over the mass it
 *    lights under for the others (the fairing counted on the second stage, as
 *    `vehicleFigures` counts it). Whole engines, so the T/W achieved is the
 *    target or above.
 * 5. THE LENGTHS: the propellant's volume at the stage's diameter
 *    (src/design/propellant.ts: `PROPELLANT_DENSITY`, the family's mixture
 *    ratio), plus an allowance for engines, thrust structure and skirts of
 *    `LENGTH_ALLOWANCE_DIAMETERS` diameters — the catalogue's median. Both are
 *    ESTIMATES (`lengthFromVolume`, `lengthAllowance`).
 * 6. EMITTED through the parts builder's assembly (`assemble`,
 *    src/design/assemble.ts), as bodies of one's own. The fairing is the
 *    request's, or the narrowest catalogue fairing as wide as the widest stage
 *    above the first (`fairingChosen`); the last stage is restartable unless
 *    the request says otherwise (`lastStageRestartable`), which a launcher
 *    needs to reach an orbit above the 300 km a single burn inserts at.
 *
 * Serial stages, liquid engines only: strap-ons do not fit the closed form
 * (optimal-staging.ts says why), and a solid motor comes with its own grain.
 * The payload ratings are not computed here (`noRatings`); the guidance
 * programme is the default one, tuned for no vehicle.
 *
 * DOM-free, SI units (kg, m, m/s, s).
 */
import type { OrbitSpec, VehicleSpec } from '../types';
import { siteById } from '../data/sites';
import { FAIRING_PARTS, STAGE_BODIES, enginePart, engineSpec, fairingPart, lockedEngineCount, type EnginePart } from '../data/parts';
import { DEG, G0 } from '../physics/constants';
import { inertialLaunchAzimuth } from '../physics/orbital';
import {
  ASCENT_MARGIN_REQUIRED, ascentCost, ascentInclinationFor, earthRotationCredit, launchDirection, resolveTarget,
} from '../physics/mission';
import { engineThrustSL } from '../physics/vehicle';
import { PART_LIMITS } from '../config/vehicle-spec';
import { optimalStaging, stagingProblem, type OptimalStaging, type StagingProblem } from './optimal-staging';
import { FAMILY_MIXTURE_RATIO, mixtureRatioFor, tankLength, type LiquidFamily } from './propellant';
import { assemble, type AssembleEstimate, type PartsDesign } from './assemble';

export interface SizingStage {
  /** an engine part's id: liquid, not lumped */
  enginePart: string;
  /** structural ratio ms/(ms + mp), engines included, 0 < ε < 1 */
  epsilon: number;
  diameterM: number;
  /** thrust over weight when the stage lights (sea level for the first stage) */
  targetTW: number;
  /** default: only the last stage restarts */
  restartable?: boolean;
}

export interface SizingRequest {
  payloadKg: number;
  orbit: OrbitSpec;
  siteId: string;
  /** burn order */
  stages: SizingStage[];
  /** for an orbit whose plane depends on the date; default 2026-09-15 12:00 UTC, the fleet tests' */
  launchTime?: Date;
  /**
   * Δv to add to the design Δv, m/s (default 0). The planner's loss allowance
   * is the LOW end of what the fleet spends (1 684–2 633 m/s, median 1 970:
   * `ASCENT_LOSS_ALLOWANCE`); a vehicle expected to lose more — small,
   * low-thrust, flying an untuned programme — needs more, and only a flight
   * says how much (tests/design-sizing.test.ts records one such case).
   */
  extraDvMps?: number;
  /** a catalogue fairing part, null for none; default the narrowest that fits */
  fairing?: string | null;
  id?: string;
  name?: string;
}

export type SizingEstimateCode = AssembleEstimate['code'] | 'lengthFromVolume' | 'lengthAllowance' | 'fairingChosen'
  | 'lastStageRestartable' | 'enginesOutweighStructure' | 'splitIgnoresFairing';

export interface SizingEstimate {
  code: SizingEstimateCode;
  stage?: number;
}

export interface Sizing {
  /** the planner's ascent cost to the orbit plus its margin, m/s */
  designDv: number;
  /** the parts of it: the ascent cost and the Earth-rotation credit in it, m/s */
  ascentCost: number;
  rotationCredit: number;
  /** the optimal split (for the payload, without the fairing) */
  staging: OptimalStaging;
  /** per stage: mass, structure, propellant (kg), Δv (m/s), engines, T/W achieved, length (m) */
  stages: { mass: number; dryMass: number; propellantMass: number; dv: number; engines: number; tw: number; length: number }[];
  design: PartsDesign;
  spec: VehicleSpec;
  estimates: SizingEstimate[];
}

export type SizingRefusal = StagingProblem | 'noStages' | 'unknownPart' | 'unknownSite' | 'solidMotor' | 'lumpedEngine' | 'vacuumEngineOnPad'
  | 'badInput' | 'tooManyEngines' | 'outOfLimits';

export class SizingRefused extends Error {
  constructor(readonly code: SizingRefusal, readonly stage: number | null, detail: string) {
    super(`sizing${stage !== null ? ` stage ${stage}` : ''}: ${code} (${detail})`);
    this.name = 'SizingRefused';
  }
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * A liquid stage's length beyond its tanks, in diameters: engines, thrust
 * structure, skirts, domes. The median over the catalogue's liquid stage
 * bodies of (length − `tankLength` at their own diameter) / diameter, where
 * the load fits the body at all (Proton's first stage, with outboard tanks,
 * does not). An ESTIMATE; tests/design-sizing.test.ts pins today's value.
 */
export const LENGTH_ALLOWANCE_DIAMETERS = median(STAGE_BODIES.flatMap((b) => {
  const family = enginePart(b.engine.part).family;
  if (family === 'solid') return [];
  const rest = b.length - tankLength(b.propellantMass, b.diameter, family, mixtureRatioFor(b.stageId, family));
  return rest > 0 ? [rest / b.diameter] : [];
}));

const DEFAULT_LAUNCH = new Date(Date.UTC(2026, 8, 15, 12, 0, 0));

/** Size a launcher for a payload, an orbit and a site. Throws `SizingRefused`. */
export function sizeVehicle(req: SizingRequest): Sizing {
  const refuse = (code: SizingRefusal, stage: number | null, detail: string): never => { throw new SizingRefused(code, stage, detail); };
  const n = req.stages.length;
  if (n === 0) refuse('noStages', null, 'a launcher needs a stage');
  if (!(Number.isFinite(req.payloadKg) && req.payloadKg > 0)) refuse('badInput', null, `payload ${req.payloadKg}`);
  const engines: EnginePart[] = req.stages.map((s, i) => {
    let p: EnginePart;
    try { p = enginePart(s.enginePart); } catch { return refuse('unknownPart', i, s.enginePart); }
    if (p.solid) refuse('solidMotor', i, p.id);
    if (lockedEngineCount(p.id) !== undefined) refuse('lumpedEngine', i, `${p.id} is not one engine a count can multiply`);
    if (i === 0 && p.vacuumOnly) refuse('vacuumEngineOnPad', i, p.id);
    if (!(s.epsilon > 0 && s.epsilon < 1) || !(s.diameterM > 0 && s.diameterM <= PART_LIMITS.diameter) || !(s.targetTW > 0 && Number.isFinite(s.targetTW))) {
      refuse('badInput', i, JSON.stringify(s));
    }
    return p;
  });
  const estimates: SizingEstimate[] = [];

  // 1. The planner's cost to this orbit from this site, plus its margin.
  let site;
  try { site = siteById(req.siteId); } catch { return refuse('unknownSite', null, req.siteId); }
  const target = resolveTarget(req.orbit, site, req.launchTime ?? DEFAULT_LAUNCH);
  const { inc } = ascentInclinationFor(target, site);
  const lat = site.latitude * DEG;
  const descending = launchDirection(site, inc).descending;
  const rotationCredit = earthRotationCredit(lat, inertialLaunchAzimuth(lat, inc, descending) ?? Math.PI / 2);
  const cost = ascentCost(target.perigee, target.apogee, rotationCredit);
  const extra = req.extraDvMps ?? 0;
  if (!(Number.isFinite(extra) && extra >= 0)) refuse('badInput', null, `extraDvMps ${extra}`);
  const designDv = cost + ASCENT_MARGIN_REQUIRED + extra;

  // 2. The optimal split, for the payload.
  const stagingStages = req.stages.map((s, i) => ({ ispS: engines[i].ispVac, epsilon: s.epsilon }));
  const staging = optimalStaging(stagingStages, designDv, req.payloadKg);
  if (!staging) return refuse(stagingProblem(stagingStages, designDv, req.payloadKg) ?? 'invalid', null, `${Math.round(designDv)} m/s`);

  // The fairing, chosen before the masses: the first stage lifts it.
  let fairingId: string | null;
  if (req.fairing !== undefined) fairingId = req.fairing;
  else {
    const widest = Math.max(...req.stages.slice(n > 1 ? 1 : 0).map((s) => s.diameterM));
    const fits = FAIRING_PARTS.filter((f) => f.diameter >= widest).sort((a, b) => a.diameter - b.diameter || a.mass - b.mass);
    fairingId = (fits[0] ?? [...FAIRING_PARTS].sort((a, b) => b.diameter - a.diameter)[0]).id;
    estimates.push({ code: 'fairingChosen' });
  }
  let fairingMass = 0;
  if (fairingId !== null) {
    try { fairingMass = fairingPart(fairingId).mass; } catch { return refuse('unknownPart', null, `fairing ${fairingId}`); }
  }
  if (fairingMass > 0 && n > 1) estimates.push({ code: 'splitIgnoresFairing' });

  // 3. The masses, top down, each stage its share exactly.
  const mass: number[] = new Array(n);
  let above = req.payloadKg;
  for (let i = n - 1; i >= 0; i--) {
    const lifted = above + (i === 0 ? fairingMass : 0);
    const ratio = staging.massRatio[i];
    const eps = req.stages[i].epsilon;
    mass[i] = lifted * (ratio - 1) / (1 - ratio * eps);
    above += mass[i];
  }

  // 4. Engines to the target T/W, and 5. lengths from the propellant's volume.
  const stages: Sizing['stages'] = [];
  const design: PartsDesign = {
    id: req.id ?? 'sized', name: req.name ?? 'Sized launcher', sites: [req.siteId],
    stages: [], fairing: fairingId === null ? null : { part: fairingId },
  };
  for (let i = 0; i < n; i++) {
    const s = req.stages[i];
    const e = engines[i];
    let ignition = req.payloadKg;
    for (let j = i; j < n; j++) ignition += mass[j];
    if (i <= 1) ignition += fairingMass;
    const perEngine = i === 0 ? engineThrustSL(engineSpec(e, 1)) : e.thrustVac;
    const count = Math.max(1, Math.ceil((s.targetTW * ignition * G0) / perEngine));
    if (count > PART_LIMITS.engineCount) refuse('tooManyEngines', i, `${count} × ${e.id}`);
    const dryMass = s.epsilon * mass[i];
    const propellantMass = mass[i] - dryMass;
    if (e.mass.kg !== null && count * e.mass.kg >= dryMass) estimates.push({ code: 'enginesOutweighStructure', stage: i });
    const family = e.family as LiquidFamily;
    const length = tankLength(propellantMass, s.diameterM, family, FAMILY_MIXTURE_RATIO[family]) + LENGTH_ALLOWANCE_DIAMETERS * s.diameterM;
    estimates.push({ code: 'lengthFromVolume', stage: i }, { code: 'lengthAllowance', stage: i });
    const restartable = s.restartable ?? i === n - 1;
    if (s.restartable === undefined && i === n - 1) estimates.push({ code: 'lastStageRestartable', stage: i });
    stages.push({ mass: mass[i], dryMass, propellantMass, dv: staging.stageDv[i], engines: count, tw: (count * perEngine) / (ignition * G0), length });
    design.stages.push({
      body: { dryMass, propellantMass, diameter: s.diameterM, length, family },
      engine: { part: e.id, count },
      ...(restartable ? { install: { restartable: true } } : {}),
    });
  }
  let assembled;
  try { assembled = assemble(design); } catch (err) { return refuse('outOfLimits', null, (err as Error).message); }
  return { designDv, ascentCost: cost, rotationCredit, staging, stages, design, spec: assembled.spec, estimates: [...estimates, ...assembled.estimates] };
}
