/**
 * The Build section's Explore level, satellite side (roadmap D06,
 * docs/ROADMAP-PART2-3.md; Phase 4 map §2.7, track B): design a satellite
 * from a template.
 *
 * Pick where to start — NAPA-2, a THEOS-2-class imager, or one of the
 * catalogue's classes (src/data/satellite-templates.ts) — then change its
 * orbit, its loads and array and battery, its engine and propellant, its
 * radio and its camera. Its figures are worked out as the student types
 * (src/design/satellite-model.ts `designFigures`, over the D06 cores): the
 * eclipse, the array and battery it needs, the Δv budget, the torques, the
 * link margin, the ground sample; at a glance at the side, in full below.
 * What does not work, what is thin, and what is an estimate are said in
 * words. Every number carries its mark: sourced (and where from), an
 * estimate, or the student's own. The design is saved, exported and
 * imported like a rocket (the store's 'satellite' kind), and "Send to
 * Orbit" puts it in its orbit in the Orbit section with no launch (the C1
 * hand-off, `BuildScreenHost.toOrbit`), where the lifetime analysis flies
 * its mass and drag area.
 *
 * The thin DOM part: the design lives in the `SatelliteWorkspace` the
 * Engineer level's bench shares; this draws it and turns the student's
 * input into edits. Controls are rebuilt only when their shape changes (an
 * engine or a camera added, another template), so typing is never
 * interrupted, and the keyboard stays where it was.
 */
import { t } from '../../i18n';
import { RAD } from '../../physics/constants';
import { SATELLITE_TEMPLATES } from '../../data/satellite-templates';
import {
  SATELLITE_FIELDS, TEMPLATE_TEXT, designFromTemplate, designHandoff, estimateTexts, newSatelliteId, problemTexts, satelliteChecks,
  type FieldGroup, type SatelliteFigures,
} from '../../design/satellite-model';
import type { SatelliteDesign } from '../../design/satellite-spec';
import { isDesignOf, type DesignRecord } from '../../design/design-store';
import type { OrbitHandoff } from '../../orbit/handoff';
import { button, el, num } from '../orbit/dom';
import { ExploreStore, STORE_TEXTS } from './explore-store';
import { field, select } from './explore-level';
import { camera, designDateField, engine, menu, numberField, refreshControls, sso } from './satellite-controls';
import { SECTION_KEY, sectionRows, type Section } from './satellite-figures';
import { figureTable, satTextList, sayFig } from './satellite-text';
import { defaultNameFor, type SatelliteWorkspace } from './satellite-workspace';
import './satellite.css';

export interface SatelliteLevelHost {
  /** hand the design to the Orbit section in its own orbit (C1's hook), at the Explore level */
  toOrbit(h: OrbitHandoff): void;
  /** a rocket imported here (a file of the other kind): open it in the rocket designer, whose store says `message` */
  openRocket(record: DesignRecord<'vehicle'>, message: string): void;
}

/** The groups the Explore level shows, and each one's heading; the rest of the numbers are the bench's. */
const GROUPS: readonly { group: FieldGroup; key: string }[] = [
  { group: 'orbit', key: 'build.sat.g.orbit' },
  { group: 'bus', key: 'build.sat.g.bus' },
  { group: 'power', key: 'build.sat.g.power' },
  { group: 'propulsion', key: 'build.sat.g.propulsion' },
  { group: 'comms', key: 'build.sat.g.comms' },
  { group: 'payload', key: 'build.sat.g.payload' },
];
const SECTIONS: readonly Section[] = ['orbit', 'eclipse', 'power', 'dv', 'attitude', 'link', 'camera'];
const P = 'sx:';

/** "NAPA-2: 520 × 540 km, 97.5°": the label the Orbit section shows the hand-off under. */
export function orbitLabel(design: SatelliteDesign, fig: SatelliteFigures | null): string {
  const o = design.orbit;
  const i = fig ? fig.orbit.inclination.value * RAD : o.inclination;
  return t('build.sat.orbit.label', { name: design.name.trim() || design.template, pe: num(o.perigee / 1000), ap: num(o.apogee / 1000), i: num(i, 1), u: t('u.km') });
}

