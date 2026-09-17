/**
 * Mission timeline: a scrubber from T-10 s to the recording head, with an
 * event bar of chips positioned by mission time.
 *
 * The scrubber is a native range input, so it is keyboard-accessible and
 * pointer/touch-driven for free; the chips are buttons above it. The bar grows
 * live as the recorder advances, which means chip positions move: to keep the
 * cost flat, chip *elements* are created only when the event count changes and
 * the layout (positions, clustering) only re-runs when the head has moved by
 * more than ~0.4 % of the span or the bar was resized. Everything else in the
 * per-frame path is two style writes and, at most, one text write.
 *
 * Two things the first cut got wrong, both fixed here:
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
 *   mattered. Past ~92 % the chip flips (`.tl-chip.flip`) and grows leftwards
 *   from its anchor, which stays on the true time either way.
 *
 * Chips that would overlap collapse into the earliest of them, which shows a
 * "+N" count, lists the whole group in its tooltip, and steps through the
 * group's times on repeated clicks.
 */
import { t } from '../i18n';
import type { SimEvent } from '../physics/simulation';
import { fmtTime } from './hud';
import { eventLabel } from './phase';

/** Minimum clear space between two rendered chips before they collapse, px. */
const MIN_GAP = 6;
/** Extra width a cluster lead takes when its label gains a " +N" suffix, px. */
const CLUSTER_PAD = 26;
/** How close to the right edge a chip has to be before it flips, px. */
const EDGE_PAD = 4;

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
  private cursorLabel: HTMLElement;
  private headLabel: HTMLElement;
  private modeLabel: HTMLElement;
  private cb: TimelineCallbacks;
  private chips: Chip[] = [];
  private events: SimEvent[] = [];
  private startT = -10;
  private headT = 0;
  private cursorT = -10;
  private live = true;
  private dragging = false;
  private layoutHead = -1e18;
  private layoutWidth = -1;
  private shownCursor = NaN;
  private shownRange = -1e18;
  private shownHead = NaN;
  /** scratch, reused so a layout allocates nothing until a cluster changes */
  private group: Chip[] = [];

  constructor(root: HTMLElement, cb: TimelineCallbacks) {
    this.root = root;
    this.cb = cb;
    root.className = 'timeline';
    root.innerHTML = `
      <div class="tl-bar"><div class="tl-playhead"></div></div>
      <input type="range" class="tl-range" min="-10" max="0" step="0.01" value="-10">
      <div class="tl-foot">
        <span class="tl-cursor mono"></span>
        <span class="tl-mode"></span>
        <span class="tl-head mono"></span>
      </div>`;
    this.bar = root.querySelector('.tl-bar') as HTMLElement;
    this.playhead = root.querySelector('.tl-playhead') as HTMLElement;
    this.range = root.querySelector('.tl-range') as HTMLInputElement;
    this.cursorLabel = root.querySelector('.tl-cursor') as HTMLElement;
    this.headLabel = root.querySelector('.tl-head') as HTMLElement;
    this.modeLabel = root.querySelector('.tl-mode') as HTMLElement;
    this.applyStaticText();

    this.range.addEventListener('input', () => {
      this.cursorT = Number(this.range.value);
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
      const rect = this.bar.getBoundingClientRect();
      if (rect.width <= 0) return;
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.cb.onSeek(this.startT + frac * Math.max(0, this.headT - this.startT));
    });
  }

  /** Arrow keys seek 5 s (30 s with shift); Home/End jump to the ends. */
  onKey(e: KeyboardEvent): boolean {
    const stepSize = e.shiftKey ? 30 : 5;
    if (e.key === 'ArrowLeft') this.cb.onSeek(this.cursorT - stepSize);
    else if (e.key === 'ArrowRight') this.cb.onSeek(this.cursorT + stepSize);
    else if (e.key === 'Home') this.cb.onSeek(this.startT);
    else if (e.key === 'End') this.cb.onLive();
    else return false;
    e.preventDefault();
    return true;
  }

  /** Re-render the labels after a language change. */
  applyStaticText(): void {
    this.range.title = t('tl.scrub');
    this.range.setAttribute('aria-label', t('tl.scrub'));
    this.modeLabel.textContent = this.live ? t('tl.live') : t('ctl.replay');
    for (const c of this.chips) {
      c.label = eventLabel(c.event.key, c.event.params);
      c.width = -1; // a translated label is a different width
      c.sig = '';   // force the text and tooltip to be rewritten
    }
    this.layout(true);
    this.shownCursor = NaN;
    this.shownHead = NaN;
  }

  /** Drop every chip (a new mission). */
  reset(): void {
    this.events = [];
    this.chips = [];
    this.bar.innerHTML = '';
    this.bar.appendChild(this.playhead);
    this.layoutHead = -1e18;
    this.layoutWidth = -1;
    this.shownRange = -1e18;
    this.shownCursor = NaN;
    this.shownHead = NaN;
  }

  /**
   * Point the bar at the recorded event list. The DOM is only touched when the
   * number of events has changed; the recording never rewrites past events.
   */
  setEvents(events: SimEvent[]): void {
    if (events.length === this.chips.length && events === this.events) return;
    this.events = events;
    if (events.length < this.chips.length) {
      this.reset();
      this.events = events;
    }
    for (let i = this.chips.length; i < events.length; i++) {
      const ev = events[i];
      const el = document.createElement('button');
      el.className = `tl-chip sev-${ev.severity}`;
      el.type = 'button';
      const chip: Chip = { el, event: ev, label: eventLabel(ev.key, ev.params), width: -1, sig: '', members: [ev], cycle: 0 };
      el.addEventListener('click', () => this.chipClick(chip));
      this.bar.appendChild(el);
      this.chips.push(chip);
    }
    this.layout(true);
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
    this.startT = startT;
    this.headT = head;
    this.cursorT = cursorT;
    const span = Math.max(1, head - startT);
    if (this.shownHead !== head) {
      const lo = String(startT);
      if (this.range.min !== lo) this.range.min = lo;
      this.range.max = String(head);
      const secs = Math.floor(head);
      if (Math.floor(this.shownHead) !== secs || Number.isNaN(this.shownHead)) this.headLabel.textContent = fmtTime(head);
      this.shownHead = head;
    }
    // The thumb only moves when it would visibly move: one string per animation
    // frame is cheap, but writing a range value is not, and the common case
    // (paused, or a cursor that has not crossed a step) writes nothing.
    if (!this.dragging && Math.abs(this.shownRange - cursorT) > 0.02) {
      this.shownRange = cursorT;
      this.range.value = String(cursorT);
    }
    this.playhead.style.left = `${((cursorT - startT) / span) * 100}%`;
    if (Math.floor(this.shownCursor) !== Math.floor(cursorT) || Number.isNaN(this.shownCursor)) {
      this.cursorLabel.textContent = fmtTime(cursorT);
      this.shownCursor = cursorT;
    }
    if (live !== this.live || !this.modeLabel.textContent) {
      this.live = live;
      this.root.classList.toggle('replaying', !live);
      this.modeLabel.textContent = live ? t('tl.live') : t('ctl.replay');
    }
    this.layout(false);
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
   * Position the chips and collapse the ones that would overlap. Runs only when
   * the geometry has moved enough to matter, so a live flight re-lays out a few
   * hundred times over an hour rather than 60 times a second.
   */
  private layout(force: boolean): void {
    const w = this.bar.clientWidth;
    if (w <= 0 || this.chips.length === 0) return;
    const span = Math.max(1, this.headT - this.startT);
    const resized = w !== this.layoutWidth;
    if (!force && !resized && Math.abs(this.headT - this.layoutHead) < span * 0.004) return;
    // A resize can cross the media query that shrinks the chips, so the cached
    // widths go with it.
    if (resized) for (const c of this.chips) { c.width = -1; c.sig = ''; }
    this.measure();
    this.layoutWidth = w;
    this.layoutHead = this.headT;
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
      lead.cycle = count > 1 ? 1 : 0; // the first click already went to the lead
      lead.el.textContent = count > 1 ? `${lead.label} +${count - 1}` : lead.label;
      lead.el.classList.toggle('cluster', count > 1);
      // The tooltip carries the exact T+ time of every event in the cluster.
      let title = '';
      for (const m of group) title += `${m.label} · ${fmtTime(m.event.t)}\n${t(m.event.key, m.event.params)}\n`;
      if (count > 1) title += t('tl.clusterHint');
      lead.el.title = title.trimEnd();
    };
    for (const c of this.chips) {
      const x = ((c.event.t - this.startT) / span) * w;
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
        c.el.classList.add('collapsed');
        if (group.length === 2) leadLimit += CLUSTER_PAD; // room for the " +N"
        continue;
      }
      flush();
      lead = c;
      group.length = 0;
      group.push(c);
      leadLimit = (flip ? x : x + cw) + MIN_GAP;
      c.el.classList.remove('collapsed');
      c.el.classList.toggle('flip', flip);
      // The anchor is always the true mission time; only the body slides.
      c.el.style.left = `${(x / w) * 100}%`;
    }
    flush();
  }
}
