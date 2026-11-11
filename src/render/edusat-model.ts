/**
 * EduSat-3U drawn from its parts list (src/structure/edusat.ts,
 * `itemsOf` in src/structure/edusat-design.ts): each piece of each part built
 * from boxes and cylinders inside the box the list gives its part, so the
 * picture is the list's — a different battery or camera is drawn by its own
 * entry — and each vertex carries its piece's index, as the Soyuz files
 * carry their parts', so the Structure viewer treats both models alike.
 *
 * Frame: metres, centre at the origin, +y the long axis (the specification's
 * +Z), the −Z face down, where the camera looks out; the specification's +X
 * is +x and its +Y is −z. Shapes are drawn to read well and to their bays'
 * sizes; they are a concept's, not a product's drawings.
 */
import * as THREE from 'three';
import { ENVELOPE, FACE_NORMAL, PANEL, RAIL, ROD_OFFSET, STACK_BAYS, STACK_SLOTS, type EduFace, type EduPart, type EduPiece } from '../structure/edusat';
import type { EduItem } from '../structure/edusat-design';
import type { ViewerMesh } from './structure-viewer';

/** The one layer the satellite is drawn in (the Soyuz has three). */
export const EDUSAT_LAYER = 'body';

type Finish = 'metal' | 'paint' | 'pcb' | 'cell' | 'gold' | 'glass';
const FINISH: Readonly<Record<Finish, { roughness: number; metalness: number }>> = {
  metal: { roughness: 0.38, metalness: 0.85 },
  paint: { roughness: 0.62, metalness: 0 },
  pcb: { roughness: 0.55, metalness: 0.05 },
  cell: { roughness: 0.2, metalness: 0.2 },
  gold: { roughness: 0.3, metalness: 0.9 },
  glass: { roughness: 0.08, metalness: 0.25 },
};

interface Prim { geometry: THREE.BufferGeometry; color: string; finish: Finish }

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string, finish: Finish): Prim => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return { geometry: g, color, finish };
};

/** A cylinder along `axis`, centred at (x, y, z); `r2` gives a cone's other radius. */
const cylinder = (
  r: number, length: number, axis: 'x' | 'y' | 'z', x: number, y: number, z: number, color: string, finish: Finish, segments = 24, r2 = r,
): Prim => {
  const g = new THREE.CylinderGeometry(r2, r, length, segments);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return { geometry: g, color, finish };
};

const C = {
  rail: '#b8c1c8', frame: '#a3adb6', pcb: '#1f5a3a', chip: '#1c1f22', connector: '#c9ccd0', copper: '#b8743c',
  cellWrap: '#2c5f9e', cellEnd: '#c8ccd0', camera: '#3b4148', lens: '#15181b', glass: '#5d86ad', radiator: '#d0d4d8',
  solar: '#1c3260', panelBack: '#18231d', tape: '#c9a64a', plate: '#30353b', kapton: '#c98a2b', red: '#c8372d', sensor: '#d9dde0',
};

const HALF = { x: ENVELOPE.x / 2, y: ENVELOPE.y / 2, z: ENVELOPE.z / 2 };
/** The four rails' corners, round from the specification's +X+Y: (x, z) signs in the picture's frame. */
const CORNERS: readonly (readonly [number, number])[] = [[1, -1], [-1, -1], [-1, 1], [1, 1]];

