/**
 * R3.3: the bench's subsystem diagrams drawn as SVG, each with its caption,
 * from the view models in src/design/satellite-diagrams.ts. Schematic: the
 * angles and fractions are the figures', the distances are not to scale
 * except the camera's footprint, whose altitude and swath share one scale.
 * The words are in the caption (HTML, so it wraps and translates); the
 * drawing itself is decorative to a screen reader, which reads the caption.
 */
import { getLang, t } from '../../i18n';
import type { EclipseDiagram, FootprintDiagram, LinkDiagram } from '../../design/satellite-diagrams';

const NS = 'http://www.w3.org/2000/svg';
const DEG = 180 / Math.PI;

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, cls?: string): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (cls) node.setAttribute('class', cls);
  return node;
}

const f1 = (v: number): string => (Math.round(v * 10) / 10).toString();
const num = (v: number, digits = 0): string => {
  try { return v.toLocaleString(getLang(), { maximumFractionDigits: digits, minimumFractionDigits: digits }); } catch { return v.toFixed(digits); }
};
const minutes = (s: number): string => num(s / 60, 1);
const km = (m: number): string => num(m / 1000, m < 100_000 ? 1 : 0);
const deg = (rad: number): string => num(rad * DEG, rad * DEG < 10 ? 1 : 0);

function frame(kind: string, root: SVGSVGElement, caption: string): HTMLElement {
  const fig = document.createElement('figure');
  fig.className = `sdg sdg-fig-${kind}`;
  root.setAttribute('aria-hidden', 'true');
  const cap = document.createElement('figcaption');
  cap.textContent = caption;
  fig.append(root, cap);
  return fig;
}

/** An arc of the circle (cx, cy, r) from angle a0 to a1, radians, counter-clockwise from +x (screen y down). */
function arc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number): string => `${f1(cx + r * Math.cos(a))},${f1(cy - r * Math.sin(a))}`;
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  return `M${p(a0)}A${r},${r} 0 ${large} 0 ${p(a1)}`;
}

/** Power: the orbit from above, the Sun to the left, the shadow arc behind the Earth. */
export function eclipseFigure(e: EclipseDiagram): HTMLElement {
  const root = svg('svg', { viewBox: '0 0 320 190', preserveAspectRatio: 'xMidYMid meet' });
  const cx = 180, cy = 95, rE = 30, rO = 66;
  // the Sun's light, from the left
  for (const y of [55, 95, 135]) root.append(svg('path', { d: `M14,${y}H52M46,${y - 4}L52,${y}L46,${y + 4}` }, 'sdg-ray'));
  const sun = svg('text', { x: 12, y: 30 }, 'sdg-label');
  sun.textContent = `☀ ${t('build.sat.diagram.sun')}`;
  root.append(sun);
  // the Earth's shadow, a band behind it
  root.append(svg('rect', { x: cx, y: cy - rE, width: 320 - cx, height: 2 * rE }, 'sdg-shadow'));
  root.append(svg('circle', { cx, cy, r: rE }, 'sdg-earth'));
  // the orbit: sunlit, then the arc in shadow centred on the anti-Sun side
  root.append(svg('circle', { cx, cy, r: rO }, 'sdg-orbit'));
  if (e.worstShadow > 0) {
    const h = Math.PI * e.worstShadow;
    root.append(svg('path', { d: arc(cx, cy, rO + 8, -h, h) }, 'sdg-worst'));
  }
  if (e.shadow > 0) {
    const h = Math.PI * e.shadow;
    root.append(svg('path', { d: arc(cx, cy, rO, -h, h) }, 'sdg-eclipse'));
  }
  const caption = e.shadow > 0
    ? t('build.sat.diagram.eclipse', { shade: minutes(e.shadowTime), sun: minutes(e.sunTime), worst: minutes(e.worstShadowTime), beta: deg(Math.abs(e.beta)) })
    : t('build.sat.diagram.noEclipse', { sun: minutes(e.sunTime), worst: minutes(e.worstShadowTime), beta: deg(Math.abs(e.beta)) });
  return frame('eclipse', root, `${caption} ${t('build.sat.diagram.angles')}`);
}

