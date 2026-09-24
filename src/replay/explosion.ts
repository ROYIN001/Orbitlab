/**
 * Loss-of-vehicle break-up (audit item B10).
 *
 * Replay-safe by construction:
 *
 * - it is **edge-triggered on the `evt.vehicleLost` event**, not on the latched
 *   `destroyed` flag, so scrubbing the cursor back before the break-up removes
 *   the effect and scrubbing forward again plays it from the start;
 * - every element's direction, speed, size, rotation and phase is hashed from
 *   its index and the mission time of the break-up (`hash11s`), never from
 *   `Math.random`, so the replayed failure looks exactly like the live one;
 * - the ECI position at break-up is captured once and the group is re-based on
 *   the floating origin every frame, so it stays where the vehicle died instead
 *   of following the camera target;
 * - every billboard shares one plane geometry and one of two canvas textures,
 *   both module-level and marked `userData.shared` like the rest of the
 *   renderer's shared assets, and `disposeObject` releases the per-billboard
 *   materials on fade-out, on a scrub, and on a new mission.
 *
 * **What it looks like, and why it is built in four layers.** The first version
 * was fifteen spheres that all grew at the same rate from the same point, which
 * at any age past half a second is one pale-yellow disc — a review called it
 * "two flat overlapping glowing discs rather than a break-up", which is exactly
 * what a set of concentric spheres of equal radius is. A break-up reads as one
 * only if the parts of it are doing different things:
 *
 * - a **flash** that is over almost before it starts, which is what fixes the
 *   instant of the event in the eye;
 * - a **fireball** of billboards at different scales, speeds and rotations, so
 *   the outline is ragged and keeps changing;
 * - **shards** thrown much faster than the fire, which is the only part that
 *   says "the vehicle came apart" rather than "something glowed";
 * - a **smoke** puff that is not additive, expands slowly and outlives the
 *   fire, so the frame does not simply go back to empty sky.
 *
 * The expansion is driven by wall-clock seconds: the simulation stops at
 * `status === 'failed'`, so mission time is frozen from the break-up onwards
 * and cannot drive an animation.
 */
import * as THREE from 'three';
import type { SceneManager } from '../render/scene';
import { disposeObject } from '../render/dispose';
import { clamp01, hash11, hash11s, smoothstep } from '../render/noise';
import type { VisualFrame } from '../physics/frame';
import type { SimEvent } from '../physics/simulation';
import type { Vec3 } from '../physics/vec3';

/** Wall-clock lifetime of the whole effect, s: the smoke is the last to go. */
const DURATION = 3.6;
/** Counts per layer. 26 billboards is one draw call per material. */
const FLASH = 3;
const FIRE = 9;
const SHARDS = 12;
const SMOKE = 7;
/**
 * Time constant of the outward motion, s. Every element decelerates as
 * `v · τ · (1 − e^(−a/τ))`, so it covers `v · τ` metres in total and slows into
 * the air it is pushing instead of travelling in a straight line for ever.
 */
const DECEL = 0.55;

interface Puff {
  mesh: THREE.Mesh;
  /** metres per second, scene axes */
  vel: THREE.Vector3;
  /** size at age 0 and at `DURATION`, in metres */
  size0: number;
  size1: number;
  /** billboard roll, rad, and its rate */
  roll: number;
  spin: number;
  /** wall-clock seconds this puff is alive for */
  life: number;
  /** wall-clock seconds before it appears */
  delay: number;
  /** peak opacity */
  peak: number;
}

let softTex: THREE.Texture | null = null;
let smokeTex: THREE.Texture | null = null;
let quad: THREE.PlaneGeometry | null = null;

/** A radial falloff, so a billboard has no edge to give itself away. */
function softTexture(): THREE.Texture {
  if (softTex) return softTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.32, 'rgba(255,246,214,0.72)');
  grad.addColorStop(0.7, 'rgba(255,170,70,0.20)');
  grad.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.shared = true;
  softTex = t;
  return t;
}

/**
 * The same falloff with a lumpy edge: a smoke puff whose silhouette is a circle
 * is a disc, and discs are what the old effect was criticised for. The lumps
 * are deterministic (`hash11`), so the texture is identical on every run.
 */
