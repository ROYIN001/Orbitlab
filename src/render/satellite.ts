/**
 * Procedural stylised spacecraft, one silhouette per payload kind.
 * Y = along the rocket axis. Deployment is driven by rotating real hinges
 * (solar wings unfold from a Z-fold, Starlink's arrays from an accordion,
 * dishes and booms swing out, doors and covers open) and by sliding parts out
 * (CubeSats leaving their tubes, the Starlink plates parting) rather than by
 * scaling parts up from zero.
 */
import * as THREE from 'three';
import type { SatelliteSpec } from '../types';
import { clamp01, smoothstep } from './noise';
import { buildCrewDragon } from './dragon';
import { buildApollo } from './apollo';
import { buildInstrumentModule, IM_LENGTH, IM_NEST } from './vostok';
import { bellGeometry } from './liveries';
import { cellPanel, FOIL_TILE, RADIATOR_TILE, spacecraftMaterials, tiledBox, tiledCylinder, type SpacecraftMaterials } from './spacecraft-surfaces';
import type { ApolloState } from '../physics/sim/apollo';

export interface SatelliteView {
  group: THREE.Group;
  height: number;
  /** how far above the stage's top it stands under the fairing, m (0.5 when not given; render/rocket.ts) */
  seat?: number;
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

const UP = new THREE.Vector3(0, 1, 0);

/** A round strut, `r` m thick, from `a` to `b`. */
function strut(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 6), mat);
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
  return m;
}

/**
 * Solar array made of two panels that unfold from the side of the bus as a
 * Z-fold. Stowed, the inner panel stands up along the body and the outer one
 * is folded back down over it; both hinge lines run along the chord (z), so
 * the outer panel swings out through the open side, never through the bus.
 * The panels hang a thickness below their hinge line (on the side away from
 * the bus once stowed) and the second hinge sits on the inner panel's outer
 * face, so the folded pair lies face to face, clear of the bus and of each
 * other, and opens out flush.
 * @param side the side of the bus it comes out of (+x or −x)
 * @param halfSpan length of one panel along the span, m
 * @param chord width of the panels along the hinge line, m
 * @param x0 distance of the root hinge from the bus axis (the yoke's length), m
 * @param y height of the root hinge, m
 */
