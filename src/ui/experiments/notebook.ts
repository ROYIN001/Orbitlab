import { getLang, t } from '../../i18n';
import type { MissionDocument } from '../../config/mission-file';
import {
  captureExperimentRun, compareExperiment, loadNotebook, missionInputs, saveNotebookRevision,
  NOTEBOOK_MAX_ENTRIES, NOTEBOOK_TEXT_LIMIT,
  type ExperimentEntry, type ExperimentRun, type ExperimentRunInput, type InputValue, type NotebookData, type NotebookStore,
} from '../../experiments/notebook';
import { figureLabel, formatFigure } from '../compare';
import { downloadBlob } from '../download';
import './notebook.css';

export interface ExperimentNotebookHost {
  capture(): ExperimentRunInput | null;
  /** Restore setup only. Launch stays an explicit action in the mission UI. */
  restoreMission(mission: MissionDocument): boolean;
}

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
};

/** Common single variables, labelled in the units stored in the mission. All
 * changed fields, including fields beyond this list, are still compared. */
const VARIABLES: Record<string, string> = {
  payloadMass: 'exp.input.payloadMass', 'orbit.perigee': 'exp.input.perigee', 'orbit.apogee': 'exp.input.apogee',
  'orbit.inclination': 'exp.input.inclination', 'launchTime': 'setup.launchTime',
  'guidanceOverrides.pitchOverAltitude': 'exp.input.pitchOverAltitude', 'guidanceOverrides.kickAngle': 'exp.input.kickAngle',
  'guidanceOverrides.kickDuration': 'exp.input.kickDuration', 'guidanceOverrides.maxTurnRate': 'exp.input.maxTurnRate',
  'guidanceOverrides.maxAccel': 'exp.input.maxAccel', 'dynamics.wind': 'setup.dynamics.wind',
  'dynamics.seed': 'setup.dynamics.seed', 'dynamics.model': 'setup.dynamics.model',
  'dynamics.explicitGuidance.law': 'exp.input.guidanceLaw',
};
const inputLabel = (path: string): string => VARIABLES[path] ? t(VARIABLES[path]) : path;
function inputText(value: InputValue | undefined, path: string): string {
  if (value === undefined || value === null) return t('exp.notRecorded');
  if (typeof value === 'boolean') return t(value ? 'exp.yes' : 'exp.no');
  if (typeof value === 'number') return value.toLocaleString(getLang(), { maximumFractionDigits: 8 });
  if (path === 'dynamics.wind' && ['calm', 'crosswind', 'shear'].includes(value)
    || path === 'dynamics.model' && ['pointMass', 'sixDof'].includes(value)) return t(`setup.dynamics.${value}`);
  if (path === 'dynamics.explicitGuidance.law') {
    if (value === 'standard') return t('mc.law.standard');
    if (value === 'peg' || value === 'igm') return t(`guide.law.${value}`);
  }
  return value;
}

export class ExperimentNotebook {
  readonly root = element('section');
  private data: NotebookData;
  private selected: string | null = null;
  private creating = true;
  private draft = { title: '', prediction: '', variable: 'payloadMass' };
  private messageKey = '';
  private storageBlocked = false;
  private unsaved = false;
  private deletePending = false;
  private revision: string | null;
  private storageChanged = false;

  constructor(private readonly host: ExperimentNotebookHost, private readonly store?: NotebookStore) {
    const loaded = loadNotebook(store);
    this.data = loaded.data;
    this.revision = loaded.revision;
    this.storageBlocked = loaded.status === 'invalid';
    this.messageKey = loaded.status === 'invalid' ? 'exp.storageInvalid' : loaded.status === 'unavailable' ? 'exp.storageUnavailable' : '';
    this.root.className = 'experiment-notebook';
    this.root.tabIndex = -1;
    this.render();
  }

  /** Embeddable in My Work; its parent is responsible for revealing the tab. */
  open(): void { this.root.hidden = false; this.render(); this.root.focus(); }

