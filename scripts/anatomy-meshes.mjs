/**
 * The Soyuz exterior meshes the flight draws (src/render/anatomy.ts), made
 * from the owner's Soyuz Anatomy pages in public/anatomy/:
 *
 *   node scripts/anatomy-meshes.mjs          (npm run anatomy)
 *
 * Run it again whenever one of those pages is replaced. It writes one
 * `<page>.exterior.bin` beside each page, holding the page's SHA-256, so
 * tests/anatomy.test.ts can tell a mesh file that no longer matches
 * its page.
 *
 * Each page carries its own model: a compressed "semantic scene" of the
 * vehicle's solids and the viewer's code that turns it into triangles
 * (`SoyuzSceneCodec`, `buildSoyuzMeshes`) and colours them
 * (`createSoyuzRenderer.math.materialOf`). Building the triangles takes the
 * viewer 10–20 s, too long for a launch, so it is done here, once, with the
 * page's own code run in a fresh `vm` context, apart from this script's
 * globals (no `require` in it): the meshes are the page's, not a copy of its
 * geometry. `vm` is not a sandbox (Node's own documentation says so): run
 * this only on the owner's pages, as `npm run anatomy` does.
 *
 * Only what is seen from outside goes into the flight: the skins and the
 * structure (the parts' `shell` and `structural` hosts), the few inside hosts
 * that close a body's ends (`CLOSURE`, Blok I's tanks), Blok I's aft bay, the
 * fairing in its two halves, the escape tower and the spacecraft. The pipes
 * and the engines' insides stay in the page, which Build shows whole. The
 * engine bells are not taken either: the flight draws its own, which gimbal
 * and glow with the physics, where the header's `nozzles` say the model's are
 * (Blok I's chambers on the `bay`, Fregat's on `fregat`, Blok A's and the
 * strap-on's on `core` and `booster` for the spent ones' bells, and the
 * escape tower's jettison nozzles, for its fire, on `escape`).
 *
 * Output: the file below, gzip-compressed (the site's host sends `.bin` as it
 * is; render/anatomy.ts inflates it). Inside (little-endian): "OLAX", u32
 * format version, u32 header length, the header as UTF-8 JSON padded to 4
 * bytes, then the buffers the header points into, each padded to 4 bytes. Per
 * mesh of V vertices and I indices, laid out in byte planes, which gzip packs
 * about four times tighter than the plain arrays:
 *   positions: u16 over the mesh's box (`min` + q × `step`), as each axis's
 *     steps from the vertex before (mod 2^16), its V low bytes then its V
 *     high bytes, x then y then z;
 *   normals: i8 × 127, V of x, then V of y, then V of z;
 *   indices: one code each, 0 for the next vertex not yet used (the welder
 *     numbers them in their first use), else how far back from it; u16 or,
 *     `wide`, u32, as their byte planes, lowest first.
 * Units are metres; +Y is the anatomy's +z (up), +X its +x and +Z its −y, so
 * the model stands as the flight's does.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public', 'anatomy');

/**
 * The radial segments a full circle is cut into: 24, the owner's choice
 * (chat, 2026-10-28: "ใช้แบบ24ส่วน"); the page draws 48, too many triangles to
 * build or draw in a launch, and the flight sees the vehicle from metres away
 * at the closest.
 */
export const RADIAL_SEGMENTS = 24;
/** …and in Blok I's aft bay, the engine's pipes and pumps, the same. */
export const BAY_SEGMENTS = 24;
export const FORMAT_VERSION = 2;

/**
 * The pages and what each carries above Blok I. `payload`: the spacecraft's
 * parts, drawn as the mission's spacecraft (none for the Fregat page, whose
 * payload is a stand-in: the flight draws the mission's own satellite).
 */
const PAGES = [
  { file: 'soyuz-2-1a-soyuz-ms.html', variant: 'soyuz-ms', payload: ['soyuz-service', 'soyuz-descent', 'soyuz-orbital'] },
  { file: 'soyuz-2-1a-progress-ms-26.html', variant: 'progress-ms-26', payload: ['progress-service', 'progress-refueling', 'progress-cargo'] },
  { file: 'soyuz-2-1b-fregat-st31.html', variant: 'fregat-st31', payload: [] },
];

