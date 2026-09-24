/**
 * Where returning hardware comes down, drawn on the globe: Landing Zones 1
 * and 2 at Cape Canaveral, a drone ship on the station its booster is flown
 * to, and a patch of open sea under a ship coming down to splash down. The
 * tower that catches Super Heavy is part of the Starbase pad (src/render/pads.ts).
 *
 * Each piece sits in a local frame fixed to the rotating Earth — X east, Y up,
 * Z south, as the launch complex — at the height the simulation puts its
 * surface: a landing zone at the launch site's own elevation (the ground the
 * physics lands the stage on), a drone ship's deck and the sea at sea level.
 * They are metre-scale, so like the pad structures they are simply switched
 * off from far away.
 */
import * as THREE from 'three';
import type { SiteExtra } from '../data/sites';
import { landingZonesForSite, type LandingZoneSpec } from '../data/landing-zones';
import type { VisualFrame } from '../physics/frame';
import type { ReturnTarget } from '../physics/sim/return-guidance';
import { enuFrame } from '../physics/orbital';
import { DEG, R_EARTH } from '../physics/constants';
import type { Vec3 } from '../physics/vec3';
import type { SceneManager } from './scene';
import { disposeObject } from './dispose';
import { smoothstep } from './noise';

/** Slant range past which a landing zone or a drone ship is not drawn, m. */
const DRAW_RANGE = 150e3;
/** Radius of the patch of sea drawn under a drone ship or a ship coming down, m. */
const SEA_RADIUS = 6e3;
/** Below this a ship coming home gets its sea drawn under it, m. */
const SEA_FROM_ALTITUDE = 40e3;

/** A local frame on the rotating Earth at a latitude and longitude (rad). */
class SurfaceAnchor {
  readonly group = new THREE.Group();
  private readonly eci: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly tmp = new THREE.Vector3();
  private readonly basis = new THREE.Matrix4();
  private readonly ax = new THREE.Vector3();
  private readonly ay = new THREE.Vector3();
  private readonly az = new THREE.Vector3();

  constructor(public lat: number, public lon: number, public radius: number) {}

  /** Place the frame for the displayed instant; false when it is too far to draw. */
  place(scene: SceneManager, theta: number): boolean {
    const lam = this.lon + theta, r = this.radius;
    this.eci.x = r * Math.cos(this.lat) * Math.cos(lam);
    this.eci.y = r * Math.cos(this.lat) * Math.sin(lam);
    this.eci.z = r * Math.sin(this.lat);
    scene.toScene(this.eci, this.tmp);
    this.group.position.copy(this.tmp);
    const { east, north, up } = enuFrame(this.eci);
    this.basis.makeBasis(this.ax.set(east.x, east.y, east.z), this.ay.set(up.x, up.y, up.z), this.az.set(-north.x, -north.y, -north.z));
    this.group.quaternion.setFromRotationMatrix(this.basis);
    const near = this.group.position.distanceTo(scene.camera.position) < DRAW_RANGE;
    this.group.visible = near;
    return near;
  }
}

type Mat = (color: number, metal?: number, rough?: number) => THREE.MeshStandardMaterial;

/**
 * A landing zone: the 86 m concrete circle SpaceX lands on at Cape Canaveral,
 * with its painted ring and the big cross in the middle, on a square of
 * cleared ground with the road in.
 */
function landingPad(zone: LandingZoneSpec, mat: Mat): THREE.Group {
  const g = new THREE.Group();
  const r = zone.radius;
  // Cleared, graded ground the pad sits in.
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(r * 4.2, r * 4.2).rotateX(-Math.PI / 2), mat(0xb3ab8c, 0, 0.95));
  apron.position.y = -0.25;
  apron.receiveShadow = true;
  g.add(apron);
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.02, 0.8, 72), mat(0xbfbcb2, 0.02, 0.9));
  slab.position.y = -0.35;
  slab.receiveShadow = true;
  g.add(slab);
  const paint = mat(0xf4f2ec, 0, 0.7);
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.9, r * 0.955, 96).rotateX(-Math.PI / 2), paint);
  ring.position.y = 0.07;
  g.add(ring);
  for (const a of [Math.PI / 4, -Math.PI / 4]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(r * 1.45, 0.04, r * 0.11), paint);
    bar.rotation.y = a;
    bar.position.y = 0.07;
    g.add(bar);
  }
  // The road in, and the pad's floodlight poles.
  const road = new THREE.Mesh(new THREE.PlaneGeometry(r * 3.2, 7).rotateX(-Math.PI / 2), mat(0x55565a, 0, 0.9));
  road.position.set(-r * 2.6, -0.2, 0);
  g.add(road);
  const poles: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2, d = r * 1.55;
    poles.push(new THREE.CylinderGeometry(0.25, 0.35, 18, 6).translate(Math.cos(a) * d, 9, Math.sin(a) * d));
  }
  for (const p of poles) g.add(new THREE.Mesh(p, mat(0x9aa0a6, 0.4, 0.5)));
  g.traverse((o) => { o.frustumCulled = false; });
  return g;
}

/**
 * An autonomous spaceport drone ship, 91 × 52 m (Of Course I Still Love You),
 * its deck a metre and a half over the swell: the dark hull, the landing
 * circle with its cross, the blast walls along the stern and the thruster
 * pods at the corners.
 */
