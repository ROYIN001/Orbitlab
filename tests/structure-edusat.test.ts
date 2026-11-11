/**
 * EduSat-3U's geometry and its figures against the CubeSat Design
 * Specification's bounds (src/structure/edusat.ts, edusat-design.ts) and
 * what is drawn of it (src/render/edusat-model.ts): the frame convention,
 * the centre of gravity of each of the four designs worked by hand, the
 * verdict of every check, the bays, and that what is drawn stands where the
 * figures say (nothing inside a rail's metal, nothing further out than the
 * protrusion checked).
 */
import { describe, expect, it } from 'vitest';
import { edusatMeshes } from '../src/render/edusat-model';
import {
  BATTERY_OPTIONS, CDS, ENVELOPE, FACES, FACE_AZIMUTH, FACE_NORMAL, MASS_LIMIT_KG, PANEL, PAYLOAD_OPTIONS, RAIL, RAIL_WALL,
  STACK_BAYS, STACK_SLOTS, toCds, type EduFace,
} from '../src/structure/edusat';
import { batteryWhOf, bayFit, centreOfGravity, itemsOf, massOf, partsOf, specChecks, type EduDesign } from '../src/structure/edusat-design';

const DESIGNS: EduDesign[] = BATTERY_OPTIONS.flatMap((battery) => PAYLOAD_OPTIONS.map((payload) => ({ battery, payload })));
const key = (d: EduDesign): string => `${d.battery}+${d.payload}`;

describe('the frame', () => {
  it('names each face for the specification\'s axis its normal points along (+Y is the picture\'s −z, Z the long axis)', () => {
    const along: Record<EduFace, [number, number, number]> = { 'face-px': [1, 0, 0], 'face-py': [0, 1, 0], 'face-nx': [-1, 0, 0], 'face-ny': [0, -1, 0] };
    for (const face of FACES) expect(toCds(FACE_NORMAL[face]), face).toEqual(along[face]);
    // the picture's up is the specification's +Z; the conversion keeps the handedness (X × Y = Z)
    expect(toCds([0, 1, 0])).toEqual([0, 0, 1]);
    const [x, y, z] = [toCds([1, 0, 0]), toCds([0, 0, -1]), toCds([0, 1, 0])];
    expect([x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]]).toEqual(z);
    // a face's azimuth turns +x onto its normal about the picture's up (three.js: a turn by a about +y takes x to (cos a, 0, −sin a))
    for (const face of FACES) {
      const a = FACE_AZIMUTH[face], n = FACE_NORMAL[face];
      expect(Math.cos(a)).toBeCloseTo(n[0], 12);
      expect(-Math.sin(a)).toBeCloseTo(n[2], 12);
    }
  });

  it('is the 3U of the specification: 100 × 100 × 340.5 mm, 6.00 kg, and its documents\' other bounds', () => {
    expect([ENVELOPE.x, ENVELOPE.z, ENVELOPE.y]).toEqual([0.1, 0.1, 0.3405]);
    expect(MASS_LIMIT_KG).toBe(6);
    expect(CDS).toMatchObject({ massKg: 6, cg: { x: 0.02, y: 0.02, z: 0.07 }, protrusion: 0.0065, railWidth: 0.0085, storedEnergyWh: 100 });
  });
});

