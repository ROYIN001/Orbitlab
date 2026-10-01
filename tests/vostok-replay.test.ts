/**
 * Vostok-1's return in frames and replay (C01): the abort's new fields (the
 * pair's joint and its cables, the hatch, the pilot aboard, the sphere's
 * heat) and the bodies' (Gagarin's canopies, the module's heat and melting,
 * its pieces) carried by `captureFrame`, deep-copied by `cloneFrame`,
 * blended by `interpolateFrames` and handed to the frame-backed simulation
 * view; the retro-rockets blended between frames (they were dropped); and
 * the recorder's cadence for the return.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { captureFrame, cloneFrame, interpolateFrames, type DebrisFrame, type VisualFrame } from '../src/physics/frame';
import { createFrameSimView } from '../src/replay/simview';
import { vostokInterval } from '../src/replay/recorder';
import { vehicleById } from '../src/data/vehicles';
import { guidanceForVehicle } from '../src/physics/defaults';
import { watchMissionSettings } from '../src/ui/watch-missions';
import { stageNameByLabel } from '../src/ui/names';
import { v3 } from '../src/physics/vec3';
import type { AbortState } from '../src/physics/sim/types';

function vostok(): Simulation {
  const s = watchMissionSettings('vostok1');
  return new Simulation({
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
    payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
    failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
  }, { headless: true });
}

const ABORT: AbortState = {
  mode: 'capsule', capsule: 'vostok', phase: 'fall', body: 'capsule', t0: 4684.2, kind: 'return', cause: '',
  motors: { main: 0, control: 0, fairing: 0, softLanding: 0, retro: 1 }, finsOpen: false, drogue: 0, main: 0, heatShield: true,
  maxG: 0, maxGT: 4684.2, pilot: 0, joint: 'tethered', tether: { sphere: v3(1, 0, 0), module: v3(0.9, 0, 0) },
  hatch: true, pilotAboard: true, heatFlux: 1000,
};

function body(id: number, extra: Partial<DebrisFrame>): DebrisFrame {
  return { id, name: 'pilot', r: v3(7e6, 0, 0), v: v3(0, 10, 0), dir: v3(1, 0, 0), alive: true, burning: false,
    visual: { diameter: 0.6, length: 1.8, color: '#e8641e', kind: 'pilot' }, createdAt: 0, ...extra };
}

/** Two frames ten seconds apart around the TDU-1's end, with Gagarin and a hot piece of the module on them. */
function pair(): [VisualFrame, VisualFrame] {
  const base = captureFrame(vostok());
  const a: VisualFrame = { ...cloneFrame(base), t: 4720, abort: { ...ABORT, motors: { ...ABORT.motors }, tether: { sphere: v3(1, 0, 0), module: v3(0.9, 0, 0) } },
    debris: [
      body(1, { crew: { phase: 'main', stabiliser: 0, main: 0.2, reserve: 0, seat: false, naz: true } }),
      body(2, { name: 'im.tdu', fragmentOf: 0, entry: { heatFlux: 4e5, temperature: 900, ablating: false, massFraction: 1 },
        visual: { diameter: 0.95, length: 1.13, color: '#7f8388', kind: 'imFragment', material: 'steel' } }),
    ] };
  const b: VisualFrame = { ...cloneFrame(base), t: 4730, abort: { ...ABORT, motors: { ...ABORT.motors, retro: 0 }, heatFlux: 3000,
    tether: { sphere: v3(0, 1, 0), module: v3(0, 0.9, 0) } },
    debris: [
      body(1, { r: v3(7e6, 100, 0), crew: { phase: 'main', stabiliser: 0, main: 0.6, reserve: 0.1, seat: false, naz: false } }),
      body(2, { name: 'im.tdu', fragmentOf: 0, entry: { heatFlux: 2e5, temperature: 1100, ablating: true, massFraction: 0.5 },
        visual: { diameter: 0.95, length: 1.13, color: '#7f8388', kind: 'imFragment', material: 'steel' } }),
    ] };
  return [a, b];
}

