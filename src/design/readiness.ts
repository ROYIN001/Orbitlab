/** The flight readiness review with verdict text in the reader's current language. */
import type { VehicleSpec } from '../types';
import type { MissionPlan } from '../physics/mission';
import type { InsertionProbe } from '../physics/autotune';
import { localizeVerdict, type Feasibility } from '../config/verdict';
import {
  assessReadiness, assessReadinessVerdict, type ReadinessAssessment, type ReadinessMission,
} from './readiness-core';

export type { ReadinessItem, ReadinessLevel, ReadinessMission, ReadinessStep } from './readiness-core';

export interface Readiness extends Omit<ReadinessAssessment, 'verdict'> {
  verdict: Feasibility | null;
}

/** Localize the worker's result without running the review or insertion probe again. */
export function localizeReadiness(assessment: ReadinessAssessment): Readiness {
  return { ...assessment, verdict: assessment.verdict ? localizeVerdict(assessment.verdict) : null };
}

/** The cheap verdict-only refresh used when the UI's language changes. */
export function readinessVerdict(
  spec: VehicleSpec, mission: ReadinessMission, plan: MissionPlan | null, insertion: InsertionProbe | null,
): Feasibility {
  return localizeVerdict(assessReadinessVerdict(spec, mission, plan, insertion));
}

/** Review a vehicle for a mission and present the same result as the setup panel. */
export function readiness(spec: VehicleSpec, mission: ReadinessMission): Readiness {
  return localizeReadiness(assessReadiness(spec, mission));
}
