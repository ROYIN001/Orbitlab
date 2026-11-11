/**
 * The Structure & Assembly section (owner, 2026-11-09;
 * docs/development/reports/structure-assembly-pilot.md): explore a model,
 * assemble it to its reference, and — for the educational satellite — make a
 * copy, change its battery and payload, see what follows, and send it to
 * Orbit or Launch.
 *
 * `#/structure/<level>[/<model>]`. The level is the depth (src/ui/app-mode.ts):
 * พื้นฐาน shows and picks the main assemblies, ทดลอง their subsystems,
 * joints and options, วิศวกร each part with its figures, units, sources and
 * method. Changing depth changes what is shown and what a press picks, never
 * the model, the selection, the assembly or the design.
 *
 * Made when the section first opens (main.ts); its code is in the app's main
 * bundle, since a chunk of its own regroups the app's shared chunks (the
 * pilot's report, §2.1 and §8). Its model files are fetched on demand.
 * Leaving the section cancels its fetches and frees its model's GPU
 * resources (`hide`); its state stays, and what a learner made is kept in
 * their profile (src/structure/progress.ts).
 */
import * as THREE from 'three';
import { StructureViewer, FLAG, type ColorMode, type ViewerMesh } from '../../render/structure-viewer';
import { fetchStructureJson, fetchStructureLayer } from '../../render/structure-mesh';
import { edusatMeshes } from '../../render/edusat-model';
import {
  checkAssembly, dependents, install, nextUnits, occupant, remove, restart, undo,
  type AssemblyRefusal, type AssemblySpec, type AssemblyState,
} from '../../structure/assembly';
import { SOYUZ_ASSEMBLY, SOYUZ_BOOSTERS, SOYUZ_UNITS, relationsOf, soyuzFactCertainty, type SoyuzUnit } from '../../structure/soyuz';
import { SOYUZ_FILES, cutawayAzimuth, indexSoyuz, parseSoyuzContent, unitAxis, type SoyuzIndex, type SoyuzLayer } from '../../structure/soyuz-content';
import {
  BATTERIES, BATTERY_OPTIONS, CELL_AREA, CELLS_PER_PANEL, EDUSAT_ASSEMBLY, EDUSAT_SOURCES, EDU_UNITS, PANELS, PAYLOADS, PAYLOAD_OPTIONS,
  FACE_AZIMUTH, eduRelationsOf, panelTurn, slotOfUnit, type BatteryOption, type EduUnit, type PayloadOption,
} from '../../structure/edusat';
import { REFERENCE_DESIGN, changesFrom, designKey, eduFigures, partFor, satelliteRecord, type EduDesign, type EduFigures } from '../../structure/edusat-design';
import { RECEIPT_TOLERANCE, checkReceipt, type HandoffPreview, type HandoffReceipt, type ReceiptCheck } from '../../structure/handoff';
import { readProgress, writeProgress, type StructureMode, type StructureProgress } from '../../structure/progress';
import { CERTAINTIES, PART_CATEGORIES, type Certainty, type Depth, type StructureModelId } from '../../structure/types';
import { chargeChart, sideView, type SideBox } from './charts';
import type { StructureEnv, StructureSection } from './env';
import { getLang, num, tx } from './text';
import './structure.css';

type AppLevel = Depth;

/** A note by the send buttons, put into words when drawn (so a language switch changes it). */
interface SendNote { kind: 'no' | 'ok'; key: string; params?: Record<string, string | number>; reason?: { key: string; params?: Record<string, string | number> }; seq?: number }

/** Colours for the kinds of part and the certainty levels: distinct on the dark ground, named in the legend. */
const CATEGORY_COLOURS = ['#9aa7b4', '#e0a458', '#6ec8ff', '#c792ea', '#7ddba0', '#ff7b72'];
const CERTAINTY_COLOURS = ['#7ddba0', '#6ec8ff', '#efa47e', '#c3a6ff'];

/** Where a strap-on stands round the axis, rad: the angle that turns +X onto it about +Y (EduSat's faces: FACE_AZIMUTH). */
const azimuth = (x: number, z: number): number => Math.atan2(-z, x);

/**
 * How a unit lies as it is picked up from the tray, by unit: a quarter or
 * half turn from the reference for the ones whose way round matters, so the
 * learner has to turn it right (the preview shows it as held).
 */
const TRAY_TURN: Readonly<Record<string, number>> = {
  'booster-b': 2, 'booster-v': 1, 'booster-g': 3, 'booster-d': 2, fregat: 1, payload: 1, 'panel-px': 1, 'panel-nx': 1, 'panel-pz': 1, 'panel-nz': 1,
};

/** EduSat taken apart: each unit's offset at full "take apart", m. */
const EDU_APART: Readonly<Record<EduUnit, [number, number, number]>> = {
  frame: [0, 0, 0], stack: [0.22, 0, 0], payload: [0.22, -0.12, 0], battery: [0.22, -0.05, 0], eps: [0.22, 0, 0], adcs: [0.22, 0.04, 0],
  obc: [0.22, 0.08, 0], radio: [0.22, 0.12, 0], antenna: [0, 0.12, 0],
  'panel-px': [0.09, 0, 0], 'panel-nx': [-0.09, 0, 0], 'panel-pz': [0, 0, 0.09], 'panel-nz': [0, 0, -0.09],
};

interface Selection { unit: string | null; group: number | null; item: number | null }
interface ViewState {
  explode: number; open: number; cutaway: boolean; ghost: boolean; inner: boolean; engine: boolean;
  colour: ColorMode; hidden: Set<number>; isolate: Set<number> | null;
}
interface Held { unit: string; slot: string | null; turn: number }
/** a failed load's reason, put into words when drawn */
type LoadState = { state: 'idle' } | { state: 'loading' } | { state: 'failed'; error: () => string; listWorks: boolean } | { state: 'ready' };
/** thrown when the model's content and a layer come from two versions of the page (said in the interface language) */
const MISMATCH = 'structure:files-mismatch';
/** why a fetch failed, in words when drawn: offline, the files' versions apart, or the browser's own message */
const loadReason = (error: unknown): (() => string) => {
  const message = error instanceof Error ? error.message : String(error);
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  return () => (offline ? tx('load.offline') : message === MISMATCH ? tx('load.mismatch') : message);
};

const freshView = (): ViewState => ({ explode: 0, open: 0, cutaway: false, ghost: false, inner: false, engine: false, colour: 'material', hidden: new Set(), isolate: null });

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const MODELS: readonly StructureModelId[] = ['soyuz-st31', 'edusat'];
const MODES: readonly StructureMode[] = ['explore', 'assemble', 'experiment'];
const LEVELS: readonly AppLevel[] = ['watch', 'explore', 'engineer'];

export class StructureScreen implements StructureSection {
  private level: AppLevel = 'explore';
  private visible = false;
  private progress: StructureProgress;
  private writable = true;
  /**
   * What the learner is told about keeping their work: a stored record set
   * aside, a newer one left alone, a save the profile refuses in this tab
   * (read-only, changed in another tab, no learner chosen), or one the
   * browser refuses (storage full or blocked).
   */
  private storeNote: 'damaged' | 'newer' | 'readonly' | 'failed' | null = null;
  /** what the live region last said: the storage note, the last message and send note by their counts, the results' design */
  private said = { store: '', msg: 0, send: 0, verdict: '' };
  private saySeq = 0;
  private starting = 0;
  private startTask: ReturnType<typeof setTimeout> | undefined;
  private soyuz: SoyuzIndex | null = null;
  private load: LoadState = { state: 'idle' };
  private layerLoading = new Set<SoyuzLayer>();
  /** layers that did not load, with why: said on the stage with a retry, their switch let go */
  private layerFailed = new Map<Exclude<SoyuzLayer, 'outer'>, () => string>();
  /** the generation of what the section asked for: a fetch that finishes for an older one is dropped */
  private gen = 0;
  private abort: AbortController | null = null;
  private viewer: StructureViewer | null = null;
  private glError: string | null = null;
  /** which model, and for the satellite which design, the viewer holds */
  private shown: { model: StructureModelId; design: string } | null = null;
  private readonly sel: Record<StructureModelId, Selection> = { 'soyuz-st31': { unit: null, group: null, item: null }, edusat: { unit: null, group: null, item: null } };
  private readonly views: Record<StructureModelId, ViewState> = { 'soyuz-st31': freshView(), edusat: freshView() };
  private readonly held: Record<StructureModelId, Held | null> = { 'soyuz-st31': null, edusat: null };
  /** the assembly's last message, put into words when drawn (a language switch changes it); `seq` counts them, so a repeat is said again */
  private msg: { text: () => string; kind: 'ok' | 'no' | 'info'; seq: number } | null = null;
  private msgSeq = 0;
  private get message(): { text: () => string; kind: 'ok' | 'no' | 'info'; seq: number } | null { return this.msg; }
  private set message(m: { text: () => string; kind: 'ok' | 'no' | 'info' } | null) { this.msg = m && { ...m, seq: ++this.msgSeq }; }
  private figures: EduFigures | null = null;
  private sent: { where: 'orbit' | 'launch'; key: string; sent: HandoffPreview; receipt: HandoffReceipt | null; check: ReceiptCheck | null } | null = null;
  /** why the last send was not handed over, or that Launch's earlier mission is back: shown by the send buttons until the design changes */
  private sendNote: SendNote | null = null;
  /** where focus goes when the control pressed is gone after a redraw (a part taken off: its tray button) */
  private focusNext: string | null = null;
  private readonly expanded = new Set<string>();
  private filter = '';
  private axes = new Map<string, [number, number]>();
  private readonly root: HTMLElement;
  private readonly head = el('header', 'st-head');
  private readonly stage = el('div', 'st-stage');
  private readonly canvasBox = el('div', 'st-canvas-box');
  private readonly canvas = el('canvas', 'st-canvas');
  private readonly status = el('div', 'st-status');
  private readonly toolbar = el('div', 'st-toolbar');
  private readonly legend = el('div', 'st-legend');
  private readonly fallback = el('div', 'st-fallback');
  private readonly side = el('aside', 'st-side');
  /** says what was selected; it stays put (the panels are redrawn, a live region must not be) */
  private readonly announcer = el('p', 'sr-only');

  constructor(root: HTMLElement, private readonly env: StructureEnv) {
    this.root = root;
    root.classList.add('structure-screen');
    // storage blocked reads as none: a visit-only copy
    const read = readProgress(env.storage.read(), { 'soyuz-st31': SOYUZ_ASSEMBLY, edusat: EDUSAT_ASSEMBLY });
    this.progress = read.progress;
    this.writable = read.writable;
    this.storeNote = read.note;
    this.canvas.tabIndex = 0;
    // an interactive view, which takes its own keys (its name lists them)
    this.canvas.setAttribute('role', 'application');
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');
    this.canvasBox.append(this.canvas, this.status, this.legend);
    this.stage.append(this.toolbar, this.canvasBox, this.fallback);
    const layout = el('div', 'st-layout');
    this.announcer.setAttribute('role', 'status');
    this.announcer.setAttribute('aria-live', 'polite');
    layout.append(this.head, this.stage, this.side, this.announcer);
    root.replaceChildren(layout);
    // the launch scene's camera would capture the press (src/render/cameras.ts): it is covered here
    root.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.canvas.addEventListener('keydown', (e) => this.canvasKey(e));
    this.canvas.addEventListener('dragover', (e) => { if (this.mode === 'assemble') e.preventDefault(); });
    this.canvas.addEventListener('drop', (e) => this.dropOnModel(e));
    env.storage.onFlush(() => this.saveNow());
  }

  // ─── lifecycle ────────────────────────────────────────────────────────────

