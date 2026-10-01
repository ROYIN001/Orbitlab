/**
 * A vehicle drawn apart: the exploded view of the Build section's Watch level
 * ("exploded views of real rockets", docs/ROADMAP-PART2-3.md; the parts come
 * from D01's catalogue), and the side view D02 and D03 will draw a design
 * with. The same geometry serves both: `explode` = 0 is the stack as it
 * stands, 1 is every part moved apart, and anything between is the motion
 * from one to the other.
 *
 * WHERE THE NUMBERS COME FROM. Every length, diameter and axial position is
 * the stack's own: `stackLayout` (src/physics/frame.ts) places the stages and
 * the fairing exactly as the launch scene and the six-DOF model place them,
 * and the interstage adapters are D01's derived, massless display parts
 * (src/design/interstages.ts). Nothing here feeds a flight. Each drawn part
 * carries the catalogue part it is (src/design/vehicle-parts.ts), so clicking
 * it can show that part's card.
 *
 * WHAT IS DRAWING ONLY, and so an approximation of the real shape, not data:
 * the nose shapes (a Von Kármán nose on a fairing or a strap-on, the tangent
 * ogive of a ship that closes the stack, as src/render/ draws them), the R-7
 * core's taper and the lean of its strap-ons (from the published Soyuz-2
 * figures src/render/soyuz.ts uses), the nozzle bells (the pattern
 * src/data/engine-layout.ts gives the renderer and the six-DOF model, seen from
 * the side), and the gaps the parts are moved apart by.
 *
 * A SIDE VIEW. A ring of strap-ons seen from the side shows one on each side;
 * so each strap-on group is drawn as one unit on either side of the core and
 * labelled with its count, and a second group stands outside the first (the
 * drawing unrolls the ring). The fairing is split into its two halves along
 * the axis, as it separates in flight.
 *
 * DOM-free, SI (m). tests/design-exploded.test.ts holds the parts to the
 * stack's lengths and diameters, the exploded view to having no overlaps, the
 * strap-ons to symmetry and every part to a catalogue id.
 */
import type { StageSpec, VehicleSpec } from '../types';
import { stackLayout } from '../physics/frame';
import { engineLayout } from '../data/engine-layout';
import { interstageParts, type InterstagePart } from './interstages';
import { vehicleParts } from './vehicle-parts';

export type DrawnKind = 'stage' | 'interstage' | 'booster' | 'fairing';

/** One row of a part's outline: `y` m above its base, its left and right edges m from its centre line (l ≤ r). */
export interface OutlinePoint {
  y: number;
  l: number;
  r: number;
}

/** A nozzle bell as the side view shows it: centred `x` m from the part's centre line, exit radius and length, m. It hangs below the part's base. */
export interface Bell {
  x: number;
  r: number;
  len: number;
}

export interface DrawnPart {
  /** unique within a drawing: 'stage:1', 'interstage:0', 'booster:0:1:-1', 'fairing:1' */
  key: string;
  /**
   * The piece of hardware it draws, which a part card describes: 'stage:1',
   * 'interstage:0', 'booster:0:1' (both units of a strap-on group), 'fairing'
   * (both halves).
   */
  ref: string;
  kind: DrawnKind;
  /** the stage it is, stands on or is strapped to; for the fairing, the top stage's */
  stageIndex: number;
  /** strap-on group index, −1 for anything else */
  group: number;
  /** a strap-on unit or a fairing half: −1 on the left, +1 on the right; 0 for a part on the axis */
  side: -1 | 0 | 1;
  /** the catalogue part (a stage body, strap-on body or fairing id); null for an interstage or a design's own hardware */
  partId: string | null;
  /** the engine part of a stage or strap-on */
  enginePartId: string | null;
  /** an interstage: D01's derived, massless display part */
  interstage: InterstagePart | null;
  /** its centre line and base, m: lateral from the vehicle's axis, and above the bottom of the stack as it stands */
  x: number;
  y: number;
  /** m, the spec's */
  length: number;
  /** the body's diameter, m, the spec's; a fairing half is half of it wide */
  diameter: number;
  outline: OutlinePoint[];
  bells: Bell[];
}

