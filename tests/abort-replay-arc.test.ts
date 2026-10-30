/**
 * An escape or a capsule's return (status 'abort', src/physics/sim/abort.ts)
 * between two recorded frames. In flight it is drawn on the cubic through both
 * frames' states (`hermite` in src/physics/frame.ts), as a six-DOF coast is,
 * not on the straight line between its two samples. The recorder keeps an
 * escape's frame every 10 s on its ballistic arc above the air, and the line
 * sags gΔt²/8 under that arc: Freedom 7 was drawn 117 m off it, 128 m while
 * its retro-rockets fired, on the cubic 2.3 m.
 *
 * Every velocity change in an abort is pinned to a frame (the recorder stores
 * frames on both sides of any step that emits an event), or changes the body
 * the frames describe, which holds the earlier frame: the tower's motor and
 * the fairing's, the fins, the capsule leaving the head section, each
 * retro-rocket's firing, the pack, the hatch and the seat, each parachute, the
 * soft-landing motors, the landing. What is left inside a span changes the
 * acceleration, not the velocity: a retro-rocket burning out, a canopy filling
 * or coming out of its reefing, the air. The cubic is closer than the line to
 * all of it. One span is not: the first on the ground, where Vostok's sphere,
 * its pilot still on his parachute and its status still 'abort', is at rest a
 * step after the landing event, its velocity the ground's turning; the cubic
 * through the landing's velocity swings 8 m off. The sphere on the ground keeps
 * the line, 0.07 m off over its 5 s frames.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { captureFrame, cloneAbort, cloneFrame, interpolateFrames, type DebrisFrame, type VisualFrame } from '../src/physics/frame';
import type { AbortState } from '../src/physics/sim/types';
import { FlightRecorder } from '../src/replay/recorder';
import { ReplayPlayer } from '../src/replay/player';
import { gravityJ2 } from '../src/physics/gravity';
import { rk4Step } from '../src/physics/integrator';
import { OMEGA_EARTH, R_EARTH } from '../src/physics/constants';
import { add, addScaled, cross, dist, lerp, norm, normalize, scale, sub, v3, type Vec3 } from '../src/physics/vec3';
import { vehicleById } from '../src/data/vehicles';
import { guidanceForVehicle } from '../src/physics/defaults';
import { watchMissionSettings } from '../src/ui/watch-missions';

/** Mercury-Redstone 3 as the viewer flies it, point-mass (its capsule's return is an escape flight either way). */
function mr3(): Simulation {
  const s = watchMissionSettings('mr3');
  return new Simulation({
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
    payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
    failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
  }, { headless: true });
}

let separated: VisualFrame | null = null;
/** Freedom 7 just separated from its booster: a real abort frame, with the escape's own rigid telemetry. */
function capsuleFrame(): VisualFrame {
  if (!separated) {
    const sim = mr3();
    while (sim.state.status !== 'abort') sim.step(sim.suggestedDt());
    separated = captureFrame(sim);
  }
  return separated;
}

type State = { r: Vec3; v: Vec3 };
/** A push on the body, m/s², at `t` s into the flight, moving at `v` m/s. */
type Push = (t: number, r: Vec3, v: Vec3) => Vec3;
const none: Push = () => v3();
/** Flown from `s` for `dt` s: central gravity, J2 and `push`, in 0.01 s RK4 steps. */
function fly(s: State, dt: number, push: Push = none): State {
  const n = Math.max(1, Math.round(dt / 0.01));
  let x = s;
  for (let k = 0; k < n; k++) x = rk4Step(k * dt / n, x, dt / n, (t, r, v) => add(gravityJ2(r), push(t, r, v)));
  return x;
}

/** Over the top of Freedom 7's arc: 185 km up, 2 km/s along the ground and climbing at 50 m/s. */
const TOP: State = { r: v3(R_EARTH + 185e3, 0, 0), v: v3(50, 2000 * Math.cos(0.5), 2000 * Math.sin(0.5)) };
const T0 = 300;

/** A frame of the escape at `t`, flown to `s`, its escape state `abort` over the capsule's own; nothing beside it. */
function frameAt(t: number, s: State, abort: Partial<AbortState> = {}, over: Partial<VisualFrame> = {}): VisualFrame {
  const f = cloneFrame(capsuleFrame());
  return { ...f, t, r: s.r, v: s.v, altitude: norm(s.r) - R_EARTH, abort: { ...cloneAbort(f.abort!), ...abort }, debris: [], ...over };
}

