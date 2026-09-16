import * as THREE from 'three';
import type { SiteExtra } from '../data/sites';
import { groundPositionEci, enuFrame } from '../physics/orbital';
import { DEG } from '../physics/constants';
import type { SceneManager } from './scene';
import { ParticleSystem } from './particles';

/** Local scenery at the launch site: ground, pad, tower, tanks, and liftoff steam/smoke. */
export class LaunchPadView {
  readonly group = new THREE.Group();
  private site: SiteExtra;
  private tmp = new THREE.Vector3();
  private m = new THREE.Matrix4();
  private smoke: ParticleSystem;
  private emitAcc = 0;

  constructor(site: SiteExtra, vehicleHeight: number) {
    this.site = site;
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4d5c3c, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(80e3, 128), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.6;
    ground.receiveShadow = true;
    this.group.add(ground);
    const apron = new THREE.Mesh(new THREE.CircleGeometry(1800, 64), new THREE.MeshStandardMaterial({ color: 0x8a8a80, roughness: 0.95 }));
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.5;
    apron.receiveShadow = true;
    this.group.add(apron);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 3000), new THREE.MeshStandardMaterial({ color: 0x55565a, roughness: 0.9 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.45, -1600);
    road.receiveShadow = true;
    this.group.add(road);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(80, 1.2, 80), new THREE.MeshStandardMaterial({ color: 0x9c9c98, roughness: 0.85 }));
    pad.position.y = -0.4;
    pad.receiveShadow = true;
    pad.castShadow = true;
    this.group.add(pad);
    const towerH = vehicleHeight * 1.05 + 6;
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x8c2f2f, roughness: 0.65, metalness: 0.2 });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(7, towerH, 7), towerMat);
    tower.position.set(-24, towerH / 2, 0);
    tower.castShadow = true;
    tower.receiveShadow = true;
    this.group.add(tower);
    // lattice look: horizontal bars on the tower
    const barMat = new THREE.MeshStandardMaterial({ color: 0x6d2323, roughness: 0.7 });
    for (let yb = 4; yb < towerH; yb += 6) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.5, 7.6), barMat);
      bar.position.set(-24, yb, 0);
      this.group.add(bar);
    }
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(17, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0x9c3a3a }));
      arm.position.set(-13.5, towerH * (0.3 + 0.2 * i), 0);
      arm.castShadow = true;
      this.group.add(arm);
    }
    for (let i = 0; i < 4; i++) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, towerH * 1.3, 10), new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.5, roughness: 0.5 }));
      const ang = (i / 4) * Math.PI * 2 + 0.5;
      mast.position.set(Math.cos(ang) * 130, towerH * 0.65, Math.sin(ang) * 130);
      mast.castShadow = true;
      this.group.add(mast);
    }
    const trench = new THREE.Mesh(new THREE.BoxGeometry(26, 7, 130), new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 }));
    trench.position.set(0, -4, 45);
    this.group.add(trench);
    // propellant storage tanks and a service building
    const tankMat = new THREE.MeshStandardMaterial({ color: 0xe6e6e6, metalness: 0.3, roughness: 0.4 });
    for (let i = 0; i < 3; i++) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 18, 24), tankMat);
      tank.position.set(180 + i * 18, 9, -60);
      tank.castShadow = true;
      tank.receiveShadow = true;
      this.group.add(tank);
    }
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16), tankMat);
    sphere.position.set(240, 9, -60);
    sphere.castShadow = true;
    this.group.add(sphere);
    const building = new THREE.Mesh(new THREE.BoxGeometry(40, 12, 24), new THREE.MeshStandardMaterial({ color: 0xb8b0a4, roughness: 0.8 }));
    building.position.set(-220, 6, 90);
    building.castShadow = true;
    building.receiveShadow = true;
    this.group.add(building);
    // liftoff steam / smoke (spreads along the pad)
    this.smoke = new ParticleSystem(500, 0xd8d4cc, false);
    this.group.add(this.smoke.points);
  }

  /** Emit exhaust steam while the vehicle is close to the pad. */
  updateSmoke(dt: number, altitudeAGL: number, thrustFraction: number, pointScale: number): void {
    this.smoke.setPointScale(pointScale);
    const active = thrustFraction > 0.05 && altitudeAGL < 600;
    if (active) {
      const rate = 120 * thrustFraction * (1 - altitudeAGL / 600);
      this.emitAcc += rate * dt;
      while (this.emitAcc >= 1) {
        this.emitAcc -= 1;
        const ang = Math.random() * Math.PI * 2;
        const along = Math.random() < 0.6; // most of it goes out the flame trench
        const speed = 12 + Math.random() * 30;
        const vx = along ? Math.cos(ang) * speed * 0.2 : Math.cos(ang) * speed;
        const vz = along ? speed * (Math.random() < 0.5 ? 1 : -1) * 1.4 : Math.sin(ang) * speed;
        this.smoke.emit({
          x: (Math.random() - 0.5) * 6, y: 1 + Math.random() * 2, z: (Math.random() - 0.5) * 6,
          vx, vy: 2 + Math.random() * 6, vz,
          life: 5 + Math.random() * 7, size0: 6, size1: 40 + Math.random() * 30, alpha0: 0.5,
        });
      }
    }
    this.smoke.update(dt, 0, 0.6, 0, 0.25);
  }

  update(scene: SceneManager, theta: number): void {
    const lat = this.site.latitude * DEG, lon = this.site.longitude * DEG;
    const r = groundPositionEci(lat, lon, this.site.altitude, theta);
    scene.toScene(r, this.tmp);
    this.group.position.copy(this.tmp);
    const { east, north, up } = enuFrame(r);
    this.m.makeBasis(
      new THREE.Vector3(east.x, east.y, east.z),
      new THREE.Vector3(up.x, up.y, up.z),
      new THREE.Vector3(-north.x, -north.y, -north.z),
    );
    this.group.quaternion.setFromRotationMatrix(this.m);
    // hide the pad scenery once far away (it is flat)
    this.group.visible = this.tmp.length() < 400e3;
  }

  dispose(): void {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | undefined;
      if (mat && !Array.isArray(mat)) mat.dispose();
    });
    this.smoke.dispose();
  }
}
