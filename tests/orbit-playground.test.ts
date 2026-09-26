/**
 * O01: the orbit playground's rules, its starting orbits and its Watch tour.
 *
 * The tour says things about real orbits in plain words ("about an hour and
 * a half", "under an hour in the south", "over 78.5° E", "10:30"); every one
 * of them is checked here against the orbit the step actually shows, so the
 * words cannot drift from the physics. The physics itself is
 * tests/kepler.test.ts's.
 */
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';
import { DEG, MU_EARTH, R_EARTH } from '../src/physics/constants';
import { julianDate, stateFromElements } from '../src/physics/orbital';
import { issRaanAt, raanFromLtan } from '../src/physics/mission';
import { ORBIT_PRESETS } from '../src/data/orbits';
import {
  SUN_RATE, meanSunRightAscension, newtonsCannon, nodeLocalTime, orbitFacts, raanForLocalTime, secularRates, stateAt,
} from '../src/orbit/kepler';
import { PLAYGROUND_PRESET_IDS, SITE_INCLINATION_DEG, presetOrbit } from '../src/orbit/presets';
import { TOUR } from '../src/orbit/tour';
import {
  PG_LIMITS, PG_WARPS, PG_DEFAULT_WARP, SLIDER_STEPS, handoffOrbit, linearScale, logScale, repeatGroundTrack, tourSetup, withApsis,
} from '../src/orbit/playground-model';
import { handoffElements } from '../src/orbit/handoff';
import { trackSpans } from '../src/ui/orbit/ground-track';
import { ballAt, framing } from '../src/ui/orbit/cannon-view';
import { BUILT_ITEMS, SECTION_PLANS } from '../src/ui/section-plan';

const JD = julianDate(new Date('2026-09-26T12:00:00Z'));
const HOUR = 3600;

describe('the playground\'s starting orbits (O01)', () => {
  it('turns every closed launch preset into an orbit with the same apsides', () => {
    expect(PLAYGROUND_PRESET_IDS).not.toContain('custom');
    expect(PLAYGROUND_PRESET_IDS.length).toBeGreaterThanOrEqual(10);
    for (const id of PLAYGROUND_PRESET_IDS) {
      const spec = ORBIT_PRESETS.find((o) => o.id === id)!;
      const o = presetOrbit(id, JD);
      expect(o.a * (1 - o.e) - R_EARTH, id).toBeCloseTo(spec.perigee, 3);
      expect(o.a * (1 + o.e) - R_EARTH, id).toBeCloseTo(spec.apogee, 3);
      expect(o.jd0).toBe(JD);
      if (spec.inclination === 'site') expect(o.i / DEG).toBeCloseTo(SITE_INCLINATION_DEG, 9);
      else if (typeof spec.inclination === 'number') expect(o.i / DEG).toBeCloseTo(spec.inclination, 9);
    }
  });

  it('puts the sun-synchronous preset at 10:30 at the ascending node and the ISS in the station\'s plane', () => {
    const sso = presetOrbit('sso', JD);
    expect(orbitFacts(sso, true).sunSynchronous).toBe(true);
    expect(nodeLocalTime(sso.raan, JD)).toBeCloseTo(10.5, 9);
    const iss = presetOrbit('iss', JD);
    expect(iss.raan).toBeCloseTo(issRaanAt(new Date('2026-09-26T12:00:00Z')), 6);
    expect(() => presetOrbit('nope', JD)).toThrow();
  });
});

