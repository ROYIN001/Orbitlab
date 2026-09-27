/**
 * The landing page: one button that plays a launch, the ways into the
 * simulator, and the three parts of the program (roadmap S01) — Launch with
 * its three levels, and Orbit and Build, which say plainly that they are being
 * built.
 *
 * It is drawn over the live scene, and it is a page: its first screen is the
 * picture and the button, and everything else is below it, reached by
 * scrolling (the scene no longer takes the wheel, src/render/cameras.ts).
 *
 * PROTOTYPE: several backgrounds for the same page, switched from a bar at
 * the foot of it (or `?home=a`, `b`, `d`, `f`, `g`, `h`, `i`), to be compared
 * before one is kept — see src/ui/home-logic.ts for what each is, and
 * src/ui/home-stage.ts for the scene behind them. Nothing here needs to be
 * understood before pressing play.
 */
import { t, getLang } from '../i18n';
import { route, type AppLevel, type AppRoute } from './app-mode';
import { FEATURED_WATCH_MISSION, WATCH_MISSIONS, watchMissionById, type WatchMissionId } from './watch-missions';
import { BUILTIN_LESSONS } from '../lessons/catalog';
import { siteById } from '../data/sites';
import { vehicleById } from '../data/vehicles';
import { siteName } from './names';
import { fmtTime } from './hud';
import { groundSpeed } from './watch-logic';
import { STATIONS } from '../orbit/applications-setup';
import { STATION_KEY, compass } from './orbit/applications-panel';
import type { VisualFrame } from '../physics/frame';
import {
  HOLD_SECONDS, HOME_VARIANTS, HOME_VARIANT_PARAM, HOME_VARIANT_STORAGE_KEY, PAD_LIGHTS, STATION_ZONES, isJourney, parseVariant, timeAtScroll,
  type HomeVariant, type PadLight, type ScrollAnchor,
} from './home-logic';
import { H_MISSIONS, type HomeStage, type PassRow } from './home-stage';
import './home.css';

export interface HomeHost {
  /** play a launch in the viewer */
  watch(id: WatchMissionId): void;
  /** open a section at a level */
  go(route: AppRoute): void;
  /** E03: the lessons' catalogue */
  openLessons(): void;
  /** the name of the vehicle on screen */
  vehicleName(): string;
}

interface LevelEntry { level: AppLevel; icon: string; title: string; text: string; who: string }

/** B, F, I: a chapter of the page, and the moment of the featured launch (Soyuz to the station) it is read at. */
interface Chapter {
  t: number;
  tag?: string;
  title?: string;
  text?: string;
  body: 'hero' | 'modes' | 'facts' | 'lessons' | 'orbit' | 'build' | 'next' | 'end' | 'globe';
}

const CHAPTERS_B: readonly Chapter[] = [
  { t: -8, body: 'hero' },
  { t: 2, tag: 'home.b.liftoff', title: 'home.b.launchTitle', text: 'home.paths.lead', body: 'modes' },
  { t: 60, tag: 'home.b.maxq', title: 'home.b.physicsTitle', text: 'home.b.physicsText', body: 'facts' },
  { t: 122, tag: 'home.b.boosters', title: 'home.b.lessonsTitle', text: 'lesson.home.text', body: 'lessons' },
  { t: 160, tag: 'home.b.space', title: 'home.b.orbitTitle', text: 'home.section.orbitText', body: 'orbit' },
  { t: 296, tag: 'home.b.staging', title: 'home.b.buildTitle', text: 'home.section.buildText', body: 'build' },
  { t: 540, tag: 'home.b.orbit', title: 'home.b.endTitle', text: 'home.b.endText', body: 'end' },
];

