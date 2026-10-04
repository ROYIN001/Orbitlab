/**
 * R2.4: the timeline's event chooser.
 *
 * Events that fire close together collapse into one chip on the event bar
 * (src/ui/timeline.ts). Before R2.4 the only way to reach the hidden members
 * was to click the chip repeatedly and read the tooltip; now the chip opens a
 * short list of every member, each with its name and exact recorded T+ time,
 * and choosing one seeks to that event's own recorded instant.
 *
 * This module is the DOM-free part — the order of the list, which entry is
 * where the cursor is, and the list's keyboard movement — so it can be tested
 * without a browser. The list itself is built by `Timeline`.
 */
import type { SimEvent } from '../physics/simulation';

/** One row of the chooser. */
export interface ChooserEntry {
  event: SimEvent;
  /** the cursor is at this event: the latest member at or before the cursor */
  current: boolean;
}

/** Tolerance on "the cursor is at this event", s: a seek lands exactly on `event.t`. */
const AT_EVENT = 1e-6;

/**
 * The members of a cluster in occurrence order, with the one the cursor is at
 * marked. Order is by recorded time and, for equal times, the order the
 * recorder emitted them (`Array.prototype.sort` is stable), so two events of
 * the same instant keep their causal order. Only recorded events are ever
 * passed in, so nothing past the recording head can be listed.
 */
export function chooserEntries(members: readonly SimEvent[], cursorT: number): ChooserEntry[] {
  const sorted = [...members].sort((a, b) => a.t - b.t);
  let at = -1;
  for (let i = 0; i < sorted.length; i++) if (sorted[i].t <= cursorT + AT_EVENT) at = i;
  return sorted.map((event, i) => ({ event, current: i === at }));
}

/**
 * Where focus moves inside the list for a key, or null when the key is not
 * one the list handles. Wraps at both ends like a menu.
 */
export function chooserFocusMove(key: string, index: number, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowDown': return (index + 1) % count;
    case 'ArrowUp': return (index - 1 + count) % count;
    case 'Home': return 0;
    case 'End': return count - 1;
    default: return null;
  }
}
