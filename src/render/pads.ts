/**
 * Procedural launch complexes.
 *
 * Every site gets its own pad with recognisable real-world cues — the Soyuz
 * "tulip" support arms and flame pit, SLC-40's transporter/erector and lightning
 * masts, LC-39A's hardstand and Shuttle-era service structure, Starbase's orbital launch mount and chopstick arms, Kourou's mobile
 * gantry, Tanegashima's mobile launcher — plus terrain (hills, coastline,
 * vegetation), roads and support buildings appropriate to the place.
 *
 * Geometry is merged aggressively: a whole lattice tower is one draw call.
 * All animation is a pure function of the mission time and the vehicle's
 * altitude above the pad, so a replay reproduces it exactly.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { SiteExtra } from '../data/sites';
import { landingZonesForSite } from '../data/landing-zones';
import type { VehicleSpec } from '../types';
import { R_EARTH } from '../physics/constants';
import { fbm2, hash11, smoothstep } from './noise';

/**
 * A booster flown back to the pad's own tower (Super Heavy to Starbase's
 * arms): the height of its base above the level the vehicle stood on at
 * liftoff, m, and the height the arms hold it at.
 */
export interface TowerReturn {
  baseHeight: number;
  catchHeight: number;
}

export interface PadBuild {
  group: THREE.Group;
  /**
   * @param t mission time, s (negative during the countdown)
   * @param altAGL vehicle altitude above the pad, m
   * @param tower a booster coming back to be caught, when there is one
   */
  animate(t: number, altAGL: number, tower?: TowerReturn): void;
  /** direction the flame trench vents, rad in the local XZ plane */
  trenchAzimuth: number;
  /** radius of the trench mouth / flame pit, m */
  mouthRadius: number;
  /** height of the launch mount above grade: the pad is lowered by this so the
   *  vehicle base sits on the mount while the physics keeps altitude 0 there */
  mountHeight: number;
  /** grade-level group (terrain + structures), only present on the finished build */
  deck?: THREE.Group;
  /**
   * The terrain meshes only (ground, far ring, water, vegetation). Their
   * materials are transparent so the view can fade the local patch out with
   * distance instead of leaving a 13 km disc stuck on the globe.
   */
  terrainParts?: THREE.Object3D[];
  /** pits the ground has to leave open, pad-local (V05: Gagarin's Start's quarry, Site 31's trench) */
  holes?: PitHole[];
  /** ground flattened (and kept clear of bushes) under the pad's rail line and buildings */
  clearings?: { x: number; z: number; r: number; h: number }[];
  /** where the floodlight masts stand, pad-local x/z, when the default ring would put them over a pit */
  floodPositions?: [number, number][];
  /**
   * The pad structures only (tower, mount, masts, buildings). They are
   * metre-scale and opaque, so they are switched off much closer in than the
   * terrain patch, which has to dissolve gradually instead (see
   * `LaunchPadView.update`).
   */
  structures?: THREE.Object3D;
  /**
   * Bring the pad floodlights up as the sun goes down.
   *
   * @param night 0 = full day, 1 = night (`1 - sky.dayFactor` at the pad)
   */
  setNight?(night: number): void;
}

type MatFn = (color: number, metal?: number, rough?: number) => THREE.MeshStandardMaterial;

interface Ctx {
  site: SiteExtra;
  vehicle: VehicleSpec;
  /** vehicle height, m */
  H: number;
  /** vehicle radius, m */
  R: number;
  mat: MatFn;
  /** register a geometry so the view disposes it when the mission is rebuilt */
  geo: <T extends THREE.BufferGeometry>(g: T) => T;
  /** the site's pad the mission flies from (`SiteExtra.pads`), when the site has several */
  pad?: string;
  /** launch azimuth, rad from north: an R-7's launch table is turned to it */
  azimuth: number;
}

// ------------------------------------------------------------------ helpers

const DEG2 = Math.PI / 180;

/** local direction for a compass azimuth (deg clockwise from north) */
function azDir(azDeg: number): THREE.Vector2 {
  const a = azDeg * DEG2;
  return new THREE.Vector2(Math.sin(a), -Math.cos(a));
}

function box(w: number, h: number, d: number, x = 0, y = 0, z = 0, ry = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}

function cyl(rt: number, rb: number, h: number, x = 0, y = 0, z = 0, seg = 10): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}

function merged(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  return g ?? new THREE.BufferGeometry();
}

/** Square lattice tower of `bays` levels with corner columns and X bracing. */
function lattice(w: number, d: number, h: number, bays: number, th: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const hw = w / 2, hd = d / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(box(th, h, th, sx * hw, h / 2, sz * hd));
  const bay = h / bays;
  for (let i = 0; i <= bays; i++) {
    const y = i * bay;
    parts.push(box(w + th, th * 0.8, th * 0.8, 0, y, -hd));
    parts.push(box(w + th, th * 0.8, th * 0.8, 0, y, hd));
    parts.push(box(th * 0.8, th * 0.8, d + th, -hw, y, 0));
    parts.push(box(th * 0.8, th * 0.8, d + th, hw, y, 0));
  }
  const diagLen = Math.hypot(w, bay);
  const ang = Math.atan2(bay, w);
  for (let i = 0; i < bays; i++) {
    const y = i * bay + bay / 2;
    for (const sz of [-1, 1]) {
      for (const s of [1, -1]) {
        const g = new THREE.BoxGeometry(diagLen, th * 0.6, th * 0.6);
        g.rotateZ(s * ang);
        g.translate(0, y, sz * hd);
        parts.push(g);
      }
    }
    const diagLen2 = Math.hypot(d, bay);
    const ang2 = Math.atan2(bay, d);
    for (const sx of [-1, 1]) {
      for (const s of [1, -1]) {
        const g = new THREE.BoxGeometry(th * 0.6, th * 0.6, diagLen2);
        g.rotateX(s * ang2);
        g.translate(sx * hw, y, 0);
        parts.push(g);
      }
    }
  }
  return merged(parts);
}

/** Tall tapered lightning mast with a mushroom-shaped catenary head. */
function mastGeo(h: number): THREE.BufferGeometry {
  return merged([
    cyl(0.5, 1.6, h, 0, h / 2, 0, 8),
    cyl(0.12, 0.5, h * 0.12, 0, h + h * 0.06, 0, 6),
    cyl(2.4, 2.4, 0.8, 0, h * 0.94, 0, 10),
  ]);
}

// ------------------------------------------------------------------ terrain

type Vegetation = 'none' | 'scrub' | 'steppe' | 'forest' | 'jungle' | 'grass' | 'palms';

interface Biome {
  /** dominant ground colour */
  ground: number;
  /** secondary colour blended in by noise */
  ground2: number;
  /** rock / bare soil colour on slopes */
  rock: number;
  /** relief amplitude, m */
  hills: number;
  coastal: boolean;
  /** compass azimuth of the open sea, deg */
  seaAz: number;
  /** distance from the pad to the shoreline, m */
  shore: number;
  water: number;
  vegetation: Vegetation;
  /** cliff coast (Tanegashima, Mahia) */
  cliffs?: boolean;
}

const BIOMES: Record<string, Biome> = {
  baikonur: { ground: 0xa89b74, ground2: 0x8f8560, rock: 0xb4a583, hills: 10, coastal: false, seaAz: 0, shore: 0, water: 0x2a5a80, vegetation: 'steppe' },
  plesetsk: { ground: 0x4b5a3c, ground2: 0x35482f, rock: 0x6b6a58, hills: 90, coastal: false, seaAz: 0, shore: 0, water: 0x2a5a80, vegetation: 'forest' },
  vostochny: { ground: 0x4f5c3a, ground2: 0x3a4a30, rock: 0x74705c, hills: 160, coastal: false, seaAz: 0, shore: 0, water: 0x2a5a80, vegetation: 'forest' },
  cape: { ground: 0x6f7c46, ground2: 0x8e8a5c, rock: 0xbdb188, hills: 12, coastal: true, seaAz: 100, shore: 2400, water: 0x1d5b7a, vegetation: 'scrub' },
  // LC-39A stands about 1.5 km back from the beach, north of the Cape pads.
  ksc39a: { ground: 0x6f7c46, ground2: 0x8e8a5c, rock: 0xbdb188, hills: 10, coastal: true, seaAz: 75, shore: 1500, water: 0x1d5b7a, vegetation: 'scrub' },
  vandenberg: { ground: 0x8a8a5e, ground2: 0x6d7248, rock: 0x9a8f72, hills: 230, coastal: true, seaAz: 250, shore: 1600, water: 0x1b4a68, vegetation: 'scrub' },
  wallops: { ground: 0x7d8a52, ground2: 0x9aa06a, rock: 0xc3b891, hills: 6, coastal: true, seaAz: 110, shore: 900, water: 0x235f7c, vegetation: 'grass' },
  starbase: { ground: 0x9a9268, ground2: 0x7d7d54, rock: 0xc0b48c, hills: 8, coastal: true, seaAz: 95, shore: 3200, water: 0x1f6080, vegetation: 'scrub' },
  kourou: { ground: 0x2f4f2a, ground2: 0x3f5f2e, rock: 0x7a6a4a, hills: 60, coastal: true, seaAz: 30, shore: 4500, water: 0x2a6a72, vegetation: 'jungle' },
  wenchang: { ground: 0x40603a, ground2: 0x557040, rock: 0x9a8c6a, hills: 40, coastal: true, seaAz: 90, shore: 2000, water: 0x1f6f8a, vegetation: 'palms' },
  tanegashima: { ground: 0x47603c, ground2: 0x5a7146, rock: 0x8d8570, hills: 70, coastal: true, seaAz: 120, shore: 700, water: 0x1c6a86, vegetation: 'forest', cliffs: true },
  sriharikota: { ground: 0x6b7a44, ground2: 0x8a8a58, rock: 0xc0ae82, hills: 10, coastal: true, seaAz: 100, shore: 3000, water: 0x226a80, vegetation: 'palms' },
  mahia: { ground: 0x5f7a3e, ground2: 0x748c4c, rock: 0x8b8064, hills: 140, coastal: true, seaAz: 140, shore: 800, water: 0x1a5570, vegetation: 'grass', cliffs: true },
};

const APRON = 520;  // radius of the flat concrete apron, m

/** Drop of the Earth's surface below the pad's tangent plane, m. */
function curveDrop(x: number, z: number): number {
  return (x * x + z * z) / (2 * R_EARTH);
}

/**
 * Landing zones near the pad, as the terrain has to know them: a flat
 * clearing at the height the simulation lands a stage on, and land under it.
 * Cape Canaveral's landing zones are 9 km south of SLC-40 and 3 km nearer
 * the sea than the straight procedural shoreline allows, so the shore bulges
 * out around them — which is what the real cape does.
 */
interface Land {
  /** clearings in the local frame (x east, z south), m; `h` is the height to flatten to */
  clearings: { x: number; z: number; r: number; h: number }[];
  /** extra distance of the shoreline from the pad along the coast, m, as a function of the along-coast coordinate */
  bulges: { t: number; extra: number }[];
  /** radius the detailed ground has to reach to take in every landing zone, m */
  reach: number;
}

const NO_LAND: Land = { clearings: [], bulges: [], reach: 0 };
/** Radius of the detailed ground around a pad, m. */
const TERRAIN_RADIUS = 13e3;
/**
 * Detailed ground kept beyond the farthest landing zone, m: the outer third
 * of the disc dissolves into the far ring (water, on a coast), and a zone has
 * to stand on solid ground, not in that fade.
 */
const ZONE_REACH = 6000;
/** Half-width of a shoreline bulge along the coast, m. */
const BULGE_WIDTH = 4000;
/** Land kept between a landing zone and the sea, m. */
const ZONE_INLAND = 1500;

/** Distance from the pad to the shoreline at (x, z), m. */
function shoreAt(x: number, z: number, b: Biome, sea: THREE.Vector2, land: Land): number {
  let shore = b.shore;
  if (land.bulges.length) {
    const t = -x * sea.y + z * sea.x;
    for (const bulge of land.bulges) shore += bulge.extra * Math.exp(-(((t - bulge.t) / BULGE_WIDTH) ** 2));
  }
  return shore;
}