  private get model(): StructureModelId { return this.progress.model; }
  private get mode(): StructureMode { return this.progress.mode[this.model]; }
  private get spec(): AssemblySpec { return this.model === 'soyuz-st31' ? SOYUZ_ASSEMBLY : EDUSAT_ASSEMBLY; }
  private get assembly(): AssemblyState { return this.progress.assembly[this.model]; }
  /** The satellite design on screen: the learner's copy, or the reference. */
  private get design(): EduDesign {
    return this.progress.showing === 'mine' && this.progress.experiment ? this.progress.experiment : REFERENCE_DESIGN;
  }

  /** Show the section at a depth, a model's page if the address names one. */
  show(level: AppLevel, page?: StructureModelId): void {
    this.level = level;
    if (page === 'soyuz-st31' || page === 'edusat') {
      if (page !== this.progress.model) { this.progress.model = page; this.save(); }
    }
    this.visible = true;
    this.root.hidden = false;
    this.viewer?.setActive(true);
    this.render();
    // the 3-D after the section has been painted (a frame, then a task): making a WebGL context can take a while
    // (seconds, with software GL), and the section shows its loading note meanwhile
    cancelAnimationFrame(this.starting);
    clearTimeout(this.startTask);
    this.starting = requestAnimationFrame(() => {
      this.startTask = setTimeout(() => { if (this.visible) { this.ensureModel(); this.render(); } }, 0);
    });
  }

  /** Off screen: fetches cancelled, the model's GPU resources freed; the state stays. */
  hide(): void {
    this.visible = false;
    cancelAnimationFrame(this.starting);
    clearTimeout(this.startTask);
    this.abort?.abort();
    this.abort = null;
    this.gen++;
    this.layerLoading.clear();
    this.layerFailed.clear();
    if (this.load.state === 'loading') this.load = { state: 'idle' };
    if (this.viewer) { this.viewer.setActive(false); this.viewer.clear(); }
    this.shown = null;
    this.saveNow();
  }

  applyLanguage(): void { if (this.visible) this.render(); }

  /** The section's keys from the app's handler: Escape clears the selection. */
  onKey(e: KeyboardEvent): void {
    if (!this.visible || e.key !== 'Escape') return;
    if ((e.target as HTMLElement | null)?.closest('dialog, input, select, textarea')) return;
    if (this.held[this.model]) { this.held[this.model] = null; this.syncView(); this.render(); return; }
    this.select({ unit: null, group: null, item: null }, false);
  }

  /** Keep the progress now: every change is a learner's press, few and small, and a reload right after one must not lose it. */
  private save(): void {
    this.saveNow();
  }

  private saveNow(): void {
    if (!this.writable) return;
    // not kept: the visit keeps it, and says why (the profile refusing this tab's writes, or the browser refusing the write)
    const wrote = this.env.storage.write(writeProgress(this.progress));
    if (wrote === 'ok') {
      if (this.storeNote === 'failed') { this.storeNote = null; if (this.visible) this.render(); }
    } else if (this.storeNote !== wrote) { this.storeNote = wrote; if (this.visible) this.render(); }
  }

  // ─── the model in the viewer ──────────────────────────────────────────────

  private ensureViewer(): StructureViewer | null {
    if (this.viewer || this.glError) return this.viewer;
    try {
      this.viewer = new StructureViewer(this.canvas, {
        gl: this.env.gl,
        onPick: (item) => this.picked(item),
        reducedMotion,
        categoryColors: CATEGORY_COLOURS,
        certaintyColors: CERTAINTY_COLOURS,
        accent: '#8be5cd',
        related: '#6ec8ff',
        background: '#0a1018',
      });
      this.viewer.setActive(this.visible);
    } catch (error) {
      this.glError = error instanceof Error ? error.message : String(error);
      this.viewer = null;
    }
    return this.viewer;
  }

  /** Load what the model on screen needs, once: the Soyuz's content and outer layer, or the satellite's parts. */
  private ensureModel(): void {
    const viewer = this.ensureViewer();
    if (this.model === 'edusat') {
      this.abort?.abort();
      this.abort = null;
      this.load = { state: 'ready' };
      const key = designKey(this.design);
      if (viewer && (this.shown?.model !== 'edusat' || this.shown.design !== key)) this.showEdusat(viewer, key);
      return;
    }
    if (this.shown?.model === 'soyuz-st31' && this.load.state === 'ready') return;
    if (this.load.state === 'loading') return;
    void this.loadSoyuz();
  }

  private showEdusat(viewer: StructureViewer, key: string): void {
    const first = this.shown?.model !== 'edusat';
    const parts = this.figuresNow().parts;
    viewer.reset(EDU_UNITS.length, EDU_UNITS, Uint8Array.from(parts, (p) => PART_CATEGORIES.indexOf(p.category)),
      Uint8Array.from(parts, (p) => CERTAINTIES.indexOf(p.massCertainty)));
    viewer.addMeshes(edusatMeshes(parts));
    for (const p of parts) this.axes.set(`edusat:${p.unit}`, [p.box.center[0], p.box.center[2]]);
    viewer.setGrid(0.8, -0.18);
    this.shown = { model: 'edusat', design: key };
    const box = viewer.localBox(EDU_UNITS.map((_, i) => i));
    if (box && first) { viewer.setHome(box, 0.7, 0.32, 1.25); viewer.home(false); }
    this.syncView();
  }

  private async loadSoyuz(): Promise<void> {
    const gen = ++this.gen;
    this.abort?.abort();
    const abort = new AbortController();
    this.abort = abort;
    this.load = { state: 'loading' };
    // the other model goes at once: nothing of it stays drawn or pickable under this one's name while this loads
    if (this.shown && this.shown.model !== 'soyuz-st31') { this.viewer?.clear(); this.shown = null; }
    this.render();
    try {
      if (!this.soyuz) {
        const content = parseSoyuzContent(await fetchStructureJson(SOYUZ_FILES.content, abort.signal));
        if (gen !== this.gen) return;
        this.soyuz = indexSoyuz(content);
        for (const u of SOYUZ_UNITS) this.axes.set(`soyuz-st31:${u}`, unitAxis(this.soyuz, u));
        this.render();
      }
      const viewer = this.viewer;
      if (viewer) {
        const layer = await fetchStructureLayer(SOYUZ_FILES.layers.outer, abort.signal, this.env.inflate);
        if (gen !== this.gen || this.model !== 'soyuz-st31') return;
        if (layer.source.sha256 !== this.soyuz.content.source.sha256 || layer.revision !== this.soyuz.content.revision) throw new Error(MISMATCH);
        const s = this.soyuz;
        viewer.reset(s.content.items.length, SOYUZ_UNITS, s.category, s.certainty);
        viewer.addMeshes(this.meshesOf(layer));
        viewer.setGrid(80, 0);
        const box = viewer.localBox(s.content.items.map((_, i) => i));
        if (box) { viewer.setHome(box, 0.85, 0.12, 1.02); viewer.home(false); }
        this.shown = { model: 'soyuz-st31', design: '' };
        // the layers the view had open come back
        const v = this.views['soyuz-st31'];
        for (const l of ['inner', 'engine'] as const) if (v[l]) void this.loadLayer(l);
      }
      this.load = { state: 'ready' };
    } catch (error) {
      if (gen !== this.gen || abort.signal.aborted) return;
      // the parts list and the side view work when the model's content came and only its 3-D did not
      this.load = { state: 'failed', error: loadReason(error), listWorks: !!this.soyuz };
    }
    if (gen === this.gen) { this.syncView(); this.render(); }
  }

  private meshesOf(layer: Awaited<ReturnType<typeof fetchStructureLayer>>): ViewerMesh[] {
    return layer.meshes.map((m) => ({
      unit: m.unit, layer: layer.layer, geometry: m.geometry,
      roughness: layer.materials[m.material]?.roughness ?? 0.6, metalness: layer.materials[m.material]?.metalness ?? 0,
    }));
  }

  /** Fetch a Soyuz layer (the inside, the engines) the first time it is asked for. */
  private async loadLayer(layer: SoyuzLayer): Promise<void> {
    const viewer = this.viewer, s = this.soyuz;
    if (!viewer || !s || layer === 'outer' || viewer.layers().has(layer) || this.layerLoading.has(layer) || this.shown?.model !== 'soyuz-st31') return;
    const gen = this.gen;
    const abort = this.abort ?? new AbortController();
    this.abort = abort;
    this.layerLoading.add(layer);
    this.render();
    try {
      const data = await fetchStructureLayer(SOYUZ_FILES.layers[layer], abort.signal, this.env.inflate);
      if (gen !== this.gen || this.shown?.model !== 'soyuz-st31' || !this.layerLoading.has(layer)) return;
      if (data.source.sha256 !== s.content.source.sha256 || data.revision !== s.content.revision) throw new Error(MISMATCH);
      viewer.addMeshes(this.meshesOf(data));
      this.layerFailed.delete(layer);
    } catch (error) {
      if (gen !== this.gen || abort.signal.aborted) return;
      this.layerFailed.set(layer, loadReason(error));
      // its switch is let go: it does not claim a layer that is not there
      this.views['soyuz-st31'][layer] = false;
    } finally {
      if (gen === this.gen) this.layerLoading.delete(layer);
    }
    if (gen === this.gen) { this.syncView(); this.render(); }
  }

  // ─── what the viewer shows ────────────────────────────────────────────────

  /** The parts of a unit, group or part, by the model's numbering. */
  private itemsOf(sel: Selection): number[] {
    if (this.model === 'edusat') return sel.unit ? [EDU_UNITS.indexOf(sel.unit as EduUnit)] : [];
    const s = this.soyuz;
    if (!s) return [];
    if (sel.item !== null && this.level === 'engineer') return [sel.item];
    if (sel.group !== null && this.level !== 'watch') return s.groups[sel.group]?.items ?? [];
    if (sel.unit) return s.units[sel.unit as SoyuzUnit]?.items ?? [];
    return [];
  }

  /** The selection as the depth shows it: a part at วิศวกร, its group at ทดลอง, its assembly at พื้นฐาน. */
  private shownSelection(): Selection {
    const s = this.sel[this.model];
    if (this.level === 'watch') return { unit: s.unit, group: null, item: null };
    if (this.level === 'explore') return { unit: s.unit, group: s.group, item: null };
    return s;
  }

  private unitOfItem = (i: number): string => (this.model === 'edusat' ? EDU_UNITS[i] : this.soyuz?.content.items[i]?.unit ?? '');

  /** Each unit's matrix: apart, opened, previewed in a slot, or where the reference puts it. */
  private unitMatrix(unit: string): { m: THREE.Matrix4; visible: boolean } {
    const m = new THREE.Matrix4();
    if (this.mode === 'assemble') {
      // in place: drawn in the slot it went into, which for a side panel can be another face than its own
      const placed = this.assembly.placed[unit];
      if (placed) return { m: this.previewMatrix({ unit, slot: placed.slot, turn: placed.orientation }), visible: true };
      const held = this.held[this.model];
      if (held?.unit !== unit) return { m, visible: false };
      return { m: this.previewMatrix(held), visible: true };
    }
    const v = this.views[this.model];
    if (this.model === 'soyuz-st31' && this.soyuz) {
      const a = this.soyuz.content.assemblies[unit as SoyuzUnit];
      const p = new THREE.Vector3(...a.move).multiplyScalar(v.explode);
      if (a.reveal) p.addScaledVector(new THREE.Vector3(...a.reveal), v.open);
      m.makeTranslation(p.x, p.y, p.z);
    } else if (this.model === 'edusat') {
      const d = EDU_APART[unit as EduUnit] ?? [0, 0, 0];
      m.makeTranslation(d[0] * v.explode, d[1] * v.explode, d[2] * v.explode);
    }
    return { m, visible: true };
  }

