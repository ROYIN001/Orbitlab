/**
 * The vehicles of historical flights (roadmap C01, src/data/vehicles.ts
 * `HISTORICAL_VEHICLES`): kept out of the fleet's generic orbit matrix, and
 * held instead to the data rules every vehicle keeps and to the one flight each
 * is here for, point-mass here; Mercury-Redstone 3 in six-DOF in
 * tests/heavy/mercury-redstone.test.ts, and every historical flight's ascent
 * in six-DOF in tests/watch-missions.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { ALL_VEHICLES, HISTORICAL_VEHICLES, VEHICLES, vehicleById } from '../src/data/vehicles';
import { siteById } from '../src/data/sites';
import { satelliteById } from '../src/data/satellites';
import { DEG, G0, R_EARTH } from '../src/physics/constants';
import { gmst, julianDate } from '../src/physics/orbital';
import { add, cross, norm, scale, v3 } from '../src/physics/vec3';
import { moonState, R_MOON } from '../src/physics/lunar/ephemeris';
import { eciToSelenographic } from '../src/physics/lunar/orientation';
import { coastToPerilune } from '../src/physics/lunar/cislunar';
import { APOLLO11 } from '../src/data/apollo11';
import { Simulation } from '../src/physics/simulation';
import { guidanceForVehicle } from '../src/physics/defaults';
import { supportsRigid } from '../src/physics/rigid/config';
import { validateConfigInput } from '../src/config/validation';
import { WATCH_MISSIONS, watchMissionSettings, type WatchMissionId } from '../src/ui/watch-missions';
import { compareEvents, simPayloadOrbit } from '../src/ui/flown';
import { expectFlownMr3, flyMr3 } from './mr3-harness';
import { captureFrame } from '../src/physics/frame';
import { autoWarp, flightEnding, watchBeat, watchReadout } from '../src/ui/watch-logic';

const burn = (propellant: number, thrustVac: number, ispVac: number) => propellant / (thrustVac / (G0 * ispVac));

describe('historical vehicles', () => {
  it('are their own list, known everywhere a mission names a vehicle, and never in the fleet matrix', () => {
    const ids = HISTORICAL_VEHICLES.map((v) => v.id);
    expect(new Set([...VEHICLES.map((v) => v.id), ...ids]).size).toBe(ALL_VEHICLES.length);
    for (const id of ids) {
      expect(VEHICLES.some((v) => v.id === id)).toBe(false);
      expect(vehicleById(id).id).toBe(id);
      expect(supportsRigid(id)).toBe(true);
    }
  });

  it('keep the data rules: positive masses, sites that exist, stages that burn about as long as published', () => {
    for (const v of HISTORICAL_VEHICLES) {
      for (const site of v.sites) expect(siteById(site).id).toBe(site);
      for (const st of v.stages) {
        expect(st.dryMass, `${v.id} ${st.id}`).toBeGreaterThan(0);
        expect(st.propellantMass).toBeGreaterThan(st.dryMass);
        expect(st.engine.thrustVac).toBeGreaterThanOrEqual(st.engine.thrustSL);
        expect(st.engine.ispVac).toBeGreaterThan(st.engine.ispSL);
        for (const b of st.boosters ?? []) expect(b.propellantMass).toBeGreaterThan(b.dryMass);
      }
    }
    // burn times against the published ones: strap-ons 116–120 s, cores 295–301 s, Blok E 365 s
    const sputnik = vehicleById('sputnik8k71ps'), vostok = vehicleById('vostokk');
    const b = (v: typeof sputnik) => v.stages[0].boosters![0];
    expect(burn(b(sputnik).propellantMass, b(sputnik).engine.thrustVac, b(sputnik).engine.ispVac)).toBeGreaterThan(110);
    expect(burn(b(sputnik).propellantMass, b(sputnik).engine.thrustVac, b(sputnik).engine.ispVac)).toBeLessThan(125);
    expect(burn(sputnik.stages[0].propellantMass, sputnik.stages[0].engine.thrustVac, sputnik.stages[0].engine.ispVac)).toBeGreaterThan(285);
    expect(burn(sputnik.stages[0].propellantMass, sputnik.stages[0].engine.thrustVac, sputnik.stages[0].engine.ispVac)).toBeLessThan(310);
    const e = vostok.stages[1];
    expect(Math.abs(burn(e.propellantMass, e.engine.thrustVac, e.engine.ispVac) - 365)).toBeLessThan(10);
    // the S-IC: five F-1s from ignition 2.5 s before liftoff to the centre engine's
    // shutdown at T+135.2 s, four to the LOX running out at T+161.63 s (AS-506)
    const sic = vehicleById('saturnv').stages[0];
    const flow = sic.engine.thrustVac / (G0 * sic.engine.ispVac);
    expect(Math.abs(sic.propellantMass / flow - (137.7 * 5 + (161.63 - 135.2) * 4)) / 5).toBeLessThan(2);
    // the Redstone: 143.5 s nominal (MR-3 cut off at 141.8)
    const redstone = vehicleById('mercuryredstone').stages[0];
    expect(Math.abs(burn(redstone.propellantMass, redstone.engine.thrustVac, redstone.engine.ispVac) - 143.5)).toBeLessThan(5);
  });

  it('carry their own spacecraft, and only they do', () => {
    expect(satelliteById('ps1').carriers).toEqual(['sputnik8k71ps']);
    expect(satelliteById('vostok3ka').carriers).toEqual(['vostokk']);
    expect(satelliteById('mercury').carriers).toEqual(['mercuryredstone']);
    expect(satelliteById('apollo').carriers).toEqual(['saturnv']);
    const s = watchMissionSettings('vostok1');
    expect(validateConfigInput(s)).toEqual([]);
    expect(validateConfigInput({ ...s, satelliteId: 'ps1' }).some((i) => i.field === 'setup.satellite')).toBe(true);
  });
});

const fly = (id: WatchMissionId) => {
  const s = watchMissionSettings(id);
  const sim = new Simulation({
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
    payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
    failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
  }, { headless: true });
  // on past the cut-off: the spacecraft separates after it
  while (!sim.isFailed() && sim.state.t < 1000 && !sim.events.some((e) => e.key === 'evt.payloadSep' && sim.state.t > e.t + 10)) sim.step(sim.suggestedDt());
  return sim;
};

describe('the flights they are here for, point-mass', () => {
  it.each(WATCH_MISSIONS.filter((m) => HISTORICAL_VEHICLES.some((v) => v.id === m.vehicleId)).map((m) => m.id))(
    '%s reaches the flown orbit on the flown timeline', { timeout: 300_000 }, (id) => {
      const sim = fly(id);
      const m = WATCH_MISSIONS.find((x) => x.id === id)!;
      const log = sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
      expect(sim.isFailed(), log).toBe(false);
      const orbit = simPayloadOrbit(sim.events);
      expect(orbit, log).not.toBeNull();
      // within 25 km of the flown perigee and 15 % of the apogee, 0.3° of the plane
      expect(Math.abs(orbit!.perigee - m.flown!.orbit!.perigee), log).toBeLessThan(25);
      expect(Math.abs(orbit!.apogee - m.flown!.orbit!.apogee) / m.flown!.orbit!.apogee, log).toBeLessThan(0.15);
      expect(Math.abs(orbit!.inclination - m.flown!.orbit!.inclination)).toBeLessThan(0.3);
      // up to where this flight stops (Apollo's flight on from its parking orbit is below)
      for (const row of compareEvents(m.flown!, sim.events).filter((r) => r.real <= sim.state.t)) {
        expect(row.sim, `${id} ${row.key}`).not.toBeNull();
        expect(Math.abs(row.delta!), `${id} ${row.key}: ${log}`).toBeLessThan(Math.max(20, 0.1 * row.real));
      }
    });
});

describe('Mercury-Redstone 3, point-mass', () => {
  it('lobs Freedom 7 to 187 km and brings it down in the Atlantic under its parachutes, as flown', { timeout: 300_000 }, () => {
    expectFlownMr3(flyMr3('pointMass'));
  });
});

describe('Mercury-Redstone 3 in the viewer', () => {
  it('tells the flight beat by beat, from the cut-off to the water, and ends on the splashdown', { timeout: 300_000 }, () => {
    const s = watchMissionSettings('mr3');
    const sim = new Simulation({
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
      payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
      failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
    }, { headless: true });
    const beats: string[] = [];
    let ending: string | null = null;
    while (!sim.isFailed() && sim.state.t < 1200 && !ending) {
      sim.step(sim.suggestedDt());
      const frame = captureFrame(sim);
      const beat = watchBeat(frame, sim.events);
      if (beats[beats.length - 1] !== beat) beats.push(beat);
      ending = flightEnding(frame, sim.events);
    }
    for (const b of ['capsuleCutoff', 'capsuleSep', 'capsuleArc', 'retroFire', 'capsuleEntry', 'capsuleDrogue', 'capsuleMain', 'capsuleSplash']) {
      expect(beats, beats.join(' ')).toContain(b);
    }
    // in the order they were flown
    const order = ['capsuleCutoff', 'capsuleSep', 'retroFire', 'capsuleEntry', 'capsuleDrogue', 'capsuleMain', 'capsuleSplash'].map((b) => beats.indexOf(b));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(ending).toBe('splashdown');
  });
});

describe('Apollo 11, point-mass', () => {
  it('shuts the centre engines down, drops the interstage ring and the tower, and shifts the S-II\'s mixture on the flown timeline', { timeout: 300_000 }, () => {
    const s = watchMissionSettings('apollo11');
    const sim = new Simulation({
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
      payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
      failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
    }, { headless: true });
    const massAt = (t: number) => { while (sim.state.t < t && !sim.isFailed()) sim.step(sim.suggestedDt()); return sim.vehicle.totalMass(); };
    // the S-IC's centre engine: four of five running after T+135.2 s
    massAt(136);
    const sic = sim.vehicle.stages[0];
    expect(sic.shutEngines).toEqual([4]);
    expect(sic.engineFraction).toBeCloseTo(0.8, 9);
    // the ring off the S-II's dry mass, then the tower off the payload
    const payload0 = sim.vehicle.payloadMass;
    massAt(195);
    expect(sim.vehicle.jettisoned).toEqual({ interstage: true, tower: false });
    expect(sim.vehicle.stages[1].spec.dryMass).toBe(vehicleById('saturnv').stages[1].dryMass - 4591);
    massAt(200);
    expect(sim.vehicle.jettisoned.tower).toBe(true);
    // the gravity turn flown across the staging to T+204.1 s, as the tilt programme held until the iterative guidance
    expect(sim.state.ascentPhase).toBe('gravityTurn');
    expect(payload0 - sim.vehicle.payloadMass).toBe(4042);
    // the S-II after its mixture shift: 770.7 kN an engine, four of them
    massAt(210);
    expect(sim.state.ascentPhase).toBe('closedLoop');
    massAt(500);
    expect(sim.vehicle.stages[1].spec.engine.thrustVac).toBeCloseTo(770.7e3, 3);
    expect(sim.vehicle.stages[1].engineFraction).toBeCloseTo(0.8, 9);
    const at = (key: string, n = 1) => sim.events.filter((e) => e.key === key)[n - 1]?.t;
    expect(Math.abs(at('evt.ceco')! - 135.2)).toBeLessThan(0.2);
    expect(Math.abs(at('evt.ceco', 2)! - 460.62)).toBeLessThan(1.5);
    expect(Math.abs(at('evt.interstageSep')! - 192.3)).toBeLessThan(1.5);
    expect(Math.abs(at('evt.towerJettison')! - 197.9)).toBeLessThan(1.5);
    // the vehicle's own spec is never touched
    expect(vehicleById('saturnv').stages[1].engine.thrustVac).toBe(1028.3e3);
    // and Apollo stays on the S-IVB in the parking orbit
    massAt(740);
    expect(sim.events.some((e) => e.key === 'evt.targetOrbit')).toBe(true);
    expect(sim.state.payloadSeparated).toBe(false);
    expect(sim.events.some((e) => e.key === 'evt.payloadSep')).toBe(false);
  });
});

describe('Apollo 11 from its parking orbit to the Moon, point-mass', () => {
  const s = watchMissionSettings('apollo11');
  const sim = new Simulation({
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
    payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
    failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
  }, { headless: true });
  /** to exactly `t`, the steps landing on it */
  const flyTo = (t: number) => { while (!sim.isFailed() && sim.state.t < t - 1e-6) sim.advance(t - sim.state.t, 100_000); };
  const log = () => sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
  const at = (key: string, n = 1) => sim.events.filter((e) => e.key === key)[n - 1];
  const moonRel = () => {
    const m = moonState(sim.plan.jd0 + sim.state.t / 86400);
    return { d: Math.hypot(sim.state.r.x - m.r.x, sim.state.r.y - m.r.y, sim.state.r.z - m.r.z), v: Math.hypot(sim.state.v.x - m.v.x, sim.state.v.y - m.v.y, sim.state.v.z - m.v.z) };
  };

  it('inserts into the flown plane and coasts with the S-IVB\'s hydrogen vent pushing it, to the restart', () => {
    flyTo(709.3);
    // FER Table 4-5: the node 123.088° east of the launch meridian at T−17 s, 359.624° of date; 32.521°
    expect(Math.abs(sim.state.elements.raan / DEG - 359.624)).toBeLessThan(0.15);
    expect(Math.abs(sim.state.elements.i / DEG - 32.521)).toBeLessThan(0.02);
    const m0 = sim.vehicle.totalMass();
    flyTo(9856.1);
    // FER Table 20-10: 135,102 kg at the first burn's end, 134,047 kg at the restart — 1,053 kg vented on the
    // way; the restart's mass as near as the ascent's first S-IVB burn is to the flown one's length (7 s short)
    expect(m0 - sim.vehicle.totalMass()).toBeCloseTo(1053, -1);
    expect(Math.abs(sim.vehicle.totalMass() - 134047)).toBeLessThan(2000);
  });

  it('relights the S-IVB on time, steers it onto the flown conic, and docks and pulls the LM out on the flown timeline', () => {
    flyTo(15500);
    expect(sim.isFailed(), log()).toBe(false);
    const tli = at('evt.tli');
    expect(tli, log()).toBeDefined();
    // the state ten seconds after the cut-off (Orloff, from the FER): C3 −1.3916 km²/s², e 0.97696, 31.383°,
    // perigee 4.410° past the node
    expect(Math.abs(Number(tli!.params!.c3) + 1.3916)).toBeLessThan(0.005);
    expect(Math.abs(Number(tli!.params!.e) - 0.97696)).toBeLessThan(0.0003);
    expect(Math.abs(Number(tli!.params!.inc) - 31.383)).toBeLessThan(0.05);
    expect(Math.abs(Number(tli!.params!.argp) - 4.410)).toBeLessThan(0.05);
    // the cut-off: FER, 10,203.07 s
    expect(Math.abs(tli!.t - 10203.07)).toBeLessThan(10);
    const m = WATCH_MISSIONS.find((x) => x.id === 'apollo11')!;
    for (const row of compareEvents(m.flown!, sim.events).filter((r) => r.real > 9000 && r.real < 15500)) {
      expect(row.sim, `${row.key}: ${log()}`).not.toBeNull();
      expect(Math.abs(row.delta!), `${row.key}`).toBeLessThan(15);
    }
    // the CSM and LM on their own, as they were weighed at the ejection; the S-IVB left behind
    expect(sim.state.payloadSeparated).toBe(true);
    expect(sim.apollo.phase).toBe('extracted');
    expect(sim.vehicle.totalMass()).toBe(APOLLO11.dockedMass);
    // Mission Report Table 7-III: the pericynthion after the separation, 827.2 n mi at 75:07:47 — within the
    // few hundred miles that a foot a second at the injection moves it (1.6 ft/s moved it 177 n mi)
    const p = sim.apollo.frame()!.perilune!;
    expect(Math.abs(p.alt - APOLLO11.pericynthion.separation.alt)).toBeLessThan(300 * 1852);
    expect(Math.abs(p.t - APOLLO11.pericynthion.separation.t)).toBeLessThan(20 * 60);
  });

  it('flies the evasive burn and the midcourse correction on time, and arrives at the flown pericynthion', () => {
    flyTo(96400);
    const ev = at('evt.evasive'), mcc = at('evt.mcc');
    expect(ev, log()).toBeDefined();
    expect(mcc, log()).toBeDefined();
    expect(ev!.t).toBeCloseTo(APOLLO11.evasive.t, 6);
    expect(mcc!.t).toBeCloseTo(APOLLO11.mcc2.t, 6);
    // the evasive burn's flown 19.7 ft/s put the pericynthion at the planned 167.7 n mi (310.6 km)
    const cut = sim.events.filter((e) => e.key === 'evt.spsCutoff');
    expect(Math.abs(Number(cut[0].params!.alt) - 310.6)).toBeLessThan(4);
    // MCC-2: 20.9 ft/s flown (6.37 m/s); the correction this flight needs is as small
    expect(Number(mcc!.params!.dv)).toBeGreaterThan(1);
    expect(Math.abs(Number(mcc!.params!.dv) - APOLLO11.mcc2.dv)).toBeLessThan(4);
    // Table 7-III after MCC-2: 61.5 n mi (60.0 aimed at), 0.17° N 173.57° E, 75:53:35
    const p = sim.apollo.frame()!.perilune!, want = APOLLO11.pericynthion.mcc2;
    expect(Math.abs(p.alt - APOLLO11.mcc2.perilune)).toBeLessThan(1 * 1852);
    expect(Math.abs(p.t - want.t)).toBeLessThan(60);
    expect(Math.abs(p.lat - want.lat)).toBeLessThan(0.1);
    expect(Math.abs(p.lon - want.lon)).toBeLessThan(1);
  });

  it('crosses into the Moon\'s sphere of influence where Mission Control saw it, and reaches the Moon for the lunar orbit insertion', () => {
    flyTo(221995);
    // the Public Affairs commentary at 61:39:55: 186,437 n mi above the Earth, 33,822 n mi above the Moon,
    // 2,990 ft/s from the Earth and 3,772 ft/s from the Moon
    expect(Math.abs(norm(sim.state.r) - R_EARTH - 186437 * 1852)).toBeLessThan(300e3);
    expect(Math.abs(norm(sim.state.v) - 2990 * 0.3048)).toBeLessThan(5);
    const rel = moonRel();
    expect(Math.abs(rel.d - R_MOON - 33822 * 1852)).toBeLessThan(300e3);
    expect(Math.abs(rel.v - 3772 * 0.3048)).toBeLessThan(5);
    flyTo(APOLLO11.loi1.t + 1);
    expect(sim.isFailed(), log()).toBe(false);
    expect(Math.abs(at('evt.lunarSoi')!.t - APOLLO11.lunarSoi)).toBeLessThan(120);
    expect(sim.apollo.phase).toBe('arrival');
    // at the lunar orbit insertion's ignition: MR Table 7-II, 86.7 n mi above the landing site's radius, 8,250 ft/s
    const now = moonRel();
    expect(Math.abs(now.d - APOLLO11.siteRadius - 86.7 * 1852)).toBeLessThan(15e3);
    expect(Math.abs(now.v - 8250 * 0.3048)).toBeLessThan(10);
    // the flight passes the pericynthion at 8,334 ft/s (Table 7-III)
    flyTo(APOLLO11.pericynthion.mcc2.t);
    expect(Math.abs(moonRel().v - 8334 * 0.3048)).toBeLessThan(10);
  });
});

