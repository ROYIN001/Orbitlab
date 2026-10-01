/**
 * Vostok-1's return as physics (C01, docs/PHYSICS.md §13.6), flown from a
 * made-up circular orbit rather than the mission: the TDU-1's burn on its
 * flowing mass and held thrust line, the venting's spin, the separation on
 * the backup's time, the sphere's drag through its centre, the WGS-84 datum.
 * The whole flight against the flown one is tests/vostok1-harness.ts.
 */
import { describe, expect, it } from 'vitest';
import { EscapeFlight, VOSTOK_CAPSULE, capsuleConfiguration, pairConfiguration, retroDeltaV, retroDirection, retroPropellantGone,
  type DescentCapsule, type EscapeEvent, type EscapeRelease } from '../src/physics/rigid/escape';
import { geodetic, geodeticHeight, WGS84_A, WGS84_F } from '../src/physics/geodesy';
import { geodetic as densityGeodetic } from '../src/physics/propagator/density';
import { gravityJ2 } from '../src/physics/gravity';
import { targetAttitude } from '../src/physics/rigid/runtime';
import { quatFromAxisAngle } from '../src/physics/rigid/math';
import { MU_EARTH, R_EARTH } from '../src/physics/constants';
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../src/physics/vec3';
import type { RigidState } from '../src/physics/rigid/integrator';

const DEG = Math.PI / 180;

/** A circular orbit 250 km up, inclined 65°, its state at the equator; the pair turned as `beginReturn` turns it. */
function start(pitchDeg = 0): RigidState {
  const r = v3(R_EARTH + 250e3, 0, 0), speed = Math.sqrt(MU_EARTH / norm(r));
  const v = v3(0, speed * Math.cos(65 * DEG), speed * Math.sin(65 * DEG));
  return { r, v, attitudeQ: targetAttitude(scale(retroDirection(r, v, pitchDeg * DEG), -1), cross(r, v)), omegaBody: v3() };
}

function flight(state: RigidState, releases: { what: EscapeRelease; t: number; mass?: number }[] = [], capsule: DescentCapsule = VOSTOK_CAPSULE): EscapeFlight {
  return new EscapeFlight('capsule', state, 0, v3(0, 1, 0), { groundElevation: () => 0, wind: () => v3() },
    (what, _s, t, mass) => releases.push({ what, t, mass }), capsule);
}

/** Fly to `until` s, collecting the events. */
function fly(f: EscapeFlight, until: number, events: EscapeEvent[] = []): EscapeEvent[] {
  let t = 0;
  while (t < until - 1e-9) {
    const dt = Math.min(f.suggestedDt(), until - t);
    f.step(t, dt);
    t += dt;
    events.push(...f.takeEvents());
  }
  return events;
}

/** The same start coasted on J2 gravity alone, RK4. */
function coast(s: RigidState, until: number): { r: Vec3; v: Vec3 } {
  let r = s.r, v = s.v;
  const h = 0.01;
  for (let t = 0; t < until - 1e-9; t += h) {
    const k1v = gravityJ2(r), k1r = v;
    const k2v = gravityJ2(add(r, scale(k1r, h / 2))), k2r = add(v, scale(k1v, h / 2));
    const k3v = gravityJ2(add(r, scale(k2r, h / 2))), k3r = add(v, scale(k2v, h / 2));
    const k4v = gravityJ2(add(r, scale(k3r, h))), k4r = add(v, scale(k3v, h));
    r = add(r, scale(add(add(k1r, scale(k2r, 2)), add(scale(k3r, 2), k4r)), h / 6));
    v = add(v, scale(add(add(k1v, scale(k2v, 2)), add(scale(k3v, 2), k4v)), h / 6));
  }
  return { r, v };
}

describe('the WGS-84 datum', () => {
  it('is shared with the long-term propagator', () => {
    expect(densityGeodetic).toBe(geodetic);
  });
  it('puts the ellipsoid on the equator at the sphere and 21.4 km under it at the poles', () => {
    expect(geodeticHeight(v3(WGS84_A, 0, 0))).toBeCloseTo(0, 6);
    expect(geodeticHeight(v3(0, 0, WGS84_A * (1 - WGS84_F)))).toBeCloseTo(0, 6);
    // a point 300 m above the sphere at 51° N is about 13 km above the ellipsoid
    const lat = 51 * DEG, r = scale(v3(Math.cos(lat), 0, Math.sin(lat)), R_EARTH + 300);
    expect(geodeticHeight(r) / 1000).toBeGreaterThan(12.9);
    expect(geodeticHeight(r) / 1000).toBeLessThan(13.3);
  });
  it('measures the return from it', () => {
    const f = flight(start());
    expect(f.altitude(f.state.r)).toBeCloseTo(geodeticHeight(f.state.r), 9);
  });
});

