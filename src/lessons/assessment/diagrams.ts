/**
 * The placement test's diagrams (roadmap E03): an orbit and its apsides, a
 * Hohmann transfer, the orbital plane, the forces on a rocket, a ground
 * track, step responses, a Bode plot, dispersed flights, three inertial units
 * voting, ascent trajectories. SVG text, DOM-free like `figures.ts`.
 *
 * Points are marked with letters, so a diagram reads the same in every
 * language; the question says what the letters stand for. A diagram that a
 * numeric question reads from is drawn with the student's own numbers, so
 * the value read off it is theirs.
 */
import { niceStep } from './figures';

export const DIAGRAM_IDS: readonly string[] = [
  'orbit-ellipse', 'hohmann', 'orbit-plane', 'forces', 'ground-track', 'step-response', 'step-compare',
  'bode', 'dispersion', 'imu-votes', 'trajectories',
];

/** A unit's symbol in the reader's language (the page passes `unitText`). */
export type UnitText = (unit: string) => string;

const INK = '#e8eef6', DIM = '#8494a8', GRID = '#26303c';
const COLOURS = ['#6ec8ff', '#f5c451', '#ff8a8a', '#7ddba0'];
const f1 = (v: number): string => v.toFixed(1);
const svg = (w: number, h: number, body: string[]): string =>
  `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" class="lesson-chart lesson-diagram">${body.join('')}</svg>`;

/** A lettered mark: a gold disc with the letter, offset from the point it names. */
function mark(x: number, y: number, letter: string, dx = 0, dy = 0): string {
  const cx = x + dx, cy = y + dy;
  return (dx || dy ? `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(cx)}" y2="${f1(cy)}" stroke="#f5c451" stroke-width="1"/>` : '')
    + `<circle cx="${f1(x)}" cy="${f1(y)}" r="3.5" fill="#f5c451"/>`
    + `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="11" fill="#f5c451"/>`
    + `<text x="${f1(cx)}" y="${f1(cy + 4.5)}" text-anchor="middle" font-size="13" font-weight="700" fill="#221700">${letter}</text>`;
}

function arrow(x1: number, y1: number, x2: number, y2: number, colour: string, width = 2.5): string {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 9;
  const p1 = [x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4)], p2 = [x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4)];
  return `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${colour}" stroke-width="${width}"/>`
    + `<polygon points="${f1(x2)},${f1(y2)} ${f1(p1[0])},${f1(p1[1])} ${f1(p2[0])},${f1(p2[1])}" fill="${colour}"/>`;
}

const earth = (x: number, y: number, r: number): string =>
  `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="#1d4f7a" stroke="#6ec8ff" stroke-width="1"/>`;

// ─── plots ─────────────────────────────────────────────────────────────────

interface Line { x: number[]; y: number[]; colour?: string; dash?: boolean; label?: string }
interface PlotOptions {
  width?: number; height?: number; left?: number; top?: number;
  x: [number, number]; y: [number, number]; xStep?: number; yStep?: number; logX?: boolean;
  xLabel: string; yLabel: string; yFormat?: (v: number) => string; minorY?: number;
}

