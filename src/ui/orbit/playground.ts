/**
 * The Orbit section's playground (roadmap O01): one orbit, three ways of
 * looking at it — in 3-D about the Earth, as its track on the ground, and
 * Newton's cannon, where an orbit comes from — at the section's three levels:
 *
 * - Watch: a narrated tour (src/orbit/tour.ts), step by step, nothing to set;
 * - Explore: the orbit's shape by its perigee and apogee, its plane by i, Ω
 *   and ω, Kepler's three laws as numbers that can be checked on screen;
 * - Engineer: the classical elements themselves, the secular drift J2 gives
 *   the node and the perigee, and the repeat-ground-track design of an
 *   Earth-observation orbit.
 *
 * The thin DOM part: the physics is src/orbit/kepler.ts, the rules of the
 * sliders and the tour src/orbit/playground-model.ts, the drawings
 * src/render/orbit-view.ts and the two canvases beside this file. It is
 * drawn over the launch scene like the landing page, with its own animation
 * loop that runs only while it is on screen; a flight left running in the
 * Launch section carries on underneath.
 */
import { t, getLang } from '../../i18n';
import { MU_EARTH, R_EARTH, RAD } from '../../physics/constants';
import { julianDate } from '../../physics/orbital';
import type { EarthTextures } from '../../render/scene';
import { OrbitView } from '../../render/orbit-view';
import { route, type AppLevel, type AppRoute } from '../app-mode';
import { SECTION_PLANS, BUILT_ITEMS } from '../section-plan';
import { hitsEarth, nodeLocalTime, orbitFacts, orbitFromState, stateAt, type Orbit, type OrbitState } from '../../orbit/kepler';
import { PLAYGROUND_PRESET_IDS, presetOrbit } from '../../orbit/presets';
import { TOUR, type TourView } from '../../orbit/tour';
import {
  PG_DEFAULT_PRESET, PG_DEFAULT_WARP, PG_LIMITS, PG_WARPS, handoffOrbit, linearScale, logScale, orbitPath,
  repeatGroundTrack, tourSetup, withApsis, type SliderScale,
} from '../../orbit/playground-model';
import { isPlan, porkchop, stateOnPlan, type Plan, type PlanError } from '../../orbit/maneuvers';
import {
  defaultSettings, makePlan, porkchopAxes, porkchopMinimum, rendezvousTarget, type ManeuverSettings, type PlannerKind,
} from '../../orbit/maneuver-setup';
import type { OrbitGhost, OrbitMarker } from '../../render/orbit-view';
import { maneuverControls, planTable, type ManeuverPanelHost } from './maneuver-panel';
import { PorkchopView, type PorkchopData } from './porkchop-view';
import type { OrbitHandoff } from '../../orbit/handoff';
import { GroundTrackView } from './ground-track';
import { Field, altKm, button, clockText, deg, el, hhmm, km, num, plain, sci, span } from './dom';
import { CannonView } from './cannon-view';

export interface PlaygroundHost {
  go(route: AppRoute): void;
  /** P07: the lifetime analysis, on the orbit handed on from a flight */
  lifetime(handoff: OrbitHandoff, opener: HTMLElement | null): void;
  /** the Earth's textures, shared with the launch scene */
  textures(): Promise<EarthTextures> | null;
  /** the flat map of the Earth for the ground track */
  mapUrl: string;
}

/** The playground's views: the tour's three, and the Engineer's porkchop plot (O02). */
type PgView = TourView | 'porkchop';
const VIEWS: readonly PgView[] = ['3d', 'track', 'cannon', 'porkchop'];
const VIEW_GLYPH: Record<PgView, string> = { '3d': '◍', track: '⌇', cannon: '⤻', porkchop: '▦' };
const VIEW_KEY: Record<PgView, string> = { '3d': 'pg.view.3d', track: 'pg.view.track', cannon: 'pg.view.cannon', porkchop: 'pg.view.porkchop' };
const VIEW_LABEL: Record<PgView, string> = {
  '3d': 'pg.view.3dLabel', track: 'pg.view.trackLabel', cannon: 'pg.view.cannonLabel', porkchop: 'pg.view.porkchopLabel',
};
/** O02's colours: the orbit before, a transfer, the orbit after, a target; and the burns */
const PLAN_COLORS = { start: 0x5f8f86, transfer: 0x6ec8ff, final: 0x7ddba0, target: 0xc3a6ff, burn: 0xefa47e };
/** the preset select's entries that are not presets */
const CUSTOM = 'custom', HANDOFF = 'handoff';

const angle = { min: 0, max: 2 * Math.PI };
const incl = { min: 0, max: Math.PI };

export class OrbitPlayground {
  private level: AppLevel = 'explore';
  private visible = false;
  private view: PgView = '3d';
  private jd0 = julianDate(new Date());
  private orbit: Orbit = presetOrbit(PG_DEFAULT_PRESET, this.jd0);
  private presetId: string = PG_DEFAULT_PRESET;
  private j2 = false;
  private sectors = false;
  /** orbit time, s after the orbit's epoch */
  private time = 0;
  private playing = true;
  private warp = PG_DEFAULT_WARP;
  /** Newton's cannon: the shot and how long since it left the barrel, s */
  private cannon = { speed: 7000, altitude: 200e3, elevation: 0 };
  private cannonClock = 0;
  /** the Watch tour's step; −1 is the orbit a flight handed on, when there is one */
  private tourIndex = 0;
  private handoff: OrbitHandoff | null = null;
  private handoffNote: string | null = null;

