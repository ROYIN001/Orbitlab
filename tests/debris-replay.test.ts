/**
 * A spent body between two recorded frames. One coasting out of the air goes
 * the vehicle's way (its Kepler arc while the vehicle coasts), not along the
 * straight line between its two samples: that line sags v²Δt²/8R under the
 * arc, 115 m half way through a 10 s orbit frame, and a replayed Soyuz-2.1a's
 * Blok I was drawn below the spacecraft, seeming to fall away at 45 m/s. Where
 * the vehicle itself is drawn on the line (under thrust), the body keeps the
 * line too, so the two never part. A six-DOF vehicle and the bodies beside it
 * take the cubic through both frames: tests/rigid-replay-arc.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { FlightRecorder } from '../src/replay/recorder';
import { captureFrame, cloneFrame, interpolateFrames, type DebrisFrame, type VisualFrame } from '../src/physics/frame';
import { propagateKepler } from '../src/physics/orbital';
import { MU_EARTH, R_EARTH } from '../src/physics/constants';
import { add, dist, dot, lerp, norm, scale, sub, v3, type Vec3 } from '../src/physics/vec3';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { watchMissionSettings } from '../src/ui/watch-missions';
import { bodyStep, refly, type BodyStep } from './dense-fall';

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

type State = { r: Vec3; v: Vec3 };
const kepler = (s: State, dt: number): State => propagateKepler(s.r, s.v, dt);

let pad: VisualFrame | null = null;
/**
 * The frames at T0 and T0 + span of the spacecraft coasting in orbit with `bodies` beside it, each flown on its
 * Kepler arc unless it says how it flies (`fly`).
 */
