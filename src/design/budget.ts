/**
 * A vehicle's Δv budget phase by phase, and the figures a designer reads off
 * it: thrust-to-weight at each ignition, structural ratio, propellant and
 * payload fractions (roadmap D02–D05; one core that the remix, the parts
 * builder, the test facilities and the optimal-staging page all call).
 *
 * Why a second walk instead of splitting `VehicleModel.deltaVRemaining`: that
 * walk feeds the mission planner (`dvStrong`) and the telemetry every recorded
 * flight is checked against. Rewriting it as a sum of per-stage parts would
 * re-associate its additions and could move the last bit of every built-in
 * flight. So it stays as it is, and this module replays the same walk over the
 * same `VehicleModel` state: usable propellant (recovery reserves held back),
 * the strap-on parallel phase split at booster burnout, the fairing dropped at
 * the first staging boundary. It adds the phases in the order the model adds
 * them, so the sum of `dv` here is the model's own `deltaVRemaining()`
 * (tests/design-budget.test.ts holds it to that and to the rocket equation
 * worked by hand from the spec).
 *
 * Ideal means what the model's walk means: vacuum Isp, full throttle, no
 * gravity or drag loss, no start-up or tail-off transients. Burn times are the
 * full-throttle ones; a flight that throttles for max-Q or for the
 * acceleration limit burns longer.
 *
 * DOM-free, SI units throughout (kg, m/s, s, N).
 */
import type { VehicleSpec } from '../types';
import { G0 } from '../physics/constants';
import { VehicleModel, engineMassFlow, engineThrust, liftoffThrust, solidProfile } from '../physics/vehicle';

/**
 * `parallel`: a first stage burning with its strap-ons, until they run dry.
 * `core`: the same stage burning on alone after the strap-on casings are gone.
 * `serial`: a stage burning by itself, the whole of its load.
 */
export type PhaseKind = 'parallel' | 'core' | 'serial';

export interface PhaseBudget {
  stageIndex: number;
  stageId: string;
  phase: PhaseKind;
  /** stack mass when the phase starts, kg */
  m0: number;
  /** stack mass when it ends, before anything is dropped, kg */
  mf: number;
  /** effective exhaust speed, m/s: G0·ispVac, flow-weighted over core and strap-ons in a parallel phase */
  ve: number;
  /** ideal Δv of the phase, m/s: ve·ln(m0/mf) */
  dv: number;
  /** full-throttle burn time, s (Infinity for propellant no running engine can burn) */
  burnTime: number;
}

export interface BoosterFigures {
  id: string;
  count: number;
  /** ε = ms/(ms+mp) of one unit */
  structuralRatio: number;
  /** mp/(ms+mp) of one unit */
  propellantFraction: number;
}

export interface StageFigures {
  stageIndex: number;
  stageId: string;
  /** thrust over weight when the stage lights; for stage 0 the liftoff figure */
  twIgnition: number;
  /** the mass it lights under, kg */
  ignitionMass: number;
  /** ε = ms/(ms+mp), the stage's own dry and propellant masses (strap-ons apart) */
  structuralRatio: number;
  /** mp/(ms+mp) */
  propellantFraction: number;
  /** the strap-on groups the stage carries, per unit (stage 0 only; empty elsewhere) */
  boosters: BoosterFigures[];
}

export interface VehicleFigures {
  phases: PhaseBudget[];
  stages: StageFigures[];
  /** Σ dv over the phases, m/s: the model's `idealDeltaV(spec, payloadKg)` */
  totalDv: number;
  /** the setup panel's T/W, liftoff thrust / (liftoff mass · G0) */
  liftoffTW: number;
  liftoffMass: number;
  /** N, sea level, all ground-lit engines, a solid's head-end factor applied (`liftoffThrust`) */
  liftoffThrust: number;
  /** payload / liftoff mass */
  payloadFraction: number;
}

/**
 * The phases still to burn from a model's current state: the active stage and
 * everything above it, the spacecraft's own propulsion excluded (as the
 * model's walk excludes it). A replay of `VehicleModel.deltaVRemaining`, line
 * for line in the mass bookkeeping, so that Σ dv is that function's value;
 * read that walk's comment for why strap-ons are a phase of their own and where
 * the fairing goes. Two of its simplifications carry over and are the model's,
 * not this module's: every strap-on group burns at the first group's Isp, and
 * an air-lit group (`igniteAt`) is counted in the parallel phase from liftoff.
 */
