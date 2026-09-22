/**
 * The launches the viewer offers must fly.
 *
 * Someone watching without any background has no way to tell a model limit
 * from a launch failure, so every viewer mission is flown here exactly as the
 * app builds it (the panel's guidance and flight model for that vehicle) until
 * it reaches orbit, and has to get there. The settings themselves are checked
 * too: valid, in daylight at the pad, and inside the site's range-safety
 * corridor.
 */
import { describe, expect, it } from 'vitest';
import { FEATURED_WATCH_MISSION, WATCH_MISSIONS, daylightLaunchTime, localSolarHour, watchMissionById, watchMissionSettings } from '../src/ui/watch-missions';
import { validateConfigInput } from '../src/config/validation';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { siteById } from '../src/data/sites';
import { orbitById } from '../src/data/orbits';
import { guidanceForVehicle } from '../src/physics/defaults';
import { azimuthAllowedFor, resolveTarget } from '../src/physics/mission';
import { defaultDynamics } from '../src/physics/rigid/config';
import { reachedOrbit } from '../src/ui/watch-logic';
import { captureFrame } from '../src/physics/frame';
import { en } from '../src/i18n/en';

const FROM = [new Date('2026-09-22T03:00:00Z'), new Date('2027-03-14T17:30:00Z')];

describe('viewer missions', () => {
  it('are unique, known to the dictionaries and include the featured launch', () => {
    const ids = WATCH_MISSIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(watchMissionById(FEATURED_WATCH_MISSION)).toBeDefined();
    for (const m of WATCH_MISSIONS) {
      expect(en[m.titleKey]).toBeTruthy();
      expect(en[m.blurbKey]).toBeTruthy();
      expect(vehicleById(m.vehicleId).sites).toContain(m.siteId);
    }
  });

  it.each(WATCH_MISSIONS.map((m) => m.id))('%s builds valid daylight settings inside the range corridor', (id) => {
    for (const from of FROM) {
      const s = watchMissionSettings(id, from);
      expect(validateConfigInput(s)).toEqual([]);
      expect(s.launchTime.getTime()).toBeGreaterThanOrEqual(from.getTime() - 60e3);
      const site = siteById(s.siteId);
      const h = localSolarHour(s.launchTime, site.longitude);
      expect(h).toBeGreaterThanOrEqual(8);
      expect(h).toBeLessThanOrEqual(16);
      const target = resolveTarget(s.orbit, site, s.launchTime);
      expect(azimuthAllowedFor(site, target.inclination)).toBe(true);
    }
  });

  it('launches a free-node orbit straight away when it is already day at the pad', () => {
    const noonAtCape = new Date('2026-09-22T17:20:00Z'); // ~12:00 local solar time at 80.6°W
    expect(daylightLaunchTime(orbitById('leo'), 'cape', noonAtCape).getTime()).toBe(noonAtCape.getTime());
    const nightAtCape = new Date('2026-09-22T06:00:00Z');
    const t = daylightLaunchTime(orbitById('leo'), 'cape', nightAtCape);
    expect(localSolarHour(t, siteById('cape').longitude)).toBeCloseTo(10, 0);
  });

  it.each(WATCH_MISSIONS.map((m) => m.id))('%s reaches orbit as the app flies it', { timeout: 600_000 }, (id) => {
    const s = watchMissionSettings(id, FROM[0]);
    const dynamics = defaultDynamics(s.vehicleId);
    const sim = new Simulation({
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit,
      launchTime: s.launchTime, payloadMassOverride: s.payloadMass,
      guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, dynamics.model), guidanceResolved: true,
      failure: s.failure, boosterRecovery: false, dynamics,
    }, { headless: true });
    let guard = 0;
    let orbit = false;
    while (!sim.done && !sim.isFailed() && sim.state.t < 1800 && guard++ < 400000) {
      sim.step(sim.suggestedDt());
      if (sim.state.status === 'orbit' || sim.events.some((e) => e.key === 'evt.parkingOrbit' || e.key === 'evt.targetOrbit')) {
        orbit = reachedOrbit(captureFrame(sim), sim.events);
        if (orbit) break;
      }
    }
    expect(sim.isFailed()).toBe(false);
    expect(orbit).toBe(true);
  });
});
