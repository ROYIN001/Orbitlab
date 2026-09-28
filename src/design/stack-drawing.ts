/**
 * Fitting a drawn stack into a box on screen, and its labels (the Build
 * section's drawings: the Watch level's exploded view, and the side view D02
 * and D03 will draw a design with).
 *
 * The drawing is to scale: one scale for the whole vehicle, taken from its
 * exploded extent, so the stack standing and the stack moved apart are drawn
 * at the same size and the parts visibly move rather than shrink. Labels stand
 * in a column to the right of the drawing, one per piece of hardware (a
 * strap-on group and the fairing get one, on their right-hand unit), each
 * joined to its part by a leader line. They are placed along the column from
 * their parts' heights and pushed apart where they would collide: a phone is
 * 343 px wide inside its gutters, and a tall rocket's parts can be a few
 * pixels apart there. When two-line labels do not fit the column they drop
 * to one line, then the adapters' labels go; the part stays clickable.
 *
 * DOM-free: src/ui/build/stack-svg.ts draws what this lays out, and
 * tests/design-stack-drawing.test.ts checks that no two labels collide and
 * none leaves the box, for every catalogue vehicle at phone and desktop size.
 */
import { partBox, rightEdgeAt, type Drawing, type DrawnPart } from './exploded';

export interface Box {
  width: number;
  height: number;
}

