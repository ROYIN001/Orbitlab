/**
 * The Moon (roadmap C01): a sphere where the ephemeris puts it and turned the
 * way the IAU model turns it (src/physics/lunar), so the near side faces the
 * Earth and the maria are where Apollo 11 saw them. Its radius is the landing
 * site's, 1,735.6 km — the one the Mission Report's lunar heights are above,
 * 1.8 km under the mean — so Eagle stands on it at Tranquility Base.
 *
 * The surface is painted, not mapped: highland grey, the principal maria as
 * dark patches at their centres and sizes (Lunar and Planetary Institute's
 * nomenclature, approximate), a few bright rayed craters, and a scatter of
 * small ones — enough to recognise the face and see it turn, not a survey.
 * Around the landing site two finer patches of ground, 100 km and 6 km across,
 * carry craters down to a few metres, lit from the low morning Sun Eagle landed
 * in, with West crater, the 33-m crater and the doublet where the Mission
 * Report puts them (§11; approximate).
 */
import * as THREE from 'three';
import { APOLLO11 } from '../data/apollo11';

/** The maria: centre latitude and east longitude, radius, deg. */
const MARIA: readonly [number, number, number][] = [
  // Oceanus Procellarum, several patches for its sprawl
  [25, -55, 14], [10, -55, 13], [0, -46, 10], [-5, -38, 8], [36, -46, 9], [16, -40, 10], [-2, -60, 7],
  [33, -16, 17], // Imbrium
  [28, 17.5, 11], // Serenitatis
  [8.5, 31, 12], [15, 25, 6], [3, 25, 5], // Tranquillitatis, its south-western lobe the landing site is in
  [17, 59, 8.5], // Crisium
  [-8, 51, 11], // Fecunditatis
  [-15, 35, 5.5], // Nectaris
  [-21, -17, 10], // Nubium
  [-24, -39, 6.4], // Humorum
  [-10, -23, 6], // Cognitum
  [7.5, -31, 8], // Insularum
  [13, 4, 4], // Vaporum
  [2, 1, 3], // Sinus Medii
  [56, -20, 5], [57, 0, 5], [56, 20, 5], [55, 35, 4], // Frigoris
  [27, 148, 4.6], // Moscoviense, on the far side
  [-19, -93, 4], // Orientale's centre, on the limb
  [-20, 129, 3], // Tsiolkovskiy's floor
];

/** Bright rayed craters: latitude, longitude, radius of the rays, deg. */
const RAYED: readonly [number, number, number][] = [
  [-43.3, -11.2, 9], // Tycho
  [9.6, -20.1, 6], // Copernicus
  [8.1, -38, 4], // Kepler
  [23.7, -47.4, 3], // Aristarchus
];

