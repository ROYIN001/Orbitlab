/**
 * Where the instrument card is and how big it is (`src/ui/hudlayout.ts`).
 *
 * The regression this module exists to prevent is "the HUD is gone": a card
 * that is off screen is the same failure as a card the stylesheet deleted, and
 * the only thing standing between the user and it is the clamp. So the clamp is
 * tested in all four directions, across a viewport resize, and against every
 * shape of junk a `localStorage` key can hold — including a value written by an
 * older build and a storage that throws on contact.
 */
import { describe, expect, it } from 'vitest';
import {
  canFloat,
  canShowFull,
  clampPos,
  clampRect,
  coerceLayout,
  defaultLayout,
  defaultRect,
  fullRect,
  HUD_DEFAULT_H,
  HUD_DEFAULT_TOP,
  HUD_DEFAULT_W,
  HUD_EDGE,
  HUD_FULL_H,
  HUD_FULL_MIN_H,
  HUD_FULL_W,
  HUD_LAYOUT_STORAGE_KEY,
  HUD_MIN_H,
  HUD_MIN_W,
  HUD_TOOL_COLUMN,
  HUD_TOOL_GAP,
  isHudPlacement,
  loadHudLayout,
  resetLayout,
  resizeRect,
  saveHudLayout,
  toFrame,
  toPixels,
  type LayoutStore,
  type Rect,
  type Size,
} from '../src/ui/hudlayout';

/** A `Storage`-shaped map, and one that refuses every call. */
function memoryStore(initial?: string): LayoutStore & { value: string | null } {
  return {
    value: initial ?? null,
    getItem(key: string): string | null {
      return key === HUD_LAYOUT_STORAGE_KEY ? this.value : null;
    },
    setItem(key: string, value: string): void {
      if (key === HUD_LAYOUT_STORAGE_KEY) this.value = value;
    },
  };
}

const hostileStore: LayoutStore = {
  getItem(): string | null {
    throw new DOMException('The operation is insecure.');
  },
  setItem(): void {
    throw new DOMException('The operation is insecure.');
  },
};

/** The measured viewport of a 1480x830 window's flight column. */
const DESKTOP: Size = { width: 900, height: 620 };
/** …and of a 375x812 phone, where the viewport is 66 vh of a narrow column. */
const PHONE: Size = { width: 351, height: 536 };

const inside = (r: Rect, vp: Size): boolean =>
  r.x >= -1e-9 && r.y >= -1e-9 && r.x + r.w <= vp.width + 1e-9 && r.y + r.h <= vp.height + 1e-9;

