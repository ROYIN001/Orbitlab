/**
 * SGP4 and SDP4 (roadmap R01, docs/ROADMAP-PART2-3.md): the analytic theory
 * the US Space Force's general-perturbations element sets — the two-line
 * element sets and their OMM form that CelesTrak republishes — are fitted
 * to, and so the only model that gives back what the element set means.
 * Another propagator run from a TLE's numbers would be wrong by kilometres
 * in a day, because the elements are SGP4's own mean elements, not
 * osculating ones.
 *
 * This is the reference implementation of Vallado, Crawford, Hujsak and
 * Kelso, "Revisiting Spacetrack Report #3" (AIAA 2006-6753), in its 2020
 * revision, carried over to TypeScript procedure for procedure, with the
 * names kept so the two can be read side by side: `initl`, `dscom`, `dpper`,
 * `dsinit`, `dspace`, `sgp4init`, `sgp4`. The theory is Hoots and Roehrich,
 * Spacetrack Report #3 (1980), and Hoots, Spacetrack Report #6 (1986). The
 * choices the paper documents are kept as it made them: the "improved"
 * operation mode by default ('a' reproduces the AFSPC code's sidereal time
 * and angle handling), the Lyddane choice on the perturbed inclination, WGS-72
 * constants. Every departure from the reference would show in
 * tests/sgp4.test.ts, which runs the paper's verification cases
 * (SGP4-VER.TLE) and holds every line of its published output (tcppver.out).
 *
 * Near-Earth orbits (period under 225 minutes) take SGP4; deep-space ones
 * take SDP4's lunar–solar terms and, for 12-hour and 24-hour orbits, the
 * geopotential resonance integrated in 720-minute steps from the epoch.
 *
 * Units are the theory's: minutes since the epoch in, km and km/s out, in
 * TEME — the true-equator, mean-equinox frame the element sets are given
 * in. `temeToEcef` turns it with the Earth by Greenwich mean sidereal time
 * (IAU 1982, the same the rest of the program uses); UT1 − UTC (under a
 * second) and polar motion are left out, which moves a point on the ground
 * by at most half a kilometre — less than an element set's own error.
 *
 * DOM-free. src/orbit/tle.ts reads the element sets.
 */
import type { ElementSet } from './tle';

const PI = Math.PI;
const TWO_PI = 2 * PI;
const X2O3 = 2 / 3;
const DEG2RAD = PI / 180;

/** The Earth constants the theory can run with; WGS-72 is what element sets are made with. */
export type GravityModel = 'wgs72old' | 'wgs72' | 'wgs84';
/** 'i': the improved mode of the 2006 paper; 'a': the AFSPC code's own arithmetic. */
export type OpsMode = 'i' | 'a';

interface GravConst {
  tumin: number;
  mu: number;
  radiusearthkm: number;
  xke: number;
  j2: number;
  j3: number;
  j4: number;
  j3oj2: number;
}

/** getgravconst: the constants, km and minutes. */
export function gravConst(which: GravityModel): GravConst {
  let mu: number, radiusearthkm: number, xke: number, j2: number, j3: number, j4: number;
  if (which === 'wgs72old') {
    mu = 398600.79964; radiusearthkm = 6378.135; xke = 0.0743669161;
    j2 = 0.001082616; j3 = -0.00000253881; j4 = -0.00000165597;
  } else if (which === 'wgs72') {
    mu = 398600.8; radiusearthkm = 6378.135; xke = 60.0 / Math.sqrt((radiusearthkm * radiusearthkm * radiusearthkm) / mu);
    j2 = 0.001082616; j3 = -0.00000253881; j4 = -0.00000165597;
  } else {
    mu = 398600.5; radiusearthkm = 6378.137; xke = 60.0 / Math.sqrt((radiusearthkm * radiusearthkm * radiusearthkm) / mu);
    j2 = 0.00108262998905; j3 = -0.00000253215306; j4 = -0.00000161098761;
  }
  return { tumin: 1.0 / xke, mu, radiusearthkm, xke, j2, j3, j4, j3oj2: j3 / j2 };
}

/**
 * The reference's error codes: 1 mean eccentricity out of [−0.001, 1);
 * 2 mean motion negative; 3 perturbed eccentricity out of [0, 1];
 * 4 semi-latus rectum negative; 5 (unused since 2008); 6 decayed — the
 * satellite's radius has come below the Earth's.
 */
export type Sgp4Error = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * The propagator's state for one element set (the reference's `elsetrec`):
 * the elements, the constants worked out from them once, and the resonance
 * integrator's last step, kept so time moving forward costs one step, not
 * all of them from the epoch.
 */
export class Satrec {
  satnum = 0;
  error: Sgp4Error = 0;
  operationmode: OpsMode = 'i';
  init: 'y' | 'n' = 'n';
  method: 'n' | 'd' = 'n';
  /** the epoch, Julian date, as its whole part and its fraction (UTC) */
  jdsatepoch = 0;
  jdsatepochF = 0;

  // the elements, rad and rad/min
  bstar = 0; ndot = 0; nddot = 0; ecco = 0; argpo = 0; inclo = 0; mo = 0; no_kozai = 0; nodeo = 0;
  no_unkozai = 0;
  // the constants
  tumin = 0; mu = 0; radiusearthkm = 0; xke = 0; j2 = 0; j3 = 0; j4 = 0; j3oj2 = 0;
  // near Earth
  isimp = 0; aycof = 0; con41 = 0; cc1 = 0; cc4 = 0; cc5 = 0; d2 = 0; d3 = 0; d4 = 0; delmo = 0; eta = 0;
  argpdot = 0; omgcof = 0; sinmao = 0; t = 0; t2cof = 0; t3cof = 0; t4cof = 0; t5cof = 0;
  x1mth2 = 0; x7thm1 = 0; mdot = 0; nodedot = 0; xlcof = 0; xmcof = 0; nodecf = 0;
  // deep space
  irez = 0; d2201 = 0; d2211 = 0; d3210 = 0; d3222 = 0; d4410 = 0; d4422 = 0; d5220 = 0; d5232 = 0;
  d5421 = 0; d5433 = 0; dedt = 0; del1 = 0; del2 = 0; del3 = 0; didt = 0; dmdt = 0; dnodt = 0; domdt = 0;
  e3 = 0; ee2 = 0; peo = 0; pgho = 0; pho = 0; pinco = 0; plo = 0; se2 = 0; se3 = 0; sgh2 = 0; sgh3 = 0;
  sgh4 = 0; sh2 = 0; sh3 = 0; si2 = 0; si3 = 0; sl2 = 0; sl3 = 0; sl4 = 0; gsto = 0; xfact = 0;
  xgh2 = 0; xgh3 = 0; xgh4 = 0; xh2 = 0; xh3 = 0; xi2 = 0; xi3 = 0; xl2 = 0; xl3 = 0; xl4 = 0;
  xlamo = 0; zmol = 0; zmos = 0; atime = 0; xli = 0; xni = 0;
  // the mean elements at the last call, and the orbit's size at the epoch (earth radii)
  a = 0; altp = 0; alta = 0; am = 0; em = 0; im = 0; Om = 0; om = 0; mm = 0; nm = 0;
}

// ─── deep space: dpper ──────────────────────────────────────────────────────

interface Angles { ep: number; inclp: number; nodep: number; argpp: number; mp: number }

/**
 * dpper: the lunar–solar long-period periodics, zero at the epoch by
 * design. `init` 'y' is the call from sgp4init that fixes their epoch values.
 */