describe('each of the four designs', () => {
  // by hand, from the parts' masses and the centres of their boxes: Σ m·z / Σ m, mm from the geometric centre along Z
  const BY_HAND: Record<string, { massKg: number; cgZ: number }> = {
    'battery-1cell+camera-day': { massKg: 1.81, cgZ: 6.82 },
    'battery-2cell+camera-day': { massKg: 1.87, cgZ: 7.33 },
    'battery-1cell+camera-night': { massKg: 2.01, cgZ: -0.85 },
    'battery-2cell+camera-night': { massKg: 2.07, cgZ: -0.16 },
  };

  it('has the mass and the centre of gravity worked by hand, on the long axis', () => {
    for (const d of DESIGNS) {
      const cg = centreOfGravity(partsOf(d)).cds, hand = BY_HAND[key(d)];
      expect(massOf(d), key(d)).toBeCloseTo(hand.massKg, 9);
      expect(cg[0] * 1000, key(d)).toBeCloseTo(0, 9);
      expect(cg[1] * 1000, key(d)).toBeCloseTo(0, 9);
      expect(cg[2] * 1000, key(d)).toBeCloseTo(hand.cgZ, 2);
    }
  });

  it('agrees with a sum made here, part by part', () => {
    for (const d of DESIGNS) {
      const parts = partsOf(d);
      const m = parts.reduce((s, p) => s + p.massKg, 0);
      const up = parts.reduce((s, p) => s + p.massKg * p.box.center[1], 0) / m;
      expect(centreOfGravity(parts).cds[2]).toBeCloseTo(up, 12);
      expect(centreOfGravity(parts).picture[1]).toBeCloseTo(up, 12);
    }
  });

  it('passes each of the eight checks, with the figures the table shows', () => {
    for (const d of DESIGNS) {
      const parts = partsOf(d), checks = specChecks(parts, massOf(d), batteryWhOf(d));
      expect(checks.map((c) => c.id)).toEqual(['envelope', 'mass', 'cgX', 'cgY', 'cgZ', 'protrusion', 'rails', 'energy']);
      expect(checks.every((c) => c.ok), key(d)).toBe(true);
      const of = (id: string) => checks.find((c) => c.id === id)!;
      expect([of('mass').limit, of('cgX').limit, of('cgY').limit, of('cgZ').limit, of('protrusion').limit, of('rails').limit, of('energy').limit]).toEqual([6, 20, 20, 70, 6.5, 8.5, 100]);
      expect(of('envelope').value).toBeLessThanOrEqual(1e-9);
      // what stands furthest out of a side panel is its sun sensor
      expect(of('protrusion').value).toBeCloseTo(PANEL.sensorThick * 1000, 9);
      expect(of('rails')).toMatchObject({ atLeast: true, value: RAIL * 1000 });
      expect(of('cgZ').value).toBeCloseTo(Math.abs(BY_HAND[key(d)].cgZ), 2);
    }
  });

  it('fails a check when its figure is over the bound (the checks can fail)', () => {
    const parts = partsOf(DESIGNS[0]);
    const verdict = (list: typeof parts, mass = 1.81, wh = 9.36) => Object.fromEntries(specChecks(list, mass, wh).map((c) => [c.id, c.ok]));
    expect(verdict(parts, 6.01)).toMatchObject({ mass: false, envelope: true });
    expect(verdict(parts, 1.81, 100.1)).toMatchObject({ energy: false });
    // a heavy part moved to one end takes the centre of gravity out along Z, and out of the envelope
    const moved = parts.map((p) => (p.unit === 'payload' ? { ...p, massKg: 5, box: { ...p.box, center: [0.03, -0.16, 0] as const } } : p));
    expect(verdict(moved)).toMatchObject({ cgX: false, cgZ: false, envelope: false });
  });

  it('fits each board and payload in the bay made for it, and the bays do not overlap', () => {
    for (const d of DESIGNS) for (const p of partsOf(d)) {
      const fit = bayFit(p);
      if (fit) expect(fit.fits, `${key(d)} ${p.unit}`).toBe(true);
    }
    const spans = STACK_BAYS.map((b) => [STACK_SLOTS[b].from, STACK_SLOTS[b].from + STACK_SLOTS[b].height]);
    for (let k = 1; k < spans.length; k++) expect(spans[k][0]).toBeGreaterThanOrEqual(spans[k - 1][1]);
    expect(spans[spans.length - 1][1]).toBeLessThanOrEqual(ENVELOPE.y);
  });
});

describe('what is drawn of it', () => {
  /** Each piece's box in the picture's frame, from the vertices marked with its number. */
  const boxes = (d: EduDesign) => {
    const items = itemsOf(d);
    const lo = items.map(() => [Infinity, Infinity, Infinity]), hi = items.map(() => [-Infinity, -Infinity, -Infinity]);
    for (const mesh of edusatMeshes(items)) {
      const pos = mesh.geometry.getAttribute('position'), item = mesh.geometry.getAttribute('item');
      for (let v = 0; v < pos.count; v++) {
        const i = item.getX(v), p = [pos.getX(v), pos.getY(v), pos.getZ(v)];
        for (let a = 0; a < 3; a++) { lo[i][a] = Math.min(lo[i][a], p[a]); hi[i][a] = Math.max(hi[i][a], p[a]); }
      }
    }
    return items.map((it, i) => ({ it, lo: lo[i], hi: hi[i] }));
  };

  it('draws every piece, and nothing further out of the envelope than the protrusion checked', () => {
    for (const d of DESIGNS) {
      const all = boxes(d);
      expect(all.every((b) => Number.isFinite(b.lo[0]))).toBe(true);
      const proud = specChecks(partsOf(d), massOf(d), batteryWhOf(d)).find((c) => c.id === 'protrusion')!.value / 1000;
      let most = -Infinity;
      for (const b of all) for (const a of [0, 2]) most = Math.max(most, Math.max(Math.abs(b.lo[a]), Math.abs(b.hi[a])) - ENVELOPE.x / 2);
      expect(most, key(d)).toBeCloseTo(proud, 6);
    }
  });

  it('draws the rods and the boards\' corners inside the rails\' angles, not in their metal', () => {
    // a rail's metal: within RAIL of its corner along both faces, and within RAIL_WALL of one of them
    const inRail = (x: number, z: number): boolean => {
      const ax = ENVELOPE.x / 2 - Math.abs(x), az = ENVELOPE.z / 2 - Math.abs(z);
      return ax < RAIL - 1e-9 && az < RAIL - 1e-9 && (ax < RAIL_WALL - 1e-9 || az < RAIL_WALL - 1e-9);
    };
    for (const d of DESIGNS) for (const b of boxes(d)) {
      if (b.it.piece.kind === 'rail' || b.it.unit === 'frame' || b.it.unit.startsWith('panel-')) continue;
      // the corners of its box, the furthest it reaches towards a rail
      for (const x of [b.lo[0], b.hi[0]]) for (const z of [b.lo[2], b.hi[2]]) expect(inRail(x, z), `${key(d)} ${b.it.id}`).toBe(false);
    }
    // and the rails themselves are angles of the width the check reads
    const rail = boxes(DESIGNS[0]).find((b) => b.it.piece.kind === 'rail')!;
    expect(rail.hi[0] - rail.lo[0]).toBeCloseTo(RAIL, 6);
    expect(rail.hi[2] - rail.lo[2]).toBeCloseTo(RAIL, 6);
  });
});