/** The design's shape: what decides which controls there are. */
const shapeOf = (d: SatelliteDesign): string => JSON.stringify([d.template, d.orbit.sso, !!d.propulsion, !!d.payload]);

export class SatelliteLevel {
  readonly root = el('div', 'bsat-grid');
  /** The id of the level's title, for the section's accessible name. */
  readonly titleId = 'bsat-title';
  private visible = false;
  private shape = '';
  private orbitMessage: string | null = null;
  private readonly head = el('header', 'bs-panel bsat-head');
  private readonly glance = el('section', 'bs-panel bsat-glance');
  private readonly controls = el('section', 'bs-panel bsat-controls');
  private readonly checks = el('section', 'bs-panel bsat-checks');
  private readonly figures = el('section', 'bs-panel bsat-figures');
  private readonly store: ExploreStore<'satellite'>;

  constructor(private readonly ws: SatelliteWorkspace, private readonly host: SatelliteLevelHost) {
    this.store = new ExploreStore<'satellite'>({
      current: () => (this.ws.worked().issues.length ? null : { spec: this.ws.design, name: this.ws.design.name.trim(), recordId: this.ws.recordId }),
      saved: (recordId, name) => { this.ws.saved(recordId, name); this.renderHead(); },
      open: (record) => this.open(record),
      forgotten: (recordId) => { if (this.ws.recordId === recordId) this.ws.saved(null); },
      other: (record, message) => { if (isDesignOf(record, 'vehicle')) this.host.openRocket(record, message); },
    }, undefined, 'satellite', STORE_TEXTS.satellite);
    this.glance.setAttribute('aria-labelledby', 'bsat-glance-title');
    this.controls.setAttribute('aria-labelledby', 'bsat-controls-title');
    this.checks.setAttribute('aria-labelledby', 'bsat-checks-title');
    this.figures.setAttribute('aria-labelledby', 'bsat-figures-title');
    this.store.root.classList.add('bsat-store');
    this.root.append(this.head, this.glance, this.controls, this.checks, this.figures, this.store.root);
    this.ws.subscribe(() => {
      if (!this.visible) return;
      if (shapeOf(this.ws.design) !== this.shape) this.rebuild();
      else this.refresh();
    });
  }

  /** On screen, in the interface language: everything drawn again, the saved designs read again. */
  show(): void {
    this.visible = true;
    this.ws.syncName();
    this.rebuild();
    void this.store.refresh();
  }

  hide(): void {
    this.visible = false;
  }

  /** A kept or imported satellite design, opened here, and what the store says of it (a file imported in the rocket designer). */
  open(record: DesignRecord<'satellite'>, message?: string): void {
    this.orbitMessage = null;
    this.ws.replace({ design: structuredClone(record.design), recordId: record.id, defaultName: '' });
    if (message) this.store.announce('warn', message);
    if (this.visible) this.root.closest('.build-screen')?.scrollTo({ top: 0 });
  }

  private pickTemplate(id: string): void {
    const name = defaultNameFor(id);
    this.orbitMessage = null;
    this.ws.replace({ design: designFromTemplate(id, newSatelliteId(), name), recordId: null, defaultName: name });
  }

  // ─── drawing ──────────────────────────────────────────────────────────────

  /** Run a redraw and put the keyboard back on the control it was on. */
  private keepFocus(redraw: () => void): void {
    const active = document.activeElement as HTMLElement | null;
    const key = active && this.root.contains(active) ? active.dataset.k ?? null : null;
    redraw();
    if (key && !this.root.contains(document.activeElement)) this.root.querySelector<HTMLElement>(`[data-k="${CSS.escape(key)}"]`)?.focus();
  }

  private rebuild(): void {
    if (!this.visible) return;
    this.shape = shapeOf(this.ws.design);
    this.keepFocus(() => {
      this.renderHead();
      this.renderControls();
      this.refresh();
    });
  }

