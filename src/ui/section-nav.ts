/**
 * The top bar's section switch (owner, 2026-10-01; the model is
 * src/ui/section-nav-model.ts).
 *
 * On a wide screen every section is a tab; the current one carries its level
 * as a badge, and pressing any tab opens the menu of that section's levels, so
 * a section and a level are picked together. On a phone the whole switch is
 * one button, the current section and level, that opens a list of every
 * section and its levels. Both are drawn and CSS shows one (src/ui/modes.css).
 * The levels are plain links to their route, so Back and opening in a new tab
 * work as before; a section still to come is a tab whose menu says what is
 * coming to it.
 *
 * The root carries the route it shows (`data-current-section`,
 * `data-current-level`), which is what the lessons page reads to mark the
 * current link again when it closes (src/ui/lessons/lesson-mode.ts).
 */
import { t } from '../i18n';
import { hashForRoute, route, type AppLevel, type AppRoute, type AppSection, APP_LEVELS } from './app-mode';
import { FUTURE_PLANS, LEVEL_GLYPHS, NAV_SECTIONS, levelDescKey, levelNameKey, type FutureSection, type NavEntry } from './section-nav-model';
import { el } from './orbit/dom';

/** What is open: a tab's menu (by section) or, on a phone, the list. */
type Open = NavEntry['id'] | 'sheet' | null;

export class SectionNav {
  private shown: AppRoute = { section: null, mode: 'home' };
  private open: Open = null;

