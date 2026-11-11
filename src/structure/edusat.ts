/**
 * EduSat-3U: a CubeSat-like satellite made for learning in Orbitlab's
 * Structure section (owner, 2026-11-09). A concept, not a real satellite or
 * product, and nothing to do with the OneWeb satellites the ST31 Soyuz
 * carried. Its envelope, mass bound, centre-of-gravity bound and the
 * requirements its parts answer follow the CubeSat Design Specification
 * (Rev. 14.1, read in the document, 2026-11-10); its solar cell is AZUR
 * SPACE's 3G30-Advanced by its data sheet; its power figures are Orbitlab's
 * own sourced SMAD defaults; and its parts' masses and loads are typical
 * values chosen for the scenario — each labelled with how it is known
 * (`Certainty`, `EDUSAT_SOURCES`).
 *
 * One parts list serves everything the section shows: the 3-D model
 * (src/render/edusat-model.ts draws each piece), the tree of the three
 * depths (five subsystems, thirteen units, their pieces), the assembly
 * (`EDUSAT_ASSEMBLY`, from `EDUSAT_ORDER`), the mass and centre of gravity
 * (src/structure/edusat-design.ts) and the power balance
 * (src/structure/power-balance.ts). Two systems can be changed in "my
 * experiment": the battery and the mission payload, each from options that
 * fit the same bay.
 *
 * Frames. The specification's: Z along the long axis, the −Z face the one
 * that goes into the dispenser first, the side faces ±X and ±Y (CDS §2.2.1,
 * §2.2.2, drawing CDS-14-004). The picture's: metres, the satellite's centre
 * at the origin, +y up. The satellite stands on its −Z face, so
 * (X, Y, Z) of the specification = (x, −z, y) of the picture (`toCds`).
 * Faces, panels and figures shown to the learner are named in the
 * specification's frame.
 *
 * DOM-free.
 */
import type { AssemblySpec } from './assembly';
import { requiresOf, type ModelRelation, type MountPoint, type OrderRule } from './model';
import type { Certainty, PartCategory } from './types';

// ─── the envelope and the specification's bounds ────────────────────────────

/** The 3U envelope in the picture's frame, m: 100.0 × 100.0 across, 340.5 along the long axis (CDS drawing CDS-14-004). */
export const ENVELOPE = { x: 0.1, y: 0.3405, z: 0.1 } as const;
const BOTTOM = -ENVELOPE.y / 2;

/** A point of the picture's frame in the specification's (X, Y, Z). */
export const toCds = (p: readonly [number, number, number]): [number, number, number] => [p[0], -p[2] + 0, p[1]];

/**
 * What the CubeSat Design Specification Rev. 14.1 asks of a 3U, as far as
 * this model can be held to it (each read in the document):
 * - Table 1: 6.00 kg, "the typical maximum mass" (larger ones case by case;
 *   the dispenser's and the launch provider's own limits rule, §1.3,
 *   §2.2.10.1–2). Rev. 13 (2014) said 4.00 kg (§3.2.13);
 * - Table 2: the centre of gravity within 2 cm of the geometric centre in X
 *   and Y, and 7 cm in Z;
 * - §2.2.3: nothing on a side face stands more than 6.5 mm out of the plane
 *   of the rails; drawing CDS-14-004: rails at least 8.5 mm wide;
 * - §2.4.4: deployables wait at least 30 minutes after ejection; §2.4.5: no
 *   signal sooner than 45 minutes after it;
 * - Rev. 13 §3.1.6: no more than 100 Wh of stored chemical energy (Rev. 14.1
 *   §2.1.5 notes the same 100 Wh as the carry-on limit per battery).
 */
export const CDS = {
  massKg: 6,
  massKgRev13: 4,
  cg: { x: 0.02, y: 0.02, z: 0.07 },
  protrusion: 0.0065,
  railWidth: 0.0085,
  deployWaitMin: 30,
  transmitWaitMin: 45,
  storedEnergyWh: 100,
} as const;

