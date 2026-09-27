/**
 * A computed result and the inputs that produced it (audit 2026-09-27 A4, A5,
 * A14, A15): the Orbit section's analyses — passes, overflights, close
 * approaches, re-entry, orbit lifetime — each take a set of inputs, run for a
 * moment or a minute, and leave a result on screen while the user goes on
 * changing the controls. Before this, each kept a string key of its inputs
 * but showed its result when only a prefix of that key still matched, so a
 * list for Bangkok stayed under the heading "Overflights of Moscow" and a
 * lifetime of 3.0 years stayed under a mass a hundred times larger.
 *
 * A slot holds one run: a frozen copy of its inputs, taken when it starts,
 * a generation that each start moves on (so an answer to an earlier run is
 * dropped, however late it comes), its state, and its result. Asked about
 * the inputs on screen now, it says whether the result is theirs ('fresh'),
 * someone else's ('stale'), or there is none. It also puts its inputs in
 * words, for the "calculated from" line under a result.
 *
 * DOM-free: tests/result-slot.test.ts.
 */

export type SlotState = 'idle' | 'running' | 'done' | 'stopped' | 'failed';
export type Freshness = 'fresh' | 'stale' | 'none';

/** Plain data: what a slot's inputs may be made of. */
export type Plain = null | undefined | boolean | number | string | readonly Plain[] | { readonly [k: string]: Plain };
/** A slot's inputs: a record of plain data. */
export type SlotInputs = { readonly [k: string]: Plain };

/** A deep copy of plain data (numbers, strings, booleans, arrays and plain objects), frozen all the way down. */
export function frozenCopy<T>(value: T): Readonly<T> {
  if (value === null || typeof value !== 'object') return value;
  const copy: unknown = Array.isArray(value)
    ? value.map((v) => frozenCopy(v))
    : Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, frozenCopy(v)]));
  return Object.freeze(copy) as Readonly<T>;
}

/** Whether two pieces of plain data are equal all the way down (NaN equals NaN; key order does not matter). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    return a.length === bb.length && a.every((v, k) => deepEqual(v, bb[k]));
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/** The top-level inputs whose values differ between two sets. */
export function changedKeys<I extends object>(was: I, now: I): (keyof I)[] {
  const keys = new Set([...Object.keys(was), ...Object.keys(now)]) as Set<keyof I>;
  return [...keys].filter((k) => !deepEqual(was[k], now[k]));
}

export class ResultSlot<I extends SlotInputs, R> {
  private gen = 0;
  private _inputs: Readonly<I> | null = null;
  private _result: R | null = null;
  private _state: SlotState = 'idle';
  private _startedAt: number | null = null;
  private _progress = 0;
  private _reason = '';
  private stopAsked = -1;

  /** @param describer the inputs in words, one part each ("Bangkok", "≥ 60°", "24 hours") */
  constructor(private readonly describer: (inputs: Readonly<I>) => string[] = () => []) {}

  get generation(): number { return this.gen; }
  get state(): SlotState { return this._state; }
  get inputs(): Readonly<I> | null { return this._inputs; }
  get result(): R | null { return this._result; }
  /** what the run started from (a Julian date, a clock time: whatever the caller passed) */
  get startedAt(): number | null { return this._startedAt; }
  get progress(): number { return this._progress; }
  /** why the run failed */
  get reason(): string { return this._reason; }

  /** A run starts on these inputs (copied and frozen now): any earlier run's answer will be dropped. Returns its generation. */
  start(inputs: I, startedAt: number | null = null): number {
    this.gen++;
    this._inputs = frozenCopy(inputs);
    this._result = null;
    this._state = 'running';
    this._startedAt = startedAt;
    this._progress = 0;
    this._reason = '';
    return this.gen;
  }

  /** Whether `gen` is the run the slot holds now. */
  current(gen: number): boolean {
    return gen === this.gen;
  }

  /** Ask the run in progress to stop: its next report() says so. */
  requestStop(): void {
    if (this._state === 'running') this.stopAsked = this.gen;
  }

  /** The run `gen` has got this far (0–1); false when it is to stop — no longer the slot's, or asked to. */
  report(gen: number, fraction: number): boolean {
    if (gen !== this.gen || this._state !== 'running' || this.stopAsked === gen) return false;
    this._progress = fraction;
    return true;
  }

  /** The run `gen` has its answer: kept if that run is still the slot's. */
  accept(gen: number, result: R): boolean {
    if (gen !== this.gen || this._state !== 'running') return false;
    this._result = result;
    this._state = 'done';
    this._progress = 1;
    return true;
  }

  /** The run `gen` was stopped before its end. */
  stop(gen: number): boolean {
    if (gen !== this.gen || this._state !== 'running') return false;
    this._state = 'stopped';
    return true;
  }

  /** The run `gen` failed. */
  fail(gen: number, reason: string): boolean {
    if (gen !== this.gen || this._state !== 'running') return false;
    this._state = 'failed';
    this._reason = reason;
    return true;
  }

  /** Forget the run: a run still going will find it is no longer the slot's. */
  clear(): void {
    this.gen++;
    this._inputs = null;
    this._result = null;
    this._state = 'idle';
    this._startedAt = null;
    this._progress = 0;
    this._reason = '';
  }

  /** Whether the slot's run was on the inputs on screen now. */
  status(current: I): Freshness {
    if (!this._inputs || this._state === 'idle') return 'none';
    return deepEqual(this._inputs, current) ? 'fresh' : 'stale';
  }

  /** Which inputs have changed since the run started (none with no run). */
  changed(current: I): (keyof I)[] {
    return this._inputs ? changedKeys(this._inputs as I, current) : [];
  }

  /** The inputs in words, joined: the run's own by default. Empty with no run. */
  describe(inputs: Readonly<I> | null = this._inputs): string {
    return inputs ? this.describer(inputs).filter((p) => p !== '').join(' · ') : '';
  }
}

/**
 * A number typed into a box that must be greater than zero (audit 2026-09-27
 * A5): the number, or null for blank, zero, negative or not a number — which
 * the form says beside the box and does not run with.
 */
export function positiveNumber(raw: string): number | null {
  if (raw.trim() === '') return null;
  const v = Number(raw);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * Only the latest of several overlapping requests may answer (audit
 * 2026-09-27 A14): each `next()` makes the earlier tokens stale, and a
 * callback asks `isLatest(token)` before it touches anything.
 */
export class Latest {
  private gen = 0;
  next(): number { return ++this.gen; }
  isLatest(token: number): boolean { return token === this.gen; }
}
