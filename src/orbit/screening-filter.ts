/**
 * The time filter of the close-approach screening (roadmap M01, P2.5): for a
 * pair of objects, the stretches of the window in which they can come within
 * the screening distance D of each other. Only those stretches are then
 * searched (src/orbit/conjunction.ts, `closeApproaches` with windows); a
 * satellite at 700 km is screened against 30 000 objects over three days in
 * about half a second on this build machine instead of some eighteen
 * (docs/VALIDATION.md §7).
 *
 * It is a time filter in the manner of Hoots, Crawford and Roehrich
 * (*Celestial Mechanics* 33, 1984): two objects can only meet near the line
 * where their orbital planes cross, and only when both are near the same end
 * of it at the same time. What makes it safe here is that it is written on
 * SGP4's own equations (Hoots and Roehrich, Spacetrack Report #3, 1980;
 * Vallado, Crawford, Hujsak and Kelso, AIAA 2006-6753; src/orbit/sgp4.ts),
 * the same model the search itself runs. The published filters, written on
 * other mean elements, reach zero misses only with pads fitted to a test
 * catalogue: Woodburn, Coppola and Stoner (AAS 09-372, 2009) use 30 km and
 * 10 s; Rivero, Bombardelli and Vazquez (arXiv 2309.02379) need 10.7 km for
 * the apogee–perigee test alone. Here the mean motion the filter follows is
 * SGP4's, drag included, and each periodic term SGP4 adds on top of it is
 * bounded from its own formula. Nothing is fitted.
 *
 * **What SGP4 does (near-Earth).** At t minutes from the epoch:
 *
 * - The secular and drag part (sgp4.ts, "the secular gravity and atmospheric
 *   drag"): the mean argument of latitude is
 *   λ(t) = M₀ + ω₀ + (Ṁ + ω̇)t + n₀·(t2cof t² + t3cof t³ + t⁴(t4cof + t5cof t)),
 *   exactly, because SGP4's drag terms δω and δM enter M and ω with opposite
 *   signs and cancel in the sum. The node is Ω(t) = Ω₀ + Ω̇t + nodecf t², the
 *   inclination i stays i₀, the semi-major axis is
 *   a(t) = (kₑ/n₀)^⅔ (1 − C₁t − D₂t² − D₃t³ − D₄t⁴)² and the eccentricity
 *   e(t) = e₀ − B*C₄t − B*C₅(sin M − sin M₀). (With a perigee under 220 km
 *   SGP4 keeps only C₁ and t2cof, and this does too.)
 * - The long-period part: axN = e cos ω, ayN = e sin ω + A₃₀/p₀ (A₃₀ being
 *   `aycof`, p₀ = a(1 − e²)), and U = λ + (xlcof/p₀)·axN.
 * - Kepler's equation in its equinoctial form, which turns U into the
 *   argument of latitude su: su − U is the true minus the mean anomaly for the
 *   eccentricity e_L = √(axN² + ayN²).
 * - The short-period part, with k₁ = J₂/(2p) and k₂ = J₂/(2p²) (p = a(1 − e_L²)):
 *   r = r_L(1 − 1.5k₂β con41) + ½k₁ x1mth2 cos 2su with r_L = a(1 − e_L cos E);
 *   su gains −¼k₂ x7thm1 sin 2su; the node gains 1.5k₂ cos i sin 2su and the
 *   inclination 1.5k₂ cos i sin i cos 2su.
 *
 * **The bounds** (`filterBounds`), each over the window and a margin either
 * side, and each read term by term from those formulas:
 *
 * - Radius: with a between a_min and a_max (the drag polynomial's range,
 *   found by interval arithmetic), e ≤ e_max = e₀ + |B*C₄|·|t|max + 2|B*C₅|,
 *   ê = e_max + |A₃₀|/p₀,min and k₁, k₂ taken at p_min = a_min(1 − ê²):
 *   a_min(1 − ê)(1 − 1.5k₂|con41|) − ½k₁ x1mth2 ≤ r ≤ a_max(1 + ê)(1 + 1.5k₂|con41|) + ½k₁ x1mth2.
 *   This is the apogee–perigee test the screening starts with (`radiusBand`,
 *   used by src/orbit/screening.ts): SGP4's radius, not the elements'
 *   perigee and apogee with a margin. A 30 km margin does not hold for an
 *   object that is coming down — SGP4 takes the fastest-decaying objects of a
 *   catalogue up to 346 km below their perigee within a week — and SGP4's
 *   bound does.
 * - Along the track: the angle of the object, seen in its mean plane from
 *   the mean node, differs from λ by at most
 *   Δu = |xlcof|·e_max/p₀,min (the long-period term) + max|ν − M| at ê (the
 *   equation of the centre, in closed form below) + ¼k₂|x7thm1| (the
 *   short-period term) + 1.5k₂ cos²i (the node's short-period swing, seen
 *   along the track: cos i times the swing).
 * - Out of the plane: δi = 1.5k₂ cos i sin i cos 2su and sin i·δΩ =
 *   1.5k₂ cos i sin i sin 2su tilt the osculating plane from the mean one by
 *   ε = 2 asin(½A√(1 + 1.5k₂|cos i|)), A = 1.5k₂|cos i| sin i — from the
 *   exact spherical identity sin²(γ/2) = sin²(δi/2) + sin i sin i′ sin²(δΩ/2).
 *
 * - The radius at one pass (`radiusOver`): the same formula with
 *   r_L = p_L/(1 + e_L cos ν), e_L cos ν = e cos(u − ω) + (A₃₀/p₀) sin u and u,
 *   the long-period argument of latitude, within Δu_L of λ (the first two
 *   terms of Δu). Over a pass of seconds u is known to a fraction of a
 *   degree, so the radius is known to a few kilometres, not over the whole
 *   orbit; a, e and ω are bounded over the pass by their drag polynomial,
 *   their drift and how fast ω can turn.
 *
 * Δu and ε are then taken 1.25 times, for rounding and the second-order
 * terms the derivation drops (of order ε², some 10⁻⁶ rad). The factor is
 * needed: both bounds are reached. In a one-off check of 2.8 million SGP4
 * states (the 28 000 near-Earth objects of the synthetic 30 000-object load,
 * at random times across a week; not part of the suite), the largest
 * along-track and tilt came to 0.999 and 1.000 of the unscaled bounds (0.80
 * of the scaled ones), and the bundled catalogue in the suite reaches 0.80
 * too. The radius bounds hold with no factor: in that check SGP4 came within
 * 0.06 km of the whole-orbit bound and 0.1 m of a pass's, never outside
 * (tests/screening-filter.test.ts holds the bundled catalogue to all of
 * them).
 *
 * **The windows** (`pairWindows`). Let ĥ be a mean plane's normal and n̂ the
 * direction of ĥ_p × ĥ_q, sin I = |ĥ_p × ĥ_q| (I the angle between the
 * planes). If |r_q − r_p| ≤ D then, since r_p lies within ε_p of p's mean
 * plane, |r_q·ĥ_p| ≤ D + r_p ε_p; and r_q, at the angle x_q from n̂ in its own
 * mean plane and within ε_q of it, has |r_q·ĥ_p| ≥ r_q(cos ε_q |sin x_q| sin I − ε_q).
 * So |sin x_q| ≤ σ_q = (D + r_max,p ε_p + r_max,q ε_q)/(r_min,q cos ε_q sin I),
 * and the same for p: each must be within asin σ (plus its Δu) of one end of
 * the node line. Both at the same end, too: were they at opposite ends,
 * they would be more than 90° apart, which the filter makes sure of
 * (asin σ_p + asin σ_q + ε_p + ε_q < 1.2 rad < π/2), and then farther
 * apart than D.
 *
 * The node line turns as the nodes regress. ĥ turns at sin i·|Ω̇|, so n̂
 * turns at no more than ω_h/sin I (ω_h = sin i_p|Ω̇_p| + sin i_q|Ω̇_q|), and
 * its angle in either plane changes at no more than ρ = ω_h/sin I + |Ω̇|. For
 * each pass of the primary through either end of the node line (found from
 * λ, the node line taken where it is at that pass), sin I is bounded below
 * over three quarters of a revolution either side by sin I − ω_h·¾P, and
 * g(t) = λ(t) − u_N(t) grows at no less than λ̇_min − ρ. A close approach at
 * t between two passes is within asin σ + Δu of one of them in g, so within
 * hw = (asin σ + Δu + ρ·|t_pass − t_geometry|)/(λ̇_min − ρ) of it in time.
 * The other object's pass through the same end nearest to it is found the
 * same way, and the window is where the two overlap, 2 s wider each side.
 * A window is then kept only if the two radii over it (`radiusOver`) can
 * come within D of each other — a necessary condition, since
 * |r_q − r_p| ≥ ||r_q| − |r_p||. The passes of the primary are checked to
 * follow one another every half revolution or so, so none is skipped.
 *
 * **What goes to the full search.** A pair is searched over the whole window
 * (the filter answers null) when either object is deep-space (SDP4: its
 * lunar–solar and resonance terms are not bounded here), when either has
 * e above 0.5, when SGP4's drag polynomial takes a to nothing within the
 * window (an object that re-enters), when the planes are within about 3° of
 * each other, when either object must be near the other's plane for so much
 * of its orbit that the ends of the node line cannot be told apart, or when
 * any check above fails. An object that is merely decaying keeps the filter:
 * its drag is in λ, a and e exactly as SGP4 has it.
 *
 * Everything inside is in SGP4's units — earth radii, minutes, radians;
 * the windows it gives are Julian dates. DOM-free;
 * tests/screening-filter.test.ts.
 */
