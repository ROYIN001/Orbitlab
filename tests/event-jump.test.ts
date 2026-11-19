import { describe, expect, it } from 'vitest';
import type { EventSeverity, SimEvent } from '../src/physics/simulation';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';
import { JUMP_LEAD_S, KEYS, fitLevel, quickEvents } from '../src/ui/event-jump';

const ev = (t: number, key: string, severity: EventSeverity = 'info'): SimEvent => ({ t, key, severity });
const kinds = (events: SimEvent[]) => quickEvents(events).map((q) => q.kind);

describe('R2.6 event-jump list', () => {
  it('is empty without events', () => {
    expect(quickEvents([])).toEqual([]);
  });

  it('takes the earliest event of a kind and sorts by time', () => {
    const stage = ev(150, 'evt.stageSep');
    const booster = ev(120, 'evt.boosterSep');
    const out = quickEvents([ev(60, 'evt.maxQ'), stage, ev(0, 'evt.liftoff'), booster]);
    expect(out.map((q) => q.kind)).toEqual(['liftoff', 'maxQ', 'staging']);
    expect(out[2].event).toBe(booster);
  });

  it('ignores events that are no kind', () => {
    expect(kinds([ev(-3, 'evt.ignition'), ev(140, 'evt.meco'), ev(0, 'evt.liftoff')])).toEqual(['liftoff']);
  });

  it('counts any fail event as a failure, whatever its key', () => {
    expect(kinds([ev(0, 'evt.liftoff'), ev(40, 'evt.whatever', 'fail')])).toEqual(['liftoff', 'failure']);
  });

  it('counts the escape system descent module touchdown as a landing', () => {
    expect(kinds([ev(900, 'evt.escapeLanded', 'success')])).toEqual(['landing']);
  });

  it('with all seven kinds, the menu lists every one, in time order', () => {
    const out = quickEvents([ev(0, 'evt.liftoff'), ev(60, 'evt.maxQ'), ev(150, 'evt.stageSep'), ev(200, 'evt.fairingSep'),
      ev(540, 'evt.parkingOrbit', 'success'), ev(600, 'evt.boosterLandedShip', 'success'), ev(700, 'evt.thrustLoss', 'fail')]);
    expect(out.map((q) => q.kind)).toEqual(['liftoff', 'maxQ', 'staging', 'fairing', 'insertion', 'landing', 'failure']);
  });

  it('the transport row gives way level by level, from 0, and keeps the lowest level at which it is least tall', () => {
    // fake measurements: the row's height at levels 0…3 (37.5 one line, 83.5 two, 85.5 two with the clock on the second)
    const run = (heights: number[]) => {
      const tried: number[] = [];
      const level = fitLevel((l) => { tried.push(l); return heights[l]; });
      return { level, tried };
    };
    // every level is measured, in order
    expect(run([37.5, 37.5, 37.5, 37.5])).toEqual({ level: 0, tried: [0, 1, 2, 3] });
    // the first level that keeps one line
    expect(run([83.5, 37.5, 37.5, 37.5]).level).toBe(1);
    expect(run([83.5, 83.5, 37.5, 37.5]).level).toBe(2);
    expect(run([83.5, 83.5, 83.5, 37.5]).level).toBe(3);
    // where no level keeps one line and hiding saves nothing, the words come back (not the last level)
    expect(run([83.5, 83.5, 83.5, 83.5]).level).toBe(0);
    // where hiding saves a line, though not the second one, or keeps the clock on the first line, it is kept
    expect(run([120.5, 120.5, 78.5, 78.5]).level).toBe(2);
    expect(run([85.5, 85.5, 85.5, 83.5]).level).toBe(3);
    // half a pixel or less is not a saving
    expect(run([83.5, 83.2, 83.1, 83.0]).level).toBe(0);
    expect(run([83.5, 82.9, 82.9, 82.9]).level).toBe(1);
  });

  it('lands 5 s before the event', () => {
    expect(JUMP_LEAD_S).toBe(5);
  });

  it('every key the menu can show has a short tl. label in TH, EN and RU', () => {
    // the failure kind is any fail event: take every key the simulation emits with severity fail on the same line
    const src = import.meta.glob('../src/physics/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const fail = Object.values(src).flatMap((text) => [...text.matchAll(/'(evt\.\w+)'[^\n]*'fail'/g)].map((m) => m[1]));
    expect(fail.length).toBeGreaterThan(10);
    const keys = [...new Set([...Object.values(KEYS).flat(), ...fail])];
    for (const dict of [en, th, ru] as Record<string, string>[]) {
      expect(keys.filter((k) => !(`tl.${k}` in dict))).toEqual([]);
    }
  });
});
