import * as THREE from 'three';
import type { Debris } from '../physics/simulation';
import type { SceneManager } from './scene';

const yAxis = new THREE.Vector3(0, 1, 0);

export class DebrisView {
  private meshes = new Map<number, THREE.Group>();
  private scene: SceneManager;
  private tmp = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private plumeMat = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });

  constructor(scene: SceneManager) {
    this.scene = scene;
  }

  private build(d: Debris): THREE.Group {
    const g = new THREE.Group();
    const r = d.visual.diameter / 2;
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(d.visual.color), metalness: 0.25, roughness: 0.55 });
    if (d.visual.kind === 'fairing') {
      const half = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.visual.length * 0.55, 24, 1, true, 0, Math.PI), m);
      half.position.y = d.visual.length * 0.27;
      g.add(half);
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 10; i++) {
        const s = i / 10;
        pts.push(new THREE.Vector2(r * Math.sqrt(1 - s * s * 0.97), d.visual.length * 0.55 + s * d.visual.length * 0.45));
      }
      g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 24, 0, Math.PI), m));
    } else {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.visual.length, 24), m);
      body.position.y = d.visual.length / 2;
      g.add(body);
      if (d.visual.conicalTop) {
        const top = new THREE.Mesh(new THREE.ConeGeometry(r, d.visual.length * 0.35, 24), m);
        top.position.y = d.visual.length + d.visual.length * 0.175;
        g.add(top);
      }
      if (d.recovery) {
        const plume = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.9, 20, 12, 1, true), this.plumeMat);
        plume.position.y = -10;
        plume.name = 'plume';
        plume.visible = false;
        g.add(plume);
      }
    }
    return g;
  }

  update(list: Debris[]): void {
    const seen = new Set<number>();
    for (const d of list) {
      if (!d.alive) continue;
      seen.add(d.id);
      let g = this.meshes.get(d.id);
      if (!g) {
        g = this.build(d);
        this.scene.scene.add(g);
        this.meshes.set(d.id, g);
      }
      this.scene.toScene(d.r, this.tmp);
      g.position.copy(this.tmp);
      const dir = new THREE.Vector3(d.dir.x, d.dir.y, d.dir.z).normalize();
      this.q.setFromUnitVectors(yAxis, dir);
      g.quaternion.copy(this.q);
      const plume = g.getObjectByName('plume');
      if (plume) plume.visible = !!d.recovery?.burning;
    }
    for (const [id, g] of this.meshes) {
      if (!seen.has(id)) {
        this.scene.scene.remove(g);
        this.meshes.delete(id);
      }
    }
  }

  clear(): void {
    for (const g of this.meshes.values()) this.scene.scene.remove(g);
    this.meshes.clear();
  }
}