import type { SkyObject } from './real-sky';
import { minutesSinceEpoch, type Satrec } from './sgp4';

const TWO_PI = 2 * Math.PI;
/** The bounds hold this far beyond each end of the window, minutes: two of the longest near-Earth revolutions (SGP4 hands 225 min and over to SDP4). */
const SPAN_MARGIN = 450;
/** The factor on Δu and ε, for rounding and the second-order terms. */
const SAFETY = 1.25;
/** Time added each side of each window, min (2 s). */
const PAD = 2 / 60;
/** Planes nearer than this (sin 3°) are searched whole: their node line is ill-defined. */
const SIN_COPLANAR = Math.sin((3 * Math.PI) / 180);
/** σ above which an object is near the other's plane for so much of its orbit that the filter gains nothing. */
const SIGMA_MAX = 0.9;
/** asin σ_p + asin σ_q + ε_p + ε_q under this (< π/2) keeps the two ends of the node line apart. */
const OPPOSITE_ENDS = 1.2;
/** The eccentricity above which the bounds are not used. */
const E_MAX = 0.5;

/** A polynomial's coefficients, lowest power first. */
type Poly = readonly number[];

const polyAt = (c: Poly, t: number): number => {
  let s = 0;
  for (let k = c.length - 1; k >= 0; k--) s = s * t + c[k];
  return s;
};

