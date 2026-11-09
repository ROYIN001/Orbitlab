/**
 * The Structure section's Soyuz-2.1b/Fregat files (public/structure/,
 * scripts/structure-meshes.mjs): still the page's, every part kept with its
 * page id and its place, the layers decodable with every vertex marked with
 * a part of its own assembly, the page's groups and facts carried over, the
 * files on demand like the Anatomy pages, and the section's addresses.
 */
import { describe, expect, it } from 'vitest';
import { decodeStructureLayer } from '../src/render/structure-mesh';
import { inflateAnatomy } from '../src/render/anatomy';
import { SOYUZ_FILES, SOYUZ_LAYERS, cutawayAzimuth, indexSoyuz, parseSoyuzContent, unitAxis } from '../src/structure/soyuz-content';
import { SOYUZ_UNITS, SOYUZ_BOOSTERS } from '../src/structure/soyuz';
import { CERTAINTIES, PART_CATEGORIES } from '../src/structure/types';
import { onDemand, precacheable } from '../src/pwa/manifest';
import { APP_PAGES, hashForRoute, route, routeFromHash } from '../src/ui/app-mode';

interface Bytes { buffer: ArrayBuffer; byteOffset: number; byteLength: number }
const load = (id: string): Promise<unknown> => import(/* @vite-ignore */ id);
const { readFileSync } = (await load('node:fs')) as { readFileSync(path: URL, enc?: string): Bytes & string };
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
