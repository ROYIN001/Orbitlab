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
import { ESCAPE, MERCURY_CAPSULE, SOYUZ_DESCENT, VOSTOK_CAPSULE, type DescentCapsule } from '../physics/rigid/escape';
import { ogiveProfile } from './liveries';
import { Plume } from './plume';
import { CrewedTop, FIN_CENTRE } from './soyuz';
import { gridFinTexture } from './rocket';
import { smoothstep } from './noise';
import { Canopy, canopyStripes, spentCanopyGeometry } from './canopy';
import { buildEntryGlow, entryGlow, type EntryGlowView } from './entry-glow';
import { buildInstrumentModule, contactShadow, IM_NEST, IM_NOZZLE_Y, type InstrumentModuleView } from './vostok';
import { OMEGA_EARTH } from '../physics/constants';

/** Vostok's sphere: its radius, m (2.3 m across, GCTC). */
const VOSTOK_R = 1.15;
const Z_AXIS = new THREE.Vector3(0, 0, 1);
/**
 * Hatch No. 1's outward normal in the model's axes (+Y the sphere's heavy
 * bottom, the body's +x; the body's +y is the model's −X): physics/rigid/
 * escape.ts `hatchNormal`, turned into the drawing.
 */
function hatchModel(rails: number): THREE.Vector3 {
  const a = rails * Math.PI / 180;
  return new THREE.Vector3(-Math.sin(a), -Math.cos(a), 0);
}

