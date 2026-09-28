/**
 * The Build section (roadmap Phase 3, D01–D05; docs/ROADMAP-PART2-3.md).
 *
 * Its Watch level is built: real rockets taken apart ("exploded views of real
 * rockets"). Any of the catalogue's 21 vehicles is drawn to scale from the
 * side, standing or moved apart — stages along the axis, strap-ons out to the
 * sides, the fairing's halves apart — each part from D01's parts catalogue.
 * Clicking a part opens its catalogue card (its engines' thrust and Isp at sea
 * level and in vacuum, what they burn, the body's masses and size, the
 * sources); below the drawing stand the budget core's stage-by-stage figures;
 * and a narrated tour of five steps, each on a real vehicle, says what a stage
 * is and why rockets stage, what strap-ons do, why an upper stage can push
 * less than its weight, and what the fairing is for.
 *
 * Its Explore and Engineer levels are being built next (D02–D05): until they
 * are, each shows what is coming to it, item by roadmap item, and leads to
 * the Watch level. The section links open the Build section at its Watch
 * level for that reason (`sectionLinkLevel`, src/ui/section-plan.ts).
 *
 * The thin DOM part, mounted like the Orbit playground (src/ui/orbit/
 * playground.ts): drawn over the launch scene, opaque, so the scene under it
 * is not drawn (main.ts `sceneCovered`); a flight left running in the Launch
 * section carries on underneath. The logic is DOM-free in src/design/:
 * exploded.ts and stack-drawing.ts for the drawing, part-card.ts for the
 * cards, stage-table.ts over budget.ts for the figures, build-tour.ts for the
 * tour, vehicle-picker.ts for the list of rockets.
 */
import { t } from '../../i18n';
import type { VehicleSpec } from '../../types';
import { VEHICLES, vehicleById } from '../../data/vehicles';
import { route, type AppLevel, type AppRoute } from '../app-mode';
import { BUILD_BUILT_ITEMS, BUILD_LEVEL_ITEMS, SECTION_PLANS } from '../section-plan';
import { stageName } from '../names';
import { BUILD_TOUR, tourFigures, type TourFigure, type TourStat } from '../../design/build-tour';
import type { DrawnPart } from '../../design/exploded';
import { partCard } from '../../design/part-card';
import { stageTable, throttledCore, watchPayload } from '../../design/stage-table';
import { pickerEntries } from '../../design/vehicle-picker';
import { button, el, num } from '../orbit/dom';
import { StackSvg, type StackLabel } from './stack-svg';
import { VehiclePicker } from './vehicle-picker';
import { figuresView, mass } from './figures';
import { partCardView } from './part-card';
import './build.css';

export interface BuildScreenHost {
  go(route: AppRoute): void;
}

type BuildView = 'exploded' | 'assembled';
const VIEWS: readonly BuildView[] = ['exploded', 'assembled'];
const VIEW_KEY: Record<BuildView, string> = { exploded: 'build.view.exploded', assembled: 'build.view.assembled' };
const LEVEL_GLYPH: Record<AppLevel, string> = { watch: '▷', explore: '◎', engineer: '⌬' };
/** how long the parts take to move apart or together, ms */
const EXPLODE_MS = 450;

const STAT_KEY: Record<TourStat, string> = {
  stages: 'build.stat.stages',
  height: 'build.stat.height',
  liftoffMass: 'build.stat.liftoffMass',
  stagedDv: 'build.stat.stagedDv',
  carriedDv: 'build.stat.carriedDv',
  liftoffTW: 'build.stat.liftoffTW',
  coreTW: 'build.stat.coreTW',
  parallelDv: 'build.stat.parallelDv',
  upperTW: 'build.stat.upperTW',
  fairingMass: 'build.stat.fairingMass',
  fairingLength: 'build.stat.fairingLength',
  fairingJettison: 'build.stat.fairingJettison',
};

const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = (): boolean => typeof matchMedia === 'function' && matchMedia('(max-width: 860px)').matches;

/** A tour figure in the interface language. */
function figureText(f: TourFigure): string {
  switch (f.stat) {
    case 'stages': return num(f.value);
    case 'height': case 'fairingLength': return `${num(f.value, f.value % 1 ? 1 : 0)} ${t('u.m')}`;
    case 'liftoffMass': case 'fairingMass': return mass(f.value);
    case 'stagedDv': case 'carriedDv': case 'parallelDv': return `${num(f.value)} ${t('u.ms')}`;
    case 'fairingJettison': return t('build.card.sepTimeValue', { t: num(f.value) });
    default: return num(f.value, 2);
  }
}

/** "9 × Merlin 1D", or the name alone for one engine. */
const engineLine = (e: { count: number; name: string }): string => (e.count > 1 ? `${e.count} × ${e.name}` : e.name);

