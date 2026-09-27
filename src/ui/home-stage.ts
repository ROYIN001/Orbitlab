/**
 * The landing page's background for each prototype (src/ui/home-logic.ts):
 * what the launch scene — or the globe over it — shows behind the page, and
 * how it moves.
 *
 * The page itself (src/ui/home.ts) is DOM; this is the director standing
 * behind it. It is handed the app's controls as closures (`HomeStageHost`),
 * sets its variant up on the first animation frame the landing page is shown
 * with a scene to show it in, runs it frame by frame, and puts the scene back
 * the way the rest of the app expects it when the page is left.
 *
 * B, F and I fly the featured launch for real behind the page, ahead at full
 * speed, and move the replay cursor to wherever the scroll position (or, in
 * I, the launch the visitor set off) says. D, G and H cover the launch scene
 * with the globe (src/ui/home-globe.ts); F and I fade it in at their end. H
 * flies the viewer's launches one after another, unseen, to draw them on it.
 */
import type * as THREE from 'three';
import type { CameraController } from '../render/cameras';
import type { EarthTextures } from '../render/scene';
import type { VisualFrame } from '../physics/frame';
import type { Vec3 } from '../physics/vec3';
import { damp } from '../render/noise';
import { siteById } from '../data/sites';
import { vehicleById } from '../data/vehicles';
import { t } from '../i18n';
import { gmst, julianDate } from '../physics/orbital';
import { skyOrbit, skyState } from '../orbit/real-sky';
import { orbitFromState, stateAt, type Orbit } from '../orbit/kepler';
import { findPasses, lookFrom, type Pass } from '../orbit/passes';
import { eciToEcef, geodeticToEcef, type GroundStation } from '../orbit/applications';
import { STATIONS } from '../orbit/applications-setup';
import type { SatelliteCatalog } from '../provider/satellites';
import { FEATURED_WATCH_MISSION, watchMissionById, watchMissionSettings, type WatchMissionId } from './watch-missions';
import { HomeGlobe, THEOS2_NORAD, toInertial } from './home-globe';
import {
  HOLD_LAUNCH_FROM, PAD_LIGHT_SUN, SCROLL_FLIGHT_END, SCROLL_FLIGHT_ENOUGH, eveningAt, isGlobe, isJourney, launchedTime,
  pictureShift, skyRingAngle, stationForZone,
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
  /** counts every mission previewed, so the stage can tell its own flight from the next one */
  flightNo(): number;
  headTime(): number;
  /** the recording so far */
  frames(): readonly VisualFrame[];
  frame(): VisualFrame | null;
  readonly cams: CameraController;
  /** the launch scene's camera, null before the scene is built */
  camera(): THREE.PerspectiveCamera | null;
  readonly viewport: HTMLElement;
  /** stop (or resume) drawing the launch scene: the globe covers it */
  coverScene(on: boolean): void;
  textures(): Promise<EarthTextures>;
  satellites(): Promise<{ data: SatelliteCatalog; asOf: string }>;
}

/** G: a satellite in the list of what comes over next. */
export interface PassRow {
  norad: number;
  /** i18n key of its name for the stations, else its name */
  name: string;
  station: boolean;
  /** the next pass above 10° that has not ended, or null for none in the next day */
  pass: Pass | null;
  /** above 10° now */
  upNow: boolean;
  /** never sets over the day (a geostationary satellite): where it stands, rad */
  fixed: { az: number; el: number } | null;
}

/** H: the ascent being drawn. */
export interface ArcNow {
  mission: WatchMissionId;
  /** mission time and height above the ground at its head, s and m */
  t: number;
  alt: number;
  /** still being flown */
  computing: boolean;
}

