/**
 * Vostok-1's return as drawn (C01): the bodies it leaves behind in the debris
 * view, the entry's glow turned onto the air, Gagarin's canopies, the bodies
 * put at their WGS-84 heights over the drawn Earth.
 */
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { DebrisView } from '../src/render/debris';
import type { SceneManager } from '../src/render/scene';
import { captureFrame, cloneFrame, interpolateFrames, type DebrisFrame, type VisualFrame } from '../src/physics/frame';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { guidanceForVehicle } from '../src/physics/defaults';
import { watchMissionSettings } from '../src/ui/watch-missions';
import type { CrewState } from '../src/physics/sim/types';
import type { RigidTelemetry } from '../src/physics/rigid/telemetry';
import { quatFromAxisAngle, quatRotate } from '../src/physics/rigid/math';
import { v3, norm } from '../src/physics/vec3';
import { R_EARTH } from '../src/physics/constants';
import { geodeticHeight, WGS84_A, WGS84_F } from '../src/physics/geodesy';
import { drawnFrame, onDrawnSphere, onEllipsoid } from '../src/render/datum';
import { crewViewSize } from '../src/render/cosmonaut';
import { entryGlow } from '../src/render/entry-glow';
import { entryGlow as apolloGlow } from '../src/render/apollo-cm';
import { incandescence } from '../src/render/vostok-debris';

/** The canvases (helmet, louvres, halo, canopy stripes) are textures; nothing here draws them. */
const withCanvas = <T>(run: () => T): T => {
  const context = new Proxy({}, { get: () => () => ({ addColorStop: () => undefined }) });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
  try { return run(); } finally { vi.unstubAllGlobals(); }
};
const view = () => {
  const scene = new THREE.Scene();
  const manager = { scene, toScene: (p: { x: number; y: number; z: number }, out: THREE.Vector3) => out.set(p.x, p.y, p.z) } as unknown as SceneManager;
  return { scene, renderer: new DebrisView(manager) };
};
type Item = { plume: unknown; bodyMat: unknown; vostok: { root: THREE.Group } | null };
const items = (r: DebrisView) => (r as unknown as { items: Map<number, Item> }).items;

function rigid(angle: number): RigidTelemetry {
  return { modelVersion: 'test', bodyId: 'vostok.instrumentModule', attitudeQ: quatFromAxisAngle(v3(0.3, 1, 0.2), angle), omegaBody: v3(0, 0, 0.52),
    cgBody: v3(), renderOffsetBody: v3(-1.1, 0, 0), inertiaBody: [1, 0, 0, 0, 1, 0, 0, 0, 1], controlMode: 'auto', engineDeflections: {},
    rcsPropellantKg: 0, saturated: false, angleOfAttack: 0, sideslip: 0, aeroWithinEnvelope: true, windECI: v3(), rawQuaternionNormError: 0 };
}
/** 70 km up over the equator at 7 km/s going east. */
const R70 = R_EARTH + 70e3;
const base = (over: Partial<DebrisFrame>): DebrisFrame => ({
  id: 9, name: 'instrumentModule', r: v3(R70, 0, 0), v: v3(0, 7000, -300), dir: v3(1, 0, 0), alive: true, burning: false, createdAt: 5344,
  visual: { kind: 'instrumentModule', diameter: 2.43, length: 2.25, color: '#8f9a8c' }, ...over,
});

