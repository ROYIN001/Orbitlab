/**
 * The Structure section's Soyuz-2.1b/Fregat files (public/structure/,
 * scripts/structure-meshes.mjs): still the page's, every part kept with its
 * page id and its place, the layers decodable with every vertex marked with
 * its own part (held against each part's stated centre: revision 1 of the
 * files marked most vertices with another part of the same assembly, which a
 * check of the assembly alone could not see), the cutaway cutting evenly, the
 * page's groups, facts, circuits and flight sequence carried over, the files
 * on demand like the Anatomy pages, and the section's addresses.
 */
import { describe, expect, it } from 'vitest';
import { decodeStructureLayer } from '../src/render/structure-mesh';
import { inflateAnatomy } from '../src/render/anatomy';
import { SOYUZ_DATA_REVISION, SOYUZ_FILES, SOYUZ_LAYERS, cutawayAzimuth, indexSoyuz, parseSoyuzContent, unitAxis } from '../src/structure/soyuz-content';
import { SOYUZ_UNITS, SOYUZ_BOOSTERS } from '../src/structure/soyuz';
import { CERTAINTIES, PART_CATEGORIES } from '../src/structure/types';
import { onDemand, precacheable } from '../src/pwa/manifest';
import { APP_PAGES, hashForRoute, route, routeFromHash } from '../src/ui/app-mode';

interface Bytes { buffer: ArrayBuffer; byteOffset: number; byteLength: number }
const load = (id: string): Promise<unknown> => import(/* @vite-ignore */ id);
const nodeFs = await load('node:fs');
const { readFileSync } = nodeFs as { readFileSync(path: URL, enc?: string): Bytes & string };
const { createHash } = (await load('node:crypto')) as { createHash(algorithm: 'sha256'): { update(data: Bytes): { digest(encoding: 'hex'): string } } };
const file = (path: string): Bytes => readFileSync(new URL(`../public/${path}`, import.meta.url));
const arrayBuffer = (bytes: Bytes): ArrayBuffer => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

const content = parseSoyuzContent(JSON.parse(readFileSync(new URL(`../public/${SOYUZ_FILES.content}`, import.meta.url), 'utf8')));
const index = indexSoyuz(content);
const layers = await Promise.all(SOYUZ_LAYERS.map(async (l) => decodeStructureLayer(await inflateAnatomy(arrayBuffer(file(SOYUZ_FILES.layers[l]))))));

