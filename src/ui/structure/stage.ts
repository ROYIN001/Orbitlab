/**
 * The Structure section's stage: the 3-D view of the model on screen, what
 * is laid over it (names, places, the scale, the legend) and the bar under
 * it. It fetches a model's files when the model is first shown and its
 * further layers when something asks for them, hands the viewer the picture
 * the state calls for (src/ui/structure/picture.ts), and moves the camera
 * when the state asks it to. Leaving the section cancels its fetches and
 * frees the model's GPU resources; the viewer and its WebGL context stay for
 * the next visit.
 */
import * as THREE from 'three';
import { StructureViewer, FLAG, type ViewerMesh } from '../../render/structure-viewer';
import { occupant } from '../../structure/assembly';
import { nodeOfUnit, unitOf, type Pose } from '../../structure/model';
import type { StructureModelId } from '../../structure/types';
import { sideView, type SideBox } from './charts';
import { button, el, reducedMotion } from './dom';
import { FILES_MISMATCH } from './models/soyuz';
import { StageOverlay } from './overlay';
import { CATEGORY_COLOURS, CERTAINTY_COLOURS } from './palette';
import { picture, type Picture } from './picture';
import type { StructureStore } from './store';
import { tx } from './text';

/** A pose as the viewer's matrix: the turns, one after another, then the move. */
export function poseMatrix(pose: Pose): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  for (const t of pose.turns ?? []) {
    const r = t.axis === 'x' ? new THREE.Matrix4().makeRotationX(t.angle) : t.axis === 'y' ? new THREE.Matrix4().makeRotationY(t.angle) : new THREE.Matrix4().makeRotationZ(t.angle);
    const about = new THREE.Matrix4().makeTranslation(t.pivot[0], t.pivot[1], t.pivot[2]).multiply(r).multiply(new THREE.Matrix4().makeTranslation(-t.pivot[0], -t.pivot[1], -t.pivot[2]));
    m.premultiply(about);
  }
  return m.premultiply(new THREE.Matrix4().makeTranslation(pose.move[0], pose.move[1], pose.move[2]));
}

/** Why a fetch failed, as the store keeps it: offline, the files' versions apart, or the browser's own message. */
const reasonOf = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  return message === FILES_MISMATCH ? 'mismatch' : message;
};
export const reasonText = (reason: string): string => (reason === 'offline' ? tx('load.offline') : reason === 'mismatch' ? tx('load.mismatch') : reason);

export class Stage {
  readonly el = el('section', 'st-stage');
  readonly bar = el('div', 'st-bar');
  private readonly head = el('div', 'st-stage-head');
  private readonly box = el('div', 'st-canvas-box');
  readonly canvas = el('canvas', 'st-canvas');
  private readonly status = el('div', 'st-status');
  private readonly fallback = el('div', 'st-fallback');
  private readonly hint = el('p', 'st-hint');
  /** the view's keys: its description for a screen reader, and shown on the picture while it has the keyboard's focus */
  private readonly keys = el('p', 'st-keys');
  private readonly overlay: StageOverlay;
  viewer: StructureViewer | null = null;
  private glError: string | null = null;
  private active = false;
  /** the generation of what the stage asked for: a fetch that finishes for an older one is dropped */
  private gen = 0;
  private abort: AbortController | null = null;
  /** which model the viewer holds, at which of its pictures (a design, its antenna in or out), and which layers */
  private shown: { model: StructureModelId; key: number } | null = null;
  private readonly layersHere = new Set<string>();
  private readonly pictureKeys: Record<string, number> = {};
  private readonly homed = new Set<StructureModelId>();
  private last: Picture | null = null;
  private starting = 0;
  private startTask: ReturnType<typeof setTimeout> | undefined;
  /** the 3-D may be made: the section has been painted once since it was shown */
  private started = false;
  /** the mode the picture was last set for: a change of activity moves the units there over a moment */
  private lastMode = '';

