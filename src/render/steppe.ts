/**
 * The ground under a return that comes down on land (C01: Vostok-1, on the
 * Saratov steppe), drawn where the scene puts it.
 *
 * The scene's Earth is a faceted 6,378.137 km sphere: between its vertices
 * its flat triangles lie up to about R·Δ²/8 under the sphere, some 1.3 km at
 * Smelovka (128 × 96 segments; render/scene.ts). The return's bodies are drawn
 * on that sphere at their WGS-84 heights (render/datum.ts), so on the ground
 * they stood 1.3 km over the drawn globe, and nothing else was drawn there.
 * This is the ground they come down on: a disc of fields on the 6,378.137 km
 * sphere itself, curving away with it, and a wider plain round it that fades
 * into the globe, as the launch pad's terrain does (render/pads.ts).
 *
 * The fields are the ground's own and do not move with the disc: their
 * texture and their shading are laid out by latitude and longitude, so the
 * disc can be re-centred in steps under a body coming down without the
 * fields sliding under it (render/recovery.ts).
 *
 * What it looked like: "freshly plowed dirt in an open field" (Gagarin, as
 * Zak, RussianSpaceWeb, *Vostok-1 landing*, quotes him), "open grasslands
 * with some patches of snow still on the ground" that night (the recovery
 * team, ibid.), the women out planting potatoes. The fields' sizes, their
 * mix, the shelter belts between them and every colour are the drawing's.
 */
import * as THREE from 'three';
import { R_EARTH } from '../physics/constants';
import { fbm2, hash11, hash21, noise2, smoothstep } from './noise';

/** Radius of the disc of fields, m: the sphere, the hatch and the seat within 1.5 km of each other, Gagarin some 5 km off. */
const FIELDS_RADIUS = 14e3;
/** Where the disc starts to fade into the plain round it, m. */
const FIELDS_SOLID = 8e3;
/** Outer edge of the plain round it, m (the pad's far apron reaches 90 km, render/pads.ts). */
const PLAIN_RADIUS = 90e3;
/** One repeat of the fields' texture, m, and its size, px (6 m a pixel). */
const TILE = 6144;
const TEX = 1024;
/** Scale of the shading laid over the fields to hide the texture's repeat, m. */
const SHADE_SCALE = 2600;
/** The longitudes the texture is laid out from, a whole number of steps of this, rad, so it barely shears. */
const LON_REF_STEP = 10 * Math.PI / 180;

/** sRGB 0–255 */
type RGB = readonly [number, number, number];
/** Ploughed black earth, last year's stubble, winter wheat coming up green, unploughed steppe grass. */
const FIELD_KINDS: readonly { color: RGB; share: number; furrows: boolean }[] = [
  { color: [78, 67, 54], share: 0.42, furrows: true },
  { color: [163, 147, 108], share: 0.28, furrows: false },
  { color: [101, 116, 68], share: 0.16, furrows: false },
  { color: [138, 131, 95], share: 0.14, furrows: false },
];
/** The shelter belts' bare April trees, a field track's dry earth, the last of the snow. */
const BELT: RGB = [74, 70, 60];
const TRACK: RGB = [168, 156, 122];
const SNOW: RGB = [222, 225, 228];
/** The plain's colour: about what the fields average to. */
const PLAIN: RGB = [114, 106, 77];

function pickKind(u: number): (typeof FIELD_KINDS)[number] {
  let acc = 0;
  for (const k of FIELD_KINDS) {
    acc += k.share;
    if (u < acc) return k;
  }
  return FIELD_KINDS[FIELD_KINDS.length - 1];
}

/** Split 0..n into runs `min`..`min + span` long, the last one taking what is left. */
function runs(n: number, min: number, span: number, seed: number): number[] {
  const cuts = [0];
  let at = 0, k = 0;
  while (at < n) {
    let len = min + Math.floor(hash11(seed + k++ * 7.31) * span);
    if (n - (at + len) < min * 0.6) len = n - at;
    at += len;
    cuts.push(at);
  }
  return cuts;
}

