/**
 * EduSat-3U: a CubeSat-like satellite made for learning in Orbitlab's
 * Structure section (owner, 2026-11-09). A concept, not a real satellite or
 * product, and nothing to do with the OneWeb satellites the ST31 Soyuz
 * carried: its envelope follows the CubeSat Design Specification, its power
 * figures Orbitlab's own sourced SMAD defaults (src/orbit/power.ts), and its
 * parts' masses and loads are typical values chosen for the scenario, each
 * labelled with how it is known (`Certainty`).
 *
 * One parts list serves everything the section shows: the 3-D model
 * (src/render/edusat-model.ts draws each part's box), the parts list, the
 * assembly (`EDUSAT_ASSEMBLY`), the mass (`src/structure/edusat-design.ts`)
 * and the power balance (src/structure/power-balance.ts). Two systems can be
 * changed in "my experiment": the battery and the mission payload, each from
 * options of the same slot and size limits.
 *
 * Frame: metres, the satellite's centre at the origin, +Y along its long
 * axis (up as the viewer stands it; −Y is the nadir face, where the camera
 * looks out), X and Z across its square faces.
 *
 * DOM-free.
 */
import type { AssemblySpec } from './assembly';
import type { Certainty, PartCategory } from './types';

// ─── the envelope ────────────────────────────────────────────────────────────

/** The 3U envelope, m: 100.0 × 100.0 × 340.5 mm (CubeSat Design Specification). */
export const ENVELOPE = { x: 0.1, y: 0.3405, z: 0.1 } as const;
const BOTTOM = -ENVELOPE.y / 2;

/**
 * This pilot's mass bound, kg: 4.00, the 3U limit of the CubeSat Design
 * Specification Rev. 13 (2014). Later revisions and launch providers set
 * their own; the section says so.
 */
export const MASS_LIMIT_KG = 4;

// ─── sources ─────────────────────────────────────────────────────────────────

export interface EduSource { id: string; title: string; url?: string; supports: string }

export const EDUSAT_SOURCES: readonly EduSource[] = [
  {
    id: 'cds', title: 'Cal Poly, CubeSat Design Specification, Rev. 14.1 (2022) and Rev. 13 (2014)',
    url: 'https://www.cubesat.org/cubesatinfo',
    supports: '3U envelope 100.0 × 100.0 × 340.5 mm; 3U mass ≤ 4.00 kg in Rev. 13',
  },
  {
    id: 'azur-3g30c', title: 'AZUR SPACE, 3G30C-Advanced triple-junction cell, 4 × 8 cm datasheet',
    url: 'https://www.azurspace.com/en/products/space-products/',
    supports: 'cell area 30.18 cm²',
  },
  {
    id: 'nasa-sst-power', title: 'NASA, State-of-the-Art of Small Spacecraft Technology, ch. 3 Power, Table 3-1',
    url: 'https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems',
    supports: 'AZUR 3G30-Adv cell 29.5 % at beginning of life (the figure Orbitlab\'s satellite builder uses)',
  },
  {
    id: 'smad', title: 'MIT OCW 16.851 Satellite Engineering (2003), Problem Set 4 solution, Table 1 (SMAD sizing values)',
    url: 'https://ocw.mit.edu/courses/16-851-satellite-engineering-fall-2003/',
    supports: 'I_d 0.77; peak-power tracking X_d 0.80 and X_e 0.60; battery-to-load efficiency 0.9 (src/orbit/power.ts)',
  },
  {
    id: 'tudelft', title: 'B.T.C. Zandbergen, Spacecraft bus design and sizing, TU Delft (2020)',
    supports: 'a spinner\'s cells: 1/π of them face the Sun (p. 133); 30 % depth of discharge flown in low orbit (Table 42)',
  },
  {
    id: 'iau', title: 'IAU 2015 Resolution B3 (nominal total solar irradiance)',
    supports: 'solar flux 1361 W/m² (src/orbit/power.ts)',
  },
  {
    id: 'cell-18650', title: 'Samsung SDI, ICR18650-26J lithium-ion cell specification',
    supports: '2,600 mAh nominal, about 3.6 V nominal, at most 45 g per cell',
  },
  {
    id: 'eclipse-model', title: 'Orbitlab, src/orbit/eclipse.ts (SMAD\'s circular-orbit shadow, tests/eclipse.test.ts)',
    supports: 'the shadow and the period of a circular orbit',
  },
  {
    id: 'pilot', title: 'This pilot\'s scenario (Orbitlab Structure section, 2026)',
    supports: 'loads, their schedule, and the typical masses of the boards: chosen for learning, not a product\'s figures',
  },
];