  /** A unit as it sits, or would sit, in a slot, turned as held; off to the side while no slot is chosen. */
  private previewMatrix(h: Held): THREE.Matrix4 {
    const key = `${this.model}:${h.unit}`;
    const [px, pz] = this.axes.get(key) ?? [0, 0];
    const turnOwn = new THREE.Matrix4();
    const unit = this.spec.units.find((u) => u.id === h.unit);
    if (unit && unit.orientations > 1 && h.turn % unit.orientations !== 0) {
      const angle = (2 * Math.PI * h.turn) / unit.orientations;
      if (h.unit === 'payload') {
        const part = partFor(this.design, 'payload');
        const cy = part?.box.center[1] ?? 0;
        turnOwn.makeTranslation(0, cy, 0).multiply(new THREE.Matrix4().makeRotationX(angle)).multiply(new THREE.Matrix4().makeTranslation(0, -cy, 0));
      } else {
        turnOwn.makeTranslation(px, 0, pz).multiply(new THREE.Matrix4().makeRotationY(angle)).multiply(new THREE.Matrix4().makeTranslation(-px, 0, -pz));
      }
    }
    if (!h.slot) {
      // on the bench beside the model
      const size = this.model === 'edusat' ? 0.3 : 30;
      return new THREE.Matrix4().makeTranslation(size, 0, size * 0.4).multiply(turnOwn);
    }
    let around = 0;
    if (this.model === 'soyuz-st31' && SOYUZ_BOOSTERS.includes(h.unit as SoyuzUnit) && SOYUZ_BOOSTERS.includes(h.slot as SoyuzUnit)) {
      const [ux, uz] = this.axes.get(`soyuz-st31:${h.unit}`) ?? [0, 0];
      const [sx, sz] = this.axes.get(`soyuz-st31:${h.slot}`) ?? [0, 0];
      around = azimuth(sx, sz) - azimuth(ux, uz);
    } else if (this.model === 'edusat' && PANELS.includes(h.unit as EduUnit) && Object.hasOwn(FACE_AZIMUTH, h.slot)) {
      around = panelTurn(h.unit, h.slot);
    } else if (h.slot !== this.spec.units.find((u) => u.id === h.unit)?.slots[0]) {
      // a slot of another kind: shown at that slot's own place (its unit's), as near as a different part can stand there
      const there = this.spec.slots.find((s) => s.id === h.slot)?.reference;
      if (there) {
        const a = this.unitCenter(there), b = this.unitCenter(h.unit);
        if (a && b) return new THREE.Matrix4().makeTranslation(a.x - b.x, a.y - b.y, a.z - b.z).multiply(turnOwn);
      }
    }
    return new THREE.Matrix4().makeRotationY(around).multiply(turnOwn);
  }

  private unitCenter(unit: string): THREE.Vector3 | null {
    const items = this.model === 'edusat' ? [EDU_UNITS.indexOf(unit as EduUnit)] : this.soyuz?.units[unit as SoyuzUnit]?.items ?? [];
    return this.viewer?.localBox(items)?.getCenter(new THREE.Vector3()) ?? null;
  }

  /** Push the section's state to the viewer: assemblies' places, parts' states, layers, colours. */
  private syncView(): void {
    const viewer = this.viewer;
    if (!viewer || !this.shown || this.shown.model !== this.model) return;
    const units = this.model === 'edusat' ? EDU_UNITS : SOYUZ_UNITS;
    for (const u of units) {
      const { m, visible } = this.unitMatrix(u);
      viewer.setUnit(u, m, visible);
    }
    const v = this.views[this.model];
    const assembling = this.mode === 'assemble';
    const selected = new Set(this.itemsOf(this.shownSelection()));
    const related = new Set<number>();
    const sel = this.shownSelection();
    if (sel.unit && sel.item === null && sel.group === null && !assembling) {
      const partners = this.model === 'edusat'
        ? eduRelationsOf(sel.unit).map((r) => (r.a === sel.unit ? r.b : r.a))
        : relationsOf(sel.unit).map((r) => (r.a === sel.unit ? r.b : r.a));
      for (const p of partners) for (const i of this.itemsOf({ unit: p, group: null, item: null })) related.add(i);
    }
    const s = this.soyuz;
    const held = this.held[this.model];
    viewer.setFlags((i) => {
      let f = 0;
      const unit = this.unitOfItem(i);
      if (assembling) {
        // the part in hand: see-through and blue, apart from a selected part in place (green)
        if (held?.unit === unit && !this.assembly.placed[unit]) return FLAG.ghost | FLAG.related;
      } else {
        if (v.hidden.has(i) || (v.isolate && !v.isolate.has(i))) f |= FLAG.hidden;
        if (this.model === 'soyuz-st31' && s) {
          const p = s.content.items[i];
          if (v.cutaway && p.half?.endsWith('front')) f |= FLAG.hidden;
          if (v.ghost && p.kind === 'shell' && !selected.has(i)) f |= FLAG.ghost;
        } else if (this.model === 'edusat' && v.ghost && (unit === 'frame' || PANELS.includes(unit as EduUnit)) && !selected.has(i)) f |= FLAG.ghost;
      }
      if (selected.has(i)) f |= FLAG.selected;
      else if (related.has(i)) f |= FLAG.related;
      return f;
    });
    if (this.model === 'soyuz-st31') {
      viewer.setLayerVisible('inner', v.inner || assembling);
      viewer.setLayerVisible('engine', v.engine);
    }
    viewer.setColorMode(assembling ? 'material' : v.colour);
  }

  // ─── selection ────────────────────────────────────────────────────────────

  /** A press on the model: its part, as the depth picks (the part, its group, its assembly). */
  private picked(item: number | null): void {
    // only the model on screen is picked from
    if (this.shown?.model !== this.model) return;
    if (item === null) { this.select({ unit: null, group: null, item: null }, false); return; }
    const unit = this.unitOfItem(item);
    if (this.mode === 'assemble' && !this.assembly.placed[unit]) return;
    const group = this.model === 'soyuz-st31' ? this.soyuz?.groupOf[item] ?? null : null;
    this.select({ unit, group: group !== null && group >= 0 ? group : null, item: this.model === 'soyuz-st31' ? item : null }, false);
    // turn about what was picked, keeping the distance: the camera follows the selection
    const box = this.viewer?.boxOf(this.itemsOf(this.shownSelection()), this.unitOfItem);
    if (box) this.viewer?.retarget(box.getCenter(new THREE.Vector3()));
  }

  private select(next: Selection, focus: boolean): void {
    this.sel[this.model] = next;
    // a subsystem or part that lies wholly inside needs its layer (a whole assembly does not: its outside shows it)
    const shown = this.shownSelection();
    if (this.model === 'soyuz-st31' && this.soyuz && (shown.group !== null || shown.item !== null)) {
      const layers = new Set(this.itemsOf(shown).map((i) => this.soyuz!.content.items[i].layer));
      if (!layers.has('outer')) for (const l of layers) {
        const v = this.views['soyuz-st31'];
        if (l === 'inner') v.inner = true;
        if (l === 'engine') v.engine = true;
        void this.loadLayer(l);
      }
    }
    this.syncView();
    if (focus) this.focusSelection();
    this.render();
    if (next.unit) this.say(tx('sel.announce', { name: this.selectionName(this.shownSelection()) }));
  }

  /** What a selection is called, at the depth shown: the part's id, its group's name, or its assembly's. */
  private selectionName(sel: Selection): string {
    if (!sel.unit) return '';
    if (this.model === 'soyuz-st31' && this.soyuz) {
      if (sel.item !== null) return this.soyuz.content.items[sel.item]?.id ?? '';
      if (sel.group !== null) return this.soyuz.groups[sel.group]?.group?.label ?? tx('list.other');
    }
    return this.name(sel.unit);
  }

  private focusSelection(): void {
    const items = this.itemsOf(this.shownSelection());
    const box = this.viewer?.boxOf(items, this.unitOfItem);
    if (box) this.viewer?.frameBox(box, this.level === 'watch' ? 1.6 : 1.9);
  }

  // ─── input ────────────────────────────────────────────────────────────────

  private canvasKey(e: KeyboardEvent): void {
    const v = this.viewer;
    if (!v) return;
    // arrows turn the view; with Shift they move it (pan), as Shift and drag does
    const step = 0.08, pan = 0.06;
    switch (e.key) {
      case 'ArrowLeft': if (e.shiftKey) v.panBy(-pan, 0); else v.orbitBy(step, 0); break;
      case 'ArrowRight': if (e.shiftKey) v.panBy(pan, 0); else v.orbitBy(-step, 0); break;
      case 'ArrowUp': if (e.shiftKey) v.panBy(0, -pan); else v.orbitBy(0, step); break;
      case 'ArrowDown': if (e.shiftKey) v.panBy(0, pan); else v.orbitBy(0, -step); break;
      case '+': case '=': v.zoomBy(0.85); break;
      case '-': case '_': v.zoomBy(1 / 0.85); break;
      case '0': case 'Home': v.home(); break;
      case ' ':
        if (this.mode === 'assemble') return;
        this.views[this.model].explode = this.views[this.model].explode > 0.5 ? 0 : 1;
        this.syncView(); this.render();
        break;
      default: return;
    }
    e.preventDefault();
    e.stopPropagation();
  }

  /** A tray part dropped on the model: into the slot nearest the drop, as held. */
  private dropOnModel(e: DragEvent): void {
    if (this.mode !== 'assemble') return;
    const unit = e.dataTransfer?.getData('text/plain');
    if (!unit || !this.viewer) return;
    e.preventDefault();
    let best: { slot: string; d: number } | null = null;
    for (const slot of this.spec.slots) {
      if (occupant(this.assembly, slot.id) !== null) continue;
      const c = this.unitCenter(slot.reference);
      const p = c && this.viewer.project(c);
      if (!p) continue;
      const d = Math.hypot(p.x - e.clientX, p.y - e.clientY);
      if (!best || d < best.d) best = { slot: slot.id, d };
    }
    const held = this.held[this.model];
    this.held[this.model] = { unit, slot: best?.slot ?? null, turn: held?.unit === unit ? held.turn : TRAY_TURN[unit] ?? 0 };
    this.tryInstall();
  }

  // ─── assembly ─────────────────────────────────────────────────────────────

  private name(unit: string): string {
    if (this.model === 'edusat') {
      if (Object.hasOwn(FACE_AZIMUTH, unit)) return tx(`edu.slot.${unit}`);
      return tx(`edu.unit.${unit}`);
    }
    return tx(`soyuz.unit.${unit}`);
  }

  private names(units: readonly string[]): string {
    return units.map((u) => this.name(u)).join(', ');
  }

  private refusalText(r: AssemblyRefusal): string {
    switch (r.code) {
      case 'missing': return tx('asm.no.missing', { unit: this.name(r.unit), missing: this.names(r.missing) });
      case 'wrongSlot': return tx('asm.no.wrongSlot', { slot: this.name(r.slot), owner: this.name(r.owner), unit: this.name(r.unit), expected: this.names(r.expected) });
      case 'wrongOrientation': {
        const why = this.model === 'edusat'
          ? tx(r.unit === 'payload' ? 'edu.turn.payload' : 'edu.turn.panel')
          : tx(r.unit === 'fregat' ? 'soyuz.turn.fregat' : 'soyuz.turn');
        return tx('asm.no.wrongOrientation', { why });
      }
      case 'slotTaken': return tx('asm.no.slotTaken', { slot: this.name(r.slot), by: this.name(r.by) });
      case 'alreadyPlaced': return tx('asm.no.alreadyPlaced', { unit: this.name(r.unit) });
      case 'holds': return tx('asm.no.holds', { unit: this.name(r.unit), dependents: this.names(r.dependents) });
      case 'notPlaced': return tx('asm.no.notPlaced', { unit: this.name(r.unit) });
      case 'nothingToUndo': return tx('asm.no.nothingToUndo');
      default: return tx('asm.no.unknown');
    }
  }