function landFor(site: SiteExtra, b: Biome, mountHeight: number): Land {
  const zones = landingZonesForSite(site.id).filter((z) => z.kind === 'pad');
  if (!zones.length) return NO_LAND;
  const sea = azDir(b.seaAz);
  const M = (R_EARTH * Math.PI) / 180;
  const land: Land = { clearings: [], bulges: [], reach: 0 };
  for (const zone of zones) {
    const x = (zone.longitude - site.longitude) * Math.cos(site.latitude * DEG2) * M;
    const z = -(zone.latitude - site.latitude) * M;
    // LZ-1 is 9 km from SLC-40 but 15 km from LC-39A, past the usual disc.
    land.reach = Math.max(land.reach, Math.hypot(x, z) + ZONE_REACH);
    // The ground mesh sits 0.4 m below its heights and the whole grade is
    // lowered by the mount: this leaves the clearing just under the pad's
    // apron, which is drawn at the landing height (src/render/recovery.ts).
    land.clearings.push({ x, z, r: zone.radius * 2.6, h: mountHeight + 0.1 });
    if (b.coastal) {
      const toSea = x * sea.x + z * sea.y;
      const extra = toSea + ZONE_INLAND - b.shore;
      if (extra > 0) land.bulges.push({ t: -x * sea.y + z * sea.x, extra });
    }
  }
  return land;
}

function heightAt(x: number, z: number, b: Biome, sea: THREE.Vector2, land: Land = NO_LAND): number {
  const d = Math.hypot(x, z);
  const flat = smoothstep(APRON, APRON * 3.2, d);
  let h = (fbm2(x / 2400 + 4.2, z / 2400 - 1.7, 4) - 0.45) * b.hills;
  h += (fbm2(x / 480 + 11.3, z / 480 + 6.1, 3) - 0.5) * b.hills * 0.22;
  h *= flat;
  if (b.coastal) {
    const s = x * sea.x + z * sea.y;              // distance toward the sea
    const shore = shoreAt(x, z, b, sea, land);
    const ramp = smoothstep(shore - (b.cliffs ? 120 : 900), shore + (b.cliffs ? 60 : 600), s);
    h = h * (1 - ramp) - ramp * (b.cliffs ? 140 : 60);
  }
  for (const c of land.clearings) {
    const k = 1 - smoothstep(c.r, c.r * 2.5, Math.hypot(x - c.x, z - c.z));
    if (k > 0) h += (c.h - h) * k;
  }
  return h;
}

/**
 * A rectangular pit in the ground, pad-local: centred on (x, z), `halfL` along
 * the unit axis (ux, uz), `halfW` across it.
 */
export interface PitHole { x: number; z: number; ux: number; uz: number; halfL: number; halfW: number }

/**
 * Drop the ground's triangles over a pit so it can be seen into. The test is
 * each triangle's extent in the pit's own axes, so it errs on the side of
 * cutting; the pad's deck, which has the pit's exact outline, covers the
 * ragged edge that leaves.
 */
function cutHoles(geo: THREE.BufferGeometry, holes: readonly PitHole[]): void {
  const pos = geo.attributes.position as THREE.BufferAttribute, index = geo.index!;
  const keep: number[] = [];
  for (let i = 0; i < index.count; i += 3) {
    const tri = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    const cut = holes.some((h) => {
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const k of tri) {
        const dx = pos.getX(k) - h.x, dz = pos.getZ(k) - h.z;
        const u = dx * h.ux + dz * h.uz, v = -dx * h.uz + dz * h.ux;
        u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
      }
      return u1 > -h.halfL && u0 < h.halfL && v1 > -h.halfW && v0 < h.halfW;
    });
    if (!cut) keep.push(...tri);
  }
  geo.setIndex(keep);
}

function terrain(ctx: Ctx, b: Biome, land: Land = NO_LAND, holes: readonly PitHole[] = []): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const sea = azDir(b.seaAz);
  // A disc, not a square: a square plane's corners would poke out past the
  // coarse far ring. Vertices are packed towards the pad by remapping the
  // radius, so the detail is where the camera spends its time.
  const SIZE = Math.max(TERRAIN_RADIUS, land.reach);
  // a pit has to be cut from the ground: finer, and packed closer in
  const fine = holes.length > 0;
  const geo = ctx.geo(new THREE.RingGeometry(4, SIZE, fine ? 192 : 96, fine ? 140 : 44));
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), pz = pos.getZ(i);
    const r0 = Math.hypot(px, pz);
    if (r0 < 1e-6) continue;
    const tt = Math.max(0, Math.min(1, (r0 - 4) / (SIZE - 4)));
    const rr = 4 + (SIZE - 4) * Math.pow(tt, fine ? 2.2 : 1.9);
    pos.setX(i, (px * rr) / r0);
    pos.setZ(i, (pz * rr) / r0);
  }
  const colors = new Float32Array(pos.count * 4);
  const c = new THREE.Color();
  const g1 = new THREE.Color(b.ground), g2 = new THREE.Color(b.ground2), rock = new THREE.Color(b.rock);
  const sand = new THREE.Color(0xcdbd94);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z, b, sea, land) - curveDrop(x, z);
    pos.setY(i, h);
    const mix = fbm2(x / 900 + 2.1, z / 900 - 3.3, 3);
    c.copy(g1).lerp(g2, mix);
    const hLocal = h + curveDrop(x, z);
    if (hLocal > b.hills * 0.32) c.lerp(rock, smoothstep(b.hills * 0.32, b.hills * 0.9, hLocal));
    if (b.coastal) {
      const s = x * sea.x + z * sea.y;
      const shore = shoreAt(x, z, b, sea, land);
      c.lerp(sand, smoothstep(shore - 500, shore + 120, s) * (b.cliffs ? 0.35 : 0.9));
    }
    // concrete apron fades in near the pad
    const d = Math.hypot(x, z);
    if (d < APRON * 2.4) c.lerp(new THREE.Color(0x9c9a92), 1 - smoothstep(APRON * 0.7, APRON * 2.4, d));
    colors[i * 4] = c.r; colors[i * 4 + 1] = c.g; colors[i * 4 + 2] = c.b;
    // dissolve the outer quarter into the far apron so the two do not meet
    // along a visible 13 km circle
    colors[i * 4 + 3] = 1 - 0.75 * smoothstep(SIZE * 0.68, SIZE, d);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  if (fine) cutHoles(geo, holes);
  geo.computeVertexNormals();
  // transparent so the whole patch can be faded out with slant range instead
  // of popping off at a fixed distance (see LaunchPadView.setTerrainFade)
  const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, transparent: true });
  const ground = new THREE.Mesh(geo, groundMat);
  ground.receiveShadow = true;
  ground.position.y = -0.4;
  out.push(ground);

  // Coarse far apron so the horizon is not a cliff edge.
  //
  // Its outer rim carries a per-vertex alpha ramp to zero. A flat 90 km plate
  // of one biome colour has nothing in common with the Blue Marble texture it
  // is composited over, and from 50 km up the join read as a hard tan arc
  // drawn across the planet. With the ramp there is no edge to see: the apron
  // is opaque where the eye is comparing it with ground it can resolve, and has
  // dissolved into the globe long before its own boundary.
  const RING_OUT = 90e3;
  const ring = ctx.geo(new THREE.RingGeometry(SIZE * 0.995, RING_OUT, 72, 14));
  ring.rotateX(-Math.PI / 2);
  const far = new THREE.Mesh(ring, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, transparent: true, depthWrite: false }));
  {
    const rp = ring.attributes.position as THREE.BufferAttribute;
    const rc = new Float32Array(rp.count * 4);
    const base = new THREE.Color(b.coastal ? b.water : b.ground2);
    for (let i = 0; i < rp.count; i++) {
      const x = rp.getX(i), z = rp.getZ(i);
      rp.setY(i, -curveDrop(x, z));
      const tt = Math.max(0, Math.min(1, (Math.hypot(x, z) - SIZE) / (RING_OUT - SIZE)));
      rc[i * 4] = base.r; rc[i * 4 + 1] = base.g; rc[i * 4 + 2] = base.b;
      rc[i * 4 + 3] = Math.pow(1 - tt, 1.25);
    }
    // itemSize 4 switches three's USE_COLOR_ALPHA on, so the fourth channel
    // multiplies the material's own opacity instead of being ignored
    ring.setAttribute('color', new THREE.BufferAttribute(rc, 4));
    ring.computeVertexNormals();
  }
  far.position.y = b.coastal ? -18 : -30;
  far.renderOrder = -1;
  out.push(far);

  if (b.coastal) {
    const W_OUT = 88e3;
    const w = ctx.geo(new THREE.CircleGeometry(W_OUT, 96, 0, Math.PI * 2));
    w.rotateX(-Math.PI / 2);
    {
      const wp = w.attributes.position as THREE.BufferAttribute;
      const wc = new Float32Array(wp.count * 4);
      const base = new THREE.Color(b.water);
      for (let i = 0; i < wp.count; i++) {
        const x = wp.getX(i), z = wp.getZ(i);
        wp.setY(i, -curveDrop(x, z));
        const tt = Math.max(0, Math.min(1, (Math.hypot(x, z) - b.shore) / (W_OUT - b.shore)));
        wc[i * 4] = base.r; wc[i * 4 + 1] = base.g; wc[i * 4 + 2] = base.b;
        wc[i * 4 + 3] = 0.94 * Math.pow(1 - tt, 1.1);
      }
      w.setAttribute('color', new THREE.BufferAttribute(wc, 4));
      w.computeVertexNormals();
    }
    const water = new THREE.Mesh(w, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.35, transparent: true, depthWrite: false }));
    water.position.y = b.cliffs ? -60 : -10;
    out.push(water);
  }

  const veg = vegetation(ctx, b, sea, land);
  if (veg) out.push(veg);
  return out;
}

/** Instanced trees / bushes scattered on the terrain, never on the apron. */
function vegetation(ctx: Ctx, b: Biome, sea: THREE.Vector2, land: Land = NO_LAND): THREE.Object3D | null {
  const style = b.vegetation;
  if (style === 'none') return null;
  const spec: Record<Exclude<Vegetation, 'none'>, { n: number; h: number; r: number; trunk: number; color: number; spread: number }> = {
    scrub: { n: 900, h: 4, r: 2.6, trunk: 0.15, color: 0x55693a, spread: 9000 },
    steppe: { n: 500, h: 2.5, r: 2.2, trunk: 0.1, color: 0x7a7550, spread: 11000 },
    grass: { n: 700, h: 3, r: 2.0, trunk: 0.12, color: 0x5d7a3c, spread: 9000 },
    forest: { n: 1100, h: 16, r: 4.0, trunk: 0.35, color: 0x2e4a2a, spread: 11000 },
    jungle: { n: 1200, h: 22, r: 6.0, trunk: 0.5, color: 0x27431f, spread: 11000 },
    palms: { n: 900, h: 12, r: 3.4, trunk: 0.3, color: 0x3d6034, spread: 10000 },
  };
  const s = spec[style];
  const geo = ctx.geo(merged([
    cyl(s.trunk, s.trunk * 1.5, s.h * 0.45, 0, s.h * 0.22, 0, 5),
    (() => { const g = new THREE.ConeGeometry(s.r, s.h * 0.75, 7); g.translate(0, s.h * 0.62, 0); return g; })(),
  ]));
  const mat = new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.95, flatShading: true, transparent: true });
  const mesh = new THREE.InstancedMesh(geo, mat, s.n);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const p = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i < s.n * 3 && k < s.n; i++) {
    const a = hash11(i * 3.7) * Math.PI * 2;
    const rr = APRON * 1.6 + Math.pow(hash11(i * 7.1 + 1.3), 0.6) * s.spread;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (b.coastal && x * sea.x + z * sea.y > shoreAt(x, z, b, sea, land) - 300) continue;
    if (land.clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.r * 1.8)) continue;
    const h = heightAt(x, z, b, sea, land);
    if (h < -5) continue;
    if (fbm2(x / 1500 + 9, z / 1500 - 4, 2) < 0.38) continue;   // clearings
    p.set(x, h - 0.5 - curveDrop(x, z), z);
    const scale = 0.6 + hash11(i * 11.9) * 0.9;
    sc.set(scale, scale * (0.7 + hash11(i * 5.3) * 0.7), scale);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash11(i * 2.9) * 6.28);
    m.compose(p, q, sc);
    mesh.setMatrixAt(k++, m);
  }
  mesh.count = k;
  mesh.castShadow = false;
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/** Roads and a few support buildings on the flat apron. */
function infrastructure(ctx: Ctx, roadAz: number, buildingSide: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const road = ctx.mat(0x4b4b4d, 0, 0.98);
  const parts: THREE.BufferGeometry[] = [];
  const dir = azDir(roadAz);
  const ra = Math.atan2(dir.x, -dir.y);
  parts.push(box(16, 0.3, 2 * APRON * 2.2, Math.sin(ra) * APRON * 1.4, 0.1, -Math.cos(ra) * APRON * 1.4, ra));
  parts.push(box(10, 0.3, APRON * 1.6, buildingSide * APRON * 0.55, 0.1, APRON * 0.5, 0.35));
  const apron = new THREE.CircleGeometry(APRON * 0.62, 48);
  apron.rotateX(-Math.PI / 2);
  apron.translate(0, 0.05, 0);
  out.push(new THREE.Mesh(ctx.geo(apron), ctx.mat(0xa5a39a, 0, 0.95)));
  out.push(new THREE.Mesh(ctx.geo(merged(parts)), road));

  const bParts: THREE.BufferGeometry[] = [];
  const roofParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const a = 0.6 + i * 0.42;
    const rr = APRON * (0.85 + hash11(i * 4.4) * 0.9);
    const x = buildingSide * Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const w = 14 + hash11(i * 8.1) * 26;
    const d = 12 + hash11(i * 2.3) * 22;
    const h = 6 + hash11(i * 6.7) * 9;
    bParts.push(box(w, h, d, x, h / 2, z, hash11(i) * 0.6));
    roofParts.push(box(w * 1.06, 0.6, d * 1.06, x, h + 0.3, z, hash11(i) * 0.6));
  }
  const bm = new THREE.Mesh(ctx.geo(merged(bParts)), ctx.mat(0xd9d6cc, 0.05, 0.85));
  bm.castShadow = true; bm.receiveShadow = true;
  out.push(bm);
  out.push(new THREE.Mesh(ctx.geo(merged(roofParts)), ctx.mat(0x6f7378, 0.1, 0.8)));
  return out;
}

