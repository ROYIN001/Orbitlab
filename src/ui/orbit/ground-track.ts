/**
 * The orbit playground's ground track (roadmap O01): the point under the
 * satellite on a flat map of the Earth, where it has been over the last
 * revolution and where it is going, with the night side and the point under
 * the Sun of that moment. Where the playground's 3-D view shows the orbit as
 * it is, this shows what the ground sees of it: a geostationary satellite
 * standing on one spot, a sun-synchronous one crossing the equator at the
 * same local time, each revolution stepping west as the Earth turns beneath.
 *
 * Every point is `stateAt` of src/orbit/kepler.ts, the same as the 3-D view's.
 */
import { t } from '../../i18n';
import { DEG, RAD, R_EARTH } from '../../physics/constants';
import { sunDirectionEci } from '../../physics/orbital';
import type { OrbitState } from '../../orbit/kepler';
import { footprintCircle } from '../../orbit/applications';

/** O04: what an application adds to the map. */
export interface TrackOverlay {
  /** the ground station, rad */
  station?: { lat: number; lon: number };
  /** the footprint: its Earth central angle round the point below the satellite, rad */
  footprint?: number;
  /** the camera's swath, m, drawn along the next revolution */
  swath?: number;
}

/** The point `d` m from (lat, lon) along bearing `b` on the sphere, rad. */
function offset(lat: number, lon: number, b: number, d: number): { lat: number; lon: number } {
  const g = d / R_EARTH;
  const la = Math.asin(Math.sin(lat) * Math.cos(g) + Math.cos(lat) * Math.sin(g) * Math.cos(b));
  const lo = lon + Math.atan2(Math.sin(b) * Math.sin(g) * Math.cos(lat), Math.cos(g) - Math.sin(lat) * Math.sin(la));
  return { lat: la, lon: Math.atan2(Math.sin(lo), Math.cos(lo)) };
}

/** How far behind and ahead the track is drawn, s: a revolution back, three on, never more than a day. */
export function trackSpans(nodalPeriod: number): { past: number; future: number } {
  const day = 86400;
  return { past: Math.min(nodalPeriod, day), future: Math.min(3 * nodalPeriod, day) };
}

const COLORS = { past: 'rgba(239, 164, 126, 0.55)', future: '#efa47e', sat: '#ffffff', sun: '#ffd28a', night: 'rgba(0, 0, 10, 0.52)', station: '#c3a6ff',
  footprint: 'rgba(110, 200, 255, 0.95)', swath: 'rgba(125, 219, 160, 0.9)' };

