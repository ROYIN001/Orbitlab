/**
 * What the Structure section holds while it is open, and everything that
 * can be done to it: the depth, the model and activity on screen, what is
 * selected, how each model is being looked at, the assembly in hand, the
 * design being changed, what was handed on. The screens draw from it and
 * call it; it knows no screen, and no model beyond the adapters it is given
 * (src/ui/structure/models), so its rules can be tested without a browser
 * (tests/structure-store.test.ts).
 *
 * What a learner made — each model's assembly, when it was first completed,
 * "my experiment" — is kept in their profile through the app's storage
 * (src/structure/progress.ts); the rest is the visit's.
 */
import {
  checkAssembly, dependents, install, missingFor, nextUnits, occupant, remove, restart, undo,
  type AssemblyCheck, type AssemblyRefusal, type AssemblyState,
} from '../../structure/assembly';
import type { EduDesign } from '../../structure/edusat-design';
import type { HandoffPreview, HandoffReceipt, HandoffTarget, ReceiptCheck } from '../../structure/handoff';
import { atDepth, nodeOfUnit, ruleFor, unitOf, unitsUnder, type ModelNode } from '../../structure/model';
import { readProgress, writeProgress, type StructureMode, type StructureProgress } from '../../structure/progress';
import { STRUCTURE_MODELS, type Depth, type StructureModelId } from '../../structure/types';
import type { ColorMode } from '../../render/structure-viewer';
import type { StructureEnv } from './env';
import type { GuideShow, ModelAdapter, ModelGuide } from './models/types';
import { tx } from './text';

/** How one model is being looked at (the visit's; "reset" puts it back). */
export interface ViewState {
  /** how far taken apart, and how far opened (the fairing's halves, the satellite's near panels), each 0…1 */
  explode: number;
  open: number;
  cutaway: boolean;
  /** the outer shell seen through */
  shell: boolean;
  /** the picture's extra layers asked for by name */
  layers: Record<string, boolean>;
  colour: ColorMode;
  /** one kind of part, or one status, picked out of the colour view (the rest dimmed); null for all */
  only: string | null;
  /** nodes hidden one by one, and the one shown alone */
  hidden: Set<string>;
  isolate: string | null;
  labels: boolean;
  /** deployables out (the satellite's antenna) */
  deployed: boolean;
  /** assembling: the parts still loose drawn where they belong, as outlines (else laid out apart, to be picked up) */
  outline: boolean;
}

/** The part in hand while assembling: its place if one is chosen, and how many steps it is turned from the reference's way round. */
export interface Held { unit: string; slot: string | null; turn: number }

export type LoadState = { state: 'idle' | 'loading' | 'ready' } | { state: 'failed'; reason: string; contentHere: boolean };

/** Something said to the learner: put into words when drawn, so a change of language changes it; `seq` tells a repeat from a redraw. */
export interface Note { kind: 'ok' | 'no' | 'info'; text: () => string; seq: number }

/** What was last handed to Orbit or Launch: the design's key then, what the app sent, and what the destination said it held. */
export interface SentRecord { where: HandoffTarget; key: string; sent: HandoffPreview; receipt: HandoffReceipt | null; check: ReceiptCheck | null }

/** Which part of the screen a change touches: the panels are redrawn, the picture is set again, or both. */
export type Change = 'all' | 'picture' | 'panels';

export const SIDE_TABS = ['info', 'list', 'systems'] as const;
export type SideTab = typeof SIDE_TABS[number];

const freshView = (adapter: ModelAdapter, level: Depth): ViewState => ({
  explode: 0, open: adapter.opens.open, cutaway: false, shell: false, layers: {}, colour: 'material', only: null,
  hidden: new Set(), isolate: null, labels: true, deployed: false,
  // a first look assembles onto the reference's outline; from the middle depth the parts lie apart and their places are chosen
  outline: level === 'watch',
});

const each = <T>(make: (m: StructureModelId) => T): Record<StructureModelId, T> =>
  Object.fromEntries(STRUCTURE_MODELS.map((m) => [m, make(m)])) as Record<StructureModelId, T>;

