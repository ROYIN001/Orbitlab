/**
 * The Engineer level's wind tunnel as data (roadmap D04, "a wind tunnel"):
 * which configurations a vehicle can be put in, the grid it is swept over,
 * and the map and curves the screen draws from the sweep.
 *
 * The sweep itself is src/design/tunnel.ts, the six-DOF flight's own
 * aerodynamics read through the flight's own code; this module chooses its
 * inputs and arranges its output, so it cannot make the tunnel say anything
 * the flight does not fly with. What that module says of the numbers holds
 * here too, and the screen says it: THESE ARE THE MODEL'S ESTIMATES, NOT
 * MEASURED DATA — slender-body theory with viscous crossflow built from the
 * vehicle's layout (src/physics/rigid/aero-tables.ts), with one generic
 * launcher drag curve for every vehicle, so fins and nose shape change
 * nothing.
 *
 * THE GRID. The map's Mach numbers are the tables' own breakpoints
 * (`AERO_MACH`, 0 to 25): between them the flight interpolates linearly, so
 * the map shows every value the tables hold and nothing invented between
 * them. Its angles are 0–10° in 1° steps, where a launcher flies (the
 * guidance holds the angle near zero through the dense air), and a wide view
 * 0–90° in 5° steps, where a tumbling stage or an abort goes; the tables are
 * built for 15° (`validAngleRad`), and a point beyond it is marked, as the
 * flight flags it (`withinEnvelope`). The curves against Mach run 0–10 every
 * 0.05 with every breakpoint on the grid, so their corners are the table's.
 *
 * THE QUANTITIES. C_N, C_A and C_m as tunnel.ts defines them, and the centre
 * of pressure measured from the nose tip (the way a model rocketeer's
 * Barrowman figure is), where tunnel.ts gives body x from the bottom of the
 * full stack. The static margin is the flight's own, in calibres of the
 * reference diameter, taken at zero angle, where the wrench places the
 * centre of pressure at the table's small-angle one.
 *
 * DOM-free, SI (m, m²); angles in degrees as tunnel.ts takes them.
 */
import type { VehicleSpec } from '../types';
import { AERO_MACH } from '../physics/rigid/aero-tables';
import { dragCoefficient } from '../physics/aero';
import { tunnelSweep, type TunnelConfig, type TunnelPoint, type TunnelResult } from './tunnel';

export type TunnelQuantity = 'cN' | 'cA' | 'cm' | 'xcp';
export const TUNNEL_QUANTITIES: readonly TunnelQuantity[] = ['cN', 'cA', 'cm', 'xcp'];

export type TunnelRange = 'small' | 'wide';
export const TUNNEL_RANGES: readonly TunnelRange[] = ['small', 'wide'];
const steps = (to: number, by: number): number[] => Array.from({ length: Math.round(to / by) + 1 }, (_, i) => i * by);
export const TUNNEL_ALPHAS: Readonly<Record<TunnelRange, readonly number[]>> = { small: steps(10, 1), wide: steps(90, 5) };

/** The map's Mach numbers: the tables' breakpoints. */
export const TUNNEL_MAP_MACH: readonly number[] = AERO_MACH;

/** The highest Mach number the curves are drawn to: above it a launcher is out of the air that matters. */
export const TUNNEL_LINE_MAX_MACH = 10;
/** The curves' Mach numbers: 0 to 10 every 0.05, with every breakpoint in that range on the grid. */
export const TUNNEL_LINE_MACH: readonly number[] = [...new Set([
  ...steps(TUNNEL_LINE_MAX_MACH, 0.05).map((m) => Math.round(m * 100) / 100),
  ...AERO_MACH.filter((m) => m <= TUNNEL_LINE_MAX_MACH),
])].sort((a, b) => a - b);

