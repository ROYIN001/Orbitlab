import { getLang, onLangChange } from '../i18n';
import { Modal } from './dialogs';
import { HELP_COPY } from './help-content';
import { GuideProgress, GUIDE_STEPS, type GuideStore } from './help-state';
import './help.css';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function store(): GuideStore | null {
  try { return window.localStorage; } catch { return null; }
}

class HelpDialog extends Modal {
  constructor(dialog: HTMLDialogElement, private restart: () => void) {
    super(dialog);
    // The app's flight shortcuts must not act while the reader uses this dialog.
    dialog.addEventListener('keydown', (event) => event.stopPropagation());
  }

  applyLanguage(): void {
    super.applyLanguage();
    const restartHadFocus = this.body.querySelector('.help-restart') === document.activeElement;
    const copy = HELP_COPY[getLang()];
    this.el.setAttribute('aria-labelledby', 'help-dialog-title');
    this.el.setAttribute('aria-describedby', 'help-dialog-intro');
    const title = el('h2', copy.title); title.id = 'help-dialog-title';
    const intro = el('p', copy.intro, 'lead'); intro.id = 'help-dialog-intro';
    this.body.replaceChildren(title, intro);
    const steps = el('ol');
    for (const step of copy.steps) {
      const item = el('li');
      item.append(el('strong', `${step.title}. `), document.createTextNode(step.text));
      steps.append(item);
    }
    this.body.append(steps);
    for (const topic of copy.topics) this.body.append(el('h3', topic.title), el('p', topic.text));
    const glossary = el('dl', undefined, 'help-glossary');
    for (const term of copy.glossary) glossary.append(el('dt', term.title), el('dd', term.text));
    this.body.append(el('h3', copy.glossaryTitle), glossary);
    const restart = el('button', copy.restart, 'btn help-restart');
    restart.type = 'button';
    restart.addEventListener('click', () => { this.restart(); this.close(); });
    this.body.append(restart);
    if (restartHadFocus) restart.focus({ preventScroll: true });
  }
}

/**
 * Optional first-use guidance. Construction never opens a modal, steals focus,
 * changes the mission or starts/stops a flight. Help remains available after
 * skipping; its content and controls follow the app's current language.
 */
export class HelpGuide {
  private progress: GuideProgress;
  private dialog: HelpDialog;
  private stepLabel = el('span', undefined, 'help-guide-progress');
  private title = el('h2');
  private description = el('p');
  private previous = el('button');
  private next = el('button', undefined, 'help-guide-next');
  private skip = el('button');
  private more = el('button');
  private buttonText = el('span');

  constructor(private host: HTMLElement, private button: HTMLButtonElement, storage: GuideStore | null = store()) {
    this.progress = new GuideProgress(storage);
    this.host.classList.add('help-guide');
    this.host.setAttribute('role', 'region');
    const copy = el('div', undefined, 'help-guide-copy');
    copy.setAttribute('aria-live', 'polite');
    copy.setAttribute('aria-atomic', 'true');
    copy.append(this.stepLabel, this.title, this.description);
    const actions = el('div', undefined, 'help-guide-actions');
    for (const action of [this.previous, this.next, this.more, this.skip]) action.type = 'button';
    actions.append(this.previous, this.next, this.more, this.skip);
    this.host.replaceChildren(copy, actions);
    const dialog = el('dialog', undefined, 'dialog help-dialog');
    dialog.id = 'help-dialog';
    document.body.append(dialog);
    this.dialog = new HelpDialog(dialog, () => this.restart());
    const icon = el('span', '?'); icon.setAttribute('aria-hidden', 'true');
    this.button.type = 'button';
    this.button.replaceChildren(icon, this.buttonText);
    this.button.addEventListener('click', () => this.dialog.open(this.button));
    this.more.addEventListener('click', () => this.dialog.open(this.more));
    this.previous.addEventListener('click', () => {
      this.progress.previous();
      this.applyLanguage();
      if (this.previous.disabled) this.next.focus({ preventScroll: true });
    });
    this.next.addEventListener('click', () => {
      this.progress.next();
      this.applyLanguage();
      if (!this.progress.visible) this.button.focus({ preventScroll: true });
    });
    this.skip.addEventListener('click', () => {
      this.progress.dismiss();
      this.applyLanguage();
      this.button.focus({ preventScroll: true });
    });
    onLangChange(() => this.applyLanguage());
    this.applyLanguage();
  }

  get isOpen(): boolean { return this.dialog.isOpen; }

  restart(): void { this.progress.restart(); this.applyLanguage(); }

  applyLanguage(): void {
    const copy = HELP_COPY[getLang()];
    const step = copy.steps[this.progress.step];
    this.host.hidden = !this.progress.visible;
    this.host.setAttribute('aria-label', copy.guideLabel);
    this.stepLabel.textContent = copy.progress.replace('{step}', String(this.progress.step + 1));
    this.title.textContent = step.title;
    this.description.textContent = step.text;
    this.previous.textContent = copy.previous;
    this.previous.disabled = this.progress.step === 0;
    this.next.textContent = this.progress.step === GUIDE_STEPS - 1 ? copy.done : copy.next;
    this.skip.textContent = copy.skip;
    this.more.textContent = copy.more;
    this.buttonText.textContent = copy.button;
    this.button.title = copy.button;
    this.button.setAttribute('aria-label', copy.button);
    if (this.dialog.isOpen) this.dialog.applyLanguage();
  }
}