/** G: the satellites listed, in this order */
const G_LIST: readonly { norad: number; name: string; station: boolean }[] = [
  { norad: 25544, name: 'home.g.iss', station: true },
  { norad: 48274, name: 'home.g.css', station: true },
  { norad: THEOS2_NORAD, name: 'THEOS-2', station: false },
  { norad: 46320, name: 'NAPA-1', station: false },
  { norad: 33396, name: 'THEOS', station: false },
  { norad: 41552, name: 'THAICOM 8', station: false },
];
/** G: a pass counts from this high above the horizon, rad */
const G_MIN_EL = 10 * Math.PI / 180;

/** H: the launches drawn, in turn */
export const H_MISSIONS: readonly WatchMissionId[] = ['soyuzIss', 'falcon9Bandwagon', 'ariane6AmazonLeo', 'electronSso', 'falconHeavyArabsat'];
/** H: each is flown to this mission time, s, and drawn this many times faster than it flew */
const H_END = 600;
const H_REVEAL = 45;

/** F and I: the moment the flight has reached orbit and the globe takes over, s */
const JOURNEY_ORBIT = 540;

const ACCENT = 0x8be5cd, GOLD = 0xffd27a, WHITE = 0xe7edf4;

/** H: a launch's path over the ground — Earth-fixed points (m), and the mission time and height of each. */
interface Arc { points: Vec3[]; t: number[]; alt: number[] }

export class HomeStage {
  variant: HomeVariant = 'a';
  /** the variant whose background is set up, null when it has to be (re)built */
  private built: HomeVariant | null = null;
  /** A: the pad's light */
  light: PadLight = 'day';
  /** the flight the stage set up (`flightNo`), so a flight someone else started is left alone */
  private ownFlight = -1;
  /** the stage's flight has moved off the pad: leaving puts the pad back */
  private flown = false;
  /** B, F, I: the mission time the scroll position asks for, and the one shown, eased towards it */
  private scrollTime = -8;
  private shownTime = -8;
  /** F, I: how far the page has scrolled into its globe, 0 to 1 */
  private globeBlend = 0;
  /** I: launched by the visitor, and the flight's own clock since */
  launched = false;
  private liveClock = -10;
  /** seconds on the page, for the slow moves */
  private clock = 0;
  private shiftKey = '';
  private globe: HomeGlobe | null = null;
  /** the page's overlay, where the globe's names go (the page is rebuilt on a language change) */
  private labels: HTMLElement | null = null;
  /** F, I: the globe's end is set up, and the orbit flown */
  private journeyGlobe = false;
  private flownOrbit: Orbit | null = null;
  /** G: where the visitor stands, the list, how many are up, when they were last worked out */
  city = stationForZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  rows: PassRow[] = [];
  above: number | null = null;
  private rowsAt = -1e9;
  private issPathAt = -1e9;
  private issPath: ReturnType<HomeGlobe['line']> | null = null;
  // H
  private arcs = new Map<WatchMissionId, Arc>();
  private arcIndex = 0;
  private arcLine: ReturnType<HomeGlobe['line']> | null = null;
  private arcLines: ReturnType<HomeGlobe['line']>[] = [];
  private arcHead: ReturnType<HomeGlobe['dot']> | null = null;
  private arcBuiltWith = 0;
  private arcBuiltAt = 0;
  private revealT = 0;
  private holdUntil = 0;
  arcNow: ArcNow | null = null;

  constructor(private readonly host: HomeStageHost) {}

  setVariant(v: HomeVariant): void {
    if (v === this.variant) return;
    this.variant = v;
    this.built = null;
  }

  /** A: relight the pad. */
  setLight(light: PadLight): void {
    this.light = light;
    if (this.built === 'a') this.built = null;
  }

  /** B, F, I: the page was scrolled to mission time `time`, and `globe` of the way into its globe. */
  setScroll(time: number, globe = 0): void {
    this.scrollTime = time;
    this.globeBlend = globe;
  }

  /** G: stand somewhere else. */
  setCity(id: string): void {
    this.city = id;
    if (this.built === 'g') this.built = null;
  }