export interface Extent {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Frame {
  /** the SVG's size and viewBox, px */
  width: number;
  height: number;
  /** px per metre */
  scale: number;
  /** the vehicle's axis and the bottom of the stack as it stands, px */
  originX: number;
  originY: number;
  /** where the label column starts, and how wide it is, px */
  labelX: number;
  labelWidth: number;
}

/** Text metrics the layout works with, px. */
export const LABEL = { lineHeight: 15, gap: 4, lead: 18, pad: 12, minWidth: 96, maxWidth: 230 } as const;

/**
 * The frame that fits `extent` (m) into `box` (px) with a label column beside
 * it. The label column takes what the drawing does not need, up to a limit;
 * the pair is centred in the box.
 */
export function fitFrame(extent: Extent, box: Box): Frame {
  const pad = LABEL.pad;
  const w = Math.max(1, extent.maxX - extent.minX), h = Math.max(1, extent.maxY - extent.minY);
  const labelWidth = Math.max(LABEL.minWidth, Math.min(LABEL.maxWidth, box.width * 0.46));
  const room = Math.max(1, box.width - 2 * pad - LABEL.lead - labelWidth);
  const scale = Math.max(1e-6, Math.min((box.height - 2 * pad) / h, room / w));
  const drawn = w * scale;
  // centre the drawing and its labels together
  const left = Math.max(pad, (box.width - (drawn + LABEL.lead + labelWidth)) / 2);
  const originX = left - extent.minX * scale;
  const originY = pad + extent.maxY * scale + ((box.height - 2 * pad) - h * scale) / 2;
  return { width: box.width, height: box.height, scale, originX, originY, labelX: left + drawn + LABEL.lead, labelWidth: Math.min(labelWidth, box.width - pad - (left + drawn + LABEL.lead)) };
}

export const toPx = (f: Frame, x: number, y: number): { x: number; y: number } => ({ x: f.originX + x * f.scale, y: f.originY - y * f.scale });

/** The parts that carry a label: every piece of hardware once, on its right-hand unit. */
export function labelledParts(drawing: Drawing): DrawnPart[] {
  return drawing.parts.filter((p) => p.side !== -1);
}

/**
 * Where a part's leader line meets it, m: its right edge, halfway up — or,
 * for a stage with strap-ons, halfway up what stands clear above them, so the
 * line does not start behind a strap-on.
 */
export function anchorOf(p: DrawnPart, drawing: Drawing): { x: number; y: number } {
  let y0 = p.y, y1 = p.y + p.length;
  if (p.kind === 'fairing') y1 = p.y + p.length * 0.6;
  if (p.kind === 'stage') {
    const straps = drawing.parts.filter((q) => q.kind === 'booster' && q.stageIndex === p.stageIndex);
    const top = straps.reduce((m, q) => Math.max(m, q.y + q.length), -Infinity);
    if (straps.length && y1 - top > 0.15 * p.length) y0 = top;
  }
  const y = (y0 + y1) / 2;
  return { x: rightEdgeAt(p, y - p.y), y };
}

export interface LabelRequest {
  ref: string;
  /** the anchor, px */
  anchorX: number;
  anchorY: number;
  /** lines of text it would like */
  lines: number;
  /** an adapter's label: the first to go when the column is full */
  minor: boolean;
}

export interface PlacedLabel {
  ref: string;
  anchorX: number;
  anchorY: number;
  /** top of the label and its height, px */
  top: number;
  height: number;
  lines: number;
}

const heightOf = (lines: number): number => lines * LABEL.lineHeight;

/**
 * Stack labels in a column between `top` and `bottom` px, each as near its
 * anchor's height as the others allow, none overlapping; null when they
 * cannot all fit.
 */
export function stackLabels(requests: readonly LabelRequest[], top: number, bottom: number): PlacedLabel[] | null {
  const items = requests.map((r) => ({ ...r, height: heightOf(r.lines), top: 0 })).sort((a, b) => a.anchorY - b.anchorY);
  const need = items.reduce((s, it) => s + it.height, 0) + LABEL.gap * Math.max(0, items.length - 1);
  if (need > bottom - top) return null;
  // down the column: each at its anchor, or just under the one above
  let floor = top;
  for (const it of items) {
    it.top = Math.max(floor, Math.min(bottom - it.height, it.anchorY - it.height / 2));
    floor = it.top + it.height + LABEL.gap;
  }
  // back up from the bottom where the column ran over
  let ceiling = bottom;
  for (let k = items.length - 1; k >= 0; k--) {
    const it = items[k];
    it.top = Math.min(it.top, ceiling - it.height);
    ceiling = it.top - LABEL.gap;
  }
  return items.map(({ ref, anchorX, anchorY, top: t, height, lines }) => ({ ref, anchorX, anchorY, top: t, height, lines }));
}

/**
 * The labels of a drawing in a frame: two lines each (what the part is, and
 * its engine) where the column has room, else one, else without the
 * adapters'. `lines(p)` says how many lines a part's label has at most.
 */
export function layoutLabels(drawing: Drawing, frame: Frame, lines: (p: DrawnPart) => number): PlacedLabel[] {
  const parts = labelledParts(drawing);
  const request = (p: DrawnPart, most: number): LabelRequest => {
    const a = anchorOf(p, drawing);
    const px = toPx(frame, a.x, a.y);
    return { ref: p.ref, anchorX: px.x, anchorY: px.y, lines: Math.max(1, Math.min(most, lines(p))), minor: p.kind === 'interstage' };
  };
  const top = LABEL.pad / 2, bottom = frame.height - LABEL.pad / 2;
  for (const [most, minors] of [[2, true], [1, true], [2, false], [1, false]] as const) {
    const placed = stackLabels(parts.filter((p) => minors || p.kind !== 'interstage').map((p) => request(p, most)), top, bottom);
    if (placed) return placed;
  }
  return [];
}

/** A part's extent in px. */
export function pxBox(f: Frame, p: DrawnPart): { left: number; right: number; top: number; bottom: number } {
  const b = partBox(p);
  const a = toPx(f, b.minX, b.maxY), c = toPx(f, b.maxX, b.minY);
  return { left: a.x, right: c.x, top: a.y, bottom: c.y };
}

/** A round length for a scale bar about a fifth of `metres` long: 1, 2 or 5 × a power of ten. */
export function scaleBarLength(metres: number): number {
  const target = Math.max(1e-3, metres / 5);
  const p = 10 ** Math.floor(Math.log10(target));
  return [1, 2, 5, 10].map((k) => k * p).filter((v) => v <= target).pop() ?? p;
}
