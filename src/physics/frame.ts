/**
 * VisualFrame: an immutable snapshot of everything the renderer and the HUD
 * need to draw one instant of a flight.
 *
 * The target state is that the 3D views, the map, the onboard overlay and the
 * telemetry panel are all driven from frames rather than from the live
 * Simulation object, so that a recorded flight can be scrubbed, replayed and
 * rendered exactly like the live run. `captureFrame` is the single place where
 * the live state is turned into a frame; the flight recorder stores frames and
 * interpolates between them when the user seeks.
 *
 * Status after wave 1: the 3D renderer half is closed — `SceneManager`,
 * `RocketView`, `DebrisView`, `LaunchPadView`, the camera rig and the orbit
 * lines read nothing but a frame. The map (`ui/map.ts`), the onboard overlay
 * (`ui/onboard.ts`), the HUD (`ui/hud.ts`) and the telemetry panel
 * (`ui/telemetry.ts`) still take a `Simulation` and must be converted before
 * the recorder can scrub them. See the wave-1 hand-off notes.
 *
 * Status after wave 2: `src/replay/recorder.ts` stores frames as the live
 * flight runs and `interpolateFrames` (below) produces the frame for any
 * mission time between two of them, which is how seeking works — replay never
 * re-simulates. The HUD is frame-driven now. The map and the onboard overlay
 * still take a `Simulation`, so they are handed a frame-backed view of the
 * mission (`src/replay/simview.ts`) until they are converted properly; the
 * telemetry panel stays live on purpose, since it charts the whole flight.
 */
import type { Simulation, SimStatus, DescentPhase, Debris, DebrisVisual, Losses } from './simulation';
import type { AscentPhase } from './guidance';
import type { VehicleSpec } from '../types';
import type { Vec3 } from './vec3';
import type { ReturnTarget } from './sim/return-guidance';
import { clone } from './vec3';
import { propagateKepler } from './orbital';
import { atmosphere } from './atmosphere';
import { R_EARTH } from './constants';
import { cloneRigidTelemetry, interpolateRigidTelemetry, sameRigidConfiguration, type RigidTelemetry } from './rigid/telemetry';
import { quatRotate } from './rigid/math';

export interface StageFrame {
  id: string;
  index: number;
  attached: boolean;
  /** engines producing thrust at this instant */
  burning: boolean;
  /** remaining propellant as a fraction of the stage's full load, 0..1 */
  propellantFraction: number;
  isSpacecraft: boolean;
  /** true once the stage's engines have been commanded to light for the first time */
  ignited?: boolean;
  /**
   * Mission time at which this stage's engines were first ignited. Only
   * meaningful when `ignited` is true: a liquid first stage lights a few
   * seconds *before* T-0, so this is legitimately negative on the pad and a
   * numeric "never happened" sentinel would be ambiguous — test `ignited`.
   */
  ignitionTime?: number;
  /** mission time at which this stage separated (-1 while attached) */
  sepTime?: number;
  /** fraction of this stage's engines still running, 0..1 */
  engineFraction?: number;
  /**
   * Throttle the *core engines of this stage* are actually running at, 0..1.
   *
   * `VisualFrame.throttle` is the guidance command. `VehicleModel.thrust`
   * clamps it to the engine's minimum throttle and, while strap-ons are
   * burning, to `throttleWithBoosters` — Angara's core drops to 30 % twenty
   * seconds after liftoff while the command stays at 1. The plume must follow
   * the clamped value, otherwise a throttled-down core draws a full plume.
   */
  effectiveThrottle?: number;
}

export interface BoosterFrame {
  /** booster group id */
  id: string;
  stageId: string;
  attached: boolean;
  burning: boolean;
  propellantFraction: number;
  /** mission time at which the booster burned out or was jettisoned (-1 while burning) */
  burnoutTime?: number;
  /** throttle this group's engines are actually running at (see `StageFrame.effectiveThrottle`) */
  effectiveThrottle?: number;
}

