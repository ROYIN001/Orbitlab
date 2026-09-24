/**
 * Head-up display.
 *
 * Frame-driven: `update` takes the `VisualFrame` the user is looking at — the
 * live head or a seeked, interpolated frame — and the recorded event log, and
 * never touches the live `Simulation`. That is what lets the HUD scrub: the
 * numbers and the event ticker rewind with the timeline cursor. The only
 * mission-static thing it needs is the vehicle spec, for stage names
 * (`setVehicle`).
 *
 * Two changes in the design wave, both behavioural rather than decorative:
 *
 * - The phase narration moved out of here into `src/ui/narration.ts`, where it
 *   gets the viewport's bottom band, the mission clock and the latest callout.
 *   The HUD is instrumentation again.
 * - The boxes are built once and only `textContent` is written afterwards
 *   (audit B38). The old code re-parsed ~35 elements of `innerHTML` at 10 Hz
 *   and made the dictionaries an executable surface: a stray `<` in a Thai or
 *   Russian string could break the layout.
 *
 * Wave 5 made the card's *size* a mode rather than a constant. The full grid is
 * 21 readouts and about 390 px of an exterior shot that is often only 640 px
 * wide — reported as "the telemetry window covers too much of the picture", and
 * measurably true: it sat over the vehicle at every mainstream laptop size. The
 * default is now a seven-row compact card small enough to stay clear of the
 * centre line, the full grid is one keystroke away (`H`, or the chip on the
 * card), and nothing is lost either way because the telemetry panel beside the
 * viewport always carries everything. The three-state cycle and its persistence
 * live in `./hudmode.ts`, away from the DOM, and are unit-tested there.
 *
 * Wave 6 makes its *placement* a decision too, because wave 5's other half —
 * a ladder of `@container` queries that ended in `#hud { display: none }` when
 * the scene band was under 92 px — deleted the card outright at 1024x700 and at
 * 1280x800 in Russian. "The HUD window has disappeared" is what that looks like
 * from the outside, and no amount of tuning the threshold fixes a design in
 * which the layout may overrule the user. The card is now either
 *
 * - a **floating window** inside the viewport: dragged by its header strip,
 *   resized from its bottom-right grip, moved and resized from the keyboard
 *   when the header has focus, and never removed by the stylesheet; or
 * - **docked** at the top of the telemetry panel, where it carries every
 *   readout and covers nothing at all. This is the default at phone width.
 *
 * `D` and the ⇥/⇤ button move it between the two. The geometry, its clamp and
 * its persistence are `./hudlayout.ts`, unit-tested without a DOM like the mode
 * machine; what is left here is the drawing and the pointer plumbing.
 */
import type { SimEvent } from '../physics/simulation';
import type { VisualFrame } from '../physics/frame';
import type { VehicleSpec } from '../types';
import { t } from '../i18n';
import { RAD } from '../physics/constants';
import { DESCENT_PHASE_KEYS, hasNextBurn } from './phase';
import { localizeEventParams, stageName } from './names';
import { coerceHudMode, loadHudMode, nextHudMode, saveHudMode, type HudMode, type ModeStore } from './hudmode';
import {
  canFloat,
  canShowFull,
  clampPos,
  clampRect,
  defaultRect,
  fullRect,
  HUD_DEFAULT_TOP,
  HUD_LAYOUT_STORAGE_KEY,
  loadHudLayout,
  resetLayout,
  resizeRect,
  saveHudLayout,
  toFrame,
  toPixels,
  type HudFrame,
  type HudLayout,
  type HudPlacement,
  type Rect,
  type Size,
} from './hudlayout';

export function fmtTime(sec: number): string {
  const sign = sec < 0 ? '-' : '+';
  const a = Math.abs(sec);
  const h = Math.floor(a / 3600);
  const m = Math.floor((a % 3600) / 60);
  const s = Math.floor(a % 60);
  const p = (n: number) => String(n).padStart(2, '0');
  return `T${sign}${h > 0 ? h + ':' : ''}${p(m)}:${p(s)}`;
}

/** How long a callout stays on the ticker, in mission-time seconds. */
const TICKER_WINDOW = 14;
const TICKER_ROWS = 4;

/**
 * The readouts are split by **what has to survive a short viewport**, not by
 * subsystem.
 *
 * The first grid is the primary flight instrument set: where the vehicle is,
 * how fast it is going, what orbit that adds up to and how much Δv is left. It
 * is never hidden while the HUD is on screen. The second grid is detail —
 * engine numbers, the atmospheric readouts, the slow orbital elements — and is
 * the half that gives way when the viewport is short (see the `scenefill`
 * container queries in style.css).
 *
 * The previous split was propulsion / trajectory, which meant a 1280x800
 * laptop showed throttle, thrust and mass and hid altitude, speed, apoapsis,
 * periapsis and Δv: the primary instruments of a launch simulator.
 */
const PRIMARY_ROWS = ['altitude', 'speed', 'vertical', 'q', 'apoapsis', 'periapsis', 'inclination', 'dv', 'stage', 'throttle'] as const;
/** Secondary detail; the first thing to go when the viewport is short. */
const SECONDARY_ROWS = ['thrust', 'mass', 'g', 'pitch', 'airspeed', 'mach', 'raan', 'period', 'downrange', 'latlon', 'warp'] as const;

/**
 * The compact card: six rows and a status line, in two columns.
 *
 * It is the primary set condensed rather than a different set — the apsides
 * share a row (`250 × 180 km`, which is how an orbit is spoken anyway) and so
 * do the active stage and its throttle, because those two are read together.
 * The labels are their own dictionary keys, not the full ones: "Вертикальная
 * скорость" is 21 characters and would decide the width of the whole card.
 */
