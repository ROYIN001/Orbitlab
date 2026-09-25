/**
 * The reference frames and their angles (src/physics/reference-frames.ts,
 * roadmap E01): each frame a right-handed unit triad, each angle with the
 * standard's sign and origin, each drawn arc landing where its angle says,
 * and α β agreeing with what the six-DOF body records.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { DEG, OMEGA_EARTH, R_EARTH } from '../src/physics/constants';
import { add, cross, dot, norm, normalize, scale, v3, type Vec3 } from '../src/physics/vec3';
import { enuFrame } from '../src/physics/orbital';
import { quatFromAxisAngle, quatFromBasis, quatMultiply, type Quat } from '../src/physics/rigid/math';
import { aeroAngles } from '../src/ui/notation';
import { referenceFrames, turn, type AngleArc, type Axes, type AxisConvention, type FrameSource } from '../src/physics/reference-frames';
import { LAUNCH_TIME } from './fleet-harness';

const CONVENTIONS: AxisConvention[] = ['iso', 'gost'];
const near = (a: Vec3, b: Vec3, tol = 1e-9) => expect(norm(add(a, scale(b, -1)))).toBeLessThan(tol);

function expectTriad(axes: Axes): void {
  for (const a of [axes.x, axes.y, axes.z]) expect(norm(a)).toBeCloseTo(1, 9);
  expect(dot(axes.x, axes.y)).toBeCloseTo(0, 9);
  expect(dot(axes.y, axes.z)).toBeCloseTo(0, 9);
  near(cross(axes.x, axes.y), axes.z);
}
const lands = (arc: AngleArc, on: Vec3) => near(turn(arc.from, arc.axis, arc.angle), normalize(on), 1e-9);

// A vehicle over the equator at 0° longitude, the Earth unturned: east is +Y, north +Z, up +X.
const r0 = v3(R_EARTH + 20e3, 0, 0);
const { east, north, up } = enuFrame(r0);
const ground = (v: Vec3): Vec3 => add(v, cross(v3(0, 0, OMEGA_EARTH), r0));
const dir = (azDeg: number, elDeg: number): Vec3 => {
  const a = azDeg * DEG, e = elDeg * DEG;
  return add(scale(add(scale(east, Math.sin(a)), scale(north, Math.cos(a))), Math.cos(e)), scale(up, Math.sin(e)));
};

/** A rigid attitude with the nose on `nose`, the belly below it, and rolled right side down by `rollDeg`. */
function attitude(nose: Vec3, rollDeg: number): Quat {
  // the simulator's axes: x the nose, y the belly, z to the left
  const x = normalize(nose), left = normalize(cross(up, x));
  const q = quatFromBasis(x, cross(left, x), left);
  return quatMultiply(q, quatFromAxisAngle(v3(1, 0, 0), rollDeg * DEG));
}

describe('frames at one instant', () => {
  const src: FrameSource = { r: r0, v: ground(scale(dir(95, 30), 900)), dir: dir(90, 60), theta: 1.2,
    rigid: { attitudeQ: attitude(dir(90, 60), 0), windECI: scale(north, 20) } };

  it('are right-handed unit triads in both standards', () => {
    for (const c of CONVENTIONS) {
      const f = referenceFrames(src, 90 * DEG, c);
      for (const axes of [f.body, f.airPath!, f.normalEarth, f.flightPath!, f.orbital!, f.eci, f.ecef]) expectTriad(axes);
    }
  });

  it('put each standard\'s axes where it says: ISO y right and z down, ГОСТ y up', () => {
    const iso = referenceFrames(src, 90 * DEG, 'iso'), gost = referenceFrames(src, 90 * DEG, 'gost');
    near(iso.body.x, gost.body.x);
    near(iso.body.y, gost.body.z);
    near(iso.body.z, scale(gost.body.y, -1));
    expect(dot(iso.body.y, north)).toBeLessThan(-0.99); // flying east, the right is south
    near(iso.normalEarth.x, north); near(iso.normalEarth.y, east); near(iso.normalEarth.z, scale(up, -1));
    near(gost.normalEarth.x, east); near(gost.normalEarth.y, up); // x_g on the launch azimuth
    expect(dot(iso.flightPath!.z, up)).toBeLessThan(0);
    expect(dot(gost.flightPath!.y, up)).toBeGreaterThan(0);
    near(iso.airPath!.x, gost.airPath!.x);
    near(iso.airPath!.z, scale(gost.airPath!.y, -1));
  });

  it('draw every angle\'s arc from its origin onto the direction it measures', () => {
    for (const c of CONVENTIONS) {
      const f = referenceFrames(src, 90 * DEG, c);
      lands(f.arcs.pitch!, f.body.x);
      lands(f.arcs.yaw!, f.helpers.noseHorizontal!);
      lands(f.arcs.roll!, f.body.y);
      lands(f.arcs.alpha!, f.helpers.airInSymmetryPlane!);
      lands(f.arcs.beta!, f.airPath!.x);
      lands(f.arcs.path!, f.flightPath!.x);
      lands(f.arcs.track!, f.helpers.groundHorizontal!);
    }
  });
});

