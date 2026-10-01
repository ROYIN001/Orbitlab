/**
 * Lessons in the workspace (roadmap E03): the gold "Lessons" button in the top
 * bar and its card on the landing page, the catalogue, and — while a lesson is
 * open — the task strip over the workspace, with each criterion graded live
 * against the flight and the answers the student works out from it.
 *
 * The grading is `src/lessons/grader.ts`, read against the flight at its
 * recording's head: scrubbing back through a replay never changes a grade.
 * The lesson owns nothing of the app: it loads its mission through the setup
 * panel, sends the app to its mode, and greys out what it locks.
 *
 * A case lesson (track 6, P2.5's cases from the record) flies nothing: it
 * opens the Orbit section's Real satellites at the case's tool, freezes the
 * data the case is worked from (THEOS-2's element set, the Sun's activity),
 * builds the case sheet from them and grades the typed answers by that
 * sheet's own key (`src/lessons/case-grader.ts`).
 *
 * The catalogue and the placement test are a page of their own over the whole
 * window below the top bar (`#/lessons`, `#/lessons/test`), like a mode: the
 * browser's Back leaves it, and opening a lesson goes to the workspace.
 */
import { t, getLang } from '../../i18n';
import { en } from '../../i18n/en';
import type { AppMode } from '../app-mode';
import type { Simulation } from '../../physics/simulation';
import type { MissionState } from '../../config/mission-file';
import { allLessons, BUILTIN_CASE_LESSONS, BUILTIN_LESSONS, lessonNumber, TRACKS } from '../../lessons/catalog';
import { missionStateOf } from '../../lessons/config';
import { awaitingAnswers, flightEnded, flightStarted, gradeShown, regradeAnswers, type RevealedAnswers } from '../../lessons/grader';
import { caseAnswersOpen, caseWorkingShown, gradeCaseLesson } from '../../lessons/case-grader';
import { FlightLessons } from '../../lessons/flight-lessons';
import { draftValue, submittedAnswers, type AnswerDrafts } from '../../lessons/answer-drafts';
import { formatMeasure, MEASURES } from '../../lessons/measures';
import { localText, unitText } from '../../lessons/text';
import { LESSON_FILE_EXTENSION, parseLessonFile, type FileIssue, type ParsedLessonFile } from '../../lessons/lesson-file';
import { SCENARIO_LINK_MAX, SCENARIO_PARAM, readScenarioParam, scenarioLink } from '../../lessons/scenario-link';
import {
  RESULTS_FILE_EXTENSION, clearRevealed, flightRecord, frozenCaseData, loadProgress, lessonProgress, recordGrade, recordRevealed, resultsFile, saveProgress, type ProgressData,
} from '../../lessons/progress';
import { appBuildId } from '../../build-info';
import { isCaseLesson, type CaseKey, type CaseLesson, type CatalogLesson, type Criterion, type CriterionGrade, type Lesson, type LessonGrade } from '../../lessons/types';
import { caseKey, caseWorksheet, type CaseSource } from '../../worksheets/cases';
import { letterOf } from '../../worksheets/bank-items';
import type { CaseId, CaseLessonState } from '../../worksheets/case-ids';
import type { Worksheet } from '../../worksheets/types';
import type { LessonToolsHost } from '../../lessons/mcp-tools';
import type { AssessmentResult } from '../../lessons/assessment/score';
import { downloadBlob } from '../download';
import { PanelLocks } from './locks';
import './lessons.css';

export interface LessonHost {
  /** go to a workspace mode (of the launch section, S01) */
  go(mode: AppMode): void;
  /** S01: back to the section and level the page was opened over; without it, `go` to the level */
  back?(): void;
  /** replace the setup panel's mission and preview it */
  loadMission(state: MissionState): void;
  /** the mission's simulation (a main-thread mirror in worker mode) */
  sim(): Simulation | null;
  /**
   * The live instant on screen, s of mission time (`RecordingSource.clock`). A point-mass flight
   * is flown up to one step ahead of it (T02, src/replay/recorder.ts), so a grade waits for it.
   */
  clock(): number;
  /** the setup panel's element */
  panelRoot: HTMLElement;
  /** re-render the setup panel (to lift the locks) */
  renderPanel(): void;
  /** a case lesson: the Orbit section's Real satellites, at a level, opened at the case's tool */
  openCase?(id: CaseId, level: 'explore' | 'engineer'): void;
  /** the data a case sheet is worked from, as the Orbit section has them once its catalogue is in */
  caseInput?(): Promise<CaseSource>;
  /** the case lesson open now, or none: the Orbit section keeps that case's answers out of sight until it is answered */
  lessonCase?(state: CaseLessonState | null): void;
  /** T01: the mission on the setup panel, as it stands — what the authoring tab turns into a scenario */
  mission?(): MissionState;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

const STUDENT_KEY = 'orbitlab.student';
/** The lessons page's addresses: not modes, so the app's own router leaves them alone. */
export const LESSONS_HASH = '#/lessons';
export const TEST_HASH = '#/lessons/test';
export const WORKSHEETS_HASH = '#/lessons/worksheets';
/** T01/T02, instructor mode (owner decision 2026-09-29: on the lessons page): writing a scenario, and checking a class's results. */
export const AUTHOR_HASH = '#/lessons/author';
export const CHECK_HASH = '#/lessons/check';
type PageView = 'catalog' | 'test' | 'worksheets' | 'author' | 'check';
const PAGE_HASHES: ReadonlyArray<readonly [PageView, string]> = [
  ['catalog', LESSONS_HASH], ['test', TEST_HASH], ['worksheets', WORKSHEETS_HASH], ['author', AUTHOR_HASH], ['check', CHECK_HASH],
];
const pageViewOf = (hash: string): PageView | null => PAGE_HASHES.find(([, h]) => h === hash)?.[0] ?? null;
/** The event keys a flight emits: the dictionary's `evt.*` (tests/i18n.test.ts's family), for a lesson file's warnings (T01). */
const KNOWN_EVENTS: ReadonlySet<string> = new Set(Object.keys(en).filter((k) => /^evt\.[a-zA-Z]+$/.test(k)));
const BUILTIN_IDS: ReadonlySet<string> = new Set([...BUILTIN_LESSONS, ...BUILTIN_CASE_LESSONS].map((l) => l.id));

/** A case lesson's own state: its data, frozen when it opened, and the sheet and key built from them. */
interface CaseState {
  source: CaseSource | null;
  /** why the data could not be had, if they could not */
  failed: string | null;
  /** the sheet in the language on screen */
  sheet: Worksheet | null;
  /** the sheet's key, taken from the first sheet built: a change of language never changes a grade */
  key: CaseKey | null;
  openedAt: Date;
  /** "The data" is open (it is, until the student closes it) */
  dataOpen: boolean;
}

/** The open lesson's state. */
interface Active {
  lesson: CatalogLesson;
  answers: Record<string, number>;
  drafts: AnswerDrafts;
  /** the simulation the grade was last read from: a new one is a new flight */
  sim: Simulation | null;
  /** this flight left the pad (counted as an attempt) */
  counted: boolean;
  /** this flight's grade has been kept in the progress */
  recorded: boolean;
  grade: LessonGrade | null;
  /** the grade taken when the flight ended: kept, with only the answers checked again */
  frozen: LessonGrade | null;
  /**
   * T02: when `frozen` was taken, the instant on screen and how many commands
   * the flight's journal held — what the record keeps for the re-check.
   */
  frozenAt?: { clock: number; actions: number };
  /** a case lesson's (no flight: `sim` and `frozen` stay empty) */
  case?: CaseState;
  /** answers shown, then cleared during this attempt: they still count as shown in it, so only a later one passes unaided */
  seen?: RevealedAnswers;
}

export class LessonMode implements LessonToolsHost {
  private progressData: ProgressData = loadProgress();
  private active: Active | null = null;
  private readonly locks: PanelLocks;
  private readonly button = el('button', 'quiet-btn lesson-btn');
  private readonly strip = el('section', 'lesson-strip');
  private readonly page = el('section', 'lessons-page');
  private readonly pageBar = el('header', 'lessons-page-bar');
  private readonly content = el('div', 'dialog-body lessons-page-body');
  private pageView: PageView | null = null;
  private assessmentView: { applyLanguage(): void } | null = null;
  private assessmentModule: Promise<typeof import('./assessment-view')> | null = null;
  private notice: { level: 'ok' | 'warn' | 'error'; text: string; details: string[] } | null = null;
  /** whether the last save reached the browser's storage; null before the first (audit 2026-09-27 A19) */
  private saved: boolean | null = null;
  private lastStripKey = '';
  /** what the Orbit section was last told of the case lesson open */
  private orbitKey = 'null';
  /** E05: the lesson each flight was flown in, for its worksheet's title */
  private readonly flights = new FlightLessons<Simulation, Lesson>();

