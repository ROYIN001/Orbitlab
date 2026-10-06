import * as THREE from 'three';
import { initLang, setLang, getLang, t, applyStatic, type Lang } from './i18n';
import { registerServiceWorker } from './pwa/register';
import { downloadFlightReport } from './ui/report';
import { LaunchAudio } from './audio/launch-audio';
import { TwilightPlume } from './render/twilight-plume';
import { LifetimeDialog } from './ui/lifetime';
import { handoffAvailable, handoffFromFlight, type OrbitHandoff } from './orbit/handoff';
import { SoundtrackPlayer, soundtrackFor } from './audio/soundtrack';
import { SoundtrackPanel } from './ui/soundtrack-panel';
import { ComparePanel } from './ui/compare';
import { REFERENCE_PATH_POINTS, alignTrajectory, referenceFromFlight, type ReferenceFlight } from './replay/reference';
import { assessMissionResult } from './ui/result-content';
import { enableChartExport } from './ui/chart-export';
import { MISSION_PARAM, decodeMissionParam, loadStoredMission, missionDocument, parseMissionDocument, saveStoredMission } from './config/mission-file';
import { flownMission } from './lessons/progress';
import { WorkDialog } from './ui/workspace-dialog';
import { AppProfiles } from './ui/profiles/app-profiles';
import { initializeWorkspace, workspaceStorage } from './workspace/session';
import { SceneManager, loadEarthTextures, type EarthTextures } from './render/scene';
import { dayFactorAt } from './render/sky';
import { RocketView } from './render/rocket';
import { DebrisView } from './render/debris';
import { TrailLine, OrbitLine } from './render/lines';
import { LaunchPadView } from './render/launchpad';
import { RecoverySceneryView } from './render/recovery';
import { CameraController, type CameraMode, type CamPhase } from './render/cameras';
import { CameraPolicy } from './render/camera-policy';
import { missionStage, previewsChange, setupCollapsed, type MissionStage } from './ui/flight-lifecycle';
import { MISSION_SOURCE_KEY, missionSource } from './ui/mission-source';
import { FIRST_LAUNCH, quickstartMission } from './ui/quickstart';
import { MISSION_STEPS, MISSION_STEP_KEY, missionSteps, stepActionable, type MissionStep } from './ui/mission-steps';
import { resultSuggestion, type ResultSettingContext, type ResultSuggestion } from './ui/result-actions';
import { parseDesignRef, refFlies, type DesignRef } from './design/design-ref';
import { designRefSignature, designRefText } from './ui/design-ref-text';
import type { ResultCause } from './ui/result-content';
import { orbitClassOf, ratedPayload } from './config/verdict-core';
import { launchWindows } from './physics/mission';
import { siteById } from './data/sites';
import { SetupPanel } from './ui/panel';
import { HelpGuide } from './ui/help';
import { ExploreDebrief } from './ui/explore-debrief';
import { MissionResult } from './ui/mission-result';
import { FlownPanel } from './ui/flown-view';
import { RigidControls } from './ui/rigid-controls';
import { LoopInspector } from './ui/loop-inspector';
import { MonteCarloWindow } from './ui/monte-carlo';
import { Hud } from './ui/hud';
import { TelemetryPanel } from './ui/telemetry';
import { OrbitalMap } from './ui/map';
import { OnboardOverlay } from './ui/onboard';
import { Timeline } from './ui/timeline';
import { Narration } from './ui/narration';
import { HomeScreen } from './ui/home';
import { HomeStage } from './ui/home-stage';
import './ui/modes.css';
import './ui/orbit/playground.css';
import { WatchView } from './ui/watch';
import {
  HOME_ROUTE, experienceForMode, hashForRoute, initialRoute, launchMode, loadRoute, route, routeFromHash, sameRoute, saveRoute,
  DEFAULT_LEVEL, type AppLevel, type AppMode, type AppRoute,
} from './ui/app-mode';
import { BuildScreen } from './ui/build/build-screen';
import { WorkspaceMission, missionSummary, startupMission } from './ui/workspace-mission';
import { loadExperience } from './ui/experience';
import { OrbitPlayground } from './ui/orbit/playground';
import { DataDialog } from './ui/data-dialog';
import { applyWebFonts } from './ui/web-fonts';
import { loadDataMode, saveDataMode, type DataMode } from './provider/data-mode';
import { CacheStorageRecent, createDataProvider, type DataProvider, type RecentCaches } from './provider/data-provider';
import { SectionNav } from './ui/section-nav';
import { FEATURED_WATCH_MISSION, historicalFor, watchMissionById, watchMissionSettings, type WatchMissionId } from './ui/watch-missions';
import { AboutDialog, CameraDialog, DEFAULT_CAMERA_PLAN, type CameraPlan, type FlightPhase } from './ui/dialogs';
import { Simulation } from './physics/simulation';
import { cloneFrame, type VisualFrame } from './physics/frame';
import { FlightRecorder, type RecordingSource } from './replay/recorder';
import { InlineSession, WorkerSession, createPhysicsWorker, type FlightSession, type SessionWorker } from './session/session';
import { ReplayPlayer } from './replay/player';
import { ExplosionEffect } from './replay/explosion';
import { ExhaustTrails, SITE_HUMIDITY } from './render/trails';
import { createFrameSimView, type FrameSimView } from './replay/simview';
import { moonState } from './physics/lunar/ephemeris';
import { APOLLO_ASCENT, APOLLO_AT_MOON, APOLLO_CM, APOLLO_LM, APOLLO_OUT } from './physics/sim/apollo';
import { buildEntryCm, buildServiceModule } from './render/apollo-cm';
import { APOLLO11 } from './data/apollo11';
import { moonBodyToEci, selenographicToEci } from './physics/lunar/orientation';
import { sunDirectionEci, julianDate, enuFrame, sampleOrbit, stateFromElements, elementsFromState } from './physics/orbital';
import { OMEGA_EARTH, R_EARTH, RAD } from './physics/constants';
import { add, normalize, cross, dot, norm, scale, addScaled, sub, v3, type Vec3 } from './physics/vec3';
import { missionVehicle } from './data/vehicles';
import { missionSatellite } from './data/satellites';
import { satelliteName } from './ui/names';
import type { MissionConfig } from './types';
import { registerMcpTools } from './mcp';
import { LessonMode } from './ui/lessons/lesson-mode';
import { getNotation, initNotation, onNotationChange } from './ui/notation';
import { FramesView } from './render/frames';
import { EscapeView } from './render/escape';
import { crewViewSize } from './render/cosmonaut';
import { drawnFrame, onDrawnSphere, onEllipsoid } from './render/datum';
import { geodeticHeight } from './physics/geodesy';
import { StationView } from './render/station';
import { apolloViewSize, buildAscentStage, buildCsm, buildDescentStage, CSM_LENGTH, LM_HEIGHT } from './render/apollo';
import { PORTS, TARGET_OFFSET, targetOffset } from './physics/rendezvous/ports';
import { SPACECRAFT } from './physics/rendezvous/profiles';
import type { RendezvousState } from './physics/sim/rendezvous';
import { RendezvousPlot } from './ui/rendezvous-plot';
import { ToruControls } from './ui/toru-controls';
import { FramesMenu, frameSymbols } from './ui/frames-menu';
import { GlowGovernor } from './render/glow-governor';
import { quatRotate } from './physics/rigid/math';
import { BUILD, appBuildId, stampDocument } from './build-info';
import { DEVELOPER, versionLabel } from './credits';
import { showStartupError } from './ui/startup-error';

/** The viewer's own choice of glow, remembered between visits. */
const GLOW_STORAGE_KEY = 'orbitlab.glow';

/** Proper rotation: rendered +Y nose to physics +X nose, no reflection. */
const MODEL_TO_BODY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
/**
 * C01: the shadow biases on the steppe under Vostok-1's sphere and Gagarin (`SceneManager.setShadowFocus`):
 * some 9 cm of depth and 3 cm along the normal, a texel of the 1024² map over 80 m, so a man's shadow
 * reaches his boots. The values are the drawing's.
 */
const VOSTOK_SHADOW_BIAS = { depth: -0.00002, normal: 0.03 };

/**
 * A stage or booster came off within the last few seconds.
 *
 * A stage only has a meaningful separation time once it is detached; testing
 * the time alone would report "staging" for the whole first seconds of every
 * flight, because every attached part reads 0 until it is jettisoned. Plain
 * loops: `some` with an arrow closure allocates twice per rendered frame.
 */
function recentSeparation(frame: VisualFrame): boolean {
  for (const st of frame.stages) {
    const sep = st.sepTime ?? -1;
    if (!st.attached && sep >= 0 && frame.t - sep < 7) return true;
  }
  for (const b of frame.boosters) {
    const bo = b.burnoutTime ?? -1;
    if (!b.attached && bo >= 0 && frame.t - bo < 9) return true;
  }
  return false;
}

/** Pick the cinematic camera framing for this instant of the flight. */
function camPhase(frame: VisualFrame): CamPhase {
  // G06: pulled back as the escape fires, then close on the crew's descent module
  if (frame.abort) return frame.t - frame.abort.t0 < 8 ? 'staging' : 'coast';
  if (!frame.liftoff) return 'pad';
  if (recentSeparation(frame)) return 'staging';
  if (frame.t < 12) return 'liftoff';
  if (frame.status === 'ascent') return 'ascent';
  if (frame.status === 'coast') return 'coast';
  return 'orbit';
}

/**
 * The narrative flight phase the camera sequence is programmed against.
 *
 * `null` for a lost vehicle: a failure is not a phase to cut to, and forcing a
 * camera change at the moment of break-up takes the user away from the one
 * thing they were watching.
 */
function flightPhase(frame: VisualFrame): FlightPhase | null {
  // G06: an abort, like a ship's return, is watched from outside
  if (frame.abort) return 'descent';
  if (!frame.liftoff || frame.status === 'prelaunch') return 'pad';
  if (frame.status === 'failed') return null;
  if (recentSeparation(frame)) return 'staging';
  if (frame.status === 'ascent') return frame.activeStageIndex > 0 ? 'upper' : 'ascent';
  if (frame.status === 'coast') return 'coast';
  if (frame.status === 'burn') return 'burn';
  // A ship flown home: the coast across the planet, then everything from the
  // entry interface to the water.
  if (frame.status === 'descent') return frame.descentPhase === 'coast' ? 'coast' : 'descent';
  if (frame.status === 'landed') return 'descent';
  // C01: Apollo's burn for the Moon from space; its transposition, docking and extraction, and all the way
  // to the Moon, from beside the stack — from space, 300,000 km out, it is a marker on a black sky
  const ap = frame.apollo;
  if (ap?.phase === 'tli') return 'burn';
  if (ap && (ap.phase === 'transposition' || ap.phase === 'docked' || APOLLO_OUT.includes(ap.phase)
    || (ap.phase === 'translunar' && ap.sequence && frame.t >= ap.sequence.panels - 20))) return 'proximity';
  // G07: close to the station, from the automatic approach on
  const rv = frame.rendezvous;
  if (rv && rv.range < NEAR_STATION && rv.phase !== 'separation' && rv.phase !== 'coast' && rv.phase !== 'burn') return 'proximity';
  return frame.payloadSeparated ? 'deployment' : 'orbit';
}

/**
 * The camera programme of the landing page and the launch viewer: the same as
 * the workspace default except that it stays outside the vehicle. The onboard
 * view draws an instrument strip where the viewer's own readouts are, and the
 * map is a chart rather than a picture.
 */
const WATCH_CAMERA_PLAN: CameraPlan = { ...DEFAULT_CAMERA_PLAN, upper: 'exterior', deployment: 'space' };

/** Mission time the viewer stays on a stage flown home after it is down, s. */
const WATCH_FOCUS_HOLD = 10;

/** C01: Vostok-1's pilot on his own (from his ejection; on the ground too), if the frame has him. */
function watchPilot(frame: VisualFrame): VisualFrame['debris'][number] | undefined {
  return frame.debris.find((d) => d.visual.kind === 'pilot' && (d.alive || d.outcome === 'landed'));
}

/** How close the instrument module or a piece of it must be for the sphere's camera to look past the sphere at it, m. */
const VOSTOK_MODULE_SHOT = 3000;
/** How far Gagarin may have gone from the sphere on his seat for the camera to look out at him, m. */
const VOSTOK_EJECTION_SHOT = 400;

/**
 * C01: what the camera on Vostok-1's sphere looks at past the sphere
 * (`CameraFocus.partner`, the drawn frame's positions): the instrument
 * module while it glows below 100 km, and the nearest of its pieces after
 * it breaks up, while they are close by; and Gagarin just out on his seat.
 * Read from the frame alone, so a replay frames the same. (Not Gagarin under
 * his canopies once the sphere is down: he is then a kilometre or two almost
 * straight above it, and no one picture holds both.)
 */
function vostokPartner(frame: VisualFrame): VisualFrame['debris'][number] | undefined {
  const a = frame.abort;
  if (!a || a.body !== 'capsule' || a.capsule !== 'vostok') return undefined;
  const away = (d: VisualFrame['debris'][number]) => norm(sub(d.r, frame.r));
  const pilot = frame.debris.find((d) => d.visual.kind === 'pilot' && d.alive);
  if (pilot && pilot.crew?.seat && away(pilot) > 3 && away(pilot) < VOSTOK_EJECTION_SHOT) return pilot;
  let best: VisualFrame['debris'][number] | undefined, nearest = VOSTOK_MODULE_SHOT;
  for (const d of frame.debris) {
    const kind = d.visual.kind;
    if (!d.alive || (kind !== 'instrumentModule' && kind !== 'imFragment')) continue;
    // (the drawn frame's heights are over the drawn sphere: render/datum.ts)
    if (kind === 'instrumentModule' && norm(d.r) - R_EARTH > 100e3) continue;
    const m = away(d);
    if (m < nearest) { nearest = m; best = d; }
  }
  return best;
}

/** G07: within this of the station the cameras frame it with the spacecraft, m. */
const NEAR_STATION = 6000;
const WARPS = [0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 500, 1000, 5000, 10000, 50000];
/**
 * When the predicted-orbit line is a trajectory rather than an artefact.
 * See `App.syncPredicted` for the measurements behind both numbers.
 */
const PREDICTED_MIN_APOAPSIS = 100e3;
/** as a fraction of the Earth's radius, below the surface */
const PREDICTED_MIN_PERIAPSIS = 0.5;
/** seconds the predicted line takes to fade in or out */
const PREDICTED_FADE = 0.5;
const base = import.meta.env.BASE_URL;
/** Shared empty point list, so clearing a line allocates nothing. */
const EMPTY_POINTS: Vec3[] = [];

/**
 * Application shell.
 *
 * Wave 2 put a flight recorder between the simulation and everything that
 * draws. The simulation is advanced through `FlightRecorder.advance`, which
 * stores `VisualFrame`s at an adaptive cadence; the `ReplayPlayer` owns a
 * mission-time cursor that either follows the recording head (live) or sits
 * behind it (replay, produced by interpolating two recorded frames). One frame
 * per animation tick drives the 3-D scene, the HUD, the narration, the map and
 * the onboard overlay, so scrubbing the timeline rewinds all of them together
 * while the live flight keeps being recorded behind the cursor.
 *
 * The design pass added the three-column workspace, the phase narration band
 * and the camera sequence. The camera sequence is frame-driven like everything
 * else, which is why it works identically while replaying.
 */
