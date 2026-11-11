/**
 * The Structure section's side column, as far as every model shares it: the
 * heading (which section, at which depth, with the depth's own switch), the
 * optional helper, and the three panels a model is read through — what the
 * selected thing is (drawn from the model's `InfoDoc`), the model's things
 * as a tree down to the depth on screen, and what runs through them. None of
 * these knows which model it shows: the model's adapter gives the content.
 */
import { TIER_OF_DEPTH, type ModelNode } from '../../structure/model';
import type { Certainty, Depth } from '../../structure/types';
import { button, el, facts, link } from './dom';
import type { InfoBlock, InfoDoc, InfoSource, ModelSystem } from './models/types';
import { CATEGORY_COLOURS } from './palette';
import { SIDE_TABS, type SideTab, type StructureStore } from './store';
import { PART_CATEGORIES } from '../../structure/types';
import { getLang, tx } from './text';

const DEPTHS: readonly Depth[] = ['watch', 'explore', 'engineer'];

export const badge = (c: Certainty): HTMLElement => el('span', `st-badge st-cert-${c}`, tx(`cert.${c}`));

// ─── the heading ─────────────────────────────────────────────────────────────

export function introPanel(store: StructureStore): HTMLElement {
  const panel = el('header', 'st-panel st-intro');
  panel.append(el('p', 'st-eyebrow', `${tx('title.short')} · ${tx(`depth.${store.level}`)}`));
  const h = el('h1', '', tx(`model.${store.model}`));
  h.id = 'st-title';
  h.tabIndex = -1;
  panel.append(h, el('p', 'st-lead', tx(`model.${store.model}.sub`)));
  // the depth: the same model read deeper — the same links as the top bar's, here beside what they change
  const depth = el('nav', 'st-depth');
  depth.setAttribute('aria-label', tx('depth.label'));
  for (const l of DEPTHS) depth.append(link(tx(`depth.${l}`), `depth:${l}`, store.href({ level: l }), { current: l === store.level, cls: 'st-depth-link', title: tx(`depth.${l}.desc`) }));
  panel.append(depth, el('p', 'st-small', tx(`depth.${store.level}.desc`)));
  if (getLang() !== 'th') panel.append(el('p', 'st-draft', tx('draft')));
  if (store.storeNote) panel.append(el('p', `st-msg ${store.storeNote === 'damaged' ? 'st-msg-info' : 'st-msg-no'}`, tx(`store.${store.storeNote}`)));
  return panel;
}

// ─── the helper ──────────────────────────────────────────────────────────────

/** The optional step-by-step helper: closed until asked for, never in the way of anything else. */
export function guidePanel(store: StructureStore): HTMLElement | null {
  const guides = store.guides().filter((g) => store.adapter.activities.includes(g.mode));
  if (!guides.length) return null;
  const panel = el('section', 'st-panel st-guide');
  const active = store.activeGuide();
  if (!store.progress.guide) {
    panel.classList.add('is-closed');
    panel.append(button(tx('guide.open'), 'guide:open', () => store.setGuideOpen(true), { glyph: '✦', cls: 'st-guide-open' }), el('span', 'st-small', tx('guide.offer')));
    return panel;
  }
  const head = el('div', 'st-guide-head');
  head.append(el('h2', '', tx('guide.title')), button(tx('guide.close'), 'guide:close', () => { store.focusNext = 'guide:open'; store.setGuideOpen(false); }, { cls: 'st-link' }));
  panel.append(head);
  if (!active) {
    panel.append(el('p', 'st-small', tx('guide.choose')));
    for (const g of guides) {
      const card = el('div', 'st-guide-card');
      card.append(el('strong', '', g.title), el('p', 'st-small', g.summary),
        button(tx('guide.start', { n: g.steps.length }), `guide:start:${g.id}`, () => { store.focusNext = 'guide:next'; store.guideStep(g.id, 0); }, { cls: 'st-primary' }));
      panel.append(card);
    }
    return panel;
  }
  const { guide, step } = active, s = guide.steps[step];
  panel.append(el('p', 'st-eyebrow', tx('guide.step', { n: step + 1, total: guide.steps.length, title: guide.title })), el('h3', 'st-guide-title', s.title), el('p', '', s.text));
  if (s.note) panel.append(el('p', 'st-small', s.note));
  const actions = el('div', 'st-actions');
  actions.append(
    button(tx('guide.back'), 'guide:back', () => store.guideStep(guide.id, step - 1), { disabled: step === 0 }),
    button(tx(step + 1 < guide.steps.length ? 'guide.next' : 'guide.finish'), 'guide:next',
      () => { if (step + 1 < guide.steps.length) store.guideStep(guide.id, step + 1); else { store.focusNext = 'guide:open'; store.endGuide(); } }, { cls: 'st-primary' }),
  );
  if (s.show) actions.append(button(tx('guide.show'), 'guide:show', () => store.guideStep(guide.id, step)));
  actions.append(button(tx('guide.other'), 'guide:other', () => store.endGuide(), { cls: 'st-link' }));
  panel.append(actions, el('p', 'st-small', tx('guide.free')));
  return panel;
}