/** What a vehicle can be put in the tunnel as. */
export interface TunnelBench {
  /** the first stage's strap-on groups */
  groups: { count: number; id: string; name: string }[];
  /** stages the tunnel can hold, from the bottom: stages gone runs 0 to this less 1 */
  launcherStages: number;
  hasFairing: boolean;
}

export function tunnelBench(spec: VehicleSpec): TunnelBench {
  return {
    groups: (spec.stages[0]?.boosters ?? []).map((b) => ({ count: b.count, id: b.id, name: b.name })),
    launcherStages: spec.stages.filter((st) => !st.isSpacecraft).length,
    hasFairing: !!spec.fairing,
  };
}

/** What the student chose, before it is made a `TunnelConfig`. */
export interface TunnelChoice {
  /** per strap-on group: still on */
  boostersOn: boolean[];
  stagesGone: number;
  fairing: boolean;
  /** propellant left in the lowest stage and its strap-ons, 0–1 */
  propellantFraction: number;
  payloadKg: number;
}

/** The whole vehicle on the pad: everything on, tanks full. */
export function defaultTunnelChoice(spec: VehicleSpec, payloadKg: number): TunnelChoice {
  const bench = tunnelBench(spec);
  return { boostersOn: bench.groups.map(() => true), stagesGone: 0, fairing: bench.hasFairing, propellantFraction: 1, payloadKg };
}

/**
 * The choice as tunnel.ts takes it, held to what the vehicle has: stages
 * gone within its launcher stages, the fairing only if it has one. Strap-ons
 * leave with the first stage (`VehicleModel.separateStage`), so once it is
 * gone their choice no longer matters.
 */
export function tunnelConfig(spec: VehicleSpec, c: TunnelChoice): TunnelConfig {
  const bench = tunnelBench(spec);
  const stagesGone = Math.max(0, Math.min(bench.launcherStages - 1, Math.round(c.stagesGone)));
  return {
    boostersOff: bench.groups.map((_, g) => !(c.boostersOn[g] ?? true)),
    stagesGone,
    fairing: bench.hasFairing && c.fairing,
    propellantFraction: Math.max(0, Math.min(1, c.propellantFraction)),
  };
}

/** A quantity of one point, as the screen shows it: x_cp in metres from the nose tip. */
export function pointValue(p: TunnelPoint, r: TunnelResult, q: TunnelQuantity): number {
  switch (q) {
    case 'cN': return p.cN;
    case 'cA': return p.cA;
    case 'cm': return p.cm;
    case 'xcp': return r.noseX - p.xcpM;
  }
}

/** The centre of mass in metres from the nose tip. */
export const cgFromNose = (r: TunnelResult): number => r.noseX - r.cgX;

export type ColourScale = 'sequential' | 'diverging';

/** A Mach × angle map of one quantity, rows by angle and columns by Mach number. */
export interface TunnelMap {
  quantity: TunnelQuantity;
  machs: readonly number[];
  alphas: readonly number[];
  /** values[a][m] */
  values: number[][];
  /** within[a][m]: the flight's own envelope flag */
  within: boolean[][];
  min: number;
  max: number;
  /** a signed quantity (C_m) is drawn on a diverging scale about zero, the others on a sequential one */
  scale: ColourScale;
  /** the colour scale's domain: [min, max], or symmetric about zero for a diverging one */
  lo: number;
  hi: number;
}

/**
 * Arrange a sweep made over `machs` × `alphas` (Mach-major, as tunnelSweep
 * returns it) into a map of `q`. Throws when the sweep is not that grid.
 */
