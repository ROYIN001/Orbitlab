import { describe, expect, it } from 'vitest';
import { autoWarp, groundSpeed, reachedOrbit, watchBeat, WATCH_BEATS, type WatchBeat } from '../src/ui/watch-logic';
import { OMEGA_EARTH, R_EARTH } from '../src/physics/constants';
import type { VisualFrame } from '../src/physics/frame';
import type { SimEvent } from '../src/physics/simulation';
import { en } from '../src/i18n/en';

function frame(o: Partial<VisualFrame> = {}): VisualFrame {
  return {
    t: 0, status: 'ascent', ascentPhase: null, note: '', liftoff: true, liftoffT: 0.8, destroyed: false,
    r: { x: R_EARTH, y: 0, z: 0 }, v: { x: 0, y: 0, z: 0 }, dir: { x: 1, y: 0, z: 0 },
    altitude: 0, altitudeAGL: 0, activeStageIndex: 0, payloadSeparated: false, nextBurnTime: -1,
    elements: { period: 5400 },
    ...o,
  } as VisualFrame;
}
const ev = (t: number, key: string): SimEvent => ({ t, key, severity: 'info' });

describe('launch viewer beats', () => {
  it('counts down on the pad and follows the flight status', () => {
    expect(watchBeat(null, [])).toBe('countdown');
    expect(watchBeat(frame({ t: -5, status: 'prelaunch', liftoff: false }), [])).toBe('countdown');
    expect(watchBeat(frame({ t: 5 }), [])).toBe('liftoff');
    expect(watchBeat(frame({ t: 30, altitude: 2000 }), [])).toBe('climb');
    expect(watchBeat(frame({ t: 60, altitude: 9000 }), [])).toBe('gravityTurn');
    expect(watchBeat(frame({ t: 300, altitude: 150e3, activeStageIndex: 1 }), [])).toBe('upperStage');
    expect(watchBeat(frame({ t: 900, status: 'coast' }), [])).toBe('coast');
    expect(watchBeat(frame({ t: 900, status: 'burn' }), [])).toBe('burn');
    expect(watchBeat(frame({ t: 900, status: 'orbit' }), [])).toBe('orbit');
    expect(watchBeat(frame({ t: 900, status: 'orbit', payloadSeparated: true }), [])).toBe('deployed');
    expect(watchBeat(frame({ t: 90, status: 'failed' }), [])).toBe('failed');
  });

  it('holds a separation on screen for a few seconds, then returns to the phase', () => {
    const events = [ev(0.8, 'evt.liftoff'), ev(62, 'evt.maxQ'), ev(118, 'evt.boosterSep')];
    expect(watchBeat(frame({ t: 66, altitude: 11e3 }), events)).toBe('maxQ');
    expect(watchBeat(frame({ t: 125, altitude: 45e3 }), events)).toBe('boosterSep');
    expect(watchBeat(frame({ t: 125, altitude: 45e3 }), events, true)).toBe('boosterSepCross');
    expect(watchBeat(frame({ t: 135, altitude: 50e3 }), events)).toBe('gravityTurn');
    // an event in the recording but after the frame on screen is not shown yet
    expect(watchBeat(frame({ t: 110, altitude: 40e3 }), events)).toBe('gravityTurn');
  });

  it('plays the key moments in real time and speeds through the quiet ones', () => {
    const presets = [0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 500, 1000, 5000, 10000, 50000];
    const beat = (f: VisualFrame): WatchBeat => watchBeat(f, []);
    const early = frame({ t: 60, altitude: 9000 });
    expect(autoWarp(early, beat(early))).toBe(1);
    const late = frame({ t: 140, altitude: 50e3 });
    expect(autoWarp(late, beat(late))).toBe(2);
    expect(autoWarp(late, 'boosterSep')).toBe(1);
    const coast = frame({ t: 1000, status: 'coast', nextBurnTime: 2000 });
    expect(autoWarp(coast, beat(coast))).toBe(50);
    const nearBurn = frame({ t: 1960, status: 'coast', nextBurnTime: 2000 });
    expect(autoWarp(nearBurn, beat(nearBurn))).toBe(5);
    const upper = frame({ t: 300, altitude: 150e3, activeStageIndex: 1 });
    expect(autoWarp(upper, beat(upper))).toBe(5);
    expect(autoWarp(null, 'countdown')).toBe(1);
    // every automatic speed is a preset of the workspace's warp selector
    for (const f of [early, late, coast, nearBurn, upper]) expect(presets).toContain(autoWarp(f, beat(f)));
  });

  it('reads speed over the ground: zero on a pad the Earth is carrying round', () => {
    const r = { x: R_EARTH, y: 0, z: 0 };
    const pad = frame({ r, v: { x: 0, y: OMEGA_EARTH * R_EARTH, z: 0 } });
    expect(groundSpeed(pad)).toBeCloseTo(0, 6);
    const moving = frame({ r, v: { x: 100, y: OMEGA_EARTH * R_EARTH, z: 0 } });
    expect(groundSpeed(moving)).toBeCloseTo(100, 6);
  });

  it('calls orbit on the orbit status or the first orbit event, never on a failure', () => {
    expect(reachedOrbit(frame({ t: 600, status: 'coast' }), [ev(560, 'evt.parkingOrbit')])).toBe(true);
    expect(reachedOrbit(frame({ t: 500, status: 'coast' }), [ev(560, 'evt.parkingOrbit')])).toBe(false);
    expect(reachedOrbit(frame({ t: 600, status: 'orbit' }), [])).toBe(true);
    expect(reachedOrbit(frame({ t: 600, status: 'failed' }), [ev(560, 'evt.parkingOrbit')])).toBe(false);
  });

  it('has a sentence and a label in the dictionary for every beat', () => {
    for (const copy of Object.values(WATCH_BEATS)) {
      expect(en[copy.label]).toBeTruthy();
      expect(en[copy.text]).toBeTruthy();
    }
  });
});
