import { workspaceStorage, registerWorkspaceFlush } from '../../workspace/storage';
/**
 * The satellite on the Build section's desk (roadmap D06; Phase 4 map §2.7,
 * track B): the one design the Explore level's satellite designer and the
 * Engineer level's satellite bench both work on — an edit made at one level
 * is what the other shows — with its figures worked out and kept.
 *
 * The draft is kept in this browser under its own key
 * (`SATELLITE_DRAFT_KEY`, orbitlab.build.satellite.v1): a convenience of
 * this browser only — a design is kept for good by Save — so a storage that
 * throws or is empty only means the desk starts on NAPA-2.
 *
 * FIGURES ARE WORKED OUT A MOMENT AFTER THE LAST CHANGE. `designFigures`
 * walks a year of revolutions for the longest eclipse when the orbit
 * changes (a quarter of a second in low orbit; kept per orbit by the model,
 * so a change to the array is quick), so typing a perigee does not stop the
 * page at each key: the figures are marked stale and worked out once the
 * typing pauses.
 *
 * THE DESIGN DATE. The figures are read on a day of the workspace's own (the
 * integration of D06, Phase 4 stage 3; track B's open problem 3): shown and
 * editable on both levels, today unless the student sets it, and kept with
 * the draft, so the same design gives the same figures between visits. It
 * used to be the Launch section's launch time, which moves with the clock and
 * with each mission loaded. The bench's lifetime run starts on it, and "Send
 * to Orbit" places the design in its orbit on it; "Fly it" launches at the
 * Launch section's own launch time, a moment of the flight rather than of the
 * design.
 */
import { t } from '../../i18n';
import { satelliteDesignProblems, type SatelliteDesignIssue } from '../../config/satellite-design';
import {
  FIRST_TEMPLATE, SATELLITE_DRAFT_KEY, TEMPLATE_TEXT, designDateJd, designFigures, designFromTemplate, keptSatelliteText, newSatelliteId,
  restoreKeptSatellite, todayDesignDate, type DesignDate, type SatelliteDraft, type SatelliteFigures,
} from '../../design/satellite-model';
import type { SatelliteDesign } from '../../design/satellite-spec';
import { DEFAULT_ACTIVITY_LEVEL, type EcssLevel } from '../../orbit/satellite-air';
import { canonicalJson } from '../../design/design-ref';

/** How long after the last change the figures are worked out, and the draft written, ms. */
const SETTLE_MS = 180;
const KEEP_MS = 400;

/** A design as compared with how it was put on the desk: a default name aside, which follows the interface language. */
const bare = (d: SatelliteDraft): string => canonicalJson({ ...d.design, name: d.design.name === d.defaultName ? '' : d.design.name });

/** A template's default name in the interface language: "My NAPA-2 (6U CubeSat)". */
export const defaultNameFor = (templateId: string): string => t('build.sat.defaultName', { template: t(TEMPLATE_TEXT[templateId]?.name ?? templateId) });

/**
 * A design lesson's desk (roadmap T01): the design the lesson starts from,
 * the day and the air its figures are read in (fixed by the lesson), and the
 * parts of the design the student may not change (`DesignLockKey`).
 */
export interface LessonDesk {
  start: SatelliteDesign;
  date: DesignDate;
  level: EcssLevel;
  locked: readonly string[];
}

export interface WorkedOut {
  /** the figures of the design on screen, or of the last sound one while it is refused */
  fig: SatelliteFigures | null;
  /** what the checker refuses in the design on screen; empty when it is sound */
  issues: SatelliteDesignIssue[];
  /** the figures are not yet the design on screen's (worked out after a pause) */
  stale: boolean;
}

export class SatelliteWorkspace {
  private draft: SatelliteDraft;
  private fig: SatelliteFigures | null = null;
  private figFor = '';
  /** the design, date and level the figures were last worked out for, sound or not (so a refused design is not checked again and again) */
  private triedFor = '';
  private issues: SatelliteDesignIssue[] = [];
  private level: EcssLevel = DEFAULT_ACTIVITY_LEVEL;
  private readonly listeners = new Set<(what: 'design' | 'figures') => void>();
  private settle: ReturnType<typeof setTimeout> | null = null;
  private keep: ReturnType<typeof setTimeout> | null = null;
  private draftDirty = false;
  private dateShown: DesignDate;
  /** the vehicle "Fly it" launches on: a catalogue id, or null for the Launch section's own (the default) */
  private vehicle: string | null = null;
  /** T01: the design lesson open on the desk, and the student's own design, date and level it put aside */
  private lesson: LessonDesk | null = null;
  private aside: { draft: SatelliteDraft; date: DesignDate; level: EcssLevel } | null = null;
  /** M-BUILD-007: a lesson's desk put aside while the student's own design was opened over it, until `resumeLesson` */
  private parked: { lesson: LessonDesk; draft: SatelliteDraft } | null = null;
  /** M-BUILD-007: the student's own design as it was put on the desk (a template's, a requirements row's), `bare` */
  private pristine: string;
  private replaced = 0;