  private setAssembly(next: AssemblyState): void {
    this.progress.assembly[this.model] = next;
    const check = checkAssembly(this.spec, next);
    if (check.complete && !this.progress.completed[this.model]) this.progress.completed[this.model] = new Date().toISOString();
    this.save();
  }

  private tryInstall(): void {
    const h = this.held[this.model];
    if (!h) return;
    if (!h.slot) { this.message = { text: () => tx('asm.pick'), kind: 'info' }; this.render(); return; }
    const unit = this.spec.units.find((u) => u.id === h.unit);
    const r = install(this.spec, this.assembly, h.unit, { slot: h.slot, orientation: unit ? h.turn % unit.orientations : h.turn });
    if (r.ok) {
      this.setAssembly(r.state);
      this.held[this.model] = null;
      this.message = { text: () => tx('asm.installed', { unit: this.name(h.unit) }), kind: 'ok' };
      this.sel[this.model] = { unit: h.unit, group: null, item: null };
    } else this.message = { text: () => this.refusalText(r.refusal), kind: 'no' };
    this.syncView();
    this.render();
  }

  private removeSelected(): void {
    const unit = this.sel[this.model].unit;
    if (!unit) return;
    const r = remove(this.spec, this.assembly, unit);
    if (r.ok) {
      this.setAssembly(r.state);
      this.message = { text: () => tx('asm.removed', { unit: this.name(unit) }), kind: 'ok' };
      this.sel[this.model] = { unit: null, group: null, item: null };
      // the part is back in the tray: focus follows it there
      this.focusNext = `tray:${unit}`;
    } else this.message = { text: () => this.refusalText(r.refusal), kind: 'no' };
    this.syncView();
    this.render();
  }

  private undoStep(): void {
    const r = undo(this.assembly);
    if (r.ok) { this.setAssembly(r.state); this.message = { text: () => tx('asm.undone'), kind: 'info' }; }
    else this.message = { text: () => this.refusalText(r.refusal), kind: 'no' };
    this.syncView();
    this.render();
  }

  private restartAssembly(): void {
    this.setAssembly(restart(this.assembly));
    this.held[this.model] = null;
    this.message = { text: () => tx('asm.restarted'), kind: 'info' };
    this.syncView();
    this.render();
  }

  /**
   * The view draws the assembly as the reference does: every unit shown,
   * nothing left apart, and none turned but as its slot asks (a side panel on
   * another face, by `panelTurn`, which the view does not supply).
   */
  private viewAssembled(): boolean {
    const offsets = this.viewer?.unitOffsets();
    if (!offsets) return true;
    for (const [u, o] of offsets) {
      const slot = this.assembly.placed[u]?.slot;
      const a = this.model === 'edusat' && slot ? panelTurn(u, slot) : 0;
      const turn = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
      if (!o.visible || o.move > 1e-9 || Math.abs(o.turn - turn) > 1e-6) return false;
    }
    return true;
  }

  // ─── the experiment ───────────────────────────────────────────────────────

  private figuresNow(): EduFigures {
    const key = designKey(this.design);
    if (this.figures?.key !== key) this.figures = eduFigures(this.design, this.env.power);
    return this.figures;
  }

  private setDesign(next: EduDesign): void {
    this.progress.experiment = { ...next };
    this.progress.showing = 'mine';
    this.figures = null;
    this.sendNote = null;
    this.save();
    this.ensureModel();
    this.render();
  }

  private makeExperiment(): void {
    if (!this.progress.experiment) this.progress.experiment = { ...REFERENCE_DESIGN };
    if (this.progress.showing !== 'mine') this.sendNote = null;
    this.progress.showing = 'mine';
    this.progress.mode.edusat = 'experiment';
    this.figures = null;
    this.save();
    if (this.model !== 'edusat') { this.goModel('edusat'); return; }
    this.ensureModel();
    this.render();
  }

  /** The design on screen as the app is given it (`SatelliteRecord`), under the name the destination shows. */
  private recordNow(): ReturnType<typeof satelliteRecord> {
    const mine = this.progress.showing === 'mine' && !!this.progress.experiment;
    const key = designKey(this.design);
    return satelliteRecord(this.figuresNow(), `structure-edusat-${key.replaceAll(':', '-')}`, tx(mine ? 'go.satName' : 'go.satNameRef'));
  }

  private send(where: 'orbit' | 'launch'): void {
    const key = designKey(this.design);
    const r = this.env.handoff.send(where, this.recordNow(), this.level);
    // a refusal leaves the record of what was last handed on as it was, and stays here to say why
    if (!r.ok) {
      const reason: SendNote['reason'] = r.reason === 'checks' ? { key: 'go.refused.checks', params: { n: r.issues } } : { key: `go.refused.${r.reason}` };
      this.sendNote = { kind: 'no', key: 'go.refused', reason, seq: ++this.msgSeq };
      this.render();
      return;
    }
    this.sendNote = null;
    this.sent = { where, key, sent: r.sent, receipt: r.receipt, check: r.receipt && checkReceipt(r.sent, r.receipt) };
  }

  /** "Put back" is offered while Launch still holds what this section last sent there (not a mission the learner made since). */
  private canPutBack(): boolean {
    return this.env.handoff.canRestoreLaunch();
  }

  /** Put back the mission Launch had before this section replaced it, and open Launch. */
  private restoreLaunch(): void {
    if (!this.canPutBack()) { this.render(); return; }
    if (this.env.handoff.restoreLaunch(this.level)) {
      if (this.sent?.where === 'launch') this.sent = null;
      this.sendNote = { kind: 'ok', key: 'go.restored', seq: ++this.msgSeq };
    } else {
      this.sendNote = { kind: 'no', key: 'go.restoreFailed', reason: { key: 'go.refused.restore' }, seq: ++this.msgSeq };
      this.render();
    }
  }

  // ─── navigation inside the section ────────────────────────────────────────

  private goModel(model: StructureModelId): void {
    if (model === this.model) return;
    this.env.go(this.level, model);
  }

  private setMode(mode: StructureMode): void {
    if (mode === 'experiment' && this.model !== 'edusat') return;
    if (mode === 'experiment' && !this.progress.experiment) { this.makeExperiment(); return; }
    const was = this.progress.mode[this.model];
    this.progress.mode[this.model] = mode;
    this.message = null;
    this.save();
    this.syncView();
    // the whole model in view to assemble it, or back from assembling
    if (was !== mode && (mode === 'assemble' || was === 'assemble')) this.viewer?.home();
    this.render();
  }

  private resetView(): void {
    this.views[this.model] = freshView();
    this.sel[this.model] = { unit: null, group: null, item: null };
    this.viewer?.home();
    this.syncView();
    this.render();
  }

  // ─── rendering ────────────────────────────────────────────────────────────

  /** Re-draw the section's panels, keeping the focus on the control that had it (`data-k`). */
  private render(): void {
    if (!this.visible) return;
    const active = document.activeElement as HTMLElement | null;
    const k = active && this.root.contains(active) ? active.dataset.k : undefined;
    this.root.setAttribute('aria-labelledby', 'st-title');
    this.root.dataset.model = this.model;
    this.root.dataset.mode = this.mode;
    this.root.dataset.level = this.level;
    this.renderHead();
    this.renderStage();
    this.renderSide();
    // focus stays on the control pressed; when it went or cannot be pressed now, on the one the action named, else the side's heading
    const usable = (key: string | undefined | null): HTMLElement | null => {
      const e = key ? this.root.querySelector<HTMLElement>(`[data-k="${CSS.escape(key)}"]`) : null;
      return e && !(e as HTMLButtonElement).disabled ? e : null;
    };
    if (k) (usable(k) ?? usable(this.focusNext) ?? this.side.querySelector<HTMLElement>('h2'))?.focus({ preventScroll: true });
    this.focusNext = null;
    this.announceChanges();
  }

  /**
   * The section's messages said once, when they change, by the live region
   * that stays (`announcer`): the panels that show them are redrawn on every
   * press, and a live region made afresh with its text is not reliably read.
   */
  private announceChanges(): void {
    const parts: string[] = [];
    const store = this.storeNote ?? '';
    if (store !== this.said.store && this.storeNote) parts.push(tx(`store.${this.storeNote}`));
    this.said.store = store;
    if (this.mode === 'assemble' && this.message && this.message.seq !== this.said.msg) parts.push(this.message.text());
    this.said.msg = this.message?.seq ?? 0;
    if (this.mode === 'experiment' && this.sendNote && this.sendNote.seq !== this.said.send) parts.push(this.sendNoteText());
    this.said.send = this.sendNote?.seq ?? 0;
    // the energy verdict, once for each design shown
    const key = this.mode === 'experiment' && this.model === 'edusat' ? designKey(this.design) : '';
    if (key && key !== this.said.verdict) parts.push(this.figuresNow().powered ? tx('res.ok') : tx('res.short'));
    this.said.verdict = key;
    if (parts.length) this.say(parts.join(' '));
  }

  /** Say `text` in the live region: emptied first, so the same words said again are read again; the latest call wins. */
  private say(text: string): void {
    this.announcer.textContent = '';
    const seq = ++this.saySeq;
    requestAnimationFrame(() => { if (seq === this.saySeq) this.announcer.textContent = text; });
  }

  private sendNoteText(): string {
    const n = this.sendNote;
    return n ? tx(n.key, { ...n.params, ...(n.reason ? { reason: tx(n.reason.key, n.reason.params) } : {}) }) : '';
  }

  private button(label: string, k: string, onClick: () => void, opts: { pressed?: boolean; disabled?: boolean; cls?: string; title?: string } = {}): HTMLButtonElement {
    const b = el('button', `st-btn${opts.cls ? ` ${opts.cls}` : ''}`, label);
    b.type = 'button';
    b.dataset.k = k;
    if (opts.pressed !== undefined) b.setAttribute('aria-pressed', String(opts.pressed));
    if (opts.disabled) b.disabled = true;
    if (opts.title) b.title = opts.title;
    b.addEventListener('click', onClick);
    return b;
  }

  private renderHead(): void {
    const title = el('div', 'st-title');
    const h = el('h1', '', tx('title'));
    h.id = 'st-title';
    title.append(h, el('p', 'st-lead', tx('lead')));
    if (getLang() !== 'th') title.append(el('p', 'st-draft', tx('draft')));
    const models = el('div', 'st-models');
    models.setAttribute('role', 'group');
    models.setAttribute('aria-label', tx('model.label'));
    for (const m of MODELS) {
      const b = this.button('', `model:${m}`, () => this.goModel(m), { pressed: m === this.model, cls: 'st-model' });
      b.append(el('strong', '', tx(`model.${m}`)), el('span', '', tx(`model.${m}.sub`)));
      models.append(b);
    }
    const modes = el('div', 'st-modes');
    modes.setAttribute('role', 'group');
    modes.setAttribute('aria-label', tx('mode.label'));
    for (const m of MODES) {
      const locked = m === 'experiment' && this.model !== 'edusat';
      modes.append(this.button(tx(`mode.${m}`), `mode:${m}`, () => this.setMode(m), {
        pressed: m === this.mode, disabled: locked, title: locked ? tx('mode.experiment.locked') : undefined, cls: 'st-mode',
      }));
    }
    const depth = el('nav', 'st-depth');
    depth.setAttribute('aria-label', tx('depth.label'));
    depth.append(el('span', 'st-depth-label', tx('depth.label')));
    for (const l of LEVELS) {
      const a = el('a', 'st-depth-link', tx(`depth.${l}`));
      a.href = this.env.href(l, this.model);
      a.title = tx(`depth.${l}.desc`);
      a.dataset.k = `depth:${l}`;
      if (l === this.level) a.setAttribute('aria-current', 'true');
      depth.append(a);
    }
    depth.append(el('span', 'st-depth-desc', tx(`depth.${this.level}.desc`)));
    this.head.replaceChildren(title, models, modes, depth);
    if (this.storeNote) {
      this.head.append(el('p', `st-msg ${this.storeNote === 'damaged' ? 'st-msg-info' : 'st-msg-no'}`, tx(`store.${this.storeNote}`)));
    }
  }

