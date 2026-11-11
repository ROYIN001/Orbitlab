/**
 * The Structure section's stage, above and below the picture: the row that
 * chooses the model and the activity, and the bar under the picture — the
 * view's tools while exploring (which ones, by the depth: a first look gets
 * a few, each deeper depth adds its own, and a tool keeps its place from one
 * depth to the next), the part in hand and its controls while assembling
 * (in one line of sight with the picture, on a phone too), and the result of
 * a design while it is being changed.
 */
import { occupant } from '../../structure/assembly';
import { nodeOfUnit } from '../../structure/model';
import { STRUCTURE_MODES } from '../../structure/progress';
import { STRUCTURE_MODELS, type Depth } from '../../structure/types';
import type { ColorMode } from '../../render/structure-viewer';
import { button, el, link } from './dom';
import type { Stage } from './stage';
import type { StructureStore } from './store';
import { tx } from './text';

const DEPTHS: readonly Depth[] = ['watch', 'explore', 'engineer'];
const reaches = (level: Depth, least: Depth): boolean => DEPTHS.indexOf(level) >= DEPTHS.indexOf(least);

/** The stage's head: the models, and the model's activities with how far each has got. */
export function stageHead(store: StructureStore, head: HTMLElement): void {
  const models = el('div', 'st-models');
  models.setAttribute('role', 'group');
  models.setAttribute('aria-label', tx('model.label'));
  for (const m of STRUCTURE_MODELS) {
    const a = link(tx(`model.${m}.short`), `model:${m}`, store.href({ model: m }), { current: m === store.model, cls: 'st-model', title: tx(`model.${m}`) });
    models.append(a);
  }
  const tabs = el('nav', 'st-tabs');
  tabs.setAttribute('aria-label', tx('mode.label'));
  const adapter = store.adapter;
  for (const mode of STRUCTURE_MODES) {
    if (!adapter.activities.includes(mode)) continue;
    const a = link(tx(`mode.${mode}`), `mode:${mode}`, store.href({ mode }), { current: mode === store.mode, cls: 'st-tab' });
    // how far the activity has got: the assembly's count or its completion, and whether there is an experiment
    if (mode === 'assemble') {
      const check = store.check();
      if (check.complete) a.append(el('span', 'st-tab-mark st-ok-mark', tx('mode.done')));
      else if (check.placed) a.append(el('span', 'st-tab-mark', `${check.placed}/${check.total}`));
    } else if (mode === 'experiment' && store.progress.experiment) a.append(el('span', 'st-tab-mark', tx('mode.have')));
    tabs.append(a);
  }
  head.replaceChildren(models, tabs);
}

// ─── exploring: the view's tools ─────────────────────────────────────────────

