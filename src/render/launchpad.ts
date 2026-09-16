import * as THREE from 'three';
import type { SiteExtra } from '../data/sites';
import { groundPositionEci, enuFrame } from '../physics/orbital';
import { DEG } from '../physics/constants';
import type { SceneManager } from './scene';

/** Local scenery at the launch site: ground disc, pad, tower and lightning masts. */
export class LaunchPadView {
  readonly group = new THREE.Group();
  private site: SiteExtra;
  private tmp = new THREE.Vector3();

  constructor(site: SiteExtra, vehicleHeight: number) {
    this.site = site;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60e3, 96), new THREE.MeshStandardMaterial({ color: 0x4a5a3a, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.6;
    this.group.add(ground);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(1500, 64), new THREE.MeshStandardMaterial({ color: 0x8a8a80, roughness: 0.95 }));
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = -0.5;
    this.group.add(inner);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(70, 1, 70), new THREE.MeshStandardMaterial({ color: 0x9a9a95, roughness: 0.9 }));
    pad.position.y = -0.5;
    this.group.add(pad);
    const towerH = vehicleHeight * 1.05 + 5;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(7, towerH, 7), new THREE.MeshStandardMaterial({ color: 0x8c2f2f, roughness: 0.7 }));
    tower.position.set(-24, towerH / 2, 0);
    this.group.add(tower);
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0x9c3a3a }));
      arm.position.set(-14, towerH * (0.3 + 0.2 * i), 0);
      this.group.add(arm);
    }
    for (let i = 0; i < 3; i++) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, towerH * 1.3, 8), new THREE.MeshStandardMaterial({ color: 0xbbbbbb }));
      const ang = (i / 3) * Math.PI * 2 + 0.5;
      mast.position.set(Math.cos(ang) * 120, towerH * 0.65, Math.sin(ang) * 120);
      this.group.add(mast);
    }
    const trench = new THREE.Mesh(new THREE.BoxGeometry(24, 6, 120), new THREE.MeshStandardMaterial({ color: 0x555555 }));
    trench.position.set(0, -3.5, 40);
    this.group.add(trench);
  }

  update(scene: SceneManager, theta: number): void {
    const lat = this.site.latitude * DEG, lon = this.site.longitude * DEG;
    const r = groundPositionEci(lat, lon, this.site.altitude, theta);
    scene.toScene(r, this.tmp);
    this.group.position.copy(this.tmp);
    const { east, north, up } = enuFrame(r);
    const m = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(east.x, east.y, east.z),
      new THREE.Vector3(up.x, up.y, up.z),
      new THREE.Vector3(-north.x, -north.y, -north.z),
    );
    this.group.quaternion.setFromRotationMatrix(m);
    // hide the pad scenery once far away (it is flat)
    this.group.visible = this.tmp.length() < 400e3;
  }
}