export function tunnelMap(r: TunnelResult, q: TunnelQuantity, machs: readonly number[], alphas: readonly number[]): TunnelMap {
  if (r.points.length !== machs.length * alphas.length) throw new RangeError(`the sweep has ${r.points.length} points, not ${machs.length} × ${alphas.length}`);
  const values = alphas.map(() => new Array<number>(machs.length).fill(0));
  const within = alphas.map(() => new Array<boolean>(machs.length).fill(true));
  let min = Infinity, max = -Infinity;
  machs.forEach((mach, mi) => alphas.forEach((alpha, ai) => {
    const p = r.points[mi * alphas.length + ai];
    if (p.mach !== mach || p.alphaDeg !== alpha) throw new RangeError(`point ${mi * alphas.length + ai} is Mach ${p.mach}, ${p.alphaDeg}°, not Mach ${mach}, ${alpha}°`);
    const v = pointValue(p, r, q);
    values[ai][mi] = v;
    within[ai][mi] = p.withinEnvelope;
    min = Math.min(min, v);
    max = Math.max(max, v);
  }));
  const scale: ColourScale = q === 'cm' ? 'diverging' : 'sequential';
  const m = Math.max(Math.abs(min), Math.abs(max));
  return { quantity: q, machs, alphas, values, within, min, max, scale, lo: scale === 'diverging' ? -m : min, hi: scale === 'diverging' ? m : max };
}

/** Sweep `spec` over the map's grid for a range of angles. */
export function sweepMap(spec: VehicleSpec, c: TunnelChoice, range: TunnelRange): TunnelResult {
  return tunnelSweep(spec, c.payloadKg, tunnelConfig(spec, c), TUNNEL_MAP_MACH, TUNNEL_ALPHAS[range]);
}

/** The curves against Mach number at zero angle. */
export interface TunnelLines {
  mach: number[];
  /** the tunnel's drag coefficient along the airflow at α = 0 */
  cD: number[];
  /** the point-mass flight's (`dragCoefficient`), for the same Mach numbers */
  cdPointMass: number[];
  /** static margin, calibres, at small angles: positive is stable */
  marginCal: number[];
  referenceDiameter: number;
}

export function tunnelLines(spec: VehicleSpec, c: TunnelChoice, machs: readonly number[] = TUNNEL_LINE_MACH): TunnelLines {
  const r = tunnelSweep(spec, c.payloadKg, tunnelConfig(spec, c), machs, [0]);
  return {
    mach: [...machs],
    cD: r.points.map((p) => p.cD),
    cdPointMass: machs.map((m) => dragCoefficient(m)),
    marginCal: r.points.map((p) => p.staticMarginCal),
    referenceDiameter: r.referenceDiameter,
  };
}

// ─── colour ────────────────────────────────────────────────────────────────

/**
 * The map's colours, for a dark panel. Sequential: one hue, blue, from dark
 * (near the panel, the smallest value) to light (the largest), so a larger
 * value always reads as brighter. Diverging: blue for negative, red for
 * positive, through a neutral grey at zero, both arms the same lightness at
 * the same distance from it. The ramps are the dataviz reference palette's
 * blue steps and a red arm matched to them.
 */
const SEQUENTIAL = ['#184f95', '#2a78d6', '#5598e7', '#86b6ef', '#cde2fb'];
const DIVERGING = ['#9ec5f4', '#3987e5', '#1c4f8f', '#383835', '#8f2f2f', '#d95050', '#f4a3a3'];

const hex = (c: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number];
const toHex = (rgb: number[]): string => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** The colour at `u` ∈ [0, 1] along a scale (0.5 is a diverging scale's zero). */
export function rampColour(u: number, scale: ColourScale): string {
  const stops = scale === 'diverging' ? DIVERGING : SEQUENTIAL;
  const x = Math.min(1, Math.max(0, Number.isFinite(u) ? u : 0)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = hex(stops[i]), b = hex(stops[i + 1]);
  return toHex(a.map((v, k) => v + (b[k] - v) * f));
}

/** Where a value falls on a map's colour scale, 0–1 (0.5 for a flat map). */
export function mapPosition(map: Pick<TunnelMap, 'lo' | 'hi'>, v: number): number {
  const span = map.hi - map.lo;
  return span > 0 ? (v - map.lo) / span : 0.5;
}

export const mapColour = (map: TunnelMap, v: number): string => rampColour(mapPosition(map, v), map.scale);