export interface Drawing {
  parts: DrawnPart[];
  /** extents of everything drawn, bells included, m */
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// ── the shapes (drawing only) ─────────────────────────────────────────────────

/** src/render/soyuz.ts: Blok A's radius at its engines and at its top, as shares of its widest; the ring's height as a share of its length. */
const R7_CORE_BASE = 2.05 / 2.95;
const R7_CORE_TOP = 2.66 / 2.95;
const R7_CORE_RING = 19.6 / 27.8;
/** m: the truss drawn inside Blok A's own length, and the gap between a strap-on and the core */
const R7_TRUSS_INSIDE = 1.0;
const R7_BOOSTER_GAP = 0.06;
/** src/render/ship.ts: the share of a fairing-less top stage taken by its nose */
const SHIP_NOSE_FRACTION = 0.34;
/** src/render/rocket.ts: the share of a fairing that is cylinder below its nose */
const FAIRING_CYLINDER = 0.52;

/** Gaps of the exploded view, as shares of the vehicle's widest stage or fairing: along the axis, a strap-on out to the side, a fairing half out to the side. */
export const EXPLODE_GAP = { axial: 0.45, strapOn: 0.4, fairing: 0.25 } as const;

/** Von Kármán nose radius, `s` from 0 at its base to 1 at the tip (src/render/liveries.ts `ogiveProfile`). */
function haack(R: number, s: number): number {
  const th = Math.acos(Math.max(-1, Math.min(1, 2 * s - 1)));
  return s >= 1 ? 0 : (R / Math.sqrt(Math.PI)) * Math.sqrt(Math.max(0, th - Math.sin(2 * th) / 2));
}

/** Tangent-ogive nose radius, `y` m above its base (src/render/ship.ts `tangentOgiveRadius`). */
function tangentOgive(R: number, L: number, y: number): number {
  const rho = (R * R + L * L) / (2 * R);
  const z = Math.min(L, Math.max(0, y));
  return Math.max(0, Math.sqrt(Math.max(0, rho * rho - z * z)) + R - rho);
}

const sym = (y: number, w: number): OutlinePoint => ({ y, l: 0 - w, r: w });
const NOSE_STEPS = 8;

function noseRows(R: number, y0: number, len: number, radius: (R: number, s: number) => number): OutlinePoint[] {
  const out: OutlinePoint[] = [];
  for (let k = 1; k <= NOSE_STEPS; k++) {
    const s = k / NOSE_STEPS;
    out.push(sym(y0 + s * len, radius(R, s)));
  }
  return out;
}

function r7CoreRadius(R: number, L: number, y: number): number {
  const ring = R7_CORE_RING * L, shoulder = 0.8 * L, top = L - R7_TRUSS_INSIDE;
  if (y <= ring) return R * (R7_CORE_BASE + (1 - R7_CORE_BASE) * Math.max(0, y) / ring);
  if (y <= shoulder) return R;
  return R * (1 + (R7_CORE_TOP - 1) * Math.min(1, (y - shoulder) / (top - shoulder)));
}

function stageOutline(spec: VehicleSpec, st: StageSpec, index: number): OutlinePoint[] {
  const R = st.diameter / 2, L = st.length;
  if (st.profile === 'r7Core') {
    const top = L - R7_TRUSS_INSIDE, ring = R7_CORE_RING * L, shoulder = 0.8 * L;
    return [0, ring / 2, ring, shoulder, top, L].map((y) => sym(y, r7CoreRadius(R, L, Math.min(y, top))));
  }
  // a top stage flown without a fairing carries its payload in its own nose
  const last = spec.stages.reduce((k, s, i) => (s.isSpacecraft ? k : i), -1);
  if (!spec.fairing && index === last) {
    const nose = L * SHIP_NOSE_FRACTION, barrel = L - nose;
    const rows = [sym(0, R), sym(barrel, R)];
    for (let k = 1; k <= NOSE_STEPS; k++) rows.push(sym(barrel + (k / NOSE_STEPS) * nose, tangentOgive(R, nose, (k / NOSE_STEPS) * nose)));
    return rows;
  }
  return [sym(0, R), sym(L, R)];
}

/**
 * A strap-on's outline for the unit on the right (the left one is its mirror).
 * An R-7 strap-on is a cone whose tip leans in to meet the core's widest ring;
 * any other has a nose: a straight cone where the data says `conicalTop`, a
 * Von Kármán nose otherwise.
 */
function boosterOutline(d: number, L: number, conical: boolean, r7TipOffset: number | null): OutlinePoint[] {
  const r = d / 2;
  if (r7TipOffset !== null) return [sym(0, r), { y: L, l: r7TipOffset, r: r7TipOffset }];
  if (conical) {
    const nose = Math.min(0.3 * L, 1.6 * d);
    return [sym(0, r), sym(L - nose, r), sym(L, 0)];
  }
  const nose = Math.min(0.2 * L, 1.3 * d);
  return [sym(0, r), sym(L - nose, r), ...noseRows(r, L - nose, nose, haack)];
}

function fairingOutline(spec: VehicleSpec): OutlinePoint[] {
  const f = spec.fairing!;
  const R = f.diameter / 2, L = f.length;
  const below = [...spec.stages].reverse().find((s) => !s.isSpacecraft);
  const adapter = f.adapter ?? 0;
  const cyl = f.noseLength !== undefined ? L - f.noseLength : L * FAIRING_CYLINDER;
  const rows: OutlinePoint[] = adapter > 0 ? [sym(0, (below?.diameter ?? f.diameter) / 2), sym(adapter, R)] : [sym(0, R)];
  rows.push(sym(cyl, R), ...noseRows(R, cyl, L - cyl, haack));
  return rows;
}

/** One half of an outline, split along the centre line. */
const half = (rows: OutlinePoint[], side: -1 | 1): OutlinePoint[] =>
  rows.map((p) => (side < 0 ? { y: p.y, l: Math.min(0, p.l), r: 0 } : { y: p.y, l: 0, r: Math.max(0, p.r) }));

const mirror = (rows: OutlinePoint[]): OutlinePoint[] => rows.map((p) => ({ y: p.y, l: 0 - p.r, r: 0 - p.l }));

/**
 * The nozzles of a stage or strap-on seen from the side: the engine layout's
 * chambers and verniers projected on the drawing plane, one bell for each
 * distinct position (the ones behind are hidden by the ones in front).
 */
function sideBells(id: string, st: { engine: StageSpec['engine']; diameter: number; nozzleLength?: number }): Bell[] {
  const layout = engineLayout(id, st.engine, st.diameter / 2, st.nozzleLength);
  const all = [...layout.nozzles, ...layout.verniers].map((n) => ({ x: n.x, r: n.r, len: n.len }));
  all.sort((a, b) => b.r - a.r || a.x - b.x);
  const kept: Bell[] = [];
  for (const b of all) {
    if (kept.some((k) => Math.abs(k.x - b.x) < 0.6 * Math.min(k.r, b.r))) continue;
    kept.push(b);
  }
  return kept.sort((a, b) => a.x - b.x);
}

const bellDepth = (bells: readonly Bell[]): number => bells.reduce((m, b) => Math.max(m, b.len), 0);

// ── the view ──────────────────────────────────────────────────────────────────

/**
 * The vehicle as drawn, stood up or moved apart by `explode` (0 to 1), bottom
 * up: each stage, its strap-ons, the adapter on it, then the fairing's halves.
 * Bells hang under the part they belong to; when the stack stands, an upper
 * stage's bells are inside the adapter below it, so a drawing draws every bell
 * before any body (src/ui/build/stack-svg.ts does).
 */
export function explodedView(spec: VehicleSpec, explode = 1): Drawing {
  const f = Math.max(0, Math.min(1, explode));
  const layout = stackLayout(spec);
  const catalogue = vehicleParts(spec);
  const adapters = interstageParts(spec);
  const widest = Math.max(...spec.stages.filter((s) => !s.isSpacecraft).map((s) => s.diameter), spec.fairing?.diameter ?? 0);
  const gapAxial = EXPLODE_GAP.axial * widest * f;
  const gapSide = EXPLODE_GAP.strapOn * widest * f;
  const gapFairing = EXPLODE_GAP.fairing * (spec.fairing?.diameter ?? 0) * f;

  const parts: DrawnPart[] = [];
  const base = { group: -1, side: 0 as const, partId: null, enginePartId: null, interstage: null };
  // the chain along the axis, bottom up: each part moved up by the gaps below it
  let shift = 0;
  spec.stages.forEach((st, i) => {
    if (st.isSpacecraft) return;
    const bells = sideBells(st.id, st);
    if (i > 0) shift += gapAxial + bellDepth(bells) * f;
    const y = layout.base[i] + shift;
    const own = catalogue.stages[i];
    parts.push({
      ...base, key: `stage:${i}`, ref: `stage:${i}`, kind: 'stage', stageIndex: i, partId: own.body?.id ?? null, enginePartId: own.engine?.id ?? null,
      x: 0, y, length: st.length, diameter: st.diameter, outline: stageOutline(spec, st, i), bells,
    });
    // strap-ons, out to the sides; a second group stands outside the first
    const R = st.diameter / 2;
    const r7 = st.profile === 'r7Core';
    let inner = R;
    (st.boosters ?? []).forEach((g, k) => {
      const r = g.diameter / 2;
      const hug = r7 && g.conicalTop ? R * R7_CORE_BASE + R7_BOOSTER_GAP : R;
      if (k === 0) inner = hug;
      inner += gapSide;
      const centre = inner + r;
      // an R-7 strap-on's tip meets the core's widest ring, a gap away
      const tip = r7 && g.conicalTop ? (R + R7_BOOSTER_GAP) - (hug + r) : null;
      const right = boosterOutline(g.diameter, g.length, !!g.conicalTop, tip);
      const bellsRight = sideBells(g.id, g);
      const cat = catalogue.boosters[i][k];
      for (const side of [-1, 1] as const) {
        parts.push({
          ...base, key: `booster:${i}:${k}:${side}`, ref: `booster:${i}:${k}`, kind: 'booster', stageIndex: i, group: k, side,
          partId: cat.body?.id ?? null, enginePartId: cat.engine?.id ?? null,
          x: side * centre, y: y + (g.baseOffset ?? 0), length: g.length, diameter: g.diameter,
          outline: side > 0 ? right : mirror(right),
          bells: side > 0 ? bellsRight : bellsRight.map((b) => ({ ...b, x: 0 - b.x })).reverse(),
        });
      }
      inner += g.diameter;
    });
    const adapter = adapters.find((a) => a.stageIndex === i);
    if (adapter) {
      shift += gapAxial;
      parts.push({
        ...base, key: `interstage:${i}`, ref: `interstage:${i}`, kind: 'interstage', stageIndex: i, interstage: adapter,
        x: 0, y: layout.base[i] + st.length + shift, length: adapter.height, diameter: Math.max(adapter.lowerDiameter, adapter.upperDiameter),
        outline: [sym(0, adapter.lowerDiameter / 2), sym(adapter.height, adapter.upperDiameter / 2)], bells: [],
      });
    }
  });
  if (spec.fairing) {
    shift += gapAxial;
    const rows = fairingOutline(spec);
    const top = spec.stages.reduce((k, s, i) => (s.isSpacecraft ? k : i), 0);
    for (const side of [-1, 1] as const) {
      parts.push({
        ...base, key: `fairing:${side}`, ref: 'fairing', kind: 'fairing', stageIndex: top, side, partId: catalogue.fairing?.id ?? null,
        x: gapFairing > 0 ? side * gapFairing : 0, y: layout.total + shift, length: spec.fairing.length, diameter: spec.fairing.diameter,
        outline: half(rows, side), bells: [],
      });
    }
  }
  return { parts, ...partsExtent(parts) };
}

/** A part's extent, m, bells included. */
export function partBox(p: DrawnPart): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity, maxX = -Infinity;
  for (const o of p.outline) { minX = Math.min(minX, p.x + o.l); maxX = Math.max(maxX, p.x + o.r); }
  for (const b of p.bells) { minX = Math.min(minX, p.x + b.x - b.r); maxX = Math.max(maxX, p.x + b.x + b.r); }
  return { minX, maxX, minY: p.y - bellDepth(p.bells), maxY: p.y + p.length };
}

