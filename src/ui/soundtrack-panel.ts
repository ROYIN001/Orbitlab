/**
 * The viewer's "Launch audio" section (roadmap V01): which launches play a
 * real broadcast, and a place to add a recording of your own to any of them —
 * kept in this browser only, with the second of the recording at which the
 * rocket lifts off.
 */
import { t, getLang } from '../i18n';
import { WATCH_MISSIONS, type WatchMissionId } from './watch-missions';
import { VEHICLES } from '../data/vehicles';
import { bundledFor, loadUserSoundtrack, removeUserSoundtrack, saveUserSoundtrack } from '../audio/soundtrack';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** "1:07:18", "67:18" or "4038.5" → seconds; null if it is none of those. */
export function parseOffset(text: string): number | null {
  const parts = text.trim().split(':');
  if (!parts.length || parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

export function formatOffset(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const ss = (sec < 10 ? '0' : '') + (Number.isInteger(sec) ? String(sec) : sec.toFixed(1));
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** The listing's line for a launch with no recording of the user's: its bundled recording for the page's language, or the simulated sound. */
function bundledStatus(id: WatchMissionId): string {
  const b = bundledFor(id, getLang());
  if (b) return t(b.statusKey, { flight: b.flight });
  // a Russian rocket on a page in Russian: Russian launch control's calls
  const vehicle = WATCH_MISSIONS.find((m) => m.id === id)?.vehicleId ?? '';
  return getLang() === 'ru' && VEHICLES.find((v) => v.id === vehicle)?.country === 'RU' ? t('snd.ruCalls') : t('snd.synth');
}

export class SoundtrackPanel {
  constructor(private readonly onChange: (id: WatchMissionId) => void) {}

  render(): HTMLElement {
    const box = el('section', 'watch-audio');
    box.append(el('h3', undefined, t('snd.title')), el('p', 'watch-audio-note', t('snd.note')));
    const list = el('div', 'watch-audio-list');
    for (const m of WATCH_MISSIONS) {
      const row = el('div', 'watch-audio-row');
      row.dataset.mission = m.id;
      const name = el('strong', undefined, t(m.titleKey));
      const status = el('span', 'watch-audio-status');
      // the line is cut short in the list: the whole of it on hover
      const setStatus = (text: string) => { status.textContent = text; status.title = text; };
      setStatus(bundledStatus(m.id));
      const add = el('button', 'watch-audio-btn', t('snd.add'));
      add.type = 'button';
      const input = el('input');
      input.type = 'file';
      input.accept = 'audio/*,video/mp4,video/webm';
      input.hidden = true;
      const t0Field = el('label', 'watch-audio-t0');
      const t0Input = el('input');
      t0Input.type = 'text';
      t0Input.inputMode = 'decimal';
      t0Input.value = '0:00';
      t0Input.size = 7;
      t0Input.setAttribute('aria-label', t('snd.t0'));
      t0Field.append(el('span', undefined, t('snd.t0')), t0Input);
      const remove = el('button', 'watch-audio-btn', t('snd.remove'));
      remove.type = 'button';
      remove.hidden = true;
      void loadUserSoundtrack(m.id).then((mine) => {
        if (!mine) return;
        setStatus(t('snd.mine', { name: mine.name }));
        t0Input.value = formatOffset(mine.t0);
        remove.hidden = false;
      });
      add.addEventListener('click', () => input.click());
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        input.value = '';
        if (!file) return;
        const t0 = parseOffset(t0Input.value);
        if (t0 === null) { setStatus(t('snd.badT0')); return; }
        await saveUserSoundtrack(m.id, file, file.name, t0);
        setStatus(t('snd.mine', { name: file.name }));
        remove.hidden = false;
        this.onChange(m.id);
      });
      remove.addEventListener('click', async () => {
        await removeUserSoundtrack(m.id);
        setStatus(bundledStatus(m.id));
        remove.hidden = true;
        this.onChange(m.id);
      });
      row.append(name, status, t0Field, add, remove, input);
      list.append(row);
    }
    box.append(list);
    return box;
  }
}
