/**
 * U16 / R2.1: the level the engines are actually running at, beside the
 * throttle command.
 *
 * `VisualFrame.throttle` is the guidance (or manual) command. What the engines
 * do is recorded per stage and per strap-on group as `effectiveThrottle`
 * (src/physics/frame.ts): the command after the engine's minimum throttle,
 * the core's limit while strap-ons burn, a booster programme step such as
 * Soyuz-2's 81 % at T+112 s, a solid motor's thrust profile and a hot stage's
 * own level. A Soyuz can therefore read "command 100 %" while its strap-ons
 * run at 81 %. Both come from the one frame on screen, so live and replay
 * agree and nothing here reads a manual input field.
 */
import type { VisualFrame } from '../physics/frame';

export interface EngineLevels {
  /** levels of the core stages producing thrust, lowest stage first (two during hot staging) */
  stages: number[];
  /** range over the strap-on groups producing thrust, or null when none are */
  boosters: { min: number; max: number } | null;
}

/** The actual engine levels of `frame`, 0..1 each. */
export function engineLevels(frame: Pick<VisualFrame, 'stages' | 'boosters'>): EngineLevels {
  const stages = frame.stages
    .filter((s) => s.burning)
    .sort((a, b) => a.index - b.index)
    .map((s) => s.effectiveThrottle ?? 0);
  let boosters: EngineLevels['boosters'] = null;
  for (const b of frame.boosters) {
    if (!b.burning) continue;
    const v = b.effectiveThrottle ?? 0;
    boosters = boosters ? { min: Math.min(boosters.min, v), max: Math.max(boosters.max, v) } : { min: v, max: v };
  }
  return { stages, boosters };
}

const pct = (v: number): string => `${Math.round(v * 100)} %`;

/**
 * "core 100 % · strap-ons 81 %"; "—" with no engine producing thrust. The
 * words are passed in so this stays free of the dictionaries.
 */
export function formatEngineLevels(levels: EngineLevels, words: { core: string; boosters: string }): string {
  const parts: string[] = [];
  if (levels.stages.length) parts.push(`${words.core} ${levels.stages.map(pct).join(' / ')}`);
  const b = levels.boosters;
  if (b) parts.push(`${words.boosters} ${Math.round(b.min * 100) === Math.round(b.max * 100) ? pct(b.min) : `${Math.round(b.min * 100)}–${pct(b.max)}`}`);
  return parts.length ? parts.join(' · ') : '—';
}