describe('frames between two recorded instants', () => {
  it('blend the TDU-1 down with the other motors rather than dropping it', () => {
    const [a, b] = pair();
    const mid = interpolateFrames(a, b, 4725);
    expect(mid.abort!.motors.retro).toBeCloseTo(0.5, 9);
    // a frame without a retro beside one with it blends from nothing
    const noRetro: VisualFrame = { ...a, abort: { ...a.abort!, motors: { main: 0, control: 0, fairing: 0, softLanding: 0 } } };
    expect(interpolateFrames(noRetro, b, 4725).abort!.motors.retro).toBe(0);
    expect(interpolateFrames(noRetro, { ...b, abort: { ...b.abort!, motors: { ...b.abort!.motors, retro: 1 } } }, 4727.5).abort!.motors.retro).toBeCloseTo(0.75, 9);
    // and nothing appears that neither frame has (Soyuz's descent module carries no retro)
    const soyuz = { ...noRetro.abort!, capsule: 'soyuz' as const };
    expect(interpolateFrames({ ...a, abort: soyuz }, { ...b, abort: soyuz }, 4725).abort!.motors).not.toHaveProperty('retro');
  });

  it('blend the sphere\'s heat and the cables, and step the joint, the hatch and the pilot aboard', () => {
    const [a, b] = pair();
    const mid = interpolateFrames(a, b, 4725);
    expect(mid.abort!.heatFlux).toBeCloseTo(2000, 9);
    expect(mid.abort!.tether!.sphere.x).toBeCloseTo(0.5, 9);
    expect(mid.abort!.tether!.module.y).toBeCloseTo(0.45, 9);
    expect(mid.abort!.joint).toBe('tethered');
    expect(mid.abort!.hatch).toBe(true);
    expect(mid.abort!.pilotAboard).toBe(true);
  });

  it('blend Gagarin\'s canopies and a piece\'s heat, the flags from the earlier frame', () => {
    const [a, b] = pair();
    const mid = interpolateFrames(a, b, 4725);
    const pilot = mid.debris.find((d) => d.id === 1)!, piece = mid.debris.find((d) => d.id === 2)!;
    expect(pilot.crew!.main).toBeCloseTo(0.4, 9);
    expect(pilot.crew!.reserve).toBeCloseTo(0.05, 9);
    expect(pilot.crew!.naz).toBe(true);
    expect(piece.entry!.heatFlux).toBeCloseTo(3e5, 6);
    expect(piece.entry!.temperature).toBeCloseTo(1000, 9);
    expect(piece.entry!.massFraction).toBeCloseTo(0.75, 9);
    expect(piece.entry!.ablating).toBe(false);
    expect(piece.fragmentOf).toBe(0);
    // the inputs are never written to
    expect(a.debris[0].crew!.main).toBe(0.2);
    expect(a.abort!.tether!.sphere.x).toBe(1);
  });

  it('are copies all the way down: changing one leaves the recording as it was', () => {
    const [a, b] = pair();
    for (const f of [cloneFrame(a), interpolateFrames(a, b, a.t), interpolateFrames(a, b, 4725)]) {
      f.abort!.tether!.sphere.x = 99;
      f.debris[0].crew!.main = 99;
      f.debris[1].entry!.temperature = 99;
      f.abort!.motors.retro = 99;
    }
    expect(a.abort!.tether!.sphere.x).toBe(1);
    expect(a.debris[0].crew!.main).toBe(0.2);
    expect(a.debris[1].entry!.temperature).toBe(900);
    expect(a.abort!.motors.retro).toBe(1);
  });
});

describe('the recorder\'s cadence for the return', () => {
  it('is a second through the burn, 2 s above the air, five a second through the entry, a second under the main and on the ground', () => {
    expect(vostokInterval(ABORT, 180e3)).toBe(1);
    const after = { ...ABORT, motors: { ...ABORT.motors, retro: 0 } };
    expect(vostokInterval(after, 180e3)).toBe(2);
    expect(vostokInterval(after, 100e3)).toBe(0.2);
    expect(vostokInterval({ ...after, phase: 'main', main: 0.5 }, 2000)).toBe(0.2);
    expect(vostokInterval({ ...after, phase: 'main', main: 1 }, 2000)).toBe(1);
    expect(vostokInterval({ ...after, phase: 'landed' }, 0)).toBe(1);
  });
});

describe('the bodies of a flown return on the frame', () => {
  // flown to the moment Gagarin's main opens over the steppe, the sphere still on its braking parachute
  const sim = vostok();
  while (!sim.isFailed() && sim.state.t < 5880) sim.step(sim.suggestedDt());
  const frame = captureFrame(sim);

  it('carry Gagarin\'s canopies, the hatch, the seat, and the module\'s pieces with their heat', () => {
    expect(frame.abort!.joint).toBe('free');
    expect(frame.abort!.hatch).toBe(false);
    expect(frame.abort!.pilotAboard).toBe(false);
    const pilot = frame.debris.find((d) => d.name === 'pilot')!;
    expect(pilot.crew!.phase).toBe('main');
    expect(pilot.crew!.seat).toBe(false);
    expect(frame.debris.find((d) => d.name === 'seat')).toBeDefined();
    expect(frame.debris.find((d) => d.name === 'hatch')).toBeDefined();
    const module = frame.debris.find((d) => d.name === 'instrumentModule')!;
    expect(module.outcome).toBe('burnup');
    const pieces = frame.debris.filter((d) => d.fragmentOf === module.id);
    expect(pieces.length).toBeGreaterThan(3);
    for (const p of pieces) {
      expect(p.visual.kind).toBe('imFragment');
      expect(p.entry!.massFraction).toBeGreaterThan(0);
      expect(p.entry!.massFraction).toBeLessThanOrEqual(1);
    }
    // what is not Vostok's carries none of it
    expect(frame.debris.filter((d) => d.createdAt < 4600).every((d) => d.crew === undefined && d.entry === undefined)).toBe(true);
  });

  it('reach the telemetry panel through the frame-backed view, named', () => {
    const view = createFrameSimView(sim);
    view.setFrame(frame);
    const pilot = view.sim.debris.find((d) => d.name === 'pilot')!;
    expect(pilot.crew!.phase).toBe('main');
    const piece = view.sim.debris.find((d) => d.fragmentOf !== undefined)!;
    expect(piece.entry).toBeDefined();
    for (const name of ['pilot', 'seat', 'hatch', 'instrumentModule', piece.name]) expect(stageNameByLabel(sim.vehicleSpec, name)).not.toBe(name);
  });
});
