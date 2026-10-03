import { rememberNumericText, rememberedNumericText } from '../../workspace/numeric-drafts';
import { workspaceStorage, registerWorkspaceFlush } from '../../workspace/storage';
/**
 * The Build section's Explore level (roadmap D02 "remix a real rocket", D03
 * "build from parts"; docs/ROADMAP-PART2-3.md).
 *
 * Two modes that share one screen: the rocket drawn to scale (stack-svg.ts),
 * its figures live — ideal Δv phase by phase and in all, T/W at each ignition,
 * structural ratio and propellant fraction, liftoff mass (stage-table.ts over
 * budget.ts) — and what is wrong with it in plain words, "will not fly" apart
 * from "warning" (warnings.ts through warning-text.ts). In "Remix a real
 * rocket" the student starts from a catalogue vehicle (or a design saved
 * earlier) and stretches its stages, swaps and re-counts engines, takes
 * strap-ons off or adds some, and changes the fairing; in "Build from parts"
 * they stack catalogue bodies or bodies of their own, each with an engine and
 * a count, add strap-ons and a fairing, and pick the launch site. What the
 * builder refuses is said in words, with the part it is about. What is an
 * estimate is listed. Designs are saved in the browser, exported and imported
 * (explore-store.ts). The payload ratings of a design are computed by flying
 * it, off the main thread (ratings-job.ts), and are "unknown" until then,
 * never 0. "Fly it" hands the vehicle to the Launch section as a mission
 * document, point-mass unless the student asks for the experimental six-DOF
 * (src/design/build-handoff.ts).
 *
 * The thin DOM part: the state and everything that decides the vehicle is
 * src/design/explore-model.ts, tested without a page. This file draws that
 * state and turns the student's input into edits of it. Controls are rebuilt
 * only when their shape changes (another base, a stage added, another
 * engine's options); a slider or a number moves only the drawing, the figures
 * and the checks, so a drag is never interrupted, and the keyboard stays on
 * the control it was on when anything is redrawn.
 */
import { getLang, t } from '../../i18n';
import type { StageSpec, VehicleSpec } from '../../types';
import { VEHICLES, vehicleById } from '../../data/vehicles';
import { BOOSTER_BODIES, FAIRING_PARTS, STAGE_BODIES, enginePart, enginePartOf, lockedEngineCount, stageBody, type EnginePart } from '../../data/parts';
import { SITES, siteById } from '../../data/sites';
import { MAX_BOOSTER_GROUPS, MAX_BOOSTERS_PER_GROUP, MAX_STAGES, PART_LIMITS } from '../../config/vehicle-spec';
import type { MissionDocument } from '../../config/mission-file';
import type { PropellantFamily } from '../../physics/rigid/vehicle-data';
import { linearScale } from '../../orbit/playground-model';
import { isDesignOf, type DesignRecord } from '../../design/design-store';
import type { DrawnPart } from '../../design/exploded';
import { stageTable, throttledCore } from '../../design/stage-table';
import { pickerEntries } from '../../design/vehicle-picker';
import { fairingOf } from '../../design/vehicle-parts';
import { refusalText, type DesignText } from '../../design/warning-text';
import { handoffDocument } from '../../design/build-handoff';
import { decimalMark, parseTyped, stepTyped, typedText } from '../../design/number-entry';
import type { RatingClass } from '../../design/ratings';
import {
  DEFAULT_GROUP, EXPLORE_MODES, STRETCH_RANGE, activeDraft, asOwnBody, designChecks, designResult, draftFromSpec, estimateTexts, fitEngine,
  keptDraftsText, newDesignId, newStage, partOrigins, partsDraft, partsEngineOptions, ratingsSignature, remixBase, remixDraft, remixEngineOptions,
  restoreKeptDrafts,
  type DesignResult, type Draft, type EngineOptions, type ExploreMode, type ExploreState, type PartsEdit, type PartsStage, type RemixEdit,
} from '../../design/explore-model';
import { localized, siteName, stageName } from '../names';
import { Field, button, el, num } from '../orbit/dom';
import { StackSvg, type StackLabel } from './stack-svg';
import { VehiclePicker } from './vehicle-picker';
import { figuresView, mass } from './figures';
import { designTextList } from './design-text';
import { ExploreStore } from './explore-store';
import { runRatingsJob } from './ratings-job';
import './explore.css';

export interface ExploreHost {
  /** the Launch section's launch time, which a design handed to it keeps */
  launchTime(): Date;
  /** hand a mission document to the Launch section and go there; false when it could not take it */
  fly(doc: MissionDocument): boolean;
  /** D06: a satellite design imported here (a file of the other kind): open it in the satellite designer, whose store says `message` */
  openSatellite?(record: DesignRecord<'satellite'>, message: string): void;
}

type Built = Extract<DesignResult, { ok: true }>;
type View = 'assembled' | 'exploded';

const MODE_KEY: Record<ExploreMode, string> = { remix: 'build.ex.mode.remix', parts: 'build.ex.mode.parts' };
const FAMILIES: readonly PropellantFamily[] = ['kerolox', 'hydrolox', 'methalox', 'hypergolic', 'solid'];
const FAMILY_KEY: Record<PropellantFamily, string> = {
  kerolox: 'build.family.kerolox', hydrolox: 'build.family.hydrolox', methalox: 'build.family.methalox',
  hypergolic: 'build.family.hypergolic', solid: 'build.family.solid',
};
const LOCK_KEY: Record<string, string> = {
  solid: 'build.ex.locked.solid', lumped: 'build.ex.locked.lumped', cluster: 'build.ex.locked.cluster', notCatalogue: 'build.ex.locked.notCatalogue',
};

const narrow = (): boolean => typeof matchMedia === 'function' && matchMedia('(max-width: 860px)').matches;
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/**
 * Where this browser keeps the drafts on screen between visits
 * (explore-model.ts `keptDraftsText`): a convenience of this browser only —
 * a design is kept for good by Save — so a storage that throws or is empty
 * only means the page starts on its first designs.
 */
const DRAFTS_KEY = 'orbitlab.build.explore.v1';
/** how long after the last change the drafts are written, ms (a slider drag writes once) */
const KEEP_MS = 400;
/** "9 × Merlin 1D", or the name alone for one engine. */
const engineLine = (e: { count: number; name: string }): string => (e.count > 1 ? `${e.count} × ${e.name}` : e.name);

/** A labelled control: the label above, the control under it. */
export function field(labelText: string, control: HTMLElement, cls = 'bx-field'): HTMLLabelElement {
  const label = el('label', cls);
  label.append(el('span', 'bx-field-name', labelText), control);
  return label;
}

