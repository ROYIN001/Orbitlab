/**
 * The Structure & Assembly section (owner, 2026-11-09;
 * docs/development/reports/structure-assembly-pilot.md): explore a model,
 * assemble it to its reference, and — for a model whose design can be
 * changed — make a copy, change it, see what follows, and send it to Orbit
 * or Launch.
 *
 * `#/structure/<level>/<model>[/<activity>]`. The level is the depth
 * (src/ui/app-mode.ts): พื้นฐาน shows and picks the main assemblies, ทดลอง
 * their subsystems, joints and options, วิศวกร each part with its figures,
 * units, sources and method. Changing depth changes what is shown, what a
 * press picks and which tools there are — never the model, the selection,
 * the assembly or the design.
 *
 * This file only puts the parts together: the state and its rules are
 * src/ui/structure/store.ts, the picture src/ui/structure/stage.ts, the
 * panels beside it panels.ts, assembly-panel.ts and each model's own
 * (src/ui/structure/models). The whole is one chunk, loaded when the section
 * first opens (src/ui/structure-loader.ts); the models' files are fetched on
 * demand. Leaving the section cancels its fetches and frees its model's GPU
 * resources; its state stays, and what a learner made is kept in their
 * profile (src/structure/progress.ts).
 */
import type { StructureMode } from '../../structure/progress';
import type { Depth, StructureModelId } from '../../structure/types';
import { assemblyPanel } from './assembly-panel';
import { stageBar, stageHead } from './bars';
import { el } from './dom';
import type { StructureEnv, StructureSection } from './env';
import { makeAdapters } from './models/index';
import { guidePanel, infoPanel, introPanel, listPanel, sideTabs, systemsPanel } from './panels';
import { Stage } from './stage';
import { StructureStore, type Change, type SideTab } from './store';
import { getLang, hasLanguage, loadLanguage, tx } from './text';
import './structure.css';

export class StructureScreen implements StructureSection {
  readonly store: StructureStore;
  readonly stage: Stage;
  private visible = false;
  private readonly side = el('aside', 'st-side');
  /** says what was selected or done; it stays put (the panels are redrawn, a live region must not be) */
  private readonly announcer = el('p', 'sr-only');
  /** what the live region last said: the storage note, the last message and send note by their counts, the result's design, the selection */
  private said = { store: '', msg: 0, send: 0, verdict: '', sel: '' };
  private saySeq = 0;

  constructor(private readonly root: HTMLElement, env: StructureEnv) {
    root.classList.add('structure-screen');
    this.store = new StructureStore(env, makeAdapters(env));
    this.stage = new Stage(this.store, (head) => stageHead(this.store, head), (bar) => stageBar(this.store, this.stage, bar));
    this.announcer.setAttribute('role', 'status');
    this.announcer.setAttribute('aria-live', 'polite');
    const layout = el('div', 'st-layout');
    layout.append(this.stage.el, this.side, this.announcer);
    root.replaceChildren(layout);
    // the launch scene's camera would capture the press (src/render/cameras.ts): it is covered here
    root.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.store.on((change) => this.changed(change));
  }

  /** The viewer and the part numbering, for the browser journeys. */
  get viewer(): Stage['viewer'] { return this.stage.viewer; }
  unitOfItem(i: number): string { return this.store.adapter.unitOfItem(i); }

  // ─── lifecycle ────────────────────────────────────────────────────────────

  show(level: Depth, model?: StructureModelId, mode?: StructureMode): void {
    this.store.open(level, model, mode);
    this.visible = true;
    this.root.hidden = false;
    this.stage.show();
    this.render();
    this.language();
  }

  hide(): void {
    this.visible = false;
    this.stage.hide();
    this.store.save();
  }

  applyLanguage(): void {
    if (!this.visible) return;
    this.render();
    this.language();
  }

  /**
   * The interface language's copy, fetched the first time that language is on
   * screen (Thai, the source, is always here): the section shows the Thai
   * meanwhile, and is drawn again when the copy arrives.
   */
  private language(): void {
    const lang = getLang();
    if (hasLanguage(lang)) return;
    void loadLanguage(lang).then(() => { if (this.visible && getLang() === lang && hasLanguage(lang)) this.render(); });
  }

  /** The section's keys from the app's handler: Escape puts down what is in hand, else stops what is being followed, else clears the selection. */
  onKey(e: KeyboardEvent): void {
    if (!this.visible || e.key !== 'Escape') return;
    if ((e.target as HTMLElement | null)?.closest('dialog, input, select, textarea')) return;
    const store = this.store, model = store.model;
    if (store.held[model]) store.hold(null);
    else if (store.jointShown[model]) store.showJoint(null);
    else if (store.system[model]) store.showSystem(null);
    else store.select(null);
  }

