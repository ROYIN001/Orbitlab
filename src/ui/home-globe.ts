/**
 * The landing page's globe (prototypes D, F, G and H, src/ui/home-logic.ts):
 * the Orbit section's 3-D view (src/render/orbit-view.ts) on a canvas of its
 * own behind the page, the bundled satellite catalogue in it as points, and
 * names that follow the satellites the page is about.
 *
 * It keeps its own clock (a Julian date running `warp` times faster than the
 * wall's) and its own camera, eased towards wherever the variant aims it.
 * The variants add what is theirs through the view: an orbit drawn, lines
 * and points fixed to the ground (a city and its sky, an ascent), labels.
 */
import { OrbitView, type GroundDot, type GroundLine, type OrbitGhost } from '../render/orbit-view';
import type { EarthTextures } from '../render/scene';
import { THAI_SATELLITES } from '../data/thai-satellites';
import { gmst, julianDate } from '../physics/orbital';
import { damp } from '../render/noise';
import { elementsFromRecord } from '../orbit/omm';
import { skyObjects, skyPositions, skyState, type SkyObject } from '../orbit/real-sky';
import type { Orbit } from '../orbit/kepler';
import type { SatelliteCatalog } from '../provider/satellites';

type P = { x: number; y: number; z: number };

/** A name on the page over a point of the globe. */
interface Label {
  node: HTMLElement;
  /** where it is now, inertial, m; null when it has no place */
  at: () => P | null;
}

/** THEOS-2, and NAPA-1 — the Royal Thai Air Force's satellite, which gets a caption of its own */
export const THEOS2_NORAD = 58016;
export const NAPA1_NORAD = 46320;

/** An Earth-fixed point to inertial at the Greenwich sidereal angle `theta`. */
export function toInertial(p: P, theta: number): P {
  const c = Math.cos(theta), s = Math.sin(theta);
  return { x: c * p.x - s * p.y, y: s * p.x + c * p.y, z: p.z };
}

export class HomeGlobe {
  readonly canvas: HTMLCanvasElement;
  readonly view: OrbitView;
  /** the globe's moment, Julian date, and how much faster than the wall it runs */
  jd = julianDate(new Date());
  warp = 60;
  /** the catalogue as SGP4 objects (the debris left out), once loaded */
  sky: SkyObject[] = [];
  catalogue: { asOf: string; count: number } | null = null;
  /** the labels go here (the page's overlay) */
  labelHost: HTMLElement | null = null;
  /** the orbit drawn with its satellite, if any */
  private drawn: Orbit | null = null;
  private xyz = new Float32Array(0);
  private latlon = new Float32Array(0);
  private cam = { az: -2.2, el: 0.32, dist: 36 };
  private aimed = { az: -2.2, el: 0.32, dist: 36 };
  private size = { w: 0, h: 0 };
  private labels = new Map<string, Label>();
  private lines: GroundLine[] = [];
  private dots: GroundDot[] = [];
  private loaded: Promise<void>;

