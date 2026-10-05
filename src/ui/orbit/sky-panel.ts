/**
 * Real satellites in the Orbit section (roadmap R02): the catalogue groups
 * of the satellites dataset (src/provider/satellites.ts, from the bundled
 * snapshot or, online, from CelesTrak), or the element sets of a file the
 * user brings, drawn where SGP4 puts them now — a group as points in 3-D
 * and on the map, the one picked with its orbit, its track and what its
 * element set says. The time is real: the clock starts at this moment and
 * runs at the playground's speed.
 *
 * For the one picked it adds its passes over a place (R03), how far off its
 * element set may be (R04) and its close approaches to everything loaded
 * (M01, src/orbit/screening.ts); for the group, when its satellites pass over
 * a place (M02, src/orbit/overflights.ts); for a low one, when it will come
 * down, and the Long March 5B core stages as the case study (M03,
 * src/orbit/reentry.ts). A case lesson (E03 track 6) opens it at the case's
 * tool (`focusCase`) and reads the data it freezes from here (`caseInput`);
 * while it is open, that case's answer key waits until it is answered.
 *
 * The logic is src/orbit/real-sky.ts, omm.ts, tle.ts and sgp4.ts; this is the
 * page's part, driven by the playground (src/ui/orbit/playground.ts), which
 * lends it its views, its time bar and its two side panels.
 */
import { t, getLang } from '../../i18n';
import { RAD } from '../../physics/constants';
import { julianDate } from '../../physics/orbital';
import type { AppLevel } from '../app-mode';
import type { Dataset, DataProvider } from '../../provider/data-provider';
import { SAT_GROUPS, type SatelliteCatalog } from '../../provider/satellites';
import { elementsFromRecord, readElementFile, type ElementFile, type OmmProblem } from '../../orbit/omm';
import {
  elementAge, searchSky, skyFacts, skyObjects, skyOrbit, skyPositions, skyState, type SkyObject, type SkySourceId,
} from '../../orbit/real-sky';
import type { Orbit, OrbitState } from '../../orbit/kepler';
import type { OrbitView } from '../../render/orbit-view';
import { alongside, type GroundTrackView, type TrackOverlay, type TrackPath } from './ground-track';
import { THAI_SATELLITES } from '../../data/thai-satellites';
import type { TleField } from '../../orbit/tle';
import type { Sgp4Error } from '../../orbit/sgp4';
import { button, el, num, span } from './dom';
import { brightest, DARK_SKY, findPasses, lookFrom, type Look, type Pass } from '../../orbit/passes';
import { apparentElevation, loadStandardMagnitudes, type StandardMagnitudes } from '../../orbit/visibility';
import { compass, placeName, stationPicker, type StationChoice } from './applications-panel';
import { stationOf } from '../../orbit/applications-setup';
import { footprintAngle } from '../../orbit/applications';
import { GROWTH_PER_DAY, uncertaintyAt } from '../../orbit/uncertainty';
import { ephemerisOf, type Conjunction } from '../../orbit/screening';
import { runScreeningJob } from '../../orbit/screening-job';
import { cdmCovariances, cdmProbability, parseCdm, type ConjunctionMessage } from '../../orbit/cdm';
import { encounterPlane, encounterPlaneSvg } from '../../orbit/encounter-plane';
import { rtnAxes, rtnToFrame, type Mat3 } from '../../orbit/conjunction';
import { overflightsInSlices, type Overflight } from '../../orbit/overflights';
import { canImage, reachEdges, sensorFor, type ImagingVerdict, type Sensor } from '../../orbit/sensors';
import { ECCENTRIC, predictReentry, REENTRY_BELOW, tumblingBoxArea, tumblingCylinderArea, WINDOW_FRACTION, type Reentry } from '../../orbit/reentry';
import { runReentryJob, type DragFrom } from '../../orbit/reentry-job';
import { ballisticFromDecayRate, craftOfB } from '../../orbit/ballistic';
import { NAPA2 } from '../../data/napa2';
import type { ElementSet } from '../../orbit/tle';
import { CASE_IDS, caseWorksheet, type CaseId, type CaseSource } from '../../worksheets/cases';
import { CASE_FOCUS, caseAnswersShown, caseStudyErrorShown, type CaseLessonState } from '../../worksheets/case-ids';
import { answerKeyHtml, worksheetsHtml } from '../../worksheets/html';
import { downloadBlob } from '../download';
import { loadSolarDaily, measuredActivity } from '../../physics/propagator/activity';
import { setEarthOrientation } from '../../orbit/earth-orientation';
import { CZ5B_STAGES } from '../../data/cz5b';
import type { SpaceWeather } from '../../provider/space-weather';
import { Latest, positiveNumber, ResultSlot, type Freshness, type SlotInputs } from '../result-slot';

export interface SkyHost {
  level(): AppLevel;
  provider(): DataProvider;
  /** the panels are out of date: draw them again */
  refresh(): void;
  /** only the right panel is (a satellite picked): the list keeps its place */
  refreshFacts(): void;
  /** put an orbit in the playground (the picked satellite's, now) */
  toPlayground(orbit: Orbit, label: string): void;
  /** P2.5: show the map (the ground track), for what is drawn on it */
  showMap?(): void;
}

/** A file larger than this is not read: a whole catalogue is a few MB. */
export const MAX_IMPORT_BYTES = 30 * 1024 * 1024;
/** How many of a group's list are shown at once; the search narrows the rest. */
const LIST_LIMIT = 150;
/** A group larger than this has its points moved a few times a second, not every frame. */
const EVERY_FRAME = 3000;

const SOURCE_KEY: Record<SkySourceId, string> = {
  stations: 'sky.group.stations', thai: 'sky.group.thai', gnss: 'sky.group.gnss', weather: 'sky.group.weather',
  imaging: 'sky.group.imaging', debris: 'sky.group.debris', imported: 'sky.group.imported',
};
const ABOUT_KEY: Record<SkySourceId, string> = {
  stations: 'sky.about.stations', thai: 'sky.about.thai', gnss: 'sky.about.gnss', weather: 'sky.about.weather',
  imaging: 'sky.about.imaging', debris: 'sky.about.debris', imported: 'sky.about.imported',
};
/** What a group's text rests on, beyond the catalogue itself. */
const ABOUT_SOURCE: Partial<Record<SkySourceId, { title: string; url: string }>> = {
  debris: { title: 'NASA Orbital Debris Quarterly News 11-2 (April 2007)', url: 'https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv11i2.pdf' },
  imaging: { title: 'Gunter\'s Space Page: Yaogan 1, 3, 10 (JB-5)', url: 'https://space.skyrocket.de/doc_sdat/yaogan-1.htm' },
};

/** SGP4's error codes, in words (src/orbit/sgp4.ts). */
const ERROR_KEY: Record<Exclude<Sgp4Error, 0>, string> = {
  1: 'sky.err.1', 2: 'sky.err.2', 3: 'sky.err.3', 4: 'sky.err.4', 5: 'sky.err.5', 6: 'sky.err.6',
};
/** The two-line format's fields, in words. */
const FIELD_KEY: Record<TleField, string> = {
  format: 'sky.field.format', satnum: 'sky.field.satnum', epoch: 'sky.field.epoch', ndot: 'sky.field.ndot', nddot: 'sky.field.nddot',
  bstar: 'sky.field.bstar', inclination: 'sky.field.inclination', node: 'sky.field.node', eccentricity: 'sky.field.eccentricity',
  argp: 'sky.field.argp', anomaly: 'sky.field.anomaly', meanMotion: 'sky.field.meanMotion',
};

type Status = { state: 'idle' } | { state: 'loading' } | { state: 'ready'; set: Dataset<SatelliteCatalog> } | { state: 'failed'; reason: string };

export class RealSky {
  /** the moment on screen, Julian date (UTC) */
  jd = julianDate(new Date());
  private status: Status = { state: 'idle' };
  private source: SkySourceId = 'stations';
  private query = '';
  private selectedKey: string | null = 'stations:25544';
  private readonly bySource = new Map<SkySourceId, SkyObject[]>();
  private imported: { file: string; result: ElementFile } | null = null;
  /** The latest attempt's diagnostics are separate from the last accepted element sets. */
  private importReportResult: ElementFile | null = null;
  /** how many files have been accepted: a file read again is new data, even under the same name (A14) */
  private importCount = 0;
  private importNote: string | null = null;
  /** the group's positions and the points below them, reused */
  private xyz = new Float32Array(0);
  private latlon = new Float32Array(0);
  private count = 0;
  private pointsClock = 0;
  /** the points must be moved now, not at the next quarter second: a new group, or a jump in time */
  private stale = true;
  private framedKey: string | null = null;
  private lastGood: OrbitState | null = null;
  private live: { alt?: HTMLElement; speed?: HTMLElement; latlon?: HTMLElement; age?: HTMLElement; teme?: HTMLElement; next?: HTMLElement; error?: HTMLElement; state?: HTMLElement } = {};
  /** A16: whether the facts on screen were drawn for a moment SGP4 could not place the satellite at */
  private shownFailed = false;
  /** R03: where the passes are seen from, the lowest elevation that counts (the passes found are in `results.passes`) */
  private place: StationChoice = { stationId: 'bangkok', station: stationOf('bangkok')! };
  private minEl = 10 * Math.PI / 180;
  /** P2.5: the satellites' standard magnitudes (McCants), for how bright a pass is */
  private magnitudes: StandardMagnitudes | null = null;
  /** M01: the screening's settings, and the last one run (or running) */
  private conj = { within: 5e3, days: 3, radius: 10, open: false };
  /** the screening running, to stop it */
  private screeningAbort: AbortController | null = null;
  /** P2.5: the close approach shown in the views and with its encounter plane */
  private shownApproach: Conjunction | null = null;
  /** P2.5: the overflight drawn on the map, with its instrument's reach */
  private shownOverflight: Overflight | null = null;
  /** P2.5: the map's lines for what is shown, kept while it stays the same */
  private mapCache: { key: string; overlay: Pick<TrackOverlay, 'paths' | 'band' | 'marks'> } | null = null;
  private focus3dKey = '';
  /** P2.5: a conjunction data message read from a file, and the combined radius used with it */
  private cdm: { file: string; msg: ConjunctionMessage | null; error: string | null; radius: number } | null = null;
  /** M02: overflights of the place by the group on screen: the settings, and the last search */
  private over = { minEl: 30 * Math.PI / 180, days: 1, daylight: false, canOnly: false, open: false };
  /** M03: the object's mass and size for the re-entry prediction, the last prediction, and the case study's */
  readonly reentry = { mass: 1000, area: 5, cd: 2.2, from: 'decay' as DragFrom, open: false };
  /** the re-entry prediction running, to stop it */
  private reentryAbort: AbortController | null = null;

