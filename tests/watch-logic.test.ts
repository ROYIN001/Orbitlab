import { describe, expect, it } from 'vitest';
import { autoWarp, crewAloft, flightEnding, groundSpeed, heightNearFlight, missionOrbit, parkingMilestone, reachedOrbit, vostokLandings, watchBeat, watchSummary, WATCH_BEATS, type WatchBeat } from '../src/ui/watch-logic';
import { OMEGA_EARTH, R_EARTH } from '../src/physics/constants';
import { WGS84_A } from '../src/physics/geodesy';
import type { DebrisFrame, VisualFrame } from '../src/physics/frame';
import type { SimEvent } from '../src/physics/simulation';
import { en } from '../src/i18n/en';
import { tFor } from '../src/i18n';
import evidence from '../docs/history/audit-2026-09-27/live-evidence.json';

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

/**
 * Falcon 9 Bandwagon-1 as the audit recorded it in the app (audit 2026-09-27
 * A9, `live-evidence.json`): the booster down on LZ-1 at T+461.6 s, a parking
 * orbit of 200 × 588 km at T+479.9 s, 46 minutes of coast, the burn that
 * raises the perigee, 586 × 595 km at T+3238.2 s, the rideshare off at
 * T+3253.2 s.
 */
describe('the end of an orbital flight is its final orbit, not its parking orbit (audit 2026-09-27 A9)', () => {
  const log: SimEvent[] = evidence.bandwagonEvents.events.map((e) => ({ t: e.timeS, key: e.key, severity: e.severity as SimEvent['severity'], params: e.params as unknown as SimEvent['params'] }));
  const at = (key: string): number => log.find((e) => e.key === key)!.t;
  const landed = at('evt.boosterLandedZone'), parking = at('evt.parkingOrbit'), scheduled = at('evt.burnScheduled');
  const burnStart = at('evt.burnStart'), target = at('evt.targetOrbit'), payload = at('evt.payloadSep');
  const tgo = log.find((e) => e.key === 'evt.burnScheduled')!.params!.tgo as number;
  /** The frame the app showed at `t`, rebuilt from the event log. */
  function bandwagon(t: number): VisualFrame {
    const status = t < parking ? 'ascent' : t < burnStart ? 'coast' : t < target ? 'burn' : 'orbit';
    return frame({
      t, status, activeStageIndex: 1, altitude: 200e3, altitudeAGL: 200e3,
      nextBurnTime: t >= scheduled && t < burnStart ? scheduled + tgo : -1,
      payloadSeparated: t >= payload,
      elements: { period: 5800, periapsisAlt: 200e3, apoapsisAlt: 588e3, i: 45.4 * Math.PI / 180, e: 0.03 } as VisualFrame['elements'],
      debris: [{ ...home('landing', t < landed), name: 'First stage (9× Merlin 1D)' }],
    });
  }
  const upTo = (t: number): SimEvent[] => log.filter((e) => e.t <= t + 1e-6);

  it('is not over at T+500 s, in the parking orbit with the booster down', () => {
    expect(reachedOrbit(bandwagon(500), upTo(500))).toBe(true);
    expect(missionOrbit(bandwagon(500), upTo(500))).toBe(false);
    expect(flightEnding(bandwagon(500), upTo(500))).toBeNull();
    // the whole log, as a replay has it: events after the frame do not count
    expect(flightEnding(bandwagon(500), log)).toBeNull();
  });

  it('never ends before the final orbit and a few seconds more, and ends once the payload is off', () => {
    let first: number | null = null;
    for (let t = 0; t <= 3400 && first === null; t += 0.5) if (flightEnding(bandwagon(t), log)) first = t;
    expect(first).not.toBeNull();
    expect(first!).toBeGreaterThanOrEqual(target + 10);
    // the payload comes free 15 s after the insertion: the card waits for it, and then settles
    expect(flightEnding(bandwagon(target + 10), log)).toBeNull();
    expect(first!).toBeCloseTo(payload + 10, 0);
    expect(flightEnding(bandwagon(payload + 10.5), log)).toBe('orbit');
  });

  it('marks the parking orbit as a milestone with the burn still to come, until that burn lights', () => {
    expect(parkingMilestone(bandwagon(470), log)).toBeNull();
    // the stage tails off for a second after the cut-off with nothing planned yet: no milestone, no ending
    expect(parkingMilestone(bandwagon(480.5), log)).toBeNull();
    expect(flightEnding(bandwagon(480.5), log)).toBeNull();
    const m = parkingMilestone(bandwagon(500), log)!;
    expect(m).toMatchObject({ pe: 200, ap: 588 });
    expect(m.tgo).toBeCloseTo(scheduled + tgo - 500, 6);
    expect(parkingMilestone(bandwagon(3000), log)!.tgo).toBeCloseTo(scheduled + tgo - 3000, 6);
    expect(parkingMilestone(bandwagon(burnStart + 1), log)).toBeNull();
    expect(parkingMilestone(bandwagon(target + 1), log)).toBeNull();
  });

  it('sums the flight up from the final orbit, the payload and the booster, not the parking orbit', () => {
    const s = watchSummary(bandwagon(payload + 11), log);
    expect(s.orbit).toMatchObject({ onTarget: true, at: target });
    // six-DOF: the unrounded apsides the verdict was reached on
    expect(s.orbit!.pe).toBeCloseTo(586.1, 1);
    expect(s.orbit!.ap).toBeCloseTo(594.8, 1);
    expect(s.orbit!.inc).toBeCloseTo(45.4, 6);
    expect(s.payloadAt).toBeCloseTo(payload, 6);
    expect(s.payloadId).toBe('cubesats');
    expect(s.recovery).toEqual([{ name: 'First stage (9× Merlin 1D)', outcome: 'zone', zone: 'LZ-1' }]);
    expect(s.dockingAborted).toBe(false);
  });

  it('does not end on a burn scheduled and never completed, until the flight is closed off target', () => {
    // parking orbit, a burn planned, then the stage stops pointing it (`evt.burnPaused`): no burn pending on the frame
    const events = [ev(480, 'evt.parkingOrbit'), ev(481, 'evt.burnScheduled'), ev(3234, 'evt.burnStart'), ev(3240, 'evt.burnPaused')];
    const coasting = frame({ t: 3300, status: 'coast', nextBurnTime: -1 });
    expect(flightEnding(coasting, events)).toBeNull();
    expect(parkingMilestone(coasting, events)).toBeNull();
    // the flight is closed off target (`evt.burnAlignmentTimeout` → `reachTargetOrbit(el, false)`) with the payload aboard
    const closed = [...events, ev(3400, 'evt.burnAlignmentTimeout'), { ...ev(3400, 'evt.offTargetOrbit'), params: { pe: 205, ap: 590, inc: 45.4 } }];
    expect(flightEnding(frame({ t: 3405, status: 'orbit' }), closed)).toBeNull();
    expect(flightEnding(frame({ t: 3420, status: 'orbit' }), closed)).toBeNull();
    // the payload separates 15 s later; had it never come free, the card would not wait past half a minute
    expect(flightEnding(frame({ t: 3431, status: 'orbit' }), closed)).toBe('orbit');
    const sep = [...closed, ev(3415, 'evt.payloadSep')];
    expect(flightEnding(frame({ t: 3420, status: 'orbit', payloadSeparated: true }), sep)).toBeNull();
    expect(flightEnding(frame({ t: 3426, status: 'orbit', payloadSeparated: true }), sep)).toBe('orbit');
    expect(watchSummary(frame({ t: 3426, status: 'orbit', payloadSeparated: true }), sep).orbit).toMatchObject({ pe: 205, ap: 590, onTarget: false });
  });

  it('still ends a splashdown and an abort as before', () => {
    // a payloadSep in the log does not hold back a ship's splashdown
    expect(flightEnding(frame({ t: 3545, status: 'landed', note: 'splashdown' }), [ev(3540, 'evt.payloadSep')])).toBe('splashdown');
    const abort = { t0: 0, mode: 'tower', phase: 'landed', body: 'capsule', maxG: 10 } as unknown as VisualFrame['abort'];
    expect(flightEnding(frame({ t: 200, status: 'landed', abort }), [ev(195, 'evt.escapeLanded')])).toBeNull();
    expect(flightEnding(frame({ t: 206, status: 'landed', abort }), [ev(195, 'evt.escapeLanded')])).toBe('crewSafe');
  });

  /** Event sequences of two more viewer launches as the app flies them (probe run, 2026-09-27). */
  it('ends Soyuz to the station at its final orbit too, not at the 200 km insertion (A9)', () => {
    // the spacecraft separates in the parking orbit and raises it with two burns of its own
    const soyuz = [
      { ...ev(533.2, 'evt.parkingOrbit'), params: { ap: 200, pe: 198, inc: 51.64 } }, ev(534.4, 'evt.payloadSep'), ev(534.4, 'evt.burnScheduled'),
      ev(679.7, 'evt.burnComplete'), ev(680.9, 'evt.burnScheduled'), ev(3400.3, 'evt.burnComplete'),
      { ...ev(3401.6, 'evt.targetOrbit'), params: { ap: 427, pe: 413, inc: 51.64 } },
    ];
    const after = (t: number, o: Partial<VisualFrame> = {}) => frame({ t, status: 'coast', payloadSeparated: true, ...o });
    expect(flightEnding(after(545), soyuz)).toBeNull();
    expect(parkingMilestone(after(540, { nextBurnTime: 564.4 }), soyuz)).toMatchObject({ pe: 198, ap: 200 });
    expect(flightEnding(after(1500), soyuz)).toBeNull();
    expect(flightEnding(after(3405, { status: 'orbit' }), soyuz)).toBeNull();
    // the payload was already off: the card only settles after the final orbit
    expect(flightEnding(after(3412, { status: 'orbit' }), soyuz)).toBe('orbit');
    expect(watchSummary(after(3412, { status: 'orbit' }), soyuz)).toMatchObject({ orbit: { pe: 413, ap: 427, at: 3401.6 }, payloadAt: 534.4, recovery: [] });
  });

  it('lists every stage flown home by its own touchdown: Falcon Heavy\'s two side boosters and its core', () => {
    const named = (name: string) => ({ ...home('landing', false), name });
    const f = frame({ t: 640, status: 'orbit', payloadSeparated: true, debris: [named('Side boosters'), named('Side boosters'), named('Center core'), { ...home('landing', false), recovery: undefined }] });
    const events = [
      { ...ev(522.2, 'evt.boosterLandedZone'), params: { name: 'Side boosters', zone: 'LZ-1' } },
      { ...ev(522.4, 'evt.boosterLandedZone'), params: { name: 'Side boosters', zone: 'LZ-2' } },
      ev(569.6, 'evt.targetOrbit'), ev(584.6, 'evt.payloadSep'),
      { ...ev(614.6, 'evt.boosterLandedShip'), params: { name: 'Center core' } },
    ];
    expect(flightEnding({ ...f, t: 620 }, events)).toBeNull();
    expect(flightEnding(f, events)).toBe('orbit');
    expect(watchSummary(f, events).recovery).toEqual([
      { name: 'Side boosters', outcome: 'zone', zone: 'LZ-1' },
      { name: 'Side boosters', outcome: 'zone', zone: 'LZ-2' },
      { name: 'Center core', outcome: 'ship' },
    ]);
    // a stage sent home that came down without landing
    const lost = frame({ t: 640, status: 'orbit', debris: [{ ...named('First stage'), outcome: 'impact' } as DebrisFrame] });
    expect(watchSummary(lost, [{ ...ev(600, 'evt.stageImpact'), params: { name: 'First stage' } }]).recovery).toEqual([{ name: 'First stage', outcome: 'lost' }]);
  });
});