  constructor(viewport: HTMLElement, textures: Promise<EarthTextures>, satellites: () => Promise<{ data: SatelliteCatalog; asOf: string }>) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'home-globe';
    this.canvas.setAttribute('aria-hidden', 'true');
    viewport.insertBefore(this.canvas, document.getElementById('home-screen'));
    this.view = new OrbitView(this.canvas, textures);
    this.view.setOptions({ plain: true });
    this.loaded = satellites().then((set) => this.loadSky(set.data, set.asOf)).catch(() => { /* the bare globe stands */ });
  }

  /** Once the catalogue is in (or failed to come). */
  whenLoaded(then: () => void): void {
    void this.loaded.then(then);
  }

  private loadSky(data: SatelliteCatalog, asOf: string): void {
    const groups = data.groups.filter((g) => g.id !== 'debris');
    this.sky = groups.flatMap((g) => skyObjects(g.sets.map(elementsFromRecord), g.id));
    this.xyz = new Float32Array(this.sky.length * 3);
    this.latlon = new Float32Array(this.sky.length * 2);
    this.catalogue = { asOf, count: this.sky.length };
  }

  byNorad(norad: number): SkyObject | undefined {
    return this.sky.find((o) => o.el.satnum === norad);
  }

  show(on: boolean): void {
    this.canvas.hidden = !on;
    if (!on) for (const l of this.labels.values()) l.node.hidden = true;
  }

  setOpacity(opacity: number): void {
    this.canvas.style.opacity = opacity >= 0.999 ? '' : opacity.toFixed(3);
    if (this.labelHost) this.labelHost.style.opacity = this.canvas.style.opacity;
  }

  /** Everything a variant added taken away: the orbit, the ghosts, the lines and points, the labels. */
  reset(): void {
    this.setDrawn(null);
    this.view.setGhosts([]);
    for (const l of this.lines) l.remove();
    for (const d of this.dots) d.remove();
    this.lines = [];
    this.dots = [];
    for (const l of this.labels.values()) l.node.remove();
    this.labels.clear();
    this.setOpacity(1);
    this.warp = 60;
    this.jd = julianDate(new Date());
  }

  setDrawn(orbit: Orbit | null): void {
    this.drawn = orbit;
    this.view.setOrbit(orbit);
  }

  setGhosts(ghosts: readonly OrbitGhost[]): void {
    this.view.setGhosts(ghosts);
  }

  line(points: readonly P[], color: number, opts?: { width?: number; dashed?: boolean; opacity?: number }): GroundLine {
    const l = this.view.addGroundLine(points, color, opts);
    this.lines.push(l);
    return l;
  }

  dropLine(l: GroundLine): void {
    l.remove();
    this.lines = this.lines.filter((x) => x !== l);
  }

  dot(color: number, size = 1): GroundDot {
    const d = this.view.addGroundDot(color, size);
    this.dots.push(d);
    return d;
  }

  /** Where the camera is to go (about the Earth's centre: azimuth and elevation of its direction, rad, and distance, thousands of km); `snap` goes at once. */
  aim(az: number, el: number, dist: number, snap = false): void {
    // the shortest way round from where the camera is
    const turn = Math.atan2(Math.sin(az - this.cam.az), Math.cos(az - this.cam.az));
    this.aimed = { az: this.cam.az + turn, el, dist };
    if (snap) this.cam = { ...this.aimed };
  }

  get camAz(): number {
    return this.cam.az;
  }

  get theta(): number {
    return gmst(this.jd);
  }

  /** A name over a point of the globe (the key replaces an earlier one). */
  label(key: string, text: string, cls: string, at: () => P | null): HTMLElement {
    let l = this.labels.get(key);
    if (!l) {
      const node = document.createElement('div');
      l = { node, at };
      this.labels.set(key, l);
    }
    l.at = at;
    l.node.className = `home-sat-label ${cls}`.trim();
    l.node.textContent = text;
    l.node.dataset.name = text;
    return l.node;
  }

  /** The text of a label, as last set. */
  labelText(key: string): string {
    return this.labels.get(key)?.node.dataset.name ?? '';
  }

  unlabel(key: string): void {
    this.labels.get(key)?.node.remove();
    this.labels.delete(key);
  }

  /** The Thai satellites named where they are (THEOS-2 in the drawn orbit's colour, NAPA-1 with its caption). */
  labelThai(caption: string): void {
    for (const obj of this.sky.filter((o) => o.source === 'thai')) {
      const known = THAI_SATELLITES.find((s) => s.norad === obj.el.satnum);
      const name = known?.name ?? (obj.el.name ?? '').replace(/\s*\(.*\)\s*$/, '');
      const cls = obj.el.satnum === NAPA1_NORAD ? 'napa' : obj.el.satnum === THEOS2_NORAD ? 'drawn' : '';
      const node = this.label(`thai:${obj.el.satnum}`, name, cls, () => { const s = skyState(obj, this.jd); return s.error === 0 ? s.r : null; });
      if (cls === 'napa') node.dataset.note = caption;
    }
  }

  /** Each animation frame the globe is on screen. */
  frame(dt: number, w: number, h: number, shift: { x: number; y: number }): void {
    if (w !== this.size.w || h !== this.size.h) {
      this.size = { w, h };
      this.view.resize(w, h);
    }
    this.jd += dt * this.warp / 86400;
    const k = 1.6;
    this.cam.az = damp(this.cam.az, this.aimed.az, k, dt);
    this.cam.el = damp(this.cam.el, this.aimed.el, k, dt);
    this.cam.dist = damp(this.cam.dist, this.aimed.dist, k, dt);
    this.view.setView(this.cam.az, this.cam.el, this.cam.dist);
    this.view.shiftPicture(shift.x, shift.y);
    if (this.sky.length) this.view.setPoints(this.xyz, skyPositions(this.sky, this.jd, this.xyz, this.latlon), 0x8fc4ff);
    // the drawn orbit's own clock is seconds from its epoch; without one, the Earth turns at `jd`
    const o = this.drawn;
    if (o) this.view.update((this.jd - o.jd0) * 86400);
    else { this.view.setBareTime(this.jd); this.view.update(0); }
    this.view.render();
    for (const l of this.labels.values()) {
      if (!l.node.isConnected && this.labelHost) this.labelHost.append(l.node);
      const r = l.at();
      const p = r ? this.view.project(r) : null;
      l.node.hidden = !p || p.x < -40 || p.x > w + 40 || p.y < -20 || p.y > h + 20;
      if (p) l.node.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
    }
  }
}
