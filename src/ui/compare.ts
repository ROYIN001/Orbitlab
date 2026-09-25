/**
 * Comparing two flights (roadmap U02): pin the flight on screen as the
 * reference — or open one saved earlier — and every telemetry chart carries
 * it as a dashed trace, the 3-D view as a dashed path, and this section a
 * table of the figures both flights have side by side, with the difference.
 */
import { t, getLang } from '../i18n';
import {
  compareFlights, flightFileName, flightFileText, parseFlightFile, FLIGHT_FILE_EXTENSION,
  type ComparedFigure, type ReferenceFlight, type ReferenceSample,
} from '../replay/reference';
import type { SimEvent } from '../physics/simulation';
import { downloadBlob } from './download';
import { eventLabel } from './phase';

export interface CompareHost {
  /** the flight on screen as a reference, or null when there is none yet */
  currentAsReference(): ReferenceFlight | null;
  /** the flight on screen, for the table */
  current(): { telemetry: readonly ReferenceSample[]; events: readonly SimEvent[] } | null;
  onReference(ref: ReferenceFlight | null): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export class ComparePanel {
  readonly root = el('section', 'compare');
  private reference: ReferenceFlight | null = null;
  private message = '';
  private table = el('div', 'compare-table');

  constructor(private readonly host: CompareHost) {
    this.render();
  }

  get ref(): ReferenceFlight | null { return this.reference; }

  setReference(ref: ReferenceFlight | null): void {
    this.reference = ref;
    this.message = '';
    this.host.onReference(ref);
    this.render();
  }

  render(): void {
    const r = this.root;
    r.replaceChildren();
    r.append(el('h3', 'section', t('cmp.title')));
    const row = el('div', 'compare-actions');
    const button = (key: string, onClick: () => void, disabled = false): HTMLButtonElement => {
      const b = el('button', 'btn', t(key));
      b.type = 'button';
      b.disabled = disabled;
      b.addEventListener('click', onClick);
      row.append(b);
      return b;
    };
    button('cmp.pin', () => {
      const ref = this.host.currentAsReference();
      if (ref) this.setReference(ref);
    }).id = 'btn-compare-pin';
    const input = el('input');
    input.type = 'file';
    input.accept = `${FLIGHT_FILE_EXTENSION},.json,application/json`;
    input.hidden = true;
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      const ref = parseFlightFile(await file.text());
      if (ref) this.setReference(ref);
      else { this.message = t('cmp.unreadable'); this.render(); }
    });
    button('cmp.open', () => input.click()).id = 'btn-compare-open';
    button('cmp.save', () => {
      const ref = this.host.currentAsReference();
      if (ref) downloadBlob(new Blob([flightFileText(ref)], { type: 'application/json' }), flightFileName(ref));
    }).id = 'btn-compare-save';
    row.append(input);
    r.append(row);
    if (this.message) r.append(el('p', 'compare-message', this.message));
    if (this.reference) {
      const chip = el('div', 'compare-chip');
      chip.append(el('span', 'compare-swatch'), el('span', undefined, t('cmp.reference', { label: this.reference.label })));
      const clear = el('button', 'compare-clear', '×');
      clear.type = 'button';
      clear.setAttribute('aria-label', t('cmp.clear'));
      clear.title = t('cmp.clear');
      clear.addEventListener('click', () => this.setReference(null));
      chip.append(clear);
      r.append(chip);
    } else r.append(el('p', 'field-note', t('cmp.note')));
    r.append(this.table);
    this.update();
  }

  /** Refresh the table, at the panel's cadence. */
  update(): void {
    const cur = this.host.current();
    if (!this.reference || !cur || !cur.telemetry.length) { this.table.replaceChildren(); return; }
    const rows = compareFlights(cur, this.reference);
    const table = el('table');
    const head = table.createTHead().insertRow();
    for (const key of ['cmp.col.quantity', 'cmp.col.current', 'cmp.col.reference', 'cmp.col.delta']) head.append(el('th', undefined, t(key)));
    const body = table.createTBody();
    for (const f of rows) {
      const tr = body.insertRow();
      tr.append(el('th', undefined, figureLabel(f)));
      for (const v of [f.current, f.reference]) tr.append(el('td', 'num', formatFigure(v, f.unit)));
      const delta = f.current !== null && f.reference !== null ? f.current - f.reference : null;
      tr.append(el('td', 'num', formatFigure(delta, f.unit, true)));
    }
    this.table.replaceChildren(table);
  }
}

export function figureLabel(f: ComparedFigure): string {
  if (f.key.startsWith('event:')) return t('cmp.row.event', { event: eventLabel(f.key.slice(6), {}) });
  switch (f.key) {
    case 'insertion': return t('cmp.row.insertion');
    case 'perigee': return t('cmp.row.perigee');
    case 'apogee': return t('cmp.row.apogee');
    case 'inclination': return t('cmp.row.inclination');
    case 'maxQ': return t('cmp.row.maxQ');
    case 'maxQTime': return t('cmp.row.maxQTime');
    case 'maxG': return t('cmp.row.maxG');
    default: return t('cmp.row.dvLeft');
  }
}

export function formatFigure(v: number | null, unit: ComparedFigure['unit'], signed = false): string {
  if (v === null || !Number.isFinite(v)) return '—';
  const digits = unit === 'm/s' ? 0 : unit === 'deg' || unit === 'g' || unit === 'kPa' ? 2 : 1;
  // a difference that rounds to nothing is nothing: no sign, no "−0.0"
  const rounded = Math.round(v * 10 ** digits) / 10 ** digits || 0;
  v = rounded;
  const text = v.toLocaleString(getLang(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const units: Record<ComparedFigure['unit'], string> = { s: t('u.s'), km: t('u.km'), deg: '°', kPa: t('u.kPa'), g: 'g', 'm/s': t('u.ms') };
  return `${signed && v > 0 ? '+' : ''}${text}${unit === 'deg' ? '' : ' '}${units[unit]}`;
}
