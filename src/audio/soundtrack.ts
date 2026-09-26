/**
 * Real launch audio for the viewer's launches (roadmap V01): the broadcast of
 * the flight a launch re-enacts, played in step with the mission clock — the
 * countdown, launch control's calls and the commentary, in the language the
 * broadcast was in (English wherever the page is in Thai, as no broadcast was).
 * A Russian launch watched on a page in Russian plays Russian television's
 * broadcast, with Russian launch control and Russian commentary.
 *
 * Only audio whose licence lets it be published with the app is bundled:
 * NASA's own broadcasts and recordings are in the public domain; Roscosmos
 * TV's broadcast below was published under CC BY 3.0. The other launches were
 * broadcast by companies that keep their rights, so they play the simulator's
 * synthesised sound — unless the user adds a recording they have themselves,
 * which is kept in this browser (IndexedDB) and never leaves it.
 */
import type { WatchMissionId } from '../ui/watch-missions';
import type { Lang } from '../i18n';

export interface Soundtrack {
  /** the audio, relative to the page, or an object URL */
  url: string;
  /** seconds into the audio of T-0, liftoff */
  t0: number;
  /** who made it and under what terms, for the viewer */
  credit: string;
  source: 'bundled' | 'user';
  /** it carries launch control's voice: the synthesised calls step aside while it plays */
  voice: boolean;
}

export interface BundledSoundtrack extends Omit<Soundtrack, 'source'> {
  /** the flight recorded, for the listing */
  flight: string;
  /** i18n key of the listing's line: whose recording, and under what terms */
  statusKey: string;
  /** the page languages it plays for; every language when absent */
  langs?: readonly Lang[];
}

/**
 * Soyuz to the space station, in English (and in Thai): NASA TV's coverage of
 * Soyuz MS-27 (NASA astronaut Jonny Kim, Roscosmos cosmonauts Sergey Ryzhikov
 * and Alexey Zubritsky), Baikonur, 8 April 2025, from T-60 s to T+540 s: the
 * Russian launch-control loop under NASA's English commentary. NASA video
 * iss073m260980444 (images.nasa.gov), public domain as a work of the US
 * government. T-0 is 3731 s into that video, read from the Roscosmos
 * countdown clock on the picture (T-00:07:11 at 3300 s, T-00:01:21 at
 * 3650 s; ±1 s) and matched by the engines' roar rising after it; the clip
 * starts 60 s before.
 */
const SOYUZ_MS27_NASA: BundledSoundtrack = {
  url: 'audio/soyuz-ms-27-nasa.mp3', t0: 60, flight: 'Soyuz MS-27', voice: true,
  statusKey: 'snd.bundled', credit: 'NASA TV · Soyuz MS-27, 8 April 2025 · public domain',
  // on a page in Russian the Russian launch is called in Russian instead
  // (callouts.ts: Russian launch control's own recorded calls, synthesised
  // between them), not under an English commentary
  langs: ['en', 'th'],
};

/**
 * Falcon 9 from SLC-40, as the rideshare flies: NASA's pad microphone at
 * Crew-12's Falcon 9 from the same pad, 13 February 2026 — the roar and
 * crackle at the pad, from T-12 s to T+150 s, no voices (SpaceX's launch
 * control is SpaceX's; the count is called by the synthesiser). The right
 * channel of NASA's "Tech Feed (L) / Blast (R)" recording, public domain;
 * T-0 read from the count on its left channel (±0.5 s). public/audio/CREDITS.txt.
 */
const FALCON9_CREW12_PAD: BundledSoundtrack = {
  url: 'audio/falcon9-crew-12-pad-nasa.mp3', t0: 12, flight: 'Crew-12', voice: false,
  statusKey: 'snd.bundledPad', credit: 'NASA · pad microphone, SpaceX Crew-12 launch, SLC-40, 13 February 2026 · public domain',
};

export const BUNDLED_SOUNDTRACKS: Partial<Record<WatchMissionId, readonly BundledSoundtrack[]>> = {
  soyuzIss: [SOYUZ_MS27_NASA],
  falcon9Bandwagon: [FALCON9_CREW12_PAD],
};

/** The bundled recording a launch plays on a page in `lang`: one made for that language, else one for every language. */
export function bundledFor(id: WatchMissionId, lang: Lang): BundledSoundtrack | null {
  const list = BUNDLED_SOUNDTRACKS[id] ?? [];
  return list.find((b) => b.langs?.includes(lang)) ?? list.find((b) => !b.langs) ?? null;
}

/** How far the audio may drift from the mission clock before it is re-cued, s; less is eased out. */
export const MAX_DRIFT = 1.5;
/** Most the playback rate is bent to ease out a drift: ±6 %, too little to hear as a change of pitch. */
export const MAX_RATE_BEND = 0.06;

export type SoundtrackAction = { kind: 'pause' } | { kind: 'play'; seek: number | null; rate: number };