/** The mass bound the section shows: the specification's 3U typical maximum, kg. */
export const MASS_LIMIT_KG = CDS.massKg;

// ─── sources ─────────────────────────────────────────────────────────────────

/**
 * How a source was used: `document`, read in the document itself for this
 * model (2026-11-10); `app`, cited by Orbitlab's own code, whose values the
 * model takes from the app; `typical`, a typical value not checked against a
 * maker's document; `own`, this model's own choice or Orbitlab's own model.
 */
export type SourceBasis = 'document' | 'app' | 'typical' | 'own';

/** A source; what it supports is said in the interface language (text key `src.<id>`). */
export interface EduSource { id: string; title: string; url?: string; basis: SourceBasis }

export const EDUSAT_SOURCES: readonly EduSource[] = [
  {
    id: 'cds14', basis: 'document',
    title: 'Cal Poly SLO, CubeSat Design Specification Rev. 14.1 (CP-CDS-R14.1), February 2022',
    url: 'https://www.nasa.gov/wp-content/uploads/2018/01/cubesatdesignspecificationrev14_12022-02-09.pdf',
  },
  {
    id: 'cds13', basis: 'document',
    title: 'Cal Poly SLO, CubeSat Design Specification Rev. 13, 20 February 2014',
    url: 'https://www.unoosa.org/documents/pdf/psa/hsti/KiboCUBE/CubeSat_Design_Specification.pdf',
  },
  {
    id: 'azur-3g30', basis: 'document',
    title: 'AZUR SPACE, TJ Solar Cell 3G30-Advanced (4×8), data sheet DB 00010891-01, 11 April 2025',
    url: 'https://www.azurspace.com/media/uploads/file_links/file/bdb_00010891-01-00_tj3g30-advanced_4x8.pdf',
  },
  {
    id: 'nasa-sst-power', basis: 'document',
    title: 'NASA, State-of-the-Art of Small Spacecraft Technology, chapter 3 Power, Table 3-1',
    url: 'https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/',
  },
  {
    id: 'smad', basis: 'app',
    title: 'MIT OCW 16.851 Satellite Engineering (2003), Problem Set 4 solution, Table 1 (SMAD sizing values)',
    url: 'https://ocw.mit.edu/courses/16-851-satellite-engineering-fall-2003/',
  },
  { id: 'tudelft', basis: 'app', title: 'B.T.C. Zandbergen, Spacecraft bus design and sizing, TU Delft (2020)' },
  { id: 'iau', basis: 'app', title: 'IAU 2015 Resolution B3 (nominal total solar irradiance)' },
  { id: 'cell-18650', basis: 'typical', title: 'Lithium-ion 18650 cell, typical figures (2.6 Ah, 3.6 V nominal, about 45 g)' },
  { id: 'eclipse-model', basis: 'own', title: 'Orbitlab, src/orbit/eclipse.ts (the shadow and period of a circular orbit)' },
  { id: 'pilot', basis: 'own', title: 'Orbitlab Structure section, the EduSat-3U scenario (2026)' },
];

// ─── units ───────────────────────────────────────────────────────────────────

/** The thirteen units: what the picture moves as a whole and the assembly installs. */
export type EduUnit =
  | 'frame' | 'stack' | 'payload' | 'battery' | 'eps' | 'adcs' | 'obc' | 'radio' | 'antenna'
  | 'panel-px' | 'panel-py' | 'panel-nx' | 'panel-ny';

export const EDU_UNITS: readonly EduUnit[] = [
  'frame', 'stack', 'payload', 'battery', 'eps', 'adcs', 'obc', 'radio', 'antenna', 'panel-px', 'panel-py', 'panel-nx', 'panel-ny',
];

/** The four side panels, round the long axis from +X through +Y. */
export const PANELS: readonly EduUnit[] = ['panel-px', 'panel-py', 'panel-nx', 'panel-ny'];

/** The five subsystems a first look shows: which units make each. */
export type EduSubsystem = 'structure' | 'power' | 'avionics' | 'comms' | 'mission';

