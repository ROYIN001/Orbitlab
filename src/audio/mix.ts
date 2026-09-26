/**
 * The listener's mix: how loud the rocket is (the synthesised roar and its
 * one-shot sounds) and how loud the voices are (a broadcast recording and
 * launch control's calls), and whether launch control speaks at all. Kept
 * for the next visit.
 */
const STORE_KEY = 'orbitlab.soundMix';

export interface SoundMix {
  /** the rocket, 0–1 */
  engine: number;
  /** recordings and calls, 0–1 */
  voice: number;
  /** launch control's synthesised calls where no recording speaks */
  callouts: boolean;
}

export const DEFAULT_MIX: SoundMix = { engine: 1, voice: 1, callouts: true };

const unit = (x: unknown, d: number): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : d);

export function loadMix(store?: Pick<Storage, 'getItem'>): SoundMix {
  try {
    const raw = JSON.parse((store ?? localStorage).getItem(STORE_KEY) ?? 'null') as Partial<SoundMix> | null;
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_MIX };
    return {
      engine: unit(raw.engine, DEFAULT_MIX.engine),
      voice: unit(raw.voice, DEFAULT_MIX.voice),
      callouts: typeof raw.callouts === 'boolean' ? raw.callouts : DEFAULT_MIX.callouts,
    };
  } catch { return { ...DEFAULT_MIX }; }
}

export function saveMix(mix: SoundMix, store?: Pick<Storage, 'setItem'>): void {
  try { (store ?? localStorage).setItem(STORE_KEY, JSON.stringify(mix)); } catch { /* storage off */ }
}

/**
 * A slider's position to a gain: the ear hears level logarithmically, so the
 * slider runs over about 40 dB with a cubic taper rather than straight.
 */
export function sliderGain(x: number): number {
  const u = Math.max(0, Math.min(1, x));
  return u * u * u;
}