// ─── the three panels' tabs ──────────────────────────────────────────────────

export function sideTabs(store: StructureStore, tabs: readonly SideTab[]): HTMLElement {
  const nav = el('div', 'st-side-tabs');
  nav.setAttribute('role', 'group');
  nav.setAttribute('aria-label', tx('side.label'));
  const now = tabs.includes(store.tab[store.model]) ? store.tab[store.model] : tabs[0];
  for (const t of SIDE_TABS) {
    if (!tabs.includes(t)) continue;
    nav.append(button(tx(`side.${t}`), `side:${t}`, () => { store.tab[store.model] = t; store.emit('panels'); }, { pressed: t === now, cls: 'st-side-tab' }));
  }
  return nav;
}

// ─── what the selected thing is ──────────────────────────────────────────────

function sourceList(rows: readonly InfoSource[], withScope: boolean): HTMLElement {
  const ul = el('ul', 'st-sources');
  for (const s of rows) {
    const li = el('li');
    if (s.url) {
      const a = el('a', '', s.title);
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = tx('src.open');
      li.append(a);
    } else li.append(s.title);
    if (s.note) li.append(el('span', 'st-small', ` — ${s.note}`));
    if (s.scope && withScope) li.append(el('span', 'st-small st-scope', ` (${s.scope})`));
    ul.append(li);
  }
  return ul;
}

