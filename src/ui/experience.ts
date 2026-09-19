/** A presentation preference only. It never changes a mission or HUD layout. */
export type ExperienceMode = 'learning' | 'advanced';
export const EXPERIENCE_STORAGE_KEY = 'orbitlab.experience';
export interface ExperienceStore { getItem(key: string): string | null; setItem(key: string, value: string): void }

export function loadExperience(store?: ExperienceStore): ExperienceMode {
  try {
    const value = (store ?? localStorage).getItem(EXPERIENCE_STORAGE_KEY);
    return value === 'advanced' ? 'advanced' : 'learning';
  } catch { return 'learning'; }
}

export function saveExperience(mode: ExperienceMode, store?: ExperienceStore): void {
  try { (store ?? localStorage).setItem(EXPERIENCE_STORAGE_KEY, mode); } catch { /* preference is optional */ }
}