  /** I: the button was held long enough. */
  launch(): void {
    if (this.variant !== 'i' || this.launched) return;
    this.launched = true;
    this.liveClock = HOLD_LAUNCH_FROM;
  }

  /** The globe's names go on the page's overlay. */
  setLabelHost(el: HTMLElement | null): void {
    this.labels = el;
    if (this.globe) this.globe.labelHost = el;
  }

  /** B, F, I: the flight is not yet computed as far as the page asks (the mission time it has reached, else null). */
  computing(): number | null {
    if (!isJourney(this.variant) || this.built !== this.variant) return null;
    const head = this.host.headTime();
    return head < Math.min(this.wantedTime(), JOURNEY_ORBIT) - 0.5 && head < SCROLL_FLIGHT_ENOUGH ? head : null;
  }

  get catalogue(): { asOf: string; count: number } | null {
    return this.globe?.catalogue ?? null;
  }

  /** G: the place it stands at */
  get station(): GroundStation {
    const s = STATIONS.find((x) => x.id === this.city) ?? STATIONS[0];
    return { lat: s.lat * Math.PI / 180, lon: s.lon * Math.PI / 180, h: 0 };
  }

  /** the globe's moment (G's is now) */
  get jd(): number {
    return this.globe?.jd ?? julianDate(new Date());
  }

  /** Each animation frame the landing page is on screen, before the scene is drawn. */
  update(dt: number): void {
    const camera = this.host.camera();
    if (!camera) return; // the scene is not built yet
    this.clock += dt;
    if (this.built !== this.variant) this.build();
    const v = this.variant;
    const w = this.host.viewport.clientWidth, h = this.host.viewport.clientHeight;
    if (this.globe) this.globe.labelHost = this.labels;
    if (v === 'd') { this.updateD(dt, w, h); return; }
    if (v === 'g') { this.updateG(dt, w, h); return; }
    if (v === 'h') { this.updateH(dt, w, h); return; }
    const shift = pictureShift(w, h, v);
    const key = `${w}x${h}:${shift.x}:${shift.y}`;
    if (key !== this.shiftKey || !camera.view) {
      this.shiftKey = key;
      camera.setViewOffset(w, h, -shift.x * w, -shift.y * h, w, h);
    }
    if (v === 'a') {
      // a slow walk round the pad, the camera breathing up and down a little
      this.host.cams.az += dt * 0.045;
      this.host.cams.userEl = 0.07 + 0.05 * Math.sin(this.clock * 0.13);
      return;
    }
    this.updateFlight(dt);
    if (v === 'f' || v === 'i') this.updateJourneyGlobe(dt, w, h);
  }

  /** The landing page was left: the scene back to how the rest of the app uses it. */
  leave(): void {
    const camera = this.host.camera();
    if (camera) { camera.clearViewOffset(); camera.updateProjectionMatrix(); }
    this.shiftKey = '';
    const cams = this.host.cams;
    cams.az = 0.9; cams.userEl = 0; cams.zoom = 1;
    this.host.coverScene(false);
    this.globe?.show(false);
    // a flight flown behind the page is not left half-way for the workspace:
    // unless something else has started a flight of its own since, the
    // featured launch goes back on its pad (and onto it in the first place
    // when the globe was all the page ever showed)
    if (camera && ((this.flown && this.host.flightNo() === this.ownFlight) || !this.host.frame())) {
      this.host.halt();
      this.host.previewWatch(FEATURED_WATCH_MISSION);
    }
    this.flown = false;
    this.built = null;
  }

