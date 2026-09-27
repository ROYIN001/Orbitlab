/**
 * The landing page's prototypes (src/ui/home-logic.ts): which one the address
 * asks for, B's scroll position read as mission time, A's evening light, and
 * where the picture's subject goes.
 */
import { describe, expect, it } from 'vitest';
import { eveningAt, parseVariant, pictureShift, sunElevation, timeAtScroll } from '../src/ui/home-logic';

describe('parseVariant', () => {
  it('reads a letter of the five, whatever its case, and nothing else', () => {
    expect(parseVariant('b')).toBe('b');
    expect(parseVariant(' E ')).toBe('e');
    expect(parseVariant('f')).toBeNull();
    expect(parseVariant('')).toBeNull();
    expect(parseVariant(null)).toBeNull();
  });
});

describe('timeAtScroll', () => {
  const anchors = [{ top: 0, t: -8 }, { top: 600, t: 2 }, { top: 1200, t: 60 }, { top: 1500, t: 540 }];

  it('holds the first moment above the first chapter and the last below the last', () => {
    expect(timeAtScroll(anchors, -50)).toBe(-8);
    expect(timeAtScroll(anchors, 0)).toBe(-8);
    expect(timeAtScroll(anchors, 1500)).toBe(540);
    expect(timeAtScroll(anchors, 9000)).toBe(540);
  });

  it('reaches each chapter\'s moment at its top, in straight lines between', () => {
    expect(timeAtScroll(anchors, 600)).toBe(2);
    expect(timeAtScroll(anchors, 300)).toBeCloseTo(-3, 9);
    expect(timeAtScroll(anchors, 900)).toBeCloseTo(31, 9);
    expect(timeAtScroll(anchors, 1350)).toBeCloseTo(300, 9);
  });

  it('never divides by a chapter of no height (two tops clamped to the page\'s end)', () => {
    const clamped = [{ top: 0, t: 0 }, { top: 800, t: 296 }, { top: 800, t: 540 }];
    expect(timeAtScroll(clamped, 800)).toBe(296);
    expect(Number.isFinite(timeAtScroll(clamped, 799))).toBe(true);
    expect(timeAtScroll([], 100)).toBe(0);
  });
});

describe('the pad\'s evening light', () => {
  // Baikonur, 45.92° N 63.34° E; the equinox, when sunset is near 18:00 local solar time (13:45 UTC there)
  const lat = 45.92, lon = 63.34;
  const noon = new Date(Date.UTC(2026, 2, 20, 7, 45));

  it('has the Sun high at local noon and below the horizon at local midnight', () => {
    expect(sunElevation(noon, lat, lon)).toBeGreaterThan(40);
    expect(sunElevation(new Date(noon.getTime() + 12 * 3600e3), lat, lon)).toBeLessThan(-30);
  });

  it('finds dusk just after sunset and night after twilight, both that evening', () => {
    const dusk = eveningAt(noon, lat, lon, -2);
    const night = eveningAt(noon, lat, lon, -20);
    const hours = (d: Date) => (d.getTime() - noon.getTime()) / 3600e3;
    expect(hours(dusk)).toBeGreaterThan(5.8);
    expect(hours(dusk)).toBeLessThan(6.8);
    expect(hours(night)).toBeGreaterThan(hours(dusk) + 1);
    expect(hours(night)).toBeLessThan(9);
    expect(sunElevation(dusk, lat, lon)).toBeLessThan(-2);
    expect(sunElevation(dusk, lat, lon)).toBeGreaterThan(-3);
  });
});

describe('pictureShift', () => {
  it('puts the subject right of the text on a wide screen and above it on a narrow one', () => {
    expect(pictureShift(1600, 900, 'a').x).toBeGreaterThan(0);
    expect(pictureShift(1600, 900, 'a').y).toBe(0);
    expect(pictureShift(390, 844, 'c')).toEqual({ x: 0, y: -0.2 });
  });
});
