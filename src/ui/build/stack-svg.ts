/**
 * A vehicle's stack, standing or moved apart, drawn as SVG (the Build
 * section's drawings: the Watch level's exploded view, and the side view the
 * builders of D02 and D03 will draw a design with).
 *
 * The thin DOM part: the geometry is src/design/exploded.ts, the fit into the
 * box and the labels' places src/design/stack-drawing.ts. The SVG's viewBox is
 * the box it was laid out for, in px, so it scales with its container and its
 * text keeps its size; the screen lays it out again when the box changes. No
 * WebGL: a flat drawing needs none, and the app already runs two 3-D views.
 *
 * Every piece of hardware can be picked — by its shape, or by its label, which
 * is also the keyboard's way in (a label is a focusable button).
 */
import { t, getLang } from '../../i18n';
import type { VehicleSpec } from '../../types';
import { explodedView, type DrawnPart } from '../../design/exploded';
import { LABEL, fitFrame, layoutLabels, scaleBarLength, toPx, type Frame } from '../../design/stack-drawing';

const NS = 'http://www.w3.org/2000/svg';
/** px kept at the foot of the drawing for its scale bar */
const SCALE_STRIP = 24;

export interface StackLabel {
  /** the label's lines: what the part is, and its engine */
  lines: string[];
  /** its accessible name */
  name: string;
}

export interface StackSvgView {
  spec: VehicleSpec;
  /** 0 standing, 1 moved apart */
  explode: number;
  /** the piece of hardware whose card is open */
  selected: string | null;
  /** hardware a tour step points at; the rest is drawn faint (null: nothing is) */
  highlight: ReadonlySet<string> | null;
  label(p: DrawnPart): StackLabel;
  /** the drawing's accessible name */
  title: string;
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, cls?: string): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (cls) node.setAttribute('class', cls);
  return node;
}

const f1 = (v: number): string => (Math.round(v * 10) / 10).toString();

/** The outline as an SVG path, in px. */
function outlinePath(f: Frame, p: DrawnPart): string {
  const right = p.outline.map((o) => toPx(f, p.x + o.r, p.y + o.y));
  const left = [...p.outline].reverse().map((o) => toPx(f, p.x + o.l, p.y + o.y));
  return `M${[...right, ...left].map((q) => `${f1(q.x)},${f1(q.y)}`).join('L')}Z`;
}

/** A bell hanging under its part: narrow at the throat, wide at the exit. */
function bellPath(f: Frame, p: DrawnPart, b: { x: number; r: number; len: number }): string {
  const cx = p.x + b.x;
  const pts = [
    toPx(f, cx - 0.38 * b.r, p.y), toPx(f, cx + 0.38 * b.r, p.y),
    toPx(f, cx + b.r, p.y - b.len), toPx(f, cx - b.r, p.y - b.len),
  ];
  return `M${pts.map((q) => `${f1(q.x)},${f1(q.y)}`).join('L')}Z`;
}

/** The part's paint: the livery colour the data gives it. */
function paint(spec: VehicleSpec, p: DrawnPart): string {
  const st = spec.stages[p.stageIndex];
  if (p.kind === 'stage') return st.color ?? '#e8e8e8';
  if (p.kind === 'booster') return st.boosters?.[p.group]?.color ?? '#e8e8e8';
  if (p.kind === 'fairing') return spec.fairing?.color ?? '#eeeeee';
  return st.accentColor ?? '#8d949c';
}

export class StackSvg {
  readonly root: SVGSVGElement;

  constructor(private readonly pick: (ref: string) => void) {
    this.root = svg('svg', {}, 'bs-svg');
    this.root.setAttribute('role', 'group');
  }