  private build(): void {
    const v = this.variant;
    this.built = v;
    this.flown = false;
    this.launched = false;
    this.liveClock = -10;
    this.journeyGlobe = false;
    this.globeBlend = 0;
    this.arcNow = null;
    this.arcLine = null; this.arcLines = []; this.arcHead = null; this.issPath = null;
    this.host.coverScene(isGlobe(v));
    const cams = this.host.cams;
    cams.az = 0.9; cams.userEl = 0; cams.zoom = 1;
    if (this.globe) { this.globe.reset(); this.globe.show(isGlobe(v)); }
    if (isGlobe(v)) {
      this.host.halt();
      const globe = this.ensureGlobe();
      globe.show(true);
      if (v === 'd') this.buildD(globe);
      if (v === 'g') this.buildG(globe);
      if (v === 'h') this.buildH(globe);
      return;
    }
    this.host.previewWatch(FEATURED_WATCH_MISSION, v === 'a' ? this.lightTime() : undefined);
    this.ownFlight = this.host.flightNo();
    // A's Soyuz is filmed from a little round from the viewer's side
    if (v === 'a') { cams.az = 1.25; cams.zoom = 1.05; }
    // on a narrow screen the picture is the space above the text: stand back so the whole stack fits in it
    if (this.host.viewport.clientWidth < 860) cams.zoom *= 1.6;
    if (isJourney(v)) {
      this.host.fly();
      this.host.fastForward(SCROLL_FLIGHT_END);
      this.flown = true;
      this.shownTime = v === 'i' ? -10 : this.scrollTime;
    }
  }

  private ensureGlobe(): HomeGlobe {
    this.globe ??= new HomeGlobe(this.host.viewport, this.host.textures(), () => this.host.satellites());
    this.globe.labelHost = this.labels;
    return this.globe;
  }

  /** A: the featured launch's time moved to the evening light asked for (its own daylight time for the day). */
  private lightTime(): Date | undefined {
    if (this.light === 'day') return undefined;
    const site = siteById(watchMissionById(FEATURED_WATCH_MISSION)!.siteId);
    const base = watchMissionSettings(FEATURED_WATCH_MISSION).launchTime as Date;
    return eveningAt(base, site.latitude, site.longitude, PAD_LIGHT_SUN[this.light]);
  }

  // ─── B, F, I: the flight read by scrolling ─────────────────────────────────

  /** The mission time the page asks for now. */
  private wantedTime(): number {
    if (this.variant !== 'i') return this.scrollTime;
    return this.launched ? launchedTime(this.liveClock, this.scrollTime) : -10;
  }

  /** The cursor eased towards the page's moment, never past what has been computed. */
  private updateFlight(dt: number): void {
    if (this.host.flightNo() !== this.ownFlight) return;
    const head = this.host.headTime();
    if (head >= SCROLL_FLIGHT_ENOUGH) this.host.halt();
    if (this.variant === 'i') {
      // scrolling past the first screen sets the rocket off too
      if (!this.launched && this.scrollTime > HOLD_LAUNCH_FROM) this.launch();
      // once off, it flies on in real time, and as far ahead as the page is scrolled
      if (this.launched) this.liveClock = Math.min(JOURNEY_ORBIT, launchedTime(Math.min(this.liveClock + dt, head), Math.min(this.scrollTime, JOURNEY_ORBIT)));
    }
    const target = Math.min(this.wantedTime(), JOURNEY_ORBIT, head - 0.05);
    // eased: a turn of the wheel is a smooth stretch of flight, not a jump (a launch in real time is followed as it is)
    const following = this.variant === 'i' && this.launched && Math.abs(target - this.shownTime) < 0.5;
    this.shownTime = following ? target : damp(this.shownTime, target, 2.6, dt);
    if (Math.abs(this.shownTime - target) < 0.02) this.shownTime = target;
    this.host.seekStill(this.shownTime);
  }

