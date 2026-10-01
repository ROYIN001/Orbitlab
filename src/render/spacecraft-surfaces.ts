/**
 * The surfaces a spacecraft is made of, as shared procedural textures: solar
 * cells, crinkled gold multi-layer insulation (MLI) and the mirror tiles of a
 * radiator. Each is painted once, on first use, and shared by every
 * spacecraft (`userData.shared`, so `disposeObject` leaves them alone).
 *
 * The textures tile: a part laid out with `tiledBox` / `tiledCylinder` has its
 * UVs scaled to metres over the tile size, so a 1 m wing and a 10 m wing show
 * cells of the same size instead of the same cells stretched.
 */
import * as THREE from 'three';
import { hash11, hash21 } from './noise';

/** Edge of one solar-array tile, m: 4 × 4 cells of 15 cm. */
export const CELL_TILE = 0.6;
/** Edge of one MLI tile, m. */
export const FOIL_TILE = 1.4;
/** Edge of one radiator tile, m: 8 × 8 mirrors of 6 cm. */
export const RADIATOR_TILE = 0.5;

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}

function shared(c: HTMLCanvasElement, colour: boolean): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (colour) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.userData.shared = true;
  return t;
}

let cells: THREE.CanvasTexture | null = null;
/**
 * Solar cells: deep-blue cells with their corners cut (they are sawn from
 * round wafers), thin silver bus bars across them and the light interconnect
 * gaps between them, each cell a shade off its neighbours.
 */
export function solarCellTexture(): THREE.CanvasTexture {
  if (cells) return cells;
  const N = 4, S = 128, W = N * S;
  const [c, g] = canvas(W, W);
  g.fillStyle = '#b9bec6';
  g.fillRect(0, 0, W, W);
  const gap = 5, cut = 18;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x0 = i * S + gap / 2, y0 = j * S + gap / 2, s = S - gap;
      const tone = hash21(i + 0.3, j + 0.7);
      const grad = g.createLinearGradient(x0, y0, x0 + s, y0 + s);
      grad.addColorStop(0, `rgb(${18 + tone * 8},${32 + tone * 10},${86 + tone * 22})`);
      grad.addColorStop(1, `rgb(${10 + tone * 6},${20 + tone * 8},${62 + tone * 18})`);
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(x0 + cut, y0); g.lineTo(x0 + s - cut, y0); g.lineTo(x0 + s, y0 + cut); g.lineTo(x0 + s, y0 + s - cut);
      g.lineTo(x0 + s - cut, y0 + s); g.lineTo(x0 + cut, y0 + s); g.lineTo(x0, y0 + s - cut); g.lineTo(x0, y0 + cut);
      g.closePath();
      g.fill();
      // bus bars and a few of the fine grid fingers
      g.fillStyle = 'rgba(205,212,222,0.55)';
      for (const f of [0.33, 0.66]) g.fillRect(x0 + 6, y0 + s * f - 1, s - 12, 2);
      g.fillStyle = 'rgba(160,172,196,0.16)';
      for (let k = 1; k < 12; k++) g.fillRect(x0 + (s * k) / 12, y0 + 4, 1, s - 8);
    }
  }
  cells = shared(c, true);
  return cells;
}

let foil: { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } | null = null;
/**
 * Gold MLI: the outer Kapton layer is never flat, so it is drawn as creases —
 * a lit and a shadowed edge each — over soft blotches where the blanket
 * billows, with the same creases as ridges in the relief map.
 */
export function foilTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  if (foil) return foil;
  const W = 512;
  const [c, g] = canvas(W, W);
  const [bc, b] = canvas(W, W);
  g.fillStyle = '#c99a3c';
  g.fillRect(0, 0, W, W);
  b.fillStyle = '#808080';
  b.fillRect(0, 0, W, W);
  // billows: broad light and dark patches, wrapped so the tile repeats
  for (let i = 0; i < 40; i++) {
    const x = hash11(i * 1.31) * W, y = hash11(i * 2.17 + 0.4) * W, r = 30 + hash11(i * 3.7) * 90;
    const light = hash11(i * 5.1) < 0.5;
    for (const [dx, dy] of [[0, 0], [-W, 0], [W, 0], [0, -W], [0, W]]) {
      const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      grad.addColorStop(0, light ? 'rgba(255,226,150,0.22)' : 'rgba(90,58,14,0.22)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(x + dx - r, y + dy - r, 2 * r, 2 * r);
      const bg = b.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      bg.addColorStop(0, light ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)');
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      b.fillStyle = bg;
      b.fillRect(x + dx - r, y + dy - r, 2 * r, 2 * r);
    }
  }
  // creases: short kinked polylines
  for (let i = 0; i < 170; i++) {
    let x = hash11(i * 7.13 + 0.2) * W, y = hash11(i * 3.91 + 0.6) * W;
    let a = hash11(i * 1.77) * Math.PI * 2;
    const pts: [number, number][] = [[x, y]];
    const n = 2 + Math.floor(hash11(i * 4.4) * 4);
    for (let k = 0; k < n; k++) {
      a += (hash11(i * 9.3 + k) - 0.5) * 1.4;
      const step = 10 + hash11(i * 2.9 + k * 1.3) * 34;
      x += Math.cos(a) * step; y += Math.sin(a) * step;
      pts.push([x, y]);
    }
    const width = 1 + hash11(i * 6.6) * 1.5;
    for (const [dx, dy] of [[0, 0], [-W, 0], [W, 0], [0, -W], [0, W]]) {
      const line = (ctx: CanvasRenderingContext2D, style: string, off: number, w: number) => {
        ctx.strokeStyle = style; ctx.lineWidth = w;
        ctx.beginPath();
        pts.forEach(([px, py], k) => (k ? ctx.lineTo(px + dx + off, py + dy + off) : ctx.moveTo(px + dx + off, py + dy + off)));
        ctx.stroke();
      };
      line(g, 'rgba(255,238,180,0.32)', 0, width);
      line(g, 'rgba(70,42,8,0.4)', width, width);
      line(b, 'rgba(255,255,255,0.6)', 0, width * 1.5);
      line(b, 'rgba(0,0,0,0.45)', width * 1.5, width);
    }
  }
  foil = { map: shared(c, true), bump: shared(bc, false) };
  return foil;
}