class App {
  scene!: SceneManager;
  hud: Hud;
  tel: TelemetryPanel;
  result: MissionResult;
  /** C01: the real flight beside the simulated one */
  flown: FlownPanel;
  rigidControls: RigidControls;
  /** G07: the TORU hand controllers */
  toruControls!: ToruControls;
  /** E03: lessons with set tasks and automatic grading, and the placement test */
  lessons!: LessonMode;
  map: OrbitalMap;
  onboard: OnboardOverlay;
  timeline: Timeline;
  narration: Narration;
  cams = new CameraController();
  panel: SetupPanel;
  home: HomeScreen;
  /** what the landing page shows behind itself: the vehicle on its pad, then its starry sky and its globe */
  homeStage: HomeStage;
  /** the landing page's sky or its globe covers the launch scene */
  private homeCovers = false;
  watch: WatchView;
  /** S01: the Build section while it is being built */
  /** Phase 3: the Build section's screen (src/ui/build/) */
  private buildScreen: BuildScreen;
  /** O01: the Orbit section's playground */
  private playground: OrbitPlayground;
  /** the Earth's textures, loaded once for the launch scene and the playground's 3-D view */
  private earthTextures: Promise<EarthTextures> | null = null;
  /** which section and level of the app is showing (src/ui/app-mode.ts) */
  route: AppRoute = HOME_ROUTE;
  /** the level last shown in any section, for the section links from the landing page */
  private levelMemory: AppLevel = DEFAULT_LEVEL;
  private readonly sectionNav = new SectionNav(document.getElementById('section-nav')!);
  /**
   * The launch simulator's own face: its level in the launch section, and
   * the landing page's everywhere else — another section covers the scene the
   * way the landing page does, so nothing of the launch workspace is on screen
   * or takes keys there (S01).
   */
  get mode(): AppMode {
    return launchMode(this.route);
  }
  /** The mission being flown: its simulation, its recording and their clock (src/session). */
  session: FlightSession | null = null;
  /**
   * The mission's simulation, `session.sim`. With the physics in the worker it
   * is the main-thread shell: every read works, nothing here may step it.
   */
  sim: Simulation | null = null;
  /** The mission's recording, `session.recorder` (an empty one before the first mission). */
  recorder: RecordingSource = new FlightRecorder();
  player = new ReplayPlayer(this.recorder);
  /**
   * Where the physics runs: in a worker (the default), or on the main thread
   * where a module worker cannot start or `?physics=inline` asks for it.
   */
  private physicsMode: 'worker' | 'inline' = new URLSearchParams(location.search).get('physics') === 'inline' ? 'inline' : 'worker';
  /** The one physics worker, shared by every mission; undefined until first needed. */
  private physicsWorker: SessionWorker | null | undefined;
  private sessionCount = 0;
  /** mission time at the previous animation frame, for the achieved-warp readout */
  private rateLastT: number | null = null;
  simView: FrameSimView | null = null;
  rocket: RocketView | null = null;
  pad: LaunchPadView | null = null;
  /** landing zones, a drone ship, the sea a ship comes home to */
  private recoveryScenery: RecoverySceneryView | null = null;
  debrisView!: DebrisView;
  trail = new TrailLine(0x8be5cd);
  predicted = new OrbitLine(0xffffff, true);
  target = new OrbitLine(0xefa47e, false);
  /** E01: the reference frames drawn in 3-D, chosen from the Frames menu */
  frames = new FramesView(frameSymbols);
  /** G06: the escaping head section or descent module */
  private escapeView: EscapeView | null = null;
  /** G07: the station a rendezvous flies to */
  private stationView: StationView | null = null;
  /** C01: Columbia, drawn on its own from the undocking; Eagle's descent stage left on the Moon; its ascent stage jettisoned */
  private csmView: ReturnType<typeof buildCsm> | null = null;
  private descentStageView: ReturnType<typeof buildDescentStage> | null = null;
  private ascentStageView: ReturnType<typeof buildAscentStage> | null = null;
  /** C01: the command module on its own on the way in, and the service module it left */
  private entryCmView: ReturnType<typeof buildEntryCm> | null = null;
  private smView: ReturnType<typeof buildServiceModule> | null = null;
  private dockingEyePos = new THREE.Vector3();
  /** the 3-D picture is the docking TV camera's (drawn black and white) */
  private tvPicture = false;
  /** G07: the relative motion in the station's frame, in the telemetry panel */
  private rendezvousPlot = new RendezvousPlot();
  private framesMenu!: FramesMenu;
  /** V02: the twilight jellyfish, and a scratch vector for its position */
  private readonly twilight = new TwilightPlume();
  private readonly twilightPos = new THREE.Vector3();
  /** V01: the launch as the camera hears it */
  readonly audio = new LaunchAudio();
  /** P07: the long-term orbit window; R05: its solar activity through the data mode chosen */
  private lifetime = new LifetimeDialog({ data: () => this.dataProvider });
  /** S03: the orbit last handed to the Orbit section, in memory */
  private handoff: OrbitHandoff | null = null;
  /** V01: a viewer launch's real broadcast, when there is one */
  readonly soundtrack = new SoundtrackPlayer();
  private soundtrackPanel = new SoundtrackPanel((id) => { if (this.watchSoundtrackId === id) void this.loadSoundtrack(id); });
  /** the viewer launch whose soundtrack is loaded */
  private watchSoundtrackId: WatchMissionId | null = null;
  /** U02: the reference flight's path, dashed, turned to this flight's launch */
  ghost = new OrbitLine(0xc3a6ff, true, REFERENCE_PATH_POINTS + 1, 1.8);
  /** the launch the ghost was last turned to, Julian date */
  private ghostJd = NaN;
  compare!: ComparePanel;
  /** the live simulation is advancing */
  playing = false;
  /** time warp of the live simulation */
  warp = 1;
  achievedWarp: number | null = null;
  private rateWallSeconds = 0;
  private rateSimSeconds = 0;
  /** time warp of the replay cursor (kept separate: scrubbing fast through a
   *  recording must not make the live flight sprint) */
  replayWarp = 1;
  camMode: CameraMode = 'exterior';
  /** per-phase camera programme */
  cameraPlan: CameraPlan = { ...DEFAULT_CAMERA_PLAN };
  /** R2.2: whether the programme or the user directs the view (src/render/camera-policy.ts) */
  readonly camPolicy = new CameraPolicy();
  /** R2.1: the mission lifecycle the shell shows, and whether the setup is shown on request */
  private stage: MissionStage = 'setup';
  private setupPeek = false;
  private setupShown: boolean | null = null;
  /** the shell elements the per-frame lifecycle sync writes, looked up once */
  private shellEls: { setup: HTMLElement; toggle: HTMLButtonElement; bar: HTMLElement; clock: HTMLElement | null;
    barClock: HTMLElement; barMode: HTMLElement; barPlay: HTMLButtonElement } | null = null;

  /**
   * G2 hold (F5): whether the scene reaches into the strip at the bottom of the
   * window where a phone's flight bar sits. The bar is fixed there; while the
   * picture is under it, the bar would cover the scene, so it waits until the
   * page has scrolled the scene up out of that strip.
   */
  private sceneUnderBar = false;
  private watchBarStrip(): void {
    const scene = document.getElementById('viewport');
    let seen: IntersectionObserver | undefined;
    // the bar: 8 px from the bottom, 52 px tall at most; 72 px leaves a margin
    const watch = (): void => {
      seen?.disconnect();
      seen = new IntersectionObserver(([e]) => { this.sceneUnderBar = e.isIntersecting; }, { rootMargin: `-${Math.max(0, innerHeight - 72)}px 0px 0px` });
      if (scene) seen.observe(scene);
    };
    watch();
    addEventListener('resize', watch);
  }

  /**
   * G2 hold (F5): the first-use guide sits between the top bar and the scene,
   * and a long hint pushed the scene off the first screen (Russian at 320×740:
   * 137 px of it; at 911×512, 150 % zoom, 250 px against 256). The guide gets
   * the room that leaves the scene's minimum height (the same formula as
   * `--scene-min`) on the first screen, above the footer on a desktop, and
   * scrolls inside it.
   */
  private fitGuideAboveScene(): void {
    const guide = document.getElementById('first-use-guide');
    const top = document.getElementById('topbar');
    const foot = document.getElementById('footer');
    if (!guide || !top || !foot) return;
    const desktop = matchMedia('(min-width: 861px)');
    const fit = (): void => {
      const g = guide.getBoundingClientRect();
      if (!g.height) return;
      const sceneMin = Math.min(400, Math.max(240, 0.5 * innerHeight));
      // what lies between the guide and the scene (the phone's nav, gaps) does not depend on the guide's height
      const below = this.viewport.getBoundingClientRect().top - g.bottom;
      const end = desktop.matches ? foot.getBoundingClientRect().top : innerHeight;
      const room = end - g.top - below - sceneMin;
      guide.style.setProperty('--guide-room', `${Math.max(96, Math.floor(room))}px`);
    };
    fit();
    addEventListener('resize', fit);
    new ResizeObserver(fit).observe(top);
    new ResizeObserver(fit).observe(guide);
  }

  private get shell(): NonNullable<App['shellEls']> {
    if (!this.shellEls) { this.watchBarStrip(); this.fitGuideAboveScene(); }
    return this.shellEls ??= {
      setup: document.getElementById('setup')!,
      toggle: document.getElementById('btn-setup') as HTMLButtonElement,
      bar: document.getElementById('mobile-flight-bar')!,
      clock: document.getElementById('clock'),
      barClock: document.getElementById('mfb-clock')!,
      barMode: document.getElementById('mfb-mode')!,
      barPlay: document.getElementById('mfb-play') as HTMLButtonElement,
    };
  }
  /** mission time to fast-forward to, or null when not fast-forwarding */
  fastForwardTo: number | null = null;
  lastFrame = performance.now();
  hudTimer = 0;
  telTimer = 0;
  /** numbers each flight previewed, so Explore's end-of-flight card is offered once per flight */
  private flightNo = 0;
  /** Explore's card at the end of a flight (src/ui/explore-debrief.ts) */
  private debrief!: ExploreDebrief;
  explosion = new ExplosionEffect();
  /** V03: exhaust trails */
  private trails: ExhaustTrails | null = null;
  viewport: HTMLElement;
  glCanvas: HTMLCanvasElement;
  mapCanvas: HTMLCanvasElement;
  obCanvas: HTMLCanvasElement;
  private aboutDialog: AboutDialog;
  private workDialog: WorkDialog;
  private profiles: AppProfiles;
  /** S04: offline (the default) or online, and where datasets come from under it */
  private dataMode: DataMode = loadDataMode();
  /** R02: online answers kept so a source is not asked more often than it allows (CelesTrak: every two hours) */
  private readonly recentAnswers = new CacheStorageRecent(typeof caches !== 'undefined' ? caches as unknown as RecentCaches : null);
  private dataProvider: DataProvider = createDataProvider(this.dataMode, document.baseURI, (url, init) => fetch(url, init), this.recentAnswers);
  private dataDialog!: DataDialog;
  private loopInspector: LoopInspector;
  /** G05: the Monte Carlo window, and the app's Monte Carlo runner (WebMCP's run_monte_carlo). */
  readonly monteCarlo: MonteCarloWindow;
  private cameraDialog: CameraDialog;
  private shown: VisualFrame | null = null;
  /**
   * Audit 2026-09-27 A1: whether the setup panel holds the user's mission,
   * which the page stores, or one a viewer prepared, which it does not.
   */
  private readonly workspace = new WorkspaceMission();
  /** R3.5: the Watch launch the template in the panel is a copy of; null for Home's first-launch template */
  private templateCopyOf: string | null = null;
  /** R3.1: the user's design the panel's mission flies, with its revision; dropped once the mission flies something else */
  private designRef: DesignRef | null = null;
  /** the start-up mission is in the panel: entering the workspace may restore the stored one from now on */
  private started = false;
  private wasLive = true;
  /** the flight phase the camera sequence last acted on */
  private lastPhase: FlightPhase | null = null;
  /** index of the last recorded frame fed to the trail line */
  private trailIdx = -1;
  /** elements the predicted-orbit line was last sampled for (see syncPredicted) */
  private predictedShape = { a: NaN, e: NaN, i: NaN, raan: NaN, argp: NaN, ellipsoid: false };
  private predictedOn = false;
  /** 0..1 fade of the predicted-orbit line (see syncPredicted) */
  private predictedFade = 0;
  private playBtn!: HTMLButtonElement;
  private playGlyph!: HTMLElement;
  private liveBtn!: HTMLButtonElement;
  /** G06: the Engineer mode's launch abort */
  private abortBtn!: HTMLButtonElement;
  private warpSel!: HTMLSelectElement;
  private glowBtn!: HTMLButtonElement;
  /** decides from the frame rate whether the glow is affordable (src/render/glow-governor.ts) */
  private readonly glow = new GlowGovernor();
  /** V02: the same frame-rate trial for the scattering sky */
  private readonly skyGovernor = new GlowGovernor();
  /** kept alive for as long as the app is: it publishes `--sb-h` */
  private sbObserver: ResizeObserver | null = null;
  private sbHeight = -1;
  private basis = new THREE.Matrix4();
  private bx = new THREE.Vector3();
  private by = new THREE.Vector3();
  private bz = new THREE.Vector3();
  private originV = new THREE.Vector3();
  /**
   * The body the camera follows when it is not the vehicle: a stage flown
   * home, by its debris id. Null follows the vehicle. When the body is no
   * longer in the frame (not yet separated, or scrubbed back before it was)
   * the vehicle is followed.
   */
  focusDebrisId: number | null = null;
  /**
   * What the viewer's camera follows: its own programme (the rocket, and each
   * stage flown home for its entry, landing and a few seconds after; C01:
   * Vostok-1's sphere to its landing, then Gagarin), or whichever the viewer
   * picked with the follow button, for the rest of the flight: the rocket
   * (or the capsule coming home), a stage flown home, or the pilot on his own
   * parachutes.
   */
  private watchFollow: 'auto' | 'rocket' | 'booster' | 'crew' = 'auto';
  /** mission time the followed stage was first seen down, s (-1 while it flies) */
  private focusDownT = -1;
  private readonly helpGuide: HelpGuide;
  /** the viewer mission's payload as flown (i18n key), in place of the catalogue name */
  private watchPayloadKey: string | null = null;
  private vehiclePos = new THREE.Vector3();
  private earthC = new THREE.Vector3();
  /** C01: where what the camera on Vostok-1's sphere looks past it at is drawn (`vostokPartner`) */
  private mateV = new THREE.Vector3();

