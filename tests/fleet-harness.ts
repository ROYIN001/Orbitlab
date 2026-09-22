/**
 * Shared harness for the fleet acceptance test (`fleet-defaults.test.ts`), the
 * anti-rot test that pins the known failures, and any throwaway probe.
 *
 * It exists so that there is exactly *one* definition of "this mission was
 * flown successfully": the acceptance test and the `known guidance failures
 * still fail` test used to judge by different criteria, so a case could be
 * fixed for one and still broken for the other.
 */
import { Simulation } from '../src/physics/simulation';
import { DEFAULT_GUIDANCE, DEFAULT_FAILURE } from '../src/physics/defaults';
import { orbitById } from '../src/data/orbits';
import { siteById } from '../src/data/sites';
import { VEHICLES } from '../src/data/vehicles';
import type { MissionConfig, VehicleSpec } from '../src/types';
import { G0, DEG, RAD, R_EARTH } from '../src/physics/constants';
import { circularSpeed, elementsFromState, rotatingLaunchAzimuth, wrapPi } from '../src/physics/orbital';
import {
  azimuthAllowedFor, inclinationCorridor, launchDescendingFor, maxInclinationFor, resolveTarget, launchWindows,
} from '../src/physics/mission';

export const LAUNCH_TIME = new Date(Date.UTC(2026, 8, 15, 12, 0, 0));
export const FRACTIONS = [0.25, 0.5, 0.9];

/**
 * Accuracy the fleet is held to — defined HERE, deliberately not imported from
 * `src/physics/mission.ts`.
 *
 * An earlier revision of this harness re-exported `apsisTolerance` and
 * `transferPerigeeTolerance` from the library and graded the achieved orbit by
 * calling the library's own `orbitResiduals`. The reasoning was that a second
 * copy of the bands would be a second opinion about what "on target" means —
 * but a second opinion is exactly what an acceptance gate is for. The
 * simulation emits `evt.targetOrbit` only when `orbitResiduals(...).onTarget`,
 * so a harness that then re-checks with the same function verifies only that
 * the simulation agrees with itself, and the fleet matrix stops measuring the
 * orbit at all. Every number in this wave's before/after matrix is measured
 * with this instrument, so the instrument is independent (review follow-up).
 *
 * The values are numerically the same as the library's today. That is the
 * point: when they stop being the same, the fleet gate says so instead of
 * following along.
 *
 * Circular targets: each apsis within 10 km or 2 %. Transfer targets: the apogee
 * within the same band and the perigee within max(15 km, 5 %), two-sided — see
 * `docs/PHYSICS.md`, "Insertion accuracy", for why that one is wider and what it
 * costs to close.
 */
export const APSIS_TOLERANCE = (h: number): number => Math.max(10e3, 0.02 * h);
export const TRANSFER_PERIGEE_TOLERANCE = (h: number): number => Math.max(15e3, 0.05 * h);
/** deg */
export const INCLINATION_TOLERANCE_DEG = 0.3;
/** deg */
export const RAAN_TOLERANCE_DEG = 1.5;

/**
 * The orbit the vehicle is actually in, re-derived from the raw state vector.
 *
 * `sim.state.elements` is maintained by the simulation; this goes back to
 * `sim.state.r` / `sim.state.v` so that a bug in the bookkeeping of the cached
 * elements cannot pass the gate.
 */
export function achievedElements(sim: Simulation): ReturnType<typeof elementsFromState> {
  return elementsFromState(sim.state.r, sim.state.v);
}

/**
 * Independent comparison of the achieved orbit with the mission's target.
 *
 * Graded here, against this file's own bands, from this file's own re-derived
 * elements. RAAN is graded whenever the target constrains it, including an
 * off-window launch. Capability fixtures select a valid launch window; an
 * impossible mission must never pass by silently dropping a target constraint.
 */
