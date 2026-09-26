/**
 * Launch control's voice where no recording has one: the last seconds of the
 * count and the calls that follow the flight's events, spoken by the
 * browser's own speech synthesiser (Web Speech API — no files, nothing to
 * license). A Russian rocket is called in Russian when the page is in
 * Russian, the way Baikonur's and Plesetsk's launch control call it
 * ("Ключ на старт … Зажигание … Предварительная … Промежуточная … Главная …
 * Подъём!"); any other rocket, and any rocket on a page in English or Thai,
 * in English, as the broadcasts are (there is none in Thai).
 *
 * Where a real recording of a call is free to share, the recording is played
 * instead of the synthesiser: Russian launch control's "Контакт подъёма есть"
 * (Plesetsk, the Ministry of Defence, CC BY 4.0) and its flight reports and
 * "…выведен на орбиту. Репортаж окончен." (the first Soyuz-2.1a from
 * Vostochny, 2016, kremlin.ru, CC BY 4.0) — see public/audio/CREDITS.txt.
 * The flight reports name their second ("Сто восемьдесят секунд, двигатели
 * второй ступени работают нормально"), so they are only played on an R-7
 * (Soyuz-2) whose flight is still going as reported at that second.
 *
 * The voice is launch control's radio, not the rocket: it is not delayed by
 * the distance to the camera, and it only speaks in real time — a call that
 * would come in warped time, or one the flight has already passed, is
 * skipped, never queued up to spill out late.
 */
import type { SimEvent } from '../physics/simulation';

export type CalloutLang = 'ru' | 'en';

export interface Callout {
  /** mission time of the call, s */
  t: number;
  text: string;
  /** a recording of the call, relative to the page: played instead of the synthesiser */
  clip?: string;
}

/** What the script needs to know of the vehicle. */
export interface CalloutVehicle {
  /** strap-on boosters: the core is then the second stage in Russian practice (the strap-ons are the first) */
  boosters: boolean;
  /** a Soyuz-2 (R-7 family): the recorded flight reports fit its timeline */
  r7?: boolean;
}

/** The recorded calls (public/audio/ru-calls, CREDITS.txt there). */
export const RU_CLIPS = {
  contact: 'audio/ru-calls/kontakt-podyoma.mp3',
  t170: 'audio/ru-calls/t170.mp3',
  t180: 'audio/ru-calls/t180.mp3',
  t190: 'audio/ru-calls/t190.mp3',
  orbit: 'audio/ru-calls/orbit.mp3',
} as const;

/** The R-7's flight reports as recorded, seconds after liftoff; each needs the core (the second stage) still burning. */
const RU_REPORTS: readonly { after: number; text: string; clip: string }[] = [
  { after: 170, text: 'Сто семьдесят секунд. Полёт нормальный.', clip: RU_CLIPS.t170 },
  { after: 180, text: 'Сто восемьдесят секунд. Двигатели второй ступени работают нормально.', clip: RU_CLIPS.t180 },
  { after: 190, text: 'Сто девяносто секунд. Параметры в норме.', clip: RU_CLIPS.t190 },
];

const FAILURES = new Set(['evt.vehicleLost', 'evt.rangeSafety', 'evt.structuralFailure', 'evt.aeroBreakup', 'evt.abort', 'evt.engineOut', 'evt.thrustLoss', 'evt.prematureSep', 'evt.attitudeLost']);

const RU_ORDINAL = ['первой', 'второй', 'третьей', 'четвёртой', 'пятой'];

/**
 * The Soyuz count, as launch control calls it, fitted to the simulator's ten
 * seconds before liftoff. On the real pad the calls are spread over the last
 * minutes ("Ключ на старт" some six minutes out, "Пуск" at about T−20 s,
 * "Зажигание" at T−16 s); here they keep their order and their spacing within
 * the count the simulator shows.
 */
const RU_COUNT: readonly Callout[] = [
  { t: -10, text: 'Пуск.' },
  { t: -8.2, text: 'Зажигание.' },
  { t: -6.2, text: 'Предварительная.' },
  { t: -4.3, text: 'Промежуточная.' },
  { t: -2.4, text: 'Главная.' },
];

const EN_NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** "T-minus ten", then the seconds down to one; liftoff is called by its event. */
const EN_COUNT: readonly Callout[] = [
  { t: -10, text: 'T-minus ten.' },
  ...Array.from({ length: 9 }, (_, i) => ({ t: -9 + i, text: `${EN_NUMBERS[9 - i]}.` })),
];

