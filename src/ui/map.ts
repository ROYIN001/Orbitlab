/**
 * 2D equirectangular orbital map: ground track, predicted and target orbits,
 * day/night terminator, launch site and stage impact points.
 */
import type { Simulation } from '../physics/simulation';
import { eciToLatLon, propagateKepler, sunDirectionEci, stateFromElements, elementsFromState } from '../physics/orbital';
import { OMEGA_EARTH, RAD, DEG, R_EARTH } from '../physics/constants';
import { t } from '../i18n';

export class OrbitalMap {
  private canvas: HTMLCanvasElement;
  private img: HTMLImageElement | null = null;
  private targetPts: { lat: number; lon: number }[] = [];
  private trackForSim: Simulation | null = null;
  private trackPts: { lat: number; lon: number }[] = [];
  private trackSeen = 0;
  private targetForSim: Simulation | null = null;

  constructor(canvas: HTMLCanvasElement, imageUrl: string) {
    this.canvas = canvas;
    const img = new Image();
    img.onload = () => { this.img = img; };
    img.src = imageUrl;
  }

  private xy(lat: number, lon: number, w: number, h: number): [number, number] {
    return [((lon + 180) / 360) * w, ((90 - lat) / 180) * h];
  }

  private polyline(g: CanvasRenderingContext2D, pts: { lat: number; lon: number }[], w: number, h: number, color: string, dash: number[] = [], width = 1.5): void {
    if (pts.length < 2) return;
    g.strokeStyle = color;
    g.lineWidth = width;
    g.setLineDash(dash);
    g.beginPath();
    let prev: [number, number] | null = null;
    for (const p of pts) {
      const [x, y] = this.xy(p.lat, p.lon, w, h);
      if (prev && Math.abs(x - prev[0]) > w / 2) g.moveTo(x, y);
      else if (prev) g.lineTo(x, y);
      else g.moveTo(x, y);
      prev = [x, y];
    }
    g.stroke();
    g.setLineDash([]);
  }

