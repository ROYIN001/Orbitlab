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
import { G0 } from '../src/physics/constants';
import { Simulation } from '../src/physics/simulation';
import { guidanceForVehicle } from '../src/physics/defaults';
import { supportsRigid } from '../src/physics/rigid/config';
import { validateConfigInput } from '../src/config/validation';
import { WATCH_MISSIONS, watchMissionSettings, type WatchMissionId } from '../src/ui/watch-missions';
import { compareEvents, simPayloadOrbit } from '../src/ui/flown';
import { expectFlownMr3, flyMr3 } from './mr3-harness';
import { captureFrame } from '../src/physics/frame';
import { flightEnding, watchBeat } from '../src/ui/watch-logic';

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

describe('Apollo 11 from its parking orbit, point-mass', () => {
  it('relights the S-IVB for the Moon on time, reaches the flown conic, and docks and pulls the LM out on the flown timeline', { timeout: 300_000 }, () => {
    const s = watchMissionSettings('apollo11');
    const sim = new Simulation({
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
      payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
      failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
    }, { headless: true });
    while (!sim.isFailed() && sim.state.t < 15500) sim.step(sim.suggestedDt());
    const log = sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
    expect(sim.isFailed(), log).toBe(false);
    const tli = sim.events.find((e) => e.key === 'evt.tli');
    expect(tli, log).toBeDefined();
    // FER Table 4-6: C3 −1.4875 km²/s², eccentricity 0.97537, inclination 31.386° at the cut-off (T+10,203.0 s)
    expect(Math.abs(Number(tli!.params!.c3) + 1.4875)).toBeLessThan(0.01);
    expect(Math.abs(Number(tli!.params!.e) - 0.97537)).toBeLessThan(0.0005);
    expect(Math.abs(Number(tli!.params!.inc) - 31.386)).toBeLessThan(0.1);
    expect(Math.abs(tli!.t - 10203.03)).toBeLessThan(15);
    const m = WATCH_MISSIONS.find((x) => x.id === 'apollo11')!;
    for (const row of compareEvents(m.flown!, sim.events).filter((r) => r.real > 9000)) {
      expect(row.sim, `${row.key}: ${log}`).not.toBeNull();
      expect(Math.abs(row.delta!), `${row.key}`).toBeLessThan(15);
    }
    // the CSM and LM on their own, the S-IVB left behind
    expect(sim.state.payloadSeparated).toBe(true);
    expect(sim.apollo.phase).toBe('extracted');
    expect(sim.state.elements.e).toBeGreaterThan(0.97);
  });
});