function pair(bodies: { id: number; s: State; extra?: Partial<DebrisFrame>; fly?: (s: State, dt: number) => State }[], span = 10): [VisualFrame, VisualFrame] {
  pad ??= captureFrame(soyuz());
  const at = (t: number): VisualFrame => {
    const ship = propagateKepler(SHIP.r, SHIP.v, t - T0);
    return { ...cloneFrame(pad!), t, status: 'orbit', thrust: 0, throttle: 0, r: ship.r, v: ship.v,
      debris: bodies.map(({ id, s, extra, fly = kepler }) => body(id, fly(s, t - T0), extra)) };
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

  it('keeps the straight line for a body under its own thrust above the air, and the cubic for one in it', () => {
    // a boostback above the air keeps the line; a recovery burn in the air (an entry or landing burn) takes the cubic
    // through both ends, as a body falling there with its engines off does (owner's answer, 2026-10-31): this one,
    // flown here on its Kepler arc, is on it to the millimetre where the chord sags 120 m under it
    const low = { r: v3(R_EARTH + 60e3, 0, 0), v: v3(0, 2000, 0) };
    const [a, b] = pair([{ id: 1, s: low, extra: { outcome: undefined, burning: true } }, { id: 2, s: BLOK, extra: { burning: true } }]);
    const mid = interpolateFrames(a, b, T0 + 5);
    expect(dist(mid.debris[0].r, propagateKepler(low.r, low.v, 5).r)).toBeLessThan(0.01);
    expect(dist(lerp(a.debris[0].r, b.debris[0].r, 0.5), propagateKepler(low.r, low.v, 5).r)).toBeGreaterThan(100);
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

/**
 * A spent stage falling through still air: gravity, and drag on a ballistic coefficient `beta` (kg/m²) in an
 * exponential atmosphere (1.225 kg/m³ at sea level, 7.2 km scale height), flown from `s` for `dt` s in 10 ms RK4 steps;
 * under a recovery burn, `thrust` m/s² more against its velocity.
 */
function fall(s: State, dt: number, beta: number, thrust = 0): State {
  const acc = (r: Vec3, v: Vec3): Vec3 => {
    const n = norm(r), rho = 1.225 * Math.exp(-(n - R_EARTH) / 7200), speed = norm(v);
    return add(scale(r, -MU_EARTH / (n * n * n)), scale(v, -(0.5 * rho * speed / beta + thrust / speed)));
  };
  const h = 0.01;
  let { r, v } = s;
  for (let k = Math.round(dt / h); k > 0; k--) {
    const a1 = acc(r, v), w2 = add(v, scale(a1, h / 2));
    const a2 = acc(add(r, scale(v, h / 2)), w2), w3 = add(v, scale(a2, h / 2));
    const a3 = acc(add(r, scale(w2, h / 2)), w3), w4 = add(v, scale(a3, h));
    const a4 = acc(add(r, scale(w3, h)), w4);
    r = add(r, scale(add(add(v, scale(w2, 2)), add(scale(w3, 2), w4)), h / 6));
    v = add(v, scale(add(add(a1, scale(a2, 2)), add(scale(a3, 2), a4)), h / 6));
  }
  return { r, v };
}

/** A stage `h` m up, falling at `speed` m/s `gamma` degrees below the horizon. */
function diving(h: number, speed: number, gamma: number): State {
  const g = gamma * Math.PI / 180;
  return { r: v3(R_EARTH + h, 0, 0), v: v3(-speed * Math.sin(g), speed * Math.cos(g), 0) };
}

/** The path flown from `s` for `span` s, every 50 ms, and how far a point is from it. */
function flownPath(s: State, span: number, beta: number, thrust = 0): (q: Vec3) => number {
  const at: Vec3[] = [s.r];
  for (let k = 0, p = s; k < span * 20; k++) at.push((p = fall(p, 0.05, beta, thrust)).r);
  return (q) => {
    let best = Infinity;
    for (let i = 1; i < at.length; i++) {
      const d = sub(at[i], at[i - 1]), w = Math.max(0, Math.min(1, dot(sub(q, at[i - 1]), d) / dot(d, d)));
      best = Math.min(best, dist(q, add(at[i - 1], scale(d, w))));
    }
    return best;
  };
}

/**
 * A spent body falling through the air while the vehicle coasts in orbit, where the recorder keeps a frame every
 * 10–30 s. Drag bends its path off any orbit and slows it by kilometres a second inside one span, so neither the
 * vehicle's arc nor the straight line between its two samples is the way it went: the line cut 4.8 km off Blok A's
 * path, 6.8 km off the H-IIA first stage's and 10 km off Sputnik's boosters'. The cubic through both ends' positions
 * and velocities keeps it on its path.
 *
 * The three falls below are fitted to the six-DOF watch missions' own spans (heights and speeds at both ends):
 * Blok A, 20 s from 48.6 km at 4,255 m/s to 35.5 km at 2,936 m/s; the H-IIA first stage, 30 s from 72.4 km at
 * 5,936 m/s to 43.4 km at 5,068 m/s; a Sputnik booster in the drag pulse, 30 s from 41.9 km at 2,285 m/s to
 * 17.1 km at 253 m/s.
 */
describe('a spent body falling through the air between two recorded frames', () => {
  const FALLS = [
    // name, height m, speed m/s, degrees below the horizon, ballistic coefficient kg/m², span s, and how far from
    // where it was half way the cubic may draw it (the line: 3.2 km, 2.8 km, 8.6 km)
    { name: 'Blok A', s: diving(48.6e3, 4255, 9), beta: 400, span: 20, place: 25 },
    { name: 'the H-IIA first stage', s: diving(72.4e3, 5936, 9), beta: 350, span: 30, place: 800 },
    { name: 'a Sputnik booster', s: diving(41.9e3, 2285, 49), beta: 200, span: 30, place: 1300 },
  ];

  it.each(FALLS)('draws $name half way between frames within 30 m of the path it flew, not on the chord across it', ({ s, beta, span, place }) => {
    const fly = (s0: State, dt: number) => fall(s0, dt, beta);
    const [a, b] = pair([{ id: 7, s, extra: { name: 'Blok A (core)', outcome: undefined }, fly }], span);
    const mid = interpolateFrames(a, b, T0 + span / 2).debris[0];
    const off = flownPath(s, span, beta), was = fall(s, span / 2, beta);
    // the chord is 460 m, 1,050 m and 530 m off the path, and 3.2, 2.8 and 8.6 km from where it was
    const chord = lerp(a.debris[0].r, b.debris[0].r, 0.5);
    expect(off(chord)).toBeGreaterThan(450);
    expect(dist(chord, was.r)).toBeGreaterThan(2500);
    expect(off(mid.r)).toBeLessThan(30);
    // what is left is how far along the path it has come (in the drag pulse 1.1 km, under two seconds of its flight)
    expect(dist(mid.r, was.r)).toBeLessThan(place);
    // the vehicle keeps its own arc
    expect(dist(interpolateFrames(a, b, T0 + span / 2).r, propagateKepler(SHIP.r, SHIP.v, span / 2).r)).toBeLessThan(1e-6);
  });

  it('follows a booster through its drag pulse without running past either sample, and meets both', () => {
    const { s, beta, span } = FALLS[2];
    const [a, b] = pair([{ id: 1, s, extra: { outcome: undefined }, fly: (s0, dt) => fall(s0, dt, beta) }], span);
    const before = JSON.stringify([a, b]);
    const off = flownPath(s, span, beta);
    const from = a.debris[0], to = b.debris[0], chord = sub(to.r, from.r), length = norm(chord);
    let along = 0;
    for (let k = 1; k < 30; k++) {
      const d = interpolateFrames(a, b, T0 + k).debris[0];
      expect(off(d.r)).toBeLessThan(30);
      // never back along the chord nor past its end, and never below the later sample's height, 17.1 km
      const now = dot(sub(d.r, from.r), chord) / length;
      expect(now).toBeGreaterThan(along);
      expect(now).toBeLessThan(length);
      expect(norm(d.r)).toBeGreaterThan(norm(to.r));
      along = now;
    }
    // the ends are the samples, position and velocity, so the drawing does not jump at a frame
    const end = interpolateFrames(a, b, T0 + span - 1e-9).debris[0];
    expect(dist(end.r, to.r)).toBeLessThan(1e-3);
    expect(dist(end.v, to.v)).toBeLessThan(1e-6);
    // pure: the frames are as they were, and what comes back is not theirs
    expect(JSON.stringify([a, b])).toBe(before);
    expect(end.r).not.toBe(to.r);
  });

  // A later frame without the contact time (`impact.t`), as a recording made before it was kept has; with it, the
  // body falls to where it touched (the next describe).
  it('holds a body that comes down between two frames at its earlier sample, never past the ground', () => {
    const { s, beta, span } = FALLS[2];
    const [a, b] = pair([{ id: 1, s, extra: { outcome: undefined }, fly: (s0, dt) => fall(s0, dt, beta) }], span);
    const down: VisualFrame = { ...b, debris: [{ ...b.debris[0], alive: false, outcome: 'impact' }] };
    expect(interpolateFrames(a, down, T0 + span / 2).debris[0].r).toEqual(a.debris[0].r);
  });

  it('draws a recorded H-IIA\'s first stage falling through the air close to where the simulation had it', () => {
    const m = watchMissionSettings('h2aHayabusa2', new Date('2026-09-22T03:00:00Z'));
    const sim = new Simulation({ vehicleId: m.vehicleId, satelliteId: m.satelliteId, siteId: m.siteId, orbit: m.orbit, padId: m.padId,
      launchTime: m.launchTime, payloadMassOverride: m.payloadMass, guidance: guidanceForVehicle(vehicleById(m.vehicleId), undefined, 'pointMass'),
      guidanceResolved: true, failure: m.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 } }, { headless: true });
    const rec = new FlightRecorder();
    rec.start(sim);
    // The simulation's own state of the stage at each step it takes. A point-mass flight in orbit steps up to 30 s
    // at a time and holds its debris states between steps, and the recorder keeps every step of a fall through the
    // air (src/replay/recorder.ts, `FALLING_INTERVAL`); the instants between them are the stage re-flown densely
    // from each step (tests/dense-fall.ts, the second agent's method in the report).
    const steps: BodyStep[] = [];
    let guard = 0;
    for (let stage = sim.debris.find((d) => /LE-7A/.test(d.name)); !(stage && !stage.alive) && guard++ < 3000;
      stage = sim.debris.find((d) => /LE-7A/.test(d.name))) {
      rec.advance(1, 5000);
      if (stage?.alive && steps[steps.length - 1]?.t !== sim.state.t) steps.push(bodyStep(sim.state.t, stage));
    }
    const id = sim.debris.find((d) => /LE-7A/.test(d.name))!.id, frames = rec.frames;
    let n = 0, drawn = 0, line = 0;
    for (let i = 0; i + 1 < steps.length; i++) {
      if (steps[i + 1].t - steps[i].t > 60) continue;
      for (const p of refly(steps[i], steps[i + 1])) {
        const k = frames.findIndex((f) => f.t > p.t) - 1, a = frames[k], b = frames[k + 1];
        const da = a?.debris.find((d) => d.id === id), db = b?.debris.find((d) => d.id === id);
        if (!da?.alive || !db?.alive || p.t <= a.t || Math.min(norm(da.r), norm(db.r)) - R_EARTH > 140e3) continue;
        n++;
        drawn = Math.max(drawn, dist(interpolateFrames(a, b, p.t).debris.find((d) => d.id === id)!.r, p.r));
        line = Math.max(line, dist(lerp(da.r, db.r, (p.t - a.t) / (b.t - a.t)), p.r));
      }
    }
    // every second of the stage's spans through the air
    expect(n).toBeGreaterThanOrEqual(100);
    // the straight line between the same frames is 2.2 km off; the cubic, 51 m (on 30 s spans before the recorder
    // kept every step, the line 10.9 km and the cubic 620 m)
    expect(line).toBeGreaterThan(2000);
    expect(drawn).toBeLessThan(600);
  });
});

/** A body flown from `s` (`fall`, 10 ms steps) to the step it reaches the ground on, as the simulation finds it. */
function touchdown(s: State, beta: number): State & { t: number } {
  let p = s, t = 0;
  while (norm(p.r) - R_EARTH > 0) { p = fall(p, 0.01, beta); t += 0.01; }
  return { ...p, t };
}

/** `p` turned about the Earth's axis by `angle`, rad. */
const turned = (p: Vec3, angle: number): Vec3 => v3(p.x * Math.cos(angle) - p.y * Math.sin(angle), p.x * Math.sin(angle) + p.y * Math.cos(angle), p.z);
const height = (r: Vec3) => norm(r) - R_EARTH;
const OMEGA = 7.2921159e-5;

/**
 * A spent body that comes down between two recorded frames while the vehicle coasts in orbit, where the recorder
 * keeps a frame every 10–30 s. Held at its earlier sample, it hung there for the rest of the span, then was gone
 * (a crash) or stood on the ground (a landing): measured on the watch missions, a fairing hung up to 36 s and
 * 10.5 km from where it hit, Blok A 10 s and 2.8 km, Falcon Heavy's centre core 149 m over the drone ship's deck
 * for 10 s. The later frame carries when it touched (`impact.t`), and it falls there, arriving then.
 */
/**
 * A stage flown home firing its engines in the air: an entry burn, retrograde from about 70 km until the airspeed is
 * near 1.4 km/s, and a landing burn, slowing it to a couple of metres a second at the ground. The cubic through both
 * frames' states keeps it on the path it flew, as it does a stage falling with its engines off; the straight line cut
 * up to 145 m off it (Starship's booster at the tower, six-DOF, an 18.4 s span) and kilometres off an entry burn.
 * The cubic runs past the later sample only where an end's speed passes three times the mean over the span, which a
 * burn that slows a stage evenly (the simulation's landing burns follow such a profile to the ground) keeps under two.
 * The stage here is a Falcon 9 first stage, flown tail first (ballistic coefficient 2,400 kg/m²).
 */
describe('a stage under a recovery burn in the air between two recorded frames', () => {
  const BURNS = [
    // name, height m, speed m/s, degrees below the horizon, thrust m/s² against the velocity, span s, and how far from
    // where it was half way the cubic may draw it (the line: 1,325 m and 180 m)
    { name: 'an entry burn', s: diving(65e3, 2000, 30), thrust: 30, span: 20, line: 1300 },
    { name: 'a landing burn', s: diving(3e3, 250, 70), thrust: 18, span: 10, line: 175 },
  ];

  it.each(BURNS)('draws $name on the path it flew, not on the chord across it, without running past either sample', ({ s, thrust, span, line }) => {
    const fly = (s0: State, dt: number) => fall(s0, dt, 2400, thrust);
    const [a, b] = pair([{ id: 5, s, extra: { name: 'First stage', outcome: undefined, burning: true }, fly }], span);
    const was = fall(s, span / 2, 2400, thrust), off = flownPath(s, span, 2400, thrust);
    const mid = interpolateFrames(a, b, T0 + span / 2).debris[0];
    expect(dist(lerp(a.debris[0].r, b.debris[0].r, 0.5), was.r)).toBeGreaterThan(line);
    // 1.4 m and 2.0 m
    expect(dist(mid.r, was.r)).toBeLessThan(5);
    const from = a.debris[0], to = b.debris[0], chord = sub(to.r, from.r), length = norm(chord);
    let along = 0;
    for (let k = 1; k < 20; k++) {
      const d = interpolateFrames(a, b, T0 + span * k / 20).debris[0];
      expect(off(d.r)).toBeLessThan(5);
      const now = dot(sub(d.r, from.r), chord) / length;
      expect(now).toBeGreaterThan(along);
      expect(now).toBeLessThan(length);
      expect(norm(d.r)).toBeGreaterThan(norm(to.r));
      along = now;
    }
  });
});

describe('a spent body that comes down between two recorded frames', () => {
  // Blok A's last span over the sea (point-mass Soyuz-2.1a: 561 m up at 313 m/s, down 5.5 s into a 10 s span):
  // here 1.5 km up at 320 m/s, 70° below the horizon, slowing to 249 m/s, and in the sea 5.6 s in
  const BETA = 2000, S = diving(1500, 320, 70), SPAN = 10, hit = touchdown(S, BETA), TC = T0 + hit.t;
  function crash(): [VisualFrame, VisualFrame] {
    const [a, b] = pair([{ id: 3, s: S, extra: { name: 'Blok A (core)', outcome: undefined }, fly: (s0, dt) => fall(s0, dt, BETA) }], SPAN);
    // the later frame as the simulation leaves it: down, its state the contact's, and when that was
    return [a, { ...b, debris: [{ ...b.debris[0], r: hit.r, v: hit.v, alive: false, outcome: 'impact', impact: { lat: 0, lon: 0, t: TC }, restT: TC }] }];
  }

  it('draws a body that crashes mid-span falling to where it hit, there at its contact time, and gone from then', () => {
    const [a, b] = crash(), from = a.debris[0];
    expect(hit.t).toBeGreaterThan(5.5);
    expect(hit.t).toBeLessThan(5.7);
    const before = JSON.stringify([a, b]);
    // half way down: on its way, not held 1.5 km up at the earlier sample, where it hung for the whole 10 s
    const mid = interpolateFrames(a, b, T0 + hit.t / 2).debris[0];
    expect(mid.alive).toBe(true);
    expect(height(mid.r)).toBeLessThan(height(from.r) - 500);
    // on the path it flew all the way down (0.32 m off it at most), and never below where it touched
    for (let k = 1; k * 0.1 < hit.t; k++) {
      const d = interpolateFrames(a, b, T0 + k * 0.1).debris[0];
      expect(dist(d.r, fall(S, k * 0.1, BETA).r)).toBeLessThan(1);
      expect(height(d.r)).toBeGreaterThan(height(hit.r));
    }
    // there at its contact time
    expect(dist(interpolateFrames(a, b, TC - 1e-6).debris[0].r, hit.r)).toBeLessThan(0.01);
    // and from then on the later frame's: down where it hit (the renderer no longer draws it)
    for (const t of [TC + 1e-6, T0 + 8, T0 + SPAN]) {
      const d = interpolateFrames(a, b, t).debris[0];
      expect(d.alive).toBe(false);
      expect(d.outcome).toBe('impact');
      expect(dist(d.r, hit.r)).toBeLessThan(1e-6);
    }
    // pure: the frames are as they were, and twice the same instant is the same frame
    expect(interpolateFrames(a, b, T0 + 2.5)).toEqual(interpolateFrames(a, b, T0 + 2.5));
    expect(JSON.stringify([a, b])).toBe(before);
  });

  it('stands a stage that lands mid-span on the ground where it touched down, turning with the Earth from then', () => {
    // Falcon Heavy's centre core under its landing burn (point-mass: 149 m over the deck, down 4.6 s into a 10 s
    // span): here 160 m up, slowing evenly from 67 m/s to rest 4.8 s later on a deck at 30° N. The simulation carries a landed stage round with
    // the Earth, so the later frame has it where the deck is at that frame's instant (`restT`), not at its contact.
    const T = 4.8, H = 160, tc = T0 + T, lat = 30 * Math.PI / 180;
    const deck = v3(R_EARTH * Math.cos(lat), 0, R_EARTH * Math.sin(lat)), up = scale(deck, 1 / R_EARTH);
    // where it is at `t`, and its velocity: over the deck, H (1 - (t - T0) / T)² up, turned with the Earth
    const at = (t: number): State => {
      const left = tc - t, ang = OMEGA * (t - tc), h = H * (left / T) ** 2;
      const r = turned(add(deck, scale(up, h)), ang);
      return { r, v: add(v3(-OMEGA * r.y, OMEGA * r.x, 0), turned(scale(up, -2 * H * left / (T * T)), ang)) };
    };
    const [a0, b0] = pair([], SPAN);
    const core = (s: State, extra: Partial<DebrisFrame>): DebrisFrame => body(5, s, { name: 'Center core', visual: { kind: 'stage', diameter: 3.66, length: 41, color: '#eeeeee' }, ...extra });
    const a: VisualFrame = { ...a0, debris: [core(at(T0), { outcome: undefined, burning: true, recovery: { phase: 'landing', landed: false, landingBurn: true } })] };
    const rest = turned(at(tc).r, OMEGA * (T0 + SPAN - tc));
    const b: VisualFrame = { ...b0, debris: [core({ r: rest, v: v3(-OMEGA * rest.y, OMEGA * rest.x, 0) }, { alive: false, outcome: 'landed',
      recovery: { phase: 'landing', landed: true, landingBurn: true }, impact: { lat: 30, lon: 0, t: tc }, restT: T0 + SPAN })] };
    // on its way down under the burn (0.11 m off at most), not held 160 m up where the earlier frame had it, 1.9 km
    // from where the deck is at its contact
    for (let k = 1; k * 0.2 < T; k++) {
      const d = interpolateFrames(a, b, T0 + k * 0.2).debris[0];
      expect(d.alive).toBe(true);
      expect(dist(d.r, at(T0 + k * 0.2).r)).toBeLessThan(0.5);
    }
    expect(height(interpolateFrames(a, b, T0 + T / 2).debris[0].r)).toBeLessThan(H / 3);
    // on the deck at its contact time, and from then on landed there, carried round with the Earth
    expect(dist(interpolateFrames(a, b, tc - 1e-6).debris[0].r, at(tc).r)).toBeLessThan(0.01);
    for (const t of [tc + 1e-6, T0 + 7, T0 + SPAN]) {
      const d = interpolateFrames(a, b, t).debris[0];
      expect(d.alive).toBe(false);
      expect(d.outcome).toBe('landed');
      expect(d.recovery?.landed).toBe(true);
      expect(dist(d.r, turned(at(tc).r, OMEGA * (t - tc)))).toBeLessThan(1e-3);
    }
  });

  it('draws a recorded Falcon Heavy\'s centre core and fairings down to where the simulation had them touch, on time', () => {
    const m = watchMissionSettings('falconHeavyArabsat', new Date('2026-09-22T03:00:00Z'));
    const sim = new Simulation({ vehicleId: m.vehicleId, satelliteId: m.satelliteId, siteId: m.siteId, orbit: m.orbit, padId: m.padId,
      launchTime: m.launchTime, payloadMassOverride: m.payloadMass, guidance: guidanceForVehicle(vehicleById(m.vehicleId), undefined, 'pointMass'),
      guidanceResolved: true, failure: m.failure, boosterRecovery: m.boosterRecovery, recoveryPlan: m.recoveryPlan,
      dynamics: { model: 'pointMass', wind: 'calm', seed: 1 } }, { headless: true });
    const rec = new FlightRecorder();
    rec.start(sim);
    let guard = 0;
    while (sim.state.t < 1320 && guard++ < 3000) rec.advance(1, 5000);
    const frames = rec.frames;
    let n = 0;
    for (let k = 0; k + 1 < frames.length; k++) {
      const a = frames[k], b = frames[k + 1];
      for (const from of a.debris) {
        const to = b.debris.find((d) => d.id === from.id);
        if (!from.alive || !to || to.alive || b.t - a.t < 5) continue;
        n++;
        // the later frame carries the contact time, inside the span: the simulation's own, which a crash keeps in
        // `restT` and a landed stage's `restT` has since moved on from (it turns with the Earth)
        const tc = to.impact!.t!, now = sim.debris.find((d) => d.id === from.id)!;
        expect(tc).toBeGreaterThan(a.t);
        expect(tc).toBeLessThanOrEqual(b.t);
        if (to.outcome === 'landed') expect(now.restT).toBeGreaterThan(b.t);
        else expect(now.restT).toBe(tc);
        // and the instant its state is for: the contact for a crash, the frame's own for a stage carried round with the Earth
        expect(to.restT).toBe(to.outcome === 'landed' ? b.t : tc);
        const drawn = (t: number) => interpolateFrames(a, b, t).debris.find((d) => d.id === from.id)!;
        // half way down, below its earlier sample, where it hung for the whole span (the core 149 m up for 10 s, now
        // 37 m half way; the fairings 312 m for 30 s, now 155 m)
        expect(height(drawn((a.t + tc) / 2).r)).toBeLessThan(height(from.r) - 0.3 * (height(from.r) - height(to.r)));
        // there at its contact time: where it touched (a crash's own state; a landed stage turned back with the Earth)
        const was = to.outcome === 'landed' ? turned(to.r, OMEGA * (tc - b.t)) : to.r;
        expect(dist(drawn(tc - 1e-6).r, was)).toBeLessThan(0.5);
        expect(height(was)).toBeLessThan(10);
        // from then on down, as the later frame has it
        expect(drawn(tc + 1e-6).alive).toBe(false);
        expect(dist(drawn(b.t - 1e-6).r, to.r)).toBeLessThan(0.5);
      }
    }
    // the centre core on the drone ship (10 s span) and both fairing halves in the sea (30 s)
    expect(n).toBeGreaterThanOrEqual(3);
    expect(frames.some((f) => f.debris.some((d) => d.name === 'Center core' && d.outcome === 'landed'))).toBe(true);
  });
});

/**
 * A body in the air between two frames far apart. A coast keeps a frame at least every minute until a recording
 * outgrows its frame budget (FlightRecorder.thin), and even thinned hard the watch missions never leave a falling
 * body a span of more than about 500 s (the longest fall, a fairing's, is 23 minutes in the air). A span of 4,000 s
 * or more with a body in the air at either end holds one circling the Earth with its perigee in the air: kept in
 * orbit (sim/debris.ts: a perigee above 120 km, flown on its Kepler arc) or decaying. From about 4,850 s the cubic
 * swings such a body out further than the straight line (about one period of a low orbit, or half an eccentric one),
 * so such a span keeps the line.
 */
describe('a body in the air between two frames far apart', () => {
  /** At perigee, `h` m up, of an orbit with its apogee `ha` m up, and that orbit's period. */
  const perigee = (h: number, ha: number): State & { period: number } => {
    const rp = R_EARTH + h, a = R_EARTH + (h + ha) / 2;
    return { r: v3(rp, 0, 0), v: v3(0, Math.sqrt(MU_EARTH * (2 / rp - 1 / a)), 0), period: 2 * Math.PI * Math.sqrt(a ** 3 / MU_EARTH) };
  };
  /** The cubic through both ends' states, as `hermite` in src/physics/frame.ts draws it. */
  const cubic = (a: State, b: State, u: number, span: number): Vec3 => {
    const u2 = u * u, u3 = u2 * u;
    return add(add(scale(a.r, 2 * u3 - 3 * u2 + 1), scale(a.v, (u3 - 2 * u2 + u) * span)),
      add(scale(b.r, 3 * u2 - 2 * u3), scale(b.v, (u3 - u2) * span)));
  };

  it('keeps the line over a span of 4,000 s or more, where in an eccentric orbit the cubic swings out further', () => {
    // a body kept in a 120 × 35,786 km orbit, from its perigee (the second agent's case on #191)
    const gto = perigee(120e3, 35786e3);
    for (const span of [0.5 * gto.period, 0.75 * gto.period]) {
      const [a, b] = pair([{ id: 1, s: gto }], span);
      // at its worst instant the cubic is further from where the body was than the line: 22,386 against 20,739 km
      // over half the orbit, 36,934 against 31,631 km over three quarters
      let far = 0, line = 0;
      for (let k = 1; k < 100; k++) {
        const was = kepler(gto, k / 100 * span).r;
        far = Math.max(far, dist(cubic(a.debris[0], b.debris[0], k / 100, span), was));
        line = Math.max(line, dist(lerp(a.debris[0].r, b.debris[0].r, k / 100), was));
      }
      expect(far).toBeGreaterThan(line + 1e6);
      const mid = interpolateFrames(a, b, T0 + span / 2).debris[0];
      expect(mid.r).toEqual(lerp(a.debris[0].r, b.debris[0].r, 0.5));
      expect(mid.v).toEqual(lerp(a.debris[0].v, b.debris[0].v, 0.5));
    }
    // A low circle just past the bound keeps the line too, though the cubic is closer there (6,561 km from its place
    // half way, the line 11,583 km; both far off): a fixed bound cannot tell this span from a longer one.
    const low = perigee(130e3, 130e3);
    const [a, b] = pair([{ id: 1, s: low }], 4100);
    expect(interpolateFrames(a, b, T0 + 2050).debris[0].r).toEqual(lerp(a.debris[0].r, b.debris[0].r, 0.5));
  });

  it('keeps the cubic over a span under 4,000 s', () => {
    // a body kept in a 130 km circular orbit, over 900 s, a sixth of it: the cubic is 23 km from its place half way,
    // the line 930 km, through the Earth
    const low = perigee(130e3, 130e3);
    const [a, b] = pair([{ id: 1, s: low }], 900);
    const mid = interpolateFrames(a, b, T0 + 450).debris[0], was = kepler(low, 450);
    expect(dist(mid.r, was.r)).toBeLessThan(30e3);
    expect(dist(lerp(a.debris[0].r, b.debris[0].r, 0.5), was.r)).toBeGreaterThan(900e3);
    // and the vehicle keeps its own arc
    expect(dist(interpolateFrames(a, b, T0 + 450).r, propagateKepler(SHIP.r, SHIP.v, 450).r)).toBeLessThan(1e-3);
    // Just under the bound, still the cubic, which is closer: over 3,900 s, three quarters of the circle, it is
    // 5,601 km from its place half way, the line 11,058 km.
    const [c, d] = pair([{ id: 1, s: low }], 3900);
    const half = interpolateFrames(c, d, T0 + 1950).debris[0], there = kepler(low, 1950).r;
    expect(dist(half.r, cubic(c.debris[0], d.debris[0], 0.5, 3900))).toBeLessThan(1);
    expect(dist(half.r, there)).toBeLessThan(dist(lerp(c.debris[0].r, d.debris[0].r, 0.5), there) - 5e6);
  });
});