function dpper(s: Satrec, init: 'y' | 'n', a: Angles, opsmode: OpsMode): void {
  const zns = 1.19459e-5, zes = 0.01675, znl = 1.5835218e-4, zel = 0.05490;
  const t = s.t;
  // the time-varying periodics
  let zm = init === 'y' ? s.zmos : s.zmos + zns * t;
  let zf = zm + 2.0 * zes * Math.sin(zm);
  let sinzf = Math.sin(zf);
  let f2 = 0.5 * sinzf * sinzf - 0.25;
  let f3 = -0.5 * sinzf * Math.cos(zf);
  const ses = s.se2 * f2 + s.se3 * f3;
  const sis = s.si2 * f2 + s.si3 * f3;
  const sls = s.sl2 * f2 + s.sl3 * f3 + s.sl4 * sinzf;
  const sghs = s.sgh2 * f2 + s.sgh3 * f3 + s.sgh4 * sinzf;
  const shs = s.sh2 * f2 + s.sh3 * f3;
  zm = init === 'y' ? s.zmol : s.zmol + znl * t;
  zf = zm + 2.0 * zel * Math.sin(zm);
  sinzf = Math.sin(zf);
  f2 = 0.5 * sinzf * sinzf - 0.25;
  f3 = -0.5 * sinzf * Math.cos(zf);
  const sel = s.ee2 * f2 + s.e3 * f3;
  const sil = s.xi2 * f2 + s.xi3 * f3;
  const sll = s.xl2 * f2 + s.xl3 * f3 + s.xl4 * sinzf;
  const sghl = s.xgh2 * f2 + s.xgh3 * f3 + s.xgh4 * sinzf;
  const shll = s.xh2 * f2 + s.xh3 * f3;
  let pe = ses + sel;
  let pinc = sis + sil;
  let pl = sls + sll;
  let pgh = sghs + sghl;
  let ph = shs + shll;

  if (init === 'n') {
    pe = pe - s.peo;
    pinc = pinc - s.pinco;
    pl = pl - s.plo;
    pgh = pgh - s.pgho;
    ph = ph - s.pho;
    a.inclp = a.inclp + pinc;
    a.ep = a.ep + pe;
    const sinip = Math.sin(a.inclp);
    const cosip = Math.cos(a.inclp);
    // sgp4fix for the Lyddane choice: on the perturbed inclination (GSFC's), not the epoch's
    // (Spacetrack Report #3's) — both are defensible; 0.2 rad = 11.45916°
    if (a.inclp >= 0.2) {
      ph = ph / sinip;
      pgh = pgh - cosip * ph;
      a.argpp = a.argpp + pgh;
      a.nodep = a.nodep + ph;
      a.mp = a.mp + pl;
    } else {
      // the periodics with the Lyddane modification
      const sinop = Math.sin(a.nodep);
      const cosop = Math.cos(a.nodep);
      let alfdp = sinip * sinop;
      let betdp = sinip * cosop;
      const dalf = ph * cosop + pinc * cosip * sinop;
      const dbet = -ph * sinop + pinc * cosip * cosop;
      alfdp = alfdp + dalf;
      betdp = betdp + dbet;
      a.nodep = a.nodep % TWO_PI; // C's fmod, as JavaScript's % is
      // sgp4fix for the AFSPC intrinsics: the node is used here without a trigonometric function
      if (a.nodep < 0.0 && opsmode === 'a') a.nodep = a.nodep + TWO_PI;
      const xls = a.mp + a.argpp + cosip * a.nodep;
      const dls = pl + pgh - pinc * a.nodep * sinip;
      const xlsAll = xls + dls;
      const xnoh = a.nodep;
      a.nodep = Math.atan2(alfdp, betdp);
      if (a.nodep < 0.0 && opsmode === 'a') a.nodep = a.nodep + TWO_PI;
      if (Math.abs(xnoh - a.nodep) > PI) {
        if (a.nodep < xnoh) a.nodep = a.nodep + TWO_PI;
        else a.nodep = a.nodep - TWO_PI;
      }
      a.mp = a.mp + pl;
      a.argpp = xlsAll - a.mp - cosip * a.nodep;
    }
  }
}

// ─── deep space: dscom ──────────────────────────────────────────────────────

interface Dscom {
  snodm: number; cnodm: number; sinim: number; cosim: number; sinomm: number; cosomm: number;
  day: number; em: number; emsq: number; gam: number; rtemsq: number;
  s1: number; s2: number; s3: number; s4: number; s5: number; s6: number; s7: number;
  ss1: number; ss2: number; ss3: number; ss4: number; ss5: number; ss6: number; ss7: number;
  sz1: number; sz2: number; sz3: number; sz11: number; sz12: number; sz13: number;
  sz21: number; sz22: number; sz23: number; sz31: number; sz32: number; sz33: number;
  nm: number;
  z1: number; z2: number; z3: number; z11: number; z12: number; z13: number;
  z21: number; z22: number; z23: number; z31: number; z32: number; z33: number;
}

/**
 * dscom: the deep-space quantities the secular and periodic terms share —
 * the Sun's and the Moon's geometry at the epoch, the coefficients of their
 * perturbations; writes the long-period coefficients into `s`.
 */
