/**
 * What the Structure section holds while it is open, and what can be done to
 * it (src/ui/structure/store.ts), on a stand-in for the app
 * (tests/structure-harness.ts): the address, a selection read at each depth,
 * the assembly at a first look and deeper, the design being changed, the
 * optional helper, and what is kept in the learner's profile.
 */
import { describe, expect, it } from 'vitest';
import { REFERENCE_DESIGN } from '../src/structure/edusat-design';
import { relationStatus } from '../src/structure/model';
import { STRUCTURE_STORE_VERSION } from '../src/structure/progress';
import { fakeApp, openStore } from './structure-harness';

describe('where the section is', () => {
  it('opens at the address\'s depth, model and activity, and does not take an activity the model lacks', async () => {
    const { store } = await openStore({ level: 'watch', model: 'edusat', mode: 'experiment' });
    expect([store.level, store.model, store.mode]).toEqual(['watch', 'edusat', 'experiment']);
    store.open('engineer', 'soyuz-st31', 'experiment');
    expect([store.level, store.model, store.mode]).toEqual(['engineer', 'soyuz-st31', 'explore']);
    // a model keeps the activity it was left in
    store.open('engineer', 'edusat');
    expect(store.mode).toBe('experiment');
  });

  it('goes to a model, an activity or a depth by an address, falling back to exploring where the activity is not there', async () => {
    const { store, app } = await openStore({ level: 'explore', model: 'edusat', mode: 'experiment' });
    expect(store.href({ mode: 'assemble' })).toBe('#/structure/explore/edusat/assemble');
    expect(store.href({ level: 'engineer' })).toBe('#/structure/engineer/edusat/experiment');
    expect(store.href({ model: 'soyuz-st31', mode: 'experiment' })).toBe('#/structure/explore/soyuz-st31');
    store.go({ model: 'soyuz-st31', mode: 'assemble' });
    store.go({ level: 'watch' });
    expect(app.went).toEqual(['explore/soyuz-st31/assemble', 'watch/edusat/experiment']);
  });

  it('starts each activity from its own clear picture', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31', mode: 'explore' });
    store.select('core');
    store.showSystem('rd107108-main-fuel', 1);
    store.open('explore', 'soyuz-st31', 'assemble');
    expect(store.system['soyuz-st31']).toBeNull();
    expect(store.camera).toBe('home');
    store.hold('core');
    store.open('explore', 'soyuz-st31', 'explore');
    expect(store.held['soyuz-st31']).toBeNull();
    expect(store.sel['soyuz-st31']).toBeNull();
  });
});

describe('a selection, read at each depth', () => {
  it('is kept as it was made, and shown at the grain of the depth on screen', async () => {
    const { store } = await openStore({ level: 'engineer', model: 'soyuz-st31' });
    const tree = store.adapter.tree();
    const part = tree.nodes.get('core/tanks')!.items[0];
    store.pick(part);
    expect(store.shown()).toMatchObject({ id: tree.leafOf[part], tier: 3 });
    store.open('explore');
    expect(store.shown()?.id).toBe('core/tanks');
    store.open('watch');
    expect(store.shown()?.id).toBe('core');
    expect(store.selectedUnits()).toEqual(['core']);
    store.open('engineer');
    expect(store.shown()?.id).toBe(tree.leafOf[part]);
    store.pick(null);
    expect(store.shown()).toBeNull();
  });

  it('covers every unit of a satellite\'s subsystem at a first look', async () => {
    const { store } = await openStore({ level: 'watch', model: 'edusat' });
    const cell = store.adapter.tree().nodes.get('battery')!.items[0];
    store.pick(cell);
    expect(store.shown()?.id).toBe('sys:power');
    expect(store.selectedUnits().sort()).toEqual(['battery', 'eps', 'panel-nx', 'panel-ny', 'panel-px', 'panel-py']);
  });

  it('gives way to an internal system being followed, and comes back to the information when something is picked', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31' });
    store.select('core');
    store.showSystem('rd107108-main-fuel', 2);
    expect(store.tab['soyuz-st31']).toBe('systems');
    expect(store.sel['soyuz-st31']).toBeNull();
    expect(store.system['soyuz-st31']).toEqual({ id: 'rd107108-main-fuel', step: 2 });
    store.select('booster-b', true);
    expect(store.tab['soyuz-st31']).toBe('info');
    expect(store.camera).toBe('selection');
  });

  it('hides, shows alone and puts back', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31' });
    store.select('fairing-left');
    store.toggleHidden('fairing-left');
    expect([...store.view.hidden]).toEqual(['fairing-left']);
    expect(store.sel['soyuz-st31']).toBeNull(); // what is hidden is not left selected
    store.setView({ isolate: 'fregat', cutaway: true, explode: 0.4 });
    store.showAll();
    expect([store.view.hidden.size, store.view.isolate]).toEqual([0, null]);
    expect(store.view.cutaway).toBe(true);
    store.resetView();
    expect(store.view).toMatchObject({ explode: 0, cutaway: false, shell: false, colour: 'material', labels: true });
  });
});

