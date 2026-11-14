/**
 * Where the names stand beside a model's things in the Structure section's
 * 3-D view: each to one side of its thing, clear of it, none over another,
 * all inside the view — and how long a bar the scale shows. Geometry only
 * (px in, px out), so it is tested without a browser
 * (tests/structure-labels.test.ts); src/ui/structure/overlay.ts draws them.
 */

/** A thing to name: where its middle is in the view (px), and how far its outline reaches to either side (px). */
export interface Anchor { id: string; text: string; x: number; y: number; r: number; strong?: boolean }

/** A name placed: its text starts (`right`) or ends (`left`) at `lx`, on the line `ly`; the leader runs from the anchor to it. */
export interface PlacedLabel extends Anchor { side: 'left' | 'right'; lx: number; ly: number }

export interface LabelOptions {
  /** the least distance between two names' lines on one side, px */
  gap?: number;
  /** names kept this far inside the view's edges, px */
  margin?: number;
  /** how far a name stands off its thing's outline, px */
  reach?: number;
  /** a name's widest width, px (it is kept inside the view by this) */
  width?: number;
  /** no more names than this (the strong ones first, then in the order given) */
  max?: number;
}

/**
 * Lay the names out: a thing left of the view's middle is named on its left,
 * one right of it on its right, and the things on the middle line (a
 * rocket's stages stand one over another) turn about, left and right, so
 * the names do not pile up on one side. On each side the names keep their
 * things' order from top to bottom and stand at least `gap` apart; a column
 * that would run off the bottom is moved up as a whole.
 */
export function layoutLabels(anchors: readonly Anchor[], width: number, height: number, options: LabelOptions = {}): PlacedLabel[] {
  const gap = options.gap ?? 22, margin = options.margin ?? 10, reach = options.reach ?? 18, labelWidth = options.width ?? 150;
  const max = options.max ?? anchors.length;
  const inside = anchors.filter((a) => a.x >= 0 && a.x <= width && a.y >= 0 && a.y <= height);
  const kept = [...inside.filter((a) => a.strong), ...inside.filter((a) => !a.strong)].slice(0, max);
  const middle = width / 2, band = Math.max(12, width * 0.05);
  // top to bottom, so the turn-about of the middle ones follows their height
  const ordered = [...kept].sort((a, b) => a.y - b.y);
  let turn = 0;
  const sided = ordered.map((a) => {
    const side: 'left' | 'right' = a.x < middle - band ? 'left' : a.x > middle + band ? 'right' : (turn++ % 2 === 0 ? 'right' : 'left');
    return { a, side };
  });
  const out: PlacedLabel[] = [];
  for (const side of ['left', 'right'] as const) {
    const column = sided.filter((s) => s.side === side).map((s) => s.a);
    let last = -Infinity;
    const lines = column.map((a) => { last = Math.max(a.y, last + gap); return last; });
    // run off the bottom: the whole column moves up, as far as the top allows
    const over = lines.length ? lines[lines.length - 1] - (height - margin) : 0;
    const shift = over > 0 ? Math.min(over, Math.max(0, lines[0] - margin - 8)) : 0;
    column.forEach((a, k) => {
      const want = side === 'right' ? a.x + a.r + reach : a.x - a.r - reach;
      const lx = side === 'right' ? Math.min(width - margin - labelWidth, Math.max(margin, want)) : Math.max(margin + labelWidth, Math.min(width - margin, want));
      out.push({ ...a, side, lx, ly: Math.min(height - margin, Math.max(margin + 8, lines[k] - shift)) });
    });
  }
  return out;
}

/**
 * A scale bar for a view that shows `metresPerPixel`: a round length (1, 2
 * or 5 times a power of ten) that is between `min` and `max` px long. The two
 * are 2.5 times apart, the widest step between two round lengths, so there is
 * always one.
 */
export function scaleBar(metresPerPixel: number, min = 60, max = 150): { metres: number; px: number } | null {
  if (!(metresPerPixel > 0) || !Number.isFinite(metresPerPixel)) return null;
  const target = metresPerPixel * ((min + max) / 2);
  const power = 10 ** Math.floor(Math.log10(target));
  let best: { metres: number; px: number } | null = null;
  for (const step of [1, 2, 5, 10]) {
    const metres = step * power, px = metres / metresPerPixel;
    if (px >= min && px <= max && (!best || Math.abs(px - (min + max) / 2) < Math.abs(best.px - (min + max) / 2))) best = { metres, px };
  }
  return best ?? { metres: target, px: (min + max) / 2 };
}

/** A length in the unit that reads best: metres from 1 m, centimetres from 1 cm, else millimetres. */
export function lengthUnit(metres: number): { value: number; unit: 'm' | 'cm' | 'mm' } {
  if (metres >= 1) return { value: metres, unit: 'm' };
  if (metres >= 0.01) return { value: metres * 100, unit: 'cm' };
  return { value: metres * 1000, unit: 'mm' };
}
