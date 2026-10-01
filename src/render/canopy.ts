/**
 * A parachute as drawn: a dome over its suspension lines. Shared by the
 * descent modules (render/escape.ts) and by Vostok-1's pilot on his own
 * canopies (render/cosmonaut.ts).
 */
import * as THREE from 'three';

/** Orange and white gores (the drawing's: the descent modules' canopies have been drawn so since G06). */
export function canopyStripes(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 16;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 2 ? '#f4f1ea' : '#ef6b21';
    g.fillRect(i * 16, 0, 16, 16);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * A canopy lying collapsed on the ground after the landing: a long, uneven
 * heap `length` by `width` m, narrowing towards its apex end, flat in its
 * x–y plane (+z up off the ground), its gores across its length. The outline
 * is the drawing's, and the same every time (no randomness).
 */
export function spentCanopyGeometry(length: number, width: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const n = 48;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + 0.12 * Math.sin(3 * a + 0.7) + 0.07 * Math.sin(7 * a + 2.1) + 0.04 * Math.sin(13 * a);
    const x = Math.cos(a) * length / 2 * k, y = Math.sin(a) * width / 2 * k * (0.7 + 0.3 * Math.cos(a));
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const geo = new THREE.ShapeGeometry(shape, 1);
  // the stripes' gores across its length: the texture's u along x
  const pos = geo.getAttribute('position'), uv = geo.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / length + 0.5, pos.getY(i) / width + 0.5);
  uv.needsUpdate = true;
  return geo;
}

/**
 * A parachute: a dome over its risers, the dome's mouth towards what hangs
 * from it. Built in the descent module's axes, where −Y is up, away from the
 * heat shield: the lines meet `distance` below the dome, on the +Y side.
 */
export class Canopy {
  readonly group = new THREE.Group();
  private readonly dome: THREE.Mesh;
  private readonly risers: THREE.LineSegments;
  constructor(radius: number, private readonly distance: number, material: THREE.Material, lineMat: THREE.LineBasicMaterial, lines = 12) {
    const dome = new THREE.SphereGeometry(radius, 32, 10, 0, Math.PI * 2, 0, Math.PI * 0.42);
    this.dome = new THREE.Mesh(dome, material);
    // convex side away from the capsule, which is towards −Y from its apex
    this.dome.rotation.x = Math.PI;
    this.group.add(this.dome);
    const rim = radius * Math.sin(Math.PI * 0.42), rimDrop = radius * Math.cos(Math.PI * 0.42);
    const pts: number[] = [];
    for (let k = 0; k < lines; k++) {
      const a = (k / lines) * Math.PI * 2;
      pts.push(0, distance, 0, Math.cos(a) * rim, -rimDrop, Math.sin(a) * rim);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.risers = new THREE.LineSegments(geo, lineMat);
    this.group.add(this.risers);
    this.group.visible = false;
  }
  /** Open 0–1, hung `distance` above `apexY` (towards −Y). */
  update(open: number, apexY: number): void {
    this.group.visible = open > 0.01;
    if (!this.group.visible) return;
    const s = 0.25 + 0.75 * Math.min(1, open);
    this.group.position.y = apexY - this.distance;
    this.dome.scale.set(s, 0.6 + 0.4 * s, s);
    this.risers.scale.set(s, 1, s);
  }
  dispose(): void { this.dome.geometry.dispose(); this.risers.geometry.dispose(); }
}
