/**
 * The first lateral bending mode of the attached stack (roadmap P05), from a
 * free-free Euler–Bernoulli beam built on the six-DOF mass model itself.
 *
 * Mass: every component of the mass model is a uniform line mass along the body
 * axis (a cylinder, a shell or a grain annulus all satisfy L² = 12(I_t − I_x/2)/m,
 * which gives each one's length from its inertia). Stiffness: the stage and
 * fairing shells, EI = E π r³ t, with the wall thickness t of a shell carrying
 * the component's whole structural mass at the specific modulus of aluminium
 * alloys and steel (E/ρ ≈ 26 MN m/kg; they differ by under 5 %). Strap-ons add
 * their own EI (parallel beams, no parallel-axis term); a payload is stiff;
 * a gap in the structure (an adapter) takes its neighbour's EI. These are
 * estimates (E), not a vehicle's modal survey.
 *
 * Solved on 40 cubic (Hermite) elements with consistent mass by inverse
 * iteration, the two rigid-body modes deflated. The mode is scaled so that its
 * largest deflection is 1 and the aft end moves in +w.
 */
import type { MassComponent } from './mass';

/** Young's modulus / density of the shells, m²/s² (70 GPa, 2 700 kg/m³). */
export const SHELL_SPECIFIC_MODULUS = 70e9 / 2700;
/** Density of the shells, kg/m³ (for wall thickness and stress). */
export const SHELL_DENSITY = 2700;
/** A payload is many times stiffer than the shells around it. */
const PAYLOAD_STIFFNESS_FACTOR = 10;
export const BEAM_ELEMENTS = 40;

export interface BeamModel {
  /** node stations along body x, aft to forward */
  x: Float64Array;
  elementLength: number;
  /** line mass of each element, kg/m (for loads) */
  lineMass: Float64Array;
  /** bending stiffness of each element, N m² */
  stiffness: Float64Array;
  /** load-bearing wall area and section modulus of each element; 0 where no shell */
  wallArea: Float64Array;
  sectionModulus: Float64Array;
  /** consistent mass and stiffness matrices, dense, (2n)², row-major */
  mass: Float64Array;
  stiff: Float64Array;
  dof: number;
}

export interface BendingMode {
  frequencyRadS: number;
  generalizedMassKg: number;
  beam: BeamModel;
  /** nodal deflection and slope of the mode */
  w: Float64Array;
  theta: Float64Array;
  /**
   * ∫ m_fwd(x) φ′(x)² dx, kg·m/m: times the axial acceleration it is the
   * generalised softening of the axial compression each section carries (the
   * mass forward of it, accelerated), the geometric stiffness of the mode.
   */
  compressionIntegral: number;
}

interface Segment { from: number; to: number; density: number }
/** A component as a uniform segment along the body axis: [from, to], kg/m. */
export function lineSegment(part: MassComponent, massKg = part.mass): Segment {
  const I = part.inertiaAtCenter, transverse = (I[4] + I[8]) / 2;
  const length = Math.sqrt(Math.max(0, 12 * (transverse - I[0] / 2) / part.mass));
  const half = Math.max(length, 1e-3) / 2;
  return { from: part.centerBody.x - half, to: part.centerBody.x + half, density: massKg / (2 * half) };
}

// Hermite shape functions of a cubic beam element on ξ ∈ [0, 1], length l.
function shape(xi: number, l: number): [number, number, number, number] {
  const x2 = xi * xi, x3 = x2 * xi;
  return [1 - 3 * x2 + 2 * x3, l * (xi - 2 * x2 + x3), 3 * x2 - 2 * x3, l * (-x2 + x3)];
}
function shapeSlope(xi: number, l: number): [number, number, number, number] {
  const x2 = xi * xi;
  return [(-6 * xi + 6 * x2) / l, 1 - 4 * xi + 3 * x2, (6 * xi - 6 * x2) / l, -2 * xi + 3 * x2];
}
function shapeCurvature(xi: number, l: number): [number, number, number, number] {
  return [(-6 + 12 * xi) / (l * l), (-4 + 6 * xi) / l, (6 - 12 * xi) / (l * l), (-2 + 6 * xi) / l];
}
const GAUSS = [[-0.8611363115940526, 0.3478548451374538], [-0.3399810435848563, 0.6521451548625461],
  [0.3399810435848563, 0.6521451548625461], [0.8611363115940526, 0.3478548451374538]] as const;

