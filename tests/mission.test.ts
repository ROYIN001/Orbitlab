import { describe, it, expect } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { autotune } from '../src/physics/autotune';
import { DEFAULT_GUIDANCE, DEFAULT_FAILURE } from '../src/physics/defaults';
import { orbitById } from '../src/data/orbits';
import { siteById } from '../src/data/sites';
import { canBurnAfterAscent, DIRECT_APOAPSIS_CAP, DOGLEG_LIMIT_DEG, inclinationCorridor, launchDirection, launchWindows, planMission, resolveTarget } from '../src/physics/mission';
import { SITES } from '../src/data/sites';
import { ORBIT_PRESETS } from '../src/data/orbits';
import { vehicleById } from '../src/data/vehicles';
import { satelliteById } from '../src/data/satellites';
import { nodalPrecessionRate, wrapPi } from '../src/physics/orbital';
import type { MissionConfig } from '../src/types';
import { DEG, RAD } from '../src/physics/constants';

const mk = (over: Partial<MissionConfig>): MissionConfig => ({
  vehicleId: 'falcon9', satelliteId: 'starlink', siteId: 'cape', orbit: orbitById('iss'),
  launchTime: new Date(Date.UTC(2026, 8, 15, 12, 0, 0)), guidance: { ...DEFAULT_GUIDANCE, kickAngle: 2.5 }, failure: { ...DEFAULT_FAILURE },
  boosterRecovery: false, ...over,
});

function fly(cfg: MissionConfig, maxTime: number, stopWhenDone = true): Simulation {
  const sim = new Simulation(cfg, { headless: true });
  let guard = 0;
  while ((!stopWhenDone || !sim.done) && sim.state.t < maxTime && guard++ < 600000) {
    if (sim.state.status === 'failed') break;
    sim.step(sim.suggestedDt());
  }
  return sim;
}

/** Degrees a heading lies outside a site's corridor, 0 inside. */
function outside(site: { azimuthMin: number; azimuthMax: number }, azimuthRad: number): number {
  const w = (d: number) => ((d % 360) + 360) % 360;
  const d = w(azimuthRad * RAD), lo = w(site.azimuthMin), hi = w(site.azimuthMax);
  if (lo <= hi ? d >= lo && d <= hi : d >= lo || d <= hi) return 0;
  const gap = (a: number, b: number) => Math.min(w(a - b), 360 - w(a - b));
  return Math.min(gap(d, lo), gap(d, hi));
}

