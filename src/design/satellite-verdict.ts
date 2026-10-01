/**
 * The Launch section's verdict on a designed satellite's mission, said before
 * "Fly it" is pressed (roadmap D06, docs/ROADMAP-PART2-3.md; the stage-3a
 * integration review's first doubt): a designed NAPA-2 on the Launch
 * section's default Soyuz-2.1a opened a mission the Launch section then
 * called "Not flyable as set" — with no restartable upper stage the
 * 200 × 540 km insertion is final — and nothing said so before the click.
 *
 * `designVerdict` is the setup panel's verdict (`SetupPanel.feasibility`,
 * src/ui/panel.ts) on the very mission "Fly it" hands over
 * (`designMission`, src/design/satellite-launch.ts), made the way the panel
 * makes it, so it has the same words and states:
 * - the configuration is the panel's `getConfig()` of that state
 *   (`missionConfigFromState`, which restates it for code with no panel);
 * - the vehicle is `openTopVehicle` of the mission's vehicle and satellite;
 * - one `planMission`, and the insertion probe (`probeInsertion`, point
 *   mass) only when the static budget calls the mission marginal
 *   (`marginalMission`) — the panel's gate (`refreshInsertionProbe`), not
 *   the readiness review's, which always flies it for a vehicle of one's own;
 * - `missionVerdict` with no armed failure (the hand-off arms none) and no
 *   site reassignment (the mission names its own site).
 * tests/d06-satellite-verdict.test.ts checks it against the verdict of the
 * mission the Launch section reads back from the document.
 *
 * `designRockets` asks the same question of each vehicle the satellite
 * designer offers, and keeps those the verdict does not fail: the rockets
 * that can fly it, from the same verdict and no new physics.
 *
 * Cost, measured in node on the shared 4-core machine for the seven
 * templates on the 21 vehicles of the fleet: a verdict is under 2 ms
 * unless the mission is marginal and the probe flies, 30–565 ms (a GTO
 * probe); the whole fleet 0.1–1.1 s for one design. So the page works the
 * picked vehicle's verdict out once the typing pauses, and the fleet's a
 * vehicle at a time between frames, keeping each (src/ui/build/satellite-fly.ts).
 *
 * DOM-free; the verdict's text comes through `t()` inside `missionVerdict`
 * (src/config/verdict.ts, which runs in node). It reads the planner and the
 * probe, never the propagator (tests/propagator.test.ts).
 */
import type { MissionPlan } from '../physics/mission';
import { planMission, resolveTarget } from '../physics/mission';
import { probeInsertion, type InsertionProbe } from '../physics/autotune';
import { RAD } from '../physics/constants';
import { siteById } from '../data/sites';
import { missionSatellite } from '../data/satellites';
import { missionVehicle, openTopVehicle } from '../data/vehicles';
import { marginalMission, missionVerdict, type Feasibility } from '../config/verdict';
import { missionConfigFromState } from '../lessons/config';
import { designMission, type DesignFlight } from './satellite-launch';
import type { SatelliteDesign } from './satellite-spec';

/** The setup panel's verdict on the mission "Fly it" would hand over (see the module's note). */
export function designVerdict(design: SatelliteDesign, f: DesignFlight): Feasibility {
  const s = designMission(design, f);
  const cfg = missionConfigFromState(s);
  const satellite = missionSatellite(s);
  const spec = openTopVehicle(missionVehicle(s), satellite);
  const site = siteById(s.siteId);
  let plan: MissionPlan | null = null;
  try { plan = planMission(cfg, site, spec); } catch { plan = null; }
  let insertion: InsertionProbe | null = null;
  if (plan && marginalMission(spec, satellite, s.payloadMass, plan, s.orbit)) {
    try {
      insertion = probeInsertion({ ...cfg, dynamics: { ...(cfg.dynamics ?? { wind: 'calm', seed: 20260919 }), model: 'pointMass' } });
    } catch { insertion = null; }
  }
  return missionVerdict({
    spec, site, orbit: s.orbit, satellite, payloadMass: s.payloadMass,
    inclinationDeg: resolveTarget(s.orbit, site, s.launchTime).inclination * RAD,
    plan, insertion, failureMode: s.failure.mode, siteReassigned: false,
  });
}

/** A vehicle the designer offers, and the verdict on flying the design with it. */
export interface DesignRocket {
  flight: DesignFlight;
  verdict: Feasibility;
}

/**
 * Of the flights given — one per vehicle the designer offers, each as "Fly
 * it" would make it — those whose verdict is not a failure ("Ready to fly"
 * or "Flyable, with a caution"), in the order given. `verdictOf` is
 * `designVerdict`; the page passes the same function behind its cache,
 * since it works the fleet out a vehicle at a time between frames.
 */
export function designRockets(
  design: SatelliteDesign, flights: readonly DesignFlight[], verdictOf: (design: SatelliteDesign, f: DesignFlight) => Feasibility = designVerdict,
): DesignRocket[] {
  return flights.map((flight) => ({ flight, verdict: verdictOf(design, flight) })).filter((r) => r.verdict.level !== 'fail');
}
