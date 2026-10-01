/**
 * The lessons page's authoring tab (`#/lessons/author`; roadmap T01, Phase 4
 * map §4.1): the instructor turns the mission on the setup panel into a
 * scenario of their own — its texts, what the students may not change, how
 * it is graded — and saves it as a lesson file for the class, or as a link
 * (`?scenario=`) when it is short enough. The lesson is built and checked by
 * `src/lessons/authoring.ts` through the lesson-file reader itself, so every
 * problem the reader would find, and every event no flight has, is listed
 * before anything is saved. The draft is kept in this browser only (a
 * convenience; it holds no student's data).
 */
import { getLang, t } from '../../i18n';
import type { MissionState } from '../../config/mission-file';
import { missionDocument } from '../../config/mission-file';
import { missionVehicle } from '../../data/vehicles';
import { missionSatellite } from '../../data/satellites';
import { siteById } from '../../data/sites';
import { DEFAULT_LOCKS, draftLesson, emptyText, lessonIdFrom, newDraft, type DraftCriterion, type DraftText, type LessonDraft } from '../../lessons/authoring';
import { LESSON_FILE_EXTENSION, lessonFileText, type FileIssue } from '../../lessons/lesson-file';
import { SCENARIO_LINK_MAX, scenarioLink } from '../../lessons/scenario-link';
import { MEASURE_IDS, MEASURES } from '../../lessons/measures';
import { unitText } from '../../lessons/text';
import { DOMAINS, LOCK_KEYS, type Lesson, type LockKey, type MeasureId } from '../../lessons/types';
import { localized, satelliteName, siteName } from '../names';
import { downloadBlob } from '../download';

export interface AuthorHost {
  /** the mission on the setup panel, as it stands; null before the workspace has one */
  mission(): MissionState | null;
  /** the event keys a flight emits (the dictionary's `evt.*`) */
  knownEvents(): ReadonlySet<string>;
  /** put the lesson in this browser's catalogue and open it */
  tryLesson(lesson: Lesson): void;
  /** the app's own address, for the link */
  page(): string;
}

const STORE = 'orbitlab.author.draft';
const LANGS = ['en', 'ru', 'th'] as const;
type BoundMode = 'min' | 'max' | 'range' | 'target' | 'mission';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** A number as typed: a decimal comma and a typographic minus are read too; null when it is not one. */
function readNumber(raw: string): number | null {
  const s = raw.replace(',', '.').replace(/[−–]/g, '-').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
const shown = (v: number | undefined): string => (v === undefined ? '' : String(v));

function loadDraft(): LessonDraft {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? 'null') as LessonDraft | null;
    if (raw && typeof raw.id === 'string' && Array.isArray(raw.criteria)) return { ...newDraft(), ...raw };
  } catch { /* a convenience only */ }
  return newDraft(lessonIdFrom('', `lesson-${stamp()}`));
}
function saveDraft(d: LessonDraft): void {
  try { localStorage.setItem(STORE, JSON.stringify(d)); } catch { /* a convenience only */ }
}
/** Minutes since 2020, in base 36: a short, stable suffix for an id with no English words in its title. */
const stamp = (): string => Math.floor((Date.now() - Date.UTC(2020, 0, 1)) / 60000).toString(36);

function boundMode(c: Extract<DraftCriterion, { kind: 'measure' }>): BoundMode {
  if (c.target === 'mission') return 'mission';
  if (c.target !== undefined) return 'target';
  if (c.min !== undefined && c.max !== undefined) return 'range';
  return c.max !== undefined ? 'max' : 'min';
}