/** A small deterministic generator, so every build paints the same Moon. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paintSurface(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const W = 1024, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#9d9b96';
  g.fillRect(0, 0, W, H);
  const px = (lon: number) => ((lon / 360 + 0.5) * W + W) % W;
  const py = (lat: number) => (0.5 - lat / 180) * H;
  /** a soft patch, stretched in longitude as the map stretches it, drawn across the seam too */
  const patch = (lat: number, lon: number, r: number, inner: string, outer: string) => {
    const ry = (r / 180) * H, rx = Math.min(W / 2, ry / Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
    for (const dx of [-W, 0, W]) {
      g.save();
      g.translate(px(lon) + dx, py(lat));
      g.scale(rx / ry, 1);
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, ry);
      grad.addColorStop(0, inner);
      grad.addColorStop(0.7, inner);
      grad.addColorStop(1, outer);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, ry, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  };
  for (const [lat, lon, r] of MARIA) patch(lat, lon, r, 'rgba(78,78,76,0.9)', 'rgba(78,78,76,0)');
  const rand = rng(1969);
  // small craters: a darker floor and a brighter rim
  for (let i = 0; i < 1400; i++) {
    const lat = Math.asin(2 * rand() - 1) * (180 / Math.PI), lon = rand() * 360 - 180, r = 0.3 + rand() ** 3 * 2.5;
    patch(lat, lon, r * 1.15, 'rgba(190,188,182,0.35)', 'rgba(190,188,182,0)');
    patch(lat, lon, r, 'rgba(70,70,68,0.28)', 'rgba(70,70,68,0)');
  }
  for (const [lat, lon, r] of RAYED) {
    patch(lat, lon, r, 'rgba(225,224,218,0.35)', 'rgba(225,224,218,0)');
    patch(lat, lon, r * 0.18, 'rgba(240,240,235,0.9)', 'rgba(240,240,235,0)');
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** The sphere's radius: a little under the landing site's, so the ground patches over it lie on top, m. */
const SPHERE_R = APOLLO11.siteRadius - 20;
/** The mare's shade round the landing site, sRGB 0..255: the painted sphere's there. */
const MARE = [88, 88, 86] as const;

/**
 * A patch of ground round the landing site, `size` m across: the sphere of the
 * site's radius (less `drop` m) over a disc, in the Moon's body frame relative
 * to the site, with the ground painted on it by `paint` (east to the right,
 * north up) and its rim faded into what is under it.
 */
function groundPatch(size: number, drop: number, px: number, paint: (g: CanvasRenderingContext2D, m: number) => void): THREE.Mesh | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = `rgb(${MARE[0]},${MARE[1]},${MARE[2]})`;
  g.fillRect(0, 0, px, px);
  paint(g, px / size);
  // the rim fades out: the alpha of a disc
  g.globalCompositeOperation = 'destination-in';
  const fade = g.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(0.8, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fade;
  g.fillRect(0, 0, px, px);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  // the site in the body frame, and its east and north
  const l = APOLLO11.landing, R = APOLLO11.siteRadius - drop, d = Math.PI / 180;
  const up = new THREE.Vector3(Math.cos(l.lat * d) * Math.cos(l.lon * d), Math.cos(l.lat * d) * Math.sin(l.lon * d), Math.sin(l.lat * d));
  const east = new THREE.Vector3(0, 0, 1).cross(up).normalize(), north = up.clone().cross(east);
  const n = 96, geo = new THREE.PlaneGeometry(size, size, n, n);
  const pos = geo.attributes.position as THREE.BufferAttribute, p = new THREE.Vector3(), site = up.clone().multiplyScalar(APOLLO11.siteRadius);
  for (let i = 0; i < pos.count; i++) {
    // onto the sphere, relative to the site on the physics' ground
    p.copy(up).multiplyScalar(R).addScaledVector(east, pos.getX(i)).addScaledVector(north, pos.getY(i)).setLength(R).sub(site);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 1, metalness: 0 }));
  mesh.position.copy(site);
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * Craters on a patch `m` px per metre across: from `rMin` to `rMax` m, as many
 * as asked, most of them small, some fresh and most worn down.
 */
function craters(g: CanvasRenderingContext2D, m: number, size: number, rMin: number, rMax: number, count: number, seed: number): void {
  const rand = rng(seed);
  for (let i = 0; i < count; i++) {
    const r = rMin * Math.pow(rMax / rMin, Math.pow(rand(), 2.6)), x = rand() * size * m, y = rand() * size * m;
    crater(g, x, y, r * m, 0.25 + 0.75 * rand() ** 2);
  }
}

/**
 * One crater, `rp` px across its rim, `fresh` 0..1: a faint brighter apron of
 * ejecta, and inside the rim the Sun low in the east lighting the western wall
 * and the eastern rim's shadow lying over the floor below it — crescents, the
 * rim's circle clipping them.
 */
function crater(g: CanvasRenderingContext2D, x: number, y: number, rp: number, fresh = 1): void {
  if (rp < 0.6) return;
  const disc = (cx: number, cy: number, r: number, rgb: string, a: number, stop: number) => {
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(${rgb},${a})`);
    grad.addColorStop(stop, `rgba(${rgb},${a})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  };
  disc(x, y, rp * 1.6, '165,164,158', 0.14 * fresh, 0.55); // the ejecta
  g.save();
  g.beginPath();
  g.arc(x, y, rp, 0, Math.PI * 2);
  g.clip();
  disc(x - rp * 0.7, y, rp * 0.95, '178,177,170', 0.34 * fresh, 0.25); // the western wall, lit
  disc(x + rp * 0.85, y, rp * 0.85, '24,24,23', 0.62 * fresh, 0.55); // the eastern rim's shadow
  g.restore();
}

export interface MoonView {
  mesh: THREE.Mesh;
  /** Place it: the Moon's centre in scene coordinates, and its body axes in the ECI (row-major, `moonBodyToEci`). */
  place(pos: THREE.Vector3, bodyToEci: readonly number[]): void;
}

export function buildMoon(): MoonView {
  const map = paintSurface();
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(SPHERE_R, 256, 128),
    new THREE.MeshStandardMaterial({ color: map ? 0xffffff : 0x9d9b96, map, roughness: 1, metalness: 0 }),
  );
  mesh.visible = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  // the geometry is Y-up with longitude 0 at +X, as the Earth's: turned so its pole is +Z
  const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const m4 = new THREE.Matrix4();
  // the ground round the landing site, painted the first time the Moon is shown: in the body frame, under
  // the sphere's own turn
  let ground: THREE.Group | null = null;
  const addGround = (): void => {
    ground = new THREE.Group();
    ground.quaternion.copy(qx).invert();
    const wide = groundPatch(100e3, 3, 1024, (g, m) => {
      craters(g, m, 100e3, 150, 6000, 700, 7);
    });
    const near = groundPatch(6e3, 0, 2048, (g, m) => {
      craters(g, m, 6e3, 1.5, 120, 2600, 20);
      // West crater, 180 m across and 400 m east of Eagle; the 33-m crater 50 m east of it; the doublet 10 m
      // west (MR §11)
      const c = 3e3 * m;
      crater(g, c + 400 * m, c, 90 * m);
      crater(g, c + 50 * m, c, 16.5 * m);
      crater(g, c - 10 * m * Math.sin(80 * Math.PI / 180) - 3 * m, c + 10 * m * Math.cos(80 * Math.PI / 180), 3 * m);
      crater(g, c - 10 * m * Math.sin(80 * Math.PI / 180) + 3 * m, c + 10 * m * Math.cos(80 * Math.PI / 180), 3 * m);
    });
    if (wide) ground.add(wide);
    // (the near patch after the wide one, its faded rim over it)
    if (near) { near.renderOrder = 1; ground.add(near); }
    mesh.add(ground);
  };
  const place = (pos: THREE.Vector3, m: readonly number[]): void => {
    if (!ground) addGround();
    mesh.position.copy(pos);
    m4.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
    mesh.quaternion.setFromRotationMatrix(m4).multiply(qx);
    mesh.visible = true;
  };
  return { mesh, place };
}
