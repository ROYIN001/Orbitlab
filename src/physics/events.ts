import type { SimEvent } from './simulation';

interface EventOrder {
  count: number;
  first: SimEvent | undefined;
  last: SimEvent | undefined;
  ordered: readonly SimEvent[];
}

const orders = new WeakMap<readonly SimEvent[], EventOrder>();

/**
 * A chronological read model of an append-only detection log. Max Q is detected
 * after its peak, so detection order is not occurrence order. Keep the source
 * untouched: the recorder consumes it by append offset. Stable sorting preserves
 * detection order for distinct events at the same mission time.
 */
export function chronologicalEvents(events: readonly SimEvent[]): readonly SimEvent[] {
  let cached = orders.get(events);
  const first = events[0], last = events[events.length - 1];
  if (!cached || cached.count !== events.length || cached.first !== first || cached.last !== last) {
    cached = { count: events.length, first, last, ordered: Object.freeze([...events].sort((a, b) => a.t - b.t)) };
    orders.set(events, cached);
  }
  return cached.ordered;
}

const prefixes = new WeakMap<readonly SimEvent[], { n: number; list: readonly SimEvent[] }>();

/**
 * The first `n` events of a chronological list, as the same array for the same
 * list and count, so a reader that compares identities (the timeline's chips)
 * sees a change only when there is one. The whole list itself when `n` covers it.
 *
 * Roadmap T02 (owner decision 2, 2026-09-29): the live point-mass flight now
 * runs up to one step ahead of the instant on screen, and a recording shows
 * only the events up to that instant (src/replay/recorder.ts).
 */
export function eventPrefix(ordered: readonly SimEvent[], n: number): readonly SimEvent[] {
  if (!(n < ordered.length)) return ordered;
  const count = Math.max(0, Math.floor(n));
  let cached = prefixes.get(ordered);
  if (!cached || cached.n !== count) {
    cached = { n: count, list: Object.freeze(ordered.slice(0, count)) };
    prefixes.set(ordered, cached);
  }
  return cached.list;
}

/** How many events of a chronological list happened at or before mission time `t`. */
export function eventsThrough(ordered: readonly SimEvent[], t: number): number {
  let n = ordered.length;
  while (n > 0 && ordered[n - 1].t > t + 1e-9) n--;
  return n;
}