  /** Call after an explicitly approved project import. */
  reload(): void {
    const loaded = loadNotebook(this.store);
    this.data = loaded.data;
    this.revision = loaded.revision;
    this.storageChanged = false;
    this.deletePending = false;
    this.storageBlocked = loaded.status === 'invalid';
    this.unsaved = false;
    this.messageKey = loaded.status === 'invalid' ? 'exp.storageInvalid' : loaded.status === 'unavailable' ? 'exp.storageUnavailable' : '';
    this.selected = this.data.experiments[0]?.id ?? null;
    this.creating = !this.selected;
    this.render();
  }

  private persist(): void {
    const wasChanged = this.storageChanged;
    const result = this.storageBlocked ? 'unavailable' : saveNotebookRevision(this.data, this.revision, this.store);
    this.unsaved = this.storageBlocked || result !== 'saved';
    this.storageChanged = result === 'changed';
    if (result === 'saved') this.revision = JSON.stringify(this.data);
    this.messageKey = this.storageBlocked ? 'exp.storageInvalid' : this.storageChanged ? 'exp.storageChanged'
      : this.unsaved ? 'exp.storageUnavailable' : 'exp.saved';
    this.updateMessage();
    if (this.storageChanged && !wasChanged) this.render();
  }

  private updateMessage(): void {
    const status = this.root.querySelector<HTMLElement>('.experiment-message');
    if (status) status.textContent = this.messageKey ? t(this.messageKey) : '';
  }

  private button(key: string, action: () => void, disabled = false): HTMLButtonElement {
    const b = element('button', t(key));
    b.type = 'button'; b.className = 'btn'; b.disabled = disabled;
    b.dataset.focus = key;
    b.addEventListener('click', action);
    return b;
  }

  private textField(key: string, value: string, onInput: (value: string) => void, multiline = false, readOnly = false): HTMLLabelElement {
    const label = element('label');
    label.className = 'experiment-field';
    const input = multiline ? element('textarea') : element('input');
    input.value = value; input.maxLength = multiline ? NOTEBOOK_TEXT_LIMIT : 160;
    input.readOnly = readOnly;
    input.dataset.focus = key;
    if (input instanceof HTMLTextAreaElement) input.rows = 3;
    input.addEventListener('input', () => onInput(input.value));
    label.append(element('span', t(key)), input);
    return label;
  }

