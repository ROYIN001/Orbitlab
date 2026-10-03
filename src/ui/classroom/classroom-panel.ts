import { appBuildId } from '../../build-info';
import { checkClassroom, type ClassroomReadiness } from '../../classroom/readiness';
import { getLang, t } from '../../i18n';
import { BUNDLED_PACKS, packPath } from '../../lessons/packs';
import { localText } from '../../lessons/text';
import { button, el } from '../orbit/dom';
import './classroom.css';

const DATASETS = ['space-weather', 'satellites', 'earth-orientation'] as const;

export class ClassroomPanel {
  readonly root = el('section', 'classroom-panel');
  private selected = 'all';
  private result: ClassroomReadiness | null = null;
  private busy = false;

  constructor(private readonly check = checkClassroom) {
    this.root.id = 'classroom-preparation';
    this.root.setAttribute('aria-labelledby', 'classroom-title');
    const refreshVisible = (): void => { if (this.root.isConnected && !this.root.closest('[hidden]')) this.refresh(); };
    window.addEventListener('online', refreshVisible);
    window.addEventListener('offline', refreshVisible);
    navigator.serviceWorker?.addEventListener('controllerchange', refreshVisible);
  }

  section(): HTMLElement { this.refresh(); return this.root; }
  refresh(): void { void this.run(false); }
  async prepare(): Promise<void> { await this.run(true); }

  private async run(prepare: boolean): Promise<void> {
    if (this.busy) return;
    const focused = document.activeElement;
    const focusId = focused instanceof HTMLElement && this.root.contains(focused) ? focused.id : '';
    let moved = false;
    const noticeFocus = (): void => { moved = true; };
    this.busy = true;
    this.render();
    document.addEventListener('focusin', noticeFocus);
    try { this.result = await this.check(prepare); }
    finally {
      document.removeEventListener('focusin', noticeFocus);
      this.busy = false;
      this.render();
      // A keyboard action replaces its own control while checking. Restore
      // that control only if the user has not moved to another tab/dialog.
      if (focusId && !moved && this.root.getClientRects().length && !this.root.closest('[hidden]')) {
        const control = document.getElementById(focusId);
        if (control && this.root.contains(control)) control.focus();
      }
    }
  }

  private render(): void {
    const heading = el('h2', '', t('classroom.title'));
    heading.id = 'classroom-title';
    const label = el('label', 'classroom-choice', t('classroom.pack'));
    const select = el('select');
    select.id = 'classroom-pack';
    const all = el('option', '', t('classroom.all')); all.value = 'all'; select.append(all);
    for (const id of BUNDLED_PACKS) {
      const title = this.result?.resources?.packs[id]?.title;
      const option = el('option', '', title ? localText(title) : t(`classroom.pack.${id}`));
      option.value = id; select.append(option);
    }
    select.value = this.selected;
    select.disabled = this.busy;
    select.addEventListener('change', () => { this.selected = select.value; this.refresh(); });
    label.append(select);
    const actions = el('div', 'classroom-actions');
    const prepare = button('ghost-button', t('classroom.prepare'), () => void this.prepare());
    prepare.id = 'btn-classroom-prepare'; prepare.disabled = this.busy;
    const check = button('ghost-button', t('classroom.check'), () => this.refresh());
    check.id = 'btn-classroom-check'; check.disabled = this.busy;
    actions.append(prepare, check);
    const status = el('p', 'classroom-status');
    status.id = 'classroom-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const result = this.result, resources = result?.resources;
    const selectedPacks = this.selected === 'all' ? BUNDLED_PACKS : [this.selected];
    const packReady = !!resources && selectedPacks.every((id) => resources.packs[id] && !resources.missing.includes(packPath(id)));
    const ready = !!resources?.complete && packReady && !result?.error;
    this.root.dataset.readiness = this.busy ? 'checking' : ready ? 'ready' : 'incomplete';
    status.textContent = this.busy ? t('classroom.checking') : result?.error ? t(`classroom.error.${result.error}`)
      : ready ? t('classroom.ready') : t('classroom.incomplete');
    this.root.replaceChildren(heading, el('p', '', t('classroom.scope')), label, actions, status,
      el('p', '', t('classroom.build', { build: appBuildId() })));
    if (!result) return;
    if (result.waiting) this.root.append(el('p', 'classroom-status', t('classroom.waiting')));
    if (resources) {
      this.root.append(el('p', '', t('classroom.resources', { cached: resources.cached, total: resources.total })),
        el('p', '', t('classroom.cacheVersion', { version: resources.version })),
        el('p', '', t('classroom.cachedBytes', { size: this.bytes(resources.bytes) })));
      const list = el('ul');
      for (const id of selectedPacks) {
        const pack = resources.packs[id];
        list.append(el('li', '', pack ? t('classroom.packReady', { name: localText(pack.title), count: pack.count })
          : t('classroom.packMissing', { name: t(`classroom.pack.${id}`) })));
      }
      this.root.append(list);
      if (resources.missing.length) {
        const details = el('details');
        details.append(el('summary', '', t('classroom.missing', { count: resources.missing.length })));
        const files = el('ul');
        for (const path of resources.missing) files.append(el('li', '', path));
        details.append(files); this.root.append(details);
      }
      this.root.append(el('h3', '', t('classroom.datasets')));
      const dates = el('ul');
      for (const id of DATASETS) {
        const date = resources.dates[`data/${id}.json`];
        dates.append(el('li', '', `${t(`classroom.data.${id}`)}: ${date ?? t('classroom.unknown')}`));
      }
      this.root.append(dates);
    }
    const storage = result.storage;
    this.root.append(el('p', '', storage.unavailable || storage.quota === undefined || storage.usage === undefined
      ? t('classroom.storageUnavailable')
      : t('classroom.storage', { used: this.bytes(storage.usage), available: this.bytes(Math.max(0, storage.quota - storage.usage)) })),
    el('p', 'classroom-note', t('classroom.limits')),
    el('p', 'classroom-note', t('classroom.checked', { time: new Date(result.checkedAt).toLocaleTimeString(getLang()) })));
  }

  private bytes(value: number): string {
    return `${(value / (1024 * 1024)).toLocaleString(getLang(), { maximumFractionDigits: 1 })} MiB`;
  }
}
