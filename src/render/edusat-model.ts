/**
 * EduSat-3U drawn from its parts list (src/structure/edusat.ts): each part
 * built from boxes and cylinders inside the box the list gives it, so the
 * picture is the list's — a different battery or camera is drawn by its own
 * entry — and each vertex carries its part's index, as the Soyuz files do, so
 * the Structure viewer treats both models alike.
 *
 * Frame: metres, centre at the origin, +Y the long axis, −Y the nadir face.
 */
import * as THREE from 'three';
import { EDU_UNITS, PANELS, type EduPart } from '../structure/edusat';
import type { ViewerMesh } from './structure-viewer';

type Finish = 'metal' | 'paint' | 'pcb' | 'cell' | 'gold' | 'glass';
const FINISH: Readonly<Record<Finish, { roughness: number; metalness: number }>> = {
  metal: { roughness: 0.38, metalness: 0.85 },
  paint: { roughness: 0.62, metalness: 0 },
  pcb: { roughness: 0.55, metalness: 0.05 },
  cell: { roughness: 0.22, metalness: 0.15 },
  gold: { roughness: 0.3, metalness: 0.9 },
  glass: { roughness: 0.1, metalness: 0.2 },
};

interface Prim { geometry: THREE.BufferGeometry; color: string; finish: Finish }

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string, finish: Finish): Prim => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return { geometry: g, color, finish };
};

/** A cylinder along `axis`, centred at (x, y, z). */
const cylinder = (r: number, length: number, axis: 'x' | 'y' | 'z', x: number, y: number, z: number, color: string, finish: Finish, segments = 24): Prim => {
  const g = new THREE.CylinderGeometry(r, r, length, segments);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return { geometry: g, color, finish };
};

const C = {
  rail: '#b8c1c8', anodized: '#2d3238', pcb: '#1f5a3a', chip: '#1c1f22', connector: '#c9ccd0', copper: '#b8743c',
  cellWrap: '#2c5f9e', cellEnd: '#c8ccd0', camera: '#3b4148', lens: '#101214', glass: '#4b6d8f', radiator: '#d0d4d8',
  solar: '#1f3563', panelBack: '#18231d', tape: '#c9a64a', plate: '#30353b', white: '#e2e4e2',
};

/** A circuit board `size` square, its top at the part box's top minus the board's parts. */
function board(part: EduPart, extra: (top: number) => Prim[]): Prim[] {
  const [cx, cy, cz] = part.box.center;
  const [w, h] = part.box.size;
  const bottom = cy - h / 2;
  const prims = [box(w, 0.0016, w, cx, bottom + 0.0008, cz, C.pcb, 'pcb')];
  // the stack connector along one edge, through the board
  prims.push(box(0.052, Math.min(h, 0.011), 0.006, cx - 0.012, bottom + Math.min(h, 0.011) / 2, cz - w / 2 + 0.008, C.chip, 'paint'));
  return [...prims, ...extra(bottom + 0.0016)];
}