  /**
   * The results, each with the inputs it was found from (audit 2026-09-27 A4,
   * A14, A15): shown with them, and marked stale when the controls or the data
   * loaded have moved on since. The passes are found again by themselves.
   */
  readonly results = {
    passes: new ResultSlot<PassInputs, { list: Pass[]; until: number }>(),
    over: new ResultSlot<OverInputs, Overflight[]>((i) => [
      placeText(i.stationId, i.lat, i.lon), t(SOURCE_KEY[i.source]), `≥ ${num(i.minEl * 180 / Math.PI)}°`, daysText(i.days), dataText(i.data),
    ]),
    reentry: new ResultSlot<ReentryInputs, { reentry: Reentry | null; b: number | null; sun: SunSource }>((i) => [
      i.name, t(DRAG_KEY[i.from], { n: num(i.sets) }),
      ...(i.from === 'size' ? [`${num(i.mass)} ${t('u.kg')}`, t('result.area', { v: num(i.area, 2) }), `C_D ${num(i.cd, 2)}`] : []),
      epochText(i.epoch), dataText(i.data),
    ]),
    screening: new ResultSlot<ScreenInputs, Conjunction[]>((i) => [
      i.name, `< ${num(i.within / 1000)} ${t('u.km')}`, daysText(i.days), t('result.radius', { v: num(i.radius, 1) }), epochText(i.epoch), dataText(i.data),
      ...(i.file ? [t('result.file', { file: i.file.replace(/#\d+$/, '') })] : []),
    ]),
    caseStudy: new ResultSlot<CaseInputs, { rows: { name: string; missionKey: string; p: Reentry; actual: number }[]; sun: SunSource }>(),
    /** M-ORBIT-002: NAPA-2's case, kept with the data mode it ran in as the Long March one is */
    napaCase: new ResultSlot<CaseInputs, { box: Reentry; fitted: Reentry | null; b: number | null; actual: number }>(),
  };
  /** A14: only the latest catalogue request may answer */
  private readonly loads = new Latest();
  /** the status lines of the searches in progress, to count them up without drawing the panel again */
  private overStatus: HTMLElement | null = null;
  private conjStatus: HTMLElement | null = null;
  private reentryStatus: HTMLElement | null = null;

  constructor(private readonly host: SkyHost) {}

  /** The catalogue as loaded, or null while it is not. */
  get dataset(): Dataset<SatelliteCatalog> | null {
    return this.status.state === 'ready' ? this.status.set : null;
  }

  /** waiting for the catalogue to be in, or to have failed (`ready`) */
  private waiting: Array<() => void> = [];

  /** Load the catalogue (once; again after the data mode changes). */
  load(): void {
    if (this.status.state === 'loading' || this.status.state === 'ready') return;
    this.status = { state: 'loading' };
    const settled = () => { const w = this.waiting; this.waiting = []; for (const f of w) f(); };
    // A14: a request of an earlier data mode may answer after this one: only the latest is taken
    const token = this.loads.next();
    // P2.5: the Earth's orientation, for placing the satellites over the ground; without it UT1 is taken for UTC
    const eop = this.host.provider().load('earthOrientation').then((set) => set.data, () => null);
    loadStandardMagnitudes().then((m) => { this.magnitudes = m; }, () => { this.magnitudes = null; });
    this.host.provider().load('satellites').then(
      async (set) => {
        const orientation = await eop;
        if (!this.loads.isLatest(token)) return;
        setEarthOrientation(orientation);
        this.status = { state: 'ready', set }; this.bySource.clear(); this.stale = true; this.lastGood = null; this.host.refresh(); settled();
      },
      (error: unknown) => {
        if (!this.loads.isLatest(token)) return;
        this.status = { state: 'failed', reason: error instanceof Error ? error.message : String(error) }; this.host.refresh(); settled();
      },
    );
  }

  /** The catalogue is in, or could not be had: loaded first if it is not. */
  ready(): Promise<void> {
    this.load();
    if (this.status.state === 'ready' || this.status.state === 'failed') return Promise.resolve();
    return new Promise((resolve) => this.waiting.push(resolve));
  }

  /**
   * The data a case sheet is worked from as they are now (P2.5): the Sun's
   * activity, and THEOS-2's element set from the catalogue once it is in. A
   * case lesson takes them once, when it opens, and keeps them.
   */
  async caseInput(): Promise<CaseSource> {
    // a catalogue that could not be loaded is asked for again
    if (this.status.state === 'failed') this.status = { state: 'idle' };
    await this.ready();
    const { series, to } = await this.sun();
    const theos2 = this.objects('thai').find((o) => o.el.satnum === THEOS2_NORAD)?.el ?? null;
    return { activity: series, theos2, activityTo: to };
  }

  /**
   * A case lesson opens here (E03 track 6): the case's group, its satellite
   * picked, the tool the case is about opened, and the case chosen in the
   * case sheets' block. Nothing is run for the student (src/worksheets/case-ids.ts).
   */
  focusCase(id: CaseId): void {
    const f = CASE_FOCUS[id];
    this.showForTour(f.group, f.satnum);
    if (id === 'theos2') this.place = { stationId: 'bangkok', station: stationOf('bangkok')! };
    this.over.open = f.open === 'over';
    this.reentry.open = f.open === 'reentry';
    this.conj.open = f.open === 'conj';
    this.caseChoice = id;
    this.casesOpen = true;
  }

  /** The case lesson open now, if any: its case's answer key waits until the lesson is answered. */
  private lessonCase: CaseLessonState | null = null;

  setLessonCase(state: CaseLessonState | null): void {
    this.lessonCase = state;
    this.host.refresh();
  }

  /**
   * The data mode changed: the catalogue is loaded again from the new provider
   * when next shown, and a request still out for the old one is not listened
   * to (A14). The results found stay, marked stale once the new data differ.
   */
  reset(): void {
    this.loads.next();
    this.status = { state: 'idle' };
    this.bySource.clear();
    this.lastGood = null;
    this.stale = true;
  }

  /** The data a result from `source` rests on (A14): the catalogue as loaded, or the file read. */
  private dataTag(source: SkySourceId): DataTag {
    if (source === 'imported') return { from: 'file', asOf: this.imported?.file ?? '', fetched: String(this.importCount) };
    const set = this.dataset;
    return set ? { from: set.from, asOf: set.asOf, fetched: set.fetched ?? '' } : { from: 'none', asOf: '', fetched: '' };
  }

  /** Back to this moment. */
  now(): void {
    this.jd = julianDate(new Date());
    this.stale = true;
  }

  advance(seconds: number): void {
    this.jd += seconds / 86400;
  }

  /** The satellites of the source on screen, made ready for SGP4 the first time they are wanted. */
  private objects(source = this.source): SkyObject[] {
    const kept = this.bySource.get(source);
    if (kept) return kept;
    let sets: SkyObject[] = [];
    if (source === 'imported') sets = this.imported ? skyObjects(this.imported.result.sets, 'imported') : [];
    else if (this.status.state === 'ready') {
      const group = this.status.set.data.groups.find((g) => g.id === source);
      sets = group ? skyObjects(group.sets.map(elementsFromRecord), source) : [];
    } else return [];
    this.bySource.set(source, sets);
    return sets;
  }

  private get selected(): SkyObject | null {
    return this.selectedKey ? this.objects().find((o) => o.key === this.selectedKey) ?? null : null;
  }

  private select(key: string | null): void {
    this.selectedKey = key;
    this.lastGood = null;
    for (const b of this.list?.querySelectorAll<HTMLButtonElement>('button[data-key]') ?? []) b.setAttribute('aria-pressed', String(b.dataset.key === key));
    this.host.refreshFacts();
  }

  /** the list on screen, to mark the one picked without drawing it again */
  private list: HTMLElement | null = null;

  private setSource(source: SkySourceId): void {
    this.source = source;
    this.query = '';
    const first = this.objects()[0];
    // a debris cloud is looked at as a whole; any other group opens on its first satellite
    this.selectedKey = first && source !== 'debris' ? first.key : null;
    this.stale = true;
    this.framedKey = null;
    this.host.refresh();
  }

  /** Where the picked satellite is at `jd`: SGP4's answer, or the last one it gave where it gives none — for drawing its track only (A16). */
  private stateAt(o: SkyObject, jd: number): OrbitState | null {
    const s = skyState(o, jd);
    if (s.error === 0) { this.lastGood = s; return s; }
    return this.lastGood;
  }

  // ─── drawing ──────────────────────────────────────────────────────────────

  /** One frame of the 3-D view. */
  draw3d(view: OrbitView, realSeconds: number): void {
    this.tick(realSeconds);
    const sel = this.selected;
    const orbit = sel ? skyOrbit(sel, this.jd) : null;
    view.setBareTime(this.jd);
    view.setPoints(this.count ? this.xyz : null, this.count);
    view.setOrbit(orbit);
    this.drawFocus3d(view, sel);
    // a new satellite or group: the camera stands back to see it (its orbit, or the whole group)
    const key = `${this.source}|${sel?.key ?? ''}`;
    if (key !== this.framedKey && (orbit || this.count)) {
      this.framedKey = key;
      view.frameOrbit();
    }
    view.update(0);
    view.render();
  }

  /** The views were cleared (the playground's own drawing came and went): draw the focus again. */
  forgetViews(): void {
    this.focus3dKey = '';
  }

  /** What the 3-D view shows of the approach picked (P2.5): the other object's orbit about the closest approach, where they meet, where it is now. */
  private drawFocus3d(view: OrbitView, sel: SkyObject | null): void {
    const c = sel && this.results.screening.inputs?.object === sel.key ? this.shownApproach : null;
    const key = c ? `${c.other.key}|${c.approach.tca}` : '';
    if (key !== this.focus3dKey) {
      this.focus3dKey = key;
      if (!c) { view.setGhosts([]); view.setMarkers([]); }
      else {
        const eph = ephemerisOf(c.other), period = skyFacts(c.other).period / 86400;
        const points: { x: number; y: number; z: number }[] = [];
        for (let k = 0; k <= 240; k++) {
          const s = eph(c.approach.tca + period * (k / 240 - 0.5));
          if (s) points.push(s.r);
        }
        view.setGhosts([{ points, color: 0xff8a65 }]);
        view.setMarkers([{ position: c.approach.a.r, label: t('conj.tcaMark'), color: 0xffd28a }]);
      }
    }
    const now = c ? ephemerisOf(c.other)(this.jd) : null;
    view.setTarget(now ? now.r : null);
  }

  /** One frame of the map. */
  drawTrack(track: GroundTrackView, realSeconds: number): void {
    this.tick(realSeconds);
    const sel = this.selected;
    const jd = this.jd;
    const cur = sel ? skyState(sel, jd) : null;
    if (cur && cur.error === 0) this.lastGood = cur;
    // A16: no position now: the track is drawn to the last one SGP4 gave, and the map says so
    const failed = !!cur && cur.error !== 0;
    const now = cur && !failed ? cur : failed ? this.lastGood : null;
    const stateOf = sel && now ? (tt: number) => this.stateAt(sel, jd + tt / 86400) ?? now : null;
    track.draw(stateOf, 0, jd, sel ? skyFacts(sel).period : 5400, {
      ...this.mapOverlay(sel),
      points: this.count ? { latlon: this.latlon, count: this.count, label: t(SOURCE_KEY[this.source]) } : undefined,
      // R03: where the passes are seen from, and the ground the satellite is above the lowest elevation for
      station: sel ? { lat: this.place.station.lat, lon: this.place.station.lon } : undefined,
      footprint: sel && now && !failed ? Math.max(0, footprintAngle(Math.hypot(now.r.x, now.r.y, now.r.z), this.minEl)) : undefined,
      nowLabel: failed ? t('sky.track.lastGood') : undefined,
    });
  }

  /**
   * What the map adds for what is shown (P2.5): an overflight's pass with the
   * edges of the ground its instrument can reach; the ground a re-entry may
   * come down on (the track over the window when it is two days or less, the
   * band of latitudes the orbit covers when it is longer); the point below a
   * close approach.
   */
  private mapOverlay(sel: SkyObject | null): Pick<TrackOverlay, 'paths' | 'band' | 'marks'> {
    const f = sel && this.shownOverflight?.object.key === sel.key ? this.shownOverflight : null;
    // a re-entry result is drawn only while it is for the inputs on screen (A15)
    const rs = this.results.reentry;
    const r = sel && rs.state === 'done' && rs.inputs?.object === sel.key && rs.result?.reentry?.window && rs.status(this.reentryInputs(sel)) === 'fresh' ? rs.result.reentry : null;
    const c = sel && this.results.screening.inputs?.object === sel.key ? this.shownApproach : null;
    const key = `${sel?.key}|${f?.pass.top.jd}|${r?.jd}|${c?.approach.tca}|${getLang()}`;
    if (this.mapCache?.key === key) return this.mapCache.overlay;
    const ground = (o: SkyObject, jd0: number, jd1: number, step: number): { lat: number; lon: number }[] => {
      const pts: { lat: number; lon: number }[] = [];
      for (let jd = jd0; jd <= jd1; jd += step / 86400) { const s = skyState(o, jd); if (s.error === 0) pts.push({ lat: s.lat, lon: s.lon }); }
      return pts;
    };
    const paths: TrackPath[] = [], marks: NonNullable<TrackOverlay['marks']> = [];
    let band: TrackOverlay['band'];
    if (f && sel) {
      const pts = ground(sel, f.pass.top.jd - 8 / 1440, f.pass.top.jd + 8 / 1440, 10);
      paths.push({ pts, color: '#ffffff', width: 2, label: t('map.pass') });
      const sensor = sensorFor(sel.el.satnum);
      const top = skyState(sel, f.pass.top.jd);
      if (sensor && top.error === 0) {
        for (const d of reachEdges(sensor, top.alt)) paths.push({ pts: alongside(pts, d), color: '#7ddba0', width: 1.4, dash: [5, 3], label: t('map.reach') });
      }
    }
    if (r && sel && r.window) {
      if (r.window[1] - r.window[0] <= 2) {
        paths.push({ pts: ground(sel, r.window[0], r.window[1], 60), color: 'rgba(255, 110, 90, 0.8)', width: 2.5, label: t('map.reentryTrack') });
      } else {
        const i = Math.min(sel.sat.inclo, Math.PI - sel.sat.inclo);
        band = { from: -i, to: i, color: '#ff6e5a', label: t('map.reentryBand', { lat: num((i * 180) / Math.PI, 1) }) };
      }
    }
    if (c && sel) {
      const s = skyState(sel, c.approach.tca);
      if (s.error === 0) marks.push({ lat: s.lat, lon: s.lon, label: t('map.tca'), color: '#ffd28a' });
      paths.push({ pts: ground(c.other, c.approach.tca - 10 / 1440, c.approach.tca + 10 / 1440, 15), color: '#ff8a65', width: 1.6, dash: [6, 3], label: t('map.other') });
    }
    const overlay = { paths, band, marks };
    this.mapCache = { key, overlay };
    return overlay;
  }

  /** The group's points, moved to the moment on screen: every frame, or four times a second for a large group. */
  private tick(realSeconds: number): void {
    if (this.status.state === 'idle') this.load();
    this.pickForTour();
    const objs = this.objects();
    this.pointsClock += realSeconds;
    if (objs.length > EVERY_FRAME && !this.stale && this.pointsClock < 0.25) return;
    this.pointsClock = 0;
    this.stale = false;
    if (this.xyz.length < objs.length * 3) {
      this.xyz = new Float32Array(objs.length * 3);
      this.latlon = new Float32Array(objs.length * 2);
    }
    this.count = skyPositions(objs, this.jd, this.xyz, this.latlon);
  }

  // ─── the panels ───────────────────────────────────────────────────────────

  /** The left panel: the group, the search, the list, a file of one's own. */
  controls(): HTMLElement {
    const box = el('section', 'pg-sky');
    box.append(el('p', 'pg-lead', t('sky.lead')));
    const st = this.status;
    if (st.state === 'loading' || st.state === 'idle') { box.append(el('p', 'pg-note', t('sky.loading'))); }
    if (st.state === 'failed') box.append(el('p', 'pg-warn', t('sky.failed', { reason: st.reason })));

    const pick = el('label', 'pg-preset');
    pick.append(el('span', undefined, t('sky.group')));
    const sel = el('select');
    const ids: SkySourceId[] = [...SAT_GROUPS.map((g) => g.id), ...(this.imported ? ['imported' as const] : [])];
    sel.append(...ids.map((id) => { const o = el('option', undefined, t(SOURCE_KEY[id])); o.value = id; return o; }));
    sel.value = this.source;
    sel.addEventListener('change', () => this.setSource(sel.value as SkySourceId));
    pick.append(sel);
    box.append(pick);

    const objs = this.objects();
    const about = el('p', 'pg-tool-lead', t(ABOUT_KEY[this.source], { n: num(objs.length) }));
    const src = ABOUT_SOURCE[this.source];
    if (src) {
      const a = el('a', undefined, src.title);
      a.href = src.url; a.target = '_blank'; a.rel = 'noopener';
      about.append(' ', a);
    }
    box.append(about);

    if (objs.length) {
      const search = el('input', 'pg-sky-search');
      search.type = 'search';
      search.placeholder = t('sky.search');
      search.setAttribute('aria-label', t('sky.search'));
      search.value = this.query;
      const list = el('ul', 'pg-sky-list');
      list.setAttribute('aria-label', t(SOURCE_KEY[this.source]));
      const fill = () => {
        const found = searchSky(objs, this.query);
        list.replaceChildren(...found.slice(0, LIST_LIMIT).map((o) => {
          const li = el('li');
          const b = button('pg-sky-item', '', () => this.select(o.key === this.selectedKey ? null : o.key));
          b.dataset.key = o.key;
          b.setAttribute('aria-pressed', String(o.key === this.selectedKey));
          b.append(el('span', 'pg-sky-name', o.el.name ?? t('sky.unnamed')), el('span', 'pg-sky-num', String(o.el.satnum)));
          li.append(b);
          return li;
        }));
        if (!found.length) list.append(el('li', 'pg-note', t('sky.none')));
        if (found.length > LIST_LIMIT) list.append(el('li', 'pg-note', t('sky.more', { n: num(found.length - LIST_LIMIT) })));
      };
      search.addEventListener('input', () => { this.query = search.value; fill(); });
      fill();
      this.list = list;
      box.append(search, list);
    }

    if (objs.length) box.append(this.overflightsBlock());
    if (this.status.state === 'ready') box.append(this.caseSheetsBlock());

    // a file of one's own: read here, sent nowhere
    const imp = el('div', 'pg-sky-import');
    const input = el('input');
    input.type = 'file';
    input.accept = '.txt,.tle,.3le,.2le,.json,.csv,.xml,.kvn,text/plain,application/json,text/csv,application/xml';
    input.hidden = true;
    input.addEventListener('change', () => { const f = input.files?.[0]; if (f) void this.importFile(f); input.value = ''; });
    imp.append(input, button('watch-btn', t('sky.import'), () => input.click()), el('p', 'pg-note', t('sky.import.note')));
    if (this.importNote) imp.append(this.importReport());
    box.append(imp);
    return box;
  }

  private importReport(): HTMLElement {
    const box = el('div', 'pg-sky-report');
    box.setAttribute('aria-live', 'polite');
    box.append(el('p', undefined, this.importNote ?? ''));
    const r = this.importReportResult;
    if (r && r.rejected.length) {
      box.append(el('p', 'pg-warn', t('sky.import.rejected', { n: num(r.rejected.length) })));
      const ul = el('ul', 'pg-sky-problems');
      for (const rej of r.rejected.slice(0, 8)) ul.append(el('li', undefined, `${r.format === 'tle' ? t('sky.at.line', { n: rej.at }) : t('sky.at.set', { n: rej.at })}: ${rej.problems.map(problemText).join('; ')}`));
      if (r.rejected.length > 8) ul.append(el('li', undefined, '…'));
      box.append(ul);
    }
    if (this.imported && r !== this.imported.result) {
      const { file, result } = this.imported;
      box.append(el('p', 'pg-note', t('sky.import.read', { n: num(result.sets.length), file, format: (result.format ?? '').toUpperCase() })));
    }
    return box;
  }

  /** Read a file the user picked: in this page, nowhere else. */
  async importFile(file: File): Promise<void> {
    if (file.size > MAX_IMPORT_BYTES) {
      this.importReportResult = null;
      this.importNote = t('sky.import.tooBig', { mb: num(MAX_IMPORT_BYTES / 1024 / 1024) });
      this.host.refresh();
      return;
    }
    const result = readElementFile(await file.text());
    this.importReportResult = result;
    if (!result.sets.length) {
      this.importNote = t('sky.import.empty', { file: file.name });
      this.host.refresh();
      return;
    }
    this.imported = { file: file.name, result };
    this.importCount++;
    this.importNote = t('sky.import.read', { n: num(result.sets.length), file: file.name, format: (result.format ?? '').toUpperCase() });
    this.bySource.delete('imported');
    this.setSource('imported');
  }

  /** The right panel: the picked satellite, what its element set says, and where the data are from. */
  facts(): HTMLElement {
    const box = el('div', 'pg-sky-facts');
    this.live = {};
    const st = this.status;
    if (st.state === 'ready' && this.source !== 'imported') {
      const set = st.set;
      const from = set.from === 'snapshot' ? t('data.from.snapshot')
        : set.fetched ? t('data.from.onlineKept', { source: set.source.name, date: utc(set.fetched) }) : t('data.from.online', { source: set.source.name });
      box.append(el('p', 'pg-note', `${t('sky.asOf', { date: utc(set.asOf) })} · ${from}`));
      if (set.fallback) box.append(el('p', 'pg-note warn', t('data.fallback', { reason: set.fallback })));
      if (set.partial) box.append(el('p', 'pg-note warn', t('data.partial', { parts: set.partial.parts.map((id) => t(SOURCE_KEY[id as SkySourceId])).join(', '), reason: set.partial.reason })));
    }
    const o = this.selected;
    box.append(el('h2', 'pg-facts-title', o ? (o.el.name ?? t('sky.unnamed')) : t('sky.facts')));
    if (!o) { box.append(el('p', 'pg-note', t('sky.pick'))); return box; }

    const engineer = this.host.level() === 'engineer';
    const f = skyFacts(o);
    const dl = el('dl', 'pg-dl');
    const row = (k: string, v: string): HTMLElement => { const dd = el('dd', undefined, v); dl.append(el('dt', undefined, k), dd); return dd; };
    const now = skyState(o, this.jd);
    // A16: whether SGP4 can place it now, kept up to date by updateLive() as the clock runs
    this.shownFailed = now.error !== 0;
    this.live.state = el('p', 'pg-warn pg-sky-state');
    this.live.state.setAttribute('role', 'status');
    this.live.state.hidden = true;
    box.append(this.live.state);
    row(t('sky.f.norad'), String(o.el.satnum));
    if (o.el.intldesg) row(t('sky.f.cospar'), cospar(o.el.intldesg));
    row(t('sky.f.epoch'), utc(new Date((o.el.jdEpoch + o.el.jdEpochFrac - 2440587.5) * 86400e3).toISOString()));
    this.live.age = row(t('sky.f.age'), '');
    // R04: how far off it may be, as an estimate
    this.live.error = row(t('unc.row'), '');
    this.live.alt = row(t('pg.f.altNow'), '');
    this.live.speed = row(t('pg.f.speedNow'), '');
    this.live.latlon = row(t('pg.f.latlon'), '');
    row(t('pg.f.period'), span(f.period));
    row(t('sky.f.meanApsides'), `${num(f.perigeeAlt / 1000)} × ${num(f.apogeeAlt / 1000)} ${t('u.km')}`);
    row(t('sky.f.incl'), `${num(f.inclination * RAD, 2)}°`);
    row(t('sky.f.theory'), t(f.deepSpace ? 'sky.theory.sdp4' : 'sky.theory.sgp4'));
    if (engineer) {
      const e = o.el;
      row(t('sky.f.n'), `${num(e.noKozai * 1440 / (2 * Math.PI), 8)} ${t('sky.unit.revDay')}`);
      row(t('pg.e'), num(e.ecco, 7));
      row(t('pg.raan'), `${num(e.nodeo * RAD, 4)}°`);
      row(t('pg.argp'), `${num(e.argpo * RAD, 4)}°`);
      row(t('pg.m0'), `${num(e.mo * RAD, 4)}°`);
      row(t('sky.f.bstar'), e.bstar === 0 ? '0' : e.bstar.toExponential(4));
      row(t('sky.f.elnum'), String(e.elnum));
      row(t('sky.f.revnum'), String(e.revnum));
      this.live.teme = row(t('sky.f.teme'), '');
    }
    box.append(dl);
    box.append(this.uncertaintyBlock(o));
    if (now.error === 0) box.append(this.approachesBlock(o));
    // M03: a low orbit's re-entry
    if (now.error === 0 && !f.deepSpace && f.perigeeAlt < REENTRY_BELOW) box.append(this.reentryBlock(o));
    const thai = THAI_SATELLITES.find((s) => s.norad === o.el.satnum);
    if (thai) box.append(el('p', 'pg-note', t(thai.aboutKey)));
    if (now.error === 0) box.append(this.passesSection(o));
    if (now.error === 0) {
      const orbit = skyOrbit(o, this.jd);
      if (orbit) {
        const go = button('watch-btn', t('sky.toPlayground'), () => this.host.toPlayground(orbit, o.el.name ?? String(o.el.satnum)));
        box.append(go, el('p', 'pg-note', t('sky.toPlayground.note')));
      }
    }
    this.updateLive();
    return box;
  }

  // ─── uncertainty (R04) ────────────────────────────────────────────────────

  /**
   * The estimate's band: ± the along-track error against the element set's
   * age, from two days before its epoch to two weeks after, the moment on
   * screen marked; and where the numbers come from.
   */
  private uncertaintyBlock(o: SkyObject): HTMLElement {
    const box = el('details', 'pg-tool pg-unc');
    box.append(el('summary', undefined, t('unc.title')));
    const NS = 'http://www.w3.org/2000/svg';
    const W = 300, H = 120, pad = { l: 34, r: 8, t: 8, b: 22 };
    const d0 = -2, d1 = 14;
    const epoch = o.el.jdEpoch + o.el.jdEpochFrac;
    const at = (d: number) => uncertaintyAt(o, epoch + d).sigma.along / 1000;
    const top = at(d1) * 1.08;
    const x = (d: number) => pad.l + ((d - d0) / (d1 - d0)) * (W - pad.l - pad.r);
    const y = (v: number) => pad.t + (1 - (v + top) / (2 * top)) * (H - pad.t - pad.b);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'pg-unc-chart');
    svg.setAttribute('role', 'img');
    const age = elementAge(o.el, this.jd);
    svg.setAttribute('aria-label', t('unc.chartLabel', { km: num(at(Math.max(d0, Math.min(d1, age))), 1) }));
    const node = (tag: string, attrs: Record<string, string | number>, text?: string) => {
      const n = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
      if (text !== undefined) n.textContent = text;
      svg.append(n);
      return n;
    };
    const steps = 64, up: string[] = [], down: string[] = [];
    for (let k = 0; k <= steps; k++) {
      const d = d0 + (k / steps) * (d1 - d0), v = at(d);
      up.push(`${x(d).toFixed(1)},${y(v).toFixed(1)}`);
      down.unshift(`${x(d).toFixed(1)},${y(-v).toFixed(1)}`);
    }
    node('polygon', { points: [...up, ...down].join(' '), class: 'pg-unc-band' });
    node('line', { x1: x(d0), x2: x(d1), y1: y(0), y2: y(0), class: 'pg-unc-axis' });
    node('line', { x1: x(0), x2: x(0), y1: pad.t, y2: H - pad.b, class: 'pg-unc-epoch' });
    if (age >= d0 && age <= d1) node('line', { x1: x(age), x2: x(age), y1: pad.t, y2: H - pad.b, class: 'pg-unc-now' });
    for (const d of [0, 7, 14]) node('text', { x: x(d), y: H - 6, class: 'pg-unc-tick', 'text-anchor': 'middle' }, num(d));
    node('text', { x: pad.l - 4, y: y(top / 1.08) + 4, class: 'pg-unc-tick', 'text-anchor': 'end' }, `±${num(top / 1.08, 0)}`);
    box.append(svg, el('p', 'pg-unc-axes', t('unc.axes')));
    const src = el('p', 'pg-note');
    const link = (title: string, url: string) => { const a = el('a', undefined, title); a.href = url; a.target = '_blank'; a.rel = 'noopener'; return a; };
    src.append(t('unc.lead', { growth: num(GROWTH_PER_DAY / 1000, 1) }), ' ',
      link('Flohrer, Krag & Klinkrad, AMOS 2008', 'https://amostech.com/TechnicalPapers/2008/Orbital_Debris/Flohrer.pdf'), '; ',
      link('Levit & Marshall, Adv. Space Res. 47, 2011', 'https://arxiv.org/abs/1002.2277'), '; ',
      link('Kelso, AAS 07-127, 2007', 'https://celestrak.org/publications/AAS/07-127/'), '.');
    box.append(src);
    return box;
  }

  // ─── overflights (M02) ─────────────────────────────────────────────────────

  /** What an overflight search now would be run on (A4): the group, the place, the elevation, the time, and the data. */
  overInputs(): OverInputs {
    const { lat, lon } = this.place.station;
    return { source: this.source, stationId: this.place.stationId, lat, lon, minEl: this.over.minEl, days: this.over.days, data: this.dataTag(this.source) };
  }

  /** Every pass of the group on screen over the place, from the moment on screen, a few satellites at a time. */
  async findOverflights(): Promise<void> {
    const slot = this.results.over;
    const inputs = this.overInputs();
    const from = this.jd;
    const gen = slot.start(inputs, from);
    this.shownOverflight = null;
    this.host.refresh();
    const list = await overflightsInSlices(this.objects(), this.place.station, from, from + inputs.days, inputs.minEl, (f) => {
      if (!slot.report(gen, f)) return false;
      if (this.overStatus?.isConnected) this.overStatus.textContent = t('over.running', { p: Math.round(f * 100) });
      return true;
    });
    if (!slot.current(gen)) return;
    if (list) slot.accept(gen, list); else slot.stop(gen);
    this.host.refresh();
  }

  private overflightsBlock(): HTMLElement {
    const box = el('details', 'pg-tool pg-over');
    box.open = this.over.open;
    box.addEventListener('toggle', () => { this.over.open = box.open; });
    box.append(el('summary', undefined, t('over.title', { place: this.placeLabel() })), el('p', 'pg-tool-lead', t('over.lead')));
    const slot = this.results.over;
    // A4: the last search is shown whatever the controls say now, with what it was run on, and marked when that differs
    const refresh = () => { if (slot.inputs) this.host.refresh(); };
    box.append(stationPicker(t('pass.from'), this.place, () => this.place, (next) => {
      this.place = next;
      // the heading names the place, and the passes on the right are found from it
      this.host.refresh();
    }));
    const row = el('div', 'pg-tool-row');
    const choose = (label: string, options: [number, string][], value: number, set: (v: number) => void): HTMLElement => {
      const l = el('label');
      const s = el('select');
      for (const [v, text] of options) { const opt = el('option', undefined, text); opt.value = String(v); s.append(opt); }
      s.value = String(value);
      s.addEventListener('change', () => { set(Number(s.value)); refresh(); });
      l.append(el('span', undefined, label), s);
      return l;
    };
    row.append(
      // P2.5: lower too, where a wide swath or a radar's shallow incidence reaches
      choose(t('over.minEl'), [15, 30, 45, 60, 75].map((d) => [d, `${d}°`] as [number, string]), Math.round(this.over.minEl * 180 / Math.PI), (v) => { this.over.minEl = v * Math.PI / 180; }),
      choose(t('conj.days'), [[1, t('conj.oneDay')], [3, t('life.days', { n: num(3) })]], this.over.days, (v) => { this.over.days = v; }),
    );
    box.append(row);
    const day = el('label', 'pg-check');
    const dayBox = el('input');
    dayBox.type = 'checkbox';
    dayBox.checked = this.over.daylight;
    dayBox.addEventListener('change', () => { this.over.daylight = dayBox.checked; this.host.refresh(); });
    day.append(dayBox, el('span', undefined, t('over.daylight')));
    box.append(day);
    const can = el('label', 'pg-check');
    const canBox = el('input');
    canBox.type = 'checkbox';
    canBox.checked = this.over.canOnly;
    canBox.addEventListener('change', () => { this.over.canOnly = canBox.checked; this.host.refresh(); });
    can.append(canBox, el('span', undefined, t('over.canOnly')));
    box.append(can);
    const running = slot.state === 'running';
    box.append(button('watch-btn', running ? t('over.stop') : t('over.run'), () => {
      if (slot.state === 'running') { slot.requestStop(); return; }
      void this.findOverflights();
    }));
    const status = el('p', 'pg-tool-out pg-over-status');
    status.setAttribute('role', 'status');
    this.overStatus = status;
    const ran = slot.inputs;
    if (!ran) box.append(status);
    else {
      const place = placeText(ran.stationId, ran.lat, ran.lon);
      const results = el('div', 'pg-result');
      if (running) status.textContent = t('over.running', { p: Math.round(slot.progress * 100) });
      else if (slot.state === 'stopped') status.textContent = t('conj.stopped');
      else {
        const shown = (slot.result ?? []).filter((f) => (!this.over.daylight || f.daylight) && (!this.over.canOnly || verdictOf(f)?.can === true));
        const from = `${dayName(slot.startedAt!)} ${clockTime(slot.startedAt!)}`;
        status.textContent = shown.length ? t('over.foundAt', { n: num(shown.length), place, from }) : t('over.noneAt', { place });
        if (shown.length) results.append(this.overflightList(shown));
      }
      box.append(...provenance(slot, this.overInputs(), status, results));
    }
    box.append(el('p', 'pg-note', t('over.note')), el('p', 'pg-note', t('over.sensorNote')));
    return box;
  }

  private overflightList(list: Overflight[]): HTMLElement {
    const engineer = this.host.level() === 'engineer';
    const deg = (x: number) => `${num(x * 180 / Math.PI, 0)}°`;
    const ol = el('ol', 'pg-conj-list pg-over-list');
    for (const f of list.slice(0, OVER_LIMIT)) {
      const top = f.pass.top;
      const li = el('li');
      const head = el('div', 'pg-conj-head');
      head.append(el('span', 'pg-sky-name', f.object.el.name ?? t('sky.unnamed')), el('span', 'pg-sky-num', String(f.object.el.satnum)));
      li.append(head);
      li.append(el('div', 'pg-conj-main', t('over.item', {
        time: `${dayName(top.jd)} ${clockTime(top.jd)}`, el: deg(top.el), dir: compass(top.az), off: deg(f.offNadir),
        light: t(f.daylight ? 'over.day' : 'over.night'), way: t(f.northbound ? 'over.north' : 'over.south'),
      })));
      const sensor = sensorFor(f.object.el.satnum);
      if (sensor) li.append(this.sensorLine(sensor, f, engineer));
      // P2.5: the pass on the map, with what the instrument reaches
      const shown = this.shownOverflight === f;
      li.classList.toggle('shown', shown);
      li.append(button('watch-btn link', shown ? t('over.hideMap') : t('over.showMap'), () => {
        this.shownOverflight = shown ? null : f;
        if (!shown) {
          this.jd = top.jd - 2 / 1440;
          this.stale = true;
          if (this.selectedKey !== f.object.key) this.select(f.object.key);
          this.host.showMap?.();
        }
        this.host.refreshFacts();
      }));
      if (engineer) {
        const h = Math.floor(f.solarTime), m = Math.floor((f.solarTime - h) * 60);
        li.append(el('div', 'pg-conj-more', t('over.more', {
          km: num(f.groundRange / 1000, 0), lst: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          s: num(uncertaintyAt(f.object, top.jd).timing, 1),
        })));
      }
      ol.append(li);
    }
    const box = el('div');
    box.append(ol);
    if (list.length > OVER_LIMIT) box.append(el('p', 'pg-note', t('sky.more', { n: num(list.length - OVER_LIMIT) })));
    box.append(el('p', 'pg-note', t('conj.zone', { zone: zoneName(list[0].pass.top.jd) })));
    return box;
  }

  /** What the satellite's instrument can make of the place on this pass (P2.5). */
  private sensorLine(s: Sensor, f: Overflight, engineer: boolean): HTMLElement {
    const deg = (x: number) => `${num(x * 180 / Math.PI, 0)}°`;
    const v = canImage(s, f);
    const box = el('div', `pg-sensor ${v.can === true ? 'yes' : v.can === false ? 'no' : 'unknown'}`);
    const res = s.resolution < 1 ? num(s.resolution, 2) : num(s.resolution, s.resolution < 10 ? 1 : 0);
    const what = el('span', 'pg-sensor-what', t('sensor.line', { instrument: s.instrument, kind: t(s.kind === 'sar' ? 'sensor.sar' : 'sensor.optical'), res }));
    if (engineer && s.sources[0]) {
      const a = el('a', undefined, t('sensor.source'));
      a.href = s.sources[0]; a.target = '_blank'; a.rel = 'noopener';
      what.append(' · ', a);
    }
    const [lo, hi] = s.incidence ?? [0, 0];
    const words = {
      swath: num(s.swath / 1000, s.swath < 20e3 ? 1 : 0), km: num(f.groundRange / 1000, 0), off: deg(f.offNadir), max: deg(s.lookMax ?? 0),
      inc: deg(f.incidence), lo: deg(lo), hi: deg(hi), date: s.retired ?? '',
      side: t(f.side === 'left' ? 'sensor.left' : 'sensor.right'), look: t(s.side === 'left' ? 'sensor.left' : 'sensor.right'),
    };
    box.append(what, el('span', 'pg-sensor-verdict', t(VERDICT_KEY[v.reason], words)));
    return box;
  }

  // ─── re-entry (M03) ────────────────────────────────────────────────────────

  /**
   * The Sun's activity as measured and forecast, from the space-weather dataset
   * of the data mode chosen (R05); GFZ's months alone without it. With where it
   * came from (A15), shown under the result as the catalogue's source is.
   */
  private async sun(): Promise<{ series: ReturnType<typeof measuredActivity>['series']; note: string; to: string; source: SunSource }> {
    let set: Dataset<SpaceWeather> | null = null;
    try { set = await this.host.provider().load('spaceWeather'); } catch { set = null; }
    const m = measuredActivity(await loadSolarDaily(), set?.data ?? null);
    const note = m.forecastTo ? t('reentry.sun', { measured: m.measuredTo, forecast: m.forecastTo }) : t('reentry.sunHistory', { measured: m.measuredTo });
    return {
      series: m.series, to: m.forecastTo ?? m.measuredTo, note,
      source: { note, ...(set ? { asOf: set.asOf, from: set.from, source: set.source.name, ...(set.fetched ? { fetched: set.fetched } : {}), ...(set.fallback ? { fallback: set.fallback } : {}) } : {}) },
    };
  }

  /** The object's element sets: a history read from a file has several of one satellite, which the drag can be fitted to (P2.5). */
  private setsOf(o: SkyObject): ElementSet[] {
    if (o.source !== 'imported' || !this.imported) return [o.el];
    const same = this.imported.result.sets.filter((x) => x.satnum === o.el.satnum);
    return same.length ? same : [o.el];
  }

  /** The ways the drag can be had for this object, the best first (P2.5). */
  private dragChoices(o: SkyObject): DragFrom[] {
    const sets = this.setsOf(o);
    const epochs = sets.map((x) => x.jdEpoch + x.jdEpochFrac);
    const out: DragFrom[] = [];
    if (sets.length >= 2 && Math.max(...epochs) - Math.min(...epochs) >= 1) out.push('history');
    if (o.el.ndot > 0) out.push('decay');
    out.push('size');
    return out;
  }

  /** What a re-entry prediction for `o` now would be run on (A15): the object, its element sets, where the drag comes from, the mass and size, and the data. */
  reentryInputs(o: SkyObject): ReentryInputs {
    const choices = this.dragChoices(o);
    const from = choices.includes(this.reentry.from) ? this.reentry.from : choices[0];
    // the mass and size count only when the drag comes from them
    const size = from === 'size' ? this.reentry : { mass: 0, area: 0, cd: 0 };
    return {
      object: o.key, name: o.el.name ?? String(o.el.satnum), epoch: o.el.jdEpoch + o.el.jdEpochFrac, sets: this.setsOf(o).length, from,
      mass: size.mass, area: size.area, cd: size.cd, data: this.dataTag(this.source), sw: this.host.provider().mode,
    };
  }

  /**
   * Predict `o`'s re-entry. A15: the inputs are copied before the space
   * weather is waited for, and the prediction is made from that copy: a mass
   * typed in meanwhile makes the answer stale, not wrong.
   */
  async runReentry(o: SkyObject): Promise<void> {
    this.reentryAbort?.abort();
    const abort = new AbortController();
    this.reentryAbort = abort;
    const slot = this.results.reentry;
    const gen = slot.start(this.reentryInputs(o));
    const ran = slot.inputs!;
    const sets = this.setsOf(o);
    this.host.refreshFacts();
    const { series, source } = await this.sun();
    if (!slot.current(gen)) return;
    try {
      const answer = await runReentryJob(
        { sets, from: ran.from, craft: { mass: ran.mass, area: ran.area, cd: ran.cd }, activity: series, horizonDays: 365 },
        abort.signal, (f) => {
          if (!slot.report(gen, f)) return;
          if (this.reentryStatus?.isConnected) this.reentryStatus.textContent = `${t('reentry.running')} ${Math.round(f * 100)} %`;
        });
      if (!slot.accept(gen, { reentry: answer.reentry, b: answer.b, sun: source })) return;
    } catch {
      if (!slot.current(gen)) return;
      slot.clear();
    }
    this.host.refreshFacts();
  }

  /**
   * NAPA-2 from its first element set, as a tumbling box and with B fitted to the set's decay (P2.5).
   * Public, like `caseInputs()`, only so tests/result-slot.test.ts can run it and read its freshness.
   */
  async runNapaCase(): Promise<void> {
    const slot = this.results.napaCase;
    const gen = slot.start(this.caseInputs());
    this.host.refreshFacts();
    const { series } = await this.sun();
    if (!slot.current(gen)) return;
    const el = elementsFromRecord(NAPA2.elements);
    const b = ballisticFromDecayRate(el, series);
    if (slot.accept(gen, {
      box: predictReentry(el, { mass: NAPA2.mass, area: tumblingBoxArea(NAPA2.size), cd: 2.2 }, series, 3000),
      fitted: b === null ? null : predictReentry(el, craftOfB(b), series, 3000),
      b, actual: Date.parse(`${NAPA2.decay}T12:00:00Z`) / 86400000 + 2440587.5,
    })) this.host.refreshFacts();
  }

  /** The inputs the case studies are kept with (the data mode); public only for tests/result-slot.test.ts. */
  caseInputs(): CaseInputs {
    return { sw: this.host.provider().mode };
  }

  private async runCaseStudy(): Promise<void> {
    const slot = this.results.caseStudy;
    const gen = slot.start(this.caseInputs());
    this.host.refreshFacts();
    const { series, source } = await this.sun();
    if (!slot.current(gen)) return;
    const rows = CZ5B_STAGES.map((s) => ({
      name: s.name, missionKey: s.missionKey,
      p: predictReentry(elementsFromRecord(s.elements), { mass: s.mass, area: tumblingCylinderArea(s.length, s.diameter), cd: 2.2 }, series),
      actual: Date.parse(s.reentry) / 86400000 + 2440587.5,
    }));
    if (slot.accept(gen, { rows, sun: source })) this.host.refreshFacts();
  }

  private reentryBlock(o: SkyObject): HTMLElement {
    const box = el('details', 'pg-tool pg-reentry');
    box.open = this.reentry.open;
    box.addEventListener('toggle', () => { this.reentry.open = box.open; });
    box.append(el('summary', undefined, t('reentry.title')), el('p', 'pg-tool-lead', t('reentry.lead')));
    // P2.5: the drag fitted to the object's own decay, as the agencies do, or from a mass and size given
    const choices = this.dragChoices(o);
    const from = choices.includes(this.reentry.from) ? this.reentry.from : choices[0];
    const slot = this.results.reentry;
    const mine = slot.inputs?.object === o.key ? slot : null;
    const running = mine?.state === 'running';
    const run = button('watch-btn', running ? t('reentry.stop') : t('reentry.run'), () => {
      if (slot.state === 'running' && slot.inputs?.object === o.key) { this.reentryAbort?.abort(); slot.clear(); this.host.refreshFacts(); return; }
      void this.runReentry(o);
    });
    const pick = el('label');
    const sel = el('select');
    const WORDS: Record<DragFrom, string> = {
      history: t('reentry.fromHistory', { n: num(this.setsOf(o).length) }), decay: t('reentry.fromDecay'), size: t('reentry.fromSize'),
    };
    for (const k of choices) { const opt = el('option', undefined, WORDS[k]); opt.value = k; sel.append(opt); }
    sel.value = from;
    sel.addEventListener('change', () => { this.reentry.from = sel.value as DragFrom; this.host.refreshFacts(); });
    pick.append(el('span', undefined, t('reentry.dragFrom')), sel);
    box.append(pick);
    if (from === 'size') {
      const row = el('div', 'pg-tool-row');
      // A5/A15: a box that does not hold a number above zero says so, and the prediction waits for it
      const bad = new Set<string>();
      const field = (id: string, label: string, value: number, set: (v: number) => void): HTMLElement => {
        const l = el('label');
        const i = el('input');
        i.type = 'number'; i.min = '0'; i.step = 'any'; i.value = String(value);
        const why = el('span', 'pg-warn pg-field-invalid', t('result.invalid'));
        why.hidden = true;
        i.addEventListener('input', () => {
          const v = positiveNumber(i.value);
          if (v === null) bad.add(id); else { bad.delete(id); set(v); }
          why.hidden = v !== null;
          i.setAttribute('aria-invalid', String(v === null));
          if (!running) run.disabled = bad.size > 0;
          if (mine) this.markReentry(box, o);
        });
        l.append(el('span', undefined, label), i, why);
        return l;
      };
      row.append(
        field('mass', t('life.mass'), this.reentry.mass, (v) => { this.reentry.mass = v; }),
        field('area', t('life.area'), this.reentry.area, (v) => { this.reentry.area = v; }),
        field('cd', t('life.cd'), this.reentry.cd, (v) => { this.reentry.cd = v; }),
      );
      box.append(row);
    } else box.append(el('p', 'pg-note', t(from === 'history' ? 'reentry.historyNote' : 'reentry.decayNote')));
    if (o.sat.ecco >= ECCENTRIC) box.append(el('p', 'pg-note', t('reentry.eccentric')));
    box.append(run);
    const out = el('p', 'pg-tool-out pg-reentry-status');
    out.setAttribute('role', 'status');
    this.reentryStatus = out;
    const result = el('div', 'pg-result');
    if (!mine) box.append(out);
    else {
      if (running) out.textContent = `${t('reentry.running')} ${Math.round(mine.progress * 100)} %`;
      else if (mine.result && !mine.result.reentry) out.textContent = t('reentry.noFit');
      else if (mine.result?.reentry) {
        const r = mine.result.reentry;
        if (r.jd === null) out.textContent = t('reentry.stays');
        else {
          out.textContent = t('reentry.result', {
            date: fullDate(r.jd), from: fullDate(r.window![0]), to: fullDate(r.window![1]), days: num(r.jd - r.from, 1), pct: num(WINDOW_FRACTION * 100),
          });
        }
        if (mine.result.b !== null) result.append(el('p', 'pg-note', t(mine.inputs!.from === 'size' ? 'reentry.bGiven' : 'reentry.bFitted', { b: bText(mine.result.b) })));
        result.append(...sunNotes(mine.result.sun));
      }
      const shown = el('div', 'pg-reentry-result');
      shown.append(...provenance(mine, this.reentryInputs(o), out, result));
      box.append(shown);
    }
    const note = el('p', 'pg-note');
    const link = (title: string, url: string) => { const a = el('a', undefined, title); a.href = url; a.target = '_blank'; a.rel = 'noopener'; return a; };
    note.append(t('reentry.note'), ' ', link('Klinkrad, ESA, 2013', 'https://conference.sdo.esoc.esa.int/proceedings/sdc6/paper/148/SDC6-paper148.pdf'), '.');
    box.append(note);
    box.append(this.caseStudyBlock(), this.napaCaseBlock());
    return box;
  }

  /** The re-entry result's stale mark, again, as a box is typed in (the panel is not drawn again while one is being typed in). */
  private markReentry(box: HTMLElement, o: SkyObject): void {
    const slot = this.results.reentry;
    const shown = box.querySelector('.pg-reentry-result');
    if (!shown || slot.inputs?.object !== o.key) return;
    const [out, result] = [shown.querySelector('.pg-tool-out'), shown.querySelector('.pg-result')] as HTMLElement[];
    shown.replaceChildren(...provenance(slot, this.reentryInputs(o), out, result));
  }

  /** NAPA-2: a Thai satellite's five years, predicted from its first element set two ways (P2.5). */
  private napaCaseBlock(): HTMLElement {
    const box = el('div', 'pg-reentry-case');
    box.append(el('h3', 'pg-case-title', t('reentry.napa.title')), el('p', 'pg-tool-lead', t('reentry.napa.lead')));
    const slot = this.results.napaCase;
    const fresh = slot.status(this.caseInputs());
    // run again when the data mode has changed since (its space weather may differ)
    if (slot.state !== 'running' && (!slot.result || fresh === 'stale')) box.append(button('watch-btn', t('reentry.napa.run'), () => { void this.runNapaCase(); }));
    if (slot.state === 'running') box.append(el('p', 'pg-tool-out', t('reentry.running')));
    const c = slot.result;
    if (!c) return box;
    const day = (jd: number) => dateOf(jd).toISOString().slice(0, 10);
    const err = (p: Reentry) => { const x = ((p.jd! - p.from) / (c.actual - p.from) - 1) * 100; return `${x >= 0 ? '+' : '−'}${num(Math.abs(x), 0)}`; };
    const ol = el('ol', 'pg-conj-list');
    const row = (label: string, p: Reentry | null) => {
      const li = el('li');
      li.append(el('div', 'pg-conj-head', label));
      li.append(el('div', 'pg-conj-main', p && p.jd !== null
        ? t('reentry.napa.row', { pred: day(p.jd), err: err(p), inside: t(c.actual >= p.window![0] && c.actual <= p.window![1] ? 'reentry.napa.in' : 'reentry.napa.out') })
        : t('reentry.stays')));
      ol.append(li);
    };
    row(t('reentry.napa.box', { b: bText((2.2 * tumblingBoxArea(NAPA2.size)) / NAPA2.mass) }), c.box);
    if (c.b !== null) row(t('reentry.napa.fitted', { b: bText(c.b) }), c.fitted);
    const result = el('div', 'pg-result');
    result.append(ol);
    if (fresh === 'stale') box.append(el('p', 'pg-warn pg-result-stale', t('result.staleData')));
    markFreshness(result, fresh);
    box.append(result, el('p', 'pg-tool-out', t('reentry.napa.actual', { date: NAPA2.decay, days: num(c.actual - c.box.from, 0) })), el('p', 'pg-note', t('reentry.napa.lesson')), el('p', 'pg-note', t('reentry.napa.source')));
    return box;
  }

  /** The Long March 5B core stages, each predicted from its first element set against its re-entry on record. */
  private caseStudyBlock(): HTMLElement {
    const box = el('div', 'pg-reentry-case');
    box.append(el('h3', 'pg-case-title', t('reentry.case.title')), el('p', 'pg-tool-lead', t('reentry.case.lead')));
    const slot = this.results.caseStudy;
    const fresh = slot.status(this.caseInputs());
    // run again when the data mode has changed since (its space weather may differ)
    if (slot.state !== 'running' && (!slot.result || fresh === 'stale')) box.append(button('watch-btn', t('reentry.case.run'), () => { void this.runCaseStudy(); }));
    if (slot.state === 'running') box.append(el('p', 'pg-tool-out', t('reentry.running')));
    if (!slot.result) return box;
    // to the nearest minute, as GCAT records them
    const utcTime = (jd: number) => `${new Date(Math.round((jd - 2440587.5) * 1440) * 60e3).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
    const ol = el('ol', 'pg-conj-list');
    for (const c of slot.result.rows) {
      const li = el('li');
      const head = el('div', 'pg-conj-head');
      head.append(el('span', 'pg-sky-name', c.name));
      li.append(head, el('div', 'pg-conj-more', t(c.missionKey)));
      if (c.p.jd === null) { li.append(el('div', 'pg-conj-main', t('reentry.stays'))); ol.append(li); continue; }
      const err = ((c.p.jd - c.p.from) / (c.actual - c.p.from) - 1) * 100;
      const inside = c.actual >= c.p.window![0] && c.actual <= c.p.window![1];
      const times = { from: utcTime(c.p.from), pred: utcTime(c.p.jd), actual: utcTime(c.actual) };
      // E03 6.2: the stage of Tianhe's error is the open lesson's to work out, until it is answered
      li.append(el('div', 'pg-conj-main', caseStudyErrorShown(c.name, this.lessonCase)
        ? t('reentry.case.row', { ...times, err: `${err >= 0 ? '+' : '−'}${num(Math.abs(err), 1)}` })
        : t('reentry.case.rowOpen', times)));
      li.append(el('div', 'pg-conj-more', t(inside ? 'reentry.case.inside' : 'reentry.case.outside', { from: utcTime(c.p.window![0]), to: utcTime(c.p.window![1]) })));
      ol.append(li);
    }
    const result = el('div', 'pg-result');
    result.append(ol, ...sunNotes(slot.result.sun));
    if (fresh === 'stale') box.append(el('p', 'pg-warn pg-result-stale', t('result.staleData')));
    markFreshness(result, fresh);
    box.append(result, el('p', 'pg-note', t('reentry.case.source')));
    return box;
  }

  // ─── close approaches (M01) ────────────────────────────────────────────────

  /** Every object loaded — the catalogue's groups and a file read — once each. */
  private catalogue(): SkyObject[] {
    const ids: SkySourceId[] = [...SAT_GROUPS.map((g) => g.id), ...(this.imported ? ['imported' as const] : [])];
    return ids.flatMap((id) => this.objects(id));
  }

  /** What a screening of `o` now would be run on (A14): the object and its element set, the settings, and the data of everything it is screened against. */
  screeningInputs(o: SkyObject): ScreenInputs {
    const file = this.imported ? `${this.imported.file}#${this.importCount}` : '';
    return {
      object: o.key, name: o.el.name ?? String(o.el.satnum), epoch: o.el.jdEpoch + o.el.jdEpochFrac,
      within: this.conj.within, days: this.conj.days, radius: this.conj.radius, data: this.dataTag('stations'), file,
    };
  }

  /** Screen the catalogue for approaches to the satellite picked, from the moment on screen, in a worker (P2.5). */
  private async runScreening(o: SkyObject): Promise<void> {
    this.screeningAbort?.abort();
    const abort = new AbortController();
    this.screeningAbort = abort;
    const slot = this.results.screening;
    const inputs = this.screeningInputs(o);
    const from = this.jd;
    const gen = slot.start(inputs, from);
    this.shownApproach = null;
    this.host.refreshFacts();
    let list: Conjunction[] | null = null;
    try {
      list = await runScreeningJob(o, this.catalogue().filter((x) => x !== o), from, from + inputs.days, inputs.within, inputs.radius, abort.signal, (f) => {
        if (!slot.report(gen, f)) return;
        if (this.conjStatus?.isConnected) this.conjStatus.textContent = t('conj.running', { p: Math.round(f * 100) });
      });
    } catch { list = null; }
    if (!slot.current(gen)) return;
    if (list) slot.accept(gen, list); else slot.stop(gen);
    this.host.refreshFacts();
  }

  private approachesBlock(o: SkyObject): HTMLElement {
    const box = el('details', 'pg-tool pg-conj');
    box.open = this.conj.open;
    box.addEventListener('toggle', () => { this.conj.open = box.open; });
    box.append(el('summary', undefined, t('conj.title')), el('p', 'pg-tool-lead', t('conj.lead')));
    const engineer = this.host.level() === 'engineer';
    const slot = this.results.screening;
    // another satellite's screening is not shown here; this one's is, marked when the settings or data have moved on (A14)
    const run = slot.inputs?.object === o.key ? slot : null;
    const choose = (label: string, options: [number, string][], value: number, set: (v: number) => void): HTMLElement => {
      const l = el('label');
      const s = el('select');
      for (const [v, text] of options) { const opt = el('option', undefined, text); opt.value = String(v); s.append(opt); }
      s.value = String(value);
      s.addEventListener('change', () => { set(Number(s.value)); if (run) this.host.refreshFacts(); });
      l.append(el('span', undefined, label), s);
      return l;
    };
    const row = el('div', 'pg-tool-row');
    row.append(
      choose(t('conj.within'), [1, 5, 10, 25].map((km) => [km * 1e3, `${num(km)} ${t('u.km')}`] as [number, string]), this.conj.within, (v) => { this.conj.within = v; }),
      choose(t('conj.days'), [[1, t('conj.oneDay')], [3, t('life.days', { n: num(3) })], [7, t('life.days', { n: num(7) })]], this.conj.days, (v) => { this.conj.days = v; }),
    );
    const size = el('label');
    const input = el('input');
    input.type = 'number'; input.min = '0.1'; input.max = '200'; input.step = 'any';
    input.value = String(this.conj.radius);
    input.addEventListener('change', () => {
      const v = Number(input.value);
      if (Number.isFinite(v) && v > 0 && v <= 200) { this.conj.radius = v; if (run) this.host.refreshFacts(); }
    });
    size.append(el('span', undefined, t('conj.radius')), input);
    row.append(size);
    box.append(row);
    const running = run?.state === 'running';
    box.append(button('watch-btn', running ? t('conj.stop') : t('conj.run'), () => {
      if (slot.state === 'running' && slot.inputs?.object === o.key) { this.screeningAbort?.abort(); return; }
      void this.runScreening(o);
    }));
    const status = el('p', 'pg-tool-out pg-conj-status');
    status.setAttribute('role', 'status');
    this.conjStatus = status;
    if (!run) box.append(status);
    else {
      const results = el('div', 'pg-result');
      if (running) status.textContent = t('conj.running', { p: Math.round(run.progress * 100) });
      else if (run.state === 'stopped') status.textContent = t('conj.stopped');
      else {
        const list = run.result ?? [];
        const km = num(run.inputs!.within / 1000);
        status.textContent = list.length ? t('conj.found', { n: num(list.length), km, from: `${dayName(run.startedAt!)} ${clockTime(run.startedAt!)}` }) : t('conj.none', { km });
        if (list.length) results.append(this.approachList(o, list, engineer));
      }
      box.append(...provenance(run, this.screeningInputs(o), status, results));
    }
    const note = el('p', 'pg-note');
    const link = (title: string, url: string) => { const a = el('a', undefined, title); a.href = url; a.target = '_blank'; a.rel = 'noopener'; return a; };
    note.append(t('conj.note'), ' ', link('Kelso, AAS 09-368, 2009', 'https://celestrak.org/publications/AAS/09-368/'), '.');
    box.append(note);
    if (engineer) {
      const cs = el('p', 'pg-note');
      cs.append(t('conj.case'), ' ', link('Shepperd, AMOS 2023', 'https://amostech.com/TechnicalPapers/2023/Conjunction-RPO/Shepperd.pdf'), '.');
      box.append(cs);
    }
    box.append(this.cdmBlock());
    return box;
  }

  /** P2.5: a conjunction data message from a file: the operators' own probability, from the message's covariances. */
  private cdmBlock(): HTMLElement {
    const box = el('div', 'pg-cdm');
    box.append(el('h3', 'pg-case-title', t('cdm.title')), el('p', 'pg-tool-lead', t('cdm.lead')));
    const pick = el('label', 'pg-file');
    const input = el('input');
    input.type = 'file';
    input.accept = '.cdm,.txt,.kvn,text/plain';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { this.cdm = { file: file.name, msg: null, error: t('cdm.tooBig'), radius: 10 }; this.host.refreshFacts(); return; }
      void file.text().then((text) => {
        try {
          const msg = parseCdm(text);
          this.cdm = { file: file.name, msg, error: null, radius: msg.hbr ?? this.cdm?.radius ?? 10 };
        } catch (e) {
          this.cdm = { file: file.name, msg: null, error: e instanceof Error ? e.message : String(e), radius: 10 };
        }
        this.host.refreshFacts();
      });
    });
    pick.append(el('span', undefined, t('cdm.read')), input);
    box.append(pick);
    const c = this.cdm;
    if (!c) return box;
    if (c.error || !c.msg) { box.append(el('p', 'pg-warn', t('cdm.error', { file: c.file, reason: c.error ?? '' }))); return box; }
    const m = c.msg;
    const [a, b] = m.objects;
    const name = (x: typeof a) => [x.name, x.designator].filter(Boolean).join(' · ') || x.role;
    box.append(el('p', 'pg-cdm-objects', t('cdm.objects', { a: name(a), b: name(b), from: m.originator ?? '—' })));
    // the combined radius: the message's comment, or the user's
    const size = el('label');
    const r = el('input');
    r.type = 'number'; r.min = '0.1'; r.max = '200'; r.step = 'any'; r.value = String(c.radius);
    r.addEventListener('change', () => { const v = Number(r.value); if (Number.isFinite(v) && v > 0 && v <= 200) { c.radius = v; this.host.refreshFacts(); } });
    size.append(el('span', undefined, t(m.hbr !== null ? 'cdm.radiusGiven' : 'conj.radius')), r);
    box.append(size);
    const p = cdmProbability(m, c.radius);
    const rel = Math.hypot(b.state.v.x - a.state.v.x, b.state.v.y - a.state.v.y, b.state.v.z - a.state.v.z);
    const miss = Math.hypot(b.state.r.x - a.state.r.x, b.state.r.y - a.state.r.y, b.state.r.z - a.state.r.z);
    box.append(el('p', 'pg-tool-out', t('cdm.result', {
      tca: `${dayName(m.tca)} ${clockTime(m.tca)}`, miss: num(miss, 0), p: tinyPc(p.log10) ? t('conj.pcBelow') : sci(p.log10),
      v: rel >= 1000 ? `${num(rel / 1000, 2)} ${t('u.kms')}` : `${num(rel, rel < 1 ? 3 : 1)} ${t('u.ms')}`,
    })));
    if (m.pc !== null) box.append(el('p', 'pg-note', t('cdm.theirs', { p: m.pc > 0 && !tinyPc(Math.log10(m.pc)) ? sci(Math.log10(m.pc)) : t('conj.pcBelow'), method: m.pcMethod ?? '—' })));
    const [covA, covB] = cdmCovariances(m);
    box.append(this.planeFigure(encounterPlane(a.state, covA, b.state, covB, c.radius), name(a), name(b), false));
    return box;
  }

  /** The encounter plane, drawn (P2.5); `shown`: the approach is also in the views. */
  private planeFigure(plane: ReturnType<typeof encounterPlane>, first: string, second: string, shown: boolean): HTMLElement {
    const fig = el('figure', 'pg-plane');
    const holder = el('div', 'pg-plane-svg');
    holder.innerHTML = encounterPlaneSvg(plane, { first, second, scale: t('conj.planeScale') });
    const words = { miss: num(Math.hypot(plane.miss.x, plane.miss.y), 0), s1: num(plane.sigma[0], 0), s2: num(plane.sigma[1], 0), r: num(plane.radius, 1) };
    fig.append(holder, el('figcaption', 'pg-note', `${t('conj.planeNote', words)}${shown ? ` ${t('conj.planeShown')}` : ''}`));
    return fig;
  }

  private approachList(self: SkyObject, list: Conjunction[], engineer: boolean): HTMLElement {
    const ol = el('ol', 'pg-conj-list');
    for (const c of list.slice(0, CONJ_LIMIT)) {
      const a = c.approach;
      const li = el('li');
      const head = el('div', 'pg-conj-head');
      head.append(el('span', 'pg-sky-name', c.other.el.name ?? t('sky.unnamed')), el('span', 'pg-sky-num', String(c.other.el.satnum)));
      li.append(head);
      li.append(el('div', 'pg-conj-main', `${dayName(a.tca)} ${clockTime(a.tca)} · ${num(a.miss / 1000, 2)} ${t('u.km')} · ${tinyPc(c.probability.log10) ? t('conj.pcTiny') : t('conj.pc', { p: sci(c.probability.log10) })}`));
      if (engineer) {
        const m = (x: number) => `${num(x, 0)} ${t('u.m')}`;
        li.append(el('div', 'pg-conj-more', t('conj.more', {
          r: m(a.rtn.radial), tr: m(a.rtn.along), n: m(a.rtn.cross), v: num(a.speed / 1000, 1),
          s1: num(Math.hypot(c.sigma.self.radial, c.sigma.self.along, c.sigma.self.cross) / 1000, 1),
          s2: num(Math.hypot(c.sigma.other.radial, c.sigma.other.along, c.sigma.other.cross) / 1000, 1),
        })));
      }
      // P2.5: shown in the views, at its moment, with its encounter plane
      const shown = this.shownApproach === c;
      li.classList.toggle('shown', shown);
      li.append(button('watch-btn link', shown ? t('conj.hide') : t('conj.show'), () => {
        this.shownApproach = shown ? null : c;
        if (!shown) { this.jd = a.tca - 5 / 1440; this.stale = true; }
        this.host.refreshFacts();
      }));
      if (shown) {
        const diag = (sg: { radial: number; along: number; cross: number }): Mat3 => [[sg.radial ** 2, 0, 0], [0, sg.along ** 2, 0], [0, 0, sg.cross ** 2]];
        const plane = encounterPlane(a.a, rtnToFrame(diag(c.sigma.self), rtnAxes(a.a)), a.b, rtnToFrame(diag(c.sigma.other), rtnAxes(a.b)), this.conj.radius);
        li.append(this.planeFigure(plane, self.el.name ?? String(self.el.satnum), c.other.el.name ?? String(c.other.el.satnum), true));
      }
      ol.append(li);
    }
    const box = el('div');
    box.append(ol);
    if (list.length > CONJ_LIMIT) box.append(el('p', 'pg-note', t('sky.more', { n: num(list.length - CONJ_LIMIT) })));
    box.append(el('p', 'pg-note', t('conj.zone', { zone: zoneName(list[0].approach.tca) })));
    return box;
  }

  // ─── worksheets from real cases (P2.5) ──────────────────────────────────────

  private caseChoice: CaseId = 'iridium';
  private casesOpen = false;

  /** A sheet and its answer key for a case from the record, in the language on screen. */
  private caseSheetsBlock(): HTMLElement {
    const box = el('details', 'pg-tool pg-cases');
    box.open = this.casesOpen;
    box.addEventListener('toggle', () => { this.casesOpen = box.open; });
    box.append(el('summary', undefined, t('cases.title')), el('p', 'pg-tool-lead', t('cases.lead')));
    const pick = el('label');
    const sel = el('select');
    const NAME: Record<CaseId, string> = { iridium: t('cases.iridium'), cz5b: t('cases.cz5b'), theos2: t('cases.theos2') };
    for (const id of CASE_IDS) { const o = el('option', undefined, NAME[id]); o.value = id; sel.append(o); }
    sel.value = this.caseChoice;
    sel.addEventListener('change', () => { this.caseChoice = sel.value as CaseId; this.host.refresh(); });
    pick.append(el('span', undefined, t('cases.pick')), sel);
    const out = el('p', 'pg-note');
    out.setAttribute('role', 'status');
    const make = async (key: boolean): Promise<void> => {
      // A different case may be selected while its input data are loading.
      const id = this.caseChoice;
      const source = await this.caseInput();
      // Build and name the file in the same, current language synchronously.
      const lang = getLang();
      const sheet = caseWorksheet(id, { ...source, lang, generatedAt: new Date() });
      if (!sheet) { out.textContent = t('cases.noData'); return; }
      const html = key ? answerKeyHtml([sheet]) : worksheetsHtml([sheet]);
      downloadBlob(new Blob([html], { type: 'text/html' }), `orbitlab-case-${id}${key ? '-key' : ''}-${lang}.html`);
      out.textContent = t('cases.done');
    };
    const row = el('div', 'pg-tool-row');
    const keyBtn = button('watch-btn', t('cases.key'), () => { void make(true); });
    // E03 track 6: the case's own lesson is open and not yet answered
    const keyOpen = caseAnswersShown(this.lessonCase, this.caseChoice);
    keyBtn.disabled = !keyOpen;
    row.append(button('watch-btn', t('cases.sheet'), () => { void make(false); }), keyBtn);
    box.append(pick, row, out);
    if (!keyOpen) box.append(el('p', 'pg-note', t('cases.keyLater')));
    box.append(el('p', 'pg-note', t('cases.note')));
    return box;
  }

  // ─── the Watch tour (P2.5) ─────────────────────────────────────────────────

  /** the satellite a tour step wants picked, by catalogue number, until the catalogue is in (null: none; undefined: nothing waiting) */
  private tourPick: number | null | undefined = undefined;

  /** The Watch tour (src/orbit/sky-tour.ts): a group on screen and, in it, a satellite by its catalogue number. */
  showForTour(source: SkySourceId, satnum?: number): void {
    this.load();
    this.source = source;
    this.query = '';
    this.stale = true;
    this.framedKey = null;
    this.selectedKey = null;
    this.shownApproach = null;
    this.shownOverflight = null;
    this.tourPick = satnum ?? null;
    this.pickForTour();
  }

  private pickForTour(): void {
    if (this.tourPick === undefined) return;
    const objs = this.objects();
    if (!objs.length) return;
    const pick = this.tourPick;
    this.tourPick = undefined;
    this.selectedKey = pick === null ? null : objs.find((o) => o.el.satnum === pick)?.key ?? null;
    this.host.refresh();
  }

  /** The tour card's readouts: the picked satellite's height and speed now, and its period; null with none picked. */
  liveNow(): { alt: number; speed: number; period: number } | null {
    const o = this.selected;
    if (!o) return null;
    const s = skyState(o, this.jd);
    return s.error === 0 ? { alt: s.alt, speed: Math.hypot(s.v.x, s.v.y, s.v.z), period: skyFacts(o).period } : null;
  }

  /** What a tour step's card adds: the next passes over the place, or the Long March 5B stages' re-entries. */
  tourExtra(show: 'passes' | 'reentryCase'): HTMLElement | null {
    const box = el('div', 'pg-tour-extra');
    if (show === 'reentryCase') {
      const ul = el('ul', 'pg-tour-list');
      for (const s of CZ5B_STAGES) ul.append(el('li', undefined, t('skytour.reentry.row', { name: s.name, date: s.reentry.slice(0, 10) })));
      box.append(ul, el('p', 'pg-note', t('reentry.case.source')));
      return box;
    }
    const o = this.selected;
    if (!o) return null;
    const list = this.passList(o).slice(0, 3);
    box.append(el('h3', 'pg-tour-extra-title', t('pass.title', { place: this.placeLabel() })));
    if (!list.length) { box.append(el('p', 'pg-note', t('pass.none', { el: `${num(this.minEl * 180 / Math.PI, 0)}°` }))); return box; }
    const ul = el('ul', 'pg-tour-list');
    for (const p of list) {
      ul.append(el('li', p.visible ? 'visible' : undefined, t('skytour.passRow', {
        time: `${dayName(p.top.jd)} ${clockTime(p.top.jd)}`, el: `${num(apparentElevation(p.top.el) * 180 / Math.PI, 0)}°`, dir: compass(p.top.az),
        seen: visibility(p, o, this.place),
      })));
    }
    box.append(ul, el('p', 'pg-note', t('conj.zone', { zone: zoneName(list[0].top.jd) })));
    return box;
  }

  // ─── passes (R03) ─────────────────────────────────────────────────────────

  /** What the passes of `o` now are found from: the object and its element set, the place, the lowest elevation, and the data (A14). */
  passInputs(o: SkyObject): PassInputs {
    const { lat, lon } = this.place.station;
    return { object: o.key, epoch: o.el.jdEpoch + o.el.jdEpochFrac, lat, lon, minEl: this.minEl, data: this.dataTag(this.source) };
  }

  /**
   * The passes of the next three days from the moment on screen, found again
   * when anything they were found from changes — the place, the elevation, the
   * satellite, its element set (A14) — or the first pass is over. A light job:
   * never shown stale, found again instead.
   */
  private passList(o: SkyObject): Pass[] {
    const slot = this.results.passes;
    const inputs = this.passInputs(o);
    const kept = slot.result;
    if (kept && slot.status(inputs) === 'fresh' && this.jd >= slot.startedAt! && this.jd < kept.until) return kept.list;
    const gen = slot.start(inputs, this.jd);
    // P2.5: as seen, the air's refraction included
    const list = findPasses(o, this.place.station, this.jd, this.jd + 3, this.minEl, { refraction: true }).slice(0, PASS_LIMIT);
    // the list is good until its first pass is over (or, with none, for a day)
    const first = list[0];
    const until = first ? (first.set?.jd ?? this.jd + 3) : this.jd + 1;
    slot.accept(gen, { list, until });
    return list;
  }

  /** The place's name, or its coordinates when they were typed in. */
  private placeLabel(): string {
    return placeText(this.place.stationId, this.place.station.lat, this.place.station.lon);
  }

  private passesSection(o: SkyObject): HTMLElement {
    const box = el('section', 'pg-passes');
    box.append(el('h2', 'pg-facts-title', t('pass.title', { place: this.placeLabel() })));
    box.append(stationPicker(t('pass.from'), this.place, () => this.place, (next) => {
      const toggled = (next.stationId === 'custom') !== (this.place.stationId === 'custom');
      this.place = next;
      if (toggled) this.host.refreshFacts(); else this.refreshPasses(box, o);
    }));
    const mins = el('label', 'pg-preset');
    mins.append(el('span', undefined, t('pass.minEl')));
    const msel = el('select');
    for (const d of [0, 10, 20, 30]) { const opt = el('option', undefined, `${d}°`); opt.value = String(d); msel.append(opt); }
    msel.value = String(Math.round(this.minEl * 180 / Math.PI));
    msel.addEventListener('change', () => { this.minEl = Number(msel.value) * Math.PI / 180; this.refreshPasses(box, o); });
    mins.append(msel);
    box.append(mins);
    box.append(this.passesTable(o));
    return box;
  }

  private refreshPasses(box: HTMLElement, o: SkyObject): void {
    box.querySelector('.pg-pass-results')?.replaceWith(this.passesTable(o));
    box.querySelector('.pg-facts-title')!.textContent = t('pass.title', { place: this.placeLabel() });
  }

  private passesTable(o: SkyObject): HTMLElement {
    const box = el('div', 'pg-pass-results');
    const list = this.passList(o);
    const engineer = this.host.level() === 'engineer';
    const deg = (x: number) => `${num(x * 180 / Math.PI, 0)}°`;
    if (!list.length) { box.append(el('p', 'pg-note', t('pass.none', { el: deg(this.minEl) }))); return box; }
    if (list.length === 1 && !list[0].rise && !list[0].set) {
      const top = list[0].top;
      box.append(el('p', 'pg-note', t('pass.always', { el: deg(apparentElevation(top.el)), dir: compass(top.az) })));
      return box;
    }
    this.live.next = el('p', 'pg-pass-next');
    box.append(this.live.next);
    const table = el('table', 'pg-pass-table');
    const head = el('tr');
    for (const k of ['pass.rise', 'pass.top', 'pass.set']) head.append(el('th', undefined, t(k)));
    table.append(el('thead'), el('tbody'));
    table.tHead!.append(head);
    const cell = (l: Look | null, showEl: boolean): HTMLElement => {
      const td = el('td');
      if (!l) { td.textContent = '—'; return td; }
      td.append(el('span', 'pg-pass-time', clockTime(l.jd)));
      const where = showEl ? `${deg(apparentElevation(l.el))} ${compass(l.az)}` : compass(l.az);
      td.append(el('span', 'pg-pass-where', engineer ? `${where} · ${num(l.az * 180 / Math.PI, 0)}°` : where));
      return td;
    };
    for (const p of list) {
      const day = el('tr', 'pg-pass-day');
      const dayCell = el('td', undefined, dayName((p.rise ?? p.top).jd));
      dayCell.colSpan = 3;
      day.append(dayCell);
      const row = el('tr');
      row.append(cell(p.rise, false), cell(p.top, true), cell(p.set, false));
      const seen = el('tr', 'pg-pass-seen');
      let seenText = visibility(p, o, this.place);
      // P2.5: how bright, for a satellite with a standard magnitude
      const standard = this.magnitudes?.[String(o.el.satnum)];
      const bright = standard !== undefined ? brightest(o, this.place.station, p, standard) : null;
      if (bright) seenText += ` · ${t('pass.bright', { mag: num(bright.magnitude, 1) })}`;
      // R04, Engineer: how early or late the pass may come, from the set's age at that time
      const seenCell = el('td', undefined, engineer ? `${seenText} · ${t('unc.passTiming', { s: num(uncertaintyAt(o, p.top.jd).timing, 1) })}` : seenText);
      seenCell.colSpan = 3;
      seen.classList.toggle('visible', !!p.visible);
      seen.append(seenCell);
      table.tBodies[0].append(day, row, seen);
    }
    box.append(table, el('p', 'pg-note', t('pass.note', { zone: zoneName(this.jd) })));
    return box;
  }

  /** The readouts that move with the satellite. */
  updateLive(): void {
    const o = this.selected, L = this.live;
    if (!o) return;
    const s = skyState(o, this.jd);
    // A16: SGP4 has started or stopped failing since the facts were drawn: what they offer depends on it
    if ((s.error !== 0) !== this.shownFailed) { this.host.refreshFacts(); return; }
    // R03: the first pass is over: the list moves on
    const passes = this.results.passes.result;
    if (passes && this.jd >= passes.until && L.next) { this.host.refreshFacts(); return; }
    if (L.next && passes?.list.length) {
      const p = passes.list[0];
      const start = p.rise?.jd ?? this.jd;
      if (this.jd < start) L.next.textContent = t('pass.next', { span: span((start - this.jd) * 86400) });
      else {
        const look = lookFrom(o, this.place.station, this.jd);
        L.next.textContent = look ? t('pass.upNow', { el: `${num(apparentElevation(look.el) * 180 / Math.PI, 0)}°`, dir: compass(look.az) }) : '';
      }
    }
    const age = elementAge(o.el, this.jd) * 86400;
    if (L.age) {
      L.age.textContent = age >= 0 ? span(age) : t('sky.ageBefore', { age: span(-age) });
      L.age.classList.toggle('warn', Math.abs(age) > 7 * 86400);
    }
    if (L.error) {
      const u = uncertaintyAt(o, this.jd);
      L.error.textContent = t('unc.value', { km: num(u.total / 1000, u.total < 10e3 ? 1 : 0), s: num(u.timing, u.timing < 10 ? 1 : 0) });
    }
    // A16: no position at this moment: every readout of it says so, not the last one it had
    if (L.state) {
      L.state.hidden = s.error === 0;
      L.state.textContent = s.error === 0 ? '' : `${t('sky.error', { why: t(ERROR_KEY[s.error]) })} ${t('sky.unavailable')}`;
    }
    if (s.error !== 0) {
      for (const cell of [L.alt, L.speed, L.latlon, L.teme]) if (cell) cell.textContent = '—';
      return;
    }
    if (L.alt) L.alt.textContent = `${num(s.alt / 1000)} ${t('u.km')}`;
    if (L.speed) L.speed.textContent = `${num(Math.hypot(s.v.x, s.v.y, s.v.z) / 1000, 3)} ${t('u.kms')}`;
    if (L.latlon) L.latlon.textContent = `${num(Math.abs(s.lat * RAD), 2)}° ${s.lat >= 0 ? 'N' : 'S'} · ${num(Math.abs(s.lon * RAD), 2)}° ${s.lon >= 0 ? 'E' : 'W'}`;
    if (L.teme) L.teme.textContent = `${[s.r.x, s.r.y, s.r.z].map((c) => num(c / 1000, 1)).join(', ')} ${t('u.km')}; ${[s.v.x, s.v.y, s.v.z].map((c) => num(c / 1000, 3)).join(', ')} ${t('u.kms')}`;
  }

  /** The clock's words: the date and time on screen, UTC, and whether it is now. */
  clock(warp: number): { time: string; live: boolean } {
    const d = new Date((this.jd - 2440587.5) * 86400e3);
    const live = warp === 1 && Math.abs(this.jd - julianDate(new Date())) * 86400 < 5;
    return { time: t('pg.utc', { date: d.toLocaleString(getLang(), { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) }), live };
  }
}

// ─── results and what they were found from (audit 2026-09-27 A4, A14, A15) ────

/** The data a result rests on: the catalogue as loaded (its source, its newest reading, when it was fetched), or a file read. */
type DataTag = { from: string; asOf: string; fetched: string };
type PassInputs = { object: string; epoch: number; lat: number; lon: number; minEl: number; data: DataTag };
type OverInputs = { source: SkySourceId; stationId: string; lat: number; lon: number; minEl: number; days: number; data: DataTag };
type ScreenInputs = { object: string; name: string; epoch: number; within: number; days: number; radius: number; data: DataTag; file: string };
type ReentryInputs = { object: string; name: string; epoch: number; sets: number; from: DragFrom; mass: number; area: number; cd: number; data: DataTag; sw: string };
/** Where a re-entry's drag came from, in words (P2.5). */
const DRAG_KEY: Record<DragFrom, string> = { history: 'reentry.fromHistory', decay: 'reentry.fromDecay', size: 'reentry.fromSize' };
type CaseInputs = { sw: string };
/** Where a prediction's space weather came from (A15): the words for the activity used, and the dataset's date, source and any fallback. */
type SunSource = { note: string; asOf?: string; from?: 'snapshot' | 'online'; source?: string; fetched?: string; fallback?: string };

/** A place by its station, or by its coordinates when they were typed in. */
function placeText(stationId: string, lat: number, lon: number): string {
  if (stationId !== 'custom') return placeName({ stationId, station: { lat, lon } } as StationChoice);
  return `${num(Math.abs(lat * 180 / Math.PI), 4)}° ${lat >= 0 ? 'N' : 'S'}, ${num(Math.abs(lon * 180 / Math.PI), 4)}° ${lon >= 0 ? 'E' : 'W'}`;
}
const daysText = (days: number): string => (days === 1 ? t('conj.oneDay') : t('life.days', { n: num(days) }));
const dateText = (iso: string): string => new Date(iso).toLocaleDateString(getLang(), { dateStyle: 'medium', timeZone: 'UTC' });
function dataText(d: DataTag): string {
  if (d.from === 'file') return t('result.file', { file: d.asOf });
  return d.asOf ? t('result.data', { date: dateText(d.asOf) }) : '';
}
const epochText = (jd: number): string => t('result.epoch', { date: dateText(dateOf(jd).toISOString()) });

/** A result's parts marked as for the inputs on screen or not: a stale one is dimmed (no stylesheet of its own: A4). */
function markFreshness(node: HTMLElement, fresh: Freshness): void {
  node.dataset.fresh = fresh;
  node.style.opacity = fresh === 'stale' ? '0.55' : '';
}

/**
 * A result with what it was found from (A4, A14, A15): a warning first when the
 * controls or the data have moved on since, then the inputs in words, then the
 * result's parts, dimmed when stale.
 */
function provenance<I extends SlotInputs>(slot: ResultSlot<I, unknown>, current: I, ...parts: HTMLElement[]): HTMLElement[] {
  const fresh = slot.status(current);
  const out: HTMLElement[] = [];
  if (fresh === 'stale') {
    const onlyData = slot.changed(current).every((k) => k === 'data' || k === 'epoch' || k === 'file' || k === 'sw');
    const warn = el('p', 'pg-warn pg-result-stale', t(slot.state === 'running' ? 'result.staleRunning' : onlyData ? 'result.staleData' : 'result.stale'));
    warn.setAttribute('role', 'status');
    out.push(warn);
  }
  out.push(el('p', 'pg-note pg-result-from', t(slot.state === 'running' ? 'result.runningFrom' : 'result.from', { inputs: slot.describe() })));
  for (const p of parts) markFreshness(p, fresh);
  return [...out, ...parts];
}

/** Under a re-entry prediction: the Sun's activity used, and where the space weather came from, as the catalogue's source is said (A15). */
function sunNotes(sun: SunSource): HTMLElement[] {
  const out = [el('p', 'pg-note', sun.note)];
  if (sun.asOf) {
    const from = sun.from === 'snapshot' ? t('data.from.snapshot')
      : sun.fetched ? t('data.from.onlineKept', { source: sun.source ?? '', date: utc(sun.fetched) }) : t('data.from.online', { source: sun.source ?? '' });
    out.push(el('p', 'pg-note', `${t('result.sw', { date: utc(sun.asOf) })} · ${from}`));
  }
  if (sun.fallback) out.push(el('p', 'pg-note warn', t('data.fallback', { reason: sun.fallback })));
  return out;
}

/** How many of the next three days' passes are listed. */
const PASS_LIMIT = 12;
/** How many close approaches are listed, nearest first. */
const CONJ_LIMIT = 20;
/** How many overflights are listed, soonest first. */
const OVER_LIMIT = 40;
/** What each verdict on an instrument says (P2.5). */
const VERDICT_KEY: Record<ImagingVerdict['reason'], string> = {
  swath: 'sensor.swath', agile: 'sensor.agile', sar: 'sensor.sarYes', retired: 'sensor.retired', dark: 'sensor.dark',
  outsideSwath: 'sensor.outsideSwath', tooFarOff: 'sensor.tooFarOff', incidence: 'sensor.incidence', wrongSide: 'sensor.wrongSide', noLimit: 'sensor.noLimit',
};
/** The verdict on an overflight's instrument, where its figures are published. */
const verdictOf = (f: Overflight): ImagingVerdict | null => { const s = sensorFor(f.object.el.satnum); return s ? canImage(s, f) : null; };
/** THEOS-2's catalogue number: its element set is the THEOS-2 case's data (P2.5). */
const THEOS2_NORAD = 58016;

const SUPERSCRIPT: Record<string, string> = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
/** A probability from its logarithm, as 2.7 × 10⁻⁵¹, however small. */
export function sci(log10: number): string {
  if (log10 >= -2) return num(10 ** log10, 3);
  let e = Math.floor(log10), m = 10 ** (log10 - e);
  if (m >= 9.95) { m = 1; e += 1; }
  return `${num(m, 1)} × 10${String(e).split('').map((ch) => SUPERSCRIPT[ch]).join('')}`;
}

/**
 * Below this a probability of collision is shown as "below 10⁻¹⁰" (P2.5):
 * it comes from a Gaussian's tail many standard deviations out, and the real
 * errors of an element set are not Gaussian that far out, so 9 × 10⁻⁶¹⁸ would
 * be a precision the numbers do not have.
 */
const PC_FLOOR = -10;
const tinyPc = (log10: number): boolean => log10 < PC_FLOOR;

const dateOf = (jd: number): Date => new Date((jd - 2440587.5) * 86400e3);
/** A pass's time on the device's clock: 19:42:05. */
const clockTime = (jd: number): string => dateOf(jd).toLocaleTimeString(getLang(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const dayName = (jd: number): string => dateOf(jd).toLocaleDateString(getLang(), { weekday: 'long', day: 'numeric', month: 'long' });
/** A date months away, with its year, on the device's clock. */
/** A ballistic coefficient, m²/kg, to three figures. */
const bText = (b: number): string => `${num(b, b < 0.01 ? 4 : 3)} ${t('u.m2kg')}`;
const fullDate = (jd: number): string => dateOf(jd).toLocaleString(getLang(), { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
/** The device's time zone, as the date says it: GMT+7, UTC. */
function zoneName(jd: number): string {
  const part = new Intl.DateTimeFormat(getLang(), { timeZoneName: 'short' }).formatToParts(dateOf(jd)).find((x) => x.type === 'timeZoneName');
  return part?.value ?? 'UTC';
}

/** Whether a pass can be seen, and when; or why not. */
function visibility(p: Pass, o: SkyObject, place: StationChoice): string {
  if (p.visible) return t('pass.visible', { from: clockTime(p.visible.from), to: clockTime(p.visible.to) });
  // a high orbit's pass, half a day or more: too far to see
  if (p.rise && p.set && p.set.jd - p.rise.jd >= 0.5) return t('pass.faint');
  // not seen: the sky was light, or the satellite was in the Earth's shadow
  const mid = lookFrom(o, place.station, p.top.jd);
  return mid && mid.sunEl >= DARK_SKY ? t('pass.day') : t('pass.shadow');
}

/** "98067A" as the catalogue writes it: "1998-067A". */
function cospar(intldesg: string): string {
  const m = /^(\d{2})(\d{3})([A-Z]*)$/.exec(intldesg);
  if (!m) return intldesg;
  return `${Number(m[1]) < 57 ? '20' : '19'}${m[1]}-${m[2]}${m[3]}`;
}

function utc(iso: string): string {
  return `${new Date(iso).toLocaleString(getLang(), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** What could not be read of an element set, in words. */
export function problemText(p: OmmProblem): string {
  switch (p.kind) {
    case 'missing': return t('sky.problem.missing', { field: p.field });
    case 'value': return t('sky.problem.value', { field: p.field });
    case 'theory': return t('sky.problem.theory', { theory: p.theory });
    case 'checksum': return t('sky.problem.checksum', { line: p.line });
    case 'mismatch': return t('sky.problem.mismatch');
    default: return t('sky.problem.field', { line: p.kind === 'line1' ? 1 : 2, field: t(FIELD_KEY[p.field]) });
  }
}