  private renderStage(): void {
    const v = this.views[this.model];
    this.canvas.setAttribute('aria-label', `${tx(`model.${this.model}`)}. ${tx('view.canvas')}`);
    // status: loading, failed, no WebGL
    const status: (HTMLElement | string)[] = [];
    const loadingNote = (): HTMLElement => el('p', 'st-note', tx('load.model', { name: tx(`model.${this.model}`) }));
    if (this.load.state === 'failed') {
      // a failure, with its retry, also without WebGL (the parts list and side view then need the data too)
      const p = el('p', 'st-note st-fail', tx(this.load.listWorks ? 'load.failed3d' : 'load.failed', { error: this.load.error() }));
      p.append(' ', this.button(tx('load.retry'), 'retry', () => { this.load = { state: 'idle' }; this.focusNext = 'home'; this.ensureModel(); }));
      status.push(p);
    } else if (this.glError) status.push(this.model === 'soyuz-st31' && !this.soyuz ? loadingNote() : el('p', 'st-note', tx('load.noGl')));
    else if (!this.viewer || (this.load.state === 'idle' && this.model === 'soyuz-st31') || this.load.state === 'loading') status.push(loadingNote());
    // the Soyuz layers' notes, only while Soyuz is on screen: a failure is kept for when it is back; a layer still
    // loading is cancelled when EduSat is shown, and fetched again with the model
    const soyuzOn = this.model === 'soyuz-st31';
    if (soyuzOn) for (const l of this.layerLoading) status.push(el('p', 'st-note', tx(`load.layer.${l}`)));
    if (soyuzOn) for (const [l, error] of this.layerFailed) {
      const p = el('p', 'st-note st-fail', tx('load.layerFailed', { layer: tx(`info.layer.${l}`), error: error() }));
      p.append(' ', this.button(tx('load.retry'), `retry:${l}`, () => {
        this.layerFailed.delete(l);
        // the retry button goes with the note: focus to the layer's own switch
        this.focusNext = l;
        this.views['soyuz-st31'][l] = true;
        void this.loadLayer(l);
        this.render();
      }));
      status.push(p);
    }
    this.status.replaceChildren(...status);
    // the side view when there is no 3-D, or the model's 3-D failed (the canvas then goes: it holds nothing of this model)
    const noView = !!this.glError || this.load.state === 'failed';
    this.canvas.hidden = noView;
    // the side view needs the model's parts: EduSat's are in the code, the Soyuz's come with its data
    const sideView = noView && (this.model === 'edusat' || !!this.soyuz);
    this.fallback.hidden = !sideView;
    if (sideView) this.renderFallback();
    else this.fallback.replaceChildren();
    // the legend
    this.legend.replaceChildren();
    if (this.mode !== 'assemble' && v.colour !== 'material') {
      const list = v.colour === 'category' ? PART_CATEGORIES.map((c, i) => [tx(`cat.${c}`), CATEGORY_COLOURS[i]]) : CERTAINTIES.map((c, i) => [tx(`cert.${c}`), CERTAINTY_COLOURS[i]]);
      const ul = el('ul', 'st-legend-list');
      for (const [label, colour] of list) {
        const li = el('li');
        const sw = el('span', 'st-swatch');
        sw.style.background = colour;
        li.append(sw, label);
        ul.append(li);
      }
      this.legend.append(ul);
      if (v.colour === 'certainty' && this.model === 'soyuz-st31') this.legend.append(el('p', 'st-small', tx('cert.byPilot')));
    }
    this.renderToolbar();
  }

  private renderFallback(): void {
    const boxes: SideBox[] = [];
    // assembling, only what is in place, drawn at the place its slot gives (a panel on another face at that face's)
    const assembling = this.mode === 'assemble';
    const placeOf = (u: string): string | null => {
      if (!assembling) return u;
      const p = this.assembly.placed[u];
      return p ? this.spec.slots.find((s) => s.id === p.slot)?.reference ?? u : null;
    };
    if (this.model === 'edusat') {
      for (const p of this.figuresNow().parts) {
        const at = placeOf(p.unit);
        const box = at && partFor(this.design, at)?.box;
        if (!box) continue;
        const [x, y] = box.center, [w, h] = box.size;
        boxes.push({ unit: p.unit, label: this.name(p.unit), x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2 });
      }
    } else if (this.soyuz) {
      for (const u of SOYUZ_UNITS) {
        if (!placeOf(u)) continue;
        const items = this.soyuz.units[u].items.map((i) => this.soyuz!.content.items[i].center);
        if (!items.length) continue;
        const xs = items.map((c) => c[0]), ys = items.map((c) => c[1]);
        boxes.push({ unit: u, label: this.name(u), x0: Math.min(...xs) - 0.6, x1: Math.max(...xs) + 0.6, y0: Math.min(...ys) - 0.5, y1: Math.max(...ys) + 0.5 });
      }
    }
    this.fallback.replaceChildren(el('p', 'st-small', tx('fallback.title')));
    if (boxes.length) this.fallback.append(sideView(boxes, this.sel[this.model].unit, (u) => this.select({ unit: u, group: null, item: null }, false)));
  }

  private renderToolbar(): void {
    const v = this.views[this.model];
    const bar: HTMLElement[] = [];
    const ready = !!this.viewer && this.shown?.model === this.model;
    bar.push(this.button(tx('view.home'), 'home', () => this.viewer?.home(), { disabled: !ready }));
    bar.push(this.button(tx('view.reset'), 'reset', () => this.resetView(), { disabled: !ready }));
    const sel = this.shownSelection();
    const hasSel = !!sel.unit;
    bar.push(this.button(tx('view.focus'), 'focus', () => this.focusSelection(), { disabled: !ready || !hasSel }));
    if (this.mode !== 'assemble') {
      bar.push(this.button(tx('view.hide'), 'hide', () => {
        for (const i of this.itemsOf(sel)) v.hidden.add(i);
        this.sel[this.model] = { unit: null, group: null, item: null };
        this.syncView(); this.render();
      }, { disabled: !ready || !hasSel }));
      bar.push(this.button(tx('view.isolate'), 'isolate', () => { v.isolate = new Set(this.itemsOf(sel)); this.syncView(); this.render(); }, { disabled: !ready || !hasSel }));
      bar.push(this.button(tx('view.showAll'), 'showAll', () => { v.hidden.clear(); v.isolate = null; this.syncView(); this.render(); }, { disabled: !ready || (!v.hidden.size && !v.isolate) }));
      if (this.model === 'soyuz-st31') {
        bar.push(this.button(tx('view.cutaway'), 'cutaway', () => {
          v.cutaway = !v.cutaway;
          if (v.cutaway) {
            v.inner = true;
            void this.loadLayer('inner');
            // face the side the cut opens: the hidden halves', not edge-on to the cut
            if (this.soyuz) this.viewer?.lookFrom(cutawayAzimuth(this.soyuz.content));
          }
          this.syncView(); this.render();
        }, { pressed: v.cutaway, disabled: !ready }));
        bar.push(this.button(tx('view.inner'), 'inner', () => { v.inner = !v.inner; if (v.inner) void this.loadLayer('inner'); this.syncView(); this.render(); }, { pressed: v.inner, disabled: !ready }));
        bar.push(this.button(tx('view.engine'), 'engine', () => { v.engine = !v.engine; if (v.engine) void this.loadLayer('engine'); this.syncView(); this.render(); }, { pressed: v.engine, disabled: !ready }));
      }
      bar.push(this.button(tx('view.ghost'), 'ghost', () => { v.ghost = !v.ghost; if (v.ghost && this.model === 'soyuz-st31') { v.inner = true; void this.loadLayer('inner'); } this.syncView(); this.render(); }, { pressed: v.ghost, disabled: !ready }));
      bar.push(this.slider(tx('view.explode'), 'explode', v.explode, (x) => { v.explode = x; this.syncView(); }, !ready));
      if (this.model === 'soyuz-st31') bar.push(this.slider(tx('view.fairing'), 'fairing', v.open, (x) => { v.open = x; this.syncView(); }, !ready));
      const colour = el('label', 'st-select');
      colour.append(el('span', '', tx('view.colour')));
      const select = el('select');
      select.dataset.k = 'colour';
      for (const c of ['material', 'category', 'certainty'] as const) {
        const o = el('option', '', tx(`view.colour.${c}`));
        o.value = c;
        o.selected = v.colour === c;
        select.append(o);
      }
      select.addEventListener('change', () => { v.colour = select.value as ColorMode; this.syncView(); this.render(); });
      colour.append(select);
      bar.push(colour);
    }
    const notes: HTMLElement[] = [];
    if (this.mode !== 'assemble') {
      if (v.cutaway) notes.push(el('p', 'st-small', tx('view.cutawayNote')));
      if (v.ghost) notes.push(el('p', 'st-small', tx('view.ghostNote')));
      if (v.explode > 0) notes.push(el('p', 'st-small', tx('view.explodeNote')));
      const hidden = v.hidden.size;
      if (hidden) notes.push(el('p', 'st-small', tx('view.hiddenCount', { n: hidden })));
    }
    const row = el('div', 'st-toolbar-row');
    row.append(...bar);
    this.toolbar.replaceChildren(row, ...notes);
    this.toolbar.setAttribute('role', 'toolbar');
    this.toolbar.setAttribute('aria-label', tx('view.label'));
  }