describe('Vostok-1\'s bodies in the debris view', () => {
  it('draws the module, its pieces, the hatch, the seat and the pilot with no plume and no sunlit flash', () => withCanvas(() => {
    const { renderer } = view();
    const crew: CrewState = { phase: 'stabiliser', stabiliser: 1, main: 0, reserve: 0, seat: true, naz: true };
    const list: DebrisFrame[] = [
      base({ id: 1, rigid: rigid(0.4), entry: { heatFlux: 3e5, temperature: 867, ablating: true, massFraction: 1 } }),
      base({ id: 2, name: 'im.tdu', visual: { kind: 'imFragment', diameter: 0.95, length: 1.13, color: '#7f8388', material: 'steel' },
        entry: { heatFlux: 5e5, temperature: 1200, ablating: false, massFraction: 1 } }),
      base({ id: 3, name: 'hatch', visual: { kind: 'hatch', diameter: 1, length: 0.12, color: '#9aa0a6' } }),
      base({ id: 4, name: 'seat', visual: { kind: 'seat', diameter: 0.7, length: 1.4, color: '#6f7568' } }),
      base({ id: 5, name: 'pilot', visual: { kind: 'pilot', diameter: 0.6, length: 1.8, color: '#e8641e' }, crew }),
    ];
    renderer.update(list, 5600);
    const map = items(renderer);
    expect(map.size).toBe(5);
    for (const item of map.values()) {
      expect(item.plume).toBeNull();
      expect(item.bodyMat).toBeNull();
      expect(item.vostok).not.toBeNull();
    }
    renderer.clear();
  }));

  it('tumbles the module with its own rigid attitude and turns its glow onto the air, whatever the tumble', () => withCanvas(() => {
    const { renderer } = view();
    const glowAim = (angle: number) => {
      const d = base({ id: 1, rigid: rigid(angle), entry: { heatFlux: 3e5, temperature: 700, ablating: false, massFraction: 1 } });
      renderer.update([d], 5600);
      const root = items(renderer).get(1)!.vostok!.root;
      const [body, glow] = root.children;
      // the module's own +Y (towards its engine) is the body's +x
      const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(body.quaternion);
      const x = quatRotate(d.rigid!.attitudeQ, v3(1, 0, 0));
      expect(axis.distanceTo(new THREE.Vector3(x.x, x.y, x.z))).toBeLessThan(1e-9);
      expect(glow.visible).toBe(true);
      return new THREE.Vector3(0, 1, 0).applyQuaternion(glow.quaternion);
    };
    const a = glowAim(0.3), b = glowAim(2.1);
    // the shock stays up the flow: the velocity less the turning air's, not the body's axis
    expect(a.distanceTo(b)).toBeLessThan(1e-9);
    const air = new THREE.Vector3(0, 7000 - 7.292115e-5 * R70, -300).normalize();
    expect(a.distanceTo(air)).toBeLessThan(1e-6);
    renderer.clear();
  }));

  it('hangs Gagarin from the canopies the frame says are open, and lays the main out once he is down', () => withCanvas(() => {
    const { renderer } = view();
    const draw = (crew: CrewState, alive = true) => {
      renderer.update([base({ id: 5, name: 'pilot', alive, outcome: alive ? undefined : 'landed', dir: v3(1, 0, 0),
        visual: { kind: 'pilot', diameter: 0.6, length: 1.8, color: '#e8641e' }, crew })], 6000);
      const root = items(renderer).get(5)!.vostok!.root;
      const pilot = root.children[0].children[0];
      const [hanging, seated] = pilot.children;
      return { hanging, seated };
    };
    // the domes, by size: the stabiliser 2 m², the main 83.5 m², the reserve 56 m²
    const domes = (g: THREE.Object3D) => {
      const out: number[] = [];
      g.traverse((o) => {
        if (!(o instanceof THREE.Mesh) || !(o.geometry instanceof THREE.SphereGeometry) || !o.geometry.parameters.thetaLength) return;
        let shown = true;
        for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) shown = false;
        if (shown && o.geometry.parameters.radius > 0.5) out.push(Math.round(Math.PI * o.geometry.parameters.radius ** 2 * 10) / 10);
      });
      return out.sort((x, y) => x - y);
    };
    const inSeat = draw({ phase: 'stabiliser', stabiliser: 1, main: 0, reserve: 0, seat: true, naz: true });
    expect(inSeat.seated.visible).toBe(true);
    expect(inSeat.hanging.visible).toBe(false);
    expect(domes(inSeat.seated)).toEqual([2]);
    const two = draw({ phase: 'main', stabiliser: 0, main: 1, reserve: 0.6, seat: false, naz: false });
    expect(two.hanging.visible).toBe(true);
    expect(two.seated.visible).toBe(false);
    expect(domes(two.hanging)).toEqual([56, 83.5]);
    const one = draw({ phase: 'main', stabiliser: 0, main: 1, reserve: 0, seat: false, naz: false });
    expect(domes(one.hanging)).toEqual([83.5]);
    const down = draw({ phase: 'landed', stabiliser: 0, main: 0, reserve: 0, seat: false, naz: false }, false);
    expect(domes(down.hanging)).toEqual([]);
    renderer.clear();
  }));

  it('keeps the hatch and the seat where they fell, but not a piece of the module that came down', () => withCanvas(() => {
    const { renderer } = view();
    renderer.update([
      base({ id: 3, name: 'hatch', alive: false, outcome: 'impact', visual: { kind: 'hatch', diameter: 1, length: 0.12, color: '#9aa0a6' } }),
      base({ id: 4, name: 'seat', alive: false, outcome: 'impact', visual: { kind: 'seat', diameter: 0.7, length: 1.4, color: '#6f7568' } }),
      base({ id: 2, name: 'im.bottle', alive: false, outcome: 'impact', visual: { kind: 'imFragment', diameter: 0.45, length: 0.45, color: '#7f8388' } }),
      base({ id: 1, alive: false, outcome: 'burnup', rigid: rigid(0) }),
    ], 6100);
    expect([...items(renderer).keys()].sort()).toEqual([3, 4]);
    renderer.clear();
  }));
});

describe('the entry glow and the hot metal', () => {
  it('is Apollo\'s scale, shared', () => {
    expect(apolloGlow).toBe(entryGlow);
    // Vostok's sphere near its peak heating, 45 km up at 6 km/s: about a third of Apollo's peak, and nothing in vacuum
    expect(entryGlow(45e3, 6000)).toBeGreaterThan(0.2);
    expect(entryGlow(45e3, 6000)).toBeLessThan(1);
    expect(entryGlow(200e3, 7800)).toBe(0);
  });
  it('glows red from about the Draper point and brighter as it heats', () => {
    const c = new THREE.Color();
    expect(incandescence(600, c)).toBe(0);
    const red = incandescence(900, c), redG = c.g;
    const hot = incandescence(1500, c);
    expect(red).toBeGreaterThan(0);
    expect(hot).toBeGreaterThan(red);
    expect(c.g).toBeGreaterThan(redG);
  });
});