/**
 * The beam of an attached stack. `liquidScale` removes the part of a liquid that
 * sloshes on its own (by component id: the fraction of its mass that stays).
 */
export function buildBeam(components: readonly MassComponent[], liquidScale: ReadonlyMap<string, number> = new Map()): BeamModel {
  const segments: Segment[] = [];
  const shells: { from: number; to: number; ei: number; area: number; modulus: number }[] = [];
  const payloads: Segment[] = [];
  for (const part of components) {
    if (!(part.mass > 0)) continue;
    const segment = lineSegment(part, part.mass * (liquidScale.get(part.id) ?? 1));
    segments.push(segment);
    if (part.kind === 'structure' || part.kind === 'fairing') {
      const radius = Math.sqrt(part.inertiaAtCenter[0] / part.mass), length = segment.to - segment.from;
      shells.push({ from: segment.from, to: segment.to, ei: SHELL_SPECIFIC_MODULUS * part.mass * radius ** 2 / (2 * length),
        area: part.mass / (SHELL_DENSITY * length), modulus: part.mass * radius / (2 * SHELL_DENSITY * length) });
    } else if (part.kind === 'payload') payloads.push(segment);
  }
  if (!segments.length) throw new RangeError('A beam needs mass');
  const x0 = Math.min(...segments.map((s) => s.from)), x1 = Math.max(...segments.map((s) => s.to));
  const n = BEAM_ELEMENTS, l = (x1 - x0) / n, dof = 2 * (n + 1);
  const x = new Float64Array(n + 1).map((_, i) => x0 + i * l);
  const lineMass = new Float64Array(n), stiffness = new Float64Array(n), wallArea = new Float64Array(n), sectionModulus = new Float64Array(n);
  const mass = new Float64Array(dof * dof), stiff = new Float64Array(dof * dof);
  let maxShell = 0;
  for (let e = 0; e < n; e++) {
    const mid = x0 + (e + 0.5) * l;
    for (const shell of shells) if (mid >= shell.from && mid <= shell.to) {
      stiffness[e] += shell.ei; wallArea[e] += shell.area; sectionModulus[e] += shell.modulus;
    }
    maxShell = Math.max(maxShell, stiffness[e]);
  }
  for (let e = 0; e < n; e++) {
    const mid = x0 + (e + 0.5) * l;
    if (payloads.some((p) => mid >= p.from && mid <= p.to)) stiffness[e] += PAYLOAD_STIFFNESS_FACTOR * maxShell;
  }
  // Gaps between shells (an adapter, the payload gap) take the nearest EI.
  for (let e = 0; e < n; e++) if (!(stiffness[e] > 0)) {
    for (let d = 1; d < n; d++) {
      const near = [e - d, e + d].filter((i) => i >= 0 && i < n && stiffness[i] > 0);
      if (near.length) { stiffness[e] = Math.max(...near.map((i) => stiffness[i])); break; }
    }
    if (!(stiffness[e] > 0)) stiffness[e] = 1e9;
  }
  for (let e = 0; e < n; e++) {
    const a = x[e], b = x[e + 1], base = 2 * e;
    // Consistent mass: ∫ μ NᵀN over each overlap, four-point Gauss (exact for cubics × uniform μ).
    const local = new Float64Array(16);
    for (const segment of segments) {
      const from = Math.max(a, segment.from), to = Math.min(b, segment.to);
      if (!(to > from)) continue;
      lineMass[e] += segment.density * (to - from) / l;
      for (const [g, weight] of GAUSS) {
        const at = (from + to) / 2 + g * (to - from) / 2;
        const N = shape((at - a) / l, l), f = weight * (to - from) / 2 * segment.density;
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) local[4 * i + j] += f * N[i] * N[j];
      }
    }
    const EI = stiffness[e], k = EI / l ** 3;
    const ke = [12, 6 * l, -12, 6 * l, 6 * l, 4 * l * l, -6 * l, 2 * l * l, -12, -6 * l, 12, -6 * l, 6 * l, 2 * l * l, -6 * l, 4 * l * l];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      mass[(base + i) * dof + base + j] += local[4 * i + j];
      stiff[(base + i) * dof + base + j] += k * ke[4 * i + j];
    }
  }
  return { x, elementLength: l, lineMass, stiffness, wallArea, sectionModulus, mass, stiff, dof };
}