export class BuildScreen {
  private level: AppLevel = 'watch';
  private visible = false;
  private spec: VehicleSpec;
  private view: BuildView = 'exploded';
  /** the drawing's state between standing (0) and apart (1), moving towards the view's */
  private explode = 1;
  private anim = 0;
  private selected: string | null = null;
  private highlight: ReadonlySet<string> | null = null;
  private tourIndex = 0;
  private readonly picker: VehiclePicker;
  private readonly stack: StackSvg;
  private readonly ro: ResizeObserver | null;
  private resizeQueued = 0;

  // the parts of the page
  private readonly grid = el('div', 'bs-grid');
  private readonly intro = el('header', 'bs-panel bs-intro');
  private readonly tour = el('section', 'bs-panel bs-tour');
  private readonly stage = el('div', 'bs-stage');
  private readonly tabs = el('div', 'bs-tabs');
  private readonly draw = el('div', 'bs-draw');
  private readonly hint = el('p', 'bs-hint');
  private readonly card = el('aside', 'bs-panel bs-card');
  private readonly figures = el('section', 'bs-panel bs-figures');
  private readonly soon = el('div', 'bs-soon');

  constructor(private readonly root: HTMLElement, private readonly host: BuildScreenHost) {
    root.classList.add('build-screen');
    this.spec = vehicleById(BUILD_TOUR[0].vehicle);
    this.picker = new VehiclePicker(pickerEntries(VEHICLES), (id) => this.pickVehicle(id));
    this.stack = new StackSvg((ref) => this.select(ref));
    this.tabs.setAttribute('role', 'group');
    this.draw.append(this.stack.root);
    this.stage.append(this.tabs, this.draw, this.hint);
    this.card.setAttribute('aria-live', 'polite');
    this.tour.setAttribute('aria-live', 'polite');
    this.grid.append(this.intro, this.stage, this.card, this.tour, this.figures);
    root.replaceChildren(this.grid, this.soon);
    // The launch scene's camera takes every press on the viewport and captures
    // the pointer to drag with it (src/render/cameras.ts), which would steal the
    // click from a part of the drawing. The scene is covered here; keep the press.
    root.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.applyTourStep();
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.queueDrawing()) : null;
    this.ro?.observe(this.draw);
  }

  /** Show the section at a level. */
  show(level: AppLevel): void {
    const entering = !this.visible || level !== this.level;
    this.level = level;
    this.visible = true;
    if (entering) {
      this.render();
      this.root.scrollTop = 0;
    }
  }

  /** Off screen: nothing moves. */
  hide(): void {
    this.visible = false;
    if (this.anim) cancelAnimationFrame(this.anim);
    this.anim = 0;
    this.explode = this.view === 'exploded' ? 1 : 0;
  }

  applyLanguage(): void {
    this.picker.render();
    this.render();
  }

  /** The section's keys, from the app's handler: Escape closes the part card. */
  onKey(e: KeyboardEvent): void {
    if (this.level !== 'watch' || e.key !== 'Escape' || !this.selected) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('dialog')) return;
    this.select(null);
  }

  // ─── the model ────────────────────────────────────────────────────────────

  private pickVehicle(id: string): void {
    if (id === this.spec.id) return;
    this.spec = vehicleById(id);
    this.selected = null;
    this.highlight = null;
    this.renderWatch();
  }

  private select(ref: string | null): void {
    const fromLabel = !!ref && (document.activeElement as Element | null)?.closest?.('.bs-label') !== null;
    this.selected = ref;
    this.renderDrawing();
    this.renderCard();
    if (ref && fromLabel) this.stack.focusLabel(ref);
    if (ref) this.showCard();
  }

  /**
   * Bring the card into sight: on a phone it is under the drawing; on a wider
   * screen the drawing stays in sight while the page scrolls, so a part can
   * be picked with the page scrolled down to the figures, the card above.
   */
  private showCard(): void {
    const behavior: ScrollBehavior = reducedMotion() ? 'auto' : 'smooth';
    if (narrow()) { this.card.scrollIntoView({ block: 'nearest', behavior }); return; }
    const top = this.card.getBoundingClientRect().top, view = this.root.getBoundingClientRect();
    if (top < view.top || top > view.bottom - 60) this.card.scrollIntoView({ block: 'start', behavior });
  }

  private setView(view: BuildView): void {
    this.view = view;
    this.renderTabs();
    const target = view === 'exploded' ? 1 : 0;
    if (this.anim) cancelAnimationFrame(this.anim);
    this.anim = 0;
    if (!this.visible || reducedMotion()) {
      this.explode = target;
      this.renderDrawing();
      return;
    }
    const from = this.explode, t0 = performance.now();
    const frame = (now: number): void => {
      const s = Math.min(1, (now - t0) / EXPLODE_MS);
      const ease = s < 0.5 ? 2 * s * s : 1 - (-2 * s + 2) ** 2 / 2;
      this.explode = from + (target - from) * ease;
      this.renderDrawing();
      this.anim = s < 1 ? requestAnimationFrame(frame) : 0;
    };
    this.anim = requestAnimationFrame(frame);
  }

  private applyTourStep(): void {
    const step = BUILD_TOUR[this.tourIndex];
    this.spec = vehicleById(step.vehicle);
    this.picker.set(step.vehicle);
    this.highlight = step.highlight.length ? new Set(step.highlight) : null;
    this.selected = step.select;
    this.view = step.view;
    this.explode = step.view === 'exploded' ? 1 : 0;
  }

  private stepTour(by: number): void {
    const next = Math.max(0, Math.min(BUILD_TOUR.length - 1, this.tourIndex + by));
    if (next === this.tourIndex) return;
    this.tourIndex = next;
    this.goToStep();
  }

  /** Put the tour's step on screen; the parts move to its view from the one showing. */
  private goToStep(): void {
    const view = this.view;
    this.applyTourStep();
    const target = this.view;
    this.view = view;
    this.explode = view === 'exploded' ? 1 : 0;
    this.renderWatch();
    if (target !== view) this.setView(target);
  }

  // ─── the page ─────────────────────────────────────────────────────────────

  private render(): void {
    this.root.dataset.level = this.level;
    this.root.setAttribute('aria-label', t('section.build'));
    const watch = this.level === 'watch';
    this.grid.hidden = !watch;
    this.soon.hidden = watch;
    if (watch) this.renderWatch();
    else this.renderSoon();
  }

  private renderWatch(): void {
    if (this.level !== 'watch') return;
    this.picker.set(this.spec.id);
    this.renderIntro();
    this.renderTabs();
    this.renderDrawing();
    this.renderCard();
    this.renderFigures();
    this.renderTour();
  }

  private renderIntro(): void {
    const eyebrow = el('span', 'eyebrow bs-eyebrow', `${t('section.build')} · ${t('mode.watch')}`);
    const title = el('h1', 'bs-title', t('build.watch.title'));
    title.id = 'bs-title';
    this.root.setAttribute('aria-labelledby', title.id);
    const text = el('div', 'bs-intro-text');
    text.append(eyebrow, title, el('p', 'bs-lead', t('build.watch.lead')));
    this.intro.replaceChildren(text, this.picker.root);
  }

  private renderTabs(): void {
    this.tabs.setAttribute('aria-label', t('build.views'));
    this.tabs.replaceChildren(...VIEWS.map((v) => {
      const b = button('bs-tab', t(VIEW_KEY[v]), () => { if (v !== this.view) this.setView(v); });
      b.setAttribute('aria-pressed', String(v === this.view));
      return b;
    }));
    this.hint.textContent = t('build.hint');
  }

  /** Lay the drawing out again once the box has settled (a resize, the language's fonts). */
  private queueDrawing(): void {
    if (this.resizeQueued || !this.visible) return;
    this.resizeQueued = requestAnimationFrame(() => {
      this.resizeQueued = 0;
      this.renderDrawing();
    });
  }

  private label(p: DrawnPart): StackLabel {
    const spec = this.spec;
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
    if (!this.visible || this.level !== 'watch') return;
    const w = this.draw.clientWidth, h = this.draw.clientHeight;
    if (w < 10 || h < 10) return;
    this.stack.render({
      spec: this.spec,
      explode: this.explode,
      selected: this.selected,
      highlight: this.highlight,
      label: (p) => this.label(p),
      title: t('build.drawing.title', { name: this.spec.name }),
    }, w, h);
  }

  private renderCard(): void {
    const card = this.selected ? partCard(this.spec, this.selected) : null;
    if (!card) {
      this.card.replaceChildren(el('p', 'bs-card-empty', t('build.card.empty')));
      this.card.removeAttribute('aria-labelledby');
      return;
    }
    this.card.replaceChildren(partCardView(this.spec, card));
    this.card.setAttribute('aria-labelledby', 'bs-card-title');
  }

  private renderFigures(): void {
    const payload = watchPayload(this.spec);
    const table = stageTable(this.spec, payload);
    this.figures.replaceChildren(
      el('h2', 'bs-fig-title', t('build.fig.title')),
      el('p', 'bs-fig-note', t('build.fig.note', { payload: mass(payload) })),
      figuresView(this.spec, table),
      el('p', 'bs-fig-note small', t('build.fig.twNote')),
    );
    // a core that these full-throttle figures run dry with its strap-ons, while the flight throttles it down
    for (const row of table.rows) {
      const share = throttledCore(this.spec, row);
      if (share !== null) this.figures.append(el('p', 'bs-fig-note small', t('build.fig.throttledCore', { n: row.stageIndex + 1, p: num(share * 100) })));
    }
  }

  private renderTour(): void {
    const step = BUILD_TOUR[this.tourIndex];
    const box = this.tour;
    box.replaceChildren(
      el('span', 'eyebrow bs-tour-step', t('pg.tour.step', { n: this.tourIndex + 1, total: BUILD_TOUR.length })),
      el('h2', undefined, t(step.titleKey)),
      el('p', 'bs-tour-text', t(step.textKey)),
    );
    const stats = el('div', 'bs-tour-stats');
    for (const f of tourFigures(step)) {
      const s = el('div', 'bs-tour-stat');
      const label = el('small', undefined, t(STAT_KEY[f.stat]));
      if (f.estimate) label.append(' ', el('em', 'bs-est', t('build.stat.estimate')));
      s.append(label, el('strong', undefined, figureText(f)));
      stats.append(s);
    }
    box.append(stats);
    if (this.spec.id !== step.vehicle) {
      const about = el('p', 'bs-tour-about', t('build.tour.about', { name: vehicleById(step.vehicle).name }));
      about.append(' ', button('watch-btn link', t('build.tour.show'), () => this.goToStep()));
      box.append(about);
    }
    const nav = el('div', 'bs-tour-nav');
    const prev = button('watch-btn', `‹ ${t('pg.tour.prev')}`, () => this.stepTour(-1));
    prev.disabled = this.tourIndex === 0;
    const next = button('watch-btn primary', `${t('pg.tour.next')} ›`, () => this.stepTour(1));
    next.disabled = this.tourIndex >= BUILD_TOUR.length - 1;
    nav.append(prev, next);
    box.append(nav);
  }

  /** Explore and Engineer, while they are being built: what is coming to the level, by roadmap item. */
  private renderSoon(): void {
    const level = this.level as Exclude<AppLevel, 'watch'>;
    const plan = SECTION_PLANS.build;
    const inner = el('div', 'section-inner');
    const eyebrow = el('span', 'eyebrow section-eyebrow', `${t('section.build')} · ${t(`mode.${level}`)}`);
    eyebrow.append(el('span', 'section-badge', t('section.inDevelopment')));
    const title = el('h1', 'section-title', t(plan.titleKey));
    title.id = 'bs-soon-title';
    this.root.setAttribute('aria-labelledby', title.id);
    inner.append(eyebrow, title, el('p', 'section-lead', t(plan.leadKey)));
    const card = el('div', 'section-level');
    const head = el('strong');
    const glyph = el('span', 'mode-glyph', LEVEL_GLYPH[level]);
    glyph.setAttribute('aria-hidden', 'true');
    head.append(glyph, ` ${t(`mode.${level}`)}`);
    card.append(head, el('span', 'section-level-text', t(plan.levels[level])));
    inner.append(card);

    const actions = el('div', 'section-actions');
    actions.append(
      button('watch-btn primary', t('build.soon.toWatch'), () => this.host.go(route('build', 'watch'))),
      button('watch-btn', t('section.toLaunch'), () => this.host.go(route('launch', level))),
    );
    inner.append(actions);

    const wanted = new Set(BUILD_LEVEL_ITEMS[level]);
    inner.append(el('h2', 'section-coming', t('section.coming')));
    for (const phase of plan.phases) {
      const items = phase.items.filter((i) => wanted.has(i.id) && !BUILD_BUILT_ITEMS.has(i.id));
      if (!items.length) continue;
      const block = el('section', 'section-phase');
      block.append(el('h3', undefined, t('section.phase', { n: phase.phase, title: t(phase.titleKey) })));
      const list = el('ul', 'section-items');
      for (const item of items) {
        const li = el('li');
        li.append(el('code', 'section-item-id', item.id), el('span', undefined, t(item.key)));
        list.append(li);
      }
      block.append(list);
      inner.append(block);
    }
    const done = plan.phases.flatMap((p) => p.items).filter((i) => BUILD_BUILT_ITEMS.has(i.id));
    if (done.length) {
      inner.append(el('h2', 'section-coming', t('build.soon.done')));
      const list = el('ul', 'section-items');
      for (const item of done) {
        const li = el('li', 'done');
        li.append(el('code', 'section-item-id', item.id), el('span', undefined, t(item.key)));
        list.append(li);
      }
      inner.append(list);
    }
    inner.append(el('p', 'section-note', t('section.roadmapNote')));
    this.soon.replaceChildren(inner);
  }
}
