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
