/**
 * A six-DOF vehicle between two recorded frames. Coasting, it is drawn on the
 * cubic through both frames' states (`hermite` in src/physics/frame.ts), as a
 * rendezvous is, not on the straight line between its two samples: that line
 * sags v²Δt²/8R under the arc, about 1 km half way through a 30 s orbit frame,
 * and a replayed six-DOF flight was drawn up to 1.7 km off the path it flew.
 * Kepler from the earlier frame, which the point-mass vehicle takes, is not the
 * path either: a six-DOF coast is flown with J2 and misses the later frame by
 * metres. A spent body coasting beside the vehicle goes the same way
 * (tests/debris-replay.test.ts), so the two keep their places.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { captureFrame, cloneFrame, interpolateFrames, type DebrisFrame, type VisualFrame } from '../src/physics/frame';
import { propagateKepler } from '../src/physics/orbital';
import { gravityJ2 } from '../src/physics/gravity';
import { rk4Step } from '../src/physics/integrator';
import { MU_EARTH, R_EARTH } from '../src/physics/constants';
import { dist, lerp, norm, scale, sub, v3, type Vec3 } from '../src/physics/vec3';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';

const sixDof = (): Simulation => new Simulation({ vehicleId: 'soyuz21a', satelliteId: 'progress', siteId: 'baikonur', orbit: orbitById('iss'),
  launchTime: new Date('2026-09-20T12:00:00Z'), guidance: guidanceForVehicle(vehicleById('soyuz21a'), DEFAULT_GUIDANCE, 'sixDof'),
  guidanceResolved: true, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, dynamics: { model: 'sixDof', wind: 'calm', seed: 1 } },
{ headless: true });

/** The spacecraft on a circular 220 km orbit at 51.6°, and Blok I beside it 0.5 m/s slower. */
const R0 = R_EARTH + 220e3, V0 = Math.sqrt(MU_EARTH / R0), INC = 51.6 * Math.PI / 180, T0 = 700;
const SHIP = { r: v3(R0, 0, 0), v: v3(0, V0 * Math.cos(INC), V0 * Math.sin(INC)) };
const BLOK = { r: SHIP.r, v: scale(SHIP.v, 1 - 0.5 / V0) };

type State = { r: Vec3; v: Vec3 };
const kepler = (s: State) => (dt: number): State => propagateKepler(s.r, s.v, dt);
/** Flown the way a six-DOF coast is: central gravity and J2, integrated in 0.05 s steps. */
const withJ2 = (s: State) => (dt: number): State => {
  let x = { r: s.r, v: s.v };
  const n = Math.round(dt / 0.05);
  for (let k = 0; k < n; k++) x = rk4Step(0, x, dt / n, (_t, r) => gravityJ2(r));
  return x;
};

let pad: VisualFrame | null = null;
/** A six-DOF frame (its `rigid` telemetry the stack's own) of the spacecraft flown by `ship`, with `bodies` beside it. */
function frameAt(t: number, ship: (dt: number) => State, bodies: { id: number; s: (dt: number) => State; extra?: Partial<DebrisFrame> }[] = [],
  over: Partial<VisualFrame> = {}): VisualFrame {
  pad ??= captureFrame(sixDof());
  const at = ship(t - T0);
  return { ...cloneFrame(pad), t, status: 'orbit', thrust: 0, throttle: 0, r: at.r, v: at.v, ...over,
    debris: bodies.map(({ id, s, extra }) => {
      const b = s(t - T0);
      return { id, name: 'Blok I', r: b.r, v: b.v, dir: v3(1, 0, 0), alive: true, burning: false, outcome: 'orbit', createdAt: T0 - 5,
        visual: { kind: 'upperStage', diameter: 2.66, length: 6.7, color: '#cccccc' }, ...extra } as DebrisFrame;
    }) };
}

