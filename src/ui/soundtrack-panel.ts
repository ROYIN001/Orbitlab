/**
 * The viewer's "Launch audio" section (roadmap V01): which launches play a
 * real broadcast, and a place to add a recording of your own to any of them —
 * kept in this browser only, with the second of the recording at which the
 * rocket lifts off.
 */
import { t } from '../i18n';
import { WATCH_MISSIONS, type WatchMissionId } from './watch-missions';
import { BUNDLED_SOUNDTRACKS, loadUserSoundtrack, removeUserSoundtrack, saveUserSoundtrack } from '../audio/soundtrack';

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
  const seconds = parts.reduce((acc, p) => acc * 60 + Number(p), 0);
  return Number.isFinite(seconds) ? seconds : null;
}

export function formatOffset(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const ss = (sec < 10 ? '0' : '') + (Number.isInteger(sec) ? String(sec) : sec.toFixed(1));
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
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
      const status = el('span', 'watch-audio-status', BUNDLED_SOUNDTRACKS[m.id] ? t('snd.bundled', { flight: BUNDLED_SOUNDTRACKS[m.id]!.flight }) : t('snd.synth'));
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
      let mine: Awaited<ReturnType<typeof loadUserSoundtrack>> = null;
      let edited = false, revision = 0;
      const showTrack = () => {
        status.textContent = mine ? t('snd.mine', { name: mine.name })
          : BUNDLED_SOUNDTRACKS[m.id] ? t('snd.bundled', { flight: BUNDLED_SOUNDTRACKS[m.id]!.flight }) : t('snd.synth');
        remove.hidden = !mine;
      };
      // Serialize changes with the initial read and with one another: a slow
      // offset save must never restore a recording after Remove/replacement.
      let pending = loadUserSoundtrack(m.id).then((stored) => {
        mine = stored;
        if (!edited && mine) t0Input.value = formatOffset(mine.t0);
        if (revision === 0) showTrack();
      });
      const enqueue = (action: () => Promise<void>) => {
        const actionRevision = revision;
        pending = pending.then(async () => {
          await action();
          if (revision === actionRevision) showTrack();
        }).catch(() => {
          if (revision === actionRevision) status.textContent = t('snd.saveFailed');
        });
      };
      const readOffset = () => {
        edited = true;
        revision++;
        const t0 = parseOffset(t0Input.value);
        if (t0 === null) status.textContent = t('snd.badT0');
        return t0;
      };
      t0Input.addEventListener('input', () => { edited = true; });
      t0Input.addEventListener('change', () => {
        const t0 = readOffset();
        if (t0 === null) return;
        enqueue(async () => {
          if (!mine || mine.t0 === t0) return; // a new upload's offset remains a draft
          await saveUserSoundtrack(m.id, mine.blob, mine.name, t0);
          mine = { ...mine, t0 };
          this.onChange(m.id);
        });
      });
      add.addEventListener('click', () => input.click());
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        input.value = '';
        if (!file) return;
        const t0 = readOffset();
        if (t0 === null) return;
        enqueue(async () => {
          await saveUserSoundtrack(m.id, file, file.name, t0);
          mine = { id: m.id, blob: file, name: file.name, t0 };
          this.onChange(m.id);
        });
      });
      remove.addEventListener('click', () => {
        revision++;
        enqueue(async () => {
          await removeUserSoundtrack(m.id);
          mine = null;
          this.onChange(m.id);
        });
      });
      row.append(name, status, t0Field, add, remove, input);
      list.append(row);
    }
    box.append(list);
    return box;
  }
}
