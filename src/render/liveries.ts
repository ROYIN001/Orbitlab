/**
 * Per-vehicle liveries and engine bells.
 *
 * Everything here is procedural: body paint (colour, accent bands, panel lines,
 * markings and a small flag) is baked into a `CanvasTexture` that wraps the
 * stage cylinder once. Where the bells go is src/data/engine-layout.ts, which
 * the six-DOF model shares.
 */
import * as THREE from 'three';
import type { StageSpec, BoosterGroupSpec, VehicleSpec } from '../types';
import { hash11 } from './noise';
import { vehicleDataId } from '../data/vehicles';

export { engineLayout, type EngineLayout, type NozzlePos } from '../data/engine-layout';

/**
 * Curved engine bell (lathe) rather than a plain cone.
 *
 * The profile starts on the axis, so the lathe closes the throat with a flat
 * annulus: the classic low-angle beauty shot looks up into a dark bell instead
 * of straight through the engine and out of the top of the stage.
 */
export function bellGeometry(rExit: number, length: number, segments = 14): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [new THREE.Vector2(rExit * 0.004, 0)];
  const rThroat = rExit * 0.26;
  for (let i = 0; i <= segments; i++) {
    const s = i / segments;
    // parabolic bell contour from throat (top) to exit (bottom)
    const r = rThroat + (rExit - rThroat) * Math.pow(s, 0.62);
    pts.push(new THREE.Vector2(Math.max(0.01, r), -s * length));
  }
  return new THREE.LatheGeometry(pts, 32);
}

/**
 * The skin of an engine bell, shared by every engine: the brazed coolant tubes
 * running from the throat to the exit, which is what makes a regeneratively
 * cooled bell read as an engine and not as a turned cone, and the temper
 * colours of the hot end — bronze and blue near the throat, fading out toward
 * the cooler skirt. Grey, so the bell material's own colour still tints it.
 *
 * The lathe's u runs around the bell and v from the throat (0) to the exit (1).
 */
let bellTex: THREE.CanvasTexture | null = null;
export function bellTexture(): THREE.CanvasTexture {
  if (bellTex) return bellTex;
  const W = 512, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c4c4c4';
  g.fillRect(0, 0, W, H);
  // temper colours: the throat end is the hot end (v = 0, the canvas's foot)
  const heat = g.createLinearGradient(0, H, 0, 0);
  heat.addColorStop(0, 'rgba(70,52,40,0.85)');
  heat.addColorStop(0.12, 'rgba(150,104,62,0.55)');
  heat.addColorStop(0.3, 'rgba(92,96,140,0.28)');
  heat.addColorStop(0.55, 'rgba(0,0,0,0)');
  heat.addColorStop(0.92, 'rgba(0,0,0,0)');
  heat.addColorStop(1, 'rgba(40,40,44,0.45)');
  g.fillStyle = heat;
  g.fillRect(0, 0, W, H);
  // the tubes: a lit crown and a shadowed joint each, 128 of them round the bell
  const n = 128, pitch = W / n;
  for (let i = 0; i < n; i++) {
    const x = i * pitch;
    g.fillStyle = 'rgba(0,0,0,0.30)';
    g.fillRect(x, 0, 1, H);
    g.fillStyle = 'rgba(255,255,255,0.10)';
    g.fillRect(x + pitch * 0.45, 0, 1, H);
  }
  // stiffening hoops round the skirt
  for (const v of [0.42, 0.68, 0.9]) {
    const y = (1 - v) * H;
    g.fillStyle = 'rgba(30,30,32,0.55)';
    g.fillRect(0, y - 2, W, 3);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(0, y + 1, W, 1);
  }
  bellTex = new THREE.CanvasTexture(c);
  bellTex.colorSpace = THREE.SRGBColorSpace;
  bellTex.wrapS = THREE.RepeatWrapping;
  bellTex.anisotropy = 8;
  bellTex.userData.shared = true;
  return bellTex;
}