export interface DebrisFrame {
  rigid?: RigidTelemetry;
  id: number;
  name: string;
  r: Vec3;
  v: Vec3;
  dir: Vec3;
  alive: boolean;
  /** recovery engines firing (entry or landing burn) */
  burning: boolean;
  visual: DebrisVisual;
  outcome?: Debris['outcome'];
  createdAt: number;
  /** ambient pressure at *this* object's altitude, Pa (0 above the atmosphere) */
  pressure?: number;
  /**
   * Offset along `+dir`, in metres, from `r` to the BASE of the drawn body.
   *
   * The simulation gives every jettisoned object the position of the vehicle it
   * came off (`r = s.r`), and the renderer draws the base of the lowest still
   * attached stage at that same point — so a spent stage drawn base-first would
   * occupy exactly the volume the remaining stack has just moved into, and the
   * two interpenetrate for the whole separation. The offset restores the
   * stacking geometry: a spent stage hangs *below* the separation plane
   * (`anchor = -height`), fairing halves sit at the top of the stack
   * (`anchor = +height of the attached stages`), and strap-ons, whose bases
   * really were level with the core's, keep `anchor = 0`.
   */
  anchor?: number;
  /**
   * First-stage recovery state, for the grid fins, legs and landing burn, and
   * where the stage is being flown to — the landing zone or the drone ship the
   * renderer draws under it.
   */
  recovery?: {
    phase: NonNullable<Debris['recovery']>['phase']; landed: boolean; target?: ReturnTarget; missDistance?: number;
    /** the landing burn has lit (the legs come out for it) */
    landingBurn?: boolean;
  };
  /**
   * Where this object came down, once it has. Carried on the frame so the
   * telemetry panel's spent-stage list can be driven from the displayed
   * instant instead of from the live `Simulation` — scrubbing back to before
   * the impact must not show the impact coordinates.
   */
  impact?: { lat: number; lon: number };
}

/**
 * Classical elements of the tracked vehicle. The field set is a superset of
 * `OrbitalElements`, so a frame's elements can be handed straight to
 * `sampleOrbit` and friends without reaching back into the live simulation.
 */
export interface FrameElements {
  a: number;
  e: number;
  i: number;
  raan: number;
  argp: number;
  /** true anomaly, rad */
  nu: number;
  /** specific orbital energy, J/kg */
  energy: number;
  /** specific angular momentum, m^2/s */
  h: number;
  /** argument of latitude (argp + nu), rad */
  u: number;
  periapsisAlt: number;
  apoapsisAlt: number;
  period: number;
}

export interface VisualFrame {
  /** Optional for legacy recordings; new snapshots use schema 2. */
  schemaVersion?: number;
  rigid?: RigidTelemetry;
  t: number;
  status: SimStatus;
  ascentPhase: AscentPhase | null;
  /** a suborbital flight's return (`SimState.descentPhase`); absent on older recordings */
  descentPhase?: DescentPhase | null;
  /** HUD note key (countdown, ascent, coast, burn, orbit, orbitOffTarget, suborbital, destroyed, reentry, noLiftoff) */
  note: string;
  r: Vec3;
  v: Vec3;
  /** unit body axis (ECI) */
  dir: Vec3;
  throttle: number;
  thrust: number;
  mass: number;
  altitude: number;
  altitudeAGL: number;
  airspeed: number;
  speed: number;
  vz: number;
  q: number;
  mach: number;
  gLoad: number;
  /** ambient pressure, Pa (0 in space) */
  pressure: number;
  /** Greenwich sidereal angle, rad */
  theta: number;
  /** Julian date at this instant — drives the sun direction, sky and shading */
  jd: number;
  lat: number;
  lon: number;
  downrange: number;
  pitchCmd: number;
  elements: FrameElements;
  stages: StageFrame[];
  boosters: BoosterFrame[];
  activeStageIndex: number;
  fairingAttached: boolean;
  payloadSeparated: boolean;
  destroyed: boolean;
  liftoff: boolean;
  debris: DebrisFrame[];
  /** number of events emitted up to and including this instant */
  eventCount: number;
  nextBurnTime: number;
  dvRemaining: number;
  maxQ: { value: number; t: number; alt: number };
  /**
   * Cumulative ascent Δv book-keeping (ideal, gravity, drag and steering
   * losses), m/s. Four monotonic numbers, carried on the frame so the
   * telemetry panel can be driven from a seeked frame instead of from the live
   * `SimState` — audit item B3 names this as the prerequisite for converting
   * `ui/telemetry.ts`.
   */
  losses: Losses;
  /** mission time of liftoff (<0 before it happens) */
  liftoffT?: number;
  /** mission time of payload separation (<0 before it happens) */
  payloadSepT?: number;
  /**
   * Bounding size of the deployed payload, m. Static for a given mission, but
   * carried on the frame so camera framing after payload separation needs no
   * reference to the live Simulation (or to the mission config) — a replayed
   * frame frames the spacecraft exactly like the live run did.
   */
  payloadHeight?: number;
  payloadWidth?: number;
  /**
   * Vehicle name ("Falcon 9 Block 5"). A proper noun, not a translated string:
   * it labels the space-view marker, which draws it into a canvas texture.
   */
  vehicleName?: string;
}

