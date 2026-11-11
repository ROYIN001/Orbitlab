/**
 * What a model gives the Structure section's screens, whatever it is made
 * from: its description (src/structure/model.ts), its picture, its words and
 * what it has to explore beyond its parts. The screens are written against
 * this alone — none of them knows which model it shows — so a new model is a
 * new adapter in `models/index.ts`, its address in src/ui/app-mode.ts and its
 * words in text.ts, and nothing else changes
 * (tests/structure-tree.test.ts).
 */
import type { AssemblySpec } from '../../../structure/assembly';
import type { ModelRelation, ModelTree, MountPoint, OrderRule, Pose } from '../../../structure/model';
import type { StructureMode } from '../../../structure/progress';
import type { Certainty, Depth, PartCategory, StructureModelId } from '../../../structure/types';
import type { ColorMode, ViewerMesh } from '../../../render/structure-viewer';
import type { StructureStore } from '../store';

// ─── the information panel's content ─────────────────────────────────────────

export interface InfoFact { label: string; value: string; certainty?: Certainty; mono?: boolean }
/** A relation of the thing shown: the other unit (a node to go to), the joint's name, and why one waits for the other. */
export interface InfoRelation { relation: string; other: string; text: string; why?: string; hasJoint: boolean }
export interface InfoSource { title: string; url?: string; note?: string; scope?: string }
/** A check of a figure against a bound: what was found, the bound, where the bound is said. */
export interface InfoCheck { label: string; value: string; limit: string; ok: boolean; ref: string }

export type InfoBlock =
  | { kind: 'text'; text: string; tone?: 'lead' | 'body' | 'small' | 'note' | 'warn' }
  | { kind: 'heading'; text: string }
  | { kind: 'facts'; rows: InfoFact[] }
  | { kind: 'relations'; rows: InfoRelation[] }
  | { kind: 'list'; items: string[] }
  | { kind: 'sources'; rows: InfoSource[] }
  /** what a group is made of: counts by kind of part and by how its shape is known */
  | { kind: 'kinds'; categories: { category: PartCategory; count: number }[]; certainties: { certainty: Certainty; count: number }[] }
  /** internal systems that pass through the thing: links into the systems tab */
  | { kind: 'systems'; rows: { id: string; label: string; step?: string }[] }
  /** other things to go to (what it is mounted on, what a line joins) */
  | { kind: 'nodes'; ids: string[] }
  | { kind: 'checks'; rows: InfoCheck[]; note: string };

/** What the information panel shows for a thing — content, which the panel draws and a test can read. */
export interface InfoDoc {
  title: string;
  /** a line under the title: what kind of thing it is, or the option fitted */
  subtitle?: string;
  /** where it belongs: its ancestors' node ids, outermost first (itself not among them) */
  path: string[];
  blocks: InfoBlock[];
}

// ─── internal systems ────────────────────────────────────────────────────────

/** One step of a system, with the picture's parts that are it. */
export interface SystemStep { label: string; text: string; schematic: boolean; items: number[] }

/**
 * Something that runs through a model's parts and can be followed step by
 * step: a propellant or gas circuit of the rocket, the satellite's power,
 * data and radio paths. `kind` says how far it is known.
 */
export interface ModelSystem {
  id: string;
  /** the heading it is listed under (an engine, "the satellite's buses") */
  group: string;
  label: string;
  text: string;
  confidence: string;
  limitation: string;
  sources: InfoSource[];
  items: number[];
  steps: SystemStep[];
  /** the colour its parts are painted (by what flows in it) */
  colour: string;
}

// ─── the optional helper ─────────────────────────────────────────────────────

/** What a guide's step puts on the picture when the learner asks ("show me"). */
export interface GuideShow {
  mode?: StructureMode;
  /** a node to select (null: none) */
  select?: string | null;
  view?: Partial<{ explode: number; open: number; cutaway: boolean; shell: boolean; colour: ColorMode; deployed: boolean }>;
  system?: { id: string; step: number | null } | null;
  /** a step of the model's flight sequence (null: the whole vehicle) */
  flight?: number | null;
  camera?: 'home' | 'selection' | 'cutaway';
}

export interface GuideStep { title: string; text: string; note?: string; show?: GuideShow }

/** A short, optional walk through a model: never a gate, closable at any step. */
export interface ModelGuide {
  id: string;
  title: string;
  summary: string;
  /** the activity it belongs to */
  mode: StructureMode;
  steps: GuideStep[];
}

// ─── the model ───────────────────────────────────────────────────────────────

/** What varies in what a model shows: a design of it, and whether its deployables are out. */
export interface ModelConfig { design: unknown; deployed: boolean }

/** What the viewer needs to start a model's picture. */
export interface PictureSetup { itemCount: number; units: readonly string[]; category: Uint8Array; certainty: Uint8Array }