describe('assembling at a first look: one press fits a part, on the reference\'s outline', () => {
  it('fits what can go in, says what a part waits for and why, and knows when it is complete', async () => {
    const { store, app } = await openStore({ level: 'watch', model: 'soyuz-st31', mode: 'assemble' });
    expect(store.view.outline).toBe(true);
    expect(store.next()).toEqual(['core']);
    store.fit('stage3');
    expect(store.message).toMatchObject({ kind: 'no' });
    expect(store.message!.text()).toContain(store.unitName('interstage'));
    expect(store.message!.text()).toContain('ขั้นที่สามตั้งอยู่บนวงแหวนบนของโครงถัก');
    expect(store.waitsFor('booster-b')).toEqual([{ unit: 'core', why: 'ปลายกรวยของบูสเตอร์ยันกับจุดยึดลูกหมากบนแกนกลาง จึงต้องมีแกนกลางก่อน' }]);
    store.fit('core');
    expect(store.message).toMatchObject({ kind: 'ok' });
    expect(Object.keys(store.assembly.placed)).toEqual(['core']);
    expect(store.held['soyuz-st31']).toBeNull();
    expect(store.focusNext).toBe('asm-next');
    // the rest, in any order the rules allow
    for (let guard = 0; guard < 20 && store.next().length; guard++) store.fit(store.next()[0]);
    const check = store.check();
    expect(check).toMatchObject({ complete: true, placed: 11, total: 11 });
    expect(relationStatus(store.adapter.relations, store.assembly).every((r) => r.made)).toBe(true);
    expect(store.focusNext).toBe('asm-done');
    expect(store.progress.completed['soyuz-st31']).toMatch(/^\d{4}-\d\d-\d\dT/);
    // kept in the learner's profile
    const kept = JSON.parse(app.stored.text!) as { version: number; assembly: Record<string, { placed: Record<string, unknown> }> };
    expect(kept.version).toBe(STRUCTURE_STORE_VERSION);
    expect(Object.keys(kept.assembly['soyuz-st31'].placed)).toHaveLength(11);
  });

  it('takes a part off only when nothing rests on it, undoes a step, and starts again', async () => {
    const { store } = await openStore({ level: 'watch', model: 'soyuz-st31', mode: 'assemble' });
    store.fit('core');
    store.fit('interstage');
    expect(store.restsOn('core')).toEqual(['interstage']);
    store.remove('core');
    expect(store.message).toMatchObject({ kind: 'no' });
    expect(store.message!.text()).toContain(store.unitName('interstage'));
    store.remove('interstage');
    expect(Object.keys(store.assembly.placed)).toEqual(['core']);
    expect(store.focusNext).toBe('tray:interstage');
    store.undo();
    expect(Object.keys(store.assembly.placed).sort()).toEqual(['core', 'interstage']);
    store.restart();
    expect(store.assembly.placed).toEqual({});
    store.undo(); // the restart itself can be undone
    expect(Object.keys(store.assembly.placed).sort()).toEqual(['core', 'interstage']);
    store.hint();
    expect(store.message!.text()).toContain(store.unitName(store.next()[0]));
  });
});

