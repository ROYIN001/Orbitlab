/**
 * Procedural launch complexes.
 *
 * Every site gets its own pad with recognisable real-world cues — the Soyuz
 * "tulip" support arms and flame pit, SLC-40's transporter/erector and lightning
 * masts, Starbase's orbital launch mount and chopstick arms, Kourou's mobile
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
import type { VehicleSpec } from '../types';
import { R_EARTH } from '../physics/constants';
import { fbm2, hash11, smoothstep } from './noise';

export interface PadBuild {
  group: THREE.Group;
  /**
   * @param t mission time, s (negative during the countdown)
   * @param altAGL vehicle altitude above the pad, m
   */
  animate(t: number, altAGL: number): void;
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
  baikonur: { ground: 0xa89b74, ground2: 0x8f8560, rock: 0xb4a583, hills: 55, coastal: false, seaAz: 0, shore: 0, water: 0x2a5a80, vegetation: 'steppe' },
  plesetsk: { ground: 0x4b5a3c, ground2: 0x35482f, rock: 0x6b6a58, hills: 90, coastal: false, seaAz: 0, shore: 0, water: 0x2a5a80, vegetation: 'forest' },
  vostochny: { ground: 0x4f5c3a, ground2: 0x3a4a30, rock: 0x74705c, hills: 160, coastal: false, seaAz: 0, shore: 0, water: 0x2a5a80, vegetation: 'forest' },
  cape: { ground: 0x6f7c46, ground2: 0x8e8a5c, rock: 0xbdb188, hills: 12, coastal: true, seaAz: 100, shore: 2400, water: 0x1d5b7a, vegetation: 'scrub' },
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

function heightAt(x: number, z: number, b: Biome, sea: THREE.Vector2): number {
  const d = Math.hypot(x, z);
  const flat = smoothstep(APRON, APRON * 3.2, d);
  let h = (fbm2(x / 2400 + 4.2, z / 2400 - 1.7, 4) - 0.45) * b.hills;
  h += (fbm2(x / 480 + 11.3, z / 480 + 6.1, 3) - 0.5) * b.hills * 0.22;
  h *= flat;
  if (b.coastal) {
    const s = x * sea.x + z * sea.y;              // distance toward the sea
    const ramp = smoothstep(b.shore - (b.cliffs ? 120 : 900), b.shore + (b.cliffs ? 60 : 600), s);
    h = h * (1 - ramp) - ramp * (b.cliffs ? 140 : 60);
  }
  return h;
}

function terrain(ctx: Ctx, b: Biome): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const sea = azDir(b.seaAz);
  // A disc, not a square: a square plane's corners would poke out past the
  // coarse far ring. Vertices are packed towards the pad by remapping the
  // radius, so the detail is where the camera spends its time.
  const SIZE = 13e3;
  const geo = ctx.geo(new THREE.RingGeometry(4, SIZE, 96, 44));
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), pz = pos.getZ(i);
    const r0 = Math.hypot(px, pz);
    if (r0 < 1e-6) continue;
    const tt = Math.max(0, Math.min(1, (r0 - 4) / (SIZE - 4)));
    const rr = 4 + (SIZE - 4) * Math.pow(tt, 1.9);
    pos.setX(i, (px * rr) / r0);
    pos.setZ(i, (pz * rr) / r0);
  }
  const colors = new Float32Array(pos.count * 4);
  const c = new THREE.Color();
  const g1 = new THREE.Color(b.ground), g2 = new THREE.Color(b.ground2), rock = new THREE.Color(b.rock);
  const sand = new THREE.Color(0xcdbd94);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z, b, sea) - curveDrop(x, z);
    pos.setY(i, h);
    const mix = fbm2(x / 900 + 2.1, z / 900 - 3.3, 3);
    c.copy(g1).lerp(g2, mix);
    const hLocal = h + curveDrop(x, z);
    if (hLocal > b.hills * 0.32) c.lerp(rock, smoothstep(b.hills * 0.32, b.hills * 0.9, hLocal));
    if (b.coastal) {
      const s = x * sea.x + z * sea.y;
      c.lerp(sand, smoothstep(b.shore - 500, b.shore + 120, s) * (b.cliffs ? 0.35 : 0.9));
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

  const veg = vegetation(ctx, b, sea);
  if (veg) out.push(veg);
  return out;
}

/** Instanced trees / bushes scattered on the terrain, never on the apron. */
function vegetation(ctx: Ctx, b: Biome, sea: THREE.Vector2): THREE.Object3D | null {
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
    if (b.coastal && x * sea.x + z * sea.y > b.shore - 300) continue;
    const h = heightAt(x, z, b, sea);
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
  const radius = Math.max(46, build.mouthRadius * 3.0);
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
    const a = (i / FLOOD_COUNT) * Math.PI * 2 + Math.PI / FLOOD_COUNT;
    const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
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
      // retract from T-7 s, clear by T-3 s, then continue away after liftoff
      const a = smoothstep(-7, -3, t) * 1.12 + smoothstep(0, 6, t) * 0.18;
      sbPivot.rotation.z = -a;
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
    animate(t) { sbPivot.rotation.z = -(smoothstep(-8, -3, t) * 1.15); },
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
  carriage.position.set(-(olmR + 16), H * 0.62, 0);
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

  return {
    group: g, trenchAzimuth: Math.PI / 2, mouthRadius: olmR * 1.4, mountHeight: legH + 13,
    animate(t, altAGL) {
      const open = smoothstep(-1.5, 3, t) * 0.35 + smoothstep(0, 120, altAGL) * 0.2;
      chopsticks[0].rotation.y = -open;
      chopsticks[1].rotation.y = open;
      qd.rotation.z = smoothstep(-6, -2, t) * 1.3;
    },
  };
};

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
    animate(t) { sbPivot.rotation.z = -(smoothstep(-8, -2.5, t) * 1.2); },
  };
};

const BUILDERS: Record<string, Builder> = {
  baikonur: soyuzPad, plesetsk: soyuzPad, vostochny: soyuzPad,
  cape: slc40Pad, vandenberg: slc4ePad, wallops: wallopsPad,
  starbase: starbasePad, kourou: kourouPad, wenchang: wenchangPad,
  tanegashima: tanegashimaPad, sriharikota: sriharikotaPad, mahia: mahiaPad,
};

/** Build the complete launch complex (terrain + pad) for a site and vehicle. */
export function buildPad(site: SiteExtra, vehicle: VehicleSpec, geoSink: <T extends THREE.BufferGeometry>(g: T) => T, matFn: MatFn): PadBuild {
  let R = 0;
  for (const st of vehicle.stages) {
    R = Math.max(R, st.diameter / 2);
    for (const b of st.boosters ?? []) R = Math.max(R, st.diameter / 2 + b.diameter);
  }
  if (vehicle.fairing) R = Math.max(R, vehicle.fairing.diameter / 2);
  const ctx: Ctx = { site, vehicle, H: vehicle.height, R, mat: matFn, geo: geoSink };
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
  const terrainParts = terrain(ctx, biome);
  for (const o of terrainParts) grade.add(o);
  grade.add(build.group);
  root.add(grade);
  return { ...build, group: root, deck: grade, terrainParts, structures: build.group, setNight: flood.set };
}
