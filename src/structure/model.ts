/**
 * What every model of the Structure section is described by, whatever it is
 * made from (a page's files, or a parts list in the code): a tree of the
 * things it can show at the three depths, how its units meet, the order they
 * go together in and why, and the places they mount at. One description
 * serves the picture, the list, the information panel, the assembly's rules
 * and its hints, so they cannot say different things; a new model is a new
 * description (src/structure/soyuz.ts and src/structure/edusat.ts are the two
 * there are), not new cases in the screens.
 *
 * DOM-free.
 */
import type { AssemblySpec, AssemblyState } from './assembly';
import type { Certainty, Depth, PartCategory } from './types';

// ─── the tree ────────────────────────────────────────────────────────────────

/**
 * How deep a node lies: 1, the model's main assemblies (what the first depth
 * shows and picks); 2, their subsystems or boards; 3, single parts.
 */
export type Tier = 1 | 2 | 3;

/** The deepest tier a depth shows and picks. */
export const TIER_OF_DEPTH: Readonly<Record<Depth, Tier>> = { watch: 1, explore: 2, engineer: 3 };

/** One thing of a model: an assembly, a subsystem, a part. */
export interface ModelNode {
  /** permanent id, unique in its model; never reused for another thing */
  id: string;
  /** the node it belongs to, or null for a main assembly */
  parent: string | null;
  tier: Tier;
  /** the picture's parts it covers (the viewer's item indices) */
  items: readonly number[];
  /**
   * The unit it is, when it is one: the thing the picture moves as a whole
   * and the assembly activity installs. A model's units all lie on one tier.
   */
  unit?: string;
  category?: PartCategory;
  certainty?: Certainty;
}

/** A model's nodes, by id, with each node's children in the model's own order. */
export interface ModelTree {
  nodes: ReadonlyMap<string, ModelNode>;
  roots: readonly string[];
  children: ReadonlyMap<string, readonly string[]>;
  /** per item: its deepest node (a part's, or its group's where a model has no part nodes for it) */
  leafOf: readonly string[];
}

/** Build a tree from its nodes (each parent before its children is not required). */
export function buildTree(nodes: readonly ModelNode[], itemCount: number): ModelTree {
  const map = new Map<string, ModelNode>();
  for (const n of nodes) {
    if (map.has(n.id)) throw new Error(`model tree: ${n.id} appears twice`);
    map.set(n.id, n);
  }
  const children = new Map<string, string[]>();
  const roots: string[] = [];
  for (const n of nodes) {
    if (n.parent === null) { roots.push(n.id); continue; }
    const p = map.get(n.parent);
    if (!p) throw new Error(`model tree: ${n.id} has no parent ${n.parent}`);
    if (p.tier >= n.tier) throw new Error(`model tree: ${n.id} (tier ${n.tier}) lies under ${p.id} (tier ${p.tier})`);
    children.set(n.parent, [...(children.get(n.parent) ?? []), n.id]);
  }
  // an item's leaf is its deepest node; nodes are given coarse to fine or not, so the deepest tier wins
  const leafOf: string[] = new Array<string>(itemCount).fill('');
  const depth = new Uint8Array(itemCount);
  for (const n of nodes) for (const i of n.items) {
    if (i < 0 || i >= itemCount) throw new Error(`model tree: ${n.id} names item ${i} of ${itemCount}`);
    if (n.tier > depth[i]) { depth[i] = n.tier; leafOf[i] = n.id; }
  }
  for (let i = 0; i < itemCount; i++) if (!leafOf[i]) throw new Error(`model tree: item ${i} belongs to no node`);
  return { nodes: map, roots, children, leafOf };
}

/** A node's ancestors from the root down to itself. */
export function pathOf(tree: ModelTree, id: string): ModelNode[] {
  const path: ModelNode[] = [];
  for (let n = tree.nodes.get(id); n; n = n.parent === null ? undefined : tree.nodes.get(n.parent)) path.unshift(n);
  return path;
}

/**
 * The node a depth shows for `id`: itself, or its nearest ancestor the depth
 * reaches. So a selection is kept in its most specific form, and read at the
 * grain of the depth on screen.
 */
export function atDepth(tree: ModelTree, id: string | null, depth: Depth): ModelNode | null {
  if (id === null) return null;
  const max = TIER_OF_DEPTH[depth];
  let shown: ModelNode | null = null;
  for (const n of pathOf(tree, id)) if (n.tier <= max) shown = n;
  return shown;
}

/** The node a press on `item` picks at a depth. */
export const pickAt = (tree: ModelTree, item: number, depth: Depth): ModelNode | null => atDepth(tree, tree.leafOf[item] ?? null, depth);

/** The unit a node is, or lies in (its nearest ancestor that is one); null for a node above the units. */
export function unitOf(tree: ModelTree, id: string): string | null {
  const path = pathOf(tree, id);
  for (let k = path.length - 1; k >= 0; k--) if (path[k].unit) return path[k].unit!;
  return null;
}

/** The units a node covers: itself, or every unit under it. */
export function unitsUnder(tree: ModelTree, id: string): string[] {
  const own = unitOf(tree, id);
  if (own) return [own];
  const out: string[] = [];
  const walk = (n: string): void => {
    const node = tree.nodes.get(n);
    if (node?.unit) { out.push(node.unit); return; }
    for (const c of tree.children.get(n) ?? []) walk(c);
  };
  walk(id);
  return out;
}

