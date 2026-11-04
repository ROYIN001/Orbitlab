/**
 * A six-DOF vehicle between two recorded frames. Coasting, it is drawn on the
 * cubic through both frames' states (`hermite` in src/physics/frame.ts), as a
 * rendezvous is, not on the straight line between its two samples: that line
 * sags v²Δt²/8R under the arc, about 1 km half way through a 30 s orbit frame
 * (4 km over the minute a thinned coast keeps), and a replayed six-DOF flight
 * was drawn up to 4.1 km off the path it flew (a thinned 60 s coast; 1.7 km in
 * Starship's descent coast), a docked spacecraft 1.5 km off the station's
 * port. On a span of a quarter of the orbit or more, which only a hard-thinned
 * recording leaves, it keeps the line: the cubic swings out further there. Kepler from the earlier
 * frame, which the point-mass vehicle takes, is not the path either: a six-DOF
 * coast is flown with J2 and misses the later frame by metres. The cubic meets
 * both ends, so it needs no engine off at the earlier frame either: the tail
 * of a cut-off was on the line, 394 m off over Starship's 18 s span. A spent
 * body coasting beside the vehicle goes the same way
 * (tests/debris-replay.test.ts), so the two keep their places.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { captureFrame, cloneFrame, interpolateFrames, type DebrisFrame, type VisualFrame } from '../src/physics/frame';
import type { ApolloState } from '../src/physics/sim/apollo';
import type { RendezvousState } from '../src/physics/sim/rendezvous';
import { FlightRecorder } from '../src/replay/recorder';
import { ReplayPlayer } from '../src/replay/player';
import { sameRigidConfiguration } from '../src/physics/rigid/telemetry';
import { elementsFromState, propagateKepler } from '../src/physics/orbital';
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
/** Its period, s: about 88 minutes. */
const PERIOD = 2 * Math.PI * Math.sqrt(R0 ** 3 / MU_EARTH);
const SHIP = { r: v3(R0, 0, 0), v: v3(0, V0 * Math.cos(INC), V0 * Math.sin(INC)) };
const BLOK = { r: SHIP.r, v: scale(SHIP.v, 1 - 0.5 / V0) };
/** Blok A coming down through the air 90 km up, under the 140 km a body's coast blend asks for. */
const LOW = { r: v3(R_EARTH + 90e3, -800e3, 0), v: v3(-500, 6000, 0) };

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
type Body = { id: number; s: (dt: number) => State; extra?: Partial<DebrisFrame>; ownRigid?: boolean };
/** A six-DOF frame (its `rigid` telemetry the stack's own) of the spacecraft flown by `ship`, with `bodies` beside it. */
function frameAt(t: number, ship: (dt: number) => State, bodies: Body[] = [], over: Partial<VisualFrame> = {}): VisualFrame {
  pad ??= captureFrame(sixDof());
  const at = ship(t - T0);
  return { ...cloneFrame(pad), t, status: 'orbit', thrust: 0, throttle: 0, r: at.r, v: at.v, elements: { ...pad.elements, period: PERIOD }, ...over,
    debris: bodies.map(({ id, s, extra, ownRigid }) => {
      const b = s(t - T0);
      return { id, name: 'Blok I', r: b.r, v: b.v, dir: v3(1, 0, 0), alive: true, burning: false, outcome: 'orbit', createdAt: T0 - 5,
        visual: { kind: 'upperStage', diameter: 2.66, length: 6.7, color: '#cccccc' },
        // a body flown six-DOF carries telemetry of its own, of one configuration at both ends
        ...(ownRigid ? { rigid: { ...structuredClone(pad!.rigid!), bodyId: `debris-${id}`, configurationId: 'blok-i' } } : {}),
        ...extra } as DebrisFrame;
    }) };
}
const pair = (ship: (dt: number) => State, bodies: Body[] = [], over: Partial<VisualFrame> = {}, span = 30): [VisualFrame, VisualFrame] =>
  [frameAt(T0, ship, bodies, over), frameAt(T0 + span, ship, bodies, over)];
