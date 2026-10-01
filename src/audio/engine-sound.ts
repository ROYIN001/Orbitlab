/**
 * The launch heard from the camera (roadmap V01), synthesised with the Web
 * Audio API — no sound files, so nothing to license and nothing to download.
 *
 * Each source heard (the vehicle, a stage flying home) has a voice of its own,
 * three layers: a deep rumble (brown noise, the part that carries tens of
 * kilometres), the body of the roar (pink noise) and the crackle of the
 * shock-laden exhaust (a train of shocks, `waveforms.ts`, which is what makes
 * a rocket sound unlike a jet). Their mix follows `acoustics.ts`: the level
 * from the thrust, the air and the range; the top of the band from the range;
 * the pitch from the Doppler shift; and everything from the retarded time, so
 * the sound arrives when it would. Each voice is then heard from where its
 * source is — turned round the listener's head (HRTF, so it is best on
 * headphones), twice, directly and off the ground a moment later, and sent to
 * an outdoor reverberation that grows with the range. Ignition, separation,
 * landing and loss are one-shot sounds cued by the flight's events, delayed,
 * placed and reverberated the same way. A limiter catches the peaks without
 * squeezing the distance out of the level.
 *
 * Browsers only let a page make sound after a user gesture: the context is
 * created by the sound button's click, and a context restored from an
 * earlier visit waits for the first click or key press on the page.
 */
import type { Vec3 } from '../physics/vec3';
import {
  MAX_REFLECTION_DELAY, absorptionCutoff, dopplerFactor, gainForLevel, groundReflection, reverbSend, soundPressureLevel,
  type GroundPath, type SoundCue,
} from './acoustics';
import { crackleSamples, outdoorImpulse } from './waveforms';

const NOISE_SECONDS = 4;
const CRACKLE_SECONDS = 6;
/** Sources heard at once, each with a voice of its own: a Falcon Heavy's three cores flying home and its upper stage. */
export const MAX_VOICES = 4;
/** Treble left on the ground's echo, Hz: rough ground scatters the high frequencies rather than mirroring them. */
const REFLECTION_CORNER = 2000;
/** The limiter's ceiling, dB below full scale. */
const LIMIT_DB = -3;
/** A source with no direction is heard from straight ahead (Web Audio's listener faces −z). */
const AHEAD: Vec3 = { x: 0, y: 0, z: -1 };
const ALL_DIRECT: GroundPath = { delay: 0, direct: 1, reflected: 0 };
/** The voice id of the structure-borne rumble an onboard camera hears. */
const STRUCTURE = 'structure';

type Colour = 'white' | 'pink' | 'brown' | 'crackle';

function noiseBuffer(ctx: BaseAudioContext, colour: Colour): AudioBuffer {
  const n = Math.round(ctx.sampleRate * (colour === 'crackle' ? CRACKLE_SECONDS : NOISE_SECONDS));
  const buffer = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buffer.getChannelData(ch);
    if (colour === 'crackle') { d.set(crackleSamples(n, ctx.sampleRate, Math.random)); continue; }
    // Paul Kellet's pink filter; a leaky integrator for brown
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (colour === 'white') d[i] = w;
      else if (colour === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
  }
  return buffer;
}

/** What the listener hears from, this frame. */
export interface HeardSource {
  /** which body it is ('vehicle', a stage's debris id), so it keeps its voice from frame to frame */
  id: string;
  /** thrust at the retarded time, N */
  thrust: number;
  /** distance at the retarded time, m */
  distance: number;
  /** ambient pressure around the source, Pa */
  pressure: number;
  /** receding speed, m/s */
  radialSpeed: number;
  /** where the sound comes from: a unit vector in the listener's head frame (x right, y up, z backwards); absent, straight ahead */
  direction?: Vec3;
  /** the source's and the listener's heights above the ground, m, for the ground's echo; absent, no echo */
  heights?: { source: number; listener: number };
}

/** One source's sound this frame, as the synthesis plays it. */
interface Heard {
  id: string;
  gain: number;
  /** top of the band, Hz */
  cutoff: number;
  pitch: number;
  direction: Vec3 | null;
  path: GroundPath;
  send: number;
}

