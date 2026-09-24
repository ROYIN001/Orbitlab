import * as THREE from 'three';
import { initLang, setLang, getLang, t, applyStatic, type Lang } from './i18n';
import { SceneManager, loadEarthTextures } from './render/scene';
import { dayFactorAt } from './render/sky';
import { RocketView } from './render/rocket';
import { DebrisView } from './render/debris';
import { TrailLine, OrbitLine } from './render/lines';
import { LaunchPadView } from './render/launchpad';
import { CameraController, type CameraMode, type CamPhase } from './render/cameras';
import { SetupPanel } from './ui/panel';
import { HelpGuide } from './ui/help';
import { MissionResult } from './ui/mission-result';
import { RigidControls } from './ui/rigid-controls';
import { LoopInspector } from './ui/loop-inspector';
import { Hud } from './ui/hud';
import { TelemetryPanel } from './ui/telemetry';
import { OrbitalMap } from './ui/map';
import { OnboardOverlay } from './ui/onboard';
import { Timeline } from './ui/timeline';
import { Narration } from './ui/narration';
import { HomeScreen } from './ui/home';
import './ui/modes.css';
import { WatchView } from './ui/watch';
import { experienceForMode, hashForMode, initialMode, modeFromHash, saveMode, type AppMode } from './ui/app-mode';
import { FEATURED_WATCH_MISSION, watchMissionSettings, type WatchMissionId } from './ui/watch-missions';
import { PhysicsDialog, CameraDialog, DEFAULT_CAMERA_PLAN, type CameraPlan, type FlightPhase } from './ui/dialogs';
import { Simulation } from './physics/simulation';
import { cloneFrame, type VisualFrame } from './physics/frame';
import { FlightRecorder, type RecordingSource } from './replay/recorder';
import { InlineSession, WorkerSession, createPhysicsWorker, type FlightSession, type SessionWorker } from './session/session';
import { ReplayPlayer } from './replay/player';
import { ExplosionEffect } from './replay/explosion';
import { createFrameSimView, type FrameSimView } from './replay/simview';
import { sunDirectionEci, enuFrame, sampleOrbit, stateFromElements, elementsFromState } from './physics/orbital';
import { R_EARTH } from './physics/constants';
import { normalize, cross, dot, norm, scale, addScaled, v3, type Vec3 } from './physics/vec3';
import { vehicleById } from './data/vehicles';
import { satelliteById } from './data/satellites';
import { satelliteName } from './ui/names';
import type { MissionConfig } from './types';
import { registerMcpTools } from './mcp';
import { initNotation, onNotationChange } from './ui/notation';
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
  if (!frame.liftoff || frame.status === 'prelaunch') return 'pad';
  if (frame.status === 'failed') return null;
  if (recentSeparation(frame)) return 'staging';
  if (frame.status === 'ascent') return frame.activeStageIndex > 0 ? 'upper' : 'ascent';
  if (frame.status === 'coast') return 'coast';
  if (frame.status === 'burn') return 'burn';
  return frame.payloadSeparated ? 'deployment' : 'orbit';
}

/**
 * The camera programme of the landing page and the launch viewer: the same as
 * the workspace default except that it stays outside the vehicle. The onboard
 * view draws an instrument strip where the viewer's own readouts are, and the
 * map is a chart rather than a picture.
 */