/** The primitives of one piece, in the satellite's frame. `deployed`: the antenna's tapes out. */
function piecePrims(part: EduPart, piece: EduPiece, deployed: boolean): Prim[] {
  const [cx, cy, cz] = part.box.center;
  const [w, h, d] = part.box.size;
  const bottom = cy - h / 2, top = cy + h / 2;
  const n = piece.n ?? 1;
  // a board's own top face: its parts stand on it
  const deck = bottom + 0.0016;
  switch (piece.kind) {
    // ── the frame
    case 'rail': {
      const [sx, sz] = CORNERS[n - 1];
      return [box(RAIL, ENVELOPE.y, RAIL, sx * (HALF.x - RAIL / 2), 0, sz * (HALF.z - RAIL / 2), C.rail, 'metal')];
    }
    case 'endFrame': {
      const y = (n === 1 ? -1 : 1) * (HALF.y - 0.004);
      const span = ENVELOPE.x - 2 * RAIL;
      return [
        box(span, 0.006, 0.005, 0, y, HALF.z - 0.0025, C.frame, 'metal'), box(span, 0.006, 0.005, 0, y, -HALF.z + 0.0025, C.frame, 'metal'),
        box(0.005, 0.006, span, HALF.x - 0.0025, y, 0, C.frame, 'metal'), box(0.005, 0.006, span, -HALF.x + 0.0025, y, 0, C.frame, 'metal'),
      ];
    }
    case 'switch': {
      // on two opposite rails' −Z ends: the body inside the corner, the plunger through the rail's foot
      const [sx, sz] = CORNERS[n === 1 ? 0 : 2];
      const x = sx * (HALF.x - RAIL - 0.004), z = sz * (HALF.z - RAIL - 0.004), y = -HALF.y + 0.012;
      return [box(0.007, 0.01, 0.007, x, y, z, C.chip, 'paint'), cylinder(0.0012, 0.008, 'y', x, y - 0.008, z, C.connector, 'metal', 10)];
    }
    case 'rbfPin': {
      // through the −Z end frame, beside the lens opening, with its red tag
      const y = -HALF.y + 0.004, z = HALF.z - 0.0025;
      return [cylinder(0.0015, 0.014, 'z', 0.03, y, z - 0.004, C.connector, 'metal', 10), box(0.012, 0.004, 0.0006, 0.03, y - 0.004, z + 0.0035, C.red, 'paint')];
    }
    // ── the mounting stack
    case 'rod': {
      const [sx, sz] = CORNERS[n - 1];
      return [cylinder(0.0016, h, 'y', sx * ROD_OFFSET, cy, sz * ROD_OFFSET, C.connector, 'metal', 10)];
    }
    case 'basePlate': {
      // the plate at the −Z end with the lens's opening: four bars round a 60 mm hole
      const y = bottom + 0.0015;
      return [
        box(w, 0.003, 0.015, 0, y, 0.0375, C.plate, 'metal'), box(w, 0.003, 0.015, 0, y, -0.0375, C.plate, 'metal'),
        box(0.015, 0.003, 0.06, 0.0375, y, 0, C.plate, 'metal'), box(0.015, 0.003, 0.06, -0.0375, y, 0, C.plate, 'metal'),
      ];
    }
    case 'spacers': {
      // a sleeve on each rod under each board
      const prims: Prim[] = [];
      for (const bay of STACK_BAYS) {
        if (bay === 'payload') continue;
        const y = -HALF.y + STACK_SLOTS[bay].from - 0.003;
        for (const [sx, sz] of CORNERS) prims.push(cylinder(0.003, 0.006, 'y', sx * ROD_OFFSET, y, sz * ROD_OFFSET, C.rail, 'metal', 10));
      }
      return prims;
    }
    case 'harness': {
      // the loom up one side of the stack, from the battery to the radio
      const from = -HALF.y + STACK_SLOTS.battery.from, to = -HALF.y + STACK_SLOTS.radio.from + 0.012;
      return [box(0.002, to - from, 0.012, -0.0445, (from + to) / 2, 0.012, C.kapton, 'paint')];
    }
    // ── the camera: body above, lens looking out of the −Z face
    case 'camBody': case 'lens': case 'window': case 'radiator': {
      const night = part.id.endsWith('night');
      const lensR = night ? 0.03 : 0.02, lensL = night ? 0.066 : 0.058;
      const bodyH = h - lensL, bodyY = top - bodyH / 2;
      if (piece.kind === 'camBody') return [box(w, bodyH, d, cx, bodyY, cz, C.camera, 'paint')];
      if (piece.kind === 'lens') {
        return [
          cylinder(lensR, lensL, 'y', cx, bottom + lensL / 2, cz, C.lens, 'paint', 28, lensR * 0.86),
          cylinder(lensR * 1.04, 0.006, 'y', cx, bottom + 0.003, cz, C.connector, 'metal', 28),
        ];
      }
      if (piece.kind === 'window') return [cylinder(lensR * 0.8, 0.0016, 'y', cx, bottom + 0.0008, cz, C.glass, 'glass', 28)];
      return [-1, 1].map((s) => box(0.002, bodyH * 0.82, d * 0.82, cx + s * (w / 2 + 0.001), bodyY, cz, C.radiator, 'metal'));
    }
    // ── boards: the card, with the stack's connector along one edge
    case 'board':
      return [
        box(w, 0.0016, d, cx, bottom + 0.0008, cz, C.pcb, 'pcb'),
        box(0.052, Math.min(h, 0.011), 0.006, cx - 0.012, bottom + Math.min(h, 0.011) / 2, cz - d / 2 + 0.008, C.chip, 'paint'),
      ];
    case 'cell18650': {
      const y = deck + 0.0095 + (n - 1) * 0.0185;
      return [
        cylinder(0.009, 0.065, 'x', cx, y, cz + 0.006, C.cellWrap, 'paint'),
        ...[-1, 1].map((s) => cylinder(0.0085, 0.002, 'x', cx + s * 0.0335, y, cz + 0.006, C.cellEnd, 'metal')),
      ];
    }
    case 'protection': return [box(0.014, 0.003, 0.01, cx + 0.028, deck + 0.0015, cz - 0.03, C.chip, 'paint')];
    case 'converter': return [box(0.012, 0.005, 0.012, cx + (n === 1 ? 0.02 : -0.02), deck + 0.0025, cz + 0.015, C.chip, 'paint')];
    case 'inductor': return [cylinder(0.005, 0.006, 'y', cx + 0.02, deck + 0.003, cz - 0.012, C.copper, 'metal')];
    case 'torquer':
      return n === 1
        ? [box(0.06, 0.008, 0.008, cx, deck + 0.004, cz + 0.03, C.copper, 'metal')]
        : [box(0.008, 0.008, 0.06, cx + 0.03, deck + 0.004, cz, C.copper, 'metal')];
    case 'airCoil': return [cylinder(0.014, 0.005, 'y', cx - 0.014, deck + 0.0025, cz - 0.01, C.copper, 'metal')];
    case 'processor': return [box(0.02, 0.003, 0.02, cx, deck + 0.0015, cz + 0.004, C.chip, 'paint')];
    case 'memory': return [box(0.01, 0.003, 0.014, cx + 0.025, deck + 0.0015, cz + 0.02, C.chip, 'paint')];
    case 'transceiver': return [box(0.058, 0.01, 0.044, cx + 0.006, deck + 0.005, cz + 0.01, C.connector, 'metal')];
    case 'rfConnector': return [cylinder(0.003, 0.009, 'y', cx - 0.034, deck + 0.0045, cz + 0.03, C.tape, 'gold', 12)];
    // ── the antenna module on the +Z end
    case 'antennaBase': return [box(w, 0.004, d, cx, bottom + 0.002, cz, C.plate, 'paint')];
    case 'tape': {
      // four tapes: stowed along the plate's edges, deployed straight out from the middle of each edge (about a quarter wave at 437 MHz)
      const along = n % 2 === 1, sign = n <= 2 ? 1 : -1;
      const y = top - 0.002, reach = 0.17;
      if (!deployed) {
        return along
          ? [box(0.08, 0.002, 0.004, cx, y, cz + sign * (d / 2 - 0.006), C.tape, 'gold')]
          : [box(0.004, 0.002, 0.08, cx + sign * (w / 2 - 0.006), y, cz, C.tape, 'gold')];
      }
      return along
        ? [box(0.006, 0.001, reach, cx, y, cz + sign * (d / 2 + reach / 2 - 0.006), C.tape, 'gold')]
        : [box(reach, 0.001, 0.006, cx + sign * (w / 2 + reach / 2 - 0.006), y, cz, C.tape, 'gold')];
    }
    // ── a side panel: its board, seven cells in two columns of four places, the sun sensor in the eighth
    case 'panelBoard': return [box(w, h, d, cx, cy, cz, C.panelBack, 'pcb')];
    case 'solarCell': case 'sunSensor': {
      const face = (`face-${part.unit.slice('panel-'.length)}`) as EduFace;
      const nrm = FACE_NORMAL[face];
      const onX = nrm[0] !== 0;
      const place = piece.kind === 'sunSensor' ? 7 : n - 1; // 0…6 the cells, 7 the sensor: rows of two from the −Z end
      const row = Math.floor(place / 2), col = place % 2;
      const y = cy - 0.12 + row * 0.08, across = (col - 0.5) * 0.04;
      const proud = (piece.kind === 'sunSensor' ? 0.0015 : PANEL.cellThick), out = PANEL.thick / 2 + proud / 2;
      const [px, pz] = onX ? [cx + nrm[0] * out, cz + across] : [cx + across, cz + nrm[2] * out];
      if (piece.kind === 'solarCell') return [onX ? box(proud, 0.078, 0.038, px, y, pz, C.solar, 'cell') : box(0.038, 0.078, proud, px, y, pz, C.solar, 'cell')];
      return [onX ? box(proud, 0.012, 0.012, px, y, pz, C.sensor, 'metal') : box(0.012, 0.012, proud, px, y, pz, C.sensor, 'metal')];
    }
  }
}