interface Layer { src: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode; weight: number }

/** A source's chain: layers → level → (direct + ground echo) → panner, and level → reverb send. */
interface Voice {
  /** rumble, body, crackle */
  layers: Layer[];
  level: GainNode;
  direct: GainNode;
  delay: DelayNode;
  reflected: GainNode;
  send: GainNode;
  panner: PannerNode;
  /** panned by HRTF (a source with a direction) rather than placed centrally */
  spatial: boolean;
}

/**
 * Which source each voice plays this frame: a source keeps the voice it had,
 * a new one takes a free voice, and what does not fit is left out — `wanted`
 * is loudest first, so it is the quietest.
 */
export function assignVoices(current: readonly (string | null)[], wanted: readonly string[]): (string | null)[] {
  const keep = new Set(wanted.slice(0, current.length));
  const next = current.map((id) => (id !== null && keep.has(id) ? id : null));
  for (const id of keep) {
    if (next.includes(id)) continue;
    const free = next.indexOf(null);
    if (free >= 0) next[free] = id;
  }
  return next;
}

/** Move a panner to `p`, gliding with time constant `tc` (0: at once). */
function place(panner: PannerNode, p: Vec3, now: number, tc: number): void {
  if (!panner.positionX) { panner.setPosition(p.x, p.y, p.z); return; }
  const axes: [AudioParam, number][] = [[panner.positionX, p.x], [panner.positionY, p.y], [panner.positionZ, p.z]];
  for (const [param, value] of axes) {
    if (tc > 0) param.setTargetAtTime(value, now, tc);
    else { param.cancelScheduledValues(now); param.setValueAtTime(value, now); }
  }
}

function makePanner(ctx: BaseAudioContext, spatial: boolean): PannerNode {
  const panner = ctx.createPanner();
  panner.panningModel = spatial ? 'HRTF' : 'equalpower';
  // the level is the acoustics' own: the panner only places the sound
  panner.distanceModel = 'inverse';
  panner.refDistance = 1;
  panner.rolloffFactor = 0;
  panner.channelCount = 1;
  panner.channelCountMode = 'explicit';
  return panner;
}

export class EngineSound {
  private ctx: AudioContext | null = null;
  /** everything heard, before the limiter: switched on and off as a whole */
  private bus!: GainNode;
  /** into the outdoor reverberation */
  private reverbIn!: GainNode;
  private voices: (Voice | undefined)[] = [];
  private voiceIds: (string | null)[] = new Array<string | null>(MAX_VOICES).fill(null);
  private buffers = new Map<Colour, AudioBuffer>();
  private enabled = false;

  get on(): boolean { return this.enabled; }

  /** Switch on (from a user gesture) or off. */
  setEnabled(on: boolean): void {
    this.enabled = on;
    if (on) {
      this.ensure();
      this.bus?.gain.setTargetAtTime(1, this.ctx!.currentTime, 0.05);
      void this.ctx?.resume().catch(() => { /* waits for a gesture */ });
    } else if (this.ctx) {
      this.bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      const ctx = this.ctx;
      setTimeout(() => { if (!this.enabled) void ctx.suspend().catch(() => {}); }, 300);
    }
  }

  /** A gesture anywhere lets a context restored from storage start. */
  resumeOnGesture(): void {
    if (this.enabled && this.ctx?.state !== 'running') {
      this.ensure();
      void this.ctx?.resume().catch(() => {});
    }
  }

  private ensure(): void {
    if (this.ctx || typeof AudioContext === 'undefined') return;
    const ctx = new AudioContext({ latencyHint: 'playback' });
    this.ctx = ctx;
    // a limiter rather than a compressor: it catches the peaks and leaves a distant launch quiet
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = LIMIT_DB;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.2;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(limiter).connect(ctx.destination);
    const reverb = ctx.createConvolver();
    reverb.normalize = false;
    const [left, right] = outdoorImpulse(ctx.sampleRate, Math.random);
    const ir = ctx.createBuffer(2, left.length, ctx.sampleRate);
    ir.getChannelData(0).set(left);
    ir.getChannelData(1).set(right);
    reverb.buffer = ir;
    this.reverbIn = ctx.createGain();
    this.reverbIn.connect(reverb).connect(this.bus);
    for (const c of ['white', 'pink', 'brown', 'crackle'] as Colour[]) this.buffers.set(c, noiseBuffer(ctx, c));
  }

