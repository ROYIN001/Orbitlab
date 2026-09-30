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
 * Its Explore level remixes a real rocket and builds one from parts (D02,
 * D03): a module of its own, src/ui/build/explore-level.ts, mounted here. Its
 * Engineer level (D03–D05) is a module of its own too,
 * src/ui/build/engineer-level.ts: the test stand, the wind tunnel and the
 * flight readiness review (D04), optimal staging and sizing (D05), with what
 * is still coming to it listed under them; a mission the review passes is
 * handed to the Launch section at the Engineer level, as "Fly it" hands the
 * Explore level's to Launch's Explore, and a sized launcher is opened in the
 * Explore level's parts builder.
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
import { ExploreLevel } from './explore-level';
import { EngineerLevel } from './engineer-level';
import { SatelliteWorkspace } from './satellite-workspace';
import { SatelliteLevel } from './satellite-level';
import { SatelliteBench } from './satellite-bench';
import type { MissionDocument } from '../../config/mission-file';
import type { OrbitHandoff } from '../../orbit/handoff';
import './build.css';

export interface BuildScreenHost {
  go(route: AppRoute): void;
  /** the Launch section's launch time, kept by a design handed to it (D02, D03: "Fly it") */
  launchTime?(): Date;
  /** hand a design to the Launch section as a mission document and open it at `level`; false when it could not take it */
  flyDesign?(doc: MissionDocument, level: AppLevel): boolean;
  /**
   * D06 (Phase 4 map §2.6 a): hand a designed satellite to the Orbit section
   * in its own orbit, with no launch, as the S03 hand-off
   * `handoffFromDesign` makes (src/design/satellite-handoff.ts), and open it
   * at `level`. The Explore level's satellite designer calls it ("Send to
   * Orbit").
   */
  toOrbit?(h: OrbitHandoff, level: AppLevel): void;
}

/** What the Explore and Engineer levels build: a rocket (Phase 3) or a satellite (D06). */
export type BuildCraft = 'rocket' | 'satellite';
const CRAFTS: readonly BuildCraft[] = ['rocket', 'satellite'];
const CRAFT_KEY: Record<BuildCraft, string> = { rocket: 'build.sat.switch.rocket', satellite: 'build.sat.switch.satellite' };
/** Where this browser keeps which one was on screen: a convenience only (a blocked storage starts on the rocket). */
const CRAFT_STORE = 'orbitlab.build.craft.v1';

