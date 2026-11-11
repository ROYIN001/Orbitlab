/**
 * The shared description every model of the Structure section is given by
 * (src/structure/model.ts): the tree read at the three depths, and each
 * model's relations and order held to its units and to its assembly rules.
 * And the section's models held to the app's addresses and to their words
 * (src/ui/structure/models/index.ts): a model added in one place and not the
 * others fails here.
 */
import { describe, expect, it } from 'vitest';
import { EMPTY_ASSEMBLY, install, type AssemblyState } from '../src/structure/assembly';
import { EDUSAT_ASSEMBLY, EDUSAT_MOUNTS, EDUSAT_ORDER, EDUSAT_RELATIONS, EDU_SUBSYSTEMS, EDU_UNITS } from '../src/structure/edusat';
import { REFERENCE_DESIGN, eduTree, itemsOf, subsystemNode } from '../src/structure/edusat-design';
import {
  TIER_OF_DEPTH, atDepth, buildTree, nodeOfUnit, pathOf, relationProblems, relationStatus, unitOf, unitsUnder, type ModelNode,
} from '../src/structure/model';
import { STRUCTURE_MODES } from '../src/structure/progress';
import { SOYUZ_ASSEMBLY, SOYUZ_MOUNTS, SOYUZ_ORDER, SOYUZ_RELATIONS, SOYUZ_UNITS } from '../src/structure/soyuz';
import { SOYUZ_FILES, indexSoyuz, jointParts, parseSoyuzContent, soyuzTree } from '../src/structure/soyuz-content';
import { STRUCTURE_MODELS } from '../src/structure/types';
import { APP_PAGES, hashForRoute, route, routeFromHash } from '../src/ui/app-mode';
import { makeAdapters, modelPages, pageOf } from '../src/ui/structure/models/index';
import { fromPage, pageOf as loaderPageOf } from '../src/ui/structure-loader';
import { hasText } from '../src/ui/structure/text';
import { fakeApp } from './structure-harness';

const load = (id: string): Promise<unknown> => import(/* @vite-ignore */ id);
const { readFileSync } = (await load('node:fs')) as { readFileSync(path: URL, enc: string): string };
const soyuz = indexSoyuz(parseSoyuzContent(JSON.parse(readFileSync(new URL(`../public/${SOYUZ_FILES.content}`, import.meta.url), 'utf8'))));

describe('a model\'s tree', () => {
  const nodes: ModelNode[] = [
    { id: 'A', parent: null, tier: 1, items: [0, 1, 2], unit: 'A' },
    { id: 'A/g', parent: 'A', tier: 2, items: [0, 1] },
    { id: 'A/g/p0', parent: 'A/g', tier: 3, items: [0] },
    { id: 'B', parent: null, tier: 1, items: [3], unit: 'B' },
  ];
  const tree = buildTree(nodes, 4);

  it('keeps the model\'s own order, and gives each part of the picture its deepest node', () => {
    expect(tree.roots).toEqual(['A', 'B']);
    expect(tree.children.get('A')).toEqual(['A/g']);
    expect(tree.leafOf).toEqual(['A/g/p0', 'A/g', 'A', 'B']);
    expect(pathOf(tree, 'A/g/p0').map((n) => n.id)).toEqual(['A', 'A/g', 'A/g/p0']);
  });

  it('reads one selection at each depth\'s grain: itself, or its nearest ancestor the depth reaches', () => {
    expect(TIER_OF_DEPTH).toEqual({ watch: 1, explore: 2, engineer: 3 });
    expect(atDepth(tree, 'A/g/p0', 'watch')?.id).toBe('A');
    expect(atDepth(tree, 'A/g/p0', 'explore')?.id).toBe('A/g');
    expect(atDepth(tree, 'A/g/p0', 'engineer')?.id).toBe('A/g/p0');
    expect(atDepth(tree, 'B', 'engineer')?.id).toBe('B');
    expect(atDepth(tree, null, 'watch')).toBeNull();
    expect(atDepth(tree, 'nothing', 'watch')).toBeNull();
    expect(atDepth(tree, tree.leafOf[1] ?? null, 'engineer')?.id).toBe('A/g');
    expect(atDepth(tree, tree.leafOf[1] ?? null, 'watch')?.id).toBe('A');
    expect(atDepth(tree, tree.leafOf[9] ?? null, 'watch')).toBeNull();
  });

  it('knows the unit a node is or lies in, and the units a node covers', () => {
    expect(unitOf(tree, 'A/g/p0')).toBe('A');
    expect(unitsUnder(tree, 'A/g')).toEqual(['A']);
    expect(nodeOfUnit(tree, 'B')?.id).toBe('B');
    expect(nodeOfUnit(tree, 'C')).toBeNull();
  });

  it('refuses a description that does not hold together', () => {
    expect(() => buildTree([...nodes, nodes[0]], 4)).toThrow(/appears twice/);
    expect(() => buildTree([{ id: 'x', parent: 'gone', tier: 2, items: [0] }], 1)).toThrow(/no parent/);
    expect(() => buildTree([{ id: 'a', parent: null, tier: 2, items: [0] }, { id: 'b', parent: 'a', tier: 2, items: [0] }], 1)).toThrow(/lies under/);
    expect(() => buildTree([{ id: 'a', parent: null, tier: 1, items: [5] }], 1)).toThrow(/names item 5/);
    expect(() => buildTree([{ id: 'a', parent: null, tier: 1, items: [0] }], 2)).toThrow(/item 1 belongs to no node/);
  });
});