export class GroundTrackView {
  private img: HTMLImageElement | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, imageUrl: string) {
    const img = new Image();
    img.onload = () => { this.img = img; };
    img.src = imageUrl;
  }

  /**
   * Draw the track around `time` (s after the orbit's epoch, Julian date
   * `jd`): `stateOf` says where the satellite is at any time — on one orbit,
   * or on a plan of several (O02) — and `period` how long a revolution takes.
   */
  draw(stateOf: (t: number) => OrbitState, time: number, jd: number, period: number, overlay: TrackOverlay = {}): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    if (W === 0 || H === 0) return;
    if (this.canvas.width !== Math.round(W * dpr) || this.canvas.height !== Math.round(H * dpr)) {
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(H * dpr);
    }
    const g = this.canvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#05080d';
    g.fillRect(0, 0, W, H);
    // the legend's entries, in as many lines as the width needs; over the map (under it, a card could cover it)
    g.font = '12px system-ui, sans-serif';
    const items: [string, string, number[]][] = [
      [COLORS.sat, t('pg.track.now'), []], [COLORS.future, t('pg.track.next'), []],
      [COLORS.past, t('pg.track.past'), [4, 4]], [COLORS.sun, t('pg.track.sun'), []],
    ];
    // O04: what an application adds
    if (overlay.station) items.push([COLORS.station, t('use.station'), []]);
    if (overlay.footprint) items.push([COLORS.footprint, t('use.footprint'), [1]]);
    if (overlay.swath) items.push([COLORS.swath, t('use.cam.swath'), [2, 3]]);
    const widths = items.map(([, label]) => 22 + g.measureText(label).width + 16);
    const lines = (width: number): number => {
      let n = 1, x = 0;
      for (const w of widths) { if (x + w > width && x > 0) { n++; x = 0; } x += w; }
      return n;
    };
    // a 2:1 map, as large as fits under its legend
    let mw = Math.min(W - 8, (H - 34) * 2);
    const legendH = 10 + 16 * lines(mw);
    mw = Math.min(W - 8, (H - legendH - 8) * 2);
    const mh = mw / 2;
    const ox = (W - mw) / 2, oy = Math.max(legendH + 4, (H - mh + legendH) / 2);
    const xy = (lat: number, lon: number): [number, number] => [ox + ((lon * RAD + 180) / 360) * mw, oy + ((90 - lat * RAD) / 180) * mh];
    g.save();
    g.beginPath();
    g.rect(ox, oy, mw, mh);
    g.clip();
    if (this.img) g.drawImage(this.img, ox, oy, mw, mh);
    else { g.fillStyle = '#12263a'; g.fillRect(ox, oy, mw, mh); }
    // the graticule, every 30°
    g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    g.lineWidth = 1;
    for (let lon = -150; lon <= 150; lon += 30) { const [x] = xy(0, lon * DEG); g.beginPath(); g.moveTo(x, oy); g.lineTo(x, oy + mh); g.stroke(); }
    for (let lat = -60; lat <= 60; lat += 30) { const [, y] = xy(lat * DEG, 0); g.beginPath(); g.moveTo(ox, y); g.lineTo(ox + mw, y); g.stroke(); }
    g.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    { const [, y] = xy(0, 0); g.beginPath(); g.moveTo(ox, y); g.lineTo(ox + mw, y); g.stroke(); }

    // the night side, bounded by the terminator (as src/ui/map.ts draws it)
    const now = stateOf(time);
    const sun = sunDirectionEci(jd);
    const subLat = Math.asin(sun.z);
    const subLon = wrapLon(Math.atan2(sun.y, sun.x) - now.theta);
    const tanDec = Math.abs(Math.tan(subLat)) < 1e-6 ? (subLat < 0 ? -1e-6 : 1e-6) : Math.tan(subLat);
    g.fillStyle = COLORS.night;
    g.beginPath();
    for (let k = 0; k <= 180; k++) {
      const lon = -Math.PI + (2 * Math.PI * k) / 180;
      const [x, y] = xy(Math.atan(-Math.cos(lon - subLon) / tanDec), lon);
      if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    const darkPole = subLat > 0 ? oy + mh : oy;
    g.lineTo(ox + mw, darkPole);
    g.lineTo(ox, darkPole);
    g.closePath();
    g.fill();

    // the track: a revolution back, faint; the next ones, bright
    const span = trackSpans(period);
    const samples = (dt: number) => Math.max(120, Math.min(900, Math.round((dt / period) * 240)));
    this.track(g, stateOf, time - span.past, time, samples(span.past), xy, mw, COLORS.past, 1.5, [4, 4]);
    this.track(g, stateOf, time, time + span.future, samples(span.future), xy, mw, COLORS.future, 2, []);

    // O04: the camera's swath along the next revolution, the footprint, the ground station
    if (overlay.swath && overlay.swath > 0) {
      const n = 360, pts = Array.from({ length: n }, (_, k) => stateOf(time + (period * k) / (n - 1)));
      const edges: { lat: number; lon: number }[][] = [[], []];
      for (let k = 0; k < n - 1; k++) {
        const a = pts[k], b = pts[k + 1];
        const bearing = Math.atan2(Math.sin(b.lon - a.lon) * Math.cos(b.lat), Math.cos(a.lat) * Math.sin(b.lat) - Math.sin(a.lat) * Math.cos(b.lat) * Math.cos(b.lon - a.lon));
        edges[0].push(offset(a.lat, a.lon, bearing - Math.PI / 2, overlay.swath / 2));
        edges[1].push(offset(a.lat, a.lon, bearing + Math.PI / 2, overlay.swath / 2));
      }
      for (const e of edges) this.line(g, e, xy, mw, COLORS.swath, 1.2, [2, 3]);
    }
    if (overlay.footprint && overlay.footprint > 0) {
      this.line(g, footprintCircle(now.lat, now.lon, overlay.footprint, 180), xy, mw, COLORS.footprint, 1.6, []);
    }
    if (overlay.station) {
      const [x, y] = xy(overlay.station.lat, overlay.station.lon);
      g.fillStyle = COLORS.station;
      g.strokeStyle = 'rgba(5, 8, 13, 0.9)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 6, y); g.lineTo(x, y + 7); g.lineTo(x - 6, y); g.closePath(); g.fill(); g.stroke();
    }

    // the point under the Sun, and the one under the satellite
    { const [x, y] = xy(subLat, subLon); g.fillStyle = COLORS.sun; g.beginPath(); g.arc(x, y, 4.5, 0, 2 * Math.PI); g.fill(); }
    {
      const [x, y] = xy(now.lat, now.lon);
      g.fillStyle = COLORS.sat;
      g.strokeStyle = 'rgba(5, 8, 13, 0.9)';
      g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, 5.5, 0, 2 * Math.PI); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      g.lineWidth = 1.2;
      g.beginPath(); g.arc(x, y, 10, 0, 2 * Math.PI); g.stroke();
    }
    g.restore();
    g.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    g.strokeRect(ox + 0.5, oy + 0.5, mw - 1, mh - 1);

    // the legend, over the map
    g.textBaseline = 'middle';
    let x = ox, y = oy - legendH + 12;
    items.forEach(([color, label, dash], k) => {
      if (x + widths[k] > ox + mw && x > ox) { x = ox; y += 16; }
      g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 2; g.setLineDash(dash);
      if (dash.length || color === COLORS.future) { g.setLineDash(dash.length > 1 ? dash : []); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 16, y); g.stroke(); }
      else { g.beginPath(); g.arc(x + 8, y, 4, 0, 2 * Math.PI); g.fill(); }
      g.setLineDash([]);
      g.fillStyle = '#b8c5d3';
      g.fillText(label, x + 22, y);
      x += widths[k];
    });
  }

  /** A polyline of (lat, lon) points, split where it crosses the date line. */
  private line(g: CanvasRenderingContext2D, pts: { lat: number; lon: number }[], xy: (lat: number, lon: number) => [number, number],
    mw: number, color: string, width: number, dash: number[]): void {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.setLineDash(dash);
    g.beginPath();
    let prevX = NaN;
    pts.forEach((p, k) => {
      const [x, y] = xy(p.lat, p.lon);
      if (k === 0 || Math.abs(x - prevX) > mw / 2) g.moveTo(x, y); else g.lineTo(x, y);
      prevX = x;
    });
    g.stroke();
    g.setLineDash([]);
  }

  private track(g: CanvasRenderingContext2D, stateOf: (t: number) => OrbitState, t0: number, t1: number, n: number,
    xy: (lat: number, lon: number) => [number, number], mw: number, color: string, width: number, dash: number[]): void {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.setLineDash(dash);
    g.beginPath();
    let prevX = NaN;
    for (let k = 0; k < n; k++) {
      const s = stateOf(t0 + ((t1 - t0) * k) / (n - 1));
      const [x, y] = xy(s.lat, s.lon);
      // across the date line the track leaves one edge and comes in at the other
      if (k === 0 || Math.abs(x - prevX) > mw / 2) g.moveTo(x, y); else g.lineTo(x, y);
      prevX = x;
    }
    g.stroke();
    g.setLineDash([]);
  }
}

function wrapLon(lon: number): number {
  return ((((lon + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
}
