/**
 * Procedural stylised spacecraft, one silhouette per payload kind.
 * Y = along the rocket axis. Deployment is driven by rotating real hinges
 * (solar wings fold in two panels, dishes and booms swing out) rather than by
 * scaling parts up from zero.
 *
 * Upgraded 3D kinematics & engineering fidelity:
 * - Fixed Z-fold accordion hinge axis on outer solar wings (eliminates self-intersecting sweep).
 * - Fixed CubeSat wing stowage inside the deployer rails prior to ejection.
 * - Added primary mirror & secondary spider assembly inside Earth-observation/science telescopes.
 * - Added feed-horn tripods on comsat reflectors, Hall thrusters & optical lasers on Starlink,
 *   equatorial flange & insulator boots on Sputnik 1, cross-braced truss & 3 canted nozzles
 *   on Mercury's escape tower, and main engine bell & viewports on the generic crew vehicle.
 */
import * as THREE from 'three';
import type { SatelliteSpec } from '../types';
import { clamp01, smoothstep } from './noise';
import { buildCrewDragon } from './dragon';
import { buildApollo } from './apollo';
import { buildInstrumentModule, IM_LENGTH, IM_NEST } from './vostok';
import { bellGeometry } from './liveries';
import {
  cellPanel,
  FOIL_TILE,
  RADIATOR_TILE,
  spacecraftMaterials,
  tiledBox,
  tiledCylinder,
  type SpacecraftMaterials,
} from './spacecraft-surfaces';
import type { ApolloState } from '../physics/sim/apollo';