// ------------------------------------------------------------- stack layout

/**
 * Stacking geometry of a launch vehicle, in metres above the bottom of the
 * full stack.
 *
 * Both `RocketView` (which lays the attached parts out) and `captureFrame`
 * (which anchors the jettisoned ones, see `DebrisFrame.anchor`) need the same
 * numbers; computing them twice is how the fairing ended up 15 m inside the
 * second stage. This is pure spec arithmetic — no Three.js, no DOM — so it
 * lives next to the frame it feeds.
 */
export interface StackLayout {
  /** stacking height of each entry of `spec.stages` (0 for a spacecraft), m */
  height: number[];
  /** height of each entry's base above the bottom of the stack, m */
  base: number[];
  /**
   * Diameter of whatever sits directly on top of each entry — the next
   * non-spacecraft stage, else the fairing, else nothing. It is what decides
   * the interstage adapter, and `RocketView` used to re-derive the same rule
   * for the cone it draws, so the two could drift.
   */
  topDiameter: (number | null)[];
  /** total height of the launcher stack — the base of the fairing/payload, m */
  total: number;
}

/**
 * Height of the interstage adapter drawn between two body diameters, m.
 * Diameters within 50 mm get a flush band instead, which adds no height.
 */
export function interstageHeight(lowerDiameter: number, upperDiameter: number | null): number {
  if (upperDiameter === null) return 0;
  const d = Math.abs(upperDiameter - lowerDiameter);
  return d > 0.05 ? d * 1.1 + 0.6 : 0;
}

const layoutCache = new WeakMap<VehicleSpec, StackLayout>();

/** Stacking heights of a vehicle's stages (cached per spec). */
export function stackLayout(spec: VehicleSpec): StackLayout {
  const hit = layoutCache.get(spec);
  if (hit) return hit;
  const height: number[] = [];
  const base: number[] = [];
  const topDiameter: (number | null)[] = [];
  let total = 0;
  for (let i = 0; i < spec.stages.length; i++) {
    const st = spec.stages[i];
    base.push(total);
    if (st.isSpacecraft) { height.push(0); topDiameter.push(null); continue; }
    const next = spec.stages.slice(i + 1).find((s) => !s.isSpacecraft);
    const topD = next ? next.diameter : spec.fairing ? spec.fairing.diameter : null;
    topDiameter.push(topD);
    const h = st.length + interstageHeight(st.diameter, topD);
    height.push(h);
    total += h;
  }
  const out: StackLayout = { height, base, topDiameter, total };
  layoutCache.set(spec, out);
  return out;
}

/**
 * Where the *still attached* part of the stack started at mission time `at`, m
 * above the bottom of the full stack. The renderer draws that point at `s.r`,
 * so it is also the conversion between stack coordinates and the floating
 * origin.
 *
 * Evaluated at an arbitrary instant rather than "now" because that is what
 * makes `debrisAnchor` a pure function of state. It reads only `attached` and
 * `sepTime`, both of which the simulation writes once and never rewrites.
 */
