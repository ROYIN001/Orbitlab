/**
 * The Build section's Engineer level, satellite side: the satellite bench
 * (roadmap D06, docs/ROADMAP-PART2-3.md; Phase 4 map §2.7, track B).
 *
 * A bench of its own, not five more tabs on the rocket bench (map §2.7: the
 * rocket bench is `VehicleSpec`-only, and eleven tabs do not fit at 375 px).
 * Six tabs, one per budget — POWER, PROPULSION, ATTITUDE, RADIO, CAMERA and
 * LIFETIME — each with every number of that subsystem beside every figure
 * it gives, its notes, and where each of its numbers comes from. The design
 * on the bench is the one open in the Explore level's satellite designer
 * (the shared `SatelliteWorkspace`): an edit made here is what Explore shows,
 * and designs are saved, opened and sent to Orbit there. Under the tabs,
 * "Fly it" flies the design on a rocket in the Launch section, at the
 * Engineer level (src/ui/build/satellite-fly.ts; the integration of D06),
 * and the head holds the design date the figures and the lifetime run are
 * read on.
 *
 * LIFETIME runs the lifetime analysis (P07) on the design's orbit on its
 * design date, wet mass and drag area through the existing worker job (`runLifetimeJob`), by the
 * mean-element method at a FIXED ECSS level of solar activity (moderate
 * unless the bench is set otherwise), never the measured series, so the
 * answer comes out the same every time (map §2.6 b). It says the area that
 * sets the drag is the one sunlight pressure pushes on too, and that the
 * mean method leaves sunlight pressure out (map risk R8), and whether the
 * satellite is down within 25 years of the end of its mission (IADC).
 *
 * The thin DOM part: every figure is `designFigures`'s
 * (src/design/satellite-model.ts), every number box the one the Explore
 * level uses (src/ui/build/satellite-controls.ts).
 */
import { t, tCount } from '../../i18n';
import { runLifetimeJob } from '../../physics/lifetime-job';
import type { PropagationResult } from '../../physics/propagator/propagate';
import {
  SATELLITE_FIELDS, estimateTexts, fieldByPath, fieldOrigin, problemTexts, satelliteChecks,
  type FieldGroup, type SatText, type SatelliteFigures,
} from '../../design/satellite-model';
import { lifetimeSpacecraft } from '../../design/satellite-area';
import type { SatelliteDesign } from '../../design/satellite-spec';
import { DESIGN_ACTIVITY_LEVELS, type EcssLevel } from '../../orbit/satellite-air';
import { designLifetimeRequest } from '../../design/design-lesson-key';
import { button, el, num } from '../orbit/dom';
import { formatDuration } from '../lifetime';
import { field, select } from './explore-level';
import { camera, designDateField, engine, menu, numberField, refreshControls } from './satellite-controls';
import { attitudeRows, cameraRows, dvRows, eclipseRows, linkRows, massRows, orbitRows, powerRows, type Row } from './satellite-figures';
import { figureTable, keepUnits, satTextList, sayFig } from './satellite-text';
import type { SatelliteWorkspace } from './satellite-workspace';
import { SatelliteFly, type SatelliteFlyHost } from './satellite-fly';
import { PART_TAB, satelliteDrawing, type DrawingAssumption, type SatellitePart } from '../../design/satellite-drawing';

/** R3.3: each assumption the drawing makes, worded. */
const ASSUMPTION_KEY: Record<DrawingAssumption, string> = {
  wings: 'build.sat.preview.assume.wings', bodyCells: 'build.sat.preview.assume.bodyCells',
  bodyCellsExceed: 'build.sat.preview.assume.bodyCellsExceed', spinner: 'build.sat.preview.assume.spinner',
  antennaFace: 'build.sat.preview.assume.antennaFace', cameraFace: 'build.sat.preview.assume.cameraFace',
  engineFace: 'build.sat.preview.assume.engineFace',
  stowedPanels: 'build.sat.preview.assume.stowedPanels',
};
import { renderSatelliteSvg } from './satellite-svg';
import { eclipseFigure, footprintFigure, linkFigure } from './satellite-diagrams-svg';
import { eclipseDiagram, footprintDiagram, linkDiagram } from '../../design/satellite-diagrams';
import { LINK_MARGIN_THRESHOLD } from '../../orbit/link';
import './satellite.css';

