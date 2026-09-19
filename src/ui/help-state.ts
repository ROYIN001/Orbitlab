/** Version the preference separately from mission data and language settings. */
export const GUIDE_STORAGE_KEY = 'orbitlab.guide.v1';
export const GUIDE_STEPS = 3;

export interface GuideStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Optional guidance must remain usable when browser storage is unavailable. */
export class GuideProgress {
  step = 0;
  visible = true;

  constructor(private store: GuideStore | null) {
    try { this.visible = store?.getItem(GUIDE_STORAGE_KEY) !== 'dismissed'; } catch { /* show this session */ }
  }

  next(): void {
    if (this.step < GUIDE_STEPS - 1) this.step++;
    else this.dismiss();
  }

  previous(): void { this.step = Math.max(0, this.step - 1); }

  dismiss(): void {
    this.visible = false;
    try { this.store?.setItem(GUIDE_STORAGE_KEY, 'dismissed'); } catch { /* keep the in-session dismissal */ }
  }

  /** Reopening Help is a deliberate request, even if first-use tips were dismissed. */
  restart(): void { this.step = 0; this.visible = true; }
}
