/**
 * The lessons page's checking tab (`#/lessons/check`; roadmap T02, Phase 4 map
 * §4.2): the instructor opens the results files the class sent and their own
 * lesson file, and each flight is flown again on this computer — in the
 * re-check worker (src/lessons/recheck-job.ts), with progress and a Stop — and
 * graded again. Each record, and each of its criteria, is shown as a match, a
 * borderline (too close to a bound for two computers to be sure of), a
 * difference, or a flight that cannot be flown again, with why; the whole
 * check saves as CSV. Everything stays on this computer.
 */
import { getLang, t } from '../../i18n';
import { allLessons, lessonNumber } from '../../lessons/catalog';
import { LESSON_FILE_EXTENSION, parseLessonFile, type FileIssue } from '../../lessons/lesson-file';
import { RESULTS_FILE_EXTENSION, verifyResults, type RecheckField, type ResultsFile } from '../../lessons/progress';
import { collectRecords, recheckCsv, statusCounts, type CheckStatus, type CriterionCheck, type RecordCheck, type ResultsCheck } from '../../lessons/recheck';
import { runRecheckJob } from '../../lessons/recheck-job';
import { MEASURES } from '../../lessons/measures';
import { localText, unitText } from '../../lessons/text';
import type { CatalogLesson, Criterion } from '../../lessons/types';
import { downloadBlob } from '../download';
import { issueSentence } from './author-view';

export interface CheckHost {
  /** the teacher's lessons this browser's catalogue already has (from a lesson file opened earlier) */
  customLessons(): CatalogLesson[];
}

interface ResultsInput { name: string; raw: unknown }
interface LessonsInput { name: string; lessons: CatalogLesson[]; issues: FileIssue[]; usable: boolean }

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

const STATUS_KEY: Record<CheckStatus, string> = {
  match: 'lesson.check.status.match', borderline: 'lesson.check.status.borderline', differs: 'lesson.check.status.differs', cannotRefly: 'lesson.check.status.cannotRefly',
};
const STATUS_NOTE: Record<CheckStatus, string> = {
  match: 'lesson.check.statusNote.match', borderline: 'lesson.check.statusNote.borderline', differs: 'lesson.check.statusNote.differs', cannotRefly: 'lesson.check.statusNote.cannotRefly',
};
const REASON_KEY: Record<NonNullable<RecordCheck['reason']>, string> = {
  caseLesson: 'lesson.check.reason.caseLesson', noLesson: 'lesson.check.reason.noLesson', noMission: 'lesson.check.reason.noMission',
  mission: 'lesson.check.reason.mission', sixDof: 'lesson.check.reason.sixDof', actions: 'lesson.check.reason.actions',
  notReached: 'lesson.check.reason.notReached', incomplete: 'lesson.check.reason.incomplete', error: 'lesson.check.reason.error',
};
const VERDICT_KEY: Record<string, string> = {
  pass: 'lesson.check.verdict.pass', passedWithHelp: 'lesson.check.verdict.passedWithHelp', fail: 'lesson.check.verdict.fail', open: 'lesson.check.verdict.open',
};
const WHICH_KEY = { passed: 'lesson.check.which.passed', last: 'lesson.check.which.last' } as const;
const FIELD_KEY: Record<RecheckField, string> = {
  mission: 'lesson.check.field.mission', t: 'lesson.check.field.t', clock: 'lesson.check.field.clock', actions: 'lesson.check.field.actions', app: 'lesson.check.field.app',
};
const missingFieldList = (fields: readonly RecheckField[]): string => fields.map((f) => t(FIELD_KEY[f])).join(', ');

/** A number to as many digits as a difference at the tolerance shows, in the language's own decimal sign, with its unit. */
function valueText(v: number | null | undefined, unit: string, tol: number | null): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const digits = tol && tol > 0 ? Math.min(9, Math.max(0, Math.ceil(-Math.log10(tol)) + 1)) : 3;
  const text = v.toLocaleString(getLang(), { maximumFractionDigits: digits, useGrouping: false });
  // one unit with its number: a no-break space, and no line break after a slash ("ม./วินาที" broke there on a phone)
  return unit ? `${text}\u00a0${unitText(unit).replace(/\//g, '/\u2060')}` : text;
}

class CheckView {
  private results: ResultsInput[] = [];
  private lessonFiles: LessonsInput[] = [];
  private check: ResultsCheck | null = null;
  private running: AbortController | null = null;
  private progress = { done: 0, total: 0 };
  private checksums: Array<boolean | null> = [];

  constructor(private readonly host: CheckHost, private readonly container: HTMLElement) {}

  applyLanguage(): void { this.render(); }