describe('assembling from the middle depth: the part is picked up, its place and its way round are the learner\'s to choose', () => {
  it('asks for a place, refuses the wrong one naming the right one, and fits the right one', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31', mode: 'assemble' });
    expect(store.view.outline).toBe(false);
    store.hold('core');
    expect(store.held['soyuz-st31']).toMatchObject({ unit: 'core', slot: null });
    store.install();
    expect(store.message).toMatchObject({ kind: 'info' });
    expect(Object.keys(store.assembly.placed)).toEqual([]);
    store.chooseSlot('booster-b');
    expect(store.camera).toBe('joint'); // a close look at the place chosen
    store.camera = null; // (the stage takes the request)
    store.install();
    expect(store.message).toMatchObject({ kind: 'no' });
    expect(store.message!.text()).toContain(store.adapter.place('core').name);
    expect(store.held['soyuz-st31']).not.toBeNull(); // still in hand
    // put down after a close look: the whole again, so every place can be seen and chosen
    store.hold(null);
    expect(store.camera).toBe('home');
    store.camera = null;
    store.hold('core');
    expect(store.camera).toBeNull(); // picked up from the whole view: the view stays
    store.chooseSlot('booster-b');
    store.camera = null;
    store.chooseSlot('core');
    store.install();
    expect(Object.keys(store.assembly.placed)).toEqual(['core']);
    expect(store.held['soyuz-st31']).toBeNull();
  });

  it('refuses a part the wrong way round and says what must face where', async () => {
    const { store } = await openStore({ level: 'explore', model: 'edusat', mode: 'assemble' });
    for (const u of ['frame', 'stack']) { store.hold(u); store.chooseSlot(u); store.install(); }
    expect(Object.keys(store.assembly.placed)).toEqual(['frame', 'stack']);
    store.hold('payload');
    store.chooseSlot('payload');
    const held = store.held.edusat!;
    // the camera lies lens up when picked up: it has to be turned
    expect(held.turn).toBe(store.adapter.trayTurn('payload'));
    expect(held.turn).not.toBe(0);
    store.install();
    expect(store.message).toMatchObject({ kind: 'no' });
    expect(store.message!.text()).toContain('เลนส์กล้องต้องหันออกทางด้าน −Z');
    store.turn();
    expect(store.held.edusat!.turn).toBe(0);
    store.install();
    expect(Object.keys(store.assembly.placed)).toContain('payload');
  });

  it('drags a loose part: it follows the pointer, settles over a free place, and is fitted when let go of there', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31', mode: 'assemble' });
    expect(store.dragStart('core')).toBe(true);
    expect(store.held['soyuz-st31']).toMatchObject({ unit: 'core', slot: null });
    store.dragTo([1, 2, 3], null);
    expect(store.drag).toEqual({ unit: 'core', move: [1, 2, 3] });
    // let go of away from every place: put down, nothing fitted
    store.dragEnd(true);
    expect([store.drag, store.held['soyuz-st31'], Object.keys(store.assembly.placed).length]).toEqual([null, null, 0]);
    // over its own place: fitted
    store.dragStart('core');
    store.dragTo([0, 0, 0], 'core');
    expect(store.held['soyuz-st31']).toMatchObject({ unit: 'core', slot: 'core' });
    store.dragEnd(true);
    expect(Object.keys(store.assembly.placed)).toEqual(['core']);
    expect(store.drag).toBeNull();
    // over a place it cannot take yet: refused with the reason, still in hand there
    store.dragStart('stage3');
    store.dragTo([0, 5, 0], 'stage3');
    store.dragEnd(true);
    expect(store.message).toMatchObject({ kind: 'no' });
    expect(store.message!.text()).toContain(store.unitName('interstage'));
    expect(store.held['soyuz-st31']).toMatchObject({ unit: 'stage3', slot: 'stage3' });
    // a drag taken away (a second finger, the pointer lost): put down, nothing fitted
    store.dragStart('interstage');
    store.dragTo([0, 1, 0], 'interstage');
    store.dragEnd(false);
    expect(store.held['soyuz-st31']).toBeNull();
    expect(Object.keys(store.assembly.placed)).toEqual(['core']);
    // a fitted part is not dragged, nor anything outside the assembly
    expect(store.dragStart('core')).toBe(false);
    expect(store.dragStart('moon')).toBe(false);
    store.open('explore', 'soyuz-st31', 'explore');
    expect(store.dragStart('interstage')).toBe(false);
  });

  it('starts again as the depth starts: on the outline at a first look, the parts laid out deeper', async () => {
    const { store } = await openStore({ level: 'watch', model: 'soyuz-st31', mode: 'assemble' });
    for (let guard = 0; guard < 20 && store.next().length; guard++) store.fit(store.next()[0]);
    store.open('explore', 'soyuz-st31', 'assemble'); // a finished assembly keeps the look it was made in
    expect(store.view.outline).toBe(true);
    store.restart();
    expect(store.view.outline).toBe(false);
    store.open('watch', 'soyuz-st31', 'assemble');
    expect(store.view.outline).toBe(true);
  });

  it('puts down what is in hand, and does not pick up what is already fitted', async () => {
    const { store } = await openStore({ level: 'explore', model: 'edusat', mode: 'assemble' });
    store.hold('frame');
    store.hold('frame');
    expect(store.held.edusat).toBeNull();
    store.hold('frame'); store.chooseSlot('frame'); store.install();
    store.hold('frame');
    expect(store.held.edusat).toBeNull();
    store.hold('stack');
    store.hold(null);
    expect(store.held.edusat).toBeNull();
  });

  it('takes any side panel on any face of the satellite, and is complete with all thirteen units', async () => {
    const { store } = await openStore({ level: 'explore', model: 'edusat', mode: 'assemble' });
    const fit = (unit: string, slot: string): void => {
      store.hold(unit); store.chooseSlot(slot);
      for (let k = 0; k < 4 && store.held.edusat && store.held.edusat.turn !== 0; k++) store.turn();
      store.install();
      expect(store.message, `${unit} → ${slot}: ${store.message?.text()}`).toMatchObject({ kind: 'ok' });
    };
    for (const u of ['frame', 'stack', 'payload', 'battery', 'eps', 'adcs', 'obc', 'radio', 'antenna']) fit(u, u);
    fit('panel-px', 'face-ny'); fit('panel-ny', 'face-px'); fit('panel-py', 'face-py'); fit('panel-nx', 'face-nx');
    expect(store.check()).toMatchObject({ complete: true, placed: 13, total: 13 });
  });
});

