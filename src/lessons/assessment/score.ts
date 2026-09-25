/**
 * Scoring a placement test (roadmap E03): a score per area, the level it
 * shows, the misconceptions (a wrong answer the student was sure of), and
 * from those a recommendation for every lesson — skip it, do it, go over it
 * again — and the lesson to start at. Every lesson stays open whatever the
 * recommendation says.
 */
import { DOMAINS, type Domain, type LessonMeta, type LocalText } from '../types';
import { evaluate } from './expression';
import type { Answer, AssessmentAttempt, ChoiceQuestion, PreparedQuestion, Question } from './types';

export const LEVEL_WEIGHT = { 1: 1, 2: 1.5, 3: 2 } as const;
/** a correct answer the student called a guess counts half */
export const GUESS_CREDIT = 0.5;

export type DomainLevel = 'beginner' | 'basic' | 'strong';
export type LessonAdvice = 'skip' | 'do' | 'review';

/**
 * Which areas an area builds on: the recommendation starts at a weak area
 * only once what it rests on is there.
 */
export const DOMAIN_PREREQUISITES: Readonly<Record<Domain, readonly Domain[]>> = {
  6: [], 1: [6], 2: [6], 3: [1, 2], 4: [2], 5: [1, 2],
};

export interface QuestionResult {
  id: string;
  domain: Domain;
  level: 1 | 2 | 3;
  skill: string;
  correct: boolean;
  /** 0, a half for a lucky guess, or 1 */
  credit: number;
  unknown: boolean;
  /** wrong, and sure of it, on a question of understanding */
  misconception: boolean;
  /** what the wrong answer suggests the student believes */
  misconceptionText?: LocalText;
  /** the number the answer should have been (numeric) */
  expected?: number;
}

export interface DomainScore {
  domain: Domain;
  /** 0–100, weighted by level */
  percent: number;
  level: DomainLevel;
  asked: number;
  correct: number;
  misconceptions: number;
}

export interface AssessmentResult {
  percent: number;
  domains: DomainScore[];
  questions: QuestionResult[];
  advice: Record<string, LessonAdvice>;
  /** the lesson to start at, or null when there is nothing to recommend */
  start: string | null;
  /** the area the start was chosen for */
  startDomain: Domain | null;
}

/** The value a numeric question expects for the numbers this student drew. */
export function numericExpected(q: Question, prepared: PreparedQuestion): number | null {
  if (q.type !== 'numeric') return null;
  const v = evaluate(q.answer, prepared.values ?? {});
  return Number.isFinite(v) ? v : null;
}

export function isCorrect(q: Question, prepared: PreparedQuestion, answer: Answer | undefined): boolean {
  if (!answer || answer.value === null || answer.skipped) return false;
  switch (q.type) {
    case 'choice': return typeof answer.value === 'number' && !!q.options[answer.value]?.correct;
    case 'vehicle': return answer.value === prepared.vehicle;
    case 'numeric': {
      const expected = numericExpected(q, prepared);
      const typed = typeof answer.value === 'number' ? answer.value : Number(answer.value);
      return expected !== null && Number.isFinite(typed) && Math.abs(typed - expected) <= Math.abs(expected) * q.tolPct / 100 + 1e-9;
    }
  }
}

export function gradeQuestion(q: Question, prepared: PreparedQuestion, answer: Answer | undefined): QuestionResult {
  const correct = isCorrect(q, prepared, answer);
  const unknown = !answer || answer.value === null || !!answer.skipped;
  const misconception = !correct && !unknown && q.kind === 'understanding' && answer?.confidence === 'sure';
  const credit = correct ? (answer?.confidence === 'guess' ? GUESS_CREDIT : 1) : 0;
  const option = q.type === 'choice' && typeof answer?.value === 'number' ? (q as ChoiceQuestion).options[answer.value] : undefined;
  const expected = numericExpected(q, prepared);
  return {
    id: q.id, domain: q.domain, level: q.level, skill: q.skill, correct, credit, unknown, misconception,
    ...(misconception && option?.misconception ? { misconceptionText: option.misconception } : {}),
    ...(expected !== null ? { expected } : {}),
  };
}

