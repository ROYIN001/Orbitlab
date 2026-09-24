/**
 * The live equations panel (roadmap E02): the equations the simulation is
 * solving, written in the notation in force (U07), with the displayed
 * instant's values substituted and — where the recorded motion gives an
 * independent left-hand side — a balance check. A view of the telemetry panel,
 * in the Explore and the Engineer mode; the Engineer mode adds the thrust,
 * orbit, gravity, rotation and control equations.
 */
import { t } from '../i18n';
import { RAD } from '../physics/constants';
import type { VisualFrame } from '../physics/frame';
import { equations, equationsFor, type AxisRow, type Equation, type EquationContext, type EquationId, type EquationLevel } from './equations-model';
import { axisLetter } from './loop-view';
import { getNotation, type Notation } from './notation';
import './equations.css';

const MATHML = 'http://www.w3.org/1998/Math/MathML';
type Node_ = Element | string;
function mm(tag: string, ...children: Node_[]): Element {
  const e = document.createElementNS(MATHML, tag);
  for (const c of children) e.append(c);
  return e;
}
const mi = (x: string) => mm('mi', x);
/** A vector: bold through CSS, which MathML Core honours where `mathvariant` is not. */
const vec = (x: string) => { const e = mm('mi', x); e.setAttribute('class', 'vec'); return e; };
const mn = (x: string) => mm('mn', x);
const mo = (x: string) => mm('mo', x);
const sub = (a: Node_, b: Node_) => mm('msub', typeof a === 'string' ? mi(a) : a, typeof b === 'string' ? mi(b) : b);
const sup = (a: Node_, b: Node_) => mm('msup', typeof a === 'string' ? mi(a) : a, typeof b === 'string' ? mn(b) : b);
const frac = (a: Node_, b: Node_) => mm('mfrac', typeof a === 'string' ? mi(a) : a, typeof b === 'string' ? mi(b) : b);
const row = (...c: Node_[]) => mm('mrow', ...c.map((x) => (typeof x === 'string' ? mo(x) : x)));
const over = (a: Node_, accent: string) => { const e = mm('mover', typeof a === 'string' ? mi(a) : a, mo(accent)); e.setAttribute('accent', 'true'); return e; };
const paren = (...c: Node_[]) => row('(', row(...c), ')');
const half = () => frac(mn('1'), mn('2'));
function math(...c: Node_[]): Element {
  const e = mm('math', row(...c));
  e.setAttribute('display', 'block');
  return e;
}
/** Several equations one under another. */
const lines = (...rows: Element[]) => rows;

/** Symbols that differ between the standards (ISO 1151 / ГОСТ 20058-80 and Russian textbook usage). */
function sym(n: Notation) {
  const iso = n === 'iso';
  return {
    thrust: iso ? 'F' : 'P', aero: iso ? ['F', 'A'] as const : ['R', ''] as const, v: iso ? 'v' : 'V',
    q: iso ? over('q', '¯') : mi('q'), mach: iso ? 'Ma' : 'M', drag: iso ? 'D' : 'X', lift: iso ? 'L' : 'Y',
    cd: iso ? ['C', 'D'] as const : ['c', 'x'] as const, cl: iso ? ['C', 'L'] as const : ['c', 'y'] as const,
    ca: iso ? ['C', 'A'] as const : ['c', 'x1'] as const, cn: iso ? ['C', 'N'] as const : ['c', 'y1'] as const,
    quat: iso ? 'q' : 'Λ',
  };
}
const qSym = (n: Notation) => (n === 'iso' ? over('q', '¯') : mi('q'));