function dscom(s: Satrec, epoch: number, ep: number, argpp: number, tc: number, inclp: number, nodep: number, np: number): Dscom {
  const zes = 0.01675, zel = 0.05490, c1ss = 2.9864797e-6, c1l = 4.7968065e-7;
  const zsinis = 0.39785416, zcosis = 0.91744867, zcosgs = 0.1945905, zsings = -0.98088458;

  const nm = np;
  const em = ep;
  const snodm = Math.sin(nodep);
  const cnodm = Math.cos(nodep);
  const sinomm = Math.sin(argpp);
  const cosomm = Math.cos(argpp);
  const sinim = Math.sin(inclp);
  const cosim = Math.cos(inclp);
  const emsq = em * em;
  const betasq = 1.0 - emsq;
  const rtemsq = Math.sqrt(betasq);

  // the lunar and solar terms
  s.peo = 0.0; s.pinco = 0.0; s.plo = 0.0; s.pgho = 0.0; s.pho = 0.0;
  const day = epoch + 18261.5 + tc / 1440.0;
  const xnodce = (4.5236020 - 9.2422029e-4 * day) % TWO_PI;
  const stem = Math.sin(xnodce);
  const ctem = Math.cos(xnodce);
  const zcosil = 0.91375164 - 0.03568096 * ctem;
  const zsinil = Math.sqrt(1.0 - zcosil * zcosil);
  const zsinhl = (0.089683511 * stem) / zsinil;
  const zcoshl = Math.sqrt(1.0 - zsinhl * zsinhl);
  const gam = 5.8351514 + 0.0019443680 * day;
  let zx = (0.39785416 * stem) / zsinil;
  const zy = zcoshl * ctem + 0.91744867 * zsinhl * stem;
  zx = Math.atan2(zx, zy);
  zx = gam + zx - xnodce;
  const zcosgl = Math.cos(zx);
  const zsingl = Math.sin(zx);

  // the solar terms first, then the lunar
  let zcosg = zcosgs, zsing = zsings, zcosi = zcosis, zsini = zsinis, zcosh = cnodm, zsinh = snodm;
  let cc = c1ss;
  const xnoi = 1.0 / nm;

  let s1 = 0, s2 = 0, s3 = 0, s4 = 0, s5 = 0, s6 = 0, s7 = 0;
  let ss1 = 0, ss2 = 0, ss3 = 0, ss4 = 0, ss5 = 0, ss6 = 0, ss7 = 0;
  let sz1 = 0, sz2 = 0, sz3 = 0, sz11 = 0, sz12 = 0, sz13 = 0, sz21 = 0, sz22 = 0, sz23 = 0, sz31 = 0, sz32 = 0, sz33 = 0;
  let z1 = 0, z2 = 0, z3 = 0, z11 = 0, z12 = 0, z13 = 0, z21 = 0, z22 = 0, z23 = 0, z31 = 0, z32 = 0, z33 = 0;

  for (let lsflg = 1; lsflg <= 2; lsflg++) {
    const a1 = zcosg * zcosh + zsing * zcosi * zsinh;
    const a3 = -zsing * zcosh + zcosg * zcosi * zsinh;
    const a7 = -zcosg * zsinh + zsing * zcosi * zcosh;
    const a8 = zsing * zsini;
    const a9 = zsing * zsinh + zcosg * zcosi * zcosh;
    const a10 = zcosg * zsini;
    const a2 = cosim * a7 + sinim * a8;
    const a4 = cosim * a9 + sinim * a10;
    const a5 = -sinim * a7 + cosim * a8;
    const a6 = -sinim * a9 + cosim * a10;

    const x1 = a1 * cosomm + a2 * sinomm;
    const x2 = a3 * cosomm + a4 * sinomm;
    const x3 = -a1 * sinomm + a2 * cosomm;
    const x4 = -a3 * sinomm + a4 * cosomm;
    const x5 = a5 * sinomm;
    const x6 = a6 * sinomm;
    const x7 = a5 * cosomm;
    const x8 = a6 * cosomm;

    z31 = 12.0 * x1 * x1 - 3.0 * x3 * x3;
    z32 = 24.0 * x1 * x2 - 6.0 * x3 * x4;
    z33 = 12.0 * x2 * x2 - 3.0 * x4 * x4;
    z1 = 3.0 * (a1 * a1 + a2 * a2) + z31 * emsq;
    z2 = 6.0 * (a1 * a3 + a2 * a4) + z32 * emsq;
    z3 = 3.0 * (a3 * a3 + a4 * a4) + z33 * emsq;
    z11 = -6.0 * a1 * a5 + emsq * (-24.0 * x1 * x7 - 6.0 * x3 * x5);
    z12 = -6.0 * (a1 * a6 + a3 * a5) + emsq * (-24.0 * (x2 * x7 + x1 * x8) - 6.0 * (x3 * x6 + x4 * x5));
    z13 = -6.0 * a3 * a6 + emsq * (-24.0 * x2 * x8 - 6.0 * x4 * x6);
    z21 = 6.0 * a2 * a5 + emsq * (24.0 * x1 * x5 - 6.0 * x3 * x7);
    z22 = 6.0 * (a4 * a5 + a2 * a6) + emsq * (24.0 * (x2 * x5 + x1 * x6) - 6.0 * (x4 * x7 + x3 * x8));
    z23 = 6.0 * a4 * a6 + emsq * (24.0 * x2 * x6 - 6.0 * x4 * x8);
    z1 = z1 + z1 + betasq * z31;
    z2 = z2 + z2 + betasq * z32;
    z3 = z3 + z3 + betasq * z33;
    s3 = cc * xnoi;
    s2 = (-0.5 * s3) / rtemsq;
    s4 = s3 * rtemsq;
    s1 = -15.0 * em * s4;
    s5 = x1 * x3 + x2 * x4;
    s6 = x2 * x3 + x1 * x4;
    s7 = x2 * x4 - x1 * x3;

    // the solar terms kept, the lunar ones next
    if (lsflg === 1) {
      ss1 = s1; ss2 = s2; ss3 = s3; ss4 = s4; ss5 = s5; ss6 = s6; ss7 = s7;
      sz1 = z1; sz2 = z2; sz3 = z3; sz11 = z11; sz12 = z12; sz13 = z13;
      sz21 = z21; sz22 = z22; sz23 = z23; sz31 = z31; sz32 = z32; sz33 = z33;
      zcosg = zcosgl;
      zsing = zsingl;
      zcosi = zcosil;
      zsini = zsinil;
      zcosh = zcoshl * cnodm + zsinhl * snodm;
      zsinh = snodm * zcoshl - cnodm * zsinhl;
      cc = c1l;
    }
  }

  s.zmol = (4.7199672 + 0.22997150 * day - gam) % TWO_PI;
  s.zmos = (6.2565837 + 0.017201977 * day) % TWO_PI;

  // the solar terms
  s.se2 = 2.0 * ss1 * ss6;
  s.se3 = 2.0 * ss1 * ss7;
  s.si2 = 2.0 * ss2 * sz12;
  s.si3 = 2.0 * ss2 * (sz13 - sz11);
  s.sl2 = -2.0 * ss3 * sz2;
  s.sl3 = -2.0 * ss3 * (sz3 - sz1);
  s.sl4 = -2.0 * ss3 * (-21.0 - 9.0 * emsq) * zes;
  s.sgh2 = 2.0 * ss4 * sz32;
  s.sgh3 = 2.0 * ss4 * (sz33 - sz31);
  s.sgh4 = -18.0 * ss4 * zes;
  s.sh2 = -2.0 * ss2 * sz22;
  s.sh3 = -2.0 * ss2 * (sz23 - sz21);

  // the lunar terms
  s.ee2 = 2.0 * s1 * s6;
  s.e3 = 2.0 * s1 * s7;
  s.xi2 = 2.0 * s2 * z12;
  s.xi3 = 2.0 * s2 * (z13 - z11);
  s.xl2 = -2.0 * s3 * z2;
  s.xl3 = -2.0 * s3 * (z3 - z1);
  s.xl4 = -2.0 * s3 * (-21.0 - 9.0 * emsq) * zel;
  s.xgh2 = 2.0 * s4 * z32;
  s.xgh3 = 2.0 * s4 * (z33 - z31);
  s.xgh4 = -18.0 * s4 * zel;
  s.xh2 = -2.0 * s2 * z22;
  s.xh3 = -2.0 * s2 * (z23 - z21);

  return {
    snodm, cnodm, sinim, cosim, sinomm, cosomm, day, em, emsq, gam, rtemsq,
    s1, s2, s3, s4, s5, s6, s7, ss1, ss2, ss3, ss4, ss5, ss6, ss7,
    sz1, sz2, sz3, sz11, sz12, sz13, sz21, sz22, sz23, sz31, sz32, sz33,
    nm, z1, z2, z3, z11, z12, z13, z21, z22, z23, z31, z32, z33,
  };
}

// ─── deep space: dsinit ─────────────────────────────────────────────────────

interface MeanState { em: number; argpm: number; inclm: number; mm: number; nm: number; nodem: number }

const RPTIM = 4.37526908801129966e-3; // the Earth's rotation, rad/min (7.29211514668855e-5 rad/s)

/**
 * dsinit: the deep-space secular rates, and for orbits of half a day (e ≥ 0.5)
 * and a day, the resonance terms of the geopotential; writes them into `s`
 * and the epoch's mean state into `m`.
 */