/** Hosts the flight already draws itself: Fregat's main engine, a bell which glows with the physics. */
const DRAWN_BY_THE_FLIGHT = /(?:s592-main-chamber|s592-jacket-seam|s592-head-flange|s592-cooling-collector)/;
/** Blok I's aft skirt (the Fregat page's RD-0124 Blok I): a part of its own, shed when the flight sheds its skirt. */
const SKIRT = /skirt-panel-\d+/;
/**
 * Blok I's thrust chambers (RD-0110's four mains and four verniers, RD-0124's
 * four): the flight draws them as its own bells, which gimbal and glow with
 * the physics, put where these are (the `bay` part's `nozzles`).
 */
const CHAMBER = /^stage3\.(?:rd\d+-)?(main|vernier)-nozzle-(\d+)$/;
/** …and the rings on those chambers' walls, which would float without them. */
const CHAMBER_RING = /^stage3\.(?:rd\d+-)?(?:nozzle-\d+-jacket|vernier-jacket-\d+|throat-jacket-\d+|nozzle-lip-\d+|cooling-collector-\d+)/;
/** Blok I's tanks: from its bottom up to the lowest of them the stage is seen into once it is open below; their domes close its ends. */
const TANK = /^stage3\.(?:rd\d+-)?(?:oxygen|lox|kerosene|fuel)-tank$/;
/**
 * The inside hosts that close a body's ends, without which it is an open
 * tube seen through from below or through the open truss: the strap-ons' and
 * Blok A's aft rim and thrust platform, Blok A's oxygen tank (its dome under
 * the truss) and the guidance deck over it, the Progress's aft thrust deck.
 */
const CLOSURE = /^(?:(?:booster-b|core)\.(?:aft-rim(?:\.(?:front|back))?|thrust-platform)|core\.(?:oxygen-tank|guidance-deck)|progress-service\.aft-thrust-deck(?:\.(?:front|back))?)$/;
/** Fregat's main chamber (S5.92), whose place the flight's bell takes. */
const FREGAT_CHAMBER = /^fregat\.s592-main-chamber$/;
/**
 * Blok A's and the strap-on's chambers (RD-108A's and RD-107A's four and
 * their verniers): the stack draws its own bells, and a spent one is drawn
 * with bells where these are (render/debris.ts), not with empty sockets.
 */
const STACK_CHAMBER = /^(core|booster-b)\.(main|vernier)-nozzle-(\d+)$/;
/** The escape tower's jettison motor's nozzles, where its fire comes from when it pulls the tower away. */
const JETTISON = /^escape\.jettison-nozzle-(\d+)$/;

/**
 * Which flight part a host goes into, or null to leave it out. `bay`: Blok
 * I's hosts' heights and reach from the axis, the top of its aft bay (its
 * lowest tank's bottom) and that tank's radius: everything below the top, of
 * any kind but the chambers and the skin, is the bay's — the engine's pumps
 * and pipes, the thrust frame, the helium bottles and the tank's lower dome —
 * which the open truss and, once Blok A has gone, the stage's open bottom
 * show; but not an inside pipe that runs up beside the tank, outside its wall
 * (the 2.1b's helium pressurisation lines): the page draws those only in its
 * cutaway, and below the skin, once the skirt has gone, one would hang in the
 * open. Above the top only the skin and the structure.
 */
function flightPart(item, page, bay) {
  const { part, kind, id } = item;
  if (DRAWN_BY_THE_FLIGHT.test(id)) return null;
  const outside = kind === 'shell' || kind === 'structural';
  const closes = CLOSURE.test(id);
  if (part === 'booster-b') return outside || closes ? 'booster' : null;
  if (part.startsWith('booster-')) return null; // the other three are booster-b turned (checked below)
  if (part === 'core' || part === 'interstage') return outside || closes ? 'core' : null;
  if (part === 'stage3') {
    if (CHAMBER.test(id) || CHAMBER_RING.test(id)) return null;
    if (SKIRT.test(id)) return 'skirt';
    if (kind === 'shell') return 'stage3';
    const at = bay.extent.get(id);
    if (at.lo <= bay.top + 1e-3) return kind === 'interior' && !TANK.test(id) && at.r > bay.tankR + 1e-3 ? null : 'bay';
    return kind === 'structural' || TANK.test(id) ? 'stage3' : null;
  }
  if (part === 'fregat') return kind === 'interior' ? null : 'fregat';
  if (part === 'fairing') return String(item.half ?? '').startsWith('left') ? 'fairing-left' : 'fairing-right';
  if (part === 'escape') return 'escape';
  if (page.payload.includes(part)) return outside || closes || item.engineInfo?.progressMotion ? 'payload' : null;
  return null;
}