  private refresh(): void {
    if (!this.visible) return;
    this.keepFocus(() => {
      refreshControls(this.controls, this.ws.design);
      this.renderGlance();
      this.renderChecks();
      this.renderFigures();
      this.store.render();
    });
  }

  private renderHead(): void {
    const d = this.ws.design;
    const eyebrow = el('span', 'eyebrow bs-eyebrow', `${t('section.build')} · ${t('mode.explore')}`);
    const title = el('h1', 'bs-title', t('build.sat.title'));
    title.id = this.titleId;
    const text = el('div', 'bx-head-text');
    text.append(eyebrow, title, el('p', 'bs-lead', t('build.sat.lead')));

    const thai = SATELLITE_TEMPLATES.filter((x) => !x.derivedFrom);
    const options = SATELLITE_TEMPLATES.map((x) => ({
      value: x.id, label: t(TEMPLATE_TEXT[x.id].name), group: t(thai.includes(x) ? 'build.sat.tpl.group.thai' : 'build.sat.tpl.group.class'),
    }));
    const picker = select(`${P}template`, options, d.template, (id) => this.pickTemplate(id));
    const name = el('input', 'bx-text');
    name.type = 'text';
    name.maxLength = 80;
    name.value = d.name;
    name.dataset.k = `${P}name`;
    name.addEventListener('input', () => this.ws.rename(name.value));
    const again = button('watch-btn', t('build.sat.startOver'), () => this.pickTemplate(this.ws.design.template));
    again.dataset.k = `${P}again`;
    const row = el('div', 'bx-head-row');
    row.append(field(t('build.sat.template'), picker, 'bx-field bsat-template'), field(t('build.sat.name'), name, 'bx-field bx-name'), again,
      designDateField(this.ws, P));
    const about = el('p', 'bsat-about', t(TEMPLATE_TEXT[d.template]?.about ?? 'build.sat.tpl.none'));
    this.head.replaceChildren(text, row, about, el('p', 'bx-note small', `${t('build.sat.origin.legend')} ${t('build.sat.date.note')}`));
  }

  private renderControls(): void {
    const title = el('h2', 'bx-h2', t('build.sat.controls'));
    title.id = 'bsat-controls-title';
    const parts: HTMLElement[] = [title];
    const d = this.ws.design;
    for (const { group, key } of GROUPS) {
      const card = el('section', 'bx-card bsat-card');
      card.dataset.group = group;
      card.append(el('h3', 'bx-h3', t(key)));
      if (group === 'orbit') card.append(sso(this.ws, P));
      if (group === 'propulsion') card.append(engine(this.ws, P));
      if (group === 'payload') card.append(camera(this.ws, P));
      const grid = el('div', 'bsat-fields');
      for (const f of SATELLITE_FIELDS.filter((x) => x.group === group && x.explore)) {
        if (f.path === 'orbit.ltan' && !d.orbit.sso) continue;
        if (f.group === 'propulsion' && !d.propulsion) continue;
        if (f.group === 'payload' && !d.payload) continue;
        grid.append(numberField(this.ws, f, P));
      }
      if (group === 'power') grid.append(menu(this.ws, 'mount', P));
      if (group === 'comms') grid.append(menu(this.ws, 'station', P));
      if (grid.childElementCount) card.append(grid);
      parts.push(card);
    }
    parts.push(el('p', 'bx-note small', t('build.sat.moreAtEngineer')));
    this.controls.replaceChildren(...parts);
  }