type BuildView = 'exploded' | 'assembled';
const VIEWS: readonly BuildView[] = ['exploded', 'assembled'];
const VIEW_KEY: Record<BuildView, string> = { exploded: 'build.view.exploded', assembled: 'build.view.assembled' };
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
  /** the Explore level (D02, D03), made the first time it is shown */
  private explore: ExploreLevel | null = null;
  private readonly exploreRoot = el('div', 'bs-explore');
  /** the Engineer level (D03–D05), made the first time it is shown */
  private engineer: EngineerLevel | null = null;
  private readonly engineerRoot = el('div', 'bs-engineer');
  /** D06: rocket or satellite at the Explore and Engineer levels, the switch over each, and the satellite's two levels over one design */
  private craft: BuildCraft = 'rocket';
  private readonly exploreBar = el('div', 'bs-craft');
  private readonly engineerBar = el('div', 'bs-craft');
  private satWorkspace: SatelliteWorkspace | null = null;
  private satLevel: SatelliteLevel | null = null;
  private satBench: SatelliteBench | null = null;

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
    root.replaceChildren(this.grid, this.exploreRoot, this.engineerRoot);
    this.exploreRoot.append(this.exploreBar);
    this.engineerRoot.append(this.engineerBar);
    try { if (localStorage.getItem(CRAFT_STORE) === 'satellite') this.craft = 'satellite'; } catch { /* storage blocked: the rocket */ }
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
    this.explore?.hide();
    this.engineer?.hide();
    this.satLevel?.hide();
    this.satBench?.hide();
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
    this.selected = ref;
    // the drawing keeps the keyboard on the label it was on (StackSvg.render)
    this.renderDrawing();
    this.renderCard();
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
    const watch = this.level === 'watch', explore = this.level === 'explore';
    this.grid.hidden = !watch;
    this.exploreRoot.hidden = !explore;
    this.engineerRoot.hidden = watch || explore;
    const rocket = this.craft === 'rocket';
    if (!explore || !rocket) this.explore?.hide();
    if (watch || explore || !rocket) this.engineer?.hide();
    if (!explore || rocket) this.satLevel?.hide();
    if (watch || explore || rocket) this.satBench?.hide();
    if (this.explore) this.explore.root.hidden = !rocket;
    if (this.engineer) this.engineer.root.hidden = !rocket;
    if (this.satLevel) this.satLevel.root.hidden = rocket;
    if (this.satBench) this.satBench.root.hidden = rocket;
    if (watch) this.renderWatch();
    else {
      this.renderCraftBar(explore ? this.exploreBar : this.engineerBar);
      if (explore) {
        if (rocket) this.showExplore(); else this.showSatellite();
      } else if (rocket) this.showEngineer(); else this.showBench();
    }
  }

  // ─── rocket or satellite (D06) ────────────────────────────────────────────

  /** The switch over the Explore and Engineer levels: build a rocket or a satellite. */
  private renderCraftBar(bar: HTMLElement): void {
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', t('build.sat.switch'));
    bar.replaceChildren(el('span', 'bs-craft-label', t('build.sat.switch')), ...CRAFTS.map((c) => {
      const b = button('bx-mode bs-craft-btn', t(CRAFT_KEY[c]), () => this.setCraft(c));
      b.dataset.k = `craft:${c}`;
      b.setAttribute('aria-pressed', String(c === this.craft));
      return b;
    }));
  }

  private setCraft(c: BuildCraft): void {
    if (c === this.craft) return;
    this.craft = c;
    try { localStorage.setItem(CRAFT_STORE, c); } catch { /* storage blocked: kept for this visit */ }
    if (this.visible) {
      this.render();
      const bar = this.level === 'explore' ? this.exploreBar : this.engineerBar;
      bar.querySelector<HTMLElement>(`[data-k="craft:${c}"]`)?.focus();
    }
  }

  /** The one satellite both levels work on, made the first time either is wanted. */
  private workspace(): SatelliteWorkspace {
    this.satWorkspace ??= new SatelliteWorkspace(() => this.host.launchTime?.() ?? new Date());
    return this.satWorkspace;
  }

  /** The Explore level's satellite designer, made the first time it is wanted (shown, or handed a design). */
  private ensureSatellite(): SatelliteLevel {
    if (!this.satLevel) {
      this.satLevel = new SatelliteLevel(this.workspace(), {
        toOrbit: (h) => this.host.toOrbit?.(h, 'explore'),
        // a rocket imported in the satellite designer opens in the rocket designer
        openRocket: (record, message) => {
          this.setCraft('rocket');
          this.ensureExplore().openSaved(record, message);
          if (this.level !== 'explore') this.host.go(route('build', 'explore'));
        },
      });
      this.satLevel.root.hidden = this.craft !== 'satellite';
      this.exploreRoot.append(this.satLevel.root);
    }
    return this.satLevel;
  }

  private showSatellite(): void {
    const level = this.ensureSatellite();
    level.show();
    this.root.setAttribute('aria-labelledby', level.titleId);
  }

  /** The Engineer level's satellite bench (six tabs), made the first time it is shown. */
  private showBench(): void {
    if (!this.satBench) {
      this.satBench = new SatelliteBench(this.workspace(), {
        toExplore: () => { this.setCraft('satellite'); this.host.go(route('build', 'explore')); },
      });
      this.engineerRoot.append(this.satBench.root);
    }
    this.satBench.root.hidden = false;
    this.satBench.show();
    this.root.setAttribute('aria-labelledby', this.satBench.titleId);
  }

  /** The Engineer level: the test stand and the wind tunnel (src/ui/build/engineer-level.ts). */
  private showEngineer(): void {
    if (!this.engineer) {
      this.engineer = new EngineerLevel({
        go: (r) => this.host.go(r),
        exploreDesign: () => this.explore?.design() ?? null,
        rateExploreDesign: (spec) => this.explore?.adoptRatings(spec),
        launchTime: () => this.host.launchTime?.() ?? new Date(),
        fly: (doc) => this.host.flyDesign?.(doc, 'engineer') ?? false,
        openInExplore: (spec, payloadKg) => {
          this.ensureExplore().openDesign(spec, payloadKg);
          this.host.go(route('build', 'explore'));
        },
      });
      this.engineerRoot.append(this.engineer.root);
    }
    this.engineer.root.hidden = false;
    this.engineer.show();
    this.root.setAttribute('aria-labelledby', this.engineer.titleId);
  }

  /** The Explore level, made the first time it is wanted (shown, or handed a sized launcher). */
  private ensureExplore(): ExploreLevel {
    if (!this.explore) {
      this.explore = new ExploreLevel({
        launchTime: () => this.host.launchTime?.() ?? new Date(),
        fly: (doc) => this.host.flyDesign?.(doc, 'explore') ?? false,
        // D06: a satellite file imported in the rocket designer opens in the satellite designer
        openSatellite: (record, message) => {
          this.setCraft('satellite');
          this.ensureSatellite().open(record, message);
        },
      });
      this.explore.root.hidden = this.craft !== 'rocket';
      this.exploreRoot.append(this.explore.root);
    }
    return this.explore;
  }

  /** The Explore level: remix a real rocket, build one from parts (src/ui/build/explore-level.ts). */
  private showExplore(): void {
    this.explore = this.ensureExplore();
    this.explore.show();
    this.root.setAttribute('aria-labelledby', this.explore.titleId);
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
      // the second clause only where there is a fairing to count (not Saturn V, not Starship)
      el('p', 'bs-fig-note small', this.spec.fairing ? `${t('build.fig.twNote')} ${t('build.fig.twNoteFairing')}` : t('build.fig.twNote')),
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
}