  constructor(private readonly store: StructureStore, private readonly renderHead: (head: HTMLElement) => void, private readonly renderBar: (bar: HTMLElement) => void) {
    this.canvas.tabIndex = 0;
    // an interactive view, which takes its own keys (its name lists them)
    this.canvas.setAttribute('role', 'application');
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');
    this.overlay = new StageOverlay(store, {
      size: () => ({ width: this.canvas.clientWidth, height: this.canvas.clientHeight }),
      toCanvas: (p) => this.toCanvas(p),
      nodeAt: (id) => this.nodeAt(id),
      metresPerPixel: () => this.viewer?.metresPerPixel() ?? 0,
      ready: () => this.ready(),
    });
    // The picture's place always stands: the 3-D view with what is laid over it, or, where there is no 3-D, the side view
    // in its stead — and over either, what the stage has to say (loading, a failure with its retry).
    this.keys.id = 'st-keys';
    this.box.append(this.canvas, this.keys, this.overlay.el, this.fallback, this.status);
    this.el.append(this.head, this.box, this.bar, this.hint);
    this.canvas.addEventListener('keydown', (e) => this.key(e));
  }

  /** The viewer holds the model on screen. */
  ready(): boolean { return !!this.viewer && this.shown?.model === this.store.model; }

  // ─── life ─────────────────────────────────────────────────────────────────

  show(): void {
    this.active = true;
    this.viewer?.setActive(true);
    // the 3-D after the section has been painted (a frame, then a task): making a WebGL context can take a while
    // (seconds, with software GL), and the section shows its loading note meanwhile. Until then nothing that draws
    // the section (`sync`) makes it.
    cancelAnimationFrame(this.starting);
    clearTimeout(this.startTask);
    this.started = false;
    this.starting = requestAnimationFrame(() => {
      this.startTask = setTimeout(() => { if (this.active) { this.started = true; this.ensure(); this.store.emit(); } }, 0);
    });
  }

  /** Off screen: fetches cancelled, the model's GPU resources freed; the state stays. */
  hide(): void {
    this.active = false;
    this.started = false;
    cancelAnimationFrame(this.starting);
    clearTimeout(this.startTask);
    this.abort?.abort();
    this.abort = null;
    this.gen++;
    for (const m of Object.keys(this.store.load) as StructureModelId[]) {
      if (this.store.load[m].state === 'loading') this.store.load[m] = { state: 'idle' };
      for (const [layer, s] of this.store.layerState[m]) if (s === 'loading' || s === 'ready') this.store.layerState[m].delete(layer);
    }
    if (this.viewer) { this.viewer.setActive(false); this.viewer.clear(); }
    this.shown = null;
    this.layersHere.clear();
    this.last = null;
  }

  private ensureViewer(): StructureViewer | null {
    if (this.viewer || this.glError) return this.viewer;
    try {
      this.viewer = new StructureViewer(this.canvas, {
        gl: this.store.env.gl,
        onPick: (item) => this.picked(item),
        onFrame: () => this.overlay.follow(),
        onDragStart: (item) => this.dragStart(item),
        onDrag: (x, y, move) => this.dragMove(x, y, move),
        onDragEnd: (_x, _y, dropped) => this.store.dragEnd(dropped),
        onHover: (item, x, y) => this.overlay.hover(item === null || !this.ready() ? null : this.store.adapter.tree().leafOf[item] ?? null, x, y),
        reducedMotion,
        categoryColors: CATEGORY_COLOURS,
        certaintyColors: CERTAINTY_COLOURS,
        accent: '#8be5cd',
        related: '#6ec8ff',
        outline: '#7fa6c9',
        target: '#8be5cd',
        background: '#0a1018',
      });
      this.viewer.setActive(this.active);
    } catch (error) {
      this.glError = error instanceof Error ? error.message : String(error);
      this.viewer = null;
    }
    return this.viewer;
  }

  /** Bring the model on screen into the viewer: its content first, then its first layer; the others when the picture asks. */
  private ensure(): void {
    const store = this.store, adapter = store.adapter, model = store.model;
    this.ensureViewer();
    const changed = adapter.configure({ design: store.pictureDesign(), deployed: store.view.deployed });
    if (changed) this.pictureKeys[model] = (this.pictureKeys[model] ?? 0) + 1;
    const key = this.pictureKeys[model] ?? 0;
    if (this.shown && this.shown.model === model && this.shown.key === key && store.load[model].state === 'ready') return;
    if (store.load[model].state === 'loading' || store.load[model].state === 'failed') return;
    // without 3-D there is nothing to put in a viewer: once the model's content is here, it is all here
    // (asked for again each time, a model whose content needs no fetch would be brought without end)
    if (!this.viewer && adapter.ready() && store.load[model].state === 'ready') return;
    void this.bring(model, key);
  }