describe('the two models as trees', () => {
  it('the rocket: its eleven assemblies, the page\'s groups under them, every part under a group', () => {
    const tree = soyuzTree(soyuz);
    expect(tree.roots).toEqual([...SOYUZ_UNITS]);
    const n = soyuz.content.items.length;
    expect(tree.leafOf).toHaveLength(n);
    for (let i = 0; i < n; i++) {
      const path = pathOf(tree, tree.leafOf[i]);
      expect(path.map((x) => x.tier), `item ${i}`).toEqual([1, 2, 3]);
      expect(path[2].id).toBe(soyuz.content.items[i].id);
      expect(path[0].unit).toBe(soyuz.content.items[i].unit);
    }
    // an assembly's parts are its groups' parts: each listed under one group, the one that names it most closely
    for (const unit of SOYUZ_UNITS) {
      const groups = tree.children.get(unit) ?? [];
      const listed = groups.flatMap((g) => (tree.children.get(g) ?? []).map((id) => tree.nodes.get(id)!.items[0])).sort((a, b) => a - b);
      expect(listed, unit).toEqual([...tree.nodes.get(unit)!.items].sort((a, b) => a - b));
      // and no group is empty: the page's "whole engine", whose every part a narrower group names, stands for its whole list
      for (const g of groups) expect(tree.nodes.get(g)!.items.length, g).toBeGreaterThan(0);
    }
    expect(tree.children.get('core/engine-system') ?? []).toEqual([]);
    expect(tree.nodes.get('core/engine-system')!.items.length).toBeGreaterThan(100);
  });

  it('the rocket: a part is in the group that says what it is — Fregat\'s spheres are its tanks and bays, the engine\'s parts its narrower groups\'', () => {
    const tree = soyuzTree(soyuz);
    const under = (id: string): readonly string[] => tree.children.get(id) ?? [];
    // Fregat: the page lists the six spheres both as tanks and bays and as its outer surface
    expect([...under('fregat/tanks')].sort()).toEqual([
      'fregat.acs-hydrazine-tank', 'fregat.avionics-bay-1', 'fregat.avionics-bay-2', 'fregat.helium-storage-1', 'fregat.helium-storage-2',
      'fregat.main-tank-1', 'fregat.main-tank-3', 'fregat.main-tank-4', 'fregat.main-tank-6',
    ]);
    // a group every part of which another names stands for its whole list, with no parts of its own under it
    expect([under('fregat/exterior').length, tree.nodes.get('fregat/exterior')!.items.length]).toEqual([0, 6]);
    expect(tree.nodes.get('fregat/exterior')!.items.every((i) => tree.nodes.get('fregat/tanks')!.items.includes(i))).toBe(true);
    for (const unit of ['core', 'booster-b']) {
      const whole = tree.nodes.get(`${unit}/engine-system`)!;
      expect(under(whole.id)).toEqual([]);
      const narrower = ['main-chambers', 'verniers', 'powerpack', 'engine-feed', 'engine-gas', 'engine-mount'].flatMap((g) => tree.nodes.get(`${unit}/${g}`)!.items);
      expect([...narrower].sort((a, b) => a - b)).toEqual([...whole.items].sort((a, b) => a - b));
    }
    // every part has exactly one group over it
    const counted = new Map<number, number>();
    for (const n of tree.nodes.values()) if (n.tier === 2) for (const k of under(n.id)) { const i = tree.nodes.get(k)!.items[0]; counted.set(i, (counted.get(i) ?? 0) + 1); }
    expect(counted.size).toBe(soyuz.content.items.length);
    expect([...counted.values()].every((c) => c === 1)).toBe(true);
  });

  it('the rocket\'s joints: each lights the hardware it is named for, and one the page draws no hardware for lights nothing', () => {
    const names = (items: number[]): string[] => [...new Set(items.map((i) => {
      const id = soyuz.content.items[i].id;
      return id.slice(id.indexOf('.') + 1).replace(/\.(?:left|right)\.(?:back|front)$|\.(?:back|front)$/, '');
    }))].sort();
    const joint = (a: string, b: string) => {
      const j = jointParts(soyuz, SOYUZ_RELATIONS.find((r) => r.a === a && r.b === b)!);
      return { a: names(j.a), b: names(j.b), marked: j.at !== null };
    };
    expect(joint('booster-b', 'core')).toEqual({ a: ['nose-contact', 'upper-attachment'], b: [], marked: true });
    expect(joint('interstage', 'core')).toEqual({ a: ['lower-interface'], b: [], marked: true });
    expect(joint('stage3', 'interstage')).toEqual({ a: [], b: ['upper-interface'], marked: true });
    expect(joint('fregat', 'stage3')).toEqual({ a: ['lower-load-ring', 'lower-post-ring'], b: ['rd0124-payload-adapter'], marked: true });
    expect(joint('payload', 'fregat')).toEqual({ a: [], b: ['payload-load-ring'], marked: true });
    expect(joint('fairing-left', 'stage3')).toEqual({ a: ['st-joint-0'], b: [], marked: true });
    // the halves meet along a line up the fairing: the page's rings round it at stations are not that line
    expect(joint('fairing-left', 'fairing-right')).toEqual({ a: [], b: [], marked: false });
    expect(joint('fairing-left', 'payload')).toEqual({ a: [], b: [], marked: false });
    // every joint is one of those kinds
    for (const r of SOYUZ_RELATIONS) expect(['strapOn', 'trussLower', 'trussUpper', 'adapter', 'payloadRing', 'fairingBase', 'fairingSeam', 'encloses']).toContain(r.joint);
  });

  it('the satellite: five subsystems, its thirteen units under them, each unit\'s pieces under it', () => {
    const items = itemsOf(REFERENCE_DESIGN);
    const tree = eduTree(items);
    expect(tree.roots).toEqual(EDU_SUBSYSTEMS.map((s) => subsystemNode(s.id)));
    expect(EDU_SUBSYSTEMS.flatMap((s) => [...s.units]).sort()).toEqual([...EDU_UNITS].sort());
    for (const s of EDU_SUBSYSTEMS) expect(tree.children.get(subsystemNode(s.id))).toEqual([...s.units]);
    for (const u of EDU_UNITS) expect(nodeOfUnit(tree, u)).toMatchObject({ id: u, tier: 2 });
    // a press on a battery cell: the power system at a first look, the battery at the middle depth, the cell itself at the deepest
    const cell = items.find((it) => it.unit === 'battery' && it.piece.kind === 'cell18650')!;
    expect(atDepth(tree, tree.leafOf[cell.index] ?? null, 'watch')?.id).toBe(subsystemNode('power'));
    expect(atDepth(tree, tree.leafOf[cell.index] ?? null, 'explore')?.id).toBe('battery');
    expect(atDepth(tree, tree.leafOf[cell.index] ?? null, 'engineer')?.id).toBe(cell.id);
    expect(unitsUnder(tree, subsystemNode('power')).sort()).toEqual(['battery', 'eps', 'panel-nx', 'panel-ny', 'panel-px', 'panel-py']);
  });
});