let radiator: THREE.CanvasTexture | null = null;
/** A radiator's optical solar reflectors: small silvered-glass tiles in rows. */
export function radiatorTexture(): THREE.CanvasTexture {
  if (radiator) return radiator;
  const N = 8, S = 32, W = N * S;
  const [c, g] = canvas(W, W);
  g.fillStyle = '#8f959c';
  g.fillRect(0, 0, W, W);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const v = 214 + Math.floor(hash21(i * 1.7, j * 2.3) * 26);
      g.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      g.fillRect(i * S + 1, j * S + 1, S - 2, S - 2);
    }
  }
  radiator = shared(c, true);
  return radiator;
}

/**
 * The materials a satellite is built from, one set per satellite (so the
 * satellite's own `dispose` may free them; the textures stay shared).
 */
export interface SpacecraftMaterials {
  /** gold MLI blanket */
  foil: THREE.MeshStandardMaterial;
  /** a radiator panel's mirror tiles */
  radiator: THREE.MeshStandardMaterial;
  /** the sun side of a solar array */
  cells: THREE.MeshStandardMaterial;
  /** the back of an array: its white substrate */
  substrate: THREE.MeshStandardMaterial;
  /** frames, hinges and booms */
  frame: THREE.MeshStandardMaterial;
}

export function spacecraftMaterials(): SpacecraftMaterials {
  const f = foilTextures();
  return {
    foil: new THREE.MeshStandardMaterial({ map: f.map, bumpMap: f.bump, bumpScale: 1.5, metalness: 0.85, roughness: 0.32 }),
    radiator: new THREE.MeshStandardMaterial({ map: radiatorTexture(), metalness: 0.55, roughness: 0.16 }),
    // a faint glow of its own keeps the array readable on the night side
    cells: new THREE.MeshStandardMaterial({ map: solarCellTexture(), metalness: 0.35, roughness: 0.22, emissive: 0x050a1c }),
    substrate: new THREE.MeshStandardMaterial({ color: 0xd8d4ca, metalness: 0.05, roughness: 0.8 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x4a505c, metalness: 0.4, roughness: 0.6 }),
  };
}

/**
 * Scale a geometry's UVs face by face so a tiled texture keeps its size in
 * metres. `faces` gives, for each of the geometry's groups in order, the size
 * of the face along its u and its v, m.
 */
function tileUvs(geo: THREE.BufferGeometry, faces: [number, number][], tiles: number | number[]): void {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  geo.groups.forEach((group, i) => {
    const [su, sv] = faces[i] ?? faces[faces.length - 1];
    const tile = typeof tiles === 'number' ? tiles : tiles[i] ?? tiles[tiles.length - 1];
    const index = geo.index;
    const seen = new Set<number>();
    for (let k = group.start; k < group.start + group.count; k++) {
      const v = index ? index.getX(k) : k;
      if (seen.has(v)) continue;
      seen.add(v);
      uv.setXY(v, (uv.getX(v) * su) / tile, (uv.getY(v) * sv) / tile);
    }
  });
  uv.needsUpdate = true;
}

/**
 * A box whose faces take the materials of `faces` in three's order (+x, −x,
 * +y, −y, +z, −z), with its UVs tiled at `tile` metres (one for every face, or
 * one per face in the same order).
 */
export function tiledBox(w: number, h: number, d: number, faces: THREE.Material | THREE.Material[], tile: number | number[]): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  // BoxGeometry lays u, v along (z, y) on ±x, (x, z) on ±y and (x, y) on ±z
  tileUvs(geo, [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]], tile);
  return new THREE.Mesh(geo, faces);
}

/** A cylinder with its side tiled at `tile` metres (its caps at the same scale). */
export function tiledCylinder(rTop: number, rBottom: number, h: number, segments: number, faces: THREE.Material | THREE.Material[], tile: number, open = false): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, segments, 1, open);
  const round = Math.PI * (rTop + rBottom);
  tileUvs(geo, [[round, h], [2 * rTop, 2 * rTop], [2 * rBottom, 2 * rBottom]], tile);
  return new THREE.Mesh(geo, faces);
}

/**
 * A flat solar panel, `w` × `h` × `d` m: cells on the face across its thinnest
 * axis that looks along that axis's + direction, the substrate behind it, and
 * the frame round its edges.
 */
export function cellPanel(w: number, h: number, d: number, m: SpacecraftMaterials): THREE.Mesh {
  const thin = w <= h && w <= d ? 0 : h <= d ? 1 : 2;
  const faces: THREE.Material[] = [m.frame, m.frame, m.frame, m.frame, m.frame, m.frame];
  faces[thin * 2] = m.cells;
  faces[thin * 2 + 1] = m.substrate;
  return tiledBox(w, h, d, faces, CELL_TILE);
}