function partsExtent(parts: readonly DrawnPart[]): Omit<Drawing, 'parts'> {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of parts) {
    const b = partBox(p);
    minX = Math.min(minX, b.minX); maxX = Math.max(maxX, b.maxX);
    minY = Math.min(minY, b.minY); maxY = Math.max(maxY, b.maxY);
  }
  return parts.length ? { minX, maxX, minY, maxY } : { minX: 0, maxX: 0, minY: 0, maxY: 0 };
}

/** The widest the outline gets, m (for a fairing half, its own half). */
export function outlineWidth(p: DrawnPart): number {
  return p.outline.reduce((m, o) => Math.max(m, o.r - o.l), 0);
}

/**
 * The right edge of a part `y` m above its base, m from the vehicle's axis:
 * where a label's leader line meets it.
 */
export function rightEdgeAt(p: DrawnPart, y: number): number {
  const rows = p.outline;
  if (y <= rows[0].y) return p.x + rows[0].r;
  for (let k = 1; k < rows.length; k++) {
    const a = rows[k - 1], b = rows[k];
    if (y <= b.y) {
      const s = b.y > a.y ? (y - a.y) / (b.y - a.y) : 1;
      return p.x + a.r + (b.r - a.r) * s;
    }
  }
  return p.x + rows[rows.length - 1].r;
}