function dsinit(
  s: Satrec, d: Dscom, t: number, tc: number, xpidot: number, eccsq: number, m: MeanState,
): number {
  const q22 = 1.7891679e-6, q31 = 2.1460748e-6, q33 = 2.2123015e-7;
  const root22 = 1.7891679e-6, root44 = 7.3636953e-9, root54 = 2.1765803e-9;
  const root32 = 3.7393792e-7, root52 = 1.1428639e-7;
  const znl = 1.5835218e-4, zns = 1.19459e-5;
  const { cosim, sinim, s1, s2, s3, s4, s5, ss1, ss2, ss3, ss4, ss5 } = d;
  const { sz1, sz3, sz11, sz13, sz21, sz23, sz31, sz33, z1, z3, z11, z13, z21, z23, z31, z33 } = d;
  let emsq = d.emsq;

  // resonance flag: 1 a day, 2 half a day
  s.irez = 0;
  if (m.nm < 0.0052359877 && m.nm > 0.0034906585) s.irez = 1;
  if (m.nm >= 8.26e-3 && m.nm <= 9.24e-3 && m.em >= 0.5) s.irez = 2;

  // the solar terms
  const ses = ss1 * zns * ss5;
  const sis = ss2 * zns * (sz11 + sz13);
  const sls = -zns * ss3 * (sz1 + sz3 - 14.0 - 6.0 * emsq);
  const sghs = ss4 * zns * (sz31 + sz33 - 6.0);
  let shs = -zns * ss2 * (sz21 + sz23);
  // sgp4fix for 180° inclination
  if (m.inclm < 5.2359877e-2 || m.inclm > PI - 5.2359877e-2) shs = 0.0;
  if (sinim !== 0.0) shs = shs / sinim;
  const sgs = sghs - cosim * shs;

  // the lunar terms
  s.dedt = ses + s1 * znl * s5;
  s.didt = sis + s2 * znl * (z11 + z13);
  s.dmdt = sls - znl * s3 * (z1 + z3 - 14.0 - 6.0 * emsq);
  const sghl = s4 * znl * (z31 + z33 - 6.0);
  let shll = -znl * s2 * (z21 + z23);
  if (m.inclm < 5.2359877e-2 || m.inclm > PI - 5.2359877e-2) shll = 0.0;
  s.domdt = sgs + sghl;
  s.dnodt = shs;
  if (sinim !== 0.0) {
    s.domdt = s.domdt - (cosim / sinim) * shll;
    s.dnodt = s.dnodt + shll / sinim;
  }

  // the deep-space resonance effects
  let dndt = 0.0;
  const theta = (s.gsto + tc * RPTIM) % TWO_PI;
  m.em = m.em + s.dedt * t;
  m.inclm = m.inclm + s.didt * t;
  m.argpm = m.argpm + s.domdt * t;
  m.nodem = m.nodem + s.dnodt * t;
  m.mm = m.mm + s.dmdt * t;
  // sgp4fix for negative inclinations: the reference leaves the flip out here

  if (s.irez !== 0) {
    const aonv = Math.pow(m.nm / s.xke, X2O3);

    // the geopotential resonance for 12-hour orbits
    if (s.irez === 2) {
      const cosisq = cosim * cosim;
      const emo = m.em;
      m.em = s.ecco;
      const emsqo = emsq;
      emsq = eccsq;
      const em = m.em;
      const eoc = em * emsq;
      const g201 = -0.306 - (em - 0.64) * 0.440;
      let g211: number, g310: number, g322: number, g410: number, g422: number, g520: number;
      let g521: number, g532: number, g533: number;
      if (em <= 0.65) {
        g211 = 3.616 - 13.2470 * em + 16.2900 * emsq;
        g310 = -19.302 + 117.3900 * em - 228.4190 * emsq + 156.5910 * eoc;
        g322 = -18.9068 + 109.7927 * em - 214.6334 * emsq + 146.5816 * eoc;
        g410 = -41.122 + 242.6940 * em - 471.0940 * emsq + 313.9530 * eoc;
        g422 = -146.407 + 841.8800 * em - 1629.014 * emsq + 1083.4350 * eoc;
        g520 = -532.114 + 3017.977 * em - 5740.032 * emsq + 3708.2760 * eoc;
      } else {
        g211 = -72.099 + 331.819 * em - 508.738 * emsq + 266.724 * eoc;
        g310 = -346.844 + 1582.851 * em - 2415.925 * emsq + 1246.113 * eoc;
        g322 = -342.585 + 1554.908 * em - 2366.899 * emsq + 1215.972 * eoc;
        g410 = -1052.797 + 4758.686 * em - 7193.992 * emsq + 3651.957 * eoc;
        g422 = -3581.690 + 16178.110 * em - 24462.770 * emsq + 12422.520 * eoc;
        if (em > 0.715) g520 = -5149.66 + 29936.92 * em - 54087.36 * emsq + 31324.56 * eoc;
        else g520 = 1464.74 - 4664.75 * em + 3763.64 * emsq;
      }
      if (em < 0.7) {
        g533 = -919.22770 + 4988.6100 * em - 9064.7700 * emsq + 5542.21 * eoc;
        g521 = -822.71072 + 4568.6173 * em - 8491.4146 * emsq + 5337.524 * eoc;
        g532 = -853.66600 + 4690.2500 * em - 8624.7700 * emsq + 5341.4 * eoc;
      } else {
        g533 = -37995.780 + 161616.52 * em - 229838.20 * emsq + 109377.94 * eoc;
        g521 = -51752.104 + 218913.95 * em - 309468.16 * emsq + 146349.42 * eoc;
        g532 = -40023.880 + 170470.89 * em - 242699.48 * emsq + 115605.82 * eoc;
      }

      const sini2 = sinim * sinim;
      const f220 = 0.75 * (1.0 + 2.0 * cosim + cosisq);
      const f221 = 1.5 * sini2;
      const f321 = 1.875 * sinim * (1.0 - 2.0 * cosim - 3.0 * cosisq);
      const f322 = -1.875 * sinim * (1.0 + 2.0 * cosim - 3.0 * cosisq);
      const f441 = 35.0 * sini2 * f220;
      const f442 = 39.3750 * sini2 * sini2;
      const f522 = 9.84375 * sinim * (sini2 * (1.0 - 2.0 * cosim - 5.0 * cosisq) + 0.33333333 * (-2.0 + 4.0 * cosim + 6.0 * cosisq));
      const f523 = sinim * (4.92187512 * sini2 * (-2.0 - 4.0 * cosim + 10.0 * cosisq) + 6.56250012 * (1.0 + 2.0 * cosim - 3.0 * cosisq));
      const f542 = 29.53125 * sinim * (2.0 - 8.0 * cosim + cosisq * (-12.0 + 8.0 * cosim + 10.0 * cosisq));
      const f543 = 29.53125 * sinim * (-2.0 - 8.0 * cosim + cosisq * (12.0 + 8.0 * cosim - 10.0 * cosisq));
      const xno2 = m.nm * m.nm;
      const ainv2 = aonv * aonv;
      let temp1 = 3.0 * xno2 * ainv2;
      let temp = temp1 * root22;
      s.d2201 = temp * f220 * g201;
      s.d2211 = temp * f221 * g211;
      temp1 = temp1 * aonv;
      temp = temp1 * root32;
      s.d3210 = temp * f321 * g310;
      s.d3222 = temp * f322 * g322;
      temp1 = temp1 * aonv;
      temp = 2.0 * temp1 * root44;
      s.d4410 = temp * f441 * g410;
      s.d4422 = temp * f442 * g422;
      temp1 = temp1 * aonv;
      temp = temp1 * root52;
      s.d5220 = temp * f522 * g520;
      s.d5232 = temp * f523 * g532;
      temp = 2.0 * temp1 * root54;
      s.d5421 = temp * f542 * g521;
      s.d5433 = temp * f543 * g533;
      s.xlamo = (s.mo + s.nodeo + s.nodeo - theta - theta) % TWO_PI;
      s.xfact = s.mdot + s.dmdt + 2.0 * (s.nodedot + s.dnodt - RPTIM) - s.no_unkozai;
      m.em = emo;
      emsq = emsqo;
    }

    // the synchronous resonance terms
    if (s.irez === 1) {
      const g200 = 1.0 + emsq * (-2.5 + 0.8125 * emsq);
      const g310 = 1.0 + 2.0 * emsq;
      const g300 = 1.0 + emsq * (-6.0 + 6.60937 * emsq);
      const f220 = 0.75 * (1.0 + cosim) * (1.0 + cosim);
      const f311 = 0.9375 * sinim * sinim * (1.0 + 3.0 * cosim) - 0.75 * (1.0 + cosim);
      let f330 = 1.0 + cosim;
      f330 = 1.875 * f330 * f330 * f330;
      s.del1 = 3.0 * m.nm * m.nm * aonv * aonv;
      s.del2 = 2.0 * s.del1 * f220 * g200 * q22;
      s.del3 = 3.0 * s.del1 * f330 * g300 * q33 * aonv;
      s.del1 = s.del1 * f311 * g310 * q31 * aonv;
      s.xlamo = (s.mo + s.nodeo + s.argpo - theta) % TWO_PI;
      s.xfact = s.mdot + xpidot - RPTIM + s.dmdt + s.domdt + s.dnodt - s.no_unkozai;
    }

    // the integrator starts at the epoch
    s.xli = s.xlamo;
    s.xni = s.no_unkozai;
    s.atime = 0.0;
    m.nm = s.no_unkozai + dndt;
  }
  return dndt;
}

