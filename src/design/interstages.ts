/**
 * Roadmap D01: interstages, as derived and massless display parts.
 *
 * The parts catalogue (src/data/parts.ts) has no interstage parts, because the
 * data has none. The adapter between two body diameters is geometry the stack
 * layout draws (`interstageHeight` in src/physics/frame.ts), and neither
 * flight model gives it mass: the point-mass model never sees it, and the
 * six-DOF model says "no extra inertia-free adapter mass"
 * (src/physics/rigid/vehicle-data.ts). A catalogue vehicle whose interstage
 * gained mass or length would fly differently in six-DOF, because the stack
 * layout feeds the geometry, the aero tables and the abort model.
 *
 * So an interstage is read off a spec, for a parts list or a drawing, and
 * weighs nothing. A builder that wants an adapter with mass would fold it into
 * the dry mass of the stage below, with no change to the spec; that is D03's
 * to decide.
 */
import type { VehicleSpec } from '../types';
import { interstageHeight, stackLayout } from '../physics/frame';

export interface InterstagePart {
  /** the stage it stands on: index in `spec.stages`, and id */
  stageIndex: number;
  stageId: string;
  /** what stands on it: the next launcher stage's id, or 'fairing' */
  carries: string;
  /** m */
  lowerDiameter: number;
  upperDiameter: number;
  /** m, as the stack is drawn: `interstageHeight(lower, upper)` */
  height: number;
  /** always 0: drawn geometry, no mass in either flight model */
  mass: 0;
}

/**
 * The adapters a vehicle's stack is drawn with, bottom up: one for each
 * launcher stage whose top diameter differs from what stands on it by more
 * than the 50 mm a flush band covers. A fairing with its own adapter cone
 * (`FairingSpec.adapter`) stands flush and needs none.
 */
export function interstageParts(spec: VehicleSpec): InterstagePart[] {
  const layout = stackLayout(spec);
  const out: InterstagePart[] = [];
  spec.stages.forEach((stage, stageIndex) => {
    const upperDiameter = layout.topDiameter[stageIndex];
    if (stage.isSpacecraft || upperDiameter === null) return;
    const height = interstageHeight(stage.diameter, upperDiameter);
    if (height <= 0) return;
    const next = spec.stages.slice(stageIndex + 1).find((s) => !s.isSpacecraft);
    out.push({ stageIndex, stageId: stage.id, carries: next ? next.id : 'fairing', lowerDiameter: stage.diameter, upperDiameter, height, mass: 0 });
  });
  return out;
}
