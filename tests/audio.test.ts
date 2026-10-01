/** Sound (roadmap V01): the acoustics, and when an event's sound reaches the camera. */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  FLOOR_LEVEL, GROUND_REFLECTION, MAX_REFLECTION_DELAY, REFERENCE_LEVEL, REFLECTION_FADE, REVERB_FAR, REVERB_NEAR, SPEED_OF_SOUND_0,
  absorptionCutoff, dopplerFactor, gainForLevel, groundReflection, retardedTime, reverbSend, soundPowerLevel, soundPressureLevel, toHead,
  warpGain,
} from '../src/audio/acoustics';
import { MAX_VOICES, assignVoices, type HeardSource } from '../src/audio/engine-sound';
import { LaunchAudio, inAir } from '../src/audio/launch-audio';
import { CRACKLE_RMS, REVERB_PRE_DELAY, crackleSamples, outdoorImpulse } from '../src/audio/waveforms';
import { OMEGA_EARTH, R_EARTH } from '../src/physics/constants';
import type { VisualFrame } from '../src/physics/frame';
import { mulberry32 } from '../src/physics/sim/seed';
import type { SimEvent } from '../src/physics/simulation';

/** Mean, RMS and skewness of a signal. */
function moments(a: ArrayLike<number>): { mean: number; rms: number; skewness: number } {
  let mean = 0;
  for (let i = 0; i < a.length; i++) mean += a[i];
  mean /= a.length;
  let m2 = 0, m3 = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - mean; m2 += d * d; m3 += d * d * d; }
  m2 /= a.length; m3 /= a.length;
  return { mean, rms: Math.sqrt(m2), skewness: m3 / m2 ** 1.5 };
}

function energy(a: Float32Array, from: number, to: number, sampleRate: number): number {
  let e = 0;
  for (let i = Math.round(from * sampleRate); i < Math.min(a.length, Math.round(to * sampleRate)); i++) e += a[i] * a[i];
  return e;
}

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

describe('where the sound comes from (V01)', () => {
  it("hears the ground's echo late by the difference of the paths, and splits the power between the two", () => {
    // a rocket 1 km up, 5 km away, a listener 2 m above the ground
    const p = groundReflection(5000, 1000, 2);
    const image = Math.sqrt(5000 ** 2 + 4 * 1000 * 2);
    expect(p.delay).toBeCloseTo((image - 5000) / SPEED_OF_SOUND_0, 9);
    expect(p.delay * SPEED_OF_SOUND_0).toBeCloseTo((2 * 1000 * 2) / 5000, 2); // ≈ 2·h_s·h_l / r far away
    expect(p.direct ** 2 + p.reflected ** 2).toBeCloseTo(1, 12);
    expect(p.reflected / p.direct).toBeCloseTo(GROUND_REFLECTION * 5000 / image, 9);
    // on the pad the two paths are the same: in phase, the echo as strong as the ground lets it be
    const pad = groundReflection(5000, 0, 2);
    expect(pad.delay).toBe(0);
    expect(pad.reflected / pad.direct).toBeCloseTo(GROUND_REFLECTION, 9);
  });

  it('plays no ground echo for a camera in the air, or without heights', () => {
    const [low, high] = REFLECTION_FADE;
    expect(groundReflection(5000, 1000, low).reflected).toBeGreaterThan(0.5);
    expect(groundReflection(5000, 1000, (low + high) / 2).reflected).toBeLessThan(groundReflection(5000, 1000, low).reflected);
    expect(groundReflection(5000, 1000, high)).toEqual({ delay: expect.any(Number), direct: 1, reflected: 0 });
    expect(groundReflection(5000, NaN, 2)).toEqual({ delay: 0, direct: 1, reflected: 0 });
    expect(groundReflection(1e6, 1e5, 100).delay).toBeLessThanOrEqual(MAX_REFLECTION_DELAY);
  });

  it('sends more of the sound to the outdoor reverberation the farther it is', () => {
    const ranges = [0, 500, 5000, 30000, 300000];
    const send = ranges.map(reverbSend);
    for (let i = 1; i < send.length; i++) expect(send[i]).toBeGreaterThan(send[i - 1]);
    expect(send[0]).toBeCloseTo(REVERB_NEAR, 9);
    expect(send[send.length - 1]).toBeLessThan(REVERB_FAR);
    expect(20 * Math.log10(reverbSend(5000))).toBeCloseTo(-13, 0);
  });

  it('turns a direction into the head of a three.js camera', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.up.set(0, 0, 1);
    camera.position.set(1, 2, 3);
    camera.lookAt(4, -2, 5);
    for (const d of [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0.3, y: -0.5, z: 0.81 }]) {
      const want = new THREE.Vector3(d.x, d.y, d.z).applyQuaternion(camera.quaternion.clone().invert());
      const got = toHead(d, camera.quaternion);
      expect(got.x).toBeCloseTo(want.x, 12);
      expect(got.y).toBeCloseTo(want.y, 12);
      expect(got.z).toBeCloseTo(want.z, 12);
    }
    // what it looks at is straight ahead: −z
    const ahead = new THREE.Vector3(3, -4, 2).normalize();
    const h = toHead(ahead, camera.quaternion);
    expect(h.z).toBeCloseTo(-1, 12);
  });

  it('keeps a source on its voice, gives a new one a free voice, and leaves the quietest out', () => {
    expect(assignVoices([null, null, null], ['vehicle'])).toEqual(['vehicle', null, null]);
    // the vehicle stays where it was although a booster is now louder
    expect(assignVoices([null, 'vehicle', null], ['debris:1', 'vehicle'])).toEqual(['debris:1', 'vehicle', null]);
    // a source gone frees its voice
    expect(assignVoices(['debris:1', 'vehicle', null], ['vehicle', 'debris:2'])).toEqual(['debris:2', 'vehicle', null]);
    // more sources than voices: the quietest is not heard, and the newcomer takes its voice
    expect(assignVoices(['a', 'b'], ['c', 'a', 'b'])).toEqual(['a', 'c']);
    expect(MAX_VOICES).toBeGreaterThanOrEqual(4); // a Falcon Heavy's three cores and its upper stage
  });
});

