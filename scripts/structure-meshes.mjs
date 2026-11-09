/**
 * The Structure section's Soyuz-2.1b / Fregat / ST31 model (src/structure/,
 * src/render/structure-mesh.ts), made from the owner's Anatomy page beside it:
 *
 *   node scripts/structure-meshes.mjs          (npm run structure)
 *
 * Run it again whenever public/anatomy/soyuz-2-1b-fregat-st31.html is
 * replaced. It writes into public/structure/:
 *
 *   soyuz-2-1b-fregat-st31.json        the page's own Thai guide (components,
 *                                      their groups, facts, notes and sources),
 *                                      and one record per part of the model
 *                                      (its permanent id, the assembly it
 *                                      belongs to, its kind and role, the
 *                                      half the page's cutaway hides, the
 *                                      model-maker's scope note, its circuits)
 *   soyuz-2-1b-fregat-st31.<layer>.bin the triangles of each part, in three
 *                                      layers fetched only when needed:
 *                                      `outer` (skins, structure and the
 *                                      engine bells seen from outside),
 *                                      `inner` (tanks, bottles, supports,
 *                                      lines inside the bodies) and `engine`
 *                                      (pumps, turbines, feeds and frames)
 *
 * Every file records the page's SHA-256, so tests/structure-model.test.ts
 * tells a file that no longer matches its page, and the viewer refuses to mix
 * layers of two pages.
 *
 * As scripts/anatomy-meshes.mjs does, the triangles are the page's own: its
 * model code (`SoyuzSceneCodec`, `buildSoyuzMeshes`,
 * `createSoyuzRenderer.math.materialOf`) is run in a fresh `vm` context, apart
 * from this script's globals. `vm` is not a sandbox (Node's own documentation
 * says so): run this only on the owner's pages.
 *
 * What is kept so the section can select and assemble what it shows: every
 * part keeps its own id (the page's), and each vertex carries the index of its
 * part (`item`), so merging parts into a few meshes per assembly for speed
 * never loses which part a picked triangle belongs to. Each assembly's
 * "apart" offset (`move`) and the fairing halves' opening offset (`reveal`)
 * are the page's own.
 *
 * Bin format (little-endian): "OLSX", u32 format version, u32 header length,
 * the header as UTF-8 JSON padded to 4 bytes, then the buffers the header
 * points into, each padded to 4 bytes. Per mesh of V vertices and I indices,
 * in byte planes (which gzip packs well), as scripts/anatomy-meshes.mjs lays
 * them out:
 *   positions: u16 over the assembly's box (`min` + q × `step`), as each
 *     axis's steps from the vertex before (mod 2^16), its V low bytes then
 *     its V high bytes, x then y then z;
 *   normals: i8 × 127, V of x, then V of y, then V of z;
 *   colours: u8 sRGB, V of r, then V of g, then V of b;
 *   items: u16 part index (into the JSON's `items`), as steps from the vertex
 *     before (mod 2^16), V low bytes then V high bytes;
 *   indices: one code each, 0 for the next vertex not yet used, else how far
 *     back from it; u16 or, `wide`, u32, as their byte planes, lowest first.
 * Units are metres; +Y is the page's +z (up), +X its +x and +Z its −y, as the
 * flight's exterior meshes (scripts/anatomy-meshes.mjs).
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = 'soyuz-2-1b-fregat-st31.html';
const OUT = join(root, 'public', 'structure');
const NAME = 'soyuz-2-1b-fregat-st31';

export const FORMAT_VERSION = 1;
/**
 * Radial segments per layer. The page draws 48, too many to fetch and draw on
 * a phone; the flight draws the outside at 24. The inside and the engines are
 * looked at from closer up but are many more parts: 16 keeps them round
 * without doubling the files.
 */
export const LAYER_SEGMENTS = { outer: 24, inner: 16, engine: 16 };
/**
 * …but the thrust chambers in `outer` at 16 too: 37 of them, each modelled
 * inside through its throat to the injector face, were half the outer
 * layer's triangles at 24.
 */
