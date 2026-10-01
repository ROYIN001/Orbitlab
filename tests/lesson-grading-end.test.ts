/**
 * A flight lesson is graded on the orbit the flight was in when it ended for
 * grading, however late it is graded (T03 review, 2026-10-01; roadmap E03,
 * T02). A live page grades at the first frame that shows the end, and under
 * time warp that frame comes minutes later, where the osculating orbit has
 * moved on under J₂: measured at this base, a transfer orbit's semi-major
 * axis is +8 km 135 s after insertion and +16 km 300 s after, and the planned
 * 250 × 35 786 km answer to 12.1 passed graded 145–710 s late. The orbit
 * measures now read the state the end event left the flight in
 * (`SimEvent.state`, src/lessons/measures.ts), so:
 *
 * - every event carries the state its step ended in, and the end event's
 *   orbit is the one after the tail-off (to 1 km of a transfer orbit's a, a
 *   bound set after measuring 0.55 km, said where it is used);
 * - headless, a flight coasted on for up to half an hour after its end grades
 *   exactly as it did at its end, on a circle (1.1, 500 km) and on two
 *   ellipses (5.3, Sputnik's 215 × 939 km; 12.1, a 251 × 35 717 km transfer
 *   orbit), and its head has meanwhile moved — a hook that reads the orbit
 *   (stableOrbit, on 5.4's 181 km perigee) too;
 * - live, at a warp that shows the end ten minutes late — on the main thread
 *   and through the physics worker's mirror — the frozen grade is the same,
 *   and the planned transfer orbit fails there as at the end.
 *
 * Tolerance for the grades: none. The same grade means the same numbers, bit
 * for bit: the live flight is the headless one (E1, docs/PHYSICS.md §2n) and
 * the orbit is read from one recorded state. Fixed before the first run.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { lessonConfig } from '../src/lessons/config';
import { flightEnded, gradeLesson, gradeShown, gradingEnd, gradingEndEvent, type LessonAnswers } from '../src/lessons/grader';
import { MEASURES } from '../src/lessons/measures';
import { BUILTIN_LESSONS } from '../src/lessons/catalog';
import { BUNDLED_PACKS, packLessons, packPath, readPackText } from '../src/lessons/packs';
import { InlineSession, WorkerSession, type SessionWorker } from '../src/session/session';
import { SimCore } from '../src/session/core';
import type { FromCore, ToCore } from '../src/session/protocol';
import type { MissionState } from '../src/config/mission-file';
import { isFlightLesson, type Lesson, type LessonGrade, type MeasureId } from '../src/lessons/types';

const FILES = import.meta.glob('../public/lessons/packs/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const PACK_LESSONS = packLessons(BUNDLED_PACKS.map((id) => readPackText(FILES[`../public/${packPath(id)}`], packPath(id))!));

const lesson = (id: string): Lesson => {
  const l = [...BUILTIN_LESSONS, ...PACK_LESSONS].find((x) => x.id === id);
  if (!l || !isFlightLesson(l)) throw new Error(`no flight lesson ${id}`);
  return l;
};

/** The student's edits each lesson's worked solution makes (5.3: PS-1's 83.6 kg, tests/lessons-history.test.ts). */
const EDITS: Record<string, (s: MissionState) => void> = {
  'adv-history': (s) => { s.payloadMass = 83.6; },
  'adv-vostok': (s) => { s.orbit = { ...s.orbit, apogee: 327e3 }; },
};
const config = (l: Lesson) => lessonConfig(l.mission, EDITS[l.id]);

/** Fly a lesson's mission until it ends for grading, as tests/lessons.test.ts does. */
function fly(l: Lesson): Simulation {
  const sim = new Simulation(config(l), { headless: true });
  let guard = 0;
  while (!flightEnded(l, sim) && sim.state.t < 50_000 && guard++ < 2_000_000) sim.step(sim.suggestedDt());
  if (!flightEnded(l, sim)) throw new Error(`${l.id} did not end`);
  return sim;
}

/** The orbit measures and answers a lesson grades. */
const orbitIds = (l: Lesson): string[] => l.criteria.filter((c) => (c.kind === 'measure' || c.kind === 'answer') && c.measure.startsWith('orbit.')).map((c) => c.id);
const measureOf = (l: Lesson, id: string): MeasureId => {
  const c = l.criteria.find((x) => x.id === id)!;
  if (c.kind !== 'measure' && c.kind !== 'answer') throw new Error(id);
  return c.measure;
};