  private async bring(model: StructureModelId, key: number): Promise<void> {
    const store = this.store, adapter = store.adapters[model];
    const gen = ++this.gen;
    this.abort?.abort();
    const abort = new AbortController();
    this.abort = abort;
    const sameModel = this.shown?.model === model;
    // What else was on its way is no longer wanted, and its fetch is cancelled above: it is asked for afresh when it is
    // shown again. (Left as "loading", a model switched away from while it loaded could never be opened again.)
    for (const m of Object.keys(store.load) as StructureModelId[]) {
      if (m === model) continue;
      if (store.load[m].state === 'loading') store.load[m] = { state: 'idle' };
      for (const [layer, state] of store.layerState[m]) if (state === 'loading') store.layerState[m].delete(layer);
    }
    store.load[model] = { state: 'loading' };
    // another model goes at once: nothing of it stays drawn or pickable under this one's name while this loads
    if (this.shown && !sameModel) { this.viewer?.clear(); this.shown = null; this.layersHere.clear(); this.last = null; }
    store.emit('panels');
    try {
      if (!adapter.ready()) await adapter.load(abort.signal);
      if (gen !== this.gen) return;
      const viewer = this.viewer;
      if (viewer) {
        const meshes = await adapter.meshes(adapter.layers[0], abort.signal);
        if (gen !== this.gen || store.model !== model) { for (const m of meshes) m.geometry.dispose(); return; }
        const setup = adapter.setup();
        viewer.reset(setup.itemCount, setup.units, setup.category, setup.certainty);
        viewer.addMeshes(meshes);
        viewer.setGrid(adapter.home.grid, adapter.home.gridY);
        this.layersHere.clear();
        this.layersHere.add(adapter.layers[0]);
        store.layerState[model].clear();
        this.shown = { model, key };
        this.last = null;
        // the opening view once for each model; a changed design keeps the view the learner has
        if (!this.homed.has(model) || !sameModel) {
          const all = viewer.localBox(Array.from({ length: setup.itemCount }, (_, i) => i));
          if (all) { viewer.setHome(all, adapter.home.az, adapter.home.el, adapter.home.margin); viewer.home(false); }
          this.homed.add(model);
        }
      }
      store.load[model] = { state: 'ready' };
    } catch (error) {
      if (gen !== this.gen || abort.signal.aborted) return;
      // the parts list and the side view work when the model's content came and only its 3-D did not
      store.load[model] = { state: 'failed', reason: reasonOf(error), contentHere: adapter.ready() };
    }
    if (gen === this.gen) store.emit();
  }

  /** Fetch one more layer of the model on screen (its inside, its engines) the first time the picture needs it. */
  private async bringLayer(layer: string): Promise<void> {
    const store = this.store, model = store.model, adapter = store.adapter, viewer = this.viewer;
    const state = store.layerState[model];
    if (!viewer || !this.ready() || this.layersHere.has(layer) || state.has(layer)) return;
    const gen = this.gen;
    const abort = this.abort ?? new AbortController();
    this.abort = abort;
    state.set(layer, 'loading');
    store.emit('panels');
    let meshes: ViewerMesh[] | null = null;
    try {
      meshes = await adapter.meshes(layer, abort.signal);
      if (gen !== this.gen || !this.ready() || store.model !== model) { for (const m of meshes) m.geometry.dispose(); return; }
      viewer.addMeshes(meshes);
      this.layersHere.add(layer);
      state.set(layer, 'ready');
      this.last = null;
    } catch (error) {
      if (gen !== this.gen || abort.signal.aborted) return;
      state.set(layer, { failed: reasonOf(error) });
      // its switch is let go: it does not claim a layer that is not there
      store.views[model].layers[layer] = false;
    }
    if (gen === this.gen) store.emit();
  }

  /** Try a failed fetch again. */
  retry(layer?: string): void {
    const store = this.store;
    if (layer) { store.layerState[store.model].delete(layer); store.view.layers[layer] = true; }
    else store.load[store.model] = { state: 'idle' };
    this.ensure();
    store.emit();
  }

