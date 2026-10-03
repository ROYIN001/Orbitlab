import { workspaceStorage } from '../workspace/storage';
/**
 * The app's side of the sound (roadmap V01): each frame, find what the
 * listener at the camera hears — the vehicle and any stage flying home, at
 * the retarded time, from where it was then relative to the camera's head,
 * and how high it and the camera stand over the ground — and which events'
 * sounds have just arrived, and hand them to `EngineSound`. Off unless the
 * user turns it on; the choice is kept.
 *
 * Sound travels through the air, and the air turns with the Earth: a pad at
 * Cape Canaveral moves at 409 m/s in the frames' ECI axes. So a position the
 * sound left at an earlier instant is first turned with the Earth to the
 * listener's instant (`inAir`), and a source's speed is taken relative to the
 * air — otherwise a rocket standing on the pad would be heard Doppler-shifted
 * by the Earth's rotation, and a camera west of it would hear its ignition
 * seconds early (east of it, never).
 */
import type { VisualFrame } from '../physics/frame';
import type { SimEvent } from '../physics/simulation';
import type { Vec3 } from '../physics/vec3';
import { OMEGA_EARTH, R_EARTH } from '../physics/constants';
import { EngineSound, type HeardSource } from './engine-sound';
import { EVENT_CUES, SPEED_OF_SOUND_0, retardedTime, toHead, warpGain, type Quat } from './acoustics';

const STORE_KEY = 'orbitlab.sound';
/** Thrust a stage flying home is taken to make while it burns, N (three Merlins at landing throttle). */
const RETURN_BURN_THRUST = 1.5e6;

export function loadSoundPreference(store?: Pick<Storage, 'getItem'>): boolean {
  try { return (store ?? workspaceStorage()).getItem(STORE_KEY) === 'on'; } catch { return false; }
}
export function saveSoundPreference(on: boolean, store?: Pick<Storage, 'setItem'>): void {
  try { (store ?? workspaceStorage()).setItem(STORE_KEY, on ? 'on' : 'off'); } catch { /* storage off */ }
}

const dist = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** `r` (ECI) turned with the Earth, about Z, through the angle it turns in `dt` s. */
function turnWithEarth(r: Vec3, dt: number): Vec3 {
  const a = OMEGA_EARTH * dt, c = Math.cos(a), s = Math.sin(a);
  return { x: c * r.x - s * r.y, y: s * r.x + c * r.y, z: r.z };
}

/**
 * A source's position and velocity at an instant `dt` s before the listener's,
 * in the frames' ECI axes, carried into the air's frame at the listener's
 * instant: the position turned with the Earth through ω·dt, the velocity made
 * relative to the air (v − ω × r) and turned the same way.
 */
export function inAir(r: Vec3, v: Vec3, dt: number): { r: Vec3; v: Vec3 } {
  return { r: turnWithEarth(r, dt), v: turnWithEarth({ x: v.x + OMEGA_EARTH * r.y, y: v.y - OMEGA_EARTH * r.x, z: v.z }, dt) };
}

function radialSpeed(r: Vec3, v: Vec3, listener: Vec3): number {
  const dx = r.x - listener.x, dy = r.y - listener.y, dz = r.z - listener.z;
  const d = Math.hypot(dx, dy, dz) || 1;
  return (v.x * dx + v.y * dy + v.z * dz) / d;
}

/** Where `r` is heard from: the unit vector to it from the listener, in the head frame of a camera turned by `q`. */
export function headingTo(r: Vec3, listener: Vec3, q: Quat | undefined): Vec3 | undefined {
  if (!q) return undefined;
  const dx = r.x - listener.x, dy = r.y - listener.y, dz = r.z - listener.z;
  const d = Math.hypot(dx, dy, dz);
  return d > 0 ? toHead({ x: dx / d, y: dy / d, z: dz / d }, q) : undefined;
}

/** Height of `r` over the ground at elevation `ground` (m above the spherical Earth), m. */
const heightOver = (r: Vec3, ground: number): number => Math.hypot(r.x, r.y, r.z) - R_EARTH - ground;

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
  /** the camera's orientation in the frames' axes (a three.js camera's quaternion); absent, everything is heard from ahead */
  orientation?: Quat;
  /** a real broadcast is playing (the viewer's launches): the synthesised sound steps aside */
  suppressed?: boolean;
}

