/**
 * What is laid over the Structure section's 3-D view: the names of the
 * model's main things beside them, each a button (a second, larger way to
 * pick from the picture, and the keyboard's), the assembly's free places,
 * numbered and named, a name under a resting pointer, the scale, the legend of the
 * colour view (whose entries pick one kind out), and which design the
 * picture shows. Names and places follow the camera frame by frame
 * (`follow`); the rest is drawn when the state changes (`render`).
 */
import { occupant } from '../../structure/assembly';
import { nodeOfUnit } from '../../structure/model';
import { CERTAINTIES, PART_CATEGORIES } from '../../structure/types';
import { button, el, svg } from './dom';
import { layoutLabels, lengthUnit, scaleBar, type Anchor } from './labels';
import { CATEGORY_COLOURS, CERTAINTY_COLOURS } from './palette';
import type { StructureStore } from './store';
import { num, tx } from './text';

/** What the overlay asks of the stage: sizes and where things are on the canvas, px. */
export interface StageView {
  size(): { width: number; height: number };
  toCanvas(p: readonly [number, number, number]): { x: number; y: number } | null;
  nodeAt(id: string): { x: number; y: number; r: number } | null;
  metresPerPixel(): number;
  ready(): boolean;
}

export class StageOverlay {
  readonly el = el('div', 'st-overlay');
  private readonly leaders = svg('svg', { class: 'st-leaders', 'aria-hidden': 'true' });
  private readonly names = el('div', 'st-names');
  private readonly places = el('div', 'st-places');
  private readonly scale = el('div', 'st-scale');
  private readonly legend = el('div', 'st-legend');
  private readonly badge = el('div', 'st-badge-box');
  private readonly tag = el('div', 'st-hover');
  /** the names' buttons by node id, kept between frames (a redraw would lose the focus on one) */
  private readonly nameButtons = new Map<string, HTMLButtonElement>();
  private readonly placeButtons = new Map<string, HTMLButtonElement>();

  constructor(private readonly store: StructureStore, private readonly view: StageView) {
    this.names.setAttribute('role', 'group');
    this.places.setAttribute('role', 'group');
    this.scale.setAttribute('aria-hidden', 'true');
    this.tag.hidden = true;
    this.el.append(this.leaders, this.names, this.places, this.badge, this.legend, this.scale, this.tag);
  }

  // ─── which names and places ───────────────────────────────────────────────

  /** The nodes named on the picture now: the model's main things, the thing selected, and what the activity is about. */
  private named(): { id: string; strong: boolean; text?: string; tone?: string }[] {
    const store = this.store;
    if (!this.view.ready() || !store.view.labels) return [];
    const adapter = store.adapter, tree = adapter.tree();
    const shown = store.shown();
    const out = new Map<string, { strong: boolean; text?: string; tone?: string }>();
    if (store.mode === 'assemble') {
      // what is in hand, and at a first look what can go in now
      const held = store.held[store.model];
      const units = held ? [held.unit] : store.level === 'watch' ? store.next() : [];
      for (const u of units) { const n = nodeOfUnit(tree, u); if (n) out.set(n.id, { strong: true }); }
    } else if (store.mode === 'experiment' && adapter.experiment) {
      // the systems that can be changed, each by what is fitted now
      for (const l of adapter.experiment.labels(store)) {
        const n = nodeOfUnit(tree, l.unit);
        if (n) out.set(n.id, { strong: l.changed, text: l.text, ...(l.changed ? { tone: 'changed' } : {}) });
      }
    } else for (const id of tree.roots) out.set(id, { strong: false });
    // the thing picked is named too — but not while assembling: a fitted part picked there is named in the bar under the
    // picture, and a name on the picture could lie over a loose part and take the press meant to drag it
    if (shown && store.mode !== 'assemble') out.set(shown.id, { ...out.get(shown.id), strong: true });
    return [...out].map(([id, v]) => ({ id, ...v }));
  }

  /** The places shown as numbered names: the free ones, while a part is in hand and its place is the learner's to choose. */
  private marked(): string[] {
    const store = this.store, held = store.held[store.model];
    if (store.mode !== 'assemble' || !held || (store.level === 'watch' && !store.drag) || !this.view.ready()) return [];
    return store.adapter.spec.slots.map((s) => s.id).filter((s) => occupant(store.assembly, s) === null);
  }

  // ─── frame by frame ───────────────────────────────────────────────────────