function attachedBaseAt(sim: Simulation, layout: StackLayout, at: number): number {
  let base = 0;
  const stages = sim.vehicle.stages;
  for (let i = 0; i < stages.length; i++) {
    const st = stages[i];
    if (st.spec.isSpacecraft) continue;
    // still attached now, or still attached *then*
    if (st.attached || st.sepTime > at) break;
    base += layout.height[i] ?? 0;
  }
  return base;
}

/**
 * A recovered stage is flown, and lands, on its physics point: that is where
 * its legs touch the ground. It separates hanging below the stack like any
 * spent stage, and eases up onto that point over the seconds after, while it
 * is still close enough to the stack for the offset to matter.
 */
const RECOVERY_ANCHOR_SETTLE = [2, 20] as const;

/**
 * Offset from `d.r` to the base of the drawn body — see `DebrisFrame.anchor`.
 *
 * Deliberately **not** memoised. It used to be cached in a per-Simulation
 * WeakMap, filled on the first `captureFrame` that saw the object, and the
 * fairing branch read the LIVE attached state to fill it. That made
 * `captureFrame(sim)` a function of how often it had been called rather than of
 * the state alone, against this file's own contract — and `App.frame`
 * fast-forwards with `recorder.advance(min(600, …), 3000)`, so one advance can
 * swallow a fairing jettison and a later stage separation and latch the wrong
 * anchor. Asking for the stack as it stood at `d.createdAt` gives the same
 * answer from any call order, and the scan is four comparisons over a list that
 * is never longer than four stages.
 */
function debrisAnchor(sim: Simulation, d: Debris, layout: StackLayout): number {
  if (d.visual.kind === 'stage' || d.visual.kind === 'upperStage') {
    // the spent stage hangs below the separation plane, which is where the
    // remaining stack's base — and therefore the origin — now sits
    const idx = sim.vehicle.stages.findIndex((st) => st.spec.name === d.name);
    const hang = -(idx >= 0 ? layout.height[idx] : d.visual.length);
    if (!d.recovery) return hang;
    const age = sim.state.t - d.createdAt;
    const [from, to] = RECOVERY_ANCHOR_SETTLE;
    const k = Math.max(0, Math.min(1, (age - from) / (to - from)));
    return hang * (1 - k * k * (3 - 2 * k));
  }
  if (d.visual.kind === 'fairing') {
    // the halves come off the top of whatever was still attached at jettison;
    // a later stage separation must not move a fairing that is already gone
    return layout.total - attachedBaseAt(sim, layout, d.createdAt);
  }
  return 0;
}

/** Ambient pressure at a debris item's own altitude (a landing booster at 2 km
 *  must not draw the vacuum-expanded plume of a second stage at 200 km). */
function debrisPressure(r: Vec3): number {
  const alt = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z) - R_EARTH;
  return alt > 1000e3 ? 0 : atmosphere(Math.max(0, alt)).p;
}

/**
 * Cached one-shot event times, keyed by simulation. `sim.events` only ever
 * grows, so the scan is redone only when its length changes instead of twice
 * per rendered frame over an array that reaches 30+ entries on a full mission.
 */
interface EventTimes { count: number; liftoffT: number; payloadSepT: number }
const eventTimes = new WeakMap<Simulation, EventTimes>();

function oneShotTimes(sim: Simulation): EventTimes {
  let c = eventTimes.get(sim);
  if (!c) { c = { count: -1, liftoffT: -1, payloadSepT: -1 }; eventTimes.set(sim, c); }
  if (c.count !== sim.events.length) {
    c.count = sim.events.length;
    if (c.liftoffT < 0) c.liftoffT = sim.events.find((e) => e.key === 'evt.liftoff')?.t ?? -1;
    if (c.payloadSepT < 0) c.payloadSepT = sim.events.find((e) => e.key === 'evt.payloadSep')?.t ?? -1;
  }
  return c;
}