  constructor(private readonly host: LessonHost) {
    this.locks = new PanelLocks(host.panelRoot);
    this.button.type = 'button';
    this.button.id = 'btn-lessons';
    this.button.addEventListener('click', () => this.openCatalog());
    document.querySelector('.topbar-right')?.prepend(this.button);
    this.strip.hidden = true;
    this.strip.setAttribute('role', 'region');
    document.querySelector('main.workspace')?.before(this.strip);
    this.page.id = 'lessons-page';
    this.page.hidden = true;
    this.page.append(this.pageBar, this.content);
    (document.getElementById('app') ?? document.body).append(this.page);
    window.addEventListener('hashchange', () => this.route());
    window.addEventListener('resize', () => this.placePage());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.pageView && !e.defaultPrevented) { e.preventDefault(); this.closePage(); }
    });
    this.applyLanguage();
  }

  // ─── the catalogue and progress ──────────────────────────────────────────

  catalogue(): CatalogLesson[] {
    return allLessons(this.progressData.customLessons);
  }

  progress(): ProgressData {
    return this.progressData;
  }

  private save(): void {
    const saved = saveProgress(this.progressData);
    const changed = saved !== this.saved;
    this.saved = saved;
    this.paintButton();
    if (changed && this.pageView === 'catalog') this.renderCatalog();
    if (changed && this.pageView) this.paintPageBar();
  }

  /** Whether the progress is being kept, in a line the strip and the catalogue show (audit 2026-09-27 A19). */
  private saveNote(tag: 'p' | 'span'): HTMLElement | null {
    if (this.saved === null) return null;
    const note = el(tag, this.saved ? 'lesson-note lesson-save' : 'lesson-note fail lesson-save', t(this.saved ? 'lesson.save.saved' : 'lesson.save.failed'));
    note.dataset.saved = String(this.saved);
    return note;
  }

  private written(): CatalogLesson[] {
    return this.catalogue().filter((l) => !l.comingSoon);
  }

  private paintButton(): void {
    const written = this.written();
    const passed = written.filter((l) => this.progressData.lessons[l.id]?.passed).length;
    const fresh = !Object.keys(this.progressData.lessons).length && !this.progressData.assessments.length;
    this.button.classList.toggle('fresh', fresh);
    this.button.replaceChildren(el('span', 'lesson-glyph', '✎'), el('span', 'lesson-btn-label', t('lesson.button')),
      el('span', 'lesson-badge', `${passed}/${written.length}`));
    this.button.title = t('lesson.buttonTitle');
    this.button.setAttribute('aria-label', `${t('lesson.button')} — ${t('lesson.catalog.progress', { passed, total: written.length })}`);
  }

  applyLanguage(): void {
    this.paintButton();
    this.lastStripKey = '';
    if (this.active) { this.locks.apply(); this.paintStrip(); }
    if (this.pageView) this.paintPageBar();
    if (this.pageView === 'catalog') this.renderCatalog();
    this.assessmentView?.applyLanguage();
  }

  // ─── opening and leaving a lesson ────────────────────────────────────────

  startLesson(id: string): { ok: true } | { ok: false; reason: string } {
    const lesson = this.catalogue().find((l) => l.id === id);
    if (!lesson) return { ok: false, reason: t('lesson.notFound', { id }) };
    if (lesson.comingSoon) return { ok: false, reason: t('lesson.comingSoon') };
    if (isCaseLesson(lesson)) return this.startCase(lesson);
    this.active = { lesson, answers: {}, drafts: {}, sim: null, counted: false, recorded: false, grade: null, frozen: null };
    this.tellOrbit();
    lessonProgress(this.progressData, id);
    this.save();
    this.host.go(lesson.mode);
    this.host.loadMission(missionStateOf(lesson.mission));
    this.locks.set(lesson.locked);
    this.strip.hidden = false;
    document.body.dataset.lesson = lesson.id;
    // what Explore keeps computed and this lesson asks the student to change (style.css)
    if (lesson.reveal?.length) document.body.dataset.lessonReveal = lesson.reveal.join(' ');
    else delete document.body.dataset.lessonReveal;
    this.lastStripKey = '';
    this.update();
    return { ok: true };
  }

  /**
   * A case lesson: Real satellites at the case's tool, and the case's data
   * fixed now, once — the sheet shown, the sheet printed, its key and every
   * grade are worked from them, however the catalogue on screen or the Sun's
   * forecast changes while the lesson is open.
   */
  private startCase(lesson: CaseLesson): { ok: true } {
    const state: CaseState = { source: null, failed: null, sheet: null, key: null, openedAt: new Date(), dataOpen: true };
    const a: Active = { lesson, answers: {}, drafts: {}, sim: null, counted: false, recorded: false, grade: null, frozen: null, case: state };
    this.active = a;
    lessonProgress(this.progressData, lesson.id);
    this.save();
    // nothing is flown: a flight lesson's locks are lifted
    this.locks.set([]);
    this.host.renderPanel();
    delete document.body.dataset.lessonReveal;
    document.body.dataset.lesson = lesson.id;
    this.strip.hidden = false;
    this.host.openCase?.(lesson.case, lesson.mode);
    this.tellOrbit();
    this.lastStripKey = '';
    this.paintStrip();
    this.readCase(a);
    return { ok: true };
  }

  /** Take the case's data from the Orbit section, once (again only when they could not be had). */
  private readCase(a: Active): void {
    const state = a.case;
    if (!state) return;
    state.failed = null;
    const source = this.host.caseInput ? this.host.caseInput() : Promise.reject(new Error('Orbit section'));
    source.then((s) => {
      if (this.active !== a) return;
      state.source = structuredClone(s);
      this.buildCase(a);
      this.lastStripKey = '';
      this.gradeCase(false);
      // the Worksheets tab, if it is open, offers the case's sheet now that it can be made
      if (this.pageView === 'worksheets') this.assessmentView?.applyLanguage();
    }, (err: unknown) => {
      if (this.active !== a) return;
      state.failed = `${t('lesson.strip.caseFailed', { reason: err instanceof Error ? err.message : String(err) })} ${t('lesson.strip.caseRetry')}`;
      this.lastStripKey = '';
      this.paintStrip();
    });
  }

  /** The case's sheet in the language on screen, from the frozen data; the key is the first sheet's. */
  private buildCase(a: Active): void {
    const c = a.case;
    if (!c?.source || !isCaseLesson(a.lesson)) return;
    const sheet = caseWorksheet(a.lesson.case, { ...c.source, lang: getLang(), generatedAt: c.openedAt });
    // THEOS-2's set is not in the catalogue (it could not be loaded, or a file of one's own is on screen)
    if (!sheet) { c.source = null; c.failed = `${t('cases.noData')} ${t('lesson.strip.caseRetry')}`; return; }
    c.sheet = sheet;
    c.key ??= caseKey(sheet);
  }

  /** Grade a case lesson's answers; `record` after the student acted (a check, the answers shown), not merely on opening. */
  private gradeCase(record: boolean): void {
    const a = this.active;
    if (!a?.case || !isCaseLesson(a.lesson)) return;
    a.grade = a.case.key ? gradeCaseLesson(a.lesson, a.case.key, a.answers, this.revealedOf(a.lesson.id)) : null;
    if (record && a.grade && !a.recorded && awaitingAnswers(a.lesson, a.grade).length === 0) this.recordCase(a);
    this.tellOrbit();
    this.paintStrip();
  }

  /** Whether the open case lesson has nothing left to give away: passed (now or before), or its answers shown. */
  private caseAnswersOpen(a: Active | null): boolean {
    return !!a && caseAnswersOpen(a.grade, !!this.progressData.lessons[a.lesson.id]?.passed);
  }

  /** Tell the Orbit section which case lesson is open, if any, and whether its answers may be shown there yet. */
  private tellOrbit(): void {
    const a = this.active;
    const state: CaseLessonState | null = a && isCaseLesson(a.lesson) ? { case: a.lesson.case, answersOpen: this.caseAnswersOpen(a) } : null;
    const key = JSON.stringify(state);
    if (key === this.orbitKey) return;
    this.orbitKey = key;
    this.host.lessonCase?.(state);
  }

  /** Put the lesson's mission back as it started (a new flight, same lesson); a case lesson's answers are cleared. */
  private restart(): void {
    if (!this.active) return;
    const lesson = this.active.lesson;
    if (isCaseLesson(lesson)) {
      const a = this.active;
      a.answers = {};
      a.drafts = {};
      a.recorded = false;
      delete a.seen;
      this.lastStripKey = '';
      // data that could not be had are asked for again; data had are kept, frozen
      if (a.case && !a.case.source) { this.host.openCase?.(lesson.case, lesson.mode); this.readCase(a); }
      this.gradeCase(false);
      return;
    }
    this.active = { lesson, answers: {}, drafts: {}, sim: null, counted: false, recorded: false, grade: null, frozen: null };
    this.host.loadMission(missionStateOf(lesson.mission));
    this.locks.set(lesson.locked);
    this.lastStripKey = '';
    this.update();
  }

  exit(): void {
    this.active = null;
    this.locks.set([]);
    this.host.renderPanel();
    this.strip.hidden = true;
    this.strip.replaceChildren();
    delete document.body.dataset.lesson;
    delete document.body.dataset.lessonReveal;
    this.tellOrbit();
  }

  activeLesson() {
    // read the flight now, not at the frame loop's last tick: a launch a moment ago is a new flight
    this.update();
    const a = this.active;
    if (!a) return null;
    return { lesson: a.lesson, grade: a.grade, hintsShown: lessonProgress(this.progressData, a.lesson.id).hintsShown, awaiting: a.grade ? awaitingAnswers(a.lesson, a.grade) : [] };
  }

  /**
   * `?lesson=<id>` opens a lesson (a link from a teacher, or the strip's own
   * link); `?scenario=z…` (T01) brings a teacher's whole lesson file and opens
   * its lesson.
   */
  openFromLink(): void {
    const url = new URL(location.href);
    const scenario = url.searchParams.get(SCENARIO_PARAM);
    if (scenario !== null) {
      url.searchParams.delete(SCENARIO_PARAM);
      history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      void this.openScenario(scenario);
      return;
    }
    const id = url.searchParams.get('lesson');
    if (id === null) return;
    url.searchParams.delete('lesson');
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    const started = this.startLesson(id);
    if (!started.ok) { this.notice = { level: 'error', text: started.reason, details: [] }; this.openCatalog(); }
  }

  // ─── grading the flight ──────────────────────────────────────────────────

  /** Called by the app's frame loop, a few times a second. */
  update(): void {
    const a = this.active;
    if (!a) return;
    // a case lesson has no flight: one flying on in the Launch section is not its business (nor are its answers cleared by it)
    if (isCaseLesson(a.lesson)) return;
    const lesson = a.lesson;
    const sim = this.host.sim();
    if (sim !== a.sim) {
      // a new flight: a preview after an edit, or a launch
      a.sim = sim;
      a.counted = false;
      a.recorded = false;
      a.answers = {};
      a.drafts = {};
      a.frozen = null;
      delete a.seen;
      a.frozenAt = undefined;
    }
    if (!sim) { a.grade = null; this.paintStrip(); return; }
    const started = flightStarted(sim);
    if (started && !a.counted) {
      a.counted = true;
      this.flights.claim(sim, lesson);
      lessonProgress(this.progressData, a.lesson.id).attempts++;
      this.save();
    }
    const revealed = this.revealedOf(lesson.id);
    if (a.frozen) a.grade = regradeAnswers(lesson, a.frozen, a.answers, revealed);
    else {
      // T02: final only once the picture has reached the end — the simulation can be a step past it
      const clock = this.host.clock();
      a.grade = gradeShown(lesson, sim, clock, a.answers);
      if (started && a.grade.final) {
        a.frozen = a.grade;
        a.frozenAt = { clock, actions: sim.actions.length };
        a.grade = regradeAnswers(lesson, a.frozen, a.answers, revealed);
      }
    }
    if (started && a.grade.final && !a.recorded && awaitingAnswers(lesson, a.grade).length === 0) this.record(a);
    this.paintStrip();
  }

  /** The expected values this lesson has shown the student, over all their attempts (and in this one, if cleared since). */
  private revealedOf(id: string): RevealedAnswers {
    const kept = this.progressData.lessons[id]?.revealed ?? {};
    const seen = this.active?.lesson.id === id ? this.active.seen : undefined;
    if (!seen) return kept;
    const all: Record<string, number[]> = {};
    for (const [k, v] of [...Object.entries(seen), ...Object.entries(kept)]) (all[k] ??= []).push(...v);
    return all;
  }

  /** Whether the lesson keeps answers it has shown (the strip then offers to clear them). */
  private hasRevealed(id: string): boolean {
    return Object.keys(this.progressData.lessons[id]?.revealed ?? {}).length > 0;
  }

  private record(a: Active): void {
    if (!a.grade || !a.sim) return;
    a.recorded = true;
    const p = lessonProgress(this.progressData, a.lesson.id);
    // T02: the grading time, the instant on screen and the commands up to the grade, for the instructor's re-check
    const at = a.frozenAt ?? { clock: this.host.clock(), actions: a.sim.actions.length };
    recordGrade(this.progressData, {
      lessonId: a.lesson.id,
      ...flightRecord({ at: new Date(), grade: a.grade, answers: a.answers, hintsShown: p.hintsShown, cfg: a.sim.cfg,
        clock: at.clock, actions: a.sim.actions.slice(0, at.actions), app: appBuildId() }),
    });
    this.save();
  }

  /** A case lesson's check, kept: its answers, the data they were worked from, and what was shown. */
  private recordCase(a: Active): void {
    if (!a.grade || !a.case || !isCaseLesson(a.lesson)) return;
    a.recorded = true;
    const p = lessonProgress(this.progressData, a.lesson.id);
    const revealed = a.grade.criteria.filter((c) => c.revealed).map((c) => c.id);
    const s = a.case.source;
    recordGrade(this.progressData, {
      lessonId: a.lesson.id, at: new Date().toISOString(), verdict: a.grade.verdict, criteria: a.grade.criteria,
      answers: { ...a.answers }, hintsShown: p.hintsShown,
      caseData: s && a.case.sheet ? frozenCaseData(a.lesson.case, s, a.case.sheet, a.case.openedAt) : { case: a.lesson.case },
      ...(revealed.length ? { revealed } : {}),
    });
    this.save();
  }

  /** The answers typed (by criterion id, each read as its input has it: a number, or a choice's index). */
  private submitAnswers(inputs: Map<string, () => string>): void {
    const a = this.active;
    if (!a) return;
    for (const [id, read] of inputs) a.drafts[id] = read();
    a.answers = submittedAnswers(a.drafts);
    const typed = Object.keys(a.answers).length > 0;
    a.recorded = false;
    this.lastStripKey = '';
    // Enter in an answer submits: the strip is drawn again with the marks, not held for the typing
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && this.strip.contains(focused)) focused.blur();
    if (isCaseLesson(a.lesson)) {
      // a case lesson's attempts are its checks
      if (typed) { lessonProgress(this.progressData, a.lesson.id).attempts++; this.save(); }
      this.gradeCase(true);
      return;
    }
    this.update();
  }

  /**
   * "Show the answers": the expected values of the answers not yet right are
   * shown, and kept, so this attempt passes on them only with help, and so
   * does a later one (a lesson flies the same flight again) until they are cleared.
   */
  private revealAnswers(): void {
    const a = this.active;
    if (!a?.grade?.final) return;
    const shown: Record<string, number> = {};
    const criteria: ReadonlyArray<{ id: string; kind: string }> = a.lesson.criteria;
    for (const g of a.grade.criteria) {
      const kind = criteria.find((x) => x.id === g.id)?.kind;
      if ((kind === 'answer' || kind === 'case') && g.state !== 'pass' && !g.revealed && typeof g.expected === 'number' && Number.isFinite(g.expected)) shown[g.id] = g.expected;
    }
    if (!Object.keys(shown).length) return;
    recordRevealed(this.progressData, a.lesson.id, shown);
    a.recorded = false;
    this.save();
    this.lastStripKey = '';
    if (isCaseLesson(a.lesson)) this.gradeCase(true);
    else this.update();
  }

  /**
   * "Clear the answers I have seen" (owner decision D-6): the lesson forgets
   * the values it showed, so a later attempt can pass unaided. This one still
   * counts them as shown (`Active.seen`).
   */
  private forgetRevealed(): void {
    const a = this.active;
    if (!a || !this.hasRevealed(a.lesson.id)) return;
    a.seen = this.revealedOf(a.lesson.id);
    clearRevealed(this.progressData, a.lesson.id);
    this.save();
    this.lastStripKey = '';
    if (isCaseLesson(a.lesson)) this.gradeCase(false);
    else this.update();
    this.flash(t('lesson.strip.revealedCleared'));
  }

  private showHint(): void {
    const a = this.active;
    if (!a) return;
    const p = lessonProgress(this.progressData, a.lesson.id);
    if (p.hintsShown < a.lesson.hints.length) p.hintsShown++;
    this.save();
    this.lastStripKey = '';
    this.paintStrip();
  }

  // ─── the strip ───────────────────────────────────────────────────────────

  private criterionLabel(c: Criterion): string {
    if (c.label) return localText(c.label);
    switch (c.kind) {
      case 'measure': return t(`lesson.measure.${c.measure}`);
      case 'outcome': return t(`lesson.outcome.${c.is}`);
      case 'event': return t(c.present ? 'lesson.event.present' : 'lesson.event.absent', { event: c.key });
      case 'answer': return localText(c.prompt);
      case 'hook': return t('lesson.hook', { hook: c.hook });
    }
  }

  private criterionBound(c: Criterion): string {
    if (c.kind !== 'measure') return '';
    const unit = MEASURES[c.measure].unit;
    const u = unit ? ` ${unitText(unit)}` : '';
    if (c.target === 'mission') {
      const target = this.missionValue(c);
      return `${target === null ? t('lesson.bound.mission') : target.toFixed(MEASURES[c.measure].digits)} ± ${c.tol ?? 0}${u}`;
    }
    if (c.target !== undefined) return `${c.target} ± ${c.tol ?? 0}${u}`;
    if (c.min !== undefined && c.max !== undefined) return `${c.min} … ${c.max}${u}`;
    if (c.max !== undefined) return `≤ ${c.max}${u}`;
    return `≥ ${c.min}${u}`;
  }

  private missionValue(c: Criterion): number | null {
    const sim = this.active?.sim;
    if (!sim || c.kind !== 'measure') return null;
    const target = sim.plan.target;
    if (c.measure === 'orbit.inclination') return target.inclination * 180 / Math.PI;
    if (c.measure === 'orbit.perigee') return target.perigee / 1000;
    if (c.measure === 'orbit.apogee') return target.apogee / 1000;
    return null;
  }

  private chip(c: Criterion, g: CriterionGrade | undefined, flown: boolean): HTMLElement {
    const state = flown ? g?.state ?? 'pending' : 'pending';
    const chip = el('div', `lesson-crit ${state}`);
    chip.dataset.criterion = c.id;
    chip.append(el('span', 'lesson-crit-name', this.criterionLabel(c)));
    const bound = this.criterionBound(c);
    const value = c.kind === 'measure' && flown && g?.value !== null && g?.value !== undefined ? formatMeasure(c.measure, g.value) : '';
    const mark = { pending: t('lesson.crit.pending'), passing: t('lesson.crit.passing'), pass: '✓', fail: '✗' }[state];
    const line = el('span', 'lesson-crit-value');
    line.textContent = [bound, value, mark].filter(Boolean).join(' · ');
    chip.append(line);
    return chip;
  }

  /** The strip's head: the lesson's number and track, its title and task, and the hints shown. */
  private stripHead(lesson: CatalogLesson, hints: number): HTMLElement {
    const track = TRACKS.find((x) => x.id === lesson.track);
    this.strip.setAttribute('aria-label', `${t('lesson.button')} ${lessonNumber(lesson)}`);
    const head = el('div', 'lesson-strip-head');
    head.append(el('span', 'lesson-eyebrow', t('lesson.strip.eyebrow', { n: lessonNumber(lesson), track: track ? localText(track.title) : t('lesson.catalog.custom') })),
      el('h2', undefined, localText(lesson.title)), el('p', 'lesson-brief', localText(lesson.brief)));
    for (let i = 0; i < hints; i++) head.append(el('p', 'lesson-hint', `💡 ${localText(lesson.hints[i])}`));
    return head;
  }

  /** The strip's buttons, and a way to add one. */
  private actionBar(): { actions: HTMLElement; button: (label: string, fn: () => void, cls?: string) => HTMLButtonElement } {
    const actions = el('div', 'lesson-actions');
    const button = (label: string, fn: () => void, cls = ''): HTMLButtonElement => {
      const b = el('button', cls, label);
      b.type = 'button';
      b.addEventListener('click', fn);
      actions.append(b);
      return b;
    };
    return { actions, button };
  }

  private paintStrip(): void {
    const a = this.active;
    if (!a) return;
    this.strip.classList.toggle('case', isCaseLesson(a.lesson));
    if (isCaseLesson(a.lesson)) { this.paintCase(a, a.lesson); return; }
    const lang = getLang();
    const g = a.grade;
    const flown = !!a.sim && flightStarted(a.sim);
    const hints = lessonProgress(this.progressData, a.lesson.id).hintsShown;
    const key = JSON.stringify([lang, a.lesson.id, flown, g?.verdict, g?.final, g?.lockBroken, g?.criteria.map((c) => [c.state, c.value === null ? null : Number(c.value?.toPrecision(3)), !!c.revealed]), hints, a.answers, a.recorded, this.saved, this.hasRevealed(a.lesson.id)]);
    if (key === this.lastStripKey) return;
    // keep what the student is typing
    const typing = this.strip.contains(document.activeElement) && document.activeElement instanceof HTMLInputElement;
    if (typing && g?.final) return;
    this.lastStripKey = key;
    const lesson = a.lesson;
    const s = this.strip;
    const head = this.stripHead(lesson, hints);

    const crits = el('div', 'lesson-crits');
    for (const c of lesson.criteria) if (c.kind !== 'answer') crits.append(this.chip(c, g?.criteria.find((x) => x.id === c.id), flown));

    const status = el('div', 'lesson-status');
    if (g?.lockBroken.length) {
      status.append(el('p', 'lesson-note fail', t('lesson.strip.lockBroken', { fields: g.lockBroken.map(lockLabel).join(', ') })));
    }
    if (!flown) status.append(el('p', 'lesson-note', t('lesson.strip.notFlown')));
    else if (g && !g.final) status.append(el('p', 'lesson-note', t(g.verdict === 'fail' ? 'lesson.strip.failedInFlight' : 'lesson.strip.flying')));
    const answerCrits = lesson.criteria.filter((c): c is Extract<Criterion, { kind: 'answer' }> => c.kind === 'answer');
    if (flown && g?.final && answerCrits.length) {
      const form = el('form', 'lesson-answers');
      form.append(el('p', 'lesson-note', t('lesson.strip.answers')));
      const inputs = new Map<string, () => string>();
      for (const c of answerCrits) {
        const cg = g.criteria.find((x) => x.id === c.id);
        const row = el('label', `lesson-answer ${cg?.state ?? 'pending'}`);
        const input = el('input');
        input.type = 'text';
        input.inputMode = 'decimal';
        input.value = draftValue(a.drafts, a.answers, c.id);
        input.addEventListener('input', () => { a.drafts[c.id] = input.value; });
        input.setAttribute('aria-label', localText(c.prompt));
        inputs.set(c.id, () => input.value);
        // a wrong answer is only marked: the value is shown only when asked for, and then passes only with help
        const mark = cg?.state === 'pass' ? '✓' : cg?.state === 'fail' ? '✗' : '';
        const verdict = cg?.revealed ? `${mark} ${t('lesson.strip.expected', { value: formatMeasure(c.measure, cg.expected ?? null) })}`.trim() : mark;
        row.append(el('span', undefined, localText(c.prompt)), input, el('span', 'lesson-answer-mark', verdict));
        form.append(row);
      }
      const check = el('button', 'lesson-primary', t('lesson.strip.check'));
      check.type = 'submit';
      form.append(check);
      const hidden = answerCrits.filter((c) => {
        const cg = g.criteria.find((x) => x.id === c.id);
        return cg && cg.state !== 'pass' && !cg.revealed && typeof cg.expected === 'number' && Number.isFinite(cg.expected);
      });
      if (hidden.length) {
        const reveal = el('button', undefined, t('lesson.strip.reveal'));
        reveal.type = 'button';
        // what showing costs, before it is paid
        reveal.title = t('lesson.strip.revealTitle');
        reveal.addEventListener('click', () => this.revealAnswers());
        form.append(reveal);
      }
      form.addEventListener('submit', (e) => { e.preventDefault(); this.submitAnswers(inputs); });
      status.append(form);
    }
    if (flown && g?.final && (g.verdict === 'pass' || g.verdict === 'passedWithHelp')) {
      status.append(el('p', `lesson-note ${g.verdict === 'pass' ? 'pass' : 'helped'}`, t(g.verdict === 'pass' ? 'lesson.strip.pass' : 'lesson.strip.passedWithHelp')));
      if (lesson.debrief) status.append(el('p', 'lesson-debrief', localText(lesson.debrief)));
    } else if (flown && g?.final && g.verdict === 'fail') {
      const onlyAnswers = !g.lockBroken.length && g.criteria.every((cg) => cg.state !== 'fail' || lesson.criteria.find((c) => c.id === cg.id)?.kind === 'answer');
      const key = g.criteria.some((cg) => cg.revealed) ? 'lesson.strip.revealed' : onlyAnswers ? 'lesson.strip.answersWrong' : 'lesson.strip.fail';
      status.append(el('p', 'lesson-note fail', t(key)));
    }
    // once this flight's grade is kept, or whenever nothing can be
    const saveNote = a.recorded || this.saved === false ? this.saveNote('p') : null;
    if (saveNote) status.append(saveNote);

    const { actions, button } = this.actionBar();
    const hintBtn = button(hints < lesson.hints.length ? t('lesson.strip.hint', { n: hints + 1, total: lesson.hints.length }) : t('lesson.strip.noHints'), () => this.showHint());
    hintBtn.disabled = hints >= lesson.hints.length;
    button(t('lesson.strip.restart'), () => this.restart());
    if (this.hasRevealed(lesson.id)) button(t('lesson.strip.clearRevealed'), () => this.forgetRevealed());
    if (flown && g?.final && (g.verdict === 'pass' || g.verdict === 'passedWithHelp')) {
      const next = this.nextLesson(lesson);
      if (next) button(t('lesson.strip.next', { n: lessonNumber(next) }), () => this.startLesson(next.id), 'lesson-primary');
    }
    button(t('lesson.strip.catalog'), () => this.openCatalog());
    if (flown && g?.final) button(t('ws.stripButton'), () => this.navigate(WORKSHEETS_HASH));
    button(t('lesson.strip.link'), () => void this.copyLink(lesson));
    button(t('lesson.strip.exit'), () => this.exit());
    s.replaceChildren(head, crits, status, actions);
  }

  /**
   * A case lesson's strip: the case's data as its sheet gives them, its
   * questions to answer (numbers typed, a choice picked), a ✗ on a wrong
   * answer and no more, and after a pass — or once the answers are shown —
   * each answer with its working.
   */
  private paintCase(a: Active, lesson: CaseLesson): void {
    const c = a.case!;
    // another language: the sheet's words again, from the same frozen data (the key stays the first one's)
    if (c.sheet && c.sheet.lang !== getLang()) this.buildCase(a);
    const g = a.grade;
    const hints = lessonProgress(this.progressData, lesson.id).hintsShown;
    const key = JSON.stringify([getLang(), lesson.id, !!c.sheet, c.failed, g?.verdict, g?.criteria.map((x) => [x.state, x.value, !!x.revealed]), hints, a.answers, a.recorded, this.saved, this.hasRevealed(lesson.id)]);
    if (key === this.lastStripKey) return;
    const typing = this.strip.contains(document.activeElement) && document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'text';
    if (typing && this.lastStripKey) return;
    this.lastStripKey = key;
    const head = this.stripHead(lesson, hints);
    const status = el('div', 'lesson-status');
    if (c.failed) status.append(el('p', 'lesson-note fail', c.failed));
    else if (!c.sheet) status.append(el('p', 'lesson-note', t('lesson.strip.caseLoading')));
    if (c.sheet && g) {
      status.append(this.caseData(c, c.sheet), this.caseForm(a, lesson, c.sheet, g));
      if (g.verdict === 'pass' || g.verdict === 'passedWithHelp') {
        status.append(el('p', `lesson-note ${g.verdict === 'pass' ? 'pass' : 'helped'}`, t(g.verdict === 'pass' ? 'lesson.strip.pass' : 'lesson.strip.passedWithHelp')));
        if (lesson.debrief) status.append(el('p', 'lesson-debrief', localText(lesson.debrief)));
      } else if (g.verdict === 'fail') {
        status.append(el('p', 'lesson-note fail', t(g.criteria.some((x) => x.revealed) ? 'lesson.strip.revealed' : 'lesson.strip.answersWrong')));
      }
    }
    const saveNote = a.recorded || this.saved === false ? this.saveNote('p') : null;
    if (saveNote) status.append(saveNote);
    const { actions, button } = this.actionBar();
    const hintBtn = button(hints < lesson.hints.length ? t('lesson.strip.hint', { n: hints + 1, total: lesson.hints.length }) : t('lesson.strip.noHints'), () => this.showHint());
    hintBtn.disabled = hints >= lesson.hints.length;
    button(t('lesson.strip.restart'), () => this.restart());
    if (this.hasRevealed(lesson.id)) button(t('lesson.strip.clearRevealed'), () => this.forgetRevealed());
    if (g?.verdict === 'pass' || g?.verdict === 'passedWithHelp') {
      const next = this.nextLesson(lesson);
      if (next) button(t('lesson.strip.next', { n: lessonNumber(next) }), () => this.startLesson(next.id), 'lesson-primary');
    }
    button(t('lesson.strip.catalog'), () => this.openCatalog());
    button(t('lesson.strip.caseTool'), () => this.host.openCase?.(lesson.case, lesson.mode));
    button(t('ws.stripButton'), () => this.navigate(WORKSHEETS_HASH));
    button(t('lesson.strip.link'), () => void this.copyLink(lesson));
    button(t('lesson.strip.exit'), () => this.exit());
    this.strip.replaceChildren(head, status, actions);
  }

  /** "The data": the case sheet's table and figure, as the student works from them. */
  private caseData(c: CaseState, sheet: Worksheet): HTMLElement {
    const box = el('details', 'lesson-case-data');
    box.open = c.dataOpen;
    box.addEventListener('toggle', () => { c.dataOpen = box.open; });
    const data = sheet.sections[0];
    box.append(el('summary', undefined, data.title));
    if (data.intro) box.append(el('p', 'lesson-note', data.intro));
    const table = el('table', 'lesson-case-table');
    const body = el('tbody');
    for (const [k, v] of data.table ?? []) {
      const tr = el('tr');
      tr.append(el('th', undefined, k), el('td', undefined, v));
      body.append(tr);
    }
    table.append(body);
    box.append(table);
    for (const f of data.figures ?? []) {
      if (!f.svg) continue;
      const fig = el('figure', 'lesson-case-figure');
      const holder = el('div');
      // the sheet's own drawing (src/orbit/encounter-plane.ts), its labels escaped there
      holder.innerHTML = f.svg;
      fig.append(holder);
      if (f.caption) fig.append(el('figcaption', 'lesson-note', f.caption));
      box.append(fig);
    }
    return box;
  }

  /** The case's questions: a number typed with its unit, a choice picked from the sheet's lettered options. */
  private caseForm(a: Active, lesson: CaseLesson, sheet: Worksheet, g: LessonGrade): HTMLElement {
    const form = el('form', 'lesson-answers lesson-case-answers');
    form.append(el('p', 'lesson-note', t('lesson.strip.caseAnswers')));
    const questions = sheet.sections[1];
    if (questions?.intro) form.append(el('p', 'lesson-note', questions.intro));
    const items = sheet.sections.flatMap((s) => s.items);
    const inputs = new Map<string, () => string>();
    let hidden = 0;
    for (const crit of lesson.criteria) {
      const item = items.find((i) => i.id === crit.item);
      if (!item) continue;
      const cg = g.criteria.find((x) => x.id === crit.id);
      const prompt = crit.label ? localText(crit.label) : item.prompt;
      const row = el('div', `lesson-answer lesson-case-item ${cg?.state ?? 'pending'}`);
      row.append(el('span', 'lesson-case-prompt', prompt));
      if (item.kind === 'choice') {
        const group = el('div', 'lesson-case-options');
        group.setAttribute('role', 'radiogroup');
        group.setAttribute('aria-label', prompt);
        (item.options ?? []).forEach((text, k) => {
          const label = el('label', 'lesson-case-option');
          const radio = el('input');
          radio.type = 'radio';
          radio.name = `case-${crit.id}`;
          radio.value = String(k);
          radio.checked = draftValue(a.drafts, a.answers, crit.id) === String(k);
          radio.addEventListener('change', () => { if (radio.checked) a.drafts[crit.id] = radio.value; });
          label.append(radio, document.createTextNode(` ${letterOf(sheet.lang, k)}) ${text}`));
          group.append(label);
        });
        inputs.set(crit.id, () => group.querySelector<HTMLInputElement>('input:checked')?.value ?? '');
        row.append(group);
      } else {
        const field = el('span', 'lesson-case-field');
        const input = el('input');
        input.type = 'text';
        input.inputMode = 'decimal';
        input.value = draftValue(a.drafts, a.answers, crit.id);
        input.addEventListener('input', () => { a.drafts[crit.id] = input.value; });
        input.setAttribute('aria-label', prompt);
        inputs.set(crit.id, () => input.value);
        field.append(input);
        if (item.unit) field.append(el('span', 'lesson-case-unit', item.unit));
        row.append(field);
      }
      // wrong is only marked; the answer and its working come with the lesson passed, or when asked for (and then pass only with help)
      row.append(el('span', 'lesson-answer-mark', cg?.state === 'pass' ? '✓' : cg?.state === 'fail' ? '✗' : ''));
      if (caseWorkingShown(g, crit.id)) {
        const tol = item.answer.tolerance ? ` (${item.answer.tolerance})` : '';
        row.append(el('p', 'lesson-case-working', `${item.answer.text}${tol}${item.answer.working ? ` — ${item.answer.working}` : ''}`));
      }
      if (cg && cg.state !== 'pass' && !cg.revealed) hidden++;
      form.append(row);
    }
    const check = el('button', 'lesson-primary', t('lesson.strip.check'));
    check.type = 'submit';
    form.append(check);
    if (hidden) {
      const reveal = el('button', undefined, t('lesson.strip.reveal'));
      reveal.type = 'button';
      reveal.title = t('lesson.strip.revealTitle');
      reveal.addEventListener('click', () => this.revealAnswers());
      form.append(reveal);
    }
    form.addEventListener('submit', (e) => { e.preventDefault(); this.submitAnswers(inputs); });
    return form;
  }

  private nextLesson(lesson: CatalogLesson): CatalogLesson | null {
    const written = this.written();
    const i = written.findIndex((l) => l.id === lesson.id);
    return i >= 0 && i + 1 < written.length ? written[i + 1] : null;
  }

  private async copyLink(lesson: CatalogLesson): Promise<void> {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('lesson', lesson.id);
    let text = url.toString();
    // T01: a teacher's own lesson is not in another browser's catalogue: its link carries the lesson itself
    if (!BUILTIN_IDS.has(lesson.id)) {
      const link = await scenarioLink(location.href, [lesson]);
      if (!link.fits) { this.flash(t('lesson.author.linkTooLong', { length: link.length, max: SCENARIO_LINK_MAX })); return; }
      text = link.url;
    }
    try { await navigator.clipboard.writeText(text); this.flash(t('lesson.strip.linkCopied')); } catch { this.flash(text); }
  }

  private flash(text: string): void {
    const note = el('p', 'lesson-note ok', text);
    this.strip.querySelector('.lesson-status')?.append(note);
    setTimeout(() => note.remove(), 4000);
  }

  // ─── the lessons page ────────────────────────────────────────────────────

  openCatalog(): void {
    this.navigate(LESSONS_HASH);
  }

  /** The address the app opened at: the lessons page is kept, not turned into a mode. */
  openFromHash(hash: string): void {
    if (!pageViewOf(hash)) return;
    history.replaceState(null, '', hash);
    this.route();
  }

  private navigate(hash: string): void {
    if (location.hash === hash) this.route();
    else location.hash = hash;
  }

  /** Back to the mode the page was opened over. */
  private closePage(): void {
    if (this.host.back) { this.host.back(); return; }
    this.host.go((document.body.dataset.mode as AppMode | undefined) ?? 'explore');
  }

  /** Show the page the address names, or leave it. */
  private route(): void {
    const view = pageViewOf(location.hash);
    if (view === this.pageView) {
      if (view === 'catalog') this.renderCatalog();
      return;
    }
    this.pageView = view;
    this.assessmentView = null;
    const nav = document.querySelectorAll<HTMLAnchorElement>('#mode-nav a');
    if (!view) {
      this.page.hidden = true;
      this.content.replaceChildren();
      delete document.body.dataset.lessonsPage;
      this.button.removeAttribute('aria-current');
      // the mode under the page is the current one again
      nav.forEach((a) => { if (a.dataset.mode === document.body.dataset.mode) a.setAttribute('aria-current', 'page'); });
      return;
    }
    document.body.dataset.lessonsPage = view;
    this.button.setAttribute('aria-current', 'page');
    nav.forEach((a) => a.removeAttribute('aria-current'));
    this.page.hidden = false;
    this.placePage();
    this.paintPageBar();
    if (view === 'catalog') this.renderCatalog();
    else if (view === 'test') void this.showAssessment();
    else if (view === 'author') void this.showAuthor();
    else if (view === 'check') void this.showCheck();
    else void this.showWorksheets();
    this.page.scrollTo(0, 0);
  }

  /** Under the top bar, whatever its height in this layout. */
  private placePage(): void {
    if (this.page.hidden) return;
    const bar = document.getElementById('topbar');
    this.page.style.top = `${Math.max(0, Math.round(bar?.getBoundingClientRect().bottom ?? 0))}px`;
  }

  private paintPageBar(): void {
    const back = el('button', 'lessons-page-back', `← ${t('lesson.page.back')}`);
    back.type = 'button';
    back.addEventListener('click', () => this.closePage());
    const tabs = el('nav', 'lessons-page-tabs');
    tabs.setAttribute('aria-label', t('lesson.button'));
    for (const [view, key, hash] of [['catalog', 'lesson.page.lessons', LESSONS_HASH], ['test', 'lesson.page.test', TEST_HASH], ['worksheets', 'ws.tab', WORKSHEETS_HASH],
      ['author', 'lesson.author.tab', AUTHOR_HASH], ['check', 'lesson.check.tab', CHECK_HASH]] as const) {
      const a = el('a', undefined, t(key));
      a.href = hash;
      if (this.pageView === view) a.setAttribute('aria-current', 'page');
      tabs.append(a);
    }
    const title = el('span', 'lessons-page-title');
    title.append(el('span', 'lesson-glyph', '✎'), document.createTextNode(` ${t('lesson.page.title')}`));
    this.page.setAttribute('aria-label', t('lesson.page.title'));
    this.pageBar.replaceChildren(title, tabs, back);
    const saveNote = this.pageView === 'test' ? this.saveNote('span') : null;
    if (saveNote) { saveNote.setAttribute('role', 'status'); this.pageBar.append(saveNote); }
  }

  /** The latest finished test, scored against today's bank and lessons. */
  assessmentResult(): { kind: string; finishedAt?: string; result: AssessmentResult } | null {
    return this.assessmentSummary?.() ?? null;
  }

  /** Set once the assessment module has loaded (it holds the bank). */
  private assessmentSummary: (() => { kind: string; finishedAt?: string; result: AssessmentResult } | null) | null = null;

  private loadAssessment(): Promise<typeof import('./assessment-view')> {
    this.assessmentModule ??= import('./assessment-view').then((m) => {
      this.assessmentSummary = () => m.latestResult(this.progressData, this.catalogue());
      return m;
    });
    return this.assessmentModule;
  }

  private renderCatalog(): void {
    const body = el('div', 'lesson-catalog');
    body.append(el('h2', undefined, t('lesson.catalog.title')), el('p', 'lead', t('lesson.catalog.lead')));

    const written = this.written();
    const passed = written.filter((l) => this.progressData.lessons[l.id]?.passed).length;
    const bar = el('div', 'lesson-bar');
    const meter = el('div', 'lesson-meter');
    const fill = el('i');
    fill.style.width = `${written.length ? (100 * passed) / written.length : 0}%`;
    meter.append(fill);
    bar.append(el('span', undefined, t('lesson.catalog.progress', { passed, total: written.length })), meter);
    const fileInput = el('input');
    fileInput.type = 'file';
    fileInput.accept = `${LESSON_FILE_EXTENSION},.json,application/json`;
    fileInput.hidden = true;
    fileInput.addEventListener('change', () => { const f = fileInput.files?.[0]; if (f) void this.openFile(f); fileInput.value = ''; });
    const open = el('button', undefined, t('lesson.catalog.openFile'));
    open.type = 'button';
    open.addEventListener('click', () => fileInput.click());
    const exp = el('button', undefined, t('lesson.catalog.export'));
    exp.type = 'button';
    exp.addEventListener('click', () => void this.exportResults());
    bar.append(open, exp, fileInput);
    const saveNote = this.saveNote('span');
    if (saveNote) bar.append(saveNote);
    body.append(bar);

    const nameRow = el('label', 'lesson-student');
    const name = el('input');
    name.type = 'text';
    name.autocomplete = 'name';
    try { name.value = localStorage.getItem(STUDENT_KEY) ?? ''; } catch { /* optional */ }
    name.addEventListener('change', () => { try { localStorage.setItem(STUDENT_KEY, name.value.trim()); } catch { /* optional */ } });
    nameRow.append(el('span', undefined, t('lesson.catalog.student')), name);
    body.append(nameRow);

    if (this.notice) {
      const n = el('div', `lesson-file-notice ${this.notice.level}`);
      n.append(el('p', undefined, this.notice.text));
      if (this.notice.details.length) {
        const ul = el('ul');
        for (const line of this.notice.details) ul.append(el('li', undefined, line));
        n.append(ul);
      }
      body.append(n);
    }

    // the placement test
    const assess = el('div', 'lesson-assess');
    const summary = this.assessmentResult();
    const startBtn = el('button', 'lesson-primary', t(summary ? 'lesson.catalog.assessResult' : 'lesson.catalog.assess'));
    startBtn.type = 'button';
    startBtn.addEventListener('click', () => this.openAssessment());
    if (summary) {
      const start = summary.result.start ? this.catalogue().find((l) => l.id === summary.result.start) : null;
      assess.append(el('p', undefined, t('lesson.catalog.assessDone', { percent: summary.result.percent, start: start ? `${lessonNumber(start)} ${localText(start.title)}` : '—' })));
    } else assess.append(el('p', undefined, t('lesson.catalog.assessLead')));
    assess.append(startBtn);
    body.append(assess);
    if (!summary && !this.assessmentSummary) void this.loadAssessment().then(() => { if (this.pageView === 'catalog' && this.assessmentResult()) this.renderCatalog(); });

    // the tracks
    const grid = el('div', 'lesson-tracks');
    const lessons = this.catalogue();
    const advice = summary?.result.advice ?? {};
    const tracks = [...TRACKS, ...[...new Set(lessons.map((l) => l.track))].filter((id) => !TRACKS.some((x) => x.id === id))
      .map((id) => ({ id, title: { en: t('lesson.catalog.custom') }, note: { en: '' } }))];
    for (const track of tracks) {
      const own = lessons.filter((l) => l.track === track.id);
      if (!own.length) continue;
      const col = el('section', 'lesson-track');
      col.append(el('h3', undefined, `${track.id} · ${localText(track.title)}`), el('p', 'lesson-track-note', localText(track.note)));
      for (const l of own) {
        const p = this.progressData.lessons[l.id];
        const card = el('button', 'lesson-card-item');
        card.type = 'button';
        card.disabled = !!l.comingSoon;
        const helped = !p?.passed && !!p?.passedWithHelp;
        const status = l.comingSoon ? '○' : p?.passed ? '✓' : helped ? '◐' : p?.attempts ? '●' : '○';
        card.classList.toggle('passed', !!p?.passed);
        card.classList.toggle('helped', helped);
        card.classList.toggle('active', this.active?.lesson.id === l.id);
        card.append(el('span', 'lesson-card-status', status));
        const text = el('span', 'lesson-card-text');
        text.append(el('b', undefined, `${lessonNumber(l)} ${localText(l.title)}`), el('small', undefined, localText(l.brief)));
        const tags = el('span', 'lesson-card-tags');
        for (const tag of l.tags ?? []) tags.append(el('span', 'lesson-tag', tag));
        if (l.comingSoon) tags.append(el('span', 'lesson-tag soon', t('lesson.comingSoon')));
        if (helped) tags.append(el('span', 'lesson-tag helped', t('lesson.catalog.passedWithHelp')));
        const a = advice[l.id];
        if (summary?.result.start === l.id) tags.append(el('span', 'lesson-tag start', t('lesson.advice.start')));
        else if (a) tags.append(el('span', `lesson-tag ${a}`, t(`lesson.advice.${a}`)));
        text.append(tags);
        card.append(text);
        card.addEventListener('click', () => this.startLesson(l.id));
        col.append(card);
      }
      grid.append(col);
    }
    body.append(grid);
    this.content.replaceChildren(body);
  }

  private openAssessment(): void {
    this.navigate(TEST_HASH);
  }

  /** E05: the worksheets of the flight on screen (the open lesson's, or any mission's). */
  private async showWorksheets(): Promise<void> {
    const m = await import('./worksheet-view');
    if (this.pageView !== 'worksheets') return;
    this.assessmentView = m.renderWorksheets({
      flight: () => {
        const sim = this.host.sim();
        if (!sim || !flightStarted(sim)) return null;
        return { flight: sim, ended: flightEnded(this.flights.lessonOf(sim) ?? {}, sim) };
      },
      // the lesson the flight on screen was flown in, not the one open now (a case lesson, another flight's)
      lesson: () => this.flights.lessonOf(this.host.sim()),
      caseLesson: () => this.caseSheet(),
      progress: () => this.progressData,
    }, this.content);
  }

  /** T01: the authoring tab, on the setup panel's mission as it stands. */
  private async showAuthor(): Promise<void> {
    const m = await import('./author-view');
    if (this.pageView !== 'author') return;
    this.assessmentView = m.renderAuthor({
      mission: () => this.host.mission?.() ?? null,
      knownEvents: () => KNOWN_EVENTS,
      tryLesson: (lesson) => this.tryLesson(lesson),
      page: () => location.href,
    }, this.content);
  }

  /** T02: the checking tab, with the teacher's lessons this browser's catalogue already has. */
  private async showCheck(): Promise<void> {
    const m = await import('./check-view');
    if (this.pageView !== 'check') return;
    this.assessmentView = m.renderCheck({ customLessons: () => this.progressData.customLessons }, this.content);
  }

  /** The open case lesson's sheet, from its frozen data, in the language on screen; the key only once it gives nothing away. */
  private caseSheet(): { lesson: CaseLesson; sheet: Worksheet | null; keyOpen: boolean } | null {
    const a = this.active;
    if (!a?.case || !isCaseLesson(a.lesson)) return null;
    if (a.case.sheet && a.case.sheet.lang !== getLang()) this.buildCase(a);
    return { lesson: a.lesson, sheet: a.case.sheet, keyOpen: this.caseAnswersOpen(a) };
  }

  private async showAssessment(): Promise<void> {
    const m = await this.loadAssessment();
    if (this.pageView !== 'test') return;
    this.assessmentView = m.renderAssessment({
      progress: () => this.progressData,
      save: () => this.save(),
      lessons: () => this.catalogue(),
      goToLesson: (id) => { this.startLesson(id); },
      exportResults: () => void this.exportResults(),
      back: () => this.openCatalog(),
    }, this.content);
  }

  private async openFile(file: File): Promise<void> {
    let raw: unknown = null;
    try { raw = JSON.parse(await file.text()); } catch { /* reported below */ }
    const m = await this.loadAssessment();
    this.addFromFile(parseLessonFile(raw, m.datasetIds(), KNOWN_EVENTS), 'lesson.file.unusable');
    this.renderCatalog();
  }

  /** A lesson file's lessons and questions into this browser's catalogue, and what was found in it said. */
  private addFromFile(parsed: ParsedLessonFile, unusable: string): boolean {
    if (!parsed.usable) {
      this.notice = { level: 'error', text: t(unusable), details: [] };
      return false;
    }
    const keep = <T extends { id: string }>(old: T[], added: T[]): T[] => [...old.filter((x) => !added.some((y) => y.id === x.id)), ...added];
    this.progressData.customLessons = keep(this.progressData.customLessons, parsed.lessons);
    this.progressData.customQuestions = keep(this.progressData.customQuestions, parsed.questions);
    this.save();
    const errors = parsed.issues.filter((i) => i.level === 'error');
    // T01: an event no flight emits reads, and then never happens: said, though the lesson is kept
    const events = parsed.issues.filter((i) => i.code === 'event');
    this.notice = {
      level: errors.length || events.length ? 'warn' : 'ok',
      text: t('lesson.file.loaded', { lessons: parsed.lessons.length, questions: parsed.questions.length }),
      details: [...(errors.length ? [t('lesson.file.issues'), ...errors.map(issueText)] : []),
        ...events.map((i) => t('lesson.author.issue.event', { where: i.where, key: i.detail ?? '' }))],
    };
    return true;
  }

  /** T01: a scenario link's lesson file, added like a file, and its lesson opened (the catalogue, when it holds several or needs a word). */
  private async openScenario(param: string): Promise<void> {
    let raw: unknown = null;
    try { raw = await readScenarioParam(param); } catch { /* reported as unusable */ }
    const m = await this.loadAssessment();
    const parsed = parseLessonFile(raw, m.datasetIds(), KNOWN_EVENTS);
    if (!this.addFromFile(parsed, 'lesson.author.linkUnusable')) { this.openCatalog(); return; }
    const written = parsed.lessons.filter((l) => !l.comingSoon);
    if (written.length === 1 && this.notice?.level === 'ok') {
      this.notice = null;
      const started = this.startLesson(written[0].id);
      if (started.ok) return;
      this.notice = { level: 'error', text: started.reason, details: [] };
    }
    this.openCatalog();
  }

  /** T01: a lesson written on the authoring tab, into the catalogue and opened, as its students will have it. */
  private tryLesson(lesson: Lesson): void {
    this.addFromFile({ lessons: [lesson], questions: [], issues: [], usable: true }, 'lesson.file.unusable');
    this.notice = null;
    const started = this.startLesson(lesson.id);
    if (!started.ok) { this.notice = { level: 'error', text: started.reason, details: [] }; this.openCatalog(); }
  }

  private async exportResults(): Promise<void> {
    let student = '';
    try { student = localStorage.getItem(STUDENT_KEY) ?? ''; } catch { /* optional */ }
    await this.loadAssessment();
    const summary = this.assessmentResult();
    const file = await resultsFile(this.progressData, new Date(), student || undefined,
      summary ? { kind: summary.kind, percent: summary.result.percent, areas: summary.result.domains, start: summary.result.start } : undefined);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const who = student.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
    downloadBlob(new Blob([`${JSON.stringify(file, null, 2)}\n`], { type: 'application/json' }), `orbitlab${who ? `-${who}` : ''}-${stamp}${RESULTS_FILE_EXTENSION}`);
  }
}

/** A locked setting in the setup panel's own words. */
function lockLabel(key: string): string {
  if (key === 'setup.orbit') return t('setup.step.orbit');
  if (key === 'setup.faults') return t('setup.faults.title');
  return t(key);
}

function issueText(i: FileIssue): string {
  return `${i.where}: ${i.code}${i.detail ? ` (${i.detail})` : ''}`;
}
