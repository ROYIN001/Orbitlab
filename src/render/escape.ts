/**
 * A launch abort as drawn (roadmap G06): the head section with its escape
 * tower and grid fins, the spacecraft whole, or the descent module on its
 * parachutes, with the motors' fire. Placed like the stack it replaces — the
 * app gives `group` the escaping body's attitude and puts its origin on the
 * body's lowest point (`RigidTelemetry.renderOffsetBody`) — and driven only by
 * the frame (`VisualFrame.abort`), so a replay draws the same abort.
 *
 * Model axes as the rocket's: +Y along the body's x axis, the tower's end of
 * the head section, the heat shield of the descent module. The head section
 * starts at the service module's interface, 2.7 m above the fairing's base,
 * and is cut from the same drawn fairing as the stack it left.
 */
import * as THREE from 'three';
import type { VisualFrame } from '../physics/frame';
import { ESCAPE } from '../physics/rigid/escape';
import { ogiveProfile } from './liveries';
import { Plume } from './plume';
import { CrewedTop, FIN_CENTRE } from './soyuz';
import { gridFinTexture } from './rocket';
import { smoothstep } from './noise';

/** How far the fins swing out when they open, rad, and how long it takes, s. */
const FIN_OPEN = Math.PI / 2;
const FIN_SWING = 0.6;