/** Snapshot the live simulation into a frame. */
export function captureFrame(sim: Simulation): VisualFrame {
  const s = sim.state;
  const el = s.elements;
  const times = oneShotTimes(sim);
  const layout = stackLayout(sim.vehicleSpec);
  const stages: StageFrame[] = [];
  const boosters: BoosterFrame[] = [];
  for (const st of sim.vehicle.stages) {
    const burning = st.ignited && !st.cutoff && !st.burnedOut && st.engineFraction > 0 && st.attached && st.index === sim.vehicle.activeIndex && s.thrust > 0;
    stages.push({
      id: st.spec.id,
      index: st.index,
      attached: st.attached,
      burning,
      propellantFraction: st.spec.propellantMass > 0 ? Math.max(0, Math.min(1, st.propellant / st.spec.propellantMass)) : 0,
      isSpacecraft: !!st.spec.isSpacecraft,
      ignited: st.ignited,
      ignitionTime: st.ignitionTime,
      // -1 means "has not separated": `sepTime` is only ever written by
      // separateStage, so a still-attached stage must not report 0.
      sepTime: st.attached ? -1 : st.sepTime,
      engineFraction: st.engineFraction,
      // `s.coreThrottle` is what `VehicleModel.thrust` actually applied on the
      // last step, solid profile included — only the active stage can be
      // `burning`, so one recorded number covers the whole list.
      effectiveThrottle: burning ? s.coreThrottle : 0,
    });
    for (const b of st.boosters) {
      const bBurning = b.attached && b.ignited && !b.burnedOut && st.attached;
      boosters.push({
        id: b.spec.id,
        stageId: st.spec.id,
        attached: b.attached,
        burning: bBurning,
        effectiveThrottle: bBurning ? s.boosterThrottle : 0,
        propellantFraction: b.spec.propellantMass > 0 ? Math.max(0, Math.min(1, b.propellant / b.spec.propellantMass)) : 0,
        // burnoutTime is written by burnout and by jettisonBooster only; a
        // booster that is still burning must report -1, not 0.
        burnoutTime: b.burnoutTime > 0 ? b.burnoutTime : -1,
      });
    }
  }
  const debris: DebrisFrame[] = sim.debris.map((d) => ({
    rigid: cloneRigidTelemetry(d.rigid),
    id: d.id,
    pressure: debrisPressure(d.r),
    name: d.name,
    r: clone(d.r),
    v: clone(d.v),
    dir: clone(d.dir),
    alive: d.alive,
    burning: !!d.recovery?.burning,
    visual: d.visual,
    outcome: d.outcome,
    createdAt: d.createdAt,
    anchor: d.rigid ? d.rigid.renderOffsetBody.x : debrisAnchor(sim, d, layout),
    recovery: d.recovery ? { phase: d.recovery.phase, landed: d.recovery.landed, target: d.recovery.target, missDistance: d.recovery.missDistance,
      landingBurn: !!d.recovery.landingStarted } : undefined,
    impact: d.impact ? { lat: d.impact.lat, lon: d.impact.lon } : undefined,
  }));
  return {
    t: s.t,
    schemaVersion: 2,
    rigid: cloneRigidTelemetry(s.rigid),
    status: s.status,
    ascentPhase: s.ascentPhase,
    ...(s.descentPhase ? { descentPhase: s.descentPhase } : {}),
    note: s.note,
    r: clone(s.r),
    v: clone(s.v),
    dir: clone(s.dir),
    throttle: s.throttle,
    thrust: s.thrust,
    mass: s.mass,
    altitude: s.altitude,
    altitudeAGL: s.altitudeAGL,
    airspeed: s.airspeed,
    speed: s.speed,
    vz: s.vz,
    q: s.q,
    mach: s.mach,
    gLoad: s.gLoad,
    pressure: s.altitude > 1000e3 ? 0 : atmosphere(Math.max(0, s.altitude)).p,
    theta: s.theta,
    jd: sim.julianDate(),
    lat: s.lat,
    lon: s.lon,
    downrange: s.downrange,
    pitchCmd: s.pitchCmd,
    elements: {
      a: el.a, e: el.e, i: el.i, raan: el.raan, argp: el.argp, nu: el.nu, energy: el.energy, h: el.h, u: el.u,
      periapsisAlt: el.periapsisAlt, apoapsisAlt: el.apoapsisAlt, period: el.period,
    },
    stages,
    boosters,
    activeStageIndex: sim.vehicle.activeIndex,
    fairingAttached: sim.vehicle.fairingAttached,
    payloadSeparated: s.payloadSeparated,
    destroyed: s.destroyed,
    liftoff: s.liftoff,
    debris,
    eventCount: sim.events.length,
    nextBurnTime: s.nextBurnTime,
    dvRemaining: s.payloadSeparated ? sim.vehicle.spacecraftDeltaV() : sim.vehicle.deltaVRemaining(),
    maxQ: { ...s.maxQ },
    losses: { ...s.losses },
    liftoffT: times.liftoffT,
    payloadSepT: times.payloadSepT,
    payloadHeight: sim.satellite.size?.height,
    payloadWidth: sim.satellite.size?.width,
    vehicleName: sim.vehicleSpec.name,
  };
}

