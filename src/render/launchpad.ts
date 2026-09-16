/**
 * The launch complex at a site: terrain, pad structures, ground smoke and the
 * exhaust glow on the concrete. Everything is placed in a local ENU frame
 * (X = east, Y = up, Z = south) anchored at the site and re-based on the
 * floating origin every frame.
 */
import * as THREE from 'three';
import type { SiteExtra } from '../data/sites';
import type { VehicleSpec } from '../types';
import type { VisualFrame } from '../physics/frame';
import type { Vec3 } from '../physics/vec3';
import { enuFrame } from '../physics/orbital';
import { DEG, R_EARTH } from '../physics/constants';
import type { SceneManager } from './scene';
import { buildPad, type PadBuild } from './pads';
import { GroundSmoke, PadGlow } from './smoke';
import { disposeObject } from './dispose';
import { clamp01, smoothstep } from './noise';

/** slant range at which the local terrain patch starts to dissolve, m */
const TERRAIN_NEAR = 22e3;
/** slant range at which it has gone completely, m */
const TERRAIN_FAR = 46e3;

export class LaunchPadView {
  readonly group = new THREE.Group();
  private pad: PadBuild;
  private smoke: GroundSmoke;
  private glow: PadGlow;
  private materials: THREE.MeshStandardMaterial[] = [];
  private matCache = new Map<string, THREE.MeshStandardMaterial>();
  /** geometries handed out by the pad builders, disposed with the view */
  private geometries: THREE.BufferGeometry[] = [];
  /** terrain meshes and the base opacity of their materials, for the far fade */
  private terrain: { object: THREE.Object3D; materials: { mat: THREE.Material; base: number }[] }[] = [];
  private terrainFade = -1;
  private tmp = new THREE.Vector3();
  private basis = new THREE.Matrix4();
  private xAxis = new THREE.Vector3();
  private yAxis = new THREE.Vector3();
  private zAxis = new THREE.Vector3();
  /** site position in ECI, recomputed in place every frame (no allocation) */
  private siteVec: Vec3 = { x: 0, y: 0, z: 0 };
  private cosLat: number;
  private sinLat: number;
  private lonRad: number;
  private siteRadius: number;
  /** radius used for the shadow frustum, m */
  readonly shadowRadius: number;

