/**
 * Procedural stylised rocket built from the vehicle specification, with
 * propellant-specific exhaust plumes (cone core + particles) and the payload.
 * The rocket group is Y-up: +Y = nose.
 */
import * as THREE from 'three';
import type { VehicleSpec, StageSpec, BoosterGroupSpec, SatelliteSpec, EngineSpec } from '../types';
import type { VehicleModel } from '../physics/vehicle';
import { buildSatellite, type SatelliteView } from './satellite';
import { ParticleSystem } from './particles';
import { stageSkin } from './textures';
import { P0 } from '../physics/constants';

type PlumeKind = 'kerolox' | 'hydrolox' | 'methalox' | 'solid' | 'hypergolic';

interface PlumeStyle {
  core: number;
  outer: number;
  particle: number;
  outerOpacity: number;
  coreOpacity: number;
  smoke: number; // 0..1 amount of dark smoke
  light: number;
}

const PLUME_STYLES: Record<PlumeKind, PlumeStyle> = {
  kerolox: { core: 0xfff3c4, outer: 0xff8a2a, particle: 0xffa040, outerOpacity: 0.55, coreOpacity: 0.9, smoke: 0.35, light: 0xffa040 },
  hydrolox: { core: 0xeef6ff, outer: 0x8ab8ff, particle: 0xa8c8ff, outerOpacity: 0.28, coreOpacity: 0.55, smoke: 0.0, light: 0xbfd8ff },
  methalox: { core: 0xe4f0ff, outer: 0x6f8cff, particle: 0x8aa4ff, outerOpacity: 0.45, coreOpacity: 0.8, smoke: 0.1, light: 0x9fb4ff },
  solid: { core: 0xfff0c0, outer: 0xffb040, particle: 0xffc060, outerOpacity: 0.7, coreOpacity: 1.0, smoke: 0.8, light: 0xffc060 },
  hypergolic: { core: 0xffe8d0, outer: 0xffb080, particle: 0xffc8a0, outerOpacity: 0.35, coreOpacity: 0.7, smoke: 0.05, light: 0xffc0a0 },
};

/** Infer the propellant family from the engine name. */
export function plumeKind(e: EngineSpec): PlumeKind {
  const n = e.name.toLowerCase();
  if (e.solid) return 'solid';
  if (/rl10|vulcain|vinci|yf-77|yf-75|le-9|le-5/.test(n)) return 'hydrolox';
  if (/be-4|raptor/.test(n)) return 'methalox';
  if (/rd-0210|rd-0211|rd-0213|rd-0214|s5\.92|s5\.98|vikas|l-2-5|curie|spacecraft/.test(n)) return 'hypergolic';
  return 'kerolox';
}

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
  glow: THREE.Mesh;
  particles: ParticleSystem;
  smoke: ParticleSystem | null;
  style: PlumeStyle;
  nozzleR: number;
  baseLength: number;
  emitAcc: number;
}

const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x3c4046, metalness: 0.85, roughness: 0.45 });
const nozzleInnerMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, metalness: 0.6, roughness: 0.7, side: THREE.BackSide });
const glowMat = new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });

