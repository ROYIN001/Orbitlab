/**
 * The landing page: one button that plays a launch, the user's last mission
 * to go back to, and the three parts of the program (roadmap S01) — Launch
 * and Orbit, each with its three ways in, and Build, which says plainly that
 * it is being built (audit 2026-09-27 A8: Orbit works, and says so).
 *
 * It is drawn over the live scene — the featured vehicle standing on its pad
 * behind the text — so the first thing a visitor sees is the thing they are
 * about to watch, not a form. Nothing here needs to be understood before
 * pressing play.
 */
import { getLang, t } from '../i18n';
import { VEHICLES } from '../data/vehicles';
import { route, type AppLevel, type AppRoute } from './app-mode';
import { FEATURED_WATCH_MISSION, watchMissionById } from './watch-missions';
import type { MissionSummary } from './workspace-mission';

export interface HomeHost {
  /** play the featured launch in the viewer */
  watchFeatured(): void;
  /** open a section at a level */
  go(route: AppRoute): void;
  /** A1: the mission the workspace last held, as the page stored it, or null */
  lastMission(): MissionSummary | null;
  /** A1: open the launch workspace, at the level last used, on that mission */
  continueMission(): void;
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

  /** The page is being shown: the last mission may have changed since it was drawn. */
  refresh(): void {
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
    const resume = this.resumeCard();
    if (resume) inner.append(resume);

    const sections = el('div', 'home-sections');
    sections.setAttribute('role', 'list');
    sections.append(this.launchCard(), this.orbitCard(), this.plannedCard());
    inner.append(el('p', 'home-more', t('home.more')), sections);
    this.root.replaceChildren(inner);
    if (hadFocus) this.root.querySelector<HTMLElement>(`[data-home-focus="${hadFocus}"]`)?.focus({ preventScroll: true });
  }

  private sectionHead(card: HTMLElement, icon: string, name: string, text: string, badge?: { text: string; ready: boolean }): void {
    const head = el('div', 'home-section-head');
    const glyph = el('span', 'mode-card-icon', icon);
    glyph.setAttribute('aria-hidden', 'true');
    const title = el('h2', undefined, name);
    head.append(glyph, title);
    if (badge) head.append(el('span', badge.ready ? 'section-badge ready' : 'section-badge', badge.text));
    card.append(head, el('p', 'home-section-text', text));
  }

  /** A section's three levels, each a way in. */
  private levelList(section: 'launch' | 'orbit', levels: LevelEntry[]): HTMLElement {
    const list = el('div', 'home-modes');
    for (const entry of levels) {
      const button = el('button', 'mode-card');
      button.type = 'button';
      button.dataset.mode = entry.level;
      button.dataset.homeFocus = `${section}-${entry.level}`;
      const icon = el('span', 'mode-card-icon', entry.icon);
      icon.setAttribute('aria-hidden', 'true');
      button.append(icon, el('strong', undefined, entry.title), el('span', 'mode-card-text', entry.text));
      button.addEventListener('click', () => this.host.go(route(section, entry.level)));
      list.append(button);
    }
    return list;
  }

  /**
   * A1: the mission the workspace last held, to go back to — the page opens
   * on the featured launch, and the user's own is one press away.
   */
  private resumeCard(): HTMLElement | null {
    const last = this.host.lastMission();
    if (!last) return null;
    const vehicle = last.vehicleName ?? VEHICLES.find((v) => v.id === last.vehicleId)?.name ?? last.vehicleId;
    const whole = (v: number) => Math.round(v).toLocaleString(getLang());
    const button = el('button', 'mode-card home-resume');
    button.type = 'button';
    button.dataset.homeFocus = 'resume';
    const icon = el('span', 'mode-card-icon', '↻');
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon, el('strong', undefined, t('home.resume.title')), el('span', 'mode-card-text', t('home.resume.text', {
      vehicle, payload: whole(last.payloadKg), pe: whole(last.perigeeKm), ap: whole(last.apogeeKm),
    })));
    button.addEventListener('click', () => this.host.continueMission());
    const box = el('div', 'home-modes home-resume-box');
    box.append(button);
    return box;
  }

  /** The launch simulator, which works today: its three levels, each a way in. */
  private launchCard(): HTMLElement {
    const card = el('section', 'home-section');
    card.setAttribute('role', 'listitem');
    card.dataset.section = 'launch';
    this.sectionHead(card, '▲', t('section.launch'), t('home.section.launchText'));
    card.append(this.levelList('launch', [
      { level: 'watch', icon: '▷', title: t('home.card.watch'), text: t('home.card.watchText') },
      { level: 'explore', icon: '◎', title: t('home.card.explore'), text: t('home.card.exploreText') },
      { level: 'engineer', icon: '⌬', title: t('home.card.engineer'), text: t('home.card.engineerText') },
    ]));
    return card;
  }

  /**
   * The Orbit section, usable since O01–O04, R01–R05 and M01–M03
   * (section-plan.ts's BUILT_ITEMS): the tour, the playground with the real
   * satellites, and the Engineer's planning tools (audit 2026-09-27 A8).
   */
  private orbitCard(): HTMLElement {
    const card = el('section', 'home-section');
    card.setAttribute('role', 'listitem');
    card.dataset.section = 'orbit';
    this.sectionHead(card, '⊕', t('section.orbit'), t('home.section.orbitText'), { text: t('section.ready'), ready: true });
    card.append(this.levelList('orbit', [
      { level: 'watch', icon: '▷', title: t('home.orbit.watch'), text: t('home.orbit.watchText') },
      { level: 'explore', icon: '◎', title: t('home.orbit.explore'), text: t('home.orbit.exploreText') },
      { level: 'engineer', icon: '⌬', title: t('home.orbit.engineer'), text: t('home.orbit.engineerText') },
    ]));
    return card;
  }

  /** The Build section, being built: what it will be, and its plan until its first item is built. */
  private plannedCard(): HTMLElement {
    const card = el('section', 'home-section planned');
    card.setAttribute('role', 'listitem');
    card.dataset.section = 'build';
    this.sectionHead(card, '⚙︎', t('section.build'), t('home.section.buildText'), { text: t('section.inDevelopment'), ready: false });
    const button = el('button', 'home-section-link', t('home.section.plan'));
    button.type = 'button';
    button.dataset.homeFocus = 'build';
    button.addEventListener('click', () => this.host.go(route('build', 'explore')));
    card.append(button);
    return card;
  }
}
