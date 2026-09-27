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
 * PROTOTYPE: five backgrounds for the same page, switched from a bar at the
 * foot of it (or `?home=a…e`), to be compared before one is kept — see
 * src/ui/home-logic.ts for what each is, and src/ui/home-stage.ts for the
 * scene behind them. Nothing here needs to be understood before pressing play.
 */
import { t, getLang } from '../i18n';
import { route, type AppLevel, type AppRoute } from './app-mode';
import { WATCH_MISSIONS, watchMissionById, type WatchMissionId } from './watch-missions';
import { BUILTIN_LESSONS } from '../lessons/catalog';
import { vehicleById } from '../data/vehicles';
import { fmtTime } from './hud';
import { groundSpeed } from './watch-logic';
import type { VisualFrame } from '../physics/frame';
import type { VehicleSpec } from '../types';
import {
  HOME_VARIANTS, HOME_VARIANT_PARAM, HOME_VARIANT_STORAGE_KEY, PAD_LIGHTS, parseVariant, timeAtScroll,
  type HomeVariant, type PadLight, type ScrollAnchor,
} from './home-logic';
import { GLOBE_WARP, type HomeStage } from './home-stage';
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

/** B: a chapter of the page, and the moment of the featured launch (Soyuz to the station) it is read at. */
interface Chapter {
  t: number;
  tag?: string;
  title?: string;
  text?: string;
  body: 'hero' | 'modes' | 'facts' | 'lessons' | 'orbit' | 'build' | 'end';
}

const CHAPTERS: readonly Chapter[] = [
  { t: -8, body: 'hero' },
  { t: 2, tag: 'home.b.liftoff', title: 'home.b.launchTitle', text: 'home.paths.lead', body: 'modes' },
  { t: 60, tag: 'home.b.maxq', title: 'home.b.physicsTitle', text: 'home.b.physicsText', body: 'facts' },
  { t: 122, tag: 'home.b.boosters', title: 'home.b.lessonsTitle', text: 'lesson.home.text', body: 'lessons' },
  { t: 160, tag: 'home.b.space', title: 'home.b.orbitTitle', text: 'home.section.orbitText', body: 'orbit' },
  { t: 296, tag: 'home.b.staging', title: 'home.b.buildTitle', text: 'home.section.buildText', body: 'build' },
  { t: 540, tag: 'home.b.orbit', title: 'home.b.endTitle', text: 'home.b.endText', body: 'end' },
];

const LIGHT_KEYS: Record<PadLight, string> = { day: 'home.a.day', dusk: 'home.a.dusk', night: 'home.a.night' };
const PROTO_KEYS: Record<HomeVariant, string> = { a: 'home.proto.a', b: 'home.proto.b', c: 'home.proto.c', d: 'home.proto.d', e: 'home.proto.e' };
const SECTION_KEYS = { launch: 'section.launch', orbit: 'section.orbit', build: 'section.build' } as const;

/** E: the line-up — the viewer's launches that reach orbit, one per rocket */
const LINEUP: readonly WatchMissionId[] = ['electronSso', 'soyuzIss', 'ariane6AmazonLeo', 'falcon9Bandwagon', 'falconHeavyArabsat', 'starshipFlight5'];

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

/** The prototype asked for by the address, else the one last picked here, else A. */
function initialVariant(): HomeVariant {
  const asked = parseVariant(new URLSearchParams(location.search).get(HOME_VARIANT_PARAM));
  if (asked) return asked;
  try { return parseVariant(localStorage.getItem(HOME_VARIANT_STORAGE_KEY)) ?? 'a'; } catch { return 'a'; }
}

/**
 * E: a rocket's side view to scale, from its data — the stages stacked, the
 * fairing (or the ship's own nose) on top, a pair of its strap-ons at the foot.
 */