// ─── parts ───────────────────────────────────────────────────────────────────

/** When a load draws power in the scenario's orbit. */
export type LoadWindow = 'always' | 'sunlit' | 'eclipse';

/** A load: `watts` while on; for a timed one, from `start` minutes into its window, for `minutes`, every orbit. */
export interface EduLoad {
  /** what it is (an id for the text) */
  id: string;
  watts: number;
  window: LoadWindow;
  start?: number;
  minutes?: number;
}

/** A box in the satellite's frame, m. */
export interface EduBox { center: readonly [number, number, number]; size: readonly [number, number, number] }

export interface EduPart {
  /** permanent id, `edusat.<name>` */
  id: string;
  /** the assembly unit it is (one unit, one part, in this model) */
  unit: EduUnit;
  category: PartCategory;
  massKg: number;
  massCertainty: Certainty;
  box: EduBox;
  loads: readonly EduLoad[];
  sourceIds: readonly string[];
  /** a battery's capacity, Wh (nominal) */
  batteryWh?: number;
  /** a battery's cells (each 3.6 V × 2.6 Ah) */
  cells?: number;
  /** solar cells on a panel, and the cell area, m² */
  solarCells?: number;
}

export type EduUnit =
  | 'frame' | 'stack' | 'payload' | 'battery' | 'eps' | 'adcs' | 'obc' | 'radio' | 'antenna'
  | 'panel-px' | 'panel-nx' | 'panel-pz' | 'panel-nz';

export const EDU_UNITS: readonly EduUnit[] = [
  'frame', 'stack', 'payload', 'battery', 'eps', 'adcs', 'obc', 'radio', 'antenna', 'panel-px', 'panel-nx', 'panel-pz', 'panel-nz',
];

export const PANELS: readonly EduUnit[] = ['panel-px', 'panel-nx', 'panel-pz', 'panel-nz'];

/** The stack's places along the long axis, m from the bottom face, and each board's height limit. */
export const STACK_SLOTS = {
  payload: { from: 0.006, height: 0.095 },
  battery: { from: 0.106, height: 0.04 },
  eps: { from: 0.15, height: 0.016 },
  adcs: { from: 0.17, height: 0.022 },
  obc: { from: 0.196, height: 0.016 },
  radio: { from: 0.216, height: 0.022 },
} as const;
/** Across, every board and the payload fit inside 90 × 90 mm, between the rails. */
export const STACK_WIDTH = 0.09;

/** A board's box in its stack slot, `height` tall (m) and `width` square. */
function inSlot(slot: keyof typeof STACK_SLOTS, height: number, width = STACK_WIDTH): EduBox {
  const s = STACK_SLOTS[slot];
  return { center: [0, BOTTOM + s.from + height / 2, 0], size: [width, height, width] };
}

/** One 3U side panel: seven 4 × 8 cm cells (30.18 cm² each) between the rails. */
export const CELL_AREA = 30.18e-4;
export const CELLS_PER_PANEL = 7;
const PANEL = { thick: 0.0016, height: 0.32, width: 0.083 } as const;
/** A side panel's box on face `axis` at `sign`. */
function sidePanel(axis: 'x' | 'z', sign: 1 | -1): EduBox {
  const off = sign * (ENVELOPE.x / 2 - PANEL.thick / 2);
  return axis === 'x'
    ? { center: [off, 0, 0], size: [PANEL.thick, PANEL.height, PANEL.width] }
    : { center: [0, 0, off], size: [PANEL.width, PANEL.height, PANEL.thick] };
}

const panel = (unit: EduUnit, axis: 'x' | 'z', sign: 1 | -1): EduPart => ({
  id: `edusat.${unit}`, unit, category: 'equipment', massKg: 0.12, massCertainty: 'estimated', box: sidePanel(axis, sign), loads: [],
  sourceIds: ['azur-3g30c', 'nasa-sst-power', 'pilot'], solarCells: CELLS_PER_PANEL,
});

