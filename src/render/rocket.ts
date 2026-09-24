/**
 * Procedural launch vehicle built from the vehicle specification and driven
 * entirely by a `VisualFrame`.
 *
 * The stack is Y-up (+Y = nose) with the base of the first stage at y = 0, so
 * the engine bells hang below the origin and sit inside the launch mount. Paint
 * comes from `liveries.ts` (a canvas texture wrapped once around each stage),
 * engine bells are placed in the real pattern, and every plume, flash and
 * flicker is a function of the frame's mission time.
 */
import * as THREE from 'three';
import type { VehicleSpec, StageSpec, BoosterGroupSpec, SatelliteSpec } from '../types';
import type { BoosterFrame, StageFrame, VisualFrame } from '../physics/frame';
import { interstageHeight, stackLayout } from '../physics/frame';
import { buildSatellite, type SatelliteView } from './satellite';
import { Plume, type PlumeKind } from './plume';
import { AscentTrail } from './smoke';
import { bellGeometry, bodyTexture, boosterLivery, engineLayout, ogiveProfile, stageLivery, type EngineLayout, type NozzlePos } from './liveries';
import { clamp01, seedFromString, smoothstep } from './noise';
import { disposeObject } from './dispose';
import type { RigidTelemetry } from '../physics/rigid/telemetry';
import { buildShipFlaps, foldShipFlaps, SHIP_NOSE_FRACTION, tangentOgiveProfile, type FlapVisual } from './ship';

export interface RocketEnv {
  /** unit vector (scene axes) from the vehicle back down its flight path */
  backDir: THREE.Vector3;
  /** distance from the vehicle to the pad, m */
  padDistance: number;
  /** 0 = full day, 1 = night at the vehicle; scales the exhaust's own light */
  night: number;
}

/** Irradiance the exhaust puts on the stack a third of the way up, in daylight. */
const ENGINE_LIGHT_DAY = 0.3;
/** …and at night, where it is the only light the vehicle has. */
const ENGINE_LIGHT_NIGHT = 3.1;
const ENGINE_LIGHT_DECAY = 1.8;

interface BoosterUnit {
  group: THREE.Group;
  plume: Plume;
  vernier: Plume | null;
  glow: THREE.InstancedMesh;
  engines: EngineVisual;
}

interface BoosterSet {
  spec: BoosterGroupSpec;
  units: BoosterUnit[];
  /** cached position in `frame.boosters` (see `boosterFrame`) */
  frameIndex: number;
}

interface StagePart {
  spec: StageSpec;
  index: number;
  group: THREE.Group;
  plume: Plume;
  vernier: Plume | null;
  glow: THREE.InstancedMesh;
  engines: EngineVisual;
  flash: THREE.Mesh;
  /** stacking height including the interstage adapter, m */
  height: number;
  bellLength: number;
  /** engine-bell material, so the nozzle interior can glow with the throttle */
  bellMat: THREE.MeshStandardMaterial;
  /** cached position in `frame.stages` (see `stageFrame`) */
  frameIndex: number;
  boosters: BoosterSet[];
  /** Starship's flaps, folded on the recorded deflections */
  flaps: FlapVisual[];
}

interface EngineVisual {
  bells: THREE.InstancedMesh;
  glow: THREE.InstancedMesh;
  nozzles: NozzlePos[];
  ids: string[];
  rigidApplied: boolean;
}

/** Same chamber ordering as rigid/vehicle-data: mains followed by verniers. */
export function rigidNozzleIds(ownerId: string, shapeId: string, layout: EngineLayout): string[] {
  const soyuz = shapeId === 'blokA' || shapeId === 'blokI' || shapeId === 'blokBVGD';
  return [...layout.nozzles.map((_nozzle, i) => `${ownerId}.${soyuz ? 'main' : 'engine'}.${i}`),
    ...layout.verniers.map((_nozzle, i) => `${ownerId}.vernier.${i}`)];
}

const ENGINE_Y_AXIS = new THREE.Vector3(0, 1, 0);

const GLOW_GEO = new THREE.CircleGeometry(1, 12);
GLOW_GEO.rotateX(Math.PI / 2);
GLOW_GEO.userData.shared = true;

