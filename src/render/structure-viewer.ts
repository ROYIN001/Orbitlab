/**
 * The Structure section's 3-D view: one model at a time, its parts each
 * pickable, shown, hidden, seen through, dimmed, highlighted, painted or
 * coloured on their own, and its assemblies each placed by the section
 * (apart, opened, previewed in a slot, or where the reference puts them),
 * moving there over a moment when asked.
 *
 * Every vertex carries its part's index (`item`, structure-mesh.ts); a small
 * texture holds each part's state, read in the vertex shader, so a change of
 * state costs one texture upload, not a new mesh. A part seen through is
 * drawn in a second pass, blended over the solid ones without writing depth
 * (so what stands behind it shows through); that pass draws only the meshes
 * that have such a part, so it costs nothing while nothing is seen through.
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

export type ColorMode = 'material' | 'category' | 'certainty';

/**
 * A part's state bits: not drawn; seen through (its own colours, blended);
 * selected (a rim and a light tint of the accent); related to the selection;
 * dimmed (grey and dark); a faint outline of where a part belongs (the
 * assembly's reference: one flat tint, lightly blended); and lit as a target
 * (a place the part in hand can go).
 */
export const FLAG = { hidden: 1, ghost: 2, selected: 4, related: 8, dim: 16, faint: 32, target: 64 } as const;

/** How many paint colours a model can use at once (`setPaint`: circuits by what flows, subsystems, changed parts). */
export const PAINT_SLOTS = 8;

export interface ViewerMesh {
  unit: string;
  layer: string;
  geometry: THREE.BufferGeometry;
  roughness: number;
  metalness: number;
}

/**
 * The app's own WebGL and input rules, given to the viewer rather than
 * imported (src/structure/env.ts): its renderer factory (the fast GPU, a lost
 * context taken back: src/render/webgl-renderer.ts) and the gesture rules its
 * Launch and Orbit viewers share (src/render/gestures.ts).
 */
export interface ViewerGl {
  createRenderer(options: { canvas: HTMLCanvasElement; antialias: boolean }): THREE.WebGLRenderer;
  /** the event is a camera gesture on `surface`, not one for a control or a page under it */
  isCameraInput(event: Event, surface: HTMLElement): boolean;
  /** a wheel event as a zoom factor, or null when it is the browser's own (pinch-zoom of the page) */
  wheelZoom(event: WheelEvent, height: number): number | null;
}

