/**
 * The rocket put together in the order of the launch site
 * (src/structure/soyuz-site.ts; owner, 2026-11-13), beside its reference
 * order: what each step waits for, the steps that fit no part, where the
 * assemblies are drawn meanwhile (lying, the upper part apart until docked,
 * upright once erected), and how the store holds the two orders side by
 * side — each with its own state, kept in the learner's profile.
 */
import { describe, expect, it } from 'vitest';
import { EMPTY_ASSEMBLY, checkAssembly, install, nextUnits, remove, specProblems, type AssemblyState } from '../src/structure/assembly';
import { posed, REST } from '../src/structure/model';
import { readProgress, writeProgress } from '../src/structure/progress';
import { SOYUZ_ASSEMBLY, SOYUZ_BOOSTERS, SOYUZ_FAIRING, SOYUZ_UNITS } from '../src/structure/soyuz';
import { SITE_GAP, SITE_LENGTH, SITE_LIFT, SITE_OPERATIONS, SITE_SOURCES, SITE_UPPER, SOYUZ_SITE_ASSEMBLY, SOYUZ_SITE_ORDER, siteStand } from '../src/structure/soyuz-site';
import { FLAG } from '../src/render/structure-viewer';
import { picture } from '../src/ui/structure/picture';
import { tx } from '../src/ui/structure/text';
import { fakeApp, openStore } from './structure-harness';

const spec = SOYUZ_SITE_ASSEMBLY;
const put = (state: AssemblyState, ...units: string[]): AssemblyState => units.reduce((s, u) => {
  const r = install(spec, s, u, { slot: u, orientation: 0 });
  if (!r.ok) throw new Error(`${u}: ${r.refusal.code}`);
  return r.state;
}, state);
const refusal = (state: AssemblyState, unit: string) => {
  const r = install(spec, state, unit, { slot: unit, orientation: 0 });
  return r.ok ? null : r.refusal;
};
const PACKAGE = ['core', ...SOYUZ_BOOSTERS, 'interstage'];
const HEAD = ['fregat', 'payload', ...SOYUZ_FAIRING];

