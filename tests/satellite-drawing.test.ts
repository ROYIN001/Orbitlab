import { describe, expect, it } from 'vitest';
import { SATELLITE_TEMPLATES } from '../src/data/satellite-templates';
import { designFromTemplate } from '../src/design/satellite-model';
import { satelliteDrawing, PART_TAB } from '../src/design/satellite-drawing';
import type { SatelliteDesign } from '../src/design/satellite-spec';

const fresh = (id: string): SatelliteDesign => designFromTemplate(id, 'd1', 'Test');
const draw = (d: SatelliteDesign) => {
  const r = satelliteDrawing(d);
  if (!r.ok) throw new Error(`not drawable: ${r.invalid.join(', ')}`);
  return r.drawing;
};

describe('R3.3 satellite drawing', () => {
  it('draws every template, with the bus and the array area the design gives', () => {
    for (const tpl of SATELLITE_TEMPLATES) {
      const d = fresh(tpl.id);
      const g = draw(d);
      expect(g.bus).toEqual(d.bus.size);
      const drawnArea = g.wings ? 2 * g.wings.span * g.wings.height : g.cells?.area ?? 0;
      expect(drawnArea).toBeCloseTo(d.power.arrayArea, 9);
      for (const p of g.parts) expect(PART_TAB[p]).toBeTruthy();
    }
  });

  it('draws nothing the design says is not there', () => {
    const d = fresh(SATELLITE_TEMPLATES[0].id);
    const none: SatelliteDesign = { ...d, power: { ...d.power, arrayArea: 0 }, propulsion: null, payload: null, comms: { ...d.comms, txAntennaD: 0 } };
    const g = draw(none);
    expect(g.parts).toEqual(['bus']);
    expect(g.wings).toBeNull(); expect(g.cells).toBeNull(); expect(g.engine).toBeNull(); expect(g.camera).toBeNull(); expect(g.antenna).toBeNull();
    expect(g.assumptions).toEqual([]);
  });

  it('tells tracking wings, body cells and a spinner apart, and labels each as an assumption', () => {
    const d = fresh(SATELLITE_TEMPLATES[0].id);
    const withMount = (mount: SatelliteDesign['power']['mount']) => draw({ ...d, power: { ...d.power, arrayArea: 1.2, mount } });
    const tracking = withMount('tracking'), body = withMount('body'), spin = withMount('spinner');
    expect(tracking.wings).not.toBeNull(); expect(tracking.assumptions).toContain('wings');
    expect(body.wings).toBeNull(); expect(body.cells?.mount).toBe('body'); expect(body.assumptions).toContain('bodyCells');
    expect(spin.cells?.mount).toBe('spinner'); expect(spin.assumptions).toContain('spinner');
  });

  it('flags body cells larger than the body can hold', () => {
    const d = fresh(SATELLITE_TEMPLATES[0].id);
    const { width, height, depth } = d.bus.size;
    const g = draw({ ...d, power: { ...d.power, mount: 'body', arrayArea: 3 * (width * height + width * depth + height * depth) } });
    expect(g.assumptions).toContain('bodyCellsExceed');
  });

  it('refuses a draft with an unusable figure instead of drawing a stale picture', () => {
    const d = fresh(SATELLITE_TEMPLATES[0].id);
    const r = satelliteDrawing({ ...d, bus: { ...d.bus, size: { ...d.bus.size, width: Number.NaN } }, power: { ...d.power, arrayArea: -1 } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.invalid).toEqual(['bus.size.width', 'power.arrayArea']);
  });

  it('a changed dish or aperture changes the drawing with it', () => {
    const d = fresh(SATELLITE_TEMPLATES.find((t) => t.design.payload)!.id);
    const g = draw({ ...d, comms: { ...d.comms, txAntennaD: 1.7 }, payload: { ...d.payload!, aperture: 0.42 } });
    expect(g.antenna?.diameter).toBe(1.7);
    expect(g.camera?.aperture).toBe(0.42);
  });

  it('R3.3 stowed: only wings fold, into panels as wide as the bus is deep, and the stowed drawing is narrower', () => {
    for (const tpl of SATELLITE_TEMPLATES) {
      const g = draw(fresh(tpl.id));
      if (!g.wings) { expect(g.stowed).toBeNull(); expect(g.assumptions).not.toContain('stowedPanels'); continue; }
      const st = g.stowed!;
      expect(st.panelsPerWing).toBe(Math.max(1, Math.ceil(g.wings.span / g.bus.depth - 1e-9)));
      expect(st.panelsPerWing * g.bus.depth).toBeGreaterThanOrEqual(g.wings.span - 1e-9);
      expect(st.extent.width).toBeLessThanOrEqual(g.extent.width + 1e-9);
      expect(st.extent.height).toBe(g.extent.height);
      expect(g.assumptions).toContain('stowedPanels');
    }
  });
});
