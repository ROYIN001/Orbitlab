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
 * The catalogue and the placement test are a page of their own over the whole
 * window below the top bar (`#/lessons`, `#/lessons/test`), like a mode: the
 * browser's Back leaves it, and opening a lesson goes to the workspace.
 */
import { t, getLang } from '../../i18n';
import type { AppMode } from '../app-mode';
import type { Simulation } from '../../physics/simulation';
import { missionDocument, type MissionState } from '../../config/mission-file';
import { allLessons, lessonNumber, TRACKS } from '../../lessons/catalog';
import { missionStateOf } from '../../lessons/config';
import { awaitingAnswers, flightEnded, flightStarted, gradeLesson, regradeAnswers } from '../../lessons/grader';
import { formatMeasure, MEASURES } from '../../lessons/measures';
import { localText, unitText } from '../../lessons/text';
import { LESSON_FILE_EXTENSION, parseLessonFile, type FileIssue } from '../../lessons/lesson-file';
import {
  RESULTS_FILE_EXTENSION, loadProgress, lessonProgress, recordGrade, resultsFile, saveProgress, type ProgressData,
} from '../../lessons/progress';
import type { Criterion, CriterionGrade, Lesson, LessonGrade } from '../../lessons/types';
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
  /** the setup panel's element */
  panelRoot: HTMLElement;
  /** re-render the setup panel (to lift the locks) */
  renderPanel(): void;
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
type PageView = 'catalog' | 'test' | 'worksheets';
const pageViewOf = (hash: string): PageView | null =>
  hash === LESSONS_HASH ? 'catalog' : hash === TEST_HASH ? 'test' : hash === WORKSHEETS_HASH ? 'worksheets' : null;