describe('the design being changed', () => {
  it('is a copy of the reference, shown only in its own activity; every other activity shows the reference', async () => {
    const { store, app } = await openStore({ level: 'explore', model: 'edusat', mode: 'experiment' });
    expect([store.showingMine, store.pictureDesign()]).toEqual([false, null]);
    store.makeExperiment(REFERENCE_DESIGN);
    expect(store.showingMine).toBe(true);
    expect(store.pictureDesign()).toEqual(REFERENCE_DESIGN);
    expect(store.pictureDesign()).not.toBe(REFERENCE_DESIGN);
    store.setExperiment({ battery: 'battery-2cell', payload: 'camera-night' });
    expect(store.pictureDesign()).toEqual({ battery: 'battery-2cell', payload: 'camera-night' });
    expect(REFERENCE_DESIGN).toEqual({ battery: 'battery-1cell', payload: 'camera-day' });
    store.showDesign('reference');
    expect(store.pictureDesign()).toBeNull();
    store.showDesign('mine');
    // exploring and assembling are always of the reference
    store.open('explore', 'edusat', 'explore');
    expect([store.showingMine, store.pictureDesign()]).toEqual([false, null]);
    store.open('explore', 'edusat', 'assemble');
    expect(store.pictureDesign()).toBeNull();
    store.open('explore', 'edusat', 'experiment');
    expect(store.pictureDesign()).toEqual({ battery: 'battery-2cell', payload: 'camera-night' });
    // and it is the learner's, kept in their profile
    const again = (await openStore({ level: 'explore', model: 'edusat', mode: 'experiment' }, fakeApp(app.stored.text))).store;
    expect(again.pictureDesign()).toEqual({ battery: 'battery-2cell', payload: 'camera-night' });
  });

  it('cannot be shown before it is made', async () => {
    const { store } = await openStore({ level: 'watch', model: 'edusat', mode: 'experiment' });
    store.showDesign('mine');
    expect(store.showingMine).toBe(false);
  });
});

