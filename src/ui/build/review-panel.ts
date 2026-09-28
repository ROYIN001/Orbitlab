/**
 * The Engineer level's flight readiness review (roadmap D04, "a flight
 * readiness review using the existing pre-flight feasibility verdict"): the
 * vehicle on the bench, on a mission the student sets up — an orbit, a launch
 * site, a payload — reviewed by src/design/readiness.ts and shown as one
 * checklist: the specification, the design's warnings (in the same words as
 * the Explore level), the mission planner's feasibility on paper, the test
 * flight, the Launch section's own verdict, and the notices. "Fly it" is
 * enabled only when nothing fails, and hands over exactly the mission
 * reviewed (src/design/review-model.ts).
 *
 * The review flies a test flight for a vehicle of one's own every time, 0.1 s
 * or so; it runs off the main thread (readiness-job.ts) whenever a choice
 * changes, with a progress line, and the checklist it replaces is dimmed
 * until the new one arrives. The verdict's text is said again in the
 * reader's language here (`readinessVerdict`). A vehicle of one's own with no
 * payload rating cannot be called ready by the verdict, which judges a
 * mission against a rating; the panel then offers to compute them, as the
 * Explore level does (ratings-job.ts), and hands them to the level to keep
 * with the vehicle.
 */
import { t } from '../../i18n';
import type { VehicleSpec } from '../../types';
import type { MissionDocument } from '../../config/mission-file';
import { orbitById } from '../../data/orbits';
import { siteById } from '../../data/sites';
import { readinessVerdict, type Readiness, type ReadinessLevel, type ReadinessMission } from '../../design/readiness';
import {
  REVIEW_ORBITS, checklist, checklistCounts, fitReviewChoice, reviewChoiceProblem, reviewHandoff, reviewMission, reviewSites,
  type ChecklistRow, type ChecklistSection, type ChecklistSectionId, type ReviewChoice,
} from '../../design/review-model';
import { isCatalogueEntry } from '../../design/warnings';
import type { RatingClass } from '../../design/ratings';
import { localized, siteName } from '../names';
import { button, el } from '../orbit/dom';
import { mass } from './figures';
import { sayText, saySubject } from './design-text';
import { field, numberBox, select } from './explore-level';
import { ReadinessRunner } from './readiness-job';
import { runRatingsJob } from './ratings-job';

export interface ReviewHost {
  /** the Launch section's launch time: the review's mission starts from it */
  launchTime(): Date;
  /** hand the reviewed mission to the Launch section; false when it could not take it */
  fly(doc: MissionDocument): boolean;
  /** payload ratings computed here for the vehicle on the bench: the level keeps them with it */
  rated(spec: VehicleSpec): void;
}

const SECTION_KEY: Record<ChecklistSectionId, string> = {
  spec: 'build.eng.review.s.spec', design: 'build.eng.review.s.design', plan: 'build.eng.review.s.plan',
  probe: 'build.eng.review.s.probe', verdict: 'build.eng.review.s.verdict', notices: 'build.eng.review.s.notices',
};
const LEVEL_KEY: Record<ReadinessLevel, string> = {
  ok: 'build.eng.review.level.ok', info: 'build.eng.review.level.info', warn: 'build.eng.review.level.warn', fail: 'build.eng.review.level.fail',
};
const LEVEL_GLYPH: Record<ReadinessLevel, string> = { ok: '✓', info: 'i', warn: '!', fail: '✕' };
/** the look of a level: the Explore level's say-list styles (explore.css), plus a pass */
const LEVEL_CLASS: Record<ReadinessLevel, string> = { ok: 'bd-say-ok', info: 'bd-say-note', warn: 'bd-say-warn', fail: 'bd-say-fail' };

