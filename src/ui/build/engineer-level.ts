/**
 * The Build section's Engineer level (roadmap D03–D05; docs/ROADMAP-PART2-3.md):
 * the test facilities a rocket goes through before it flies.
 *
 * Built so far, D04's first: the TEST STAND (a static fire,
 * src/ui/build/stand-panel.ts), a tab of one tab bar that the wind tunnel
 * and the flight readiness review (D04), optimal staging and sizing (D05)
 * will join. What is still
 * coming to the level is listed under the tabs, by roadmap item, as the
 * level's placeholder listed it.
 *
 * THE VEHICLE ON THE BENCH is one of the vehicles the Explore level works on,
 * not a list of its own: a catalogue rocket, the design open in the Explore
 * level (read again every time this level is shown, so an edit made there is
 * what is tested here), or a design saved in this browser
 * (src/design/design-store.ts). The first time the level opens after the
 * Explore level has been used, it starts on that design.
 *
 * Both facilities run the flights' own models on it — the stand the engine
 * model every launch flies, the tunnel the six-DOF flight's aerodynamics —
 * so this file and its panels only choose inputs and draw outputs; the
 * logic is DOM-free in src/design/test-stand.ts and src/design/tunnel-view.ts.
 */
import { t } from '../../i18n';
import type { VehicleSpec } from '../../types';
import { VEHICLES, vehicleById } from '../../data/vehicles';
import { route, type AppRoute } from '../app-mode';
import { BUILD_BUILT_ITEMS, BUILD_LEVEL_ITEMS, SECTION_PLANS } from '../section-plan';
import { LocalDesignStore, type DesignStore, type DesignSummary } from '../../design/design-store';
import { pickerEntries, type PickerEntry } from '../../design/vehicle-picker';
import { watchPayload } from '../../design/stage-table';
import { button, el } from '../orbit/dom';
import { VehiclePicker } from './vehicle-picker';
import { StandPanel } from './stand-panel';
import './engineer.css';

/** A design the Explore level has on screen. */
export interface ExploreDesign {
  spec: VehicleSpec;
  name: string;
  payloadKg: number;
}

export interface EngineerHost {
  go(route: AppRoute): void;
  /** the design open in the Explore level, as the vehicle it flies; null when there is none or it is refused */
  exploreDesign(): ExploreDesign | null;
}

/** The vehicle on the bench: its spec, the name it goes by, and the payload the tunnel weighs it with. */
export type BenchVehicle = ExploreDesign;

type EngineerTab = 'stand';
/** The level's facilities, in tab order: the wind tunnel and the readiness review (D04), D05's optimal staging and sizing join here. */
const TABS: readonly EngineerTab[] = ['stand'];
const TAB_KEY: Record<EngineerTab, string> = { stand: 'build.eng.tab.stand' };

const EXPLORE_ID = 'explore';
const SAVED = 'saved:';
const DEFAULT_ID = 'falcon9';

function catalogueBench(id: string): BenchVehicle {
  const spec = vehicleById(id);
  return { spec, name: spec.name, payloadKg: watchPayload(spec) };
}

export class EngineerLevel {
  readonly root = el('div', 'be-grid');
  /** The id of the level's title, for the section's accessible name. */
  readonly titleId = 'be-title';
  private visible = false;
  private tab: EngineerTab = 'stand';
  private bench: BenchVehicle = catalogueBench(DEFAULT_ID);
  private sourceId = DEFAULT_ID;
  /** the student has chosen a vehicle here (the level no longer follows the Explore level on its own) */
  private chosen = false;
  private saved: DesignSummary[] = [];
  private message: string | null = null;
  /** the latest vehicle load asked for; an older answer arriving late is dropped */
  private loadSeq = 0;

  private readonly head = el('header', 'bs-panel be-head');
  private readonly tabBar = el('div', 'be-tabs');
  private readonly panels = {} as Record<EngineerTab, HTMLElement>;
  private readonly coming = el('section', 'bs-panel be-coming');
  private readonly picker: VehiclePicker;
  private readonly stand = new StandPanel();