export function orbitMisses(sim: Simulation): string[] {
  const el = achievedElements(sim);
  const target = sim.plan.target;
  const misses: string[] = [];
  const ap = isFinite(el.apoapsisAlt) ? el.apoapsisAlt : Infinity;
  const elliptical = target.apogee - target.perigee > 50e3;
  const peTol = elliptical ? TRANSFER_PERIGEE_TOLERANCE(target.perigee) : APSIS_TOLERANCE(target.perigee);
  if (!(Math.abs(ap - target.apogee) <= APSIS_TOLERANCE(target.apogee))) {
    misses.push(`apogee ${Math.round(ap / 1e3)} vs ${Math.round(target.apogee / 1e3)} km`);
  }
  if (!(Math.abs(el.periapsisAlt - target.perigee) <= peTol)) {
    misses.push(`perigee ${Math.round(el.periapsisAlt / 1e3)} vs ${Math.round(target.perigee / 1e3)} km`);
  }
  const dInc = (el.i - target.inclination) / DEG;
  if (!(Math.abs(dInc) <= INCLINATION_TOLERANCE_DEG)) misses.push(`inclination ${dInc.toFixed(2)}° off`);
  if (target.raan !== null) {
    const dRaan = wrapPi(el.raan - target.raan) / DEG;
    if (!(Math.abs(dRaan) <= RAAN_TOLERANCE_DEG)) misses.push(`RAAN ${dRaan.toFixed(1)}° off`);
  }
  return misses;
}

export interface FleetCase {
  vehicle: string;
  site: string;
  orbit: string;
  percent: number;
  mass: number;
}

export const caseKey = (c: FleetCase): string => `${c.vehicle}/${c.orbit}/${c.percent}`;

/**
 * The published rating a fleet row's payload is a percentage OF.
 *
 * Graded per orbit, not per vehicle. A launcher's sun-synchronous capability is
 * a different (always smaller) number from its low-orbit one — Electron is
 * 300 kg to LEO and 200 kg to sun-synchronous, Long March 2D 3 500 and 1 300 —
 * so grading an `sso` row against `payloadLEO` asks several vehicles to carry
 * more than their own published sun-synchronous rating and then records the
 * result as "beyond capability", which is a statement about the reference, not
 * about the vehicle. `payloadSSO` is optional: a vehicle that does not publish
 * one keeps the LEO reference.
 */
function payloadReference(v: VehicleSpec, orbit: string): number {
  if (orbit === 'gto') return v.payloadGTO;
  if (orbit === 'sso' && v.payloadSSO) return v.payloadSSO;
  return v.payloadLEO;
}

/**
 * Every vehicle × preset × payload fraction, before exclusions.
 *
 * The preset list is a property of the *vehicle and its site*, never of how
 * well the guidance flies it: `leo` for everybody, `iss` where the site's
 * range-safety corridor contains 51.64°, `sso` for everybody (a site
 * whose azimuth window forbids the retrograde launch is excluded by name in
 * the `SITE_GEOMETRY` table below, so the exclusion is visible next to all the
 * others instead of silently shrinking the matrix), and `gto` where the vehicle
 * has a published GTO capability.
 *
 * The `iss` gate used to read `site.minInclination <= 51.64`, i.e. the lower
 * end of the corridor only — the same one-sided test the setup panel's verdict
 * carried until release review 2 (major #2). It put six rows in the matrix that
 * no range would licence: Starship from Starbase (corridor 80–110°, reaching
 * 26–31.8°) and Long March 3B/E from Xichang (94–104°, reaching 28.5–31°), each
 * at three payload fractions, all flown to a 51.64° plane and all accepted.
 * `inclinationCorridor` is the same function `planMission` and the panel now
 * use, so the matrix, the plan and the verdict cannot disagree about what a
 * site can fly.
 */
export function allCases(): FleetCase[] {
  const out: FleetCase[] = [];
  for (const v of VEHICLES) {
    const site = siteById(v.sites[0]);
    const orbits = ['leo'];
    if (inclinationCorridor(site, resolveTarget(orbitById('iss'), site, LAUNCH_TIME).inclination) === 'ok') orbits.push('iss');
    orbits.push('sso');
    if (v.payloadGTO > 0) orbits.push('gto');
    for (const orbit of orbits) {
      const ref = payloadReference(v, orbit);
      if (ref <= 0) continue;
      for (const f of FRACTIONS) {
        out.push({ vehicle: v.id, site: site.id, orbit, percent: Math.round(f * 100), mass: Math.round(ref * f) });
      }
    }
  }
  return out;
}