const COMPACT_ROWS: ReadonlyArray<readonly [id: string, labelKey: string]> = [
  ['c.altitude', 'hud.shortAltitude'],
  ['c.speed', 'hud.shortSpeed'],
  ['c.vertical', 'hud.shortVertical'],
  ['c.apsides', 'hud.shortApsides'],
  ['c.stage', 'hud.shortStage'],
  ['c.dv', 'hud.shortDv'],
];

/** Dictionary key naming each mode, for the toggle's tooltip and a11y name. */
const MODE_LABEL: Record<HudMode, string> = {
  compact: 'hud.cardCompact',
  full: 'hud.cardFull',
  hidden: 'hud.cardHidden',
};

/** Keep in step with the phone breakpoint in `style.css`. */
const PHONE_QUERY = '(max-width: 860px)';

/** Keyboard move/resize step on the header, and its shift-modified version. */
const KEY_STEP = 10;
const KEY_STEP_BIG = 40;

/** Glyphs for the placement button, by the placement it would switch *to*. */
const PLACE_GLYPH: Record<HudPlacement, string> = { docked: '⇥', floating: '⇤' };
const PLACE_LABEL: Record<HudPlacement, string> = { docked: 'hud.dock', floating: 'hud.float' };

/**
 * The chip `hidden` mode paints, for the frame before it can be measured.
 *
 * Three 21 px buttons, their gaps, the header's padding and its border: 73x22
 * as measured. It is the *window's* size in that mode, not just the header's —
 * see `chipSize`.
 */
const HUD_CHIP_W = 73;
const HUD_CHIP_H = 22;

interface Row {
  key: HTMLElement;
  value: HTMLElement;
  /** dictionary key of the label, so the compact rows can carry short ones */
  labelKey: string;
  /** last string written, so an unchanged value writes nothing */
  shown: string;
}

