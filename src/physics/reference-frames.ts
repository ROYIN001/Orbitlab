/**
 * The reference frames of flight dynamics at one instant of a flight (roadmap
 * E01), and the angles between them, in ISO 1151 or ГОСТ 20058-80 axes
 * (docs/PHYSICS.md §2c, §2k). Pure vector arithmetic on a recorded frame: the
 * 3-D view (src/render/frames.ts) draws what this returns.
 *
 * Every frame is a triad of unit vectors in ECI:
 *
 * - **body** (связанная): x the nose. ISO y to the right, z to the belly;
 *   ГОСТ y to the top, z to the right.
 * - **air-path** (скоростная): x_a along the velocity relative to the air
 *   (the Earth's rotation and the wind taken out). ISO z_a in the plane of
 *   symmetry towards the belly; ГОСТ y_a in it towards the top.
 * - **normal Earth** (нормальная земная), carried with the vehicle: ISO x_g
 *   north, y_g east, z_g down; ГОСТ y_g up and x_g horizontal along the launch
 *   azimuth, the firing direction a Russian launch frame measures yaw from,
 *   z_g to its right.
 * - **flight-path** (траекторная): x_k along the velocity relative to the
 *   ground. ISO z_k in the vertical plane, down; ГОСТ y_k in it, up.
 * - **orbital** RSW: R radial, S along the track, W the orbit normal
 *   (LVLH is the same triad as x = S, y = −W, z = −R).
 * - **ECI** and **ECEF** at the Earth's centre, ECEF turned by the Greenwich
 *   sidereal angle.
 *
 * The angles are those of the standard: α β between the body and the
 * air-path frames; pitch, yaw and roll between the body and the normal Earth
 * frame; the flight-path angle and the track angle between the flight-path
 * and the normal Earth frame. An angle that has no value (yaw and roll with
 * the nose vertical, α β without airspeed, the flight-path angles without
 * ground speed) is `null`.
 */
import type { Vec3 } from './vec3';
import { addScaled, cross, dot, norm, normalize, scale, sub, v3 } from './vec3';
import { enuFrame } from './orbital';
import { OMEGA_EARTH } from './constants';
import { quatRotate, type Quat } from './rigid/math';

export type AxisConvention = 'iso' | 'gost';

/** Three unit axes, in ECI. */
export interface Axes { x: Vec3; y: Vec3; z: Vec3 }

/**
 * An angle as drawn: `from` turned about `axis` (right hand) by `angle` lands
 * on the second direction. `value` is the angle as the standard reads it.
 */
export interface AngleArc { from: Vec3; axis: Vec3; angle: number; value: number }

export type FrameAngle = 'alpha' | 'beta' | 'pitch' | 'yaw' | 'roll' | 'path' | 'track';

export interface ReferenceFrames {
  body: Axes;
  /** null below `MIN_AIRSPEED` */
  airPath: Axes | null;
  normalEarth: Axes;
  /** null below `MIN_GROUND_SPEED` */
  flightPath: Axes | null;
  /** R, S, W as x, y, z; null without an orbital plane */
  orbital: Axes | null;
  eci: Axes;
  ecef: Axes;
  /** the angles, rad, in the convention's own sign and range; null where undefined */
  angles: Record<FrameAngle, number | null>;
  /** Greenwich sidereal angle, rad in [0, 2π) */
  sidereal: number;
  /** how each defined angle is drawn at the vehicle */
  arcs: Partial<Record<FrameAngle, AngleArc>>;
  /** the horizontal projections the pitch, yaw and track angles are measured on */
  helpers: { noseHorizontal: Vec3 | null; groundHorizontal: Vec3 | null; airInSymmetryPlane: Vec3 | null };
}

/** The state of the flight the frames are taken from (a `VisualFrame` has all of it). */
export interface FrameSource {
  r: Vec3;
  v: Vec3;
  /** body x in ECI; the attitude when there is no rigid body */
  dir: Vec3;
  /** Greenwich sidereal angle, rad */
  theta: number;
  rigid?: { attitudeQ: Quat; windECI: Vec3 };
}

/** Below these speeds the air-path and flight-path frames are not drawn. */
export const MIN_AIRSPEED = 5;
export const MIN_GROUND_SPEED = 1;
/** Within this of the vertical, yaw and roll have no value (the Euler angles' singularity). */
export const VERTICAL_LIMIT = 0.5 * Math.PI / 180;

