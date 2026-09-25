/**
 * The reference frames in 3-D (roadmap E01): each frame's axes as arrows, the
 * angles between them as arcs with their values, labelled in the notation in
 * force (ISO 1151 or ГОСТ 20058-80, src/ui/notation.ts).
 *
 * Four groups, each switched on from the Frames menu (all off to begin with):
 *
 * - `body`: the body axes and the air-path axes, with α and β;
 * - `earth`: the normal Earth axes and the flight-path axes, with pitch, yaw
 *   and roll, and the flight-path angle and track;
 * - `orbital`: R, S, W;
 * - `inertial`: ECI and ECEF at the Earth's centre, with the Greenwich
 *   sidereal angle between them.
 *
 * The frames carried with the vehicle are a gizmo of constant size on the
 * screen (about 130 px an axis), drawn over the vehicle; ECI and ECEF are drawn
 * in the world, 1.5 Earth radii long, and hidden where the planet is in front
 * of them. Everything is rebuilt from the frame on screen each draw, so a
 * replayed or scrubbed flight shows its own frames.
 */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { VisualFrame } from '../physics/frame';
import type { Vec3 } from '../physics/vec3';
import { R_EARTH } from '../physics/constants';
import { referenceFrames, turn, type AngleArc, type Axes, type AxisConvention, type FrameAngle } from '../physics/reference-frames';
import type { NotationSymbol } from '../ui/notation';

export type FrameGroup = 'body' | 'earth' | 'orbital' | 'inertial';
export const FRAME_GROUPS: readonly FrameGroup[] = ['body', 'earth', 'orbital', 'inertial'];

/** One colour per frame; the angles take the colour of the frame they are measured to. */
export const FRAME_COLORS = {
  body: 0xffa94d,
  airPath: 0x4dd8ff,
  normalEarth: 0x69db7c,
  flightPath: 0xf783ac,
  orbital: 0xffe066,
  eci: 0xd0ebff,
  ecef: 0xff8787,
} as const;
type FrameKey = keyof typeof FRAME_COLORS;

/** The symbols the view writes: an axis letter with a frame's subscript, or an angle's symbol. */
export interface FrameSymbols {
  axis: (axis: 'x' | 'y' | 'z', sub?: string) => NotationSymbol;
  angle: (angle: FrameAngle | 'sidereal') => NotationSymbol;
}

/** Length of a vehicle-carried axis on the screen, CSS px. */
const AXIS_PX = 130;
const LABEL_PX = 15;
/** Arc radius of each angle, as a fraction of an axis. */
const ARC_RADIUS: Record<FrameAngle, number> = { alpha: 0.42, beta: 0.58, pitch: 0.68, yaw: 0.5, roll: 0.3, path: 1.0, track: 0.8 };
/** Where along its arc each angle's value is written: pairs of near-equal angles apart. */
const ARC_LABEL_AT: Record<FrameAngle, number> = { alpha: 0.5, beta: 0.5, pitch: 0.45, yaw: 0.45, roll: 0.5, path: 0.75, track: 0.75 };
const ARC_COLOR: Record<FrameAngle, FrameKey> = {
  alpha: 'airPath', beta: 'airPath', pitch: 'body', yaw: 'body', roll: 'body', path: 'flightPath', track: 'flightPath',
};
const ARC_GROUP: Record<FrameAngle, FrameGroup> = {
  alpha: 'body', beta: 'body', pitch: 'earth', yaw: 'earth', roll: 'earth', path: 'earth', track: 'earth',
};
const ARC_STEPS = 28;
const EARTH_AXIS = 1.5 * R_EARTH;

/** An angle as a reader of either standard writes it, °: ISO bearings over 0–360, the rest signed. */
export function angleText(angle: FrameAngle | 'sidereal', value: number, convention: AxisConvention): string {
  let deg = value * 180 / Math.PI;
  if (angle === 'sidereal' || (convention === 'iso' && (angle === 'yaw' || angle === 'track'))) deg = ((deg % 360) + 360) % 360;
  const text = deg.toFixed(1);
  return `${text === '-0.0' ? '0.0' : text.replace('-', '−')}°`;
}

