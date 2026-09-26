/**
 * The Orbit and Build sections while they are being built (roadmap S01): an
 * honest screen that says what is coming, level by level and phase by phase,
 * from docs/ROADMAP-PART2-3.md (`src/ui/section-plan.ts`), and leads back to
 * the launch simulator, which is what works today. No control on it pretends
 * to do something it does not.
 *
 * It is drawn over the live scene like the landing page, so a flight left
 * running in the launch section carries on underneath and is there on the
 * way back.
 */
import { t, getLang } from '../i18n';
import { APP_LEVELS, route, type AppLevel, type AppRoute } from './app-mode';
import { SECTION_PLANS, type PlannedSection } from './section-plan';
import { handoffElements, type OrbitHandoff } from '../orbit/handoff';
import { R_EARTH, RAD } from '../physics/constants';

export interface SectionScreenHost {
  go(route: AppRoute): void;
  /** S03: open the lifetime analysis (P07) on a handed-on orbit */
  lifetime(handoff: OrbitHandoff, opener: HTMLElement | null): void;
}

const LEVEL_GLYPH: Record<AppLevel, string> = { watch: '▷', explore: '◎', engineer: '⌬' };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class SectionScreen {
  private section: PlannedSection = 'orbit';
  private level: AppLevel = 'explore';
  /** S03: the orbit the launch section handed on, and why there is none when there is none */
  private handoff: OrbitHandoff | null = null;
  private handoffNote: string | null = null;

  constructor(private root: HTMLElement, private host: SectionScreenHost) {
    this.root.classList.add('section-screen');
  }

  /** Show a section at a level. */
  show(section: PlannedSection, level: AppLevel): void {
    const changed = section !== this.section;
    this.section = section;
    this.level = level;
    this.render();
    if (changed) this.root.scrollTop = 0;
  }

  applyLanguage(): void {
    this.render();
  }

  /** S03: the orbit handed on from a flight ("Continue in Orbit"), or none, with the reason. */
  setHandoff(handoff: OrbitHandoff | null, note: string | null = null): void {
    this.handoff = handoff;
    this.handoffNote = note;
    this.render();
  }

  /**
   * The received orbit, in the Orbit section: its elements, from the state
   * vector itself (src/physics/orbital.ts), and the one analysis that already
   * works on it, the orbit lifetime. Nothing else is offered: the playground
   * and the planner that will take it from here are Phase 1's.
   */
  private handoffView(): HTMLElement {
    const box = el('section', 'section-handoff');
    box.setAttribute('aria-labelledby', 'section-handoff-title');
    const title = el('h2', undefined, t('handoff.title'));
    title.id = 'section-handoff-title';
    box.append(el('span', 'eyebrow', t('handoff.eyebrow')), title);
    const h = this.handoff;
    if (!h) {
      box.append(el('p', 'section-handoff-empty', this.handoffNote ?? t('handoff.none')));
      return box;
    }
    box.append(el('p', 'section-handoff-label', h.label));
    const e = handoffElements(h);
    const n = (v: number, d: number) => v.toLocaleString(getLang(), { minimumFractionDigits: d, maximumFractionDigits: d });
    const rows: [string, string][] = [
      [t('handoff.a'), `${n(e.a / 1000, 1)} km`],
      [t('handoff.e'), n(e.e, 5)],
      [t('handoff.i'), `${n(e.i * RAD, 3)}°`],
      [t('handoff.raan'), `${n(e.raan * RAD, 3)}°`],
      [t('handoff.argp'), `${n(e.argp * RAD, 3)}°`],
      [t('handoff.apsides'), `${n(e.periapsisAlt / 1000, 1)} × ${n(e.apoapsisAlt / 1000, 1)} km`],
      [t('handoff.period'), `${n(e.period / 60, 2)} min`],
      [t('handoff.mass'), `${n(h.spacecraft.mass, 0)} kg`],
    ];
    if (h.spacecraft.propulsion) rows.push([t('handoff.propellant'), `${n(h.spacecraft.propulsion.propellantMass, 0)} kg`]);
    const dl = el('dl', 'section-handoff-elements');
    for (const [k, v] of rows) dl.append(el('dt', undefined, k), el('dd', undefined, v));
    box.append(dl);
    box.append(el('p', 'section-handoff-note', t('handoff.note', { r: n(R_EARTH / 1000, 1) })));
    const actions = el('div', 'section-actions');
    const life = el('button', 'watch-btn primary', t('life.button'));
    life.type = 'button';
    life.addEventListener('click', () => this.host.lifetime(h, life));
    actions.append(life);
    box.append(actions);
    return box;
  }

  private render(): void {
    const plan = SECTION_PLANS[this.section];
    const inner = el('div', 'section-inner');
    const title = el('h1', 'section-title', t(plan.titleKey));
    title.id = 'section-title';
    this.root.setAttribute('aria-labelledby', title.id);
    this.root.dataset.section = this.section;
    const badge = el('span', 'section-badge', t('section.inDevelopment'));
    const eyebrow = el('span', 'eyebrow section-eyebrow', t(plan.nameKey));
    eyebrow.append(badge);
    inner.append(eyebrow, title, el('p', 'section-lead', t(plan.leadKey)));

    // what each level will offer, the one chosen in the top bar first among equals
    const levels = el('div', 'section-levels');
    levels.setAttribute('role', 'list');
    for (const level of APP_LEVELS) {
      const card = el('div', 'section-level');
      card.setAttribute('role', 'listitem');
      if (level === this.level) card.setAttribute('aria-current', 'true');
      const head = el('strong');
      const glyph = el('span', 'mode-glyph', LEVEL_GLYPH[level]);
      glyph.setAttribute('aria-hidden', 'true');
      head.append(glyph, ` ${t(`mode.${level}`)}`);
      card.append(head, el('span', 'section-level-text', t(plan.levels[level])));
      levels.append(card);
    }
    inner.append(levels);
    if (this.section === 'orbit') inner.append(this.handoffView());

    inner.append(el('h2', 'section-coming', t('section.coming')));
    for (const phase of plan.phases) {
      const block = el('section', 'section-phase');
      block.append(el('h3', undefined, t('section.phase', { n: phase.phase, title: t(phase.titleKey) })));
      const list = el('ul', 'section-items');
      for (const item of phase.items) {
        const li = el('li');
        li.append(el('code', 'section-item-id', item.id), el('span', undefined, t(item.key)));
        list.append(li);
      }
      block.append(list);
      inner.append(block);
    }
    inner.append(el('p', 'section-note', t('section.roadmapNote')));

    const actions = el('div', 'section-actions');
    const launch = el('button', 'watch-btn primary', t('section.toLaunch'));
    launch.type = 'button';
    launch.addEventListener('click', () => this.host.go(route('launch', this.level)));
    actions.append(launch);
    inner.append(actions);
    this.root.replaceChildren(inner);
  }
}
