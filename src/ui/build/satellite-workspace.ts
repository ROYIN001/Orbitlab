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

/** How long after the last change the figures are worked out, and the draft written, ms. */
const SETTLE_MS = 180;
const KEEP_MS = 400;

/** A template's default name in the interface language: "My NAPA-2 (6U CubeSat)". */
export const defaultNameFor = (templateId: string): string => t('build.sat.defaultName', { template: t(TEMPLATE_TEXT[templateId]?.name ?? templateId) });

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
  private dateShown: DesignDate;
  /** the vehicle "Fly it" launches on: a catalogue id, or null for the Launch section's own (the default) */
  private vehicle: string | null = null;

  constructor() {
    let kept: string | null = null;
    try { kept = localStorage.getItem(SATELLITE_DRAFT_KEY); } catch { /* storage blocked: start on the first template */ }
    const name = defaultNameFor(FIRST_TEMPLATE);
    const restored = restoreKeptSatellite(kept);
    this.draft = restored ?? { design: designFromTemplate(FIRST_TEMPLATE, newSatelliteId(), name), recordId: null, defaultName: name };
    this.dateShown = restored?.date ?? todayDesignDate();
    // written once the page is being left too, so a change made just before a reload is kept
    addEventListener('pagehide', () => this.write());
  }

  get design(): SatelliteDesign { return this.draft.design; }
  get recordId(): string | null { return this.draft.recordId; }
  get activityLevel(): EcssLevel { return this.level; }

  /** The design date the figures are read on, `YYYY-MM-DD` (UTC). */
  get date(): DesignDate { return this.dateShown; }

  /** The Julian date (UTC) the figures are read on: the design date's start. */
  jd(): number {
    return designDateJd(this.dateShown)!;
  }

  /** Another design date (a day of 1957–2200, else nothing changes; false): the figures again, and the draft kept with it. */
  setDate(date: DesignDate): boolean {
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

  /** Another design altogether (a template, a saved or imported record): figures at once. */
  replace(draft: SatelliteDraft): void {
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

  /** The level of solar activity the air is read at (the bench's choice). */
  setLevel(level: EcssLevel): void {
    if (level === this.level) return;
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
    if (this.keep !== null) clearTimeout(this.keep);
    this.keep = setTimeout(() => this.write(), KEEP_MS);
  }

  private write(): void {
    if (this.keep !== null) clearTimeout(this.keep);
    this.keep = null;
    try { localStorage.setItem(SATELLITE_DRAFT_KEY, keptSatelliteText({ ...this.draft, date: this.dateShown })); } catch { /* full or blocked: Save says so */ }
  }
}
