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

/** The setup field to show for a result, or null when no single setting answers it. */
export function resultSetting(cause: ResultCause, ctx: ResultSettingContext): string | null {
  if (cause === 'target') return null;
  const fired = ctx.failureArmed && ctx.events.some((e) => FAILURE_EVENTS.has(e.key) && e.t <= ctx.outcomeTime + 1e-6);
  if (fired) return 'setup.failureMode';
  return CAUSE_FIELD[cause] ?? null;
}