export const EDU_SUBSYSTEMS: readonly { id: EduSubsystem; units: readonly EduUnit[] }[] = [
  { id: 'structure', units: ['frame', 'stack'] },
  { id: 'power', units: ['panel-px', 'panel-py', 'panel-nx', 'panel-ny', 'eps', 'battery'] },
  { id: 'avionics', units: ['obc', 'adcs'] },
  { id: 'comms', units: ['radio', 'antenna'] },
  { id: 'mission', units: ['payload'] },
];

export const subsystemOf = (unit: EduUnit): EduSubsystem => EDU_SUBSYSTEMS.find((s) => s.units.includes(unit))!.id;

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

/** A box in the picture's frame, m. */
export interface EduBox { center: readonly [number, number, number]; size: readonly [number, number, number] }

/**
 * A piece of a unit: the single things the deepest depth shows and picks.
 * `kind` says what it is (the text and the drawing go by it); `n`, which one
 * of several alike (1-based).
 */
export interface EduPiece { kind: EduPieceKind; n?: number }

export type EduPieceKind =
  | 'rail' | 'endFrame' | 'switch' | 'rbfPin'
  | 'rod' | 'basePlate' | 'spacers' | 'harness'
  | 'camBody' | 'lens' | 'window' | 'radiator'
  | 'board' | 'cell18650' | 'protection'
  | 'converter' | 'inductor'
  | 'torquer' | 'airCoil'
  | 'processor' | 'memory'
  | 'transceiver' | 'rfConnector'
  | 'antennaBase' | 'tape'
  | 'panelBoard' | 'solarCell' | 'sunSensor';

export interface EduPart {
  /** permanent id, `edusat.<name>` */
  id: string;
  /** the unit it is (one part per unit, in any design) */
  unit: EduUnit;
  category: PartCategory;
  massKg: number;
  massCertainty: Certainty;
  box: EduBox;
  loads: readonly EduLoad[];
  sourceIds: readonly string[];
  pieces: readonly EduPiece[];
  /** a battery's capacity, Wh (nominal) */
  batteryWh?: number;
  /** a battery's cells (each 3.6 V × 2.6 Ah) */
  cells?: number;
  /** solar cells on a panel */
  solarCells?: number;
}

/**
 * What kind of part each kind of piece is, and how its shape is known: the
 * rails' width and the cells' size are the specification's and the data
 * sheet's; every other shape is a concept's drawing.
 */
export const PIECE_KIND: Readonly<Record<EduPieceKind, { category: PartCategory; certainty: Certainty }>> = {
  rail: { category: 'load', certainty: 'documented' }, endFrame: { category: 'load', certainty: 'estimated' },
  switch: { category: 'mechanism', certainty: 'estimated' }, rbfPin: { category: 'mechanism', certainty: 'estimated' },
  rod: { category: 'load', certainty: 'estimated' }, basePlate: { category: 'mount', certainty: 'estimated' },
  spacers: { category: 'mount', certainty: 'estimated' }, harness: { category: 'equipment', certainty: 'estimated' },
  camBody: { category: 'equipment', certainty: 'estimated' }, lens: { category: 'equipment', certainty: 'estimated' },
  window: { category: 'equipment', certainty: 'estimated' }, radiator: { category: 'equipment', certainty: 'estimated' },
  board: { category: 'equipment', certainty: 'estimated' }, cell18650: { category: 'equipment', certainty: 'estimated' },
  protection: { category: 'equipment', certainty: 'estimated' }, converter: { category: 'equipment', certainty: 'estimated' },
  inductor: { category: 'equipment', certainty: 'estimated' }, torquer: { category: 'equipment', certainty: 'estimated' },
  airCoil: { category: 'equipment', certainty: 'estimated' }, processor: { category: 'equipment', certainty: 'estimated' },
  memory: { category: 'equipment', certainty: 'estimated' }, transceiver: { category: 'equipment', certainty: 'estimated' },
  rfConnector: { category: 'equipment', certainty: 'estimated' }, antennaBase: { category: 'mount', certainty: 'estimated' },
  tape: { category: 'mechanism', certainty: 'estimated' }, panelBoard: { category: 'wall', certainty: 'estimated' },
  solarCell: { category: 'equipment', certainty: 'documented' }, sunSensor: { category: 'equipment', certainty: 'estimated' },
};

