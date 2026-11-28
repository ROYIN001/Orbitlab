/**
 * PF-15 pin: what today's elliptic path of propagateKepler (src/physics/orbital.ts) returns, kept so that the e >= 1
 * fallback can be replaced without touching an elliptic result.
 *
 *   node_modules/.bin/rolldown src/physics/orbital.ts --format esm --file <scratch>/orbital.mjs
 *   node tests/fixtures/astro/kepler/make_elliptic_pin.mjs <scratch>/orbital.mjs
 *
 * Node cannot import the TypeScript source, so the script takes the path of that bundle. 200 states, i from 1 to 200
 * (H_b is the Halton value of index i in base b, index from 1), built with the bundle's own
 * stateFromElements(a, e, i, raan, argp, nu), its last argument left out so that the function's own default GM is used:
 * r_p = 6.5e6 + 3.55e7 H2(i) m, e = 0.95 H3(i), a = r_p / (1 - e), inclination pi H5(i), Omega = 2 pi H7(i),
 * omega = 2 pi H11(i), nu = 2 pi H13(i), dt = 86400 (2 H17(i) - 1) s. Then four by hand with r_p = 2.0e7 m, nu = 0.8,
 * inclination 0.9, Omega = 0.4, omega = 1.1, dt = 3600 s: e = 0.99, 0.999, 1 - 1e-6, 1 - 1e-9. Each case stores the
 * input state r, v, dt and what propagateKepler(r, v, dt) returns, its last argument left out too: r1, v1.
 * The script asserts that no stored number is zero (a JSON zero loses its sign) and that every case took the elliptic
 * path (elementsFromState gives e < 1 and a > 0). Numbers are written with 17 significant digits.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const bundle = process.argv[2];
if (!bundle) throw new Error('usage: node make_elliptic_pin.mjs <path of the bundle of src/physics/orbital.ts>');
const { stateFromElements, propagateKepler, elementsFromState } = await import(pathToFileURL(path.resolve(bundle)).href);

const halton = (i, base) => {
  let f = 1, r = 0;
  while (i > 0) { f /= base; r += f * (i % base); i = Math.floor(i / base); }
  return r;
};

const cases = [];
const add = (label, a, e, inc, raan, argp, nu, dt) => {
  const s = stateFromElements(a, e, inc, raan, argp, nu);
  const el = elementsFromState(s.r, s.v);
  if (!(el.e < 1 && el.a > 0)) throw new Error(`${label}: not on the elliptic path (e = ${el.e}, a = ${el.a})`);
  const o = propagateKepler(s.r, s.v, dt);
  const c = { label, r: [s.r.x, s.r.y, s.r.z], v: [s.v.x, s.v.y, s.v.z], dt, r1: [o.r.x, o.r.y, o.r.z], v1: [o.v.x, o.v.y, o.v.z] };
  for (const x of [c.dt, ...c.r, ...c.v, ...c.r1, ...c.v1]) if (!Number.isFinite(x) || x === 0) throw new Error(`${label}: a stored number is ${x}`);
  cases.push(c);
};
for (let i = 1; i <= 200; i++) {
  const rp = 6.5e6 + 3.55e7 * halton(i, 2), e = 0.95 * halton(i, 3);
  add(`H(${i})`, rp / (1 - e), e, Math.PI * halton(i, 5), 2 * Math.PI * halton(i, 7), 2 * Math.PI * halton(i, 11),
    2 * Math.PI * halton(i, 13), 86400 * (2 * halton(i, 17) - 1));
}
for (const [label, e] of [['e = 0.99', 0.99], ['e = 0.999', 0.999], ['e = 1 - 1e-6', 1 - 1e-6], ['e = 1 - 1e-9', 1 - 1e-9]])
  add(label, 2.0e7 / (1 - e), e, 0.9, 0.4, 1.1, 0.8, 3600);
if (cases.length !== 204) throw new Error(`${cases.length} cases`);

const f17 = (x) => Number(x).toPrecision(17);
const arr = (a) => `[${a.map(f17).join(', ')}]`;
const text = `{\n "generator": "make_elliptic_pin.mjs on a bundle of src/physics/orbital.ts, node ${process.version}",\n "script": "make_elliptic_pin.mjs",\n "cases": [\n` +
  cases.map((c) => `  {"label": ${JSON.stringify(c.label)}, "r": ${arr(c.r)}, "v": ${arr(c.v)}, "dt": ${f17(c.dt)}, "r1": ${arr(c.r1)}, "v1": ${arr(c.v1)}}`).join(',\n') + '\n ]\n}\n';
writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'today-elliptic.json'), text);
console.log(cases.length, 'cases');