describe("the sound's waveforms (V01)", () => {
  const sampleRate = 48000;

  it('crackles: a pressure skewness above 0.4 (Ffowcs Williams, Simson & Virchis 1975), no net pressure', () => {
    const x = crackleSamples(sampleRate * 6, sampleRate, mulberry32(7));
    const m = moments(x);
    expect(m.skewness).toBeGreaterThan(0.4);
    expect(Math.abs(m.mean)).toBeLessThan(1e-6);
    expect(m.rms).toBeCloseTo(CRACKLE_RMS, 6);
    // the shocks are sudden rises and slow falls: the slope is skewed far more
    const slope = x.slice(1).map((v, i) => v - x[i]);
    expect(moments(slope).skewness).toBeGreaterThan(2);
    expect(crackleSamples(0, sampleRate, mulberry32(1))).toHaveLength(0);
  });

  it('crackles the same from the same seed, differently from another', () => {
    const a = crackleSamples(4800, sampleRate, mulberry32(3)), b = crackleSamples(4800, sampleRate, mulberry32(3)), c = crackleSamples(4800, sampleRate, mulberry32(4));
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(Array.from(a)).not.toEqual(Array.from(c));
  });

  it('reverberates outdoors: silent before the first echo, unit energy, dying away, the two ears decorrelated', () => {
    const [left, right] = outdoorImpulse(sampleRate, mulberry32(3));
    for (const h of [left, right]) {
      expect(energy(h, 0, REVERB_PRE_DELAY - 1e-3, sampleRate)).toBe(0);
      expect(energy(h, 0, 10, sampleRate)).toBeCloseTo(1, 6);
      expect(energy(h, 1.5, 3.2, sampleRate)).toBeLessThan(1e-3 * energy(h, 0, 0.5, sampleRate));
      expect(h.every(Number.isFinite)).toBe(true);
    }
    let corr = 0;
    for (let i = 0; i < left.length; i++) corr += left[i] * right[i];
    expect(Math.abs(corr)).toBeLessThan(0.1);
  });
});