describe('HUD window geometry', () => {
  it('parks the default window top-right, clear of the camera tools', () => {
    const r = defaultRect(DESKTOP);
    expect(r).toEqual({ x: DESKTOP.width - HUD_EDGE - HUD_DEFAULT_W, y: HUD_DEFAULT_TOP, w: HUD_DEFAULT_W, h: HUD_DEFAULT_H });
    expect(inside(r, DESKTOP)).toBe(true);
    // a measured offset from the DOM overrides the constant
    expect(defaultRect(DESKTOP, 64).y).toBe(64);
  });

  /**
   * The regression this pins, measured at 1024x700 with storage cleared, in
   * English and in Russian: the scene band is 713x319 and the camera tool
   * column ends at 179.2, so `defaultTop` asks for y = 189. The card was given
   * the full 148 px height anyway, did not fit, and `clampRect` — which fits
   * the size first and then slides the position — put it back at y = 170.7,
   * eight pixels ABOVE the bottom of the tool column. On screen that was the
   * card over the Full screen button (btn-fullscreen bottom 251.9, card top
   * 243.7) and the card's own ⌖ taking the click meant for full screen.
   *
   * The card is fitted under `top` instead: shorter, never higher.
   */
  it('fits the default card UNDER the camera tools rather than sliding it up over them', () => {
    const band: Size = { width: 713, height: 319 };
    const top = 189;
    const r = defaultRect(band, top);
    expect(r.y).toBe(top);
    expect(r.h).toBe(band.height - top - HUD_EDGE); // 114: shortened to fit
    expect(r.h).toBeGreaterThanOrEqual(HUD_MIN_H);
    expect(inside(r, band)).toBe(true);
    // the rule, not the one measurement: while there is room under `top` for
    // the smallest useful card, the card starts at `top`
    for (let h = top + HUD_MIN_H; h <= 700; h += 7) {
      const rect = defaultRect({ width: 713, height: h }, top);
      expect(rect.y).toBeGreaterThanOrEqual(top);
      expect(inside(rect, { width: 713, height: h })).toBe(true);
    }
  });

  /**
   * And when not even `HUD_MIN_H` fits under the tool column, the card steps to
   * the LEFT of it instead of on top of it: at 900x220 the band under a 190 px
   * offset is 14 px.
   */
  it('parks the default beside the tool column when nothing fits under it', () => {
    const short: Size = { width: 900, height: 220 };
    const r = defaultRect(short, HUD_DEFAULT_TOP);
    expect(r.x + r.w).toBe(short.width - HUD_EDGE - HUD_TOOL_COLUMN - HUD_TOOL_GAP);
    expect(r.h).toBe(HUD_DEFAULT_H);
    expect(r.y + r.h).toBe(short.height - HUD_EDGE);
    expect(inside(r, short)).toBe(true);
    // …and it is clear of the column, which is the point of moving at all
    expect(r.x + r.w).toBeLessThanOrEqual(short.width - HUD_TOOL_COLUMN);
    // a viewport too short for even that keeps the minimum height and the clamp
    const tiny: Size = { width: 400, height: 100 };
    expect(inside(defaultRect(tiny, HUD_DEFAULT_TOP), tiny)).toBe(true);
  });

  it('clamps a window back inside the viewport from all four directions', () => {
    const vp: Size = { width: 800, height: 500 };
    const box = { w: 200, h: 140 };
    expect(clampRect({ x: -400, y: 60, ...box }, vp).x).toBe(0);
    expect(clampRect({ x: 60, y: -400, ...box }, vp).y).toBe(0);
    expect(clampRect({ x: 5000, y: 60, ...box }, vp).x).toBe(800 - 200);
    expect(clampRect({ x: 60, y: 5000, ...box }, vp).y).toBe(500 - 140);
    // a corner at once, and the size is untouched by any of it
    const c = clampRect({ x: 5000, y: 5000, ...box }, vp);
    expect(c).toEqual({ x: 600, y: 360, w: 200, h: 140 });
  });

  it('holds the size between the minimum and the viewport', () => {
    const vp: Size = { width: 800, height: 500 };
    expect(clampRect({ x: 0, y: 0, w: 10, h: 10 }, vp)).toEqual({ x: 0, y: 0, w: HUD_MIN_W, h: HUD_MIN_H });
    expect(clampRect({ x: 0, y: 0, w: 9000, h: 9000 }, vp)).toEqual({ x: 0, y: 0, w: 800, h: 500 });
    // A viewport smaller than the minimum window relaxes the minimum instead of
    // producing an empty range (lo > hi) and a NaN of a rectangle.
    const tiny: Size = { width: 90, height: 40 };
    const r = clampRect({ x: 0, y: 0, w: HUD_MIN_W, h: HUD_MIN_H }, tiny);
    expect(r).toEqual({ x: 0, y: 0, w: 90, h: 40 });
    expect(canFloat(tiny)).toBe(false);
    expect(canFloat({ width: HUD_MIN_W, height: HUD_MIN_H })).toBe(true);
  });

  it('keeps a corner window in its corner when the viewport is resized', () => {
    const big: Size = { width: 1200, height: 700 };
    const small: Size = { width: 500, height: 300 };
    // dragged hard into the bottom-right corner of the big viewport
    const placed = clampRect({ x: 9999, y: 9999, w: 260, h: 180 }, big);
    const frame = toFrame(placed, big);
    const moved = toPixels(frame, small);
    expect(inside(moved, small)).toBe(true);
    // still in the corner, to the pixel: the position fraction carries the edge
    // with it, and the clamp finishes the job
    expect(moved.x + moved.w).toBeCloseTo(small.width, 6);
    expect(moved.y + moved.h).toBeCloseTo(small.height, 6);
    // and a viewport that has shrunk below the window's stored size clamps the
    // size too, rather than letting it hang off two edges
    const cramped = toPixels(frame, { width: 200, height: 120 });
    expect(inside(cramped, { width: 200, height: 120 })).toBe(true);
    expect(cramped.w).toBeLessThanOrEqual(200);
  });

  /**
   * The regression that produced this test: the first build stored w/h as
   * fractions too, so a default card placed at 1280x800 came back 197x91 at
   * 1024x700 with the Stage and Δv rows clipped out of an `overflow: hidden`
   * body. A window keeps the size it was given until it cannot fit.
   */
  it('does not resize the window when the viewport changes size', () => {
    const wide: Size = { width: 637, height: 518 };
    const short: Size = { width: 713, height: 319 };
    const frame = toFrame({ x: 300, y: 200, w: 176, h: 148 }, wide);
    const moved = toPixels(frame, short);
    expect(moved.w).toBe(176);
    expect(moved.h).toBe(148);
    expect(inside(moved, short)).toBe(true);
    // the phone case, which used to come back as a 321x215 window over the vehicle
    const phoneFrame = toFrame({ x: 20, y: 40, w: 176, h: 148 }, PHONE);
    const back = toPixels(phoneFrame, { width: 637, height: 518 });
    expect(back.w).toBe(176);
    expect(back.h).toBe(148);
    // only a viewport that genuinely cannot hold it shrinks it
    const tiny = toPixels(frame, { width: 160, height: 100 });
    expect(tiny.w).toBe(160);
    expect(tiny.h).toBe(100);
  });

  it('round-trips a rectangle through the stored form unchanged', () => {
    const r = { x: 123, y: 45, w: 210, h: 160 };
    const back = toPixels(toFrame(r, DESKTOP), DESKTOP);
    expect(back.x).toBeCloseTo(r.x, 6);
    expect(back.y).toBeCloseTo(r.y, 6);
    expect(back.w).toBe(r.w);
    expect(back.h).toBe(r.h);
  });

  /**
   * The grip may only change the size. `clampRect` fits the size first and the
   * position second, so on its own it answered "220 px wider" from a window
   * flush with the right-hand edge by sliding the window 220 px left.
   */
  it('grows a window from the grip without moving it', () => {
    const vp: Size = { width: 637, height: 518 };
    const flush: Rect = { x: 461, y: 100, w: 176, h: 148 };
    const wider = resizeRect(flush, 220, 0, vp);
    expect(wider.x).toBe(461);
    expect(wider.y).toBe(100);
    expect(wider.w).toBe(176); // stopped at the edge rather than sliding left
    // room to grow is honoured in full
    const roomy = resizeRect({ x: 20, y: 30, w: 176, h: 148 }, 100, 60, vp);
    expect(roomy).toEqual({ x: 20, y: 30, w: 276, h: 208 });
    // and shrinking still respects the minimum
    const small = resizeRect({ x: 20, y: 30, w: 176, h: 148 }, -500, -500, vp);
    expect(small).toEqual({ x: 20, y: 30, w: HUD_MIN_W, h: HUD_MIN_H });
  });

  /**
   * `clampPos` is `clampRect` without the minimum size, for the one box that is
   * measured rather than chosen: the `hidden` chip. Clamped as a window, the
   * 73x22 chip came back 150x90 — the invisible rectangle whose corner the
   * pointer was dragging instead of the chip's.
   */
  it('clamps the chip by its own size, not by the window minimum', () => {
    const vp: Size = { width: 712, height: 219 };
    const chip = { w: 75, h: 24 };
    expect(clampPos({ x: -500, y: -500, ...chip }, vp)).toEqual({ x: 0, y: 0, ...chip });
    expect(clampPos({ x: 9999, y: 9999, ...chip }, vp)).toEqual({ x: 712 - 75, y: 219 - 24, ...chip });
    // every edge is reachable, which is what the bug was about
    expect(clampPos({ x: 9999, y: 0, ...chip }, vp).x + chip.w).toBe(vp.width);
    expect(clampPos({ x: 0, y: 9999, ...chip }, vp).y + chip.h).toBe(vp.height);
    // and a chip bigger than the box still lands at the origin rather than at a
    // negative offset
    expect(clampPos({ x: 50, y: 50, w: 900, h: 400 }, vp)).toEqual({ x: 0, y: 0, w: 900, h: 400 });
  });
});

