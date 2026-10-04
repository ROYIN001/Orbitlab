/**
 * R2.3: which telemetry cards the Engineer panel shows.
 *
 * The first step of a customisable workspace (PLAN.md R2.3): choose the data
 * on screen from presets — Flight, Dynamics, Orbit — or pick the cards one by
 * one. Docking/resizing windows comes later and extends the instrument card's
 * existing layout controller (`./hudlayout.ts`) rather than adding a second
 * window manager.
 *
 * Only the panel's *cards* are chosen here. The mission clock, the live/replay
 * state, the playback and flight commands, the event log and the export
 * buttons are not cards and can never be hidden by a layout. A hidden card is
 * not frozen either: when it comes back it is drawn from the frame on screen.
 *
 * The choice is a personal preference, stored per learner profile under a
 * versioned key; anything unreadable falls back to the default (every card).
 */
import { CHART_IDS } from './telemetry-charts';

export const TELEMETRY_LAYOUT_KEY = 'orbitlab.telemetryLayout';
export const TELEMETRY_LAYOUT_VERSION = 1;

/** The charts, then the lists: the Δv losses, the flight plan and the spent stages. */
export const CARD_IDS = [...CHART_IDS, 'losses', 'plan', 'debris'] as const;
export type CardId = (typeof CARD_IDS)[number];

export const PRESET_IDS = ['all', 'flight', 'dynamics', 'orbit', 'custom'] as const;
export type PresetId = (typeof PRESET_IDS)[number];

/** The cards of each fixed preset. */
export const PRESETS: Readonly<Record<Exclude<PresetId, 'custom'>, readonly CardId[]>> = {
  all: CARD_IDS,
  // the ascent as it is flown: where the vehicle is, how hard the air pushes, the plan
  flight: ['altitude', 'velocity', 'q', 'g', 'plan'],
  // the vehicle's dynamics: loads, attitude, mass and where the Δv goes
  dynamics: ['q', 'g', 'pitch', 'mass', 'losses'],
  // the orbit being built and what is left to build it with
  orbit: ['apsides', 'dv', 'altitude', 'plan', 'debris'],
};

export interface TelemetryLayout {
  version: typeof TELEMETRY_LAYOUT_VERSION;
  preset: PresetId;
  /** the cards of the custom preset, in `CARD_IDS` order */
  custom: CardId[];
}

export const DEFAULT_LAYOUT: TelemetryLayout = { version: TELEMETRY_LAYOUT_VERSION, preset: 'all', custom: [...CARD_IDS] };

const isCard = (v: unknown): v is CardId => typeof v === 'string' && (CARD_IDS as readonly string[]).includes(v);
const isPreset = (v: unknown): v is PresetId => typeof v === 'string' && (PRESET_IDS as readonly string[]).includes(v);
/** Canonical order, no duplicates. */
const ordered = (cards: Iterable<CardId>): CardId[] => { const set = new Set(cards); return CARD_IDS.filter((c) => set.has(c)); };

/**
 * A stored layout, or the default. A malformed value, an unknown preset or a
 * newer version is not guessed at: it falls back to every card (nothing the
 * user needs is hidden by data this build cannot read). Unknown card ids in an
 * otherwise valid custom list are dropped.
 */
export function parseTelemetryLayout(raw: string | null): TelemetryLayout {
  if (!raw) return { ...DEFAULT_LAYOUT, custom: [...DEFAULT_LAYOUT.custom] };
  try {
    const v = JSON.parse(raw) as Partial<TelemetryLayout>;
    if (!v || v.version !== TELEMETRY_LAYOUT_VERSION || !isPreset(v.preset)) throw new Error('unreadable');
    const custom = Array.isArray(v.custom) ? ordered(v.custom.filter(isCard)) : [...CARD_IDS];
    return { version: TELEMETRY_LAYOUT_VERSION, preset: v.preset, custom };
  } catch {
    return { ...DEFAULT_LAYOUT, custom: [...DEFAULT_LAYOUT.custom] };
  }
}

export function serializeTelemetryLayout(layout: TelemetryLayout): string {
  return JSON.stringify({ version: TELEMETRY_LAYOUT_VERSION, preset: layout.preset, custom: ordered(layout.custom) });
}

/** The cards on screen for `layout`. */
export function visibleCards(layout: TelemetryLayout): ReadonlySet<CardId> {
  return new Set(layout.preset === 'custom' ? layout.custom : PRESETS[layout.preset]);
}

/** Pick a preset; the custom list is kept for when Custom is chosen again. */
export function choosePreset(layout: TelemetryLayout, preset: PresetId): TelemetryLayout {
  return { ...layout, preset, custom: [...layout.custom] };
}

/**
 * Show or hide one card. It turns the layout into Custom, starting from the
 * cards on screen, so ticking a box never makes other cards jump.
 */
export function toggleCard(layout: TelemetryLayout, card: CardId, on: boolean): TelemetryLayout {
  const cards = new Set(visibleCards(layout));
  if (on) cards.add(card); else cards.delete(card);
  return { version: TELEMETRY_LAYOUT_VERSION, preset: 'custom', custom: ordered(cards) };
}