function formula(id: EquationId, n: Notation): Element[] {
  const s = sym(n), iso = n === 'iso';
  const aero = s.aero[1] ? sub(vec(s.aero[0]), s.aero[1]) : vec(s.aero[0]);
  switch (id) {
    case 'newton':
      return lines(math(mi('m'), vec('a'), '=', vec(s.thrust), '+', aero, '+', mi('m'), vec('g')));
    case 'dynamicPressure':
      return lines(iso ? math(qSym(n), '=', half(), mi('ρ'), sup('V', '2')) : math(qSym(n), '=', frac(row(mi('ρ'), sup('V', '2')), mn('2'))),
        math(mi(s.mach), '=', frac('V', 'a')));
    case 'drag':
      return lines(math(mi(s.drag), '=', sub(s.cd[0], s.cd[1]), qSym(n), mi('S')), math(mi(s.lift), '=', sub(s.cl[0], s.cl[1]), qSym(n), mi('S')));
    case 'rocket':
      return lines(iso ? math('Δ', mi('v'), '=', sub('I', 'sp'), sub('g', mn('0')), mi('ln'), frac(sub('m', mn('0')), sub('m', 'f')))
        : math('Δ', mi('V'), '=', sub('I', 'уд'), mi('ln'), frac(sub('m', mn('0')), sub('m', 'к'))));
    case 'budget': {
      const dv = (x: string) => row('Δ', sub(s.v, x));
      return lines(iso ? math(dv('id'), '−', dv('g'), '−', dv('D'), '−', dv('st'), '=', mi('v'), '−', sub('v', mn('0')))
        : math(dv('ид'), '−', dv('гр'), '−', dv('аэр'), '−', dv('упр'), '=', mi('V'), '−', sub('V', mn('0'))));
    }
    case 'pressureThrust':
      return lines(iso ? math(mi('F'), '=', sub('F', 'vac'), '−', sub('p', 'a'), sub('A', 'e')) : math(mi('P'), '=', sub('P', 'п'), '−', sub('p', 'h'), sub('S', 'а')));
    case 'visViva':
      return lines(math(sup(s.v, '2'), '=', mi('μ'), paren(frac(mn('2'), 'r'), '−', frac(mn('1'), 'a'))),
        math(sub('r', row(mi('a'), ',', mi('p'))), '=', mi('a'), paren(mn('1'), '±', mi('e'))));
    case 'gravity':
      return lines(math(vec('g'), '=', '−', frac(row(mi('μ'), vec('r')), sup('r', '3')), '+', sub(vec('g'), sub('J', mn('2')))),
        math(mo('|'), sub(vec('g'), sub('J', mn('2'))), mo('|'), '∝', frac(mn('3'), mn('2')), sub('J', mn('2')), frac(row(mi('μ'), sup('R', '2')), sup('r', '4'))));
    case 'aeroAngles':
      return iso ? lines(math(mi('α'), '=', mi('arctan'), frac('w', 'u')), math(mi('β'), '=', mi('arcsin'), frac('v', 'V')))
        : lines(math(mi('α'), '=', '−', mi('arctan'), frac(sub('V', 'y'), sub('V', 'x'))), math(mi('β'), '=', mi('arcsin'), frac(sub('V', 'z'), 'V')));
    case 'euler':
      return lines(math(vec('I'), over(vec('ω'), '˙'), '+', vec('ω'), '×', vec('I'), vec('ω'), '=', vec('M')));
    case 'quaternion':
      return lines(math(over(vec(s.quat), '˙'), '=', half(), vec(s.quat), iso ? '⊗' : '∘', vec('ω')));
    case 'control':
      return lines(math(sub('ω', 'd'), '=', sub('K', 'θ'), mi('e')), math(mi('ε'), '=', sub('K', 'ω'), paren(sub('ω', 'd'), '−', over('ω', '^'))));
  }
}

// --- numbers ---------------------------------------------------------------
const MINUS = '−';
function num(v: number, digits: number): string {
  if (!Number.isFinite(v)) return '—';
  // Thin spaces between thousands of the whole part only.
  const [whole, fraction] = Math.abs(v).toFixed(digits).split('.');
  const text = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009') + (fraction !== undefined ? `.${fraction}` : '');
  return (v < 0 && Number(Math.abs(v).toFixed(digits)) !== 0 ? MINUS : '') + text;
}
const UNIT = { kN: 'eq.unit.kN', t: 'eq.unit.t', ms2: 'eq.unit.ms2', ms: 'eq.unit.ms', kPa: 'eq.unit.kPa', Pa: 'eq.unit.Pa', km: 'eq.unit.km',
  kNm: 'eq.unit.kNm', kgm3: 'eq.unit.kgm3', m2: 'eq.unit.m2', s: 'eq.unit.s', degS: 'eq.unit.degS', degS2: 'eq.unit.degS2', kgm2: 'eq.unit.kgm2' } as const;
