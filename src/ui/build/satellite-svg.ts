/**
 * R3.3: the satellite schematic, drawn as SVG from `satelliteDrawing`
 * (src/design/satellite-drawing.ts). A front view to scale: the bus, a
 * tracking array's two wings, body or spinner cells, the dish and the
 * camera's barrel under it (the Earth-facing face) and the engine above.
 * The placement of each part is one of the drawing's stated assumptions,
 * which the bench lists under the picture.
 *
 * The thin DOM part, like `StackSvg`: no WebGL, the viewBox is the box it was
 * laid out for, and every part carries `data-part` so the bench can highlight
 * the subsystem of the open tab. The keyboard's way in is the bench's list of
 * part buttons, not the shapes.
 */
import { getLang, t } from '../../i18n';
import type { SatelliteDrawing, SatellitePart } from '../../design/satellite-drawing';
import { scaleBarLength } from '../../design/stack-drawing';

const NS = 'http://www.w3.org/2000/svg';
const PAD = 14;
/** px kept at the foot for the scale bar and the Earth arrow */
const FOOT = 26;

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, cls?: string): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (cls) node.setAttribute('class', cls);
  return node;
}

const f1 = (v: number): string => (Math.round(v * 10) / 10).toString();

/** Each part's name, the tooltip of its shape. */
const PART_NAME: Record<SatellitePart, string> = {
  bus: 'build.sat.preview.part.bus', arrays: 'build.sat.preview.part.arrays', antenna: 'build.sat.preview.part.antenna',
  camera: 'build.sat.preview.part.camera', engine: 'build.sat.preview.part.engine',
};

