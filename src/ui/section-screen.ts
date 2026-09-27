/**
 * A section while it is being built (roadmap S01): an honest screen that
 * says what is coming, level by level and phase by phase,
 * from docs/ROADMAP-PART2-3.md (`src/ui/section-plan.ts`), and leads back to
 * the launch simulator, which is what works today. No control on it pretends
 * to do something it does not. Since O01 the Orbit section is its playground
 * (src/ui/orbit/playground.ts), which took the orbit handed on from a flight
 * (S03) with it; this screen is the Build section's.
 *
 * It is drawn over the live scene like the landing page, so a flight left
 * running in the launch section carries on underneath and is there on the
 * way back.
 */
import { t } from '../i18n';
import { APP_LEVELS, route, type AppLevel, type AppRoute } from './app-mode';
import { SECTION_PLANS, type PlannedSection } from './section-plan';

export interface SectionScreenHost {
  go(route: AppRoute): void;
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