const TWO_PI = 2 * Math.PI;
const wrap2Pi = (a: number): number => ((a % TWO_PI) + TWO_PI) % TWO_PI;
const wrapPi = (a: number): number => { const w = wrap2Pi(a + Math.PI) - Math.PI; return w === -Math.PI ? Math.PI : w; };
const clamp1 = (x: number): number => Math.max(-1, Math.min(1, x));
const neg = (a: Vec3): Vec3 => scale(a, -1);
/** `a` with its component along the unit vector `n` removed, normalized; null if nothing is left. */
function across(a: Vec3, n: Vec3, eps = 1e-9): Vec3 | null {
  const p = addScaled(a, n, -dot(a, n));
  const l = norm(p);
  return l > eps ? scale(p, 1 / l) : null;
}

/**
 * The body axes as nose, right and belly, whatever the notation. A rigid body
 * has them from its attitude: the simulator's y lies towards the belly and its
 * z to the left (docs/PHYSICS.md §2c). A point mass has only its axis, and is
 * held wings level on the launch azimuth's plane, as the 3-D stack is drawn.
 */
export function bodyAxes(src: FrameSource, azimuth: number): { nose: Vec3; right: Vec3; belly: Vec3 } {
  if (src.rigid) {
    const q = src.rigid.attitudeQ;
    return { nose: quatRotate(q, v3(1, 0, 0)), right: neg(quatRotate(q, v3(0, 0, 1))), belly: quatRotate(q, v3(0, 1, 0)) };
  }
  const nose = normalize(src.dir);
  const { east, north, up } = enuFrame(src.r);
  const heading = addScaled(scale(east, Math.sin(azimuth)), north, Math.cos(azimuth));
  const right = across(cross(heading, up), nose, 0.05) ?? across(cross(nose, up), nose, 0.05) ?? across(east, nose)!;
  return { nose, right, belly: cross(nose, right) };
}

/**
 * Every frame and angle at this instant.
 *
 * @param azimuth the launch azimuth over the ground, rad clockwise from north
 *   (`MissionPlan.azimuthRotating`): the point mass's roll reference and ГОСТ's x_g
 */