/**
 * C01: Vostok-1 from its retro-fire to Gagarin on the ground, on event times
 * like a flight's (illustrative: taken from an earlier point-mass flight in
 * still air with the retro-fire level, not the mission as it now flies): the TDU-1's fuel out at
 * T+4726.4 s, the straps at T+5340 and the cables at T+5344, the module's
 * break-up at T+5582.7, the hatch at T+5841.6 and the seat at T+5843.6, the
 * sphere's braking parachute at T+5860.1, Gagarin's seat separation and main
 * at T+5875.2, the sphere's main at T+5881.7, his reserve at T+6018.6, the
 * sphere down at T+6091.9 and Gagarin down at T+6615.4.
 */
describe('Vostok-1 home: the sphere and Gagarin', () => {
  const log: SimEvent[] = [
    ev(4686.4, 'evt.tduFire'), ev(4726.4, 'evt.retroShortfall'), ev(4728.2, 'evt.retroCutoff'),
    ev(5340, 'evt.vostokStraps'), ev(5344, 'evt.vostokSeparation'), ev(5582.7, 'evt.moduleBreakup'),
    ev(5841.6, 'evt.hatchOff'), ev(5841.6, 'evt.pilotChute'), ev(5843.6, 'evt.ejection'), ev(5860.1, 'evt.escapeDrogue'),
    ev(5875.2, 'evt.seatSeparation'), ev(5877.4, 'evt.pilotMain'), ev(5881.7, 'evt.escapeMain'), ev(6018.6, 'evt.pilotReserve'),
    ev(6091.9, 'evt.capsuleLanding'), { ...ev(6615.4, 'evt.pilotLanding'), params: { speed: 4.7, km: 0.23, lat: 49.925, lon: 44.647 } },
  ];
  const upTo = (t: number): SimEvent[] => log.filter((e) => e.t <= t + 1e-6);
  /** Gagarin `h` m above the ellipsoid at the equator. */
  const pilot = (h: number, alive = true): DebrisFrame => ({
    id: 18, name: 'pilot', r: { x: WGS84_A + h, y: 0, z: 0 }, v: { x: 0, y: 0, z: 0 }, dir: { x: 1, y: 0, z: 0 }, alive, burning: false, createdAt: 5843.6,
    visual: { kind: 'pilot', length: 1.8, diameter: 0.6, color: '#e8641e' }, outcome: alive ? undefined : 'landed',
    crew: { phase: alive ? 'main' : 'landed', stabiliser: 0, main: 1, reserve: 0.6, seat: false, naz: false },
  } as DebrisFrame);
  /** The flight at `t`: the sphere's state as the return has it then, over ground at 0 m. */
  function vostok(t: number, o: { altitude?: number; phase?: string; retro?: number; joint?: string; pilotAboard?: boolean; status?: VisualFrame['status']; debris?: DebrisFrame[] } = {}): VisualFrame {
    const altitude = o.altitude ?? 100e3;
    return frame({
      t, status: o.status ?? 'abort', altitude, altitudeAGL: altitude, note: o.status === 'landed' ? 'vostokLanded' : 'capsuleReturn',
      debris: o.debris ?? [],
      abort: {
        kind: 'return', capsule: 'vostok', mode: 'separation', phase: o.phase ?? 'fall', body: 'capsule', t0: 4684.2, maxG: 9.1, maxGT: 5733,
        motors: { main: 0, control: 0, fairing: 0, softLanding: 0, retro: o.retro ?? 0 }, finsOpen: false, drogue: 0, main: 0, heatShield: false,
        joint: o.joint ?? 'free', pilotAboard: o.pilotAboard ?? true, hatch: o.pilotAboard !== false, cause: 'evt.deorbitPlanned',
      } as unknown as VisualFrame['abort'],
    });
  }
  const at = (f: VisualFrame) => { const beat = watchBeat(f, upTo(f.t)); return { beat, warp: autoWarp(f, beat, upTo(f.t)) }; };

  it('tells the burn, the spin it left, the ten minutes joined, the straps and the cables', () => {
    expect(at(vostok(4700, { altitude: 252e3, retro: 1, joint: 'joined' }))).toEqual({ beat: 'vostokRetro', warp: 5 });
    // the fuel out a second early: no main command, and the oxidiser venting spins the pair; at 2×
    expect(at(vostok(4727, { altitude: 249e3, retro: 0.5, joint: 'joined' }))).toEqual({ beat: 'vostokSpin', warp: 2 });
    expect(at(vostok(4750, { altitude: 247e3, joint: 'joined' }))).toEqual({ beat: 'vostokSpin', warp: 2 });
    expect(at(vostok(4800, { altitude: 240e3, joint: 'joined' }))).toEqual({ beat: 'vostokCoast', warp: 20 });
    // the straps, the few seconds on the cables and their parting: one moment, live
    expect(at(vostok(5341, { altitude: 139e3, joint: 'tethered' }))).toEqual({ beat: 'vostokSeparation', warp: 1 });
    expect(at(vostok(5350, { altitude: 137e3 }))).toEqual({ beat: 'vostokSeparation', warp: 1 });
    expect(at(vostok(5363, { altitude: 133e3 }))).toEqual({ beat: 'vostokSeparation', warp: 1 });
    // then the sphere and the module, apart, toward the air
    expect(at(vostok(5400, { altitude: 125e3 }))).toEqual({ beat: 'vostokApart', warp: 10 });
  });

  it('tells the module breaking up, then the entry, and the hatch and the seat as one moment', () => {
    expect(at(vostok(5590, { altitude: 76e3 }))).toEqual({ beat: 'vostokModuleBurn', warp: 2 });
    expect(at(vostok(5610, { altitude: 71e3 }))).toEqual({ beat: 'vostokEntry', warp: 5 });
    expect(at(vostok(5760, { altitude: 28e3 }))).toEqual({ beat: 'vostokEntry', warp: 2 });
    // the hatch goes first, the seat two seconds later: the ejection from the hatch on, live
    expect(at(vostok(5842, { altitude: 6.9e3 }))).toEqual({ beat: 'vostokEjection', warp: 1 });
    expect(at(vostok(5850, { altitude: 5.6e3, pilotAboard: false }))).toEqual({ beat: 'vostokEjection', warp: 1 });
    // the pilot out and the sphere not yet on its braking parachute: still his moment
    expect(at(vostok(5859.9, { altitude: 4.1e3, pilotAboard: false }))).toEqual({ beat: 'vostokEjection', warp: 1 });
  });

  it('holds Gagarin\'s main over the sphere\'s, then tells the sphere\'s, his reserve, the sphere down', () => {
    const out = { pilotAboard: false };
    expect(at(vostok(5865, { ...out, altitude: 3.6e3, phase: 'drogue', debris: [pilot(4.6e3)] }))).toEqual({ beat: 'vostokDrogue', warp: 2 });
    expect(at(vostok(5876, { ...out, altitude: 2.8e3, phase: 'drogue', debris: [pilot(4e3)] }))).toEqual({ beat: 'vostokPilotMain', warp: 1 });
    // the sphere's main opens at T+5881.7, while his is told
    expect(at(vostok(5885, { ...out, altitude: 2.4e3, phase: 'main', debris: [pilot(3.9e3)] }))).toEqual({ beat: 'vostokPilotMain', warp: 1 });
    expect(at(vostok(5900, { ...out, altitude: 2e3, phase: 'main', debris: [pilot(3.8e3)] }))).toEqual({ beat: 'vostokMain', warp: 20 });
    expect(at(vostok(6025, { ...out, altitude: 700, phase: 'main', debris: [pilot(2.95e3)] }))).toEqual({ beat: 'vostokPilotReserve', warp: 2 });
    expect(at(vostok(6085, { ...out, altitude: 60, phase: 'main', debris: [pilot(2.6e3)] }))).toEqual({ beat: 'vostokMain', warp: 1 });
    // down, with Gagarin still 2.6 km up: the moment live
    expect(at(vostok(6095, { ...out, altitude: 0, phase: 'landed', debris: [pilot(2.58e3)] }))).toEqual({ beat: 'vostokSphereDown', warp: 1 });
  });

  it('follows Gagarin down by his own height, then lands him', () => {
    const down = { pilotAboard: false, altitude: 0, phase: 'landed' };
    expect(at(vostok(6120, { ...down, debris: [pilot(2.4e3)] }))).toEqual({ beat: 'vostokPilotDescent', warp: 20 });
    expect(at(vostok(6540, { ...down, debris: [pilot(350)] }))).toEqual({ beat: 'vostokPilotDescent', warp: 5 });
    expect(at(vostok(6600, { ...down, debris: [pilot(60)] }))).toEqual({ beat: 'vostokPilotDescent', warp: 1 });
    // his height is over the ground the sphere rests on, not over the ellipsoid
    const high = { ...vostok(6540, { ...down, debris: [pilot(350)] }), altitude: 200, altitudeAGL: 0 };
    expect(heightNearFlight(high, crewAloft(high)!.r)).toBeCloseTo(150, 3);
    expect(autoWarp(high, 'vostokPilotDescent', upTo(6540))).toBe(5);
    const landed = vostok(6616, { ...down, status: 'landed', debris: [pilot(0, false)] });
    expect(crewAloft(landed)).toBeNull();
    expect(at(landed)).toEqual({ beat: 'vostokLanding', warp: 1 });
    expect(at({ ...landed, t: 6700 })).toEqual({ beat: 'vostokLanding', warp: 1 });
  });

  it('ends only once Gagarin is down, and a few seconds after', () => {
    const down = { pilotAboard: false, altitude: 0, phase: 'landed' };
    // the sphere down for minutes, the flight still waiting for him ('abort')
    expect(flightEnding(vostok(6200, { ...down, debris: [pilot(2e3)] }), log)).toBeNull();
    const landed = (t: number) => vostok(t, { ...down, status: 'landed', debris: [pilot(0, false)] });
    expect(flightEnding(landed(6620), log)).toBeNull();
    expect(flightEnding(landed(6625.5), log)).toBe('splashdown');
    // the sphere's landing alone never ends a flight whose pilot flew on his own
    expect(flightEnding(landed(6625.5), upTo(6600))).toBeNull();
    // a recording made before Gagarin flew on his own ends with the sphere
    const old = log.filter((e) => e.key !== 'evt.pilotLanding');
    expect(flightEnding(vostok(6105, { ...down, status: 'landed' }), old)).toBe('splashdown');
    expect(flightEnding(vostok(6100, { ...down, status: 'landed' }), old)).toBeNull();
  });

  it('gives the end card both landings, each at its own time and place', () => {
    const f = { ...vostok(6626, { pilotAboard: false, altitude: 0, phase: 'landed', status: 'landed', debris: [pilot(0, false)] }), lat: 49.927, lon: 44.648 };
    expect(vostokLandings(f, log)).toEqual({
      sphere: { t: 6091.9, lat: 49.927, lon: 44.648 },
      pilot: { t: 6615.4, lat: 49.925, lon: 44.647, km: 0.23 },
    });
    // before he is down, and in a recording without him: the sphere alone
    expect(vostokLandings({ ...f, t: 6200 }, log).pilot).toBeNull();
    expect(vostokLandings(f, log.filter((e) => e.key !== 'evt.pilotLanding'))).toMatchObject({ sphere: { t: 6091.9 }, pilot: null });
  });

  it('has a label and a sentence for every beat of the way home, and never says the module burned up whole', () => {
    const home: WatchBeat[] = ['vostokSpin', 'vostokApart', 'vostokModuleBurn', 'vostokDrogue', 'vostokPilotMain', 'vostokMain',
      'vostokPilotReserve', 'vostokSphereDown', 'vostokPilotDescent', 'vostokLanding'];
    for (const b of home) {
      expect(en[WATCH_BEATS[b].label]).toBeTruthy();
      expect(en[WATCH_BEATS[b].text]).toBeTruthy();
    }
    // it breaks apart; what burns is told per piece (the lightest), as the model flies them, never the module whole
    expect(en['watch.say.vostokModuleBurn']).toMatch(/breaks apart/);
    expect(en['watch.say.vostokModuleBurn']).not.toMatch(/breaks apart and burns|burns? up|burned up/);
  });

  it('tells 1961\'s places and distances as 1961\'s, in every language: the model\'s own are the HUD\'s and the end card\'s', () => {
    // the 1.5 km, the ravine above the Volga and the first to meet him are history; the model's Gagarin comes down
    // 5.5 km from its sphere and some 30 km from the monument (docs/PHYSICS.md §13.6)
    const year = { en: /In 1961/, ru: /В 1961 году/, th: /ในปี 1961/ };
    for (const lang of ['en', 'ru', 'th'] as const) {
      for (const key of ['watch.say.vostokSphereDown', 'watch.say.vostokLanding']) expect(tFor(lang, key), `${lang} ${key}`).toMatch(year[lang]);
    }
    // both the report's distance and Gagarin's own, in the narration and on the end card
    expect(en['watch.say.vostokLanding']).toMatch(/one and a half kilometres from the sphere by OKB-1's report, about four by his own reckoning/);
    for (const lang of ['en', 'ru', 'th'] as const) expect(tFor(lang, 'watch.end.vostokFact'), lang).toMatch(/1[.,]5 (km|км|กม\.).*4 (km|км|กม\.)/);
    // nothing on screen is said to lie below him that the model does not put there
    expect(en['watch.say.vostokPilotDescent']).not.toMatch(/Below him/);
    expect(tFor('ru', 'watch.say.vostokPilotDescent')).not.toMatch(/Под ним/);
    expect(tFor('th', 'watch.say.vostokPilotDescent')).not.toMatch(/เบื้องล่างคือ/);
    // Anna Takhtarova as every source has her, the local forester's wife (Gagarin's report; RussianSpaceWeb; KP 2011)
    expect(en['watch.say.vostokLanding']).toMatch(/Anna Takhtarova, the local forester's wife/);
    expect(tFor('ru', 'watch.say.vostokLanding')).toMatch(/жена местного лесника Анна Тахтарова/);
    expect(tFor('th', 'watch.say.vostokLanding')).toMatch(/อันนา ทัคทาโรวา ภรรยาของเจ้าหน้าที่ป่าไม้ในท้องถิ่น/);
  });
});