export function select(key: string, options: { value: string; label: string; group?: string }[], value: string, onChange: (v: string) => void): HTMLSelectElement {
  const s = el('select');
  s.dataset.k = key;
  const groups = new Map<string, HTMLOptGroupElement>();
  for (const o of options) {
    const opt = el('option', undefined, o.label);
    opt.value = o.value;
    if (o.group) {
      let g = groups.get(o.group);
      if (!g) { g = el('optgroup'); g.label = o.group; groups.set(o.group, g); s.append(g); }
      g.append(opt);
    } else s.append(opt);
  }
  s.value = value;
  s.addEventListener('change', () => onChange(s.value));
  return s;
}

/**
 * A number box in the units shown, SI in the model. A text box with a
 * decimal keyboard, not `type="number"`: Chromium's number box drops a
 * Russian decimal comma (0,08 became 008), so the box is read and written the
 * reader's way (src/design/number-entry.ts), and the arrow keys step it as a
 * number box's would. `digits` fixes how many decimals a value is shown with.
 */
export function numberBox(key: string, value: number,
  o: { min: number; max: number; step: number; show?: (v: number) => number; read?: (n: number) => number; digits?: number; rawScope?: string },
  onChange: (v: number) => void): HTMLInputElement {
  const show = o.show ?? ((v: number) => v), read = o.read ?? ((n: number) => n);
  // the language when the box is read or written: a box kept across a language switch follows it
  const text = (shown: number): string => (o.digits === undefined || !Number.isFinite(shown)
    ? typedText(shown, getLang()) : shown.toFixed(o.digits).replace('.', decimalMark(getLang())));
  const box = el('input', 'bx-num');
  box.type = 'text';
  box.inputMode = 'decimal';
  box.autocomplete = 'off';
  box.spellcheck = false;
  box.dataset.k = key;
  box.value = rememberedNumericText(o.rawScope, key, value) ?? (Number.isFinite(value) ? text(show(value)) : '');
  // an empty or half-typed box is NaN, which the model refuses by name
  const typed = (): void => {
    const n = parseTyped(box.value, getLang());
    box.setAttribute('aria-invalid', String(box.value.trim() !== '' && !Number.isFinite(n)));
    const next = Number.isFinite(n) ? read(n) : Number.NaN;
    rememberNumericText(o.rawScope, key, box.value, next);
    onChange(next);
  };
  box.addEventListener('input', typed);
  box.addEventListener('keydown', (e) => {
    if ((e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    box.value = text(stepTyped(parseTyped(box.value, getLang()), e.key === 'ArrowUp' ? 1 : -1, o));
    typed();
  });
  return box;
}

export class ExploreLevel {
  readonly root = el('div', 'bx-grid');
  private state: ExploreState;
  private result!: DesignResult;
  /** the last vehicle built, drawn and figured while the design on screen is refused */
  private shown!: Built;
  private visible = false;
  private view: View = 'assembled';
  private sixDof = false;
  /** a ratings search running: for which draft and which vehicle (its signature), and how far it has got */
  private ratingsJob: { controller: AbortController; draft: object; signature: string; rating: RatingClass | null; flights: number } | null = null;
  private ratingsMessage: { level: 'ok' | 'error'; text: string } | null = null;
  private flyMessage: string | null = null;
  /** the default names given in the language they were given in, so a language switch can give them again */
  private defaultNames: Record<ExploreMode, string>;
  private selected: string | null = null;
  /** what the checks say about the design on screen (the hold-down replay is not free: once per change) */
  private said: DesignText[] = [];
  private refreshQueued = 0;
  private drawQueued = 0;
  private keepQueued: ReturnType<typeof setTimeout> | null = null;
  private draftDirty = false;

  private readonly head = el('header', 'bs-panel bx-head');
  private readonly stagePanel = el('div', 'bs-stage bx-stage');
  private readonly tabs = el('div', 'bs-tabs');
  private readonly draw = el('div', 'bs-draw');
  private readonly summary = el('dl', 'bx-summary');
  private readonly controls = el('section', 'bs-panel bx-controls');
  private readonly checks = el('section', 'bs-panel bx-checks');
  private readonly ratingsBox = el('div', 'bx-ratings');
  private readonly flyBox = el('div', 'bx-fly');
  private readonly checksBody = el('div');
  private readonly figures = el('section', 'bs-panel bs-figures bx-figures');
  private readonly stack: StackSvg;
  private readonly picker: VehiclePicker;
  private readonly store: ExploreStore;
  private readonly ro: ResizeObserver | null;

  constructor(private readonly host: ExploreHost) {
    const remixName = t('build.ex.remixName', { name: vehicleById('falcon9').name });
    const partsName = t('build.ex.partsName');
    this.defaultNames = { remix: remixName, parts: partsName };
    this.state = {
      mode: 'remix',
      remix: remixDraft('falcon9', newDesignId(remixName), remixName),
      parts: partsDraft(newDesignId(partsName), partsName),
    };
    // the drafts this browser kept from the last visit, where the student left them (not saved designs: those are Save's)
    let kept: string | null = null;
    try { kept = workspaceStorage().getItem(DRAFTS_KEY); } catch { /* storage blocked: start on the first designs */ }
    const restored = restoreKeptDrafts(kept);
    if (restored) {
      this.state = restored.state;
      this.defaultNames = restored.defaults;
    }
    // written once the page is being left too, so a change made just before a reload is kept
    addEventListener('pagehide', () => this.keepDrafts());
    registerWorkspaceFlush(() => this.keepDrafts(true));
    this.stack = new StackSvg((ref) => this.pickPart(ref));
    this.picker = new VehiclePicker(pickerEntries(VEHICLES), (id) => this.pickBase(id), 'bx-picker-select');
    this.store = new ExploreStore({
      current: () => (this.result.ok ? { spec: this.result.spec, name: activeDraft(this.state).name.trim(), recordId: activeDraft(this.state).recordId } : null),
      saved: (recordId, name) => {
        const d = activeDraft(this.state);
        d.recordId = recordId;
        if (d.name.trim() !== name) { d.name = name; this.rebuild(); }
        this.queueKeep();
      },
      open: (record) => this.openRecord(record),
      forgotten: (recordId) => {
        for (const d of [this.state.remix, this.state.parts]) if (d.recordId === recordId) d.recordId = null;
        this.queueKeep();
      },
      // a satellite file imported here is kept and opened where it belongs (D06), never as a rocket
      other: (record, message) => { if (isDesignOf(record, 'satellite')) this.host.openSatellite?.(record, message); },
    });
    this.tabs.setAttribute('role', 'group');
    this.draw.append(this.stack.root);
    this.stagePanel.append(this.tabs, this.draw, this.summary);
    this.checks.append(this.checksBody, this.ratingsBox, this.flyBox);
    this.checks.setAttribute('aria-labelledby', 'bx-checks-title');
    this.controls.setAttribute('aria-labelledby', 'bx-controls-title');
    this.figures.setAttribute('aria-labelledby', 'bx-figures-title');
    this.root.append(this.head, this.stagePanel, this.controls, this.checks, this.figures, this.store.root);
    this.compute(false);
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.queueDrawing()) : null;
    this.ro?.observe(this.draw);
  }

  /** The id of the level's title, for the section's accessible name. */
  readonly titleId = 'bx-title';

  /** On screen, in the interface language: everything drawn again, the saved designs read again. */
  show(): void {
    this.visible = true;
    this.syncNames();
    this.picker.render();
    this.rebuild();
    void this.store.refresh();
  }

  hide(): void {
    this.visible = false;
  }

  /**
   * The design on screen as the vehicle it flies, its name and payload, for
   * the Engineer level's test facilities (D04); null while it is refused.
   */
  design(): { spec: VehicleSpec; name: string; payloadKg: number } | null {
    if (!this.result.ok) return null;
    const d = activeDraft(this.state);
    return { spec: this.result.spec, name: d.name.trim() || this.result.spec.name, payloadKg: Number.isFinite(d.payloadKg) && d.payloadKg >= 0 ? d.payloadKg : 0 };
  }

  /**
   * Payload ratings the Engineer level's readiness review computed for the
   * design on screen (D04): kept as if computed here, with the signature of
   * the vehicle they were computed for, so any later change leaves them
   * behind. Ignored when the design has changed since.
   */
  adoptRatings(spec: VehicleSpec): void {
    if (!this.result.ok || ratingsSignature(this.result.spec) !== ratingsSignature(spec)) return;
    activeDraft(this.state).ratings = { signature: ratingsSignature(spec), payloadLEO: spec.payloadLEO, payloadGTO: spec.payloadGTO };
    this.compute();
    if (this.visible) this.refresh();
  }

  /** A default name the student has not changed follows the interface language. */
  private syncNames(): void {
    const remixName = t('build.ex.remixName', { name: remixBase(this.state.remix.edit.base).name });
    if (this.state.remix.name === this.defaultNames.remix) this.state.remix.name = remixName;
    this.defaultNames.remix = remixName;
    const partsName = t('build.ex.partsName');
    if (this.state.parts.name === this.defaultNames.parts) this.state.parts.name = partsName;
    this.defaultNames.parts = partsName;
  }

  /** Keep the drafts in this browser a moment after the last change. */
  private queueKeep(): void {
    this.draftDirty = true;
    if (this.keepQueued !== null) clearTimeout(this.keepQueued);
    this.keepQueued = setTimeout(() => this.keepDrafts(), KEEP_MS);
  }

  private keepDrafts(strict = false): void {
    if (!this.draftDirty) return;
    if (this.keepQueued !== null) clearTimeout(this.keepQueued);
    this.keepQueued = null;
    try { workspaceStorage().setItem(DRAFTS_KEY, keptDraftsText({ state: this.state, defaults: this.defaultNames })); this.draftDirty = false; } catch (error) { if (strict) throw error; /* timer/pagehide saves remain best effort; transitions must keep this workspace open on failure */ }
  }

  // ─── the model ────────────────────────────────────────────────────────────

  private compute(keep = true): void {
    if (keep) this.queueKeep();
    this.result = designResult(this.state);
    const payload = activeDraft(this.state).payloadKg;
    this.said = this.result.ok ? designChecks(this.result.spec, payload) : [];
    // a search for a vehicle no longer on screen is stopped: its ratings would describe nothing shown
    const job = this.ratingsJob;
    if (job && (!this.result.ok || this.result.signature !== job.signature || activeDraft(this.state) !== job.draft)) job.controller.abort();
    if (this.result.ok) this.shown = this.result;
    else if (!this.shown) {
      // nothing built yet in this mode: show the mode's first design
      const fallback = this.state.mode === 'remix' ? remixDraft('falcon9', 'x', 'x') : partsDraft('x', 'x');
      this.shown = designResult({ ...this.state, [this.state.mode]: fallback }) as Built;
    }
  }

  /** The draft on screen changed its values: new figures, drawing and checks, once a frame. */
  private changed(): void {
    this.queueKeep();
    this.flyMessage = null;
    // what the last ratings run said was about the design before this change
    if (!this.ratingsJob) this.ratingsMessage = null;
    if (this.refreshQueued) return;
    this.refreshQueued = requestAnimationFrame(() => {
      this.refreshQueued = 0;
      this.compute();
      this.refresh();
    });
  }

  /** The draft on screen changed its shape: new controls too. */
  private reshaped(): void {
    this.flyMessage = null;
    if (!this.ratingsJob) this.ratingsMessage = null;
    this.compute();
    this.rebuild();
  }

  private setMode(mode: ExploreMode): void {
    if (mode === this.state.mode) return;
    this.state.mode = mode;
    this.selected = null;
    this.shown = undefined as unknown as Built;
    this.reshaped();
    this.store.render();
  }

  /** A new remix of catalogue vehicle `id` (the picker; a design base is the one already on screen). */
  private pickBase(id: string): void {
    const d = this.state.remix;
    if (d.edit.base.kind === 'catalogue' ? d.edit.base.id === id : d.edit.base.spec.id === id) return;
    if (!VEHICLES.some((v) => v.id === id)) return;
    const name = t('build.ex.remixName', { name: vehicleById(id).name });
    this.defaultNames.remix = name;
    this.state.remix = remixDraft(id, newDesignId(name), name);
    this.selected = null;
    this.reshaped();
    this.store.render();
  }

  /** Start the mode's design again from its beginning. */
  private startOver(): void {
    if (this.state.mode === 'remix') {
      const base = remixBase(this.state.remix.edit.base);
      const id = VEHICLES.some((v) => v.id === base.id) ? base.id : base.derivedFrom ?? 'falcon9';
      const name = t('build.ex.remixName', { name: vehicleById(id).name });
      this.defaultNames.remix = name;
      this.state.remix = remixDraft(id, newDesignId(name), name);
    } else {
      const name = t('build.ex.partsName');
      this.defaultNames.parts = name;
      this.state.parts = partsDraft(newDesignId(name), name);
    }
    this.selected = null;
    this.reshaped();
    this.store.render();
  }

  /**
   * A launcher sized on the Engineer level (D05), opened here to be changed,
   * saved and flown: in the parts builder when a parts design rebuilds it
   * exactly (a sized launcher is one, bodies of its own), with the payload it
   * was sized for. Not yet saved.
   */
  openDesign(spec: VehicleSpec, payloadKg: number): void {
    const opened = draftFromSpec(spec, null);
    opened.draft.payloadKg = payloadKg;
    if (opened.mode === 'remix') this.state.remix = opened.draft;
    else this.state.parts = opened.draft;
    this.state.mode = opened.mode;
    this.selected = null;
    this.shown = undefined as unknown as Built;
    this.compute();
    if (this.visible) this.reshaped();
    this.store.render();
  }

  /** A kept or imported rocket design, opened here (a rocket file imported in the satellite designer, D06), and what the store says of it. */
  openSaved(record: DesignRecord<'vehicle'>, message?: string): void {
    this.openRecord(record);
    if (message) this.store.announce('warn', message);
  }

  private openRecord(record: DesignRecord<'vehicle'>): void {
    const opened = draftFromSpec(record.design, record.id);
    if (opened.mode === 'remix') this.state.remix = opened.draft;
    else this.state.parts = opened.draft;
    this.state.mode = opened.mode;
    this.selected = null;
    this.shown = undefined as unknown as Built;
    this.reshaped();
    this.store.render();
    this.root.closest('.build-screen')?.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  private pickPart(ref: string): void {
    this.selected = ref;
    this.renderDrawing();
    const kind = ref.split(':')[0];
    const target = kind === 'stage' ? `[data-ref="${ref}"]` : kind === 'booster' ? '[data-ref="strapons"]' : kind === 'fairing' ? '[data-ref="fairing"]' : null;
    const card = target ? this.controls.querySelector<HTMLElement>(target) : null;
    if (!card) return;
    card.scrollIntoView({ block: narrow() ? 'start' : 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    card.classList.remove('flash');
    void card.offsetWidth;
    card.classList.add('flash');
  }

  // ─── drawing the page ─────────────────────────────────────────────────────

  /** Run a redraw and put the keyboard back on the control it was on. */
  private keepFocus(redraw: () => void): void {
    const active = document.activeElement as HTMLElement | null;
    const key = active && this.root.contains(active) ? active.dataset.k ?? null : null;
    redraw();
    if (key && !this.root.contains(document.activeElement)) this.root.querySelector<HTMLElement>(`[data-k="${CSS.escape(key)}"]`)?.focus();
  }

  private rebuild(): void {
    if (!this.visible) return;
    this.keepFocus(() => {
      this.renderHead();
      this.renderTabs();
      this.renderControls();
      this.refresh();
    });
  }

  private refresh(): void {
    if (!this.visible) return;
    this.keepFocus(() => {
      this.renderDrawing();
      this.renderSummary();
      this.renderChecks();
      this.renderRatings();
      this.renderFly();
      this.renderFigures();
      this.store.render();
    });
  }

  private renderHead(): void {
    const d = activeDraft(this.state);
    const eyebrow = el('span', 'eyebrow bs-eyebrow', `${t('section.build')} · ${t('mode.explore')}`);
    const title = el('h1', 'bs-title', t('build.ex.title'));
    title.id = this.titleId;
    const text = el('div', 'bx-head-text');
    text.append(eyebrow, title, el('p', 'bs-lead', t('build.ex.lead')));

    const modes = el('div', 'bx-modes');
    modes.setAttribute('role', 'group');
    modes.setAttribute('aria-label', t('build.ex.mode'));
    for (const m of EXPLORE_MODES) {
      const b = button('bx-mode', t(MODE_KEY[m]), () => this.setMode(m));
      b.dataset.k = `mode:${m}`;
      b.setAttribute('aria-pressed', String(m === this.state.mode));
      modes.append(b);
    }

    const name = el('input', 'bx-text');
    name.type = 'text';
    name.maxLength = 80;
    name.value = d.name;
    name.dataset.k = 'name';
    name.addEventListener('input', () => { activeDraft(this.state).name = name.value; this.changed(); });
    const payload = numberBox('payload', d.payloadKg, { min: 1, max: 500000, step: 1, rawScope: `rocket:${d.id}` }, (v) => { activeDraft(this.state).payloadKg = v; this.changed(); });
    const unit = el('span', 'bx-unit', t('u.kg'));
    const payloadRow = el('span', 'bx-with-unit');
    payloadRow.append(payload, unit);
    const again = button('watch-btn', t('build.ex.new'), () => this.startOver());
    again.dataset.k = 'new';
    const row = el('div', 'bx-head-row');
    row.append(field(t('build.ex.name'), name, 'bx-field bx-name'), field(t('build.ex.payload'), payloadRow, 'bx-field bx-payload'), again);
    this.head.replaceChildren(text, modes, row);
  }

  private renderTabs(): void {
    this.tabs.setAttribute('aria-label', t('build.views'));
    // in the Watch level's order (build-screen.ts VIEWS), so the same switch sits in the same place on every level
    this.tabs.replaceChildren(...(['exploded', 'assembled'] as const).map((v) => {
      const b = button('bs-tab', t(v === 'exploded' ? 'build.view.exploded' : 'build.view.assembled'), () => {
        this.view = v;
        this.renderTabs();
        this.renderDrawing();
      });
      b.dataset.k = `view:${v}`;
      b.setAttribute('aria-pressed', String(v === this.view));
      return b;
    }));
  }

  private queueDrawing(): void {
    if (this.drawQueued || !this.visible) return;
    this.drawQueued = requestAnimationFrame(() => { this.drawQueued = 0; this.renderDrawing(); });
  }

  private label(spec: VehicleSpec, p: DrawnPart): StackLabel {
    const st = spec.stages[p.stageIndex];
    if (p.kind === 'stage') {
      const role = t('build.label.stage', { n: p.stageIndex + 1 });
      return { lines: [role, engineLine(st.engine)], name: `${role}: ${stageName(spec, st.id, st.name)}` };
    }
    if (p.kind === 'booster') {
      const g = st.boosters![p.group];
      const role = t('build.label.boosters', { n: g.count });
      return { lines: [role, engineLine(g.engine)], name: `${role}: ${stageName(spec, g.id, g.name)}` };
    }
    const role = t(p.kind === 'fairing' ? 'build.label.fairing' : 'build.label.interstage');
    return { lines: [role], name: role };
  }

  private renderDrawing(): void {
    if (!this.visible) return;
    const w = this.draw.clientWidth, h = this.draw.clientHeight;
    if (w < 10 || h < 10) return;
    const spec = this.shown.spec;
    this.draw.classList.toggle('stale', !this.result.ok);
    this.stack.render({
      spec, explode: this.view === 'exploded' ? 1 : 0, selected: this.selected, highlight: null,
      label: (p) => this.label(spec, p), title: t('build.drawing.title', { name: spec.name }),
    }, w, h);
  }

  private renderSummary(): void {
    const d = activeDraft(this.state);
    const spec = this.shown.spec;
    const payload = Number.isFinite(d.payloadKg) && d.payloadKg >= 0 ? d.payloadKg : 0;
    const table = stageTable(spec, payload);
    const rows: [string, string][] = [
      [t('build.fig.dv'), `${num(table.totalDv)} ${t('u.ms')}`],
      [t('build.stat.liftoffTW'), num(table.liftoffTW, 2)],
      [t('build.fig.liftoffMass'), mass(table.liftoffMass)],
      [t('build.stat.height'), `${num(spec.height, 1)} ${t('u.m')}`],
    ];
    this.summary.replaceChildren(...rows.map(([k, v], i) => {
      const box = el('div', 'bx-sum');
      const dt = el('dt', undefined, k);
      // ideal and worked out from rounded catalogue figures: said here as the figures table says it
      if (i === 0) dt.append(' ', el('em', 'bs-est', t('build.stat.estimate')));
      box.append(dt, el('dd', undefined, v));
      return box;
    }));
  }

  private renderChecks(): void {
    const title = el('h2', 'bx-h2', t('build.ex.checks'));
    title.id = 'bx-checks-title';
    const parts: HTMLElement[] = [title];
    if (!this.result.ok) {
      parts.push(designTextList([refusalText(this.result.refusal)]), el('p', 'bx-note', t('build.ex.refusedKept')));
    } else {
      parts.push(this.said.length ? designTextList(this.said) : el('p', 'bx-clear', t('build.ex.checks.clear')));
      const site = siteById(this.result.spec.sites[0]);
      const est = estimateTexts(this.result, site.country);
      if (est.length) {
        parts.push(el('h3', 'bx-h3', t('build.ex.estimates')), designTextList(est));
      }
    }
    this.checksBody.replaceChildren(...parts);
  }

  private renderRatings(): void {
    const box = this.ratingsBox;
    const head = el('h3', 'bx-h3', t('build.ex.ratings'));
    const r = this.result.ok ? this.result : null;
    const dl = el('dl', 'pg-dl bx-ratings-dl');
    const value = (kg: number): HTMLElement => {
      const dd = el('dd');
      if (!r || r.ratings === 'none' || r.ratings === 'base') { dd.append(el('span', 'bx-unknown', t('build.ex.ratings.unknown'))); return dd; }
      if (r.ratings === 'published') {
        dd.append(kg > 0 ? mass(kg) : t('build.ex.ratings.noRating'));
        return dd;
      }
      dd.append(kg > 0 ? `≈ ${mass(kg)}` : t('build.ex.ratings.nothing'), ' ', el('em', 'bs-est', t('build.stat.estimate')));
      return dd;
    };
    dl.append(el('dt', undefined, t('build.ex.ratings.leo')), value(r?.spec.payloadLEO ?? 0),
      el('dt', undefined, t('build.ex.ratings.gto')), value(r?.spec.payloadGTO ?? 0));
    const parts: HTMLElement[] = [head, dl];
    if (r) {
      const note = r.ratings === 'computed' ? t('build.ex.ratings.computedNote')
        : r.ratings === 'published' ? t('build.ex.ratings.publishedNote')
          : r.ratings === 'base' ? t('build.ex.ratings.baseNote', { name: r.ratingsOwner })
            : t('build.ex.ratings.unknownNote');
      parts.push(el('p', 'bx-note', note));
    }
    const job = this.ratingsJob;
    if (job) {
      const line = el('div', 'bx-progress');
      line.setAttribute('role', 'status');
      const bar = el('progress');
      bar.setAttribute('aria-label', t('build.ex.ratings'));
      const orbit = job.rating === 'GTO' ? t('build.ex.ratings.gto') : t('build.ex.ratings.leo');
      line.append(bar, el('span', undefined, t('build.ex.ratings.computing', { orbit, n: job.flights })));
      const stop = button('watch-btn', t('build.ex.ratings.stop'), () => job.controller.abort());
      stop.dataset.k = 'ratings-stop';
      line.append(stop);
      parts.push(line);
    } else if (r && (r.ratings === 'none' || r.ratings === 'base')) {
      const go = button('watch-btn', t('build.ex.ratings.compute'), () => this.computeRatings());
      go.dataset.k = 'ratings-go';
      parts.push(go);
    }
    if (this.ratingsMessage) {
      const p = el('p', `bx-note bx-msg-${this.ratingsMessage.level}`, this.ratingsMessage.text);
      p.setAttribute('role', 'status');
      parts.push(p);
    }
    box.replaceChildren(...parts);
  }

  private computeRatings(): void {
    if (!this.result.ok || this.ratingsJob) return;
    const draft = activeDraft(this.state);
    const spec = structuredClone(this.result.spec);
    const signature = this.result.signature;
    const controller = new AbortController();
    const job = { controller, draft: draft as object, signature, rating: 'LEO' as RatingClass | null, flights: 0 };
    this.ratingsJob = job;
    this.ratingsMessage = null;
    this.renderRatings();
    runRatingsJob(spec, controller.signal, (rating, flights) => {
      job.rating = rating;
      job.flights = flights;
      if (this.ratingsJob === job) this.keepFocus(() => this.renderRatings());
    }).then((res) => {
      draft.ratings = { signature, payloadLEO: res.payloadLEO.kg, payloadGTO: res.payloadGTO.kg };
      this.ratingsMessage = { level: 'ok', text: t('build.ex.ratings.done', { n: res.flights }) };
    }).catch((error: unknown) => {
      const cancelled = error instanceof DOMException && error.name === 'AbortError';
      this.ratingsMessage = { level: cancelled ? 'ok' : 'error', text: t(cancelled ? 'build.ex.ratings.stopped' : 'build.ex.ratings.failed') };
    }).finally(() => {
      if (this.ratingsJob === job) this.ratingsJob = null;
      this.compute();
      this.refresh();
    });
  }

  private renderFly(): void {
    const d = activeDraft(this.state);
    const r = this.result.ok ? this.result : null;
    const title = el('h3', 'bx-h3', t('build.ex.fly.title'));
    const parts: HTMLElement[] = [title];
    const cannot = !r || this.said.some((x) => x.key === 'build.warn.invalid' || x.key === 'build.warn.vacuumEngineOnPad');
    if (r) {
      const site = siteById(r.spec.sites[0]);
      parts.push(el('p', 'bx-note', t('build.ex.fly.lead', { payload: mass(Math.max(1, Number.isFinite(d.payloadKg) ? d.payloadKg : 1)), site: siteName(site) })));
      if (this.said.some((x) => x.key === 'build.warn.noLiftoff')) parts.push(el('p', 'bx-note warn', t('build.ex.fly.noLiftoff')));
    }
    const six = el('input');
    six.type = 'checkbox';
    six.checked = this.sixDof;
    six.dataset.k = 'sixdof';
    six.addEventListener('change', () => { this.sixDof = six.checked; });
    const sixLabel = el('label', 'bx-check');
    sixLabel.append(six, el('span', undefined, t('build.ex.fly.sixDof')));
    parts.push(sixLabel, el('p', 'bx-note small', t('build.ex.fly.sixDofNote')));
    const fly = button('watch-btn primary bx-fly-btn', `${t('build.ex.fly')} ›`, () => this.fly());
    fly.dataset.k = 'fly';
    fly.disabled = cannot;
    parts.push(fly);
    if (cannot) parts.push(el('p', 'bx-note warn', t('build.ex.fly.blocked')));
    if (this.flyMessage) {
      const p = el('p', 'bx-note bx-msg-error', this.flyMessage);
      p.setAttribute('role', 'status');
      parts.push(p);
    }
    this.flyBox.replaceChildren(...parts);
  }

  private fly(): void {
    if (!this.result.ok) return;
    const d = activeDraft(this.state);
    const doc = handoffDocument(this.result.spec, Number.isFinite(d.payloadKg) ? d.payloadKg : 1, this.host.launchTime(), this.sixDof ? 'sixDof' : 'pointMass');
    if (!this.host.fly(doc)) {
      this.flyMessage = t('build.ex.fly.failed');
      this.renderFly();
    }
  }

  private renderFigures(): void {
    const d = activeDraft(this.state);
    const spec = this.shown.spec;
    const payload = Number.isFinite(d.payloadKg) && d.payloadKg >= 0 ? d.payloadKg : 0;
    const table = stageTable(spec, payload);
    const title = el('h2', 'bs-fig-title', t('build.fig.title'));
    title.id = 'bx-figures-title';
    this.figures.replaceChildren(
      title,
      el('p', 'bs-fig-note', t('build.ex.figNote', { payload: mass(payload) })),
      figuresView(spec, table),
      el('p', 'bs-fig-note small', spec.fairing && spec.stages.length > 1 ? `${t('build.fig.twNote')} ${t('build.fig.twNoteFairing')}` : t('build.fig.twNote')),
    );
    for (const row of table.rows) {
      const share = throttledCore(spec, row);
      if (share !== null) this.figures.append(el('p', 'bs-fig-note small', t('build.fig.throttledCore', { n: row.stageIndex + 1, p: num(share * 100) })));
    }
  }

  // ─── the controls ─────────────────────────────────────────────────────────

  private renderControls(): void {
    const title = el('h2', 'bx-h2', t(this.state.mode === 'remix' ? 'build.ex.remix.title' : 'build.ex.parts.title'));
    title.id = 'bx-controls-title';
    const body = this.state.mode === 'remix' ? this.remixControls(this.state.remix) : this.partsControls(this.state.parts);
    this.controls.replaceChildren(title, ...body);
  }

  /** The engine and its count, with why either cannot change. */
  private engineRow(key: string, o: EngineOptions, part: string, count: number, onPart: (p: EnginePart) => void, onCount: (n: number) => void): HTMLElement[] {
    const out: HTMLElement[] = [];
    if (o.options.length) {
      const opts = o.options.map((p) => ({
        value: p.id,
        label: `${p.name} · ${num(p.thrustVac / 1000)} ${t('u.kN')}${p.vacuumOnly ? ` · ${t('build.ex.engine.vacuum')}` : ''}${p.historical ? ` · ${t('build.ex.engine.historical')}` : ''}`,
      }));
      const s = select(`${key}:engine`, opts, part, (v) => onPart(enginePart(v)));
      s.disabled = o.swapLocked !== null || o.options.length < 2;
      out.push(field(t('build.ex.engine'), s));
    }
    const stepper = el('div', 'bx-stepper');
    const box = numberBox(`${key}:count`, count, { min: 1, max: PART_LIMITS.engineCount, step: 1, rawScope: `rocket:${activeDraft(this.state).id}` }, (n) => onCount(n));
    box.setAttribute('aria-label', t('build.ex.count'));
    const minus = button('bs-step', '−', () => { box.value = String(Math.max(1, (Number(box.value) || 1) - 1)); onCount(Number(box.value)); });
    const plus = button('bs-step', '+', () => { box.value = String(Math.min(PART_LIMITS.engineCount, (Number(box.value) || 0) + 1)); onCount(Number(box.value)); });
    minus.setAttribute('aria-label', t('build.ex.countMinus'));
    plus.setAttribute('aria-label', t('build.ex.countPlus'));
    minus.dataset.k = `${key}:minus`;
    plus.dataset.k = `${key}:plus`;
    const locked = o.countLocked !== null || o.swapLocked === 'notCatalogue';
    for (const c of [box, minus, plus]) c.disabled = locked;
    stepper.append(minus, box, plus);
    const countLabel = el('div', 'bx-field');
    countLabel.append(el('span', 'bx-field-name', t('build.ex.count')), stepper);
    out.push(countLabel);
    const why = o.swapLocked ?? o.countLocked;
    if (why) out.push(el('p', 'bx-note', t(LOCK_KEY[why])));
    const left: string[] = [];
    if (o.leftOut.lumped) left.push(t('build.ex.leftOut.lumped'));
    if (o.leftOut.vacuum) left.push(t('build.ex.leftOut.vacuum'));
    if (left.length && o.swapLocked === null) out.push(el('p', 'bx-note small', left.join(' ')));
    return out;
  }

  private remixControls(d: Draft<RemixEdit>): HTMLElement[] {
    const base = remixBase(d.edit.base);
    const extra = d.edit.base.kind === 'design' ? [base] : [];
    this.picker.setEntries(pickerEntries(VEHICLES, extra));
    this.picker.set(base.id);
    const pick = el('div', 'bx-card bx-base');
    pick.append(el('h3', 'bx-h3', t('build.ex.remix.base')), this.picker.root);
    if (d.edit.base.kind === 'design') pick.append(el('p', 'bx-note', t('build.ex.remix.fromDesign')));
    const out: HTMLElement[] = [pick];

    base.stages.forEach((st, i) => {
      const edit = d.edit.stages[i];
      const card = el('section', 'bx-card');
      card.dataset.ref = `stage:${i}`;
      const h = el('h3', 'bx-h3');
      h.append(t('build.label.stage', { n: i + 1 }), ' ', el('small', undefined, stageName(base, st.id, st.name)));
      card.append(h);
      const stretch = new Field(t('build.ex.stretch'), '%', linearScale(STRETCH_RANGE[0], STRETCH_RANGE[1]), (v) => v * 100, (n) => n / 100, 0,
        { min: STRETCH_RANGE[0], max: STRETCH_RANGE[1] }, (v) => { edit.stretch = Math.round(v * 100) / 100; this.changed(); });
      stretch.set(edit.stretch);
      stretch.root.querySelectorAll('input').forEach((input, k) => { input.dataset.k = `stretch:${i}:${k}`; });
      card.append(stretch.root);
      const installed = enginePartOf(st.engine);
      const chosen = edit.engine ?? (installed ? { part: installed.id, count: st.engine.count } : null);
      const o = remixEngineOptions(base, i, chosen?.part ?? null);
      const setEngine = (part: string, count: number): void => {
        if (installed && part === installed.id && count === st.engine.count) delete edit.engine;
        else edit.engine = { part, count };
      };
      card.append(...this.engineRow(`stage:${i}`, o, chosen?.part ?? '', chosen?.count ?? st.engine.count,
        (p) => {
          const locked = lockedEngineCount(p.id);
          setEngine(p.id, locked ?? (chosen?.count ?? st.engine.count));
          this.reshaped();
        },
        (n) => { if (chosen) { setEngine(chosen.part, n); this.changed(); } }));
      out.push(card);
    });

    // strap-ons, on the first stage only
    const straps = el('section', 'bx-card');
    straps.dataset.ref = 'strapons';
    straps.append(el('h3', 'bx-h3', t('build.ex.strapOns')));
    const baseGroups = base.stages[0].boosters ?? [];
    const list = el('ul', 'bx-groups');
    baseGroups.forEach((g, gi) => {
      const off = d.edit.removedGroups.includes(gi);
      const li = el('li', off ? 'off' : undefined);
      const text = el('span', 'bx-group-text');
      text.append(el('strong', undefined, `${g.count} × ${stageName(base, g.id, g.name)}`), el('small', undefined, engineLine(g.engine)));
      if (off) text.append(el('small', 'bx-off', t('build.ex.strapOns.removed')));
      const toggle = button('watch-btn', t(off ? 'build.ex.strapOns.restore' : 'build.ex.strapOns.remove'), () => {
        d.edit.removedGroups = off ? d.edit.removedGroups.filter((x) => x !== gi) : [...d.edit.removedGroups, gi];
        this.reshaped();
      });
      toggle.dataset.k = `group:${gi}:toggle`;
      li.append(text, toggle);
      list.append(li);
    });
    d.edit.addedGroups.forEach((g, gi) => list.append(this.groupRow(`added:${gi}`, g, () => { d.edit.addedGroups.splice(gi, 1); this.reshaped(); })));
    if (!list.children.length) list.append(el('li', 'bx-none', t('build.ex.strapOns.none')));
    straps.append(list);
    const groups = baseGroups.length - d.edit.removedGroups.length + d.edit.addedGroups.length;
    const add = button('watch-btn', `+ ${t('build.ex.strapOns.add')}`, () => { d.edit.addedGroups.push({ ...DEFAULT_GROUP }); this.reshaped(); });
    add.dataset.k = 'group:add';
    add.disabled = groups >= MAX_BOOSTER_GROUPS;
    straps.append(add);
    if (add.disabled) straps.append(el('p', 'bx-note small', t('build.ex.strapOns.max')));
    out.push(straps);

    // the fairing
    const fair = el('section', 'bx-card');
    fair.dataset.ref = 'fairing';
    const was = base.fairing;
    const keepLabel = was ? t('build.ex.fairing.keep', { d: num(was.diameter, 2), l: num(was.length, 1) }) : t('build.ex.fairing.keepNone');
    const s = select('fairing', [{ value: '', label: keepLabel }, ...this.fairingOptions()], d.edit.fairing ?? '', (v) => {
      d.edit.fairing = v === '' ? null : v;
      this.changed();
    });
    fair.append(el('h3', 'bx-h3', t('build.ex.fairing')), field(t('build.ex.fairing.pick'), s));
    if (was && fairingOf(was)) fair.append(el('p', 'bx-note small', t('build.ex.fairing.note')));
    out.push(fair);
    return out;
  }

  private fairingOptions(): { value: string; label: string }[] {
    return FAIRING_PARTS.map((f) => ({
      value: f.id,
      label: t('build.ex.fairing.option', { name: VEHICLES.find((v) => v.id === f.id)?.name ?? f.id, d: num(f.diameter, 2), l: num(f.length, 1) }),
    }));
  }

  /** A strap-on group: its catalogue body, how many, and a button to take it off. */
  private groupRow(key: string, g: { body: string; count: number }, remove: () => void): HTMLLIElement {
    const li = el('li', 'bx-group-edit');
    const origin = partOrigins().boosters;
    const opts = BOOSTER_BODIES.map((b) => {
      const vehicle = vehicleById(origin.get(b.id) ?? VEHICLES[0].id);
      return { value: b.id, label: `${vehicle.name}: ${localized(`stage.${vehicle.id}.${b.stageId}.name`, b.name)} (${engineLine({ count: b.engine.count, name: enginePart(b.engine.part).name })})` };
    });
    const body = select(`${key}:body`, opts, g.body, (v) => { g.body = v; this.changed(); });
    const count = numberBox(`${key}:count`, g.count, { min: 1, max: MAX_BOOSTERS_PER_GROUP, step: 1, rawScope: `rocket:${activeDraft(this.state).id}` }, (n) => { g.count = n; this.changed(); });
    const rm = button('watch-btn', t('build.ex.strapOns.remove'), remove);
    rm.dataset.k = `${key}:remove`;
    li.append(field(t('build.ex.strapOns.body'), body), field(t('build.ex.strapOns.count'), count, 'bx-field bx-count'), rm);
    return li;
  }

  private partsControls(d: Draft<PartsEdit>): HTMLElement[] {
    const e = d.edit;
    const out: HTMLElement[] = [];
    const siteCard = el('div', 'bx-card');
    const site = select('site', SITES.map((s) => ({ value: s.id, label: siteName(s) })), e.sites[0], (v) => {
      e.sites = [v];
      this.changed();
    });
    siteCard.append(field(t('build.ex.site'), site));
    out.push(siteCard);

    const origin = partOrigins().stages;
    const bodyOptions = [
      { value: 'own', label: t('build.ex.body.own') },
      ...STAGE_BODIES.map((b) => {
        const vehicle = vehicleById(origin.get(b.id) ?? VEHICLES[0].id);
        return { value: b.id, label: `${vehicle.name}: ${localized(`stage.${vehicle.id}.${b.stageId}.name`, b.name)}`, group: t('build.ex.body.catalogue') };
      }),
    ];
    e.stages.forEach((st, i) => out.push(this.partsStageCard(d, st, i, bodyOptions)));
    const addStage = button('watch-btn', `+ ${t('build.ex.addStage')}`, () => { e.stages.push(newStage(e.stages.length)); this.reshaped(); });
    addStage.dataset.k = 'stage:add';
    addStage.disabled = e.stages.length >= MAX_STAGES;
    const addRow = el('div', 'bx-actions');
    addRow.append(addStage);
    if (addStage.disabled) addRow.append(el('p', 'bx-note small', t('build.ex.maxStages')));
    out.push(addRow);

    const straps = el('section', 'bx-card');
    straps.dataset.ref = 'strapons';
    straps.append(el('h3', 'bx-h3', t('build.ex.strapOns')));
    const list = el('ul', 'bx-groups');
    e.groups.forEach((g, gi) => list.append(this.groupRow(`group:${gi}`, g, () => { e.groups.splice(gi, 1); this.reshaped(); })));
    if (!e.groups.length) list.append(el('li', 'bx-none', t('build.ex.strapOns.none')));
    const add = button('watch-btn', `+ ${t('build.ex.strapOns.add')}`, () => { e.groups.push({ ...DEFAULT_GROUP }); this.reshaped(); });
    add.dataset.k = 'group:add';
    add.disabled = e.groups.length >= MAX_BOOSTER_GROUPS;
    straps.append(list, add);
    if (add.disabled) straps.append(el('p', 'bx-note small', t('build.ex.strapOns.max')));
    out.push(straps);

    const fair = el('section', 'bx-card');
    fair.dataset.ref = 'fairing';
    const s = select('fairing', [{ value: '', label: t('build.ex.fairing.none') }, ...this.fairingOptions()], e.fairing?.part ?? '', (v) => {
      e.fairing = v === '' ? null : { ...(e.fairing ?? {}), part: v };
      this.changed();
    });
    fair.append(el('h3', 'bx-h3', t('build.ex.fairing')), field(t('build.ex.fairing.pick'), s));
    out.push(fair);
    return out;
  }

  private partsStageCard(d: Draft<PartsEdit>, st: PartsStage, i: number, bodyOptions: { value: string; label: string; group?: string }[]): HTMLElement {
    const e = d.edit;
    const card = el('section', 'bx-card');
    card.dataset.ref = `stage:${i}`;
    const h = el('div', 'bx-card-head');
    h.append(el('h3', 'bx-h3', t('build.label.stage', { n: i + 1 })));
    const rm = button('watch-btn small', t('build.ex.removeStage'), () => {
      e.stages.splice(i, 1);
      e.stages = e.stages.map((s, k) => fitEngine(s, k));
      this.reshaped();
    });
    rm.setAttribute('aria-label', t('build.ex.removeStageN', { n: i + 1 }));
    rm.dataset.k = `stage:${i}:remove`;
    rm.disabled = e.stages.length <= 1;
    h.append(rm);
    card.append(h);

    const body = select(`stage:${i}:body`, bodyOptions, st.body.kind === 'own' ? 'own' : st.body.id, (v) => {
      let next: PartsStage;
      if (v === 'own') {
        // from the figures it flies now, when the design on screen was built
        const flown: StageSpec | undefined = this.result.ok ? this.result.spec.stages[i] : undefined;
        next = flown ? asOwnBody(st, flown) : newStage(i);
      } else {
        const b = stageBody(v);
        next = { body: { kind: 'catalogue', id: v }, engine: { ...b.engine } };
      }
      e.stages[i] = fitEngine(next, i);
      this.reshaped();
    });
    card.append(field(t('build.ex.body'), body));

    if (st.body.kind === 'own') {
      const own = st.body.body;
      const grid = el('div', 'bx-own');
      const num4 = (k: 'dryMass' | 'propellantMass' | 'diameter' | 'length', labelKey: string, unit: string, max: number, step: number): HTMLElement => {
        const box = numberBox(`stage:${i}:${k}`, own[k], { min: 0, max, step, rawScope: `rocket:${activeDraft(this.state).id}` }, (v) => { own[k] = v; this.changed(); });
        const row = el('span', 'bx-with-unit');
        row.append(box, el('span', 'bx-unit', unit));
        return field(t(labelKey), row);
      };
      grid.append(
        num4('dryMass', 'build.ex.own.dryMass', t('u.kg'), PART_LIMITS.stageDryMass, 10),
        num4('propellantMass', 'build.ex.own.propellant', t('u.kg'), PART_LIMITS.stagePropellantMass, 100),
        num4('diameter', 'build.ex.own.diameter', t('u.m'), PART_LIMITS.diameter, 0.01),
        num4('length', 'build.ex.own.length', t('u.m'), PART_LIMITS.length, 0.1),
      );
      const fam = select(`stage:${i}:family`, FAMILIES.map((f) => ({ value: f, label: t(FAMILY_KEY[f]) })), own.family, (v) => {
        own.family = v as PropellantFamily;
        e.stages[i] = fitEngine(st, i);
        this.reshaped();
      });
      grid.append(field(t('build.ex.own.family'), fam, 'bx-field bx-wide'));
      card.append(grid);
      const part = enginePart(st.engine.part);
      if (part.mass.kg !== null && !part.solid) {
        card.append(el('p', 'bx-note small', t('build.ex.own.enginesMass', { mass: mass(part.mass.kg * st.engine.count) })));
      }
    }
    const o = partsEngineOptions(st, i);
    card.append(...this.engineRow(`stage:${i}`, o, st.engine.part, st.engine.count,
      (p) => {
        const locked = lockedEngineCount(p.id);
        st.engine = { part: p.id, count: p.solid ? 1 : locked ?? st.engine.count };
        this.reshaped();
      },
      (n) => { st.engine = { ...st.engine, count: n }; this.changed(); }));
    const family = st.body.kind === 'own' ? st.body.body.family : enginePart(stageBody(st.body.id).engine.part).family;
    if (family !== 'solid') card.append(el('p', 'bx-note small', t('build.ex.leftOut.family', { family: t(FAMILY_KEY[family]).toLowerCase() })));
    return card;
  }
}
