/**
 * The app's side of the sound (roadmap V01): each frame, find what the
 * listener at the camera hears — the vehicle and any stage flying home, at
 * the retarded time — and which events' sounds have just arrived, and hand
 * them to `EngineSound`. Off unless the user turns it on; the choice is kept.
 */
import type { VisualFrame } from '../physics/frame';
import type { SimEvent } from '../physics/simulation';
import type { Vec3 } from '../physics/vec3';
import { EngineSound, type HeardSource } from './engine-sound';
import { EVENT_CUES, SPEED_OF_SOUND_0, retardedTime, warpGain } from './acoustics';
import { R_EARTH } from '../physics/constants';
import { CalloutVoice, calloutLang, calloutScript, type CalloutLang } from './callouts';
import { loadMix, saveMix, sliderGain, type SoundMix } from './mix';
import { soundProfile } from './profile';
import type { VehicleSpec } from '../types';

const STORE_KEY = 'orbitlab.sound';
/** Thrust a stage flying home is taken to make while it burns, N (three Merlins at landing throttle). */
const RETURN_BURN_THRUST = 1.5e6;

export function loadSoundPreference(store?: Pick<Storage, 'getItem'>): boolean {
  try { return (store ?? localStorage).getItem(STORE_KEY) === 'on'; } catch { return false; }
}
export function saveSoundPreference(on: boolean, store?: Pick<Storage, 'setItem'>): void {
  try { (store ?? localStorage).setItem(STORE_KEY, on ? 'on' : 'off'); } catch { /* storage off */ }
}

const dist = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function radialSpeed(r: Vec3, v: Vec3, listener: Vec3): number {
  const dx = r.x - listener.x, dy = r.y - listener.y, dz = r.z - listener.z;
  const d = Math.hypot(dx, dy, dz) || 1;
  return (v.x * dx + v.y * dy + v.z * dz) / d;
}

/**
 * Left–right placement of a source at `r` for a listener at `listener` whose
 * right hand points along `right` (unit): the sine of its bearing off the
 * line of sight, −1 full left to +1 full right. Centred without a direction.
 */
export function panFor(r: Vec3, listener: Vec3, right: Vec3 | undefined): number {
  if (!right) return 0;
  const dx = r.x - listener.x, dy = r.y - listener.y, dz = r.z - listener.z;
  const d = Math.hypot(dx, dy, dz);
  if (d < 1) return 0;
  return Math.max(-1, Math.min(1, (dx * right.x + dy * right.y + dz * right.z) / d));
}

/**
 * How much of a source's roar the ground throws back to the listener, 0–1:
 * all of it while the rocket stands on and just above the pad (the deck, the
 * flame trench, the land around), fading as it climbs away through the first
 * couple of kilometres; and, far off, the long rolling echo a distant launch
 * is heard with.
 */
export function reflectionFor(sourceHeight: number, distance: number): number {
  const near = Math.max(0, 1 - Math.max(0, sourceHeight) / 2000) * Math.max(0, 1 - distance / 30000);
  const far = 0.35 * Math.min(1, Math.max(0, distance - 3000) / 15000);
  return Math.min(1, Math.max(near, far));
}

export interface AudioFrameInput {
  /** mission time on screen, s */
  t: number;
  frameAt: (t: number) => VisualFrame | null;
  events: readonly SimEvent[];
  /** the camera, in the frames' ECI metres */
  listener: Vec3;
  /** the camera's right hand, a unit vector in the same axes (stereo placement); centred without */
  listenerRight?: Vec3;
  warp: number;
  playing: boolean;
  /** the camera rides the vehicle */
  onboard: boolean;
  /** a real broadcast is playing (the viewer's launches): the synthesised sound steps aside */
  suppressed?: boolean;
  /** a recording with launch control's voice is playing: the synthesised calls step aside */
  voiceSuppressed?: boolean;
  /** the mission clock runs, whatever the view (launch control's radio is heard on the map too); `playing` when absent */
  clockRunning?: boolean;
}

export class LaunchAudio {
  readonly sound = new EngineSound();
  readonly voice = new CalloutVoice();
  /** the latest mission time whose sounds have been cued */
  private heardTo = -Infinity;
  private mixState: SoundMix = loadMix();
  private vehicle: { country: string; boosters: boolean; r7: boolean } = { country: '', boosters: false, r7: false };
  private pageLang = 'en';
  private scriptFor: { events: number; lang: CalloutLang } | null = null;

  constructor() {
    if (loadSoundPreference()) this.sound.setEnabled(true);
    this.applyMix();
  }

  get mix(): SoundMix { return { ...this.mixState }; }

  setMix(m: Partial<SoundMix>): void {
    this.mixState = { ...this.mixState, ...m };
    saveMix(this.mixState);
    this.applyMix();
  }

  private applyMix(): void {
    this.sound.setVolume(sliderGain(this.mixState.engine));
    this.voice.volume = sliderGain(this.mixState.voice);
  }

  /** The flight's rocket: its sound's character, and the language launch control calls it in. */
  setVehicle(spec: Pick<VehicleSpec, 'id' | 'country' | 'stages'> | null): void {
    this.sound.setProfile(soundProfile(spec));
    this.vehicle = { country: spec?.country ?? '', boosters: !!spec?.stages[0]?.boosters?.length, r7: /^soyuz2/.test(spec?.id ?? '') };
    this.scriptFor = null;
  }