// ------------------------------------------------------------------ pad parts

function flamePit(ctx: Ctx, r: number, depth: number): THREE.Object3D[] {
  const deck = ctx.geo(new THREE.RingGeometry(r, r * 4.2, 48, 1));
  deck.rotateX(-Math.PI / 2);
  const out: THREE.Object3D[] = [];
  const deckMesh = new THREE.Mesh(deck, ctx.mat(0xb0aca2, 0.05, 0.9));
  deckMesh.position.y = 1.2;
  deckMesh.receiveShadow = true;
  out.push(deckMesh);
  const wall = ctx.geo(new THREE.CylinderGeometry(r, r * 0.8, depth, 32, 1, true));
  const w = new THREE.Mesh(wall, new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.95, side: THREE.BackSide }));
  w.position.y = -depth / 2 + 1.2;
  out.push(w);
  const floor = ctx.geo(new THREE.CircleGeometry(r * 0.8, 24));
  floor.rotateX(-Math.PI / 2);
  const f = new THREE.Mesh(floor, ctx.mat(0x151312, 0, 1));
  f.position.y = -depth + 1.2;
  out.push(f);
  return out;
}

function flameTrench(ctx: Ctx, w: number, len: number, depth: number, az: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const parts: THREE.BufferGeometry[] = [];
  // walls
  parts.push(box(2.5, depth, len, -w / 2, -depth / 2 + 1.0, len / 2));
  parts.push(box(2.5, depth, len, w / 2, -depth / 2 + 1.0, len / 2));
  parts.push(box(w, 0.6, len, 0, -depth + 1.0, len / 2));
  const merged1 = merged(parts);
  merged1.rotateY(az);
  const trench = new THREE.Mesh(ctx.geo(merged1), ctx.mat(0x3a3733, 0, 0.95));
  trench.receiveShadow = true;
  out.push(trench);
  // wedge deflector under the vehicle
  const wedge = new THREE.ConeGeometry(w * 0.62, depth * 0.95, 4);
  wedge.rotateY(Math.PI / 4 + az);
  wedge.translate(0, -depth * 0.5 + 1.0, 0);
  const wm = new THREE.Mesh(ctx.geo(wedge), ctx.mat(0x55504a, 0.1, 0.85));
  out.push(wm);
  return out;
}

function lightningMasts(ctx: Ctx, n: number, radius: number, h: number, phase = Math.PI / 4): THREE.Object3D {
  const geo = ctx.geo(mastGeo(h));
  const mesh = new THREE.InstancedMesh(geo, ctx.mat(0xb9bcc0, 0.4, 0.55), n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    m.makeTranslation(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  return mesh;
}

function waterTower(ctx: Ctx, x: number, z: number, h: number): THREE.Object3D {
  const g = ctx.geo(merged([
    cyl(1.2, 1.2, h, 0, h / 2, 0, 10),
    cyl(6, 6, 9, 0, h + 4, 0, 16),
    (() => { const c = new THREE.SphereGeometry(6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); c.translate(0, h + 8.5, 0); return c; })(),
  ]));
  const m = new THREE.Mesh(g, ctx.mat(0xe8e8e4, 0.2, 0.6));
  m.position.set(x, 0, z);
  m.castShadow = true;
  return m;
}

function tankFarm(ctx: Ctx, x: number, z: number, n: number, r: number, h: number): THREE.Object3D {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const px = Math.cos(a) * r * 3.2, pz = Math.sin(a) * r * 3.2;
    parts.push(cyl(r, r, h, px, h / 2, pz, 14));
    const dome = new THREE.SphereGeometry(r, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.translate(px, h, pz);
    parts.push(dome);
  }
  const m = new THREE.Mesh(ctx.geo(merged(parts)), ctx.mat(0xf0f0ee, 0.25, 0.45));
  m.position.set(x, 0, z);
  m.castShadow = true;
  return m;
}

/** A hinged arm: returns the pivot group (rotate it about Z to swing the arm). */
function hingedArm(ctx: Ctx, len: number, thick: number, color: number, lattice_ = false): THREE.Group {
  const pivot = new THREE.Group();
  const g = lattice_ ? lattice(thick * 1.6, thick * 1.6, len, Math.max(3, Math.round(len / 8)), thick * 0.35) : box(len, thick, thick * 1.2, len / 2, 0, 0);
  if (lattice_) { g.rotateZ(-Math.PI / 2); }
  const m = new THREE.Mesh(ctx.geo(g), ctx.mat(color, 0.35, 0.6));
  m.castShadow = true;
  pivot.add(m);
  return pivot;
}

// --------------------------------------------------------------- floodlights

/** Floodlights per pad. Four is even coverage; the count is what a night
 *  launch costs every lit fragment in the scene, so it stays small. */
const FLOOD_COUNT = 4;
/** Irradiance a floodlight puts on the vehicle at full night (three.js units). */
const FLOOD_TARGET = 2.3;
/** Falloff exponent. Below the inverse square so the top of a 70 m stack is
 *  not four times darker than its base. */
const FLOOD_DECAY = 1.35;

/**
 * Xenon-style pad floodlighting, built for every site by `buildPad`.
 *
 * Until this existed there was no light source at a launch complex except the
 * sun, so a night launch rendered an essentially black frame — and the app's
 * own launch-window picker chooses night for several default missions (Falcon 9
 * / Starlink from the Cape picks 07:08 UTC, i.e. 03:08 local; Starship from
 * Starbase likewise). At T-4 s the pad was a black rectangle with the gantry
 * barely discernible, and after liftoff the only thing on screen was the plume.
 * This is the open item from Review 8 in docs/history/HANDOFFS.md.
 *
 * Built once per mission and never added or removed afterwards: the light count
 * is part of every lit material's program cache key, so switching lights on at
 * dusk would recompile the whole scene mid-flight. What changes is the
 * intensity, and at `night = 0` it is exactly zero.
 *
 * The lamp housings are drawn as small additive billboards at the same points,
 * so the fixtures themselves read as lights rather than as unlit grey boxes —
 * which is what a real pad looks like from a distance at night.
 */
function padFloodlights(ctx: Ctx, build: PadBuild): { group: THREE.Group; set(night: number): void } {
  const g = new THREE.Group();
  const H = ctx.H;
  const placed = build.floodPositions;
  const radius = placed?.length ? Math.max(...placed.map(([x, z]) => Math.hypot(x, z))) : Math.max(46, build.mouthRadius * 3.0);
  const mastH = Math.max(11, H * 0.30);
  // aimed a little under half way up the stack: the interesting hardware (the
  // engines, the launch mount, the lower tank) is at the bottom
  const aimY = Math.max(6, H * 0.40);
  const slant = Math.hypot(radius, mastH - aimY);
  const peak = FLOOD_TARGET * Math.pow(slant, FLOOD_DECAY);

  const lights: THREE.SpotLight[] = [];
  const mastParts: THREE.BufferGeometry[] = [];
  const lampParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < FLOOD_COUNT; i++) {
    const a0 = (i / FLOOD_COUNT) * Math.PI * 2 + Math.PI / FLOOD_COUNT;
    const x = placed?.[i] ? placed[i][0] : Math.cos(a0) * radius, z = placed?.[i] ? placed[i][1] : Math.sin(a0) * radius;
    const a = Math.atan2(z, x);
    mastParts.push(cyl(0.35, 0.75, mastH, x, mastH / 2, z, 6));
    mastParts.push(box(2.6, 0.5, 1.4, x, mastH + 0.4, z, -a));
    lampParts.push(box(2.2, 1.1, 1.0, x, mastH + 1.1, z, -a));
    const l = new THREE.SpotLight(0xf2f6ff, 0, radius * 7, 0, 0.55, FLOOD_DECAY);
    // A cone just wide enough to wash the stack and the mount. Wider than this
    // and the floods light the 13 km terrain patch instead of the hardware.
    l.angle = Math.min(0.72, Math.max(0.3, Math.atan2(Math.max(H * 0.5, 26), slant)));
    l.castShadow = false;
    l.position.set(x, mastH + 1.1, z);
    l.target.position.set(0, aimY, 0);
    g.add(l, l.target);
    lights.push(l);
  }
  const mastMat = ctx.mat(0x8d9299, 0.35, 0.6);
  g.add(new THREE.Mesh(ctx.geo(merged(mastParts)), mastMat));
  // additive, so the housing reads as a lamp that is on rather than as a box
  // that has been painted white
  const lampMat = new THREE.MeshBasicMaterial({
    color: 0xfff3d6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  const lamps = new THREE.Mesh(ctx.geo(merged(lampParts)), lampMat);
  lamps.visible = false;
  g.add(lamps);
  g.traverse((o) => { o.frustumCulled = false; });

  let shown = -1;
  return {
    group: g,
    set(night: number): void {
      const n = Math.max(0, Math.min(1, night));
      if (Math.abs(n - shown) < 0.004) return;
      shown = n;
      for (const l of lights) l.intensity = peak * n;
      lampMat.opacity = 0.85 * n;
      lamps.visible = n > 0.01;
    },
  };
}

// ------------------------------------------------------------------ builders

type Builder = (ctx: Ctx) => PadBuild;

/** Baikonur / Plesetsk / Vostochny: flame pit, four tulip arms, cable masts. */
const soyuzPad: Builder = (ctx) => {
  const g = new THREE.Group();
  const H = ctx.H;
  const pitR = Math.max(16, ctx.R * 4.5);
  for (const o of flamePit(ctx, pitR, 42)) g.add(o);
  // launch table ring the vehicle hangs from
  const tableGeo = ctx.geo(merged([
    cyl(ctx.R * 1.5, ctx.R * 1.7, 3, 0, 1.5, 0, 24),
    ...[0, 1, 2, 3].map((i) => {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      return box(3, 3, pitR * 1.1, Math.cos(a) * pitR * 0.6, 1.5, Math.sin(a) * pitR * 0.6, -a);
    }),
  ]));
  const table = new THREE.Mesh(tableGeo, ctx.mat(0x8f9298, 0.45, 0.55));
  table.castShadow = true;
  g.add(table);

  // four "tulip" support arms that fall away at liftoff
  const arms: THREE.Group[] = [];
  const armLen = H * 0.30;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * ctx.R * 1.45, 3, Math.sin(a) * ctx.R * 1.45);
    pivot.rotation.y = -a;
    const armGeo = ctx.geo(merged([
      lattice(3.2, 3.2, armLen, 5, 0.5),
      box(ctx.R * 1.2, 1.2, 2.4, -ctx.R * 0.55, armLen * 0.92, 0),
      box(6, 5, 5, 0, -2.5, 0),
    ]));
    const arm = new THREE.Mesh(armGeo, ctx.mat(0x8a6a4a, 0.3, 0.7));
    arm.castShadow = true;
    pivot.add(arm);
    g.add(pivot);
    arms.push(pivot);
  }

  // two cable/umbilical masts that also drop away
  const cableMasts: THREE.Group[] = [];
  for (const s of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 3, s * (ctx.R * 1.6 + 2));
    const mh = H * 0.55;
    const geo = ctx.geo(merged([
      lattice(3, 3, mh, 8, 0.45),
      box(ctx.R * 1.4, 1, 1.6, 0, mh * 0.95, -s * ctx.R * 0.8),
    ]));
    const m = new THREE.Mesh(geo, ctx.mat(0x9a9d9f, 0.35, 0.6));
    m.castShadow = true;
    pivot.add(m);
    g.add(pivot);
    cableMasts.push(pivot);
  }

  // service towers on rails, rolled back
  for (const s of [1, -1]) {
    const th = H * 0.82;
    const tower = new THREE.Mesh(ctx.geo(lattice(11, 9, th, 11, 0.7)), ctx.mat(0x7c8087, 0.4, 0.6));
    tower.position.set(s * (pitR * 1.9 + 10), 1.5, 0);
    tower.castShadow = true;
    g.add(tower);
    const cab = new THREE.Mesh(ctx.geo(box(9, 7, 8)), ctx.mat(0xb8b2a4, 0.2, 0.75));
    cab.position.set(s * (pitR * 1.9 + 10), th * 0.72, 0);
    g.add(cab);
  }
  g.add(lightningMasts(ctx, 4, pitR * 4.6, H * 1.25));
  for (const o of infrastructure(ctx, 20, -1)) g.add(o);

  return {
    group: g,
    trenchAzimuth: 0,
    mouthRadius: pitR,
    mountHeight: 3,
    animate(_t, altAGL) {
      const drop = smoothstep(0, 26, altAGL);
      for (const a of arms) a.rotation.z = -drop * 1.45;
      for (let i = 0; i < cableMasts.length; i++) cableMasts[i].rotation.x = (i ? -1 : 1) * smoothstep(0, 60, altAGL) * 1.2;
    },
  };
};

