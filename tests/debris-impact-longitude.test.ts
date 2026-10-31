/**
 * Where a spent body came down: `Debris.impact`, the latitude and longitude
 * the telemetry panel's spent-stage list and the map show for it, and the
 * `lat`/`lon` of its `evt.stageImpact`.
 *
 * The longitude is the body's inertial position at contact, taken round with
 * Greenwich's sidereal angle at the contact time (`restT`). The two contacts
 * `stepDebris` finds part-way through a step took the angle of another
 * instant:
 * - a passive point mass, in `stepDebris`'s sub-steps, took `state.theta`,
 *   which `Simulation.step` updates only after `stepDebris` returns, so the
 *   angle at the step's start;
 * - a six-DOF body's contact (`RigidDebrisRuntime.step`'s `contactTime`) took
 *   the angle at the step's end.
 * While the vehicle coasts or orbits a step is 10–30 s (60 s in a point-mass
 * coast above 2,000 km), so the longitude was up to OMEGA_EARTH × 30 s ≈
 * 0.125° off (0.25° in a 60 s step), 0.07° (about 5 km) on the watch missions.
 * Found in PR #195 (its report docs/development/reports/replay-debris-touchdown.md,
 * on #195's branch until it merges, "Not changed, for later"); report:
 * docs/development/reports/debris-impact-longitude.md.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Simulation, type Debris } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { guidanceForVehicle } from '../src/physics/defaults';
import { defaultDynamics } from '../src/physics/rigid/config';
import { eciToLatLon } from '../src/physics/orbital';
import { OMEGA_EARTH, RAD } from '../src/physics/constants';
import { RigidDebrisRuntime } from '../src/physics/rigid/debris-runtime';
import type { Vec3 } from '../src/physics/vec3';
import type { DynamicsConfig } from '../src/types';
import { watchMissionSettings, type WatchMissionId } from '../src/ui/watch-missions';

/** The day the viewer missions' settings are built from, as tests/watch-missions-flights.ts builds them. */
const FROM = new Date('2026-09-22T03:00:00Z');

/** Longitude difference, degrees, wrapped to (−180, 180]. */
const dLon = (a: number, b: number) => ((a - b + 540) % 360) - 180;

/** A body that came down, with the step it came down in. */
interface Contact {
  d: Debris;
  /** the contact's inertial position and mission time */
  r: Vec3;
  t: number;
  /** the step it came down in: its start and end, and the vehicle's status during it */
  from: number;
  to: number;
  status: string;
}

function mission(id: WatchMissionId, dynamics: DynamicsConfig): Simulation {
  const s = watchMissionSettings(id, FROM);
  return new Simulation({
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, padId: s.padId,
    launchTime: s.launchTime, payloadMassOverride: s.payloadMass,
    guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, dynamics.model), guidanceResolved: true,
    failure: s.failure, boosterRecovery: s.boosterRecovery, recoveryPlan: s.recoveryPlan, dynamics,
  }, { headless: true });
}

/**
 * Fly `sim` one `suggestedDt` step at a time until `until` holds or `limit`
 * s, keeping each body that comes down with the step it came down in. A
 * point mass's contact position and time are its own `r` and `restT`
 * (a crash is left where it hit); a six-DOF body's are the rigid runtime's
 * `contact.r` and `contactTime`, kept by `rigidContacts`.
 */
function fly(sim: Simulation, until: (contacts: Contact[]) => boolean, limit: number,
  rigidContacts?: Map<number, { r: Vec3; t: number }>): Contact[] {
  const contacts: Contact[] = [];
  const seen = new Set<number>();
  let guard = 0;
  while (!sim.isFailed() && sim.state.t < limit && guard++ < 2_000_000 && !until(contacts)) {
    const from = sim.state.t, status = sim.state.status;
    sim.step(sim.suggestedDt());
    for (const d of sim.debris) {
      if (d.alive || seen.has(d.id) || d.restT === undefined || !d.impact) continue;
      seen.add(d.id);
      const rigid = rigidContacts?.get(d.id);
      contacts.push({ d, r: rigid ? rigid.r : { ...d.r }, t: rigid ? rigid.t : d.restT, from, to: sim.state.t, status });
    }
  }
  return contacts;
}

/** The longitude at the contact, degrees: its position with the sidereal angle at its time. */
const lonAt = (sim: Simulation, c: Contact) => eciToLatLon(c.r, sim.plan.gmst0 + OMEGA_EARTH * c.t).lon * RAD;

