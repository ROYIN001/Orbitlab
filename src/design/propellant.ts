/**
 * How much room a stage's propellant takes (roadmap D02 stretch, D05 sizing):
 * the volume of a liquid load and the tank length it fills at a diameter.
 *
 * ESTIMATES, from the six-DOF mass model's own tables
 * (src/physics/rigid/vehicle-data.ts): `PROPELLANT_DENSITY` gives each
 * family's oxidizer and fuel densities, and `PROPELLANT_LOADS` each catalogue
 * stage's mixture ratio. A stage the table does not key (a new id, or the
 * Falcon and R-7 stages it leaves on their accepted split) gets its family's
 * ratio: the median of the table's own entries for that family, so no ratio
 * here is a number the repo does not already hold. Liquids only: the repo
 * holds no grain density, so a solid's volume is not estimated.
 *
 * The tank length is the volume over the stage's cross-section, π d²/4: a
 * cylinder full to the wall, with no ullage, no dome and no common bulkhead.
 * It is not a tank design; it answers "how much longer is this stage if it
 * carries this much more propellant at the same diameter", to first order.
 *
 * DOM-free, SI units (kg, m, m³, kg/m³).
 */
import { PROPELLANT_DENSITY, PROPELLANT_LOADS, type PropellantFamily } from '../physics/rigid/vehicle-data';

export type LiquidFamily = Exclude<PropellantFamily, 'solid'>;

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * Each liquid family's mixture ratio (oxidizer/fuel by mass) where a stage has
 * no entry of its own: the median of `PROPELLANT_LOADS` over that family. An
 * estimate — kerolox 2.6, hydrolox 5.88, methalox 3.6, hypergolic 2.1 with
 * today's table (tests/design-remix.test.ts pins them).
 */
export const FAMILY_MIXTURE_RATIO: Readonly<Record<LiquidFamily, number>> = (() => {
  const out = {} as Record<LiquidFamily, number>;
  for (const family of Object.keys(PROPELLANT_DENSITY) as LiquidFamily[]) {
    out[family] = median(Object.values(PROPELLANT_LOADS).filter((l) => l.family === family && l.mixtureRatio !== undefined).map((l) => l.mixtureRatio!));
  }
  return out;
})();

/** A stage's mixture ratio: its own `PROPELLANT_LOADS` entry when that is of this family, else the family's. */
export function mixtureRatioFor(stageId: string, family: LiquidFamily): number {
  const load = PROPELLANT_LOADS[stageId];
  return load && load.family === family && load.mixtureRatio !== undefined ? load.mixtureRatio : FAMILY_MIXTURE_RATIO[family];
}

/** m³ a kilogram of this load takes: of/ρ_ox + (1 − of)/ρ_fuel with of = r/(1 + r). */
export function specificVolume(family: LiquidFamily, mixtureRatio: number): number {
  const [ox, fuel] = PROPELLANT_DENSITY[family];
  const of = mixtureRatio / (1 + mixtureRatio);
  return of / ox + (1 - of) / fuel;
}

/** m of a full-width cylinder that holds `massKg` of this load at `diameterM`. */
export function tankLength(massKg: number, diameterM: number, family: LiquidFamily, mixtureRatio: number): number {
  return (massKg * specificVolume(family, mixtureRatio)) / (Math.PI * diameterM * diameterM / 4);
}
