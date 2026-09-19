/**
 * Mission timeline: a scrubber from T-10 s to the recording head, with an
 * event bar of chips positioned by mission time.
 *
 * The scrubber is a native range input, so it is keyboard-accessible and
 * pointer/touch-driven for free; the chips are buttons above it. The bar grows
 * live as the recorder advances, which means chip positions move: to keep the
 * cost flat, chip *elements* are created only when the event count changes and
 * the layout (positions, clustering, ticks) only re-runs when the head has
 * moved by more than ~0.4 % of the span, the bar was resized, or the axis
 * mapping changed. Everything else in the per-frame path is two style writes
 * and, at most, one text write — and no layout *read*, because the bar's width
 * comes from a `ResizeObserver` rather than from `clientWidth` on every frame.
 *
 * **The axis is piecewise** (audit B3, `./timeaxis.ts`). Mission time is not
 * mapped linearly onto the bar: the ascent — T-10 to insertion, where every
 * callout is — is given at least 40 % of the bar, and as much of it as 1 second
 * per pixel needs, up to 75 %. On a six-hour GTO recording that is the
 * difference between ~60 s per pixel and ~1.5 s per pixel in the part of the
 * flight anyone scrubs. The boundary is drawn as a labelled divider, both
 * segments carry round-number tick labels, and the chips, the playhead, the
 * click-to-seek target and the range input all go through the same mapping, so
 * nothing can disagree about where a second is. Before the flight reaches
 * insertion the axis is strictly linear and no boundary is drawn.
 *
 * Two things the first cut got wrong, both still fixed here:
 *
 * - **Clustering is decided on rendered extent, not on a fixed anchor gap.** A
 *   chip is 40-120 px wide depending on its label and the language, so
 *   comparing anchor distances against a constant left five of eight chips
 *   overlapping. Widths are measured once per chip (batched: every write
 *   first, then every read, so the browser does one reflow) and cached until
 *   the language or the bar width changes.
 * - **A chip at the head is anchored by its right edge.** An event fires at
 *   `t === headT`, i.e. at x = 100 % of a bar with `overflow: hidden`, so a
 *   left-anchored chip was clipped to a couple of pixels exactly when it
 *   mattered. Past the right edge the chip flips (`.tl-chip.flip`) and grows
 *   leftwards from its anchor, which stays on the true time either way.
 *
 * Chips that would overlap collapse into one of them, which shows a "+N"
 * count, lists the whole group in its tooltip, and steps through the group's
 * times on repeated clicks. Which one leads is decided by severity class and
 * only then by time (`SEVERITY_RANK`), so the bar summarises a successful
 * mission with "Target orbit", not with the debris impact that happened to be
 * the earliest member of the cluster.
 */
import { t } from '../i18n';
import type { EventSeverity, SimEvent } from '../physics/simulation';
import type { VehicleSpec } from '../types';
import { fmtTime } from './hud';
import { localizeEventParams } from './names';
import { eventLabel } from './phase';
import { TimeAxis } from './timeaxis';

/** Minimum clear space between two rendered chips before they collapse, px. */
const MIN_GAP = 6;
/**
 * Which member of a cluster gets to be the visible one.
 *
 * Leadership used to be "the earliest of the group", which on a completed
 * default mission left the bar reading `Ignition · Booster burnout · MECO ·
 * Stage impact +N`: every headline callout of the flight — SECO, parking
 * orbit, payload separation, the circularisation burn, target orbit — was
 * collapsed inside a chip labelled with a piece of falling debris, so the
 * event bar's one-line summary of a successful mission ended in a crash.
 * Ranking by severity class first and by time only within a class puts the
 * outcome of the group on the chip; the collapsed members are unchanged and
 * are still reachable by cycling the lead and listed in its tooltip.
 */
const SEVERITY_RANK: Record<EventSeverity, number> = { info: 0, major: 1, warn: 2, success: 3, fail: 4 };
/** Extra width a cluster lead takes when its label gains a " +N" suffix, px. */
const CLUSTER_PAD = 26;
/** How close to the right edge a chip has to be before it flips, px. */
const EDGE_PAD = 4;
/**
 * Centre-to-centre clearance a round-number tick needs from the boundary
 * label, px. A clock label is about 35 px wide and both are centred on their
 * anchor, so anything closer than this overlaps it — measured: the first coast
 * tick of the default mission landed 34 px away and overlapped by 1 px. The
 * axis cannot apply this rule itself: it works in mission time and knows
 * nothing about how wide a rendered label is.
 */