  /** Every lesson the check can hold a record to: the files' first, then the catalogue's. */
  private lessons(): CatalogLesson[] {
    const out: CatalogLesson[] = [];
    for (const f of this.lessonFiles) for (const l of f.lessons) if (!out.some((x) => x.id === l.id)) out.push(l);
    for (const l of this.host.customLessons()) if (!out.some((x) => x.id === l.id)) out.push(l);
    return out;
  }

  render(): void {
    const body = el('div', 'lesson-catalog recheck');
    body.append(el('h2', undefined, t('lesson.check.title')), el('p', 'lead', t('lesson.check.lead')));
    body.append(this.filesBox(), this.runBox());
    if (this.check) body.append(this.report(this.check));
    body.append(el('p', 'lesson-note recheck-privacy', t('lesson.check.privacy')));
    this.container.replaceChildren(body);
  }

  private picker(label: string, accept: string, onFiles: (files: File[]) => void): HTMLElement[] {
    const input = el('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = accept;
    input.hidden = true;
    input.addEventListener('change', () => { const files = [...(input.files ?? [])]; input.value = ''; if (files.length) onFiles(files); });
    const button = el('button', undefined, label);
    button.type = 'button';
    button.addEventListener('click', () => input.click());
    return [button, input];
  }

  private filesBox(): HTMLElement {
    const box = el('section', 'author-box');
    box.append(el('h3', undefined, t('lesson.check.files')));
    const bar = el('div', 'lesson-bar');
    bar.append(
      ...this.picker(t('lesson.check.openResults'), `${RESULTS_FILE_EXTENSION},.json,application/json`, (files) => void this.addResults(files)),
      ...this.picker(t('lesson.check.openLessons'), `${LESSON_FILE_EXTENSION},.json,application/json`, (files) => void this.addLessons(files)),
    );
    if (this.results.length || this.lessonFiles.length) {
      const clear = el('button', undefined, t('lesson.check.clear'));
      clear.type = 'button';
      clear.addEventListener('click', () => { this.supersede(); this.results = []; this.lessonFiles = []; this.checksums = []; this.render(); });
      bar.append(clear);
    }
    box.append(bar);
    const list = el('ul', 'recheck-files');
    if (!this.results.length) list.append(el('li', 'lesson-note', t('lesson.check.noResults')));
    const { files } = collectRecords(this.results.map((r) => r.raw), this.results.map((r) => r.name));
    files.forEach((f, i) => {
      const sum = this.checksums[i];
      const state = !f.readable ? t('lesson.check.unreadable') : sum === true ? t('lesson.check.checksumOk') : sum === false ? t('lesson.check.checksumBad') : '';
      const li = el('li', !f.readable || sum === false ? 'fail' : undefined);
      li.append(el('b', undefined, f.name ?? String(i + 1)), document.createTextNode(` — ${f.student ?? t('lesson.check.noName')}`));
      if (f.exportedAt) li.append(document.createTextNode(`, ${t('lesson.check.exported', { date: f.exportedAt.slice(0, 16).replace('T', ' ') })}`));
      if (state) li.append(el('span', 'recheck-sum', ` · ${state}`));
      list.append(li);
    });
    for (const f of this.lessonFiles) {
      const li = el('li', f.usable ? undefined : 'fail');
      li.append(el('b', undefined, f.name), document.createTextNode(` — ${f.usable ? t('lesson.check.lessonsLoaded', { n: f.lessons.length }) : t('lesson.file.unusable')}`));
      if (f.issues.length) {
        const ul = el('ul');
        for (const i of f.issues) ul.append(el('li', i.level, issueSentence(i)));
        li.append(ul);
      }
      list.append(li);
    }
    box.append(list);
    return box;
  }

  /** The files changed: a check still running is of files no longer on screen, and a finished one is out of date. */
  private supersede(): void {
    this.running?.abort();
    this.running = null;
    this.check = null;
  }

  private async addResults(files: File[]): Promise<void> {
    this.supersede();
    for (const f of files) {
      let raw: unknown = null;
      try { raw = JSON.parse(await f.text()); } catch { /* shown as not a results file */ }
      this.results.push({ name: f.name, raw });
    }
    this.render();
    // the checksums are quick: shown as soon as the files are in
    this.checksums = await Promise.all(this.results.map(async (r) => {
      const { files: [info] } = collectRecords([r.raw]);
      if (!info.readable) return null;
      try { return await verifyResults(r.raw as ResultsFile); } catch { return false; }
    }));
    if (!this.running) this.render();
  }

  private async addLessons(files: File[]): Promise<void> {
    this.supersede();
    for (const f of files) {
      let raw: unknown = null;
      try { raw = JSON.parse(await f.text()); } catch { /* reported as unusable */ }
      const parsed = parseLessonFile(raw, new Set());
      this.lessonFiles.push({ name: f.name, lessons: parsed.lessons, issues: parsed.issues.filter((i) => i.level === 'error'), usable: parsed.usable });
    }
    this.render();
  }

  private runBox(): HTMLElement {
    const box = el('div', 'recheck-run');
    const run = el('button', 'lesson-primary', t('lesson.check.run'));
    run.type = 'button';
    run.disabled = !this.results.length || !!this.running;
    run.addEventListener('click', () => void this.run());
    box.append(run);
    if (this.running) {
      const stop = el('button', undefined, t('lesson.check.stop'));
      stop.type = 'button';
      stop.addEventListener('click', () => this.running?.abort());
      const meter = el('div', 'lesson-meter');
      const fill = el('i');
      fill.style.width = `${this.progress.total ? (100 * this.progress.done) / this.progress.total : 0}%`;
      meter.append(fill);
      const status = el('span', 'lesson-note', t('lesson.check.progress', { done: this.progress.done, total: this.progress.total }));
      status.setAttribute('role', 'status');
      box.append(stop, meter, status);
    } else if (this.check) {
      const csv = el('button', undefined, t('lesson.check.csv'));
      csv.type = 'button';
      csv.addEventListener('click', () => {
        const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        downloadBlob(new Blob([recheckCsv(this.check!)], { type: 'text/csv' }), `orbitlab-recheck-${stamp}.csv`);
      });
      box.append(csv);
    }
    return box;
  }

  private async run(): Promise<void> {
    const stop = new AbortController();
    this.running = stop;
    this.progress = { done: 0, total: 0 };
    this.check = null;
    this.render();
    let result: ResultsCheck;
    try {
      result = await runRecheckJob({ results: this.results.map((r) => r.raw), names: this.results.map((r) => r.name), lessons: this.lessons() }, stop.signal, (done, total, sofar) => {
        if (this.running !== stop) return;
        this.progress = { done, total };
        this.check = { ...sofar, records: [...sofar.records] };
        this.render();
      });
    } catch (e) {
      if (this.running !== stop) return;
      this.check = null;
      this.running = null;
      this.render();
      this.container.querySelector('.recheck-run')?.append(el('p', 'lesson-note fail', t('lesson.check.failed', { reason: e instanceof Error ? e.message : String(e) })));
      return;
    }
    // files opened or closed while it ran: this check is of files no longer on screen
    if (this.running !== stop) return;
    this.check = result;
    this.checksums = result.files.map((f) => f.checksum);
    this.running = null;
    this.render();
  }

  private report(check: ResultsCheck): HTMLElement {
    const box = el('section', 'recheck-report');
    const n = statusCounts(check);
    const summary = el('p', 'recheck-summary', t(check.stopped ? 'lesson.check.stopped' : 'lesson.check.summary', {
      total: check.records.length, match: n.match, borderline: n.borderline, differs: n.differs, cannot: n.cannotRefly,
    }));
    summary.setAttribute('role', 'status');
    box.append(summary);
    const legend = el('dl', 'recheck-legend');
    for (const s of ['match', 'borderline', 'differs', 'cannotRefly'] as const) {
      const dt = el('dt');
      dt.append(el('span', `recheck-chip ${s}`, t(STATUS_KEY[s])));
      legend.append(dt, el('dd', undefined, t(STATUS_NOTE[s])));
    }
    box.append(legend);
    const catalogue = allLessons(this.lessons());
    for (const r of check.records) box.append(this.recordCard(r, check, catalogue));
    return box;
  }

  private recordCard(r: RecordCheck, check: ResultsCheck, catalogue: readonly CatalogLesson[]): HTMLElement {
    const lesson = catalogue.find((l) => l.id === r.lessonId);
    const card = el('details', `recheck-record ${r.status}`);
    const head = el('summary');
    const who = el('span', 'recheck-who');
    who.append(el('b', undefined, r.student ?? check.files[r.file]?.name ?? t('lesson.check.noName')),
      el('span', undefined, lesson ? `${lessonNumber(lesson)} ${localText(lesson.title)}` : r.lessonId));
    const what = el('span', 'recheck-what', `${r.which.map((w) => t(WHICH_KEY[w])).join(' + ')} · ${r.at.slice(0, 16).replace('T', ' ')}`);
    const said = (v: string): string => t(VERDICT_KEY[v] ?? v);
    const verdict = el('span', 'recheck-verdict', r.recheckedVerdict ? `${said(r.recordedVerdict)} → ${said(r.recheckedVerdict)}` : said(r.recordedVerdict));
    head.append(el('span', `recheck-chip ${r.status}`, t(STATUS_KEY[r.status])), who, what, verdict);
    card.append(head);
    const notes = el('ul', 'recheck-notes');
    if (r.reason) notes.append(el('li', undefined, t(REASON_KEY[r.reason])));
    if (r.missing.length) notes.append(el('li', undefined, t('lesson.check.missing', { fields: missingFieldList(r.missing) })));
    notes.append(el('li', undefined, r.sameBuild === null ? t('lesson.check.build.unknown') : r.sameBuild ? t('lesson.check.build.same') : t('lesson.check.build.other', { build: r.app ?? '' })));
    if (r.lateActions) notes.append(el('li', undefined, t('lesson.check.lateActions', { n: r.lateActions })));
    if (r.lockBroken.length) notes.append(el('li', undefined, t('lesson.check.lockBroken', { n: r.lockBroken.length })));
    if (r.flownTo !== null) notes.append(el('li', undefined, t('lesson.check.flownTo', { t: valueText(r.flownTo, '', 0.01), steps: r.steps.toLocaleString(getLang()) })));
    card.append(notes);
    if (r.criteria.length) card.append(this.criteriaTable(r, lesson));
    return card;
  }

  private criteriaTable(r: RecordCheck, lesson: CatalogLesson | undefined): HTMLElement {
    const table = el('table', 'recheck-criteria');
    const head = el('tr');
    for (const key of ['lesson.check.col.criterion', 'lesson.check.col.recorded', 'lesson.check.col.rechecked', 'lesson.check.col.tolerance', 'lesson.check.col.result']) head.append(el('th', undefined, t(key)));
    table.append(el('thead'), el('tbody'));
    table.tHead!.append(head);
    const criteria = lesson && !('case' in lesson) ? (lesson.criteria as Criterion[]) : [];
    for (const c of r.criteria) {
      const def = criteria.find((x) => x.id === c.id);
      const measure = c.measure ?? (def?.kind === 'measure' || def?.kind === 'answer' ? def.measure : undefined);
      const unit = measure ? MEASURES[measure].unit : c.kind === 'event' || def?.kind === 'event' ? 's' : '';
      const row = el('tr', c.status);
      const cell = (text: string, label?: string): HTMLTableCellElement => {
        const td = el('td', undefined, text);
        // a phone shows each value under its column's name (lessons.css)
        if (label) td.dataset.label = t(label);
        return td;
      };
      row.append(
        cell(criterionName(c, def)),
        cell(gradeText(c, 'recorded', unit), 'lesson.check.col.recorded'),
        cell(gradeText(c, 'rechecked', unit), 'lesson.check.col.rechecked'),
        cell(c.tol === null ? '—' : `±\u00a0${valueText(c.tol, unit, c.tol)}`, 'lesson.check.col.tolerance'),
        cell(t(STATUS_KEY[c.status]), 'lesson.check.col.result'),
      );
      table.tBodies[0].append(row);
    }
    return table;
  }
}

/** A criterion's name as the lesson strip gives it. */
function criterionName(c: CriterionCheck, def: Criterion | undefined): string {
  if (def?.label) return localText(def.label);
  if (def?.kind === 'answer') return localText(def.prompt);
  const measure = c.measure ?? (def?.kind === 'measure' ? def.measure : undefined);
  if (measure) return t(`lesson.measure.${measure}`);
  if (def?.kind === 'outcome') return t(`lesson.outcome.${def.is}`);
  return c.event ?? (def?.kind === 'event' ? def.key : undefined) ?? c.hook ?? (def?.kind === 'hook' ? def.hook : undefined) ?? c.id;
}

/** One side of a criterion: its state, and the value it was decided on (an answer: typed, and the flight's). */
function gradeText(c: CriterionCheck, side: 'recorded' | 'rechecked', unit: string): string {
  const g = c[side];
  if (!g) return '—';
  const state = g.state === 'pass' ? '✓' : g.state === 'fail' ? '✗' : '…';
  const value = c.kind === 'answer'
    ? t('lesson.check.answer', { typed: valueText(g.value, unit, c.tol), flown: valueText(g.expected, unit, c.tol) })
    : g.value === null ? '' : valueText(g.value, unit, c.tol);
  return `${state}${value ? ` ${value}` : ''}${g.revealed ? ` (${t('lesson.check.shown')})` : ''}`;
}

export function renderCheck(host: CheckHost, container: HTMLElement): { applyLanguage(): void } {
  const view = new CheckView(host, container);
  view.render();
  return view;
}