export function flyCase(c: FleetCase, satelliteId = 'cubesats'): Simulation {
  const spec = VEHICLES.find((v) => v.id === c.vehicle)!;
  const orbit = orbitById(c.orbit);
  const window = orbit.raanMode === 'free' ? undefined : launchWindows(orbit, siteById(c.site), LAUNCH_TIME, 1)[0];
  const cfg: MissionConfig = {
    vehicleId: c.vehicle, satelliteId, siteId: c.site, orbit,
    launchTime: window?.time ?? LAUNCH_TIME,
    guidance: { ...DEFAULT_GUIDANCE, ...(spec.guidanceDefaults ?? {}) },
    guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: c.mass,
  };
  const sim = new Simulation(cfg, { headless: true });
  // A GTO mission with a low-thrust kick stage (Briz-M, Fregat, PS4) splits the
  // apogee raising across several perigee passes, which really does take hours.
  const maxTime = c.orbit === 'gto' ? 30 * 3600 : 10 * 3600;
  let guard = 0;
  while (!sim.done && sim.state.t < maxTime && guard++ < 400000) sim.step(sim.suggestedDt());
  return sim;
}

/** Thrust acceleration of the last launcher stage at its ignition, m/s^2. */
export function upperStageAccel(spec: VehicleSpec, payload: number): number {
  const last = spec.stages[spec.stages.length - 1];
  const mass = last.dryMass + last.propellantMass + payload;
  return (last.engine.count * last.engine.thrustVac) / Math.max(1, mass);
}

/** Insertion time: the first cut-off into a stable orbit. */
export function insertionTime(sim: Simulation): number {
  const seco = sim.events.find((e) => e.key === 'evt.seco');
  const park = sim.events.find((e) => e.key === 'evt.parkingOrbit');
  const ts = [seco?.t, park?.t].filter((t): t is number => t !== undefined);
  return ts.length > 0 ? Math.min(...ts) : -1;
}

/**
 * Clock the insertion has to beat, s — set by what the upper stage can actually
 * do, not by a single fleet-wide number.
 *
 * A two- or three-stage launcher whose last stage lights at more than 0.5 g
 * (Merlin Vacuum, LE-5B-3, YF-75D, Blok I, Raptor) is in orbit inside T+900 s.
 * A hydrogen upper stage at 0.15–0.5 g (Centaur III and V, Vinci) burns for ten
 * to twenty minutes — Atlas V and Vulcan LEO insertions really are around
 * T+15 min — and a kick stage below 0.15 g (Briz-M, Fregat, Curie) longer
 * still, so those get 1400 s and 1900 s.
 *
 * The rule is the same for a stack of four or more stages (Proton-M, PSLV-XL):
 * the launcher's own stages leave it suborbital — Proton-M's third stage cuts
 * off at T+570 s in this model against a published ~583 s — and the orbit is
 * made by the kick stage, so the kick stage's acceleration is exactly what
 * decides when the parking orbit exists. A 19.6 kN Briz-M pushing 30 t needs
 * ~15 minutes of burn for the 570 m/s it owes, which is why that class gets
 * 1900 s and not the 900 s a Merlin Vacuum is held to.
 */
export function insertionLimit(spec: VehicleSpec, payload: number): number {
  const a = upperStageAccel(spec, payload) / G0;
  return a > 0.5 ? 900 : a > 0.15 ? 1400 : 1900;
}

/**
 * Every acceptance criterion in one place, as a list of human-readable
 * failures (empty when the mission is accepted).
 */
export function acceptanceFailures(sim: Simulation, c: FleetCase): string[] {
  const out: string[] = [];
  const keys = sim.events.map((e) => e.key);
  for (const k of ['evt.impact', 'evt.vehicleLost', 'evt.structuralFailure', 'evt.rangeSafety']) {
    if (keys.includes(k)) out.push(k);
  }
  if (sim.state.status !== 'orbit') out.push(`status ${sim.state.status}`);
  if (!keys.includes('evt.targetOrbit')) out.push('no evt.targetOrbit');
  if (out.length > 0) return out;

  // ...and then the orbit is judged AGAIN, here, independently: this file's own
  // bands against elements re-derived from the raw state vector. The simulation
  // having decided the mission is on target is one of the two things this gate
  // checks, not the whole of it.
  out.push(...orbitMisses(sim));
  const spec = VEHICLES.find((v) => v.id === c.vehicle)!;
  const ti = insertionTime(sim);
  const limit = insertionLimit(spec, c.mass);
  if (ti <= 0) out.push('no insertion event');
  else if (ti >= limit) out.push(`insertion at T+${Math.round(ti)} s, limit ${limit} s`);
  return out;
}

