/**
 * Yuri Gagarin on his own, from his ejection at 7 km to the steppe (C01:
 * Vostok-1; his flight is src/physics/sim/crew-descent.ts).
 *
 * The SK-1 suit in its orange cover (#e8641e) and dark boots; the white
 * helmet with "СССР" in red across its brow (painted on shortly before the
 * flight, by the popular accounts), and its dark visor. In the seat — grey-green, its back and headrest, the
 * survival kit (NAZ) under the pan and the two rails it fired along — on its
 * 2 m² stabilising chute down to 4 km; then out of the seat, hanging under
 * the 83.5 m² main, and from about 3 km the 56 m² reserve beside it, the two
 * open as far as the frame says (`CrewState`). Gagarin was 1.57 m tall
 * (popular sources); the suit, the seat's shape and the lines' lengths are
 * the drawing's estimates.
 *
 * Model axes: his soles at the origin (the point the physics flies is the
 * ground at his landing), +Y up his body and the risers (the debris record's
 * `dir`: the way the drag pulls), +Z the way he faces.
 */
import * as THREE from 'three';
import type { CrewState } from '../physics/sim/types';
import { VOSTOK_CREW } from '../physics/sim/crew-descent';
import { Canopy, canopyStripes, spentCanopyGeometry } from './canopy';
import { contactShadow } from './vostok';

/** The canopies' areas, m², as his flight has them (crew-descent.ts, sourced there): drawn as domes of that area. */
const STABILISER_AREA = VOSTOK_CREW.stabiliser.area;
const MAIN_AREA = VOSTOK_CREW.main.area;
const RESERVE_AREA = VOSTOK_CREW.reserve.area;
/** Suspension lines from the risers' links to the canopy's skirt, m (estimates: about a canopy's own diameter for the main). */
const STABILISER_LINES = 4;
const MAIN_LINES = 7.5;
const RESERVE_LINES = 6.5;
/** The risers' links above his soles, m, and the stabiliser's attachment over the headrest (estimates). */
const LINKS_Y = 2.15;
const SEAT_LINK_Y = 1.75;
/** How far the two canopies lean apart once both are open, rad (an estimate). */
const SPLAY_MAIN = 0.28;
const SPLAY_RESERVE = 0.55;

/** The helmet's paint: white, "СССР" in red across the brow (shared, never disposed). */
let helmetTex: THREE.Texture | null = null;
function helmetTexture(): THREE.Texture {
  if (helmetTex) return helmetTex;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f3f2ee';
  g.fillRect(0, 0, 512, 256);
  // on a sphere's map +Z, the face, is a quarter of the way along; the brow a third of the way down
  g.fillStyle = '#c8161d';
  g.font = 'bold 44px "DM Sans", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('СССР', 128, 84);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.userData.shared = true;
  helmetTex = t;
  return t;
}

export interface CosmonautView {
  readonly group: THREE.Group;
  /** Draw `crew` (absent: in the seat, nothing open). */
  update(crew: CrewState | undefined): void;
  dispose(): void;
}

/**
 * Size of what flies with him, for the camera's framing, m: the seat on its
 * small chute; the man under his canopies (the main's lines and dome above
 * him); the man on the ground.
 */
export function crewViewSize(crew: CrewState | undefined): number {
  if (!crew || crew.phase === 'seat') return 2.4;
  if (crew.phase === 'stabiliser') return 3.2;
  if (crew.phase === 'landed') return 2.2;
  return 6 + 10 * Math.min(1, crew.main + crew.reserve);
}

/**
 * The seat (its base at 0, up +Y, facing +Z): the pan, the side frames and
 * the two rails it fired along; with `occupied`, the back his parachutes are
 * packed on, the headrest and the survival kit under the pan, which all went
 * on with him at 4 km (crew-descent.ts), so the empty seat falls without them.
 */