/** Two frames `span` s apart of the escape flown from `s0` with `push`, and the flown state at any time between them. */
function pair(s0: State, span: number, abortA: Partial<AbortState> = {}, abortB: Partial<AbortState> = abortA, push: Push = none) {
  const s1 = fly(s0, span, push);
  return { a: frameAt(T0, s0, abortA), b: frameAt(T0 + span, s1, abortB), flown: (dt: number) => fly(s0, dt, push) };
}

/** How far the drawing at `t` is from the flown state, and how far the chord is. */
function miss(a: VisualFrame, b: VisualFrame, flown: (dt: number) => State, u: number) {
  const t = a.t + (b.t - a.t) * u, at = flown(t - a.t).r;
  return { drawn: dist(interpolateFrames(a, b, t).r, at), chord: dist(lerp(a.r, b.r, u), at) };
}

const SOYUZ_MOTORS = { main: 0, control: 0, fairing: 0, softLanding: 0 };
/** Mercury's three retro-rockets, 4,448 N each on the 1,295 kg capsule (src/physics/rigid/escape.ts, `MERCURY_CAPSULE`). */
const RETRO = 4448 / 1295.1;
const against = (n: (t: number) => number): Push => (t, _r, v) => scale(normalize(v), -n(t) * RETRO);

describe('an escape between two frames above the air', () => {
  it.each([
    ['Freedom 7 falling over the top of its arc', {}, 10],
    ["Soyuz 18a's spacecraft coasting after its separation", { mode: 'separation', capsule: 'soyuz', body: 'spacecraft', phase: 'coast', motors: { ...SOYUZ_MOTORS } }, 10],
    ["18a's descent module falling free", { mode: 'separation', capsule: 'soyuz', body: 'capsule', phase: 'fall', motors: { ...SOYUZ_MOTORS } }, 10],
    // C01: the cables alone hold Vostok's pair, which is flown as one body until they part: a frame every 2 s above 100 km
    ["Vostok's pair on its cables", { capsule: 'vostok', joint: 'tethered', tether: { sphere: v3(1.35, 0, 0), module: v3(0.9, 0, 0) }, motors: { ...SOYUZ_MOTORS, retro: 0 } }, 2],
  ] as [string, Partial<AbortState>, number][])('stays on its arc, not on the chord inside it: %s', (_name, abort, span) => {
    const { a, b, flown } = pair(TOP, span, abort);
    for (const u of [0.25, 0.5, 0.75]) {
      const m = miss(a, b, flown, u);
      expect(m.drawn, `u ${u}, chord ${m.chord.toFixed(1)} m`).toBeLessThan(0.05);
      // the chord: gΔt²/8 at the middle, 117 m over 10 s, 4.7 m over 2 s
      expect(m.chord).toBeGreaterThan(span === 10 ? 80 : 3);
    }
  });

  it('stays on its arc while the retro-rockets fire, two burning out inside the span', () => {
    // Freedom 7's three fire 4.7 and 4.8 s apart and burn 10 s each: from the third's firing (an event frame) the
    // first two burn out 0.5 and 5.3 s on, inside the next 10 s. A burn-out is no event, and it changes the
    // acceleration, not the velocity: the cubic misses by at most Δa·T²/62 for each wherever it falls (5.6 m for one
    // of these over 10 s), the chord by gT²/8 (119 m) for the gravity alone
    const push = against((t) => (t < 0.5 ? 3 : t < 5.3 ? 2 : 1));
    const { a, b, flown } = pair(TOP, 10, { motors: { ...SOYUZ_MOTORS, retro: 3 } }, { motors: { ...SOYUZ_MOTORS, retro: 1 } }, push);
    for (const u of [0.05, 0.2, 0.4, 0.53, 0.6, 0.8, 0.95]) {
      const m = miss(a, b, flown, u);
      expect(m.drawn, `u ${u}, chord ${m.chord.toFixed(1)} m`).toBeLessThan(3);
      expect(m.drawn).toBeLessThan(m.chord / 10);
    }
  });

  it('keeps a coasting body beside the capsule in its place: the spent Redstone, both on their arcs', () => {
    const booster: State = { r: addScaled(TOP.r, v3(0, -1, 0), 2e3), v: addScaled(TOP.v, normalize(TOP.v), -15) };
    const { a, b, flown } = pair(TOP, 10);
    const body = (s: State): DebrisFrame => ({ id: 7, name: 'Redstone', r: s.r, v: s.v, dir: v3(1, 0, 0), alive: true, burning: false,
      createdAt: 150, visual: { kind: 'upperStage', diameter: 1.78, length: 17.6, color: '#ffffff' } } as DebrisFrame);
    const ab = { ...a, debris: [body(booster)] }, bb = { ...b, debris: [body(fly(booster, 10))] };
    const mid = interpolateFrames(ab, bb, T0 + 5);
    const there = fly(booster, 5).r;
    expect(dist(mid.debris[0].r, there)).toBeLessThan(0.05);
    // and where it is from the capsule, as flown (the line drew each 117 m under its arc)
    expect(dist(sub(mid.debris[0].r, mid.r), sub(there, flown(5).r))).toBeLessThan(0.05);
  });

  // A body in the air beside the escape goes its way too: on the line under the escape's cubic, the two would part
  // (second-agent review: the Redstone 25 m from Freedom 7 drawn 117 m off it on the span that crosses 140 km, and
  // Vostok's instrument module bobbing 4.7 m against the sphere every 2 s after the cables part)
  it.each([
    // coming down through 140 km at 950 m/s, a 10 s span from 145 km to 135 km
    ['the spent Redstone 25 m from Freedom 7, crossing 140 km', { r: v3(R_EARTH + 145e3, 0, 0), v: v3(-950, 2000, 0) }, v3(0, -25, 0), 10, {}],
    // 100 km up, 7.6 km/s, the 2 s frames of Vostok's return; its module 50 m behind the sphere
    ["Vostok's instrument module 50 m behind the sphere, 100 km up", { r: v3(R_EARTH + 100e3, 0, 0), v: v3(-120, 7600, 0) }, v3(0, -50, 0), 2,
      { capsule: 'vostok', joint: 'free', motors: { ...SOYUZ_MOTORS, retro: 0 } }],
  ] as [string, State, Vec3, number, Partial<AbortState>][])('keeps a body beside it in its place under 140 km: %s', (_name, escape, offset, span, abort) => {
    const beside: State = { r: add(escape.r, offset), v: addScaled(escape.v, normalize(escape.v), -0.5) };
    const { a, b, flown } = pair(escape, span, abort);
    const body = (s: State): DebrisFrame => ({ id: 8, name: 'beside', r: s.r, v: s.v, dir: v3(1, 0, 0), alive: true, burning: false,
      createdAt: T0 - 50, visual: { kind: 'upperStage', diameter: 1.78, length: 17.6, color: '#ffffff' } } as DebrisFrame);
    const ab = { ...a, debris: [body(beside)] }, bb = { ...b, debris: [body(fly(beside, span))] };
    for (const u of [0.25, 0.5, 0.75]) {
      const mid = interpolateFrames(ab, bb, T0 + span * u), there = fly(beside, span * u).r;
      expect(dist(mid.debris[0].r, there), `u ${u}`).toBeLessThan(0.05);
      expect(dist(sub(mid.debris[0].r, mid.r), sub(there, flown(span * u).r)), `u ${u}`).toBeLessThan(0.05);
    }
  });
});