  /** A voice's chain, built the first time it is needed. */
  private buildVoice(ctx: AudioContext): Voice {
    const level = ctx.createGain();
    level.gain.value = 0;
    const layers: Layer[] = [];
    const layer = (colour: Colour, type: BiquadFilterType, freq: number, q: number, weight: number) => {
      const src = ctx.createBufferSource();
      src.buffer = this.buffers.get(colour)!;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(level);
      src.start(0, Math.random() * src.buffer.duration);
      layers.push({ src, filter, gain, weight });
    };
    layer('brown', 'lowpass', 180, 0.7, 1.0);
    layer('pink', 'lowpass', 1400, 0.5, 0.55);
    // the shocks are broadband: the air's absorption is all that shapes them
    layer('crackle', 'lowpass', 9000, 0.5, 0.6);
    const panner = makePanner(ctx, true);
    const direct = ctx.createGain();
    level.connect(direct).connect(panner);
    const delay = ctx.createDelay(MAX_REFLECTION_DELAY + 0.05);
    delay.delayTime.value = 0;
    const rough = ctx.createBiquadFilter();
    rough.type = 'lowpass';
    rough.frequency.value = REFLECTION_CORNER;
    rough.Q.value = 0.5;
    const reflected = ctx.createGain();
    reflected.gain.value = 0;
    level.connect(delay).connect(rough).connect(reflected).connect(panner);
    const send = ctx.createGain();
    send.gain.value = 0;
    level.connect(send).connect(this.reverbIn);
    panner.connect(this.bus);
    return { layers, level, direct, delay, reflected, send, panner, spatial: true };
  }

  /** Point a voice at `d` (null: centrally), at once when it has just taken a new source. */
  private aim(v: Voice, d: Vec3 | null, now: number, jump: boolean): void {
    const spatial = d !== null;
    if (spatial !== v.spatial) { v.panner.panningModel = spatial ? 'HRTF' : 'equalpower'; v.spatial = spatial; }
    place(v.panner, d ?? AHEAD, now, jump ? 0 : 0.05);
  }

  /**
   * Set the roar for this frame: `sources` are what is burning (the vehicle,
   * a stage flying home), `onboard` a camera fixed to the vehicle, which hears
   * the engines through the structure whatever the air outside, and `scale`
   * the time-warp gain.
   */
  update(sources: readonly HeardSource[], onboard: { throttle: number } | null, scale: number): void {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running') return;
    const ctx = this.ctx, now = ctx.currentTime;
    let heard: Heard[] = [];
    for (const s of sources) {
      const gain = gainForLevel(soundPressureLevel(s.thrust, s.distance, s.pressure));
      if (gain <= 0) continue;
      heard.push({
        id: s.id, gain, cutoff: absorptionCutoff(s.distance), pitch: dopplerFactor(s.radialSpeed), direction: s.direction ?? null,
        path: s.heights ? groundReflection(s.distance, s.heights.source, s.heights.listener) : ALL_DIRECT, send: reverbSend(s.distance),
      });
    }
    heard.sort((a, b) => b.gain - a.gain);
    if (onboard && onboard.throttle > 0.01) {
      // structure-borne: a muffled, steady rumble in the cabin, once it is louder than the air outside
      const gain = 0.55 * Math.min(1, onboard.throttle);
      if (gain > Math.hypot(...heard.map((h) => h.gain))) {
        heard = [{ id: STRUCTURE, gain, cutoff: 420, pitch: 1, direction: null, path: ALL_DIRECT, send: 0 }];
      }
    }
    const ids = assignVoices(this.voiceIds, heard.map((h) => h.id));
    const tc = 0.08;
    for (let i = 0; i < MAX_VOICES; i++) {
      const h = heard.find((x) => x.id === ids[i]);
      if (!h) { this.voices[i]?.level.gain.setTargetAtTime(0, now, tc); continue; }
      const v = this.voices[i] ??= this.buildVoice(ctx);
      v.level.gain.setTargetAtTime(Math.min(1, h.gain * scale), now, tc);
      const [rumble, body, crackle] = v.layers;
      rumble.gain.gain.setTargetAtTime(rumble.weight, now, tc);
      body.gain.gain.setTargetAtTime(body.weight * Math.min(1, h.cutoff / 900), now, tc);
      body.filter.frequency.setTargetAtTime(Math.min(1400, h.cutoff), now, tc);
      // the shocks carry to the press site: full up to ~2 km, a fifth left at 15 km, gone where the band ends below 800 Hz
      crackle.gain.gain.setTargetAtTime(crackle.weight * Math.min(1, Math.max(0, (h.cutoff - 800) / 2500)), now, tc);
      crackle.filter.frequency.setTargetAtTime(Math.min(9000, h.cutoff), now, tc);
      for (const l of v.layers) l.src.playbackRate.setTargetAtTime(h.pitch, now, 0.2);
      v.direct.gain.setTargetAtTime(h.path.direct, now, tc);
      v.reflected.gain.setTargetAtTime(h.path.reflected, now, tc);
      v.delay.delayTime.setTargetAtTime(h.path.delay, now, tc);
      v.send.gain.setTargetAtTime(h.send, now, tc);
      // a voice taking a new source jumps to it rather than sweeping across the head
      this.aim(v, h.direction, now, this.voiceIds[i] !== h.id);
    }
    this.voiceIds = ids;
  }