const TICK_CLEAR = 42;

/**
 * Events that end the ascent, earliest wins. The boundary is placed a little
 * after it so the insertion callouts themselves stay in the ascent segment
 * rather than landing on the divider.
 */
const INSERTION_KEYS = ['evt.seco', 'evt.parkingOrbit', 'evt.targetOrbit'];
/** Margin past the insertion callout that still counts as ascent, s. */
const INSERTION_MARGIN = 20;

export interface TimelineCallbacks {
  /** the user moved the cursor to this mission time */
  onSeek(time: number): void;
  /** the user asked to go back to the live head */
  onLive(): void;
}

interface Chip {
  el: HTMLButtonElement;
  event: SimEvent;
  label: string;
  /** rendered width of `label`, px; -1 when it has not been measured yet */
  width: number;
  /** signature of the cluster this chip led at the last layout ('' = none) */
  sig: string;
  /** events this chip stands for when it is a cluster lead */
  members: SimEvent[];
  /** which member the next click on a cluster seeks to */
  cycle: number;
}

export class Timeline {
  private root: HTMLElement;
  private bar: HTMLElement;
  private range: HTMLInputElement;
  private playhead: HTMLElement;
  private brk: HTMLElement;
  private tickRow: HTMLElement;
  private cursorLabel: HTMLElement;
  private headLabel: HTMLElement;
  private modeLabel: HTMLElement;
  private cb: TimelineCallbacks;
  private chips: Chip[] = [];
  private events: readonly SimEvent[] = [];
  private axis = new TimeAxis();
  /** the flying vehicle, for the stage names its events carry (see `evParams`) */
  private vehicle: VehicleSpec | null = null;
  /** mission time of insertion, or null while the flight has not got there */
  private insertionT: number | null = null;
  /** short label of the event that ends the ascent, for the divider's tooltip */
  private insertionLabel = '';
  private cursorT = -10;
  private live = true;
  private dragging = false;
  private layoutHead = -1e18;
  private layoutWidth = -1;
  private layoutShare = -1;
  private shownCursor = NaN;
  private shownRange = -1e18;
  private shownHead = NaN;
  private shownPlayhead = -1e18;
  /** bar width in px, kept by a ResizeObserver so the frame path reads no layout */
  private barW = -1;
  private barObserver: ResizeObserver | null = null;
  /** scratch, reused so a layout allocates nothing until a cluster changes */
  private group: Chip[] = [];
  private tickTimes: number[] = [];
  private tickEls: HTMLElement[] = [];