// ─── deep space: dspace ─────────────────────────────────────────────────────

/**
 * dspace: the deep-space secular terms at time t, and the resonance
 * integrated (Euler–Maclaurin, 720-minute steps) from the epoch or from the
 * last step when it lies between. Works for negative times.
 */
function dspace(s: Satrec, t: number, tc: number, m: MeanState): number {
  const fasx2 = 0.13130908, fasx4 = 2.8843198, fasx6 = 0.37448087;
  const g22 = 5.7686396, g32 = 0.95240898, g44 = 1.8014998, g52 = 1.0508330, g54 = 4.4108898;
  const stepp = 720.0, stepn = -720.0, step2 = 259200.0;

  let dndt = 0.0;
  const theta = (s.gsto + tc * RPTIM) % TWO_PI;
  m.em = m.em + s.dedt * t;
  m.inclm = m.inclm + s.didt * t;
  m.argpm = m.argpm + s.domdt * t;
  m.nodem = m.nodem + s.dnodt * t;
  m.mm = m.mm + s.dmdt * t;

  let ft = 0.0;
  if (s.irez !== 0) {
    // sgp4fix: restart from the epoch when time has gone back past the last step, or crossed it
    if (s.atime === 0.0 || t * s.atime <= 0.0 || Math.abs(t) < Math.abs(s.atime)) {
      s.atime = 0.0;
      s.xni = s.no_unkozai;
      s.xli = s.xlamo;
    }
    const delt = t > 0.0 ? stepp : stepn;

    let xndt = 0, xldot = 0, xnddt = 0;
    for (;;) {
      if (s.irez !== 2) {
        // the near-synchronous terms
        xndt = s.del1 * Math.sin(s.xli - fasx2) + s.del2 * Math.sin(2.0 * (s.xli - fasx4)) + s.del3 * Math.sin(3.0 * (s.xli - fasx6));
        xldot = s.xni + s.xfact;
        xnddt = s.del1 * Math.cos(s.xli - fasx2) + 2.0 * s.del2 * Math.cos(2.0 * (s.xli - fasx4)) + 3.0 * s.del3 * Math.cos(3.0 * (s.xli - fasx6));
        xnddt = xnddt * xldot;
      } else {
        // the near-half-day terms
        const xomi = s.argpo + s.argpdot * s.atime;
        const x2omi = xomi + xomi;
        const x2li = s.xli + s.xli;
        xndt = s.d2201 * Math.sin(x2omi + s.xli - g22) + s.d2211 * Math.sin(s.xli - g22)
          + s.d3210 * Math.sin(xomi + s.xli - g32) + s.d3222 * Math.sin(-xomi + s.xli - g32)
          + s.d4410 * Math.sin(x2omi + x2li - g44) + s.d4422 * Math.sin(x2li - g44)
          + s.d5220 * Math.sin(xomi + s.xli - g52) + s.d5232 * Math.sin(-xomi + s.xli - g52)
          + s.d5421 * Math.sin(xomi + x2li - g54) + s.d5433 * Math.sin(-xomi + x2li - g54);
        xldot = s.xni + s.xfact;
        xnddt = s.d2201 * Math.cos(x2omi + s.xli - g22) + s.d2211 * Math.cos(s.xli - g22)
          + s.d3210 * Math.cos(xomi + s.xli - g32) + s.d3222 * Math.cos(-xomi + s.xli - g32)
          + s.d5220 * Math.cos(xomi + s.xli - g52) + s.d5232 * Math.cos(-xomi + s.xli - g52)
          + 2.0 * (s.d4410 * Math.cos(x2omi + x2li - g44) + s.d4422 * Math.cos(x2li - g44)
            + s.d5421 * Math.cos(xomi + x2li - g54) + s.d5433 * Math.cos(-xomi + x2li - g54));
        xnddt = xnddt * xldot;
      }
      if (Math.abs(t - s.atime) >= stepp) {
        s.xli = s.xli + xldot * delt + xndt * step2;
        s.xni = s.xni + xndt * delt + xnddt * step2;
        s.atime = s.atime + delt;
      } else {
        ft = t - s.atime;
        break;
      }
    }

    m.nm = s.xni + xndt * ft + xnddt * ft * ft * 0.5;
    const xl = s.xli + xldot * ft + xndt * ft * ft * 0.5;
    if (s.irez !== 1) m.mm = xl - 2.0 * m.nodem + 2.0 * theta;
    else m.mm = xl - m.nodem - m.argpm + theta;
    dndt = m.nm - s.no_unkozai;
    m.nm = s.no_unkozai + dndt;
  }
  return dndt;
}

// ─── initl ──────────────────────────────────────────────────────────────────

interface Initl {
  ainv: number; ao: number; con42: number; cosio: number; cosio2: number; eccsq: number;
  omeosq: number; posq: number; rp: number; rteosq: number; sinio: number;
}

/**
 * initl: the mean motion recovered from the element set's Kozai one (the
 * element set's mean motion is Kozai's; the theory runs on Brouwer's), and
 * Greenwich sidereal time at the epoch.
 */
function initl(s: Satrec, epoch: number): Initl {
  const ecco = s.ecco;
  const eccsq = ecco * ecco;
  const omeosq = 1.0 - eccsq;
  const rteosq = Math.sqrt(omeosq);
  const cosio = Math.cos(s.inclo);
  const cosio2 = cosio * cosio;

  // un-Kozai the mean motion
  const ak = Math.pow(s.xke / s.no_kozai, X2O3);
  const d1 = (0.75 * s.j2 * (3.0 * cosio2 - 1.0)) / (rteosq * omeosq);
  let del = d1 / (ak * ak);
  const adel = ak * (1.0 - del * del - del * (1.0 / 3.0 + (134.0 * del * del) / 81.0));
  del = d1 / (adel * adel);
  s.no_unkozai = s.no_kozai / (1.0 + del);

  const ao = Math.pow(s.xke / s.no_unkozai, X2O3);
  const sinio = Math.sin(s.inclo);
  const po = ao * omeosq;
  const con42 = 1.0 - 5.0 * cosio2;
  s.con41 = -con42 - cosio2 - cosio2;
  const ainv = 1.0 / ao;
  const posq = po * po;
  const rp = ao * (1.0 - ecco);
  s.method = 'n';

  // sgp4fix: the AFSPC code's own sidereal time, or the modern one
  if (s.operationmode === 'a') {
    const ts70 = epoch - 7305.0;
    const ds70 = Math.floor(ts70 + 1.0e-8);
    const tfrac = ts70 - ds70;
    // the sidereal time at 1970 January 0
    const c1 = 1.72027916940703639e-2;
    const thgr70 = 1.7321343856509374;
    const fk5r = 5.07551419432269442e-15;
    const c1p2p = c1 + TWO_PI;
    let gsto = (thgr70 + c1 * ds70 + c1p2p * tfrac + ts70 * ts70 * fk5r) % TWO_PI;
    if (gsto < 0.0) gsto = gsto + TWO_PI;
    s.gsto = gsto;
  } else {
    s.gsto = gstime(epoch + 2433281.5);
  }
  return { ainv, ao, con42, cosio, cosio2, eccsq, omeosq, posq, rp, rteosq, sinio };
}

// ─── sgp4init ───────────────────────────────────────────────────────────────

/**
 * sgp4init: everything that depends only on the element set, worked out
 * once. `epoch` is days since 1949 December 31 0h UTC (the theory's), the
 * element set's Julian date less 2 433 281.5. The result carries an error
 * code when the elements cannot be propagated.
 */
