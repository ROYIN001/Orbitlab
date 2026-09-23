/**
 * The landing page: one button that plays a launch, and the three ways in.
 *
 * It is drawn over the live scene — the featured vehicle standing on its pad
 * behind the text — so the first thing a visitor sees is the thing they are
 * about to watch, not a form. Nothing here needs to be understood before
 * pressing play.
 */
import { t } from '../i18n';
import type { AppMode } from './app-mode';
import { FEATURED_WATCH_MISSION, watchMissionById } from './watch-missions';

export interface HomeHost {
  /** play the featured launch in the viewer */
  watchFeatured(): void;
  /** open a mode */
  go(mode: AppMode): void;
}

interface ModeCard { mode: AppMode; icon: string; title: string; text: string }

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

    const cards: ModeCard[] = [
      { mode: 'watch', icon: '▷', title: t('home.card.watch'), text: t('home.card.watchText') },
      { mode: 'explore', icon: '◎', title: t('home.card.explore'), text: t('home.card.exploreText') },
      { mode: 'engineer', icon: '⌬', title: t('home.card.engineer'), text: t('home.card.engineerText') },
    ];
    const list = el('div', 'home-modes');
    list.setAttribute('role', 'list');
    for (const card of cards) {
      const button = el('button', 'mode-card');
      button.type = 'button';
      button.setAttribute('role', 'listitem');
      button.dataset.mode = card.mode;
      button.dataset.homeFocus = card.mode;
      const icon = el('span', 'mode-card-icon', card.icon);
      icon.setAttribute('aria-hidden', 'true');
      button.append(icon, el('strong', undefined, card.title), el('span', 'mode-card-text', card.text));
      button.addEventListener('click', () => this.host.go(card.mode));
      list.append(button);
    }
    inner.append(el('p', 'home-more', t('home.more')), list);
    this.root.replaceChildren(inner);
    if (hadFocus) this.root.querySelector<HTMLElement>(`[data-home-focus="${hadFocus}"]`)?.focus({ preventScroll: true });
  }
}
