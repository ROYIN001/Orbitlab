/**
 * The Engineer level's wind tunnel (roadmap D04, "a wind tunnel"): the
 * vehicle on the bench, in any configuration it flies through, swept over the
 * Mach numbers and angles it can meet.
 *
 * The thin DOM part of src/design/tunnel-view.ts over src/design/tunnel.ts,
 * the six-DOF flight's own aerodynamics through the flight's own code. The
 * student sets the configuration — strap-ons on or off, stages already gone,
 * the fairing on or off, the propellant left and the payload (which move the
 * centre of mass only) — and reads a Mach × α map of C_N, C_A, C_m or the
 * centre of pressure (tunnel-map.ts), for 0–10° and for a wide 0–90°; the
 * drag coefficient against Mach at zero angle, which is the point-mass
 * flight's drag; and the static margin in calibres against Mach.
 *
 * It says plainly, above everything it shows, that the tables are the
 * model's estimates, not measured data, and that fins and the shape of the
 * nose do not change them.
 */
import { t } from '../../i18n';
import type { VehicleSpec } from '../../types';
import {
  TUNNEL_ALPHAS, TUNNEL_MAP_MACH, TUNNEL_MAX_PAYLOAD_KG, TUNNEL_QUANTITIES, TUNNEL_RANGES, cgFromNose, defaultTunnelChoice, rampColour, sweepMap, tunnelBench, tunnelLines, validTunnelPayload,
  tunnelMap, type TunnelChoice, type TunnelLines, type TunnelMap, type TunnelQuantity, type TunnelRange,
} from '../../design/tunnel-view';
import type { TunnelResult } from '../../design/tunnel';
import { drawChart } from '../charts';
import { stageName } from '../names';
import { button, el, num } from '../orbit/dom';
import { field, numberBox, select } from './explore-level';
import { TunnelMapView, machText } from './tunnel-map';

const Q_KEY: Record<TunnelQuantity, string> = {
  cN: 'build.eng.tunnel.q.cN', cA: 'build.eng.tunnel.q.cA', cm: 'build.eng.tunnel.q.cm', xcp: 'build.eng.tunnel.q.xcp',
};
/** the symbol a cell's readout uses */
const Q_SYMBOL: Record<TunnelQuantity, string> = { cN: 'C_N', cA: 'C_A', cm: 'C_m', xcp: 'x_cp' };
const RANGE_KEY: Record<TunnelRange, string> = { small: 'build.eng.tunnel.range.small', wide: 'build.eng.tunnel.range.wide' };

export class TunnelPanel {
  readonly root = el('div', 'be-tunnel');
  private spec: VehicleSpec | null = null;
  private vehicleName = '';
  private choice!: TunnelChoice;
  private quantity: TunnelQuantity = 'cN';
  private range: TunnelRange = 'small';
  private result: TunnelResult | null = null;
  private map: TunnelMap | null = null;
  private lines: TunnelLines | null = null;
  private visible = false;
  private queued = 0;

  private readonly ctrl = el('section', 'bs-panel be-ctrl');
  private readonly out = el('section', 'bs-panel be-out');
  private readonly figs = el('dl', 'be-tiles');
  private readonly mapHead = el('div', 'be-map-head');
  private readonly legend = el('div', 'be-legend');
  private readonly mapNotes = el('div');
  private readonly table = el('details', 'be-numbers');
  private readonly mapView = new TunnelMapView();
  private readonly plots = el('section', 'bs-panel be-plots');
  private readonly cdCanvas = el('canvas');
  private readonly marginCanvas = el('canvas');
  private readonly cdText = el('div');
  private readonly marginText = el('div');
  private readonly ro: ResizeObserver | null;