  private orbitView: OrbitView | null = null;
  private orbitViewFailed = false;
  /** Engineer: the repeat-ground-track tool's inputs and its last answer */
  private rep = { revs: 143, days: 10, sso: true, open: false, note: '', warn: false };
  /** O02: the maneuver chosen, when its plan starts (s after the orbit's epoch), and the plan it makes */
  private maneuver: ManeuverSettings | null = null;
  private planStart = 0;
  private plan: Plan | PlanError | null = null;
  /** O02: a rendezvous's target, and its porkchop plot (worked out when wanted) */
  private target: Orbit | null = null;
  private porkchopData: PorkchopData | null = null;
  private porkchopKey = '';
  private readonly porkchopView: PorkchopView;
  /** the plan's segment on screen, to redraw the facts when a burn is made */
  private shownSegment = 0;
  private spiralFactsTick = 0;
  private readonly track: GroundTrackView;
  private readonly cannonView: CannonView;
  private raf = 0;
  private last = 0;
  private liveTick = 0;

  // the parts of the page
  private readonly controls = el('aside', 'pg-panel pg-controls');
  private readonly facts = el('aside', 'pg-panel pg-facts');
  private readonly stage = el('div', 'pg-stage');
  private readonly tabs = el('div', 'pg-tabs');
  private readonly views = el('div', 'pg-views');
  private readonly canvases: Record<PgView, HTMLCanvasElement>;
  private readonly hint = el('p', 'pg-hint');
  private readonly tour = el('div', 'pg-tour');
  private readonly timebar = el('div', 'pg-timebar');
  private readonly playBtn = el('button', 'pg-play');
  private readonly warpSel = el('select', 'pg-warp');
  private readonly clock = el('span', 'pg-clock');
  private readonly date = el('span', 'pg-date');
  /** the readouts that move with the satellite, refreshed a few times a second */
  private live: { alt?: HTMLElement; speed?: HTMLElement; nu?: HTMLElement; latlon?: HTMLElement; ltan?: HTMLElement } = {};
  private fields: Record<string, Field> = {};
  private readonly ro: ResizeObserver | null;

