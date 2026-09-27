/**
 * The placement test (roadmap E03): 25 questions drawn for this student from
 * the bank, then the result — a score and a level in each of the six areas,
 * strengths, what to work on, the misconceptions, and the recommended path
 * through the lessons. Loaded on demand: the bank and the recorded flights
 * stay out of the page until the test is opened.
 *
 * An unfinished test is kept after every answer, so a closed tab comes back
 * to the same question.
 */
import { getLang, t } from '../../i18n';
import { vehicleById } from '../../data/vehicles';
import { VEHICLE_PHOTOS, type PhotoCredit } from '../../lessons/assessment/photos';
import { DATASET_IDS, FLIGHT_DATA, questionBank } from '../../lessons/assessment/bank';
import { DOMAIN_ORDER, TEST_LENGTH, drawTest, newSeed, nextKind } from '../../lessons/assessment/draw';
import { CHART_COLOURS, chartSvg, radarSvg } from '../../lessons/assessment/figures';
import { SERIES_UNITS } from '../../lessons/assessment/flights';
import { indexList, numericExpected, scoreAttempt, type AssessmentResult } from '../../lessons/assessment/score';
import { diagramSvg } from '../../lessons/assessment/diagrams';
import { DraftBook, canSubmit, dontKnow, draftAnswer, pick, setConfidence, toggleChoice, toggleItem, typeNumber } from '../../lessons/assessment/draft';
import type { AssessmentAttempt, Figure, PreparedQuestion, Question } from '../../lessons/assessment/types';
import { lessonNumber } from '../../lessons/catalog';
import { localText, unitText } from '../../lessons/text';
import type { ProgressData } from '../../lessons/progress';
import type { Domain, Lesson } from '../../lessons/types';

export interface AssessmentHost {
  progress(): ProgressData;
  save(): void;
  lessons(): Lesson[];
  goToLesson(id: string): void;
  exportResults(): void;
  /** back to the lesson catalogue */
  back(): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

const base = import.meta.env.BASE_URL;

export const datasetIds = (): ReadonlySet<string> => DATASET_IDS;

const bankFor = (p: ProgressData): Question[] => questionBank(p.customQuestions);

/** The latest finished test, scored. */
export function latestResult(progress: ProgressData, lessons: readonly Lesson[]): { kind: string; finishedAt?: string; result: AssessmentResult } | null {
  const done = progress.assessments.filter((a) => a.finishedAt);
  const last = done[done.length - 1];
  return last ? { kind: last.kind, finishedAt: last.finishedAt, result: scoreAttempt(last, bankFor(progress), lessons) } : null;
}

/** A number as a question prints it: no more digits than it has. */
const num = (v: number): string => String(Number(v.toPrecision(6)));

/** The prompt with this student's numbers in it. */
export function promptText(q: Question, p: PreparedQuestion): string {
  let text = localText(q.prompt);
  for (const [name, v] of Object.entries(p.values ?? {})) text = text.split(`{${name}}`).join(num(v));
  return text;
}

/**
 * Show the placement test in a container of the lessons page. The returned
 * view redraws its screen in a new language.
 */
export function renderAssessment(host: AssessmentHost, container: HTMLElement): { applyLanguage(): void } {
  const view = new AssessmentView(host, container);
  view.start();
  return view;
}

/** An answer as the review prints it. */
function answerText(q: Question, value: number | string): string {
  switch (q.type) {
    case 'choice': return localText(q.options[value as number]?.text);
    case 'vehicle': return vehicleById(String(value)).name;
    case 'numeric': return `${num(Number(value))} ${unitText(q.unit)}`;
    case 'multi': return (indexList(value) ?? []).map((i) => localText(q.options[i]?.text)).join('; ');
    case 'order': return (indexList(value) ?? []).map((i) => localText(q.items[i])).join(' → ');
  }
}

function rightAnswerText(q: Question, p: PreparedQuestion): string {
  switch (q.type) {
    case 'choice': return localText(q.options.find((o) => o.correct)?.text);
    case 'vehicle': return vehicleById(p.vehicle!).name;
    case 'numeric': return `${num(Number(numericExpected(q, p)?.toPrecision(4)))} ${unitText(q.unit)}`;
    case 'multi': return q.options.filter((o) => o.correct).map((o) => localText(o.text)).join('; ');
    case 'order': return q.items.map((x) => localText(x)).join(' → ');
  }
}

/** A photograph's author and licence, as CC BY and CC BY-SA ask, linked to its page on Commons. */
function photoCredit(credit: PhotoCredit): HTMLElement {
  const line = el('p', 'small assess-credit');
  const link = el('a');
  link.href = credit.source;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = t('assess.photoCredit', { author: credit.author, license: credit.license });
  line.append(link);
  return line;
}

class AssessmentView {
  private attempt: AssessmentAttempt | null = null;
  private index = 0;
  /** the answers not yet recorded, by question: kept through a change of language (audit 2026-09-27 A7) */
  private readonly drafts = new DraftBook();
  /** set for the one redraw a change of language asks for, when the focus was in the test */
  private restoreFocus = false;