/**
 * Von Kármán (LD-Haack) nose profile, for `LatheGeometry`.
 *
 * The last point is forced onto the axis, which is what closes the apex: the
 * previous `r·√(1 − 0.985 s²)` ellipse bottomed out at 0.12 r and left an open
 * hole a quarter of a metre across at the tip of every fairing — you could look
 * down inside the payload bay from above. Shared by `RocketView` and
 * `DebrisView` so a jettisoned half keeps the same silhouette.
 *
 * @param radius base radius, m
 * @param y0 height of the base of the nose in the parent's frame, m
 * @param noseHeight length of the nose cone, m
 */
export function ogiveProfile(radius: number, y0: number, noseHeight: number, segments = 24): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= segments; i++) {
    const s = i / segments;                       // 0 at the base, 1 at the apex
    const th = Math.acos(Math.max(-1, Math.min(1, 2 * s - 1)));
    const r = (radius / Math.sqrt(Math.PI)) * Math.sqrt(Math.max(0, th - Math.sin(2 * th) / 2));
    pts.push(new THREE.Vector2(i === segments ? 0 : Math.max(1e-3, r), y0 + s * noseHeight));
  }
  return pts;
}

// ------------------------------------------------------------------ liveries

export type FlagId = 'us' | 'ru' | 'eu' | 'cn' | 'jp' | 'in' | 'nz' | 'fr';

export interface BandSpec {
  /** position along the stage, 0 = bottom, 1 = top */
  at: number;
  /** height as a fraction of the stage length */
  h: number;
  color: string;
}

export interface StageLivery {
  base: string;
  bands: BandSpec[];
  /** big marking painted along the body */
  text?: string;
  textColor?: string;
  /** where the marking starts, 0..1 along the stage */
  textAt?: number;
  flag?: FlagId;
  /** brushed stainless steel instead of paint */
  steel?: boolean;
  /** dark soot ring above the engines (flight-proven boosters) */
  soot?: boolean;
  /**
   * Longitudinal joints painted into the surface, as texture u coordinates
   * (0..1 around the circumference).
   *
   * This is how the fairing's two half-shells are shown. `CylinderGeometry` and
   * `LatheGeometry` share the same parametrisation — vertex x = r·sin φ,
   * z = r·cos φ, u = φ / 2π — so one u is the *same meridian* on the fairing's
   * cylinder and on its ogive nose, and a line drawn here follows the silhouette
   * exactly, all the way to the apex where the meridians converge. It replaces a
   * flat `BoxGeometry` plate that was as wide as the cylinder for the whole
   * length of the fairing and therefore stuck out through the narrowing nose as
   * a rectangular tab (user report, wave 5).
   */
  seams?: number[];
  /**
   * Black thermal tiles over the belly, as the half-width in u either side of
   * u = 0 — the model's +z meridian, which is the body frame's +z, the side a
   * belly-first ship presents to the flow.
   */
  heatShield?: number;
  /**
   * The Saturn V's roll pattern (C01): opposite quarters of the circumference
   * painted `color` over [at, at + h] of the stage, so the roll reads on film.
   */
  quarters?: BandSpec[];
}

const FLAG_BY_COUNTRY: Record<string, FlagId> = {
  US: 'us', RU: 'ru', EU: 'eu', CN: 'cn', JP: 'jp', IN: 'in', 'NZ/US': 'nz', KZ: 'ru', FR: 'fr',
};