const CHAMBER_SEGMENTS = 16;
const CHAMBER_ROLES = new Set(['main-thrust-chamber', 'steering-thrust-chamber']);
const segmentsOf = (item, layer) => (layer === 'outer' && CHAMBER_ROLES.has(item.engineInfo?.role ?? '') ? CHAMBER_SEGMENTS : LAYER_SEGMENTS[layer]);

/**
 * The engine parts seen from outside, which go with the skins (`outer`): the
 * chambers and their jackets, which show below each block; the aft rim and
 * thrust platform, which close a block's bottom; Fregat's attitude thrusters
 * and its main chamber. The rest of the engines (pumps, turbines, feeds,
 * valves, frames) is the `engine` layer.
 */
const SEEN_ENGINE_ROLES = new Set([
  'main-thrust-chamber', 'steering-thrust-chamber', 'nozzle-exit-jacket-seam', 'throat-jacket-joint', 'jacket-joint',
  'control-nozzle-jacket', 'cooling-collector', 'steering-fuel-cooling-collector', 'vehicle-aft-interface',
  'vehicle-attachment-interface', 'hydrazine-attitude-thruster', 'injector-head', 'acs-manifold',
  'regenerative-cooling-collector', 'cooling-jacket-joint',
]);

export function layerOf(item) {
  if (item.kind === 'interior') return 'inner';
  if (item.kind === 'engine' && !SEEN_ENGINE_ROLES.has(item.engineInfo?.role ?? '')) return 'engine';
  return 'outer';
}

/** The assembly a part belongs to: its page part, the fairing split into its two halves. */
export function unitOf(item) {
  if (item.part === 'fairing') return String(item.half ?? '').startsWith('left') ? 'fairing-left' : 'fairing-right';
  return item.part;
}

export const UNITS = ['core', 'booster-b', 'booster-v', 'booster-g', 'booster-d', 'interstage', 'stage3', 'fregat', 'payload', 'fairing-left', 'fairing-right'];