  /**
   * A one-shot sound, at a level for its distance (m) and the air around it
   * (Pa), heard from `direction` in the listener's head frame (absent: ahead).
   */
  cue(kind: SoundCue, distance: number, pressure: number, scale: number, direction?: Vec3): void {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running' || scale <= 0) return;
    // treat each as a short burst of a source of a few meganewtons' worth of noise
    const thrustEquivalent = kind === 'explosion' ? 5e7 : kind === 'ignition' ? 5e6 : kind === 'landing' ? 1.5e6 : 3e5;
    const g = gainForLevel(soundPressureLevel(thrustEquivalent, distance, pressure)) * scale;
    if (g <= 0.003) return;
    const ctx = this.ctx, now = ctx.currentTime;
    // where it is heard from, and the reverberation it sets off
    const at = ctx.createGain();
    const panner = makePanner(ctx, !!direction);
    place(panner, direction ?? AHEAD, now, 0);
    at.connect(panner).connect(this.bus);
    const send = ctx.createGain();
    send.gain.value = reverbSend(distance);
    at.connect(send).connect(this.reverbIn);
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(at);
    const src = ctx.createBufferSource();
    src.buffer = this.buffers.get(kind === 'separation' ? 'white' : 'brown')!;
    const filter = ctx.createBiquadFilter();
    filter.type = kind === 'separation' ? 'bandpass' : 'lowpass';
    filter.frequency.value = Math.min(kind === 'separation' ? 1800 : 500, absorptionCutoff(distance));
    src.connect(filter).connect(out);
    const peak = Math.min(1, g), length = kind === 'explosion' ? 3.5 : kind === 'separation' ? 0.35 : 1.4;
    out.gain.setValueAtTime(0, now);
    out.gain.linearRampToValueAtTime(peak, now + 0.012);
    out.gain.exponentialRampToValueAtTime(0.0005, now + length);
    src.start(now, Math.random() * (NOISE_SECONDS - 4));
    src.stop(now + length + 0.05);
    // the noise outlasts the thump: when it ends, the cue's nodes can go (the reverberation rings on)
    src.onended = () => { at.disconnect(); };
    // a thump under the ignition and the landing: a falling sine
    if (kind === 'ignition' || kind === 'landing' || kind === 'explosion') {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(kind === 'landing' ? 70 : 55, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.5);
      const og = ctx.createGain();
      og.gain.setValueAtTime(peak * 0.8, now);
      og.gain.exponentialRampToValueAtTime(0.0005, now + 0.7);
      osc.connect(og).connect(at);
      osc.start(now);
      osc.stop(now + 0.75);
    }
  }

  dispose(): void {
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.voices = [];
    this.voiceIds = new Array<string | null>(MAX_VOICES).fill(null);
  }
}
