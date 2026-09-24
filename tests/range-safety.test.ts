/**
 * Range safety: the one rule for "can this site fly this plane", and the four
 * places that ask it — `inclinationCorridor`, `azimuthAllowedFor`, `planMission`
 * and the setup panel's verdict.
 *
 * THE RULE. A site can fly an inclination when a launch heading inside its
 * azimuth window reaches it — the northbound solution or its southbound mirror,
 * whichever the window holds — or when one of the two lies within
 * `DOGLEG_LIMIT_DEG` of the window, flown as a dogleg from its edge; and the
 * inclination is not below the site's declared minimum. Every edge carries the
 * same `CORRIDOR_SLACK`, applied to the inclination. `inclinationCorridor`
 * implements it, `azimuthAllowedFor` is its boolean form, `planMission` /
 * `launchWindows` fly the heading `launchDirection` chooses, and the panel
 * reads the corridor.
 *
 * WHAT DISAGREED, measured at 2026-09-22T03:00Z before this wave:
 *
 *  - `azimuthAllowedFor` tested only the northbound heading below 75° and took
 *    the window's edges with no tolerance, while `inclinationCorridor` bracketed
 *    with the declared pair, which had been measured from BOTH headings.
 *    Tanegashima's own `leo` and `gto` presets (30.45°) head out on 88.07°
 *    northbound against a 90–190° window, so `azimuthAllowedFor` said no and
 *    the corridor said 'ok'. The ISS plane from Wallops, Wenchang, Tanegashima,
 *    Jiuquan and Sriharikota was the same disagreement (known bug F01), and so —
 *    not in the report, found by the probe — were Xichang's own `leo`/`gto`.
 *  - `planMission` flew the northbound heading in every one of those cases, into
 *    a sector the site closes, and reported the mission as reachable.
 *  - Sun-synchronous from Tanegashima, Sriharikota and Kourou was rejected by
 *    BOTH. That was not a disagreement: those ranges reach the plane with a
 *    dogleg — a yaw during the ascent — which this model did not fly. It does
 *    now, up to `DOGLEG_LIMIT_DEG` (roadmap F01), so Kourou and Tanegashima fly
 *    it; Sriharikota's window stops 11° short of the plane, ~1.4 km/s at
 *    orbital speed, and stays out. The distances are pinned below so they
 *    cannot drift.
 */
import { describe, expect, it } from 'vitest';
import { SITES, siteById, type SiteExtra } from '../src/data/sites';
import { orbitById, ORBIT_PRESETS } from '../src/data/orbits';
import { vehicleById } from '../src/data/vehicles';
import { satelliteById } from '../src/data/satellites';
import {
  azimuthAllowedFor, azimuthInWindow, corridorReach, inclinationCorridor, launchDescendingFor, launchDirection, launchWindows,
  minInclinationFor, planMission, resolveTarget, CORRIDOR_SLACK, DOGLEG_LIMIT_DEG,
} from '../src/physics/mission';
import { circularSpeed, rotatingLaunchAzimuth, wrapPi } from '../src/physics/orbital';
import { guidanceForVehicle, DEFAULT_FAILURE } from '../src/physics/defaults';
import { missionVerdict } from '../src/ui/panel';
import { DEG, RAD, R_EARTH } from '../src/physics/constants';
import type { MissionConfig, OrbitSpec } from '../src/types';

const T = new Date(Date.UTC(2026, 8, 22, 3, 0, 0));
const V300 = circularSpeed(R_EARTH + 300e3);

/** Degrees a rotating-frame heading (rad) lies outside the site's window; 0 inside it. */
function outsideDeg(site: SiteExtra, azRad: number): number {
  const wrap = (d: number) => ((d % 360) + 360) % 360;
  const deg = wrap(azRad * RAD), lo = wrap(site.azimuthMin), hi = wrap(site.azimuthMax);
  const inside = lo <= hi ? deg >= lo && deg <= hi : deg >= lo || deg <= hi;
  return inside ? 0 : Math.min(wrap(lo - deg), wrap(deg - hi));
}

/** Both launch headings for `inc`, deg — [northbound, southbound] — or [] when the site is above it. */
function headings(site: SiteExtra, inc: number): number[] {
  return [false, true].map((d) => rotatingLaunchAzimuth(site.latitude * DEG, inc, V300, d))
    .filter((az): az is number => az !== null);
}