function block(store: StructureStore, b: InfoBlock): HTMLElement {
  const adapter = store.adapter;
  switch (b.kind) {
    case 'text': return el('p', b.tone === 'lead' ? 'st-lead-text' : b.tone === 'small' ? 'st-small' : b.tone === 'note' ? 'st-small st-scope' : b.tone === 'warn' ? 'st-msg st-msg-no' : '', b.text);
    case 'heading': return el('h3', '', b.text);
    case 'facts': {
      return facts(b.rows.map((r) => {
        // a status row's value is its badge alone
        const value = el('span', r.mono ? 'st-mono' : '', r.value ? `${r.value} ` : '');
        if (r.certainty) value.append(badge(r.certainty));
        return { label: r.label, value };
      }));
    }
    case 'relations': {
      const ul = el('ul', 'st-links');
      for (const r of b.rows) {
        const li = el('li');
        li.append(button(adapter.name(r.other), `rel:${r.relation}`, () => store.select(r.other, true), { cls: 'st-link' }), el('span', 'st-small', ` — ${r.text}`));
        if (r.hasJoint && store.mode !== 'assemble') {
          const shown = store.jointShown[store.model] === r.relation;
          li.append(' ', button(tx(shown ? 'info.jointHide' : 'info.jointShow'), `joint:${r.relation}`, () => store.showJoint(shown ? null : r.relation), { cls: 'st-chip', pressed: shown }));
        }
        if (r.why && store.level !== 'watch') li.append(el('span', 'st-small st-why', r.why));
        ul.append(li);
      }
      return ul;
    }
    case 'list': {
      const ul = el('ul', 'st-bullets');
      for (const item of b.items) ul.append(el('li', '', item));
      return ul;
    }
    case 'sources': return sourceList(b.rows, store.level === 'engineer');
    case 'kinds': {
      const box = el('div', 'st-kinds');
      const kinds = el('p', 'st-chips');
      for (const k of b.categories) {
        const chip = el('span', 'st-kind', `${tx(`cat.${k.category}`)} ${k.count}`);
        chip.style.setProperty('--st-kind', CATEGORY_COLOURS[PART_CATEGORIES.indexOf(k.category)]);
        kinds.append(chip);
      }
      const certs = el('p', 'st-chips');
      for (const c of b.certainties) certs.append(badge(c.certainty), ` ${c.count} `);
      box.append(kinds, certs);
      return box;
    }
    case 'systems': {
      const ul = el('ul', 'st-links');
      for (const s of b.rows) {
        const li = el('li');
        li.append(button(s.label, `sys:${s.id}`, () => store.showSystem(s.id), { cls: 'st-link' }));
        if (s.step) li.append(el('span', 'st-small', ` — ${tx('info.systemStep', { step: s.step })}`));
        ul.append(li);
      }
      return ul;
    }
    case 'nodes': {
      const ul = el('ul', 'st-links');
      for (const id of b.ids) {
        const li = el('li');
        li.append(button(adapter.name(id), `node:${id}`, () => store.select(id, true), { cls: 'st-link' }));
        ul.append(li);
      }
      return ul;
    }
    case 'checks': {
      const box = el('div', 'st-checks');
      const table = el('table', 'st-table');
      const head = el('tr');
      for (const k of ['spec.col.what', 'spec.col.value', 'spec.col.limit', 'spec.col.ref']) head.append(el('th', '', tx(k)));
      table.append(head);
      for (const c of b.rows) {
        const tr = el('tr', c.ok ? '' : 'st-worse');
        const th = el('th', '', c.label);
        th.scope = 'row';
        tr.append(th, el('td', 'st-num', c.value), el('td', 'st-num', c.limit), el('td', 'st-small', c.ref));
        table.append(tr);
      }
      box.append(table, el('p', 'st-small', b.note));
      return box;
    }
  }
}

export function infoPanel(store: StructureStore): HTMLElement {
  const panel = el('section', 'st-panel st-info');
  if (!store.ready) { panel.append(el('p', 'st-small', tx('load.model', { name: tx(`model.${store.model}`) }))); return panel; }
  const adapter = store.adapter, shown = store.shown();
  const unit = shown ? store.unitOfNode(shown.id) : null;
  const placedSlot = unit && store.mode === 'assemble' ? store.assembly.placed[unit]?.slot : undefined;
  const doc: InfoDoc = adapter.describe(shown?.id ?? null, store.level, store.mode, placedSlot);
  if (!shown) panel.append(el('p', 'st-small st-prompt', tx('info.empty')));
  if (doc.path.length) {
    const path = el('p', 'st-path');
    doc.path.forEach((id, k) => {
      if (k) path.append(' › ');
      path.append(button(adapter.name(id), `path:${id}`, () => store.select(id, true), { cls: 'st-link' }));
    });
    panel.append(path);
  }
  const h = el('h2', shown?.tier === 3 ? 'st-mono' : '', doc.title);
  panel.append(h);
  if (doc.subtitle) panel.append(el('p', 'st-small st-sub', doc.subtitle));
  for (const b of doc.blocks) panel.append(block(store, b));
  if (shown) panel.append(button(tx('view.deselect'), 'deselect', () => store.select(null), { cls: 'st-link' }));
  return panel;
}

// ─── the model's things ──────────────────────────────────────────────────────

const ROW_LIMIT = 40;

