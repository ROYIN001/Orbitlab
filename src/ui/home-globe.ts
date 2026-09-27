/**
 * The landing page's globe (src/ui/home-stage.ts): the Orbit section's 3-D
 * view (src/render/orbit-view.ts) on a canvas of its own behind the page, the
 * Earth as it is lit now and the International Space Station going round it,
 * named where it is.
 *
 * It keeps its own clock (a Julian date running `warp` times faster than the
 * wall's) and its own camera, eased towards wherever the page aims it. The
 * station is the bundled catalogue's (or the online one's) set of elements,
 * flown by SGP4; its drawn orbit is the osculating one, taken again every
 * half hour of the globe's time so the drawing keeps to SGP4's.
 */
import { OrbitView } from '../render/orbit-view';
import type { EarthTextures } from '../render/scene';
import { julianDate } from '../physics/orbital';
import { damp } from '../render/noise';
import { elementsFromRecord } from '../orbit/omm';
import { skyObjects, skyOrbit, type SkyObject } from '../orbit/real-sky';
import { stateAt, type Orbit } from '../orbit/kepler';
import type { SatelliteCatalog } from '../provider/satellites';

/** The International Space Station's catalogue number */
export const ISS_NORAD = 25544;

export class HomeGlobe {
  readonly canvas: HTMLCanvasElement;
  readonly view: OrbitView;
  /** the globe's moment, Julian date, and how much faster than the wall it runs */
  jd = julianDate(new Date());
  warp = 60;
  /** the station, once the catalogue is in (null when it is not in it) */
  iss: SkyObject | null = null;
  /** the station's name goes here (the page's overlay, rebuilt on a language change) */
  labelHost: HTMLElement | null = null;
  private label: HTMLElement;
  private orbit: Orbit | null = null;
  private orbitJd = -1e9;
  private cam = { az: -2.2, el: 0.32, dist: 44 };
  private aimed = { az: -2.2, el: 0.32, dist: 44 };
  private size = { w: 0, h: 0 };
  private loaded: Promise<void>;

  constructor(viewport: HTMLElement, textures: Promise<EarthTextures>, satellites: () => Promise<{ data: SatelliteCatalog }>) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'home-globe';
    this.canvas.setAttribute('aria-hidden', 'true');
    viewport.insertBefore(this.canvas, document.getElementById('home-screen'));
    this.view = new OrbitView(this.canvas, textures);
    this.view.setOptions({ plain: true });
    this.label = document.createElement('div');
    this.label.className = 'home-sat-label iss';
    this.loaded = satellites().then(({ data }) => {
      const sets = data.groups.flatMap((g) => g.sets).filter((r) => r.NORAD_CAT_ID === ISS_NORAD);
      this.iss = skyObjects(sets.slice(0, 1).map(elementsFromRecord), 'stations')[0] ?? null;
    }).catch(() => { /* the bare globe stands */ });
  }

  /** Once the catalogue is in (or failed to come). */
  whenLoaded(then: () => void): void {
    void this.loaded.then(then);
  }

  /** The station's name, in the page's language. */
  setName(name: string): void {
    this.label.textContent = name;
  }

  show(on: boolean): void {
    this.canvas.hidden = !on;
    if (!on) this.label.hidden = true;
  }

  setOpacity(opacity: number): void {
    const value = opacity >= 0.999 ? '' : opacity.toFixed(3);
    this.canvas.style.opacity = value;
    this.label.style.opacity = value;
  }

  /** Back to now, looking at the Earth from where the page starts it. */
  reset(): void {
    this.jd = julianDate(new Date());
    this.orbitJd = -1e9;
    this.aim(-2.2, 0.32, 44, true);
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

  /** Where the station is at the globe's moment, m, inertial; null before its orbit is drawn. */
  get issAt(): { x: number; y: number; z: number } | null {
    const o = this.orbit;
    return o ? stateAt(o, (this.jd - o.jd0) * 86400, false).r : null;
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
    if (this.iss && Math.abs(this.jd - this.orbitJd) >= 30 / 1440) {
      this.orbitJd = this.jd;
      this.orbit = skyOrbit(this.iss, this.jd);
      this.view.setOrbit(this.orbit);
    }
    // the drawn orbit's own clock is seconds from its epoch; without one, the Earth turns at `jd`
    const o = this.orbit;
    if (o) this.view.update((this.jd - o.jd0) * 86400);
    else { this.view.setBareTime(this.jd); this.view.update(0); }
    this.view.render();
    if (!this.label.isConnected && this.labelHost) this.labelHost.append(this.label);
    const at = this.issAt;
    const p = at ? this.view.project(at) : null;
    this.label.hidden = !p || p.x < -40 || p.x > w + 40 || p.y < -20 || p.y > h + 20;
    if (p) this.label.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
  }
}