/** `localStorage`, or null where it is blocked (a private window throws here). */
function safeStorage(): ModeStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export class Hud {
  private root: HTMLElement;
  private ticker: HTMLElement;
  private body: HTMLElement;
  private header: HTMLElement;
  private titleEl: HTMLElement;
  private toggle: HTMLButtonElement;
  private placeBtn: HTMLButtonElement;
  private placeGlyph: HTMLElement;
  private resetBtn: HTMLButtonElement;
  private grip: HTMLElement;
  private status: HTMLElement;
  private replayTag: HTMLElement;
  private note: HTMLElement;
  private rows: Record<string, Row> = {};
  private vehicle: VehicleSpec | null = null;
  private shownStatus = '';
  private shownNote = '';
  /** index range of the events currently on the ticker, so the DOM is only rebuilt when it changes */
  private tickFrom = -1;
  private tickTo = -1;
  private tickEvents: readonly SimEvent[] | null = null;
  private store: ModeStore | null = safeStorage();
  private phoneQuery: MediaQueryList | null = null;
  private modeState: HudMode = 'compact';
  /** where the window goes when it floats (its original parent) and when it docks */
  private floatHost: HTMLElement | null;
  private dockHost: HTMLElement | null;
  private layout: HudLayout;
  /** live drag/resize, or null. `from` is the rectangle the gesture started on. */
  private gesture: { kind: 'move' | 'size'; id: number; x: number; y: number; from: Rect } | null = null;
  /**
   * Nobody has moved or resized the window yet, so its geometry is still the
   * default and should be *re-derived* on every `applyLayout` rather than
   * carried along as a stored fraction.
   *
   * Without this the default was wrong on every first visit. The card is built
   * from `main.ts`'s constructor, before the three-column workspace has settled
   * and before the mission is previewed — measured at 1480x830, `.scene-ui` is
   * 622 px tall then and 544 px once the narration band has its text, and the
   * camera tool column has not reached its final position either. The first
   * build of this feature re-derived only from the `.scene-ui` observer, which
   * never fires when the tool column settles (the narration grows *inside*
   * `.scene-ui`, so its own box does not change): the card shipped 9 px too
   * high, and its ⌖ button sat over the bottom of the Full screen button, so a
   * click meant for full screen reset the card's layout instead. The re-derive
   * now happens wherever the layout is written, and `settleDefault` forces one
   * after the first two frames.
   */
  private pristine: boolean;
  /**
   * The card is docked because the viewport is too small to hold a window, not
   * because anyone asked. Remembered so the window can come back by itself, and
   * never saved.
   */
  private forcedDock = false;
  /** watches the viewport so the window is re-clamped when it changes size */
  private hostObserver: ResizeObserver | null = null;
  /**
   * The window `full` grew out of, and whether it was still a measurement.
   *
   * Set only when `cycleMode` had to make the window bigger, and dropped the
   * moment the user moves or resizes it themselves: their geometry is theirs,
   * and stepping off `full` must not take it back.
   */
  private beforeFull: { frame: HudFrame; pristine: boolean } | null = null;
  /**
   * The user has sized the window while `full` was on screen, so `full` never
   * grows it again — including after a step round the cycle. Cleared by the
   * reset button, which is the "start again" control.
   */
  private fullSized = false;
  /** The chip's measured box in `hidden` mode; re-measured when it can change. */
  private chipBox: { w: number; h: number } | null = null;

  constructor(root: HTMLElement, ticker: HTMLElement, dockHost?: HTMLElement | null) {
    this.root = root;
    this.ticker = ticker;
    this.floatHost = root.parentElement;
    this.dockHost = dockHost ?? null;
    // ── chrome ───────────────────────────────────────────────────────────────
    // The header is the drag handle, the title and the three controls, and it
    // is the only focusable part of the window: a `role="group"` with an
    // accessible name that says what the arrow keys do, so the whole window is
    // operable without a pointer (and without stealing the arrow keys from the
    // timeline, which is what `onHeaderKey` is careful about).
    this.header = el('div', 'hud-header');
    this.header.tabIndex = 0;
    this.header.setAttribute('role', 'group');
    this.titleEl = el('span', 'hud-title');
    this.placeGlyph = el('span', 'hud-btn-glyph', PLACE_GLYPH.docked);
    this.placeBtn = el('button', 'hud-btn hud-place') as HTMLButtonElement;
    this.placeBtn.type = 'button';
    this.placeBtn.append(this.placeGlyph);
    this.placeBtn.addEventListener('click', () => this.togglePlacement());
    this.toggle = el('button', 'hud-btn hud-toggle') as HTMLButtonElement;
    this.toggle.type = 'button';
    this.toggle.append(el('span', 'hud-btn-glyph', '▤'));
    this.toggle.addEventListener('click', () => this.cycleMode());
    this.resetBtn = el('button', 'hud-btn hud-reset') as HTMLButtonElement;
    this.resetBtn.type = 'button';
    this.resetBtn.append(el('span', 'hud-btn-glyph', '⌖'));
    this.resetBtn.addEventListener('click', () => this.resetPlacement());
    const btns = el('div', 'hud-btns');
    btns.append(this.placeBtn, this.toggle, this.resetBtn);
    this.header.append(this.titleEl, btns);
    // ── readouts ─────────────────────────────────────────────────────────────
    // One card, three grids: the compact six and the full set's two
    // four-column halves. All three are built once and the mode decides which
    // is displayed, so switching costs nothing and no readout has to be
    // re-created. The full set stayed two four-column grids rather than four
    // two-column ones because stacked two-column boxes needed about 370 px of
    // viewport height, which a 1280x800 laptop does not have once the narration
    // band has its share (the same failure mode as audit B31, one layer up).
    this.body = el('div', 'hud-body');
    this.status = el('span', 'status-main');
    this.replayTag = el('span', 'replay-tag');
    this.note = el('div', 'note hidden');
    const statusLine = el('div', 'status');
    statusLine.append(this.status, this.replayTag);
    const compact = el('div', 'hud-grid hud-compact');
    for (const [id, labelKey] of COMPACT_ROWS) compact.append(...this.row(id, labelKey));
    const primary = this.grid(PRIMARY_ROWS);
    primary.classList.add('hud-primary');
    const secondary = this.grid(SECONDARY_ROWS);
    secondary.classList.add('hud-secondary');
    this.body.append(statusLine, this.note, compact, primary, el('div', 'hud-sep'), secondary);
    // The resize grip is a mouse affordance only: `aria-hidden`, because the
    // keyboard path is alt+arrows on the header and a second tab stop that does
    // the same thing is noise for a screen-reader user.
    this.grip = el('div', 'hud-grip');
    this.grip.setAttribute('aria-hidden', 'true');
    root.replaceChildren(this.header, this.body, this.grip);
    this.bindWindow();
    this.watchWidth();
    this.modeState = loadHudMode(this.store, this.compactOnly);
    this.layout = loadHudLayout(this.store, this.viewportSize(), this.phone, this.defaultTop());
    // A dock the *loader* had to impose is the app coping with a viewport too
    // small to float in, exactly like the one `onHostResize` imposes, and it
    // has to be remembered as such here too — otherwise a card docked by this
    // constructor stayed docked however big the viewport grew afterwards.
    this.forcedDock = this.layout.forced === true;
    this.pristine = !this.hasStoredLayout();
    this.applyLayout(); // writes the placement, and `applyMode` with it
    this.applyLabels();
    this.settleDefault();
  }

  /**
   * Take the default placement again once the page has actually been laid out.
   *
   * Everything this constructor measured — the viewport's height, the bottom of
   * the camera tool column — was measured mid-reflow, from `main.ts`'s own
   * constructor. Two animation frames later the overlay is final. Only a
   * `pristine` window is touched, so a returning user's stored geometry is
   * never overwritten by this.
   */
  private settleDefault(): void {
    if (typeof requestAnimationFrame !== 'function') return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this.pristine) this.applyLayout();
    }));
  }

  // ── window: placement, drag, resize ────────────────────────────────────────

  /**
   * The box the floating window has to stay inside.
   *
   * `.scene-ui` rather than `#viewport`: it is the positioned ancestor the
   * window's `left`/`top` resolve against, and it is inset 0 on the viewport so
   * the two measure the same rectangle. A zero here means the panel is not laid
   * out yet (or is `display: none` in a stacked phone layout for a frame); a
   * placeholder keeps the arithmetic finite and the `ResizeObserver` re-runs it
   * with the real numbers as soon as there are any.
   */
  private viewportSize(): Size {
    const host = this.floatHost;
    const w = host?.clientWidth ?? 0;
    const h = host?.clientHeight ?? 0;
    return { width: w > 0 ? w : 640, height: h > 0 ? h : 420 };
  }

  /** Default top edge: just under the camera tool column, measured. */
  private defaultTop(): number {
    const tools = document.querySelector('.camera-tools');
    const host = this.floatHost;
    if (!tools || !host) return HUD_DEFAULT_TOP;
    const a = tools.getBoundingClientRect();
    const b = host.getBoundingClientRect();
    const top = Math.round(a.bottom - b.top + 10);
    return Number.isFinite(top) && top > 0 ? top : HUD_DEFAULT_TOP;
  }

  /** Has the user ever placed this window, or is it still at its default? */
  private hasStoredLayout(): boolean {
    try {
      return !!this.store?.getItem(HUD_LAYOUT_STORAGE_KEY);
    } catch {
      return false;
    }
  }

  /** The window's current geometry in pixels, always inside the viewport. */
  private pixelRect(): Rect {
    return toPixels(this.layout.frame, this.viewportSize());
  }

  /** Is the window drawn as the `hidden` chip rather than as a card? */
  private get chipped(): boolean {
    return this.layout.placement === 'floating' && this.drawnMode === 'hidden';
  }

  /**
   * The chip's own box, borders included, as the window has to be sized to it.
   *
   * Measured rather than assumed, because the header is `width: max-content`
   * and its buttons are what is in it; the constants are for the frame before
   * the card has been laid out (and for a browser that gives zeroes because an
   * ancestor is still `display: none`). The border is added from the window
   * itself: `#hud` is `box-sizing: border-box`, so a window sized to the
   * header's content box would clip the chip by its own two pixels.
   */
  private chipSize(): { w: number; h: number } {
    if (this.chipBox) return this.chipBox;
    const r = this.header.getBoundingClientRect();
    const bw = Math.max(0, this.root.offsetWidth - this.root.clientWidth);
    const bh = Math.max(0, this.root.offsetHeight - this.root.clientHeight);
    if (r.width > 1 && r.height > 1) this.chipBox = { w: Math.ceil(r.width) + bw, h: Math.ceil(r.height) + bh };
    return this.chipBox ?? { w: HUD_CHIP_W, h: HUD_CHIP_H };
  }

  /**
   * The rectangle that is actually PAINTED, which in `hidden` mode is the chip
   * and not the window.
   *
   * The two used to disagree: the window kept its whole 176x148 box while only
   * a 73x22 chip was drawn in the corner of it, so dragging the chip moved an
   * invisible rectangle — it stopped 103 px short of the left edge, 126 px
   * short of the top and the same short of the bottom, and the pointer was
   * never where the chip was. The window IS the chip while hidden; the user's
   * real size waits in `layout.frame`, is never overwritten by the chip's, and
   * comes back at the chip's corner when the mode does.
   */
  private paintRect(): Rect {
    const vp = this.viewportSize();
    if (!this.chipped) return this.pixelRect();
    const chip = this.chipSize();
    return clampPos({ x: this.layout.frame.fx * vp.width, y: this.layout.frame.fy * vp.height, w: chip.w, h: chip.h }, vp);
  }

  private setRect(rect: Rect): void {
    const vp = this.viewportSize();
    this.pristine = false; // from here on the geometry is the user's, not a measurement
    // …and so is the size: `full` may not put its own back afterwards.
    this.beforeFull = null;
    if (this.chipped) {
      // Only the position is the gesture's. Clamping against the chip's box is
      // what lets it reach all four edges; the stored size is the card's.
      const box = clampPos({ x: rect.x, y: rect.y, ...this.chipSize() }, vp);
      const moved = toFrame(box, vp);
      this.layout.frame = { fx: moved.fx, fy: moved.fy, w: this.layout.frame.w, h: this.layout.frame.h };
    } else {
      this.layout.frame = toFrame(clampRect(rect, vp), vp);
    }
    this.applyLayout();
  }

  /** A size the user chose in `full` mode is final: nothing re-grows it. */
  private noteUserSize(): void {
    if (this.drawnMode === 'full') this.fullSized = true;
  }

  private bindWindow(): void {
    this.header.addEventListener('pointerdown', (e) => this.startGesture(e, 'move'));
    this.grip.addEventListener('pointerdown', (e) => this.startGesture(e, 'size'));
    for (const node of [this.header, this.grip]) {
      node.addEventListener('pointermove', (e) => this.moveGesture(e));
      node.addEventListener('pointerup', (e) => this.endGesture(e));
      node.addEventListener('pointercancel', (e) => this.endGesture(e));
      node.addEventListener('lostpointercapture', (e) => this.endGesture(e));
    }
    // Double-click the header to put the window back — the same thing the ⌖
    // button does, for whoever reaches for the title bar first. A double-click
    // that lands on one of the buttons is that button's, not a reset; and a
    // docked card has no geometry to reset, which is why its ⌖ button is hidden
    // (style.css) and why this is the same guard the button has.
    this.header.addEventListener('dblclick', (e) => {
      if (this.layout.placement !== 'floating') return;
      if ((e.target as HTMLElement | null)?.closest('button')) return;
      this.resetPlacement();
    });
    this.header.addEventListener('keydown', (e) => this.onHeaderKey(e));
    // A `ResizeObserver` rather than `window.resize`: the viewport changes size
    // when the workspace reflows, when the telemetry panel wraps under it and
    // when the user enters full screen — none of which is a window resize. The
    // fractions do not change, so this is purely the clamp being re-applied
    // against the new box.
    if (typeof ResizeObserver !== 'undefined' && this.floatHost) {
      // Kept in a field for the same reason `main.ts` keeps its own: an
      // observer that nothing references is a collection hazard, and this one
      // has to live as long as the card does.
      this.hostObserver = new ResizeObserver(() => this.onHostResize());
      this.hostObserver.observe(this.floatHost);
      // `.scene-mid` as well as the viewport: the camera tab strip wraps onto a
      // second row in Russian and the tool column changes height with it, which
      // moves the default top edge without changing `.scene-ui`'s own box. That
      // missing signal is what shipped the card over the Full screen button.
      const mid = document.querySelector('.scene-mid');
      if (mid) this.hostObserver.observe(mid);
    }
  }

  /**
   * The viewport changed size: re-clamp, and give up floating only if there is
   * genuinely no room left for a window.
   *
   * The forced dock is deliberately NOT saved, and `forcedDock` is what makes
   * that true rather than merely intended: it is the app coping with a
   * degenerate box, not a choice, so when the viewport grows back past the
   * minimum window the card floats again without waiting for a reload. This is
   * the same rule `watchWidth` applies to the mode, and the reason the wave-5
   * container queries were wrong: they made a transient layout state permanent
   * for as long as it lasted, with no way back.
   */
  private onHostResize(): void {
    const vp = this.viewportSize();
    if (this.forcedDock && this.layout.placement === 'docked' && canFloat(vp)) {
      this.forcedDock = false;
      this.layout.placement = 'floating';
    } else if (this.layout.placement === 'floating' && !canFloat(vp) && this.dockHost) {
      this.forcedDock = true;
      this.layout.placement = 'docked';
    }
    this.applyLayout();
  }

  /**
   * Begin a drag or a resize.
   *
   * `stopPropagation` is the load-bearing line: `CameraController.attach`
   * listens for `pointerdown` on the whole viewport, and although its
   * `isControl` guard already ignores anything inside `.scene-ui`, a gesture
   * that reached it would rotate the scene under the window being dragged.
   * `preventDefault` stops the text selection that otherwise follows the
   * pointer across the header, and the capture keeps the gesture alive when the
   * pointer outruns the 22 px strip it started on.
   */
  private startGesture(e: PointerEvent, kind: 'move' | 'size'): void {
    if (this.layout.placement !== 'floating') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (kind === 'move' && (e.target as HTMLElement | null)?.closest('button')) return;
    e.preventDefault();
    e.stopPropagation();
    this.gesture = { kind, id: e.pointerId, x: e.clientX, y: e.clientY, from: this.paintRect() };
    // `preventDefault` above suppresses the compatibility `mousedown`, and with
    // it the focus that press would normally have given the header — so hand it
    // over explicitly. The focus ring is `:focus-visible`, so a mouse user sees
    // nothing and a keyboard user can nudge the window with the arrows straight
    // after dragging it.
    this.header.focus();
    const node = kind === 'move' ? this.header : this.grip;
    try { node.setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
  }

  private moveGesture(e: PointerEvent): void {
    const g = this.gesture;
    if (!g || g.id !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    this.setRect(g.kind === 'move'
      ? { ...g.from, x: g.from.x + dx, y: g.from.y + dy }
      // `resizeRect`, not a bare `clampRect`: the grip may only change the size,
      // and a window already against the right-hand edge must stop growing
      // there rather than slide left under the gesture.
      : resizeRect(g.from, dx, dy, this.viewportSize()));
    if (g.kind === 'size') this.noteUserSize();
  }

  private endGesture(e: PointerEvent): void {
    const g = this.gesture;
    if (!g || g.id !== e.pointerId) return;
    this.gesture = null;
    const node = g.kind === 'move' ? this.header : this.grip;
    try { node.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    saveHudLayout(this.store, this.layout);
  }

  /**
   * Arrows move the window, alt+arrows resize it, Escape hands the focus back.
   *
   * Every key handled here is stopped: `main.ts` listens on `window` and gives
   * unclaimed arrows to the timeline, so without this, moving the window would
   * also scrub the flight. Keys this method does not claim — `h`, `d`, space —
   * are deliberately left to bubble.
   */
  private onHeaderKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.header.blur();
      e.stopPropagation();
      return;
    }
    if (this.layout.placement !== 'floating') return;
    const step = e.shiftKey ? KEY_STEP_BIG : KEY_STEP;
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
    if (dx === 0 && dy === 0) return;
    e.preventDefault();
    e.stopPropagation();
    const r = this.paintRect();
    this.setRect(e.altKey ? resizeRect(r, dx, dy, this.viewportSize()) : { ...r, x: r.x + dx, y: r.y + dy });
    if (e.altKey) this.noteUserSize();
    saveHudLayout(this.store, this.layout);
  }

  /** The placement currently on screen. */
  get placement(): HudPlacement {
    return this.layout.placement;
  }

  /** Dock the card into the telemetry panel, or float it over the picture (`D`). */
  togglePlacement(): void {
    this.setPlacement(this.layout.placement === 'floating' ? 'docked' : 'floating');
  }

  setPlacement(placement: HudPlacement): void {
    // Nowhere to dock (no telemetry panel handed in) or no room to float: the
    // control is disabled for the same reason, and the key must agree with it.
    if (placement === 'docked' && !this.dockHost) return;
    if (placement === 'floating' && !canFloat(this.viewportSize())) return;
    if (placement === this.layout.placement) return;
    // An explicit choice cancels the automatic one: a user who docks the card in
    // a cramped viewport should not have it fly back out when the box grows.
    this.forcedDock = false;
    this.layout = { placement, frame: this.layout.frame };
    this.chipBox = null; // the docked header carries fewer buttons than the chip
    this.applyLayout();
    saveHudLayout(this.store, this.layout);
  }

  /** Put the floating window back where it starts (⌖, or double-click the header). */
  resetPlacement(): void {
    if (this.layout.placement !== 'floating') return; // nothing to put back
    this.layout = resetLayout(this.layout, this.viewportSize(), this.defaultTop());
    this.pristine = true; // back to a measurement, and it tracks the layout again
    this.beforeFull = null;
    this.fullSized = false; // ⌖ is "start again", `full` may size the card again
    this.applyLayout();
    saveHudLayout(this.store, this.layout);
  }

  /**
   * Reparent the card and write its geometry.
   *
   * Reparenting rather than rebuilding: it is the same nodes, the same rows and
   * the same `shown` cache in both placements, so the card keeps drawing the
   * frame it was drawing and `update` never learns that anything moved.
   */
  private applyLayout(): void {
    const floating = this.layout.placement === 'floating';
    // A window nobody has placed is a *measurement*, and it is taken again every
    // time the layout is written rather than being frozen the moment the card
    // was constructed. See `pristine`.
    if (floating && this.pristine) {
      const vp = this.viewportSize();
      this.layout.frame = toFrame(defaultRect(vp, this.defaultTop()), vp);
    }
    const host = floating ? this.floatHost : this.dockHost;
    if (host && this.root.parentElement !== host) host.append(this.root);
    this.root.dataset.placement = this.layout.placement;
    // The mode is written BEFORE the geometry, not after: in `hidden` the box
    // is the chip's, and the chip is only the chip once `data-mode` says so.
    this.applyMode(); // a docked card draws the full grid whatever the mode is
    const s = this.root.style;
    if (floating) {
      const r = this.paintRect();
      s.left = `${Math.round(r.x)}px`;
      s.top = `${Math.round(r.y)}px`;
      s.width = `${Math.round(r.w)}px`;
      s.height = `${Math.round(r.h)}px`;
    } else {
      s.left = s.top = s.width = s.height = '';
    }
  }

  /** Tooltips, accessible names and the placement glyph, in the current language. */
  private applyControlLabels(): void {
    const modeLabel = `${t('hud.card')}: ${t(MODE_LABEL[this.drawnMode])} · H`;
    this.toggle.title = modeLabel;
    this.toggle.setAttribute('aria-label', modeLabel);
    const next: HudPlacement = this.layout.placement === 'floating' ? 'docked' : 'floating';
    const roomToFloat = canFloat(this.viewportSize());
    const blocked = (next === 'floating' && !roomToFloat) || (next === 'docked' && !this.dockHost);
    const placeLabel = blocked ? t('hud.floatUnavailable') : t(PLACE_LABEL[next]);
    this.placeGlyph.textContent = PLACE_GLYPH[next];
    this.placeBtn.title = placeLabel;
    this.placeBtn.setAttribute('aria-label', placeLabel);
    this.placeBtn.disabled = blocked;
    this.resetBtn.title = t('hud.resetLayout');
    this.resetBtn.setAttribute('aria-label', t('hud.resetLayout'));
    this.grip.title = t('hud.resizeHandle');
    this.titleEl.textContent = t('hud.card');
    // The same string as a tooltip: the title text is ellipsised in a narrow
    // window ("Панель телеметрии" does not fit at 176 px), and the strip itself
    // needs to say that it can be dragged.
    this.header.title = t('hud.dragHandle');
    this.header.setAttribute('aria-label', t('hud.dragHandle'));
  }

  /**
   * Are we at phone width? `full` is not offered there.
   *
   * Queried, never cached. A cached flag was wrong the first time it was tested:
   * the media query's `change` event does not always arrive when the viewport is
   * resized under emulation, and a stale `false` offered the 21-row grid on a
   * 375 px screen. `matches` is a live value and costs nothing to read.
   */
  private get phone(): boolean {
    return this.phoneQuery?.matches ?? false;
  }

  /**
   * Is `full` off the menu? At phone width, and in a viewport too short to hold
   * a window big enough to draw the primary grid.
   *
   * The second half is what keeps `H` honest: in a short viewport `full` grows
   * the window as far as it can and the container queries still fall back to
   * the compact grid, so the cycle skips the state that would change nothing
   * rather than offering the user a keystroke with no effect.
   */
  private get compactOnly(): boolean {
    return this.phone || !canShowFull(this.viewportSize());
  }

  /** The mode the card is actually drawing: a docked card is always `full`. */
  private get drawnMode(): HudMode {
    return this.layout.placement === 'docked' ? 'full' : coerceHudMode(this.modeState, this.compactOnly);
  }

  /**
   * Re-apply the mode when the breakpoint is crossed.
   *
   * The mode that was *stored* is re-read rather than the one on screen, so
   * widening the window again restores the user's real choice instead of
   * leaving them in the compact card they were forced into. `resize` backs the
   * media query up for the same reason the getter exists.
   */
  private watchWidth(): void {
    if (typeof window.matchMedia !== 'function') return;
    this.phoneQuery = window.matchMedia(PHONE_QUERY);
    const onChange = (): void => {
      // With site data blocked there is no stored preference to re-read; the
      // in-memory choice is the preference, so a resize must not reset it.
      const next = this.store ? loadHudMode(this.store, this.compactOnly) : this.modeState;
      if (next === this.modeState && this.root.dataset.mode === coerceHudMode(next, this.compactOnly)) return;
      this.modeState = next;
      this.applyLayout(); // the geometry follows the mode: see `paintRect`
    };
    if (typeof this.phoneQuery.addEventListener === 'function') this.phoneQuery.addEventListener('change', onChange);
    // `resize` fires continuously during a window drag; coalesce to one check per frame.
    let pending = 0;
    window.addEventListener('resize', () => {
      if (pending) return;
      pending = requestAnimationFrame(() => { pending = 0; onChange(); });
    });
  }

  /** The mode currently on screen. */
  get mode(): HudMode {
    return this.modeState;
  }

  /**
   * compact → full → hidden → compact (no `full` where it cannot be drawn).
   *
   * `full` is the step that used to be a lie. The full grid needs a window
   * about 202 px tall before the container queries will draw it, the default
   * window is 148, and so the first `H` of a first visit changed the tooltip
   * and nothing else — while the README and the user guide both promise the
   * complete instrument set. The window now grows to the size the grid needs
   * (`fullRect`), remembers what it was, and gets it back on the step off
   * `full`. A window the user has sized themselves is never grown or restored:
   * `setRect` drops the memory and `noteUserSize` closes the door for good.
   */
  cycleMode(): void {
    const from = this.drawnMode;
    this.modeState = nextHudMode(this.modeState, this.compactOnly);
    saveHudMode(this.store, this.modeState);
    let resized = false;
    if (this.layout.placement === 'floating') {
      const to = this.drawnMode;
      if (to === 'full' && !this.fullSized) {
        const vp = this.viewportSize();
        const now = this.pixelRect();
        const want = fullRect(now, vp);
        if (want.w > now.w || want.h > now.h) {
          this.beforeFull = { frame: this.layout.frame, pristine: this.pristine };
          this.layout.frame = toFrame(want, vp);
          // A grown window is a size, not a measurement any more, or the next
          // `applyLayout` would re-derive the default straight over it.
          this.pristine = false;
          resized = true;
        }
      } else if (from === 'full' && this.beforeFull) {
        this.layout.frame = this.beforeFull.frame;
        this.pristine = this.beforeFull.pristine;
        this.beforeFull = null;
        resized = true;
      }
    }
    this.applyLayout();
    // Only when the geometry moved. `H` is a content control, and writing the
    // layout key on every press would make a window nobody has ever placed look
    // placed to the next page load — which is what stops it tracking the
    // measured default (see `pristine`).
    if (resized) saveHudLayout(this.store, this.layout);
  }

  /**
   * Write the mode the card is actually drawing.
   *
   * A docked card is always `full`. The telemetry panel has room for all 21
   * readouts and seeing them without covering the picture is the reason to dock
   * — but the user's own choice is not overwritten, only overruled while the
   * card is in the panel: `modeState` still holds it, `H` still cycles it, and
   * it is what the window comes back as when it floats again.
   */
  private applyMode(): void {
    this.root.dataset.mode = this.drawnMode;
    this.applyControlLabels();
  }

  /** One label/value pair, registered under `id` and labelled from `labelKey`. */
  private row(id: string, labelKey: string): [HTMLElement, HTMLElement] {
    const key = el('span', 'k');
    const value = el('span', 'v');
    this.rows[id] = { key, value, labelKey, shown: '' };
    return [key, value];
  }

  private grid(keys: readonly string[]): HTMLElement {
    const g = el('div', 'hud-grid');
    for (const k of keys) g.append(...this.row(k, `hud.${k}`));
    return g;
  }

  /**
   * Blank the verdict line, in the DOM as well as in the "what is on screen"
   * cache.
   *
   * Clearing `shownNote` alone was a real defect twice over. `update` only
   * writes the element when the computed note differs from `shownNote`, so
   * after a reset both were `''` while the element still carried the previous
   * mission's text: a green "Target orbit achieved" sat over the *next*
   * vehicle from T-10 s onwards and survived the whole ascent, because the
   * branch that would have rewritten it never fired again. The same applied to
   * a language change: the note stayed in the language it was written in until
   * the computed note happened to change.
   */
  private clearNote(): void {
    this.note.textContent = '';
    this.note.className = 'note hidden';
    this.shownNote = '';
  }

  /** Re-label after a language change (values are rewritten on the next frame). */
  applyLabels(): void {
    for (const k of Object.keys(this.rows)) this.rows[k].key.textContent = t(this.rows[k].labelKey);
    this.chipBox = null; // measured again: a chip is only as wide as its buttons
    this.applyLayout(); // the toggle's tooltip and accessible name are translated too
    this.shownStatus = '';
    this.clearNote();
    this.tickFrom = -1;
    this.tickTo = -1;
  }

  /** Mission-static data the frames do not carry (stage names). */
  setVehicle(spec: VehicleSpec | null): void {
    this.vehicle = spec;
  }

  reset(): void {
    this.tickFrom = -1;
    this.tickTo = -1;
    this.ticker.replaceChildren();
    for (const k of Object.keys(this.rows)) { this.rows[k].value.textContent = '—'; this.rows[k].shown = '—'; }
    this.shownStatus = '';
    this.clearNote();
  }

  private set(key: string, value: string): void {
    const row = this.rows[key];
    if (!row || row.shown === value) return;
    row.shown = value;
    row.value.textContent = value;
  }

  update(frame: VisualFrame | null, events: readonly SimEvent[], warp: number, replay = false): void {
    this.replayTag.textContent = replay ? t('ctl.replay') : '';
    if (!frame) {
      if (this.shownStatus !== 'prelaunch') {
        this.status.textContent = t('hud.status.prelaunch');
        this.shownStatus = 'prelaunch';
      }
      return;
    }
    const elm = frame.elements;
    let phase = '';
    if (frame.status === 'ascent' && frame.ascentPhase) phase = t(`hud.phase.${frame.ascentPhase}`);
    else if (frame.status === 'descent' && frame.descentPhase) phase = t(DESCENT_PHASE_KEYS[frame.descentPhase]);
    else if (frame.status === 'coast' && hasNextBurn(frame)) phase = `${t('hud.nextBurn')} ${fmtTime(frame.nextBurnTime - frame.t).slice(2)}`;
    const status = `${t(`hud.status.${frame.status}`)}${phase ? ' · ' + phase : ''}`;
    if (status !== this.shownStatus) { this.status.textContent = status; this.shownStatus = status; }
    let note = '';
    let noteCls = 'note';
    if (frame.status === 'orbit' || frame.status === 'failed' || frame.status === 'descent' || frame.status === 'landed') {
      note = t(`hud.note.${frame.note}`);
      noteCls = `note ${frame.status === 'failed' ? 'fail' : frame.note === 'orbitOffTarget' || frame.note === 'shipLost' ? 'warn' : 'ok'}`;
    }
    if (note !== this.shownNote) {
      this.note.textContent = note;
      this.note.className = noteCls;
      this.note.classList.toggle('hidden', note === '');
      this.shownNote = note;
    }
    const stages = this.vehicle?.stages;
    const active = stages && frame.activeStageIndex < stages.length ? stages[frame.activeStageIndex] : null;
    this.set('stage', active && stages && this.vehicle ? `${frame.activeStageIndex + 1}/${stages.length} ${stageName(this.vehicle.id, active.id, active.name)}` : '—');
    this.set('throttle', `${(frame.throttle * 100).toFixed(0)} %`);
    this.set('thrust', `${(frame.thrust / 1000).toFixed(0)} kN`);
    this.set('mass', `${(frame.mass / 1000).toFixed(1)} t`);
    this.set('g', `${frame.gLoad.toFixed(2)} g`);
    this.set('pitch', `${frame.pitchCmd.toFixed(1)}°`);
    this.set('warp', `${warp}×`);
    this.set('altitude', `${(frame.altitude / 1000).toFixed(1)} km`);
    this.set('speed', `${frame.speed.toFixed(0)} m/s`);
    this.set('airspeed', `${frame.airspeed.toFixed(0)} m/s`);
    this.set('vertical', `${frame.vz.toFixed(0)} m/s`);
    this.set('q', `${(frame.q / 1000).toFixed(1)} kPa`);
    this.set('mach', frame.altitude < 120e3 ? frame.mach.toFixed(2) : '—');
    this.set('apoapsis', `${isFinite(elm.apoapsisAlt) ? (elm.apoapsisAlt / 1000).toFixed(0) : '∞'} km`);
    this.set('periapsis', `${(elm.periapsisAlt / 1000).toFixed(0)} km`);
    this.set('inclination', `${(elm.i * RAD).toFixed(2)}°`);
    this.set('raan', `${(elm.raan * RAD).toFixed(1)}°`);
    this.set('period', isFinite(elm.period) ? `${(elm.period / 60).toFixed(1)} min` : '—');
    this.set('dv', `${frame.dvRemaining.toFixed(0)} m/s`);
    this.set('downrange', `${(frame.downrange / 1000).toFixed(0)} km`);
    this.set('latlon', `${frame.lat.toFixed(2)}° ${frame.lon.toFixed(2)}°`);
    // The compact card. Written unconditionally: `set` compares against what is
    // on screen, so the rows that are not displayed cost one string compare
    // each at 10 Hz, and switching modes needs no refresh path.
    this.set('c.altitude', `${(frame.altitude / 1000).toFixed(1)} km`);
    this.set('c.speed', `${frame.speed.toFixed(0)} m/s`);
    this.set('c.vertical', `${frame.vz.toFixed(0)} m/s`);
    const apo = isFinite(elm.apoapsisAlt) ? (elm.apoapsisAlt / 1000).toFixed(0) : '∞';
    this.set('c.apsides', `${apo} × ${(elm.periapsisAlt / 1000).toFixed(0)} km`);
    // Same guard as the full grid's `stage` row: once the last launcher stage has
    // separated there is no active stage, and the card must say so rather than
    // keep naming the stage that just left.
    this.set('c.stage', active && stages
      ? `${frame.activeStageIndex + 1}/${stages.length} · ${(frame.throttle * 100).toFixed(0)} %`
      : '—');
    this.set('c.dv', `${frame.dvRemaining.toFixed(0)} m/s`);
    this.updateTicker(frame.t, events);
  }

  /**
   * Callouts for the displayed instant. The window is mission time, not wall
   * time: scrubbing back to T+150 s brings back the callouts that were on
   * screen at T+150 s, which a `setTimeout`-driven ticker could never do.
   */
  private updateTicker(now: number, events: readonly SimEvent[]): void {
    let to = 0;
    while (to < events.length && events[to].t <= now + 1e-6) to++;
    let from = to;
    while (from > 0 && now - events[from - 1].t <= TICKER_WINDOW) from--;
    if (to - from > TICKER_ROWS) from = to - TICKER_ROWS;
    if (from === this.tickFrom && to === this.tickTo && events === this.tickEvents) return;
    this.tickFrom = from;
    this.tickTo = to;
    this.tickEvents = events;
    const rows: HTMLElement[] = [];
    for (let i = from; i < to; i++) {
      const e = events[i];
      const div = el('div', e.severity);
      div.append(el('span', 'tick-t', fmtTime(e.t)), document.createTextNode(t(e.key, localizeEventParams(this.vehicle, e.params))));
      rows.push(div);
    }
    this.ticker.replaceChildren(...rows);
  }
}
