/**
 * Offline or online (roadmap S04): whether the app may reach the internet.
 * The owner's choice (2026-09-26) makes offline the default — a fresh install
 * on a closed intranet or a classroom laptop sends no request outside until
 * someone switches it: no data, and not the web fonts either
 * (src/ui/web-fonts.ts) — and the choice is the user's, kept in this browser.
 *
 * Offline, datasets come from the snapshots bundled with the build, each
 * marked "data as of". Online, they are fetched from their sources and fall
 * back to the snapshot on any failure (`src/provider/data-provider.ts`).
 */
export type DataMode = 'offline' | 'online';
export const DATA_MODES: readonly DataMode[] = ['offline', 'online'];
export const DEFAULT_DATA_MODE: DataMode = 'offline';
export const DATA_MODE_KEY = 'orbitlab.dataMode';

export interface DataModeStore { getItem(key: string): string | null; setItem(key: string, value: string): void }

export function loadDataMode(store?: DataModeStore): DataMode {
  try {
    const value = (store ?? localStorage).getItem(DATA_MODE_KEY);
    return DATA_MODES.includes(value as DataMode) ? value as DataMode : DEFAULT_DATA_MODE;
  } catch { return DEFAULT_DATA_MODE; }
}

export function saveDataMode(mode: DataMode, store?: DataModeStore): void {
  try { (store ?? localStorage).setItem(DATA_MODE_KEY, mode); } catch { /* preference is optional */ }
}
