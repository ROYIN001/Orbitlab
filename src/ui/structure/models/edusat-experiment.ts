/**
 * "My experiment" on EduSat-3U (`ExperimentUi`): a copy of the reference
 * design whose battery and mission payload can be changed, with everything
 * that follows shown from the one choice — the picture (the adapter draws
 * the chosen parts), the list of equipment, the mass, the energy through
 * three orbits — and the reference always there to compare with and go back
 * to. What is worked out (src/structure/edusat-design.ts,
 * src/structure/power-balance.ts) is kept apart from what only explains (the
 * energy-flow picture, marked as an illustration).
 */
import {
  BATTERIES, BATTERY_OPTIONS, CDS, CELLS_PER_PANEL, EDU_UNITS, PAYLOADS, PAYLOAD_OPTIONS, SOLAR_CELL,
  type BatteryOption, type EduPart, type PayloadOption,
} from '../../../structure/edusat';
import { REFERENCE_DESIGN, bayFit, changesFrom, designKey, eduFigures, satelliteRecord, type EduDesign, type EduFigures } from '../../../structure/edusat-design';
import { RECEIPT_TOLERANCE, checkReceipt, type HandoffTarget, type SatelliteRecord } from '../../../structure/handoff';
import { chargeChart, energyFlow } from '../charts';
import { button, el, facts } from '../dom';
import type { StructureEnv } from '../env';
import type { StructureStore } from '../store';
import { num, tx } from '../text';
import type { ExperimentUi, InfoCheck, InfoSource } from './types';

interface Context {
  /** the design against the specification's bounds, as rows */
  checks(): InfoCheck[];
  sources(ids: readonly string[]): InfoSource[];
}

