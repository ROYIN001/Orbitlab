/**
 * An EduSat-3U design (src/structure/edusat.ts): which battery and which
 * mission payload, and everything that follows from that choice — the parts
 * list, the mass, the power balance, how it differs from the reference — all
 * from one function of the choice, so the picture, the list and the figures
 * on screen are always the same design's.
 *
 * Also the design as the rest of Orbitlab reads a satellite
 * (`eduSatelliteDesign`): a `SatelliteDesign`, which the Orbit section's
 * hand-off (`designHandoff`) and the Launch section's mission
 * (`designMissionDocument`) take as they take one from the satellite
 * builder. What they carry is the mass, size, drag and orbit; the battery and
 * the power balance stay in the Structure section, which says so.
 *
 * DOM-free.
 */
import { arrayPowerRequired, batteryCapacity } from '../orbit/power';
import { boxInertia } from '../data/satellite-templates';
import { designFromTemplate, ssoInclinationDeg } from '../design/satellite-model';
import type { SatelliteDesign } from '../design/satellite-spec';
import {
  BATTERIES, BATTERY_OPTIONS, CELL_AREA, EDU_UNITS, ENVELOPE, FIXED_PARTS, MASS_LIMIT_KG, PAYLOADS, PAYLOAD_OPTIONS,
  type BatteryOption, type EduLoad, type EduPart, type PayloadOption,
} from './edusat';
import { EDU_SCENARIO, simulatePower, type PowerResult, type PowerScenario } from './power-balance';

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
  parts: EduPart[];
  massKg: number;
  massLimitKg: number;
  cellArea: number;
  batteryWh: number;
  power: PowerResult;
  steady: SteadyState;
  /** the loads were all powered through the scenario */
  powered: boolean;
}

/** Everything the section shows for a design, computed from the design alone. */
export function eduFigures(d: EduDesign, scenario: PowerScenario = EDU_SCENARIO): EduFigures {
  const parts = partsOf(d);
  const cellArea = cellAreaOf(d);
  const batteryWh = batteryWhOf(d);
  const power = simulatePower(scenario, { cellArea, batteryWh, loads: loadsOf(d) });
  const steady: SteadyState = {
    arrayNeeded: arrayPowerRequired({ dayLoad: power.dayLoad, eclipseLoad: power.eclipseLoad, Td: power.daylight, Te: power.eclipse, Xd: scenario.Xd, Xe: scenario.Xe }),
    arrayGiven: power.arrayPower,
    batteryNeeded: batteryCapacity({ eclipseLoad: power.eclipseLoad, Te: power.eclipse, dod: scenario.dod, eff: scenario.batteryEff }) / 3600,
    batteryFitted: batteryWh,
  };
  return {
    key: designKey(d), design: { ...d }, parts, massKg: massOf(d), massLimitKg: MASS_LIMIT_KG, cellArea, batteryWh, power, steady,
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

// ─── the design as Orbitlab's satellite ─────────────────────────────────────

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
 * The design as a `SatelliteDesign`, as the satellite builder would hold it,
 * from NAPA-2's 6U science template (Orbitlab's one CubeSat template) with
 * this design's own figures: the parts list's mass as the dry mass (no
 * propellant: no engine), the 3U body, the cell area on a spinner's mount,
 * the battery, the loads as orbit averages, the 500 km noon orbit, and no
 * camera figures (the pilot's cameras have none). Its comms and attitude
 * figures stay the template's and are not used by the hand-offs.
 */
export function eduSatelliteDesign(d: EduDesign, id: string, name: string): SatelliteDesign {
  const f = eduFigures(d);
  const base = designFromTemplate('napa2', id, name);
  const size = { width: ENVELOPE.x, height: ENVELOPE.z, depth: ENVELOPE.y };
  const mass = Math.round(f.massKg * 1000) / 1000;
  const payloadLoads = PAYLOADS[d.payload].loads;
  const busLoads = f.parts.filter((p) => p.unit !== 'payload').flatMap((p) => p.loads);
  const round3 = (x: number) => Math.round(x * 1000) / 1000;
  return {
    ...base,
    kind: 'science',
    orbit: {
      perigee: EDU_ORBIT.altitude, apogee: EDU_ORBIT.altitude,
      inclination: ssoInclinationDeg(EDU_ORBIT.altitude, EDU_ORBIT.altitude) ?? base.orbit.inclination, sso: true, ltan: EDU_ORBIT.ltan,
    },
    lifeYears: 1,
    bus: { ...base.bus, dryMass: mass, size },
    power: {
      ...base.power,
      payloadW: round3(averageWatts(payloadLoads, f.power)), busW: round3(averageWatts(busLoads, f.power)),
      arrayArea: round3(f.cellArea * 1000) / 1000, mount: 'spinner', batteryWh: round3(f.batteryWh), dod: EDU_SCENARIO.dod,
    },
    propulsion: null,
    adcs: { ...base.adcs, inertia: boxInertia(mass, size) },
    payload: null,
    sources: ['Orbitlab Structure section, EduSat-3U: a concept for learning (src/structure/edusat.ts)'],
  };
}
