/**
 * The Structure section's model files (public/structure/): fetched when the
 * section opens a model, never precached (src/pwa/manifest.ts), and read
 * into geometry here. The layer format is documented in
 * scripts/structure-meshes.mjs.
 *
 * Every vertex keeps its part's index (`item`), so the merged meshes still
 * say which part a picked triangle is, and the viewer (structure-viewer.ts)
 * can show, hide, see through or colour each part on its own.
 */
import * as THREE from 'three';

export const STRUCTURE_FORMAT_VERSION = 1;

export interface StructureMaterial { name: string; color: string; roughness: number; metalness: number }

export interface StructureMesh {
  /** the assembly it belongs to */
  unit: string;
  /** index into the layer's materials */
  material: number;
  /** position, normal, `tint` (sRGB, normalized u8) and `item` (u16 part index) */
  geometry: THREE.BufferGeometry;
}

export interface StructureLayerData {
  layer: string;
  source: { file: string; sha256: string; title: string };
  materials: StructureMaterial[];
  meshes: StructureMesh[];
  triangles: number;
}

interface HeaderMesh {
  unit: string; material: number; vertices: number; indices: number; min: number[]; step: number[];
  position: number; normal: number; color: number; item: number; index: number; wide: boolean;
}

/** Read an (inflated) layer file. Pure but for three's `BufferGeometry`, so it runs under test. */
export function decodeStructureLayer(buffer: ArrayBuffer): StructureLayerData {
  const view = new DataView(buffer), bytes = new Uint8Array(buffer);
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== 'OLSX') throw new Error('not an Orbitlab structure layer file');
  const version = view.getUint32(4, true);
  if (version !== STRUCTURE_FORMAT_VERSION) throw new Error(`structure layer format ${version}, expected ${STRUCTURE_FORMAT_VERSION}`);
  const length = view.getUint32(8, true);
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(12, 12 + length))) as {
    layer: string; source: StructureLayerData['source']; materials: StructureMaterial[]; meshes: HeaderMesh[]; triangles: number;
  };
  const body = 12 + length;
  const steps16 = (at: number, count: number, out: Uint16Array | Float32Array, stride: number, offset: number, scale?: [number, number]) => {
    let q = 0;
    const lo = body + at, hi = lo + count;
    for (let v = 0; v < count; v++) {
      q = (q + (bytes[lo + v] | (bytes[hi + v] << 8))) & 0xffff;
      out[v * stride + offset] = scale ? scale[0] + q * scale[1] : q;
    }
  };
  const meshes = header.meshes.map((m): StructureMesh => {
    const V = m.vertices, I = m.indices;
    const positions = new Float32Array(V * 3), normals = new Float32Array(V * 3), tint = new Uint8Array(V * 3), item = new Uint16Array(V);
    for (let a = 0; a < 3; a++) steps16(m.position + a * 2 * V, V, positions, 3, a, [m.min[a], m.step[a]]);
    const n = new Int8Array(buffer, body + m.normal, V * 3);
    for (let a = 0; a < 3; a++) for (let v = 0; v < V; v++) {
      normals[v * 3 + a] = n[a * V + v] / 127;
      tint[v * 3 + a] = bytes[body + m.color + a * V + v];
    }
    steps16(m.item, V, item, 1, 0);
    const size = m.wide ? 4 : 2, at = body + m.index;
    const index = m.wide ? new Uint32Array(I) : new Uint16Array(I);
    for (let i = 0, next = 0; i < I; i++) {
      let code = 0;
      for (let b = 0; b < size; b++) code |= bytes[at + b * I + i] << (8 * b);
      index[i] = code === 0 ? next++ : next - (code >>> 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('tint', new THREE.BufferAttribute(tint, 3, true));
    geometry.setAttribute('item', new THREE.BufferAttribute(item, 1));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    return { unit: m.unit, material: m.material, geometry };
  });
  return { layer: header.layer, source: header.source, materials: header.materials, meshes, triangles: header.triangles };
}

/** Fetch an app file, failing on an HTTP error; `signal` cancels it (the section closed meanwhile). */
async function fetchFile(path: string, signal: AbortSignal, base: string | URL): Promise<Response> {
  const r = await fetch(new URL(path, base), { signal });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r;
}

/** A layer file, fetched, inflated (`inflate`: the app's gzip reader, src/structure/env.ts) and decoded. */
export async function fetchStructureLayer(
  path: string, signal: AbortSignal, inflate: (buffer: ArrayBuffer) => Promise<ArrayBuffer>, base: string | URL = document.baseURI,
): Promise<StructureLayerData> {
  const r = await fetchFile(path, signal, base);
  return decodeStructureLayer(await inflate(await r.arrayBuffer()));
}

/** A content file (JSON), fetched. */
export async function fetchStructureJson(path: string, signal: AbortSignal, base: string | URL = document.baseURI): Promise<unknown> {
  const r = await fetchFile(path, signal, base);
  return r.json();
}
