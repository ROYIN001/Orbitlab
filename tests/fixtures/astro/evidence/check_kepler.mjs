// The Kepler module against a held-out set (the gate of PF-15).
// Run: node check_kepler.mjs <bundle of src/astro/base/kepler.ts> <heldout.json from heldout_kepler.py> [dump.json]
import { readFileSync, writeFileSync } from 'node:fs';
const [bundle, file, dump] = process.argv.slice(2);
const g = await import(bundle);
const d = JSON.parse(readFileSync(file, 'utf8'));
const V = (a) => ({ x: a[0], y: a[1], z: a[2] });
const dist = (a, b) => Math.hypot(a.x - b[0], a.y - b[1], a.z - b[2]);
const w = { 'position, m (1e-3)': [1e-3, 0, -1], 'velocity, m/s (1e-7)': [1e-7, 0, -1], 'there and back, m (1e-2)': [1e-2, 0, -1], 'there and back, m/s (1e-5)': [1e-5, 0, -1] };
const upd = (k, v, i) => { if (!(v <= w[k][1])) { w[k][1] = v; w[k][2] = i; } };
const all = [];
d.cases.forEach((c, i) => {
  const s0 = { r: V(c.r0), v: V(c.v0) };
  const s = g.keplerUniversal(s0, c.dt, d.mu);
  upd('position, m (1e-3)', dist(s.r, c.r), i); upd('velocity, m/s (1e-7)', dist(s.v, c.v), i);
  const b = g.keplerUniversal(s, -c.dt, d.mu);
  upd('there and back, m (1e-2)', dist(b.r, c.r0), i); upd('there and back, m/s (1e-5)', dist(b.v, c.v0), i);
  all.push(s.r.x, s.r.y, s.r.z, s.v.x, s.v.y, s.v.z);
});
let ok = true;
for (const [k, [b, v, i]] of Object.entries(w)) { const pass = v <= b; ok &&= pass; const c = d.cases[i]; console.log(`${pass ? 'ok ' : 'OUT'} ${k}: worst ${v.toExponential(2)} at case ${i}${c ? ` (e=${c.e}, rp=${c.rp.toExponential(2)}, dt=${c.dt.toFixed(1)})` : ''}`); }
if (dump) writeFileSync(dump, JSON.stringify(all));
console.log(`${d.cases.length} cases, ${all.length} numbers kept; ${ok ? 'all inside the bounds' : 'OUT OF BOUND'}`);
process.exit(ok ? 0 : 1);