function seatParts(parent: THREE.Object3D, seatMat: THREE.Material, kit: THREE.Material,
  geo: <G extends THREE.BufferGeometry>(g: G) => G, occupied: boolean): void {
  const pan = new THREE.Mesh(geo(new THREE.BoxGeometry(0.5, 0.06, 0.5)), seatMat);
  pan.position.set(0, 0.42, 0.05);
  parent.add(pan);
  if (occupied) {
    const naz = new THREE.Mesh(geo(new THREE.BoxGeometry(0.44, 0.3, 0.44)), kit);
    naz.position.set(0, 0.24, 0.05);
    const seatBack = new THREE.Mesh(geo(new THREE.BoxGeometry(0.54, 1.05, 0.08)), seatMat);
    seatBack.position.set(0, 0.95, -0.24);
    const rest = new THREE.Mesh(geo(new THREE.BoxGeometry(0.34, 0.24, 0.1)), seatMat);
    rest.position.set(0, 1.6, -0.22);
    parent.add(naz, seatBack, rest);
  }
  for (const s of [-1, 1]) {
    // the side frames and the two rails behind the back
    const side = new THREE.Mesh(geo(new THREE.BoxGeometry(0.04, 0.22, 0.5)), seatMat);
    side.position.set(s * 0.27, 0.52, 0.05);
    const rail = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.045, 0.045, 1.6, 10)), seatMat);
    rail.position.set(s * 0.2, 0.85, -0.33);
    const brace = new THREE.Mesh(geo(new THREE.BoxGeometry(0.04, 0.04, 0.3)), seatMat);
    brace.position.set(s * 0.22, 0.47, -0.2);
    parent.add(side, rail, brace);
  }
}

/** The empty seat as it falls on its own from 4 km (render/debris.ts), centred on its middle. */
export function buildEmptySeat(): { group: THREE.Group; dispose(): void } {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const geo = <G extends THREE.BufferGeometry>(g: G): G => { geometries.push(g); return g; };
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x6f7568, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
  const inner = new THREE.Group();
  inner.position.y = -0.8;
  seatParts(inner, seatMat, seatMat, geo, false);
  group.add(inner);
  return { group, dispose: () => { for (const g of geometries) g.dispose(); seatMat.dispose(); } };
}

