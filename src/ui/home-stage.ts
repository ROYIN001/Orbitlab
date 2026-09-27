/**
 * The landing page's background for each prototype (src/ui/home-logic.ts):
 * what the launch scene shows behind the page, and how it moves.
 *
 * The page itself (src/ui/home.ts) is DOM; this is the director standing
 * behind it. It is handed the app's controls as closures (`HomeStageHost`),
 * sets its variant up on the first animation frame the landing page is shown
 * with a scene to show it in, runs it frame by frame, and puts the scene back
 * the way the rest of the app expects it when the page is left.
 *
 * B and C fly the featured launch for real behind the page: C loops its first
 * half-minute through the replay cursor, B flies it ahead at full speed and
 * moves the cursor to wherever the scroll position says. D covers the launch
 * scene with the Orbit section's globe, the bundled satellite catalogue in it.
 */
import type * as THREE from 'three';
import type { CameraController } from '../render/cameras';
import { OrbitView } from '../render/orbit-view';
import type { EarthTextures } from '../render/scene';
import type { VisualFrame } from '../physics/frame';
import { damp } from '../render/noise';
import { siteById } from '../data/sites';
import { THAI_SATELLITES } from '../data/thai-satellites';
import { julianDate } from '../physics/orbital';
import { elementsFromRecord } from '../orbit/omm';
import { skyObjects, skyOrbit, skyPositions, skyState, type SkyObject } from '../orbit/real-sky';
import type { Orbit } from '../orbit/kepler';
import type { SatelliteCatalog } from '../provider/satellites';
import { FEATURED_WATCH_MISSION, watchMissionById, watchMissionSettings, type WatchMissionId } from './watch-missions';
import {
  LOOP_END, LOOP_START, PAD_LIGHT_SUN, SCROLL_FLIGHT_END, SCROLL_FLIGHT_ENOUGH, eveningAt, pictureShift,
  type HomeVariant, type PadLight,
} from './home-logic';

export interface HomeStageHost {
  /** a viewer launch standing on its pad, paused, the cursor live (its launch time moved when given) */
  previewWatch(id: WatchMissionId, launchTime?: Date): void;
  /** the mission on screen starts flying, at 1× */
  fly(): void;
  /** fly on at full speed to mission time `t` */
  fastForward(t: number): void;
  /** stop the live flight where it is */
  halt(): void;
  /** the cursor to mission time `t`, replaying, still */
  seekStill(t: number): void;
  /** the replay cursor plays at 1× from where it is */
  playReplay(): void;
  /** counts every mission previewed, so the stage can tell its own flight from the next one */
  flightNo(): number;
  headTime(): number;
  cursor(): number;
  live(): boolean;
  frame(): VisualFrame | null;
  readonly cams: CameraController;
  /** the launch scene's camera, null before the scene is built */
  camera(): THREE.PerspectiveCamera | null;
  readonly viewport: HTMLElement;
  /** stop (or resume) drawing the launch scene: D draws a globe over it */
  coverScene(on: boolean): void;
  textures(): Promise<EarthTextures>;
  satellites(): Promise<{ data: SatelliteCatalog; asOf: string }>;
}

/** D: a Thai satellite on the globe, and the label that follows it on screen. */
interface GlobeLabel {
  obj: SkyObject;
  node: HTMLElement;
  /** where SGP4 put it this frame, m */
  r: { x: number; y: number; z: number } | null;
}

/** D: the globe's clock runs this many times faster than the wall's, so the low satellites visibly move. */
export const GLOBE_WARP = 60;
/** D: the satellite whose orbit is drawn: THEOS-2 */
const DRAWN_ORBIT_NORAD = 58016;
/** D: the NORAD number of NAPA-1, the Royal Thai Air Force's satellite, which gets a caption of its own */
export const NAPA1_NORAD = 46320;

