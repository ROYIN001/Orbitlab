/**
 * The orbit hand-off (roadmap S03): a flight's orbit, taken from its
 * recording, carried to the Orbit section as plain JSON. It must survive a
 * round trip unchanged, its elements must be the flight's own, what it says
 * about the spacecraft must be what is in orbit, and one read back from
 * outside must be refused unless every part of it is sound.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { FlightRecorder } from '../src/replay/recorder';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE } from '../src/physics/defaults';
import { orbitById } from '../src/data/orbits';
import { satelliteById } from '../src/data/satellites';
import { propagate } from '../src/physics/propagator/propagate';
import {
  HANDOFF_FORMAT, handoffAvailable, handoffElements, handoffFromFlight, handoffFromState, parseHandoff, type OrbitHandoff,
} from '../src/orbit/handoff';
import type { VisualFrame } from '../src/physics/frame';
import { orbitFacts, stateAt } from '../src/orbit/kepler';
import { handoffOrbit } from '../src/orbit/playground-model';
import { craftFromHandoff, deltaVAvailable } from '../src/orbit/budget';
import type { MissionConfig } from '../src/types';

const LAUNCH = new Date(Date.UTC(2026, 8, 15, 12, 0, 0));

function flown(cfg: MissionConfig) {
  const sim = new Simulation(cfg, { headless: true });
  const rec = new FlightRecorder();
  rec.start(sim);
  while (!sim.done && sim.state.t < 20000) rec.advance(5, 1e9);
  return { sim, frames: rec.frames };
}

/** The hand-off the app builds from the frame on screen (main.ts `orbitHandoffNow`). */
function handoffAt(sim: Simulation, f: VisualFrame): OrbitHandoff {
  const own = f.stages.find((st) => st.isSpacecraft);
  const spec = own ? sim.vehicle.stages[own.index].spec : undefined;
  return handoffFromFlight({
    frame: f, satellite: sim.satellite, payloadMass: sim.cfg.payloadMassOverride ?? sim.satellite.mass,
    spacecraftStage: own && spec ? { dryMass: spec.dryMass, propellant: own.propellantFraction * spec.propellantMass } : null,
    vehicleName: sim.vehicleSpec.name, mission: null, label: 'test orbit',
  });
}

const base = { launchTime: LAUNCH, guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
  dynamics: { model: 'pointMass' as const, wind: 'calm' as const, seed: 1 } };
// a crewed Soyuz: the spacecraft raises its own orbit, so it has an engine and spends propellant
const soyuz = flown({ ...base, vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbit: orbitById('iss') });
// a CubeSat dispenser on Electron: no engine of its own
const electron = flown({ ...base, vehicleId: 'electron', satelliteId: 'cubesats', siteId: 'mahia', orbit: orbitById('sso'), payloadMassOverride: 150 });

