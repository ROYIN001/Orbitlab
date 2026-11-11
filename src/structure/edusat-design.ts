/**
 * An EduSat-3U design (src/structure/edusat.ts): which battery and which
 * mission payload, and everything that follows from that choice — the parts
 * list, the mass, the power balance, how it differs from the reference — all
 * from one function of the choice, so the picture, the list and the figures
 * on screen are always the same design's.
 *
 * Also the design as plain figures for the rest of Orbitlab
 * (`satelliteRecord`): the app's side turns them into its own satellite
 * record and hands that to Orbit or Launch (src/structure/handoff.ts,
 * src/structure-host/). What the destinations carry is the mass, size, drag
 * and orbit; the battery and the power balance stay in the Structure
 * section, which says so.
 *
 * DOM-free. The app's power model comes in as `PowerEnv`, not by import.
 */
import {
  BATTERIES, BATTERY_OPTIONS, CDS, CELL_AREA, EDU_SUBSYSTEMS, EDU_UNITS, ENVELOPE, FIXED_PARTS, MASS_LIMIT_KG, PANEL, PANELS, PAYLOADS, PAYLOAD_OPTIONS,
  PIECE_KIND, RAIL, STACK_SLOTS, STACK_WIDTH, pieceId, toCds,
  type BatteryOption, type EduLoad, type EduPart, type EduPiece, type EduUnit, type PayloadOption, type StackBay,
} from './edusat';
import { buildTree, type ModelNode, type ModelTree } from './model';
import type { PowerEnv } from './env';
import type { SatelliteRecord } from './handoff';
import { eduScenario, simulatePower, type PowerResult, type PowerScenario } from './power-balance';

export interface EduDesign {
  battery: BatteryOption;
  payload: PayloadOption;
}

/** The reference design: one-cell battery, day camera. It is never changed; "my experiment" is a copy. */
export const REFERENCE_DESIGN: Readonly<EduDesign> = Object.freeze({ battery: 'battery-1cell', payload: 'camera-day' });

export const isEduDesign = (v: unknown): v is EduDesign =>
  !!v && typeof v === 'object'
  && BATTERY_OPTIONS.includes((v as EduDesign).battery) && PAYLOAD_OPTIONS.includes((v as EduDesign).payload);

/** A design's identity: equal keys, equal designs, equal figures. */
export const designKey = (d: EduDesign): string => `edusat:${d.battery}:${d.payload}`;

export const sameDesign = (a: EduDesign, b: EduDesign): boolean => designKey(a) === designKey(b);

/** The design's parts, one per unit, in the units' order: the fixed parts and the two chosen ones. */
export function partsOf(d: EduDesign): EduPart[] {
  const chosen = [...FIXED_PARTS, BATTERIES[d.battery], PAYLOADS[d.payload]];
  return EDU_UNITS.map((u) => {
    const p = chosen.find((c) => c.unit === u);
    if (!p) throw new Error(`EduSat: no part for unit ${u}`);
    return p;
  });
}

/** The part a unit holds in this design. */
export const partFor = (d: EduDesign, unit: string): EduPart | undefined => partsOf(d).find((p) => p.unit === unit);

/** One thing of the picture: a piece of a part, with its place in the picture's numbering. */
export interface EduItem { index: number; id: string; unit: EduUnit; part: EduPart; piece: EduPiece }

/** The design's pieces, numbered as the picture numbers them: unit by unit in the units' order, each part's pieces in its own. */
export function itemsOf(d: EduDesign): EduItem[] {
  const out: EduItem[] = [];
  for (const part of partsOf(d)) for (const piece of part.pieces) out.push({ index: out.length, id: pieceId(part, piece), unit: part.unit, part, piece });
  return out;
}

/** A subsystem's node id in the tree. */
export const subsystemNode = (id: string): string => `sys:${id}`;