function makePlume(nozzleR: number, count: number, kind: PlumeKind): PlumeView {
  const style = PLUME_STYLES[kind];
  const group = new THREE.Group();
  const r = nozzleR * Math.min(2.2, Math.sqrt(count));
  const baseLength = Math.max(6, r * 14);
  const outerGeo = new THREE.CylinderGeometry(r * 0.55, r * 1.6, 1, 20, 1, true);
  const innerGeo = new THREE.CylinderGeometry(r * 0.35, r * 0.7, 1, 16, 1, true);
  const outerMat = new THREE.MeshBasicMaterial({ color: style.outer, transparent: true, opacity: style.outerOpacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const innerMat = new THREE.MeshBasicMaterial({ color: style.core, transparent: true, opacity: style.coreOpacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const outer = new THREE.Mesh(outerGeo, outerMat);
  const inner = new THREE.Mesh(innerGeo, innerMat);
  outer.rotation.x = Math.PI;
  inner.rotation.x = Math.PI;
  group.add(outer, inner);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 20), glowMat.clone());
  (glow.material as THREE.MeshBasicMaterial).color.set(style.core);
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.05;
  group.add(glow);
  const light = new THREE.PointLight(style.light, 0, 400, 1.5);
  light.position.y = -2;
  group.add(light);
  const particles = new ParticleSystem(140, style.particle, true);
  group.add(particles.points);
  let smoke: ParticleSystem | null = null;
  if (style.smoke > 0.2) {
    smoke = new ParticleSystem(120, 0x777069, false);
    group.add(smoke.points);
  }
  group.visible = false;
  return { group, outer, inner, light, glow, particles, smoke, style, nozzleR: r, baseLength, emitAcc: 0 };
}

function updatePlume(p: PlumeView, throttle: number, pressure: number, dt: number, pointScale: number): void {
  p.particles.setPointScale(pointScale);
  p.smoke?.setPointScale(pointScale);
  const vac = 1 - Math.min(1, pressure / P0);
  if (throttle <= 0.01) {
    p.outer.visible = false; p.inner.visible = false; p.glow.visible = false;
    p.light.intensity = 0;
    // let remaining particles fade out
    p.particles.update(dt, 0, -10, 0, 0.6);
    p.smoke?.update(dt, 0, 2, 0, 0.4);
    p.group.visible = true;
    return;
  }
  p.group.visible = true;
  p.outer.visible = true; p.inner.visible = true; p.glow.visible = true;
  const expansion = 1 + 1.3 * vac;
  const flicker = 0.9 + 0.2 * Math.random();
  const L = p.baseLength * throttle * (0.7 + 1.6 * vac) * flicker;
  p.outer.scale.set(expansion, L, expansion);
  p.outer.position.y = -L / 2;
  (p.outer.material as THREE.MeshBasicMaterial).opacity = p.style.outerOpacity * (1 - 0.5 * vac);
  const Li = L * 0.55;
  p.inner.scale.set(1 + 0.3 * (expansion - 1), Li, 1 + 0.3 * (expansion - 1));
  p.inner.position.y = -Li / 2;
  p.light.intensity = 7 * throttle * p.nozzleR * flicker;
  p.light.distance = 80 + 50 * p.nozzleR;
  (p.glow.material as THREE.MeshBasicMaterial).opacity = 0.6 + 0.3 * flicker;
  // particles: emitted at the nozzle exit, streaming down the plume
  const r = p.nozzleR;
  const speed = 18 * r + 40;
  const rate = 90 * throttle;
  p.emitAcc += rate * dt;
  while (p.emitAcc >= 1) {
    p.emitAcc -= 1;
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.random() * r * 0.6;
    const spread = (0.15 + 0.8 * vac) * speed * (0.3 + Math.random());
    p.particles.emit({
      x: Math.cos(ang) * rad, y: -r * 0.5, z: Math.sin(ang) * rad,
      vx: Math.cos(ang) * spread * 0.4, vy: -speed * (0.7 + 0.6 * Math.random()), vz: Math.sin(ang) * spread * 0.4,
      life: (0.35 + 0.5 * Math.random()) * (1 + 0.8 * vac), size0: r * 0.7, size1: r * (2.2 + 4 * vac), alpha0: 0.55 * throttle,
    });
    if (p.smoke && vac < 0.85 && Math.random() < p.style.smoke) {
      p.smoke.emit({
        x: Math.cos(ang) * rad, y: -r * 3, z: Math.sin(ang) * rad,
        vx: Math.cos(ang) * spread * 0.6, vy: -speed * 0.5, vz: Math.sin(ang) * spread * 0.6,
        life: 1.2 + 1.5 * Math.random(), size0: r * 1.5, size1: r * 7, alpha0: 0.35 * (1 - vac),
      });
    }
  }
  p.particles.update(dt, 0, -2, 0, 0.35 + 0.6 * vac);
  p.smoke?.update(dt, 0, 3, 0, 0.5);
}

function stageBody(spec: StageSpec, topDiameter: number | null, label: string, country: string): THREE.Group {
  const g = new THREE.Group();
  const r = spec.diameter / 2;
  const steel = spec.id.includes('ship') || spec.id.includes('superheavy');
  const skin = stageSkin({ color: spec.color ?? '#dddddd', accent: spec.accentColor ?? '#333', label, country, length: spec.length, diameter: spec.diameter, metallic: steel });
  const bodyMat = new THREE.MeshStandardMaterial({ map: skin, metalness: steel ? 0.85 : 0.1, roughness: steel ? 0.35 : 0.62 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, spec.length, 48), bodyMat);
  body.position.y = spec.length / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  // accent band at the top
  const bandH = Math.min(3, spec.length * 0.08);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.006, r * 1.006, bandH, 48), new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.accentColor ?? '#333333'), metalness: 0.15, roughness: 0.5 }));
  band.position.y = spec.length - bandH / 2;
  g.add(band);
  // interstage adapter if the next component is narrower/wider
  if (topDiameter !== null && Math.abs(topDiameter - spec.diameter) > 0.05) {
    const h = Math.abs(topDiameter - spec.diameter) * 1.2 + 0.5;
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(topDiameter / 2, r, h, 48), bodyMat);
    cone.position.y = spec.length + h / 2;
    cone.castShadow = true;
    g.add(cone);
  }
  // thrust structure / engine section ring
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, Math.min(2, spec.length * 0.06), 48), new THREE.MeshStandardMaterial({ color: 0x2b2d31, metalness: 0.4, roughness: 0.6 }));
  skirt.position.y = Math.min(2, spec.length * 0.06) / 2;
  g.add(skirt);
  // engines
  const e = spec.engine;
  const n = Math.min(e.count, 9);
  const nozzleR = Math.min(r * 0.85, Math.max(0.25, (r * 1.6) / Math.sqrt(Math.max(1, n)) * 0.5));
  const nozzleL = spec.nozzleLength ?? Math.max(0.8, nozzleR * 2.2);
  const ring = n > 1 ? r - nozzleR * 1.1 : 0;
  for (let i = 0; i < n; i++) {
    const nozzleGeo = new THREE.CylinderGeometry(nozzleR, nozzleR * 0.45, nozzleL, 24, 1, true);
    const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    const innerN = new THREE.Mesh(nozzleGeo, nozzleInnerMat);
    const ang = (i / Math.max(1, n - (n > 4 ? 1 : 0))) * Math.PI * 2;
    let px = 0, pz = 0;
    if (!(n > 4 && i === n - 1) && n !== 1) { px = Math.cos(ang) * ring * 0.85; pz = Math.sin(ang) * ring * 0.85; }
    nozzle.position.set(px, -nozzleL / 2, pz);
    innerN.position.copy(nozzle.position);
    nozzle.rotation.x = Math.PI;
    innerN.rotation.x = Math.PI;
    nozzle.castShadow = true;
    g.add(nozzle, innerN);
  }
  const detailMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.5, roughness: 0.6 });
  if (spec.gridFins) {
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(r * 0.9, 0.15, r * 0.5), detailMat);
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      fin.position.set(Math.cos(ang) * (r + r * 0.4), spec.length - 2, Math.sin(ang) * (r + r * 0.4));
      fin.rotation.y = -ang;
      fin.castShadow = true;
      g.add(fin);
    }
  }
  if (spec.legs) {
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, spec.length * 0.35, 0.9), detailMat);
      const ang = (i / 4) * Math.PI * 2;
      leg.position.set(Math.cos(ang) * (r + 0.35), spec.length * 0.18, Math.sin(ang) * (r + 0.35));
      leg.rotation.y = -ang;
      leg.castShadow = true;
      g.add(leg);
    }
  }
  if (spec.flaps) {
    for (let i = 0; i < 4; i++) {
      const big = i < 2;
      const flap = new THREE.Mesh(new THREE.BoxGeometry(r * (big ? 0.9 : 0.6), big ? 12 : 8, 0.3), new THREE.MeshStandardMaterial({ color: 0x1c1c1c, metalness: 0.5, roughness: 0.6 }));
      const ang = i < 2 ? (i ? Math.PI : 0) : (i === 2 ? Math.PI / 2 : -Math.PI / 2);
      flap.position.set(Math.cos(ang) * (r + r * 0.35), big ? spec.length * 0.12 : spec.length * 0.85, Math.sin(ang) * (r + r * 0.35));
      flap.rotation.y = -ang;
      flap.castShadow = true;
      g.add(flap);
    }
  }
  return g;
}