export interface ViewerOptions {
  gl: ViewerGl;
  /** a press that did not move: the part under it, or null for empty space */
  onPick?: (item: number | null) => void;
  /** the camera moved by the user's hand (to stop a guided view from fighting it) */
  onCameraInput?: () => void;
  /** a frame was drawn: what is laid over the view (labels, markers, the scale) follows it */
  onFrame?: () => void;
  /** the pointer rests over a part (a mouse only), or over none */
  onHover?: (item: number | null, clientX: number, clientY: number) => void;
  /**
   * A drag began on a part (one pointer, no Shift): `true` takes the drag for
   * the part — the view then stays still and `onDrag` follows the pointer
   * until `onDragEnd`; anything else leaves the drag to the camera.
   */
  onDragStart?: (item: number, clientX: number, clientY: number) => boolean;
  /** the pointer while a part is dragged, and how far that is from where the drag began, as a move in the model's frame, m (in the plane of the view, at the part's depth) */
  onDrag?: (clientX: number, clientY: number, move: readonly [number, number, number]) => void;
  /** the drag ended: `dropped` when the pointer let go, false when it was taken away (a second finger, the pointer lost) */
  onDragEnd?: (clientX: number, clientY: number, dropped: boolean) => void;
  reducedMotion?: () => boolean;
  /** colours for the kinds of part and the certainty levels, CSS strings */
  categoryColors: readonly string[];
  certaintyColors: readonly string[];
  accent: string;
  related: string;
  /** the flat tint of a faint outline, and of a lit target */
  outline: string;
  target: string;
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

// `through`: the solid pass leaves out what is seen through, and the blended pass draws only that. Flag 4 (selected):
// its own colours still read, under a light tint and a bright rim. (Said here, not in the string: the string is shipped.)
const FRAGMENT = /* glsl */ `
uniform int colorMode;
uniform int pass;
uniform vec3 categoryColors[6];
uniform vec3 certaintyColors[4];
uniform vec3 paintColors[${PAINT_SLOTS}];
uniform vec3 accent;
uniform vec3 relatedColor;
uniform vec3 outlineColor;
uniform vec3 targetColor;
uniform float roughness;
uniform float metalness;
varying vec3 vNormalV;
varying vec3 vPosV;
varying vec3 vTint;
varying vec4 vState;
void main() {
  int f = int(vState.r * 255.0 + 0.5);
  if ((f & 1) != 0) discard;
  bool through = (f & (2 | 32)) != 0;
  if (through != (pass == 1)) discard;
  int paint = int(vState.a * 255.0 + 0.5);
  vec3 base;
  if (paint > 0) base = paintColors[paint - 1];
  else if (colorMode == 1) base = categoryColors[int(vState.g * 255.0 + 0.5)];
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
  float rim = pow(1.0 - max(dot(n, v), 0.0), 2.5);
  if ((f & 16) != 0) col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))), 0.75) * 0.4;
  if ((f & 8) != 0) col = mix(col, relatedColor, 0.17) + relatedColor * rim * 0.3;
  if ((f & 4) != 0) col = mix(col, accent, 0.26) + accent * (0.08 + rim * 0.9);
  float alpha = 1.0;
  if ((f & 32) != 0) { col = mix(col, outlineColor, 0.72) + outlineColor * rim * 0.5; alpha = 0.16 + rim * 0.3; }
  else if ((f & 2) != 0) alpha = 0.22 + rim * 0.3;
  if ((f & 64) != 0) { col = mix(col, targetColor, 0.6) + targetColor * (0.12 + rim * 0.6); alpha = max(alpha, 0.5); }
  gl_FragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2)), alpha);
}`;

interface Pointer { x: number; y: number }

export class StructureViewer {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
  private readonly root = new THREE.Group();
  private readonly units = new Map<string, THREE.Group>();
  /** each mesh twice: `mesh` in the solid pass, `through` in the blended one (shown only while one of its parts is seen through) */
  private readonly meshes: { mesh: THREE.Mesh; through: THREE.Mesh; layer: string; unit: string; items: Uint16Array; shown: boolean }[] = [];
  private readonly materials = new Map<string, THREE.ShaderMaterial>();
  /** where each assembly is on its way to, while it moves there */
  private readonly unitTweens = new Map<string, { fromP: THREE.Vector3; fromQ: THREE.Quaternion; toP: THREE.Vector3; toQ: THREE.Quaternion; start: number; ms: number }>();
  /** where each assembly is asked to stand (its matrix once any move is over) */
  private readonly unitTargets = new Map<string, THREE.Matrix4>();
  private hoverTimer = 0;
  private lastHover: number | null = null;
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
  /** a part being dragged: metres of the model to a pixel of the page at its depth, and the view's right and up there */
  private dragging: { mpp: number; right: THREE.Vector3; up: THREE.Vector3 } | null = null;
  private pinch = 0;
  private frame = 0;
  private dirty = true;
  private active = false;
  private readonly resizer: ResizeObserver;
  private readonly raycaster = new THREE.Raycaster();
  private readonly off: (() => void)[] = [];
  private homeView = { t: new THREE.Vector3(), az: 0.8, el: 0.25, dist: 10 };
  private homeBox: THREE.Box3 | null = null;
  private homeMargin = 1.15;

  constructor(readonly canvas: HTMLCanvasElement, private readonly options: ViewerOptions) {
    this.renderer = options.gl.createRenderer({ canvas, antialias: true });
    this.renderer.setClearColor(new THREE.Color(options.background), 1);
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.stateTexture = this.makeStateTexture(1);
    const colors = (list: readonly string[], n: number) => Array.from({ length: n }, (_, i) => new THREE.Color(list[i] ?? '#888888'));
    this.shared = {
      itemState: { value: this.stateTexture },
      colorMode: { value: 0 },
      categoryColors: { value: colors(options.categoryColors, 6) },
      certaintyColors: { value: colors(options.certaintyColors, 4) },
      paintColors: { value: colors([], PAINT_SLOTS) },
      accent: { value: new THREE.Color(options.accent) },
      relatedColor: { value: new THREE.Color(options.related) },
      outlineColor: { value: new THREE.Color(options.outline) },
      targetColor: { value: new THREE.Color(options.target) },
    };
    this.scene.add(this.root);
    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      canvas.addEventListener(type, fn as EventListener, opts);
      this.off.push(() => canvas.removeEventListener(type, fn as EventListener, opts));
    };
    on('pointerdown', (e) => this.onDown(e));
    on('pointermove', (e) => { this.onMove(e); this.hover(e); });
    on('pointerleave', () => this.endHover());
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