/** Radio: the satellite over the ground station, the beam and the slant range. */
export function linkFigure(l: LinkDiagram): HTMLElement {
  const root = svg('svg', { viewBox: '0 0 320 180', preserveAspectRatio: 'xMidYMid meet' });
  // the ground, a shallow arc, and the station's dish on it
  root.append(svg('path', { d: 'M0,168Q160,140 320,168V180H0Z' }, 'sdg-ground'));
  const gx = 70, gy = 156, sx = 240, sy = 34;
  root.append(svg('path', { d: `M${gx - 9},${gy - 6}Q${gx},${gy + 6} ${gx + 9},${gy - 6}M${gx},${gy}V${gy + 6}` }, 'sdg-station'));
  // the beam from the satellite, at its width, towards the station
  const dx = gx - sx, dy = gy - sy, len = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  if (l.beamwidth !== null) {
    const h = l.beamwidth / 2;
    const p = (s: number): string => `${f1(sx + len * Math.cos(a + s * h))},${f1(sy + len * Math.sin(a + s * h))}`;
    root.append(svg('path', { d: `M${sx},${sy}L${p(-1)}L${p(1)}Z` }, `sdg-beam${l.closes ? '' : ' short'}`));
  } else root.append(svg('circle', { cx: sx, cy: sy, r: 26 }, `sdg-beam${l.closes ? '' : ' short'}`));
  root.append(svg('line', { x1: sx, y1: sy, x2: gx, y2: gy }, 'sdg-range'));
  root.append(svg('rect', { x: sx - 7, y: sy - 5, width: 14, height: 10, rx: 1 }, 'sdg-sat'));
  const range = svg('text', { x: f1((sx + gx) / 2 + 8), y: f1((sy + gy) / 2 - 6) }, 'sdg-label');
  range.textContent = `${km(l.range)} ${t('u.km')}`;
  root.append(range);
  const beam = l.beamwidth !== null ? t('build.sat.diagram.beam', { w: deg(l.beamwidth) }) : t('build.sat.diagram.wideBeam');
  const verdict = t(l.closes ? 'build.sat.diagram.linkCloses' : 'build.sat.diagram.linkShort', { m: num(l.margin, 1), floor: num(l.floor, 0) });
  return frame('link', root, `${t('build.sat.diagram.range', { r: km(l.range) })} ${beam} ${verdict} ${t('build.sat.diagram.notToScale')}`);
}

/** Camera: the field of view down to the ground, altitude and swath to one scale. */
export function footprintFigure(c: FootprintDiagram): HTMLElement {
  const root = svg('svg', { viewBox: '0 0 320 180', preserveAspectRatio: 'xMidYMid meet' });
  const top = 22, ground = 160, cx = 160, height = ground - top, maxHalf = 150;
  const s = height / c.altitude;
  const wanted = c.swath !== null ? (c.swath / 2) * s : height * Math.tan(c.fov / 2);
  const half = Math.min(maxHalf, Math.max(1, wanted));
  root.append(svg('line', { x1: 0, y1: ground, x2: 320, y2: ground }, 'sdg-groundline'));
  root.append(svg('path', { d: `M${cx},${top}L${f1(cx - half)},${ground}L${f1(cx + half)},${ground}Z` }, 'sdg-fov'));
  root.append(svg('line', { x1: f1(cx - half), y1: ground + 6, x2: f1(cx + half), y2: ground + 6 }, 'sdg-swath'));
  root.append(svg('rect', { x: cx - 7, y: top - 10, width: 14, height: 10, rx: 1 }, 'sdg-sat'));
  const alt = svg('text', { x: cx + 8, y: f1((top + ground) / 2) }, 'sdg-label');
  alt.textContent = `${km(c.altitude)} ${t('u.km')}`;
  root.append(alt);
  const parts = [c.swath !== null
    ? t('build.sat.diagram.footprint', { h: km(c.altitude), fov: deg(c.fov), swath: km(c.swath) })
    : t('build.sat.diagram.footprintLimb', { h: km(c.altitude), fov: deg(c.fov) }),
  t(c.limitedBy === 'aperture' ? 'build.sat.diagram.gsdAperture' : 'build.sat.diagram.gsdPixels', { gsd: num(c.gsd, c.gsd < 10 ? 2 : 1), diff: num(c.diffraction, c.diffraction < 10 ? 2 : 1) })];
  if (wanted > maxHalf) parts.push(t('build.sat.diagram.wider'));
  else parts.push(t('build.sat.diagram.toScale'));
  return frame('footprint', root, parts.join(' '));
}