export function listPanel(store: StructureStore): HTMLElement {
  const panel = el('section', 'st-panel st-list');
  panel.append(el('h2', '', tx('list.title')));
  if (!store.ready) {
    const load = store.load[store.model];
    panel.append(el('p', 'st-small', load.state === 'failed' ? tx('load.failed', { error: load.reason }) : tx('load.model', { name: tx(`model.${store.model}`) })));
    return panel;
  }
  const adapter = store.adapter, tree = adapter.tree(), level = store.level, max = TIER_OF_DEPTH[level];
  const shown = store.shown();
  // what is picked, and the way to what is said of it (the list stays open while picking from it)
  if (shown && store.mode !== 'assemble') {
    const picked = el('p', 'st-picked');
    picked.append(el('span', '', tx('list.selected', { name: adapter.name(shown.id) })), ' ',
      button(tx('list.readInfo'), 'list:info', () => { store.tab[store.model] = 'info'; store.focusNext = 'side:info'; store.emit('panels'); }, { cls: 'st-chip' }));
    panel.append(picked);
  }
  // what the search box lists under it: redrawn alone as its words change, so the box being typed in is never replaced
  // (the caret stays where it is, and a keyboard that composes its text is not cut short)
  const body = el('div', 'st-list-body');
  // a first look lists a handful of things; from the middle depth there are enough to search
  if (level !== 'watch') {
    const search = el('input', 'st-search');
    search.type = 'search';
    search.placeholder = tx('list.filter');
    search.setAttribute('aria-label', tx('list.filter'));
    search.value = store.filter;
    search.dataset.k = 'filter';
    search.addEventListener('input', () => { store.filter = search.value; body.replaceChildren(...rows()); });
    panel.append(search);
  }
  const hiddenItems = store.hiddenItems();

  const row = (node: ModelNode, open?: boolean): HTMLElement => {
    const li = el('li', `st-row st-tier-${node.tier}`);
    const kids = node.tier < max ? tree.children.get(node.id) ?? [] : [];
    if (kids.length && open !== undefined) {
      const toggle = button(open ? '−' : '+', `expand:${node.id}`, () => {
        if (store.expanded.has(node.id)) store.expanded.delete(node.id); else store.expanded.add(node.id);
        store.emit('panels');
      }, { cls: 'st-expand', label: tx(open ? 'list.collapse' : 'list.expand', { name: adapter.name(node.id) }) });
      toggle.setAttribute('aria-expanded', String(open));
      li.append(toggle);
    }
    const on = shown?.id === node.id;
    const b = button(adapter.name(node.id), `node:${node.id}`, () => store.select(node.id, true), { pressed: on, cls: `st-node${node.tier === 3 ? ' st-mono' : ''}` });
    // a second line beside the name: the option fitted, or from the middle depth how many parts
    const note = adapter.note(node.id);
    if (note && (level !== 'watch' || node.tier === 2)) b.append(el('span', 'st-count', note));
    li.append(b);
    if (level !== 'watch' && store.mode !== 'assemble') {
      // hidden itself, or every part of it hidden by other rows (an assembly's groups when the assembly is hidden)
      const hidden = store.hiddenState(node.id, hiddenItems) !== null;
      li.append(button('', `eye:${node.id}`, () => store.toggleHidden(node.id), { cls: 'st-eye', pressed: hidden, glyph: hidden ? '◌' : '●', label: tx(hidden ? 'list.show' : 'list.hide', { name: adapter.name(node.id) }) }));
    }
    return li;
  };

  const rows = (): HTMLElement[] => {
  const q = level === 'watch' ? '' : store.filter.trim();
  if (q) {
    // a search: what matches, at the depth on screen, each with where it belongs
    const hits = adapter.search(q, level, ROW_LIMIT);
    const ul = el('ul', 'st-tree');
    ul.setAttribute('aria-label', tx('list.results'));
    for (const id of hits) {
      const node = tree.nodes.get(id)!;
      const li = row(node);
      const parent = node.parent ? adapter.name(node.parent) : '';
      if (parent) li.append(el('span', 'st-small st-where', parent));
      ul.append(li);
    }
    const found = el('p', 'st-small', hits.length ? tx('list.found', { n: hits.length }) : tx('list.none'));
    found.setAttribute('role', 'status');
    return [found, ul];
  }
  const selectedPath = new Set<string>();
  for (let n = shown; n; n = n.parent === null ? null : tree.nodes.get(n.parent) ?? null) selectedPath.add(n.id);
  const build = (ids: readonly string[], label?: string): HTMLElement => {
    const ul = el('ul', 'st-tree');
    if (label) ul.setAttribute('aria-label', label);
    for (const id of ids) {
      const node = tree.nodes.get(id)!;
      const kids = node.tier < max ? tree.children.get(id) ?? [] : [];
      const open = kids.length > 0 && (store.expanded.has(id) || (selectedPath.has(id) && shown?.id !== id));
      const li = row(node, open);
      if (open) {
        const all = store.expanded.has(`more:${id}`) ? kids : kids.slice(0, ROW_LIMIT);
        const sub = build(all);
        sub.classList.add('st-sub');
        if (all.length < kids.length) {
          const more = el('li');
          more.append(button(tx('list.more', { n: kids.length - all.length }), `more:${id}`, () => { store.expanded.add(`more:${id}`); store.emit('panels'); }, { cls: 'st-link' }));
          sub.append(more);
        }
        li.append(sub);
      }
      ul.append(li);
    }
    return ul;
  };
  const out: HTMLElement[] = [build(tree.roots, tx('list.units'))];
  if (store.view.hidden.size) out.push(button(tx('list.showAll', { n: store.view.hidden.size }), 'list:showAll', () => store.showAll(), { cls: 'st-link' }));
  return out;
  };
  body.append(...rows());
  panel.append(body);
  return panel;
}

