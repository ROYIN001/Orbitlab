/**
 * The lifetime analysis (P07) run here and now, for a caller that is already
 * off the main thread or in Node: the instructor's re-check of a design
 * lesson's record (roadmap T02, src/lessons/recheck.ts, in its own worker),
 * which flies the very request the satellite bench and the design lesson
 * hand the lifetime worker (`designLifetimeRequest`,
 * src/design/design-lesson-key.ts) — the same `propagate`, so the same
 * answer on the same engine. src/lessons may not import the propagator
 * (tests/propagator.test.ts); src/orbit may, so the one call lives here.
 */
import { propagate } from '../physics/propagator/propagate';
import type { LifetimeRequest } from '../physics/lifetime-job';

/** The run's lifetime, s from its start; null when the satellite is still up at its end. */
export function lifetimeNow(req: LifetimeRequest): number | null {
  return propagate(req.r0, req.v0, req.jd0, req.options).lifetime;
}
