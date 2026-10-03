import { workspaceStorage } from '../workspace/storage';
/**
 * The landing page: the first thing a visitor sees, and the way into
 * everything else.
 *
 * It is a page over the live scene, read by scrolling (the scene no longer
 * takes the wheel, src/render/cameras.ts). Its first screen is the featured
 * vehicle on its pad, one button that plays its launch and one that starts
 * the lessons. Below it the program shows itself a screen at a time over a
 * starry sky — each of the app's faces, pictured as it really looks (the
 * pictures are the app's own screens in the page's language,
 * public/home/<id>.<lang>.webp, retaken with `npm run shots`) — and it ends
 * on the globe with the International Space Station where it is now, and
 * when it next comes over the visitor's city and can next be seen there with
 * the naked eye. src/ui/home-stage.ts is the scene behind it; nothing here
 * needs to be understood before pressing play.
 */
import { t, getLang } from '../i18n';
import { VEHICLES } from '../data/vehicles';
import { route, type AppLevel, type AppRoute } from './app-mode';
import { FEATURED_WATCH_MISSION, watchMissionById, type WatchMissionId } from './watch-missions';
import { STATIONS } from '../orbit/applications-setup';
import { STATION_KEY, compass } from './orbit/applications-panel';
import { PASS_DAYS, SHOWCASE_FACES, STATION_ZONES, featureOffset, showcaseBlend, whenFrom, type ShowcaseFace } from './home-logic';
import { reducedMotion, type HomeStage } from './home-stage';
import type { MissionSummary } from './workspace-mission';
import './home.css';

export interface HomeHost {
  /** play a launch in the viewer */
  watch(id: WatchMissionId): void;
  /** open a section at a level */
  go(route: AppRoute): void;
  /** E03: the lessons' catalogue */
  openLessons(): void;
  /** audit 2026-09-27 A1: the mission the workspace last held, as the page stored it, or null */
  lastMission(): MissionSummary | null;
  /** A1: open the launch workspace, at the level last used, on that mission */
  continueMission(): void;
}

/** A chapter of the page: one face of the app, its picture beside it (in SHOWCASE_FACES' order). */
interface Feature { id: ShowcaseFace; who?: string; title: string; text: string; cta: string }
const FEATURE: Record<ShowcaseFace, Omit<Feature, 'id'>> = {
  watch: { who: 'home.for.watch', title: 'home.feature.watchTitle', text: 'home.card.watchText', cta: 'home.play' },
  explore: { who: 'home.for.explore', title: 'home.feature.exploreTitle', text: 'home.card.exploreText', cta: 'home.card.explore' },
  engineer: { who: 'home.for.engineer', title: 'home.feature.engineerTitle', text: 'home.card.engineerText', cta: 'home.feature.engineerGo' },
  lessons: { title: 'home.feature.lessonsTitle', text: 'lesson.home.text', cta: 'home.hero.lessons' },
  orbit: { title: 'home.feature.orbitTitle', text: 'home.section.orbitText', cta: 'home.section.orbitOpen' },
};
const FEATURES: readonly Feature[] = SHOWCASE_FACES.map((id) => ({ id, ...FEATURE[id] }));

/** The city the passes are worked out for, as last picked in this browser */
const CITY_STORAGE_KEY = 'orbitlab.homeCity';
const DEG = 180 / Math.PI;

/** A sky of stars, drawn once as an SVG tile (a fixed seed: the same sky on every visit). */
function starTile(): string {
  let seed = 11;
  const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let dots = '';
  for (let k = 0; k < 90; k++) {
    const r = rnd() < 0.08 ? 1.3 : rnd() < 0.3 ? 0.9 : 0.6;
    dots += `<circle cx="${(rnd() * 600).toFixed(1)}" cy="${(rnd() * 600).toFixed(1)}" r="${r}" fill="#fff" fill-opacity="${(0.25 + rnd() * 0.6).toFixed(2)}"/>`;
  }
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'>${dots}</svg>`)}")`;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function num(value: number): string {
  try { return value.toLocaleString(getLang(), { maximumFractionDigits: 0 }); } catch { return value.toFixed(0); }
}

