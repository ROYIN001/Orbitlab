/**
 * Criteria written in code (roadmap E03), for what the declarative kinds
 * cannot say. A lesson names a hook by id; a teacher's file can name any hook
 * registered here, and one it names that does not exist is reported when the
 * file is read.
 */
import { inclinationCorridor } from '../physics/mission';
import type { CriterionState, LessonFlight } from './types';

export interface HookResult { state: CriterionState; value: number | null }
export type LessonHook = (flight: LessonFlight, params: Record<string, number | string | boolean>, final: boolean) => HookResult;

const decided = (ok: boolean, final: boolean, value: number | null = null): HookResult =>
  ({ state: ok ? (final ? 'pass' : 'passing') : (final ? 'fail' : 'pending'), value });

export const LESSON_HOOKS: Readonly<Record<string, LessonHook>> = {
  /**
   * The crew came home: the escape system's descent module landed, and no
   * event said the crew was lost. `value` is the peak load on the crew from
   * the abort to the landing, g.
   */
  crewSafe(flight, _params, final) {
    const abort = flight.events.find((e) => e.key === 'evt.abort' || e.key === 'evt.abortCommand');
    const landed = flight.events.some((e) => e.key === 'evt.escapeLanded' || e.key === 'evt.abortCrewSafe');
    let peak: number | null = null;
    if (abort) for (const s of flight.telemetry) if (s.t >= abort.t && (peak === null || s.gLoad > peak)) peak = s.gLoad;
    if (landed) return { state: 'pass', value: peak };
    return decided(false, final, peak);
  },
  /**
   * The payload reached an orbit whose perigee clears `minPerigeeKm` (default
   * 150 km): it will stay up, whatever orbit was planned.
   */
  stableOrbit(flight, params, final) {
    const min = typeof params.minPerigeeKm === 'number' ? params.minPerigeeKm : 150;
    const pe = flight.state.elements.periapsisAlt / 1e3;
    const inOrbit = flight.state.status !== 'failed' && flight.state.elements.e < 1 && pe >= min;
    return decided(inOrbit, final, Number.isFinite(pe) ? pe : null);
  },
  /**
   * The site's range safety licenses the target plane: a launch heading
   * inside its corridor reaches it, or one within the 5° a dogleg turns. The
   * simulation flies whatever it is given; this is the licence the setup
   * panel's verdict checks.
   */
  rangeSafe(flight) {
    const ok = inclinationCorridor(flight.site, flight.plan.target.inclination) === 'ok';
    return { state: ok ? 'pass' : 'fail', value: null };
  },
  /**
   * The flight had no satellite navigation: the navigation ran on its
   * inertial unit alone (the lesson's failure the student may not undo).
   */
  gnssOff(flight) {
    const nav = flight.cfg.dynamics?.navigation;
    return { state: nav && nav.gnss === false ? 'pass' : 'fail', value: null };
  },
  /** The structure's bending was modelled: the flight met the mode the notch filter is for. */
  bendingOn(flight) {
    return { state: flight.cfg.dynamics?.flex?.bending ? 'pass' : 'fail', value: null };
  },
};

export const hookExists = (id: string): boolean => Object.prototype.hasOwnProperty.call(LESSON_HOOKS, id);