/** The page's own model code (scene codec, mesher, renderer's materials), run in an empty context. */
function pageModel(html) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const code = scripts.find((s) => s.includes('buildSoyuzMeshes'));
  if (!code) throw new Error('no model script in the page');
  const end = code.indexOf('/* Thai Anatomy controller');
  if (end < 0) throw new Error('the page\'s script has no controller marker');
  const context = vm.createContext({});
  vm.runInContext(`globalThis.globalThis = globalThis;\n${code.slice(0, end)}`, context, { timeout: 120_000 });
  const { SoyuzSceneCodec, buildSoyuzMeshes, createSoyuzRenderer } = context;
  if (!SoyuzSceneCodec || !buildSoyuzMeshes || !createSoyuzRenderer?.math?.materialOf) throw new Error('the page\'s model code is not the expected one');
  const json = (id) => JSON.parse(html.match(new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)</script>`))[1]);
  const data = json('anatomy-3d-data');
  if (data.encoding !== 'gzip+base64') throw new Error(`unexpected scene encoding ${data.encoding}`);
  const packed = JSON.parse(gunzipSync(Buffer.from(data.data, 'base64')).toString('utf8'));
  return {
    scene: SoyuzSceneCodec.unpack(packed.scene), buildSoyuzMeshes, materialOf: createSoyuzRenderer.math.materialOf,
    content: json('anatomy-content'), identity: json('anatomy-build-identity'),
  };
}

/** The page's 0.1 m, z up, to metres, y up (as scripts/anatomy-meshes.mjs). */
const toFlight = (x, y, z) => [x / 10, z / 10, -y / 10];
const round = (v, d = 4) => +v.toFixed(d);
const vec = (v) => toFlight(...v).map((x) => round(x));

function packSteps16(values, count) {
  const out = new Uint8Array(count * 2);
  let prev = 0;
  for (let v = 0; v < count; v++) {
    const d = (values[v] - prev) & 0xffff;
    prev = values[v];
    out[v] = d & 0xff;
    out[count + v] = d >> 8;
  }
  return out;
}

function packIndices(index, wide) {
  const size = wide ? 4 : 2, count = index.length, out = new Uint8Array(count * size);
  let next = 0;
  for (let i = 0; i < count; i++) {
    let code = 0;
    if (index[i] === next) next++;
    else if ((code = next - index[i]) <= 0) throw new Error('indices are not in first-use order');
    for (let b = 0; b < size; b++) out[b * count + i] = (code >>> (8 * b)) & 0xff;
  }
  return out;
}

/**
 * Weld one mesh's triangle soup (equal part, colour, position and normal),
 * quantize it over `box` and pack its planes. Vertices of two parts are never
 * welded, so every vertex has one part.
 */
function weld(g, box) {
  const map = new Map(), pos = [], nor = [], col = [], itm = [], index = [];
  for (let t = 0; t < g.p.length / 3; t++) {
    const i = t * 3;
    const key = `${g.item[t]}|${g.c[i]},${g.c[i + 1]},${g.c[i + 2]}|${Math.round(g.p[i] * 1e5)},${Math.round(g.p[i + 1] * 1e5)},${Math.round(g.p[i + 2] * 1e5)}|`
      + `${Math.round(g.n[i] * 500)},${Math.round(g.n[i + 1] * 500)},${Math.round(g.n[i + 2] * 500)}`;
    let v = map.get(key);
    if (v === undefined) {
      v = pos.length / 3;
      map.set(key, v);
      pos.push(g.p[i], g.p[i + 1], g.p[i + 2]);
      nor.push(g.n[i], g.n[i + 1], g.n[i + 2]);
      col.push(g.c[i], g.c[i + 1], g.c[i + 2]);
      itm.push(g.item[t]);
    }
    index.push(v);
  }
  const vertices = pos.length / 3;
  const step = box.min.map((m, a) => Math.max(1e-9, (box.max[a] - m) / 65535));
  const q = new Uint16Array(pos.length);
  for (let i = 0; i < pos.length; i++) q[i] = Math.max(0, Math.min(65535, Math.round((pos[i] - box.min[i % 3]) / step[i % 3])));
  const qp = new Uint8Array(vertices * 6);
  for (let a = 0; a < 3; a++) qp.set(packSteps16(Array.from({ length: vertices }, (_, v) => q[v * 3 + a]), vertices), a * 2 * vertices);
  const n = new Int8Array(vertices * 3), c = new Uint8Array(vertices * 3);
  for (let v = 0; v < vertices; v++) for (let a = 0; a < 3; a++) {
    n[a * vertices + v] = Math.round(Math.max(-1, Math.min(1, nor[v * 3 + a])) * 127);
    c[a * vertices + v] = col[v * 3 + a];
  }
  const wide = vertices > 65535;
  return { vertices, indices: index.length, step, q: qp, n, c, item: packSteps16(itm, vertices), idx: packIndices(index, wide), wide };
}

const hex = (srgb) => `#${srgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('')}`;

/** A layer file: the parts' meshes, one per assembly and material, gzip-compressed. */
function layerFile(layer, entries, source) {
  const materials = [], materialIndex = new Map();
  /** unit → material index → { p, n, c, item } */
  const groups = new Map();
  for (const { index, mesh, material } of entries) {
    const unit = unitOf(mesh);
    const key = `${material.name}`;
    if (!materialIndex.has(key)) {
      materialIndex.set(key, materials.length);
      materials.push({ name: material.name, color: hex(material.srgb), roughness: material.roughness, metalness: material.metalness });
    }
    const mi = materialIndex.get(key);
    if (!groups.has(unit)) groups.set(unit, new Map());
    const byMaterial = groups.get(unit);
    if (!byMaterial.has(mi)) byMaterial.set(mi, { p: [], n: [], c: [], item: [] });
    const g = byMaterial.get(mi);
    const tones = mesh.toneFactors;
    for (let t = 0; t < mesh.positions.length / 9; t++) {
      const tone = tones[t * 3] ?? 1;
      const rgb = material.srgb.map((v) => Math.round(Math.min(0.97, Math.max(0.02, v * tone)) * 255));
      for (let k = 0; k < 3; k++) {
        const o = (t * 3 + k) * 3;
        g.p.push(...toFlight(mesh.positions[o], mesh.positions[o + 1], mesh.positions[o + 2]));
        g.n.push(...toFlight(mesh.normals[o], mesh.normals[o + 1], mesh.normals[o + 2]).map((v) => v * 10));
        g.c.push(...rgb);
      }
      g.item.push(index);
    }
  }
  const buffers = [];
  let offset = 0;
  const put = (typed) => {
    const at = offset;
    const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    const pad = (4 - (buf.length % 4)) % 4;
    buffers.push(buf, Buffer.alloc(pad));
    offset += buf.length + pad;
    return at;
  };
  const meshes = [];
  let triangles = 0;
  for (const unit of UNITS) {
    const byMaterial = groups.get(unit);
    if (!byMaterial) continue;
    const box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const g of byMaterial.values()) for (let i = 0; i < g.p.length; i++) {
      const a = i % 3;
      box.min[a] = Math.min(box.min[a], g.p[i]);
      box.max[a] = Math.max(box.max[a], g.p[i]);
    }
    for (const [material, g] of byMaterial) {
      const w = weld(g, box);
      triangles += w.indices / 3;
      meshes.push({
        unit, material, vertices: w.vertices, indices: w.indices, min: box.min.map((v) => round(v, 6)), step: w.step,
        position: put(w.q), normal: put(w.n), color: put(w.c), item: put(w.item), index: put(w.idx), wide: w.wide,
      });
    }
  }
  const header = { format: 'orbitlab-structure-layer', version: FORMAT_VERSION, source, layer, units: 'm', radialSegments: LAYER_SEGMENTS[layer], materials, meshes, triangles };
  let json = Buffer.from(JSON.stringify(header), 'utf8');
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const lead = Buffer.alloc(12);
  lead.write('OLSX', 0, 'ascii');
  lead.writeUInt32LE(FORMAT_VERSION, 4);
  lead.writeUInt32LE(json.length, 8);
  const raw = Buffer.concat([lead, json, ...buffers]);
  // Node writes no timestamp into a gzip header: the same page makes the same file
  return { bytes: gzipSync(raw, { level: 9 }), raw: raw.length, triangles, meshes: meshes.length };
}