  constructor(root: HTMLElement, cb: TimelineCallbacks) {
    this.root = root;
    this.cb = cb;
    root.className = 'timeline';
    root.innerHTML = `
      <div class="tl-bar"><div class="tl-break"></div><div class="tl-playhead"></div></div>
      <input type="range" class="tl-range" min="0" max="1" step="0.0005" value="0">
      <div class="tl-ticks"></div>
      <div class="tl-foot">
        <span class="tl-cursor mono"></span>
        <span class="tl-mode"></span>
        <span class="tl-head mono"></span>
      </div>`;
    this.bar = root.querySelector('.tl-bar') as HTMLElement;
    this.playhead = root.querySelector('.tl-playhead') as HTMLElement;
    this.brk = root.querySelector('.tl-break') as HTMLElement;
    this.tickRow = root.querySelector('.tl-ticks') as HTMLElement;
    this.range = root.querySelector('.tl-range') as HTMLInputElement;
    this.cursorLabel = root.querySelector('.tl-cursor') as HTMLElement;
    this.headLabel = root.querySelector('.tl-head') as HTMLElement;
    this.modeLabel = root.querySelector('.tl-mode') as HTMLElement;
    this.applyStaticText();

    // The range input is in *bar fractions*, not seconds, because the axis is
    // piecewise: a native range is linear in pixels, and mapping its value
    // through the axis is what makes one pixel of drag mean one pixel of bar
    // in both segments. The mission time is published as `aria-valuetext`, so
    // a screen reader still reads a clock rather than "0.63".
    this.range.addEventListener('input', () => {
      this.cursorT = this.axis.time(Number(this.range.value));
      this.cb.onSeek(this.cursorT);
    });
    // Pointer events cover mouse, pen and touch, so the scrubber works on a
    // phone without a second code path.
    this.range.addEventListener('pointerdown', () => { this.dragging = true; });
    const endDrag = (): void => { this.dragging = false; };
    this.range.addEventListener('pointerup', endDrag);
    this.range.addEventListener('pointercancel', endDrag);
    this.range.addEventListener('lostpointercapture', endDrag);
    window.addEventListener('pointerup', endDrag);
    this.range.addEventListener('keydown', (e) => this.onKey(e));
    // Clicking the bar itself seeks there (a bigger target than the thumb).
    this.bar.addEventListener('pointerdown', (e) => {
      // A chip is a child of the bar, and this handler runs before the chip's
      // own click: without the guard every chip click seeked twice, first to
      // the pixel under the cursor and only then to the event.
      if ((e.target as HTMLElement).closest('.tl-chip')) return;
      const rect = this.bar.getBoundingClientRect();
      if (rect.width <= 0) return;
      this.cb.onSeek(this.axis.time((e.clientX - rect.left) / rect.width));
    });
    if (typeof ResizeObserver !== 'undefined') {
      this.barObserver = new ResizeObserver(() => {
        const w = this.bar.clientWidth;
        if (w > 0 && w !== this.barW) {
          this.barW = w;
          this.layout(true);
        }
      });
      this.barObserver.observe(this.bar);
    }
  }

  /** Arrow keys seek 5 s (30 s with shift); Home/End jump to the ends. */
  onKey(e: KeyboardEvent): boolean {
    const stepSize = e.shiftKey ? 30 : 5;
    if (e.key === 'ArrowLeft') this.cb.onSeek(this.cursorT - stepSize);
    else if (e.key === 'ArrowRight') this.cb.onSeek(this.cursorT + stepSize);
    else if (e.key === 'Home') this.cb.onSeek(this.axis.startT);
    else if (e.key === 'End') this.cb.onLive();
    else return false;
    e.preventDefault();
    return true;
  }

  /** Re-render the labels after a language change. */
  /**
   * The mission whose events the bar is showing.
   *
   * Only the stage and booster names on those events need it; the spacecraft
   * name resolves from the event's own `satId`. Set alongside `HudPanel`'s own
   * `setVehicle` from `src/main.ts`, once per mission, after `reset()` has
   * dropped the previous mission's chips.
   */
  setVehicle(spec: VehicleSpec | null): void {
    if (spec === this.vehicle) return;
    this.vehicle = spec;
    this.applyStaticText(); // the chip labels and tooltips carry stage names
  }

  /** An event's parameters with the hardware names translated (src/ui/names.ts). */
  private evParams(e: SimEvent): Record<string, string | number> | undefined {
    return localizeEventParams(this.vehicle, e.params);
  }

  applyStaticText(): void {
    this.range.title = t('tl.scrub');
    this.range.setAttribute('aria-label', t('tl.scrub'));
    this.modeLabel.textContent = this.live ? t('tl.live') : t('ctl.replay');
    for (const c of this.chips) {
      c.label = eventLabel(c.event.key, this.evParams(c.event));
      c.width = -1; // a translated label is a different width
      c.sig = '';   // force the text and tooltip to be rewritten
    }
    this.insertionLabel = this.insertionLabelFor(this.events);
    this.layout(true);
    this.shownCursor = NaN;
    this.shownHead = NaN;
  }

  /** Drop every chip (a new mission). */
  reset(): void {
    this.events = [];
    this.chips = [];
    this.bar.replaceChildren(this.brk, this.playhead);
    this.tickRow.replaceChildren();
    this.tickEls = [];
    this.insertionT = null;
    this.insertionLabel = '';
    this.axis.configure(-10, 0, null, this.barW > 0 ? this.barW : 0);
    this.layoutHead = -1e18;
    this.layoutWidth = -1;
    this.layoutShare = -1;
    this.shownRange = -1e18;
    this.shownCursor = NaN;
    this.shownHead = NaN;
    this.shownPlayhead = -1e18;
    this.brk.classList.add('hidden');
  }

