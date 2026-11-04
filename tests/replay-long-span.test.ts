/**
 * Long recordings, replayed: what thinning a recording past its frame budget
 * leaves between two frames, and how the replay draws it.
 *
 * - A spacecraft docked for hours. The recorder's last coast pass halved every
 *   coast frame each time it ran, with no gap limit, so the oldest docked
 *   frames ended up hours apart while the newest were a minute apart. A six-DOF
 *   Soyuz MS docked for 12,000 s kept one docked span of 7,981 s (1.5 orbits):
 *   the spacecraft took the straight line there, 9,271 km off its orbit, and
 *   the station took the cubic, 14,945 km from the spacecraft. The pass now
 *   stops at a frame every ten minutes (`MAX_COAST_GAP`, src/replay/recorder.ts),
 *   and the station takes the spacecraft's own blend (`interpolateFrames`).
 * - Apollo's command module, whose status stays 'orbit' to the water. Its entry
 *   was recorded every 30 s and thinned with the coast; the cubic, which
 *   Apollo takes at any span, drew it 200 m off at 60 s under its mains, which
 *   slow it for 10–12 s after they open, 1.2 km at 240 s. An orbit inside the
 *   air is now recorded every 2 s, as a coast there is, and thinned with the
 *   dense flight, not the coast.
 *
 * Both are point-mass flights, which take seconds: a point-mass docked
 * spacecraft carries the rendezvous's rigid telemetry and is blended as a
 * six-DOF one is, and the six-DOF frame budget is matched by a smaller one.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { guidanceForVehicle } from '../src/physics/defaults';
import { vehicleById } from '../src/data/vehicles';
import { watchMissionSettings, type WatchMissionId } from '../src/ui/watch-missions';
import { FlightRecorder } from '../src/replay/recorder';
import { ReplayPlayer } from '../src/replay/player';
import { dist, type Vec3 } from '../src/physics/vec3';

function flight(id: WatchMissionId): Simulation {
  const s = watchMissionSettings(id);
  return new Simulation({
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
    payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
    failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
    ...(s.rendezvous ? { rendezvous: s.rendezvous } : {}),
  }, { headless: true });
}
const at = (sim: Simulation, key: string) => sim.events.find((e) => e.key === key)?.t;

describe('a long recording, thinned and replayed', () => {
  it('keeps a spacecraft docked for ten hours on the station\'s port and near its orbit', { timeout: 120_000 }, () => {
    // Soyuz MS docking (two-orbit profile), 36,000 s past the docking, in 3,000 frames: the rendezvous holds most
    // of them. The last coast pass left one docked span of 20,505 s, where the spacecraft was drawn 12,411 km off
    // its orbit and the station 33,107 km from it.
    const sim = flight('soyuzMsDocking'), rec = new FlightRecorder(3000);
    rec.start(sim);
    const flown: { t: number; r: Vec3; station: Vec3 }[] = [];
    let docked: number | undefined;
    while (!sim.isFailed() && (docked === undefined || sim.state.t < docked + 36000)) {
      rec.advance(docked === undefined ? 60 : 10, 1e6);
      docked ??= at(sim, 'evt.docked');
      if (docked !== undefined && sim.state.rendezvous) flown.push({ t: sim.state.t, r: { ...sim.state.r }, station: { ...sim.state.rendezvous.station.r } });
    }
    expect(docked).toBeDefined();
    expect(rec.stats().decimations).toBeGreaterThan(0);
    expect(rec.frames.length).toBeLessThanOrEqual(3000);
    const frames = rec.frames.filter((f) => f.t >= docked!);
    expect(Math.max(...frames.slice(1).map((f, i) => f.t - frames[i].t))).toBeLessThanOrEqual(600 + 1e-6);
    const player = new ReplayPlayer(rec);
    let worst = 0;
    for (const x of flown) {
      if (x.t > rec.headTime) break;
      const f = player.frameAt(x.t)!;
      // on the port: the spacecraft's centre 18 m from the station's, as flown
      expect(Math.abs(dist(f.r, f.rendezvous!.station.r) - dist(x.r, x.station)), `T+${x.t}`).toBeLessThan(0.5);
      worst = Math.max(worst, dist(f.r, x.r));
    }
    // the cubic over ten minutes of a low orbit: kilometres, where the chord was thousands of them
    expect(worst).toBeLessThan(5e3);
  });

  it('draws Apollo\'s command module under its mains where it flew, its recording thinned after the entry', { timeout: 120_000 }, () => {
    // Point-mass Apollo 11 to the water, then four hours on it: the recording, 12,000 frames, is thinned after the
    // entry. The command module's status stays 'orbit' from the entry interface to the water.
    const sim = flight('apollo11'), rec = new FlightRecorder();
    rec.start(sim);
    while (at(sim, 'evt.cmSmSeparation') === undefined) rec.advance(3600, 1e6);
    const flown: { t: number; r: Vec3 }[] = [];
    while (sim.state.status !== 'landed') { rec.advance(0.5, 1e6); flown.push({ t: sim.state.t, r: { ...sim.state.r } }); }
    const splash = sim.state.t, thinned = rec.stats().decimations;
    while (sim.state.t < splash + 4 * 3600) rec.advance(600, 1e6);
    // thinned again after the entry
    expect(rec.stats().decimations).toBeGreaterThan(thinned);
    const ei = at(sim, 'evt.entryInterface')!, mains = at(sim, 'evt.mains')!;
    const air = rec.frames.filter((f) => f.t > ei && f.t <= splash);
    expect(Math.max(...air.slice(1).map((f, i) => f.t - air[i].t))).toBeLessThanOrEqual(2 + 1e-6);
    const player = new ReplayPlayer(rec);
    let underMains = 0, entry = 0;
    for (const x of flown) {
      if (x.t <= ei || x.t >= splash) continue;
      const off = dist(player.frameAt(x.t)!.r, x.r);
      if (x.t > mains) underMains = Math.max(underMains, off); else entry = Math.max(entry, off);
    }
    // under the mains, where the cubic over a thinned 60 s span was 200 m off and the line 150 m
    expect(underMains).toBeLessThan(5);
    // and through the entry, where it was 386 m off on its 30 s spans and 2.3 km once they were thinned
    expect(entry).toBeLessThan(20);
  });
});