// ------------------------------------------------ Baikonur: Gagarin's Start and Site 31 (V05)

/**
 * How far an R-7 hangs below its launch table's deck, m: the four support
 * arms hold it by the strap-ons' upper ends, and its engines stand down in the
 * table's opening (estimate).
 */
export const R7_HANG = 4.5;
/** The launch table's opening, radius, m: 15 m across (ESA's description of the Baikonur design it copied at Kourou). */
const R7_OPENING = 7.5;
/** Outer radius of the turning table, and of the hole the fixed structure leaves for it, m (estimate) */
const R7_TABLE = 10.5;
/** The support arms lean 17° in from the vertical while they hold the rocket (КБОМ study, CyberLeninka). */
const R7_ARM_LEAN = 17 * DEG2;
/** How far out the counterweights swing the arms once the load comes off, rad (estimate) */
const R7_ARM_OPEN = 60 * DEG2;
/** The clamp at an arm's top reaches this far in from the arm's axis, m */
export const R7_CLAMP_IN = 1.45;

/**
 * One of Baikonur's R-7 pads (roadmap V05). Distances along the pit are `u`,
 * the way the flame leaves, and across it `v`, both from the rocket's axis.
 */
interface R7PadSpec {
  /** compass azimuth of the pit's axis, deg (an estimate: no source gives it) */
  pitAz: number;
  /** the pit's rim: from behind the rocket to its far end along `u`, and half its width, m */
  near: number; far: number; halfTop: number;
  /** where its floor meets the far ramp, the floor's half width and the depth, m */
  ramp: number; halfFloor: number; depth: number;
  /** the launcher's own deck over the pit, from `near` to this `u`, m */
  bridgeEnd: number;
  /** the concrete around the pit, m of `u` behind and beyond it and of `v` to each side */
  deck: [number, number, number];
  /** rail line from the launcher's back to the assembly building, m; the building's length, width, height */
  rail: number; mik: [number, number, number];
  /** the command bunker, at this `u`, `v` */
  bunker: [number, number];
  /** lightning masts' height, m, at these `u`, `v` */
  mastH: number; masts: [number, number][];
  /** floodlight masts at these `u`, `v` */
  floods: [number, number][];
  /** propellant tanks and water tower, at `u`, `v` */
  tanks: [number, number]; water: [number, number];
  colors: { arm: number; mast: number; gantry: number; table: number; concrete: number; pitTop: number; pitFloor: number; mikWall: number };
  /** Gagarin's Start: the cottages Korolev and Gagarin slept in before Vostok 1, by the assembly building */
  cottages?: boolean;
  /** Site 31: the service cabin's niche in the gas duct's wall, shut for launch */
  cabinNiche?: boolean;
}

/** Pad-local (x east, z south) from a pad's `u`, `v`. */
function padPoint(ux: number, uz: number, u: number, v: number): [number, number] {
  return [u * ux - v * uz, u * uz + v * ux];
}

/** The pit, in its own axes (x = `u`, z = `v`): walls darkening with depth, seen from above and inside. */
function r7Pit(ctx: Ctx, p: R7PadSpec): THREE.Mesh {
  const pos: number[] = [], col: number[] = [];
  const top = new THREE.Color(p.colors.pitTop), bottom = new THREE.Color(p.colors.pitFloor), c = new THREE.Color();
  type P = [number, number, number];
  const quad = (...q: P[]) => {
    for (const i of [0, 1, 2, 0, 2, 3]) {
      const [x, y, z] = q[i];
      pos.push(x, y, z);
      c.copy(top).lerp(bottom, Math.min(1, -y / p.depth));
      col.push(c.r, c.g, c.b);
    }
  };
  const D = -p.depth;
  const P0: P = [p.near, 0, -p.halfTop], P1: P = [p.far, 0, -p.halfTop], P2: P = [p.far, 0, p.halfTop], P3: P = [p.near, 0, p.halfTop];
  const F0: P = [p.near, D, -p.halfFloor], F1: P = [p.ramp, D, -p.halfFloor], F2: P = [p.ramp, D, p.halfFloor], F3: P = [p.near, D, p.halfFloor];
  quad(F0, F1, F2, F3);   // floor
  quad(F1, P1, P2, F2);   // the far ramp the exhaust leaves by
  quad(P0, P1, F1, F0);   // side walls
  quad(P3, F3, F2, P2);
  quad(P0, F0, F3, P3);   // the wall under the launcher
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(ctx.geo(g), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0, side: THREE.DoubleSide }));
  m.receiveShadow = true;
  return m;
}

/** A flat slab from `u0`..`u1`, `v0`..`v1` with a rectangular hole, in the pad's axes. */
function slabWithHole(ctx: Ctx, outer: [number, number, number, number], hole: [number, number, number, number], color: number, y: number): THREE.Mesh {
  const [u0, u1, v0, v1] = outer, [h0, h1, k0, k1] = hole;
  // shape (x, y) becomes (x, 0, −y) once laid flat
  const shape = new THREE.Shape([new THREE.Vector2(u0, -v0), new THREE.Vector2(u1, -v0), new THREE.Vector2(u1, -v1), new THREE.Vector2(u0, -v1)]);
  shape.holes.push(new THREE.Path([new THREE.Vector2(h0, -k0), new THREE.Vector2(h0, -k1), new THREE.Vector2(h1, -k1), new THREE.Vector2(h1, -k0)]));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  const m = new THREE.Mesh(ctx.geo(g), ctx.mat(color, 0.02, 0.95));
  m.receiveShadow = true;
  return m;
}

/** The launcher's deck over the pit's near end, with the round hole the turning table sits in. */
function launcherDeck(ctx: Ctx, u0: number, u1: number, halfW: number, thick: number, color: number): THREE.Mesh {
  const shape = new THREE.Shape([new THREE.Vector2(u0, -halfW), new THREE.Vector2(u1, -halfW), new THREE.Vector2(u1, halfW), new THREE.Vector2(u0, halfW)]);
  const hole = new THREE.Path();
  hole.absarc(0, 0, R7_TABLE + 0.1, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 40 });
  g.rotateX(-Math.PI / 2);   // the extrusion rises along +y
  g.translate(0, -thick, 0);
  const m = new THREE.Mesh(ctx.geo(g), ctx.mat(color, 0.05, 0.9));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/**
 * The R-7's launch system (КБОМ, "Тюльпан"), turned to the launch azimuth as
 * the real table is: the ring the rocket hangs in, the four support arms at
 * the strap-ons' upper ends with their counterweights, and the two cable
 * masts, already swung back (T−35 s and T−15 s; the countdown here starts at
 * T−10 s). Built in the rocket's own axes: the strap-ons lie on ±x and ±z.
 */
function r7LaunchSystem(ctx: Ctx, p: R7PadSpec): { group: THREE.Group; arms: THREE.Group[] } {
  const g = new THREE.Group();
  const heading = azDir(ctx.azimuth / DEG2);
  g.rotation.y = Math.atan2(-heading.y, heading.x);
  // the turning table: a steel ring round the opening
  const ring = new THREE.Shape();
  ring.absarc(0, 0, R7_TABLE, 0, Math.PI * 2, false);
  const inner = new THREE.Path();
  inner.absarc(0, 0, R7_OPENING, 0, Math.PI * 2, true);
  ring.holes.push(inner);
  const ringGeo = new THREE.ExtrudeGeometry(ring, { depth: 2.4, bevelEnabled: false, curveSegments: 48 });
  ringGeo.rotateX(-Math.PI / 2);
  ringGeo.translate(0, -2.4, 0);
  const table = new THREE.Mesh(ctx.geo(ringGeo), ctx.mat(p.colors.table, 0.45, 0.55));
  table.castShadow = true; table.receiveShadow = true;
  g.add(table);

  // four arms, each at a strap-on: pivot on the table, top at the strap-on's upper end
  const core = ctx.vehicle.stages[0], strap = core.boosters?.[0];
  const strapR = strap ? core.diameter / 2 + strap.diameter / 2 : ctx.R * 0.6;
  const holdY = -R7_HANG + (strap ? strap.length * 0.85 : ctx.H * 0.35);
  const pivotY = 0.6;
  const armL = (holdY - pivotY) / Math.cos(R7_ARM_LEAN);
  const topR = strapR + (strap ? strap.diameter / 2 : 1.3) + 0.25;
  const pivotR = topR + armL * Math.sin(R7_ARM_LEAN);
  const lever = Math.hypot(2.8, 2.2), leverA = Math.atan2(-2.2, 2.8);
  const leverGeo = new THREE.BoxGeometry(lever, 0.6, 0.8);
  leverGeo.rotateZ(leverA);
  leverGeo.translate(1.4, -1.1, 0);
  const armGeo = ctx.geo(merged([
    lattice(1.3, 1.0, armL, Math.max(4, Math.round(armL / 2.2)), 0.26),
    box(1.8, 1.1, 1.3, -0.55, armL, 0),            // the clamp at the strap-on's pocket
    leverGeo,
    box(2.2, 2.6, 2.0, 2.8, -3.5, 0),              // the counterweight
  ]));
  const armMat = ctx.mat(p.colors.arm, 0.35, 0.6);
  const arms: THREE.Group[] = [];
  for (let k = 0; k < 4; k++) {
    const az = new THREE.Group();
    az.rotation.y = -k * Math.PI / 2;
    const pivot = new THREE.Group();
    pivot.position.set(pivotR, pivotY, 0);
    pivot.rotation.z = R7_ARM_LEAN;
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.castShadow = true;
    arm.userData.part = 'r7Arm';
    pivot.add(arm);
    az.add(pivot);
    g.add(az);
    arms.push(pivot);
  }

  // the cable masts between the arms, swung back from the rocket: the fuelling
  // and cable mast to the core, the upper cable mast to Blok I
  const mastMat = ctx.mat(p.colors.mast, 0.35, 0.6);
  for (const [phi, h, lean] of [[Math.PI / 4, 27, 28 * DEG2], [Math.PI * 5 / 4, 38, 22 * DEG2]] as const) {
    const az = new THREE.Group();
    az.rotation.y = -phi;
    const pivot = new THREE.Group();
    pivot.position.set(R7_TABLE + 1.2, 0, 0);
    pivot.rotation.z = -lean;
    const mast = new THREE.Mesh(ctx.geo(merged([
      lattice(2.2, 2.2, h, Math.round(h / 2.6), 0.32),
      box(5.5, 0.9, 1.2, -2.6, h - 1.5, 0),        // the boom that carried the connectors
      box(3.4, 0.3, 3.4, 0, h * 0.5, 0),           // a working platform
    ])), mastMat);
    mast.castShadow = true;
    pivot.add(mast);
    az.add(pivot);
    g.add(az);
  }
  return { group: g, arms };
}

