/**
 * Reference frames of the astro base (PF-11): the rotations between GCRF, ITRF, TEME and EME2000 by the
 * IAU 2000B equinox-based chain, the sidereal times, the transformation of a state with the Earth's rotation,
 * the orbit frames RSW and LVLH, and azimuth, elevation and range. Radians, metres, seconds; Julian dates in
 * two parts. Imports only ./time, ./geodesy and ./nutation-2000b (the series tables).
 *
 * The chain: GCRF -> (bias, precession, nutation, IAU 2000B) -> true equator and equinox of date
 * -> R3(GST, IAU 2000B) -> Earth-fixed of date (PEF) -> polar motion -> ITRF. TEME is the true equator and
 * mean equinox of SGP4: TEME -> R3(GMST 1982) -> PEF -> polar motion -> ITRF. EME2000 is GCRF through the
 * frame bias. Ported from ERFA 2.0.1.5 (liberfa), read from the pyerfa 2.0.1.5 source archive, function by
 * function in ERFA's own order of operations, every term kept; the series tables are in ./nutation-2000b.
 *
 * Which ERFA routine each exported value equals: `biasPrecessionNutation` = `pnm00b`; `greenwichSiderealTime`
 * = `gst00b`; `gmst1982` = `gmst82`; `polarMotion(xp, yp)` = `pom00(xp, yp, 0)`; `FRAME_BIAS` = the `rb` of
 * `bp00`; `Frames.gcrfToItrf` = `c2teqx` of those. `matMul`, `matT` and `matVec` follow `rxr`, `tr` and `rxp`.
 *
 * Conventions:
 * - A matrix is nine numbers, row-major. R3(θ) is ERFA's `rz`: it turns the frame, so a vector's components
 *   become (x cos θ + y sin θ, −x sin θ + y cos θ, z).
 * - `gcrfToPef` = R3(gst)·`biasPrecessionNutation(tt)`; `gcrfToItrf` = `pole`·`gcrfToPef`;
 *   `temeToItrf` = `pole`·R3(gmst82); `gcrfToTeme` = `temeToItrf`ᵀ·`gcrfToItrf`.
 * - `framesAt` takes TT from UTC by `utcToTt` and UT1 by `utcToUt1` (UTC plus dut1 in the second part).
 * - Velocity: with ω = (0, 0, EARTH_ROTATION_RATE), v_pef = gcrfToPef·v − ω × r_pef, then both through
 *   `pole`; the inverse undoes it.
 * - A non-finite number in any input gives NaN in every number returned, and nothing throws; for the two
 *   state functions this covers every number of the `Frames` argument, used or not. `matMul`, `matT` and
 *   `matVec` are plain arithmetic and are the exception.
 * - `rswBasis` and `lvlhBasis` of a state with r ∥ v or a zero r give NaN in every number (zero over zero).
 * - The two sidereal times return 0 where ERFA's `anp` returns exactly 2π (a tiny negative argument); only the
 *   value returned is folded, nothing inside the chain.
 * - Azimuth is from north through east in [0, 2π); elevation is atan2(up, horizontal distance).
 * - Each function returns a fresh object or array; an input is never changed.
 */
import { type Jd2, julianCenturies, utcToTt, utcToUt1 } from './time';
import { type V3, enuBasis } from './geodesy';
import { EECT00_T0, EECT00_T1, NUT00B_LS, NUT00B_PLANETARY_OFFSET } from './nutation-2000b';

export type Mat3 = readonly number[];
export interface Frames {
  gcrfToItrf: Mat3; temeToItrf: Mat3; gcrfToTeme: Mat3; gcrfToEme2000: Mat3;
  /** GCRF → Earth-fixed of date, before polar motion */
  gcrfToPef: Mat3; pole: Mat3;
  gst: number; gmst82: number;
}
export interface State { r: V3; v: V3 }

/** rad/s */
export const EARTH_ROTATION_RATE = 7.292115146706979e-5;

// erfam.h
const DAS2R = 4.848136811095359935899141e-6;
const D2PI = 6.283185307179586476925287;
const DS2R = 7.272205216643039903848712e-5;
const TURNAS = 1296000.0;
const DMAS2R = DAS2R / 1e3;
const DAYSEC = 86400.0;
const DJ00 = 2451545.0;
const DJC = 36525.0;

