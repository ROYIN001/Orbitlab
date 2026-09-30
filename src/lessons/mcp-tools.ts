/**
 * The lessons over WebMCP (roadmap E03): an assistant in the browser can list
 * the lessons, open one for the student and read how the flight is being
 * graded, and read the placement test's result — to explain, not to answer:
 * nothing here types an answer or changes a locked setting. DOM-free, like
 * `createMcpTools`. A case lesson (track 6) is listed and opened the same
 * way; its questions are given in English, never their answers.
 */
import { en } from '../i18n/en';
import type { AssessmentResult } from './assessment/score';
import { DOMAINS, isCaseLesson, type CaseLesson, type CatalogLesson, type LessonGrade, type Lesson } from './types';
import type { ProgressData } from './progress';
import { BUILTIN_CASE_LESSONS, BUILTIN_LESSONS, lessonNumber } from './catalog';
import { MEASURES } from './measures';
import { parseLessonFile, type FileIssue } from './lesson-file';
import { statusCounts } from './recheck';
import { runRecheckJob } from './recheck-job';

export interface LessonToolsHost {
  /** the catalogue: built-in lessons and any a teacher's file added */
  catalogue(): CatalogLesson[];
  progress(): ProgressData;
  /** open a lesson (its mission, its mode, its locks); false with a reason when it cannot be */
  startLesson(id: string): { ok: true } | { ok: false; reason: string };
  /** the lesson open now, and its flight's grade so far */
  activeLesson(): { lesson: CatalogLesson; grade: LessonGrade | null; hintsShown: number; awaiting: string[] } | null;
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

/**
 * The six areas as the lessons' `domains` number them, in the placement
 * test's own English words (assess.domain.1–6), so the list an assistant
 * reads cannot drift from the one the student sees.
 */
export const AREAS_TEXT = DOMAINS.map((d) => `${d} ${en[`assess.domain.${d}`].toLowerCase()}`).join(', ');

/** A case lesson's questions, as the English sheet asks them; the grade's expected values are left out. */
function caseCriterionOut(lesson: CaseLesson, grade: LessonGrade | null) {
  return lesson.criteria.map((c) => {
    const g = grade?.criteria.find((x) => x.id === c.id);
    return { id: c.id, kind: c.kind, item: c.item, question: en[`wsc.${lesson.case}.q.${c.item}`] ?? c.item, state: g?.state ?? 'pending', ...(g?.revealed ? { answerShown: true } : {}) };
  });
}

function criterionOut(lesson: CatalogLesson, grade: LessonGrade | null) {
  if (isCaseLesson(lesson)) return caseCriterionOut(lesson, grade);
  return flightCriterionOut(lesson, grade);
}

function flightCriterionOut(lesson: Lesson, grade: LessonGrade | null) {
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
      // the student was shown this answer's value: right, it passes only with help
      ...(g?.revealed ? { answerShown: true } : {}),
      // an answer's expected value is the student's to work out: it is not given here
      value: c.kind === 'answer' ? undefined : g?.value ?? null,
    };
  });
}

const BUILTIN_IDS = new Set<string>([...BUILTIN_LESSONS, ...BUILTIN_CASE_LESSONS].map((l) => l.id));

/**
 * T02: the lessons a re-check is held to — those of the instructor's lesson
 * files given, then any the page's catalogue has from a lesson file opened
 * earlier (a results file carries none of a teacher's own lessons).
 */
function lessonsFor(host: LessonToolsHost, raw: unknown): { lessons: CatalogLesson[]; issues: FileIssue[] } {
  const files = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
  const lessons: CatalogLesson[] = [];
  const issues: FileIssue[] = [];
  for (const file of files) {
    const parsed = parseLessonFile(file, new Set());
    if (!parsed.usable) throw new Error('"lessons" must be lesson files (format "orbitlab.lessons"), as JSON');
    issues.push(...parsed.issues.filter((i) => i.level === 'error'));
    for (const l of parsed.lessons) if (!lessons.some((x) => x.id === l.id)) lessons.push(l);
  }
  for (const l of host.catalogue()) if (!BUILTIN_IDS.has(l.id) && !lessons.some((x) => x.id === l.id)) lessons.push(l);
  return { lessons, issues };
}

