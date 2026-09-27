/**
 * What the landing page (src/ui/home.ts) shows behind itself, and how it
 * moves: the launch scene first — the vehicle on its pad, the camera walking
 * slowly round it — then, under the page's starry sky, nothing (the scene is
 * not drawn where it cannot be seen), and at the page's end the globe
 * (src/ui/home-globe.ts) with the International Space Station going round it.
 *
 * The page itself is DOM; this is the director standing behind it. It is
 * handed the app's controls as closures (`HomeStageHost`), runs frame by
 * frame while the page is on screen, and puts the scene back the way the rest
 * of the app expects it when the page is left. It never changes the mission:
 * the app opens the landing page on the featured launch standing on its pad,
 * and a flight someone left for the landing page carries on underneath it.
 *
 * It also works out the station's passes over the visitor's city — the next
 * one, and the next that can be seen with the naked eye — for the page's last
 * chapter to tell.
 */
import type * as THREE from 'three';
import type { CameraController } from '../render/cameras';
import type { EarthTextures } from '../render/scene';
import { julianDate } from '../physics/orbital';
import { findPasses, lookFrom, type Look, type Pass } from '../orbit/passes';
import type { GroundStation } from '../orbit/applications';
import { STATIONS } from '../orbit/applications-setup';
import type { SatelliteCatalog } from '../provider/satellites';
import { HomeGlobe } from './home-globe';
import { PASS_DAYS, nextPasses, pictureShift, stationForZone } from './home-logic';

export interface HomeStageHost {
  readonly cams: CameraController;
  /** the launch scene's camera, null before the scene is built */
  camera(): THREE.PerspectiveCamera | null;
  readonly viewport: HTMLElement;
  /** stop (or resume) drawing the launch scene: the page's sky or its globe covers it */
  coverScene(on: boolean): void;
  textures(): Promise<EarthTextures>;
  satellites(): Promise<{ data: SatelliteCatalog }>;
}

/** A pass counts from this high above the horizon, rad: lower, buildings and haze hide it */
const MIN_PASS_EL = 10 * Math.PI / 180;
/** how far the globe's camera stands behind the station round the Earth, rad: the station off to one side of the Earth's middle, on the near side */
const ISS_LEAD = 0.45;
/** the passes are worked out again this often, days of the wall's time */
const PASSES_EVERY = 10 / 1440;

