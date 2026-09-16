import * as THREE from 'three';
import type { SatelliteSpec } from '../types';

const gold = new THREE.MeshStandardMaterial({ color: 0xd4b048, metalness: 0.45, roughness: 0.4 });
const white = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.6, metalness: 0.05 });
const dark = new THREE.MeshStandardMaterial({ color: 0x4a505c, roughness: 0.7 });
const panel = new THREE.MeshStandardMaterial({ color: 0x1b2a6b, metalness: 0.5, roughness: 0.3, emissive: 0x0a1030 });

export interface SatelliteView {
  group: THREE.Group;
  /** parts whose scale animates from 0 to 1 when deployed */
  deployables: THREE.Object3D[];
  height: number;
}

/** Procedural stylised satellite for each payload kind. Y axis = along the rocket. */
export function buildSatellite(spec: SatelliteSpec): SatelliteView {
  const g = new THREE.Group();
  const dep: THREE.Object3D[] = [];
  const size = spec.size ?? { width: 2, height: 3, depth: 2 };
  const w = size.width, h = size.height, d = size.depth;
  const wing = (span: number, chord: number, side: 1 | -1, y: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(span, chord, 0.05), panel);
    m.position.set(side * (w / 2 + span / 2), y, 0);
    const pivot = new THREE.Group();
    pivot.position.set(side * w / 2, y, 0);
    m.position.set(side * span / 2, 0, 0);
    pivot.add(m);
    pivot.scale.set(0.02, 1, 1);
    g.add(pivot);
    dep.push(pivot);
  };
  switch (spec.kind) {
    case 'comsat':
    case 'weather': {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), gold));
      wing(w * 4, h * 0.45, 1, 0);
      wing(w * 4, h * 0.45, -1, 0);
      const dish = new THREE.Mesh(new THREE.SphereGeometry(w * 0.55, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3), white);
      dish.position.set(0, h * 0.2, d / 2 + w * 0.3);
      dish.rotation.x = -Math.PI / 2;
      g.add(dish);
      break;
    }
    case 'earthObs':
    case 'science': {
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 24), white));
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.3, w * 0.3, h * 0.35, 20), dark);
      scope.position.y = h / 2 + h * 0.17;
      g.add(scope);
      wing(w * 2.2, h * 0.5, 1, 0);
      wing(w * 2.2, h * 0.5, -1, 0);
      break;
    }
    case 'navigation': {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), gold));
      wing(w * 3, h * 0.5, 1, 0);
      wing(w * 3, h * 0.5, -1, 0);
      for (let i = 0; i < 6; i++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 8), white);
        cone.position.set(((i % 3) - 1) * 0.5, -h / 2 - 0.3, (Math.floor(i / 3) - 0.5) * 0.6);
        cone.rotation.x = Math.PI;
        g.add(cone);
      }
      break;
    }
    case 'cubesats': {
      const disp = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), dark);
      g.add(disp);
      for (let i = 0; i < 8; i++) {
        const cube = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), gold);
        cube.position.set((Math.random() - 0.5) * w * 1.6, (Math.random() - 0.5) * h, (Math.random() - 0.5) * d * 1.6);
        cube.scale.set(0.01, 0.01, 0.01);
        g.add(cube);
        dep.push(cube);
      }
      break;
    }
    case 'starlink': {
      for (let i = 0; i < 12; i++) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), i % 2 ? white : dark);
        plate.position.y = -h / 2 + 0.2 + i * (h / 12);
        g.add(plate);
      }
      break;
    }
    case 'crew': {
      const capsule = new THREE.Mesh(new THREE.ConeGeometry(w / 2, h * 0.45, 32), white);
      capsule.position.y = h * 0.28;
      g.add(capsule);
      const sm = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h * 0.55, 32), dark);
      sm.position.y = -h * 0.22;
      g.add(sm);
      wing(w * 1.6, h * 0.35, 1, -h * 0.2);
      wing(w * 1.6, h * 0.35, -1, -h * 0.2);
      break;
    }
  }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group: g, deployables: dep, height: h };
}
