/**
 * The in-viewport HUD card has three states, and the rules that govern them are
 * the sort of thing that rots silently inside a DOM class: a cycle that skips a
 * state on a phone, a stored value from an older build, a `localStorage` that
 * throws in a private window. So the state machine lives here, with no DOM and
 * no `window` in sight, and `src/ui/hud.ts` is left with the drawing.
 *
 * - `compact` — the default, and the only mode a phone-width viewport offers:
 *   a small card with the flight essentials, docked clear of the vehicle.
 * - `full` — the complete instrument grid (what the HUD used to always be).
 * - `hidden` — nothing but the toggle chip; the picture wins outright.
 *
 * Nothing is lost in `compact` or `hidden`: the telemetry panel beside the
 * viewport carries every readout at all times.
 */

export type HudMode = 'compact' | 'full' | 'hidden';

export const HUD_MODES: readonly HudMode[] = ['compact', 'full', 'hidden'];

/** Where the choice is remembered. */
export const HUD_MODE_STORAGE_KEY = 'orbitlab.hudMode';

/** The two `Storage` methods this module uses, so a test needs no DOM. */
export interface ModeStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isHudMode(value: unknown): value is HudMode {
  return typeof value === 'string' && (HUD_MODES as readonly string[]).includes(value);
}

/**
 * Force a mode the current viewport can actually offer.
 *
 * A phone-width viewport has no room for the 21-row grid — the card would be
 * most of the frame — so `full` degrades to `compact` rather than being drawn
 * badly. `hidden` is honoured everywhere: it is a request for the picture.
 */
export function coerceHudMode(mode: HudMode, phone: boolean): HudMode {
  return phone && mode === 'full' ? 'compact' : mode;
}

/**
 * Next mode in the cycle: compact → full → hidden → compact, with `full`
 * skipped on a phone (compact → hidden → compact).
 *
 * A mode the viewport cannot offer is coerced *before* stepping, so pressing
 * the toggle after a resize continues from what is on screen rather than from
 * the stored preference.
 */
export function nextHudMode(mode: HudMode, phone: boolean): HudMode {
  const from = coerceHudMode(mode, phone);
  if (from === 'compact') return phone ? 'hidden' : 'full';
  if (from === 'full') return 'hidden';
  return 'compact';
}

/**
 * The remembered mode, or `compact` on a first visit.
 *
 * Every access is guarded: reading `localStorage` throws outright in a browser
 * configured to block site data, and a stored value can be anything at all —
 * a key left by an older build, or one edited by hand.
 */
export function loadHudMode(store: ModeStore | null | undefined, phone: boolean): HudMode {
  let stored: string | null = null;
  try {
    stored = store ? store.getItem(HUD_MODE_STORAGE_KEY) : null;
  } catch {
    stored = null;
  }
  return coerceHudMode(isHudMode(stored) ? stored : 'compact', phone);
}

/** Remember the mode. A storage that refuses is not an error worth reporting. */
export function saveHudMode(store: ModeStore | null | undefined, mode: HudMode): void {
  try {
    store?.setItem(HUD_MODE_STORAGE_KEY, mode);
  } catch {
    /* private window, or site data blocked: the choice lasts this session */
  }
}