  constructor() {
    let kept: string | null = null;
    try { kept = workspaceStorage().getItem(SATELLITE_DRAFT_KEY); } catch { /* storage blocked: start on the first template */ }
    const name = defaultNameFor(FIRST_TEMPLATE);
    const restored = restoreKeptSatellite(kept);
    this.draft = restored ?? { design: designFromTemplate(FIRST_TEMPLATE, newSatelliteId(), name), recordId: null, defaultName: name };
    this.dateShown = restored?.date ?? todayDesignDate();
    // a draft kept by this browser is as it started when it is still its template's
    this.pristine = bare({ design: designFromTemplate(this.draft.design.template, this.draft.design.id, ''), recordId: null, defaultName: '' });
    // written once the page is being left too, so a change made just before a reload is kept
    addEventListener('pagehide', () => this.write());
    registerWorkspaceFlush(() => this.write(true));
  }

  get design(): SatelliteDesign { return this.draft.design; }
  /** How many times another design altogether was put on the desk (a template, a saved design, a lesson's): the controls are drawn again. */
  get generation(): number { return this.replaced; }
  get recordId(): string | null { return this.draft.recordId; }
  get activityLevel(): EcssLevel { return this.level; }

  /** The design date the figures are read on, `YYYY-MM-DD` (UTC). */
  get date(): DesignDate { return this.dateShown; }

  /** The Julian date (UTC) the figures are read on: the design date's start. */
  jd(): number {
    return designDateJd(this.dateShown)!;
  }

  // ─── a design lesson on the desk (T01) ────────────────────────────────────

  /** The design lesson open on the desk, if any. */
  get lessonDesk(): LessonDesk | null { return this.lesson; }

  /** Whether the lesson open on the desk fixes this part of the design (a field's path, a menu's, `propulsion`, `payload`). */
  locked(path: string): boolean {
    return !!this.lesson && this.lesson.locked.includes(path);
  }

  /**
   * Open a design lesson's desk: its start design, its date and level, its
   * locks. The student's own design, date and level are put aside — and the
   * draft this browser keeps is left as it is, so a reload in the middle of
   * a lesson brings the student's own design back — until `leaveLesson`.
   */
  enterLesson(desk: LessonDesk, draft: SatelliteDraft = { design: structuredClone(desk.start), recordId: null, defaultName: desk.start.name }): void {
    this.parked = null;
    if (!this.lesson) this.aside = { draft: this.draft, date: this.dateShown, level: this.level };
    this.lesson = desk;
    this.replaced++;
    this.draft = draft;
    this.dateShown = desk.date;
    this.level = desk.level;
    this.workOut();
    this.tell('design');
  }

  /** The lesson's start design again ("Start again"), its date and level as the lesson fixes them. */
  restartLesson(): void {
    if (this.lesson) this.enterLesson(this.lesson);
  }

  /** T01, M-BUILD-007: back to the lesson's design put aside when the student's own was opened over it, as it was left. */
  resumeLesson(): void {
    if (this.parked) this.enterLesson(this.parked.lesson, this.parked.draft);
  }

  /** M-BUILD-007: a lesson's desk put aside (`resumeLesson` brings it back), the student's own design on the desk; whether there was one. */
  private park(): boolean {
    if (!this.lesson || !this.aside) return false;
    this.parked = { lesson: this.lesson, draft: this.draft };
    ({ draft: this.draft, date: this.dateShown, level: this.level } = this.aside);
    this.lesson = this.aside = null;
    this.replaced++;
    return true;
  }

  /**
   * M-BUILD-007: the student's own design another would replace, put on the desk (a lesson's put aside first),
   * or null when it was never saved and is as it was put there.
   */
  own(): SatelliteDraft | null {
    if (this.park()) { this.workOut(); this.tell('design'); }
    return this.draft.recordId === null && bare(this.draft) === this.pristine ? null : this.draft;
  }

  /** Close the lesson's desk: the student's own design, date and level back. */
  leaveLesson(): void {
    this.parked = null;
    if (!this.lesson) return;
    this.lesson = null;
    this.replaced++;
    if (this.aside) {
      this.draft = this.aside.draft;
      this.dateShown = this.aside.date;
      this.level = this.aside.level;
      this.aside = null;
    }
    this.workOut();
    this.tell('design');
  }