  private slider(label: string, k: string, value: number, set: (x: number) => void, disabled: boolean): HTMLElement {
    const wrap = el('label', 'st-slider');
    wrap.append(el('span', '', label));
    const input = el('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = String(Math.round(value * 100));
    input.dataset.k = k;
    input.disabled = disabled;
    input.addEventListener('input', () => set(Number(input.value) / 100));
    input.addEventListener('change', () => this.render());
    wrap.append(input);
    return wrap;
  }

  private renderSide(): void {
    const parts: HTMLElement[] = [];
    if (this.mode === 'assemble') parts.push(this.assemblyPanel());
    if (this.mode === 'experiment' && this.model === 'edusat') parts.push(this.experimentPanel());
    parts.push(this.infoPanel());
    if (this.mode !== 'assemble') parts.push(this.listPanel());
    if (this.model === 'edusat' && this.mode !== 'experiment') {
      const skip = el('section', 'st-panel st-skip');
      skip.append(el('p', 'st-small', tx('exp.unlock')), this.button(tx('exp.skip'), 'skip', () => this.makeExperiment(), { cls: 'st-primary' }));
      parts.push(skip);
    }
    this.side.replaceChildren(...parts);
  }

  // ─── the parts list ───────────────────────────────────────────────────────

  private listPanel(): HTMLElement {
    const panel = el('section', 'st-panel st-list');
    panel.append(el('h2', '', tx('list.title')));
    const units = this.model === 'edusat' ? EDU_UNITS : SOYUZ_UNITS;
    const tree = el('ul', 'st-tree');
    tree.setAttribute('aria-label', tx('list.units'));
    const sel = this.shownSelection();
    if (this.model === 'soyuz-st31' && !this.soyuz) {
      panel.append(el('p', 'st-small', this.load.state === 'failed' ? tx('load.failed', { error: this.load.error() }) : tx('load.model', { name: tx('model.soyuz-st31') })));
      return panel;
    }
    if (this.level === 'engineer' && this.model === 'soyuz-st31') {
      const search = el('input', 'st-search');
      search.type = 'search';
      search.placeholder = tx('list.filter');
      search.setAttribute('aria-label', tx('list.filter'));
      search.value = this.filter;
      search.dataset.k = 'filter';
      search.addEventListener('input', () => { this.filter = search.value; this.render(); });
      panel.append(search);
    }
    for (const u of units) {
      const li = el('li');
      const isSel = sel.unit === u && sel.group === null && sel.item === null;
      const unitBtn = this.button(this.name(u), `unit:${u}`, () => this.select({ unit: u, group: null, item: null }, true), { pressed: isSel, cls: 'st-node' });
      if (this.model === 'soyuz-st31' && this.soyuz) {
        const n = this.soyuz.units[u as SoyuzUnit].items.length;
        unitBtn.append(el('span', 'st-count', tx('list.parts', { n })));
      }
      li.append(unitBtn);
      if (this.level !== 'watch' && this.model === 'soyuz-st31' && this.soyuz) {
        const groups = this.soyuz.units[u as SoyuzUnit].groups;
        const open = sel.unit === u || this.expanded.has(u) || !!this.filter;
        const toggle = this.button(open ? '−' : '+', `expand:${u}`, () => {
          if (this.expanded.has(u)) this.expanded.delete(u); else this.expanded.add(u);
          this.render();
        }, { cls: 'st-expand', title: tx('list.groups', { n: groups.length }) });
        toggle.setAttribute('aria-expanded', String(open));
        li.prepend(toggle);
        if (open) li.append(this.groupList(u as SoyuzUnit, sel));
      }
      tree.append(li);
    }
    panel.append(tree);
    return panel;
  }

  private groupList(unit: SoyuzUnit, sel: Selection): HTMLElement {
    const s = this.soyuz!;
    const ul = el('ul', 'st-tree st-sub');
    const filter = this.filter.trim().toLowerCase();
    for (const gi of s.units[unit].groups) {
      const g = s.groups[gi];
      const items = filter ? g.items.filter((i) => s.content.items[i].id.toLowerCase().includes(filter)) : g.items;
      if (filter && !items.length) continue;
      const li = el('li');
      const label = g.group ? g.group.label : tx('list.other');
      const b = this.button(label, `group:${gi}`, () => this.select({ unit, group: gi, item: null }, true), { pressed: sel.group === gi && sel.item === null, cls: 'st-node' });
      b.append(el('span', 'st-count', tx('list.parts', { n: g.items.length })));
      li.append(b);
      if (this.level === 'engineer' && (sel.group === gi || this.expanded.has(`g${gi}`) || filter)) {
        const sub = el('ul', 'st-tree st-sub st-items');
        const limit = this.expanded.has(`more${gi}`) ? items.length : Math.min(items.length, 40);
        for (const i of items.slice(0, limit)) {
          const p = s.content.items[i];
          const item = el('li');
          item.append(this.button(p.id.slice(p.id.indexOf('.') + 1), `item:${i}`, () => this.select({ unit, group: gi, item: i }, true), { pressed: sel.item === i, cls: 'st-node st-mono' }));
          sub.append(item);
        }
        if (limit < items.length) {
          const more = el('li');
          more.append(this.button(tx('list.more', { n: items.length - limit }), `more:${gi}`, () => { this.expanded.add(`more${gi}`); this.render(); }, { cls: 'st-link' }));
          sub.append(more);
        }
        li.append(sub);
      }
      ul.append(li);
    }
    return ul;
  }

  // ─── the information panel ────────────────────────────────────────────────

  private infoPanel(): HTMLElement {
    const panel = el('section', 'st-panel st-info');
    const sel = this.shownSelection();
    if (!sel.unit) {
      panel.append(el('p', 'st-small', tx('info.empty')));
      if (this.model === 'soyuz-st31' && this.soyuz) {
        const g = this.soyuz.content.guide;
        panel.append(el('h2', '', g.title), el('p', '', g.intro), el('p', 'st-small', g.statusNote));
        if (getLang() !== 'th') panel.append(el('p', 'st-small', tx('info.guideThai')));
        panel.append(el('p', 'st-small', tx('soyuz.st31')));
      } else if (this.model === 'edusat') {
        panel.append(el('h2', '', tx('model.edusat')), el('p', '', tx('edu.concept')), el('p', 'st-small', tx('edu.principles')));
      }
      return panel;
    }
    if (this.model === 'edusat') this.eduInfo(panel, sel.unit as EduUnit);
    else this.soyuzInfo(panel, sel);
    return panel;
  }

  private badge(c: Certainty): HTMLElement {
    const b = el('span', `st-badge st-cert-${c}`, tx(`cert.${c}`));
    return b;
  }

  private sourceList(ids: readonly string[], all: readonly { id: string; title: string; url?: string; supports?: string; scope?: string }[]): HTMLElement {
    const ul = el('ul', 'st-sources');
    for (const id of ids) {
      const s = all.find((x) => x.id === id);
      if (!s) continue;
      const li = el('li');
      if (s.url) {
        const a = el('a', '', s.title);
        a.href = s.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = tx('src.open');
        li.append(a);
      } else li.append(s.title);
      if (s.supports) li.append(el('span', 'st-small', ` — ${s.supports}`));
      if (s.scope && this.level === 'engineer') li.append(el('span', 'st-small st-scope', ` (${s.scope})`));
      ul.append(li);
    }
    return ul;
  }

  private soyuzInfo(panel: HTMLElement, sel: Selection): void {
    const s = this.soyuz;
    if (!s) return;
    const unit = sel.unit as SoyuzUnit;
    const comp = s.units[unit].component;
    if (sel.item !== null) {
      const p = s.content.items[sel.item];
      panel.append(el('h2', 'st-mono', p.id), el('p', 'st-small', `${tx('info.belongs')}: ${this.name(unit)}${sel.group !== null ? ` › ${s.groups[sel.group].group?.label ?? tx('list.other')}` : ''}`));
      const dl = el('dl', 'st-facts');
      const row = (k: string, v: string | HTMLElement) => { dl.append(el('dt', '', k)); const dd = el('dd'); dd.append(v); dl.append(dd); };
      row(tx('info.partId'), p.id);
      if (p.role) row(tx('info.role'), p.role);
      row(tx('info.kind'), tx(`cat.${PART_CATEGORIES[s.category[sel.item]]}`));
      row(tx('info.status'), this.badge(CERTAINTIES[s.certainty[sel.item]]));
      row(tx('info.layer'), tx(`info.layer.${p.layer}`));
      row(tx('info.position'), p.center.map((c) => num(c, 2)).join(', '));
      if (p.model) row(tx('info.engineModel'), p.model);
      panel.append(dl);
      if (p.mounts?.length) {
        panel.append(el('h3', '', tx('info.mounts')));
        const ul = el('ul', 'st-links');
        for (const m of p.mounts) {
          const li = el('li');
          li.append(this.button(s.content.items[m].id, `mount:${m}`, () => this.select({ unit: s.content.items[m].unit, group: s.groupOf[m], item: m }, true), { cls: 'st-link st-mono' }));
          ul.append(li);
        }
        panel.append(ul);
      }
      if (p.circuits?.length) {
        panel.append(el('h3', '', tx('info.circuits')));
        const ul = el('ul');
        for (const c of p.circuits) {
          const circuit = s.content.circuits.find((x) => x.id === c);
          const li = el('li', '', circuit ? circuit.label : c);
          if (circuit) li.append(el('span', 'st-small', ` — ${circuit.confidence}`));
          ul.append(li);
        }
        panel.append(ul);
      }
      if (p.scope !== undefined) panel.append(el('h3', '', tx('info.scope')), el('p', 'st-small st-scope', s.content.scopes[p.scope]));
      panel.append(el('p', 'st-small', tx('cert.byPilot')));
      return;
    }
    if (sel.group !== null) {
      const g = s.groups[sel.group];
      panel.append(el('h2', '', g.group ? g.group.label : tx('list.other')), el('p', 'st-small', `${tx('info.belongs')}: ${this.name(unit)}`));
      const dl = el('dl', 'st-facts');
      if (g.group) { dl.append(el('dt', '', tx('info.count')), el('dd', '', `${g.group.count} ${g.group.unit}`)); }
      dl.append(el('dt', '', tx('list.title')), el('dd', '', tx('list.parts', { n: g.items.length })));
      panel.append(dl);
      // what the group is made of, by kind and by how it is known
      const byCat = new Map<string, number>(), byCert = new Map<Certainty, number>();
      for (const i of g.items) {
        const c = PART_CATEGORIES[s.category[i]];
        byCat.set(c, (byCat.get(c) ?? 0) + 1);
        const k = CERTAINTIES[s.certainty[i]];
        byCert.set(k, (byCert.get(k) ?? 0) + 1);
      }
      const kinds = el('p', 'st-small', `${tx('info.kind')}: ${[...byCat].map(([c, n]) => `${tx(`cat.${c}`)} ${n}`).join(' · ')}`);
      const certs = el('p', 'st-chips');
      for (const [c, n] of byCert) { certs.append(this.badge(c), ` ${n} `); }
      panel.append(kinds, certs);
      if (comp?.note && this.level === 'engineer') panel.append(el('h3', '', tx('info.note')), el('p', 'st-small', comp.note));
      return;
    }
    // an assembly
    panel.append(el('h2', '', this.name(unit)));
    if (comp) {
      panel.append(el('p', 'st-small', comp.subtitle));
      panel.append(el('h3', '', tx('info.function')), el('p', '', comp.body.split('\n\n')[0]));
      if (this.level !== 'watch' && comp.body.includes('\n\n')) for (const para of comp.body.split('\n\n').slice(1)) panel.append(el('p', '', para));
    }
    if (getLang() !== 'th') panel.append(el('p', 'st-small', tx('info.guideThai')));
    // relations
    panel.append(el('h3', '', tx('info.relations')));
    const rel = el('ul', 'st-links');
    for (const r of relationsOf(unit)) {
      const other = r.a === unit ? r.b : r.a;
      const li = el('li');
      li.append(this.button(this.name(other), `rel:${other}`, () => this.select({ unit: other, group: null, item: null }, true), { cls: 'st-link' }), el('span', 'st-small', ` — ${tx(`soyuz.joint.${r.joint}`)}`));
      rel.append(li);
    }
    panel.append(rel);
    if (this.level !== 'watch' && comp) {
      panel.append(el('h3', '', tx('info.facts')));
      const dl = el('dl', 'st-facts');
      for (const f of comp.facts) {
        dl.append(el('dt', '', f.label));
        const dd = el('dd', '', `${f.value} `);
        dd.append(this.badge(soyuzFactCertainty(comp.id, f.label)));
        dl.append(dd);
      }
      panel.append(dl);
      if (comp.observations.length) {
        panel.append(el('h3', '', tx('info.observe')));
        const ul = el('ul');
        for (const o of comp.observations) ul.append(el('li', '', o));
        panel.append(ul);
      }
    }
    if (this.level === 'engineer' && comp) {
      panel.append(el('h3', '', tx('info.note')), el('p', 'st-small', comp.note));
      panel.append(el('h3', '', tx('info.sources')), this.sourceList(comp.sourceIds, s.content.sources));
      panel.append(el('p', 'st-small', tx('cert.legend')));
    }
  }

  private eduInfo(panel: HTMLElement, unit: EduUnit): void {
    const part = partFor(this.design, unit);
    if (!part) return;
    panel.append(el('h2', '', this.name(unit)));
    const option = unit === 'battery' ? this.design.battery : unit === 'payload' ? this.design.payload : null;
    if (option) panel.append(el('p', 'st-small', tx(`edu.option.${option}`)));
    const doesKey = option ? `edu.does.${option}` : PANELS.includes(unit) ? 'edu.does.panel' : `edu.does.${unit}`;
    panel.append(el('h3', '', tx('info.function')), el('p', '', tx(doesKey)));
    panel.append(el('h3', '', tx('info.relations')));
    const rel = el('ul', 'st-links');
    for (const r of eduRelationsOf(unit)) {
      const other = r.a === unit ? r.b : r.a;
      const li = el('li');
      li.append(this.button(this.name(other), `rel:${other}`, () => this.select({ unit: other, group: null, item: null }, true), { cls: 'st-link' }), el('span', 'st-small', ` — ${tx(`edu.link.${r.link}`)}`));
      rel.append(li);
    }
    panel.append(rel);
    if (this.level === 'watch') return;
    const dl = el('dl', 'st-facts');
    const massDd = el('dd', '', `${num(part.massKg, 2)} ${tx('unit.kg')} `);
    massDd.append(this.badge(part.massCertainty));
    dl.append(el('dt', '', tx('info.mass')), massDd);
    if (part.loads.length) {
      const dd = el('dd', '', part.loads.map((l) => `${num(l.watts, 2)} ${tx('unit.W')}${l.minutes ? ` × ${l.minutes} ${tx('unit.min')}` : ''}`).join(' + ') + ' ');
      dd.append(this.badge('assumed'));
      dl.append(el('dt', '', tx('info.power')), dd);
    }
    if (part.batteryWh) dl.append(el('dt', '', tx('res.capacity')), el('dd', '', `${num(part.batteryWh, 2)} ${tx('unit.Wh')}`));
    const [w, h, d] = part.box.size;
    dl.append(el('dt', '', tx('info.size')), el('dd', '', `${num(w * 1000, 0)} × ${num(h * 1000, 0)} × ${num(d * 1000, 0)} mm`));
    // where it is fitted: assembling, the slot it went into (a side panel may be on another face), else the reference's
    const fitted = this.mode === 'assemble' ? this.assembly.placed[unit]?.slot : undefined;
    dl.append(el('dt', '', tx('info.slot')), el('dd', '', this.name(fitted ?? slotOfUnit(unit))));
    panel.append(dl);
    if (this.level === 'engineer') {
      panel.append(el('h3', '', tx('info.sources')), this.sourceList(part.sourceIds, EDUSAT_SOURCES));
      const id = el('dl', 'st-facts');
      id.append(el('dt', '', tx('info.partId')), el('dd', 'st-mono', part.id));
      panel.append(id);
    }
  }

  // ─── the assembly panel ───────────────────────────────────────────────────

  private assemblyPanel(): HTMLElement {
    const panel = el('section', 'st-panel st-asm');
    const spec = this.spec, state = this.assembly;
    const check = checkAssembly(spec, state);
    const complete = check.complete && this.viewAssembled();
    panel.append(el('h2', '', tx('mode.assemble')));
    const prog = el('p', 'st-progress', tx('asm.placed', { n: check.placed, total: check.total }));
    const bar = el('progress');
    bar.max = check.total;
    bar.value = check.placed;
    bar.setAttribute('aria-label', tx('asm.placed', { n: check.placed, total: check.total }));
    panel.append(prog, bar);
    if (this.model === 'soyuz-st31') panel.append(el('p', 'st-small', tx('soyuz.reference')));
    const msg = el('p', `st-msg${this.message ? ` st-msg-${this.message.kind}` : ''}`, this.message?.text() ?? tx('asm.pick'));
    panel.append(msg);
    if (complete) {
      const done = el('div', 'st-done');
      done.append(el('strong', '', tx('asm.complete')), el('p', 'st-small', tx('asm.checked', { n: check.total })), el('p', 'st-small', tx('asm.notStrength')));
      if (this.model === 'edusat') done.append(this.button(tx('exp.create'), 'create', () => this.makeExperiment(), { cls: 'st-primary' }));
      panel.append(done);
    }
    // the tray
    const tray = el('div', 'st-tray');
    tray.append(el('h3', '', tx('asm.tray')));
    const held = this.held[this.model];
    const loose = spec.units.filter((u) => !state.placed[u.id]);
    if (!loose.length) tray.append(el('p', 'st-small', tx('asm.trayEmpty')));
    const list = el('div', 'st-tray-list');
    for (const u of loose) {
      const b = this.button(this.name(u.id), `tray:${u.id}`, () => {
        this.held[this.model] = held?.unit === u.id ? null : { unit: u.id, slot: null, turn: TRAY_TURN[u.id] ?? 0 };
        this.message = null;
        this.syncView(); this.render();
      }, { pressed: held?.unit === u.id, cls: 'st-tray-part' });
      b.draggable = true;
      b.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/plain', u.id);
        this.held[this.model] = { unit: u.id, slot: null, turn: held?.unit === u.id ? held.turn : TRAY_TURN[u.id] ?? 0 };
        this.syncView();
      });
      list.append(b);
    }
    tray.append(list);
    if (loose.length) tray.append(el('p', 'st-small', tx('asm.drag')));
    panel.append(tray);
    // what is in place, each one selectable (to take it off) from here too, not only on the model
    const inPlace = spec.units.filter((u) => state.placed[u.id]);
    if (inPlace.length) {
      const box = el('div', 'st-tray st-in-place');
      box.append(el('h3', '', tx('asm.inPlace')));
      const row = el('div', 'st-tray-list');
      const selected = this.sel[this.model].unit;
      for (const u of inPlace) {
        row.append(this.button(this.name(u.id), `placed:${u.id}`, () => this.select({ unit: u.id, group: null, item: null }, false),
          { pressed: selected === u.id, cls: 'st-tray-part' }));
      }
      box.append(row);
      panel.append(box);
    }
    // what is held: its place and way round
    if (held) {
      const box = el('div', 'st-held');
      box.append(el('h3', '', `${tx('asm.holding')}: ${this.name(held.unit)}`));
      const slots = el('div', 'st-slots');
      slots.setAttribute('role', 'group');
      slots.setAttribute('aria-label', tx('asm.slot'));
      slots.append(el('span', 'st-small', tx('asm.slot')));
      for (const s of spec.slots) {
        const by = Object.entries(state.placed).find(([, p]) => p.slot === s.id)?.[0];
        if (by) continue;
        slots.append(this.button(this.name(s.id), `slot:${s.id}`, () => { held.slot = s.id; this.syncView(); this.render(); }, { pressed: held.slot === s.id, cls: 'st-slot' }));
      }
      box.append(slots);
      const unit = spec.units.find((u) => u.id === held.unit);
      if (unit && unit.orientations > 1) {
        const turn = el('div', 'st-turn');
        turn.append(el('span', 'st-small', tx('asm.turn')));
        const label = unit.orientations === 2 ? tx('asm.turn.flip') : tx('asm.turn.quarter', { deg: 90 });
        turn.append(this.button(label, 'turn', () => { held.turn = (held.turn + 1) % unit.orientations; this.syncView(); this.render(); }));
        box.append(turn);
        box.append(el('p', 'st-small', tx('asm.preview')));
      }
      box.append(this.button(tx('asm.install'), 'install', () => this.tryInstall(), { cls: 'st-primary', disabled: !held.slot }));
      panel.append(box);
    }
    // actions
    const actions = el('div', 'st-actions');
    const selUnit = this.sel[this.model].unit;
    actions.append(
      this.button(tx('asm.remove'), 'remove', () => this.removeSelected(), { disabled: !selUnit || !state.placed[selUnit] }),
      this.button(tx('asm.undo'), 'undo', () => this.undoStep(), { disabled: !state.history.length }),
      this.button(tx('asm.restart'), 'restart', () => this.restartAssembly(), { disabled: !Object.keys(state.placed).length }),
    );
    panel.append(actions);
    if (selUnit && state.placed[selUnit]) {
      const deps = dependents(spec, state, selUnit);
      if (deps.length) panel.append(el('p', 'st-small', tx('asm.no.holds', { unit: this.name(selUnit), dependents: this.names(deps) })));
    }
    const next = nextUnits(spec, state);
    if (next.length && this.level !== 'engineer') panel.append(el('p', 'st-small st-hint', tx('asm.next', { list: this.names(next) })));
    if (this.level === 'engineer') {
      const ul = el('ul', 'st-small st-reqs');
      for (const u of spec.units) {
        const li = el('li', '', `${this.name(u.id)} ← ${u.requires.length ? this.names(u.requires) : '—'}`);
        if (state.placed[u.id]) li.classList.add('st-done-row');
        ul.append(li);
      }
      panel.append(el('h3', '', tx('info.relations')), ul);
    }
    if (this.model === 'soyuz-st31') panel.append(el('p', 'st-small', tx('soyuz.order')));
    return panel;
  }

  // ─── the experiment panel ─────────────────────────────────────────────────

  private experimentPanel(): HTMLElement {
    const panel = el('section', 'st-panel st-exp');
    const mine = this.progress.experiment;
    const showingMine = this.progress.showing === 'mine' && !!mine;
    panel.append(el('h2', '', tx('mode.experiment')), el('p', 'st-small', tx('exp.unlock')));
    const which = el('div', 'st-which');
    which.setAttribute('role', 'group');
    which.setAttribute('aria-label', tx('exp.showing'));
    which.append(
      this.button(tx('exp.reference'), 'show:reference', () => { this.progress.showing = 'reference'; this.figures = null; this.sendNote = null; this.save(); this.ensureModel(); this.render(); }, { pressed: !showingMine }),
      this.button(tx('exp.mine'), 'show:mine', () => this.makeExperiment(), { pressed: showingMine }),
    );
    panel.append(which);
    const design = this.design;
    // the two systems
    const option = <T extends string>(title: string, name: string, options: readonly T[], current: T, set: (v: T) => void, describe: (v: T) => string, why: string) => {
      const fs = el('fieldset', 'st-options');
      fs.append(el('legend', '', title));
      for (const o of options) {
        const label = el('label', 'st-option');
        const input = el('input');
        input.type = 'radio';
        input.name = name;
        input.value = o;
        input.checked = o === current;
        input.disabled = !showingMine;
        input.dataset.k = `${name}:${o}`;
        input.addEventListener('change', () => set(o));
        const text = el('span');
        text.append(el('strong', '', tx(`edu.option.${o}`)), el('span', 'st-small', describe(o)));
        label.append(input, text);
        fs.append(label);
      }
      fs.append(el('p', 'st-small', why));
      return fs;
    };
    panel.append(option(tx('exp.power'), 'battery', BATTERY_OPTIONS, design.battery, (b: BatteryOption) => this.setDesign({ ...design, battery: b }),
      (b) => `${num(BATTERIES[b].batteryWh!, 1)} ${tx('unit.Wh')} · ${num(BATTERIES[b].massKg, 2)} ${tx('unit.kg')}`, tx('edu.why.battery')));
    panel.append(option(tx('exp.payload'), 'payload', PAYLOAD_OPTIONS, design.payload, (p: PayloadOption) => this.setDesign({ ...design, payload: p }),
      (p) => `${PAYLOADS[p].loads.map((l) => `${num(l.watts, 1)} ${tx('unit.W')} × ${l.minutes} ${tx('unit.min')}`).join('')} · ${num(PAYLOADS[p].massKg, 2)} ${tx('unit.kg')}`, tx('edu.why.payload')));
    panel.append(el('p', 'st-small', tx('exp.panels', { area: num(4 * CELLS_PER_PANEL * CELL_AREA, 4) })));
    if (showingMine) panel.append(this.button(tx('exp.restore'), 'restore', () => this.setDesign({ ...REFERENCE_DESIGN })));
    panel.append(this.resultsBlock(), this.compareBlock(), this.handoffBlock());
    return panel;
  }

  private resultsBlock(): HTMLElement {
    const box = el('div', 'st-results');
    const f = this.figuresNow();
    const current = designKey(this.design);
    box.append(el('h3', '', tx('res.title')));
    // never shown while `figuresNow` works the figures out again on each change: it guards that, so an older result can never stand for this design
    if (f.key !== current) { box.append(el('p', 'st-msg st-msg-no', tx('res.stale'))); return box; }
    box.dataset.design = f.key;
    const r = f.power;
    const usable = r.capacityWh - r.floorWh;
    const need = (r.perOrbit.eclipseDemandWh) / r.dischargeEff;
    const verdict = el('p', `st-verdict ${f.powered ? 'st-ok' : 'st-short'}`, f.powered ? tx('res.ok') : tx('res.short'));
    box.append(verdict, el('p', 'st-small', tx(f.powered ? 'res.why.ok' : 'res.why.short', { need: num(need, 2), usable: num(usable, 2) })));
    const dl = el('dl', 'st-facts st-figures');
    const row = (k: string, v: string, key: string) => { const dt = el('dt', '', k); const dd = el('dd', '', v); dd.dataset.fig = key; dl.append(dt, dd); };
    row(tx('res.mass'), `${num(f.massKg, 3)} ${tx('unit.kg')}`, 'mass');
    row(tx('res.capacity'), `${num(f.batteryWh, 2)} ${tx('unit.Wh')}`, 'capacity');
    row(tx('res.array'), `${num(r.arrayPower, 2)} ${tx('unit.W')}`, 'array');
    row(tx('res.loadDay'), `${num(r.dayLoad, 2)} ${tx('unit.W')}`, 'loadDay');
    row(tx('res.loadNight'), `${num(r.eclipseLoad, 2)} ${tx('unit.W')}`, 'loadNight');
    row(tx('res.minCharge'), `${num(r.minChargeWh, 2)} ${tx('unit.Wh')} (${num((100 * r.minChargeWh) / r.capacityWh, 0)}%)`, 'minCharge');
    row(tx('res.floor'), `${num(r.floorWh, 2)} ${tx('unit.Wh')}`, 'floor');
    const short = r.shortfalls[0];
    row(tx('res.shortfall'), short ? tx('res.shortEach', { minutes: num((short.end - short.start) / 60, 1), wh: num(short.unmetWh, 2) }) : tx('res.none'), 'shortfall');
    if (this.level !== 'watch') {
      row(tx('res.bus'), `${num(r.busPower, 2)} ${tx('unit.W')}`, 'bus');
      row(tx('res.energyIn'), `${num(r.perOrbit.supplyWh, 2)} ${tx('unit.Wh')}`, 'energyIn');
      row(tx('res.energyOut'), `${num(r.perOrbit.demandWh, 2)} ${tx('unit.Wh')}`, 'energyOut');
      row(tx('res.massLimit'), `${num(f.massLimitKg, 2)} ${tx('unit.kg')}`, 'massLimit');
    }
    box.append(dl);
    // the bound is this pilot's: later CDS revisions and each launch provider set their own
    if (this.level !== 'watch') box.append(el('p', 'st-small', tx('res.massLimitNote')));
    box.append(chargeChart(r, f.scenario.orbits));
    box.append(el('p', 'st-small', tx('res.scenario', { eclipse: num(r.eclipse / 60, 1), period: num(r.period / 60, 1) })), el('p', 'st-small', tx('res.attitude')));
    if (this.level === 'engineer') {
      box.append(el('h3', '', tx('res.method')), el('p', 'st-small', tx('res.method.text', { charge: num(r.chargeEff, 3) })));
      box.append(el('h3', '', tx('res.steady')),
        el('p', 'st-small', tx('res.steady.array', { need: num(f.steady.arrayNeeded, 2), given: num(f.steady.arrayGiven, 2) })),
        el('p', 'st-small', tx('res.steady.battery', { need: num(f.steady.batteryNeeded, 2), given: num(f.steady.batteryFitted, 2) })));
      box.append(this.optionsTable());
      box.append(el('h3', '', tx('res.sources')), this.sourceList(EDUSAT_SOURCES.map((s) => s.id), EDUSAT_SOURCES));
    }
    box.append(el('p', 'st-small', tx('res.limits')));
    return box;
  }

  private optionsTable(): HTMLElement {
    const table = el('table', 'st-table');
    table.append(el('caption', '', tx('res.table')));
    const head = el('tr');
    for (const k of ['res.table.option', 'res.table.affects', 'res.table.unit', 'res.table.source', 'res.table.to']) head.append(el('th', '', tx(k)));
    table.append(head);
    const add = (option: string, affects: string, unit: string, source: string, to: string) => {
      const tr = el('tr');
      for (const v of [option, affects, unit, source, to]) tr.append(el('td', '', v));
      table.append(tr);
    };
    for (const b of BATTERY_OPTIONS) {
      add(tx(`edu.option.${b}`), `${tx('res.capacity')} ${num(BATTERIES[b].batteryWh!, 2)}; ${tx('info.mass')} ${num(BATTERIES[b].massKg, 2)}`, `${tx('unit.Wh')}, ${tx('unit.kg')}`, 'cell-18650, pilot', `${tx('res.table.to.mass')}; ${tx('res.table.to.power')}`);
    }
    for (const p of PAYLOAD_OPTIONS) {
      const l = PAYLOADS[p].loads[0];
      add(tx(`edu.option.${p}`), `${tx('info.power')} ${num(l.watts, 1)} × ${l.minutes}; ${tx('info.mass')} ${num(PAYLOADS[p].massKg, 2)}`, `${tx('unit.W')}, ${tx('unit.min')}, ${tx('unit.kg')}`, 'pilot', `${tx('res.table.to.mass')}; ${tx('res.table.to.power')}`);
    }
    return table;
  }

  private compareBlock(): HTMLElement {
    const box = el('div', 'st-compare');
    box.append(el('h3', '', tx('exp.compare')));
    const design = this.design;
    const changes = changesFrom(design);
    box.append(el('p', 'st-small', changes.length ? tx('exp.changed', { n: changes.length }) : tx('exp.same')));
    const ref = eduFigures(REFERENCE_DESIGN, this.env.power), now = this.figuresNow();
    const table = el('table', 'st-table st-diff');
    const head = el('tr');
    head.append(el('th', '', ''), el('th', '', tx('exp.reference')), el('th', '', this.progress.showing === 'mine' ? tx('exp.mine') : tx('exp.reference')));
    table.append(head);
    const row = (label: string, a: string, b: string) => {
      const tr = el('tr');
      if (a !== b) tr.classList.add('st-changed');
      tr.append(el('th', '', label), el('td', '', a), el('td', '', b));
      table.append(tr);
    };
    row(tx('edu.unit.battery'), tx(`edu.option.${REFERENCE_DESIGN.battery}`), tx(`edu.option.${design.battery}`));
    row(tx('edu.unit.payload'), tx(`edu.option.${REFERENCE_DESIGN.payload}`), tx(`edu.option.${design.payload}`));
    row(tx('res.mass'), `${num(ref.massKg, 3)} ${tx('unit.kg')}`, `${num(now.massKg, 3)} ${tx('unit.kg')}`);
    row(tx('res.capacity'), `${num(ref.batteryWh, 2)} ${tx('unit.Wh')}`, `${num(now.batteryWh, 2)} ${tx('unit.Wh')}`);
    row(tx('res.minCharge'), `${num(ref.power.minChargeWh, 2)} ${tx('unit.Wh')}`, `${num(now.power.minChargeWh, 2)} ${tx('unit.Wh')}`);
    row(tx('res.shortfall'), ref.powered ? tx('res.none') : tx('res.short'), now.powered ? tx('res.none') : tx('res.short'));
    box.append(table);
    return box;
  }

  private handoffBlock(): HTMLElement {
    const box = el('div', 'st-go');
    box.append(el('h3', '', tx('go.title')));
    const f = this.figuresNow();
    // what the app would send, by its own satellite model: read from the app, not from this section's figures
    const sat = this.env.handoff.preview(this.recordNow());
    const dl = el('dl', 'st-facts');
    const row = (k: string, v: string, key: string) => { const dd = el('dd', '', v); dd.dataset.send = key; dl.append(el('dt', '', k), dd); };
    row(tx('go.name'), sat.name, 'name');
    row(tx('go.massSent'), `${num(sat.massKg, 3)} ${tx('unit.kg')}`, 'mass');
    row(tx('go.size'), `${num(sat.size.width * 1000, 0)} × ${num(sat.size.height * 1000, 0)} × ${num(sat.size.depth * 1000, 1)} mm`, 'size');
    row(tx('go.drag'), `${num(sat.dragArea, 4)} ${tx('unit.m2')} / ${num(sat.cd, 1)} / ${num(sat.cr, 1)}`, 'drag');
    row(tx('go.orbitSent'), tx('go.orbitValue', { inc: num(sat.inclination, 2) }), 'orbit');
    box.append(el('h4', '', tx('go.preview')), dl, el('p', 'st-small', tx('go.notSent')));
    if (Math.abs(sat.massKg - f.massKg) > 5e-4) box.append(el('p', 'st-msg st-msg-no', tx('go.previewOff', { mass: num(sat.massKg, 3) })));
    box.append(el('p', 'st-small', tx('go.orbitDoes')), el('p', 'st-small', tx('go.launchDoes')), el('p', 'st-small st-hypo', tx('go.hypothetical')), el('p', 'st-small', tx('go.separate')),
      el('p', 'st-small', tx('go.replaces')));
    const actions = el('div', 'st-actions');
    actions.append(
      this.button(tx('go.orbit'), 'go:orbit', () => this.send('orbit'), { cls: 'st-primary' }),
      this.button(tx('go.launch'), 'go:launch', () => this.send('launch')),
    );
    box.append(actions);
    if (this.sendNote) {
      box.append(el('p', `st-msg st-msg-${this.sendNote.kind}`, this.sendNoteText()));
    }
    // Launch's earlier mission, which a send replaced: one press puts it back, while Launch still holds what was sent
    if (this.canPutBack()) box.append(this.button(tx('go.undoLaunch'), 'go:undoLaunch', () => this.restoreLaunch()));
    if (this.sent) {
      const s = this.sent;
      const p = el('p', 'st-small st-sent', tx('go.sent', { name: s.sent.name, mass: num(s.sent.massKg, 3), where: tx(`go.where.${s.where}`) }));
      p.dataset.sent = s.key;
      box.append(p);
      if (!s.receipt) box.append(el('p', 'st-small', tx('go.noReadBack', { where: tx(`go.where.${s.where}`) })));
      if (s.receipt && s.check) {
        // what the destination holds, read back from it
        const r = s.receipt, km = (m: number) => num(m / 1000, 1);
        const inc = r.inclination === 'sso' ? tx('go.held.sso') : r.inclination === 'site' ? '?' : `${num(r.inclination, 2)}°`;
        const held = el('p', 'st-small', tx('go.held', { mass: num(r.mass, 3), pe: km(r.perigeeAlt), ap: km(r.apogeeAlt), inc }));
        held.dataset.held = s.where;
        box.append(held);
        const off = [!s.check.mass && tx('go.off.mass'), !s.check.orbit && tx('go.off.orbit'), !s.check.whole && tx('go.off.replaced', { n: r.replaced })].filter(Boolean).join(', ');
        const T = RECEIPT_TOLERANCE;
        // Launch holds a sun-synchronous target, not an inclination in degrees: its check is that both are sun-synchronous
        const tol = { g: num(T.kg * 1000, 1), km: num(T.m / 1000, 0), deg: num(T.deg, 2) };
        const verdict = el('p', `st-msg ${s.check.ok ? 'st-msg-ok' : 'st-msg-no'}`, s.check.ok
          ? tx(typeof r.inclination === 'number' ? 'go.received' : 'go.received.sso', tol)
          : tx('go.receivedOff', { what: off }));
        verdict.dataset.check = s.check.ok ? 'ok' : 'off';
        box.append(verdict);
        // Orbit's planner may keep a spacecraft the learner chose there: its analyses then use that one's mass
        if (r.analysisMass !== undefined && Math.abs(r.analysisMass - r.mass) >= T.kg) {
          box.append(el('p', 'st-small', tx('go.otherCraft', { mass: num(r.analysisMass, 0) })));
        }
      }
      if (s.key !== designKey(this.design)) box.append(el('p', 'st-msg st-msg-no', tx('go.changed')));
    }
    return box;
  }
}