describe('what the camera hears from where (V01)', () => {
  // the ground at sea level; a camera 2 m above it; a rocket 1 km up, 5 km away along +y
  const listener = { x: R_EARTH + 2, y: 0, z: 0 };
  const rocket = { r: { x: R_EARTH + 1000, y: 5000, z: 0 }, v: { x: 100, y: 0, z: 0 }, thrust: 7.6e6, throttle: 1, pressure: 90000,
    altitude: 1000, altitudeAGL: 1000, destroyed: false, debris: [] } as unknown as VisualFrame;

  function capture(orientation?: THREE.Quaternion) {
    const audio = new LaunchAudio();
    audio.sound.setEnabled(true);
    let heard: readonly HeardSource[] = [];
    (audio.sound as unknown as { update: (s: readonly HeardSource[]) => void }).update = (s) => { heard = s; };
    audio.update({ t: 30, frameAt: () => rocket, events: [], listener, warp: 4, playing: true, onboard: false, orientation });
    return heard;
  }

  it('hands each source over with its id, its direction in the head and both heights', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.up.set(1, 0, 0);
    camera.position.set(listener.x, listener.y, listener.z);
    camera.lookAt(listener.x, listener.y + 1, listener.z); // facing the pad, level
    const [s] = capture(camera.quaternion);
    expect(s.id).toBe('vehicle');
    const elevation = Math.atan2(998, 5000);
    expect(s.direction!.x).toBeCloseTo(0, 9);
    expect(s.direction!.y).toBeCloseTo(Math.sin(elevation), 6); // above the horizon
    expect(s.direction!.z).toBeCloseTo(-Math.cos(elevation), 6); // ahead
    expect(s.heights!.listener).toBeCloseTo(2, 6);
    expect(s.heights!.source).toBeCloseTo(1000 + 5000 ** 2 / (2 * R_EARTH), 1);
  });

  it('hears a source on the right on the right, and without a camera from ahead', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.up.set(1, 0, 0);
    camera.position.set(listener.x, listener.y, listener.z);
    camera.lookAt(listener.x, listener.y, listener.z + 1); // the pad is now on the right
    expect(capture(camera.quaternion)[0].direction!.x).toBeGreaterThan(0.9);
    expect(capture()[0].direction).toBeUndefined();
  });
});