describe('the local time of the node (O01)', () => {
  it('follows the mean Sun of the Astronomical Almanac', () => {
    expect(meanSunRightAscension(2451545.0) / DEG).toBeCloseTo(280.46, 9);
    // a tropical year later the mean Sun is back where it was
    expect(meanSunRightAscension(2451545.0 + 365.2422) / DEG).toBeCloseTo(280.46, 1);
    for (const h of [0.25, 6, 10.5, 13.75, 22.5]) expect(nodeLocalTime(raanForLocalTime(h, JD), JD)).toBeCloseTo(h, 9);
  });

  it('agrees with the launch planner to within the equation of time', () => {
    // the planner aims at the true Sun (src/physics/mission.ts); the two differ by at most about 16.5 min
    let worst = 0;
    for (let day = 0; day < 365; day += 5) {
      const date = new Date(Date.UTC(2026, 0, 1 + day, 12));
      const lt = nodeLocalTime(raanFromLtan(date, 10.5), julianDate(date));
      worst = Math.max(worst, Math.abs(lt - 10.5) * 60);
    }
    expect(worst).toBeGreaterThan(10); // the equation of time is really there
    expect(worst).toBeLessThan(17);
  });

  it('stays put on a sun-synchronous orbit, and drifts on any other', () => {
    const sso = presetOrbit('sso', JD);
    for (const days of [30, 90, 180]) {
      const s = stateAt(sso, days * 86400, true);
      expect(Math.abs(nodeLocalTime(s.raan, JD + days) - 10.5) * 60, `${days} d`).toBeLessThan(1);
    }
    const iss = presetOrbit('iss', JD);
    const later = stateAt(iss, 30 * 86400, true);
    expect(Math.abs(nodeLocalTime(later.raan, JD + 30) - nodeLocalTime(iss.raan, JD))).toBeGreaterThan(1);
  });
});

describe('the playground\'s sliders and rules (O01)', () => {
  it('maps a slider\'s travel onto its range, both ways', () => {
    const lin = linearScale(0, Math.PI);
    expect(lin.toValue(0)).toBe(0);
    expect(lin.toValue(SLIDER_STEPS)).toBeCloseTo(Math.PI, 12);
    expect(lin.toPosition(Math.PI / 2)).toBe(SLIDER_STEPS / 2);
    expect(lin.toPosition(-1)).toBe(0);
    const log = logScale(PG_LIMITS.altitude.min, PG_LIMITS.altitude.max);
    expect(log.toValue(0)).toBeCloseTo(150e3, 6);
    expect(log.toValue(SLIDER_STEPS)).toBeCloseTo(100_000e3, 0);
    for (const alt of [200e3, 420e3, 20_180e3, 35_786e3]) expect(log.toValue(log.toPosition(alt)) / alt).toBeCloseTo(1, 2);
    // low orbits get a good share of the travel: 150 km to 2 000 km is over a third of it
    expect(log.toPosition(2000e3)).toBeGreaterThan(SLIDER_STEPS / 3);
    expect(log.toPosition(1e12)).toBe(SLIDER_STEPS);
  });

  it('never lets the perigee pass the apogee', () => {
    const leo = presetOrbit('leo', JD);
    const raised = withApsis(leo, 'apogee', 2000e3);
    expect(raised.a * (1 - raised.e) - R_EARTH).toBeCloseTo(500e3, 3);
    expect(raised.a * (1 + raised.e) - R_EARTH).toBeCloseTo(2000e3, 3);
    // the perigee dragged above the apogee takes it along: a circle
    const pushed = withApsis(raised, 'perigee', 5000e3);
    expect(pushed.e).toBeCloseTo(0, 12);
    expect(pushed.a - R_EARTH).toBeCloseTo(5000e3, 3);
    // the apogee dragged below the perigee brings it down
    const lowered = withApsis(raised, 'apogee', 300e3);
    expect(lowered.e).toBeCloseTo(0, 12);
    expect(lowered.a - R_EARTH).toBeCloseTo(300e3, 3);
    // everything else stays
    expect({ ...pushed, a: 0, e: 0 }).toEqual({ ...leo, a: 0, e: 0 });
  });

  it('takes a handed-on orbit as it is', () => {
    const st = stateFromElements(R_EARTH + 600e3, 0.01, 97.8 * DEG, 1, 2, 3);
    const h = { r: [st.r.x, st.r.y, st.r.z] as [number, number, number], v: [st.v.x, st.v.y, st.v.z] as [number, number, number], jd: JD };
    const o = handoffOrbit(h), el = handoffElements(h);
    expect(o.a).toBeCloseTo(el.a, 3);
    expect(o.e).toBeCloseTo(el.e, 12);
    expect(o.i).toBeCloseTo(el.i, 12);
    expect(o.jd0).toBe(JD);
    // and the satellite is where the flight left it
    const s = stateAt(o, 0, false);
    expect(Math.hypot(s.r.x - st.r.x, s.r.y - st.r.y, s.r.z - st.r.z)).toBeLessThan(1e-3);
  });

  it('designs a repeating ground track the way Sentinel-2\'s was', () => {
    // ESA SentiWiki: 143 revolutions in 10 days, 786 km, 98.62°
    const s2 = repeatGroundTrack(143, 10, true, 0)!;
    expect(s2).not.toBeNull();
    expect(Math.abs((s2.a - R_EARTH) / 1000 - 786)).toBeLessThan(3);
    expect(Math.abs(s2.i / DEG - 98.62)).toBeLessThan(0.1);
    expect(s2.e).toBe(0);
    // no such orbit: one revolution a day is far above 5 000 km; nonsense in, nothing out
    expect(repeatGroundTrack(1, 1, false, 0)).toBeNull();
    expect(repeatGroundTrack(0, 1, true, 0)).toBeNull();
    expect(repeatGroundTrack(14.5, 1, true, 0)).toBeNull();
    // a low one at the ISS's inclination
    const low = repeatGroundTrack(31, 2, false, 51.6 * DEG)!;
    expect(low.i / DEG).toBeCloseTo(51.6, 9);
    expect((low.a - R_EARTH) / 1000).toBeGreaterThan(150);
  });

  it('draws a revolution behind and three ahead, never more than a day', () => {
    expect(trackSpans(5580)).toEqual({ past: 5580, future: 3 * 5580 });
    expect(trackSpans(43_080)).toEqual({ past: 43_080, future: 86_400 });
    expect(trackSpans(86_164)).toEqual({ past: 86_164, future: 86_400 });
  });

  it('frames a short shot close up and one that goes round whole', () => {
    const short = newtonsCannon(100e3, 4000);
    const f1 = framing(short.path, R_EARTH + 100e3);
    expect(f1.half).toBeLessThan(0.5 * R_EARTH);
    expect(f1.y).toBeGreaterThan(0.8 * R_EARTH);
    const round = newtonsCannon(100e3, 7850);
    expect(framing(round.path, R_EARTH + 100e3)).toEqual({ x: 0, y: 0, half: expect.any(Number) });
    expect(framing([], R_EARTH + 100e3).half).toBeLessThan(R_EARTH);
    // the ball: at the cannon at first, down at the end, round and round on an orbit
    expect(ballAt(short, 0)).toMatchObject({ x: 0, y: R_EARTH + 100e3, done: false });
    expect(ballAt(short, short.flightTime! + 1).done).toBe(true);
    const once = ballAt(round, round.period!), start = round.path[0];
    expect(Math.hypot(once.x - start.x, once.y - start.y)).toBeLessThan(1e3);
    expect(once.done).toBe(false);
  });

  it('counts O01 as built, and only items the Orbit section plans', () => {
    const orbitItems = SECTION_PLANS.orbit.phases.flatMap((p) => p.items.map((i) => i.id));
    expect(BUILT_ITEMS.has('O01')).toBe(true);
    for (const id of BUILT_ITEMS) expect(orbitItems).toContain(id);
  });
});