  /** Another design date (a day of 1957–2200, else nothing changes; false): the figures again, and the draft kept with it. A lesson fixes its own. */
  setDate(date: DesignDate): boolean {
    if (this.lesson) return date === this.dateShown;
    if (designDateJd(date) === null) return false;
    if (date === this.dateShown) return true;
    this.dateShown = date;
    this.queueKeep();
    this.workOut();
    this.tell('design');
    return true;
  }

  /** The vehicle "Fly it" launches on: a catalogue id, or null for the Launch section's own. */
  get flyVehicle(): string | null { return this.vehicle; }
  set flyVehicle(id: string | null) { this.vehicle = id; }

  /** Listen for a new design (`design`) or new figures (`figures`). */
  subscribe(fn: (what: 'design' | 'figures') => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private tell(what: 'design' | 'figures'): void {
    for (const fn of this.listeners) fn(what);
  }

  /** A change to the design on screen (a number, a menu): figures a moment later. */
  change(design: SatelliteDesign): void {
    this.draft.design = design;
    this.queueKeep();
    this.queueFigures();
    this.tell('design');
  }

  /**
   * Another design altogether (a template, a saved or imported record, a requirements row, read at `level`): figures
   * at once. It takes the student's own design's place: a lesson's is put aside (M-BUILD-007).
   */
  replace(draft: SatelliteDraft, level?: EcssLevel): void {
    this.park();
    if (level) this.level = level;
    // a saved design is compared with its record; one never saved, with itself as it came
    this.pristine = draft.recordId === null ? bare(draft) : '';
    this.replaced++;
    this.draft = draft;
    this.queueKeep();
    this.workOut();
    this.tell('design');
  }

  /** The design was saved as `recordId` (and perhaps renamed). */
  saved(recordId: string | null, name?: string): void {
    this.draft.recordId = recordId;
    if (name !== undefined && name !== this.draft.design.name) this.draft.design = { ...this.draft.design, name };
    this.queueKeep();
    this.tell('design');
  }

  /** The design's name, as typed. */
  rename(name: string): void {
    this.draft.design = { ...this.draft.design, name };
    this.queueKeep();
    this.tell('design');
  }

  /** The level of solar activity the air is read at (the bench's choice; a lesson fixes its own). */
  setLevel(level: EcssLevel): void {
    if (level === this.level || this.lesson) return;
    this.level = level;
    this.workOut();
  }

  /** A default name the student has not changed follows the interface language. */
  syncName(): void {
    const next = defaultNameFor(this.draft.design.template);
    if (this.draft.design.name === this.draft.defaultName && next !== this.draft.defaultName) {
      this.draft.design = { ...this.draft.design, name: next };
      this.tell('design');
    }
    this.draft.defaultName = next;
  }

  /** The figures as they stand: worked out now if they are not the design on screen's and nothing is pending. */
  worked(): WorkedOut {
    if (this.key() !== this.triedFor && this.settle === null) this.workOut();
    return { fig: this.fig, issues: this.issues, stale: this.figFor !== this.key() };
  }

  private key(): string {
    return JSON.stringify([this.draft.design, this.jd(), this.level]);
  }

  private queueFigures(): void {
    if (this.settle !== null) clearTimeout(this.settle);
    this.settle = setTimeout(() => { this.settle = null; this.workOut(); }, SETTLE_MS);
  }

  /** Work the figures out now: the checker first, the cores only for a sound design (a refused one keeps the last figures, marked stale). */
  workOut(): void {
    if (this.settle !== null) { clearTimeout(this.settle); this.settle = null; }
    const key = this.key();
    this.triedFor = key;
    this.issues = satelliteDesignProblems(this.draft.design);
    if (!this.issues.length) {
      try {
        this.fig = designFigures(this.draft.design, this.jd(), { level: this.level });
        this.figFor = key;
      } catch {
        // a sound design a core still cannot take (none known): the last figures stay, stale
        this.figFor = '';
      }
    }
    this.tell('figures');
  }

  private queueKeep(): void {
    if (this.lesson) return;
    this.draftDirty = true;
    if (this.keep !== null) clearTimeout(this.keep);
    this.keep = setTimeout(() => this.write(), KEEP_MS);
  }

  private write(strict = false): void {
    if (!this.draftDirty) return;
    if (this.keep !== null) clearTimeout(this.keep);
    this.keep = null;
    // A pending personal edit still belongs to the put-aside desk during a lesson; never persist the lesson's temporary design.
    const personal = this.lesson ? this.aside : { draft: this.draft, date: this.dateShown };
    if (!personal) return;
    try { workspaceStorage().setItem(SATELLITE_DRAFT_KEY, keptSatelliteText({ ...personal.draft, date: personal.date })); this.draftDirty = false; } catch (error) { if (strict) throw error; /* transitions must keep this workspace open on failure */ }
  }
}
