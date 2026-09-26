/**
 * Procedural stylised spacecraft, one silhouette per payload kind.
 * Y = along the rocket axis. Deployment is driven by rotating real hinges
 * (solar wings fold in two panels, dishes and booms swing out) rather than by
 * scaling parts up from zero.
 */
import * as THREE from 'three';
import type { SatelliteSpec } from '../types';
import { clamp01, smoothstep } from './noise';
import { buildCrewDragon } from './dragon';

export interface SatelliteView {
  group: THREE.Group;
  height: number;
  /** @param p deployment progress 0 (stowed) .. 1 (fully deployed) */
  setDeploy(p: number): void;
}

interface Hinge {
  pivot: THREE.Group;
  axis: 'x' | 'y' | 'z';
  from: number;
  to: number;
  /** progress window within the deployment */
  t0: number;
  t1: number;
}

/**
 * A part that travels rather than rotates: a CubeSat leaving its deployer, a
 * Starlink plate lifting off the stack. Expressed along the part's own +Y, the
 * stack axis, so it works whatever azimuth the part is mounted at.
 */
interface Slide {
  pivot: THREE.Object3D;
  from: number;
  to: number;
  t0: number;
  t1: number;
}

/** Solar array made of two panels that unfold from the side of the bus. */
function solarWing(parent: THREE.Group, hinges: Hinge[], mats: { panel: THREE.Material; frame: THREE.Material }, side: 1 | -1, halfSpan: number, chord: number, x0: number, y: number): void {
  const inner = new THREE.Group();
  inner.position.set(side * x0, y, 0);
  parent.add(inner);
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(halfSpan, 0.04, chord), mats.panel);
  p1.position.set((side * halfSpan) / 2, 0, 0);
  inner.add(p1);
  const outer = new THREE.Group();
  outer.position.set(side * halfSpan, 0, 0);
  inner.add(outer);
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(halfSpan, 0.04, chord), mats.panel);
  p2.position.set((side * halfSpan) / 2, 0, 0);
  outer.add(p2);
  const yoke = new THREE.Mesh(new THREE.CylinderGeometry(chord * 0.04, chord * 0.04, x0 * 1.4, 6), mats.frame);
  yoke.rotation.z = Math.PI / 2;
  yoke.position.set((side * x0) / 2, 0, 0);
  parent.add(yoke);
  // stowed: the inner panel stands up along the body, the outer folds back on it
  hinges.push({ pivot: inner, axis: 'z', from: side * Math.PI * 0.5, to: 0, t0: 0.08, t1: 0.6 });
  hinges.push({ pivot: outer, axis: 'y', from: Math.PI, to: 0, t0: 0.5, t1: 1 });
}

