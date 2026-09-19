import { getLang, onLangChange, t } from '../i18n';
import { RAD } from '../physics/constants';
import { assessMissionResult, RESULT_COPY, type ResultInput, type ResultMetric } from './result-content';
import './mission-result.css';

export interface MissionResultOptions { onSeek?: (time: number) => void }

/** Inline post-flight summary. Call with the displayed frame-backed view. */
export class MissionResult {
  private last: ResultInput | null = null;
  private reviewTime = 0;
  private readonly heading = document.createElement('h2');
  private readonly status = document.createElement('p');
  private readonly detail = document.createElement('p');
  private readonly aeroWarnings = document.createElement('aside');
  private readonly times = document.createElement('p');
  private readonly caption = document.createElement('caption');
  private readonly headers: HTMLTableCellElement[] = [];
  private readonly cells: HTMLTableCellElement[][] = [];
  private readonly deltaNote = document.createElement('p');
  private readonly payload = document.createElement('p');
  private readonly iss = document.createElement('p');
  private readonly recovery = document.createElement('p');
  private readonly recoveryNote = document.createElement('p');
  private readonly next = document.createElement('p');
  private readonly review = document.createElement('button');

  constructor(private readonly host: HTMLElement, private readonly options: MissionResultOptions = {}) {
    host.classList.add('mission-result');
    host.hidden = true;
    host.setAttribute('role', 'region');
    this.heading.id = `${host.id || 'mission-result'}-heading`;
    host.setAttribute('aria-labelledby', this.heading.id);
    this.status.className = 'mission-result-status';
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');
    this.times.className = 'mission-result-note';
    this.aeroWarnings.className = 'mission-result-warning';
    this.aeroWarnings.setAttribute('role', 'note');
    this.deltaNote.className = 'mission-result-note';
    this.recoveryNote.className = 'mission-result-note';
    this.payload.className = 'mission-result-note';
    this.iss.className = 'mission-result-note';
    this.next.className = 'mission-result-next';
    const wrap = document.createElement('div');
    wrap.className = 'mission-result-table-wrap';
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region');
    this.caption.id = `${host.id || 'mission-result'}-orbit-caption`;
    wrap.setAttribute('aria-labelledby', this.caption.id);
    const table = document.createElement('table');
    table.append(this.caption);
    const head = table.createTHead().insertRow();
    for (let column = 0; column < 4; column++) {
      const th = document.createElement('th');
      th.scope = 'col';
      head.append(th);
      this.headers.push(th);
    }
    const body = table.createTBody();
    for (let row = 0; row < 4; row++) {
      const tr = body.insertRow();
      const th = document.createElement('th');
      th.scope = 'row';
      tr.append(th);
      this.cells.push([th, tr.insertCell(), tr.insertCell(), tr.insertCell()]);
    }
    wrap.append(table);
    this.review.type = 'button';
    this.review.className = 'btn mission-result-review';
    this.review.hidden = !options.onSeek;
    this.review.addEventListener('click', () => this.options.onSeek?.(this.reviewTime));
    host.replaceChildren(this.heading, this.status, this.detail, this.aeroWarnings, this.times, wrap,
      this.deltaNote, this.payload, this.iss, this.recovery, this.recoveryNote, this.next, this.review);
    onLangChange(() => { if (this.last) this.update(this.last); });
  }

  clear(): void {
    this.last = null;
    this.host.hidden = true;
  }

  update(input: ResultInput): void {
    this.last = input;
    const model = assessMissionResult(input);
    this.host.hidden = !model;
    if (!model) return;
    const copy = RESULT_COPY[getLang()];
    this.host.dataset.outcome = model.outcome;
    this.heading.textContent = copy.heading;
    if (this.status.textContent !== copy.outcome[model.outcome]) this.status.textContent = copy.outcome[model.outcome];
    this.detail.textContent = copy.cause[model.cause].detail;
    this.aeroWarnings.hidden = model.aeroWarnings.length === 0;
    this.aeroWarnings.replaceChildren(...model.aeroWarnings.map(warning => {
      const paragraph = document.createElement('p');
      paragraph.textContent = t(warning.scope === 'vehicle' ? 'result.aeroWarning.vehicle' : 'result.aeroWarning.debris', {
        time: warning.time.toFixed(1), alpha: (warning.angleOfAttackRad * RAD).toFixed(1), beta: (warning.sideslipRad * RAD).toFixed(1),
      });
      return paragraph;
    }));
    this.times.textContent = `${copy.assessed} T+${model.outcomeTime.toFixed(1)} s · ${copy.displayed} T+${model.displayedTime.toFixed(1)} s`;
    this.caption.textContent = copy.orbitTable;
    [copy.parameter, copy.target, copy.actual, copy.delta].forEach((text, index) => { this.headers[index].textContent = text; });
    model.metrics.forEach((metric, row) => {
      const cells = this.cells[row];
      cells[0].textContent = copy.metric[metric.key];
      cells[1].textContent = metric.target === null ? copy.free : this.number(metric.target, metric);
      cells[2].textContent = this.number(metric.actual, metric);
      cells[3].textContent = this.number(metric.delta, metric, true);
      cells[3].classList.toggle('mission-result-miss', metric.outside === true);
      cells[3].setAttribute('aria-label', `${cells[3].textContent}${metric.outside ? `; ${copy.outside}` : ''}`);
      cells[2].title = metric.actual === null ? copy.unavailable : '';
      cells[3].title = metric.delta === null ? copy.unavailable : '';
    });
    this.deltaNote.textContent = copy.deltaNote;
    this.payload.textContent = copy.pendingPayload;
    this.payload.hidden = model.payloadSeparated || model.outcome === 'failed';
    this.iss.textContent = copy.iss;
    this.iss.hidden = !model.issPlaneOnly;
    this.recovery.textContent = `${copy.booster}: ${copy.recovery[model.recovery]}`;
    this.recoveryNote.textContent = copy.separate;
    this.next.textContent = `${copy.next}: ${copy.cause[model.cause].next}`;
    this.reviewTime = model.reviewTime;
    this.review.textContent = `${copy.review} (T+${model.reviewTime.toFixed(1)} s)`;
  }

  private number(value: number | null, metric: ResultMetric, signed = false): string {
    if (value === null) return '—';
    const precision = metric.unit === 'km' ? 1 : 2;
    const rounded = Math.abs(value) < 0.5 * 10 ** -precision ? 0 : value;
    return `${signed && rounded > 0 ? '+' : ''}${rounded.toLocaleString(getLang(), {
      minimumFractionDigits: precision, maximumFractionDigits: precision,
    })} ${metric.unit === 'deg' ? '°' : 'km'}`;
  }
}
