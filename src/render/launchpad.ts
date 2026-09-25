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
import { buildPad, type PadBuild, type TowerReturn } from './pads';
import { GroundSmoke, PadGlow } from './smoke';
import { disposeObject } from './dispose';
import { clamp01, smoothstep } from './noise';
import { quatRotate } from '../physics/rigid/math';

/**
 * How high the vehicle's base stands above the pad, m: what a pad's arms and
 * masts react to. A rigid body's state is its centre of mass, 14.5 m up a
 * Soyuz on the pad, so its altitude alone had an R-7's arms open before the
 * engines lit. A pad abort's escape is not the rocket leaving.
 */
function baseHeight(frame: VisualFrame): number {
  if (frame.abort && !frame.liftoff) return 0;
  if (!frame.rigid) return frame.altitudeAGL;
  const off = quatRotate(frame.rigid.attitudeQ, frame.rigid.renderOffsetBody), r = frame.r;
  return frame.altitudeAGL + (off.x * r.x + off.y * r.y + off.z * r.z) / Math.hypot(r.x, r.y, r.z);
}

/**
 * Slant range over which the local terrain patch dissolves into the globe.
 *
 * The patch is 13 km of shaded relief with a 90 km apron ring, drawn on top of
 * a 2048-pixel Blue Marble sphere. Handing over inside a 20 km window put the
 * swap right where the ascent camera lives: for the whole of the 50–140 km
 * stretch the two representations of the same ground were visibly fighting,
 * and then the local one blinked out. Both meshes already carry the Earth's
 * curvature (`curveDrop`), so the honest fix is to make the hand-over long
 * enough that no single frame shows a seam — by 140 km the patch subtends
 * about 5° and there is nothing left in it the globe does not also have.
 */
const TERRAIN_NEAR = 25e3;
const TERRAIN_FAR = 120e3;
/** slant range past which the metre-scale pad structures stop being drawn, m */
const STRUCTURES_FAR = 55e3;

export class LaunchPadView {
  readonly group = new THREE.Group();
  private pad: PadBuild;
  private smoke: GroundSmoke;
  /** slower, larger, fainter second layer of the pad cloud */
  private smokeSlow: GroundSmoke;
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