describe('an escape between two frames in the air', () => {
  // 0.8 s between frames (a recording thinned to a frame a second, as Soyuz 18a's and MS-10's are), slowed by the air
  // at k|v|² and pushed by `thrust` m/s² along its way: the entry's deceleration, a canopy filling, a motor
  const slowed = (k: (t: number) => number, thrust = 0): Push => (t, _r, v) => addScaled(scale(normalize(v), thrust), v, -k(t) * norm(v));
  const at = (h: number, v: Vec3): State => ({ r: v3(R_EARTH + h, 0, 0), v });
  it.each([
    // 1.9 km/s at 40 km, slowed at 10 g
    ['the entry', at(40e3, v3(-1500, 1200, 0)), { phase: 'fall' }, { phase: 'fall' }, slowed(() => 2.7e-5)],
    // 190 m/s at 8 km, the drogue's pull rising from 1 to 3 g as it fills
    ['the drogue filling', at(8e3, v3(-180, 60, 0)), { phase: 'drogue', drogue: 0.3 }, { phase: 'drogue', drogue: 0.9 }, slowed((t) => 2.7e-4 + 6.8e-4 * t)],
    // 60 m/s at 2.5 km, the main's pull rising from half a g to 3 g as it comes out of its reefing
    ['the main out of its reefing', at(2.5e3, v3(-60, 10, 0)), { phase: 'main', main: 0.1 }, { phase: 'main', main: 0.6 }, slowed((t) => 1.3e-3 + 9e-3 * t)],
    // 270 m/s climbing at 3 km, the four motors' 135 kN on the 5.4 t head section
    ["the fairing's motors pulling the head section clear", at(3e3, v3(250, 100, 0)),
      { mode: 'fairing', capsule: 'soyuz', body: 'head', phase: 'escape', motors: { ...SOYUZ_MOTORS, fairing: 1 } },
      { mode: 'fairing', capsule: 'soyuz', body: 'head', phase: 'escape', motors: { ...SOYUZ_MOTORS, fairing: 1 } }, slowed(() => 1e-5, 25)],
  ] as [string, State, Partial<AbortState>, Partial<AbortState>, Push][])('is drawn closer to the flown path than the chord is: %s', (_name, s0, abortA, abortB, push) => {
    const { a, b, flown } = pair(s0, 0.8, abortA, abortB, push);
    for (const u of [0.25, 0.5, 0.75]) {
      const m = miss(a, b, flown, u);
      expect(m.chord, `u ${u}`).toBeGreaterThan(0.3);
      expect(m.drawn, `u ${u}, chord ${m.chord.toFixed(2)} m`).toBeLessThan(m.chord / 10);
    }
  });
});

