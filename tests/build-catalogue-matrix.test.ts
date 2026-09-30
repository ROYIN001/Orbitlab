/**
 * Finite catalogue acceptance: every body/engine pair at its canonical count,
 * one stage under test (alone on the pad, or above the fixed Falcon 9 core),
 * and every strap-on body/engine pair on that core. This is not the Cartesian
 * product of arbitrary multistage vehicles, engine counts or flight missions.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { BOOSTER_BODIES, ENGINE_PARTS, FAIRING_PARTS, STAGE_BODIES, enginePart, lockedEngineCount, type EnginePart, type StageBodyPart } from '../src/data/parts';
import { PART_LIMITS, vehicleSpecProblems } from '../src/config/vehicle-spec';
import { assemble, AssembleRefused, type CustomBody, type PartsDesign } from '../src/design/assemble';
import { partsDraft, partsResult } from '../src/design/explore-model';
import { vehicleFigures } from '../src/design/budget';
import { computedRatings } from '../src/design/ratings';
import { explodedView } from '../src/design/exploded';
import { fitFrame, layoutLabels, pxBox } from '../src/design/stack-drawing';
import { idealDeltaV } from '../src/physics/vehicle';
import { G0 } from '../src/physics/constants';
import type { VehicleSpec } from '../src/types';

const PAYLOADS = [0, 1000, 100000];
const BOXES = [{ width: 343, height: 440 }, { width: 700, height: 600 }];
const rows: Record<string, unknown>[] = [];
// An audit can re-run a timed-out row with a longer budget without changing
// its vehicle, flight limit, search resolution or acceptance assertions.
const ratingOptions = { maxFlights: 16, timeBudgetMs: Number(import.meta.env.VITE_ORBITLAB_MATRIX_RATING_MS || 2000), resolution: 0.025 };
const bare = (stages: PartsDesign['stages']): PartsDesign => ({ id: 'matrix-design', name: 'Catalogue matrix', sites: ['cape'], stages, fairing: null });

function engineCount(body: StageBodyPart, engine: EnginePart): number {
  return body.engine.part === engine.id ? body.engine.count : lockedEngineCount(engine.id) ?? 1;
}

/** Physical compatibility, from the catalogue metadata (not engineOptions). */
function rejection(body: StageBodyPart, engine: EnginePart, groundLit: boolean): string | null {
  if (groundLit && engine.vacuumOnly) return 'vacuumEngineOnPad';
  const own = enginePart(body.engine.part);
  if (own.id === engine.id) return null;
  if (own.solid || engine.solid) return 'solidMotor';
  return own.family === engine.family ? null : 'familyMismatch';
}

function checkGeometry(spec: VehicleSpec): void {
  const apart = explodedView(spec, 1);
  for (const box of BOXES) {
    const frame = fitFrame(apart, box);
    expect(Number.isFinite(frame.scale) && frame.scale > 0).toBe(true);
    for (const separation of [0, 1]) {
      const drawing = explodedView(spec, separation);
      for (const part of drawing.parts) {
        const b = pxBox(frame, part);
        expect(Object.values(b).every(Number.isFinite), part.key).toBe(true);
        expect(b.left).toBeGreaterThanOrEqual(-1e-8);
        expect(b.top).toBeGreaterThanOrEqual(-1e-8);
        expect(b.right).toBeLessThanOrEqual(box.width + 1e-8);
        expect(b.bottom).toBeLessThanOrEqual(box.height + 1e-8);
      }
      const labels = layoutLabels(drawing, frame, () => 2).sort((a, b) => a.top - b.top);
      expect(labels.length).toBeGreaterThan(0);
      for (let i = 0; i < labels.length; i++) {
        expect(labels[i].top).toBeGreaterThanOrEqual(0);
        expect(labels[i].top + labels[i].height).toBeLessThanOrEqual(box.height);
        if (i) expect(labels[i].top).toBeGreaterThanOrEqual(labels[i - 1].top + labels[i - 1].height);
      }
    }
  }
}

