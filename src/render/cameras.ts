import * as THREE from 'three';
import type { Vec3 } from '../physics/vec3';
import { damp, fbm1s } from './noise';

export type CameraMode = 'exterior' | 'onboard' | 'space' | 'map';

/** Cinematic phase: picks the default framing of the exterior camera. */
export type CamPhase = 'pad' | 'liftoff' | 'ascent' | 'staging' | 'coast' | 'orbit';

export interface CameraFocus {
  /** vehicle position in scene coordinates (normally the origin) */
  pos: THREE.Vector3;
  /** unit vectors (ECI) at the vehicle */
  up: Vec3;
  east: Vec3;
  north: Vec3;
  /** body axis (unit) */
  dir: Vec3;
  /** "window" side: unit vector perpendicular to dir, roughly toward the local horizontal */
  side: Vec3;
  /** stack height and radius, m */
  height: number;
  radius: number;
  /** Earth centre in scene coordinates */
  earthCenter: THREE.Vector3;
  /** shake amplitude 0..1 */
  shake: number;
  /** orbital speed direction (ECI unit) for the space view framing */
  vDir: Vec3;
  /** mission time, s — drives the shake deterministically */
  t: number;
  /** vehicle altitude above the pad, m (keeps the camera out of the ground) */
  agl: number;
  phase: CamPhase;
}

interface Framing {
  /** elevation above the vehicle's local horizontal, rad */
  el: number;
  /** distance in stack heights */
  dist: number;
  /** how far up the stack the camera aims, in stack heights */
  aim: number;
  /** vertical lift of the camera, in stack heights */
  lift: number;
}

const FRAMING: Record<CamPhase, Framing> = {
  // low angle looking up at the vehicle on the pad
  pad: { el: 0.0, dist: 1.9, aim: 0.5, lift: 0.22 },
  liftoff: { el: 0.02, dist: 2.4, aim: 0.5, lift: 0.3 },
  ascent: { el: 0.14, dist: 2.9, aim: 0.45, lift: 0.45 },
  staging: { el: 0.26, dist: 5.6, aim: 0.4, lift: 0.5 },
  coast: { el: 0.24, dist: 4.4, aim: 0.45, lift: 0.5 },
  orbit: { el: 0.3, dist: 3.6, aim: 0.4, lift: 0.4 },
};

export class CameraController {
  mode: CameraMode = 'exterior';
  /** user offsets, applied on top of the cinematic framing */
  az = 0.9;
  userEl = 0;
  zoom = 1;
  // space
  spaceAz = 0.3;
  spaceEl = 0.35;
  spaceDist = 2.9;
  private autoEl = FRAMING.pad.el;
  private autoDist = FRAMING.pad.dist;
  private autoAim = FRAMING.pad.aim;
  private autoLift = FRAMING.pad.lift;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private first = true;
  private pos = new THREE.Vector3();
  private target = new THREE.Vector3();
  private desired = new THREE.Vector3();
  private desiredTarget = new THREE.Vector3();
  private up = new THREE.Vector3();
  private east = new THREE.Vector3();
  private north = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private side = new THREE.Vector3();
  private horiz = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private e1 = new THREE.Vector3();
  private e2 = new THREE.Vector3();
  private rv = new THREE.Vector3();
  private zUp = new THREE.Vector3(0, 0, 1);

