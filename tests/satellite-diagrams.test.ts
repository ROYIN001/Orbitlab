import { describe, expect, it } from 'vitest';
import { SATELLITE_TEMPLATES } from '../src/data/satellite-templates';
import { designDateJd, designFigures, designFromTemplate } from '../src/design/satellite-model';
import { eclipseDiagram, footprintDiagram, linkDiagram } from '../src/design/satellite-diagrams';
import { LINK_MARGIN_THRESHOLD } from '../src/orbit/link';

const JD = designDateJd('2026-10-04')!;
const figuresOf = (id: string) => designFigures(designFromTemplate(id, 'd1', 'Test'), JD);

describe('R3.3 subsystem diagrams: the figures, only placed', () => {
  it('every template\'s diagrams carry its figures exactly, nothing worked out again', () => {
    for (const tpl of SATELLITE_TEMPLATES) {
      const f = figuresOf(tpl.id);
      const e = eclipseDiagram(f);
      expect(e.shadow).toBe(f.eclipse.nowFraction.value);
      expect(e.worstShadow).toBe(f.eclipse.worstFraction.value);
      expect(e.shadowTime).toBe(f.eclipse.now.value);
      expect(e.shadowTime + e.sunTime).toBeCloseTo(f.orbit.period.value, 6);
      expect(e.worstShadow).toBeGreaterThanOrEqual(e.shadow - 1e-9);
      const l = linkDiagram(f, LINK_MARGIN_THRESHOLD);
      expect(l.range).toBe(f.link.range.value);
      expect(l.margin).toBe(f.link.margin.value);
      expect(l.closes).toBe(f.link.margin.value >= LINK_MARGIN_THRESHOLD);
      expect(l.beamwidth).toBe(f.link.beamwidth?.value ?? null);
      const c = footprintDiagram(f);
      if (!f.camera) expect(c).toBeNull();
      else {
        expect(c!.altitude).toBe(f.camera.altitude.value);
        expect(c!.swath).toBe(f.camera.swath?.value ?? null);
        expect(c!.gsd).toBe(f.camera.gsd.value);
      }
    }
  });

  it('a design without a camera has no footprint to draw', () => {
    const d = designFromTemplate(SATELLITE_TEMPLATES[0].id, 'd1', 'Test');
    expect(footprintDiagram(designFigures({ ...d, payload: null }, JD))).toBeNull();
  });
});