describe('the spans an escape keeps on the line', () => {
  // C01: Vostok's sphere on the steppe at 51.27° N, its CG 0.95 m up, while Gagarin is still on his parachute
  const lat = 51.27 * Math.PI / 180;
  const ground = v3((R_EARTH + 0.95) * Math.cos(lat), 0, (R_EARTH + 0.95) * Math.sin(lat));
  const turned = (r: Vec3, dt: number): Vec3 => {
    const c = Math.cos(OMEGA_EARTH * dt), s = Math.sin(OMEGA_EARTH * dt);
    return v3(r.x * c - r.y * s, r.x * s + r.y * c, r.z);
  };
  const turning = (r: Vec3) => cross(v3(0, 0, OMEGA_EARTH), r);
  const resting = { capsule: 'vostok', phase: 'landed', joint: 'free', drogue: 0, main: 0, motors: { ...SOYUZ_MOTORS, retro: 0 } } as Partial<AbortState>;

  it('the sphere on the ground: its first frame there still carries the landing\'s velocity, which it loses a step later', () => {
    // down at 10 m/s with the wind's 3 m/s: the cubic through that velocity swings 8 m off the ground's turning
    const landing = add(turning(ground), add(scale(normalize(ground), -10), v3(0, 3, 0)));
    const a = frameAt(T0, { r: ground, v: landing }, resting);
    const b = frameAt(T0 + 5, { r: turned(ground, 5), v: turning(turned(ground, 5)) }, resting);
    for (const u of [0.2, 1 / 3, 0.5, 0.8]) {
      const mid = interpolateFrames(a, b, T0 + 5 * u);
      expect(dist(mid.r, lerp(a.r, b.r, u))).toBeLessThan(1e-6);
      // the chord across 5 s of the ground's turning: 7 cm inside it
      expect(dist(mid.r, turned(ground, 5 * u))).toBeLessThan(0.1);
    }
  });

  it('the sphere at rest at both frames, its pilot not yet down', () => {
    const a = frameAt(T0, { r: ground, v: turning(ground) }, resting);
    const b = frameAt(T0 + 5, { r: turned(ground, 5), v: turning(turned(ground, 5)) }, resting);
    expect(dist(interpolateFrames(a, b, T0 + 2.5).r, lerp(a.r, b.r, 0.5))).toBeLessThan(1e-6);
  });

  it('the span the escape comes to rest in, and the one it ends in', () => {
    const fall = frameAt(T0, { r: addScaled(ground, normalize(ground), 2), v: add(turning(ground), scale(normalize(ground), -10)) },
      { ...resting, phase: 'main', main: 1 });
    const down = frameAt(T0 + 0.2, { r: ground, v: turning(ground) }, resting);
    expect(dist(interpolateFrames(fall, down, T0 + 0.1).r, lerp(fall.r, down.r, 0.5))).toBeLessThan(1e-6);
    // Freedom 7 in the water: the flight over, the status 'landed'
    const splash = { ...down, status: 'landed' as const };
    expect(dist(interpolateFrames(fall, splash, T0 + 0.1).r, lerp(fall.r, splash.r, 0.5))).toBeLessThan(1e-6);
  });

  it("the capsule leaving the head section, the tower's jettison: the earlier frame is held across the change of body", () => {
    // the head section 1.5 km over the pad, a second before the top of its climb
    const high: State = { r: v3(R_EARTH + 1.5e3, 0, 0), v: v3(10, 60, 0) };
    const { a, b } = pair(high, 0.1, { mode: 'tower', capsule: 'soyuz', body: 'head', phase: 'coast', finsOpen: true, motors: { ...SOYUZ_MOTORS } },
      { mode: 'tower', capsule: 'soyuz', body: 'capsule', phase: 'fall', motors: { ...SOYUZ_MOTORS } });
    const head = { ...a, rigid: { ...a.rigid!, configurationId: 'escape.head.fins' } };
    const capsule = { ...b, rigid: { ...b.rigid!, configurationId: 'escape.capsule' } };
    const mid = interpolateFrames(head, capsule, T0 + 0.05);
    expect(mid.r).toEqual(head.r);
    expect(mid.abort!.body).toBe('head');
  });
});