const several = (kind: EduPieceKind, count: number): EduPiece[] => Array.from({ length: count }, (_, k) => ({ kind, n: k + 1 }));

/**
 * The stack's bays along the long axis, m from the −Z face, and how tall
 * what goes in each may be. The camera bay is a unit and a half: the lens
 * looks out of the −Z face, which points at the ground.
 */
export const STACK_SLOTS = {
  payload: { from: 0.006, height: 0.15 },
  battery: { from: 0.162, height: 0.04 },
  eps: { from: 0.206, height: 0.016 },
  adcs: { from: 0.226, height: 0.022 },
  obc: { from: 0.252, height: 0.016 },
  radio: { from: 0.272, height: 0.022 },
} as const;
export type StackBay = keyof typeof STACK_SLOTS;
export const STACK_BAYS: readonly StackBay[] = ['payload', 'battery', 'eps', 'adcs', 'obc', 'radio'];
/** Across, every board and the payload fit inside 90 × 90 mm, between the rails. */
export const STACK_WIDTH = 0.09;
/** The four rods the boards are threaded on stand this far from the axis in x and in z, m: a payload stays inside them. */
export const ROD_OFFSET = 0.0425;

/** A board's box in its bay, `height` tall (m) and `width` square. */
function inBay(bay: StackBay, height: number, width = STACK_WIDTH): EduBox {
  const s = STACK_SLOTS[bay];
  return { center: [0, BOTTOM + s.from + height / 2, 0], size: [width, height, width] };
}

/**
 * The solar cell: AZUR SPACE 3G30-Advanced, 40 × 80 mm (its data sheet, read
 * 2026-11-10). Bare cell: 30.18 cm², 2.6 g, 29.5 % at the beginning of life
 * (AM0, 1367 W/m², 28 °C); with its cover glass and interconnects (the
 * assembly a panel carries): 3.6 g and 29.2 %. At its maximum-power point one
 * bare cell gives 2.411 V × 0.504 A = 1.215 W.
 */
export const SOLAR_CELL = {
  width: 0.04, length: 0.08, area: 30.18e-4, efficiency: 0.295, efficiencyGlassed: 0.292,
  vmp: 2.411, imp: 0.504, voc: 2.7, isc: 0.52, massBareKg: 0.0026, massGlassedKg: 0.0036, testFlux: 1367,
} as const;
/** One cell's area, m² (the power balance's). */
export const CELL_AREA = SOLAR_CELL.area;
/** One 3U side panel: seven cells between the rails (two columns of four places, one place for the sun sensor). */
export const CELLS_PER_PANEL = 7;

/** The rails: 8.5 mm square, the specification's least width; the side panels stand between them. */
export const RAIL = CDS.railWidth;
export const PANEL = { thick: 0.0016, height: 0.32, width: 0.083, cellThick: 0.0003 } as const;

/** The side faces, each with the side panel the reference puts there, and where it stands in the picture's frame. */
export const FACES = ['face-px', 'face-py', 'face-nx', 'face-ny'] as const;
export type EduFace = typeof FACES[number];
const FACE_OF: Readonly<Record<string, EduFace>> = { 'panel-px': 'face-px', 'panel-py': 'face-py', 'panel-nx': 'face-nx', 'panel-ny': 'face-ny' };
/** The outward normal of each face in the picture's frame (the specification's +Y is the picture's −z). */
export const FACE_NORMAL: Readonly<Record<EduFace, readonly [number, number, number]>> = {
  'face-px': [1, 0, 0], 'face-py': [0, 0, -1], 'face-nx': [-1, 0, 0], 'face-ny': [0, 0, 1],
};