describe('how each model\'s units meet, and the order they go together in', () => {
  it('holds together: every end a unit, what mounts waits for what carries it, and the assembly\'s rules are exactly the order\'s', () => {
    expect(relationProblems(SOYUZ_UNITS, SOYUZ_RELATIONS, SOYUZ_ORDER, SOYUZ_ASSEMBLY)).toEqual([]);
    expect(relationProblems(EDU_UNITS, EDUSAT_RELATIONS, EDUSAT_ORDER, EDUSAT_ASSEMBLY)).toEqual([]);
  });

  it('finds what is wrong in one that does not', () => {
    const spec = { ...SOYUZ_ASSEMBLY, units: SOYUZ_ASSEMBLY.units.map((u) => (u.id === 'fregat' ? { ...u, requires: [] } : u)) };
    expect(relationProblems(SOYUZ_UNITS, SOYUZ_RELATIONS, SOYUZ_ORDER, spec)).toEqual(['fregat: requires [], the order rules say [stage3]']);
    const noWait = SOYUZ_ORDER.filter((r) => !(r.unit === 'interstage' && r.after === 'core'));
    expect(relationProblems(SOYUZ_UNITS, SOYUZ_RELATIONS, noWait, SOYUZ_ASSEMBLY).some((p) => p.includes('interstage mounts on core but does not wait for it'))).toBe(true);
    expect(relationProblems(SOYUZ_UNITS, [...SOYUZ_RELATIONS, { ...SOYUZ_RELATIONS[0], b: 'moon' }], SOYUZ_ORDER, SOYUZ_ASSEMBLY)).toEqual(expect.arrayContaining([expect.stringContaining('an end is not a unit'), expect.stringContaining('appears twice')]));
  });

  it('counts a joint as made once both its ends are in place', () => {
    const withCore = (install(SOYUZ_ASSEMBLY, EMPTY_ASSEMBLY, 'core', { slot: 'core', orientation: 0 }) as { state: AssemblyState }).state;
    expect(relationStatus(SOYUZ_RELATIONS, withCore).filter((s) => s.made)).toEqual([]);
    const withBooster = (install(SOYUZ_ASSEMBLY, withCore, 'booster-b', { slot: 'booster-b', orientation: 0 }) as { state: AssemblyState }).state;
    expect(relationStatus(SOYUZ_RELATIONS, withBooster).filter((s) => s.made).map((s) => [s.relation.a, s.relation.b])).toEqual([['booster-b', 'core']]);
  });

  it('gives every place a number of its own and a name, and every order rule a reason, in words the section has', () => {
    for (const [mounts, spec] of [[SOYUZ_MOUNTS, SOYUZ_ASSEMBLY], [EDUSAT_MOUNTS, EDUSAT_ASSEMBLY]] as const) {
      expect(mounts.map((m) => m.slot).sort()).toEqual(spec.slots.map((s) => s.id).sort());
      expect(mounts.map((m) => m.mark)).toEqual(mounts.map((_, k) => k + 1));
      for (const m of mounts) expect(hasText(m.name), m.name).toBe(true);
    }
    for (const r of [...SOYUZ_ORDER, ...EDUSAT_ORDER]) expect(hasText(r.why), r.why).toBe(true);
  });
});