export function sgp4init(
  satrec: Satrec, gravity: GravityModel, opsmode: OpsMode, epoch: number,
  xbstar: number, xndot: number, xnddot: number, xecco: number, xargpo: number,
  xinclo: number, xmo: number, xnoKozai: number, xnodeo: number,
): Satrec {
  const s = satrec;
  const temp4 = 1.5e-12;

  // the near-Earth and deep-space variables start at zero
  s.isimp = 0; s.method = 'n'; s.aycof = 0.0; s.con41 = 0.0; s.cc1 = 0.0; s.cc4 = 0.0; s.cc5 = 0.0;
  s.d2 = 0.0; s.d3 = 0.0; s.d4 = 0.0; s.delmo = 0.0; s.eta = 0.0; s.argpdot = 0.0; s.omgcof = 0.0;
  s.sinmao = 0.0; s.t = 0.0; s.t2cof = 0.0; s.t3cof = 0.0; s.t4cof = 0.0; s.t5cof = 0.0; s.x1mth2 = 0.0;
  s.x7thm1 = 0.0; s.mdot = 0.0; s.nodedot = 0.0; s.xlcof = 0.0; s.xmcof = 0.0; s.nodecf = 0.0;
  s.irez = 0; s.d2201 = 0.0; s.d2211 = 0.0; s.d3210 = 0.0; s.d3222 = 0.0; s.d4410 = 0.0; s.d4422 = 0.0;
  s.d5220 = 0.0; s.d5232 = 0.0; s.d5421 = 0.0; s.d5433 = 0.0; s.dedt = 0.0; s.del1 = 0.0; s.del2 = 0.0;
  s.del3 = 0.0; s.didt = 0.0; s.dmdt = 0.0; s.dnodt = 0.0; s.domdt = 0.0; s.e3 = 0.0; s.ee2 = 0.0;
  s.peo = 0.0; s.pgho = 0.0; s.pho = 0.0; s.pinco = 0.0; s.plo = 0.0; s.se2 = 0.0; s.se3 = 0.0;
  s.sgh2 = 0.0; s.sgh3 = 0.0; s.sgh4 = 0.0; s.sh2 = 0.0; s.sh3 = 0.0; s.si2 = 0.0; s.si3 = 0.0;
  s.sl2 = 0.0; s.sl3 = 0.0; s.sl4 = 0.0; s.gsto = 0.0; s.xfact = 0.0; s.xgh2 = 0.0; s.xgh3 = 0.0;
  s.xgh4 = 0.0; s.xh2 = 0.0; s.xh3 = 0.0; s.xi2 = 0.0; s.xi3 = 0.0; s.xl2 = 0.0; s.xl3 = 0.0;
  s.xl4 = 0.0; s.xlamo = 0.0; s.zmol = 0.0; s.zmos = 0.0; s.atime = 0.0; s.xli = 0.0; s.xni = 0.0;

  const g = gravConst(gravity);
  s.tumin = g.tumin; s.mu = g.mu; s.radiusearthkm = g.radiusearthkm; s.xke = g.xke;
  s.j2 = g.j2; s.j3 = g.j3; s.j4 = g.j4; s.j3oj2 = g.j3oj2;

  s.error = 0;
  s.operationmode = opsmode;
  s.bstar = xbstar;
  s.ndot = xndot;
  s.nddot = xnddot;
  s.ecco = xecco;
  s.argpo = xargpo;
  s.inclo = xinclo;
  s.mo = xmo;
  s.no_kozai = xnoKozai;
  s.nodeo = xnodeo;
  s.am = 0.0; s.em = 0.0; s.im = 0.0; s.Om = 0.0; s.mm = 0.0; s.nm = 0.0;

  const ss = 78.0 / s.radiusearthkm + 1.0;
  // sgp4fix: the density constant worked out from its definition
  const qzms2ttemp = (120.0 - 78.0) / s.radiusearthkm;
  const qzms2t = qzms2ttemp * qzms2ttemp * qzms2ttemp * qzms2ttemp;

  s.init = 'y';
  s.t = 0.0;

  const il = initl(s, epoch);
  const { ao, con42, cosio, cosio2, eccsq, omeosq, posq, rp, rteosq, sinio } = il;
  s.a = Math.pow(s.no_unkozai * s.tumin, -2.0 / 3.0);
  s.alta = s.a * (1.0 + s.ecco) - 1.0;
  s.altp = s.a * (1.0 - s.ecco) - 1.0;
  s.error = 0;

  // sgp4fix: the check that the perigee is above the ground was taken out; the decay check in sgp4 handles it
  if (omeosq >= 0.0 || s.no_unkozai >= 0.0) {
    s.isimp = 0;
    if (rp < 220.0 / s.radiusearthkm + 1.0) s.isimp = 1;
    let sfour = ss;
    let qzms24 = qzms2t;
    const perige = (rp - 1.0) * s.radiusearthkm;

    // perigees below 156 km change the atmosphere's reference height
    if (perige < 156.0) {
      sfour = perige - 78.0;
      if (perige < 98.0) sfour = 20.0;
      const qzms24temp = (120.0 - sfour) / s.radiusearthkm;
      qzms24 = qzms24temp * qzms24temp * qzms24temp * qzms24temp;
      sfour = sfour / s.radiusearthkm + 1.0;
    }
    const pinvsq = 1.0 / posq;

    const tsi = 1.0 / (ao - sfour);
    s.eta = ao * s.ecco * tsi;
    const etasq = s.eta * s.eta;
    const eeta = s.ecco * s.eta;
    const psisq = Math.abs(1.0 - etasq);
    const coef = qzms24 * Math.pow(tsi, 4.0);
    const coef1 = coef / Math.pow(psisq, 3.5);
    const cc2 = coef1 * s.no_unkozai * (ao * (1.0 + 1.5 * etasq + eeta * (4.0 + etasq))
      + 0.375 * s.j2 * tsi / psisq * s.con41 * (8.0 + 3.0 * etasq * (8.0 + etasq)));
    s.cc1 = s.bstar * cc2;
    let cc3 = 0.0;
    if (s.ecco > 1.0e-4) cc3 = (-2.0 * coef * tsi * s.j3oj2 * s.no_unkozai * sinio) / s.ecco;
    s.x1mth2 = 1.0 - cosio2;
    s.cc4 = 2.0 * s.no_unkozai * coef1 * ao * omeosq
      * (s.eta * (2.0 + 0.5 * etasq) + s.ecco * (0.5 + 2.0 * etasq)
        - (s.j2 * tsi) / (ao * psisq) * (-3.0 * s.con41 * (1.0 - 2.0 * eeta + etasq * (1.5 - 0.5 * eeta))
          + 0.75 * s.x1mth2 * (2.0 * etasq - eeta * (1.0 + etasq)) * Math.cos(2.0 * s.argpo)));
    s.cc5 = 2.0 * coef1 * ao * omeosq * (1.0 + 2.75 * (etasq + eeta) + eeta * etasq);
    const cosio4 = cosio2 * cosio2;
    const temp1 = 1.5 * s.j2 * pinvsq * s.no_unkozai;
    const temp2 = 0.5 * temp1 * s.j2 * pinvsq;
    const temp3 = -0.46875 * s.j4 * pinvsq * pinvsq * s.no_unkozai;
    s.mdot = s.no_unkozai + 0.5 * temp1 * rteosq * s.con41 + 0.0625 * temp2 * rteosq * (13.0 - 78.0 * cosio2 + 137.0 * cosio4);
    s.argpdot = -0.5 * temp1 * con42 + 0.0625 * temp2 * (7.0 - 114.0 * cosio2 + 395.0 * cosio4)
      + temp3 * (3.0 - 36.0 * cosio2 + 49.0 * cosio4);
    const xhdot1 = -temp1 * cosio;
    s.nodedot = xhdot1 + (0.5 * temp2 * (4.0 - 19.0 * cosio2) + 2.0 * temp3 * (3.0 - 7.0 * cosio2)) * cosio;
    const xpidot = s.argpdot + s.nodedot;
    s.omgcof = s.bstar * cc3 * Math.cos(s.argpo);
    s.xmcof = 0.0;
    if (s.ecco > 1.0e-4) s.xmcof = (-X2O3 * coef * s.bstar) / eeta;
    s.nodecf = 3.5 * omeosq * xhdot1 * s.cc1;
    s.t2cof = 1.5 * s.cc1;
    // sgp4fix for the divide by zero at 180° inclination
    if (Math.abs(cosio + 1.0) > 1.5e-12) s.xlcof = (-0.25 * s.j3oj2 * sinio * (3.0 + 5.0 * cosio)) / (1.0 + cosio);
    else s.xlcof = (-0.25 * s.j3oj2 * sinio * (3.0 + 5.0 * cosio)) / temp4;
    s.aycof = -0.5 * s.j3oj2 * sinio;
    // sgp4fix: pow of an integer power written as products
    const delmotemp = 1.0 + s.eta * Math.cos(s.mo);
    s.delmo = delmotemp * delmotemp * delmotemp;
    s.sinmao = Math.sin(s.mo);
    s.x7thm1 = 7.0 * cosio2 - 1.0;

    // deep space: a period of 225 minutes or more
    if ((2 * PI) / s.no_unkozai >= 225.0) {
      s.method = 'd';
      s.isimp = 1;
      const tc = 0.0;
      const inclm = s.inclo;

      const d = dscom(s, epoch, s.ecco, s.argpo, tc, s.inclo, s.nodeo, s.no_unkozai);
      const a: Angles = { ep: s.ecco, inclp: s.inclo, nodep: s.nodeo, argpp: s.argpo, mp: s.mo };
      dpper(s, s.init, a, s.operationmode);
      s.ecco = a.ep; s.inclo = a.inclp; s.nodeo = a.nodep; s.argpo = a.argpp; s.mo = a.mp;

      const m: MeanState = { em: d.em, argpm: 0.0, inclm, mm: 0.0, nm: d.nm, nodem: 0.0 };
      dsinit(s, d, s.t, tc, xpidot, eccsq, m);
    }

    // the near-Earth drag terms, for a perigee over 220 km
    if (s.isimp !== 1) {
      const cc1sq = s.cc1 * s.cc1;
      s.d2 = 4.0 * ao * tsi * cc1sq;
      const temp = (s.d2 * tsi * s.cc1) / 3.0;
      s.d3 = (17.0 * ao + sfour) * temp;
      s.d4 = 0.5 * temp * ao * tsi * (221.0 * ao + 31.0 * sfour) * s.cc1;
      s.t3cof = s.d2 + 2.0 * cc1sq;
      s.t4cof = 0.25 * (3.0 * s.d3 + s.cc1 * (12.0 * s.d2 + 10.0 * cc1sq));
      s.t5cof = 0.2 * (3.0 * s.d4 + 12.0 * s.cc1 * s.d3 + 6.0 * s.d2 * s.d2 + 15.0 * cc1sq * (2.0 * s.d2 + cc1sq));
    }
  }

  // the epoch itself, so every other constant is set
  const r = [0, 0, 0], v = [0, 0, 0];
  sgp4(s, 0.0, r, v);
  s.init = 'n';
  return s;
}