describe('the optional helper', () => {
  it('is closed until asked for, shows each step on the picture, and leaves everything else usable', async () => {
    const { store, app } = await openStore({ level: 'watch', model: 'soyuz-st31' });
    expect(store.progress.guide).toBe(false);
    expect(store.activeGuide()).toBeNull();
    store.setGuideOpen(true);
    expect(store.guides().map((g) => g.id)).toEqual(['soyuz-tour', 'soyuz-flight']);
    store.guideStep('soyuz-tour', 1);
    expect(store.activeGuide()).toMatchObject({ step: 1 });
    expect(store.sel['soyuz-st31']).toBe('booster-b');
    expect(store.view.explode).toBe(0.5);
    // nothing is locked: another part can be picked, and the step shown again
    store.select('fregat');
    store.guideStep('soyuz-tour', 1);
    expect(store.sel['soyuz-st31']).toBe('booster-b');
    // steps past either end stay at the end
    store.guideStep('soyuz-tour', 99);
    expect(store.activeGuide()).toMatchObject({ step: 5 });
    expect(store.mode).toBe('assemble'); // its last step leads to the assembly, by an address
    expect(app.went[app.went.length - 1]).toBe('watch/soyuz-st31/assemble');
    store.endGuide();
    expect(store.activeGuide()).toBeNull();
    expect(store.progress.guide).toBe(true); // the helper stays open for another guide
  });

  it('follows the flight step by step, and puts the whole vehicle back when it is closed', async () => {
    const { store } = await openStore({ level: 'explore', model: 'soyuz-st31' });
    store.setGuideOpen(true);
    store.guideStep('soyuz-flight', 3);
    expect(store.flight['soyuz-st31']).toBe(3);
    store.setGuideOpen(false);
    expect([store.flight['soyuz-st31'], store.activeGuide()]).toEqual([null, null]);
  });
});

describe('keeping a learner\'s work', () => {
  it('says so when the profile will not take it, and stops saying so when it does', async () => {
    const app = fakeApp();
    const { store } = await openStore({ level: 'watch', model: 'soyuz-st31', mode: 'assemble' }, app);
    app.writes.answer = 'readonly';
    store.fit('core');
    expect(store.storeNote).toBe('readonly');
    app.writes.answer = 'failed';
    store.fit('interstage');
    expect(store.storeNote).toBe('failed');
    app.writes.answer = 'ok';
    app.flush(); // the app flushing a learner's work saves the section's too
    expect(store.storeNote).toBeNull();
    expect(Object.keys((JSON.parse(app.stored.text!) as { assembly: Record<string, { placed: object }> }).assembly['soyuz-st31'].placed)).toEqual(['core', 'interstage']);
  });

  it('leaves a newer version\'s record alone, and starts afresh from one it cannot read', async () => {
    const newer = fakeApp(JSON.stringify({ version: STRUCTURE_STORE_VERSION + 1, anything: true }));
    const a = (await openStore({ level: 'watch', model: 'soyuz-st31', mode: 'assemble' }, newer)).store;
    expect(a.storeNote).toBe('newer');
    a.fit('core');
    expect(newer.writes.count).toBe(0);
    expect(JSON.parse(newer.stored.text!)).toEqual({ version: STRUCTURE_STORE_VERSION + 1, anything: true });
    const damaged = fakeApp('{ not json');
    const b = (await openStore({ level: 'watch', model: 'soyuz-st31', mode: 'assemble' }, damaged)).store;
    expect(b.storeNote).toBe('damaged');
    b.fit('core');
    expect(damaged.writes.count).toBeGreaterThan(0);
  });
});
