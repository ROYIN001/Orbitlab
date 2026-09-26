/**
 * The sound upgrade: launch control's calls (Russian rockets in Russian on a
 * page in Russian, real recordings where they are free to share), the mix,
 * each rocket's character, stereo placement and the ground's reflection.
 */
import { describe, expect, it } from 'vitest';
import { CalloutVoice, RU_CLIPS, STALE_AFTER, calloutLang, calloutScript, dueCallouts, pickVoice } from '../src/audio/callouts';
import { DEFAULT_MIX, loadMix, saveMix, sliderGain } from '../src/audio/mix';
import { NEUTRAL_PROFILE, soundProfile } from '../src/audio/profile';
import { crackleSamples, mixFor, type HeardSource } from '../src/audio/engine-sound';
import { panFor, reflectionFor } from '../src/audio/launch-audio';
import { VEHICLES } from '../src/data/vehicles';
import type { SimEvent } from '../src/physics/simulation';

const ev = (t: number, key: string, params?: SimEvent['params']): SimEvent => ({ t, key, params, severity: 'info' });
const vehicle = (id: string) => VEHICLES.find((v) => v.id === id)!;

describe('launch control’s calls', () => {
  const soyuz: SimEvent[] = [
    ev(0.4, 'evt.liftoff'), ev(118, 'evt.boosterSep', { name: 'Blok B/V/G/D boosters' }), ev(160, 'evt.fairingSep'),
    ev(287, 'evt.stageSep', { n: 1 }), ev(528, 'evt.payloadSep', { name: 'Soyuz MS' }),
  ];

  it('calls a Russian rocket in Russian only on a page in Russian', () => {
    expect(calloutLang('ru', 'RU')).toBe('ru');
    expect(calloutLang('en', 'RU')).toBe('en');
    expect(calloutLang('th', 'RU')).toBe('en');
    expect(calloutLang('ru', 'US')).toBe('en');
  });

  it('counts a Soyuz down the way Baikonur does, in order, and names the stages the Russian way', () => {
    const s = calloutScript(soyuz, 'ru', { boosters: true, r7: true });
    const texts = s.map((c) => c.text);
    const order = ['Пуск.', 'Зажигание.', 'Предварительная.', 'Промежуточная.', 'Главная.', 'Подъём!', 'Контакт подъёма есть.'];
    expect(texts.slice(0, order.length)).toEqual(order);
    expect(s.every((c, i) => i === 0 || c.t >= s[i - 1].t)).toBe(true);
    expect(s[0].t).toBeGreaterThanOrEqual(-10); // the simulator's count starts at T-10 s
    expect(texts).toContain('Отделение боковых блоков.');
    expect(texts).toContain('Сброс головного обтекателя.');
    // with strap-ons the core is the second stage
    expect(texts).toContain('Отделение второй ступени.');
  });

  it('plays the real recordings where it has them: the umbilical, the R-7’s flight reports, the orbit', () => {
    const s = calloutScript(soyuz, 'ru', { boosters: true, r7: true });
    const clip = (url: string) => s.find((c) => c.clip === url);
    expect(clip(RU_CLIPS.contact)!.t).toBeCloseTo(0.4 + 1.6, 6);
    expect(clip(RU_CLIPS.t170)!.t).toBeCloseTo(170.4, 6);
    expect(clip(RU_CLIPS.t180)!.t).toBeCloseTo(180.4, 6);
    expect(clip(RU_CLIPS.t190)!.t).toBeCloseTo(190.4, 6);
    expect(clip(RU_CLIPS.orbit)!.t).toBeGreaterThan(528);
    // the synthesised "выведен на расчётную орбиту" gives way to the recording
    const withOrbit = calloutScript([...soyuz, ev(530, 'evt.targetOrbit')], 'ru', { boosters: true, r7: true });
    expect(withOrbit.some((c) => c.text.startsWith('Космический аппарат выведен'))).toBe(false);
  });

  it('never reports a normal flight that is not: after a failure, past the core, or on another rocket', () => {
    const lost = calloutScript([...soyuz.slice(0, 2), ev(175, 'evt.vehicleLost')], 'ru', { boosters: true, r7: true });
    expect(lost.some((c) => c.clip === RU_CLIPS.t170)).toBe(true);
    expect(lost.some((c) => c.clip === RU_CLIPS.t180 || c.clip === RU_CLIPS.t190)).toBe(false);
    const earlyCore = calloutScript([ev(0, 'evt.liftoff'), ev(185, 'evt.stageSep', { n: 1 })], 'ru', { boosters: true, r7: true });
    expect(earlyCore.filter((c) => c.clip && c.clip !== RU_CLIPS.contact).map((c) => c.clip)).toEqual([RU_CLIPS.t170, RU_CLIPS.t180]);
    const proton = calloutScript(soyuz, 'ru', { boosters: false, r7: false });
    expect(proton.some((c) => c.clip === RU_CLIPS.t170)).toBe(false);
    // the umbilical is every Russian rocket's
    expect(proton.some((c) => c.clip === RU_CLIPS.contact)).toBe(true);
  });

  it('counts other rockets down in English, ten to one, then liftoff', () => {
    const s = calloutScript([ev(0, 'evt.liftoff'), ev(72, 'evt.maxQ'), ev(150, 'evt.meco')], 'en', { boosters: false });
    expect(s.map((c) => c.text).slice(0, 12)).toEqual([
      'T-minus ten.', 'nine.', 'eight.', 'seven.', 'six.', 'five.', 'four.', 'three.', 'two.', 'one.', 'Zero. Liftoff!', 'Vehicle is passing through max-Q.',
    ]);
    expect(s.find((c) => c.text === 'one.')!.t).toBe(-1);
    expect(s.some((c) => c.clip)).toBe(false);
  });

  it('stops the count at a fire on the pad', () => {
    const s = calloutScript([ev(-5, 'evt.padFire')], 'en', { boosters: false });
    expect(s.filter((c) => c.t >= -5).map((c) => c.text)).toEqual(['Hold, hold, hold. Fire on the pad.']);
  });

  it('says each call once, on time, skips stale ones and nothing when scrubbed back', () => {
    const script = calloutScript([ev(0, 'evt.liftoff')], 'en', { boosters: false });
    expect(dueCallouts(script, -3.05, -1.95).map((c) => c.text)).toEqual(['three.', 'two.']);
    expect(dueCallouts(script, -1.95, -0.9).map((c) => c.text)).toEqual(['one.']);
    // opened late (a jump): the calls longer ago than STALE_AFTER are dropped
    expect(dueCallouts(script, -10.5, -1 + STALE_AFTER / 2).map((c) => c.text)).toEqual(['one.']);
    expect(dueCallouts(script, 5, 2)).toEqual([]);
  });

  it('picks the browser voice for the language, a local one first', () => {
    const v = (lang: string, localService: boolean, name = lang) => ({ lang, localService, name } as SpeechSynthesisVoice);
    const voices = [v('en-GB', false), v('ru-RU', false, 'net'), v('ru-RU', true, 'local'), v('en-US', true)];
    expect(pickVoice(voices, 'ru')!.name).toBe('local');
    expect(pickVoice(voices, 'en')!.lang).toBe('en-US');
    expect(pickVoice([v('th-TH', true)], 'ru')).toBeNull();
    expect(pickVoice([v('ru_RU', false)], 'ru')!.lang).toBe('ru_RU');
  });
});