describe('the order of the launch site', () => {
  it('is the reference\'s assemblies in the reference\'s places, with two steps that fit no part after them', () => {
    expect(specProblems(spec)).toEqual([]);
    expect(spec.units.map((u) => u.id)).toEqual([...SOYUZ_UNITS, ...SITE_OPERATIONS]);
    expect(spec.slots.map((s) => s.id)).toEqual([...SOYUZ_UNITS, ...SITE_OPERATIONS]);
    for (const u of SOYUZ_ASSEMBLY.units) expect(spec.units.find((x) => x.id === u.id)).toMatchObject({ slots: u.slots, orientations: u.orientations });
    // every rule names units of the spec, and has its reason in words
    const ids = new Set(spec.units.map((u) => u.id));
    for (const r of SOYUZ_SITE_ORDER) {
      expect(ids.has(r.unit) && ids.has(r.after), `${r.unit} after ${r.after}`).toBe(true);
      expect(tx(r.why), r.why).not.toBe(r.why);
    }
  });

  it('begins in two places at once: the central core in one hall, Fregat in the other', () => {
    expect(nextUnits(spec, EMPTY_ASSEMBLY)).toEqual(['core', 'fregat']);
    // the package: the side blocks and the truss on the core, in any order
    expect(refusal(EMPTY_ASSEMBLY, 'booster-b')).toMatchObject({ code: 'missing', missing: ['core'] });
    const core = put(EMPTY_ASSEMBLY, 'core');
    expect(nextUnits(spec, core)).toEqual([...SOYUZ_BOOSTERS, 'interstage', 'fregat']);
    expect(checkAssembly(spec, put(core, 'booster-d', 'interstage', 'booster-b')).placed).toBe(4);
  });

  it('builds the head unit apart: the payload on Fregat, then the fairing round both, with no part of the package needed', () => {
    expect(refusal(EMPTY_ASSEMBLY, 'payload')).toMatchObject({ code: 'missing', missing: ['fregat'] });
    const fregat = put(EMPTY_ASSEMBLY, 'fregat');
    expect(refusal(fregat, 'fairing-left')).toMatchObject({ code: 'missing', missing: ['payload'] });
    const head = put(fregat, 'payload', 'fairing-right', 'fairing-left');
    expect(Object.keys(head.placed).sort()).toEqual([...HEAD].sort());
  });

  it('mates the third stage to the head unit only once the fairing is closed — unlike the reference, where the third stage comes before Fregat', () => {
    expect(refusal(put(EMPTY_ASSEMBLY, 'fregat', 'payload', 'fairing-left'), 'stage3')).toMatchObject({ code: 'missing', missing: ['fairing-right'] });
    expect(refusal(put(EMPTY_ASSEMBLY, ...PACKAGE), 'stage3')).toMatchObject({ code: 'missing', missing: [...SOYUZ_FAIRING] });
    expect(refusal(put(EMPTY_ASSEMBLY, ...HEAD), 'stage3')).toBeNull();
    // the reference's order has it the other way
    expect(SOYUZ_ASSEMBLY.units.find((u) => u.id === 'fregat')!.requires).toContain('stage3');
    expect(spec.units.find((u) => u.id === 'fregat')!.requires).toEqual([]);
  });

  it('docks the two built halves only when every assembly is in place, then rolls out and erects; and is complete only then', () => {
    const almost = put(EMPTY_ASSEMBLY, ...PACKAGE, ...HEAD);
    expect(refusal(almost, 'site-dock')).toMatchObject({ code: 'missing', missing: ['stage3'] });
    expect(refusal(almost, 'site-erect')).toMatchObject({ code: 'missing', missing: ['site-dock'] });
    const built = put(almost, 'stage3');
    expect(nextUnits(spec, built)).toEqual(['site-dock']);
    expect(checkAssembly(spec, built).complete).toBe(false);
    const docked = put(built, 'site-dock');
    expect(nextUnits(spec, docked)).toEqual(['site-erect']);
    // once docked, no assembly comes off before the docking is taken back
    const off = remove(spec, docked, 'booster-b');
    expect(off.ok).toBe(false);
    if (!off.ok) expect(off.refusal).toMatchObject({ code: 'holds', dependents: ['site-dock'] });
    const done = put(docked, 'site-erect');
    expect(checkAssembly(spec, done)).toMatchObject({ complete: true, placed: 13, total: 13 });
  });
});

describe('where the assemblies are drawn under the site\'s order', () => {
  const at = (unit: string, done: Record<string, unknown>, p: readonly [number, number, number]) => posed(siteStand(REST, unit, done), p);

  it('lies along +x, clear of the floor, the upper part a gap away from the package until they are docked', () => {
    // a point on the vehicle's axis h metres up is h along the floor, lifted
    expect(at('core', {}, [0, 10, 0])).toEqual([expect.closeTo(10 - (SITE_LENGTH + SITE_GAP) / 2, 9), expect.closeTo(SITE_LIFT, 9), expect.closeTo(0, 9)]);
    // a point off the axis keeps its distance from it (a side block's 4 m out is 4 m below or above)
    const [, y, z] = at('booster-b', {}, [4, 10, 1.5]);
    expect(Math.hypot(y - SITE_LIFT, z)).toBeCloseTo(Math.hypot(4, 1.5), 9);
    for (const u of SOYUZ_UNITS) {
      const [x] = at(u, {}, [0, 30, 0]), [docked] = at(u, { 'site-dock': 1 }, [0, 30, 0]);
      expect(x - docked, u).toBeCloseTo(SITE_UPPER.has(u) ? SITE_GAP : 0, 9);
    }
    expect([...SITE_UPPER].sort()).toEqual(['fairing-left', 'fairing-right', 'fregat', 'payload', 'stage3']);
  });

  it('stands as the reference has it once erected', () => {
    const done = { 'site-dock': 1, 'site-erect': 1 };
    for (const u of SOYUZ_UNITS) expect(at(u, done, [1, 20, -2]), u).toEqual([1, 20, -2]);
    // and a unit's own turn and move are kept under the lying frame
    const base = { move: [0, 2, 0] as const, turns: [{ axis: 'y' as const, angle: Math.PI / 2, pivot: [0, 0, 0] as const }], visible: true };
    const lying = posed(siteStand(base, 'core', {}), [1, 0, 0]);
    const upright = posed(base, [1, 0, 0]);
    expect(lying).toEqual([expect.closeTo(upright[1] - (SITE_LENGTH + SITE_GAP) / 2, 9), expect.closeTo(SITE_LIFT - upright[0], 9), expect.closeTo(upright[2], 9)]);
  });

  it('keeps the whole model above the floor while it lies, and its length is the model\'s', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31', mode: 'assemble' });
    const a = store.adapter, tree = a.tree();
    let low = Infinity, top = -Infinity;
    for (const u of SOYUZ_UNITS) {
      const anchor = a.slotAnchor(u)!;
      low = Math.min(low, posed(siteStand(a.slotPose(u, u, 0), u, {}), anchor)[1]);
      top = Math.max(top, anchor[1]);
    }
    expect(low).toBeGreaterThan(1);
    expect(tree.nodes.size).toBeGreaterThan(SOYUZ_UNITS.length);
    // the fairing's joint is below its tip: the model's length lies between the highest joint and a little over the page's 46 m
    expect(SITE_LENGTH).toBeGreaterThan(top);
    expect(SITE_LENGTH).toBeLessThan(48);
  });
});

