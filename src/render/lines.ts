/**
 * The two polylines drawn in the 3-D scene: the flown trail and the
 * predicted/target orbit ellipses.
 *
 * Both are `Line2` (audit B41(10)), not `gl.LINES`. A GL hairline is one
 * device pixel wide whatever the driver feels like, which on a high-DPI screen
 * is a half-visible thread and on some drivers disappears entirely at grazing
 * angles; `Line2` expands each segment into a screen-space quad, so the width
 * is a real, stated number of CSS pixels. The price is that the material has to
 * be told the viewport size — `LineMaterial.resolution` is what converts clip
 * space to pixels — which is why both classes expose `setResolution`, called
 * from `App.resize()`.
 *
 * Positions are rewritten every frame because the scene has a floating origin
 * (the vehicle sits at 0,0,0 and the world moves under it), so the instance
 * buffer is **allocated once and written in place**: `setPositions` is called a
 * single time with a zero-filled array of the full capacity, and after that the
 * interleaved buffer is updated directly with an explicit update range and the
 * draw is limited with `instanceCount`. Nothing here allocates per frame.
 */
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { Vec3 } from '../physics/vec3';
import type { SceneManager } from './scene';

/**
 * A `LineGeometry` whose instance buffer is preallocated for `capacity` points
 * and written in place afterwards.
 */
function allocGeometry(capacity: number): { geometry: LineGeometry; data: THREE.InterleavedBuffer; buf: Float32Array } {
  const geometry = new LineGeometry();
  // n points -> n-1 segments, six floats each (start xyz, end xyz).
  geometry.setPositions(new Float32Array(capacity * 3));
  const attr = geometry.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute;
  const data = attr.data;
  geometry.instanceCount = 0;
  return { geometry, data, buf: data.array as Float32Array };
}

/**
 * Write `n` points of `read(i, out)` into the interleaved segment buffer.
 * Returns the number of segments to draw.
 */
function writeSegments(buf: Float32Array, n: number, x: Float64Array, y: Float64Array, z: Float64Array): number {
  const segs = Math.max(0, n - 1);
  for (let k = 0; k < segs; k++) {
    const o = k * 6;
    buf[o] = x[k];
    buf[o + 1] = y[k];
    buf[o + 2] = z[k];
    buf[o + 3] = x[k + 1];
    buf[o + 4] = y[k + 1];
    buf[o + 5] = z[k + 1];
  }
  return segs;
}

/** Growing polyline of ECI points, re-based on the floating origin every frame. */
export class TrailLine {
  readonly line: Line2;
  private geometry: LineGeometry;
  private material: LineMaterial;
  private data: THREE.InterleavedBuffer;
  private buf: Float32Array;
  private capacity: number;
  /** stored ECI points, as three parallel arrays (no object per point) */
  private px: Float64Array;
  private py: Float64Array;
  private pz: Float64Array;
  private count = 0;
  private minDist: number;
  private lastX = 0;
  private lastY = 0;
  private lastZ = 0;
  private hasLast = false;
  /** scratch for the origin-relative rewrite */
  private sx: Float64Array;
  private sy: Float64Array;
  private sz: Float64Array;

  constructor(color: number, capacity = 6000, minDist = 200, width = 2.2) {
    this.capacity = capacity;
    this.minDist = minDist;
    this.px = new Float64Array(capacity);
    this.py = new Float64Array(capacity);
    this.pz = new Float64Array(capacity);
    this.sx = new Float64Array(capacity);
    this.sy = new Float64Array(capacity);
    this.sz = new Float64Array(capacity);
    const { geometry, data, buf } = allocGeometry(capacity);
    this.geometry = geometry;
    this.data = data;
    this.buf = buf;
    this.material = new LineMaterial({ color, linewidth: width, transparent: true, opacity: 0.85, depthWrite: false });
    this.material.resolution.set(1, 1);
    this.line = new Line2(geometry, this.material);
    this.line.frustumCulled = false;
    this.line.renderOrder = 2;
  }

  /** Viewport size in CSS pixels; the width is measured against it. */
  setResolution(w: number, h: number): void {
    this.material.resolution.set(Math.max(1, w), Math.max(1, h));
  }

  add(p: Vec3): void {
    if (this.hasLast) {
      const dx = p.x - this.lastX, dy = p.y - this.lastY, dz = p.z - this.lastZ;
      if (dx * dx + dy * dy + dz * dz < this.minDist * this.minDist) return;
    }
    if (this.count >= this.capacity) this.decimate();
    const i = this.count++;
    this.px[i] = p.x;
    this.py[i] = p.y;
    this.pz[i] = p.z;
    this.lastX = p.x;
    this.lastY = p.y;
    this.lastZ = p.z;
    this.hasLast = true;
  }