/** The visitor asked their system for less motion. */
export function reducedMotion(): boolean {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

export class HomeStage {
  /** the scene is set up for the page (undone when the page is left) */
  private built = false;
  /** how far the page has scrolled into its globe, and how much of the scene its sky covers, 0 to 1 */
  private globeBlend = 0;
  private covered = 0;
  /** seconds on the page, for the slow moves */
  private clock = 0;
  private shiftKey = '';
  private globe: HomeGlobe | null = null;
  /** the page's overlay, where the station's name goes (the page is rebuilt on a language change) */
  private labels: HTMLElement | null = null;
  private issName = '';
  /** the city the passes are worked out for */
  city = stationForZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  /** the passes have been worked out (with the station found in the catalogue or not) */
  worked = false;
  /** the station's next pass over the city */
  issNext: Pass | null = null;
  /** its next pass that can be seen with the naked eye: where it comes into sight and leaves it, and how high it gets meanwhile (rad) */
  issSeen: { from: Look; to: Look; top: number } | null = null;
  /** when the passes were last worked out, Julian date */
  private passesAt = -1e9;
  /** the globe's camera has found the station and follows it */
  private following = false;

  constructor(private readonly host: HomeStageHost) {}

  /** The page was scrolled `globe` of the way into its globe, with `covered` of the scene under its sky. */
  setScroll(globe: number, covered: number): void {
    this.globeBlend = globe;
    this.covered = covered;
  }

  /** The station's name goes on the page's overlay, in the page's language. */
  setLabelHost(el: HTMLElement | null, issName: string): void {
    this.labels = el;
    this.issName = issName;
    if (this.globe) { this.globe.labelHost = el; this.globe.setName(issName); }
  }

  /** Work the passes out for another city. */
  setCity(id: string): void {
    this.city = id;
    if (this.globe?.iss) this.workOutPasses();
  }

  /** The city the passes are for. */
  get station(): GroundStation {
    const s = STATIONS.find((x) => x.id === this.city) ?? STATIONS[0];
    return { lat: s.lat * Math.PI / 180, lon: s.lon * Math.PI / 180, h: 0 };
  }

  /** Each animation frame the landing page is on screen, before the scene is drawn. */
  update(dt: number): void {
    const camera = this.host.camera();
    if (!camera) return; // the scene is not built yet
    this.clock += dt;
    const cams = this.host.cams;
    const still = reducedMotion();
    if (!this.built) {
      this.built = true;
      // the vehicle filmed from a little round from the viewer's side; on a
      // narrow screen the picture is the space above the text, so stand back
      // until the whole stack fits in it
      cams.az = 1.25; cams.userEl = 0.07; cams.zoom = this.host.viewport.clientWidth < 860 ? 1.68 : 1.05;
    }
    const w = this.host.viewport.clientWidth, h = this.host.viewport.clientHeight;
    const shift = pictureShift(w, h, 'pad');
    const key = `${w}x${h}:${shift.x}:${shift.y}`;
    if (key !== this.shiftKey || !camera.view) {
      this.shiftKey = key;
      camera.setViewOffset(w, h, -shift.x * w, -shift.y * h, w, h);
    }
    if (!still) {
      // a slow walk round the pad, the camera breathing up and down a little
      cams.az += dt * 0.03;
      cams.userEl = 0.07 + 0.05 * Math.sin(this.clock * 0.13);
    }
    this.updateGlobe(dt, w, h, still);
  }

  /** The landing page was left: the scene back to how the rest of the app uses it. */
  leave(): void {
    const camera = this.host.camera();
    if (camera) { camera.clearViewOffset(); camera.updateProjectionMatrix(); }
    this.shiftKey = '';
    if (this.built) {
      const cams = this.host.cams;
      cams.az = 0.9; cams.userEl = 0; cams.zoom = 1;
    }
    this.host.coverScene(false);
    this.globe?.show(false);
    this.built = false;
  }

  /** The globe fades in over the page's sky at its end, turning slowly, the station alone on it. */
  private updateGlobe(dt: number, w: number, h: number, still: boolean): void {
    const p = this.globeBlend;
    // under the sky or the globe the launch scene need not be drawn
    this.host.coverScene(p >= 0.99 || this.covered >= 0.99);
    if (p <= 0) { this.globe?.show(false); return; }
    if (!this.globe) {
      const globe = this.globe = new HomeGlobe(this.host.viewport, this.host.textures(), () => this.host.satellites());
      globe.labelHost = this.labels;
      globe.setName(this.issName);
      globe.reset();
      // the catalogue in: the passes, or none to tell of when the station is not in it
      globe.whenLoaded(() => { this.workOutPasses(); this.worked = true; });
    }
    const globe = this.globe;
    // with less motion asked for, the Earth turns at its own pace and the camera stands still
    globe.warp = still ? 1 : 60;
    globe.show(true);
    globe.setOpacity(Math.min(1, p * 1.4));
    const e = p * p * (3 - 2 * p);
    const dist = (w >= 860 ? 36 : 24) + 8 * (1 - e);
    // the camera keeps the station in sight, a little behind it, the Earth turning under them both;
    // before its orbit is in, D's slow turn
    const r = globe.issAt;
    if (r) {
      const az = Math.atan2(r.y, r.x) - ISS_LEAD, lat = Math.asin(r.z / Math.hypot(r.x, r.y, r.z));
      globe.aim(az, 0.2 + 0.5 * lat, dist, !this.following);
      this.following = true;
    } else globe.aim(globe.camAz + (still ? 0 : dt * 0.012), 0.32, dist, true);
    globe.frame(dt, w, h, pictureShift(w, h, 'globe'));
    const now = julianDate(new Date());
    // a pass told of is over: the next one
    const ended = (this.issNext?.set ? this.issNext.set.jd < now : false) || (this.issSeen ? this.issSeen.to.jd < now : false);
    if (globe.iss && (now - this.passesAt > PASSES_EVERY || ended)) this.workOutPasses();
  }

  /** The station's passes over the city for the next few days: the next, and the next to be seen. */
  private workOutPasses(): void {
    const iss = this.globe?.iss;
    const now = julianDate(new Date());
    this.passesAt = now;
    if (!iss) return;
    const st = this.station;
    const { next, seen } = nextPasses(findPasses(iss, st, now, now + PASS_DAYS, MIN_PASS_EL), now);
    this.issNext = next;
    const from = seen?.visible ? lookFrom(iss, st, seen.visible.from) : null;
    const to = seen?.visible ? lookFrom(iss, st, seen.visible.to) : null;
    // the pass's highest point, if it is seen then; else the higher end of the stretch it is seen for
    const top = seen && from && to ? (seen.top.jd >= from.jd && seen.top.jd <= to.jd ? seen.top.el : Math.max(from.el, to.el)) : 0;
    this.issSeen = from && to ? { from, to, top } : null;
    this.worked = true;
  }
}
