import { describe, expect, it, vi } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { engineMassFlow } from '../src/physics/vehicle';
import { Simulation, type Debris } from '../src/physics/simulation';
import { OMEGA_EARTH, R_EARTH } from '../src/physics/constants';
import { add, cross, norm, sub, v3 } from '../src/physics/vec3';
import { buildDetachedStage } from '../src/physics/rigid/mass';
import { acceptsRigidLanding, createRigidDebris, rigidContactMetrics, rigidLandingReserve } from '../src/physics/rigid/debris-runtime';
import { matVecMul, quatFromAxisAngle, quatIdentity, quatRotate } from '../src/physics/rigid/math';
import type { RigidState } from '../src/physics/rigid/integrator';
import type { PartitionedRigidBody } from '../src/physics/rigid/partition';
import { FLIGHT_CONTROL_GAINS } from '../src/physics/rigid/runtime';
import { minimumBurnDistance, TERMINAL_RESTART } from '../src/physics/rigid/recovery-guidance';
import { rigidMission } from './rigid-harness';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';

const config = { model: 'sixDof', wind: 'calm', seed: 20260919 } as const;
function fixture(recovery: boolean, cgAltitude = 1000, downward = 300, fuel = 5000) {
  const stage = vehicleById('falcon9').stages[0], snapshot = buildDetachedStage('falcon9', stage, fuel);
  const r = v3(R_EARTH + cgAltitude, 0, 0);
  const state: RigidState = { r, v: add(cross(v3(0, 0, OMEGA_EARTH), r), v3(-downward, 0, 0)),
    attitudeQ: quatIdentity(), omegaBody: v3(0, 0, OMEGA_EARTH) };
  const split: PartitionedRigidBody = { id: 's1', state, properties: snapshot, datumBody: v3(), offsetBody: v3(),
    bodyToParentQ: quatIdentity(), sourceOwnerIds: ['s1'] };
  const debris: Debris = { id: 1, name: 'first stage', r: { ...r }, v: { ...state.v }, dir: v3(1, 0, 0),
    mass: snapshot.mass, area: Math.PI * (stage.diameter / 2) ** 2, cd: 1.2,
    visual: { diameter: stage.diameter, length: stage.length, color: '#fff', kind: 'stage' }, alive: true, createdAt: 0 };
  if (recovery) debris.recovery = { engine: stage.engine, propellant: fuel, thrustVac: 0, thrustSL: 0, mdot: 0,
    burning: false, landed: false, landingReserve: rigidLandingReserve(stage), phase: 'landing', landingStarted: true };
  return { stage, snapshot, split, debris };
}

