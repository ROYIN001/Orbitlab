import { BUILD } from '../../build-info';
import { REPO_URL } from '../../credits';
import { t } from '../../i18n';
import { KNOWN_SCIENTIFIC_DISCREPANCIES, SCIENTIFIC_BASELINE, type RunnerOutcome, type ScientificValidationReport } from '../../validation/report';
import { readScientificReport, ReportReadError, VALIDATION_REPORT_MAX_BYTES } from '../../validation/read-report';
import { button, el } from '../orbit/dom';
import './validation.css';

/** Local inspection only: imported strings become text, never links or markup. */
export class ValidationPanel {
  readonly root = el('section', 'validation-panel');
  private report: ScientificValidationReport | null = null;
  private busy = false;
  private message: string | null = null;

  constructor() {
    this.root.id = 'scientific-validation';
    this.root.setAttribute('aria-labelledby', 'scientific-validation-title');
  }
  section(): HTMLElement { this.refresh(); return this.root; }
  refresh(): void { this.render(); }

  async openFile(file: File): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.report = null;
    this.message = 'validation.loading';
    this.render();
    try {
      if (file.size > VALIDATION_REPORT_MAX_BYTES) throw new ReportReadError('size');
      this.report = readScientificReport(await file.text());
      this.message = 'validation.loaded';
    } catch (error) {
      this.message = error instanceof ReportReadError ? `validation.error.${error.code}` : 'validation.error.file';
    } finally {
      this.busy = false;
      this.render();
      this.root.querySelector<HTMLButtonElement>('#btn-validation-report-open')?.focus();
    }
  }

  private render(): void {
    const title = el('h2', '', t('validation.title'));
    title.id = 'scientific-validation-title';
    const build = el('p', 'validation-code', t('validation.build', { version: BUILD.version, commit: BUILD.commit }));
    const baseline = el('div', 'validation-card');
    baseline.append(el('h3', '', t('validation.baseline')),
      el('p', 'validation-code', t('validation.baselineStamp', SCIENTIFIC_BASELINE)),
      el('p', '', t('validation.historical')));
    const issues = el('ul', 'validation-issues');
    for (const issue of KNOWN_SCIENTIFIC_DISCREPANCIES) {
      const row = el('li');
      row.append(el('strong', '', issue.id), el('p', '', t(`validation.issue.${issue.id}`)));
      // Only compiled-in repository paths and commit are used. Report URLs are never made clickable.
      const link = el('a', '', t('validation.source', { id: issue.id }));
      link.href = `${REPO_URL}/blob/${SCIENTIFIC_BASELINE.commit}/${issue.sources[0]}`;
      link.target = '_blank'; link.rel = 'noopener noreferrer';
      row.append(link); issues.append(row);
    }
    baseline.append(issues);
    const actions = el('div', 'validation-actions');
    const file = el('input');
    file.id = 'validation-report-file'; file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true;
    file.addEventListener('change', () => {
      const selected = file.files?.[0]; file.value = '';
      if (selected) void this.openFile(selected);
    });
    const open = button('ghost-button', t('validation.open'), () => file.click());
    open.id = 'btn-validation-report-open'; open.disabled = this.busy;
    actions.append(open, file);
    if (this.report) actions.append(button('ghost-button', t('validation.clear'), () => {
      this.report = null; this.message = null; this.render();
      this.root.querySelector<HTMLButtonElement>('#btn-validation-report-open')?.focus();
    }));
    const status = el('p', 'validation-status', this.message ? t(this.message) : '');
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    this.root.replaceChildren(title, el('p', '', t('validation.intro')), build, baseline,
      el('h3', '', t('validation.localTitle')), el('p', '', t('validation.localNote')), actions, status);
    if (this.report) this.root.append(this.reportView(this.report));
  }

  private reportView(report: ScientificValidationReport): HTMLElement {
    const box = el('section', 'validation-card');
    box.setAttribute('aria-label', t('validation.imported'));
    const p = report.provenance;
    box.append(el('h3', '', t('validation.imported')), el('p', 'validation-notice', t('validation.unverified')),
      el('p', '', t('validation.generated', { date: report.generatedAt })),
      el('p', 'validation-code', t('validation.testedCommit', { commit: p.commit })),
      el('p', '', t('validation.dirty', { value: t(`validation.${p.workingTreeDirty ? 'yes' : 'no'}`) })),
      el('p', '', t('validation.stable', { value: t(`validation.${p.sourceStable ? 'yes' : 'no'}`) })),
      el('p', 'validation-code', t('validation.digest', { digest: p.sourceDigest })),
      el('p', '', t('validation.buildComparison')));
    box.append(this.runnerView('validation.regression', report.regression), this.runnerView('validation.collection', report.collection),
      el('h4', '', t('validation.referenceTitle')),
      el('p', '', t('validation.referenceCounts', report.referenceSummary)),
      el('p', 'validation-note', t('validation.separate')));
    const list = el('ul', 'validation-reference-list');
    for (const row of report.references) {
      const item = el('li');
      item.append(el('strong', '', row.id), el('span', '', t(`validation.reference.${row.status}`)));
      if (row.observed !== null && row.expected !== null) item.append(el('p', '', t('validation.measurement', { observed: row.observed, expected: row.expected })));
      list.append(item);
    }
    box.append(list);
    const details = el('details', 'validation-report-details');
    details.append(el('summary', '', t('validation.reportDetails')), el('p', '', report.scope));
    const limits = el('ul');
    for (const limitation of report.limitations) limits.append(el('li', '', limitation));
    details.append(limits);
    box.append(details);
    return box;
  }

  private runnerView(key: string, runner: RunnerOutcome): HTMLElement {
    const block = el('div', 'validation-runner');
    block.append(el('h4', '', t(key)), el('p', '', t('validation.runner', {
      status: t(`validation.runner.${runner.status}`), passed: runner.passed, failed: runner.failed,
      skipped: runner.skipped, todo: runner.todo, total: runner.total,
    })));
    return block;
  }
}