/**
 * The range of a polynomial over [a, b] by interval arithmetic (Horner's
 * scheme on intervals): an enclosure, never too narrow, widened by a part in
 * 10¹² for rounding.
 */
export function polyRange(c: Poly, a: number, b: number): [number, number] {
  let lo = 0, hi = 0;
  for (let k = c.length - 1; k >= 0; k--) {
    const p = [lo * a, lo * b, hi * a, hi * b];
    lo = Math.min(...p) + c[k];
    hi = Math.max(...p) + c[k];
  }
  const w = 1e-12 * Math.max(Math.abs(lo), Math.abs(hi));
  return [lo - w, hi + w];
}

/**
 * The largest |ν − M| (true minus mean anomaly, rad) for eccentricity e, in
 * closed form: it is reached where dν/dM = 1, that is where
 * (1 + e cos ν)² = (1 − e²)^{3/2}. It grows with e (∂ν/∂e at fixed M is
 * sin ν (2 + e cos ν)/(1 − e²) ≥ 0 on 0 ≤ ν ≤ π), so the value at a bound on e
 * bounds it for every smaller e.
 */
export function equationOfCentreMax(e: number): number {
  if (e <= 0) return 0;
  const nu = Math.acos(Math.max(-1, Math.min(1, (Math.pow(1 - e * e, 0.75) - 1) / e)));
  const E = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2));
  return nu - (E - e * Math.sin(E));
}

/** SGP4's mean argument of latitude λ(t) = M + ω, drag included, rad (t minutes from the epoch; near-Earth). */
export function meanArgumentOfLatitude(s: Satrec, t: number): number {
  return polyAt(lambdaPoly(s), t);
}

/** SGP4's mean node Ω(t), rad (near-Earth). */
export function meanNode(s: Satrec, t: number): number {
  return s.nodeo + s.nodedot * t + s.nodecf * t * t;
}

function lambdaPoly(s: Satrec): number[] {
  const n = s.no_unkozai;
  const c = [s.mo + s.argpo, s.mdot + s.argpdot, n * s.t2cof];
  if (s.isimp !== 1) c.push(n * s.t3cof, n * s.t4cof, n * s.t5cof);
  return c;
}

const derivative = (c: Poly): number[] => c.slice(1).map((x, k) => (k + 1) * x);