/** Cubic beam elements couple a node's two degrees of freedom with the next node's: half-bandwidth 3. */
const BAND = 3;
const matVec = (a: Float64Array, v: Float64Array, n: number): Float64Array => {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = Math.max(0, i - BAND), top = Math.min(n - 1, i + BAND); j <= top; j++) s += a[i * n + j] * v[j];
    out[i] = s;
  }
  return out;
};
const dotN = (a: Float64Array, b: Float64Array): number => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

/** Cholesky factor (lower, row-major) of a banded SPD matrix; the factor keeps the band. */
function choleskyDense(a: Float64Array, n: number): Float64Array {
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = Math.max(0, i - BAND); j <= i; j++) {
    let s = a[i * n + j];
    for (let k = Math.max(0, i - BAND); k < j; k++) s -= L[i * n + k] * L[j * n + k];
    if (i === j) {
      if (!(s > 0)) throw new RangeError('Beam matrix is not positive definite');
      L[i * n + i] = Math.sqrt(s);
    } else L[i * n + j] = s / L[j * n + j];
  }
  return L;
}
function choleskySolve(L: Float64Array, b: Float64Array, n: number): Float64Array {
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = b[i]; for (let k = Math.max(0, i - BAND); k < i; k++) s -= L[i * n + k] * y[k]; y[i] = s / L[i * n + i]; }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1, top = Math.min(n - 1, i + BAND); k <= top; k++) s -= L[k * n + i] * x[k]; x[i] = s / L[i * n + i]; }
  return x;
}

/**
 * The lowest elastic mode of a free-free beam. `guess`, the previous mode of
 * a slowly changing beam, only starts the iteration closer.
 */