/** The parts' records and the page's guide, as the section reads them (src/structure/soyuz-content.ts). */
function contentFile(scene, content, identity, source) {
  const index = new Map(scene.items.map((it, i) => [it.id, i]));
  const scopes = [], scopeIndex = new Map();
  const scopeOf = (s) => {
    if (!s) return -1;
    if (!scopeIndex.has(s)) { scopeIndex.set(s, scopes.length); scopes.push(s); }
    return scopeIndex.get(s);
  };
  const items = scene.items.map((it) => {
    const info = it.engineInfo ?? {};
    const targets = (info.mount?.targets ?? []).map((t) => index.get(t)).filter((t) => t !== undefined);
    return {
      id: it.id, unit: unitOf(it), kind: it.kind, layer: layerOf(it),
      ...(it.half ? { half: it.half } : {}),
      ...(info.role ? { role: info.role } : {}),
      ...(info.materialRole ? { material: info.materialRole } : {}),
      ...(info.model ? { model: info.model } : {}),
      ...(scopeOf(info.scope) >= 0 ? { scope: scopeOf(info.scope) } : {}),
      ...(info.circuitIds?.length ? { circuits: info.circuitIds } : {}),
      ...(targets.length ? { mounts: targets } : {}),
      center: vec(it.center),
    };
  });
  const units = {};
  for (const unit of UNITS) {
    const members = scene.items.filter((it) => unitOf(it) === unit);
    const moves = new Set(members.map((it) => JSON.stringify(it.move)));
    if (moves.size !== 1) throw new Error(`${unit}: its parts move apart by ${moves.size} offsets, not one`);
    const reveal = members.find((it) => it.reveal)?.reveal;
    units[unit] = { move: vec(members[0].move), ...(reveal ? { reveal: vec(reveal) } : {}), parts: members.length };
  }
  const components = content.components.map((c) => ({
    id: c.id, title: c.title, subtitle: c.subtitle ?? '', body: c.body ?? c.description ?? '', facts: c.facts ?? [],
    note: c.note ?? '', sourceIds: [...new Set([...(c.sourceIds ?? []), ...(c.sources ?? [])])],
    observations: c.observations ?? [],
    groups: (c.groups ?? []).map((g) => ({
      id: g.id, label: g.label, count: g.count, unit: g.unit, ...(g.ru ? { ru: g.ru } : {}),
      items: g.ids.map((id) => {
        const i = index.get(id);
        if (i === undefined) throw new Error(`${c.id}/${g.id}: ${id} is not a part of the model`);
        return i;
      }),
    })),
  }));
  return {
    format: 'orbitlab-structure-content', version: FORMAT_VERSION, source,
    units: 'm', axes: '+Y up; +X the page\'s +x; +Z the page\'s −y',
    guide: {
      title: content.title, subtitle: content.subtitle, configuration: content.configuration, intro: content.intro,
      statusNote: content.statusNote, reviewWarnings: content.reviewWarnings, geometryReference: content.geometryReference,
      summaryStats: content.summaryStats, timeline: content.timeline,
    },
    sources: content.sources,
    circuits: (content.circuits ?? []).map((c) => ({
      id: c.id, label: c.label, description: c.description, confidence: c.confidence, limitation: c.limitation, sourceIds: c.sourceIds ?? [],
    })),
    components, scopes, units: units, items,
    pageBuild: { app: content.appVersion, version: identity.version, scene: identity.sceneSha256 },
  };
}