/** The page's own model code (pose math, scene codec, mesher, renderer), run in an empty context. */
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
  const data = JSON.parse(html.match(/<script id="anatomy-3d-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  if (data.encoding !== 'gzip+base64') throw new Error(`unexpected scene encoding ${data.encoding}`);
  const packed = JSON.parse(gunzipSync(Buffer.from(data.data, 'base64')).toString('utf8'));
  return { scene: SoyuzSceneCodec.unpack(packed.scene), buildSoyuzMeshes, materialOf: createSoyuzRenderer.math.materialOf };
}

/** Anatomy (0.1 m, z up) to the flight's metres, y up. */
const toFlight = (x, y, z) => [x / 10, z / 10, -y / 10];

const hex = (srgb) => `#${srgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('')}`;

/** A Progress hinge chain in flight axes: each rotation about its own pivot, in turn, as the page applies them. */
const flightRotations = (rotations) => rotations.map((r) => ({
  pivot: toFlight(...r.pivot), axis: [r.axis[0], r.axis[2], -r.axis[1]], angle: r.angle,
}));

/** Quantized positions (u16 × 3 per vertex) as the format's byte planes of steps. */
function packPositions(q, vertices) {
  const out = new Uint8Array(vertices * 6);
  for (let a = 0; a < 3; a++) {
    let prev = 0;
    for (let v = 0; v < vertices; v++) {
      const d = (q[v * 3 + a] - prev) & 0xffff;
      prev = q[v * 3 + a];
      out[a * 2 * vertices + v] = d & 0xff;
      out[(a * 2 + 1) * vertices + v] = d >> 8;
    }
  }
  return out;
}

/** Indices in first-use order as the format's codes, in byte planes. */
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
 * Weld a triangle soup (equal position and normal), quantize it over `box`
 * (its own box if none: a part's meshes share the part's, so a corner they
 * share lands on the same point in each) and return the mesh's packed arrays
 * and what its header entry needs.
 */
function weld(positions, normals, box = null) {
  const keyOf = (i) => `${Math.round(positions[i] * 1e5)},${Math.round(positions[i + 1] * 1e5)},${Math.round(positions[i + 2] * 1e5)},`
    + `${Math.round(normals[i] * 500)},${Math.round(normals[i + 1] * 500)},${Math.round(normals[i + 2] * 500)}`;
  const map = new Map(), pos = [], nor = [], index = [];
  for (let i = 0; i < positions.length; i += 3) {
    const key = keyOf(i);
    let v = map.get(key);
    if (v === undefined) {
      v = pos.length / 3;
      map.set(key, v);
      pos.push(positions[i], positions[i + 1], positions[i + 2]);
      nor.push(normals[i], normals[i + 1], normals[i + 2]);
    }
    index.push(v);
  }
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  if (box) { min.splice(0, 3, ...box.min); max.splice(0, 3, ...box.max); }
  else for (let i = 0; i < pos.length; i++) { const a = i % 3; if (pos[i] < min[a]) min[a] = pos[i]; if (pos[i] > max[a]) max[a] = pos[i]; }
  const step = min.map((m, a) => Math.max(1e-9, (max[a] - m) / 65535));
  const q = new Uint16Array(pos.length);
  for (let i = 0; i < pos.length; i++) q[i] = Math.round((pos[i] - min[i % 3]) / step[i % 3]);
  const vertices = pos.length / 3;
  const n = new Int8Array(vertices * 3);
  for (let v = 0; v < vertices; v++) for (let a = 0; a < 3; a++) n[a * vertices + v] = Math.round(Math.max(-1, Math.min(1, nor[v * 3 + a])) * 127);
  const wide = vertices > 65535;
  return { vertices, indices: index.length, min, step, q: packPositions(q, vertices), n, idx: packIndices(index, wide), wide };
}

/**
 * Drop a part's hidden faces: two hosts butted together each bring the wall
 * that closes its own shell there, so the two coincide, facing opposite ways,
 * inside the vehicle; and some hosts are drawn twice over the same triangles.
 * Hidden or not, the walls show: the scene's depth is logarithmic, written
 * once per pixel, so with MSAA a wall standing on a skin edge wins some of
 * that pixel's samples and draws a light dash along the seam (the strap-ons'
 * cones were hatched with them). Both walls of each such pair go, matched by
 * their corners as triangles or, cut along either diagonal, as quads, or as
 * a face that opposite-facing faces on its plane cover whole (the area each
 * covers clipped exactly, so a face covered only in part stays); and every
 * copy but one of a repeated face; of faces on the same hinge (or none),
 * and only faces joined to the rest at an angle (a sheet with no thickness,
 * drawn as two faces, stays).
 * `groups`: the part's triangle soups ({ p, n, hinge }, flight metres),
 * filtered in place. Returns how many triangles went.
 */
function dropHiddenFaces(groups) {
  const R = 1e4;   // corners equal to 0.1 mm
  const cornerKey = (x, y, z) => `${Math.round(x * R)},${Math.round(y * R)},${Math.round(z * R)}`;
  /** every triangle: its group, offset, corner keys, unit normal and plane */
  const tris = [];
  groups.forEach((g, gi) => {
    for (let i = 0; i < g.p.length; i += 9) {
      const c = [0, 1, 2].map((k) => [g.p[i + 3 * k], g.p[i + 3 * k + 1], g.p[i + 3 * k + 2]]);
      const u = [0, 1, 2].map((a) => c[1][a] - c[0][a]), w = [0, 1, 2].map((a) => c[2][a] - c[0][a]);
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const len = Math.hypot(...n) || 1;
      tris.push({ gi, i, hinge: g.hinge, keys: c.map((q) => cornerKey(...q)), c, n: n.map((v) => v / len) });
    }
  });
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const drop = new Set();
  /** of faces found at one place (a triangle's or a quad's corners), drop both of each opposite pair, and repeats */
  const settle = (list) => {
    const gone = new Set();
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
      if (gone.has(a) || gone.has(b)) continue;
      // only faces that move together: a Progress array folded against the hull parts from it as it opens
      if (list[a].hinge !== list[b].hinge) continue;
      if (dot(list[a].n, list[b].n) < 0) { gone.add(a); gone.add(b); } else gone.add(b);
    }
    for (const x of gone) for (const t of list[x].tris) drop.add(t);
  };
  // the same three corners
  const byTriangle = new Map();
  tris.forEach((t, ti) => { const k = [...t.keys].sort().join('|'); if (!byTriangle.has(k)) byTriangle.set(k, []); byTriangle.get(k).push({ tris: [ti], n: t.n, hinge: t.hinge }); });
  for (const list of byTriangle.values()) if (list.length > 1) settle(list);
  // the same four corners, however the quad was cut into two triangles: two coplanar triangles sharing an edge
  const byEdge = new Map();
  tris.forEach((t, ti) => { for (let k = 0; k < 3; k++) { const e = [t.keys[k], t.keys[(k + 1) % 3]].sort().join('|'); if (!byEdge.has(e)) byEdge.set(e, []); byEdge.get(e).push(ti); } });
  const byQuad = new Map();
  for (const list of byEdge.values()) {
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
      const [s, t] = [tris[list[a]], tris[list[b]]];
      if (s.hinge !== t.hinge || dot(s.n, t.n) < 0.9999) continue;
      const far = t.c.find((q, k) => !s.keys.includes(t.keys[k]));
      if (!far || Math.abs(dot(s.n, far.map((v, k) => v - s.c[0][k]))) > 1e-4) continue;
      const corners = new Set([...s.keys, ...t.keys]);
      if (corners.size !== 4) continue;
      const k = [...corners].sort().join('|');
      if (!byQuad.has(k)) byQuad.set(k, []);
      byQuad.get(k).push({ tris: [list[a], list[b]], n: s.n, hinge: s.hinge });
    }
  }
  for (const list of byQuad.values()) if (list.length > 1) settle(list.filter((q) => !q.tris.some((ti) => drop.has(ti))));
  // the rest, cut up differently on each side (one host's wall in one piece, the other's in two): a face the faces
  // on the same plane facing the other way cover in all its area. A wall that stands out beyond the one butted
  // against it (a step to a thicker host), or a panel the cells on it cover only in part, stays.
  const byPlane = new Map();
  tris.forEach((t, ti) => {
    if (drop.has(ti)) return;
    const sign = Math.abs(t.n[0]) > 1e-6 ? Math.sign(t.n[0]) : Math.abs(t.n[1]) > 1e-6 ? Math.sign(t.n[1]) : Math.sign(t.n[2]);
    const m = t.n.map((v) => v * sign), d = dot(m, t.c[0]);
    const k = `${t.hinge}|${m.map((v) => Math.round(v * 1e3)).join(',')}|${Math.round(d * R)}`;
    if (!byPlane.has(k)) byPlane.set(k, { m, faces: [] });
    byPlane.get(k).faces.push({ ti, facing: sign });
  });
  for (const { m, faces } of byPlane.values()) {
    if (!faces.some((f) => f.facing > 0) || !faces.some((f) => f.facing < 0)) continue;
    // in the plane: drop the axis the normal leans on most
    const axis = Math.abs(m[0]) > Math.abs(m[1]) ? (Math.abs(m[0]) > Math.abs(m[2]) ? 0 : 2) : (Math.abs(m[1]) > Math.abs(m[2]) ? 1 : 2);
    const flat = (q) => [q[(axis + 1) % 3], q[(axis + 2) % 3]];
    const area2 = (poly) => { let a = 0; for (let k = 0; k < poly.length; k++) { const p1 = poly[k], p2 = poly[(k + 1) % poly.length]; a += p1[0] * p2[1] - p2[0] * p1[1]; } return a; };
    /** the part of convex polygon `poly` inside triangle `tri` (Sutherland-Hodgman), both in the plane */
    const clip = (poly, tri) => {
      const t = area2(tri) < 0 ? [...tri].reverse() : tri;
      let out = poly;
      for (let k = 0; k < 3 && out.length; k++) {
        const a = t[k], b = t[(k + 1) % 3], side = (q) => (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
        const next = [];
        for (let m = 0; m < out.length; m++) {
          const p1 = out[m], p2 = out[(m + 1) % out.length], s1 = side(p1), s2 = side(p2);
          if (s1 >= 0) next.push(p1);
          if ((s1 >= 0) !== (s2 >= 0)) { const u = s1 / (s1 - s2); next.push([p1[0] + (p2[0] - p1[0]) * u, p1[1] + (p2[1] - p1[1]) * u]); }
        }
        out = next;
      }
      return out;
    };
    for (const f of faces) {
      // wholly covered: the opposite faces (a triangulated surface, so not overlapping one another) cover all its area
      const tri = tris[f.ti].c.map(flat), whole = Math.abs(area2(tri));
      if (whole < 1e-12) continue;
      const lo = [Math.min(...tri.map((q) => q[0])), Math.min(...tri.map((q) => q[1]))], hi = [Math.max(...tri.map((q) => q[0])), Math.max(...tri.map((q) => q[1]))];
      let covered = 0;
      for (const g of faces) {
        if (g.facing === f.facing) continue;
        const o = tris[g.ti].c.map(flat);
        if (Math.max(...o.map((q) => q[0])) < lo[0] || Math.min(...o.map((q) => q[0])) > hi[0] || Math.max(...o.map((q) => q[1])) < lo[1] || Math.min(...o.map((q) => q[1])) > hi[1]) continue;
        const part = clip(tri, o);
        if (part.length >= 3) covered += Math.abs(area2(part));
      }
      // to a millionth (more than the whole, opposite faces overlapping each other, is not counted as covered)
      if (Math.abs(covered - whole) <= 1e-6 * whole) drop.add(f.ti);
    }
  }
  // but a sheet drawn as two opposite faces with no thickness (a fin, a thin panel) is not hidden: keep any dropped
  // face no edge of which it shares with a kept face standing at an angle to it (a wall shares its edges with skins)
  const sheet = [...drop].filter((ti) => !tris[ti].keys.some((key, k) => {
    const e = [key, tris[ti].keys[(k + 1) % 3]].sort().join('|');
    return (byEdge.get(e) ?? []).some((oi) => !drop.has(oi) && Math.abs(dot(tris[oi].n, tris[ti].n)) < 0.999);
  }));
  for (const ti of sheet) drop.delete(ti);
  const dropped = new Set([...drop].map((ti) => `${tris[ti].gi}:${tris[ti].i}`));
  groups.forEach((g, gi) => {
    const p = [], n = [];
    for (let i = 0; i < g.p.length; i += 9) {
      if (dropped.has(`${gi}:${i}`)) continue;
      p.push(...g.p.slice(i, i + 9));
      n.push(...g.n.slice(i, i + 9));
    }
    g.p = p;
    g.n = n;
  });
  return dropped.size;
}