  /**
   * Reconcile by event identity: a retrospectively detected peak can arrive
   * before an existing chip. Array indexes are not stable event identities.
   */
  setEvents(events: readonly SimEvent[]): void {
    if (events === this.events) return;
    const existing = new Map(this.chips.map((chip) => [chip.event, chip]));
    const focused = document.activeElement;
    this.events = events;
    this.chips = events.map((ev) => {
      const old = existing.get(ev);
      if (old) { existing.delete(ev); old.sig = ''; return old; }
      const el = document.createElement('button');
      el.className = `tl-chip sev-${ev.severity}`;
      el.type = 'button';
      const chip: Chip = { el, event: ev, label: eventLabel(ev.key, this.evParams(ev)), width: -1, sig: '', members: [ev], cycle: 0 };
      el.addEventListener('click', () => this.chipClick(chip));
      return chip;
    });
    for (const old of existing.values()) old.el.remove();
    // Match keyboard traversal to occurrence order as well as visual placement.
    for (let i = this.chips.length - 1; i >= 0; i--) {
      const el = this.chips[i].el;
      const next = this.chips[i + 1]?.el ?? null;
      if (el.parentElement !== this.bar || el.nextSibling !== next) this.bar.insertBefore(el, next);
    }
    if (focused instanceof HTMLElement && focused.isConnected && document.activeElement !== focused) focused.focus({ preventScroll: true });
    this.insertionT = this.insertionTimeOf(events);
    this.insertionLabel = this.insertionLabelFor(events);
    this.layout(true);
  }

  /** Mission time at which the ascent ends, or null if it has not yet. */
  private insertionTimeOf(events: readonly SimEvent[]): number | null {
    let best: number | null = null;
    for (const e of events) {
      if (!INSERTION_KEYS.includes(e.key)) continue;
      if (best === null || e.t < best) best = e.t;
    }
    return best === null ? null : best + INSERTION_MARGIN;
  }

  private insertionLabelFor(events: readonly SimEvent[]): string {
    let best: SimEvent | null = null;
    for (const e of events) {
      if (!INSERTION_KEYS.includes(e.key)) continue;
      if (!best || e.t < best.t) best = e;
    }
    return best ? `${eventLabel(best.key, this.evParams(best))} · ${fmtTime(best.t)}` : '';
  }

  /**
   * Clicking a chip seeks to its event. A cluster lead stands for several
   * events, so repeated clicks step through them — otherwise the collapsed
   * members would be unreachable by pointer (their own handlers can never fire:
   * `.collapsed` is `display: none`).
   */
  private chipClick(c: Chip): void {
    const m = c.members;
    if (m.length > 1) {
      const i = c.cycle % m.length;
      c.cycle = (c.cycle + 1) % m.length;
      this.cb.onSeek(m[i].t);
      return;
    }
    this.cb.onSeek(c.event.t);
  }

  /** Per-frame update: cursor, head and mode. */
  update(startT: number, headT: number, cursorT: number, live: boolean): void {
    // While live the cursor is the *current* simulation instant, which runs
    // ahead of the last stored frame by up to one cadence interval (30 s in an
    // orbital coast). The bar has to end at whichever is later, or the playhead
    // walks off the right edge of an `overflow: hidden` bar for the whole coast
    // and the scrubber can never be dragged to what is on screen.
    const head = Math.max(headT, cursorT);
    this.cursorT = cursorT;
    if (this.barW < 0) this.barW = this.bar.clientWidth;
    const axisMoved = this.axis.configure(startT, head, this.insertionT, Math.max(0, this.barW));
    if (this.shownHead !== head) {
      const secs = Math.floor(head);
      if (Math.floor(this.shownHead) !== secs || Number.isNaN(this.shownHead)) this.headLabel.textContent = fmtTime(head);
      this.shownHead = head;
    }
    const f = this.axis.frac(cursorT);
    // The thumb only moves when it would visibly move: one string per animation
    // frame is cheap, but writing a range value is not, and the common case
    // (paused, or a cursor that has not crossed a step) writes nothing.
    if (!this.dragging && Math.abs(this.shownRange - f) > 0.0004) {
      this.shownRange = f;
      this.range.value = String(f);
    }
    // Rounded to a tenth of a percent: below that the playhead cannot move a
    // whole pixel on any bar narrower than 1000 px, and the style write (plus
    // the string it allocates) is pure cost.
    const pct = Math.round(f * 1000) / 10;
    if (pct !== this.shownPlayhead) {
      this.shownPlayhead = pct;
      this.playhead.style.left = `${pct}%`;
    }
    if (Math.floor(this.shownCursor) !== Math.floor(cursorT) || Number.isNaN(this.shownCursor)) {
      const clock = fmtTime(cursorT);
      this.cursorLabel.textContent = clock;
      this.range.setAttribute('aria-valuetext', clock);
      this.shownCursor = cursorT;
    }
    if (live !== this.live || !this.modeLabel.textContent) {
      this.live = live;
      this.root.classList.toggle('replaying', !live);
      this.modeLabel.textContent = live ? t('tl.live') : t('ctl.replay');
    }
    this.layout(axisMoved);
  }

