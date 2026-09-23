/**
 * Which face of the application is showing.
 *
 * One app, one scene, one simulation: a mode only decides how much of the
 * interface is on screen and who is driving. `home` is the landing page over
 * the live scene, `watch` is the lean-back launch viewer for someone with no
 * background in spaceflight, `explore` is the mission builder in its learning
 * layout and `engineer` is the full workspace (every guidance parameter, the
 * telemetry panel, 6-DOF controls).
 *
 * The mode is carried in the URL hash (`#/watch`), so a mode can be linked to
 * and the browser's back button moves between them, and the last working mode
 * is remembered for the next visit.
 */
export type AppMode = 'home' | 'watch' | 'explore' | 'engineer';
export const APP_MODES: readonly AppMode[] = ['home', 'watch', 'explore', 'engineer'];
export const MODE_STORAGE_KEY = 'orbitlab.mode';
export interface ModeStore { getItem(key: string): string | null; setItem(key: string, value: string): void }

const isMode = (value: string | null | undefined): value is AppMode => APP_MODES.includes(value as AppMode);

/**
 * The mode a location hash names, or null for any other hash.
 *
 * `#/watch` is the canonical form; a bare `#watch` is accepted too. Anything
 * else — including the in-page anchors the narrow layout uses (`#setup`,
 * `#viewport`, `#telemetry`) — is not a mode and must leave the mode alone.
 */
export function modeFromHash(hash: string): AppMode | null {
  const name = hash.replace(/^#\/?/, '').toLowerCase();
  return isMode(name) ? name : null;
}

export function hashForMode(mode: AppMode): string {
  return `#/${mode}`;
}

/**
 * The mode to open with: the hash wins, then the last working mode.
 *
 * Only the two workspace modes are remembered. `watch` needs a mission picked
 * before it shows anything, so a returning viewer lands on the home page, which
 * leads to it in one press, rather than on an empty viewer.
 */
export function initialMode(hash: string, store?: ModeStore): AppMode {
  const fromHash = modeFromHash(hash);
  if (fromHash) return fromHash;
  const stored = loadMode(store);
  return stored === 'explore' || stored === 'engineer' ? stored : 'home';
}

export function loadMode(store?: ModeStore): AppMode | null {
  try {
    const value = (store ?? localStorage).getItem(MODE_STORAGE_KEY);
    return isMode(value) ? value : null;
  } catch { return null; }
}

export function saveMode(mode: AppMode, store?: ModeStore): void {
  try { (store ?? localStorage).setItem(MODE_STORAGE_KEY, mode); } catch { /* preference is optional */ }
}

/** The mission builder's layout for a workspace mode. */
export function experienceForMode(mode: AppMode): 'learning' | 'advanced' | null {
  return mode === 'engineer' ? 'advanced' : mode === 'explore' ? 'learning' : null;
}