/** Bounds of a list of flight-space triangle soups. */
function boundsOf(soups) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const s of soups) for (let i = 0; i < s.length; i++) { const a = i % 3; if (s[i] < min[a]) min[a] = s[i]; if (s[i] > max[a]) max[a] = s[i]; }
  return { min: min.map((v) => +v.toFixed(4)), max: max.map((v) => +v.toFixed(4)) };
}

/**
 * Booster-b turned 90°, 180° and 270° about the axis should be the other
 * three. Their hosts are cut into front and back halves for the page's view,
 * so the pieces differ; the shapes are compared instead: each booster's
 * outside surface area, its area-weighted centre and its box, turned back
 * onto b's. Returns the worst mismatch, m (area as a share).
 */
function boosterMismatch(scene, buildSoyuzMeshes) {
  const outside = (i) => i.kind === 'shell' || i.kind === 'structural';
  const shape = (part, turns) => {
    const meshes = buildSoyuzMeshes({ ...scene, items: scene.items.filter((i) => i.part === part && outside(i)) }, { radialSegments: 12 });
    let area = 0;
    const c = [0, 0, 0], min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    const turn = (x, y) => { for (let j = 0; j < turns; j++) [x, y] = [y, -x]; return [x, y]; };
    for (const m of meshes) {
      const p = m.positions;
      for (let k = 0; k < p.length; k += 9) {
        const v = [0, 3, 6].map((o) => { const [x, y] = turn(p[k + o], p[k + o + 1]); return [x / 10, y / 10, p[k + o + 2] / 10]; });
        const e1 = v[1].map((q, a) => q - v[0][a]), e2 = v[2].map((q, a) => q - v[0][a]);
        const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        const da = Math.hypot(...cr) / 2;
        area += da;
        for (let a = 0; a < 3; a++) c[a] += da * (v[0][a] + v[1][a] + v[2][a]) / 3;
        for (const q of v) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], q[a]); max[a] = Math.max(max[a], q[a]); }
      }
    }
    return { area, c: c.map((v) => v / area), min, max };
  };
  const b = shape('booster-b', 0);
  let worst = { area: 0, m: 0 };
  for (const [part, turns] of [['booster-v', 1], ['booster-g', 2], ['booster-d', 3]]) {
    const o = shape(part, turns);
    worst.area = Math.max(worst.area, Math.abs(o.area - b.area) / b.area);
    for (let a = 0; a < 3; a++) worst.m = Math.max(worst.m, Math.abs(o.c[a] - b.c[a]), Math.abs(o.min[a] - b.min[a]), Math.abs(o.max[a] - b.max[a]));
  }
  return worst;
}