describe('Apollo 11 in the viewer', () => {
  it('tells the flight to the Moon beat by beat, each coast at a preset speed, and ends at the lunar orbit insertion', { timeout: 300_000 }, () => {
    const s = watchMissionSettings('apollo11');
    const sim = new Simulation({
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
      payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
      failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
    }, { headless: true });
    const beats: string[] = [];
    const warps = new Set<number>();
    let ending: string | null = null;
    let last: ReturnType<typeof captureFrame> | undefined;
    while (!sim.isFailed() && sim.state.t < 290000 && !ending) {
      sim.step(sim.suggestedDt());
      if (sim.state.t < 9000) continue;
      const frame = captureFrame(sim);
      const beat = watchBeat(frame, sim.events);
      if (beats[beats.length - 1] !== beat) beats.push(beat);
      warps.add(autoWarp(frame, beat));
      ending = flightEnding(frame, sim.events);
      if (ending) last = frame;
    }
    // the readouts switch to the Moon as Mission Control's displays did: height above it and speed relative to it
    const r = watchReadout(last!);
    expect(r.moon).toBe(true);
    expect(r.altitude).toBeGreaterThan(100e3);
    expect(r.altitude).toBeLessThan(170e3);
    expect(Math.abs(r.speed - 2520)).toBeLessThan(20);
    // in the order they were flown: each after the one before it
    let at = -1;
    for (const b of ['tliBurn', 'tliDone', 'transposition', 'apolloDocked', 'extraction', 'evasiveBurn', 'translunarCoast', 'midcourseBurn',
      'lunarSoi', 'lunarApproach', 'lunarArrival']) {
      at = beats.indexOf(b, at + 1);
      expect(at, `${b}: ${beats.join(' ')}`).toBeGreaterThanOrEqual(0);
    }
    expect(ending).toBe('lunarArrival');
    // every speed one of the workspace selector's presets (src/main.ts)
    for (const w of warps) expect([0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 500, 1000, 5000, 10000, 50000]).toContain(w);
    expect(warps.has(5000)).toBe(true);
  });
});

