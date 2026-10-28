/**
 * The owner's Soyuz Anatomy pages in Build (owner, 2026-10-28: "แบบที่มีโครงสร้าง
 * ภายในเช่นถังเชื้อเพลิง เอาไปใส่ในโหมดการสร้างจรวด", the kind with the inside
 * structure such as the propellant tanks goes into the rocket-building mode):
 * each page whole, as its author made it — the vehicle in 3-D with its tanks,
 * engines and plumbing, to take apart and cut open, with its Thai guide — in a
 * dialog over the Watch level, for Soyuz-2.1a with the Soyuz MS or the
 * Progress MS-26, and for Soyuz-2.1b with Fregat (src/data/anatomy.ts).
 *
 * A page is about 4.5 MB, loaded only when it is opened, and kept once seen
 * (src/pwa/manifest.ts). Each page opens in a frame of its own, made for it
 * and removed on close: loading a page into a frame that has already shown
 * one would add an entry to the browser's history, so Back would step the
 * hidden frame instead of the app; removing it also frees its WebGL at once.
 * The page then builds its model on the app's own thread (it is of the same
 * origin), 10–20 s on a slow machine, which holds the app still meanwhile:
 * the loading note stays over it until the page says it is done.
 */
import { t } from '../../i18n';
import { Modal } from '../dialogs';
import { anatomyPagesFor, type AnatomyPage, type AnatomyVariant } from '../../data/anatomy';
import { button, el } from '../orbit/dom';

const VARIANT_KEY: Record<AnatomyVariant, string> = {
  'soyuz-ms': 'build.anatomy.variant.soyuzMs',
  'progress-ms-26': 'build.anatomy.variant.progress',
  'fregat-st31': 'build.anatomy.variant.fregat',
};

export class AnatomyDialog extends Modal {
  private pages: AnatomyPage[] = [];
  private current: AnatomyPage | null = null;
  private name = '';
  private readonly head = el('div', 'bs-anatomy-head');
  /** where the page's frame goes, the loading note under it until the page has loaded */
  private readonly view = el('div', 'bs-anatomy-view');
  private readonly loading = el('p', 'bs-anatomy-loading');
  private frame: HTMLIFrameElement | null = null;

  constructor() {
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog bs-anatomy';
    document.body.append(dialog);
    super(dialog);
    this.loading.setAttribute('role', 'status');
    this.view.append(this.loading);
    this.body.append(this.head, this.view);
    dialog.addEventListener('close', () => { this.frame?.remove(); this.frame = null; });
  }

  /** Open the pages of a vehicle (`name` its display name), at the first; nothing for a vehicle without one. */
  show(vehicleId: string, name: string, opener: HTMLElement | null): void {
    this.pages = anatomyPagesFor(vehicleId);
    if (!this.pages.length) return;
    this.name = name;
    this.current = this.pages[0];
    this.open(opener);
    this.load();
  }

  /** The current page, in a new frame: its address set before the frame is in the document, so it is the frame's first page and no history entry. */
  private load(): void {
    if (!this.current) return;
    this.frame?.remove();
    const frame = document.createElement('iframe');
    frame.className = 'bs-anatomy-frame';
    frame.referrerPolicy = 'no-referrer';
    frame.title = t('build.anatomy.frame', { name: this.name });
    frame.src = new URL(this.current.page, document.baseURI).href;
    this.loading.hidden = false;
    frame.addEventListener('load', () => this.whenBuilt(frame));
    this.frame = frame;
    this.view.append(frame);
  }

  /**
   * Hide the loading note once the page has built its model: its root's
   * `data-loading`, set while it builds (or falls back to its still image),
   * gone. At once for a page without that root (not the expected page).
   */
  private whenBuilt(frame: HTMLIFrameElement): void {
    const done = () => { if (frame === this.frame) this.loading.hidden = true; };
    let root: HTMLElement | null = null;
    try { root = frame.contentDocument?.getElementById('soyuz-anatomy') ?? null; } catch { /* not readable: nothing to wait on */ }
    if (!root?.dataset.loading) { done(); return; }
    const watch = new MutationObserver(() => { if (!root!.dataset.loading) { watch.disconnect(); done(); } });
    watch.observe(root, { attributes: true, attributeFilter: ['data-loading'] });
  }

  private pick(page: AnatomyPage): void {
    if (page === this.current) return;
    this.current = page;
    this.applyLanguage();
    this.load();
    this.head.querySelector<HTMLElement>(`[data-k="${page.variant}"]`)?.focus();
  }

  applyLanguage(): void {
    super.applyLanguage();
    const page = this.current;
    if (!page) return;
    const title = el('h2', 'bs-anatomy-title', t('build.anatomy.title', { name: this.name }));
    title.id = 'bs-anatomy-title';
    this.el.setAttribute('aria-labelledby', title.id);
    const variants = el('div', 'bs-anatomy-variants');
    variants.setAttribute('role', 'group');
    variants.setAttribute('aria-label', t('build.anatomy.variants'));
    for (const p of this.pages) {
      const b = button('bs-tab', t(VARIANT_KEY[p.variant]), () => this.pick(p));
      b.dataset.k = p.variant;
      b.setAttribute('aria-pressed', String(p === page));
      variants.append(b);
    }
    const link = document.createElement('a');
    link.className = 'bs-anatomy-link';
    link.href = new URL(page.page, document.baseURI).href;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = t('build.anatomy.newTab');
    this.head.replaceChildren(title, variants, el('p', 'bs-anatomy-note', t('build.anatomy.note')), link);
    this.loading.textContent = t('build.anatomy.loading');
    if (this.frame) this.frame.title = t('build.anatomy.frame', { name: this.name });
  }
}