export function referenceFrames(src: FrameSource, azimuth: number, convention: AxisConvention): ReferenceFrames {
  const iso = convention === 'iso';
  const { east, north, up } = enuFrame(src.r);
  const down = neg(up);
  const { nose, right, belly } = bodyAxes(src, azimuth);
  const top = neg(belly);
  const body: Axes = iso ? { x: nose, y: right, z: belly } : { x: nose, y: top, z: right };

  // normal Earth
  const heading = addScaled(scale(east, Math.sin(azimuth)), north, Math.cos(azimuth));
  const normalEarth: Axes = iso ? { x: north, y: east, z: down } : { x: heading, y: up, z: cross(heading, up) };
  const bearing = (a: Vec3): number => wrap2Pi(Math.atan2(dot(a, east), dot(a, north)));
  // ISO reads a heading clockwise from north over [0, 2π); ГОСТ from x_g, positive to the left
  const azimuthAngle = (a: Vec3): number => (iso ? bearing(a) : wrapPi(azimuth - bearing(a)));
  const azimuthArc = (value: number): AngleArc => (iso
    ? { from: north, axis: down, angle: value, value }
    : { from: heading, axis: up, angle: value, value });

  const angles: Record<FrameAngle, number | null> = { alpha: null, beta: null, pitch: null, yaw: null, roll: null, path: null, track: null };
  const arcs: Partial<Record<FrameAngle, AngleArc>> = {};

  // pitch, yaw, roll: body against normal Earth
  const noseUp = dot(nose, up);
  const pitch = Math.atan2(noseUp, norm(addScaled(nose, up, -noseUp)));
  angles.pitch = pitch;
  const noseHorizontal = across(nose, up);
  const vertical = Math.PI / 2 - Math.abs(pitch) < VERTICAL_LIMIT || !noseHorizontal;
  // with the nose vertical the pitch is still drawn, from the side the belly faces
  const pitchFrom = !vertical ? noseHorizontal! : (across(pitch > 0 ? belly : top, up) ?? heading);
  arcs.pitch = { from: pitchFrom, axis: normalize(cross(pitchFrom, up)), angle: pitch, value: pitch };
  if (!vertical) {
    const yaw = azimuthAngle(noseHorizontal!);
    angles.yaw = yaw;
    arcs.yaw = azimuthArc(yaw);
    // wings level: the right axis horizontal, the belly below
    const level = normalize(cross(nose, up));
    const levelDown = cross(nose, level);
    const roll = Math.atan2(dot(right, levelDown), dot(right, level));
    angles.roll = roll;
    // drawn on each standard's y: ISO's right axis, ГОСТ's top axis
    arcs.roll = { from: iso ? level : neg(levelDown), axis: nose, angle: roll, value: roll };
  }

  // α, β: body against air-path
  const omega = v3(0, 0, OMEGA_EARTH);
  let air = sub(src.v, cross(omega, src.r));
  if (src.rigid) air = sub(air, src.rigid.windECI);
  const airspeed = norm(air);
  let airPath: Axes | null = null;
  let airInSymmetryPlane: Vec3 | null = null;
  if (airspeed >= MIN_AIRSPEED) {
    const xa = scale(air, 1 / airspeed);
    const u = dot(xa, nose), w = dot(xa, belly);
    const alpha = Math.atan2(w, u);
    const beta = Math.asin(clamp1(dot(xa, right)));
    angles.alpha = alpha; angles.beta = beta;
    // ISO z_a: in the plane of symmetry, perpendicular to x_a, towards the belly
    const za = addScaled(scale(nose, -Math.sin(alpha)), belly, Math.cos(alpha));
    const ya = cross(za, xa);
    airPath = iso ? { x: xa, y: ya, z: za } : { x: xa, y: neg(za), z: ya };
    airInSymmetryPlane = addScaled(scale(nose, Math.cos(alpha)), belly, Math.sin(alpha));
    arcs.alpha = { from: nose, axis: right, angle: -alpha, value: alpha };
    // β turns the plane-of-symmetry projection out towards the right
    arcs.beta = { from: airInSymmetryPlane, axis: normalize(cross(airInSymmetryPlane, right)), angle: beta, value: beta };
  }

  // flight-path angle and track: flight-path against normal Earth
  const ground = sub(src.v, cross(omega, src.r));
  const groundSpeed = norm(ground);
  let flightPath: Axes | null = null;
  let groundHorizontal: Vec3 | null = null;
  if (groundSpeed >= MIN_GROUND_SPEED) {
    const xk = scale(ground, 1 / groundSpeed);
    const groundUp = dot(xk, up);
    const path = Math.atan2(groundUp, norm(addScaled(xk, up, -groundUp)));
    angles.path = path;
    groundHorizontal = across(xk, up);
    // straight up or down, the vertical plane is the one the pitch is drawn in
    const upK = across(up, xk, 1e-6) ?? across(neg(pitchFrom), xk) ?? top;
    flightPath = iso ? { x: xk, y: cross(neg(upK), xk), z: neg(upK) } : { x: xk, y: upK, z: cross(xk, upK) };
    const steep = Math.PI / 2 - Math.abs(path) < VERTICAL_LIMIT || !groundHorizontal;
    const pathFrom = steep ? pitchFrom : groundHorizontal!;
    arcs.path = { from: pathFrom, axis: normalize(cross(pathFrom, up)), angle: path, value: path };
    if (!steep) {
      const track = azimuthAngle(groundHorizontal!);
      angles.track = track;
      arcs.track = azimuthArc(track);
    }
  }

  // orbital RSW
  const h = cross(src.r, src.v);
  const orbital: Axes | null = norm(h) > 1 ? (() => {
    const R = normalize(src.r), W = normalize(h);
    return { x: R, y: cross(W, R), z: W };
  })() : null;

  const sidereal = wrap2Pi(src.theta);
  const eci: Axes = { x: v3(1, 0, 0), y: v3(0, 1, 0), z: v3(0, 0, 1) };
  const ecef: Axes = { x: v3(Math.cos(sidereal), Math.sin(sidereal), 0), y: v3(-Math.sin(sidereal), Math.cos(sidereal), 0), z: v3(0, 0, 1) };

  return { body, airPath, normalEarth, flightPath, orbital, eci, ecef, angles, sidereal, arcs,
    helpers: { noseHorizontal: vertical ? null : noseHorizontal, groundHorizontal: angles.track === null ? null : groundHorizontal, airInSymmetryPlane } };
}

/** `from` turned about the unit `axis` by `angle` (Rodrigues). */
export function turn(from: Vec3, axis: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  const k = cross(axis, from);
  return addScaled(addScaled(scale(from, c), k, s), axis, dot(axis, from) * (1 - c));
}