function smokeTexture(): THREE.Texture {
  if (smokeTex) return smokeTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 9; i++) {
    const a = hash11(i * 3.7) * Math.PI * 2;
    const rr = 9 + hash11(i * 5.3 + 1.1) * 10;
    const x = 32 + Math.cos(a) * (5 + hash11(i * 2.1) * 11);
    const y = 32 + Math.sin(a) * (5 + hash11(i * 8.9) * 11);
    const grad = g.createRadialGradient(x, y, 0, x, y, rr);
    grad.addColorStop(0, 'rgba(255,255,255,0.30)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.13)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, rr, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.shared = true;
  smokeTex = t;
  return t;
}

function quadGeometry(): THREE.PlaneGeometry {
  if (!quad) {
    quad = new THREE.PlaneGeometry(1, 1);
    quad.userData.shared = true;
  }
  return quad;
}

export class ExplosionEffect {
  private group: THREE.Group | null = null;
  private puffs: Puff[] = [];
  private eci: Vec3 = { x: 0, y: 0, z: 0 };
  private age = 0;
  /** break-up time of the effect currently playing (or already played) */
  private playedFor: number | null = null;
  private pos = new THREE.Vector3();

  /**
   * Drive the effect from the displayed frame. `dtReal` is wall-clock seconds.
   * `events` is the recorded event log; only events at or before `frame.t`
   * count, so a seeked frame before the break-up shows no fireball.
   *
   * @param size longest dimension of the vehicle that was lost, m — the whole
   *        effect is scaled off it, so an Electron does not break up in a
   *        Starship-sized fireball.
   */
  update(scene: SceneManager, frame: VisualFrame, events: readonly SimEvent[], dtReal: number, size: number): void {
    let lossT: number | null = null;
    // G06: after an abort the frame is the crew's, and the rocket they left breaks up where it was
    const left = frame.abort?.rocketLost;
    if (left && left.t <= frame.t + 1e-6) lossT = left.t;
    else for (const e of events) {
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
      this.spawn(scene, lossT, left ? left.r : frame.r, left ? 30 : Math.max(6, size));
    }
    const g = this.group;
    if (!g) return;
    this.age += Math.max(0, dtReal);
    if (this.age >= DURATION) {
      // fade complete: release the GPU resources but remember that this
      // break-up has already played, so it does not loop.
      this.release();
      return;
    }
    scene.toScene(this.eci, this.pos);
    g.position.copy(this.pos);
    for (const p of this.puffs) {
      const a = this.age - p.delay;
      const m = p.mesh;
      if (a <= 0 || a >= p.life) { m.visible = false; continue; }
      m.visible = true;
      const u = a / p.life;
      m.position.copy(p.vel).multiplyScalar(DECEL * (1 - Math.exp(-a / DECEL)));
      m.scale.setScalar(p.size0 + (p.size1 - p.size0) * Math.pow(u, 0.55));
      // Billboard: face the camera, then roll about the view axis. Per-mesh
      // roll is the reason these are planes and not `THREE.Sprite`s — a sprite
      // takes its rotation from the shared material, so every puff would spin
      // together and the cloud would read as one rigid object.
      m.quaternion.copy(scene.camera.quaternion);
      m.rotateZ(p.roll + p.spin * a);
      // Fast attack, long decay: the eye needs the element to arrive, then to
      // be taken away without a visible switch-off.
      const o = p.peak * smoothstep(0, 0.09, u) * (1 - smoothstep(0.35, 1, u));
      (m.material as THREE.MeshBasicMaterial).opacity = clamp01(o);
    }
  }

  private spawn(scene: SceneManager, tDestroyed: number, r: Vec3, size: number): void {
    const g = new THREE.Group();
    const geo = quadGeometry();
    const seed = tDestroyed * 0.137;
    this.puffs = [];
    // A material per billboard, not per layer: `opacity` lives on the material,
    // and every element of this effect is on its own clock (`delay`, `life`).
    // Thirty-one `MeshBasicMaterial`s sharing two textures and one geometry is
    // a few kilobytes and thirty-one draw calls for three and a half seconds,
    // once per lost vehicle; `disposeObject` releases all of them on fade-out.
    const LAYERS = {
      flash: { color: 0xfff6d8, additive: true, tex: softTexture() },
      fire: { color: 0xffa63c, additive: true, tex: softTexture() },
      shard: { color: 0xffd07a, additive: true, tex: softTexture() },
      smoke: { color: 0x4a4740, additive: false, tex: smokeTexture() },
    } as const;
    const add = (layer: keyof typeof LAYERS, p: Omit<Puff, 'mesh'>): void => {
      const l = LAYERS[layer];
      const mat = new THREE.MeshBasicMaterial({
        color: l.color, map: l.tex, transparent: true, opacity: 0, depthWrite: false, fog: false,
        blending: l.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 6;
      mesh.visible = false;
      g.add(mesh);
      this.puffs.push({ ...p, mesh });
    };
    /** A deterministic unit direction for element `k` of layer `layer`. */
    const dir = (layer: number, k: number): THREE.Vector3 => {
      const s = seed + layer * 31.7 + k * 1.61;
      const v = new THREE.Vector3(hash11s(s), hash11s(s + 0.31), hash11s(s + 0.62));
      if (v.lengthSq() < 1e-6) v.set(0, 1, 0);
      return v.normalize();
    };

    // 1. flash — over in a third of a second, and the reason the instant reads
    for (let i = 0; i < FLASH; i++) {
      add('flash', {
        vel: dir(0, i).multiplyScalar(2 + hash11(seed + i) * 6),
        size0: size * (0.2 + 0.1 * hash11(seed + i * 2.3)),
        size1: size * (1.0 + 0.8 * hash11(seed + i * 4.1)),
        roll: hash11(seed + i * 5.7) * 6.28, spin: hash11s(seed + i * 7.3) * 1.2,
        life: 0.34, delay: 0, peak: 1,
      });
    }
    // 2. fireball — ragged, because every billboard is a different size moving
    //    at a different speed in a different direction. Sized and thrown so the
    //    individual puffs stay resolvable at the framing the camera actually
    //    holds at break-up (measured 177 m from a 46 m vehicle, i.e. about
    //    165 m of frame width): a puff much wider than a third of that, or one
    //    that never travels more than its own radius, merges with its
    //    neighbours and the whole effect goes back to being one disc.
    for (let i = 0; i < FIRE; i++) {
      const h = hash11(seed + 100 + i * 1.9);
      add('fire', {
        vel: dir(1, i).multiplyScalar(size * (0.5 + 0.9 * h)),
        size0: size * (0.12 + 0.1 * h),
        size1: size * (0.45 + 0.65 * hash11(seed + 140 + i * 2.7)),
        roll: hash11(seed + 180 + i) * 6.28, spin: hash11s(seed + 210 + i) * 2.4,
        life: 1.1 + 0.9 * hash11(seed + 240 + i), delay: 0.02 + 0.22 * h, peak: 0.85,
      });
    }
    // 3. shards — thrown far faster than the fire, and small enough to stay
    //    points; this is the layer that says the hardware came apart
    for (let i = 0; i < SHARDS; i++) {
      const h = hash11(seed + 300 + i * 3.1);
      add('shard', {
        vel: dir(2, i).multiplyScalar(size * (1.1 + 1.8 * h)),
        size0: size * 0.05,
        size1: size * (0.06 + 0.05 * h),
        roll: hash11(seed + 330 + i) * 6.28, spin: hash11s(seed + 360 + i) * 9,
        life: 0.9 + 1.4 * h, delay: 0.03, peak: 0.95,
      });
    }
    // 4. smoke — not additive, slower, bigger, and still there when the fire
    //    has gone, so the break-up leaves something behind
    for (let i = 0; i < SMOKE; i++) {
      const h = hash11(seed + 400 + i * 2.2);
      add('smoke', {
        vel: dir(3, i).multiplyScalar(size * (0.2 + 0.5 * h)),
        size0: size * (0.22 + 0.16 * h),
        size1: size * (0.8 + 1.0 * hash11(seed + 440 + i)),
        roll: hash11(seed + 470 + i) * 6.28, spin: hash11s(seed + 500 + i) * 0.7,
        life: 2.3 + 1.2 * h, delay: 0.12 + 0.5 * h, peak: 0.34,
      });
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
    this.puffs = [];
  }

  /** Full teardown: a new mission, or a cursor scrubbed before the break-up. */
  clear(): void {
    this.release();
    this.playedFor = null;
    this.age = 0;
  }
}