  /**
   * Put the names, the places and the scale where the camera now shows their
   * things. A name or a place stands to one side of its thing with a line to
   * it (src/ui/structure/labels.ts), so none lies over another however the
   * things line up behind one another — a rocket's stages do, seen from the
   * side. While places are offered they are what is named: the part in hand
   * is named in the bar under the picture.
   */
  follow(): void {
    const store = this.store, adapter = store.adapter, { width, height } = this.view.size();
    const narrow = width < 520;
    this.el.classList.toggle('is-narrow', narrow);
    const nameWidth = Math.max(96, Math.min(230, Math.floor((width - 90) / 2)));
    this.el.style.setProperty('--st-name-w', `${nameWidth}px`);
    const held = store.held[store.model];
    const places = this.marked();
    const anchors: Anchor[] = [];
    const tones = new Map<string, string>();
    if (places.length) {
      const tree = adapter.tree();
      for (const slot of places) {
        const p = adapter.slotAnchor(slot);
        const at = p && this.view.toCanvas(p);
        if (!at) continue;
        // clear of the thing that belongs there: as far out as that thing reaches, where it is drawn now
        const ref = adapter.spec.slots.find((x) => x.id === slot)?.reference;
        const node = ref ? nodeOfUnit(tree, ref) : null;
        const r = Math.min(90, (node && this.view.nodeAt(node.id)?.r) || 10);
        // on the picture a place's name without its bracketed note (the list of places and the name read out carry it whole)
        anchors.push({ id: `place:${slot}`, text: adapter.place(slot).name.replace(/\s*\([^)]*\)\s*$/, ''), x: at.x, y: at.y, r, strong: held?.slot === slot });
      }
    } else {
      for (const { id, strong, text, tone } of this.named()) {
        const at = this.view.nodeAt(id);
        if (!at) continue;
        anchors.push({ id, text: text ?? adapter.name(id), x: at.x, y: at.y, r: at.r, strong });
        if (tone) tones.set(id, tone);
      }
      // a joint being shown: named where it is (it is small beside what it joins); a press on its name stops showing it
      const relation = adapter.relations.find((r) => r.id === store.jointShown[store.model]);
      const where = relation && store.view.labels ? adapter.joint(relation).at : null;
      const at = where && this.view.toCanvas(where);
      if (relation && at) {
        anchors.push({ id: `joint:${relation.id}`, text: adapter.jointName(relation), x: at.x, y: at.y, r: 14, strong: true });
        tones.set(`joint:${relation.id}`, 'joint');
      }
    }
    // a finger needs more of a name than a pointer does: taller, and further apart
    const gap = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches ? 34 : 26;
    const rows = Math.max(3, Math.floor((height - 30) / gap));
    const placed = layoutLabels(anchors, width, height, {
      max: places.length ? anchors.length : Math.min(16, 2 * rows),
      width: places.length ? (narrow ? 30 : Math.min(nameWidth + 30, 250)) : nameWidth,
      reach: narrow ? 10 : 18, gap,
    });
    const seenNames = new Set<string>(), seenPlaces = new Set<string>();
    const lines: SVGElement[] = [];
    const selected = store.shown()?.id ?? null;
    for (const p of placed) {
      const isPlace = p.id.startsWith('place:');
      const slot = isPlace ? p.id.slice('place:'.length) : '';
      let b: HTMLButtonElement | undefined;
      let on: boolean;
      if (isPlace) {
        seenPlaces.add(slot);
        const place = adapter.place(slot);
        b = this.placeButtons.get(slot);
        if (!b) {
          b = button(place.name, `mark:${slot}`, () => store.chooseSlot(slot), { cls: 'st-mark' });
          b.prepend(el('span', 'st-mark-n', String(place.mark)));
          this.placeButtons.set(slot, b);
          this.places.append(b);
        }
        on = held?.slot === slot;
        b.setAttribute('aria-label', tx('asm.placeN', { n: place.mark, name: place.name }));
        b.title = place.name;
      } else {
        seenNames.add(p.id);
        b = this.nameButtons.get(p.id);
        if (!b) {
          const id = p.id;
          b = button(p.text, `name:${id}`, () => (id.startsWith('joint:') ? store.showJoint(null) : store.select(id, false)), { cls: 'st-name' });
          this.nameButtons.set(id, b);
          this.names.append(b);
        }
        const joint = tones.get(p.id) === 'joint';
        on = joint || p.id === selected;
        b.classList.toggle('is-changed', tones.get(p.id) === 'changed');
        b.classList.toggle('is-joint', joint);
      }
      const text = b.querySelector('.st-btn-text');
      if (text && text.textContent !== p.text) text.textContent = p.text;
      b.classList.toggle('is-left', p.side === 'left');
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
      b.style.left = `${p.lx}px`;
      b.style.top = `${p.ly}px`;
      const cls = `${isPlace || tones.get(p.id) === 'joint' ? ' is-place' : ''}${on ? ' is-on' : ''}`;
      lines.push(svg('polyline', { points: `${p.x.toFixed(1)},${p.y.toFixed(1)} ${(p.side === 'right' ? p.lx - 4 : p.lx + 4).toFixed(1)},${p.ly.toFixed(1)}`, class: `st-leader${cls}` }),
        svg('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: tones.get(p.id) === 'joint' ? 9 : isPlace ? 4 : 2.5, class: `st-dot${cls}${tones.get(p.id) === 'joint' ? ' is-joint' : ''}` }));
    }
    for (const [id, b] of this.nameButtons) if (!seenNames.has(id)) { b.remove(); this.nameButtons.delete(id); }
    for (const [slot, b] of this.placeButtons) if (!seenPlaces.has(slot)) { b.remove(); this.placeButtons.delete(slot); }
    this.leaders.setAttribute('viewBox', `0 0 ${Math.max(1, width)} ${Math.max(1, height)}`);
    this.leaders.replaceChildren(...lines);

    // the scale
    const bar = this.view.ready() ? scaleBar(this.view.metresPerPixel()) : null;
    if (bar) {
      const { value, unit } = lengthUnit(bar.metres);
      this.scale.hidden = false;
      this.scale.style.width = `${bar.px}px`;
      this.scale.textContent = `${num(value, value % 1 ? 1 : 0)} ${tx(`unit.${unit}`)}`;
    } else this.scale.hidden = true;
  }

  /** The name of what a resting pointer is over, at the depth's grain. */
  hover(leaf: string | null, clientX: number, clientY: number): void {
    const store = this.store;
    const node = leaf && store.ready ? (() => {
      const tree = store.adapter.tree();
      let n = tree.nodes.get(leaf) ?? null;
      const max = { watch: 1, explore: 2, engineer: 3 }[store.level];
      while (n && n.tier > max) n = n.parent === null ? null : tree.nodes.get(n.parent) ?? null;
      return n;
    })() : null;
    if (!node) { this.tag.hidden = true; return; }
    const r = this.el.getBoundingClientRect();
    this.tag.textContent = store.adapter.name(node.id);
    this.tag.hidden = false;
    this.tag.style.left = `${Math.min(r.width - 12, Math.max(12, clientX - r.left + 14))}px`;
    this.tag.style.top = `${Math.max(12, clientY - r.top - 12)}px`;
  }

  // ─── when the state changes ───────────────────────────────────────────────

  render(): void {
    const store = this.store;
    this.names.setAttribute('aria-label', tx('view.names'));
    this.places.setAttribute('aria-label', tx('asm.places'));
    // which design the picture shows
    const badge = store.ready && store.adapter.experiment ? store.adapter.experiment.badge(store) : null;
    this.badge.replaceChildren();
    if (badge) {
      const chip = el('span', `st-design${badge.mine ? ' is-mine' : ''}`, badge.text);
      chip.dataset.design = badge.mine ? 'mine' : 'reference';
      this.badge.append(chip);
    }
    // the colour view's legend: each entry a button that picks its kind out of the picture
    this.legend.replaceChildren();
    const colour = store.pictureView.colour;
    if (store.mode !== 'assemble' && colour !== 'material' && this.view.ready()) {
      const setup = store.adapter.setup();
      const byKind = colour === 'category';
      const names = byKind ? PART_CATEGORIES : CERTAINTIES, colours = byKind ? CATEGORY_COLOURS : CERTAINTY_COLOURS;
      const counts = new Array<number>(names.length).fill(0);
      const of = byKind ? setup.category : setup.certainty;
      for (let i = 0; i < setup.itemCount; i++) counts[of[i]]++;
      const list = el('div', 'st-legend-list');
      list.setAttribute('role', 'group');
      list.setAttribute('aria-label', tx(byKind ? 'view.legend.category' : 'view.legend.certainty'));
      names.forEach((name, k) => {
        if (!counts[k]) return;
        const key = `${colour}:${name}`;
        const on = store.view.only === key;
        const b = button(tx(`${byKind ? 'cat' : 'cert'}.${name}`), `only:${key}`, () => store.setView({ only: on ? null : key }), { cls: 'st-legend-item', pressed: on, title: byKind ? tx(`cat.${name}.means`) : tx(`cert.${name}.means`) });
        const sw = el('span', 'st-swatch');
        sw.style.background = colours[k];
        b.prepend(sw);
        b.append(el('span', 'st-count', String(counts[k])));
        list.append(b);
      });
      this.legend.append(list);
      const picked = store.view.only?.split(':')[1];
      if (picked) this.legend.append(el('p', 'st-small st-legend-note', tx(`${byKind ? 'cat' : 'cert'}.${picked}.means`)));
      else if (!byKind) this.legend.append(el('p', 'st-small st-legend-note', tx('cert.byPilot')));
    }
    this.follow();
  }
}
