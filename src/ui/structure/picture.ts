/**
 * What the Structure section's 3-D view must show for the state it is in
 * (src/ui/structure/store.ts): where each unit stands, each part's state
 * (drawn, seen through, selected, related, dimmed, an outline, a target),
 * which parts are painted and in what colour, which of the picture's layers
 * are needed, and the colour view. Worked out here in one place, from the
 * state alone, so the picture, the list and the panels cannot disagree, and
 * so it can be tested without a browser (tests/structure-picture.test.ts);
 * the stage only hands it to the viewer.
 */
import { FLAG, type ColorMode } from '../../render/structure-viewer';
import { occupant } from '../../structure/assembly';
import { nodeOfUnit, partnerOf, relationsOf, unitOf, unitsUnder, type ModelTree, type Pose } from '../../structure/model';
import { CERTAINTIES, PART_CATEGORIES } from '../../structure/types';
import type { ModelAdapter } from './models/types';
import type { StructureStore } from './store';

export interface Picture {
  poses: Map<string, Pose>;
  /** per part: its state bits (`FLAG`) */
  flags: Uint8Array;
  /** the paint colours in use, and per part its colour's place in them (−1: its own colour) */
  paint: { colours: string[]; of: Int8Array };
  /** the layers that must be drawn (the model's first always is) */
  layers: Set<string>;
  colour: ColorMode;
  /** the parts the view is about now (the selection, the system followed, the joint shown): what "focus" frames */
  focus: number[];
}

/** The colour changed parts are painted in the experiment. */
export const CHANGED_COLOUR = '#ffb454';

const itemsOf = (tree: ModelTree, id: string | null): readonly number[] => (id === null ? [] : tree.nodes.get(id)?.items ?? []);

/** A unit laid out for the assembly, apart from the model where it can be seen and picked up. */
export const apartPose = (adapter: ModelAdapter, unit: string): Pose => adapter.explorePose(unit, { explode: 1, open: 0 });

/** The place a loose unit's outline is drawn at: its own, or the first of its places still free. */
export function freePlace(store: StructureStore, unit: string): string | null {
  const spec = store.adapter.spec.units.find((u) => u.id === unit);
  return spec?.slots.find((s) => occupant(store.assembly, s) === null) ?? null;
}