  /**
   * Measure the chips whose width is unknown. Batched deliberately: all the
   * writes first, then all the reads, so the browser reflows once instead of
   * once per chip. After the first layout of a mission this returns
   * immediately, because widths only change with the language or the bar's own
   * width (the media query narrows the chips on a phone).
   */
  private measure(): void {
    let pending = false;
    for (const c of this.chips) if (c.width < 0) { pending = true; break; }
    if (!pending) return;
    for (const c of this.chips) {
      if (c.width < 0) {
        c.el.textContent = c.label;
        c.el.classList.remove('collapsed', 'cluster', 'flip');
      }
    }
    for (const c of this.chips) {
      if (c.width < 0) {
        const w = c.el.offsetWidth;
        if (w > 0) c.width = w;
      }
    }
  }

  /** Measured width, or a cheap guess while the bar is not laid out yet. */
  private widthOf(c: Chip): number {
    return c.width > 0 ? c.width : Math.max(28, c.label.length * 6 + 16);
  }

  /**
   * Position the chips, the boundary and the ticks, and collapse the chips that
   * would overlap. Runs only when the geometry has moved enough to matter, so a
   * live flight re-lays out a few hundred times over an hour rather than 60
   * times a second.
   */
  private layout(force: boolean): void {
    // The one layout *read* in the file, and it is here rather than in
    // `update` because a layout runs a few hundred times over a mission while
    // `update` runs sixty times a second. The ResizeObserver normally gets
    // there first; this is what keeps the cached width honest if it does not.
    const w = this.bar.clientWidth || this.barW;
    if (w <= 0) return;
    this.barW = w;
    const axis = this.axis;
    const span = Math.max(1, axis.headT - axis.startT);
    const resized = w !== this.layoutWidth;
    const reshaped = Math.abs(axis.share - this.layoutShare) > 1e-4;
    if (!force && !resized && !reshaped && Math.abs(axis.headT - this.layoutHead) < span * 0.004) return;
    // A resize can cross the media query that shrinks the chips, so the cached
    // widths go with it.
    if (resized) for (const c of this.chips) { c.width = -1; c.sig = ''; }
    this.layoutWidth = w;
    this.layoutHead = axis.headT;
    this.layoutShare = axis.share;
    this.drawAxis(w);
    if (this.chips.length === 0) return;
    this.measure();
    const group = this.group;
    let lead: Chip | null = null;
    let leadLimit = -1e9;
    const flush = (): void => {
      if (!lead || group.length === 0) return;
      const count = group.length;
      const sig = `${count}|${group[0].event.t}|${group[count - 1].event.t}`;
      // Keyed on the member range, not on the count: a cluster whose membership
      // changes without changing size must still rewrite its tooltip.
      if (lead.sig === sig) return;
      lead.sig = sig;
      lead.members = group.map((m) => m.event);
      lead.cycle = 0; // the first click lands on the event the chip is labelled with
      lead.el.textContent = count > 1 ? `${lead.label} +${count - 1}` : lead.label;
      lead.el.classList.toggle('cluster', count > 1);
      // The tooltip carries the exact T+ time of every event in the cluster.
      let title = '';
      for (const m of group) title += `${m.label} · ${fmtTime(m.event.t)}\n${t(m.event.key, this.evParams(m.event))}\n`;
      if (count > 1) title += t('tl.clusterHint');
      lead.el.title = title.trimEnd();
    };
    /**
     * Make `c` the visible chip of the current group and re-derive the extent
     * the rest of the group has to fall inside. Always positions the chip on
     * its OWN mission time, so promoting a later member never moves an anchor
     * off the instant it stands for.
     */
    const show = (c: Chip): void => {
      const x = axis.frac(c.event.t) * w;
      const cw = this.widthOf(c);
      const reserve = cw + CLUSTER_PAD;
      const flip = x + reserve + EDGE_PAD > w;
      c.el.classList.remove('collapsed');
      c.el.classList.toggle('flip', flip);
      // The anchor is always the true mission time; only the body slides.
      c.el.style.left = `${(x / w) * 100}%`;
      // `+ CLUSTER_PAD` is room for the " +N" suffix a lead gains as soon as it
      // has a second member.
      leadLimit = (flip ? x : x + cw) + MIN_GAP + (group.length > 1 ? CLUSTER_PAD : 0);
    };
    for (const c of this.chips) {
      const x = axis.frac(c.event.t) * w;
      const cw = this.widthOf(c);
      // The measurement is of the bare label; a chip that turns out to lead a
      // cluster gains a " +N" suffix on top of it. Reserve that width in the
      // edge test, or a cluster lead near the head overflows the bar.
      const reserve = cw + CLUSTER_PAD;
      // Near the right edge the chip grows leftwards from its anchor instead of
      // rightwards, so the newest callout is readable the instant it fires.
      const flip = x + reserve + EDGE_PAD > w;
      const left = flip ? x - reserve : x;
      if (lead && left < leadLimit) {
        group.push(c);
        // Severity decides which of the group is on screen (SEVERITY_RANK).
        // Promotion only ever moves the visible chip to the right, so the
        // group's extent can only grow and the scan stays a single pass.
        if (SEVERITY_RANK[c.event.severity] > SEVERITY_RANK[lead.event.severity]) {
          lead.el.classList.add('collapsed');
          lead.el.classList.remove('flip');
          lead.sig = '';   // it is no longer a lead: force a rewrite if it becomes one again
          lead = c;
          show(c);
        } else {
          c.el.classList.add('collapsed');
          if (group.length === 2) leadLimit += CLUSTER_PAD; // room for the " +N"
        }
        continue;
      }
      flush();
      lead = c;
      group.length = 0;
      group.push(c);
      show(c);
    }
    flush();
  }