/** Whether a flown mission met every acceptance criterion. */
export function meetsAcceptance(sim: Simulation, c: FleetCase): boolean {
  return acceptanceFailures(sim, c).length === 0;
}

// ---------------------------------------------------------------------------
// The exclusion tables
// ---------------------------------------------------------------------------

function fill(table: Record<string, string>, reason: string, ...keys: string[]): void {
  for (const k of keys) table[k] = reason;
}

/**
 * Remaining ideal delta-v below which a stack counts as out of propellant, m/s.
 *
 * Not zero: `deltaVRemaining()` is computed from the mass ratio of whatever is
 * still attached, and a stage that has shut down on its last kilogram of usable
 * propellant reports a few tens of m/s of unusable residual. 100 m/s is well
 * under the smallest correction any burn in the plan is worth flying and well
 * over that residual — every flight in the tables below measures either < 1 m/s
 * or > 400 m/s, so nothing in the fleet sits near this line.
 */
export const TANKS_EMPTY_DV = 100;

// ---------------------------------------------------------------------------
// 1. Not flyable from the site: range safety.
// The sun-synchronous preset needs a retrograde heading, roughly 341-349°
// (north-north-west) or 191-199° (south-south-west). Of the sites the fleet
// flies from, Plesetsk (330–90°), Jiuquan and Mahia (90–200°) have a window
// that contains one of the two. From Baikonur, Cape Canaveral, Wenchang,
// Starbase and Xichang both headings point over populated land or another
// country's territory, and the launch would not be licensed.
//
// Tanegashima, Sriharikota and Kourou are different in kind: their ranges DO
// put payloads into sun-synchronous orbit, with a dogleg — a yaw during the
// ascent from a licensed heading. This model flies single-plane ascents (there
// is no yaw programme in the guidance), so the plane is out of its reach from
// those three sites, and the reason says so rather than calling the launch
// unlicensable.
//
// The table is generated from the site data so it always describes the sites as
// they are, and `azimuthAllowedFor` — the boolean form of `inclinationCorridor`
// — is the single source of truth for it. The heading and the reach quoted are
// measured from the same window, with `launchDescendingFor` choosing the heading
// the planner would fly.
const DOGLEG_SSO_SITES = new Set(['tanegashima', 'sriharikota', 'kourou']);
export const SITE_GEOMETRY: Record<string, string> = {};
for (const v of VEHICLES) {
  const site = siteById(v.sites[0]);
  const inc = resolveTarget(orbitById('sso'), site, LAUNCH_TIME).inclination;
  if (azimuthAllowedFor(site, inc)) continue;
  const az = rotatingLaunchAzimuth(site.latitude * DEG, inc, circularSpeed(R_EARTH + 300e3), launchDescendingFor(site, inc))!;
  const reason = `a ${(inc * RAD).toFixed(1)}° orbit from ${site.name} needs a ${((az * RAD + 360) % 360).toFixed(1)}° heading, `
    + `outside the site's ${site.azimuthMin}–${site.azimuthMax}° range-safety window, which reaches ${(maxInclinationFor(site) * RAD).toFixed(1)}° at most`
    + (DOGLEG_SSO_SITES.has(site.id) ? '; the real range flies it with a dogleg, which this model does not' : '');
  fill(SITE_GEOMETRY, reason, `${v.id}/sso/25`, `${v.id}/sso/50`, `${v.id}/sso/90`);
}

