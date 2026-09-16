import * as THREE from 'three';
import type { Vec3 } from '../physics/vec3';

export type CameraMode = 'exterior' | 'onboard' | 'space' | 'map';

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
}

export class CameraController {
  mode: CameraMode = 'exterior';
  // exterior
  az = 0.9;
  el = 0.18;
  dist = 3.2;
  // space
  spaceAz = 0.3;
  spaceEl = 0.35;
  spaceDist = 2.9;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private tmp = new THREE.Vector3();
  private shakeT = 0;
  /** active pointers for touch pinch-zoom */
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  /** smoothed camera position for the exterior view */
  private smoothPos = new THREE.Vector3();
  private smoothInit = false;
  private lastMode: CameraMode = 'exterior';

  attach(el: HTMLElement): void {
    const isControl = (t: EventTarget | null): boolean => {
      const n = t as HTMLElement | null;
      return !!n && !!n.closest && !!n.closest('button, select, input, label, a, #controls, #hud, #ticker');
    };
    const zoomBy = (factor: number) => {
      if (this.mode === 'exterior') this.dist = Math.max(1.2, Math.min(60, this.dist * factor));
      else if (this.mode === 'space') this.spaceDist = Math.max(1.05, Math.min(12, this.spaceDist * factor));
    };
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (e) => {
      // never capture the pointer when the user is pressing a control inside the viewport
      if (isControl(e.target)) return;
      if (this.mode === 'map' || this.mode === 'onboard') return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        this.dragging = false;
      } else {
        this.dragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
      try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    });
    el.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (p) { p.x = e.clientX; p.y = e.clientY; }
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinchDist > 0 && d > 0) zoomBy(this.pinchDist / d);
        this.pinchDist = d;
        return;
      }
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      if (this.mode === 'exterior') {
        this.az -= dx * 0.008;
        this.el = Math.max(-0.6, Math.min(1.45, this.el + dy * 0.006));
      } else if (this.mode === 'space') {
        this.spaceAz -= dx * 0.006;
        this.spaceEl = Math.max(-1.45, Math.min(1.45, this.spaceEl + dy * 0.005));
      }
    });
    const stop = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinchDist = 0;
      if (this.pointers.size === 1) {
        const [a] = [...this.pointers.values()];
        this.lastX = a.x; this.lastY = a.y;
        this.dragging = true;
      } else if (this.pointers.size === 0) {
        this.dragging = false;
      }
      try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
    el.addEventListener('lostpointercapture', stop);
    el.addEventListener('wheel', (e) => {
      if (isControl(e.target)) return;
      if (this.mode === 'map' || this.mode === 'onboard') return;
      zoomBy(e.deltaY > 0 ? 1.12 : 0.89);
      e.preventDefault();
    }, { passive: false });
  }

  update(camera: THREE.PerspectiveCamera, f: CameraFocus, dt: number, earthRadius: number): void {
    const up = new THREE.Vector3(f.up.x, f.up.y, f.up.z);
    const east = new THREE.Vector3(f.east.x, f.east.y, f.east.z);
    const north = new THREE.Vector3(f.north.x, f.north.y, f.north.z);
    const dir = new THREE.Vector3(f.dir.x, f.dir.y, f.dir.z);
    const side = new THREE.Vector3(f.side.x, f.side.y, f.side.z);
    this.shakeT += dt * 37;
    const sh = f.shake;
    const jitter = () => this.tmp.set(Math.sin(this.shakeT * 1.3) * sh, Math.sin(this.shakeT * 1.7 + 1) * sh, Math.cos(this.shakeT * 1.1) * sh);

    if (this.mode !== this.lastMode) { this.smoothInit = false; this.lastMode = this.mode; }
    if (this.mode === 'exterior') {
      const d = f.height * this.dist;
      const horiz = east.clone().multiplyScalar(Math.cos(this.az)).add(north.clone().multiplyScalar(Math.sin(this.az)));
      const offset = horiz.multiplyScalar(Math.cos(this.el) * d).add(up.clone().multiplyScalar(Math.sin(this.el) * d + f.height * 0.45));
      const desired = f.pos.clone().add(offset);
      // critically damped lag for a cinematic chase feel (position is relative to the vehicle)
      if (!this.smoothInit) { this.smoothPos.copy(desired); this.smoothInit = true; }
      const k = 1 - Math.exp(-dt * 6);
      this.smoothPos.lerp(desired, k);
      camera.position.copy(this.smoothPos).add(jitter().multiplyScalar(0.4));
      camera.up.copy(up);
      const target = f.pos.clone().add(dir.clone().multiplyScalar(f.height * 0.45));
      camera.lookAt(target);
      camera.fov = 50;
    } else if (this.mode === 'onboard') {
      // camera mounted near the nose looking out of a side window, slightly downward
      const eye = f.pos.clone().add(dir.clone().multiplyScalar(f.height * 0.88)).add(side.clone().multiplyScalar(f.radius * 0.9));
      camera.position.copy(eye).add(jitter().multiplyScalar(0.08));
      const look = side.clone().multiplyScalar(1).add(dir.clone().multiplyScalar(-0.25)).normalize();
      camera.up.copy(dir);
      camera.lookAt(eye.clone().add(look));
      camera.fov = 70;
    } else {
      // space view: orbit around Earth centre, framing the vehicle
      const R = earthRadius * this.spaceDist;
      const z = new THREE.Vector3(0, 0, 1);
      const rv = f.pos.clone().sub(f.earthCenter).normalize();
      // basis around the vehicle's radial direction so the vehicle stays in view
      const e1 = new THREE.Vector3().crossVectors(z, rv);
      if (e1.length() < 1e-6) e1.set(1, 0, 0);
      e1.normalize();
      const e2 = new THREE.Vector3().crossVectors(rv, e1).normalize();
      const off = rv.clone().multiplyScalar(Math.cos(this.spaceEl) * Math.cos(this.spaceAz))
        .add(e1.clone().multiplyScalar(Math.cos(this.spaceEl) * Math.sin(this.spaceAz)))
        .add(e2.clone().multiplyScalar(Math.sin(this.spaceEl)));
      camera.position.copy(f.earthCenter).add(off.multiplyScalar(R));
      camera.up.copy(z);
      camera.lookAt(f.pos.clone().lerp(f.earthCenter, 0.35));
      camera.fov = 45;
    }
    camera.updateProjectionMatrix();
  }
}