describe('launch direction and the range-safety corridor', () => {
  const inc = (orbit: string, site: string) => resolveTarget(orbitById(orbit), siteById(site), new Date(Date.UTC(2026, 8, 15))).inclination;

  it('flies the solution inside the corridor when only one is', () => {
    // Every one of these used to fly north of east, out of its corridor.
    for (const [site, orbit] of [['wallops', 'iss'], ['wenchang', 'iss'], ['tanegashima', 'iss'], ['jiuquan', 'iss'],
      ['sriharikota', 'iss'], ['mahia', 'iss'], ['vandenberg', 'leo'], ['taiyuan', 'leo'], ['tanegashima', 'leo'], ['xichang', 'gto']] as const) {
      const d = launchDirection(siteById(site), inc(orbit, site));
      expect(d.descending, `${site}/${orbit}`).toBe(true);
      expect(d.doglegDeg, `${site}/${orbit}`).toBe(0);
      expect(outside(siteById(site), d.azimuthRotating), `${site}/${orbit}`).toBeLessThan(0.3);
    }
    // ...and a site whose corridor holds the northbound solution keeps it.
    expect(launchDirection(siteById('cape'), inc('iss', 'cape')).descending).toBe(false);
    expect(launchDirection(siteById('baikonur'), inc('iss', 'baikonur')).descending).toBe(false);
  });

  it('doglegs from the corridor edge when the direct heading is just outside it', () => {
    const kourou = launchDirection(siteById('kourou'), inc('sso', 'kourou'));
    expect(kourou.allowed).toBe(true);
    expect(kourou.azimuthRotating * RAD).toBeCloseTo(350, 6);
    expect(kourou.doglegDeg).toBeGreaterThan(1);
    expect(kourou.doglegDeg).toBeLessThan(1.5);
    const tanegashima = launchDirection(siteById('tanegashima'), inc('sso', 'tanegashima'));
    expect(tanegashima.allowed).toBe(true);
    expect(tanegashima.azimuthRotating * RAD).toBeCloseTo(190, 6);
    expect(tanegashima.doglegDeg).toBeGreaterThan(1.5);
    expect(tanegashima.doglegDeg).toBeLessThan(DOGLEG_LIMIT_DEG);
    // Too far to turn: Baikonur to a sun-synchronous plane (8.6°) and PSLV's
    // swing around Sri Lanka (11°) stay refused.
    expect(launchDirection(siteById('baikonur'), inc('sso', 'baikonur')).allowed).toBe(false);
    expect(launchDirection(siteById('sriharikota'), inc('sso', 'sriharikota')).allowed).toBe(false);
  });

  it('never plans a heading outside the corridor for a mission the verdict accepts', () => {
    for (const site of SITES) for (const orbit of ORBIT_PRESETS) {
      const cfg = mk({ siteId: site.id, orbit, vehicleId: 'falcon9', satelliteId: 'cubesats' });
      const target = resolveTarget(orbit, site, cfg.launchTime);
      if (inclinationCorridor(site, target.inclination) !== 'ok') continue;
      const plan = planMission(cfg, site, vehicleById('falcon9'));
      expect(outside(site, plan.azimuthRotating), `${site.id}/${orbit.id} leaves on ${(plan.azimuthRotating * RAD).toFixed(1)}°`)
        .toBeLessThan(0.3);
      expect(plan.doglegDeg).toBeLessThanOrEqual(DOGLEG_LIMIT_DEG);
      // The launch window is computed for the same solution the ascent flies.
      if (target.raan !== null) expect(launchWindows(orbit, site, cfg.launchTime, 1)[0].descending, `${site.id}/${orbit.id}`).toBe(plan.descending);
    }
  });

  it('a dogleg ascent reaches the target plane', () => {
    const site = siteById('kourou');
    const orbit = orbitById('sso');
    const launchTime = launchWindows(orbit, site, new Date(Date.UTC(2026, 8, 15)), 1)[0].time;
    const sim = fly(mk({ vehicleId: 'vegac', siteId: 'kourou', orbit, satelliteId: 'cubesats', payloadMassOverride: 1150, launchTime,
      guidance: { ...DEFAULT_GUIDANCE, ...(vehicleById('vegac').guidanceDefaults ?? {}) }, guidanceResolved: true }), 20000);
    expect(sim.plan.doglegDeg).toBeGreaterThan(1);
    expect(sim.events.some(e => e.key === 'evt.targetOrbit'), sim.events.map(e => e.key).join(' ')).toBe(true);
    expect(Math.abs(sim.state.elements.i - sim.plan.target.inclination) / DEG).toBeLessThan(0.3);
  }, 60000);
});