export function buildSatellite(spec: SatelliteSpec): SatelliteView {
  if (spec.kind === 'crewDragon') return buildCrewDragon();
  const g = new THREE.Group();
  const hinges: Hinge[] = [];
  const slides: Slide[] = [];
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4b048, metalness: 0.55, roughness: 0.35 });
  const foil = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.8, roughness: 0.25 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.6, metalness: 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x4a505c, roughness: 0.7 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x1b2a6b, metalness: 0.6, roughness: 0.25, emissive: 0x070c24 });
  const mats = { panel, frame: dark };
  const size = spec.size ?? { width: 2, height: 3, depth: 2 };
  const w = size.width, h = size.height, d = size.depth;

  switch (spec.kind) {
    case 'comsat':
    case 'weather': {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), foil));
      solarWing(g, hinges, mats, 1, w * 2.0, h * 0.45, w * 0.55, 0);
      solarWing(g, hinges, mats, -1, w * 2.0, h * 0.45, w * 0.55, 0);
      for (const s of [1, -1] as const) {
        const arm = new THREE.Group();
        arm.position.set(0, h * 0.15, (s * d) / 2);
        g.add(arm);
        const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, w * 0.7, 6), dark);
        boom.rotation.x = Math.PI / 2;
        boom.position.z = (s * w * 0.35);
        arm.add(boom);
        const dish = new THREE.Mesh(new THREE.SphereGeometry(w * 0.5, 22, 10, 0, Math.PI * 2, 0, Math.PI / 3), white);
        dish.rotation.x = s > 0 ? Math.PI / 2 : -Math.PI / 2;
        dish.position.z = s * w * 0.7;
        arm.add(dish);
        hinges.push({ pivot: arm, axis: 'x', from: -s * Math.PI * 0.48, to: 0, t0: 0.55, t1: 0.95 });
      }
      break;
    }
    case 'earthObs':
    case 'science': {
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 24), white));
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.32, w * 0.32, h * 0.4, 20), dark);
      scope.position.y = h / 2 + h * 0.2;
      g.add(scope);
      const hood = new THREE.Group();
      hood.position.y = h / 2 + h * 0.4;
      const cover = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.34, w * 0.34, h * 0.12, 20, 1, true), gold);
      cover.position.y = h * 0.06;
      hood.add(cover);
      g.add(hood);
      hinges.push({ pivot: hood, axis: 'x', from: 0, to: -1.4, t0: 0.6, t1: 1 });
      solarWing(g, hinges, mats, 1, w * 1.3, h * 0.5, w * 0.5, -h * 0.1);
      solarWing(g, hinges, mats, -1, w * 1.3, h * 0.5, w * 0.5, -h * 0.1);
      break;
    }
    case 'navigation': {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), foil));
      solarWing(g, hinges, mats, 1, w * 1.6, h * 0.5, w * 0.55, 0);
      solarWing(g, hinges, mats, -1, w * 1.6, h * 0.5, w * 0.55, 0);
      const arrayG = new THREE.Group();
      arrayG.position.y = -h / 2;
      for (let i = 0; i < 12; i++) {
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.55, 10), white);
        cone.position.set(((i % 4) - 1.5) * 0.42, -0.3, (Math.floor(i / 4) - 1) * 0.42);
        arrayG.add(cone);
      }
      g.add(arrayG);
      break;
    }
    case 'cubesats': {
      // An ESPA-class rideshare dispenser, not a plain box: an octagonal
      // carrier ring on the separation system, spring-loaded tube deployers
      // bolted around it with their doors hinged open, and the CubeSats
      // themselves sliding out of the tubes with their panels unfolding.
      const ringH = h * 0.42;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.52, ringH, 8), foil);
      ring.position.y = -h * 0.12;
      g.add(ring);
      // separation system: a narrower collar under the ring, on the stage side
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.3, w * 0.3, h * 0.12, 16), dark);
      collar.position.y = -h * 0.12 - ringH / 2 - h * 0.06;
      g.add(collar);
      // avionics boxes and the harness raceway on the ring's flats
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
        const boxM = new THREE.Mesh(new THREE.BoxGeometry(w * 0.22, ringH * 0.5, w * 0.12), dark);
        boxM.position.set(Math.cos(a) * w * 0.52, -h * 0.12, Math.sin(a) * w * 0.52);
        boxM.rotation.y = -a;
        g.add(boxM);
      }
      const tubeL = h * 0.34;
      const cubes: THREE.Group[] = [];
      const doors: THREE.Group[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const cx = Math.cos(a) * w * 0.44, cz = Math.sin(a) * w * 0.44;
        // the deployer tube: a 3U rail box lying along the ring's axis
        const tube = new THREE.Mesh(new THREE.BoxGeometry(w * 0.2, tubeL, w * 0.2), dark);
        tube.position.set(cx, h * 0.16, cz);
        tube.rotation.y = -a;
        g.add(tube);
        // hinged door at the muzzle
        const doorPivot = new THREE.Group();
        doorPivot.position.set(cx, h * 0.16 + tubeL / 2, cz);
        doorPivot.rotation.y = -a;
        const door = new THREE.Mesh(new THREE.BoxGeometry(w * 0.21, 0.03, w * 0.21), gold);
        door.position.set(w * 0.105, 0.015, 0);
        doorPivot.add(door);
        g.add(doorPivot);
        doors.push(doorPivot);
        // the satellite inside, on its rails
        const holder = new THREE.Group();
        holder.position.set(cx, h * 0.16, cz);
        holder.rotation.y = -a;
        const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.15, tubeL * 0.78, w * 0.15), i % 2 ? white : foil);
        holder.add(body);
        // a deployable panel on each side, folded flat against the bus
        for (const s of [1, -1] as const) {
          const wing = new THREE.Group();
          wing.position.set(s * w * 0.075, 0, 0);
          const p = new THREE.Mesh(new THREE.BoxGeometry(w * 0.15, tubeL * 0.7, 0.02), panel);
          p.position.set(s * w * 0.075, 0, 0);
          wing.add(p);
          holder.add(wing);
          hinges.push({ pivot: wing, axis: 'y', from: -s * Math.PI * 0.5, to: 0, t0: 0.62 + i * 0.03, t1: 0.95 });
        }
        g.add(holder);
        cubes.push(holder);
      }
      for (let i = 0; i < doors.length; i++) {
        // three applies an 'XYZ' Euler as Rx·Ry·Rz, so the Z hinge is taken in
        // the tube's own frame and only then swung round to its azimuth
        hinges.push({ pivot: doors[i], axis: 'z', from: 0, to: 1.9, t0: 0.05 + i * 0.03, t1: 0.3 + i * 0.03 });
      }
      // the springs push them out along the tube axis, one tube at a time
      for (let i = 0; i < cubes.length; i++) {
        slides.push({ pivot: cubes[i], from: h * 0.16, to: h * 0.16 + tubeL * (1.4 + 0.5 * i), t0: 0.3 + i * 0.05, t1: 0.78 + i * 0.035 });
      }
      break;
    }
    case 'starlink': {
      // A flat-pack stack that actually flies apart. The real separation has no
      // dispenser at all: the stage rolls and the satellites drift off the
      // tension rods in a line, each unfolding its own array a moment later.
      const N = 10;
      const pitch = h / N;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h * 1.02, 8), dark);
      rod.position.set(w * 0.42, 0, 0);
      g.add(rod);
      for (let i = 0; i < N; i++) {
        const sat = new THREE.Group();
        const y0 = -h / 2 + 0.2 + i * pitch;
        sat.position.y = y0;
        const plate = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), i % 2 ? white : dark);
        sat.add(plate);
        // phased-array antennas on the underside of each satellite
        const ant = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.05, d * 0.7), foil);
        ant.position.y = -0.14;
        sat.add(ant);
        // its own solar array, stowed flat along the plate
        const arrayG = new THREE.Group();
        const arr = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.03, d * 2.6), panel);
        arr.position.z = d * 1.4;
        arrayG.add(arr);
        sat.add(arrayG);
        g.add(sat);
        hinges.push({ pivot: arrayG, axis: 'x', from: -Math.PI * 0.5, to: 0, t0: 0.45 + i * 0.045, t1: 0.9 + i * 0.008 });
        // the stack fans out along its own axis: the top satellite leaves
        // first and travels furthest, so the line opens rather than expanding
        // symmetrically about the middle
        slides.push({ pivot: sat, from: y0, to: y0 + pitch * 2.6 * (i / (N - 1)) * 1.6, t0: 0.12, t1: 0.75 });
      }
      break;
    }
    case 'crew': {
      const capsule = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.22, w / 2, h * 0.45, 28), white);
      capsule.position.y = h * 0.28;
      g.add(capsule);
      const sm = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h * 0.55, 28), dark);
      sm.position.y = -h * 0.22;
      g.add(sm);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(w * 0.22, 0.06, 8, 20), gold);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = h * 0.5;
      g.add(ring);
      solarWing(g, hinges, mats, 1, w * 0.9, h * 0.35, w * 0.5, -h * 0.25);
      solarWing(g, hinges, mats, -1, w * 0.9, h * 0.35, w * 0.5, -h * 0.25);
      break;
    }
  }

  const setDeploy = (p: number): void => {
    const q = clamp01(p);
    for (const hg of hinges) {
      const f = smoothstep(hg.t0, hg.t1, q);
      const a = hg.from + (hg.to - hg.from) * f;
      if (hg.axis === 'x') hg.pivot.rotation.x = a;
      else if (hg.axis === 'y') hg.pivot.rotation.y = a;
      else hg.pivot.rotation.z = a;
    }
    for (const sl of slides) {
      const f = smoothstep(sl.t0, sl.t1, q);
      sl.pivot.position.y = sl.from + (sl.to - sl.from) * f;
    }
  };
  setDeploy(0);
  return { group: g, height: h, setDeploy };
}
