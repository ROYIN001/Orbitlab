// Checker of the held-out time set (PF-10 gate). Usage:
//   node check_time.mjs <repo root> <heldout-time.json> [dump.json]
// Imports src/astro/base/time.ts directly (Node 22 strips erasable types). Today's eopAt is
// transcribed operation for operation from src/orbit/earth-orientation.ts, so no app module is loaded.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [root, setPath, dumpPath] = process.argv.slice(2);
const T = await import(pathToFileURL(`${root}/src/astro/base/time.ts`).href);
const H = JSON.parse(readFileSync(setPath, 'utf8'));
const J = (p) => ({ a: p[0], b: p[1] });
const dsec = (x, y) => ((x.a - y.a) + (x.b - y.b)) * 86400;
const JD1972 = 2441317.5, JD1960 = 2436934.5;
const dump = [];
let bad = 0;
const worst = {};
const see = (name, v, bound) => {
  if (!(v <= bound)) { bad++; if (bad <= 20) console.log(`  OUT ${name}: ${v} > ${bound}`); }
  worst[name] = Math.max(worst[name] ?? 0, Number.isNaN(v) ? Infinity : v);
};

for (const r of H.dat) {
  const u = J(r.utc), got = T.taiMinusUtc(u), t = r.utc[0] + r.utc[1];
  dump.push(got);
  if (t >= JD1972) see('dat, 1972 on (exact)', got === r.dat ? 0 : Math.abs(got - r.dat) + 1e-300, 0);
  else see(t < JD1960 ? 'dat, before 1960 (held)' : 'dat, drift years', Math.abs(got - r.dat), 1e-9);
  const tai = T.utcToTai(u);
  dump.push(tai.a, tai.b);
  // a part b of many days cannot carry a nanosecond: the bound is 1e-9 s or one step of b, whichever is larger
  see('utcToTai moves by dat', Math.abs(dsec(tai, u) - r.dat), Math.max(1e-9, Math.abs(u.b) * 2 ** -52 * 86400));
  see('utcToTai leaves a', tai.a === u.a ? 0 : 1, 0);
}
for (const p of H.roundTrip) {
  const u = J(p), back = T.taiToUtc(T.utcToTai(u));
  dump.push(back.a, back.b);
  see('round trip UTC-TAI-UTC', Math.abs(dsec(back, u)), 1e-9);
}
for (const p of H.roundTripDriftWindow) {
  const u = J(p), back = T.taiToUtc(T.utcToTai(u));
  dump.push(back.a, back.b);
  see('round trip, window before a drift step', Math.abs(dsec(back, u)), 3.3e-9);
}
for (const r of H.scales) {
  const u = J(r.utc), tai = T.utcToTai(u), tt = T.utcToTt(u), back = T.ttToUtc(tt), tt2 = T.taiToTt(tai), tai2 = T.ttToTai(tt2);
  dump.push(tai.a, tai.b, tt.a, tt.b, back.a, back.b);
  see('utcToTai against ERFA', Math.abs(dsec(tai, J(r.tai))), 1e-6);
  see('utcToTt against ERFA', Math.abs(dsec(tt, J(r.tt))), 1e-6);
  see('UTC-TT-UTC', Math.abs(dsec(back, u)), 1e-6);
  see('taiToTt is 32.184 s', Math.abs(dsec(tt2, tai) - 32.184), 1e-9);
  see('ttToTai undoes taiToTt', Math.abs(dsec(tai2, tai)), 1e-9);
  see('utcToTt = taiToTt(utcToTai)', Math.abs(dsec(tt, tt2)), 1e-9);
  const c = T.julianCenturies(tt);
  dump.push(c);
  see('julianCenturies', Math.abs(c - ((tt.a - 2451545.0) + tt.b) / 36525), 1e-15);
  const u1 = T.utcToUt1(u, -0.1234);
  see('utcToUt1', Math.abs(dsec(u1, u) + 0.1234), 1e-9);
}
for (const r of H.tdb) {
  const got = T.tdbMinusTt(J(r.tt));
  dump.push(got);
  see('TDB - TT against ERFA dtdb', Math.abs(got - r.dtdb), 50e-6);
}