/** A side panel's box on `face`. */
function sidePanel(face: EduFace): EduBox {
  const n = FACE_NORMAL[face];
  const off = ENVELOPE.x / 2 - PANEL.thick / 2;
  return n[0] !== 0
    ? { center: [n[0] * off, 0, 0], size: [PANEL.thick, PANEL.height, PANEL.width] }
    : { center: [0, 0, n[2] * off], size: [PANEL.width, PANEL.height, PANEL.thick] };
}

const panel = (unit: EduUnit): EduPart => ({
  id: `edusat.${unit}`, unit, category: 'equipment', massKg: 0.12, massCertainty: 'estimated', box: sidePanel(FACE_OF[unit]), loads: [],
  sourceIds: ['azur-3g30', 'nasa-sst-power', 'cds14', 'pilot'], solarCells: CELLS_PER_PANEL,
  pieces: [{ kind: 'panelBoard' }, ...several('solarCell', CELLS_PER_PANEL), { kind: 'sunSensor' }],
});

const board: EduPiece = { kind: 'board' };

/** Every part but the two that can be changed, as the reference design has them. */
export const FIXED_PARTS: readonly EduPart[] = [
  {
    id: 'edusat.frame', unit: 'frame', category: 'load', massKg: 0.3, massCertainty: 'estimated',
    box: { center: [0, 0, 0], size: [ENVELOPE.x, ENVELOPE.y, ENVELOPE.z] }, loads: [], sourceIds: ['cds14', 'pilot'],
    pieces: [...several('rail', 4), ...several('endFrame', 2), ...several('switch', 2), { kind: 'rbfPin' }],
  },
  {
    id: 'edusat.stack', unit: 'stack', category: 'mount', massKg: 0.14, massCertainty: 'estimated',
    box: { center: [0, 0, 0], size: [STACK_WIDTH, ENVELOPE.y - 0.012, STACK_WIDTH] }, loads: [], sourceIds: ['pilot'],
    pieces: [...several('rod', 4), { kind: 'basePlate' }, { kind: 'spacers' }, { kind: 'harness' }],
  },
  {
    id: 'edusat.eps', unit: 'eps', category: 'equipment', massKg: 0.1, massCertainty: 'estimated', box: inBay('eps', 0.014),
    loads: [{ id: 'eps', watts: 0.15, window: 'always' }], sourceIds: ['pilot'],
    pieces: [board, ...several('converter', 2), { kind: 'inductor' }],
  },
  {
    id: 'edusat.adcs', unit: 'adcs', category: 'equipment', massKg: 0.18, massCertainty: 'estimated', box: inBay('adcs', 0.02),
    loads: [{ id: 'adcs', watts: 0.5, window: 'always' }], sourceIds: ['pilot'],
    pieces: [board, ...several('torquer', 2), { kind: 'airCoil' }],
  },
  {
    id: 'edusat.obc', unit: 'obc', category: 'equipment', massKg: 0.06, massCertainty: 'estimated', box: inBay('obc', 0.014),
    loads: [{ id: 'obc', watts: 0.4, window: 'always' }], sourceIds: ['pilot'],
    pieces: [board, { kind: 'processor' }, { kind: 'memory' }],
  },
  {
    id: 'edusat.radio', unit: 'radio', category: 'equipment', massKg: 0.08, massCertainty: 'estimated', box: inBay('radio', 0.02),
    loads: [{ id: 'radioRx', watts: 0.25, window: 'always' }, { id: 'radioTx', watts: 3.5, window: 'sunlit', start: 15, minutes: 8 }], sourceIds: ['cds14', 'pilot'],
    pieces: [board, { kind: 'transceiver' }, { kind: 'rfConnector' }],
  },
  {
    id: 'edusat.antenna', unit: 'antenna', category: 'mechanism', massKg: 0.08, massCertainty: 'estimated',
    box: { center: [0, ENVELOPE.y / 2 - 0.004, 0], size: [0.098, 0.008, 0.098] }, loads: [], sourceIds: ['cds14', 'pilot'],
    pieces: [{ kind: 'antennaBase' }, ...several('tape', 4)],
  },
  panel('panel-px'),
  panel('panel-py'),
  panel('panel-nx'),
  panel('panel-ny'),
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
    box: inBay('battery', 0.022), loads: [], sourceIds: ['cell-18650', 'cds14', 'pilot'], batteryWh: CELL_WH, cells: 1,
    pieces: [board, ...several('cell18650', 1), { kind: 'protection' }],
  },
  'battery-2cell': {
    id: 'edusat.battery-2cell', unit: 'battery', category: 'equipment', massKg: 0.15, massCertainty: 'estimated',
    box: inBay('battery', 0.038), loads: [], sourceIds: ['cell-18650', 'cds14', 'pilot'], batteryWh: 2 * CELL_WH, cells: 2,
    pieces: [board, ...several('cell18650', 2), { kind: 'protection' }],
  },
};