// ─── what runs through them ──────────────────────────────────────────────────

export function systemsPanel(store: StructureStore): HTMLElement {
  const panel = el('section', 'st-panel st-systems');
  panel.append(el('h2', '', tx('sys.title')));
  if (!store.ready) return panel;
  const systems = store.adapter.systems();
  const following = store.system[store.model];
  const now: ModelSystem | undefined = following ? systems.find((s) => s.id === following.id) : undefined;
  if (now && following) {
    const head = el('div', 'st-sys-head');
    const sw = el('span', 'st-swatch');
    sw.style.background = now.colour;
    head.append(sw, el('h3', '', now.label));
    panel.append(head, el('p', '', now.text));
    const steps = el('ol', 'st-steps');
    steps.setAttribute('aria-label', tx('sys.steps'));
    const whole = button(tx('sys.whole'), 'sys:whole', () => store.showSystem(now.id, null), { pressed: following.step === null, cls: 'st-chip' });
    panel.append(whole);
    now.steps.forEach((s, k) => {
      const li = el('li', following.step === k ? 'is-on' : '');
      const b = button(s.label, `sys:step:${k}`, () => store.showSystem(now.id, k), { pressed: following.step === k, cls: 'st-step' });
      li.append(b);
      if (s.schematic) li.append(' ', el('span', 'st-tag', tx('sys.schematic')));
      if (!s.items.length) li.append(' ', el('span', 'st-tag', tx('sys.noParts')));
      if (following.step === k) li.append(el('p', 'st-small', s.text));
      steps.append(li);
    });
    if (now.steps.length) panel.append(el('h4', '', tx('sys.steps')), steps);
    panel.append(el('p', 'st-small', tx('sys.lit', { n: now.items.length })));
    panel.append(el('h4', '', tx('sys.confidence')), el('p', 'st-small', now.confidence), el('h4', '', tx('sys.limitation')), el('p', 'st-small st-scope', now.limitation));
    if (store.level === 'engineer' && now.sources.length) panel.append(el('h4', '', tx('info.sources')), sourceList(now.sources, true));
    panel.append(button(tx('sys.stop'), 'sys:stop', () => { store.focusNext = `sys:${now.id}`; store.showSystem(null); }, { cls: 'st-link' }));
    return panel;
  }
  panel.append(el('p', 'st-small', tx('sys.intro')));
  let group = '';
  let list: HTMLElement | null = null;
  for (const s of systems) {
    if (s.group !== group || !list) {
      group = s.group;
      panel.append(el('h3', '', group));
      list = el('ul', 'st-links st-sys-list');
      panel.append(list);
    }
    const li = el('li');
    const sw = el('span', 'st-swatch');
    sw.style.background = s.colour;
    li.append(sw, button(s.label, `sys:${s.id}`, () => store.showSystem(s.id), { cls: 'st-link' }));
    list.append(li);
  }
  return panel;
}