/** Per-vehicle overrides, keyed `${vehicleId}/${stageId}`. */
const OVERRIDES: Record<string, Partial<StageLivery>> = {
  // Saturn V (C01): white with the black roll pattern low on the S-IC and on the
  // S-IVB's aft skirt, black bands at the S-IC's intertank and forward skirt, and
  // "USA" down the S-IC
  'saturnv506/sic506': { base: '#f2f2ef', text: 'USA', textColor: '#151517', textAt: 0.62, flag: 'us',
    bands: [{ at: 0.5, h: 0.035, color: '#121214' }, { at: 0.94, h: 0.06, color: '#121214' }],
    quarters: [{ at: 0.08, h: 0.3, color: '#121214' }] },
  'saturnv506/sii506': { base: '#f2f2ef', bands: [{ at: 0.965, h: 0.035, color: '#121214' }] },
  'saturnv506/sivb506': { base: '#f2f2ef', bands: [], quarters: [{ at: 0.0, h: 0.2, color: '#121214' }] },
  'falcon9/s1': { base: '#f0f0f2', text: 'FALCON 9', textColor: '#1b1b1f', textAt: 0.52, soot: true, bands: [{ at: 0.985, h: 0.03, color: '#151519' }] },
  'falcon9/s2': { base: '#f0f0f2', bands: [{ at: 0.02, h: 0.08, color: '#151519' }] },
  'falconheavy/core': { base: '#f0f0f2', text: 'FALCON HEAVY', textColor: '#1b1b1f', textAt: 0.5, soot: true, bands: [{ at: 0.985, h: 0.03, color: '#151519' }] },
  'falconheavy/s2': { base: '#f0f0f2', bands: [{ at: 0.02, h: 0.08, color: '#151519' }] },
  'soyuz21a/blokA': { base: '#cfccbe', text: 'SOYUZ', textColor: '#2b3b4f', textAt: 0.55, bands: [{ at: 0.0, h: 0.14, color: '#6f7a58' }] },
  'soyuz21b/blokA': { base: '#cfccbe', text: 'SOYUZ', textColor: '#2b3b4f', textAt: 0.55, bands: [{ at: 0.0, h: 0.14, color: '#6f7a58' }] },
  'protonm/p1': { base: '#dcdcd6', bands: [{ at: 0.0, h: 0.1, color: '#9a9a92' }, { at: 0.9, h: 0.06, color: '#9a9a92' }] },
  'angaraa5/urm1core': { base: '#f2f2f2', text: 'ANGARA', textColor: '#b02b2b', textAt: 0.5, bands: [{ at: 0.0, h: 0.09, color: '#b02b2b' }] },
  'atlasv551/ccb': { base: '#c8792a', text: 'ATLAS V', textColor: '#ffffff', textAt: 0.5, bands: [{ at: 0.9, h: 0.08, color: '#f2f2f2' }] },
  'vulcan/v1': { base: '#f2f2f4', text: 'VULCAN', textColor: '#c0392b', textAt: 0.5, bands: [{ at: 0.0, h: 0.07, color: '#c0392b' }] },
  'ariane64/llpm': { base: '#f2f2f4', text: 'ARIANE 6', textColor: '#1d4f91', textAt: 0.48, bands: [{ at: 0.0, h: 0.08, color: '#1d4f91' }] },
  'longmarch5/cz5core': { base: '#f3f3f5', text: 'CZ-5', textColor: '#c0392b', textAt: 0.52, bands: [{ at: 0.0, h: 0.07, color: '#1f5fbf' }] },
  'h3/h3s1': { base: '#f4f4f4', text: 'H3', textColor: '#1b3b6f', textAt: 0.55, bands: [{ at: 0.0, h: 0.08, color: '#d35400' }] },
  'pslvxl/ps1': { base: '#eceae4', text: 'PSLV', textColor: '#e67e22', textAt: 0.5, bands: [{ at: 0.9, h: 0.06, color: '#e67e22' }] },
  'electron/e1': { base: '#17171a', text: 'ELECTRON', textColor: '#d8d8dc', textAt: 0.5, bands: [] },
  'starship/superheavy': { base: '#b6b8bd', steel: true, text: 'SUPER HEAVY', textColor: '#2c2c30', textAt: 0.55, bands: [] },
  // Tiled to about 72° either side of the belly: the flaps' hinges are at 65°
  // (rigid/surfaces.ts), on the edge of the black, as they are on the real ship.
  'starship/ship': { base: '#b6b8bd', steel: true, text: 'STARSHIP', textColor: '#2c2c30', textAt: 0.5, bands: [], heatShield: 0.2 },
};

