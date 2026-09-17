/**
 * Piecewise mission-time axis for the timeline (audit B3).
 *
 * A linear `t / totalDuration` axis is unusable on a long flight: a six-hour
 * GTO recording compresses the whole ascent — T-10 to insertion, which is where
 * every callout and every interesting second of the mission lives — into about
 * 3 % of the bar, so the ascent is roughly 60 s per pixel and cannot be scrubbed
 * at all. This axis gives the ascent a guaranteed share of the bar and maps the
 * coast/orbit remainder into what is left, with a visible boundary between the
 * two.
 *
 * The share is *measured, not fixed*: the ascent asks for as many pixels as it
 * needs for 1 s per pixel (`ascentSpan / width`), is never given less than
 * `MIN_ASCENT_SHARE` on a mission long enough to need the help, and never so
 * much that the rest of the flight falls below `MIN_COAST_PX`. When the
 * ascent's *natural* linear share is already the larger number — a mission that
 * has not coasted yet, or a suborbital hop — the axis stays strictly linear and
 * reports no boundary, because distorting an axis that does not need it only
 * makes the times harder to read.
 *
 * Measured on the shipped default mission (Soyuz-2.1a → ISS, insertion at
 * T+536 s, recorded to T+1 907 s) at a 1280x800 window, where the bar is
 * 597 px: the linear axis gives 3.21 s/px through the ascent and this one gives
 * 1.19 s/px. 1.00 s/px would need 566 of the 597 px — 95 % of the bar — leaving
 * 31 px for the remaining 22 minutes, so the 1 s/px target is met from a
 * ~1390 px window upwards and approached, not reached, at 1280 px. On a
 * six-hour GTO recording the same mapping is 1.2 s/px against the linear
 * axis's 36 s/px, which is the case B3 was actually filed about.
 *
 * The class is pure arithmetic: no DOM, no allocation in `frac`/`time`, and
 * `ticks()` fills a caller-owned array. `configure` returns whether the mapping
 * actually moved, which is what lets the timeline skip a re-layout.
 */

/** Smallest share of the bar the ascent gets once the axis segments, 0..1. */
export const MIN_ASCENT_SHARE = 0.4;
/** Largest share of the bar the ascent may take, whatever the bar's width. */
export const MAX_ASCENT_SHARE = 0.85;
/**
 * Pixels the post-insertion segment keeps, whatever the ascent asks for.
 *
 * The cap on the ascent's share is stated in pixels rather than as a fraction
 * because what makes the rest of the flight unusable is an absolute number of
 * pixels, not a proportion: 25 % of a 300 px phone bar is 75 px and unusable,
 * while 15 % of a 1 170 px bar is 175 px and fine. 120 px is about twenty
 * event chips' worth of anchor spread, and it is enough that clicking in the
 * coast of a six-hour recording lands inside the right three minutes.
 */
export const MIN_COAST_PX = 120;

/** Tick spacings in seconds, coarsest last. */
const STEPS = [1, 2, 5, 10, 15, 20, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600, 43200];

/** The coarsest step that puts at most `maxTicks` intervals into `span`. */
function niceStep(span: number, maxTicks: number): number {
  for (const s of STEPS) if (span / s <= maxTicks) return s;
  return STEPS[STEPS.length - 1];
}

export class TimeAxis {
  /** mission time at the left edge of the bar */
  startT = -10;
  /** mission time at the right edge of the bar */
  headT = 0;
  /**
   * Mission time of the segment boundary (insertion), or `null` when the axis
   * is linear. Always strictly between `startT` and `headT` when set.
   */
  breakT: number | null = null;
  /** fraction of the bar the ascent segment occupies, 0..1 */
  share = 1;
  /** bar width the share was computed for, px (0 when unknown) */
  width = 0;

