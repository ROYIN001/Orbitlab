/**
 * The landing page's arithmetic (src/ui/home.ts, src/ui/home-stage.ts):
 * where the picture's subject goes, how far the page has scrolled from the
 * rocket on its pad through the starry sky into the globe, which city the
 * space station's passes are worked out for, and which of its passes to tell
 * the visitor about. DOM-free: tests/home-logic.test.ts holds it.
 */
import type { Pass } from '../orbit/passes';

/**
 * The faces of the app the page shows, in its order. Each is pictured in
 * each language, public/home/<face>.<lang>.webp, taken from the app itself
 * by scripts/shots.ts (`npm run shots`).
 */
export const SHOWCASE_FACES = ['watch', 'explore', 'engineer', 'lessons', 'orbit'] as const;
export type ShowcaseFace = typeof SHOWCASE_FACES[number];

/**
 * Where the subject of the picture goes, as a shift off the middle in
 * fractions of the viewport (+x right, +y down): to the right of the text on
 * a wide screen (the globe a little nearer the middle than the rocket), above
 * it on a narrow one, where the text sits at the bottom.
 */
export function pictureShift(width: number, height: number, subject: 'pad' | 'globe'): { x: number; y: number } {
  if (width >= 860) return { x: subject === 'globe' ? 0.2 : 0.24, y: 0 };
  return { x: 0, y: height > width ? -0.2 : -0.1 };
}

/**
 * How far down the page is, read three ways, each 0 to 1: `covered`, how much
 * of the launch scene the starry sky hides (none on the first screen, all of
 * it once the page has moved on by 60 % of a window); `globe`, how far the
 * globe has come in over the sky (from 80 % of a window before the last
 * chapter to its top); `sky`, how much of the sky shows (the lesser of the
 * two left).
 */
export function showcaseBlend(scrollTop: number, windowHeight: number, endTop: number): { covered: number; globe: number; sky: number } {
  const clamp = (x: number): number => Math.max(0, Math.min(1, x));
  const covered = windowHeight > 0 ? clamp(scrollTop / (windowHeight * 0.6)) : 0;
  const from = Math.max(0, endTop - windowHeight * 0.8);
  const globe = endTop > from ? clamp((scrollTop - from) / (endTop - from)) : scrollTop >= endTop ? 1 : 0;
  return { covered, globe, sky: Math.min(covered, 1 - globe) };
}

/**
 * How far a picture of the program is from the middle of the window, −1 to 1
 * (negative above it): it swings in and settles as it gets there.
 */
export function featureOffset(top: number, height: number, scrollTop: number, windowHeight: number): number {
  if (windowHeight <= 0) return 0;
  const q = (top + height / 2 - (scrollTop + windowHeight / 2)) / windowHeight;
  return Math.max(-1, Math.min(1, q));
}

/** The places the passes can be worked out for (src/orbit/applications-setup.ts STATIONS), each with the time zone its clocks keep. */
export const STATION_ZONES: Record<string, string> = {
  bangkok: 'Asia/Bangkok', chiangMai: 'Asia/Bangkok', hatYai: 'Asia/Bangkok', ubon: 'Asia/Bangkok',
  stPetersburg: 'Europe/Moscow', moscow: 'Europe/Moscow',
};

/** The city to work the passes out for, guessed from the browser's time zone (nothing is asked of it): Moscow's zone, Moscow; anything else, Bangkok. */
export function stationForZone(zone: string | undefined): string {
  return zone === 'Europe/Moscow' ? 'moscow' : 'bangkok';
}

/** The station's passes are looked for this many days ahead: a visible one can be days away. */
export const PASS_DAYS = 5;

/**
 * Of a satellite's passes (in time order), the next one — the one under way,
 * or else the next to rise — and the next that can be seen with the naked
 * eye, the satellite sunlit in a dark sky: that one still to come or still
 * going on at `jd`.
 */
export function nextPasses(passes: readonly Pass[], jd: number): { next: Pass | null; seen: Pass | null } {
  const next = passes.find((p) => !p.set || p.set.jd > jd) ?? null;
  const seen = passes.find((p) => p.visible !== null && p.visible.to > jd) ?? null;
  return { next, seen };
}

/** How a moment ahead is said: in so many minutes, today, tomorrow, or on a day of the week — by the visitor's calendar in `zone`. */
export type When =
  | { kind: 'minutes'; n: number }
  | { kind: 'today' | 'tomorrow' | 'later'; dayOffset: number };

/** Julian date to the calendar day it falls on in `zone`, as a day count (only differences between two are used). */
function dayNumber(jd: number, zone: string): number {
  const date = new Date((jd - 2440587.5) * 86400e3);
  let y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, d = date.getUTCDate();
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value);
    y = get('year'); m = get('month'); d = get('day');
  } catch { /* an unknown zone: UTC's day */ }
  return Math.floor(Date.UTC(y, m - 1, d) / 86400e3);
}

/** When `jd` is, seen from `now` in `zone`: under an hour and a half away in minutes (at least one), else by its day. */
export function whenFrom(jd: number, now: number, zone: string): When {
  const minutes = (jd - now) * 1440;
  if (minutes < 90) return { kind: 'minutes', n: Math.max(1, Math.round(minutes)) };
  const dayOffset = dayNumber(jd, zone) - dayNumber(now, zone);
  return { kind: dayOffset <= 0 ? 'today' : dayOffset === 1 ? 'tomorrow' : 'later', dayOffset };
}