// ---------------------------------------------------------------- replay

/** Linear blend of two scalars; non-finite inputs fall back to the earlier one. */
function mix(a: number, b: number, u: number): number {
  if (!isFinite(a) || !isFinite(b)) return a;
  return a + (b - a) * u;
}

/** Blend two angles (rad) along the shortest arc. */
function mixAngle(a: number, b: number, u: number): number {
  if (!isFinite(a) || !isFinite(b)) return a;
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * u;
}

/** Blend two longitudes (deg) across the ±180° seam. */
function mixLon(a: number, b: number, u: number): number {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  const x = a + d * u;
  return x > 180 ? x - 360 : x < -180 ? x + 360 : x;
}

/** Shortest-arc interpolation of two (unit) direction vectors. */
function slerp(a: Vec3, b: Vec3, u: number): Vec3 {
  const d = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  // Nearly parallel (or exactly antiparallel, where the arc is undefined):
  // a normalised lerp is both stable and visually indistinguishable.
  if (d > 0.9995 || d < -0.9995) {
    const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u, z = a.z + (b.z - a.z) * u;
    const n = Math.sqrt(x * x + y * y + z * z);
    return n > 1e-9 ? { x: x / n, y: y / n, z: z / n } : clone(a);
  }
  const theta = Math.acos(d);
  const s = Math.sin(theta);
  const k0 = Math.sin((1 - u) * theta) / s;
  const k1 = Math.sin(u * theta) / s;
  return { x: a.x * k0 + b.x * k1, y: a.y * k0 + b.y * k1, z: a.z * k0 + b.z * k1 };
}

const lerpVec = (a: Vec3, b: Vec3, u: number): Vec3 => ({
  x: a.x + (b.x - a.x) * u,
  y: a.y + (b.y - a.y) * u,
  z: a.z + (b.z - a.z) * u,
});

/**
 * Deep copy of a frame, down to every sub-object a consumer could write to.
 *
 * The recording is append-only and must stay that way, but nothing in the type
 * system enforces it: a frame handed out by a seek travels through
 * `replay/simview.ts` into `ui/map.ts` and `ui/onboard.ts`, files this wave
 * does not own. Every path that returns "the frame at time t" therefore returns
 * a copy, so a caller that mutates what it was given cannot corrupt the
 * recording. Shared *immutable* data is deliberately aliased: `debris[].visual`
 * is a spec object owned by the simulation, and copying it per frame would cost
 * more than the rest of the frame put together.
 */
