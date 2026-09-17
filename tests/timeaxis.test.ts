/**
 * The timeline's piecewise mission-time axis (audit B3).
 *
 * `TimeAxis` is the whole reason the event bar is scrubbable on a long flight,
 * and it is pure arithmetic with no DOM, so it is tested directly rather than
 * through the browser. The numbers used here are the ones measured in the app:
 * the shipped Soyuz-2.1a → ISS mission inserts at T+536 s and the bar is 596 px
 * at a 1280x800 window and 309 px at 375 px wide.
 */
import { describe, it, expect } from 'vitest';
import { TimeAxis, MIN_ASCENT_SHARE, MIN_COAST_PX } from '../src/ui/timeaxis';

/** The shipped default mission, recorded 32 minutes deep. */
const START = -10;
const INSERTION = 556;
const HEAD = 1907;
const DESKTOP_BAR = 596;
const PHONE_BAR = 309;

const desktop = (): TimeAxis => {
  const a = new TimeAxis();
  a.configure(START, HEAD, INSERTION, DESKTOP_BAR);
  return a;
};

describe('piecewise time axis', () => {
  it('is linear until the flight reaches insertion', () => {
    const a = new TimeAxis();
    a.configure(START, 300, null, DESKTOP_BAR);
    expect(a.segmented).toBe(false);
    expect(a.breakT).toBeNull();
    // exactly t/total, with no distortion to read around
    expect(a.frac(145)).toBeCloseTo((145 - START) / (300 - START), 12);
  });

  it('stays linear while the ascent is still most of the recording', () => {
    // T+600 on a mission that inserted at T+556: the ascent is already 90 % of
    // the bar, and bending the axis would only make the clock harder to read.
    const a = new TimeAxis();
    a.configure(START, 600, INSERTION, DESKTOP_BAR);
    expect(a.segmented).toBe(false);
    expect(a.share).toBe(1);
  });

  it('gives the ascent at least 40 % of the bar on a long mission', () => {
    const a = desktop();
    expect(a.segmented).toBe(true);
    expect(a.breakT).toBe(INSERTION);
    expect(a.share).toBeGreaterThanOrEqual(MIN_ASCENT_SHARE);
    // the linear axis would have given it 30 %
    expect((INSERTION - START) / (HEAD - START)).toBeLessThan(MIN_ASCENT_SHARE);
    expect(a.frac(INSERTION)).toBeCloseTo(a.share, 12);
  });

  it('holds the floor on a six-hour recording, where linear collapses the ascent', () => {
    const a = new TimeAxis();
    a.configure(START, 22190, 810, DESKTOP_BAR); // Ariane 64 → GTO, measured
    expect(a.share).toBeGreaterThanOrEqual(MIN_ASCENT_SHARE);
    // the ascent occupies 3.7 % of a linear bar and over half of this one
    expect(820 / 22200).toBeLessThan(0.04);
    expect(a.secondsPerPixel()).toBeLessThan(2);
    // …which is more than twenty times finer than the linear axis
    expect((22190 - START) / DESKTOP_BAR / a.secondsPerPixel()).toBeGreaterThan(20);
  });

  it('never starves the rest of the flight of pixels', () => {
    for (const width of [200, 309, 400, 596, 900, 1400]) {
      const a = new TimeAxis();
      a.configure(START, 22190, 810, width);
      expect((1 - a.share) * width, `coast pixels at ${width}px`).toBeGreaterThanOrEqual(MIN_COAST_PX - 1e-6);
    }
  });

  it('scrubs the ascent at about a second per pixel', () => {
    // 1.00 s/px would need 566 of the 596 px the 1280 px layout has, i.e. 95 %
    // of the bar for 9 of the 32 recorded minutes, so at that width the axis
    // gets as close as the pixel budget allows rather than all the way.
    expect(desktop().secondsPerPixel()).toBeLessThan(1.25);
    // A window wide enough for the pixels does reach it.
    const wide = new TimeAxis();
    wide.configure(START, HEAD, INSERTION, 900);
    expect(wide.secondsPerPixel()).toBeLessThanOrEqual(1);
    // and the phone, where nothing can reach it, is still twice as fine as the
    // linear axis it replaces (measured: 2.99 s/px against 7.77 s/px)
    const phone = new TimeAxis();
    phone.configure(START, HEAD, INSERTION, PHONE_BAR);
    expect(phone.secondsPerPixel()).toBeLessThan(3.1);
    expect((HEAD - START) / PHONE_BAR / phone.secondsPerPixel()).toBeGreaterThan(2);
  });

  it('maps time to fraction and back without drift', () => {
    const a = desktop();
    for (const t of [START, 0, 1, 60, 120, 555, 556, 557, 900, 1500, HEAD]) {
      expect(a.time(a.frac(t)), `round trip at T+${t}`).toBeCloseTo(t, 6);
    }
    for (let f = 0; f <= 1; f += 0.05) {
      expect(a.frac(a.time(f))).toBeCloseTo(f, 9);
    }
  });

  it('is monotonic and clamped to the bar', () => {
    const a = desktop();
    let prev = -1;
    for (let t = START; t <= HEAD; t += 7.3) {
      const f = a.frac(t);
      expect(f).toBeGreaterThanOrEqual(prev);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
      prev = f;
    }
    expect(a.frac(START - 1e6)).toBe(0);
    expect(a.frac(HEAD + 1e6)).toBe(1);
    expect(a.time(-5)).toBeCloseTo(START, 9);
    expect(a.time(5)).toBeCloseTo(HEAD, 9);
  });

  it('reports a shape change only when the mapping really moves', () => {
    const a = new TimeAxis();
    expect(a.configure(START, HEAD, INSERTION, DESKTOP_BAR)).toBe(true);
    // the head advancing is not a shape change: the timeline has its own
    // threshold for that, and re-laying out the bar every frame is the cost
    // this return value exists to avoid
    expect(a.configure(START, HEAD + 60, INSERTION, DESKTOP_BAR)).toBe(false);
    expect(a.configure(START, HEAD + 60, INSERTION, PHONE_BAR)).toBe(true);
  });

  it('puts round-number ticks in both segments and none on the boundary', () => {
    const a = desktop();
    const ticks: number[] = [];
    a.ticks(ticks, DESKTOP_BAR);
    expect(ticks.length).toBeGreaterThan(2);
    let prev = -Infinity;
    for (const t of ticks) {
      expect(t).toBeGreaterThan(prev);
      expect(t).toBeGreaterThan(START);
      expect(t).toBeLessThan(HEAD);
      // far enough from the boundary that the two labels cannot collide
      expect(Math.abs(a.frac(t) - a.share) * DESKTOP_BAR).toBeGreaterThan(8);
      prev = t;
    }
    expect(ticks.some((t) => t < INSERTION)).toBe(true);
    expect(ticks.some((t) => t > INSERTION)).toBe(true);
    // the array is reused, not reallocated
    const again = a.ticks(ticks, DESKTOP_BAR);
    expect(again).toBe(ticks);
  });

  it('survives a degenerate recording', () => {
    const a = new TimeAxis();
    a.configure(-10, -10, null, DESKTOP_BAR);
    expect(a.frac(0)).toBe(0);
    expect(Number.isFinite(a.time(0.5))).toBe(true);
    const ticks: number[] = [];
    expect(a.ticks(ticks, 0)).toHaveLength(0);
  });
});