export function buildCosmonaut(): CosmonautView {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const geo = <G extends THREE.BufferGeometry>(g: G): G => { geometries.push(g); return g; };
  const mat = <M extends THREE.Material>(m: M): M => { materials.push(m); return m; };
  const suit = mat(new THREE.MeshStandardMaterial({ color: 0xe8641e, roughness: 0.8, metalness: 0 }));
  const boots = mat(new THREE.MeshStandardMaterial({ color: 0x2e241e, roughness: 0.7 }));
  const gloves = mat(new THREE.MeshStandardMaterial({ color: 0x4a3a2e, roughness: 0.75 }));
  const helmet = mat(new THREE.MeshStandardMaterial({ color: 0xffffff, map: helmetTexture(), roughness: 0.35, metalness: 0.05 }));
  const visor = mat(new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.08, metalness: 0.85, side: THREE.DoubleSide }));
  const seatMat = mat(new THREE.MeshStandardMaterial({ color: 0x6f7568, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }));
  const kit = mat(new THREE.MeshStandardMaterial({ color: 0x8a8460, roughness: 0.8 }));
  const pack = mat(new THREE.MeshStandardMaterial({ color: 0x5d6a4e, roughness: 0.85 }));
  const lineMat = mat(new THREE.LineBasicMaterial({ color: 0xd9d4c8, transparent: true, opacity: 0.85 }));
  const stripes = canopyStripes();
  const canopyMat = mat(new THREE.MeshStandardMaterial({ map: stripes, side: THREE.DoubleSide, roughness: 0.9, metalness: 0 }));

  const up = new THREE.Vector3(0, 1, 0);
  /** A limb from `a` to `b`, its radius `r`. */
  const limb = (parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material): void => {
    const d = b.clone().sub(a);
    const mesh = new THREE.Mesh(geo(new THREE.CapsuleGeometry(r, Math.max(0.01, d.length() - 2 * r), 4, 10)), m);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(up, d.normalize());
    parent.add(mesh);
  };
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  /** Head and helmet, the helmet's centre at `c`. */
  const head = (parent: THREE.Object3D, c: THREE.Vector3): void => {
    const h = new THREE.Mesh(geo(new THREE.SphereGeometry(0.15, 28, 18)), helmet);
    h.position.copy(c);
    parent.add(h);
    const vz = new THREE.Mesh(geo(new THREE.SphereGeometry(0.153, 20, 8, Math.PI / 2 - 0.72, 1.44, Math.PI * 0.42, Math.PI * 0.3)), visor);
    vz.position.copy(c);
    parent.add(vz);
    // the helmet's collar ring on the suit
    const ring = new THREE.Mesh(geo(new THREE.TorusGeometry(0.12, 0.03, 8, 20)), helmet);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(c.x, c.y - 0.15, c.z);
    parent.add(ring);
  };
  /** The torso, hips at `hip`, shoulders `len` above along +Y. */
  const torso = (parent: THREE.Object3D, hip: THREE.Vector3, len: number): void => {
    const body = new THREE.Mesh(geo(new THREE.CapsuleGeometry(0.17, len - 0.1, 4, 12)), suit);
    body.scale.set(1.15, 1, 0.8);
    body.position.set(hip.x, hip.y + len / 2, hip.z);
    parent.add(body);
  };

  // --- hanging in his harness (and standing, once down): soles at 0, up +Y; arms up on the risers
  const hanging = new THREE.Group();
  const hip = v(0, 0.86, 0), shoulderY = 1.32;
  torso(hanging, hip, shoulderY - hip.y);
  head(hanging, v(0, 1.52, 0.01));
  for (const s of [-1, 1]) {
    limb(hanging, v(s * 0.1, 0.92, 0), v(s * 0.11, 0.47, 0.03), 0.075, suit);
    limb(hanging, v(s * 0.11, 0.47, 0.03), v(s * 0.11, 0.1, 0), 0.065, suit);
    const boot = new THREE.Mesh(geo(new THREE.BoxGeometry(0.11, 0.1, 0.26)), boots);
    boot.position.set(s * 0.11, 0.05, 0.04);
    hanging.add(boot);
  }
  // the arms: hands up on the risers while he hangs, by his sides once down
  const armsUp = new THREE.Group(), armsDown = new THREE.Group();
  for (const s of [-1, 1]) {
    limb(armsUp, v(s * 0.22, 1.3, 0), v(s * 0.3, 1.55, 0.06), 0.06, suit);
    limb(armsUp, v(s * 0.3, 1.55, 0.06), v(s * 0.2, 1.85, 0.04), 0.055, suit);
    const hand = new THREE.Mesh(geo(new THREE.SphereGeometry(0.05, 10, 8)), gloves);
    hand.position.set(s * 0.19, 1.9, 0.04);
    armsUp.add(hand);
    limb(armsDown, v(s * 0.23, 1.3, 0), v(s * 0.27, 1.02, 0.02), 0.06, suit);
    limb(armsDown, v(s * 0.27, 1.02, 0.02), v(s * 0.27, 0.78, 0.06), 0.055, suit);
  }
  hanging.add(armsUp, armsDown);
  // the harness's two risers from his shoulders up to the links
  const harnessGeo = geo(new THREE.BufferGeometry());
  harnessGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.17, 1.36, -0.04, 0, LINKS_Y, 0, 0.17, 1.36, -0.04, 0, LINKS_Y, 0], 3));
  const harness = new THREE.LineSegments(harnessGeo, lineMat);
  hanging.add(harness);
  // the reserve's pack on his chest, the main's on his back (the seat back went with him)
  const chest = new THREE.Mesh(geo(new THREE.BoxGeometry(0.32, 0.22, 0.1)), pack);
  chest.position.set(0, 1.08, 0.17);
  const back = new THREE.Mesh(geo(new THREE.BoxGeometry(0.4, 0.5, 0.14)), pack);
  back.position.set(0, 1.1, -0.2);
  hanging.add(chest, back);
  group.add(hanging);

  // --- in the seat: the seat's base at 0, its back and headrest up +Y, him sitting facing +Z
  const seated = new THREE.Group();
  seatParts(seated, seatMat, kit, geo, true);
  const sHip = v(0, 0.55, -0.08);
  torso(seated, sHip, 0.48);
  head(seated, v(0, 1.25, -0.06));
  for (const s of [-1, 1]) {
    limb(seated, v(s * 0.1, 0.55, -0.05), v(s * 0.11, 0.55, 0.36), 0.075, suit);
    limb(seated, v(s * 0.11, 0.55, 0.36), v(s * 0.11, 0.16, 0.42), 0.065, suit);
    const boot = new THREE.Mesh(geo(new THREE.BoxGeometry(0.11, 0.1, 0.26)), boots);
    boot.position.set(s * 0.11, 0.1, 0.5);
    seated.add(boot);
    limb(seated, v(s * 0.23, 0.98, -0.08), v(s * 0.25, 0.72, 0.06), 0.06, suit);
    limb(seated, v(s * 0.25, 0.72, 0.06), v(s * 0.17, 0.62, 0.3), 0.055, suit);
  }
  group.add(seated);

  // --- the canopies. `Canopy` hangs its dome towards −Y of its own axes, the lines meeting at its origin:
  // each one sits in a holder turned over (+Y up here), leaned out by its splay
  const holder = (y: number, z: number): { splay: THREE.Group } => {
    const splay = new THREE.Group();
    splay.position.set(0, y, z);
    const flip = new THREE.Group();
    flip.rotation.x = Math.PI;
    splay.add(flip);
    return { splay };
  };
  const radius = (area: number) => Math.sqrt(area / Math.PI);
  const stabiliser = new Canopy(radius(STABILISER_AREA), STABILISER_LINES, canopyMat, lineMat, 8);
  const main = new Canopy(radius(MAIN_AREA), MAIN_LINES, canopyMat, lineMat, 16);
  const reserve = new Canopy(radius(RESERVE_AREA), RESERVE_LINES, canopyMat, lineMat, 14);
  const hs = holder(SEAT_LINK_Y, -0.2), hm = holder(LINKS_Y, 0), hr = holder(LINKS_Y, 0);
  hs.splay.children[0].add(stabiliser.group);
  hm.splay.children[0].add(main.group);
  hr.splay.children[0].add(reserve.group);
  seated.add(hs.splay);
  hanging.add(hm.splay, hr.splay);
  // the main as it lay on the ground beside him, collapsed into a long heap (the drawing's)
  const spent = new THREE.Mesh(geo(spentCanopyGeometry(6.5, 2.2)), canopyMat);
  spent.rotation.x = -Math.PI / 2;
  spent.position.set(4.4, 0.03, -1.2);
  hanging.add(spent);
  // and his shadow under him, once he stands on the ground
  const shadow = contactShadow(0.55);
  geometries.push(shadow.geometry);
  materials.push(shadow.material as THREE.Material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  hanging.add(shadow);

  const update = (crew: CrewState | undefined): void => {
    const inSeat = !crew || crew.seat;
    seated.visible = inSeat;
    hanging.visible = !inSeat;
    const down = crew?.phase === 'landed';
    armsUp.visible = !down;
    armsDown.visible = down;
    harness.visible = !down;
    spent.visible = down;
    shadow.visible = down;
    stabiliser.update(inSeat ? crew?.stabiliser ?? 0 : 0, 0);
    const m = inSeat || down ? 0 : crew!.main, r = inSeat || down ? 0 : crew!.reserve;
    main.update(m, 0);
    reserve.update(r, 0);
    // the two lean apart as the reserve fills beside the main
    const both = Math.min(1, r / 0.3);
    hm.splay.rotation.z = -SPLAY_MAIN * both;
    hr.splay.rotation.z = SPLAY_RESERVE;
  };
  update(undefined);
  return {
    group, update,
    dispose: () => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      stabiliser.dispose(); main.dispose(); reserve.dispose();
      stripes.dispose();
    },
  };
}
