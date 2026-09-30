import { afterEach, describe, expect, it, vi } from 'vitest';
import { chartImage, type ChartSnapshot } from '../src/ui/chart-export';
import { layoutChartMarkerLabels, paintChart, PRINT_THEME } from '../src/ui/charts';

const markers = [
  { x: 53, label: 'Max Q' }, { x: 159, label: 'MECO' }, { x: 162, label: 'Stage sep' },
  { x: 190, label: 'Fairing' }, { x: 473, label: 'SECO' },
  { x: 473.1, label: 'Burn' }, { x: 473.2, label: 'Parking orbit' },
  { x: 599, label: 'Near right edge' },
].map((m) => ({ ...m, color: '#3a4a5c' }));
const snapshot: ChartSnapshot = {
  series: [{ x: [-10, 600], y: [0, 200], color: '#6ec8ff' }],
  opt: { title: 'Altitude h (km)', xMin: -10, xMax: 600, markers },
};
type Drawn = { text: string; x: number; y: number; width: number; height: number };

/** Record real paintChart calls, with consistent monospace metrics. */
function context() {
  const drawn: Drawn[] = [];
  const stack: { x: number; y: number; font: string }[] = [];
  let x = 0, y = 0;
  const g = {
    font: '10px monospace',
    clearRect() {}, fillRect() {}, setTransform() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, setLineDash() {}, rect() {}, clip() {},
    save() { stack.push({ x, y, font: this.font }); },
    restore() { const state = stack.pop()!; x = state.x; y = state.y; this.font = state.font; },
    translate(dx: number, dy: number) { x += dx; y += dy; },
    measureText(text: string) { return { width: text.length * Number(/([\d.]+)px/.exec(this.font)![1]) * 0.6 }; },
    fillText(text: string, dx: number, dy: number, maxWidth?: number) {
      drawn.push({ text, x: x + dx, y: y + dy, width: Math.min(this.measureText(text).width, maxWidth ?? Infinity), height: Number(/([\d.]+)px/.exec(this.font)![1]) });
    },
  };
  return { g: g as unknown as CanvasRenderingContext2D, drawn };
}

function overlaps(a: Drawn, b: Drawn): boolean {
  return Math.max(a.x, b.x) < Math.min(a.x + a.width, b.x + b.width)
    && Math.max(a.y, b.y) < Math.min(a.y + a.height, b.y + b.height);
}

afterEach(() => vi.unstubAllGlobals());

describe('exported event labels', () => {
  it('separates the actual Falcon 9 clusters that overlapped in the original PNG', () => {
    const inline = context();
    paintChart(inline.g, 1200, 600, snapshot.series, snapshot.opt, PRINT_THEME, 1200 / 520);
    const before = inline.drawn.filter((d) => markers.some((m) => m.label === d.text));
    expect(before.some((a, i) => before.slice(i + 1).some((b) => overlaps(a, b)))).toBe(true);

    const exported = context();
    const canvas = { width: 0, height: 0, getContext: () => exported.g };
    vi.stubGlobal('document', { createElement: () => canvas });
    expect(chartImage(snapshot)).toBe(canvas);
    expect([canvas.width, canvas.height]).toEqual([2400, 1200]);
    const labels = exported.drawn.filter((d) => markers.some((m) => m.label === d.text));
    expect(labels).toHaveLength(markers.length);
    for (const [i, a] of labels.entries()) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x + a.width).toBeLessThanOrEqual(1200);
      expect(a.y + a.height).toBeLessThan(600 - 18 * 1200 / 520);
      for (const b of labels.slice(i + 1)) expect(overlaps(a, b), `${a.text} / ${b.text}`).toBe(false);
    }
  });

  it('fits long translated labels at both edges and keeps equal-time events distinct', () => {
    const placed = layoutChartMarkerLabels([
      { x: 299, width: 900 }, { x: 40, width: 180 }, { x: 40, width: 180 }, { x: 299, width: 50 },
    ], 44, 300, 3);
    expect(placed).toHaveLength(4);
    for (const [i, p] of placed.entries()) {
      expect(p.x).toBeGreaterThanOrEqual(44);
      expect(p.x + p.width).toBeLessThanOrEqual(300);
      for (const q of placed.slice(i + 1)) {
        if (p.row === q.row) expect(Math.max(p.x, q.x)).toBeGreaterThanOrEqual(Math.min(p.x + p.width, q.x + q.width) + 3);
      }
    }
    expect(placed[1].row).not.toBe(placed[2].row);
  });
});
