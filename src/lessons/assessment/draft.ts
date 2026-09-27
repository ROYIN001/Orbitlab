/**
 * The answer a student is still putting together on a placement question,
 * kept apart from the page (audit 2026-09-27 A7). The page is drawn from it
 * and writes every change back to it, so drawing the question again — in a
 * new language — shows the same choices, the same half-typed number, the same
 * confidence and puts the focus back where it was. It holds indices, vehicle
 * ids and the typed text, never a label, so nothing in it depends on the
 * language. Nothing here touches the attempt: an answer is recorded only when
 * the student goes on (`draftAnswer`), and the draft is then dropped.
 */
import type { Answer, Confidence, Question } from './types';

export interface QuestionDraft {
  /** choice: the option index; vehicle: the vehicle id */
  picked?: number | string;
  /** multi: the option indices chosen, in the order clicked */
  chosen?: number[];
  /** order: the item indices in the order put */
  put?: number[];
  /** numeric: the text as typed, finished or not */
  typed?: string;
  /** "I don't know" chosen */
  dontKnow?: boolean;
  confidence?: Confidence;
  /** the control that last had the focus (a `data-focus` key) and, in the number box, the caret */
  focus?: string;
  caret?: [number, number];
}

/** The drafts of one test, by question id. */
export class DraftBook {
  private readonly drafts = new Map<string, QuestionDraft>();

  /** The question's draft, created empty the first time it is asked for. */
  get(id: string): QuestionDraft {
    let d = this.drafts.get(id);
    if (!d) { d = {}; this.drafts.set(id, d); }
    return d;
  }

  has(id: string): boolean { return this.drafts.has(id); }

  clear(id: string): void { this.drafts.delete(id); }

  clearAll(): void { this.drafts.clear(); }
}

/** A number as typed: a comma may stand for the decimal point; blank or not a number is undefined. */
export function parseTyped(text: string): number | undefined {
  const v = Number(text.replace(',', '.'));
  return text.trim() && Number.isFinite(v) ? v : undefined;
}

// ─── changes the student makes ─────────────────────────────────────────────

/** A choice or a vehicle picked. */
export function pick(d: QuestionDraft, value: number | string): void {
  d.picked = value;
  d.dontKnow = false;
}

/** A multi option clicked: on if it was off, off if it was on. */
export function toggleChoice(d: QuestionDraft, i: number): void {
  const chosen = d.chosen ?? [];
  d.chosen = chosen.includes(i) ? chosen.filter((x) => x !== i) : [...chosen, i];
  d.dontKnow = false;
}

/** An order item clicked: put next, or taken back if it was already put. */
export function toggleItem(d: QuestionDraft, i: number): void {
  const put = d.put ?? [];
  d.put = put.includes(i) ? put.filter((x) => x !== i) : [...put, i];
  d.dontKnow = false;
}

export function typeNumber(d: QuestionDraft, text: string): void {
  d.typed = text;
  d.dontKnow = false;
}

/** "I don't know": empties whatever was chosen, put or typed. */
export function dontKnow(d: QuestionDraft): void {
  d.picked = undefined;
  d.chosen = [];
  d.put = [];
  d.typed = '';
  d.dontKnow = true;
}

export function setConfidence(d: QuestionDraft, c: Confidence): void {
  d.confidence = c;
}

// ─── what the draft amounts to ─────────────────────────────────────────────

/**
 * The value the draft would record, as `Answer.value` holds it: null for
 * "I don't know", undefined while there is nothing to record yet (a multi with
 * nothing chosen, an order not put in full, a number not finished).
 */
export function draftValue(q: Question, d: QuestionDraft): Answer['value'] | undefined {
  if (d.dontKnow) return null;
  switch (q.type) {
    case 'choice':
    case 'vehicle': return d.picked;
    case 'multi': return d.chosen?.length ? [...d.chosen].sort((a, b) => a - b).join(',') : undefined;
    case 'order': return d.put?.length === q.items.length ? d.put.join(',') : undefined;
    case 'numeric': return parseTyped(d.typed ?? '');
  }
}

/** A question of understanding asks how sure the student is of any answer they give. */
export function needsConfidence(q: Question, value: Answer['value'] | undefined): boolean {
  return q.kind === 'understanding' && value !== null && value !== undefined;
}

/** Whether "Next" can be pressed: there is an answer. */
export function canSubmit(q: Question, d: QuestionDraft): boolean {
  return draftValue(q, d) !== undefined;
}

/**
 * The answer to record. Skipped, it records nothing chosen and no confidence.
 * A confidence goes only with an answer to a question of understanding; none
 * chosen is recorded as "unsure", as before.
 */
export function draftAnswer(q: Question, d: QuestionDraft, skipped = false): Answer {
  const value = skipped ? null : draftValue(q, d) ?? null;
  return {
    id: q.id, value,
    ...(skipped ? { skipped: true } : {}),
    ...(needsConfidence(q, value) ? { confidence: d.confidence ?? 'unsure' } : {}),
  };
}