function plan(vehicleId: string, siteId: string, orbit: OrbitSpec, mass = 1000) {
  const site = siteById(siteId);
  const spec = vehicleById(vehicleId);
  const launchTime = orbit.raanMode === 'free' ? T : launchWindows(orbit, site, T, 1)[0].time;
  const cfg: MissionConfig = {
    vehicleId, satelliteId: 'cubesats', siteId, orbit, launchTime,
    guidance: guidanceForVehicle(spec), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: mass,
  };
  return planMission(cfg, site, spec);
}

function verdict(vehicleId: string, siteId: string, orbit: OrbitSpec, mass = 1000) {
  const site = siteById(siteId);
  const p = plan(vehicleId, siteId, orbit, mass);
  return missionVerdict({
    spec: vehicleById(vehicleId), site, orbit, satellite: satelliteById('cubesats'), payloadMass: mass,
    inclinationDeg: resolveTarget(orbit, site, T).inclination * RAD,
    plan: p, failureMode: 'none', siteReassigned: false,
  });
}

describe('range safety · one rule', () => {
  /**
   * A sweep over every inclination from every site, in 0.05° steps, with an
   * INDEPENDENT test of the geometry: whether either heading lands in the
   * window, taken straight from `rotatingLaunchAzimuth`. The corridor may only
   * say 'ok' where such a heading exists (within the slack) or where one lies
   * within `DOGLEG_LIMIT_DEG` of the window — then flown as a dogleg from its
   * edge — and must say 'ok' wherever a direct one exists above the declared
   * minimum.
   */
  it('azimuthAllowedFor, inclinationCorridor and the heading agree at every inclination from every site', () => {
    const wrong: string[] = [];
    const hit = (site: SiteExtra, inc: number): boolean => headings(site, inc).some((az) => azimuthInWindow(site, az));
    const nearest = (site: SiteExtra, inc: number): number => Math.min(...headings(site, inc).map((az) => outsideDeg(site, az)));
    for (const site of SITES) {
      for (let deg = 0; deg <= 180; deg += 0.05) {
        const inc = deg * DEG;
        const verdict = inclinationCorridor(site, inc);
        const tag = `${site.id} ${deg.toFixed(2)}°`;
        if (azimuthAllowedFor(site, inc) !== (verdict === 'ok')) wrong.push(`${tag}: azimuthAllowedFor vs ${verdict}`);
        const effective = inc > Math.PI / 2 ? Math.PI - inc : inc;
        const aboveFloor = effective >= minInclinationFor(site) - CORRIDOR_SLACK;
        if (hit(site, inc) && aboveFloor && verdict !== 'ok') wrong.push(`${tag}: a licensed heading exists, verdict ${verdict}`);
        const direct = [inc, inc - CORRIDOR_SLACK, inc + CORRIDOR_SLACK].some((i) => hit(site, i));
        if (verdict === 'ok' && !direct) {
          // Only as a dogleg: a heading within the limit, and the planner leaving on the window's edge.
          const d = launchDirection(site, inc);
          if (!(nearest(site, inc) <= DOGLEG_LIMIT_DEG + 1e-9)) wrong.push(`${tag}: 'ok' with no heading within the dogleg limit`);
          else if (!(d.doglegDeg > 0 && outsideDeg(site, d.azimuthRotating) < 1e-6)) wrong.push(`${tag}: a dogleg that does not leave on the edge`);
        }
        // ...and the heading the planner picks is the licensed one.
        if (verdict === 'ok' && hit(site, inc)) {
          const az = rotatingLaunchAzimuth(site.latitude * DEG, inc, V300, launchDescendingFor(site, inc));
          if (az === null || !azimuthInWindow(site, az)) wrong.push(`${tag}: planner picks the unlicensed heading`);
        }
      }
    }
    expect(wrong.slice(0, 20), `${wrong.length} disagreements`).toEqual([]);
  });

  it('the declared floor never sits below what the window reaches', () => {
    // What makes 'belowMinimum' the only other verdict below the corridor: a
    // floor under the window's reach would let the `leo` preset aim at a plane
    // no licensed heading flies.
    for (const s of SITES) {
      expect(minInclinationFor(s), s.id).toBeGreaterThanOrEqual(corridorReach(s).lo);
    }
  });
});