/** Where an issue is, in the form's own words. */
function whereText(where: string): string {
  const crit = /criteria\[(\d+)\]/.exec(where);
  if (crit) return t('lesson.author.criterionN', { n: Number(crit[1]) + 1 });
  if (where === 'id') return t('lesson.author.id');
  for (const [part, key] of [['.title', 'lesson.author.field.title'], ['title', 'lesson.author.field.title'], ['.brief', 'lesson.author.field.brief'],
    ['brief', 'lesson.author.field.brief'], ['.hints', 'lesson.author.field.hints'], ['.domains', 'lesson.author.field.areas'],
    ['.endEvent', 'lesson.author.field.endEvent'], ['.mission', 'lesson.author.mission'], ['.locked', 'lesson.author.locks']] as const) {
    if (where.endsWith(part) || where.includes(`${part}[`) || where === part) return t(key);
  }
  return t('lesson.author.field.lesson');
}
const LANG_KEY = { en: 'lesson.author.lang.en', ru: 'lesson.author.lang.ru', th: 'lesson.author.lang.th' } as const;
const KIND_KEY = { outcome: 'lesson.author.kind.outcome', measure: 'lesson.author.kind.measure', answer: 'lesson.author.kind.answer', event: 'lesson.author.kind.event' } as const;
const BOUND_KEY = { min: 'lesson.author.bound.min', max: 'lesson.author.bound.max', range: 'lesson.author.bound.range', target: 'lesson.author.bound.target', mission: 'lesson.author.bound.mission' } as const;

/** An issue the reader or the writer found, as a sentence. */
export function issueSentence(i: FileIssue): string {
  const where = whereText(i.where);
  switch (i.code) {
    case 'translation': {
      const stood = /^en=(ru|th)$/.exec(i.detail ?? '');
      if (stood) return t('lesson.author.issue.stoodIn', { where, lang: t(LANG_KEY[stood[1] as 'ru' | 'th']) });
      return t('lesson.author.issue.translation', { where, lang: i.detail === 'ru' || i.detail === 'th' || i.detail === 'en' ? t(LANG_KEY[i.detail]) : i.detail ?? '' });
    }
    case 'event': return t('lesson.author.issue.event', { where, key: i.detail ?? '' });
    case 'missing': return t('lesson.author.issue.missing', { where });
    case 'mission': return t('lesson.author.issue.mission', { where });
    case 'duplicate': return t('lesson.author.issue.duplicate', { where });
    case 'builtinId': return t('lesson.author.issue.builtinId', { where, id: i.detail ?? '' });
    case 'invalid':
      if (i.detail === 'range') return t('lesson.author.issue.range', { where });
      if (i.detail === 'negative') return t('lesson.author.issue.negative', { where });
      return t('lesson.author.issue.invalid', { where });
    default: return t('lesson.author.issue.invalid', { where });
  }
}

class AuthorView {
  private draft = loadDraft();
  private idEdited = false;
  private readonly issuesBox = el('div', 'author-issues');
  private readonly result = el('div', 'author-result');
  private readonly actions = el('div', 'author-actions');
  private lesson: Lesson | null = null;

  constructor(private readonly host: AuthorHost, private readonly container: HTMLElement) {
    // an id the page made (from the English title, or a stamp while there is none) follows the title; a typed one stays
    this.idEdited = this.draft.id !== lessonIdFrom(this.draft.title.en) && !this.draft.id.startsWith('class-lesson-');
  }

  applyLanguage(): void { this.render(); }

  render(): void {
    const body = el('div', 'lesson-catalog author');
    body.append(el('h2', undefined, t('lesson.author.title')), el('p', 'lead', t('lesson.author.lead')));
    body.append(this.missionBox(), this.textsBox(), this.locksBox(), this.criteriaBox(), this.issuesBox, this.actions, this.result);
    this.container.replaceChildren(body);
    this.update();
  }

  /** The draft changed: keep it, check it, and say what the reader finds. */
  private update(): void {
    saveDraft(this.draft);
    const mission = this.host.mission();
    const { lesson, issues } = mission ? draftLesson(this.draft, missionDocument(mission), this.host.knownEvents()) : { lesson: null, issues: [] };
    this.lesson = lesson;
    const list = el('ul');
    for (const i of issues) list.append(el('li', i.level, issueSentence(i)));
    const ok = lesson && !issues.length;
    this.issuesBox.className = `author-issues lesson-file-notice ${lesson ? (issues.length ? 'warn' : 'ok') : 'error'}`;
    this.issuesBox.setAttribute('role', 'status');
    this.issuesBox.replaceChildren(el('p', undefined, !mission ? t('lesson.author.missionNone') : ok ? t('lesson.author.ok') : lesson ? t('lesson.author.warnings') : t('lesson.author.errors')));
    if (issues.length) this.issuesBox.append(list);
    this.paintActions();
  }

