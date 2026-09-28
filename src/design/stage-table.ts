/**
 * The Build section's stage-by-stage figures, row by row (roadmap D02–D05
 * show the same figures for a design; the Watch level shows them for a real
 * vehicle): the budget core's phases (src/design/budget.ts) gathered under
 * the stage they belong to, with that stage's thrust-to-weight at ignition,
 * structural ratio and propellant fraction, and its strap-ons' own.
 *
 * The figures are ideal, as the budget core's are: vacuum Isp, full throttle,
 * no gravity or drag loss. They are worked out from the catalogue's figures,
 * which are rounded public figures (±10 %, src/data/vehicles.ts), so the
 * screen labels them as estimates.
 *
 * DOM-free. tests/design-stage-table.test.ts.
 */
import type { VehicleSpec } from '../types';
import { vehicleFigures, type BoosterFigures, type PhaseBudget, type VehicleFigures } from './budget';

/**
 * The payload the Watch level works a real vehicle's figures out at: half its
 * rated low-orbit payload, the load the fleet tests fly each vehicle at
 * (tests/ascent.test.ts, tests/design-budget.test.ts).
 */
export const WATCH_PAYLOAD_SHARE = 0.5;
export const watchPayload = (spec: VehicleSpec): number => spec.payloadLEO * WATCH_PAYLOAD_SHARE;

export interface StageRow {
  stageIndex: number;
  stageId: string;
  /** its phases in burn order: one serial phase, or a parallel phase then the core alone */
  phases: PhaseBudget[];
  /** Σ of its phases' Δv, m/s */
  dv: number;
  twIgnition: number;
  ignitionMass: number;
  structuralRatio: number;
  propellantFraction: number;
  boosters: BoosterFigures[];
}

export interface StageTable {
  rows: StageRow[];
  /** the whole vehicle's: the budget core's total, and the liftoff figures */
  totalDv: number;
  liftoffMass: number;
  liftoffTW: number;
  payloadKg: number;
  payloadFraction: number;
}

/** The phases gathered by stage, in stage order; a stage the walk leaves out (a spacecraft's own) has no row. */
export function stageRows(fig: VehicleFigures): StageRow[] {
  return fig.stages
    .map((s) => {
      const phases = fig.phases.filter((p) => p.stageIndex === s.stageIndex);
      let dv = 0;
      for (const p of phases) dv += p.dv;
      return {
        stageIndex: s.stageIndex, stageId: s.stageId, phases, dv,
        twIgnition: s.twIgnition, ignitionMass: s.ignitionMass,
        structuralRatio: s.structuralRatio, propellantFraction: s.propellantFraction, boosters: s.boosters,
      };
    })
    .filter((r) => r.phases.length > 0);
}

export function stageTable(spec: VehicleSpec, payloadKg: number): StageTable {
  const fig = vehicleFigures(spec, payloadKg);
  return {
    rows: stageRows(fig), totalDv: fig.totalDv, liftoffMass: fig.liftoffMass, liftoffTW: fig.liftoffTW,
    payloadKg, payloadFraction: fig.payloadFraction,
  };
}
