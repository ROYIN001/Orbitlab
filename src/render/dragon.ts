/**
 * Crew Dragon and its trunk (roadmap C01), as Demo-2 flew them on top of
 * Falcon 9 without a fairing. Dimensions from the published figures — 4.0 m
 * across, 8.1 m tall with the trunk, the capsule 4.5 m of it with its nose cap
 * (en.wikipedia, SpaceX Dragon 2; GCAT S45623/S46024: the trunk 3.7 m across);
 * the shapes around them (the side-wall taper, the pods, the fins) are drawn
 * from photographs and are approximate. Y is along the rocket axis, the group
 * centred on the middle of its height like every payload view.
 */
import * as THREE from 'three';
import type { SatelliteView } from './satellite';
import { smoothstep } from './noise';

/** Total height, m: capsule with nose cap 4.5, trunk 3.6. */
export const DRAGON_HEIGHT = 8.1;
const TRUNK_LENGTH = 3.6;
const TRUNK_R = 1.85;
const CAPSULE_BASE_R = 2.0;
const CAPSULE_TOP_R = 1.2;
const SIDEWALL = 3.3;

export function buildCrewDragon(): SatelliteView {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.55, metalness: 0.05 });
  const black = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.5, metalness: 0.1 });
  const cells = new THREE.MeshStandardMaterial({ color: 0x141a2e, roughness: 0.3, metalness: 0.55, emissive: 0x05070f });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.12, metalness: 0.8 });
  const bottom = -DRAGON_HEIGHT / 2;

  // Trunk: half its circumference solar cells, the other half white radiators.
  const trunkY = bottom + TRUNK_LENGTH / 2;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(TRUNK_R, TRUNK_R, TRUNK_LENGTH, 40, 1, true), white);
  trunk.position.y = trunkY;
  g.add(trunk);
  const solar = new THREE.Mesh(new THREE.CylinderGeometry(TRUNK_R + 0.01, TRUNK_R + 0.01, TRUNK_LENGTH * 0.92, 40, 1, true, 0, Math.PI), cells);
  solar.position.y = trunkY;
  g.add(solar);
  const trunkBase = new THREE.Mesh(new THREE.CircleGeometry(TRUNK_R, 40), black);
  trunkBase.rotation.x = Math.PI / 2;
  trunkBase.position.y = bottom;
  g.add(trunkBase);
  // Four fins at the aft end, for stability in an abort; solar cells on them too.
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.08), cells);
    fin.position.set(Math.cos(a) * (TRUNK_R + 0.45), bottom + 0.65, Math.sin(a) * (TRUNK_R + 0.45));
    fin.rotation.y = -a;
    g.add(fin);
  }

  // Capsule: the heat shield's dark rim, the tapering side wall, the nose cap.
  const capBase = bottom + TRUNK_LENGTH;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(CAPSULE_BASE_R, CAPSULE_BASE_R, 0.12, 40), black);
  rim.position.y = capBase + 0.06;
  g.add(rim);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(CAPSULE_TOP_R, CAPSULE_BASE_R, SIDEWALL, 40), white);
  wall.position.y = capBase + 0.12 + SIDEWALL / 2;
  g.add(wall);
  const slope = Math.atan2(CAPSULE_BASE_R - CAPSULE_TOP_R, SIDEWALL);
  const wallRadius = (y: number) => CAPSULE_BASE_R - (CAPSULE_BASE_R - CAPSULE_TOP_R) * (y / SIDEWALL);
  // Four SuperDraco pods low on the side wall, two nozzles each.
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const y = 0.9;
    const pod = new THREE.Group();
    pod.position.set(Math.cos(a) * wallRadius(y), capBase + 0.12 + y, Math.sin(a) * wallRadius(y));
    pod.rotation.y = -a;
    pod.rotation.z = slope;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.2, 0.7), white);
    body.position.x = 0.02;
    pod.add(body);
    for (const s of [-1, 1]) {
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.18, 12), black);
      nozzle.position.set(0.05, -0.62, s * 0.18);
      pod.add(nozzle);
    }
    g.add(pod);
  }
  // Four windows, between the pods.
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const y = 2.0;
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.2, 18), glass);
    const r = wallRadius(y) + 0.01;
    win.position.set(Math.cos(a) * r, capBase + 0.12 + y, Math.sin(a) * r);
    win.lookAt(win.position.x * 2, win.position.y + Math.tan(slope) * r, win.position.z * 2);
    g.add(win);
  }
  // The nose cap, hinged at its forward edge; it swings open after separation.
  const capTop = capBase + 0.12 + SIDEWALL;
  const hinge = new THREE.Group();
  hinge.position.set(CAPSULE_TOP_R, capTop, 0);
  g.add(hinge);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(CAPSULE_TOP_R, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), white);
  nose.scale.y = (DRAGON_HEIGHT / 2 - capTop) / CAPSULE_TOP_R;
  nose.position.x = -CAPSULE_TOP_R;
  hinge.add(nose);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 8, 28), black);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = capTop + 0.02;
  g.add(ring);

  const setDeploy = (p: number): void => {
    hinge.rotation.z = -1.95 * smoothstep(0.2, 0.9, p);
  };
  setDeploy(0);
  return { group: g, height: DRAGON_HEIGHT, setDeploy };
}