  /**
   * Point the axis at a recording.
   *
   * @param startT  first recorded mission time (T-10 s)
   * @param headT   mission time of the recording head
   * @param insertionT mission time of insertion, or null when the flight has
   *        not reached it (then the axis is linear — there is no ascent to
   *        protect from anything yet)
   * @param width   rendered bar width in CSS pixels
   * @returns true when the *shape* of the mapping changed (the boundary, the
   *          share or the width). A moving head alone does not count: the
   *          timeline has its own threshold for that, and reporting every
   *          advancing frame as a change would re-lay out the bar 60 times a
   *          second.
   */
  configure(startT: number, headT: number, insertionT: number | null, width: number): boolean {
    const span = Math.max(1, headT - startT);
    let brk: number | null = null;
    let share = 1;
    if (insertionT !== null && insertionT > startT && insertionT < headT - 1e-6) {
      const ascentSpan = insertionT - startT;
      const natural = ascentSpan / span;
      // Pixels for 1 s of ascent per pixel, as a fraction of the bar. Falls
      // back to the floor before the bar has been laid out.
      const wanted = width > 0 ? Math.max(MIN_ASCENT_SHARE, ascentSpan / width) : MIN_ASCENT_SHARE;
      const cap = width > 0
        ? Math.max(MIN_ASCENT_SHARE, Math.min(MAX_ASCENT_SHARE, 1 - MIN_COAST_PX / width))
        : MAX_ASCENT_SHARE;
      const s = Math.min(cap, wanted);
      if (s > natural + 1e-4) {
        brk = insertionT;
        share = s;
      }
    }
    const moved = this.startT !== startT
      || this.breakT !== brk
      || Math.abs(this.share - share) > 1e-4
      || this.width !== width;
    this.startT = startT;
    this.headT = headT;
    this.breakT = brk;
    this.share = share;
    this.width = width;
    return moved;
  }

  /** True when the axis has two segments (and therefore a boundary to draw). */
  get segmented(): boolean {
    return this.breakT !== null;
  }

  /** Fraction of the bar, 0..1, for mission time `t`. */
  frac(t: number): number {
    const brk = this.breakT;
    const lo = this.startT;
    const hi = this.headT;
    if (hi - lo < 1e-9) return 0;
    let f: number;
    if (brk === null) {
      f = (t - lo) / (hi - lo);
    } else if (t <= brk) {
      f = ((t - lo) / (brk - lo)) * this.share;
    } else {
      f = this.share + ((t - brk) / (hi - brk)) * (1 - this.share);
    }
    return f < 0 ? 0 : f > 1 ? 1 : f;
  }

  /** Mission time at fraction `f` of the bar. */
  time(f: number): number {
    const x = f < 0 ? 0 : f > 1 ? 1 : f;
    const brk = this.breakT;
    const lo = this.startT;
    const hi = this.headT;
    if (brk === null) return lo + x * (hi - lo);
    if (x <= this.share) return lo + (x / this.share) * (brk - lo);
    return brk + ((x - this.share) / (1 - this.share)) * (hi - brk);
  }

  /**
   * Seconds of mission time per pixel in the ascent segment — the number the
   * scrubbing-precision requirement is stated in. For a linear axis it is the
   * precision of the whole bar.
   */
  secondsPerPixel(width = this.width): number {
    if (width <= 0) return Infinity;
    const brk = this.breakT;
    if (brk === null) return (this.headT - this.startT) / width;
    return (brk - this.startT) / (this.share * width);
  }

  /**
   * Fill `out` with tick times for a bar `width` px wide, ascending, excluding
   * the boundary itself (the timeline draws that separately). Reuses the array,
   * so a per-frame caller allocates nothing.
   */
  ticks(out: number[], width: number): number[] {
    out.length = 0;
    const brk = this.breakT;
    const lo = this.startT;
    const hi = this.headT;
    if (hi - lo < 1e-9 || width <= 0) return out;
    /**
     * One tick per ~70 px of segment, at a round number of seconds. A label is
     * about 40 px wide ("T+09:15"), so 70 px is the spacing at which two
     * neighbours still have clear air between them.
     */
    const fill = (from: number, to: number, px: number): void => {
      if (to - from < 1e-9) return;
      const step = niceStep(to - from, Math.max(1, Math.round(px / 70)));
      // Start at the first round multiple far enough inside the segment that a
      // tick label never lands on top of the left edge or the boundary label;
      // the far end needs less clearance, because the label to its right is
      // either the boundary's (anchored past it) or the head's, in the foot row.
      let k = Math.ceil((from + step * 0.35) / step) * step;
      for (; k < to - step * 0.2; k += step) out.push(k);
    };
    if (brk === null) {
      fill(lo, hi, width);
    } else {
      fill(lo, brk, this.share * width);
      fill(brk, hi, (1 - this.share) * width);
    }
    return out;
  }
}
