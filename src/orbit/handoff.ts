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
import { parseDesignRef, type DesignRef } from '../design/design-ref';
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
    /**
     * R3.1: the user's design it flew (or, sent from Build, the design placed
     * in its orbit), with its saved revision — absent when it was a catalogue
     * craft. Optional, so a hand-off without it reads as before.
     */
    design?: DesignRef;
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
 * The satellite's own figure where it gives one a hand-off can carry — a
 * finite number above zero, as `parseHandoff` asks — else the class's
 * estimate. Reporting a bad figure is the satellite's checker's work; here it
 * must only not make a hand-off that cannot be read back.
 */
const ownFigure = (own: number | undefined, estimate: number): number => (typeof own === 'number' && Number.isFinite(own) && own > 0 ? own : estimate);

/**
 * The hand-off for the state on screen. The drag and sunlight area, C_D and
 * C_R are the satellite's own where it has them (a designed satellite, roadmap
 * D06: `SatelliteSpec.area`, `cd`, `cr`), else the payload class's estimates
 * (src/physics/propagator/spacecraft.ts), which is every catalogue satellite;
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
      // the estimate's keys, in its order, each overridden where the satellite has its own
      ...estimate,
      area: ownFigure(satellite.area, estimate.area),
      cd: ownFigure(satellite.cd, estimate.cd),
      cr: ownFigure(satellite.cr, estimate.cr),
      kind: satellite.kind,
      propulsion: satellite.propulsion && stage
        ? { thrust: satellite.propulsion.thrust, isp: satellite.propulsion.isp, propellantMass: Math.max(0, stage.propellant) } : null,
    },
    label: input.label,
    origin: { mission: input.mission ? JSON.parse(JSON.stringify(input.mission)) as MissionDocument : null, vehicleName: input.vehicleName, missionTime: frame.t },
  };
}

/**
 * O03: a hand-off made in the Orbit section itself, for its tools that read
 * one (the lifetime analysis): the playground's orbit as a state, with the
 * spacecraft in it — the flight's, lighter by what the plans burned, or an
 * estimate the user can change in the tool.
 */
export function handoffFromState(input: { r: { x: number; y: number; z: number }; v: { x: number; y: number; z: number }; jd: number;
  spacecraft: HandoffSpacecraft; label: string }): OrbitHandoff {
  return {
    format: HANDOFF_FORMAT, version: HANDOFF_FORMAT_VERSION,
    r: [input.r.x, input.r.y, input.r.z], v: [input.v.x, input.v.y, input.v.z], jd: input.jd,
    spacecraft: { ...input.spacecraft, propulsion: input.spacecraft.propulsion ? { ...input.spacecraft.propulsion } : null },
    label: input.label,
    origin: { mission: null, vehicleName: '', missionTime: 0 },
  };
}

/**
 * What the lifetime analysis (P07) flies from a hand-off: the spacecraft's
 * mass, area, C_D and C_R, as a copy of its own that the lifetime dialog's
 * form starts from and edits (src/ui/lifetime.ts). The kind and the engine
 * are not the propagator's. DOM-free, so the Build → Orbit hand-off (D06,
 * Phase 4 map §2.6 a) can be held to reach the dialog with the design's
 * figures (tests/d06-build-orbit-handoff.test.ts).
 */
export function lifetimeSpacecraft(h: Pick<OrbitHandoff, 'spacecraft'>): Spacecraft {
  const { mass, area, cd, cr } = h.spacecraft;
  return { mass, area, cd, cr };
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
  // R3.1: a design named but unreadable is refused, not shown as some other design
  if (parseDesignRef(origin.design) === 'invalid') return null;
  const h = raw as unknown as OrbitHandoff;
  const el = handoffElements(h);
  if (!(el.e < 1) || !(el.periapsisAlt > HANDOFF_MIN_PERIGEE)) return null;
  return JSON.parse(JSON.stringify(h)) as OrbitHandoff;
}
