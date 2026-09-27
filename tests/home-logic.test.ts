/**
 * The landing page's arithmetic (src/ui/home-logic.ts): where the picture's
 * subject goes, how the scroll position reads as sky and globe, which city
 * the station's passes are for, which passes are told of, and how their
 * times are said; and the pictures it shows being there.
 */
import { describe, expect, it } from 'vitest';
import {
  SHOWCASE_FACES, featureOffset, nextPasses, pictureShift, showcaseBlend, stationForZone, whenFrom,
} from '../src/ui/home-logic';
import type { Look, Pass } from '../src/orbit/passes';

const jdOf = (iso: string): number => 2440587.5 + Date.parse(iso) / 86400e3;

// `import.meta.glob` requires its options inline; only the keys (the files' paths) are read here
const PICTURES = Object.keys(import.meta.glob('../public/home/*'));
const PREVIEW = Object.keys(import.meta.glob('../public/social/*'));
const HTML = Object.values(import.meta.glob('../index.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0];

describe('the pictures', () => {
  it('has one of every face shown in every language, taken by npm run shots, and nothing else', () => {
    const want = SHOWCASE_FACES.flatMap((face) => ['en', 'ru', 'th'].map((lang) => `../public/home/${face}.${lang}.webp`)).sort();
    expect(PICTURES.sort()).toEqual(want);
  });

  it('has the link preview the page names, at the address it is published at', () => {
    expect(PREVIEW).toEqual(['../public/social/preview.jpg']);
    expect(HTML).toContain('<meta property="og:image" content="https://royin001.github.io/Orbitlab/social/preview.jpg" />');
  });
});

describe('pictureShift', () => {
  it('puts the subject right of the text on a wide screen and above it on a narrow one', () => {
    expect(pictureShift(1600, 900, 'pad').x).toBeGreaterThan(0);
    expect(pictureShift(1600, 900, 'pad').y).toBe(0);
    expect(pictureShift(390, 844, 'pad')).toEqual({ x: 0, y: -0.2 });
    expect(pictureShift(844, 390, 'globe')).toEqual({ x: 0, y: -0.1 });
    // the globe sits a little nearer the middle than the rocket
    expect(pictureShift(1600, 900, 'globe').x).toBeLessThan(pictureShift(1600, 900, 'pad').x);
  });
});

describe('showcaseBlend', () => {
  const h = 1000, endTop = 6000;

  it('shows the scene on the first screen, and covers it once the page has moved on', () => {
    expect(showcaseBlend(0, h, endTop)).toEqual({ covered: 0, globe: 0, sky: 0 });
    expect(showcaseBlend(300, h, endTop).covered).toBeCloseTo(0.5, 9);
    expect(showcaseBlend(600, h, endTop)).toEqual({ covered: 1, globe: 0, sky: 1 });
  });

  it('brings the globe in over the sky across the last 80 % of a window before the last chapter', () => {
    expect(showcaseBlend(5200, h, endTop).globe).toBe(0);
    const half = showcaseBlend(5600, h, endTop);
    expect(half.globe).toBeCloseTo(0.5, 9);
    expect(half.sky).toBeCloseTo(0.5, 9);
    expect(showcaseBlend(6000, h, endTop)).toEqual({ covered: 1, globe: 1, sky: 0 });
    expect(showcaseBlend(9000, h, endTop).globe).toBe(1);
  });

  it('stays finite with no window or a last chapter at the very top', () => {
    expect(showcaseBlend(0, 0, 0)).toEqual({ covered: 0, globe: 1, sky: 0 });
    expect(Number.isFinite(showcaseBlend(10, 1000, 0).globe)).toBe(true);
  });
});

describe('featureOffset', () => {
  it('is 0 for a picture in the middle of the window, negative above it, and held at ±1', () => {
    expect(featureOffset(1000, 400, 700, 1000)).toBe(0);
    expect(featureOffset(1000, 400, 1200, 1000)).toBeCloseTo(-0.5, 9);
    expect(featureOffset(1000, 400, 200, 1000)).toBeCloseTo(0.5, 9);
    expect(featureOffset(9000, 400, 0, 1000)).toBe(1);
    expect(featureOffset(0, 400, 9000, 1000)).toBe(-1);
    expect(featureOffset(0, 400, 0, 0)).toBe(0);
  });
});

describe('stationForZone', () => {
  it('starts from Moscow in Moscow\'s time zone and from Bangkok anywhere else', () => {
    expect(stationForZone('Europe/Moscow')).toBe('moscow');
    expect(stationForZone('Asia/Bangkok')).toBe('bangkok');
    expect(stationForZone(undefined)).toBe('bangkok');
  });
});

describe('nextPasses', () => {
  const look = (jd: number): Look => ({ jd, az: 0, el: 0.3, range: 1e6, sunlit: true, sunEl: -0.2 });
  const pass = (rise: number, set: number, visible: { from: number; to: number } | null = null): Pass =>
    ({ rise: look(rise), set: look(set), culminations: [], top: look((rise + set) / 2), visible });
  const d = 1 / 1440;
  const now = 100;
  const passes = [
    pass(now - 20 * d, now - 10 * d, { from: now - 18 * d, to: now - 12 * d }),
    pass(now + 80 * d, now + 90 * d),
    pass(now + 180 * d, now + 190 * d, { from: now + 183 * d, to: now + 188 * d }),
  ];

  it('tells of the next pass to come and the next that can be seen, not ones already over', () => {
    const { next, seen } = nextPasses(passes, now);
    expect(next).toBe(passes[1]);
    expect(seen).toBe(passes[2]);
  });

  it('counts a pass under way, and a visible stretch still going on', () => {
    expect(nextPasses(passes, now - 15 * d)).toEqual({ next: passes[0], seen: passes[0] });
    expect(nextPasses(passes, now + 185 * d).seen).toBe(passes[2]);
  });

  it('has nothing to tell of when nothing is left', () => {
    expect(nextPasses(passes, now + 1)).toEqual({ next: null, seen: null });
    expect(nextPasses([], now)).toEqual({ next: null, seen: null });
  });
});

describe('whenFrom', () => {
  // 17:00 in Bangkok (UTC+7)
  const now = jdOf('2026-09-27T10:00:00Z');

  it('says a moment under an hour and a half away in minutes, at least one', () => {
    expect(whenFrom(now + 12 / 1440, now, 'Asia/Bangkok')).toEqual({ kind: 'minutes', n: 12 });
    expect(whenFrom(now + 0.1 / 1440, now, 'Asia/Bangkok')).toEqual({ kind: 'minutes', n: 1 });
  });

  it('says later moments by the city\'s own calendar', () => {
    // 23:30 in Bangkok is still today there; 00:30 is tomorrow, though both are the 27th in UTC
    expect(whenFrom(jdOf('2026-09-27T16:30:00Z'), now, 'Asia/Bangkok').kind).toBe('today');
    expect(whenFrom(jdOf('2026-09-27T17:30:00Z'), now, 'Asia/Bangkok').kind).toBe('tomorrow');
    expect(whenFrom(jdOf('2026-09-27T17:30:00Z'), now, 'UTC').kind).toBe('today');
    expect(whenFrom(jdOf('2026-09-30T13:00:00Z'), now, 'Asia/Bangkok')).toEqual({ kind: 'later', dayOffset: 3 });
  });
});