  constructor(site: SiteExtra, vehicle: VehicleSpec) {
    this.cosLat = Math.cos(site.latitude * DEG);
    this.sinLat = Math.sin(site.latitude * DEG);
    this.lonRad = site.longitude * DEG;
    this.siteRadius = R_EARTH + site.altitude;
    const mat = (color: number, metal = 0.1, rough = 0.7): THREE.MeshStandardMaterial => {
      const key = `${color}|${metal}|${rough}`;
      let m = this.matCache.get(key);
      if (!m) {
        m = new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });
        this.matCache.set(key, m);
        this.materials.push(m);
      }
      return m;
    };
    this.pad = buildPad(site, vehicle, (g) => { this.geometries.push(g); return g; }, mat);
    this.group.add(this.pad.group);
    this.shadowRadius = Math.max(140, vehicle.height * 1.9);
    for (const o of this.pad.terrainParts ?? []) {
      const mats: { mat: THREE.Material; base: number }[] = [];
      o.traverse((c) => {
        const m = (c as THREE.Mesh).material;
        if (Array.isArray(m)) for (const x of m) mats.push({ mat: x, base: x.opacity });
        else if (m) mats.push({ mat: m, base: m.opacity });
      });
      this.terrain.push({ object: o, materials: mats });
    }

    const mouth = this.pad.mouthRadius;
    this.smoke = new GroundSmoke({
      count: 220,
      trenchAzimuth: this.pad.trenchAzimuth,
      mouthRadius: mouth * 0.9,
      puffSize: Math.max(6, mouth * 0.95),
      speed: Math.max(28, vehicle.height * 0.8),
    });
    this.glow = new PadGlow(Math.max(30, mouth * 4));
    const deck = this.pad.deck ?? this.pad.group;
    deck.add(this.smoke.mesh);
    deck.add(this.glow.mesh);
  }

  /**
   * ECI position of the pad.
   *
   * While the vehicle is still standing on the pad it *is* the pad, so the
   * complex is derived from `frame.r`. That matters because `Simulation` seeds
   * `state.r` from the site at `gmst0` but `state.theta` at
   * `gmst0 + OMEGA_EARTH * t0` with t0 = -10 s: the two disagree by ten
   * seconds of Earth rotation (4.6 km at the equator, 3.2 km at Baikonur)
   * until the prelaunch integrator re-syncs them on the first step. Taking the
   * site from `frame.theta` in that initial state pushes the whole complex
   * off-screen in the default preview. Both expressions agree a few seconds
   * into the countdown, so the hand-over at liftoff is continuous.
   */
  private siteEci(frame: VisualFrame): Vec3 {
    const out = this.siteVec;
    if (frame.status === 'prelaunch' && !frame.liftoff) {
      const n = Math.hypot(frame.r.x, frame.r.y, frame.r.z);
      if (n > 1) {
        const k = this.siteRadius / n;
        out.x = frame.r.x * k;
        out.y = frame.r.y * k;
        out.z = frame.r.z * k;
        return out;
      }
    }
    // groundPositionEci(lat, lon, alt, theta), inlined so the hot path does
    // not allocate a Vec3 per rendered frame
    const lam = this.lonRad + frame.theta;
    out.x = this.siteRadius * this.cosLat * Math.cos(lam);
    out.y = this.siteRadius * this.cosLat * Math.sin(lam);
    out.z = this.siteRadius * this.sinLat;
    return out;
  }

  /**
   * Fade the local terrain patch out with slant range instead of popping it
   * off at a fixed distance: a 13 km disc of tan geometry composited over the
   * Blue-Marble globe reads as a lens with a hard rim from a few tens of km up.
   */
  private setTerrainFade(f: number): void {
    if (Math.abs(f - this.terrainFade) < 0.004) return;
    this.terrainFade = f;
    for (const entry of this.terrain) {
      entry.object.visible = f > 0.01;
      for (const m of entry.materials) m.mat.opacity = m.base * f;
    }
  }

  /** Position and orient the complex, then animate it from the frame. */
  update(scene: SceneManager, frame: VisualFrame): void {
    const r = this.siteEci(frame);
    scene.toScene(r, this.tmp);
    this.group.position.copy(this.tmp);
    const { east, north, up } = enuFrame(r);
    this.basis.makeBasis(
      this.xAxis.set(east.x, east.y, east.z),
      this.yAxis.set(up.x, up.y, up.z),
      this.zAxis.set(-north.x, -north.y, -north.z),
    );
    this.group.quaternion.setFromRotationMatrix(this.basis);
    const dist = this.group.position.distanceTo(scene.camera.position);
    // structures are metre-scale: past the terrain fade there is nothing left
    // worth drawing over the globe
    this.group.visible = dist < TERRAIN_FAR * 1.1;
    if (!this.group.visible) return;
    this.setTerrainFade(clamp01(1 - smoothstep(TERRAIN_NEAR, TERRAIN_FAR, dist)));

    this.pad.animate(frame.t, frame.altitudeAGL);

    // The first stage's ignition time is only meaningful once it has ignited
    // (a liquid core lights several seconds *before* T-0, so the raw field is
    // 0 both on an un-ignited pad and at liftoff). A pad abort must not blow a
    // cloud out of the trench.
    const st0 = frame.stages.length ? frame.stages[0] : null;
    if (!st0 || !st0.ignited) {
      this.smoke.update(-1, 0);
      this.glow.update(0, frame.t);
      return;
    }
    const since = frame.t - (st0.ignitionTime ?? 0);
    // the cloud builds at ignition and dissipates over the following half minute
    const cloud = smoothstep(-0.15, 0.4, since) * (1 - smoothstep(20, 36, since));
    this.smoke.update(since, cloud);
    const near = 1 - smoothstep(25, 220, frame.altitudeAGL);
    this.glow.update(frame.thrust > 0 ? near * Math.max(0.25, frame.throttle) : 0, frame.t);
  }

  dispose(): void {
    this.smoke.dispose();
    this.glow.dispose();
    for (const m of this.materials) m.dispose();
    for (const g of this.geometries) g.dispose();
    this.geometries = [];
    this.terrain = [];
    disposeObject(this.group);
  }
}