function solarWing(parent: THREE.Group, hinges: Hinge[], mats: SpacecraftMaterials, side: 1 | -1, halfSpan: number, chord: number, x0: number, y: number): void {
  const t = 0.04;
  const inner = new THREE.Group();
  inner.position.set(side * x0, y, 0);
  parent.add(inner);
  // a small gap between the panels, where the hinge line is
  const span = halfSpan * 0.985;
  const p1 = cellPanel(span, t, chord, mats);
  p1.position.set((side * halfSpan) / 2, -t / 2, 0);
  inner.add(p1);
  const outer = new THREE.Group();
  outer.position.set(side * halfSpan, -t, 0);
  inner.add(outer);
  const p2 = cellPanel(span, t, chord, mats);
  p2.position.set((side * halfSpan) / 2, t / 2, 0);
  outer.add(p2);
  // the yoke from the bus to the root hinge
  const yoke = new THREE.Mesh(new THREE.CylinderGeometry(chord * 0.04, chord * 0.04, x0, 10), mats.frame);
  yoke.rotation.z = Math.PI / 2;
  yoke.position.set((side * x0) / 2, y, 0);
  parent.add(yoke);
  // stowed: the inner panel stands up along the body, the outer folds back
  // down over it to within 0.02π of flat
  hinges.push({ pivot: inner, axis: 'z', from: side * Math.PI * 0.5, to: 0, t0: 0.08, t1: 0.6 });
  hinges.push({ pivot: outer, axis: 'z', from: -side * Math.PI * 0.98, to: 0, t0: 0.5, t1: 1 });
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
  // gold blanket on the bus, and on the smaller parts that were plain gold
  const foil = mats.foil, gold = mats.foil;
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.6, metalness: 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x4a505c, roughness: 0.7 });
  // a reflector is seen from both sides
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xf0eee8, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide });
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x8d8f94, metalness: 0.85, roughness: 0.35, side: THREE.DoubleSide });
  /** a box of a bus: radiators on the ±x faces (where the wings come out), blanket elsewhere */
  const bus = (bw: number, bh: number, bd: number): THREE.Mesh => tiledBox(bw, bh, bd,
    [mats.radiator, mats.radiator, foil, foil, foil, foil], [RADIATOR_TILE, RADIATOR_TILE, FOIL_TILE, FOIL_TILE, FOIL_TILE, FOIL_TILE]);
  /** an engine bell hanging below `y`, its exit `r` m in radius */
  const nozzle = (r: number, len: number, x: number, y: number, z: number): THREE.Mesh => {
    const bell = new THREE.Mesh(bellGeometry(r, len, 10), engineMat);
    bell.position.set(x, y, z);
    return bell;
  };
  const size = spec.size ?? { width: 2, height: 3, depth: 2 };
  const w = size.width, h = size.height, d = size.depth;

  switch (spec.kind) {
    case 'comsat':
    case 'weather': {
      g.add(bus(w, h, d));
      // the apogee engine under the bus and a ring of attitude thrusters round it
      g.add(nozzle(w * 0.1, w * 0.2, 0, -h / 2, 0));
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        g.add(nozzle(0.04, 0.09, sx * w * 0.42, -h / 2, sz * d * 0.42));
      }
      // the Earth deck on top: a tracking antenna on its feed mast, and two
      // Earth-coverage horns looking out the way the deck faces
      const deckDish = new THREE.Mesh(new THREE.SphereGeometry(w * 0.2, 24, 8, 0, Math.PI * 2, 0, Math.PI / 3.2), white);
      deckDish.position.y = h / 2 + 0.05;
      deckDish.rotation.x = Math.PI;
      deckDish.position.y += w * 0.2;
      g.add(deckDish);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, w * 0.22, 8), dark);
      mast.position.y = h / 2 + w * 0.11;
      g.add(mast);
      // (either side of the antenna along x: sized and spaced in w, they stay
      // on the deck and clear of the antenna whatever the bus's depth)
      for (const s of [1, -1] as const) {
        const horn = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.07, w * 0.035, w * 0.16, 16), white);
        horn.position.set(s * w * 0.36, h / 2 + w * 0.08, 0);
        g.add(horn);
      }
      solarWing(g, hinges, mats, 1, w * 2.0, h * 0.45, w * 0.55, 0);
      solarWing(g, hinges, mats, -1, w * 2.0, h * 0.45, w * 0.55, 0);
      // The two big reflectors, on booms from the ±z faces. Each is a
      // Cassegrain dish looking at the Earth like the deck: the boom holds it
      // by its vertex, and its sub-reflector, a little inside the focus (half
      // the radius of curvature above the vertex, here level with the rim),
      // stands on a tripod of three struts from the dish. Stowed, the booms
      // hang down the faces with the dishes' backs to the bus, clear of it
      // and below the deck; they swing out and up to level. Stowed, a boom and
      // its dish reach 1.115 rw below the pivot (rw: the reflector's scale, w
      // on most buses), so on a squat bus the booms are mounted higher, though
      // never above 0.4 h, and on a squatter one still rw is made smaller than
      // w: the stowed dishes always end above the base, the pivots on the face.
      const armY = Math.min(h * 0.4, Math.max(h * 0.15, w * 1.14 - h / 2));
      const rw = Math.min(w, (armY + h / 2) / 1.14), R = rw * 0.5;
      const reflector = new THREE.Group();
      const dish = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 12, 0, Math.PI * 2, 0, Math.PI / 3), dishMat);
      // the cap round the sphere's top pole, turned over and lifted by the
      // radius: its vertex on the boom's end, opening upward
      dish.rotation.x = Math.PI;
      dish.position.y = R;
      reflector.add(dish);
      const subR = rw * 0.06, subT = rw * 0.02, subY = R * 0.44;
      const sub = new THREE.Mesh(new THREE.CylinderGeometry(subR, subR, subT, 16), dishMat);
      sub.position.y = subY;
      reflector.add(sub);
      // the struts' feet on the dish surface, at 60% of the rim's radius
      const footR = R * Math.sin(Math.PI / 3) * 0.6, footY = R - Math.sqrt(R * R - footR * footR);
      for (let k = 0; k < 3; k++) {
        const a = Math.PI / 2 + (k * 2 * Math.PI) / 3, c = Math.cos(a), sn = Math.sin(a);
        reflector.add(strut(new THREE.Vector3(c * footR, footY, sn * footR), new THREE.Vector3(c * subR * 0.8, subY - subT / 2, sn * subR * 0.8), rw * 0.006, mats.frame));
      }
      for (const s of [1, -1] as const) {
        const arm = new THREE.Group();
        arm.position.set(0, armY, (s * d) / 2);
        g.add(arm);
        const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, rw * 0.7, 6), dark);
        boom.rotation.x = Math.PI / 2;
        boom.position.z = (s * rw * 0.35);
        arm.add(boom);
        // the second side's reflector shares the first's geometry and materials
        const r = s > 0 ? reflector : reflector.clone();
        r.position.z = s * rw * 0.7;
        arm.add(r);
        hinges.push({ pivot: arm, axis: 'x', from: s * Math.PI * 0.48, to: 0, t0: 0.55, t1: 0.95 });
      }
      break;
    }
    case 'earthObs':
    case 'science': {
      // the service module blanketed in gold, the payload section painted white above it
      const lowerH = h * 0.55;
      const lower = tiledCylinder(w / 2, w / 2, lowerH, 40, foil, FOIL_TILE);
      lower.position.y = -h / 2 + lowerH / 2;
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h - lowerH, 40), white);
      upper.position.y = -h / 2 + lowerH + (h - lowerH) / 2;
      g.add(lower, upper);
      // a black band where the two meet, and the star trackers looking out of
      // the payload section above it (round toward +z, clear of the wings
      // folded against ±x)
      const joint = new THREE.Mesh(new THREE.CylinderGeometry(w / 2 + 0.01, w / 2 + 0.01, h * 0.035, 40, 1, true), dark);
      joint.position.y = -h / 2 + lowerH;
      g.add(joint);
      for (const a of [1.15, 2.0]) {
        const tracker = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.06, w * 0.08, w * 0.16, 14), dark);
        tracker.position.set(Math.cos(a) * (w / 2 + w * 0.05), h * 0.18, Math.sin(a) * (w / 2 + w * 0.05));
        tracker.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
        g.add(tracker);
      }
      // the downlink antenna under the bus
      const xband = new THREE.Mesh(new THREE.SphereGeometry(w * 0.16, 24, 8, 0, Math.PI * 2, 0, Math.PI / 3.2), white);
      xband.position.y = -h / 2 - w * 0.16 + w * 0.02;
      g.add(xband);
      // The telescope: an open barrel standing on the payload section, the
      // gold-coated primary mirror lying at its foot and the secondary, its
      // mirror facing down at the primary, in a baffle held on a four-vane
      // spider near the mouth. The barrel is seen from inside as well, so it
      // has its own two-sided paint rather than changing the shared `dark`.
      const scopeR = w * 0.32, scopeH = h * 0.4, mouth = h / 2 + scopeH;
      const inside = dark.clone();
      inside.side = THREE.DoubleSide;
      const mirror = new THREE.MeshStandardMaterial({ color: 0xffd25a, metalness: 0.96, roughness: 0.08 });
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(scopeR, scopeR, scopeH, 32, 1, true), inside);
      scope.position.y = h / 2 + scopeH / 2;
      g.add(scope);
      const primaryT = scopeH * 0.05;
      const primary = new THREE.Mesh(new THREE.CylinderGeometry(scopeR * 0.92, scopeR * 0.92, primaryT, 32), mirror);
      primary.position.y = h / 2 + primaryT / 2;
      g.add(primary);
      // CylinderGeometry's groups: side, top cap, bottom cap
      const secondary = new THREE.Mesh(new THREE.CylinderGeometry(scopeR * 0.22, scopeR * 0.22, scopeH * 0.28, 16), [dark, dark, mirror]);
      secondary.position.y = h / 2 + scopeH * 0.78;
      g.add(secondary);
      // two vanes across the barrel, wall to wall, edge-on to the light
      const vaneGeo = new THREE.BoxGeometry(scopeR * 1.99, scopeH * 0.06, scopeR * 0.02);
      for (let k = 0; k < 2; k++) {
        const vane = new THREE.Mesh(vaneGeo, mats.frame);
        vane.position.y = h / 2 + scopeH * 0.86;
        vane.rotation.y = (k * Math.PI) / 2;
        g.add(vane);
      }
      // the aperture door, hinged on the rim at +z: its edge is the hinge
      // line, so it swings up and out over the side without touching the barrel
      const doorR = scopeR + w * 0.02, doorT = h * 0.03;
      const hood = new THREE.Group();
      hood.position.set(0, mouth, doorR);
      const cover = new THREE.Mesh(new THREE.CylinderGeometry(doorR, doorR, doorT, 32), gold);
      cover.position.set(0, doorT / 2, -doorR);
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
      // the navigation antenna on the nadir face: twelve helices in their
      // radomes on a panel
      const arrayG = new THREE.Group();
      arrayG.position.y = -h / 2;
      const deckPlate = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.06, d * 0.92), dark);
      deckPlate.position.y = -0.03;
      arrayG.add(deckPlate);
      const coneGeo = new THREE.CylinderGeometry(0.16, 0.12, 0.55, 16);
      for (let i = 0; i < 12; i++) {
        const cone = new THREE.Mesh(coneGeo, white);
        cone.position.set(((i % 4) - 1.5) * 0.42, -0.33, (Math.floor(i / 4) - 1) * 0.42);
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
      // the CubeSat's half-width and its panels' thickness: folded flat on its
      // sides they reach b + t = 0.09 w from its axis, inside the tube's 0.1 w
      const b = w * 0.075, t = w * 0.015;
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
        // hinged door at the muzzle, on its outer edge (the tube's +x, away
        // from the ring's axis), so it opens outward, clear of the muzzle
        const doorPivot = new THREE.Group();
        doorPivot.position.set(cx + Math.cos(a) * w * 0.1, h * 0.16 + tubeL / 2, cz + Math.sin(a) * w * 0.1);
        doorPivot.rotation.y = -a;
        const door = new THREE.Mesh(new THREE.BoxGeometry(w * 0.2, 0.03, w * 0.2), gold);
        door.position.set(-w * 0.1, 0.015, 0);
        doorPivot.add(door);
        g.add(doorPivot);
        doors.push(doorPivot);
        // the satellite inside, on its rails
        const holder = new THREE.Group();
        holder.position.set(cx, h * 0.16, cz);
        holder.rotation.y = -a;
        // a 3U: its own small body-mounted cells on the faces that show
        const body = tiledBox(w * 0.15, tubeL * 0.78, w * 0.15, i % 2 ? [mats.cells, mats.cells, dark, dark, mats.cells, mats.cells] : foil, i % 2 ? 0.1 : FOIL_TILE * 0.3);
        holder.add(body);
        // a deployable panel on each side, hinged along the body's back (−z)
        // edge and folded flat over the side face; once out of the tube it
        // opens 90° into the plane of the back face
        for (const s of [1, -1] as const) {
          const wing = new THREE.Group();
          wing.position.set(s * b, 0, -b);
          const p = cellPanel(2 * b, tubeL * 0.7, t, mats);
          p.position.set(s * b, 0, -t / 2);
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
        hinges.push({ pivot: doors[i], axis: 'z', from: 0, to: -1.9, t0: 0.05 + i * 0.03, t1: 0.3 + i * 0.03 });
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
      // the flat chassis: dark composite, its phased arrays silver underneath
      const chassis = new THREE.MeshStandardMaterial({ color: 0x3b3f46, metalness: 0.3, roughness: 0.55 });
      const plateH = 0.18, top = plateH / 2;
      // a tension rod down each side of the stack
      for (const sx of [1, -1]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, h * 1.02, 8), dark);
        rod.position.set(sx * w * 0.44, 0, 0);
        g.add(rod);
      }
      // The array is a wing 2.6 d long that unfolds from the plate's +z edge.
      // Folded as an accordion of three leaves it lies flat on the plate,
      // within its footprint, between the rods and well under the satellite
      // above (3 × 2.8 cm, on the 5 m stack's 0.5 m pitch). The hinges
      // alternate between the leaves' faces, so the folded leaves stack face
      // to face and open out flush; they turn together, like a concertina.
      const K = 3, leafL = (d * 2.6) / K, leafT = 0.028;
      // On the back edge, one each: the krypton Hall-effect thruster and the
      // optical (laser) inter-satellite link terminal the later satellites
      // carry, a small dome; both within the plate's thickness, so clear of
      // the satellites above and below.
      const thrusterGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.08, 12);
      const terminalGeo = new THREE.SphereGeometry(0.07, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      for (let i = 0; i < N; i++) {
        const sat = new THREE.Group();
        const y0 = -h / 2 + 0.2 + i * pitch;
        sat.position.y = y0;
        const plate = new THREE.Mesh(new THREE.BoxGeometry(w, plateH, d), chassis);
        sat.add(plate);
        // phased-array antennas on the underside of each satellite
        const ant = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.04, d * 0.7), mats.radiator);
        ant.position.y = -top - 0.02;
        sat.add(ant);
        const thruster = new THREE.Mesh(thrusterGeo, engineMat);
        thruster.rotation.x = -Math.PI / 2;
        thruster.position.set(-w * 0.3, 0, -d / 2 - 0.04);
        const terminal = new THREE.Mesh(terminalGeo, dark);
        terminal.rotation.x = -Math.PI / 2;
        terminal.position.set(w * 0.3, 0, -d / 2);
        sat.add(thruster, terminal);
        let parent: THREE.Object3D = sat;
        for (let k = 0; k < K; k++) {
          const odd = k % 2 === 1;
          const fold = new THREE.Group();
          // the root hinge on the plate's top edge, the others at the end of the leaf before
          if (k === 0) fold.position.set(0, top, d / 2);
          else fold.position.set(0, odd ? -leafT : leafT, leafL);
          const leaf = cellPanel(w * 0.8, leafT, leafL * 0.985, mats);
          leaf.position.set(0, odd ? leafT / 2 : -leafT / 2, leafL / 2);
          fold.add(leaf);
          parent.add(fold);
          parent = fold;
          hinges.push({ pivot: fold, axis: 'x', from: odd ? Math.PI : -Math.PI, to: 0, t0: 0.45 + i * 0.045, t1: 0.9 + i * 0.008 });
        }
        g.add(sat);
        // the stack fans out along its own axis: the top satellite leaves
        // first and travels furthest, so the line opens rather than expanding
        // symmetrically about the middle
        slides.push({ pivot: sat, from: y0, to: y0 + pitch * 2.6 * (i / (N - 1)) * 1.6, t0: 0.12, t1: 0.75 });
      }
      break;
    }
    case 'ps1': {
      // Sputnik 1: a polished 0.58 m sphere, four whip aerials swept back
      // (2.4 and 2.9 m) — folded along the core under the nose cone, then
      // springing out to 35° from the axis once it is free.
      const polished = new THREE.MeshStandardMaterial({ color: 0xdcdfe3, metalness: 0.95, roughness: 0.12 });
      g.add(new THREE.Mesh(new THREE.SphereGeometry(w / 2, 32, 20), polished));
      // the ring where its two hemispheres are bolted together
      const flange = new THREE.Mesh(new THREE.TorusGeometry(w / 2 + 0.006, 0.01, 8, 36), polished);
      flange.rotation.x = Math.PI / 2;
      g.add(flange);
      [2.4, 2.9, 2.4, 2.9].forEach((len, i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const pivot = new THREE.Group();
        pivot.position.set(Math.cos(a) * w * 0.3, w * 0.3, Math.sin(a) * w * 0.3);
        pivot.rotation.y = -a;
        const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, len, 6), polished);
        whip.position.y = -len / 2;
        pivot.add(whip);
        g.add(pivot);
        hinges.push({ pivot, axis: 'z', from: 0.08, to: 35 * Math.PI / 180, t0: 0.05, t1: 0.35 });
      });
      break;
    }
    case 'vostok': {
      // Vostok 3KA: the 2.3 m descent sphere, covered in ablative (dark), with
      // its hatch and window, on the instrument module — two cones base to
      // base, 2.43 m across — and its antennas.
      // (the module is render/vostok.ts's, drawn the same through the return and on its own)
      const ablative = new THREE.MeshStandardMaterial({ color: 0x6b6a66, roughness: 0.85, metalness: 0.05 });
      const bottles = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.45, metalness: 0.5 });
      const sphereR = 1.15;
      const im = buildInstrumentModule().group;
      // its engine down the rocket's axis, its cradle up at the sphere, as it left Blok E; turned engine first for
      // the retro-fire by render/rocket.ts (render/vostok.ts `VOSTOK_RETRO_TURN`)
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
      // Mercury on the Redstone: the retropack over the 1.89 m heat shield at
      // the base, the conical cabin in its dark shingles, the recovery
      // compartment and antenna canister, and the escape tower above — a
      // three-legged truss carrying the red-and-white motor and its spike.
      // 7.9 m in all (NASA drawings; proportions approximate).
      const shingles = new THREE.MeshStandardMaterial({ color: 0x24262b, metalness: 0.35, roughness: 0.55 });
      const base = -h / 2;
      const pack = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.3, 20), white);
      pack.position.y = base + 0.15;
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2 - 0.05, 0.14, 32), new THREE.MeshStandardMaterial({ color: 0x3b2d24, roughness: 0.95 }));
      shield.position.y = base + 0.37;
      const profile = [[0.946, 0], [0.93, 0.1], [0.53, 1.28], [0.4, 1.28], [0.36, 1.7], [0.24, 1.7], [0.2, 2.06], [0, 2.06]] as const;
      const cabinY = base + 0.44;
      const cabin = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32), shingles);
      cabin.position.y = cabinY;
      g.add(pack, shield, cabin);
      const windowMesh = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), new THREE.MeshStandardMaterial({ color: 0x14171d, roughness: 0.1, metalness: 0.8 }));
      windowMesh.position.set(0, base + 1.35, 0.66);
      windowMesh.rotation.x = -0.33;
      g.add(windowMesh);
      // The tower's legs stand on the cabin's shoulder, where the cone meets
      // the recovery compartment, and close in to the motor 2.9 m above the
      // antenna canister. Horizontal triangles (tori of three segments, their
      // corners on the legs) and a diagonal in each face brace the bays above
      // the canister; the top bay, round the escape motor's nozzles, is left open.
      const tower = new THREE.Group();
      const red = new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.6 });
      const footY = cabinY + 1.28, rFoot = 0.46, canisterTop = cabinY + 2.06, towerTop = canisterTop + 2.9, rTop = 0.12;
      const legAt = (i: number, y: number): THREE.Vector3 => {
        const a = (i * 2 * Math.PI) / 3, r = rFoot + ((rTop - rFoot) * (y - footY)) / (towerTop - footY);
        return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      };
      for (let i = 0; i < 3; i++) tower.add(strut(legAt(i, footY), legAt(i, towerTop), 0.035, red));
      const levels = [0, 0.28, 0.58, 0.85].map((f) => canisterTop + 2.9 * f);
      for (let k = 0; k < levels.length; k++) {
        if (k > 0) {
          const brace = new THREE.Mesh(new THREE.TorusGeometry(legAt(0, levels[k]).x, 0.018, 6, 3), red);
          brace.rotation.x = Math.PI / 2;
          brace.position.y = levels[k];
          tower.add(brace);
        }
        // a Warren pattern: the diagonals zig-zag from bay to bay
        if (k < levels.length - 1) {
          for (let i = 0; i < 3; i++) {
            const lo = k % 2 ? (i + 1) % 3 : i, hi = k % 2 ? i : (i + 1) % 3;
            tower.add(strut(legAt(lo, levels[k]), legAt(hi, levels[k + 1]), 0.018, red));
          }
        }
      }
      const motorH = 1.9, motorY = towerTop + motorH / 2;
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, motorH, 16), white);
      motor.position.y = motorY;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.5, 16), red);
      band.position.y = motorY - motorH / 2 + 0.25;
      // The escape motor (a Grand Central 1-KS-52000) fired through three
      // canted nozzles (NASA, Little Joe history,
      // https://www.nasa.gov/image-detail/amf-lrc-1959-b701_p-05790/): here
      // under the motor, between the legs, their exits turned out about 20°
      // (an estimate) so the jets clear the capsule.
      const cant = 0.35, nozzleL = 0.22;
      for (let i = 0; i < 3; i++) {
        const a = (i * 2 * Math.PI) / 3 + Math.PI / 3;
        const out = new THREE.Vector3(Math.sin(cant) * Math.cos(a), -Math.cos(cant), Math.sin(cant) * Math.sin(a));
        // the cone's apex is its throat, on the motor's base
        const noz = new THREE.Mesh(new THREE.ConeGeometry(0.055, nozzleL, 10, 1, true), engineMat);
        noz.position.set(Math.cos(a) * 0.07, towerTop, Math.sin(a) * 0.07).addScaledVector(out, nozzleL / 2);
        noz.quaternion.setFromUnitVectors(UP, out.clone().negate());
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
      const capsuleH = h * 0.45, capsuleY = h * 0.28;
      const capsule = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.22, w / 2, capsuleH, 28), white);
      capsule.position.y = capsuleY;
      g.add(capsule);
      // two cabin windows set in the capsule's conical wall, tilted up with it
      const glass = new THREE.MeshStandardMaterial({ color: 0x111a24, metalness: 0.85, roughness: 0.12 });
      const winY = h * 0.26, slope = (w * 0.28) / capsuleH;
      const winR = w / 2 - slope * (winY - (capsuleY - capsuleH / 2)) + w * 0.002;
      const tilt = Math.atan(slope);
      for (const az of [-0.45, 0.45]) {
        const win = new THREE.Mesh(new THREE.CircleGeometry(w * 0.065, 16), glass);
        win.position.set(Math.sin(az) * winR, winY, Math.cos(az) * winR);
        win.lookAt(win.position.x + Math.sin(az) * Math.cos(tilt), winY + Math.sin(tilt), win.position.z + Math.cos(az) * Math.cos(tilt));
        g.add(win);
      }
      const sm = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h * 0.55, 28), dark);
      sm.position.y = -h * 0.22;
      g.add(sm);
      // the service module's main engine; at most 0.45 m below the base, so
      // within the half metre a payload in a fairing stands above the stage
      // (render/rocket.ts), however tall the craft
      g.add(nozzle(w * 0.1, Math.min(h * 0.06, 0.45), 0, -h * 0.495, 0));
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