function checkAccepted(spec: VehicleSpec, row: Record<string, unknown>, rate = true): void {
  expect(vehicleSpecProblems(spec)).toEqual([]);
  let previousDv = Infinity, previousTw = Infinity;
  const payloadFigures = PAYLOADS.map((payload) => {
    const f = vehicleFigures(spec, payload);
    for (const n of [f.totalDv, f.liftoffMass, f.liftoffTW, f.payloadFraction, ...f.phases.flatMap((p) => [p.dv, p.m0, p.mf, p.burnTime])]) {
      expect(Number.isFinite(n) && n >= 0).toBe(true);
    }
    expect(f.totalDv).toBeCloseTo(idealDeltaV(spec, payload), 7);
    expect(f.totalDv).toBeLessThanOrEqual(previousDv);
    expect(f.liftoffTW).toBeLessThanOrEqual(previousTw);
    if (spec.stages.length === 1 && !spec.stages[0].boosters?.length && !spec.fairing) {
      const s = spec.stages[0];
      const analytic = G0 * s.engine.ispVac * Math.log((s.dryMass + s.propellantMass + payload) / (s.dryMass + payload));
      // The model subtracts propellant from total mass; at the 1 g dry-mass
      // boundary this loses several relative digits compared with direct mf.
      expect(Math.abs(f.totalDv - analytic)).toBeLessThan(Math.max(1, analytic) * 1e-9);
    }
    previousDv = f.totalDv; previousTw = f.liftoffTW;
    return { payloadKg: payload, idealDv: f.totalDv, liftoffTW: f.liftoffTW, liftoffMass: f.liftoffMass };
  });
  checkGeometry(spec);
  row.payloadFigures = payloadFigures;
  if (rate) {
    const r = computedRatings(spec, ratingOptions);
    expect(r.estimate).toBe(true);
    expect(r.flights).toBeLessThanOrEqual(ratingOptions.maxFlights);
    for (const value of [r.payloadLEO, r.payloadGTO]) {
      expect([value.kg, value.ceilingKg, value.failsAtKg].every((x) => Number.isFinite(x) && x >= 0)).toBe(true);
      expect(value.kg).toBeLessThanOrEqual(value.failsAtKg);
      expect(value.failsAtKg).toBeLessThanOrEqual(value.ceilingKg);
      if (!value.converged) expect(['timeBudget', 'flightBudget']).toContain(value.stoppedBy);
    }
    row.ratings = r;
  }
}

describe('all catalogue stage body × engine pairs, at canonical counts', () => {
  for (const mount of ['pad', 'upper'] as const) for (const body of STAGE_BODIES) for (const engine of ENGINE_PARTS) {
    it(`${mount}: ${body.id} / ${engine.id}`, () => {
      const count = engineCount(body, engine);
      const expected = rejection(body, engine, mount === 'pad');
      const row: Record<string, unknown> = { group: 'stage', mount, body: body.id, engine: engine.id, count, expected };
      rows.push(row);
      const draft = partsDraft('matrix-design', 'Catalogue matrix');
      draft.edit.fairing = null;
      draft.edit.stages = [
        ...(mount === 'upper' ? [draft.edit.stages[0]] : []),
        { body: { kind: 'catalogue', id: body.id }, engine: { part: engine.id, count } },
      ];
      const result = partsResult(draft);
      row.outcome = result.ok ? 'accepted' : result.refusal.code;
      expect(row.outcome).toBe(expected ?? 'accepted');
      if (result.ok) checkAccepted(result.spec, row);
    }, 15000);
  }
});

describe('all catalogue strap-on body × engine pairs on a fixed core', () => {
  for (const body of BOOSTER_BODIES) for (const engine of ENGINE_PARTS) {
    it(`${body.id} / ${engine.id}`, () => {
      const count = engineCount(body, engine);
      const expected = rejection(body, engine, true);
      const row: Record<string, unknown> = { group: 'booster', body: body.id, engine: engine.id, count, expected };
      rows.push(row);
      let spec: VehicleSpec | null = null;
      try {
        spec = assemble(bare([{ body: 's1', boosters: [{ body: body.id, count: 2, engine: { part: engine.id, count } }] }])).spec;
        row.outcome = 'accepted';
      } catch (error) {
        expect(error).toBeInstanceOf(AssembleRefused);
        row.outcome = (error as AssembleRefused).code;
      }
      expect(row.outcome).toBe(expected ?? 'accepted');
      if (spec) checkAccepted(spec, row);
    }, 15000);
  }
});