const u = (key: keyof typeof UNIT) => t(UNIT[key]);
const kN = (n: number) => `${num(n / 1000, n >= 1e5 ? 0 : 1)} ${u('kN')}`;
const tonnes = (kg: number) => `${num(kg / 1000, 1)} ${u('t')}`;
const accel = (a: number, digits = 3) => `${num(a, digits)} ${u('ms2')}`;
const speed = (v: number) => `${num(v, 1)} ${u('ms')}`;
const kPa = (p: number) => (p >= 1000 ? `${num(p / 1000, 2)} ${u('kPa')}` : `${num(p, 1)} ${u('Pa')}`);
const km = (m: number) => `${num(m / 1000, 1)} ${u('km')}`;
const deg = (rad: number, digits = 2) => `${num(rad * RAD, digits)}°`;
const kNm = (n: number) => `${num(n / 1000, 1)} ${u('kNm')}`;

/** A substitution line: text and symbols (a symbol is [base, subscript?, bold?]). */
type Part = string | readonly [string, string?, boolean?];
function line(...parts: Part[]): HTMLElement {
  const p = document.createElement('p');
  p.className = 'eq-line';
  for (const part of parts) {
    if (typeof part === 'string') { p.append(part); continue; }
    const v = document.createElement('var');
    v.textContent = part[0];
    if (part[2]) v.className = 'vec';
    if (part[1]) { const s = document.createElement('sub'); s.textContent = part[1]; v.append(s); }
    p.append(v);
  }
  return p;
}

function substitution(eq: Equation, n: Notation): HTMLElement[] {
  const v = eq.values, s = sym(n), iso = n === 'iso';
  const qs: Part = iso ? ['q̄'] : ['q'];
  switch (eq.id) {
    case 'newton':
      return [line(['m'], ` = ${tonnes(v.m)} · |`, [s.thrust, undefined, true], `| = ${kN(v.thrust)} · |`, [s.aero[0], s.aero[1] || undefined, true],
        `| = ${kN(v.aero)} · m|`, ['g', undefined, true], `| = ${kN(v.weight)}`),
        line('|', ['a', undefined, true], `| = ${accel(v.accel)} · `, ['n'], ` = ${num(v.loadFactor, 2)}`)];
    case 'dynamicPressure':
      return [line(qs, ` = ${iso ? '½ · ' : ''}${num(v.rho, 4)} ${u('kgm3')} · (${speed(v.V)})²${iso ? '' : ' / 2'} = ${kPa(v.q)}`),
        line([s.mach], ` = ${num(v.V, 1)} / ${speed(v.a)} = ${num(v.mach, 2)}`)];
    case 'drag': {
      const out = [line([s.drag], ' = ', [s.cd[0], s.cd[1]], ` · ${kPa(v.q)} · ${num(v.S, 2)} ${u('m2')} = ${kN(v.D)}`, '  (', [s.cd[0], s.cd[1]], ` = ${num(v.cd, 3)})`),
        line([s.lift], ` = ${kN(v.L)}  (`, [s.cl[0], s.cl[1]], ` = ${num(v.cl, 3)})`)];
      if (v.ca !== undefined) out.push(line([s.ca[0], s.ca[1]], ` = ${num(v.ca, 3)} · `, [s.cn[0], s.cn[1]], ` = ${num(v.cn, 3)}`));
      return out;
    }
    case 'rocket':
      return [iso ? line('Δv = ', `${num(v.isp, 1)} ${u('s')} · ${num(9.80665, 3)} ${u('ms2')} · ln(${tonnes(v.m0)} / ${tonnes(v.mf)}) = ${speed(v.dv)}`)
        : line('ΔV = ', `${speed(v.ve)} · ln(${tonnes(v.m0)} / ${tonnes(v.mf)}) = ${speed(v.dv)}`),
        line(t('eq.rocket.all', { dv: speed(v.dvAll) }))];
    case 'budget':
      return [line(`${num(v.ideal, 1)} − ${num(v.gravity, 1)} − ${num(v.drag, 1)} − ${num(v.steering, 1)} = ${speed(v.net)}`),
        line([s.v], ' − ', [s.v, '0'], ` = ${num(v.speed, 1)} − ${num(v.v0, 1)} = ${speed(v.gain)}`)];
    case 'pressureThrust':
      return [line([s.thrust], ` = ${kN(v.vac)} − ${kPa(v.p)} · ${num(v.Ae, 2)} ${u('m2')} = ${kN(v.thrust)}`)];
    case 'visViva':
      if (!Number.isFinite(v.a)) return [line(`r = ${km(v.r)} · `, [s.v], ` = ${speed(v.v)}`)];
      return [line(`r = ${km(v.r)} · `, [s.v], ` = ${speed(v.v)} → a = ${km(v.a)} · e = ${num(v.e, 4)}`),
        line(t('eq.visViva.apsides', { apo: km(v.apo), peri: km(v.peri) }))];
    case 'gravity':
      return [line(`μ/r² = ${accel(v.central, 4)} · |`, ['g', 'J2', true], `| = ${accel(v.j2, 4)} (φ = ${deg(v.latitude, 1)}) · |`, ['g', undefined, true], `| = ${accel(v.total, 4)}`)];
    case 'aeroAngles':
      return iso ? [line(`α = arctan(${num(v.w, 2)} / ${num(v.u, 1)}) = ${deg(v.alpha)}`), line(`β = arcsin(${num(v.v, 2)} / ${num(v.V, 1)}) = ${deg(v.beta)}`)]
        : [line('α = −arctan(', ['V', 'y'], ` / `, ['V', 'x'], `) = −arctan(${num(v.vy, 2)} / ${num(v.vx, 1)}) = ${deg(v.alpha)}`),
          line('β = arcsin(', ['V', 'z'], ` / V) = arcsin(${num(v.vz, 2)} / ${num(v.V, 1)}) = ${deg(v.beta)}`)];
    case 'euler':
      return [line(`I = diag(${num(v.Ixx / 1e6, 2)}, ${num(v.Iyy / 1e6, 1)}, ${num(v.Izz / 1e6, 1)}) · 10⁶ ${u('kgm2')}`)];
    case 'quaternion':
      return [line([s.quat, undefined, true], ` = (${num(v.qw, 4)}, ${num(v.qx, 4)}, ${num(v.qy, 4)}, ${num(v.qz, 4)}) · |ω| = ${num(v.omega * RAD, 3)} ${u('degS')}`),
        line(`|`, [s.quat, undefined, true], `| − 1 = ${v.norm.toExponential(1)}`)];
    case 'control':
      return [line(['ω', 'd'], ' = ', ['K', 'θ'], ` · e = ${num(v.kTheta, 2)} × ${num(v.e, 3)}° = ${num(v.wd, 3)} ${u('degS')}`),
        line('ε = ', ['K', 'ω'], ` · (`, ['ω', 'd'], ` − ω̂) = ${num(v.kOmega, 2)} × (${num(v.wd, 3)} − ${num(v.w, 3)}) = ${num(v.eps, 3)} ${u('degS2')}`)];
  }
}

