/**
 * Jettisoned hardware: spent stages, strap-on boosters and fairing halves.
 *
 * Driven from `frame.debris`. Fairing halves hinge open about the nose over the
 * first few seconds and then drift; stages and boosters tumble at a rate hashed
 * from their id (never `Math.random`), and recovery burns get a real plume.
 *
 * Everything is built around `DebrisFrame.anchor`, the offset from the object's
 * physics position to the base of its drawn body. The simulation gives every
 * piece the position of the vehicle it came off, and the renderer puts the base
 * of the lowest still-attached stage at that same point, so drawing a spent
 * stage base-first would place it exactly inside the stack that has just
 * separated from it. The anchor restores the real stacking geometry: a spent
 * stage hangs below the separation plane, fairing halves sit at the top of the
 * stack, and strap-ons — whose bases really were level with the core's — are
 * left where they are.
 */
import * as THREE from 'three';
import type { DebrisFrame } from '../physics/frame';
import type { SceneManager } from './scene';
import { Plume } from './plume';
import { ogiveProfile } from './liveries';
import { clamp01, hash11, smoothstep } from './noise';
import { disposeObject } from './dispose';

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const MODEL_TO_BODY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);

interface DebrisItem {
  group: THREE.Group;
  rigidGeometry: boolean;
  /** hinge pivot for a fairing half */
  hinge: THREE.Group | null;
  side: 1 | -1;
  plume: Plume | null;
  bodyMat: THREE.MeshStandardMaterial;
  createdAt: number;
  tumbleAxis: THREE.Vector3;
  tumbleRate: number;
  /** grid-fin pivots, stowed flat until the entry burn */
  fins: THREE.Group[];
  /** landing-leg pivots, folded until the landing burn */
  legs: THREE.Group[];
  /** mission time the fins / legs started deploying (-1 = still stowed) */
  finT: number;
  legT: number;
}

/** Grid-fin texture: an open lattice so the fin reads as a grid, not a plate. */
let gridTex: THREE.Texture | null = null;
function gridFinTexture(): THREE.Texture {
  if (gridTex) return gridTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 64, 64);
  g.strokeStyle = '#2b2b2e';
  g.lineWidth = 6;
  for (let i = 0; i <= 5; i++) {
    const p = (i / 5) * 64;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 64); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(64, p); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.shared = true;
  gridTex = t;
  return t;
}

export class DebrisView {
  private items = new Map<number, DebrisItem>();
  private scene: SceneManager;
  private tmp = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private qt = new THREE.Quaternion();
  private dir = new THREE.Vector3();

  /**
   * A never-drawn mesh carrying exactly the material configuration `build`
   * uses. Debris only exists from the first separation onwards, so without it
   * the standard-material variant for unmapped, non-shadowing geometry is
   * compiled on the staging frame itself — measured at 13 ms, i.e. a dropped
   * frame at the most dramatic moment of the flight. `renderer.compile` walks
   * the scene with `traverse`, not `traverseVisible`, so an invisible mesh is
   * enough to get the program built during `SceneManager.prewarm`.
   */
  private readonly warmup: THREE.Mesh;