describe('launch control’s voice in the browser', () => {
  it('speaks each call once, in real time, and a speech engine that throws never stops the flight', () => {
    const said: string[] = [];
    const voices = [{ lang: 'en-US', localService: true, name: 'en' }] as SpeechSynthesisVoice[];
    class Utterance {
      lang = ''; rate = 1; volume = 1;
      constructor(readonly text: string) {}
      set voice(_v: unknown) { throw new TypeError('not a SpeechSynthesisVoice'); }
    }
    const g = globalThis as Record<string, unknown>;
    const saved = { s: g.speechSynthesis, u: g.SpeechSynthesisUtterance };
    g.speechSynthesis = { speaking: false, pending: false, getVoices: () => voices, cancel: () => {}, addEventListener: () => {}, speak: (u: Utterance) => said.push(u.text) };
    g.SpeechSynthesisUtterance = Utterance;
    try {
      const v = new CalloutVoice();
      v.setScript(calloutScript([ev(0, 'evt.liftoff')], 'en', { boosters: false }), 'en');
      expect(v.available).toBe(true);
      for (let t = -10.5; t <= 1; t += 0.25) expect(() => v.update(t, true)).not.toThrow();
      expect(said).toEqual(['T-minus ten.', 'nine.', 'eight.', 'seven.', 'six.', 'five.', 'four.', 'three.', 'two.', 'one.', 'Zero. Liftoff!']);
      // warped or paused: silent, and it does not catch up afterwards
      v.reset(); said.length = 0;
      v.update(-10.5, false); v.update(-2.5, false); v.update(-2.4, true); v.update(-1.9, true);
      expect(said).toEqual(['two.']);
    } finally {
      g.speechSynthesis = saved.s;
      g.SpeechSynthesisUtterance = saved.u;
    }
  });
});