  /** The page's language, which picks launch control's (Russian rockets in Russian on a Russian page). */
  setLanguage(lang: string): void {
    if (lang !== this.pageLang) { this.pageLang = lang; this.scriptFor = null; }
  }

  /** The language launch control speaks for this flight. */
  get calloutLanguage(): CalloutLang { return calloutLang(this.pageLang, this.vehicle.country); }

  get on(): boolean { return this.sound.on; }

  toggle(): boolean {
    const on = !this.sound.on;
    this.sound.setEnabled(on);
    saveSoundPreference(on);
    return on;
  }

  /** A new flight: nothing heard yet. */
  reset(): void {
    this.heardTo = -Infinity;
    this.scriptFor = null;
    this.voice.reset();
  }

  update(o: AudioFrameInput): void {
    // launch control's voice is an extra: nothing in it may stop the frame
    try { this.speak(o); } catch { /* silent */ }
    if (!this.sound.on) return;
    const w = warpGain(o.warp, o.playing);
    const delayed = w.delayed, gain = o.suppressed ? 0 : w.gain;
    const c = SPEED_OF_SOUND_0;
    const heardAt = (distanceAt: (tau: number) => number): number => (delayed ? retardedTime(o.t, distanceAt, c) : o.t);
    const sources: HeardSource[] = [];
    // the vehicle
    const tau = heardAt((x) => { const f = o.frameAt(x); return f ? dist(f.r, o.listener) : 0; });
    const f = o.frameAt(tau);
    if (f && f.thrust > 0 && !f.destroyed) {
      const d = dist(f.r, o.listener);
      sources.push({
        thrust: f.thrust, distance: d, pressure: f.pressure, radialSpeed: radialSpeed(f.r, f.v, o.listener),
        pan: panFor(f.r, o.listener, o.listenerRight), reflection: reflectionFor(f.altitudeAGL ?? f.altitude, d),
      });
    }
    // stages flying home, each at its own retarded time
    const now = o.frameAt(o.t);
    // the ground's radius hereabouts, for a stage's height (the ellipsoid differs from a sphere by kilometres)
    const ground = now ? Math.hypot(now.r.x, now.r.y, now.r.z) - (now.altitudeAGL ?? now.altitude) : R_EARTH;
    for (const d of now?.debris ?? []) {
      if (!d.alive) continue;
      const tauD = heardAt((x) => { const g = o.frameAt(x)?.debris.find((e) => e.id === d.id); return g ? dist(g.r, o.listener) : dist(d.r, o.listener); });
      const g = o.frameAt(tauD)?.debris.find((e) => e.id === d.id);
      if (g?.burning) {
        const dd = dist(g.r, o.listener);
        sources.push({
          thrust: RETURN_BURN_THRUST, distance: dd, pressure: g.pressure ?? 101325, radialSpeed: radialSpeed(g.r, g.v, o.listener),
          pan: panFor(g.r, o.listener, o.listenerRight), reflection: reflectionFor(Math.hypot(g.r.x, g.r.y, g.r.z) - ground, dd),
        });
      }
    }
    this.sound.update(sources, o.onboard && now && now.thrust > 0 ? { throttle: now.throttle } : null, gain);
    this.cueEvents(o, delayed, gain);
  }

  /** Launch control's calls: radio, so undelayed, and only in real time. */
  private speak(o: AudioFrameInput): void {
    const lang = this.calloutLanguage;
    if (!this.scriptFor || this.scriptFor.events !== o.events.length || this.scriptFor.lang !== lang) {
      this.voice.setScript(calloutScript(o.events, lang, { boosters: this.vehicle.boosters, r7: this.vehicle.r7 }), lang);
      this.scriptFor = { events: o.events.length, lang };
    }
    const running = o.clockRunning ?? o.playing;
    const live = this.sound.on && this.mixState.callouts && running && Math.abs(o.warp - 1) < 1e-3 && !o.voiceSuppressed;
    this.voice.update(o.t, live);
  }

  /** Play each event whose sound has reached the listener since the last frame. */
  private cueEvents(o: AudioFrameInput, delayed: boolean, gain: number): void {
    // scrubbing back: nothing replays, the ear starts again from here
    if (o.t < this.heardTo - 1) this.heardTo = o.t;
    const from = this.heardTo;
    let latest = from;
    for (const e of o.events) {
      const cue = EVENT_CUES[e.key];
      if (!cue || e.t > o.t) continue;
      const at = o.frameAt(e.t);
      if (!at) continue;
      // where the sound came from: the stage it names, else the vehicle
      const name = e.params?.name;
      const body = typeof name === 'string' ? at.debris.find((d) => d.name === name) : undefined;
      const r = body?.r ?? at.r, pressure = body?.pressure ?? at.pressure;
      const distance = dist(r, o.listener);
      const arrives = delayed ? e.t + distance / SPEED_OF_SOUND_0 : e.t;
      if (arrives > o.t) continue;
      latest = Math.max(latest, arrives);
      if (arrives <= from) continue;
      if (Number.isFinite(from)) this.sound.cue(cue, distance, pressure, gain, panFor(r, o.listener, o.listenerRight));
    }
    this.heardTo = Math.max(latest, Number.isFinite(from) ? from : o.t);
  }
}