export interface SatelliteBenchHost extends SatelliteFlyHost {
  /** open the Explore level's satellite designer, where the design is saved and sent to Orbit */
  toExplore(): void;
  /** D07: open the requirements page ("Start from requirements", `#/build/engineer/requirements`) */
  toRequirements?(): void;
  /** D07: the requirements row the design `designId` was opened from, if it was */
  origin?(designId: string): { cycle: string; altitude: number } | null;
}

type BenchTab = 'power' | 'propulsion' | 'attitude' | 'radio' | 'camera' | 'lifetime';
const TABS: readonly BenchTab[] = ['power', 'propulsion', 'attitude', 'radio', 'camera', 'lifetime'];
const TAB_KEY: Record<BenchTab, string> = {
  power: 'build.sat.tab.power', propulsion: 'build.sat.tab.propulsion', attitude: 'build.sat.tab.attitude',
  radio: 'build.sat.tab.radio', camera: 'build.sat.tab.camera', lifetime: 'build.sat.tab.lifetime',
};
/** Each tab's numbers: its groups, and single fields from others (the bus's edges set the torques and the drag). */
const TAB_FIELDS: Record<BenchTab, { groups: readonly FieldGroup[]; paths?: readonly string[] }> = {
  // the node sets β and so the eclipse: the local time of a sun-synchronous orbit, the right ascension of any other (its only box)
  power: { groups: ['power'], paths: ['orbit.ltan', 'orbit.raan'] },
  propulsion: { groups: ['propulsion'], paths: ['bus.dryMass', 'lifeYears'] },
  attitude: { groups: ['adcs'], paths: ['bus.size.width', 'bus.size.height', 'bus.size.depth'] },
  radio: { groups: ['comms'] },
  camera: { groups: ['payload'] },
  lifetime: { groups: [], paths: ['bus.dryMass', 'bus.size.width', 'bus.size.height', 'bus.size.depth', 'bus.cd', 'bus.cr', 'power.arrayArea'] },
};
const LEVEL_KEY: Record<EcssLevel, string> = { low: 'life.activity.low', moderate: 'life.activity.moderate', high: 'life.activity.high' };
const P = 'sb:';
const YEAR = 365.25 * 86400;

/** The sentences that belong to a tab, by the part of the design they are about. */
const TAB_TEXTS: Record<BenchTab, readonly string[]> = {
  power: ['build.sat.warn.power', 'build.sat.warn.battery', 'build.sat.warn.batteryDeep', 'build.sat.est.power', 'build.sat.est.cycles'],
  propulsion: ['build.sat.warn.dv', 'build.sat.warn.geoNoEngine', 'build.sat.est.noEngine', 'build.sat.est.reentry', 'build.sat.est.geoKeeping'],
  attitude: ['build.sat.warn.wheel', 'build.sat.est.torques'],
  radio: ['build.sat.warn.linkNone', 'build.sat.warn.linkThin', 'build.sat.est.link'],
  camera: ['build.sat.warn.aperture', 'build.sat.warn.swathHorizon', 'build.sat.warn.cameraRate', 'build.sat.est.camera'],
  // the drag area's note is the lifetime box's own lead (`build.sat.life.area`), not said twice
  lifetime: ['build.sat.warn.lowPerigee', 'build.sat.warn.ballisticLow', 'build.sat.warn.ballisticHigh'],
};

/** A lifetime run: what it was run on, and what it found. */
interface LifeRun {
  key: string;
  level: EcssLevel;
  from: string;
  mass: number; area: number; cd: number; cr: number;
  years: number;
  /** the design has an engine, so its Δv budget holds the orbit through the mission (the drag make-up) */
  held: boolean;
  result?: PropagationResult;
  error?: string;
}