/** The primitives of one part, in the satellite's frame. */
function partPrims(part: EduPart): Prim[] {
  const [cx, cy, cz] = part.box.center;
  const [w, h, d] = part.box.size;
  switch (part.unit) {
    case 'frame': {
      const r = 0.0085, prims: Prim[] = [];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) prims.push(box(r, h, r, sx * (w / 2 - r / 2), 0, sz * (d / 2 - r / 2), C.rail, 'metal'));
      // the two end frames
      for (const sy of [-1, 1]) {
        const y = sy * (h / 2 - 0.004);
        prims.push(box(w - 2 * r, 0.006, 0.005, 0, y, d / 2 - 0.0025, C.rail, 'metal'), box(w - 2 * r, 0.006, 0.005, 0, y, -d / 2 + 0.0025, C.rail, 'metal'));
        prims.push(box(0.005, 0.006, d - 2 * r, w / 2 - 0.0025, y, 0, C.rail, 'metal'), box(0.005, 0.006, d - 2 * r, -w / 2 + 0.0025, y, 0, C.rail, 'metal'));
      }
      return prims;
    }
    case 'stack': {
      const prims: Prim[] = [];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) prims.push(cylinder(0.0016, h, 'y', sx * 0.0425, cy, sz * 0.0425, C.connector, 'metal', 10));
      // the bottom plate with the camera's opening: four bars round a 60 mm hole
      const y = cy - h / 2 + 0.0015;
      prims.push(box(w, 0.003, 0.015, 0, y, 0.0375, C.plate, 'metal'), box(w, 0.003, 0.015, 0, y, -0.0375, C.plate, 'metal'));
      prims.push(box(0.015, 0.003, 0.06, 0.0375, y, 0, C.plate, 'metal'), box(0.015, 0.003, 0.06, -0.0375, y, 0, C.plate, 'metal'));
      return prims;
    }
    case 'payload': {
      const night = part.id.endsWith('night');
      const lensR = night ? 0.028 : 0.017, lensL = night ? 0.03 : 0.02;
      const bodyH = h - lensL;
      const prims = [box(w, bodyH, d, cx, cy + h / 2 - bodyH / 2, cz, C.camera, 'paint')];
      prims.push(cylinder(lensR, lensL, 'y', cx, cy - h / 2 + lensL / 2, cz, C.lens, 'paint'));
      prims.push(cylinder(lensR * 0.8, 0.002, 'y', cx, cy - h / 2 + 0.001, cz, C.glass, 'glass'));
      if (night) for (const s of [-1, 1]) prims.push(box(0.002, bodyH * 0.8, d * 0.8, cx + s * (w / 2 - 0.001), cy + h / 2 - bodyH / 2, cz, C.radiator, 'metal'));
      return prims;
    }
    case 'battery':
      return board(part, (top) => {
        const cells = part.cells ?? 1, prims: Prim[] = [];
        for (let k = 0; k < cells; k++) {
          const y = top + 0.0095 + k * 0.0185;
          prims.push(cylinder(0.009, 0.065, 'x', cx, y, cz, C.cellWrap, 'paint'));
          for (const s of [-1, 1]) prims.push(cylinder(0.0085, 0.002, 'x', cx + s * 0.0335, y, cz, C.cellEnd, 'metal'));
        }
        return prims;
      });
    case 'eps':
      return board(part, (top) => [
        box(0.012, 0.005, 0.012, cx + 0.02, top + 0.0025, cz + 0.015, C.chip, 'paint'),
        box(0.012, 0.005, 0.012, cx - 0.02, top + 0.0025, cz + 0.015, C.chip, 'paint'),
        cylinder(0.005, 0.006, 'y', cx + 0.02, top + 0.003, cz - 0.015, C.copper, 'metal'),
      ]);
    case 'adcs':
      return board(part, (top) => [
        box(0.06, 0.008, 0.008, cx, top + 0.004, cz + 0.03, C.copper, 'metal'),
        box(0.008, 0.008, 0.06, cx + 0.03, top + 0.004, cz, C.copper, 'metal'),
        cylinder(0.012, 0.006, 'y', cx - 0.015, top + 0.003, cz - 0.012, C.copper, 'metal'),
      ]);
    case 'obc':
      return board(part, (top) => [
        box(0.02, 0.003, 0.02, cx, top + 0.0015, cz, C.chip, 'paint'),
        box(0.01, 0.003, 0.014, cx + 0.025, top + 0.0015, cz + 0.02, C.chip, 'paint'),
      ]);
    case 'radio':
      return board(part, (top) => [box(0.06, 0.01, 0.045, cx + 0.005, top + 0.005, cz + 0.008, C.connector, 'metal')]);
    case 'antenna': {
      const prims = [box(w, 0.004, d, cx, cy - h / 2 + 0.002, cz, C.plate, 'paint')];
      // four tape antennas, stowed along the plate's edges
      prims.push(box(0.08, 0.002, 0.004, cx, cy + h / 2 - 0.002, cz + d / 2 - 0.006, C.tape, 'gold'), box(0.08, 0.002, 0.004, cx, cy + h / 2 - 0.002, cz - d / 2 + 0.006, C.tape, 'gold'));
      prims.push(box(0.004, 0.002, 0.08, cx + w / 2 - 0.006, cy + h / 2 - 0.002, cz, C.tape, 'gold'), box(0.004, 0.002, 0.08, cx - w / 2 + 0.006, cy + h / 2 - 0.002, cz, C.tape, 'gold'));
      return prims;
    }
    default: {
      if (!PANELS.includes(part.unit)) return [box(w, h, d, cx, cy, cz, C.white, 'paint')];
      // a side panel: its backing, and seven 4 × 8 cm cells on the outer face (two columns of four, one place for the sun sensor)
      const alongX = w < d; // a panel on an X face is thin in x
      const normal = alongX ? Math.sign(cx) : Math.sign(cz);
      const prims = [box(w, h, d, cx, cy, cz, C.panelBack, 'pcb')];
      const out = (alongX ? cx : cz) + normal * (0.0008 + 0.0003);
      let n = 0;
      for (let row = 0; row < 4; row++) for (let col = 0; col < 2; col++) {
        if (n >= (part.solarCells ?? 7)) break;
        if (row === 3 && col === 1) continue;
        const y = cy - 0.12 + row * 0.08, across = (col - 0.5) * 0.04;
        prims.push(alongX ? box(0.0006, 0.078, 0.038, out, y, cz + across, C.solar, 'cell') : box(0.038, 0.078, 0.0006, cx + across, y, out, C.solar, 'cell'));
        n++;
      }
      return prims;
    }
  }
}

