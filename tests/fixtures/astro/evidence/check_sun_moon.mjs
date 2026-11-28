// The Sun and Moon module against a held-out set (the gate of PF-14).
// Run: node check_sun_moon.mjs <bundle of src/astro/base/sun-moon.ts> <heldout.json> [dump.json]
import { readFileSync, writeFileSync } from 'node:fs';
const [bundle, file, dump] = process.argv.slice(2);
const g = await import(bundle);
const d = JSON.parse(readFileSync(file, 'utf8'));
const w = {};
const upd = (k, b, v, i) => { w[k] ??= [b, 0, -1]; if (!(v <= w[k][1])) { w[k][1] = v; w[k][2] = i; } };
const dist = (a, b) => Math.hypot(a.x - b[0], a.y - b[1], a.z - b[2]);
const ang = (a, b) => { const c = [a.y * b[2] - a.z * b[1], a.z * b[0] - a.x * b[2], a.x * b[1] - a.y * b[0]]; return Math.atan2(Math.hypot(...c), a.x * b[0] + a.y * b[1] + a.z * b[2]) * 180 / Math.PI; };
const all = [];
const keep = (s) => all.push(s.r.x, s.r.y, s.r.z, s.v.x, s.v.y, s.v.z);
d.port.forEach((p, i) => {
  const tt = { a: p.tt[0], b: p.tt[1] };
  const m = g.moonState(tt), e = g.earthMoonBarycentreState(tt), s = g.sunState(tt);
  upd('Moon against ERFA, m (1e-3)', 1e-3, dist(m.r, p.s[0]), i); upd('Moon against ERFA, m/s (1e-8)', 1e-8, dist(m.v, p.s[1]), i);
  upd('barycentre against ERFA, m (1e-1)', 1e-1, dist(e.r, p.s[2]), i); upd('barycentre against ERFA, m/s (1e-6)', 1e-6, dist(e.v, p.s[3]), i);
  upd('Sun against ERFA, m (1e-1)', 1e-1, dist(s.r, p.s[4]), i); upd('Sun against ERFA, m/s (1e-6)', 1e-6, dist(s.v, p.s[5]), i);
  keep(m); keep(e); keep(s);
});
d.de421.forEach((p, i) => {
  const tt = { a: p.tt[0], b: p.tt[1] };
  for (const [name, f, bd, bv] of [['Moon', g.moonState, 0.05, 0.5], ['Sun', g.sunState, 0.1, 6]]) {
    const s = f(tt), ref = p[name.toLowerCase()];
    upd(`${name} against DE421, deg (0.01)`, 0.01, ang(s.r, ref[0]), i);
    upd(`${name} against DE421, distance % (${bd})`, bd, Math.abs(Math.hypot(s.r.x, s.r.y, s.r.z) / Math.hypot(...ref[0]) - 1) * 100, i);
    upd(`${name} against DE421, m/s (${bv})`, bv, dist(s.v, ref[1]), i);
  }
});
let ok = true;
for (const [k, [b, v, i]] of Object.entries(w)) { const pass = v <= b; ok &&= pass; console.log(`${pass ? 'ok ' : 'OUT'} ${k}: worst ${v.toExponential(2)} at ${i}`); }
if (dump) writeFileSync(dump, JSON.stringify(all));
console.log(`${d.port.length} + ${d.de421.length} instants, ${all.length} numbers kept; ${ok ? 'all inside the bounds' : 'OUT OF BOUND'}`);
process.exit(ok ? 0 : 1);
