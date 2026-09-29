/**
 * The Build section's Watch level: a narrated tour of real rockets taken
 * apart, as src/orbit/tour.ts is for the Orbit section. Five steps, each on a
 * real vehicle of the catalogue, each saying one thing in plain words: what a
 * stage is; why rockets stage (the rocket equation); strap-ons and the
 * parallel phase; the upper stage's thrust-to-weight; the fairing.
 *
 * A step picks the vehicle, the view and the parts it points at, opens one
 * part's card, and names the figures it shows beside its text. The figures
 * are worked out here from the vehicle's spec with the budget core
 * (src/design/budget.ts): ideal (vacuum Isp, no gravity or drag loss) and
 * from the catalogue's rounded public figures, at the payload the Watch
 * level's stage table uses (half the rated LEO payload). Two of them are
 * what-ifs rather than the vehicle's own figures, and are marked as
 * estimates: the Δv the same propellant would give with the empty stages
 * carried to the end, and the thrust-to-weight of a strap-on vehicle's core
 * alone on the pad.
 *
 * DOM-free. tests/design-build-tour.test.ts holds every step to a real
 * vehicle, the parts it points at to that vehicle's, its text to the three
 * dictionaries, and its figures to their meaning (a stage dropped is Δv
 * gained; an upper stage lights below a thrust-to-weight of 1).
 */
import type { VehicleSpec } from '../types';
import { G0 } from '../physics/constants';
import { engineThrustSL, solidProfile } from '../physics/vehicle';
import { vehicleById } from '../data/vehicles';
import { vehicleFigures, type PhaseBudget } from './budget';
import { watchPayload } from './stage-table';

export type TourStat =
  | 'stages' | 'height' | 'liftoffMass'
  | 'stagedDv' | 'carriedDv'
  | 'liftoffTW' | 'coreTW' | 'parallelDv'
  | 'upperTW'
  | 'fairingMass' | 'fairingLength' | 'fairingJettison';

export interface BuildTourStep {
  id: string;
  /** i18n keys of the step's title and narration */
  titleKey: string;
  textKey: string;
  /** a catalogue vehicle id */
  vehicle: string;
  /** 'exploded' moves the parts apart; 'assembled' stands the stack up */
  view: 'exploded' | 'assembled';
  /** drawing refs (src/design/exploded.ts) the step points at; the rest is drawn faint. Empty: nothing is faint */
  highlight: readonly string[];
  /** the part whose card opens with the step */
  select: string | null;
  stats: readonly TourStat[];
}

export const BUILD_TOUR: readonly BuildTourStep[] = [
  {
    id: 'stack', titleKey: 'build.tour.stack.title', textKey: 'build.tour.stack.text', vehicle: 'saturnv', view: 'exploded',
    highlight: [], select: null, stats: ['stages', 'height', 'liftoffMass'],
  },
  {
    id: 'staging', titleKey: 'build.tour.staging.title', textKey: 'build.tour.staging.text', vehicle: 'falcon9', view: 'exploded',
    highlight: ['stage:0', 'stage:1'], select: 'stage:0', stats: ['stagedDv', 'carriedDv'],
  },
  {
    id: 'strapons', titleKey: 'build.tour.strapons.title', textKey: 'build.tour.strapons.text', vehicle: 'soyuz21a', view: 'assembled',
    highlight: ['booster:0:0', 'stage:0'], select: 'booster:0:0', stats: ['liftoffTW', 'coreTW', 'parallelDv'],
  },
  {
    id: 'upper', titleKey: 'build.tour.upper.title', textKey: 'build.tour.upper.text', vehicle: 'atlasv551', view: 'exploded',
    highlight: ['stage:1'], select: 'stage:1', stats: ['liftoffTW', 'upperTW'],
  },
  {
    id: 'fairing', titleKey: 'build.tour.fairing.title', textKey: 'build.tour.fairing.text', vehicle: 'ariane64', view: 'exploded',
    highlight: ['fairing'], select: 'fairing', stats: ['fairingMass', 'fairingLength', 'fairingJettison'],
  },
];

/**
 * Σ Δv with nothing dropped: each phase burns the same propellant with the
 * same engines, but pushes along everything the real vehicle has shed before
 * it (empty stages, strap-on casings, the fairing). The difference from the
 * staged total is what staging buys. An estimate of a vehicle that does not
 * exist, ideal like the rest.
 */
export function carriedDv(phases: readonly PhaseBudget[]): number {
  let dropped = 0, dv = 0;
  phases.forEach((p, k) => {
    if (k > 0) dropped += phases[k - 1].mf - p.m0;
    if (p.m0 > p.mf) dv += p.ve * Math.log((p.m0 + dropped) / (p.mf + dropped));
  });
  return dv;
}

/**
 * Thrust-to-weight on the pad with the strap-ons' thrust left out: the core
 * stage's own engines at sea level (a solid's head-end peak as
 * `liftoffThrust` applies it) against the whole vehicle's weight. An
 * estimate of a configuration that does not fly.
 */
export function coreAloneTW(spec: VehicleSpec, liftoffMass: number): number {
  const e = spec.stages[0].engine;
  return (e.count * engineThrustSL(e) * (e.solid ? solidProfile(0, e.peakFactor) : 1)) / (liftoffMass * G0);
}

export interface TourFigure {
  stat: TourStat;
  /** SI: m, kg, m/s, s; a ratio or a count bare */
  value: number;
  /** a what-if, not the vehicle's own figure */
  estimate: boolean;
}

/** A step's figures, in the order the step names them; a figure the vehicle does not have is left out. */
export function tourFigures(step: BuildTourStep): TourFigure[] {
  const spec = vehicleById(step.vehicle);
  const fig = vehicleFigures(spec, watchPayload(spec));
  const out: TourFigure[] = [];
  const add = (stat: TourStat, value: number | null | undefined, estimate = false): void => {
    if (value !== null && value !== undefined && Number.isFinite(value)) out.push({ stat, value, estimate });
  };
  for (const stat of step.stats) {
    switch (stat) {
      case 'stages': add(stat, spec.stages.filter((s) => !s.isSpacecraft).length); break;
      case 'height': add(stat, spec.height); break;
      case 'liftoffMass': add(stat, fig.liftoffMass); break;
      case 'stagedDv': add(stat, fig.totalDv); break;
      case 'carriedDv': add(stat, carriedDv(fig.phases), true); break;
      case 'liftoffTW': add(stat, fig.liftoffTW); break;
      case 'coreTW': add(stat, spec.stages[0].boosters?.length ? coreAloneTW(spec, fig.liftoffMass) : null, true); break;
      case 'parallelDv': add(stat, fig.phases.find((p) => p.phase === 'parallel')?.dv); break;
      case 'upperTW': add(stat, fig.stages[1]?.twIgnition); break;
      case 'fairingMass': add(stat, spec.fairing?.mass); break;
      case 'fairingLength': add(stat, spec.fairing?.length); break;
      case 'fairingJettison': add(stat, spec.fairing?.sepTime); break;
    }
  }
  return out;
}
