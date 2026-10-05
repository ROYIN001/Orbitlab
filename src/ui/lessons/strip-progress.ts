/**
 * When a lesson strip is built again, and what a design lesson's running
 * check puts in its key (M-LEARNING-001). Kept apart from `lesson-mode.ts`
 * so the decision is unit-tested without a DOM.
 */

/** A design check under way: whether it hands the design in, and how far the lifetime run has got (0–1). */
export interface CheckingState {
  readonly record: boolean;
  readonly progress: number;
}

/**
 * The part of the design strip's key that a running check contributes.
 */
export function checkingKeyPart(checking: CheckingState | null): unknown[] | null {
  return checking ? [checking.record, Math.round(checking.progress * 100)] : null;
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