/** The open lesson's state. */
interface Active {
  lesson: Lesson;
  answers: Record<string, number>;
  /** the simulation the grade was last read from: a new one is a new flight */
  sim: Simulation | null;
  /** this flight left the pad (counted as an attempt) */
  counted: boolean;
  /** this flight's grade has been kept in the progress */
  recorded: boolean;
  grade: LessonGrade | null;
  /** the grade taken when the flight ended: kept, with only the answers checked again */
  frozen: LessonGrade | null;
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
  private lastStripKey = '';

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
    // The landing page's fourth card: the home screen rebuilds its cards, so it is put back whenever they are.
    const home = document.getElementById('home-screen');
    if (home) {
      new MutationObserver(() => this.homeCard(home)).observe(home, { childList: true });
      this.homeCard(home);
    }
    this.applyLanguage();
  }

  // ─── the catalogue and progress ──────────────────────────────────────────

  catalogue(): Lesson[] {
    return allLessons(this.progressData.customLessons);
  }

  progress(): ProgressData {
    return this.progressData;
  }

  private save(): void {
    saveProgress(this.progressData);
    this.paintButton();
  }

  private written(): Lesson[] {
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

  private homeCard(home: HTMLElement): void {
    const list = home.querySelector('.home-modes');
    if (!list || list.querySelector('.lesson-card')) return;
    const card = el('button', 'mode-card lesson-card');
    card.type = 'button';
    card.setAttribute('role', 'listitem');
    const icon = el('span', 'mode-card-icon', '✎');
    icon.setAttribute('aria-hidden', 'true');
    card.append(icon, el('strong', undefined, t('lesson.home.title')), el('span', 'mode-card-text', t('lesson.home.text')));
    card.addEventListener('click', () => this.openCatalog());
    list.append(card);
  }

  applyLanguage(): void {
    this.paintButton();
    const home = document.getElementById('home-screen');
    if (home) this.homeCard(home);
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
    this.active = { lesson, answers: {}, sim: null, counted: false, recorded: false, grade: null, frozen: null };
    lessonProgress(this.progressData, id);
    this.save();
    this.host.go(lesson.mode);
    this.host.loadMission(missionStateOf(lesson.mission));
    this.locks.set(lesson.locked);
    this.strip.hidden = false;
    document.body.dataset.lesson = lesson.id;
    this.lastStripKey = '';
    this.update();
    return { ok: true };
  }

  /** Put the lesson's mission back as it started (a new flight, same lesson). */
  private restart(): void {
    if (!this.active) return;
    const lesson = this.active.lesson;
    this.active = { lesson, answers: {}, sim: null, counted: false, recorded: false, grade: null, frozen: null };
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
  }

  activeLesson() {
    // read the flight now, not at the frame loop's last tick: a launch a moment ago is a new flight
    this.update();
    const a = this.active;
    if (!a) return null;
    return { lesson: a.lesson, grade: a.grade, hintsShown: lessonProgress(this.progressData, a.lesson.id).hintsShown, awaiting: a.grade ? awaitingAnswers(a.lesson, a.grade) : [] };
  }

  /** `?lesson=<id>` opens a lesson (a link from a teacher, or the strip's own link). */
  openFromLink(): void {
    const url = new URL(location.href);
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
    const sim = this.host.sim();
    if (sim !== a.sim) {
      // a new flight: a preview after an edit, or a launch
      a.sim = sim;
      a.counted = false;
      a.recorded = false;
      a.answers = {};
      a.frozen = null;
    }
    if (!sim) { a.grade = null; this.paintStrip(); return; }
    const started = flightStarted(sim);
    if (started && !a.counted) {
      a.counted = true;
      lessonProgress(this.progressData, a.lesson.id).attempts++;
      this.save();
    }
    if (a.frozen) a.grade = regradeAnswers(a.lesson, a.frozen, a.answers);
    else {
      a.grade = gradeLesson(a.lesson, sim, a.answers);
      if (started && a.grade.final) a.frozen = a.grade;
    }
    if (started && a.grade.final && !a.recorded && awaitingAnswers(a.lesson, a.grade).length === 0) this.record(a);
    this.paintStrip();
  }

  private record(a: Active): void {
    if (!a.grade || !a.sim) return;
    a.recorded = true;
    const p = lessonProgress(this.progressData, a.lesson.id);
    const cfg = a.sim.cfg;
    const state: MissionState = {
      vehicleId: cfg.vehicleId, satelliteId: cfg.satelliteId, siteId: cfg.siteId, orbitId: 'custom', orbit: { ...cfg.orbit },
      launchTime: new Date(cfg.launchTime.getTime()), guidanceOverrides: {}, failure: { ...cfg.failure }, boosterRecovery: cfg.boosterRecovery,
      payloadMass: cfg.payloadMassOverride ?? a.lesson.mission.mission.payloadMass,
      ...(cfg.recoveryPlan ? { recoveryPlan: structuredClone(cfg.recoveryPlan) } : {}),
      ...(cfg.dynamics ? { dynamics: structuredClone(cfg.dynamics) } : {}),
    };
    recordGrade(this.progressData, {
      lessonId: a.lesson.id, at: new Date().toISOString(), verdict: a.grade.verdict, criteria: a.grade.criteria,
      answers: { ...a.answers }, hintsShown: p.hintsShown, mission: missionDocument(state),
    });
    this.save();
  }

  private submitAnswers(inputs: Map<string, HTMLInputElement>): void {
    const a = this.active;
    if (!a) return;
    for (const [id, input] of inputs) {
      const v = Number(input.value.replace(',', '.'));
      if (input.value.trim() !== '' && Number.isFinite(v)) a.answers[id] = v;
    }
    a.recorded = false;
    this.lastStripKey = '';
    this.update();
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

  private paintStrip(): void {
    const a = this.active;
    if (!a) return;
    const lang = getLang();
    const g = a.grade;
    const flown = !!a.sim && flightStarted(a.sim);
    const hints = lessonProgress(this.progressData, a.lesson.id).hintsShown;
    const key = JSON.stringify([lang, a.lesson.id, flown, g?.verdict, g?.final, g?.lockBroken, g?.criteria.map((c) => [c.state, c.value === null ? null : Number(c.value?.toPrecision(3))]), hints, a.answers]);
    if (key === this.lastStripKey) return;
    // keep what the student is typing
    const typing = this.strip.contains(document.activeElement) && document.activeElement instanceof HTMLInputElement;
    if (typing && g?.final) return;
    this.lastStripKey = key;
    const lesson = a.lesson;
    const track = TRACKS.find((x) => x.id === lesson.track);
    const s = this.strip;
    s.setAttribute('aria-label', `${t('lesson.button')} ${lessonNumber(lesson)}`);
    const head = el('div', 'lesson-strip-head');
    head.append(el('span', 'lesson-eyebrow', t('lesson.strip.eyebrow', { n: lessonNumber(lesson), track: track ? localText(track.title) : '' })),
      el('h2', undefined, localText(lesson.title)), el('p', 'lesson-brief', localText(lesson.brief)));
    for (let i = 0; i < hints; i++) head.append(el('p', 'lesson-hint', `💡 ${localText(lesson.hints[i])}`));

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
      const inputs = new Map<string, HTMLInputElement>();
      for (const c of answerCrits) {
        const cg = g.criteria.find((x) => x.id === c.id);
        const row = el('label', `lesson-answer ${cg?.state ?? 'pending'}`);
        const input = el('input');
        input.type = 'text';
        input.inputMode = 'decimal';
        input.value = a.answers[c.id] !== undefined ? String(a.answers[c.id]) : '';
        input.setAttribute('aria-label', localText(c.prompt));
        inputs.set(c.id, input);
        const verdict = cg?.state === 'pass' ? '✓' : cg?.state === 'fail'
          ? `✗ ${t('lesson.strip.expected', { value: formatMeasure(c.measure, cg.expected ?? null) })}` : '';
        row.append(el('span', undefined, localText(c.prompt)), input, el('span', 'lesson-answer-mark', verdict));
        form.append(row);
      }
      const check = el('button', 'lesson-primary', t('lesson.strip.check'));
      check.type = 'submit';
      form.append(check);
      form.addEventListener('submit', (e) => { e.preventDefault(); this.submitAnswers(inputs); });
      status.append(form);
    }
    if (flown && g?.final && g.verdict === 'pass') {
      status.append(el('p', 'lesson-note pass', t('lesson.strip.pass')));
      if (lesson.debrief) status.append(el('p', 'lesson-debrief', localText(lesson.debrief)));
    } else if (flown && g?.final && g.verdict === 'fail') status.append(el('p', 'lesson-note fail', t('lesson.strip.fail')));

    const actions = el('div', 'lesson-actions');
    const button = (label: string, fn: () => void, cls = ''): HTMLButtonElement => {
      const b = el('button', cls, label);
      b.type = 'button';
      b.addEventListener('click', fn);
      actions.append(b);
      return b;
    };
    const hintBtn = button(hints < lesson.hints.length ? t('lesson.strip.hint', { n: hints + 1, total: lesson.hints.length }) : t('lesson.strip.noHints'), () => this.showHint());
    hintBtn.disabled = hints >= lesson.hints.length;
    button(t('lesson.strip.restart'), () => this.restart());
    if (flown && g?.final && g.verdict === 'pass') {
      const next = this.nextLesson(lesson);
      if (next) button(t('lesson.strip.next', { n: lessonNumber(next) }), () => this.startLesson(next.id), 'lesson-primary');
    }
    button(t('lesson.strip.catalog'), () => this.openCatalog());
    if (flown && g?.final) button(t('ws.stripButton'), () => this.navigate(WORKSHEETS_HASH));
    button(t('lesson.strip.link'), () => void this.copyLink(lesson));
    button(t('lesson.strip.exit'), () => this.exit());
    s.replaceChildren(head, crits, status, actions);
  }

  private nextLesson(lesson: Lesson): Lesson | null {
    const written = this.written();
    const i = written.findIndex((l) => l.id === lesson.id);
    return i >= 0 && i + 1 < written.length ? written[i + 1] : null;
  }

  private async copyLink(lesson: Lesson): Promise<void> {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('lesson', lesson.id);
    try { await navigator.clipboard.writeText(url.toString()); this.flash(t('lesson.strip.linkCopied')); } catch { this.flash(url.toString()); }
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
    for (const [view, key, hash] of [['catalog', 'lesson.page.lessons', LESSONS_HASH], ['test', 'lesson.page.test', TEST_HASH], ['worksheets', 'ws.tab', WORKSHEETS_HASH]] as const) {
      const a = el('a', undefined, t(key));
      a.href = hash;
      if (this.pageView === view) a.setAttribute('aria-current', 'page');
      tabs.append(a);
    }
    const title = el('span', 'lessons-page-title');
    title.append(el('span', 'lesson-glyph', '✎'), document.createTextNode(` ${t('lesson.page.title')}`));
    this.page.setAttribute('aria-label', t('lesson.page.title'));
    this.pageBar.replaceChildren(title, tabs, back);
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
        const status = l.comingSoon ? '○' : p?.passed ? '✓' : p?.attempts ? '●' : '○';
        card.classList.toggle('passed', !!p?.passed);
        card.classList.toggle('active', this.active?.lesson.id === l.id);
        card.append(el('span', 'lesson-card-status', status));
        const text = el('span', 'lesson-card-text');
        text.append(el('b', undefined, `${lessonNumber(l)} ${localText(l.title)}`), el('small', undefined, localText(l.brief)));
        const tags = el('span', 'lesson-card-tags');
        for (const tag of l.tags ?? []) tags.append(el('span', 'lesson-tag', tag));
        if (l.comingSoon) tags.append(el('span', 'lesson-tag soon', t('lesson.comingSoon')));
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
        return { flight: sim, ended: flightEnded(this.active?.lesson ?? {}, sim) };
      },
      lesson: () => this.active?.lesson ?? null,
      progress: () => this.progressData,
    }, this.content);
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
    const parsed = parseLessonFile(raw, m.datasetIds());
    if (!parsed.usable) {
      this.notice = { level: 'error', text: t('lesson.file.unusable'), details: [] };
    } else {
      const keep = <T extends { id: string }>(old: T[], added: T[]): T[] => [...old.filter((x) => !added.some((y) => y.id === x.id)), ...added];
      this.progressData.customLessons = keep(this.progressData.customLessons, parsed.lessons);
      this.progressData.customQuestions = keep(this.progressData.customQuestions, parsed.questions);
      this.save();
      const errors = parsed.issues.filter((i) => i.level === 'error');
      this.notice = {
        level: errors.length ? 'warn' : 'ok',
        text: t('lesson.file.loaded', { lessons: parsed.lessons.length, questions: parsed.questions.length }),
        details: errors.length ? [t('lesson.file.issues'), ...errors.map(issueText)] : [],
      };
    }
    this.renderCatalog();
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
