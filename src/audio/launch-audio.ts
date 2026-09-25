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

export interface AudioFrameInput {
  /** mission time on screen, s */
  t: number;
  frameAt: (t: number) => VisualFrame | null;
  events: readonly SimEvent[];
  /** the camera, in the frames' ECI metres */
  listener: Vec3;
  warp: number;
  playing: boolean;
  /** the camera rides the vehicle */
  onboard: boolean;
}

export class LaunchAudio {
  readonly sound = new EngineSound();
  /** the latest mission time whose sounds have been cued */
  private heardTo = -Infinity;

  constructor() {
    if (loadSoundPreference()) this.sound.setEnabled(true);
  }

  get on(): boolean { return this.sound.on; }

  toggle(): boolean {
    const on = !this.sound.on;
    this.sound.setEnabled(on);
    saveSoundPreference(on);
    return on;
  }

  /** A new flight: nothing heard yet. */
  reset(): void { this.heardTo = -Infinity; }

  update(o: AudioFrameInput): void {
    if (!this.sound.on) return;
    const { gain, delayed } = warpGain(o.warp, o.playing);
    const c = SPEED_OF_SOUND_0;
    const heardAt = (distanceAt: (tau: number) => number): number => (delayed ? retardedTime(o.t, distanceAt, c) : o.t);
    const sources: HeardSource[] = [];
    // the vehicle
    const tau = heardAt((x) => { const f = o.frameAt(x); return f ? dist(f.r, o.listener) : 0; });
    const f = o.frameAt(tau);
    if (f && f.thrust > 0 && !f.destroyed) {
      sources.push({ thrust: f.thrust, distance: dist(f.r, o.listener), pressure: f.pressure, radialSpeed: radialSpeed(f.r, f.v, o.listener) });
    }
    // stages flying home, each at its own retarded time
    const now = o.frameAt(o.t);
    for (const d of now?.debris ?? []) {
      if (!d.alive) continue;
      const tauD = heardAt((x) => { const g = o.frameAt(x)?.debris.find((e) => e.id === d.id); return g ? dist(g.r, o.listener) : dist(d.r, o.listener); });
      const g = o.frameAt(tauD)?.debris.find((e) => e.id === d.id);
      if (g?.burning) sources.push({ thrust: RETURN_BURN_THRUST, distance: dist(g.r, o.listener), pressure: g.pressure ?? 101325, radialSpeed: radialSpeed(g.r, g.v, o.listener) });
    }
    this.sound.update(sources, o.onboard && now && now.thrust > 0 ? { throttle: now.throttle } : null, gain);
    this.cueEvents(o, delayed, gain);
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
      if (Number.isFinite(from)) this.sound.cue(cue, distance, pressure, gain);
    }
    this.heardTo = Math.max(latest, Number.isFinite(from) ? from : o.t);
  }
}