/** 20 m out from a state along its radius, the velocity scaled with it: a port on a body turning once an orbit. */
const port = (s: State): State => ({ r: scale(s.r, 1 + 20 / norm(s.r)), v: scale(s.v, 1 + 20 / norm(s.r)) });
/** Docked: status 'orbit', the rendezvous's rigid telemetry, the spacecraft 20 m out from the station on its port. */
function docked(t: number): VisualFrame {
  const st = kepler(SHIP)(t - T0);
  return frameAt(t, (dt) => port(kepler(SHIP)(dt)), [], { rendezvous: { phase: 'docked', station: { r: st.r, v: st.v, q: { w: 1, x: 0, y: 0, z: 0 } },
    rel: { r: v3(20, 0, 0), v: v3() }, burns: [], range: 20, rangeRate: 0, propellant: 100 } as unknown as RendezvousState });
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const x of Object.values(o)) deepFreeze(x); }
  return o;
}

describe('a six-DOF vehicle between two recorded frames', () => {
  it('is a pair of six-DOF frames of one configuration, which the blend reaches', () => {
    const [a, b] = pair(kepler(SHIP));
    expect(a.rigid).toBeDefined();
    // anything else holds frame a (the early return in interpolateFrames)
    expect(sameRigidConfiguration(a.rigid, b.rigid)).toBe(true);
    expect(interpolateFrames(a, b, T0 + 15).r).not.toEqual(a.r);
  });

  it('stays on its orbit between two frames 30 s apart, not on the chord a kilometre inside it', () => {
    const [a, b] = pair(kepler(SHIP));
    // the chord's midpoint is the old answer
    expect(R0 - norm(lerp(a.r, b.r, 0.5))).toBeGreaterThan(1000);
    for (const dt of [0.03, 3, 7.5, 15, 22.5, 29.97]) {
      const f = interpolateFrames(a, b, T0 + dt), flown = propagateKepler(SHIP.r, SHIP.v, dt);
      expect(dist(f.r, flown.r)).toBeLessThan(0.1);
      expect(dist(f.v, flown.v)).toBeLessThan(1e-2);
      expect(Math.abs(norm(f.r) - R0)).toBeLessThan(0.1);
    }
  });

  it('keeps the line over a span longer than a quarter of its orbit, where in an eccentric orbit the cubic can swing out further', () => {
    // Only a recording thinned hard leaves such a span: a six-DOF spacecraft docked for hours under the frame budget
    // kept one of 7,981 s. Over more than a whole circle the cubic went 23,000 km off, the line 9,300 km.
    const sat = (dt: number) => kepler(SHIP)(dt);
    for (const span of [0.3 * PERIOD, 1.44 * PERIOD]) {
      const [a, b] = pair(sat, [{ id: 1, s: kepler(BLOK) }], {}, span);
      const mid = interpolateFrames(a, b, T0 + span / 2);
      expect(mid.r).toEqual(lerp(a.r, b.r, 0.5));
      expect(mid.debris[0].r).toEqual(lerp(a.debris[0].r, b.debris[0].r, 0.5));
    }
    // and under a quarter, the cubic: over 0.2 of a circle, 1,067 s, it is 42 km off where the line is 1,260 km
    const [a, b] = pair(sat, [], {}, 0.2 * PERIOD);
    const mid = interpolateFrames(a, b, T0 + 0.1 * PERIOD);
    expect(dist(mid.r, kepler(SHIP)(0.1 * PERIOD).r)).toBeLessThan(50e3);
    expect(dist(lerp(a.r, b.r, 0.5), kepler(SHIP)(0.1 * PERIOD).r)).toBeGreaterThan(1e6);
  });

  it('stays on its arc over a minute, the widest gap thinning leaves in a coast', () => {
    // FlightRecorder.thin keeps a coast frame a minute (MAX_THINNED_GAP): the chord is 4 km inside the arc there
    const [a, b] = pair(withJ2(SHIP), [], {}, 60);
    expect(R0 - norm(lerp(a.r, b.r, 0.5))).toBeGreaterThan(4000);
    expect(dist(interpolateFrames(a, b, T0 + 30).r, withJ2(SHIP)(30).r)).toBeLessThan(1);
  });

  it('follows the J2 coast it was flown on, and meets the later frame without a jump', () => {
    const [a, b] = pair(withJ2(SHIP));
    // Kepler from the earlier frame misses the later one by metres
    expect(dist(propagateKepler(a.r, a.v, 30).r, b.r)).toBeGreaterThan(1);
    for (const dt of [0.03, 7.5, 15, 22.5, 29.97]) {
      const f = interpolateFrames(a, b, T0 + dt), flown = withJ2(SHIP)(dt);
      expect(dist(f.r, flown.r)).toBeLessThan(0.1);
      expect(dist(f.v, flown.v)).toBeLessThan(1e-2);
    }
    // a microsecond before the later frame: where it was a microsecond before, not where Kepler from a puts it
    expect(dist(interpolateFrames(a, b, T0 + 30 - 1e-6).r, sub(b.r, scale(b.v, 1e-6)))).toBeLessThan(1e-4);
  });

  it('keeps a spent body coasting beside it in its place, one flown six-DOF too', () => {
    const [a, b] = pair(kepler(SHIP), [{ id: 1, s: kepler(BLOK) }, { id: 2, s: kepler(BLOK), ownRigid: true }]);
    for (const dt of [0.5, 5, 15, 25]) {
      const f = interpolateFrames(a, b, T0 + dt);
      const ship = propagateKepler(SHIP.r, SHIP.v, dt), blok = propagateKepler(BLOK.r, BLOK.v, dt);
      for (const d of f.debris) {
        expect(dist(d.r, blok.r)).toBeLessThan(0.1);
        expect(dist(sub(d.r, f.r), sub(blok.r, ship.r))).toBeLessThan(0.1);
      }
    }
  });

  it('stays on the station\'s port while docked, as the station stays on its arc', () => {
    const a = docked(T0), b = docked(T0 + 30);
    for (const dt of [3, 15, 27]) {
      const f = interpolateFrames(a, b, T0 + dt);
      expect(Math.abs(dist(f.r, f.rendezvous!.station.r) - 20)).toBeLessThan(0.1);
    }
  });

  it('keeps the station with the docked spacecraft over a span longer than a quarter of the orbit', () => {
    // A six-DOF Soyuz MS docked for 12,000 s under the frame budget kept one docked span of 7,981 s, 1.5 orbits. The
    // spacecraft keeps the line there (the cubic swings out further); the station took the cubic, 14,945 km from it.
    const a = docked(T0), b = docked(T0 + 7981);
    for (const dt of [800, 2000, 4000, 6000, 7200]) {
      const f = interpolateFrames(a, b, T0 + dt);
      // within the port's 20 m of the station: they go the same way (the line between two places 20 m out on the
      // station's turning radius passes closer to it than that)
      expect(dist(f.r, f.rendezvous!.station.r)).toBeLessThanOrEqual(20 + 1e-6);
      // and the station swings out no further than the line would draw it, as the cubic did (23,162 km off there)
      const flown = kepler(SHIP)(dt).r, line = lerp(a.rendezvous!.station.r, b.rendezvous!.station.r, dt / 7981);
      expect(dist(f.rendezvous!.station.r, flown)).toBeLessThanOrEqual(dist(line, flown) + 1);
    }
    // under a quarter of the orbit both take the cubic, as before: 0.2 of it, 1,067 s
    const c = docked(T0 + 0.2 * PERIOD), mid = interpolateFrames(a, c, T0 + 0.1 * PERIOD);
    expect(Math.abs(dist(mid.r, mid.rendezvous!.station.r) - 20)).toBeLessThan(0.5);
    expect(dist(mid.rendezvous!.station.r, kepler(SHIP)(0.1 * PERIOD).r)).toBeLessThan(50e3);
  });

  it('stays on its arc in a returning ship\'s coast before the entry', () => {
    const [a, b] = pair(kepler(SHIP), [], { status: 'descent', descentPhase: 'coast' });
    expect(dist(interpolateFrames(a, b, T0 + 15).r, propagateKepler(SHIP.r, SHIP.v, 15).r)).toBeLessThan(0.1);
  });

  it('takes the cubic in Apollo as a point-mass Apollo does, its S-IVB venting or not', () => {
    // the parking orbit: status 'orbit', the hydrogen vent's few hundred newtons on the thrust
    const apollo = { apollo: { phase: 'parking', tliTime: 0, moon: { alt: 0, speed: 0 }, next: 0 } as ApolloState, thrust: 300 };
    const [a, b] = pair(kepler(SHIP), [], apollo);
    const mid = interpolateFrames(a, b, T0 + 15);
    expect(dist(mid.r, propagateKepler(SHIP.r, SHIP.v, 15).r)).toBeLessThan(0.1);
    const pointMass = (f: VisualFrame): VisualFrame => ({ ...f, rigid: undefined });
    expect(interpolateFrames(pointMass(a), pointMass(b), T0 + 15).r).toEqual(mid.r);
    // the vent off: point-mass Apollo on the cubic too, not Kepler from the earlier frame
    const [p, q] = pair(kepler(SHIP), [], { ...apollo, thrust: 0 });
    expect(interpolateFrames(pointMass(p), pointMass(q), T0 + 15).r).toEqual(interpolateFrames(p, q, T0 + 15).r);
    // and under an engine's full thrust (the S-IVB's restart, the service engine's burns), as before for a point mass
    const [x, y] = pair(kepler(SHIP), [], { ...apollo, thrust: 1e5 });
    expect(interpolateFrames(x, y, T0 + 15).r).toEqual(interpolateFrames(pointMass(x), pointMass(y), T0 + 15).r);
  });

  it('takes the cubic through the tail of a cut-off at the earlier frame, where a point mass keeps the line', () => {
    // the frame a cut-off ends a burn on reads its last fraction of thrust while the status is already a coast
    const [a, b] = pair(kepler(SHIP), [{ id: 1, s: kepler(BLOK) }], { status: 'coast', thrust: 3920 });
    const mid = interpolateFrames(a, b, T0 + 15);
    expect(dist(mid.r, propagateKepler(SHIP.r, SHIP.v, 15).r)).toBeLessThan(0.1);
    expect(dist(mid.debris[0].r, propagateKepler(BLOK.r, BLOK.v, 15).r)).toBeLessThan(0.1);
    // a point mass there keeps the straight line, as on main: Kepler from that frame would carry on the thrust's tail
    const pointMass = (f: VisualFrame): VisualFrame => ({ ...f, rigid: undefined });
    const pm = interpolateFrames(pointMass(a), pointMass(b), T0 + 15);
    expect(pm.r).toEqual(lerp(a.r, b.r, 0.5));
    expect(pm.debris[0].r).toEqual(lerp(a.debris[0].r, b.debris[0].r, 0.5));
  });

  it('keeps the straight line where it is not simply coasting', () => {
    const [a, b] = pair(kepler(SHIP), [{ id: 1, s: kepler(BLOK) }]);
    // the frame a burn begins on (its status already `burn`), and the last span of the ascent
    for (const [x, y] of [[a, { ...b, status: 'burn' }], [{ ...a, status: 'ascent' }, b]] as [VisualFrame, VisualFrame][]) {
      const mid = interpolateFrames(x, y, T0 + 15);
      expect(mid.r).toEqual(lerp(x.r, y.r, 0.5));
      expect(mid.debris[0].r).toEqual(lerp(x.debris[0].r, y.debris[0].r, 0.5));
    }
  });

  it('leaves a body under its own thrust above the air on the line while the vehicle takes its arc', () => {
    // one in the air takes the cubic through both ends, firing (a recovery burn) or not: tests/debris-replay.test.ts
    const [a, b] = pair(kepler(SHIP), [{ id: 1, s: kepler(LOW), extra: { outcome: undefined, burning: true } }, { id: 2, s: kepler(BLOK), extra: { burning: true } }]);
    const mid = interpolateFrames(a, b, T0 + 15);
    expect(dist(mid.r, propagateKepler(SHIP.r, SHIP.v, 15).r)).toBeLessThan(0.1);
    expect(dist(mid.debris[0].r, propagateKepler(LOW.r, LOW.v, 15).r)).toBeLessThan(1);
    expect(mid.debris[1].r).toEqual(lerp(a.debris[1].r, b.debris[1].r, 0.5));
  });

  it('holds the earlier frame across a change of configuration, and takes the later one at its instant', () => {
    const [a, b] = pair(kepler(SHIP), [{ id: 1, s: kepler(BLOK) }]);
    const changes: Partial<VisualFrame>[] = [
      { rigid: { ...structuredClone(b.rigid!), configurationId: `${b.rigid!.configurationId}+next` } },
      { rigid: undefined },
      { activeStageIndex: a.activeStageIndex + 1 },
      { payloadSeparated: !a.payloadSeparated },
      { fairingAttached: !a.fairingAttached },
    ];
    for (const change of changes) {
      const y = { ...b, ...change }, mid = interpolateFrames(a, y, T0 + 15);
      expect(mid.t).toBeCloseTo(T0 + 15, 9);
      expect(mid.r).toEqual(a.r);
      expect(mid.r).not.toBe(a.r);
      expect(mid.debris[0].r).toEqual(a.debris[0].r);
      expect(interpolateFrames(a, y, T0 + 30).r).toEqual(y.r);
    }
  });

  it('leaves a point-mass vehicle and the bodies beside it on their Kepler arcs, bit for bit', () => {
    const pointMass = (f: VisualFrame): VisualFrame => ({ ...f, rigid: undefined });
    const [a, b] = pair(kepler(SHIP), [{ id: 1, s: kepler(BLOK) }]).map(pointMass);
    for (const dt of [0.5, 15, 29.5]) {
      const f = interpolateFrames(a, b, T0 + dt), flown = propagateKepler(a.r, a.v, dt);
      expect(f.r).toEqual(flown.r);
      expect(f.v).toEqual(flown.v);
      expect(f.debris[0].r).toEqual(propagateKepler(a.debris[0].r, a.debris[0].v, dt).r);
    }
  });

  it('is a pure function of the two frames', () => {
    const [a, b] = pair(kepler(SHIP), [{ id: 1, s: kepler(BLOK) }, { id: 2, s: kepler(BLOK), ownRigid: true }]);
    const before = JSON.stringify([a, b]);
    // frozen inputs: a write to either throws (modules run in strict mode)
    deepFreeze(a); deepFreeze(b);
    const one = interpolateFrames(a, b, T0 + 11.3), two = interpolateFrames(a, b, T0 + 11.3);
    expect(two).toEqual(one);
    expect(two.r).not.toBe(one.r);
    expect(two.debris[0].r).not.toBe(one.debris[0].r);
    expect(two.debris[1].rigid).not.toBe(one.debris[1].rigid);
    expect(JSON.stringify([a, b])).toBe(before);
  });

  it('replays a recorded six-DOF coast on its arc, through the recorder and the player', () => {
    // A six-DOF Soyuz put on its orbit with Blok I beside it, its step flying both on their Kepler arcs: the
    // integrator is not under test, and the ascent takes a minute to fly. The recorder keeps an orbit frame
    // every 30 s from the simulation's own captures, the stack's rigid telemetry with them.
    const sim = sixDof(), t0 = sim.state.t;
    Object.assign(sim.state, { status: 'orbit', r: { ...SHIP.r }, v: { ...SHIP.v }, elements: elementsFromState(SHIP.r, SHIP.v), thrust: 0, throttle: 0,
      altitude: 220e3, nextBurnTime: -1 });
    sim.debris.push({ id: 1, name: 'Blok I', r: { ...BLOK.r }, v: { ...BLOK.v }, dir: v3(1, 0, 0), mass: 2355, area: 5.6, cd: 2.2,
      alive: true, createdAt: t0, outcome: 'orbit', visual: { kind: 'upperStage', diameter: 2.66, length: 6.7, color: '#cccccc' } });
    sim.suggestedDt = () => 1;
    sim.step = (dt: number) => {
      Object.assign(sim.state, propagateKepler(sim.state.r, sim.state.v, dt));
      sim.state.elements = elementsFromState(sim.state.r, sim.state.v);
      Object.assign(sim.debris[0], propagateKepler(sim.debris[0].r, sim.debris[0].v, dt));
      sim.state.t += dt;
      return dt;
    };
    const rec = new FlightRecorder();
    rec.start(sim);
    rec.advance(90, 10000);
    expect(rec.frames.map((f) => Math.round(f.t - t0))).toEqual([0, 30, 60, 90]);
    // each frame carries its orbit's period, which the quarter-period bound reads
    expect(Math.abs(rec.frames[1].elements.period - PERIOD)).toBeLessThan(1);
    expect(rec.frames.every((f) => f.rigid && sameRigidConfiguration(f.rigid, rec.frames[0].rigid))).toBe(true);
    const player = new ReplayPlayer(rec);
    for (const dt of [7.5, 15, 22.5, 45, 75]) {
      const f = player.frameAt(t0 + dt)!;
      const ship = propagateKepler(SHIP.r, SHIP.v, dt), blok = propagateKepler(BLOK.r, BLOK.v, dt);
      expect(dist(f.r, ship.r)).toBeLessThan(0.1);
      expect(dist(f.debris[0].r, blok.r)).toBeLessThan(0.1);
    }
  });
});
