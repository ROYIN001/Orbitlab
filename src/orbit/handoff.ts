/**
 * The orbit a flight reached, handed from the Launch section to the Orbit
 * section (roadmap S03, docs/ROADMAP-PART2-3.md): the state vector, when it
 * was, the spacecraft that is in it, and where it came from. The lifetime
 * analysis (P07) starts from one today; the orbit playground and the maneuver
 * planner of Phase 1 (O01–O03) will too.
 *
 * DOM-free and plain JSON — a hand-off lives in memory now, and the same
 * object can be written to a file or a link later (`parseHandoff` reads one
 * back and trusts nothing in it). SI units, the simulator's ECI frame
 * (src/physics/orbital.ts: +Z to the north pole, +X to the vernal equinox).
 */
import type { SatelliteKind, SatelliteSpec } from '../types';
import type { MissionDocument } from '../config/mission-file';
import { elementsFromState, type OrbitalElements } from '../physics/orbital';
import { v3 } from '../physics/vec3';
import { spacecraftFor } from '../physics/propagator/spacecraft';
import type { Spacecraft } from '../physics/propagator/forces';
import type { V3 } from '../physics/propagator/ephemeris';

export const HANDOFF_FORMAT = 'orbitlab.handoff';
export const HANDOFF_FORMAT_VERSION = 1;

/** The orbit a hand-off needs: a perigee above this altitude, m (the lifetime analysis's own floor). */
export const HANDOFF_MIN_PERIGEE = 100e3;

const SATELLITE_KINDS: readonly SatelliteKind[] = ['comsat', 'earthObs', 'weather', 'navigation', 'science', 'cubesats', 'starlink', 'crew'];

export interface HandoffPropulsion {
  /** N */
  thrust: number;
  /** s */
  isp: number;
  /** what is left in the tanks, kg */
  propellantMass: number;
}

export interface HandoffSpacecraft extends Spacecraft {
  /** the payload class, for its drawing and its defaults */
  kind: SatelliteKind;
  /** the spacecraft's own engine and what is left for it, or null when it has none */
  propulsion: HandoffPropulsion | null;
}

export interface OrbitHandoff {
  format: typeof HANDOFF_FORMAT;
  version: number;
  /** position, m, and velocity, m/s, in the simulator's ECI frame */
  r: V3;
  v: V3;
  /** Julian date (UTC) of that state */
  jd: number;
  spacecraft: HandoffSpacecraft;
  /** for people: the payload, the orbit and the mission time, in the language it was made in */
  label: string;
  origin: {
    /** the mission that flew it, as a mission document (U01), when there is one */
    mission: MissionDocument | null;
    /** the vehicle's name, as it flew */
    vehicleName: string;
    /** mission time of the state, s after T−0 */
    missionTime: number;
  };
}

/** What the recorded flight says at the moment of the hand-off (a `VisualFrame`'s fields). */
export interface HandoffFrame {
  status: string;
  t: number;
  jd: number;
  r: { x: number; y: number; z: number };
  v: { x: number; y: number; z: number };
  elements: Pick<OrbitalElements, 'e' | 'periapsisAlt'>;
}

/** The flight is in an orbit it can be handed on in: past the pad, bound, perigee above 100 km. */
export function handoffAvailable(frame: HandoffFrame | null | undefined): frame is HandoffFrame {
  return !!frame && frame.status !== 'prelaunch' && frame.elements.periapsisAlt > HANDOFF_MIN_PERIGEE && frame.elements.e < 1;
}

export interface HandoffInput {
  frame: HandoffFrame;
  satellite: SatelliteSpec;
  /** the payload's mass at launch, kg (the mission's override, else the satellite's) */
  payloadMass: number;
  /**
   * The spacecraft's own stage (`VehicleModel` adds one for a payload with an
   * engine): its dry mass and what is left in it. Absent, the payload is
   * inert and weighs what it did at launch.
   */
  spacecraftStage?: { dryMass: number; propellant: number } | null;
  vehicleName: string;
  mission: MissionDocument | null;
  label: string;
}

/**
 * The hand-off for the state on screen. The drag and sunlight area, C_D and
 * C_R are the payload class's estimates (src/physics/propagator/spacecraft.ts);
 * the mass is what is in orbit — a spacecraft that has burned its own
 * propellant raising its orbit is that much lighter than at launch.
 */
export function handoffFromFlight(input: HandoffInput): OrbitHandoff {
  const { frame, satellite } = input;
  const stage = input.spacecraftStage ?? null;
  const mass = stage ? stage.dryMass + Math.max(0, stage.propellant) : input.payloadMass;
  const estimate = spacecraftFor(satellite.kind, mass);
  return {
    format: HANDOFF_FORMAT,
    version: HANDOFF_FORMAT_VERSION,
    r: [frame.r.x, frame.r.y, frame.r.z],
    v: [frame.v.x, frame.v.y, frame.v.z],
    jd: frame.jd,
    spacecraft: {
      ...estimate,
      kind: satellite.kind,
      propulsion: satellite.propulsion && stage
        ? { thrust: satellite.propulsion.thrust, isp: satellite.propulsion.isp, propellantMass: Math.max(0, stage.propellant) } : null,
    },
    label: input.label,
    origin: { mission: input.mission ? JSON.parse(JSON.stringify(input.mission)) as MissionDocument : null, vehicleName: input.vehicleName, missionTime: frame.t },
  };
}

/** The classical elements of the handed-on orbit (src/physics/orbital.ts). */
export function handoffElements(h: Pick<OrbitHandoff, 'r' | 'v'>): OrbitalElements {
  return elementsFromState(v3(h.r[0], h.r[1], h.r[2]), v3(h.v[0], h.v[1], h.v[2]));
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const vec = (v: unknown): v is V3 => Array.isArray(v) && v.length === 3 && v.every(finite);
const positive = (v: unknown): v is number => finite(v) && v > 0;

/**
 * A hand-off read back from JSON (a file or a link, later), or null when it
 * is not one: every number finite, masses and areas positive, a known payload
 * class, a bound orbit above the atmosphere. A newer version is refused
 * rather than half-read: a state vector is all or nothing.
 */
export function parseHandoff(raw: unknown): OrbitHandoff | null {
  if (!isObj(raw) || raw.format !== HANDOFF_FORMAT || raw.version !== HANDOFF_FORMAT_VERSION) return null;
  if (!vec(raw.r) || !vec(raw.v) || !finite(raw.jd) || typeof raw.label !== 'string') return null;
  const sc = raw.spacecraft, origin = raw.origin;
  if (!isObj(sc) || !positive(sc.mass) || !positive(sc.area) || !positive(sc.cd) || !positive(sc.cr)) return null;
  if (!SATELLITE_KINDS.includes(sc.kind as SatelliteKind)) return null;
  const p = sc.propulsion;
  if (p !== null && (!isObj(p) || !positive(p.thrust) || !positive(p.isp) || !finite(p.propellantMass) || p.propellantMass < 0)) return null;
  if (!isObj(origin) || typeof origin.vehicleName !== 'string' || !finite(origin.missionTime)) return null;
  if (origin.mission !== null && !isObj(origin.mission)) return null;
  const h = raw as unknown as OrbitHandoff;
  const el = handoffElements(h);
  if (!(el.e < 1) || !(el.periapsisAlt > HANDOFF_MIN_PERIGEE)) return null;
  return JSON.parse(JSON.stringify(h)) as OrbitHandoff;
}