/** A plot's axes and lines; returns the SVG parts and the scale, for marks on top. */
function plot(o: PlotOptions, lines: Line[]): { parts: string[]; X: (v: number) => number; Y: (v: number) => number; W: number; H: number } {
  const W = o.width ?? 520, H = o.height ?? 270, L = o.left ?? 52, R = 14, T = o.top ?? 18, B = 34;
  const lx = (v: number) => (o.logX ? Math.log10(v) : v);
  const [x0, x1] = [lx(o.x[0]), lx(o.x[1])];
  const X = (v: number) => L + ((lx(v) - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v: number) => H - B - ((v - o.y[0]) / (o.y[1] - o.y[0])) * (H - T - B);
  const parts: string[] = [];
  const fy = o.yFormat ?? ((v: number) => String(Number(v.toFixed(3))));
  if (o.minorY) for (let v = o.y[0]; v <= o.y[1] + 1e-9; v += o.minorY) parts.push(`<line x1="${L}" x2="${W - R}" y1="${f1(Y(v))}" y2="${f1(Y(v))}" stroke="${GRID}" stroke-width="0.6"/>`);
  const ys = o.yStep ?? niceStep(o.y[1] - o.y[0]);
  for (let v = Math.ceil(o.y[0] / ys - 1e-9) * ys; v <= o.y[1] + 1e-9; v += ys) {
    parts.push(`<line x1="${L}" x2="${W - R}" y1="${f1(Y(v))}" y2="${f1(Y(v))}" stroke="${GRID}" stroke-width="1.2"/>`,
      `<text x="${L - 6}" y="${f1(Y(v) + 4)}" text-anchor="end" class="tick">${fy(v)}</text>`);
  }
  if (o.logX) {
    for (let d = Math.floor(x0); d <= Math.ceil(x1); d++) for (let m = 1; m < 10; m++) {
      const v = m * 10 ** d;
      if (v < o.x[0] - 1e-12 || v > o.x[1] + 1e-12) continue;
      parts.push(`<line x1="${f1(X(v))}" x2="${f1(X(v))}" y1="${T}" y2="${H - B}" stroke="${GRID}" stroke-width="${m === 1 ? 1.2 : 0.6}"/>`);
      if (m === 1) parts.push(`<text x="${f1(X(v))}" y="${H - B + 15}" text-anchor="middle" class="tick">${String(Number(v.toPrecision(3)))}</text>`);
    }
  } else {
    const xs = o.xStep ?? niceStep(o.x[1] - o.x[0], 6);
    for (let v = o.x[0]; v <= o.x[1] + 1e-9; v += xs) parts.push(`<line x1="${f1(X(v))}" x2="${f1(X(v))}" y1="${T}" y2="${H - B}" stroke="${GRID}" stroke-width="1"/>`,
      `<text x="${f1(X(v))}" y="${H - B + 15}" text-anchor="middle" class="tick">${String(Number(v.toFixed(3)))}</text>`);
  }
  lines.forEach((l, k) => {
    const pts = l.x.map((x, i) => `${f1(X(x))},${f1(Y(Math.max(o.y[0], Math.min(o.y[1], l.y[i]))))}`);
    parts.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${l.colour ?? COLOURS[k % COLOURS.length]}" stroke-width="2"${l.dash ? ' stroke-dasharray="6 4"' : ''}/>`);
  });
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle" class="axis">${o.xLabel}</text>`,
    `<text x="${L}" y="${T - 5}" class="axis">${o.yLabel}</text>`);
  return { parts, X, Y, W, H };
}

const range = (a: number, b: number, n: number): number[] => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

/** The unit step response of ω²/(s² + 2ζωs + ω²), ω = 1 rad/s. */
export function stepResponse(zeta: number, t: number): number {
  if (zeta >= 1) return 1 - (1 + t) * Math.exp(-t);
  const wd = Math.sqrt(1 - zeta * zeta);
  return 1 - (Math.exp(-zeta * t) / wd) * Math.sin(wd * t + Math.acos(zeta));
}

/** A small seeded generator (the diagram is the same for every student who sees it). */
function noise(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r: () => number): number => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r());

// ─── the diagrams ──────────────────────────────────────────────────────────

type Draw = (v: Readonly<Record<string, number>>, unit: UnitText) => string;