function axisTable(eq: Equation, n: Notation): HTMLElement | null {
  if (!eq.rows) return null;
  const table = document.createElement('table');
  table.className = 'eq-rows';
  const head = document.createElement('tr');
  const heads: Part[][] = eq.id === 'euler' ? [['I·ω̇ + ω×Iω'], ['M']] : [[['ω', 'd']], [['K', 'θ'], '·e']];
  const axisHead = document.createElement('th'); axisHead.textContent = t('eq.rows.axis'); head.append(axisHead);
  for (const parts of heads) { const th = document.createElement('th'); th.append(...Array.from(line(...parts).childNodes)); head.append(th); }
  table.append(head);
  const fmt = (x: number) => (eq.id === 'euler' ? kNm(x) : `${num(x, 3)} ${u('degS')}`);
  for (const rowData of eq.rows as AxisRow[]) {
    const tr = document.createElement('tr');
    const axis = document.createElement('td'); axis.textContent = `${t(AXIS_NAME[rowData.axis])} (${axisLetter(rowData.axis, n)})`;
    const left = document.createElement('td'); left.textContent = fmt(rowData.left);
    const right = document.createElement('td'); right.textContent = fmt(rowData.right);
    tr.append(axis, left, right); table.append(tr);
  }
  return table;
}

function checkLine(eq: Equation): HTMLElement | null {
  const c = eq.check;
  if (!c) return null;
  const p = document.createElement('p');
  p.className = c.ok ? 'eq-check ok' : 'eq-check off';
  const pct = c.relative * 100;
  p.append(el('span', 'eq-check-mark', c.ok ? '✓' : '!'), ` ${t('eq.check')}: ${t(CHECK[eq.id])} — `,
    t('eq.check.residual', { pct: pct < 0.001 ? '< 0.001' : num(pct, pct < 1 ? 3 : 1) }));
  return p;
}
function el(tag: string, cls: string, text: string): HTMLElement { const e = document.createElement(tag); e.className = cls; e.textContent = text; return e; }

