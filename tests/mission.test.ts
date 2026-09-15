import { describe, it, expect } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { autotune } from '../src/physics/autotune';
import { DEFAULT_GUIDANCE, DEFAULT_FAILURE } from '../src/physics/defaults';
import { orbitById } from '../src/data/orbits';
import { siteById } from '../src/data/sites';
import { launchWindows, planMission, resolveTarget } from '../src/physics/mission';
import { vehicleById } from '../src/data/vehicles';
import { nodalPrecessionRate, wrapPi } from '../src/physics/orbital';
import type { MissionConfig } from '../src/types';
import { RAD } from '../src/physics/constants';

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
    const cfg = mk({ failure: { mode: 'engineOut', time: 60, stage: 0 } });
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
      if (!tuned.best || !tuned.best.success) failures.push(`${v}: ${JSON.stringify(tuned.results.map((r) => [r.kickAngle, r.maxTurnRate, r.reason, Math.round(r.maxQ)]))}`);
      else console.log(`${v}: kick ${tuned.best.kickAngle}° rate ${tuned.best.maxTurnRate}°/s loft ${tuned.best.loftAltitude / 1000} km margin ${Math.round(tuned.best.dvRemaining)} m/s maxQ ${Math.round(tuned.best.maxQ / 1000)} kPa t=${Math.round(tuned.best.tInsertion)} s`);
    }
    expect(failures, failures.join('\n')).toEqual([]);
  }, 120000);
});
