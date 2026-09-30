/** Raw answers survive a redraw; grading only reads them when Check is pressed. */
export type AnswerDrafts = Record<string, string>;

export function draftValue(drafts: AnswerDrafts, submitted: Record<string, number>, id: string): string {
  return drafts[id] ?? (submitted[id] === undefined ? '' : String(submitted[id]));
}

/** Empty or invalid replacement answers remove the old submitted value. */
export function submittedAnswers(drafts: AnswerDrafts): Record<string, number> {
  return Object.fromEntries(Object.entries(drafts).flatMap(([id, value]) => {
    const raw = value.replace(',', '.').replace(/[−–]/g, '-').trim();
    const number = Number(raw);
    return raw !== '' && Number.isFinite(number) ? [[id, number]] : [];
  }));
}