/** The node that is `unit`. */
export function nodeOfUnit(tree: ModelTree, unit: string): ModelNode | null {
  for (const n of tree.nodes.values()) if (n.unit === unit) return n;
  return null;
}

// ─── how units meet, and the order they go together in ───────────────────────

/** What a relation carries, for the relations picture: load, electrical power, data, radio signal. */
export type RelationMedium = 'structure' | 'power' | 'data' | 'rf';

/**
 * How two units meet. `a` is fitted to `b` (`mounts`), is wired or piped to
 * it (`connects`), or closes round it (`encloses`). `joint` is the text key of
 * the joint's own name.
 */
export interface ModelRelation {
  id: string;
  a: string;
  b: string;
  kind: 'mounts' | 'connects' | 'encloses';
  medium: RelationMedium;
  joint: string;
}

/**
 * Why a unit waits for another: `unit` goes in only after `after`, for the
 * reason `why` (a text key). The assembly's order is these rules and nothing
 * else, so a refusal can always quote its reason.
 */
export interface OrderRule {
  unit: string;
  after: string;
  why: string;
}

/** The units `unit` waits for. */
export const requiresOf = (rules: readonly OrderRule[], unit: string): string[] => rules.filter((r) => r.unit === unit).map((r) => r.after);

/** The rule that makes `unit` wait for `after`. */
export const ruleFor = (rules: readonly OrderRule[], unit: string, after: string): OrderRule | undefined => rules.find((r) => r.unit === unit && r.after === after);

/** The relations a unit takes part in. */
export const relationsOf = (relations: readonly ModelRelation[], unit: string): ModelRelation[] => relations.filter((r) => r.a === unit || r.b === unit);

/** The other end of a relation. */
export const partnerOf = (r: ModelRelation, unit: string): string => (r.a === unit ? r.b : r.a);

/** A relation is made once both its ends are in place. */
export interface RelationStatus { relation: ModelRelation; made: boolean }

export function relationStatus(relations: readonly ModelRelation[], state: AssemblyState): RelationStatus[] {
  return relations.map((relation) => ({ relation, made: Object.hasOwn(state.placed, relation.a) && Object.hasOwn(state.placed, relation.b) }));
}

/**
 * A model's relations and order held to its units and to each other: every
 * end is a unit; no relation or rule is doubled; a unit that mounts on
 * another waits for it (so what is drawn as carried is never fitted before
 * what carries it); and the spec's `requires` are exactly the rules'.
 */
export function relationProblems(units: readonly string[], relations: readonly ModelRelation[], rules: readonly OrderRule[], spec: AssemblySpec): string[] {
  const problems: string[] = [];
  const known = new Set(units);
  const seen = new Set<string>();
  for (const r of relations) {
    if (!known.has(r.a) || !known.has(r.b)) problems.push(`${r.id}: an end is not a unit`);
    if (r.a === r.b) problems.push(`${r.id}: a unit related to itself`);
    if (seen.has(r.id)) problems.push(`${r.id}: appears twice`);
    seen.add(r.id);
  }
  const ruled = new Set<string>();
  for (const r of rules) {
    if (!known.has(r.unit) || !known.has(r.after)) problems.push(`order ${r.unit} after ${r.after}: not units`);
    if (!r.why) problems.push(`order ${r.unit} after ${r.after}: no reason`);
    const key = `${r.unit}>${r.after}`;
    if (ruled.has(key)) problems.push(`order ${key}: appears twice`);
    ruled.add(key);
  }
  /** `unit` waits for `after`, directly or through others. */
  const waitsFor = (unit: string, after: string, guard = 0): boolean =>
    guard < units.length && requiresOf(rules, unit).some((x) => x === after || waitsFor(x, after, guard + 1));
  for (const r of relations) if (r.kind === 'mounts' && !waitsFor(r.a, r.b)) problems.push(`${r.id}: ${r.a} mounts on ${r.b} but does not wait for it`);
  for (const u of spec.units) {
    const want = requiresOf(rules, u.id).slice().sort().join(',');
    if (u.requires.slice().sort().join(',') !== want) problems.push(`${u.id}: requires [${u.requires.join(', ')}], the order rules say [${want}]`);
  }
  return problems;
}

// ─── the places units mount at ───────────────────────────────────────────────

/**
 * A place of the assembly, as the learner is shown it: named for where it
 * is, not for the part that goes there (`name`, a text key), with a number
 * that marks it on the picture and in the list.
 */
export interface MountPoint {
  /** the assembly spec's slot id */
  slot: string;
  mark: number;
  name: string;
}

/** A turn of `angle` (rad) about `axis` through `pivot` (m). */
export interface Turn { axis: 'x' | 'y' | 'z'; angle: number; pivot: readonly [number, number, number] }

/**
 * Where a unit stands in the picture: turned by `turns`, one after another
 * (the first is done first), then moved by `move` (m); shown or not.
 */
export interface Pose {
  move: readonly [number, number, number];
  turns?: readonly Turn[];
  visible: boolean;
}

export const REST: Pose = Object.freeze({ move: Object.freeze([0, 0, 0]) as readonly [number, number, number], visible: true });