const TITLE: Record<EquationId, string> = {
  newton: 'eq.newton.title', dynamicPressure: 'eq.dynamicPressure.title', drag: 'eq.drag.title', rocket: 'eq.rocket.title', budget: 'eq.budget.title',
  pressureThrust: 'eq.pressureThrust.title', visViva: 'eq.visViva.title', gravity: 'eq.gravity.title', aeroAngles: 'eq.aeroAngles.title',
  euler: 'eq.euler.title', quaternion: 'eq.quaternion.title', control: 'eq.control.title',
};
const WHAT: Record<EquationId, string> = {
  newton: 'eq.newton.what', dynamicPressure: 'eq.dynamicPressure.what', drag: 'eq.drag.what', rocket: 'eq.rocket.what', budget: 'eq.budget.what',
  pressureThrust: 'eq.pressureThrust.what', visViva: 'eq.visViva.what', gravity: 'eq.gravity.what', aeroAngles: 'eq.aeroAngles.what',
  euler: 'eq.euler.what', quaternion: 'eq.quaternion.what', control: 'eq.control.what',
};

const CHECK: Record<EquationId, string> = {
  newton: 'eq.newton.check', dynamicPressure: 'eq.dynamicPressure.check', drag: 'eq.drag.check', rocket: 'eq.rocket.check', budget: 'eq.budget.check',
  pressureThrust: 'eq.pressureThrust.check', visViva: 'eq.visViva.check', gravity: 'eq.gravity.check', aeroAngles: 'eq.aeroAngles.check',
  euler: 'eq.euler.check', quaternion: 'eq.quaternion.check', control: 'eq.control.check',
};
const AXIS_NAME = { roll: 'loop.axis.roll', pitch: 'loop.axis.pitch', yaw: 'loop.axis.yaw' } as const;

interface Card { box: HTMLElement; live: HTMLElement }

export class EquationsPanel {
  readonly root: HTMLElement = document.createElement('section');
  private cards = new Map<EquationId, Card>();
  private key = '';
  private intro = document.createElement('p');
  private empty = document.createElement('p');

  constructor() {
    this.root.className = 'equations';
    this.intro.className = 'eq-intro';
    this.empty.className = 'eq-empty';
  }

  /** Rebuild the cards when the level, the notation or the language changes; fill them for this instant. */
  update(frame: VisualFrame | null | undefined, ctx: EquationContext | null, level: EquationLevel, lang: string): void {
    const n = getNotation(), key = `${level}|${n}|${lang}`;
    if (key !== this.key) this.build(level, n, key);
    this.empty.hidden = !!frame;
    this.empty.textContent = t('eq.none.noMission');
    if (!frame || !ctx) { for (const c of this.cards.values()) c.live.replaceChildren(); return; }
    for (const eq of equations(frame, ctx, level, n)) {
      const card = this.cards.get(eq.id);
      if (!card) continue;
      card.box.classList.toggle('unavailable', !eq.available);
      const parts: HTMLElement[] = [];
      if (!eq.available) parts.push(el('p', 'eq-reason', t(eq.reason ?? 'eq.none.noStep')));
      else {
        parts.push(...substitution(eq, n));
        const table = axisTable(eq, n); if (table) parts.push(table);
        const c = checkLine(eq); if (c) parts.push(c);
        if (eq.note) parts.push(el('p', 'eq-note', t(eq.note)));
      }
      card.live.replaceChildren(...parts);
    }
  }

  private build(level: EquationLevel, n: Notation, key: string): void {
    this.key = key;
    this.cards.clear();
    this.intro.textContent = t(level === 'engineer' ? 'eq.intro.engineer' : 'eq.intro.explore', { standard: n === 'gost' ? 'ГОСТ 20058-80' : 'ISO 1151' });
    const cards: HTMLElement[] = [];
    for (const id of equationsFor(level)) {
      const box = document.createElement('article');
      box.className = 'eq-card';
      box.dataset.eq = id;
      const title = document.createElement('h4'); title.textContent = t(TITLE[id]);
      const what = el('p', 'eq-what', t(WHAT[id]));
      const f = document.createElement('div'); f.className = 'eq-formula'; f.append(...formula(id, n));
      const live = document.createElement('div'); live.className = 'eq-live';
      box.append(title, what, f, live);
      this.cards.set(id, { box, live });
      cards.push(box);
    }
    this.root.replaceChildren(this.intro, this.empty, ...cards);
  }
}