describe('the blend of an escape', () => {
  it('is pure: frozen inputs, the same frame twice', () => {
    const { a, b } = pair(TOP, 10, { motors: { ...SOYUZ_MOTORS, retro: 3 } });
    const freeze = <T>(o: T): T => {
      if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const x of Object.values(o)) freeze(x); }
      return o;
    };
    const before = structuredClone([a, b]);
    freeze(a); freeze(b);
    const one = interpolateFrames(a, b, T0 + 4), two = interpolateFrames(a, b, T0 + 4);
    expect(one).toEqual(two);
    expect([a, b]).toEqual(before);
  });
});

describe('Freedom 7 recorded and replayed, from its separation to the water', () => {
  it('is drawn where it flew: within 3 m on its arc above the air, never further off than the chord, the Redstone in its place beside it', { timeout: 120_000 }, () => {
    const sim = mr3();
    const rec = new FlightRecorder();
    rec.start(sim);
    // the flown state after every step of the return, and of every body still flying
    const flown: { t: number; r: Vec3; bodies: Map<number, Vec3> }[] = [];
    const step = sim.step.bind(sim);
    sim.step = ((dt: number, cb?: () => void) => {
      const used = step(dt, cb);
      if (sim.state.status === 'abort') {
        flown.push({ t: sim.state.t, r: { ...sim.state.r }, bodies: new Map(sim.debris.filter((d) => d.alive).map((d) => [d.id, { ...d.r }])) });
      }
      return used;
    }) as typeof sim.step;
    while (sim.state.status !== 'landed' && !sim.isFailed() && sim.state.t < 1200) rec.advance(5, 1e7);
    expect(sim.state.status).toBe('landed');
    const player = new ReplayPlayer(rec);
    const frames = rec.frames;
    let above = 0, aboveSamples = 0, worse = 0, i = 0, beside = 0, besideSamples = 0;
    for (const { t, r, bodies } of flown) {
      while (i + 1 < frames.length && frames[i + 1].t <= t) i++;
      const a = frames[i], b = frames[i + 1];
      if (!b || t <= a.t + 1e-9 || t >= b.t - 1e-9 || a.status !== 'abort' || b.status !== 'abort') continue;
      const f = player.frameAt(t)!;
      const drawn = dist(f.r, r), chord = dist(lerp(a.r, b.r, (t - a.t) / (b.t - a.t)), r);
      if (drawn > chord + 0.01) worse++;
      if (a.altitude >= 140e3 && b.altitude >= 140e3) { above = Math.max(above, drawn); aboveSamples++; }
      // a body within 5 km of the capsule (the spent Redstone, tens of metres off it over the top), where it is from it
      for (const d of f.debris) {
        const at = bodies.get(d.id);
        if (!at || !d.alive || dist(at, r) > 5e3) continue;
        beside = Math.max(beside, dist(sub(d.r, f.r), sub(at, r)));
        besideSamples++;
      }
    }
    // the 10 s frames over the top, the retro-rockets' among them: 128 m off on the chord
    expect(aboveSamples).toBeGreaterThan(500);
    expect(above).toBeLessThan(3);
    expect(worse).toBe(0);
    // the Redstone on the line beside the capsule on its cubic was drawn 117 m off its place
    expect(besideSamples).toBeGreaterThan(500);
    expect(beside).toBeLessThan(0.3);
  });
});