/**
 * The design's tree for the three depths: the five subsystems, under each
 * its units (the thirteen the assembly installs, by their own names, which
 * no choice of battery or payload changes), under each unit its pieces.
 */
export function eduTree(items: readonly EduItem[]): ModelTree {
  const nodes: ModelNode[] = [];
  for (const sys of EDU_SUBSYSTEMS) {
    nodes.push({ id: subsystemNode(sys.id), parent: null, tier: 1, items: items.filter((it) => sys.units.includes(it.unit)).map((it) => it.index) });
    for (const unit of sys.units) {
      const mine = items.filter((it) => it.unit === unit);
      if (!mine.length) continue;
      nodes.push({ id: unit, parent: subsystemNode(sys.id), tier: 2, items: mine.map((it) => it.index), unit, category: mine[0].part.category, certainty: mine[0].part.massCertainty });
      for (const it of mine) nodes.push({ id: it.id, parent: unit, tier: 3, items: [it.index], ...PIECE_KIND[it.piece.kind] });
    }
  }
  return buildTree(nodes, items.length);
}

/**
 * The centre of gravity from the parts list, m from the geometric centre:
 * each part's mass at the centre of its box (an estimate, as the masses
 * are). `picture` is in the picture's frame, `cds` in the specification's.
 */
export function centreOfGravity(parts: readonly EduPart[]): { picture: [number, number, number]; cds: [number, number, number] } {
  let m = 0;
  const sum = [0, 0, 0];
  for (const p of parts) {
    m += p.massKg;
    for (let a = 0; a < 3; a++) sum[a] += p.massKg * p.box.center[a];
  }
  const picture: [number, number, number] = [sum[0] / m + 0, sum[1] / m + 0, sum[2] / m + 0];
  return { picture, cds: toCds(picture) };
}

/** How a part sits in the bay it is made for: its height against the bay's, and its width against the stack's, m. */
export interface BayFit { bay: StackBay; height: number; limit: number; width: number; widthLimit: number; fits: boolean }

export function bayFit(part: EduPart): BayFit | null {
  if (!Object.hasOwn(STACK_SLOTS, part.unit)) return null;
  const bay = part.unit as StackBay;
  const height = part.box.size[1], width = Math.max(part.box.size[0], part.box.size[2]);
  const limit = STACK_SLOTS[bay].height;
  return { bay, height, limit, width, widthLimit: STACK_WIDTH, fits: height <= limit + 1e-9 && width <= STACK_WIDTH + 1e-9 };
}

/**
 * One check of the design against the CubeSat Design Specification
 * (`CDS`, src/structure/edusat.ts): what was measured on the parts list, the
 * bound, and where the specification says it. `value` and `limit` are in
 * `unit`. Passing these is not passing the specification: it asks much this
 * model does not hold (materials, venting, inhibits, testing).
 */
export interface SpecCheck {
  id: 'envelope' | 'mass' | 'cgX' | 'cgY' | 'cgZ' | 'protrusion' | 'rails' | 'energy';
  value: number;
  limit: number;
  /** the bound is a least value (rails), not a greatest */
  atLeast?: boolean;
  unit: 'mm' | 'kg' | 'Wh';
  /** where the specification says it */
  ref: string;
  sourceId: 'cds14' | 'cds13';
  ok: boolean;
}

