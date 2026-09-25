/** Sound (roadmap V01): the acoustics, and when an event's sound reaches the camera. */
import { describe, expect, it } from 'vitest';
import {
  FLOOR_LEVEL, REFERENCE_LEVEL, SPEED_OF_SOUND_0, absorptionCutoff, dopplerFactor, gainForLevel, retardedTime,
  soundPowerLevel, soundPressureLevel, warpGain,
} from '../src/audio/acoustics';
import { LaunchAudio } from '../src/audio/launch-audio';
import type { VisualFrame } from '../src/physics/frame';
import type { SimEvent } from '../src/physics/simulation';

describe('acoustics (V01)', () => {
  it('puts a Saturn V at about 204 dB of sound power and 120 dB at the press site, 5 km out', () => {
    expect(soundPowerLevel(34e6, 2600)).toBeGreaterThan(202);
    expect(soundPowerLevel(34e6, 2600)).toBeLessThan(205);
    const at5km = soundPressureLevel(34e6, 5000, 101325, 2600);
    expect(at5km).toBeGreaterThan(117);
    expect(at5km).toBeLessThan(124);
    // 6 dB less at twice the distance
    expect(soundPressureLevel(34e6, 10000, 101325, 2600)).toBeCloseTo(at5km - 6.02, 1);
  });

  it('goes quiet as the air thins, and silent above it or with the engines off', () => {
    const sea = soundPressureLevel(7.6e6, 20000, 101325);
    expect(soundPressureLevel(7.6e6, 20000, 10132.5)).toBeCloseTo(sea - 10, 5);
    expect(soundPressureLevel(7.6e6, 20000, 0.5)).toBe(-Infinity);
    expect(soundPressureLevel(0, 1000, 101325)).toBe(-Infinity);
  });

  it('maps levels to gain around the reference', () => {
    expect(gainForLevel(REFERENCE_LEVEL)).toBeCloseTo(1, 9);
    expect(gainForLevel(REFERENCE_LEVEL - 20)).toBeCloseTo(0.1, 9);
    expect(gainForLevel(FLOOR_LEVEL - 1)).toBe(0);
    expect(gainForLevel(-Infinity)).toBe(0);
    expect(gainForLevel(200)).toBeLessThanOrEqual(1.6);
  });

  it('lets less of the treble through the farther it goes', () => {
    const ranges = [10, 1000, 10000, 50000, 200000];
    const cut = ranges.map(absorptionCutoff);
    for (let i = 1; i < cut.length; i++) expect(cut[i]).toBeLessThan(cut[i - 1]);
    expect(cut[0]).toBeLessThanOrEqual(9000);
    expect(cut[cut.length - 1]).toBeGreaterThanOrEqual(120);
  });

  it('hears a receding source late: the retarded time, and a lower pitch', () => {
    const c = SPEED_OF_SOUND_0;
    const d = (tau: number) => 1000 + 100 * tau;
    const t = 30;
    expect(retardedTime(t, d)).toBeCloseTo((t - 1000 / c) / (1 + 100 / c), 3);
    expect(dopplerFactor(100)).toBeLessThan(1);
    expect(dopplerFactor(-100)).toBeGreaterThan(1);
    expect(dopplerFactor(0)).toBe(1);
  });

  it('plays real time as heard, warped time quieter and without the delay, a paused flight not at all', () => {
    expect(warpGain(1, true)).toEqual({ gain: 1, delayed: true });
    expect(warpGain(4, true).delayed).toBe(false);
    expect(warpGain(4, true).gain).toBeLessThan(1);
    expect(warpGain(1000, true).gain).toBe(0);
    expect(warpGain(1, false).gain).toBe(0);
  });
});

describe('event sounds (V01)', () => {
  /** A vehicle standing 3 403 m from the listener: its sound takes 10 s to arrive. */
  const distance = SPEED_OF_SOUND_0 * 10;
  const frame = { r: { x: distance, y: 0, z: 0 }, v: { x: 0, y: 0, z: 0 }, thrust: 0, throttle: 0, pressure: 101325, destroyed: false, debris: [] } as unknown as VisualFrame;
  const events: SimEvent[] = [{ t: 10, key: 'evt.stageSep', severity: 'info' }];

  function listen() {
    const audio = new LaunchAudio();
    audio.sound.setEnabled(true); // no AudioContext under test: only the timing runs
    const cues: number[] = [];
    (audio.sound as unknown as { cue: (...a: unknown[]) => void }).cue = () => cues.push(1);
    const at = (t: number, warp = 1) => audio.update({
      t, frameAt: () => frame, events, listener: { x: 0, y: 0, z: 0 }, warp, playing: true, onboard: false,
    });
    return { audio, cues, at };
  }

  it('arrives at the speed of sound, once', () => {
    const { cues, at } = listen();
    at(-10);
    at(15);
    expect(cues).toHaveLength(0); // the separation happened at T+10, its sound is still on its way
    at(20.5);
    expect(cues).toHaveLength(1);
    at(25);
    expect(cues).toHaveLength(1);
  });

  it('is heard again after scrubbing back before it', () => {
    const { cues, at } = listen();
    at(-10); at(21); at(5); at(21);
    expect(cues).toHaveLength(2);
  });

  it('arrives with its event when time is warped', () => {
    const { cues, at } = listen();
    at(-10, 4); at(10.5, 4);
    expect(cues).toHaveLength(1);
  });

  it('does not replay a whole flight when opened half-way through it', () => {
    const { cues, at } = listen();
    at(300);
    expect(cues).toHaveLength(0);
  });
});
