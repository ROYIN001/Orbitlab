/**
 * Per-vehicle aerodynamic tables for the six-DOF model (roadmap P03).
 *
 * The first six-DOF aerodynamics were one number per effect for every body: a
 * normal-force slope of 2 per radian at a centre of pressure fixed at 35 % of
 * the length from the nose, and the launcher's drag curve along the airflow.
 * That is the small-angle answer for a slender body and nothing else, and it
 * went wrong in the two places the model is asked most:
 *
 * - **The centre of pressure does not sit still.** A slender body's lift at
 *   small angles is made where its cross-section grows — the nose, a flare, a
 *   booster's cone — so it acts far forward. As the angle grows the flow
 *   separates along the sides, a crossflow drag on the whole planform that
 *   grows with sin²α and acts near the middle, and the centre of pressure moves
 *   aft. The crossflow drag itself changes with the Mach number of the flow
 *   across the body, and above Mach 1 the cylinder behind the nose carries lift
 *   of its own, which moves the small-angle centre of pressure aft as well.
 * - **A tumbling body is not a slender one.** A spent stage broadside to the
 *   flow presents its whole side: for a 12:1 cylinder that is about eighteen
 *   times its end area, and the old model charged it for twice.
 *
 * The tables here follow the classical low-order method for bodies of
 * revolution (slender-body theory plus viscous crossflow, as in Allen &
 * Perkins, NACA TR 1048, and Jorgensen, NASA TR R-474), built from each
 * vehicle's own layout: its fairing, its stage diameters and the transitions
 * between them, its strap-ons and their noses, its planform. They are
 * estimates of the same order as the rest of the six-DOF data
 * (docs/SIXDOF-VEHICLE-DATA.md), not wind-tunnel results.
 */
import type { VehicleSpec } from '../../types';
import { dragCoefficient, tumblingDragCoefficient } from '../aero';
import { stackLayout } from '../frame';

/** Mach breakpoints every table is tabulated on. */
export const AERO_MACH: readonly number[] = [0, 0.6, 0.8, 0.95, 1.05, 1.2, 1.5, 2, 3, 4, 6, 10, 25];

export interface AeroTable {
  mach: readonly number[];
  /** Axial-force coefficient flying nose first, per Mach, on the reference area. */
  axial: readonly number[];
  /** Axial-force coefficient flying base first, per Mach. */
  baseAxial: readonly number[];
  /** Small-angle normal-force slope flying nose first, per rad, per Mach. */
  normalSlope: readonly number[];
  /** Body x of that force, m (structural datum, +X noseward), per Mach. */
  cpX: readonly number[];
  /** Small-angle normal-force slope flying base first, per rad. */
  baseNormalSlope: number;
  baseCpX: number;
  /** Side area, m², for the viscous crossflow, and its centroid's body x. */
  planformArea: number;
  planformX: number;
  /** Finite-length crossflow factor (Allen & Perkins' η). */
  crossflowEta: number;
}

/** Lift of a slender element: the cross-section area it adds, m², and where its force acts. */
export interface LiftTerm { area: number; x: number }

/**
 * Crossflow drag coefficient of a circular cylinder against the Mach number
 * of the flow across it (Jorgensen, NASA TR R-474, fig. 2, rounded): the
 * subsonic 1.2, the transonic drag rise to about 1.75, and the slow supersonic
 * decline.
 */
const CROSSFLOW: readonly (readonly [number, number])[] = [
  [0, 1.2], [0.4, 1.2], [0.6, 1.25], [0.8, 1.45], [1.0, 1.75], [1.2, 1.65], [1.6, 1.45], [2, 1.38], [3, 1.32], [5, 1.28], [10, 1.25],
];

function lerpTable(table: readonly (readonly [number, number])[], x: number): number {
  if (!(x > table[0][0])) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (x <= table[i][0]) {
      const [x0, y0] = table[i - 1], [x1, y1] = table[i];
      return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
  }
  return table[table.length - 1][1];
}