export class StructureStore {
  level: Depth = 'explore';
  progress: StructureProgress;
  /** false when the stored record is a newer version's: it is left alone */
  private writable: boolean;
  /** why the learner's work is not being kept, when it is not */
  storeNote: 'damaged' | 'newer' | 'readonly' | 'failed' | null;
  readonly sel: Record<StructureModelId, string | null> = each(() => null);
  readonly views: Record<StructureModelId, ViewState>;
  readonly held: Record<StructureModelId, Held | null> = each(() => null);
  readonly tab: Record<StructureModelId, SideTab> = each(() => 'info');
  /** the internal system being followed, and its step (null: all of it) */
  readonly system: Record<StructureModelId, { id: string; step: number | null } | null> = each(() => null);
  /** the helper's guide and step, when one is open */
  readonly guide: Record<StructureModelId, { id: string; step: number } | null> = each(() => null);
  /** the step of the flight sequence the picture shows (null: the whole vehicle) */
  readonly flight: Record<StructureModelId, number | null> = each(() => null);
  /** a relation whose joint is being shown */
  readonly jointShown: Record<StructureModelId, string | null> = each(() => null);
  /** the view's switches as they were when the guide in hand began (put back when it is left) */
  private readonly guideBefore: Record<StructureModelId, Record<string, unknown> | null> = each(() => null);
  readonly load: Record<StructureModelId, LoadState> = each(() => ({ state: 'idle' }));
  readonly layerState: Record<StructureModelId, Map<string, 'loading' | 'ready' | { failed: string }>> = each(() => new Map());
  /** the parts list's search words, and the rows opened */
  filter = '';
  readonly expanded = new Set<string>();
  message: Note | null = null;
  sendNote: Note | null = null;
  sent: SentRecord | null = null;
  /** a part being dragged on the picture (the visit's): how far it is from where it lay, m */
  drag: { unit: string; move: readonly [number, number, number] } | null = null;
  /** asked of the screen once and then cleared: move the view (to the selection, home, the cutaway's side, an assembly laid out) */
  camera: 'selection' | 'home' | 'cutaway' | 'joint' | null = null;
  /** where the focus goes after the next redraw, when the control pressed is gone (a `data-k`) */
  focusNext: string | null = null;
  private seq = 0;
  /** the view was brought close to a place chosen for the part in hand: the next part picked up, or this one put down, brings back the whole */
  private closeUp = false;
  private readonly listeners = new Set<(change: Change) => void>();

  constructor(readonly env: StructureEnv, readonly adapters: Record<StructureModelId, ModelAdapter>) {
    const read = readProgress(env.storage.read(), each((m) => adapters[m].spec));
    this.progress = read.progress;
    this.writable = read.writable;
    this.storeNote = read.note;
    this.views = each((m) => freshView(adapters[m], this.level));
    // an activity a model does not have is not kept as its last one
    for (const m of STRUCTURE_MODELS) if (!adapters[m].activities.includes(this.progress.mode[m])) this.progress.mode[m] = 'explore';
    env.storage.onFlush(() => this.save());
  }

  // ─── what is on screen ────────────────────────────────────────────────────

  get model(): StructureModelId { return this.progress.model; }
  get adapter(): ModelAdapter { return this.adapters[this.model]; }
  get mode(): StructureMode { return this.progress.mode[this.model]; }
  get view(): ViewState { return this.views[this.model]; }
  get assembly(): AssemblyState { return this.progress.assembly[this.model]; }
  get ready(): boolean { return this.adapter.ready(); }