  attach(el: HTMLElement): void {
    el.addEventListener('pointerdown', (e) => {
      if (this.mode === 'map' || this.mode === 'onboard') return;
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      if (this.mode === 'exterior') {
        this.az -= dx * 0.008;
        this.userEl = Math.max(-0.8, Math.min(1.2, this.userEl + dy * 0.006));
      } else if (this.mode === 'space') {
        this.spaceAz -= dx * 0.006;
        this.spaceEl = Math.max(-1.45, Math.min(1.45, this.spaceEl + dy * 0.005));
      }
    });
    const stop = (e: PointerEvent) => {
      this.dragging = false;
      try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
    el.addEventListener('wheel', (e) => {
      if (this.mode === 'exterior') this.zoom = Math.max(0.35, Math.min(14, this.zoom * (e.deltaY > 0 ? 1.12 : 0.89)));
      else if (this.mode === 'space') this.spaceDist = Math.max(1.05, Math.min(12, this.spaceDist * (e.deltaY > 0 ? 1.1 : 0.9)));
      e.preventDefault();
    }, { passive: false });
  }

  /** Snap on the next frame (used when a new mission is previewed). */
  reset(): void {
    this.first = true;
    const f = FRAMING.pad;
    this.autoEl = f.el; this.autoDist = f.dist; this.autoAim = f.aim; this.autoLift = f.lift;
  }

  update(camera: THREE.PerspectiveCamera, f: CameraFocus, dt: number, earthRadius: number): void {
    const up = this.up.set(f.up.x, f.up.y, f.up.z);
    const east = this.east.set(f.east.x, f.east.y, f.east.z);
    const north = this.north.set(f.north.x, f.north.y, f.north.z);
    const dir = this.dir.set(f.dir.x, f.dir.y, f.dir.z);
    const side = this.side.set(f.side.x, f.side.y, f.side.z);
    const shake = f.shake;
    // deterministic turbulence from the mission time
    const jx = fbm1s(f.t * 9.1 + 0.3, 2) * shake;
    const jy = fbm1s(f.t * 7.7 + 11.9, 2) * shake;
    const jz = fbm1s(f.t * 8.3 + 23.1, 2) * shake;

    if (this.mode === 'exterior') {
      const fr = FRAMING[f.phase];
      // critically damped approach to the framing of the current phase
      const k = this.first ? 1e9 : 1.4;
      this.autoEl = damp(this.autoEl, fr.el, k, dt);
      this.autoDist = damp(this.autoDist, fr.dist, k, dt);
      this.autoAim = damp(this.autoAim, fr.aim, k, dt);
      this.autoLift = damp(this.autoLift, fr.lift, k, dt);
      const el = Math.max(-0.85, Math.min(1.45, this.autoEl + this.userEl));
      const d = f.height * this.autoDist * this.zoom;
      this.horiz.copy(east).multiplyScalar(Math.cos(this.az)).addScaledVector(north, Math.sin(this.az));
      this.desired.copy(f.pos)
        .addScaledVector(this.horiz, Math.cos(el) * d)
        .addScaledVector(up, Math.sin(el) * d + f.height * this.autoLift);
      // never dip below the ground near the pad
      const hAboveGround = this.tmp.copy(this.desired).sub(f.pos).dot(up) + f.agl;
      if (hAboveGround < 5) this.desired.addScaledVector(up, 5 - hAboveGround);
      this.desiredTarget.copy(f.pos).addScaledVector(dir, f.height * this.autoAim);
      const lambda = this.first ? 1e9 : 9;
      this.pos.set(damp(this.pos.x, this.desired.x, lambda, dt), damp(this.pos.y, this.desired.y, lambda, dt), damp(this.pos.z, this.desired.z, lambda, dt));
      this.target.set(damp(this.target.x, this.desiredTarget.x, lambda, dt), damp(this.target.y, this.desiredTarget.y, lambda, dt), damp(this.target.z, this.desiredTarget.z, lambda, dt));
      camera.position.copy(this.pos).add(this.tmp.set(jx, jy, jz).multiplyScalar(f.height * 0.012));
      camera.up.copy(up);
      camera.lookAt(this.target);
      camera.fov = 48;
      this.first = false;
    } else if (this.mode === 'onboard') {
      // side-mounted camera near the top of the stack, looking forward and out
      this.desired.copy(f.pos).addScaledVector(dir, f.height * 0.86).addScaledVector(side, f.radius * 1.15);
      camera.position.copy(this.desired).add(this.tmp.set(jx, jy, jz).multiplyScalar(f.radius * 0.02));
      this.tmp.copy(side).multiplyScalar(0.86).addScaledVector(dir, 0.5).normalize();
      camera.up.copy(dir);
      camera.lookAt(this.tmp.add(camera.position));
      camera.fov = 72;
      this.first = true;
    } else {
      // Space view: orbit around the Earth's centre, framing the vehicle
      // against the planet.
      //
      // The orbit radius is set by `spaceDist` but floored above the vehicle's
      // own altitude shell: a fixed multiple of the Earth's radius put the
      // camera *inside* the orbit at the zoomed-in end, so zooming in on a
      // 400 km pass swung the viewpoint under the vehicle instead of towards
      // it. `SceneManager`'s marker sprite is what makes the vehicle itself
      // visible at any of these distances.
      const rVeh = this.rv.copy(f.pos).sub(f.earthCenter).length();
      const alt = Math.max(0, rVeh - earthRadius);
      const R = Math.max(earthRadius * this.spaceDist, rVeh + Math.max(150e3, alt * 0.45));
      this.rv.normalize();
      this.e1.crossVectors(this.zUp, this.rv);
      if (this.e1.lengthSq() < 1e-12) this.e1.set(1, 0, 0);
      this.e1.normalize();
      this.e2.crossVectors(this.rv, this.e1).normalize();
      this.desired.copy(this.rv).multiplyScalar(Math.cos(this.spaceEl) * Math.cos(this.spaceAz))
        .addScaledVector(this.e1, Math.cos(this.spaceEl) * Math.sin(this.spaceAz))
        .addScaledVector(this.e2, Math.sin(this.spaceEl))
        .multiplyScalar(R)
        .add(f.earthCenter);
      camera.position.copy(this.desired);
      camera.up.copy(this.zUp);
      // Look at the vehicle, not at a point a third of the way to the Earth's
      // centre: the tracked object was never even in the middle of the frame.
      camera.lookAt(f.pos);
      camera.fov = 45;
      this.first = true;
    }
    // A non-finite camera position is self-sustaining and fatal. The exterior
    // rig is critically damped — `damp(prev, desired, …)` blends the previous
    // position into the new one — and `exp(-lambda*dt) * NaN` is NaN however
    // hard the rig snaps, so one bad frame poisons every later one. Downstream,
    // `SceneManager.update` derives the sun elevation and the sky colour from
    // the camera, and a NaN colour throws out of `addColorStop`, which kills
    // the animation loop outright (observed once during a scrub in a viewport
    // that was being resized under it). Re-seed instead of propagating: the
    // frame after this one snaps to the real framing, because `first` is set.
    const p = camera.position;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
      this.first = true;
      this.pos.set(0, 0, 0);
      this.target.set(0, 0, 0);
      const back = Number.isFinite(f.height) && f.height > 0 ? f.height * 3 : 200;
      p.set(f.pos.x + back, f.pos.y, f.pos.z + back);
      camera.up.set(0, 0, 1);
      camera.lookAt(f.pos);
    }
    camera.updateProjectionMatrix();
  }
}
