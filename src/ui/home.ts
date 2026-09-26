/**
 * The landing page: one button that plays a launch, and the three parts of
 * the program (roadmap S01) — Launch with its three ways in, and Orbit and
 * Build, which say plainly that they are being built.
 *
 * It is drawn over the live scene — the featured vehicle standing on its pad
 * behind the text — so the first thing a visitor sees is the thing they are
 * about to watch, not a form. Nothing here needs to be understood before
 * pressing play.
 */
import { t } from '../i18n';
import { route, type AppLevel, type AppRoute } from './app-mode';
import { FEATURED_WATCH_MISSION, watchMissionById } from './watch-missions';

export interface HomeHost {
  /** play the featured launch in the viewer */
  watchFeatured(): void;
  /** open a section at a level */
  go(route: AppRoute): void;
}

interface LevelEntry { level: AppLevel; icon: string; title: string; text: string }

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class HomeScreen {
  constructor(private root: HTMLElement, private host: HomeHost) {
    this.root.classList.add('home-screen');
    this.render();
  }

  applyLanguage(): void {
    this.render();
  }

  private render(): void {
    const hadFocus = this.root.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.homeFocus : undefined;
    const inner = el('div', 'home-inner');
    const title = el('h1', 'home-title', t('home.title'));
    title.id = 'home-title';
    this.root.setAttribute('aria-labelledby', title.id);
    inner.append(el('span', 'eyebrow home-eyebrow', t('home.eyebrow')), title, el('p', 'home-lead', t('home.lead')));

    const featured = watchMissionById(FEATURED_WATCH_MISSION);
    const play = el('button', 'home-play');
    play.type = 'button';
    play.dataset.homeFocus = 'play';
    const glyph = el('span', 'home-play-glyph', '▶');
    glyph.setAttribute('aria-hidden', 'true');
    const label = el('span', 'home-play-label');
    label.append(el('strong', undefined, t('home.play')));
    if (featured) label.append(el('small', undefined, t(featured.titleKey)));
    play.append(glyph, label);
    play.addEventListener('click', () => this.host.watchFeatured());
    inner.append(play);

    const sections = el('div', 'home-sections');
    sections.setAttribute('role', 'list');
    sections.append(this.launchCard(), this.plannedCard('orbit'), this.plannedCard('build'));
    inner.append(el('p', 'home-more', t('home.more')), sections);
    this.root.replaceChildren(inner);
    if (hadFocus) this.root.querySelector<HTMLElement>(`[data-home-focus="${hadFocus}"]`)?.focus({ preventScroll: true });
  }

  private sectionHead(card: HTMLElement, icon: string, name: string, text: string, badge?: string): void {
    const head = el('div', 'home-section-head');
    const glyph = el('span', 'mode-card-icon', icon);
    glyph.setAttribute('aria-hidden', 'true');
    const title = el('h2', undefined, name);
    head.append(glyph, title);
    if (badge) head.append(el('span', 'section-badge', badge));
    card.append(head, el('p', 'home-section-text', text));
  }

  /** The launch simulator, which works today: its three levels, each a way in. */
  private launchCard(): HTMLElement {
    const card = el('section', 'home-section');
    card.setAttribute('role', 'listitem');
    card.dataset.section = 'launch';
    this.sectionHead(card, '▲', t('section.launch'), t('home.section.launchText'));
    const levels: LevelEntry[] = [
      { level: 'watch', icon: '▷', title: t('home.card.watch'), text: t('home.card.watchText') },
      { level: 'explore', icon: '◎', title: t('home.card.explore'), text: t('home.card.exploreText') },
      { level: 'engineer', icon: '⌬', title: t('home.card.engineer'), text: t('home.card.engineerText') },
    ];
    const list = el('div', 'home-modes');
    for (const entry of levels) {
      const button = el('button', 'mode-card');
      button.type = 'button';
      button.dataset.mode = entry.level;
      button.dataset.homeFocus = `launch-${entry.level}`;
      const icon = el('span', 'mode-card-icon', entry.icon);
      icon.setAttribute('aria-hidden', 'true');
      button.append(icon, el('strong', undefined, entry.title), el('span', 'mode-card-text', entry.text));
      button.addEventListener('click', () => this.host.go(route('launch', entry.level)));
      list.append(button);
    }
    card.append(list);
    return card;
  }

  /**
   * A section being built: what it will be, and the way in — the Orbit
   * section's playground (O01) now, the Build section's plan until its first
   * item is built.
   */
  private plannedCard(section: 'orbit' | 'build'): HTMLElement {
    const card = el('section', 'home-section planned');
    card.setAttribute('role', 'listitem');
    card.dataset.section = section;
    const orbit = section === 'orbit';
    this.sectionHead(card, orbit ? '⊕' : '⚙︎', t(orbit ? 'section.orbit' : 'section.build'),
      t(orbit ? 'home.section.orbitText' : 'home.section.buildText'), t('section.inDevelopment'));
    const button = el('button', 'home-section-link', t(orbit ? 'home.section.orbitOpen' : 'home.section.plan'));
    button.type = 'button';
    button.dataset.homeFocus = section;
    button.addEventListener('click', () => this.host.go(route(section, 'explore')));
    card.append(button);
    return card;
  }
}
