/**
 * Where the instrument card is and how big it is.
 *
 * Wave 5 made the card's *size* a mode (`./hudmode.ts`) and let the stylesheet
 * decide when there was no room for it — a ladder of `@container` queries that
 * ended in `#hud { display: none }`. That last step was the bug the user
 * reported as "the HUD window has disappeared": at 1024x700, and at 1280x800 in
 * Russian once the narration band grew, the scene band between the camera tools
 * and the narration is under 92 px and the card deleted itself, chip and all.
 * An instrument panel that removes itself because the layout is tight is the
 * wrong answer; the right one is to let the user put it where they want it.
 *
 * So placement is now a user decision with two states, and this module owns the
 * arithmetic behind both — with no DOM and no `window` in it, the same way the
 * mode state machine is kept out of `./hud.ts`:
 *
 * - `floating` — a window inside the viewport, dragged by its header and
 *   resized from its bottom-right corner. Never hidden by the layout.
 * - `docked` — the same card as an inline block at the top of the telemetry
 *   panel, where it cannot cover the picture at all. The default at phone
 *   width, where a floating window would be most of the screen.
 *
 * The geometry is split, and the split is the point of `HudFrame`:
 *
 * - the **position** is fractions of the viewport, so a window dragged into the
 *   bottom-right corner of a 1480 px viewport is still in the bottom-right
 *   corner of a 1024 px one;
 * - the **size** is CSS pixels, because a window manager does not resize your
 *   windows when the screen changes. Storing the size as a fraction too looked
 *   symmetrical and was a smaller copy of the bug this module exists to fix: a
 *   default 176x148 card placed at 1280x800 came back 197x91 at 1024x700, and
 *   the Stage and Δv rows were cut off — readouts disappearing without the user
 *   asking for it. A pixel size degrades to "clamped to fit" on a small screen
 *   instead, which is a size the user can see and drag back out.
 *
 * Every value that comes back out of storage is clamped anyway: neither unit
 * protects against a hand-edited key or a build that measured differently.
 */

export type HudPlacement = 'floating' | 'docked';

export const HUD_PLACEMENTS: readonly HudPlacement[] = ['floating', 'docked'];

/** Where the placement and the window's geometry are remembered. */
export const HUD_LAYOUT_STORAGE_KEY = 'orbitlab.hudLayout';

/** A window rectangle in CSS pixels, relative to the viewport's top-left. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The stored form of that rectangle: where it is as a fraction of the viewport,
 * how big it is in pixels. See the header for why the two halves differ.
 */
export interface HudFrame {
  /** left edge, as a fraction of the viewport width */
  fx: number;
  /** top edge, as a fraction of the viewport height */
  fy: number;
  /** width, in CSS pixels */
  w: number;
  /** height, in CSS pixels */
  h: number;
}

/** The box the window has to stay inside (the viewport overlay). */
export interface Size {
  width: number;
  height: number;
}

export interface HudLayout {
  placement: HudPlacement;
  /** the floating window's geometry */
  frame: HudFrame;
  /**
   * The placement is the app coping with a viewport too small to hold a window,
   * not something the user asked for.
   *
   * Present only when it is true, and never written to storage: it is what lets
   * `Hud` float the card again by itself when the box grows back. Without it a
   * card docked on the LOAD path stayed docked for ever — the constructor
   * silently turned a stored `floating` into `docked` and nothing remembered
   * that the stored value was still the user's intention.
   */
  forced?: boolean;
}

/** The two `Storage` methods this module uses, so a test needs no DOM. */
export interface LayoutStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Smallest window worth drawing: the header strip plus two rows of the compact
 * grid. Below this the card is not instrumentation any more, and the user has
 * `hidden` (H) if what they want is the picture.
 */
export const HUD_MIN_W = 150;
export const HUD_MIN_H = 90;
/** The default window: the width of the wave-5 compact card, seven rows tall. */
export const HUD_DEFAULT_W = 176;
export const HUD_DEFAULT_H = 148;
/** Gap between the default window and the viewport edge. */
export const HUD_EDGE = 16;
/**
 * Default distance from the top of the viewport: clear of the camera tool
 * column (three 32 px buttons under the mission title). `Hud` measures the real
 * offset from the DOM and passes it in; this is the fallback and the value the
 * unit tests pin.
 */
export const HUD_DEFAULT_TOP = 190;
/**
 * The camera tool buttons and the gap the card keeps from them.
 *
 * Only used by the fall-back in `defaultRect`: when the band under the tool
 * column is too short for even the smallest window, the default steps to the
 * LEFT of the column instead of sliding up over it (see there).
 */