  constructor() {
    this.helpGuide = new HelpGuide(document.getElementById('first-use-guide')!, document.getElementById('btn-help') as HTMLButtonElement);
    this.result = new MissionResult(document.getElementById('mission-result')!, {
      onSeek: time => this.seek(time), onShowSetting: (field) => this.showSetting(field),
      suggestion: (cause, ctx) => this.resultSuggestionFor(cause, ctx), onApplySuggestion: (s) => this.applySuggestion(s),
    });
    this.flown = new FlownPanel(document.getElementById('flown-result')!);
    this.toruControls = new ToruControls(document.getElementById('toru-controls')!, (cmd) => {
      if (this.mode === 'engineer' && this.player.live) this.session?.commandToru(cmd);
    });
    this.rigidControls = new RigidControls(document.getElementById('rigid-controls')!, command => {
      if (!this.session || !this.player.live) return;
      this.session.setRigidCommand(command);
      this.telTimer = 1;
    }, opener => this.loopInspector.open(opener));
    // G03: the attitude-loop inspector, opened from the 6-DOF panel in the Engineer mode.
    this.loopInspector = new LoopInspector({ togglePlay: () => this.togglePlay(),
      // E04: the tuning tab writes into the mission setup, and the flight-test tab flies in the live flight.
      applyControl: (control) => this.panel.applyControl(control), currentControl: () => this.panel.currentControl(),
      startAttitudeTest: (spec) => (this.simView && this.player.live ? this.simView.sim.startAttitudeTest(spec) : 'notLive') });
    this.viewport = document.getElementById('viewport')!;
    this.glCanvas = document.getElementById('gl') as HTMLCanvasElement;
    this.mapCanvas = document.getElementById('map') as HTMLCanvasElement;
    this.obCanvas = document.getElementById('onboard') as HTMLCanvasElement;
    // The telemetry panel first: it owns the slot the instrument card docks
    // into, and `Hud` reads its stored placement in its own constructor.
    this.tel = new TelemetryPanel(document.getElementById('telemetry')!, () => void this.flightReport(), () => this.orbitLifetime(),
      () => this.continueInOrbit());
    this.compare = new ComparePanel({
      currentAsReference: () => this.currentAsReference(),
      current: () => this.tel.exportSource(),
      onReference: (ref) => { this.tel.setReference(ref); this.ghostJd = NaN; },
    });
    this.tel.compareHost.append(this.compare.root);
    this.tel.rendezvousHost.append(this.rendezvousPlot.canvas);
    this.hud = new Hud(document.getElementById('hud')!, document.getElementById('ticker')!, this.tel.dockHost);
    this.map = new OrbitalMap(this.mapCanvas, `${base}textures/earth_atmos_2048.jpg`);
    this.onboard = new OnboardOverlay(this.obCanvas);
    this.narration = new Narration(document.getElementById('narration')!);
    this.timeline = new Timeline(document.getElementById('timeline')!, {
      onSeek: (time) => this.seek(time),
      onLive: () => this.goLive(),
    });
    this.panel = new SetupPanel(document.getElementById('setup')!, {
      onLaunch: (cfg) => this.launch(cfg),
      onReset: () => this.reset(),
      // LUI-01: an edit made once launched (the loop inspector's "Use for the
      // next launch") is held for the next launch, not previewed over the flight
      onChange: (cfg, change) => {
        const stage = missionStage({ launched: this.panel.isRunning(), done: !!this.sim?.done });
        if (previewsChange(stage, this.playing, change)) this.preview(cfg);
      },
      onExperience: (experience) => this.go(route('launch', experience === 'advanced' ? 'engineer' : 'explore')),
      onMonteCarlo: (opener) => this.monteCarlo.open(opener),
      onBackToMine: () => this.continueMission(),
    });
    this.monteCarlo = new MonteCarloWindow({ config: () => this.panel.getConfig(), missionState: () => this.panel.missionState() });
    // P08: a run clicked in the Monte Carlo window opens in the setup panel as one dispersed flight —
    // the set's own mission with that run's dispersion, not today's setup (audit 2026-09-27 A10)
    this.monteCarlo.onOpenRun = (mission) => {
      this.goLive(); this.playing = false; this.workspace.adopt(); this.panel.restoreMission(mission);
    };
    this.homeStage = new HomeStage({
      cams: this.cams,
      camera: () => (this.scene ? this.scene.camera : null),
      viewport: this.viewport,
      coverScene: (on) => { this.homeCovers = on; },
      textures: () => (this.earthTextures ??= loadEarthTextures(base)),
      satellites: () => this.dataProvider.load('satellites'),
    });
    this.home = new HomeScreen(document.getElementById('home-screen')!, {
      watch: (id) => { this.go(route('launch', 'watch')); this.startWatch(id); },
      go: (r) => this.go(r),
      openLessons: () => this.lessons.openCatalog(),
      lastMission: () => missionSummary(loadStoredMission()),
      continueMission: () => this.continueMission(),
      tryFirstLaunch: () => this.tryFirstLaunch(),
    }, this.homeStage);
    this.buildScreen = new BuildScreen(document.getElementById('build-screen')!, {
      go: (r) => this.go(r),
      // Phase 3 (D02, D03): "Fly it" loads a design as a mission, as a file does, and opens Launch at the same level
      launchTime: () => this.panel.missionState().launchTime,
      flyDesign: (doc, level) => {
        this.goLive(); this.playing = false;
        const parsed = this.panel.share.apply(doc, 'build');
        if (!parsed.usable) return false;
        // the first-use guide's first step says to pick a Quick start example, which would replace this design
        this.helpGuide.missionGiven();
        // the page's own copy of the mission (U01): previewed from the Build section, which keeps none
        saveStoredMission(this.panel.missionState());
        this.go(route('launch', level));
        return true;
      },
      // R3.1: which design that was, and its revision, once Build has read its saved record
      designFlown: (ref) => this.designFlown(ref),
      // D06 (the integration): "Fly it" on the Launch section's own vehicle, from its site, after its launch time
      launchMission: () => {
        const m = this.panel.missionState();
        return { vehicleId: m.vehicleId, ...(m.vehicleSpec ? { vehicleSpec: m.vehicleSpec } : {}), siteId: m.siteId, launchTime: m.launchTime };
      },
      // D06: a designed satellite in its own orbit, with no launch, handed on as "Continue in Orbit" hands a flight's
      toOrbit: (h, level) => {
        this.handoff = h;
        this.playground.setHandoff(h);
        this.go(route('orbit', level));
      },
    });
    this.playground = new OrbitPlayground(document.getElementById('orbit-playground')!, {
      go: (r) => this.go(r),
      // S03: the hand-off's orbit, carried on for years (P07)
      lifetime: (h, opener) => this.lifetime.openFor(h, opener),
      textures: () => (this.earthTextures ??= loadEarthTextures(base)),
      mapUrl: `${base}textures/earth_atmos_2048.jpg`,
      // R02: the satellite catalogue comes through the data mode chosen
      data: () => this.dataProvider,
    });
    this.debrief = new ExploreDebrief(document.getElementById('explore-debrief')!, {
      // "fly again": the rocket back on the pad and the set-up open, as New mission does
      again: () => { this.goLive(); this.panel.backToSetup(); },
      engineer: () => this.go(route('launch', 'engineer')),
      orbit: () => this.continueInOrbit(),
    });
    this.watch = new WatchView(document.getElementById('watch-ui')!, {
      start: (id) => this.startWatch(id),
      togglePlay: () => this.togglePlay(),
      setWarp: (warp) => this.setWarp(warp),
      explore: () => this.go(route('launch', 'explore')),
      tryCopy: (id) => this.tryWatchCopy(id),
      continueInOrbit: () => this.continueInOrbit(),
      follow: (target) => { this.watchFollow = target === 'capsule' ? 'rocket' : target; },
      pickerFooter: () => this.soundtrackPanel.render(),
    });
    this.aboutDialog = new AboutDialog(document.getElementById('about-dialog') as HTMLDialogElement);
    this.profiles = new AppProfiles(
      document.getElementById('profile-dialog') as HTMLDialogElement,
      document.getElementById('btn-profile') as HTMLButtonElement,
      document.getElementById('profile-storage-notice')!,
      () => this.lessons?.recordedLessons(),
    );
    this.workDialog = new WorkDialog(document.getElementById('work-dialog') as HTMLDialogElement, {
      capture: () => {
        const sim = this.tel.exportSource();
        if (!sim?.telemetry.length) return null;
        const clock = this.player.live ? this.recorder.clock : this.player.cursor;
        const frame = this.player.live ? this.recorder.recordNow() : this.player.frame();
        return {
          label: `${sim.vehicleSpec.name} · ${sim.cfg.launchTime.toISOString()}`,
          mission: flownMission(sim.cfg), telemetry: sim.telemetry, events: sim.events,
          actions: sim.actions, app: appBuildId(), t: sim.state.t, clock,
          status: frame?.status ?? sim.state.status, complete: sim.done && clock >= sim.state.t - 1e-6,
        };
      },
      restoreMission: (document) => {
        const restored = parseMissionDocument(document, this.panel.missionState());
        if (!restored.usable || restored.issues.length) { this.workDialog.report('work.restoreFailed'); return false; }
        this.goLive(); this.playing = false; this.workspace.adopt();
        this.panel.restoreMission(restored.state);
        this.go(route('launch', 'explore'));
        this.workDialog.close();
        return true;
      },
      isBusy: () => this.playing && !this.sim?.done,
      onImported: () => {
        // A shared-mission query or lesson hash must not overwrite restored
        // browser work when startup runs again.
        this.profiles.reloadAfterImport();
      },
    });
    this.cameraDialog = new CameraDialog(document.getElementById('camera-dialog') as HTMLDialogElement, {
      plan: this.cameraPlan,
      isAuto: () => this.camPolicy.cinematic,
      setAuto: (on) => { if (on) this.resumeCinematic(); else { this.camPolicy.setCinematic(false); this.updateCameraOwner(); } },
      onChange: (phase, mode) => {
        this.cameraPlan[phase] = mode;
        // Apply straight away when it is the phase we are in, so the dialog is
        // a live preview rather than a form to submit.
        if (this.camPolicy.cinematic && this.lastPhase === phase) this.showCamera(mode);
      },
    });
    this.dataDialog = new DataDialog({
      mode: () => this.dataMode,
      setMode: (mode) => this.setDataMode(mode),
      provider: () => this.dataProvider,
    });
    applyWebFonts(this.dataMode);
    const dataBtn = document.getElementById('btn-data-mode') as HTMLButtonElement;
    dataBtn.addEventListener('click', () => this.dataDialog.open(dataBtn));
    this.syncDataMode();
    this.bindControls();
    this.observeSceneBottom();
    const startHash = location.hash; // E03: `#/lessons` is the lessons page, not a route
    const stored = loadRoute();
    if (stored && stored.section !== null) this.levelMemory = stored.mode;
    this.setRoute(initialRoute(location.hash));
    // Keep the address naming the route in its one canonical form — a pre-S01
    // `#/watch` becomes `#/launch/watch` — without adding a history entry.
    this.canonicalizeHash();
    window.addEventListener('hashchange', () => {
      const next = routeFromHash(location.hash, this.lastLevel());
      if (!next) return; // an in-page anchor of the narrow layout
      if (!sameRoute(next, this.route)) this.setRoute(next);
      this.canonicalizeHash();
    });
    // E03: a lesson loads its mission through the panel (previewed by its onChange) and grades the flight at the head
    this.lessons = new LessonMode({
      profileName: () => this.profiles.name(),
      manageProfiles: (opener) => this.profiles.open(opener),
      resetLearning: (opener, lessonId) => this.profiles.openReset(opener, lessonId),
      // a lesson flies in the launch section; the page closes onto the route under it
      go: (mode) => this.go(mode === 'home' ? HOME_ROUTE : route('launch', mode)),
      // a case lesson (track 6) works in the Orbit section's Real satellites
      openCase: (id, level) => { this.go(route('orbit', level)); this.playground.openCase(id); },
      caseInput: () => this.playground.caseInput(),
      lessonCase: (state) => this.playground.lessonCase(state),
      back: () => this.go(this.route),
      loadMission: (state) => { this.goLive(); this.playing = false; this.workspace.adopt(); this.panel.restoreMission(state); },
      sim: () => this.sim,
      clock: () => this.recorder.clock,
      panelRoot: document.getElementById('setup')!,
      renderPanel: () => this.panel.render(),
      // T01: the authoring tab writes a scenario on the mission the panel holds
      mission: () => this.panel.missionState(),
      // T01: a design lesson works on the Build section's satellite desk, the student's own design put aside meanwhile
      openDesign: (desk, level) => this.buildScreen.openDesignLesson(desk, level),
      showDesign: (level) => this.buildScreen.showDesignLesson(level),
      closeDesign: () => this.buildScreen.closeDesignLesson(),
      designNow: () => this.buildScreen.lessonDesign(),
      designDesk: () => this.buildScreen.designDesk(),
    });
    this.buildScreen.onDesignChange(() => this.lessons.designChanged());
    this.lessons.openFromHash(startHash);
  }

  /** S04: switch offline/online, kept in this browser. */
  private setDataMode(mode: DataMode): void {
    this.dataMode = mode;
    saveDataMode(mode);
    this.dataProvider = createDataProvider(mode, document.baseURI, (url, init) => fetch(url, init), this.recentAnswers);
    this.playground?.dataChanged();
    applyWebFonts(mode);
    this.syncDataMode();
  }

  /** S04: the top bar's indicator says which mode is on, in words for the screen reader and the tooltip. */
  private syncDataMode(): void {
    const btn = document.getElementById('btn-data-mode');
    if (!btn) return;
    btn.dataset.mode = this.dataMode;
    const label = t(this.dataMode === 'online' ? 'data.mode.online' : 'data.mode.offline');
    document.getElementById('data-mode-label')!.textContent = label;
    const title = t('data.button', { mode: label });
    btn.title = title;
    btn.setAttribute('aria-label', title);
  }

  /** Rewrite the address to the route's canonical hash, in place. */
  private canonicalizeHash(): void {
    const hash = hashForRoute(this.route);
    if (location.hash !== hash) history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
  }

  /** The level a section link opens at: the one showing, else the last one used. */
  private lastLevel(): AppLevel {
    return this.route.section !== null ? this.route.mode : this.levelMemory;
  }

  /** S01: the section switch shows the route (src/ui/section-nav.ts). */
  private syncNav(): void {
    this.sectionNav.show(this.route);
  }

  /** Opaque section and lesson pages cover the scene while the flight continues. */
  private get sceneCovered(): boolean {
    return !!document.body.dataset.lessonsPage || this.route.section === 'orbit' || this.route.section === 'build' || (this.mode === 'home' && this.homeCovers);
  }

  /** The landing page and the viewer: no workspace, the scene is the page. */
  get lean(): boolean {
    return this.mode === 'home' || this.mode === 'watch';
  }

  /** Navigate to a route (a history entry, so Back returns to the last one). */
  go(next: AppRoute): void {
    const hash = hashForRoute(next);
    if (location.hash === hash) this.setRoute(next);
    else location.hash = hash;
  }

  /**
   * Show a route. Only presentation changes: the mission, the flight and its
   * recording carry on underneath, so leaving the viewer for the workspace in
   * the middle of a launch shows the same launch with every instrument on it,
   * and a flight left running while the Orbit section is open is still
   * flying on the way back.
   */
  private setRoute(next: AppRoute): void {
    const previous = this.mode;
    this.route = next;
    if (next.section !== null) this.levelMemory = next.mode;
    const mode = this.mode;
    document.body.dataset.mode = mode;
    document.body.dataset.section = next.section ?? 'home';
    saveRoute(next);
    this.syncNav();
    // O01: the Orbit section is its playground; Phase 3: the Build section is its screen
    const orbit = next.section === 'orbit';
    const build = next.section === 'build';
    document.getElementById('build-screen')!.hidden = !build;
    if (build) this.buildScreen.show(next.mode as AppLevel, next.page); // D07: a page of the level (#/build/engineer/requirements)
    else this.buildScreen.hide();
    document.getElementById('orbit-playground')!.hidden = !orbit;
    if (orbit) this.playground.show(next.mode as AppLevel);
    else this.playground.hide();
    const experience = experienceForMode(mode);
    // A1: the workspace comes back to the user's mission, not the viewer's launch left on the pad
    if (experience) this.restoreWorkspaceMission();
    if (experience) this.panel.setExperience(experience);
    this.rigidControls.setInspectorAvailable(mode === 'engineer');
    this.tel.setEquationLevel(mode === 'engineer' ? 'engineer' : 'explore'); // E02
    if (mode !== 'engineer') this.loopInspector.close();
    if (mode !== 'explore') this.debrief.close();
    if (mode !== 'engineer') this.monteCarlo.close(); // G05: a running set flies on
    document.getElementById('home-screen')!.hidden = next.section !== null;
    if (previous === 'home' && mode !== 'home') this.homeStage.leave();
    if (next.section === null && previous !== 'home') this.home.refresh(); // A1: the "continue" card
    document.getElementById('watch-ui')!.hidden = mode !== 'watch';
    // The two faces fly different camera programmes; re-apply at once.
    this.lastPhase = null;
    // The target-orbit line is a planning aid: from the pad it is an orange
    // stroke across the sky that nobody watching a launch could read.
    this.target.setOpacity(this.lean ? 0 : 1);
    if (mode === 'watch' && previous !== 'watch') {
      this.watch.enter(!this.playing && (this.shown?.status ?? 'prelaunch') === 'prelaunch');
    }
    if (mode !== 'watch') {
      this.watch.closePicker();
      // the workspace follows the vehicle; the viewer picks its own target again
      this.focusDebrisId = null;
    }
  }

  /** Load one of the viewer's launches and fly it. */
  startWatch(id: WatchMissionId): void {
    if (!this.scene) return;
    this.goLive();
    this.loadViewerMission('watch', watchMissionSettings(id));
    if (!this.panel.isValid()) return;
    this.launch(this.panel.getConfig());
    this.setWarp(1);
    this.watch.begin(id);
    void this.loadSoundtrack(id);
    this.watchPayloadKey = watchMissionById(id)?.payloadKey ?? null;
    this.updateMissionName();
  }

  /** Read-only diagnostics for browser verification; heap availability depends
   * on the browser. Frame byte estimates include calibrated rigid telemetry maps. */
  getPerformance(): Record<string, unknown> {
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    return { achievedWarp: this.achievedWarp, physicsControlStepS: this.sim?.rigidRuntime ? 0.01 : null,
      physicsThread: this.session?.kind ?? null,
      recording: this.recorder.stats(), recordingBytesIncludeRigidMaps: true,
      usedJSHeapBytes: memory?.usedJSHeapSize ?? null, allocatedJSHeapBytes: memory?.totalJSHeapSize ?? null };
  }

  /**
   * Publish the narration band's measured height as `--sb-h`.
   *
   * The onboard overlay draws its instrument strip at the bottom of its own
   * canvas, and the narration sits at the bottom of the viewport. One of them
   * has to give way, and the band's height depends on the language, the
   * viewport width and how long the current event callout is — so it is
   * measured rather than guessed, and the onboard canvas is shortened by
   * exactly that much.
   */
  private observeSceneBottom(): void {
    const band = document.getElementById('scene-bottom');
    if (!band) return;
    const publish = (): void => {
      const h = Math.round(band.getBoundingClientRect().height);
      if (h <= 0 || h === this.sbHeight) return;
      this.sbHeight = h;
      document.documentElement.style.setProperty('--sb-h', `${h}px`);
    };
    if (typeof ResizeObserver !== 'undefined') {
      this.sbObserver = new ResizeObserver(publish);
      this.sbObserver.observe(band);
    }
    window.addEventListener('resize', publish);
    publish();
  }

  /**
   * Re-apply the device pixel ratio when it changes.
   *
   * `setPixelRatio` is called once, at construction, with whatever the ratio
   * was then. Dragging the window to a display with a different scaling factor
   * — or zooming the page, which moves the ratio too — left the drawing buffer
   * at the old density: a blurry canvas on the way up, a needlessly expensive
   * one on the way down. There is no event for it, but a `(resolution: Ndppx)`
   * media query matching the *current* ratio stops matching the moment it
   * changes, so each change re-arms a fresh one-shot query (audit follow-up
   * ported from the parallel quality pass).
   */
  private watchPixelRatio(): void {
    if (typeof window.matchMedia !== 'function') return;
    const arm = (): void => {
      const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      const once = (): void => { this.scene.setPixelRatio(); this.resize(); arm(); };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', once, { once: true });
    };
    arm();
  }

  async init(): Promise<void> {
    const tex = await (this.earthTextures ??= loadEarthTextures(base));
    markStartup('textures');
    this.scene = new SceneManager(this.glCanvas, tex);
    this.restoreGlow();
    // V02: `?sky=gradient` keeps the old sky, for comparison or a GPU the trial misjudges
    if (new URLSearchParams(location.search).get('sky') === 'gradient') { this.scene.setPhysicalSky(false); this.skyGovernor.settle(); }
    this.debrisView = new DebrisView(this.scene);
    this.scene.scene.add(this.trail.line, this.predicted.line, this.target.line, this.frames.group, this.ghost.line, this.twilight.mesh);
    this.ghost.line.visible = false;
    this.cams.attach(this.glCanvas, { isActive: () => !this.sceneCovered });
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(this.viewport);
    this.watchPixelRatio();
    this.resize();
    document.getElementById('loading')!.classList.add('hidden');
    markStartup('ready');
    // A mission link opens the workspace on its mission; otherwise the landing
    // page and the viewer open on the featured launch standing on its pad in
    // daylight, and the workspace on the mission it held when it was closed.
    // The featured launch is the viewer's: the stored mission waits for the
    // workspace to be entered (audit 2026-09-27 A1).
    const stored = loadStoredMission();
    const link = new URL(location.href).searchParams.has(MISSION_PARAM);
    const start = startupMission({ link, lean: this.lean, stored: stored !== null });
    if (start === 'link') await this.openMissionLink();
    else if (start === 'demo') this.loadViewerMission('demo', watchMissionSettings(FEATURED_WATCH_MISSION));
    else if (start === 'stored') this.applyStoredMission(stored);
    else { this.workspace.adopt(); this.preview(this.panel.getConfig()); }
    this.started = true;
    requestAnimationFrame((now) => this.frame(now));
    registerServiceWorker();
    this.lessons.openFromLink(); // E03: ?lesson=<id>; T01: ?scenario=z…
  }