describe('every fairing and finite builder edges', () => {
  for (const fairing of FAIRING_PARTS) it(`fairing ${fairing.id}`, () => {
    const spec = assemble({ ...bare([{ body: 's1' }]), fairing: { part: fairing.id } }).spec;
    const row = { group: 'fairing', part: fairing.id, outcome: 'accepted' };
    rows.push(row); checkAccepted(spec, row);
  }, 15000);

  const own: CustomBody = { dryMass: 2000, propellantMass: 30000, diameter: 2, length: 12, family: 'kerolox' };
  const limits = { dryMass: PART_LIMITS.stageDryMass, propellantMass: PART_LIMITS.stagePropellantMass, diameter: PART_LIMITS.diameter, length: PART_LIMITS.length };
  for (const field of Object.keys(limits) as (keyof typeof limits)[]) {
    for (const value of [0.001, limits[field], limits[field] + 1, 0, -1, NaN, Infinity]) it(`custom ${field}=${value}`, () => {
      const draft = partsDraft('matrix-design', 'Catalogue matrix');
      draft.edit.fairing = null;
      draft.edit.stages = [{ body: { kind: 'own', body: { ...own, [field]: value } }, engine: { part: 'merlin1d', count: 1 } }];
      const result = partsResult(draft), valid = Number.isFinite(value) && value > 0 && value <= limits[field];
      const row = { group: 'body-edge', field, value: String(value), outcome: result.ok ? 'accepted' : result.refusal.code };
      rows.push(row);
      expect(result.ok).toBe(valid);
      if (result.ok) checkAccepted(result.spec, row, false);
      else expect(result.refusal.code).toBe('fieldRange');
    });
  }
  for (const payload of [0, 0.001, 100000, 500000, -1, NaN, Infinity]) it(`payload ${payload}`, () => {
    const draft = partsDraft('matrix-design', 'Catalogue matrix');
    draft.payloadKg = payload;
    const result = partsResult(draft);
    rows.push({ group: 'payload-edge', value: String(payload), outcome: result.ok ? 'accepted' : result.refusal.code });
    expect(result.ok).toBe(Number.isFinite(payload) && payload >= 0);
    if (!result.ok) expect(result.refusal.code).toBe('badPayload');
    else {
      const f = vehicleFigures(result.spec, payload);
      expect([f.totalDv, f.liftoffMass, f.liftoffTW, f.payloadFraction].every(Number.isFinite)).toBe(true);
    }
  });
  for (const engine of ENGINE_PARTS) for (const count of [0, 0.5, 51, NaN]) it(`invalid engine count ${engine.id} × ${count}`, () => {
    expect(() => assemble(bare([{ body: { ...own, family: engine.family }, engine: { part: engine.id, count } }]))).toThrow(AssembleRefused);
    rows.push({ group: 'count-edge', engine: engine.id, count: String(count), outcome: 'rejected' });
  });
});

afterAll(() => {
  const counts: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    const group = String(row.group) + (row.mount ? `-${row.mount}` : '');
    const groupCounts = counts[group] ??= {};
    groupCounts[String(row.outcome)] = (groupCounts[String(row.outcome)] ?? 0) + 1;
  }
  const report = { generatedAt: new Date().toISOString(), catalogue: { stageBodies: STAGE_BODIES.length, boosterBodies: BOOSTER_BODIES.length, engines: ENGINE_PARTS.length, fairings: FAIRING_PARTS.length }, payloads: PAYLOADS, boxes: BOXES, ratingOptions, counts, rows };
  console.log(`Catalogue matrix summary: ${JSON.stringify({ catalogue: report.catalogue, counts })}`);
  if (import.meta.env.VITE_ORBITLAB_MATRIX_REPORT === '1') console.log(`CATALOGUE_MATRIX_JSON=${JSON.stringify(report)}`);
});
