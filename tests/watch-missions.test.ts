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

  // G06: the launch aborts end with the crew under their parachutes, not in orbit
  const ABORT_MODES: Record<string, string> = { soyuzMs10: 'fairing', soyuzT10: 'tower', soyuz18a: 'separation' };
  it.each(WATCH_MISSIONS.filter((m) => m.failure).map((m) => m.id))('%s meets its failure and fires the escape system the way its crew did', { timeout: 300_000 }, (id) => {
    const s = watchMissionSettings(id, FROM[0]);
    const dynamics = defaultDynamics(s.vehicleId);
    const sim = new Simulation({
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit,
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

  it.each(WATCH_MISSIONS.filter((m) => !m.failure).map((m) => m.id))('%s reaches its target as the app flies it, and lands what it flies home', { timeout: 900_000 }, (id) => {
    const s = watchMissionSettings(id, FROM[0]);
    const dynamics = defaultDynamics(s.vehicleId);
    const sim = new Simulation({
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit,
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
  });
});