describe('angles and their signs', () => {
  const at = (nose: Vec3, rollDeg: number, v: Vec3, c: AxisConvention, azDeg = 90) =>
    referenceFrames({ r: r0, v: ground(v), dir: nose, theta: 0, rigid: { attitudeQ: attitude(nose, rollDeg), windECI: v3() } }, azDeg * DEG, c).angles;

  it('reads pitch above the horizon, and yaw from north clockwise (ISO) or from x_g, nose left (ГОСТ)', () => {
    const iso = at(dir(100, 60), 0, scale(dir(100, 60), 500), 'iso');
    const gost = at(dir(100, 60), 0, scale(dir(100, 60), 500), 'gost');
    expect(iso.pitch! / DEG).toBeCloseTo(60, 9);
    expect(gost.pitch! / DEG).toBeCloseTo(60, 9);
    expect(iso.yaw! / DEG).toBeCloseTo(100, 9);
    // 10° right of an azimuth of 90° is ψ = −10°
    expect(gost.yaw! / DEG).toBeCloseTo(-10, 9);
    expect(at(dir(280, 10), 0, scale(dir(280, 10), 500), 'iso').yaw! / DEG).toBeCloseTo(280, 9);
  });

  it('reads roll positive right side down in both', () => {
    for (const c of CONVENTIONS) {
      expect(at(dir(90, 45), 20, scale(dir(90, 45), 500), c).roll! / DEG).toBeCloseTo(20, 9);
      expect(at(dir(90, 45), -35, scale(dir(90, 45), 500), c).roll! / DEG).toBeCloseTo(-35, 9);
    }
  });

  it('reads α positive with the air from below and β with the air from the right', () => {
    // the vehicle moving a little below its nose, and to its right (south, flying east)
    const v = scale(normalize(add(add(dir(90, 30), scale(up, -0.05)), scale(north, -0.03))), 800);
    for (const c of CONVENTIONS) {
      const a = at(dir(90, 30), 0, v, c);
      expect(a.alpha!).toBeGreaterThan(0);
      expect(a.beta!).toBeGreaterThan(0);
    }
  });

  it('reads the flight-path angle and the track the way it reads pitch and yaw', () => {
    const v = scale(dir(80, 20), 1500);
    const iso = at(dir(80, 20), 0, v, 'iso'), gost = at(dir(80, 20), 0, v, 'gost');
    expect(iso.path! / DEG).toBeCloseTo(20, 9);
    expect(gost.path! / DEG).toBeCloseTo(20, 9);
    expect(iso.track! / DEG).toBeCloseTo(80, 9);
    expect(gost.track! / DEG).toBeCloseTo(10, 9);
  });

  it('has no yaw or roll with the nose vertical, and no flight-path frame on the pad', () => {
    const f = referenceFrames({ r: r0, v: ground(v3()), dir: up, theta: 0 }, 90 * DEG, 'gost');
    expect(f.angles.pitch! / DEG).toBeCloseTo(90, 9);
    expect(f.angles.yaw).toBeNull();
    expect(f.angles.roll).toBeNull();
    expect(f.flightPath).toBeNull();
    expect(f.airPath).toBeNull();
    expect(f.angles.path).toBeNull();
    // …but its pitch is still drawn, from the side it will pitch over to
    lands(f.arcs.pitch!, up);
    expect(dot(f.arcs.pitch!.from, east)).toBeCloseTo(1, 9);
  });

  it('turns ECEF from ECI by the Greenwich sidereal angle, and lays RSW on the orbit', () => {
    const r = v3(7e6, 0, 0), v = v3(0, 6000, 4000);
    const f = referenceFrames({ r, v, dir: normalize(v), theta: 7 }, 0, 'iso');
    expect(f.sidereal).toBeCloseTo(7 - 2 * Math.PI, 12);
    near(f.ecef.x, v3(Math.cos(7), Math.sin(7), 0));
    near(f.orbital!.x, v3(1, 0, 0));
    near(f.orbital!.z, normalize(cross(r, v)));
    expect(dot(f.orbital!.y, v)).toBeGreaterThan(0);
  });
});