export function exportStructure() {
  const path = join(root, 'public', 'anatomy', PAGE);
  const bytes = readFileSync(path);
  const html = bytes.toString('utf8');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const { scene, buildSoyuzMeshes, materialOf, content, identity } = pageModel(html);
  const source = { file: `anatomy/${PAGE}`, sha256, title: html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '' };
  mkdirSync(OUT, { recursive: true });
  const doc = contentFile(scene, content, identity, source);
  // the units' "units" key is the JSON's length unit; the assemblies go under `assemblies`
  const { units: assemblies, ...rest } = doc;
  const json = { ...rest, units: 'm', assemblies };
  writeFileSync(join(OUT, `${NAME}.json`), `${JSON.stringify(json)}\n`);
  console.log(`${NAME}.json: ${scene.items.length} parts, ${(JSON.stringify(json).length / 1000).toFixed(1)} kB`);
  for (const layer of Object.keys(LAYER_SEGMENTS)) {
    const chosen = scene.items.map((it, i) => ({ it, i })).filter(({ it }) => layerOf(it) === layer);
    const entries = [];
    for (const segments of new Set(chosen.map(({ it }) => segmentsOf(it, layer)))) {
      const these = chosen.filter(({ it }) => segmentsOf(it, layer) === segments);
      const meshes = buildSoyuzMeshes({ ...scene, items: these.map(({ it }) => it) }, { radialSegments: segments });
      meshes.forEach((mesh, k) => entries.push({ index: these[k].i, mesh, material: materialOf(mesh) }));
    }
    entries.sort((a, b) => a.index - b.index);
    const file = layerFile(layer, entries, source);
    writeFileSync(join(OUT, `${NAME}.${layer}.bin`), file.bytes);
    console.log(`${NAME}.${layer}.bin: ${chosen.length} parts, ${file.triangles} triangles, ${file.meshes} meshes, `
      + `${(file.raw / 1000).toFixed(1)} kB, ${(file.bytes.length / 1000).toFixed(1)} kB gzip`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) exportStructure();
