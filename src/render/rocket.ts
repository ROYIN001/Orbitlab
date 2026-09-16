/**
 * Procedural stylised rocket built from the vehicle specification, with
 * exhaust plumes and the payload. The rocket group is Y-up: +Y = nose.
 */
import * as THREE from 'three';
import type { VehicleSpec, StageSpec, BoosterGroupSpec, SatelliteSpec } from '../types';
import type { VehicleModel } from '../physics/vehicle';
import { buildSatellite, type SatelliteView } from './satellite';
import { P0 } from '../physics/constants';

interface StagePart {
  spec: StageSpec;
  group: THREE.Group;
  plume: PlumeView;
  height: number;
}
interface BoosterPart {
  spec: BoosterGroupSpec;
  groups: THREE.Group[];
  plumes: PlumeView[];
  stageId: string;
}
interface PlumeView {
  group: THREE.Group;
  outer: THREE.Mesh;
  inner: THREE.Mesh;
  light: THREE.PointLight;
  nozzleR: number;
  baseLength: number;
}

const matCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, metal = 0.08, rough = 0.6): THREE.MeshStandardMaterial {
  const key = `${color}|${metal}|${rough}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), metalness: metal, roughness: rough });
    matCache.set(key, m);
  }
  return m;
}
const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x555a60, metalness: 0.8, roughness: 0.4 });

function makePlume(nozzleR: number, count: number): PlumeView {
  const group = new THREE.Group();
  const r = nozzleR * Math.min(2.2, Math.sqrt(count));
  const baseLength = Math.max(6, r * 14);
  const outerGeo = new THREE.CylinderGeometry(r * 0.55, r * 1.6, 1, 20, 1, true);
  const innerGeo = new THREE.CylinderGeometry(r * 0.35, r * 0.7, 1, 16, 1, true);
  const outerMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const innerMat = new THREE.MeshBasicMaterial({ color: 0xfff1c0, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const outer = new THREE.Mesh(outerGeo, outerMat);
  const inner = new THREE.Mesh(innerGeo, innerMat);
  outer.rotation.x = Math.PI; // cone opens downward (-Y)
  inner.rotation.x = Math.PI;
  group.add(outer, inner);
  const light = new THREE.PointLight(0xffa040, 0, 400, 1.5);
  light.position.y = -2;
  group.add(light);
  group.visible = false;
  return { group, outer, inner, light, nozzleR: r, baseLength };
}

function updatePlume(p: PlumeView, throttle: number, pressure: number, dt: number): void {
  if (throttle <= 0.01) {
    p.group.visible = false;
    p.light.intensity = 0;
    return;
  }
  p.group.visible = true;
  const vac = 1 - Math.min(1, pressure / P0);
  const expansion = 1 + 1.3 * vac;
  const flicker = 0.9 + 0.2 * Math.random();
  const L = p.baseLength * throttle * (0.7 + 1.6 * vac) * flicker;
  (p.outer.material as THREE.MeshBasicMaterial).opacity = 0.55 - 0.3 * vac;
  p.outer.scale.set(expansion, L, expansion);
  p.outer.position.y = -L / 2;
  const Li = L * 0.55;
  p.inner.scale.set(1 + 0.3 * (expansion - 1), Li, 1 + 0.3 * (expansion - 1));
  p.inner.position.y = -Li / 2;
  p.light.intensity = 6 * throttle * p.nozzleR * flicker;
  p.light.distance = 60 + 40 * p.nozzleR;
  void dt;
}

function stageBody(spec: StageSpec, topDiameter: number | null): THREE.Group {
  const g = new THREE.Group();
  const r = spec.diameter / 2;
  const steel = spec.id.includes('ship') || spec.id.includes('superheavy');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, spec.length, 32), mat(spec.color ?? '#dddddd', steel ? 0.85 : 0.08, steel ? 0.35 : 0.6));
  body.position.y = spec.length / 2;
  g.add(body);
  // accent band at the top
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.005, r * 1.005, Math.min(3, spec.length * 0.08), 32), mat(spec.accentColor ?? '#333333', 0.1, 0.5));
  band.position.y = spec.length - Math.min(3, spec.length * 0.08) / 2;
  g.add(band);
  // interstage adapter if the next component is narrower/wider
  if (topDiameter !== null && Math.abs(topDiameter - spec.diameter) > 0.05) {
    const h = Math.abs(topDiameter - spec.diameter) * 1.2 + 0.5;
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(topDiameter / 2, r, h, 32), mat(spec.color ?? '#dddddd'));
    cone.position.y = spec.length + h / 2;
    g.add(cone);
  }
  // engines
  const e = spec.engine;
  const n = Math.min(e.count, 9);
  const nozzleR = Math.min(r * 0.85, Math.max(0.25, (r * 1.6) / Math.sqrt(Math.max(1, n)) * 0.5));
  const nozzleL = spec.nozzleLength ?? Math.max(0.8, nozzleR * 2.2);
  const ring = n > 1 ? r - nozzleR * 1.1 : 0;
  for (let i = 0; i < n; i++) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(nozzleR, nozzleR * 0.45, nozzleL, 16, 1, true), nozzleMat);
    const ang = (i / Math.max(1, n - (n > 4 ? 1 : 0))) * Math.PI * 2;
    if (n > 4 && i === n - 1) nozzle.position.set(0, -nozzleL / 2, 0);
    else if (n === 1) nozzle.position.set(0, -nozzleL / 2, 0);
    else nozzle.position.set(Math.cos(ang) * ring * 0.85, -nozzleL / 2, Math.sin(ang) * ring * 0.85);
    nozzle.rotation.x = Math.PI;
    g.add(nozzle);
  }
  if (spec.gridFins) {
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(r * 0.9, 0.15, r * 0.5), mat('#2a2a2a', 0.5, 0.6));
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      fin.position.set(Math.cos(ang) * (r + r * 0.4), spec.length - 2, Math.sin(ang) * (r + r * 0.4));
      fin.rotation.y = -ang;
      g.add(fin);
    }
  }
  if (spec.legs) {
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, spec.length * 0.35, 0.9), mat('#1a1a1a', 0.4, 0.7));
      const ang = (i / 4) * Math.PI * 2;
      leg.position.set(Math.cos(ang) * (r + 0.35), spec.length * 0.18, Math.sin(ang) * (r + 0.35));
      leg.rotation.y = -ang;
      g.add(leg);
    }
  }
  if (spec.flaps) {
    for (let i = 0; i < 4; i++) {
      const big = i < 2;
      const flap = new THREE.Mesh(new THREE.BoxGeometry(r * (big ? 0.9 : 0.6), big ? 12 : 8, 0.3), mat('#1c1c1c', 0.5, 0.6));
      const ang = i < 2 ? (i ? Math.PI : 0) : (i === 2 ? Math.PI / 2 : -Math.PI / 2);
      flap.position.set(Math.cos(ang) * (r + r * 0.35), big ? spec.length * 0.12 : spec.length * 0.85, Math.sin(ang) * (r + r * 0.35));
      flap.rotation.y = -ang;
      g.add(flap);
    }
  }
  return g;
}

function boosterBody(spec: BoosterGroupSpec): THREE.Group {
  const g = new THREE.Group();
  const r = spec.diameter / 2;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, spec.length, 24), mat(spec.color ?? '#dddddd'));
  body.position.y = spec.length / 2;
  g.add(body);
  const topH = spec.conicalTop ? spec.length * 0.35 : r * 1.6;
  const top = new THREE.Mesh(new THREE.ConeGeometry(r, topH, 24), mat(spec.color ?? '#dddddd'));
  top.position.y = spec.length + topH / 2;
  g.add(top);
  const n = Math.min(spec.engine.count, 4);
  const nozzleR = Math.max(0.2, (r * 0.9) / Math.sqrt(n));
  for (let i = 0; i < n; i++) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(nozzleR, nozzleR * 0.45, nozzleR * 2, 12, 1, true), nozzleMat);
    const ang = (i / n) * Math.PI * 2;
    nozzle.position.set(n > 1 ? Math.cos(ang) * r * 0.45 : 0, -nozzleR, n > 1 ? Math.sin(ang) * r * 0.45 : 0);
    nozzle.rotation.x = Math.PI;
    g.add(nozzle);
  }
  return g;
}

function fairingBody(spec: VehicleSpec): THREE.Group {
  const g = new THREE.Group();
  const f = spec.fairing!;
  const r = f.diameter / 2;
  const cylH = f.length * 0.55;
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, cylH, 32), mat(f.color ?? '#eeeeee', 0.2, 0.5));
  cyl.position.y = cylH / 2;
  g.add(cyl);
  // ogive nose via lathe
  const pts: THREE.Vector2[] = [];
  const noseH = f.length - cylH;
  for (let i = 0; i <= 12; i++) {
    const s = i / 12;
    pts.push(new THREE.Vector2(r * Math.sqrt(1 - s * s * 0.97), cylH + s * noseH));
  }
  const nose = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), mat(f.color ?? '#eeeeee', 0.2, 0.5));
  g.add(nose);
  return g;
}

export class RocketView {
  readonly group = new THREE.Group();
  private stages: StagePart[] = [];
  private boosters: BoosterPart[] = [];
  private fairing: THREE.Group | null = null;
  private fairingLength = 0;
  private satellite: SatelliteView;
  private deployProgress = 0;
  readonly spec: VehicleSpec;
  /** total height of the stack when fully assembled */
  readonly height: number;

  constructor(spec: VehicleSpec, sat: SatelliteSpec) {
    this.spec = spec;
    let y = 0;
    for (let i = 0; i < spec.stages.length; i++) {
      const st = spec.stages[i];
      const next = spec.stages[i + 1];
      const topD = next ? next.diameter : spec.fairing ? spec.fairing.diameter : null;
      const g = stageBody(st, topD);
      const plume = makePlume(Math.min(st.diameter / 2 * 0.85, Math.max(0.25, (st.diameter / 2 * 1.6) / Math.sqrt(Math.max(1, Math.min(st.engine.count, 9))) * 0.5)), st.engine.count);
      g.add(plume.group);
      this.group.add(g);
      this.stages.push({ spec: st, group: g, plume, height: st.length + (topD !== null && Math.abs(topD - st.diameter) > 0.05 ? Math.abs(topD - st.diameter) * 1.2 + 0.5 : 0) });
      for (const b of st.boosters ?? []) {
        const groups: THREE.Group[] = [];
        const plumes: PlumeView[] = [];
        for (let k = 0; k < b.count; k++) {
          const bg = boosterBody(b);
          const p = makePlume(Math.max(0.2, (b.diameter / 2 * 0.9) / Math.sqrt(Math.min(b.engine.count, 4))), b.engine.count);
          bg.add(p.group);
          this.group.add(bg);
          groups.push(bg);
          plumes.push(p);
        }
        this.boosters.push({ spec: b, groups, plumes, stageId: st.id });
      }
      y += st.length;
    }
    if (spec.fairing) {
      this.fairing = fairingBody(spec);
      this.fairingLength = spec.fairing.length;
      this.group.add(this.fairing);
      y += spec.fairing.length;
    }
    this.satellite = buildSatellite(sat);
    this.group.add(this.satellite.group);
    this.height = y;
  }

  /** Layout attached parts and animate plumes from the vehicle state. */
  update(vehicle: VehicleModel, coreThrottle: number, boosterThrottle: number, pressure: number, dt: number, payloadSeparated: boolean, destroyed: boolean): void {
    if (destroyed) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    let y = 0;
    let topOfStack = 0;
    for (const part of this.stages) {
      const st = vehicle.stages.find((s) => s.spec.id === part.spec.id);
      const attached = st ? st.attached : false;
      part.group.visible = attached && !part.spec.isSpacecraft;
      if (!attached || part.spec.isSpacecraft) {
        part.group.visible = false;
        for (const bp of this.boosters) if (bp.stageId === part.spec.id) for (const bg of bp.groups) bg.visible = false;
        continue;
      }
      part.group.position.y = y;
      const running = !!st && st.ignited && !st.cutoff && !st.burnedOut && st.engineFraction > 0;
      updatePlume(part.plume, running ? coreThrottle : 0, pressure, dt);
      for (const bp of this.boosters) {
        if (bp.stageId !== part.spec.id) continue;
        const bs = st!.boosters.find((b) => b.spec.id === bp.spec.id);
        for (let k = 0; k < bp.groups.length; k++) {
          const bg = bp.groups[k];
          const attachedB = !!bs && bs.attached;
          bg.visible = attachedB;
          if (!attachedB) continue;
          const ang = (k / bp.spec.count) * Math.PI * 2 + Math.PI / 4;
          const off = part.spec.diameter / 2 + bp.spec.diameter / 2;
          bg.position.set(Math.cos(ang) * off, y + (bp.spec.baseOffset ?? 0), Math.sin(ang) * off);
          const burning = !!bs && bs.ignited && !bs.burnedOut;
          updatePlume(bp.plumes[k], burning ? boosterThrottle : 0, pressure, dt);
        }
      }
      y += part.height;
      topOfStack = y;
    }
    if (this.fairing) {
      this.fairing.visible = vehicle.fairingAttached;
      this.fairing.position.y = topOfStack;
    }
    // payload sits above the top stage (inside the fairing if attached)
    const satG = this.satellite.group;
    satG.visible = true;
    satG.position.y = topOfStack + this.satellite.height / 2 + 0.5;
    if (payloadSeparated) {
      satG.position.y = this.satellite.height / 2;
      this.deployProgress = Math.min(1, this.deployProgress + dt / 12);
    }
    const s = payloadSeparated ? 0.02 + 0.98 * this.deployProgress : 0.02;
    for (const d of this.satellite.deployables) {
      if ((d as THREE.Mesh).geometry && (d as THREE.Mesh).geometry.type === 'BoxGeometry' && d.scale.x < 1 && d.scale.z < 0.5) d.scale.setScalar(s);
      else d.scale.set(s, 1, 1);
    }
  }

  /** Approximate current stack height (for camera framing), m. */
  currentHeight(vehicle: VehicleModel): number {
    let h = 0;
    for (const part of this.stages) {
      const st = vehicle.stages.find((s) => s.spec.id === part.spec.id);
      if (st && st.attached && !part.spec.isSpacecraft) h += part.height;
    }
    if (vehicle.fairingAttached) h += this.fairingLength;
    else h += this.satellite.height;
    return Math.max(3, h);
  }

  /** Radius of the widest attached component, m. */
  currentRadius(vehicle: VehicleModel): number {
    let r = 1;
    for (const part of this.stages) {
      const st = vehicle.stages.find((s) => s.spec.id === part.spec.id);
      if (st && st.attached) {
        r = Math.max(r, part.spec.diameter / 2);
        for (const b of st.boosters) if (b.attached) r = Math.max(r, part.spec.diameter / 2 + b.spec.diameter);
      }
    }
    return r;
  }
}
