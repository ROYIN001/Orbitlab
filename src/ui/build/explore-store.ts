/**
 * The Explore level's saved designs (roadmap S05's store, used by D02 and
 * D03, and by D06's satellite designer): save the design on screen in this
 * browser, list what is kept, open, rename, delete, export a design as a
 * `.orbitlab.json` file and import one.
 *
 * One of these per kind of design (`LocalDesignStore`,
 * src/design/design-store.ts): the rocket designer's keeps the vehicle it
 * flies (kind 'vehicle'), and opening one hands its spec to the level, which
 * finds the parts design or the remix it can be edited as
 * (src/design/explore-model.ts, `draftFromSpec`); the satellite designer's
 * keeps a `SatelliteDesign` (kind 'satellite', D06). An imported file of the
 * other kind is kept too and handed to its own designer (`other`), never
 * opened as the wrong thing. Importing is all or nothing and held to the
 * store's own checks (`parseDesignDocument`): half a rocket is not a rocket. Every way the browser can refuse — storage switched off, a
 * full quota, a record deleted in another tab — is said in words, because a
 * design is someone's work and losing it silently is the one thing this must
 * not do.
 */
import { getLang, t } from '../../i18n';
import {
  DESIGN_FILE_EXTENSION, DesignStoreError, LocalDesignStore, designDocument, designFileName, designFileText, isDesignOf, parseDesignDocument,
  readDesignFileText, type DesignInput, type DesignKind, type DesignKinds, type DesignRecord, type DesignStore, type DesignStoreErrorCode, type DesignSummary,
} from '../../design/design-store';
import { MISSION_FORMAT } from '../../config/mission-file';
import { canonicalJson } from '../../design/design-ref';
import { downloadBlob } from '../download';
import { button, el } from '../orbit/dom';

export interface ExploreStoreHost<K extends DesignKind = 'vehicle'> {
  /** the design on screen (a vehicle, or a satellite), its name, and the record it was saved as or opened from; null when it cannot be kept */
  current(): { spec: DesignKinds[K]; name: string; recordId: string | null; ratingsFinal?: boolean } | null;
  /** the design on screen was saved as `record` */
  saved(recordId: string, name: string): void;
  /** open a kept or imported design */
  open(record: DesignRecord<K>): void;
  /** the record the design on screen belongs to was deleted */
  forgotten(recordId: string): void;
  /**
   * M-BUILD-007: the design opening `record` (or a requirements row) would replace, put on screen so Save keeps it —
   * the rocket draft of the record's kind, the student's own satellite with a lesson's put aside — or null when it
   * was never saved and is as it started
   */
  replacing(record?: DesignRecord<K>): { design: unknown; recordId: string | null } | null;
  /**
   * an imported file held the other kind of design (a satellite in the rocket
   * designer, or a rocket in the satellite's): kept, and opened where it
   * belongs, whose store says `message` (this one is hidden by then)
   */
  other?(record: DesignRecord, message: string): void;
}

/** The sentences that name what a kind is: the rest of the store's words are the same for both. */
export interface StoreTexts {
  /** the store refused the design on screen */
  invalid: string;
  /** a file of this kind whose design is not sound */
  fileInvalid: string;
}
/** Each kind's sentences (the rocket designer's and the satellite designer's, D06). */
export const STORE_TEXTS: Readonly<Record<DesignKind, StoreTexts>> = {
  vehicle: { invalid: 'build.ex.store.invalid', fileInvalid: 'build.ex.store.fileInvalid' },
  satellite: { invalid: 'build.sat.store.invalid', fileInvalid: 'build.sat.store.fileInvalid' },
};
const ROCKET_TEXTS = STORE_TEXTS.vehicle;
/** What a file of each kind is called when it is refused, whichever designer it was imported in. */
const FILE_INVALID: Record<DesignKind, string> = { vehicle: 'build.ex.store.fileInvalid', satellite: 'build.sat.store.fileInvalid' };

type Message = { level: 'ok' | 'warn' | 'error'; text: string; extra?: string };

/** A design as kept, its payload ratings aside: they are computed, not drawn (D-75). */
const drawn = ({ payloadLEO: _l, payloadGTO: _g, payloadSSO: _s, ...d }: Record<string, unknown>): string => canonicalJson(d);

/**
 * M-BUILD-007: the question before a design with changes no saved record keeps gives way to `name`: save it
 * first, open without saving, or keep it (Cancel, Escape). The buttons' keys start with `key`.
 */