  render(): void {
    const active = this.root.contains(document.activeElement) ? document.activeElement as HTMLInputElement | HTMLTextAreaElement : null;
    const focused = active?.dataset.focus;
    const selection = active && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
    this.root.replaceChildren(element('h2', t('exp.title')), element('p', t('exp.intro')));
    const message = element('p'); message.className = 'experiment-message'; message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite');
    this.root.append(message);
    this.updateMessage();
    const toolbar = element('div'); toolbar.className = 'experiment-actions';
    if (this.data.experiments.length) {
      const label = element('label', t('exp.entries'));
      const select = element('select'); select.dataset.focus = 'entries';
      select.setAttribute('aria-label', t('exp.entries'));
      const choose = element('option', t('exp.choose')); choose.value = ''; select.append(choose);
      for (const entry of this.data.experiments) {
        const option = element('option', entry.title); option.value = entry.id;
        option.selected = !this.creating && entry.id === this.selected;
        select.append(option);
      }
      select.addEventListener('change', () => {
        if (!select.value) return;
        this.selected = select.value; this.creating = false; this.deletePending = false; this.render();
      });
      label.append(select); toolbar.append(label);
    }
    toolbar.append(this.button('exp.new', () => { this.creating = true; this.deletePending = false; this.render(); }, this.data.experiments.length >= NOTEBOOK_MAX_ENTRIES));
    toolbar.append(this.button('exp.download', () => downloadBlob(new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' }), 'orbitlab-experiments.json'), !this.data.experiments.length));
    this.root.append(toolbar);
    if (this.data.experiments.length >= NOTEBOOK_MAX_ENTRIES) this.root.append(element('p', t('exp.limit', { count: NOTEBOOK_MAX_ENTRIES })));
    if (this.storageBlocked) this.root.append(this.button('exp.replaceInvalid', () => { this.storageBlocked = false; this.persist(); this.render(); }));
    if (this.storageChanged) this.root.append(this.button('exp.reloadSaved', () => this.reload()));
    const entry = this.data.experiments.find((e) => e.id === this.selected);
    if (this.creating || !entry) this.renderCreate(); else this.renderEntry(entry);
    this.root.append(element('p', t('exp.caution')));
    if (focused) {
      const restored = [...this.root.querySelectorAll<HTMLElement>('[data-focus]')].find((node) => node.dataset.focus === focused);
      (restored ?? this.root).focus({ preventScroll: true });
      if (selection && restored && 'setSelectionRange' in restored && selection[0] !== null && selection[1] !== null) {
        (restored as HTMLInputElement).setSelectionRange(selection[0], selection[1]);
      }
    }
  }

  private renderCreate(): void {
    const form = element('div'); form.className = 'experiment-form';
    form.append(element('h3', t('exp.begin')), element('p', t('exp.beginHelp')));
    form.append(this.textField('exp.name', this.draft.title, (value) => { this.draft.title = value; }));
    form.append(this.textField('exp.prediction', this.draft.prediction, (value) => { this.draft.prediction = value; }, true));
    const label = element('label', t('exp.variable')); label.className = 'experiment-field';
    const select = element('select'); select.dataset.focus = 'variable';
    select.setAttribute('aria-label', t('exp.variable'));
    const source = this.host.capture();
    const available = source ? new Set(missionInputs(source.mission).map((item) => item.path)) : null;
    for (const [path, key] of Object.entries(VARIABLES)) {
      if (available && !available.has(path)) continue;
      const option = element('option', t(key)); option.value = path; option.selected = this.draft.variable === path;
      select.append(option);
    }
    if (select.value) this.draft.variable = select.value;
    select.addEventListener('change', () => { this.draft.variable = select.value; });
    label.append(select); form.append(label);
    form.append(this.button('exp.captureBaseline', () => {
      if (!this.draft.title.trim() || !this.draft.prediction.trim()) {
        this.messageKey = 'exp.required'; this.updateMessage(); return;
      }
      const input = this.host.capture(), baseline = input && captureExperimentRun(input);
      if (!baseline) { this.messageKey = 'exp.noFlight'; this.updateMessage(); return; }
      if (!missionInputs(baseline.mission).some((item) => item.path === this.draft.variable)) {
        this.messageKey = 'exp.variableUnavailable'; this.render(); return;
      }
      if (this.data.experiments.length >= NOTEBOOK_MAX_ENTRIES) return;
      const entry: ExperimentEntry = {
        id: crypto.randomUUID(), createdAt: new Date().toISOString(), title: this.draft.title.trim(),
        prediction: this.draft.prediction.trim(), variable: this.draft.variable, baseline, conclusion: '',
      };
      this.data.experiments.unshift(entry); this.selected = entry.id; this.creating = false;
      this.deletePending = false;
      this.draft = { title: '', prediction: '', variable: 'payloadMass' }; this.persist(); this.render();
    }));
    this.root.append(form);
  }

  private renderEntry(entry: ExperimentEntry): void {
    const section = element('div'); section.className = 'experiment-form';
    section.append(element('h3', entry.title));
    section.append(this.textField('exp.prediction', entry.prediction, (value) => {
      entry.prediction = value;
      if (!value.trim()) { this.unsaved = true; this.messageKey = 'exp.required'; this.updateMessage(); }
      else this.persist();
    }, true, !!entry.trial));
    section.append(element('p', `${t('exp.variable')}: ${inputLabel(entry.variable)}`));
    const inputs = element('details'); inputs.append(element('summary', t('exp.inputs')));
    const pre = element('pre', JSON.stringify(entry.baseline.mission, null, 2)); pre.tabIndex = 0; inputs.append(pre);
    section.append(inputs);
    this.runSummary(section, entry.baseline, 'exp.baseline');
    if (entry.trial) this.runSummary(section, entry.trial, 'exp.trial');
    const actions = element('div'); actions.className = 'experiment-actions';
    actions.append(this.button('exp.restore', () => { this.messageKey = this.host.restoreMission(structuredClone(entry.baseline.mission)) ? 'exp.restored' : 'exp.restoreFailed'; this.updateMessage(); }));
    if (!entry.trial) actions.append(this.button('exp.captureTrial', () => {
      if (!entry.prediction.trim()) { this.messageKey = 'exp.required'; this.updateMessage(); return; }
      const input = this.host.capture(), trial = input && captureExperimentRun(input);
      if (!trial) { this.messageKey = 'exp.noFlight'; this.updateMessage(); return; }
      entry.trial = trial; this.persist(); this.render();
    }));
    if (entry.trial) {
      actions.append(this.button('exp.restoreTrial', () => { this.messageKey = this.host.restoreMission(structuredClone(entry.trial!.mission)) ? 'exp.restored' : 'exp.restoreFailed'; this.updateMessage(); }));
      actions.append(this.button('exp.removeTrial', () => { delete entry.trial; entry.conclusion = ''; this.persist(); this.render(); }));
    }
    section.append(actions);
    const comparison = compareExperiment(entry);
    const notes = element('ul'); notes.className = 'experiment-notices';
    for (const notice of comparison.notices) notes.append(element('li', t(`exp.notice.${notice}`)));
    if (entry.trial && comparison.notices.length === 0) notes.append(element('li', t('exp.singleChange')));
    section.append(notes);
    if (comparison.changes.length) {
      const details = element('details'); details.open = true;
      details.append(element('summary', t('exp.changes', { count: comparison.changes.length })));
      const list = element('ul');
      for (const change of comparison.changes) list.append(element('li', `${inputLabel(change.path)}: ${inputText(change.before, change.path)} → ${inputText(change.after, change.path)}`));
      details.append(list); section.append(details);
    }
    if (entry.trial) {
      section.append(element('h3', t('exp.results')));
      const table = element('table'); const heading = table.createTHead().insertRow();
      for (const key of ['cmp.col.quantity', 'exp.baseline', 'exp.trial', 'cmp.col.delta']) {
        const th = element('th', t(key)); th.scope = 'col'; heading.append(th);
      }
      const body = table.createTBody();
      for (const figure of comparison.figures) {
        const row = body.insertRow(); const th = element('th', figureLabel(figure)); th.scope = 'row'; row.append(th);
        row.append(element('td', formatFigure(figure.reference, figure.unit)), element('td', formatFigure(figure.current, figure.unit)),
          element('td', formatFigure(figure.current === null || figure.reference === null ? null : figure.current - figure.reference, figure.unit, true)));
      }
      const scroll = element('div'); scroll.className = 'experiment-table'; scroll.tabIndex = 0;
      scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', t('exp.results')); scroll.append(table); section.append(scroll);
      section.append(this.textField('exp.conclusion', entry.conclusion, (value) => { entry.conclusion = value; this.persist(); }, true));
    }
    section.append(this.button(this.deletePending ? 'exp.confirmDelete' : 'exp.delete', () => {
      if (!this.deletePending) { this.deletePending = true; this.render(); return; }
      this.data.experiments = this.data.experiments.filter((e) => e.id !== entry.id);
      this.selected = this.data.experiments[0]?.id ?? null; this.creating = !this.selected; this.deletePending = false;
      this.persist(); this.render();
    }));
    if (this.deletePending) section.append(this.button('exp.cancelDelete', () => { this.deletePending = false; this.render(); }));
    if (this.unsaved) section.append(element('p', t('exp.unsaved')));
    this.root.append(section);
  }

  private runSummary(parent: HTMLElement, run: ExperimentRun, labelKey: string): void {
    const group = element('div'); group.className = 'experiment-run';
    group.append(element('h4', t(labelKey)), element('p', run.label), element('p', t('exp.runInfo', {
      count: run.sampleCount, start: run.sampleStart.toFixed(1), end: run.sampleEnd.toFixed(1),
      phase: t(`hud.status.${run.status}`), state: t(run.complete ? 'exp.complete' : 'exp.partial'),
    })));
    group.append(element('p', t('exp.provenance', { app: run.app, clock: run.clock.toFixed(3), t: run.t.toFixed(3), actions: run.actions.length })));
    parent.append(group);
  }
}