describe('the mix', () => {
  it('keeps the listener’s mix, clamped, and defaults what it cannot read', () => {
    const store = new Map<string, string>();
    const s = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    expect(loadMix(s)).toEqual(DEFAULT_MIX);
    saveMix({ engine: 0.3, voice: 0.7, callouts: false }, s);
    expect(loadMix(s)).toEqual({ engine: 0.3, voice: 0.7, callouts: false });
    store.set('orbitlab.soundMix', JSON.stringify({ engine: 4, voice: 'x' }));
    expect(loadMix(s)).toEqual({ engine: 1, voice: DEFAULT_MIX.voice, callouts: DEFAULT_MIX.callouts });
    store.set('orbitlab.soundMix', '{not json');
    expect(loadMix(s)).toEqual(DEFAULT_MIX);
  });

  it('tapers the sliders for the ear: silent at 0, full at 1, a quarter-way is -36 dB', () => {
    expect(sliderGain(0)).toBe(0);
    expect(sliderGain(1)).toBe(1);
    expect(20 * Math.log10(sliderGain(0.25))).toBeCloseTo(-36.1, 1);
    for (let x = 0.1; x < 1; x += 0.1) expect(sliderGain(x + 0.05)).toBeGreaterThan(sliderGain(x));
  });
});

describe('each rocket’s sound', () => {
  it('crackles harder on solids and rumbles deeper the bigger the jet', () => {
    const vega = soundProfile(vehicle('vegac')), falcon = soundProfile(vehicle('falcon9')), starship = soundProfile(vehicle('starship'));
    expect(vega.crackle).toBeGreaterThan(falcon.crackle + 0.5);
    expect(starship.pitch).toBeLessThan(falcon.pitch);
    expect(starship.rumble).toBeGreaterThan(falcon.rumble);
    expect(soundProfile(null)).toEqual(NEUTRAL_PROFILE);
    for (const v of VEHICLES) {
      const p = soundProfile(v);
      for (const x of Object.values(p)) expect(Number.isFinite(x) && x > 0, v.id).toBe(true);
      expect(p.pitch).toBeGreaterThanOrEqual(0.78);
      expect(p.pitch).toBeLessThanOrEqual(1.15);
    }
  });

  it('makes crackle of sharp compressive impulses: normalised, zero-mean, skewed', () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const d = crackleSamples(48000, 48000, 380, random);
    const n = d.length;
    const mean = d.reduce((a, x) => a + x, 0) / n;
    const sd = Math.sqrt(d.reduce((a, x) => a + (x - mean) ** 2, 0) / n);
    const skew = d.reduce((a, x) => a + ((x - mean) / sd) ** 3, 0) / n;
    expect(Math.abs(mean)).toBeLessThan(1e-6);
    expect(Math.max(...d.map(Math.abs))).toBeCloseTo(1, 6);
    // the measured signature of crackle: a positive skewness of the pressure
    expect(skew).toBeGreaterThan(1);
  });

  it('places the rocket left or right, and lets the ground answer near the pad', () => {
    const right = { x: 1, y: 0, z: 0 };
    const at = { x: 0, y: 0, z: 0 };
    expect(panFor({ x: 1000, y: 1000, z: 0 }, at, right)).toBeCloseTo(Math.SQRT1_2, 6);
    expect(panFor({ x: -1000, y: 0, z: 0 }, at, right)).toBe(-1);
    expect(panFor({ x: 0, y: 1000, z: 0 }, at, right)).toBe(0);
    expect(panFor({ x: 1000, y: 0, z: 0 }, at, undefined)).toBe(0);
    expect(reflectionFor(0, 500)).toBeGreaterThan(0.9);
    expect(reflectionFor(1000, 2000)).toBeLessThan(reflectionFor(0, 2000));
    expect(reflectionFor(20000, 25000)).toBeCloseTo(0.35, 2); // far off: only the rolling echo
    expect(reflectionFor(5000, 3000)).toBe(0);
  });

  it('mixes the roar: the loudest source places it; inside the vehicle it is centred and has no crackle', () => {
    const pad: HeardSource = { thrust: 7.6e6, distance: 800, pressure: 101325, radialSpeed: 0, pan: 0.6, reflection: 1 };
    const m = mixFor([pad, { ...pad, distance: 30000, pan: -1 }], null, 1);
    expect(m.pan).toBeCloseTo(0.6 * 0.85, 6);
    expect(m.reflection).toBeCloseTo(0.55, 6);
    expect(m.crackle).toBeGreaterThan(0);
    const inside = mixFor([{ ...pad, distance: 1e6 }], { throttle: 1 }, 1);
    expect(inside.pan).toBe(0);
    expect(inside.crackle).toBe(0);
    expect(inside.reflection).toBe(0);
    expect(mixFor([pad], null, 0).gain).toBe(0);
    // a deeper rocket plays its noise slower
    expect(mixFor([pad], null, 1, { ...NEUTRAL_PROFILE, pitch: 0.8 }).pitch).toBeCloseTo(0.8, 6);
  });
});