/**
 * `full` mode: what the window has to become for the promise to be kept.
 *
 * The bug: at the default 176x148 the container queries in style.css draw the
 * compact grid in `full` mode, so `H` on a first visit changed the mode, the
 * tooltip and nothing else — while README.md and docs/USER-GUIDE.md both
 * describe the complete instrument grid.
 */
describe('HUD full mode geometry', () => {
  it('grows a window that is too small for the full grid', () => {
    const vp: Size = { width: 712, height: 319 };
    const tiny: Rect = { x: 520, y: 189, w: HUD_DEFAULT_W, h: HUD_DEFAULT_H };
    const grown = fullRect(tiny, vp);
    expect(grown.w).toBe(HUD_FULL_W);
    expect(grown.h).toBe(HUD_FULL_H);
    expect(grown.h).toBeGreaterThan(HUD_FULL_MIN_H); // past the compact fall-back
    expect(inside(grown, vp)).toBe(true);
  });

  it('never takes a pixel off a window the user has already made bigger', () => {
    const vp: Size = { width: 900, height: 620 };
    const wide: Rect = { x: 40, y: 60, w: 480, h: 300 };
    expect(fullRect(wide, vp)).toEqual(wide); // already big enough: untouched
    // one axis short is one axis grown
    expect(fullRect({ x: 40, y: 60, w: 480, h: 120 }, vp)).toEqual({ x: 40, y: 60, w: 480, h: HUD_FULL_H });
    expect(fullRect({ x: 40, y: 60, w: 200, h: 300 }, vp)).toEqual({ x: 40, y: 60, w: HUD_FULL_W, h: 300 });
  });

  it('stays inside a viewport that is smaller than the full grid wants', () => {
    const band: Size = { width: 712, height: 219 };
    const r = fullRect({ x: 520, y: 109, w: HUD_DEFAULT_W, h: 92 }, band);
    expect(inside(r, band)).toBe(true);
    expect(r.h).toBe(Math.min(HUD_FULL_H, band.height));
    // a viewport narrower than the two-column grid keeps the window off the edge
    const narrow: Size = { width: 280, height: 400 };
    const n = fullRect({ x: 0, y: 0, w: HUD_MIN_W, h: HUD_MIN_H }, narrow);
    expect(inside(n, narrow)).toBe(true);
    expect(n.w).toBe(narrow.width - 2 * HUD_EDGE);
  });

  /**
   * Where the viewport itself is shorter than the grid needs, `full` would draw
   * the compact card however big the window was made — so the cycle is told to
   * skip it rather than offer a keystroke that changes nothing.
   */
  it('knows when the viewport is too short to offer full at all', () => {
    expect(canShowFull({ width: 712, height: 319 })).toBe(true);
    expect(canShowFull({ width: 712, height: HUD_FULL_MIN_H })).toBe(true);
    expect(canShowFull({ width: 712, height: HUD_FULL_MIN_H - 1 })).toBe(false);
    expect(canShowFull({ width: 900, height: 120 })).toBe(false);
  });
});