describe('the Structure section\'s Soyuz-2.1b/Fregat files', () => {
  it('are made from the Anatomy page as it is committed (run `npm run structure` after replacing it)', () => {
    const page = createHash('sha256').update(file('anatomy/soyuz-2-1b-fregat-st31.html')).digest('hex');
    expect(content.source.sha256).toBe(page);
    expect(content.source.file).toBe('anatomy/soyuz-2-1b-fregat-st31.html');
    for (const l of layers) expect(l.source.sha256, l.layer).toBe(page);
    expect(layers.map((l) => l.layer)).toEqual([...SOYUZ_LAYERS]);
    expect(content.pageBuild.version).toBe('family-v1-20261026');
  });

  it('are of one data revision, which is in their names (a kept copy of an older one is never read for this one)', () => {
    expect(content.revision).toBe(SOYUZ_DATA_REVISION);
    for (const l of layers) expect(l.revision, l.layer).toBe(SOYUZ_DATA_REVISION);
    for (const path of [SOYUZ_FILES.content, ...Object.values(SOYUZ_FILES.layers)]) expect(path).toContain(`.r${SOYUZ_DATA_REVISION}.`);
    // and no file of another revision lies beside them
    const { readdirSync } = (nodeFs as unknown as { readdirSync(path: URL): string[] });
    const here = readdirSync(new URL('../public/structure/', import.meta.url)).filter((f) => f.startsWith('soyuz-2-1b-fregat-st31.'));
    expect(here.sort()).toEqual([SOYUZ_FILES.content, ...Object.values(SOYUZ_FILES.layers)].map((f) => f.replace('structure/', '')).sort());
  });

  it('are the bytes their revision was made as: files made again with other bytes need a new revision', () => {
    // The files' names carry the revision, and a browser that has kept some of them answers for those from its copy
    // (src/pwa/sw-core.ts): bytes changed under one revision would be mixed with kept ones, and the parts lit would not
    // be the parts named. Changed files therefore fail here until the revision is raised (DATA_REVISION in
    // scripts/structure-meshes.mjs, SOYUZ_DATA_REVISION) and the new files' hashes are written below.
    const MADE_AS: Readonly<Record<number, Readonly<Record<string, string>>>> = {
      2: {
        'structure/soyuz-2-1b-fregat-st31.r2.json': '03af2b271b5ed219f6da29c9a056177f9c980063d34e2668dae9c2e8e448d5d9',
        'structure/soyuz-2-1b-fregat-st31.r2.outer.bin': 'e391cdfef0cd3d28116c13d4d666b52ddd847e691f47e6090616d2b074b7565b',
        'structure/soyuz-2-1b-fregat-st31.r2.inner.bin': '2700d78d2bcf3a998bcebb1d80e7850b19709c075fb7a29cf4df9bd10f619ec2',
        'structure/soyuz-2-1b-fregat-st31.r2.engine.bin': '4d6f470c813dd64541017879cb528cefb5a678f7ed3929276239c789a67ee705',
      },
    };
    const made = MADE_AS[SOYUZ_DATA_REVISION];
    expect(made, `revision ${SOYUZ_DATA_REVISION} has no hashes here`).toBeDefined();
    const paths = [SOYUZ_FILES.content, ...Object.values(SOYUZ_FILES.layers)];
    expect(Object.keys(made).sort()).toEqual([...paths].sort());
    for (const path of paths) expect(createHash('sha256').update(file(path)).digest('hex'), `${path} changed within revision ${SOYUZ_DATA_REVISION}`).toBe(made[path]);
  });

  it('mark every vertex with its own part: each triangle is one part\'s, and each part\'s stated centre lies in its own geometry', () => {
    const n = content.items.length;
    const box = Array.from({ length: n }, () => [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);
    const triangles = new Uint32Array(n);
    for (const l of layers) for (const m of l.meshes) {
      const pos = m.geometry.getAttribute('position'), item = m.geometry.getAttribute('item'), idx = m.geometry.getIndex()!;
      for (let v = 0; v < pos.count; v++) {
        const b = box[item.getX(v)], p = [pos.getX(v), pos.getY(v), pos.getZ(v)];
        for (let a = 0; a < 3; a++) { if (p[a] < b[a]) b[a] = p[a]; if (p[a] > b[a + 3]) b[a + 3] = p[a]; }
      }
      for (let t = 0; t < idx.count; t += 3) {
        const a = item.getX(idx.getX(t));
        if (a !== item.getX(idx.getX(t + 1)) || a !== item.getX(idx.getX(t + 2))) throw new Error(`${l.layer}/${m.unit}: triangle ${t / 3} joins two parts`);
        triangles[a]++;
      }
    }
    // every part is drawn with triangles of its own, and its centre is within 10 cm of them (measured: 7.5 cm at most, the
    // fairing's quarter shells, whose centre lies just inside their curve; revision 1 had 1,573 parts more than 0.5 m off)
    let worst = 0;
    for (let i = 0; i < n; i++) {
      expect(triangles[i], content.items[i].id).toBeGreaterThanOrEqual(4);
      const b = box[i], c = content.items[i].center;
      const off = Math.hypot(...[0, 1, 2].map((a) => Math.max(b[a] - c[a], 0, c[a] - b[a + 3])));
      if (off > 0.1) throw new Error(`${content.items[i].id}: its centre is ${off.toFixed(2)} m outside the geometry marked with it`);
      worst = Math.max(worst, off);
    }
    expect(worst).toBeLessThan(0.1);
  });

  it('cut evenly: in every assembly the hidden halves and the kept halves are the same amount of surface, each on its own side', () => {
    const az = cutawayAzimuth(content), eye = [Math.sin(az), Math.cos(az)];
    const sides = new Map<string, { front: number; back: number; fx: number; fz: number; bx: number; bz: number }>();
    for (const l of layers) for (const m of l.meshes) {
      const pos = m.geometry.getAttribute('position'), item = m.geometry.getAttribute('item'), idx = m.geometry.getIndex()!;
      for (let t = 0; t < idx.count; t += 3) {
        const v = idx.getX(t), half = content.items[item.getX(v)].half;
        if (!half) continue;
        const s = sides.get(m.unit) ?? { front: 0, back: 0, fx: 0, fz: 0, bx: 0, bz: 0 };
        if (half.endsWith('front')) { s.front++; s.fx += pos.getX(v); s.fz += pos.getZ(v); } else { s.back++; s.bx += pos.getX(v); s.bz += pos.getZ(v); }
        sides.set(m.unit, s);
      }
    }
    expect(sides.size).toBe(SOYUZ_UNITS.length);
    for (const [unit, s] of sides) {
      // the two sides' triangle counts within 2 % (revision 1: 113,785 hidden against 19,736 kept)
      expect(Math.abs(s.front - s.back) / (s.front + s.back), unit).toBeLessThan(0.02);
      // and the hidden side's own triangles stand towards the camera from the kept side's
      const dx = s.fx / s.front - s.bx / s.back, dz = s.fz / s.front - s.bz / s.back;
      expect((dx * eye[0] + dz * eye[1]) / Math.hypot(dx, dz), unit).toBeGreaterThan(Math.cos(Math.PI / 6));
    }
  });

  it('carry the page\'s circuits with their ordered steps, and say which parts are each step', () => {
    expect(content.circuits).toHaveLength(15);
    const steps = content.circuits.flatMap((c) => c.steps.map((s) => s.id));
    expect(content.circuitSteps).toEqual(steps);
    expect(new Set(steps).size).toBe(steps.length);
    for (const c of content.circuits) {
      expect(c.label && c.description && c.confidence && c.limitation, c.id).toBeTruthy();
      for (const s of c.steps) expect(s.id.startsWith(`${c.id}/`) && !!s.label && !!s.description, s.id).toBe(true);
      expect(c.sourceIds.every((id) => content.sources.some((x) => x.id === id)), c.id).toBe(true);
    }
    const circuitOfStep = (i: number): string => content.circuitSteps[i].slice(0, content.circuitSteps[i].indexOf('/'));
    let onCircuit = 0, onStep = 0;
    const used = new Set<number>();
    for (const p of content.items) {
      if (p.circuits?.length) onCircuit++;
      for (const id of p.circuits ?? []) expect(content.circuits.some((c) => c.id === id), `${p.id}: ${id}`).toBe(true);
      if (p.steps?.length) onStep++;
      for (const i of p.steps ?? []) {
        expect(i >= 0 && i < content.circuitSteps.length, p.id).toBe(true);
        used.add(i);
        // a part is a step only of a circuit it is on
        expect(p.circuits ?? [], p.id).toContain(circuitOfStep(i));
      }
    }
    expect(onCircuit).toBe(1164);
    // 1,164 parts are on a circuit; 920 of them are named as a step of one
    expect(onStep).toBe(920);
    // every circuit that has steps has parts for at least one of them: its path can be shown on the model
    for (const c of content.circuits) if (c.steps.length) expect(c.steps.some((s) => used.has(content.circuitSteps.indexOf(s.id))), c.id).toBe(true);
  });

  it('carry the page\'s flight sequence: ten steps, and the step at which each assembly leaves', () => {
    const f = content.flight;
    expect(f.steps).toHaveLength(10);
    expect(f.last).toBe(f.steps.length - 1);
    for (const s of f.steps) expect(!!s.title && !!s.time && !!s.text, s.title).toBe(true);
    expect(Object.keys(f.events).sort()).toEqual(['boosters', 'core', 'disposal', 'fairing', 'payload', 'skirt', 'upper']);
    for (const [name, at] of Object.entries(f.events)) expect(at >= 1 && at <= f.last, name).toBe(true);
    // in the order the vehicle sheds them
    expect([f.events.boosters, f.events.fairing, f.events.core, f.events.skirt, f.events.upper, f.events.payload, f.events.disposal]).toEqual([2, 3, 4, 5, 6, 8, 9]);
    // Block I's three skirt panels are the parts that leave at 'skirt', each its own way
    const skirt = content.items.filter((p) => p.leaves);
    expect(skirt.map((p) => p.id).sort()).toEqual(['stage3.rd0124-skirt-panel-1', 'stage3.rd0124-skirt-panel-2', 'stage3.rd0124-skirt-panel-3']);
    for (const p of skirt) { expect(p.leaves!.event).toBe('skirt'); expect(Math.hypot(...p.leaves!.move)).toBeCloseTo(2.4, 3); }
  });

  it('carry what the page records of a part beyond its place: what flows, what it joins, its evidence, its seat and its pivot', () => {
    const n = content.items.length, inRange = (i: number): boolean => Number.isInteger(i) && i >= 0 && i < n;
    let media = 0, seats = 0, pivots = 0, evidence = 0;
    for (const p of content.items) {
      if (p.medium) { media++; expect(['liquid', 'gas'], p.id).toContain(p.phase); }
      for (const t of p.terminals ?? []) expect(inRange(t), p.id).toBe(true);
      for (const e of p.evidence ?? []) expect(e >= 0 && e < content.evidence.length, p.id).toBe(true);
      if (p.evidence?.length) evidence++;
      for (const m of p.mounts ?? []) expect(inRange(m) && content.items[m].unit === p.unit, p.id).toBe(true);
      for (const e of p.ends ?? []) {
        seats++;
        expect(Math.hypot(...e.normal), p.id).toBeCloseTo(1, 3);
        expect(e.r, p.id).toBeGreaterThan(0);
        for (const t of e.to) expect(p.mounts ?? [], p.id).toContain(t);
        // the seat is on the part: within half a metre of its centre
        expect(Math.hypot(e.at[0] - p.center[0], e.at[1] - p.center[1], e.at[2] - p.center[2]), p.id).toBeLessThan(0.5);
      }
      if (p.pivot) { pivots++; expect(p.axis && Math.abs(Math.hypot(...p.axis) - 1) < 1e-3, p.id).toBe(true); }
      if (p.inside !== undefined) expect(inRange(p.inside), p.id).toBe(true);
      if (p.host !== undefined) expect(inRange(p.host), p.id).toBe(true);
    }
    expect([media, evidence]).toEqual([517, 578]);
    expect(seats).toBeGreaterThan(80);
    // RD0124's four gimballed chambers: the nozzle and its two gimbal bearings share one pivot, on the chamber's own axis
    expect(pivots).toBe(12);
    const nozzle = content.items.find((p) => p.id === 'stage3.rd0124-main-nozzle-3')!;
    expect(nozzle.gimbalAxes).toBe(1);
    expect(nozzle.pivot![1]).toBeCloseTo(29.75, 2);
  });

  it('keep every part of the page once, with its id, its assembly and the layer that draws it', () => {
    expect(content.items).toHaveLength(2069);
    expect(new Set(content.items.map((p) => p.id)).size).toBe(2069);
    for (const p of content.items) expect(SOYUZ_UNITS).toContain(p.unit);
    // every vertex of every layer names a part of the mesh's own assembly, in that layer
    const drawn = new Set<number>();
    for (const l of layers) {
      for (const m of l.meshes) {
        const item = m.geometry.getAttribute('item');
        for (let v = 0; v < item.count; v++) {
          const i = item.getX(v);
          drawn.add(i);
          const p = content.items[i];
          if (p.unit !== m.unit || p.layer !== l.layer) throw new Error(`${l.layer}/${m.unit}: vertex ${v} names ${p.id} (${p.unit}, ${p.layer})`);
        }
      }
    }
    // and every part is drawn by some layer: none lost to the merging
    expect(drawn.size).toBe(2069);
  });

  it('are in metres, standing on y = 0, about 46.6 m tall with the fairing 4.1 m across', () => {
    let minY = Infinity, maxY = -Infinity, fairingR = 0;
    for (const l of layers) for (const m of l.meshes) {
      m.geometry.computeBoundingBox();
      const b = m.geometry.boundingBox!;
      minY = Math.min(minY, b.min.y); maxY = Math.max(maxY, b.max.y);
      if (m.unit.startsWith('fairing')) fairingR = Math.max(fairingR, b.max.x, -b.min.x, b.max.z, -b.min.z);
    }
    expect(minY).toBeGreaterThan(-0.5);
    expect(minY).toBeLessThan(0.5);
    expect(maxY).toBeCloseTo(46.63, 1);
    // the page's geometry reference: 4.110 m across
    expect(2 * fairingR).toBeGreaterThan(4.0);
    expect(2 * fairingR).toBeLessThan(4.2);
  });

  it('carry the page\'s own "apart" offsets, one per assembly, and the fairing halves\' opening', () => {
    for (const u of SOYUZ_UNITS) expect(content.assemblies[u].parts).toBe(index.units[u].items.length);
    expect(content.assemblies.core.move).toEqual([0, 0, 0]);
    expect(content.assemblies.fregat.move.map((v) => v + 0)).toEqual([0, 13, 0]);
    expect(content.assemblies['fairing-left'].reveal).toBeDefined();
    expect(content.assemblies['fairing-right'].reveal).toBeDefined();
  });

  it('stand the four strap-ons a quarter turn apart round the core, as the reference puts them', () => {
    const angles = SOYUZ_BOOSTERS.map((u) => { const [x, z] = unitAxis(index, u); return Math.atan2(-z, x); });
    for (let k = 1; k < 4; k++) {
      let d = angles[k] - angles[0];
      while (d < 0) d += 2 * Math.PI;
      expect(d).toBeCloseTo((k * Math.PI) / 2, 2);
    }
    expect(unitAxis(index, 'fregat')).toEqual([0, 0]);
  });

  it('open the cutaway towards the camera: each hidden half stands between the view and the half kept', () => {
    const az = cutawayAzimuth(content);
    // the viewer's camera stands at (sin az, cos az) round its target, in x and z
    const eye = [Math.sin(az), Math.cos(az)];
    expect(az).toBeCloseTo((3 * Math.PI) / 4, 1);
    const units = new Set(content.items.filter((it) => it.half).map((it) => it.unit));
    expect(units.size).toBeGreaterThan(3);
    for (const unit of units) {
      const mean = (end: string) => {
        const c = content.items.filter((it) => it.unit === unit && it.half?.endsWith(end)).map((it) => it.center);
        return [c.reduce((s, p) => s + p[0], 0) / c.length, c.reduce((s, p) => s + p[2], 0) / c.length];
      };
      const [fx, fz] = mean('front'), [bx, bz] = mean('back');
      const d = Math.hypot(fx - bx, fz - bz);
      // towards the camera, within 30° of straight at it
      expect(((fx - bx) * eye[0] + (fz - bz) * eye[1]) / d, unit).toBeGreaterThan(Math.cos(Math.PI / 6));
    }
  });

  it('give every part a group, its kind and how its shape is known', () => {
    for (let i = 0; i < content.items.length; i++) {
      expect(index.groupOf[i], content.items[i].id).toBeGreaterThanOrEqual(0);
      expect(index.groups[index.groupOf[i]].unit).toBe(content.items[i].unit);
      expect(PART_CATEGORIES[index.category[i]]).toBeDefined();
      expect(CERTAINTIES[index.certainty[i]]).toBeDefined();
    }
    // the page's facts and notes, verbatim, and its sources
    const core = index.units.core.component!;
    expect(core.facts.map((f) => f.value)).toContain('2.95 m');
    expect(core.sourceIds.every((id) => content.sources.some((s) => s.id === id))).toBe(true);
    expect(index.units['fairing-left'].component?.id).toBe('fairing');
  });

  it('are fetched on demand, never precached', () => {
    for (const path of [SOYUZ_FILES.content, ...Object.values(SOYUZ_FILES.layers)]) {
      expect(onDemand(path), path).toBe(true);
      expect(precacheable(path), path).toBe(false);
    }
  });
});

describe('the section\'s addresses', () => {
  it('open each model at any depth, and nothing else', () => {
    for (const level of ['watch', 'explore', 'engineer'] as const) {
      for (const page of ['soyuz-st31', 'edusat'] as const) {
        expect(APP_PAGES[page].section).toBe('structure');
        expect(routeFromHash(`#/structure/${level}/${page}`)).toEqual(route('structure', level, page));
        expect(hashForRoute(route('structure', level, page))).toBe(`#/structure/${level}/${page}`);
      }
      expect(routeFromHash(`#/structure/${level}`)).toEqual(route('structure', level));
    }
    expect(routeFromHash('#/structure/explore/requirements')).toBeNull();
    expect(routeFromHash('#/build/explore/edusat')).toBeNull();
    expect(routeFromHash('#/structure/explore/falcon9')).toBeNull();
  });
});
