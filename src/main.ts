import * as THREE from 'three';
import { initLang, setLang, getLang, t, applyStatic, type Lang } from './i18n';
import { SceneManager, loadEarthTextures } from './render/scene';
import { RocketView } from './render/rocket';
import { DebrisView } from './render/debris';
import { TrailLine, OrbitLine } from './render/lines';
import { LaunchPadView } from './render/launchpad';
import { CameraController, type CameraMode } from './render/cameras';
import { SetupPanel } from './ui/panel';
import { Hud } from './ui/hud';
import { TelemetryPanel } from './ui/telemetry';
import { OrbitalMap } from './ui/map';
import { OnboardOverlay } from './ui/onboard';
import { Simulation } from './physics/simulation';
import { atmosphere } from './physics/atmosphere';
import { sunDirectionEci, enuFrame, sampleOrbit, stateFromElements, elementsFromState } from './physics/orbital';
import { R_EARTH } from './physics/constants';
import { normalize, cross, norm, v3 } from './physics/vec3';
import type { MissionConfig } from './types';

const WARPS = [0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 500, 1000, 5000, 10000, 50000];
const base = import.meta.env.BASE_URL;

class App {
  scene!: SceneManager;
  hud: Hud;
  tel: TelemetryPanel;
  map: OrbitalMap;
  onboard: OnboardOverlay;
  cams = new CameraController();
  panel: SetupPanel;
  sim: Simulation | null = null;
  rocket: RocketView | null = null;
  pad: LaunchPadView | null = null;
  debrisView!: DebrisView;
  trail = new TrailLine(0x4aa3ff);
  predicted = new OrbitLine(0xffffff, true);
  target = new OrbitLine(0xf2b134, false);
  playing = false;
  warp = 1;
  camMode: CameraMode = 'exterior';
  /** mission time to fast-forward to, or null when not fast-forwarding */
  fastForwardTo: number | null = null;
  lastFrame = performance.now();
  hudTimer = 0;
  telTimer = 0;
  explosion: THREE.Group | null = null;
  explosionT = 0;
  viewport: HTMLElement;
  glCanvas: HTMLCanvasElement;
  mapCanvas: HTMLCanvasElement;
  obCanvas: HTMLCanvasElement;