describe('a six-DOF vehicle between two recorded frames', () => {
  it('is a six-DOF frame', () => {
    expect(frameAt(T0, kepler(SHIP)).rigid).toBeDefined();
  });

  it('stays on its orbit between two frames 30 s apart, not on the chord a kilometre inside it', () => {
    const a = frameAt(T0, kepler(SHIP)), b = frameAt(T0 + 30, kepler(SHIP));
    // the chord's midpoint is the old answer
    expect(R0 - norm(lerp(a.r, b.r, 0.5))).toBeGreaterThan(1000);
    for (const dt of [0.03, 3, 7.5, 15, 22.5, 29.97]) {
      const f = interpolateFrames(a, b, T0 + dt), flown = propagateKepler(SHIP.r, SHIP.v, dt);
      expect(dist(f.r, flown.r)).toBeLessThan(0.1);
      expect(dist(f.v, flown.v)).toBeLessThan(1e-2);
      expect(Math.abs(norm(f.r) - R0)).toBeLessThan(0.1);
    }
  });

  it('follows the J2 coast it was flown on, and meets the later frame without a jump', () => {
    const a = frameAt(T0, withJ2(SHIP)), b = frameAt(T0 + 30, withJ2(SHIP));
    // Kepler from the earlier frame misses the later one by metres
    expect(dist(propagateKepler(a.r, a.v, 30).r, b.r)).toBeGreaterThan(1);
    for (const dt of [0.03, 7.5, 15, 22.5, 29.97]) {
      const f = interpolateFrames(a, b, T0 + dt), flown = withJ2(SHIP)(dt);
      expect(dist(f.r, flown.r)).toBeLessThan(0.1);
    }
    expect(dist(interpolateFrames(a, b, T0 + 30 - 1e-6).r, b.r)).toBeLessThan(1e-2);
  });

  it('keeps a spent body coasting beside it in its place', () => {
    const bodies = [{ id: 1, s: kepler(BLOK) }];
    const a = frameAt(T0, kepler(SHIP), bodies), b = frameAt(T0 + 30, kepler(SHIP), bodies);
    for (const dt of [0.5, 5, 15, 25]) {
      const f = interpolateFrames(a, b, T0 + dt);
      const ship = propagateKepler(SHIP.r, SHIP.v, dt), blok = propagateKepler(BLOK.r, BLOK.v, dt);
      expect(dist(f.debris[0].r, blok.r)).toBeLessThan(0.1);
      expect(dist(sub(f.debris[0].r, f.r), sub(blok.r, ship.r))).toBeLessThan(0.1);
    }
  });

  it('stays on its arc in a returning ship\'s coast before the entry', () => {
    const coast = { status: 'descent' as const, descentPhase: 'coast' as const };
    const a = frameAt(T0, kepler(SHIP), [], coast), b = frameAt(T0 + 30, kepler(SHIP), [], coast);
    expect(dist(interpolateFrames(a, b, T0 + 15).r, propagateKepler(SHIP.r, SHIP.v, 15).r)).toBeLessThan(0.1);
  });

  it('keeps the straight line where it is not simply coasting', () => {
    const bodies = [{ id: 1, s: kepler(BLOK) }];
    const a = frameAt(T0, kepler(SHIP), bodies), b = frameAt(T0 + 30, kepler(SHIP), bodies);
    // the frame a burn begins on (its status already `burn`), and an engine still running at the earlier frame
    for (const [x, y] of [[a, { ...b, status: 'burn' } as VisualFrame], [{ ...a, thrust: 3920 }, b]]) {
      const mid = interpolateFrames(x, y, T0 + 15);
      expect(mid.r).toEqual(lerp(x.r, y.r, 0.5));
      expect(mid.debris[0].r).toEqual(lerp(x.debris[0].r, y.debris[0].r, 0.5));
    }
  });

  it('is a pure function of the two frames', () => {
    const bodies = [{ id: 1, s: kepler(BLOK) }];
    const a = frameAt(T0, kepler(SHIP), bodies), b = frameAt(T0 + 30, kepler(SHIP), bodies);
    const before = JSON.stringify([a, b]);
    const one = interpolateFrames(a, b, T0 + 11.3), two = interpolateFrames(a, b, T0 + 11.3);
    expect(two).toEqual(one);
    expect(two.r).not.toBe(one.r);
    expect(two.debris[0].r).not.toBe(one.debris[0].r);
    expect(JSON.stringify([a, b])).toBe(before);
  });
});