// today's eopAt, transcribed
const ARCSEC = Math.PI / (180 * 3600);
function eopToday(jd, e) {
  if (!e) return { dut1: 0, xp: 0, yp: 0 };
  const start = Date.parse(`${e.from}T00:00:00Z`) / 86400000 + 2440587.5;
  const n = e.dut1.length;
  const x = jd - start;
  if (x <= 0) return { dut1: e.dut1[0], xp: e.xp[0] * ARCSEC, yp: e.yp[0] * ARCSEC };
  if (x >= n - 1) return { dut1: e.dut1[n - 1], xp: e.xp[n - 1] * ARCSEC, yp: e.yp[n - 1] * ARCSEC };
  const k = Math.floor(x), f = x - k;
  const lerp = (a) => a[k] + (a[k + 1] - a[k]) * f;
  const dut1 = Math.abs(e.dut1[k + 1] - e.dut1[k]) > 0.5 ? e.dut1[k] : lerp(e.dut1);
  return { dut1, xp: lerp(e.xp) * ARCSEC, yp: lerp(e.yp) * ARCSEC };
}
const real = JSON.parse(readFileSync(`${root}/public/data/earth-orientation.json`, 'utf8')).data;
const start = Date.parse(`${real.from}T00:00:00Z`) / 86400000 + 2440587.5, n = real.dut1.length;
// a second table with leap-second jumps, seeded by a small LCG
let s = 12345; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
const jump = { from: '2016-12-20', dut1: [], xp: [], yp: [] };
for (let i = 0, d = -0.4; i < 40; i++) { d += -0.0012 + 0.0004 * rnd(); if (i === 12) d += 1; if (i === 30) d -= 1; jump.dut1.push(d); jump.xp.push(0.1 + 0.01 * rnd()); jump.yp.push(0.3 + 0.01 * rnd()); }
const jstart = Date.parse(`${jump.from}T00:00:00Z`) / 86400000 + 2440587.5;
const eopCases = [];
for (const jd of H.eopJd) eopCases.push([real, jd, start, n]);
for (let i = 0; i < n; i += 97) eopCases.push([real, start + i, start, n]);
eopCases.push([real, start, start, n], [real, start + n - 1, start, n], [real, start - 1e-6, start, n], [real, start + n - 1 + 1e-6, start, n]);
for (let k = 0; k <= 5000; k++) eopCases.push([jump, jstart - 3 + 46 * k / 5000, jstart, 40]);
for (let i = 0; i < 40; i++) eopCases.push([jump, jstart + i, jstart, 40]);
for (const [tab, jd, st, len] of eopCases) {
  const a = Math.floor(jd - 0.5) + 0.5, want = eopToday(jd, tab), got = T.eopAt(tab, { a, b: jd - a });
  dump.push(got.dut1, got.xp, got.yp);
  see('eopAt equals today (bit for bit)', Object.is(got.dut1, want.dut1) && Object.is(got.xp, want.xp) && Object.is(got.yp, want.yp) ? 0 : 1, 0);
  const q = jd >= st && jd <= st + len - 1 ? 'data' : 'held';
  see('eopAt quality', got.quality === q ? 0 : 1, 0);
}
const none = T.eopAt(null, { a: 2460000.5, b: 0.3 });
see('eopAt without a table', none.dut1 === 0 && none.xp === 0 && none.yp === 0 && none.quality === 'none' ? 0 : 1, 0);
for (const x of [NaN, Infinity, -Infinity]) {
  const want = eopToday(x, real), got = T.eopAt(real, { a: x, b: 0 });
  see('eopAt at a non-finite instant', Object.is(got.dut1, want.dut1) && Object.is(got.xp, want.xp) && Object.is(got.yp, want.yp) && got.quality === 'held' ? 0 : 1, 0);
}

// non-finite input: NaN in every number returned
const nums = (v) => (typeof v === 'number' ? [v] : [v.a, v.b]);
const good = { a: 2451545.0, b: 0.25 };
for (const x of [NaN, Infinity, -Infinity]) {
  const dates = [{ a: x, b: 0.25 }, { a: 2451545.0, b: x }];
  const calls = [() => T.jd2(x)];
  for (const d of dates) calls.push(() => T.taiMinusUtc(d), () => T.utcToTai(d), () => T.taiToUtc(d), () => T.taiToTt(d), () => T.ttToTai(d),
    () => T.utcToTt(d), () => T.ttToUtc(d), () => T.tdbMinusTt(d), () => T.utcToUt1(d, 0.1), () => T.julianCenturies(d));
  calls.push(() => T.utcToUt1(good, x));
  for (const c of calls) see('non-finite in, NaN out', nums(c()).every(Number.isNaN) ? 0 : 1, 0);
}
// purity: inputs are not mutated, outputs are fresh
const frozen = Object.freeze({ a: 2451545.0, b: 0.25 });
for (const f of [T.utcToTai, T.taiToUtc, T.taiToTt, T.ttToTai, T.utcToTt, T.ttToUtc]) see('returns a fresh object', f(frozen) !== frozen ? 0 : 1, 0);

for (const [k, v] of Object.entries(worst)) console.log(`${k}: worst ${v.toExponential(3)}`);
if (dumpPath) writeFileSync(dumpPath, JSON.stringify(dump.map((x) => (Number.isNaN(x) ? 'NaN' : x))));
console.log(bad === 0 ? `all inside the bounds (${dump.length} numbers)` : `${bad} OUTSIDE the bounds`);
process.exit(bad === 0 ? 0 : 1);