export function renderSatelliteSvg(root: SVGSVGElement, g: SatelliteDrawing, box: { width: number; height: number },
  opts: { highlight: SatellitePart | null; title: string; pick?: (part: SatellitePart) => void }): void {
  const W = Math.max(200, Math.round(box.width)), H = Math.max(160, Math.round(box.height));
  root.setAttribute('viewBox', `0 0 ${W} ${H}`);
  root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', opts.title);
  root.replaceChildren();
  const s = Math.min((W - 2 * PAD) / g.extent.width, (H - 2 * PAD - FOOT) / g.extent.height);
  const cx = W / 2;
  const above = g.engine ? Math.min(g.bus.height, g.bus.width) * 0.35 : 0;
  const busTop = PAD + above * s + ((H - 2 * PAD - FOOT) - g.extent.height * s) / 2;
  const bw = g.bus.width * s, bh = g.bus.height * s;
  const busLeft = cx - bw / 2, busBottom = busTop + bh;
  const cls = (part: SatellitePart, base: string): string => `${base} sd-part${opts.highlight === part ? ' hi' : opts.highlight ? ' dim' : ''}`;
  const tag = (node: SVGElement, part: SatellitePart): SVGElement => {
    node.dataset.part = part;
    const title = svg('title');
    title.textContent = t(PART_NAME[part]);
    node.append(title);
    if (opts.pick) node.addEventListener('click', () => opts.pick!(part));
    return node;
  };

  // the array first, behind the bus
  if (g.wings) {
    const gap = 0.08 * g.bus.width * s, span = g.wings.span * s, wh = g.wings.height * s;
    const group = svg('g', {}, cls('arrays', 'sd-arrays'));
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? busLeft - gap - span : busLeft + bw + gap;
      group.append(svg('line', { x1: f1(side < 0 ? busLeft : busLeft + bw), y1: f1(busTop + bh / 2), x2: f1(side < 0 ? x0 + span : x0), y2: f1(busTop + bh / 2) }, 'sd-yoke'));
      group.append(svg('rect', { x: f1(x0), y: f1(busTop + (bh - wh) / 2), width: f1(span), height: f1(wh) }, 'sd-wing'));
      // cell rows, for reading it as a wing at a glance
      for (let k = 1; k < 4; k++) {
        const x = x0 + (span * k) / 4;
        group.append(svg('line', { x1: f1(x), y1: f1(busTop + (bh - wh) / 2), x2: f1(x), y2: f1(busTop + (bh + wh) / 2) }, 'sd-cellline'));
      }
    }
    root.append(tag(group, 'arrays'));
  }

  // the engine's nozzle on the face opposite the Earth
  if (g.engine) {
    const nw = Math.min(bw * 0.35, above * s * 1.1), nh = above * s;
    const path = svg('path', { d: `M${f1(cx - nw * 0.25)},${f1(busTop)}L${f1(cx + nw * 0.25)},${f1(busTop)}L${f1(cx + nw / 2)},${f1(busTop - nh)}L${f1(cx - nw / 2)},${f1(busTop - nh)}Z` }, cls('engine', 'sd-engine'));
    root.append(tag(path, 'engine'));
  }

  // the bus, with its cells when they are on it
  const bus = svg('g', {}, cls('bus', 'sd-busg'));
  bus.append(svg('rect', { x: f1(busLeft), y: f1(busTop), width: f1(bw), height: f1(bh), rx: 2 }, 'sd-bus'));
  root.append(tag(bus, 'bus'));
  if (g.cells) {
    const cells = svg('g', {}, cls('arrays', 'sd-arrays'));
    if (g.cells.mount === 'spinner') {
      cells.append(svg('ellipse', { cx: f1(cx), cy: f1(busTop), rx: f1(bw / 2), ry: f1(Math.min(bh * 0.12, bw * 0.15)) }, 'sd-cells'));
      for (let k = 1; k < 6; k++) cells.append(svg('line', { x1: f1(busLeft + (bw * k) / 6), y1: f1(busTop), x2: f1(busLeft + (bw * k) / 6), y2: f1(busBottom) }, 'sd-cellline'));
    } else {
      const inset = Math.min(bw, bh) * 0.08;
      cells.append(svg('rect', { x: f1(busLeft + inset), y: f1(busTop + inset), width: f1(bw - 2 * inset), height: f1(bh - 2 * inset) }, 'sd-cells'));
    }
    root.append(tag(cells, 'arrays'));
  }

  // the dish and the camera on the Earth-facing face, side by side when both are there
  const both = !!g.antenna && !!g.camera;
  if (g.antenna) {
    const dw = g.antenna.diameter * s, depth = (g.antenna.diameter / 3) * s;
    const dx = both ? Math.max(busLeft + dw / 2, cx - bw / 4) : cx;
    const path = svg('path', { d: `M${f1(dx - dw / 2)},${f1(busBottom + depth)}Q${f1(dx)},${f1(busBottom - depth * 0.6)} ${f1(dx + dw / 2)},${f1(busBottom + depth)}Z` }, cls('antenna', 'sd-dish'));
    root.append(tag(path, 'antenna'));
  }
  if (g.camera) {
    const a = g.camera.aperture * s;
    const x = both ? Math.min(busLeft + bw - a / 2, cx + bw / 4) : cx;
    const group = svg('g', {}, cls('camera', 'sd-camera'));
    group.append(svg('rect', { x: f1(x - a / 2), y: f1(busBottom), width: f1(a), height: f1(a) }, 'sd-barrel'));
    group.append(svg('ellipse', { cx: f1(x), cy: f1(busBottom + a), rx: f1(a / 2), ry: f1(Math.max(1.5, a * 0.18)) }, 'sd-lens'));
    root.append(tag(group, 'camera'));
  }

  // the Earth's direction and a scale bar
  const metres = scaleBarLength(g.extent.width);
  const len = metres * s;
  const y = H - 8;
  const foot = svg('g', { 'aria-hidden': 'true' }, 'bs-scale');
  foot.append(svg('path', { d: `M${f1(PAD)},${f1(y - 4)}V${f1(y)}H${f1(PAD + len)}V${f1(y - 4)}` }));
  const label = svg('text', { x: f1(PAD + len + 6), y: f1(y) });
  label.textContent = `${metres.toLocaleString(getLang())} ${t('u.m')}`;
  const earth = svg('text', { x: f1(W - PAD), y: f1(y), 'text-anchor': 'end' }, 'sd-earth');
  earth.textContent = `↓ ${t('build.sat.preview.earth')}`;
  foot.append(label, earth);
  root.append(foot);
}