/** The answers worked exactly from the flight's end, as a student who read the event log well would type them. */
function endAnswers(l: Lesson, sim: Simulation): LessonAnswers {
  const end = gradingEndEvent(l, sim);
  const out: Record<string, number> = {};
  for (const c of l.criteria) if (c.kind === 'answer') out[c.id] = MEASURES[c.measure].read(sim, end?.t, end?.state)!;
  return out;
}

/** A grade's decisions and numbers, without the time it was taken at. */
const decided = (g: LessonGrade) => ({ final: g.final, verdict: g.verdict, criteria: g.criteria, lockBroken: g.lockBroken });

/** The planned 250 × 35 786 km transfer orbit's a, e and T, as a student who ignored the event log would type them. */
const MU = 398600.4418, R = 6378.137;
const planned = (() => {
  const rp = R + 250, ra = R + 35786, a = (rp + ra) / 2;
  return { a, e: (ra - rp) / (ra + rp), period: 2 * Math.PI * Math.sqrt(a ** 3 / MU) / 60 };
})();

const CASES = [
  // [lesson, what it is]
  ['orbit-first', 'a 500 km circle (1.1)'],
  ['adv-history', 'Sputnik\'s 215 × 939 km ellipse (5.3)'],
  ['ipst-a-kepler3', 'a transfer orbit (12.1)'],
] as const;

describe('the event log says where the flight was (SimEvent.state)', () => {
  it('every event of a flight carries the state its step ended in, the end event its own instant\'s', { timeout: 120_000 }, () => {
    const l = lesson('ipst-a-kepler3');
    const sim = fly(l);
    for (const e of sim.events) {
      expect(e.state, e.key).toBeDefined();
      // stamped when the step that logged it ends (max-Q is dated back to its peak, so later)
      expect(e.state!.t, e.key).toBeGreaterThanOrEqual(e.t);
    }
    const end = gradingEndEvent(l, sim)!;
    expect(end.key).toBe('evt.targetOrbit');
    expect(end.state!.t).toBe(end.t);
    // With the tail-off still to come added, the end's orbit is the one after the tail-off: within 1 km
    // of a over 24 362 km (a bound set after measuring 0.55 km; the rest is the head's 1.25 s on, and how
    // the tail-off's impulse is spread along the arc rather than given at once).
    const head = MEASURES['orbit.semiMajorAxis'].read(sim)!;
    expect(Math.abs(MEASURES['orbit.semiMajorAxis'].read(sim, end.t, end.state)! - head)).toBeLessThan(1);
  });
});

describe('a flight graded after its end, headless', () => {
  for (const [id, what] of CASES) {
    it(`${what}: coasted on for up to 30 min, it grades as at its end, while its head moves on`, { timeout: 120_000 }, () => {
      const l = lesson(id);
      const sim = fly(l);
      const answers = endAnswers(l, sim);
      const atEnd = gradeLesson(l, sim, answers);
      expect(atEnd.final).toBe(true);
      const t0 = sim.state.t;
      const ids = orbitIds(l);
      expect(ids.length, id).toBeGreaterThan(0);
      const headAtEnd = Object.fromEntries(ids.map((c) => [c, MEASURES[measureOf(l, c)].read(sim)]));
      let moved = 0;
      for (const lag of [60, 300, 600, 1800]) {
        while (sim.state.t < t0 + lag) sim.step(Math.min(sim.suggestedDt(), t0 + lag - sim.state.t + 1e-9));
        expect(decided(gradeLesson(l, sim, answers)), `${id} +${lag} s`).toEqual(decided(atEnd));
        for (const c of ids) if (MEASURES[measureOf(l, c)].read(sim) !== headAtEnd[c]) moved++;
      }
      // the test bites: read at the head, the orbit is not the one graded
      expect(moved, id).toBeGreaterThan(0);
    });
  }

  it('a hook that reads the orbit (stableOrbit) reads it at the end too: 5.4\'s 181 km perigee over a 180 km floor', { timeout: 120_000 }, () => {
    const base = lesson('adv-vostok');
    const l: Lesson = { ...base, criteria: [...base.criteria, { id: 'stays', kind: 'hook', hook: 'stableOrbit', params: { minPerigeeKm: 180 } }] };
    const sim = fly(l);
    const answers = endAnswers(l, sim);
    const atEnd = gradeLesson(l, sim, answers);
    expect(atEnd.verdict).toBe('pass');
    const t0 = sim.state.t;
    while (sim.state.t < t0 + 600) sim.step(Math.min(sim.suggestedDt(), t0 + 600 - sim.state.t + 1e-9));
    // the head's osculating perigee has sunk under the floor (178.7 km measured), the end's has not
    expect(sim.state.elements.periapsisAlt / 1e3).toBeLessThan(180);
    expect(decided(gradeLesson(l, sim, answers))).toEqual(decided(atEnd));
  });

  it('12.1: the transfer orbit\'s head moves by more than the 10 km the research allows a, and the planned orbit still fails', { timeout: 120_000 }, () => {
    const l = lesson('ipst-a-kepler3');
    const sim = fly(l);
    const answers = endAnswers(l, sim);
    const end = gradingEndEvent(l, sim)!;
    const aEnd = MEASURES['orbit.semiMajorAxis'].read(sim, end.t, end.state)!;
    const t0 = sim.state.t;
    let maxDrift = 0;
    for (let lag = 5; lag <= 900; lag += 5) {
      while (sim.state.t < t0 + lag) sim.step(Math.min(sim.suggestedDt(), t0 + lag - sim.state.t + 1e-9));
      maxDrift = Math.max(maxDrift, Math.abs(MEASURES['orbit.semiMajorAxis'].read(sim)! - aEnd));
      const g = gradeLesson(l, sim, { ...answers, ...planned });
      expect(g.verdict, `+${lag} s`).toBe('fail');
      expect(g.criteria.find((c) => c.id === 'a')!.expected, `+${lag} s`).toBe(aEnd);
    }
    expect(maxDrift).toBeGreaterThan(10);
  });
});