export interface SatelliteView {
  group: THREE.Group;
  height: number;
  /** @param p deployment progress 0 (stowed) .. 1 (fully deployed) */
  setDeploy(p: number): void;
  /** C01: the parts dropped on the way up (the Apollo escape tower) */
  setJettisoned?(j: { tower: boolean } | undefined): void;
  /** C01: Apollo's transposition, docking and extraction, at mission time `t` */
  setApollo?(state: ApolloState | undefined, t: number, separated: boolean): void;
  /**
   * C01: Vostok: where its sphere sits on the instrument module, along the model's Y: the sphere's pole on
   * the module's side, the point render/escape.ts draws the pair from once the return begins.
   */
  junctionY?: number;
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

/** Solar array made of two panels that unfold in a Z-fold accordion from the side of the bus. */
function solarWing(
  parent: THREE.Group,
  hinges: Hinge[],
  mats: SpacecraftMaterials,
  side: 1 | -1,
  halfSpan: number,
  chord: number,
  x0: number,
  y: number,
): void {
  const inner = new THREE.Group();
  inner.position.set(side * x0, y, 0);
  parent.add(inner);

  // Small gap between the panels at the hinge line
  const span = halfSpan * 0.985;
  const p1 = cellPanel(span, 0.04, chord, mats);
  p1.position.set((side * halfSpan) / 2, 0, 0);
  inner.add(p1);

  const outer = new THREE.Group();
  outer.position.set(side * halfSpan, 0, 0);
  inner.add(outer);

  const p2 = cellPanel(span, 0.04, chord, mats);
  p2.position.set((side * halfSpan) / 2, 0, 0);
  outer.add(p2);

  const yoke = new THREE.Mesh(
    new THREE.CylinderGeometry(chord * 0.04, chord * 0.04, x0 * 1.4, 10),
    mats.frame,
  );
  yoke.rotation.z = Math.PI / 2;
  yoke.position.set((side * x0) / 2, y, 0);
  parent.add(yoke);

  // Stowed Z-fold: inner panel stands up along the bus (+Z/-Z hinge), outer panel folds flat back over inner
  hinges.push({ pivot: inner, axis: 'z', from: side * Math.PI * 0.5, to: 0, t0: 0.08, t1: 0.62 });
  hinges.push({ pivot: outer, axis: 'z', from: -side * Math.PI * 0.96, to: 0, t0: 0.42, t1: 0.98 });
}

export function buildSatellite(spec: SatelliteSpec): SatelliteView {
  if (spec.kind === 'crewDragon') return buildCrewDragon();
  if (spec.kind === 'apollo') return buildApollo();
  const g = new THREE.Group();
  const hinges: Hinge[] = [];
  const slides: Slide[] = [];
  /** parts gone the moment deployment starts (Mercury's escape tower) */
  const shed: THREE.Object3D[] = [];
  let junctionY: number | undefined;
  const mats = spacecraftMaterials();
  const foil = mats.foil, gold = mats.foil;
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.6, metalness: 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x4a505c, roughness: 0.7 });
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xf0eee8, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide });
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x8d8f94, metalness: 0.85, roughness: 0.35, side: THREE.DoubleSide });
  const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xffd25a, metalness: 0.96, roughness: 0.08 });

  const bus = (bw: number, bh: number, bd: number): THREE.Mesh =>
    tiledBox(
      bw,
      bh,
      bd,
      [mats.radiator, mats.radiator, foil, foil, foil, foil],
      [RADIATOR_TILE, RADIATOR_TILE, FOIL_TILE, FOIL_TILE, FOIL_TILE, FOIL_TILE],
    );

  const nozzle = (r: number, len: number, x: number, y: number, z: number): THREE.Mesh => {
    const bell = new THREE.Mesh(bellGeometry(r, len, 12), engineMat);
    bell.position.set(x, y, z);
    return bell;
  };

  const size = spec.size ?? { width: 2, height: 3, depth: 2 };
  const w = size.width, h = size.height, d = size.depth;

  switch (spec.kind) {
    case 'comsat':
    case 'weather': {
      g.add(bus(w, h, d));
      // Liquid apogee engine under the bus and 4 corner attitude thrusters
      g.add(nozzle(w * 0.1, w * 0.2, 0, -h / 2, 0));
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        g.add(nozzle(0.04, 0.09, sx * w * 0.42, -h / 2, sz * d * 0.42));
      }
      // Earth deck on top: spot-beam antenna + sub-reflector feed assembly + Ka/Ku feed horns
      const deckDish = new THREE.Mesh(
        new THREE.SphereGeometry(w * 0.2, 24, 10, 0, Math.PI * 2, 0, Math.PI / 3.2),
        white,
      );
      deckDish.position.y = h / 2 + 0.05 + w * 0.2;
      deckDish.rotation.x = Math.PI;
      g.add(deckDish);

      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, w * 0.22, 8), dark);
      mast.position.y = h / 2 + w * 0.11;
      g.add(mast);

      for (const s of [1, -1] as const) {
        const horn = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.07, w * 0.035, w * 0.16, 16), white);
        horn.rotation.x = (s * Math.PI) / 2;
        horn.position.set(0, h * 0.42, (s * d) / 2 + w * 0.08);
        g.add(horn);
      }

      solarWing(g, hinges, mats, 1, w * 2.0, h * 0.45, w * 0.55, 0);
      solarWing(g, hinges, mats, -1, w * 2.0, h * 0.45, w * 0.55, 0);

      for (const s of [1, -1] as const) {
        const arm = new THREE.Group();
        arm.position.set(0, h * 0.15, (s * d) / 2);
        g.add(arm);

        const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, w * 0.7, 8), dark);
        boom.rotation.x = Math.PI / 2;
        boom.position.z = s * w * 0.35;
        arm.add(boom);

        const dishGroup = new THREE.Group();
        dishGroup.position.z = s * w * 0.7;
        // Cant reflector toward the top deck feed horns
        dishGroup.rotation.x = -s * 0.28;
        arm.add(dishGroup);

        const dish = new THREE.Mesh(
          new THREE.SphereGeometry(w * 0.5, 40, 14, 0, Math.PI * 2, 0, Math.PI / 3),
          dishMat,
        );
        dish.rotation.x = Math.PI;
        dish.position.y = w * 0.5;
        dishGroup.add(dish);

        // Sub-reflector vertex cap and 3 support struts inside the dish
        const subRef = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.045, w * 0.06, w * 0.04, 12), gold);
        subRef.position.y = w * 0.24;
        dishGroup.add(subRef);

        hinges.push({ pivot: arm, axis: 'x', from: -s * Math.PI * 0.48, to: 0, t0: 0.55, t1: 0.95 });
      }
      break;
    }
    case 'earthObs':
    case 'science': {
      const lowerH = h * 0.55;
      const lower = tiledCylinder(w / 2, w / 2, lowerH, 40, foil, FOIL_TILE);
      lower.position.y = -h / 2 + lowerH / 2;
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h - lowerH, 40), white);
      upper.position.y = -h / 2 + lowerH + (h - lowerH) / 2;
      g.add(lower, upper);

      const joint = new THREE.Mesh(
        new THREE.CylinderGeometry(w / 2 + 0.01, w / 2 + 0.01, h * 0.035, 40, 1, true),
        dark,
      );
      joint.position.y = -h / 2 + lowerH;
      g.add(joint);

      for (const a of [0.6, 2.2]) {
        const tracker = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.06, w * 0.08, w * 0.16, 14), dark);
        tracker.position.set(Math.cos(a) * (w / 2 + w * 0.05), h * 0.18, Math.sin(a) * (w / 2 + w * 0.05));
        tracker.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
        g.add(tracker);
      }

      const xband = new THREE.Mesh(
        new THREE.SphereGeometry(w * 0.16, 24, 8, 0, Math.PI * 2, 0, Math.PI / 3.2),
        white,
      );
      xband.position.y = -h / 2 - w * 0.16 + w * 0.02;
      g.add(xband);

      // Open optical telescope barrel with internal primary gold mirror and secondary spider
      const scopeR = w * 0.32, scopeH = h * 0.4;
      const scopeWall = new THREE.Mesh(
        new THREE.CylinderGeometry(scopeR, scopeR, scopeH, 32, 1, true),
        dark,
      );
      scopeWall.material.side = THREE.DoubleSide;
      scopeWall.position.y = h / 2 + scopeH / 2;
      g.add(scopeWall);

      const primaryMirror = new THREE.Mesh(new THREE.CylinderGeometry(scopeR * 0.92, scopeR * 0.92, 0.03, 32), mirrorMat);
      primaryMirror.position.y = h / 2 + 0.04;
      g.add(primaryMirror);

      const secBaffle = new THREE.Mesh(new THREE.CylinderGeometry(scopeR * 0.22, scopeR * 0.22, scopeH * 0.28, 16), dark);
      secBaffle.position.y = h / 2 + scopeH * 0.78;
      g.add(secBaffle);

      for (let k = 0; k < 3; k++) {
        const vane = new THREE.Mesh(new THREE.BoxGeometry(scopeR * 1.9, 0.02, 0.015), mats.frame);
        vane.position.y = h / 2 + scopeH * 0.86;
        vane.rotation.y = (k * Math.PI) / 3;
        g.add(vane);
      }

      const hood = new THREE.Group();
      hood.position.set(0, h / 2 + scopeH, scopeR);
      const cover = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.34, w * 0.34, h * 0.08, 32), gold);
      cover.position.set(0, h * 0.04, -scopeR);
      hood.add(cover);
      g.add(hood);
      hinges.push({ pivot: hood, axis: 'x', from: 0, to: 1.95, t0: 0.6, t1: 1 });

      solarWing(g, hinges, mats, 1, w * 1.3, h * 0.5, w * 0.5, -h * 0.1);
      solarWing(g, hinges, mats, -1, w * 1.3, h * 0.5, w * 0.5, -h * 0.1);
      break;
    }
    case 'navigation': {
      g.add(bus(w, h, d));
      solarWing(g, hinges, mats, 1, w * 1.6, h * 0.5, w * 0.55, 0);
      solarWing(g, hinges, mats, -1, w * 1.6, h * 0.5, w * 0.55, 0);

      const arrayG = new THREE.Group();
      arrayG.position.y = -h / 2;
      // Nadir antenna deck baseplate
      const deckPlate = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.06, d * 0.92), dark);
      deckPlate.position.y = -0.03;
      arrayG.add(deckPlate);

      for (let i = 0; i < 12; i++) {
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.52, 16), white);
        cone.position.set(((i % 4) - 1.5) * 0.42, -0.31, (Math.floor(i / 4) - 1) * 0.42);
        arrayG.add(cone);
        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.15, 0.08, 16), gold);
        tip.position.set(cone.position.x, -0.61, cone.position.z);
        arrayG.add(tip);
      }
      g.add(arrayG);
      break;
    }
    case 'cubesats': {
      const ringH = h * 0.42;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.52, ringH, 8), foil);
      ring.position.y = -h * 0.12;
      g.add(ring);

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.3, w * 0.3, h * 0.12, 16), dark);
      collar.position.y = -h * 0.12 - ringH / 2 - h * 0.06;
      g.add(collar);

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
        const tube = new THREE.Mesh(new THREE.BoxGeometry(w * 0.2, tubeL, w * 0.2), dark);
        tube.position.set(cx, h * 0.16, cz);
        tube.rotation.y = -a;
        g.add(tube);

        const doorPivot = new THREE.Group();
        doorPivot.position.set(cx, h * 0.16 + tubeL / 2, cz);
        doorPivot.rotation.y = -a;
        const door = new THREE.Mesh(new THREE.BoxGeometry(w * 0.21, 0.03, w * 0.21), gold);
        door.position.set(w * 0.105, 0.015, 0);
        doorPivot.add(door);
        g.add(doorPivot);
        doors.push(doorPivot);

        const holder = new THREE.Group();
        holder.position.set(cx, h * 0.16, cz);
        holder.rotation.y = -a;
        const body = tiledBox(
          w * 0.15,
          tubeL * 0.78,
          w * 0.15,
          i % 2 ? [mats.cells, mats.cells, dark, dark, mats.cells, mats.cells] : foil,
          i % 2 ? 0.1 : FOIL_TILE * 0.3,
        );
        holder.add(body);

        // Deployable wings hinged at the top edge of the 3U CubeSat, folded flat against the sides while inside the tube
        for (const s of [1, -1] as const) {
          const wing = new THREE.Group();
          wing.position.set(s * w * 0.075, tubeL * 0.36, 0);
          const p = cellPanel(w * 0.16, 0.015, tubeL * 0.72, mats);
          p.rotation.x = Math.PI / 2;
          p.position.set(s * w * 0.08, 0, 0);
          wing.add(p);
          holder.add(wing);
          hinges.push({
            pivot: wing,
            axis: 'z',
            from: -s * Math.PI * 0.49,
            to: 0,
            t0: 0.65 + i * 0.03,
            t1: 0.96,
          });
        }
        g.add(holder);
        cubes.push(holder);
      }
      for (let i = 0; i < doors.length; i++) {
        hinges.push({ pivot: doors[i], axis: 'z', from: 0, to: 1.9, t0: 0.05 + i * 0.03, t1: 0.3 + i * 0.03 });
      }
      for (let i = 0; i < cubes.length; i++) {
        slides.push({
          pivot: cubes[i],
          from: h * 0.16,
          to: h * 0.16 + tubeL * (1.4 + 0.5 * i),
          t0: 0.3 + i * 0.05,
          t1: 0.78 + i * 0.035,
        });
      }
      break;
    }
    case 'starlink': {
      const N = 10;
      const pitch = h / N;
      const chassis = new THREE.MeshStandardMaterial({ color: 0x3b3f46, metalness: 0.3, roughness: 0.55 });
      // Dual tension release rods on either side of the flat-pack stack
      for (const sx of [1, -1]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, h * 1.02, 8), dark);
        rod.position.set(sx * w * 0.44, 0, 0);
        g.add(rod);
      }
      for (let i = 0; i < N; i++) {
        const sat = new THREE.Group();
        const y0 = -h / 2 + 0.2 + i * pitch;
        sat.position.y = y0;
        const plate = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d), chassis);
        sat.add(plate);

        // Phased-array Ku/Ka antennas on the nadir face + Hall-effect thruster & laser link module on the rim
        const ant = new THREE.Mesh(new THREE.BoxGeometry(w * 0.74, 0.04, d * 0.74), mats.radiator);
        ant.position.y = -0.11;
        sat.add(ant);

        const thrusterPack = new THREE.Mesh(new THREE.BoxGeometry(w * 0.18, 0.14, d * 0.22), foil);
        thrusterPack.position.set(-w * 0.38, 0.06, -d * 0.32);
        sat.add(thrusterPack);

        const arrayG = new THREE.Group();
        arrayG.position.set(0, 0.09, d * 0.46);
        const arr = cellPanel(w * 0.92, 0.028, d * 2.6, mats);
        arr.position.z = d * 1.3;
        arrayG.add(arr);
        sat.add(arrayG);
        g.add(sat);

        // Stowed flat over the top of the chassis (from = -PI) and unfolds out to 0
        hinges.push({
          pivot: arrayG,
          axis: 'x',
          from: -Math.PI * 0.98,
          to: 0,
          t0: 0.45 + i * 0.045,
          t1: 0.9 + i * 0.008,
        });
        slides.push({
          pivot: sat,
          from: y0,
          to: y0 + pitch * 2.6 * (i / (N - 1)) * 1.6,
          t0: 0.12,
          t1: 0.75,
        });
      }
      break;
    }
    case 'ps1': {
      const polished = new THREE.MeshStandardMaterial({ color: 0xdcdfe3, metalness: 0.95, roughness: 0.12 });
      g.add(new THREE.Mesh(new THREE.SphereGeometry(w / 2, 36, 24), polished));
      // Equatorial bolted flange seam ring around Sputnik's two hemispheres
      const flange = new THREE.Mesh(new THREE.TorusGeometry(w / 2 + 0.006, 0.01, 8, 36), polished);
      flange.rotation.x = Math.PI / 2;
      flange.rotation.z = 0.25;
      g.add(flange);

      [2.4, 2.9, 2.4, 2.9].forEach((len, i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const pivot = new THREE.Group();
        pivot.position.set(Math.cos(a) * w * 0.3, w * 0.3, Math.sin(a) * w * 0.3);
        pivot.rotation.y = -a;
        const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.09, 8), dark);
        boot.position.y = -0.04;
        pivot.add(boot);
        const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, len, 8), polished);
        whip.position.y = -len / 2;
        pivot.add(whip);
        g.add(pivot);
        hinges.push({ pivot, axis: 'z', from: 0.08, to: (35 * Math.PI) / 180, t0: 0.05, t1: 0.35 });
      });
      break;
    }
    case 'vostok': {
      const ablative = new THREE.MeshStandardMaterial({ color: 0x6b6a66, roughness: 0.85, metalness: 0.05 });
      const bottles = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.45, metalness: 0.5 });
      const sphereR = 1.15;
      const im = buildInstrumentModule().group;
      im.rotation.x = Math.PI;
      im.position.y = -h / 2 + IM_LENGTH;
      g.add(im);
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(sphereR, 36, 24), ablative);
      sphere.position.y = -h / 2 + IM_LENGTH + sphereR - IM_NEST;
      g.add(sphere);
      junctionY = sphere.position.y - sphereR;
      const glass = new THREE.MeshStandardMaterial({ color: 0x14171d, roughness: 0.1, metalness: 0.8 });
      for (const [y, rz, portSize] of [[0.2, 0, 0.22], [-0.35, 1.9, 0.3]] as const) {
        const port = new THREE.Mesh(new THREE.CircleGeometry(portSize, 20), glass);
        port.position.set(Math.cos(rz) * (sphereR + 0.01), sphere.position.y + y, Math.sin(rz) * (sphereR + 0.01));
        port.lookAt(port.position.x * 2, port.position.y, port.position.z * 2);
        g.add(port);
      }
      for (let i = 0; i < 2; i++) {
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 6), bottles);
        mast.position.set((i ? 1 : -1) * 0.35, sphere.position.y + sphereR + 0.55, 0);
        mast.rotation.z = (i ? -1 : 1) * 0.35;
        g.add(mast);
      }
      break;
    }
    case 'mercury': {
      const shingles = new THREE.MeshStandardMaterial({ color: 0x24262b, metalness: 0.35, roughness: 0.55 });
      const base = -h / 2;
      const pack = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.3, 20), white);
      pack.position.y = base + 0.15;
      const shield = new THREE.Mesh(
        new THREE.CylinderGeometry(w / 2, w / 2 - 0.05, 0.14, 32),
        new THREE.MeshStandardMaterial({ color: 0x3b2d24, roughness: 0.95 }),
      );
      shield.position.y = base + 0.37;
      const profile = [
        [0.946, 0], [0.93, 0.1], [0.53, 1.28], [0.4, 1.28],
        [0.36, 1.7], [0.24, 1.7], [0.2, 2.06], [0, 2.06],
      ] as const;
      const cabin = new THREE.Mesh(
        new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32),
        shingles,
      );
      cabin.position.y = base + 0.44;
      g.add(pack, shield, cabin);

      const windowMesh = new THREE.Mesh(
        new THREE.CircleGeometry(0.14, 16),
        new THREE.MeshStandardMaterial({ color: 0x14171d, roughness: 0.1, metalness: 0.8 }),
      );
      windowMesh.position.set(0, base + 1.35, 0.66);
      windowMesh.rotation.x = -0.33;
      g.add(windowMesh);

      const tower = new THREE.Group();
      const towerBase = base + 0.44 + 2.06, legs = 2.9, rTop = 0.12, rBot = 0.5;
      const red = new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.6 });
      for (let i = 0; i < 3; i++) {
        const a = (i * 2 * Math.PI) / 3;
        const x0 = Math.cos(a) * rBot, z0 = Math.sin(a) * rBot;
        const x1 = Math.cos(a) * rTop, z1 = Math.sin(a) * rTop;
        const len = Math.hypot(x1 - x0, legs, z1 - z0);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, len, 8), red);
        leg.position.set((x0 + x1) / 2, towerBase + legs / 2, (z0 + z1) / 2);
        leg.lookAt(x1, towerBase + legs, z1);
        leg.rotateX(Math.PI / 2);
        tower.add(leg);
      }
      // Horizontal & diagonal truss bracing rings on Mercury's escape tower
      for (const f of [0.28, 0.58, 0.85]) {
        const rRing = rBot + (rTop - rBot) * f;
        const brace = new THREE.Mesh(new THREE.TorusGeometry(rRing, 0.018, 6, 3), red);
        brace.rotation.x = Math.PI / 2;
        brace.position.y = towerBase + legs * f;
        tower.add(brace);
      }
      const motorH = 1.9, motorY = towerBase + legs + motorH / 2;
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, motorH, 16), white);
      motor.position.y = motorY;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.5, 16), red);
      band.position.y = motorY - motorH / 2 + 0.25;
      // Three canted escape motor nozzles at the base of the tower motor
      for (let i = 0; i < 3; i++) {
        const a = (i * 2 * Math.PI) / 3 + Math.PI / 3;
        const noz = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 10, 1, true), dark);
        noz.position.set(Math.cos(a) * 0.16, motorY - motorH / 2 - 0.04, Math.sin(a) * 0.16);
        noz.rotation.z = -Math.cos(a) * 0.38;
        noz.rotation.x = Math.sin(a) * 0.38;
        tower.add(noz);
      }
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.13, h / 2 - (motorY + motorH / 2), 12), red);
      spike.position.y = (motorY + motorH / 2 + h / 2) / 2;
      tower.add(motor, band, spike);
      g.add(tower);
      shed.push(tower);
      break;
    }
    case 'crew': {
      const capsule = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.22, w / 2, h * 0.45, 32), white);
      capsule.position.y = h * 0.28;
      g.add(capsule);
      // Crew cabin windows
      const winMat = new THREE.MeshStandardMaterial({ color: 0x111a24, metalness: 0.85, roughness: 0.12 });
      for (const s of [-0.45, 0.45]) {
        const win = new THREE.Mesh(new THREE.CircleGeometry(w * 0.065, 16), winMat);
        const rAtWin = w * 0.37;
        win.position.set(Math.sin(s) * rAtWin, h * 0.26, Math.cos(s) * rAtWin);
        win.rotation.y = s;
        win.rotation.x = -0.46;
        g.add(win);
      }
      const sm = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h * 0.55, 32), dark);
      sm.position.y = -h * 0.22;
      g.add(sm);
      // Service module orbital maneuvering engine nozzle
      g.add(nozzle(w * 0.14, h * 0.18, 0, -h * 0.495, 0));

      const ring = new THREE.Mesh(new THREE.TorusGeometry(w * 0.22, 0.06, 8, 24), gold);
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
    for (const o of shed) o.visible = q <= 0;
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
  return { group: g, height: h, setDeploy, ...(junctionY !== undefined ? { junctionY } : {}) };
}
