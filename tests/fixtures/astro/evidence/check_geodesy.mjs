// The geodesy module against a held-out set (the gate of PF-12). Node 22 runs the module's
// TypeScript directly because it has only erasable syntax.
// Run: node check_geodesy.mjs <repository root> <heldout.json from heldout_geodesy.py>
import { readFileSync } from 'node:fs';

const [repo, file] = process.argv.slice(2);
const g = await import(`${repo}/src/astro/base/geodesy.ts`);
const pts = JSON.parse(readFileSync(file, 'utf8'));
const wrap = (a) => { a = Math.abs(a) % (2 * Math.PI); return Math.min(a, 2 * Math.PI - a); };

// name: [bound, worst, index]; a null bound is reported and not judged
const m = {
  'forward against ERFA gd2gc, m': [1e-6, 0, -1],
  'inverse lat against the inputs, rad': [1e-11, 0, -1],
  'inverse h against the inputs, m': [1e-6, 0, -1],
  'inverse lon against the inputs, rad': [1e-11, 0, -1],
  'inverse h against ERFA gc2gd, m': [1e-6, 0, -1],
  'inverse lon against ERFA gc2gd, rad': [1e-11, 0, -1],
  'inverse lat against ERFA gc2gd, rad (ERFA is the looser side)': [null, 0, -1],
  'round trip, m': [1e-6, 0, -1],
  'longitude outside (-pi, pi], count': [0, 0, -1],
};
const upd = (k, v, i) => { if (!(v <= m[k][1])) { m[k][1] = v; m[k][2] = i; } };
pts.forEach((p, i) => {
  const r = g.ecefFromGeodetic(p.lat, p.lon, p.h);
  upd('forward against ERFA gd2gc, m', Math.hypot(r.x - p.x, r.y - p.y, r.z - p.z), i);
  const q = g.geodeticFromEcef({ x: p.x, y: p.y, z: p.z });
  upd('inverse lat against the inputs, rad', Math.abs(q.lat - p.lat), i);
  upd('inverse h against the inputs, m', Math.abs(q.h - p.h), i);
  upd('inverse lon against the inputs, rad', wrap(q.lon - p.lon), i);
  upd('inverse h against ERFA gc2gd, m', Math.abs(q.h - p.hBack), i);
  upd('inverse lon against ERFA gc2gd, rad', wrap(q.lon - p.lonBack), i);
  upd('inverse lat against ERFA gc2gd, rad (ERFA is the looser side)', Math.abs(q.lat - p.latBack), i);
  if (!(q.lon > -Math.PI && q.lon <= Math.PI)) m['longitude outside (-pi, pi], count'][1] += 1;
  const b = g.ecefFromGeodetic(q.lat, q.lon, q.h);
  upd('round trip, m', Math.hypot(b.x - p.x, b.y - p.y, b.z - p.z), i);
});
let ok = true;
for (const [name, [bound, worst, i]] of Object.entries(m)) {
  const pass = bound === null || worst <= bound;
  ok &&= pass;
  const p = pts[i];
  console.log(`${worst.toExponential(3)}  ${bound === null ? 'reported' : `bound ${bound} ${pass ? 'ok' : 'FAIL'}`}  ${name}${p ? `  (lat ${p.lat.toFixed(4)}, h ${(p.h / 1e3).toFixed(0)} km)` : ''}`);
}
console.log(pts.length, 'points:', ok ? 'all inside the bounds' : 'FAILED');
process.exit(ok ? 0 : 1);
