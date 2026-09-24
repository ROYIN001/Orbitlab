/**
 * A crewed Soyuz's launch escape (roadmap G06, src/physics/rigid/escape.ts and
 * src/physics/sim/abort.ts): who has one, what sets it off, and a pad abort
 * and an in-flight abort flown to the crew at rest, against Soyuz T-10-1.
 * The in-flight historical aborts (MS-10, 18a) are in tests/heavy.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { failureAvailable, validateConfigInput } from '../src/config/validation';
import { ESCAPE, EscapeFlight, capsuleConfiguration, motorImpulse } from '../src/physics/rigid/escape';
import { captureFrame, interpolateFrames } from '../src/physics/frame';
import { G0, R_EARTH, OMEGA_EARTH } from '../src/physics/constants';
import { addScaled, cross, norm, v3 } from '../src/physics/vec3';
import { groundPositionEci, enuFrame } from '../src/physics/orbital';
import { targetAttitude } from '../src/physics/rigid/runtime';
import { ABORT_LAUNCH, crewedSoyuz, flyAbort } from './abort-harness';

const keys = (sim: Simulation) => sim.events.map((e) => e.key);
const log = (sim: Simulation) => sim.events.map((e) => `${e.t.toFixed(1)} ${e.key} ${JSON.stringify(e.params ?? {})}`).join('\n');

describe('the escape system', () => {
  it('is fitted to a crewed Soyuz only, and armed from the countdown until orbit', () => {
    expect(crewedSoyuz('none', 0).escape.fitted).toBe(true);
    expect(crewedSoyuz('none', 0, 'sixDof', 'comsat').escape.fitted).toBe(false);
    const falcon = vehicleById('falcon9');
    expect(failureAvailable('launchAbort', falcon, 'crew')).toBe(false);
    expect(failureAvailable('launchAbort', vehicleById('soyuz21a'), 'crew')).toBe(true);
    expect(failureAvailable('boosterCollision', falcon, 'crew')).toBe(false);
    const issues = validateConfigInput({ vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'crew', payloadMass: 7150, orbit: { ...orbitById('iss') },
      launchTime: ABORT_LAUNCH, guidanceOverrides: {}, failure: { mode: 'launchAbort', time: 30, stage: 0 }, boosterRecovery: false });
    expect(issues).toContainEqual({ field: 'setup.failureMode', code: 'failureUnavailable' });
    const sim = crewedSoyuz('none', 0);
    expect(sim.escape.available).toBe(true);
    sim.state.status = 'orbit';
    expect(sim.escape.available).toBe(false);
    expect(sim.commandAbort()).toBe(false);
    // an uncrewed launch has nothing to fire
    const cargo = crewedSoyuz('none', 0, 'sixDof', 'comsat');
    expect(cargo.commandAbort()).toBe(false);
  });

  it('burns the tower\'s propellant at a solid motor\'s specific impulse, and hangs the crew at 7–8 m/s under the main', () => {
    const tw = ESCAPE.tower;
    const isp = motorImpulse(tw.thrust, tw.rise, tw.burn, tw.tailOff) / (tw.propellant * G0);
    expect(isp).toBeGreaterThan(200);
    expect(isp).toBeLessThan(260);
    const c = capsuleConfiguration(false);
    const terminal = Math.sqrt(2 * c.mass * G0 / (1.225 * ESCAPE.main.area * ESCAPE.main.cd));
    expect(terminal).toBeGreaterThan(6.5);
    expect(terminal).toBeLessThan(8.5);
  });

  it('turns a descent module released apex first round to fly heat shield first', () => {
    // at 25 km, moving at 600 m/s straight down, its heat shield facing up
    const r = groundPositionEci(0.8, 1.1, 25e3, 0), { up, east } = enuFrame(r);
    const v = addScaled(cross(v3(0, 0, OMEGA_EARTH), r), up, -600);
    const q = targetAttitude(up, east);
    const flight = new EscapeFlight('separation', { r, v, attitudeQ: q, omegaBody: v3(0, 0.02, 0) }, 0, v3(0, 1, 0),
      { groundElevation: () => 0, wind: () => v3() }, () => undefined);
    // a spacecraft releases its descent module after 10 s; fly 40 s
    for (let t = 0; t < 40; t += 0.1) flight.step(t, 0.1);
    expect(flight.status.body).toBe('capsule');
    // heat shield (+x) now leads: the axis points along the fall
    const axis = flight.axis, fall = { x: -up.x, y: -up.y, z: -up.z };
    expect(axis.x * fall.x + axis.y * fall.y + axis.z * fall.z).toBeGreaterThan(0.9);
    expect(norm(flight.state.r) - R_EARTH).toBeLessThan(25e3);
  });
});

describe('a fire on the pad (Soyuz T-10-1)', () => {
  const sim = crewedSoyuz('padFire', -5);
  const { apogee, bodies } = flyAbort(sim);
  const peak = sim.state.abort!;

  it('fires the tower from the pad and brings the crew down safely', { timeout: 60_000 }, () => {
    expect(keys(sim)).toContain('evt.padFire');
    const abort = sim.events.find((e) => e.key === 'evt.abort');
    expect(abort?.params?.mode, log(sim)).toBe('tower');
    expect(abort!.t).toBeCloseTo(-5, 6);
    // the sequence, in order
    const order = ['evt.escapeBurnout', 'evt.escapeFins', 'evt.escapeCapsule', 'evt.escapeMainLow', 'evt.escapeHeatShield', 'evt.escapeSoftLanding', 'evt.escapeLanded', 'evt.abortCrewSafe'];
    const at = order.map((k) => keys(sim).indexOf(k));
    expect(at.every((i) => i >= 0), log(sim)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(bodies).toEqual(['head', 'capsule']);
    expect(sim.state.status).toBe('landed');
    expect(sim.state.note).toBe('abortLanded');
    expect(sim.state.destroyed).toBe(false);
  });

  it('pulls the crew at 14–17 g to 1.2–2 km and sets them down gently within a few km of the pad', () => {
    // T-10-1: 14–17 g for about 5 s; an apogee of 1.2–2.0 km; down about 4 km away (in wind)
    expect(peak.maxG).toBeGreaterThan(13);
    expect(peak.maxG).toBeLessThan(17);
    expect(peak.maxGT).toBeLessThan(-5 + 2.5);
    expect(apogee).toBeGreaterThan(1200);
    expect(apogee).toBeLessThan(2200);
    expect(sim.state.downrange).toBeGreaterThan(110); // the design requirement: 110 m aside
    expect(sim.state.downrange).toBeLessThan(5000);
    expect(peak.touchdownSpeed!).toBeLessThan(3);
    // the rocket left on the pad goes up a few seconds after the crew has gone
    expect(peak.rocketLost?.t).toBeGreaterThan(-5);
  });

  it('records frames a replay can scrub: the escape on each frame, never blended across bodies', () => {
    const a = captureFrame(sim);
    expect(a.abort?.body).toBe('capsule');
    const b = { ...a, t: a.t + 1, abort: { ...a.abort!, body: 'head' as const, main: 0 } };
    const mid = interpolateFrames(a, b, a.t + 0.2);
    expect(mid.abort?.body).toBe('capsule');
    expect(mid.abort?.main).toBe(a.abort!.main);
  });
});

describe('aborts in flight', () => {
  it('fires on its own when the rocket loses all thrust with the crew on it', { timeout: 60_000 }, () => {
    const sim = crewedSoyuz('thrustLoss', 40);
    flyAbort(sim);
    const abort = sim.events.find((e) => e.key === 'evt.abort');
    expect(abort?.t, log(sim)).toBeCloseTo(40, 6);
    expect(abort?.params?.mode).toBe('tower');
    expect(keys(sim)).not.toContain('evt.vehicleLost');
    expect(keys(sim)).toContain('evt.abortCrewSafe');
    expect(sim.state.abort?.cause).toBe('evt.thrustLoss');
  });

  it('flies a commanded abort from a point-mass flight too, the escape still a rigid body', { timeout: 60_000 }, () => {
    const sim = crewedSoyuz('launchAbort', 60, 'pointMass');
    const { bodies } = flyAbort(sim);
    expect(keys(sim)).toContain('evt.abortCommand');
    expect(bodies).toEqual(['head', 'capsule']);
    expect(sim.state.abort?.maxG).toBeGreaterThan(12);
    expect(sim.state.abort?.touchdownSpeed).toBeLessThan(3);
    // an escape at 12 km needs the drogue first
    expect(keys(sim)).toContain('evt.escapeDrogue');
    expect(keys(sim)).toContain('evt.escapeMain');
    expect(sim.state.status).toBe('landed');
  });

  it('leaves an uncrewed rocket\'s failures as they were', { timeout: 60_000 }, () => {
    const sim = new Simulation({ vehicleId: 'soyuz21a', satelliteId: 'comsat', siteId: 'baikonur', orbit: orbitById('leo'), launchTime: ABORT_LAUNCH,
      guidance: guidanceForVehicle(vehicleById('soyuz21a'), DEFAULT_GUIDANCE, 'pointMass'), guidanceResolved: true,
      failure: { ...DEFAULT_FAILURE, mode: 'padFire', time: -3 }, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 } }, { headless: true });
    while (sim.state.status !== 'failed' && sim.state.t < 30) sim.step(sim.suggestedDt());
    expect(sim.state.destroyed).toBe(true);
    expect(keys(sim)).toContain('evt.vehicleLost');
    expect(keys(sim)).not.toContain('evt.abort');
  });
});