export class HomeStage {
  variant: HomeVariant = 'a';
  /** the variant whose background is set up, null when it has to be (re)built */
  private built: HomeVariant | null = null;
  /** E: the launch picked in the line-up */
  mission: WatchMissionId = FEATURED_WATCH_MISSION;
  /** A: the pad's light */
  light: PadLight = 'day';
  /** the flight the stage set up (`flightNo`), so a flight someone else started is left alone */
  private ownFlight = -1;
  /** the stage's flight has moved off the pad (B, C): leaving puts the pad back */
  private flown = false;
  /** B: the mission time the scroll position asks for, and the one shown, eased towards it */
  private scrollTime = -8;
  private shownTime = -8;
  /** C: the live flight has recorded the loop and is replaying it */
  private looping = false;
  /** seconds on the page, for the slow moves */
  private clock = 0;
  /** the camera's zoom as the variant set it up, which E's slow push in and out is about */
  private baseZoom = 1;
  private shiftKey = '';
  // D
  private globe: OrbitView | null = null;
  private globeCanvas: HTMLCanvasElement | null = null;
  private globeSize = { w: 0, h: 0 };
  private sky: SkyObject[] = [];
  private drawn: SkyObject | null = null;
  private drawnOrbit: Orbit | null = null;
  private xyz = new Float32Array(0);
  private latlon = new Float32Array(0);
  private labels: GlobeLabel[] = [];
  private jd = julianDate(new Date());
  private globeAz = -2.2;
  /** D: the catalogue's date and size, once loaded */
  catalogue: { asOf: string; count: number } | null = null;
  /** D: the labels of the Thai satellites go here (the page's overlay) */
  labelHost: HTMLElement | null = null;

  constructor(private readonly host: HomeStageHost) {}

  setVariant(v: HomeVariant): void {
    if (v === this.variant) return;
    this.variant = v;
    this.built = null;
  }

  /** E: stand another rocket on its pad. */
  setMission(id: WatchMissionId): void {
    this.mission = id;
    if (this.built === 'e') this.built = null;
  }

  /** A: relight the pad. */
  setLight(light: PadLight): void {
    this.light = light;
    if (this.built === 'a') this.built = null;
  }

  /** B: the page was scrolled to mission time `t`. */
  setScrollTime(t: number): void {
    this.scrollTime = t;
  }

  /** B: the flight is not yet computed as far as the page asks (the mission time it has reached, else null). */
  computing(): number | null {
    if (this.variant !== 'b' || this.built !== 'b') return null;
    const head = this.host.headTime();
    return head < this.scrollTime - 0.5 && head < SCROLL_FLIGHT_ENOUGH ? head : null;
  }

  /** The launch the page's big button plays. */
  get playMission(): WatchMissionId {
    return this.variant === 'e' ? this.mission : FEATURED_WATCH_MISSION;
  }

  /** Each animation frame the landing page is on screen, before the scene is drawn. */
  update(dt: number): void {
    const camera = this.host.camera();
    if (!camera) return; // the scene is not built yet
    this.clock += dt;
    if (this.built !== this.variant) this.build();
    const w = this.host.viewport.clientWidth, h = this.host.viewport.clientHeight;
    if (this.variant === 'd') { this.updateGlobe(dt, w, h); return; }
    const shift = pictureShift(w, h, this.variant);
    const key = `${w}x${h}:${shift.x}:${shift.y}`;
    if (key !== this.shiftKey || !camera.view) {
      this.shiftKey = key;
      camera.setViewOffset(w, h, -shift.x * w, -shift.y * h, w, h);
    }
    const cams = this.host.cams;
    if (this.variant === 'a' || this.variant === 'e') {
      // A: a slow walk round the pad. E: the viewer's own angle, which is clear of every pad's
      // gantry (Kourou's is a building), and a slow push in and out instead. Both breathe up and down a little.
      if (this.variant === 'a') cams.az += dt * 0.045;
      else { cams.az = 0.9; cams.zoom = this.baseZoom * (1 + 0.05 * Math.sin(this.clock * 0.1)); }
      cams.userEl = 0.07 + 0.05 * Math.sin(this.clock * 0.13);
    } else if (this.variant === 'c') this.updateLoop();
    else if (this.variant === 'b') this.updateScroll(dt);
  }