/** True unless every argument is finite (x * 0 is 0 only for a finite x, and cannot overflow). */
const nonFinite = (...v: number[]) => v.reduce((s, x) => s + x * 0, 0) !== 0;
const NAN3 = (): V3 => ({ x: NaN, y: NaN, z: NaN });
const NANM = (): number[] => new Array<number>(9).fill(NaN);

// ---- the rotation helpers, in place on a row-major array, as ERFA's ir, rx, ry, rz, rxr, tr, anp

const ir = (): number[] => [1, 0, 0, 0, 1, 0, 0, 0, 1];
function rx(phi: number, r: number[]): void {
  const s = Math.sin(phi), c = Math.cos(phi);
  const a10 = c * r[3] + s * r[6], a11 = c * r[4] + s * r[7], a12 = c * r[5] + s * r[8];
  const a20 = -s * r[3] + c * r[6], a21 = -s * r[4] + c * r[7], a22 = -s * r[5] + c * r[8];
  r[3] = a10; r[4] = a11; r[5] = a12; r[6] = a20; r[7] = a21; r[8] = a22;
}
function ry(theta: number, r: number[]): void {
  const s = Math.sin(theta), c = Math.cos(theta);
  const a00 = c * r[0] - s * r[6], a01 = c * r[1] - s * r[7], a02 = c * r[2] - s * r[8];
  const a20 = s * r[0] + c * r[6], a21 = s * r[1] + c * r[7], a22 = s * r[2] + c * r[8];
  r[0] = a00; r[1] = a01; r[2] = a02; r[6] = a20; r[7] = a21; r[8] = a22;
}
function rz(psi: number, r: number[]): void {
  const s = Math.sin(psi), c = Math.cos(psi);
  const a00 = c * r[0] + s * r[3], a01 = c * r[1] + s * r[4], a02 = c * r[2] + s * r[5];
  const a10 = -s * r[0] + c * r[3], a11 = -s * r[1] + c * r[4], a12 = -s * r[2] + c * r[5];
  r[0] = a00; r[1] = a01; r[2] = a02; r[3] = a10; r[4] = a11; r[5] = a12;
}
/** a·b, `rxr`. */
function rxr(a: Mat3, b: Mat3): number[] {
  const m = new Array<number>(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let w = 0.0;
      for (let k = 0; k < 3; k++) w += a[3 * i + k] * b[3 * k + j];
      m[3 * i + j] = w;
    }
  return m;
}
const tr = (a: Mat3): number[] => [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
const mv = (m: Mat3, v: V3): V3 => ({
  x: m[0] * v.x + m[1] * v.y + m[2] * v.z,
  y: m[3] * v.x + m[4] * v.y + m[5] * v.z,
  z: m[6] * v.x + m[7] * v.y + m[8] * v.z,
});
/** Normalize an angle into [0, 2π), `anp`. */
function anp(a: number): number {
  let w = a % D2PI;
  if (w < 0) w += D2PI;
  return w;
}

/** ERFA's `anp` gives exactly 2π for a tiny negative argument; that value becomes 0, so a result stays in [0, 2π). */
const fold2pi = (a: number): number => (a === D2PI ? 0 : a);

export function matMul(a: Mat3, b: Mat3): Mat3 { return rxr(a, b); }
export function matT(a: Mat3): Mat3 { return tr(a); }
export function matVec(m: Mat3, v: V3): V3 { return mv(m, v); }

// ---- precession and nutation: pr00, obl80, bi00, bp00, numat, nut00b, pn00, pnm00b

/** `pr00`: the IAU 2000 corrections to the precession and obliquity rates. */
const pr00 = (t: number): [number, number] => [(-0.29965 * DAS2R) * t, (-0.02524 * DAS2R) * t];

/** `obl80`: mean obliquity, IAU 1980. */
const obl80 = (t: number): number =>
  DAS2R * (84381.448 + (-46.8150 + (-0.00059 + (0.001813) * t) * t) * t);

/** `bp00`: the frame bias rb and the bias-precession matrix rbp. */
function bp00(t: number): { rb: number[]; rbp: number[] } {
  const EPS0 = 84381.448 * DAS2R;
  const dpsibi = -0.041775 * DAS2R, depsbi = -0.0068192 * DAS2R, dra0 = -0.0146 * DAS2R; // bi00
  const psia77 = (5038.7784 + (-1.07259 + (-0.001147) * t) * t) * t * DAS2R;
  const oma77 = EPS0 + ((0.05127 + (-0.007726) * t) * t) * t * DAS2R;
  const chia = (10.5526 + (-2.38064 + (-0.001125) * t) * t) * t * DAS2R;
  const [dpsipr, depspr] = pr00(t);
  const psia = psia77 + dpsipr;
  const oma = oma77 + depspr;
  const rb = ir();
  rz(dra0, rb);
  ry(dpsibi * Math.sin(EPS0), rb);
  rx(-depsbi, rb);
  const rp = ir();
  rx(EPS0, rp);
  rz(-psia, rp);
  rx(-oma, rp);
  rz(chia, rp);
  return { rb, rbp: rxr(rp, rb) };
}

/** `numat`: the nutation matrix. */
function numat(epsa: number, dpsi: number, deps: number): number[] {
  const r = ir();
  rx(epsa, r);
  rz(-dpsi, r);
  rx(-(epsa + deps), r);
  return r;
}

/** `nut00b`: nutation, IAU 2000B, [dpsi, deps] in rad. */
function nut00b(t: number): [number, number] {
  const U2R = DAS2R / 1e7;
  const el = ((485868.249036 + (1717915923.2178) * t) % TURNAS) * DAS2R;
  const elp = ((1287104.79305 + (129596581.0481) * t) % TURNAS) * DAS2R;
  const f = ((335779.526232 + (1739527262.8478) * t) % TURNAS) * DAS2R;
  const d = ((1072260.70369 + (1602961601.2090) * t) % TURNAS) * DAS2R;
  const om = ((450160.398036 + (-6962890.5431) * t) % TURNAS) * DAS2R;
  let dp = 0.0, de = 0.0;
  for (let i = NUT00B_LS.length - 1; i >= 0; i--) {
    const x = NUT00B_LS[i];
    const arg = (x[0] * el + x[1] * elp + x[2] * f + x[3] * d + x[4] * om) % D2PI;
    const sarg = Math.sin(arg), carg = Math.cos(arg);
    dp += (x[5] + x[6] * t) * sarg + x[7] * carg;
    de += (x[8] + x[9] * t) * carg + x[10] * sarg;
  }
  const dpsipl = NUT00B_PLANETARY_OFFSET[0] * DMAS2R, depspl = NUT00B_PLANETARY_OFFSET[1] * DMAS2R;
  return [dp * U2R + dpsipl, de * U2R + depspl];
}

/** GCRF → true equator and equinox of date, IAU 2000B (`pnm00b`, by `pn00b` and `pn00`); TT. */
export function biasPrecessionNutation(tt: Jd2): Mat3 {
  if (nonFinite(tt.a, tt.b)) return NANM();
  const t = julianCenturies(tt);
  const [dpsi, deps] = nut00b(t);
  const [, depspr] = pr00(t);
  const epsa = obl80(t) + depspr;
  const { rbp } = bp00(t);
  return rxr(numat(epsa, dpsi, deps), rbp);
}

/** GCRF → mean equator and equinox of J2000 (EME2000): the `rb` of `bp00`. */
export const FRAME_BIAS: Mat3 = Object.freeze(bp00(0).rb);

// ---- sidereal time: era00, gmst00, eect00 and the fundamental arguments, ee00b, gst00b, gmst82

/** `era00`: the Earth rotation angle, UT1. */
function era00(dj1: number, dj2: number): number {
  const [d1, d2] = dj1 < dj2 ? [dj1, dj2] : [dj2, dj1];
  const t = d1 + (d2 - DJ00);
  const f = (d1 % 1.0) + (d2 % 1.0);
  return anp(D2PI * (f + 0.7790572732640 + 0.00273781191135448 * t));
}

/** `gmst00`: Greenwich mean sidereal time, IAU 2000. */
function gmst00(uta: number, utb: number, tta: number, ttb: number): number {
  const t = ((tta - DJ00) + ttb) / DJC;
  return anp(era00(uta, utb) +
    (0.014506 + (4612.15739966 + (1.39667721 + (-0.00009344 + (0.00001882) * t) * t) * t) * t) * DAS2R);
}

/** `eect00`: the complementary terms of the equation of the equinoxes, with `fal03` … `fapa03`. */
function eect00(t: number): number {
  const fa = [
    ((485868.249036 + t * (1717915923.2178 + t * (31.8792 + t * (0.051635 + t * (-0.00024470))))) % TURNAS) * DAS2R,
    ((1287104.793048 + t * (129596581.0481 + t * (-0.5532 + t * (0.000136 + t * (-0.00001149))))) % TURNAS) * DAS2R,
    ((335779.526232 + t * (1739527262.8478 + t * (-12.7512 + t * (-0.001037 + t * (0.00000417))))) % TURNAS) * DAS2R,
    ((1072260.703692 + t * (1602961601.2090 + t * (-6.3706 + t * (0.006593 + t * (-0.00003169))))) % TURNAS) * DAS2R,
    ((450160.398036 + t * (-6962890.5431 + t * (7.4722 + t * (0.007702 + t * (-0.00005939))))) % TURNAS) * DAS2R,
    (3.176146697 + 1021.3285546211 * t) % D2PI,
    (1.753470314 + 628.3075849991 * t) % D2PI,
    (0.024381750 + 0.00000538691 * t) * t,
  ];
  const sum = (terms: readonly (readonly number[])[]) => {
    let s = 0.0;
    for (let i = terms.length - 1; i >= 0; i--) {
      const e = terms[i];
      let a = 0.0;
      for (let j = 0; j < 8; j++) a += e[j] * fa[j];
      s += e[8] * Math.sin(a) + e[9] * Math.cos(a);
    }
    return s;
  };
  const s0 = sum(EECT00_T0), s1 = sum(EECT00_T1);
  return (s0 + s1 * t) * DAS2R;
}

/** `ee00b` (with `ee00`): the equation of the equinoxes, IAU 2000B. */
function ee00b(date1: number, date2: number): number {
  const t = ((date1 - DJ00) + date2) / DJC;
  const [, depspr] = pr00(t);
  const epsa = obl80(t) + depspr;
  const [dpsi] = nut00b(t);
  return dpsi * Math.cos(epsa) + eect00(t);
}

/** Greenwich apparent sidereal time, IAU 2000B (`gst00b`), rad in [0, 2π); UT1. */
export function greenwichSiderealTime(ut1: Jd2): number {
  if (nonFinite(ut1.a, ut1.b)) return NaN;
  return fold2pi(anp(gmst00(ut1.a, ut1.b, ut1.a, ut1.b) + ee00b(ut1.a, ut1.b)));
}

/** Greenwich mean sidereal time, IAU 1982 (`gmst82`), rad in [0, 2π); UT1. */
export function gmst1982(ut1: Jd2): number {
  if (nonFinite(ut1.a, ut1.b)) return NaN;
  const A = 24110.54841 - DAYSEC / 2.0, B = 8640184.812866, C = 0.093104, D = -6.2e-6;
  const [d1, d2] = ut1.a < ut1.b ? [ut1.a, ut1.b] : [ut1.b, ut1.a];
  const t = (d1 + (d2 - DJ00)) / DJC;
  const f = DAYSEC * ((d1 % 1.0) + (d2 % 1.0));
  return fold2pi(anp(DS2R * ((A + (B + (C + D * t) * t) * t) + f)));
}

/** Earth-fixed of date → ITRF, `pom00(xp, yp, 0)`; rad. */
export function polarMotion(xp: number, yp: number): Mat3 {
  if (nonFinite(xp, yp)) return NANM();
  const r = ir();
  rz(0, r);
  ry(-xp, r);
  rx(-yp, r);
  return r;
}

/** Every frame at a UTC instant, with UT1 − UTC (s) and the pole (rad). */
export function framesAt(utc: Jd2, eop: { dut1: number; xp: number; yp: number }): Frames {
  if (nonFinite(utc.a, utc.b, eop.dut1, eop.xp, eop.yp)) {
    return {
      gcrfToItrf: NANM(), temeToItrf: NANM(), gcrfToTeme: NANM(), gcrfToEme2000: NANM(),
      gcrfToPef: NANM(), pole: NANM(), gst: NaN, gmst82: NaN,
    };
  }
  const tt = utcToTt(utc), ut1 = utcToUt1(utc, eop.dut1);
  const gst = greenwichSiderealTime(ut1), gmst82 = gmst1982(ut1);
  const pole = polarMotion(eop.xp, eop.yp);
  const gcrfToPef = [...biasPrecessionNutation(tt)];
  rz(gst, gcrfToPef);
  const gcrfToItrf = rxr(pole, gcrfToPef);
  const teme = ir();
  rz(gmst82, teme);
  const temeToItrf = rxr(pole, teme);
  return {
    gcrfToItrf, temeToItrf, gcrfToTeme: rxr(tr(temeToItrf), gcrfToItrf), gcrfToEme2000: [...FRAME_BIAS],
    gcrfToPef, pole: [...pole], gst, gmst82,
  };
}

// ---- states

const framesNonFinite = (f: Frames, s: State) =>
  nonFinite(
    ...f.gcrfToItrf, ...f.temeToItrf, ...f.gcrfToTeme, ...f.gcrfToEme2000, ...f.gcrfToPef, ...f.pole, f.gst, f.gmst82,
    s.r.x, s.r.y, s.r.z, s.v.x, s.v.y, s.v.z,
  );

/** GCRF → ITRF, position and velocity; the velocity loses the Earth's rotation. */
export function gcrfToItrfState(f: Frames, s: State): State {
  if (framesNonFinite(f, s)) return { r: NAN3(), v: NAN3() };
  const w = EARTH_ROTATION_RATE;
  const r = mv(f.gcrfToPef, s.r);
  const u = mv(f.gcrfToPef, s.v);
  const v = { x: u.x + w * r.y, y: u.y - w * r.x, z: u.z }; // u − ω × r
  return { r: mv(f.pole, r), v: mv(f.pole, v) };
}

/** ITRF → GCRF, position and velocity; the inverse of `gcrfToItrfState`. */
export function itrfToGcrfState(f: Frames, s: State): State {
  if (framesNonFinite(f, s)) return { r: NAN3(), v: NAN3() };
  const w = EARTH_ROTATION_RATE;
  const poleT = tr(f.pole), pefT = tr(f.gcrfToPef);
  const r = mv(poleT, s.r);
  const u = mv(poleT, s.v);
  const v = { x: u.x - w * r.y, y: u.y + w * r.x, z: u.z }; // u + ω × r
  return { r: mv(pefT, r), v: mv(pefT, v) };
}

// ---- orbit frames and the local horizon

const cross = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const unit = (a: V3): V3 => {
  const n = Math.hypot(a.x, a.y, a.z);
  return { x: a.x / n, y: a.y / n, z: a.z / n };
};
const neg = (a: V3): V3 => ({ x: -a.x, y: -a.y, z: -a.z });

/**
 * Radial, along-track (perpendicular to r in the orbit plane) and cross-track (r × v). Built from the orbit
 * normal: w = unit(r × v), s = unit(w × r), r = s × w; so r ∥ v and a zero r give NaN in every number.
 */
export function rswBasis(st: State): { r: V3; s: V3; w: V3 } {
  if (nonFinite(st.r.x, st.r.y, st.r.z, st.v.x, st.v.y, st.v.z)) return { r: NAN3(), s: NAN3(), w: NAN3() };
  const w = unit(cross(st.r, st.v));
  const s = unit(cross(w, st.r));
  return { r: cross(s, w), s, w };
}

/** z to the Earth's centre, y opposite the orbit normal, x = y × z (the along-track axis of RSW). */
export function lvlhBasis(st: State): { x: V3; y: V3; z: V3 } {
  const b = rswBasis(st);
  return { x: b.s, y: neg(b.w), z: neg(b.r) };
}

/** Azimuth (from north through east, [0, 2π)), elevation and range of a target from a site; ITRF, metres. */
export function azElRange(siteItrf: V3, lat: number, lon: number, targetItrf: V3): { az: number; el: number; range: number } {
  if (nonFinite(siteItrf.x, siteItrf.y, siteItrf.z, lat, lon, targetItrf.x, targetItrf.y, targetItrf.z)) {
    return { az: NaN, el: NaN, range: NaN };
  }
  const d = { x: targetItrf.x - siteItrf.x, y: targetItrf.y - siteItrf.y, z: targetItrf.z - siteItrf.z };
  const { east, north, up } = enuBasis(lat, lon);
  const e = d.x * east.x + d.y * east.y + d.z * east.z;
  const n = d.x * north.x + d.y * north.y + d.z * north.z;
  const u = d.x * up.x + d.y * up.y + d.z * up.z;
  let az = Math.atan2(e, n);
  if (az < 0) az += 2 * Math.PI;
  if (az >= 2 * Math.PI) az = 0; // −tiny + 2π rounds to 2π
  return { az, el: Math.atan2(u, Math.hypot(e, n)), range: Math.hypot(d.x, d.y, d.z) };
}
