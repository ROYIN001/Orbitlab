/**
 * The Build section's exploded view (src/design/exploded.ts) and the
 * catalogue lookup behind it (src/design/vehicle-parts.ts): roadmap D01's
 * parts, drawn apart for the Watch level.
 *
 * Tolerances, fixed before the first comparison: lengths, diameters and the
 * positions the stack layout gives are copied, not computed, so they are
 * compared exactly (`toBe`); a position that is a sum the stack layout adds in
 * another order is held to 1e-9 m. The exploded view must have no two parts
 * whose extents (bells included) overlap at all.
 */
import { describe, expect, it } from 'vitest';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { BOOSTER_BODIES, FAIRING_PARTS, STAGE_BODIES } from '../src/data/parts';
import { stackLayout } from '../src/physics/frame';
import { interstageParts } from '../src/design/interstages';
import { EXPLODE_GAP, explodedView, outlineWidth, partBox, type DrawnPart } from '../src/design/exploded';
import { vehicleParts } from '../src/design/vehicle-parts';

const overlaps = (a: DrawnPart, b: DrawnPart): boolean => {
  const p = partBox(a), q = partBox(b);
  return Math.max(p.minX, q.minX) < Math.min(p.maxX, q.maxX) && Math.max(p.minY, q.minY) < Math.min(p.maxY, q.maxY);
};

describe('the catalogue parts of a vehicle (D01)', () => {
  it('finds a body, an engine and a fairing for every stage, strap-on group and fairing of the 21 vehicles', () => {
    expect(VEHICLES.length).toBe(21);
    for (const v of VEHICLES) {
      const cat = vehicleParts(v);
      v.stages.forEach((st, i) => {
        expect(cat.stages[i].body?.stageId, `${v.id} stage ${i}`).toBe(st.id);
        expect(cat.stages[i].engine?.id, `${v.id} stage ${i}`).toBe(cat.stages[i].body?.engine.part);
        expect(cat.stages[i].engine?.name, `${v.id} stage ${i}`).toBe(st.engine.name);
        (st.boosters ?? []).forEach((g, k) => {
          expect(cat.boosters[i][k].body?.stageId, `${v.id} group ${k}`).toBe(g.id);
          expect(cat.boosters[i][k].engine?.name, `${v.id} group ${k}`).toBe(g.engine.name);
        });
      });
      if (v.fairing) expect(cat.fairing, v.id).not.toBeNull();
      else expect(cat.fairing, v.id).toBeNull();
    }
  });

  it('names the parts src/data/vehicles.ts assembles, for vehicles stated by hand', () => {
    const ids = (id: string) => {
      const cat = vehicleParts(vehicleById(id));
      return { stages: cat.stages.map((s) => s.body?.id), boosters: cat.boosters.flat().map((b) => b.body?.id), fairing: cat.fairing?.id ?? null };
    };
    expect(ids('soyuz21a')).toEqual({ stages: ['blokA-soyuz21a', 'blokI-rd0110'], boosters: ['blokBVGD-soyuz2'], fairing: 'soyuz21a' });
    expect(ids('soyuz21b')).toEqual({ stages: ['blokA-soyuz21b', 'blokI-rd0124', 'fregat'], boosters: ['blokBVGD-soyuz2'], fairing: 'soyuz21b' });
    expect(ids('falconheavy')).toEqual({ stages: ['core', 's2'], boosters: ['side'], fairing: 'falcon9' });
    expect(ids('pslvxl')).toEqual({ stages: ['ps1', 'ps2', 'ps3', 'ps4'], boosters: ['psomg', 'psoma'], fairing: 'pslvxl' });
    expect(ids('starship')).toEqual({ stages: ['superheavy', 'ship'], boosters: [], fairing: null });
  });

  it('answers null for hardware no part emits', () => {
    const v = structuredClone(vehicleById('falcon9'));
    v.stages[1].dryMass += 1;
    v.stages[1].engine.thrustVac += 1;
    v.fairing!.mass += 1;
    const cat = vehicleParts(v);
    expect(cat.stages[0].body?.id).toBe('s1');
    expect(cat.stages[1].body).toBeNull();
    expect(cat.stages[1].engine).toBeNull();
    expect(cat.fairing).toBeNull();
  });
});