  private paintActions(): void {
    const button = (label: string, fn: () => void, primary = false): HTMLButtonElement => {
      const b = el('button', primary ? 'lesson-primary' : undefined, label);
      b.type = 'button';
      b.disabled = !this.lesson;
      b.addEventListener('click', fn);
      return b;
    };
    const again = el('button', undefined, t('lesson.author.startOver'));
    again.type = 'button';
    again.addEventListener('click', () => { this.draft = newDraft(lessonIdFrom('', `lesson-${stamp()}`)); this.idEdited = false; this.result.replaceChildren(); this.render(); });
    this.actions.replaceChildren(
      button(t('lesson.author.save'), () => this.saveFile(), true),
      button(t('lesson.author.link'), () => void this.makeLink()),
      button(t('lesson.author.try'), () => { if (this.lesson) this.host.tryLesson(this.lesson); }),
      again,
    );
  }

  private saveFile(): void {
    if (!this.lesson) return;
    const name = `${this.lesson.id}${LESSON_FILE_EXTENSION}`;
    downloadBlob(new Blob([lessonFileText([this.lesson])], { type: 'application/json' }), name);
    this.result.replaceChildren(el('p', 'lesson-note ok', t('lesson.author.saved', { file: name })));
  }

  private async makeLink(): Promise<void> {
    if (!this.lesson) return;
    const link = await scenarioLink(this.host.page(), [this.lesson]);
    if (!link.fits) {
      this.result.replaceChildren(el('p', 'lesson-note fail', t('lesson.author.linkTooLong', { length: link.length, max: SCENARIO_LINK_MAX })));
      return;
    }
    const row = el('div', 'author-link');
    const input = el('input');
    input.type = 'text';
    input.readOnly = true;
    input.value = link.url;
    input.setAttribute('aria-label', t('lesson.author.link'));
    input.addEventListener('focus', () => input.select());
    const copy = el('button', undefined, t('lesson.author.copy'));
    copy.type = 'button';
    const note = el('p', 'lesson-note', t('lesson.author.linkReady', { length: link.length }));
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(link.url); note.textContent = t('lesson.author.copied'); } catch { input.select(); }
    });
    row.append(input, copy);
    this.result.replaceChildren(row, note, el('p', 'lesson-note', t('lesson.author.linkNote')));
  }

  // ─── the form ────────────────────────────────────────────────────────────

  private section(title: string, note?: string): HTMLElement {
    const box = el('section', 'author-box');
    box.append(el('h3', undefined, title));
    if (note) box.append(el('p', 'lesson-note', note));
    return box;
  }

  private missionBox(): HTMLElement {
    const box = this.section(t('lesson.author.mission'), t('lesson.author.missionNote'));
    const m = this.host.mission();
    if (!m) { box.append(el('p', 'ws-what', t('lesson.author.missionNone'))); return box; }
    let vehicle = m.vehicleId, satellite = m.satelliteId, site = m.siteId, orbit = m.orbitId;
    try { const v = missionVehicle(m); vehicle = m.vehicleSpec ? t('lesson.author.own', { name: v.name }) : v.name; } catch { /* the id, as a last resort */ }
    try { const s = missionSatellite(m); satellite = m.satelliteSpec ? t('lesson.author.own', { name: s.name }) : satelliteName(s); } catch { /* the id */ }
    try { site = siteName(siteById(m.siteId)); } catch { /* the id */ }
    orbit = localized(`orbit.${m.orbitId}.name`, m.orbitId);
    const time = m.launchTime.toISOString().slice(0, 16).replace('T', ' ');
    box.append(el('p', 'ws-what', t('lesson.author.missionLine', { vehicle, satellite, site, orbit, time, mass: Math.round(m.payloadMass).toLocaleString(getLang()) })));
    if (m.dynamics?.model === 'sixDof') box.append(el('p', 'lesson-note fail', t('lesson.author.sixDof')));
    return box;
  }

  /** Three inputs for a text, one per language. */
  private textRow(label: string, text: DraftText, multiline: boolean, onInput: () => void): HTMLElement {
    const wrap = el('fieldset', 'author-text');
    wrap.append(el('legend', undefined, label));
    for (const lang of LANGS) {
      const field = el('label', 'ws-field');
      field.append(el('span', undefined, t(LANG_KEY[lang])));
      const input = multiline ? el('textarea') : el('input');
      if (input instanceof HTMLInputElement) input.type = 'text';
      input.lang = lang;
      input.value = text[lang];
      input.addEventListener('input', () => { text[lang] = input.value; onInput(); });
      field.append(input);
      wrap.append(field);
    }
    return wrap;
  }

  private textsBox(): HTMLElement {
    const d = this.draft;
    const box = this.section(t('lesson.author.texts'), t('lesson.author.textsNote'));
    const idField = el('label', 'ws-field');
    const id = el('input');
    id.type = 'text';
    id.value = d.id;
    id.spellcheck = false;
    id.addEventListener('input', () => { d.id = id.value; this.idEdited = true; this.update(); });
    idField.append(el('span', undefined, t('lesson.author.id')), id, el('small', 'lesson-note', t('lesson.author.idNote')));
    const title = this.textRow(t('lesson.author.field.title'), d.title, false, () => {
      if (!this.idEdited) { d.id = lessonIdFrom(d.title.en, d.id.startsWith('class-lesson-') ? d.id.slice(6) : `lesson-${stamp()}`); id.value = d.id; }
      this.update();
    });
    const brief = this.textRow(t('lesson.author.field.brief'), d.brief, true, () => this.update());
    const hintsText: DraftText = { en: '', ru: '', th: '' };
    for (const lang of LANGS) hintsText[lang] = d.hints.map((h) => h[lang]).join('\n');
    const hints = this.textRow(t('lesson.author.field.hints'), hintsText, true, () => {
      const lines = LANGS.map((l) => hintsText[l].split('\n'));
      const n = Math.max(...lines.map((x) => x.length));
      d.hints = Array.from({ length: n }, (_, i) => ({ en: lines[0][i] ?? '', ru: lines[1][i] ?? '', th: lines[2][i] ?? '' }))
        .filter((h) => h.en.trim() || h.ru.trim() || h.th.trim());
      this.update();
    });
    const meta = el('div', 'ws-form');
    const modeField = el('label', 'ws-field');
    const mode = el('select');
    for (const [m, key] of [['explore', 'mode.explore'], ['engineer', 'mode.engineer']] as const) mode.append(new Option(t(key), m, false, d.mode === m));
    mode.addEventListener('change', () => { d.mode = mode.value as LessonDraft['mode']; this.update(); });
    modeField.append(el('span', undefined, t('lesson.author.mode')), mode);
    const areas = el('fieldset', 'author-areas');
    areas.append(el('legend', undefined, t('lesson.author.field.areas')));
    const areaList = el('div', 'ws-areas');
    for (const a of DOMAINS) {
      const lab = el('label');
      const box2 = el('input');
      box2.type = 'checkbox';
      box2.checked = d.domains.includes(a);
      box2.addEventListener('change', () => { d.domains = DOMAINS.filter((x) => (x === a ? box2.checked : d.domains.includes(x))); this.update(); });
      lab.append(box2, document.createTextNode(` ${t(`assess.domain.${a}`)}`));
      areaList.append(lab);
    }
    areas.append(areaList);
    meta.append(modeField, areas);
    box.append(idField, title, brief, hints, meta);
    return box;
  }

  private locksBox(): HTMLElement {
    const d = this.draft;
    const box = this.section(t('lesson.author.locks'), t('lesson.author.locksNote'));
    const list = el('div', 'ws-areas author-locks');
    for (const k of LOCK_KEYS) {
      const lab = el('label');
      const c = el('input');
      c.type = 'checkbox';
      c.checked = d.locked.includes(k);
      c.addEventListener('change', () => { d.locked = LOCK_KEYS.filter((x) => (x === k ? c.checked : d.locked.includes(x))); this.update(); });
      lab.append(c, document.createTextNode(` ${lockText(k)}`));
      list.append(lab);
    }
    const reset = el('button', undefined, t('lesson.author.locksDefault'));
    reset.type = 'button';
    reset.addEventListener('click', () => { d.locked = [...DEFAULT_LOCKS]; this.render(); });
    box.append(list, reset);
    return box;
  }

  private criteriaBox(): HTMLElement {
    const d = this.draft;
    const box = this.section(t('lesson.author.criteria'), t('lesson.author.criteriaNote'));
    const events = el('datalist');
    events.id = 'author-events';
    for (const k of [...this.host.knownEvents()].sort()) events.append(new Option(k));
    box.append(events);
    d.criteria.forEach((c, i) => box.append(this.criterionRow(c, i)));
    const add = el('button', undefined, `+ ${t('lesson.author.add')}`);
    add.type = 'button';
    add.addEventListener('click', () => { d.criteria.push({ kind: 'measure', measure: 'orbit.apogee', target: 'mission', tol: 10 }); this.render(); });
    const endField = el('label', 'ws-field author-end');
    const end = el('input');
    end.type = 'text';
    end.value = d.endEvent ?? '';
    end.setAttribute('list', 'author-events');
    end.spellcheck = false;
    end.addEventListener('input', () => { d.endEvent = end.value.trim() || undefined; this.update(); });
    endField.append(el('span', undefined, t('lesson.author.field.endEvent')), end, el('small', 'lesson-note', t('lesson.author.endEventNote')));
    box.append(add, endField);
    return box;
  }

  private numberInput(label: string, value: number | undefined, set: (v: number | undefined) => void): HTMLElement {
    const field = el('label', 'author-num');
    const input = el('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.value = shown(value);
    input.addEventListener('input', () => { set(readNumber(input.value) ?? undefined); this.update(); });
    field.append(el('span', undefined, label), input);
    return field;
  }

  private criterionRow(c: DraftCriterion, i: number): HTMLElement {
    const d = this.draft;
    const row = el('div', 'author-crit');
    row.append(el('b', 'author-crit-n', `${i + 1}`));
    const kind = el('select', 'author-kind');
    kind.setAttribute('aria-label', t('lesson.author.criterionN', { n: i + 1 }));
    for (const k of ['outcome', 'measure', 'answer', 'event'] as const) kind.append(new Option(t(KIND_KEY[k]), k, false, c.kind === k));
    kind.addEventListener('change', () => {
      const k = kind.value as DraftCriterion['kind'];
      d.criteria[i] = k === 'outcome' ? { kind: 'outcome', is: 'target' }
        : k === 'measure' ? { kind: 'measure', measure: 'orbit.apogee', target: 'mission', tol: 10 }
        : k === 'answer' ? { kind: 'answer', measure: 'orbit.period', tol: 0.5, prompt: emptyText() }
        : { kind: 'event', key: '', present: true };
      this.render();
    });
    row.append(kind);
    const fields = el('div', 'author-crit-fields');
    const measureSelect = (current: MeasureId, set: (m: MeasureId) => void): HTMLSelectElement => {
      const s = el('select');
      s.setAttribute('aria-label', t('lesson.author.measure'));
      for (const m of MEASURE_IDS) {
        const unit = MEASURES[m].unit;
        s.append(new Option(`${t(`lesson.measure.${m}`)}${unit ? `, ${unitText(unit)}` : ''}`, m, false, m === current));
      }
      s.addEventListener('change', () => { set(s.value as MeasureId); this.update(); });
      return s;
    };
    switch (c.kind) {
      case 'outcome': {
        const s = el('select');
        s.setAttribute('aria-label', t('lesson.author.kind.outcome'));
        for (const o of ['target', 'orbit', 'survived'] as const) s.append(new Option(t(`lesson.outcome.${o}`), o, false, c.is === o));
        s.addEventListener('change', () => { c.is = s.value as typeof c.is; this.update(); });
        fields.append(s);
        break;
      }
      case 'measure': {
        const unit = unitText(MEASURES[c.measure].unit);
        const mode = el('select');
        mode.setAttribute('aria-label', t('lesson.author.bound'));
        for (const b of ['min', 'max', 'range', 'target', 'mission'] as const) mode.append(new Option(t(BOUND_KEY[b]), b, false, boundMode(c) === b));
        mode.addEventListener('change', () => {
          const b = mode.value as BoundMode;
          delete c.min; delete c.max; delete c.target; delete c.tol;
          if (b === 'min') c.min = 0;
          else if (b === 'max') c.max = 0;
          else if (b === 'range') { c.min = 0; c.max = 0; } else if (b === 'target') { c.target = 0; c.tol = 1; } else { c.target = 'mission'; c.tol = 10; }
          this.render();
        });
        fields.append(measureSelect(c.measure, (m) => { c.measure = m; this.render(); }), mode);
        const b = boundMode(c);
        if (b === 'min' || b === 'range') fields.append(this.numberInput(t('lesson.author.min', { unit }), c.min, (v) => { c.min = v; }));
        if (b === 'max' || b === 'range') fields.append(this.numberInput(t('lesson.author.max', { unit }), c.max, (v) => { c.max = v; }));
        if (b === 'target') fields.append(this.numberInput(t('lesson.author.target', { unit }), typeof c.target === 'number' ? c.target : undefined, (v) => { c.target = v; }));
        if (b === 'target' || b === 'mission') fields.append(this.numberInput(t('lesson.author.tol', { unit }), c.tol, (v) => { c.tol = v; }));
        break;
      }
      case 'answer': {
        const unit = unitText(MEASURES[c.measure].unit);
        const pct = c.tolPct !== undefined;
        const how = el('select');
        how.setAttribute('aria-label', t('lesson.author.tolKind'));
        how.append(new Option(t('lesson.author.tolAbs', { unit }), 'abs', false, !pct), new Option(t('lesson.author.tolPct'), 'pct', false, pct));
        how.addEventListener('change', () => {
          if (how.value === 'pct') { c.tolPct = c.tolPct ?? 5; delete c.tol; } else { c.tol = c.tol ?? 1; delete c.tolPct; }
          this.render();
        });
        fields.append(measureSelect(c.measure, (m) => { c.measure = m; this.render(); }), how,
          this.numberInput(pct ? t('lesson.author.tolPct') : t('lesson.author.tol', { unit }), pct ? c.tolPct : c.tol, (v) => { if (pct) c.tolPct = v; else c.tol = v; }));
        fields.append(this.textRow(t('lesson.author.prompt'), c.prompt, false, () => this.update()));
        break;
      }
      case 'event': {
        const key = el('input');
        key.type = 'text';
        key.value = c.key;
        key.spellcheck = false;
        key.placeholder = 'evt.seco';
        key.setAttribute('list', 'author-events');
        key.setAttribute('aria-label', t('lesson.author.eventKey'));
        key.addEventListener('input', () => { c.key = key.value; this.update(); });
        const present = el('select');
        present.setAttribute('aria-label', t('lesson.author.kind.event'));
        present.append(new Option(t('lesson.author.event.present'), 'yes', false, c.present), new Option(t('lesson.author.event.absent'), 'no', false, !c.present));
        present.addEventListener('change', () => { c.present = present.value === 'yes'; this.update(); });
        fields.append(key, present);
        break;
      }
    }
    const remove = el('button', 'author-remove', '✕');
    remove.type = 'button';
    remove.title = t('lesson.author.remove');
    remove.setAttribute('aria-label', `${t('lesson.author.remove')}: ${t('lesson.author.criterionN', { n: i + 1 })}`);
    remove.addEventListener('click', () => { d.criteria.splice(i, 1); this.render(); });
    row.append(fields, remove);
    return row;
  }
}

/**
 * A lockable setting in the setup panel's own words (as the lesson strip names
 * them) — but the orbit's lock by the orbit alone: the strip's name for it,
 * the setup step's "Target orbit & launch time", stood here beside the launch
 * time's own box, and the orbit's lock does not hold the launch time.
 */
function lockText(key: LockKey): string {
  if (key === 'setup.orbit') return t('lesson.author.lock.orbit');
  if (key === 'setup.faults') return t('setup.faults.title');
  return t(key);
}

export function renderAuthor(host: AuthorHost, container: HTMLElement): { applyLanguage(): void } {
  const view = new AuthorView(host, container);
  view.render();
  return view;
}
