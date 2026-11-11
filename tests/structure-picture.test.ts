/**
 * What the Structure section's 3-D view is told to show for the state it is
 * in (src/ui/structure/picture.ts): each part's state, what is painted, which
 * of the picture's layers are needed (so which files are fetched), and where
 * the units stand — while exploring, assembling and changing a design.
 */
import { describe, expect, it } from 'vitest';
import { FLAG } from '../src/render/structure-viewer';
import { REFERENCE_DESIGN } from '../src/structure/edusat-design';
import type { Pose } from '../src/structure/model';
import type { StructureStore } from '../src/ui/structure/store';
import { CHANGED_COLOUR, apartPose, picture } from '../src/ui/structure/picture';
import { openStore } from './structure-harness';

const itemsOf = (store: StructureStore, id: string): readonly number[] => store.adapter.tree().nodes.get(id)!.items;
const count = (flags: Uint8Array, bit: number): number => flags.reduce((n, f) => n + ((f & bit) ? 1 : 0), 0);
const all = (flags: Uint8Array, items: readonly number[], bit: number): boolean => items.every((i) => (flags[i] & bit) !== 0);
const none = (flags: Uint8Array, items: readonly number[], bit: number): boolean => items.every((i) => (flags[i] & bit) === 0);
/** Where the reference has it: not moved, not turned, drawn. */
const atRest = (pose: Pose): boolean => pose.visible && pose.move.every((x) => Math.abs(x) < 1e-12) && !(pose.turns ?? []).length;

