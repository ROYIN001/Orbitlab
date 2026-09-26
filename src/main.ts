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
import { MISSION_PARAM, decodeMissionParam, loadStoredMission, missionDocument, saveStoredMission } from './config/mission-file';
import { SceneManager, loadEarthTextures, type EarthTextures } from './render/scene';
import { dayFactorAt } from './render/sky';
import { RocketView } from './render/rocket';
import { DebrisView } from './render/debris';
import { TrailLine, OrbitLine } from './render/lines';
import { LaunchPadView } from './render/launchpad';
import { RecoverySceneryView } from './render/recovery';
import { CameraController, type CameraMode, type CamPhase } from './render/cameras';
import { SetupPanel } from './ui/panel';
import { HelpGuide } from './ui/help';
import { MissionResult } from './ui/mission-result';
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
import './ui/modes.css';
import './ui/orbit/playground.css';
import { WatchView } from './ui/watch';
import {
  HOME_ROUTE, experienceForMode, hashForRoute, initialRoute, launchMode, loadRoute, route, routeFromHash, sameRoute, saveRoute,
  DEFAULT_LEVEL, type AppLevel, type AppMode, type AppRoute, type AppSection,
} from './ui/app-mode';
import { SectionScreen } from './ui/section-screen';
import { OrbitPlayground } from './ui/orbit/playground';
import { DataDialog } from './ui/data-dialog';
import { applyWebFonts } from './ui/web-fonts';
import { loadDataMode, saveDataMode, type DataMode } from './provider/data-mode';
import { CacheStorageRecent, createDataProvider, type DataProvider, type RecentCaches } from './provider/data-provider';
import { isPlannedSection } from './ui/section-plan';
import { FEATURED_WATCH_MISSION, watchMissionById, watchMissionSettings, type WatchMissionId } from './ui/watch-missions';
import { PhysicsDialog, CameraDialog, DEFAULT_CAMERA_PLAN, type CameraPlan, type FlightPhase } from './ui/dialogs';
import { Simulation } from './physics/simulation';
import { cloneFrame, type VisualFrame } from './physics/frame';
import { FlightRecorder, type RecordingSource } from './replay/recorder';
import { InlineSession, WorkerSession, createPhysicsWorker, type FlightSession, type SessionWorker } from './session/session';
import { ReplayPlayer } from './replay/player';
import { ExplosionEffect } from './replay/explosion';
import { ExhaustTrails, SITE_HUMIDITY } from './render/trails';
import { createFrameSimView, type FrameSimView } from './replay/simview';
import { sunDirectionEci, julianDate, enuFrame, sampleOrbit, stateFromElements, elementsFromState } from './physics/orbital';
import { OMEGA_EARTH, R_EARTH, RAD } from './physics/constants';
import { add, normalize, cross, dot, norm, scale, addScaled, v3, type Vec3 } from './physics/vec3';
import { missionVehicle } from './data/vehicles';
import { satelliteById } from './data/satellites';
import { satelliteName } from './ui/names';
import type { MissionConfig } from './types';
import { registerMcpTools } from './mcp';
import { getNotation, initNotation, onNotationChange } from './ui/notation';
import { FramesView } from './render/frames';
import { EscapeView } from './render/escape';
import { StationView } from './render/station';
import { PORTS, TARGET_OFFSET, targetOffset } from './physics/rendezvous/ports';
import { SPACECRAFT } from './physics/rendezvous/profiles';
import type { RendezvousState } from './physics/sim/rendezvous';
import { RendezvousPlot } from './ui/rendezvous-plot';
import { ToruControls } from './ui/toru-controls';
import { FramesMenu, frameSymbols } from './ui/frames-menu';
import { GlowGovernor } from './render/glow-governor';
import { quatRotate } from './physics/rigid/math';

/** The viewer's own choice of glow, remembered between visits. */
const GLOW_STORAGE_KEY = 'orbitlab.glow';