  /** F, I: past orbit, the globe fades in over the scene as the page is scrolled into it, the camera pulling back from the spacecraft. */
  private updateJourneyGlobe(dt: number, w: number, h: number): void {
    const p = this.globeBlend;
    if (p <= 0 || this.host.headTime() < JOURNEY_ORBIT) {
      this.globe?.show(false);
      this.host.coverScene(false);
      return;
    }
    const globe = this.ensureGlobe();
    if (!this.journeyGlobe) this.buildJourneyGlobe(globe);
    globe.show(true);
    globe.setOpacity(Math.min(1, p * 1.6));
    this.host.coverScene(p >= 0.99);
    const craft = this.flownState(globe);
    const e = p * p * (3 - 2 * p);
    // from just above the spacecraft, looking down past it at the Earth, out to the whole sky of satellites
    const near = craft ? { az: Math.atan2(craft.y, craft.x), el: Math.asin(craft.z / Math.hypot(craft.x, craft.y, craft.z)) } : { az: globe.camAz, el: 0.3 };
    globe.aim(near.az + 0.35 * e, near.el + (0.32 - near.el) * e, 8.2 + (w >= 860 ? 27.8 : 16) * e, true);
    globe.frame(dt, w, h, pictureShift(w, h, 'd'));
  }

  /** Where the spacecraft flown is at the globe's moment, m, inertial. */
  private flownState(globe: HomeGlobe): Vec3 | null {
    const o = this.flownOrbit;
    return o ? stateAt(o, (globe.jd - o.jd0) * 86400, false).r : null;
  }

  private buildJourneyGlobe(globe: HomeGlobe): void {
    this.journeyGlobe = true;
    globe.reset();
    const frames = this.host.frames();
    const end = [...frames].reverse().find((f) => f.t <= JOURNEY_ORBIT) ?? frames[frames.length - 1];
    if (!end) return;
    globe.jd = end.jd;
    this.flownOrbit = orbitFromState(end.r, end.v, end.jd);
    globe.setDrawn(this.flownOrbit);
    // the ascent, over the ground it flew over
    const path = frames.filter((f) => f.liftoff && f.t <= JOURNEY_ORBIT).filter((_, k) => k % 3 === 0).map((f) => eciToEcef(f.r, gmst(f.jd)));
    if (path.length > 1) globe.line(path, WHITE, { width: 2, opacity: 0.85 });
    globe.label('flown', t('home.f.yours'), 'drawn', () => this.flownState(globe));
    globe.whenLoaded(() => {
      if (this.built === this.variant && isJourney(this.variant)) globe.labelThai(t('home.d.napa'));
    });
  }

  // ─── D: the globe with the real satellites ────────────────────────────────

  private buildD(globe: HomeGlobe): void {
    globe.warp = 60;
    globe.aim(-2.2, 0.32, 36, true);
    globe.whenLoaded(() => {
      if (this.built !== 'd') return;
      const theos2 = globe.byNorad(THEOS2_NORAD);
      globe.setDrawn(theos2 ? skyOrbit(theos2, globe.jd) : null);
      globe.labelThai(t('home.d.napa'));
    });
  }

  private updateD(dt: number, w: number, h: number): void {
    const globe = this.globe;
    if (!globe) return;
    // (a portrait canvas stands back by its own aspect already, src/render/orbit-view.ts)
    globe.aim(globe.camAz + dt * 0.012, 0.32, w >= 860 ? 36 : 24, true);
    globe.frame(dt, w, h, pictureShift(w, h, 'd'));
  }

  // ─── G: over the visitor's city, now ──────────────────────────────────────

