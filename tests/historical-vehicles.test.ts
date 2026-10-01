/**
 * The vehicles of historical flights (roadmap C01, src/data/vehicles.ts
 * `HISTORICAL_VEHICLES`): kept out of the fleet's generic orbit matrix, and
 * held instead to the data rules every vehicle keeps and to the one flight each
 * is here for, point-mass here; Mercury-Redstone 3 in six-DOF in
 * tests/heavy/mercury-redstone.test.ts, and every historical flight's ascent
 * in six-DOF in tests/watch-missions-flights-*.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { ALL_VEHICLES, HISTORICAL_VEHICLES, VEHICLES, vehicleById } from '../src/data/vehicles';
import { siteById } from '../src/data/sites';
import { satelliteById } from '../src/data/satellites';
import { DEG, G0, MU_EARTH, R_EARTH } from '../src/physics/constants';
import { gmst, julianDate } from '../src/physics/orbital';
import { add, cross, dot, norm, normalize, scale, sub, v3 } from '../src/physics/vec3';
import { moonState, R_MOON } from '../src/physics/lunar/ephemeris';
import { eciToSelenographic, selenographicToEci } from '../src/physics/lunar/orientation';
import { coastToPerilune } from '../src/physics/lunar/cislunar';
import { APOLLO11 } from '../src/data/apollo11';
import { Simulation } from '../src/physics/simulation';
import { guidanceForVehicle } from '../src/physics/defaults';
import { supportsRigid } from '../src/physics/rigid/config';
import { validateConfigInput } from '../src/config/validation';
import { WATCH_MISSIONS, watchMissionSettings, type WatchMissionId } from '../src/ui/watch-missions';
import { compareEvents, simPayloadOrbit } from '../src/ui/flown';
import { expectFlownMr3, flyMr3 } from './mr3-harness';
import { expectFlownVostok1, flyVostok1 } from './vostok1-harness';
import { captureFrame } from '../src/physics/frame';
import { autoWarp, flightEnding, watchBeat, watchReadout } from '../src/ui/watch-logic';
import { entryGlow } from '../src/render/apollo-cm';

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
    // burn times against the flown ones: strap-ons 116–120 s, cores 295–301 s (Vostok-K's from its
    // ignition 2.5 s before liftoff to about T+300 s), Blok E about 375 s (T+300 to T+676, ESA)
    const sputnik = vehicleById('r7sputnik'), vostok = vehicleById('vostokk');
    const b = (v: typeof sputnik) => v.stages[0].boosters![0];
    expect(burn(b(sputnik).propellantMass, b(sputnik).engine.thrustVac, b(sputnik).engine.ispVac)).toBeGreaterThan(110);
    expect(burn(b(sputnik).propellantMass, b(sputnik).engine.thrustVac, b(sputnik).engine.ispVac)).toBeLessThan(125);
    expect(burn(sputnik.stages[0].propellantMass, sputnik.stages[0].engine.thrustVac, sputnik.stages[0].engine.ispVac)).toBeGreaterThan(285);
    expect(burn(sputnik.stages[0].propellantMass, sputnik.stages[0].engine.thrustVac, sputnik.stages[0].engine.ispVac)).toBeLessThan(310);
    const e = vostok.stages[1];
    expect(Math.abs(burn(e.propellantMass, e.engine.thrustVac, e.engine.ispVac) - 375)).toBeLessThan(3);
    expect(Math.abs(burn(b(vostok).propellantMass, b(vostok).engine.thrustVac, b(vostok).engine.ispVac) - 2.5 - 118)).toBeLessThan(2);
    expect(Math.abs(burn(vostok.stages[0].propellantMass, vostok.stages[0].engine.thrustVac, vostok.stages[0].engine.ispVac) - 2.5 - 302)).toBeLessThan(4);
    // the S-IC: five F-1s from ignition 2.5 s before liftoff to the centre engine's
    // shutdown at T+135.2 s, four to the LOX running out at T+161.63 s (AS-506)
    const sic = vehicleById('saturnv506').stages[0];
    const flow = sic.engine.thrustVac / (G0 * sic.engine.ispVac);
    expect(Math.abs(sic.propellantMass / flow - (137.7 * 5 + (161.63 - 135.2) * 4)) / 5).toBeLessThan(2);
    // the Redstone: 143.5 s nominal (MR-3 cut off at 141.8)
    const redstone = vehicleById('mercuryredstone').stages[0];
    expect(Math.abs(burn(redstone.propellantMass, redstone.engine.thrustVac, redstone.engine.ispVac) - 143.5)).toBeLessThan(5);
  });

  it('carry their own spacecraft, and only they do', () => {
    expect(satelliteById('ps1').carriers).toEqual(['r7sputnik']);
    expect(satelliteById('vostok1').carriers).toEqual(['vostokk']);
    expect(satelliteById('mercury').carriers).toEqual(['mercuryredstone']);
    expect(satelliteById('apollo11').carriers).toEqual(['saturnv506']);
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

describe('Vostok-1\'s over-burn, point-mass', () => {
  // Baturin (Novaya Gazeta, 11 April 2021): the radio command to shut the core down did not pass, and the
  // backups stopped the core and Blok E 25.43 m/s late — 327 km of apogee where 230 km was planned. The
  // guidance aims at the planned orbit (`OrbitSpec.aim`) and Blok E burns the excess on (`backupCutoff`).
  const toCutoff = (orbit: ReturnType<typeof watchMissionSettings>['orbit']) => {
    const s = watchMissionSettings('vostok1');
    const sim = new Simulation({
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit, launchTime: s.launchTime, padId: s.padId,
      payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
      failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
    }, { headless: true });
    // on through the engine's tail-off
    const seco = () => sim.events.find((e) => e.key === 'evt.seco');
    while (!sim.isFailed() && sim.state.t < 800 && !(seco() && sim.state.t > seco()!.t + 5)) sim.step(sim.suggestedDt());
    const el = sim.state.elements;
    const rp = R_EARTH + el.periapsisAlt, a = R_EARTH + (el.periapsisAlt + el.apoapsisAlt) / 2;
    return { sim, seco: seco()!.t, el, vPerigee: Math.sqrt(MU_EARTH * (2 / rp - 1 / a)), left: sim.vehicle.stages[1].propellant };
  };

  it('aims at the planned 168 × 230 km and is cut off on the backup 25.4 m/s later, in the flown 168 × 314 km', { timeout: 120_000 }, () => {
    const s = watchMissionSettings('vostok1');
    expect(s.orbit.aim?.apogee).toBe(230e3);
    const flown = toCutoff(s.orbit);
    const planned = toCutoff({ ...s.orbit, backupCutoff: undefined });
    const log = flown.sim.events.map((e) => `${e.t.toFixed(1)}:${e.key}`).join(' ');
    // the planned cut-off: the orbit the guidance was set for
    expect(Math.abs(planned.el.periapsisAlt - 168e3), log).toBeLessThan(3e3);
    expect(Math.abs(planned.el.apoapsisAlt - 230e3), log).toBeLessThan(6e3);
    expect(planned.sim.events.some((e) => e.key === 'evt.backupCutoff')).toBe(false);
    // the backup: 25.4 m/s more, logged, and held to the flown orbit
    const backup = flown.sim.events.find((e) => e.key === 'evt.backupCutoff');
    expect(backup, log).toBeDefined();
    expect(Number(backup!.params!.dv)).toBeCloseTo(25.4, 1);
    expect(backup!.t).toBeCloseTo(flown.seco, 6);
    // 2.4 s flown long on Blok E alone (Baturin; the core's 0.46 s is flown here too): about 3 s and 50 kg
    expect(flown.seco - planned.seco).toBeGreaterThan(2);
    expect(flown.seco - planned.seco).toBeLessThan(4);
    expect(planned.left - flown.left).toBeGreaterThan(40);
    expect(planned.left - flown.left).toBeLessThan(60);
    // the speed at the perigee, where both were cut off
    expect(Math.abs(flown.vPerigee - planned.vPerigee - 25.43), log).toBeLessThan(1);
    expect(Math.abs(flown.el.periapsisAlt - 168e3), log).toBeLessThan(3e3);
    expect(flown.el.apoapsisAlt, log).toBeGreaterThan(311e3);
    expect(flown.el.apoapsisAlt, log).toBeLessThan(320e3);
    expect(flown.sim.events.some((e) => e.key === 'evt.targetOrbit'), log).toBe(true);
  });
});

describe('Vostok-1 home, point-mass', () => {
  it('fires the TDU-1 on time, loses its instrument module late, ejects Gagarin at 7 km and lands the sphere by the Volga', { timeout: 300_000 }, () => {
    expectFlownVostok1(flyVostok1('pointMass'));
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

describe('Vostok-1 in the viewer', () => {
  it('does not stop in orbit: it tells the way home beat by beat and ends on the landing', { timeout: 300_000 }, () => {
    const s = watchMissionSettings('vostok1');
    const sim = new Simulation({
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
      payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
      failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
    }, { headless: true });
    const beats: string[] = [];
    const warps = new Map<string, Set<number>>();
    let ending: string | null = null;
    while (!sim.isFailed() && sim.state.t < 8000 && !ending) {
      sim.step(sim.suggestedDt());
      const frame = captureFrame(sim);
      const beat = watchBeat(frame, sim.events);
      if (beats[beats.length - 1] !== beat) beats.push(beat);
      if (!warps.has(beat)) warps.set(beat, new Set());
      warps.get(beat)!.add(autoWarp(frame, beat, sim.events));
      ending = flightEnding(frame, sim.events);
    }
    const order = ['vostokOrbit', 'vostokRetro', 'vostokCoast', 'vostokSeparation', 'vostokEntry', 'vostokEjection', 'vostokDrogue', 'vostokMain', 'vostokLanding']
      .map((b) => beats.indexOf(b));
    expect(order.every((i) => i >= 0), beats.join(' ')).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(ending).toBe('splashdown');
    expect(sim.state.abort?.capsule).toBe('vostok');
    // the hour in orbit quickly, the minute before the retro-fire slowly
    expect([...warps.get('vostokOrbit')!].sort((a, b) => a - b)).toEqual([5, 100]);
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
    expect(sim.vehicle.stages[1].spec.dryMass).toBe(vehicleById('saturnv506').stages[1].dryMass - 4591);
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
    expect(vehicleById('saturnv506').stages[1].engine.thrustVac).toBe(1028.3e3);
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

  it('crosses into the Moon\'s sphere of influence where Mission Control saw it, and reaches the Moon as the flight did', () => {
    flyTo(221995);
    // the Public Affairs commentary at 61:39:55: 186,437 n mi above the Earth, 33,822 n mi above the Moon,
    // 2,990 ft/s from the Earth and 3,772 ft/s from the Moon
    expect(Math.abs(norm(sim.state.r) - R_EARTH - 186437 * 1852)).toBeLessThan(300e3);
    expect(Math.abs(norm(sim.state.v) - 2990 * 0.3048)).toBeLessThan(5);
    const rel = moonRel();
    expect(Math.abs(rel.d - R_MOON - 33822 * 1852)).toBeLessThan(300e3);
    expect(Math.abs(rel.v - 3772 * 0.3048)).toBeLessThan(5);
    flyTo(APOLLO11.loi1.t);
    expect(sim.isFailed(), log()).toBe(false);
    expect(Math.abs(at('evt.lunarSoi')!.t - APOLLO11.lunarSoi)).toBeLessThan(120);
    // at the lunar orbit insertion's ignition: MR Table 7-II, 86.7 n mi above the landing site's radius, 8,250 ft/s
    const now = moonRel();
    expect(Math.abs(now.d - APOLLO11.siteRadius - 86.7 * 1852)).toBeLessThan(15e3);
    expect(Math.abs(now.v - 8250 * 0.3048)).toBeLessThan(10);
  });

  it('slows into the flown lunar orbit behind the Moon, rounds it off two revolutions later, and passes over Tranquility Base when the landing is due', () => {
    flyTo(APOLLO11.loi2.t + 120);
    expect(sim.isFailed(), log()).toBe(false);
    const loi = at('evt.loi'), in1 = at('evt.lunarOrbit'), loi2 = at('evt.circularize'), in2 = at('evt.lunarOrbit', 2);
    expect(loi?.t, log()).toBeCloseTo(APOLLO11.loi1.t, 6);
    expect(loi2?.t, log()).toBeCloseTo(APOLLO11.loi2.t, 6);
    // LOI-1 (ORL; MR Table 7-V): cut-off 75:55:47.90, 2,917.5 ft/s, into 169.7 × 60.0 n mi. A retrograde burn
    // leaves the orbit's perilune a little under the approach's pericynthion (61.5 → 60.0 n mi flown; the
    // model's approach is at 59.8), so the orbit is a few kilometres under the flown one; the plane over the
    // landing site costs some metres a second more
    expect(Math.abs(in1!.t - (APOLLO11.loi1.t + APOLLO11.loi1.duration))).toBeLessThan(10);
    expect(Math.abs(Number(in1!.params!.dv) - APOLLO11.loi1.dv)).toBeLessThan(25);
    expect(Math.abs(Number(in1!.params!.ap) - 169.7 * 1.852)).toBeLessThan(7);
    expect(Math.abs(Number(in1!.params!.pe) - 60.0 * 1.852)).toBeLessThan(7);
    // LOI-2: 16.88 s, 158.8 ft/s, aimed at 65.7 × 53.7 n mi, reaching 65.7 × 53.8
    expect(Math.abs(in2!.t - (APOLLO11.loi2.t + APOLLO11.loi2.duration))).toBeLessThan(4);
    expect(Math.abs(Number(in2!.params!.dv) - APOLLO11.loi2.dv)).toBeLessThan(8);
    expect(Math.abs(Number(in2!.params!.ap) - 65.7 * 1.852)).toBeLessThan(2);
    expect(Math.abs(Number(in2!.params!.pe) - 53.8 * 1.852)).toBeLessThan(2);
    // 32,162.4 kg after LOI-2 (MR Table A-I)
    expect(Math.abs(sim.vehicle.totalMass() - 32162.4)).toBeLessThan(150);
    // near the Moon's equator, retrograde
    const lunar = sim.apollo.frame()!.lunar!;
    expect(lunar.inc).toBeGreaterThan(176);
    // the orbit's plane — Columbia's, after the undocking — passes over the landing site at the landing's time,
    // within a few kilometres
    flyTo(APOLLO11.landing.t);
    const m = moonState(sim.plan.jd0 + sim.state.t / 86400), csm = sim.apollo.frame()!.csm!;
    const rel = { r: sub(csm.r, m.r), v: sub(csm.v, m.v) };
    const site = selenographicToEci(APOLLO11.landing.lat, APOLLO11.landing.lon, R_MOON, sim.plan.jd0 + sim.state.t / 86400);
    expect(Math.abs(dot(site, normalize(cross(rel.r, rel.v))))).toBeLessThan(3e3);
  });

  it('undocks Eagle, drops it towards the site with the descent engine, and lands it at Tranquility Base on the flown timeline', () => {
    flyTo(APOLLO11.engineOff + 120);
    expect(sim.isFailed(), log()).toBe(false);
    expect(at('evt.undocking')?.t, log()).toBeCloseTo(APOLLO11.undocking.t, 6);
    expect(at('evt.doi')?.t, log()).toBeCloseTo(APOLLO11.doi.t, 6);
    // DOI (ORL; MR §5.1): 30.0 s, 76.4 ft/s, targeted to 60 × 8.2 n mi and reaching 58.5 × 7.8. The flown orbit
    // had been pulled about by the mascons in the day since LOI-2, which the model's degree-2 field does not
    // have: its apolune, where DOI is burned, is some kilometres lower, and a metre a second more takes it down
    const doi = at('evt.lunarOrbit', 3)!;
    expect(Math.abs(doi.t - (APOLLO11.doi.t + APOLLO11.doi.duration))).toBeLessThan(3);
    expect(Math.abs(Number(doi.params!.dv) - APOLLO11.doi.dv)).toBeLessThan(1.5);
    expect(Math.abs(Number(doi.params!.ap) - 58.5 * 1.852)).toBeLessThan(12);
    expect(Math.abs(Number(doi.params!.pe) - 7.8 * 1.852)).toBeLessThan(1.5);
    // the powered descent, lit as far round the Moon from the site as Eagle was: within a minute of 102:33:05
    const pdi = at('evt.pdi')!;
    expect(Math.abs(pdi.t - APOLLO11.pdi.t), log()).toBeLessThan(60);
    // the throttle recovery 386 s after the ignition; high gate at 7,129 ft; low gate at about 400 ft
    expect(Math.abs(at('evt.throttleRecovery')!.t - pdi.t - (369571 - APOLLO11.pdi.t))).toBeLessThan(20);
    expect(Math.abs(Number(at('evt.highGate')!.params!.alt) - APOLLO11.highGate.alt)).toBeLessThan(200);
    expect(Math.abs(Number(at('evt.lowGate')!.params!.alt) - APOLLO11.lowGate.alt)).toBeLessThan(30);
    // the contact light 754.9 s after the ignition (102:45:39.9), the engine off 1.5 s later, at the site
    const contact = at('evt.lunarLanding')!;
    expect(Math.abs(contact.t - pdi.t - (APOLLO11.landing.t - APOLLO11.pdi.t))).toBeLessThan(10);
    expect(Math.abs(at('evt.lmEngineOff')!.t - contact.t - 1.5)).toBeLessThan(0.3);
    const landed = sim.apollo.frame()!.landed!;
    expect(sim.apollo.phase).toBe('landed');
    expect(landed.miss).toBeLessThan(50);
    // 7,327.0 kg on the surface (MR Table A-I)
    expect(Math.abs(sim.vehicle.totalMass() - APOLLO11.pdi.landedMass)).toBeLessThan(100);
    // on the ground, turning with the Moon
    const mm = moonState(sim.plan.jd0 + sim.state.t / 86400);
    expect(Math.abs(norm(sub(sim.state.r, mm.r)) - APOLLO11.siteRadius)).toBeLessThan(0.01);
  });

  it('lifts Eagle off timed for Columbia, flies the coelliptic rendezvous back to it, docks, and lets the ascent stage go', () => {
    flyTo(APOLLO11.separation.t + 120);
    expect(sim.isFailed(), log()).toBe(false);
    const NMI = 1852, FT = 0.3048;
    // the lift-off, timed for the CSM where the model has it: within a minute or two of 124:22:00.79
    expect(Math.abs(at('evt.lunarLiftoff')!.t - APOLLO11.ascent.t), log()).toBeLessThan(120);
    // the insertion: 47.3 × 9.5 n mi (aimed at 45 × 9), 5,928.6 lb
    const ins = at('evt.lmInsertion')!;
    expect(Math.abs(ins.t - at('evt.lunarLiftoff')!.t - (APOLLO11.ascent.cutoff - APOLLO11.ascent.t))).toBeLessThan(15);
    expect(Math.abs(Number(ins.params!.ap) - 47.3 * 1.852)).toBeLessThan(3.5 * 1.852);
    expect(Math.abs(Number(ins.params!.pe) - 9.5 * 1.852)).toBeLessThan(1 * 1.852);
    expect(Math.abs(Number(ins.params!.mass) - APOLLO11.ascent.insertionMass)).toBeLessThan(60);
    // CSI 51.6 ft/s, CDH 19.9 ft/s with the orbits 15 n mi apart, TPI 25.4 ft/s at 26.6° (MR Table 5-VI)
    expect(at('evt.csi')!.t).toBeCloseTo(APOLLO11.csi.t, 6);
    expect(Math.abs(Number(at('evt.csi')!.params!.dv) - 51.6 * FT)).toBeLessThan(2.5);
    const cdh = at('evt.cdh')!;
    expect(cdh.t).toBeCloseTo(APOLLO11.cdh.t, 6);
    expect(Math.abs(Number(cdh.params!.dh) - (15 * NMI) / 1000)).toBeLessThan(0.3);
    expect(Math.abs(Number(cdh.params!.dv) - 19.9 * FT)).toBeLessThan(2.5);
    const tpi = at('evt.tpi')!;
    expect(Math.abs(tpi.t - APOLLO11.tpi.t)).toBeLessThan(10 * 60);
    expect(Math.abs(Number(tpi.params!.el) - 26.6)).toBeLessThan(0.3);
    expect(Math.abs(Number(tpi.params!.dv) - APOLLO11.tpi.dv)).toBeLessThan(1);
    // docked within minutes of 128:03:00, weighed as the two were
    const dock = at('evt.lmDocked')!;
    expect(Math.abs(dock.t - APOLLO11.redocking.t), log()).toBeLessThan(5 * 60);
    expect(at('evt.stationkeeping')!.t).toBeLessThan(dock.t);
    // the ascent stage let go at its flown time; the CSM as weighed after it, backing away
    expect(at('evt.lmJettison')!.t).toBeCloseTo(APOLLO11.jettison.t, 6);
    expect(sim.apollo.phase).toBe('csmOrbit');
    expect(Math.abs(sim.vehicle.totalMass() - APOLLO11.jettison.csm)).toBeLessThan(1);
    const f = sim.apollo.frame()!;
    expect(norm(sub(f.ascentStage!.r, sim.state.r))).toBeGreaterThan(200);
    expect(f.lunar!.pe).toBeGreaterThan(90e3);
  });

  it('burns for home on time, meets the air as the flight did, and splashes down where Columbia came down', { timeout: 300_000 }, () => {
    flyTo(APOLLO11.splashdown.t + 300);
    expect(sim.isFailed(), log()).toBe(false);
    // TEI (MR Table 7-VI): 135:23:42.3, 3,279.0 ft/s in 151.4 s
    const tei = at('evt.tei')!, cut = at('evt.transearth')!;
    expect(tei.t).toBeCloseTo(APOLLO11.tei.t, 6);
    expect(Math.abs(Number(tei.params!.dv) - APOLLO11.tei.dv)).toBeLessThan(15);
    expect(Math.abs(cut.t - tei.t - APOLLO11.tei.duration)).toBeLessThan(5);
    // MCC-5 at its flown time, 4.8 ft/s flown; the model's injection closer to its aim
    const mcc5 = at('evt.transearthMcc')!;
    expect(mcc5.t).toBeCloseTo(APOLLO11.mcc5.t, 6);
    expect(Number(mcc5.params!.dv)).toBeLessThan(3);
    // the CM's separation on time; the entry interface as flown (MR Table 7-VII): 195:03:05.7, −6.48°
    expect(at('evt.cmSmSeparation')!.t).toBeCloseTo(APOLLO11.cmSep.t, 6);
    const ei = at('evt.entryInterface')!;
    expect(Math.abs(ei.t - APOLLO11.entryInterface.t)).toBeLessThan(30);
    expect(Math.abs(Number(ei.params!.fpa) - APOLLO11.entryInterface.fpa)).toBeLessThan(0.1);
    // 6.56 g at the most; the drogues at 195:12:06.9; the water at 195:18:35, 13.30° N 169.15° W, 10,873 lb
    const splash = at('evt.cmSplashdown')!;
    expect(Math.abs(Number(splash.params!.g) - 6.56)).toBeLessThan(1);
    expect(Math.abs(at('evt.drogues')!.t - APOLLO11.splashdown.drogue)).toBeLessThan(60);
    expect(Math.abs(splash.t - APOLLO11.splashdown.t)).toBeLessThan(120);
    expect(Number(splash.params!.miss)).toBeLessThan(15);
    expect(sim.state.status).toBe('landed');
    expect(Math.abs(sim.vehicle.totalMass() - APOLLO11.splashdown.mass)).toBeLessThan(1);
  });
});

describe('Apollo 11 in the viewer', () => {
  it('tells the flight to the Moon and back beat by beat, each coast at a preset speed, and ends in the Pacific', { timeout: 600_000 }, () => {
    const s = watchMissionSettings('apollo11');
    const sim = new Simulation({
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
      payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
      failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
    }, { headless: true });
    const beats: string[] = [];
    const warps = new Set<number>();
    let ending: string | null = null;
    let last: ReturnType<typeof captureFrame> | undefined, inOrbit: ReturnType<typeof captureFrame> | undefined;
    let onMoon: ReturnType<typeof captureFrame> | undefined, lunarAgain: ReturnType<typeof captureFrame> | undefined;
    while (!sim.isFailed() && sim.state.t < 704000 && !ending) {
      sim.step(sim.suggestedDt());
      if (sim.state.t < 9000) continue;
      const frame = captureFrame(sim);
      const beat = watchBeat(frame, sim.events);
      if (beats[beats.length - 1] !== beat) beats.push(beat);
      warps.add(autoWarp(frame, beat));
      ending = flightEnding(frame, sim.events);
      if (ending) last = frame;
      // docked in the circular orbit, a minute before the undocking; on the Moon, an hour before the lift-off
      if (!inOrbit && frame.t >= APOLLO11.undocking.t - 60) inOrbit = frame;
      if (!onMoon && frame.t >= APOLLO11.ascent.t - 3600) onMoon = frame;
      if (!lunarAgain && frame.t >= APOLLO11.separation.t + 60) lunarAgain = frame;
    }
    // the readouts switch to the Moon as Mission Control's displays did: height above it and speed relative to
    // it; on the surface, nothing left of either
    expect(inOrbit, beats.join(' ')).toBeDefined();
    const o = watchReadout(inOrbit!);
    expect(o.moon).toBe(true);
    expect(o.altitude).toBeGreaterThan(95e3);
    expect(o.altitude).toBeLessThan(125e3);
    expect(Math.abs(o.speed - 1630)).toBeLessThan(20);
    expect(watchReadout(onMoon!)).toEqual({ altitude: 0, speed: 0, moon: true });
    const r = watchReadout(lunarAgain!);
    expect(r.moon).toBe(true);
    expect(r.altitude).toBeGreaterThan(95e3);
    expect(r.altitude).toBeLessThan(125e3);
    // in the water, the Earth's again
    expect(watchReadout(last!)).toEqual({ altitude: 0, speed: 0, moon: false });
    // in the order they were flown: each after the one before it
    let at = -1;
    for (const b of ['tliBurn', 'tliDone', 'transposition', 'apolloDocked', 'extraction', 'evasiveBurn', 'translunarCoast', 'midcourseBurn',
      'lunarSoi', 'lunarApproach', 'loiBurn', 'lunarOrbit', 'circularizeBurn', 'lunarOrbit', 'lmUndocked', 'doiBurn', 'descentOrbit',
      'brakingPhase', 'approachPhase', 'landingPhase', 'lunarLanding', 'onTheMoon', 'lunarLiftoff', 'lmInOrbit', 'csiBurn', 'cdhBurn',
      'tpiBurn', 'terminalPhase', 'rendezvousBraking', 'lmStationkeeping', 'redocked', 'lmJettison', 'teiBurn', 'homewardCoast',
      'returnMccBurn', 'cmSeparation', 'apolloEntry', 'apolloDrogues', 'apolloMains', 'apolloSplashdown']) {
      at = beats.indexOf(b, at + 1);
      expect(at, `${b}: ${beats.join(' ')}`).toBeGreaterThanOrEqual(0);
    }
    expect(ending).toBe('splashdown');
    // every speed one of the workspace selector's presets (src/main.ts)
    for (const w of warps) expect([0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 500, 1000, 5000, 10000, 50000]).toContain(w);
    expect(warps.has(5000)).toBe(true);
  });

  it('lights the air round the command module as the heating goes: none in space or under the parachutes, full at its peak', () => {
    expect(entryGlow(400e3, 11000)).toBe(0);
    expect(entryGlow(100e3, 11000)).toBeGreaterThan(0);
    expect(entryGlow(100e3, 11000)).toBeLessThan(0.2);
    expect(entryGlow(60e3, 10000)).toBe(1);
    expect(entryGlow(7e3, 150)).toBeLessThan(0.01);
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
