import { describe, expect, it } from 'vitest';
import { canonicalJson, designRefFor, designRefState, parseDesignRef, refFlies } from '../src/design/design-ref';
import { handoffFromState, parseHandoff } from '../src/orbit/handoff';

const design = { name: 'Bird', bus: { size: { width: 1, height: 2 } }, kind: 'science' };
const record = { id: 'd1', updated: '2026-10-04T12:30:00.000Z', design: { kind: 'science', bus: { size: { height: 2, width: 1 } }, name: 'Bird' } };

describe('R3.1 design reference', () => {
  it('a design flown as saved is that revision; changed since, it says so; never saved, it has none', () => {
    const saved = designRefFor('satellite', { name: ' Bird ', recordId: 'd1', design }, 'sat-1', record);
    expect(saved).toEqual({ kind: 'satellite', name: 'Bird', recordId: 'd1', revision: '2026-10-04T12:30:00.000Z', edited: false, specId: 'sat-1' });
    expect(designRefState(saved)).toBe('saved');
    const edited = designRefFor('satellite', { name: 'Bird', recordId: 'd1', design: { ...design, kind: 'comsat' } }, 'sat-1', record);
    expect(designRefState(edited)).toBe('edited');
    const unsaved = designRefFor('vehicle', { name: 'Rocket', recordId: null, design }, 'v-1', null);
    expect(designRefState(unsaved)).toBe('unsaved');
    // a record the design no longer points at, or one deleted, is not its revision
    expect(designRefState(designRefFor('satellite', { name: 'Bird', recordId: 'd1', design }, 'sat-1', null))).toBe('unsaved');
    expect(designRefState(designRefFor('satellite', { name: 'Bird', recordId: 'd2', design }, 'sat-1', record))).toBe('unsaved');
  });

  it('compares designs by their content, not the order their fields were written in', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 2, c: 3 }] })).toBe(canonicalJson({ a: [{ c: 3, d: 2 }], b: 1 }));
    expect(canonicalJson({ a: 1, b: undefined })).toBe(canonicalJson({ a: 1 }));
  });

  it('holds while the mission flies that design, by its spec id', () => {
    const v = designRefFor('vehicle', { name: 'R', recordId: null, design }, 'v-1', null);
    expect(refFlies(v, { vehicleSpec: { id: 'v-1' } })).toBe(true);
    expect(refFlies(v, { vehicleSpec: { id: 'v-2' } })).toBe(false);
    expect(refFlies(v, {})).toBe(false);
    const s = designRefFor('satellite', { name: 'S', recordId: null, design }, 's-1', null);
    expect(refFlies(s, { vehicleSpec: { id: 's-1' } })).toBe(false);
    expect(refFlies(s, { satelliteSpec: { id: 's-1' } })).toBe(true);
  });

  it('reads back what it wrote and refuses what it cannot vouch for', () => {
    const saved = designRefFor('satellite', { name: 'Bird', recordId: 'd1', design }, 'sat-1', record);
    expect(parseDesignRef(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
    expect(parseDesignRef(undefined)).toBeUndefined();
    for (const bad of [null, 'x', [], { ...saved, kind: 'rocket' }, { ...saved, name: '' }, { ...saved, revision: 'yesterday' },
      { ...saved, recordId: null }, { ...saved, edited: 'no' }, { ...saved, recordId: null, revision: null, edited: true }, { ...saved, specId: 3 }]) {
      expect(parseDesignRef(bad)).toBe('invalid');
    }
  });
});

describe('R3.1 the hand-off carries the design and its revision', () => {
  const base = () => JSON.parse(JSON.stringify(handoffFromState({ r: { x: 7e6, y: 0, z: 0 }, v: { x: 0, y: 7546, z: 0 }, jd: 2461318.5,
    spacecraft: { mass: 1000, area: 4, cd: 2.2, cr: 1.3, kind: 'earthObs', propulsion: null }, label: 'test' })));
  const ref = designRefFor('satellite', { name: 'Bird', recordId: 'd1', design }, 'sat-1', record);

  it('reads a hand-off without one as before, and one with one with it', () => {
    expect(parseHandoff(base())).not.toBeNull();
    const h = base();
    h.origin.design = ref;
    expect(parseHandoff(h)?.origin.design).toEqual(ref);
  });

  it('refuses a hand-off whose design it cannot vouch for', () => {
    const h = base();
    h.origin.design = { ...ref, revision: 'last week' };
    expect(parseHandoff(h)).toBeNull();
  });
});