describe('the two orders in the store', () => {
  it('offers the site\'s order only where the model has one, and keeps what was done in each', async () => {
    const { store } = await openStore({ level: 'watch', model: 'soyuz-st31', mode: 'assemble' });
    expect(store.site).toBeNull();
    store.fit('core');
    store.fit('booster-b');
    store.setSite(true);
    expect(store.site).not.toBeNull();
    expect(store.spec).toBe(SOYUZ_SITE_ASSEMBLY);
    expect(store.assembly.placed).toEqual({});
    expect(store.next()).toEqual(['core', 'fregat']);
    store.fit('fregat');
    expect(Object.keys(store.assembly.placed)).toEqual(['fregat']);
    // back to the reference's order: what was done in it is as it was left
    store.setSite(false);
    expect(Object.keys(store.assembly.placed)).toEqual(['core', 'booster-b']);
    expect(store.spec).toBe(SOYUZ_ASSEMBLY);
    // the satellite has no such order: the choice does nothing there
    store.setSite(true);
    store.open('watch', 'edusat', 'assemble');
    expect(store.site).toBeNull();
    expect(store.spec).toBe(store.adapter.spec);
  });

  it('does a step that fits no part with a press, names it, and completes only the site\'s record', async () => {
    const { store } = await openStore({ level: 'watch', model: 'soyuz-st31', mode: 'assemble' });
    store.setSite(true);
    for (let k = 0; k < 11; k++) store.fit(store.next().find((u) => !store.isOperation(u))!);
    expect(store.next()).toEqual(['site-dock']);
    expect(store.unitName('site-dock')).toBe(tx('site.op.site-dock'));
    // a step asked for too early is refused in words
    store.hold('site-erect');
    expect(store.message?.kind).toBe('no');
    expect(store.message?.text()).toContain(tx('site.op.site-dock'));
    store.fit('site-dock');
    expect(store.message?.text()).toBe(tx('site.done', { step: tx('site.op.site-dock') }));
    expect(store.held['soyuz-st31']).toBeNull();
    expect(store.restsOn('stage3')).toEqual(['site-dock']);
    store.fit('site-erect');
    expect(store.check()).toMatchObject({ complete: true, placed: 13 });
    expect(store.progress.siteCompleted).not.toBeNull();
    expect(store.progress.completed['soyuz-st31']).toBeNull();
    // taken back one step at a time
    store.undo();
    expect(store.next()).toEqual(['site-erect']);
    store.remove('site-dock');
    expect(store.next()).toEqual(['site-dock']);
  });

  it('says what is really done at each step, in words of its own for every assembly and step', async () => {
    const { store } = await openStore({ level: 'watch', model: 'soyuz-st31', mode: 'assemble' });
    const site = store.adapter.site!;
    const notes = spec.units.map((u) => site.note(u.id));
    for (const n of notes) expect(n).not.toMatch(/^site\./);
    // the four side blocks share a note, the two halves of the fairing another
    expect(new Set(notes).size).toBe(spec.units.length - 3 - 1);
    expect(site.sources().map((s) => s.url)).toEqual(SITE_SOURCES.map((s) => s.url));
    for (const s of site.sources()) { expect(s.url).toMatch(/^https:\/\//); expect(s.note).not.toMatch(/^site\./); }
  });

  it('draws it lying with the loose parts as outlines where they belong, and marks the places there', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31', mode: 'assemble' });
    const a = store.adapter, tree = a.tree();
    expect(store.view.outline).toBe(false);
    const upright = store.placePoint('fregat')!;
    store.setSite(true);
    expect(store.outlined).toBe(true);
    store.hold('core');
    store.chooseSlot('core');
    store.install();
    const p = picture(store);
    expect(p.poses.get('core')).toEqual(siteStand(a.slotPose('core', 'core', 0), 'core', store.assembly.placed));
    const flagOf = (unit: string): number => p.flags[tree.nodes.get(unit)!.items[0]];
    expect(flagOf('core') & FLAG.faint).toBe(0);
    for (const u of ['booster-b', 'fregat', 'stage3']) {
      expect(flagOf(u) & FLAG.faint, u).toBe(FLAG.faint);
      expect(p.poses.get(u), u).toEqual(siteStand(a.slotPose(u, u, 0), u, store.assembly.placed));
    }
    // a place is marked where its thing lies now: Fregat's far along the floor, not up the reference's axis
    const lying = store.placePoint('fregat')!;
    expect(lying).toEqual(posed(siteStand(a.slotPose('fregat', 'fregat', 0), 'fregat', store.assembly.placed), a.slotAnchor('fregat')!));
    expect(lying[1]).toBeLessThan(upright[1] - 20);
    expect(lying[0]).toBeGreaterThan(upright[0] + 10);
    // a step that fits no part has no place on the picture
    expect(store.placePoint('site-dock')).toBeNull();
  });

  it('is kept in the learner\'s profile beside the reference order\'s, and read back by its own rules', async () => {
    const app = fakeApp();
    const { store } = await openStore({ level: 'watch', model: 'soyuz-st31', mode: 'assemble' }, app);
    store.fit('core');
    store.setSite(true);
    store.fit('fregat');
    store.fit('payload');
    const kept = JSON.parse(app.stored.text!);
    expect(kept.siteOn).toBe(true);
    expect(Object.keys(kept.site.placed)).toEqual(['fregat', 'payload']);
    expect(Object.keys(kept.assembly['soyuz-st31'].placed)).toEqual(['core']);
    // a new visit finds both
    const again = (await openStore({ level: 'watch', model: 'soyuz-st31', mode: 'assemble' }, app)).store;
    expect(again.site).not.toBeNull();
    expect(Object.keys(again.assembly.placed)).toEqual(['fregat', 'payload']);
    again.setSite(false);
    expect(Object.keys(again.assembly.placed)).toEqual(['core']);
  });

  it('reads a record from before the site\'s order as none begun, and drops from a stored one what its rules do not allow', () => {
    const specs = { 'soyuz-st31': SOYUZ_ASSEMBLY, edusat: SOYUZ_ASSEMBLY };
    const old = JSON.stringify({ version: 1, model: 'soyuz-st31', mode: {}, assembly: {}, completed: {} });
    expect(readProgress(old, specs, spec).progress).toMatchObject({ site: { placed: {} }, siteOn: false, siteCompleted: null });
    const edited = JSON.stringify({ version: 1, site: { placed: { stage3: { slot: 'stage3', orientation: 0 }, core: { slot: 'core', orientation: 0 }, 'site-erect': { slot: 'site-erect', orientation: 0 } } }, siteOn: true, siteCompleted: 'not a date' });
    const read = readProgress(edited, specs, spec).progress;
    expect(Object.keys(read.site.placed)).toEqual(['core']);
    expect(read.siteCompleted).toBeNull();
    expect(JSON.parse(writeProgress(read))).toMatchObject({ siteOn: true, site: { placed: { core: { slot: 'core', orientation: 0 } } } });
  });
});