/**
 * What the audio element should do this frame: play in step with the mission
 * clock in real time (re-cued when it drifts), pause otherwise — warped time
 * has no broadcast to match, and neither has the part of the flight before
 * or after the recording.
 */
export function soundtrackAction(o: {
  t: number; warp: number; playing: boolean; enabled: boolean;
  t0: number; duration: number; currentTime: number; paused: boolean;
}): SoundtrackAction {
  const at = o.t0 + o.t;
  const inside = Number.isFinite(o.duration) ? at >= 0 && at < o.duration - 0.05 : at >= 0;
  if (!o.enabled || !o.playing || Math.abs(o.warp - 1) > 1e-3 || !inside) return { kind: 'pause' };
  const lag = at - o.currentTime;
  if (o.paused || Math.abs(lag) > MAX_DRIFT) return { kind: 'play', seek: at, rate: 1 };
  // a small drift (a slow frame, a clock that does not keep real time) is
  // caught up by playing a little faster or slower, not by an audible jump
  return { kind: 'play', seek: null, rate: 1 + Math.max(-MAX_RATE_BEND, Math.min(MAX_RATE_BEND, lag * 0.5)) };
}

// ─── the user's own recordings ──────────────────────────────────────────────

const DB = 'orbitlab-soundtracks';
const STORE = 'tracks';

interface StoredTrack { id: string; blob: Blob; t0: number; name: string }

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveUserSoundtrack(id: WatchMissionId, file: Blob, name: string, t0: number): Promise<void> {
  await tx('readwrite', (s) => s.put({ id, blob: file, t0, name } satisfies StoredTrack));
}

export async function loadUserSoundtrack(id: WatchMissionId): Promise<StoredTrack | null> {
  try { return (await tx<StoredTrack | undefined>('readonly', (s) => s.get(id))) ?? null; } catch { return null; }
}

export async function removeUserSoundtrack(id: WatchMissionId): Promise<void> {
  try { await tx('readwrite', (s) => s.delete(id)); } catch { /* nothing stored */ }
}

/** The soundtrack a viewer launch plays: the user's own recording first, else the bundled one for the page's language, else none. */
export async function soundtrackFor(id: WatchMissionId, lang: Lang, userCredit: (name: string) => string): Promise<Soundtrack | null> {
  const mine = await loadUserSoundtrack(id);
  if (mine) return { url: URL.createObjectURL(mine.blob), t0: mine.t0, credit: userCredit(mine.name), source: 'user', voice: true };
  const b = bundledFor(id, lang);
  return b ? { url: b.url, t0: b.t0, credit: b.credit, source: 'bundled', voice: b.voice } : null;
}

/** Plays a soundtrack in step with the flight. */
export class SoundtrackPlayer {
  private el: HTMLAudioElement | null = null;
  private track: Soundtrack | null = null;
  private lastSeek = -Infinity;
  private volume = 1;

  get active(): Soundtrack | null { return this.track; }
  /** true while the recording is actually playing: the synthesised roar steps aside */
  get sounding(): boolean { return !!this.el && !this.el.paused; }
  /** true while a recording with launch control's voice is playing: the synthesised calls step aside */
  get speaking(): boolean { return this.sounding && !!this.track?.voice; }

  /** Loudness in the mix, a gain 0–1 (the slider's taper applied). */
  setVolume(gain: number): void {
    this.volume = Math.max(0, Math.min(1, gain));
    if (this.el) this.el.volume = this.volume;
  }

  set(track: Soundtrack | null): void {
    // the same recording again (the page's language changed, but not the broadcast): keep playing it
    if (track && this.track && track.source === 'bundled' && track.url === this.track.url) { this.track = track; return; }
    if (this.track?.source === 'user' && this.track.url !== track?.url) URL.revokeObjectURL(this.track.url);
    this.track = track;
    if (!track) { this.el?.pause(); return; }
    if (!this.el) { this.el = new Audio(); this.el.preload = 'auto'; this.el.volume = this.volume; }
    this.el.src = track.url;
  }

  update(t: number, warp: number, playing: boolean, enabled: boolean): void {
    const el = this.el, track = this.track;
    if (!el || !track) return;
    const a = soundtrackAction({ t, warp, playing, enabled, t0: track.t0, duration: el.duration, currentTime: el.currentTime, paused: el.paused });
    if (a.kind === 'pause') { if (!el.paused) el.pause(); return; }
    // a seek takes a moment to land: one at a time, and not every frame
    const now = performance.now();
    if (a.seek !== null && !el.seeking && now - this.lastSeek > 1000) {
      this.lastSeek = now;
      el.currentTime = a.seek;
    }
    if (Math.abs(el.playbackRate - a.rate) > 0.005) el.playbackRate = a.rate;
    if (el.paused) void el.play().catch(() => { /* waits for a gesture */ });
  }
}