export const HUD_TOOL_COLUMN = 32;
export const HUD_TOOL_GAP = 12;
/**
 * What `full` mode needs to be worth switching to, in window pixels.
 *
 * `HUD_FULL_MIN_H` is the `@container hudwin (max-height: 200px)` step in
 * style.css, measured on the card: at or under it the full grid gives up and
 * re-draws the compact one, which is what made `H` a no-op at the default
 * 176x148 window — the mode changed and nothing on screen did. A window this
 * tall shows the ten primary readouts instead.
 *
 * `HUD_FULL_W`/`HUD_FULL_H` are the size the card is grown TO: 300 px is the
 * two-column step (the four-column grid needs 400 px in English and 480 in
 * Russian, which is half the picture on a laptop), and at 300 px the ten
 * primary rows and the status line measure 199 px in all three languages.
 */
export const HUD_FULL_MIN_H = 202;
export const HUD_FULL_W = 300;
export const HUD_FULL_H = 216;
/** Keep in step with the phone breakpoint in `style.css` and `./hud.ts`. */
export const HUD_PHONE_MAX_WIDTH = 860;
/**
 * A stored w/h at or below this is a *fraction* written by the first build of
 * this feature, not a pixel size — no window is one and a half pixels wide.
 * The key is upgraded in place on the next save rather than thrown away, so a
 * user who had already placed their card keeps it instead of finding it at the
 * 150x90 minimum.
 */