export function askReplace(name: string, key: string, save: () => void, open: () => void, cancel: () => void): HTMLElement {
  const row = el('div', 'bx-store-row');
  const ask = el('span', 'bx-confirm', t('build.ex.store.confirmOpen', { name }));
  ask.setAttribute('role', 'alert');
  const b = (k: string, cls: string, text: string, fn: () => void): HTMLButtonElement => {
    const x = button(`watch-btn${cls}`, text, fn);
    x.dataset.k = key + k;
    return x;
  };
  row.append(ask, b('save', ' primary', t('build.ex.store.saveOpen'), save), b('open', ' danger', t('build.ex.store.openAnyway'), open),
    b('cancel', '', t('build.ex.store.cancel'), cancel));
  // Escape keeps the design, as Cancel does
  row.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); } });
  return row;
}

const STORE_ERROR_KEY: Record<DesignStoreErrorCode, string> = {
  unavailable: 'build.ex.store.unavailable',
  full: 'build.ex.store.full',
  // a design the store refuses is named by its kind (`StoreTexts.invalid`); this is the rocket's
  invalid: 'build.ex.store.invalid',
  collection: 'build.ex.store.collection',
  notFound: 'build.ex.store.notFound',
};

export class ExploreStore<K extends DesignKind = 'vehicle'> {
  readonly root = el('section', 'bs-panel bx-store');
  private list: DesignSummary[] = [];
  private message: Message | null = null;
  /** the record being renamed, or asked about before it is deleted */
  private renaming: string | null = null;
  private deleting: string | null = null;
  /** M-BUILD-007: the record asked about before it opens over unsaved changes */
  private opening: string | null = null;
  /** the control the keyboard goes to once the list is drawn again (a `data-k`) */
  private focusNext: string | null = null;
  private readonly fileInput = el('input');
  /** The heading's id, one per kind: the rocket's and the satellite's stores are both in the page once both designers were shown. */
  private get titleId(): string { return this.kind === 'vehicle' ? 'bx-store-title' : `bx-store-title-${this.kind}`; }