describe('HUD placement', () => {
  it('floats on a desktop and docks on a phone by default', () => {
    expect(defaultLayout(DESKTOP, false).placement).toBe('floating');
    expect(defaultLayout(PHONE, true).placement).toBe('docked');
    // …and docks anywhere there is no room for a window at all
    expect(defaultLayout({ width: 100, height: 60 }, false).placement).toBe('docked');
    expect(isHudPlacement('floating')).toBe(true);
    expect(isHudPlacement('Floating')).toBe(false);
    expect(isHudPlacement(undefined)).toBe(false);
  });

  it('honours a phone user who asked for a floating window', () => {
    // The phone default is docked; it is not a prohibition. A stored choice
    // survives, because the window fits.
    const stored = JSON.stringify({ placement: 'floating', x: 0.1, y: 0.1, w: 200, h: 150 });
    expect(loadHudLayout(memoryStore(stored), PHONE, true).placement).toBe('floating');
  });

  it('resets the geometry without changing the placement', () => {
    const dragged = { placement: 'docked' as const, frame: toFrame({ x: 4, y: 7, w: 400, h: 400 }, DESKTOP) };
    const reset = resetLayout(dragged, DESKTOP);
    expect(reset.placement).toBe('docked');
    expect(toPixels(reset.frame, DESKTOP)).toEqual(defaultRect(DESKTOP));
  });
});