/** Every part but the two that can be changed, as the reference design has them. */
export const FIXED_PARTS: readonly EduPart[] = [
  {
    id: 'edusat.frame', unit: 'frame', category: 'load', massKg: 0.3, massCertainty: 'estimated',
    box: { center: [0, 0, 0], size: [ENVELOPE.x, ENVELOPE.y, ENVELOPE.z] }, loads: [], sourceIds: ['cds', 'pilot'],
  },
  {
    id: 'edusat.stack', unit: 'stack', category: 'mount', massKg: 0.14, massCertainty: 'estimated',
    box: { center: [0, 0, 0], size: [STACK_WIDTH, ENVELOPE.y - 0.012, STACK_WIDTH] }, loads: [], sourceIds: ['pilot'],
  },
  {
    id: 'edusat.eps', unit: 'eps', category: 'equipment', massKg: 0.1, massCertainty: 'estimated', box: inSlot('eps', 0.014),
    loads: [{ id: 'eps', watts: 0.15, window: 'always' }], sourceIds: ['pilot'],
  },
  {
    id: 'edusat.adcs', unit: 'adcs', category: 'equipment', massKg: 0.18, massCertainty: 'estimated', box: inSlot('adcs', 0.02),
    loads: [{ id: 'adcs', watts: 0.5, window: 'always' }], sourceIds: ['pilot'],
  },
  {
    id: 'edusat.obc', unit: 'obc', category: 'equipment', massKg: 0.06, massCertainty: 'estimated', box: inSlot('obc', 0.014),
    loads: [{ id: 'obc', watts: 0.4, window: 'always' }], sourceIds: ['pilot'],
  },
  {
    id: 'edusat.radio', unit: 'radio', category: 'equipment', massKg: 0.08, massCertainty: 'estimated', box: inSlot('radio', 0.02),
    loads: [{ id: 'radioRx', watts: 0.25, window: 'always' }, { id: 'radioTx', watts: 3.5, window: 'sunlit', start: 15, minutes: 8 }], sourceIds: ['pilot'],
  },
  {
    id: 'edusat.antenna', unit: 'antenna', category: 'mechanism', massKg: 0.08, massCertainty: 'estimated',
    box: { center: [0, ENVELOPE.y / 2 - 0.004, 0], size: [0.098, 0.008, 0.098] }, loads: [], sourceIds: ['pilot'],
  },
  panel('panel-px', 'x', 1),
  panel('panel-nx', 'x', -1),
  panel('panel-pz', 'z', 1),
  panel('panel-nz', 'z', -1),
];

// ─── the two systems that can be changed ─────────────────────────────────────

export type BatteryOption = 'battery-1cell' | 'battery-2cell';
export type PayloadOption = 'camera-day' | 'camera-night';

export const BATTERY_OPTIONS: readonly BatteryOption[] = ['battery-1cell', 'battery-2cell'];
export const PAYLOAD_OPTIONS: readonly PayloadOption[] = ['camera-day', 'camera-night'];

/** One lithium-ion 18650 cell: 3.6 V × 2.6 Ah, Wh (typical, `cell-18650`). */
export const CELL_WH = 3.6 * 2.6;

/**
 * The batteries: one or two 18650 cells on a board with its holder,
 * protection and heater. Twice the cells, twice the energy, and 60 g more.
 */
export const BATTERIES: Readonly<Record<BatteryOption, EduPart>> = {
  'battery-1cell': {
    id: 'edusat.battery-1cell', unit: 'battery', category: 'equipment', massKg: 0.09, massCertainty: 'estimated',
    box: inSlot('battery', 0.022), loads: [], sourceIds: ['cell-18650', 'pilot'], batteryWh: CELL_WH, cells: 1,
  },
  'battery-2cell': {
    id: 'edusat.battery-2cell', unit: 'battery', category: 'equipment', massKg: 0.15, massCertainty: 'estimated',
    box: inSlot('battery', 0.038), loads: [], sourceIds: ['cell-18650', 'pilot'], batteryWh: 2 * CELL_WH, cells: 2,
  },
};

/**
 * The mission payloads, both cameras looking out of the nadir face. The day
 * camera takes pictures of the ground in sunlight: 2.5 W for 10 minutes, half
 * an hour after the satellite comes out of the shadow. The night camera,
 * with a larger lens and a cooled sensor, takes pictures of city lights,
 * which can only be done in the Earth's shadow, when the panels make nothing:
 * 6 W for 25 minutes, starting 5 minutes into the shadow.
 */