  constructor() {
    this.viewport = document.getElementById('viewport')!;
    this.glCanvas = document.getElementById('gl') as HTMLCanvasElement;
    this.mapCanvas = document.getElementById('map') as HTMLCanvasElement;
    this.obCanvas = document.getElementById('onboard') as HTMLCanvasElement;
    this.hud = new Hud(document.getElementById('hud')!, document.getElementById('ticker')!);
    this.tel = new TelemetryPanel(document.getElementById('telemetry')!);
    this.map = new OrbitalMap(this.mapCanvas, `${base}textures/earth_atmos_2048.jpg`);
    this.onboard = new OnboardOverlay(this.obCanvas);
    this.panel = new SetupPanel(document.getElementById('setup')!, {
      onLaunch: (cfg) => this.launch(cfg),
      onReset: () => this.reset(),
      onChange: (cfg) => { if (!this.playing) this.preview(cfg); },
    });
    this.bindControls();
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

  private bindControls(): void {
    const warpSel = document.getElementById('warp-select') as HTMLSelectElement;
    for (const w of WARPS) {
      const o = document.createElement('option');
      o.value = String(w);
      o.textContent = `${w}×`;
      if (w === 1) o.selected = true;
      warpSel.appendChild(o);
    }
    warpSel.addEventListener('change', () => { this.warp = Number(warpSel.value); });
    document.getElementById('btn-play')!.addEventListener('click', () => this.togglePlay());
    document.getElementById('btn-skip')!.addEventListener('click', () => this.skip());
    document.querySelectorAll<HTMLButtonElement>('.cam-btn').forEach((b) => {
      b.addEventListener('click', () => this.setCamera(b.dataset.cam as CameraMode));
    });
    document.getElementById('lang-select')!.addEventListener('change', (e) => {
      const l = (e.target as HTMLSelectElement).value as Lang;
      setLang(l);
      this.applyLanguage();
    });
    (document.getElementById('lang-select') as HTMLSelectElement).value = getLang();
    document.getElementById('btn-about')!.addEventListener('click', () => document.getElementById('about')!.classList.remove('hidden'));
    document.getElementById('btn-about-close')!.addEventListener('click', () => document.getElementById('about')!.classList.add('hidden'));
    document.getElementById('btn-toggle-setup')!.addEventListener('click', () => {
      document.getElementById('setup')!.classList.toggle('open');
      document.getElementById('telemetry')!.classList.remove('open');
    });
    document.getElementById('btn-toggle-tel')!.addEventListener('click', () => {
      document.getElementById('telemetry')!.classList.toggle('open');
      document.getElementById('setup')!.classList.remove('open');
    });
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;
      if (e.key === ' ') { e.preventDefault(); this.togglePlay(); }
      else if (e.key === '1') this.setCamera('exterior');
      else if (e.key === '2') this.setCamera('onboard');
      else if (e.key === '3') this.setCamera('space');
      else if (e.key === '4') this.setCamera('map');
      else if (e.key === '.' ) { const i = WARPS.indexOf(this.warp); if (i < WARPS.length - 1) { this.warp = WARPS[i + 1]; warpSel.value = String(this.warp); } }
      else if (e.key === ',') { const i = WARPS.indexOf(this.warp); if (i > 0) { this.warp = WARPS[i - 1]; warpSel.value = String(this.warp); } }
    });
    this.applyLanguage();
  }

  applyLanguage(): void {
    applyStatic();
    this.panel.render();
    this.tel.build();
    this.updateHint();
  }

  private updateHint(): void {
    document.getElementById('cam-hint')!.textContent = t(`ctl.hint.${this.camMode}`);
  }

  setCamera(mode: CameraMode): void {
    this.camMode = mode;
    this.cams.mode = mode;
    document.querySelectorAll<HTMLButtonElement>('.cam-btn').forEach((b) => b.classList.toggle('active', b.dataset.cam === mode));
    this.mapCanvas.classList.toggle('hidden', mode !== 'map');
    this.obCanvas.classList.toggle('hidden', mode !== 'onboard');
    this.viewport.classList.toggle('onboard', mode === 'onboard');
    this.updateHint();
  }

  togglePlay(): void {
    if (!this.sim) return;
    this.playing = !this.playing;
    if (this.playing) this.panel.setRunning(true);
    document.getElementById('btn-play')!.textContent = this.playing ? '❚❚' : '▶';
  }

  skip(): void {
    if (!this.sim) return;
    const s = this.sim.state;
    if (s.status === 'coast' && s.nextBurnTime > s.t) this.fastForwardTo = s.nextBurnTime - 20;
    else if (s.status === 'orbit' && isFinite(s.elements.period)) this.fastForwardTo = s.t + s.elements.period;
    else if (s.status === 'prelaunch') this.fastForwardTo = 0;
    else this.fastForwardTo = s.t + 60;
    if (!this.playing) this.togglePlay();
  }

  /** Build a paused simulation so the vehicle is shown on the pad. */
  preview(cfg: MissionConfig): void {
    this.playing = false;
    document.getElementById('btn-play')!.textContent = '▶';
    this.fastForwardTo = null;
    try {
      this.sim = new Simulation(cfg);
    } catch (err) {
      console.error(err);
      return;
    }
    this.setupViews();
  }

  private setupViews(): void {
    if (!this.sim) return;
    const sim = this.sim;
    if (this.rocket) this.scene.scene.remove(this.rocket.group);
    if (this.pad) this.scene.scene.remove(this.pad.group);
    this.rocket = new RocketView(sim.vehicleSpec, sim.satellite);
    this.scene.scene.add(this.rocket.group);
    this.pad = new LaunchPadView(sim.site, sim.vehicleSpec.height);
    this.scene.scene.add(this.pad.group);
    this.debrisView.clear();
    this.trail.clear();
    this.predicted.setPoints([]);
    // target orbit line
    const tg = sim.plan.target;
    const raan = tg.raan ?? sim.plan.raanExpected;
    const st = stateFromElements(tg.a, tg.e, tg.inclination, raan, tg.argp, 0);
    this.target.setPoints(sampleOrbit(elementsFromState(st.r, st.v), 240));
    this.hud.reset();
    this.tel.reset();
    if (this.explosion) { this.scene.scene.remove(this.explosion); this.explosion = null; }
  }

  launch(cfg: MissionConfig): void {
    this.preview(cfg);
    this.playing = true;
    this.panel.setRunning(true);
    document.getElementById('btn-play')!.textContent = '❚❚';
    if (window.innerWidth < 980) document.getElementById('setup')!.classList.remove('open');
  }

  reset(): void {
    this.preview(this.panel.getConfig());
  }

  private spawnExplosion(): void {
    const g = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffa030 : 0xfff0b0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.position.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
      m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60);
      g.add(m);
    }
    this.scene.scene.add(g);
    this.explosion = g;
    this.explosionT = 0;
  }

  private frame(now: number): void {
    const dtReal = Math.min(0.1, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    const sim = this.sim;
    if (sim && this.playing) {
      const target = this.fastForwardTo;
      if (target !== null && target > sim.state.t + 1e-3 && !sim.isFailed()) {
        const budget = performance.now() + 30; // ms per frame for fast-forward
        while (sim.state.t < target - 1e-3 && performance.now() < budget && !sim.isFailed()) {
          const before = sim.state.t;
          sim.advance(Math.min(600, target - sim.state.t), 3000);
          if (sim.state.t <= before) break; // no progress: give up rather than spin
        }
        if (sim.state.t >= target - 1e-3 || sim.isFailed()) this.fastForwardTo = null;
      } else {
        this.fastForwardTo = null;
        sim.advance(dtReal * this.warp, 6000);
      }
    }
    this.updateVisuals(dtReal);
    this.hudTimer += dtReal;
    if (this.hudTimer > 0.1) { this.hudTimer = 0; this.hud.update(sim, this.warp); }
    this.telTimer += dtReal;
    if (sim && this.telTimer > 0.5) { this.telTimer = 0; this.tel.update(sim); }
    requestAnimationFrame((n) => this.frame(n));
  }

  private updateVisuals(dt: number): void {
    const sim = this.sim;
    const scene = this.scene;
    if (!sim || !this.rocket || !this.pad) {
      scene.render();
      return;
    }
    const s = sim.state;
    scene.origin = { x: s.r.x, y: s.r.y, z: s.r.z };
    const theta = s.theta;
    const sunDir = sunDirectionEci(sim.julianDate());
    this.pad.update(scene, theta);
    // vehicle orientation: Y = body axis, Z = window side (horizontal), X = Y × Z
    const { east, north, up } = enuFrame(s.r);
    let side = cross(s.dir, up);
    if (norm(side) < 0.05) side = east;
    side = normalize(side);
    const xAxis = normalize(cross(s.dir, side));
    const m = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(xAxis.x, xAxis.y, xAxis.z),
      new THREE.Vector3(s.dir.x, s.dir.y, s.dir.z),
      new THREE.Vector3(side.x, side.y, side.z),
    );
    this.rocket.group.quaternion.setFromRotationMatrix(m);
    this.rocket.group.position.set(0, 0, 0);
    const pressure = atmosphere(Math.max(0, s.altitude)).p;
    const boostersBurn = s.throttle > 0 ? 1 : 0;
    this.rocket.update(sim.vehicle, s.throttle, boostersBurn, pressure, dt, s.payloadSeparated, s.destroyed);
    if (s.destroyed && !this.explosion) this.spawnExplosion();
    if (this.explosion) {
      this.explosionT += dt;
      for (const c of this.explosion.children) {
        const mesh = c as THREE.Mesh;
        mesh.position.addScaledVector(mesh.userData.v as THREE.Vector3, dt);
        const sc = 1 + this.explosionT * 25;
        mesh.scale.setScalar(sc);
        (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - this.explosionT * 0.45);
      }
      if (this.explosionT > 2.5) { this.scene.scene.remove(this.explosion); this.explosion = null; }
    }
    // lines
    if (s.status !== 'prelaunch') this.trail.add(s.r);
    this.trail.update(scene);
    if (s.status !== 'prelaunch' && s.elements.e < 1 && s.elements.apoapsisAlt > 0 && s.liftoff) this.predicted.setPoints(sampleOrbit(s.elements, 180));
    else this.predicted.setPoints([]);
    this.predicted.update(scene);
    this.target.update(scene);
    this.debrisView.update(sim.debris);
    // camera
    const height = s.payloadSeparated ? Math.max(3, (sim.satellite.size?.height ?? 3)) : this.rocket.currentHeight(sim.vehicle);
    const radius = s.payloadSeparated ? Math.max(1, (sim.satellite.size?.width ?? 2)) : this.rocket.currentRadius(sim.vehicle);
    const shake = s.status === 'ascent' ? Math.min(1, s.thrust / Math.max(1, s.mass) / 25 + s.q / 60e3) : s.thrust > 0 ? 0.15 : 0;
    this.cams.update(scene.camera, {
      pos: new THREE.Vector3(0, 0, 0), up, east, north, dir: s.dir, side, height, radius,
      earthCenter: scene.toScene(v3(0, 0, 0)), shake: shake * 0.6,
      vDir: norm(s.v) > 1 ? normalize(s.v) : up,
    }, dt, R_EARTH);
    const camAlt = Math.hypot(scene.camera.position.x + scene.origin.x, scene.camera.position.y + scene.origin.y, scene.camera.position.z + scene.origin.z) - R_EARTH;
    scene.update(theta, sunDir, camAlt);
    if (this.camMode === 'map') {
      this.map.draw(sim, sim.site.latitude, sim.site.longitude);
    } else {
      scene.render();
      if (this.camMode === 'onboard') this.onboard.draw(sim, !!sim.satellite.crewed);
    }
  }
}

initLang();
const app = new App();
// exposed for automated testing / console experiments
(window as unknown as { orbitlab: App }).orbitlab = app;
app.init().catch((err) => {
  console.error(err);
  const el = document.getElementById('loading');
  if (el) el.textContent = 'Failed to initialise WebGL: ' + (err as Error).message;
});