  /** The landing page was left: the scene back to how the rest of the app uses it. */
  leave(): void {
    const camera = this.host.camera();
    if (camera) { camera.clearViewOffset(); camera.updateProjectionMatrix(); }
    this.shiftKey = '';
    const cams = this.host.cams;
    cams.az = 0.9; cams.userEl = 0; cams.zoom = 1;
    this.host.coverScene(false);
    if (this.globeCanvas) this.globeCanvas.hidden = true;
    // a flight flown behind the page is not left half-way for the workspace:
    // unless something else has started a flight of its own since, the
    // featured launch goes back on its pad (and onto it in the first place
    // when the globe was all the page ever showed)
    if (camera && ((this.flown && this.host.flightNo() === this.ownFlight) || !this.host.frame())) {
      this.host.halt();
      this.host.previewWatch(FEATURED_WATCH_MISSION);
    }
    this.flown = false;
    this.looping = false;
    this.built = null;
  }

  private build(): void {
    const v = this.variant;
    this.built = v;
    this.looping = false;
    this.flown = false;
    this.host.coverScene(v === 'd');
    if (this.globeCanvas) this.globeCanvas.hidden = v !== 'd';
    for (const l of this.labels) l.node.hidden = v !== 'd';
    const cams = this.host.cams;
    cams.az = 0.9; cams.userEl = 0; cams.zoom = 1;
    if (v === 'd') {
      this.host.halt();
      this.ensureGlobe();
      return;
    }
    this.host.previewWatch(v === 'e' ? this.mission : FEATURED_WATCH_MISSION, v === 'a' ? this.lightTime() : undefined);
    this.ownFlight = this.host.flightNo();
    // A's Soyuz is filmed from a little round from the viewer's side; E keeps the viewer's own angle, clear of every pad's gantry
    if (v === 'a') { cams.az = 1.25; cams.zoom = 1.05; }
    if (v === 'e') cams.zoom = 1.05;
    // on a narrow screen the picture is the space above the text: stand back so the whole stack fits in it
    if (this.host.viewport.clientWidth < 860) cams.zoom *= 1.6;
    this.baseZoom = cams.zoom;
    if (v === 'b' || v === 'c') {
      this.host.fly();
      this.flown = true;
    }
    if (v === 'b') {
      this.host.fastForward(SCROLL_FLIGHT_END);
      this.shownTime = this.scrollTime;
    }
  }

  /** A: the featured launch's time moved to the evening light asked for (its own daylight time for the day). */
  private lightTime(): Date | undefined {
    if (this.light === 'day') return undefined;
    const site = siteById(watchMissionById(FEATURED_WATCH_MISSION)!.siteId);
    const base = watchMissionSettings(FEATURED_WATCH_MISSION).launchTime as Date;
    return eveningAt(base, site.latitude, site.longitude, PAD_LIGHT_SUN[this.light]);
  }

  /** C: the first run is live; from then on the replay cursor plays the recorded stretch over and over. */
  private updateLoop(): void {
    if (this.host.flightNo() !== this.ownFlight) return;
    if (!this.looping) {
      if (this.host.headTime() < LOOP_END + 1) return;
      this.host.halt();
      this.looping = true;
      this.restartLoop();
      return;
    }
    if (this.host.live() || this.host.cursor() >= LOOP_END) this.restartLoop();
  }

  private restartLoop(): void {
    this.host.seekStill(LOOP_START);
    this.host.cams.reset();
    this.host.playReplay();
    // a dip to black hides the cut back to the pad
    const vp = this.host.viewport;
    vp.classList.remove('home-cut');
    void vp.offsetWidth;
    vp.classList.add('home-cut');
  }

  /** B: the cursor eased towards the scroll position's moment, never past what has been computed. */
  private updateScroll(dt: number): void {
    if (this.host.flightNo() !== this.ownFlight) return;
    const head = this.host.headTime();
    if (head >= SCROLL_FLIGHT_ENOUGH) this.host.halt();
    const target = Math.min(this.scrollTime, head - 0.05);
    // eased: a turn of the wheel is a smooth stretch of flight, not a jump
    this.shownTime = damp(this.shownTime, target, 2.6, dt);
    if (Math.abs(this.shownTime - target) < 0.02) this.shownTime = target;
    this.host.seekStill(this.shownTime);
  }