describe('HUD layout storage', () => {
  it('defaults on a first visit and rejects junk', () => {
    const fresh = defaultLayout(DESKTOP, false);
    expect(loadHudLayout(memoryStore(), DESKTOP, false)).toEqual(fresh);
    expect(loadHudLayout(null, DESKTOP, false)).toEqual(fresh);
    // not JSON at all — including the bare word an older mode key holds
    expect(loadHudLayout(memoryStore('compact'), DESKTOP, false)).toEqual(fresh);
    expect(loadHudLayout(memoryStore('{'), DESKTOP, false)).toEqual(fresh);
    // JSON, but not an object
    expect(loadHudLayout(memoryStore('42'), DESKTOP, false)).toEqual(fresh);
    expect(loadHudLayout(memoryStore('null'), DESKTOP, false)).toEqual(fresh);
    expect(loadHudLayout(memoryStore('[1,2,3]'), DESKTOP, false)).toEqual(fresh);
    // an object with nothing usable in it
    expect(loadHudLayout(memoryStore('{"placement":"sideways"}'), DESKTOP, false)).toEqual(fresh);
  });

  it('takes the half of a damaged record that is still valid', () => {
    // placement good, geometry missing: the placement survives
    const l = loadHudLayout(memoryStore('{"placement":"docked"}'), DESKTOP, false);
    expect(l.placement).toBe('docked');
    expect(toPixels(l.frame, DESKTOP)).toEqual(defaultRect(DESKTOP));
    // geometry good, placement missing: the default placement applies
    const g = loadHudLayout(memoryStore('{"x":0.1,"y":0.2,"w":300,"h":220}'), DESKTOP, false);
    expect(g.placement).toBe('floating');
    expect(g.frame.fx).toBeCloseTo(0.1, 6);
    expect(g.frame.w).toBe(300);
    // position good, size junk: the position is kept and the default size fills in
    const half = loadHudLayout(memoryStore('{"x":0.1,"y":0.2,"w":"wide","h":220}'), DESKTOP, false);
    expect(half.frame.fx).toBeCloseTo(0.1, 6);
    expect(half.frame.w).toBe(HUD_DEFAULT_W);
    expect(half.frame.h).toBe(HUD_DEFAULT_H);
  });

  /**
   * The first build of this feature wrote all four numbers as fractions. Read
   * as pixels those are a window a pixel and a half wide, which the clamp would
   * turn into the 150x90 minimum — so anyone who had already placed their card
   * would have found it shrunk. A size at or below 1.5 is expanded instead.
   */
  it('upgrades a size written as a fraction by the previous build', () => {
    const legacy = JSON.stringify({ placement: 'floating', x: 0.7, y: 0.3, w: 0.2763, h: 0.2857 });
    const l = loadHudLayout(memoryStore(legacy), DESKTOP, false);
    expect(l.frame.w).toBeCloseTo(0.2763 * DESKTOP.width, 3);
    expect(l.frame.h).toBeCloseTo(0.2857 * DESKTOP.height, 3);
    expect(inside(toPixels(l.frame, DESKTOP), DESKTOP)).toBe(true);
    // …and a genuine pixel size in the same range as the minimum is untouched
    const px = loadHudLayout(memoryStore('{"x":0.1,"y":0.1,"w":176,"h":148}'), DESKTOP, false);
    expect(px.frame.w).toBe(176);
  });

  it('clamps a stored rectangle that no longer fits', () => {
    // hand-edited, or written by a build that measured differently: off the
    // right-hand edge, and taller than the viewport
    const stored = JSON.stringify({ placement: 'floating', x: 3, y: -2, w: 4000, h: 9000 });
    const l = loadHudLayout(memoryStore(stored), DESKTOP, false);
    const px = toPixels(l.frame, DESKTOP);
    expect(inside(px, DESKTOP)).toBe(true);
    // NaN and Infinity never become a rectangle
    // The position falls back to the default and the valid 200 px size is kept,
    // so the window lands against the right-hand edge rather than off it.
    const nan = coerceLayout({ placement: 'floating', x: Number.NaN, y: 0.1, w: 200, h: 200 }, DESKTOP, false);
    expect(toPixels(nan.frame, DESKTOP)).toEqual({ x: DESKTOP.width - 200, y: HUD_DEFAULT_TOP, w: 200, h: 200 });
    expect(inside(toPixels(nan.frame, DESKTOP), DESKTOP)).toBe(true);
    const inf = coerceLayout({ placement: 'floating', x: 0.1, y: 0.1, w: Number.POSITIVE_INFINITY, h: 200 }, DESKTOP, false);
    expect(inside(toPixels(inf.frame, DESKTOP), DESKTOP)).toBe(true);
    // a zero-sized box is junk, not a request
    const zero = coerceLayout({ placement: 'floating', x: 0.1, y: 0.1, w: 0, h: 200 }, DESKTOP, false);
    expect(zero.frame.w).toBe(HUD_DEFAULT_W);
    expect(zero.frame.h).toBe(HUD_DEFAULT_H);
  });

  /**
   * …and says so. `forced` is the difference between "the user docked this" and
   * "the app had nowhere to put it": without it the dock imposed on the LOAD
   * path was indistinguishable from a choice, so a card docked by the
   * constructor stayed docked for the rest of the session however big the
   * viewport grew — `Hud` only ever learned about the automatic dock that
   * `onHostResize` imposed.
   */
  it('docks a stored floating window that the viewport cannot hold, and reports it', () => {
    const stored = JSON.stringify({ placement: 'floating', x: 0.1, y: 0.1, w: 200, h: 160 });
    const cramped = loadHudLayout(memoryStore(stored), { width: 80, height: 50 }, false);
    expect(cramped.placement).toBe('docked');
    expect(cramped.forced).toBe(true);
    // the stored intention is still floating, and it comes back with the room
    expect(loadHudLayout(memoryStore(stored), DESKTOP, false).placement).toBe('floating');
    expect(loadHudLayout(memoryStore(stored), DESKTOP, false).forced).toBeUndefined();
    // a dock the user chose is never reported as forced, whatever the viewport
    const chosen = JSON.stringify({ placement: 'docked', x: 0.1, y: 0.1, w: 200, h: 160 });
    expect(loadHudLayout(memoryStore(chosen), { width: 80, height: 50 }, false).forced).toBeUndefined();
    expect(loadHudLayout(memoryStore(chosen), DESKTOP, false).forced).toBeUndefined();
    // a first visit with no room to float is the app coping too…
    expect(defaultLayout({ width: 80, height: 50 }, false).forced).toBe(true);
    expect(coerceLayout({ x: 0.2, y: 0.2, w: 200, h: 160 }, { width: 80, height: 50 }, false).forced).toBe(true);
    // …but a phone is docked by design, not by force
    expect(defaultLayout(PHONE, true).forced).toBeUndefined();
    expect(defaultLayout(DESKTOP, false).forced).toBeUndefined();
    // and the flag survives a reset, which keeps the placement
    expect(resetLayout(cramped, DESKTOP).forced).toBe(true);
  });

  it('round-trips a remembered layout', () => {
    const store = memoryStore();
    const layout = { placement: 'floating' as const, frame: toFrame({ x: 40, y: 80, w: 260, h: 200 }, DESKTOP) };
    saveHudLayout(store, layout);
    expect(store.value).toContain('"placement":"floating"');
    expect(store.value).toContain('"w":260');
    const back = loadHudLayout(store, DESKTOP, false);
    expect(back.placement).toBe('floating');
    expect(toPixels(back.frame, DESKTOP).x).toBeCloseTo(40, 1);
    expect(toPixels(back.frame, DESKTOP).w).toBe(260);
    // …and it survives being restored on a different-sized screen at its own size
    expect(toPixels(back.frame, { width: 1400, height: 900 }).w).toBe(260);
  });

  it('survives a storage that throws', () => {
    expect(loadHudLayout(hostileStore, DESKTOP, false)).toEqual(defaultLayout(DESKTOP, false));
    expect(() => saveHudLayout(hostileStore, defaultLayout(DESKTOP, false))).not.toThrow();
  });
});
