/**
 * Jettisoned hardware: spent stages, strap-on boosters and fairing halves.
 *
 * Driven from `frame.debris`. Fairing halves hinge open about the nose over the
 * first few seconds and then drift; stages and boosters tumble at a rate hashed
 * from their id (never `Math.random`), and recovery burns get a real plume.
 */
import * as THREE from 'three';
import type { DebrisFrame } from '../physics/frame';
import type { SceneManager } from './scene';
import { Plume } from './plume';
import { hash11, smoothstep } from './noise';
import { disposeObject } from './dispose';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

interface DebrisItem {
  group: THREE.Group;
  /** hinge pivot for a fairing half */
  hinge: THREE.Group | null;
  side: 1 | -1;
  plume: Plume | null;
  createdAt: number;
  tumbleAxis: THREE.Vector3;
  tumbleRate: number;
}

export class DebrisView {
  private items = new Map<number, DebrisItem>();
  private scene: SceneManager;
  private tmp = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private qt = new THREE.Quaternion();
  private dir = new THREE.Vector3();

  /**
   * A never-drawn mesh carrying exactly the material configuration `build`
   * uses. Debris only exists from the first separation onwards, so without it
   * the standard-material variant for unmapped, non-shadowing geometry is
   * compiled on the staging frame itself — measured at 13 ms, i.e. a dropped
   * frame at the most dramatic moment of the flight. `renderer.compile` walks
   * the scene with `traverse`, not `traverseVisible`, so an invisible mesh is
   * enough to get the program built during `SceneManager.prewarm`.
   */
  private readonly warmup: THREE.Mesh;

  constructor(scene: SceneManager) {
    this.scene = scene;
    this.warmup = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x808080, metalness: 0.3, roughness: 0.55, side: THREE.DoubleSide }),
    );
    this.warmup.visible = false;
    this.warmup.frustumCulled = false;
    scene.scene.add(this.warmup);
  }

  private build(d: DebrisFrame): DebrisItem {
    const g = new THREE.Group();
    const r = d.visual.diameter / 2;
    const L = d.visual.length;
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(d.visual.color), metalness: 0.3, roughness: 0.55, side: THREE.DoubleSide });
    const side: 1 | -1 = d.id % 2 === 0 ? 1 : -1;
    let hinge: THREE.Group | null = null;
    let plume: Plume | null = null;
    if (d.visual.kind === 'fairing') {
      // one half shell: hinge sits at the nose so it can swing open
      hinge = new THREE.Group();
      hinge.position.y = L;
      const shell = new THREE.Group();
      shell.position.y = -L;
      const cylH = L * 0.55;
      const half = new THREE.Mesh(new THREE.CylinderGeometry(r, r, cylH, 24, 1, true, -Math.PI / 2, Math.PI), m);
      half.position.y = cylH / 2;
      shell.add(half);
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 12; i++) {
        const s = i / 12;
        pts.push(new THREE.Vector2(Math.max(0.02, r * Math.sqrt(Math.max(0, 1 - s * s * 0.985))), cylH + s * (L - cylH)));
      }
      shell.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 24, -Math.PI / 2, Math.PI), m));
      hinge.add(shell);
      g.add(hinge);
    } else {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 24), m);
      body.position.y = L / 2;
      g.add(body);
      if (d.visual.conicalTop) {
        const pts: THREE.Vector2[] = [];
        for (let i = 0; i <= 10; i++) {
          const s = i / 10;
          pts.push(new THREE.Vector2(Math.max(0.04, r * (1 - Math.pow(s, 1.35) * 0.93)), L + s * L * 0.42));
        }
        g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 20), m));
      } else {
        const skirt = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.9, r * 1.2, 20, 1, true), m);
        skirt.position.y = -r * 0.6;
        g.add(skirt);
      }
      plume = new Plume({ radius: r * 0.75, length: Math.max(8, r * 11), kind: 'liquid', seed: hash11(d.id * 3.7) });
      plume.group.position.y = -r * 1.2;
      g.add(plume.group);
    }
    const ax = this.randAxis(d.id);
    return {
      group: g, hinge, side, plume, createdAt: d.createdAt,
      tumbleAxis: ax,
      tumbleRate: (hash11(d.id * 9.1 + 4.4) - 0.5) * (d.visual.kind === 'fairing' ? 0.9 : 0.55),
    };
  }

  private randAxis(id: number): THREE.Vector3 {
    const u = hash11(id * 5.3) * 2 - 1;
    const ph = hash11(id * 2.7 + 1.9) * Math.PI * 2;
    const rr = Math.sqrt(Math.max(0, 1 - u * u));
    return new THREE.Vector3(rr * Math.cos(ph), u, rr * Math.sin(ph)).normalize();
  }

  /**
   * @param list debris entries from the frame
   * @param t mission time, s
   * @param pressure fallback ambient pressure, Pa, for frames recorded before
   *        `DebrisFrame.pressure` existed
   */
  update(list: DebrisFrame[], t: number, pressure = 0): void {
    const seen = new Set<number>();
    for (const d of list) {
      if (!d.alive) continue;
      seen.add(d.id);
      let item = this.items.get(d.id);
      if (!item) {
        item = this.build(d);
        this.scene.scene.add(item.group);
        this.items.set(d.id, item);
      }
      this.scene.toScene(d.r, this.tmp);
      item.group.position.copy(this.tmp);
      this.dir.set(d.dir.x, d.dir.y, d.dir.z).normalize();
      this.q.setFromUnitVectors(Y_AXIS, this.dir);
      const age = Math.max(0, t - item.createdAt);
      if (item.hinge) {
        // swing open over the first 4 s, then let the half drift and rotate
        const open = smoothstep(0, 4, age);
        item.hinge.rotation.z = item.side * open * 1.35;
        const spin = Math.max(0, age - 3) * item.tumbleRate;
        this.qt.setFromAxisAngle(item.tumbleAxis, spin);
        item.group.quaternion.copy(this.q).multiply(this.qt);
      } else if (d.burning) {
        // an engine is firing: hold attitude along the thrust axis
        item.group.quaternion.copy(this.q);
      } else {
        const spin = age * item.tumbleRate;
        this.qt.setFromAxisAngle(item.tumbleAxis, spin);
        item.group.quaternion.copy(this.q).multiply(this.qt);
      }
      // the landing burn of a booster at 2 km must not draw the vacuum-expanded
      // plume of a second stage at 200 km: use this object's own air pressure
      if (item.plume) item.plume.update(d.burning ? 1 : 0, d.pressure ?? pressure, t);
    }
    for (const [id, item] of this.items) {
      if (!seen.has(id)) {
        this.scene.scene.remove(item.group);
        item.plume?.dispose();
        disposeObject(item.group);
        this.items.delete(id);
      }
    }
  }

  clear(): void {
    for (const item of this.items.values()) {
      this.scene.scene.remove(item.group);
      item.plume?.dispose();
      disposeObject(item.group);
    }
    this.items.clear();
  }
}