export class HomeScreen {
  private scroller: HTMLElement | null = null;
  /** the starry sky between the first screen and the globe, under the page and over the scene */
  private sky: HTMLElement | null = null;
  /** the station's two lines in the last chapter */
  private nextLine: HTMLElement | null = null;
  private seenLine: HTMLElement | null = null;

  constructor(private root: HTMLElement, private host: HomeHost, private stage: HomeStage) {
    this.root.classList.add('home-screen');
    try {
      const city = workspaceStorage().getItem(CITY_STORAGE_KEY);
      if (city && STATIONS.some((s) => s.id === city)) this.stage.city = city;
    } catch { /* the guess from the time zone stands */ }
    this.render();
    window.addEventListener('resize', () => this.measure());
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
    const kept = this.scroller?.scrollTop ?? 0;
    const scroller = el('div', 'home-scroll');
    scroller.append(this.hero(), ...FEATURES.map((f, k) => this.feature(f, k)), this.station());
    scroller.addEventListener('scroll', () => this.measure(), { passive: true });
    this.scroller = scroller;
    const overlay = el('div', 'home-overlay');
    overlay.setAttribute('aria-hidden', 'true');
    const labels = el('div', 'home-sat-labels');
    overlay.append(labels);
    this.stage.setLabelHost(labels, t('home.iss.name'));
    this.sky = el('div', 'home-sky');
    this.sky.setAttribute('aria-hidden', 'true');
    this.sky.style.setProperty('--stars', starTile());
    // the station's name under the page, so on a narrow screen the last chapter's card goes over it
    this.root.replaceChildren(this.sky, overlay, scroller);
    this.root.setAttribute('aria-labelledby', 'home-title');
    scroller.scrollTop = kept;
    this.measure();
    this.paintStation();
    if (hadFocus) this.root.querySelector<HTMLElement>(`[data-home-focus="${hadFocus}"]`)?.focus({ preventScroll: true });
  }

  private button(cls: string, label: string, focus: string, go: () => void): HTMLButtonElement {
    const b = el('button', cls, label);
    b.type = 'button';
    b.dataset.homeFocus = focus;
    b.addEventListener('click', go);
    return b;
  }

  // ─── the first screen ────────────────────────────────────────────────────

  private hero(): HTMLElement {
    const hero = el('header', 'home-hero');
    const inner = el('div', 'home-hero-inner');
    const title = el('h1', 'home-title', t('home.title'));
    title.id = 'home-title';
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
    play.addEventListener('click', () => this.host.watch(FEATURED_WATCH_MISSION));
    const actions = el('div', 'home-actions');
    actions.append(play, this.button('home-secondary', t('home.hero.lessons'), 'lessons', () => this.host.openLessons()));
    inner.append(el('span', 'eyebrow home-eyebrow', t('home.eyebrow')), title, el('p', 'home-lead', t('home.lead')), actions);
    const resume = this.resumeCard();
    if (resume) inner.append(resume);
    // "more below", which also takes you there
    const cue = el('button', 'home-cue');
    cue.type = 'button';
    cue.dataset.homeFocus = 'cue';
    const arrow = el('span', 'home-cue-arrow', '↓');
    arrow.setAttribute('aria-hidden', 'true');
    cue.append(el('span', undefined, t('home.cue')), arrow);
    cue.addEventListener('click', () => {
      const next = hero.nextElementSibling as HTMLElement | null;
      if (next && this.scroller) this.scroller.scrollTo({ top: next.offsetTop, behavior: reducedMotion() ? 'auto' : 'smooth' });
    });
    hero.append(inner, cue);
    return hero;
  }