/** A straight rail line on its bed, with its sleepers, along `u` from `u0` back to `u1` (`u1` < `u0`). */
function railLine(ctx: Ctx, u0: number, u1: number, v: number): THREE.Object3D[] {
  const len = u0 - u1, mid = (u0 + u1) / 2, gauge = 1.52;
  const out: THREE.Object3D[] = [];
  const bed = new THREE.Mesh(ctx.geo(box(len, 0.35, 4.6, mid, 0.05, v)), ctx.mat(0x6f675c, 0, 0.98));
  bed.receiveShadow = true;
  out.push(bed);
  out.push(new THREE.Mesh(ctx.geo(merged([box(len, 0.16, 0.08, mid, 0.33, v - gauge / 2), box(len, 0.16, 0.08, mid, 0.33, v + gauge / 2)])), ctx.mat(0x7a7d80, 0.8, 0.35)));
  const n = Math.floor(len / 0.6);
  const sleepers = new THREE.InstancedMesh(ctx.geo(new THREE.BoxGeometry(0.26, 0.14, 2.75)), ctx.mat(0x4a4038, 0, 0.9), n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    m.makeTranslation(u1 + 0.3 + i * 0.6, 0.25, v);
    sleepers.setMatrixAt(i, m);
  }
  sleepers.instanceMatrix.needsUpdate = true;
  out.push(sleepers);
  return out;
}

/** The erector the rocket rode out on, lying on the rail, and the shunting locomotive, along `u` from `u0`. */
function erectorTrain(ctx: Ctx, u0: number, v: number): THREE.Object3D[] {
  const girder = lattice(3.0, 3.4, 51, 16, 0.34);
  girder.rotateZ(-Math.PI / 2);                    // its length along +u
  girder.translate(u0, 3.2, v);
  const parts = [girder, box(4, 5.5, 4.2, u0 + 0.5, 3.1, v), box(2.2, 3.6, 4.6, u0 + 49, 4.6, v)];
  for (const du of [3, 14, 37, 48]) parts.push(box(3.2, 1.3, 2.9, u0 + du, 1.05, v));
  const erector = new THREE.Mesh(ctx.geo(merged(parts)), ctx.mat(0x56644f, 0.3, 0.7));
  erector.castShadow = true;
  const lu = u0 - 20;
  const loco = new THREE.Mesh(ctx.geo(merged([
    box(13.5, 3.3, 3.1, lu - 1.2, 2.55, v), box(3.6, 4.4, 3.2, lu + 7.3, 3.1, v),
    box(3, 1.1, 2.6, lu - 5.5, 0.95, v), box(3, 1.1, 2.6, lu + 5.5, 0.95, v),
  ])), ctx.mat(0x2f5f8f, 0.25, 0.6));
  loco.castShadow = true;
  const stripe = new THREE.Mesh(ctx.geo(box(17.2, 0.35, 3.25, lu + 0.6, 2.2, v)), ctx.mat(0xe9e6dc, 0.1, 0.6));
  return [erector, loco, stripe];
}

/** An assembly building (МИК) at the rail line's end: the high bay the rocket rides out of, an annex beside it. */
function assemblyBuilding(ctx: Ctx, uDoor: number, v: number, [L, W, H]: [number, number, number], wall: number): THREE.Object3D[] {
  const cu = uDoor - L / 2;
  const walls = new THREE.Mesh(ctx.geo(merged([
    box(L, H, W, cu, H / 2, v),
    box(L * 0.7, H * 0.45, W * 0.8, cu - L * 0.05, H * 0.225, v + W * 0.9),
  ])), ctx.mat(wall, 0.05, 0.85));
  walls.castShadow = true; walls.receiveShadow = true;
  const roof = new THREE.Mesh(ctx.geo(merged([
    box(L * 1.01, 0.8, W * 1.02, cu, H + 0.4, v),
    box(L * 0.71, 0.6, W * 0.82, cu - L * 0.05, H * 0.45 + 0.3, v + W * 0.9),
  ])), ctx.mat(0x6f7378, 0.1, 0.8));
  // the gate the rail runs in by, facing the pad
  const gate = new THREE.Mesh(ctx.geo(box(0.4, H * 0.8, 14, uDoor + 0.2, H * 0.4, v)), ctx.mat(0x3d4247, 0.4, 0.6));
  return [walls, roof, gate];
}

/** The command bunker: an earth mound over the rooms, the entrance, two periscopes. */
function bunker(ctx: Ctx, u: number, v: number): THREE.Object3D[] {
  const mound = new THREE.SphereGeometry(17, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  mound.scale(1, 0.36, 1);
  mound.translate(u, 0, v);
  const earth = new THREE.Mesh(ctx.geo(mound), ctx.mat(0x8a8260, 0, 1));
  earth.receiveShadow = true;
  const towardPad = Math.atan2(-v, -u);
  const e = [Math.cos(towardPad) * 17, Math.sin(towardPad) * 17];
  const concrete = new THREE.Mesh(ctx.geo(merged([
    box(7, 3.4, 5, u + e[0], 1.7, v + e[1], -towardPad),
    cyl(0.35, 0.35, 2.4, u - 2, 6.6, v, 8), cyl(0.35, 0.35, 2.4, u + 2, 6.6, v, 8),
  ])), ctx.mat(0xb7b3a8, 0.05, 0.9));
  concrete.castShadow = true;
  return [earth, concrete];
}

/** The two cottages at Site 2 where Korolev and Gagarin spent the night before Vostok 1, with their trees. */
function cottages(ctx: Ctx, u: number, v: number): THREE.Object3D[] {
  const walls: THREE.BufferGeometry[] = [], roofs: THREE.BufferGeometry[] = [], trees: THREE.BufferGeometry[] = [];
  for (const [du, dv] of [[0, 0], [30, 22]]) {
    walls.push(box(11, 3.2, 8, u + du, 1.6, v + dv));
    const tri = new THREE.Shape([new THREE.Vector2(-4.4, 0), new THREE.Vector2(4.4, 0), new THREE.Vector2(0, 2.4)]);
    const roof = new THREE.ExtrudeGeometry(tri, { depth: 12, bevelEnabled: false });
    roof.translate(0, 3.2, -6);
    roof.rotateY(Math.PI / 2);
    roof.translate(u + du, 0, v + dv);
    roofs.push(roof);
  }
  for (let i = 0; i < 12; i++) {
    const a = hash11(i * 3.1) * Math.PI * 2, r = 14 + hash11(i * 7.7) * 22;
    const cone = new THREE.ConeGeometry(2.6, 8, 7);
    cone.translate(u + 15 + Math.cos(a) * r, 5.5, v + 11 + Math.sin(a) * r);
    trees.push(cone, cyl(0.25, 0.3, 2, u + 15 + Math.cos(a) * r, 1, v + 11 + Math.sin(a) * r, 5));
  }
  const w = new THREE.Mesh(ctx.geo(merged(walls)), ctx.mat(0xe4dccb, 0.02, 0.9));
  w.castShadow = true;
  // extruded, so unindexed like one another
  const r = new THREE.Mesh(ctx.geo(merged(roofs)), ctx.mat(0x6e4a3a, 0.05, 0.85));
  const t = new THREE.Mesh(ctx.geo(merged(trees)), ctx.mat(0x4f5f36, 0, 0.95));
  t.castShadow = true;
  return [w, r, t];
}

/**
 * An R-7 pad at Baikonur (V05): the pit, the launcher's deck over its near
 * end, the launch system turned to the azimuth, the service gantry's halves
 * lowered either side, the rail line to the assembly building with the
 * erector and its locomotive, the bunker, the propellant store, the masts.
 * Dimensions come with their sources in docs/IMPLEMENTATION-STATUS.md; what
 * no source gives is an estimate, marked as one.
 */
function r7BaikonurPad(ctx: Ctx, p: R7PadSpec): PadBuild {
  const root = new THREE.Group();
  const axis = azDir(p.pitAz);
  const ux = axis.x, uz = axis.y;
  // the pad's own axes: x along the pit (the way the flame leaves), z across it
  const site = new THREE.Group();
  site.rotation.y = Math.atan2(-uz, ux);
  root.add(site);

  site.add(r7Pit(ctx, p));
  const [behind, beyond, side] = p.deck;
  site.add(slabWithHole(ctx, [p.near - behind, p.far + beyond, -p.halfTop - side, p.halfTop + side], [p.near, p.far, -p.halfTop, p.halfTop], p.colors.concrete, 0.02));
  site.add(launcherDeck(ctx, p.near, p.bridgeEnd, p.halfTop + 2, 7, p.colors.concrete));
  // piers from the pit's floor to the deck, and the one-sided deflector under the rocket
  const piers: THREE.BufferGeometry[] = [];
  for (const u of [p.near + 4, p.bridgeEnd - 4]) for (const v of [-p.halfFloor * 0.7, p.halfFloor * 0.7]) piers.push(box(5, p.depth - 7, 5, u, -7 - (p.depth - 7) / 2, v));
  const shelf = new THREE.Shape([new THREE.Vector2(p.near, -p.depth), new THREE.Vector2(p.near, -p.depth * 0.45), new THREE.Vector2(p.near + p.depth * 1.1, -p.depth)]);
  const deflector = new THREE.ExtrudeGeometry(shelf, { depth: p.halfFloor * 1.6, bevelEnabled: false });
  deflector.translate(0, 0, -p.halfFloor * 0.8);
  const pierMat = ctx.mat(0x7c776d, 0.05, 0.95);
  site.add(new THREE.Mesh(ctx.geo(merged(piers)), pierMat), new THREE.Mesh(ctx.geo(deflector), pierMat));
  if (p.cabinNiche) {
    // the service cabin's niche, shut: the cabin rides out of it under the rocket between launches
    site.add(new THREE.Mesh(ctx.geo(box(0.4, 8, 17, p.near + 0.25, -7 - 4.5, 0)), ctx.mat(0x7d8b93, 0.5, 0.5)));
  }

  // the launch system, turned to the azimuth in the pad's own frame
  const sys = r7LaunchSystem(ctx, p);
  root.add(sys.group);

  // the service gantry's two halves, lowered either side of the pit
  const gantryMat = ctx.mat(p.colors.gantry, 0.35, 0.6);
  for (const s of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(-2, 3.4, s * (R7_TABLE + 3));
    pivot.rotation.x = s * (Math.PI / 2 - 0.05);
    const half = new THREE.Mesh(ctx.geo(merged([lattice(9, 6, 50, 12, 0.6), box(10, 0.5, 7, 0, 50, 0)])), gantryMat);
    half.castShadow = true;
    pivot.add(half);
    site.add(pivot);
  }

  // lightning masts round the pad
  const mastMesh = new THREE.InstancedMesh(ctx.geo(mastGeo(p.mastH)), ctx.mat(0xb9bcc0, 0.4, 0.55), p.masts.length);
  const mm = new THREE.Matrix4();
  p.masts.forEach(([u, v], i) => { mm.makeTranslation(u, 0, v); mastMesh.setMatrixAt(i, mm); });
  mastMesh.instanceMatrix.needsUpdate = true;
  mastMesh.castShadow = true;
  site.add(mastMesh);

  // the rail line to the assembly building, the erector parked at its door
  const railEnd = p.near - p.rail;
  for (const o of railLine(ctx, p.near - 1, railEnd, 0)) site.add(o);
  for (const o of erectorTrain(ctx, railEnd + 30, 0)) site.add(o);
  for (const o of assemblyBuilding(ctx, railEnd, 0, p.mik, p.colors.mikWall)) site.add(o);
  if (p.cottages) for (const o of cottages(ctx, railEnd - p.mik[0] * 0.4, p.mik[1] + 120)) site.add(o);
  for (const o of bunker(ctx, p.bunker[0], p.bunker[1])) site.add(o);
  const tanks = tankFarm(ctx, p.tanks[0], p.tanks[1], 4, 5, 13);
  site.add(tanks);
  site.add(waterTower(ctx, p.water[0], p.water[1], 34));

  // roads: along the rail, to the bunker, round the pad; a few service buildings by the bunker
  const roads: THREE.BufferGeometry[] = [
    box(p.rail + 40, 0.12, 8, p.near - p.rail / 2, 0.08, 16),
    box(8, 0.12, Math.abs(p.bunker[1]) + 10, p.bunker[0], 0.08, p.bunker[1] / 2),
    box(p.far - p.near + behind + beyond, 0.12, 8, (p.near - behind + p.far + beyond) / 2, 0.08, p.halfTop + side - 6),
    box(p.far - p.near + behind + beyond, 0.12, 8, (p.near - behind + p.far + beyond) / 2, 0.08, -p.halfTop - side + 6),
  ];
  site.add(new THREE.Mesh(ctx.geo(merged(roads)), ctx.mat(0x4b4b4d, 0, 0.98)));
  const huts: THREE.BufferGeometry[] = [], hutRoofs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const u = p.bunker[0] - 70 - hash11(i * 4.3) * 90, v = p.bunker[1] + Math.sign(p.bunker[1]) * (30 + hash11(i * 2.9) * 70);
    const w = 14 + hash11(i * 8.1) * 22, d = 10 + hash11(i * 1.7) * 14, h = 4 + hash11(i * 6.1) * 6;
    huts.push(box(w, h, d, u, h / 2, v));
    hutRoofs.push(box(w * 1.05, 0.5, d * 1.05, u, h + 0.25, v));
  }
  const hm = new THREE.Mesh(ctx.geo(merged(huts)), ctx.mat(0xd9d6cc, 0.05, 0.85));
  hm.castShadow = true;
  site.add(hm, new THREE.Mesh(ctx.geo(merged(hutRoofs)), ctx.mat(0x6f7378, 0.1, 0.8)));

  // what the ground and the floodlights need to know, in the pad's x/z
  const at = (u: number, v: number) => padPoint(ux, uz, u, v);
  const [cx, cz] = at((p.near + p.far) / 2, 0);
  const holes: PitHole[] = [{ x: cx, z: cz, ux, uz, halfL: (p.far - p.near) / 2, halfW: p.halfTop }];
  const clearings: { x: number; z: number; r: number; h: number }[] = [];
  for (let u = p.near - 300; u > railEnd - p.mik[0] - 60; u -= 70) { const [x, z] = at(u, 0); clearings.push({ x, z, r: 45, h: 0 }); }
  { const [x, z] = at(railEnd - p.mik[0] / 2, p.mik[1] * 0.4); clearings.push({ x, z, r: p.mik[0] * 0.9, h: 0 }); }
  if (p.cottages) { const [x, z] = at(railEnd - p.mik[0] * 0.4, p.mik[1] + 130); clearings.push({ x, z, r: 70, h: 0 }); }

  return {
    group: root,
    trenchAzimuth: Math.atan2(uz, ux),
    mouthRadius: R7_OPENING * 1.6,
    // the rocket hangs in the table: its base is below the deck the ground is level with
    mountHeight: -R7_HANG,
    holes, clearings,
    floodPositions: p.floods.map(([u, v]) => at(u, v)),
    animate(_t, altAGL) {
      // the load comes off the arms as the rocket rises, and their counterweights swing them out
      const open = smoothstep(0.05, 3.0, altAGL);
      for (const a of sys.arms) a.rotation.z = R7_ARM_LEAN - open * (R7_ARM_LEAN + R7_ARM_OPEN);
    },
  };
}