export class SatelliteBench {
  readonly root = el('div', 'bsb-grid');
  /** The id of the level's title, for the section's accessible name. */
  readonly titleId = 'bsb-title';
  private visible = false;
  private tab: BenchTab = 'power';
  private shape = '';
  private run: LifeRun | null = null;
  private running: { controller: AbortController; progress: number } | null = null;
  private readonly head = el('header', 'bs-panel bsb-head');
  private readonly tabBar = el('div', 'be-tabs');
  private readonly panel = el('section', 'bs-panel bsb-panel');
  /** "Fly it" in the Launch section, under the tabs (the integration of D06, map §2.6 c) */
  private readonly flySection = el('section', 'bs-panel bsb-fly');
  private readonly flyBox: SatelliteFly;
  /** R3.3: the design drawn from the same object its figures come from */
  private readonly preview = el('section', 'bs-panel bsb-preview');
  /** R3.3: the drawing's pose, deployed as it flies or stowed as it is launched */
  private pose: 'deployed' | 'stowed' = 'deployed';
  private poseBox: HTMLElement | null = null;
  private readonly drawBox = el('div', 'bsb-draw');
  private readonly drawSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  private drawQueued = 0;

  constructor(private readonly ws: SatelliteWorkspace, private readonly host: SatelliteBenchHost) {
    this.tabBar.setAttribute('role', 'tablist');
    this.tabBar.addEventListener('keydown', (e) => this.onTabKey(e));
    this.panel.setAttribute('role', 'tabpanel');
    this.flyBox = new SatelliteFly(this.ws, { launchMission: () => this.host.launchMission(), fly: (doc) => this.host.fly(doc) }, P);
    this.flySection.append(this.flyBox.root);
    this.drawSvg.setAttribute('class', 'bsb-svg');
    this.drawBox.append(this.drawSvg);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.queueDrawing()).observe(this.drawBox);
    this.root.append(this.head, this.preview, this.tabBar, this.panel, this.flySection);
    this.ws.subscribe(() => {
      if (!this.visible) return;
      if (this.shapeOf() !== this.shape) this.rebuild();
      else this.refresh();
    });
  }

  show(): void {
    this.visible = true;
    this.ws.syncName();
    this.rebuild();
  }

  hide(): void {
    this.visible = false;
  }

  private shapeOf(): string {
    const d = this.ws.design;
    return JSON.stringify([this.tab, d.template, d.orbit.sso, !!d.propulsion, !!d.payload, d.adcs.mode, this.ws.activityLevel, this.ws.generation, this.ws.lessonDesk?.locked ?? null]);
  }

  // ─── drawing ──────────────────────────────────────────────────────────────

  private keepFocus(redraw: () => void): void {
    const active = document.activeElement as HTMLElement | null;
    const key = active && this.root.contains(active) ? active.dataset.k ?? active.id ?? null : null;
    redraw();
    if (key && !this.root.contains(document.activeElement)) {
      (this.root.querySelector<HTMLElement>(`[data-k="${CSS.escape(key)}"]`) ?? this.root.querySelector<HTMLElement>(`#${CSS.escape(key)}`))?.focus();
    }
  }

  private rebuild(): void {
    if (!this.visible) return;
    this.shape = this.shapeOf();
    this.keepFocus(() => {
      this.renderHead();
      this.renderPreview();
      this.renderTabs();
      this.renderPanel();
    });
  }

  private refresh(): void {
    if (!this.visible) return;
    this.keepFocus(() => {
      refreshControls(this.panel, this.ws.design, (p) => this.ws.locked(p));
      // not under the student's hands: a date half typed in the head's box stays as it is
      if (!this.head.contains(document.activeElement)) this.renderHead();
      this.renderPreview();
      this.renderResults();
    });
  }

  private renderHead(): void {
    const eyebrow = el('span', 'eyebrow bs-eyebrow', `${t('section.build')} · ${t('mode.engineer')}`);
    const title = el('h1', 'bs-title', t('build.sat.bench.title'));
    title.id = this.titleId;
    const text = el('div', 'be-head-text');
    text.append(eyebrow, title, el('p', 'bs-lead', t('build.sat.bench.lead')));
    const side = el('div', 'bsb-design');
    side.append(el('p', 'bsb-name', t('build.sat.bench.design', { name: this.ws.design.name.trim() || '—' })));
    // D07: a design opened from a row of the requirements page says which; any design can start from requirements
    const from = this.host.origin?.(this.ws.design.id);
    if (from) side.append(el('p', 'bx-note small', t('build.req.origin', { cycle: from.cycle, h: sayFig({ value: from.altitude, unit: 'm' }) })));
    const toExplore = button('watch-btn', t('build.sat.bench.toExplore'), () => this.host.toExplore());
    toExplore.dataset.k = `${P}toExplore`;
    side.append(toExplore);
    if (this.host.toRequirements) {
      const toReq = button('watch-btn', t('build.req.start'), () => this.host.toRequirements?.());
      toReq.dataset.k = `${P}toRequirements`;
      side.append(toReq);
    }
    const level = select(`${P}level`, DESIGN_ACTIVITY_LEVELS.map((l) => ({ value: l, label: t(LEVEL_KEY[l]) })), this.ws.activityLevel,
      (v) => this.ws.setLevel(v as EcssLevel));
    // T01: a design lesson fixes the air its figures are read in, as it fixes their day
    level.disabled = !!this.ws.lessonDesk;
    side.append(field(t('build.sat.bench.level'), level, 'bx-field bsb-level'), designDateField(this.ws, P));
    if (this.ws.lessonDesk) side.append(el('p', 'bx-note small bsat-lesson-note', t('lesson.design.deskNote')));
    this.head.replaceChildren(text, side);
  }

  // ─── R3.3: the drawing ───────────────────────────────────────────────────

  /** The part the open tab is about, highlighted in the drawing (none for lifetime). */
  private tabPart(): SatellitePart | null {
    if (this.tab === 'lifetime') return null;
    return (Object.keys(PART_TAB) as SatellitePart[]).find((p) => PART_TAB[p] === this.tab) ?? null;
  }

  private renderPreview(): void {
    const result = satelliteDrawing(this.ws.design);
    const title = el('h2', 'bx-h2', t('build.sat.preview.title'));
    title.id = `${P}preview-title`;
    this.preview.setAttribute('aria-labelledby', title.id);
    if (!result.ok) {
      // a draft being typed: say so rather than keep the last good picture as if it were this design
      const msg = el('p', 'bx-note bsb-preview-invalid', t('build.sat.preview.invalid'));
      msg.setAttribute('role', 'status');
      this.preview.replaceChildren(title, msg);
      return;
    }
    const g = result.drawing;
    const parts = el('div', 'bsb-preview-parts');
    parts.setAttribute('role', 'group');
    parts.setAttribute('aria-label', t('build.sat.preview.parts'));
    const active = this.tabPart();
    for (const part of g.parts) {
      const b = button('be-mode bsb-part', this.partText(part, g), () => this.setTab(PART_TAB[part], false));
      b.dataset.k = `${P}part-${part}`;
      b.setAttribute('aria-pressed', String(part === active));
      parts.append(b);
    }
    // R3.3: deployed, as it flies; stowed, as it rides to orbit (only wings fold)
    if (g.stowed) {
      const poses = el('div', 'bsb-poses');
      poses.setAttribute('role', 'group');
      poses.setAttribute('aria-label', t('build.sat.preview.pose'));
      for (const [pose, key] of [['deployed', 'build.sat.preview.deployed'], ['stowed', 'build.sat.preview.stowed']] as const) {
        // M-PLAN-027: the redraw replaces the buttons; the keyboard stays on the one pressed
        const b = button('be-mode bsb-pose', t(key), () => { this.pose = pose; this.renderPreview(); this.preview.querySelector<HTMLElement>(`[data-k="${P}pose-${pose}"]`)?.focus(); });
        b.dataset.k = `${P}pose-${pose}`;
        b.setAttribute('aria-pressed', String(this.pose === pose));
        poses.append(b);
      }
      this.poseBox = poses;
    } else this.poseBox = null;
    const notes = el('ul', 'bsb-assumptions');
    for (const a of g.assumptions) notes.append(el('li', a === 'bodyCellsExceed' ? 'warn' : undefined, t(ASSUMPTION_KEY[a])));
    // the axes in the corner are a convention of the drawing, not a figure of the design: said all the same
    notes.append(el('li', 'axes', t('build.sat.preview.assume.axes')));
    const body = el('div', 'bsb-preview-body');
    const side = el('div', 'bsb-preview-side');
    side.append(...(this.poseBox ? [this.poseBox] : []), parts, el('p', 'bx-note small', t('build.sat.preview.note')), notes);
    body.append(this.drawBox, side);
    this.preview.replaceChildren(title, body);
    this.queueDrawing();
  }

  private partText(part: SatellitePart, g: Extract<ReturnType<typeof satelliteDrawing>, { ok: true }>['drawing']): string {
    const m = (v: number): string => `${num(v, v < 1 ? 2 : 1)} ${t('u.m')}`;
    switch (part) {
      case 'bus': return t('build.sat.preview.bus', { w: m(g.bus.width), h: m(g.bus.height), d: m(g.bus.depth) });
      case 'arrays': return t(g.wings ? 'build.sat.preview.wings' : g.cells?.mount === 'spinner' ? 'build.sat.preview.spinCells' : 'build.sat.preview.bodyCells',
        { a: num(g.wings ? g.wings.area * 2 : g.cells?.area ?? 0, 2) });
      case 'antenna': return t('build.sat.preview.dish', { d: m(g.antenna!.diameter) });
      case 'camera': return t('build.sat.preview.aperture', { d: m(g.camera!.aperture) });
      case 'engine': return t('build.sat.preview.engine', { f: num(g.engine!.thrust, g.engine!.thrust < 10 ? 2 : 0) });
    }
  }

  private queueDrawing(): void {
    if (this.drawQueued || !this.visible) return;
    this.drawQueued = requestAnimationFrame(() => { this.drawQueued = 0; this.renderDrawing(); });
  }

  private renderDrawing(): void {
    if (!this.visible || !this.drawBox.isConnected) return;
    const result = satelliteDrawing(this.ws.design);
    const w = this.drawBox.clientWidth, h = this.drawBox.clientHeight;
    if (!result.ok || w < 10 || h < 10) return;
    renderSatelliteSvg(this.drawSvg, result.drawing, { width: w, height: h }, {
      highlight: this.tabPart(),
      title: t('build.sat.preview.drawingTitle', { name: this.ws.design.name.trim() || '—' }),
      pick: (part) => this.setTab(PART_TAB[part], false),
      pose: this.pose,
    });
  }

  private renderTabs(): void {
    this.tabBar.setAttribute('aria-label', t('build.sat.bench.tabs'));
    const active = document.activeElement;
    const hadFocus = active instanceof HTMLElement && this.tabBar.contains(active);
    this.tabBar.replaceChildren(...TABS.map((k) => {
      const b = button('be-tab', t(TAB_KEY[k]), () => this.setTab(k, false));
      b.id = `bsb-tab-${k}`;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', 'bsb-panel');
      b.setAttribute('aria-selected', String(k === this.tab));
      b.tabIndex = k === this.tab ? 0 : -1;
      return b;
    }));
    this.panel.id = 'bsb-panel';
    this.panel.setAttribute('aria-labelledby', `bsb-tab-${this.tab}`);
    if (hadFocus) this.tabBar.querySelector<HTMLElement>(`#bsb-tab-${this.tab}`)?.focus();
  }

  /** WAI-ARIA tabs: the arrows and Home/End move between the tabs and open the one they reach. */
  private onTabKey(e: KeyboardEvent): void {
    const i = TABS.indexOf(this.tab), n = TABS.length;
    const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    this.setTab(TABS[next], true);
  }

  private setTab(k: BenchTab, focus: boolean): void {
    if (k !== this.tab) {
      this.tab = k;
      this.rebuild();
    }
    if (focus) this.tabBar.querySelector<HTMLElement>(`#bsb-tab-${k}`)?.focus();
  }

  /** The tab's inputs (built once per shape) and its results (drawn again on every change). */
  private renderPanel(): void {
    const inputs = el('section', 'bsb-inputs');
    inputs.append(el('h2', 'bx-h2', t('build.sat.bench.inputs')));
    const d = this.ws.design;
    if (this.tab === 'propulsion') inputs.append(engine(this.ws, P));
    if (this.tab === 'camera') inputs.append(camera(this.ws, P));
    const grid = el('div', 'bsat-fields');
    if (this.tab === 'power') grid.append(menu(this.ws, 'mount', P), menu(this.ws, 'regulation', P));
    if (this.tab === 'attitude') grid.append(menu(this.ws, 'mode', P));
    if (this.tab === 'radio') grid.append(menu(this.ws, 'station', P));
    for (const f of this.tabFields()) grid.append(numberField(this.ws, f, P));
    if (grid.childElementCount) inputs.append(grid);
    if (this.tab === 'propulsion' && !d.propulsion) inputs.append(el('p', 'bx-note', t('build.sat.bench.noEngine')));
    if (this.tab === 'camera' && !d.payload) inputs.append(el('p', 'bx-note', t('build.sat.bench.noCamera')));
    inputs.append(this.sources());
    const results = el('section', 'bsb-results');
    results.setAttribute('aria-live', 'polite');
    this.panel.replaceChildren(inputs, results);
    this.renderResults();
  }

  /** The numbers the tab edits: its groups' and the single ones it borrows, the ones the design has. */
  private tabFields(): typeof SATELLITE_FIELDS {
    const d = this.ws.design;
    const spec = TAB_FIELDS[this.tab];
    const fields = SATELLITE_FIELDS.filter((f) => spec.groups.includes(f.group));
    for (const path of spec.paths ?? []) {
      const f = fieldByPath(path);
      if (f && !fields.includes(f)) fields.push(f);
    }
    return fields.filter((f) => !(f.path === 'orbit.ltan' && !d.orbit.sso) && !(f.path === 'orbit.raan' && d.orbit.sso)
      && !(f.group === 'propulsion' && !d.propulsion) && !(f.group === 'payload' && !d.payload));
  }

  /** Where the tab's numbers come from: each sourced one with its source, the estimates named. */
  private sources(): HTMLElement {
    const d = this.ws.design;
    const more = el('details', 'bsb-sources');
    more.append(el('summary', undefined, t('build.sat.bench.sources')));
    const list = el('ul', 'bsb-source-list');
    const estimates: string[] = [];
    for (const f of this.tabFields()) {
      const o = fieldOrigin(d, f.path);
      if (o.kind === 'sourced') {
        const li = el('li');
        li.append(el('strong', undefined, `${t(f.key)}: `), el('span', undefined, o.source));
        list.append(li);
      } else if (o.kind === 'estimate') estimates.push(t(f.key));
    }
    if (estimates.length) {
      const li = el('li');
      li.append(el('strong', undefined, `${t('build.stat.estimate')}: `), el('span', undefined, estimates.join(', ')));
      list.append(li);
    }
    if (!list.childElementCount) list.append(el('li', undefined, t('build.sat.bench.allYours')));
    more.append(list);
    return more;
  }

  private renderResults(): void {
    const results = this.panel.querySelector<HTMLElement>('.bsb-results');
    if (!results) return;
    const { fig, issues, stale } = this.ws.worked();
    this.flyBox.render(issues.length > 0 || !fig);
    const d = this.ws.design;
    const parts: HTMLElement[] = [el('h2', 'bx-h2', t('build.sat.bench.figures'))];
    if (issues.length) parts.push(satTextList(problemTexts(issues)));
    if (fig) {
      const rows = this.rows(fig);
      if (rows.length) parts.push(figureTable(rows));
      const texts = this.texts(d, fig);
      if (texts.length) parts.push(satTextList(texts));
      // R3.3: the tab's diagram, drawn from the same figures as the table above it
      const diagram = this.diagram(fig);
      if (diagram) parts.push(diagram);
    }
    if (this.tab === 'lifetime') parts.push(this.lifetimeBox(fig, issues.length > 0));
    if (stale && !issues.length) {
      const p = el('p', 'bx-note small', t('build.sat.stale'));
      p.setAttribute('role', 'status');
      parts.push(p);
    }
    results.classList.toggle('stale', stale || issues.length > 0);
    results.replaceChildren(...parts);
  }

  private diagram(fig: SatelliteFigures): HTMLElement | null {
    if (this.tab === 'power') return eclipseFigure(eclipseDiagram(fig));
    if (this.tab === 'radio') return linkFigure(linkDiagram(fig, LINK_MARGIN_THRESHOLD));
    if (this.tab === 'camera') { const c = footprintDiagram(fig); return c ? footprintFigure(c) : null; }
    return null;
  }

  private rows(fig: SatelliteFigures): Row[] {
    switch (this.tab) {
      case 'power': return [...orbitRows(fig).slice(0, 3), ...eclipseRows(fig), ...powerRows(fig)];
      case 'propulsion': return [...massRows(fig).slice(0, 3), ...dvRows(fig)];
      case 'attitude': return attitudeRows(fig);
      case 'radio': return linkRows(fig);
      case 'camera': return cameraRows(fig);
      case 'lifetime': return [...orbitRows(fig).slice(0, 1), ...massRows(fig)];
    }
  }

  /** The tab's sentences: the checks and the estimate notes about its part of the design. */
  private texts(d: SatelliteDesign, fig: SatelliteFigures): SatText[] {
    const keys = TAB_TEXTS[this.tab];
    return [...satelliteChecks(d, fig), ...estimateTexts(d, fig)].filter((s) => keys.includes(s.key));
  }

  // ─── the lifetime ─────────────────────────────────────────────────────────

  private runKey(): string {
    return JSON.stringify([this.ws.design, this.ws.jd(), this.ws.activityLevel]);
  }

  private lifetimeBox(fig: SatelliteFigures | null, refused: boolean): HTMLElement {
    const box = el('div', 'bsb-life');
    const d = this.ws.design;
    box.append(el('p', 'bx-note', t('build.sat.life.lead')));
    if (fig) box.append(el('p', 'bx-note', t('build.sat.life.area', { area: sayFig(fig.drag.area) })));
    const job = this.running;
    if (job) {
      const line = el('div', 'bx-progress');
      line.setAttribute('role', 'status');
      const bar = el('progress');
      bar.max = 1;
      bar.value = job.progress;
      bar.setAttribute('aria-label', t('build.sat.tab.lifetime'));
      line.append(bar, el('span', undefined, t('build.sat.life.running', { p: Math.round(job.progress * 100) })));
      const stop = button('watch-btn', t('build.sat.life.stop'), () => job.controller.abort());
      stop.dataset.k = `${P}lifeStop`;
      line.append(stop);
      box.append(line);
    } else {
      const go = button('watch-btn primary', t('build.sat.life.run', { years: tCount('build.sat.n.years', d.lifeYears + 25, (d.lifeYears + 25) % 1 ? 1 : 0) }), () => this.runLifetime());
      go.dataset.k = `${P}lifeRun`;
      go.disabled = refused || !fig;
      box.append(go);
    }
    const r = this.run;
    if (r) {
      const out = el('div', 'bsb-life-out');
      out.setAttribute('role', 'status');
      if (r.key !== this.runKey()) out.append(el('p', 'bx-note warn', t('build.sat.life.stale')));
      if (r.error) out.append(el('p', 'bx-note bx-msg-error', r.error));
      else if (r.result) {
        const res = r.result;
        const last = res.samples[res.samples.length - 1];
        // the verdict's time stays with its unit on a phone ("через 6,8 года", task W)
        out.append(el('p', 'bsb-verdict', keepUnits(res.lifetime !== null
          ? t('build.sat.life.down', { time: formatDuration(res.lifetime) })
          : t('build.sat.life.up', { time: formatDuration(last.t), pe: num(last.perigeeAlt / 1000), ap: num(last.apogeeAlt / 1000) }))));
        // IADC's rule for the low region: down within 25 years of the end of the mission. With no engine the air
        // has it from the start, so the run from the design orbit has the mission and 25 years; with one, the
        // budget holds the orbit through the mission (its drag make-up), so the 25 years start from the design
        // orbit at the mission's end, and the run from that orbit has 25 years alone.
        if (fig?.orbit.region === 'leo') {
          const within = res.lifetime !== null && res.lifetime <= ((r.held ? 0 : r.years) + 25) * YEAR;
          if (r.held) out.append(el('p', 'bx-note small', t('build.sat.life.held', { life: num(r.years, r.years % 1 ? 1 : 0) })));
          out.append(el('p', `bx-note${within ? '' : ' warn'}`, t(within ? 'build.sat.life.rule25' : 'build.sat.life.rule25no', { life: num(r.years, r.years % 1 ? 1 : 0) })));
        }
        out.append(el('p', 'bx-note small', t('build.sat.life.inputs', {
          mass: sayFig({ value: r.mass, unit: 'kg' }), area: sayFig({ value: r.area, unit: 'm2' }), cd: num(r.cd, 2), cr: num(r.cr, 2),
          level: t(LEVEL_KEY[r.level]), date: r.from,
        })));
      } else out.append(el('p', 'bx-note', t('build.sat.life.stopped')));
      box.append(out);
    }
    return box;
  }

  private runLifetime(): void {
    if (this.running) return;
    const d = structuredClone(this.ws.design);
    const jd = this.ws.jd();
    const level = this.ws.activityLevel;
    // the run a design lesson grades the lifetime with too (T01): one request, one way (src/design/design-lesson-key.ts)
    const req = designLifetimeRequest(d, jd, level, d.lifeYears + 25);
    if (!req) return;
    const sc = lifetimeSpacecraft(d);
    const run: LifeRun = {
      key: this.runKey(), level, from: this.ws.date,
      mass: sc.mass, area: sc.area, cd: sc.cd, cr: sc.cr, years: d.lifeYears, held: !!d.propulsion,
    };
    const controller = new AbortController();
    const job = { controller, progress: 0 };
    this.running = job;
    this.run = null;
    this.renderResults();
    // the mean-element method, the dialog's default; it leaves out the Sun, the Moon and sunlight pressure
    runLifetimeJob(req, controller.signal, (f) => {
      job.progress = f;
      const bar = this.panel.querySelector<HTMLProgressElement>('.bsb-life progress');
      if (bar) bar.value = f;
      const label = bar?.nextElementSibling;
      if (label) label.textContent = t('build.sat.life.running', { p: Math.round(f * 100) });
    }).then((result) => {
      run.result = result;
    }).catch((error: unknown) => {
      const cancelled = error instanceof DOMException && error.name === 'AbortError';
      if (!cancelled) run.error = t('build.sat.life.failed');
    }).finally(() => {
      if (this.running === job) this.running = null;
      this.run = run;
      if (this.visible) this.keepFocus(() => this.renderResults());
    });
  }
}