export function phaseBudgets(vm: VehicleModel): PhaseBudget[] {
  const out: PhaseBudget[] = [];
  const act = vm.active;
  if (!act) return out;
  let mass = vm.totalMass();
  let fairing = vm.fairingAttached && vm.spec.fairing ? vm.spec.fairing.mass : 0;
  const stagesAbove = vm.stages.filter((s) => s.attached && s.index >= act.index && !s.spec.isSpacecraft);
  if (fairing > 0 && act.index > 0) {
    mass -= fairing;
    fairing = 0;
  }
  for (const st of stagesAbove) {
    const e = st.spec.engine;
    const coreProp = vm.usablePropellant(st);
    const veCore = G0 * e.ispVac;
    let boosterProp = 0;
    let boosterFlow = 0;
    let boosterDry = 0;
    let boosterVe = veCore;
    if (st.index === act.index) {
      for (const b of st.boosters) {
        if (!b.attached) continue;
        boosterProp += vm.usableBoosterPropellant(b) * b.spec.count;
        boosterFlow += b.spec.count * b.spec.engine.count * engineMassFlow(b.spec.engine);
        boosterDry += (b.spec.dryMass + (b.propellant - vm.usableBoosterPropellant(b))) * b.spec.count;
      }
      if (boosterProp > 0) boosterVe = G0 * st.boosters[0].spec.engine.ispVac;
    }
    // The walk floors the core flow at 1e-9 kg/s so that a stage with every
    // engine out still divides; the burn time uses the real flow instead.
    const runningFlow = e.count * st.engineFraction * engineMassFlow(e);
    const coreFlow = Math.max(1e-9, runningFlow);
    const burnTime = (prop: number): number => (prop <= 0 ? 0 : runningFlow > 0 ? prop / runningFlow : Infinity);
    const at = { stageIndex: st.index, stageId: st.spec.id };
    if (boosterProp > 0 && boosterFlow > 0) {
      const tPar = boosterProp / boosterFlow;
      const coreInPar = Math.min(coreProp, coreFlow * tPar);
      const burned = boosterProp + coreInPar;
      const ve = (coreFlow * veCore + boosterFlow * boosterVe) / (coreFlow + boosterFlow);
      out.push({ ...at, phase: 'parallel', m0: mass, mf: mass - burned, ve, dv: mass > burned ? ve * Math.log(mass / (mass - burned)) : 0, burnTime: tPar });
      mass -= burned + boosterDry;
      // Listed even when the core ran dry with its strap-ons, so that a strap-on
      // stage always has both rows; it is then worth nothing. Falcon Heavy and
      // Angara A5 do: their cores carry their strap-ons' load at their flow, and
      // the walk flies the core at full throttle throughout (it does not read
      // `throttleWithBoosters`).
      const coreLeft = coreProp - coreInPar;
      out.push({ ...at, phase: 'core', m0: mass, mf: mass - coreLeft, ve: veCore, dv: coreLeft > 0 && mass > coreLeft ? veCore * Math.log(mass / (mass - coreLeft)) : 0, burnTime: burnTime(coreLeft) });
      mass -= coreLeft;
    } else {
      out.push({ ...at, phase: 'serial', m0: mass, mf: mass - coreProp, ve: veCore, dv: coreProp > 0 && mass > coreProp ? veCore * Math.log(mass / (mass - coreProp)) : 0, burnTime: burnTime(coreProp) });
      mass -= coreProp;
    }
    mass -= st.spec.dryMass + (st.propellant - coreProp);
    if (fairing > 0) {
      mass -= fairing;
      fairing = 0;
    }
  }
  return out;
}

/** The phases of a vehicle on the pad with this payload (roadmap D03's stage-by-stage Δv). */
export function stageBudgets(spec: VehicleSpec, payloadKg: number): PhaseBudget[] {
  return phaseBudgets(new VehicleModel(spec, payloadKg));
}

/** Σ dv, added in walk order: the order `deltaVRemaining` adds them in. */
export function totalDv(phases: readonly PhaseBudget[]): number {
  let dv = 0;
  for (const p of phases) dv += p.dv;
  return dv;
}

const structural = (dry: number, prop: number): { structuralRatio: number; propellantFraction: number } => ({
  structuralRatio: dry / (dry + prop),
  propellantFraction: prop / (dry + prop),
});

/**
 * Everything the builder shows about a design at a payload (roadmap D02, D03,
 * D05).
 *
 * T/W at ignition:
 * - Stage 0 is the setup panel's liftoff figure, `liftoffThrust / (liftoffMass·G0)`
 *   (src/ui/panel.ts `updateStats`), so the builder and the launch screen never
 *   disagree about the same vehicle.
 * - An upper stage is its vacuum thrust, a solid's head-end peak applied as
 *   `liftoffThrust` applies it, over the mass it lights under. The second stage
 *   is counted with the fairing still on, because a fairing typically comes off
 *   a minute or so into the second stage's burn (the model's walk says the
 *   same). Where a vehicle has shed it earlier the figure is slightly low,
 *   never high, so it cannot promise thrust a stage does not have. This is also
 *   the mass `VehicleModel.nextStageAccel` divides by from the pad. From the
 *   third stage on the fairing is gone, as it is in the Δv walk.
 */
export function vehicleFigures(spec: VehicleSpec, payloadKg: number): VehicleFigures {
  const vm = new VehicleModel(spec, payloadKg);
  const m0 = vm.totalMass();
  const T0 = liftoffThrust(spec);
  const liftoffTW = T0 / (m0 * G0);
  const phases = phaseBudgets(vm);
  const stages: StageFigures[] = spec.stages.map((st, i) => {
    let ignitionMass = m0;
    let tw = liftoffTW;
    if (i > 0) {
      // summed in `nextStageAccel`'s order: stages, then payload, then fairing
      ignitionMass = 0;
      for (let j = i; j < spec.stages.length; j++) ignitionMass += spec.stages[j].dryMass + spec.stages[j].propellantMass;
      ignitionMass += payloadKg;
      if (i === 1 && spec.fairing) ignitionMass += spec.fairing.mass;
      const e = st.engine;
      const thrust = e.count * engineThrust(e, 0) * (e.solid ? solidProfile(0, e.peakFactor) : 1);
      tw = thrust / (ignitionMass * G0);
    }
    return {
      stageIndex: i,
      stageId: st.id,
      twIgnition: tw,
      ignitionMass,
      ...structural(st.dryMass, st.propellantMass),
      boosters: (st.boosters ?? []).map((b) => ({ id: b.id, count: b.count, ...structural(b.dryMass, b.propellantMass) })),
    };
  });
  return {
    phases,
    stages,
    totalDv: totalDv(phases),
    liftoffTW,
    liftoffMass: m0,
    liftoffThrust: T0,
    payloadFraction: payloadKg / m0,
  };
}
