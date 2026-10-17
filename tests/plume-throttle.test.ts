/**
 * The plume follows what the engines are recorded doing (D-70), not a constant:
 * a solid strap-on's effective throttle, the chambers a six-DOF stage flown home
 * has lit, and nothing at all once that stage is standing on the ground.
 */
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { RocketView } from '../src/render/rocket';
import { DebrisView } from '../src/render/debris';
import type { Plume } from '../src/render/plume';
import type { SceneManager } from '../src/render/scene';
import { captureFrame, cloneFrame, type DebrisFrame, type VisualFrame } from '../src/physics/frame';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { satelliteById } from '../src/data/satellites';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, guidanceForVehicle } from '../src/physics/defaults';
import type { RigidTelemetry } from '../src/physics/rigid/telemetry';
import { quatFromAxisAngle } from '../src/physics/rigid/math';
import { v3 } from '../src/physics/vec3';
import { flyWithReturns } from './return-harness';

/** The canvases the stack's and the grid fins' textures draw on; nothing here reads their pixels back. */
const withCanvas = <T>(run: () => T): T => {
  const pixels = (...a: number[]) => ({ data: new Uint8ClampedArray(Math.max(1, (a.length > 2 ? a[2] * a[3] : a[0] * a[1]) * 4)) });
  const context = new Proxy({}, { get: (_, key) => (key === 'createImageData' || key === 'getImageData' ? pixels
    : key === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop: () => undefined })) });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
  try { return run(); } finally { vi.unstubAllGlobals(); }
};

/** What is drawn of a plume: its length and its core's opacity. */
const drawn = (plume: Plume) => ({
  visible: plume.group.visible, length: plume.length,
  opacity: (plume as unknown as { coreMat: THREE.ShaderMaterial }).coreMat.uniforms.uOpacity.value as number,
});

describe('a solid strap-on\'s plume', () => {
  /** Atlas V 551 on the pad, its core and its five GEM-63s then marked burning at `level`. */
  const pad = captureFrame(new Simulation({
    vehicleId: 'atlasv551', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'),
    launchTime: new Date('2026-09-22T15:00:00Z'), guidance: guidanceForVehicle(vehicleById('atlasv551'), undefined, 'pointMass'),
    guidanceResolved: true, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
  }, { headless: true }));
  const burning = (level: number | undefined): VisualFrame => {
    const f = cloneFrame(pad);
    f.t = 90; f.throttle = 1;
    const core = f.stages.find((s) => s.index === 0)!;
    core.burning = true; core.effectiveThrottle = 1;
    expect(f.boosters.length).toBeGreaterThan(0);
    for (const b of f.boosters) {
      b.burning = true;
      if (level === undefined) delete b.effectiveThrottle;
      else b.effectiveThrottle = level;
    }
    return f;
  };
  const strapOn = (level: number | undefined) => withCanvas(() => {
    const rocket = new RocketView(vehicleById('atlasv551'), satelliteById('cubesats'));
    rocket.update(burning(level), { night: 0 });
    const parts = (rocket as unknown as { stages: { boosters: { spec: { engine: { solid?: boolean } }; units: { plume: Plume }[] }[] }[] }).stages;
    const group = parts[0].boosters[0];
    expect(group.spec.engine.solid).toBe(true);
    const out = drawn(group.units[0].plume);
    rocket.dispose();
    return out;
  });

  it('follows the recorded level, the motor\'s thrust profile included (GEM-63 at 77 % by burnout)', () => {
    const full = strapOn(1), tail = strapOn(0.77);
    expect(full.visible && tail.visible).toBe(true);
    expect(tail.length).toBeLessThan(full.length);
    expect(tail.opacity).toBeLessThan(full.opacity);
  });

  it('is drawn at full thrust from a frame recorded before the level was', () => {
    expect(strapOn(undefined)).toEqual(strapOn(1));
  });
});