export function picture(store: StructureStore): Picture {
  const adapter = store.adapter, tree = adapter.tree(), setup = adapter.setup();
  const n = setup.itemCount, view = store.view;
  const flags = new Uint8Array(n);
  const paintOf = new Int8Array(n).fill(-1);
  const colours: string[] = [];
  const layers = new Set<string>([adapter.layers[0]]);
  const poses = new Map<string, Pose>();
  const unitAt = (i: number): string => adapter.unitOfItem(i);
  const shown = store.shown();
  const selected = new Set(itemsOf(tree, shown?.id ?? null));
  let focus: number[] = [...selected];

  if (store.mode === 'assemble') {
    const placed = store.assembly.placed, held = store.held[store.model];
    // at a first look the outlines of what can go in now are lit: a press on one fits it
    const next = store.level === 'watch' ? new Set(store.next()) : new Set<string>();
    const state = new Map<string, number>();
    for (const unit of adapter.units) {
      if (Object.hasOwn(placed, unit)) {
        poses.set(unit, adapter.slotPose(unit, placed[unit].slot, placed[unit].orientation));
        state.set(unit, 0);
      } else if (held?.unit === unit) {
        // in hand: at the place chosen for it, as it would be fitted; while dragged and over no place, where the pointer has it
        const lying = apartPose(adapter, unit), drag = store.drag?.unit === unit ? store.drag.move : null;
        poses.set(unit, held.slot ? adapter.slotPose(unit, held.slot, held.turn)
          : drag ? { ...lying, move: [lying.move[0] + drag[0], lying.move[1] + drag[1], lying.move[2] + drag[2]] } : lying);
        state.set(unit, FLAG.selected);
      } else if (view.outline) {
        const place = freePlace(store, unit);
        poses.set(unit, place ? adapter.slotPose(unit, place, 0) : { ...apartPose(adapter, unit), visible: false });
        state.set(unit, FLAG.faint | (next.has(unit) && !held ? FLAG.target : 0));
      } else {
        poses.set(unit, apartPose(adapter, unit));
        state.set(unit, 0);
      }
    }
    for (let i = 0; i < n; i++) {
      const unit = unitAt(i);
      let f = state.get(unit) ?? 0;
      if (selected.has(i) && Object.hasOwn(placed, unit)) f |= FLAG.selected;
      flags[i] = f;
    }
    if (held) focus = setup.itemCount ? [...Array(n).keys()].filter((i) => unitAt(i) === held.unit) : [];
    return { poses, flags, paint: { colours, of: paintOf }, layers, colour: 'material', focus };
  }

  // ── exploring, or changing a design: the model as the reference puts it, looked at as the tools say
  const flight = store.flight[store.model];
  const leaves = flight !== null && adapter.flight ? adapter.flight(flight) : null;
  for (const unit of adapter.units) {
    const p = adapter.explorePose(unit, { explode: view.explode, open: view.open });
    const moved = leaves?.moved[unit];
    poses.set(unit, {
      ...p,
      move: moved ? [p.move[0] + moved[0], p.move[1] + moved[1], p.move[2] + moved[2]] : p.move,
      visible: !leaves?.gone.includes(unit),
    });
  }
  for (const [layer, on] of Object.entries(view.layers)) if (on && adapter.layers.includes(layer)) layers.add(layer);

  const hidden = new Set<number>(leaves?.hiddenItems ?? []);
  for (const id of view.hidden) for (const i of itemsOf(tree, id)) hidden.add(i);
  const alone = view.isolate ? new Set(itemsOf(tree, view.isolate)) : null;
  const cut = view.cutaway ? adapter.cutaway() : null;
  if (cut) for (const i of cut.hidden) hidden.add(i);

  // an internal system followed: its parts painted by what flows, the step in hand lit, the rest dimmed
  const following = store.system[store.model];
  const system = following ? adapter.systems().find((s) => s.id === following.id) : undefined;
  const systemItems = new Set(system?.items ?? []);
  const stepItems = new Set(system && following && following.step !== null ? system.steps[following.step]?.items ?? [] : []);
  // (a thing picked while a system is followed is what the view is about, lit among the system's parts)
  if (system) { colours.push(system.colour); if (!selected.size) focus = stepItems.size ? [...stepItems] : [...systemItems]; }

  // a joint shown: the parts that are it, on the side of the unit fitted (lit) and of the unit it is fitted to (related)
  const jointId = store.jointShown[store.model];
  const relation = jointId ? adapter.relations.find((r) => r.id === jointId) : undefined;
  const joint = relation && !system ? adapter.joint(relation) : null;
  const jointA = new Set(joint?.a ?? []), jointB = new Set(joint?.b ?? []);
  if (joint && (jointA.size || jointB.size)) focus = [...jointA, ...jointB];

  // the units related to a selected unit (or to the units a selected assembly covers)
  const related = new Set<number>();
  if (shown && !system && !joint) {
    const units = shown.tier <= 2 ? unitsUnder(tree, shown.id) : [];
    const mine = new Set(units), others = new Set<string>();
    for (const u of units) for (const r of relationsOf(adapter.relations, u)) {
      const other = partnerOf(r, u);
      if (!mine.has(other)) others.add(other);
    }
    // a thing joined to most of the rest (a satellite's power system, its frame) lights none of it: every part lit says nothing
    if (others.size * 2 <= adapter.units.length - mine.size) for (const other of others) for (const i of nodeOfUnit(tree, other)?.items ?? []) related.add(i);
  }

  // the design's changed parts, painted (the experiment)
  const changed = store.mode === 'experiment' && adapter.experiment ? new Set(adapter.experiment.changedUnits(store)) : new Set<string>();
  const changedAt = changed.size ? colours.push(CHANGED_COLOUR) - 1 : -1;

  // what stands round the thing looked at is seen through, so it can be seen where it is
  const cover = new Set(focus.length ? adapter.coverOf(focus) : []);
  // a part or a group picked inside an assembly: the rest of that assembly is seen through as well, so the thing shows
  // wherever in it it lies (a pipe among an engine's chambers)
  if (shown && !shown.unit && !system && !joint) {
    const unit = unitOf(tree, shown.id);
    if (unit) for (const i of nodeOfUnit(tree, unit)?.items ?? []) cover.add(i);
  }
  const shell = view.shell ? new Set(adapter.shell()) : null;
  const about = new Set(focus);
  // the legend's one kind or status picked out: the rest dimmed
  const [onlyKind, onlyValue] = (view.only ?? '').split(':');
  const onlyAt = onlyKind === 'category' ? PART_CATEGORIES.indexOf(onlyValue as never) : onlyKind === 'certainty' ? CERTAINTIES.indexOf(onlyValue as never) : -1;
  const kinds = onlyKind === 'category' ? setup.category : onlyKind === 'certainty' ? setup.certainty : null;

  for (let i = 0; i < n; i++) {
    let f = 0;
    if (hidden.has(i) || (alone && !alone.has(i))) f |= FLAG.hidden;
    if ((cover.has(i) || (shell?.has(i) && !about.has(i))) && !selected.has(i)) f |= FLAG.ghost;
    if (system) {
      // a system runs inside the model: everything that is not it is dimmed and seen through, so the whole of it shows
      if (systemItems.has(i)) paintOf[i] = 0;
      if (selected.size ? selected.has(i) : stepItems.has(i)) f |= FLAG.selected;
      else if (!systemItems.has(i)) f |= FLAG.dim | FLAG.ghost;
    } else if (joint) {
      if (jointA.has(i)) f |= FLAG.selected;
      else if (jointB.has(i)) f |= FLAG.related;
    } else if (selected.has(i)) f |= FLAG.selected;
    else if (related.has(i)) f |= FLAG.related;
    if (kinds && onlyAt >= 0 && kinds[i] !== onlyAt) f |= FLAG.dim;
    if (changedAt >= 0 && changed.has(unitAt(i)) && !system) paintOf[i] = changedAt;
    flags[i] = f;
  }
  // A thing looked at lies in its own layer, and that layer is drawn (fetched, the first time) — but not for a whole
  // assembly picked as such: its outside is what is looked at, and its inside stays unfetched until something asks for
  // it (a part or a group of it, a system, a joint, the cut, the see-through shell).
  const wholeAssembly = !system && !joint && shown?.tier === 1;
  if (!wholeAssembly) for (const i of focus) layers.add(adapter.layerOfItem(i));
  if ((view.cutaway || view.shell) && adapter.layers.length > 1) layers.add(adapter.layers[1]);
  return { poses, flags, paint: { colours, of: paintOf }, layers, colour: view.colour, focus };
}