export const PAYLOADS: Readonly<Record<PayloadOption, EduPart>> = {
  'camera-day': {
    id: 'edusat.camera-day', unit: 'payload', category: 'equipment', massKg: 0.3, massCertainty: 'estimated',
    box: inSlot('payload', 0.07, 0.07), loads: [{ id: 'cameraDay', watts: 2.5, window: 'sunlit', start: 30, minutes: 10 }], sourceIds: ['pilot'],
  },
  'camera-night': {
    id: 'edusat.camera-night', unit: 'payload', category: 'equipment', massKg: 0.5, massCertainty: 'estimated',
    box: inSlot('payload', 0.092, 0.086), loads: [{ id: 'cameraNight', watts: 6, window: 'eclipse', start: 5, minutes: 25 }], sourceIds: ['pilot'],
  },
};

// ─── assembly ────────────────────────────────────────────────────────────────

/** The side panels' faces: any panel fits any face (they are the same panel). */
export const FACES = ['face-px', 'face-nx', 'face-pz', 'face-nz'] as const;
const FACE_OF: Readonly<Record<string, string>> = { 'panel-px': 'face-px', 'panel-nx': 'face-nx', 'panel-pz': 'face-pz', 'panel-nz': 'face-nz' };

/** The stack goes in from the bottom up, each board on the one below; the panels close it, and the antenna goes on the radio. */
const EDU_REQUIRES: Readonly<Record<EduUnit, readonly EduUnit[]>> = {
  frame: [],
  stack: ['frame'],
  payload: ['stack'],
  battery: ['payload'],
  eps: ['battery'],
  adcs: ['eps'],
  obc: ['adcs'],
  radio: ['obc'],
  antenna: ['radio'],
  'panel-px': ['radio'],
  'panel-nx': ['radio'],
  'panel-pz': ['radio'],
  'panel-nz': ['radio'],
};

/** Units offered either way round: the camera (lens down, out of the nadir face, is right) and each panel (cells out). */
const FLIPPABLE: ReadonlySet<EduUnit> = new Set(['payload', 'panel-px', 'panel-nx', 'panel-pz', 'panel-nz']);

export const slotOfUnit = (unit: EduUnit): string => FACE_OF[unit] ?? unit;

export const EDUSAT_ASSEMBLY: AssemblySpec = {
  units: EDU_UNITS.map((id) => ({
    id,
    slots: PANELS.includes(id) ? [slotOfUnit(id), ...FACES.filter((f) => f !== slotOfUnit(id))] : [id],
    requires: EDU_REQUIRES[id],
    orientations: FLIPPABLE.has(id) ? 2 : 1,
  })),
  slots: EDU_UNITS.map((id) => ({ id: slotOfUnit(id), reference: id })),
};

/** How two units meet. */
export type EduLink = 'rails' | 'stackRods' | 'stackConnector' | 'bottomPlate' | 'rfCable' | 'harness' | 'battery';
export interface EduRelation { a: EduUnit; b: EduUnit; link: EduLink }

export const EDUSAT_RELATIONS: readonly EduRelation[] = [
  { a: 'stack', b: 'frame', link: 'stackRods' },
  { a: 'payload', b: 'frame', link: 'bottomPlate' },
  { a: 'battery', b: 'payload', link: 'stackConnector' },
  { a: 'eps', b: 'battery', link: 'battery' },
  { a: 'adcs', b: 'eps', link: 'stackConnector' },
  { a: 'obc', b: 'adcs', link: 'stackConnector' },
  { a: 'radio', b: 'obc', link: 'stackConnector' },
  { a: 'antenna', b: 'radio', link: 'rfCable' },
  ...PANELS.map((a): EduRelation => ({ a, b: 'eps', link: 'harness' })),
  ...PANELS.map((a): EduRelation => ({ a, b: 'frame', link: 'rails' })),
];

export const eduRelationsOf = (unit: string): EduRelation[] => EDUSAT_RELATIONS.filter((r) => r.a === unit || r.b === unit);

export const isEduUnit = (id: string): id is EduUnit => (EDU_UNITS as readonly string[]).includes(id);