  /**
   * Audit 2026-09-27 A1: the mission the workspace last held, to go back to —
   * the page opens on the featured launch, and the user's own is one press away.
   */
  private resumeCard(): HTMLElement | null {
    const last = this.host.lastMission();
    if (!last) return null;
    const vehicle = last.vehicleName ?? VEHICLES.find((v) => v.id === last.vehicleId)?.name ?? last.vehicleId;
    const button = el('button', 'home-resume');
    button.type = 'button';
    button.dataset.homeFocus = 'resume';
    const icon = el('span', 'home-resume-icon', '↻');
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon, el('strong', undefined, t('home.resume.title')), el('span', 'home-resume-text', t('home.resume.text', {
      vehicle, payload: num(last.payloadKg), pe: num(last.perigeeKm), ap: num(last.apogeeKm),
    })));
    button.addEventListener('click', () => this.host.continueMission());
    return button;
  }

  // ─── the program, a face at a time ───────────────────────────────────────

  private feature(f: Feature, k: number): HTMLElement {
    const section = el('section', `home-feature${k % 2 ? ' flip' : ''}`);
    section.dataset.feature = f.id;
    const card = el('div', 'home-feature-text');
    if (f.who) card.append(el('span', 'mode-card-who', t(f.who)));
    card.append(el('h2', 'home-feature-title', t(f.title)), el('p', 'home-block-lead', t(f.text)),
      this.button('home-section-link primary', t(f.cta), `feature-${f.id}`, () => this.featureGo(f.id)));
    const frame = el('div', 'home-shot');
    const bar = el('div', 'home-shot-bar');
    bar.setAttribute('aria-hidden', 'true');
    bar.append(el('i'), el('i'), el('i'));
    const img = el('img');
    // the screen in the language the page is in
    img.src = new URL(`home/${f.id}.${getLang()}.webp`, document.baseURI).href;
    img.alt = t(f.title);
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 1280;
    img.height = 800;
    // offline, a picture never seen online is not in the cache: the frame stays, empty, rather than a broken image
    img.addEventListener('error', () => img.classList.add('missing'), { once: true });
    frame.append(bar, img);
    section.append(card, frame);
    return section;
  }

  private featureGo(id: Feature['id']): void {
    if (id === 'watch') this.host.watch(FEATURED_WATCH_MISSION);
    else if (id === 'lessons') this.host.openLessons();
    else if (id === 'orbit') this.host.go(route('orbit', 'explore'));
    else this.host.go(route('launch', id as AppLevel));
  }

  // ─── the end: the space station ──────────────────────────────────────────

  private station(): HTMLElement {
    const end = el('section', 'home-end');
    const card = el('div', 'home-end-card');
    const passes = el('div', 'home-iss');
    const head = el('div', 'home-iss-head');
    const select = el('select', 'home-iss-city');
    select.dataset.homeFocus = 'city';
    select.setAttribute('aria-label', t('home.iss.city'));
    for (const s of STATIONS) {
      const o = el('option', undefined, t(STATION_KEY[s.id]));
      o.value = s.id;
      o.selected = s.id === this.stage.city;
      select.append(o);
    }
    select.addEventListener('change', () => {
      this.stage.setCity(select.value);
      try { workspaceStorage().setItem(CITY_STORAGE_KEY, select.value); } catch { /* lasts the tab */ }
      this.paintStation();
    });
    head.append(el('span', 'home-iss-over', t('home.iss.city')), select);
    const row = (label: string, cls: string): HTMLElement => {
      const r = el('p', `home-iss-row ${cls}`);
      const value = el('span', 'home-iss-value');
      r.append(el('span', 'home-iss-label', label), value);
      passes.append(r);
      return value;
    };
    passes.append(head);
    this.nextLine = row(t('home.iss.next'), 'next');
    this.seenLine = row(t('home.iss.seen'), 'seen');
    passes.append(el('p', 'home-iss-note', t('home.iss.note')));
    const actions = el('div', 'home-actions');
    actions.append(
      this.button('home-section-link primary', t('home.play'), 'end-watch', () => this.host.watch(FEATURED_WATCH_MISSION)),
      this.button('home-section-link', t('home.section.orbitOpen'), 'end-orbit', () => this.host.go(route('orbit', 'explore'))),
    );
    card.append(el('h2', 'home-block-title', t('home.iss.title')), el('p', 'home-block-lead', t('home.iss.text')), passes, actions);
    end.append(card);
    return end;
  }

  /** The two lines about the station's passes, once they are worked out. */
  private paintStation(): void {
    const next = this.nextLine, seen = this.seenLine;
    if (!next?.isConnected || !seen) return;
    const zone = STATION_ZONES[this.stage.city] ?? 'UTC';
    const now = 2440587.5 + Date.now() / 86400e3;
    const set = (node: HTMLElement, text: string): void => { if (node.textContent !== text) node.textContent = text; };
    if (!this.stage.worked) { set(next, t('home.iss.working')); set(seen, ''); return; }
    const p = this.stage.issNext;
    set(next, !p ? t('home.iss.none', { n: num(PASS_DAYS) }) : !p.rise || p.rise.jd <= now ? t('home.iss.upNow') : this.when(p.rise.jd, now, zone));
    const v = this.stage.issSeen;
    if (!v) { set(seen, t('home.iss.none', { n: num(PASS_DAYS) })); return; }
    const when = v.from.jd <= now ? t('home.iss.upNow') : this.when(v.from.jd, now, zone);
    set(seen, `${when} · ${t('home.iss.path', { from: compass(v.from.az), to: compass(v.to.az), el: num(v.top * DEG) })}`);
  }

  /** "in 12 min", "today at 19:42", "tomorrow at 05:10", "Tuesday at 19:42" — by the city's clock. */
  private when(jd: number, now: number, zone: string): string {
    const w = whenFrom(jd, now, zone);
    if (w.kind === 'minutes') return t('home.iss.inMin', { n: num(w.n) });
    const date = new Date((jd - 2440587.5) * 86400e3);
    const fmt = (opts: Intl.DateTimeFormatOptions): string => {
      try { return new Intl.DateTimeFormat(getLang(), { ...opts, timeZone: zone }).format(date); } catch { return ''; }
    };
    const time = fmt({ hour: '2-digit', minute: '2-digit' });
    if (w.kind === 'today') return t('home.iss.today', { time });
    if (w.kind === 'tomorrow') return t('home.iss.tomorrow', { time });
    return t('home.iss.onDay', { day: fmt({ weekday: 'long' }), time });
  }

  /**
   * How far each picture is from the middle of the window (it swings in and
   * settles as it gets there), how much of the scene the sky covers, and how
   * far into the globe the page is — read again at every scroll, and a few
   * times a second, as the page's height moves under it (the web fonts
   * arrive, the pictures load).
   */
  private measure(): void {
    const s = this.scroller;
    // not laid out (the page hidden): every chapter would stand at 0, and the globe look fully scrolled into
    if (!s || s.clientHeight === 0) return;
    const h = s.clientHeight, top = s.scrollTop;
    for (const f of s.querySelectorAll<HTMLElement>('.home-feature')) {
      const q = featureOffset(f.offsetTop, f.offsetHeight, top, h);
      f.style.setProperty('--q', q.toFixed(3));
      f.style.setProperty('--qa', Math.abs(q).toFixed(3));
    }
    const end = s.querySelector<HTMLElement>('.home-end');
    const max = Math.max(0, s.scrollHeight - h);
    const blend = showcaseBlend(top, h, end ? Math.min(end.offsetTop, max) : max);
    if (this.sky) this.sky.style.opacity = blend.sky.toFixed(3);
    this.stage.setScroll(blend.globe, blend.covered);
    this.root.classList.toggle('globe-on', blend.globe > 0.5);
  }

  /** A few times a second while the page is on screen. */
  tick(): void {
    this.measure();
    this.paintStation();
  }
}