describe('the return on WGS-84 heights, drawn on the scene\'s sphere', () => {
  const at = (latDeg: number, h: number) => {
    // a point at geodetic latitude `latDeg` and height `h` over WGS-84, on the x–z plane
    const lat = latDeg * Math.PI / 180, e2 = WGS84_F * (2 - WGS84_F);
    const N = WGS84_A / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
    return v3((N + h) * Math.cos(lat), 0, (N * (1 - e2) + h) * Math.sin(lat));
  };
  it('puts a body on the real ground on the drawn ground, and one in the air at its height over it', () => {
    const ground = at(51.27, 0);
    // over Saratov the real surface is some 12.5 km inside the 6,378.137 km sphere
    expect(R_EARTH - norm(ground)).toBeGreaterThan(12e3);
    expect(Math.abs(norm(onDrawnSphere(ground)) - R_EARTH)).toBeLessThan(0.01);
    const up = at(51.27, 2500);
    expect(Math.abs(geodeticHeight(up) - 2500)).toBeLessThan(0.01);
    expect(Math.abs(norm(onDrawnSphere(up)) - R_EARTH - 2500)).toBeLessThan(0.01);
  });
  it('moves only a Vostok return and its debris, and leaves the frame it was given alone', () => {
    const r = at(51.27, 1000);
    const frame = { r, debris: [{ r: at(51.27, 3000) }], abort: { body: 'capsule', capsule: 'vostok' } } as unknown as VisualFrame;
    const drawn = drawnFrame(frame);
    expect(onEllipsoid(frame)).toBe(true);
    expect(norm(drawn.r) - R_EARTH).toBeCloseTo(1000, 1);
    expect(norm(drawn.debris[0].r) - R_EARTH).toBeCloseTo(3000, 1);
    expect(frame.r).toBe(r);
    const mercury = { ...frame, abort: { body: 'capsule', capsule: 'mercury' } } as unknown as VisualFrame;
    expect(drawnFrame(mercury)).toBe(mercury);
    const ascent = { ...frame, abort: undefined } as unknown as VisualFrame;
    expect(drawnFrame(ascent)).toBe(ascent);
  });
});

describe('a body at rest between two recorded frames', () => {
  it('turns with the Earth, and one that stays put stays put', () => {
    const w = 7.292115e-5, span = 30, R = 6.36e6;
    const at = (t: number, lon0: number) => v3(R * 0.6 * Math.cos(lon0 + w * t), R * 0.6 * Math.sin(lon0 + w * t), R * 0.8);
    const body = (id: number, r: ReturnType<typeof v3>): DebrisFrame => ({ id, name: 'pilot', r, v: v3(), dir: v3(0, 0, 1), alive: false,
      outcome: 'landed', burning: false, createdAt: 0, visual: { kind: 'pilot', diameter: 0.6, length: 1.8, color: '#e8641e' } });
    const frame = (t: number, debris: DebrisFrame[]) => ({ ...captureFrameStub(t), debris });
    const a = frame(6610, [body(1, at(6610, 0.8)), body(2, v3(1e6, 2e6, 3e6))]);
    const b = frame(6610 + span, [body(1, at(6610 + span, 0.8)), body(2, v3(1e6, 2e6, 3e6))]);
    const mid = interpolateFrames(a, b, 6610 + span / 2);
    const want = at(6610 + span / 2, 0.8);
    expect(norm(v3(mid.debris[0].r.x - want.x, mid.debris[0].r.y - want.y, mid.debris[0].r.z - want.z))).toBeLessThan(1e-3);
    expect(mid.debris[1].r).toEqual(v3(1e6, 2e6, 3e6));
  });
});

/** A frame of Vostok-1 on the pad, at time `t`: what `interpolateFrames` needs besides the debris. */
let padFrame: VisualFrame | null = null;
function captureFrameStub(t: number): VisualFrame {
  if (!padFrame) {
    const s = watchMissionSettings('vostok1');
    padFrame = captureFrame(new Simulation({
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
      payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
      failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
    }, { headless: true }));
  }
  return { ...cloneFrame(padFrame), t };
}

describe('framing Gagarin', () => {
  it('widens from the seat to the man under both his canopies, and closes in once he is down', () => {
    const seat = crewViewSize({ phase: 'stabiliser', stabiliser: 1, main: 0, reserve: 0, seat: true, naz: true });
    const main = crewViewSize({ phase: 'main', stabiliser: 0, main: 1, reserve: 0, seat: false, naz: false });
    const both = crewViewSize({ phase: 'main', stabiliser: 0, main: 1, reserve: 0.6, seat: false, naz: false });
    const down = crewViewSize({ phase: 'landed', stabiliser: 0, main: 0, reserve: 0, seat: false, naz: false });
    expect(seat).toBeLessThan(main);
    expect(main).toBeLessThanOrEqual(both);
    expect(down).toBeLessThan(seat);
  });
});