export function firstBendingMode(beam: BeamModel, guess?: BendingMode): BendingMode {
  const { dof, mass, stiff, x } = beam, nodes = x.length;
  const length = x[nodes - 1] - x[0];
  // Rigid translation and rotation, M-orthonormalised.
  const translation = new Float64Array(dof), rotation = new Float64Array(dof);
  for (let i = 0; i < nodes; i++) { translation[2 * i] = 1; rotation[2 * i] = x[i] - x[0]; rotation[2 * i + 1] = 1; }
  const rigid: Float64Array[] = [];
  for (const mode of [translation, rotation]) {
    for (const r of rigid) { const c = dotN(r, matVec(mass, mode, dof)); for (let i = 0; i < dof; i++) mode[i] -= c * r[i]; }
    const m = Math.sqrt(dotN(mode, matVec(mass, mode, dof)));
    for (let i = 0; i < dof; i++) mode[i] /= m;
    rigid.push(mode);
  }
  let traceK = 0, traceM = 0;
  for (let i = 0; i < dof; i++) { traceK += stiff[i * dof + i]; traceM += mass[i * dof + i]; }
  const shift = 1e-6 * traceK / traceM;
  const shifted = new Float64Array(dof * dof);
  for (let i = 0; i < dof * dof; i++) shifted[i] = stiff[i] + shift * mass[i];
  const L = choleskyDense(shifted, dof);
  let v: Float64Array = new Float64Array(dof);
  if (guess && guess.w.length === nodes) for (let i = 0; i < nodes; i++) { v[2 * i] = guess.w[i]; v[2 * i + 1] = guess.theta[i]; }
  else for (let i = 0; i < nodes; i++) { const u = 2 * (x[i] - x[0]) / length - 1; v[2 * i] = u * u - 1 / 3; v[2 * i + 1] = 4 * u / length; }
  let lambda = 0;
  for (let iteration = 0; iteration < 200; iteration++) {
    for (const r of rigid) { const c = dotN(r, matVec(mass, v, dof)); for (let i = 0; i < dof; i++) v[i] -= c * r[i]; }
    const next = choleskySolve(L, matVec(mass, v, dof), dof);
    const norm = Math.sqrt(dotN(next, matVec(mass, next, dof)));
    for (let i = 0; i < dof; i++) next[i] /= norm;
    const estimate = dotN(next, matVec(stiff, next, dof));
    v = next;
    if (iteration > 1 && Math.abs(estimate - lambda) <= 1e-13 * estimate) { lambda = estimate; break; }
    lambda = estimate;
  }
  for (const r of rigid) { const c = dotN(r, matVec(mass, v, dof)); for (let i = 0; i < dof; i++) v[i] -= c * r[i]; }
  let largest = 0;
  for (let i = 0; i < nodes; i++) largest = Math.max(largest, Math.abs(v[2 * i]));
  const sign = v[0] < 0 ? -1 : 1, scale = sign / largest;
  const w = new Float64Array(nodes), theta = new Float64Array(nodes);
  for (let i = 0; i < nodes; i++) { w[i] = v[2 * i] * scale; theta[i] = v[2 * i + 1] * scale; }
  const scaled = v.map((value) => value * scale);
  const mode: BendingMode = { frequencyRadS: Math.sqrt(dotN(scaled, matVec(stiff, scaled, dof)) / dotN(scaled, matVec(mass, scaled, dof))),
    generalizedMassKg: dotN(scaled, matVec(mass, scaled, dof)), beam, w, theta, compressionIntegral: 0 };
  // Mass forward of each station (line mass uniform within an element), then
  // ∫ m_fwd φ′² by four-point Gauss on each element.
  const n = nodes - 1, l = beam.elementLength;
  let forward = 0, integral = 0;
  for (let e = n - 1; e >= 0; e--) {
    const top = forward;
    for (const [g, weight] of GAUSS) {
      const xi = (g + 1) / 2, mFwd = top + beam.lineMass[e] * l * (1 - xi);
      const N = shapeSlope(xi, l), slope = N[0] * w[e] + N[1] * theta[e] + N[2] * w[e + 1] + N[3] * theta[e + 1];
      integral += weight * l / 2 * mFwd * slope * slope;
    }
    forward = top + beam.lineMass[e] * l;
  }
  mode.compressionIntegral = integral;
  return mode;
}

/** Where `station` falls: element index and local coordinate, clamped to the beam. */
function locate(mode: BendingMode, station: number): { e: number; xi: number; l: number } {
  const { x, elementLength: l } = mode.beam, n = x.length - 1;
  const u = Math.max(0, Math.min(n, (station - x[0]) / l));
  const e = Math.min(n - 1, Math.floor(u));
  return { e, xi: u - e, l };
}
const nodal = (mode: BendingMode, e: number): [number, number, number, number] => [mode.w[e], mode.theta[e], mode.w[e + 1], mode.theta[e + 1]];
/** Mode deflection φ(x), per unit modal coordinate. */
export function modeDeflection(mode: BendingMode, station: number): number {
  const { e, xi, l } = locate(mode, station), N = shape(xi, l), q = nodal(mode, e);
  return N[0] * q[0] + N[1] * q[1] + N[2] * q[2] + N[3] * q[3];
}
/** Mode slope φ′(x), 1/m. */
export function modeSlope(mode: BendingMode, station: number): number {
  const { e, xi, l } = locate(mode, station), N = shapeSlope(xi, l), q = nodal(mode, e);
  return N[0] * q[0] + N[1] * q[1] + N[2] * q[2] + N[3] * q[3];
}
/** Mode curvature φ″(x), 1/m². */
export function modeCurvature(mode: BendingMode, station: number): number {
  const { e, xi, l } = locate(mode, station), N = shapeCurvature(xi, l), q = nodal(mode, e);
  return N[0] * q[0] + N[1] * q[1] + N[2] * q[2] + N[3] * q[3];
}
