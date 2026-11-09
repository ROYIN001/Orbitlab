/**
 * The Structure section's 3-D view: one model at a time, its parts each
 * pickable, shown, hidden, seen through, dimmed, highlighted or coloured on
 * their own, and its assemblies each placed by the section (apart, opened,
 * previewed in a slot, or where the reference puts them).
 *
 * Every vertex carries its part's index (`item`, structure-mesh.ts); a small
 * texture holds each part's state, read in the vertex shader, so a change of
 * state costs one texture upload, not a new mesh. "See through" is a
 * screen-door pattern (every other pixel dropped), which needs no sorting.
 *
 * The camera turns about a target (drag, arrow keys), zooms (wheel, pinch,
 * + and −) and pans (Shift-drag, right-drag, two fingers); a press that does
 * not move picks a part (`onPick`). It draws only when something changed.
 *
 * One renderer for the section's life (src/ui/structure/): closing the
 * section frees every geometry, material and texture (`clear`) and stops
 * drawing, but keeps the WebGL context, so opening it again does not make a
 * new one — browsers drop the oldest context past about sixteen, and a
 * dropped one would bring up the app's "view lost" note.
 */
import * as THREE from 'three';
import { createWebGLRenderer } from './webgl-renderer';
import { isCameraInputTarget, wheelZoomFactor } from './gestures';

export type ColorMode = 'material' | 'category' | 'certainty';

/** A part's state bits. */
export const FLAG = { hidden: 1, ghost: 2, selected: 4, related: 8, dim: 16 } as const;

export interface ViewerMesh {
  unit: string;
  layer: string;
  geometry: THREE.BufferGeometry;
  roughness: number;
  metalness: number;
}

export interface ViewerOptions {
  /** a press that did not move: the part under it, or null for empty space */
  onPick?: (item: number | null) => void;
  /** the camera moved by the user's hand (to stop a guided view from fighting it) */
  onCameraInput?: () => void;
  reducedMotion?: () => boolean;
  /** colours for the kinds of part and the certainty levels, CSS strings */
  categoryColors: readonly string[];
  certaintyColors: readonly string[];
  accent: string;
  related: string;
  background: string;
}

const STATE_WIDTH = 1024;

const VERTEX = /* glsl */ `
attribute vec3 tint;
attribute float item;
uniform sampler2D itemState;
varying vec3 vNormalV;
varying vec3 vPosV;
varying vec3 vTint;
varying vec4 vState;
void main() {
  int i = int(item + 0.5);
  vState = texelFetch(itemState, ivec2(i % ${STATE_WIDTH}, i / ${STATE_WIDTH}), 0);
  vTint = tint;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vPosV = mv.xyz;
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}`;

const FRAGMENT = /* glsl */ `
uniform int colorMode;
uniform vec3 categoryColors[6];
uniform vec3 certaintyColors[4];
uniform vec3 accent;
uniform vec3 relatedColor;
uniform float roughness;
uniform float metalness;
varying vec3 vNormalV;
varying vec3 vPosV;
varying vec3 vTint;
varying vec4 vState;
void main() {
  int f = int(vState.r * 255.0 + 0.5);
  if ((f & 1) != 0) discard;
  if ((f & 2) != 0) {
    ivec2 p = ivec2(gl_FragCoord.xy);
    if (((p.x + p.y) & 1) == 0) discard;
  }
  vec3 base;
  if (colorMode == 1) base = categoryColors[int(vState.g * 255.0 + 0.5)];
  else if (colorMode == 2) base = certaintyColors[int(vState.b * 255.0 + 0.5)];
  else base = pow(vTint, vec3(2.2));
  vec3 n = normalize(vNormalV);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(-vPosV);
  vec3 l1 = normalize(vec3(0.45, 0.75, 0.55));
  vec3 l2 = normalize(vec3(-0.6, 0.15, 0.35));
  float d1 = max(dot(n, l1), 0.0);
  float d2 = max(dot(n, l2), 0.0);
  float hemi = 0.5 + 0.5 * n.y;
  vec3 h = normalize(l1 + v);
  float shine = mix(70.0, 6.0, roughness);
  float spec = pow(max(dot(n, h), 0.0), shine) * (1.0 - roughness);
  vec3 diffuse = base * (1.0 - 0.45 * metalness);
  vec3 specColor = mix(vec3(0.05), base, metalness);
  vec3 col = diffuse * (0.24 + 0.2 * hemi + 0.8 * d1 + 0.25 * d2) + specColor * spec * 1.6;
  if ((f & 16) != 0) col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))), 0.75) * 0.4;
  if ((f & 8) != 0) col = mix(col, relatedColor, 0.4);
  if ((f & 4) != 0) col = mix(col, accent, 0.5) + accent * 0.12;
  gl_FragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);
}`;

