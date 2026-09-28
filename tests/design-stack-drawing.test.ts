/**
 * The Build section's drawing laid out on screen (src/design/stack-drawing.ts):
 * to scale, inside its box, and with labels that do not collide.
 *
 * The boxes are the drawing's on the two screens the app is checked at, fixed
 * before the first run: a phone 375 px wide has 343 px inside its 16 px
 * gutters, and the Watch level gives the drawing about 440 px of height there;
 * a 1440 × 900 desktop gives it about 700 × 600 px. Label boxes may not
 * overlap by any amount, nor leave the box.
 */
import { describe, expect, it } from 'vitest';
import { VEHICLES } from '../src/data/vehicles';
import { explodedView } from '../src/design/exploded';
import { LABEL, fitFrame, labelledParts, layoutLabels, pxBox, scaleBarLength, stackLabels, toPx } from '../src/design/stack-drawing';

const BOXES = { phone: { width: 343, height: 440 }, desktop: { width: 700, height: 600 } } as const;

describe('the drawing in its box', () => {
  for (const v of VEHICLES) {
    for (const [name, box] of Object.entries(BOXES)) {
      it(`${v.id} on a ${name}: to scale, inside the box, labels apart`, () => {
        const apart = explodedView(v, 1);
        // one scale for both views, from the exploded extent
        const frame = fitFrame(apart, box);
        for (const explode of [0, 1]) {
          const d = explodedView(v, explode);
          let right = -Infinity;
          for (const p of d.parts) {
            const b = pxBox(frame, p);
            expect(b.left, p.key).toBeGreaterThanOrEqual(-1e-9);
            expect(b.top, p.key).toBeGreaterThanOrEqual(-1e-9);
            expect(b.right, p.key).toBeLessThanOrEqual(box.width + 1e-9);
            expect(b.bottom, p.key).toBeLessThanOrEqual(box.height + 1e-9);
            right = Math.max(right, b.right);
          }
          // the labels stand clear of the drawing, in a column at least this wide
          expect(frame.labelX).toBeGreaterThanOrEqual(right + LABEL.lead - 1e-9);
          expect(frame.labelWidth).toBeGreaterThanOrEqual(LABEL.minWidth);
          expect(frame.labelX + frame.labelWidth).toBeLessThanOrEqual(box.width + 1e-9);
          const labels = layoutLabels(d, frame, (p) => (p.kind === 'interstage' ? 1 : 2));
          // every piece of hardware has its label; only adapters' may go
          const want = labelledParts(d).filter((p) => p.kind !== 'interstage').map((p) => p.ref);
          for (const ref of want) expect(labels.map((l) => l.ref), ref).toContain(ref);
          const sorted = [...labels].sort((a, b) => a.top - b.top);
          sorted.forEach((l, k) => {
            expect(l.top).toBeGreaterThanOrEqual(0);
            expect(l.top + l.height).toBeLessThanOrEqual(box.height);
            if (k > 0) expect(l.top, `${sorted[k - 1].ref} / ${l.ref}`).toBeGreaterThanOrEqual(sorted[k - 1].top + sorted[k - 1].height);
          });
        }
        // the scale is the same metre for metre in both directions
        const a = toPx(frame, 0, 0), b = toPx(frame, 10, 10);
        expect(b.x - a.x).toBeCloseTo(a.y - b.y, 9);
      });
    }
  }
});

describe('stacking labels', () => {
  it('keeps a label at its anchor when there is room, and pushes crowded ones apart in order', () => {
    const one = stackLabels([{ ref: 'a', anchorX: 0, anchorY: 100, lines: 2, minor: false }], 0, 400)!;
    expect(one[0].top).toBe(100 - LABEL.lineHeight);
    const crowd = stackLabels(['a', 'b', 'c'].map((ref, k) => ({ ref, anchorX: 0, anchorY: 200 + k, lines: 2, minor: false })), 0, 400)!;
    expect(crowd.map((l) => l.ref)).toEqual(['a', 'b', 'c']);
    for (let k = 1; k < crowd.length; k++) expect(crowd[k].top).toBe(crowd[k - 1].top + crowd[k - 1].height + LABEL.gap);
  });

  it('pushes labels back up from the bottom, and says when they cannot fit', () => {
    const low = stackLabels(['a', 'b'].map((ref) => ({ ref, anchorX: 0, anchorY: 395, lines: 1, minor: false })), 0, 400)!;
    expect(low[1].top + low[1].height).toBe(400);
    expect(low[0].top + low[0].height + LABEL.gap).toBe(low[1].top);
    expect(stackLabels(Array.from({ length: 30 }, (_, k) => ({ ref: `${k}`, anchorX: 0, anchorY: 10, lines: 2, minor: false })), 0, 400)).toBeNull();
  });

  it('draws a round scale bar', () => {
    expect(scaleBarLength(110)).toBe(20);
    expect(scaleBarLength(18)).toBe(2);
    expect(scaleBarLength(50)).toBe(10);
    expect(scaleBarLength(4)).toBe(0.5);
  });
});
