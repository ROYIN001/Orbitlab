import * as THREE from 'three';
import type { Vec3 } from '../physics/vec3';
import type { SceneManager } from './scene';

/** Growing polyline of ECI points, re-based on the floating origin every frame. */
export class TrailLine {
  readonly line: THREE.Line;
  private points: Vec3[] = [];
  private capacity: number;
  private positions: Float32Array;
  private geometry: THREE.BufferGeometry;
  private lastAdded: Vec3 | null = null;
  private minDist: number;

  constructor(color: number, capacity = 6000, minDist = 200) {
    this.capacity = capacity;
    this.minDist = minDist;
    this.positions = new Float32Array(capacity * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setDrawRange(0, 0);
    this.line = new THREE.Line(this.geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }));
    this.line.frustumCulled = false;
  }

  add(p: Vec3): void {
    if (this.lastAdded) {
      const dx = p.x - this.lastAdded.x, dy = p.y - this.lastAdded.y, dz = p.z - this.lastAdded.z;
      if (dx * dx + dy * dy + dz * dz < this.minDist * this.minDist) return;
    }
    if (this.points.length >= this.capacity) {
      // decimate: drop every other old point
      this.points = this.points.filter((_, i) => i % 2 === 0 || i > this.points.length - 100);
    }
    this.points.push({ x: p.x, y: p.y, z: p.z });
    this.lastAdded = p;
  }

  update(scene: SceneManager): void {
    const n = Math.min(this.points.length, this.capacity);
    for (let i = 0; i < n; i++) {
      const p = this.points[i];
      this.positions[i * 3] = p.x - scene.origin.x;
      this.positions[i * 3 + 1] = p.y - scene.origin.y;
      this.positions[i * 3 + 2] = p.z - scene.origin.z;
    }
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    this.geometry.setDrawRange(0, n);
  }

  clear(): void {
    this.points = [];
    this.lastAdded = null;
    this.geometry.setDrawRange(0, 0);
  }
}

/** Closed/open polyline given as ECI points (predicted or target orbit). */
export class OrbitLine {
  readonly line: THREE.Line;
  private positions: Float32Array;
  private geometry: THREE.BufferGeometry;
  private points: Vec3[] = [];

  constructor(color: number, dashed = false, capacity = 400) {
    this.positions = new Float32Array(capacity * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setDrawRange(0, 0);
    const material = dashed
      ? new THREE.LineDashedMaterial({ color, dashSize: 150e3, gapSize: 90e3, transparent: true, opacity: 0.8 })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 });
    this.line = new THREE.Line(this.geometry, material);
    this.line.frustumCulled = false;
  }

  setPoints(pts: Vec3[]): void {
    this.points = pts.slice(0, this.positions.length / 3);
  }

  update(scene: SceneManager): void {
    const n = this.points.length;
    for (let i = 0; i < n; i++) {
      const p = this.points[i];
      this.positions[i * 3] = p.x - scene.origin.x;
      this.positions[i * 3 + 1] = p.y - scene.origin.y;
      this.positions[i * 3 + 2] = p.z - scene.origin.z;
    }
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    this.geometry.setDrawRange(0, n);
    if (this.line.material instanceof THREE.LineDashedMaterial) this.line.computeLineDistances();
  }
}
