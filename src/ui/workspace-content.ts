import { t } from '../i18n';
import { ExperimentNotebook } from './experiments/notebook';
import { ProjectsPanel } from './projects/projects-panel';
import { ClassroomPanel } from './classroom/classroom-panel';
import { ValidationPanel } from './validation/validation-panel';
import type { WorkHost } from './workspace-host';
import './workspace-dialog.css';

type Tab = 'notebook' | 'validation' | 'classroom' | 'backups';
const TABS: Tab[] = ['notebook', 'validation', 'classroom', 'backups'];

/** Loaded on demand, and included in the offline app's precache. */
export class WorkContent {
  readonly root = document.createElement('div');
  private readonly notebook: ExperimentNotebook;
  private readonly classroom = new ClassroomPanel();
  private readonly validation = new ValidationPanel();
  private readonly projects: ProjectsPanel;
  private readonly buttons = new Map<Tab, HTMLButtonElement>();
  private readonly panels = new Map<Tab, HTMLElement>();
  private active: Tab = 'notebook';

  constructor(host: WorkHost) {
    this.root.className = 'work-content';
    this.notebook = new ExperimentNotebook(host);
    this.projects = new ProjectsPanel(host);
    const tabs = document.createElement('div');
    tabs.className = 'work-tabs';
    tabs.setAttribute('role', 'tablist');
    for (const tab of TABS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = `work-tab-${tab}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', `work-panel-${tab}`);
      button.addEventListener('click', () => this.select(tab));
      button.addEventListener('keydown', (event) => {
        const at = TABS.indexOf(tab);
        const next = event.key === 'ArrowRight' ? (at + 1) % TABS.length
          : event.key === 'ArrowLeft' ? (at + TABS.length - 1) % TABS.length
            : event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : null;
        if (next === null) return;
        event.preventDefault();
        this.select(TABS[next]);
        this.buttons.get(TABS[next])!.focus();
      });
      this.buttons.set(tab, button);
      tabs.append(button);
      const panel = document.createElement('div');
      panel.id = `work-panel-${tab}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id);
      this.panels.set(tab, panel);
    }
    this.panels.get('notebook')!.append(this.notebook.root);
    this.panels.get('validation')!.append(this.validation.section());
    this.panels.get('classroom')!.append(this.classroom.section());
    this.panels.get('backups')!.append(this.projects.section());
    this.root.append(tabs, ...this.panels.values());
    this.applyLanguage();
  }

  applyLanguage(): void {
    this.root.querySelector('[role="tablist"]')!.setAttribute('aria-label', t('work.title'));
    for (const [tab, button] of this.buttons) button.textContent = t(`work.${tab}`);
    this.select(this.active);
  }

  private select(tab: Tab): void {
    this.active = tab;
    for (const [id, button] of this.buttons) {
      button.setAttribute('aria-selected', String(id === tab));
      button.tabIndex = id === tab ? 0 : -1;
      this.panels.get(id)!.hidden = id !== tab;
    }
    if (tab === 'notebook') this.notebook.render();
    else if (tab === 'validation') this.validation.refresh();
    else if (tab === 'classroom') this.classroom.refresh();
    else this.projects.refresh();
  }
}