export function cloneFrame(f: VisualFrame): VisualFrame {
  return {
    ...f,
    rigid: cloneRigidTelemetry(f.rigid),
    r: clone(f.r),
    v: clone(f.v),
    dir: clone(f.dir),
    elements: { ...f.elements },
    maxQ: { ...f.maxQ },
    losses: { ...f.losses },
    stages: f.stages.map((s) => ({ ...s })),
    boosters: f.boosters.map((b) => ({ ...b })),
    debris: f.debris.map((d) => ({
      ...d,
      rigid: cloneRigidTelemetry(d.rigid),
      r: clone(d.r),
      v: clone(d.v),
      dir: clone(d.dir),
      recovery: d.recovery ? { ...d.recovery } : undefined,
      impact: d.impact ? { ...d.impact } : undefined,
    })),
  };
}

/**
 * Interpolate between two recorded frames for a seek to mission time `time`.
 *
 * Continuous quantities (altitude, speed, dynamic pressure, the classical
 * elements, the epoch) are blended linearly, angles along the shortest arc and
 * the body axis by slerp. Position and velocity follow the Kepler solution
 * propagated from the earlier frame whenever both frames are coasting or in
 * orbit — over a 30 s orbital recording gap a straight line between two states
 * cuts several kilometres off the arc — and are blended linearly otherwise,
 * because under thrust or in the atmosphere the two-body solution is not the
 * trajectory that was flown.
 *
 * Everything discrete (status, ascent phase, stage/booster/fairing state, the
 * debris list, the event count) comes from the *earlier* frame: a state that
 * changes at an instant must not be shown before that instant. Debris
 * positions are still interpolated, so spent stages fall smoothly.
 *
 * The result is a fresh frame; the inputs are never mutated. The function is
 * pure, so seeking twice to the same time produces deep-equal frames.
 */