const DIAGRAMS: Readonly<Record<string, Draw>> = {
  /** An elliptical orbit, the Earth at its right-hand focus: A perigee, B apogee, C and D the ends of the minor axis. */
  'orbit-ellipse': () => {
    const cx = 260, cy = 180, a = 205, e = 0.6, b = a * Math.sqrt(1 - e * e), c = a * e;
    return svg(520, 360, [
      `<ellipse cx="${cx}" cy="${cy}" rx="${a}" ry="${f1(b)}" fill="none" stroke="#6ec8ff" stroke-width="2"/>`,
      earth(cx + c, cy, 24),
      arrow(cx + 30, cy - b + 1.5, cx - 10, cy - b, '#6ec8ff', 2),
      mark(cx + a, cy, 'A', -26, -26), mark(cx - a, cy, 'B', 26, -26), mark(cx, cy - b, 'C', -26, 20), mark(cx, cy + b, 'D', 0, -26),
    ]);
  },
  /** Two circular orbits and the transfer ellipse between them, flown anticlockwise. */
  'hohmann': () => {
    const cx = 260, cy = 180, r1 = 66, r2 = 140, a = (r1 + r2) / 2, c = a - r1, b = Math.sqrt(r1 * r2);
    return svg(520, 360, [
      `<circle cx="${cx}" cy="${cy}" r="${r1}" fill="none" stroke="#6ec8ff" stroke-width="2"/>`,
      `<circle cx="${cx}" cy="${cy}" r="${r2}" fill="none" stroke="#7ddba0" stroke-width="2"/>`,
      `<path d="M ${cx + r1} ${cy} A ${a} ${f1(b)} 0 0 0 ${cx - r2} ${cy}" fill="none" stroke="#f5c451" stroke-width="2" stroke-dasharray="7 5"/>`,
      earth(cx, cy, 24),
      arrow(cx - c + 6, cy - b, cx - c - 16, cy - b + 1, '#f5c451', 2),
      mark(cx + r1, cy, 'A', 26, 16), mark(cx - r2, cy, 'B', -4, 26), mark(cx, cy - r2, 'C', 24, -12), mark(cx, cy + r1, 'D', 0, 22),
    ]);
  },
  /** The equator's plane and an orbit inclined 45°, flown the way the arrow shows: A and B the nodes, C the node's longitude from ♈. */
  'orbit-plane': () => {
    // the equator's plane seen from 22° above it
    const cx = 260, cy = 175, R = 185, el = 22 * Math.PI / 180, inc = 45 * Math.PI / 180, node = -28 * Math.PI / 180;
    const P = (X: number, Y: number, Z: number): [number, number] => [cx + X, cy + Y * Math.sin(el) - Z * Math.cos(el)];
    const n = [Math.cos(node), Math.sin(node), 0], m = [-Math.sin(node) * Math.cos(inc), Math.cos(node) * Math.cos(inc), Math.sin(inc)];
    const orbit = (u: number, r = R): [number, number] => P(r * (n[0] * Math.cos(u) + m[0] * Math.sin(u)), r * (n[1] * Math.cos(u) + m[1] * Math.sin(u)), r * m[2] * Math.sin(u));
    const poly = (f: (k: number) => [number, number], k: number) => Array.from({ length: k + 1 }, (_, q) => f(q).map(f1).join(',')).join(' ');
    const [ax, ay] = orbit(0), [bx, by] = orbit(Math.PI), [nx, ny] = orbit(0.32);
    // the vernal equinox's direction, and the node's longitude measured from it in the equator's plane
    const aries = 235 * Math.PI / 180;
    const [qx, qy] = P(R * 0.85 * Math.cos(aries), R * 0.85 * Math.sin(aries), 0);
    const raan = poly((k) => { const q = aries + (node + 2 * Math.PI - aries) * (k / 30); return P(R * 0.5 * Math.cos(q), R * 0.5 * Math.sin(q), 0); }, 30);
    const qm = aries + (node + 2 * Math.PI - aries) * 0.5, [dx, dy] = P(R * 0.5 * Math.cos(qm), R * 0.5 * Math.sin(qm), 0);
    return svg(520, 340, [
      `<polygon points="${poly((k) => P(R * Math.cos((k / 90) * 2 * Math.PI), R * Math.sin((k / 90) * 2 * Math.PI), 0), 90)}" fill="rgba(110,200,255,0.08)" stroke="#6ec8ff" stroke-width="1.5"/>`,
      earth(cx, cy, 30),
      `<line x1="${cx}" y1="${cy - 30}" x2="${cx}" y2="${cy - 160}" stroke="${DIM}" stroke-width="1.2"/>`,
      `<text x="${cx + 6}" y="${cy - 150}" class="tick">N</text>`,
      `<line x1="${f1(bx)}" y1="${f1(by)}" x2="${f1(ax)}" y2="${f1(ay)}" stroke="${DIM}" stroke-dasharray="4 4"/>`,
      `<polyline points="${poly((k) => orbit((k / 120) * 2 * Math.PI), 120)}" fill="none" stroke="#f5c451" stroke-width="2"/>`,
      arrow(ax, ay, nx, ny, '#f5c451', 2.5),
      arrow(cx, cy, qx, qy, INK, 1.5), `<text x="${f1(qx - 22)}" y="${f1(qy + 6)}" fill="${INK}" font-size="16">♈︎</text>`,
      `<polyline points="${raan}" fill="none" stroke="${INK}" stroke-width="1.2"/>`,
      mark(ax, ay, 'A', 26, 12), mark(bx, by, 'B', -24, 14), mark(dx, dy, 'C', 4, -26),
    ]);
  },
  /** A rocket climbing at 35° from the vertical, with four forces on it. */
  'forces': () => {
    const cx = 250, cy = 170, ang = 35 * Math.PI / 180;
    const ux = Math.sin(ang), uy = -Math.cos(ang);
    const body = (s: number, n: number): [number, number] => [cx + ux * s - uy * n, cy + uy * s + ux * n];
    const outline = [body(70, 0), body(46, 11), body(-62, 11), body(-70, 17), body(-70, -17), body(-62, -11), body(46, -11)];
    // the velocity a little below the body's axis: a small angle of attack
    const va = ang + 6 * Math.PI / 180, vx = Math.sin(va), vy = -Math.cos(va);
    return svg(520, 340, [
      `<polygon points="${outline.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ')}" fill="#dfe6ee" stroke="#9fb0c4"/>`,
      arrow(...body(72, 0), ...body(150, 0), '#6ec8ff'),
      arrow(cx, cy, cx - vx * 90, cy - vy * 90, '#ff8a8a'),
      arrow(cx, cy, cx, cy + 95, '#7ddba0'),
      arrow(...body(10, 0), ...body(10, -62), '#c9a0ff'),
      `<line x1="${f1(cx + vx * 20)}" y1="${f1(cy + vy * 20)}" x2="${f1(cx + vx * 170)}" y2="${f1(cy + vy * 170)}" stroke="${DIM}" stroke-dasharray="4 4"/>`,
      `<text x="${f1(cx + vx * 172)}" y="${f1(cy + vy * 172 - 4)}" class="tick">v</text>`,
      mark(...body(150, 0), 'A', 18, -8), mark(cx - vx * 90, cy - vy * 90, 'B', -18, 12), mark(cx, cy + 95, 'C', 20, 4),
      mark(...body(10, -62), 'D', -20, -6),
    ]);
  },
  /** Two orbits' ground track on a map grid, for an inclination `i` (°). */
  'ground-track': (v, unit) => {
    const inc = (v.i ?? 51.6) * Math.PI / 180, period = 92 * 60, we = 7.2921159e-5;
    const W = 540, H = 300;
    const segs: string[][] = [[]];
    let last: number | null = null;
    for (let k = 0; k <= 800; k++) {
      const t = (k / 800) * 2 * period, u = (2 * Math.PI * t) / period;
      const lat = Math.asin(Math.sin(inc) * Math.sin(u));
      let lon = Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u)) - we * t - 1.6;
      lon = ((lon + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
      if (last !== null && Math.abs(lon - last) > Math.PI) segs.push([]);
      last = lon;
      segs[segs.length - 1].push(`${lon * 180 / Math.PI},${lat * 180 / Math.PI}`);
    }
    const p = plot({ width: W, height: H, x: [-180, 180], y: [-90, 90], xStep: 60, yStep: 15, minorY: 5, xLabel: `λ, °`, yLabel: `φ, °` }, []);
    for (const s of segs) {
      const pts = s.map((q) => { const [x, y] = q.split(',').map(Number); return `${f1(p.X(x))},${f1(p.Y(y))}`; });
      p.parts.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="#f5c451" stroke-width="2"/>`);
    }
    p.parts.push(`<line x1="${f1(p.X(-180))}" x2="${f1(p.X(180))}" y1="${f1(p.Y(0))}" y2="${f1(p.Y(0))}" stroke="${DIM}" stroke-width="1.5"/>`);
    void unit;
    return svg(W, H, p.parts);
  },
  /** One loop's step response, damping ratio `z`. */
  'step-response': (v, unit) => {
    const z = v.z ?? 0.3, t = range(0, 20, 400);
    const p = plot({ x: [0, 20], y: [0, 1.8], yStep: 0.2, minorY: 0.1, xStep: 2, xLabel: `t, ${unit('s')}`, yLabel: 'y / y∞' },
      [{ x: t, y: t.map((s) => stepResponse(z, s)) }]);
    p.parts.push(`<line x1="${f1(p.X(0))}" x2="${f1(p.X(20))}" y1="${f1(p.Y(1))}" y2="${f1(p.Y(1))}" stroke="${INK}" stroke-dasharray="5 4"/>`);
    return svg(p.W, p.H, p.parts);
  },
  /** Three loops' step responses: A ζ = 0.7, B ζ = 0.15, C ζ = 0.4. */
  'step-compare': (_, unit) => {
    const t = range(0, 25, 400);
    const p = plot({ x: [0, 25], y: [0, 1.8], yStep: 0.2, xStep: 5, xLabel: `t, ${unit('s')}`, yLabel: 'y / y∞' },
      [0.7, 0.15, 0.4].map((z, k) => ({ x: t, y: t.map((s) => stepResponse(z, s)), colour: COLOURS[k], dash: k === 2 })));
    const tag = (z: number, at: number, letter: string, dx: number, dy: number) => mark(p.X(at), p.Y(stepResponse(z, at)), letter, dx, dy);
    p.parts.push(tag(0.7, 5.5, 'A', 16, 22), tag(0.15, 3.2, 'B', 22, -8), tag(0.4, 3.4, 'C', -26, -12));
    return svg(p.W, p.H, p.parts);
  },
  /** The open loop K / (s(τs + 1)), τ = 0.5 s: magnitude and phase. */
  'bode': (v, unit) => {
    const K = v.K ?? 4, tau = 0.5;
    const w = range(-1, 2, 300).map((e) => 10 ** e);
    const mag = w.map((x) => 20 * Math.log10(K / (x * Math.sqrt(1 + (tau * x) ** 2))));
    const ph = w.map((x) => -90 - (Math.atan(tau * x) * 180) / Math.PI);
    const top = plot({ height: 190, x: [0.1, 100], y: [-60, 40], yStep: 20, logX: true, xLabel: '', yLabel: 'L, dB'.replace('dB', unit('dB')) },
      [{ x: w, y: mag }]);
    top.parts.push(`<line x1="${f1(top.X(0.1))}" x2="${f1(top.X(100))}" y1="${f1(top.Y(0))}" y2="${f1(top.Y(0))}" stroke="${INK}" stroke-width="1.5"/>`);
    const bottom = plot({ height: 210, top: 22, x: [0.1, 100], y: [-180, -90], yStep: 15, minorY: 5, logX: true, xLabel: `ω, ${unit('rad/s')}`, yLabel: 'φ, °' },
      [{ x: w, y: ph, colour: '#f5c451' }]);
    bottom.parts.push(`<line x1="${f1(bottom.X(0.1))}" x2="${f1(bottom.X(100))}" y1="${f1(bottom.Y(-180))}" y2="${f1(bottom.Y(-180))}" stroke="${INK}" stroke-width="1.5"/>`);
    return svg(520, 400, [...top.parts, `<g transform="translate(0,190)">${bottom.parts.join('')}</g>`]);
  },
  /** Where 300 dispersed flights put the payload, with the 1σ, 2σ and 3σ ellipses (A, B, C). */
  'dispersion': (_, unit) => {
    const r = noise(20260926);
    const sx = 1.6, sy = 0.9;
    const pts = Array.from({ length: 300 }, () => [gauss(r) * sx, gauss(r) * sy]);
    const p = plot({ width: 520, height: 300, x: [-6, 6], y: [-3.5, 3.5], xStep: 2, yStep: 1, xLabel: `Δh_a, ${unit('km')}`, yLabel: 'Δi, 0.01°' }, []);
    for (const [x, y] of pts) p.parts.push(`<circle cx="${f1(p.X(x))}" cy="${f1(p.Y(y))}" r="1.8" fill="#6ec8ff" opacity="0.75"/>`);
    const rx = (k: number) => p.X(k * sx) - p.X(0), ry = (k: number) => p.Y(0) - p.Y(k * sy);
    [1, 2, 3].forEach((k, i) => p.parts.push(`<ellipse cx="${f1(p.X(0))}" cy="${f1(p.Y(0))}" rx="${f1(rx(k))}" ry="${f1(ry(k))}" fill="none" stroke="${['#7ddba0', '#f5c451', '#ff8a8a'][i]}" stroke-width="1.8"/>`));
    const c45 = Math.SQRT1_2;
    p.parts.push(mark(p.X(sx * c45), p.Y(sy * c45), 'A', 18, -18), mark(p.X(2 * sx * c45), p.Y(-2 * sy * c45), 'B', 18, 16), mark(p.X(-3 * sx * c45), p.Y(3 * sy * c45), 'C', -18, -12));
    return svg(p.W, p.H, p.parts);
  },
  /** Three inertial units' pitch rates: A and B agree; C drifts away from about T+25 s. */
  'imu-votes': (_, unit) => {
    const r = noise(7);
    const t = range(0, 60, 240);
    const truth = (s: number) => 0.6 * Math.sin(s / 9) - 0.2;
    const ln = (drift: (s: number) => number) => t.map((s) => truth(s) + drift(s) + gauss(r) * 0.03);
    const p = plot({ x: [0, 60], y: [-1.5, 2.5], yStep: 0.5, xStep: 10, xLabel: `t, ${unit('s')}`, yLabel: 'ω_z, °/s' }, [
      { x: t, y: ln(() => 0), colour: COLOURS[0] },
      { x: t, y: ln(() => 0.02), colour: COLOURS[1], dash: true },
      { x: t, y: ln((s) => (s > 25 ? (s - 25) * 0.06 : 0)), colour: COLOURS[2] },
    ]);
    p.parts.push(mark(p.X(52), p.Y(truth(52)), 'A', 0, 30), mark(p.X(12), p.Y(truth(12) + 0.02), 'B', 0, -28), mark(p.X(55), p.Y(truth(55) + 1.8), 'C', 16, -10));
    return svg(p.W, p.H, p.parts);
  },
  /** Three ascents to the same orbit: A lofted, B nominal, C depressed. */
  'trajectories': (_, unit) => {
    const x = range(0, 1600, 200);
    const shape = (k: number) => x.map((d) => 200 * (1 - Math.exp(-d / k)));
    const lofted = x.map((d, i) => shape(90)[i] + 55 * Math.exp(-(((d - 420) / 260) ** 2)));
    const at = (ys: number[], d: number) => ys[Math.round(d / 8)];
    const nominal = shape(230), depressed = shape(420);
    const p = plot({ x: [0, 1600], y: [0, 280], xStep: 200, yStep: 50, xLabel: `L, ${unit('km')}`, yLabel: `h, ${unit('km')}` }, [
      { x, y: lofted, colour: COLOURS[0] }, { x, y: nominal, colour: COLOURS[1], dash: true }, { x, y: depressed, colour: COLOURS[2] },
    ]);
    p.parts.push(mark(p.X(400), p.Y(at(lofted, 400)), 'A', 0, -22), mark(p.X(560), p.Y(at(nominal, 560)), 'B', 16, 18), mark(p.X(760), p.Y(at(depressed, 760)), 'C', 16, 20));
    return svg(p.W, p.H, p.parts);
  },
};

/** A diagram as SVG text, with the student's numbers, or null for an unknown id. */
export function diagramSvg(id: string, values: Readonly<Record<string, number>> = {}, unit: UnitText = (u) => u): string | null {
  const draw = DIAGRAMS[id];
  return draw ? draw(values, unit) : null;
}