  // ─── the picture ──────────────────────────────────────────────────────────

  private matrixOf(unit: string): THREE.Matrix4 { return poseMatrix(this.last?.poses.get(unit) ?? { move: [0, 0, 0], visible: true }); }

  /** The box of these parts where the picture puts their units (where they are going, not where a move has got to). */
  private boxAt(items: readonly number[]): THREE.Box3 | null {
    const viewer = this.viewer;
    if (!viewer || !this.ready()) return null;
    const byUnit = new Map<string, number[]>();
    for (const i of items) {
      const u = this.store.adapter.unitOfItem(i);
      if (this.last && this.last.poses.get(u)?.visible === false) continue;
      byUnit.set(u, [...(byUnit.get(u) ?? []), i]);
    }
    const box = new THREE.Box3();
    let any = false;
    for (const [unit, list] of byUnit) {
      const local = viewer.localBox(list);
      if (!local) continue;
      box.union(local.applyMatrix4(this.matrixOf(unit)));
      any = true;
    }
    return any ? box : null;
  }

  /**
   * Hand the viewer the picture the state calls for, fetch the layers it
   * needs, and move the camera if asked. `following`: the change follows a
   * hand (a part dragged, a slider moved), so what moves goes where the hand
   * has it at once, without an ease that each further move would start again.
   */
  sync(following = false): void {
    const store = this.store, viewer = this.viewer;
    if (!this.active || !this.started) { this.overlay.follow(); return; }
    this.ensure();
    if (!viewer || !this.ready() || store.load[store.model].state !== 'ready') { this.overlay.follow(); return; }
    const adapter = store.adapter;
    const p = picture(store);
    // a change of activity, an install, a tool: the units move to their places over a moment (not on the first picture)
    const animate = this.last !== null && !following && !reducedMotion();
    // (a part dragged and over no place is where the hand has it, also on the move that takes it off a place)
    const inFlight = store.drag && !store.held[store.model]?.slot ? store.drag.unit : null;
    this.last = p;
    for (const unit of adapter.units) {
      const pose = p.poses.get(unit);
      if (pose) viewer.setUnit(unit, poseMatrix(pose), pose.visible, animate && unit !== inFlight);
    }
    viewer.setFlags((i) => p.flags[i]);
    viewer.setPaint(p.paint.colours, (i) => p.paint.of[i]);
    for (const layer of adapter.layers) {
      const wanted = p.layers.has(layer);
      if (this.layersHere.has(layer)) viewer.setLayerVisible(layer, wanted);
      else if (wanted) void this.bringLayer(layer);
    }
    viewer.setColorMode(p.colour);
    this.lastMode = store.mode;
    this.moveCamera(p);
    this.overlay.follow();
  }