describe('on a flying Falcon 9', () => {
  const sim = new Simulation({ vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'), launchTime: LAUNCH_TIME,
    guidance: guidanceForVehicle(vehicleById('falcon9'), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, dynamics: { model: 'sixDof', wind: 'crosswind', seed: 20260919 } }, { headless: true });
  const az = sim.plan.azimuthRotating;
  const seen: { t: number; r: Vec3; dir: Vec3; ground: Vec3; iso: ReturnType<typeof referenceFrames>; gost: ReturnType<typeof referenceFrames>; recorded: { alpha: number; beta: number } }[] = [];
  while (sim.state.t < 110) {
    sim.step(sim.suggestedDt());
    if (!sim.state.rigid || sim.state.t < 5) continue;
    const rigid = sim.state.rigid;
    const src: FrameSource = { r: sim.state.r, v: sim.state.v, dir: sim.state.dir, theta: 0, rigid: { attitudeQ: rigid.attitudeQ, windECI: rigid.windECI } };
    seen.push({ t: sim.state.t, r: sim.state.r, dir: sim.state.dir, ground: add(sim.state.v, scale(cross(v3(0, 0, OMEGA_EARTH), sim.state.r), -1)), iso: referenceFrames(src, az, 'iso'), gost: referenceFrames(src, az, 'gost'),
      recorded: aeroAngles(rigid.angleOfAttack, rigid.sideslip) });
  }

  it('reads the same α and β as the six-DOF body records, wind and all', { timeout: 60_000 }, () => {
    const flying = seen.filter((s) => s.iso.angles.alpha !== null);
    expect(flying.length).toBeGreaterThan(100);
    for (const s of flying) {
      expect(s.iso.angles.alpha!).toBeCloseTo(s.recorded.alpha, 6);
      expect(s.iso.angles.beta!).toBeCloseTo(s.recorded.beta, 6);
      expect(s.gost.angles.alpha!).toBeCloseTo(s.recorded.alpha, 6);
    }
  });

  it('reads yaw and track as the bearings of the nose and of the ground velocity, ГОСТ\'s from the launch azimuth', () => {
    const bearing = (s: typeof seen[number], a: Vec3) => {
      const { east: e, north: n } = enuFrame(s.r);
      return (Math.atan2(dot(a, e), dot(a, n)) + 2 * Math.PI) % (2 * Math.PI);
    };
    const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    const late = seen.filter((s) => s.t > 30);
    for (const s of late) {
      expect(s.iso.angles.yaw!).toBeCloseTo(bearing(s, s.dir), 9);
      expect(s.iso.angles.track!).toBeCloseTo(bearing(s, s.ground), 9);
      expect(s.gost.angles.yaw!).toBeCloseTo(wrap(az - s.iso.angles.yaw!), 9);
      expect(s.gost.angles.track!).toBeCloseTo(wrap(az - s.iso.angles.track!), 9);
      expect(s.gost.angles.roll!).toBeCloseTo(s.iso.angles.roll!, 12);
    }
  });

  it('flies the first minute of the gravity turn with the flight path just under the nose', () => {
    for (const s of seen.filter((x) => x.t > 30 && x.t < 90)) {
      expect(Math.abs(s.iso.angles.alpha!)).toBeLessThan(5 * DEG);
      expect(Math.abs(s.iso.angles.pitch! - s.iso.angles.path!)).toBeLessThan(5 * DEG);
    }
  });
});
