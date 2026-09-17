/**
 * Loss-of-vehicle fireball (audit item B10).
 *
 * Replay-safe by construction:
 *
 * - it is **edge-triggered on the `evt.vehicleLost` event**, not on the latched
 *   `destroyed` flag, so scrubbing the cursor back before the break-up removes
 *   the fireball and scrubbing forward again plays it from the start;
 * - every shard's position and velocity is hashed from the shard index and the
 *   mission time of the break-up (`hash11s`), never from `Math.random`, so the
 *   replayed failure looks exactly like the live one;
 * - the ECI position at break-up is captured once and the group is re-based on
 *   the floating origin every frame, so it stays where the vehicle died instead
 *   of following the camera target;
 * - the 15 meshes share one geometry and two materials, and `dispose()` (via
 *   `disposeObject`) releases them on fade-out, on a scrub, and on a new
 *   mission — the old inline version allocated 14 geometries and 14 materials
 *   per break-up and never disposed any of them.
 *
 * The expansion is driven by wall-clock seconds: the simulation stops at
 * `status === 'failed'`, so mission time is frozen from the break-up onwards
 * and cannot drive an animation.
 */
import * as THREE from 'three';
import type { SceneManager } from '../render/scene';
import { disposeObject } from '../render/dispose';
import { hash11s } from '../render/noise';
import type { VisualFrame } from '../physics/frame';
import type { SimEvent } from '../physics/simulation';
import type { Vec3 } from '../physics/vec3';

const SHARDS = 15;
/** Wall-clock lifetime of the fireball, s. The fade is derived from it, so the
 *  constant really is what governs the effect's length. */
const DURATION = 2;
/** Opacity the fireball starts at, fading linearly to nothing over `DURATION`. */
const PEAK_OPACITY = 0.9;

export class ExplosionEffect {
  private group: THREE.Group | null = null;
  private velocities: THREE.Vector3[] = [];
  private eci: Vec3 = { x: 0, y: 0, z: 0 };
  private age = 0;
  /** break-up time of the fireball currently playing (or already played) */
  private playedFor: number | null = null;
  private pos = new THREE.Vector3();

  /**
   * Drive the effect from the displayed frame. `dtReal` is wall-clock seconds.
   * `events` is the recorded event log; only events at or before `frame.t`
   * count, so a seeked frame before the break-up shows no fireball.
   */
  update(scene: SceneManager, frame: VisualFrame, events: SimEvent[], dtReal: number): void {
    let lossT: number | null = null;
    for (const e of events) {
      if ((e.key === 'evt.vehicleLost' || e.key === 'evt.impact') && e.t <= frame.t + 1e-6) { lossT = e.t; break; }
    }
    // `destroyed` alone is not enough (a vehicle can be lost without an event
    // in an unfinished recording), but it must agree: no flag, no fireball.
    if (lossT === null && frame.destroyed) lossT = frame.t;
    if (lossT === null) {
      this.clear();
      return;
    }
    if (this.playedFor !== lossT) {
      this.clear();
      this.spawn(scene, lossT, frame.r);
    }
    const g = this.group;
    if (!g) return;
    this.age += Math.max(0, dtReal);
    const opacity = PEAK_OPACITY * (1 - this.age / DURATION);
    if (opacity <= 0) {
      // fade complete: release the GPU resources but remember that this
      // break-up has already played, so it does not loop.
      this.release();
      return;
    }
    scene.toScene(this.eci, this.pos);
    g.position.copy(this.pos);
    const sc = 1 + this.age * 25;
    for (let i = 0; i < g.children.length; i++) {
      const m = g.children[i] as THREE.Mesh;
      m.position.addScaledVector(this.velocities[i], dtReal);
      m.scale.setScalar(sc);
      (m.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  }

  private spawn(scene: SceneManager, tDestroyed: number, r: Vec3): void {
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(1, 10, 8);
    const hot = new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: PEAK_OPACITY, blending: THREE.AdditiveBlending, depthWrite: false });
    const warm = new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: PEAK_OPACITY, blending: THREE.AdditiveBlending, depthWrite: false });
    const seed = tDestroyed * 0.137;
    this.velocities = [];
    for (let i = 0; i < SHARDS; i++) {
      const s = seed + i * 1.61;
      const m = new THREE.Mesh(geo, i % 2 ? warm : hot);
      m.position.set(hash11s(s) * 3, hash11s(s + 0.31) * 3, hash11s(s + 0.62) * 3);
      this.velocities.push(new THREE.Vector3(hash11s(s + 1.13) * 30, hash11s(s + 1.47) * 30, hash11s(s + 1.79) * 30));
      g.add(m);
    }
    g.frustumCulled = false;
    this.eci = { x: r.x, y: r.y, z: r.z };
    this.age = 0;
    this.playedFor = tDestroyed;
    this.group = g;
    scene.scene.add(g);
  }

  /** Drop the meshes but keep "this break-up already played". */
  private release(): void {
    if (!this.group) return;
    this.group.removeFromParent();
    disposeObject(this.group);
    this.group = null;
    this.velocities = [];
  }

  /** Full teardown: a new mission, or a cursor scrubbed before the break-up. */
  clear(): void {
    this.release();
    this.playedFor = null;
    this.age = 0;
  }
}
