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
import { RAD, G0 } from '../src/physics/constants';

export const LAUNCH_TIME = new Date(Date.UTC(2026, 8, 15, 12, 0, 0));
export const FRACTIONS = [0.25, 0.5, 0.9];

/**
 * Accuracy the fleet is held to. Circular targets: the apsides must land within
 * 10 km or 2 %. Elliptical (transfer) targets: the apogee within the same band,
 * and the perigee within a wider but strictly two-sided one — the model inserts
 * a transfer orbit with a perigee up to about 36 km above the reference (see
 * `docs/PHYSICS.md`, "Insertion accuracy"), which a real GTO injection holds to
 * a few kilometres. The band is the measured accuracy, not an alibi: anything
 * outside it is listed in `KNOWN_GUIDANCE_FAILURES` with its measured error.
 */
export const APSIS_TOLERANCE = (h: number): number => Math.max(10e3, 0.02 * h);
export const TRANSFER_PERIGEE_TOLERANCE = (h: number): number => Math.max(40e3, 0.15 * h);

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
 * range-safety minimum inclination allows 51.64°, `sso` for everybody (a site
 * whose azimuth window forbids the retrograde launch is excluded by name in
 * the test's `SITE_GEOMETRY` table, so the exclusion is visible next to all the
 * others instead of silently shrinking the matrix), and `gto` where the vehicle
 * has a published GTO capability.
 */
export function allCases(): FleetCase[] {
  const out: FleetCase[] = [];
  for (const v of VEHICLES) {
    const site = siteById(v.sites[0]);
    const orbits = ['leo'];
    if (site.minInclination <= 51.64) orbits.push('iss');
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
  const cfg: MissionConfig = {
    vehicleId: c.vehicle, satelliteId, siteId: c.site, orbit: orbitById(c.orbit),
    launchTime: LAUNCH_TIME,
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

  const t = sim.plan.target;
  const el = sim.state.elements;
  const elliptical = t.apogee - t.perigee > 50e3;
  // On a transfer orbit the perigee band is wider than on a circular one (see
  // TRANSFER_PERIGEE_TOLERANCE) but it is two-sided: over-performing into a
  // 120 km high perigee is as much a miss as under-performing.
  const peTol = elliptical ? TRANSFER_PERIGEE_TOLERANCE(t.perigee) : APSIS_TOLERANCE(t.perigee);
  if (Math.abs(el.periapsisAlt - t.perigee) > peTol) {
    out.push(`perigee ${Math.round(el.periapsisAlt / 1e3)} vs ${Math.round(t.perigee / 1e3)} km`);
  }
  if (Math.abs(el.apoapsisAlt - t.apogee) > APSIS_TOLERANCE(t.apogee)) {
    out.push(`apogee ${Math.round(el.apoapsisAlt / 1e3)} vs ${Math.round(t.apogee / 1e3)} km`);
  }
  if (Math.abs(el.i - t.inclination) * RAD > 0.3) {
    out.push(`inclination ${(el.i * RAD).toFixed(2)}° vs ${(t.inclination * RAD).toFixed(2)}°`);
  }
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
