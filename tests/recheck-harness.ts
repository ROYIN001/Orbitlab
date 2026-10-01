/**
 * Shared by the re-check tests (roadmap T02; Phase 4 map §4.2) and by
 * scripts/recheck-fixtures.ts, which wrote tests/fixtures/recheck/: a lesson
 * flown LIVE, as the page flies it — an `InlineSession` advanced by frames of
 * random length at a random warp, the picture drawn after each — and graded
 * the way `LessonMode.update` grades it: `gradeShown` at the instant on
 * screen, frozen at the first final grade with that instant and the length
 * of the command journal, the answers typed after and checked against the
 * frozen grade (`regradeAnswers`), and kept with `flightRecord`.
 *
 * So a record made here is what a student's browser would have kept, and the
 * re-check (src/lessons/recheck.ts) has to find it again from the headless
 * loop alone.
 */
import { InlineSession } from '../src/session/session';
import { flightStarted, gradeShown, regradeAnswers, type RevealedAnswers } from '../src/lessons/grader';
import { flightRecord, type LessonRecord } from '../src/lessons/progress';
import { lessonConfig } from '../src/lessons/config';
import type { MissionState } from '../src/config/mission-file';
import type { Lesson, LessonGrade } from '../src/lessons/types';

/** A small seeded generator (mulberry32): the same frames every run. */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LiveOptions {
  /** the student's edits to the lesson's mission (what the lesson leaves unlocked, or not) */
  edit?: (state: MissionState) => void;
  /** frames and warps are drawn from this seed */
  seed: number;
  /** what the student types once the flight has ended, from the frozen grade (whose `expected` values the page never shows) */
  answers?: (frozen: LessonGrade) => Record<string, number>;
  /** commands given at the instant on screen (s of mission time), as the page's buttons give them */
  commands?: ReadonlyArray<{ at: number; give: (session: InlineSession) => void }>;
  /** the expected values the student had been shown before, by criterion id */
  revealed?: RevealedAnswers;
  /** the build the record says (the default: this one's) */
  app?: string;
  /** when the record is kept */
  at?: Date;
  /** longest flight, s of mission time */
  maxT?: number;
  /** fastest warp drawn (the default reaches orbit in a few hundred frames) */
  maxWarp?: number;
}

export interface LiveFlight {
  record: LessonRecord;
  session: InlineSession;
  frozen: LessonGrade;
  frames: number;
}

/** Fly a lesson live and keep its record, as the lessons page would. */
export function flyLessonLive(lesson: Lesson, o: LiveOptions): LiveFlight {
  const session = new InlineSession(lessonConfig(lesson.mission, o.edit));
  const rnd = random(o.seed);
  const maxT = o.maxT ?? 30_000;
  const maxWarp = o.maxWarp ?? 200;
  const pending = [...(o.commands ?? [])].sort((a, b) => a.at - b.at);
  let frozen: LessonGrade | null = null;
  let frozenAt = { clock: 0, actions: 0 };
  let frames = 0;
  while (!frozen) {
    // a frame of 8–50 ms at a warp from 1× to `maxWarp`×, now and then cut short by the budget
    const frame = 0.008 + 0.042 * rnd();
    const warp = 1 + Math.floor(rnd() * maxWarp);
    session.advance(frame * warp, rnd() < 0.05 ? 0 : 1e9);
    session.recorder.recordNow();
    frames++;
    const clock = session.recorder.clock;
    while (pending.length && clock >= pending[0].at) pending.shift()!.give(session);
    const sim = session.sim;
    const grade = gradeShown(lesson, sim, clock, {});
    if (flightStarted(sim) && grade.final) { frozen = grade; frozenAt = { clock, actions: sim.actions.length }; }
    if (clock > maxT) throw new Error(`${lesson.id}: no final grade by T+${maxT} s`);
  }
  const answers = o.answers?.(frozen) ?? {};
  const grade = regradeAnswers(lesson, frozen, answers, o.revealed ?? {});
  const record = flightRecord({
    at: o.at ?? new Date(Date.UTC(2026, 9, 1, 9)), grade, answers, hintsShown: 0, cfg: session.sim.cfg,
    clock: frozenAt.clock, actions: session.sim.actions.slice(0, frozenAt.actions), app: o.app ?? 'test+build',
  });
  return { record, session, frozen, frames };
}

/** The value a criterion of the frozen grade measured (an answer's expected value). */
export function expectedOf(grade: LessonGrade, id: string): number {
  const g = grade.criteria.find((c) => c.id === id);
  const v = g?.expected ?? g?.value;
  if (typeof v !== 'number') throw new Error(`no value for ${id}`);
  return v;
}