const mm = (m: number): string => num(m * 1000, 0);
const signed = (v: number, digits: number): string => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${num(Math.abs(v), digits)}`;

export function edusatExperiment(env: StructureEnv, ctx: Context): ExperimentUi {
  const cache = new Map<string, EduFigures>();
  const figuresOf = (d: EduDesign): EduFigures => {
    const key = designKey(d);
    let f = cache.get(key);
    if (!f) { f = eduFigures(d, env.power); cache.set(key, f); }
    return f;
  };
  const designOf = (store: StructureStore): EduDesign => store.pictureDesign() ?? REFERENCE_DESIGN;
  const mine = (store: StructureStore): boolean => store.showingMine;
  const recordOf = (store: StructureStore): SatelliteRecord => {
    const d = designOf(store);
    return satelliteRecord(figuresOf(d), `structure-edusat-${designKey(d).replaceAll(':', '-')}`, tx(mine(store) ? 'go.satName' : 'go.satNameRef'));
  };
  /** which half of the orbit the energy-flow illustration shows (the visit's) */
  let flowAt: 'sunlit' | 'eclipse' = 'sunlit';

  // ─── the options ──────────────────────────────────────────────────────────

  function optionCard<T extends string>(store: StructureStore, group: string, option: T, part: EduPart, current: T, reference: T, line: string, set: (v: T) => void): HTMLElement {
    const label = el('label', `st-option${option === current ? ' is-on' : ''}`);
    const input = el('input');
    input.type = 'radio';
    input.name = `st-${group}`;
    input.value = option;
    input.checked = option === current;
    input.disabled = !mine(store);
    input.dataset.k = `${group}:${option}`;
    input.addEventListener('change', () => set(option));
    const text = el('span', 'st-option-text');
    const head = el('strong', '', tx(`edu.option.${option}`));
    if (option === reference) head.append(' ', el('span', 'st-tag', tx('exp.reference')));
    const fit = bayFit(part);
    text.append(head, el('span', 'st-option-why', tx(`edu.for.${option}`)), el('span', 'st-small', line));
    if (fit) text.append(el('span', 'st-small', tx('exp.fit', { h: mm(fit.height), limit: mm(fit.limit) })));
    label.append(input, text);
    return label;
  }

  function optionsPanel(store: StructureStore): HTMLElement {
    const panel = el('section', 'st-panel st-exp');
    const have = !!store.progress.experiment;
    const showingMine = mine(store);
    const design = designOf(store);
    panel.append(el('h2', '', tx('exp.title')));
    if (!have) {
      panel.append(el('p', '', tx('exp.intro')), button(tx('exp.create'), 'create', () => store.makeExperiment(REFERENCE_DESIGN), { cls: 'st-primary' }));
    } else {
      const which = el('div', 'st-seg');
      which.setAttribute('role', 'group');
      which.setAttribute('aria-label', tx('exp.showing'));
      which.append(
        button(tx('exp.reference'), 'show:reference', () => store.showDesign('reference'), { pressed: !showingMine }),
        button(tx('exp.mine'), 'show:mine', () => store.showDesign('mine'), { pressed: showingMine }),
      );
      panel.append(which);
      if (!showingMine) panel.append(el('p', 'st-small', tx('exp.referenceFixed')));
    }
    const set = (next: EduDesign): void => store.setExperiment(next);
    const group = (title: string, why: string, cards: HTMLElement[]): HTMLElement => {
      const fs = el('fieldset', 'st-options');
      fs.append(el('legend', '', title), ...cards, el('p', 'st-small', why));
      return fs;
    };
    panel.append(group(tx('exp.power'), tx('edu.why.battery'), BATTERY_OPTIONS.map((b: BatteryOption) => optionCard(
      store, 'battery', b, BATTERIES[b], design.battery, REFERENCE_DESIGN.battery,
      `${num(BATTERIES[b].batteryWh!, 2)} ${tx('unit.Wh')} · ${num(BATTERIES[b].massKg, 2)} ${tx('unit.kg')}`, (v) => set({ ...design, battery: v }),
    ))));
    panel.append(group(tx('exp.payload'), tx('edu.why.payload'), PAYLOAD_OPTIONS.map((p: PayloadOption) => {
      const l = PAYLOADS[p].loads[0];
      return optionCard(store, 'payload', p, PAYLOADS[p], design.payload, REFERENCE_DESIGN.payload,
        `${num(l.watts, 1)} ${tx('unit.W')} × ${l.minutes} ${tx('unit.min')} (${tx(`edu.window.${l.window}`)}) · ${num(PAYLOADS[p].massKg, 2)} ${tx('unit.kg')}`,
        (v) => set({ ...design, payload: v }));
    })));
    const f = figuresOf(design);
    panel.append(el('p', 'st-small st-fixed', tx('exp.panels', {
      cells: 4 * CELLS_PER_PANEL, area: num(f.cellArea, 4), eff: num(SOLAR_CELL.efficiency * 100, 1), watts: num(f.power.arrayPower, 2),
    })));
    if (showingMine && changesFrom(design).length) panel.append(button(tx('exp.restore'), 'restore', () => set({ ...REFERENCE_DESIGN })));
    return panel;
  }

  // ─── the equipment list, and the designs side by side ─────────────────────

  function bomPanel(store: StructureStore): HTMLElement {
    const panel = el('section', 'st-panel st-bom');
    const design = designOf(store), f = figuresOf(design);
    const changed = new Set(mine(store) ? changesFrom(design).map((c) => c.unit as string) : []);
    panel.append(el('h2', '', tx('bom.title')));
    const table = el('table', 'st-table');
    const head = el('tr');
    for (const k of ['bom.part', 'bom.mass', 'bom.power']) head.append(el('th', '', tx(k)));
    table.append(head);
    const selected = store.shown()?.id ?? null;
    for (const unit of EDU_UNITS) {
      const part = f.parts.find((p) => p.unit === unit)!;
      const tr = el('tr', `${changed.has(unit) ? 'is-changed' : ''}${selected === unit ? ' is-selected' : ''}`);
      const th = el('th');
      th.scope = 'row';
      th.append(button(tx(`edu.unit.${unit}`), `bom:${unit}`, () => store.select(unit, true), { cls: 'st-link' }));
      // what is fitted, under the unit's name (a unit with options), marked when it is not the reference's
      const option = unit === 'battery' ? design.battery : unit === 'payload' ? design.payload : null;
      if (option) {
        const fitted = el('span', 'st-small st-fitted', `${tx('bom.fitted')}: ${tx(`edu.option.${option}`)}`);
        if (changed.has(unit)) fitted.append(' ', el('span', 'st-tag st-tag-changed', tx('bom.changed')));
        th.append(fitted);
      }
      const watts = part.loads.map((l) => `${num(l.watts, 2)}${l.minutes ? ` × ${l.minutes} ${tx('unit.min')}` : ''}`).join(' + ');
      tr.append(th, el('td', 'st-num', num(part.massKg, 2)), el('td', 'st-num', watts || '—'));
      table.append(tr);
    }
    const total = el('tr', 'st-total');
    const totalTh = el('th', '', tx('bom.total'));
    totalTh.scope = 'row';
    const sum = el('td', 'st-num', num(f.massKg, 2));
    sum.dataset.fig = 'bomMass';
    total.append(totalTh, sum, el('td', 'st-num', ''));
    table.append(total);
    panel.append(table, el('p', 'st-small', tx('bom.note', { kg: tx('unit.kg'), w: tx('unit.W') })));
    return panel;
  }

  function comparePanel(store: StructureStore): HTMLElement {
    const panel = el('section', 'st-panel st-compare');
    const design = designOf(store), now = figuresOf(design), ref = figuresOf(REFERENCE_DESIGN);
    panel.append(el('h2', '', tx('exp.compare')));
    const changes = mine(store) ? changesFrom(design) : [];
    panel.append(el('p', 'st-small', changes.length ? tx('exp.changed', { n: changes.length }) : tx('exp.same')));
    const table = el('table', 'st-table st-diff');
    const head = el('tr');
    head.append(el('th', '', ''), el('th', '', tx('exp.reference')), el('th', '', tx(mine(store) ? 'exp.mine' : 'exp.reference')), el('th', '', tx('exp.difference')));
    table.append(head);
    /** `worse`: which way of the difference is the worse one (+1: more is worse, −1: less is worse, 0: neither) */
    const row = (label: string, a: string, b: string, delta = '', worse = 0): void => {
      const tr = el('tr', a !== b ? 'is-changed' : '');
      const th = el('th', '', label);
      th.scope = 'row';
      tr.append(th, el('td', '', a), el('td', '', b), el('td', worse > 0 ? 'st-worse' : worse < 0 ? 'st-better' : '', delta));
      table.append(tr);
    };
    const dMass = now.massKg - ref.massKg, dCap = now.batteryWh - ref.batteryWh, dMin = now.power.minChargeWh - ref.power.minChargeWh;
    row(tx('edu.unit.battery'), tx(`edu.option.${REFERENCE_DESIGN.battery}`), tx(`edu.option.${design.battery}`));
    row(tx('edu.unit.payload'), tx(`edu.option.${REFERENCE_DESIGN.payload}`), tx(`edu.option.${design.payload}`));
    row(tx('res.mass'), `${num(ref.massKg, 3)} ${tx('unit.kg')}`, `${num(now.massKg, 3)} ${tx('unit.kg')}`, dMass ? signed(dMass, 3) : '', Math.sign(dMass));
    row(tx('res.capacity'), `${num(ref.batteryWh, 2)} ${tx('unit.Wh')}`, `${num(now.batteryWh, 2)} ${tx('unit.Wh')}`, dCap ? signed(dCap, 2) : '', -Math.sign(dCap));
    row(tx('res.minCharge'), `${num(ref.power.minChargeWh, 2)} ${tx('unit.Wh')}`, `${num(now.power.minChargeWh, 2)} ${tx('unit.Wh')}`, dMin ? signed(dMin, 2) : '');
    row(tx('res.shortfall'), ref.powered ? tx('res.none') : tx('res.shortShort'), now.powered ? tx('res.none') : tx('res.shortShort'), '', now.powered === ref.powered ? 0 : now.powered ? -1 : 1);
    panel.append(table);
    if (store.level !== 'watch') {
      // every choice at once: what each combination of the two systems comes to
      panel.append(el('h3', '', tx('exp.all')));
      const grid = el('table', 'st-table st-grid');
      const top = el('tr');
      top.append(el('th', '', ''), ...PAYLOAD_OPTIONS.map((p) => el('th', '', tx(`edu.option.${p}`))));
      grid.append(top);
      for (const b of BATTERY_OPTIONS) {
        const tr = el('tr');
        const th = el('th', '', tx(`edu.option.${b}`));
        th.scope = 'row';
        tr.append(th);
        for (const p of PAYLOAD_OPTIONS) {
          const f = figuresOf({ battery: b, payload: p });
          const td = el('td', `${f.powered ? 'st-cell-ok' : 'st-cell-short'}${b === design.battery && p === design.payload ? ' is-now' : ''}`);
          td.append(el('strong', '', f.powered ? tx('res.okShort') : tx('res.shortShort')),
            el('span', 'st-small', `${num(f.massKg, 2)} ${tx('unit.kg')} · ${tx('exp.lowest', { pct: num((100 * f.power.minChargeWh) / f.power.capacityWh, 0) })}`));
          if (b === REFERENCE_DESIGN.battery && p === REFERENCE_DESIGN.payload) td.append(el('span', 'st-tag', tx('exp.reference')));
          tr.append(td);
        }
        grid.append(tr);
      }
      panel.append(grid, el('p', 'st-small', tx('exp.all.note')));
    }
    return panel;
  }

  // ─── the details: the ledger, the scenario, the method, the bounds ────────

  function detailsPanel(store: StructureStore): HTMLElement {
    const panel = el('section', 'st-panel st-details');
    const f = figuresOf(designOf(store)), r = f.power;
    panel.append(el('h2', '', tx('res.details')));
    const fold = (title: string, k: string, open: boolean, ...body: (HTMLElement | SVGElement)[]): HTMLDetailsElement => {
      const d = el('details', 'st-fold');
      d.open = open;
      const s = el('summary', '', title);
      s.dataset.k = `fold:${k}`;
      d.append(s, ...body);
      return d;
    };
    const row = (label: string, value: string, key: string) => ({ label, value, mark: ['fig', key] as [string, string] });
    panel.append(fold(tx('res.ledger'), 'ledger', true, facts([
      row(tx('res.array'), `${num(r.arrayPower, 2)} ${tx('unit.W')}`, 'array'),
      row(tx('res.bus'), `${num(r.busPower, 2)} ${tx('unit.W')}`, 'bus'),
      row(tx('res.loadDay'), `${num(r.dayLoad, 2)} ${tx('unit.W')}`, 'loadDay'),
      row(tx('res.loadNight'), `${num(r.eclipseLoad, 2)} ${tx('unit.W')}`, 'loadNight'),
      row(tx('res.energyIn'), `${num(r.perOrbit.supplyWh, 2)} ${tx('unit.Wh')}`, 'energyIn'),
      row(tx('res.energyOut'), `${num(r.perOrbit.demandWh, 2)} ${tx('unit.Wh')}`, 'energyOut'),
      row(tx('res.floor'), `${num(r.floorWh, 2)} ${tx('unit.Wh')}`, 'floor'),
    ], 'st-facts st-figures'), el('p', 'st-small', tx('res.scenario', { eclipse: num(r.eclipse / 60, 1), period: num(r.period / 60, 1) })), el('p', 'st-small', tx('res.attitude'))));
    // the picture that explains, kept apart from what is worked out
    const flow = el('div', 'st-flow');
    const seg = el('div', 'st-seg');
    seg.append(
      button(tx('flow.sunlit'), 'flow:sunlit', () => { flowAt = 'sunlit'; store.emit('panels'); }, { pressed: flowAt === 'sunlit' }),
      button(tx('flow.eclipse'), 'flow:eclipse', () => { flowAt = 'eclipse'; store.emit('panels'); }, { pressed: flowAt === 'eclipse' }),
    );
    flow.append(seg, energyFlow(flowAt), el('p', 'st-small st-illustration', tx('flow.note')));
    panel.append(fold(tx('flow.title'), 'flow', false, flow));
    if (store.level === 'engineer') {
      panel.append(fold(tx('res.method'), 'method', false,
        el('p', 'st-small', tx('res.method.text', { charge: num(r.chargeEff, 3) })),
        el('h4', '', tx('res.steady')),
        el('p', 'st-small', tx('res.steady.array', { need: num(f.steady.arrayNeeded, 2), given: num(f.steady.arrayGiven, 2) })),
        el('p', 'st-small', tx('res.steady.battery', { need: num(f.steady.batteryNeeded, 2), given: num(f.steady.batteryFitted, 2) }))));
      const checks = el('table', 'st-table');
      const head = el('tr');
      for (const k of ['spec.col.what', 'spec.col.value', 'spec.col.limit', 'spec.col.ref']) head.append(el('th', '', tx(k)));
      checks.append(head);
      for (const c of ctx.checks()) {
        const tr = el('tr', c.ok ? '' : 'st-worse');
        tr.append(el('th', '', c.label), el('td', 'st-num', c.value), el('td', 'st-num', c.limit), el('td', 'st-small', c.ref));
        checks.append(tr);
      }
      panel.append(fold(tx('spec.title'), 'spec', false, checks, el('p', 'st-small', tx('spec.note'))));
      const src = el('ul', 'st-sources');
      for (const s of ctx.sources(['cds14', 'cds13', 'azur-3g30', 'nasa-sst-power', 'smad', 'tudelft', 'iau', 'cell-18650', 'eclipse-model', 'pilot'])) {
        const li = el('li');
        if (s.url) { const a = el('a', '', s.title); a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; li.append(a); } else li.append(s.title);
        li.append(el('span', 'st-small', ` — ${s.note ?? ''} (${s.scope ?? ''})`));
        src.append(li);
      }
      panel.append(fold(tx('res.sources'), 'sources', false, src));
    }
    panel.append(el('p', 'st-small', tx('res.limits')));
    return panel;
  }

  // ─── handing it on ────────────────────────────────────────────────────────

  function send(store: StructureStore, where: HandoffTarget): void {
    const key = designKey(designOf(store));
    const r = env.handoff.send(where, recordOf(store), store.level);
    // a refusal leaves the record of what was last handed on as it was, and stays here to say why
    if (!r.ok) {
      const reason = r.reason === 'checks' ? () => tx('go.refused.checks', { n: r.issues }) : () => tx(`go.refused.${r.reason}`);
      store.noteSend('no', () => tx('go.refused', { reason: reason() }));
      store.emit('panels');
      return;
    }
    store.sendNote = null;
    store.sent = { where, key, sent: r.sent, receipt: r.receipt, check: r.receipt && checkReceipt(r.sent, r.receipt) };
  }

  function restoreLaunch(store: StructureStore): void {
    if (!env.handoff.canRestoreLaunch()) { store.emit('panels'); return; }
    if (env.handoff.restoreLaunch(store.level)) {
      if (store.sent?.where === 'launch') store.sent = null;
      store.noteSend('ok', () => tx('go.restored'));
    } else {
      store.noteSend('no', () => tx('go.restoreFailed', { reason: tx('go.refused.restore') }));
      store.emit('panels');
    }
  }

  function handoffPanel(store: StructureStore): HTMLElement {
    const panel = el('section', 'st-panel st-go');
    const f = figuresOf(designOf(store));
    // what the app would send, by its own satellite model: read from the app, not from this section's figures
    const sat = env.handoff.preview(recordOf(store));
    panel.append(el('h2', '', tx('go.title')), el('p', 'st-small st-hypo', tx('go.hypothetical')));
    panel.append(el('h3', '', tx('go.preview')), facts([
      { label: tx('go.name'), value: sat.name, mark: ['send', 'name'] },
      { label: tx('go.massSent'), value: `${num(sat.massKg, 3)} ${tx('unit.kg')}`, mark: ['send', 'mass'] },
      { label: tx('go.size'), value: `${num(sat.size.width * 1000, 0)} × ${num(sat.size.height * 1000, 0)} × ${num(sat.size.depth * 1000, 1)} ${tx('unit.mm')}`, mark: ['send', 'size'] },
      { label: tx('go.drag'), value: `${num(sat.dragArea, 4)} ${tx('unit.m2')} / ${num(sat.cd, 1)} / ${num(sat.cr, 1)}`, mark: ['send', 'drag'] },
      { label: tx('go.orbitSent'), value: tx('go.orbitValue', { inc: num(sat.inclination, 2) }), mark: ['send', 'orbit'] },
    ]), el('p', 'st-small', tx('go.notSent')));
    if (Math.abs(sat.massKg - f.massKg) > 5e-4) panel.append(el('p', 'st-msg st-msg-no', tx('go.previewOff', { mass: num(sat.massKg, 3) })));
    const actions = el('div', 'st-actions');
    actions.append(
      button(tx('go.orbit'), 'go:orbit', () => send(store, 'orbit'), { cls: 'st-primary' }),
      button(tx('go.launch'), 'go:launch', () => send(store, 'launch')),
    );
    panel.append(actions);
    if (store.sendNote) panel.append(el('p', `st-msg st-msg-${store.sendNote.kind}`, store.sendNote.text()));
    // Launch's earlier mission, which a send replaced: one press puts it back, while Launch still holds what was sent
    if (env.handoff.canRestoreLaunch()) panel.append(button(tx('go.undoLaunch'), 'go:undoLaunch', () => restoreLaunch(store)));
    const s = store.sent;
    if (s) {
      const p = el('p', 'st-small st-sent', tx('go.sent', { name: s.sent.name, mass: num(s.sent.massKg, 3), where: tx(`go.where.${s.where}`) }));
      p.dataset.sent = s.key;
      panel.append(p);
      if (!s.receipt) panel.append(el('p', 'st-small', tx('go.noReadBack', { where: tx(`go.where.${s.where}`) })));
      if (s.receipt && s.check) {
        // what the destination holds, read back from it
        const r = s.receipt, km = (m: number): string => num(m / 1000, 1);
        const inc = r.inclination === 'sso' ? tx('go.held.sso') : r.inclination === 'site' ? '?' : `${num(r.inclination, 2)}°`;
        const held = el('p', 'st-small', tx('go.held', { mass: num(r.mass, 3), pe: km(r.perigeeAlt), ap: km(r.apogeeAlt), inc }));
        held.dataset.held = s.where;
        panel.append(held);
        const off = [!s.check.mass && tx('go.off.mass'), !s.check.orbit && tx('go.off.orbit'), !s.check.whole && tx('go.off.replaced', { n: r.replaced })].filter(Boolean).join(', ');
        const T = RECEIPT_TOLERANCE;
        // Launch holds a sun-synchronous target, not an inclination in degrees: its check is that both are sun-synchronous
        const tol = { g: num(T.kg * 1000, 1), km: num(T.m / 1000, 0), deg: num(T.deg, 2) };
        const verdict = el('p', `st-msg ${s.check.ok ? 'st-msg-ok' : 'st-msg-no'}`, s.check.ok
          ? tx(typeof r.inclination === 'number' ? 'go.received' : 'go.received.sso', tol)
          : tx('go.receivedOff', { what: off }));
        verdict.dataset.check = s.check.ok ? 'ok' : 'off';
        panel.append(verdict);
        // Orbit's planner may keep a spacecraft the learner chose there: its analyses then use that one's mass
        if (r.analysisMass !== undefined && Math.abs(r.analysisMass - r.mass) >= T.kg) panel.append(el('p', 'st-small', tx('go.otherCraft', { mass: num(r.analysisMass, 0) })));
      }
      if (s.key !== designKey(designOf(store))) panel.append(el('p', 'st-msg st-msg-no', tx('go.changed')));
    }
    const more = el('details', 'st-fold');
    const sum = el('summary', '', tx('go.about'));
    sum.dataset.k = 'fold:go';
    more.append(sum, el('p', 'st-small', tx('go.orbitDoes')), el('p', 'st-small', tx('go.launchDoes')), el('p', 'st-small', tx('go.separate')), el('p', 'st-small', tx('go.replaces')));
    panel.append(more);
    return panel;
  }

  // ─── under the picture ────────────────────────────────────────────────────

  function strip(store: StructureStore): HTMLElement {
    const box = el('div', 'st-strip');
    const design = designOf(store), f = figuresOf(design), ref = figuresOf(REFERENCE_DESIGN), r = f.power;
    box.dataset.design = f.key;
    const usable = r.capacityWh - r.floorWh, need = r.perOrbit.eclipseDemandWh / r.dischargeEff;
    const verdict = el('div', `st-verdict ${f.powered ? 'st-ok' : 'st-short'}`);
    verdict.append(el('strong', '', f.powered ? tx('res.ok') : tx('res.short')),
      el('span', 'st-small', tx(f.powered ? 'res.why.ok' : 'res.why.short', { need: num(need, 2), usable: num(usable, 2) })));
    const tiles = el('div', 'st-tiles');
    const tile = (label: string, value: string, key: string, delta: string, tone: '' | 'worse' | 'better' = ''): void => {
      const t = el('div', 'st-tile');
      const v = el('strong', '', value);
      v.dataset.fig = key;
      t.append(el('span', 'st-tile-label', label), v);
      if (delta) t.append(el('span', `st-tile-delta${tone ? ` st-${tone}` : ''}`, delta));
      tiles.append(t);
    };
    const showDelta = mine(store);
    const dMass = f.massKg - ref.massKg, dCap = f.batteryWh - ref.batteryWh;
    tile(tx('res.mass'), `${num(f.massKg, 3)} ${tx('unit.kg')}`, 'mass',
      showDelta && dMass ? tx('res.delta', { d: signed(dMass, 3) }) : tx('res.ofLimit', { limit: num(CDS.massKg, 2) }), showDelta && dMass > 0 ? 'worse' : '');
    tile(tx('res.capacity'), `${num(f.batteryWh, 2)} ${tx('unit.Wh')}`, 'capacity', showDelta && dCap ? tx('res.delta', { d: signed(dCap, 2) }) : '', showDelta && dCap > 0 ? 'better' : '');
    tile(tx('res.minCharge'), `${num(r.minChargeWh, 2)} ${tx('unit.Wh')} (${num((100 * r.minChargeWh) / r.capacityWh, 0)}%)`, 'minCharge', tx('res.floorAt', { wh: num(r.floorWh, 2) }));
    const short = r.shortfalls[0];
    tile(tx('res.shortfall'), short ? tx('res.shortEach', { minutes: num((short.end - short.start) / 60, 1), wh: num(short.unmetWh, 2) }) : tx('res.none'), 'shortfall', '', short ? 'worse' : '');
    const chart = el('div', 'st-strip-chart');
    chart.append(chargeChart(r, f.scenario.orbits, true));
    const computed = el('p', 'st-small st-computed', tx('res.computed'));
    box.append(verdict, tiles, chart, computed);
    return box;
  }

  return {
    panels(store) {
      const out = [optionsPanel(store)];
      if (store.progress.experiment || store.level !== 'watch') out.push(bomPanel(store), comparePanel(store), detailsPanel(store));
      else out.push(bomPanel(store));
      out.push(handoffPanel(store));
      return out;
    },
    strip,
    badge(store) {
      if (!mine(store)) return { text: tx('exp.reference'), mine: false };
      const design = designOf(store), changes = changesFrom(design);
      const d = figuresOf(design).massKg - figuresOf(REFERENCE_DESIGN).massKg;
      return { text: changes.length ? tx('exp.badge', { n: changes.length, d: signed(d, 3) }) : tx('exp.badge.same'), mine: true };
    },
    changedUnits: (store) => (mine(store) ? changesFrom(designOf(store)).map((c) => c.unit) : []),
    labels(store) {
      const d = designOf(store);
      const changed = new Set<string>(mine(store) ? changesFrom(d).map((c) => c.unit) : []);
      return [
        { unit: 'battery', text: tx(`edu.option.${d.battery}`), changed: changed.has('battery') },
        { unit: 'payload', text: tx(`edu.option.${d.payload}`), changed: changed.has('payload') },
      ];
    },
    verdict(store) {
      const f = figuresOf(designOf(store));
      return { key: f.key, text: f.powered ? tx('res.ok') : tx('res.short') };
    },
  };
}