/** A `SimCore` behind a transport that clones like `postMessage` (tests/session.test.ts). */
class InProcessWorker implements SessionWorker {
  onmessage: ((event: MessageEvent<FromCore>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
  private readonly replies: FromCore[] = [];
  private readonly continuations: Array<() => void> = [];
  private readonly core = new SimCore({
    post: (message) => this.replies.push(structuredClone(message)),
    later: (fn) => this.continuations.push(fn),
    now: () => performance.now(),
  });
  postMessage(message: ToCore): void { this.core.handle(structuredClone(message)); }
  flush(): void {
    while (this.replies.length > 0 || this.continuations.length > 0) {
      while (this.replies.length > 0) this.onmessage?.({ data: this.replies.shift()! } as MessageEvent<FromCore>);
      this.continuations.shift()?.();
    }
  }
  terminate(): void {}
}

/**
 * Fly a lesson live, as the page does, in frames of up to 20 s of mission time
 * to `before` s ahead of its end, then one frame of `lag` s, and grade what the
 * picture shows then (`gradeShown`, as `LessonMode.update`).
 */
function gradeLive(l: Lesson, end: number, lag: number, answers: LessonAnswers, worker: boolean): { grade: LessonGrade; clock: number } {
  const transport = worker ? new InProcessWorker() : null;
  const session = transport
    ? new WorkerSession(config(l), transport, 1, (m) => { throw new Error(m); })
    : new InlineSession(config(l));
  const frame = (seconds: number) => {
    session.advance(seconds, 1e9);
    transport?.flush();
    session.recorder.recordNow();
  };
  transport?.flush();
  const before = 5;
  while (session.recorder.clock < end - before) frame(Math.min(20, end - before - session.recorder.clock + 1e-6));
  const clock0 = session.recorder.clock;
  expect(gradeShown(l, session.sim, clock0, answers).final).toBe(false);
  frame(lag);
  const clock = session.recorder.clock;
  return { grade: gradeShown(l, session.sim, clock, answers), clock };
}

describe('a flight graded live, ten minutes after its end under warp', () => {
  for (const [id, what] of [CASES[0], CASES[2]]) {
    for (const worker of [false, true]) {
      it(`${what}, ${worker ? 'through the physics worker' : 'on the main thread'}: the first final grade is the end's`, { timeout: 180_000 }, () => {
        const l = lesson(id);
        const sim = fly(l);
        const answers = endAnswers(l, sim);
        const atEnd = gradeLesson(l, sim, answers);
        const end = gradingEnd(l, sim)!;
        const live = gradeLive(l, end, 600, answers, worker);
        expect(live.clock - end).toBeGreaterThan(590);
        expect(decided(live.grade)).toEqual(decided(atEnd));
        expect(live.grade.verdict).toBe('pass');
        if (id === 'ipst-a-kepler3') {
          // passed 145–710 s late before this fix
          expect(gradeLive(l, end, 300, { ...answers, ...planned }, worker).grade.verdict).toBe('fail');
        }
      });
    }
  }
});