/** What the filter knows of one object over one screening window. */
export interface FilterBounds {
  sat: Satrec;
  /** false: every pair with it is searched whole; `why` says why */
  usable: boolean;
  why: string;
  /** the window, and the span every bound holds over (the window and SPAN_MARGIN either side), in minutes from this object's epoch */
  t0: number;
  t1: number;
  ta: number;
  tb: number;
  sini: number;
  cosi: number;
  /** λ(t)'s coefficients, and λ̇'s range over the span, rad/min */
  lam: number[];
  lamDot: number[];
  lamDotMin: number;
  lamDotMax: number;
  /** the largest |Ω̇| over the span, rad/min */
  nodeRate: number;
  /** SGP4's radius stays within [rMin, rMax], earth radii */
  rMin: number;
  rMax: number;
  /** the angle along the track, from the mean node in the mean plane, stays within du of λ, rad */
  du: number;
  /** the position stays within eps of the mean plane, rad */
  eps: number;
  /** for the radius at each pass (`radiusOver`): SGP4's drag polynomial on √a and its factor, the long-period argument of latitude's bound about λ (rad), how fast ω can turn (rad/min), and e's drift (1/min) and swing */
  tempa: number[];
  aK: number;
  duLong: number;
  argpRate: number;
  eRate: number;
  eSwing: number;
}

/** Why an object that SGP4 brings down within the span is not filtered. */
const COMES_DOWN = 'comes down within the window (drag takes a to nothing)';

interface Radial {
  tempa: number[];
  aK: number;
  amMin: number;
  eMax: number;
  p0Min: number;
  eHat: number;
  k1: number;
  k2: number;
  rMin: number;
  rMax: number;
}

/**
 * SGP4's radius over minutes `ta` to `tb` from the epoch, with what it is
 * worked out from (earth radii); or why it cannot be given: deep space, an
 * eccentricity at or above E_MAX, or a drag polynomial that takes a to nothing
 * (an object that comes down within the span).
 */
function radial(s: Satrec, ta: number, tb: number): Radial | string {
  if (s.method === 'd') return 'deep space (SDP4)';
  const tempa = s.isimp !== 1 ? [1, -s.cc1, -s.d2, -s.d3, -s.d4] : [1, -s.cc1];
  const [taLo, taHi] = polyRange(tempa, ta, tb);
  if (!(taLo > 0.5)) return COMES_DOWN;
  const aK = Math.pow(s.xke / s.no_unkozai, 2 / 3);
  const amMin = aK * taLo * taLo, amMax = aK * taHi * taHi;
  // e: SGP4's drag terms on it, and the J3 long-period shift of the eccentricity vector
  const T = Math.max(Math.abs(ta), Math.abs(tb));
  const eMax = Math.max(1e-6, s.ecco + Math.abs(s.bstar * s.cc4) * T + (s.isimp !== 1 ? 2 * Math.abs(s.bstar * s.cc5) : 0));
  if (!(eMax < E_MAX)) return `eccentricity above ${E_MAX}`;
  const p0Min = amMin * (1 - eMax * eMax);
  const eHat = eMax + Math.abs(s.aycof) / p0Min;
  if (!(eHat < E_MAX)) return `eccentricity above ${E_MAX}`;
  const pMin = amMin * (1 - eHat * eHat);
  const k1 = (0.5 * s.j2) / pMin, k2 = k1 / pMin;
  const kr = 1.5 * k2 * Math.abs(s.con41);
  if (!(kr < 0.1)) return 'short-period terms out of reach of the bounds';
  // the radius, term by term from r = r_L(1 − 1.5k₂β con41) + ½k₁ x1mth2 cos 2su
  const rMin = amMin * (1 - eHat) * (1 - kr) - 0.5 * k1 * s.x1mth2 - 1e-9;
  const rMax = amMax * (1 + eHat) * (1 + kr) + 0.5 * k1 * s.x1mth2 + 1e-9;
  return { tempa, aK, amMin, eMax, p0Min, eHat, k1, k2, rMin, rMax };
}

/**
 * The band SGP4's radius stays in between Julian dates `jd0` and `jd1`, m
 * from the Earth's centre; 'down' for a near-Earth object whose drag
 * polynomial takes it down within the window (it may be anywhere between the
 * ground and its perigee); null for one it cannot be given for otherwise
 * (see `radial`). For the screening's apogee–perigee test
 * (src/orbit/screening.ts).
 */
export function radiusBand(o: SkyObject, jd0: number, jd1: number): [number, number] | 'down' | null {
  const r = radial(o.sat, minutesSinceEpoch(o.sat, jd0), minutesSinceEpoch(o.sat, jd1));
  if (r === COMES_DOWN) return 'down';
  if (typeof r === 'string') return null;
  const m = o.sat.radiusearthkm * 1e3;
  return [r.rMin * m, r.rMax * m];
}

