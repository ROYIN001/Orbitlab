import { getLang, onLangChange, t } from '../i18n';
import { RAD } from '../physics/constants';
import { assessMissionResult, RESULT_COPY, type ResultInput, type ResultMetric } from './result-content';
import { aeroAngles } from './notation';
import { resultSetting, type ResultSettingContext, type ResultSuggestion } from './result-actions';
import type { ResultCause } from './result-content';
import './mission-result.css';

export interface MissionResultOptions {
  onSeek?: (time: number) => void;
  /** R3.5: show the setup field (a dictionary key) worth looking at for this result */
  onShowSetting?: (field: string) => void;
  /** R3.5: the change to try next for this result (src/ui/result-actions.ts `resultSuggestion`), or null */
  suggestion?: (cause: ResultCause, ctx: ResultSettingContext) => ResultSuggestion | null;
  /** R3.5: apply it, to a new mission */
  onApplySuggestion?: (s: ResultSuggestion) => void;
}

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
  private readonly setting = document.createElement('button');
  private settingField: string | null = null;
  /** R3.5: the change to try next, before → after, and the press that applies it */
  private readonly suggest = document.createElement('div');
  private readonly suggestText = document.createElement('p');
  private readonly suggestBasis = document.createElement('p');
  private readonly suggestApply = document.createElement('button');
  private suggested: ResultSuggestion | null = null;

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
    this.setting.type = 'button';
    this.setting.className = 'btn mission-result-setting';
    this.setting.hidden = true;
    this.setting.addEventListener('click', () => { if (this.settingField) this.options.onShowSetting?.(this.settingField); });
    this.suggest.className = 'mission-result-suggest';
    this.suggest.hidden = true;
    this.suggestText.className = 'mission-result-change';
    this.suggestBasis.className = 'mission-result-basis';
    this.suggestApply.type = 'button';
    this.suggestApply.className = 'btn mission-result-apply';
    this.suggestApply.addEventListener('click', () => { if (this.suggested) this.options.onApplySuggestion?.(this.suggested); });
    this.suggest.append(this.suggestText, this.suggestBasis, this.suggestApply);
    host.replaceChildren(this.heading, this.status, this.detail, this.aeroWarnings, this.times, wrap,
      this.deltaNote, this.payload, this.iss, this.recovery, this.recoveryNote, this.next, this.review, this.setting, this.suggest);
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
      const angles = aeroAngles(warning.angleOfAttackRad, warning.sideslipRad); // U07: the standard's α and β
      paragraph.textContent = t(warning.scope === 'vehicle' ? 'result.aeroWarning.vehicle' : 'result.aeroWarning.debris', {
        time: warning.time.toFixed(1), alpha: (angles.alpha * RAD).toFixed(1), beta: (angles.beta * RAD).toFixed(1),
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
    // R3.5: the setting the typed cause points at, if one does
    const settingCtx: ResultSettingContext = { failureArmed: !!input.cfg.failure && input.cfg.failure.mode !== 'none', events: input.events, outcomeTime: model.outcomeTime };
    const field = this.options.onShowSetting ? resultSetting(model.cause, settingCtx) : null;
    this.showSuggestion(this.options.onApplySuggestion ? this.options.suggestion?.(model.cause, settingCtx) ?? null : null);
    this.settingField = field;
    this.setting.hidden = !field;
    if (field) {
      this.setting.dataset.field = field;
      this.setting.textContent = t('result.showSetting', { field: t(field) });
    }
    this.review.textContent = `${copy.review} (T+${model.reviewTime.toFixed(1)} s)`;
  }

  /** R3.5: the change to try next, as before → after, with what it rests on. */
  private showSuggestion(s: ResultSuggestion | null): void {
    this.suggested = s;
    this.suggest.hidden = !s;
    if (!s) return;
    this.suggest.dataset.field = s.field;
    const kg = (v: number): string => `${v.toLocaleString(getLang(), { maximumFractionDigits: 0 })} ${t('u.kg')}`;
    const utc = (d: Date): string => `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
    let before: string, after: string, basis: string;
    if (s.field === 'setup.failureMode') {
      before = t(`setup.fail.${s.before}`); after = t('setup.fail.none'); basis = t('result.suggest.basisFailure');
    } else if (s.field === 'setup.payloadMass') {
      before = kg(s.before); after = kg(s.after); basis = t('result.suggest.basisPayload', { cap: kg(s.after) });
    } else {
      before = utc(s.before); after = utc(s.after); basis = t('result.suggest.basisWindow');
    }
    this.suggestText.replaceChildren(Object.assign(document.createElement('strong'), { textContent: `${t('result.suggest.title')} · ` }),
      document.createTextNode(`${t(s.field)}: ${before} → ${after}`));
    this.suggestBasis.textContent = `${basis} ${t('result.suggest.kept')}`;
    this.suggestApply.textContent = t('result.suggest.apply');
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
