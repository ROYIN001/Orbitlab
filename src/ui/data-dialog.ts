/**
 * The data sources window (roadmap S04): offline or online, chosen here and
 * shown by the indicator in the top bar, and every dataset with where it came
 * from this time and how old it is ("data as of"). The logic is
 * src/provider/; this only draws it.
 */
import { Modal } from './dialogs';
import { t, getLang } from '../i18n';
import { DATA_MODES, type DataMode } from '../provider/data-mode';
import { DATA_HOSTS, DATASET_IDS, type DatasetId } from '../provider/datasets';
import type { DataProvider, Dataset } from '../provider/data-provider';
import type { SpaceWeather } from '../provider/space-weather';
import type { SatelliteCatalog } from '../provider/satellites';

export interface DataDialogHost {
  mode(): DataMode;
  setMode(mode: DataMode): void;
  provider(): DataProvider;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

type Loaded = { state: 'loading' } | { state: 'done'; set: Dataset<unknown> } | { state: 'failed'; reason: string };

const SET_NAME: Record<DatasetId, string> = { spaceWeather: 'data.set.spaceWeather', satellites: 'data.set.satellites' };
const MODE_TEXT: Record<DataMode, readonly [string, string]> = {
  offline: ['data.offline.title', 'data.offline.text'],
  online: ['data.online.title', 'data.online.text'],
};

export class DataDialog extends Modal {
  private loaded = new Map<DatasetId, Loaded>();
  private loading: AbortController | null = null;

  constructor(private readonly host: DataDialogHost) {
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog data-dialog';
    (document.getElementById('app') ?? document.body).append(dialog);
    super(dialog);
    dialog.addEventListener('close', () => this.loading?.abort());
  }

  open(opener: HTMLElement | null = null): void {
    this.reload();
    super.open(opener);
  }

  /** Load every dataset through the provider of the mode now chosen. */
  private reload(): void {
    this.loading?.abort();
    const ctl = new AbortController();
    this.loading = ctl;
    const provider = this.host.provider();
    for (const id of DATASET_IDS) {
      this.loaded.set(id, { state: 'loading' });
      provider.load(id, ctl.signal).then((set) => { if (!ctl.signal.aborted) this.loaded.set(id, { state: 'done', set }); },
        (error: unknown) => { if (!ctl.signal.aborted) this.loaded.set(id, { state: 'failed', reason: error instanceof Error ? error.message : String(error) }); })
        .finally(() => { if (!ctl.signal.aborted && this.el.open) this.applyLanguage(); });
    }
  }

  applyLanguage(): void {
    super.applyLanguage();
    this.el.setAttribute('aria-label', t('data.title'));
    const b = this.body;
    // the body is rebuilt as the datasets arrive: keep the keyboard where it was
    const focused = b.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.focus : undefined;
    b.replaceChildren(el('span', 'eyebrow', t('data.eyebrow')), el('h2', undefined, t('data.title')), el('p', 'lead', t('data.lead')));

    const modes = el('fieldset', 'data-modes');
    modes.append(el('legend', 'sr-only', t('data.title')));
    for (const mode of DATA_MODES) {
      const label = el('label', 'data-mode-option');
      const input = el('input');
      input.type = 'radio';
      input.name = 'data-mode';
      input.value = mode;
      input.dataset.focus = `mode-${mode}`;
      input.checked = this.host.mode() === mode;
      input.addEventListener('change', () => {
        if (!input.checked) return;
        this.host.setMode(mode);
        this.reload();
        this.applyLanguage();
      });
      const text = el('span');
      text.append(el('strong', undefined, t(MODE_TEXT[mode][0])), el('span', undefined, t(MODE_TEXT[mode][1], { hosts: DATA_HOSTS.join(', ') })));
      label.append(input, text);
      modes.append(label);
    }
    b.append(modes);

    b.append(el('h3', undefined, t('data.sets')));
    const list = el('ul', 'data-sets');
    for (const id of DATASET_IDS) {
      const li = el('li');
      li.append(el('strong', undefined, t(SET_NAME[id])));
      const got = this.loaded.get(id) ?? { state: 'loading' };
      if (got.state === 'loading') li.append(el('span', 'data-set-status', t('data.loading')));
      else if (got.state === 'failed') li.append(el('span', 'data-set-status warn', t('data.failed', { reason: got.reason })));
      else {
        const set = got.set;
        const from = set.from === 'snapshot' ? t('data.from.snapshot')
          : set.fetched ? t('data.from.onlineKept', { source: set.source.name, date: this.date(set.fetched) }) : t('data.from.online', { source: set.source.name });
        li.append(el('span', 'data-set-status', `${t('data.asOf', { date: this.date(set.asOf) })} · ${from}`));
        if (id === 'spaceWeather') li.append(el('span', 'data-set-summary', this.spaceWeather(set.data as SpaceWeather)));
        if (id === 'satellites') li.append(el('span', 'data-set-summary', this.satellites(set.data as SatelliteCatalog)));
        if (set.fallback) li.append(el('span', 'data-set-status warn', t('data.fallback', { reason: set.fallback })));
      }
      list.append(li);
    }
    b.append(list, el('p', 'field-note', t('data.note')));
    if (focused) b.querySelector<HTMLElement>(`[data-focus="${focused}"]`)?.focus({ preventScroll: true });
  }

  private date(iso: string): string {
    return new Date(iso).toLocaleString(getLang(), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';
  }

  private satellites(c: SatelliteCatalog): string {
    return t('data.summary.satellites', { n: c.groups.reduce((n, g) => n + g.sets.length, 0).toLocaleString(getLang()), groups: c.groups.length });
  }

  private spaceWeather(sw: SpaceWeather): string {
    const f = sw.f107[sw.f107.length - 1], k = sw.kp[sw.kp.length - 1];
    const date = new Date(`${f.date}T12:00:00Z`).toLocaleDateString(getLang(), { dateStyle: 'medium', timeZone: 'UTC' });
    return t('data.summary.spaceWeather', { flux: f.flux.toFixed(0), date, kp: k.kp.toFixed(2) });
  }
}