describe('exploring the rocket', () => {
  it('opens on the whole model as it is: nothing marked, only the first layer asked for', async () => {
    const { store } = await openStore({ level: 'watch', model: 'soyuz-st31' });
    const p = picture(store);
    expect(p.flags.every((f) => f === 0)).toBe(true);
    expect([...p.layers]).toEqual(['outer']);
    expect(p.colour).toBe('material');
    expect(p.paint.colours).toEqual([]);
    for (const u of store.adapter.units) expect(atRest(p.poses.get(u)!), u).toBe(true);
  });

  it('lights an assembly picked, and what it is joined to; its inside stays unfetched until something asks for it', async () => {
    const { store } = await openStore({ level: 'watch', model: 'soyuz-st31' });
    store.select('core');
    const p = picture(store);
    expect(all(p.flags, itemsOf(store, 'core'), FLAG.selected)).toBe(true);
    for (const u of ['booster-b', 'booster-v', 'booster-g', 'booster-d', 'interstage']) expect(all(p.flags, itemsOf(store, u), FLAG.related), u).toBe(true);
    for (const u of ['stage3', 'fregat', 'payload', 'fairing-left']) expect(none(p.flags, itemsOf(store, u), FLAG.related | FLAG.selected), u).toBe(true);
    expect([...p.layers]).toEqual(['outer']);
    expect(p.focus).toHaveLength(itemsOf(store, 'core').length);
  });

  it('sees through what stands round the thing picked: the fairing, for Fregat under it', async () => {
    const { store } = await openStore({ level: 'watch', model: 'soyuz-st31' });
    store.select('fregat');
    const p = picture(store);
    expect(all(p.flags, itemsOf(store, 'fairing-left'), FLAG.ghost)).toBe(true);
    expect(all(p.flags, itemsOf(store, 'fairing-right'), FLAG.ghost)).toBe(true);
    expect(none(p.flags, itemsOf(store, 'fregat'), FLAG.ghost)).toBe(true);
  });

  it('fetches the layer a group or a part picked lies in', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31' });
    store.select('core/tanks');
    expect([...picture(store).layers].sort()).toEqual(['inner', 'outer']);
    store.select('core/engine-feed');
    expect([...picture(store).layers].sort()).toEqual(['engine', 'outer']);
    // and the group's cover is seen through, so the group can be seen where it is
    const p = picture(store);
    expect(count(p.flags, FLAG.ghost)).toBeGreaterThan(0);
    expect(all(p.flags, itemsOf(store, 'core/engine-feed'), FLAG.selected)).toBe(true);
  });

  it('cuts away what the page marks as the near half, and draws the inside', async () => {
    const { store } = await openStore({ level: 'watch', model: 'soyuz-st31' });
    store.setView({ cutaway: true });
    const p = picture(store);
    const cut = store.adapter.cutaway()!;
    expect(count(p.flags, FLAG.hidden)).toBe(cut.hidden.length);
    expect(all(p.flags, cut.hidden, FLAG.hidden)).toBe(true);
    expect([...p.layers].sort()).toEqual(['inner', 'outer']);
  });

  it('follows an internal system: its parts painted by what flows, the step in hand lit, everything else dimmed', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31' });
    const system = store.adapter.systems().find((s) => s.id === 'rd107108-main-oxidizer')!;
    store.showSystem(system.id, 1);
    const p = picture(store);
    expect(p.paint.colours).toEqual([system.colour]);
    expect(system.items.every((i) => p.paint.of[i] === 0)).toBe(true);
    expect(all(p.flags, system.steps[1].items, FLAG.selected)).toBe(true);
    expect(count(p.flags, FLAG.selected)).toBe(system.steps[1].items.length);
    expect(count(p.flags, FLAG.dim)).toBe(p.flags.length - system.items.length);
    // and seen through, so a system that runs inside the model shows whole
    expect(count(p.flags, FLAG.ghost)).toBe(p.flags.length - system.items.length);
    expect(none(p.flags, system.items, FLAG.ghost | FLAG.dim)).toBe(true);
    expect(p.layers.has('engine')).toBe(true);
    expect(p.focus).toEqual(system.steps[1].items);
    // the whole system: nothing singled out
    store.showSystem(system.id, null);
    expect(count(picture(store).flags, FLAG.selected)).toBe(0);
  });

  it('shows a joint: its parts on the fitted side lit, on the other side marked', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31' });
    const relation = store.adapter.relations.find((r) => r.a === 'booster-b' && r.b === 'core')!;
    const joint = store.adapter.joint(relation);
    expect(joint.a.length + joint.b.length).toBeGreaterThan(0);
    store.select('booster-b');
    store.showJoint(relation.id);
    const p = picture(store);
    expect(all(p.flags, joint.a, FLAG.selected)).toBe(true);
    expect(all(p.flags, joint.b, FLAG.related)).toBe(true);
    expect(count(p.flags, FLAG.selected)).toBe(joint.a.length);
    expect(p.focus.slice().sort((x, y) => x - y)).toEqual([...joint.a, ...joint.b].sort((x, y) => x - y));
  });

  it('follows a system chosen after a joint was shown: the system is what is lit, framed and fetched', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31' });
    const relation = store.adapter.relations.find((r) => r.a === 'stage3' && r.b === 'interstage')!;
    store.select('stage3');
    store.showJoint(relation.id);
    const system = store.adapter.systems().find((s) => s.id.startsWith('rd0124'))!;
    store.showSystem(system.id);
    expect(store.jointShown['soyuz-st31']).toBeNull();
    const p = picture(store);
    expect([...p.focus].sort((a, b) => a - b)).toEqual([...system.items].sort((a, b) => a - b));
    for (const i of system.items) expect(p.layers.has(store.adapter.layerOfItem(i))).toBe(true);
    expect(count(p.flags, FLAG.related)).toBe(0);
  });

  it('lights a part picked while a system is followed, among the system\'s parts, and frames it', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31' });
    const system = store.adapter.systems().find((s) => s.steps.length > 1)!;
    store.showSystem(system.id, 1);
    store.select('fairing-left');
    const p = picture(store), fairing = itemsOf(store, 'fairing-left');
    expect(all(p.flags, fairing, FLAG.selected)).toBe(true);
    expect(fairing.some((i) => (p.flags[i] & (FLAG.dim | FLAG.ghost)) !== 0)).toBe(false);
    expect([...p.focus].sort((a, b) => a - b)).toEqual([...fairing].sort((a, b) => a - b));
    // the system stays painted, its step no longer the lit thing
    expect(system.items.every((i) => p.paint.of[i] === 0)).toBe(true);
    expect(system.steps[1].items.some((i) => !fairing.includes(i) && (p.flags[i] & FLAG.selected) !== 0)).toBe(false);
  });

  it('hides what was hidden, shows alone what was isolated, and dims all but the legend\'s one kind', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31' });
    store.toggleHidden('fairing-left');
    expect(all(picture(store).flags, itemsOf(store, 'fairing-left'), FLAG.hidden)).toBe(true);
    store.showAll();
    store.setView({ isolate: 'fregat' });
    const alone = picture(store);
    expect(count(alone.flags, FLAG.hidden)).toBe(alone.flags.length - itemsOf(store, 'fregat').length);
    store.showAll();
    store.setView({ colour: 'category', only: 'category:propulsion' });
    const p = picture(store);
    const setup = store.adapter.setup();
    const propulsion = [...setup.category].filter((c) => c === 5).length;
    expect(count(p.flags, FLAG.dim)).toBe(p.flags.length - propulsion);
    expect(p.colour).toBe('category');
  });

  it('takes the vehicle apart, opens the fairing, and leaves behind what a step of the flight has dropped', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31' });
    store.setView({ explode: 1, open: 1 });
    const apart = picture(store);
    const moved = store.adapter.units.filter((u) => apart.poses.get(u)!.move.some((x) => Math.abs(x) > 1e-6) || (apart.poses.get(u)!.turns ?? []).length > 0);
    expect(moved.length).toBeGreaterThanOrEqual(9);
    store.setView({ explode: 0, open: 0 });
    store.flight['soyuz-st31'] = 3; // the strap-ons and the fairing are gone
    const p = picture(store);
    for (const u of ['booster-b', 'booster-v', 'booster-g', 'booster-d', 'fairing-left', 'fairing-right']) expect(p.poses.get(u)!.visible, u).toBe(false);
    for (const u of ['core', 'interstage', 'stage3', 'fregat', 'payload']) expect(p.poses.get(u)!.visible, u).toBe(true);
  });
});

