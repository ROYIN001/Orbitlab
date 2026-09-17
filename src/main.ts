import * as THREE from 'three';
import { initLang, setLang, getLang, t, applyStatic, type Lang } from './i18n';
import { SceneManager, loadEarthTextures } from './render/scene';
import { RocketView } from './render/rocket';
import { DebrisView } from './render/debris';
import { TrailLine, OrbitLine } from './render/lines';
import { LaunchPadView } from './render/launchpad';
import { CameraController, type CameraMode, type CamPhase } from './render/cameras';
import { SetupPanel } from './ui/panel';
import { Hud } from './ui/hud';
import { TelemetryPanel } from './ui/telemetry';
import { OrbitalMap } from './ui/map';
import { OnboardOverlay } from './ui/onboard';
import { Timeline } from './ui/timeline';
import { Narration } from './ui/narration';
import { PhysicsDialog, CameraDialog, DEFAULT_CAMERA_PLAN, type CameraPlan, type FlightPhase } from './ui/dialogs';
import { Simulation } from './physics/simulation';
import { cloneFrame, type VisualFrame } from './physics/frame';
import { FlightRecorder } from './replay/recorder';
import { ReplayPlayer } from './replay/player';
import { ExplosionEffect } from './replay/explosion';
import { createFrameSimView, type FrameSimView } from './replay/simview';
import { sunDirectionEci, enuFrame, sampleOrbit, stateFromElements, elementsFromState } from './physics/orbital';
import { R_EARTH } from './physics/constants';
import { normalize, cross, norm, v3 } from './physics/vec3';
import { vehicleById } from './data/vehicles';
import { satelliteById } from './data/satellites';
import { satelliteName } from './ui/names';
import type { MissionConfig } from './types';

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