/**
 * The mission payloads, both cameras looking out of the −Z face. The day
 * camera takes pictures of the ground in sunlight: 2.5 W for 10 minutes, half
 * an hour after the satellite comes out of the shadow. The night camera,
 * with a larger lens and a cooled sensor, takes pictures of city lights,
 * which can only be done in the Earth's shadow, when the panels make nothing:
 * 6 W for 25 minutes, starting 5 minutes into the shadow.
 */
export const PAYLOADS: Readonly<Record<PayloadOption, EduPart>> = {
  'camera-day': {
    id: 'edusat.camera-day', unit: 'payload', category: 'equipment', massKg: 0.3, massCertainty: 'estimated',
    box: inBay('payload', 0.118, 0.07), loads: [{ id: 'cameraDay', watts: 2.5, window: 'sunlit', start: 30, minutes: 10 }], sourceIds: ['pilot'],
    pieces: [{ kind: 'camBody' }, { kind: 'lens' }, { kind: 'window' }],
  },
  'camera-night': {
    id: 'edusat.camera-night', unit: 'payload', category: 'equipment', massKg: 0.5, massCertainty: 'estimated',
    box: inBay('payload', 0.146, 0.08), loads: [{ id: 'cameraNight', watts: 6, window: 'eclipse', start: 5, minutes: 25 }], sourceIds: ['pilot'],
    pieces: [{ kind: 'camBody' }, { kind: 'lens' }, { kind: 'window' }, { kind: 'radiator' }],
  },
};

/** A piece's permanent id: `<part id>/<kind>[-n]`. */
export const pieceId = (part: EduPart, p: EduPiece): string => `${part.id}/${p.kind}${p.n === undefined ? '' : `-${p.n}`}`;

// ─── how the units meet, and the order they go together in ───────────────────

const rel = (a: EduUnit, b: EduUnit, kind: ModelRelation['kind'], medium: ModelRelation['medium'], joint: string): ModelRelation =>
  ({ id: `${a}>${b}:${joint}`, a, b, kind, medium, joint });

/**
 * How the units meet (the joint's name is the text key `edu.link.<joint>`):
 * what carries what (structure), where the electrical power goes (the panels
 * to the power board, the battery to it, and from it up the stack's
 * connector to every board), what the computer commands (data), and the
 * radio's signal to its antenna.
 */
export const EDUSAT_RELATIONS: readonly ModelRelation[] = [
  rel('stack', 'frame', 'mounts', 'structure', 'stackRods'),
  rel('payload', 'stack', 'mounts', 'structure', 'basePlate'),
  rel('battery', 'stack', 'mounts', 'structure', 'rodsAndSpacers'),
  rel('eps', 'stack', 'mounts', 'structure', 'rodsAndSpacers'),
  rel('adcs', 'stack', 'mounts', 'structure', 'rodsAndSpacers'),
  rel('obc', 'stack', 'mounts', 'structure', 'rodsAndSpacers'),
  rel('radio', 'stack', 'mounts', 'structure', 'rodsAndSpacers'),
  rel('antenna', 'frame', 'mounts', 'structure', 'topFrame'),
  ...PANELS.map((p) => rel(p, 'frame', 'mounts', 'structure', 'rails')),
  ...PANELS.map((p) => rel(p, 'eps', 'connects', 'power', 'panelHarness')),
  rel('battery', 'eps', 'connects', 'power', 'batteryLeads'),
  rel('eps', 'obc', 'connects', 'power', 'powerBus'),
  rel('eps', 'adcs', 'connects', 'power', 'powerBus'),
  rel('eps', 'radio', 'connects', 'power', 'powerBus'),
  rel('eps', 'payload', 'connects', 'power', 'powerBus'),
  rel('obc', 'payload', 'connects', 'data', 'dataBus'),
  rel('obc', 'adcs', 'connects', 'data', 'dataBus'),
  rel('obc', 'radio', 'connects', 'data', 'dataBus'),
  rel('radio', 'antenna', 'connects', 'rf', 'rfCable'),
];