/** The filter's bounds for `o` over Julian dates `jd0` to `jd1`. */
export function filterBounds(o: SkyObject, jd0: number, jd1: number): FilterBounds {
  const s = o.sat;
  const t0 = minutesSinceEpoch(s, jd0), t1 = minutesSinceEpoch(s, jd1);
  const ta = t0 - SPAN_MARGIN, tb = t1 + SPAN_MARGIN;
  const base: FilterBounds = {
    sat: s, usable: false, why: '', t0, t1, ta, tb, sini: Math.sin(s.inclo), cosi: Math.cos(s.inclo),
    lam: [], lamDot: [], lamDotMin: 0, lamDotMax: 0, nodeRate: 0, rMin: 0, rMax: Infinity, du: Math.PI, eps: Math.PI,
    tempa: [], aK: 0, duLong: Math.PI, argpRate: 0, eRate: 0, eSwing: 0,
  };
  const no = (why: string): FilterBounds => ({ ...base, why });
  // (not s.error: that is the last propagation's, whatever it was for; a set SGP4 cannot use fails the checks below or gives no state)
  if (s.method === 'd') return no('deep space (SDP4)');
  // the mean motion along the track, and the node's rate
  const lam = lambdaPoly(s), lamDot = derivative(lam);
  const [lamDotMin, lamDotMax] = polyRange(lamDot, ta, tb);
  if (!(lamDotMin > 0.5 * s.no_unkozai)) return no('mean motion out of reach of the bounds');
  const [nd0, nd1] = polyRange([s.nodedot, 2 * s.nodecf], ta, tb);
  const nodeRate = Math.max(Math.abs(nd0), Math.abs(nd1));
  // a, e and the radius
  const r = radial(s, ta, tb);
  if (typeof r === 'string') return no(r);
  const { tempa, aK, eMax, p0Min, eHat, k2, rMin, rMax } = r;
  // along the track: long-period term, equation of the centre, short-period term, the node's swing seen along the track
  const cosi = base.cosi, sini = base.sini;
  const duLong = (Math.abs(s.xlcof) * eMax) / p0Min + equationOfCentreMax(eHat);
  const du = duLong + 0.25 * k2 * Math.abs(s.x7thm1) + 1.5 * k2 * cosi * cosi;
  // out of the plane
  const A = 1.5 * k2 * Math.abs(cosi) * sini;
  const eps = 2 * Math.asin(Math.min(1, 0.5 * A * Math.sqrt(1 + 1.5 * k2 * Math.abs(cosi))));
  // ω = ω₀ + ω̇t − δω − δM: δω = omgcof·t, δM = xmcof((1 + η cos M)³ − (1 + η cos M₀)³), M turning at Ṁ
  const simple = s.isimp === 1;
  const argpRate = Math.abs(s.argpdot) + (simple ? 0 : Math.abs(s.omgcof) + Math.abs(s.xmcof) * 3 * (1 + s.eta) ** 2 * s.eta * Math.abs(s.mdot));
  return {
    ...base, usable: true, lam, lamDot, lamDotMin, lamDotMax, nodeRate, rMin, rMax,
    du: SAFETY * du + 1e-9, eps: SAFETY * eps + 1e-9,
    tempa, aK, duLong: SAFETY * duLong + 1e-9, argpRate, eRate: Math.abs(s.bstar * s.cc4), eSwing: simple ? 0 : 2 * Math.abs(s.bstar * s.cc5),
  };
}

/** SGP4's secular and drag values of e and ω at t, as sgp4() forms them before its periodic terms (near-Earth). */
function secularAt(s: Satrec, t: number): { em: number; argpm: number } {
  const xmdf = s.mo + s.mdot * t;
  let argpm = s.argpo + s.argpdot * t, tempe = s.bstar * s.cc4 * t;
  if (s.isimp !== 1) {
    const delmtemp = 1 + s.eta * Math.cos(xmdf);
    const temp = s.omgcof * t + s.xmcof * (delmtemp * delmtemp * delmtemp - s.delmo);
    argpm -= temp;
    tempe += s.bstar * s.cc5 * (Math.sin(xmdf + temp) - s.sinmao);
  }
  return { em: s.ecco - tempe, argpm };
}

/** The range of cos x over [x0, x1]. */
function cosRange(x0: number, x1: number): [number, number] {
  if (x1 - x0 >= TWO_PI) return [-1, 1];
  const a = Math.cos(x0), b = Math.cos(x1);
  let lo = Math.min(a, b), hi = Math.max(a, b);
  if (TWO_PI * Math.ceil(x0 / TWO_PI) <= x1) hi = 1;
  if (Math.PI + TWO_PI * Math.ceil((x0 - Math.PI) / TWO_PI) <= x1) lo = -1;
  return [lo, hi];
}

const mulRange = (a: readonly [number, number], b: readonly [number, number]): [number, number] => {
  const p = [a[0] * b[0], a[0] * b[1], a[1] * b[0], a[1] * b[1]];
  return [Math.min(p[0], p[1], p[2], p[3]), Math.max(p[0], p[1], p[2], p[3])];
};