  // ─── D: the globe ────────────────────────────────────────────────────────

  private ensureGlobe(): void {
    if (this.globe) { this.globeCanvas!.hidden = false; return; }
    const canvas = document.createElement('canvas');
    canvas.className = 'home-globe';
    canvas.setAttribute('aria-hidden', 'true');
    this.host.viewport.insertBefore(canvas, document.getElementById('home-screen'));
    this.globeCanvas = canvas;
    this.globe = new OrbitView(canvas, this.host.textures());
    this.globe.setOptions({ plain: true });
    this.jd = julianDate(new Date());
    this.host.satellites().then((set) => this.loadSky(set.data, set.asOf)).catch(() => { /* the bare globe stands */ });
  }

  private loadSky(data: SatelliteCatalog, asOf: string): void {
    const groups = data.groups.filter((g) => g.id !== 'debris');
    this.sky = groups.flatMap((g) => skyObjects(g.sets.map(elementsFromRecord), g.id));
    this.xyz = new Float32Array(this.sky.length * 3);
    this.latlon = new Float32Array(this.sky.length * 2);
    this.catalogue = { asOf, count: this.sky.length };
    const thai = this.sky.filter((o) => o.source === 'thai');
    this.drawn = thai.find((o) => o.el.satnum === DRAWN_ORBIT_NORAD) ?? null;
    this.drawnOrbit = this.drawn ? skyOrbit(this.drawn, this.jd) : null;
    this.globe?.setOrbit(this.drawnOrbit);
    for (const l of this.labels) l.node.remove();
    this.labels = thai.map((obj) => {
      const node = document.createElement('div');
      node.className = 'home-sat-label';
      if (obj.el.satnum === NAPA1_NORAD) node.classList.add('napa');
      if (obj.el.satnum === DRAWN_ORBIT_NORAD) node.classList.add('drawn');
      const known = THAI_SATELLITES.find((s) => s.norad === obj.el.satnum);
      node.dataset.name = known?.name ?? (obj.el.name ?? '').replace(/\s*\(.*\)\s*$/, '');
      node.textContent = node.dataset.name;
      node.hidden = true;
      this.labelHost?.append(node);
      return { obj, node, r: null };
    });
  }

  private updateGlobe(dt: number, w: number, h: number): void {
    const globe = this.globe;
    if (!globe) return;
    if (w !== this.globeSize.w || h !== this.globeSize.h) {
      this.globeSize = { w, h };
      globe.resize(w, h);
    }
    this.jd += dt * GLOBE_WARP / 86400;
    const shift = pictureShift(w, h, 'd');
    globe.shiftPicture(shift.x, shift.y);
    this.globeAz += dt * 0.012;
    // (a portrait canvas stands back by its own aspect already, src/render/orbit-view.ts)
    globe.setView(this.globeAz, 0.32, w >= 860 ? 36 : 24);
    if (this.sky.length) {
      const n = skyPositions(this.sky, this.jd, this.xyz, this.latlon);
      globe.setPoints(this.xyz, n, 0x8fc4ff);
    }
    const o = this.drawnOrbit;
    // the drawn orbit's own clock is seconds from its epoch; without one, the Earth turns at `jd`
    if (o) globe.update((this.jd - o.jd0) * 86400);
    else { globe.setBareTime(this.jd); globe.update(0); }
    globe.render();
    for (const l of this.labels) {
      if (!l.node.isConnected && this.labelHost) this.labelHost.append(l.node);
      const s = skyState(l.obj, this.jd);
      const p = s.error === 0 ? globe.project(s.r) : null;
      l.node.hidden = !p || p.x < -40 || p.x > w + 40 || p.y < -20 || p.y > h + 20;
      if (p) l.node.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
    }
  }
}