export function crossflowDragCoefficient(crossflowMach: number): number {
  return lerpTable(CROSSFLOW, Math.abs(crossflowMach));
}

/** Allen & Perkins' ratio of a finite cylinder's crossflow drag to the infinite one's. */
export function crossflowEta(lengthOverDiameter: number): number {
  return lerpTable([[1, 0.55], [5, 0.62], [10, 0.68], [20, 0.74], [40, 0.82], [100, 0.9]], lengthOverDiameter);
}

/**
 * Supersonic lift carried over onto the cylinder behind a nose, per rad on the
 * nose's own base area. Zero subsonic (slender-body theory already puts all the
 * lift on the nose), rising through the transonic range and easing off at high
 * Mach. An estimate: it is what moves a launcher's small-angle centre of
 * pressure aft by a few diameters once it is supersonic.
 */
export function afterbodyLiftSlope(mach: number): number {
  return lerpTable([[0, 0], [0.8, 0], [1.2, 0.35], [1.5, 0.5], [3, 0.45], [6, 0.35], [25, 0.3]], mach);
}

/** Where the carried-over lift acts: this many diameters behind the nose's base. */
const AFTERBODY_LIFT_DIAMETERS = 3;

/** An ogive nose's lift acts this fraction of its length behind its tip; a cone's, 2/3. */
const OGIVE_CP = 0.55;
const CONE_CP = 2 / 3;

/** Grid fins: normal-force slope per rad of one fin, per square metre of fin. */
export const GRID_FIN_SLOPE_PER_M2 = 3;

interface TableInput {
  referenceArea: number;
  terms: LiftTerm[];
  /** the body's widest nose-first lift element, for the afterbody carry-over */
  nose: { area: number; baseX: number; diameter: number } | null;
  baseTerms: LiftTerm[];
  planformArea: number;
  planformX: number;
  length: number;
  diameter: number;
  axial: (mach: number) => number;
  baseAxial: (mach: number) => number;
}

function buildTable(input: TableInput): AeroTable {
  const S = input.referenceArea;
  const sum = (terms: LiftTerm[]) => terms.reduce((n, t) => n + t.area, 0);
  const moment = (terms: LiftTerm[]) => terms.reduce((n, t) => n + t.area * t.x, 0);
  const normalSlope: number[] = [], cpX: number[] = [];
  for (const m of AERO_MACH) {
    const terms = [...input.terms];
    if (input.nose) {
      terms.push({ area: input.nose.area * afterbodyLiftSlope(m) / 2,
        x: input.nose.baseX - AFTERBODY_LIFT_DIAMETERS * input.nose.diameter });
    }
    const area = sum(terms);
    // Slender-body theory: C_N = 2α × (area gained) / S_ref.
    normalSlope.push(2 * area / S);
    cpX.push(area !== 0 ? moment(terms) / area : input.planformX);
  }
  const baseArea = sum(input.baseTerms);
  return {
    mach: AERO_MACH,
    axial: AERO_MACH.map(input.axial),
    baseAxial: AERO_MACH.map(input.baseAxial),
    normalSlope, cpX,
    baseNormalSlope: 2 * baseArea / S,
    baseCpX: baseArea !== 0 ? moment(input.baseTerms) / baseArea : input.planformX,
    planformArea: input.planformArea, planformX: input.planformX,
    crossflowEta: crossflowEta(input.length / Math.max(input.diameter, 0.1)),
  };
}

const circle = (d: number) => Math.PI * d * d / 4;

/** Which parts of the stack are still attached. */
export interface AttachedStack {
  activeIndex: number;
  /** per stage, whether it is still part of the stack */
  stageAttached: readonly boolean[];
  fairingAttached: boolean;
  /** per booster group of the active stage */
  boosterGroups: readonly boolean[];
}