/**
 * A chamber's or nozzle's place from its triangles (the page's units): the
 * centre and radius of its exit, the ring of its vertices within 1 cm of its
 * bottom, and the heights of that exit and of its top, in flight metres.
 */
function nozzleOf(positions, kind, index) {
  let lo = Infinity, hi = -Infinity;
  for (let k = 2; k < positions.length; k += 3) { lo = Math.min(lo, positions[k] / 10); hi = Math.max(hi, positions[k] / 10); }
  let sx = 0, sz = 0, n = 0;
  for (let k = 0; k < positions.length; k += 3) if (positions[k + 2] / 10 < lo + 0.01) { sx += positions[k] / 10; sz += -positions[k + 1] / 10; n++; }
  const x = sx / n, z = sz / n;
  let r = 0;
  for (let k = 0; k < positions.length; k += 3) if (positions[k + 2] / 10 < lo + 0.01) r = Math.max(r, Math.hypot(positions[k] / 10 - x, -positions[k + 1] / 10 - z));
  return { kind, index, x: +x.toFixed(4), z: +z.toFixed(4), r: +r.toFixed(4), exit: +lo.toFixed(4), top: +hi.toFixed(4) };
}

/**
 * A canted nozzle's mouth from the page's own frame for it (its shape's `F`:
 * origin and axis, and its profile `poly` of axial distance and radius): the
 * mouth's centre on its axis, its outer radius, the throat's height, and the
 * axis it fires along, in flight metres and axes. Null without that frame.
 */