function ruCall(e: SimEvent, v: CalloutVehicle, seen: Set<string>): string | null {
  const once = (key: string, text: string) => (seen.has(key) ? null : (seen.add(key), text));
  switch (e.key) {
    case 'evt.liftoff': return 'Подъём!';
    case 'evt.boosterSep': return once('boosters', 'Отделение боковых блоков.');
    case 'evt.fairingSep': return once('fairing', 'Сброс головного обтекателя.');
    case 'evt.stageSep': {
      const n = Number(e.params?.n) || 1;
      // the stage that falls away: with strap-ons the core is the second
      const ord = RU_ORDINAL[n - 1 + (v.boosters ? 1 : 0)];
      return ord ? `Отделение ${ord} ступени.` : 'Отделение ступени.';
    }
    case 'evt.payloadSep': return 'Отделение космического аппарата. Есть отделение!';
    case 'evt.parkingOrbit': return once('orbit', 'Выведение на опорную орбиту.');
    case 'evt.targetOrbit': return seen.has('orbit-final') ? null : once('orbit-final', 'Космический аппарат выведен на расчётную орбиту.');
    case 'evt.abort': return 'Авария! Сработала система аварийного спасения.';
    case 'evt.vehicleLost': case 'evt.rangeSafety': case 'evt.structuralFailure': case 'evt.aeroBreakup':
      return once('lost', 'Авария носителя.');
    case 'evt.noLiftoff': return once('noLiftoff', 'Отбой. Подъёма нет.');
    case 'evt.padFire': return once('padFire', 'Пожар на старте!');
    default: return null;
  }
}

function enCall(e: SimEvent, v: CalloutVehicle, seen: Set<string>): string | null {
  const once = (key: string, text: string) => (seen.has(key) ? null : (seen.add(key), text));
  switch (e.key) {
    case 'evt.liftoff': return 'Zero. Liftoff!';
    case 'evt.maxQ': return 'Vehicle is passing through max-Q.';
    case 'evt.boosterSep': return once('boosters', v.boosters ? 'Booster separation confirmed.' : 'Separation confirmed.');
    case 'evt.meco': return 'MECO.';
    case 'evt.stageSep': return 'Stage separation confirmed.';
    case 'evt.fairingSep': return once('fairing', 'Fairing separation.');
    case 'evt.seco': return once('seco', 'Engine cutoff. SECO.');
    case 'evt.boostbackStart': return once('boostback', 'Boostback burn startup.');
    case 'evt.entryBurnStart': return once('entry', 'Entry burn.');
    case 'evt.landingBurnStart': return once('landing', 'Landing burn.');
    case 'evt.boosterLanded': case 'evt.boosterLandedZone': case 'evt.boosterLandedShip': return 'Touchdown. The booster has landed.';
    case 'evt.boosterCaught': return 'The booster has been caught by the tower!';
    case 'evt.payloadSep': return 'Spacecraft separation confirmed.';
    case 'evt.targetOrbit': return once('orbit', 'Nominal orbit insertion.');
    case 'evt.abort': return 'Abort. Abort. Abort.';
    case 'evt.vehicleLost': case 'evt.rangeSafety': case 'evt.structuralFailure': case 'evt.aeroBreakup':
      return once('lost', 'We have lost the vehicle.');
    case 'evt.noLiftoff': return once('noLiftoff', 'Hold, hold, hold. No liftoff.');
    case 'evt.padFire': return once('padFire', 'Hold, hold, hold. Fire on the pad.');
    default: return null;
  }
}