function stripes(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 16;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 2 ? '#f4f1ea' : '#ef6b21';
    g.fillRect(i * 16, 0, 16, 16);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A parachute: a dome over its risers, the dome's mouth towards the capsule. */
class Canopy {
  readonly group = new THREE.Group();
  private readonly dome: THREE.Mesh;
  private readonly risers: THREE.LineSegments;
  constructor(radius: number, private readonly distance: number, material: THREE.Material, lineMat: THREE.LineBasicMaterial) {
    const dome = new THREE.SphereGeometry(radius, 32, 10, 0, Math.PI * 2, 0, Math.PI * 0.42);
    this.dome = new THREE.Mesh(dome, material);
    // convex side away from the capsule, which is towards −Y from its apex
    this.dome.rotation.x = Math.PI;
    this.group.add(this.dome);
    const rim = radius * Math.sin(Math.PI * 0.42), rimDrop = radius * Math.cos(Math.PI * 0.42);
    const pts: number[] = [];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      pts.push(0, distance, 0, Math.cos(a) * rim, -rimDrop, Math.sin(a) * rim);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.risers = new THREE.LineSegments(geo, lineMat);
    this.group.add(this.risers);
    this.group.visible = false;
  }
  /** Open 0–1, hung `distance` above `apexY` (towards −Y). */
  update(open: number, apexY: number): void {
    this.group.visible = open > 0.01;
    if (!this.group.visible) return;
    const s = 0.25 + 0.75 * Math.min(1, open);
    this.group.position.y = apexY - this.distance;
    this.dome.scale.set(s, 0.6 + 0.4 * s, s);
    this.risers.scale.set(s, 1, s);
  }
  dispose(): void { this.dome.geometry.dispose(); this.risers.geometry.dispose(); }
}

export class EscapeView {
  readonly group = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly spacecraft = new THREE.Group();
  private readonly capsule = new THREE.Group();
  private readonly tower: THREE.Group;
  private readonly crewedTop: CrewedTop;
  private readonly fins: THREE.Group[] = [];
  private readonly mainPlumes: Plume[] = [];
  private readonly controlPlume: Plume;
  private readonly fairingPlumes: Plume[] = [];
  private readonly softPlume: Plume;
  private readonly heatShield: THREE.Mesh;
  private readonly drogue: Canopy;
  private readonly main: Canopy;
  private readonly materials: THREE.Material[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly textures: THREE.Texture[] = [];

  /**
   * @param fairingRadius the drawn fairing's radius, m
   * @param fairingLength the drawn fairing's length, m
   */
  constructor(fairingRadius: number, fairingLength: number) {
    const mat = (color: string, metal = 0.2, rough = 0.6) => {
      const m = new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });
      this.materials.push(m);
      return m;
    };
    const geo = <G extends THREE.BufferGeometry>(g: G): G => { this.geometries.push(g); return g; };
    const finMaterial = new THREE.MeshStandardMaterial({ map: gridFinTexture(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5, color: 0x9a9da1 });
    this.materials.push(finMaterial);
    const R = fairingRadius, cut = ESCAPE.serviceModule.length, headL = fairingLength - cut;
    const cylTop = fairingLength * 0.52 - cut;
    // --- the head section: the fairing above the service module, its fins and motors, the tower
    const shell = mat('#e8e8e8', 0.15, 0.5);
    const cyl = new THREE.Mesh(geo(new THREE.CylinderGeometry(R, R, cylTop, 40, 1)), shell);
    cyl.position.y = cylTop / 2;
    this.head.add(cyl);
    this.head.add(new THREE.Mesh(geo(new THREE.LatheGeometry(ogiveProfile(R, cylTop, headL - cylTop, 24), 40)), shell));
    const base = new THREE.Mesh(geo(new THREE.CircleGeometry(R, 40)), mat('#3a3d42'));
    base.rotation.x = Math.PI / 2;
    this.head.add(base);
    // the lattice fins, folded flat along the fairing, hinged at their top edge
    const finW = R * 0.75, finH = fairingLength * 0.16;
    const finGeo = geo(new THREE.PlaneGeometry(finW, finH));
    const finY = fairingLength * FIN_CENTRE - cut;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const az = new THREE.Group();
      az.rotation.y = -a;
      const hinge = new THREE.Group();
      hinge.position.set(R + 0.08, finY + finH / 2, 0);
      const fin = new THREE.Mesh(finGeo, finMaterial);
      fin.position.y = -finH / 2;
      fin.rotation.y = Math.PI / 2;
      hinge.add(fin);
      az.add(hinge);
      this.head.add(az);
      this.fins.push(hinge);
    }
    // the four РДГ motors, near the top of the fairing's cylinder
    for (let k = 0; k < 4; k++) {
      const az = new THREE.Group();
      az.rotation.y = -(k / 4) * Math.PI * 2;
      const nozzle = new THREE.Mesh(geo(new THREE.ConeGeometry(0.12, 0.3, 10, 1, true)), mat('#3c3f44', 0.4, 0.6));
      nozzle.position.set(R * 0.97, cylTop + 0.2, 0);
      nozzle.rotation.z = 0.5;
      az.add(nozzle);
      const plume = new Plume({ radius: 0.14, length: 5, kind: 'solid', seed: 0.3 + k * 0.11 });
      const cant = new THREE.Group();
      cant.position.set(R * 1.02, cylTop + 0.05, 0);
      cant.rotation.z = 0.5;
      cant.add(plume.group);
      az.add(cant);
      this.fairingPlumes.push(plume);
      this.head.add(az);
    }
    // the tower on the fairing's nose, its eight canted nozzles' fire and the control motor's
    this.crewedTop = new CrewedTop(R, headL, (c, metal, rough) => mat(c, metal, rough), finMaterial);
    this.tower = this.crewedTop.tower;
    this.head.add(this.tower);
    const tw = ESCAPE.tower, nozzleY = tw.truss + tw.motor * 0.72;
    for (let k = 0; k < 8; k++) {
      const az = new THREE.Group();
      az.rotation.y = -(k / 8) * Math.PI * 2;
      const cant = new THREE.Group();
      cant.position.set(0.46, nozzleY - 0.15, 0);
      cant.rotation.z = 0.47;
      const plume = new Plume({ radius: 0.11, length: 6, kind: 'solid', seed: 0.05 + k * 0.07 });
      cant.add(plume.group);
      az.add(cant);
      this.tower.add(az);
      this.mainPlumes.push(plume);
    }
    this.controlPlume = new Plume({ radius: 0.08, length: 2.5, kind: 'solid', seed: 0.9 });
    const control = new THREE.Group();
    control.position.set(0.45, tw.truss + tw.motor + tw.cap * 0.3, 0);
    control.rotation.z = Math.PI / 2;
    control.add(this.controlPlume.group);
    this.tower.add(control);
    this.group.add(this.head);

    // --- the descent module: +Y out of its heat shield, its body towards −Y
    const dm = ESCAPE.descentModule;
    // from the hatch on top down to the shield's rim: a lathe faces outward with its profile rising in y
    const bell = [[0, -dm.length], [0.36, -dm.length], [0.46, -2.1], [0.72, -1.8], [0.95, -1.2], [1.07, -0.6], [1.085, -0.15], [0.95, -0.02]] as const;
    const body = new THREE.Mesh(geo(new THREE.LatheGeometry(bell.map(([r, y]) => new THREE.Vector2(r, y)), 32)), mat('#7c7a66', 0.1, 0.85));
    this.capsule.add(body);
    this.heatShield = new THREE.Mesh(geo(new THREE.SphereGeometry(2.235, 32, 6, 0, Math.PI * 2, 0, 0.5)), mat('#3b2d24', 0.05, 0.95));
    // the shield is a spherical cap bulging out along +Y from the capsule's base
    this.heatShield.position.y = 0.12 - 2.235;
    this.capsule.add(this.heatShield);
    const stripeTex = stripes();
    this.textures.push(stripeTex);
    const canopyMat = new THREE.MeshStandardMaterial({ map: stripeTex, side: THREE.DoubleSide, roughness: 0.9, metalness: 0 });
    this.materials.push(canopyMat);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xd9d4c8, transparent: true, opacity: 0.8 });
    this.materials.push(lineMat);
    this.drogue = new Canopy(Math.sqrt(ESCAPE.drogue.area / Math.PI), 16, canopyMat, lineMat);
    this.main = new Canopy(Math.sqrt(ESCAPE.main.area / Math.PI), 38, canopyMat, lineMat);
    this.capsule.add(this.drogue.group, this.main.group);
    this.softPlume = new Plume({ radius: 0.6, length: 2.5, kind: 'solid', seed: 0.7 });
    // the soft-landing motors fire at the ground, beyond the heat shield's place
    this.softPlume.group.position.y = 0.3;
    this.softPlume.group.rotation.z = Math.PI;
    this.capsule.add(this.softPlume.group);
    this.group.add(this.capsule);

    // --- the spacecraft whole, after the fairing: service module, descent module, orbital module
    const sm = new THREE.Mesh(geo(new THREE.CylinderGeometry(1.36, 1.36, ESCAPE.serviceModule.length, 32)), mat('#5b6457', 0.3, 0.6));
    sm.position.y = ESCAPE.serviceModule.length / 2;
    this.spacecraft.add(sm);
    const dmWhole = new THREE.Mesh(body.geometry, body.material);
    dmWhole.rotation.x = Math.PI;
    dmWhole.position.y = ESCAPE.serviceModule.length;
    this.spacecraft.add(dmWhole);
    const om = new THREE.Mesh(geo(new THREE.SphereGeometry(1.15, 24, 16)), mat('#7c7a66', 0.1, 0.85));
    om.scale.y = 1.13;
    om.position.y = ESCAPE.serviceModule.length + dm.length + 1.3;
    this.spacecraft.add(om);
    this.group.add(this.spacecraft);
    this.group.visible = false;
  }

  /** Draw the abort of `frame`; hidden without one. */
  update(frame: VisualFrame): void {
    const a = frame.abort;
    this.group.visible = !!a;
    if (!a) return;
    const tau = frame.t - a.t0, p = frame.pressure, t = frame.t;
    this.head.visible = a.body === 'head';
    this.spacecraft.visible = a.body === 'spacecraft';
    this.capsule.visible = a.body === 'capsule';
    if (a.body === 'head') {
      this.tower.visible = a.mode === 'tower';
      const open = a.finsOpen ? smoothstep(0, 1, (tau - ESCAPE.fairing.finsOpen) / FIN_SWING) : 0;
      for (const hinge of this.fins) hinge.rotation.z = -open * FIN_OPEN;
      for (const plume of this.mainPlumes) plume.update(a.motors.main, p, t);
      this.controlPlume.update(a.motors.control * 0.8, p, t);
      for (const plume of this.fairingPlumes) plume.update(a.motors.fairing, p, t);
    }
    if (a.body === 'capsule') {
      this.heatShield.visible = a.heatShield;
      const apex = -ESCAPE.descentModule.length;
      this.drogue.update(a.drogue, apex);
      this.main.update(a.main, apex);
      this.softPlume.update(a.motors.softLanding, p, t);
    }
  }

  /** Length of what is flying, for the camera's framing, m: a parachute widens the view. */
  size(frame: VisualFrame): number {
    const a = frame.abort;
    if (!a) return 0;
    if (a.body === 'capsule') return a.main > 0.2 ? 32 : a.drogue > 0.2 ? 16 : 3;
    if (a.body === 'spacecraft') return ESCAPE.serviceModule.length + ESCAPE.descentModule.length + 2.6;
    return ESCAPE.fairing.length + (a.mode === 'tower' ? ESCAPE.tower.length : 0);
  }

  dispose(): void {
    for (const m of this.materials) m.dispose();
    for (const g of this.geometries) g.dispose();
    for (const x of this.textures) x.dispose();
    this.drogue.dispose(); this.main.dispose();
    this.crewedTop.dispose();
    for (const plume of [...this.mainPlumes, ...this.fairingPlumes, this.controlPlume, this.softPlume]) plume.dispose();
  }
}
