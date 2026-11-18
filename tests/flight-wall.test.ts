import { afterAll, describe, expect, it } from 'vitest';
import type { BoosterFrame, StageFrame, VisualFrame } from '../src/physics/frame';
import type { SimEvent } from '../src/physics/simulation';
import { setLang } from '../src/i18n';
import { wallChips } from '../src/ui/flight-wall';

const stage = (index: number, burning: boolean, propellantFraction = 1): StageFrame =>
  ({ id: `s${index}`, index, attached: true, burning, propellantFraction, isSpacecraft: false, effectiveThrottle: burning ? 1 : 0 });
const booster = (burning: boolean): BoosterFrame =>
  ({ id: 'b', stageId: 's0', attached: true, burning, propellantFraction: 1, effectiveThrottle: burning ? 0.81 : 0 });
const frame = (over: Partial<VisualFrame>): VisualFrame => ({
  t: -10, status: 'prelaunch', ascentPhase: null, note: 'countdown', stages: [stage(0, false), stage(1, false)], boosters: [],
  activeStageIndex: 0, ...over,
} as VisualFrame);
const ev = (t: number, key: string, severity: SimEvent['severity'] = 'info'): SimEvent => ({ t, key, severity } as SimEvent);
/** the six rows as "level text", keyed by label key */
const rows = (f: VisualFrame, events: SimEvent[] = []): Record<string, string> =>
  Object.fromEntries(wallChips(f, events, null).map((r) => [r.key, `${r.level} ${r.text}`]));

// setLang writes document.documentElement.lang; this suite runs without a DOM
const g = globalThis as { document?: unknown };
if (!g.document) g.document = { documentElement: {} };
setLang('en');
afterAll(() => setLang('en'));

describe('F2 flight wall status rows', () => {
  it('on the pad every row is a calm value, in the fixed order', () => {
    const chips = wallChips(frame({}), [], null);
    expect(chips.map((c) => c.key)).toEqual(['hud.engines', 'hud.phase', 'wall.separations', 'wall.warnings', 'wall.propellant', 'tel.cards.orbit']);
    expect(rows(frame({}))).toEqual({
      'hud.engines': 'idle off', 'hud.phase': 'idle Countdown', 'wall.separations': 'idle 0', 'wall.warnings': 'ok none',
      'wall.propellant': 'idle 100 %', 'tel.cards.orbit': 'idle —',
    });
  });

  it('core and strap-ons burning read through the engine-levels helper; the ascent phase is the HUD word', () => {
    const r = rows(frame({ t: 30, status: 'ascent', ascentPhase: 'gravityTurn', stages: [stage(0, true), stage(1, false)], boosters: [booster(true)] }));
    expect(r['hud.engines']).toBe('ok core 100\u00a0% · strap-ons 81\u00a0%');
    expect(r['hud.phase']).toBe('idle Gravity turn');
  });

  it('names no core when only the upper stage burns; engines flagged burning at 0 % are idle', () => {
    expect(rows(frame({ t: 300, status: 'ascent', activeStageIndex: 1, stages: [stage(0, false), stage(1, true)] }))['hud.engines']).toBe('ok 100\u00a0%');
    const destroyed = { ...booster(true), effectiveThrottle: 0 };
    expect(rows(frame({ t: 60, status: 'failed', note: 'destroyed', boosters: [destroyed] }))['hud.engines']).toBe('idle strap-ons 0\u00a0%');
  });

  it('counts only events up to the frame (the replay cut)', () => {
    const events = [ev(120, 'evt.boosterSep', 'major'), ev(200, 'evt.fairingSep', 'major')];
    expect(rows(frame({ t: 150, status: 'ascent' }), events)['wall.separations']).toBe('ok 1 · Booster sep');
    expect(rows(frame({ t: 100, status: 'ascent' }), events)['wall.separations']).toBe('idle 0');
    expect(rows(frame({ t: 250, status: 'ascent' }), events)['wall.separations']).toBe('ok 2 · Fairing');
  });

  it('counts escape-capsule and Apollo separations too', () => {
    expect(rows(frame({ t: 10, status: 'ascent' }), [ev(8, 'evt.escapeCapsule', 'major')])['wall.separations'].startsWith('ok 1 · ')).toBe(true);
    expect(rows(frame({ t: 400, status: 'coast' }), [ev(390, 'evt.csmSeparation', 'success')])['wall.separations']).toBe('ok 1 · CSM sep.');
  });

  it('an engine out warns the engines and warnings rows from its time on, not before', () => {
    const events = [ev(80, 'evt.engineOut', 'warn')];
    const burning = { status: 'ascent' as const, stages: [stage(0, true), stage(1, false)] };
    expect(rows(frame({ t: 79, ...burning }), events)['hud.engines']).toBe('ok 100\u00a0%');
    expect(rows(frame({ t: 79, ...burning }), events)['wall.warnings']).toBe('ok none');
    expect(rows(frame({ t: 81, ...burning }), events)['hud.engines']).toBe('warn 100\u00a0%');
    expect(rows(frame({ t: 81, ...burning }), events)['wall.warnings']).toBe('warn 1 · Engine out');
  });

  it('a stuck fairing warns the separations row; a fail event fails the warnings row', () => {
    const events = [ev(200, 'evt.fairingStuck', 'warn'), ev(210, 'evt.stagingFailure', 'fail')];
    expect(rows(frame({ t: 205, status: 'ascent' }), events)['wall.separations']).toBe('warn 0');
    const r = rows(frame({ t: 215, status: 'ascent' }), events);
    expect(r['wall.separations'].startsWith('fail ')).toBe(true);
    expect(r['wall.warnings'].startsWith('fail 2 · ')).toBe(true);
  });

  it('the orbit row takes the latest insertion event and its severity while coasting', () => {
    expect(rows(frame({ t: 600, status: 'coast' }), [ev(540, 'evt.parkingOrbit', 'success')])['tel.cards.orbit']).toBe('ok Parking orbit');
    expect(rows(frame({ t: 600, status: 'coast' }), [ev(540, 'evt.offTargetOrbit', 'warn')])['tel.cards.orbit']).toBe('warn Off target');
  });

  it('a failed frame states the HUD note, not the earlier parking orbit', () => {
    const r = rows(frame({ t: 900, status: 'failed', note: 'reentry' }), [ev(540, 'evt.parkingOrbit', 'success')]);
    expect(r['tel.cards.orbit']).toBe('fail Re-entry');
    expect(r['hud.phase']).toBe('fail Mission failed');
  });

  it('after a landing the orbit row keeps the insertion event, or the idle dash without one', () => {
    expect(rows(frame({ t: 500, status: 'landed', note: 'landed' }))['tel.cards.orbit']).toBe('idle —');
    expect(rows(frame({ t: 900, status: 'landed', note: 'landed' }), [ev(540, 'evt.parkingOrbit', 'success')])['tel.cards.orbit']).toBe('ok Parking orbit');
  });

  it('writes the active stage propellant as a whole percent in every language', () => {
    const f = frame({ t: 60, status: 'ascent', stages: [stage(0, true, 0.574), stage(1, false)] });
    for (const lang of ['en', 'th', 'ru'] as const) {
      setLang(lang);
      expect(rows(f)['wall.propellant'], lang).toBe('idle 57 %');
    }
    setLang('en');
    expect(rows(frame({ activeStageIndex: 5 }))['wall.propellant']).toBe('idle —');
  });
});
