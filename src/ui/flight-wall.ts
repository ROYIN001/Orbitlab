/**
 * F2, the Engineer flight wall: six system-status rows, DOM-free.
 *
 * Every row comes from the frame on screen and the events recorded up to it
 * (the replay cut), worded by the house helpers the HUD and the event log
 * use. Nothing reads the live run, and nothing is shown that the simulation
 * does not record (no electrical, comms or loads row, no forecast).
 */
import type { VisualFrame } from '../physics/frame';
import type { SimEvent } from '../physics/simulation';
import type { VehicleSpec } from '../types';
import { getLang, t } from '../i18n';
import { engineLevels, formatEngineLevels } from './engine-levels';
import { eventLabel, hudNote, statusKey } from './phase';
import { localizeEventParams } from './names';
import { INSERTION } from '../replay/reference';

export type WallLevel = 'ok' | 'warn' | 'fail' | 'idle';
/** `key` is the row's i18n label key; `text` the value's words only (the level's glyph comes from CSS). */
export interface WallRow { key: string; level: WallLevel; text: string }

const RANK: Record<WallLevel, number> = { idle: 0, ok: 1, warn: 2, fail: 3 };
const worst = (levels: WallLevel[]): WallLevel | null =>
  levels.length ? levels.reduce((a, b) => (RANK[b] > RANK[a] ? b : a)) : null;

const ENGINE_FAULTS: Record<string, WallLevel> = { 'evt.engineOut': 'warn', 'evt.fdirEngineShutdown': 'warn', 'evt.thrustLoss': 'fail' };
const SEPARATION_FAULTS: Record<string, WallLevel> = { 'evt.fairingStuck': 'warn', 'evt.stagingFailure': 'fail', 'evt.prematureSep': 'fail' };
// every separation the simulation records (launcher, escape and capsule, Apollo); not evt.debrisSeparated, which repeats each one
const SEPARATIONS = ['evt.boosterSep', 'evt.stageSep', 'evt.fairingSep', 'evt.payloadSep', 'evt.interstageSep', 'evt.towerJettison', 'evt.aftSkirtSep',
  'evt.escapeCapsule', 'evt.vostokSeparation', 'evt.retroPackOff', 'evt.csmSeparation', 'evt.cmSmSeparation', 'evt.lmJettison', 'evt.asSeparation'];
const BY_SEVERITY: Partial<Record<SimEvent['severity'], WallLevel>> = { success: 'ok', warn: 'warn', fail: 'fail' };

/** The six rows for `frame`: engines, phase, separations, warnings, propellant, orbit. */
export function wallChips(frame: VisualFrame, events: readonly SimEvent[], spec: VehicleSpec | null): WallRow[] {
  const seen = events.filter((e) => e.t <= frame.t);
  const label = (e: SimEvent): string => eventLabel(e.key, localizeEventParams(spec, e.params));
  const faults = (table: Record<string, WallLevel>): WallLevel | null => worst(seen.filter((e) => e.key in table).map((e) => table[e.key]));

  const levels = engineLevels(frame);
  const burning = levels.stages.length > 0 || levels.boosters !== null;
  // ok only while thrust is produced: a destroyed vehicle's frame can still flag engines burning at 0 %
  const thrusting = levels.stages.some((v) => v > 0) || (levels.boosters?.max ?? 0) > 0;
  // "core" only beside the strap-ons: after staging the upper stage is the one burning
  const words = { core: levels.boosters ? t('hud.engines.core') : '', boosters: t('hud.engines.boosters') };
  const engines: WallRow = {
    key: 'hud.engines',
    level: faults(ENGINE_FAULTS) ?? (thrusting ? 'ok' : 'idle'),
    // the no-break space before % as in the propellant row (the HUD helper keeps a plain one; r2-flight-shell reads it)
    text: burning ? formatEngineLevels(levels, words).trim().replace(/ %/g, '\u00a0%') : t('wall.enginesOff'),
  };

  const phase: WallRow = {
    key: 'hud.phase',
    level: frame.status === 'failed' ? 'fail' : 'idle',
    text: frame.status === 'ascent' && frame.ascentPhase ? t(`hud.phase.${frame.ascentPhase}`) : t(statusKey(frame)),
  };

  const seps = seen.filter((e) => SEPARATIONS.includes(e.key));
  const separations: WallRow = {
    key: 'wall.separations',
    level: faults(SEPARATION_FAULTS) ?? (seps.length ? 'ok' : 'idle'),
    text: seps.length ? `${seps.length} · ${label(seps[seps.length - 1])}` : '0',
  };

  const bad = seen.filter((e) => e.severity === 'warn' || e.severity === 'fail');
  const warnings: WallRow = {
    key: 'wall.warnings',
    level: bad.some((e) => e.severity === 'fail') ? 'fail' : bad.length ? 'warn' : 'ok',
    text: bad.length ? `${bad.length} · ${label(bad[bad.length - 1])}` : t('misc.none'),
  };

  const stage = frame.stages.find((s) => s.index === frame.activeStageIndex);
  const propellant: WallRow = {
    key: 'wall.propellant',
    level: 'idle',
    // a no-break space keeps the number with its unit (the Russian rule; harmless in TH and EN)
    text: stage ? `${Math.round(stage.propellantFraction * 100).toLocaleString(getLang())} %` : '—',
  };

  // only an orbit or a failure speaks here: after a descent or a landing the row keeps the insertion, if any
  const note = frame.status === 'orbit' || frame.status === 'failed' ? hudNote(frame) : null;
  const insertion = seen.filter((e) => INSERTION.includes(e.key)).pop();
  const orbit: WallRow = note ? { key: 'tel.cards.orbit', level: note.level, text: t(note.key) }
    : insertion ? { key: 'tel.cards.orbit', level: BY_SEVERITY[insertion.severity] ?? 'idle', text: label(insertion) }
    : { key: 'tel.cards.orbit', level: 'idle', text: '—' };

  return [engines, phase, separations, warnings, propellant, orbit];
}