/**
 * SGP4's radius (earth radii) while the object is between minutes `lo` and
 * `hi` from its epoch — at one pass, so from where it is along its orbit, not
 * over the whole orbit as rMin and rMax. From SGP4's formulas:
 * r = r_L(1 − 1.5k₂β con41) + ½k₁ x1mth2 cos 2u, with r_L = p_L/(1 + e_L cos ν)
 * and e_L cos ν = e cos(u − ω) + (A₃₀/p₀) sin u, u being the long-period
 * argument of latitude, within duLong of λ. Over the pass a is bounded by
 * its drag polynomial, e by its drift and swing, ω by how fast it can turn;
 * each factor's range is taken, and the product's.
 */
export function radiusOver(b: FilterBounds, lo: number, hi: number): [number, number] {
  if (!b.usable) return [0, Infinity];
  const s = b.sat, h = (hi - lo) / 2;
  const [ta0, ta1] = polyRange(b.tempa, lo, hi);
  if (!(ta0 > 0)) return [0, Infinity];
  const amLo = b.aK * ta0 * ta0, amHi = b.aK * ta1 * ta1;
  const m = secularAt(s, (lo + hi) / 2);
  const de = b.eRate * h + b.eSwing, dw = b.argpRate * h;
  const emLo = Math.max(1e-6, m.em - de), emHi = Math.max(1e-6, m.em + de);
  if (!(emHi < E_MAX)) return [0, Infinity];
  // the J3 long-period shift A₃₀/p₀, p₀ = a(1 − e²)
  const yLo = s.aycof / (amHi * (1 - emLo * emLo)), yHi = s.aycof / (amLo * (1 - emHi * emHi));
  const y: [number, number] = [Math.min(yLo, yHi), Math.max(yLo, yHi)];
  const yMax = Math.max(Math.abs(y[0]), Math.abs(y[1]));
  // the long-period argument of latitude
  const u0 = polyAt(b.lam, lo) - b.duLong, u1 = polyAt(b.lam, hi) + b.duLong;
  const ec = mulRange([emLo, emHi], cosRange(u0 - m.argpm - dw, u1 - m.argpm + dw));
  const es = mulRange(y, cosRange(u0 - Math.PI / 2, u1 - Math.PI / 2));
  const eLo = ec[0] + es[0], eHi = ec[1] + es[1]; // e_L cos ν
  const eLMax = emHi + yMax, eLMin = Math.max(0, emLo - yMax);
  if (!(eLMax < E_MAX)) return [0, Infinity];
  const pLo = amLo * (1 - eLMax * eLMax), pHi = amHi * (1 - eLMin * eLMin);
  const rLLo = pLo / (1 + eHi), rLHi = pHi / (1 + eLo);
  // the short-period terms, with k₁ = J₂/2p and k₂ = k₁/p
  const k1Lo = (0.5 * s.j2) / pHi, k1Hi = (0.5 * s.j2) / pLo, k2Lo = k1Lo / pHi, k2Hi = k1Hi / pLo;
  const bLo = Math.sqrt(1 - eLMax * eLMax), bHi = Math.sqrt(1 - eLMin * eLMin);
  const c41 = s.con41;
  const f: [number, number] = c41 >= 0 ? [1 - 1.5 * k2Hi * bHi * c41, 1 - 1.5 * k2Lo * bLo * c41] : [1 - 1.5 * k2Lo * bLo * c41, 1 - 1.5 * k2Hi * bHi * c41];
  const [c2Lo, c2Hi] = cosRange(2 * u0, 2 * u1);
  const spLo = 0.5 * s.x1mth2 * (c2Lo >= 0 ? k1Lo : k1Hi) * c2Lo, spHi = 0.5 * s.x1mth2 * (c2Hi >= 0 ? k1Hi : k1Lo) * c2Hi;
  return [rLLo * f[0] + spLo - 1e-9, rLHi * f[1] + spHi + 1e-9];
}

/** x taken to (−π, π]. */
const wrapPi = (x: number): number => x - TWO_PI * Math.round(x / TWO_PI);

/** The time near `guess` at which λ reaches `goal` (rad), by Newton's method on the monotonic polynomial; NaN if it does not settle. */
function timeOf(b: FilterBounds, goal: number, guess: number): number {
  let t = guess;
  for (let it = 0; it < 12; it++) {
    const f = polyAt(b.lam, t) - goal;
    if (Math.abs(f) < 1e-11) return t;
    t -= f / polyAt(b.lamDot, t);
  }
  return Math.abs(polyAt(b.lam, t) - goal) < 1e-9 ? t : NaN;
}