export function specChecks(parts: readonly EduPart[], massKg: number, batteryWh: number): SpecCheck[] {
  // the largest reach of any part from the centre, against the envelope's half-size on its axis: the worst axis, mm over (≤ 0: inside)
  let over = -Infinity;
  for (const p of parts) for (let a = 0; a < 3; a++) {
    const half = [ENVELOPE.x, ENVELOPE.y, ENVELOPE.z][a] / 2;
    over = Math.max(over, Math.abs(p.box.center[a]) + p.box.size[a] / 2 - half);
  }
  const cg = centreOfGravity(parts).cds;
  // a side panel's cells stand proud of its board, whose outer face is in the plane of the rails
  const proud = Math.max(...parts.filter((p) => PANELS.includes(p.unit)).map((p) => {
    const a = p.box.size[0] < p.box.size[2] ? 0 : 2;
    return Math.abs(p.box.center[a]) + p.box.size[a] / 2 + PANEL.cellThick - ENVELOPE.x / 2;
  }));
  const mm = (m: number): number => m * 1000;
  const within = (id: SpecCheck['id'], value: number, limit: number, unit: SpecCheck['unit'], ref: string, sourceId: SpecCheck['sourceId'] = 'cds14'): SpecCheck =>
    ({ id, value, limit, unit, ref, sourceId, ok: value <= limit + 1e-9 });
  return [
    within('envelope', mm(over), 0, 'mm', 'CDS-14-004'),
    within('mass', massKg, CDS.massKg, 'kg', '§2.2.10, Table 1'),
    within('cgX', Math.abs(mm(cg[0])), mm(CDS.cg.x), 'mm', '§2.2.11, Table 2'),
    within('cgY', Math.abs(mm(cg[1])), mm(CDS.cg.y), 'mm', '§2.2.11, Table 2'),
    within('cgZ', Math.abs(mm(cg[2])), mm(CDS.cg.z), 'mm', '§2.2.11, Table 2'),
    within('protrusion', mm(proud), mm(CDS.protrusion), 'mm', '§2.2.3'),
    { id: 'rails', value: mm(RAIL), limit: mm(CDS.railWidth), atLeast: true, unit: 'mm', ref: 'CDS-14-004', sourceId: 'cds14', ok: RAIL >= CDS.railWidth - 1e-12 },
    within('energy', batteryWh, CDS.storedEnergyWh, 'Wh', '§3.1.6', 'cds13'),
  ];
}

/** kg, summed from the parts list: each part counted once (one part per unit). */
export function massOf(d: EduDesign): number {
  return partsOf(d).reduce((sum, p) => sum + p.massKg, 0);
}

/** The solar cells' total area, m²: every panel's cells × one cell's area. */
export function cellAreaOf(d: EduDesign): number {
  return partsOf(d).reduce((sum, p) => sum + (p.solarCells ?? 0) * CELL_AREA, 0);
}

export function batteryWhOf(d: EduDesign): number {
  return BATTERIES[d.battery].batteryWh!;
}

export function loadsOf(d: EduDesign): EduLoad[] {
  return partsOf(d).flatMap((p) => p.loads);
}

/** SMAD's steady-state check, as Orbitlab's satellite builder does it (src/orbit/power.ts), on the scenario's averages. */
export interface SteadyState {
  /** the array power one orbit needs, W, and what the panels give, W */
  arrayNeeded: number;
  arrayGiven: number;
  /** the battery the shadow needs at the allowed depth, Wh, and the one fitted */
  batteryNeeded: number;
  batteryFitted: number;
}

export interface EduFigures {
  /** the design these figures belong to (`designKey`) */
  key: string;
  design: EduDesign;
  /** the scenario the power figures were worked out in */
  scenario: PowerScenario;
  parts: EduPart[];
  /** the picture's things, one per piece */
  items: EduItem[];
  massKg: number;
  massLimitKg: number;
  /** centre of gravity, m from the geometric centre, in the specification's frame (X, Y across; Z along) */
  cg: [number, number, number];
  /** the design against the specification's bounds this model can be held to */
  checks: SpecCheck[];
  cellArea: number;
  batteryWh: number;
  power: PowerResult;
  steady: SteadyState;
  /** the loads were all powered through the scenario */
  powered: boolean;
}