export function stageLivery(vehicle: VehicleSpec, stage: StageSpec): StageLivery {
  const base: StageLivery = {
    base: stage.color ?? '#e6e6e6',
    bands: stage.accentColor ? [{ at: 0.92, h: 0.05, color: stage.accentColor }] : [],
    flag: FLAG_BY_COUNTRY[vehicle.country],
  };
  // a custom vehicle made from a catalogue one wears its livery (roadmap S02)
  const ov = OVERRIDES[`${vehicleDataId(vehicle)}/${stage.id}`];
  return ov ? { ...base, ...ov } : base;
}

export function boosterLivery(vehicle: VehicleSpec, booster: BoosterGroupSpec): StageLivery {
  const solid = !!booster.engine.solid;
  return {
    base: booster.color ?? (solid ? '#eeeae2' : '#e6e6e6'),
    bands: solid ? [{ at: 0.0, h: 0.05, color: '#8a8378' }] : [],
    flag: booster.count <= 2 ? FLAG_BY_COUNTRY[vehicle.country] : undefined,
    soot: false,
  };
}

// ------------------------------------------------------------------ painting

function drawFlag(g: CanvasRenderingContext2D, id: FlagId, x: number, y: number, w: number, h: number): void {
  g.save();
  g.translate(x, y);
  switch (id) {
    case 'us': {
      for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#b22234'; g.fillRect(0, (i * h) / 7, w, h / 7); }
      g.fillStyle = '#ffffff'; g.fillRect(0, (6 * h) / 7, w, h / 7);
      g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, w * 0.42, h * 0.54);
      g.fillStyle = '#ffffff';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) g.fillRect(w * 0.05 + c * w * 0.09, h * 0.08 + r * h * 0.16, w * 0.03, h * 0.05);
      break;
    }
    case 'ru': {
      const cols = ['#ffffff', '#0039a6', '#d52b1e'];
      for (let i = 0; i < 3; i++) { g.fillStyle = cols[i]; g.fillRect(0, (i * h) / 3, w, h / 3); }
      break;
    }
    case 'fr': {
      const cols = ['#0055a4', '#ffffff', '#ef4135'];
      for (let i = 0; i < 3; i++) { g.fillStyle = cols[i]; g.fillRect((i * w) / 3, 0, w / 3, h); }
      break;
    }
    case 'eu': {
      g.fillStyle = '#003399'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffcc00';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.beginPath(); g.arc(w / 2 + Math.cos(a) * w * 0.28, h / 2 + Math.sin(a) * h * 0.28, Math.max(0.8, w * 0.035), 0, Math.PI * 2); g.fill();
      }
      break;
    }
    case 'cn': {
      g.fillStyle = '#de2910'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffde00';
      g.beginPath(); g.arc(w * 0.22, h * 0.3, h * 0.16, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(w * 0.42, h * (0.12 + i * 0.18), h * 0.06, 0, Math.PI * 2); g.fill(); }
      break;
    }
    case 'jp': {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#bc002d'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.3, 0, Math.PI * 2); g.fill();
      break;
    }
    case 'in': {
      const cols = ['#ff9933', '#ffffff', '#138808'];
      for (let i = 0; i < 3; i++) { g.fillStyle = cols[i]; g.fillRect(0, (i * h) / 3, w, h / 3); }
      g.strokeStyle = '#000080'; g.lineWidth = Math.max(0.6, w * 0.012);
      g.beginPath(); g.arc(w / 2, h / 2, h * 0.14, 0, Math.PI * 2); g.stroke();
      break;
    }
    case 'nz': {
      g.fillStyle = '#00247d'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff';
      for (const [px, py] of [[0.68, 0.26], [0.76, 0.52], [0.62, 0.66], [0.72, 0.8]]) {
        g.beginPath(); g.arc(w * px, h * py, h * 0.05, 0, Math.PI * 2); g.fill();
      }
      break;
    }
  }
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = Math.max(0.5, w * 0.02);
  g.strokeRect(0, 0, w, h);
  g.restore();
}

