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
 */
import type { Simulation, SimStatus, Debris, DebrisVisual } from './simulation';
import type { AscentPhase } from './guidance';
import type { Vec3 } from './vec3';
import { clone } from './vec3';
import { atmosphere } from './atmosphere';
import { R_EARTH } from './constants';

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
}

export interface DebrisFrame {
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
  t: number;
  status: SimStatus;
  ascentPhase: AscentPhase | null;
  /** HUD note key (countdown, ascent, coast, burn, orbit, orbitOffTarget, suborbital, destroyed, reentry) */
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
    });
    for (const b of st.boosters) {
      boosters.push({
        id: b.spec.id,
        stageId: st.spec.id,
        attached: b.attached,
        burning: b.attached && b.ignited && !b.burnedOut && st.attached,
        propellantFraction: b.spec.propellantMass > 0 ? Math.max(0, Math.min(1, b.propellant / b.spec.propellantMass)) : 0,
        // burnoutTime is written by burnout and by jettisonBooster only; a
        // booster that is still burning must report -1, not 0.
        burnoutTime: b.burnoutTime > 0 ? b.burnoutTime : -1,
      });
    }
  }
  const debris: DebrisFrame[] = sim.debris.map((d) => ({
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
  }));
  return {
    t: s.t,
    status: s.status,
    ascentPhase: s.ascentPhase,
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
    liftoffT: times.liftoffT,
    payloadSepT: times.payloadSepT,
    payloadHeight: sim.satellite.size?.height,
    payloadWidth: sim.satellite.size?.width,
  };
}
