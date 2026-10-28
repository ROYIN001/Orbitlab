/**
 * The owner's Soyuz Anatomy pages (public/anatomy/) in the app: which page a
 * flight and Build use (src/data/anatomy.ts), the exterior meshes derived
 * from each page (scripts/anatomy-meshes.mjs) still being that page's, and
 * the model fitted into the stack the physics flies (src/render/anatomy.ts,
 * RocketView.mountAnatomy). The browser journey soyuz-anatomy covers the look.
 */
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ANATOMY_PAGES, anatomyPagesFor, flightAnatomy, type AnatomyVariant } from '../src/data/anatomy';
import { anatomyFit, decodeAnatomy, inflateAnatomy, setHinges, anatomySpacecraft, anatomyMaterials, type AnatomyModel } from '../src/render/anatomy';
import { RocketView } from '../src/render/rocket';
import { DebrisView } from '../src/render/debris';
import type { SceneManager } from '../src/render/scene';
import type { DebrisFrame } from '../src/physics/frame';
import { captureFrame, stackLayout } from '../src/physics/frame';
import { Simulation } from '../src/physics/simulation';
import { payloadVehicle, vehicleById } from '../src/data/vehicles';
import { satelliteById } from '../src/data/satellites';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, guidanceForVehicle } from '../src/physics/defaults';
import { onDemand, precacheable } from '../src/pwa/manifest';
import { routeFor } from '../src/pwa/sw-core';

// The project has no node types (tsconfig: vite/client only): node's modules typed by the little used, as tests/repo-hygiene.test.ts.
interface Bytes { buffer: ArrayBuffer; byteOffset: number; byteLength: number }
const load = (id: string): Promise<unknown> => import(/* @vite-ignore */ id);
const { readFileSync } = (await load('node:fs')) as { readFileSync(path: URL): Bytes };
const { createHash } = (await load('node:crypto')) as { createHash(algorithm: 'sha256'): { update(data: Bytes): { digest(encoding: 'hex'): string } } };
const file = (path: string): Bytes => readFileSync(new URL(`../public/${path}`, import.meta.url));
const arrayBuffer = (bytes: Bytes): ArrayBuffer => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
/** Each variant's meshes as the flight reads them: fetched gzip-compressed, inflated, decoded. */
const models = new Map<AnatomyVariant, AnatomyModel>(await Promise.all(ANATOMY_PAGES.map(async (p) =>
  [p.variant, decodeAnatomy(await inflateAnatomy(arrayBuffer(file(p.meshes))))] as const)));
const model = (variant: AnatomyVariant): AnatomyModel => models.get(variant)!;

/** The canvases the stack's textures draw on; nothing here reads their pixels back (as tests/plume-throttle.test.ts). */
const withCanvas = <T>(run: () => T): T => {
  const pixels = (...a: number[]) => ({ data: new Uint8ClampedArray(Math.max(1, (a.length > 2 ? a[2] * a[3] : a[0] * a[1]) * 4)) });
  const context = new Proxy({}, { get: (_, key) => (key === 'createImageData' || key === 'getImageData' ? pixels
    : key === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop: () => undefined })) });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
  try { return run(); } finally { vi.unstubAllGlobals(); }
};

const simulation = (vehicleId: string, satelliteId: string, orbitId: string) => new Simulation({
  vehicleId, satelliteId, siteId: 'baikonur', orbit: orbitById(orbitId),
  launchTime: new Date('2026-09-22T15:00:00Z'), guidance: guidanceForVehicle(vehicleById(vehicleId), undefined, 'pointMass'),
  guidanceResolved: true, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
}, { headless: true });

/** The world box of an object and everything under it, in the rocket group's frame. */
const box = (o: THREE.Object3D) => { o.updateWorldMatrix(true, true); return new THREE.Box3().setFromObject(o); };
const named = (root: THREE.Object3D, name: string) => { const found: THREE.Object3D[] = []; root.traverse((o) => { if (o.name === name) found.push(o); }); return found; };