// ---------------------------------------------------------------------------
// 2. Beyond the modelled vehicle's delta-v. Either the flight ends with the
// tanks empty, or the stages that fly the ascent are short of the ideal
// delta-v the mission's own orbit costs.
//
// The margin quoted in each entry is `MissionPlan.ascentMargin` — (ideal Δv of
// the ascent stages) − (perigee speed of the target + `ASCENT_LOSS_ALLOWANCE`
// of losses − the Earth-rotation credit) — so a negative number is the measured
// shortfall. It is read off the PLAN rather than recomputed here, and
// `every BEYOND_CAPABILITY entry satisfies the rule it is filed under` below
// re-flies every key and checks the rule against it. The value of
// `ASCENT_LOSS_ALLOWANCE` is deliberately not repeated in this comment: the
// last time it was, the constant moved from 1 450 to 1 750 and the shortfalls
// underneath it were left at what they had measured against the old one
// (review follow-up). Every figure below was re-measured against the shipped
// constant, and the enforcing test is what keeps them honest from here.
//
// `payloadLEO` / `payloadSSO` / `payloadGTO` are quoted for a low reference
// orbit (about 200 km), a reference sun-synchronous orbit and a reference GTO;
// the presets here are 420–600 km circular, which costs 150–300 m/s more, so
// 90 % of the quoted figure is out of reach for several launchers once the
// orbit is that high. Proton-M, Angara-A5 and Soyuz-2.1b additionally always
// carry their 22 t kick stage in this model, which is why their LEO capability
// here is a fraction of the published one.
//
// Every row is graded against the rating for ITS OWN orbit — `payloadSSO` for
// the sun-synchronous preset where the vehicle publishes one (see
// `payloadReference` in tests/fleet-harness.ts). Before that was wired up this
// table carried three exclusions that were artefacts of grading sun-synchronous
// rows against `payloadLEO`: Electron's `sso/90` (270 kg, 1.35× its own 200 kg
// sun-synchronous rating) and two of Long March 2D's, all of which now fly or
// fall under a different heading. A fourth, `ariane64/leo/90`, was simply
// stale: re-measured it inserts at 497 × 498 km and is accepted.
export const BEYOND_CAPABILITY: Record<string, string> = {};
fill(BEYOND_CAPABILITY,
  'Blok I is 543-587 m/s short of the mission under a Fregat and 7.80 t: the ascent sags and breaks up at T+936 s with 1.0 km/s left in the Fregat, which cannot fly an ascent',
  'soyuz21b/leo/90', 'soyuz21b/iss/90');
fill(BEYOND_CAPABILITY,
  'the three Proton stages are 548-1206 m/s short under a Briz-M and 11.5-20.7 t: the ascent flattens and the 19.6 kN Briz-M cannot hold 30 t up, break-up at T+780-1038 s',
  'protonm/leo/50', 'protonm/leo/90', 'protonm/iss/50', 'protonm/iss/90');
fill(BEYOND_CAPABILITY,
  'URM-1/URM-2 are 735-1533 m/s short under a Briz-M and 12.3-22 t: the gravity turn cannot be held at 0.3 deg/s (the q-alpha placard leaves 4 deg of authority at 27 kPa), the trajectory flattens at 32 km and the vehicle breaks up by T+146-202 s',
  'angaraa5/leo/50', 'angaraa5/leo/90', 'angaraa5/sso/50', 'angaraa5/sso/90');
fill(BEYOND_CAPABILITY,
  'second stage empty at T+533 s, still suborbital at -848 to -365 x 220-225 km (the published 22.8 t is for a ~200 km orbit, this preset is 420-500 km, and the +399/+563 m/s of ideal margin is what the losses eat)',
  'falcon9/leo/90', 'falcon9/iss/90');
fill(BEYOND_CAPABILITY,
  'second stage empty after raising the apogee to 21 404 km of the 35 786 km target',
  'falcon9/gto/90');
fill(BEYOND_CAPABILITY,
  'second stage empty at T+585 s, still suborbital at -1 437 to -1 096 x 164-380 km (-176/-341 m/s of margin)',
  'falconheavy/leo/90', 'falconheavy/iss/90');
fill(BEYOND_CAPABILITY,
  'second stage empty at a 15 484 km apogee of the 35 786 km target (-485 m/s)',
  'falconheavy/gto/90');
fill(BEYOND_CAPABILITY,
  'PS1-PS4 run dry at T+908 s, suborbital at -537 x 235 km: +523 m/s of ideal margin and none of it left, which is what a four-stage solid/liquid stack with this much drag spends',
  'pslvxl/leo/90');