/** What a step of a flight sequence leaves of the vehicle. */
export interface FlightState { gone: readonly string[]; hiddenItems: readonly number[]; moved: Readonly<Record<string, readonly [number, number, number]>> }

/** The activity of changing a model's design, for a model that has one: its own panels, drawn by its own code. */
export interface ExperimentUi {
  /** the side column: the options, the comparison, the details, the hand-off */
  panels(store: StructureStore): HTMLElement[];
  /** under the picture: the verdict, the key figures and the chart, in sight with the picture */
  strip(store: StructureStore): HTMLElement;
  /** which design the picture shows, in words, and whether it is the learner's */
  badge(store: StructureStore): { text: string; mine: boolean };
  /** the units whose fitting can be changed, each named on the picture by what is fitted now, and whether that differs from the reference */
  labels(store: StructureStore): { unit: string; text: string; changed: boolean }[];
  /** the units whose part is not the reference's: marked on the picture and in the list */
  changedUnits(store: StructureStore): string[];
  /** what to say (to a screen reader) of the design now on screen */
  verdict(store: StructureStore): { key: string; text: string };
}

export interface ModelAdapter {
  readonly id: StructureModelId;
  readonly activities: readonly StructureMode[];
  readonly spec: AssemblySpec;
  readonly relations: readonly ModelRelation[];
  readonly order: readonly OrderRule[];
  readonly mounts: readonly MountPoint[];
  readonly units: readonly string[];
  /** the picture's layers: the first comes with the model, the others when something asks for them */
  readonly layers: readonly string[];
  /** which of the shared tools mean something on this model */
  readonly offers: Readonly<{ cutaway: boolean; open: boolean; deploy: boolean }>;
  /** the view it opens with, and the floor grid's size and height, m */
  readonly home: Readonly<{ az: number; el: number; margin: number; grid: number; gridY: number }>;
  /** the view's opening state: how far opened (a satellite opens with two panels off, so its inside is seen) */
  readonly opens: Readonly<{ open: number }>;

  /** its content is here: the tree, the words and the picture's numbering can be asked for */
  ready(): boolean;
  /** fetch its content (nothing to fetch for a model drawn from code); rejects with the reason */
  load(signal: AbortSignal): Promise<void>;
  /** set what it shows of what can vary; true when the picture must be made again */
  configure(config: ModelConfig): boolean;
  setup(): PictureSetup;
  /** one layer's meshes; rejects with the reason (`'structure:files-mismatch'` for files of two versions) */
  meshes(layer: string, signal: AbortSignal): Promise<ViewerMesh[]>;

  tree(): ModelTree;
  /** a node's name */
  name(nodeId: string): string;
  /** a second line beside a name in the list: a count, the option fitted */
  note(nodeId: string): string;
  /** a place's own name, and its number on the picture */
  place(slot: string): { name: string; mark: number };
  /** why a unit turned from the reference's way round does not fit */
  turnWhy(unit: string): string;
  unitOfItem(item: number): string;
  layerOfItem(item: number): string;

  /** where a unit stands while exploring: apart by `explode`, opened by `open` (each 0…1) */
  explorePose(unit: string, view: { explode: number; open: number }): Pose;
  /** a unit in a slot, turned `turn` steps from the reference's way round */
  slotPose(unit: string, slot: string, turn: number): Pose;
  /** the turn the picture gives a unit in that slot when it is the right way round, rad (a side panel on another face) */
  slotTurn(unit: string, slot: string): number;
  /** where a place is marked on the picture, m */
  slotAnchor(slot: string): readonly [number, number, number] | null;
  /** how a unit lies when it is picked up: steps from the reference's way round */
  trayTurn(unit: string): number;
  /** a unit's box seen from the side (across, up), m: the view a browser without 3-D falls back to */
  sideBox(unit: string): { x0: number; x1: number; y0: number; y1: number } | null;

  /** what stands round these parts and hides them: seen through while they are selected */
  coverOf(items: readonly number[]): number[];
  /** what the "see-through shell" tool fades */
  shell(): readonly number[];
  /** what the cutaway hides, and the azimuth to look into it from; null for a model without one */
  cutaway(): { hidden: readonly number[]; azimuth: number } | null;
  /** a relation's joint on the picture: its parts on each side, and where it is marked */
  joint(relation: ModelRelation): { a: number[]; b: number[]; at: readonly [number, number, number] | null };
  /** the joint's own name */
  jointName(relation: ModelRelation): string;

  describe(nodeId: string | null, depth: Depth, mode: StructureMode, placedSlot?: string): InfoDoc;
  systems(): ModelSystem[];
  guides(): ModelGuide[];
  /** nodes whose name, role or id holds `query` (any letter case), at most `limit` */
  search(query: string, depth: Depth, limit: number): string[];
  /** what step `k` of the flight sequence leaves; absent for a model without one */
  flight?(step: number): FlightState;
  /** the activity of changing the model's design, when it has one */
  readonly experiment?: ExperimentUi;
}

