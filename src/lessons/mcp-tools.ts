/**
 * The lessons over WebMCP (roadmap E03): an assistant in the browser can list
 * the lessons, open one for the student and read how the flight is being
 * graded, and read the placement test's result — to explain, not to answer:
 * nothing here types an answer or changes a locked setting. DOM-free, like
 * `createMcpTools`.
 */
import type { AssessmentResult } from './assessment/score';
import type { LessonGrade, Lesson } from './types';
import type { ProgressData } from './progress';
import { lessonNumber } from './catalog';
import { MEASURES } from './measures';

export interface LessonToolsHost {
  /** the catalogue: built-in lessons and any a teacher's file added */
  catalogue(): Lesson[];
  progress(): ProgressData;
  /** open a lesson (its mission, its mode, its locks); false with a reason when it cannot be */
  startLesson(id: string): { ok: true } | { ok: false; reason: string };
  /** the lesson open now, and its flight's grade so far */
  activeLesson(): { lesson: Lesson; grade: LessonGrade | null; hintsShown: number; awaiting: string[] } | null;
  /** the latest finished placement test or post-test, scored */
  assessmentResult(): { kind: string; finishedAt?: string; result: AssessmentResult } | null;
}

interface Tool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: Record<string, boolean>;
  execute: (input: unknown) => unknown;
}

const record = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});

function criterionOut(lesson: Lesson, grade: LessonGrade | null) {
  return lesson.criteria.map((c) => {
    const g = grade?.criteria.find((x) => x.id === c.id);
    const unit = c.kind === 'measure' || c.kind === 'answer' ? MEASURES[c.measure].unit : undefined;
    const bound = c.kind === 'measure' ? { min: c.min ?? null, max: c.max ?? null, target: c.target ?? null, tol: c.tol ?? null } : undefined;
    return {
      id: c.id, kind: c.kind,
      ...(c.kind === 'measure' || c.kind === 'answer' ? { measure: c.measure, unit } : {}),
      ...(c.kind === 'outcome' ? { outcome: c.is } : {}),
      ...(c.kind === 'event' ? { event: c.key, mustHappen: c.present } : {}),
      ...(c.kind === 'answer' ? { question: c.prompt.en } : {}),
      ...(bound ? { bound } : {}),
      state: g?.state ?? 'pending',
      // an answer's expected value is the student's to work out: it is not given here
      value: c.kind === 'answer' ? undefined : g?.value ?? null,
    };
  });
}

export function createLessonTools(host: LessonToolsHost): Tool[] {
  return [
    {
      name: 'list_lessons', title: 'List lessons',
      description: 'Roadmap E03: the lessons — training missions with a goal and pass criteria graded automatically — with their number, track, the mode they open in, the areas they exercise (1 orbital mechanics, 2 rocket performance, 3 guidance and navigation, 4 attitude control, 5 failures and safety, 6 basics), whether they are written yet, and the student\'s progress.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      execute: () => {
        const progress = host.progress();
        return {
          lessons: host.catalogue().map((l) => ({
            id: l.id, number: lessonNumber(l), title: l.title.en, track: l.track, mode: l.mode, areas: l.domains, tags: l.tags ?? [],
            written: !l.comingSoon, passed: !!progress.lessons[l.id]?.passed, attempts: progress.lessons[l.id]?.attempts ?? 0,
          })),
        };
      },
    },
    {
      name: 'start_lesson', title: 'Start a lesson',
      description: 'Open a lesson for the student: its mission is loaded into the setup panel, the app goes to the lesson\'s mode, and the settings the lesson locks are greyed out. Does not launch. Returns the task and the criteria.',
      inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'The lesson id, from list_lessons.' } }, required: ['id'], additionalProperties: false },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
      execute: (input) => {
        const id = record(input).id;
        if (typeof id !== 'string') throw new Error('"id" must be a lesson id from list_lessons');
        const started = host.startLesson(id);
        if (!started.ok) return started;
        const lesson = host.activeLesson()!.lesson;
        return { ok: true, id: lesson.id, number: lessonNumber(lesson), title: lesson.title.en, task: lesson.brief.en, mode: lesson.mode, locked: lesson.locked, criteria: criterionOut(lesson, null), hints: lesson.hints.length };
      },
    },
    {
      name: 'get_lesson_result', title: 'Read the lesson\'s grade',
      description: 'The lesson open now and how its flight is graded so far: each criterion\'s state (pending, passing, pass, fail) and measured value, the settings the flight did not keep, the answers still awaited and the hints shown. The expected value of an answer is not given: it is the student\'s to work out. Safe with no lesson open.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      execute: () => {
        const active = host.activeLesson();
        if (!active) return { active: false };
        const { lesson, grade } = active;
        return {
          active: true, id: lesson.id, number: lessonNumber(lesson), title: lesson.title.en,
          flightEnded: grade?.final ?? false, verdict: grade?.verdict ?? 'open', criteria: criterionOut(lesson, grade),
          lockBroken: grade?.lockBroken ?? [], awaitingAnswers: active.awaiting, hintsShown: active.hintsShown,
        };
      },
    },
    {
      name: 'get_assessment_result', title: 'Read the placement test\'s result',
      description: 'The student\'s latest finished placement test (or post-test): the score in each area and its level, the misconceptions (wrong answers the student was sure of), the advice for each lesson (skip, do, review) and the recommended lesson to start at. Safe when no test has been taken.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      execute: () => {
        const r = host.assessmentResult();
        if (!r) return { taken: false };
        return {
          taken: true, kind: r.kind, finishedAt: r.finishedAt ?? null, percent: r.result.percent,
          areas: r.result.domains, start: r.result.start, startArea: r.result.startDomain, advice: r.result.advice,
          misconceptions: r.result.questions.filter((q) => q.misconception).map((q) => ({ question: q.id, area: q.domain, belief: q.misconceptionText?.en ?? null })),
        };
      },
    },
  ];
}