function silhouette(spec: VehicleSpec, pxPerM: number): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const stages = spec.stages;
  const fairing = spec.fairing;
  const drawn = stages.reduce((s, st) => s + st.length, 0) + (fairing?.length ?? 0);
  const k = spec.height / drawn; // interstages and adapters are in the height, not in the stages
  const boosters = stages[0]?.boosters?.[0];
  const widest = Math.max(...stages.map((s) => s.diameter), fairing?.diameter ?? 0) + (boosters ? 2 * boosters.diameter : 0);
  const W = widest * pxPerM + 2, H = spec.height * pxPerM + 1;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W.toFixed(1)} ${H.toFixed(1)}`);
  svg.setAttribute('width', W.toFixed(1));
  svg.setAttribute('height', H.toFixed(1));
  svg.setAttribute('aria-hidden', 'true');
  const cx = W / 2;
  const add = (d: string, cls: string): void => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('class', cls);
    svg.append(p);
  };
  const rect = (x: number, y: number, w: number, h: number): string => `M${x},${y}h${w}v${h}h${-w}z`;
  let y = H;
  stages.forEach((st, i) => {
    const h = st.length * k * pxPerM, w = st.diameter * pxPerM;
    const top = i === stages.length - 1 && !fairing;
    // the ship's own nose: the top quarter of it tapers
    if (top) {
      const body = h * 0.72;
      add(`${rect(cx - w / 2, y - body, w, body)}M${cx - w / 2},${y - body}Q${cx - w / 2},${y - h} ${cx},${y - h}Q${cx + w / 2},${y - h} ${cx + w / 2},${y - body}z`, 'rk-body');
    } else add(rect(cx - w / 2, y - h, w, h), i % 2 ? 'rk-body alt' : 'rk-body');
    y -= h;
  });
  if (fairing) {
    const h = fairing.length * k * pxPerM, w = fairing.diameter * pxPerM, cyl = h * 0.45;
    add(`M${cx - w / 2},${y}v${-cyl}Q${cx - w / 2},${y - h} ${cx},${y - h}Q${cx + w / 2},${y - h} ${cx + w / 2},${y - cyl}v${cyl}z`, 'rk-body');
  }
  if (boosters) {
    const bw = boosters.diameter * pxPerM, bh = boosters.length * k * pxPerM, core = stages[0].diameter * pxPerM / 2;
    for (const side of [-1, 1]) {
      const x = side < 0 ? cx - core - bw : cx + core;
      const nose = boosters.conicalTop || spec.id === 'soyuz21a' ? bh * 0.3 : bw * 0.9;
      add(`M${x},${H}v${-(bh - nose)}L${x + bw / 2},${H - bh}L${x + bw},${H - bh + nose}V${H}z`, 'rk-booster');
    }
  }
  return svg;
}

export class HomeScreen {
  variant: HomeVariant = initialVariant();
  private scroller: HTMLElement | null = null;
  /** the readouts over the picture: B's flight, C's live clock, D's catalogue */
  private readout: { root: HTMLElement; name?: HTMLElement; clock?: HTMLElement; alt?: HTMLElement; speed?: HTMLElement; fill?: HTMLElement; note?: HTMLElement } | null = null;

  constructor(private root: HTMLElement, private host: HomeHost, private stage: HomeStage) {
    this.root.classList.add('home-screen');
    this.stage.setVariant(this.variant);
    this.render();
    window.addEventListener('resize', () => this.measure());
  }

  applyLanguage(): void {
    this.render();
  }

  /** PROTOTYPE: show another of the five backgrounds. */
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
    const scroller = el('div', 'home-scroll');
    if (v === 'b') scroller.append(...this.chapters());
    else scroller.append(this.hero(), this.paths(), this.facts(), this.program());
    scroller.addEventListener('scroll', () => this.onScroll(), { passive: true });
    this.scroller = scroller;
    const overlay = el('div', 'home-overlay');
    overlay.setAttribute('aria-hidden', 'true');
    this.readout = null;
    if (v === 'b' || v === 'c') overlay.append(this.flightReadout(v));
    if (v === 'd') overlay.append(this.globeLegend());
    const labels = el('div', 'home-sat-labels');
    overlay.prepend(labels);
    this.stage.labelHost = labels;
    this.root.replaceChildren(scroller, overlay, this.switcher());
    this.root.setAttribute('aria-labelledby', 'home-title');
    scroller.scrollTop = kept;
    this.measure();
    if (hadFocus) this.root.querySelector<HTMLElement>(`[data-home-focus="${hadFocus}"]`)?.focus({ preventScroll: true });
  }

  // ─── the first screen ────────────────────────────────────────────────────

  private hero(): HTMLElement {
    const hero = el('header', 'home-hero');
    const inner = el('div', 'home-hero-inner');
    const title = el('h1', 'home-title', t('home.title'));
    title.id = 'home-title';
    inner.append(el('span', 'eyebrow home-eyebrow', t('home.eyebrow')), title, el('p', 'home-lead', t('home.lead')), this.actions());
    if (this.variant === 'a') inner.append(this.lights());
    if (this.variant === 'e') inner.append(this.lineup());
    hero.append(inner, this.cue());
    return hero;
  }

  private actions(): HTMLElement {
    const row = el('div', 'home-actions');
    const featured = watchMissionById(this.stage.playMission);
    const play = el('button', 'home-play');
    play.type = 'button';
    play.dataset.homeFocus = 'play';
    const glyph = el('span', 'home-play-glyph', '▶');
    glyph.setAttribute('aria-hidden', 'true');
    const label = el('span', 'home-play-label');
    label.append(el('strong', undefined, t('home.play')));
    if (featured) label.append(el('small', undefined, t(featured.titleKey)));
    play.append(glyph, label);
    play.addEventListener('click', () => this.host.watch(this.stage.playMission));
    const lessons = el('button', 'home-secondary', t('home.hero.lessons'));
    lessons.type = 'button';
    lessons.dataset.homeFocus = 'lessons';
    lessons.addEventListener('click', () => this.host.openLessons());
    row.append(play, lessons);
    return row;
  }

  /** "more below", which also takes you there */
  private cue(): HTMLElement {
    const cue = el('button', 'home-cue');
    cue.type = 'button';
    cue.dataset.homeFocus = 'cue';
    const arrow = el('span', 'home-cue-arrow', '↓');
    arrow.setAttribute('aria-hidden', 'true');
    cue.append(el('span', undefined, t(this.variant === 'b' ? 'home.b.hint' : 'home.cue')), arrow);
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

  /** E: the rockets side by side, to scale; the one picked stands on its pad behind the page. */
  private lineup(): HTMLElement {
    const box = el('div', 'home-choice home-lineup-box');
    box.append(el('span', 'home-choice-label', t('home.e.pick')));
    const row = el('div', 'home-lineup');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', t('home.e.pick'));
    const specs = LINEUP.map((id) => vehicleById(watchMissionById(id)!.vehicleId));
    const tallest = Math.max(...specs.map((s) => s.height));
    const pxPerM = (window.innerWidth < 860 || window.innerHeight < 800 ? 96 : 124) / tallest;
    LINEUP.forEach((id, i) => {
      const spec = specs[i];
      const b = el('button', 'home-rocket');
      b.type = 'button';
      b.dataset.homeFocus = `rocket-${id}`;
      b.setAttribute('aria-pressed', String(this.stage.mission === id));
      b.append(silhouette(spec, pxPerM), el('strong', undefined, spec.name.replace(/\s*\(.*\)$/, '').replace(' Block 5', '')),
        el('small', undefined, t('home.e.height', { m: num(spec.height) })));
      b.addEventListener('click', () => { this.stage.setMission(id); this.render(); });
      row.append(b);
    });
    const m = watchMissionById(this.stage.mission);
    box.append(row, el('p', 'home-lineup-blurb', m ? t(m.blurbKey) : ''));
    return box;
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

  // ─── B: the page as the flight ───────────────────────────────────────────

  private chapters(): HTMLElement[] {
    return CHAPTERS.map((ch) => {
      if (ch.body === 'hero') {
        const hero = this.hero();
        hero.classList.add('home-chapter');
        hero.dataset.t = String(ch.t);
        return hero;
      }
      const section = el('section', `home-chapter ${ch.body}`);
      section.dataset.t = String(ch.t);
      const card = el('div', 'home-chapter-card');
      card.append(el('span', 'home-chapter-tag', `${clock(ch.t)} · ${t(ch.tag!)}`), el('h2', 'home-block-title', t(ch.title!)), el('p', 'home-block-lead', t(ch.text!)));
      const link = (label: string, go: () => void, primary = false): HTMLButtonElement => {
        const b = el('button', primary ? 'home-section-link primary' : 'home-section-link', label);
        b.type = 'button';
        b.dataset.homeFocus = `ch-${ch.t}-${label}`;
        b.addEventListener('click', go);
        return b;
      };
      if (ch.body === 'modes') card.append(this.modes());
      if (ch.body === 'facts') card.append(this.factList());
      if (ch.body === 'lessons') card.append(link(t('home.hero.lessons'), () => this.host.openLessons(), true));
      if (ch.body === 'orbit') card.append(link(t('home.section.orbitOpen'), () => this.host.go(route('orbit', 'explore')), true));
      if (ch.body === 'build') card.append(link(t('home.section.plan'), () => this.host.go(route('build', 'explore'))));
      if (ch.body === 'end') {
        const row = el('div', 'home-actions');
        row.append(link(t('home.play'), () => this.host.watch(this.stage.playMission), true), link(t('home.card.explore'), () => this.host.go(route('launch', 'explore'))));
        card.append(row);
      }
      section.append(card);
      return section;
    });
  }

  /**
   * B: where each chapter's top is on the page, and so where each moment of
   * the flight is — measured afresh at every scroll, as the page's height
   * moves under it (the web fonts arrive, the lessons add their card).
   */
  private measure(): void {
    const s = this.scroller;
    if (!s || this.variant !== 'b') return;
    const max = Math.max(0, s.scrollHeight - s.clientHeight);
    const anchors: ScrollAnchor[] = [...s.querySelectorAll<HTMLElement>('.home-chapter')].map((c) => ({ top: Math.min(c.offsetTop, max), t: Number(c.dataset.t) }));
    this.stage.setScrollTime(timeAtScroll(anchors, s.scrollTop));
  }

  private onScroll(): void {
    this.measure();
  }

  /** B's flight readout, and C's smaller "this is the simulation, live" label. */
  private flightReadout(v: HomeVariant): HTMLElement {
    const root = el('div', v === 'b' ? 'home-flight' : 'home-live');
    const name = el('span', 'home-flight-name');
    const clockEl = el('span', 'home-flight-num');
    const alt = el('span', 'home-flight-num');
    if (v === 'c') {
      const dot = el('span', 'home-live-dot');
      root.append(dot, el('span', 'home-live-label', t('home.c.live')), name, clockEl, alt);
      this.readout = { root, name, clock: clockEl, alt };
      return root;
    }
    const speed = el('span', 'home-flight-num');
    const stats = el('div', 'home-flight-stats');
    for (const [label, value] of [[t('watch.stat.time'), clockEl], [t('watch.stat.altitude'), alt], [t('watch.stat.speed'), speed]] as const) {
      const stat = el('div', 'home-flight-stat');
      stat.append(el('small', undefined, label), value);
      stats.append(stat);
    }
    const bar = el('div', 'home-flight-bar');
    const fill = el('span', 'home-flight-fill');
    const karman = el('span', 'home-flight-karman', '100 km');
    bar.append(fill, karman);
    const note = el('small', 'home-flight-note');
    root.append(name, stats, bar, note);
    this.readout = { root, name, clock: clockEl, alt, speed, fill, note };
    return root;
  }

  /** D: what the dots and the names are. */
  private globeLegend(): HTMLElement {
    const root = el('div', 'home-globe-legend');
    const row = (cls: string, text: string): HTMLElement => {
      const item = el('span', 'home-legend-item');
      const mark = el('span', `home-legend-mark ${cls}`);
      item.append(mark, el('span', undefined, text));
      return item;
    };
    const note = el('small', 'home-flight-note');
    root.append(row('thai', t('home.d.thai')), row('drawn', t('home.d.theos2')), row('all', t('home.d.all')), note);
    this.readout = { root, note };
    return root;
  }

  /** PROTOTYPE: the five backgrounds, one button each. */
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
    const r = this.readout;
    if (!r) return;
    if (this.variant === 'd') {
      const c = this.stage.catalogue;
      if (r.note) r.note.textContent = c ? `${t('home.d.count', { n: num(c.count), warp: num(GLOBE_WARP) })} · ${t('home.d.asOf', { date: c.asOf.slice(0, 10) })}` : '';
      const napa = this.root.querySelector<HTMLElement>('.home-sat-label.napa');
      if (napa) napa.dataset.note = t('home.d.napa');
      return;
    }
    if (!frame) return;
    if (r.name) r.name.textContent = this.host.vehicleName();
    if (r.clock) r.clock.textContent = clock(frame.t);
    const km = Math.max(0, frame.altitudeAGL) / 1000;
    if (r.alt) r.alt.textContent = `${num(km, km < 100 ? 1 : 0)} ${t('u.km')}`;
    if (r.speed) r.speed.textContent = `${num(frame.liftoff ? groundSpeed(frame) * 3.6 : 0)} ${t('watch.unit.kmh')}`;
    if (r.fill) r.fill.style.width = `${Math.min(100, km / 220 * 100).toFixed(1)}%`;
    const computing = this.stage.computing();
    if (r.note) r.note.textContent = computing !== null ? t('home.b.computing', { t: clock(computing) }) : '';
  }
}