/** Proper rotation: rendered +Y nose to physics +X nose, no reflection. */
const MODEL_TO_BODY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);

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
  rigidControls: RigidControls;
  /** G07: the TORU hand controllers */
  toruControls!: ToruControls;
  map: OrbitalMap;
  onboard: OnboardOverlay;
  timeline: Timeline;
  narration: Narration;
  cams = new CameraController();
  panel: SetupPanel;
  home: HomeScreen;
  watch: WatchView;
  /** S01: the Build section while it is being built */
  private sectionScreen: SectionScreen;
  /** O01: the Orbit section's playground */
  private playground: OrbitPlayground;
  /** the Earth's textures, loaded once for the launch scene and the playground's 3-D view */
  private earthTextures: Promise<EarthTextures> | null = null;
  /** which section and level of the app is showing (src/ui/app-mode.ts) */
  route: AppRoute = HOME_ROUTE;
  /** the level last shown in any section, for the section links from the landing page */
  private levelMemory: AppLevel = DEFAULT_LEVEL;
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
  /** P07: the long-term orbit window */
  private lifetime = new LifetimeDialog();
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
  /** per-phase camera programme and its master switch */
  cameraPlan: CameraPlan = { ...DEFAULT_CAMERA_PLAN };
  autoCamera = true;
  /** mission time to fast-forward to, or null when not fast-forwarding */
  fastForwardTo: number | null = null;
  lastFrame = performance.now();
  hudTimer = 0;
  telTimer = 0;
  explosion = new ExplosionEffect();
  /** V03: exhaust trails */
  private trails: ExhaustTrails | null = null;
  viewport: HTMLElement;
  glCanvas: HTMLCanvasElement;
  mapCanvas: HTMLCanvasElement;
  obCanvas: HTMLCanvasElement;
  private physicsDialog: PhysicsDialog;
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
  private wasLive = true;
  /** the flight phase the camera sequence last acted on */
  private lastPhase: FlightPhase | null = null;
  /** index of the last recorded frame fed to the trail line */
  private trailIdx = -1;
  /** elements the predicted-orbit line was last sampled for (see syncPredicted) */
  private predictedShape = { a: NaN, e: NaN, i: NaN, raan: NaN, argp: NaN };
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
   * stage flown home for its entry, landing and a few seconds after), or
   * whichever the viewer picked with the follow button, for the rest of the
   * flight.
   */
  private watchFollow: 'auto' | 'rocket' | 'booster' = 'auto';
  /** mission time the followed stage was first seen down, s (-1 while it flies) */
  private focusDownT = -1;
  /** the viewer mission's payload as flown (i18n key), in place of the catalogue name */
  private watchPayloadKey: string | null = null;
  private vehiclePos = new THREE.Vector3();
  private earthC = new THREE.Vector3();

  constructor() {
    new HelpGuide(document.getElementById('first-use-guide')!, document.getElementById('btn-help') as HTMLButtonElement);
    this.result = new MissionResult(document.getElementById('mission-result')!, { onSeek: time => this.seek(time) });
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
      onChange: (cfg) => { if (!this.playing) this.preview(cfg); },
      onExperience: (experience) => this.go(route('launch', experience === 'advanced' ? 'engineer' : 'explore')),
      onMonteCarlo: (opener) => this.monteCarlo.open(opener),
    });
    this.monteCarlo = new MonteCarloWindow({ config: () => this.panel.getConfig() });
    this.home = new HomeScreen(document.getElementById('home-screen')!, {
      watchFeatured: () => { this.go(route('launch', 'watch')); this.startWatch(FEATURED_WATCH_MISSION); },
      go: (r) => this.go(r),
    });
    this.sectionScreen = new SectionScreen(document.getElementById('section-screen')!, { go: (r) => this.go(r) });
    this.playground = new OrbitPlayground(document.getElementById('orbit-playground')!, {
      go: (r) => this.go(r),
      // S03: the hand-off's orbit, carried on for years (P07)
      lifetime: (h, opener) => this.lifetime.openFor(h, opener),
      textures: () => (this.earthTextures ??= loadEarthTextures(base)),
      mapUrl: `${base}textures/earth_atmos_2048.jpg`,
      // R02: the satellite catalogue comes through the data mode chosen
      data: () => this.dataProvider,
    });
    this.watch = new WatchView(document.getElementById('watch-ui')!, {
      start: (id) => this.startWatch(id),
      togglePlay: () => this.togglePlay(),
      setWarp: (warp) => this.setWarp(warp),
      explore: () => this.go(route('launch', 'explore')),
      continueInOrbit: () => this.continueInOrbit(),
      follow: (target) => { this.watchFollow = target; },
      pickerFooter: () => this.soundtrackPanel.render(),
    });
    this.physicsDialog = new PhysicsDialog(document.getElementById('physics-dialog') as HTMLDialogElement);
    this.cameraDialog = new CameraDialog(document.getElementById('camera-dialog') as HTMLDialogElement, {
      plan: this.cameraPlan,
      isAuto: () => this.autoCamera,
      setAuto: (on) => { this.autoCamera = on; },
      onChange: (phase, mode) => {
        this.cameraPlan[phase] = mode;
        // Apply straight away when it is the phase we are in, so the dialog is
        // a live preview rather than a form to submit.
        if (this.autoCamera && this.lastPhase === phase) this.setCamera(mode);
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

  /**
   * S01: point every section link at the level showing (or last used) and
   * every level link at the section showing — the launch section's from the
   * landing page, where those links always led — and mark the current ones.
   */
  private syncNav(): void {
    const level = this.lastLevel();
    const section: AppSection = this.route.section ?? 'launch';
    document.querySelectorAll<HTMLAnchorElement>('#section-nav a').forEach((a) => {
      const name = a.dataset.section as AppSection | 'home';
      a.href = name === 'home' ? hashForRoute(HOME_ROUTE) : hashForRoute(route(name, level));
      if (name === (this.route.section ?? 'home')) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.querySelectorAll<HTMLAnchorElement>('#mode-nav a').forEach((a) => {
      const mode = a.dataset.mode as AppLevel;
      a.href = hashForRoute(route(section, mode));
      if (this.route.section !== null && mode === this.route.mode) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /** O01: the Orbit section's playground is drawn over the whole scene, which need not be drawn under it. */
  private get sceneCovered(): boolean {
    return this.route.section === 'orbit';
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
    // O01: the Orbit section is its playground; the Build section is still its plan (S01)
    const orbit = next.section === 'orbit';
    const planned = isPlannedSection(next.section) && !orbit;
    document.getElementById('section-screen')!.hidden = !planned;
    if (planned) this.sectionScreen.show(next.section as 'build', next.mode as AppLevel);
    document.getElementById('orbit-playground')!.hidden = !orbit;
    if (orbit) this.playground.show(next.mode as AppLevel);
    else this.playground.hide();
    const experience = experienceForMode(mode);
    if (experience) this.panel.setExperience(experience);
    this.rigidControls.setInspectorAvailable(mode === 'engineer');
    this.tel.setEquationLevel(mode === 'engineer' ? 'engineer' : 'explore'); // E02
    if (mode !== 'engineer') this.loopInspector.close();
    if (mode !== 'engineer') this.monteCarlo.close(); // G05: a running set flies on
    document.getElementById('home-screen')!.hidden = next.section !== null;
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
    this.panel.loadMission(watchMissionSettings(id));
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
    this.scene = new SceneManager(this.glCanvas, tex);
    this.restoreGlow();
    // V02: `?sky=gradient` keeps the old sky, for comparison or a GPU the trial misjudges
    if (new URLSearchParams(location.search).get('sky') === 'gradient') { this.scene.setPhysicalSky(false); this.skyGovernor.settle(); }
    this.debrisView = new DebrisView(this.scene);
    this.scene.scene.add(this.trail.line, this.predicted.line, this.target.line, this.frames.group, this.ghost.line, this.twilight.mesh);
    this.ghost.line.visible = false;
    this.cams.attach(this.viewport);
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(this.viewport);
    this.watchPixelRatio();
    this.resize();
    document.getElementById('loading')!.classList.add('hidden');
    // A mission link opens the workspace on its mission; otherwise the landing
    // page and the viewer open on the featured launch standing on its pad in
    // daylight, and the workspace on the mission it held when it was closed.
    if (await this.openMissionLink()) { /* previewed by the panel */ }
    else if (this.lean) this.panel.loadMission(watchMissionSettings(FEATURED_WATCH_MISSION));
    else {
      const stored = loadStoredMission();
      if (stored) this.panel.share.apply(stored, 'stored');
      else this.preview(this.panel.getConfig());
    }
    requestAnimationFrame((now) => this.frame(now));
    registerServiceWorker();
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
    return handoffFromFlight({
      frame: f, satellite: sat, payloadMass: sim.cfg.payloadMassOverride ?? sat.mass,
      spacecraftStage: own && spec ? { dryMass: spec.dryMass, propellant: own.propellantFraction * spec.propellantMass } : null,
      vehicleName: sim.vehicleSpec.name,
      mission: missionDocument(this.panel.missionState()),
      label: t('life.start', { sat: satelliteName(sat), pe: (el.periapsisAlt / 1000).toFixed(0), ap: (el.apoapsisAlt / 1000).toFixed(0),
        inc: (el.i * RAD).toFixed(1), t: f.t.toFixed(0) }),
    });
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
      label, mission: missionDocument(this.panel.missionState()), launchJd: julianDate(sim.cfg.launchTime),
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
    await downloadFlightReport({
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
    const parsed = this.panel.share.apply(raw, 'link');
    if (!parsed.usable) this.preview(this.panel.getConfig());
    return true;
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
    this.scene.resize(w, h);
    this.trail.setResolution(w, h);
    this.predicted.setResolution(w, h);
    this.target.setResolution(w, h);
    this.frames.setResolution(w, h);
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
    document.querySelectorAll<HTMLButtonElement>('.cam-btn').forEach((b) => {
      b.addEventListener('click', () => this.setCamera(b.dataset.cam as CameraMode));
    });
    document.getElementById('btn-reset-cam')!.addEventListener('click', () => { this.cams.reset(); });
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
      try { localStorage.setItem(GLOW_STORAGE_KEY, this.scene.bloomEnabled ? 'on' : 'off'); } catch { /* preference is optional */ }
    });
    document.getElementById('btn-fullscreen')!.addEventListener('click', () => void this.toggleFullscreen());
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
    document.getElementById('btn-physics')!.addEventListener('click', (e) => this.physicsDialog.open(e.currentTarget as HTMLElement));
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
    if (this.physicsDialog.isOpen || this.cameraDialog.isOpen) return;
    // O01: the Orbit section's playground has its own clock
    if (this.route.section === 'orbit') { this.playground.onKey(e); return; }
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
    this.watch.applyLanguage();
    this.sectionScreen.applyLanguage();
    this.playground.applyLanguage();
    this.syncDataMode();
    if (this.dataDialog.el.open) this.dataDialog.applyLanguage();
    document.getElementById('camera-tabs')?.setAttribute('aria-label', t('a11y.cameraGroup'));
    document.getElementById('controls')?.setAttribute('aria-label', t('a11y.playback'));
    // icon-only buttons take their accessible name from the same key as the tooltip
    document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((node) => node.setAttribute('aria-label', node.title));
    this.viewport.setAttribute('aria-label', t('a11y.viewport'));
    this.warpSel?.setAttribute('aria-label', t('ctl.warp'));
    this.framesMenu?.applyLanguage();
    // both dialogs rebuild their body from the dictionaries when opened; an
    // open one has to be rebuilt now
    if (this.physicsDialog.isOpen) this.physicsDialog.applyLanguage();
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
    // The vehicle keeps its proper name in every language; the payload is a
    // description ("Crewed spacecraft") and goes through the dictionaries.
    this.narration.setMission(missionVehicle(cfg).name,
      this.watchPayloadKey ? t(this.watchPayloadKey) : satelliteName(satelliteById(cfg.satelliteId)));
  }

  setCamera(mode: CameraMode): void {
    this.camMode = mode;
    this.cams.mode = mode;
    document.querySelectorAll<HTMLButtonElement>('.cam-btn').forEach((b) => {
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
    const s = this.sim.state;
    if (s.status === 'coast' && s.nextBurnTime > s.t) this.fastForwardTo = s.nextBurnTime - 20;
    else if (s.status === 'orbit' && isFinite(s.elements.period)) this.fastForwardTo = s.t + s.elements.period;
    else if (s.status === 'prelaunch') this.fastForwardTo = 0;
    else this.fastForwardTo = s.t + 60;
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
    this.audio.reset();
    // every new flight drops the broadcast; `startWatch` puts its own back after launching
    this.soundtrack.set(null);
    this.watchSoundtrackId = null;
    // The workspace's mission outlives the tab (roadmap U01): every edit, from
    // the panel or over WebMCP, previews. The viewer's prepared launches do
    // not replace it.
    if (!this.lean) saveStoredMission(this.panel.missionState());
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
    this.rocket = new RocketView(sim.vehicleSpec, sim.satellite, { humidity: SITE_HUMIDITY[sim.site.id] });
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
      this.escapeView = new EscapeView(fairing.diameter / 2, fairing.length);
      this.scene.scene.add(this.escapeView.group);
    }
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
    this.timeline.setVehicle(sim.vehicleSpec);
    this.narration.setVehicle(sim.vehicleSpec);
    this.hud.reset();
    this.tel.reset();
    this.result.clear();
    this.rigidControls.reset();
    this.toruControls.reset();
    this.tel.setExportSource(sim);
    this.explosion.clear();
    // Pay this mission's shader compiles now, while the vehicle is sitting on
    // the pad, rather than as a multi-frame hitch part-way up the ascent.
    this.scene.prewarm();
  }

  launch(cfg: MissionConfig): void {
    if (!this.panel.isValid()) return;
    this.preview(cfg);
    this.playing = true;
    this.panel.setRunning(true);
    this.updatePlayButton();
  }

  reset(): void {
    if (!this.panel.isValid()) return;
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
    try { stored = localStorage.getItem(GLOW_STORAGE_KEY); } catch { /* storage blocked */ }
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
      if (target !== null && target > sim.state.t + 1e-3 && !sim.isFailed()) {
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
      if (this.mode === 'watch') {
        this.watch.update(this.shown, this.recorder.events, {
          playing: this.playing && this.player.live,
          vehicle: sim?.vehicleSpec ?? null,
          follow: {
            available: !!this.shown?.debris.some((d) => d.alive && d.recovery?.target),
            booster: this.focusDebrisId !== null,
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
      // G07: during a rendezvous the spacecraft is flown by Kurs or by TORU, not by the ascent's six-DOF controls
      this.rigidControls.update(this.shown?.rendezvous ? undefined : this.shown?.rigid, this.player.live);
      this.toruControls.update(this.shown, this.player.live, this.mode === 'engineer');
    }
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
      if (f.status !== 'prelaunch') this.trail.add(f.r);
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
    const moved = !this.predictedOn
      || Math.abs(el.a - p.a) > Math.abs(p.a) * 2e-4
      || Math.abs(el.e - p.e) > 2e-4
      || Math.abs(el.i - p.i) > 2e-4
      || Math.abs(el.raan - p.raan) > 2e-4
      || Math.abs(el.argp - p.argp) > 2e-4;
    if (!moved) return;
    p.a = el.a; p.e = el.e; p.i = el.i; p.raan = el.raan; p.argp = el.argp;
    this.predictedOn = true;
    this.predicted.setPoints(sampleOrbit(el, 180));
  }

  /**
   * Follow the camera sequence.
   *
   * Frame-driven like the rest of the app, so it switches identically while
   * replaying. A manual choice is never undone here — it simply lasts until
   * the next phase change, which is how the Codex version behaved.
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
    this.setCamera(next !== null ? 'exterior' : phase ? WATCH_CAMERA_PLAN[phase] : this.camMode);
    this.cams.reset();
  }

  /** Height above the ground and speed over it of the stage the viewer follows. */
  private watchSubject(): { altitude: number; speed: number } | undefined {
    const d = this.focusDebrisId === null ? undefined : this.shown?.debris.find((x) => x.id === this.focusDebrisId);
    if (!d || !this.sim) return undefined;
    const r = Math.hypot(d.r.x, d.r.y, d.r.z);
    // ω × r with ω along +z, as `groundSpeed` does for the vehicle
    const vx = d.v.x + OMEGA_EARTH * d.r.y, vy = d.v.y - OMEGA_EARTH * d.r.x;
    return { altitude: Math.max(0, r - R_EARTH - this.sim.groundElevation(d.r)), speed: d.alive ? Math.hypot(vx, vy, d.v.z) : 0 };
  }

  /** The stage the viewer's camera should be on, or null for the rocket. */
  private watchFocusTarget(frame: VisualFrame): number | null {
    if (this.watchFollow === 'rocket') return null;
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
    // The viewer always directs its own camera; the workspace follows the
    // user's programme and its on/off switch.
    if (this.lean) this.setCamera(WATCH_CAMERA_PLAN[phase]);
    else if (this.autoCamera) this.setCamera(this.cameraPlan[phase]);
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
    const frame: VisualFrame = this.player.live
      ? this.recorder.recordNow()
      : this.player.frame() ?? this.recorder.recordNow();
    if (this.player.live) this.player.syncLive(frame.t);
    this.shown = frame;
    view.setFrame(frame);
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
    if (this.escapeView) {
      this.escapeView.group.position.copy(this.rocket.group.position);
      this.escapeView.group.quaternion.copy(this.rocket.group.quaternion);
      this.escapeView.update(frame);
    }
    // Size of the object actually being tracked: the stack now, the spacecraft
    // after payload separation. It frames the camera, decides when the space
    // view's marker takes over, and scales the break-up effect.
    const height = frame.abort && this.escapeView ? this.escapeView.size(frame)
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
    const radius = frame.abort ? Math.min(2, height / 4) : frame.payloadSeparated ? Math.max(1, frame.payloadWidth ?? 2) : this.rocket.currentRadius(frame);
    const shake = frame.status === 'ascent' ? Math.min(1, frame.thrust / Math.max(1, frame.mass) / 25 + frame.q / 60e3) : frame.thrust > 0 ? 0.15 : 0;
    // G07: close to the station the exterior view keeps it in the picture, and the onboard view is the docking TV camera;
    // the flight-path lines, kilometres long through the middle of that picture, stand aside
    const rv = frame.rendezvous;
    const nearStation = !!rv && !!this.stationView && rv.range < NEAR_STATION && rv.phase !== 'coast' && rv.phase !== 'burn' && rv.phase !== 'separation';
    const docking = !!rv && nearStation && (rv.phase === 'approach' || rv.phase === 'flyaround' || rv.phase === 'stationkeeping' || rv.phase === 'final' || rv.phase === 'retreat');
    this.trail.line.visible = !nearStation;
    this.predicted.setHidden(nearStation);
    if (focus) {
      // A stage flown home: framed on its own axis, over its own ground.
      const f = enuFrame(focus.r);
      const along = focus.rigid ? quatRotate(focus.rigid.attitudeQ, v3(0, 0, 1)) : cross(focus.dir, f.up);
      const fSide = norm(along) > 0.05 ? normalize(along) : f.east;
      const ground = sim.groundElevation(focus.r);
      this.cams.update(scene.camera, {
        pos: this.originV, up: f.up, east: f.east, north: f.north, dir: focus.dir, side: fSide,
        height: focus.visual.length, radius: focus.visual.diameter / 2,
        earthCenter: scene.toScene(v3(0, 0, 0), this.earthC), shake: focus.burning ? 0.1 : 0,
        vDir: norm(focus.v) > 1 ? normalize(focus.v) : f.up,
        t: frame.t, phase: 'ascent', agl: norm(focus.r) - R_EARTH - ground,
      }, dt, R_EARTH);
    } else {
      // G06: under a parachute the camera frames the canopy above the capsule,
      // not the ground below its heat shield
      const canopy = frame.abort?.body === 'capsule' && (frame.abort.main > 0.2 || frame.abort.drogue > 0.2);
      this.cams.update(scene.camera, {
        pos: this.originV, up, east, north, dir: canopy ? scale(frame.dir, -1) : frame.dir, side, height, radius,
        earthCenter: scene.toScene(v3(0, 0, 0), this.earthC), shake: shake * 0.6,
        vDir: norm(frame.v) > 1 ? normalize(frame.v) : up,
        t: frame.t, phase: camPhase(frame), agl: frame.altitudeAGL,
        ...(nearStation ? { partner: this.stationView!.group.position } : {}),
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
    // `height` is the size of the object actually being tracked — the stack
    // now, the spacecraft after payload separation. Without it the space view's
    // marker swaps in at a hard-coded 55 m, which is wrong by more than 10x for
    // a 3 m CubeSat carrier and by 2x for Starship (render hand-off).
    scene.update(frame, sunDir, camAlt, height);
    // V01: what the camera hears — the map has no listener, so it is silent
    const cam = scene.camera.position, origin = scene.origin;
    // V02: the exhaust lit by a sun the ground no longer sees
    const camR = Math.hypot(cam.x + origin.x, cam.y + origin.y, cam.z + origin.z) || 1;
    const camSunElev = ((cam.x + origin.x) * sunDir.x + (cam.y + origin.y) * sunDir.y + (cam.z + origin.z) * sunDir.z) / camR;
    this.twilight.update(frame, scene.toScene(frame.r, this.twilightPos), frame.dir, sunDir, camSunElev, scene.camera);
    this.audio.update({
      t: frame.t, frameAt: (x) => this.player.frameAt(x), events: this.recorder.events,
      listener: { x: cam.x + origin.x, y: cam.y + origin.y, z: cam.z + origin.z },
      warp: this.activeWarp, playing: this.camMode !== 'map' && (this.player.live ? this.playing : this.player.playing),
      onboard: this.camMode === 'onboard',
      suppressed: this.soundtrack.sounding,
    });
    this.soundtrack.update(frame.t, this.activeWarp, this.player.live ? this.playing : this.player.playing, this.audio.on);
    // The map and the onboard overlay still take a `Simulation` (they belong to
    // another wave), so they are handed a frame-backed view of this mission
    // rather than the live object: everything they read — clock, state vector,
    // ground track, debris, event log — is the frame on screen.
    if (this.sceneCovered) {
      // the Orbit section's playground covers the scene: the flight flies on, undrawn
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

initLang();
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
app.init().then(() => registerMcpTools(app)).catch((err) => {
  console.error(err);
  const el = document.getElementById('loading-text');
  if (el) {
    // Drop the i18n hook, or the next language change puts "Loading textures…"
    // back over the error message (audit B38).
    el.removeAttribute('data-i18n');
    el.textContent = t('misc.webglFailed', { error: (err as Error).message });
  }
  document.getElementById('loading')?.classList.remove('hidden');
});
