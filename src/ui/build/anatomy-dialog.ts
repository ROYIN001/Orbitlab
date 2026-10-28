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
 * (src/pwa/manifest.ts); closing the dialog unloads it, freeing its WebGL.
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
  private readonly frame = document.createElement('iframe');

  constructor() {
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog bs-anatomy';
    document.body.append(dialog);
    super(dialog);
    this.frame.className = 'bs-anatomy-frame';
    this.frame.referrerPolicy = 'no-referrer';
    // the frame stays put while the header is rebuilt: moving it would load the page again
    this.body.append(this.head, this.frame);
    dialog.addEventListener('close', () => { this.frame.src = 'about:blank'; });
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

  private load(): void {
    if (!this.current) return;
    this.frame.src = new URL(this.current.page, document.baseURI).href;
    this.frame.title = t('build.anatomy.frame', { name: this.name });
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
    this.frame.title = t('build.anatomy.frame', { name: this.name });
  }
}