interface Pointer { x: number; y: number }

export class StructureViewer {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
  private readonly root = new THREE.Group();
  private readonly units = new Map<string, THREE.Group>();
  private readonly meshes: { mesh: THREE.Mesh; layer: string; unit: string }[] = [];
  private readonly materials = new Map<string, THREE.ShaderMaterial>();
  private grid: THREE.GridHelper | null = null;
  private state = new Uint8Array(4);
  private stateTexture: THREE.DataTexture;
  private readonly shared: Record<string, THREE.IUniform>;
  /** per part: its box in its assembly's frame (min xyz, max xyz) */
  private boxes = new Float32Array(0);
  private itemCount = 0;
  // the camera on a sphere about `target`
  private readonly target = new THREE.Vector3();
  private az = 0.8;
  private el = 0.25;
  private dist = 10;
  private tween: { from: { t: THREE.Vector3; az: number; el: number; dist: number }; to: { t: THREE.Vector3; az: number; el: number; dist: number }; start: number; ms: number } | null = null;
  private readonly pointers = new Map<number, Pointer>();
  private press: { x: number; y: number; t: number; moved: boolean } | null = null;
  private pinch = 0;
  private frame = 0;
  private dirty = true;
  private active = false;
  private readonly resizer: ResizeObserver;
  private readonly raycaster = new THREE.Raycaster();
  private readonly off: (() => void)[] = [];
  private homeView = { t: new THREE.Vector3(), az: 0.8, el: 0.25, dist: 10 };