/** Many coloured segments in one draw, the buffers allocated once and written in place. */
class Segments {
  readonly lines: LineSegments2;
  readonly halo: LineSegments2;
  private geometry = new LineSegmentsGeometry();
  private positions: THREE.InterleavedBuffer;
  private colors: THREE.InterleavedBuffer;
  private pos: Float32Array;
  private col: Float32Array;
  private n = 0;
  private readonly capacity: number;
  private readonly materials: LineMaterial[];

  constructor(capacity: number, depthTest: boolean, renderOrder: number) {
    this.capacity = capacity;
    this.geometry.setPositions(new Float32Array(capacity * 6));
    this.geometry.setColors(new Float32Array(capacity * 6));
    this.positions = (this.geometry.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute).data;
    this.colors = (this.geometry.getAttribute('instanceColorStart') as THREE.InterleavedBufferAttribute).data;
    this.pos = this.positions.array as Float32Array;
    this.col = this.colors.array as Float32Array;
    this.geometry.instanceCount = 0;
    const lineMat = new LineMaterial({ vertexColors: true, linewidth: 2, transparent: true, opacity: 0.95, depthTest, depthWrite: false });
    // a dark edge under every line, so a pale axis still reads against a bright sky
    const haloMat = new LineMaterial({ color: 0x05080c, linewidth: 4.5, transparent: true, opacity: 0.5, depthTest, depthWrite: false });
    this.materials = [lineMat, haloMat];
    this.lines = new LineSegments2(this.geometry, lineMat);
    this.halo = new LineSegments2(this.geometry, haloMat);
    for (const [line, order] of [[this.lines, renderOrder + 1], [this.halo, renderOrder]] as const) {
      line.frustumCulled = false;
      line.renderOrder = order;
    }
  }

  setResolution(w: number, h: number): void { for (const m of this.materials) m.resolution.set(Math.max(1, w), Math.max(1, h)); }
  begin(): void { this.n = 0; }

  push(a: THREE.Vector3, b: THREE.Vector3, color: THREE.Color): void {
    if (this.n >= this.capacity) return;
    const o = this.n++ * 6;
    this.pos[o] = a.x; this.pos[o + 1] = a.y; this.pos[o + 2] = a.z;
    this.pos[o + 3] = b.x; this.pos[o + 4] = b.y; this.pos[o + 5] = b.z;
    this.col[o] = color.r; this.col[o + 1] = color.g; this.col[o + 2] = color.b;
    this.col[o + 3] = color.r; this.col[o + 4] = color.g; this.col[o + 5] = color.b;
  }

  end(): void {
    this.geometry.instanceCount = this.n;
    for (const data of [this.positions, this.colors]) {
      data.clearUpdateRanges();
      data.addUpdateRange(0, this.n * 6);
      data.needsUpdate = true;
    }
    this.lines.visible = this.halo.visible = this.n > 0;
  }

  dispose(): void {
    this.geometry.dispose();
    for (const m of this.materials) m.dispose();
  }
}

interface TextPart { text: string; sub?: boolean; color?: string }

/** A text sprite of constant size on the screen, redrawn only when its text changes. */
class Label {
  readonly sprite: THREE.Sprite;
  private canvas = document.createElement('canvas');
  private texture: THREE.CanvasTexture;
  private material: THREE.SpriteMaterial;
  private key = '';
  /** the part of the canvas's width the text takes (the canvas grows in steps) */
  private fill = 1;

  constructor() {
    this.canvas.width = 64;
    this.canvas.height = 40;
    this.texture = this.makeTexture();
    this.material = new THREE.SpriteMaterial({ map: this.texture, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false, fog: false });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.renderOrder = 12;
    this.sprite.frustumCulled = false;
    this.sprite.visible = false;
  }