describe('range safety · the reported cases', () => {
  /**
   * Tanegashima's own minimum is a due-east launch: at exactly 30.4° both
   * headings are 90° to the last bit, and the rounding came out a hair north of
   * the edge. The `leo`/`gto` presets resolve to 30.45°, whose northbound
   * heading is 88.07° — outside — and whose southbound one, 91.93°, is inside.
   * Xichang is the same case at 94°: 85.82° northbound, 94.18° southbound.
   */
  it('a site can fly its own minimum inclination, on a heading its window licenses', () => {
    const cases: [vehicle: string, site: string, heading: number][] = [
      ['h3', 'tanegashima', 91.93], ['h2a202', 'tanegashima', 91.93], ['longmarch3be', 'xichang', 94.18],
    ];
    for (const [vehicle, siteId, heading] of cases) {
      const site = siteById(siteId);
      expect(azimuthAllowedFor(site, site.minInclination * DEG), `${siteId} at exactly ${site.minInclination}°`).toBe(true);
      for (const orbitId of ['leo', 'gto']) {
        const orbit = orbitById(orbitId);
        const tag = `${vehicle}/${orbitId} from ${siteId}`;
        const inc = resolveTarget(orbit, site, T).inclination;
        expect(azimuthAllowedFor(site, inc), tag).toBe(true);
        expect(inclinationCorridor(site, inc), tag).toBe('ok');
        const p = plan(vehicle, siteId, orbit);
        expect(p.inclinationReachable, tag).toBe(true);
        expect(p.descending, `${tag}: flies the southbound heading`).toBe(true);
        expect(p.azimuthRotating * RAD, tag).toBeCloseTo(heading, 1);
        expect(azimuthInWindow(site, p.azimuthRotating), tag).toBe(true);
        const v = verdict(vehicle, siteId, orbit);
        expect(v.level, `${tag}: ${v.text}`).not.toBe('fail');
        expect(v.text, tag).not.toMatch(/corridor|unreachable/);
      }
    }
  });

  /**
   * Known bug F01. The 51.64° plane from five sites whose north-east is closed:
   * the northbound heading (44-54°) is outside every one of their windows, the
   * southbound mirror is inside — which is how Wallops, Tanegashima and Jiuquan
   * really fly these planes. The launch window has to be for that heading too,
   * or the plan flies the right heading into the wrong plane.
   */
  it('F01: the ISS plane from Wallops, Wenchang, Tanegashima, Jiuquan and Sriharikota', () => {
    const iss = orbitById('iss');
    const cases: [vehicle: string, site: string, heading: number][] = [
      ['electron', 'wallops', 129.95], ['longmarch5', 'wenchang', 141.33], ['h3', 'tanegashima', 136.13],
      ['longmarch2d', 'jiuquan', 126.28], ['pslvxl', 'sriharikota', 142.97],
    ];
    for (const [vehicle, siteId, heading] of cases) {
      const site = siteById(siteId);
      const inc = resolveTarget(iss, site, T).inclination;
      const [north] = headings(site, inc);
      expect(azimuthInWindow(site, north), `${siteId}: the northbound heading is the one the window closes`).toBe(false);
      expect(azimuthAllowedFor(site, inc), siteId).toBe(true);
      expect(inclinationCorridor(site, inc), siteId).toBe('ok');
      const p = plan(vehicle, siteId, iss);
      expect(p.inclinationReachable, siteId).toBe(true);
      expect(p.descending, siteId).toBe(true);
      expect(p.azimuthRotating * RAD, siteId).toBeCloseTo(heading, 1);
      expect(azimuthInWindow(site, p.azimuthRotating), siteId).toBe(true);
      const w = launchWindows(iss, site, T, 1)[0];
      expect(w.descending, `${siteId}: the window is computed for the heading that is flown`).toBe(p.descending);
      expect(Math.abs(wrapPi(p.raanExpected - p.target.raan!)) * RAD, `${siteId}: plane at the window`).toBeLessThan(0.5);
      const v = verdict(vehicle, siteId, iss);
      expect(v.text, `${siteId}: ${v.text}`).not.toMatch(/corridor|unreachable/);
    }
  });

  /**
   * Not a disagreement: rejected by both before, because the real ranges get
   * there with a dogleg. The model flies one now (roadmap F01): Kourou and
   * Tanegashima leave on their window's edge and yaw into the plane, and
   * Sriharikota, 11° short, stays out. Pinned with the measured distance — how
   * far past the window's direct reach the plane is — so a data or rule change
   * that moves it has to say so here. The heading is the nearer one, which is
   * what the PSLV-XL reference timeline in tests/fleet-defaults.test.ts flies.
   */
  it('sun-synchronous from Tanegashima and Kourou is a dogleg, from Sriharikota out of reach', () => {
    const sso = orbitById('sso');
    const cases: [vehicle: string, site: string, pastReach: number, descending: boolean, flown: boolean][] = [
      ['h3', 'tanegashima', 1.70, true, true], ['vegac', 'kourou', 1.20, false, true], ['pslvxl', 'sriharikota', 11.05, true, false],
    ];
    for (const [vehicle, siteId, pastReach, descending, flown] of cases) {
      const site = siteById(siteId);
      const inc = resolveTarget(sso, site, T).inclination;
      expect(headings(site, inc).some((az) => azimuthInWindow(site, az)), `${siteId}: no direct heading`).toBe(false);
      expect((inc - corridorReach(site).hi) * RAD, siteId).toBeCloseTo(pastReach, 1);
      expect(launchDescendingFor(site, inc), siteId).toBe(descending);
      expect(azimuthAllowedFor(site, inc), siteId).toBe(flown);
      expect(inclinationCorridor(site, inc), siteId).toBe(flown ? 'ok' : 'aboveCorridor');
      const p = plan(vehicle, siteId, sso, 300);
      expect(p.inclinationReachable, siteId).toBe(flown);
      const v = verdict(vehicle, siteId, sso, 300);
      if (flown) {
        const d = launchDirection(site, inc);
        expect(d.doglegDeg, siteId).toBeGreaterThan(0);
        expect(d.doglegDeg, siteId).toBeLessThanOrEqual(DOGLEG_LIMIT_DEG);
        expect(p.doglegDeg, siteId).toBeCloseTo(d.doglegDeg, 6);
        expect(outsideDeg(site, p.azimuthRotating), `${siteId}: leaves on the window's edge`).toBeLessThan(1e-6);
        expect(v.level, `${siteId}: ${v.text}`).not.toBe('fail');
        expect(v.text, siteId).not.toContain('would not be licensed');
        expect(v.text, `${siteId}: the panel names the dogleg`).toContain('dogleg');
      } else {
        expect(v.level, siteId).toBe('fail');
        expect(v.text, siteId).toContain('range-safety corridor');
        expect(v.text, siteId).toContain('would not be licensed');
      }
    }
  });
});

