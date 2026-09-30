/**
 * The viewer missions' flights, shared by tests/watch-missions-flights-*.test.ts.
 *
 * Every launch the viewer offers is flown here exactly as the app builds it
 * (the panel's guidance and six-DOF flight model for that vehicle): the three
 * launch aborts up to the escape system's firing, every other mission to its
 * target, with each stage it flies home landed. The cheap checks of the
 * missions' settings stay in tests/watch-missions.test.ts.
 *
 * Why the flights are spread over several files: vitest runs files in
 * parallel but the tests inside one file one after another, so the flights
 * in a single file (about 16 minutes on a CI runner) were one worker's work
 * and held a whole CI shard past its time limit. `FLIGHT_GROUPS` gives each
 * file its missions, grouped by measured flight time; the group names are
 * the files' names, chosen so vitest's shard split (files ordered by the
 * SHA-1 of their path) spreads them over the three CI shards.
 * tests/watch-missions.test.ts checks that the groups hold every mission
 * exactly once, so a mission added without a group fails there.
 */
import { expect, it } from 'vitest';
import { WATCH_MISSIONS, watchMissionById, watchMissionSettings, type WatchMissionId } from '../src/ui/watch-missions';
import { Simulation } from '../src/physics/simulation';
import { HISTORICAL_VEHICLES, vehicleById } from '../src/data/vehicles';
import { guidanceForVehicle } from '../src/physics/defaults';
import { defaultDynamics } from '../src/physics/rigid/config';
import { reachedOrbit } from '../src/ui/watch-logic';
import { captureFrame } from '../src/physics/frame';
import { compareEvents, simPayloadOrbit } from '../src/ui/flown';

/** The days the missions' settings are built from; the flights launch from the first. */
export const FROM = [new Date('2026-09-22T03:00:00Z'), new Date('2027-03-14T17:30:00Z')];

/**
 * Which file flies which mission: `FLIGHT_GROUPS.x` is flown by
 * tests/watch-missions-flights-x.test.ts. Each group is at most about 230 s
 * on a 4-core development machine (about 185 s on a GitHub runner), from the
 * flight times measured one after another in a single file (in s, locally):
 * falconHeavyArabsat 192, angaraA5Flight1 115, ariane6AmazonLeo 109,
 * h2aHayabusa2 86, falcon9Bandwagon 78, starshipFlight5 77, falcon9Demo2 74,
 * falcon9Orbcomm2 69, vostok1 65, apollo11 62, soyuzMsDocking 48,
 * soyuzIss 47, soyuzMs25 46, soyuzMs16 44, electronSso 44, soyuz18a 31,
 * sputnik1 22, soyuzMs10 16, mr3 2, soyuzT10 0.1. The letters are not
 * meaningful: they are the names whose SHA-1 places the files so the three
 * shards get about the same work; a new test file anywhere shifts vitest's
 * shard boundaries, so re-check the balance when the CI times drift apart.
 */
export const FLIGHT_GROUPS = {
  a: ['falconHeavyArabsat', 'soyuz18a', 'mr3'], // ~225 s
  f: ['ariane6AmazonLeo', 'soyuzMs16', 'vostok1'], // ~218 s
  g: ['soyuzMs25', 'falcon9Orbcomm2', 'angaraA5Flight1'], // ~230 s
  s: ['soyuzIss', 'electronSso', 'soyuzMs10'], // ~107 s
  v: ['falcon9Bandwagon', 'soyuzMsDocking', 'falcon9Demo2', 'sputnik1'], // ~223 s
  z: ['starshipFlight5', 'soyuzT10', 'apollo11', 'h2aHayabusa2'], // ~225 s
} as const satisfies Record<string, readonly WatchMissionId[]>;

export type FlightGroup = keyof typeof FLIGHT_GROUPS;

const missions = (ids: readonly WatchMissionId[]) => WATCH_MISSIONS.filter((m) => ids.includes(m.id));

// G06: the launch aborts end with the crew under their parachutes, not in orbit
const ABORT_MODES: Record<string, string> = { soyuzMs10: 'fairing', soyuzT10: 'tower', soyuz18a: 'separation' };

/**
 * Registers every flight of `FLIGHT_GROUPS[group]`: the aborts of its launch
 * failures and the flights of its other missions to their targets. Each
 * tests/watch-missions-flights-x.test.ts is this one call for group x, so a
 * file cannot fly only part of its group; tests/watch-missions.test.ts checks
 * that every file makes its call.
 */
export function flyGroup(group: FlightGroup): void {
  flyFailures(FLIGHT_GROUPS[group]);
  flyToTarget(FLIGHT_GROUPS[group]);
}

