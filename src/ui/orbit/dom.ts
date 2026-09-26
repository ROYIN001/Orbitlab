/**
 * The small pieces the Orbit section's pages are built of (roadmap O01,
 * O02): element helpers, number formats in the interface language, the
 * units a value is shown in, and a labelled slider with a number box.
 */
import { t, getLang } from '../../i18n';
import { DEG, R_EARTH, RAD } from '../../physics/constants';
import { SLIDER_STEPS, type SliderScale } from '../../orbit/playground-model';
import { formatDuration } from '../lifetime';

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(cls: string, text: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

export const num = (v: number, d = 0): string => v.toLocaleString(getLang(), { minimumFractionDigits: d, maximumFractionDigits: d });
const SUP: Record<string, string> = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
/** 9.904 × 10⁻⁵ */
export function sci(v: number, d = 3): string {
  if (v === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(v)));
  return `${num(v / 10 ** exp, d)} × 10${String(exp).split('').map((c) => SUP[c] ?? c).join('')}`;
}
/** hours and minutes, 13:05 */
export const hhmm = (hours: number): string => {
  const m = Math.round(hours * 60) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
/** a span of orbit time: 1 h 32 min, 23 h 56 min, 58.3 s */
export function span(seconds: number): string {
  if (seconds < 120) return t('pg.unit.s', { n: num(seconds, 1) });
  const m = Math.round(seconds / 60);
  if (m < 60) return t('pg.unit.min', { n: num(m) });
  if (m < 48 * 60) return t('pg.unit.hmin', { h: num(Math.floor(m / 60)), m: num(m % 60) });
  return formatDuration(seconds);
}
/** the playground clock: 2 d 03:14:15 */
export function clockText(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d ? `${t('pg.unit.days', { n: d })} ` : ''}${p(h)}:${p(m)}:${p(sec)}`;
}

/** A labelled slider with a number box beside it, both saying the same value. */
export class Field {
  readonly root: HTMLElement;
  private readonly range: HTMLInputElement;
  private readonly box: HTMLInputElement;
  private value = 0;

  constructor(
    label: string, private readonly unit: string, private readonly scale: SliderScale,
    /** from SI to what is shown, and back */
    private readonly show: (v: number) => number, private readonly read: (n: number) => number,
    private readonly digits: number, limits: { min: number; max: number },
    onInput: (v: number) => void,
  ) {
    this.root = el('div', 'pg-field');
    const head = el('label', 'pg-field-head');
    const name = el('span', 'pg-field-name', label);
    this.box = el('input', 'pg-field-box');
    this.box.type = 'number';
    this.box.step = String(10 ** -digits);
    this.box.min = String(show(limits.min));
    this.box.max = String(show(limits.max));
    this.box.inputMode = 'decimal';
    const unitEl = el('span', 'pg-field-unit', unit);
    head.append(name, this.box, unitEl);
    this.range = el('input', 'pg-field-range');
    this.range.type = 'range';
    this.range.min = '0';
    this.range.max = String(SLIDER_STEPS);
    this.range.step = '1';
    this.range.setAttribute('aria-label', label);
    this.range.addEventListener('input', () => {
      this.value = this.scale.toValue(Number(this.range.value));
      this.box.value = this.format(this.value);
      onInput(this.value);
    });
    this.box.addEventListener('change', () => {
      const n = Number(this.box.value.replace(',', '.'));
      if (!Number.isFinite(n)) { this.box.value = this.format(this.value); return; }
      const v = Math.min(limits.max, Math.max(limits.min, this.read(n)));
      this.set(v);
      onInput(v);
    });
    this.root.append(head, this.range);
  }

  private format(v: number): string {
    return this.show(v).toFixed(this.digits);
  }

  /** Show a value: the number box says it exactly, the slider as near as its range allows. */
  set(v: number): void {
    this.value = v;
    this.range.value = String(this.scale.toPosition(v));
    this.box.value = this.format(v);
    this.range.setAttribute('aria-valuetext', `${this.format(v)} ${this.unit}`);
  }
}

export const km = { show: (v: number) => v / 1000, read: (n: number) => n * 1000 };
export const altKm = { show: (v: number) => (v - R_EARTH) / 1000, read: (n: number) => R_EARTH + n * 1000 };
export const deg = { show: (v: number) => v * RAD, read: (n: number) => n * DEG };
export const plain = { show: (v: number) => v, read: (n: number) => n };