  constructor() {
    this.ctrl.setAttribute('aria-labelledby', 'be-tunnel-title');
    this.out.setAttribute('aria-labelledby', 'be-map-title');
    this.plots.setAttribute('aria-labelledby', 'be-tunnel-plots-title');
    this.root.append(this.ctrl, this.out, this.plots);
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.queueDraw()) : null;
    this.ro?.observe(this.out);
    this.ro?.observe(this.plots);
  }

  setVehicle(spec: VehicleSpec, name: string, payloadKg: number): void {
    this.spec = spec;
    this.vehicleName = name;
    this.choice = defaultTunnelChoice(spec, payloadKg);
    this.sweep();
    // drawn now even behind another tab, so the tab opens on this vehicle's configuration; the map is painted once it is in sight
    this.render();
  }

  show(): void {
    this.visible = true;
    this.queueDraw();
  }

  hide(): void {
    this.visible = false;
  }

  private sweep(): void {
    if (!this.spec) return;
    // Every input path (including stages/range) comes through this guard.
    // Never leave results for an earlier configuration beside invalid input.
    if (!validTunnelPayload(this.choice.payloadKg)) {
      this.result = null;
      this.map = null;
      this.lines = null;
      return;
    }
    this.result = sweepMap(this.spec, this.choice, this.range);
    this.map = tunnelMap(this.result, this.quantity, TUNNEL_MAP_MACH, TUNNEL_ALPHAS[this.range]);
    this.lines = tunnelLines(this.spec, this.choice);
  }

  /** A value of the configuration changed: sweep again and redraw the results, once a frame. */
  private changed(): void {
    if (this.queued) return;
    this.queued = requestAnimationFrame(() => {
      this.queued = 0;
      this.sweep();
      this.renderOutput();
    });
  }

  private queueDraw(): void {
    if (!this.visible) return;
    requestAnimationFrame(() => { this.mapView.paint(); this.drawCharts(); });
  }

  render(): void {
    if (!this.spec) return;
    const active = document.activeElement as HTMLElement | null;
    const key = active && this.root.contains(active) ? active.dataset.k ?? null : null;
    this.renderControls();
    this.renderOutput();
    if (key && !this.root.contains(document.activeElement)) this.root.querySelector<HTMLElement>(`[data-k="${CSS.escape(key)}"]`)?.focus();
  }

  // ─── the configuration ────────────────────────────────────────────────────

  private renderControls(): void {
    const spec = this.spec!;
    const bench = tunnelBench(spec);
    const title = el('h2', 'bx-h2', t('build.eng.tunnel.title'));
    title.id = 'be-tunnel-title';
    const parts: HTMLElement[] = [title, el('p', 'bx-note', t('build.eng.tunnel.lead', { name: this.vehicleName }))];

    const warn = el('div', 'bd-say bd-say-warn be-estimate');
    const tag = el('span', 'bd-say-tag');
    const glyph = el('span', 'bd-say-glyph', '≈');
    glyph.setAttribute('aria-hidden', 'true');
    tag.append(glyph, ` ${t('build.stat.estimate')}`);
    warn.append(tag, el('span', 'bd-say-body', t('build.eng.tunnel.estimate')));
    parts.push(warn);

    const cfg = el('fieldset', 'be-config');
    cfg.append(el('legend', 'bx-h3', t('build.eng.tunnel.config')));
    const stageOptions = Array.from({ length: bench.launcherStages }, (_, i) => ({
      value: String(i), label: i === 0 ? t('build.eng.tunnel.whole') : t('build.eng.tunnel.from', { n: i + 1 }),
    }));
    const stages = select('stages', stageOptions, String(this.choice.stagesGone), (v) => { this.choice.stagesGone = Number(v); this.sweep(); this.render(); });
    stages.disabled = bench.launcherStages < 2;
    cfg.append(field(t('build.eng.tunnel.stages'), stages));

    const groups = el('div', 'bx-field');
    groups.append(el('span', 'bx-field-name', t('build.eng.tunnel.strapOns')));
    if (!bench.groups.length) groups.append(el('span', 'bx-note small', t('build.eng.tunnel.noStrapOns')));
    bench.groups.forEach((g, i) => {
      const box = el('input');
      box.type = 'checkbox';
      box.checked = this.choice.boostersOn[i] ?? true;
      box.disabled = this.choice.stagesGone > 0;
      box.dataset.k = `group:${i}`;
      box.addEventListener('change', () => { this.choice.boostersOn[i] = box.checked; this.changed(); });
      const l = el('label', 'bx-check');
      l.append(box, el('span', undefined, `${g.count} × ${stageName(spec, g.id, g.name)}`));
      groups.append(l);
    });
    if (bench.groups.length && this.choice.stagesGone > 0) groups.append(el('span', 'bx-note small', t('build.eng.tunnel.strapOnsGone')));
    cfg.append(groups);

    const fairing = el('input');
    fairing.type = 'checkbox';
    fairing.checked = bench.hasFairing && this.choice.fairing;
    fairing.disabled = !bench.hasFairing;
    fairing.dataset.k = 'fairing';
    fairing.addEventListener('change', () => { this.choice.fairing = fairing.checked; this.changed(); });
    const fl = el('label', 'bx-check');
    fl.append(fairing, el('span', undefined, t('build.eng.tunnel.fairing')));
    cfg.append(fl);
    if (!bench.hasFairing) cfg.append(el('span', 'bx-note small', t('build.eng.tunnel.noFairing')));

    const range = el('input', 'be-range');
    range.type = 'range';
    range.min = '0';
    range.max = '100';
    range.step = '5';
    range.value = String(Math.round(this.choice.propellantFraction * 100));
    range.dataset.k = 'propellant';
    const out = el('output', 'be-range-out', `${range.value} %`);
    range.setAttribute('aria-valuetext', `${range.value} %`);
    range.addEventListener('input', () => {
      this.choice.propellantFraction = Number(range.value) / 100;
      out.textContent = `${range.value} %`;
      range.setAttribute('aria-valuetext', `${range.value} %`);
      this.changed();
    });
    const rr = el('span', 'be-range-row');
    rr.append(range, out);
    cfg.append(field(t('build.eng.tunnel.propellant'), rr));

    const payload = numberBox('payload', this.choice.payloadKg, { min: 0, max: TUNNEL_MAX_PAYLOAD_KG, step: 1 }, (v) => {
      this.choice.payloadKg = v;
      payload.setAttribute('aria-invalid', String(!validTunnelPayload(v)));
      this.changed();
    });
    payload.setAttribute('aria-invalid', String(!validTunnelPayload(this.choice.payloadKg)));
    payload.setAttribute('aria-errormessage', 'be-tunnel-payload-error');
    const pr = el('span', 'bx-with-unit');
    pr.append(payload, el('span', 'bx-unit', t('u.kg')));
    cfg.append(field(t('build.ex.payload'), pr), el('p', 'bx-note small', t('build.eng.tunnel.massNote')));
    parts.push(cfg);
    this.ctrl.replaceChildren(...parts);
  }

  // ─── the map and the curves ───────────────────────────────────────────────

  private format(v: number, q: TunnelQuantity = this.quantity): string {
    const d = q === 'xcp' || Math.abs(v) >= 10 ? 1 : 3;
    // a value that rounds to zero is 0, never "−0.000"
    const r = Number(v.toFixed(d)) || 0;
    return q === 'xcp' ? `${num(r, d)} ${t('u.m')}` : num(r, d);
  }

  private renderOutput(): void {
    const r = this.result, map = this.map;
    if (!r || !map) {
      const title = el('h2', 'bx-h2', t('build.eng.tunnel.map'));
      title.id = 'be-map-title';
      const problem = el('p', 'bd-say bd-say-warn', t('build.eng.tunnel.invalidPayload'));
      problem.id = 'be-tunnel-payload-error';
      problem.setAttribute('role', 'status');
      this.out.replaceChildren(title, problem);
      this.plots.replaceChildren();
      return;
    }
    // what is in the tunnel
    const tile = (label: string, value: string): HTMLElement => {
      const box = el('div', 'be-tile');
      box.append(el('dt', undefined, label), el('dd', undefined, value));
      return box;
    };
    this.figs.replaceChildren(
      tile(t('build.eng.tunnel.length'), `${num(r.noseX - r.baseX, 1)} ${t('u.m')}`),
      tile(t('build.eng.tunnel.area'), `${num(r.referenceArea, 2)} ${t('build.eng.u.m2')}`),
      tile(t('build.eng.tunnel.diameter'), `${num(r.referenceDiameter, 2)} ${t('u.m')}`),
      tile(t('build.eng.tunnel.cg'), `${num(cgFromNose(r), 1)} ${t('u.m')}`),
    );

    // the map's own controls
    const title = el('h2', 'bx-h2', t('build.eng.tunnel.map'));
    title.id = 'be-map-title';
    title.append(' ', el('em', 'bs-est', t('build.stat.estimate')));
    const q = select('quantity', TUNNEL_QUANTITIES.map((k) => ({ value: k, label: t(Q_KEY[k]) })), this.quantity, (v) => {
      this.quantity = v as TunnelQuantity;
      this.map = tunnelMap(this.result!, this.quantity, TUNNEL_MAP_MACH, TUNNEL_ALPHAS[this.range]);
      this.renderOutput();
    });
    const ranges = el('div', 'bx-modes be-ranges');
    ranges.setAttribute('role', 'group');
    ranges.setAttribute('aria-label', t('build.eng.tunnel.range'));
    for (const k of TUNNEL_RANGES) {
      const b = button('bx-mode', t(RANGE_KEY[k]), () => {
        if (k === this.range) return;
        this.range = k;
        this.sweep();
        this.renderOutput();
        this.root.querySelector<HTMLElement>(`[data-k="range:${k}"]`)?.focus();
      });
      b.dataset.k = `range:${k}`;
      b.setAttribute('aria-pressed', String(k === this.range));
      ranges.append(b);
    }
    const rangeField = el('div', 'bx-field');
    rangeField.append(el('span', 'bx-field-name', t('build.eng.tunnel.range')), ranges);
    this.mapHead.replaceChildren(field(t('build.eng.tunnel.quantity'), q), rangeField);

    const sym = Q_SYMBOL[this.quantity];
    this.mapView.set(map, {
      summary: t('build.eng.tunnel.mapLabel', {
        q: t(Q_KEY[this.quantity]), m0: machText(map.machs[0]), m1: machText(map.machs[map.machs.length - 1]),
        a0: map.alphas[0], a1: map.alphas[map.alphas.length - 1], min: this.format(map.min), max: this.format(map.max),
      }),
      cell: (mi, ai) => {
        const text = t('build.eng.tunnel.cell', { m: machText(map.machs[mi]), a: map.alphas[ai], q: sym, v: this.format(map.values[ai][mi]) });
        return map.within[ai][mi] ? text : `${text} ${t('build.eng.tunnel.cellOut')}`;
      },
      mach: t('build.eng.tunnel.axisMach'),
      alpha: t('build.eng.tunnel.axisAlpha'),
    });

    // the colour key
    const bar = el('div', 'be-legend-bar');
    bar.style.background = `linear-gradient(90deg, ${Array.from({ length: 11 }, (_, i) => rampColour(i / 10, map.scale)).join(', ')})`;
    const ends = el('div', 'be-legend-ends');
    ends.append(el('span', undefined, this.format(map.lo)));
    if (map.scale === 'diverging') ends.append(el('span', undefined, '0'));
    ends.append(el('span', undefined, this.format(map.hi)));
    this.legend.replaceChildren(bar, ends);
    this.legend.setAttribute('aria-hidden', 'true');

    const notes: string[] = [t('build.eng.tunnel.keys')];
    if (this.quantity === 'cm') notes.push(t('build.eng.tunnel.cmNote'));
    if (this.quantity === 'xcp') notes.push(t('build.eng.tunnel.xcpNote'));
    if (this.range === 'wide') notes.push(t('build.eng.tunnel.envelope'));
    this.mapNotes.replaceChildren(...notes.map((n) => el('p', 'bx-note small', n)));
    this.renderTable(map);
    this.out.replaceChildren(this.figs, title, this.mapHead, this.mapView.root, this.legend, this.mapNotes, this.table);
    this.mapView.paint();
    this.renderPlots();
  }

  /** The map's numbers as a table, for a screen reader or a worksheet. */
  private renderTable(map: TunnelMap): void {
    const open = this.table.open;
    const summary = el('summary', undefined, t('build.eng.tunnel.table'));
    const table = el('table', 'bs-table be-grid-table');
    table.append(el('caption', 'bs-sr', t(Q_KEY[this.quantity])));
    const head = el('tr');
    const corner = el('th', undefined, `${t('build.eng.tunnel.axisAlpha')} \\ ${t('build.eng.tunnel.axisMach')}`);
    corner.scope = 'col';
    head.append(corner);
    for (const m of map.machs) {
      const th = el('th', 'num', machText(m));
      th.scope = 'col';
      head.append(th);
    }
    const thead = el('thead');
    thead.append(head);
    const tbody = el('tbody');
    for (let a = 0; a < map.alphas.length; a++) {
      const tr = el('tr');
      const th = el('th', undefined, `${map.alphas[a]}°`);
      th.scope = 'row';
      tr.append(th, ...map.machs.map((_, m) => {
        const td = el('td', 'num', this.format(map.values[a][m]));
        if (!map.within[a][m]) td.classList.add('be-out-env');
        return td;
      }));
      tbody.append(tr);
    }
    table.append(thead, tbody);
    const wrap = el('div', 'be-table');
    wrap.append(table);
    this.table.replaceChildren(summary, wrap);
    this.table.open = open;
  }

  private renderPlots(): void {
    const title = el('h2', 'bx-h2', t('build.eng.tunnel.plots'));
    title.id = 'be-tunnel-plots-title';
    const chart = (c: HTMLCanvasElement): HTMLElement => {
      const d = el('div', 'be-chart');
      d.append(c);
      return d;
    };
    const key = (items: [string, string, boolean][]): HTMLElement => {
      const k = el('div', 'be-key');
      k.setAttribute('aria-hidden', 'true');
      for (const [colour, label, dashed] of items) {
        const s = el('span', 'be-key-item');
        const sw = el('span', `be-swatch${dashed ? ' dashed' : ''}`);
        sw.style.borderColor = colour;
        s.append(sw, label);
        k.append(s);
      }
      return k;
    };
    const d = this.lines?.referenceDiameter ?? 0;
    this.cdText.replaceChildren(
      key([['#8be5cd', t('build.eng.tunnel.cdTunnel'), false], ['#efa47e', t('build.eng.tunnel.cdPointMass'), true]]),
      el('p', 'bx-note small', t('build.eng.tunnel.cdNote')),
    );
    this.marginText.replaceChildren(
      key([['#6ec8ff', t('build.eng.tunnel.marginSeries'), false], ['#96a3b4', t('build.eng.tunnel.neutral'), true]]),
      el('p', 'bx-note small', t('build.eng.tunnel.marginNote', { d: num(d, 2) })),
    );
    const one = el('div', 'be-plot');
    one.append(chart(this.cdCanvas), this.cdText);
    const two = el('div', 'be-plot');
    two.append(chart(this.marginCanvas), this.marginText);
    const grid = el('div', 'be-charts two');
    grid.append(one, two);
    this.plots.replaceChildren(title, grid);
    this.drawCharts();
  }

  private drawCharts(): void {
    const l = this.lines;
    if (!this.visible || !l || !this.plots.contains(this.cdCanvas)) return;
    // the symbol, not the words: a phone's chart has room for one short unit beside its last tick
    const xLabel = 'M';
    drawChart(this.cdCanvas, [
      { x: l.mach, y: l.cD, color: '#8be5cd' },
      { x: l.mach, y: l.cdPointMass, color: '#efa47e', dash: [5, 4] },
    ], { title: t('build.eng.tunnel.cd'), xLabel, yMin: 0, seriesLabels: [t('build.eng.tunnel.cdTunnel'), t('build.eng.tunnel.cdPointMass')] });
    drawChart(this.marginCanvas, [
      { x: l.mach, y: l.marginCal, color: '#6ec8ff' },
      { x: [l.mach[0], l.mach[l.mach.length - 1]], y: [0, 0], color: '#96a3b4', dash: [4, 4] },
    ], { title: t('build.eng.tunnel.margin'), xLabel, seriesLabels: [t('build.eng.tunnel.marginSeries'), t('build.eng.tunnel.neutral')] });
  }
}