/**
 * The launcher as it is flying: the stages from the active one up, the fairing
 * or the exposed payload top, and the strap-ons still attached, in the layout
 * the renderer and the mass model share. `stageBaseX` is the active stage's base
 * in body coordinates (the structural datum).
 */
export function ascentAeroTable(spec: VehicleSpec, attached: AttachedStack, referenceArea: number, stageBaseX: (index: number) => number): AeroTable {
  const layout = stackLayout(spec);
  const stages = spec.stages.map((st, i) => ({ st, i }))
    .filter(({ st, i }) => i >= attached.activeIndex && attached.stageAttached[i] && !st.isSpacecraft);
  const terms: LiftTerm[] = [];
  let planformArea = 0, planformMoment = 0;
  const addPlanform = (area: number, x: number) => { planformArea += area; planformMoment += area * x; };
  // Walk from the bottom up: the core's segments and the transitions between
  // them. Going down from the nose, a section that widens makes lift and one
  // that narrows (a boat-tail under a wide fairing) makes negative lift, at the
  // transition.
  let lower: number | null = null;
  let top = stages.length > 0 ? stageBaseX(stages[0].i) : 0;
  let widest = 0;
  for (const { st, i } of stages) {
    const base = stageBaseX(i);
    const height = layout.height[i];
    if (lower !== null && Math.abs(st.diameter - lower) > 0.05) terms.push({ area: circle(lower) - circle(st.diameter), x: base });
    addPlanform(st.diameter * height, base + height / 2);
    lower = st.diameter;
    top = base + height;
    widest = Math.max(widest, st.diameter);
  }
  let nose: TableInput['nose'] = null;
  const f = spec.fairing;
  if (f && attached.fairingAttached) {
    if (lower !== null && Math.abs(f.diameter - lower) > 0.05) terms.push({ area: circle(lower) - circle(f.diameter), x: top });
    terms.push({ area: circle(f.diameter), x: top + f.length * (1 - OGIVE_CP) });
    addPlanform(f.diameter * f.length * 0.8, top + f.length * 0.4);
    nose = { area: circle(f.diameter), baseX: top, diameter: f.diameter };
    top += f.length;
    widest = Math.max(widest, f.diameter);
  } else if (lower !== null) {
    // A blunt top — the upper stage or the payload after the fairing has gone.
    terms.push({ area: circle(lower), x: top - 0.1 * lower });
    nose = { area: circle(lower), baseX: top, diameter: lower };
  }
  // Strap-ons still attached to the active stage.
  const active = spec.stages[attached.activeIndex];
  (active?.boosters ?? []).forEach((group, g) => {
    if (!attached.boosterGroups[g]) return;
    const base = stageBaseX(attached.activeIndex) + (group.baseOffset ?? 0);
    const noseLength = group.conicalTop ? 0.35 * group.length : Math.min(0.2 * group.length, 1.5 * group.diameter);
    const tip = base + group.length;
    for (let k = 0; k < group.count; k++) terms.push({ area: circle(group.diameter), x: tip - CONE_CP * noseLength });
    // Seen from the side, strap-ons around a core partly hide behind it and
    // each other: about 60 % of each one's side area meets the crossflow.
    addPlanform(0.6 * group.count * group.diameter * (group.length - noseLength / 2), base + (group.length - noseLength / 2) / 2);
  });
  const bottom = stages.length > 0 ? stageBaseX(stages[0].i) : 0;
  const length = Math.max(top - bottom, 0.1);
  return buildTable({
    referenceArea, terms, nose, planformArea: Math.max(planformArea, 1e-6),
    planformX: planformArea > 0 ? planformMoment / planformArea : bottom + length / 2,
    // Flying base first the lift is made at the bottom, where the flow meets the body.
    baseTerms: [{ area: circle(stages[0]?.st.diameter ?? widest), x: bottom }],
    length, diameter: widest || 1,
    axial: dragCoefficient,
    // A launcher flying tail first presents its engines and base: a blunt body.
    baseAxial: (m) => tumblingDragCoefficient(1.0, m),
  });
}

