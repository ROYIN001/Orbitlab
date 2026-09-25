import { describe, expect, it } from 'vitest';
import { autoWarp, flightEnding, groundSpeed, reachedOrbit, watchBeat, WATCH_BEATS, type WatchBeat } from '../src/ui/watch-logic';
import { OMEGA_EARTH, R_EARTH } from '../src/physics/constants';
import type { DebrisFrame, VisualFrame } from '../src/physics/frame';
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
  it('names the speed of sound, and a solid booster\'s separation (V03)', () => {
    expect(watchBeat(frame({ t: 30, altitude: 6000, mach: 0.98 }), [])).toBe('transonic');
    expect(watchBeat(frame({ t: 30, altitude: 6000, mach: 0.8 }), [])).toBe('gravityTurn');
    expect(watchBeat(frame({ t: 40, altitude: 16000, mach: 1.0 }), [])).toBe('gravityTurn');
    const sep = [ev(120, 'evt.boosterSep')];
    expect(watchBeat(frame({ t: 121, altitude: 60e3 }), sep)).toBe('boosterSep');
    expect(watchBeat(frame({ t: 121, altitude: 60e3 }), sep, false, true)).toBe('boosterSepSolid');
    expect(watchBeat(frame({ t: 121, altitude: 60e3 }), sep, true, false)).toBe('boosterSepCross');
    for (const beat of ['transonic', 'boosterSepSolid'] as const) {
      expect(en[WATCH_BEATS[beat].label as keyof typeof en]).toBeTruthy();
      expect(en[WATCH_BEATS[beat].text as keyof typeof en]).toBeTruthy();
    }
  });

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

/** A stage flown home to a landing zone, in the given phase. */
function home(phase: NonNullable<DebrisFrame['recovery']>['phase'], alive = true): DebrisFrame {
  return {
    id: 1, name: 'First stage', r: { x: R_EARTH, y: 0, z: 0 }, v: { x: 0, y: 0, z: 0 }, dir: { x: 1, y: 0, z: 0 },
    alive, burning: false, createdAt: 150, outcome: alive ? undefined : 'landed',
    visual: { kind: 'stage', length: 41, diameter: 3.66, color: '#fff' },
    recovery: { phase, landed: !alive, target: { kind: 'pad', id: 'lz1', lat: 0, lon: 0, alt: 3, radius: 43 } },
  } as DebrisFrame;
}

describe('a stage flown home, and a ship', () => {
  it('cuts to the stage for its boostback, entry, landing and touchdown, then back to the rocket', () => {
    const upper = { altitude: 150e3, activeStageIndex: 1 };
    const events = [ev(160, 'evt.boostbackStart'), ev(400, 'evt.entryBurnStart'), ev(470, 'evt.landingBurnStart'), ev(490, 'evt.boosterLandedZone')];
    expect(watchBeat(frame({ t: 165, ...upper }), events)).toBe('boostback');
    expect(watchBeat(frame({ t: 300, ...upper }), events)).toBe('upperStage');
    expect(watchBeat(frame({ t: 405, ...upper }), events)).toBe('entryBurn');
    expect(watchBeat(frame({ t: 475, ...upper }), events)).toBe('landingBurn');
    expect(watchBeat(frame({ t: 495, ...upper }), events)).toBe('boosterLanded');
    expect(watchBeat(frame({ t: 510, ...upper }), events)).toBe('upperStage');
    expect(watchBeat(frame({ t: 495, ...upper }), [ev(490, 'evt.boosterLandedShip')])).toBe('boosterLandedShip');
    expect(watchBeat(frame({ t: 425, ...upper }), [ev(420, 'evt.boosterCaught')])).toBe('boosterCaught');
  });

  it('follows a ship home from its cut-off to the water', () => {
    const fast = { v: { x: 0, y: OMEGA_EARTH * R_EARTH + 7000, z: 0 } };
    const slow = { v: { x: 0, y: OMEGA_EARTH * R_EARTH + 200, z: 0 } };
    expect(watchBeat(frame({ t: 515, status: 'descent', descentPhase: 'coast' }), [ev(510, 'evt.suborbitalTarget')])).toBe('suborbital');
    expect(watchBeat(frame({ t: 900, status: 'descent', descentPhase: 'coast' }), [])).toBe('shipCoast');
    expect(watchBeat(frame({ t: 2800, status: 'descent', descentPhase: 'entry', ...fast }), [])).toBe('shipEntry');
    expect(watchBeat(frame({ t: 3200, status: 'descent', descentPhase: 'entry', ...slow }), [])).toBe('bellyFlop');
    expect(watchBeat(frame({ t: 3300, status: 'descent', descentPhase: 'bellyflop', ...slow }), [])).toBe('bellyFlop');
    expect(watchBeat(frame({ t: 3500, status: 'descent', descentPhase: 'flip' }), [])).toBe('shipFlip');
    expect(watchBeat(frame({ t: 3520, status: 'descent', descentPhase: 'landing' }), [])).toBe('shipFlip');
    expect(watchBeat(frame({ t: 3540, status: 'landed', note: 'splashdown' }), [])).toBe('splashdown');
    expect(watchBeat(frame({ t: 3540, status: 'landed', note: 'shipLost' }), [])).toBe('failed');
  });

  it('never runs past a stage flying home: 5× while it flies, 2× from its entry burn', () => {
    const coast = frame({ t: 520, status: 'coast', nextBurnTime: 1500 });
    expect(autoWarp(coast, 'coast')).toBe(50);
    expect(autoWarp({ ...coast, debris: [home('coast')] }, 'coast')).toBe(5);
    expect(autoWarp({ ...coast, debris: [home('landing')] }, 'coast')).toBe(2);
    expect(autoWarp({ ...coast, debris: [home('landing', false)] }, 'coast')).toBe(50);
    expect(autoWarp(frame({ t: 900, status: 'descent', descentPhase: 'coast' }), 'shipCoast')).toBe(50);
    expect(autoWarp(frame({ t: 2800, status: 'descent', descentPhase: 'entry' }), 'shipEntry')).toBe(10);
  });

  it('ends the flight in orbit only once every stage flown home is down, and a ship on its splashdown', () => {
    const inOrbit = { t: 600, status: 'orbit' as const };
    expect(flightEnding(frame({ ...inOrbit, debris: [home('landing')] }), [])).toBeNull();
    expect(flightEnding(frame({ ...inOrbit, debris: [home('landing', false)] }), [ev(595, 'evt.boosterLandedZone')])).toBeNull();
    expect(flightEnding(frame({ ...inOrbit, debris: [home('landing', false)] }), [ev(585, 'evt.boosterLandedZone')])).toBe('orbit');
    expect(flightEnding(frame({ t: 3545, status: 'landed', note: 'splashdown' }), [])).toBe('splashdown');
    expect(flightEnding(frame({ t: 3545, status: 'landed', note: 'shipLost' }), [])).toBe('failed');
    expect(flightEnding(frame({ t: 90, status: 'failed' }), [])).toBe('failed');
    expect(flightEnding(frame({ t: 900, status: 'descent', descentPhase: 'coast' }), [])).toBeNull();
  });
});