describe('the exploded view (Build · Watch)', () => {
  for (const v of VEHICLES) {
    describe(v.id, () => {
      const layout = stackLayout(v);
      const stood = explodedView(v, 0);
      const apart = explodedView(v, 1);
      const adapters = interstageParts(v);

      it('draws every stage, strap-on group (one unit a side), adapter and fairing half, and nothing else', () => {
        const groups = v.stages.reduce((n, s) => n + (s.boosters?.length ?? 0), 0);
        const want = v.stages.length + 2 * groups + adapters.length + (v.fairing ? 2 : 0);
        expect(stood.parts.length).toBe(want);
        expect(apart.parts.map((p) => p.key)).toEqual(stood.parts.map((p) => p.key));
        expect(new Set(apart.parts.map((p) => p.key)).size).toBe(want);
      });

      it('gives every drawn part its catalogue id, or D01\'s derived adapter', () => {
        const cat = vehicleParts(v);
        const bodies = new Set(STAGE_BODIES.map((b) => b.id)), straps = new Set(BOOSTER_BODIES.map((b) => b.id)), fairings = new Set(FAIRING_PARTS.map((f) => f.id));
        for (const p of apart.parts) {
          if (p.kind === 'interstage') {
            expect(p.partId).toBeNull();
            expect(adapters).toContainEqual(p.interstage);
            continue;
          }
          expect(p.partId, p.key).not.toBeNull();
          if (p.kind === 'stage') {
            expect(bodies.has(p.partId!), p.key).toBe(true);
            expect(p.partId).toBe(cat.stages[p.stageIndex].body!.id);
            expect(p.enginePartId).toBe(cat.stages[p.stageIndex].body!.engine.part);
          } else if (p.kind === 'booster') {
            expect(straps.has(p.partId!), p.key).toBe(true);
            expect(p.partId).toBe(cat.boosters[p.stageIndex][p.group].body!.id);
            expect(p.enginePartId).toBe(cat.boosters[p.stageIndex][p.group].body!.engine.part);
          } else {
            expect(fairings.has(p.partId!), p.key).toBe(true);
            expect(p.enginePartId).toBeNull();
          }
        }
        expect(apart.parts.filter((p) => p.kind === 'interstage').map((p) => p.interstage)).toEqual(adapters);
      });

      it('keeps the stack\'s lengths, diameters and positions when it stands', () => {
        for (const p of stood.parts) {
          const width = outlineWidth(p);
          if (p.kind === 'stage') {
            const st = v.stages[p.stageIndex];
            expect(p.length).toBe(st.length);
            expect(p.diameter).toBe(st.diameter);
            expect(width).toBe(st.diameter);
            expect(p.y).toBe(layout.base[p.stageIndex]);
            expect(p.x).toBe(0);
          } else if (p.kind === 'booster') {
            const g = v.stages[p.stageIndex].boosters![p.group];
            expect(p.length).toBe(g.length);
            expect(p.diameter).toBe(g.diameter);
            expect(width).toBe(g.diameter);
            expect(p.y).toBe(layout.base[p.stageIndex] + (g.baseOffset ?? 0));
          } else if (p.kind === 'interstage') {
            const a = p.interstage!;
            expect(p.length).toBe(a.height);
            expect(p.y).toBe(layout.base[p.stageIndex] + v.stages[p.stageIndex].length);
            // the adapter fills the rest of the stage's stacking height
            expect(Math.abs(p.y + p.length - (layout.base[p.stageIndex] + layout.height[p.stageIndex]))).toBeLessThan(1e-9);
            expect(p.outline[0].r * 2).toBe(a.lowerDiameter);
            expect(p.outline[p.outline.length - 1].r * 2).toBe(a.upperDiameter);
          } else {
            expect(p.length).toBe(v.fairing!.length);
            expect(p.diameter).toBe(v.fairing!.diameter);
            // each half is half the fairing wide
            expect(width * 2).toBe(v.fairing!.diameter);
            expect(p.y).toBe(layout.total);
            expect(p.x).toBe(0);
          }
          // the outline runs from the base to the top of the part
          expect(p.outline[0].y).toBe(0);
          expect(p.outline[p.outline.length - 1].y).toBe(p.length);
        }
        // the stack's height, the fairing on top, is the drawing's (bells apart)
        const top = Math.max(...stood.parts.map((p) => p.y + p.length));
        expect(Math.abs(top - (layout.total + (v.fairing?.length ?? 0)))).toBeLessThan(1e-9);
      });

      it('moves parts apart without changing them', () => {
        stood.parts.forEach((p, k) => {
          const q = apart.parts[k];
          expect(q.length).toBe(p.length);
          expect(q.diameter).toBe(p.diameter);
          expect(q.outline).toEqual(p.outline);
          expect(q.bells).toEqual(p.bells);
          expect(q.partId).toBe(p.partId);
        });
      });

      it('leaves no two parts overlapping when exploded', () => {
        const bad: string[] = [];
        apart.parts.forEach((a, i) => apart.parts.slice(i + 1).forEach((b) => { if (overlaps(a, b)) bad.push(`${a.key} × ${b.key}`); }));
        expect(bad).toEqual([]);
      });

      it('parts the stages along the axis by at least the gap, bells included', () => {
        const widest = Math.max(...v.stages.map((s) => s.diameter), v.fairing?.diameter ?? 0);
        const chain = apart.parts.filter((p) => p.side === 0 || p.kind === 'fairing');
        for (let k = 1; k < chain.length; k++) {
          const below = chain[k - 1], above = chain[k];
          if (above.kind === 'fairing' && below.kind === 'fairing') continue;
          const gap = partBox(above).minY - (below.y + below.length);
          expect(gap, `${below.key} → ${above.key}`).toBeGreaterThanOrEqual(EXPLODE_GAP.axial * widest - 1e-9);
        }
      });

      it('draws the strap-ons and the fairing halves as mirror images', () => {
        for (const right of apart.parts.filter((p) => p.side === 1)) {
          const left = apart.parts.find((p) => p.key === right.key.replace(/:1$/, ':-1'))!;
          expect(left, right.key).toBeDefined();
          expect(left.x).toBe(-right.x);
          expect(left.y).toBe(right.y);
          expect(left.length).toBe(right.length);
          expect(left.outline.map((o) => ({ y: o.y, l: 0 - o.r, r: 0 - o.l }))).toEqual(right.outline);
          expect(left.bells.map((b) => ({ ...b, x: 0 - b.x })).reverse()).toEqual(right.bells);
          // out to the side of whatever is on the axis
          if (right.kind === 'booster') expect(partBox(right).minX).toBeGreaterThan(0);
        }
      });
    });
  }
});