describe('the section\'s models and the app\'s addresses', () => {
  const adapters = makeAdapters(fakeApp().env);

  it('has an adapter for every model, each with its own id and at least exploring and assembling', () => {
    expect(Object.keys(adapters).sort()).toEqual([...STRUCTURE_MODELS].sort());
    for (const m of STRUCTURE_MODELS) {
      expect(adapters[m].id).toBe(m);
      expect(adapters[m].activities.slice(0, 2)).toEqual(['explore', 'assemble']);
      for (const a of adapters[m].activities) expect(STRUCTURE_MODES).toContain(a);
      for (const key of [`model.${m}`, `model.${m}.short`, `model.${m}.sub`, `asm.about.${m}`]) expect(hasText(key), key).toBe(true);
    }
    // the rocket is not for changing; the satellite is
    expect(adapters['soyuz-st31'].experiment).toBeUndefined();
    expect(adapters['soyuz-st31'].activities).not.toContain('experiment');
    expect(adapters.edusat.activities).toContain('experiment');
    expect(adapters.edusat.experiment).toBeDefined();
  });

  it('has exactly the pages the app\'s router knows for the section', () => {
    const routed = Object.entries(APP_PAGES).filter(([, p]) => p.section === 'structure').map(([name]) => name).sort();
    expect(modelPages(adapters).sort()).toEqual(routed);
  });

  it('names a model\'s activity in the address, and the app\'s loader reads it back the same way', () => {
    for (const m of STRUCTURE_MODELS) for (const a of adapters[m].activities) {
      const page = pageOf(m, a);
      // the app's side names pages by its own copy of the rule (it imports nothing of the section): the two agree
      expect(loaderPageOf(m, a)).toBe(page);
      expect(fromPage(page)).toEqual({ model: m, mode: a });
      const hash = hashForRoute(route('structure', 'explore', page as never));
      expect(hash).toBe(`#/structure/explore/${page}`);
      expect(routeFromHash(hash)).toMatchObject({ section: 'structure', mode: 'explore', page });
    }
    expect(pageOf('edusat', 'explore')).toBe('edusat');
    expect(fromPage('edusat/assemble')).toEqual({ model: 'edusat', mode: 'assemble' });
    expect(fromPage(undefined)).toEqual({});
    // an address that names no page of the section does not reach the loader: the router gives the section's own page
    for (const hash of ['#/structure/explore/moon', '#/structure/explore/edusat/fly']) {
      const to = routeFromHash(hash);
      const page = to && to.section ? to.page : undefined;
      expect(page === undefined || modelPages(adapters).includes(page), hash).toBe(true);
    }
  });
});