export function interpolateFrames(a: VisualFrame, b: VisualFrame, time: number): VisualFrame {
  const span = b.t - a.t;
  // Degenerate spans and a seek that lands on `a` itself still hand back a
  // *copy*: a shallow spread would share `elements`, `stages`, `debris` and
  // `maxQ` with the stored frame, which is the one thing the recording cannot
  // afford (see `cloneFrame`).
  if (!(span > 0)) return cloneFrame(a);
  const u = Math.max(0, Math.min(1, (time - a.t) / span));
  if (u <= 0) return cloneFrame(a);
  const hasRigid = !!a.rigid || !!b.rigid || a.debris.some(d => !!d.rigid) || b.debris.some(d => !!d.rigid);
  if (hasRigid && u >= 1) return cloneFrame(b);
  if ((a.rigid || b.rigid) && (!sameRigidConfiguration(a.rigid, b.rigid)
    || a.activeStageIndex !== b.activeStageIndex || a.payloadSeparated !== b.payloadSeparated
    || a.fairingAttached !== b.fairingAttached
    || a.stages.some((stage, i) => stage.id !== b.stages[i]?.id || stage.attached !== b.stages[i]?.attached)
    || a.boosters.some((booster, i) => booster.id !== b.boosters[i]?.id || booster.attached !== b.boosters[i]?.attached))) {
    // No meaningful continuous path connects two different CGs/body identities.
    // Event-pinned recording makes this hold at most the final pre-event interval.
    return { ...cloneFrame(a), t: a.t + span * u };
  }
  const dt = span * u;
  const coasting = (f: VisualFrame) => f.status === 'coast' || f.status === 'orbit' || (f.status === 'descent' && f.descentPhase === 'coast');
  const ballistic = !a.rigid && coasting(a) && coasting(b) && a.thrust <= 0;
  let r: Vec3;
  let v: Vec3;
  if (ballistic) {
    const p = propagateKepler(a.r, a.v, dt);
    r = p.r;
    v = p.v;
  } else {
    r = lerpVec(a.r, b.r, u);
    v = lerpVec(a.v, b.v, u);
  }
  const ea = a.elements, eb = b.elements;
  const debris: DebrisFrame[] = a.debris.map((d) => {
    const other = b.debris.find((x) => x.id === d.id);
    const rec = d.recovery ? { ...d.recovery } : undefined;
    const imp = d.impact ? { ...d.impact } : undefined;
    if (!other || !other.alive || !d.alive || ((d.rigid || other.rigid) && !sameRigidConfiguration(d.rigid, other.rigid))) {
      return { ...d, rigid: cloneRigidTelemetry(d.rigid), r: clone(d.r), v: clone(d.v), dir: clone(d.dir), recovery: rec, impact: imp };
    }
    const rigid = interpolateRigidTelemetry(d.rigid, other.rigid, u);
    return {
      ...d,
      rigid,
      r: lerpVec(d.r, other.r, u),
      v: lerpVec(d.v, other.v, u),
      dir: rigid ? quatRotate(rigid.attitudeQ, { x: 1, y: 0, z: 0 }) : slerp(d.dir, other.dir, u),
      pressure: mix(d.pressure ?? 0, other.pressure ?? 0, u),
      recovery: rec,
      impact: imp,
    };
  });
  const rigid = interpolateRigidTelemetry(a.rigid,b.rigid,u);
  const samePropulsion = a.stages.every((stage, i) => stage.burning === b.stages[i]?.burning
    && stage.ignited === b.stages[i]?.ignited && stage.engineFraction === b.stages[i]?.engineFraction)
    && a.boosters.every((booster, i) => booster.burning === b.boosters[i]?.burning);
  return {
    ...a,
    rigid,
    t: a.t + dt,
    r,
    v,
    dir: rigid ? quatRotate(rigid.attitudeQ, {x:1,y:0,z:0}) : slerp(a.dir, b.dir, u),
    throttle: samePropulsion ? mix(a.throttle, b.throttle, u) : a.throttle,
    thrust: samePropulsion ? mix(a.thrust, b.thrust, u) : a.thrust,
    mass: mix(a.mass, b.mass, u),
    altitude: mix(a.altitude, b.altitude, u),
    altitudeAGL: mix(a.altitudeAGL, b.altitudeAGL, u),
    airspeed: mix(a.airspeed, b.airspeed, u),
    speed: mix(a.speed, b.speed, u),
    vz: mix(a.vz, b.vz, u),
    q: mix(a.q, b.q, u),
    mach: mix(a.mach, b.mach, u),
    gLoad: mix(a.gLoad, b.gLoad, u),
    pressure: mix(a.pressure, b.pressure, u),
    theta: mix(a.theta, b.theta, u),
    jd: mix(a.jd, b.jd, u),
    lat: mix(a.lat, b.lat, u),
    lon: mixLon(a.lon, b.lon, u),
    downrange: mix(a.downrange, b.downrange, u),
    pitchCmd: mix(a.pitchCmd, b.pitchCmd, u),
    dvRemaining: mix(a.dvRemaining, b.dvRemaining, u),
    elements: {
      a: mix(ea.a, eb.a, u),
      e: mix(ea.e, eb.e, u),
      i: mixAngle(ea.i, eb.i, u),
      raan: mixAngle(ea.raan, eb.raan, u),
      argp: mixAngle(ea.argp, eb.argp, u),
      nu: mixAngle(ea.nu, eb.nu, u),
      energy: mix(ea.energy, eb.energy, u),
      h: mix(ea.h, eb.h, u),
      u: mixAngle(ea.u, eb.u, u),
      periapsisAlt: mix(ea.periapsisAlt, eb.periapsisAlt, u),
      apoapsisAlt: mix(ea.apoapsisAlt, eb.apoapsisAlt, u),
      period: mix(ea.period, eb.period, u),
    },
    // the loss budget only ever grows, so a linear blend is both monotonic and
    // the physically right answer between two samples
    losses: {
      dvThrust: mix(a.losses.dvThrust, b.losses.dvThrust, u),
      gravity: mix(a.losses.gravity, b.losses.gravity, u),
      drag: mix(a.losses.drag, b.losses.drag, u),
      steering: mix(a.losses.steering, b.losses.steering, u),
    },
    // discrete state: the earlier frame, copied so the recording stays immutable
    stages: a.stages.map((s) => ({ ...s })),
    boosters: a.boosters.map((s) => ({ ...s })),
    maxQ: { ...a.maxQ },
    debris,
  };
}