  private buildG(globe: HomeGlobe): void {
    globe.warp = 1;
    globe.jd = julianDate(new Date());
    const st = this.station;
    globe.aim(st.lon + gmst(globe.jd), st.lat * 0.85, 30, true);
    // the city, and the ring within which a satellite 500 km up stands 10° or more above its horizon
    const at = geodeticToEcef(st);
    const up = normalize(at);
    globe.dot(GOLD, 1.3).move(scale(up, 6371e3 * 1.004));
    const east = normalize({ x: -up.y, y: up.x, z: 0 });
    const north = cross(up, east);
    const lambda = skyRingAngle(500e3, G_MIN_EL);
    const ring: Vec3[] = [];
    for (let k = 0; k <= 96; k++) {
      const phi = k / 96 * 2 * Math.PI;
      const d = add(scale(up, Math.cos(lambda)), scale(add(scale(east, Math.cos(phi)), scale(north, Math.sin(phi))), Math.sin(lambda)));
      ring.push(scale(d, 6371e3 * 1.004));
    }
    globe.line(ring, GOLD, { width: 1.6, dashed: true, opacity: 0.9 });
    this.rows = [];
    this.above = null;
    this.rowsAt = -1e9;
    this.issPathAt = -1e9;
    globe.whenLoaded(() => {
      if (this.built !== 'g') return;
      globe.labelThai(t('home.d.napa'));
      for (const s of G_LIST.filter((x) => x.station)) {
        const obj = globe.byNorad(s.norad);
        if (obj) globe.label(`st:${s.norad}`, t(s.name), 'station', () => { const r = skyState(obj, globe.jd); return r.error === 0 ? r.r : null; });
      }
    });
  }

  private updateG(dt: number, w: number, h: number): void {
    const globe = this.globe;
    if (!globe) return;
    const st = this.station;
    // the city stays facing the camera as the Earth turns under it
    globe.aim(st.lon + gmst(globe.jd) + 0.08 * Math.sin(this.clock * 0.05), st.lat * 0.85, w >= 860 ? 19.5 : 12);
    if (globe.sky.length && this.clock - this.rowsAt > 20) { this.rowsAt = this.clock; this.workOutPasses(globe); }
    if (globe.sky.length && this.clock - this.issPathAt > 60) { this.issPathAt = this.clock; this.drawIssPath(globe); }
    globe.frame(dt, w, h, pictureShift(w, h, 'g'));
  }

  /** G: the next pass of each satellite listed, and how many of the catalogue are above the horizon now. */
  private workOutPasses(globe: HomeGlobe): void {
    const st = this.station, jd = globe.jd;
    this.rows = G_LIST.flatMap((s) => {
      const obj = globe.byNorad(s.norad);
      if (!obj) return [];
      const pass = findPasses(obj, st, jd, jd + 1, G_MIN_EL).find((p) => !p.set || p.set.jd > jd) ?? null;
      const upNow = !!pass && (!pass.rise || pass.rise.jd <= jd);
      const fixed = pass && !pass.rise && !pass.set ? { az: pass.top.az, el: pass.top.el } : null;
      return [{ norad: s.norad, name: s.name, station: s.station, pass, upNow, fixed }];
    });
    let n = 0;
    for (const o of globe.sky) { const look = lookFrom(o, st, jd); if (look && look.el > 0) n++; }
    this.above = n;
  }

  /** G: the space station's next orbit, over the ground. */
  private drawIssPath(globe: HomeGlobe): void {
    const iss = globe.byNorad(25544);
    if (!iss) return;
    const pts: Vec3[] = [];
    for (let k = 0; k <= 96; k++) {
      const jd = globe.jd + k / 1440;
      const s = skyState(iss, jd);
      if (s.error === 0) pts.push(eciToEcef(s.r, gmst(jd)));
    }
    if (this.issPath) globe.dropLine(this.issPath);
    this.issPath = pts.length > 1 ? globe.line(pts, WHITE, { width: 1.4, dashed: true, opacity: 0.7 }) : null;
  }

  // ─── H: the launches drawn on the globe ───────────────────────────────────

  private buildH(globe: HomeGlobe): void {
    globe.warp = 30;
    this.arcIndex = 0;
    this.startArc(globe);
    globe.whenLoaded(() => { if (this.built === 'h') globe.labelThai(t('home.d.napa')); });
  }