const after = (unit: EduUnit, a: EduUnit, why: string): OrderRule => ({ unit, after: a, why: `edu.why.${why}` });

/**
 * The order of assembly and why (text keys `edu.why.*`): the stack is built
 * from the −Z end up, each board on the spacers of the one below; the
 * antenna is wired to the radio before it closes the +Z end; the side panels
 * close the stack in, so they go on once every board is in.
 */
export const EDUSAT_ORDER: readonly OrderRule[] = [
  after('stack', 'frame', 'rods'),
  after('payload', 'stack', 'base'),
  after('battery', 'payload', 'stacked'),
  after('eps', 'battery', 'stacked'),
  after('adcs', 'eps', 'stacked'),
  after('obc', 'adcs', 'stacked'),
  after('radio', 'obc', 'stacked'),
  after('antenna', 'radio', 'cable'),
  ...PANELS.map((p) => after(p, 'radio', 'access')),
];

/** Units offered either way round: the camera (lens to the −Z face is right) and each panel (cells out). */
const FLIPPABLE: ReadonlySet<EduUnit> = new Set<EduUnit>(['payload', ...PANELS]);

/** The slot the reference gives a unit: a panel's face, else a place of its own. */
export const slotOfUnit = (unit: EduUnit): string => FACE_OF[unit] ?? unit;

/** Where each face stands round the long axis (the picture's +y), rad: the angle that turns the picture's +x onto its normal, right-handed. */
export const FACE_AZIMUTH: Readonly<Record<string, number>> = { 'face-px': 0, 'face-py': Math.PI / 2, 'face-nx': Math.PI, 'face-ny': -Math.PI / 2 };

/**
 * The turn about the long axis, rad, that carries a side panel from its own
 * face to `slot`: how a panel installed on another face is drawn there. 0 on
 * its own face, and for a unit or slot that is not a panel's or a face.
 */
export function panelTurn(unit: string, slot: string): number {
  const own = FACE_OF[unit];
  if (own === undefined || !Object.hasOwn(FACE_AZIMUTH, slot)) return 0;
  return FACE_AZIMUTH[slot] - FACE_AZIMUTH[own];
}

export const EDUSAT_ASSEMBLY: AssemblySpec = {
  units: EDU_UNITS.map((id) => ({
    id,
    // any panel fits any face (they are the same panel); the reference's own face first
    slots: PANELS.includes(id) ? [slotOfUnit(id), ...FACES.filter((f) => f !== slotOfUnit(id))] : [id],
    requires: requiresOf(EDUSAT_ORDER, id),
    orientations: FLIPPABLE.has(id) ? 2 : 1,
  })),
  slots: EDU_UNITS.map((id) => ({ id: slotOfUnit(id), reference: id })),
};

/** The assembly's places, named for where they are (text keys `edu.place.*`), numbered from the −Z end up and round the faces. */
export const EDUSAT_MOUNTS: readonly MountPoint[] = EDU_UNITS.map((u, k) => ({ slot: slotOfUnit(u), mark: k + 1, name: `edu.place.${slotOfUnit(u)}` }));

export const isEduUnit = (id: string): id is EduUnit => (EDU_UNITS as readonly string[]).includes(id);