const utc = (d: Date): string => `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
const orbitName = (id: string): string => localized(`orbit.${id}.name`, orbitById(id).name);

interface Reviewed {
  spec: VehicleSpec;
  choice: ReviewChoice;
  /** the Launch section's time the mission was built from */
  from: number;
  mission: ReadinessMission;
  readiness: Readiness;
}

export class ReviewPanel {
  readonly root = el('div', 'be-review');
  private spec: VehicleSpec | null = null;
  private vehicleName = '';
  private choice: ReviewChoice = { orbitId: 'leo', siteId: 'cape', payloadKg: 1000, sixDof: false };
  private reviewed: Reviewed | null = null;
  private running = false;
  /** the review wanted since the last one was asked for (a change made while hidden) */
  private stale = true;
  private problem: string | null = null;
  private error: string | null = null;
  private flyMessage: string | null = null;
  private ratingsJob: { controller: AbortController; rating: RatingClass | null; flights: number } | null = null;
  private ratingsMessage: { level: 'ok' | 'error'; text: string } | null = null;
  private visible = false;
  private queued = 0;
  private readonly runner = new ReadinessRunner();

  private readonly ctrl = el('section', 'bs-panel be-ctrl');
  private readonly out = el('section', 'bs-panel be-out be-review-out');
  private readonly status = el('div', 'be-review-status');
  private readonly list = el('div', 'be-checklist');
  private readonly flyBox = el('div', 'bx-fly be-review-fly');

  constructor(private readonly host: ReviewHost) {
    this.ctrl.setAttribute('aria-labelledby', 'be-review-title');
    this.out.setAttribute('aria-labelledby', 'be-review-out-title');
    // the summary line is what changes when a review lands: said once, politely
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');
    const title = el('h2', 'bx-h2', '');
    title.id = 'be-review-out-title';
    this.out.append(title, this.status, this.list, this.flyBox);
    this.root.append(this.ctrl, this.out);
  }

  /**
   * A new vehicle on the bench, and its payload. `choice` sets the whole
   * mission (the sizing page's "Check readiness"); otherwise the choice made
   * so far is kept where it still fits the vehicle.
   */
  setVehicle(spec: VehicleSpec, name: string, payloadKg: number, choice?: ReviewChoice): void {
    const same = this.spec === spec;
    this.spec = spec;
    this.vehicleName = name;
    if (choice) this.choice = { ...choice };
    else if (!same) this.choice = fitReviewChoice(spec, this.choice, payloadKg);
    this.ratingsJob?.controller.abort();
    this.ratingsMessage = null;
    this.flyMessage = null;
    this.invalidate();
    this.render();
  }

  show(): void {
    this.visible = true;
    // the Launch section's time may have moved since: a mission starts from it
    if (this.reviewed && this.reviewed.from !== this.host.launchTime().getTime()) this.stale = true;
    this.render();
    if (this.stale) this.review();
  }

  hide(): void {
    this.visible = false;
  }

  // ─── the review ───────────────────────────────────────────────────────────

  /** The choice changed: the review on screen no longer describes it. */
  private invalidate(): void {
    this.stale = true;
    this.flyMessage = null;
    if (this.visible) this.queueReview();
  }

  private queueReview(): void {
    if (this.queued) clearTimeout(this.queued);
    // a typed payload settles before a flight is flown for it
    this.queued = window.setTimeout(() => { this.queued = 0; this.review(); }, 180);
  }

  private review(): void {
    const spec = this.spec;
    if (!spec) return;
    this.stale = false;
    this.error = null;
    const problem = reviewChoiceProblem(spec, this.choice);
    this.problem = problem === 'payload' ? t('build.eng.review.bad.payload') : problem ? t('build.eng.review.bad.choice') : null;
    if (this.problem) {
      this.runner.cancel();
      this.running = false;
      this.renderOut();
      return;
    }
    const choice = { ...this.choice };
    const from = this.host.launchTime();
    const mission = reviewMission(spec, choice, from);
    this.running = true;
    this.renderOut();
    this.runner.run(spec, mission).then((r) => {
      this.running = false;
      this.reviewed = { spec, choice, from: from.getTime(), mission, readiness: r };
      this.renderOut();
    }).catch((e: unknown) => {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      this.running = false;
      this.error = t('build.eng.review.error');
      this.renderOut();
    });
  }

  /** The review on screen is the one for the vehicle and choice on screen. */
  private current(): boolean {
    const r = this.reviewed;
    return !!r && !this.running && !this.stale && !this.problem && r.spec === this.spec
      && r.choice.orbitId === this.choice.orbitId && r.choice.siteId === this.choice.siteId
      && r.choice.payloadKg === this.choice.payloadKg && r.choice.sixDof === this.choice.sixDof;
  }

  // ─── drawing ──────────────────────────────────────────────────────────────

  render(): void {
    if (!this.spec) return;
    const active = document.activeElement as HTMLElement | null;
    const key = active && this.root.contains(active) ? active.dataset.k ?? null : null;
    this.renderControls();
    this.renderOut();
    if (key && !this.root.contains(document.activeElement)) this.root.querySelector<HTMLElement>(`[data-k="${CSS.escape(key)}"]`)?.focus();
  }

  private renderControls(): void {
    const spec = this.spec!;
    const own = !isCatalogueEntry(spec);
    const title = el('h2', 'bx-h2', t('build.eng.review.title'));
    title.id = 'be-review-title';
    const parts: HTMLElement[] = [title, el('p', 'bx-note', t('build.eng.review.lead'))];
    const vehicle = el('p', 'be-review-vehicle');
    vehicle.append(el('span', 'bx-field-name', t('build.eng.review.vehicle')), el('strong', undefined, this.vehicleName));
    parts.push(vehicle, el('p', 'bx-note small', t('build.eng.review.vehicleNote')));

    const orbit = select('review:orbit', REVIEW_ORBITS.map((o) => ({ value: o.id, label: orbitName(o.id) })), this.choice.orbitId, (v) => {
      this.choice.orbitId = v;
      this.invalidate();
      this.renderControls();
    });
    parts.push(field(t('build.eng.review.orbit'), orbit));
    const site = select('review:site', reviewSites(spec).map((s) => ({ value: s.id, label: siteName(s) })), this.choice.siteId, (v) => {
      this.choice.siteId = v;
      this.invalidate();
      this.renderControls();
    });
    parts.push(field(t('setup.site'), site));
    const payload = numberBox('review:payload', this.choice.payloadKg, { min: 1, max: 500000, step: 1 }, (v) => {
      this.choice.payloadKg = v;
      this.invalidate();
    });
    const row = el('span', 'bx-with-unit');
    row.append(payload, el('span', 'bx-unit', t('u.kg')));
    parts.push(field(t('build.ex.payload'), row));

    const six = el('input');
    six.type = 'checkbox';
    six.checked = this.choice.sixDof;
    six.dataset.k = 'review:sixdof';
    six.addEventListener('change', () => { this.choice.sixDof = six.checked; this.invalidate(); });
    const sixLabel = el('label', 'bx-check');
    sixLabel.append(six, el('span', undefined, t(own ? 'build.ex.fly.sixDof' : 'build.eng.review.sixDof')));
    parts.push(sixLabel, el('p', 'bx-note small', t('build.eng.review.sixDofNote')));

    const o = orbitById(this.choice.orbitId);
    let when: Date | null = null;
    try { when = reviewMission(spec, this.choice, this.host.launchTime()).launchTime; } catch { when = null; }
    if (when) parts.push(el('p', 'bx-note small', t(o.raanMode === 'free' ? 'build.eng.review.time' : 'build.eng.review.timeWindow', { time: utc(when) })));
    this.ctrl.replaceChildren(...parts);
  }

  private renderOut(): void {
    if (!this.spec) return;
    const title = this.out.querySelector('h2')!;
    title.textContent = t('build.eng.review.checklist');
    const sections = this.sections();
    this.renderStatus(sections);
    this.renderList(sections);
    this.renderFly();
  }

  private renderStatus(sections: ChecklistSection[] | null): void {
    const parts: HTMLElement[] = [];
    if (this.problem) parts.push(el('p', 'bx-note warn', this.problem));
    else if (this.running) {
      const line = el('div', 'bx-progress');
      const bar = el('progress');
      bar.setAttribute('aria-label', t('build.eng.review.title'));
      line.append(bar, el('span', undefined, t(isCatalogueEntry(this.spec!) ? 'build.eng.review.running' : 'build.eng.review.runningProbe')));
      parts.push(line);
    } else if (this.error) parts.push(el('p', 'bx-note bx-msg-error', this.error));
    else if (this.reviewed && sections && this.current()) {
      const counts = checklistCounts(sections);
      const r = this.reviewed.readiness;
      const cls = r.canFly ? (counts.warn ? 'warn' : 'ok') : 'fail';
      const text = !r.canFly ? t('build.eng.review.notReady', { n: counts.fail })
        : counts.warn ? t('build.eng.review.readyWarn', { n: counts.warn }) : t('build.eng.review.ready');
      const banner = el('p', `be-review-banner ${cls}`);
      const glyph = el('span', 'bd-say-glyph', r.canFly ? '✓' : '✕');
      glyph.setAttribute('aria-hidden', 'true');
      banner.append(glyph, ` ${text}`);
      parts.push(banner);
    }
    // what computing the ratings came to: said here, since the box that offered it goes once they exist
    if (this.ratingsMessage) parts.push(el('p', `bx-note bx-msg-${this.ratingsMessage.level}`, this.ratingsMessage.text));
    this.status.replaceChildren(...parts);
  }

  /** The review on screen as its checklist, the verdict said again in the reader's language from the review's plan and probe. */
  private sections(): ChecklistSection[] | null {
    const r = this.reviewed;
    if (!r) return null;
    const verdict = r.readiness.verdict ? readinessVerdict(r.spec, r.mission, r.readiness.plan, r.readiness.insertion) : null;
    this.verdictText = verdict?.text ?? '';
    return checklist(r.spec, r.readiness);
  }

  private verdictText = '';

  private renderList(sections: ChecklistSection[] | null = this.sections()): void {
    this.list.classList.toggle('stale', !this.current());
    this.list.setAttribute('aria-busy', String(this.running));
    if (!sections) { this.list.replaceChildren(); return; }
    this.list.replaceChildren(...sections.map((s) => this.sectionView(s)));
  }

  private sectionView(s: ChecklistSection): HTMLElement {
    const box = el('section', `be-check be-check-${s.level}`);
    const h = el('h3', 'bx-h3 be-check-title');
    const glyph = el('span', `be-check-glyph ${s.level}`, LEVEL_GLYPH[s.level]);
    glyph.setAttribute('aria-hidden', 'true');
    h.append(glyph, ` ${t(SECTION_KEY[s.id])}`, el('span', 'bs-sr', ` — ${t(LEVEL_KEY[s.level])}`));
    const ul = el('ul', 'bd-say-list');
    for (const row of s.rows) ul.append(this.rowView(row));
    box.append(h, ul);
    if (s.id === 'verdict') {
      const v = this.reviewed?.readiness.verdict;
      if (v?.cause === 'noRating' && !isCatalogueEntry(this.reviewed!.spec)) box.append(this.ratingsBox());
    }
    return box;
  }

  private rowView(row: ChecklistRow): HTMLLIElement {
    const li = el('li', `bd-say ${LEVEL_CLASS[row.level]}`);
    const tag = el('span', 'bd-say-tag');
    const glyph = el('span', 'bd-say-glyph', LEVEL_GLYPH[row.level]);
    glyph.setAttribute('aria-hidden', 'true');
    tag.append(glyph, ` ${t(LEVEL_KEY[row.level])}`);
    const body = el('span', 'bd-say-body');
    if (row.text) {
      if (row.text.subject) body.append(el('strong', undefined, `${saySubject(row.text.subject)}: `));
      body.append(sayText(row.text));
    } else body.append(this.verdictText);
    li.append(tag, body);
    if (row.text?.detail) {
      const more = el('details', 'bd-say-detail');
      more.append(el('summary', undefined, t('build.ex.detail')));
      const code = el('code', undefined, row.text.detail);
      code.lang = 'en';
      more.append(code);
      li.append(more);
    }
    return li;
  }

  // ─── ratings, for a vehicle of one's own with none ─────────────────────────

  private ratingsBox(): HTMLElement {
    const box = el('div', 'be-review-rate');
    box.append(el('p', 'bx-note', t('build.eng.review.rateNote')));
    const job = this.ratingsJob;
    if (job) {
      const line = el('div', 'bx-progress');
      const bar = el('progress');
      bar.setAttribute('aria-label', t('build.ex.ratings'));
      const orbit = job.rating === 'GTO' ? t('build.ex.ratings.gto') : t('build.ex.ratings.leo');
      line.append(bar, el('span', undefined, t('build.ex.ratings.computing', { orbit, n: job.flights })));
      const stop = button('watch-btn', t('build.ex.ratings.stop'), () => job.controller.abort());
      stop.dataset.k = 'review:rate-stop';
      line.append(stop);
      box.append(line);
    } else {
      const go = button('watch-btn', t('build.eng.review.rate'), () => this.computeRatings());
      go.dataset.k = 'review:rate';
      box.append(go);
    }
    return box;
  }

  private computeRatings(): void {
    const spec = this.spec;
    if (!spec || this.ratingsJob) return;
    const controller = new AbortController();
    const job = { controller, rating: 'LEO' as RatingClass | null, flights: 0 };
    this.ratingsJob = job;
    this.ratingsMessage = null;
    this.renderList();
    runRatingsJob(structuredClone(spec), controller.signal, (rating, flights) => {
      job.rating = rating;
      job.flights = flights;
      if (this.ratingsJob === job) this.keepFocus(() => this.renderList());
    }).then((res) => {
      if (this.spec !== spec) return;
      this.ratingsJob = null;
      this.ratingsMessage = { level: 'ok', text: t('build.eng.review.rated', {
        n: res.flights, leo: res.payloadLEO.kg > 0 ? mass(res.payloadLEO.kg) : t('build.ex.ratings.nothing'),
        gto: res.payloadGTO.kg > 0 ? mass(res.payloadGTO.kg) : t('build.ex.ratings.nothing'),
      }) };
      const message = this.ratingsMessage;
      // the level puts the rated vehicle on the bench, which reviews it again
      this.host.rated({ ...spec, payloadLEO: res.payloadLEO.kg, payloadGTO: res.payloadGTO.kg });
      this.ratingsMessage = message;
      this.renderOut();
    }).catch((error: unknown) => {
      const cancelled = error instanceof DOMException && error.name === 'AbortError';
      this.ratingsMessage = { level: cancelled ? 'ok' : 'error', text: t(cancelled ? 'build.ex.ratings.stopped' : 'build.ex.ratings.failed') };
    }).finally(() => {
      if (this.ratingsJob === job) this.ratingsJob = null;
      this.keepFocus(() => this.renderOut());
    });
  }

  private keepFocus(redraw: () => void): void {
    const active = document.activeElement as HTMLElement | null;
    const key = active && this.root.contains(active) ? active.dataset.k ?? null : null;
    redraw();
    if (key && !this.root.contains(document.activeElement)) this.root.querySelector<HTMLElement>(`[data-k="${CSS.escape(key)}"]`)?.focus();
  }

  // ─── fly it ───────────────────────────────────────────────────────────────

  private renderFly(): void {
    const title = el('h3', 'bx-h3', t('build.ex.fly.title'));
    const parts: HTMLElement[] = [title];
    const ready = this.current() && this.reviewed!.readiness.canFly;
    const r = this.reviewed;
    if (r && this.current()) {
      parts.push(el('p', 'bx-note', t('build.eng.review.flyLead', {
        payload: mass(r.choice.payloadKg), orbit: orbitName(r.choice.orbitId), site: siteName(siteById(r.choice.siteId)), time: utc(r.mission.launchTime),
      })));
    }
    const fly = button('watch-btn primary bx-fly-btn', `${t('build.ex.fly')} ›`, () => this.fly());
    fly.dataset.k = 'review:fly';
    fly.disabled = !ready;
    parts.push(fly);
    if (!ready) {
      const why = this.running || this.stale ? 'build.eng.review.flyWait' : 'build.eng.review.flyBlocked';
      parts.push(el('p', 'bx-note warn', t(why)));
    }
    if (this.flyMessage) {
      const p = el('p', 'bx-note bx-msg-error', this.flyMessage);
      p.setAttribute('role', 'status');
      parts.push(p);
    }
    this.flyBox.replaceChildren(...parts);
  }

  private fly(): void {
    const r = this.reviewed;
    if (!r || !this.current() || !r.readiness.canFly) return;
    if (!this.host.fly(reviewHandoff(r.spec, r.choice, r.mission))) {
      this.flyMessage = t('build.ex.fly.failed');
      this.renderFly();
    }
  }
}