  private makeTexture(): THREE.CanvasTexture {
    const texture = new THREE.CanvasTexture(this.canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  set(parts: TextPart[]): void {
    const key = JSON.stringify(parts);
    if (key === this.key) return;
    this.key = key;
    const size = 26, subSize = 18, pad = 6;
    const font = (s: number) => `600 ${s}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    let width = pad * 2;
    for (const p of parts) { ctx.font = font(p.sub ? subSize : size); width += ctx.measureText(p.text).width; }
    const w = Math.ceil(width / 64) * 64, h = Math.ceil(size * 1.5);
    if (w !== this.canvas.width || h !== this.canvas.height) {
      // A texture keeps the size it was first uploaded at, and a canvas drawn
      // larger into it comes out garbled: a new size takes a new texture.
      this.canvas.width = w;
      this.canvas.height = h;
      this.texture.dispose();
      this.texture = this.makeTexture();
      this.material.map = this.texture;
      this.material.needsUpdate = true;
    } else {
      ctx.clearRect(0, 0, w, h);
    }
    this.fill = width / w;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    let x = pad;
    const mid = h / 2;
    for (const p of parts) {
      ctx.font = font(p.sub ? subSize : size);
      const y = p.sub ? mid + size * 0.28 : mid;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(4, 8, 12, 0.85)';
      ctx.strokeText(p.text, x, y);
      ctx.fillStyle = p.color ?? '#f1f5f9';
      ctx.fillText(p.text, x, y);
      x += ctx.measureText(p.text).width;
    }
    this.texture.needsUpdate = true;
  }

  /** The text's size on the screen, px. */
  size(): [number, number] {
    const h = LABEL_PX * 1.5;
    return [h * (this.canvas.width / this.canvas.height) * this.fill, h];
  }

  /**
   * Show it at `at`, reaching away from that point along the screen direction
   * (dx, dy), so a label past an arrow's tip never lies back across the arrow.
   * `fovDeg` and `viewH` fix its size on the screen.
   */
  place(at: THREE.Vector3, viewH: number, fovDeg: number, dx: number, dy: number): void {
    const s = (LABEL_PX * 1.5 / Math.max(1, viewH)) * 2 * Math.tan((fovDeg * Math.PI) / 360);
    this.sprite.scale.set(s * (this.canvas.width / this.canvas.height), s, 1);
    this.sprite.center.set((0.5 - 0.5 * dx) * this.fill, 0.5 - 0.5 * dy);
    this.sprite.position.copy(at);
    this.sprite.visible = true;
  }

  dispose(): void { this.texture.dispose(); this.material.dispose(); }
}

/** A label waiting for its place: where it wants to be and which way it reaches. */
interface LabelRequest { label: Label; at: THREE.Vector3; dx: number; dy: number }

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

export class FramesView {
  readonly group = new THREE.Group();
  private shown = new Set<FrameGroup>();
  private carried = new Segments(640, false, 20);
  private world = new Segments(160, true, 3);
  private labels: Label[] = [];
  private used = 0;
  private viewW = 1;
  private viewH = 1;
  private readonly color = new THREE.Color();
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly tip = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly base = new THREE.Vector3();
  private readonly at = new THREE.Vector3();
  private readonly view = new THREE.Vector3();
  private readonly o = new THREE.Vector3();
  private readonly camPos = new THREE.Vector3();
  private readonly earth = new THREE.Vector3();
  private fov = 48;
  private camera: THREE.PerspectiveCamera | null = null;
  private readonly p0 = new THREE.Vector3();
  private readonly p1 = new THREE.Vector3();
  private requests: LabelRequest[] = [];
  private spare: THREE.Vector3[] = [];

  constructor(private readonly symbols: FrameSymbols) {
    this.group.add(this.carried.halo, this.carried.lines, this.world.halo, this.world.lines);
    this.group.visible = false;
  }

  setShown(groups: Iterable<FrameGroup>): void { this.shown = new Set(groups); }

  setResolution(w: number, h: number): void {
    this.viewW = Math.max(1, w); this.viewH = Math.max(1, h);
    this.carried.setResolution(this.viewW, this.viewH);
    this.world.setResolution(this.viewW, this.viewH);
  }

  /**
   * Draw the frames of `frame`.
   *
   * @param vehicle the vehicle's position in scene coordinates
   * @param earthCenter the Earth's centre in scene coordinates
   * @param azimuth the launch azimuth over the ground (the point mass's roll reference and ГОСТ's x_g)
   * @param drawVehicle false when the vehicle is not what the camera looks at (onboard, a followed stage, a break-up)
   */
  update(frame: VisualFrame, camera: THREE.PerspectiveCamera, vehicle: THREE.Vector3, earthCenter: THREE.Vector3,
    azimuth: number, convention: AxisConvention, drawVehicle: boolean): void {
    this.used = 0;
    for (const r of this.requests) this.spare.push(r.at);
    this.requests = [];
    this.fov = camera.fov;
    this.camera = camera;
    camera.updateMatrixWorld();
    this.camPos.copy(camera.position);
    this.earth.copy(earthCenter);
    this.carried.begin();
    this.world.begin();
    const any = this.shown.size > 0;
    this.group.visible = any;
    if (any) {
      const f = referenceFrames({ r: frame.r, v: frame.v, dir: frame.dir, theta: frame.theta,
        rigid: frame.rigid ? { attitudeQ: frame.rigid.attitudeQ, windECI: frame.rigid.windECI } : undefined }, azimuth, convention);
      if (drawVehicle && !frame.destroyed) {
        // an axis `AXIS_PX` long on the screen, wherever the camera is
        const dist = camera.position.distanceTo(vehicle);
        const L = (Math.min(AXIS_PX, 0.2 * this.viewH) / this.viewH) * 2 * Math.tan((camera.fov * Math.PI) / 360) * dist;
        this.o.copy(vehicle);
        const view = this.view.copy(vehicle).sub(camera.position).normalize();
        if (this.shown.has('body')) {
          this.triad(f.body, 'body', L, view);
          if (f.airPath) this.triad(f.airPath, 'airPath', L * 0.78, view, 'a');
          if (f.helpers.airInSymmetryPlane) this.ray(f.helpers.airInSymmetryPlane, 0.8 * L, 'airPath', 0.45);
        }
        if (this.shown.has('earth')) {
          this.triad(f.normalEarth, 'normalEarth', L * 0.92, view, 'g');
          if (f.flightPath) this.triad(f.flightPath, 'flightPath', L * 1.22, view, 'k');
          // pitch and yaw are read off the body axis, so it is drawn here too
          if (!this.shown.has('body')) this.axis(f.body.x, L, 'body', view, this.symbols.axis('x'));
          if (f.helpers.noseHorizontal) this.ray(f.helpers.noseHorizontal, 0.9 * L, 'body', 0.45);
          if (f.helpers.groundHorizontal) this.ray(f.helpers.groundHorizontal, 1.1 * L, 'flightPath', 0.45);
        }
        if (this.shown.has('orbital') && f.orbital) {
          const [R, S, W] = [f.orbital.x, f.orbital.y, f.orbital.z];
          const k = L * 1.15;
          this.axis(R, k, 'orbital', view, { base: 'R' });
          this.axis(S, k, 'orbital', view, { base: 'S' });
          this.axis(W, k, 'orbital', view, { base: 'W' });
        }
        for (const [name, arc] of Object.entries(f.arcs) as [FrameAngle, AngleArc][]) {
          if (!this.shown.has(ARC_GROUP[name]) || f.angles[name] === null) continue;
          this.arc(arc, ARC_RADIUS[name] * L, ARC_COLOR[name], this.symbols.angle(name), angleText(name, arc.value, convention), ARC_LABEL_AT[name]);
        }
      }
      if (this.shown.has('inertial')) this.inertial(f.eci, f.ecef, f.sidereal, camera.getWorldDirection(this.view), convention);
    }
    this.carried.end();
    this.world.end();
    for (let i = this.used; i < this.labels.length; i++) this.labels[i].sprite.visible = false;
    this.layoutLabels();
  }

  /** Ask for a label at `at` reaching along the screen direction from `from`; placed by `layoutLabels`. */
  private request(label: Label, from: THREE.Vector3, at: THREE.Vector3): void {
    const [dx, dy] = this.screenDirection(from, at);
    this.requests.push({ label, at: (this.spare.pop() ?? new THREE.Vector3()).copy(at), dx, dy });
  }

  /**
   * Put every label where it asked to be, or, where that would cover a label
   * already placed, the nearest free place a step or more further along its
   * direction or to either side of it. The axes' names go first, then the
   * angles' values, in the order they were drawn.
   */
  private layoutLabels(): void {
    const camera = this.camera;
    if (!camera) return;
    const right = this.p0.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    const up = this.p1.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    const forward = camera.getWorldDirection(this.a);
    const taken: [number, number, number, number][] = [];
    const tan = Math.tan((this.fov * Math.PI) / 360);
    const clear = (r: [number, number, number, number]) => !taken.some((q) => r[0] < q[2] && q[0] < r[2] && r[1] < q[3] && q[1] < r[3]);
    for (const req of this.requests) {
      const p = this.b.copy(req.at).project(camera);
      const sx = (p.x + 1) / 2 * this.viewW, sy = (p.y + 1) / 2 * this.viewH;
      const [w, h] = req.label.size();
      const rect = (ox: number, oy: number): [number, number, number, number] => {
        const x0 = sx + ox - (0.5 - 0.5 * req.dx) * w, y0 = sy + oy - (0.5 - 0.5 * req.dy) * h;
        return [x0 - 1, y0 - 1, x0 + w + 1, y0 + h + 1];
      };
      let off: [number, number] = [0, 0];
      if (!clear(rect(0, 0))) {
        const step = 0.8 * h;
        search: for (let k = 1; k <= 8; k++) {
          for (const [ox, oy] of [[req.dx, req.dy], [-req.dy, req.dx], [req.dy, -req.dx]] as const) {
            if (clear(rect(ox * k * step, oy * k * step))) { off = [ox * k * step, oy * k * step]; break search; }
          }
        }
      }
      taken.push(rect(off[0], off[1]));
      // pixels to metres at the label's depth
      const depth = this.tip.copy(req.at).sub(camera.position).dot(forward);
      const perPx = (2 * tan * Math.max(depth, 1e-3)) / this.viewH;
      const at = req.at.addScaledVector(right, off[0] * perPx).addScaledVector(up, off[1] * perPx);
      req.label.place(at, this.viewH, this.fov, req.dx, req.dy);
    }
  }

  private label(): Label {
    if (this.used === this.labels.length) {
      const l = new Label();
      this.labels.push(l);
      this.group.add(l.sprite);
    }
    return this.labels[this.used++];
  }

  private setColor(key: FrameKey, dim = 1): THREE.Color {
    return this.color.setHex(FRAME_COLORS[key]).multiplyScalar(dim);
  }

  /** An arrow from `from` along `u`, `len` long, with its label past the tip. */
  private axis(u: Vec3, len: number, key: FrameKey, view: THREE.Vector3, symbol: NotationSymbol, batch = this.carried, from = this.o): void {
    const color = this.setColor(key);
    const tip = this.tip.set(u.x, u.y, u.z).multiplyScalar(len).add(from);
    batch.push(from, tip, color);
    // the arrowhead: two strokes back from the tip, in the plane facing the camera
    const side = this.side.set(u.x, u.y, u.z).cross(view);
    if (side.lengthSq() < 1e-8) side.set(0, 1, 0).cross(this.a.set(u.x, u.y, u.z));
    side.normalize().multiplyScalar(len * 0.05);
    const base = this.base.set(u.x, u.y, u.z).multiplyScalar(-len * 0.12).add(tip);
    batch.push(tip, this.a.copy(base).add(side), color);
    batch.push(tip, this.b.copy(base).sub(side), color);
    const at = this.at.set(u.x, u.y, u.z).multiplyScalar(len * 1.06).add(from);
    if (batch === this.world && this.behindEarth(at)) return;
    const tint = hex(FRAME_COLORS[key]);
    const label = this.label();
    label.set([{ text: symbol.base, color: tint }, ...(symbol.sub ? [{ text: symbol.sub, sub: true, color: tint }] : [])]);
    this.request(label, from, at);
  }

  /** The unit direction on the screen from `a` to `b` (x right, y up); (1, 0) if they coincide. */
  private screenDirection(a: THREE.Vector3, b: THREE.Vector3): [number, number] {
    if (!this.camera) return [1, 0];
    const p = this.p0.copy(a).project(this.camera), q = this.p1.copy(b).project(this.camera);
    const dx = (q.x - p.x) * this.viewW, dy = (q.y - p.y) * this.viewH;
    const l = Math.hypot(dx, dy);
    return l > 1e-6 ? [dx / l, dy / l] : [1, 0];
  }

  private triad(axes: Axes, key: FrameKey, len: number, view: THREE.Vector3, sub?: string): void {
    this.axis(axes.x, len, key, view, this.symbols.axis('x', sub));
    this.axis(axes.y, len, key, view, this.symbols.axis('y', sub));
    this.axis(axes.z, len, key, view, this.symbols.axis('z', sub));
  }

  /** Whether the Earth stands between the camera and `p` (world labels are drawn over everything otherwise). */
  private behindEarth(p: THREE.Vector3): boolean {
    const d = this.a.copy(p).sub(this.camPos);
    const len = d.length();
    d.divideScalar(len);
    const m = this.b.copy(this.earth).sub(this.camPos);
    const along = m.dot(d);
    if (along < 0 || along > len) return false;
    return m.lengthSq() - along * along < R_EARTH * R_EARTH;
  }

  /** A faint unlabelled line: a projection an angle is measured on. */
  private ray(u: Vec3, len: number, key: FrameKey, dim: number): void {
    this.carried.push(this.o, this.a.set(u.x, u.y, u.z).multiplyScalar(len).add(this.o), this.setColor(key, dim));
  }

  /** An angle's arc of radius `radius` about `center`, and its value at the middle. */
  private arc(arc: AngleArc, radius: number, key: FrameKey, symbol: NotationSymbol, value: string, labelAt = 0.5, batch = this.carried, center = this.o): void {
    const color = this.setColor(key);
    if (Math.abs(arc.angle) > 1e-4) {
      let prev = arc.from;
      for (let i = 1; i <= ARC_STEPS; i++) {
        const next = turn(arc.from, arc.axis, (arc.angle * i) / ARC_STEPS);
        batch.push(this.a.set(prev.x, prev.y, prev.z).multiplyScalar(radius).add(center), this.b.set(next.x, next.y, next.z).multiplyScalar(radius).add(center), color);
        prev = next;
      }
    }
    const mid = turn(arc.from, arc.axis, arc.angle * labelAt);
    const at = this.at.set(mid.x, mid.y, mid.z).multiplyScalar(radius * 1.08).add(center);
    if (batch === this.world && this.behindEarth(at)) return;
    const tint = hex(FRAME_COLORS[key]);
    const label = this.label();
    label.set([{ text: symbol.base, color: tint }, ...(symbol.sub ? [{ text: symbol.sub, sub: true, color: tint }] : []), { text: ` ${value}` }]);
    this.request(label, center, at);
  }

  /** ECI and ECEF at the Earth's centre, and the sidereal angle between their x axes. */
  private inertial(eci: Axes, ecef: Axes, sidereal: number, view: THREE.Vector3, convention: AxisConvention): void {
    const c = this.earth;
    this.axis(eci.x, EARTH_AXIS, 'eci', view, { base: 'X', sub: 'ECI' }, this.world, c);
    this.axis(eci.y, EARTH_AXIS, 'eci', view, { base: 'Y', sub: 'ECI' }, this.world, c);
    this.axis(eci.z, EARTH_AXIS * 1.1, 'eci', view, { base: 'Z' }, this.world, c);
    this.axis(ecef.x, EARTH_AXIS, 'ecef', view, { base: 'X', sub: 'ECEF' }, this.world, c);
    this.axis(ecef.y, EARTH_AXIS, 'ecef', view, { base: 'Y', sub: 'ECEF' }, this.world, c);
    this.arc({ from: eci.x, axis: eci.z, angle: sidereal, value: sidereal }, 1.2 * R_EARTH, 'ecef',
      this.symbols.angle('sidereal'), angleText('sidereal', sidereal, convention), 0.5, this.world, c);
  }

  dispose(): void {
    this.carried.dispose();
    this.world.dispose();
    for (const l of this.labels) l.dispose();
  }
}