fill(BEYOND_CAPABILITY,
  'PS4 is a 7.3 kN stage: it runs dry at a 26 287 km apogee (50 %, +346 m/s) and a 9 650 km one (90 %, -414 m/s)',
  'pslvxl/gto/50', 'pslvxl/gto/90');
fill(BEYOND_CAPABILITY,
  'ship empty at a 31 635 km apogee of the 35 786 km target',
  'starship/gto/90');
// Long March 2D is rated 3 500 kg to a ~200 km LEO and 1 300 kg to a
// sun-synchronous one; at 90 % of those the second stage runs dry short of the
// orbit. Its lower fractions are an ARCHITECTURE limit, not a capability one.
fill(BEYOND_CAPABILITY,
  'second stage empty at T+289 s at 148 x 314 km (LEO) and 14 x 276 km (ISS plane)',
  'longmarch2d/leo/90', 'longmarch2d/iss/90');
// Electron, H3, Long March 5, Long March 3B/E, Vega-C, Atlas V 551,
// Vulcan, Ariane 64 and H-IIA 202 have no capability exclusion at all.

// ---------------------------------------------------------------------------
// 3. Architectural limits: propellant left, orbit reachable, nothing in the
// stack that can use it.
//
// Both entries are single-shot stacks - no restartable stage anywhere - flown
// with the INERT dispenser, so the orbit the ascent cuts off in is final.
//
// The model flies single-burn direct insertion (see the
// `single-shot direct insertion` section below and DIRECT_INSERTION_CEILING in
// src/physics/mission.ts): a stack with no restart is aimed at the mission's
// own circular orbit and cuts off ON it, and Soyuz-2.1a with an inert payload
// reaches 197.2-198.7 x 200.1-200.6 km with 0.4-2.7 km/s still in the Blok I
// where it used to burn on to 197 x 695 km and be reported off target.
//
// What that does not change is the altitude band the profile closes in, which
// is a property of the trajectory and not of the planner. A continuous burn can
// only cut off circular at an altitude it ARRIVES at with its horizontal speed
// still short of orbital; past that point every further second of thrust raises
// the apoapsis instead of the vehicle. The measured grid is in the doc comment
// on `single-shot direct insertion` below — one table, not three copies of it.
//
// The matrix asks for 420-600 km circular orbits, three times past where the
// profile closes, so both stacks are aimed at the transfer orbit they CAN fly
// accurately, reach 197-200 x 417-606 km with 0.3-2.6 km/s left and end off
// target. That is what these vehicles do in reality too, which is why the real
// ones fly a Fregat, a Briz-M or a second-stage vernier phase this model does
// not have.
export const ARCHITECTURE: Record<string, string> = {};
fill(ARCHITECTURE,
  'inserts at 200 x 417-499 km with 0.3-2.6 km/s left in the Blok I: no restart, no kick stage and an inert payload, so nothing can raise the perigee (direct insertion closes at 200 km, not at 420-500 km)',
  'soyuz21a/leo/25', 'soyuz21a/leo/50', 'soyuz21a/leo/90',
  'soyuz21a/iss/25', 'soyuz21a/iss/50', 'soyuz21a/iss/90');
fill(ARCHITECTURE,
  'inserts at 197-199 x 417-603 km with 0.4-1.0 km/s left in the second stage: two hypergolic stages, no restart, and an inert payload',
  'longmarch2d/leo/25', 'longmarch2d/leo/50',
  'longmarch2d/iss/25', 'longmarch2d/iss/50',
  'longmarch2d/sso/25', 'longmarch2d/sso/50', 'longmarch2d/sso/90');