  /**
   * @param opts.padId the site's pad (`SiteExtra.pads`); absent, its first
   * @param opts.azimuth the launch azimuth, rad from north: an R-7's launch table turns to it
   */
  constructor(site: SiteExtra, vehicle: VehicleSpec, opts: { padId?: string; azimuth?: number } = {}) {
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
    this.pad = buildPad(site, vehicle, (g) => { this.geometries.push(g); return g; }, mat, opts);
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
      count: 300,
      trenchAzimuth: this.pad.trenchAzimuth,
      mouthRadius: mouth * 0.9,
      puffSize: Math.max(7, mouth * 1.05),
      speed: Math.max(28, vehicle.height * 0.8),
      emitDuration: 13,
      opacity: 1,
    });
    // Second, slower layer. One sheet of billboards, however many, reads as a
    // set of discrete discs because every puff moves at the same rate and dies
    // at the same age. A sparser layer of much larger, much slower, much
    // fainter puffs living three times as long sits behind it, and the two
    // together read as one volume with an inside and an outside.
    this.smokeSlow = new GroundSmoke({
      count: 150,
      trenchAzimuth: this.pad.trenchAzimuth,
      mouthRadius: mouth * 1.5,
      puffSize: Math.max(16, mouth * 2.4),
      speed: Math.max(11, vehicle.height * 0.3),
      color: 0xc6cad2,
      hot: 0xffc890,
      emitDuration: 17,
      life: 78,
      rise: 0.42,
      opacity: 0.34,
    });
    this.smokeSlow.mesh.renderOrder = 3;
    this.glow = new PadGlow(Math.max(30, mouth * 4));
    const deck = this.pad.deck ?? this.pad.group;
    deck.add(this.smokeSlow.mesh);
    deck.add(this.smoke.mesh);
    deck.add(this.glow.mesh);
  }

  /**
   * ECI position of the pad, from the frame's own sidereal angle.
   *
   * There used to be a special case here for the prelaunch frames, because
   * `Simulation` seeded `state.r` from the site at `gmst0` while `state.theta`
   * was already `gmst0 + OMEGA_EARTH * t0` with t0 = -10 s — ten seconds of
   * Earth rotation, 3-5 km of pad offset, until the integrator re-synced them
   * on the first step. The physics wave fixed the seed (simulation.ts seeds
   * `state.r` at `theta0 + OMEGA_EARTH * t0`, measured at a pad offset of
   * 0.000 km), so the correction is dead code and is gone: the pad now comes
   * from one expression for the whole flight, which is the only way the
   * hand-over at liftoff can be continuous by construction rather than by
   * agreement.
   */
  private siteEci(frame: VisualFrame): Vec3 {
    const out = this.siteVec;
    // groundPositionEci(lat, lon, alt, theta), inlined so the hot path does
    // not allocate a Vec3 per rendered frame
    const lam = this.lonRad + frame.theta;
    out.x = this.siteRadius * this.cosLat * Math.cos(lam);
    out.y = this.siteRadius * this.cosLat * Math.sin(lam);
    out.z = this.siteRadius * this.sinLat;
    return out;
  }

  /**
   * A booster in the frame flying back to be caught by this pad's tower: how
   * high its base is above the level the vehicle stood on, and where the arms
   * hold it.
   */
  private towerReturn(frame: VisualFrame): TowerReturn | undefined {
    for (const d of frame.debris) {
      const target = d.recovery?.target;
      if (target?.kind !== 'tower') continue;
      const anchor = d.anchor ?? 0;
      const bx = d.r.x + d.dir.x * anchor, by = d.r.y + d.dir.y * anchor, bz = d.r.z + d.dir.z * anchor;
      return { baseHeight: Math.hypot(bx, by, bz) - this.siteRadius, catchHeight: target.catchHeight ?? 0 };
    }
    return undefined;
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

  /**
   * Position and orient the complex, then animate it from the frame.
   *
   * @param night 0 = full day, 1 = night at the pad. Drives the floodlights,
   *        which are the only thing that makes a night launch visible at all
   *        (see `padFloodlights` in pads.ts).
   */
  update(scene: SceneManager, frame: VisualFrame, night: number): void {
    this.pad.setNight?.(night);
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
    this.group.visible = dist < TERRAIN_FAR;
    if (!this.group.visible) return;
    this.setTerrainFade(clamp01(1 - smoothstep(TERRAIN_NEAR, TERRAIN_FAR, dist)));
    // The structures are opaque and a few tens of metres across, so there is
    // no fade to do: past ~55 km a 120 m mast is under two pixels and the only
    // thing switching it off changes is the draw-call count.
    if (this.pad.structures) this.pad.structures.visible = dist < STRUCTURES_FAR;

    this.pad.animate(frame.t, baseHeight(frame), this.towerReturn(frame));

    // The first stage's ignition time is only meaningful once it has ignited
    // (a liquid core lights several seconds *before* T-0, so the raw field is
    // 0 both on an un-ignited pad and at liftoff). A pad abort must not blow a
    // cloud out of the trench.
    const st0 = frame.stages.length ? frame.stages[0] : null;
    if (!st0 || !st0.ignited) {
      this.smoke.update(-1, 0);
      this.smokeSlow.update(-1, 0);
      this.glow.update(0, frame.t);
      return;
    }
    const since = frame.t - (st0.ignitionTime ?? 0);
    // the cloud builds at ignition and dissipates over the following half minute
    const cloud = smoothstep(-0.15, 0.4, since) * (1 - smoothstep(20, 36, since));
    this.smoke.update(since, cloud);
    // the slow layer lags the jet and hangs around long after it has stopped
    this.smokeSlow.update(since, smoothstep(0.2, 2.5, since) * (1 - smoothstep(48, 95, since)));
    const near = 1 - smoothstep(25, 220, frame.altitudeAGL);
    this.glow.update(frame.thrust > 0 ? near * Math.max(0.25, frame.throttle) : 0, frame.t);
  }

  dispose(): void {
    this.smoke.dispose();
    this.smokeSlow.dispose();
    this.glow.dispose();
    for (const m of this.materials) m.dispose();
    for (const g of this.geometries) g.dispose();
    this.geometries = [];
    this.terrain = [];
    disposeObject(this.group);
  }
}