/**
 * Gagarin's Start, Site 1/5: the pit dug in 1956, 250 m long, 100 m wide and
 * 45 m deep (Roscosmos; 50 m in Техника—молодёжи 1991), the bunker 200 m away
 * (4glaza, elementy), the assembly building at Site 2 some 1.6–2 km off
 * (GlobalSecurity; en.wikipedia), and the cottages by it (Advantour).
 */
const gagarinStart: Builder = (ctx) => r7BaikonurPad(ctx, {
  pitAz: 300, near: -25, far: 225, halfTop: 50, ramp: 170, halfFloor: 38, depth: 45, bridgeEnd: 18,
  deck: [110, 70, 80], rail: 1750, mik: [130, 48, 30], bunker: [-30, 200],
  mastH: 68, masts: [[-70, 90], [-70, -90], [120, 95], [120, -95]],
  floods: [[-48, 62], [-48, -62], [30, 66], [30, -66]],
  tanks: [-160, -210], water: [-300, 190],
  colors: { arm: 0x7d8a86, mast: 0x8f9496, gantry: 0x9aa0a6, table: 0x5f6468, concrete: 0xa7a398, pitTop: 0x9b917c, pitFloor: 0x3a342c, mikWall: 0xd6d2c4 },
  cottages: true,
});

/**
 * Site 31/6: the same launch system over a smaller trench (en.wikipedia,
 * RussianSpaceWeb: "scaled down"), at least 20 m deep where the service cabin
 * fell in November 2025, the cabin's niche in its wall (Habr, iXBT); its
 * assembly building, structure 40, a few hundred metres off (ESA: 600 m,
 * uncertain). Trench length and width, the bunker's place and the buildings'
 * sizes are estimates.
 */
const site31: Builder = (ctx) => r7BaikonurPad(ctx, {
  pitAz: 250, near: -15, far: 120, halfTop: 16, ramp: 88, halfFloor: 13, depth: 24, bridgeEnd: 15,
  deck: [100, 60, 85], rail: 650, mik: [110, 42, 26], bunker: [-20, -150],
  mastH: 64, masts: [[-60, 55], [-60, -55], [70, 55], [70, -55]],
  floods: [[-46, 40], [-46, -40], [30, 44], [30, -44]],
  tanks: [-150, 190], water: [-260, -210],
  colors: { arm: 0x8e9aa6, mast: 0xa9b0b6, gantry: 0xaab1b8, table: 0x646a70, concrete: 0xacaaa0, pitTop: 0x9a9384, pitFloor: 0x3b3833, mikWall: 0xdedbd0 },
  cabinNiche: true,
});

/**
 * Baikonur: an R-7 flies from the pad the mission names, Site 31/6 unless it
 * is Gagarin's Start; anything else (Proton's own pads are not drawn) keeps
 * the generic pad.
 */
const baikonurPad: Builder = (ctx) => (ctx.vehicle.stages[0]?.profile !== 'r7Core' ? soyuzPad(ctx)
  : ctx.pad === 'site1' ? gagarinStart(ctx) : site31(ctx));

/** Cape Canaveral SLC-40 style: transporter/erector, trench, lightning masts. */
const slc40Pad: Builder = (ctx) => {
  const g = new THREE.Group();
  const H = ctx.H;
  const deck = ctx.geo(new THREE.BoxGeometry(110, 2.5, 110));
  const deckM = new THREE.Mesh(deck, ctx.mat(0x9e9c94, 0.05, 0.92));
  deckM.position.y = -1.25;
  deckM.receiveShadow = true;
  g.add(deckM);
  for (const o of flameTrench(ctx, 26, 130, 14, 0)) g.add(o);
  // launch mount
  const mount = new THREE.Mesh(ctx.geo(merged([
    box(20, 6, 20, 0, 3, 0),
    ...[0, 1, 2, 3].map((i) => { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; return cyl(1.3, 1.3, 6, Math.cos(a) * 8, 3, Math.sin(a) * 8, 8); }),
  ])), ctx.mat(0x55595e, 0.5, 0.5));
  mount.castShadow = true;
  g.add(mount);

  // strongback / transporter-erector: hinged at -X, retracts before liftoff
  const sbPivot = new THREE.Group();
  sbPivot.position.set(-(ctx.R + 3.5), 1, 0);
  const sbLen = H * 0.92;
  const sb = new THREE.Mesh(ctx.geo(lattice(4.5, 5.5, sbLen, 16, 0.6)), ctx.mat(0x9fa3a8, 0.5, 0.5));
  sb.castShadow = true;
  sbPivot.add(sb);
  // cradles that hold the vehicle
  for (let i = 1; i <= 3; i++) {
    const arm = new THREE.Mesh(ctx.geo(box(3.4, 1.6, 2.4, 1.9, sbLen * (i / 4), 0)), ctx.mat(0xcfd2d6, 0.4, 0.5));
    sbPivot.add(arm);
  }
  g.add(sbPivot);
  const tel = new THREE.Mesh(ctx.geo(box(10, 3, sbLen * 0.55, -(ctx.R + 8), 1.5, 0)), ctx.mat(0x6a6e73, 0.4, 0.6));
  g.add(tel);
  // rails
  g.add(new THREE.Mesh(ctx.geo(merged([box(2, 0.5, 260, -(ctx.R + 3), 0.3, 0), box(2, 0.5, 260, -(ctx.R + 13), 0.3, 0)])), ctx.mat(0x6b6b6b, 0.3, 0.8)));

  g.add(lightningMasts(ctx, 4, 78, H * 1.18));
  g.add(waterTower(ctx, -170, 95, 42));
  const block = new THREE.Mesh(ctx.geo(merged([box(34, 8, 24, -215, 4, -130), box(40, 4, 30, -215, 1.5, -130)])), ctx.mat(0xcbc7bc, 0.05, 0.9));
  block.castShadow = true;
  g.add(block);
  g.add(tankFarm(ctx, 150, -110, 4, 6, 14));
  for (const o of infrastructure(ctx, 290, 1)) g.add(o);

  return {
    group: g,
    trenchAzimuth: 0,
    mouthRadius: 15,
    mountHeight: 6,
    animate(t) {
      // retract from T-7 s, clear by T-3 s, then continue away after liftoff;
      // the hinge is on the -X side, so a positive turn about Z tips it away
      // from the vehicle (a negative one swept it through the rocket)
      const a = smoothstep(-7, -3, t) * 1.12 + smoothstep(0, 6, t) * 0.18;
      sbPivot.rotation.z = a;
    },
  };
};

/** Vandenberg SLC-4E: hillside pad, two masts, a rolled-back mobile shelter. */
const slc4ePad: Builder = (ctx) => {
  const base = slc40Pad(ctx);
  const g = base.group;
  const shelter = new THREE.Mesh(ctx.geo(merged([
    box(26, ctx.H * 0.8, 34, 0, ctx.H * 0.4, 0),
    box(30, 3, 38, 0, ctx.H * 0.8 + 1.5, 0),
  ])), ctx.mat(0x8d9299, 0.25, 0.7));
  shelter.position.set(-150, 1, 60);
  shelter.castShadow = true;
  g.add(shelter);
  return base;
};

