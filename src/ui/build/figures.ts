/**
 * The Build section's stage-by-stage figures: the budget core's Δv phase by
 * phase, the thrust-to-weight at each ignition, the structural ratio and the
 * propellant fraction (src/design/stage-table.ts over src/design/budget.ts).
 * A table on a wide screen; on a phone (≤ 860 px, build.css) one card per
 * stage, because six columns do not fit 343 px and a table that scrolls
 * sideways hides half of itself. Both are built, and the style sheet shows
 * one. The Watch level shows a real vehicle's; D02 and D03 will show a
 * design's.
 */
import { t } from '../../i18n';
import type { VehicleSpec } from '../../types';
import type { StageRow, StageTable } from '../../design/stage-table';
import { stageName } from '../names';
import { el, num } from '../orbit/dom';

const ms = (v: number): string => `${num(v)} ${t('u.ms')}`;
const sec = (v: number): string => (Number.isFinite(v) ? `${num(v)} ${t('u.s')}` : '—');
const ratio = (v: number): string => num(v, 3);
const tw = (v: number): string => num(v, 2);
/** a mass in tonnes above 10 t, else in kilograms */
/** A figure and its unit on one line, however narrow the cell it is put in: "23.8 t" never ends a line at "23.8". */
export const unbroken = (s: string): string => s.replace(/ /g, '\u00a0');

export const mass = (kg: number): string => (kg >= 10_000 ? `${num(kg / 1000, kg >= 100_000 ? 0 : 1)} ${t('u.t')}` : `${num(kg)} ${t('u.kg')}`);

const phaseLabel = (kind: string): string => (kind === 'parallel' ? t('build.fig.parallel') : t('build.fig.core'));

/** A cell of one line, or of one line per phase with its label. */
function lines(parts: { label?: string; value: string }[]): HTMLElement[] {
  return parts.map((p) => {
    const line = el('span', 'bs-line');
    if (p.label) line.append(el('small', undefined, p.label), ' ');
    // a label may wrap (Russian ones are long); a number and its unit never do
    line.append(el('span', 'bs-v', p.value));
    return line;
  });
}

function stageTitle(spec: VehicleSpec, r: StageRow): HTMLElement {
  const head = el('span', 'bs-stage-name');
  head.append(el('strong', undefined, t('build.label.stage', { n: r.stageIndex + 1 })), el('small', undefined, stageName(spec, r.stageId, spec.stages[r.stageIndex].name)));
  return head;
}

/** The figures of each cell, shared by the table and the cards. */
function cells(r: StageRow): { dv: HTMLElement[]; burn: HTMLElement[]; tw: HTMLElement[]; eps: HTMLElement[]; prop: HTMLElement[] } {
  const split = r.phases.length > 1;
  const straps = r.boosters.map((b) => ({ label: `${t('build.fig.strapOns')} ×${b.count}`, b }));
  return {
    dv: split ? lines([{ value: ms(r.dv) }, ...r.phases.map((p) => ({ label: phaseLabel(p.phase), value: ms(p.dv) }))]) : lines([{ value: ms(r.dv) }]),
    burn: split ? lines(r.phases.map((p) => ({ label: phaseLabel(p.phase), value: sec(p.burnTime) }))) : lines([{ value: sec(r.phases[0].burnTime) }]),
    tw: lines([{ value: tw(r.twIgnition) }]),
    eps: lines([{ value: ratio(r.structuralRatio) }, ...straps.map((s) => ({ label: s.label, value: ratio(s.b.structuralRatio) }))]),
    prop: lines([{ value: ratio(r.propellantFraction) }, ...straps.map((s) => ({ label: s.label, value: ratio(s.b.propellantFraction) }))]),
  };
}

/** The figures of `table` for `spec`, as a table and as cards. */
export function figuresView(spec: VehicleSpec, table: StageTable): HTMLElement {
  const box = el('div', 'bs-figures-body');
  const heads = ['build.fig.stage', 'build.fig.dv', 'build.fig.burn', 'build.fig.tw', 'build.fig.eps', 'build.fig.prop'].map((k) => t(k));

  // wide screens: a table
  const tableEl = el('table', 'bs-table');
  const caption = el('caption', 'bs-sr', t('build.fig.caption', { name: spec.name }));
  const thead = el('thead');
  const hr = el('tr');
  heads.forEach((h, k) => {
    const th = el('th', k ? 'num' : undefined, h);
    th.scope = 'col';
    hr.append(th);
  });
  thead.append(hr);
  const tbody = el('tbody');
  for (const r of table.rows) {
    const c = cells(r);
    const tr = el('tr');
    const th = el('th');
    th.scope = 'row';
    th.append(stageTitle(spec, r));
    tr.append(th);
    for (const parts of [c.dv, c.burn, c.tw, c.eps, c.prop]) {
      const td = el('td', 'num');
      td.append(...parts);
      tr.append(td);
    }
    tbody.append(tr);
  }
  const tfoot = el('tfoot');
  const fr = el('tr');
  const ft = el('th', undefined, t('build.fig.total'));
  ft.scope = 'row';
  const total = el('td', 'num', ms(table.totalDv));
  const rest = el('td', 'bs-foot-rest');
  rest.colSpan = 4;
  rest.append(...lines([
    { label: t('build.fig.liftoffMass'), value: mass(table.liftoffMass) },
    { label: t('build.stat.liftoffTW'), value: tw(table.liftoffTW) },
    { label: t('build.fig.payloadFraction'), value: `${num(table.payloadFraction * 100, 2)} %` },
  ]));
  fr.append(ft, total, rest);
  tfoot.append(fr);
  tableEl.append(caption, thead, tbody, tfoot);

  // a phone: a card per stage, then the whole rocket's
  const cards = el('div', 'bs-cards');
  for (const r of table.rows) {
    const c = cells(r);
    const card = el('section', 'bs-fig-card');
    card.append(stageTitle(spec, r));
    const dl = el('dl', 'pg-dl bs-fig-dl');
    [c.dv, c.burn, c.tw, c.eps, c.prop].forEach((parts, k) => {
      const dd = el('dd');
      dd.append(...parts);
      dl.append(el('dt', undefined, heads[k + 1]), dd);
    });
    card.append(dl);
    cards.append(card);
  }
  const whole = el('section', 'bs-fig-card');
  whole.append(el('strong', 'bs-stage-name', t('build.fig.total')));
  const dl = el('dl', 'pg-dl bs-fig-dl');
  for (const [k, v] of [
    [t('build.fig.dv'), ms(table.totalDv)], [t('build.fig.liftoffMass'), mass(table.liftoffMass)],
    [t('build.stat.liftoffTW'), tw(table.liftoffTW)], [t('build.fig.payloadFraction'), `${num(table.payloadFraction * 100, 2)} %`],
  ]) dl.append(el('dt', undefined, k), el('dd', undefined, v));
  whole.append(dl);
  cards.append(whole);

  box.append(tableEl, cards);
  return box;
}
