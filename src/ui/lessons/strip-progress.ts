/**
 * When a lesson strip is built again, and what a design lesson's running
 * check puts in its key (M-LEARNING-001). Kept apart from `lesson-mode.ts`
 * so the decision is unit-tested without a DOM.
 */
import { t } from '../../i18n';

/** A design check under way: whether it hands the design in, and how far the lifetime run has got (0–1). */
export interface CheckingState {
  readonly record: boolean;
  readonly progress: number;
}

/**
 * The part of the design strip's key that a running check contributes:
 * whether it hands in, not how far it has got — the progress is written into
 * the strip in place (`CheckProgressLine`), so the ~100 ticks of a lifetime
 * run do not build the strip again and take the answer field away.
 */
export function checkingKeyPart(checking: CheckingState | null): unknown[] | null {
  return checking ? [checking.record] : null;
}

/** The line a running check shows, as it always has. */
export function checkProgressText(progress: number): string {
  return progress > 0 ? t('lesson.design.strip.lifetime', { p: Math.round(progress * 100) }) : t('lesson.design.strip.checking');
}

/** What a running check announces: the same words, in steps of 10 % — at most 11 announcements a check. */
export function checkAnnouncedText(progress: number): string {
  const step = Math.min(100, Math.floor(Math.round(progress * 100) / 10) * 10);
  return step > 0 ? t('lesson.design.strip.lifetime', { p: step }) : t('lesson.design.strip.checking');
}

/** Anything with text (an element, in the page). */
export interface TextSink {
  textContent: string | null;
}

/**
 * A running check's progress line, written in place: the figure seen
 * (`aria-hidden`) follows every tick, the live region (`role=status`) only
 * each 10 % step, so a screen reader is not told a hundred times a check.
 */
export class CheckProgressLine {
  constructor(private readonly shown: TextSink, private readonly status: TextSink) {}

  set(progress: number): void {
    const seen = checkProgressText(progress);
    if (this.shown.textContent !== seen) this.shown.textContent = seen;
    const said = checkAnnouncedText(progress);
    if (this.status.textContent !== said) this.status.textContent = said;
  }
}

/**
 * Whether a strip whose key is now `key` is built again over the one built
 * for `lastKey`: not when nothing it shows has changed, and not while the
 * learner types in one of its text fields (a rebuild would take the field,
 * its focus and its caret away) — unless no strip has been built yet.
 */
export function stripRebuilds(lastKey: string, key: string, typing: boolean): boolean {
  if (key === lastKey) return false;
  return !(typing && lastKey);
}
