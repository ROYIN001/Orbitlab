import { describe, expect, it } from 'vitest';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { explodedView } from '../src/design/exploded';
import { benchPart } from '../src/design/bench-part';
import { vehicleStandEngines } from '../src/design/test-stand';

describe('R3.2 bench drawing parts', () => {
  it('every drawn part of every catalogue vehicle resolves to the spec the facilities use', () => {
    for (const spec of VEHICLES) {
      const refs = new Set(explodedView(spec, 0).parts.map((p) => p.ref));
      for (const ref of refs) {
        const f = benchPart(spec, ref);
        expect(f, `${spec.id} ${ref}`).not.toBeNull();
        if (f!.kind === 'stage') {
          const st = spec.stages[f!.stageIndex];
          expect([f!.lengthM, f!.diameterM, f!.propellantKg, f!.engine?.count]).toEqual([st.length, st.diameter, st.propellantMass, st.engine.count]);
        }
        if (f!.kind === 'booster') {
          const b = spec.stages[f!.stageIndex].boosters![f!.group];
          expect([f!.units, f!.lengthM, f!.diameterM, f!.propellantKg]).toEqual([b.count, b.length, b.diameter, b.propellantMass]);
        }
        if (f!.kind === 'fairing') expect([f!.lengthM, f!.diameterM, f!.dryKg]).toEqual([spec.fairing!.length, spec.fairing!.diameter, spec.fairing!.mass]);
      }
    }
  });

  it('every engine-carrying part has a matching test-stand engine key', () => {
    for (const spec of VEHICLES) {
      const stand = new Set(vehicleStandEngines(spec).map((e) => e.key));
      for (const p of explodedView(spec, 0).parts) {
        const f = benchPart(spec, p.ref);
        if (f?.facility === 'stand') expect(stand.has(p.ref), `${spec.id} ${p.ref}`).toBe(true);
      }
    }
  });

  it('reads an edited design, not its catalogue origin', () => {
    const base = vehicleById('falcon9');
    const edited = { ...base, stages: base.stages.map((s, i) => (i === 1 ? { ...s, length: s.length + 3.5, propellantMass: s.propellantMass * 0.8 } : s)) };
    const f = benchPart(edited, 'stage:1')!;
    expect(f.lengthM).toBe(base.stages[1].length + 3.5);
    expect(f.propellantKg).toBeCloseTo(base.stages[1].propellantMass * 0.8);
  });

  it('a stale or malformed pick resolves to nothing', () => {
    const spec = vehicleById('falcon9');
    for (const ref of ['stage:9', 'booster:0:4', 'stage:x', 'stage', 'nose', 'stage:1:2', 'fairing:1']) expect(benchPart(spec, ref)).toBeNull();
  });
});