function plumeKindFor(engine: { solid?: boolean; ispVac: number }, vehicleId: string): PlumeKind {
  if (engine.solid) return 'solid';
  if (engine.ispVac > 400) return 'hydrogen';
  if (vehicleId === 'protonm' || vehicleId === 'angaraa5') return engine.ispVac < 340 ? 'hypergolic' : 'liquid';
  return 'liquid';
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

export class RocketView {
  readonly group = new THREE.Group();
  /** unrotated group that lives in scene space (holds the ascent smoke trail) */
  readonly worldGroup = new THREE.Group();
  readonly spec: VehicleSpec;
  readonly height: number;
  private stages: StagePart[] = [];
  private fairing: THREE.Group | null = null;
  private fairingLength = 0;
  private satellite: SatelliteView;
  private trail = new AscentTrail(140);
  private materials: THREE.Material[] = [];
  private textures: THREE.Texture[] = [];
  private matCache = new Map<string, THREE.MeshStandardMaterial>();
  /** a single warm light for the engines: keeping the light count constant
   *  avoids shader recompiles mid-flight */
  private engineLight = new THREE.PointLight(0xffa850, 0, 1, 1.8);
  private tmpMat = new THREE.Matrix4();
  private engineDirection = new THREE.Vector3();
  private enginePosition = new THREE.Vector3();
  private engineScale = new THREE.Vector3();
  private engineQuaternion = new THREE.Quaternion();
  private engineParentInverse = new THREE.Quaternion();

  constructor(spec: VehicleSpec, sat: SatelliteSpec) {
    this.spec = spec;
    this.worldGroup.add(this.trail.mesh);
    // One source of truth for the stacking geometry. `stackLayout` already
    // computes both the per-stage height and the diameter of whatever sits on
    // top of each stage; this view used to re-derive the "next non-spacecraft
    // stage, else the fairing, else nothing" rule itself, so the numbers that
    // place the drawn stack and the numbers that anchor the jettisoned
    // hardware (`DebrisFrame.anchor`) came from two copies of the same rule.
    const layout = stackLayout(spec);
    let total = 0;
    for (let i = 0; i < spec.stages.length; i++) {
      const st = spec.stages[i];
      if (st.isSpacecraft) continue;
      const part = this.buildStage(st, i, layout.topDiameter[i], layout.height[i]);
      this.group.add(part.group);
      this.stages.push(part);
      total += part.height;
    }
    if (spec.fairing) {
      this.fairing = this.buildFairing(spec);
      this.fairingLength = spec.fairing.length;
      this.group.add(this.fairing);
      total += spec.fairing.length;
    }
    this.satellite = buildSatellite(sat);
    this.group.add(this.satellite.group);
    this.group.add(this.engineLight);
    this.height = total;
  }

  private mat(color: string | number, metal = 0.1, rough = 0.6): THREE.MeshStandardMaterial {
    const key = `${color}|${metal}|${rough}`;
    let m = this.matCache.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), metalness: metal, roughness: rough });
      this.matCache.set(key, m);
      this.materials.push(m);
    }
    return m;
  }

  /** Instanced engine bells plus the matching additive nozzle-glow discs. */
  private engines(parent: THREE.Group, layout: EngineLayout, steel: boolean, ownerId: string, shapeId: string): { glow: THREE.InstancedMesh; bellLength: number; bellMat: THREE.MeshStandardMaterial; engines: EngineVisual } {
    const all = [...layout.nozzles, ...layout.verniers];
    const geo = bellGeometry(1, 1, 12);
    // metalness 0.85 with the sky/sun environment probe: a real bell is bare
    // Inconel or niobium and reads as metal, not as grey plastic
    const bellMat = new THREE.MeshStandardMaterial({ color: steel ? 0xa8aeb4 : 0x7d838a, metalness: 0.85, roughness: 0.36, side: THREE.DoubleSide, emissive: 0x000000 });
    this.materials.push(bellMat);
    const bells = new THREE.InstancedMesh(geo, bellMat, all.length);
    bells.castShadow = true;
    let maxLen = 0;
    for (let i = 0; i < all.length; i++) {
      const n = all[i];
      this.tmpMat.makeScale(n.r, n.len, n.r);
      this.tmpMat.setPosition(n.x, 0, n.z);
      bells.setMatrixAt(i, this.tmpMat);
      maxLen = Math.max(maxLen, n.len);
    }
    bells.instanceMatrix.needsUpdate = true;
    parent.add(bells);

    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.materials.push(glowMat);
    const glow = new THREE.InstancedMesh(GLOW_GEO, glowMat, all.length);
    for (let i = 0; i < all.length; i++) {
      const n = all[i];
      this.tmpMat.makeScale(n.r * 0.95, 1, n.r * 0.95);
      this.tmpMat.setPosition(n.x, -n.len * 0.98, n.z);
      glow.setMatrixAt(i, this.tmpMat);
    }
    glow.instanceMatrix.needsUpdate = true;
    glow.visible = false;
    parent.add(glow);
    return { glow, bellLength: maxLen, bellMat,
      engines: { bells, glow, nozzles: all, ids: rigidNozzleIds(ownerId, shapeId, layout), rigidApplied: false } };
  }

  /** Actual recorded chamber directions tilt existing instances at their mount.
   * A stopped chamber loses its own glow, including an off-axis engine failure.
   * Legacy frames never touch these matrices unless restoring a prior rigid view. */
  private updateEngineVisual(visual: EngineVisual, rigid: RigidTelemetry | undefined, parentRotation?: THREE.Quaternion): void {
    if (!rigid && !visual.rigidApplied) return;
    if (parentRotation) this.engineParentInverse.copy(parentRotation).invert();
    for (let i = 0; i < visual.nozzles.length; i++) {
      const nozzle = visual.nozzles[i], id = visual.ids[i];
      const direction = rigid?.engineDirectionsBody?.[id];
      if (direction) {
        // Inverse of render→body (y,-x,z); undo the booster ring's local yaw.
        this.engineDirection.set(-direction.y, direction.x, direction.z);
        if (parentRotation) this.engineDirection.applyQuaternion(this.engineParentInverse);
        this.engineDirection.normalize();
        this.engineQuaternion.setFromUnitVectors(ENGINE_Y_AXIS, this.engineDirection);
      } else this.engineQuaternion.identity();
      this.enginePosition.set(nozzle.x, 0, nozzle.z);
      this.engineScale.set(nozzle.r, nozzle.len, nozzle.r);
      this.tmpMat.compose(this.enginePosition, this.engineQuaternion, this.engineScale);
      visual.bells.setMatrixAt(i, this.tmpMat);
      this.enginePosition.set(0, -nozzle.len * 0.98, 0).applyQuaternion(this.engineQuaternion);
      this.enginePosition.x += nozzle.x;
      this.enginePosition.z += nozzle.z;
      const throttle = rigid?.engineThrottles?.[id];
      const glowScale = throttle === undefined ? 1 : Math.sqrt(Math.max(0, throttle));
      this.engineScale.set(nozzle.r * 0.95 * glowScale, glowScale, nozzle.r * 0.95 * glowScale);
      this.tmpMat.compose(this.enginePosition, this.engineQuaternion, this.engineScale);
      visual.glow.setMatrixAt(i, this.tmpMat);
    }
    visual.bells.instanceMatrix.needsUpdate = true;
    visual.glow.instanceMatrix.needsUpdate = true;
    visual.rigidApplied = !!rigid;
  }

  private buildStage(spec: StageSpec, index: number, topDiameter: number | null, stackHeight: number): StagePart {
    const g = new THREE.Group();
    const r = spec.diameter / 2;
    const liv = stageLivery(this.spec, spec);
    const seed = seedFromString(this.spec.id + spec.id);
    // A top stage flown without a fairing (Starship's ship) carries its payload
    // inside its own nose, so it has to close the stack itself.
    const noseH = !this.spec.fairing && index === this.spec.stages.length - 1 ? spec.length * SHIP_NOSE_FRACTION : 0;
    const barrel = spec.length - noseH;
    const tex = bodyTexture(liv, spec.diameter, barrel, seed);
    this.textures.push(tex);
    // `SceneManager` provides a small procedural sky/ground PMREM probe, so a
    // metallic surface now has something to reflect: bare stainless (Starship,
    // Atlas-family tanks) can run genuinely metallic. Painted stages stay
    // near-dielectric — a 0.12 metalness on white paint is already generous.
    const bodyMat = new THREE.MeshStandardMaterial({ map: tex, metalness: liv.steel ? 0.72 : 0.12, roughness: liv.steel ? 0.34 : 0.62 });
    this.materials.push(bodyMat);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, barrel, 40, 1), bodyMat);
    body.position.y = barrel / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    if (noseH > 0) {
      // Its own canvas: the lathe's v runs over the nose alone, and the
      // marking and bands belong to the barrel. `LatheGeometry` and
      // `CylinderGeometry` share u, so the heat shield continues onto it.
      const noseTex = bodyTexture({ ...liv, text: undefined, flag: undefined, bands: [], soot: false }, spec.diameter, noseH, seed + 0.5);
      this.textures.push(noseTex);
      const noseMat = new THREE.MeshStandardMaterial({ map: noseTex, metalness: bodyMat.metalness, roughness: bodyMat.roughness });
      this.materials.push(noseMat);
      const nose = new THREE.Mesh(new THREE.LatheGeometry(tangentOgiveProfile(r, barrel, noseH, 24), 40), noseMat);
      nose.castShadow = true;
      g.add(nose);
    }

    // The adapter's own height comes from the same `interstageHeight` that
    // produced `stackHeight` inside `stackLayout`, so the drawn cone and the
    // stacking arithmetic cannot disagree.
    const interH = interstageHeight(spec.diameter, topDiameter);
    if (interH > 0 && topDiameter !== null) {
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(topDiameter / 2, r, interH, 40, 1), this.mat(spec.accentColor ?? '#3a3d42', 0.3, 0.55));
      cone.position.y = spec.length + interH / 2;
      cone.castShadow = true;
      g.add(cone);
    } else if (topDiameter !== null) {
      // flush interstage band
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.004, r * 1.004, Math.min(2.5, spec.length * 0.06), 40, 1), this.mat(spec.accentColor ?? '#3a3d42', 0.3, 0.55));
      band.position.y = spec.length - Math.min(2.5, spec.length * 0.06) / 2;
      g.add(band);
    }

    const layout = engineLayout(spec.id, spec.engine, r, spec.nozzleLength);
    const { glow, bellLength, bellMat, engines } = this.engines(g, layout, !!liv.steel, spec.id, spec.id);

    if (spec.gridFins) this.addGridFins(g, r, spec.length);
    if (spec.legs) this.addLegs(g, r, spec.length);
    let flaps: FlapVisual[] = [];
    if (spec.flaps) {
      const built = buildShipFlaps(spec, noseH, this.mat('#24262a', 0.5, 0.55));
      g.add(built.group);
      flaps = built.flaps;
    }
    if (spec.fins) this.addFins(g, r);

    const kind = plumeKindFor(spec.engine, this.spec.id);
    const plume = new Plume({ radius: layout.clusterRadius, length: Math.max(8, layout.clusterRadius * 13), kind, seed });
    plume.group.position.y = -bellLength;
    g.add(plume.group);
    let vernier: Plume | null = null;
    if (layout.verniers.length) {
      const vr = layout.verniers[0].r;
      vernier = new Plume({ radius: Math.max(0.12, vr * 1.4), length: Math.max(2.5, vr * 16), kind: 'vernier', seed: seed + 0.37 });
      vernier.group.position.y = -layout.verniers[0].len;
      g.add(vernier.group);
    }

    const flashMat = new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.materials.push(flashMat);
    const flash = new THREE.Mesh(new THREE.SphereGeometry(Math.max(1, r), 12, 8), flashMat);
    flash.position.y = -bellLength * 0.6;
    flash.visible = false;
    g.add(flash);

    const boosters: StagePart['boosters'] = [];
    const groups = spec.boosters ?? [];
    for (let k = 0; k < groups.length; k++) {
      const b = groups[k];
      const units: BoosterUnit[] = [];
      const phase = groups.length > 1 ? (Math.PI / (b.count * groups.length)) * (2 * k + 1) : 0;
      // One paint job per booster *group*, shared by its units: baking a
      // 1024×W canvas per strap-on cost Atlas V 551 five near-identical
      // textures and PSLV-XL six, for no visible difference.
      const bodyMat = this.boosterMaterial(b, seed + k * 3.1);
      for (let u = 0; u < b.count; u++) {
        const unit = this.buildBooster(b, seed + k * 3.1 + u * 0.7, bodyMat, `${b.id}.${u}`);
        const ang = phase + (u / b.count) * Math.PI * 2;
        const off = r + b.diameter / 2;
        // B9: the local frame this group is drawn in has basis X = the physics
        // `side2` axis and basis Z = the physics `side` axis (main.ts builds it
        // as makeBasis(cross(dir, side), dir, side)), while
        // Simulation.spawnBoosterDebris lays the same ring out as
        // side·cos(ang) + side2·sin(ang). Mapping cos to X and sin to Z here
        // therefore reflects the ring instead of rotating it — an exact 90°
        // jump for the cardinal four-booster ring Soyuz uses, so the Korolev
        // cross appeared to teleport. Placing cos on Z and sin on X puts the
        // drawn booster exactly where its debris will spawn.
        const local = Math.PI / 2 - ang;
        unit.group.position.set(Math.cos(local) * off, b.baseOffset ?? 0, Math.sin(local) * off);
        unit.group.rotation.y = -local;
        g.add(unit.group);
        units.push(unit);
      }
      boosters.push({ spec: b, units, frameIndex: -1 });
    }

    return { spec, index, group: g, plume, vernier, glow, engines, flash, height: stackHeight, bellLength, bellMat, frameIndex: -1, boosters, flaps };
  }

  /**
   * Resolve this part's entry in `frame.stages`.
   *
   * `captureFrame` walks `sim.vehicle.stages` in construction order and emits
   * every stage whether it is attached or not, so a part's slot is fixed for
   * the whole mission. The index is cached and validated with a single string
   * compare; the linear scan only ever runs on the first frame. Doing this with
   * `Array.prototype.find` instead cost six fresh closures and six scans per
   * rendered frame, and the booster lookup ran once per booster *unit*.
   */
  private stageFrame(frame: VisualFrame, part: StagePart): StageFrame | undefined {
    const hit = frame.stages[part.frameIndex];
    if (hit !== undefined && hit.id === part.spec.id) return hit;
    part.frameIndex = frame.stages.findIndex((s) => s.id === part.spec.id);
    return part.frameIndex >= 0 ? frame.stages[part.frameIndex] : undefined;
  }

  /** As `stageFrame`, for one booster group of one stage. */
  private boosterFrame(frame: VisualFrame, part: StagePart, bg: BoosterSet): BoosterFrame | undefined {
    const hit = frame.boosters[bg.frameIndex];
    if (hit !== undefined && hit.id === bg.spec.id && hit.stageId === part.spec.id) return hit;
    bg.frameIndex = frame.boosters.findIndex((b) => b.id === bg.spec.id && b.stageId === part.spec.id);
    return bg.frameIndex >= 0 ? frame.boosters[bg.frameIndex] : undefined;
  }

  /** Body paint for one booster group, shared by every unit of the group. */
  private boosterMaterial(spec: BoosterGroupSpec, seed: number): THREE.MeshStandardMaterial {
    const tex = bodyTexture(boosterLivery(this.spec, spec), spec.diameter, spec.length, seed);
    this.textures.push(tex);
    const m = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.12, roughness: 0.6 });
    this.materials.push(m);
    return m;
  }

  private buildBooster(spec: BoosterGroupSpec, seed: number, m: THREE.MeshStandardMaterial, ownerId: string): BoosterUnit {
    const g = new THREE.Group();
    const r = spec.diameter / 2;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, spec.length, 28, 1), m);
    body.position.y = spec.length / 2;
    body.castShadow = true;
    g.add(body);
    if (spec.conicalTop) {
      // Soyuz strap-on: a long tapered nose that hugs the core
      const pts: THREE.Vector2[] = [];
      const noseH = spec.length * 0.42;
      for (let i = 0; i <= 12; i++) {
        const s = i / 12;
        // last point on the axis, so the conical top is closed rather than a tube
        pts.push(new THREE.Vector2(i === 12 ? 0 : Math.max(0.02, r * (1 - Math.pow(s, 1.35) * 0.97)), spec.length + s * noseH));
      }
      const nose = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), m);
      nose.castShadow = true;
      g.add(nose);
    } else {
      const topH = r * 1.9;
      const nose = new THREE.Mesh(new THREE.ConeGeometry(r, topH, 24), m);
      nose.position.y = spec.length + topH / 2;
      nose.castShadow = true;
      g.add(nose);
      if (spec.engine.solid) {
        const skirt = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.06, r * 1.06, r * 1.4, 24, 1, true), this.mat('#6d665c', 0.3, 0.7));
        skirt.position.y = r * 0.7;
        g.add(skirt);
      }
    }
    const layout = engineLayout(spec.id, spec.engine, r);
    const { glow, bellLength, engines } = this.engines(g, layout, false, ownerId, spec.id);
    const kind = plumeKindFor(spec.engine, this.spec.id);
    const plume = new Plume({ radius: layout.clusterRadius, length: Math.max(6, layout.clusterRadius * 13), kind, seed: seed + 0.11 });
    plume.group.position.y = -bellLength;
    g.add(plume.group);
    let vernier: Plume | null = null;
    if (layout.verniers.length) {
      const vr = layout.verniers[0].r;
      vernier = new Plume({ radius: Math.max(0.1, vr * 1.4), length: Math.max(2, vr * 15), kind: 'vernier', seed: seed + 0.53 });
      vernier.group.position.y = -layout.verniers[0].len;
      g.add(vernier.group);
    }
    return { group: g, plume, vernier, glow, engines };
  }

  private addGridFins(g: THREE.Group, r: number, len: number): void {
    const mat = new THREE.MeshStandardMaterial({ map: gridFinTexture(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5, color: 0x8b8d90 });
    this.materials.push(mat);
    const w = r * 0.95, h = r * 1.15;
    const geo = new THREE.PlaneGeometry(w, h);
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(geo, mat);
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      // stowed flat against the body
      fin.position.set(Math.cos(ang) * (r + 0.12), len - h * 0.75, Math.sin(ang) * (r + 0.12));
      fin.rotation.y = -ang + Math.PI / 2;
      g.add(fin);
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.5, h * 0.25, 0.5), this.mat('#303337', 0.5, 0.6));
      hinge.position.set(Math.cos(ang) * (r + 0.2), len - h * 0.12, Math.sin(ang) * (r + 0.2));
      g.add(hinge);
    }
  }

  private addLegs(g: THREE.Group, r: number, len: number): void {
    const mat = this.mat('#1d1f22', 0.4, 0.7);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      const legLen = len * 0.28;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.13, r * 0.09, legLen, 8), mat);
      leg.position.set(Math.cos(ang) * (r + r * 0.14), legLen / 2 + r * 0.3, Math.sin(ang) * (r + r * 0.14));
      leg.rotation.z = -Math.cos(ang) * 0.04;
      leg.rotation.x = Math.sin(ang) * 0.04;
      g.add(leg);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, r * 0.2, 8), mat);
      foot.position.set(Math.cos(ang) * (r + r * 0.14), r * 0.22, Math.sin(ang) * (r + r * 0.14));
      g.add(foot);
    }
  }

  private addFins(g: THREE.Group, r: number): void {
    const mat = this.mat('#3a3d42', 0.3, 0.6);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(r * 0.9, r * 1.6, 0.25), mat);
      fin.position.set(Math.cos(ang) * (r + r * 0.42), r * 1.0, Math.sin(ang) * (r + r * 0.42));
      fin.rotation.y = -ang;
      g.add(fin);
    }
  }

  private buildFairing(spec: VehicleSpec): THREE.Group {
    const g = new THREE.Group();
    const f = spec.fairing!;
    const r = f.diameter / 2;
    const liv = stageLivery(spec, { id: 'fairing', name: 'fairing', dryMass: 0, propellantMass: 0, engine: spec.stages[0].engine, diameter: f.diameter, length: f.length, color: f.color ?? '#eeeeee' });
    liv.base = f.color ?? '#eeeeee';
    liv.bands = [];
    liv.text = undefined;
    // The two half-shells are painted into the surface, not modelled.
    //
    // u = 0.25 and u = 0.75 are the +X and -X meridians (three parametrises both
    // `CylinderGeometry` and `LatheGeometry` as x = r·sin φ, z = r·cos φ with
    // u = φ/2π), which is exactly where `DebrisView` cuts the jettisoned halves:
    // it builds each one over φ ∈ [-π/2, +π/2], so the shells part on the z = 0
    // plane and their edges lie on ±X. The seam therefore ends up on the same
    // two meridians the halves separate along, and — because it is texture, not
    // geometry — it follows the ogive in to the apex instead of protruding
    // through it the way the old flat `BoxGeometry` split line did.
    liv.seams = [0.25, 0.75];
    const tex = bodyTexture(liv, f.diameter, f.length, seedFromString(spec.id + 'fairing'));
    this.textures.push(tex);
    const m = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.15, roughness: 0.5 });
    this.materials.push(m);
    const cylH = f.length * 0.52;
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, cylH, 40, 1), m);
    cyl.position.y = cylH / 2;
    cyl.castShadow = true;
    g.add(cyl);
    const noseH = f.length - cylH;
    const nose = new THREE.Mesh(new THREE.LatheGeometry(ogiveProfile(r, cylH, noseH, 24), 40), m);
    nose.castShadow = true;
    g.add(nose);
    return g;
  }

  /** Lay out the attached parts and animate everything from the frame. */
  update(frame: VisualFrame, env: RocketEnv): void {
    if (frame.destroyed) {
      this.group.visible = false;
      this.trail.mesh.visible = false;
      return;
    }
    this.group.visible = true;
    const t = frame.t;
    const pressure = frame.pressure;
    let y = 0;
    let top = 0;
    for (const part of this.stages) {
      const sf = this.stageFrame(frame, part);
      const attached = !!sf && sf.attached;
      part.group.visible = attached;
      if (!attached || !sf) continue;
      this.updateEngineVisual(part.engines, frame.rigid);
      if (part.flaps.length) foldShipFlaps(part.flaps, frame.rigid);
      part.group.position.y = y;
      const burning = sf.burning;
      // The *effective* core throttle, not the guidance command: Angara's core
      // is clamped to 30 % while the strap-ons burn, and a 100 % plume hanging
      // off a 30 % engine is exactly the mismatch the reviewer flagged. Frames
      // recorded before the field existed fall back to the command.
      const cmd = sf.effectiveThrottle ?? frame.throttle;
      const thr = burning ? Math.max(0.05, cmd) * (sf.engineFraction ?? 1) : 0;
      part.plume.update(thr, pressure, t);
      part.vernier?.update(burning ? Math.min(1, thr + 0.25) : 0, pressure, t);
      part.glow.visible = thr > 0.02;
      (part.glow.material as THREE.MeshBasicMaterial).opacity = thr > 0.02 ? 0.55 + 0.2 * Math.sin(t * 29 + part.index) : 0;
      // hot nozzle: the bell interior brightens with the throttle
      part.bellMat.emissive.setRGB(0.28 * thr, 0.085 * thr, 0.022 * thr);
      // Brief ignition flash. `ignitionTime` is only meaningful once the stage
      // has actually lit — an unlit stage reports 0, which at T+0 would flash
      // the second stage and the spacecraft along with the core.
      const age = sf.ignited ? t - (sf.ignitionTime ?? 0) : 1e9;
      if (age >= 0 && age < 0.75) {
        part.flash.visible = true;
        const k = age / 0.75;
        part.flash.scale.setScalar(1 + k * 4.5);
        (part.flash.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.85;
      } else {
        part.flash.visible = false;
      }
      for (const bg of part.boosters) {
        // one lookup per booster *group*: it does not depend on the unit index
        const bf = this.boosterFrame(frame, part, bg);
        const on = !!bf && bf.attached;
        for (let u = 0; u < bg.units.length; u++) {
          const unit = bg.units[u];
          unit.group.visible = on;
          if (!on || !bf) continue;
          this.updateEngineVisual(unit.engines, frame.rigid, unit.group.quaternion);
          const bthr = bf.burning ? (bg.spec.engine.solid ? 1 : Math.max(0.05, bf.effectiveThrottle ?? frame.throttle)) : 0;
          unit.plume.update(bthr, pressure, t + u * 0.13);
          unit.vernier?.update(bf.burning ? Math.min(1, bthr + 0.25) : 0, pressure, t + u * 0.13);
          unit.glow.visible = bthr > 0.02;
          (unit.glow.material as THREE.MeshBasicMaterial).opacity = bthr > 0.02 ? 0.6 : 0;
        }
      }
      y += part.height;
      top = y;
    }
    // one warm light at the nozzles of whichever stage is burning
    let lit = 0;
    let litY = 0;
    let litLen = 0;
    let yy = 0;
    for (const part of this.stages) {
      const sf = this.stageFrame(frame, part);
      if (!sf || !sf.attached) continue;
      if (part.plume.length > litLen) { litLen = part.plume.length; litY = yy - part.bellLength; lit = 1; }
      for (const bg of part.boosters) for (const u of bg.units) if (u.plume.length > litLen) { litLen = u.plume.length; litY = yy - part.bellLength; lit = 1; }
      yy += part.height;
    }
    if (lit > 0 && litLen > 0) {
      this.engineLight.position.set(0, litY - litLen * 0.25, 0);
      // Sized against a stated irradiance at a stated distance, instead of a
      // bare "55".
      //
      // A point light in three is in candela: the contribution at distance d is
      // `intensity / d^decay`, so 55 at decay 1.8 put 0.07 on a stage 40 m up —
      // against a sun of 3.3. That is why a night launch showed nothing but the
      // plume: under 4 150 kN of exhaust the vehicle itself was unlit. The
      // reference point is a third of the way up the stack, and the target
      // there runs from a warm hint in daylight to the dominant light source at
      // night, which is what the exhaust really is once the sun is down.
      const ref = Math.max(10, this.height * 0.33);
      const target = ENGINE_LIGHT_DAY + (ENGINE_LIGHT_NIGHT - ENGINE_LIGHT_DAY) * clamp01(env.night);
      this.engineLight.intensity = target * Math.pow(ref, ENGINE_LIGHT_DECAY)
        * Math.max(0.2, frame.throttle) * (0.92 + 0.08 * Math.sin(t * 26));
      // The cutoff window has to clear the whole stack, or three's own
      // `pow2(1 - pow4(d/distance))` term dims the nose to nothing.
      this.engineLight.distance = Math.max(this.height * 2.6, litLen * 3.5);
    } else {
      this.engineLight.intensity = 0;
    }
    if (this.fairing) {
      this.fairing.visible = frame.fairingAttached;
      this.fairing.position.y = top;
    }
    // payload
    const satG = this.satellite.group;
    const sepT = frame.payloadSepT ?? -1;
    if (frame.payloadSeparated) {
      // The spacecraft is now the tracked object, so its base sits on the
      // origin; the stage it came off is drawn *below* the origin
      // (DebrisFrame.anchor), so the two abut at the separation plane and then
      // drift apart instead of occupying the same 15 m of space.
      satG.position.y = this.satellite.height / 2;
      const p = sepT >= 0 ? clamp01((t - sepT) / 14) : 1;
      this.satellite.setDeploy(p);
      satG.visible = true;
    } else {
      satG.position.y = top + this.satellite.height / 2 + 0.5;
      this.satellite.setDeploy(0);
      satG.visible = !this.spec.fairing ? false : !frame.fairingAttached;
    }

    // ascent smoke trail: a column stretching back towards the pad
    const denseAir = 1 - smoothstep(9e3, 34e3, frame.altitude);
    const burningNow = frame.thrust > 0 && frame.liftoff;
    const trailOpacity = burningNow ? denseAir * 0.55 * smoothstep(40, 500, frame.altitudeAGL) : 0;
    if (trailOpacity > 0.01) {
      const len = Math.min(env.padDistance, 5200);
      this.trail.update(t, env.backDir, len, Math.max(6, this.currentRadius(frame) * 3.4), trailOpacity);
    } else {
      this.trail.update(t, env.backDir, 1, 1, 0);
    }
  }

  /** Approximate current stack height (for camera framing), m. */
  currentHeight(frame: VisualFrame): number {
    let h = 0;
    for (const part of this.stages) {
      const sf = this.stageFrame(frame, part);
      if (sf && sf.attached) h += part.height;
    }
    if (frame.fairingAttached) h += this.fairingLength;
    else h += this.satellite.height;
    return Math.max(3, h);
  }

  /** Radius of the widest attached component, m. */
  currentRadius(frame: VisualFrame): number {
    let r = 1;
    for (const part of this.stages) {
      const sf = this.stageFrame(frame, part);
      if (!sf || !sf.attached) continue;
      r = Math.max(r, part.spec.diameter / 2);
      for (const bg of part.boosters) {
        const bf = this.boosterFrame(frame, part, bg);
        if (bf && bf.attached) r = Math.max(r, part.spec.diameter / 2 + bg.spec.diameter);
      }
    }
    if (frame.fairingAttached && this.spec.fairing) r = Math.max(r, this.spec.fairing.diameter / 2);
    return r;
  }

  dispose(): void {
    for (const p of this.stages) {
      p.plume.dispose();
      p.vernier?.dispose();
      for (const bg of p.boosters) for (const u of bg.units) { u.plume.dispose(); u.vernier?.dispose(); }
    }
    this.trail.dispose();
    for (const t of this.textures) t.dispose();
    for (const m of this.materials) m.dispose();
    disposeObject(this.group);
    disposeObject(this.worldGroup);
    this.stages = [];
  }
}
