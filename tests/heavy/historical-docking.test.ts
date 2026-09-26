/**
 * C01: the two historical Soyuz flights to the station, launched at their
 * real second into the station's measured plane (`issRaanAt`'s TLE anchors),
 * flown on to contact and set against the real docking. The profiles are
 * G07's (tests/heavy/rendezvous.test.ts), copied from other flights, so the
 * margin is the profile's own spread: the four-orbit one is Soyuz TMA-19M's
 * 6 h 21 min, where MS-16 was planned for 6 h 11 min and its crew, cutting the
 * stationkeeping short, docked at 6 h 08 min. docs/PHYSICS.md §13.
 *
 * | Flight | Contact, model | Contact, flight |
 * |---|---|---|
 * | Soyuz MS-16 | 6:29 | 6:08:15 |
 * | Soyuz MS-25 | 2 d 02:37 | 2 d 02:26:39 |
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../../src/physics/simulation';
import { vehicleById } from '../../src/data/vehicles';
import { guidanceForVehicle } from '../../src/physics/defaults';
import { watchMissionById, watchMissionSettings, type WatchMissionId } from '../../src/ui/watch-missions';
import { compareEvents } from '../../src/ui/flown';

/** How far from the real docking, minutes: the profile's spread and, for MS-16, the ten minutes its plan was shorter. */
const MINUTES: Record<string, number> = { soyuzMs16: 25, soyuzMs25: 20 };

describe('historical flights to the station', () => {
  it.each(['soyuzMs16', 'soyuzMs25'] as WatchMissionId[])('%s docks close to the real docking', { timeout: 900_000 }, (id) => {
    const s = watchMissionSettings(id);
    const sim = new Simulation({
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime,
      payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
      failure: s.failure, boosterRecovery: false, rendezvous: s.rendezvous, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
    }, { headless: true });
    let guard = 0;
    while (!sim.done && sim.state.t < 60 * 3600 && guard++ < 5e6) sim.step(sim.suggestedDt());
    expect(sim.state.note).toBe('docked');
    const contact = compareEvents(watchMissionById(id)!.flown!, sim.events).find((r) => r.key === 'evt.contact')!;
    expect(contact.sim).not.toBeNull();
    expect(Math.abs(contact.delta!) / 60, `model ${(contact.sim! / 60).toFixed(1)} min, flown ${(contact.real / 60).toFixed(1)} min`).toBeLessThan(MINUTES[id]);
  });
});
