/**
 * A spent body between two recorded frames. One coasting out of the air goes
 * the vehicle's way (its Kepler arc while the vehicle coasts), not along the
 * straight line between its two samples: that line sags v²Δt²/8R under the
 * arc, 115 m half way through a 10 s orbit frame, and a replayed Soyuz-2.1a's
 * Blok I was drawn below the spacecraft, seeming to fall away at 45 m/s. Where
 * the vehicle itself is drawn on the line (under thrust, six-DOF), the body
 * keeps the line too, so the two never part.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { FlightRecorder } from '../src/replay/recorder';
import { captureFrame, cloneFrame, interpolateFrames, type DebrisFrame, type VisualFrame } from '../src/physics/frame';
import { propagateKepler } from '../src/physics/orbital';
import { MU_EARTH, R_EARTH } from '../src/physics/constants';
import { dist, lerp, norm, scale, sub, v3, type Vec3 } from '../src/physics/vec3';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';

const soyuz = (): Simulation => new Simulation({ vehicleId: 'soyuz21a', satelliteId: 'progress', siteId: 'baikonur', orbit: orbitById('iss'),
  launchTime: new Date('2026-09-20T12:00:00Z'), guidance: guidanceForVehicle(vehicleById('soyuz21a'), DEFAULT_GUIDANCE, 'pointMass'),
  guidanceResolved: true, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 } },
{ headless: true });

/** The spacecraft on a circular 220 km orbit at 51.6°, at the instant Blok I leaves it 0.5 m/s slower. */
const R0 = R_EARTH + 220e3, V0 = Math.sqrt(MU_EARTH / R0), INC = 51.6 * Math.PI / 180, T0 = 530;
const SHIP = { r: v3(R0, 0, 0), v: v3(0, V0 * Math.cos(INC), V0 * Math.sin(INC)) };
const BLOK = { r: SHIP.r, v: scale(SHIP.v, 1 - 0.5 / V0) };

function body(id: number, s: { r: Vec3; v: Vec3 }, extra: Partial<DebrisFrame> = {}): DebrisFrame {
  return { id, name: 'Blok I', r: s.r, v: s.v, dir: v3(1, 0, 0), alive: true, burning: false, outcome: 'orbit', createdAt: T0,
    visual: { kind: 'upperStage', diameter: 2.66, length: 6.7, color: '#cccccc' }, ...extra };
}

let pad: VisualFrame | null = null;
/** The frames at T0 and T0 + span of the spacecraft coasting in orbit with `bodies` beside it, each flown on its Kepler arc. */
function pair(bodies: { id: number; s: { r: Vec3; v: Vec3 }; extra?: Partial<DebrisFrame> }[], span = 10): [VisualFrame, VisualFrame] {
  pad ??= captureFrame(soyuz());
  const at = (t: number): VisualFrame => {
    const ship = propagateKepler(SHIP.r, SHIP.v, t - T0);
    return { ...cloneFrame(pad!), t, status: 'orbit', thrust: 0, throttle: 0, r: ship.r, v: ship.v,
      debris: bodies.map(({ id, s, extra }) => body(id, propagateKepler(s.r, s.v, t - T0), extra)) };
  };
  return [at(T0), at(T0 + span)];
}