  constructor(private readonly root: HTMLElement, private readonly host: PlaygroundHost) {
    root.classList.add('orbit-pg');
    this.canvases = {
      '3d': el('canvas', 'pg-canvas pg-canvas-3d'),
      track: el('canvas', 'pg-canvas pg-canvas-track'),
      cannon: el('canvas', 'pg-canvas pg-canvas-cannon'),
      porkchop: el('canvas', 'pg-canvas pg-canvas-porkchop'),
    };
    this.canvases['3d'].tabIndex = 0;
    this.track = new GroundTrackView(this.canvases.track, host.mapUrl);
    this.cannonView = new CannonView(this.canvases.cannon);
    this.cannonView.aim(this.cannon.altitude, this.cannon.elevation);
    this.porkchopView = new PorkchopView(this.canvases.porkchop, (dep, tof) => this.pickTransfer(dep, tof));
    this.tabs.setAttribute('role', 'tablist');
    this.views.append(...VIEWS.map((v) => this.canvases[v]), this.hint);
    // the tour card is over the view on a wide screen and under it on a phone (playground.css)
    const area = el('div', 'pg-area');
    area.append(this.views, this.tour);
    this.playBtn.type = 'button';
    this.playBtn.addEventListener('click', () => this.setPlaying(!this.playing));
    this.warpSel.addEventListener('change', () => { this.warp = Number(this.warpSel.value); });
    const reset = button('pg-reset', '⟲', () => this.resetClock());
    reset.dataset.role = 'reset';
    const readout = el('span', 'pg-readout');
    readout.append(this.clock, this.date);
    this.timebar.append(this.playBtn, this.warpSel, reset, readout);
    this.stage.append(this.tabs, area, this.timebar);
    const grid = el('div', 'pg-grid');
    grid.append(this.controls, this.stage, this.facts);
    root.replaceChildren(grid);
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.resize()) : null;
    this.ro?.observe(this.views);
    this.render();
  }

  /** Show the playground at a level, and run its clock. */
  show(level: AppLevel): void {
    const entering = !this.visible || level !== this.level;
    if (level === 'watch' && (entering || this.level !== 'watch')) this.applyTourStep();
    if (level !== 'engineer' && this.view === 'porkchop') this.view = '3d';
    // Lambert's rendezvous is the Engineer's: the other levels have no control to clear it with
    if (level !== 'engineer' && this.maneuver?.kind === 'rendezvous') { this.maneuver = null; this.replan(); }
    this.level = level;
    this.visible = true;
    this.root.dataset.level = level;
    if (entering) this.render();
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame((now) => this.frame(now));
    }
  }

  /** Off screen: the clock stops, nothing is drawn. */
  hide(): void {
    this.visible = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  applyLanguage(): void {
    this.render();
  }

  /**
   * S03: the orbit handed on from a flight ("Continue in Orbit"), or none,
   * with the reason. A new one is put in the playground at once — that is
   * what the button asked for — and at the Watch level it is the tour's
   * first card.
   */
  setHandoff(handoff: OrbitHandoff | null, note: string | null = null): void {
    const fresh = handoff !== null && handoff !== this.handoff;
    this.handoff = handoff;
    this.handoffNote = note;
    if (fresh) {
      this.loadHandoff();
      this.tourIndex = -1;
    }
    this.render();
  }

  private loadHandoff(): void {
    if (!this.handoff) return;
    this.orbit = handoffOrbit(this.handoff);
    this.jd0 = this.orbit.jd0;
    this.presetId = HANDOFF;
    this.time = 0;
    this.planStart = 0;
    if (this.view === 'cannon') this.view = '3d';
    this.replan();
  }

  // ─── the model ────────────────────────────────────────────────────────────

  private setOrbit(next: Orbit, presetId: string = CUSTOM): void {
    this.orbit = next;
    this.presetId = presetId;
    this.replan();
    this.syncFields();
    this.renderFacts();
    this.renderPresetSelect();
  }

  private choosePreset(id: string): void {
    if (id === HANDOFF) { this.loadHandoff(); this.orbitView?.setOrbit(this.orbit, true); this.render(); return; }
    if (id === CUSTOM) return;
    this.jd0 = julianDate(new Date());
    this.time = 0;
    this.planStart = 0;
    // a sun-synchronous orbit is one only with the Earth's bulge turning it
    if (id === 'sso') this.j2 = true;
    this.setOrbit(presetOrbit(id, this.jd0), id);
    this.orbitView?.setOrbit(this.orbit, true);
    this.render();
  }

  private setView(view: PgView): void {
    if (view === this.view) return;
    this.view = view;
    if (view === 'porkchop') this.refreshPorkchop();
    this.render();
    this.resize();
  }

  private setPlaying(on: boolean): void {
    this.playing = on;
    this.syncTimebar();
  }

  private resetClock(): void {
    if (this.view === 'cannon') this.cannonClock = 0;
    else this.time = 0;
  }

  private applyTourStep(): void {
    if (this.tourIndex === -1 && this.handoff) {
      this.maneuver = null;
      this.loadHandoff();
      this.warp = PG_DEFAULT_WARP;
      this.playing = true;
      this.orbitView?.setOrbit(this.orbit, true);
      return;
    }
    if (this.tourIndex < 0) this.tourIndex = 0;
    const step = TOUR[this.tourIndex];
    const setup = tourSetup(step, julianDate(new Date()));
    this.view = setup.view;
    this.warp = setup.warp;
    this.sectors = setup.sectors;
    this.j2 = setup.j2;
    this.playing = true;
    if (setup.orbit) {
      this.orbit = setup.orbit;
      this.jd0 = setup.orbit.jd0;
      this.presetId = step.preset ?? CUSTOM;
      this.time = 0;
    }
    this.maneuver = setup.maneuver && setup.orbit ? { ...defaultSettings(setup.maneuver.kind, setup.orbit), ...setup.maneuver } : null;
    this.planStart = 0;
    this.replan();
    if (setup.orbit) this.orbitView?.setOrbit(this.orbit, true);
    if (setup.cannon) {
      this.cannon = { speed: setup.cannon.speed, altitude: setup.cannon.altitude, elevation: 0 };
      this.cannonView.aim(this.cannon.altitude, 0);
      this.cannonView.fire(this.cannon.speed);
      this.cannonClock = 0;
    }
  }

  private stepTour(delta: number): void {
    const first = this.handoff ? -1 : 0;
    const next = Math.min(TOUR.length - 1, Math.max(first, this.tourIndex + delta));
    if (next === this.tourIndex) return;
    this.tourIndex = next;
    this.applyTourStep();
    this.render();
    this.resize();
  }

  private fire(): void {
    this.cannonView.aim(this.cannon.altitude, this.cannon.elevation);
    this.cannonView.fire(this.cannon.speed);
    this.cannonClock = 0;
    this.playing = true;
    this.syncTimebar();
    this.renderFacts();
  }

  // ─── drawing ──────────────────────────────────────────────────────────────

  private frame(now: number): void {
    this.raf = requestAnimationFrame((n) => this.frame(n));
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (this.playing) {
      if (this.view === 'cannon') this.cannonClock += dt * this.warp;
      else this.time += dt * this.warp;
    }
    const flown = this.flownAt(this.time);
    if (this.view === '3d') {
      const v = this.orbitView;
      if (v) {
        v.setOptions({ sectors: this.sectors, engineer: this.level === 'engineer', j2: this.j2 });
        v.setOrbit(flown.orbit);
        v.update(flown.local);
        v.setTarget(this.target ? stateAt(this.target, this.time, this.j2).r : null);
        v.render();
      }
    } else if (this.view === 'track') {
      this.track.draw((tt) => this.stateNow(tt), this.time, this.orbit.jd0 + this.time / 86400, orbitFacts(flown.orbit, this.j2).nodalPeriod);
    } else if (this.view === 'porkchop') {
      this.porkchopView.draw();
    } else {
      this.cannonView.draw(this.cannonClock, dt);
    }
    // a burn made, or the spiral wound on: what the orbit is has changed
    if (flown.index !== this.shownSegment || (flown.index < 0 && (this.spiralFactsTick -= dt) <= 0)) {
      this.shownSegment = flown.index;
      this.spiralFactsTick = 1;
      if (this.view !== 'cannon') this.renderFacts();
    }
    this.liveTick -= dt;
    if (this.liveTick <= 0) {
      this.liveTick = 0.2;
      this.updateLive();
    }
  }

  private resize(): void {
    const w = this.views.clientWidth, h = this.views.clientHeight;
    if (w <= 0 || h <= 0) return;
    this.orbitView?.resize(w, h);
  }

  /**
   * The 3-D view is made the first time it is wanted: one more WebGL
   * context, only if needed. Where WebGL is off, the other two views still
   * work and the 3-D tab says why it is empty.
   */
  private ensureOrbitView(): void {
    if (this.orbitView || this.orbitViewFailed) return;
    try {
      this.orbitView = new OrbitView(this.canvases['3d'], this.host.textures());
      this.syncGhosts();
      this.orbitView.setOrbit(this.orbit, true);
      this.resize();
    } catch {
      this.orbitViewFailed = true;
    }
  }

  /**
   * The Orbit section's one shortcut, from the app's key handler: Space
   * pauses and resumes the clock — except on a control that Space itself
   * activates, or inside a dialog.
   */
  onKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName ?? '';
    if (e.key !== ' ' || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A', 'SUMMARY'].includes(tag) || target?.closest('dialog')) return;
    e.preventDefault();
    this.setPlaying(!this.playing);
  }

  // ─── the maneuver planner (O02) ───────────────────────────────────────────

  private get activePlan(): Plan | null {
    return this.plan && isPlan(this.plan) ? this.plan : null;
  }

  /** Where the satellite is at `t`: along the plan when there is one. */
  private stateNow(t: number): OrbitState {
    const p = this.activePlan;
    return p ? stateOnPlan(p, t, this.j2) : stateAt(this.orbit, t, this.j2);
  }

  /** The orbit flown at `t`, the time along it, and which of the plan's segments it is (−1 while spiralling). */
  private flownAt(t: number): { orbit: Orbit; local: number; index: number } {
    const p = this.activePlan;
    if (!p) return { orbit: this.orbit, local: t, index: 0 };
    const sp = p.spiral;
    if (sp && t > sp.t0 && t < sp.t0 + sp.duration) {
      const s = stateOnPlan(p, t, this.j2);
      return { orbit: orbitFromState(s.r, s.v, this.orbit.jd0 + t / 86400), local: 0, index: -1 };
    }
    let index = 0;
    p.segments.forEach((seg, k) => { if (seg.t0 <= t) index = k; });
    return { orbit: p.segments[index].orbit, local: t - p.segments[index].t0, index };
  }

  /** Plan again from the settings, the start orbit and the plan's start time. */
  private replan(): void {
    if (!this.maneuver) {
      this.plan = null;
      this.target = null;
    } else {
      this.plan = makePlan(this.maneuver, this.orbit, this.planStart, this.j2);
      this.target = this.maneuver.kind === 'rendezvous' ? rendezvousTarget(this.maneuver, this.orbit) : null;
    }
    this.shownSegment = this.flownAt(this.time).index;
    this.syncGhosts();
    // the plot is some thousands of Lambert solutions: worked out again only while it is on screen
    if (this.view === 'porkchop') this.refreshPorkchop();
    else this.porkchopData = null;
  }

  /** The plan's other orbits and its burns, in the 3-D view. */
  private syncGhosts(): void {
    const v = this.orbitView;
    if (!v) return;
    const ghosts: OrbitGhost[] = [], markers: OrbitMarker[] = [];
    const p = this.activePlan;
    if (p) {
      const last = p.segments.length - 1;
      p.segments.forEach((seg, k) => {
        const color = k === 0 ? PLAN_COLORS.start : k === last ? PLAN_COLORS.final : PLAN_COLORS.transfer;
        ghosts.push({ points: orbitPath(seg.orbit), color, dashed: k > 0, closed: seg.orbit.e < 1 });
      });
      if (p.spiral) {
        // the spiral as the circles it winds through
        for (let k = 1; k < 8; k++) {
          const s = stateOnPlan(p, p.spiral.t0 + (k / 8) * p.spiral.duration, this.j2);
          ghosts.push({ points: orbitPath(orbitFromState(s.r, s.v, this.orbit.jd0), 128), color: PLAN_COLORS.transfer, dashed: true, closed: true });
        }
      }
      p.burns.forEach((b, k) => markers.push({ position: stateOnPlan(p, b.t, this.j2).r, label: String(k + 1), color: PLAN_COLORS.burn }));
    }
    if (this.target) ghosts.push({ points: orbitPath(this.target), color: PLAN_COLORS.target, dashed: true, closed: true });
    v.setGhosts(ghosts);
    v.setMarkers(markers);
  }

  /** Work the porkchop plot out again when its inputs have changed (a rendezvous only). */
  private refreshPorkchop(): void {
    const m = this.maneuver;
    if (!m || m.kind !== 'rendezvous' || !this.target) {
      this.porkchopData = null;
      this.porkchopView.set(null);
      return;
    }
    const key = JSON.stringify([this.orbit, this.target, this.planStart, this.j2]);
    if (key !== this.porkchopKey || !this.porkchopData) {
      const { deps, tofs } = porkchopAxes(this.orbit, this.target);
      const grid = porkchop(this.orbit, this.target, deps.map((d) => this.planStart + d), tofs, this.j2);
      this.porkchopData = { deps, tofs, grid, chosen: null };
      this.porkchopKey = key;
    }
    this.porkchopData = { ...this.porkchopData, chosen: { dep: m.dep, tof: m.tof } };
    this.porkchopView.set(this.porkchopData);
  }

  /** A point of the porkchop plot chosen: plan that transfer. */
  private pickTransfer(dep: number, tof: number): void {
    if (!this.maneuver) return;
    this.maneuver = { ...this.maneuver, dep, tof };
    this.replan();
    this.renderControls();
    this.renderFacts();
  }

  private readonly maneuverHost: ManeuverPanelHost = {
    level: () => this.level,
    settings: () => this.maneuver,
    choose: (kind: PlannerKind | null) => {
      this.maneuver = kind ? defaultSettings(kind, this.orbit) : null;
      this.planStart = this.time;
      if (kind === 'rendezvous') {
        // start from the cheapest transfer on the plot
        this.replan();
        this.refreshPorkchop();
        const best = this.porkchopData ? porkchopMinimum(this.porkchopData.grid) : null;
        if (best && this.porkchopData && this.maneuver) this.maneuver = { ...this.maneuver, dep: this.porkchopData.deps[best.i], tof: this.porkchopData.tofs[best.j] };
      }
      this.replan();
      // stand back far enough to see the whole plan
      this.orbitView?.frameOrbit();
      this.renderControls();
      this.renderFacts();
    },
    change: (patch: Partial<ManeuverSettings>) => {
      const before = this.maneuver;
      if (!before) return;
      this.maneuver = { ...before, ...patch };
      this.replan();
      this.renderFacts();
      // a burn added, taken away or moved to another kind of point changes which fields there are
      const nodes = patch.nodes;
      if (nodes && (nodes.length !== before.nodes.length || nodes.some((n, k) => n.point !== before.nodes[k]?.point))) this.renderControls();
    },
    replanNow: () => {
      this.planStart = this.time;
      this.replan();
      this.renderFacts();
    },
    adopt: () => {
      const p = this.activePlan;
      if (!p) return;
      const at = Math.max(this.time, p.arrival);
      const s = this.stateNow(at);
      this.maneuver = null;
      this.time = 0;
      this.planStart = 0;
      this.setOrbit(orbitFromState(s.r, s.v, this.orbit.jd0 + at / 86400));
      this.jd0 = this.orbit.jd0;
      this.orbitView?.setOrbit(this.orbit, true);
      this.render();
    },
    showPorkchop: () => this.setView('porkchop'),
  };

  // ─── the page ─────────────────────────────────────────────────────────────

  private render(): void {
    this.root.dataset.level = this.level;
    this.root.dataset.view = this.view;
    this.root.setAttribute('aria-label', t('pg.title'));
    if (this.view === '3d') this.ensureOrbitView();
    this.renderTabs();
    for (const v of VIEWS) {
      this.canvases[v].hidden = v !== this.view || (v === '3d' && this.orbitViewFailed);
      this.canvases[v].setAttribute('aria-label', t(VIEW_LABEL[v]));
      this.canvases[v].setAttribute('role', 'img');
    }
    const noPorkchop = this.view === 'porkchop' && !this.porkchopData;
    // over the porkchop plot the hint says only why it is empty; what it shows is said beside the rendezvous's settings
    this.hint.textContent = this.view === '3d' ? (this.orbitViewFailed ? t('pg.webgl') : t('pg.hint.3d')) : noPorkchop ? t('pc.none') : '';
    this.hint.classList.toggle('warn', (this.view === '3d' && this.orbitViewFailed) || noPorkchop);
    this.hint.hidden = this.view !== '3d' && !noPorkchop;
    this.renderControls();
    this.renderFacts();
    this.renderTour();
    this.renderTimebar();
  }

  private renderTabs(): void {
    this.tabs.setAttribute('aria-label', t('pg.views'));
    this.tabs.replaceChildren(...VIEWS.filter((v) => v !== 'porkchop' || this.level === 'engineer').map((v) => {
      const b = button('pg-tab', '', () => this.setView(v));
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(v === this.view));
      const glyph = el('span', 'pg-tab-glyph', VIEW_GLYPH[v]);
      glyph.setAttribute('aria-hidden', 'true');
      b.append(glyph, el('span', undefined, t(VIEW_KEY[v])));
      return b;
    }));
  }

  private renderTimebar(): void {
    this.warpSel.setAttribute('aria-label', t('pg.warp'));
    this.warpSel.replaceChildren(...PG_WARPS.map((w) => {
      const o = el('option', undefined, `${num(w)}×`);
      o.value = String(w);
      return o;
    }));
    const reset = this.timebar.querySelector<HTMLButtonElement>('[data-role="reset"]')!;
    reset.title = t('pg.reset');
    reset.setAttribute('aria-label', t('pg.reset'));
    this.syncTimebar();
  }

  private syncTimebar(): void {
    this.playBtn.textContent = this.playing ? '❚❚' : '▶';
    this.playBtn.title = this.playing ? t('pg.pause') : t('pg.play');
    this.playBtn.setAttribute('aria-label', this.playBtn.title);
    if (!PG_WARPS.includes(this.warp)) this.warp = PG_DEFAULT_WARP;
    this.warpSel.value = String(this.warp);
  }

  private presetSelect: HTMLSelectElement | null = null;

  private renderPresetSelect(): void {
    const sel = this.presetSelect;
    if (!sel) return;
    const opts: [string, string][] = PLAYGROUND_PRESET_IDS.map((id) => [id, t(`orbit.${id}.name`)]);
    if (this.handoff) opts.unshift([HANDOFF, t('pg.preset.handoff')]);
    opts.push([CUSTOM, t('pg.preset.custom')]);
    sel.replaceChildren(...opts.map(([v, label]) => {
      const o = el('option', undefined, label);
      o.value = v;
      return o;
    }));
    sel.value = this.presetId;
  }

  private renderControls(): void {
    const box = this.controls;
    box.replaceChildren();
    const head = el('div', 'pg-panel-head');
    head.append(el('span', 'eyebrow', t('section.orbit')), el('h1', 'pg-title', t(this.view === 'cannon' ? 'pg.cannon.title' : 'pg.title')));
    box.append(head);
    this.fields = {};
    this.presetSelect = null;
    if (this.view === 'cannon') { this.renderCannonControls(box); return; }

    const presetLabel = el('label', 'pg-preset');
    presetLabel.append(el('span', undefined, t('pg.preset')));
    const sel = el('select');
    sel.addEventListener('change', () => this.choosePreset(sel.value));
    presetLabel.append(sel);
    this.presetSelect = sel;
    this.renderPresetSelect();
    box.append(presetLabel);

    const engineer = this.level === 'engineer';
    const set = (patch: Partial<Orbit>) => { this.setOrbit({ ...this.orbit, ...patch }); };
    const fields = el('div', 'pg-fields');
    if (engineer) {
      this.fields.a = new Field(t('pg.a'), t('u.km'), logScale(PG_LIMITS.a.min, PG_LIMITS.a.max), km.show, km.read, 1, PG_LIMITS.a, (a) => set({ a }));
      this.fields.e = new Field(t('pg.e'), '', linearScale(PG_LIMITS.e.min, PG_LIMITS.e.max), plain.show, plain.read, 4, PG_LIMITS.e, (e) => set({ e }));
    } else {
      const alt = PG_LIMITS.altitude;
      const limits = { min: R_EARTH + alt.min, max: R_EARTH + alt.max };
      const scale = logScale(limits.min - R_EARTH, limits.max - R_EARTH);
      // the scale runs on altitude; the field holds a radius so the number box reads in altitude
      const radial: SliderScale = { toValue: (p) => R_EARTH + scale.toValue(p), toPosition: (v) => scale.toPosition(v - R_EARTH) };
      this.fields.perigee = new Field(t('pg.perigee'), t('u.km'), radial, altKm.show, altKm.read, 0, limits,
        (r) => this.setOrbit(withApsis(this.orbit, 'perigee', r - R_EARTH)));
      this.fields.apogee = new Field(t('pg.apogee'), t('u.km'), radial, altKm.show, altKm.read, 0, limits,
        (r) => this.setOrbit(withApsis(this.orbit, 'apogee', r - R_EARTH)));
    }
    this.fields.i = new Field(t('pg.i'), '°', linearScale(incl.min, incl.max), deg.show, deg.read, engineer ? 2 : 1, incl, (i) => set({ i }));
    this.fields.raan = new Field(t('pg.raan'), '°', linearScale(angle.min, angle.max), deg.show, deg.read, engineer ? 2 : 1, angle, (raan) => set({ raan }));
    this.fields.argp = new Field(t('pg.argp'), '°', linearScale(angle.min, angle.max), deg.show, deg.read, engineer ? 2 : 1, angle, (argp) => set({ argp }));
    if (engineer) {
      this.fields.m0 = new Field(t('pg.m0'), '°', linearScale(angle.min, angle.max), deg.show, deg.read, 2, angle, (m0) => set({ m0 }));
    }
    fields.append(...Object.values(this.fields).map((f) => f.root));
    box.append(fields);
    this.syncFields();

    const toggles = el('div', 'pg-toggles');
    toggles.append(
      this.toggle(t('pg.j2'), this.j2, (on) => { this.j2 = on; this.replan(); this.renderFacts(); }, t('pg.j2.note')),
      this.toggle(t('pg.sectors'), this.sectors, (on) => { this.sectors = on; }, t('pg.sectors.note')),
    );
    box.append(toggles);
    box.append(maneuverControls(this.maneuverHost));
    if (engineer) box.append(this.repeatTool());
    box.append(this.handoffBlock());
  }

  private toggle(label: string, on: boolean, change: (on: boolean) => void, note?: string): HTMLElement {
    const row = el('label', 'pg-toggle');
    const input = el('input');
    input.type = 'checkbox';
    input.checked = on;
    input.addEventListener('change', () => change(input.checked));
    const text = el('span', 'pg-toggle-text');
    text.append(el('strong', undefined, label));
    if (note) text.append(el('small', undefined, note));
    row.append(input, text);
    return row;
  }

  /** Put the orbit's values on the sliders, without firing them. */
  private syncFields(): void {
    const o = this.orbit, f = this.fields;
    f.a?.set(o.a);
    f.e?.set(o.e);
    f.perigee?.set(o.a * (1 - o.e));
    f.apogee?.set(o.a * (1 + o.e));
    f.i?.set(o.i);
    f.raan?.set(o.raan);
    f.argp?.set(o.argp);
    f.m0?.set(((o.m0 % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
  }

  /**
   * Engineer: the circular orbit whose track repeats after N revolutions in
   * D days — how an Earth-observation satellite's height is chosen. The
   * repeat condition is J2's (src/orbit/kepler.ts), so the answer turns J2 on.
   */
  private repeatTool(): HTMLElement {
    const r = this.rep;
    const box = el('details', 'pg-tool');
    box.open = r.open;
    box.addEventListener('toggle', () => { r.open = box.open; });
    box.append(el('summary', undefined, t('pg.rep.title')));
    const row = el('div', 'pg-tool-row');
    const input = (label: string, value: number, min: number, max: number, set: (v: number) => void): void => {
      const wrap = el('label');
      const i = el('input');
      i.type = 'number'; i.min = String(min); i.max = String(max); i.step = '1'; i.value = String(value);
      i.addEventListener('change', () => set(Number(i.value)));
      wrap.append(el('span', undefined, label), i);
      row.append(wrap);
    };
    input(t('pg.rep.revs'), r.revs, 1, 500, (v) => { r.revs = v; });
    input(t('pg.rep.days'), r.days, 1, 60, (v) => { r.days = v; });
    const out = el('p', 'pg-tool-out', r.note);
    out.setAttribute('aria-live', 'polite');
    out.classList.toggle('warn', r.warn);
    const go = button('watch-btn primary', t('pg.rep.apply'), () => {
      const found = repeatGroundTrack(r.revs, r.days, r.sso, this.orbit.i);
      if (!found) {
        r.note = t('pg.rep.none');
        r.warn = true;
        out.textContent = r.note;
        out.classList.add('warn');
        return;
      }
      r.note = t('pg.rep.found', { revs: num(r.revs), days: num(r.days), alt: num((found.a - R_EARTH) / 1000, 1), i: num(found.i * RAD, 3) });
      r.warn = false;
      this.j2 = true;
      this.jd0 = julianDate(new Date());
      this.time = 0;
      this.setOrbit({ ...this.orbit, a: found.a, e: 0, i: found.i, m0: 0, jd0: this.jd0 });
      this.orbitView?.setOrbit(this.orbit, true);
      this.render();
    });
    box.append(el('p', 'pg-tool-lead', t('pg.rep.lead')), row,
      this.toggle(t('pg.rep.sso'), r.sso, (on) => { r.sso = on; }), go, out);
    return box;
  }

  /** S03: the orbit a flight handed on — what it is, put it back on, and how long it lasts. */
  private handoffBlock(): HTMLElement {
    const box = el('section', 'pg-handoff');
    box.append(el('span', 'eyebrow', t('handoff.eyebrow')));
    const h = this.handoff;
    if (!h) {
      box.append(el('p', 'pg-handoff-empty', this.handoffNote ?? t('handoff.none')));
      return box;
    }
    box.append(el('p', 'pg-handoff-label', h.label));
    const dl = el('dl', 'pg-dl');
    const kg = t('u.kg');
    const rows: [string, string][] = [[t('handoff.mass'), `${num(h.spacecraft.mass)} ${kg}`]];
    if (h.spacecraft.propulsion) rows.push([t('handoff.propellant'), `${num(h.spacecraft.propulsion.propellantMass)} ${kg}`]);
    for (const [k, v] of rows) dl.append(el('dt', undefined, k), el('dd', undefined, v));
    box.append(dl);
    const actions = el('div', 'pg-actions');
    if (this.presetId !== HANDOFF) actions.append(button('watch-btn', t('pg.handoff.load'), () => this.choosePreset(HANDOFF)));
    const life = button('watch-btn', t('life.button'), () => this.host.lifetime(h, life));
    actions.append(life);
    box.append(actions);
    return box;
  }

  private renderCannonControls(box: HTMLElement): void {
    box.append(el('p', 'pg-lead', t('pg.cannon.lead')));
    const c = this.cannon;
    const speed = new Field(t('pg.cannon.speed'), t('u.ms'), linearScale(PG_LIMITS.cannonSpeed.min, PG_LIMITS.cannonSpeed.max), plain.show, plain.read, 0,
      PG_LIMITS.cannonSpeed, (v) => { this.cannon.speed = v; this.renderFacts(); });
    const alt = new Field(t('pg.cannon.altitude'), t('u.km'), logScale(PG_LIMITS.cannonAltitude.min, PG_LIMITS.cannonAltitude.max), km.show, km.read, 0,
      PG_LIMITS.cannonAltitude, (v) => { this.cannon.altitude = v; this.cannonView.aim(v, this.cannon.elevation); this.renderFacts(); });
    speed.set(c.speed);
    alt.set(c.altitude);
    const fields = el('div', 'pg-fields');
    fields.append(speed.root, alt.root);
    if (this.level === 'engineer') {
      const elev = new Field(t('pg.cannon.elevation'), '°', linearScale(PG_LIMITS.cannonElevation.min, PG_LIMITS.cannonElevation.max), deg.show, deg.read, 1,
        PG_LIMITS.cannonElevation, (v) => { this.cannon.elevation = v; this.cannonView.aim(this.cannon.altitude, v); });
      elev.set(c.elevation);
      fields.append(elev.root);
    }
    box.append(fields);
    const actions = el('div', 'pg-actions');
    actions.append(
      button('watch-btn primary pg-fire', t('pg.cannon.fire'), () => this.fire()),
      button('watch-btn', t('pg.cannon.clear'), () => { this.cannonView.clear(); this.renderFacts(); }),
    );
    box.append(actions);
  }

  private renderFacts(): void {
    const box = this.facts;
    box.replaceChildren();
    this.live = {};
    // the Watch level has no side panels: its readouts are the tour card's
    if (this.level === 'watch') return;
    if (this.view === 'cannon') { this.renderCannonFacts(box); this.appendComingNext(box); return; }
    if (this.plan && this.maneuver) box.append(planTable(this.maneuverHost, this.plan, this.maneuver, this.time));
    const o = this.flownAt(this.time).orbit, f = orbitFacts(o, this.j2), engineer = this.level === 'engineer';
    const km = t('u.km'), kms = t('u.kms');
    box.append(el('h2', 'pg-facts-title', t('pg.facts')));
    if (hitsEarth(o)) box.append(el('p', 'pg-warn', t('pg.crash')));
    const dl = el('dl', 'pg-dl');
    const row = (k: string, v: string): HTMLElement => {
      const dd = el('dd', undefined, v);
      dl.append(el('dt', undefined, k), dd);
      return dd;
    };
    this.live.alt = row(t('pg.f.altNow'), '');
    this.live.speed = row(t('pg.f.speedNow'), '');
    row(t('pg.f.period'), span(f.period));
    row(t('pg.f.apsides'), `${num(f.perigeeAlt / 1000)} × ${num(f.apogeeAlt / 1000)} ${km}`);
    row(t('pg.f.vApsides'), `${num(f.vPerigee / 1000, 3)} / ${num(f.vApogee / 1000, 3)} ${kms}`);
    row(t('pg.f.revsPerDay'), num(f.revsPerDay, 2));
    if (engineer) {
      this.live.nu = row(t('pg.f.nu'), '');
      this.live.latlon = row(t('pg.f.latlon'), '');
      row(t('pg.f.nodal'), `${num(f.nodalPeriod, 1)} ${t('u.s')}`);
      row(t('pg.f.energy'), `${num(f.energy / 1e6, 3)} ${t('u.MJkg')}`);
      row(t('pg.f.h'), `${num(f.h / 1e6)} ${t('u.km2s')}`);
      row(t('pg.f.raanDot'), `${num(f.raanDot * RAD * 86400, 4)} °/${t('pg.unit.day')}`);
      row(t('pg.f.argpDot'), `${num(f.argpDot * RAD * 86400, 4)} °/${t('pg.unit.day')}`);
      row(t('pg.f.shift'), `${num(f.trackShift * RAD, 2)}° · ${num((f.trackShift * R_EARTH) / 1000)} ${km}`);
      this.live.ltan = row(t('pg.f.ltan'), '');
      row(t('pg.f.sso'), f.sunSynchronous ? t('pg.yes') : t('pg.no'));
    }
    box.append(dl);
    if (engineer && !this.j2) box.append(el('p', 'pg-note', t('pg.f.twoBody')));

    // Kepler's three laws, each with this orbit's own numbers
    const laws = el('div', 'pg-laws');
    const law = (title: string, text: string) => {
      const card = el('section', 'pg-law');
      card.append(el('h3', undefined, title), el('p', undefined, text));
      laws.append(card);
    };
    law(t('pg.k1.title'), t('pg.k1.text', { e: num(o.e, 4), c: num((o.a * o.e) / 1000) }));
    law(t('pg.k2.title'), t('pg.k2.text', { A: num(f.arealVelocity / 1e6) }));
    law(t('pg.k3.title'), t('pg.k3.text', { k: sci(f.keplerConstant * 1e9), T: span(f.period), a: num(o.a / 1000) }));
    box.append(el('h2', 'pg-facts-title', t('pg.kepler')), laws);
    this.appendComingNext(box);
    this.updateLive();
  }

  private renderCannonFacts(box: HTMLElement): void {
    const r0 = R_EARTH + this.cannon.altitude;
    box.append(el('h2', 'pg-facts-title', t('pg.cannon.facts')));
    const dl = el('dl', 'pg-dl');
    dl.append(
      el('dt', undefined, t('pg.cannon.vc')), el('dd', undefined, `${num(Math.sqrt(MU_EARTH / r0) / 1000, 3)} ${t('u.kms')}`),
      el('dt', undefined, t('pg.cannon.ve')), el('dd', undefined, `${num(Math.sqrt(2 * MU_EARTH / r0) / 1000, 3)} ${t('u.kms')}`),
    );
    box.append(dl);
    box.append(this.cannonOutcome(), el('p', 'pg-note', t('pg.cannon.note')));
  }

  /** What became of the last shot, in words. */
  private cannonOutcome(): HTMLElement {
    const shot = this.cannonView.latest;
    const out = el('p', 'pg-outcome');
    out.setAttribute('aria-live', 'polite');
    if (!shot) out.textContent = t('pg.cannon.none');
    else {
      out.dataset.outcome = shot.outcome;
      out.textContent = shot.outcome === 'impact'
        ? t('pg.cannon.impact', { range: num((shot.range ?? 0) / 1000), time: span(shot.flightTime ?? 0) })
        : shot.outcome === 'orbit'
          ? t('pg.cannon.orbit', { period: span(shot.period ?? 0), apogee: num((shot.apogeeAlt ?? 0) / 1000) })
          : t('pg.cannon.escape');
    }
    return out;
  }

  /** What the Orbit section will hold next, from the roadmap (S01's list, less what is built). */
  private appendComingNext(box: HTMLElement): void {
    if (this.level === 'watch') return;
    const more = el('details', 'pg-next');
    more.append(el('summary', undefined, t('pg.next')));
    const list = el('ul', 'section-items');
    for (const item of SECTION_PLANS.orbit.phases.flatMap((p) => p.items)) {
      if (BUILT_ITEMS.has(item.id)) continue;
      const li = el('li');
      li.append(el('code', 'section-item-id', item.id), el('span', undefined, t(item.key)));
      list.append(li);
    }
    more.append(list);
    box.append(more);
  }

  /** Watch: the tour's card, over the view. */
  private renderTour(): void {
    const box = this.tour;
    box.replaceChildren();
    box.hidden = this.level !== 'watch';
    if (this.level !== 'watch') return;
    const yours = this.tourIndex === -1 && !!this.handoff;
    const step = TOUR[Math.max(0, this.tourIndex)];
    const n = yours ? 0 : this.tourIndex + 1;
    box.append(
      el('span', 'eyebrow pg-tour-step', yours ? t('handoff.eyebrow') : t('pg.tour.step', { n, total: TOUR.length })),
      el('h2', undefined, yours ? t('pg.tour.yours.title') : t(step.titleKey)),
      el('p', 'pg-tour-text', yours ? t('pg.tour.yours.text', { label: this.handoff!.label }) : t(step.textKey)),
    );
    if (this.view === 'cannon') box.append(this.cannonOutcome());
    else {
      const stats = el('div', 'pg-tour-stats');
      const stat = (label: string): HTMLElement => {
        const s = el('div', 'pg-tour-stat');
        const v = el('strong');
        s.append(el('small', undefined, label), v);
        stats.append(s);
        return v;
      };
      this.live.alt = stat(t('pg.f.altNow'));
      this.live.speed = stat(t('pg.f.speedNow'));
      stat(t('pg.f.period')).textContent = span(orbitFacts(this.flownAt(this.time).orbit, this.j2).period);
      box.append(stats);
    }
    const nav = el('div', 'pg-tour-nav');
    const prev = button('watch-btn', `‹ ${t('pg.tour.prev')}`, () => this.stepTour(-1));
    prev.disabled = this.tourIndex <= (this.handoff ? -1 : 0);
    const next = button('watch-btn primary', `${t(yours ? 'pg.tour.start' : 'pg.tour.next')} ›`, () => this.stepTour(1));
    next.disabled = this.tourIndex >= TOUR.length - 1;
    nav.append(prev, next, button('watch-btn link', t('pg.tour.try'), () => this.host.go(route('orbit', 'explore'))));
    box.append(nav);
    this.updateLive();
  }

  /** The readouts that move with the satellite, and the clock. */
  private updateLive(): void {
    if (this.view === 'cannon') {
      this.clock.textContent = t('pg.cannon.clock', { time: clockText(this.cannonClock) });
      this.date.textContent = '';
      return;
    }
    const s = this.stateNow(this.time);
    const L = this.live;
    const p = this.activePlan;
    const nextNote = this.facts.querySelector('.pg-plan-next');
    if (p && nextNote) {
      const next = p.burns.find((b) => b.t > this.time);
      nextNote.textContent = next ? t('mv.next', { time: span(next.t - this.time) }) : p.arrival <= this.time ? t('mv.done') : '';
    }
    if (L.alt) L.alt.textContent = `${num(s.alt / 1000)} ${t('u.km')}`;
    if (L.speed) L.speed.textContent = `${num(Math.hypot(s.v.x, s.v.y, s.v.z) / 1000, 3)} ${t('u.kms')}`;
    if (L.nu) L.nu.textContent = `${num(s.nu * RAD, 1)}°`;
    if (L.latlon) L.latlon.textContent = `${num(Math.abs(s.lat * RAD), 2)}° ${s.lat >= 0 ? 'N' : 'S'} · ${num(Math.abs(s.lon * RAD), 2)}° ${s.lon >= 0 ? 'E' : 'W'}`;
    const jd = this.orbit.jd0 + this.time / 86400;
    if (L.ltan) L.ltan.textContent = hhmm(nodeLocalTime(s.raan, jd));
    this.clock.textContent = `T+ ${clockText(this.time)}`;
    const date = new Date((jd - 2440587.5) * 86400e3);
    this.date.textContent = Number.isFinite(date.getTime())
      ? t('pg.utc', { date: date.toLocaleString(getLang(), { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) })
      : '';
  }
}