// ---------------------------------------------------------------------------
// 4. Guidance defects: delta-v available, a stage able to spend it, and the
// orbit still missed. These are the remaining scope of the guidance work, not
// capability statements.
//
// FOUR entries, and the history of the number matters as much as the number.
//
// Two waves have now reported this table wrongly, in opposite directions, and
// both mistakes were arithmetic on the table rather than measurements of a
// flight:
//
//   - The wave before last reported "six down to three". None of the three it
//     left (atlasv551/iss/50, vulcan/iss/50, h2a202/iss/90) had ever been in
//     it: six entries left the table and three DIFFERENT rows, which had passed
//     the looser pre-wave gate, were broken by the same change and then filed
//     as residual scope. The honest count for that wave was "six left the
//     table, three introduced".
//   - The last wave reported "six closed, table empty". Four were closed. The
//     other two — vulcan/leo/90 and vulcan/iss/90 — were MOVED into
//     BEYOND_CAPABILITY, and the note that moved them dropped the measured
//     '+646/+743 m/s of margin' that had made them defects in the first place.
//     They still break up with 2.7-2.9 km/s aboard. The honest count was "four
//     closed, two reclassified", and the reclassification was wrong.
//
// What really closed, and stays closed: the four transfer-orbit entries
// (soyuz21b/gto/90, protonm/gto/50, vulcan/gto/25 and /50, all 'perigee 60-126
// km high'), because the perigee test in planBurns is two-sided, so an
// insertion that overshoots is trimmed at apogee instead of being declared on
// target.
//
// And the three REGRESSIONS the wave before last introduced are closed too. The
// cause was a single line of scheduling rather than anything about those
// vehicles (see `scheduleNextBurn`'s `atU === 'asap'` guard and the coast
// pre-orient in src/physics/simulation.ts):
//
//   atlasv551/iss/50  420 x 480 km, three burns, 4.4 h  ->  420.1 x 421.8 km, evt.targetOrbit T+7 617 s
//   vulcan/iss/50     440 x 3 073 km, five burns, ends in coast
//                                                       ->  419.1 x 421.9 km, evt.targetOrbit T+8 707 s
//   h2a202/iss/90     420 x 436 km, three burns, 3.9 h  ->  420.5 x 421.8 km, evt.targetOrbit T+5 792 s
//
// The four entries below are what is left, and all four arrive here the same
// way: the fleet gate now CHECKS the BEYOND_CAPABILITY rule instead of stating
// it, and these are the rows that failed the check. Each one has the delta-v on
// paper (`ascentMargin`, measured against the shipped ASCENT_LOSS_ALLOWANCE)
// and a stage able to spend it, and each one is destroyed short of orbit. That
// is the definition of this table.
//
// They share one signature, which is why they are listed together: a heavy
// upper stage lighting at a fraction of a g under a near-maximum payload, a
// closed-loop ascent that cannot hold the loft it was given, and a break-up on
// the max-Q placard on the way back down. The previous wave's sweep is on the
// record and reproduces — no kick angle, turn rate, loft or pitch limit in the
// tuning grid recovers them — which makes the fix a profile that trades the
// loft for horizontal speed at staging, not another point in the same grid.
// That is a wave's worth of guidance work, and it is scope, not a capability
// statement about Vulcan, Ariane 64 or PSLV.
export const KNOWN_GUIDANCE_FAILURES: Record<string, string> = {};
fill(KNOWN_GUIDANCE_FAILURES,
  'Centaur V lights at 0.29 g under 19.26 t and the lofted arc falls back before it reaches orbital speed: break-up at T+830-882 s with 3.4-3.6 km/s left and +2 383/+2 547 m/s of ideal ascent margin',
  'vulcan/leo/90', 'vulcan/iss/90');
fill(KNOWN_GUIDANCE_FAILURES,
  'the Vulcain core hands Vinci a sagging trajectory with 19.44 t aboard: break-up at T+941 s at -2 219 x 92 km with 1.7 km/s left and +1 855 m/s of margin (the 500 km case at the same mass is accepted, 497 x 497 km, which is what rules out a capability explanation)',
  'ariane64/iss/90');
fill(KNOWN_GUIDANCE_FAILURES,
  'PS4 is still 971 m/s deep with +315 m/s of ideal margin when the stack breaks up at T+568 s at -2 893 x 231 km; the same payload to the 500 km preset instead runs the tanks dry, which is a capability limit and is filed as one',
  'pslvxl/iss/90');

export const EXCLUDED: Record<string, string> = {
  ...SITE_GEOMETRY, ...BEYOND_CAPABILITY, ...ARCHITECTURE, ...KNOWN_GUIDANCE_FAILURES,
};

export function fleetCases(): ReturnType<typeof allCases> {
  return allCases().filter((c) => !EXCLUDED[caseKey(c)]);
}