  /** V01: load the broadcast (or the user's own recording) of a viewer launch. */
  private async loadSoundtrack(id: WatchMissionId): Promise<void> {
    this.watchSoundtrackId = id;
    const track = await soundtrackFor(id, (name) => t('snd.mine', { name }));
    // a different flight may have started while the recording was being read
    if (this.watchSoundtrackId === id) this.soundtrack.set(track);
  }

  /**
   * S03: the orbit on screen as a hand-off (src/orbit/handoff.ts) — the state,
   * the spacecraft that is in it, the mission it came from — or null while
   * the flight is not in orbit.
   */
  private orbitHandoffNow(): OrbitHandoff | null {
    const f = this.shown, sim = this.sim;
    if (!sim || !handoffAvailable(f)) return null;
    const sat = sim.satellite;
    const el = f.elements;
    // a payload with an engine flies as the vehicle's last stage: its dry mass and what the frame says is left
    const own = f.stages.find((st) => st.isSpacecraft);
    const spec = own ? sim.vehicle.stages[own.index]?.spec : undefined;
    const h = handoffFromFlight({
      frame: f, satellite: sat, payloadMass: sim.cfg.payloadMassOverride ?? sat.mass,
      spacecraftStage: own && spec ? { dryMass: spec.dryMass, propellant: own.propellantFraction * spec.propellantMass } : null,
      vehicleName: sim.vehicleSpec.name,
      // R3.1: what was flown, not the setup panel's draft — the hand-off describes this flight
      mission: flownMission(sim.cfg),
      label: t('life.start', { sat: satelliteName(sat), pe: (el.periapsisAlt / 1000).toFixed(0), ap: (el.apoapsisAlt / 1000).toFixed(0),
        inc: (el.i * RAD).toFixed(1), t: f.t.toFixed(0) }),
    });
    // R3.1: the design this flight flew, and its revision — when the flight on screen is that design's
    const ref = this.designRef;
    if (ref && refFlies(ref, sim.cfg)) h.origin.design = ref;
    return h;
  }

  /** P07: the orbit on screen, carried on for years in the lifetime dialog. */
  private orbitLifetime(): void {
    this.lifetime.openFor(this.orbitHandoffNow(), document.getElementById('btn-orbit-lifetime'));
  }

  /**
   * S03: "Continue in Orbit" — the orbit on screen handed to the Orbit
   * section, at the level showing. The hand-off lives in memory; the flight
   * carries on in the launch section, as it does behind any other screen.
   */
  continueInOrbit(): void {
    this.handoff = this.orbitHandoffNow();
    this.playground.setHandoff(this.handoff, this.handoff ? null : t('handoff.notInOrbit'));
    this.go(route('orbit', this.lastLevel()));
  }

  /** U02: the flight on screen as a reference to compare later flights against. */
  private currentAsReference(): ReferenceFlight | null {
    const sim = this.tel.exportSource();
    if (!sim || !sim.telemetry.length) return null;
    const law = sim.cfg.dynamics?.explicitGuidance?.law;
    const faults = sim.cfg.dynamics?.controlFaults?.faults.length ?? 0;
    const label = [sim.vehicleSpec.name, law ? law.toUpperCase() : t('cmp.standard'),
      ...(faults ? [t('cmp.faults', { n: faults })] : []), sim.cfg.launchTime.toISOString().slice(0, 16).replace('T', ' ')].join(' · ');
    return referenceFromFlight({
      // R3.1: the reference is the flight on screen, so its mission is the one flown
      label, mission: flownMission(sim.cfg), launchJd: julianDate(sim.cfg.launchTime),
      telemetry: sim.telemetry, events: sim.events,
      path: this.recorder.frames.filter((f) => f.status !== 'prelaunch'),
    });
  }

  /** U02: keep the reference's path turned to the launch on screen. */
  private syncGhost(): void {
    const ref = this.compare?.ref;
    const cfg = this.sim?.cfg;
    this.ghost.line.visible = !!ref && !!cfg;
    if (!ref || !cfg) return;
    const jd = julianDate(cfg.launchTime);
    if (jd !== this.ghostJd) {
      this.ghostJd = jd;
      this.ghost.setPoints(alignTrajectory(ref, jd));
    }
    this.ghost.update(this.scene);
  }

  /** U06: the flight report, from the whole recorded flight and the result on screen. */
  private async flightReport(): Promise<void> {
    const sim = this.tel.exportSource();
    if (!sim) return;
    downloadFlightReport({
      flight: sim,
      result: this.simView ? assessMissionResult(this.simView.sim) : null,
      link: await this.panel.share.link().catch(() => null),
      exclude: this.tel.chartCanvases(),
      guidanceEdited: Object.keys(this.panel.state.guidanceOverrides).length > 0,
    });
  }

  /**
   * The mission a link carries (`?m=…`, roadmap U01), loaded into the
   * workspace. The parameter comes off the address once read, so the address
   * does not go on naming a mission the user has since edited.
   */
  private async openMissionLink(): Promise<boolean> {
    const url = new URL(location.href);
    const param = url.searchParams.get(MISSION_PARAM);
    if (param === null) return false;
    url.searchParams.delete(MISSION_PARAM);
    let raw: unknown = null;
    try { raw = await decodeMissionParam(param); } catch { /* reported as unusable below */ }
    // a mission is the launch section's: a link that names another section or the viewer opens Explore
    if (this.lean) this.setRoute(route('launch', 'explore'));
    history.replaceState(null, '', `${url.pathname}${url.search}${hashForRoute(this.route)}`);
    this.workspace.adopt();
    const parsed = this.panel.share.apply(raw, 'link');
    if (!parsed.usable) this.preview(this.panel.getConfig());
    return true;
  }

  /** The panel's mission as the stored document's text: what A1's comparisons compare. */
  private missionDoc(): string {
    return JSON.stringify(missionDocument(this.panel.missionState()));
  }

  /** A1: a viewer's launch into the panel, held as the viewer's until it is changed. */
  private loadViewerMission(origin: 'demo' | 'watch' | 'template', mission: Parameters<SetupPanel['loadMission']>[0]): void {
    this.workspace.viewing(origin);
    this.panel.loadMission(mission);
    this.workspace.loaded(this.missionDoc());
  }

  /** R3.1: the design reference, while the panel's mission still flies that design. */
  private currentDesignRef(): DesignRef | null {
    if (this.designRef && !refFlies(this.designRef, this.panel.state)) this.designRef = null;
    return this.designRef;
  }

  /** R3.1: Build says which design "Fly it" handed over, and its revision. */
  private designFlown(ref: DesignRef): void {
    if (!refFlies(ref, this.panel.state)) return;
    this.designRef = ref;
    if (this.workspace.origin === 'workspace') saveStoredMission(this.panel.missionState(), undefined, ref);
    this.updateMissionName();
  }

  /** The stored mission into the panel, as the user's; the notice says what could not be used. */
  private applyStoredMission(stored: unknown): void {
    this.workspace.adopt();
    const parsed = this.panel.share.apply(stored, 'stored');
    if (!parsed.usable) this.preview(this.panel.getConfig());
    // R3.1: the design it flew and its revision, kept beside the mission; one that cannot be read is not shown
    const ref = parseDesignRef(stored && typeof stored === 'object' ? (stored as { design?: unknown }).design : undefined);
    this.designRef = ref && ref !== 'invalid' && refFlies(ref, this.panel.state) ? ref : null;
    if (this.designRef) saveStoredMission(this.panel.missionState(), undefined, this.designRef);
    this.updateMissionName();
  }

  /**
   * A1: Home's "continue" card — the launch workspace, at the level last
   * used, on the stored mission. What the panel already holds as the user's
   * is that mission (every preview stores it), and a flight of it carries on.
   */
  private continueMission(): void {
    const stored = loadStoredMission();
    if (stored && this.workspace.origin !== 'workspace') {
      this.goLive(); this.playing = false;
      this.applyStoredMission(stored);
    }
    this.go(route('launch', loadExperience() === 'advanced' ? 'engineer' : 'explore'));
  }

  /**
   * R3.5 (A01): Home's "try a launch yourself" — Explore on the first-launch
   * template, which says what it uses. Opening it stores nothing: the stored
   * mission stays as it was until the template is changed, and the note offers
   * the way back to it.
   */
  private tryFirstLaunch(): void {
    this.openTemplate(quickstartMission(FIRST_LAUNCH), null);
  }

  /**
   * R3.5: Watch's "Try this launch yourself" — Explore on a fresh copy of the
   * launch's settings, held as Home's template is. The launch in Watch is
   * built from its definition each time, so changing the copy cannot change it.
   */
  private tryWatchCopy(id: WatchMissionId): void {
    const m = watchMissionById(id);
    this.openTemplate(watchMissionSettings(id), m ? t(m.titleKey) : id);
  }

  /** A template (Home's, or a copy of a Watch launch) in Explore, with its note. */
  private openTemplate(mission: Parameters<SetupPanel['loadMission']>[0], copyOf: string | null): void {
    this.goLive(); this.playing = false;
    this.templateCopyOf = copyOf;
    this.go(route('launch', 'explore'));
    this.loadViewerMission('template', mission);
    // the first-use guide's first step is to pick a Quick start example: this is as good
    this.helpGuide.missionGiven();
    this.panel.showTemplate({ stored: loadStoredMission() !== null, ...(copyOf ? { copyOf } : {}) });
    this.updateMissionName();
  }

  /**
   * A1: entering Explore or Engineer with the viewer's launch standing
   * untouched on the pad brings the stored mission back. A launch that is
   * flying, or has flown, is kept: that is the one the user came to look at.
   */
  private restoreWorkspaceMission(): void {
    if (!this.started) return;
    const stored = loadStoredMission();
    const underway = this.playing || (this.shown?.status ?? 'prelaunch') !== 'prelaunch';
    if (!this.workspace.entering({ doc: this.missionDoc(), stored: stored !== null, underway })) return;
    this.applyStoredMission(stored);
  }

  /**
   * The viewport changed size.
   *
   * The three polylines are `Line2`, whose width is a number of CSS pixels, so
   * their material has to be told the viewport size — that is the conversion
   * from clip space to pixels inside the shader. Without this call the lines
   * are drawn against a 1x1 viewport and vanish.
   */
  resize(): void {
    const w = this.viewport.clientWidth, h = this.viewport.clientHeight;
    if (w <= 0 || h <= 0) return;
    // G2 hold (F5): a short scene keeps the picture, not the narration's prose
    const short = String(h < SHORT_SCENE_PX);
    if (this.viewport.dataset.short !== short) this.viewport.dataset.short = short;
    this.foldHud(false); // G2 compact: a card opened from the fold does not outlive the size it was opened at
    this.scene.resize(w, h);
    this.trail.setResolution(w, h);
    this.predicted.setResolution(w, h);
    this.target.setResolution(w, h);
    this.frames.setResolution(w, h);
  }

  /**
   * G2 compact: open, or fold again, the telemetry card that a short scene
   * folds into its tool button (style.css reads `data-hud` there only).
   */
  private foldHud(open: boolean): void {
    this.viewport.toggleAttribute('data-hud', open);
    (this.viewport.querySelector('.hud-fold') as HTMLElement).ariaExpanded = String(open);
  }

  /** Warp that the on-screen selector is currently editing. */
  get activeWarp(): number {
    return this.player.live ? this.warp : this.replayWarp;
  }

  private bindControls(): void {
    const warpSel = document.getElementById('warp-select') as HTMLSelectElement;
    this.warpSel = warpSel;
    warpSel.setAttribute('aria-label', t('ctl.warp'));
    this.playBtn = document.getElementById('btn-play') as HTMLButtonElement;
    this.playGlyph = this.playBtn.querySelector('span') as HTMLElement;
    this.liveBtn = document.getElementById('btn-live') as HTMLButtonElement;
    for (const w of WARPS) {
      const o = document.createElement('option');
      o.value = String(w);
      o.textContent = `${w}×`;
      if (w === 1) o.selected = true;
      warpSel.appendChild(o);
    }
    warpSel.addEventListener('change', () => {
      const v = Number(warpSel.value);
      if (this.player.live) this.warp = v; else this.replayWarp = v;
    });
    this.playBtn.addEventListener('click', () => this.togglePlay());
    document.getElementById('btn-skip')!.addEventListener('click', () => this.skip());
    document.getElementById('btn-prev')!.addEventListener('click', () => this.previousEvent());
    this.liveBtn.addEventListener('click', () => this.goLive());
    this.abortBtn = document.getElementById('btn-abort') as HTMLButtonElement;
    this.abortBtn.addEventListener('click', () => {
      if (this.mode !== 'engineer' || !this.player.live || !this.abortArmed(this.shown)) return;
      this.session?.commandAbort();
    });
    document.querySelectorAll<HTMLButtonElement>('.cam-btn[data-cam]').forEach((b) => {
      b.addEventListener('click', () => this.setCamera(b.dataset.cam as CameraMode));
    });
    document.getElementById('btn-cinematic')!.addEventListener('click', () => this.resumeCinematic());
    // R2.1: the setup, once it has given way to the scene, is shown again on request
    document.getElementById('btn-setup')!.addEventListener('click', () => this.toggleSetupPeek());
    document.querySelector('.mobile-workspace-nav a[href="#setup"]')?.addEventListener('click', () => {
      if (!this.setupPeek && setupCollapsed(this.mode, this.stage, false)) this.toggleSetupPeek();
    });
    document.getElementById('mfb-play')!.addEventListener('click', () => this.togglePlay());
    this.glowBtn = document.getElementById('btn-glow') as HTMLButtonElement;
    this.glowBtn.addEventListener('click', () => {
      // `bindControls` runs before `init` builds the scene, and the loading
      // overlay is not a modal — a click that lands here first must not throw.
      if (!this.scene) return;
      // Touching the control also takes it off automatic: whoever has an
      // opinion about the glow outranks the frame-rate heuristic, and it is
      // remembered for the next visit.
      this.glow.settle();
      this.setGlow(!this.scene.bloomEnabled);
      try { workspaceStorage().setItem(GLOW_STORAGE_KEY, this.scene.bloomEnabled ? 'on' : 'off'); } catch { /* preference is optional */ }
    });
    document.getElementById('btn-fullscreen')!.addEventListener('click', () => void this.toggleFullscreen());
    this.viewport.querySelector('.hud-fold')!.addEventListener('click', () => this.foldHud(!this.viewport.hasAttribute('data-hud')));
    this.framesMenu = new FramesMenu(document.getElementById('btn-frames') as HTMLButtonElement, (groups) => this.frames.setShown(groups));
    this.frames.setShown(this.framesMenu.groups);
    // V01: sound, off until asked for; a choice kept from an earlier visit
    // starts at the first click or key press, as browsers require
    const soundBtn = document.getElementById('btn-sound') as HTMLButtonElement;
    const showSound = (): void => {
      soundBtn.classList.toggle('active', this.audio.on);
      soundBtn.setAttribute('aria-pressed', String(this.audio.on));
    };
    soundBtn.addEventListener('click', () => { this.audio.toggle(); showSound(); });
    for (const type of ['pointerdown', 'keydown'] as const) window.addEventListener(type, () => this.audio.sound.resumeOnGesture(), { capture: true });
    showSound();
    document.getElementById('lang-select')!.addEventListener('change', (e) => {
      const l = (e.target as HTMLSelectElement).value as Lang;
      setLang(l);
      this.applyLanguage();
    });
    (document.getElementById('lang-select') as HTMLSelectElement).value = getLang();
    // the topbar opens the tab last left open; the footer's credit line opens the maker's credit
    document.getElementById('btn-about')!.addEventListener('click', (e) => this.aboutDialog.open(e.currentTarget as HTMLElement));
    document.getElementById('btn-work')!.addEventListener('click', (e) => this.workDialog.open(e.currentTarget as HTMLElement));
    document.getElementById('footer-about')!.addEventListener('click', (e) => this.aboutDialog.open(e.currentTarget as HTMLElement, 'about'));
    document.getElementById('btn-camera-plan')!.addEventListener('click', (e) => this.cameraDialog.open(e.currentTarget as HTMLElement));
    // No panel drawer: the narrow layout stacks the panels in reading order
    // (viewport, mission setup, telemetry) rather than hiding two of them
    // behind topbar toggles. The toggles, their listeners and the `.open`
    // class they drove are gone with it.
    window.addEventListener('keydown', (e) => this.onKey(e));
    this.applyLanguage();
  }