/** How far the fins swing out when they open, rad, and how long it takes, s. */
const FIN_OPEN = Math.PI / 2;
const FIN_SWING = 0.6;

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
  /** the capsule this view draws coming home (C01: Mercury as well as Soyuz) */
  private readonly spec: DescentCapsule;
  private readonly retroPack: THREE.Group;
  private retroPlume: Plume | null = null;
  /** C01, Vostok: the instrument module, its straps and cables, hatch No. 1, the pilot chute, the entry's glow */
  private module: InstrumentModuleView | null = null;
  private readonly straps = new THREE.Group();
  private cable: THREE.Line | null = null;
  private hatch: THREE.Mesh | null = null;
  private hatchHole: THREE.Mesh | null = null;
  private pilotChute: Canopy | null = null;
  private spentMain: THREE.Mesh | null = null;
  private shadow: THREE.Mesh | null = null;
  private glow: EntryGlowView | null = null;
  private readonly qInv = new THREE.Quaternion();
  private readonly flow = new THREE.Vector3();
  private readonly cg = new THREE.Vector3();
  private readonly across = new THREE.Vector3();
  private readonly lay = new THREE.Matrix4();

  /**
   * @param fairingRadius the drawn fairing's radius, m
   * @param fairingLength the drawn fairing's length, m
   */
  constructor(fairingRadius: number, fairingLength: number, readonly capsuleId: DescentCapsule['id'] = 'soyuz') {
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
    const mercury = capsuleId === 'mercury', vostok = capsuleId === 'vostok';
    this.spec = mercury ? MERCURY_CAPSULE : vostok ? VOSTOK_CAPSULE : SOYUZ_DESCENT;
    // from the hatch on top down to the shield's rim: a lathe faces outward with its profile rising in y.
    // Mercury (C01): the 1.89 m shield, the conical crew cabin to 0.8 m, the
    // recovery compartment and the antenna canister above it, in its dark
    // corrugated shingles (NASA drawings; the profile is approximate).
    const bell = mercury
      ? [[0, -2.08], [0.2, -2.08], [0.24, -1.72], [0.36, -1.72], [0.4, -1.3], [0.53, -1.3], [0.93, -0.12], [0.946, -0.02]] as const
      : [[0, -dm.length], [0.36, -dm.length], [0.46, -2.1], [0.72, -1.8], [0.95, -1.2], [1.07, -0.6], [1.085, -0.15], [0.95, -0.02]] as const;
    // Vostok (C01): the 2.3 m sphere in its ablative, the heat shield nowhere and everywhere
    const body = vostok
      ? new THREE.Mesh(geo(new THREE.SphereGeometry(1.15, 36, 24)), mat('#6b6a66', 0.05, 0.85))
      : new THREE.Mesh(geo(new THREE.LatheGeometry(bell.map(([r, y]) => new THREE.Vector2(r, y)), 32)), mercury ? mat('#24262b', 0.35, 0.55) : mat('#7c7a66', 0.1, 0.85));
    if (vostok) body.position.y = -1.15;
    this.capsule.add(body);
    const shieldR = mercury ? 2.0 : 2.235;
    this.heatShield = new THREE.Mesh(geo(new THREE.SphereGeometry(shieldR, 32, 6, 0, Math.PI * 2, 0, Math.asin(Math.min(1, (this.spec.diameter / 2) / shieldR)))), mat('#3b2d24', 0.05, 0.95));
    // the shield is a spherical cap bulging out along +Y from the capsule's base
    this.heatShield.position.y = 0.12 - shieldR;
    this.heatShield.visible = !vostok;
    this.capsule.add(this.heatShield);
    // Mercury's retropack: three motors strapped over the shield's centre
    this.retroPack = new THREE.Group();
    if (mercury) {
      const pack = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.4, 0.45, 0.35, 20)), mat('#b9bcc2', 0.6, 0.35));
      pack.position.y = 0.3;
      this.retroPack.add(pack);
      for (let i = 0; i < 3; i++) {
        const a = (i * 2 * Math.PI) / 3;
        const motor = new THREE.Mesh(geo(new THREE.SphereGeometry(0.15, 12, 8)), mat('#8a8d93', 0.5, 0.4));
        motor.position.set(Math.cos(a) * 0.22, 0.42, Math.sin(a) * 0.22);
        this.retroPack.add(motor);
      }
      this.retroPlume = new Plume({ radius: 0.25, length: 3, kind: 'solid', seed: 0.3 });
      this.retroPlume.group.position.y = 0.55;
      this.retroPack.add(this.retroPlume.group);
      this.capsule.add(this.retroPack);
    } else if (vostok) {
      // Vostok's instrument module under the sphere (render/vostok.ts), the sphere sitting in its cradle
      this.module = buildInstrumentModule();
      this.module.group.position.y = -IM_NEST;
      this.retroPack.add(this.module.group);
      // the exhaust out ahead of the flight: the engine fires against it
      this.retroPlume = new Plume({ radius: 0.2, length: 4, kind: 'hypergolic', seed: 0.3 });
      this.retroPlume.group.position.y = IM_NOZZLE_Y - IM_NEST;
      this.retroPlume.group.rotation.z = Math.PI;
      this.retroPack.add(this.retroPlume.group);
      this.capsule.add(this.retroPack);
      // the four steel straps over the sphere from the module's rim to the lock on its top, until the backup fires
      // them (their width and run the drawing's)
      const strapMat = mat('#c9ccd0', 0.7, 0.3);
      const strapGeo = geo(new THREE.TorusGeometry(VOSTOK_R + 0.03, 0.045, 5, 40, Math.PI * 0.72));
      for (let k = 0; k < 4; k++) {
        const az = new THREE.Group();
        az.position.y = -VOSTOK_R;
        az.rotation.y = (k / 4) * Math.PI * 2 + Math.PI / 4;
        // an arc in the plane of the axis from near the cradle's rim (+Y side) over the top (−Y) of the sphere
        const band = new THREE.Mesh(strapGeo, strapMat);
        band.rotation.z = -Math.PI / 2;
        az.add(band);
        this.straps.add(az);
      }
      this.capsule.add(this.straps);
      // the cables that held on for a few seconds after the straps, between their two ends (`AbortState.tether`)
      const cableGeo = geo(new THREE.BufferGeometry());
      cableGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
      const cableMat = new THREE.LineBasicMaterial({ color: 0x2b2b2b });
      this.materials.push(cableMat);
      this.cable = new THREE.Line(cableGeo, cableMat);
      this.cable.frustumCulled = false;
      this.cable.visible = false;
      this.capsule.add(this.cable);
      // hatch No. 1 above the equator, 1 m across, `rails` degrees from the top (physics hatchNormal; GCTC), and
      // the dark opening it leaves
      const n = hatchModel(this.spec.ejection?.rails ?? 64);
      const centre = new THREE.Vector3(0, -VOSTOK_R, 0);
      const hatchR = 0.5, inset = Math.sqrt(VOSTOK_R ** 2 - hatchR ** 2);
      this.hatch = new THREE.Mesh(geo(new THREE.CylinderGeometry(hatchR, hatchR, 0.06, 28)), mat('#86847d', 0.15, 0.7));
      this.hatch.position.copy(centre).addScaledVector(n, inset + 0.03);
      this.hatch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      this.hatchHole = new THREE.Mesh(geo(new THREE.CircleGeometry(hatchR * 0.97, 28)), mat('#060607', 0, 1));
      this.hatchHole.position.copy(centre).addScaledVector(n, inset + 0.01);
      this.hatchHole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      this.hatchHole.visible = false;
      this.capsule.add(this.hatch, this.hatchHole);
      // the window at the pilot's side and the Vzor port at his feet (placed as render/satellite.ts places them)
      const glass = mat('#14171d', 0.8, 0.1);
      for (const [polar, azimuth, size] of [[1.4, 0.0, 0.22], [1.95, 1.9, 0.3]] as const) {
        const dir = new THREE.Vector3(Math.sin(polar) * Math.cos(azimuth), -Math.cos(polar), Math.sin(polar) * Math.sin(azimuth));
        const port = new THREE.Mesh(geo(new THREE.CircleGeometry(size, 20)), glass);
        port.position.copy(centre).addScaledVector(dir, VOSTOK_R + 0.01);
        port.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        this.capsule.add(port);
      }
      // the shock layer and the wake through the entry, round the sphere's centre
      this.glow = buildEntryGlow(VOSTOK_R, { wake: 8 });
      this.glow.group.position.copy(centre);
      this.capsule.add(this.glow.group);
    }
    const stripeTex = canopyStripes();
    this.textures.push(stripeTex);
    const canopyMat = new THREE.MeshStandardMaterial({ map: stripeTex, side: THREE.DoubleSide, roughness: 0.9, metalness: 0 });
    this.materials.push(canopyMat);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xd9d4c8, transparent: true, opacity: 0.8 });
    this.materials.push(lineMat);
    this.drogue = new Canopy(Math.sqrt(this.spec.drogue.area / Math.PI), 16, canopyMat, lineMat);
    this.main = new Canopy(Math.sqrt(this.spec.main.area / Math.PI), 38, canopyMat, lineMat);
    this.capsule.add(this.drogue.group, this.main.group);
    // C01: Vostok's 1.5 m² pilot chute, out with the hatch, drawing the braking chute out (its lines' length an estimate)
    if (vostok && this.spec.pilot) {
      this.pilotChute = new Canopy(Math.sqrt(this.spec.pilot.area / Math.PI), 10, canopyMat, lineMat, 8);
      this.capsule.add(this.pilotChute.group);
    }
    // C01: Vostok's main lying collapsed beside the sphere once it is down, a long heap (the drawing's)
    if (vostok) {
      this.spentMain = new THREE.Mesh(geo(spentCanopyGeometry(16, 5)), canopyMat);
      this.spentMain.visible = false;
      this.shadow = contactShadow(1.6);
      this.geometries.push(this.shadow.geometry);
      this.materials.push(this.shadow.material as THREE.Material);
      this.shadow.visible = false;
      this.capsule.add(this.spentMain, this.shadow);
    }
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
      this.heatShield.visible = a.heatShield && a.capsule !== 'vostok';
      // the retropack stays on until it is jettisoned, a minute after the retros; Vostok's instrument module
      // until the cables part (C01: `joint`; the pair flies as one body on its cables, so it is drawn on until then)
      this.retroPack.visible = !!this.spec.retro && (a.joint !== undefined ? a.joint !== 'free' : tau < this.spec.retro.jettison);
      this.retroPlume?.update(Math.min(1, a.motors.retro ?? 0), p, t);
      const apex = -this.spec.length;
      this.drogue.update(a.drogue, apex);
      this.main.update(a.main, apex);
      this.pilotChute?.update(a.pilot ?? 0, apex);
      this.softPlume.update(a.motors.softLanding, p, t);
      if (this.module) this.updateVostok(frame, a);
    }
  }

  /**
   * C01: Vostok's sphere: its straps until the backup fires them, the cables
   * between their two ends while they alone hold the pair, hatch No. 1 or the
   * dark opening it leaves, and the entry's glow, which is turned onto the air
   * the sphere is moving through, whatever its spin (`group` already carries
   * the attitude the app gave it).
   */
  private updateVostok(frame: VisualFrame, a: NonNullable<VisualFrame['abort']>): void {
    this.straps.visible = a.joint !== undefined ? a.joint === 'joined' : frame.t - a.t0 < (this.spec.retro?.straps ?? Infinity);
    const hatchOn = a.hatch ?? true;
    this.hatch!.visible = hatchOn;
    this.hatchHole!.visible = !hatchOn;
    this.qInv.copy(this.group.quaternion).invert();
    // the sphere's CG in the model: the group's origin is the frame's render offset from it
    const off = frame.rigid?.renderOffsetBody;
    this.cg.set(off ? off.y : 0, off ? -off.x : -this.spec.cgAbove, off ? -off.z : 0);
    const cable = this.cable!;
    cable.visible = a.joint === 'tethered' && !!a.tether;
    if (cable.visible) {
      const pos = cable.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (const [k, e] of [a.tether!.sphere, a.tether!.module].entries()) {
        this.flow.set(e.x, e.y, e.z).applyQuaternion(this.qInv).add(this.cg);
        pos.setXYZ(k, this.flow.x, this.flow.y, this.flow.z);
      }
      pos.needsUpdate = true;
    }
    // the air the sphere moves through: its velocity less the turning atmosphere's (ω × r)
    const r = frame.r, v = frame.v;
    this.flow.set(v.x + OMEGA_EARTH * r.y, v.y - OMEGA_EARTH * r.x, v.z).applyQuaternion(this.qInv);
    const k = a.phase === 'landed' ? 0 : entryGlow(frame.altitude, frame.airspeed);
    this.glow!.set(k, this.flow);
    // on the ground: its shadow under it, and its main laid out on the steppe beside it. With no wind flown, where
    // the main lay is the drawing's: beyond the sphere and off to one side, seen from where the exterior camera
    // first looks (render/cameras.ts: from 0.9 rad north of east)
    const spent = this.spentMain!, shadow = this.shadow!;
    spent.visible = shadow.visible = a.phase === 'landed';
    if (spent.visible) {
      const r = frame.r, n = Math.hypot(r.x, r.y, r.z), h = Math.hypot(r.x, r.y);
      const az = 0.9 + Math.PI + 0.7;
      // the local east and north, in the scene's (ECI) axes, then the model's
      const ex = -r.y / h, ey = r.x / h;
      const nx = -r.z * ey / n, ny = r.z * ex / n, nz = (r.x * ey - r.y * ex) / n;
      const away = this.cg.set(ex * Math.cos(az) + nx * Math.sin(az), ey * Math.cos(az) + ny * Math.sin(az), nz * Math.sin(az))
        .applyQuaternion(this.qInv);
      const up = this.flow.set(r.x / n, r.y / n, r.z / n).applyQuaternion(this.qInv);
      shadow.position.set(0, -VOSTOK_R, 0).addScaledVector(up, 0.02 - VOSTOK_R);
      shadow.quaternion.setFromUnitVectors(Z_AXIS, up);
      spent.position.copy(shadow.position).addScaledVector(up, 0.01).addScaledVector(away, 9);
      // lying out along that bearing, its narrow end, where the lines gather, towards the sphere
      spent.quaternion.setFromRotationMatrix(this.lay.makeBasis(away, this.across.crossVectors(up, away), up));
    }
  }

  /** Length of what is flying, for the camera's framing, m: a parachute widens the view. */
  size(frame: VisualFrame): number {
    const a = frame.abort;
    if (!a) return 0;
    if (a.body === 'capsule') {
      // Vostok's sphere with its instrument module still on
      const joined = a.joint !== undefined ? a.joint !== 'free' : frame.t - a.t0 < (this.spec.retro?.jettison ?? 0);
      const pack = this.spec.id === 'vostok' && joined ? 2.6 : 0;
      return a.main > 0.2 ? 32 : a.drogue > 0.2 ? 16 : this.spec.length + 1 + pack;
    }
    if (a.body === 'spacecraft') return ESCAPE.serviceModule.length + ESCAPE.descentModule.length + 2.6;
    return ESCAPE.fairing.length + (a.mode === 'tower' ? ESCAPE.tower.length : 0);
  }

  dispose(): void {
    for (const m of this.materials) m.dispose();
    for (const g of this.geometries) g.dispose();
    for (const x of this.textures) x.dispose();
    this.drogue.dispose(); this.main.dispose(); this.pilotChute?.dispose();
    this.module?.dispose();
    this.glow?.dispose();
    this.retroPlume?.dispose();
    this.crewedTop.dispose();
    for (const plume of [...this.mainPlumes, ...this.fairingPlumes, this.controlPlume, this.softPlume]) plume.dispose();
  }
}