describe('launch windows', () => {
  it('finds ISS-plane windows from Baikonur where the ascent RAAN matches the station RAAN', () => {
    const site = siteById('baikonur');
    const orbit = orbitById('iss');
    const from = new Date(Date.UTC(2026, 8, 15, 0, 0, 0));
    const wins = launchWindows(orbit, site, from, 3);
    expect(wins.length).toBe(3);
    for (const w of wins) {
      expect(w.time.getTime()).toBeGreaterThan(from.getTime());
      const cfg = mk({ vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', launchTime: w.time });
      const plan = planMission(cfg, site, vehicleById('soyuz21a'));
      const target = resolveTarget(orbit, site, w.time);
      expect(Math.abs(wrapPi(plan.raanExpected - (target.raan ?? 0))) * RAD).toBeLessThan(0.5);
    }
    // consecutive windows are about one sidereal day apart, minus the ~20 min/day nodal regression of the ISS plane
    const gap = (wins[1].time.getTime() - wins[0].time.getTime()) / 1000;
    expect(gap).toBeGreaterThan(84000);
    expect(gap).toBeLessThan(86400);
  });
  it('sun-synchronous LTAN windows exist twice per day (northbound + southbound handled by site)', () => {
    const site = siteById('vandenberg');
    const wins = launchWindows(orbitById('sso'), site, new Date(Date.UTC(2026, 8, 15)), 2);
    expect(wins.length).toBe(2);
    expect(wins[0].descending).toBe(true);
  });
});

describe('failures', () => {
  it('Falcon 9 survives a single Merlin engine-out at T+60 s and still reaches orbit', () => {
    const time = launchWindows(orbitById('iss'), siteById('cape'), new Date('2026-09-15T12:00:00Z'), 1)[0].time;
    const cfg = mk({ launchTime: time, failure: { mode: 'engineOut', time: 60, stage: 0 } });
    const sim = fly(cfg, 4 * 3600);
    const keys = sim.events.map((e) => e.key);
    expect(keys).toContain('evt.engineOut');
    expect(keys, keys.join(',')).toContain('evt.targetOrbit');
  });
  it('total thrust loss at T+60 s destroys the vehicle', () => {
    const cfg = mk({ failure: { mode: 'thrustLoss', time: 60, stage: 0 } });
    const sim = fly(cfg, 3600);
    expect(sim.state.status).toBe('failed');
    const keys = sim.events.map((e) => e.key);
    expect(keys.some((k) => k === 'evt.rangeSafety' || k === 'evt.impact' || k === 'evt.vehicleLost')).toBe(true);
  });
  it('a stuck fairing costs margin but Falcon 9 still makes orbit with a light payload', () => {
    const cfg = mk({ satelliteId: 'cubesats', failure: { mode: 'fairingStuck', time: 0, stage: 0 }, orbit: orbitById('leo') });
    const sim = fly(cfg, 4 * 3600);
    expect(sim.events.map((e) => e.key)).toContain('evt.fairingStuck');
    expect(sim.state.status).toBe('orbit');
  });
});

describe('booster recovery', () => {
  it('reserving landing propellant reduces the remaining delta-v and lands the booster', () => {
    const base = mk({ satelliteId: 'cubesats', orbit: orbitById('leo') });
    const noRec = fly(base, 4 * 3600, false);
    const rec = fly({ ...base, boosterRecovery: true }, 4 * 3600, false);
    const dvNo = Number(noRec.events.find((e) => e.key === 'evt.parkingOrbit')?.params?.dv);
    const dvRec = Number(rec.events.find((e) => e.key === 'evt.parkingOrbit')?.params?.dv);
    expect(dvRec).toBeLessThan(dvNo);
    expect(rec.events.map((e) => e.key), rec.events.map((e) => e.key).join(',')).toContain('evt.boosterLanded');
  });
});

describe('orbit phase (J2 + drag)', () => {
  it('the node regresses at the J2 rate after insertion', () => {
    const cfg = mk({ satelliteId: 'earthObs', orbit: orbitById('polar') });
    const sim = fly(cfg, 6 * 3600);
    expect(sim.state.status).toBe('orbit');
    const el0 = sim.state.elements;
    const t0 = sim.state.t;
    const T = 10 * el0.period;
    while (sim.state.t - t0 < T) sim.step(sim.suggestedDt());
    const el1 = sim.state.elements;
    const dRaan = wrapPi(el1.raan - el0.raan);
    const predicted = nodalPrecessionRate(el0.a, el0.e, el0.i) * (sim.state.t - t0);
    // polar orbit: tiny precession but the sign and magnitude must follow J2
    expect(Math.abs(dRaan - predicted) * RAD).toBeLessThan(0.05);
    expect(sim.state.altitude / 1000).toBeGreaterThan(700);
  });
});

describe('autotune covers all vehicles', () => {
  it('every vehicle reaches a parking orbit with half its rated LEO payload', () => {
    const cases: [string, string, string][] = [
      ['soyuz21b', 'baikonur', 'leo'], ['protonm', 'baikonur', 'leo'], ['angaraa5', 'plesetsk', 'leo'],
      ['falcon9', 'cape', 'leo'], ['falconheavy', 'cape', 'leo'], ['atlasv551', 'cape', 'leo'], ['vulcan', 'cape', 'leo'],
      ['ariane64', 'kourou', 'leo'], ['longmarch5', 'wenchang', 'leo'], ['h3', 'tanegashima', 'leo'], ['pslvxl', 'sriharikota', 'leo'],
      ['electron', 'mahia', 'leo'], ['starship', 'starbase', 'leo'], ['soyuz21a', 'vostochny', 'leo'],
    ];
    // Vehicles flown with a low-thrust upper stage (Briz-M, Fregat) are tested with GTO-class payloads:
    // their published LEO figures refer to the configuration without that stage.
    const payloadFor: Record<string, number> = { protonm: 5000, angaraa5: 5000, soyuz21b: 4000 };
    const failures: string[] = [];
    for (const [v, site, orbit] of cases) {
      const spec = vehicleById(v);
      const cfg = mk({ vehicleId: v, siteId: site, orbit: orbitById(orbit), satelliteId: 'cubesats', payloadMassOverride: payloadFor[v] ?? Math.max(100, spec.payloadLEO * 0.5) });
      const tuned = autotune(cfg);
      // A candidate that passed the ascent screen, or — where every candidate
      // inserts away from the plan and makes the orbit with its later burns
      // (Vulcan) — one whose whole mission was flown and reached the target.
      if (!tuned.best || !(tuned.best.success || tuned.best.missionOnTarget)) failures.push(`${v}: ${JSON.stringify(tuned.results.map((r) => [r.kickAngle, r.maxTurnRate, r.reason, Math.round(r.maxQ)]))}`);
      else console.log(`${v}: kick ${tuned.best.kickAngle}° rate ${tuned.best.maxTurnRate}°/s loft ${tuned.best.loftAltitude / 1000} km margin ${Math.round(tuned.best.dvRemaining)} m/s maxQ ${Math.round(tuned.best.maxQ / 1000)} kPa t=${Math.round(tuned.best.tInsertion)} s`);
    }
    expect(failures, failures.join('\n')).toEqual([]);
  }, 120000);
});

describe('insertion orbit planning', () => {
  const baikonur = siteById('baikonur');
  const cape = siteById('cape');

  it('asks whether anything can burn after ascent cut-off', () => {
    // Soyuz-2.1a: the Blok I fires once. With an inert dispenser nothing can
    // burn after cut-off; with the crew ship, the spacecraft can.
    expect(canBurnAfterAscent(vehicleById('soyuz21a'), satelliteById('cubesats'), false)).toBe(false);
    expect(canBurnAfterAscent(vehicleById('soyuz21a'), satelliteById('crew'), false)).toBe(true);
    // Falcon 9's second stage restarts; a stack with a kick stage always can.
    expect(canBurnAfterAscent(vehicleById('falcon9'), satelliteById('cubesats'), false)).toBe(true);
    expect(canBurnAfterAscent(vehicleById('soyuz21b'), satelliteById('cubesats'), true)).toBe(true);
  });

  it('does not cap the insertion apoapsis of a stack that cannot burn again', () => {
    // A restartable stack is handed the capped transfer (2000 km) and raises the
    // apogee with a later burn; a single-shot stack has no later burn, so the
    // ascent is aimed at the apogee the mission actually wants.
    const gto = orbitById('gto');
    const restartable = planMission(
      mk({ vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: gto, payloadMassOverride: 2000 }),
      cape, vehicleById('falcon9'),
    );
    expect(restartable.insertionApoapsis).toBe(DIRECT_APOAPSIS_CAP);
    const singleShot = planMission(
      mk({ vehicleId: 'soyuz21a', satelliteId: 'cubesats', siteId: 'baikonur', orbit: gto, payloadMassOverride: 500 }),
      baikonur, vehicleById('soyuz21a'),
    );
    expect(singleShot.insertionApoapsis).toBeGreaterThan(DIRECT_APOAPSIS_CAP);
  });

  it('inserts a crewed R-7 into a circular parking orbit, not a decaying ellipse', () => {
    // Regression guard: the ascent cut-off floor (140 km, so that a transfer
    // orbit is not flown past its apoapsis while the perigee catches up) must
    // not apply to a circular insertion plan, which has no later burn of its
    // own to raise the perigee with.
    const cfg = mk({ vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbit: orbitById('iss'), payloadMassOverride: 7150 });
    const sim = fly(cfg, 1200, false);
    const park = sim.events.find((e) => e.key === 'evt.parkingOrbit');
    expect(park, sim.events.map((e) => e.key).join(' ')).toBeDefined();
    expect(Number(park!.params!.pe)).toBeGreaterThanOrEqual(195);
    expect(Number(park!.params!.ap)).toBeLessThanOrEqual(215);
  });
});