  private moveCamera(p: Picture): void {
    const store = this.store, viewer = this.viewer, ask = store.camera;
    if (!viewer || !ask) return;
    store.camera = null;
    const adapter = store.adapter, all = Array.from({ length: p.flags.length }, (_, i) => i);
    /** Frame these parts; `least`: with at least this much of the model in view, m (a small thing is shown where it is). */
    const fit = (items: readonly number[], margin: number, from?: { az?: number; el?: number }, least = 0): boolean => {
      const box = this.boxAt(items);
      if (!box) return false;
      const size = box.getSize(new THREE.Vector3()), reach = Math.max(size.x, size.y, size.z);
      if (reach < least) box.expandByScalar((least - reach) / 2);
      viewer.frameBox(box, margin, true, from);
      return true;
    };
    // A thing whose layer is still on its way has no shape to frame yet (or only a part of one): the view is asked for
    // again when the layer is here. A layer that failed is not waited for.
    const waiting = [...p.layers].some((l) => !this.layersHere.has(l) && typeof store.layerState[store.model].get(l) !== 'object');
    const reachOf = (unit: string): number => {
      const box = this.boxAt(nodeOfUnit(adapter.tree(), unit)?.items ?? []);
      const size = box?.getSize(new THREE.Vector3());
      return size ? Math.max(size.x, size.y, size.z) : 0;
    };
    if (ask === 'home') {
      // the whole of what is shown, where it stands now (an assembly laid out apart is wider than the model)
      if (!fit(all, adapter.home.margin, { az: adapter.home.az, el: adapter.home.el })) viewer.home();
    } else if (ask === 'cutaway') {
      const cut = adapter.cutaway();
      if (cut) viewer.lookFrom(cut.azimuth);
    } else if (ask === 'selection') {
      // with room round it to see where it is: more at a first look, less for a single part — and a small part of an
      // assembly with at least a sixth of that assembly in view
      const shown = store.shown();
      const unit = shown && !shown.unit ? unitOf(adapter.tree(), shown.id) : null;
      // (a step of a system followed: with at least an eighth of the model round its parts)
      const whole = store.system[store.model] ? this.boxAt(all)?.getSize(new THREE.Vector3()) : null;
      const least = unit ? reachOf(unit) / 6 : whole ? Math.max(whole.x, whole.y, whole.z) / 8 : 0;
      // (of what is drawn: a part hidden by the cut or by a tool has no place to be shown at)
      const seen = p.focus.filter((i) => (p.flags[i] & FLAG.hidden) === 0);
      fit(seen.length ? seen : p.focus, store.level === 'watch' ? 2.1 : store.level === 'explore' ? 1.75 : 1.5, undefined, least);
      if (waiting) store.camera = ask;
    } else if (ask === 'joint') {
      const held = store.held[store.model];
      if (held) {
        const mates = adapter.relations.filter((r) => r.a === held.unit).flatMap((r) => nodeOfUnit(adapter.tree(), r.b)?.items ?? []);
        fit([...p.focus, ...(Object.hasOwn(store.assembly.placed, held.unit) ? [] : mates.slice(0, 4000))], 1.5);
      } else {
        // a joint is small beside what it joins: it is shown with about a third of the fitted unit round it
        const relation = adapter.relations.find((r) => r.id === store.jointShown[store.model]);
        fit(p.focus, 1.5, undefined, relation ? 0.35 * reachOf(relation.a) : 0);
      }
      if (waiting) store.camera = ask;
    }
  }

  /** The stage's own tools. */
  home(): void { this.store.camera = 'home'; this.sync(); }
  focus(): void { this.store.camera = 'selection'; this.sync(); }

  // ─── where things are on the canvas ───────────────────────────────────────

  private toCanvas(p: readonly [number, number, number]): { x: number; y: number } | null {
    const at = this.viewer?.project(new THREE.Vector3(p[0], p[1], p[2]));
    if (!at) return null;
    const r = this.canvas.getBoundingClientRect();
    return { x: at.x - r.left, y: at.y - r.top };
  }

  /** Where a node is drawn now: its middle, and how far its outline reaches to either side, px; null when none of it is drawn. */
  private nodeAt(id: string): { x: number; y: number; r: number } | null {
    const viewer = this.viewer;
    if (!viewer || !this.ready()) return null;
    const adapter = this.store.adapter, node = adapter.tree().nodes.get(id);
    if (!node) return null;
    const drawn = this.last ? node.items.filter((i) => (this.last!.flags[i] & FLAG.hidden) === 0) : node.items;
    const box = viewer.boxOf(drawn, (i) => adapter.unitOfItem(i));
    if (!box) return null;
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const at = this.toCanvas([c.x, c.y, c.z]);
    const mpp = viewer.metresPerPixel();
    return at && mpp > 0 ? { ...at, r: Math.min(260, Math.hypot(size.x, size.z) / 2 / mpp) } : null;
  }

  // ─── input ────────────────────────────────────────────────────────────────

  /** A press on the model that did not move. */
  private picked(item: number | null): void {
    const store = this.store;
    if (!this.ready()) return;
    if (store.mode === 'assemble') {
      if (item === null) { if (store.held[store.model]) store.hold(null); else store.select(null); return; }
      const unit = store.unitAt(item);
      if (Object.hasOwn(store.assembly.placed, unit)) { store.select(nodeOfUnit(store.adapter.tree(), unit)?.id ?? null); return; }
      // a loose part: picked up; at a first look, where its outline is lit, fitted at once
      if (store.level === 'watch' && store.view.outline) store.fit(unit); else store.hold(unit);
      return;
    }
    store.pick(item);
  }