export function domainLevel(percent: number, misconceptions: number): DomainLevel {
  if (percent >= 80 && misconceptions === 0) return 'strong';
  if (percent >= 50) return 'basic';
  return 'beginner';
}

/** The lesson catalogue's order: by track, then by place in the track. */
const byOrder = (a: LessonMeta, b: LessonMeta): number => a.track - b.track || a.order - b.order;

export function scoreAttempt(attempt: AssessmentAttempt, bank: readonly Question[], lessons: readonly LessonMeta[]): AssessmentResult {
  const byId = new Map(bank.map((q) => [q.id, q]));
  const answers = new Map(attempt.answers.map((a) => [a.id, a]));
  const questions: QuestionResult[] = [];
  for (const prepared of attempt.questions) {
    const q = byId.get(prepared.id);
    if (q) questions.push(gradeQuestion(q, prepared, answers.get(prepared.id)));
  }
  const domains: DomainScore[] = DOMAINS.map((domain) => {
    const own = questions.filter((r) => r.domain === domain);
    const weight = own.reduce((s, r) => s + LEVEL_WEIGHT[r.level], 0);
    const got = own.reduce((s, r) => s + r.credit * LEVEL_WEIGHT[r.level], 0);
    const percent = weight > 0 ? Math.round((got / weight) * 100) : 0;
    const misconceptions = own.filter((r) => r.misconception).length;
    return { domain, percent, level: domainLevel(percent, misconceptions), asked: own.length, correct: own.filter((r) => r.correct).length, misconceptions };
  });
  const totalWeight = questions.reduce((s, r) => s + LEVEL_WEIGHT[r.level], 0);
  const percent = totalWeight > 0 ? Math.round(questions.reduce((s, r) => s + r.credit * LEVEL_WEIGHT[r.level], 0) / totalWeight * 100) : 0;
  const levelOf = new Map(domains.map((d) => [d.domain, d.level]));

  // A lesson a misunderstood question points at is gone over again; one whose
  // every area is strong can be skipped.
  const flagged = new Set<string>();
  for (const r of questions) if (r.misconception || (!r.correct && r.level === 1)) for (const id of byId.get(r.id)?.lessons ?? []) flagged.add(id);
  const advice: Record<string, LessonAdvice> = {};
  for (const lesson of lessons) {
    const levels = lesson.domains.map((d) => levelOf.get(d) ?? 'beginner');
    advice[lesson.id] = flagged.has(lesson.id) || levels.includes('beginner') ? 'review'
      : levels.every((l) => l === 'strong') ? 'skip' : 'do';
  }

  // Start at the weakest area whose foundations are there; a missing
  // foundation comes first.
  const rank: Record<DomainLevel, number> = { beginner: 0, basic: 1, strong: 2 };
  const pct = new Map(domains.map((d) => [d.domain, d.percent]));
  const foundation = (d: Domain, seen = new Set<Domain>()): Domain => {
    seen.add(d);
    for (const p of DOMAIN_PREREQUISITES[d]) if (!seen.has(p) && levelOf.get(p) === 'beginner') return foundation(p, seen);
    return d;
  };
  const weakest = [...DOMAINS].filter((d) => levelOf.get(d) !== 'strong')
    .sort((a, b) => rank[levelOf.get(a)!] - rank[levelOf.get(b)!] || pct.get(a)! - pct.get(b)! || DOMAIN_ORDER_INDEX[a] - DOMAIN_ORDER_INDEX[b])[0];
  const startDomain = weakest === undefined ? null : foundation(weakest);
  // A lesson still to be written can be the start: the catalogue says it is coming.
  const ordered = [...lessons].sort(byOrder);
  // the basics have no lessons of their own: the first lesson of all is where they are practised
  // a lesson that is chiefly about the area comes before one that touches it
  const start = startDomain === null ? null
    : (ordered.find((l) => l.domains[0] === startDomain && advice[l.id] !== 'skip')
      ?? ordered.find((l) => l.domains.includes(startDomain) && advice[l.id] !== 'skip') ?? ordered[0] ?? null)?.id ?? null;
  return { percent, domains, questions, advice, start, startDomain };
}

const DOMAIN_ORDER_INDEX: Record<Domain, number> = { 6: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
