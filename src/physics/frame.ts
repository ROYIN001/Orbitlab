/**
 * VisualFrame: an immutable snapshot of everything the renderer and the HUD
 * need to draw one instant of a flight.
 *
 * The 3D views, the map, the onboard overlay and the telemetry panel are
 * driven from frames rather than from the live Simulation object, so that a
 * recorded flight can be scrubbed, replayed and rendered exactly like the
 * live run. `captureFrame` is the single place where the live state is
 * turned into a frame; the flight recorder stores frames and interpolates
 * between them when the user seeks.
 */
import type { Simulation, SimStatus, Debris, DebrisVisual } from './simulation';
import type { AscentPhase } from './guidance';
import type { Vec3 } from './vec3';
import { clone } from './vec3';
import { atmosphere } from './atmosphere';

export interface StageFrame {
  id: string;
  index: number;
  attached: boolean;
  /** engines producing thrust at this instant */
  burning: boolean;
  /** remaining propellant as a fraction of the stage's full load, 0..1 */
  propellantFraction: number;
  isSpacecraft: boolean;
}

export interface BoosterFrame {
  /** booster group id */
  id: string;
  stageId: string;
  attached: boolean;
  burning: boolean;
  propellantFraction: number;
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
}

export interface FrameElements {
  a: number;
  e: number;
  i: number;
  raan: number;
  argp: number;
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
}

/** Snapshot the live simulation into a frame. */
export function captureFrame(sim: Simulation): VisualFrame {
  const s = sim.state;
  const el = s.elements;
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
    });
    for (const b of st.boosters) {
      boosters.push({
        id: b.spec.id,
        stageId: st.spec.id,
        attached: b.attached,
        burning: b.attached && b.ignited && !b.burnedOut && st.attached,
        propellantFraction: b.spec.propellantMass > 0 ? Math.max(0, Math.min(1, b.propellant / b.spec.propellantMass)) : 0,
      });
    }
  }
  const debris: DebrisFrame[] = sim.debris.map((d) => ({
    id: d.id,
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
    lat: s.lat,
    lon: s.lon,
    downrange: s.downrange,
    pitchCmd: s.pitchCmd,
    elements: { a: el.a, e: el.e, i: el.i, raan: el.raan, argp: el.argp, periapsisAlt: el.periapsisAlt, apoapsisAlt: el.apoapsisAlt, period: el.period },
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
  };
}
