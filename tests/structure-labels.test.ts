/**
 * Where the names stand beside a model's things in the Structure section's
 * 3-D view (src/ui/structure/labels.ts): to one side of each thing and clear
 * of it, none over another, all inside the view; and the scale bar's round
 * lengths.
 */
import { describe, expect, it } from 'vitest';
import { layoutLabels, lengthUnit, scaleBar, type Anchor } from '../src/ui/structure/labels';

const W = 1000, H = 700;
const a = (id: string, x: number, y: number, r = 20, strong = false): Anchor => ({ id, text: id, x, y, r, strong });

describe('names beside a model\'s things', () => {
  it('names a thing on the side of the view it is on, clear of its outline', () => {
    const [left, right] = layoutLabels([a('L', 300, 300, 30), a('R', 700, 300, 30)], W, H, { reach: 18, width: 150 });
    expect(left).toMatchObject({ id: 'L', side: 'left', lx: 300 - 30 - 18, ly: 300 });
    expect(right).toMatchObject({ id: 'R', side: 'right', lx: 700 + 30 + 18, ly: 300 });
  });

  it('turns the things on the middle line about, left and right, from the top down (a rocket\'s stages stand one over another)', () => {
    const stack = ['fairing', 'fregat', 'stage3', 'interstage', 'core'].map((id, k) => a(id, 500, 100 + 100 * k));
    const placed = layoutLabels(stack, W, H);
    expect(placed.map((p) => [p.id, p.side]).sort((x, y) => stack.findIndex((s) => s.id === x[0]) - stack.findIndex((s) => s.id === y[0])))
      .toEqual([['fairing', 'right'], ['fregat', 'left'], ['stage3', 'right'], ['interstage', 'left'], ['core', 'right']]);
  });

  it('keeps the names of one side apart, in their things\' order from the top, however close the things are', () => {
    // four strap-ons at one height, two to each side of the middle band
    const close = [a('b', 420, 500), a('v', 430, 504), a('g', 570, 500), a('d', 580, 506)];
    const placed = layoutLabels(close, W, H, { gap: 26 });
    for (const side of ['left', 'right'] as const) {
      const lines = placed.filter((p) => p.side === side).map((p) => p.ly).sort((x, y) => x - y);
      expect(lines).toHaveLength(2);
      expect(lines[1] - lines[0]).toBeGreaterThanOrEqual(26);
    }
  });

  it('keeps every name inside the view: a column that would run off the bottom moves up as a whole', () => {
    const low = Array.from({ length: 6 }, (_, k) => a(`n${k}`, 200, 660 + k));
    const placed = layoutLabels(low, W, H, { gap: 26, margin: 10 });
    const lines = placed.map((p) => p.ly).sort((x, y) => x - y);
    expect(lines[lines.length - 1]).toBeLessThanOrEqual(H - 10);
    for (let k = 1; k < lines.length; k++) expect(lines[k] - lines[k - 1]).toBeGreaterThanOrEqual(26 - 1e-9);
    // and a name is never pushed past the view's edge, however far out its thing reaches
    const wide = layoutLabels([a('far-left', 30, 300, 80), a('far-right', 990, 300, 80)], W, H, { width: 150, margin: 10 });
    expect(wide.find((p) => p.id === 'far-left')!.lx).toBe(10 + 150);
    expect(wide.find((p) => p.id === 'far-right')!.lx).toBe(W - 10 - 150);
  });

  it('leaves out what is not in the view, and when there are too many keeps the ones the view is about', () => {
    const many = [a('off', -5, 300), a('below', 500, H + 1), a('a', 300, 100), a('b', 300, 200), a('sel', 300, 300, 20, true), a('c', 300, 400)];
    const kept = layoutLabels(many, W, H, { max: 2 });
    expect(kept.map((p) => p.id).sort()).toEqual(['a', 'sel']);
    expect(layoutLabels(many, W, H).map((p) => p.id).sort()).toEqual(['a', 'b', 'c', 'sel']);
    expect(layoutLabels([], W, H)).toEqual([]);
  });
});

describe('the scale under the picture', () => {
  it('is a round length (1, 2 or 5 times a power of ten) drawn between 60 and 150 px, at every zoom', () => {
    // every zoom from a single bolt to the whole rocket and beyond, in steps of 3 %
    const zooms: number[] = [];
    for (let mpp = 2e-5; mpp < 5; mpp *= 1.03) zooms.push(mpp);
    for (const mpp of [...zooms, 0.0004, 0.0013, 0.00313, 0.007, 0.02, 0.06, 0.11, 0.35, 0.9]) {
      const bar = scaleBar(mpp)!;
      expect(bar.px, String(mpp)).toBeGreaterThanOrEqual(60 - 1e-9);
      expect(bar.px, String(mpp)).toBeLessThanOrEqual(150 + 1e-9);
      expect(bar.px).toBeCloseTo(bar.metres / mpp, 9);
      const lead = bar.metres / 10 ** Math.floor(Math.log10(bar.metres) + 1e-9);
      expect([1, 2, 5].some((s) => Math.abs(lead - s) < 1e-6), `${mpp}: ${bar.metres}`).toBe(true);
    }
    // the rocket whole (about 0.07 m to a pixel) reads 10 m; the satellite (about 0.0005) 5 cm
    expect(scaleBar(0.075)!.metres).toBe(10);
    expect(scaleBar(0.0005)!.metres).toBeCloseTo(0.05, 12);
  });

  it('has nothing to show for a view with no size', () => {
    expect(scaleBar(0)).toBeNull();
    expect(scaleBar(-1)).toBeNull();
    expect(scaleBar(Number.NaN)).toBeNull();
    expect(scaleBar(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('is written in the unit that reads best', () => {
    expect(lengthUnit(10)).toEqual({ value: 10, unit: 'm' });
    expect(lengthUnit(1)).toEqual({ value: 1, unit: 'm' });
    expect(lengthUnit(0.5)).toEqual({ value: 50, unit: 'cm' });
    expect(lengthUnit(0.05).unit).toBe('cm');
    expect(lengthUnit(0.05).value).toBeCloseTo(5, 12);
    expect(lengthUnit(0.005).unit).toBe('mm');
    expect(lengthUnit(0.005).value).toBeCloseTo(5, 12);
  });
});