describe('physical detached bodies', () => {
  it('emits localized impact coordinates from actual rigid contact without losing raw speed', () => {
    const sim = new Simulation(rigidMission('leo'), { headless: true });
    const data = fixture(false, 1.83, 4, 0);
    data.split.state.attitudeQ = quatFromAxisAngle(v3(0, 0, 1), Math.PI / 2);
    const body = createRigidDebris(data.debris, data.split, config, data.snapshot, { vehicleId: 'falcon9' });
    const adapter = sim.debrisTracker;
    sim.debris.push(data.debris);
    adapter.rigidDebris.set(data.debris.id, body);
    sim.state.t = 0.01;
    adapter.stepDebris(0.01);
    const event = sim.events.find(event => event.key === 'evt.stageImpact')!;
    expect(event).toBeDefined();
    expect(event.t).toBe(0.01);
    expect(event.params!.lat).toBeCloseTo(data.debris.impact!.lat, 2);
    expect(event.params!.lon).toBeCloseTo(data.debris.impact!.lon, 2);
    expect(event.params!.speed).toBeGreaterThan(3.9);
    expect(data.debris.v.x).toBeLessThan(-3.9);
    for (const dictionary of [en, ru, th]) {
      const rendered = Object.entries(event.params!).reduce((text, [key, value]) =>
        text.split(`{${key}}`).join(String(value)), dictionary[event.key]);
      expect(rendered).not.toMatch(/\{\w+\}/);
    }
  });

  it('targets surface-relative lateral motion during landing while wind remains in the physical loads', () => {
    const data = fixture(true);
    const body = createRigidDebris(data.debris, data.split, { ...config, wind: 'crosswind' }, data.snapshot,
      { vehicleId: 'falcon9', stage: data.stage });
    const applied = vi.spyOn(body.runtime, 'step');
    body.step(0, 0.01, () => 0);
    const nose = applied.mock.calls[0][3];
    expect(norm(sub(nose, v3(1, 0, 0)))).toBeLessThan(1e-12);
    expect(norm(data.debris.rigid!.windECI)).toBeGreaterThan(0);
  });

  it('predicts terminal braking from force, variable mass and finite ignition timing', () => {
    const p = { massKg: 100, propellantKg: 50, downwardMs: 20, minimumThrustN: 2000,
      minimumFlowKgS: 0, gravityMs2: 10, dragKgM: 0, ignitionDelayS: 0, thrustRiseS: 0, contactSpeedMs: 2 };
    expect(minimumBurnDistance(p)).toBeCloseTo((20 ** 2 - 2 ** 2) / (2 * 10), 10);
    expect(minimumBurnDistance({ ...p, minimumFlowKgS: 5 })).toBeLessThan(minimumBurnDistance(p));
    expect(minimumBurnDistance({ ...p, ignitionDelayS: 0.5 })).toBeGreaterThan(minimumBurnDistance(p));
    expect(minimumBurnDistance({ ...p, minimumFlowKgS: 100 })).toBe(Infinity);
  });

  it.each([[74, 0.05, 2500], [255.9, 24.2, 5296]])('descends with one finite final restart from h=%s m, downward=%s m/s, fuel=%s kg', (height, downward, fuel) => {
    const data = fixture(true, height, downward, fuel);
    const body = createRigidDebris(data.debris, data.split, config, data.snapshot, { vehicleId: 'falcon9', stage: data.stage });
    body.step(0, 0.01, () => 0);
    if (downward < 1) {
      expect(data.debris.recovery!.burning).toBe(false);
      expect(data.debris.recovery!.propellant).toBe(fuel);
    }
    // Whether the stage is still burning from the first step depends on its
    // thrust-to-weight: the published 22.2 t stage (docs/VALIDATION.md, F1)
    // coasts from 255.9 m where the old 25.6 t one braked first. Either way
    // it must reach the ground on exactly one final ignition.
    let ignitions = 0, wasBurning = data.debris.recovery!.burning;
    let lastOff = 0;
    for (let t = 0.01; t < 60 && data.debris.alive; t += 0.01) {
      body.step(t, 0.01, () => 0);
      if (data.debris.recovery!.burning && !wasBurning) {
        ignitions++; expect(t - lastOff).toBeGreaterThanOrEqual(TERMINAL_RESTART.ignitionDelayS);
      }
      if (!data.debris.recovery!.burning && wasBurning) lastOff = t;
      wasBurning = data.debris.recovery!.burning;
    }
    expect(data.debris.outcome).toBe('landed');
    expect(ignitions).toBe(1);
    expect(data.debris.recovery!.propellant).toBeGreaterThan(1000);
    expect(data.debris.v.x).toBeLessThan(-0.5);
    expect(data.debris.v.x).toBeGreaterThan(-5);
  });

  it.each([0.2, 0.5, 1].flatMap(ignitionDelayS => [0.1, 0.3, 0.5]
    .map(thrustRiseS => ({ ignitionDelayS, thrustRiseS }))))('checks the disclosed restart timing $ignitionDelayS/$thrustRiseS s', timing => {
    for (const [height, downward, fuel] of [[74, 0.05, 2500], [255.9, 24.2, 5296]]) {
      const data = fixture(true, height, downward, fuel);
      const body = createRigidDebris(data.debris, data.split, config, data.snapshot,
        { vehicleId: 'falcon9', stage: data.stage, terminalRestart: timing });
      let starts = 0, wasBurning = false, remaining = fuel, lastOff = 0;
      for (let t = 0; t < 120 && data.debris.alive; t += 0.01) {
        body.step(t, 0.01, () => 0);
        const recovery = data.debris.recovery!;
        if (recovery.burning && !wasBurning) {
          if (starts > 0 || downward < 1) expect(t - lastOff).toBeGreaterThanOrEqual(timing.ignitionDelayS);
          starts++;
        }
        if (!recovery.burning && wasBurning) lastOff = t;
        wasBurning = recovery.burning;
        expect(recovery.propellant).toBeGreaterThanOrEqual(0);
        expect(recovery.propellant).toBeLessThanOrEqual(remaining);
        expect([...Object.values(body.state.r), ...Object.values(body.state.v),
          ...Object.values(body.state.attitudeQ), ...Object.values(body.state.omegaBody)].every(Number.isFinite)).toBe(true);
        remaining = recovery.propellant;
      }
      const contact = rigidContactMetrics(body.state, body.snapshot, data.stage.length, data.stage.diameter / 2, () => 0);
      console.log('TERMINAL_TIMING', JSON.stringify({ ...timing, height, downward, fuel, starts,
        outcome: data.debris.outcome, remaining, contact }));
      // The user-approved recovery envelope remains experimental: stress runs
      // must terminate honestly, not promote every contact to a successful landing.
      // The separate nominal fixtures above retain their strict landed gates.
      expect(data.debris.alive).toBe(false);
      expect(['landed', 'impact']).toContain(data.debris.outcome);
      expect(acceptsRigidLanding(contact, true)).toBe(data.debris.outcome === 'landed');
      expect(starts).toBeLessThanOrEqual(2);
    }
  }, 20000);

  it('records engine cutoff at contact while preserving the physical contact velocity', () => {
    const data = fixture(true, 1000, 3);
    const r = v3(R_EARTH + data.snapshot.cg.x + 0.03, 0, 0);
    data.split.state.r = r;
    data.split.state.v = add(cross(v3(0, 0, OMEGA_EARTH), r), v3(-3, 0, 0));
    const body = createRigidDebris(data.debris, data.split, config, data.snapshot, { vehicleId: 'falcon9', stage: data.stage });
    body.step(0, 0.02, () => 0);
    expect(data.debris.outcome).toBe('landed');
    expect(data.debris.recovery!.mdot).toBe(0);
    expect(data.debris.recovery!.thrustVac).toBe(0);
    expect(data.debris.rigid!.engineThrottles!['s1.engine.8']).toBe(0);
    // The contact velocity is the physical one: not zeroed, and no faster
    // than falling freely from 3 m/s over the 0.02 s step (the lighter
    // published stage does not light for a 3 m/s contact).
    expect(data.debris.v.x).toBeLessThan(-2);
    expect(data.debris.v.x).toBeGreaterThan(-3 - 9.81 * 0.02);
  });

  it('continues explicit mass-flow and controller sensitivity options after separation', () => {
    const data = fixture(true);
    const gains = { ...FLIGHT_CONTROL_GAINS, attitudeGain: v3(0.7, 0.8, 0.9) };
    const body = createRigidDebris(data.debris, data.split, config, data.snapshot, {
      vehicleId: 'falcon9', stage: data.stage,
      runtimeOptions: { massFlowModel: 'reducedFlux', controlGains: gains, integrationStepS: 0.005 },
    });
    expect(body.runtime.massFlowModel).toBe('reducedFlux');
    expect(body.runtime.integrationStepS).toBe(0.005);
    expect(body.runtime.controlGains.attitudeGain).toEqual(v3(0.7, 0.8, 0.9));
    gains.attitudeGain.x = 99;
    expect(body.runtime.controlGains.attitudeGain.x).toBe(0.7);
    body.step(0, 0.02, () => 0);
    expect(data.debris.rigid!.massFlowModel).toBe('reducedFlux');
    expect(data.debris.recovery!.propellant).toBeLessThan(5000);
  });

  it('keeps a 10ms recovery-command clock when changing the maximum RK integration step', () => {
    const results = [0.005, 0.01, 0.02].map(integrationStepS => {
      const data = fixture(true, 50000, 1600, 20000);
      data.debris.recovery!.phase = 'entry';
      const body = createRigidDebris(data.debris, data.split, config, data.snapshot, {
        vehicleId: 'falcon9', stage: data.stage, runtimeOptions: { integrationStepS },
      });
      const updates = vi.spyOn(body.runtime, 'step');
      body.step(100, 0.05, () => 0);
      expect(updates).toHaveBeenCalledTimes(5);
      updates.mock.calls.forEach((call, i) => {
        expect(call[0]).toBeCloseTo(100 + i * 0.01, 12);
        expect(call[2]).toBeCloseTo(0.01, 12);
      });
      return { fuel: data.debris.recovery!.propellant, r: body.state.r, v: body.state.v };
    });
    for (const result of results.slice(1)) {
      expect(result.fuel).toBeCloseTo(results[0].fuel, 8);
      expect(norm(sub(result.r, results[0].r))).toBeLessThan(1e-6);
      expect(norm(sub(result.v, results[0].v))).toBeLessThan(1e-6);
    }
  });

  it('keeps failed ascent engines failed through entry recovery and consumes only live chamber flow', () => {
    const data = fixture(true, 50000, 1600, 20000);
    data.debris.recovery!.phase = 'entry';
    const body = createRigidDebris(data.debris, data.split, config, data.snapshot,
      { vehicleId: 'falcon9', stage: data.stage, engineFraction: 8 / 9 });
    body.step(0, 0.02, () => 0);
    expect(data.debris.rigid?.engineThrottles?.['s1.engine.0']).toBe(0);
    expect(data.debris.rigid?.engineThrottles?.['s1.engine.4']).toBe(1);
    expect(data.debris.rigid?.engineThrottles?.['s1.engine.8']).toBe(1);
    expect(20000 - data.debris.recovery!.propellant).toBeCloseTo(2 * engineMassFlow(data.stage.engine) * 0.02, 8);
  });

  it('does not restore a stage with complete thrust loss and clips the entry burn at landing reserve', () => {
    const failed = fixture(true);
    const failedBody = createRigidDebris(failed.debris, failed.split, config, failed.snapshot,
      { vehicleId: 'falcon9', stage: failed.stage, engineFraction: 0 });
    failedBody.step(0, 0.02, () => 0);
    expect(failed.debris.recovery!.propellant).toBe(5000);
    expect(failed.debris.recovery!.burning).toBe(false);
    expect(Object.values(failed.debris.rigid!.engineThrottles!).every(value => value === 0)).toBe(true);
    const reserve = rigidLandingReserve(failed.stage), entry = fixture(true, 50000, 1600, reserve + 0.01);
    entry.debris.recovery!.phase = 'entry';
    const entryBody = createRigidDebris(entry.debris, entry.split, config, entry.snapshot,
      { vehicleId: 'falcon9', stage: entry.stage });
    entryBody.step(0, 0.02, () => 0);
    expect(entry.debris.recovery!.propellant).toBeCloseTo(reserve, 8);
    expect(entry.debris.recovery!.phase).toBe('landing');
    expect(entry.debris.recovery!.burning).toBe(false);
  });

  it('consumes finite main propellant and changes translation through actual engine force', () => {
    const powered = fixture(true), passive = fixture(false);
    const p = createRigidDebris(powered.debris, powered.split, config, powered.snapshot, { vehicleId: 'falcon9', stage: powered.stage });
    const b = createRigidDebris(passive.debris, passive.split, config, passive.snapshot, { vehicleId: 'falcon9', stage: passive.stage });
    p.step(0, 0.1, () => 0); b.step(0, 0.1, () => 0);
    expect(powered.debris.recovery!.propellant).toBeLessThan(5000);
    expect(powered.debris.recovery!.propellant).toBeGreaterThan(4900);
    expect(powered.debris.mass).toBeLessThan(powered.snapshot.mass);
    expect(powered.debris.v.x).toBeGreaterThan(passive.debris.v.x + 1);
    expect(powered.debris.rigid?.engineThrottles?.['s1.engine.8']).toBe(1);
    expect(passive.debris.mass).toBe(passive.snapshot.mass);
    expect(passive.debris.rigid?.engineThrottles).toEqual({});
  });

  it('clips at fuel exhaustion and does not create thrust after the tank empties', () => {
    const data = fixture(true, 1000, 300, 0.01);
    const body = createRigidDebris(data.debris, data.split, config, data.snapshot, { vehicleId: 'falcon9', stage: data.stage });
    body.step(0, 0.05, () => 0);
    expect(data.debris.recovery!.propellant).toBe(0);
    expect(data.debris.recovery!.burning).toBe(false);
    expect(data.debris.rigid?.engineThrottles?.['s1.engine.8']).toBe(0);
    expect(data.debris.mass).toBeGreaterThan(data.stage.dryMass - 100); // RCS use may reduce the included dry budget.
    expect(data.debris.mass).toBeLessThanOrEqual(data.stage.dryMass);
  });

  it('transfers used gas within the exact partition and never refills it at separation', () => {
    const data = fixture(true);
    const spent = buildDetachedStage('falcon9', data.stage, 5000, { rcsConsumedKgByStage: { s1: 73 } });
    data.split.properties = spent;
    const body = createRigidDebris(data.debris, data.split, config, spent, { vehicleId: 'falcon9', stage: data.stage, consumed: { s1: 73 } });
    expect(body.runtime.consumed.s1).toBe(73);
    expect(data.debris.rigid?.rcsPropellantKg).toBe(27);
    expect(data.debris.mass).toBe(data.stage.dryMass + 5000 - 73);
    expect(() => createRigidDebris(data.debris, data.split, config, spent, { vehicleId: 'falcon9', stage: data.stage })).toThrow(/partition/);
  });

  it('propagates passive spin physically with no attitude overwrite or fake RCS', () => {
    const data = fixture(false, 500000, 0);
    data.split.state.omegaBody = v3(0.2, 0.1, -0.15);
    const body = createRigidDebris(data.debris, data.split, config, data.snapshot, { vehicleId: 'falcon9' });
    const before = quatRotate(body.state.attitudeQ, matVecMul(body.snapshot.inertia, body.state.omegaBody));
    body.step(0, 0.05, () => 0);
    const after = quatRotate(body.state.attitudeQ, matVecMul(body.snapshot.inertia, body.state.omegaBody));
    expect(norm(sub(before, after)) / norm(before)).toBeLessThan(1e-7);
    expect(body.state.attitudeQ).not.toEqual(quatIdentity());
    expect(data.debris.rigid?.rcsPropellantKg).toBe(0);
  });

  it('detects tilted cylinder contact at the side and refuses a slow sideways landing', () => {
    const data = fixture(true, 1.83, 0, 0);
    data.split.state.attitudeQ = quatFromAxisAngle(v3(0, 0, 1), Math.PI / 2);
    const body = createRigidDebris(data.debris, data.split, config, data.snapshot, { vehicleId: 'falcon9', stage: data.stage });
    const result = body.step(0, 0.01, () => 0);
    expect(result.contact).toBeDefined();
    expect(data.debris.outcome).toBe('impact');
    expect(data.debris.recovery?.landed).toBe(false);
    expect(result.events.map(e => e.key)).toEqual(['evt.stageImpact']);
    expect(data.debris.dir.y).toBeCloseTo(1, 10); // Collision does not snap the body upright.
  });

  it('checks actual tail clearance, terrain, rates and surface-relative speeds before success', () => {
    const data = fixture(true, 1, 1, 0);
    const ground = 100;
    data.split.state.r = v3(R_EARTH + ground + data.snapshot.cg.x - 0.001, 0, 0);
    data.split.state.v = add(cross(v3(0, 0, OMEGA_EARTH), data.split.state.r), v3(-1, 0, 0));
    const contact = rigidContactMetrics(data.split.state, data.snapshot, data.stage.length, data.stage.diameter / 2, () => ground);
    expect(contact.tailClearance).toBeCloseTo(-0.001, 6);
    expect(acceptsRigidLanding(contact, true)).toBe(true);
    expect(acceptsRigidLanding({ ...contact, horizontalSpeed: 4 }, true)).toBe(false);
    expect(acceptsRigidLanding({ ...contact, angularRateRadS: 0.2 }, true)).toBe(false);
    expect(acceptsRigidLanding(contact, false)).toBe(false);
    const body = createRigidDebris(data.debris, data.split, config, data.snapshot, { vehicleId: 'falcon9', stage: data.stage });
    const velocity = { ...data.debris.v };
    const result = body.step(0, 0.01, () => ground);
    expect(data.debris.outcome).toBe('landed'); expect(data.debris.v).toEqual(velocity);
    expect(result.events[0].key).toBe('evt.boosterLanded');
  });

  it('does not advance a zero-duration call and rejects an invalid time step', () => {
    const data = fixture(false), body = createRigidDebris(data.debris, data.split, config, data.snapshot, { vehicleId: 'falcon9' });
    const before = JSON.stringify(body.state);
    body.step(0, 0, () => 0);
    expect(JSON.stringify(body.state)).toBe(before);
    expect(() => body.step(0, -1, () => 0)).toThrow();
  });
});