describe('the Watch tour (O01)', () => {
  const step = (id: string) => TOUR.find((s) => s.id === id)!;
  const setup = (id: string) => tourSetup(step(id), JD);

  it('has every step in the three languages, at a pace the time bar offers', () => {
    expect(TOUR.length).toBe(6);
    expect(new Set(TOUR.map((s) => s.id)).size).toBe(TOUR.length);
    for (const s of TOUR) {
      for (const [name, dict] of Object.entries({ en, ru, th })) {
        expect(dict[s.titleKey], `${name} ${s.titleKey}`).toBeTruthy();
        expect(dict[s.textKey], `${name} ${s.textKey}`).toBeTruthy();
      }
      expect(PG_WARPS, s.id).toContain(s.warp);
      if (s.view === 'cannon') expect(s.cannonSpeed, s.id).toBeGreaterThan(0);
      else expect(PLAYGROUND_PRESET_IDS, s.id).toContain(s.preset);
    }
    expect(PG_WARPS).toContain(PG_DEFAULT_WARP);
  });

  it('Newton\'s cannon: 4 km/s falls back, about 7.8 km/s goes round', () => {
    const falls = setup('cannonFalls').cannon!;
    expect(falls.speed).toBe(4000);
    expect(newtonsCannon(falls.altitude, falls.speed).outcome).toBe('impact');
    const orbits = setup('cannonOrbits').cannon!;
    const shot = newtonsCannon(orbits.altitude, orbits.speed);
    expect(shot.outcome).toBe('orbit');
    expect(Math.round(shot.vCircular / 100) / 10).toBe(7.8);
    expect(orbits.speed / shot.vCircular).toBeGreaterThan(1);
    expect(orbits.speed / shot.vCircular).toBeLessThan(1.01);
  });

  it('the ISS: about 420 km, an hour and a half, more than fifteen a day, 7.7 km/s, 51.6°', () => {
    const o = setup('iss').orbit!;
    const f = orbitFacts(o, false);
    expect(f.perigeeAlt / 1000).toBeCloseTo(420, 6);
    expect(f.period / 60).toBeGreaterThan(90);
    expect(f.period / 60).toBeLessThan(96);
    expect(f.revsPerDay).toBeGreaterThan(15);
    expect(Math.round(f.vPerigee / 100) / 10).toBe(7.7);
    expect(Math.round(o.i / DEG * 10) / 10).toBe(51.6);
  });

  it('Molniya: twelve hours, under one of them in the south, and a perigee J2 does not turn', () => {
    const s = setup('molniya');
    const o = s.orbit!;
    expect(s.sectors).toBe(true);
    const f = orbitFacts(o, false);
    expect(f.period / HOUR).toBeGreaterThan(11.9);
    expect(f.period / HOUR).toBeLessThan(12.1);
    expect(f.apogeeAlt / 1000).toBeCloseTo(39_750, 6);
    // time south of the equator over one revolution, sampled every 10 s
    let south = 0;
    for (let t = 0; t < f.period; t += 10) if (stateAt(o, t, false).lat < 0) south += 10;
    expect(south / HOUR).toBeLessThan(1);
    expect(south / HOUR).toBeGreaterThan(0.5);
    // the apogee is the orbit's northernmost point
    expect(stateAt(o, f.period / 2, false).lat / DEG).toBeCloseTo(63.4, 1);
    // at the critical inclination the perigee stands still
    expect(Math.abs(secularRates(o, true).argpDot / DEG * 86400)).toBeLessThan(0.01);
  });

  it('geostationary: one sidereal day, over 78.5° E, standing still', () => {
    const s = setup('geo');
    expect(s.view).toBe('track');
    expect(s.j2).toBe(false);
    const o = s.orbit!;
    const f = orbitFacts(o, false);
    expect(Math.abs(f.period - 86_164.0905)).toBeLessThan(1);
    expect(stateAt(o, 0, false).lon / DEG).toBeCloseTo(78.5, 6);
    for (const t of [6 * HOUR, 86_400, 3 * 86_400]) expect(Math.abs(stateAt(o, t, false).lon / DEG - 78.5), `${t} s`).toBeLessThan(0.05);
    // the height the text names
    expect(f.perigeeAlt / 1000).toBeCloseTo(35_786, 6);
    expect(Math.sqrt(MU_EARTH / o.a) / 1000).toBeCloseTo(3.075, 3);
  });

  it('sun-synchronous: about 98°, about a degree a day, 10:30 heading north, and the track stepping west', () => {
    const s = setup('sso');
    expect(s.j2).toBe(true);
    const o = s.orbit!;
    expect(Math.round(o.i / DEG)).toBe(98);
    const f = orbitFacts(o, true);
    expect(f.sunSynchronous).toBe(true);
    expect(f.raanDot / DEG * 86400).toBeCloseTo(SUN_RATE / DEG * 86400, 6);
    expect(Math.round(f.raanDot / DEG * 86400)).toBe(1);
    expect(nodeLocalTime(o.raan, JD)).toBeCloseTo(10.5, 9);
    // the satellite starts at the ascending node, heading north
    const s0 = stateAt(o, 0, true);
    expect(s0.lat).toBeCloseTo(0, 9);
    expect(s0.v.z).toBeGreaterThan(0);
    // one nodal period on, back at the node, west by the track shift
    const s1 = stateAt(o, f.nodalPeriod, true);
    expect(Math.abs(s1.lat / DEG)).toBeLessThan(0.01);
    const west = ((s0.lon - s1.lon) / DEG + 360) % 360;
    expect(west).toBeCloseTo(f.trackShift / DEG, 2);
  });
});