/**
 * The fields, one repeat of them, as pixels: rows of fields east–west, each
 * row cut into fields of its own lengths, a shelter belt along some rows, a
 * track between some fields, the furrows of the ploughed ones, the last snow
 * lying in a few. Its edges are field edges, so it repeats without a seam.
 * Made once, on first use (a DataTexture: no canvas needed).
 */
let fieldsTex: THREE.DataTexture | null = null;
export function fieldsTexture(): THREE.DataTexture {
  if (fieldsTex) return fieldsTex;
  const data = new Uint8Array(TEX * TEX * 4);
  const rows = runs(TEX, 52, 70, 0.137);
  for (let r = 0; r + 1 < rows.length; r++) {
    const y0 = rows[r], y1 = rows[r + 1];
    const belt = hash11(r * 3.7 + 0.4) < 0.55;
    const cols = runs(TEX, 64, 170, 11.3 + r * 1.91);
    for (let c = 0; c + 1 < cols.length; c++) {
      const x0 = cols[c], x1 = cols[c + 1];
      const seed = r * 101.3 + c * 7.77;
      const kind = pickKind(hash11(seed));
      const tint = 0.92 + 0.16 * hash11(seed + 0.5);
      const track = hash11(seed + 0.9) < 0.3;
      const snowy = hash11(seed + 1.3) < 0.06;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          let col: RGB = kind.color;
          let k = tint;
          if (kind.furrows) k *= (y & 1) ? 0.9 : 1.06;
          // the grain of the ground, a pixel's worth
          k *= 0.94 + 0.12 * hash21(x * 0.731, y * 1.117);
          // a little of the ground's own lie across a field, so it is not flat colour
          k *= 0.93 + 0.14 * noise2(x / 23 + seed, y / 23);
          if (snowy && x - x0 > 6 && x1 - x > 6 && y - y0 > 6 && y1 - y > 6
            && noise2(x / 7 + seed * 3, y / 7) * noise2(x / 31 - seed, y / 31) > 0.5) { col = SNOW; k = 0.92; }
          if (track && x - x0 < 2) { col = TRACK; k = 0.97 + 0.06 * hash21(x, y); }
          if (belt && y1 - y <= 2) { col = BELT; k = 0.85 + 0.3 * hash21(x * 1.3, y); }
          const i = (y * TEX + x) * 4;
          data[i] = Math.min(255, col[0] * k);
          data[i + 1] = Math.min(255, col[1] * k);
          data[i + 2] = Math.min(255, col[2] * k);
          data[i + 3] = 255;
        }
      }
    }
  }
  const t = new THREE.DataTexture(data, TEX, TEX, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.userData.shared = true;
  t.needsUpdate = true;
  fieldsTex = t;
  return t;
}

/** A disc on the sphere, X east, Y up, Z south, its rings packed towards the middle. */
function disc(inner: number, outer: number, segments: number, rings: number, pack: number): THREE.BufferGeometry {
  const geo = new THREE.RingGeometry(inner, outer, segments, rings);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), d0 = Math.hypot(x, z);
    // (the inner ring's own radius comes back a rounding under `inner`)
    const d = inner + (outer - inner) * Math.pow(Math.min(1, Math.max(0, (d0 - inner) / (outer - inner))), pack);
    const s = d0 > 1e-9 ? d / d0 : 0;
    pos.setXYZ(i, x * s, -(d * d) / (2 * R_EARTH), z * s);
  }
  return geo;
}

export interface SteppeView {
  /** In a surface frame (render/recovery.ts): X east, Y up, Z south, its origin on the sphere. */
  readonly group: THREE.Group;
  /** Lay the fields out for a disc centred at `lat`, `lon` (rad, geocentric, on the rotating Earth). */
  centre(lat: number, lon: number): void;
  /** 0–1: faded out with the camera's distance. */
  setOpacity(o: number): void;
  dispose(): void;
}

