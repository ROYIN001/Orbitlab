/**
 * The real flight beside the simulated one (roadmap C01): matching the flown
 * event times to the simulation's events, the orbit the payload was left in,
 * and which settings count as the historical flight unchanged.
 */
import { describe, expect, it } from 'vitest';
import { compareEvents, recentFlown, simPayloadOrbit, type FlownRecord } from '../src/ui/flown';
import { fmtDelta, fmtMissionTime } from '../src/ui/flown-view';
import { WATCH_MISSIONS, historicalFor, isHistorical, watchMissionSettings } from '../src/ui/watch-missions';
import type { SimEvent } from '../src/physics/sim/types';

const ev = (t: number, key: string, params?: SimEvent['params']): SimEvent => ({ t, key, severity: 'info', ...(params ? { params } : {}) });

const RECORD: FlownRecord = {
  events: [
    { key: 'evt.stageSep', t: 330 }, { key: 'evt.boosterSep', t: 214 }, { key: 'evt.stageSep', n: 2, t: 738 },
    { key: 'evt.contact', t: 22000, approx: true },
  ],
  orbit: { perigee: 192, apogee: 218, inclination: 51.66 },
};
const EVENTS = [
  ev(0, 'evt.liftoff'), ev(203, 'evt.boosterSep'), ev(331.8, 'evt.stageSep'), ev(716, 'evt.parkingOrbit', { pe: 190, ap: 200, inc: 51.6 }),
  ev(719.8, 'evt.stageSep'), ev(720, 'evt.targetOrbit', { pe: 195, ap: 240, inc: 51.65 }), ev(725, 'evt.payloadSep'),
  ev(900, 'evt.targetOrbit', { pe: 400, ap: 410, inc: 51.65 }),
];

describe('the real flight beside the model', () => {
  it('matches each flown event to its occurrence in the simulation, in flown order', () => {
    const rows = compareEvents(RECORD, EVENTS);
    expect(rows.map((r) => [r.key, r.n])).toEqual([['evt.boosterSep', 1], ['evt.stageSep', 1], ['evt.stageSep', 2], ['evt.contact', 1]]);
    expect(rows[0]).toMatchObject({ real: 214, sim: 203, delta: -11, approx: false });
    expect(rows[2].sim).toBe(719.8);
    expect(rows[2].delta!).toBeCloseTo(-18.2, 6);
    expect(rows[3]).toMatchObject({ sim: null, delta: null, approx: true });
  });

  it('takes the payload\'s orbit at its separation, not the spacecraft\'s own burns after it', () => {
    expect(simPayloadOrbit(EVENTS)).toEqual({ perigee: 195, apogee: 240, inclination: 51.65 });
    expect(simPayloadOrbit([ev(0, 'evt.liftoff')])).toBeNull();
    // no separation yet: the target orbit reached, never a parking orbit on the way
    expect(simPayloadOrbit(EVENTS.filter((e) => e.key !== 'evt.payloadSep'))?.perigee).toBe(400);
    expect(simPayloadOrbit(EVENTS.filter((e) => e.key !== 'evt.payloadSep' && e.key !== 'evt.targetOrbit'))).toBeNull();
    // a target orbit wins over the parking orbit before it
    expect(simPayloadOrbit(EVENTS.filter((e) => !(e.key === 'evt.targetOrbit' && e.t === 720)))?.perigee).toBe(190);
  });

  it('names the flown event just passed, for the viewer\'s caption', () => {
    expect(recentFlown(RECORD, EVENTS, 210)?.key).toBe('evt.boosterSep');
    expect(recentFlown(RECORD, EVENTS, 260)).toBeNull();
    expect(recentFlown(RECORD, EVENTS, 722)).toMatchObject({ key: 'evt.stageSep', n: 2 });
  });

  it('writes mission times and differences', () => {
    expect(fmtMissionTime(153)).toBe('T+02:33');
    expect(fmtMissionTime(22095)).toBe('T+6:08:15');
    expect(fmtMissionTime(181599.4)).toBe('T+50:26:39');
    expect(fmtDelta(-20)).toBe('−20 s');
    expect(fmtDelta(725)).toBe('+12:05');
    expect(fmtDelta(0.1)).toBe('±0 s');
  });

  it('gives every historical flight a flown record, and knows it only unchanged', () => {
    for (const m of WATCH_MISSIONS.filter(isHistorical)) {
      expect(m.flown?.events.length, m.id).toBeGreaterThan(2);
      const s = watchMissionSettings(m.id);
      expect(historicalFor(s)?.id).toBe(m.id);
      expect(historicalFor({ ...s, payloadMass: s.payloadMass + 100 })).toBeUndefined();
      expect(historicalFor({ ...s, launchTime: new Date(s.launchTime.getTime() + 60e3) })).toBeUndefined();
    }
    // the daylight missions are not historical, whenever they launch
    const today = watchMissionSettings('falcon9Bandwagon', new Date('2024-04-07T12:00:00Z'));
    expect(historicalFor(today)).toBeUndefined();
  });
});