function droneShip(mat: Mat): THREE.Group {
  const g = new THREE.Group();
  // Deck at y = 0, the sea level the physics lands on; the sea patch sits
  // 1.5 m below it (see `seaPatch`).
  const L = 91, B = 52;
  const hull = new THREE.Mesh(new THREE.BoxGeometry(B, 6, L), mat(0x2b2e33, 0.35, 0.6));
  hull.position.y = -3;
  hull.castShadow = true;
  hull.receiveShadow = true;
  g.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(B - 1, 0.3, L - 1), mat(0x4b4e54, 0.2, 0.85));
  deck.position.y = -0.1;
  deck.receiveShadow = true;
  g.add(deck);
  const paint = mat(0xe9e6dd, 0, 0.7);
  const ring = new THREE.Mesh(new THREE.RingGeometry(21, 22.5, 72).rotateX(-Math.PI / 2), paint);
  ring.position.y = 0.07;
  g.add(ring);
  for (const a of [Math.PI / 4, -Math.PI / 4]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(34, 0.04, 2.6), paint);
    bar.rotation.y = a;
    bar.position.y = 0.07;
    g.add(bar);
  }
  // Blast walls at the stern and part-way up the sides.
  const walls = mat(0x3a3d42, 0.3, 0.7);
  const wallParts = [
    new THREE.BoxGeometry(B, 6, 0.8).translate(0, 3, L / 2 - 0.4),
    new THREE.BoxGeometry(0.8, 4, 22).translate(B / 2 - 0.4, 2, L / 2 - 11),
    new THREE.BoxGeometry(0.8, 4, 22).translate(-B / 2 + 0.4, 2, L / 2 - 11),
  ];
  for (const p of wallParts) {
    const w = new THREE.Mesh(p, walls);
    w.castShadow = true;
    g.add(w);
  }
  // Thruster pods at the four corners, and a stripe of hazard paint along the edge.
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 8), mat(0x6b6e73, 0.4, 0.6));
    pod.position.set(sx * (B / 2 - 3.5), 1.5, sz * (L / 2 - 6));
    g.add(pod);
  }
  const stripe = mat(0xd9b21e, 0.1, 0.7);
  for (const sx of [1, -1]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, L - 20), stripe);
    s.position.set(sx * (B / 2 - 1.5), 0.08, -8);
    g.add(s);
  }
  g.traverse((o) => { o.frustumCulled = false; });
  return g;
}

/** A disc of open sea, fading out at its rim into the globe's own ocean. */
function seaPatch(): THREE.Mesh {
  const geo = new THREE.CircleGeometry(SEA_RADIUS, 96, 0, Math.PI * 2);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 4);
  const deep = new THREE.Color(0x173f5c), near = new THREE.Color(0x245b7a);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x, z);
    // the surface drops away with the Earth's curvature, as the pad's terrain does
    pos.setY(i, -(d * d) / (2 * R_EARTH));
    c.copy(near).lerp(deep, smoothstep(0, SEA_RADIUS * 0.6, d));
    colors[i * 4] = c.r; colors[i * 4 + 1] = c.g; colors[i * 4 + 2] = c.b;
    colors[i * 4 + 3] = 0.95 * (1 - smoothstep(SEA_RADIUS * 0.45, SEA_RADIUS, d));
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, metalness: 0.3, transparent: true, depthWrite: false }));
  mesh.position.y = -1.5;
  mesh.renderOrder = -1;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

export class RecoverySceneryView {
  readonly group = new THREE.Group();
  private readonly materials: THREE.MeshStandardMaterial[] = [];
  private readonly pads: SurfaceAnchor[] = [];
  private readonly ship: SurfaceAnchor;
  private readonly sea: SurfaceAnchor;

  constructor(site: SiteExtra) {
    const mat: Mat = (color, metal = 0.1, rough = 0.7) => {
      const m = new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });
      this.materials.push(m);
      return m;
    };
    for (const zone of landingZonesForSite(site.id)) {
      if (zone.kind !== 'pad') continue;
      const anchor = new SurfaceAnchor(zone.latitude * DEG, zone.longitude * DEG, R_EARTH + site.altitude);
      anchor.group.add(landingPad(zone, mat));
      this.group.add(anchor.group);
      this.pads.push(anchor);
    }
    this.ship = new SurfaceAnchor(0, 0, R_EARTH);
    this.ship.group.add(droneShip(mat), seaPatch());
    this.ship.group.visible = false;
    this.group.add(this.ship.group);
    this.sea = new SurfaceAnchor(0, 0, R_EARTH);
    this.sea.group.add(seaPatch());
    this.sea.group.visible = false;
    this.group.add(this.sea.group);
  }

  /** The drone ship the frame's returning booster is flown to, if any. */
  private static droneShip(frame: VisualFrame): ReturnTarget | undefined {
    let found: ReturnTarget | undefined;
    for (const d of frame.debris) {
      const target = d.recovery?.target;
      if (target?.kind === 'droneShip') found = target;
    }
    return found;
  }

  update(scene: SceneManager, frame: VisualFrame): void {
    for (const pad of this.pads) pad.place(scene, frame.theta);
    const target = RecoverySceneryView.droneShip(frame);
    if (target) {
      this.ship.lat = target.lat;
      this.ship.lon = target.lon;
      this.ship.radius = R_EARTH + target.alt;
      this.ship.place(scene, frame.theta);
    } else {
      this.ship.group.visible = false;
    }
    // A ship coming home over the sea: open water under it from the belly flop on.
    const home = (frame.status === 'descent' && frame.altitude < SEA_FROM_ALTITUDE) || frame.status === 'landed';
    if (home) {
      const r = Math.hypot(frame.r.x, frame.r.y, frame.r.z);
      this.sea.lat = Math.asin(frame.r.z / r);
      this.sea.lon = Math.atan2(frame.r.y, frame.r.x) - frame.theta;
      this.sea.place(scene, frame.theta);
    } else {
      this.sea.group.visible = false;
    }
  }

  dispose(): void {
    for (const m of this.materials) m.dispose();
    disposeObject(this.group);
  }
}