  /**
   * Global shortcuts.
   *
   * Space is the one that has to be careful: it is the browser's own "activate
   * this button", so hijacking it while a button, a checkbox or a select has
   * focus breaks keyboard operation of the whole interface (audit). A dialog
   * owns its own keyboard entirely.
   */
  private onKey(e: KeyboardEvent): void {
    if (!this.started) return;
    if (this.aboutDialog.isOpen || this.cameraDialog.isOpen) return;
    if (document.body.dataset.lessonsPage) return; // E03: the lessons page owns the keyboard
    // O01: the Orbit section's playground has its own clock
    if (this.route.section === 'orbit') { this.playground.onKey(e); return; }
    // Phase 3: the Build section has its own keys, and none of the launch's
    if (this.route.section === 'build') { this.buildScreen.onKey(e); return; }
    // The landing page has no flight controls on it: Space must not launch the
    // rocket standing behind it, out of sight.
    if (this.mode === 'home') return;
    const el = e.target as HTMLElement | null;
    const tag = el?.tagName ?? '';
    const typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || el?.isContentEditable === true;
    const onButton = tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY';
    if (typing) return; // the scrubber and the form fields handle their own keys
    if (e.key === ' ') {
      if (onButton) return; // let the focused control activate itself
      e.preventDefault();
      // shift+space always acts on the live flight, so the simulation can be
      // stopped while the cursor is back in the recording studying liftoff.
      if (e.shiftKey) this.toggleLiveFlight(); else this.togglePlay();
      return;
    }
    // H cycles the in-viewport instrument card: compact → full → hidden. It is
    // deliberately not guarded by `onButton` — no button has a native H — so it
    // keeps working after the user has clicked a camera tab or Launch.
    if (e.key === 'h' || e.key === 'H') { this.hud.cycleMode(); return; }
    // D moves that card between the picture and the telemetry panel. Same
    // reasoning as H: no control has a native D, so it keeps working wherever
    // the focus happens to be, and the card's own header stops the keys it
    // claims (arrows, Escape) before they reach this handler.
    if (e.key === 'd' || e.key === 'D') { this.hud.togglePlacement(); return; }
    if (e.key === '1') this.setCamera('exterior');
    else if (e.key === '2') this.setCamera('onboard');
    else if (e.key === '3') this.setCamera('space');
    else if (e.key === '4') this.setCamera('map');
    // Search for the next/previous preset rather than `WARPS.indexOf` on the
    // current warp: the warp can be a value WebMCP's `control_playback` set
    // that is not itself one of the `WARPS` presets, and `indexOf` on that
    // returns -1 — `.` then evaluated `WARPS[-1 + 1]` (`WARPS[0]`, the
    // *slowest* preset) and `,` failed its `i > 0` guard outright.
    else if (e.key === '.') { const next = WARPS.find((w) => w > this.activeWarp); if (next !== undefined) this.setWarp(next); }
    else if (e.key === ',') { const prev = [...WARPS].reverse().find((w) => w < this.activeWarp); if (prev !== undefined) this.setWarp(prev); }
    // Arrows are not guarded by `onButton`: a button, a link and a summary have
    // no native arrow behaviour, and guarding them meant seeking stopped
    // working the moment the user clicked a camera tab, a timeline chip or
    // Launch. The controls that *do* own their arrows — inputs, selects, the
    // scrubber — were already handled by the `typing` return above.
    else this.timeline.onKey(e); // arrows seek 5 s / 30 s, Home/End
  }

  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.viewport.requestFullscreen();
    } catch {
      /* the browser refused: nothing to recover, the view stays inline */
    }
  }

  /**
   * Set the time warp of whichever clock is active and keep the on-screen
   * warp selector in sync. Public so the WebMCP `control_playback` tool
   * (`src/mcp.ts`) can drive it too, instead of writing `warp`/`replayWarp`
   * directly — which used to leave the dropdown showing a stale value and
   * `,`/`.` stepping from the wrong index (review, WAVE 3 WebMCP follow-up).
   */
  setWarp(v: number): void {
    if (this.player.live) this.warp = v; else this.replayWarp = v;
    this.warpSel.value = String(v);
  }

  applyLanguage(): void {
    applyStatic();
    document.getElementById('footer-credit')!.textContent = t('app.footerCredit', { name: DEVELOPER.name, version: versionLabel(BUILD.version) });
    document.title = `${t('app.title')} — ${t('app.subtitle')}`;
    const meta = document.getElementById('meta-description');
    if (meta) meta.setAttribute('content', t('app.subtitle'));
    this.panel.render();
    this.tel.build();
    this.toruControls.render();
    this.compare.render();
    this.hud.applyLabels();
    this.narration.applyLanguage();
    this.timeline.applyStaticText();
    this.home.applyLanguage();
    this.sectionNav.applyLanguage();
    this.watch.applyLanguage();
    this.buildScreen.applyLanguage();
    this.playground.applyLanguage();
    this.syncDataMode();
    if (this.dataDialog.el.open) this.dataDialog.applyLanguage();
    this.lessons?.applyLanguage(); // E03
    document.getElementById('camera-tabs')?.setAttribute('aria-label', t('a11y.cameraGroup'));
    document.getElementById('controls')?.setAttribute('aria-label', t('a11y.playback'));
    // icon-only buttons take their accessible name from the same key as the tooltip
    document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((node) => node.setAttribute('aria-label', node.title));
    this.viewport.setAttribute('aria-label', t('a11y.viewport'));
    this.warpSel?.setAttribute('aria-label', t('ctl.warp'));
    this.framesMenu?.applyLanguage();
    // the dialogs rebuild their body from the dictionaries when opened; an
    // open one has to be rebuilt now
    if (this.aboutDialog.isOpen) this.aboutDialog.applyLanguage();
    if (this.workDialog.isOpen) this.workDialog.applyLanguage();
    this.profiles.applyLanguage();
    if (this.cameraDialog.isOpen) this.cameraDialog.applyLanguage();
    // applyStatic() rewrote the play button's title from its data-i18n-title,
    // which loses the pause/play state and the live-flight hint
    this.updatePlayButton();
    this.updateHint();
    this.updateMissionName();
  }

  private updateHint(): void {
    document.getElementById('cam-hint')!.textContent = t(`ctl.hint.${this.camMode}`);
  }

  private updateMissionName(): void {
    const cfg = this.panel.state;
    // the first-launch template's note goes once the template is the user's mission
    if (this.workspace.origin !== 'template') this.panel.showTemplate(null);
    // R3.5: whose mission this is, beside its name
    const source = missionSource({ origin: this.workspace.origin, lesson: !!document.body.dataset.lesson,
      customVehicle: !!cfg.vehicleSpec, customSatellite: !!cfg.satelliteSpec, copyOf: this.templateCopyOf !== null });
    // R3.1: and, for the user's design, which one and which revision
    const ref = source === 'design' ? this.currentDesignRef() : null;
    this.narration.setSource(MISSION_SOURCE_KEY[source], ref ? { signature: designRefSignature(ref), text: () => designRefText(ref) } : null);
    // The vehicle keeps its proper name in every language; the payload is a
    // description ("Crewed spacecraft") and goes through the dictionaries.
    this.narration.setMission(missionVehicle(cfg).name,
      this.watchPayloadKey ? t(this.watchPayloadKey) : satelliteName(missionSatellite(cfg)));
  }

  /**
   * The user's choice of view (a camera tab, keys 1–4, WebMCP): shown now and
   * kept across phase changes until Cinematic is chosen again (R2.2).
   */
  setCamera(mode: CameraMode): void {
    this.showCamera(this.camPolicy.choose(mode));
    this.updateCameraOwner();
  }

  /** R2.2: hand the view back to the camera programme, at the view it has for this instant. */
  resumeCinematic(): void {
    this.showCamera(this.camPolicy.resume(this.plannedView(), this.camMode));
    this.updateCameraOwner();
  }

  /** The programme's view for the frame on screen, or null when it has none (a lost vehicle). */
  private plannedView(): CameraMode | null {
    const frame = this.shown;
    if (!frame) return null;
    if (this.focusDebrisId !== null && frame.debris.some((d) => d.id === this.focusDebrisId)) return 'exterior';
    const phase = flightPhase(frame);
    if (!phase) return null;
    return (this.lean ? WATCH_CAMERA_PLAN : this.cameraPlan)[phase];
  }

  /** The Cinematic button and the dialog's switch say who directs the view. */
  private updateCameraOwner(): void {
    const on = this.camPolicy.cinematic;
    const btn = document.getElementById('btn-cinematic');
    btn?.classList.toggle('active', on);
    btn?.setAttribute('aria-pressed', String(on));
    document.getElementById('camera-tabs')?.setAttribute('data-owner', this.camPolicy.owner);
    const box = document.getElementById('auto-camera') as HTMLInputElement | null;
    if (box) box.checked = on;
  }

  /**
   * R2.1: show the shell for the mission's lifecycle. Cheap enough for every
   * frame: it reads two flags and writes the DOM only when something changed.
   */
  private syncLifecycle(): void {
    const stage = missionStage({ launched: this.panel.isRunning(), done: !!this.sim?.done });
    if (stage !== this.stage) {
      // a new flight, or the explicit way back to the setup, closes a setup shown on request
      if (stage === 'setup' || this.stage === 'setup') this.setupPeek = false;
      this.stage = stage;
      document.body.dataset.flightStage = stage;
    }
    const collapsed = setupCollapsed(this.mode, stage, this.setupPeek);
    const { setup, toggle } = this.shell;
    if (collapsed !== (this.setupShown === false)) {
      // The focus must not be left inside a panel that is about to disappear
      // (Launch pressed with the keyboard): it goes to the control that brings it back.
      const focusInside = collapsed && setup.contains(document.activeElement);
      this.setupShown = !collapsed;
      document.body.dataset.setup = collapsed ? 'collapsed' : 'shown';
      if (focusInside) toggle.focus({ preventScroll: true });
    }
    const offer = this.mode === 'engineer' && stage !== 'setup';
    if (toggle.hidden === offer) toggle.hidden = !offer;
    const expanded = String(offer && this.setupPeek);
    if (toggle.getAttribute('aria-expanded') !== expanded) toggle.setAttribute('aria-expanded', expanded);
    this.syncMobileFlightBar(stage);
    this.syncSteps(stage);
  }

  /** R3.5: the steps' last painted state, and when the setup's validity was last read */
  private stepsKey = '';
  private stepsValid = { at: -Infinity, valid: true };

  /**
   * R3.5: the mission's steps under its name (src/ui/mission-steps.ts), at the
   * workspace levels. Called every frame: the setup's validity is read a few
   * times a second, and the list is rebuilt only when what it shows changed.
   */
  private syncSteps(stage: MissionStage): void {
    const list = document.getElementById('mission-steps');
    if (!list) return;
    const shown = !this.lean && this.route.section === 'launch';
    if (shown && stage === 'setup') {
      const now = performance.now();
      if (now - this.stepsValid.at > 250) this.stepsValid = { at: now, valid: this.panel.isValid() };
    }
    const valid = this.stepsValid.valid;
    const inOrbit = stage !== 'setup' && handoffAvailable(this.shown);
    const key = shown ? `${stage}|${valid}|${inOrbit}|${getLang()}` : 'hidden';
    if (key === this.stepsKey) return;
    this.stepsKey = key;
    list.hidden = !shown;
    if (!shown) return;
    list.setAttribute('aria-label', t('ctx.steps'));
    const states = missionSteps({ stage, valid, inOrbit });
    list.replaceChildren(...MISSION_STEPS.map((step) => {
      const li = document.createElement('li');
      li.dataset.step = step;
      li.dataset.state = states[step];
      const label = t(MISSION_STEP_KEY[step]);
      if (stepActionable(step, { stage, inOrbit })) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.addEventListener('click', () => this.goToStep(step));
        li.append(b);
      } else li.textContent = label;
      if (states[step] === 'current') li.setAttribute('aria-current', 'step');
      return li;
    }));
  }

  /** R3.5: a step's chip pressed. */
  private goToStep(step: MissionStep): void {
    if (step === 'build') this.go(route('build', this.lastLevel()));
    else if (step === 'orbit') this.continueInOrbit();
    else if (step === 'check') {
      const note = document.getElementById('mission-note');
      if (!note) return;
      note.tabIndex = -1;
      note.scrollIntoView({ block: 'center' });
      note.focus({ preventScroll: true });
    } else if (step === 'result') {
      const card = document.getElementById('mission-result');
      if (!card || card.hidden) return;
      card.scrollIntoView({ block: 'nearest' });
      const first = card.querySelector<HTMLElement>('button, [href]');
      (first ?? card).focus({ preventScroll: true });
    }
  }

  /** R3.5: the suggestion worked out for this flight, by its cause: the card asks on every frame it shows */
  private suggestionMemo: { key: string; value: ResultSuggestion | null } = { key: '', value: null };

  /**
   * R3.5: the change to try next for the flight on screen, from what was
   * flown (`sim.cfg`), never the setup's draft: the vehicle's published rating
   * for the orbit's class, and the launch window nearest the time flown.
   */
  private resultSuggestionFor(cause: ResultCause, ctx: ResultSettingContext): ResultSuggestion | null {
    const sim = this.sim;
    if (!sim) return null;
    const key = `${this.flightNo}|${cause}|${ctx.outcomeTime}|${ctx.events.length}`;
    if (key === this.suggestionMemo.key) return this.suggestionMemo.value;
    const cfg = sim.cfg;
    let value: ResultSuggestion | null = null;
    try {
      value = resultSuggestion(cause, {
        ...ctx, failureMode: cfg.failure.mode, payloadMass: cfg.payloadMassOverride ?? sim.satellite.mass,
        ratedPayload: ratedPayload(sim.vehicleSpec, orbitClassOf(cfg.orbit)).cap || null, launchTime: cfg.launchTime,
        nearestWindow: () => {
          const from = new Date(cfg.launchTime.getTime() - 12 * 3600e3);
          const windows = launchWindows(cfg.orbit, siteById(cfg.siteId), from, 3);
          let best: Date | null = null;
          for (const w of windows) if (!best || Math.abs(w.time.getTime() - cfg.launchTime.getTime()) < Math.abs(best.getTime() - cfg.launchTime.getTime())) best = w.time;
          return best;
        },
      });
    } catch (err) { console.error(err); }
    this.suggestionMemo = { key, value };
    return value;
  }

  /**
   * R3.5: a suggestion applied, on purpose: a new mission (the setup's own
   * New mission — the flight just flown is left as it was recorded) with the
   * one setting changed, previewed, and the field shown.
   */
  private applySuggestion(s: ResultSuggestion): void {
    this.panel.backToSetup();
    const st = this.panel.state;
    if (s.field === 'setup.failureMode') st.failure = { ...st.failure, mode: 'none' };
    else if (s.field === 'setup.payloadMass') st.payloadMass = s.after;
    else st.launchTime = new Date(s.after.getTime());
    this.panel.applyExternalEdit();
    this.reset();
    requestAnimationFrame(() => { this.panel.focusField(s.field); });
  }

  /**
   * R3.5: a result's "show the setting": the setup shown (at the Engineer level
   * the collapsed column comes back, read-only while the flight exists) and the
   * field brought into view and focused. Nothing is changed for the user.
   */
  private showSetting(field: string): void {
    if (this.mode === 'engineer' && this.stage !== 'setup' && !this.setupPeek) {
      this.setupPeek = true;
      this.syncLifecycle();
    }
    // after the column is laid out again
    requestAnimationFrame(() => { this.panel.focusField(field); });
  }

  /** R2.1: show the collapsed setup (read-only in flight, with Relaunch and New mission), or hide it again. */
  toggleSetupPeek(): void {
    if (this.mode !== 'engineer' || this.stage === 'setup') return;
    this.setupPeek = !this.setupPeek;
    this.syncLifecycle();
    if (this.setupPeek) this.shell.setup.focus({ preventScroll: true });
  }

  /**
   * A04 / R2.1: on a phone the whole page scrolls, so the playback controls
   * leave the screen while the charts are read. A compact bar keeps the clock,
   * live/replay and play/pause at the bottom of the screen meanwhile.
   */
  private syncMobileFlightBar(stage: MissionStage): void {
    const { bar, clock: clockSrc, barClock: clockEl, barMode: modeEl, barPlay: play } = this.shell;
    const show = stage !== 'setup' && (this.mode === 'engineer' || this.mode === 'explore') && !this.sceneCovered && !this.sceneUnderBar;
    if (bar.dataset.active !== String(show)) bar.dataset.active = String(show);
    if (!show) return;
    const clock = clockSrc?.textContent ?? '';
    if (clockEl.textContent !== clock) clockEl.textContent = clock;
    const live = this.player.live;
    const mode = live ? t('tl.live') : t('ctl.replay');
    if (modeEl.textContent !== mode) { modeEl.textContent = mode; bar.dataset.replay = String(!live); }
    const running = live ? this.playing : this.player.playing;
    const glyph = running ? '❚❚' : '▶';
    if (play.textContent !== glyph) {
      play.textContent = glyph;
      const label = t(running ? 'ctl.pause' : 'ctl.play');
      play.title = label;
      play.setAttribute('aria-label', label);
    }
  }

  /** Put `mode` on screen. Automation calls this directly; it does not change who owns the view. */
  private showCamera(mode: CameraMode): void {
    this.camMode = mode;
    this.cams.mode = mode;
    document.querySelectorAll<HTMLButtonElement>('.cam-btn[data-cam]').forEach((b) => {
      const on = b.dataset.cam === mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    this.mapCanvas.classList.toggle('hidden', mode !== 'map');
    this.obCanvas.classList.toggle('hidden', mode !== 'onboard');
    this.viewport.classList.toggle('onboard', mode === 'onboard');
    // The 2-D map draws its own legend in its bottom-left corner, which is
    // where the event ticker lives; the narration band carries the latest
    // callout anyway, so the ticker gives way.
    this.viewport.classList.toggle('map', mode === 'map');
    this.updateHint();
  }

  /**
   * Play/pause acts on whatever is moving: the live simulation in live mode,
   * the replay cursor while scrubbing behind the head. The live flight is
   * never stopped by entering replay — the recorder keeps recording.
   */
  togglePlay(): void {
    if (!this.sim) return;
    if (this.player.live) { this.toggleLiveFlight(); return; }
    this.player.playing = !this.player.playing;
    this.updatePlayButton();
  }

  /**
   * Start or stop the *live* simulation, whichever mode the cursor is in.
   * Bound to shift+space, because the play button is taken over by the replay
   * cursor while scrubbing and the recording must still be stoppable — a
   * paused study of liftoff should not have the flight (and the recording)
   * running away behind it.
   */
  toggleLiveFlight(): void {
    if (!this.sim) return;
    if (!this.playing && !this.panel.isValid()) return;
    this.playing = !this.playing;
    if (this.playing) this.panel.setRunning(true);
    this.updatePlayButton();
  }

  /** Whether a launch abort can be commanded at `frame`: armed from the countdown until orbit or the spacecraft's separation. */
  private abortArmed(frame: VisualFrame | null): boolean {
    if (!frame || frame.abort || frame.payloadSeparated || frame.destroyed) return false;
    return frame.status === 'prelaunch' || frame.status === 'ascent' || frame.status === 'burn' || frame.status === 'coast';
  }

  private updatePlayButton(): void {
    const running = this.player.live ? this.playing : this.player.playing;
    this.playGlyph.textContent = running ? '❚❚' : '▶';
    let title = t(running ? 'ctl.pause' : 'ctl.play');
    // while replaying, the button drives the cursor: say where the live flight's
    // own control went
    if (!this.player.live) title += ` · ${t(this.playing ? 'ctl.pauseLive' : 'ctl.resumeLive')}`;
    this.playBtn.title = title;
    this.playBtn.setAttribute('aria-label', title);
  }

  /** Move the cursor; seeking behind the head drops into replay mode. */
  seek(time: number): void {
    if (!this.sim) return;
    const wasLive = this.player.live;
    this.player.seek(time);
    this.telTimer = 1;
    if (wasLive && !this.player.live) this.player.playing = this.playing; // keep playing, now as replay
    if (!wasLive && this.player.live) this.player.playing = false;
    this.updatePlayButton();
  }

  /** Back to the live flight. */
  goLive(): void {
    this.player.goLive();
    this.player.playing = false;
    this.updatePlayButton();
  }

  /** Forward: next recorded event while replaying, fast-forward while live. */
  skip(): void {
    if (!this.sim) return;
    if (this.player.live && !this.playing && !this.panel.isValid()) return;
    if (!this.player.live) {
      const next = this.player.nextEventTime(this.player.cursor);
      if (next !== null) this.seek(next); else this.goLive();
      return;
    }
    // From the frame on screen, not the simulation: a point-mass simulation runs up to a step
    // ahead of it (T02), 60 s in a high coast, and there it had already started the burn, so
    // Skip jumped a minute into the burn instead of to 20 s before it.
    const f = this.recorder.recordNow();
    if (f.status === 'coast' && f.nextBurnTime > f.t) this.fastForwardTo = f.nextBurnTime - 20;
    else if (f.status === 'orbit' && isFinite(f.elements.period)) this.fastForwardTo = f.t + f.elements.period;
    else if (f.status === 'prelaunch') this.fastForwardTo = 0;
    else this.fastForwardTo = f.t + 60;
    if (!this.playing) this.togglePlay();
  }

  /** Back to the previous recorded event (entering replay from live). */
  previousEvent(): void {
    if (!this.sim) return;
    const prev = this.player.prevEventTime(this.player.cursor);
    this.seek(prev !== null ? prev : this.player.startTime);
  }

  /** Build a paused simulation so the vehicle is shown on the pad. */
  preview(cfg: MissionConfig): void {
    if (!this.scene) return;
    this.flightNo++;
    this.audio.reset();
    // every new flight drops the broadcast; `startWatch` puts its own back after launching
    this.soundtrack.set(null);
    this.watchSoundtrackId = null;
    // The workspace's mission outlives the tab (roadmap U01): every edit, from
    // the panel or over WebMCP, previews. The viewer's prepared launches do
    // not replace it until they are changed (audit 2026-09-27 A1).
    if (this.workspace.persists(this.missionDoc())) saveStoredMission(this.panel.missionState(), undefined, this.currentDesignRef());
    this.playing = false;
    this.panel.setRunning(false);
    this.fastForwardTo = null;
    let session: FlightSession;
    try {
      session = this.createSession(cfg);
      this.rigidControls.reset();
      this.toruControls.reset();
    } catch (err) {
      console.error(err);
      return;
    }
    this.session?.dispose();
    this.session = session;
    this.sim = session.sim;
    this.recorder = session.recorder;
    this.player.use(this.recorder);
    this.rateLastT = null;
    this.simView = createFrameSimView(this.sim);
    // a copy, like every other frame the views are handed: the pad frame is the
    // first entry of the recording and must not be reachable from the HUD
    const pad = cloneFrame(this.recorder.frames[0]);
    this.simView.setFrame(pad);
    this.shown = pad;
    this.timeline.reset();
    this.narration.reset();
    this.watch.reset();
    this.watchPayloadKey = null;
    this.watchFollow = 'auto';
    this.focusDownT = -1;
    this.trailIdx = -1;
    this.wasLive = true;
    this.lastPhase = null;
    // R2.2: each launch in the viewer starts under its camera programme. The
    // workspace keeps the owner across previews, as it kept its programme switch.
    if (this.lean) { this.camPolicy.reset(); this.updateCameraOwner(); }
    // `updateVisuals` only writes the Live button when the mode *changes*, and
    // a fresh mission starts live — so the initial state has to be set here or
    // the button stays enabled until the first replay round trip.
    this.liveBtn.disabled = true;
    this.liveBtn.classList.remove('active');
    this.updatePlayButton();
    this.updateMissionName();
    this.setupViews();
  }

  /**
   * A session for `cfg`: in the physics worker, or on the main thread when the
   * worker cannot be had. A worker that fails before it has flown anything is
   * given up for the rest of the page, and the mission is rebuilt in-process.
   */
  private createSession(cfg: MissionConfig): FlightSession {
    if (this.physicsMode === 'worker') {
      if (this.physicsWorker === undefined) this.physicsWorker = createPhysicsWorker();
      const worker = this.physicsWorker;
      if (worker) {
        return new WorkerSession(cfg, worker, ++this.sessionCount,
          (message) => this.physicsFallback(cfg, message, worker),
          (message) => { console.error('physics worker:', message); this.playing = false; this.updatePlayButton(); });
      }
      this.physicsMode = 'inline';
    }
    return new InlineSession(cfg);
  }

  /** The worker could not fly the mission: fly it on the main thread instead. */
  private physicsFallback(cfg: MissionConfig, message: string, worker: SessionWorker): void {
    console.warn('Physics worker unavailable, flying on the main thread instead:', message);
    worker.terminate();
    if (this.physicsWorker === worker) this.physicsWorker = null;
    this.physicsMode = 'inline';
    const wasPlaying = this.playing;
    this.preview(cfg);
    if (wasPlaying) { this.playing = true; this.panel.setRunning(true); this.updatePlayButton(); }
  }

  private setupViews(): void {
    if (!this.sim) return;
    const sim = this.sim;
    // release the previous mission's GPU resources before building the new one
    if (this.rocket) {
      this.scene.scene.remove(this.rocket.group);
      this.rocket.dispose();
    }
    if (this.pad) {
      this.scene.scene.remove(this.pad.group);
      this.pad.dispose();
    }
    this.rocket = new RocketView(sim.vehicleSpec, sim.satellite, { humidity: SITE_HUMIDITY[sim.site.id], deorbit: sim.cfg.orbit.deorbit?.time });
    this.scene.scene.add(this.rocket.group);
    // V03: the smoke the flight leaves in the air, from its own recording
    if (this.trails) {
      this.scene.scene.remove(this.trails.mesh);
      this.trails.dispose();
    }
    this.trails = new ExhaustTrails(sim.vehicleSpec, sim.site.id, sim.cfg.dynamics, sim.plan.azimuthRotating);
    this.scene.scene.add(this.trails.mesh);
    // G06: a crewed Soyuz's escape, drawn when it fires
    if (this.escapeView) {
      this.scene.scene.remove(this.escapeView.group);
      this.escapeView.dispose();
      this.escapeView = null;
    }
    const fairing = sim.vehicleSpec.fairing;
    if (sim.escape.fitted && fairing) {
      this.escapeView = new EscapeView(fairing.diameter / 2, fairing.length, 'soyuz', fairing.noseLength);
      this.scene.scene.add(this.escapeView.group);
    } else if (sim.satellite.descent) {
      // C01: a capsule coming home from a suborbital flight (Mercury-Redstone 3)
      this.escapeView = new EscapeView(1, 1, sim.satellite.descent);
      this.scene.scene.add(this.escapeView.group);
    }
    for (const v of [this.csmView, this.descentStageView, this.ascentStageView, this.entryCmView, this.smView]) {
      if (!v) continue;
      this.scene.scene.remove(v.group);
      v.dispose();
    }
    this.csmView = this.descentStageView = this.ascentStageView = this.entryCmView = this.smView = null;
    if (this.stationView) {
      this.scene.scene.remove(this.stationView.group);
      this.stationView.dispose();
      this.stationView = null;
    }
    if (sim.rendezvous.enabled) {
      this.stationView = new StationView();
      this.scene.scene.add(this.stationView.group);
    }
    // V05: the pad the mission names, its launch table turned to the launch azimuth
    this.pad = new LaunchPadView(sim.site, sim.vehicleSpec, { padId: sim.cfg.padId, azimuth: sim.plan.azimuthRotating, dynamics: sim.cfg.dynamics });
    this.scene.scene.add(this.pad.group);
    if (this.recoveryScenery) {
      this.scene.scene.remove(this.recoveryScenery.group);
      this.recoveryScenery.dispose();
    }
    this.recoveryScenery = new RecoverySceneryView(sim.site);
    this.scene.scene.add(this.recoveryScenery.group);
    this.focusDebrisId = null;
    this.cams.reset();
    this.debrisView.clear();
    this.trail.clear();
    this.predicted.setPoints(EMPTY_POINTS);
    this.predictedOn = false;
    this.predictedFade = 0;
    this.predicted.setOpacity(0);
    this.predictedShape.a = NaN;
    // target orbit line
    const tg = sim.plan.target;
    const raan = tg.raan ?? sim.plan.raanExpected;
    const st = stateFromElements(tg.a, tg.e, tg.inclination, raan, tg.argp, 0);
    this.target.setPoints(sampleOrbit(elementsFromState(st.r, st.v), 240));
    // Everything that renders an event carries the same vehicle spec: the
    // stage and booster names on those events are English literals from
    // src/data and are translated by `localizeEventParams` at the point of
    // rendering (src/ui/names.ts).
    this.hud.setVehicle(sim.vehicleSpec);
    // C01: an unchanged historical flight draws the real one's events on the charts
    this.tel.setFlown(historicalFor({ ...sim.cfg, payloadMass: sim.cfg.payloadMassOverride })?.flown ?? null);
    this.timeline.setVehicle(sim.vehicleSpec);
    this.narration.setVehicle(sim.vehicleSpec);
    this.hud.reset();
    this.tel.reset();
    this.result.clear();
    this.flown.clear();
    this.rigidControls.reset();
    this.toruControls.reset();
    this.tel.setExportSource(sim);
    this.explosion.clear();
    // Pay this mission's shader compiles now, while the vehicle is sitting on
    // the pad, rather than as a multi-frame hitch part-way up the ascent.
    this.scene.prewarm();
  }

  launch(cfg: MissionConfig): void {
    if (!this.started || !this.panel.isValid()) return;
    this.preview(cfg);
    this.playing = true;
    this.panel.setRunning(true);
    this.updatePlayButton();
  }

  reset(): void {
    if (!this.started || !this.panel.isValid()) return;
    this.preview(this.panel.getConfig());
  }

  /**
   * The glow as the viewer last left it, or none at all on a GPU that cannot
   * draw it (no renderable half-float target): the button then says why
   * instead of toggling nothing.
   */
  private restoreGlow(): void {
    if (!this.scene.glowSupported) {
      this.glow.settle();
      this.setGlow(false);
      this.glowBtn.disabled = true;
      this.glowBtn.setAttribute('data-i18n-title', 'ctl.glowUnsupported');
      this.glowBtn.title = t('ctl.glowUnsupported');
      return;
    }
    let stored: string | null = null;
    try { stored = workspaceStorage().getItem(GLOW_STORAGE_KEY); } catch { /* storage blocked */ }
    if (stored === 'on' || stored === 'off') {
      this.glow.settle();
      this.setGlow(stored === 'on');
    }
  }

  /** Switch the bloom pass and keep the button's state in sync with it. */
  private setGlow(on: boolean): void {
    this.scene.setBloom(on);
    this.glowBtn.setAttribute('aria-pressed', String(on));
    this.glowBtn.classList.toggle('active', on);
  }

  /**
   * Let the frame rate decide whether the glow stays (see `GlowGovernor`).
   * Frames that measure something other than the renderer are left out: a
   * fast-forward spends up to 30 ms of every frame on physics, and a frame
   * longer than the 100 ms clamp is a tab coming back from the background.
   */
  private autoGlow(elapsedWall: number): void {
    const measuring = this.fastForwardTo === null && elapsedWall < 0.1 && document.visibilityState === 'visible';
    const action = this.glow.sample(elapsedWall, this.scene.bloomEnabled, measuring);
    if (action) this.setGlow(action === 'on');
    // V02: the scattering sky gets the same trial, once the glow's is over, so
    // the two never confound each other: still too slow → the gradient sky
    if (this.glow.settled || !this.scene.glowSupported) {
      const sky = this.skyGovernor.sample(elapsedWall, this.scene.physicalSkyEnabled, measuring);
      if (sky) this.scene.setPhysicalSky(sky === 'on');
    }
  }

  private frame(now: number): void {
    const elapsedWall = Math.max(0, (now - this.lastFrame) / 1000);
    const dtReal = Math.min(0.1, elapsedWall);
    this.lastFrame = now;
    this.autoGlow(elapsedWall);
    const sim = this.sim;
    const session = this.session;
    // The live flight runs whether or not the user is watching the head.
    if (sim && session && this.playing) {
      const target = this.fastForwardTo;
      if (target !== null && target > this.recorder.clock + 1e-3 && !sim.isFailed()) {
        // In the worker the chunks run on their own; on the main thread
        // `tick` spends up to 30 ms of this frame on them.
        session.fastForward(target);
        session.tick();
        if (!session.fastForwarding) this.fastForwardTo = null;
      } else {
        this.fastForwardTo = null;
        session.halt();
        // A wall-clock budget as well as a step budget, so a high warp cannot
        // spend the whole animation frame inside the integrator. The worker
        // has a thread of its own and may use most of a frame's worth.
        // The 0.1 s clamp on the frame time keeps a slow renderer from being
        // handed huge steps; with the physics off the main thread a slow
        // renderer no longer slows the flight, so the worker is asked for the
        // wall time that really passed (up to half a second — longer is a
        // tab coming back from the background, not a slow frame).
        const worker = session.kind === 'worker';
        const budget = worker ? Math.min(450, Math.max(8, 900 * elapsedWall)) : 8;
        session.advance((worker ? Math.min(0.5, elapsedWall) : dtReal) * this.warp, budget);
      }
    } else session?.halt();
    // Measured frame to frame: in the worker, the time asked for this frame
    // arrives before the next one.
    const simT = sim?.state.t ?? 0;
    const flown = this.rateLastT === null ? 0 : Math.max(0, simT - this.rateLastT);
    this.rateLastT = sim ? simT : null;
    if (sim?.rigidRuntime && this.playing && !sim.isFailed()) {
      this.rateWallSeconds += elapsedWall;
      this.rateSimSeconds += flown;
      // Replies from the worker arrive in bursts; average over a longer window there.
      if (this.rateWallSeconds >= (session?.kind === 'worker' ? 2 : 0.5)) {
        this.achievedWarp = this.rateSimSeconds / this.rateWallSeconds;
        this.rateWallSeconds = 0; this.rateSimSeconds = 0;
      }
    } else {
      this.achievedWarp = null;
      this.rateWallSeconds = 0; this.rateSimSeconds = 0;
    }
    const rateLabel = document.getElementById('achieved-warp');
    if (rateLabel) {
      rateLabel.hidden = !sim?.rigidRuntime || !this.player.live || this.achievedWarp === null;
      if (!rateLabel.hidden) rateLabel.textContent = t('ctl.achievedWarp', { rate: this.achievedWarp!.toFixed(2) });
    }
    // The replay cursor runs on its own clock; warp > 1 skips through frames.
    if (sim && !this.player.live && this.player.playing) this.player.advanceCursor(dtReal * this.replayWarp);
    if (this.mode === 'home') this.homeStage.update(dtReal);
    this.updateVisuals(dtReal);
    this.hudTimer += dtReal;
    if (this.hudTimer > 0.1) {
      this.hudTimer = 0;
      const replaying = !this.player.live;
      // The instrument card and the telemetry panel are not on screen in the
      // landing page or the viewer, and a 6-DOF flight wants the CPU they
      // would spend; both catch up on the first tick back in the workspace.
      if (!this.lean) this.hud.update(this.shown, this.recorder.events, this.activeWarp, replaying);
      this.narration.update(this.shown, this.recorder.events, {
        replay: replaying,
        playing: replaying ? this.player.playing : this.playing,
        armed: !!sim,
      });
      if (this.mode === 'home') this.home.tick();
      if (this.mode === 'watch') {
        this.watch.update(this.shown, this.recorder.events, {
          playing: this.playing && this.player.live,
          vehicle: sim?.vehicleSpec ?? null,
          follow: {
            available: !!this.shown?.debris.some((d) => d.alive && d.recovery?.target) || (!!this.shown && !!watchPilot(this.shown)),
            booster: this.focusDebrisId !== null,
            // C01: Vostok-1's pilot once he is out of the sphere: the button goes between him and the capsule
            crew: !!this.shown && !!watchPilot(this.shown),
          },
          subject: this.watchSubject(),
        });
      }
    }
    // The telemetry panel is handed the frame-backed view, not the live
    // simulation, so its charts, Δv budget, spent-stage list and event log stop
    // at the timeline cursor like everything else on screen. The live object is
    // given to it separately, for the CSV export of the whole flight.
    this.telTimer += dtReal;
    if (this.simView && this.telTimer > 0.5 && !this.lean) {
      this.telTimer = 0;
      this.tel.update(this.simView.sim, this.player.cursor, this.shown);
      this.rendezvousPlot.update(this.recorder.frames, this.shown);
      this.compare.update();
      this.result.update(this.simView.sim);
      this.flown.update(this.simView.sim);
      // Explore: a card a moment after the live flight's outcome; a lesson grades in its own strip
      const cfg = this.panel.state;
      this.debrief.update(this.flightNo, this.simView.sim, this.player.live, this.mode === 'explore' && !document.body.dataset.lesson,
        `${missionVehicle(cfg).name} · ${satelliteName(missionSatellite(cfg))}`, performance.now());
      this.lessons.update(); // E03
      // G07: during a rendezvous the spacecraft is flown by Kurs or by TORU, not by the ascent's six-DOF controls
      this.rigidControls.update(this.shown?.rendezvous ? undefined : this.shown?.rigid, this.player.live);
      this.toruControls.update(this.shown, this.player.live, this.mode === 'engineer');
    }
    this.syncLifecycle();
    if (this.loopInspector.isOpen) {
      this.loopInspector.update(this.shown, this.recorder.frames, this.player.cursor, this.player.live,
        this.player.live ? this.playing : this.player.playing, this.simView?.sim.telemetry ?? []);
    }
    requestAnimationFrame((n) => this.frame(n));
  }

  /** Keep the trail consistent with the cursor: extend forward, rebuild on a rewind. */
  /**
   * G07: the docking TV camera — beside the probe's tip, offset toward the
   * port's target as far as the target stands from the port, looking along the
   * docking axis, with the target's side up.
   */
  private dockingEye(frame: VisualFrame, rv: RendezvousState): { pos: THREE.Vector3; dir: Vec3; up: Vec3 } {
    const q = rv.station.q;
    const o = targetOffset(PORTS[rv.port]);
    const side = normalize(quatRotate(q, o));
    const at = add(scale(frame.dir, SPACECRAFT.probe + 0.2), scale(side, TARGET_OFFSET));
    return { pos: this.dockingEyePos.set(this.vehiclePos.x + at.x, this.vehiclePos.y + at.y, this.vehiclePos.z + at.z), dir: frame.dir, up: side };
  }

  private syncTrail(cursor: number, live: boolean, liveFrame: VisualFrame): void {
    const frames = this.recorder.frames;
    if (frames.length === 0) return;
    const target = this.recorder.indexAt(cursor);
    if (target < this.trailIdx) {
      this.trail.clear();
      this.trailIdx = -1;
    }
    for (let i = this.trailIdx + 1; i <= target; i++) {
      const f = frames[i];
      // (C01: a return on WGS-84 heights where the scene draws it, render/datum.ts)
      if (f.status !== 'prelaunch') this.trail.add(onEllipsoid(f) ? onDrawnSphere(f.r) : f.r);
    }
    this.trailIdx = target;
    if (live && liveFrame.status !== 'prelaunch') this.trail.add(liveFrame.r);
  }

  /**
   * Re-sample the predicted orbit only when its *shape* has moved — and only
   * draw it at all once there is an orbit to draw.
   *
   * The line used to switch on the moment `apoapsisAlt > 0 && e < 1`, which
   * during early ascent is a degenerate ellipse through the Earth's centre:
   * measured on Falcon 9 at T+20 s, apoapsis 1.4 km, periapsis -6 369.5 km,
   * e = 0.997. `sampleOrbit` drew that faithfully — as a near-straight white
   * streak clean across the viewport, through the vehicle, from about T+15 s
   * on every mission. It reads as a rendering artefact, not as a trajectory.
   *
   * `PREDICTED_MIN_PERIAPSIS` is the gate that matters: while the periapsis is
   * buried deep inside the planet the "orbit" is a needle on an axis through
   * the Earth's centre, whatever its apoapsis is. Requiring the periapsis above
   * -R/2 means the drawn ellipse has e <~ 0.35 at LEO apoapsis — measured, that
   * is T+472 s on the default Soyuz-2.1a (SECO 536), T+476 s on Falcon 9 and
   * T+415 s on Electron, i.e. the line appears as the upper stage shapes the
   * real orbit and then tracks it through every later burn. The apoapsis gate
   * is a second condition for the same reason, not an alternative to it.
   *
   * `sampleOrbit(el, 180)` solves Kepler 180 times and allocates 180 vectors.
   * Doing that on every animation frame is pure waste during a coast or in
   * orbit, where the ellipse is the same one it was a second ago — and it is
   * the single most expensive thing in the per-frame path while scrubbing a
   * long recording, because a scrub spends almost all of its time in exactly
   * those phases. Under thrust the tolerances are crossed immediately, so the
   * line still tracks a burn frame by frame.
   */
  private syncPredicted(frame: VisualFrame, dt: number): void {
    const el = frame.elements;
    const on = frame.status !== 'prelaunch' && frame.liftoff && el.e < 1
      && el.apoapsisAlt > PREDICTED_MIN_APOAPSIS
      && el.periapsisAlt > -R_EARTH * PREDICTED_MIN_PERIAPSIS;
    // Fade in rather than switch on, so the line arrives over half a second
    // instead of appearing between one frame and the next.
    this.predictedFade = on
      ? Math.min(1, this.predictedFade + dt / PREDICTED_FADE)
      : Math.max(0, this.predictedFade - dt / PREDICTED_FADE);
    this.predicted.setOpacity(this.predictedFade);
    if (!on) {
      // Hold the last sampled shape while it fades, then drop it.
      if (this.predictedOn && this.predictedFade <= 0) {
        this.predictedOn = false;
        this.predictedShape.a = NaN;
        this.predicted.setPoints(EMPTY_POINTS);
      }
      return;
    }
    const p = this.predictedShape;
    // C01: a return flown on WGS-84 heights is drawn on the drawn sphere (render/datum.ts), and so is its conic,
    // or the capsule and its trail would run up to 12 km off the line through Vostok-1's entry. The mapping
    // reads only the latitude, so the sampled shape stays good while the elements hold.
    const ellipsoid = onEllipsoid(frame);
    const moved = !this.predictedOn
      || ellipsoid !== p.ellipsoid
      || Math.abs(el.a - p.a) > Math.abs(p.a) * 2e-4
      || Math.abs(el.e - p.e) > 2e-4
      || Math.abs(el.i - p.i) > 2e-4
      || Math.abs(el.raan - p.raan) > 2e-4
      || Math.abs(el.argp - p.argp) > 2e-4;
    if (!moved) return;
    p.a = el.a; p.e = el.e; p.i = el.i; p.raan = el.raan; p.argp = el.argp; p.ellipsoid = ellipsoid;
    this.predictedOn = true;
    const pts = sampleOrbit(el, 180);
    this.predicted.setPoints(ellipsoid ? pts.map(onDrawnSphere) : pts);
  }

  /**
   * Follow the camera sequence.
   *
   * Frame-driven like the rest of the app, so it switches identically while
   * replaying. A manual choice is never undone here: since R2.2 it lasts
   * across phase changes until the user chooses Cinematic (`camPolicy`).
   */
  /**
   * Point the viewer's camera at the rocket or at a stage flying home (see
   * `watchFollow`), cutting to the exterior view on the stage and back to the
   * programme's view for the rocket's phase when it lets go.
   */
  private steerWatchFocus(frame: VisualFrame): void {
    const next = this.watchFocusTarget(frame);
    if (next === this.focusDebrisId) return;
    this.focusDebrisId = next;
    this.focusDownT = -1;
    const phase = flightPhase(frame);
    const view = this.camPolicy.onTarget(next !== null ? 'other' : 'vehicle', phase ? WATCH_CAMERA_PLAN[phase] : null, this.camMode);
    if (view) this.showCamera(view);
    this.cams.reset();
  }

  /** Height above the ground and speed over it of the stage the viewer follows. */
  private watchSubject(): { altitude: number; speed: number } | undefined {
    const d = this.focusDebrisId === null ? undefined : this.shown?.debris.find((x) => x.id === this.focusDebrisId);
    if (!d || !this.sim) return undefined;
    const r = Math.hypot(d.r.x, d.r.y, d.r.z);
    // ω × r with ω along +z, as `groundSpeed` does for the vehicle
    const vx = d.v.x + OMEGA_EARTH * d.r.y, vy = d.v.y - OMEGA_EARTH * d.r.x;
    // C01: Vostok-1's pilot, like the sphere, flies on WGS-84 heights
    const h = this.shown && onEllipsoid(this.shown) ? geodeticHeight(d.r) : r - R_EARTH;
    return { altitude: Math.max(0, h - this.sim.groundElevation(d.r)), speed: d.alive ? Math.hypot(vx, vy, d.v.z) : 0 };
  }

  /** The stage the viewer's camera should be on, or null for the rocket. */
  private watchFocusTarget(frame: VisualFrame): number | null {
    if (this.watchFollow === 'rocket') return null;
    // C01: Vostok-1. After the ejection the programme stays on the sphere through
    // its landing and WATCH_FOCUS_HOLD beyond (the landing event's own time, so a
    // replay cuts at the same instant), then goes to Gagarin and holds on him to
    // his own landing and after; the button pins one or the other.
    const pilot = watchPilot(frame);
    if (this.watchFollow === 'crew') return pilot?.id ?? null;
    if (pilot && this.watchFollow === 'auto') {
      const down = this.recorder.events.find((e) => e.key === 'evt.capsuleLanding' && e.t <= frame.t + 1e-6);
      return down && frame.t >= down.t + WATCH_FOCUS_HOLD ? pilot.id : null;
    }
    const home = frame.debris.filter((d) => d.recovery?.target && (d.alive || d.outcome === 'landed'));
    const current = home.find((d) => d.id === this.focusDebrisId);
    if (this.watchFollow === 'booster') return current?.id ?? home.find((d) => d.alive)?.id ?? home[0]?.id ?? null;
    if (current) {
      if (current.alive) return current.id;
      // held for a few seconds once it is down (a backward seek starts the wait again)
      if (this.focusDownT < 0 || frame.t < this.focusDownT) this.focusDownT = frame.t;
      if (frame.t - this.focusDownT < WATCH_FOCUS_HOLD) return current.id;
    }
    // A stage is worth cutting to once it is back in the air: its entry burn,
    // the fall and the landing.
    const next = home.find((d) => d.alive && (d.recovery!.phase === 'entry' || d.recovery!.phase === 'landing'));
    return next?.id ?? null;
  }

  private followCameraPlan(frame: VisualFrame): void {
    const phase = flightPhase(frame);
    if (phase === null || phase === this.lastPhase) return;
    this.lastPhase = phase;
    // The phases are the vehicle's: while a stage flown home is being
    // followed, they say nothing about where the camera should be.
    if (this.focusDebrisId !== null && frame.debris.some((d) => d.id === this.focusDebrisId)) return;
    // R2.2: the programme (the viewer's own, or the workspace's per-phase
    // plan) directs the view only while it owns the camera; a view the user
    // picked is kept until they choose Cinematic again.
    const view = this.camPolicy.onPhase((this.lean ? WATCH_CAMERA_PLAN : this.cameraPlan)[phase]);
    if (view) this.showCamera(view);
  }

  private updateVisuals(dt: number): void {
    const sim = this.sim;
    const scene = this.scene;
    const view = this.simView;
    if (!sim || !this.rocket || !this.pad || !view) {
      if (!this.sceneCovered) scene.render();
      return;
    }
    // One frame snapshot drives every view this tick: the live head when the
    // cursor follows the recorder, an interpolated recorded frame when not.
    const shown: VisualFrame = this.player.live
      ? this.recorder.recordNow()
      : this.player.frame() ?? this.recorder.recordNow();
    if (this.player.live) this.player.syncLive(shown.t);
    this.shown = shown;
    view.setFrame(shown);
    // C01: what the scene draws: a return flown on WGS-84 heights moved onto the drawn sphere (render/datum.ts)
    const frame = drawnFrame(shown);
    // G06: the abort is there on a crewed Soyuz, and live until the escape system stands down
    this.abortBtn.hidden = !sim.escape.fitted;
    this.abortBtn.disabled = !this.player.live || !this.abortArmed(frame);
    if (this.mode === 'watch') this.steerWatchFocus(frame);
    this.followCameraPlan(frame);
    if (this.wasLive !== this.player.live) {
      this.wasLive = this.player.live;
      this.liveBtn.disabled = this.player.live;
      this.liveBtn.classList.toggle('active', !this.player.live);
      this.warpSel.value = String(this.activeWarp);
      this.updatePlayButton();
    }
    this.timeline.setEvents(this.recorder.events);
    this.timeline.update(this.recorder.startTime, this.recorder.headTime, this.player.cursor, this.player.live);
    const focus = this.focusDebrisId === null ? undefined : frame.debris.find((d) => d.id === this.focusDebrisId);
    const focusR = focus ? focus.r : frame.r;
    const heardFrom = focus ? shown.debris.find((d) => d.id === focus.id)?.r ?? focusR : shown.r;
    scene.origin = { x: focusR.x, y: focusR.y, z: focusR.z };
    // the sun (and therefore every sky/exposure/shading decision) comes from the
    // frame's own epoch, so a replayed frame relights identically
    const sunDir = sunDirectionEci(frame.jd);
    // How dark it is *at the vehicle*, on the same curve the sky uses. Computed
    // here rather than read back off SceneManager because `scene.update` runs
    // at the end of this method, after the camera has moved — taking its sky
    // state would make the pad floodlights lag the sky by a frame and, worse,
    // make them a function of where the camera is instead of a function of the
    // frame. It drives the pad floodlights and the strength of the exhaust's
    // own light on the stack; both are what a night launch is lit by.
    const night = 1 - dayFactorAt(dot(normalize(frame.r), sunDir));
    this.pad.update(scene, frame, night);
    this.recoveryScenery?.update(scene, frame);
    // vehicle orientation: Y = body axis, Z = window side (horizontal), X = Y x Z
    //
    // The roll reference is the normal of the launch-azimuth plane, not
    // `cross(dir, up)`. The cross product is degenerate exactly where the
    // flight starts — on the pad the body axis IS the local vertical, so it
    // collapsed to zero, fell back to east, and then swung round to the true
    // normal as the vehicle pitched over: a roll snap through the pitch-over,
    // seen head-on by the onboard camera, which looks out of that very side.
    // The azimuth normal stays perpendicular to the body axis for the whole of
    // a nominal ascent, and re-orthogonalising it against `dir` each frame
    // keeps the basis square without carrying any state between frames — the
    // azimuth is a mission constant, so a replayed frame rolls identically.
    const { east, north, up } = enuFrame(frame.r);
    const az = sim.plan.azimuthRotating;
    const heading = addScaled(scale(east, Math.sin(az)), north, Math.cos(az));
    let side = cross(heading, up);
    side = addScaled(side, frame.dir, -dot(side, frame.dir));
    if (norm(side) < 0.05) side = cross(frame.dir, up);
    if (norm(side) < 0.05) side = east;
    side = normalize(side);
    const xAxis = normalize(cross(frame.dir, side));
    this.basis.makeBasis(
      this.bx.set(xAxis.x, xAxis.y, xAxis.z),
      this.by.set(frame.dir.x, frame.dir.y, frame.dir.z),
      this.bz.set(side.x, side.y, side.z),
    );
    this.rocket.group.quaternion.setFromRotationMatrix(this.basis);
    // The vehicle sits at the origin unless the camera is following something else.
    scene.toScene(frame.r, this.vehiclePos);
    this.rocket.group.position.copy(this.vehiclePos);
    if (frame.rigid) {
      const attitude = frame.rigid.attitudeQ;
      this.rocket.group.quaternion.set(attitude.x, attitude.y, attitude.z, attitude.w).multiply(MODEL_TO_BODY);
      const offset = quatRotate(attitude, frame.rigid.renderOffsetBody);
      this.rocket.group.position.set(this.vehiclePos.x + offset.x, this.vehiclePos.y + offset.y, this.vehiclePos.z + offset.z);
      side = quatRotate(attitude, v3(0, 0, 1));
    }
    const padVec = this.pad.group.position;
    const padDist = padVec.length();
    this.rocket.update(frame, { night });
    this.trails?.update(this.recorder.frames, frame.t, (p, out) => scene.toScene(p, out), night);
    // G06: after an abort the frame is the escaping body; the rocket it left is debris
    if (frame.abort) this.rocket.group.visible = false;
    if (this.stationView) {
      const rv = frame.rendezvous;
      this.stationView.group.visible = !!rv;
      if (rv) {
        scene.toScene(rv.station.r, this.stationView.group.position);
        this.stationView.group.quaternion.set(rv.station.q.x, rv.station.q.y, rv.station.q.z, rv.station.q.w);
      }
    }
    // C01: Columbia after the undocking, where its own flight has it: over Eagle's docking tunnel, nose down, as
    // it was docked, backing off to stationkeeping in the first two minutes — the drawing's offset, tens of
    // metres, beside the separation its maneuver opens
    const csm = frame.apollo?.csm;
    if (csm && !this.csmView) {
      this.csmView = buildCsm();
      this.scene.scene.add(this.csmView.group);
    }
    if (this.csmView) {
      this.csmView.group.visible = !!csm;
      if (csm && frame.apollo && APOLLO_ASCENT.includes(frame.apollo.phase)) {
        // (the rendezvous: where it is, its nose at the ascent stage)
        const toLm = normalize(sub(frame.r, csm.r));
        scene.toScene(csm.r, this.csmView.group.position);
        this.csmView.group.quaternion.setFromUnitVectors(this.bx.set(0, 1, 0), this.by.set(toLm.x, toLm.y, toLm.z));
      } else if (csm) {
        const moonUp = normalize(sub(csm.r, moonState(frame.jd).r));
        const since = frame.t - APOLLO11.undocking.t;
        const lift = LM_HEIGHT + CSM_LENGTH + 0.3 + 25 * Math.min(1, Math.max(0, since) / 120);
        scene.toScene(addScaled(csm.r, moonUp, lift), this.csmView.group.position);
        this.csmView.group.quaternion.setFromUnitVectors(this.bx.set(0, 1, 0), this.by.set(-moonUp.x, -moonUp.y, -moonUp.z));
      }
    }
    // C01: the descent stage where Eagle landed, from the lift-off on; the ascent stage after its jettison
    const site = frame.apollo?.landed && !APOLLO_LM.includes(frame.apollo.phase) ? frame.apollo.landed : null;
    if (site && !this.descentStageView) {
      this.descentStageView = buildDescentStage();
      this.scene.scene.add(this.descentStageView.group);
    }
    if (this.descentStageView) {
      this.descentStageView.group.visible = !!site;
      if (site) {
        const rel = selenographicToEci(site.lat, site.lon, APOLLO11.siteRadius, frame.jd), up = normalize(rel);
        scene.toScene(add(moonState(frame.jd).r, rel), this.descentStageView.group.position);
        this.descentStageView.group.quaternion.setFromUnitVectors(this.bx.set(0, 1, 0), this.by.set(up.x, up.y, up.z));
      }
    }
    // C01: the command module home: drawn on its own, heat shield first, then under its parachutes; the service module off it
    const cmHome = !!frame.apollo && APOLLO_CM.includes(frame.apollo.phase);
    if (cmHome && !this.entryCmView) {
      this.entryCmView = buildEntryCm();
      this.scene.scene.add(this.entryCmView.group);
    }
    if (this.entryCmView) {
      this.entryCmView.group.visible = cmHome;
      if (cmHome) {
        this.rocket.group.visible = false;
        this.entryCmView.group.position.copy(this.vehiclePos);
        this.entryCmView.group.quaternion.setFromUnitVectors(this.bx.set(0, 1, 0), this.by.set(frame.dir.x, frame.dir.y, frame.dir.z));
        this.entryCmView.setChutes(frame.apollo!.entry?.drogue ?? 0, frame.apollo!.entry?.main ?? 0);
        this.entryCmView.setGlow(frame.altitude, frame.apollo!.phase === 'entry' ? frame.airspeed : 0);
      }
    }
    const sm = frame.apollo?.serviceModule;
    if (sm && !this.smView) {
      this.smView = buildServiceModule();
      this.scene.scene.add(this.smView.group);
    }
    if (this.smView) {
      this.smView.group.visible = !!sm;
      if (sm) {
        const toCm = normalize(sub(frame.r, sm.r));
        scene.toScene(sm.r, this.smView.group.position);
        this.smView.group.quaternion.setFromUnitVectors(this.bx.set(0, 1, 0), this.by.set(toCm.x, toCm.y, toCm.z));
      }
    }
    const as = frame.apollo?.ascentStage;
    if (as && !this.ascentStageView) {
      this.ascentStageView = buildAscentStage();
      this.scene.scene.add(this.ascentStageView.group);
    }
    if (this.ascentStageView) {
      this.ascentStageView.group.visible = !!as;
      if (as) {
        const out = normalize(sub(as.r, frame.r));
        scene.toScene(as.r, this.ascentStageView.group.position);
        this.ascentStageView.group.quaternion.setFromUnitVectors(this.bx.set(0, 1, 0), this.by.set(-out.x, -out.y, -out.z));
      }
    }
    if (this.escapeView) {
      this.escapeView.group.position.copy(this.rocket.group.position);
      this.escapeView.group.quaternion.copy(this.rocket.group.quaternion);
      this.escapeView.update(frame);
    }
    // Size of the object actually being tracked: the stack now, the spacecraft
    // after payload separation. It frames the camera, decides when the space
    // view's marker takes over, and scales the break-up effect.
    // (C01: from the undocking, Eagle, its ascent stage, the two docked again, Columbia)
    const apolloSize = apolloViewSize(frame.apollo);
    const height = frame.abort && this.escapeView ? this.escapeView.size(frame)
      : apolloSize ? apolloSize.height
      : frame.payloadSeparated ? Math.max(3, frame.payloadHeight ?? 3) : this.rocket.currentHeight(frame);
    this.explosion.update(scene, frame, this.recorder.events, dt, height);
    // lines
    this.syncTrail(this.player.cursor, this.player.live, frame);
    this.trail.update(scene);
    this.syncGhost();
    this.syncPredicted(frame, dt);
    this.predicted.update(scene);
    this.target.update(scene);
    this.debrisView.update(frame.debris, frame.t);
    // camera
    const radius = frame.abort ? Math.min(2, height / 4) : apolloSize ? apolloSize.radius : frame.payloadSeparated ? Math.max(1, frame.payloadWidth ?? 2) : this.rocket.currentRadius(frame);
    const shake = frame.status === 'ascent' ? Math.min(1, frame.thrust / Math.max(1, frame.mass) / 25 + frame.q / 60e3) : frame.thrust > 0 ? 0.15 : 0;
    // G07: close to the station the exterior view keeps it in the picture, and the onboard view is the docking TV camera;
    // the flight-path lines, kilometres long through the middle of that picture, stand aside
    const rv = frame.rendezvous;
    const nearStation = !!rv && !!this.stationView && rv.range < NEAR_STATION && rv.phase !== 'coast' && rv.phase !== 'burn' && rv.phase !== 'separation';
    const docking = !!rv && nearStation && (rv.phase === 'approach' || rv.phase === 'flyaround' || rv.phase === 'stationkeeping' || rv.phase === 'final' || rv.phase === 'retreat');
    // C01: Eagle's lift-off watched from over it, looking down past it at the descent stage it leaves behind; the
    // braking and the station-keeping from behind it, looking past it at Columbia
    const ap = frame.apollo, apPhase = ap?.phase;
    const apolloPartner = apPhase === 'ascent' && ap!.moon.alt < 400 && this.descentStageView?.group.visible ? this.descentStageView.group.position
      : (apPhase === 'braking' || apPhase === 'stationkeeping' || (apPhase === 'terminal' && (ap!.rendezvous?.range ?? Infinity) < 3000))
        && this.csmView?.group.visible ? this.csmView.group.position : null;
    // (and the command module close up through the air: the lines, the whole way from the Moon, stand aside)
    const cmClose = !!apPhase && APOLLO_CM.includes(apPhase);
    this.trail.line.visible = !nearStation && !apolloPartner && !cmClose;
    this.predicted.setHidden(nearStation || !!apolloPartner || cmClose);
    if (focus) {
      // A stage flown home: framed on its own axis, over its own ground.
      const f = enuFrame(focus.r);
      const along = focus.rigid ? quatRotate(focus.rigid.attitudeQ, v3(0, 0, 1)) : cross(focus.dir, f.up);
      const fSide = norm(along) > 0.05 ? normalize(along) : f.east;
      const ground = sim.groundElevation(focus.r);
      // C01: Vostok-1's pilot: the seat on its small chute, then he and his canopies, framed up the risers; upright once down
      const crew = focus.visual.kind === 'pilot';
      this.cams.update(scene.camera, {
        pos: this.originV, up: f.up, east: f.east, north: f.north, dir: crew && !focus.alive ? f.up : focus.dir, side: fSide,
        height: crew ? crewViewSize(focus.crew) : focus.visual.length, radius: focus.visual.diameter / 2,
        earthCenter: scene.toScene(v3(0, 0, 0), this.earthC), shake: focus.burning ? 0.1 : 0,
        vDir: norm(focus.v) > 1 ? normalize(focus.v) : f.up,
        t: frame.t, phase: 'ascent', agl: norm(focus.r) - R_EARTH - ground,
      }, dt, R_EARTH);
    } else {
      // G06: under a parachute the camera frames the canopy above the capsule,
      // not the ground below its heat shield
      const canopy = frame.abort?.body === 'capsule' && (frame.abort.main > 0.2 || frame.abort.drogue > 0.2);
      // C01: Vostok's sphere has no axis worth aiming along: the pair spins at 30°/s after the retro burn and the
      // sphere tumbles on into the air, and the aim (`dir` times the size, ahead of the CG) would swing round with
      // it. The camera aims up the local vertical instead, until a canopy holds the sphere still.
      const steady = frame.abort?.body === 'capsule' && frame.abort.capsule === 'vostok' && !canopy;
      const vostokMate = vostokPartner(frame);
      // C01: at the Moon the camera's up and its ground are the Moon's
      const lunar = frame.apollo && APOLLO_AT_MOON.includes(frame.apollo.phase) ? sub(frame.r, moonState(frame.jd).r) : null;
      const ground = lunar ? enuFrame(lunar) : { up, east, north };
      this.cams.update(scene.camera, {
        pos: this.originV, up: ground.up, east: ground.east, north: ground.north, dir: canopy ? scale(frame.dir, -1) : steady ? up : frame.dir, side, height, radius,
        earthCenter: scene.toScene(v3(0, 0, 0), this.earthC), shake: shake * 0.6,
        vDir: norm(frame.v) > 1 ? normalize(frame.v) : up,
        t: frame.t, phase: camPhase(frame), agl: lunar ? norm(lunar) - APOLLO11.siteRadius : frame.altitudeAGL,
        ...(nearStation ? { partner: this.stationView!.group.position } : apolloPartner ? { partner: apolloPartner }
          : vostokMate ? { partner: scene.toScene(vostokMate.r, this.mateV) } : {}),
        ...(docking && rv ? { dockingEye: this.dockingEye(frame, rv) } : {}),
      }, dt, R_EARTH);
    }
    // E01: the frames, where the camera looks at the vehicle from outside it
    const framesView = (this.mode === 'explore' || this.mode === 'engineer') && (this.camMode === 'exterior' || this.camMode === 'space');
    if (framesView) this.frames.update(frame, scene.camera, this.vehiclePos, this.earthC, sim.plan.azimuthRotating, getNotation(), !focus);
    else this.frames.group.visible = false;
    const camAlt = Math.hypot(scene.camera.position.x + scene.origin.x, scene.camera.position.y + scene.origin.y, scene.camera.position.z + scene.origin.z) - R_EARTH;
    // shadows are only worth casting while we are looking at the pad
    scene.setShadowFocus(padVec, this.pad.shadowRadius, camAlt < 40e3 && padDist < 30e3);
    // C01: Eagle's shadow on the Moon, from the last kilometres of the descent
    const lunarAlt = frame.apollo?.descent?.alt ?? (frame.apollo?.phase === 'landed' ? 0 : frame.apollo?.phase === 'ascent' ? frame.apollo.moon.alt : Infinity);
    if (lunarAlt < 200) scene.setShadowFocus(this.vehiclePos, 60, true);
    // C01: Vostok-1 over the ground it comes down on (render/steppe.ts): the shadow map kept on the body the camera
    // follows, so the sphere, Gagarin and their canopies throw their shadows on the fields from the last few hundred
    // metres, and no map left from the pad, a world away and read in the scene's moved axes, darkens them
    if (onEllipsoid(frame) && norm(focusR) - R_EARTH < 30e3) scene.setShadowFocus(this.originV, 40, true, VOSTOK_SHADOW_BIAS);
    // `height` is the size of the object actually being tracked — the stack
    // now, the spacecraft after payload separation. Without it the space view's
    // marker swaps in at a hard-coded 55 m, which is wrong by more than 10x for
    // a 3 m CubeSat carrier and by 2x for Starship (render hand-off).
    // C01: the Moon, for a flight to it
    if (frame.apollo) scene.setMoon(moonState(frame.jd).r, moonBodyToEci(frame.jd));
    else scene.setMoon(null);
    scene.update(frame, sunDir, camAlt, height);
    // V01: what the camera hears — the map has no listener, so it is silent
    const cam = scene.camera.position, origin = scene.origin;
    // V02: the exhaust lit by a sun the ground no longer sees
    const camR = Math.hypot(cam.x + origin.x, cam.y + origin.y, cam.z + origin.z) || 1;
    const camSunElev = ((cam.x + origin.x) * sunDir.x + (cam.y + origin.y) * sunDir.y + (cam.z + origin.z) * sunDir.z) / camR;
    this.twilight.update(frame, scene.toScene(frame.r, this.twilightPos), frame.dir, sunDir, camSunElev, scene.camera);
    this.audio.update({
      t: frame.t, frameAt: (x) => this.player.frameAt(x), events: this.recorder.events,
      // (the sounds come from the frames as flown: the camera, about the body it is on, put back by that body's
      // own place there, for a return drawn off its WGS-84 heights, render/datum.ts)
      listener: { x: cam.x + heardFrom.x, y: cam.y + heardFrom.y, z: cam.z + heardFrom.z },
      warp: this.activeWarp, playing: this.camMode !== 'map' && (this.player.live ? this.playing : this.player.playing),
      onboard: this.camMode === 'onboard',
      // scene axes are the frames' ECI axes, and the camera has no parent: its quaternion turns ECI into its head
      orientation: scene.camera.quaternion,
      suppressed: this.soundtrack.sounding,
    });
    this.soundtrack.update(frame.t, this.activeWarp, this.player.live ? this.playing : this.player.playing, this.audio.on);
    // The map and the onboard overlay still take a `Simulation` (they belong to
    // another wave), so they are handed a frame-backed view of this mission
    // rather than the live object: everything they read — clock, state vector,
    // ground track, debris, event log — is the frame on screen.
    if (this.sceneCovered) {
      // an opaque page covers the scene: the flight flies on, undrawn
    } else if (this.camMode === 'map') {
      this.map.draw(view.sim, sim.site.latitude, sim.site.longitude, Math.max(0, this.sbHeight));
    } else {
      scene.render();
      // the Soyuz's TV camera sends a black-and-white picture
      const tv = this.camMode === 'onboard' && docking && !!rv;
      if (tv !== this.tvPicture) { this.tvPicture = tv; this.glCanvas.style.filter = tv ? 'grayscale(1) contrast(1.12)' : ''; }
      if (this.camMode === 'onboard' && docking && rv) this.onboard.drawDocking(rv, Math.max(0, this.sbHeight));
      else if (this.camMode === 'onboard') this.onboard.draw(view.sim, !!sim.satellite.crewed, Math.max(0, this.sbHeight));
    }
  }
}

/**
 * Start-up's steps as performance marks (`orbitlab:<step>`), read by the
 * browser journeys' failure diagnostics (tests/browser/harness.mjs): when a
 * reload is slow, they say which step it waited on. Marks only — nothing
 * depends on them.
 */
/**
 * G2 hold (F5): under this height (CSS px) the scene's narration shows the
 * phase name only; its prose and latest-event line would cover the picture
 * (at 1100x650 they took over half of a 260 px scene).
 */
const SHORT_SCENE_PX = 380;

function markStartup(step: string): void {
  try { performance.mark(`orbitlab:${step}`); } catch { /* no performance API */ }
}

async function bootstrap(): Promise<void> {
  markStartup('bootstrap');
  await initializeWorkspace();
  markStartup('workspace');
  initLang();
  stampDocument();
  initNotation();
  // U06: every chart the app draws can be saved as a PNG
  enableChartExport();
  const app = new App();
  // U07: a notation chosen in the Engineer mode (or changed with the language)
  // relabels everything the language does.
  onNotationChange(() => app.applyLanguage());
  // exposed for automated testing / console experiments
  (window as unknown as { orbitlab: App }).orbitlab = app;
  // WebMCP tools (src/mcp.ts): optional, never blocks startup on failure.
  // Registered only once `init()` resolves — `App.preview`/`launch` reach
  // `this.scene`/`this.debrisView`, which init() assigns and which do not
  // exist before it (review minor: a mission-mutating tool call during texture
  // load would otherwise throw a TypeError out of the tool and leave the app
  // half-initialised).
  markStartup('app');
  await app.init();
  registerMcpTools(app);
}
void bootstrap().catch((err) => {
  console.error(err);
  showStartupError(err);
});
