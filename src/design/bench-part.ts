/**
 * R3.2: what a piece of hardware picked on the Engineer bench's drawing is,
 * read from the same `VehicleSpec` the facilities test and the Launch section
 * flies — never from the catalogue entry the design started from — and which
 * facility examines it.
 *
 * The drawing's refs are src/design/exploded.ts's: 'stage:<i>',
 * 'booster:<i>:<g>', 'fairing', 'interstage:<i>'. The test stand's engines use
 * the same 'stage:<i>' / 'booster:<i>:<g>' keys (src/design/test-stand.ts), so
 * a stage or a strap-on group goes straight onto the stand.
 *
 * DOM-free and dictionary-free: the UI words it.
 */
import type { VehicleSpec } from '../types';

export type BenchFacility = 'stand' | 'tunnel';

export interface BenchPartFacts {
  ref: string;
  kind: 'stage' | 'booster' | 'fairing' | 'interstage';
  stageIndex: number;
  /** strap-on group, −1 otherwise */
  group: number;
  /** how many units the ref stands for (a strap-on group's count, else 1) */
  units: number;
  /** m, of one unit; null when the spec gives none (an interstage is derived for display) */
  lengthM: number | null;
  diameterM: number | null;
  /** kg, of one unit */
  dryKg: number | null;
  propellantKg: number | null;
  engine: { name: string; count: number } | null;
  /** the facility that examines it: an engine goes on the stand, an aeroshell into the tunnel */
  facility: BenchFacility;
}

/** The facts of `ref` on `spec`, or null when the ref names nothing on it (a stale pick after the bench changed). */
export function benchPart(spec: VehicleSpec, ref: string): BenchPartFacts | null {
  const parts = ref.split(':');
  const n = (i: number): number => (parts[i] !== undefined && /^\d+$/.test(parts[i]) ? Number(parts[i]) : -1);
  if (parts[0] === 'stage' && parts.length === 2) {
    const i = n(1), st = spec.stages[i];
    if (!st) return null;
    return { ref, kind: 'stage', stageIndex: i, group: -1, units: 1, lengthM: st.length, diameterM: st.diameter, dryKg: st.dryMass,
      propellantKg: st.propellantMass, engine: { name: st.engine.name, count: st.engine.count }, facility: 'stand' };
  }
  if (parts[0] === 'booster' && parts.length === 3) {
    const i = n(1), g = n(2), b = spec.stages[i]?.boosters?.[g];
    if (!b) return null;
    return { ref, kind: 'booster', stageIndex: i, group: g, units: b.count, lengthM: b.length, diameterM: b.diameter, dryKg: b.dryMass,
      propellantKg: b.propellantMass, engine: { name: b.engine.name, count: b.engine.count }, facility: 'stand' };
  }
  if (parts[0] === 'fairing' && parts.length === 1) {
    const f = spec.fairing;
    if (!f) return null;
    return { ref, kind: 'fairing', stageIndex: spec.stages.length - 1, group: -1, units: 1, lengthM: f.length, diameterM: f.diameter,
      dryKg: f.mass, propellantKg: null, engine: null, facility: 'tunnel' };
  }
  if (parts[0] === 'interstage' && parts.length === 2) {
    const i = n(1);
    if (!spec.stages[i]) return null;
    return { ref, kind: 'interstage', stageIndex: i, group: -1, units: 1, lengthM: null, diameterM: null, dryKg: null,
      propellantKg: null, engine: null, facility: 'tunnel' };
  }
  return null;
}