describe('exploring the satellite', () => {
  it('lights a subsystem\'s units; a thing joined to most of the rest lights none of it', async () => {
    const { store } = await openStore({ level: 'watch', model: 'edusat' });
    store.select('sys:power');
    const p = picture(store);
    for (const u of ['battery', 'eps', 'panel-px', 'panel-ny']) expect(all(p.flags, itemsOf(store, u), FLAG.selected), u).toBe(true);
    expect(count(p.flags, FLAG.related)).toBe(0);
    // a single unit with few neighbours shows them
    store.open('explore');
    store.select('antenna');
    const q = picture(store);
    expect(all(q.flags, itemsOf(store, 'radio'), FLAG.related)).toBe(true);
  });

  it('opens with two side panels swung off, so the inside is seen', async () => {
    const { store } = await openStore({ level: 'watch', model: 'edusat' });
    const p = picture(store);
    const swung = store.adapter.units.filter((u) => (p.poses.get(u)!.turns ?? []).length > 0);
    expect(swung.sort()).toEqual(['panel-ny', 'panel-px']);
    store.setView({ open: 0 });
    expect(store.adapter.units.filter((u) => (picture(store).poses.get(u)!.turns ?? []).length > 0)).toEqual([]);
  });
});

describe('assembling', () => {
  it('at a first look draws the loose units as outlines where they belong, the next one lit', async () => {
    const { store } = await openStore({ level: 'watch', model: 'soyuz-st31', mode: 'assemble' });
    let p = picture(store);
    expect(all(p.flags, itemsOf(store, 'core'), FLAG.faint | FLAG.target)).toBe(true);
    expect(all(p.flags, itemsOf(store, 'booster-b'), FLAG.faint)).toBe(true);
    expect(none(p.flags, itemsOf(store, 'booster-b'), FLAG.target)).toBe(true);
    for (const u of store.adapter.units) expect(atRest(p.poses.get(u)!), u).toBe(true);
    store.fit('core');
    p = picture(store);
    // fitted: drawn solid (and selected, to be read about); the strap-ons and the interstage can go in now
    expect(none(p.flags, itemsOf(store, 'core'), FLAG.faint | FLAG.target)).toBe(true);
    for (const u of ['booster-b', 'booster-d', 'interstage']) expect(all(p.flags, itemsOf(store, u), FLAG.target), u).toBe(true);
    expect(none(p.flags, itemsOf(store, 'stage3'), FLAG.target)).toBe(true);
    expect([...p.layers]).toEqual(['outer']);
    expect(p.colour).toBe('material');
  });

  it('from the middle depth lays the loose units out apart, and holds the one in hand at the place chosen', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31', mode: 'assemble' });
    let p = picture(store);
    expect(count(p.flags, FLAG.faint)).toBe(0);
    expect(p.poses.get('booster-b')).toEqual(apartPose(store.adapter, 'booster-b'));
    expect(p.poses.get('booster-b')!.move.some((x) => Math.abs(x) > 1)).toBe(true);
    store.hold('core');
    p = picture(store);
    expect(all(p.flags, itemsOf(store, 'core'), FLAG.selected)).toBe(true);
    expect(p.focus).toHaveLength(itemsOf(store, 'core').length);
    store.chooseSlot('core');
    expect(picture(store).poses.get('core')).toEqual(store.adapter.slotPose('core', 'core', store.held['soyuz-st31']!.turn));
    // the reference outline can be asked for at any depth
    store.hold(null);
    store.setView({ outline: true });
    expect(count(picture(store).flags, FLAG.faint)).toBe(p.flags.length);
  });

  it('moves a dragged part with the pointer, and settles it on the place it is over', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31', mode: 'assemble' });
    const lying = apartPose(store.adapter, 'booster-b');
    store.dragStart('booster-b');
    store.dragTo([1, 2, 3], null);
    let p = picture(store);
    expect(p.poses.get('booster-b')!.move).toEqual([lying.move[0] + 1, lying.move[1] + 2, lying.move[2] + 3]);
    expect(all(p.flags, itemsOf(store, 'booster-b'), FLAG.selected)).toBe(true);
    expect(p.poses.get('booster-v')).toEqual(apartPose(store.adapter, 'booster-v')); // nothing else moves
    store.dragTo([1, 2, 3], 'booster-b');
    p = picture(store);
    expect(p.poses.get('booster-b')).toEqual(store.adapter.slotPose('booster-b', 'booster-b', store.held['soyuz-st31']!.turn));
    store.dragEnd(false);
    expect(picture(store).poses.get('booster-b')).toEqual(lying);
  });

  it('draws a side panel on the face it was put on', async () => {
    const { store } = await openStore({ level: 'explore', model: 'edusat', mode: 'assemble' });
    for (const u of ['frame', 'stack', 'payload', 'battery', 'eps', 'adcs', 'obc', 'radio']) {
      store.hold(u); store.chooseSlot(u);
      for (let k = 0; k < 4 && store.held.edusat!.turn !== 0; k++) store.turn();
      store.install();
    }
    store.hold('panel-px'); store.chooseSlot('face-ny');
    for (let k = 0; k < 4 && store.held.edusat!.turn !== 0; k++) store.turn(); // a panel lies cells down when picked up
    store.install();
    expect(store.assembly.placed['panel-px']).toMatchObject({ slot: 'face-ny' });
    const pose = picture(store).poses.get('panel-px')!;
    expect(pose).toEqual(store.adapter.slotPose('panel-px', 'face-ny', 0));
    expect(pose.turns).toEqual([{ axis: 'y', angle: store.adapter.slotTurn('panel-px', 'face-ny'), pivot: [0, 0, 0] }]);
    expect(Math.abs(store.adapter.slotTurn('panel-px', 'face-ny'))).toBeCloseTo(Math.PI / 2, 9);
  });
});

describe('changing a design', () => {
  it('paints the parts that differ from the reference, in the experiment only', async () => {
    const { store } = await openStore({ level: 'explore', model: 'edusat', mode: 'experiment' });
    expect(picture(store).paint.colours).toEqual([]);
    store.makeExperiment(REFERENCE_DESIGN);
    expect(picture(store).paint.colours).toEqual([]); // a copy that is still the reference
    store.setExperiment({ battery: 'battery-1cell', payload: 'camera-night' });
    store.adapter.configure({ design: store.pictureDesign(), deployed: false }); // as the stage does before it asks for the picture
    const p = picture(store);
    expect(p.paint.colours).toEqual([CHANGED_COLOUR]);
    const payload = itemsOf(store, 'payload'), battery = itemsOf(store, 'battery');
    expect(payload.every((i) => p.paint.of[i] === 0)).toBe(true);
    expect(battery.every((i) => p.paint.of[i] === -1)).toBe(true);
    // the reference shown again: nothing painted
    store.showDesign('reference');
    store.adapter.configure({ design: store.pictureDesign(), deployed: false });
    expect(picture(store).paint.colours).toEqual([]);
  });
});