  /** Lay the view out for a box of `width` × `height` px and draw it. */
  render(view: StackSvgView, width: number, height: number): void {
    const w = Math.max(160, Math.round(width)), h = Math.max(200, Math.round(height));
    const apart = explodedView(view.spec, 1);
    // one scale for both views: the exploded extent
    const frame = fitFrame(apart, { width: w, height: h - SCALE_STRIP });
    const drawing = view.explode >= 1 ? apart : explodedView(view.spec, view.explode);
    const root = this.root;
    root.setAttribute('viewBox', `0 0 ${w} ${h}`);
    root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    root.setAttribute('aria-label', view.title);
    root.replaceChildren();
    const dim = (p: DrawnPart): boolean => !!view.highlight && !view.highlight.has(p.ref);
    const cls = (p: DrawnPart, base: string): string =>
      `${base}${p.ref === view.selected ? ' sel' : ''}${dim(p) ? ' dim' : ''}${view.highlight?.has(p.ref) ? ' hi' : ''}`;

    // every bell first: an upper stage's hang inside the adapter below it when the stack stands
    const bells = svg('g', { 'aria-hidden': 'true' }, 'bs-bells');
    for (const p of drawing.parts) {
      for (const b of p.bells) {
        const path = svg('path', { d: bellPath(frame, p, b) }, cls(p, 'bs-bell'));
        path.dataset.ref = p.ref;
        bells.append(path);
      }
    }
    const body = svg('g', { 'aria-hidden': 'true' }, 'bs-parts');
    for (const p of drawing.parts) {
      const path = svg('path', { d: outlinePath(frame, p), fill: paint(view.spec, p) }, cls(p, `bs-part bs-${p.kind}`));
      path.dataset.ref = p.ref;
      const title = svg('title');
      title.textContent = view.label(p).name;
      path.append(title);
      body.append(path);
    }
    root.append(bells, body);
    for (const node of [bells, body]) {
      node.addEventListener('click', (e) => {
        const ref = (e.target as Element).getAttribute('data-ref');
        if (ref) this.pick(ref);
      });
    }

    // the labels, in a column on the right
    const labels = svg('g', {}, 'bs-labels');
    root.append(labels);
    const placed = layoutLabels(drawing, frame, (p) => view.label(p).lines.length);
    for (const l of placed) {
      const part = drawing.parts.find((p) => p.ref === l.ref && p.side !== -1)!;
      const text = view.label(part);
      const g = svg('g', { tabindex: 0, role: 'button', 'aria-label': text.name }, cls(part, 'bs-label'));
      g.dataset.ref = l.ref;
      if (l.ref === view.selected) g.setAttribute('aria-pressed', 'true');
      // on the page before its text is measured
      labels.append(g);
      const mid = l.top + l.height / 2;
      const x0 = frame.labelX;
      g.append(
        svg('polyline', { points: `${f1(l.anchorX)},${f1(l.anchorY)} ${f1(x0 - 8)},${f1(mid)} ${f1(x0 - 3)},${f1(mid)}` }, 'bs-leader'),
        svg('circle', { cx: f1(l.anchorX), cy: f1(l.anchorY), r: 2.4 }, 'bs-dot'),
      );
      // a hit area as tall as the label and as wide as its column
      g.append(svg('rect', { x: f1(x0 - 4), y: f1(l.top - 1), width: f1(frame.labelWidth + 4), height: f1(l.height + 2), rx: 4 }, 'bs-hit'));
      text.lines.slice(0, l.lines).forEach((line, k) => {
        const tx = svg('text', { x: f1(x0), y: f1(l.top + (k + 1) * LABEL.lineHeight - 4) }, k === 0 ? 'bs-l1' : 'bs-l2');
        tx.textContent = line;
        g.append(tx);
        fitText(tx, line, frame.labelWidth);
      });
      g.addEventListener('click', () => this.pick(l.ref));
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.pick(l.ref); }
      });
    }

    // a scale bar, so "to scale" can be read off
    const metres = scaleBarLength(apart.maxY - apart.minY);
    const len = metres * frame.scale;
    const y = h - 9, x = LABEL.pad;
    const bar = svg('g', { 'aria-hidden': 'true' }, 'bs-scale');
    bar.append(
      svg('path', { d: `M${f1(x)},${f1(y - 4)}V${f1(y)}H${f1(x + len)}V${f1(y - 4)}` }),
      Object.assign(svg('text', { x: f1(x + len + 6), y: f1(y) }), { textContent: `${metres.toLocaleString(getLang())} ${t('u.m')}` }),
    );
    root.append(bar);
  }

  /** Focus a label, after a re-render has replaced it. */
  focusLabel(ref: string): void {
    this.root.querySelector<SVGGElement>(`.bs-label[data-ref="${ref}"]`)?.focus();
  }
}

/** Shorten a line of SVG text with an ellipsis until it fits `width` px (measured once it is on the page). */
function fitText(node: SVGTextElement, text: string, width: number): void {
  if (!node.isConnected || typeof node.getComputedTextLength !== 'function') return;
  if (node.getComputedTextLength() <= width) return;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    node.textContent = `${text.slice(0, mid).trimEnd()}…`;
    if (node.getComputedTextLength() <= width) lo = mid; else hi = mid - 1;
  }
  node.textContent = `${text.slice(0, lo).trimEnd()}…`;
}
