/**
 * R3.5: from a flight's result to the setting worth looking at.
 *
 * `assessMissionResult` already decides the cause as a type (`ResultCause`),
 * so the way back to the setup is a lookup on that type and on recorded
 * events — never a reading of the translated sentence. The answer is a setup
 * field's key (the dictionary key the panel registers the control under,
 * `data-field`); the panel shows that field. Nothing is changed for the user:
 * the flight that was flown keeps its configuration, which stays read-only
 * until a new mission is started.
 *
 * Only evidence leads anywhere. A failure armed in the setup that fired before
 * the outcome points at that failure, whatever the outcome; otherwise a cause
 * one setting answers points at it. Where nothing does — the target reached, a
 * flight that simply did not complete, a pointing timeout, a burn that could
 * not be predicted — there is no action rather than a guess.
 */
import type { ResultCause } from './result-content';

/** Causes a single setting answers, and that setting. */
const CAUSE_FIELD: Partial<Record<ResultCause, string>> = {
  // the plane reached but at the wrong time: the launch time (or the node it was set to)
  window: 'setup.launchTime',
  // the orbit's size or shape
  shape: 'setup.perigee',
  inclination: 'setup.inclination',
  // ran its tanks dry, or never left the pad: the load it carried
  fuel: 'setup.payloadMass',
  liftoff: 'setup.payloadMass',
};

/** Events an injected failure records when it strikes (src/physics: the failure modes of `FailureConfig`). */
export const FAILURE_EVENTS: ReadonlySet<string> = new Set([
  'evt.engineOut', 'evt.thrustLoss', 'evt.prematureSep', 'evt.fairingStuck', 'evt.stagingFailure',
  'evt.boosterCollision', 'evt.padFire', 'evt.rangeSafety', 'evt.ftsCommanded',
]);

export interface ResultSettingContext {
  /** the flight carried a failure from the setup */
  failureArmed: boolean;
  /** recorded events up to the outcome */
  events: readonly { key: string; t: number }[];
  /** mission time the outcome was decided at */
  outcomeTime: number;
}

/** Whether a failure armed in the setup struck before the outcome. */
export function failureFired(ctx: ResultSettingContext): boolean {
  return ctx.failureArmed && ctx.events.some((e) => FAILURE_EVENTS.has(e.key) && e.t <= ctx.outcomeTime + 1e-6);
}

/** The setup field to show for a result, or null when no single setting answers it. */
export function resultSetting(cause: ResultCause, ctx: ResultSettingContext): string | null {
  if (cause === 'target') return null;
  if (failureFired(ctx)) return 'setup.failureMode';
  return CAUSE_FIELD[cause] ?? null;
}

/**
 * R3.5: a change to try next, shown as before → after and applied only when
 * the user presses for it — to a new mission, so the flight that was flown
 * keeps its configuration. Each is backed by a figure the app already holds,
 * never invented:
 *
 * - a failure armed in the setup that struck: the nominal flight;
 * - out of propellant or never off the pad, carrying more than the vehicle's
 *   published rating for the orbit's class: that rating;
 * - in the right orbit but the wrong plane: the launch window nearest the
 *   time flown (`launchWindows`, the panel's own).
 *
 * Anything else — a payload within its rating that still ran dry, an orbit
 * with no plane to aim at — has no suggestion: the setting is shown instead.
 */
export type ResultSuggestion =
  | { field: 'setup.failureMode'; before: string; after: 'none' }
  | { field: 'setup.payloadMass'; before: number; after: number }
  | { field: 'setup.launchTime'; before: Date; after: Date };

export interface SuggestionContext extends ResultSettingContext {
  /** the mode flown */
  failureMode: string;
  /** kg flown */
  payloadMass: number;
  /** the vehicle's published rating for the orbit's class, kg; null when it has none */
  ratedPayload: number | null;
  launchTime: Date;
  /** the launch window nearest the time flown, worked out only when asked for; null when the orbit has no plane to aim at */
  nearestWindow: () => Date | null;
}

export function resultSuggestion(cause: ResultCause, ctx: SuggestionContext): ResultSuggestion | null {
  if (cause === 'target') return null;
  if (failureFired(ctx)) return { field: 'setup.failureMode', before: ctx.failureMode, after: 'none' };
  if ((cause === 'fuel' || cause === 'liftoff') && ctx.ratedPayload !== null && ctx.ratedPayload > 0
    && ctx.payloadMass > ctx.ratedPayload + 0.5) {
    return { field: 'setup.payloadMass', before: ctx.payloadMass, after: Math.floor(ctx.ratedPayload) };
  }
  if (cause === 'window') {
    const after = ctx.nearestWindow();
    // a window within a minute of the time flown is not a different time to try
    if (after && Math.abs(after.getTime() - ctx.launchTime.getTime()) > 60_000) return { field: 'setup.launchTime', before: ctx.launchTime, after };
  }
  return null;
}