/** A thin straight member from `a` to `b` (a guy or catenary wire, a brace). */
function strut(a: THREE.Vector3, b: THREE.Vector3, r: number): THREE.BufferGeometry {
  const d = new THREE.Vector3().subVectors(b, a);
  const g = new THREE.CylinderGeometry(r, r, d.length(), 5, 1);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

/** Height of LC-39A's hardstand over the marsh around it, m. */
const LC39A_MOUND = 14;

/**
 * Kennedy LC-39A: the Apollo and Shuttle pad that Falcon 9 and Falcon Heavy
 * fly from. The pad sits on a raised octagonal hardstand about 15 m above
 * the marsh, reached by a ramp from the west, with the flame trench running
 * north-south through it. The Shuttle-era fixed service structure stands
 * beside the mount, its lightning mast and catenary wires on top and the crew
 * access arm swung clear; the transporter-erector that brought the rocket up
 * the ramp and lifted it stands on the west side and tips back before
 * liftoff.
 */
const lc39aPad: Builder = (ctx) => {
  const g = new THREE.Group();
  const H = ctx.H;
  const top = LC39A_MOUND;
  const concrete = ctx.mat(0xa4a298, 0.05, 0.92);
  // The hardstand: an octagonal mound, flat on top, and the ramp up to it.
  const mound = new THREE.CylinderGeometry(80, 122, top, 8, 1);
  mound.rotateY(Math.PI / 8);
  mound.translate(0, top / 2, 0);
  const rampLen = 120, slope = Math.atan2(top, rampLen);
  const ramp = new THREE.BoxGeometry(rampLen / Math.cos(slope), 1.6, 26);
  ramp.rotateZ(slope);
  ramp.translate(-72 - rampLen / 2, top / 2 - 0.6, 0);
  const hard = new THREE.Mesh(ctx.geo(merged([mound, ramp])), concrete);
  hard.receiveShadow = true;
  hard.castShadow = true;
  g.add(hard);
  const deck = new THREE.Group();
  deck.position.y = top;
  g.add(deck);
  for (const o of [...flameTrench(ctx, 18, 70, 12, 0), ...flameTrench(ctx, 18, 70, 12, Math.PI)]) deck.add(o);
  const mount = new THREE.Mesh(ctx.geo(merged([
    box(24, 6, 24, 0, 3, 0),
    ...[0, 1, 2, 3].map((i) => { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; return cyl(1.4, 1.4, 6, Math.cos(a) * 9, 3, Math.sin(a) * 9, 8); }),
  ])), ctx.mat(0x55595e, 0.5, 0.5));
  mount.castShadow = true;
  deck.add(mount);

  // Fixed service structure, east of the mount, with the mast and wires.
  const fssH = 81, fssX = ctx.R + 17, fssZ = -4;
  const steel = ctx.mat(0x8f9398, 0.45, 0.55);
  const fss = new THREE.Mesh(ctx.geo(merged([
    lattice(12, 12, fssH, 14, 0.8),
    box(13, 1.2, 13, 0, fssH, 0),
    lattice(3, 3, 26, 6, 0.35).translate(0, fssH, 0),
    cyl(0.25, 0.4, 8, 0, fssH + 30, 0, 6),
  ])), steel);
  fss.position.set(fssX, 0, fssZ);
  fss.castShadow = true;
  deck.add(fss);
  const tip = new THREE.Vector3(fssX, top + fssH + 34, fssZ);
  const wires = new THREE.Mesh(ctx.geo(merged([
    strut(tip, new THREE.Vector3(fssX, 0, fssZ - 320), 0.12),
    strut(tip, new THREE.Vector3(fssX, 0, fssZ + 340), 0.12),
  ])), ctx.mat(0x3b3d40, 0.3, 0.7));
  g.add(wires);
  // Crew access arm, swung clear of the vehicle, at the capsule's height.
  const toVehicle = new THREE.Vector2(-fssX, -fssZ);
  const armLen = toVehicle.length() - 6 - ctx.R - 1;
  const arm = hingedArm(ctx, armLen, 3, 0xc9ccd0);
  const armY = Math.min(fssH - 4, 6 + H * 0.86);
  arm.position.set(fssX + (toVehicle.x / toVehicle.length()) * 6, armY, fssZ + (toVehicle.y / toVehicle.length()) * 6);
  arm.rotation.y = Math.atan2(-toVehicle.y, toVehicle.x) + Math.PI / 2;
  deck.add(arm);

  // Transporter-erector on the ramp side, hinged at the mount.
  const tePivot = new THREE.Group();
  tePivot.position.set(-(ctx.R + 3.5), 6, 0);
  const teLen = H * 0.93;
  const te = new THREE.Mesh(ctx.geo(merged([
    lattice(5, 6, teLen, 18, 0.65),
    ...[1, 2, 3].map((i) => box(3.4, 1.6, 2.4, 1.9, teLen * (i / 4), 0)),
  ])), ctx.mat(0xa6aaaf, 0.5, 0.5));
  te.castShadow = true;
  tePivot.add(te);
  deck.add(tePivot);
  // Its rails down the ramp.
  const railParts: THREE.BufferGeometry[] = [];
  for (const z of [-5, 5]) {
    const r = new THREE.BoxGeometry(rampLen / Math.cos(slope) + 70, 0.5, 1.2);
    r.rotateZ(slope);
    r.translate(-72 - rampLen / 2, top / 2 + 0.5, z);
    railParts.push(r);
  }
  g.add(new THREE.Mesh(ctx.geo(merged(railParts)), ctx.mat(0x6b6b6b, 0.3, 0.8)));

  // The Shuttle-era sound-suppression water tower and the pad's tank farm.
  g.add(waterTower(ctx, -260, -170, 88));
  g.add(tankFarm(ctx, 190, 150, 2, 9, 16));
  g.add(tankFarm(ctx, -170, 190, 2, 7, 12));
  // SpaceX's hangar at the foot of the ramp.
  const hif = new THREE.Mesh(ctx.geo(merged([box(60, 24, 110, -330, 12, 0), box(64, 2, 114, -330, 25, 0)])), ctx.mat(0xd5d2c9, 0.05, 0.85));
  hif.castShadow = true;
  g.add(hif);
  for (const o of infrastructure(ctx, 270, -1)) g.add(o);

  return {
    group: g,
    trenchAzimuth: 0,
    mouthRadius: 16,
    mountHeight: top + 6,
    animate(t) {
      // Tips back from T-7 s, away from the vehicle, and on after liftoff.
      tePivot.rotation.z = smoothstep(-7, -3, t) * 0.35 + smoothstep(0, 6, t) * 0.15;
    },
  };
};

/** Wallops LC-2: small pad on flat coast. */
const wallopsPad: Builder = (ctx) => {
  const g = new THREE.Group();
  const H = ctx.H;
  const deck = new THREE.Mesh(ctx.geo(new THREE.BoxGeometry(46, 2, 46)), ctx.mat(0x9e9c94, 0.05, 0.92));
  deck.position.y = -1;
  deck.receiveShadow = true;
  g.add(deck);
  for (const o of flameTrench(ctx, 12, 50, 7, 0)) g.add(o);
  const mount = new THREE.Mesh(ctx.geo(box(9, 3, 9, 0, 1.5, 0)), ctx.mat(0x55595e, 0.5, 0.5));
  g.add(mount);
  const sbPivot = new THREE.Group();
  sbPivot.position.set(-(ctx.R + 1.6), 1, 0);
  const sbLen = H * 0.95;
  const sb = new THREE.Mesh(ctx.geo(lattice(2.2, 2.6, sbLen, 10, 0.32)), ctx.mat(0xa8adb2, 0.5, 0.5));
  sb.castShadow = true;
  sbPivot.add(sb);
  g.add(sbPivot);
  g.add(lightningMasts(ctx, 2, 34, H * 1.3, 0));
  const hangar = new THREE.Mesh(ctx.geo(merged([box(30, 12, 20, -120, 6, 70), box(22, 6, 14, -70, 3, -60)])), ctx.mat(0xd2cfc6, 0.05, 0.85));
  hangar.castShadow = true;
  g.add(hangar);
  for (const o of infrastructure(ctx, 270, -1)) g.add(o);
  return {
    group: g, trenchAzimuth: 0, mouthRadius: 7, mountHeight: 3,
    animate(t) { sbPivot.rotation.z = smoothstep(-8, -3, t) * 1.15; },
  };
};

/** Starbase: orbital launch mount, integration tower and chopstick arms. */
const starbasePad: Builder = (ctx) => {
  const g = new THREE.Group();
  const H = ctx.H;
  const olmR = ctx.R * 2.4;
  const deck = new THREE.Mesh(ctx.geo(new THREE.CircleGeometry(150, 48).rotateX(-Math.PI / 2)), ctx.mat(0x9a9890, 0.05, 0.92));
  deck.position.y = -0.3;
  deck.receiveShadow = true;
  g.add(deck);
  // flame deflector plate
  const plate = new THREE.Mesh(ctx.geo(new THREE.CylinderGeometry(olmR * 1.5, olmR * 1.7, 4, 32)), ctx.mat(0x6a6660, 0.35, 0.7));
  plate.position.y = 2;
  g.add(plate);
  // launch mount ring on six legs
  const legs: THREE.BufferGeometry[] = [];
  const legH = 20;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    legs.push(cyl(2.2, 2.6, legH, Math.cos(a) * olmR * 0.85, legH / 2 + 4, Math.sin(a) * olmR * 0.85, 10));
  }
  legs.push(new THREE.CylinderGeometry(olmR, olmR, 9, 36, 1, true).translate(0, legH + 8.5, 0));
  legs.push(new THREE.RingGeometry(ctx.R * 1.02, olmR, 36).rotateX(-Math.PI / 2).translate(0, legH + 13, 0));
  const olm = new THREE.Mesh(ctx.geo(merged(legs)), ctx.mat(0x2f3338, 0.55, 0.5));
  olm.castShadow = true;
  olm.receiveShadow = true;
  g.add(olm);

  // integration tower
  const towerH = H * 1.18;
  const tower = new THREE.Mesh(ctx.geo(lattice(12, 12, towerH, 22, 0.9)), ctx.mat(0x9aa0a6, 0.55, 0.45));
  tower.position.set(-(olmR + 16), 0, 0);
  tower.castShadow = true;
  g.add(tower);
  // carriage + chopstick arms
  const carriage = new THREE.Group();
  const stackY = H * 0.62;
  carriage.position.set(-(olmR + 16), stackY, 0);
  g.add(carriage);
  const chopsticks: THREE.Group[] = [];
  for (const s of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(6, 0, s * 6);
    const armLen = olmR + 30;
    const arm = new THREE.Mesh(ctx.geo(merged([
      box(armLen, 3.2, 4.5, armLen / 2, 0, 0),
      box(armLen * 0.5, 1.4, 6.5, armLen * 0.75, 1.8, s * 1.4),
    ])), ctx.mat(0xb6bcc2, 0.6, 0.4));
    arm.castShadow = true;
    pivot.add(arm);
    carriage.add(pivot);
    chopsticks.push(pivot);
  }
  // quick-disconnect arm lower down
  const qd = hingedArm(ctx, olmR + 12, 2.4, 0xb0b6bc);
  qd.position.set(-(olmR + 14), H * 0.34, 0);
  g.add(qd);

  g.add(tankFarm(ctx, 165, 95, 6, 5.5, 18));
  g.add(tankFarm(ctx, 210, 30, 3, 7, 22));
  for (const o of infrastructure(ctx, 280, -1)) g.add(o);

  const mountHeight = legH + 13;
  // Where the arms meet the booster: from the pivot to the booster's axis.
  const reach = olmR + 16 - 6;
  return {
    group: g, trenchAzimuth: Math.PI / 2, mouthRadius: olmR * 1.4, mountHeight,
    animate(t, altAGL, tower) {
      let open = smoothstep(-1.5, 3, t) * 0.35 + smoothstep(0, 120, altAGL) * 0.2;
      if (tower) {
        // After liftoff the carriage rides up to the catch pins' height — the
        // booster's base held at `catchHeight` above the mount, the pins 64 m
        // above that — and the arms wait open; they close on the booster over
        // the last 25 m of its fall, until they clasp its hull.
        const pins = tower.catchHeight + CATCH_PIN_HEIGHT + mountHeight;
        carriage.position.y = stackY + (pins - stackY) * smoothstep(40, 200, t);
        const clasp = Math.atan2(ctx.R + 2.25 + 0.3 - 6, reach);
        const closing = 1 - smoothstep(tower.catchHeight, tower.catchHeight + 25, tower.baseHeight);
        open = 0.55 + (clasp - 0.55) * closing;
      } else {
        carriage.position.y = stackY;
      }
      chopsticks[0].rotation.y = -open;
      chopsticks[1].rotation.y = open;
      qd.rotation.z = smoothstep(-6, -2, t) * 1.3;
    },
  };
};

/** Height of Super Heavy's catch pins above its base, m (just below the grid fins on a 71 m booster). */
const CATCH_PIN_HEIGHT = 64;

/** Kourou ELA-4: mobile gantry that rolls back, umbilical mast, jungle. */
const kourouPad: Builder = (ctx) => {
  const g = new THREE.Group();
  const H = ctx.H;
  const deck = new THREE.Mesh(ctx.geo(new THREE.BoxGeometry(150, 3, 150)), ctx.mat(0xa3a199, 0.05, 0.92));
  deck.position.y = -1.5;
  deck.receiveShadow = true;
  g.add(deck);
  for (const o of flameTrench(ctx, 30, 120, 16, Math.PI / 2)) g.add(o);
  const mount = new THREE.Mesh(ctx.geo(box(26, 8, 26, 0, 4, 0)), ctx.mat(0x5d6166, 0.5, 0.5));
  mount.castShadow = true;
  g.add(mount);
  // mobile gantry (a hall on rails)
  const gantry = new THREE.Group();
  const gh = H * 1.05;
  const shell = new THREE.Mesh(ctx.geo(merged([
    lattice(34, 30, gh, 16, 0.9),
    box(36, 2.5, 32, 0, gh, 0),
    box(2, gh, 30, -17, gh / 2, 0),
    box(2, gh, 30, 17, gh / 2, 0),
    box(34, gh, 2, 0, gh / 2, -15),
  ])), ctx.mat(0xc9ccd0, 0.3, 0.6));
  shell.castShadow = true;
  gantry.add(shell);
  g.add(gantry);
  g.add(new THREE.Mesh(ctx.geo(merged([box(2.4, 0.6, 320, -14, 0.3, -80), box(2.4, 0.6, 320, 14, 0.3, -80)])), ctx.mat(0x64676a, 0.35, 0.75)));
  // umbilical mast with swing arms
  const mastH = H * 0.66;
  const mast = new THREE.Mesh(ctx.geo(lattice(6, 6, mastH, 12, 0.55)), ctx.mat(0xa8adb2, 0.45, 0.55));
  mast.position.set(ctx.R + 9, 0, 0);
  mast.castShadow = true;
  g.add(mast);
  const swingArms: THREE.Group[] = [];
  for (const frac of [0.35, 0.62, 0.9]) {
    const arm = hingedArm(ctx, 9, 1.4, 0xbfc4c9);
    arm.position.set(ctx.R + 7, mastH * frac, 0);
    arm.rotation.y = Math.PI;
    g.add(arm);
    swingArms.push(arm);
  }
  g.add(lightningMasts(ctx, 4, 110, H * 1.2));
  g.add(waterTower(ctx, -180, -120, 46));
  for (const o of infrastructure(ctx, 210, 1)) g.add(o);
  return {
    group: g, trenchAzimuth: Math.PI / 2, mouthRadius: 17, mountHeight: 8,
    animate(t) {
      const roll = smoothstep(-10, -4.5, t);
      gantry.position.z = -50 - roll * 150;
      for (let i = 0; i < swingArms.length; i++) swingArms[i].rotation.z = smoothstep(-6 + i, -2 + i, t) * 1.4;
    },
  };
};