/** Every call of a flight, in time order: the count, then one per event it calls. */
export function calloutScript(events: readonly SimEvent[], lang: CalloutLang, v: CalloutVehicle): Callout[] {
  const liftoff = events.find((e) => e.key === 'evt.liftoff');
  // the count stops at "Главная" / "one": what follows is liftoff's own call;
  // a fire on the pad or a rocket that cannot lift itself stops it where it happens
  const halt = events.find((e) => e.key === 'evt.noLiftoff' || e.key === 'evt.padFire')?.t ?? Infinity;
  const out: Callout[] = (lang === 'ru' ? RU_COUNT : EN_COUNT).filter((c) => c.t < halt);
  const seen = new Set<string>();
  // the recorded "…выведен на орбиту. Репортаж окончен." closes a Russian
  // flight after the spacecraft separates; the synthesised line gives way to it
  const payloadSep = lang === 'ru' ? events.find((e) => e.key === 'evt.payloadSep') : undefined;
  if (payloadSep) seen.add('orbit-final');
  for (const e of events) {
    const text = lang === 'ru' ? ruCall(e, v, seen) : enCall(e, v, seen);
    if (text) out.push({ t: e.t, text });
    // launch control confirms the umbilical's break right after "Подъём"
    if (lang === 'ru' && e === liftoff) out.push({ t: e.t + 1.6, text: 'Контакт подъёма есть.', clip: RU_CLIPS.contact });
    if (e === payloadSep) out.push({ t: e.t + 3.5, text: 'Выведен на орбиту. Репортаж окончен.', clip: RU_CLIPS.orbit });
  }
  if (lang === 'ru' && v.r7 && liftoff) {
    const failed = events.find((e) => FAILURES.has(e.key))?.t ?? Infinity;
    // the core's separation (stage 1 of the simulator's stack) ends "the second stage works"
    const coreOff = events.find((e) => (e.key === 'evt.stageSep' && Number(e.params?.n) === 1) || e.key === 'evt.meco')?.t ?? Infinity;
    for (const r of RU_REPORTS) {
      const at = liftoff.t + r.after;
      if (at < failed && at < coreOff) out.push({ t: at, text: r.text, clip: r.clip });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Which language a flight is called in: Russian for a Russian rocket on a page in Russian. */
export function calloutLang(pageLang: string, vehicleCountry: string): CalloutLang {
  return pageLang === 'ru' && vehicleCountry === 'RU' ? 'ru' : 'en';
}

/** A call older than this when its moment comes round is skipped, s. */
export const STALE_AFTER = 1.2;

/**
 * The calls due between the last frame (`from`) and this one (`to`), the ones
 * from more than `STALE_AFTER` ago dropped. Scrubbing back (`to` < `from`)
 * yields nothing: the voice starts again from the new time.
 */
export function dueCallouts(script: readonly Callout[], from: number, to: number): Callout[] {
  if (!(to > from)) return [];
  return script.filter((c) => c.t > from && c.t <= to && to - c.t <= STALE_AFTER);
}

/** The browser's voice for `lang`, preferring a local one, or null when it has none. */
export function pickVoice(voices: readonly SpeechSynthesisVoice[], lang: CalloutLang): SpeechSynthesisVoice | null {
  const match = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(lang));
  if (!match.length) return null;
  const pref = lang === 'en' ? ['en-us', 'en-gb'] : ['ru-ru'];
  return match.find((v) => v.localService && pref.includes(v.lang.toLowerCase().replace('_', '-')))
    ?? match.find((v) => pref.includes(v.lang.toLowerCase().replace('_', '-')))
    ?? match[0];
}

/** Speaks the script in step with the mission clock. */
export class CalloutVoice {
  private script: Callout[] = [];
  private lang: CalloutLang = 'en';
  private heardTo = -Infinity;
  private voice: SpeechSynthesisVoice | null | undefined;
  private readonly synth: SpeechSynthesis | null = typeof speechSynthesis === 'undefined' ? null : speechSynthesis;
  private readonly clips = new Map<string, HTMLAudioElement>();
  /** 0–1 */
  volume = 1;

  constructor() {
    this.synth?.addEventListener?.('voiceschanged', () => { this.voice = undefined; });
  }

  /** Whether the browser can speak the flight's language at all (the recorded calls play regardless). */
  get available(): boolean { return !!this.synth && !!this.voiceFor(); }

  private clip(url: string): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;
    let a = this.clips.get(url);
    if (!a) { a = new Audio(url); a.preload = 'auto'; this.clips.set(url, a); }
    return a;
  }

  private stopClips(): void {
    for (const a of this.clips.values()) if (!a.paused) a.pause();
  }

  setScript(script: Callout[], lang: CalloutLang): void {
    this.script = script;
    if (lang !== this.lang) this.voice = undefined;
    this.lang = lang;
    // load the recordings now, so that they sound on time
    for (const c of script) if (c.clip) this.clip(c.clip);
  }

  private voiceFor(): SpeechSynthesisVoice | null {
    if (this.voice === undefined && this.synth) this.voice = pickVoice(this.synth.getVoices(), this.lang);
    return this.voice ?? null;
  }

  /** A new flight, or a jump in time: nothing pending, nothing said. */
  reset(): void {
    this.heardTo = -Infinity;
    this.synth?.cancel();
    this.stopClips();
  }

  /**
   * Speak what is due at mission time `t`. `live` is real time, playing and
   * with the voice wanted; otherwise the voice falls silent and keeps its place.
   */
  update(t: number, live: boolean): void {
    const synth = this.synth;
    if (!live) {
      if (synth && (synth.speaking || synth.pending)) synth.cancel();
      this.stopClips();
      this.heardTo = t;
      return;
    }
    const from = Number.isFinite(this.heardTo) ? this.heardTo : t - 1e-6;
    if (t < from - 0.5) { synth?.cancel(); this.stopClips(); this.heardTo = t; return; }
    const due = dueCallouts(this.script, from, t);
    this.heardTo = Math.max(from, t);
    if (this.volume <= 0) return;
    for (const c of due) {
      const rec = c.clip ? this.clip(c.clip) : null;
      if (rec) {
        synth?.cancel();
        try {
          rec.volume = this.volume;
          rec.currentTime = 0;
          void rec.play().catch(() => { /* waits for a gesture */ });
        } catch { /* silent */ }
        continue;
      }
      const voice = this.voiceFor();
      if (!synth || !voice) continue;
      // the voice is an extra: a speech engine that throws must not stop the flight
      try {
        const u = new SpeechSynthesisUtterance(c.text);
        u.lang = voice.lang;
        u.rate = this.lang === 'ru' ? 1.05 : 1.1;
        u.volume = this.volume;
        try { u.voice = voice; } catch { /* the language alone picks a voice */ }
        // a call that would queue behind a long one gives way: launch control
        // does not fall behind the rocket
        if (synth.pending) synth.cancel();
        synth.speak(u);
      } catch { /* silent */ }
    }
  }
}