  draw(sim: Simulation | null, siteLat: number, siteLon: number): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    if (W === 0 || H === 0) return;
    if (this.canvas.width !== Math.round(W * dpr) || this.canvas.height !== Math.round(H * dpr)) {
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(H * dpr);
    }
    const g = this.canvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#05070c';
    g.fillRect(0, 0, W, H);
    // fit a 2:1 map into the canvas
    const mw = Math.min(W, H * 2), mh = mw / 2;
    const ox = (W - mw) / 2, oy = (H - mh) / 2;
    g.save();
    g.translate(ox, oy);
    if (this.img) g.drawImage(this.img, 0, 0, mw, mh);
    else { g.fillStyle = '#123'; g.fillRect(0, 0, mw, mh); }
    // graticule
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.lineWidth = 1;
    for (let lon = -150; lon <= 150; lon += 30) { const [x] = this.xy(0, lon, mw, mh); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, mh); g.stroke(); }
    for (let lat = -60; lat <= 60; lat += 30) { const [, y] = this.xy(lat, 0, mw, mh); g.beginPath(); g.moveTo(0, y); g.lineTo(mw, y); g.stroke(); }
    const jd = sim ? sim.julianDate() : 2461000;
    const theta = sim ? sim.state.theta : 0;
    // night shading: for each column, compute the terminator latitude
    const sun = sunDirectionEci(jd);
    const subLat = Math.asin(sun.z);
    const subLon = ((Math.atan2(sun.y, sun.x) - theta) * RAD + 540) % 360 - 180;
    g.fillStyle = 'rgba(0,0,10,0.45)';
    g.beginPath();
    const cols = 180;
    // night polygon: points where the sun elevation is negative
    for (let i = 0; i <= cols; i++) {
      const lon = -180 + (360 * i) / cols;
      const dl = (lon - subLon) * DEG;
      // terminator: tan(lat) = -cos(dl) / tan(subLat)  (solve cos(zenith)=0)
      // atan (not atan2): the terminator latitude must stay within ±90° for either sign of the declination
      const tanDec = Math.abs(Math.tan(subLat)) < 1e-6 ? (subLat < 0 ? -1e-6 : 1e-6) : Math.tan(subLat);
      const latT = Math.atan(-Math.cos(dl) / tanDec) * RAD;
      const [x, y] = this.xy(latT, lon, mw, mh);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    // close over the dark pole (north if subsolar latitude is south)
    const darkPoleY = subLat > 0 ? mh : 0;
    g.lineTo(mw, darkPoleY);
    g.lineTo(0, darkPoleY);
    g.closePath();
    g.fill();
    // sub-solar point
    { const [x, y] = this.xy(subLat * RAD, subLon, mw, mh); g.fillStyle = '#ffd166'; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
    // launch site
    { const [x, y] = this.xy(siteLat, siteLon, mw, mh); g.strokeStyle = '#4cd97b'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.stroke(); }
    if (sim) {
      // target orbit ground track (computed once per mission)
      if (this.targetForSim !== sim) {
        this.targetForSim = sim;
        this.targetPts = [];
        const tg = sim.plan.target;
        const raan = tg.raan ?? sim.plan.raanExpected;
        const st = stateFromElements(tg.a, tg.e, tg.inclination, raan, tg.argp, 0);
        const el = elementsFromState(st.r, st.v);
        const T = Math.min(el.period, 86400 * 1.5);
        const steps = 240;
        for (let k = 0; k <= steps; k++) {
          const dt = (T * k) / steps;
          const p = propagateKepler(st.r, st.v, dt);
          const ll = eciToLatLon(p.r, sim.plan.gmst0 + OMEGA_EARTH * dt);
          this.targetPts.push({ lat: ll.lat * RAD, lon: ll.lon * RAD });
        }
      }
      this.polyline(g, this.targetPts, mw, mh, 'rgba(242,177,52,0.75)', [6, 4], 1.5);
      // ground track from telemetry, appended incrementally (the buffer may be thinned)
      if (this.trackForSim !== sim || sim.telemetry.length < this.trackSeen) { this.trackForSim = sim; this.trackPts = []; this.trackSeen = 0; }
      const tel = sim.telemetry;
      for (let i = this.trackSeen; i < tel.length; i++) {
        const smp = tel[i];
        if (smp.t < 0) continue;
        const last = this.trackPts[this.trackPts.length - 1];
        if (!last || Math.abs(smp.lat - last.lat) > 0.05 || Math.abs(smp.lon - last.lon) > 0.05) this.trackPts.push({ lat: smp.lat, lon: smp.lon });
      }
      this.trackSeen = tel.length;
      if (this.trackPts.length > 6000) this.trackPts = this.trackPts.filter((_, i) => i % 2 === 0 || i > this.trackPts.length - 1000);
      this.polyline(g, this.trackPts, mw, mh, '#4aa3ff', [], 2);
      // predicted orbit (1 period ahead)
      const el = sim.state.elements;
      if (el.e < 1 && el.periapsisAlt > -R_EARTH * 0.5) {
        const pts: { lat: number; lon: number }[] = [];
        const T = Math.min(el.period, 86400 * 1.5);
        const steps = 200;
        for (let k = 0; k <= steps; k++) {
          const dt = (T * k) / steps;
          const p = propagateKepler(sim.state.r, sim.state.v, dt);
          const alt = Math.hypot(p.r.x, p.r.y, p.r.z) - R_EARTH;
          if (alt < 0) break;
          const ll = eciToLatLon(p.r, theta + OMEGA_EARTH * dt);
          pts.push({ lat: ll.lat * RAD, lon: ll.lon * RAD });
        }
        this.polyline(g, pts, mw, mh, 'rgba(255,255,255,0.7)', [3, 4], 1.2);
      }
      // debris
      for (const d of sim.debris) {
        if (d.visual.kind === 'fairing') continue;
        // a landed/impacted piece stays at its recorded ground position (it rotates with the Earth)
        const ll = !d.alive && d.impact ? { lat: d.impact.lat * DEG, lon: d.impact.lon * DEG } : eciToLatLon(d.r, theta);
        const [x, y] = this.xy(ll.lat * RAD, ll.lon * RAD, mw, mh);
        g.fillStyle = d.outcome === 'landed' ? '#7fe0a0' : d.alive ? '#ff9f43' : '#ff5d5d';
        g.beginPath();
        g.rect(x - 3, y - 3, 6, 6);
        g.fill();
      }
      // vehicle
      const [x, y] = this.xy(sim.state.lat, sim.state.lon, mw, mh);
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#4aa3ff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.stroke();
    }
    // legend
    g.font = '11px system-ui, sans-serif';
    const legend: [string, string][] = [['#fff', t('map.vehicle')], ['#4cd97b', t('map.site')], ['#4aa3ff', t('map.groundTrack')], ['rgba(255,255,255,0.8)', t('map.predicted')], ['#f2b134', t('map.target')], ['#ffd166', t('map.subsolar')], ['#ff5d5d', t('map.impact')], ['#7fe0a0', t('map.landing')]];
    // legend in the top-right corner (the event ticker occupies the bottom-left)
    const lw = Math.max(...legend.map(([, label]) => g.measureText(label).width)) + 26;
    const lx0 = mw - lw - 6;
    let ly = 16;
    for (const [c, label] of legend) {
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(lx0, ly - 10, lw, 15);
      g.fillStyle = c; g.fillRect(lx0 + 4, ly - 7, 10, 8);
      g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(label, lx0 + 20, ly + 1);
      ly += 17;
    }
    g.restore();
  }
}