// ─── sgp4 ───────────────────────────────────────────────────────────────────

/**
 * sgp4: the position and velocity `tsince` minutes after the epoch, km and
 * km/s in TEME, written into `r` and `v`; the error code (0 when sound). On
 * error 1–4 `r` and `v` are left as they were; error 6 (decayed) writes the
 * position below the ground it found.
 */
export function sgp4(satrec: Satrec, tsince: number, r: number[], v: number[]): Sgp4Error {
  const s = satrec;
  const temp4 = 1.5e-12;
  const vkmpersec = (s.radiusearthkm * s.xke) / 60.0;

  s.t = tsince;
  s.error = 0;

  // the secular gravity and atmospheric drag
  const xmdf = s.mo + s.mdot * s.t;
  const argpdf = s.argpo + s.argpdot * s.t;
  const nodedf = s.nodeo + s.nodedot * s.t;
  let argpm = argpdf;
  let mm = xmdf;
  const t2 = s.t * s.t;
  let nodem = nodedf + s.nodecf * t2;
  let tempa = 1.0 - s.cc1 * s.t;
  let tempe = s.bstar * s.cc4 * s.t;
  let templ = s.t2cof * t2;

  if (s.isimp !== 1) {
    const delomg = s.omgcof * s.t;
    const delmtemp = 1.0 + s.eta * Math.cos(xmdf);
    const delm = s.xmcof * (delmtemp * delmtemp * delmtemp - s.delmo);
    const temp = delomg + delm;
    mm = xmdf + temp;
    argpm = argpdf - temp;
    const t3 = t2 * s.t;
    const t4 = t3 * s.t;
    tempa = tempa - s.d2 * t2 - s.d3 * t3 - s.d4 * t4;
    tempe = tempe + s.bstar * s.cc5 * (Math.sin(mm) - s.sinmao);
    templ = templ + s.t3cof * t3 + t4 * (s.t4cof + s.t * s.t5cof);
  }

  let nm = s.no_unkozai;
  let em = s.ecco;
  let inclm = s.inclo;
  if (s.method === 'd') {
    const tc = s.t;
    const m: MeanState = { em, argpm, inclm, mm, nm, nodem };
    dspace(s, s.t, tc, m);
    em = m.em; argpm = m.argpm; inclm = m.inclm; mm = m.mm; nm = m.nm; nodem = m.nodem;
  }

  if (nm <= 0.0) {
    s.error = 2;
    return 2;
  }
  const am = Math.pow(s.xke / nm, X2O3) * tempa * tempa;
  nm = s.xke / Math.pow(am, 1.5);
  em = em - tempe;

  // sgp4fix: the eccentricity tolerance
  if (em >= 1.0 || em < -0.001) {
    s.error = 1;
    return 1;
  }
  // sgp4fix: a circular orbit is taken as a nearly circular one
  if (em < 1.0e-6) em = 1.0e-6;
  mm = mm + s.no_unkozai * templ;
  let xlm = mm + argpm + nodem;
  nodem = nodem % TWO_PI;
  argpm = argpm % TWO_PI;
  xlm = xlm % TWO_PI;
  mm = (xlm - argpm - nodem) % TWO_PI;

  // the mean elements at this time, kept for anyone who asks
  s.am = am; s.em = em; s.im = inclm; s.Om = nodem; s.om = argpm; s.mm = mm; s.nm = nm;

  const sinim = Math.sin(inclm);
  const cosim = Math.cos(inclm);

  // the lunar–solar periodics
  let ep = em;
  let xincp = inclm;
  let argpp = argpm;
  let nodep = nodem;
  let mp = mm;
  let sinip = sinim;
  let cosip = cosim;
  if (s.method === 'd') {
    const a: Angles = { ep, inclp: xincp, nodep, argpp, mp };
    dpper(s, 'n', a, s.operationmode);
    ep = a.ep; xincp = a.inclp; nodep = a.nodep; argpp = a.argpp; mp = a.mp;
    if (xincp < 0.0) {
      xincp = -xincp;
      nodep = nodep + PI;
      argpp = argpp - PI;
    }
    if (ep < 0.0 || ep > 1.0) {
      s.error = 3;
      return 3;
    }
  }

  // the long-period periodics
  if (s.method === 'd') {
    sinip = Math.sin(xincp);
    cosip = Math.cos(xincp);
    s.aycof = -0.5 * s.j3oj2 * sinip;
    // sgp4fix for the divide by zero at 180° inclination
    if (Math.abs(cosip + 1.0) > 1.5e-12) s.xlcof = (-0.25 * s.j3oj2 * sinip * (3.0 + 5.0 * cosip)) / (1.0 + cosip);
    else s.xlcof = (-0.25 * s.j3oj2 * sinip * (3.0 + 5.0 * cosip)) / temp4;
  }
  const axnl = ep * Math.cos(argpp);
  let temp = 1.0 / (am * (1.0 - ep * ep));
  const aynl = ep * Math.sin(argpp) + temp * s.aycof;
  const xl = mp + argpp + nodep + temp * s.xlcof * axnl;

  // Kepler's equation, in the equinoctial form
  const u = (xl - nodep) % TWO_PI;
  let eo1 = u;
  let tem5 = 9999.9;
  let ktr = 1;
  let sineo1 = 0, coseo1 = 0;
  // sgp4fix: the step is limited, so a bad start cannot throw it off
  while (Math.abs(tem5) >= 1.0e-12 && ktr <= 10) {
    sineo1 = Math.sin(eo1);
    coseo1 = Math.cos(eo1);
    tem5 = 1.0 - coseo1 * axnl - sineo1 * aynl;
    tem5 = (u - aynl * coseo1 + axnl * sineo1 - eo1) / tem5;
    if (Math.abs(tem5) >= 0.95) tem5 = tem5 > 0.0 ? 0.95 : -0.95;
    eo1 = eo1 + tem5;
    ktr = ktr + 1;
  }

  // the short-period preliminary quantities
  const ecose = axnl * coseo1 + aynl * sineo1;
  const esine = axnl * sineo1 - aynl * coseo1;
  const el2 = axnl * axnl + aynl * aynl;
  const pl = am * (1.0 - el2);
  let mrt = 0.0;
  if (pl < 0.0) {
    s.error = 4;
    return 4;
  }
  const rl = am * (1.0 - ecose);
  const rdotl = (Math.sqrt(am) * esine) / rl;
  const rvdotl = Math.sqrt(pl) / rl;
  const betal = Math.sqrt(1.0 - el2);
  temp = esine / (1.0 + betal);
  const sinu = (am / rl) * (sineo1 - aynl - axnl * temp);
  const cosu = (am / rl) * (coseo1 - axnl + aynl * temp);
  let su = Math.atan2(sinu, cosu);
  const sin2u = (cosu + cosu) * sinu;
  const cos2u = 1.0 - 2.0 * sinu * sinu;
  temp = 1.0 / pl;
  const temp1 = 0.5 * s.j2 * temp;
  const temp2 = temp1 * temp;

  // the short-period periodics
  if (s.method === 'd') {
    const cosisq = cosip * cosip;
    s.con41 = 3.0 * cosisq - 1.0;
    s.x1mth2 = 1.0 - cosisq;
    s.x7thm1 = 7.0 * cosisq - 1.0;
  }
  mrt = rl * (1.0 - 1.5 * temp2 * betal * s.con41) + 0.5 * temp1 * s.x1mth2 * cos2u;
  su = su - 0.25 * temp2 * s.x7thm1 * sin2u;
  const xnode = nodep + 1.5 * temp2 * cosip * sin2u;
  const xinc = xincp + 1.5 * temp2 * cosip * sinip * cos2u;
  const mvt = rdotl - (nm * temp1 * s.x1mth2 * sin2u) / s.xke;
  const rvdot = rvdotl + (nm * temp1 * (s.x1mth2 * cos2u + 1.5 * s.con41)) / s.xke;

  // the orientation vectors
  const sinsu = Math.sin(su);
  const cossu = Math.cos(su);
  const snod = Math.sin(xnode);
  const cnod = Math.cos(xnode);
  const sini = Math.sin(xinc);
  const cosi = Math.cos(xinc);
  const xmx = -snod * cosi;
  const xmy = cnod * cosi;
  const ux = xmx * sinsu + cnod * cossu;
  const uy = xmy * sinsu + snod * cossu;
  const uz = sini * sinsu;
  const vx = xmx * cossu - cnod * sinsu;
  const vy = xmy * cossu - snod * sinsu;
  const vz = sini * cossu;

  // position and velocity, km and km/s
  r[0] = mrt * ux * s.radiusearthkm;
  r[1] = mrt * uy * s.radiusearthkm;
  r[2] = mrt * uz * s.radiusearthkm;
  v[0] = (mvt * ux + rvdot * vx) * vkmpersec;
  v[1] = (mvt * uy + rvdot * vy) * vkmpersec;
  v[2] = (mvt * uz + rvdot * vz) * vkmpersec;

  // sgp4fix: decayed — below the Earth's surface
  if (mrt < 1.0) {
    s.error = 6;
    return 6;
  }
  return 0;
}

