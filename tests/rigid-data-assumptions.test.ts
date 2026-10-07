/**
 * M-PHYSICS-041 / M-PLATFORM-070 (R4.1): the assumptions the six-DOF vehicle
 * data states (`RIGID_DATA_ASSUMPTIONS`, carried on every snapshot) must be
 * true of the model that ships. Roadmap P05 (2026-09-23) added propellant
 * slosh (src/physics/rigid/slosh.ts) and the first bending mode
 * (src/physics/rigid/bending.ts), coupled to the rigid body as a runtime option
 * (src/physics/rigid/flex.ts); the list still said "internal flow, slosh and
 * structural flexibility omitted".
 */
import { describe, expect, it } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { buildDetachedStage } from '../src/physics/rigid/mass';
import { sloshTanks } from '../src/physics/rigid/slosh';
import { buildBeam, firstBendingMode } from '../src/physics/rigid/bending';
import { resolveFlexOptions } from '../src/physics/rigid/flex';
import { RIGID_DATA_ASSUMPTIONS } from '../src/physics/rigid/vehicle-data';

/** The six-DOF modules that exist (Vite lists them; nothing is loaded). */
const RIGID_MODULES = Object.keys(import.meta.glob('../src/physics/rigid/*.ts'));
const OMITTED = /\b(omit|omitted|neglect|neglected|ignored|not modell?ed)\b/i;
const FLEXIBLE = /slosh|flexib|bending/i;
/** A statement's clauses: split at ';' and at a full stop that ends a sentence (not the one in a file name). */
const clauses = (text: string): string[] => text.split(/;|\.(?=\s|$)/).map((c) => c.trim()).filter(Boolean);

describe('six-DOF data assumptions (M-PHYSICS-041)', () => {
  const f9 = vehicleById('falcon9').stages[0];
  const snapshot = buildDetachedStage('falcon9', f9, f9.propellantMass / 2, { coreThrottle: 1 });

  it('describe a model that has slosh and a bending mode, as an option (P05)', () => {
    expect(snapshot.assumptions).toBe(RIGID_DATA_ASSUMPTIONS);
    expect(sloshTanks(snapshot.components, 'falcon9').length).toBeGreaterThan(0);
    expect(firstBendingMode(buildBeam(snapshot.components)).frequencyRadS).toBeGreaterThan(0);
    // Absent, the rigid body; asked for, the flexible one.
    expect(resolveFlexOptions(undefined)).toBeUndefined();
    expect(resolveFlexOptions({ slosh: true, bending: true })).toMatchObject({ slosh: true, bending: true });
  });

  it('do not call slosh or structural flexibility omitted', () => {
    const wrong = RIGID_DATA_ASSUMPTIONS.flatMap(clauses).filter((c) => OMITTED.test(c) && FLEXIBLE.test(c));
    expect(wrong).toEqual([]);
  });

  it('say that slosh and bending are off by default, and cite the code that models them', () => {
    const statement = RIGID_DATA_ASSUMPTIONS.find((a) => /slosh/i.test(a) && /bending/i.test(a));
    expect(statement, 'no statement names slosh and bending').toBeDefined();
    expect(statement).toMatch(/off by default/i);
    const cited = statement!.match(/rigid\/[\w-]+\.ts/)?.[0];
    expect(cited, 'no rigid/<file>.ts cited').toBeDefined();
    expect(RIGID_MODULES).toContain(`../src/physics/${cited}`);
  });

  it('still name what the model leaves out', () => {
    expect(RIGID_DATA_ASSUMPTIONS.flatMap(clauses).filter((c) => OMITTED.test(c))).not.toEqual([]);
  });
});
