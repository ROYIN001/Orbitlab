import { describe, it, expect } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { autotune, runAscent } from '../src/physics/autotune';
import { DEFAULT_GUIDANCE, DEFAULT_FAILURE, guidanceForVehicle } from '../src/physics/defaults';
import { orbitById } from '../src/data/orbits';
import { VEHICLES } from '../src/data/vehicles';
import { liftoffMass, liftoffThrust, idealDeltaV } from '../src/physics/vehicle';
import type { MissionConfig } from '../src/types';
import { G0 } from '../src/physics/constants';
import { launchWindows } from '../src/physics/mission';
import { siteById } from '../src/data/sites';

const mk = (over: Partial<MissionConfig>): MissionConfig => ({
  vehicleId: 'falcon9', satelliteId: 'starlink', siteId: 'cape', orbit: orbitById('iss'),
  launchTime: new Date(Date.UTC(2026, 8, 15, 12, 0, 0)), guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE },
  boosterRecovery: false, ...over,
});

function flyToEnd(cfg: MissionConfig, maxTime: number): Simulation {
  const sim = new Simulation(cfg, { headless: true });
  let guard = 0;
  while (!sim.done && sim.state.t < maxTime && guard++ < 400000) sim.step(sim.suggestedDt());
  if (sim.state.status === 'orbit') sim.advance(120);
  return sim;
}

describe('vehicle sanity', () => {
  it('every vehicle has liftoff T/W > 1.1 and a plausible ideal delta-v', () => {
    for (const v of VEHICLES) {
      const m = liftoffMass(v, v.payloadLEO * 0.5);
      const twr = liftoffThrust(v) / (m * G0);
      expect(twr, `${v.name} T/W`).toBeGreaterThan(1.1);
      expect(twr, `${v.name} T/W`).toBeLessThan(2.6);
      const dv = idealDeltaV(v, v.payloadLEO * 0.5);
      // 9 500 m/s. The floor is a sanity bound on the DATA — a stage mass or an
      // Isp wrong by a factor shows up here — and nothing in the fleet is near
      // it: measured this wave at `payloadLEO / 2`, the minimum is Long March 2D
      // at 10 083 m/s, 583 m/s of clearance, and the next two are Falcon Heavy
      // (10 315) and PSLV-XL (10 468).
      //
      // It was briefly lowered to 9 300 to make room for H-IIA 202's published
      // 13 600 / 3 000 kg stage masses, on the strength of Atlas V 551 at 9 583
      // and PSLV-XL at 9 542 "sitting within 1 % of 9 500". Those two figures
      // were the PRE-B13 ones, from the delta-v accounting that ignored the
      // parallel boosters and the fairing; with B13's correction the same two
      // vehicles measure 11 566 and 10 468 (review follow-up). So the guard was
      // weakened against numbers the same wave had already replaced, for a data
      // change that has not landed.
      //
      // Hand-off to the fleet-data owner: if and when H-IIA's published stage
      // masses are applied, re-measure `idealDeltaV(h2a202, payloadLEO / 2)` —
      // it is 12 121 m/s today — and lower this floor only if that measurement
      // actually requires it, with the new number quoted here.
      expect(dv, `${v.name} dv`).toBeGreaterThan(9500);
      expect(dv, `${v.name} dv`).toBeLessThan(16000);
    }
  });
});

describe('guidance resolution', () => {
  it('an untouched configuration flies the vehicle program, and it is the one guidanceForVehicle reports', () => {
    for (const v of VEHICLES) {
      const sim = new Simulation(mk({ vehicleId: v.id, satelliteId: 'cubesats', siteId: v.sites[0], payloadMassOverride: v.payloadLEO * 0.25 }), { headless: true });
      expect(sim.cfg.guidance, v.id).toEqual(guidanceForVehicle(v));
      expect(sim.cfg.guidanceResolved).toBe(true);
    }
  });

  it('a resolved configuration is flown exactly as given', () => {
    const g = { ...guidanceForVehicle(VEHICLES.find((v) => v.id === 'falcon9')!), kickAngle: 7.5 };
    const sim = new Simulation(mk({ guidance: g, guidanceResolved: true }), { headless: true });
    expect(sim.cfg.guidance.kickAngle).toBe(7.5);
  });

  it('a tuning result reports the guidance it flew, and re-flying it reproduces the trajectory', () => {
    // 2.5 deg is exactly DEFAULT_GUIDANCE.kickAngle, so for a vehicle whose own
    // default is 1.5 deg the merge replaces it. The tuner must report 1.5 (what
    // it measured), not 2.5 (what it was asked for) — otherwise writing the
    // result back into the panel changes the trajectory that was measured.
    const cfg = mk({ payloadMassOverride: 5000 });
    const r = runAscent(cfg, 2.5, 0.3, 0);
    expect(r.kickAngle).toBe(guidanceForVehicle(VEHICLES.find((v) => v.id === 'falcon9')!).kickAngle);
    const replay = new Simulation({ ...cfg, guidance: r.guidance, guidanceResolved: true }, { headless: true });
    let guard = 0;
    while (!replay.done && replay.state.t < 1200 && guard++ < 200000) replay.step(replay.suggestedDt());
    const seco = replay.events.find((e) => e.key === 'evt.parkingOrbit');
    expect(seco?.t).toBeCloseTo(r.tInsertion, 3);
  }, 30000);
});