/** The time at which λ reaches the angle `target` (mod 2π) nearest to where it is at `near`. */
const nearestTime = (b: FilterBounds, target: number, near: number): number => {
  const l = polyAt(b.lam, near);
  return timeOf(b, l + wrapPi(target - l), near);
};

interface Geometry { sinI: number; uP: number; uQ: number }

/** The node line at `t` (the primary's minutes): sin I, and the angle of n̂ in each mean plane from its node. */
function geometry(p: FilterBounds, q: FilterBounds, t: number, shift: number): Geometry {
  const Op = meanNode(p.sat, t), Oq = meanNode(q.sat, t + shift);
  const sOp = Math.sin(Op), cOp = Math.cos(Op), sOq = Math.sin(Oq), cOq = Math.cos(Oq);
  const hp = [p.sini * sOp, -p.sini * cOp, p.cosi], hq = [q.sini * sOq, -q.sini * cOq, q.cosi];
  let n0 = hp[1] * hq[2] - hp[2] * hq[1], n1 = hp[2] * hq[0] - hp[0] * hq[2], n2 = hp[0] * hq[1] - hp[1] * hq[0];
  const sinI = Math.hypot(n0, n1, n2);
  if (sinI === 0) return { sinI, uP: 0, uQ: 0 };
  n0 /= sinI; n1 /= sinI; n2 /= sinI;
  // the angle of n̂ from the node, in the plane: atan2(n̂·Q, n̂·P) with P = (cos Ω, sin Ω, 0), Q = (−cos i sin Ω, cos i cos Ω, sin i)
  const uP = Math.atan2(-n0 * p.cosi * sOp + n1 * p.cosi * cOp + n2 * p.sini, n0 * cOp + n1 * sOp);
  const uQ = Math.atan2(-n0 * q.cosi * sOq + n1 * q.cosi * cOq + n2 * q.sini, n0 * cOq + n1 * sOq);
  return { sinI, uP, uQ };
}

/**
 * The windows (Julian dates, in time order, within the screening window)
 * outside which the pair cannot come within `within` m of each other;
 * [] when it cannot at all; null when the pair must be searched over the
 * whole window. `p` is the object screened, `q` the other.
 */
export function pairWindows(p: FilterBounds, q: FilterBounds, within: number): [number, number][] | null {
  if (!p.usable || !q.usable) return null;
  const D = within / 1e3 / p.sat.radiusearthkm;
  // the apogee–perigee test on SGP4's own radius bounds
  if (Math.max(p.rMin, q.rMin) - Math.min(p.rMax, q.rMax) > D) return [];
  // q's minutes are p's plus shift
  const shift = ((p.sat.jdsatepoch - q.sat.jdsatepoch) + (p.sat.jdsatepochF - q.sat.jdsatepochF)) * 1440;
  const out = byNodes(p, q, D, shift);
  if (!out) return null;
  // in Julian dates, in time order, merged, within the window
  const epoch = p.sat.jdsatepoch + p.sat.jdsatepochF;
  const jd = (t: number): number => epoch + t / 1440;
  const jd0 = jd(p.t0), jd1 = jd(p.t1);
  out.sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const [lo, hi] of out) {
    const w: [number, number] = [Math.max(jd0, jd(lo)), Math.min(jd1, jd(hi))];
    const last = merged[merged.length - 1];
    if (last && w[0] <= last[1]) last[1] = Math.max(last[1], w[1]);
    else merged.push(w);
  }
  return merged;
}

/** Whether the two radii, over p's minutes lo to hi, can come within D of each other. */
function radiiMeet(p: FilterBounds, q: FilterBounds, lo: number, hi: number, D: number, shift: number): boolean {
  const [pa, pb] = radiusOver(p, lo, hi), [qa, qb] = radiusOver(q, lo + shift, hi + shift);
  return Math.max(pa, qa) - Math.min(pb, qb) <= D;
}