  private renderGlance(): void {
    const { fig, issues, stale } = this.ws.worked();
    const title = el('h2', 'bx-h2', t('build.sat.glance'));
    title.id = 'bsat-glance-title';
    const parts: HTMLElement[] = [title];
    if (fig) {
      const rows: [string, string][] = [
        [t('build.sat.gl.mass'), sayFig(fig.mass.wet)],
        [t('build.sat.gl.eclipse'), sayFig(fig.eclipse.worst)],
        [t('build.sat.gl.power'), fig.power.margin ? sayFig(fig.power.margin) : '—'],
        [t('build.sat.gl.battery'), sayFig(fig.power.depth)],
        [t('build.sat.gl.dv'), fig.dv.engine ? sayFig(fig.dv.margin) : t('build.sat.gl.noEngine')],
        [t('build.sat.gl.link'), sayFig(fig.link.margin)],
      ];
      if (fig.camera) rows.push([t('build.sat.gl.gsd'), sayFig(fig.camera.gsd)]);
      rows.push([t('build.sat.gl.dragArea'), sayFig(fig.drag.area)]);
      const dl = el('dl', 'bx-summary bsat-summary');
      dl.append(...rows.map(([k, v]) => {
        const box = el('div', 'bx-sum');
        box.append(el('dt', undefined, k), el('dd', undefined, v));
        return box;
      }));
      parts.push(dl);
    }
    const note = issues.length ? t('build.sat.refused') : stale ? t('build.sat.stale') : t('build.sat.glance.note', { date: this.ws.date });
    const p = el('p', `bx-note small${issues.length ? ' warn' : ''}`, note);
    p.setAttribute('role', 'status');
    parts.push(p);
    this.glance.classList.toggle('stale', stale || issues.length > 0);
    this.glance.replaceChildren(...parts);
  }

  private renderChecks(): void {
    const { fig, issues } = this.ws.worked();
    const title = el('h2', 'bx-h2', t('build.sat.checks'));
    title.id = 'bsat-checks-title';
    const parts: HTMLElement[] = [title];
    const d = this.ws.design;
    if (issues.length) parts.push(satTextList(problemTexts(issues)));
    else if (fig) {
      const says = satelliteChecks(d, fig);
      const faults = says.filter((s) => s.level !== 'note');
      parts.push(faults.length ? satTextList(faults) : el('p', 'bx-clear', t('build.sat.checks.clear')));
      const notes = [...says.filter((s) => s.level === 'note'), ...estimateTexts(d, fig)];
      parts.push(el('h3', 'bx-h3', t('build.sat.estimates')), satTextList(notes));
    }
    parts.push(this.orbitBox(fig, issues.length > 0));
    this.checks.replaceChildren(...parts);
  }

  /** "Send to Orbit": the design in its orbit in the Orbit section, with no launch. */
  private orbitBox(fig: SatelliteFigures | null, refused: boolean): HTMLElement {
    const box = el('div', 'bsat-orbit');
    box.append(el('h3', 'bx-h3', t('build.sat.toOrbit.title')), el('p', 'bx-note', t('build.sat.toOrbit.lead')));
    const go = button('watch-btn primary bx-fly-btn', `${t('build.sat.toOrbit')} ›`, () => this.toOrbit(fig));
    go.dataset.k = `${P}toOrbit`;
    go.disabled = refused || !fig;
    box.append(go);
    if (refused) box.append(el('p', 'bx-note warn', t('build.sat.toOrbit.blocked')));
    if (this.orbitMessage) {
      const p = el('p', 'bx-note bx-msg-error', this.orbitMessage);
      p.setAttribute('role', 'status');
      box.append(p);
    }
    return box;
  }

  private toOrbit(fig: SatelliteFigures | null): void {
    const d = this.ws.design;
    const h = designHandoff(d, this.ws.jd(), orbitLabel(d, fig));
    if (!h) {
      this.orbitMessage = t('build.sat.toOrbit.failed');
      this.renderChecks();
      return;
    }
    this.orbitMessage = null;
    this.host.toOrbit(h);
  }

  private renderFigures(): void {
    const { fig, stale } = this.ws.worked();
    const title = el('h2', 'bs-fig-title', t('build.sat.fig.title'));
    title.id = 'bsat-figures-title';
    const parts: HTMLElement[] = [title];
    if (fig) {
      const grid = el('div', 'bsat-sections');
      for (const s of SECTIONS) {
        const rows = sectionRows(s, fig);
        if (!rows.length) continue;
        const card = el('section', 'bsat-section');
        card.append(el('h3', 'bx-h3', t(SECTION_KEY[s])), figureTable(rows));
        grid.append(card);
      }
      parts.push(grid);
    }
    this.figures.classList.toggle('stale', stale);
    this.figures.replaceChildren(...parts);
  }
}