/** Everything the section shows for a design, computed from the design alone on the app's power model (`env`). */
export function eduFigures(d: EduDesign, env: PowerEnv, scenario: PowerScenario = eduScenario(env)): EduFigures {
  const parts = partsOf(d);
  const cellArea = cellAreaOf(d);
  const batteryWh = batteryWhOf(d);
  const power = simulatePower(scenario, { cellArea, batteryWh, loads: loadsOf(d) });
  const steady: SteadyState = {
    arrayNeeded: env.arrayPowerRequired({ dayLoad: power.dayLoad, eclipseLoad: power.eclipseLoad, Td: power.daylight, Te: power.eclipse, Xd: scenario.Xd, Xe: scenario.Xe }),
    arrayGiven: power.arrayPower,
    batteryNeeded: env.batteryCapacity({ eclipseLoad: power.eclipseLoad, Te: power.eclipse, dod: scenario.dod, eff: scenario.batteryEff }) / 3600,
    batteryFitted: batteryWh,
  };
  const massKg = massOf(d);
  return {
    key: designKey(d), design: { ...d }, scenario, parts, items: itemsOf(d), massKg, massLimitKg: MASS_LIMIT_KG,
    cg: centreOfGravity(parts).cds, checks: specChecks(parts, massKg, batteryWh), cellArea, batteryWh, power, steady,
    powered: power.shortfalls.length === 0,
  };
}

/** What the design changes from the reference: the units whose part differs. */
export interface DesignChange { unit: 'battery' | 'payload'; from: string; to: string; massDeltaKg: number }

export function changesFrom(d: EduDesign, ref: EduDesign = REFERENCE_DESIGN): DesignChange[] {
  const out: DesignChange[] = [];
  if (d.battery !== ref.battery) out.push({ unit: 'battery', from: ref.battery, to: d.battery, massDeltaKg: BATTERIES[d.battery].massKg - BATTERIES[ref.battery].massKg });
  if (d.payload !== ref.payload) out.push({ unit: 'payload', from: ref.payload, to: d.payload, massDeltaKg: PAYLOADS[d.payload].massKg - PAYLOADS[ref.payload].massKg });
  return out;
}

// ─── the design as the app's satellite ──────────────────────────────────────

/** The orbit the design is handed on in: 500 km circular, sun-synchronous, its node at noon, so its shadows are close to the β = 0 of the power scenario. */
export const EDU_ORBIT = { altitude: 500e3, ltan: 12 } as const;

/** Orbit-average power of a set of loads over the scenario's orbit, W. */
function averageWatts(loads: readonly EduLoad[], power: PowerResult): number {
  let joules = 0;
  for (const l of loads) {
    const span = l.window === 'always' ? power.period : l.minutes !== undefined ? l.minutes * 60 : l.window === 'sunlit' ? power.daylight : power.eclipse;
    joules += l.watts * span;
  }
  return joules / power.period;
}

/**
 * The design's figures as the app is given them (`SatelliteRecord`): the
 * parts list's mass, to the gram; the 3U body; the cell area; the battery and
 * its allowed depth; the loads as orbit averages; the 500 km noon orbit; one
 * year. The app's side makes its own satellite record of them
 * (src/structure-host/satellite.ts).
 */
export function satelliteRecord(f: EduFigures, id: string, name: string): SatelliteRecord {
  const round3 = (x: number) => Math.round(x * 1000) / 1000;
  const payloadLoads = PAYLOADS[f.design.payload].loads;
  const busLoads = f.parts.filter((p) => p.unit !== 'payload').flatMap((p) => p.loads);
  return {
    id, name,
    massKg: round3(f.massKg),
    size: { width: ENVELOPE.x, height: ENVELOPE.z, depth: ENVELOPE.y },
    cellArea: Math.round(f.cellArea * 1e6) / 1e6,
    batteryWh: round3(f.batteryWh),
    dod: f.scenario.dod,
    payloadW: round3(averageWatts(payloadLoads, f.power)),
    busW: round3(averageWatts(busLoads, f.power)),
    orbit: { altitude: EDU_ORBIT.altitude, ltan: EDU_ORBIT.ltan },
    lifeYears: 1,
  };
}