/** F, I: B's flight, then the orbit reached shown among the real satellites, where the Orbit section begins */
const CHAPTERS_F: readonly Chapter[] = [
  { t: -8, body: 'hero' },
  { t: 2, tag: 'home.b.liftoff', title: 'home.b.launchTitle', text: 'home.paths.lead', body: 'modes' },
  { t: 60, tag: 'home.b.maxq', title: 'home.b.physicsTitle', text: 'home.b.physicsText', body: 'facts' },
  { t: 122, tag: 'home.b.boosters', title: 'home.b.lessonsTitle', text: 'lesson.home.text', body: 'lessons' },
  { t: 296, tag: 'home.b.staging', title: 'home.b.buildTitle', text: 'home.section.buildText', body: 'build' },
  { t: 540, tag: 'home.b.orbit', title: 'home.b.endTitle', text: 'home.f.orbitText', body: 'next' },
  { t: 540, tag: 'home.f.sky', title: 'home.f.globeTitle', text: 'home.f.globeText', body: 'globe' },
];

const LIGHT_KEYS: Record<PadLight, string> = { day: 'home.a.day', dusk: 'home.a.dusk', night: 'home.a.night' };
const PROTO_KEYS: Record<HomeVariant, string> = {
  a: 'home.proto.a', b: 'home.proto.b', d: 'home.proto.d', f: 'home.proto.f', g: 'home.proto.g', h: 'home.proto.h', i: 'home.proto.i',
};
const SECTION_KEYS = { launch: 'section.launch', orbit: 'section.orbit', build: 'section.build' } as const;
/** G: the place last picked, kept in this browser */
const CITY_STORAGE_KEY = 'orbitlab.homeCity';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function num(value: number, digits = 0): string {
  try {
    return value.toLocaleString(getLang(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
  } catch {
    return value.toFixed(digits);
  }
}

const clock = (sec: number): string => fmtTime(sec).replace('-', '−');
const DEG = 180 / Math.PI;

/** The prototype asked for by the address, else the one last picked here, else A. */
function initialVariant(): HomeVariant {
  const asked = parseVariant(new URLSearchParams(location.search).get(HOME_VARIANT_PARAM));
  if (asked) return asked;
  try { return parseVariant(localStorage.getItem(HOME_VARIANT_STORAGE_KEY)) ?? 'a'; } catch { return 'a'; }
}

/** The readouts over the picture, whichever the variant has. */
interface Readout {
  root: HTMLElement;
  name?: HTMLElement;
  clock?: HTMLElement;
  alt?: HTMLElement;
  speed?: HTMLElement;
  fill?: HTMLElement;
  note?: HTMLElement;
  /** G's card, H's card */
  rows?: HTMLElement;
  above?: HTMLElement;
  local?: HTMLElement;
  title?: HTMLElement;
  sub?: HTMLElement;
}

export class HomeScreen {
  variant: HomeVariant = initialVariant();
  private scroller: HTMLElement | null = null;
  private readout: Readout | null = null;
  /** G's card, when it is on the page */
  private gCard: Readout | null = null;
  private gShownAt = -1;
  /** I: the button being held since (performance.now), and the countdown over the picture */
  private holdFrom: number | null = null;
  private countdown: HTMLElement | null = null;
  private liftoffUntil = 0;

  constructor(private root: HTMLElement, private host: HomeHost, private stage: HomeStage) {
    this.root.classList.add('home-screen');
    try {
      const city = localStorage.getItem(CITY_STORAGE_KEY);
      if (city && STATIONS.some((s) => s.id === city)) this.stage.city = city;
    } catch { /* the guess from the time zone stands */ }
    this.stage.setVariant(this.variant);
    this.render();
    window.addEventListener('resize', () => this.measure());
  }

  applyLanguage(): void {
    this.render();
  }

  /** PROTOTYPE: show another of the backgrounds. */
  setVariant(v: HomeVariant): void {
    if (v === this.variant) return;
    this.variant = v;
    try { localStorage.setItem(HOME_VARIANT_STORAGE_KEY, v); } catch { /* the choice lasts the tab */ }
    const url = new URL(location.href);
    url.searchParams.set(HOME_VARIANT_PARAM, v);
    history.replaceState(history.state, '', url);
    this.stage.setVariant(v);
    this.render(true);
  }

  private render(top = false): void {
    const hadFocus = this.root.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.homeFocus : undefined;
    const kept = top ? 0 : this.scroller?.scrollTop ?? 0;
    const v = this.variant;
    this.root.dataset.variant = v;
    this.root.classList.remove('globe-on');
    const scroller = el('div', 'home-scroll');
    if (isJourney(v)) scroller.append(...this.chapters(v === 'b' ? CHAPTERS_B : CHAPTERS_F));
    else scroller.append(this.hero(), this.paths(), this.facts(), this.program());
    scroller.addEventListener('scroll', () => this.measure(), { passive: true });
    this.scroller = scroller;
    const overlay = el('div', 'home-overlay');
    overlay.setAttribute('aria-hidden', 'true');
    const labels = el('div', 'home-sat-labels');
    overlay.append(labels);
    this.stage.setLabelHost(labels);
    this.readout = null;
    if (isJourney(v)) overlay.append(this.flightReadout());
    if (v === 'd' || v === 'f' || v === 'i') overlay.append(this.globeLegend(v));
    if (v === 'h') overlay.append(this.arcCard());
    this.countdown = v === 'i' ? el('div', 'home-countdown') : null;
    if (this.countdown) overlay.append(this.countdown);
    this.root.replaceChildren(scroller, overlay, this.switcher());
    this.root.setAttribute('aria-labelledby', 'home-title');
    scroller.scrollTop = kept;
    this.gShownAt = -1;
    this.measure();
    if (hadFocus) this.root.querySelector<HTMLElement>(`[data-home-focus="${hadFocus}"]`)?.focus({ preventScroll: true });
  }

  // ─── the first screen ────────────────────────────────────────────────────

  private hero(): HTMLElement {
    const hero = el('header', 'home-hero');
    const inner = el('div', 'home-hero-inner');
    const title = el('h1', 'home-title', t('home.title'));
    title.id = 'home-title';
    inner.append(el('span', 'eyebrow home-eyebrow', t('home.eyebrow')), title, el('p', 'home-lead', t('home.lead')),
      this.variant === 'i' ? this.holdActions() : this.actions());
    if (this.variant === 'a') inner.append(this.lights());
    if (this.variant === 'g') inner.append(this.overYou());
    hero.append(inner, this.cue());
    return hero;
  }

  private playButton(): HTMLButtonElement {
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
    return play;
  }

  private actions(): HTMLElement {
    const row = el('div', 'home-actions');
    const lessons = el('button', 'home-secondary', t('home.hero.lessons'));
    lessons.type = 'button';
    lessons.dataset.homeFocus = 'lessons';
    lessons.addEventListener('click', () => this.host.openLessons());
    row.append(this.playButton(), lessons);
    return row;
  }

  /** I: the button held down to launch — a ring fills and the count runs 3, 2, 1 over the picture — and the viewer beside it. */
  private holdActions(): HTMLElement {
    const row = el('div', 'home-actions');
    const hold = el('button', 'home-hold');
    hold.type = 'button';
    hold.dataset.homeFocus = 'hold';
    const ring = el('span', 'home-hold-ring');
    ring.setAttribute('aria-hidden', 'true');
    ring.append(el('span', 'home-hold-glyph', '▲'));
    const label = el('span', 'home-play-label');
    const strong = el('strong', undefined, t(this.stage.launched ? 'home.i.launched' : 'home.i.hold'));
    label.append(strong, el('small', undefined, t('home.i.holdHint')));
    hold.append(ring, label);
    hold.disabled = this.stage.launched;
    const start = (): void => {
      if (this.stage.launched || this.holdFrom !== null) return;
      this.holdFrom = performance.now();
      hold.classList.add('holding');
      const step = (): void => {
        if (this.holdFrom === null) return;
        const s = (performance.now() - this.holdFrom) / 1000;
        hold.style.setProperty('--p', String(Math.min(1, s / HOLD_SECONDS)));
        if (this.countdown) this.countdown.textContent = s < HOLD_SECONDS ? String(Math.ceil(HOLD_SECONDS - s)) : '';
        this.countdown?.classList.toggle('on', s < HOLD_SECONDS);
        if (s >= HOLD_SECONDS) {
          this.holdFrom = null;
          hold.classList.remove('holding');
          this.stage.launch();
          this.liftoffUntil = performance.now() + 3500;
          hold.disabled = true;
          strong.textContent = t('home.i.launched');
          if (this.countdown) { this.countdown.textContent = t('home.i.liftoff'); this.countdown.classList.add('on', 'liftoff'); }
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const stop = (): void => {
      if (this.holdFrom === null) return;
      this.holdFrom = null;
      hold.classList.remove('holding');
      hold.style.setProperty('--p', '0');
      this.countdown?.classList.remove('on');
    };
    hold.addEventListener('pointerdown', (e) => { e.preventDefault(); hold.setPointerCapture?.(e.pointerId); start(); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) hold.addEventListener(type, stop);
    hold.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } });
    hold.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stop(); });
    hold.addEventListener('click', (e) => e.preventDefault());
    const watch = el('button', 'home-secondary', t('home.play'));
    watch.type = 'button';
    watch.dataset.homeFocus = 'play';
    watch.addEventListener('click', () => this.host.watch(FEATURED_WATCH_MISSION));
    row.append(hold, watch);
    return row;
  }

  /** "more below", which also takes you there */
  private cue(): HTMLElement {
    const cue = el('button', 'home-cue');
    cue.type = 'button';
    cue.dataset.homeFocus = 'cue';
    const arrow = el('span', 'home-cue-arrow', '↓');
    arrow.setAttribute('aria-hidden', 'true');
    cue.append(el('span', undefined, t(isJourney(this.variant) ? 'home.b.hint' : 'home.cue')), arrow);
    cue.addEventListener('click', () => {
      const next = cue.closest('.home-hero, .home-chapter')?.nextElementSibling as HTMLElement | null;
      if (next && this.scroller) this.scroller.scrollTo({ top: next.offsetTop, behavior: 'smooth' });
    });
    return cue;
  }

  /** A: the light at the pad. */
  private lights(): HTMLElement {
    const box = el('div', 'home-choice');
    box.append(el('span', 'home-choice-label', t('home.a.light')));
    const group = el('div', 'home-chips');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', t('home.a.light'));
    for (const light of PAD_LIGHTS) {
      const b = el('button', 'home-chip', t(LIGHT_KEYS[light]));
      b.type = 'button';
      b.dataset.homeFocus = `light-${light}`;
      b.setAttribute('aria-pressed', String(this.stage.light === light));
      b.addEventListener('click', () => { this.stage.setLight(light); this.render(); });
      group.append(b);
    }
    box.append(group);
    return box;
  }

  /** G: over the visitor's city now — how many satellites are up, and when each of a few comes over next. */
  private overYou(): HTMLElement {
    const card = el('section', 'home-g');
    const head = el('div', 'home-g-head');
    const select = el('select', 'home-g-city');
    select.dataset.homeFocus = 'city';
    select.setAttribute('aria-label', t('home.g.city'));
    for (const s of STATIONS) {
      const o = el('option', undefined, t(STATION_KEY[s.id]));
      o.value = s.id;
      o.selected = s.id === this.stage.city;
      select.append(o);
    }
    select.addEventListener('change', () => {
      this.stage.setCity(select.value);
      try { localStorage.setItem(CITY_STORAGE_KEY, select.value); } catch { /* lasts the tab */ }
      this.gShownAt = -1;
    });
    const title = el('span', 'home-g-title', t('home.g.over'));
    const local = el('span', 'home-g-local');
    head.append(title, select, local);
    const above = el('p', 'home-g-above', t('home.g.working'));
    const rows = el('div', 'home-g-rows');
    rows.setAttribute('role', 'list');
    const key = el('p', 'home-g-key');
    const ring = el('span', 'home-g-mark ring');
    const path = el('span', 'home-g-mark path');
    key.append(ring, el('span', undefined, t('home.g.ring')), path, el('span', undefined, t('home.g.issPath')));
    card.append(head, above, el('h2', 'home-g-next', t('home.g.next')), rows, key);
    this.gCard = { root: card, rows, above, local };
    return card;
  }

  /** G: the list, a second at a time. */
  private paintOverYou(): void {
    const c = this.gCard;
    if (!c?.root.isConnected) return;
    const zone = STATION_ZONES[this.stage.city] ?? 'UTC';
    const fmt = (jd: number, withDay = false): string => {
      try {
        return new Intl.DateTimeFormat(getLang(), { hour: '2-digit', minute: '2-digit', timeZone: zone, ...(withDay ? { weekday: 'short' } : {}) })
          .format(new Date((jd - 2440587.5) * 86400e3));
      } catch { return ''; }
    };
    const now = this.stage.jd;
    c.local!.textContent = t('home.g.local', { time: fmt(now) });
    if (this.stage.above === null) return;
    c.above!.textContent = t('home.g.above', { n: num(this.stage.above) });
    c.rows!.replaceChildren(...this.stage.rows.map((r) => this.passRow(r, now, fmt)));
  }

  private passRow(r: PassRow, now: number, fmt: (jd: number, withDay?: boolean) => string): HTMLElement {
    const row = el('div', `home-g-row${r.station ? ' station' : ''}${r.upNow ? ' up' : ''}`);
    row.setAttribute('role', 'listitem');
    const name = el('strong', 'home-g-name', r.station ? t(r.name) : r.name);
    let when = t('home.g.none');
    let path = '';
    const p = r.pass;
    if (r.fixed) when = t('home.g.always', { el: num(r.fixed.el * DEG), dir: compass(r.fixed.az) });
    else if (p && r.upNow) when = t('home.g.nowUp');
    else if (p?.rise) {
      const minutes = (p.rise.jd - now) * 1440;
      const sameDay = fmt(p.rise.jd, true).slice(0, 3) === fmt(now, true).slice(0, 3);
      when = minutes < 90 ? t('home.g.inMin', { n: num(Math.max(1, Math.round(minutes))) }) : sameDay ? t('home.g.at', { time: fmt(p.rise.jd) }) : t('home.g.tomorrow', { time: fmt(p.rise.jd) });
    }
    if (p && !r.fixed) {
      const from = p.rise ? compass(p.rise.az) : '…', to = p.set ? compass(p.set.az) : '…';
      path = `${from} → ${to} · ${t('home.g.max', { el: num(p.top.el * DEG) })}`;
    }
    row.append(name, el('span', 'home-g-when', when));
    if (path) row.append(el('span', 'home-g-path', path));
    if (r.station && p?.visible) row.append(el('span', 'home-g-eye', t('home.g.eye')));
    return row;
  }

  // ─── below the first screen ──────────────────────────────────────────────

  private levels(): LevelEntry[] {
    return [
      { level: 'watch', icon: '▷', title: t('home.card.watch'), text: t('home.card.watchText'), who: t('home.for.watch') },
      { level: 'explore', icon: '◎', title: t('home.card.explore'), text: t('home.card.exploreText'), who: t('home.for.explore') },
      { level: 'engineer', icon: '⌬', title: t('home.card.engineer'), text: t('home.card.engineerText'), who: t('home.for.engineer') },
    ];
  }

  /** The launch simulator's three levels, each a way in (the lessons add a fourth card, src/ui/lessons/lesson-mode.ts). */
  private modes(): HTMLElement {
    const list = el('div', 'home-modes');
    list.setAttribute('role', 'list');
    for (const entry of this.levels()) {
      const button = el('button', 'mode-card');
      button.type = 'button';
      button.setAttribute('role', 'listitem');
      button.dataset.mode = entry.level;
      button.dataset.homeFocus = `launch-${entry.level}`;
      const icon = el('span', 'mode-card-icon', entry.icon);
      icon.setAttribute('aria-hidden', 'true');
      button.append(icon, el('span', 'mode-card-who', entry.who), el('strong', undefined, entry.title), el('span', 'mode-card-text', entry.text));
      button.addEventListener('click', () => this.host.go(route('launch', entry.level)));
      list.append(button);
    }
    return list;
  }

  private paths(): HTMLElement {
    const block = el('section', 'home-block home-paths');
    block.append(el('h2', 'home-block-title', t('home.paths.title')), el('p', 'home-block-lead', t('home.paths.lead')), this.modes());
    return block;
  }

  private factList(): HTMLElement {
    const lessons = BUILTIN_LESSONS.filter((l) => !l.comingSoon).length;
    const list = el('dl', 'home-facts-list');
    for (const [value, text] of [
      [num(WATCH_MISSIONS.length), t('home.fact.launches')],
      [num(lessons), t('home.fact.lessons')],
      [num(3), t('home.fact.languages')],
      [t('home.fact.offlineValue'), t('home.fact.offline')],
    ] as const) {
      const item = el('div', 'home-fact');
      item.append(el('dt', undefined, value), el('dd', undefined, text));
      list.append(item);
    }
    return list;
  }

  private facts(): HTMLElement {
    const block = el('section', 'home-block home-facts');
    block.append(el('h2', 'home-block-title', t('home.facts.title')), el('p', 'home-block-lead', t('home.b.physicsText')), this.factList());
    return block;
  }

  private sectionCard(section: 'launch' | 'orbit' | 'build'): HTMLElement {
    const card = el('section', section === 'launch' ? 'home-section' : 'home-section planned');
    card.setAttribute('role', 'listitem');
    card.dataset.section = section;
    const head = el('div', 'home-section-head');
    const glyph = el('span', 'mode-card-icon', section === 'launch' ? '▲' : section === 'orbit' ? '⊕' : '⚙︎');
    glyph.setAttribute('aria-hidden', 'true');
    head.append(glyph, el('h3', undefined, t(SECTION_KEYS[section])));
    if (section !== 'launch') head.append(el('span', 'section-badge', t('section.inDevelopment')));
    const text = section === 'launch' ? 'home.section.launchText' : section === 'orbit' ? 'home.section.orbitText' : 'home.section.buildText';
    card.append(head, el('p', 'home-section-text', t(text)));
    const label = section === 'launch' ? 'home.card.explore' : section === 'orbit' ? 'home.section.orbitOpen' : 'home.section.plan';
    const button = el('button', 'home-section-link', t(label));
    button.type = 'button';
    button.dataset.homeFocus = section;
    button.addEventListener('click', () => this.host.go(route(section, 'explore')));
    card.append(button);
    return card;
  }

  private program(): HTMLElement {
    const block = el('section', 'home-block home-program');
    const list = el('div', 'home-sections');
    list.setAttribute('role', 'list');
    list.append(this.sectionCard('launch'), this.sectionCard('orbit'), this.sectionCard('build'));
    block.append(el('h2', 'home-block-title', t('home.more')), list);
    return block;
  }

  // ─── B, F, I: the page as the flight ─────────────────────────────────────

  private chapters(list: readonly Chapter[]): HTMLElement[] {
    return list.map((ch) => {
      if (ch.body === 'hero') {
        const hero = this.hero();
        hero.classList.add('home-chapter');
        hero.dataset.t = String(ch.t);
        return hero;
      }
      const section = el('section', `home-chapter ${ch.body}`);
      section.dataset.t = String(ch.t);
      const card = el('div', 'home-chapter-card');
      const tag = ch.body === 'globe' ? t(ch.tag!) : `${clock(ch.t)} · ${t(ch.tag!)}`;
      card.append(el('span', 'home-chapter-tag', tag), el('h2', 'home-block-title', t(ch.title!)), el('p', 'home-block-lead', t(ch.text!)));
      const link = (label: string, go: () => void, primary = false): HTMLButtonElement => {
        const b = el('button', primary ? 'home-section-link primary' : 'home-section-link', label);
        b.type = 'button';
        b.dataset.homeFocus = `ch-${ch.body}-${label}`;
        b.addEventListener('click', go);
        return b;
      };
      const row = (...buttons: HTMLButtonElement[]): HTMLElement => { const r = el('div', 'home-actions'); r.append(...buttons); return r; };
      if (ch.body === 'modes') card.append(this.modes());
      if (ch.body === 'facts') card.append(this.factList());
      if (ch.body === 'lessons') card.append(link(t('home.hero.lessons'), () => this.host.openLessons(), true));
      if (ch.body === 'orbit') card.append(link(t('home.section.orbitOpen'), () => this.host.go(route('orbit', 'explore')), true));
      if (ch.body === 'build') card.append(link(t('home.section.plan'), () => this.host.go(route('build', 'explore'))));
      if (ch.body === 'end') card.append(row(link(t('home.play'), () => this.host.watch(FEATURED_WATCH_MISSION), true), link(t('home.card.explore'), () => this.host.go(route('launch', 'explore')))));
      if (ch.body === 'globe') card.append(row(link(t('home.section.orbitOpen'), () => this.host.go(route('orbit', 'explore')), true), link(t('home.play'), () => this.host.watch(FEATURED_WATCH_MISSION))));
      section.append(card);
      return section;
    });
  }

  /**
   * B, F, I: where each chapter's top is on the page, and so where each moment
   * of the flight is — measured afresh at every scroll, as the page's height
   * moves under it (the web fonts arrive, the lessons add their card); and in
   * F and I, how far the page has come from the orbit's chapter into the globe's.
   */
  private measure(): void {
    const s = this.scroller;
    // not laid out (the page hidden): every chapter would stand at 0, and the globe look fully scrolled into
    if (!s || !isJourney(this.variant) || s.clientHeight === 0) return;
    const max = Math.max(0, s.scrollHeight - s.clientHeight);
    const chapters = [...s.querySelectorAll<HTMLElement>('.home-chapter')];
    const anchors: ScrollAnchor[] = chapters.map((c) => ({ top: Math.min(c.offsetTop, max), t: Number(c.dataset.t) }));
    let globe = 0;
    const g = chapters.findIndex((c) => c.classList.contains('globe'));
    if (g > 0) {
      const from = anchors[g - 1].top, to = anchors[g].top;
      globe = to > from ? Math.max(0, Math.min(1, (s.scrollTop - from) / (to - from))) : s.scrollTop >= to ? 1 : 0;
    }
    this.stage.setScroll(timeAtScroll(anchors, s.scrollTop), globe);
    this.root.classList.toggle('globe-on', globe > 0.5);
  }

  /** B, F, I: the flight's readout. */
  private flightReadout(): HTMLElement {
    const root = el('div', 'home-flight');
    const name = el('span', 'home-flight-name');
    const clockEl = el('span', 'home-flight-num');
    const alt = el('span', 'home-flight-num');
    const speed = el('span', 'home-flight-num');
    const stats = el('div', 'home-flight-stats');
    for (const [label, value] of [[t('watch.stat.time'), clockEl], [t('watch.stat.altitude'), alt], [t('watch.stat.speed'), speed]] as const) {
      const stat = el('div', 'home-flight-stat');
      stat.append(el('small', undefined, label), value);
      stats.append(stat);
    }
    const bar = el('div', 'home-flight-bar');
    const fill = el('span', 'home-flight-fill');
    bar.append(fill, el('span', 'home-flight-karman', '100 km'));
    const note = el('small', 'home-flight-note');
    root.append(name, stats, bar, note);
    this.readout = { root, name, clock: clockEl, alt, speed, fill, note };
    return root;
  }

  /** D, F, I: what the dots and the names are. */
  private globeLegend(v: HomeVariant): HTMLElement {
    const root = el('div', 'home-globe-legend');
    const row = (cls: string, text: string): HTMLElement => {
      const item = el('span', 'home-legend-item');
      item.append(el('span', `home-legend-mark ${cls}`), el('span', undefined, text));
      return item;
    };
    const note = el('small', 'home-flight-note');
    if (v === 'd') root.append(row('thai', t('home.d.thai')), row('drawn', t('home.d.theos2')), row('all', t('home.d.all')), note);
    else root.append(row('drawn', t('home.f.legendOrbit')), row('ascent', t('home.f.legendAscent')), row('thai', t('home.d.thai')), row('all', t('home.d.all')), note);
    if (v === 'd') this.readout = { root, note };
    else this.legendNote = note;
    return root;
  }
  private legendNote: HTMLElement | null = null;

  /** H: the launch being drawn, and the ones before it. */
  private arcCard(): HTMLElement {
    const root = el('div', 'home-arcs');
    const title = el('span', 'home-flight-name', t('home.h.title'));
    const now = el('strong', 'home-arcs-now');
    const sub = el('span', 'home-arcs-sub');
    const rows = el('div', 'home-arcs-list');
    const note = el('small', 'home-arcs-note', t('home.h.legend'));
    root.append(title, now, sub, rows, note);
    this.readout = { root, title: now, sub, rows };
    return root;
  }

  /** PROTOTYPE: the backgrounds, one button each. */
  private switcher(): HTMLElement {
    const bar = el('nav', 'home-proto');
    bar.setAttribute('aria-label', t('home.proto.title'));
    bar.append(el('span', 'home-proto-label', t('home.proto.label')));
    for (const v of HOME_VARIANTS) {
      const b = el('button', 'home-proto-btn');
      b.type = 'button';
      b.dataset.homeFocus = `proto-${v}`;
      b.setAttribute('aria-pressed', String(v === this.variant));
      b.title = t(PROTO_KEYS[v]);
      b.append(el('b', undefined, v.toUpperCase()), el('span', undefined, t(PROTO_KEYS[v])));
      b.addEventListener('click', () => this.setVariant(v));
      bar.append(b);
    }
    return bar;
  }

  /** A few times a second while the page is on screen: the readouts over the picture. */
  tick(frame: VisualFrame | null): void {
    const v = this.variant;
    if (v === 'g') {
      if (performance.now() - this.gShownAt > 1000) { this.gShownAt = performance.now(); this.paintOverYou(); }
      return;
    }
    const c = this.stage.catalogue;
    const count = c ? `${t('home.d.count', { n: num(c.count), warp: num(60) })} · ${t('home.d.asOf', { date: c.asOf.slice(0, 10) })}` : '';
    if (this.legendNote) this.legendNote.textContent = count;
    const r = this.readout;
    if (v === 'd') { if (r?.note) r.note.textContent = count; }
    if (v === 'h') { this.paintArcs(); return; }
    if (v === 'i' && this.countdown?.classList.contains('liftoff') && performance.now() > this.liftoffUntil) this.countdown.classList.remove('on', 'liftoff');
    // the page was shown after it was built, or its height moved: read the chapters again
    if (isJourney(v)) this.measure();
    if (!r || !frame || !isJourney(v)) return;
    if (r.name) r.name.textContent = this.host.vehicleName();
    if (r.clock) r.clock.textContent = clock(frame.t);
    const km = Math.max(0, frame.altitudeAGL) / 1000;
    if (r.alt) r.alt.textContent = `${num(km, km < 100 ? 1 : 0)} ${t('u.km')}`;
    if (r.speed) r.speed.textContent = `${num(frame.liftoff ? groundSpeed(frame) * 3.6 : 0)} ${t('watch.unit.kmh')}`;
    if (r.fill) r.fill.style.width = `${Math.min(100, km / 220 * 100).toFixed(1)}%`;
    const computing = this.stage.computing();
    if (r.note) r.note.textContent = computing !== null ? t('home.b.computing', { t: clock(computing) }) : '';
  }

  /** H: the card of launches. */
  private paintArcs(): void {
    const r = this.readout;
    const now = this.stage.arcNow;
    if (!r?.title || !now) return;
    const m = watchMissionById(now.mission)!;
    const name = (id: WatchMissionId): string => vehicleById(watchMissionById(id)!.vehicleId).name.replace(/\s*\(.*\)$/, '').replace(' Block 5', '');
    r.title.textContent = `${name(now.mission)} · ${siteName(siteById(m.siteId))}`;
    const km = Math.max(0, now.alt) / 1000;
    r.sub!.textContent = now.computing && now.t === 0 ? t('home.h.computing') : `${clock(now.t)} · ${num(km, km < 100 ? 1 : 0)} ${t('u.km')}${now.computing ? ` · ${t('home.h.computing')}` : ''}`;
    const index = H_MISSIONS.indexOf(now.mission);
    r.rows!.replaceChildren(...H_MISSIONS.map((id, k) => el('span', `home-arcs-item${k === index ? ' now' : ''}`, name(id))));
  }
}