const WARPS = [0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 500, 1000, 5000, 10000, 50000];
const base = import.meta.env.BASE_URL;

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
  map: OrbitalMap;
  onboard: OnboardOverlay;
  timeline: Timeline;
  narration: Narration;
  cams = new CameraController();
  panel: SetupPanel;
  sim: Simulation | null = null;
  recorder = new FlightRecorder();
  player = new ReplayPlayer(this.recorder);
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
  private cameraDialog: CameraDialog;
  private shown: VisualFrame | null = null;
  private wasLive = true;
  /** the flight phase the camera sequence last acted on */
  private lastPhase: FlightPhase | null = null;
  /** index of the last recorded frame fed to the trail line */
  private trailIdx = -1;
  private playBtn!: HTMLButtonElement;
  private playGlyph!: HTMLElement;
  private liveBtn!: HTMLButtonElement;
  private warpSel!: HTMLSelectElement;
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
    this.viewport = document.getElementById('viewport')!;
    this.glCanvas = document.getElementById('gl') as HTMLCanvasElement;
    this.mapCanvas = document.getElementById('map') as HTMLCanvasElement;
    this.obCanvas = document.getElementById('onboard') as HTMLCanvasElement;
    this.hud = new Hud(document.getElementById('hud')!, document.getElementById('ticker')!);
    this.tel = new TelemetryPanel(document.getElementById('telemetry')!);
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
    this.attachTouch();
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
   * Touch input for the cameras (audit B30).
   *
   * `touch-action: none` on #viewport stops the browser from turning a drag
   * into a page zoom or a pull-to-refresh, which also means every gesture now
   * reaches us — including taps on the camera tabs, which would otherwise
   * start a camera drag. Both problems are handled in the capture phase on
   * #viewport, before `CameraController`'s own bubble listener on the same
   * element runs:
   *
   * - a pointerdown on the overlay UI is stopped, so a tap-and-slide on a
   *   button never rotates the scene (the click still fires: `click` is a
   *   separate event);
   * - a second finger is stopped too, so it cannot overwrite the controller's
   *   single drag baseline and make the view snap;
   * - the distance between two fingers is turned into the `wheel` events the
   *   controller already understands, which is how pinch zoom works without
   *   reaching into `src/render`.
   */
  private attachTouch(): void {
    const vp = this.viewport;
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const spread = (): number => {
      const it = pts.values();
      const a = it.next().value;
      const b = it.next().value;
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    vp.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.scene-ui')) { e.stopPropagation(); return; }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2) { pinch = spread(); e.stopPropagation(); }
    }, true);
    vp.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size < 2) return;
      e.stopPropagation();
      const d = spread();
      if (pinch > 0 && Math.abs(d - pinch) > 2) {
        vp.dispatchEvent(new WheelEvent('wheel', { deltaY: d > pinch ? -120 : 120, cancelable: true }));
        pinch = d;
      }
    }, true);
    const drop = (e: PointerEvent): void => {
      pts.delete(e.pointerId);
      // Re-seed on every add *and* remove, or the view jumps when a finger lifts.
      pinch = pts.size >= 2 ? spread() : 0;
    };
    vp.addEventListener('pointerup', drop, true);
    vp.addEventListener('pointercancel', drop, true);
  }

  async init(): Promise<void> {
    const tex = await loadEarthTextures(base);
    this.scene = new SceneManager(this.glCanvas, tex);
    this.debrisView = new DebrisView(this.scene);
    this.scene.scene.add(this.trail.line, this.predicted.line, this.target.line);
    this.cams.attach(this.viewport);
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(this.viewport);
    this.resize();
    document.getElementById('loading')!.classList.add('hidden');
    this.preview(this.panel.getConfig());
    requestAnimationFrame((now) => this.frame(now));
  }

  resize(): void {
    const w = this.viewport.clientWidth, h = this.viewport.clientHeight;
    if (w > 0 && h > 0) this.scene.resize(w, h);
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
    if (e.key === '1') this.setCamera('exterior');
    else if (e.key === '2') this.setCamera('onboard');
    else if (e.key === '3') this.setCamera('space');
    else if (e.key === '4') this.setCamera('map');
    else if (e.key === '.') { const i = WARPS.indexOf(this.activeWarp); if (i < WARPS.length - 1) this.setWarp(WARPS[i + 1]); }
    else if (e.key === ',') { const i = WARPS.indexOf(this.activeWarp); if (i > 0) this.setWarp(WARPS[i - 1]); }
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

  private setWarp(v: number): void {
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
    const cfg = this.panel.getConfig();
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
    this.fastForwardTo = null;
    try {
      this.sim = new Simulation(cfg);
    } catch (err) {
      console.error(err);
      return;
    }
    this.recorder.start(this.sim);
    this.player.reset();
    this.simView = createFrameSimView(this.sim);
    // a copy, like every other frame the views are handed: the pad frame is the
    // first entry of the recording and must not be reachable from the HUD
    const pad = cloneFrame(this.recorder.frames[0]);
    this.simView.setFrame(pad);
    this.shown = pad;
    this.timeline.reset();
    this.narration.reset();
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
    this.predicted.setPoints([]);
    // target orbit line
    const tg = sim.plan.target;
    const raan = tg.raan ?? sim.plan.raanExpected;
    const st = stateFromElements(tg.a, tg.e, tg.inclination, raan, tg.argp, 0);
    this.target.setPoints(sampleOrbit(elementsFromState(st.r, st.v), 240));
    this.hud.setVehicle(sim.vehicleSpec);
    this.hud.reset();
    this.tel.reset();
    this.explosion.clear();
    // Pay this mission's shader compiles now, while the vehicle is sitting on
    // the pad, rather than as a multi-frame hitch part-way up the ascent.
    this.scene.prewarm();
  }

  launch(cfg: MissionConfig): void {
    this.preview(cfg);
    this.playing = true;
    this.panel.setRunning(true);
    this.updatePlayButton();
  }

  reset(): void {
    this.preview(this.panel.getConfig());
  }

  private frame(now: number): void {
    const dtReal = Math.min(0.1, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    const sim = this.sim;
    // The live flight runs whether or not the user is watching the head.
    if (sim && this.playing) {
      const target = this.fastForwardTo;
      if (target !== null && target > sim.state.t + 1e-3 && !sim.isFailed()) {
        const budget = performance.now() + 30; // ms per frame for fast-forward
        while (sim.state.t < target - 1e-3 && performance.now() < budget && !sim.isFailed()) {
          const before = sim.state.t;
          this.recorder.advance(Math.min(600, target - sim.state.t), 3000);
          if (sim.state.t <= before) break; // no progress: give up rather than spin
        }
        if (sim.state.t >= target - 1e-3 || sim.isFailed()) this.fastForwardTo = null;
      } else {
        this.fastForwardTo = null;
        this.recorder.advance(dtReal * this.warp, 6000);
      }
    }
    // The replay cursor runs on its own clock; warp > 1 skips through frames.
    if (sim && !this.player.live && this.player.playing) this.player.advanceCursor(dtReal * this.replayWarp);
    this.updateVisuals(dtReal);
    this.hudTimer += dtReal;
    if (this.hudTimer > 0.1) {
      this.hudTimer = 0;
      const replaying = !this.player.live;
      this.hud.update(this.shown, this.recorder.events, this.activeWarp, replaying);
      this.narration.update(this.shown, this.recorder.events, {
        replay: replaying,
        playing: replaying ? this.player.playing : this.playing,
        armed: !!sim,
      });
    }
    this.telTimer += dtReal;
    if (sim && this.telTimer > 0.5) { this.telTimer = 0; this.tel.update(sim, this.player.cursor); }
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
    if (this.autoCamera) this.setCamera(this.cameraPlan[phase]);
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
    this.pad.update(scene, frame);
    // vehicle orientation: Y = body axis, Z = window side (horizontal), X = Y x Z
    const { east, north, up } = enuFrame(frame.r);
    let side = cross(frame.dir, up);
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
    // the smoke column trails back towards the pad
    const padVec = this.pad.group.position;
    const padDist = padVec.length();
    if (padDist > 1) this.backDir.copy(padVec).divideScalar(padDist);
    else this.backDir.set(-frame.dir.x, -frame.dir.y, -frame.dir.z);
    this.rocket.update(frame, { backDir: this.backDir, padDistance: padDist });
    this.explosion.update(scene, frame, this.recorder.events, dt);
    // lines
    this.syncTrail(this.player.cursor, this.player.live, frame);
    this.trail.update(scene);
    const el = frame.elements;
    if (frame.status !== 'prelaunch' && el.e < 1 && el.apoapsisAlt > 0 && frame.liftoff) this.predicted.setPoints(sampleOrbit(el, 180));
    else this.predicted.setPoints([]);
    this.predicted.update(scene);
    this.target.update(scene);
    this.debrisView.update(frame.debris, frame.t);
    // camera
    const height = frame.payloadSeparated ? Math.max(3, frame.payloadHeight ?? 3) : this.rocket.currentHeight(frame);
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
    scene.update(frame, sunDir, camAlt);
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
const app = new App();
// exposed for automated testing / console experiments
(window as unknown as { orbitlab: App }).orbitlab = app;
app.init().catch((err) => {
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