describe('orbit hand-off (S03)', () => {
  it('is available only once the flight is in a bound orbit above the atmosphere', () => {
    expect(handoffAvailable(soyuz.frames[0])).toBe(false);
    expect(handoffAvailable(null)).toBe(false);
    expect(soyuz.sim.state.status).not.toBe('failed');
    expect(handoffAvailable(soyuz.frames.at(-1))).toBe(true);
    // somewhere in the ascent the first frame in orbit is later than liftoff
    const first = soyuz.frames.findIndex((f) => handoffAvailable(f));
    expect(soyuz.frames[first].t).toBeGreaterThan(300);
  });

  it('survives a JSON round trip unchanged', () => {
    for (const { sim, frames } of [soyuz, electron]) {
      const h = handoffAt(sim, frames.at(-1)!);
      expect(h.format).toBe(HANDOFF_FORMAT);
      const text = JSON.stringify(h);
      expect(parseHandoff(JSON.parse(text))).toEqual(h);
      expect(JSON.parse(JSON.stringify(parseHandoff(JSON.parse(text))))).toEqual(JSON.parse(text));
    }
  });

  it('has the elements the flight recorded', () => {
    for (const { sim, frames } of [soyuz, electron]) {
      for (const f of [frames.at(-1)!, frames.find((x) => handoffAvailable(x))!]) {
        const h = parseHandoff(JSON.parse(JSON.stringify(handoffAt(sim, f))))!;
        const e = handoffElements(h), want = f.elements;
        expect(e.a).toBeCloseTo(want.a, 3);
        expect(e.e).toBeCloseTo(want.e, 9);
        expect(e.i).toBeCloseTo(want.i, 9);
        expect(e.raan).toBeCloseTo(want.raan, 9);
        if (want.e > 1e-6) expect(e.argp).toBeCloseTo(want.argp, 6);
        expect(e.periapsisAlt).toBeCloseTo(want.periapsisAlt, 3);
        expect(e.apoapsisAlt).toBeCloseTo(want.apoapsisAlt, 3);
        expect(e.period).toBeCloseTo(want.period, 6);
        expect(h.jd).toBe(f.jd);
        expect(h.origin.missionTime).toBe(f.t);
      }
    }
  });

  it('carries the spacecraft that is in orbit', () => {
    const crew = satelliteById('crew');
    const h = handoffAt(soyuz.sim, soyuz.frames.at(-1)!);
    expect(h.spacecraft.kind).toBe('crew');
    expect(h.spacecraft.propulsion).not.toBeNull();
    expect(h.spacecraft.propulsion!.thrust).toBe(crew.propulsion!.thrust);
    // it raised its own orbit: lighter than at launch, by what it burned
    const burned = crew.mass * crew.propulsion!.propellantFraction - h.spacecraft.propulsion!.propellantMass;
    expect(burned).toBeGreaterThan(0);
    expect(h.spacecraft.mass).toBeCloseTo(crew.mass - burned, 6);
    // an inert payload weighs what it did at launch
    const c = handoffAt(electron.sim, electron.frames.at(-1)!);
    expect(c.spacecraft.propulsion).toBeNull();
    expect(c.spacecraft.mass).toBe(150);
    expect(c.origin.vehicleName).toBe('Electron');
  });

  it('is what the lifetime analysis starts from', () => {
    const h = handoffAt(electron.sim, electron.frames.at(-1)!);
    const res = propagate(h.r, h.v, h.jd, { method: 'mean', duration: 30 * 86400,
      forces: { j2: true, j3j4: false, drag: true, sun: false, moon: false, srp: false, activity: 'mean' }, spacecraft: h.spacecraft, samples: 20 });
    expect(res.samples[0].perigeeAlt).toBeCloseTo(handoffElements(h).periapsisAlt, -3);
    expect(res.samples.at(-1)!.t).toBeCloseTo(30 * 86400, -3);
  });

  it('refuses one read from outside unless every part is sound', () => {
    const good = handoffAt(electron.sim, electron.frames.at(-1)!);
    const bad = (mutate: (h: any) => void) => { const h = JSON.parse(JSON.stringify(good)); mutate(h); return parseHandoff(h); };
    expect(bad(() => {})).toEqual(good);
    expect(bad((h) => { h.r[0] = null; })).toBeNull();
    expect(bad((h) => { h.v = [1, 2]; })).toBeNull();
    expect(bad((h) => { h.jd = 'today'; })).toBeNull();
    expect(bad((h) => { h.spacecraft.mass = -1; })).toBeNull();
    expect(bad((h) => { h.spacecraft.area = 0; })).toBeNull();
    expect(bad((h) => { h.spacecraft.kind = 'deathStar'; })).toBeNull();
    expect(bad((h) => { h.spacecraft.propulsion = { thrust: 10, isp: 200, propellantMass: -5 }; })).toBeNull();
    expect(bad((h) => { h.version = 2; })).toBeNull();
    expect(bad((h) => { h.format = 'other'; })).toBeNull();
    expect(bad((h) => { h.origin = null; })).toBeNull();
    // a state that is not an orbit: slowed to a fall, or flung out of the Earth's hold
    expect(bad((h) => { h.v = h.v.map((x: number) => x * 0.5); })).toBeNull();
    expect(bad((h) => { h.v = h.v.map((x: number) => x * 1.6); })).toBeNull();
    expect(parseHandoff(null)).toBeNull();
    expect(parseHandoff('orbit')).toBeNull();
  });

  it('continues in orbit (O03): the playground flies on from the flight\'s own state, with the spacecraft\'s own propellant', () => {
    const f = soyuz.frames.at(-1)!;
    const h = handoffAt(soyuz.sim, f);
    const o = handoffOrbit(h);
    // the orbit in the playground is the flight's at the hand-off: the same state, the same elements
    const s = stateAt(o, 0, false);
    expect(Math.hypot(s.r.x - f.r.x, s.r.y - f.r.y, s.r.z - f.r.z)).toBeLessThan(1e-3);
    expect(Math.hypot(s.v.x - f.v.x, s.v.y - f.v.y, s.v.z - f.v.z)).toBeLessThan(1e-6);
    const facts = orbitFacts(o, false);
    expect(facts.perigeeAlt).toBeCloseTo(f.elements.periapsisAlt, 0);
    expect(facts.apogeeAlt).toBeCloseTo(f.elements.apoapsisAlt, 0);
    expect(o.jd0).toBe(f.jd);
    // the crew spacecraft's engine and what is left in it, as a budget
    const craft = craftFromHandoff(h)!;
    expect(craft).not.toBeNull();
    expect(craft.mass).toBeCloseTo(h.spacecraft.mass, 9);
    expect(craft.isp).toBe(302);
    expect(deltaVAvailable(craft)).toBeGreaterThan(0);
    // the CubeSat dispenser has none
    expect(craftFromHandoff(handoffAt(electron.sim, electron.frames.at(-1)!))).toBeNull();
  });

  it('is made from the playground\'s own orbit for its tools (O03), and reads back as sound', () => {
    const f = soyuz.frames.at(-1)!;
    const h = handoffFromState({
      r: f.r, v: f.v, jd: f.jd, label: 'the playground\'s orbit',
      spacecraft: { mass: 7000, area: 12, cd: 2.2, cr: 1.3, kind: 'crew', propulsion: { thrust: 3920, isp: 302, propellantMass: 300 } },
    });
    const back = parseHandoff(JSON.parse(JSON.stringify(h)));
    expect(back).toEqual(h);
    expect(handoffElements(h).a).toBeCloseTo(f.elements.a, 0);
  });
});