/** Registers the abort flight of each of `ids` that is a launch failure. */
function flyFailures(ids: readonly WatchMissionId[]): void {
  const failing = missions(ids).filter((m) => m.failure).map((m) => m.id);
  if (failing.length === 0) return;
  it.each(failing)('%s meets its failure and fires the escape system the way its crew did', { timeout: 300_000 }, (id) => {
    const s = watchMissionSettings(id, FROM[0]);
    const dynamics = defaultDynamics(s.vehicleId);
    const sim = new Simulation({
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, padId: s.padId,
      launchTime: s.launchTime, payloadMassOverride: s.payloadMass,
      guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, dynamics.model), guidanceResolved: true,
      failure: s.failure, boosterRecovery: s.boosterRecovery, recoveryPlan: s.recoveryPlan, dynamics,
    }, { headless: true });
    // up to the abort; the crews' flights home are in tests/launch-abort.test.ts and tests/heavy/soyuz-aborts.test.ts
    let guard = 0;
    while (!sim.state.abort && !sim.isFailed() && sim.state.t < 600 && guard++ < 400000) sim.step(sim.suggestedDt());
    expect(sim.state.abort?.mode).toBe(ABORT_MODES[id]);
    expect(sim.isFailed()).toBe(false);
  });
}

/** Registers the flight to its target of each of `ids` that is not a launch failure. */
function flyToTarget(ids: readonly WatchMissionId[]): void {
  const flying = missions(ids).filter((m) => !m.failure).map((m) => m.id);
  if (flying.length === 0) return;
  it.each(flying)('%s reaches its target as the app flies it, and lands what it flies home', { timeout: 900_000 }, (id) => {
    const s = watchMissionSettings(id, FROM[0]);
    const dynamics = defaultDynamics(s.vehicleId);
    const sim = new Simulation({
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, padId: s.padId,
      launchTime: s.launchTime, payloadMassOverride: s.payloadMass,
      guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, dynamics.model), guidanceResolved: true,
      failure: s.failure, boosterRecovery: s.boosterRecovery, recoveryPlan: s.recoveryPlan, dynamics,
    }, { headless: true });
    const suborbital = !!s.orbit.suborbital;
    let guard = 0;
    let there = false;
    while (!sim.done && !sim.isFailed() && sim.state.t < 1800 && guard++ < 400000) {
      sim.step(sim.suggestedDt());
      if (suborbital) {
        // Flight 5's ship is cut off on its way home; the splashdown is flown
        // in tests/heavy/starship-flight5.test.ts.
        if (sim.events.some((e) => e.key === 'evt.suborbitalTarget')) { there = true; break; }
      } else if (sim.state.status === 'orbit' || sim.events.some((e) => e.key === 'evt.parkingOrbit' || e.key === 'evt.targetOrbit')) {
        there = reachedOrbit(captureFrame(sim), sim.events);
        if (there) break;
      }
    }
    expect(sim.isFailed()).toBe(false);
    expect(there).toBe(true);
    // Every stage flown home comes down where it was sent.
    const home = () => sim.debris.filter((d) => d.recovery?.target);
    expect(home().length).toBe(s.recoveryPlan ? [s.recoveryPlan.core, ...(s.recoveryPlan.boosters ?? [])].filter(Boolean).length : 0);
    const until = sim.state.t + 900;
    while (home().some((d) => d.alive) && sim.state.t < until && !sim.isFailed()) sim.step(sim.suggestedDt());
    for (const d of home()) {
      expect(d.outcome, `${d.name} → ${d.recovery!.target!.id}`).toBe('landed');
      expect(d.recovery!.missDistance!).toBeLessThan(d.recovery!.target!.radius);
    }
    // C01: a historical flight's ascent happens as flown, give or take the
    // model's own guidance — within a minute, or 30 % of the time flown
    const flown = watchMissionById(id)!.flown;
    for (const row of flown ? compareEvents(flown, sim.events) : []) {
      if (['evt.maxQ', 'evt.boosterSep', 'evt.fairingSep', 'evt.meco'].includes(row.key) || (row.key === 'evt.stageSep' && row.n === 1)) {
        expect(row.sim, `${id} ${row.key}`).not.toBeNull();
      }
      if (row.delta !== null) expect(Math.abs(row.delta), `${id} ${row.key} ${row.n}`).toBeLessThan(Math.max(60, 0.3 * row.real));
    }
    // …and the vehicles of historical flights, flown only for them, reach the flown orbit
    if (flown?.orbit && HISTORICAL_VEHICLES.some((v) => v.id === s.vehicleId)) {
      // the reported orbit, or where the stage is now if the loop stopped before separation
      const el = sim.state.elements;
      const orbit = simPayloadOrbit(sim.events) ?? { perigee: el.periapsisAlt / 1000, apogee: el.apoapsisAlt / 1000 };
      expect(Math.abs(orbit.perigee - flown.orbit.perigee), id).toBeLessThan(25);
      expect(Math.abs(orbit.apogee - flown.orbit.apogee) / flown.orbit.apogee, id).toBeLessThan(0.15);
    }
  });
}
