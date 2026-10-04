/**
 * R3.1: a design reference (src/design/design-ref.ts) in words — its name and
 * which revision flies: the time it was saved, changed since, or never saved.
 * Said beside the mission's name in Launch and under the hand-off in Orbit.
 */
import { getLang, t } from '../i18n';
import { designRefState, type DesignRef } from '../design/design-ref';

export function designRefText(ref: DesignRef): string {
  const state = designRefState(ref);
  if (state === 'unsaved') return t('ctx.design.unsaved', { name: ref.name });
  let date = ref.revision!;
  try { date = new Date(ref.revision!).toLocaleString(getLang(), { dateStyle: 'medium', timeStyle: 'short' }); } catch { /* the ISO form */ }
  return t(state === 'edited' ? 'ctx.design.edited' : 'ctx.design.saved', { name: ref.name, date });
}

/** What changes the words: the reference's identity, revision and state. */
export function designRefSignature(ref: DesignRef | null): string {
  return ref ? `${ref.kind}|${ref.recordId}|${ref.revision}|${ref.edited}|${ref.name}` : '';
}