export function createLessonTools(host: LessonToolsHost): Tool[] {
  return [
    {
      name: 'list_lessons', title: 'List lessons',
      description: `Roadmap E03: the lessons — training missions with a goal and pass criteria graded automatically — with their number, track, the mode they open in, the areas they exercise (${AREAS_TEXT}), whether they are written yet, and the student's progress (passed: unaided; passedWithHelp: passed on answers the student had been shown). A flight lesson is flown; a case lesson (track 6) is a case from the record worked from its data in the Orbit section.`,
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      execute: () => {
        const progress = host.progress();
        return {
          lessons: host.catalogue().map((l) => ({
            id: l.id, kind: isCaseLesson(l) ? 'case' : 'flight', number: lessonNumber(l), title: l.title.en, track: l.track, mode: l.mode, areas: l.domains, tags: l.tags ?? [],
            written: !l.comingSoon, passed: !!progress.lessons[l.id]?.passed, passedWithHelp: !!progress.lessons[l.id]?.passedWithHelp, attempts: progress.lessons[l.id]?.attempts ?? 0,
          })),
        };
      },
    },
    {
      name: 'start_lesson', title: 'Start a lesson',
      description: 'Open a lesson for the student: its mission is loaded into the setup panel, the app goes to the lesson\'s mode, and the settings the lesson locks are greyed out. Does not launch. For a case lesson (track 6), the Orbit section\'s Real satellites opens at the case\'s tool instead, and the student answers the case sheet\'s questions. Returns the task and the criteria.',
      inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'The lesson id, from list_lessons.' } }, required: ['id'], additionalProperties: false },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
      execute: (input) => {
        const id = record(input).id;
        if (typeof id !== 'string') throw new Error('"id" must be a lesson id from list_lessons');
        const started = host.startLesson(id);
        if (!started.ok) return started;
        const lesson = host.activeLesson()!.lesson;
        const where = isCaseLesson(lesson) ? { kind: 'case', case: lesson.case, section: 'orbit', locked: [] } : { kind: 'flight', section: 'launch', locked: lesson.locked };
        return { ok: true, id: lesson.id, number: lessonNumber(lesson), title: lesson.title.en, task: lesson.brief.en, mode: lesson.mode, ...where, criteria: criterionOut(lesson, null), hints: lesson.hints.length };
      },
    },
    {
      name: 'get_lesson_result', title: 'Read the lesson\'s grade',
      description: 'The lesson open now and how its flight is graded so far: the verdict (open, pass, passedWithHelp — every criterion met, but on an answer the student had been shown with "Show the answers" — or fail), each criterion\'s state (pending, passing, pass, fail) and measured value, the settings the flight did not keep, the answers still awaited and the hints shown. The expected value of an answer is not given: it is the student\'s to work out. A case lesson has no flight: its answers are awaited from the start. Safe with no lesson open.',
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
    {
      name: 'check_results', title: 'Re-check a class\'s results',
      description: 'Roadmap T02, the instructor\'s re-check (the lessons page\'s "Check results" tab): each flight lesson\'s record in the results files given is flown again on this device from the mission it kept, with the commands the student gave at the step boundaries that took them, to the time it was graded at, and graded again. Each record and each of its criteria comes out match, borderline (within the engine tolerance of a bound, so another browser could have decided it either way), differs (edited, another build, or not the lesson the student had) or cannotRefly, with the reason (caseLesson, noLesson, sixDof, incomplete — a record made before the grading time and command journal were kept —, mission, actions, noMission, notReached, error). Also says whether each file\'s checksum holds and which fields an older record lacks. Give the instructor\'s lesson file(s) as "lessons" for their own lessons: results files do not carry them. Six-DOF flights are not re-flown. Nothing is sent anywhere; the result holds only what the files hold and the re-check.',
      inputSchema: {
        type: 'object',
        properties: {
          results: { type: 'array', items: { type: 'object' }, description: 'Results files (format "orbitlab.results"), each as its JSON.' },
          lessons: { description: 'The instructor\'s lesson file (format "orbitlab.lessons") as its JSON, or an array of them.' },
          names: { type: 'array', items: { type: 'string' }, description: 'Optional: the results files\' names, in the same order, for the report.' },
        },
        required: ['results'], additionalProperties: false,
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      execute: async (input) => {
        const i = record(input);
        if (!Array.isArray(i.results) || !i.results.length) throw new Error('"results" must be a list of one or more results files, as JSON');
        const names = Array.isArray(i.names) ? i.names.map((n) => (typeof n === 'string' ? n : null)) : undefined;
        const { lessons, issues } = lessonsFor(host, i.lessons);
        const check = await runRecheckJob({ results: i.results, lessons, ...(names ? { names } : {}) }, new AbortController().signal);
        return { ...check, counts: statusCounts(check), lessonFileIssues: issues.map((x) => `${x.where}: ${x.code}${x.detail ? ` (${x.detail})` : ''}`) };
      },
    },
  ];
}