describe("Vostok's TDU-1", () => {
  it('gives 132 m/s of the 136 set, on its flowing mass, along the line held from its launch command', () => {
    // the line's pitch above the horizontal, reconstructed from the landing (§13.6)
    const pitch = VOSTOK_CAPSULE.retro!.pitch!;
    const s = start(pitch), f = flight(s);
    const events = fly(f, 44);
    const keys = events.map((e) => `${e.key}@${e.t!.toFixed(2)}`);
    expect(keys).toEqual(['evt.retroFire@2.20', 'evt.retroShortfall@42.20']);
    const fuelOut = events[1];
    expect(Math.abs(Number(fuelOut.params!.dv) - 132)).toBeLessThan(0.5);
    // what the integration actually delivered, against a coast on the same gravity
    const c = coast(s, 44), dv = sub(f.state.v, c.v);
    expect(Math.abs(norm(dv) - 132)).toBeLessThan(0.5);
    // held: at that pitch above the horizontal at the launch command, against the flight, whatever the orbit has
    // turned since
    const r2 = coast(s, 2.2), line = retroDirection(r2.r, r2.v, pitch * DEG);
    expect(Math.acos(Math.min(1, dot(normalize(dv), line))) / DEG).toBeLessThan(0.05);
    expect(retroDeltaV(VOSTOK_CAPSULE.retro!, 44, VOSTOK_CAPSULE.mass)).toBeCloseTo(norm(dv), 0);
  });
  it('takes all 280 kg by the cut-off, and the venting spins the pair at about 30°/s', () => {
    const f = flight(start());
    const events = fly(f, 50);
    expect(retroPropellantGone(VOSTOK_CAPSULE.retro!, 44)).toBeCloseTo(280, 9);
    expect(f.config.mass).toBeCloseTo(4725 - 280, 6);
    const cutoff = events.find((e) => e.key === 'evt.retroCutoff')!;
    expect(cutoff.t).toBeCloseTo(44, 6);
    expect(Math.abs(Number(cutoff.params!.rate) - 30)).toBeLessThanOrEqual(1);
    expect(Math.abs(norm(f.state.omegaBody) / DEG - 30)).toBeLessThan(1);
  });
  it('pitched up, pushes the line above the horizontal by as much', () => {
    const s = start(5), f = flight(s, [], { ...VOSTOK_CAPSULE, retro: { ...VOSTOK_CAPSULE.retro!, pitch: 5 } });
    fly(f, 44);
    const r2 = coast(s, 2.2), dv = normalize(sub(f.state.v, coast(s, 44).v));
    const up = normalize(r2.r), along = normalize(cross(cross(r2.r, r2.v), up));
    expect(Math.atan2(dot(dv, up), -dot(dv, along)) / DEG).toBeCloseTo(5, 1);
  });
});

describe("Vostok's separation", () => {
  it('waits for the straps at 10:36 and the cables after them, then flies the 2,460 kg sphere', () => {
    const releases: { what: EscapeRelease; t: number; mass?: number }[] = [];
    const f = flight(start(), releases);
    const events = fly(f, 662);
    const at = (key: string) => events.find((e) => e.key === key)?.t;
    expect(at('evt.vostokStraps')).toBeCloseTo(655.8, 6);
    expect(at('evt.vostokSeparation')).toBeCloseTo(659.8, 6);
    expect(f.config.mass).toBeCloseTo(2460, 9);
    expect(releases).toEqual([{ what: 'instrumentModule', t: expect.closeTo(659.8, 6), mass: expect.closeTo(1985, 6) }]);
  });
});

describe('the sphere', () => {
  it('feels the same drag whichever way it is turned: the resultant through its centre', () => {
    const r = v3(R_EARTH + 40e3, 0, 0), v = v3(-1500, 6000, 0);
    const turns = [0, 70, 180].map((deg) => {
      const f = flight({ r, v, attitudeQ: quatFromAxisAngle(v3(0, 0, 1), deg * DEG), omegaBody: v3() });
      // stepped 1,000 s on: past the burn and the separation, a sphere alone in the air
      f.step(1000, 0.01);
      expect(f.config.mass).toBeCloseTo(2460, 9);
      return f.state.v;
    });
    expect(norm(sub(turns[0], turns[1]))).toBeLessThan(1e-6);
    expect(norm(sub(turns[0], turns[2]))).toBeLessThan(1e-6);
  });
  it('is turned only by its CG, 0.2 m toward the heat shield from its centre', () => {
    const c = capsuleConfiguration(true, VOSTOK_CAPSULE, 2265);
    expect(c.aero.sphere).toBe(true);
    expect(c.aero.cpX).toBeCloseTo(-0.2, 9);
    // with the instrument module on, the pair is heavier and harder to turn
    const pair = pairConfiguration(VOSTOK_CAPSULE, 2265);
    expect(pair.mass).toBe(4725);
    expect(pair.inertia[4]).toBeGreaterThan(3 * c.inertia[4]);
  });
});