  private material(roughness: number, metalness: number, pass: 0 | 1): THREE.ShaderMaterial {
    const key = `${roughness}|${metalness}|${pass}`;
    let m = this.materials.get(key);
    if (!m) {
      m = new THREE.ShaderMaterial({
        vertexShader: VERTEX, fragmentShader: FRAGMENT, side: THREE.DoubleSide,
        uniforms: { ...this.shared, roughness: { value: roughness }, metalness: { value: metalness }, pass: { value: pass } },
        // the blended pass: over the solid one, and writing no depth, so what is behind a see-through part still shows
        ...(pass === 1 ? { transparent: true, depthWrite: false } : {}),
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
      const mesh = new THREE.Mesh(m.geometry, this.material(m.roughness, m.metalness, 0));
      mesh.name = `${m.unit}:${m.layer}`;
      mesh.frustumCulled = true;
      const through = new THREE.Mesh(m.geometry, this.material(m.roughness, m.metalness, 1));
      through.name = `${mesh.name}:through`;
      through.renderOrder = 1;
      through.visible = false;
      group.add(mesh, through);
      const pos = m.geometry.getAttribute('position') as THREE.BufferAttribute;
      const item = m.geometry.getAttribute('item') as THREE.BufferAttribute;
      const mine = new Set<number>();
      const b = this.boxes;
      for (let v = 0; v < pos.count; v++) {
        const i = item.getX(v);
        mine.add(i);
        if (i >= this.itemCount) continue;
        const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v), o = i * 6;
        if (x < b[o]) b[o] = x; if (y < b[o + 1]) b[o + 1] = y; if (z < b[o + 2]) b[o + 2] = z;
        if (x > b[o + 3]) b[o + 3] = x; if (y > b[o + 4]) b[o + 4] = y; if (z > b[o + 5]) b[o + 5] = z;
      }
      this.meshes.push({ mesh, through, layer: m.layer, unit: m.unit, items: Uint16Array.from(mine), shown: true });
    }
    this.syncPasses();
    this.requestRender();
  }

  /** Which of a mesh's two passes have anything to draw: the blended one only while a part of the mesh is seen through, the solid one unless all are. */
  private syncPasses(): void {
    const through = FLAG.ghost | FLAG.faint, gone = FLAG.hidden | through;
    for (const m of this.meshes) {
      let any = false, solid = false;
      for (const i of m.items) {
        const f = this.state[i * 4];
        if ((f & FLAG.hidden) === 0 && (f & through) !== 0) any = true;
        if ((f & gone) === 0) solid = true;
        if (any && solid) break;
      }
      m.mesh.visible = m.shown && solid;
      m.through.visible = m.shown && any;
    }
  }

  /** The layers drawn now. */
  layers(): Set<string> { return new Set(this.meshes.map((m) => m.layer)); }

  /** Show or hide a whole layer's meshes (it stays loaded). */
  setLayerVisible(layer: string, visible: boolean): void {
    let changed = false;
    for (const m of this.meshes) if (m.layer === layer && m.shown !== visible) { m.shown = visible; changed = true; }
    if (!changed) return;
    this.syncPasses();
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
    this.unitTweens.clear();
    this.unitTargets.clear();
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

  /**
   * Place an assembly (its matrix in the model's frame) and show or hide it.
   * `animate`: it moves there over a moment (not with reduced motion, and
   * not when it was hidden: it appears in place).
   */
  setUnit(unit: string, matrix: THREE.Matrix4, visible = true, animate = false): void {
    const g = this.units.get(unit);
    if (!g) return;
    g.matrixAutoUpdate = false;
    const target = this.unitTargets.get(unit);
    if (target?.equals(matrix) && g.visible === visible) return;
    const wasVisible = g.visible;
    this.unitTargets.set(unit, matrix.clone());
    g.visible = visible;
    if (animate && visible && wasVisible && !this.options.reducedMotion?.()) {
      const fromP = new THREE.Vector3(), fromQ = new THREE.Quaternion(), toP = new THREE.Vector3(), toQ = new THREE.Quaternion(), one = new THREE.Vector3();
      g.matrix.decompose(fromP, fromQ, one);
      matrix.decompose(toP, toQ, one);
      this.unitTweens.set(unit, { fromP, fromQ, toP, toQ, start: performance.now(), ms: 380 });
    } else {
      this.unitTweens.delete(unit);
      g.matrix.copy(matrix);
      g.matrixWorldNeedsUpdate = true;
    }
    this.requestRender();
  }

  /** How far each assembly is asked to stand from where the reference puts it: its translation, m, and rotation, rad. */
  unitOffsets(): Map<string, { move: number; turn: number; visible: boolean }> {
    const out = new Map<string, { move: number; turn: number; visible: boolean }>();
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    for (const [u, g] of this.units) {
      (this.unitTargets.get(u) ?? g.matrix).decompose(p, q, s);
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
    this.upload();
    this.syncPasses();
  }

  private upload(): void {
    (this.stateTexture.image.data as Uint8Array).set(this.state.subarray(0, Math.min(this.state.length, this.stateTexture.image.data!.length)));
    this.stateTexture.needsUpdate = true;
    this.requestRender();
  }

  /**
   * Paint parts in one of `colors` (at most `PAINT_SLOTS`): `paintOf(i)` is
   * the colour's place in the list, or −1 for the part's own colour. Paint
   * goes over the colour view (a circuit by what flows in it, a subsystem,
   * a changed part).
   */
  setPaint(colors: readonly string[], paintOf: (item: number) => number): void {
    const list = this.shared.paintColors.value as THREE.Color[];
    colors.slice(0, PAINT_SLOTS).forEach((c, k) => list[k].set(c));
    let changed = false;
    for (let i = 0; i < this.itemCount; i++) {
      const k = paintOf(i);
      const v = k >= 0 && k < PAINT_SLOTS ? k + 1 : 0;
      if (this.state[i * 4 + 3] !== v) { this.state[i * 4 + 3] = v; changed = true; }
    }
    if (changed) this.upload(); else this.requestRender();
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

  /**
   * The distance from which `box` just fits the view's own shape when looked
   * at from azimuth `az` and elevation `el`, times `margin`: each of its
   * corners inside the view's height and width (a tall thin box in a wide
   * view is fitted by its height, not by the sphere round it).
   */
  private fitDistance(box: THREE.Box3, az: number, el: number, margin: number): number {
    const c = Math.cos(el);
    const back = new THREE.Vector3(c * Math.sin(az), Math.sin(el), c * Math.cos(az)); // from the target to the eye
    const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
    const up = new THREE.Vector3().crossVectors(back, right);
    const tanY = Math.tan((this.camera.fov * Math.PI) / 360), tanX = tanY * Math.max(0.2, this.camera.aspect);
    const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    let dist = 1e-3;
    const p = new THREE.Vector3();
    for (let k = 0; k < 8; k++) {
      p.set(k & 1 ? half.x : -half.x, k & 2 ? half.y : -half.y, k & 4 ? half.z : -half.z);
      const depth = p.dot(back);
      dist = Math.max(dist, depth + (Math.abs(p.dot(up)) * margin) / tanY, depth + (Math.abs(p.dot(right)) * margin) / tanX);
    }
    return Math.max(dist, half.length() * 0.2);
  }

  /** Turn about `box`'s centre and zoom so it fills the view with room around it (`margin` × its size), keeping the angle, or from `from`. */
  frameBox(box: THREE.Box3, margin = 1.35, animate = true, from?: { az?: number; el?: number }): void {
    const az = from?.az ?? this.az, el = from?.el ?? this.el;
    this.goTo({ t: box.getCenter(new THREE.Vector3()), az, el, dist: this.fitDistance(box, az, el, margin) }, animate);
  }

  /** How much of the model one CSS pixel covers at the target's distance, m. */
  metresPerPixel(): number {
    return (2 * this.dist * Math.tan((this.camera.fov * Math.PI) / 360)) / Math.max(1, this.canvas.clientHeight);
  }

  /**
   * The view a model opens with, and the one "home" goes back to: the box's
   * height and its width across both fitting the view (a rocket is tall and
   * thin, so fitting its bounding sphere would leave it small).
   */
  setHome(box: THREE.Box3, az = 0.8, el = 0.18, margin = 1.15): void {
    this.homeBox = box.clone();
    this.homeMargin = margin;
    this.homeView = { t: box.getCenter(new THREE.Vector3()), az, el, dist: this.fitDistance(box, az, el, margin) };
  }

  home(animate = true): void {
    // fitted again to the view's shape now: it may have changed since the model opened (a turned phone, a resized window)
    if (this.homeBox) this.homeView.dist = this.fitDistance(this.homeBox, this.homeView.az, this.homeView.el, this.homeMargin);
    this.goTo({ ...this.homeView, t: this.homeView.t.clone() }, animate);
  }

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

  /**
   * The part under a point of the page (client px); null for none. Parts in
   * any of the states `skip` are passed through: by default the hidden and
   * the seen-through, so a press reaches what stands behind a see-through
   * wall. A faint outline or a lit target is picked (a place can be pressed).
   */
  pick(clientX: number, clientY: number, skip: number = FLAG.hidden | FLAG.ghost): number | null {
    return this.hit(clientX, clientY, skip)?.item ?? null;
  }

  /** The part under a point of the page, and where on it, in the model's frame. */
  private hit(clientX: number, clientY: number, skip: number = FLAG.hidden | FLAG.ghost): { item: number; point: THREE.Vector3 } | null {
    const r = this.canvas.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return null;
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.updateCamera();
    this.root.updateMatrixWorld(true);
    this.raycaster.setFromCamera(ndc, this.camera);
    // every shown mesh, whichever of its two passes draws it (they share one geometry)
    const targets = this.meshes.filter((m) => m.shown && this.units.get(m.unit)?.visible).map((m) => m.mesh);
    for (const hit of this.raycaster.intersectObjects(targets, false)) {
      const geometry = (hit.object as THREE.Mesh).geometry;
      if (!hit.face) continue;
      const item = (geometry.getAttribute('item') as THREE.BufferAttribute).getX(hit.face.a);
      if (this.flagsOf(item) & (FLAG.hidden | skip)) continue;
      return { item, point: hit.point.clone() };
    }
    return null;
  }

  /** The pointer resting over the view (a mouse, no button down): say what is under it, a moment after it stops. */
  private hover(e: PointerEvent): void {
    if (!this.options.onHover || e.pointerType !== 'mouse' || e.buttons !== 0 || this.pointers.size) return;
    clearTimeout(this.hoverTimer);
    const { clientX, clientY } = e;
    this.hoverTimer = window.setTimeout(() => {
      const item = this.pick(clientX, clientY);
      if (item === this.lastHover && item === null) return;
      this.lastHover = item;
      this.options.onHover?.(item, clientX, clientY);
    }, 90);
  }

  private endHover(): void {
    clearTimeout(this.hoverTimer);
    if (this.lastHover !== null) { this.lastHover = null; this.options.onHover?.(null, 0, 0); }
  }

  // ─── input ───────────────────────────────────────────────────────────────

  private spread(): number {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private onDown(e: PointerEvent): void {
    if (!this.options.gl.isCameraInput(e, this.canvas)) return;
    this.endHover();
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) this.press = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    else {
      // a second finger: a part being dragged is let go of, and the two fingers move the view
      if (this.dragging) { this.dragging = null; this.options.onDragEnd?.(e.clientX, e.clientY, false); }
      this.press = null;
      this.pinch = this.spread();
    }
  }

  /** A drag that has just begun: offered to whoever wants it for the part under where it began. */
  private beginDrag(e: PointerEvent): void {
    const press = this.press;
    if (!press || !this.options.onDragStart || e.shiftKey || (e.buttons & 2) !== 0) return;
    const hit = this.hit(press.x, press.y);
    if (!hit || !this.options.onDragStart(hit.item, press.x, press.y)) return;
    // how much of the model a pixel covers at the part's depth, and the view's own right and up
    const forward = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    right.setFromMatrixColumn(this.camera.matrixWorld, 0);
    up.setFromMatrixColumn(this.camera.matrixWorld, 1);
    const depth = Math.max(1e-6, hit.point.sub(this.camera.position).dot(forward));
    const mpp = (2 * depth * Math.tan((this.camera.fov * Math.PI) / 360)) / Math.max(1, this.canvas.clientHeight);
    this.dragging = { mpp, right, up };
  }

  private onMove(e: PointerEvent): void {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    const h = Math.max(1, this.canvas.clientHeight);
    if (this.press && !this.press.moved && Math.hypot(e.clientX - this.press.x, e.clientY - this.press.y) > 6) {
      this.press.moved = true;
      if (this.pointers.size === 1) this.beginDrag(e);
    }
    if (this.dragging && this.press) {
      const d = this.dragging, mx = (e.clientX - this.press.x) * d.mpp, my = -(e.clientY - this.press.y) * d.mpp;
      this.options.onDrag?.(e.clientX, e.clientY, [d.right.x * mx + d.up.x * my, d.right.y * mx + d.up.y * my, d.right.z * mx + d.up.z * my]);
      return;
    }
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
    if (this.dragging) {
      this.dragging = null;
      this.options.onDragEnd?.(e.clientX, e.clientY, e.type === 'pointerup');
      if (this.pointers.size === 0) this.press = null;
      return;
    }
    if (e.type === 'pointerup' && press && !press.moved && this.pointers.size === 0 && performance.now() - press.t < 700) {
      this.options.onPick?.(this.pick(e.clientX, e.clientY));
    }
    if (this.pointers.size === 0) this.press = null;
  }

  private onWheel(e: WheelEvent): void {
    if (!this.options.gl.isCameraInput(e, this.canvas)) return;
    const f = this.options.gl.wheelZoom(e, this.canvas.clientHeight);
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
      // Resizing empties the drawing buffer. It is drawn into again here, before the browser paints (drawn a frame
      // later, the picture would be empty for a frame), and once more on the next frame: a compositor that had already
      // taken this frame's buffer would keep the empty one until something else changed the picture.
      if (this.active) this.draw();
      this.requestRender();
    }
  }

  /** Draw the picture as it is now. */
  private draw(): void {
    this.dirty = false;
    const t0 = performance.now();
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
    this.timing.frames++;
    this.timing.last = performance.now() - t0;
    this.options.onFrame?.();
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
    if (this.unitTweens.size) {
      const p = new THREE.Vector3(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
      for (const [unit, t] of this.unitTweens) {
        const g = this.units.get(unit);
        const k = Math.min(1, (now - t.start) / t.ms);
        const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        if (g) {
          g.matrix.compose(p.lerpVectors(t.fromP, t.toP, e), q.slerpQuaternions(t.fromQ, t.toQ, e), one);
          g.matrixWorldNeedsUpdate = true;
        }
        if (k >= 1 || !g) {
          this.unitTweens.delete(unit);
          const target = this.unitTargets.get(unit);
          if (g && target) { g.matrix.copy(target); g.matrixWorldNeedsUpdate = true; }
        }
      }
      this.dirty = true;
    }
    if (this.dirty) this.draw();
    if (this.tween || this.unitTweens.size) this.frame = requestAnimationFrame((t) => this.tick(t));
  }

  /** Nothing is on its way anywhere: the camera and every assembly stand where they were asked to. */
  settled(): boolean { return !this.tween && this.unitTweens.size === 0; }

  /** What is drawn: triangles and draw calls of the last frame. */
  stats(): { triangles: number; calls: number } {
    return { triangles: this.renderer.info.render.triangles, calls: this.renderer.info.render.calls };
  }

  /** Free everything, the renderer and its context included (the section's own end). */
  dispose(): void {
    clearTimeout(this.hoverTimer);
    this.setActive(false);
    this.clear();
    this.stateTexture.dispose();
    for (const f of this.off) f();
    this.off.length = 0;
    this.resizer.disconnect();
    this.renderer.dispose();
  }
}