  constructor(readonly canvas: HTMLCanvasElement, private readonly options: ViewerOptions) {
    this.renderer = createWebGLRenderer({ canvas, antialias: true });
    this.renderer.setClearColor(new THREE.Color(options.background), 1);
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.stateTexture = this.makeStateTexture(1);
    const colors = (list: readonly string[], n: number) => Array.from({ length: n }, (_, i) => new THREE.Color(list[i] ?? '#888888'));
    this.shared = {
      itemState: { value: this.stateTexture },
      colorMode: { value: 0 },
      categoryColors: { value: colors(options.categoryColors, 6) },
      certaintyColors: { value: colors(options.certaintyColors, 4) },
      accent: { value: new THREE.Color(options.accent) },
      relatedColor: { value: new THREE.Color(options.related) },
    };
    this.scene.add(this.root);
    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      canvas.addEventListener(type, fn as EventListener, opts);
      this.off.push(() => canvas.removeEventListener(type, fn as EventListener, opts));
    };
    on('pointerdown', (e) => this.onDown(e));
    on('pointermove', (e) => this.onMove(e));
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) on(type, (e) => this.onUp(e as PointerEvent));
    on('wheel', (e) => this.onWheel(e), { passive: false });
    on('contextmenu', (e) => e.preventDefault());
    // drawn on demand: a context the browser gives back is drawn again at once, not at the next touch (the loss itself: webgl-renderer.ts)
    const restored = (): void => this.requestRender();
    canvas.addEventListener('webglcontextrestored', restored);
    this.off.push(() => canvas.removeEventListener('webglcontextrestored', restored));
    this.resizer = new ResizeObserver(() => this.resize());
    this.resizer.observe(canvas.parentElement ?? canvas);
  }

  // ─── the model ───────────────────────────────────────────────────────────

  /** Start a model of `itemCount` parts and these assemblies, with each part's kind and certainty (indices). */
  reset(itemCount: number, units: readonly string[], category: Uint8Array, certainty: Uint8Array): void {
    this.clear();
    this.itemCount = itemCount;
    this.state = new Uint8Array(Math.max(1, itemCount) * 4);
    for (let i = 0; i < itemCount; i++) { this.state[i * 4 + 1] = category[i] ?? 0; this.state[i * 4 + 2] = certainty[i] ?? 0; }
    this.stateTexture.dispose();
    this.stateTexture = this.makeStateTexture(itemCount);
    this.shared.itemState.value = this.stateTexture;
    this.boxes = new Float32Array(Math.max(1, itemCount) * 6);
    for (let i = 0; i < itemCount; i++) this.boxes.set([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], i * 6);
    for (const u of units) {
      const g = new THREE.Group();
      g.name = u;
      this.units.set(u, g);
      this.root.add(g);
    }
    this.requestRender();
  }

  private makeStateTexture(count: number): THREE.DataTexture {
    const rows = Math.max(1, Math.ceil(count / STATE_WIDTH));
    const data = new Uint8Array(STATE_WIDTH * rows * 4);
    data.set(this.state.subarray(0, Math.min(this.state.length, data.length)));
    const tex = new THREE.DataTexture(data, STATE_WIDTH, rows, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  }

  private material(roughness: number, metalness: number): THREE.ShaderMaterial {
    const key = `${roughness}|${metalness}`;
    let m = this.materials.get(key);
    if (!m) {
      m = new THREE.ShaderMaterial({
        vertexShader: VERTEX, fragmentShader: FRAGMENT, side: THREE.DoubleSide,
        uniforms: { ...this.shared, roughness: { value: roughness }, metalness: { value: metalness } },
      });
      this.materials.set(key, m);
    }
    return m;
  }

  /** Add a layer's meshes to their assemblies, and learn each part's box from them. */
  addMeshes(meshes: readonly ViewerMesh[]): void {
    for (const m of meshes) {
      const group = this.units.get(m.unit);
      if (!group) continue;
      const mesh = new THREE.Mesh(m.geometry, this.material(m.roughness, m.metalness));
      mesh.name = `${m.unit}:${m.layer}`;
      mesh.frustumCulled = true;
      group.add(mesh);
      this.meshes.push({ mesh, layer: m.layer, unit: m.unit });
      const pos = m.geometry.getAttribute('position') as THREE.BufferAttribute;
      const item = m.geometry.getAttribute('item') as THREE.BufferAttribute;
      const b = this.boxes;
      for (let v = 0; v < pos.count; v++) {
        const i = item.getX(v);
        if (i >= this.itemCount) continue;
        const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v), o = i * 6;
        if (x < b[o]) b[o] = x; if (y < b[o + 1]) b[o + 1] = y; if (z < b[o + 2]) b[o + 2] = z;
        if (x > b[o + 3]) b[o + 3] = x; if (y > b[o + 4]) b[o + 4] = y; if (z > b[o + 5]) b[o + 5] = z;
      }
    }
    this.requestRender();
  }

  /** The layers drawn now. */
  layers(): Set<string> { return new Set(this.meshes.map((m) => m.layer)); }

  /** Show or hide a whole layer's meshes (it stays loaded). */
  setLayerVisible(layer: string, visible: boolean): void {
    for (const m of this.meshes) if (m.layer === layer) m.mesh.visible = visible;
    this.requestRender();
  }

  /** Free every geometry, material and texture of the model, and stop drawing it. The renderer stays. */
  clear(): void {
    for (const { mesh } of this.meshes) mesh.geometry.dispose();
    this.meshes.length = 0;
    for (const m of this.materials.values()) m.dispose();
    this.materials.clear();
    for (const g of this.units.values()) { g.clear(); this.root.remove(g); }
    this.units.clear();
    if (this.grid) { this.scene.remove(this.grid); this.grid.geometry.dispose(); (this.grid.material as THREE.Material).dispose(); this.grid = null; }
    this.itemCount = 0;
    // the parts' state texture: an empty one in its place until the next model (`reset` makes its own)
    this.state = new Uint8Array(4);
    this.stateTexture.dispose();
    this.stateTexture = this.makeStateTexture(0);
    this.shared.itemState.value = this.stateTexture;
    this.renderer.renderLists.dispose();
    this.requestRender();
  }

  /** Place an assembly (its matrix in the model's frame) and show or hide it. */
  setUnit(unit: string, matrix: THREE.Matrix4, visible = true): void {
    const g = this.units.get(unit);
    if (!g) return;
    g.matrixAutoUpdate = false;
    if (!g.matrix.equals(matrix) || g.visible !== visible) {
      g.matrix.copy(matrix);
      g.visible = visible;
      g.matrixWorldNeedsUpdate = true;
      this.requestRender();
    }
  }

  /** How far each assembly stands from where the reference puts it: the largest translation, m, and rotation, rad. */
  unitOffsets(): Map<string, { move: number; turn: number; visible: boolean }> {
    const out = new Map<string, { move: number; turn: number; visible: boolean }>();
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    for (const [u, g] of this.units) {
      g.matrix.decompose(p, q, s);
      out.set(u, { move: p.length(), turn: 2 * Math.acos(Math.min(1, Math.abs(q.w))), visible: g.visible });
    }
    return out;
  }

  // ─── the parts' states ───────────────────────────────────────────────────

  /** Set every part's state bits at once (`flagsOf(i)`), and upload them. */
  setFlags(flagsOf: (item: number) => number): void {
    let changed = false;
    for (let i = 0; i < this.itemCount; i++) {
      const f = flagsOf(i) & 0xff;
      if (this.state[i * 4] !== f) { this.state[i * 4] = f; changed = true; }
    }
    if (!changed) return;
    (this.stateTexture.image.data as Uint8Array).set(this.state.subarray(0, Math.min(this.state.length, this.stateTexture.image.data!.length)));
    this.stateTexture.needsUpdate = true;
    this.requestRender();
  }

  flagsOf(item: number): number { return item >= 0 && item < this.itemCount ? this.state[item * 4] : 0; }

  setColorMode(mode: ColorMode): void {
    const v = mode === 'category' ? 1 : mode === 'certainty' ? 2 : 0;
    if (this.shared.colorMode.value !== v) { this.shared.colorMode.value = v; this.requestRender(); }
  }

  /** A faint floor grid of `size` m under the model (0: none). */
  setGrid(size: number, y = 0): void {
    if (this.grid) { this.scene.remove(this.grid); this.grid.geometry.dispose(); (this.grid.material as THREE.Material).dispose(); this.grid = null; }
    if (size > 0) {
      this.grid = new THREE.GridHelper(size, 20, 0x2c3a4a, 0x1a2430);
      this.grid.position.y = y;
      this.scene.add(this.grid);
    }
    this.requestRender();
  }

  // ─── boxes and the camera ────────────────────────────────────────────────

  /** The box of these parts where they stand now (their assemblies placed), or null for none drawn. */
  boxOf(items: Iterable<number>, unitOf: (item: number) => string): THREE.Box3 | null {
    const box = new THREE.Box3();
    const local = new THREE.Box3();
    let any = false;
    this.root.updateMatrixWorld(true);
    for (const i of items) {
      const o = i * 6;
      if (i < 0 || i >= this.itemCount || !(this.boxes[o] <= this.boxes[o + 3])) continue;
      const g = this.units.get(unitOf(i));
      if (!g || !g.visible) continue;
      local.min.set(this.boxes[o], this.boxes[o + 1], this.boxes[o + 2]);
      local.max.set(this.boxes[o + 3], this.boxes[o + 4], this.boxes[o + 5]);
      local.applyMatrix4(g.matrixWorld);
      box.union(local);
      any = true;
    }
    return any ? box : null;
  }

  /** The box of these parts where the reference puts them (their assemblies' own frame), or null. */
  localBox(items: Iterable<number>): THREE.Box3 | null {
    const box = new THREE.Box3();
    let any = false;
    for (const i of items) {
      const o = i * 6;
      if (i < 0 || i >= this.itemCount || !(this.boxes[o] <= this.boxes[o + 3])) continue;
      box.expandByPoint(new THREE.Vector3(this.boxes[o], this.boxes[o + 1], this.boxes[o + 2]));
      box.expandByPoint(new THREE.Vector3(this.boxes[o + 3], this.boxes[o + 4], this.boxes[o + 5]));
      any = true;
    }
    return any ? box : null;
  }

  /** A point of the model's frame on the page (client px), or null behind the camera. */
  project(p: THREE.Vector3): { x: number; y: number } | null {
    this.updateCamera();
    const v = p.clone().project(this.camera);
    if (v.z > 1) return null;
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }

  /** Turn about a new point (a selection's centre), keeping the distance and angle. */
  retarget(p: THREE.Vector3, animate = true): void {
    this.goTo({ t: p.clone(), az: this.az, el: this.el, dist: this.dist }, animate);
  }

  /** Turn and zoom so `box` fills the view with room around it (`margin` × its size), keeping the angle. */
  frameBox(box: THREE.Box3, margin = 1.35, animate = true): void {
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(1e-3, box.getSize(new THREE.Vector3()).length() / 2);
    const fov = (this.camera.fov * Math.PI) / 180;
    const fit = (radius * margin) / Math.sin(Math.min(fov, fov * this.camera.aspect) / 2);
    this.goTo({ t: center, az: this.az, el: this.el, dist: fit }, animate);
  }

  /**
   * The view a model opens with, and the one "home" goes back to: the box's
   * height and its width across both fitting the view (a rocket is tall and
   * thin, so fitting its bounding sphere would leave it small).
   */
  setHome(box: THREE.Box3, az = 0.8, el = 0.18, margin = 1.15): void {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const across = Math.hypot(size.x, size.z);
    const half = (this.camera.fov * Math.PI) / 360;
    const aspect = Math.max(0.3, this.camera.aspect);
    const dist = margin * Math.max(size.y / 2 / Math.tan(half), across / 2 / (Math.tan(half) * aspect)) + across / 2;
    this.homeView = { t: center, az, el, dist };
  }

  home(animate = true): void { this.goTo({ ...this.homeView, t: this.homeView.t.clone() }, animate); }

  /** Look from the side the page's cutaway opens (its front halves face azimuth `az`). */
  lookFrom(az: number, el = 0.12, animate = true): void { this.goTo({ t: this.target.clone(), az, el, dist: this.dist }, animate); }

  orbitBy(dAz: number, dEl: number): void {
    this.tween = null;
    this.az += dAz;
    this.el = Math.max(-1.45, Math.min(1.45, this.el + dEl));
    this.requestRender();
  }

  zoomBy(factor: number): void {
    this.tween = null;
    this.dist = Math.max(this.homeView.dist * 0.01, Math.min(this.homeView.dist * 6, this.dist * factor));
    this.requestRender();
  }

  /** Move the target by a fraction of the view's height across (dx) and up (dy). */
  panBy(dx: number, dy: number): void {
    this.tween = null;
    const h = 2 * this.dist * Math.tan((this.camera.fov * Math.PI) / 360);
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    this.target.addScaledVector(right, -dx * h).addScaledVector(up, dy * h);
    this.requestRender();
  }

  private goTo(to: { t: THREE.Vector3; az: number; el: number; dist: number }, animate: boolean): void {
    // the shorter way round
    let az = to.az;
    while (az - this.az > Math.PI) az -= 2 * Math.PI;
    while (az - this.az < -Math.PI) az += 2 * Math.PI;
    const target = { ...to, az };
    if (!animate || this.options.reducedMotion?.()) {
      this.tween = null;
      this.target.copy(target.t); this.az = target.az; this.el = target.el; this.dist = target.dist;
      this.requestRender();
      return;
    }
    this.tween = { from: { t: this.target.clone(), az: this.az, el: this.el, dist: this.dist }, to: target, start: performance.now(), ms: 450 };
    this.requestRender();
  }

  /** The camera's state, for the section to keep across a model switch. */
  view(): { target: [number, number, number]; az: number; el: number; dist: number } {
    return { target: this.target.toArray() as [number, number, number], az: this.az, el: this.el, dist: this.dist };
  }

  // ─── picking ─────────────────────────────────────────────────────────────

  /** The part under a point of the page (client px), skipping hidden and see-through parts; null for none. */
  pick(clientX: number, clientY: number): number | null {
    const r = this.canvas.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return null;
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.updateCamera();
    this.root.updateMatrixWorld(true);
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets = this.meshes.filter((m) => m.mesh.visible && this.units.get(m.unit)?.visible).map((m) => m.mesh);
    for (const hit of this.raycaster.intersectObjects(targets, false)) {
      const geometry = (hit.object as THREE.Mesh).geometry;
      if (!hit.face) continue;
      const item = (geometry.getAttribute('item') as THREE.BufferAttribute).getX(hit.face.a);
      if (this.flagsOf(item) & (FLAG.hidden | FLAG.ghost)) continue;
      return item;
    }
    return null;
  }

  // ─── input ───────────────────────────────────────────────────────────────

  private spread(): number {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private onDown(e: PointerEvent): void {
    if (!isCameraInputTarget(e, this.canvas)) return;
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) this.press = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    else { this.press = null; this.pinch = this.spread(); }
  }

  private onMove(e: PointerEvent): void {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    const h = Math.max(1, this.canvas.clientHeight);
    if (this.press && Math.hypot(e.clientX - this.press.x, e.clientY - this.press.y) > 6) this.press.moved = true;
    if (this.pointers.size >= 2) {
      const now = this.spread();
      if (this.pinch > 0 && now > 0) this.zoomBy(this.pinch / now);
      this.pinch = now;
      this.panBy(dx / 2 / h, dy / 2 / h);
      this.options.onCameraInput?.();
      return;
    }
    if (!this.press?.moved) return;
    if (e.shiftKey || (e.buttons & 2) !== 0) this.panBy(dx / h, dy / h);
    else this.orbitBy(-dx * 0.008, dy * 0.008);
    this.options.onCameraInput?.();
  }

  private onUp(e: PointerEvent): void {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    const press = this.press;
    if (this.pointers.size < 2) this.pinch = 0;
    if (e.type === 'pointerup' && press && !press.moved && this.pointers.size === 0 && performance.now() - press.t < 700) {
      this.options.onPick?.(this.pick(e.clientX, e.clientY));
    }
    if (this.pointers.size === 0) this.press = null;
  }

  private onWheel(e: WheelEvent): void {
    if (!isCameraInputTarget(e, this.canvas)) return;
    const f = wheelZoomFactor(e, this.canvas.clientHeight);
    if (f === null) return;
    e.preventDefault();
    this.zoomBy(f);
    this.options.onCameraInput?.();
  }

  // ─── drawing ─────────────────────────────────────────────────────────────

  /** Draw while `on` (the section is showing); stop and draw nothing while it is not. */
  setActive(on: boolean): void {
    this.active = on;
    if (on) { this.resize(); this.requestRender(); }
    else if (this.frame) { cancelAnimationFrame(this.frame); this.frame = 0; }
  }

  requestRender(): void {
    this.dirty = true;
    if (!this.active || this.frame) return;
    this.frame = requestAnimationFrame((t) => this.tick(t));
  }

  private resize(): void {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, Math.round(el.clientWidth)), h = Math.max(1, Math.round(el.clientHeight));
    const size = this.renderer.getSize(new THREE.Vector2());
    if (size.x !== w || size.y !== h) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.requestRender();
    }
  }

  private updateCamera(): void {
    const c = Math.cos(this.el);
    this.camera.position.set(
      this.target.x + this.dist * c * Math.sin(this.az),
      this.target.y + this.dist * Math.sin(this.el),
      this.target.z + this.dist * c * Math.cos(this.az),
    );
    this.camera.near = Math.max(1e-3, this.dist / 500);
    this.camera.far = this.dist * 50 + 100;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }

  /** Frames drawn, and the time each took to submit, for the section's own measurement. */
  readonly timing = { frames: 0, last: 0 };

  private tick(now: number): void {
    this.frame = 0;
    if (!this.active) return;
    if (this.tween) {
      const k = Math.min(1, (now - this.tween.start) / this.tween.ms);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const { from, to } = this.tween;
      this.target.lerpVectors(from.t, to.t, e);
      this.az = from.az + (to.az - from.az) * e;
      this.el = from.el + (to.el - from.el) * e;
      this.dist = from.dist + (to.dist - from.dist) * e;
      if (k >= 1) this.tween = null;
      this.dirty = true;
    }
    if (this.dirty) {
      this.dirty = false;
      const t0 = performance.now();
      this.updateCamera();
      this.renderer.render(this.scene, this.camera);
      this.timing.frames++;
      this.timing.last = performance.now() - t0;
    }
    if (this.tween) this.frame = requestAnimationFrame((t) => this.tick(t));
  }

  /** What is drawn: triangles and draw calls of the last frame. */
  stats(): { triangles: number; calls: number } {
    return { triangles: this.renderer.info.render.triangles, calls: this.renderer.info.render.calls };
  }

  /** Free everything, the renderer and its context included (the section's own end). */
  dispose(): void {
    this.setActive(false);
    this.clear();
    this.stateTexture.dispose();
    for (const f of this.off) f();
    this.off.length = 0;
    this.resizer.disconnect();
    this.renderer.dispose();
  }
}