/** A rigid body's telemetry, its chambers at `throttles` (absent: none recorded). */
function rigid(throttles?: Record<string, number>): RigidTelemetry {
  return { modelVersion: 'test', attitudeQ: quatFromAxisAngle(v3(1, 2, 3), 0.6), omegaBody: v3(),
    cgBody: v3(), renderOffsetBody: v3(-5, 0.3, -0.4), inertiaBody: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    controlMode: 'auto', engineDeflections: {}, engineDirectionsBody: {}, engineThrottles: throttles,
    rcsPropellantKg: 1, saturated: false, angleOfAttack: 0, sideslip: 0, aeroWithinEnvelope: true, windECI: v3(), rawQuaternionNormError: 0 };
}

/** Falcon 9's first stage flown home, `burning`, in its landing burn or standing on the pad. */
const stage = (p: { alive: boolean; burning: boolean; rigid?: RigidTelemetry }): DebrisFrame => ({
  id: 7, name: 'First stage', r: v3(0, 0, 0), v: v3(), dir: v3(0, 1, 0), alive: p.alive, burning: p.burning,
  ...(p.alive ? {} : { outcome: 'landed' as const }), createdAt: 0, anchor: 0, pressure: 9e4, rigid: p.rigid,
  visual: { kind: 'stage', length: 41.2, diameter: 3.66, color: '#fff' },
  recovery: { phase: 'landing', landed: !p.alive, landingBurn: true,
    target: { kind: 'pad', id: 'lz1', lat: 0, lon: 0, alt: 0, radius: 40 } },
});

/** The plume `DebrisView` draws under `d`. */
const returnPlume = (d: DebrisFrame) => withCanvas(() => {
  const scene = new THREE.Scene();
  const manager = { scene, toScene: (p: { x: number; y: number; z: number }, out: THREE.Vector3) => out.set(p.x, p.y, p.z) } as unknown as SceneManager;
  const view = new DebrisView(manager);
  view.update([d], 400);
  const out = drawn((view as unknown as { items: Map<number, { plume: Plume }> }).items.get(d.id)!.plume);
  view.clear();
  return out;
});

describe('a stage flown home, its plume', () => {
  it('goes out when it lands, whatever a recording made before the flag was cleared says', () => {
    expect(returnPlume(stage({ alive: true, burning: true })).visible).toBe(true);
    const landed = returnPlume(stage({ alive: false, burning: true }));
    expect(landed.visible).toBe(false);
    expect(landed.length).toBe(0);
  });

  it('follows the six-DOF chambers it has lit, the mean of them; none lit is none', () => {
    const full = returnPlume(stage({ alive: true, burning: true, rigid: rigid({ 'core.engine.8': 1 }) }));
    // the centre engine at 40 %, the other eight off
    const eight = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`core.engine.${i}`, 0]));
    const low = returnPlume(stage({ alive: true, burning: true, rigid: rigid({ ...eight, 'core.engine.8': 0.4 }) }));
    expect(low.visible).toBe(true);
    expect(low.length).toBeLessThan(full.length);
    expect(low.opacity).toBeLessThan(full.opacity);
    // three at 40, 50 and 60 % draw as one at 50 %
    expect(returnPlume(stage({ alive: true, burning: true, rigid: rigid({ ...eight, 'core.engine.0': 0.4, 'core.engine.4': 0.6, 'core.engine.8': 0.5 }) })))
      .toEqual(returnPlume(stage({ alive: true, burning: true, rigid: rigid({ 'core.engine.8': 0.5 }) })));
    const dark = returnPlume(stage({ alive: true, burning: true, rigid: rigid({ ...eight, 'core.engine.8': 0 }) }));
    expect(dark.visible).toBe(false);
    // a body with no chambers recorded, as the point-mass return, burns at 1
    expect(returnPlume(stage({ alive: true, burning: true, rigid: rigid(undefined) }))).toEqual(full);
  });

  it('is put out by the touchdown of a point-mass stage flown downrange without a plan', { timeout: 240_000 }, () => {
    const sim = flyWithReturns({ vehicleId: 'falcon9', payload: 1000, orbit: orbitById('leo'), model: 'pointMass' });
    const d = sim.debris.find((x) => x.recovery)!;
    expect(d.recovery!.target).toBeUndefined();
    expect(d.outcome).toBe('landed');
    expect(d.recovery!.landingStarted).toBe(true);
    expect(d.recovery!.burning).toBe(false);
    expect(captureFrame(sim).debris.find((x) => x.id === d.id)!.burning).toBe(false);
  });
});