interface Tagged { prim: Prim; item: number }

/** Merge primitives into one geometry, each vertex coloured and marked with its piece's index. */
function merge(tagged: readonly Tagged[]): THREE.BufferGeometry {
  const soups = tagged.map(({ prim, item }) => ({ g: prim.geometry.toNonIndexed(), color: new THREE.Color(prim.color).convertLinearToSRGB(), item }));
  const count = soups.reduce((s, p) => s + p.g.getAttribute('position').count, 0);
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), tint = new Uint8Array(count * 3), items = new Uint16Array(count);
  let at = 0;
  for (const { g, color, item } of soups) {
    const p = g.getAttribute('position') as THREE.BufferAttribute, n = g.getAttribute('normal') as THREE.BufferAttribute;
    pos.set(p.array as Float32Array, at * 3);
    nor.set(n.array as Float32Array, at * 3);
    for (let v = 0; v < p.count; v++) {
      tint[(at + v) * 3] = Math.round(color.r * 255);
      tint[(at + v) * 3 + 1] = Math.round(color.g * 255);
      tint[(at + v) * 3 + 2] = Math.round(color.b * 255);
      items[at + v] = item;
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
  return geometry;
}

/**
 * A design's pieces as the viewer's meshes: one per unit and finish, each
 * vertex marked with its piece's index (`EduItem.index`).
 */
export function edusatMeshes(items: readonly EduItem[], options: { deployed?: boolean } = {}): ViewerMesh[] {
  const groups = new Map<string, Tagged[]>();
  for (const it of items) {
    for (const prim of piecePrims(it.part, it.piece, !!options.deployed)) {
      const key = `${it.unit}|${prim.finish}`;
      groups.set(key, [...(groups.get(key) ?? []), { prim, item: it.index }]);
    }
  }
  const meshes: ViewerMesh[] = [];
  for (const [key, tagged] of groups) {
    const [unit, finish] = key.split('|') as [string, Finish];
    meshes.push({ unit, layer: EDUSAT_LAYER, geometry: merge(tagged), ...FINISH[finish] });
    for (const t of tagged) t.prim.geometry.dispose();
  }
  return meshes;
}