export function buildSteppe(): SteppeView {
  const group = new THREE.Group();
  // the fields: a disc to FIELDS_RADIUS, the curvature's drop exact to a few millimetres at its rim
  const fieldsGeo = disc(0, FIELDS_RADIUS, 128, 56, 1.7);
  const n = fieldsGeo.attributes.position.count;
  fieldsGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  fieldsGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  fieldsGeo.computeVertexNormals();
  const fieldsMat = new THREE.MeshStandardMaterial({ map: fieldsTexture(), vertexColors: true, roughness: 1, metalness: 0, transparent: true });
  const fields = new THREE.Mesh(fieldsGeo, fieldsMat);
  fields.receiveShadow = true;
  fields.renderOrder = -1;
  // the plain round it, under its fading rim and on to the horizon from a few kilometres up, a little below it
  const plainGeo = disc(FIELDS_SOLID * 0.9, PLAIN_RADIUS, 96, 18, 1.4);
  const m = plainGeo.attributes.position.count;
  plainGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(m * 4), 4));
  plainGeo.computeVertexNormals();
  const plainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, transparent: true, depthWrite: false });
  const plain = new THREE.Mesh(plainGeo, plainMat);
  plain.position.y = -2;
  plain.renderOrder = -2;
  group.add(plain, fields);
  group.traverse((o) => { o.frustumCulled = false; });

  const plainColor = new THREE.Color().setRGB(PLAIN[0] / 255, PLAIN[1] / 255, PLAIN[2] / 255, THREE.SRGBColorSpace);
  const WHITE = new THREE.Color(1, 1, 1);
  let at = '';
  /**
   * The ground's own coordinates at a point, m: east along its parallel from a
   * longitude a whole LON_REF_STEP away, north from the equator. Laid out by
   * these, the fields and their shading are fixed to the ground wherever the
   * disc is centred.
   */
  const ground = (lat: number, lon: number, lonRef: number): [number, number] => [(lon - lonRef) * R_EARTH * Math.cos(lat), lat * R_EARTH];
  function centre(lat: number, lon: number): void {
    const key = `${lat.toFixed(9)},${lon.toFixed(9)}`;
    if (key === at) return;
    at = key;
    const lonRef = Math.round(lon / LON_REF_STEP) * LON_REF_STEP;
    const [e0, n0] = ground(lat, lon, lonRef);
    // the texture's coordinates kept small (they are float32) by a whole number of its repeats
    const ue = Math.floor(e0 / TILE) * TILE, un = Math.floor(n0 / TILE) * TILE;
    const cosLat = Math.cos(lat);
    /** Shade a disc's vertices where they lie on the ground, `alpha` by distance, `base` the colour (white: the texture's own). */
    const paint = (geo: THREE.BufferGeometry, alpha: (d: number) => number, base: THREE.Color, uv: boolean) => {
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const col = geo.attributes.color as THREE.BufferAttribute;
      const tex = uv ? geo.attributes.uv as THREE.BufferAttribute : null;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        const [e, nn] = ground(lat - z / R_EARTH, lon + x / (R_EARTH * cosLat), lonRef);
        // over the fields, the land's broad lie: a little darker or lighter, a little browner or greener
        const k = 0.8 + 0.34 * fbm2(e / SHADE_SCALE, nn / SHADE_SCALE, 3);
        const h = noise2(e / (SHADE_SCALE * 2.7) + 7.1, nn / (SHADE_SCALE * 2.7));
        col.setXYZW(i, base.r * k * (1.02 - 0.06 * h), base.g * k, base.b * k * (0.97 + 0.05 * h), alpha(Math.hypot(x, z)));
        if (tex) tex.setXY(i, (e - ue) / TILE, (nn - un) / TILE);
      }
      col.needsUpdate = true;
      if (tex) tex.needsUpdate = true;
    };
    paint(fieldsGeo, (d) => 1 - smoothstep(FIELDS_SOLID, FIELDS_RADIUS, d), WHITE, true);
    // the plain: whole under the fields' fading rim, then fading out to its own
    paint(plainGeo, (d) => Math.pow(1 - Math.min(1, Math.max(0, (d - FIELDS_RADIUS) / (PLAIN_RADIUS - FIELDS_RADIUS))), 1.25), plainColor, false);
  }

  return {
    group,
    centre,
    setOpacity(o: number): void {
      fieldsMat.opacity = o;
      plainMat.opacity = o;
    },
    dispose(): void {
      fieldsGeo.dispose(); plainGeo.dispose();
      fieldsMat.dispose(); plainMat.dispose();
    },
  };
}