/**
 * How far outside the window a reachable plan's heading may be, deg.
 *
 * The window's reach is stated for the 300 km reference orbit the site data
 * were measured at; the plan computes its heading for its own insertion orbit,
 * and the two differ by hundredths of a degree. That only shows where the
 * target sits ON an edge — Vandenberg's `leo` preset aims at its declared
 * 61.6°, which is the 147° edge itself: 147.01° at 300 km, 146.99° at the
 * 200 km the plan inserts at — and it is far inside `CORRIDOR_SLACK`.
 */
const HEADING_TOLERANCE_DEG = 0.05;

describe('range safety · the planner and the panel', () => {
  /**
   * Every site against every preset: the plan's `inclinationReachable`, the
   * panel's corridor clause and the corridor verdict are one answer, and a
   * reachable plan leaves on a heading the window licenses.
   */
  it('agree with the corridor for every site and every preset', () => {
    const wrong: string[] = [];
    const licensed = (site: SiteExtra, az: number): boolean =>
      [0, HEADING_TOLERANCE_DEG, -HEADING_TOLERANCE_DEG].some((d) => azimuthInWindow(site, az + d * DEG));
    for (const site of SITES) {
      for (const orbit of ORBIT_PRESETS.filter((o) => o.id !== 'custom')) {
        const tag = `${site.id}/${orbit.id}`;
        const inc = resolveTarget(orbit, site, T).inclination;
        const corridor = inclinationCorridor(site, inc);
        const p = plan('falcon9', site.id, orbit);
        if (p.inclinationReachable !== (corridor === 'ok')) wrong.push(`${tag}: plan ${p.inclinationReachable}, corridor ${corridor}`);
        if (p.inclinationReachable && !licensed(site, p.azimuthRotating)) {
          wrong.push(`${tag}: reachable, but flies ${(p.azimuthRotating * RAD).toFixed(2)}° outside ${site.azimuthMin}–${site.azimuthMax}°`);
        }
        const v = verdict('falcon9', site.id, orbit);
        if (v.text.includes('would not be licensed') !== (corridor === 'aboveCorridor')) wrong.push(`${tag}: verdict "${v.text}", corridor ${corridor}`);
        if (p.inclinationReachable && p.doglegDeg > 0 && !v.text.includes('dogleg')) wrong.push(`${tag}: a ${p.doglegDeg.toFixed(1)}° dogleg the verdict does not mention`);
        if (corridor === 'ok' && v.text.includes('unreachable')) wrong.push(`${tag}: verdict calls an 'ok' plane unreachable`);
      }
    }
    expect(wrong, wrong.join('\n')).toEqual([]);
  });
});