  private startArc(globe: HomeGlobe): void {
    const id = H_MISSIONS[this.arcIndex % H_MISSIONS.length];
    this.revealT = 0;
    this.holdUntil = 0;
    // the arcs before stay, fainter, the oldest going
    if (this.arcLine) { this.arcLine.setOpacity(0.3); this.arcLines.push(this.arcLine); this.arcLine = null; }
    while (this.arcLines.length > 3) globe.dropLine(this.arcLines.shift()!);
    this.arcBuiltWith = 0;
    this.arcHead ??= globe.dot(ACCENT, 1.1);
    const m = watchMissionById(id)!;
    const site = siteById(m.siteId);
    globe.aim(site.longitude * Math.PI / 180 + gmst(globe.jd), site.latitude * Math.PI / 180 * 0.8, this.host.viewport.clientWidth >= 860 ? 24 : 18);
    const known = this.arcs.has(id);
    if (!known) {
      // flown unseen behind the globe, as fast as the machine allows
      this.host.previewWatch(id);
      this.ownFlight = this.host.flightNo();
      this.host.fly();
      this.host.fastForward(H_END);
      this.flown = true;
      this.arcs.set(id, { points: [], t: [], alt: [] });
    }
    this.arcNow = { mission: id, t: 0, alt: 0, computing: !known };
    globe.label('arc', vehicleById(m.vehicleId).name.replace(/\s*\(.*\)$/, '').replace(' Block 5', ''), 'arc', () => null);
  }

  /** H: the arc so far, from the recording; true once it has all been flown. */
  private collectArc(arc: Arc): boolean {
    if (this.host.flightNo() !== this.ownFlight) return true;
    const frames = this.host.frames();
    const last = arc.t.length ? arc.t[arc.t.length - 1] : -1;
    for (const f of frames) {
      if (!f.liftoff || f.t <= last + 2 || f.t > H_END) continue;
      arc.points.push(eciToEcef(f.r, gmst(f.jd)));
      arc.t.push(f.t);
      arc.alt.push(f.altitudeAGL);
    }
    const done = this.host.headTime() >= H_END - 1 || frames[frames.length - 1]?.status === 'failed';
    if (done) this.host.halt();
    return done;
  }

  private updateH(dt: number, w: number, h: number): void {
    const globe = this.globe;
    const now = this.arcNow;
    if (!globe || !now) return;
    const arc = this.arcs.get(now.mission)!;
    if (now.computing) now.computing = !this.collectArc(arc);
    const lastT = arc.t.length ? arc.t[arc.t.length - 1] : 0;
    this.revealT = Math.min(this.revealT + dt * H_REVEAL, lastT);
    let n = 0;
    while (n < arc.t.length && arc.t[n] <= this.revealT) n++;
    // the line is rebuilt as the recording grows (a few times a second), and shown up to its head
    const grown = arc.points.length !== this.arcBuiltWith;
    if (arc.points.length > 1 && (!this.arcLine || (grown && (!now.computing || this.clock - this.arcBuiltAt > 0.3)))) {
      if (this.arcLine) globe.dropLine(this.arcLine);
      this.arcLine = globe.line(arc.points, ACCENT, { width: 2.6 });
      this.arcBuiltWith = arc.points.length;
      this.arcBuiltAt = this.clock;
    }
    this.arcLine?.setShown(n);
    const head = n > 0 ? arc.points[n - 1] : null;
    this.arcHead?.setVisible(!!head);
    if (head) {
      this.arcHead?.move(head);
      now.t = arc.t[n - 1];
      now.alt = arc.alt[n - 1];
    }
    globe.label('arc', globe.labelText('arc'), 'arc', () => (head ? toInertial(head, globe.theta) : null));
    // drawn to its end: a moment on it, then the next launch
    if (!now.computing && arc.t.length > 0 && n >= arc.t.length) {
      if (!this.holdUntil) this.holdUntil = this.clock + 2.5;
      else if (this.clock >= this.holdUntil) { this.arcIndex++; this.startArc(globe); }
    }
    globe.frame(dt, w, h, pictureShift(w, h, 'h'));
  }
}

const scale = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const normalize = (a: Vec3): Vec3 => scale(a, 1 / (Math.hypot(a.x, a.y, a.z) || 1));
