/**
 * Stage names in a design of one's own (roadmap D02, D03), in the reader's
 * language: a catalogue part kept as it is borrows its catalogue translation;
 * a part renamed, or named after other engines, keeps its own name.
 * src/ui/names.ts `stageName` is DOM-free.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLang } from '../src/i18n';
import { vehicleById } from '../src/data/vehicles';
import { stageName } from '../src/ui/names';
import { assemble } from '../src/design/assemble';
import { partsDesign, partsDraft } from '../src/design/explore-model';
import type { VehicleSpec } from '../src/types';

const copy = (id: string, extra: Partial<VehicleSpec> = {}): VehicleSpec => ({ ...structuredClone(vehicleById(id)), id: `${id}-copy`, derivedFrom: id, ...extra });

describe('stage names in a design of one\'s own', () => {
  beforeEach(() => { vi.stubGlobal('document', { documentElement: {} }); setLang('ru'); });
  afterEach(() => { setLang('en'); vi.unstubAllGlobals(); });

  it('the parts builder\'s first design reads its catalogue bodies\' names in Russian', () => {
    const f9 = vehicleById('falcon9');
    const spec = assemble(partsDesign(partsDraft('my-rocket', 'Моя ракета'))).spec;
    expect(spec.derivedFrom).toBeUndefined();
    // the draft stacks Falcon 9's two stages as they are
    expect(spec.stages.map((s) => [s.id, s.name])).toEqual(f9.stages.map((s) => [s.id, s.name]));
    for (const st of spec.stages) {
      const own = stageName(f9, st.id, st.name);
      expect(own).not.toBe(st.name);
      expect(stageName(spec, st.id, st.name)).toBe(own);
    }
  });

  it('a part a remix\'s origin does not list borrows the translation of the vehicle it is from', () => {
    const f9 = vehicleById('falcon9');
    const atlas = vehicleById('atlasv551');
    const remix = copy('atlasv551');
    expect(stageName(remix, f9.stages[0].id, f9.stages[0].name)).toBe(stageName(f9, f9.stages[0].id, f9.stages[0].name));
    expect(stageName(remix, atlas.stages[0].id, atlas.stages[0].name)).toBe(stageName(atlas, atlas.stages[0].id, atlas.stages[0].name));
    expect(stageName(remix, atlas.stages[0].id, atlas.stages[0].name)).not.toBe(atlas.stages[0].name);
  });

  it('a part renamed, or named after other engines, keeps its own name', () => {
    const f9 = vehicleById('falcon9');
    const scratch = copy('falcon9', { id: 'scratch', derivedFrom: undefined });
    expect(stageName(scratch, 's1', '7× Merlin 1D')).toBe('7× Merlin 1D');
    expect(stageName(scratch, 'stage1', f9.stages[0].name)).toBe(f9.stages[0].name);
    const renamed = copy('falcon9');
    expect(stageName(renamed, 's2', 'Kick stage')).toBe('Kick stage');
  });
});