  on(listener: (change: Change) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(change: Change = 'all'): void { for (const l of this.listeners) l(change); }

  private note(kind: Note['kind'], text: () => string): Note { return { kind, text, seq: ++this.seq }; }

  /**
   * The section opened at an address: its depth, and the model and activity
   * when the address names them (an activity the model lacks is not taken).
   */
  open(level: Depth, model?: StructureModelId, mode?: StructureMode): void {
    const depthChanged = level !== this.level;
    this.level = level;
    if (depthChanged) this.fitViewsToDepth();
    let changed = false;
    // (what was last said of one model's assembly is not said under the other's)
    if (model && model !== this.progress.model) { this.progress.model = model; changed = true; this.message = null; }
    const m = this.progress.model;
    if (mode && this.adapters[m].activities.includes(mode) && mode !== this.progress.mode[m]) this.enter(mode);
    else if (changed) this.save();
    // assembling at a first look starts on the reference's outline; deeper, with the parts laid out (until the learner says otherwise)
    if (depthChanged && !Object.keys(this.assembly.placed).length) this.view.outline = level === 'watch';
  }

  /**
   * A depth shows the picture only in ways it has a tool for: what a deeper
   * depth switched on and this one cannot switch off is put back (a first
   * look has no colour view, see-through shell, hiding or layers by name; the
   * colouring by how a shape is known belongs to the deepest). And it holds a
   * part in its own way, so nothing stays in hand across the change.
   */
  private fitViewsToDepth(): void {
    // (a part in hand is put down: a first look holds it at its place, deeper its place is still to choose)
    this.drag = null;
    for (const m of STRUCTURE_MODELS) {
      const v = this.views[m];
      this.held[m] = null;
      if (this.level === 'engineer') continue;
      v.layers = {};
      if (v.colour === 'certainty') { v.colour = 'material'; v.only = null; }
      if (this.level !== 'watch') continue;
      v.colour = 'material';
      v.only = null;
      v.shell = false;
      v.hidden.clear();
      v.isolate = null;
      // taken apart and opened are switches here, sliders deeper
      v.explode = v.explode > 0.5 ? 1 : 0;
      v.open = v.open > 0.5 ? 1 : 0;
    }
  }

  /** Go to a model, an activity or a depth: an address of the section, so Back returns. */
  go(to: { level?: Depth; model?: StructureModelId; mode?: StructureMode }): void {
    const model = to.model ?? this.model;
    const mode = to.mode ?? this.progress.mode[model];
    this.env.go(to.level ?? this.level, model, this.adapters[model].activities.includes(mode) ? mode : 'explore');
  }

  href(to: { level?: Depth; model?: StructureModelId; mode?: StructureMode }): string {
    const model = to.model ?? this.model;
    const mode = to.mode ?? this.progress.mode[model];
    return this.env.href(to.level ?? this.level, model, this.adapters[model].activities.includes(mode) ? mode : 'explore');
  }

  /** Enter an activity of the model on screen (what `open` and a guide's step do). */
  private enter(mode: StructureMode): void {
    const adapter = this.adapter;
    if (!adapter.activities.includes(mode)) return;
    const was = this.mode;
    this.progress.mode[this.model] = mode;
    if (mode === 'experiment' && !this.progress.experiment) this.progress.showing = 'reference';
    this.message = null;
    if (was !== mode) {
      // each activity starts from its own clear picture: nothing left selected, held, followed or flown from the last
      this.held[this.model] = null;
      this.drag = null;
      this.system[this.model] = null;
      this.flight[this.model] = null;
      this.jointShown[this.model] = null;
      if (mode === 'experiment' || was === 'assemble') this.sel[this.model] = null;
      this.camera = 'home';
    }
    this.save();
  }

  // ─── the selection ────────────────────────────────────────────────────────

  /** The selection as the depth shows it: the thing itself, or its nearest ancestor the depth reaches. */
  shown(): ModelNode | null {
    return this.ready ? atDepth(this.adapter.tree(), this.sel[this.model], this.level) : null;
  }

  /** Select a node (null: nothing). `focus`: turn the view to it. */
  select(id: string | null, focus = false): void {
    this.sel[this.model] = id;
    this.jointShown[this.model] = null;
    if (id !== null) this.reveal(id);
    if (id !== null && this.tab[this.model] === 'systems') this.tab[this.model] = 'info';
    if (focus && id !== null) this.camera = 'selection';
    this.emit();
  }

  /** A press on the picture's item: the node the depth picks for it. */
  pick(item: number | null): void {
    if (!this.ready) return;
    if (item === null) { this.select(null); return; }
    const tree = this.adapter.tree();
    // the selection is kept in its most specific form; the depth shows it at its own grain
    this.select(tree.leafOf[item] ?? null);
  }

  /** The units the selection covers. */
  selectedUnits(): string[] {
    const n = this.shown();
    return n ? unitsUnder(this.adapter.tree(), n.id) : [];
  }

  // ─── looking ──────────────────────────────────────────────────────────────

  setView(patch: Partial<ViewState>, change: Change = 'all'): void {
    Object.assign(this.view, patch);
    this.emit(change);
  }

  resetView(): void {
    this.views[this.model] = { ...freshView(this.adapter, this.level), outline: this.view.outline };
    this.sel[this.model] = null;
    this.system[this.model] = null;
    this.flight[this.model] = null;
    this.jointShown[this.model] = null;
    this.camera = 'home';
    this.emit();
  }

  /** The parts hidden one by one: those of every hidden node. */
  hiddenItems(): Set<number> {
    const out = new Set<number>();
    if (!this.ready) return out;
    const tree = this.adapter.tree();
    for (const id of this.view.hidden) for (const i of tree.nodes.get(id)?.items ?? []) out.add(i);
    return out;
  }

  /** A row's eye: 'own' when the node itself was hidden, 'by' when every part of it is hidden by other rows, else null. */
  hiddenState(id: string, hidden = this.hiddenItems()): 'own' | 'by' | null {
    if (this.view.hidden.has(id)) return 'own';
    const items = this.ready ? this.adapter.tree().nodes.get(id)?.items ?? [] : [];
    return items.length && items.every((i) => hidden.has(i)) ? 'by' : null;
  }

  /**
   * Make sure a node is drawn: nothing shown alone that it lies outside of,
   * and no hidden node over any of its parts. What such a node hid besides
   * stays hidden, as the largest nodes that hold none of this one's parts.
   */
  private reveal(id: string): void {
    if (!this.ready) return;
    const tree = this.adapter.tree(), v = this.view, node = tree.nodes.get(id);
    if (!node) return;
    const mine = new Set(node.items);
    if (v.isolate) {
      const alone = new Set(tree.nodes.get(v.isolate)?.items ?? []);
      if (!node.items.every((i) => alone.has(i))) v.isolate = null;
    }
    const over = [...v.hidden].filter((h) => (tree.nodes.get(h)?.items ?? []).some((i) => mine.has(i)));
    if (!over.length) return;
    const rest = new Set<number>();
    for (const h of over) { v.hidden.delete(h); for (const i of tree.nodes.get(h)!.items) if (!mine.has(i)) rest.add(i); }
    const walk = (ids: readonly string[]): void => {
      for (const k of ids) {
        const n = tree.nodes.get(k)!;
        const inside = n.items.filter((i) => rest.has(i)).length;
        if (!inside) continue;
        if (inside === n.items.length) v.hidden.add(k); else walk(tree.children.get(k) ?? []);
      }
    };
    walk(tree.roots);
  }

  /** Hide a node, or show it again (one hidden by other rows is shown by itself: what else they hid stays hidden). */
  toggleHidden(id: string): void {
    const h = this.view.hidden, state = this.hiddenState(id);
    if (state === 'own') h.delete(id);
    else if (state === 'by') this.reveal(id);
    else h.add(id);
    // what is hidden is not left selected, nor its joint shown
    const sel = this.sel[this.model], hidden = this.hiddenItems();
    const items = sel && this.ready ? this.adapter.tree().nodes.get(sel)?.items ?? [] : [];
    if (sel && items.length && items.every((i) => hidden.has(i))) { this.sel[this.model] = null; this.jointShown[this.model] = null; }
    this.emit();
  }

  showAll(): void {
    this.view.hidden.clear();
    this.view.isolate = null;
    this.emit();
  }

  /** Follow an internal system (null: none), at one of its steps or all of it. */
  showSystem(id: string | null, step: number | null = null): void {
    this.system[this.model] = id === null ? null : { id, step };
    // the view goes to what is followed: the whole system, then each step's own parts as it is stepped through
    if (id !== null) { this.tab[this.model] = 'systems'; this.sel[this.model] = null; this.flight[this.model] = null; this.jointShown[this.model] = null; this.camera = 'selection'; }
    this.emit();
  }

  /** Show a relation's joint on the picture (null: stop). */
  showJoint(relationId: string | null): void {
    this.jointShown[this.model] = relationId;
    if (relationId) this.camera = 'joint';
    this.emit();
  }

  // ─── the helper ───────────────────────────────────────────────────────────

  guides(): ModelGuide[] { return this.ready ? this.adapter.guides() : []; }

  activeGuide(): { guide: ModelGuide; step: number } | null {
    const g = this.guide[this.model];
    const guide = g && this.guides().find((x) => x.id === g.id);
    return guide && g ? { guide, step: Math.max(0, Math.min(guide.steps.length - 1, g.step)) } : null;
  }

  setGuideOpen(open: boolean): void {
    this.progress.guide = open;
    if (!open) this.leaveGuide();
    this.save();
    this.emit();
  }

  /**
   * A guide left (finished, or the helper closed): what its steps put on the
   * picture is taken off again — the system followed, the flight step, the
   * joint, and the view's switches its steps set, back to what they were
   * when it began.
   */
  private leaveGuide(): void {
    const g = this.guide[this.model];
    this.guide[this.model] = null;
    this.flight[this.model] = null;
    if (!g) return;
    this.system[this.model] = null;
    this.jointShown[this.model] = null;
    const before = this.guideBefore[this.model];
    this.guideBefore[this.model] = null;
    const guide = this.guides().find((x) => x.id === g.id);
    if (before && guide) {
      const view = this.view as unknown as Record<string, unknown>;
      for (const step of guide.steps) for (const key of Object.keys(step.show?.view ?? {})) view[key] = before[key];
    }
    this.camera = 'home';
  }

  /** Start a guide, or move in it; each step shows itself (the learner can still do anything else). */
  guideStep(id: string, step: number): void {
    const guide = this.guides().find((g) => g.id === id);
    if (!guide) return;
    const k = Math.max(0, Math.min(guide.steps.length - 1, step));
    if (this.guide[this.model]?.id !== id) { this.leaveGuide(); this.guideBefore[this.model] = { ...this.view }; }
    this.guide[this.model] = { id, step: k };
    this.applyShow(guide.steps[k].show);
    this.emit();
  }

  endGuide(): void {
    this.leaveGuide();
    this.emit();
  }

  /** Put on the picture what a guide's step shows. */
  private applyShow(show: GuideShow | undefined): void {
    if (!show) return;
    if (show.mode && show.mode !== this.mode) { this.enter(show.mode); this.env.go(this.level, this.model, show.mode); }
    if (show.view) Object.assign(this.view, show.view);
    // a step shows one thing: not a joint left from before it
    this.jointShown[this.model] = null;
    if (show.select !== undefined) { this.sel[this.model] = show.select; if (show.select !== null) this.reveal(show.select); }
    if (show.system !== undefined) this.system[this.model] = show.system;
    if (show.flight !== undefined) this.flight[this.model] = show.flight;
    if (show.camera) this.camera = show.camera;
  }

  // ─── assembling ───────────────────────────────────────────────────────────

  unitName(unit: string): string {
    const node = this.ready ? nodeOfUnit(this.adapter.tree(), unit) : null;
    return node ? this.adapter.name(node.id) : unit;
  }

  private names(units: readonly string[]): string { return units.map((u) => this.unitName(u)).join(', '); }

  check(): AssemblyCheck { return checkAssembly(this.adapter.spec, this.assembly); }

  /** The units that can go in now, and for one that cannot, what it waits for and why. */
  next(): string[] { return nextUnits(this.adapter.spec, this.assembly); }

  waitsFor(unit: string): { unit: string; why: string }[] {
    return missingFor(this.adapter.spec, this.assembly, unit).map((m) => ({ unit: m, why: tx(ruleFor(this.adapter.order, unit, m)?.why ?? 'asm.why.order') }));
  }

  refusalText(r: AssemblyRefusal): string {
    const a = this.adapter;
    switch (r.code) {
      case 'missing': {
        const why = ruleFor(a.order, r.unit, r.missing[0]);
        return tx('asm.no.missing', { unit: this.unitName(r.unit), missing: this.names(r.missing), why: why ? tx(why.why) : tx('asm.why.order') });
      }
      case 'wrongSlot':
        return tx('asm.no.wrongSlot', { unit: this.unitName(r.unit), slot: a.place(r.slot).name, expected: r.expected.map((s) => a.place(s).name).join(', ') });
      case 'wrongOrientation': return tx('asm.no.wrongOrientation', { why: a.turnWhy(r.unit) });
      case 'slotTaken': return tx('asm.no.slotTaken', { slot: a.place(r.slot).name, by: this.unitName(r.by) });
      case 'alreadyPlaced': return tx('asm.no.alreadyPlaced', { unit: this.unitName(r.unit) });
      case 'holds': return tx('asm.no.holds', { unit: this.unitName(r.unit), dependents: this.names(r.dependents) });
      case 'notPlaced': return tx('asm.no.notPlaced', { unit: this.unitName(r.unit) });
      case 'nothingToUndo': return tx('asm.no.nothingToUndo');
      default: return tx('asm.no.unknown');
    }
  }

  private setAssembly(next: AssemblyState): void {
    this.progress.assembly[this.model] = next;
    if (checkAssembly(this.adapter.spec, next).complete && !this.progress.completed[this.model]) this.progress.completed[this.model] = new Date().toISOString();
    this.save();
  }

  /**
   * Pick a loose unit up (null, or the unit already in hand: put it down). At
   * a first look it is held the right way round at its own place, ready to be
   * fitted; deeper, as it lies, with its place still to choose.
   */
  hold(unit: string | null): void {
    const now = this.held[this.model];
    // after a close look at a place, the whole again: the other places are on the picture to choose from
    if (this.closeUp) { this.closeUp = false; this.camera = 'home'; }
    if (unit === null || now?.unit === unit || Object.hasOwn(this.assembly.placed, unit)) {
      this.held[this.model] = null;
    } else {
      const guided = this.level === 'watch';
      const own = this.adapter.spec.units.find((u) => u.id === unit)?.slots.find((s) => occupant(this.assembly, s) === null) ?? null;
      this.held[this.model] = { unit, slot: guided ? own : null, turn: guided ? 0 : this.adapter.trayTurn(unit) };
      this.sel[this.model] = null;
    }
    this.message = null;
    this.emit();
  }

  /**
   * Take a loose unit in hand to drag it on the picture: it follows the
   * pointer (`dragTo`) until it is let go of (`dragEnd`). False for a unit
   * that is already fitted.
   */
  dragStart(unit: string): boolean {
    if (this.mode !== 'assemble' || Object.hasOwn(this.assembly.placed, unit) || !this.adapter.units.includes(unit)) return false;
    if (this.held[this.model]?.unit !== unit) { this.held[this.model] = null; this.hold(unit); }
    const h = this.held[this.model];
    if (!h) return false;
    h.slot = null;
    this.drag = { unit, move: [0, 0, 0] };
    this.emit();
    return true;
  }

  /** The dragged unit moved, and the free place it is over now (null: none near): it is shown there, as it would be fitted. */
  dragTo(move: readonly [number, number, number], slot: string | null): void {
    const h = this.held[this.model];
    if (!this.drag || !h) return;
    this.drag = { unit: this.drag.unit, move };
    const changed = h.slot !== slot;
    h.slot = slot;
    // the bar names the place: redrawn only when the place changes, the picture on every move
    this.emit(changed ? 'all' : 'picture');
  }

  /** The dragged unit let go of: fitted where it was held over a place (or refused there, with the reason, still in hand); put down anywhere else. */
  dragEnd(dropped: boolean): void {
    if (!this.drag) return;
    this.drag = null;
    if (dropped && this.held[this.model]?.slot) this.install();
    else this.hold(null);
  }

  chooseSlot(slot: string): void {
    const h = this.held[this.model];
    if (!h) return;
    h.slot = slot;
    this.camera = 'joint';
    this.closeUp = true;
    this.emit();
  }

  /** Turn the unit in hand one step. */
  turn(): void {
    const h = this.held[this.model];
    const of = h && this.adapter.spec.units.find((u) => u.id === h.unit)?.orientations;
    if (!h || !of || of < 2) return;
    h.turn = (h.turn + 1) % of;
    this.emit();
  }

  /** Fit the unit in hand where and as it is held. */
  install(): void {
    const h = this.held[this.model];
    if (!h) return;
    if (!h.slot) { this.message = this.note('info', () => tx('asm.choosePlace')); this.emit(); return; }
    const spec = this.adapter.spec;
    const of = spec.units.find((u) => u.id === h.unit)?.orientations ?? 1;
    const r = install(spec, this.assembly, h.unit, { slot: h.slot, orientation: h.turn % of });
    if (r.ok) {
      this.setAssembly(r.state);
      this.held[this.model] = null;
      const made = this.adapter.relations.filter((x) => x.a === h.unit && Object.hasOwn(r.state.placed, x.b) && x.kind === 'mounts');
      this.message = this.note('ok', () => (made.length
        ? tx('asm.installedAt', { unit: this.unitName(h.unit), joint: this.adapter.jointName(made[0]) })
        : tx('asm.installed', { unit: this.unitName(h.unit) })));
      this.sel[this.model] = nodeOfUnit(this.adapter.tree(), h.unit)?.id ?? null;
      const complete = this.check().complete;
      this.focusNext = complete ? 'asm-done' : 'asm-next';
      // The view goes back to the whole once a place was chosen and looked at closely (from the middle depth), ready for
      // the next part's places, and when the assembly is complete. A first look fits parts on the outline without moving the view.
      if (complete || this.level !== 'watch') this.camera = 'home';
      this.closeUp = false;
    } else this.message = this.note('no', () => this.refusalText(r.refusal));
    this.emit();
  }

  /** Pick a unit up and fit it at once, where it can only go one way (a first look's single press). */
  fit(unit: string): void {
    this.held[this.model] = null;
    this.hold(unit);
    const h = this.held[this.model];
    if (h?.slot) this.install();
  }

  /** Take a fitted unit off. */
  remove(unit: string): void {
    const r = remove(this.adapter.spec, this.assembly, unit);
    if (r.ok) {
      this.setAssembly(r.state);
      this.message = this.note('ok', () => tx('asm.removed', { unit: this.unitName(unit) }));
      this.sel[this.model] = null;
      this.focusNext = `tray:${unit}`;
    } else this.message = this.note('no', () => this.refusalText(r.refusal));
    this.emit();
  }

  /** What rests on a fitted unit: why it cannot come off yet. */
  restsOn(unit: string): string[] { return dependents(this.adapter.spec, this.assembly, unit); }

  undo(): void {
    const r = undo(this.assembly);
    if (r.ok) {
      this.setAssembly(r.state);
      this.message = this.note('info', () => tx('asm.undone'));
      // what the step taken back had taken off is fitted again: it is not also in hand
      const h = this.held[this.model];
      if (h && Object.hasOwn(r.state.placed, h.unit)) { this.held[this.model] = null; this.drag = null; if (this.closeUp) { this.closeUp = false; this.camera = 'home'; } }
    } else this.message = this.note('no', () => this.refusalText(r.refusal));
    this.emit();
  }

  restart(): void {
    this.setAssembly(restart(this.assembly));
    this.held[this.model] = null;
    this.drag = null;
    // begun again as this depth begins: on the reference's outline at a first look, the parts laid out deeper
    this.view.outline = this.level === 'watch';
    this.message = this.note('info', () => tx('asm.restarted'));
    this.camera = 'home';
    this.emit();
  }

  /** A hint: what can go in next, held ready when there is only one such thing to say. */
  hint(): void {
    const next = this.next();
    if (!next.length) return;
    const unit = next[0];
    this.message = this.note('info', () => tx('asm.hint', { unit: this.unitName(unit), place: this.adapter.place(this.adapter.spec.units.find((u) => u.id === unit)!.slots[0]).name }));
    this.emit();
  }

  /** The unit a fitted or loose thing on the picture is. */
  unitAt(item: number): string { return this.adapter.unitOfItem(item); }

  // ─── the design being changed ─────────────────────────────────────────────

  /** The learner's design is on the picture (only ever in the experiment; every other activity shows the reference). */
  get showingMine(): boolean { return this.mode === 'experiment' && this.progress.showing === 'mine' && !!this.progress.experiment; }

  /** The design the picture shows now, or null for the reference. */
  pictureDesign(): EduDesign | null { return this.showingMine ? this.progress.experiment : null; }

  /** Make "my experiment" if there is none (a copy of `reference`), and show it. */
  makeExperiment(reference: EduDesign): void {
    if (!this.progress.experiment) this.progress.experiment = { ...reference };
    this.progress.showing = 'mine';
    this.sendNote = null;
    this.save();
    this.emit();
  }

  setExperiment(design: EduDesign): void {
    this.progress.experiment = { ...design };
    this.progress.showing = 'mine';
    this.sendNote = null;
    this.save();
    this.emit();
  }

  showDesign(which: 'mine' | 'reference'): void {
    if (which === 'mine' && !this.progress.experiment) return;
    this.progress.showing = which;
    this.sendNote = null;
    this.save();
    this.emit();
  }

  noteSend(kind: Note['kind'], text: () => string): void { this.sendNote = this.note(kind, text); }

  // ─── keeping ──────────────────────────────────────────────────────────────

  /** Keep the progress now: every change is a learner's press, few and small, and a reload right after one must not lose it. */
  save(): void {
    if (!this.writable) return;
    const wrote = this.env.storage.write(writeProgress(this.progress));
    const before = this.storeNote;
    if (wrote === 'ok') { if (this.storeNote === 'failed' || this.storeNote === 'readonly') this.storeNote = null; }
    else this.storeNote = wrote;
    if (before !== this.storeNote) this.emit('panels');
  }

  /** The unit a node is or lies in (for the lists that name a part's unit). */
  unitOfNode(id: string): string | null { return this.ready ? unitOf(this.adapter.tree(), id) : null; }
}