  /**
   * Halve the trail when it reaches capacity, keeping every other old point and
   * all of the last hundred (the part being drawn right now). In place: the old
   * `Array.filter` allocated a new array of thousands of objects at the exact
   * moment the trail was longest.
   */
  private decimate(): void {
    const keepTail = 100;
    const n = this.count;
    let w = 0;
    for (let i = 0; i < n; i++) {
      if (i % 2 !== 0 && i <= n - keepTail) continue;
      this.px[w] = this.px[i];
      this.py[w] = this.py[i];
      this.pz[w] = this.pz[i];
      w++;
    }
    this.count = w;
  }

  update(scene: SceneManager): void {
    const n = this.count;
    const ox = scene.origin.x, oy = scene.origin.y, oz = scene.origin.z;
    for (let i = 0; i < n; i++) {
      this.sx[i] = this.px[i] - ox;
      this.sy[i] = this.py[i] - oy;
      this.sz[i] = this.pz[i] - oz;
    }
    const segs = writeSegments(this.buf, n, this.sx, this.sy, this.sz);
    this.geometry.instanceCount = segs;
    if (segs > 0) {
      this.data.clearUpdateRanges();
      this.data.addUpdateRange(0, segs * 6);
      this.data.needsUpdate = true;
    }
  }

  clear(): void {
    this.count = 0;
    this.hasLast = false;
    this.geometry.instanceCount = 0;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/** Closed/open polyline given as ECI points (predicted or target orbit). */
export class OrbitLine {
  readonly line: Line2;
  private geometry: LineGeometry;
  private material: LineMaterial;
  private data: THREE.InterleavedBuffer;
  private buf: Float32Array;
  private capacity: number;
  private px: Float64Array;
  private py: Float64Array;
  private pz: Float64Array;
  private sx: Float64Array;
  private sy: Float64Array;
  private sz: Float64Array;
  private count = 0;
  private dashed: boolean;
  /** opacity the line was designed at; `setOpacity` scales this */
  private baseOpacity: number;
  /** the dash pattern has to be recomputed after the next position write */
  private distancesDirty = false;

  constructor(color: number, dashed = false, capacity = 400, width = 1.6) {
    this.capacity = capacity;
    this.dashed = dashed;
    this.baseOpacity = dashed ? 0.8 : 0.7;
    this.px = new Float64Array(capacity);
    this.py = new Float64Array(capacity);
    this.pz = new Float64Array(capacity);
    this.sx = new Float64Array(capacity);
    this.sy = new Float64Array(capacity);
    this.sz = new Float64Array(capacity);
    const { geometry, data, buf } = allocGeometry(capacity);
    this.geometry = geometry;
    this.data = data;
    this.buf = buf;
    this.material = new LineMaterial(dashed
      ? { color, linewidth: width, dashed: true, dashSize: 150e3, gapSize: 90e3, transparent: true, opacity: 0.8, depthWrite: false }
      : { color, linewidth: width, transparent: true, opacity: 0.7, depthWrite: false });
    this.material.resolution.set(1, 1);
    this.line = new Line2(geometry, this.material);
    this.line.frustumCulled = false;
    this.line.renderOrder = 2;
  }

  setResolution(w: number, h: number): void {
    this.material.resolution.set(Math.max(1, w), Math.max(1, h));
  }

  /**
   * Overall opacity, 0..1, as a fraction of the line's design opacity.
   *
   * The predicted orbit uses it to fade in over the second or so after its
   * shape stops being a degenerate ellipse, so the line arrives instead of
   * appearing (`App.syncPredicted`).
   */
  setOpacity(f: number): void {
    const o = this.baseOpacity * Math.max(0, Math.min(1, f));
    if (this.material.opacity === o) return;
    this.material.opacity = o;
    this.line.visible = o > 0.004 && !this.hidden;
  }

  /** Kept out of the picture whatever its opacity (G07: close to the station). */
  setHidden(hidden: boolean): void {
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    this.line.visible = !hidden && this.material.opacity > 0.004;
  }
  private hidden = false;

  setPoints(pts: Vec3[]): void {
    const n = Math.min(pts.length, this.capacity);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      this.px[i] = p.x;
      this.py[i] = p.y;
      this.pz[i] = p.z;
    }
    this.count = n;
    // The dash pattern is a function of the *relative* geometry, which the
    // floating origin does not change, so it only has to be recomputed when the
    // shape does — but it has to happen after the positions are written.
    if (this.dashed) this.distancesDirty = true;
  }

  update(scene: SceneManager): void {
    const n = this.count;
    const ox = scene.origin.x, oy = scene.origin.y, oz = scene.origin.z;
    for (let i = 0; i < n; i++) {
      this.sx[i] = this.px[i] - ox;
      this.sy[i] = this.py[i] - oy;
      this.sz[i] = this.pz[i] - oz;
    }
    const segs = writeSegments(this.buf, n, this.sx, this.sy, this.sz);
    this.geometry.instanceCount = segs;
    if (segs > 0) {
      this.data.clearUpdateRanges();
      this.data.addUpdateRange(0, segs * 6);
      this.data.needsUpdate = true;
      if (this.distancesDirty) {
        this.distancesDirty = false;
        this.line.computeLineDistances();
      }
    }
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