/**
 * A body separated from the stack — a spent stage, a strap-on, a fairing half,
 * or a returning first stage. Blunt at both ends, so its small-angle lift is
 * made at whichever end meets the flow; its crossflow drag, broadside, is what
 * a tumbling body mostly feels. `cd` is its blunt-body axial coefficient
 * (the same figure the point-mass debris model uses), and a stage flown back
 * for recovery with grid fins deployed carries their lift at its top.
 */
export function detachedAeroTable(length: number, diameter: number, cd: number, referenceArea: number,
  options: { gridFins?: boolean; halfShell?: boolean } = {}): AeroTable {
  const L = Math.max(length, 0.1), d = Math.max(diameter, 0.1);
  const end = circle(d);
  const terms: LiftTerm[] = [{ area: end, x: L - 0.1 * d }];
  const baseTerms: LiftTerm[] = [{ area: end, x: 0.1 * d }];
  if (options.gridFins) {
    // Four lattice fins of about a third by two-fifths of the diameter each;
    // the pair in the plane of the crossflow carries the load. Deployed at the
    // interstage, which is the top of the stage — aft, flying engines first.
    const finArea = 0.33 * d * 0.4 * d;
    const slope = 2 * GRID_FIN_SLOPE_PER_M2 * finArea;
    baseTerms.push({ area: slope / 2, x: L - 0.5 });
  }
  // A fairing half is a shell, open on one side: half the planform.
  const planformArea = (options.halfShell ? 0.5 : 1) * L * d;
  return buildTable({
    referenceArea, terms, nose: null, baseTerms, planformArea, planformX: L / 2, length: L, diameter: d,
    axial: (m) => tumblingDragCoefficient(cd, m), baseAxial: (m) => tumblingDragCoefficient(cd, m),
  });
}

/**
 * Starship's ship falling belly first after a suborbital flight: a 9 m tube
 * under an ogive nose of about 1.3 diameters. Broadside the crossflow acts on
 * the planform — the tube, and two thirds of the nose's side — so its centre
 * sits a little behind the middle of the ship, and at the 70–90° the ship
 * flies at, nose-first slender-body lift is a small correction made on the
 * ogive. The flaps are not in the table: they are control surfaces
 * (`shipFlapSurfaces`), whose trim drag is added where they are. An estimate
 * built the same way as every other table here, not a SpaceX figure.
 */
export function shipDescentAeroTable(length: number, diameter: number, referenceArea: number): AeroTable {
  const L = Math.max(length, 0.1), d = Math.max(diameter, 0.1);
  const nose = Math.min(1.3 * d, 0.4 * L), tube = L - nose;
  const noseSide = (2 / 3) * d * nose;
  const planformArea = tube * d + noseSide;
  const planformX = (tube * d * tube / 2 + noseSide * (tube + 0.4 * nose)) / planformArea;
  return buildTable({
    referenceArea, terms: [{ area: circle(d), x: L - OGIVE_CP * nose }], nose: { area: circle(d), baseX: tube, diameter: d },
    baseTerms: [{ area: circle(d), x: 0.1 * d }], planformArea, planformX, length: L, diameter: d,
    axial: dragCoefficient,
    // Engines first after the flip: the skirt and the six bells, a blunt base.
    baseAxial: (m) => tumblingDragCoefficient(1.0, m),
  });
}

/** Interpolate one of a table's per-Mach columns. */
export function atMach(table: AeroTable, column: readonly number[], mach: number): number {
  const m = table.mach;
  if (!(mach > m[0])) return column[0];
  for (let i = 1; i < m.length; i++) {
    if (mach <= m[i]) return column[i - 1] + (column[i] - column[i - 1]) * (mach - m[i - 1]) / (m[i] - m[i - 1]);
  }
  return column[column.length - 1];
}
