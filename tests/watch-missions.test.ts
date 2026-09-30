/**
 * The launches the viewer offers must fly.
 *
 * Someone watching without any background has no way to tell a model limit
 * from a launch failure, so every viewer mission is flown exactly as the app
 * builds it (the panel's guidance and flight model for that vehicle) until it
 * reaches orbit, and has to get there. The flights themselves are in
 * tests/watch-missions-flights-*.test.ts (helper tests/watch-missions-flights.ts),
 * several files because vitest runs files in parallel but a file's tests one
 * after another; this file checks that those files fly every mission exactly
 * once. The settings are checked here: valid, in daylight at the pad, and
 * inside the site's range-safety corridor.
 */
import { describe, expect, it } from 'vitest';
import { FEATURED_WATCH_MISSION, WATCH_MISSIONS, daylightLaunchTime, isHistorical, localSolarHour, watchMissionById, watchMissionSettings } from '../src/ui/watch-missions';
import { validateConfigInput } from '../src/config/validation';
import { vehicleById } from '../src/data/vehicles';
import { siteById } from '../src/data/sites';
import { orbitById } from '../src/data/orbits';
import { ascentInclinationFor, azimuthAllowedFor, launchWindows, resolveTarget } from '../src/physics/mission';
import { en } from '../src/i18n/en';
import { FLIGHT_GROUPS, FROM } from './watch-missions-flights';

// the flight files' text; `import.meta.glob` requires its options to be an inline object literal
const FLIGHT_FILES = import.meta.glob('./watch-missions-flights-*.test.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

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

  it.each(WATCH_MISSIONS.filter((m) => !isHistorical(m)).map((m) => m.id))('%s builds valid daylight settings inside the range corridor', (id) => {
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

  // C01: a historical flight launches at its own second, whatever the day
  it.each(WATCH_MISSIONS.filter(isHistorical).map((m) => m.id))('%s launches on its real date inside the range corridor', (id) => {
    const m = watchMissionById(id)!;
    for (const from of FROM) {
      const s = watchMissionSettings(id, from);
      expect(validateConfigInput(s)).toEqual([]);
      expect(s.launchTime.toISOString()).toBe(new Date(m.launchTime!).toISOString());
      const site = siteById(s.siteId);
      // the ascent's plane: Angara-A5 turns to the equator only at apogee
      expect(azimuthAllowedFor(site, ascentInclinationFor(resolveTarget(s.orbit, site, s.launchTime), site).inc)).toBe(true);
    }
  });

  // The station's node on those days is the measured one (issRaanAt's TLE
  // anchors), so the model's own launch window falls on the real liftoff —
  // within the three minutes its single head start (`T_PLANE`, 200 s) differs
  // from the flown one; the ascent's steering takes up the rest.
  it.each(WATCH_MISSIONS.filter((m) => isHistorical(m) && m.orbitId === 'iss').map((m) => m.id))('%s: a launch window of the ISS plane opens within three minutes of the real liftoff', (id) => {
    const s = watchMissionSettings(id);
    const [w] = launchWindows(s.orbit, siteById(s.siteId), new Date(s.launchTime.getTime() - 3600e3), 1);
    expect(Math.abs(w.time.getTime() - s.launchTime.getTime()) / 1000).toBeLessThan(180);
  });

  it('launches a free-node orbit straight away when it is already day at the pad', () => {
    const noonAtCape = new Date('2026-09-22T17:20:00Z'); // ~12:00 local solar time at 80.6°W
    expect(daylightLaunchTime(orbitById('leo'), 'cape', noonAtCape).getTime()).toBe(noonAtCape.getTime());
    const nightAtCape = new Date('2026-09-22T06:00:00Z');
    const t = daylightLaunchTime(orbitById('leo'), 'cape', nightAtCape);
    expect(localSolarHour(t, siteById('cape').longitude)).toBeCloseTo(10, 0);
  });

  it('are each flown by exactly one of tests/watch-missions-flights-*.test.ts', () => {
    const grouped: string[] = Object.values(FLIGHT_GROUPS).flat();
    expect([...grouped].sort(), 'FLIGHT_GROUPS in tests/watch-missions-flights.ts must hold every mission once')
      .toEqual(WATCH_MISSIONS.map((m) => m.id).sort());
    // one file per group, flying all of that group: flyGroup registers both the
    // aborts and the flights to target, and each file makes exactly one such
    // call, for its own group, as a statement of its own line (not commented out)
    expect(Object.keys(FLIGHT_FILES).sort()).toEqual(Object.keys(FLIGHT_GROUPS).map((g) => `./watch-missions-flights-${g}.test.ts`).sort());
    for (const group of Object.keys(FLIGHT_GROUPS)) {
      const file = `./watch-missions-flights-${group}.test.ts`;
      expect(FLIGHT_FILES[file].match(/^.*flyGroup\(.*$/gm)?.map((line) => line.trim()), file).toEqual([`flyGroup('${group}');`]);
    }
  });
});