const WATCH_CAMERA_PLAN: CameraPlan = { ...DEFAULT_CAMERA_PLAN, upper: 'exterior', deployment: 'space' };

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
  map: OrbitalMap;
  onboard: OnboardOverlay;
  timeline: Timeline;
  narration: Narration;
  cams = new CameraController();
  panel: SetupPanel;
  home: HomeScreen;
  watch: WatchView;
  /** which face of the app is showing (src/ui/app-mode.ts) */
  mode: AppMode = 'home';
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
  debrisView!: DebrisView;
  trail = new TrailLine(0x8be5cd);
  predicted = new OrbitLine(0xffffff, true);
  target = new OrbitLine(0xefa47e, false);
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
  viewport: HTMLElement;
  glCanvas: HTMLCanvasElement;
  mapCanvas: HTMLCanvasElement;
  obCanvas: HTMLCanvasElement;
  private physicsDialog: PhysicsDialog;
  private loopInspector: LoopInspector;
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
  private warpSel!: HTMLSelectElement;
  private glowBtn!: HTMLButtonElement;
  /** decides from the frame rate whether the glow is affordable (src/render/glow-governor.ts) */
  private readonly glow = new GlowGovernor();
  /** kept alive for as long as the app is: it publishes `--sb-h` */
  private sbObserver: ResizeObserver | null = null;
  private sbHeight = -1;
  private basis = new THREE.Matrix4();
  private bx = new THREE.Vector3();
  private by = new THREE.Vector3();
  private bz = new THREE.Vector3();
  private backDir = new THREE.Vector3(0, -1, 0);
  private originV = new THREE.Vector3();
  private earthC = new THREE.Vector3();

  constructor() {
    new HelpGuide(document.getElementById('first-use-guide')!, document.getElementById('btn-help') as HTMLButtonElement);
    this.result = new MissionResult(document.getElementById('mission-result')!, { onSeek: time => this.seek(time) });
    this.rigidControls = new RigidControls(document.getElementById('rigid-controls')!, command => {
      if (!this.session || !this.player.live) return;
      this.session.setRigidCommand(command);
      this.telTimer = 1;
    }, opener => this.loopInspector.open(opener));
    // G03: the attitude-loop inspector, opened from the 6-DOF panel in the Engineer mode.
    this.loopInspector = new LoopInspector({ togglePlay: () => this.togglePlay() });
    this.viewport = document.getElementById('viewport')!;
    this.glCanvas = document.getElementById('gl') as HTMLCanvasElement;
    this.mapCanvas = document.getElementById('map') as HTMLCanvasElement;
    this.obCanvas = document.getElementById('onboard') as HTMLCanvasElement;
    // The telemetry panel first: it owns the slot the instrument card docks
    // into, and `Hud` reads its stored placement in its own constructor.
    this.tel = new TelemetryPanel(document.getElementById('telemetry')!);
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
      onExperience: (experience) => this.go(experience === 'advanced' ? 'engineer' : 'explore'),
    });
    this.home = new HomeScreen(document.getElementById('home-screen')!, {
      watchFeatured: () => { this.go('watch'); this.startWatch(FEATURED_WATCH_MISSION); },
      go: (mode) => this.go(mode),
    });
    this.watch = new WatchView(document.getElementById('watch-ui')!, {
      start: (id) => this.startWatch(id),
      togglePlay: () => this.togglePlay(),
      setWarp: (warp) => this.setWarp(warp),
      explore: () => this.go('explore'),
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
    this.bindControls();
    this.observeSceneBottom();
    this.setMode(initialMode(location.hash));
    // Keep the address naming the mode, without adding a history entry for it.
    if (location.hash !== hashForMode(this.mode)) history.replaceState(null, '', hashForMode(this.mode));
    window.addEventListener('hashchange', () => {
      const mode = modeFromHash(location.hash);
      if (mode && mode !== this.mode) this.setMode(mode);
    });
  }

  /** The landing page and the viewer: no workspace, the scene is the page. */
  get lean(): boolean {
    return this.mode === 'home' || this.mode === 'watch';
  }

  /** Navigate to a mode (a history entry, so Back returns to the last one). */
  go(mode: AppMode): void {
    if (location.hash === hashForMode(mode)) this.setMode(mode);
    else location.hash = hashForMode(mode);
  }

  /**
   * Show a mode. Only presentation changes: the mission, the flight and its
   * recording carry on underneath, so leaving the viewer for the workspace in
   * the middle of a launch shows the same launch with every instrument on it.
   */
  private setMode(mode: AppMode): void {
    const previous = this.mode;
    this.mode = mode;
    document.body.dataset.mode = mode;
    saveMode(mode);
    const experience = experienceForMode(mode);
    if (experience) this.panel.setExperience(experience);
    this.rigidControls.setInspectorAvailable(mode === 'engineer');
    this.tel.setEquationLevel(mode === 'engineer' ? 'engineer' : 'explore'); // E02
    if (mode !== 'engineer') this.loopInspector.close();
    document.querySelectorAll<HTMLAnchorElement>('#mode-nav a').forEach((a) => {
      if (a.dataset.mode === mode) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.getElementById('home-screen')!.hidden = mode !== 'home';
    document.getElementById('watch-ui')!.hidden = mode !== 'watch';
    // The two faces fly different camera programmes; re-apply at once.
    this.lastPhase = null;
    // The target-orbit line is a planning aid: from the pad it is an orange
    // stroke across the sky that nobody watching a launch could read.
    this.target.setOpacity(this.lean ? 0 : 1);
    if (mode === 'watch' && previous !== 'watch') {
      this.watch.enter(!this.playing && (this.shown?.status ?? 'prelaunch') === 'prelaunch');
    }
    if (mode !== 'watch') this.watch.closePicker();
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
    const tex = await loadEarthTextures(base);
    this.scene = new SceneManager(this.glCanvas, tex);
    this.restoreGlow();
    this.debrisView = new DebrisView(this.scene);
    this.scene.scene.add(this.trail.line, this.predicted.line, this.target.line);
    this.cams.attach(this.viewport);
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(this.viewport);
    this.watchPixelRatio();
    this.resize();
    document.getElementById('loading')!.classList.add('hidden');
    // The landing page and the viewer open on the featured launch standing on
    // its pad in daylight; the workspace opens on whatever the panel holds.
    if (this.lean) this.panel.loadMission(watchMissionSettings(FEATURED_WATCH_MISSION));
    else this.preview(this.panel.getConfig());
    requestAnimationFrame((now) => this.frame(now));
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
    this.hud.applyLabels();
    this.narration.applyLanguage();
    this.timeline.applyStaticText();
    this.home.applyLanguage();
    this.watch.applyLanguage();
    document.getElementById('camera-tabs')?.setAttribute('aria-label', t('a11y.cameraGroup'));
    document.getElementById('controls')?.setAttribute('aria-label', t('a11y.playback'));
    // icon-only buttons take their accessible name from the same key as the tooltip
    document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((node) => node.setAttribute('aria-label', node.title));
    this.viewport.setAttribute('aria-label', t('a11y.viewport'));
    this.warpSel?.setAttribute('aria-label', t('ctl.warp'));
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
    this.narration.setMission(vehicleById(cfg.vehicleId).name, satelliteName(satelliteById(cfg.satelliteId)));
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
    this.playing = false;
    this.panel.setRunning(false);
    this.fastForwardTo = null;
    let session: FlightSession;
    try {
      session = this.createSession(cfg);
      this.rigidControls.reset();
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
      this.scene.scene.remove(this.rocket.group, this.rocket.worldGroup);
      this.rocket.dispose();
    }
    if (this.pad) {
      this.scene.scene.remove(this.pad.group);
      this.pad.dispose();
    }
    this.rocket = new RocketView(sim.vehicleSpec, sim.satellite);
    this.scene.scene.add(this.rocket.group, this.rocket.worldGroup);
    this.pad = new LaunchPadView(sim.site, sim.vehicleSpec);
    this.scene.scene.add(this.pad.group);
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
          vehicleId: sim?.vehicleSpec.id ?? '',
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
      this.result.update(this.simView.sim);
      this.rigidControls.update(this.shown?.rigid, this.player.live);
    }
    if (this.loopInspector.isOpen) {
      this.loopInspector.update(this.shown, this.recorder.frames, this.player.cursor, this.player.live,
        this.player.live ? this.playing : this.player.playing, this.simView?.sim.telemetry ?? []);
    }
    requestAnimationFrame((n) => this.frame(n));
  }

  /** Keep the trail consistent with the cursor: extend forward, rebuild on a rewind. */
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
  private followCameraPlan(frame: VisualFrame): void {
    const phase = flightPhase(frame);
    if (phase === null || phase === this.lastPhase) return;
    this.lastPhase = phase;
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
      scene.render();
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
    scene.origin = { x: frame.r.x, y: frame.r.y, z: frame.r.z };
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
    this.rocket.group.position.set(0, 0, 0);
    if (frame.rigid) {
      const attitude = frame.rigid.attitudeQ;
      this.rocket.group.quaternion.set(attitude.x, attitude.y, attitude.z, attitude.w).multiply(MODEL_TO_BODY);
      const offset = quatRotate(attitude, frame.rigid.renderOffsetBody);
      this.rocket.group.position.set(offset.x, offset.y, offset.z);
      side = quatRotate(attitude, v3(0, 0, 1));
    }
    // the smoke column trails back towards the pad
    const padVec = this.pad.group.position;
    const padDist = padVec.length();
    if (padDist > 1) this.backDir.copy(padVec).divideScalar(padDist);
    else this.backDir.set(-frame.dir.x, -frame.dir.y, -frame.dir.z);
    this.rocket.update(frame, { backDir: this.backDir, padDistance: padDist, night });
    // Size of the object actually being tracked: the stack now, the spacecraft
    // after payload separation. It frames the camera, decides when the space
    // view's marker takes over, and scales the break-up effect.
    const height = frame.payloadSeparated ? Math.max(3, frame.payloadHeight ?? 3) : this.rocket.currentHeight(frame);
    this.explosion.update(scene, frame, this.recorder.events, dt, height);
    // lines
    this.syncTrail(this.player.cursor, this.player.live, frame);
    this.trail.update(scene);
    this.syncPredicted(frame, dt);
    this.predicted.update(scene);
    this.target.update(scene);
    this.debrisView.update(frame.debris, frame.t);
    // camera
    const radius = frame.payloadSeparated ? Math.max(1, frame.payloadWidth ?? 2) : this.rocket.currentRadius(frame);
    const shake = frame.status === 'ascent' ? Math.min(1, frame.thrust / Math.max(1, frame.mass) / 25 + frame.q / 60e3) : frame.thrust > 0 ? 0.15 : 0;
    this.cams.update(scene.camera, {
      pos: this.originV, up, east, north, dir: frame.dir, side, height, radius,
      earthCenter: scene.toScene(v3(0, 0, 0), this.earthC), shake: shake * 0.6,
      vDir: norm(frame.v) > 1 ? normalize(frame.v) : up,
      t: frame.t, phase: camPhase(frame), agl: frame.altitudeAGL,
    }, dt, R_EARTH);
    const camAlt = Math.hypot(scene.camera.position.x + scene.origin.x, scene.camera.position.y + scene.origin.y, scene.camera.position.z + scene.origin.z) - R_EARTH;
    // shadows are only worth casting while we are looking at the pad
    scene.setShadowFocus(padVec, this.pad.shadowRadius, camAlt < 40e3 && padDist < 30e3);
    // `height` is the size of the object actually being tracked — the stack
    // now, the spacecraft after payload separation. Without it the space view's
    // marker swaps in at a hard-coded 55 m, which is wrong by more than 10x for
    // a 3 m CubeSat carrier and by 2x for Starship (render hand-off).
    scene.update(frame, sunDir, camAlt, height);
    // The map and the onboard overlay still take a `Simulation` (they belong to
    // another wave), so they are handed a frame-backed view of this mission
    // rather than the live object: everything they read — clock, state vector,
    // ground track, debris, event log — is the frame on screen.
    if (this.camMode === 'map') {
      this.map.draw(view.sim, sim.site.latitude, sim.site.longitude, Math.max(0, this.sbHeight));
    } else {
      scene.render();
      if (this.camMode === 'onboard') this.onboard.draw(view.sim, !!sim.satellite.crewed, Math.max(0, this.sbHeight));
    }
  }
}

initLang();
initNotation();
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