  /** the screen showing, drawn again when the language changes */
  private redraw: () => void = () => undefined;

  constructor(private readonly host: AssessmentHost, private readonly container: HTMLElement) {}

  applyLanguage(): void {
    // The focus goes back to the control it was on only if it was in the test
    // (or nowhere): it is never taken from the language menu (audit 2026-09-27 A7).
    const active = document.activeElement;
    this.restoreFocus = !active || active === document.body || this.container.contains(active);
    this.redraw();
    this.restoreFocus = false;
  }

  private get bank(): Question[] { return bankFor(this.host.progress()); }
  private question(id: string): Question | undefined { return this.bank.find((q) => q.id === id); }

  start(): void {
    const all = this.host.progress().assessments;
    const open = all.find((a) => !a.finishedAt);
    if (open) { this.attempt = open; this.index = open.answers.length; this.renderQuestion(); return; }
    if (all.some((a) => a.finishedAt)) { this.renderResult(); return; }
    this.renderIntro();
  }

  private frame(...children: Node[]): void {
    const body = el('div', 'assess-body');
    body.append(...children);
    this.container.setAttribute('aria-label', t('assess.title'));
    this.container.replaceChildren(body);
    this.container.closest('.lessons-page')?.scrollTo(0, 0);
  }

  private buttonRow(...buttons: HTMLButtonElement[]): HTMLElement {
    const row = el('div', 'assess-actions');
    row.append(...buttons);
    return row;
  }