function boosterBody(spec: BoosterGroupSpec, country: string): THREE.Group {
  const g = new THREE.Group();
  const r = spec.diameter / 2;
  const skin = stageSkin({ color: spec.color ?? '#dddddd', accent: '#333', country, length: spec.length, diameter: spec.diameter });
  const m = new THREE.MeshStandardMaterial({ map: skin, metalness: 0.1, roughness: 0.62 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, spec.length, 32), m);
  body.position.y = spec.length / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const topH = spec.conicalTop ? spec.length * 0.35 : r * 1.6;
  const top = new THREE.Mesh(new THREE.ConeGeometry(r, topH, 32), m);
  top.position.y = spec.length + topH / 2;
  top.castShadow = true;
  g.add(top);
  const n = Math.min(spec.engine.count, 4);
  const nozzleR = Math.max(0.2, (r * 0.9) / Math.sqrt(n));
  for (let i = 0; i < n; i++) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(nozzleR, nozzleR * 0.45, nozzleR * 2, 16, 1, true), nozzleMat);
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
  const skin = stageSkin({ color: f.color ?? '#eeeeee', accent: '#333', label: spec.name, country: spec.country, length: f.length, diameter: f.diameter });
  const m = new THREE.MeshStandardMaterial({ map: skin, metalness: 0.05, roughness: 0.5 });
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, cylH, 48), m);
  cyl.position.y = cylH / 2;
  cyl.castShadow = true;
  g.add(cyl);
  // ogive nose via lathe
  const pts: THREE.Vector2[] = [];
  const noseH = f.length - cylH;
  for (let i = 0; i <= 16; i++) {
    const s = i / 16;
    pts.push(new THREE.Vector2(r * Math.sqrt(1 - s * s * 0.97), cylH + s * noseH));
  }
  const nose = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), new THREE.MeshStandardMaterial({ color: new THREE.Color(f.color ?? '#eeeeee'), metalness: 0.05, roughness: 0.5 }));
  nose.castShadow = true;
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
      const g = stageBody(st, topD, i === 0 ? spec.name : '', spec.country);
      const nozzleR = Math.min(st.diameter / 2 * 0.85, Math.max(0.25, (st.diameter / 2 * 1.6) / Math.sqrt(Math.max(1, Math.min(st.engine.count, 9))) * 0.5));
      const plume = makePlume(nozzleR, st.engine.count, plumeKind(st.engine));
      g.add(plume.group);
      this.group.add(g);
      this.stages.push({ spec: st, group: g, plume, height: st.length + (topD !== null && Math.abs(topD - st.diameter) > 0.05 ? Math.abs(topD - st.diameter) * 1.2 + 0.5 : 0) });
      for (const b of st.boosters ?? []) {
        const groups: THREE.Group[] = [];
        const plumes: PlumeView[] = [];
        for (let k = 0; k < b.count; k++) {
          const bg = boosterBody(b, spec.country);
          const p = makePlume(Math.max(0.2, (b.diameter / 2 * 0.9) / Math.sqrt(Math.min(b.engine.count, 4))), b.engine.count, plumeKind(b.engine));
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
  update(vehicle: VehicleModel, coreThrottle: number, boosterThrottle: number, pressure: number, dt: number, payloadSeparated: boolean, destroyed: boolean, pointScale: number): void {
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
      updatePlume(part.plume, running ? coreThrottle : 0, pressure, dt, pointScale);
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
          updatePlume(bp.plumes[k], burning ? boosterThrottle : 0, pressure, dt, pointScale);
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

  /** Release GPU resources (geometries, materials, particle buffers). */
  dispose(): void {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = (m as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat && mat !== nozzleMat && mat !== nozzleInnerMat) mat.dispose();
    });
    for (const st of this.stages) { st.plume.particles.dispose(); st.plume.smoke?.dispose(); }
    for (const bp of this.boosters) for (const p of bp.plumes) { p.particles.dispose(); p.smoke?.dispose(); }
  }
}