describe('a spent body between two recorded frames', () => {
  it('stays on its orbit half way between two frames 10 s apart, not on the chord 115 m inside it', () => {
    // a second body a quarter of an orbit ahead on the spacecraft's own circle
    const ahead = { r: v3(0, R0 * Math.cos(INC), R0 * Math.sin(INC)), v: v3(-V0, 0, 0) };
    const [a, b] = pair([{ id: 1, s: BLOK }, { id: 2, s: ahead }]);
    const mid = interpolateFrames(a, b, T0 + 5);
    const circle = mid.debris.find((d) => d.id === 2)!;
    expect(Math.abs(norm(circle.r) - R0)).toBeLessThan(1);
    expect(Math.abs(norm(circle.v) - V0)).toBeLessThan(1e-3);
    // the chord's midpoint is the old answer: 115 m inside the circle
    expect(R0 - norm(lerp(a.debris[1].r, b.debris[1].r, 0.5))).toBeGreaterThan(100);
    // Blok I, at the instants the replay was measured at (1.4, 21, 58 and 115 m off before), keeps its place beside the spacecraft
    for (const t of [0.03, 0.5, 1.5, 5, 9.5]) {
      const f = interpolateFrames(a, b, T0 + t);
      const ship = propagateKepler(SHIP.r, SHIP.v, t), blok = propagateKepler(BLOK.r, BLOK.v, t);
      const drawn = sub(f.debris[0].r, f.r), flown = sub(blok.r, ship.r);
      expect(dist(drawn, flown)).toBeLessThan(1);
      expect(dist(f.debris[0].v, blok.v)).toBeLessThan(1e-3);
    }
  });

  it('keeps the straight line wherever the vehicle beside it takes the line', () => {
    const [a, b] = pair([{ id: 1, s: BLOK }]);
    // the frame a burn begins on (its status already `burn`, the engine still dark): the vehicle is drawn on the line
    const burn: VisualFrame = { ...b, status: 'burn' };
    const mid = interpolateFrames(a, burn, T0 + 5);
    expect(mid.r).toEqual(lerp(a.r, b.r, 0.5));
    expect(mid.debris[0].r).toEqual(lerp(a.debris[0].r, b.debris[0].r, 0.5));
  });

  it('keeps the straight line for a body in the air or under its own thrust', () => {
    const low = { r: v3(R_EARTH + 60e3, 0, 0), v: v3(0, 2000, 0) };
    const [a, b] = pair([{ id: 1, s: low, extra: { outcome: undefined } }, { id: 2, s: BLOK, extra: { burning: true } }]);
    const mid = interpolateFrames(a, b, T0 + 5);
    expect(mid.debris[0].r).toEqual(lerp(a.debris[0].r, b.debris[0].r, 0.5));
    expect(mid.debris[1].r).toEqual(lerp(a.debris[1].r, b.debris[1].r, 0.5));
    // while the vehicle itself is on its arc
    expect(dist(mid.r, propagateKepler(SHIP.r, SHIP.v, 5).r)).toBeLessThan(1e-6);
  });

  it('is a pure function of the two frames', () => {
    const [a, b] = pair([{ id: 1, s: BLOK }]);
    const before = JSON.stringify([a, b]);
    const one = interpolateFrames(a, b, T0 + 3.7), two = interpolateFrames(a, b, T0 + 3.7);
    expect(two).toEqual(one);
    expect(two.debris[0].r).not.toBe(one.debris[0].r);
    expect(JSON.stringify([a, b])).toBe(before);
  });

  it('draws a recorded Soyuz-2.1a\'s Blok I beside the spacecraft after the separation, not falling away from it', () => {
    const sim = soyuz(), rec = new FlightRecorder();
    rec.start(sim);
    let sep = -1, guard = 0;
    while (!sim.done && (sep < 0 || sim.state.t < sep + 15) && guard++ < 20000) {
      rec.advance(1, 5000);
      if (sep < 0) sep = sim.events.find((e) => e.key === 'evt.payloadSep')?.t ?? -1;
    }
    expect(sep).toBeGreaterThan(0);
    const frames = rec.frames;
    const blok = frames[frames.length - 1].debris.find((d) => d.createdAt === sep && d.outcome === 'orbit');
    expect(blok?.name).toMatch(/Blok I/);
    for (const t of [0.03, 0.5, 1.5, 5]) {
      const k = frames.findIndex((f) => f.t > sep + t) - 1;
      const a = frames[k], b = frames[k + 1];
      expect(b.t - a.t).toBeGreaterThan(5);
      const f = interpolateFrames(a, b, sep + t);
      const at = a.debris.find((d) => d.id === blok!.id)!, drawn = f.debris.find((d) => d.id === blok!.id)!;
      const ship = propagateKepler(a.r, a.v, sep + t - a.t), flown = propagateKepler(at.r, at.v, sep + t - a.t);
      // before: 1.38, 21.9, 58.7 and 115.4 m below its place
      expect(dist(sub(drawn.r, f.r), sub(flown.r, ship.r))).toBeLessThan(1);
    }
  });
});
