/**
 * ResultSlot (audit 2026-09-27 A4, A5, A14, A15): a result is shown with the
 * inputs that produced it, marked stale when the controls have moved on, and
 * an answer to an earlier run never replaces a later one.
 */
import { describe, expect, it } from 'vitest';
import { changedKeys, deepEqual, frozenCopy, Latest, positiveNumber, ResultSlot } from '../src/ui/result-slot';

type Over = { place: string; lat: number; minEl: number; days: number; data: string; groups: string[] };
const bangkok: Over = { place: 'Bangkok', lat: 0.2427, minEl: 60, days: 1, data: 'snapshot|2026-09-26T16:10:54Z', groups: ['stations'] };

const slot = () => new ResultSlot<Over, string[]>((i) => [i.place, `≥ ${i.minEl}°`, i.days === 1 ? '24 h' : `${i.days} days`, `data ${i.data.split('|')[1].slice(0, 10)}`]);

describe('ResultSlot', () => {
  it('has no result and says so before any run', () => {
    const s = slot();
    expect(s.state).toBe('idle');
    expect(s.status(bangkok)).toBe('none');
    expect(s.describe()).toBe('');
  });

  it('is fresh for the inputs it ran on, and stale once any of them changes', () => {
    const s = slot();
    const gen = s.start(bangkok, 2461000.5);
    expect(s.status(bangkok)).toBe('fresh');
    expect(s.accept(gen, ['ISS'])).toBe(true);
    expect(s.state).toBe('done');
    expect(s.status({ ...bangkok })).toBe('fresh');
    // A4: the city, the elevation, the duration, the group each make it stale
    expect(s.status({ ...bangkok, place: 'Moscow', lat: 0.9750 })).toBe('stale');
    expect(s.status({ ...bangkok, minEl: 45 })).toBe('stale');
    expect(s.status({ ...bangkok, days: 3 })).toBe('stale');
    expect(s.status({ ...bangkok, groups: ['stations', 'thai'] })).toBe('stale');
    // A14: so does a new element set of the same catalogue
    expect(s.status({ ...bangkok, data: 'online|2026-09-27T08:00:00Z' })).toBe('stale');
    expect(s.changed({ ...bangkok, minEl: 45, days: 3 })).toEqual(['minEl', 'days']);
    expect(s.startedAt).toBe(2461000.5);
  });

  it('keeps a frozen copy of its inputs: editing the object it was given changes nothing', () => {
    const s = slot();
    const form = { ...bangkok, groups: [...bangkok.groups] };
    s.start(form);
    form.minEl = 30;
    form.groups.push('debris');
    expect(s.inputs!.minEl).toBe(60);
    expect(s.inputs!.groups).toEqual(['stations']);
    expect(Object.isFrozen(s.inputs)).toBe(true);
    expect(Object.isFrozen(s.inputs!.groups)).toBe(true);
    expect(s.status(form)).toBe('stale');
  });

  it('drops the answer of an earlier run, however late it comes (A15)', () => {
    const s = slot();
    const first = s.start(bangkok);
    const second = s.start({ ...bangkok, place: 'Moscow' });
    expect(s.current(first)).toBe(false);
    expect(s.accept(first, ['from Bangkok'])).toBe(false);
    expect(s.report(first, 0.5)).toBe(false);
    expect(s.stop(first)).toBe(false);
    expect(s.fail(first, 'late')).toBe(false);
    expect(s.state).toBe('running');
    expect(s.result).toBeNull();
    expect(s.report(second, 0.5)).toBe(true);
    expect(s.progress).toBe(0.5);
    expect(s.accept(second, ['from Moscow'])).toBe(true);
    expect(s.result).toEqual(['from Moscow']);
    expect(s.inputs!.place).toBe('Moscow');
    // an answer comes once
    expect(s.accept(second, ['again'])).toBe(false);
  });

  it('stops, fails and clears', () => {
    const s = slot();
    let gen = s.start(bangkok);
    expect(s.stop(gen)).toBe(true);
    expect(s.state).toBe('stopped');
    expect(s.status(bangkok)).toBe('fresh');
    gen = s.start(bangkok);
    expect(s.fail(gen, 'no data')).toBe(true);
    expect(s.state).toBe('failed');
    expect(s.reason).toBe('no data');
    gen = s.start(bangkok);
    s.clear();
    expect(s.state).toBe('idle');
    expect(s.status(bangkok)).toBe('none');
    expect(s.accept(gen, ['x'])).toBe(false);
  });

  it('puts its inputs in words: its own by default, or any others', () => {
    const s = slot();
    s.start(bangkok);
    expect(s.describe()).toBe('Bangkok · ≥ 60° · 24 h · data 2026-09-26');
    expect(s.describe({ ...bangkok, place: 'Moscow', days: 3 })).toBe('Moscow · ≥ 60° · 3 days · data 2026-09-26');
    const blanks = new ResultSlot<{ a: string }, number>((i) => [i.a, '', 'x']);
    blanks.start({ a: 'A' });
    expect(blanks.describe()).toBe('A · x');
  });
});

describe('plain-data helpers', () => {
  it('compares deeply, whatever the key order, NaN included', () => {
    expect(deepEqual({ a: 1, b: [1, { c: 'x' }] }, { b: [1, { c: 'x' }], a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([1], { 0: 1 })).toBe(false);
    expect(deepEqual(NaN, NaN)).toBe(true);
    expect(deepEqual(null, {})).toBe(false);
    expect(changedKeys({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual(['b']);
  });

  it('freezes a copy, not the original', () => {
    const o = { a: { b: [1] } };
    const f = frozenCopy(o);
    expect(Object.isFrozen(o)).toBe(false);
    expect(Object.isFrozen(f.a.b)).toBe(true);
    expect(frozenCopy(5)).toBe(5);
  });

  it('reads a positive number from a box, and nothing else (A5)', () => {
    expect(positiveNumber('101')).toBe(101);
    expect(positiveNumber(' 2.5 ')).toBe(2.5);
    expect(positiveNumber('1e3')).toBe(1000);
    for (const bad of ['', '  ', '0', '-5', 'abc', 'NaN', 'Infinity']) expect(positiveNumber(bad)).toBeNull();
  });

  it('lets only the latest request answer (A14)', () => {
    const l = new Latest();
    const a = l.next();
    const b = l.next();
    expect(l.isLatest(a)).toBe(false);
    expect(l.isLatest(b)).toBe(true);
  });
});