describe('the flown injection, propagated', () => {
  it('passes the Moon where the Mission Report predicted it would after the injection', () => {
    // Orloff's state ten seconds after the cut-off, 2:50:13.03: 9.9204° N (geocentric), 164.8373° W, 334.44 km,
    // 35,545.6 ft/s, 7.367° up, heading 60.073°
    const jd0 = julianDate(new Date('1969-07-16T13:32:00Z')), t = 10213.03;
    const lat = 9.9204 * DEG, lam = -164.8373 * DEG + gmst(jd0 + t / 86400);
    const rm = 6378166 * (1 - Math.sin(lat) ** 2 / 298.3) + 334.44e3;
    const up = v3(Math.cos(lat) * Math.cos(lam), Math.cos(lat) * Math.sin(lam), Math.sin(lat));
    const east = v3(-Math.sin(lam), Math.cos(lam), 0), north = cross(up, east);
    const V = 35545.6 * 0.3048, g = 7.367 * DEG, h = 60.073 * DEG;
    const v = add(scale(up, V * Math.sin(g)), scale(add(scale(north, Math.cos(h)), scale(east, Math.sin(h))), V * Math.cos(g)));
    const p = coastToPerilune(jd0, t, { r: scale(up, rm), v }, 400000)!;
    // Table 7-III: 896.3 n mi at 75:05:21 — each foot a second at the injection moves it a hundred miles
    // (1.6 ft/s moved it from the planned 718.9), and the state is given to a tenth of one
    const want = APOLLO11.pericynthion.tli;
    expect(Math.abs(norm(p.rel.r) - APOLLO11.siteRadius - want.alt)).toBeLessThan(300 * 1852);
    expect(Math.abs(p.t - want.t)).toBeLessThan(15 * 60);
    expect(Math.abs(eciToSelenographic(p.rel.r, jd0 + p.t / 86400).lon - want.lon)).toBeLessThan(5);
  });
});