  /** How near a place the pointer must be for a dragged part to settle on it, px. */
  private snap(): number { return Math.max(40, Math.min(72, 0.1 * Math.min(this.canvas.clientWidth, this.canvas.clientHeight))); }

  /** A drag that began on the model: a part still loose, lying apart, is taken in hand and dragged (else the drag turns the view). */
  private dragStart(item: number): boolean {
    const store = this.store;
    if (!this.ready() || store.mode !== 'assemble' || store.view.outline) return false;
    return store.dragStart(store.unitAt(item));
  }

  /** The dragged part follows the pointer; over a free place (within `snap`) it settles there, drawn as it would be fitted. */
  private dragMove(clientX: number, clientY: number, move: readonly [number, number, number]): void {
    const store = this.store, adapter = store.adapter;
    const r = this.canvas.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
    let near: string | null = null, best = this.snap();
    for (const s of adapter.spec.slots) {
      if (occupant(store.assembly, s.id) !== null) continue;
      const anchor = adapter.slotAnchor(s.id);
      const at = anchor && this.toCanvas(anchor);
      const d = at ? Math.hypot(at.x - x, at.y - y) : Infinity;
      if (d < best) { best = d; near = s.id; }
    }
    store.dragTo(move, near);
  }

  /** Where a node is drawn on the page now (client px): for the browser journeys' presses and drags on the picture. */
  where(id: string): { x: number; y: number } | null {
    const at = this.nodeAt(id);
    const r = this.canvas.getBoundingClientRect();
    return at ? { x: at.x + r.left, y: at.y + r.top } : null;
  }

  /** Where a place of the assembly is marked on the page now (client px). */
  wherePlace(slot: string): { x: number; y: number } | null {
    const anchor = this.store.adapter.slotAnchor(slot);
    const at = anchor && this.toCanvas(anchor);
    const r = this.canvas.getBoundingClientRect();
    return at ? { x: at.x + r.left, y: at.y + r.top } : null;
  }

  private key(e: KeyboardEvent): void {
    const v = this.viewer, store = this.store;
    if (!v) return;
    // the browser's own keys stay the browser's (page zoom, Back, reload)
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // arrows turn the view; with Shift they move it (pan), as Shift and drag does
    const step = 0.08, pan = 0.06;
    switch (e.key) {
      case 'ArrowLeft': if (e.shiftKey) v.panBy(-pan, 0); else v.orbitBy(step, 0); break;
      case 'ArrowRight': if (e.shiftKey) v.panBy(pan, 0); else v.orbitBy(-step, 0); break;
      case 'ArrowUp': if (e.shiftKey) v.panBy(0, -pan); else v.orbitBy(0, step); break;
      case 'ArrowDown': if (e.shiftKey) v.panBy(0, pan); else v.orbitBy(0, -step); break;
      case '+': case '=': v.zoomBy(0.85); break;
      case '-': case '_': v.zoomBy(1 / 0.85); break;
      case '0': case 'Home': this.home(); break;
      case ' ':
        // taken apart and put together where the bar has that tool: exploring
        if (store.mode !== 'explore') return;
        store.setView({ explode: store.view.explode > 0.5 ? 0 : 1 });
        break;
      case 'Enter': if (store.mode === 'assemble' && store.held[store.model]) store.install(); else return; break;
      case 'r': case 'R': if (store.mode === 'assemble' && store.held[store.model]) store.turn(); else return; break;
      default: return;
    }
    e.preventDefault();
    e.stopPropagation();
  }

  // ─── drawing the stage's own parts ────────────────────────────────────────