/**
 * gstime: Greenwich mean sidereal time, rad in [0, 2π), from a Julian date
 * in UT1 (Vallado, *Fundamentals of Astrodynamics and Applications*, eq. 3-45).
 */
export function gstime(jdut1: number): number {
  const tut1 = (jdut1 - 2451545.0) / 36525.0;
  let temp = -6.2e-6 * tut1 * tut1 * tut1 + 0.093104 * tut1 * tut1 + (876600.0 * 3600 + 8640184.812866) * tut1 + 67310.54841; // s
  temp = ((temp * DEG2RAD) / 240.0) % TWO_PI; // 360/86400 = 1/240, to degrees, to radians
  if (temp < 0.0) temp += TWO_PI;
  return temp;
}

// ─── for the rest of the program ────────────────────────────────────────────

export interface Sgp4Options {
  gravity?: GravityModel;
  opsmode?: OpsMode;
}

/** An element set ready to propagate (twoline2rv's last step). */
export function satrecFrom(el: ElementSet, opts: Sgp4Options = {}): Satrec {
  const s = new Satrec();
  s.satnum = el.satnum;
  s.jdsatepoch = el.jdEpoch;
  s.jdsatepochF = el.jdEpochFrac;
  return sgp4init(
    s, opts.gravity ?? 'wgs72', opts.opsmode ?? 'i', el.jdEpoch + el.jdEpochFrac - 2433281.5,
    el.bstar, el.ndot, el.nddot, el.ecco, el.argpo, el.inclo, el.mo, el.noKozai, el.nodeo,
  );
}

/** Minutes from the element set's epoch to Julian date `jd` (UTC), the two parts kept apart for precision. */
export const minutesSinceEpoch = (s: Satrec, jd: number): number => (jd - s.jdsatepoch) * 1440.0 - s.jdsatepochF * 1440.0;

export interface TemeState {
  error: Sgp4Error;
  /** m and m/s, TEME */
  r: [number, number, number];
  v: [number, number, number];
}

/** Where the satellite is at Julian date `jd` (UTC), SI units, TEME. */
export function propagateTo(s: Satrec, jd: number): TemeState {
  const r = [0, 0, 0], v = [0, 0, 0];
  const error = sgp4(s, minutesSinceEpoch(s, jd), r, v);
  return { error, r: [r[0] * 1e3, r[1] * 1e3, r[2] * 1e3], v: [v[0] * 1e3, v[1] * 1e3, v[2] * 1e3] };
}

/**
 * TEME to the Earth-fixed frame at Julian date `jd` (UTC for UT1): a turn
 * about the pole by Greenwich mean sidereal time, the Earth's rotation
 * taken out of the velocity (Vallado's teme2ecef without polar motion).
 */
export function temeToEcef(r: readonly number[], v: readonly number[], jd: number): { r: [number, number, number]; v: [number, number, number] } {
  const g = gstime(jd);
  const c = Math.cos(g), sn = Math.sin(g);
  const w = 7.29211514670698e-5; // rad/s, the rotation Vallado uses with it
  const rx = c * r[0] + sn * r[1], ry = -sn * r[0] + c * r[1];
  const vx = c * v[0] + sn * v[1] + w * ry, vy = -sn * v[0] + c * v[1] - w * rx;
  return { r: [rx, ry, r[2]], v: [vx, vy, v[2]] };
}
