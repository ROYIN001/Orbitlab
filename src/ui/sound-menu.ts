/**
 * The sound menu by the ♪ button: the rocket's loudness, the voices'
 * loudness (a broadcast recording and launch control's calls), and whether
 * launch control speaks where no recording does. Kept for the next visit
 * (`audio/mix.ts`).
 */
import { t } from '../i18n';
import type { SoundMix } from '../audio/mix';

export class SoundMenu {
  private readonly menu: HTMLDivElement;
  private readonly title: HTMLElement;
  private readonly engineLabel: HTMLElement;
  private readonly voiceLabel: HTMLElement;
  private readonly calloutsLabel: HTMLElement;
  private readonly note: HTMLElement;
  private readonly engine: HTMLInputElement;
  private readonly voice: HTMLInputElement;

  constructor(
    private readonly button: HTMLButtonElement,
    mix: SoundMix,
    private readonly onChange: (m: Partial<SoundMix>) => void,
    /** a line under the controls: which language launch control speaks, or that the browser has no voice for it */
    private readonly status: () => string,
  ) {
    this.menu = document.createElement('div');
    this.menu.className = 'sound-menu';
    this.menu.id = 'sound-menu';
    this.menu.hidden = true;
    this.menu.setAttribute('role', 'group');
    this.title = document.createElement('div');
    this.title.className = 'frames-menu-title';
    this.title.id = 'sound-menu-title';
    this.menu.setAttribute('aria-labelledby', this.title.id);
    const slider = (value: number, key: keyof Pick<SoundMix, 'engine' | 'voice'>): [HTMLLabelElement, HTMLElement, HTMLInputElement] => {
      const row = document.createElement('label');
      row.className = 'sound-menu-row';
      const name = document.createElement('span');
      const input = document.createElement('input');
      input.type = 'range';
      input.min = '0';
      input.max = '100';
      input.step = '1';
      input.value = String(Math.round(value * 100));
      input.id = `sound-${key}`;
      input.addEventListener('input', () => this.onChange({ [key]: Number(input.value) / 100 }));
      row.append(name, input);
      return [row, name, input];
    };
    const [engineRow, engineLabel, engine] = slider(mix.engine, 'engine');
    const [voiceRow, voiceLabel, voice] = slider(mix.voice, 'voice');
    const calloutsRow = document.createElement('label');
    calloutsRow.className = 'frames-menu-row';
    const callouts = document.createElement('input');
    callouts.type = 'checkbox';
    callouts.id = 'sound-callouts';
    callouts.checked = mix.callouts;
    callouts.addEventListener('change', () => { this.onChange({ callouts: callouts.checked }); this.applyLanguage(); });
    const calloutsLabel = document.createElement('span');
    calloutsRow.append(callouts, calloutsLabel);
    this.note = document.createElement('p');
    this.note.className = 'frames-menu-note';
    this.menu.append(this.title, engineRow, voiceRow, calloutsRow, this.note);
    this.engineLabel = engineLabel; this.voiceLabel = voiceLabel; this.calloutsLabel = calloutsLabel;
    this.engine = engine; this.voice = voice;
    button.after(this.menu);
    button.setAttribute('aria-haspopup', 'true');
    button.setAttribute('aria-controls', this.menu.id);
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => this.setOpen(!!this.menu.hidden));
    document.addEventListener('pointerdown', (e) => {
      if (this.menu.hidden) return;
      const target = e.target as Node;
      if (!this.menu.contains(target) && !button.contains(target)) this.setOpen(false);
    });
    this.menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this.setOpen(false); button.focus(); }
    });
    this.applyLanguage();
  }

  applyLanguage(): void {
    this.title.textContent = t('snd.mix');
    this.engineLabel.textContent = t('snd.mix.engine');
    this.voiceLabel.textContent = t('snd.mix.voice');
    this.calloutsLabel.textContent = t('snd.mix.callouts');
    this.engine.setAttribute('aria-label', t('snd.mix.engine'));
    this.voice.setAttribute('aria-label', t('snd.mix.voice'));
    this.note.textContent = this.status();
  }

  private setOpen(open: boolean): void {
    this.menu.hidden = !open;
    this.button.setAttribute('aria-expanded', String(open));
    if (open) { this.applyLanguage(); this.engine.focus(); }
  }
}