const POT = [64, 128, 256, 512, 1024];
/**
 * Hexagonal thermal tiles, about 0.3 m across, over the belly. The canvas is
 * stretched differently along and around the stage, so the tile size is laid
 * out in metres and converted on each axis. A few tiles are the off-white of a
 * replacement or a patch, the way the real shield looks after a few flights.
 * On the relief layer (`bump`) only the gaps between the tiles are drawn.
 */
function heatShield(g: CanvasRenderingContext2D, W: number, H: number, half: number, diameter: number, length: number, seed: number, k: number, bump: boolean): void {
  const w = half * W;
  g.save();
  g.beginPath();
  g.rect(0, 0, w, H);
  g.rect(W - w, 0, w, H);
  g.clip();
  if (!bump) {
    g.fillStyle = '#1b1c1f';
    g.fillRect(0, 0, W, H);
  }
  const tw = Math.max(3 * k, (0.32 * W) / (Math.PI * diameter));
  const th = Math.max(3 * k, (0.28 * H) / Math.max(1, length));
  g.strokeStyle = bump ? '#5c5c5c' : 'rgba(255,255,255,0.07)';
  g.lineWidth = k;
  let row = 0;
  for (let y = 0; y < H; y += th, row++) {
    g.beginPath();
    g.moveTo(0, y); g.lineTo(W, y);
    for (let x = (row % 2) * tw / 2; x < W; x += tw) { g.moveTo(x, y); g.lineTo(x, y + th); }
    g.stroke();
  }
  if (!bump) {
    const rows = Math.ceil(H / th), cols = Math.ceil((2 * w) / tw);
    for (let i = 0; i < 28; i++) {
      const r = Math.floor(hash11(seed + i * 1.7) * rows);
      const c = Math.floor(hash11(seed + i * 2.9 + 0.3) * cols);
      const x = ((c * tw + (r % 2) * tw / 2 - w) % W + W) % W;
      g.fillStyle = hash11(seed + i * 3.3) < 0.5 ? 'rgba(214,212,204,0.3)' : 'rgba(92,94,98,0.5)';
      g.fillRect(x, r * th, tw, th);
    }
  }
  g.restore();
}

function nearestPot(x: number): number {
  let best = POT[0];
  for (const p of POT) if (Math.abs(p - x) < Math.abs(best - x)) best = p;
  return best;
}

/** Texels along a stage's length in the colour map: about 2 cm on a 40 m stage. */
const BODY_TEXELS = 2048;
/** The relief map is half that: its joints are a few centimetres wide anyway. */
const BUMP_TEXELS = 1024;
/** Mid-grey: the relief map's flat skin. Darker is recessed, lighter raised. */
const FLAT = '#808080';

/**
 * Paint a stage body texture. The canvas wraps once around the cylinder: u runs
 * around the circumference, v runs from the bottom (v = 0) to the top.
 */
export function bodyTexture(liv: StageLivery, diameter: number, length: number, seed: number): THREE.CanvasTexture {
  return paintBody(liv, diameter, length, seed, false);
}

/**
 * The relief that goes with `bodyTexture`, for a material's `bumpMap`: the
 * tank-dome welds and panel joints sunk into the skin, the stringers and the
 * cable raceway standing proud of it, Starship's ring welds as ridges and the
 * fairing's half-shell joint as a groove. Drawn from the same seed and the same
 * layout as the paint, so every line the paint shows has its edge in the light.
 */
export function bodyBump(liv: StageLivery, diameter: number, length: number, seed: number): THREE.CanvasTexture {
  return paintBody(liv, diameter, length, seed, true);
}