function mouthOf(item, kind, index) {
  const shape = item.shapes?.find((s) => s.F?.o && s.F?.a && s.poly?.length);
  if (!shape) return null;
  const { o, a } = shape.F;
  const axial = Math.max(...shape.poly.map((p) => p[0]));
  const r = Math.max(...shape.poly.filter((p) => p[0] === axial).map((p) => p[1])) / 10;
  const [x, exit, z] = toFlight(o[0] + a[0] * axial, o[1] + a[1] * axial, o[2] + a[2] * axial);
  const top = toFlight(...o)[1];
  const round = (v) => +v.toFixed(4);
  return { kind, index, x: round(x), z: round(z), r: round(r), exit: round(exit), top: round(top), axis: [a[0], a[2], -a[1]].map(round) };
}

function exportPage(page) {
  const path = join(dir, page.file);
  const bytes = readFileSync(path);
  const html = bytes.toString('utf8');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const { scene, buildSoyuzMeshes, materialOf } = pageModel(html);
  const mismatch = boosterMismatch(scene, buildSoyuzMeshes);
  if (mismatch.area > 0.005 || mismatch.m > 0.02) throw new Error(`${page.file}: the boosters are not one booster turned (${JSON.stringify(mismatch)})`);
  // Blok I first, at the bay's resolution: its hosts' heights, its tanks, its chambers' exits
  const stage3 = scene.items.filter((it) => it.part === 'stage3');
  const stage3Meshes = buildSoyuzMeshes({ ...scene, items: stage3 }, { radialSegments: BAY_SEGMENTS });
  const extent = new Map(), nozzles = { bay: [], fregat: [], escape: [], core: [], booster: [] };
  stage3.forEach((it, i) => {
    const p = stage3Meshes[i].positions;
    let lo = Infinity, hi = -Infinity, r = 0;
    for (let k = 2; k < p.length; k += 3) { lo = Math.min(lo, p[k] / 10); hi = Math.max(hi, p[k] / 10); r = Math.max(r, Math.hypot(p[k - 2], p[k - 1]) / 10); }
    extent.set(it.id, { lo, hi, r });
    const c = CHAMBER.exec(it.id);
    if (c) nozzles.bay.push(nozzleOf(p, c[1], Number(c[2])));
  });
  // Fregat's main chamber, left to the flight's bell like Blok I's
  const fregatChamber = scene.items.filter((it) => FREGAT_CHAMBER.test(it.id));
  buildSoyuzMeshes({ ...scene, items: fregatChamber }, { radialSegments: RADIAL_SEGMENTS })
    .forEach((m, i) => nozzles.fregat.push(nozzleOf(m.positions, 'main', i + 1)));
  // Blok A's and the strap-on's, for the spent ones' bells
  const stackChambers = scene.items.filter((it) => STACK_CHAMBER.test(it.id));
  buildSoyuzMeshes({ ...scene, items: stackChambers }, { radialSegments: RADIAL_SEGMENTS }).forEach((m, i) => {
    const [, part, kind, index] = STACK_CHAMBER.exec(stackChambers[i].id);
    nozzles[part === 'core' ? 'core' : 'booster'].push(nozzleOf(m.positions, kind, Number(index)));
  });
  const tanks = stage3.filter((it) => TANK.test(it.id)).map((it) => extent.get(it.id).lo);
  const top = tanks.length ? Math.min(...tanks) : -Infinity;
  // the lowest tank's radius: an inside pipe below the top that reaches further out runs up outside that tank
  const tankR = Math.max(0, ...stage3.filter((it) => TANK.test(it.id) && extent.get(it.id).lo <= top + 1e-3).map((it) => extent.get(it.id).r));
  const bay = { extent, top, tankR };
  const chosen = scene.items.filter((it) => flightPart(it, page, bay));
  const inBay = chosen.map((it) => flightPart(it, page, bay) === 'bay');
  const rest = buildSoyuzMeshes({ ...scene, items: chosen.filter((_, i) => !inBay[i]) }, { radialSegments: RADIAL_SEGMENTS });
  const bayMeshes = new Map(stage3.map((it, i) => [it.id, stage3Meshes[i]]));
  let r = 0;
  const meshes = chosen.map((it, i) => (inBay[i] ? bayMeshes.get(it.id) : rest[r++]));
  // the escape tower's jettison nozzles, drawn with it, and where its fire leaves them
  // (canted: their mouths and axes from the page's own frames, which a lowest-vertex ring would miss)
  chosen.forEach((it, i) => {
    const j = JETTISON.exec(it.id);
    if (j) nozzles.escape.push(mouthOf(it, 'jettison', Number(j[1])) ?? nozzleOf(meshes[i].positions, 'jettison', Number(j[1])));
  });

  const materials = [], materialIndex = new Map();
  const hinges = [], hingeIndex = new Map();
  /** part → group key → { material, hinge, soups: { p, n }[] } */
  const parts = new Map();
  for (let i = 0; i < meshes.length; i++) {
    const m = meshes[i], item = chosen[i];
    const part = flightPart(item, page, bay);
    const base = materialOf(m);
    const rotations = item.engineInfo?.progressMotion?.rotations;
    let hinge = -1;
    if (rotations) {
      const key = JSON.stringify(rotations);
      if (!hingeIndex.has(key)) { hingeIndex.set(key, hinges.length); hinges.push({ rotations: flightRotations(rotations) }); }
      hinge = hingeIndex.get(key);
    }
    // one group per material, tone (a detail's own shade of it) and hinge
    const byTone = new Map();
    for (let v = 0; v < m.toneFactors.length; v += 3) {
      const tone = Math.round(m.toneFactors[v] * 1000) / 1000;
      if (!byTone.has(tone)) byTone.set(tone, []);
      byTone.get(tone).push(v / 3);
    }
    for (const [tone, triangles] of byTone) {
      const srgb = base.srgb.map((c) => Math.min(0.97, Math.max(0.02, c * tone)));
      const matKey = `${base.name}|${hex(srgb)}`;
      if (!materialIndex.has(matKey)) {
        materialIndex.set(matKey, materials.length);
        materials.push({ name: base.name, color: hex(srgb), roughness: base.roughness, metalness: base.metalness });
      }
      const groupKey = `${materialIndex.get(matKey)}|${hinge}`;
      if (!parts.has(part)) parts.set(part, new Map());
      const groups = parts.get(part);
      if (!groups.has(groupKey)) groups.set(groupKey, { material: materialIndex.get(matKey), hinge, p: [], n: [] });
      const g = groups.get(groupKey);
      for (const t of triangles) for (let c = 0; c < 3; c++) {
        const k = (t * 3 + c) * 3;
        g.p.push(...toFlight(m.positions[k], m.positions[k + 1], m.positions[k + 2]));
        const nn = toFlight(m.normals[k], m.normals[k + 1], m.normals[k + 2]).map((v) => v * 10);
        g.n.push(...nn);
      }
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
  const header = {
    format: 'orbitlab-anatomy-exterior', version: FORMAT_VERSION,
    source: { file: page.file, sha256, title: html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '' },
    variant: page.variant, units: 'm', radialSegments: RADIAL_SEGMENTS, boosterMismatch: { area: +mismatch.area.toExponential(2), m: +mismatch.m.toExponential(2) },
    materials, hinges, parts: [],
  };
  let triangles = 0;
  const order = ['booster', 'core', 'stage3', 'skirt', 'bay', 'fregat', 'fairing-left', 'fairing-right', 'escape', 'payload'];
  let hidden = 0;
  for (const name of order) {
    const groups = parts.get(name);
    if (!groups) continue;
    hidden += dropHiddenFaces([...groups.values()]);
    // one grid for all the part's meshes: a corner two of them share is the same point in both, or cracks reopen
    const box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const g of groups.values()) for (let i = 0; i < g.p.length; i++) { const a = i % 3; box.min[a] = Math.min(box.min[a], g.p[i]); box.max[a] = Math.max(box.max[a], g.p[i]); }
    const entry = { name, bounds: boundsOf([...groups.values()].map((g) => g.p)), meshes: [], ...(nozzles[name]?.length ? { nozzles: nozzles[name] } : {}) };
    for (const g of groups.values()) {
      const w = weld(g.p, g.n, box);
      triangles += w.indices / 3;
      entry.meshes.push({
        material: g.material, ...(g.hinge >= 0 ? { hinge: g.hinge } : {}), vertices: w.vertices, indices: w.indices,
        min: w.min.map((v) => +v.toFixed(6)), step: w.step,
        position: put(w.q), normal: put(w.n), index: put(w.idx), wide: w.wide,
      });
    }
    header.parts.push(entry);
  }
  header.triangles = triangles;
  let json = Buffer.from(JSON.stringify(header), 'utf8');
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const lead = Buffer.alloc(12);
  lead.write('OLAX', 0, 'ascii');
  lead.writeUInt32LE(FORMAT_VERSION, 4);
  lead.writeUInt32LE(json.length, 8);
  const raw = Buffer.concat([lead, json, ...buffers]);
  // gzip: Node writes no timestamp into its header, so the same page makes the same file
  const out = gzipSync(raw, { level: 9 });
  const target = join(dir, page.file.replace(/\.html$/, '.exterior.bin'));
  writeFileSync(target, out);
  console.log(`${page.file}: ${triangles} triangles (${hidden} hidden ones dropped), ${header.parts.length} parts, ${materials.length} materials, ${hinges.length} hinges, `
    + `${(raw.length / 1000).toFixed(1)} kB, ${(out.length / 1000).toFixed(1)} kB gzip → ${target.slice(root.length + 1)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const page of PAGES) exportPage(page);
}