  constructor(private readonly host: ExploreStoreHost<K>, private readonly store: DesignStore = new LocalDesignStore(),
    private readonly kind: K = 'vehicle' as K, private readonly texts: StoreTexts = ROCKET_TEXTS) {
    this.root.setAttribute('aria-labelledby', this.titleId);
    this.fileInput.type = 'file';
    this.fileInput.accept = `${DESIGN_FILE_EXTENSION},.json,application/json`;
    this.fileInput.hidden = true;
    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput.files?.[0];
      this.fileInput.value = '';
      if (file) void this.importFile(file);
    });
  }

  /** Read the list again and draw it. */
  async refresh(): Promise<void> {
    this.list = await this.store.list(this.kind);
    this.render();
  }

  private say(message: Message | null): void {
    this.message = message;
    this.render();
  }

  /** Say something that happened elsewhere (a file of this kind imported in the other designer and opened here). */
  announce(level: Message['level'], text: string): void {
    this.say({ level, text });
  }

  private failure(error: unknown): Message {
    if (error instanceof DesignStoreError) return { level: 'error', text: t(error.code === 'invalid' ? this.texts.invalid : STORE_ERROR_KEY[error.code]) };
    return { level: 'error', text: t('build.ex.store.unavailable') };
  }

  /** Save the design on screen: as a change to its record, or as a new one. What went wrong, or null once it is kept. */
  async save(asNew: boolean): Promise<string | null> {
    const cur = this.host.current();
    if (!cur) { this.say({ level: 'error', text: t(this.texts.invalid) }); return this.message!.text; }
    const keep = !asNew && cur.recordId !== null && this.list.some((d) => d.id === cur.recordId);
    try {
      const rec = await this.store.save({ kind: this.kind, name: cur.name, design: cur.spec, ...(keep ? { id: cur.recordId! } : {}), ...(cur.ratingsFinal ? { ratingsFinal: true } : {}) } as DesignInput<K>);
      this.host.saved(rec.id, rec.name);
      this.message = { level: 'ok', text: t('build.ex.store.saved', { name: rec.name }) };
    } catch (error) {
      this.message = this.failure(error);
    }
    await this.refresh();
    return this.message.level === 'error' ? this.message.text : null;
  }

  /**
   * M-BUILD-007: "Save it, then open": the design the question was about — the one opening `rec` (or a requirements
   * row) would replace — put back on screen, as the student may have looked at another since (the other rocket draft,
   * the lesson's design), then kept in its own record (the list read first, so it is found). Nothing to lose, nothing saved.
   */
  async saveFirst(rec?: DesignRecord<K>): Promise<string | null> {
    if (!this.host.replacing(rec)) return null;
    await this.refresh();
    return this.save(false);
  }

  /** M-BUILD-007: the question's "Save it, then open" for record `id`; a record gone meanwhile is said by `openRecord`. */
  private async saveThenOpen(id: string): Promise<void> {
    const rec = await this.store.get(id);
    if (rec && isDesignOf(rec, this.kind) && await this.saveFirst(rec)) return;
    await this.openRecord(id, true);
  }

  /**
   * M-BUILD-007: whether opening `rec` (or a requirements row) would replace a design with changes no saved record
   * keeps: its record is gone, or differs from it in more than its ratings (D-75), or it was never saved and changed.
   */
  async unsaved(rec?: DesignRecord<K>): Promise<boolean> {
    const own = this.host.replacing(rec);
    if (!own) return false;
    const kept = own.recordId === null ? null : await this.store.get(own.recordId).catch(() => null);
    return !kept || !own.design || drawn(kept.design as never) !== drawn(own.design as never);
  }

  /** A kept rocket's ratings computed again: kept, not a design edit (D-75); null when they could not be. */
  async rerate(id: string, design: DesignKinds['vehicle']): Promise<DesignRecord<'vehicle'> | null> {
    let rec: DesignRecord<'vehicle'> | null = null;
    // not kept: said as any failed save is, and tried again at the next open
    try { rec = await this.store.rerate(id, design); } catch (error) { this.say(this.failure(error)); }
    if (rec) await this.refresh();
    return rec;
  }

  /** Open a kept design; asked first over unsaved changes, unless `sure` (M-BUILD-007). Whether it was opened. */
  async openRecord(id: string, sure = false): Promise<boolean> {
    const rec = await this.store.get(id);
    this.opening = null;
    if (!rec || !isDesignOf(rec, this.kind)) { this.say({ level: 'error', text: t('build.ex.store.notFound') }); await this.refresh(); return false; }
    if (!sure && await this.unsaved(rec)) {
      this.opening = id;
      this.renaming = this.deleting = null;
      this.focusNext = 'ask:save';
      this.render();
      return false;
    }
    this.host.open(rec);
    return true;
  }

  private async rename(id: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) { this.say({ level: 'error', text: t('build.refuse.noName') }); return; }
    const rec = await this.store.get(id);
    if (!rec) { this.renaming = null; this.say({ level: 'error', text: t('build.ex.store.notFound') }); await this.refresh(); return; }
    try {
      // the design keeps its name in step with the record's: the Launch section shows the vehicle's, the Orbit section the satellite's
      const saved = await this.store.save({ id, kind: rec.kind, name: trimmed, design: { ...rec.design, name: trimmed }, ...(rec.ratingsFinal ? { ratingsFinal: true } : {}) } as DesignInput);
      this.renaming = null;
      this.message = { level: 'ok', text: t('build.ex.store.renamed', { name: saved.name }) };
      const cur = this.host.current();
      if (cur?.recordId === id) this.host.saved(id, saved.name);
      this.focusNext = `rename:${id}`;
    } catch (error) {
      this.message = this.failure(error);
    }
    await this.refresh();
  }

  private async remove(id: string, name: string): Promise<void> {
    this.deleting = null;
    this.focusNext = 'store:save';
    try {
      await this.store.remove(id);
      this.message = { level: 'ok', text: t('build.ex.store.deleted', { name }) };
      this.host.forgotten(id);
    } catch (error) {
      this.message = this.failure(error);
    }
    await this.refresh();
  }

  private exportRecord(rec: Pick<DesignRecord, 'kind' | 'name' | 'created' | 'updated' | 'design' | 'id'>): void {
    const doc = designDocument(rec as DesignRecord);
    downloadBlob(new Blob([designFileText(doc)], { type: 'application/json' }), designFileName(rec));
    this.say({ level: 'ok', text: t('build.ex.store.exported', { name: rec.name }) });
  }

  private async exportKept(id: string): Promise<void> {
    const rec = await this.store.get(id);
    if (!rec) { this.say({ level: 'error', text: t('build.ex.store.notFound') }); return; }
    this.exportRecord(rec);
  }

  /** Export the design on screen as it stands, saved or not. */
  exportCurrent(): void {
    const cur = this.host.current();
    if (!cur) return;
    const now = new Date().toISOString();
    this.exportRecord({ id: cur.recordId ?? '', kind: this.kind, name: cur.name, created: now, updated: now, design: cur.spec } as DesignRecord);
  }

  async importFile(file: File): Promise<void> {
    const raw = readDesignFileText(await file.text());
    const parsed = parseDesignDocument(raw);
    if (!parsed.input) {
      const isMission = !!raw && typeof raw === 'object' && (raw as { format?: unknown }).format === MISSION_FORMAT;
      const invalid = parsed.issues.find((i) => i.code === 'invalid');
      // a satellite file refused in the rocket designer is called a satellite, and the other way round
      const kind = (raw as { kind?: unknown } | null)?.kind;
      const fileInvalid = kind === 'vehicle' || kind === 'satellite' ? FILE_INVALID[kind] : this.texts.fileInvalid;
      this.say({
        level: 'error',
        // M-BUILD-008 (D-22): a newer file with fields this version does not know is refused whole, and names them
        text: invalid?.fields ? t('build.ex.store.fileNewerFields', { fields: invalid.fields.join(', ') })
          : t(isMission ? 'build.ex.store.fileMission' : invalid ? fileInvalid : 'build.ex.store.fileFormat'),
        ...(invalid?.detail ? { extra: invalid.detail } : {}),
      });
      return;
    }
    try {
      const rec = await this.store.save(parsed.input);
      const newer = parsed.issues.some((i) => i.code === 'newerVersion');
      const newerText = newer ? ` ${t('build.ex.store.fileNewer')}` : '';
      if (!isDesignOf(rec, this.kind)) {
        // the other kind: kept, and opened in its own designer, never as the wrong thing. That designer's store says
        // so: this one is hidden once the other designer is on screen, and a message left here would be stale on return
        const text = `${t(rec.kind === 'satellite' ? 'build.sat.store.toSatellite' : 'build.sat.store.toRocket', { name: rec.name })}${newerText}`;
        this.message = null;
        await this.refresh();
        this.host.other?.(rec, text);
        return;
      }
      // kept either way; opened at once, or asked first over unsaved changes (M-BUILD-007)
      await this.refresh();
      const opened = await this.openRecord(rec.id);
      this.say({ level: newer ? 'warn' : 'ok', text: `${t(opened ? 'build.ex.store.imported' : 'build.ex.store.saved', { name: rec.name })}${newerText}` });
    } catch (error) {
      this.say(this.failure(error));
    }
  }

  render(): void {
    const cur = this.host.current();
    const head = el('div', 'bx-store-head');
    const title = el('h2', 'bx-h2', t('build.ex.store'));
    title.id = this.titleId;
    head.append(title);
    const actions = el('div', 'bx-actions');
    const save = button('watch-btn primary', t('build.ex.store.save'), () => void this.save(false));
    save.disabled = !cur;
    const saveNew = button('watch-btn', t('build.ex.store.saveNew'), () => void this.save(true));
    saveNew.disabled = !cur || cur.recordId === null;
    const exp = button('watch-btn', t('build.ex.store.exportThis'), () => this.exportCurrent());
    exp.disabled = !cur;
    const imp = button('watch-btn', t('build.ex.store.import'), () => this.fileInput.click());
    save.dataset.k = 'store:save';
    saveNew.dataset.k = 'store:saveNew';
    exp.dataset.k = 'store:export';
    imp.dataset.k = 'store:import';
    this.fileInput.dataset.k = 'store:file';
    actions.append(save, saveNew, exp, imp, this.fileInput);

    const status = el('div', 'bx-store-msg');
    status.setAttribute('role', 'status');
    if (this.message) {
      status.dataset.level = this.message.level;
      status.append(el('p', undefined, this.message.text));
      if (this.message.extra) {
        const more = el('details', 'bd-say-detail');
        more.append(el('summary', undefined, t('build.ex.detail')));
        const code = el('code', undefined, this.message.extra);
        code.lang = 'en';
        more.append(code);
        status.append(more);
      }
    }

    const listEl = el('ul', 'bx-store-list');
    if (!this.list.length) listEl.append(el('li', 'bx-store-empty', t('build.ex.store.empty')));
    for (const d of this.list) listEl.append(this.item(d, cur?.recordId ?? null));
    // a redraw replaces the buttons: the keyboard stays where it was, or goes where the action leads
    const active = document.activeElement as HTMLElement | null;
    const was = active && this.root.contains(active) ? active.dataset.k ?? null : null;
    this.root.replaceChildren(head, actions, status, listEl);
    const key = this.focusNext ?? was;
    this.focusNext = null;
    if (key) this.root.querySelector<HTMLElement>(`[data-k="${CSS.escape(key)}"]`)?.focus();
  }

  private item(d: DesignSummary, currentId: string | null): HTMLLIElement {
    const li = el('li', 'bx-store-item');
    if (d.id === currentId) li.classList.add('current');
    const when = new Date(d.updated).toLocaleString(getLang(), { dateStyle: 'medium', timeStyle: 'short' });
    if (this.renaming === d.id) {
      const form = el('form', 'bx-rename');
      const label = el('label', 'bx-field');
      label.append(el('span', undefined, t('build.ex.store.renameTo')));
      const input = el('input');
      input.type = 'text';
      input.maxLength = 80;
      input.value = d.name;
      input.dataset.k = `renameTo:${d.id}`;
      label.append(input);
      const ok = el('button', 'watch-btn primary', t('build.ex.store.renameOk'));
      ok.type = 'submit';
      const cancel = button('watch-btn', t('build.ex.store.cancel'), () => { this.renaming = null; this.focusNext = `rename:${d.id}`; this.render(); });
      ok.dataset.k = `renameOk:${d.id}`;
      cancel.dataset.k = `renameCancel:${d.id}`;
      form.append(label, ok, cancel);
      form.addEventListener('submit', (e) => { e.preventDefault(); void this.rename(d.id, input.value); });
      // Escape backs out of the rename, as Cancel does
      form.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel.click(); } });
      li.append(form);
      return li;
    }
    const text = el('div', 'bx-store-text');
    text.append(el('strong', undefined, d.name));
    const meta = el('small', undefined, t('build.ex.store.updated', { date: when }));
    if (d.id === currentId) meta.append(` · ${t('build.ex.store.current')}`);
    text.append(meta);
    li.append(text);
    if (this.opening === d.id) {
      li.append(askReplace(d.name, 'ask:', () => void this.saveThenOpen(d.id), () => void this.openRecord(d.id, true),
        () => { this.opening = null; this.focusNext = `open:${d.id}`; this.render(); }));
      return li;
    }
    const row = el('div', 'bx-store-row');
    if (this.deleting === d.id) {
      const yes = button('watch-btn danger', t('build.ex.store.yesDelete'), () => void this.remove(d.id, d.name));
      const no = button('watch-btn', t('build.ex.store.cancel'), () => { this.deleting = null; this.focusNext = `delete:${d.id}`; this.render(); });
      yes.dataset.k = `yes:${d.id}`;
      no.dataset.k = `no:${d.id}`;
      const ask = el('span', 'bx-confirm', t('build.ex.store.confirmDelete', { name: d.name }));
      ask.setAttribute('role', 'alert');
      row.append(ask, yes, no);
      // Escape keeps the design, as Cancel does
      row.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); no.click(); } });
    } else {
      const named = (b: HTMLButtonElement, key: string, k: string): HTMLButtonElement => {
        b.setAttribute('aria-label', `${t(key)}: ${d.name}`);
        b.dataset.k = `${k}:${d.id}`;
        return b;
      };
      row.append(
        named(button('watch-btn', t('build.ex.store.open'), () => void this.openRecord(d.id)), 'build.ex.store.open', 'open'),
        named(button('watch-btn', t('build.ex.store.rename'), () => { this.renaming = d.id; this.deleting = null; this.focusNext = `renameTo:${d.id}`; this.render(); }), 'build.ex.store.rename', 'rename'),
        named(button('watch-btn', t('build.ex.store.export'), () => void this.exportKept(d.id)), 'build.ex.store.export', 'exportOne'),
        named(button('watch-btn', t('build.ex.store.delete'), () => { this.deleting = d.id; this.renaming = null; this.focusNext = `no:${d.id}`; this.render(); }), 'build.ex.store.delete', 'delete'),
      );
    }
    li.append(row);
    return li;
  }
}