  constructor(private readonly host: EngineerHost, private readonly store: DesignStore = new LocalDesignStore()) {
    this.picker = new VehiclePicker(pickerEntries(VEHICLES), (id) => this.pick(id), 'be-picker-select');
    this.tabBar.setAttribute('role', 'tablist');
    this.tabBar.addEventListener('keydown', (e) => this.onTabKey(e));
    const body: Record<EngineerTab, HTMLElement> = { stand: this.stand.root };
    for (const k of TABS) {
      const panel = el('section', 'be-panel');
      panel.id = `be-panel-${k}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `be-tab-${k}`);
      panel.append(body[k]);
      this.panels[k] = panel;
    }
    this.coming.setAttribute('aria-labelledby', 'be-coming-title');
    this.root.append(this.head, this.tabBar, ...TABS.map((k) => this.panels[k]), this.coming);
    this.setBench(this.bench);
  }

  /** On screen, in the interface language: the vehicles on offer read again, everything drawn. */
  show(): void {
    this.visible = true;
    this.render();
    void this.refreshSources();
  }

  hide(): void {
    this.visible = false;
    this.stand.hide();
  }

  // ─── the vehicle on the bench ──────────────────────────────────────────────

  /** The Explore level's design and the saved designs, as picker entries; the vehicle on the bench follows its source. */
  private async refreshSources(): Promise<void> {
    try {
      this.saved = await this.store.list('vehicle');
    } catch {
      this.saved = [];
    }
    const explore = this.host.exploreDesign();
    this.setEntries(explore);
    if (!this.chosen && explore && this.sourceId !== EXPLORE_ID) {
      this.sourceId = EXPLORE_ID;
      this.setBench(explore);
    } else if (this.sourceId === EXPLORE_ID) {
      if (!explore) this.fallBack();
      else if (explore.spec !== this.bench.spec || explore.payloadKg !== this.bench.payloadKg) this.setBench(explore);
    } else if (this.sourceId.startsWith(SAVED) && !this.saved.some((d) => SAVED + d.id === this.sourceId)) this.fallBack();
    this.picker.set(this.sourceId);
    if (this.visible) this.renderHead();
  }

  private setEntries(explore: ExploreDesign | null): void {
    const designs: PickerEntry[] = [
      ...(explore ? [{ id: EXPLORE_ID, label: t('build.eng.src.explore', { name: explore.name }), group: 'design' as const }] : []),
      ...this.saved.map((d) => ({ id: SAVED + d.id, label: d.name, group: 'design' as const })),
    ];
    this.picker.setEntries([...pickerEntries(VEHICLES), ...designs]);
    this.picker.set(this.sourceId);
  }

  /** The source is gone (a refused Explore design, a deleted record): back to the default rocket, and say so. */
  private fallBack(): void {
    this.sourceId = DEFAULT_ID;
    this.setBench(catalogueBench(DEFAULT_ID));
    this.message = t('build.eng.src.gone', { name: this.bench.name });
  }

  private pick(id: string): void {
    this.chosen = true;
    this.message = null;
    const seq = ++this.loadSeq;
    if (id === EXPLORE_ID) {
      const d = this.host.exploreDesign();
      this.sourceId = id;
      if (d) this.setBench(d); else this.fallBack();
      this.afterPick();
      return;
    }
    if (id.startsWith(SAVED)) {
      this.sourceId = id;
      void this.store.get(id.slice(SAVED.length)).catch(() => null).then((rec) => {
        if (seq !== this.loadSeq) return;
        if (rec && rec.kind === 'vehicle') this.setBench({ spec: rec.design, name: rec.name, payloadKg: watchPayload(rec.design) });
        else this.fallBack();
        this.afterPick();
      });
      return;
    }
    if (!VEHICLES.some((v) => v.id === id)) return;
    this.sourceId = id;
    this.setBench(catalogueBench(id));
    this.afterPick();
  }

  private afterPick(): void {
    this.picker.set(this.sourceId);
    if (this.visible) this.renderHead();
  }

  private setBench(b: BenchVehicle): void {
    this.bench = b;
    this.stand.setVehicle(b.spec, b.name);
  }

  // ─── the page ─────────────────────────────────────────────────────────────

  private render(): void {
    this.picker.render();
    this.picker.set(this.sourceId);
    this.renderHead();
    this.renderTabs();
    this.renderComing();
    this.stand.render();
    this.showTab();
  }

  private renderHead(): void {
    const eyebrow = el('span', 'eyebrow bs-eyebrow', `${t('section.build')} · ${t('mode.engineer')}`);
    eyebrow.append(' ', el('span', 'section-badge', t('section.inDevelopment')));
    const title = el('h1', 'bs-title', t('build.eng.title'));
    title.id = this.titleId;
    const text = el('div', 'be-head-text');
    text.append(eyebrow, title, el('p', 'bs-lead', t('build.eng.lead')));
    const side = el('div', 'be-bench');
    side.append(this.picker.root);
    const note = el('p', 'be-bench-note', t('build.eng.src.note'));
    side.append(note);
    if (this.message) {
      const msg = el('p', 'be-bench-msg', this.message);
      msg.setAttribute('role', 'status');
      side.append(msg);
    }
    this.head.replaceChildren(text, side);
  }

  private renderTabs(): void {
    this.tabBar.setAttribute('aria-label', t('build.eng.tabs'));
    const active = document.activeElement;
    const hadFocus = active instanceof HTMLElement && this.tabBar.contains(active);
    this.tabBar.replaceChildren(...TABS.map((k) => {
      const b = button('be-tab', t(TAB_KEY[k]), () => this.setTab(k, false));
      b.id = `be-tab-${k}`;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', `be-panel-${k}`);
      b.setAttribute('aria-selected', String(k === this.tab));
      b.tabIndex = k === this.tab ? 0 : -1;
      return b;
    }));
    if (hadFocus) this.tabBar.querySelector<HTMLElement>(`#be-tab-${this.tab}`)?.focus();
  }

  /** The tab bar's keys (WAI-ARIA tabs): the arrows and Home/End move between the tabs and open the one they reach. */
  private onTabKey(e: KeyboardEvent): void {
    const i = TABS.indexOf(this.tab);
    const n = TABS.length;
    const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    this.setTab(TABS[next], true);
  }

  private setTab(k: EngineerTab, focus: boolean): void {
    if (k !== this.tab) {
      this.tab = k;
      this.renderTabs();
      this.showTab();
    }
    if (focus) this.tabBar.querySelector<HTMLElement>(`#be-tab-${k}`)?.focus();
  }

  private showTab(): void {
    for (const k of TABS) this.panels[k].hidden = k !== this.tab;
    if (!this.visible) return;
    this.stand.show();
  }

  /** What is still coming to the level, by roadmap item, and what the section has built (the level's placeholder, kept). */
  private renderComing(): void {
    const plan = SECTION_PLANS.build;
    const title = el('h2', 'section-coming', t('section.coming'));
    title.id = 'be-coming-title';
    const parts: HTMLElement[] = [title];
    const wanted = new Set(BUILD_LEVEL_ITEMS.engineer);
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
      parts.push(block);
    }
    const done = plan.phases.flatMap((p) => p.items).filter((i) => BUILD_BUILT_ITEMS.has(i.id));
    if (done.length) {
      parts.push(el('h2', 'section-coming', t('build.soon.done')));
      const list = el('ul', 'section-items');
      for (const item of done) {
        const li = el('li', 'done');
        li.append(el('code', 'section-item-id', item.id), el('span', undefined, t(item.key)));
        list.append(li);
      }
      parts.push(list);
    }
    parts.push(el('p', 'section-note', t('section.roadmapNote')));
    const actions = el('div', 'section-actions');
    actions.append(
      button('watch-btn', t('build.soon.toWatch'), () => this.host.go(route('build', 'watch'))),
      button('watch-btn', t('section.toLaunch'), () => this.host.go(route('launch', 'engineer'))),
    );
    parts.push(actions);
    this.coming.replaceChildren(...parts);
  }
}