describe('a spent body\'s impact longitude is taken at its contact time', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('a point mass that comes down part-way through an orbit step (Vostok-1: Blok A and the fairing)', () => {
    const sim = mission('vostok1', { model: 'pointMass', wind: 'calm', seed: 1 });
    const passive = (c: Contact) => !c.d.recovery && c.d.outcome === 'impact';
    const contacts = fly(sim, (cs) => cs.filter((c) => c.d.visual.kind === 'fairing').length >= 2, 2000).filter(passive);
    const blokA = contacts.find((c) => c.d.visual.kind === 'stage');
    const fairings = contacts.filter((c) => c.d.visual.kind === 'fairing');
    expect(blokA, 'Blok A came down').toBeDefined();
    expect(fairings).toHaveLength(2);
    for (const c of [blokA!, ...fairings]) {
      // the case this pins: an orbit step of 10–30 s with the contact well inside it
      expect(c.status, c.d.name).toBe('orbit');
      expect(c.to - c.from, c.d.name).toBeGreaterThanOrEqual(10);
      expect(c.t - c.from, c.d.name).toBeGreaterThan(1);
      expect(c.to - c.t, c.d.name).toBeGreaterThan(0.1);
      // as the step's start's angle had it: OMEGA_EARTH × (restT − start), 0.017° and 0.072° here
      expect(Math.abs(dLon(c.d.impact!.lon, lonAt(sim, c))), c.d.name).toBeLessThan(1e-6);
      expect(c.d.impact!.lat).toBeCloseTo(eciToLatLon(c.r, 0).lat * RAD, 9);
    }
    // the event carries the same place, to the list's two decimals
    const event = sim.events.find((e) => e.key === 'evt.stageImpact' && e.params?.name === blokA!.d.name)!;
    expect(event).toBeDefined();
    expect(event.params!.lat).toBe(+blokA!.d.impact!.lat.toFixed(2));
    expect(event.params!.lon).toBe(+blokA!.d.impact!.lon.toFixed(2));
  });

  it('a six-DOF core that comes down part-way through a held-coast step (Soyuz to the station: Blok A)', { timeout: 600_000 }, () => {
    // the rigid runtime's own contact: its lowest point, at its contact time
    const rigidContacts = new Map<number, { r: Vec3; t: number }>();
    const step = RigidDebrisRuntime.prototype.step;
    vi.spyOn(RigidDebrisRuntime.prototype, 'step').mockImplementation(function (this: RigidDebrisRuntime, time, dt, ground) {
      const result = step.call(this, time, dt, ground);
      if (result.contact && result.contactTime !== undefined) rigidContacts.set(this.debris.id, { r: { ...result.contact.r }, t: result.contactTime });
      return result;
    });
    const s = watchMissionSettings('soyuzIss', FROM);
    const sim = mission('soyuzIss', defaultDynamics(s.vehicleId));
    expect(sim.rigidRuntime, 'flown six-DOF, as the app flies it').toBeTruthy();
    const isBlokA = (c: Contact) => c.d.name === 'Blok A (core)';
    const blokA = fly(sim, (cs) => cs.some(isBlokA), 1500, rigidContacts).find(isBlokA);
    expect(blokA, 'Blok A came down').toBeDefined();
    const c = blokA!;
    expect(rigidContacts.has(c.d.id), 'by the rigid runtime').toBe(true);
    expect(c.d.outcome).toBe('impact');
    // a held coast: in six-DOF only a held-coast step is longer than a control tick
    expect(['coast', 'orbit']).toContain(c.status);
    expect(c.to - c.from).toBeGreaterThanOrEqual(10);
    expect(c.t - c.from).toBeGreaterThan(1);
    expect(c.to - c.t).toBeGreaterThan(1);
    // as the step's end's angle had it: OMEGA_EARTH × (end − contactTime), 0.024° here
    expect(Math.abs(dLon(c.d.impact!.lon, lonAt(sim, c)))).toBeLessThan(1e-6);
    expect(c.d.impact!.lat).toBeCloseTo(eciToLatLon(c.r, 0).lat * RAD, 9);
    const event = sim.events.find((e) => e.key === 'evt.stageImpact' && e.params?.name === c.d.name)!;
    expect(event).toBeDefined();
    expect(event.params!.lat).toBe(+c.d.impact!.lat.toFixed(2));
    expect(event.params!.lon).toBe(+c.d.impact!.lon.toFixed(2));
  });
});