function paintBody(liv: StageLivery, diameter: number, length: number, seed: number, bump: boolean): THREE.CanvasTexture {
  const H = bump ? BUMP_TEXELS : BODY_TEXELS;
  /** pixel sizes below were tuned on a 1024-texel canvas */
  const k = H / 1024;
  const W = nearestPot((H * Math.PI * diameter) / Math.max(1, length));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const yOf = (v: number) => H * (1 - v);
  g.fillStyle = bump ? FLAT : liv.base;
  g.fillRect(0, 0, W, H);

  if (liv.steel) {
    // brushed stainless: horizontal ring welds and a vertical sheen
    for (let i = 0; i < 46; i++) {
      const v = i / 46;
      if (bump) {
        // a weld bead stands proud of the rings either side of it
        g.fillStyle = '#a4a4a4';
        g.fillRect(0, yOf(v) - k, W, 2 * k);
        g.fillStyle = '#727272';
        g.fillRect(0, yOf(v) + k, W, 1.5 * k);
        continue;
      }
      g.fillStyle = `rgba(255,255,255,${0.05 + 0.05 * hash11(seed + i)})`;
      g.fillRect(0, yOf(v), W, 2 * k);
      g.fillStyle = 'rgba(0,0,0,0.07)';
      g.fillRect(0, yOf(v) + 2 * k, W, 1.5 * k);
    }
    if (!bump) {
      // each ring is rolled from its own sheet: a slightly different tone per ring
      for (let i = 0; i < 46; i++) {
        const a = (hash11(seed + i * 4.1 + 0.2) - 0.5) * 0.09;
        g.fillStyle = a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`;
        g.fillRect(0, yOf((i + 1) / 46), W, H / 46);
      }
      const sheen = g.createLinearGradient(0, 0, W, 0);
      sheen.addColorStop(0, 'rgba(0,0,0,0.20)');
      sheen.addColorStop(0.3, 'rgba(255,255,255,0.18)');
      sheen.addColorStop(0.55, 'rgba(0,0,0,0.12)');
      sheen.addColorStop(0.8, 'rgba(255,255,255,0.10)');
      sheen.addColorStop(1, 'rgba(0,0,0,0.20)');
      g.fillStyle = sheen;
      g.fillRect(0, 0, W, H);
    }
  } else {
    // panel lines: a few horizontal tank domes plus vertical stringers
    const rings: number[] = [];
    for (let i = 1; i < 9; i++) rings.push((i / 9) * H + hash11(seed + i) * 6 * k);
    if (!bump) {
      // Each barrel section between two joints is its own sheet, and no two
      // take the paint quite alike: a percent or two of tone either way.
      let prev = 0;
      for (let i = 0; i <= rings.length; i++) {
        const next = i < rings.length ? rings[i] : H;
        const a = (hash11(seed + i * 5.3 + 0.7) - 0.5) * 0.05;
        g.fillStyle = a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`;
        g.fillRect(0, prev, W, next - prev);
        prev = next;
      }
    }
    g.strokeStyle = bump ? '#5a5a5a' : 'rgba(0,0,0,0.13)';
    g.lineWidth = (bump ? 2 : 1.5) * k;
    for (const y of rings) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    }
    g.strokeStyle = bump ? '#8e8e8e' : 'rgba(0,0,0,0.08)';
    g.lineWidth = 1.5 * k;
    for (let i = 0; i < 8; i++) {
      const x = (i / 8) * W;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
    }
    // a cable raceway running the length of the stage
    const rw = Math.max(3 * k, W * 0.035);
    if (bump) {
      g.fillStyle = '#b4b4b4';
      g.fillRect(W * 0.12, 0, rw, H);
      // its cover is fastened down every half-metre or so
      g.fillStyle = '#9a9a9a';
      const step = Math.max(6 * k, (0.5 * H) / Math.max(1, length));
      for (let y = step / 2; y < H; y += step) g.fillRect(W * 0.12, y, rw, k);
    } else {
      g.fillStyle = 'rgba(0,0,0,0.16)';
      g.fillRect(W * 0.12, 0, rw, H);
      // Grime: faint streaks running down from the joints, where the
      // condensation off the cold tanks has dried on the paint.
      for (let i = 0; i < 26; i++) {
        const x = hash11(seed + i * 7.7 + 0.1) * W;
        const y0 = rings[Math.floor(hash11(seed + i * 2.3) * rings.length)];
        const len = (0.04 + 0.12 * hash11(seed + i * 9.1)) * H;
        const streak = g.createLinearGradient(0, y0, 0, y0 + len);
        streak.addColorStop(0, `rgba(70,64,56,${0.05 + 0.05 * hash11(seed + i * 1.3)})`);
        streak.addColorStop(1, 'rgba(70,64,56,0)');
        g.fillStyle = streak;
        g.fillRect(x, y0, Math.max(2 * k, W * (0.004 + 0.01 * hash11(seed + i * 3.9))), len);
      }
    }
  }

  if (!bump) {
    for (const b of liv.bands) {
      g.fillStyle = b.color;
      const y1 = yOf(Math.min(1, b.at + b.h));
      const y2 = yOf(Math.max(0, b.at));
      g.fillRect(0, y1, W, Math.max(2 * k, y2 - y1));
    }

    for (const q of liv.quarters ?? []) {
      g.fillStyle = q.color;
      const y1 = yOf(Math.min(1, q.at + q.h));
      const y2 = yOf(Math.max(0, q.at));
      g.fillRect(0, y1, W * 0.25, Math.max(2 * k, y2 - y1));
      g.fillRect(W * 0.5, y1, W * 0.25, Math.max(2 * k, y2 - y1));
    }

    if (liv.soot) {
      const soot = g.createLinearGradient(0, H, 0, H * 0.72);
      soot.addColorStop(0, 'rgba(24,22,20,0.82)');
      soot.addColorStop(0.5, 'rgba(40,36,32,0.35)');
      soot.addColorStop(1, 'rgba(60,54,48,0)');
      g.fillStyle = soot;
      g.fillRect(0, H * 0.72, W, H * 0.28);
    }
  }

  // Half-shell joints. Drawn over the panel lines and the bands (a real joint
  // interrupts both) but under the markings. The bright sliver on the +u side
  // is the lip of the near shell catching the light, which is what stops the
  // seam reading as a printed stripe; both are only a few pixels of a canvas
  // whose width is already sized to the body's aspect ratio, so the joint is
  // about a tenth of a metre wide on a 5 m fairing at every texture size.
  for (const u of liv.seams ?? []) {
    const w = Math.max(2 * k, W * 0.008);
    const x = ((u % 1) + 1) % 1 * W;
    g.fillStyle = bump ? '#383838' : 'rgba(26,28,32,0.85)';
    g.fillRect(x - w / 2, 0, w, H);
    g.fillStyle = bump ? '#a8a8a8' : 'rgba(255,255,255,0.20)';
    g.fillRect(x + w / 2, 0, Math.max(k, w * 0.45), H);
  }

  if (liv.heatShield) heatShield(g, W, H, liv.heatShield, diameter, length, seed, k, bump);

  if (bump) return finishBody(c);

  if (liv.text) {
    const px = Math.max(12 * k, Math.min(W * 0.42, H * 0.032));
    g.save();
    g.translate(W * 0.5, yOf(liv.textAt ?? 0.5));
    g.rotate(-Math.PI / 2);
    g.fillStyle = liv.textColor ?? '#222222';
    g.font = `600 ${px}px "Helvetica Neue", Arial, sans-serif`;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    // draw glyph by glyph so the marking is spaced out like real stencilling
    let x = 0;
    for (const ch of liv.text) {
      g.fillText(ch, x, 0);
      x += g.measureText(ch).width + px * 0.12;
    }
    g.restore();
  }

  if (liv.flag) {
    const fw = Math.max(14 * k, W * 0.16);
    drawFlag(g, liv.flag, W * 0.5 - fw / 2, H * 0.12, fw, fw * 0.62);
  }

  const tex = finishBody(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function finishBody(c: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  // the stage is seen edge-on along most of its length
  tex.anisotropy = 8;
  return tex;
}