  constructor(private readonly root: HTMLElement) {
    root.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const toggle = target.closest<HTMLButtonElement>('button[data-nav-toggle]');
      if (toggle) { this.toggle(toggle.dataset.navToggle as Open); return; }
      // a level link navigates by its href (the route change redraws the
      // switch); the menu only folds, since a link taken out of the page
      // would not navigate
      if (target.closest('a')) this.close(false);
    });
    document.addEventListener('pointerdown', (e) => { if (this.open && !root.contains(e.target as Node)) this.close(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.open) this.close(true); });
    root.addEventListener('focusout', (e) => {
      if (this.open && e.relatedTarget instanceof Node && !root.contains(e.relatedTarget)) this.close(false);
    });
  }

  /** Show a route, every menu folded. */
  show(current: AppRoute): void {
    this.shown = current;
    this.open = null;
    this.render();
  }

  /** Redraw in the current language. */
  applyLanguage(): void {
    this.render();
  }

  private toggle(which: Open): void {
    this.open = this.open === which ? null : which;
    this.fold();
  }

  private close(refocus: boolean): void {
    const was = this.open;
    if (!was) return;
    this.open = null;
    this.fold();
    if (refocus) this.root.querySelector<HTMLButtonElement>(`button[data-nav-toggle="${was}"]`)?.focus();
  }

  /** Open the one menu `open` names and fold the others, in place. */
  private fold(): void {
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>('button[data-nav-toggle]')) {
      const isOpen = btn.dataset.navToggle === this.open;
      btn.setAttribute('aria-expanded', String(isOpen));
      const panel = document.getElementById(btn.getAttribute('aria-controls') ?? '');
      if (panel) panel.hidden = !isOpen;
    }
  }

  private render(): void {
    const current = this.shown.section;
    this.root.setAttribute('aria-label', t('section.nav'));
    this.root.dataset.currentSection = current ?? 'home';
    this.root.dataset.currentLevel = current ? this.shown.mode : '';
    this.root.replaceChildren(this.tabs(), this.sheet());
  }

  /** Every route includes its purpose, visually and in the accessible description. */
  private levelLink(section: AppSection, level: AppLevel, cls: string): HTMLAnchorElement {
    const a = el('a', cls);
    a.href = hashForRoute(route(section, level));
    a.dataset.section = section;
    a.dataset.mode = level;
    const name = t(levelNameKey(section, level));
    // the section is in the name: the same level names repeat in every section
    a.setAttribute('aria-label', `${t(sectionKey(section))} · ${name}`);
    if (this.shown.section === section && this.shown.mode === level) a.setAttribute('aria-current', 'page');
    const glyph = el('span', 'mode-glyph', LEVEL_GLYPHS[level]);
    glyph.setAttribute('aria-hidden', 'true');
    const description = el('span', 'nav-level-desc', t(levelDescKey(section, level)));
    description.id = `${cls}-${section}-${level}-description`;
    a.setAttribute('aria-describedby', description.id);
    a.append(glyph, el('span', 'nav-level-name', name), description);
    return a;
  }

  private futureList(section: FutureSection): HTMLElement {
    const plan = FUTURE_PLANS[section];
    const box = el('div', 'nav-future');
    box.append(el('p', 'nav-future-tag', t('nav.future')), el('p', 'nav-menu-head', t('nav.future.phase', { n: plan.phase })));
    const list = el('ul', 'nav-future-items');
    for (const item of plan.items) list.append(el('li', undefined, `${item.id} · ${t(item.key)}`));
    box.append(list);
    return box;
  }

  /** The wide screen: a tab per section, each opening its menu. */
  private tabs(): HTMLElement {
    const row = el('div', 'nav-tabs');
    for (const s of NAV_SECTIONS) {
      const isCurrent = s.id === this.shown.section;
      const open = this.open === s.id;
      const tab = el('div', 'nav-tab');
      tab.dataset.section = s.id;
      if (isCurrent) tab.dataset.current = '';
      if (s.future) tab.dataset.future = '';
      const btn = el('button', 'nav-tab-btn');
      btn.type = 'button';
      btn.dataset.navToggle = s.id;
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-controls', `nav-menu-${s.id}`);
      if (isCurrent) btn.setAttribute('aria-current', 'page');
      const name = t(s.nameKey);
      const glyph = el('span', 'mode-glyph', s.glyph);
      glyph.setAttribute('aria-hidden', 'true');
      btn.append(glyph, el('span', 'nav-tab-name', name));
      if (isCurrent && !s.future) {
        const level = t(levelNameKey(s.id as AppSection, this.shown.mode as AppLevel));
        btn.append(el('span', 'nav-badge', level));
        btn.setAttribute('aria-label', `${name} · ${level}`);
      }
      if (s.future) {
        const dot = el('span', 'nav-future-dot');
        dot.setAttribute('aria-hidden', 'true');
        btn.append(dot);
        btn.setAttribute('aria-label', `${name} · ${t('nav.future')}`);
      }
      const chev = el('span', 'nav-chev', '▾');
      chev.setAttribute('aria-hidden', 'true');
      btn.append(chev);
      const menu = el('div', 'nav-menu');
      menu.id = `nav-menu-${s.id}`;
      menu.hidden = !open;
      if (s.future) menu.append(this.futureList(s.id as FutureSection));
      else {
        menu.append(el('p', 'nav-menu-head', t('nav.levelsOf', { section: name })));
        for (const l of APP_LEVELS) menu.append(this.levelLink(s.id as AppSection, l, 'nav-level'));
      }
      tab.append(btn, menu);
      row.append(tab);
    }
    return row;
  }

  /** The phone: one button, and a scrollable list grouped by section. */
  private sheet(): HTMLElement {
    const wrap = el('div', 'nav-sheet-wrap');
    const btn = el('button', 'nav-sheet-btn');
    btn.type = 'button';
    btn.dataset.navToggle = 'sheet';
    btn.setAttribute('aria-expanded', String(this.open === 'sheet'));
    btn.setAttribute('aria-controls', 'nav-sheet');
    const here = el('span', 'nav-sheet-here');
    const s = this.shown.section;
    if (s) {
      const entry = NAV_SECTIONS.find((n) => n.id === s)!;
      const glyph = el('span', 'mode-glyph', entry.glyph);
      glyph.setAttribute('aria-hidden', 'true');
      const level = t(levelNameKey(s, this.shown.mode as AppLevel));
      here.append(glyph, el('span', 'nav-tab-name', t(entry.nameKey)), el('span', 'nav-badge', level));
      btn.setAttribute('aria-label', t('nav.choose', { where: `${t(entry.nameKey)} · ${level}` }));
    } else {
      here.append(el('span', 'nav-tab-name', t('nav.pick')));
      btn.setAttribute('aria-label', t('nav.pick'));
    }
    const chev = el('span', 'nav-chev', '▾');
    chev.setAttribute('aria-hidden', 'true');
    btn.append(here, chev);
    const sheet = el('div', 'nav-sheet');
    sheet.id = 'nav-sheet';
    sheet.hidden = this.open !== 'sheet';
    for (const entry of NAV_SECTIONS) {
      const row = el('div', 'nav-sheet-row');
      if (entry.id === s) row.dataset.current = '';
      const heading = el('h3', 'nav-sheet-name', t(entry.nameKey));
      heading.id = `nav-sheet-${entry.id}`;
      row.setAttribute('role', 'group');
      row.setAttribute('aria-labelledby', heading.id);
      row.append(heading);
      if (entry.future) {
        const cell = el('span', 'nav-cell nav-cell-future');
        cell.append(el('span', 'nav-future-tag', t('nav.future')), el('span', 'nav-level-desc', t('nav.future.phase', { n: FUTURE_PLANS[entry.id as FutureSection].phase })));
        row.append(cell);
      } else {
        for (const l of APP_LEVELS) row.append(this.levelLink(entry.id as AppSection, l, 'nav-cell'));
      }
      sheet.append(row);
    }
    wrap.append(btn, sheet);
    return wrap;
  }
}

function sectionKey(section: AppSection): string {
  return NAV_SECTIONS.find((n) => n.id === section)!.nameKey;
}