  constructor(scene: SceneManager) {
    this.scene = scene;
    this.warmup = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x808080, metalness: 0.3, roughness: 0.55, side: THREE.DoubleSide }),
    );
    this.warmup.visible = false;
    this.warmup.frustumCulled = false;
    scene.scene.add(this.warmup);
  }

  /**
   * Grid fins and landing legs on a recoverable first stage.
   *
   * They used to vanish at separation, because the descent was drawn as a bare
   * capped cylinder: the landing burn — the one part of the flight the whole
   * recovery model exists for — showed a featureless tube. The pivots are
   * returned so `update` can hinge them on the recovery phase: fins stowed flat
   * against the body until entry, legs folded until the landing burn.
   */
  private recoveryHardware(g: THREE.Group, r: number, L: number, base: number, m: THREE.Material): { fins: THREE.Group[]; legs: THREE.Group[] } {
    const fins: THREE.Group[] = [];
    const legs: THREE.Group[] = [];
    const finMat = new THREE.MeshStandardMaterial({
      map: gridFinTexture(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide,
      metalness: 0.65, roughness: 0.5, color: 0x8b8d90,
    });
    const w = r * 0.95, h = r * 1.15;
    const finGeo = new THREE.PlaneGeometry(w, h);
    // Two nested pivots per hinge, never two Euler angles on one: three applies
    // an 'XYZ' Euler as Rx·Ry·Rz, so a tilt set alongside the azimuth would be
    // taken in the parent frame and the fin would swing sideways.
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const az = new THREE.Group();
      az.position.set(Math.cos(ang) * (r + 0.1), base + L - h * 0.3, Math.sin(ang) * (r + 0.1));
      az.rotation.y = -ang + Math.PI / 2;      // local +Z now points radially out
      const pivot = new THREE.Group();
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.y = -h * 0.5;               // the panel hangs below its hinge
      pivot.add(fin);
      az.add(pivot);
      g.add(az);
      fins.push(pivot);
    }
    const legLen = L * 0.3;
    const legGeo = new THREE.CylinderGeometry(r * 0.09, r * 0.14, legLen, 8);
    const footGeo = new THREE.CylinderGeometry(r * 0.2, r * 0.2, r * 0.14, 8);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      const az = new THREE.Group();
      az.position.set(Math.cos(ang) * r * 0.98, base + L * 0.03, Math.sin(ang) * r * 0.98);
      az.rotation.y = -ang;                    // local +X now points radially out
      const pivot = new THREE.Group();
      // stowed the leg lies along the body pointing at the nose, which is where
      // a Falcon leg sits for the whole ascent
      const leg = new THREE.Mesh(legGeo, m);
      leg.position.y = legLen / 2;
      pivot.add(leg);
      const foot = new THREE.Mesh(footGeo, m);
      foot.position.y = legLen;
      pivot.add(foot);
      az.add(pivot);
      g.add(az);
      legs.push(pivot);
    }
    return { fins, legs };
  }

  private build(d: DebrisFrame): DebrisItem {
    const g = new THREE.Group();
    const r = d.visual.diameter / 2;
    const L = d.visual.length;
    // base of the drawn body in the object's own frame (+Y = the thrust axis)
    const base = d.rigid ? 0 : d.anchor ?? 0;
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(d.visual.color), metalness: 0.3, roughness: 0.55, side: THREE.DoubleSide,
      emissive: new THREE.Color(0xdce6ff), emissiveIntensity: 0 });
    const side: 1 | -1 = d.id % 2 === 0 ? 1 : -1;
    let hinge: THREE.Group | null = null;
    let plume: Plume | null = null;
    let fins: THREE.Group[] = [];
    let legs: THREE.Group[] = [];
    if (d.visual.kind === 'fairing') {
      // one half shell: hinge sits at the nose so it can swing open
      hinge = new THREE.Group();
      hinge.position.y = base + L;
      const shell = new THREE.Group();
      shell.position.y = -L;
      const cylH = L * 0.55;
      const half = new THREE.Mesh(new THREE.CylinderGeometry(r, r, cylH, 24, 1, true, -Math.PI / 2, Math.PI), m);
      half.position.y = cylH / 2;
      shell.add(half);
      shell.add(new THREE.Mesh(new THREE.LatheGeometry(ogiveProfile(r, cylH, L - cylH, 20), 24, -Math.PI / 2, Math.PI), m));
      hinge.add(shell);
      g.add(hinge);
    } else {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 24), m);
      body.position.y = base + L / 2;
      g.add(body);
      if (d.visual.conicalTop) {
        const pts: THREE.Vector2[] = [];
        for (let i = 0; i <= 12; i++) {
          const s = i / 12;
          pts.push(new THREE.Vector2(i === 12 ? 0 : Math.max(0.02, r * (1 - Math.pow(s, 1.35) * 0.97)), base + L + s * L * 0.42));
        }
        g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 20), m));
      } else {
        const skirt = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.9, r * 1.2, 20, 1, true), m);
        skirt.position.y = base - r * 0.6;
        g.add(skirt);
      }
      if (d.recovery) ({ fins, legs } = this.recoveryHardware(g, r, L, base, m));
      plume = new Plume({ radius: r * 0.75, length: Math.max(8, r * 11), kind: 'liquid', seed: hash11(d.id * 3.7) });
      plume.group.position.y = base - r * 1.2;
      g.add(plume.group);
    }
    const ax = this.randAxis(d.id);
    return {
      group: g, rigidGeometry: !!d.rigid, hinge, side, plume, bodyMat: m, createdAt: d.createdAt,
      tumbleAxis: ax,
      tumbleRate: (hash11(d.id * 9.1 + 4.4) - 0.5) * (d.visual.kind === 'fairing' ? 0.9 : 0.55),
      fins, legs, finT: -1, legT: -1,
    };
  }

  private randAxis(id: number): THREE.Vector3 {
    const u = hash11(id * 5.3) * 2 - 1;
    const ph = hash11(id * 2.7 + 1.9) * Math.PI * 2;
    const rr = Math.sqrt(Math.max(0, 1 - u * u));
    return new THREE.Vector3(rr * Math.cos(ph), u, rr * Math.sin(ph)).normalize();
  }

  /**
   * @param list debris entries from the frame
   * @param t mission time, s
   * @param pressure fallback ambient pressure, Pa, for frames recorded before
   *        `DebrisFrame.pressure` existed
   */
  update(list: DebrisFrame[], t: number, pressure = 0): void {
    const seen = new Set<number>();
    for (const d of list) {
      if (!d.alive) continue;
      seen.add(d.id);
      let item = this.items.get(d.id);
      if (item && item.rigidGeometry !== !!d.rigid) {
        this.scene.scene.remove(item.group);
        item.plume?.dispose();
        disposeObject(item.group);
        this.items.delete(d.id);
        item = undefined;
      }
      if (!item) {
        item = this.build(d);
        this.scene.scene.add(item.group);
        this.items.set(d.id, item);
      }
      this.scene.toScene(d.r, this.tmp);
      item.group.position.copy(this.tmp);
      this.dir.set(d.dir.x, d.dir.y, d.dir.z).normalize();
      this.q.setFromUnitVectors(Y_AXIS, this.dir);
      const age = Math.max(0, t - item.createdAt);
      if (d.rigid) {
        const attitude = d.rigid.attitudeQ;
        this.q.set(attitude.x, attitude.y, attitude.z, attitude.w);
        item.group.quaternion.copy(this.q).multiply(MODEL_TO_BODY);
        const offset = d.rigid.renderOffsetBody;
        this.tmp.set(offset.x, offset.y, offset.z).applyQuaternion(this.q);
        item.group.position.add(this.tmp);
        if (item.hinge) item.hinge.rotation.z = 0;
      } else if (item.hinge) {
        // swing open over the first 4 s, then let the half drift and rotate
        const open = smoothstep(0, 4, age);
        item.hinge.rotation.z = item.side * open * 1.35;
        const spin = Math.max(0, age - 3) * item.tumbleRate;
        this.qt.setFromAxisAngle(item.tumbleAxis, spin);
        item.group.quaternion.copy(this.q).multiply(this.qt);
      } else if (d.burning) {
        // an engine is firing: hold attitude along the thrust axis
        item.group.quaternion.copy(this.q);
      } else {
        const spin = age * item.tumbleRate;
        this.qt.setFromAxisAngle(item.tumbleAxis, spin);
        item.group.quaternion.copy(this.q).multiply(this.qt);
      }
      if (item.fins.length || item.legs.length) this.updateRecovery(item, d, t);
      // the landing burn of a booster at 2 km must not draw the vacuum-expanded
      // plume of a second stage at 200 km: use this object's own air pressure
      if (item.plume) item.plume.update(d.burning ? 1 : 0, d.pressure ?? pressure, t);
      // Freshly separated hardware still catches direct sun even where the sky around it
      // has gone dark (the same reason a booster in real separation footage reads as a
      // bright streak): without it a plain-lit grey cylinder is nearly invisible against
      // the night scene, and the Korolev-cross splay the physics already flies is unreadable.
      const glow = age < 1.2 ? smoothstep(0, 0.4, age) : Math.max(0, 1 - smoothstep(1.2, 9, age));
      item.bodyMat.emissiveIntensity = glow * 1.3;
    }
    for (const [id, item] of this.items) {
      if (!seen.has(id)) {
        this.scene.scene.remove(item.group);
        item.plume?.dispose();
        disposeObject(item.group);
        this.items.delete(id);
      }
    }
  }

  /**
   * Deploy the recovery hardware on the phase the simulation is actually in.
   * Real grid fins lie flat against the interstage all the way up and only
   * swing out once there is air to bite on; the legs stay folded until the
   * landing burn is running.
   */
  private updateRecovery(item: DebrisItem, d: DebrisFrame, t: number): void {
    const phase = d.recovery?.phase ?? 'coast';
    const finsWanted = phase === 'entry' || phase === 'landing';
    const legsWanted = phase === 'landing' || !!d.recovery?.landed;
    // The deployment is a function of *mission* time, not of wall-clock frames,
    // so it runs at the same rate at 1× and at 1000× warp and a replay
    // reproduces it exactly. The start time is latched on the frame the phase
    // first appears and cleared if the phase goes away, so a backward seek
    // re-stows the hardware instead of leaving it half open.
    if (finsWanted) { if (item.finT < 0) item.finT = t; } else item.finT = -1;
    if (legsWanted) { if (item.legT < 0) item.legT = t; } else item.legT = -1;
    const finOut = item.finT >= 0 ? clamp01(smoothstep(0, 2.5, t - item.finT)) : 0;
    const legOut = item.legT >= 0 ? clamp01(smoothstep(0, 4, t - item.legT)) : 0;
    for (const f of item.fins) f.rotation.x = -finOut * 1.45;
    for (const l of item.legs) l.rotation.z = -legOut * 2.15;
  }

  clear(): void {
    for (const item of this.items.values()) {
      this.scene.scene.remove(item.group);
      item.plume?.dispose();
      disposeObject(item.group);
    }
    this.items.clear();
  }
}