/** Merge a part's primitives into one geometry per finish, each vertex coloured and marked with `item`. */
function mergeByFinish(prims: Prim[], item: number): Map<Finish, THREE.BufferGeometry> {
  const out = new Map<Finish, THREE.BufferGeometry>();
  const finishes = new Set(prims.map((p) => p.finish));
  for (const finish of finishes) {
    const these = prims.filter((p) => p.finish === finish).map((p) => ({ g: p.geometry.toNonIndexed(), color: new THREE.Color(p.color) }));
    const count = these.reduce((s, p) => s + p.g.getAttribute('position').count, 0);
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), tint = new Uint8Array(count * 3), items = new Uint16Array(count).fill(item);
    let at = 0;
    for (const { g, color } of these) {
      const p = g.getAttribute('position') as THREE.BufferAttribute, n = g.getAttribute('normal') as THREE.BufferAttribute;
      pos.set(p.array as Float32Array, at * 3);
      nor.set(n.array as Float32Array, at * 3);
      const srgb = color.clone().convertLinearToSRGB();
      for (let v = 0; v < p.count; v++) {
        tint[(at + v) * 3] = Math.round(srgb.r * 255);
        tint[(at + v) * 3 + 1] = Math.round(srgb.g * 255);
        tint[(at + v) * 3 + 2] = Math.round(srgb.b * 255);
      }
      at += p.count;
      g.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geometry.setAttribute('tint', new THREE.BufferAttribute(tint, 3, true));
    geometry.setAttribute('item', new THREE.BufferAttribute(items, 1));
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    out.set(finish, geometry);
  }
  for (const p of prims) p.geometry.dispose();
  return out;
}

/** The design's parts as the viewer's meshes: one per part and finish, `item` the part's index in EDU_UNITS. */
export function edusatMeshes(parts: readonly EduPart[]): ViewerMesh[] {
  const meshes: ViewerMesh[] = [];
  for (const part of parts) {
    const item = EDU_UNITS.indexOf(part.unit);
    for (const [finish, geometry] of mergeByFinish(partPrims(part), item)) {
      meshes.push({ unit: part.unit, layer: 'outer', geometry, ...FINISH[finish] });
    }
  }
  return meshes;
}