  private changed(change: Change): void {
    if (!this.visible) return;
    if (change === 'picture') this.stage.sync();
    else this.render();
  }

  // ─── drawing ──────────────────────────────────────────────────────────────

  /** Re-draw the section, keeping the focus on the control that had it (`data-k`). */
  private render(): void {
    if (!this.visible) return;
    const store = this.store;
    const active = document.activeElement as HTMLElement | null;
    const k = active && this.root.contains(active) ? active.dataset.k : undefined;
    this.root.setAttribute('aria-labelledby', 'st-title');
    this.root.dataset.model = store.model;
    this.root.dataset.mode = store.mode;
    this.root.dataset.level = store.level;
    // the words on screen are Thai until the interface language's copy is here
    this.root.lang = hasLanguage(getLang()) ? getLang() : 'th';
    this.stage.render();
    this.renderSide();
    // focus stays on the control pressed; when it went or cannot be pressed now, on the one the action named, else the section's heading
    const usable = (key: string | undefined | null): HTMLElement | null => {
      const e = key ? this.root.querySelector<HTMLElement>(`[data-k="${CSS.escape(key)}"]`) : null;
      return e && !(e as HTMLButtonElement).disabled ? e : null;
    };
    if (k) (usable(k) ?? usable(store.focusNext) ?? this.side.querySelector<HTMLElement>('#st-title'))?.focus({ preventScroll: true });
    else if (store.focusNext) usable(store.focusNext)?.focus({ preventScroll: true });
    store.focusNext = null;
    this.announce();
  }

  private renderSide(): void {
    const store = this.store, adapter = store.adapter;
    const parts: HTMLElement[] = [introPanel(store)];
    const guide = guidePanel(store);
    if (guide) parts.push(guide);
    if (store.mode === 'assemble') {
      parts.push(assemblyPanel(store, true));
      if (store.shown()) parts.push(infoPanel(store));
    } else {
      if (store.mode === 'experiment' && adapter.experiment && store.ready) parts.push(...adapter.experiment.panels(store));
      const tabs: SideTab[] = store.ready && adapter.systems().length && store.level !== 'watch' ? ['info', 'list', 'systems'] : ['info', 'list'];
      // while a design is being changed the equipment list is the experiment's own: the tree is one tab away
      const now = tabs.includes(store.tab[store.model]) ? store.tab[store.model] : 'info';
      parts.push(sideTabs(store, tabs));
      parts.push(now === 'list' ? listPanel(store) : now === 'systems' ? systemsPanel(store) : infoPanel(store));
    }
    this.side.replaceChildren(...parts);
  }

  /**
   * The section's messages said once, when they change, by the live region
   * that stays (`announcer`): the panels that show them are redrawn on every
   * press, and a live region made afresh with its text is not reliably read.
   */
  private announce(): void {
    const store = this.store;
    const parts: string[] = [];
    const note = store.storeNote ?? '';
    if (note !== this.said.store && store.storeNote) parts.push(tx(`store.${store.storeNote}`));
    this.said.store = note;
    const shown = store.shown();
    const sel = shown ? `${store.model}:${shown.id}` : '';
    if (sel && sel !== this.said.sel) parts.push(tx('sel.announce', { name: store.adapter.name(shown!.id) }));
    this.said.sel = sel;
    if (store.mode === 'assemble' && store.message && store.message.seq !== this.said.msg) parts.push(store.message.text());
    this.said.msg = store.message?.seq ?? 0;
    if (store.mode === 'experiment' && store.sendNote && store.sendNote.seq !== this.said.send) parts.push(store.sendNote.text());
    this.said.send = store.sendNote?.seq ?? 0;
    // the energy verdict, once for each design shown
    const verdict = store.mode === 'experiment' && store.ready && store.adapter.experiment ? store.adapter.experiment.verdict(store) : null;
    if (verdict && verdict.key !== this.said.verdict) parts.push(verdict.text);
    this.said.verdict = verdict?.key ?? '';
    if (parts.length) this.say(parts.join(' '));
  }

  /** Say `text` in the live region: emptied first, so the same words said again are read again; the latest call wins. */
  private say(text: string): void {
    this.announcer.textContent = '';
    const seq = ++this.saySeq;
    requestAnimationFrame(() => { if (seq === this.saySeq) this.announcer.textContent = text; });
  }
}
