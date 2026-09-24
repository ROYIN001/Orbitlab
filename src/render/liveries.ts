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
  return new THREE.LatheGeometry(pts, 16);
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
}

const FLAG_BY_COUNTRY: Record<string, FlagId> = {
  US: 'us', RU: 'ru', EU: 'eu', CN: 'cn', JP: 'jp', IN: 'in', 'NZ/US': 'nz', KZ: 'ru', FR: 'fr',
};

/** Per-vehicle overrides, keyed `${vehicleId}/${stageId}`. */
const OVERRIDES: Record<string, Partial<StageLivery>> = {
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
  const ov = OVERRIDES[`${vehicle.id}/${stage.id}`];
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

const POT = [64, 128, 256, 512];
/**
 * Hexagonal thermal tiles, about 0.3 m across, over the belly. The canvas is
 * stretched differently along and around the stage, so the tile size is laid
 * out in metres and converted on each axis. A few tiles are the off-white of a
 * replacement or a patch, the way the real shield looks after a few flights.
 */
function heatShield(g: CanvasRenderingContext2D, W: number, H: number, half: number, diameter: number, length: number, seed: number): void {
  const w = half * W;
  g.save();
  g.beginPath();
  g.rect(0, 0, w, H);
  g.rect(W - w, 0, w, H);
  g.clip();
  g.fillStyle = '#1b1c1f';
  g.fillRect(0, 0, W, H);
  const tw = Math.max(3, (0.32 * W) / (Math.PI * diameter));
  const th = Math.max(3, (0.28 * H) / Math.max(1, length));
  g.strokeStyle = 'rgba(255,255,255,0.07)';
  g.lineWidth = 1;
  let row = 0;
  for (let y = 0; y < H; y += th, row++) {
    g.beginPath();
    g.moveTo(0, y); g.lineTo(W, y);
    for (let x = (row % 2) * tw / 2; x < W; x += tw) { g.moveTo(x, y); g.lineTo(x, y + th); }
    g.stroke();
  }
  const rows = Math.ceil(H / th), cols = Math.ceil((2 * w) / tw);
  for (let i = 0; i < 90; i++) {
    const r = Math.floor(hash11(seed + i * 1.7) * rows);
    const c = Math.floor(hash11(seed + i * 2.9 + 0.3) * cols);
    const x = ((c * tw + (r % 2) * tw / 2 - w) % W + W) % W;
    g.fillStyle = hash11(seed + i * 3.3) < 0.7 ? 'rgba(214,212,204,0.55)' : 'rgba(92,94,98,0.6)';
    g.fillRect(x, r * th, tw, th);
  }
  g.restore();
}

function nearestPot(x: number): number {
  let best = POT[0];
  for (const p of POT) if (Math.abs(p - x) < Math.abs(best - x)) best = p;
  return best;
}

/**
 * Paint a stage body texture. The canvas wraps once around the cylinder: u runs
 * around the circumference, v runs from the bottom (v = 0) to the top.
 */
export function bodyTexture(liv: StageLivery, diameter: number, length: number, seed: number): THREE.CanvasTexture {
  const H = 1024;
  const W = nearestPot((H * Math.PI * diameter) / Math.max(1, length));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const yOf = (v: number) => H * (1 - v);
  g.fillStyle = liv.base;
  g.fillRect(0, 0, W, H);

  if (liv.steel) {
    // brushed stainless: horizontal ring welds and a vertical sheen
    for (let i = 0; i < 46; i++) {
      const v = i / 46;
      g.fillStyle = `rgba(255,255,255,${0.05 + 0.05 * hash11(seed + i)})`;
      g.fillRect(0, yOf(v), W, 2);
      g.fillStyle = 'rgba(0,0,0,0.07)';
      g.fillRect(0, yOf(v) + 2, W, 1.5);
    }
    const sheen = g.createLinearGradient(0, 0, W, 0);
    sheen.addColorStop(0, 'rgba(0,0,0,0.20)');
    sheen.addColorStop(0.3, 'rgba(255,255,255,0.18)');
    sheen.addColorStop(0.55, 'rgba(0,0,0,0.12)');
    sheen.addColorStop(0.8, 'rgba(255,255,255,0.10)');
    sheen.addColorStop(1, 'rgba(0,0,0,0.20)');
    g.fillStyle = sheen;
    g.fillRect(0, 0, W, H);
  } else {
    // panel lines: a few horizontal tank domes plus vertical stringers
    g.strokeStyle = 'rgba(0,0,0,0.13)';
    g.lineWidth = 1.5;
    for (let i = 1; i < 9; i++) {
      const y = (i / 9) * H + hash11(seed + i) * 6;
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    }
    g.strokeStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 8; i++) {
      const x = (i / 8) * W;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
    }
    // a cable raceway running the length of the stage
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.fillRect(W * 0.12, 0, Math.max(3, W * 0.035), H);
  }

  for (const b of liv.bands) {
    g.fillStyle = b.color;
    const y1 = yOf(Math.min(1, b.at + b.h));
    const y2 = yOf(Math.max(0, b.at));
    g.fillRect(0, y1, W, Math.max(2, y2 - y1));
  }

  if (liv.soot) {
    const soot = g.createLinearGradient(0, H, 0, H * 0.72);
    soot.addColorStop(0, 'rgba(24,22,20,0.82)');
    soot.addColorStop(0.5, 'rgba(40,36,32,0.35)');
    soot.addColorStop(1, 'rgba(60,54,48,0)');
    g.fillStyle = soot;
    g.fillRect(0, H * 0.72, W, H * 0.28);
  }

  // Half-shell joints. Drawn over the panel lines and the bands (a real joint
  // interrupts both) but under the markings. The bright sliver on the +u side
  // is the lip of the near shell catching the light, which is what stops the
  // seam reading as a printed stripe; both are only a few pixels of a canvas
  // whose width is already sized to the body's aspect ratio, so the joint is
  // about a tenth of a metre wide on a 5 m fairing at every texture size.
  for (const u of liv.seams ?? []) {
    const w = Math.max(2, W * 0.008);
    const x = ((u % 1) + 1) % 1 * W;
    g.fillStyle = 'rgba(26,28,32,0.85)';
    g.fillRect(x - w / 2, 0, w, H);
    g.fillStyle = 'rgba(255,255,255,0.20)';
    g.fillRect(x + w / 2, 0, Math.max(1, w * 0.45), H);
  }

  if (liv.heatShield) heatShield(g, W, H, liv.heatShield, diameter, length, seed);

  if (liv.text) {
    const px = Math.max(12, Math.min(W * 0.42, H * 0.032));
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
    const fw = Math.max(14, W * 0.16);
    drawFlag(g, liv.flag, W * 0.5 - fw / 2, H * 0.12, fw, fw * 0.62);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}