/** Wenchang: tall fixed umbilical/service tower on a coastal pad. */
const wenchangPad: Builder = (ctx) => {
  const g = new THREE.Group();
  const H = ctx.H;
  const deck = new THREE.Mesh(ctx.geo(new THREE.BoxGeometry(130, 3, 130)), ctx.mat(0xa5a39b, 0.05, 0.92));
  deck.position.y = -1.5;
  deck.receiveShadow = true;
  g.add(deck);
  for (const o of flameTrench(ctx, 28, 120, 15, Math.PI / 2)) g.add(o);
  const platform = new THREE.Mesh(ctx.geo(merged([box(30, 9, 30, 0, 4.5, 0), box(34, 1.5, 34, 0, 9.5, 0)])), ctx.mat(0x5f646a, 0.5, 0.55));
  platform.castShadow = true;
  g.add(platform);
  const towerH = H * 1.08;
  const tower = new THREE.Mesh(ctx.geo(merged([lattice(13, 11, towerH, 20, 0.8), box(14, 4, 12, 0, towerH, 0)])), ctx.mat(0xd6d8da, 0.4, 0.6));
  tower.position.set(-(ctx.R + 13), 0, 0);
  tower.castShadow = true;
  g.add(tower);
  const arms: THREE.Group[] = [];
  for (const frac of [0.28, 0.48, 0.68, 0.88]) {
    const arm = hingedArm(ctx, ctx.R + 9, 1.8, 0xe2e4e6);
    arm.position.set(-(ctx.R + 7), towerH * frac, 0);
    g.add(arm);
    arms.push(arm);
  }
  g.add(lightningMasts(ctx, 4, 96, H * 1.22));
  g.add(tankFarm(ctx, 160, 120, 5, 6, 16));
  for (const o of infrastructure(ctx, 250, 1)) g.add(o);
  return {
    group: g, trenchAzimuth: Math.PI / 2, mouthRadius: 16, mountHeight: 9.5,
    animate(t) {
      for (let i = 0; i < arms.length; i++) arms[i].rotation.z = -smoothstep(-9 + i * 0.6, -4 + i * 0.6, t) * 1.5;
    },
  };
};

/** Tanegashima: mobile launcher platform and a service tower rolled back. */
const tanegashimaPad: Builder = (ctx) => {
  const g = new THREE.Group();
  const H = ctx.H;
  const deck = new THREE.Mesh(ctx.geo(new THREE.BoxGeometry(120, 3, 120)), ctx.mat(0x9f9d95, 0.05, 0.92));
  deck.position.y = -1.5;
  deck.receiveShadow = true;
  g.add(deck);
  for (const o of flameTrench(ctx, 24, 110, 14, 0)) g.add(o);
  // mobile launcher: platform with two umbilical masts, sits under the vehicle
  const ml = new THREE.Group();
  const mlH = H * 0.42;
  const plat = new THREE.Mesh(ctx.geo(merged([
    box(34, 7, 26, 0, 3.5, 0),
    ...[-1, 1].map((s) => lattice(5, 5, mlH, 9, 0.5).translate(s * 13, 7, 0)),
    ...[-1, 1].map((s) => box(9, 1.4, 2, s * 8, mlH * 0.85 + 7, 0)),
  ])), ctx.mat(0xbfc3c7, 0.35, 0.6));
  plat.castShadow = true;
  ml.add(plat);
  g.add(ml);
  // service tower on rails
  const tower = new THREE.Group();
  const th = H * 1.0;
  const tm = new THREE.Mesh(ctx.geo(merged([lattice(22, 20, th, 18, 0.85), box(24, 3, 22, 0, th, 0)])), ctx.mat(0xd8dade, 0.35, 0.6));
  tm.castShadow = true;
  tower.add(tm);
  g.add(tower);
  g.add(new THREE.Mesh(ctx.geo(merged([box(2.2, 0.5, 300, -11, 0.3, 90), box(2.2, 0.5, 300, 11, 0.3, 90)])), ctx.mat(0x65686b, 0.35, 0.75)));
  g.add(lightningMasts(ctx, 3, 90, H * 1.15, 0.6));
  for (const o of infrastructure(ctx, 300, -1)) g.add(o);
  return {
    group: g, trenchAzimuth: 0, mouthRadius: 14, mountHeight: 7,
    animate(t, altAGL) {
      tower.position.z = 40 + smoothstep(-10, -5, t) * 120;
      void altAGL;
    },
  };
};

/** Sriharikota: mobile service tower rolled back plus a fixed umbilical tower. */
const sriharikotaPad: Builder = (ctx) => {
  const g = new THREE.Group();
  const H = ctx.H;
  const deck = new THREE.Mesh(ctx.geo(new THREE.BoxGeometry(120, 3, 120)), ctx.mat(0xa8a69c, 0.05, 0.92));
  deck.position.y = -1.5;
  deck.receiveShadow = true;
  g.add(deck);
  for (const o of flameTrench(ctx, 22, 100, 13, Math.PI / 2)) g.add(o);
  const table = new THREE.Mesh(ctx.geo(merged([box(22, 8, 22, 0, 4, 0), box(26, 1.2, 26, 0, 8.6, 0)])), ctx.mat(0x646a70, 0.45, 0.6));
  table.castShadow = true;
  g.add(table);
  const utH = H * 0.92;
  const ut = new THREE.Mesh(ctx.geo(merged([lattice(9, 9, utH, 16, 0.65), box(10, 3, 9, 0, utH, 0)])), ctx.mat(0xe0dcd2, 0.3, 0.65));
  ut.position.set(-(ctx.R + 10), 0, 0);
  ut.castShadow = true;
  g.add(ut);
  const arms: THREE.Group[] = [];
  for (const frac of [0.3, 0.55, 0.8]) {
    const arm = hingedArm(ctx, ctx.R + 7, 1.5, 0xe6e2d8);
    arm.position.set(-(ctx.R + 6), utH * frac, 0);
    g.add(arm);
    arms.push(arm);
  }
  const mst = new THREE.Group();
  const mh = H * 1.05;
  const mstMesh = new THREE.Mesh(ctx.geo(merged([lattice(20, 18, mh, 18, 0.8), box(22, 3, 20, 0, mh, 0)])), ctx.mat(0xcfd3d7, 0.3, 0.65));
  mstMesh.castShadow = true;
  mst.add(mstMesh);
  g.add(mst);
  g.add(new THREE.Mesh(ctx.geo(merged([box(2.2, 0.5, 280, -10, 0.3, 80), box(2.2, 0.5, 280, 10, 0.3, 80)])), ctx.mat(0x65686b, 0.35, 0.75)));
  g.add(lightningMasts(ctx, 3, 86, H * 1.18, 1.0));
  for (const o of infrastructure(ctx, 240, 1)) g.add(o);
  return {
    group: g, trenchAzimuth: Math.PI / 2, mouthRadius: 13, mountHeight: 8.6,
    animate(t) {
      mst.position.z = 45 + smoothstep(-10, -5, t) * 130;
      for (let i = 0; i < arms.length; i++) arms[i].rotation.z = -smoothstep(-8 + i, -3 + i, t) * 1.45;
    },
  };
};

/** Rocket Lab LC-1 at Mahia: a small pad with a strongback on a headland. */
const mahiaPad: Builder = (ctx) => {
  const g = new THREE.Group();
  const H = ctx.H;
  const deck = new THREE.Mesh(ctx.geo(new THREE.BoxGeometry(34, 1.6, 34)), ctx.mat(0x9e9c94, 0.05, 0.92));
  deck.position.y = -0.8;
  deck.receiveShadow = true;
  g.add(deck);
  for (const o of flameTrench(ctx, 7, 30, 5, 0)) g.add(o);
  const mount = new THREE.Mesh(ctx.geo(merged([box(6, 2.4, 6, 0, 1.2, 0), cyl(ctx.R * 1.3, ctx.R * 1.4, 1.2, 0, 2.8, 0, 16)])), ctx.mat(0x4e5257, 0.5, 0.5));
  mount.castShadow = true;
  g.add(mount);
  const sbPivot = new THREE.Group();
  sbPivot.position.set(-(ctx.R + 1.1), 1.2, 0);
  const sbLen = H * 0.95;
  const sb = new THREE.Mesh(ctx.geo(lattice(1.6, 1.9, sbLen, 9, 0.24)), ctx.mat(0xadb2b7, 0.5, 0.5));
  sb.castShadow = true;
  sbPivot.add(sb);
  g.add(sbPivot);
  const hangar = new THREE.Mesh(ctx.geo(merged([box(26, 10, 16, -90, 5, 55), box(12, 5, 9, -50, 2.5, -40)])), ctx.mat(0xd8d5cc, 0.05, 0.85));
  hangar.castShadow = true;
  g.add(hangar);
  g.add(lightningMasts(ctx, 2, 26, H * 1.5, 0.4));
  for (const o of infrastructure(ctx, 320, -1)) g.add(o);
  return {
    group: g, trenchAzimuth: 0, mouthRadius: 5, mountHeight: 3.4,
    animate(t) { sbPivot.rotation.z = smoothstep(-8, -2.5, t) * 1.2; },
  };
};

const BUILDERS: Record<string, Builder> = {
  baikonur: baikonurPad, plesetsk: soyuzPad, vostochny: soyuzPad,
  cape: slc40Pad, ksc39a: lc39aPad, vandenberg: slc4ePad, wallops: wallopsPad,
  starbase: starbasePad, kourou: kourouPad, wenchang: wenchangPad,
  tanegashima: tanegashimaPad, sriharikota: sriharikotaPad, mahia: mahiaPad,
};

/** Build the complete launch complex (terrain + pad) for a site and vehicle. */
export function buildPad(site: SiteExtra, vehicle: VehicleSpec, geoSink: <T extends THREE.BufferGeometry>(g: T) => T, matFn: MatFn,
  opts: { padId?: string; azimuth?: number } = {}): PadBuild {
  let R = 0;
  for (const st of vehicle.stages) {
    R = Math.max(R, st.diameter / 2);
    for (const b of st.boosters ?? []) R = Math.max(R, st.diameter / 2 + b.diameter);
  }
  if (vehicle.fairing) R = Math.max(R, vehicle.fairing.diameter / 2);
  const ctx: Ctx = { site, vehicle, H: vehicle.height, R, mat: matFn, geo: geoSink, pad: opts.padId ?? site.pads?.[0]?.id, azimuth: opts.azimuth ?? 0 };
  const biome = BIOMES[site.id] ?? BIOMES.cape;
  const build = (BUILDERS[site.id] ?? slc40Pad)(ctx);
  const root = new THREE.Group();
  // everything below the launch mount is dropped so that the top of the mount
  // sits at y = 0, where the physics puts the vehicle at altitude AGL 0
  const grade = new THREE.Group();
  grade.position.y = -build.mountHeight;
  // The complex is always within a few hundred metres of the tracked vehicle
  // and every part is cheap, so per-object frustum culling (which needs an
  // accurate bounding sphere for each merged geometry) buys nothing.
  build.group.traverse((o) => { o.frustumCulled = false; });
  // Inside `build.group` on purpose: the floodlights are metre-scale pad
  // hardware and switch off with the rest of the structures past ~55 km, which
  // is also where four spot lights stop being worth what they cost.
  const flood = padFloodlights(ctx, build);
  build.group.add(flood.group);
  const base = landFor(site, biome, build.mountHeight);
  // a copy: `landFor` hands out the shared NO_LAND when a site has no landing zone
  const land: Land = { ...base, clearings: [...base.clearings, ...(build.clearings ?? [])] };
  const terrainParts = terrain(ctx, biome, land, build.holes);
  for (const o of terrainParts) grade.add(o);
  grade.add(build.group);
  root.add(grade);
  return { ...build, group: root, deck: grade, terrainParts, structures: build.group, setNight: flood.set };
}
