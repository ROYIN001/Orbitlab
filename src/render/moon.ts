/**
 * The Moon (roadmap C01): a sphere of its mean radius where the ephemeris puts
 * it and turned the way the IAU model turns it (src/physics/lunar), so the
 * near side faces the Earth and the maria are where Apollo 11 saw them.
 *
 * The surface is painted, not mapped: highland grey, the principal maria as
 * dark patches at their centres and sizes (Lunar and Planetary Institute's
 * nomenclature, approximate), a few bright rayed craters, and a scatter of
 * small ones — enough to recognise the face and see it turn, not a survey.
 */
import * as THREE from 'three';
import { R_MOON } from '../physics/lunar/ephemeris';

/** The maria: centre latitude and east longitude, radius, deg. */
const MARIA: readonly [number, number, number][] = [
  // Oceanus Procellarum, several patches for its sprawl
  [25, -55, 14], [10, -55, 13], [0, -46, 10], [-5, -38, 8], [36, -46, 9], [16, -40, 10], [-2, -60, 7],
  [33, -16, 17], // Imbrium
  [28, 17.5, 11], // Serenitatis
  [8.5, 31, 12], [15, 25, 6], // Tranquillitatis
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

export interface MoonView {
  mesh: THREE.Mesh;
  /** Place it: the Moon's centre in scene coordinates, and its body axes in the ECI (row-major, `moonBodyToEci`). */
  place(pos: THREE.Vector3, bodyToEci: readonly number[]): void;
}

export function buildMoon(): MoonView {
  const map = paintSurface();
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(R_MOON, 96, 64),
    new THREE.MeshStandardMaterial({ color: map ? 0xffffff : 0x9d9b96, map, roughness: 1, metalness: 0 }),
  );
  mesh.visible = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  // the geometry is Y-up with longitude 0 at +X, as the Earth's: turned so its pole is +Z
  const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const m4 = new THREE.Matrix4();
  const place = (pos: THREE.Vector3, m: readonly number[]): void => {
    mesh.position.copy(pos);
    m4.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
    mesh.quaternion.setFromRotationMatrix(m4).multiply(qx);
    mesh.visible = true;
  };
  return { mesh, place };
}