export class LaunchAudio {
  readonly sound = new EngineSound();
  /**
   * The events whose sound has been heard. Kept by identity, not as a
   * watermark of arrival times: a camera drifting away from where an event
   * happened makes its arrival a little later every frame, and a watermark
   * then plays it again every frame.
   */
  private heard = new Set<string>();
  /** the mission time of the last frame heard; −∞ before a flight's first */
  private lastT = -Infinity;

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
  reset(): void { this.heard.clear(); this.lastT = -Infinity; }

  update(o: AudioFrameInput): void {
    if (!this.sound.on) return;
    const w = warpGain(o.warp, o.playing);
    const delayed = w.delayed, gain = o.suppressed ? 0 : w.gain;
    const c = SPEED_OF_SOUND_0;
    const heardAt = (distanceAt: (tau: number) => number): number => (delayed ? retardedTime(o.t, distanceAt, c) : o.t);
    const sources: HeardSource[] = [];
    const now = o.frameAt(o.t);
    // the ground is the launch site's elevation (frames carry it as altitude − altitude AGL)
    const ground = now ? now.altitude - now.altitudeAGL : NaN;
    const listenerHeight = heightOver(o.listener, ground);
    /** a source as it was at `at`, heard now */
    const heard = (id: string, thrust: number, at: number, r: Vec3, v: Vec3, pressure: number): HeardSource => {
      const air = inAir(r, v, o.t - at);
      return {
        id, thrust, distance: dist(air.r, o.listener), pressure, radialSpeed: radialSpeed(air.r, air.v, o.listener),
        direction: headingTo(air.r, o.listener, o.orientation),
        heights: Number.isFinite(listenerHeight) ? { source: heightOver(r, ground), listener: listenerHeight } : undefined,
      };
    };
    const rangeAt = (x: number, r: Vec3): number => dist(turnWithEarth(r, o.t - x), o.listener);
    // the vehicle
    const tau = heardAt((x) => { const f = o.frameAt(x); return f ? rangeAt(x, f.r) : 0; });
    const f = o.frameAt(tau);
    if (f && f.thrust > 0 && !f.destroyed) sources.push(heard('vehicle', f.thrust, tau, f.r, f.v, f.pressure));
    // stages flying home, each at its own retarded time
    for (const d of now?.debris ?? []) {
      if (!d.alive) continue;
      const tauD = heardAt((x) => { const g = o.frameAt(x)?.debris.find((e) => e.id === d.id); return g ? rangeAt(x, g.r) : dist(d.r, o.listener); });
      const g = o.frameAt(tauD)?.debris.find((e) => e.id === d.id);
      if (g?.burning) sources.push(heard(`debris:${d.id}`, RETURN_BURN_THRUST, tauD, g.r, g.v, g.pressure ?? 101325));
    }
    this.sound.update(sources, o.onboard && now && now.thrust > 0 ? { throttle: now.throttle } : null, gain);
    this.cueEvents(o, delayed, gain);
  }

  /** Play each event whose sound has reached the listener and was not heard yet. */
  private cueEvents(o: AudioFrameInput, delayed: boolean, gain: number): void {
    // opened half-way through a flight, what has already arrived is taken as heard, not replayed
    const first = !Number.isFinite(this.lastT);
    // scrubbing back: the ear starts again from here, and what is still to arrive is heard again
    const back = !first && o.t < this.lastT - 1;
    this.lastT = o.t;
    for (const e of o.events) {
      const cue = EVENT_CUES[e.key];
      if (!cue) continue;
      const name = e.params?.name;
      const id = `${e.key}@${e.t}@${typeof name === 'string' ? name : ''}`;
      if (e.t > o.t) { if (back) this.heard.delete(id); continue; }
      const at = o.frameAt(e.t);
      if (!at) continue;
      // where the sound came from: the stage it names, else the vehicle
      const body = typeof name === 'string' ? at.debris.find((d) => d.name === name) : undefined;
      // where it was, turned with the air to now
      const r = turnWithEarth(body?.r ?? at.r, o.t - e.t), pressure = body?.pressure ?? at.pressure;
      const distance = dist(r, o.listener);
      const arrives = delayed ? e.t + distance / SPEED_OF_SOUND_0 : e.t;
      if (arrives > o.t) { if (back) this.heard.delete(id); continue; }
      if (this.heard.has(id)) continue;
      this.heard.add(id);
      if (!first) this.sound.cue(cue, distance, pressure, gain, headingTo(r, o.listener, o.orientation));
    }
  }
}