  render(): void {
    const store = this.store, model = store.model, load = store.load[model];
    this.el.dataset.mode = store.mode;
    // named shortly; its keys are its description, and are shown on the picture while it has the keyboard's focus
    this.canvas.setAttribute('aria-label', `${tx(`model.${model}`)}. ${tx('view.canvas')}`);
    this.canvas.setAttribute('aria-describedby', 'st-keys');
    // (the keys every activity has, then the activity's own)
    this.keys.textContent = [tx('view.keys'), ...(store.mode === 'experiment' ? [] : [tx(`view.keys.${store.mode}`)])].join(' · ');
    this.renderHead(this.head);
    // status: loading, failed, no WebGL
    const notes: HTMLElement[] = [];
    const loading = (): HTMLElement => el('p', 'st-note', tx('load.model', { name: tx(`model.${model}`) }));
    if (load.state === 'failed') {
      // a failure, with its retry, also without WebGL (the parts list and side view then need the data too)
      const p = el('p', 'st-note st-fail', tx(load.contentHere ? 'load.failed3d' : 'load.failed', { error: reasonText(load.reason) }));
      p.append(' ', button(tx('load.retry'), 'retry', () => { this.store.focusNext = 'home'; this.retry(); }));
      notes.push(p);
    } else if (this.glError) notes.push(store.ready ? el('p', 'st-note', tx('load.noGl')) : loading());
    else if (!this.ready() || load.state !== 'ready') notes.push(loading());
    for (const [layer, s] of store.layerState[model]) {
      if (s === 'loading') notes.push(el('p', 'st-note', tx('load.layer', { layer: tx(`info.layer.${layer}`) })));
      else if (s !== 'ready') {
        const p = el('p', 'st-note st-fail', tx('load.layerFailed', { layer: tx(`info.layer.${layer}`), error: reasonText(s.failed) }));
        p.append(' ', button(tx('load.retry'), `retry:${layer}`, () => { this.store.focusNext = 'home'; this.retry(layer); }));
        notes.push(p);
      }
    }
    this.status.replaceChildren(...notes);
    // the side view when there is no 3-D, or the model's 3-D failed (the canvas then goes: it holds nothing of this model)
    const noView = !!this.glError || load.state === 'failed';
    this.canvas.hidden = noView;
    this.overlay.el.hidden = noView;
    this.fallback.hidden = !(noView && store.ready);
    this.hint.hidden = noView;
    if (!this.fallback.hidden) this.renderFallback(); else this.fallback.replaceChildren();
    // a row of tools that scrolls sideways keeps its place across the redraw, and shows when more lies beyond its edge
    const left = this.bar.querySelector('.st-tools')?.scrollLeft ?? 0;
    this.renderBar(this.bar);
    for (const row of this.bar.querySelectorAll<HTMLElement>('.st-tools')) {
      row.scrollLeft = left;
      const more = (): void => { row.classList.toggle('has-more', row.scrollLeft + row.clientWidth < row.scrollWidth - 6); row.classList.toggle('has-before', row.scrollLeft > 6); };
      row.addEventListener('scroll', more, { passive: true });
      requestAnimationFrame(more);
    }
    // (on the reference's outline at a first look a press fits a part and a drag turns the view: there is nothing to drag there)
    this.hint.textContent = tx(store.mode !== 'assemble' ? 'hint.view' : store.view.outline ? (store.level === 'watch' ? 'hint.assemble.outline' : 'hint.assemble.pick') : 'hint.assemble');
    this.overlay.render();
    this.sync();
  }

  /** Without 3-D: each unit's box seen from the side, pickable. */
  private renderFallback(): void {
    const store = this.store, adapter = store.adapter, tree = adapter.tree();
    const boxes: SideBox[] = [];
    const assembling = store.mode === 'assemble';
    for (const unit of adapter.units) {
      if (assembling && !Object.hasOwn(store.assembly.placed, unit)) continue;
      // assembling, a unit is drawn at the place it went to (a side panel on another face at that face's)
      const at = assembling ? adapter.spec.slots.find((s) => s.id === store.assembly.placed[unit].slot)?.reference ?? unit : unit;
      const side = adapter.sideBox(at), node = nodeOfUnit(tree, unit);
      if (side && node) boxes.push({ unit, label: adapter.name(node.id), ...side });
    }
    this.fallback.replaceChildren(el('p', 'st-small', tx('fallback.title')));
    const selected = store.mode === 'assemble' ? store.selectedUnit() : store.selectedUnits()[0] ?? null;
    if (boxes.length) this.fallback.append(sideView(boxes, selected, (u) => store.select(nodeOfUnit(tree, u)?.id ?? null)));
  }

  /** What the viewer holds: for the section's own measurements and the browser journeys. */
  debug(): { ready: boolean; layers: string[]; mode: string } {
    return { ready: this.ready(), layers: [...this.layersHere], mode: this.lastMode };
  }
}