  /**
   * The boundary divider and the tick labels. Both are pure functions of the
   * axis, so they are rewritten only when a layout runs.
   */
  private drawAxis(w: number): void {
    const axis = this.axis;
    const brk = axis.breakT;
    this.brk.classList.toggle('hidden', brk === null);
    if (brk !== null) {
      this.brk.style.left = `${(axis.share * 100).toFixed(2)}%`;
      this.brk.title = this.insertionLabel;
    }
    const times = axis.ticks(this.tickTimes, w);
    const brkX = brk === null ? -1e9 : axis.share * w;
    const total = times.length + (brk !== null ? 1 : 0);
    while (this.tickEls.length < total) {
      const el = document.createElement('span');
      el.className = 'tl-tick';
      this.tickRow.appendChild(el);
      this.tickEls.push(el);
    }
    let i = 0;
    const place = (el: HTMLElement, f: number, label: string, boundary: boolean): void => {
      el.textContent = label;
      el.style.left = `${(f * 100).toFixed(2)}%`;
      // Edge labels anchor to the edge rather than to their centre, so the
      // first and last never hang outside the bar.
      el.style.transform = f < 0.06 ? 'none' : f > 0.94 ? 'translateX(-100%)' : 'translateX(-50%)';
      el.classList.toggle('boundary', boundary);
      el.classList.remove('hidden');
    };
    for (const time of times) {
      const f = axis.frac(time);
      // The boundary's label is the one that must survive: it says where the
      // ascent ends. A round-number tick too close to it is simply dropped.
      if (Math.abs(f * w - brkX) < TICK_CLEAR) continue;
      place(this.tickEls[i++], f, fmtTime(time), false);
    }
    if (brk !== null) place(this.tickEls[i++], axis.share, fmtTime(brk), true);
    for (; i < this.tickEls.length; i++) this.tickEls[i].classList.add('hidden');
  }
}