describe('the air turns with the Earth (V01)', () => {
  /** A point fixed on the equator at longitude `lon` (rad), in ECI at time t: position and velocity. */
  const onGround = (lon: number, t: number, height = 0) => {
    const a = lon + OMEGA_EARTH * t, r = R_EARTH + height;
    return { r: { x: r * Math.cos(a), y: r * Math.sin(a), z: 0 }, v: { x: -OMEGA_EARTH * r * Math.sin(a), y: OMEGA_EARTH * r * Math.cos(a), z: 0 } };
  };

  it('carries a point on the ground to where it is later, at rest in the air', () => {
    const then = onGround(0.3, 10), later = onGround(0.3, 25);
    const air = inAir(then.r, then.v, 15);
    expect(Math.hypot(air.r.x - later.r.x, air.r.y - later.r.y, air.r.z - later.r.z)).toBeLessThan(1e-6);
    expect(Math.hypot(air.v.x, air.v.y, air.v.z)).toBeLessThan(1e-9);
    // the frames' own velocity is the Earth's 465 m/s at the equator
    expect(Math.hypot(then.v.x, then.v.y)).toBeCloseTo(OMEGA_EARTH * R_EARTH, 6);
  });

  /** A pad on the equator and a listener 2 m up, `range` m west (−) or east (+) of it, both turning with the Earth. */
  function pad(range: number) {
    const lonL = range / R_EARTH;
    const frameAt = (t: number) => {
      const g = onGround(0, t);
      return { t, r: g.r, v: g.v, thrust: 7.6e6, throttle: 1, pressure: 101325, altitude: 0, altitudeAGL: 0, destroyed: false, debris: [] } as unknown as VisualFrame;
    };
    const listenerAt = (t: number) => onGround(lonL, t, 2).r;
    const chord = 2 * R_EARTH * Math.sin(Math.abs(lonL) / 2);
    return { frameAt, listenerAt, chord };
  }

  for (const [side, range] of [['west', -3403], ['east', 3403]] as const) {
    it(`hears a separation on the pad from 3.4 km ${side} of it 10 s later, as it would on a still Earth`, () => {
      const { frameAt, listenerAt, chord } = pad(range);
      const audio = new LaunchAudio();
      audio.sound.setEnabled(true);
      const cues: number[] = [];
      (audio.sound as unknown as { cue: (...a: unknown[]) => void }).cue = () => cues.push(1);
      (audio.sound as unknown as { update: () => void }).update = () => {};
      const events: SimEvent[] = [{ t: 10, key: 'evt.stageSep', severity: 'info' }];
      const at = (t: number) => audio.update({ t, frameAt, events, listener: listenerAt(t), warp: 1, playing: true, onboard: false });
      const arrival = 10 + chord / SPEED_OF_SOUND_0;
      at(-10);
      for (let t = 0; t < arrival - 0.05; t += 0.05) at(t);
      expect(cues).toHaveLength(0);
      at(arrival + 0.05);
      expect(cues).toHaveLength(1);
    });
  }

  it('hears a rocket standing on the pad at its own pitch: no Doppler from the Earth turning', () => {
    const { frameAt, listenerAt } = pad(-5000);
    const audio = new LaunchAudio();
    audio.sound.setEnabled(true);
    let heard: readonly HeardSource[] = [];
    (audio.sound as unknown as { update: (s: readonly HeardSource[]) => void }).update = (s) => { heard = s; };
    audio.update({ t: 40, frameAt, events: [], listener: listenerAt(40), warp: 1, playing: true, onboard: false });
    expect(heard).toHaveLength(1);
    expect(Math.abs(heard[0].radialSpeed)).toBeLessThan(1e-6);
    expect(heard[0].distance).toBeCloseTo(5000, 0);
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

  it('is heard once by a camera drifting away from where it happened', () => {
    const audio = new LaunchAudio();
    audio.sound.setEnabled(true);
    const cues: number[] = [];
    (audio.sound as unknown as { cue: (...a: unknown[]) => void }).cue = () => cues.push(1);
    (audio.sound as unknown as { update: () => void }).update = () => {};
    // the camera backs away at 100 m/s: each frame the separation's sound has a little farther to go
    for (let t = -10; t < 40; t += 1 / 60) {
      audio.update({ t, frameAt: () => frame, events, listener: { x: -100 * Math.max(0, t), y: 0, z: 0 }, warp: 1, playing: true, onboard: false });
    }
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

describe('launch broadcasts (V01)', () => {
  it('plays the broadcast in step with the mission clock, re-cued only when it drifts', async () => {
    const { soundtrackAction, MAX_DRIFT } = await import('../src/audio/soundtrack');
    const base = { t: 5, warp: 1, playing: true, enabled: true, t0: 60, duration: 600, currentTime: 65, paused: false };
    expect(soundtrackAction(base)).toEqual({ kind: 'play', seek: null, rate: 1 });
    expect(soundtrackAction({ ...base, currentTime: 65 + MAX_DRIFT * 2 })).toEqual({ kind: 'play', seek: 65, rate: 1 });
    expect(soundtrackAction({ ...base, paused: true })).toEqual({ kind: 'play', seek: 65, rate: 1 });
    // a small drift is eased out: behind, a little faster; ahead, a little slower
    const behind = soundtrackAction({ ...base, currentTime: 64.5 }), ahead = soundtrackAction({ ...base, currentTime: 65.5 });
    expect(behind.kind === 'play' && behind.seek === null && behind.rate > 1 && behind.rate <= 1.06).toBe(true);
    expect(ahead.kind === 'play' && ahead.seek === null && ahead.rate < 1 && ahead.rate >= 0.94).toBe(true);
    // the countdown: T-10 s is 50 s into the recording
    expect(soundtrackAction({ ...base, t: -10, currentTime: 0, paused: true })).toEqual({ kind: 'play', seek: 50, rate: 1 });
  });

  it('is silent in warped time, paused, switched off, and outside the recording', async () => {
    const { soundtrackAction } = await import('../src/audio/soundtrack');
    const base = { t: 5, warp: 1, playing: true, enabled: true, t0: 60, duration: 600, currentTime: 65, paused: false };
    for (const o of [{ warp: 10 }, { playing: false }, { enabled: false }, { t: -70 }, { t: 545 }]) {
      expect(soundtrackAction({ ...base, ...o }), JSON.stringify(o)).toEqual({ kind: 'pause' });
    }
  });

  it('bundles only the NASA broadcast, with its liftoff 60 s in', async () => {
    const { BUNDLED_SOUNDTRACKS } = await import('../src/audio/soundtrack');
    expect(Object.keys(BUNDLED_SOUNDTRACKS)).toEqual(['soyuzIss']);
    expect(BUNDLED_SOUNDTRACKS.soyuzIss).toMatchObject({ url: 'audio/soyuz-ms-27-nasa.mp3', t0: 60 });
  });

  it('reads the liftoff time of a recording as m:ss, h:mm:ss or seconds', async () => {
    const { parseOffset, formatOffset } = await import('../src/ui/soundtrack-panel');
    expect(parseOffset('1:07:11')).toBe(4031);
    expect(parseOffset('67:11')).toBe(4031);
    expect(parseOffset('12.5')).toBe(12.5);
    expect(parseOffset('1:xx')).toBeNull();
    expect(parseOffset('')).toBeNull();
    expect(formatOffset(4031)).toBe('1:07:11');
    expect(formatOffset(65)).toBe('1:05');
  });
});