function slider(label: string, k: string, value: number, set: (x: number, done: boolean) => void, disabled: boolean): HTMLElement {
  const wrap = el('label', 'st-slider');
  wrap.append(el('span', '', label));
  const input = el('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.value = String(Math.round(value * 100));
  input.dataset.k = k;
  input.disabled = disabled;
  input.addEventListener('input', () => set(Number(input.value) / 100, false));
  input.addEventListener('change', () => set(Number(input.value) / 100, true));
  wrap.append(input);
  return wrap;
}

function exploreTools(store: StructureStore, stage: Stage): HTMLElement {
  const adapter = store.adapter, v = store.view, level = store.level;
  const ready = stage.ready();
  const shown = store.shown(), has = !!shown;
  const row = el('div', 'st-tools');
  row.setAttribute('role', 'toolbar');
  row.setAttribute('aria-label', tx('view.label'));
  const add = (least: Depth, node: HTMLElement | false): void => { if (node && reaches(level, least)) row.append(node); };
  const toggle = (label: string, k: string, on: boolean, set: () => void, glyph?: string): HTMLElement => button(label, k, set, { pressed: on, disabled: !ready, glyph });

  add('watch', button(tx('view.home'), 'home', () => stage.home(), { disabled: !ready, glyph: '⌂' }));
  add('watch', button(tx('view.focus'), 'focus', () => stage.focus(), { disabled: !ready || !has, glyph: '◎' }));
  // taken apart: a switch at a first look, a slider from the middle depth
  if (level === 'watch') add('watch', toggle(tx('view.apart'), 'apart', v.explode > 0.5, () => { store.camera = 'home'; store.setView({ explode: v.explode > 0.5 ? 0 : 1 }); }, '⇲'));
  else add('explore', slider(tx('view.explode'), 'explode', v.explode, (x, done) => { if (done) store.camera = 'home'; store.setView({ explode: x }, done ? 'all' : 'picture'); }, !ready));
  if (adapter.offers.open) {
    const name = tx(`view.open.${store.model}`);
    if (level === 'watch') add('watch', toggle(name, 'open', v.open > 0.5, () => store.setView({ open: v.open > 0.5 ? 0 : 1 }), '◨'));
    else add('explore', slider(name, 'fairing', v.open, (x, done) => store.setView({ open: x }, done ? 'all' : 'picture'), !ready));
  }
  if (adapter.offers.cutaway) add('watch', toggle(tx('view.cutaway'), 'cutaway', v.cutaway, () => { if (!v.cutaway) store.camera = 'cutaway'; store.setView({ cutaway: !v.cutaway }); }, '◐'));
  if (adapter.offers.deploy) add('watch', toggle(tx('view.deploy'), 'deploy', v.deployed, () => store.setView({ deployed: !v.deployed }), '✣'));
  add('watch', toggle(tx('view.labels'), 'labels', v.labels, () => store.setView({ labels: !v.labels }), 'Aa'));
  add('explore', toggle(tx('view.ghost'), 'ghost', v.shell, () => store.setView({ shell: !v.shell }), '◌'));
  add('explore', button(tx('view.hide'), 'hide', () => { if (shown) store.toggleHidden(shown.id); }, { disabled: !ready || !has }));
  add('explore', button(tx('view.isolate'), 'isolate', () => { if (shown) { store.camera = 'selection'; store.setView({ isolate: shown.id }); } }, { disabled: !ready || !has }));
  add('explore', button(tx('view.showAll'), 'showAll', () => store.showAll(), { disabled: !ready || (!v.hidden.size && !v.isolate) }));
  // the colour view: by kind of part from the middle depth, by how a shape is known at the deepest
  if (reaches(level, 'explore')) {
    const colour = el('label', 'st-select');
    colour.append(el('span', '', tx('view.colour')));
    const select = el('select');
    select.dataset.k = 'colour';
    const modes: ColorMode[] = level === 'engineer' ? ['material', 'category', 'certainty'] : ['material', 'category'];
    for (const c of modes) {
      const o = el('option', '', tx(`view.colour.${c}`));
      o.value = c;
      o.selected = v.colour === c;
      select.append(o);
    }
    select.disabled = !ready;
    select.addEventListener('change', () => store.setView({ colour: select.value as ColorMode, only: null }));
    colour.append(select);
    row.append(colour);
  }
  // the picture's further layers by name, at the deepest depth (elsewhere they come when something asks for them)
  if (level === 'engineer') for (const layer of adapter.layers.slice(1)) {
    add('engineer', toggle(tx(`view.layer.${layer}`), layer, !!v.layers[layer], () => store.setView({ layers: { ...v.layers, [layer]: !v.layers[layer] } })));
  }
  add('watch', button(tx('view.reset'), 'reset', () => store.resetView(), { disabled: !ready, glyph: '↺' }));

  const box = el('div', 'st-bar-explore');
  box.append(row);
  const notes: (string | HTMLElement)[] = [];
  if (v.cutaway) notes.push(tx('view.cutawayNote'));
  if (v.shell) notes.push(tx('view.ghostNote'));
  if (v.explode > 0) notes.push(tx('view.explodeNote'));
  if (v.hidden.size) notes.push(tx('view.hiddenCount', { n: v.hidden.size }));
  if (store.flight[store.model] !== null) notes.push(tx('view.flightNote'));
  if (store.system[store.model]) {
    // what is followed has its own way off at every depth (a guide's step can put it on where the systems' tab is not offered)
    const p = el('p', 'st-small st-bar-note', `${tx('view.systemNote')} `);
    p.append(button(tx('sys.stop'), 'bar:sys:stop', () => { store.focusNext = 'home'; store.showSystem(null); }, { cls: 'st-link' }));
    notes.push(p);
  }
  for (const note of notes) box.append(typeof note === 'string' ? el('p', 'st-small st-bar-note', note) : note);
  return box;
}

// ─── assembling: the part in hand ────────────────────────────────────────────

function assemblyBar(store: StructureStore, stage: Stage): HTMLElement {
  const adapter = store.adapter, spec = adapter.spec, state = store.assembly;
  const held = store.held[store.model];
  const check = store.check();
  const box = el('div', 'st-bar-assemble');
  const line = el('div', 'st-hand');
  if (held) {
    const unit = spec.units.find((u) => u.id === held.unit)!;
    line.append(el('strong', 'st-hand-name', tx('asm.holding', { unit: store.unitName(held.unit) })));
    // its place: at a first look the reference's own; deeper, chosen from the numbers on the picture or here
    if (store.level !== 'watch') {
      const free = spec.slots.filter((s) => occupant(state, s.id) === null);
      const places = el('label', 'st-select');
      places.append(el('span', '', tx('asm.slot')));
      const select = el('select');
      select.dataset.k = 'slot';
      const none = el('option', '', tx('asm.slot.choose'));
      none.value = '';
      none.selected = held.slot === null;
      select.append(none);
      for (const s of free) {
        const place = adapter.place(s.id);
        const o = el('option', '', `${place.mark} · ${place.name}`);
        o.value = s.id;
        o.selected = held.slot === s.id;
        select.append(o);
      }
      select.addEventListener('change', () => { if (select.value) store.chooseSlot(select.value); });
      places.append(select);
      line.append(places);
    } else if (held.slot) line.append(el('span', 'st-small', adapter.place(held.slot).name));
    if (unit.orientations > 1 && store.level !== 'watch') {
      const turned = held.turn % unit.orientations;
      const label = unit.orientations === 2 ? tx('asm.turn.flip') : tx('asm.turn.quarter', { deg: 90 });
      line.append(button(label, 'turn', () => store.turn(), { glyph: '⟳' }),
        el('span', 'st-small st-turned', turned ? tx(unit.orientations === 2 ? 'asm.turned.flip' : 'asm.turned', { deg: (360 / unit.orientations) * turned }) : tx('asm.turned.none')));
    }
    line.append(button(tx('asm.install'), 'install', () => store.install(), { cls: 'st-primary', disabled: !held.slot }), button(tx('asm.putDown'), 'putDown', () => store.hold(null)));
  } else {
    const selected = store.selectedUnits()[0];
    if (selected && Object.hasOwn(state.placed, selected)) {
      const rests = store.restsOn(selected);
      line.append(el('strong', 'st-hand-name', store.unitName(selected)),
        button(tx('asm.remove'), 'remove', () => store.remove(selected), { disabled: rests.length > 0 }));
      if (rests.length) line.append(el('span', 'st-small', tx('asm.no.holds', { unit: store.unitName(selected), dependents: rests.map((u) => store.unitName(u)).join(', ') })));
    } else if (!check.complete) {
      line.append(el('span', 'st-hand-prompt', tx(store.level === 'watch' ? (store.view.outline ? 'asm.prompt.watch' : 'asm.prompt.pick') : 'asm.prompt.pick')));
    } else {
      line.append(el('strong', 'st-hand-name st-ok-text', tx('asm.complete')));
    }
  }
  box.append(line);
  const message = store.message;
  const msg = el('p', `st-msg${message ? ` st-msg-${message.kind}` : ' st-msg-quiet'}`, message?.text() ?? '');
  msg.dataset.role = 'asm-msg';
  if (message) box.append(msg);
  const tools = el('div', 'st-tools');
  tools.setAttribute('role', 'toolbar');
  tools.setAttribute('aria-label', tx('view.label'));
  tools.append(
    button(tx('view.home'), 'home', () => stage.home(), { disabled: !stage.ready(), glyph: '⌂' }),
    button(tx('asm.outline'), 'outline', () => { store.camera = 'home'; store.setView({ outline: !store.view.outline }); }, { pressed: store.view.outline, title: tx('asm.outline.title') }),
    button(tx('view.labels'), 'labels', () => store.setView({ labels: !store.view.labels }), { pressed: store.view.labels }),
    button(tx('asm.hintButton'), 'hint', () => store.hint(), { disabled: check.complete || !store.next().length }),
    button(tx('asm.undo'), 'undo', () => store.undo(), { disabled: !state.history.length, glyph: '↶' }),
    button(tx('asm.restart'), 'restart', () => store.restart(), { disabled: !Object.keys(state.placed).length }),
  );
  box.append(tools);
  return box;
}

// ─── changing a design: what it comes to ─────────────────────────────────────

function experimentBar(store: StructureStore, stage: Stage): HTMLElement {
  const box = el('div', 'st-bar-experiment');
  const ui = store.adapter.experiment;
  if (ui) box.append(ui.strip(store));
  const v = store.view;
  const tools = el('div', 'st-tools');
  tools.setAttribute('role', 'toolbar');
  tools.setAttribute('aria-label', tx('view.label'));
  tools.append(
    button(tx('view.home'), 'home', () => stage.home(), { disabled: !stage.ready(), glyph: '⌂' }),
    button(tx('view.focus'), 'focus', () => stage.focus(), { disabled: !stage.ready() || !store.shown(), glyph: '◎' }),
  );
  if (store.adapter.offers.open) tools.append(button(tx(`view.open.${store.model}`), 'open', () => store.setView({ open: v.open > 0.5 ? 0 : 1 }), { pressed: v.open > 0.5 }));
  tools.append(button(tx('view.ghost'), 'ghost', () => store.setView({ shell: !v.shell }), { pressed: v.shell }),
    button(tx('view.labels'), 'labels', () => store.setView({ labels: !v.labels }), { pressed: v.labels }));
  box.append(tools);
  return box;
}

/** The bar under the picture, for the activity on screen. */
export function stageBar(store: StructureStore, stage: Stage, bar: HTMLElement): void {
  if (!store.ready) { bar.replaceChildren(); return; }
  const node = store.mode === 'assemble' ? assemblyBar(store, stage) : store.mode === 'experiment' ? experimentBar(store, stage) : exploreTools(store, stage);
  bar.replaceChildren(node);
}

/** The unit a node stands for in the assembly's lists (a part's own unit). */
export const unitNode = (store: StructureStore, unit: string): string | null => nodeOfUnit(store.adapter.tree(), unit)?.id ?? null;