  private button(label: string, fn: () => void, primary = false): HTMLButtonElement {
    const b = el('button', primary ? 'lesson-primary' : '', label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  // ─── the introduction ────────────────────────────────────────────────────

  private renderIntro(): void {
    this.redraw = () => this.renderIntro();
    const kind = nextKind(this.host.progress().assessments);
    const eyebrow = el('span', 'lesson-eyebrow', t(`assess.kind.${kind}`));
    const intro = el('p', 'lead', t(kind === 'pre' ? 'assess.intro' : 'assess.introPost', { n: TEST_LENGTH }));
    const areas = el('ul', 'assess-areas');
    for (const dmn of DOMAIN_ORDER) areas.append(el('li', undefined, `${dmn} · ${t(`assess.domain.${dmn}`)}`));
    this.frame(eyebrow, el('h2', undefined, t('assess.title')), intro, areas, el('p', 'small', t('assess.privacy')),
      this.buttonRow(this.button(t('assess.back'), () => this.host.back()), this.button(t('assess.start'), () => this.begin(kind), true)));
  }

  private begin(kind: 'pre' | 'post'): void {
    const progress = this.host.progress();
    const asked = new Set(progress.assessments.flatMap((a) => a.questions.map((q) => q.id)));
    const seed = newSeed();
    this.attempt = { kind, seed, startedAt: new Date().toISOString(), questions: drawTest(this.bank, seed, kind === 'post' ? asked : new Set()), answers: [] };
    progress.assessments.push(this.attempt);
    this.host.save();
    this.index = 0;
    this.drafts.clearAll();
    this.renderQuestion();
  }

  // ─── a question ──────────────────────────────────────────────────────────

  private figure(f: Figure, legendKey?: string, values: Readonly<Record<string, number>> = {}): HTMLElement | null {
    const box = el('figure', 'assess-figure');
    if (f.kind === 'diagram') {
      const svgText = diagramSvg(f.id, values, (u) => unitText(u));
      if (!svgText) return null;
      box.innerHTML = svgText;
      return box;
    }
    if (f.kind === 'vehicle') {
      const img = el('img');
      img.src = `${base}lessons/vehicles/${f.vehicleId}.jpg`;
      img.alt = t('assess.vehicleAlt');
      box.append(img);
      // the author and the licence would give the answer away (SpaceX, CALT…): named in the review
      box.append(el('figcaption', 'assess-credit', t('assess.photoCreditLater')));
      return box;
    }
    if (f.kind === 'chart') {
      const ids = [f.dataset, ...(f.compare ?? [])];
      box.innerHTML = chartSvg(FLIGHT_DATA, ids, f.series, {
        xLabel: t('assess.axisTime'), yLabel: `${t(`assess.series.${f.series}`)}, ${unitText(SERIES_UNITS[f.series])}`, tMax: f.tMax,
      });
      if (ids.length > 1) {
        const legend = el('ul', 'assess-legend');
        ids.forEach((id, k) => {
          const item = el('li');
          const swatch = el('i', k ? 'dashed' : '');
          swatch.style.borderColor = CHART_COLOURS[k % CHART_COLOURS.length];
          item.append(swatch, document.createTextNode(t(`assess.flight.${id}`)));
          legend.append(item);
        });
        box.append(legend);
      }
      box.append(el('figcaption', undefined, legendKey ? t(legendKey) : t('assess.chartCaption', { flight: t(`assess.flight.${f.dataset}`) })));
      return box;
    }
    return null;
  }

  private renderQuestion(): void {
    this.redraw = () => this.renderQuestion();
    const restoreFocus = this.restoreFocus;
    this.restoreFocus = false;
    const a = this.attempt!;
    if (this.index >= a.questions.length) { this.finish(); return; }
    const p = a.questions[this.index];
    const q = this.question(p.id);
    if (!q) { a.answers.push({ id: p.id, value: null, skipped: true }); this.index++; this.renderQuestion(); return; }
    // The answer so far lives in the draft, not in the page: drawn again in
    // another language, the question shows it as it was (audit 2026-09-27 A7).
    const d = this.drafts.get(p.id);

    const head = el('div', 'assess-head');
    head.append(el('span', 'lesson-eyebrow', `${t(`assess.kind.${a.kind}`)} · ${t('assess.areaLevel', { area: q.domain, name: t(`assess.domain.${q.domain}`), level: q.level })}`),
      el('h2', undefined, t('assess.questionOf', { n: this.index + 1, total: a.questions.length })));
    const bar = el('div', 'assess-progress');
    a.questions.forEach((_, i) => bar.append(el('i', i < this.index ? 'done' : i === this.index ? 'now' : '')));
    head.append(bar);

    const grid = el('div', 'assess-question');
    const left = el('div');
    left.append(el('h3', 'assess-prompt', promptText(q, p)));
    const options = el('div', 'assess-options');
    options.setAttribute('role', 'radiogroup');
    const next = this.button(this.index + 1 < a.questions.length ? t('assess.next') : t('assess.finish'), () => this.answer(q, p), true);
    next.dataset.focus = 'next';
    /** each control and how it shows the draft; `paint` brings them all up to date after every change */
    const painters: (() => void)[] = [];
    const paint = (): void => {
      for (const f of painters) f();
      next.disabled = !canSubmit(q, d);
    };
    const change = (fn: () => void) => (): void => { fn(); paint(); };
    const optionButton = (label: string, mark: string, key: string, cls = 'assess-option'): HTMLButtonElement => {
      const b = el('button', cls);
      b.type = 'button';
      b.dataset.focus = key;
      b.append(el('b', undefined, mark), el('span', undefined, label));
      options.append(b);
      return b;
    };
    const showChecked = (b: HTMLElement, on: () => boolean): void => {
      painters.push(() => { b.classList.toggle('sel', on()); b.setAttribute('aria-checked', String(on())); });
    };
    const letters = getLang() === 'th' ? ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'] : getLang() === 'ru' ? ['а', 'б', 'в', 'г', 'д', 'е'] : ['a', 'b', 'c', 'd', 'e', 'f'];
    const single = (label: string, value: number | string, letter: string): void => {
      const b = optionButton(label, letter, `opt:${value}`);
      b.setAttribute('role', 'radio');
      b.addEventListener('click', change(() => pick(d, value)));
      showChecked(b, () => !d.dontKnow && d.picked === value);
    };
    if (q.type === 'choice') (p.order ?? q.options.map((_, i) => i)).forEach((i, k) => single(localText(q.options[i].text), i, letters[k]));
    if (q.type === 'vehicle') (p.vehicleOptions ?? []).forEach((id, k) => single(vehicleById(id).name, id, letters[k]));
    if (q.type === 'multi') {
      options.setAttribute('role', 'group');
      left.append(el('p', 'assess-hint', t('assess.multiHint')));
      (p.order ?? q.options.map((_, i) => i)).forEach((i, k) => {
        const b = optionButton(localText(q.options[i].text), letters[k], `opt:${i}`, 'assess-option assess-check');
        b.setAttribute('role', 'checkbox');
        b.addEventListener('click', change(() => toggleChoice(d, i)));
        showChecked(b, () => !!d.chosen?.includes(i));
      });
    }
    if (q.type === 'order') {
      options.setAttribute('role', 'group');
      left.append(el('p', 'assess-hint', t('assess.orderHint')));
      for (const i of p.order ?? q.items.map((_, k) => k)) {
        const b = optionButton(localText(q.items[i]), '·', `opt:${i}`, 'assess-option assess-item');
        b.addEventListener('click', change(() => toggleItem(d, i)));
        painters.push(() => {
          const at = d.put?.indexOf(i) ?? -1;
          b.classList.toggle('sel', at >= 0);
          b.querySelector('b')!.textContent = at >= 0 ? String(at + 1) : '·';
        });
      }
    }
    let numberBox: HTMLInputElement | null = null;
    if (q.type === 'numeric') {
      const row = el('label', 'assess-number');
      const input = el('input');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.dataset.focus = 'number';
      input.setAttribute('aria-label', t('assess.answerNumber'));
      // the text as typed, finished or not, and where the caret was
      input.value = d.typed ?? '';
      const caret = (): void => { d.caret = [input.selectionStart ?? input.value.length, input.selectionEnd ?? input.value.length]; };
      input.addEventListener('input', change(() => { typeNumber(d, input.value); caret(); }));
      for (const type of ['keyup', 'pointerup', 'select'] as const) input.addEventListener(type, caret);
      // "I don't know" empties the box
      painters.push(() => { if (d.dontKnow) input.value = ''; });
      row.append(el('span', undefined, t('assess.answerNumber')), input, el('span', 'assess-unit', unitText(q.unit)));
      options.append(row);
      numberBox = input;
    }
    if (q.kind === 'knowledge') {
      const dk = optionButton(t('assess.dontKnow'), '?', 'dk', 'assess-option dont-know');
      dk.setAttribute('role', 'radio');
      dk.addEventListener('click', change(() => dontKnow(d)));
      showChecked(dk, () => !!d.dontKnow);
    }
    left.append(options);
    if (q.kind === 'understanding') {
      const conf = el('div', 'assess-confidence');
      conf.setAttribute('role', 'radiogroup');
      conf.setAttribute('aria-label', t('assess.confidence'));
      conf.append(el('span', undefined, t('assess.confidence')));
      for (const c of ['guess', 'unsure', 'sure'] as const) {
        const b = el('button', 'assess-conf', t(`assess.confidence.${c}`));
        b.type = 'button';
        b.dataset.focus = `conf:${c}`;
        b.setAttribute('role', 'radio');
        b.addEventListener('click', change(() => setConfidence(d, c)));
        showChecked(b, () => d.confidence === c);
        conf.append(b);
      }
      left.append(conf);
    }
    grid.append(left);
    const figure: Figure | undefined = q.type === 'vehicle' && p.vehicle ? { kind: 'vehicle', vehicleId: p.vehicle } : q.figure;
    if (figure) {
      const fig = this.figure(figure, undefined, p.values);
      if (fig) grid.append(fig);
    } else grid.classList.add('single');
    const skip = this.button(t('assess.skip'), () => this.answer(q, p, true));
    skip.dataset.focus = 'skip';
    const actions = this.buttonRow(skip, next);
    paint();
    this.frame(head, grid, actions);

    // remember the control in use, and give it the focus back after a redraw
    this.container.querySelector('.assess-body')!.addEventListener('focusin', (e) => {
      const key = (e.target as HTMLElement).dataset?.focus;
      if (key) d.focus = key;
    });
    if (restoreFocus && d.focus) {
      const target = this.container.querySelector<HTMLElement>(`[data-focus="${CSS.escape(d.focus)}"]`);
      target?.focus({ preventScroll: true });
      if (target && target === numberBox && d.caret) numberBox.setSelectionRange(...d.caret);
    }
  }

  private answer(q: Question, p: PreparedQuestion, skipped = false): void {
    const a = this.attempt!;
    const d = this.drafts.get(p.id);
    if (!skipped && !canSubmit(q, d)) return;
    const answer = draftAnswer(q, d, skipped);
    a.answers[this.index] = answer;
    this.drafts.clear(p.id);
    this.host.save();
    this.index++;
    if (q.type === 'choice' && q.observe && !skipped && answer.value !== null) this.renderObserve(q);
    else this.renderQuestion();
  }

  /** Predict, then observe: what the simulator did. */
  private renderObserve(q: Question & { type: 'choice' }): void {
    this.redraw = () => this.renderObserve(q);
    const fig = this.figure(q.observe!, 'assess.observeCaption');
    fig?.classList.add('assess-figure-wide');
    this.frame(el('span', 'lesson-eyebrow', t('assess.observe')), el('h2', undefined, t('assess.observeTitle')),
      el('p', 'lead', t('assess.observeLead')), ...(fig ? [fig] : []),
      this.buttonRow(this.button(this.index < this.attempt!.questions.length ? t('assess.next') : t('assess.finish'), () => this.renderQuestion(), true)));
  }

  private finish(): void {
    const a = this.attempt!;
    a.finishedAt = new Date().toISOString();
    this.host.save();
    this.renderResult();
  }

  // ─── the result ──────────────────────────────────────────────────────────

  private renderResult(): void {
    this.redraw = () => this.renderResult();
    const progress = this.host.progress();
    const lessons = this.host.lessons();
    const done = progress.assessments.filter((x) => x.finishedAt);
    const last = done[done.length - 1];
    const r = scoreAttempt(last, this.bank, lessons);
    const pre = done.find((x) => x.kind === 'pre');
    const before = last.kind === 'post' && pre ? scoreAttempt(pre, this.bank, lessons) : null;
    const order = DOMAIN_ORDER;
    const pct = (res: AssessmentResult) => order.map((dmn) => res.domains.find((x) => x.domain === dmn)!.percent);
    const radar = el('div', 'assess-radar');
    radar.innerHTML = radarSvg(order.map((dmn) => t(`assess.domainShort.${dmn}`)), before ? [pct(before), pct(r)] : [pct(r)]);
    if (before) radar.append(el('p', 'small', t('assess.compare')));

    const bars = el('div', 'assess-bars');
    for (const dmn of order) {
      const s = r.domains.find((x) => x.domain === dmn)!;
      const row = el('div', 'assess-bar');
      const meter = el('div', 'lesson-meter');
      const fill = el('i', s.level);
      fill.style.width = `${s.percent}%`;
      meter.append(fill);
      row.append(el('span', undefined, `${dmn} ${t(`assess.domain.${dmn}`)}`), meter, el('span', 'assess-pct', `${s.percent} %`), el('span', `assess-level ${s.level}`, t(`assess.level.${s.level}`)));
      bars.append(row);
    }
    const left = el('div');
    left.append(radar, bars);

    const right = el('div');
    const card = (title: string, lines: string[], empty: string, cls = ''): HTMLElement => {
      const c = el('div', `assess-card ${cls}`);
      c.append(el('h4', undefined, title));
      if (!lines.length) c.append(el('p', undefined, empty));
      else { const ul = el('ul'); for (const l of lines) ul.append(el('li', undefined, l)); c.append(ul); }
      return c;
    };
    const name = (dmn: Domain) => t(`assess.domain.${dmn}`);
    const strong = r.domains.filter((x) => x.level === 'strong').map((x) => `${name(x.domain)} — ${x.percent} %`);
    const weak = r.domains.filter((x) => x.level !== 'strong').sort((x, y) => x.percent - y.percent)
      .map((x) => `${name(x.domain)} — ${t('assess.wrongCount', { n: x.asked - x.correct, total: x.asked })}`);
    const misc = [...new Set(r.questions.filter((x) => x.misconception).map((x) => x.misconceptionText
      ? t('assess.misconceptionLine', { text: localText(x.misconceptionText) }) : t('assess.misconceptionGeneric', { area: name(x.domain) })))];
    right.append(card(t('assess.strengths'), strong, t('assess.strengthsNone')),
      card(t('assess.weaknesses'), weak, t('assess.weaknessesNone')),
      card(t('assess.misconceptions'), misc, t('assess.misconceptionsNone'), misc.length ? 'misc' : ''));

    const path = el('div', 'assess-card');
    path.append(el('h4', undefined, t('assess.path')));
    const chips = el('div', 'assess-path');
    for (const l of lessons) {
      const advice = r.start === l.id ? 'start' : r.advice[l.id];
      const chip = el('button', `assess-chip ${advice ?? ''} ${l.comingSoon ? 'soon' : ''}`, `${r.start === l.id ? '★ ' : ''}${lessonNumber(l)}`);
      chip.type = 'button';
      chip.title = `${localText(l.title)} — ${t(`lesson.advice.${advice ?? 'do'}`)}${l.comingSoon ? ` (${t('lesson.comingSoon')})` : ''}`;
      chip.disabled = !!l.comingSoon;
      chip.addEventListener('click', () => this.host.goToLesson(l.id));
      chips.append(chip);
    }
    path.append(chips, el('p', 'small', t('assess.pathLegend')));
    right.append(path);

    const start = r.start ? lessons.find((l) => l.id === r.start) : null;
    const buttons: HTMLButtonElement[] = [
      this.button(t('assess.review'), () => this.renderReview(last)),
      this.button(t('lesson.catalog.export'), () => this.host.exportResults()),
      this.button(t(nextKind(progress.assessments) === 'post' ? 'assess.startPost' : 'assess.start'), () => this.begin(nextKind(progress.assessments))),
    ];
    if (start) {
      const go = this.button(start.comingSoon ? t('assess.goSoon', { n: lessonNumber(start) }) : t('assess.goTo', { n: lessonNumber(start), title: localText(start.title) }),
        () => this.host.goToLesson(start.id), true);
      go.disabled = !!start.comingSoon;
      buttons.push(go);
    }
    const grid = el('div', 'assess-result');
    grid.append(left, right);
    const headline = start ? t('assess.headline', { percent: r.percent, area: name(r.startDomain!) }) : t('assess.headlineAll', { percent: r.percent });
    this.frame(el('span', 'lesson-eyebrow', `${t(`assess.kind.${last.kind}`)} · ${new Date(last.finishedAt!).toLocaleDateString(getLang())}`),
      el('h2', undefined, headline), grid, this.buttonRow(...buttons));
  }

  private renderReview(a: AssessmentAttempt): void {
    this.redraw = () => this.renderReview(a);
    const list = el('ol', 'assess-review');
    const answers = new Map(a.answers.map((x) => [x.id, x]));
    const r = scoreAttempt(a, this.bank, this.host.lessons());
    for (const p of a.questions) {
      const q = this.question(p.id);
      if (!q) continue;
      const res = r.questions.find((x) => x.id === p.id);
      const ans = answers.get(p.id);
      const li = el('li', res?.correct ? 'right' : 'wrong');
      li.append(el('p', 'assess-review-q', `${res?.correct ? '✓' : '✗'} ${promptText(q, p)}`));
      const yours = ans?.value === null || ans?.value === undefined ? t(ans?.skipped ? 'assess.skipped' : 'assess.dontKnow') : answerText(q, ans.value);
      const right = rightAnswerText(q, p);
      li.append(el('p', undefined, t('assess.yours', { answer: yours })));
      if (!res?.correct) li.append(el('p', 'assess-review-right', t('assess.correct', { answer: right })));
      if (res?.misconception) {
        li.append(el('p', 'assess-review-misc', res.misconceptionText ? t('assess.misconceptionLine', { text: localText(res.misconceptionText) })
          : t('assess.misconceptionGeneric', { area: t(`assess.domain.${q.domain}`) })));
      }
      li.append(el('p', 'small', localText(q.explanation)));
      const credit = q.type === 'vehicle' ? VEHICLE_PHOTOS[p.vehicle!] : undefined;
      if (credit) li.append(photoCredit(credit));
      const lessons = (q.lessons ?? []).map((id) => this.host.lessons().find((l) => l.id === id)).filter((l): l is Lesson => !!l);
      if (lessons.length) li.append(el('p', 'small', t('assess.relatedLessons', { list: lessons.map((l) => `${lessonNumber(l)} ${localText(l.title)}`).join(', ') })));
      list.append(li);
    }
    this.frame(el('span', 'lesson-eyebrow', t(`assess.kind.${a.kind}`)), el('h2', undefined, t('assess.review')), list,
      this.buttonRow(this.button(t('assess.backToResult'), () => this.renderResult(), true)));
  }
}