describe('the Anatomy pages and their meshes', () => {
  it('are on demand: never precached, opened network first and kept once seen', () => {
    const scope = new URL('https://example.github.io/Orbitlab/');
    for (const p of ANATOMY_PAGES) {
      for (const path of [p.page, p.meshes]) {
        expect(onDemand(path), path).toBe(true);
        expect(precacheable(path), path).toBe(false);
      }
      expect(routeFor(new URL(p.page, scope), 'navigate', scope, new Set(['index.html']))).toBe('static');
      expect(routeFor(new URL(p.meshes, scope), 'no-cors', scope, new Set(['index.html']))).toBe('runtime');
    }
  });

  it('are each made from the page beside it, as it is committed (run `npm run anatomy` after replacing a page)', () => {
    for (const p of ANATOMY_PAGES) {
      // gzip-compressed, as the host sends a .bin as it is
      expect([...new Uint8Array(arrayBuffer(file(p.meshes)), 0, 2)], p.meshes).toEqual([0x1f, 0x8b]);
      const m = model(p.variant);
      expect(m.source.sha256, p.page).toBe(createHash('sha256').update(file(p.page)).digest('hex'));
      expect(m.variant).toBe(p.variant);
      expect(`anatomy/${m.source.file}`).toBe(p.page);
    }
  });

  it('carry the outside of each vehicle, in metres, standing on y = 0', () => {
    const want: Record<AnatomyVariant, string[]> = {
      'soyuz-ms': ['booster', 'core', 'stage3', 'bay', 'fairing-left', 'fairing-right', 'escape', 'payload'],
      'progress-ms-26': ['booster', 'core', 'stage3', 'bay', 'fairing-left', 'fairing-right', 'payload'],
      'fregat-st31': ['booster', 'core', 'stage3', 'skirt', 'bay', 'fregat', 'fairing-left', 'fairing-right'],
    };
    for (const p of ANATOMY_PAGES) {
      const m = model(p.variant);
      expect(Object.keys(m.parts).sort(), p.variant).toEqual([...want[p.variant]].sort());
      expect(m.triangles).toBeGreaterThan(40_000);
      expect(m.triangles).toBeLessThan(140_000);
      // Blok I's chambers, left to the flight's bells: RD-0110's four and four verniers, RD-0124's four
      const chambers = m.parts.bay!.nozzles!;
      expect(chambers.filter((c) => c.kind === 'main')).toHaveLength(4);
      expect(chambers.filter((c) => c.kind === 'vernier')).toHaveLength(p.variant === 'fregat-st31' ? 0 : 4);
      for (const c of chambers) { expect(c.top).toBeGreaterThan(c.exit); expect(c.r).toBeGreaterThan(0.1); }
      // Fregat's S5.92, and the escape tower's twelve jettison nozzles
      if (p.variant === 'fregat-st31') expect(m.parts.fregat!.nozzles!.map((c) => c.kind)).toEqual(['main']);
      if (p.variant === 'soyuz-ms') expect(m.parts.escape!.nozzles!.filter((c) => c.kind === 'jettison')).toHaveLength(12);
      const all = new THREE.Box3();
      for (const part of Object.values(m.parts)) {
        all.expandByPoint(part!.min).expandByPoint(part!.max);
        for (const mesh of part!.meshes) {
          expect(mesh.geometry.userData.shared).toBe(true);
          expect(m.materials[mesh.material], `${p.variant} ${part!.name}`).toBeDefined();
        }
      }
      // the stack is 46–51 m from its nozzles to the top, Blok A 2.95 m across
      expect(all.min.y).toBeGreaterThan(0);
      expect(all.max.y).toBeGreaterThan(44);
      expect(all.max.y).toBeLessThan(51);
      expect(m.parts.core!.max.x - m.parts.core!.min.x).toBeCloseTo(2.95, 1);
    }
  });

  it('close each body at its ends: a line along it, near its axis or its wall, meets it (no tube seen through)', () => {
    /** How many of the parts' triangles a vertical line at (x, z) passes through. */
    const crossings = (parts: (AnatomyModel['parts'][keyof AnatomyModel['parts']])[], x: number, z: number) => {
      let n = 0;
      for (const part of parts) for (const mesh of part!.meshes) {
        const pos = mesh.geometry.attributes.position, index = mesh.geometry.index!;
        for (let i = 0; i < index.count; i += 3) {
          const [a, b, c] = [0, 1, 2].map((k) => index.getX(i + k));
          const ax = pos.getX(a), az = pos.getZ(a), bx = pos.getX(b) - ax, bz = pos.getZ(b) - az, cx = pos.getX(c) - ax, cz = pos.getZ(c) - az;
          const d = bx * cz - cx * bz;
          if (Math.abs(d) < 1e-12) continue;
          const u = ((x - ax) * cz - cx * (z - az)) / d, v = (bx * (z - az) - (x - ax) * bz) / d;
          if (u >= 0 && v >= 0 && u + v <= 1) n++;
        }
      }
      return n;
    };
    for (const p of ANATOMY_PAGES) {
      const m = model(p.variant);
      const bodies: [string, (typeof m.parts)[keyof typeof m.parts][]][] = [['Blok A', [m.parts.core]], ['Blok I', [m.parts.stage3, m.parts.bay]], ['a strap-on', [m.parts.booster]]];
      if (p.variant === 'progress-ms-26') bodies.push(['the Progress MS', [m.parts.payload]]);
      for (const [name, parts] of bodies) {
        const { min, max } = parts[0]!;
        const cx = (min.x + max.x) / 2, cz = (min.z + max.z) / 2, r = Math.min(max.x - min.x, max.z - min.z) / 2;
        // (the strap-on's box takes in its fins: its body is the inner part of it)
        for (const [f, a] of name === 'a strap-on' ? [[0, 0], [0.3, 0.3], [0.3, 2.4]] : [[0, 0], [0.4, 0.3], [0.4, 2.4], [0.7, 1.1], [0.7, 4.0]]) {
          expect(crossings(parts, cx + f * r * Math.cos(a), cz + f * r * Math.sin(a)), `${p.variant}: ${name} open along x ${f}r at ${a} rad`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });
});

describe('which page a flight draws', () => {
  const v21a = vehicleById('soyuz21a'), v21b = vehicleById('soyuz21b');
  it('2.1a: the crewed payload section with a crew, the cargo one for anything else; 2.1b: Fregat under ST', () => {
    expect(flightAnatomy(payloadVehicle(v21a, satelliteById('crew')), satelliteById('crew'))).toBe('soyuz-ms');
    expect(flightAnatomy(payloadVehicle(v21a, satelliteById('progress')), satelliteById('progress'))).toBe('progress-ms-26');
    expect(flightAnatomy(v21a, satelliteById('comsat'))).toBe('progress-ms-26');
    expect(flightAnatomy(v21b, satelliteById('weather'))).toBe('fregat-st31');
  });

  it('none for any other vehicle, nor for a remix of a Soyuz', () => {
    expect(flightAnatomy(vehicleById('falcon9'), satelliteById('comsat'))).toBeNull();
    expect(flightAnatomy(vehicleById('vostok8k72k'), satelliteById('vostok3ka'))).toBeNull();
    expect(flightAnatomy({ ...v21a, derivedFrom: 'soyuz21a', id: 'custom-1' }, satelliteById('comsat'))).toBeNull();
    expect(flightAnatomy({ ...v21b, stages: v21b.stages.slice(0, 2) }, satelliteById('comsat'))).toBeNull();
  });

  it('Build offers the 2.1a two pages, the 2.1b one, and no other vehicle any', () => {
    expect(anatomyPagesFor('soyuz21a').map((p) => p.variant)).toEqual(['soyuz-ms', 'progress-ms-26']);
    expect(anatomyPagesFor('soyuz21b').map((p) => p.variant)).toEqual(['fregat-st31']);
    expect(anatomyPagesFor('falcon9')).toEqual([]);
  });
});

describe('the model fitted into the stack', () => {
  it('stretches Blok A and Blok I by a few per cent at most, and keeps everything above Blok I its own size', () => {
    for (const [variant, sat] of [['soyuz-ms', 'crew'], ['progress-ms-26', 'progress'], ['fregat-st31', 'weather']] as const) {
      const spec = payloadVehicle(vehicleById(variant === 'fregat-st31' ? 'soyuz21b' : 'soyuz21a'), satelliteById(sat));
      const fit = anatomyFit(spec, model(variant), variant !== 'fregat-st31');
      expect(fit.core.sy, variant).toBeGreaterThan(1);
      expect(fit.core.sy, variant).toBeLessThan(1.03);
      expect(Math.abs(fit.stage3.sy - 1), variant).toBeLessThan(0.05);
      expect(fit.fairing.sy).toBe(1);
      expect(fit.booster.y0).toBe(fit.core.y0);
      expect(fit.booster.sy).toBe(fit.core.sy);
    }
  });

  it('2.1b: the ST fairing round Fregat, and the satellite on Fregat, as the stack layout cannot stand them', () => {
    const spec = vehicleById('soyuz21b'), m = model('fregat-st31');
    const fit = anatomyFit(spec, m, false), layout = stackLayout(spec);
    const blokITop = layout.base[1] + spec.stages[1].length;
    // Fregat dropped onto Blok I's top, over the adapter the layout puts between
    expect(layout.base[2] + fit.fregat!.dy).toBeCloseTo(blokITop, 9);
    // the fairing from Blok I's top, not from Fregat's
    expect(layout.total + fit.fairing.dy).toBeCloseTo(blokITop, 9);
    // the satellite on Fregat's top
    expect(layout.total + fit.satelliteSeat!).toBeCloseTo(blokITop + m.parts.fregat!.max.y - m.parts.fregat!.min.y, 9);
    expect(fit.payload).toBeNull();
  });
});

describe('RocketView with the model mounted', () => {
  for (const [variant, sat, orbit] of [['soyuz-ms', 'crew', 'iss'], ['progress-ms-26', 'progress', 'iss'], ['fregat-st31', 'weather', 'sso']] as const) {
    it(`${variant}: draws the model in each stage's place and hides its own drawing of it`, () => withCanvas(() => {
      const sim = simulation(variant === 'fregat-st31' ? 'soyuz21b' : 'soyuz21a', sat, orbit);
      expect(flightAnatomy(sim.vehicleSpec, sim.satellite)).toBe(variant);
      const rocket = new RocketView(sim.vehicleSpec, sim.satellite);
      const ship = variant === 'soyuz-ms' ? 'soyuz-ms' : variant === 'progress-ms-26' ? 'progress' : null;
      const m = model(variant);
      const fit = rocket.mountAnatomy(m, ship);
      rocket.update(captureFrame(sim), { night: 0 });
      const layout = stackLayout(sim.vehicleSpec);
      const parts = (rocket as unknown as { stages: { group: THREE.Group; own: THREE.Object3D[]; boosters: { units: { own: THREE.Object3D[]; frost: unknown }[] }[] }[] }).stages;
      for (const p of parts) for (const o of p.own) expect(o.visible).toBe(false);
      for (const u of parts[0].boosters[0].units) { for (const o of u.own) expect(o.visible).toBe(false); expect(u.frost).toBeNull(); }
      // Blok A from its base to Blok I's
      const core = box(named(rocket.group, 'anatomy:core')[0]);
      expect(core.min.y).toBeCloseTo(0, 2);
      expect(core.max.y).toBeLessThanOrEqual(layout.height[0] + 1e-3);
      expect(core.max.y).toBeGreaterThan(layout.height[0] - 0.4);
      // four strap-ons, their bases level with Blok A's, one on each side
      const boosters = named(rocket.group, 'anatomy:booster').map(box);
      expect(boosters).toHaveLength(4);
      for (const b of boosters) {
        expect(b.min.y).toBeGreaterThan(0);
        expect(b.min.y).toBeLessThan(0.6);
        expect(Math.hypot((b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2)).toBeGreaterThan(2);
      }
      // Blok I on Blok A: its bottom (its skirt's, on 2.1b) on Blok A's top
      const blokIBottom = Math.min(...['anatomy:stage3', 'anatomy:skirt'].flatMap((n) => named(rocket.group, n)).map((o) => box(o).min.y));
      expect(blokIBottom).toBeCloseTo(layout.base[1], 2);
      expect(named(rocket.group, 'anatomy:bay')).toHaveLength(1);
      // Blok I's bells on the model's chambers: their tops at the chambers' tops, their glow at the exits
      const blokIPart = parts[1] as unknown as { engines: { nozzles: { x: number; z: number; r: number; len: number; y?: number }[]; ids: string[] }; vernier: unknown; plume: { group: THREE.Group } };
      const chambers = fit.chambers!;
      for (const [i, n] of blokIPart.engines.nozzles.entries()) {
        if (variant === 'fregat-st31' && blokIPart.engines.ids[i].includes('.vernier.')) { expect(n.r).toBe(0); continue; }
        expect(chambers.some((c) => Math.hypot(c.x - n.x, c.z - n.z) < 1e-9 && Math.abs(c.top - (n.y ?? 0)) < 1e-9 && Math.abs(c.top - n.len - c.exit) < 1e-9)).toBe(true);
      }
      expect(blokIPart.plume.group.position.y).toBeCloseTo(Math.min(...chambers.filter((c) => c.kind === 'main').map((c) => c.exit)), 9);
      if (variant === 'fregat-st31') expect(blokIPart.vernier).toBeNull();
      else expect(blokIPart.vernier).not.toBeNull();
      // the fairing on Blok I's top, both halves
      expect(named(rocket.group, 'anatomy:fairing-left')).toHaveLength(1);
      const fairing = box(named(rocket.group, 'anatomy:fairing-right')[0]);
      expect(fairing.min.y).toBeCloseTo(layout.base[1] + sim.vehicleSpec.stages[1].length, 2);
      if (variant === 'soyuz-ms') {
        // the escape tower on the fairing's nose, its jettison fire leaving the model's jettison nozzles
        const tower = box(named(rocket.group, 'anatomy:escape')[0]);
        expect(tower.min.y).toBeCloseTo(fairing.max.y, 2);
        // one plume from each of the model's twelve jettison nozzles, near the tower's top
        const flame = (rocket as unknown as { crewedTop: { flame: THREE.Mesh } }).crewedTop.flame;
        const jets = fit.tower!.jets!, pos = flame.geometry.attributes.position, v = new THREE.Vector3();
        expect(jets).toHaveLength(12);
        expect(pos.count % jets.length).toBe(0);
        for (const j of jets) {
          expect(j.y).toBeGreaterThan(4);
          let near = Infinity;
          for (let i = 0; i < pos.count; i++) near = Math.min(near, v.fromBufferAttribute(pos, i).distanceTo(new THREE.Vector3(j.x, j.y, j.z)));
          expect(near).toBeLessThan(2 * j.r);
        }
      }
      if (variant === 'fregat-st31') {
        // Fregat's bell on the model's S5.92 chamber, its flame at the chamber's exit
        const fregat = parts[2] as unknown as { engines: { nozzles: { x: number; z: number; r: number; len: number; y?: number }[] }; plume: { group: THREE.Group } };
        const [c] = fit.fregatChambers!;
        expect(fregat.engines.nozzles).toHaveLength(1);
        expect(fregat.engines.nozzles[0].y).toBeCloseTo(c.top, 9);
        expect(fregat.engines.nozzles[0].len).toBeCloseTo(c.top - c.exit, 9);
        expect(fregat.plume.group.position.y).toBeCloseTo(c.exit, 9);
        // its flame as wide at the root as the stage's own layout makes it for its own bell: about the S5.92's exit, not 3 times it
        const plume = (fregat.plume as unknown as { radius: number }).radius;
        expect(plume).toBeGreaterThan(c.r);
        expect(plume).toBeLessThan(1.5 * c.r);
        // inside the model's Fregat, which hangs below the stage's base over the adapter
        expect(c.exit).toBeLessThan(0);
        expect(c.exit).toBeGreaterThan(fit.fregat!.dy);
      }
      // each strap-on's engines hang from the model's strap-on, not 0.36 m below it
      for (const unit of parts[0].boosters[0].units as unknown as { group: THREE.Group; engines: { bells: THREE.InstancedMesh } }[]) {
        const body = box(unit.group.children.find((o) => o.name === 'anatomy:booster')!);
        unit.engines.bells.updateWorldMatrix(true, false);
        const bellTop = new THREE.Vector3(0, 0, 0).applyMatrix4(unit.engines.bells.matrixWorld);
        expect(bellTop.y).toBeCloseTo(body.min.y, 3);
      }
      // the camera frames, and the Mach-1 collar sits on, the model's fairing
      const pad = captureFrame(sim);
      expect(rocket.currentHeight(pad)).toBeCloseTo(fairing.max.y, 1);
      const collar = (rocket as unknown as { vapourAt: { y: number } }).vapourAt.y;
      expect(collar).toBe(fit.fairingShoulder);
      expect(fit.fairingShoulder).toBeGreaterThan(fit.fairing.dy);
      expect(fit.fairingTop - fit.fairingShoulder).toBeGreaterThan(1);
      if (variant === 'fregat-st31') {
        // the model's Blok I aft skirt, on until the flight sheds its own 14.06 s after Blok I lights, then falling away whole
        const skirt = named(rocket.group, 'anatomy:skirt')[0].parent!;
        const blokI = (rocket as unknown as { stages: { skirt: { update(s: number): void; group: THREE.Group } }[] }).stages[1].skirt;
        blokI.update(1);
        expect(skirt.visible).toBe(true);
        expect(skirt.position.y).toBe(0);
        blokI.update(14.5);
        expect(skirt.visible).toBe(true);
        expect(skirt.position.y).toBeLessThan(-1);
        // the flight's own petals are never drawn beside it
        const shown = (o: THREE.Object3D): boolean => o.visible && (!o.parent || shown(o.parent));
        let petals = 0;
        blokI.group.traverse((o) => { if ((o as THREE.Mesh).isMesh && shown(o)) petals++; });
        expect(petals).toBe(0);
        blokI.update(18.5);
        expect(skirt.visible).toBe(false);
      } else {
        // the 2.1a model has no aft skirt: the flight's petals stay, in the model's grey-green
        const paint = m.materials.find((x) => x.name === 'rocket-gray-green')!;
        const blokI = (rocket as unknown as { stages: { skirt: { group: THREE.Group } }[] }).stages[1].skirt;
        const petals: THREE.Mesh[] = [];
        blokI.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) petals.push(o as THREE.Mesh); });
        expect(petals.length).toBeGreaterThan(0);
        for (const petal of petals) expect((petal.material as THREE.MeshStandardMaterial).color.getHex()).toBe(new THREE.Color(paint.color).getHex());
      }
      if (ship) {
        expect(named(rocket.group, 'anatomy:payload')).toHaveLength(1);
        expect(fit.payload!.seat).toBeGreaterThanOrEqual(0);
        expect(fit.payload!.seat).toBeLessThan(0.5);
      }
      rocket.dispose();
    }));
  }
});

describe('spent parts drawn from the model', () => {
  /** A piece of debris as the frame carries it the moment it separates (not tumbling yet), `anchor` below the separation plane at the origin, its axis up. */
  const debris = (id: number, visual: DebrisFrame['visual'], anchor: number): DebrisFrame => ({
    id, r: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 1, z: 0 }, visual, alive: true, createdAt: 1, anchor,
  } as unknown as DebrisFrame);
  const drawn = (variant: AnatomyVariant | null, vehicleId: string, sat: string, list: DebrisFrame[]) => withCanvas(() => {
    const scene = new THREE.Scene();
    const view = new DebrisView({ scene, toScene: (p: { x: number; y: number; z: number }, out: THREE.Vector3) => out.set(p.x, p.y, p.z) } as unknown as SceneManager);
    const spec = payloadVehicle(vehicleById(vehicleId), satelliteById(sat));
    if (variant) {
      const m = model(variant);
      view.setAnatomy({ model: m, fit: anatomyFit(spec, m, false), blokIDiameter: spec.stages[1].diameter, fregatDiameter: spec.stages[2]?.diameter ?? null });
    }
    view.update(list, 1);
    const out: Record<string, THREE.Box3> = {};
    bells = [];
    scene.traverse((o) => {
      if (o.name === 'anatomy:bells') bells.push(o.children.length);
      else if (o.name.startsWith('anatomy:')) out[o.name] = box(o);
    });
    return out;
  });
  /** the bells each spent part drawn by the last `drawn` carries, in the scene's order */
  let bells: number[] = [];

  it('Blok I as the point-mass flight records it at the spacecraft\'s separation (no profile), and a strap-on', () => {
    const blokI = vehicleById('soyuz21a').stages[1], strapOn = vehicleById('soyuz21a').stages[0].boosters![0];
    const got = drawn('soyuz-ms', 'soyuz21a', 'crew', [
      debris(1, { diameter: blokI.diameter, length: blokI.length, color: '#ccc', kind: 'upperStage' }, -blokI.length),
      debris(2, { diameter: strapOn.diameter, length: strapOn.length, color: '#ccc', kind: 'booster', conicalTop: true }, 0),
    ]);
    expect(Object.keys(got).sort()).toEqual(['anatomy:bay', 'anatomy:booster', 'anatomy:stage3']);
    // with bells where the model's chambers are, not empty sockets: RD-0110's four and four verniers, RD-107A's four and two
    expect([...bells].sort()).toEqual([6, 8]);
    // the spent stage's top (the model's adapter ring, which stands 0.2 m proud of the physics' top, under the
    // spacecraft's base) on the separation plane, so the spacecraft leaving it does not stand inside it
    expect(got['anatomy:stage3'].max.y).toBeCloseTo(0, 3);
  });

  it('Blok A with its truss, and its bells', () => {
    const blokA = vehicleById('soyuz21a').stages[0];
    const got = drawn('soyuz-ms', 'soyuz21a', 'crew', [
      debris(1, { diameter: blokA.diameter, length: blokA.length, color: '#ccc', kind: 'stage', profile: 'r7Core' }, -stackLayout(vehicleById('soyuz21a')).height[0]),
    ]);
    expect(Object.keys(got)).toEqual(['anatomy:core']);
    expect(bells).toEqual([8]);   // RD-108A's four and four verniers
  });

  it('a spent Fregat with its top on the plane its satellite left from', () => {
    const spec = vehicleById('soyuz21b'), fregat = spec.stages[2];
    const got = drawn('fregat-st31', 'soyuz21b', 'weather', [
      debris(1, { diameter: fregat.diameter, length: fregat.length, color: '#ccc', kind: 'upperStage' }, -stackLayout(spec).height[2]),
    ]);
    expect(got['anatomy:fregat'].max.y).toBeCloseTo(0, 3);
    expect(bells).toEqual([1]);   // its S5.92
  });

  it('none on any other flight', () => {
    const got = drawn(null, 'falcon9', 'comsat', [debris(1, { diameter: 3.66, length: 13.8, color: '#ccc', kind: 'upperStage' }, -13.8)]);
    expect(got).toEqual({});
  });
});

describe('the spacecraft', () => {
  it('Progress MS-26 unfolds its arrays on the page\'s own hinges', () => withCanvas(() => {
    const m = model('progress-ms-26');
    expect(m.hinges.length).toBeGreaterThan(0);
    const spec = payloadVehicle(vehicleById('soyuz21a'), satelliteById('progress'));
    const ship = anatomySpacecraft(m, anatomyFit(spec, m, true), anatomyMaterials(m), 'progress');
    const hinged: THREE.Object3D[] = [];
    ship.group.traverse((o) => { if (o.userData.hinge !== undefined) hinged.push(o); });
    expect(hinged.length).toBe(m.hinges.length);
    ship.setDeploy(0);
    for (const h of hinged) expect(h.matrix.equals(new THREE.Matrix4())).toBe(true);
    ship.setDeploy(1);
    for (const h of hinged) expect(h.matrix.equals(new THREE.Matrix4())).toBe(false);
    // a hinge chain at full travel: each rotation in turn, as the page applies them
    const k = hinged[0].userData.hinge as number, p = new THREE.Vector3(...m.hinges[k].rotations[0].pivot).add(new THREE.Vector3(0.3, 0, 0.2));
    const want = p.clone();
    for (const r of m.hinges[k].rotations) {
      const pivot = new THREE.Vector3(...r.pivot);
      want.sub(pivot).applyAxisAngle(new THREE.Vector3(...r.axis).normalize(), r.angle).add(pivot);
    }
    expect(p.clone().applyMatrix4(hinged[0].matrix).distanceTo(want)).toBeLessThan(1e-9);
    setHinges(ship.group, m, 0);
    expect(hinged[0].matrix.equals(new THREE.Matrix4())).toBe(true);
  }));

  it('Soyuz MS: the page\'s folded arrays until they open, then the flight\'s wings', () => withCanvas(() => {
    const m = model('soyuz-ms');
    const spec = payloadVehicle(vehicleById('soyuz21a'), satelliteById('crew'));
    const mats = anatomyMaterials(m);
    const ship = anatomySpacecraft(m, anatomyFit(spec, m, true), mats, 'soyuz-ms');
    const solar = mats.filter((_, i) => m.materials[i].name === 'solar-cell-blue');
    const folded: THREE.Mesh[] = [];
    ship.group.traverse((o) => { if ((o as THREE.Mesh).isMesh && solar.includes((o as THREE.Mesh).material as THREE.MeshStandardMaterial)) folded.push(o as THREE.Mesh); });
    expect(folded.length).toBeGreaterThan(0);
    ship.setDeploy(0);
    expect(folded.every((o) => o.visible)).toBe(true);
    ship.setDeploy(1);
    expect(folded.some((o) => o.visible)).toBe(false);
    // the wings hinged where the folded arrays were
    const foldedFoot = Math.min(...folded.map((o) => { o.geometry.computeBoundingBox(); return o.geometry.boundingBox!.min.y; }));
    const hinges: THREE.Object3D[] = [];
    ship.group.traverse((o) => { if (Math.abs(Math.abs(o.position.x) - 1.36) < 1e-9 && !(o as THREE.Mesh).isMesh) hinges.push(o); });
    expect(hinges).toHaveLength(2);
    for (const h of hinges) expect(h.position.y).toBeCloseTo(foldedFoot, 9);
    expect(ship.height).toBeGreaterThan(7);
    expect(ship.height).toBeLessThan(8.5);
  }));
});

describe('docking', () => {
  it('a ship drawn longer than the physics knows it is set down so its probe, not its base, meets the port', () => withCanvas(() => {
    const sim = simulation('soyuz21a', 'crew', 'iss');
    const rocket = new RocketView(sim.vehicleSpec, sim.satellite);
    rocket.mountAnatomy(model('soyuz-ms'), 'soyuz-ms');
    const ship = (rocket as unknown as { satellite: { group: THREE.Group; height: number } }).satellite;
    const free = { ...captureFrame(sim), payloadSeparated: true };
    rocket.update(free, { night: 0 });
    const base = ship.group.position.y - ship.height / 2;
    expect(base).toBeCloseTo(0, 9);   // on the separation plane, as before
    // flown by the rendezvous, which hangs the drawing from a base size.height − probe below the CG
    const rigid = { configurationId: 'rendezvous.spacecraft', engineDeflections: {}, renderOffsetBody: { x: -2.8, y: 0, z: 0 }, cgBody: { x: 0, y: 0, z: 0 } };
    rocket.update({ ...free, rigid } as unknown as typeof free, { night: 0 });
    const tip = ship.group.position.y + ship.height / 2;
    expect(ship.height).toBeGreaterThan(7.5);
    expect(tip).toBeCloseTo(sim.satellite.size!.height, 9);
    rocket.dispose();
  }));
});

describe('loading the meshes', () => {
  const page = 'https://example.github.io/Orbitlab/';
  it('asks again after a failed fetch, not after a file that arrived but cannot be used', async () => {
    vi.resetModules();
    const { loadAnatomy } = await import('../src/render/anatomy');
    const fetches: string[] = [];
    vi.stubGlobal('fetch', async (url: URL) => {
      fetches.push(String(url));
      if (String(url).includes('fregat')) throw new TypeError('offline');
      return new Response(new Uint8Array([79, 76, 65, 88, 1, 0, 0, 0]).buffer);   // "OLAX", format 1: an old cached file
    });
    try {
      await expect(loadAnatomy('fregat-st31', page)).rejects.toThrow('offline');
      await expect(loadAnatomy('fregat-st31', page)).rejects.toThrow('offline');
      await expect(loadAnatomy('soyuz-ms', page)).rejects.toThrow(/format 1/);
      await expect(loadAnatomy('soyuz-ms', page)).rejects.toThrow(/format 1/);
      expect(fetches.filter((u) => u.includes('fregat'))).toHaveLength(2);
      expect(fetches.filter((u) => u.includes('soyuz-ms'))).toHaveLength(1);
    } finally { vi.unstubAllGlobals(); }
  });
});
