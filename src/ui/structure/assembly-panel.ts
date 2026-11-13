/**
 * The Structure section's assembly, beside the picture: how far it has got,
 * the parts still loose (each saying whether it can go in now, or what it
 * waits for and why), the parts in place, and the joints made — the
 * relations of the model's own description, which is what "complete" is
 * decided by. What it says grows with the depth: a first look is led step by
 * step; the middle depth names each joint and why the order is what it is;
 * the deepest lists every relation with its kind and what it carries.
 */
import { relationStatus } from '../../structure/model';
import { button, el } from './dom';
import { infoBlock } from './panels';
import type { StructureStore } from './store';
import { tx } from './text';

/** The two orders a model with a launch site's order can be put together in: the learner's choice, each keeping what was done in it. */
function planSwitch(store: StructureStore): HTMLElement {
  const box = el('div', 'st-plan');
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', tx('site.switch'));
  const on = !!store.site;
  box.append(
    button(tx('site.plan.reference'), 'plan:reference', () => store.setSite(false), { pressed: !on, cls: 'st-plan-tab' }),
    button(tx('site.plan.site'), 'plan:site', () => store.setSite(true), { pressed: on, cls: 'st-plan-tab' }),
  );
  return box;
}

export function assemblyPanel(store: StructureStore): HTMLElement {
  const panel = el('section', 'st-panel st-asm');
  const adapter = store.adapter, spec = store.spec, state = store.assembly, site = store.site;
  const check = store.check();
  const complete = check.complete;
  const held = store.held[store.model];
  panel.append(el('h2', '', tx(site ? 'site.title' : 'mode.assemble.title')));
  if (adapter.site) panel.append(planSwitch(store), el('p', 'st-small st-plan-desc', tx(site ? 'site.plan.site.desc' : 'site.plan.reference.desc')));
  const prog = el('p', 'st-progress', tx('asm.placed', { n: check.placed, total: check.total }));
  const bar = el('progress');
  bar.max = check.total;
  bar.value = check.placed;
  bar.setAttribute('aria-label', tx('asm.placed', { n: check.placed, total: check.total }));
  panel.append(prog, bar);

  if (complete) {
    const done = el('div', 'st-done');
    const made = relationStatus(adapter.relations, state).filter((r) => r.made).length;
    if (site) done.append(el('strong', '', tx('site.complete')), el('p', 'st-small', tx('site.checked', { n: adapter.units.length, steps: site.operations.length })), el('p', 'st-small', tx('asm.notStrength')));
    else done.append(el('strong', '', tx('asm.complete')), el('p', 'st-small', tx('asm.checked', { n: check.total, joints: made })), el('p', 'st-small', tx('asm.notStrength')));
    const actions = el('div', 'st-actions');
    // what comes next: into the inside of what was just built, and on to the next activity
    actions.append(button(tx('asm.lookInside'), 'asm-done', () => { store.view.cutaway = adapter.offers.cutaway; store.view.open = adapter.opens.open; store.go({ mode: 'explore' }); }, { cls: 'st-primary' }));
    if (adapter.activities.includes('experiment')) actions.append(button(tx(store.progress.experiment ? 'exp.goto' : 'exp.create'), 'create', () => store.go({ mode: 'experiment' })));
    for (const other of Object.keys(store.adapters) as (keyof typeof store.adapters)[]) {
      if (!site && other !== store.model && !store.progress.completed[other]) actions.append(button(tx('asm.nextModel', { name: tx(`model.${other}.short`) }), `next:${other}`, () => store.go({ model: other, mode: 'assemble' })));
    }
    // the reference's order done, the site's is the next thing to try (and the other way round)
    if (adapter.site && !(site ? store.progress.completed[store.model] : store.progress.siteCompleted)) {
      actions.append(button(tx(site ? 'site.try.reference' : 'site.try.site'), 'plan:other', () => store.setSite(!site)));
    }
    done.append(actions);
    panel.append(done);
  } else if (store.level === 'watch') {
    // a first look: one step at a time, with why it comes now
    const next = store.next();
    const unit = held?.unit ?? next[0];
    if (unit) {
      const card = el('div', 'st-step-card');
      const rule = store.order.find((r) => r.unit === unit);
      // under the site's order a step says what is really done there; under the reference's, why it comes now
      card.append(el('p', 'st-eyebrow', tx('asm.stepN', { n: check.placed + 1, total: check.total })), el('h3', '', store.unitName(unit)),
        el('p', '', site ? site.note(unit) : rule ? tx(rule.why) : tx('asm.why.first')));
      const actions = el('div', 'st-actions');
      actions.append(button(tx(store.isOperation(unit) ? 'site.do' : 'asm.installThis'), 'asm-next', () => store.fit(unit), { cls: 'st-primary' }));
      if (next.length > 1) actions.append(el('span', 'st-small', tx('asm.orAny', { n: next.length })));
      card.append(actions);
      panel.append(card);
    }
  }

  // the parts still loose
  const loose = spec.units.filter((u) => !Object.hasOwn(state.placed, u.id));
  if (loose.length) {
    const tray = el('div', 'st-tray');
    tray.append(el('h3', '', tx('asm.tray')));
    const list = el('ul', 'st-tray-list');
    const can = new Set(store.next());
    for (const u of loose) {
      const li = el('li', can.has(u.id) ? 'is-ready' : 'is-waiting');
      const b = button(store.unitName(u.id), `tray:${u.id}`, () => (store.level === 'watch' ? store.fit(u.id) : store.hold(u.id)), { pressed: held?.unit === u.id, cls: 'st-tray-part' });
      li.append(b);
      if (can.has(u.id)) li.append(el('span', 'st-tag st-tag-ready', tx('asm.ready')));
      else {
        const waits = store.waitsFor(u.id);
        // (a step that waits for everything says so in a word, not in eleven names)
        li.append(el('span', 'st-small', waits.length > 4 ? tx('site.waitsAll') : tx('asm.waits', { list: waits.map((w) => store.unitName(w.unit)).join(', ') })));
        if (store.level !== 'watch' && waits[0]) li.append(el('span', 'st-small st-why', waits[0].why));
      }
      // from the middle depth, what is really done at this step of the site's order, under the part that can go in now
      if (site && store.level !== 'watch' && can.has(u.id)) li.append(el('span', 'st-small st-site-note', site.note(u.id)));
      list.append(li);
    }
    tray.append(list);
    panel.append(tray);
  }

  // what is in place, each one selectable (to read about it or take it off) from here too, not only on the picture
  const inPlace = spec.units.filter((u) => Object.hasOwn(state.placed, u.id));
  if (inPlace.length) {
    const box = el('div', 'st-tray st-in-place');
    box.append(el('h3', '', tx('asm.inPlace')));
    const row = el('div', 'st-chips-row');
    const selected = store.selectedUnit();
    for (const u of inPlace) {
      const node = [...adapter.tree().nodes.values()].find((n) => n.unit === u.id);
      // a step done that fits no part has nothing to read about on the picture: its chip takes it back (when nothing rests on it)
      if (store.isOperation(u.id)) row.append(button(store.unitName(u.id), `placed:${u.id}`, () => store.remove(u.id), { cls: 'st-chip st-chip-step', glyph: '↶', disabled: store.restsOn(u.id).length > 0 }));
      else row.append(button(store.unitName(u.id), `placed:${u.id}`, () => store.select(node?.id ?? null), { pressed: selected === u.id, cls: 'st-chip' }));
    }
    box.append(row);
    panel.append(box);
  }

  // the joints: the model's relations, each made once both its ends are in place — what "complete" is decided by
  // (under the site's order the parts are in their places before the halves are docked: the joints are the reference order's to show)
  if (store.level !== 'watch' && !site) {
    const status = relationStatus(adapter.relations, state);
    const made = status.filter((s) => s.made).length;
    const fold = el('details', 'st-fold');
    fold.open = store.foldOpen('joints', store.level === 'engineer');
    fold.addEventListener('toggle', () => store.setFold('joints', fold.open));
    const sum = el('summary', '', tx('asm.joints', { n: made, total: status.length }));
    sum.dataset.k = 'fold:joints';
    const ul = el('ul', 'st-joints');
    for (const s of status) {
      const li = el('li', s.made ? 'is-made' : '');
      li.append(el('span', 'st-joint-mark', s.made ? '✓' : '○'), ` ${store.unitName(s.relation.a)} ↔ ${store.unitName(s.relation.b)}: ${adapter.jointName(s.relation)}`);
      if (store.level === 'engineer') li.append(el('span', 'st-small', ` (${tx(`rel.kind.${s.relation.kind}`)} · ${tx(`rel.medium.${s.relation.medium}`)})`));
      ul.append(li);
    }
    fold.append(sum, ul);
    panel.append(fold);
  }
  panel.append(el('p', 'st-small', tx(site ? 'site.about' : `asm.about.${store.model}`)));
  // where the site's order is taken from: folded away, as on the cards
  if (site) panel.append(infoBlock(store, { kind: 'fold', name: 'site-sources', title: tx('info.provenance'), blocks: [{ kind: 'sources', rows: site.sources() }] }));
  return panel;
}