/** The windows by the node line (p's minutes, unsorted), with the radial test at each pass; null where it cannot vouch for them. */
function byNodes(p: FilterBounds, q: FilterBounds, D: number, shift: number): [number, number][] | null {
  const slab = D + p.rMax * p.eps + q.rMax * q.eps;
  const turn = p.sini * p.nodeRate + q.sini * q.nodeRate; // ω_h, rad/min
  const period = TWO_PI / p.lamDotMin; // the primary's longest revolution in the span, min
  const reach = 0.75 * period;
  const qHalf = Math.PI / q.lamDotMax; // q's shortest half revolution
  const passes: number[] = [];
  const out: [number, number][] = [];
  for (let end = 0; end < 2; end++) {
    // the first pass at or after one revolution before the window, to predict the passes from
    const start = p.t0 - period;
    const G0 = geometry(p, q, start, shift);
    if (G0.sinI < SIN_COPLANAR) return null;
    const l0 = polyAt(p.lam, start);
    let pred = timeOf(p, l0 + (((G0.uP + end * Math.PI - l0) % TWO_PI) + TWO_PI) % TWO_PI, start);
    for (let guard = 0; ; guard++) {
      if (!Number.isFinite(pred) || guard > 100_000) return null;
      // the node line where it is at the predicted pass (g), and the pass it gives (c)
      const g = pred, G = geometry(p, q, g, shift);
      const c = nearestTime(p, G.uP + end * Math.PI, g);
      if (!Number.isFinite(c)) return null;
      pred = c + TWO_PI / polyAt(p.lamDot, c);
      passes.push(c);
      if (c > p.t1 + period) break;
      const lead = Math.abs(c - g);
      // over ¾ of a revolution either side sin I stays above sLo
      const sLo = G.sinI - turn * reach;
      if (sLo < SIN_COPLANAR) return null;
      const sigP = slab / (p.rMin * Math.cos(p.eps) * sLo), sigQ = slab / (q.rMin * Math.cos(q.eps) * sLo);
      if (sigP >= SIGMA_MAX || sigQ >= SIGMA_MAX) return null;
      const aP = Math.asin(sigP), aQ = Math.asin(sigQ);
      if (aP + aQ + p.eps + q.eps >= OPPOSITE_ENDS) return null;
      const rhoP = turn / sLo + p.nodeRate, rhoQ = turn / sLo + q.nodeRate;
      if (rhoP > 0.25 * p.lamDotMin || rhoQ > 0.25 * q.lamDotMin) return null;
      const slopeP = p.lamDotMin - rhoP, slopeQ = q.lamDotMin - rhoQ;
      const AP = aP + p.du, AQ = aQ + q.du;
      if (AP >= OPPOSITE_ENDS || AQ >= OPPOSITE_ENDS) return null;
      // p's window about its pass: from the true pass (where λ meets the moving node line) and the pass found with the line held at g
      const hwP = (AP + rhoP * lead) / slopeP + PAD;
      // q, if near, meets its own pass within AQ/slopeQ: all of that must lie within reach
      const nearQ = hwP + AQ / slopeQ;
      if (lead > 0.1 * period || lead + nearQ + hwP > reach) return null;
      // only q's pass through the same end nearest to this one can meet p's window: the others are a half turn away in g
      if ((q.lamDotMax + rhoQ) * nearQ + rhoQ * lead >= Math.PI - 0.1 || nearQ >= 0.8 * qHalf) return null;
      const tq = c + shift, lq = polyAt(q.lam, tq), dq = wrapPi(G.uQ + end * Math.PI - lq);
      // q's true pass is at least (|dq| − ρ_q·lead)/(λ̇q,max + ρ_q) from c; no meeting if that is beyond nearQ
      if ((Math.abs(dq) - rhoQ * lead) / (q.lamDotMax + rhoQ) > nearQ + PAD) continue;
      const cqq = timeOf(q, lq + dq, tq);
      if (!Number.isFinite(cqq)) return null;
      const cq = cqq - shift;
      const hwQ = (AQ + rhoQ * Math.abs(cq - g)) / slopeQ + PAD;
      if (Math.abs(cq - g) + hwQ > reach) return null;
      const lo = Math.max(c - hwP, cq - hwQ), hi = Math.min(c + hwP, cq + hwQ);
      if (!(lo <= hi && hi >= p.t0 && lo <= p.t1)) continue;
      // the radial test at this pass: each radius where the object is along its orbit then
      if (radiiMeet(p, q, lo, hi, D, shift)) out.push([lo, hi]);
    }
  }
  // the passes through the two ends take turns, about half a revolution apart: none was skipped
  passes.sort((x, y) => x - y);
  if (passes[0] > p.t0 || passes[passes.length - 1] < p.t1) return null;
  for (let k = 1; k < passes.length; k++) {
    const gap = passes[k] - passes[k - 1];
    if (gap > 0.6 * period || gap < 0.3 * period) return null;
  }
  return out;
}

/** The filter for one screening: for each other object, its windows against `self` (see `pairWindows`). */
export function timeFilter(self: SkyObject, jd0: number, jd1: number, within: number): (other: SkyObject) => [number, number][] | null {
  const p = filterBounds(self, jd0, jd1);
  return (other) => (p.usable ? pairWindows(p, filterBounds(other, jd0, jd1), within) : null);
}