const LEGACY_FRACTION_MAX = 1.5;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function finite(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function isHudPlacement(value: unknown): value is HudPlacement {
  return typeof value === 'string' && (HUD_PLACEMENTS as readonly string[]).includes(value);
}

/**
 * Is there room for a floating window at all?
 *
 * Not a phone test — a phone has plenty of room for a 150x90 window. This is
 * the degenerate case: a viewport smaller than the smallest useful card, which
 * happens in an embedded frame and for a few animation frames while the
 * three-column layout reflows. The float control is disabled there rather than
 * producing a window that is bigger than the picture it floats over.
 */
export function canFloat(vp: Size): boolean {
  return vp.width >= HUD_MIN_W && vp.height >= HUD_MIN_H;
}

/**
 * Fit a pixel rectangle inside the viewport: size first, then position.
 *
 * Order matters. Clamping the position against the *requested* size lets a
 * window that is wider than the viewport sit at a negative x and hang off both
 * edges; clamping the size first means the position is always solvable. A
 * viewport narrower than `HUD_MIN_W` (see `canFloat`) relaxes the minimum
 * rather than returning an impossible range.
 */
export function clampRect(rect: Rect, vp: Size): Rect {
  const maxW = Math.max(1, vp.width);
  const maxH = Math.max(1, vp.height);
  const w = clamp(finite(rect.w) ? rect.w : HUD_DEFAULT_W, Math.min(HUD_MIN_W, maxW), maxW);
  const h = clamp(finite(rect.h) ? rect.h : HUD_DEFAULT_H, Math.min(HUD_MIN_H, maxH), maxH);
  return {
    x: clamp(finite(rect.x) ? rect.x : 0, 0, Math.max(0, maxW - w)),
    y: clamp(finite(rect.y) ? rect.y : 0, 0, Math.max(0, maxH - h)),
    w,
    h,
  };
}

/**
 * The window's home: top-right of the viewport, below the camera tools.
 *
 * The card is fitted UNDER `top`, rather than being given the full default
 * height and left to the clamp. That is the difference between a default and a
 * default that works: `clampRect` fits the size first and then slides the
 * position to make it fit, so asking for a 148 px card at y = 189 in a 319 px
 * band came back at y = 170.7 — eight pixels ABOVE the bottom of the camera
 * tool column (179.2), with the card over the Full screen button and its own ⌖
 * button taking the click meant for it. Measured at 1024x700, in English and in
 * Russian. Shortening the card instead keeps the top edge where it was asked
 * for; `HUD_MIN_H` is the floor, because a card below that is not instrumentation.
 *
 * Only when not even `HUD_MIN_H` fits under the tool column does the default
 * move — to the LEFT of the column, where it is still clear of the three
 * buttons, rather than on top of them.
 */
export function defaultRect(vp: Size, top: number = HUD_DEFAULT_TOP): Rect {
  const w = Math.min(HUD_DEFAULT_W, Math.max(1, vp.width));
  const y = finite(top) ? top : HUD_DEFAULT_TOP;
  // The gate is the room under the tool column; the edge gap is a margin the
  // card gives up before its height does, so a band with exactly `HUD_MIN_H`
  // under the tools still gets its card there rather than beside them.
  if (vp.height - y >= HUD_MIN_H) {
    const h = clamp(vp.height - y - HUD_EDGE, HUD_MIN_H, HUD_DEFAULT_H);
    return clampRect({ x: vp.width - HUD_EDGE - w, y, w, h }, vp);
  }
  const h = clamp(vp.height - 2 * HUD_EDGE, HUD_MIN_H, HUD_DEFAULT_H);
  return clampRect({
    x: vp.width - HUD_EDGE - HUD_TOOL_COLUMN - HUD_TOOL_GAP - w,
    y: vp.height - HUD_EDGE - h,
    w,
    h,
  }, vp);
}

/** Is the viewport tall enough for `full` mode to show more than `compact`? */
export function canShowFull(vp: Size): boolean {
  return vp.height >= HUD_FULL_MIN_H;
}

/**
 * The window `full` mode needs — the one it already has, when that is big enough.
 *
 * `full` is a promise (README and the user guide both describe the complete
 * instrument grid) that the default window could not keep: at 176x148 the
 * container queries in style.css re-draw the compact grid, so pressing `H` on a
 * first visit changed the mode, the tooltip and nothing else. The card grows
 * itself to the size the promise needs and `Hud` puts it back when the cycle
 * steps off `full`. It never shrinks a window: a user who has already dragged
 * theirs wider than this keeps every pixel of it.
 */
export function fullRect(from: Rect, vp: Size): Rect {
  return clampRect({
    x: from.x,
    y: from.y,
    w: Math.max(from.w, Math.min(HUD_FULL_W, Math.max(1, vp.width - 2 * HUD_EDGE))),
    h: Math.max(from.h, HUD_FULL_H),
  }, vp);
}

/**
 * Keep a box inside the viewport WITHOUT touching its size.
 *
 * `clampRect` holds the size at `HUD_MIN_W`x`HUD_MIN_H`, which is right for a
 * window and wrong for the `hidden` chip: the chip is 73x22 and clamping it as
 * a window inflated it to 150x90, which is the invisible rectangle the drag was
 * off by in the first place. The chip's size is measured from the DOM, not
 * chosen, so here only the position is in question.
 */
export function clampPos(rect: Rect, vp: Size): Rect {
  const w = finite(rect.w) ? rect.w : HUD_DEFAULT_W;
  const h = finite(rect.h) ? rect.h : HUD_DEFAULT_H;
  return {
    x: clamp(finite(rect.x) ? rect.x : 0, 0, Math.max(0, vp.width - w)),
    y: clamp(finite(rect.y) ? rect.y : 0, 0, Math.max(0, vp.height - h)),
    w,
    h,
  };
}

/**
 * Grow or shrink a window from its top-left corner.
 *
 * The corner grip may only change the size, never the position. `clampRect`
 * alone does not give that: it fits the size first and then the position, so a
 * window already flush with the right-hand edge answered a "make me 220 px
 * wider" gesture by getting wider *and* sliding 220 px to the left. Capping the
 * size at the distance from the window's own top-left to the viewport edge
 * makes the drag stop at the edge instead, which is what every window manager
 * does.
 */
export function resizeRect(from: Rect, dw: number, dh: number, vp: Size): Rect {
  return clampRect({
    x: from.x,
    y: from.y,
    w: Math.min(from.w + dw, Math.max(1, vp.width - from.x)),
    h: Math.min(from.h + dh, Math.max(1, vp.height - from.y)),
  }, vp);
}

/** Pixels to the stored form: the position relative to the viewport, the size as it is. */
export function toFrame(rect: Rect, vp: Size): HudFrame {
  return { fx: rect.x / Math.max(1, vp.width), fy: rect.y / Math.max(1, vp.height), w: rect.w, h: rect.h };
}

/** The stored form back to pixels for *this* viewport, always inside it. */
export function toPixels(frame: HudFrame, vp: Size): Rect {
  return clampRect({ x: frame.fx * vp.width, y: frame.fy * vp.height, w: frame.w, h: frame.h }, vp);
}

/** The layout a first visit gets: docked on a phone, floating anywhere else. */
export function defaultLayout(vp: Size, phone: boolean, top?: number): HudLayout {
  const room = canFloat(vp);
  const layout: HudLayout = {
    placement: phone || !room ? 'docked' : 'floating',
    frame: toFrame(defaultRect(vp, top), vp),
  };
  // Docked because there is no room, not because a phone asked: `forced`, so the
  // window comes back by itself when there is room again.
  if (!room && !phone) layout.forced = true;
  return layout;
}

/**
 * Put the window back where it started, keeping the placement the user chose.
 * Bound to the reset button and to a double-click on the header.
 */
export function resetLayout(layout: HudLayout, vp: Size, top?: number): HudLayout {
  return { ...layout, frame: toFrame(defaultRect(vp, top), vp) };
}

/**
 * Make a layout out of whatever came back from storage.
 *
 * Field by field rather than all-or-nothing: a key written by an older build
 * that carries a valid placement and no geometry should still restore the
 * placement, and a damaged size should not cost the user their position. Each
 * half is accepted only if it is finite (and, for the size, a non-empty box);
 * anything else falls back to that half of the default rectangle, and the
 * result is clamped to the viewport by `toPixels` at the point of use anyway.
 */
export function coerceLayout(raw: unknown, vp: Size, phone: boolean, top?: number): HudLayout {
  const fallback = defaultLayout(vp, phone, top);
  if (typeof raw !== 'object' || raw === null) return fallback;
  const o = raw as Record<string, unknown>;
  // What is being ASKED for — the stored placement, or the one a first visit
  // would get if there were room. `fallback.placement` is already coerced, so
  // reading it here would lose the request the moment the viewport is small.
  const placement: HudPlacement = isHudPlacement(o.placement) ? o.placement : (phone ? 'docked' : 'floating');
  const okPos = finite(o.x) && finite(o.y);
  const okSize = finite(o.w) && finite(o.h) && (o.w as number) > 0 && (o.h as number) > 0;
  // A size written as a fraction by the first build of this feature (see
  // `LEGACY_FRACTION_MAX`) is expanded against this viewport rather than read
  // as a one-pixel window.
  const legacy = okSize && (o.w as number) <= LEGACY_FRACTION_MAX && (o.h as number) <= LEGACY_FRACTION_MAX;
  const stored: HudFrame = {
    fx: okPos ? (o.x as number) : fallback.frame.fx,
    fy: okPos ? (o.y as number) : fallback.frame.fy,
    w: okSize ? (o.w as number) * (legacy ? vp.width : 1) : fallback.frame.w,
    h: okSize ? (o.h as number) * (legacy ? vp.height : 1) : fallback.frame.h,
  };
  const frame = toFrame(toPixels(stored, vp), vp);
  // A stored `floating` in a viewport that cannot hold a window is honoured as
  // an intention but not as a state: the card docks, and floating comes back by
  // itself when the window is big enough again. `forced` is how the caller
  // learns that this dock is the app's and not the user's — the override was
  // invisible on the load path before, so a card docked by the constructor
  // never floated again however big the viewport grew.
  const forced = placement === 'floating' && !canFloat(vp);
  const layout: HudLayout = { placement: forced ? 'docked' : placement, frame };
  if (forced) layout.forced = true;
  return layout;
}

/**
 * The remembered layout, or the default on a first visit.
 *
 * Every access is guarded twice: reading `localStorage` throws outright in a
 * browser configured to block site data, and `JSON.parse` throws on anything
 * that is not JSON — including the plain `'compact'` that an older key of a
 * similar name holds.
 */
export function loadHudLayout(store: LayoutStore | null | undefined, vp: Size, phone: boolean, top?: number): HudLayout {
  let raw: unknown = null;
  try {
    const text = store ? store.getItem(HUD_LAYOUT_STORAGE_KEY) : null;
    raw = text === null ? null : JSON.parse(text);
  } catch {
    raw = null;
  }
  return coerceLayout(raw, vp, phone, top);
}

/** Remember the layout. A storage that refuses is not an error worth reporting. */
export function saveHudLayout(store: LayoutStore | null | undefined, layout: HudLayout): void {
  try {
    const f = layout.frame;
    store?.setItem(HUD_LAYOUT_STORAGE_KEY, JSON.stringify({
      placement: layout.placement,
      // four decimals of a fraction is a quarter of a pixel on a 4K display,
      // and keeps the stored value readable when someone inspects it
      x: Number(f.fx.toFixed(4)),
      y: Number(f.fy.toFixed(4)),
      // pixels, and a window is never placed on a half one
      w: Math.round(f.w),
      h: Math.round(f.h),
    }));
  } catch {
    /* private window, or site data blocked: the choice lasts this session */
  }
}