describe('ascent to parking orbit', () => {
  it('Falcon 9 reaches a 200 km parking orbit toward the ISS plane', () => {
    const cfg = mk({});
    const tuned = autotune(cfg);
    expect(tuned.best, JSON.stringify(tuned.results)).not.toBeNull();
    const r = tuned.best!;
    expect(r.success).toBe(true);
    expect(r.maxQ).toBeLessThan(40e3);
    expect(r.dvRemaining).toBeGreaterThan(300);
  }, 30000);

  it('Soyuz-2.1a from Baikonur with a 7.15 t crew ship reaches orbit', () => {
    const cfg = mk({ vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur' });
    const tuned = autotune(cfg);
    expect(tuned.best, JSON.stringify(tuned.results)).not.toBeNull();
    expect(tuned.best!.success).toBe(true);
  }, 30000);

  it('Electron from Mahia with 200 kg to SSO reaches orbit', () => {
    const cfg = mk({ vehicleId: 'electron', satelliteId: 'cubesats', siteId: 'mahia', orbit: orbitById('sso'), payloadMassOverride: 200 });
    const tuned = autotune(cfg);
    expect(tuned.best, JSON.stringify(tuned.results)).not.toBeNull();
    expect(tuned.best!.success).toBe(true);
    // An autotune is 96 headless flights; with the whole suite running in
    // parallel that does not fit vitest's default 5 s budget.
  }, 30000);

  it('a hopeless payload does not reach orbit', () => {
    const cfg = mk({ vehicleId: 'electron', satelliteId: 'comsat', siteId: 'mahia', orbit: orbitById('leo'), payloadMassOverride: 5000 });
    const r = runAscent(cfg, 6);
    expect(r.success).toBe(false);
  });
});

describe('full missions', () => {
  it('Falcon 9 to the ISS orbit: parking orbit, Hohmann transfer, circularisation, payload separation', () => {
    const cfg = mk({});
    cfg.launchTime = launchWindows(cfg.orbit, siteById(cfg.siteId), cfg.launchTime, 1)[0].time;
    const tuned = autotune(cfg);
    const sim = flyToEnd({ ...cfg, guidance: { ...cfg.guidance, kickAngle: tuned.best!.kickAngle, maxTurnRate: tuned.best!.maxTurnRate, loftAltitude: tuned.best!.loftAltitude } }, 4 * 3600);
    const keys = sim.events.map((e) => e.key);
    expect(keys, keys.join(',')).toContain('evt.targetOrbit');
    expect(keys).toContain('evt.payloadSep');
    const el = sim.state.elements;
    expect(el.apoapsisAlt / 1000).toBeCloseTo(420, -1);
    expect(el.periapsisAlt / 1000).toBeCloseTo(420, -1);
    expect(el.i * 180 / Math.PI).toBeCloseTo(51.64, 0);
    expect(sim.state.status).toBe('orbit');
  }, 30000);

  it('Proton-M/Briz-M from Baikonur delivers a comsat into GEO (plane change at apogee)', () => {
    const cfg = mk({ vehicleId: 'protonm', satelliteId: 'comsat', siteId: 'baikonur', orbit: orbitById('geo'), payloadMassOverride: 2500 });
    const tuned = autotune(cfg);
    expect(tuned.best).not.toBeNull();
    const sim = flyToEnd({ ...cfg, guidance: { ...cfg.guidance, kickAngle: tuned.best!.kickAngle, maxTurnRate: tuned.best!.maxTurnRate, loftAltitude: tuned.best!.loftAltitude } }, 4 * 86400);
    const keys = sim.events.map((e) => e.key);
    expect(keys, sim.events.map((e) => `${Math.round(e.t)}:${e.key}:${JSON.stringify(e.params)}`).join('\n')).toContain('evt.targetOrbit');
    const el = sim.state.elements;
    expect(el.i * 180 / Math.PI).toBeLessThan(1.5);
    expect(el.apoapsisAlt / 1000).toBeCloseTo(35786, -3);
    expect(el.periapsisAlt / 1000).toBeCloseTo(35786, -3);
    // A Briz-M GEO mission is four days of simulated flight with several
    // multi-pass burns, so it needs more than vitest's default 5 s budget.
  }, 60000);
});
