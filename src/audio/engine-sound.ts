/**
 * The launch heard from the camera (roadmap V01), synthesised with the Web
 * Audio API — no sound files, so nothing to license and nothing to download.
 *
 * The roar is three layers of filtered noise: a deep rumble (brown noise, the
 * part that carries tens of kilometres), the body of the roar (pink noise)
 * and the crackle of the shock-laden exhaust (white noise gated by a random
 * envelope, which is what makes a rocket sound unlike a jet). Their mix
 * follows `acoustics.ts`: the level from the thrust, the air and the range;
 * the top of the band from the range; the pitch from the Doppler shift; and
 * everything from the retarded time, so the sound arrives when it would.
 * Ignition, separation, landing and loss are one-shot sounds cued by the
 * flight's events, delayed the same way.
 *
 * Browsers only let a page make sound after a user gesture: the context is
 * created by the sound button's click, and a context restored from an
 * earlier visit waits for the first click or key press on the page.
 */
import { absorptionCutoff, dopplerFactor, gainForLevel, soundPressureLevel, type SoundCue } from './acoustics';

const NOISE_SECONDS = 4;

type Colour = 'white' | 'pink' | 'brown';

function noiseBuffer(ctx: BaseAudioContext, colour: Colour): AudioBuffer {
  const n = Math.round(ctx.sampleRate * NOISE_SECONDS);
  const buffer = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buffer.getChannelData(ch);
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
  /** thrust at the retarded time, N */
  thrust: number;
  /** distance at the retarded time, m */
  distance: number;
  /** ambient pressure around the source, Pa */
  pressure: number;
  /** receding speed, m/s */
  radialSpeed: number;
}

export class EngineSound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  /** one-shot cues, beside the roar rather than under its level */
  private cueBus!: GainNode;
  private layers: { src: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode; weight: number }[] = [];
  private crackleGate!: GainNode;
  private buffers = new Map<Colour, AudioBuffer>();
  private enabled = false;

  get on(): boolean { return this.enabled; }

  /** Switch on (from a user gesture) or off. */
  setEnabled(on: boolean): void {
    this.enabled = on;
    if (on) {
      this.ensure();
      this.cueBus?.gain.setTargetAtTime(1, this.ctx!.currentTime, 0.05);
      void this.ctx?.resume().catch(() => { /* waits for a gesture */ });
    } else if (this.ctx) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.cueBus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
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
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.ratio.value = 6;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(compressor).connect(ctx.destination);
    this.cueBus = ctx.createGain();
    this.cueBus.connect(compressor);
    for (const c of ['white', 'pink', 'brown'] as Colour[]) this.buffers.set(c, noiseBuffer(ctx, c));
    const layer = (colour: Colour, type: BiquadFilterType, freq: number, q: number, weight: number, into: AudioNode = this.master) => {
      const src = ctx.createBufferSource();
      src.buffer = this.buffers.get(colour)!;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(into);
      src.start(0, Math.random() * NOISE_SECONDS);
      this.layers.push({ src, filter, gain, weight });
    };
    layer('brown', 'lowpass', 180, 0.7, 1.0);
    layer('pink', 'lowpass', 1400, 0.5, 0.55);
    // the crackle: bright noise through a gate that a slow random signal opens and shuts
    this.crackleGate = ctx.createGain();
    this.crackleGate.gain.value = 0;
    this.crackleGate.connect(this.master);
    layer('white', 'bandpass', 2400, 0.6, 0.45, this.crackleGate);
    const lfo = ctx.createBufferSource();
    lfo.buffer = this.buffers.get('white')!;
    lfo.loop = true;
    lfo.playbackRate.value = 0.0035;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.9;
    lfo.connect(lfoGain).connect(this.crackleGate.gain);
    lfo.start();
  }

  /**
   * Set the roar for this frame: `sources` are what is burning (the vehicle,
   * a stage flying home), `onboard` a camera fixed to the vehicle, which hears
   * the engines through the structure whatever the air outside, and `scale`
   * the time-warp gain.
   */
  update(sources: readonly HeardSource[], onboard: { throttle: number } | null, scale: number): void {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    let gain = 0, cutoff = 120, pitch = 1, weight = 0;
    for (const s of sources) {
      const g = gainForLevel(soundPressureLevel(s.thrust, s.distance, s.pressure));
      if (g <= 0) continue;
      gain = Math.hypot(gain, g);
      // the loudest source sets the colour of the sound
      if (g > weight) { weight = g; cutoff = absorptionCutoff(s.distance); pitch = dopplerFactor(s.radialSpeed); }
    }
    if (onboard && onboard.throttle > 0.01) {
      // structure-borne: a muffled, steady rumble in the cabin
      const g = 0.55 * Math.min(1, onboard.throttle);
      if (g > gain) { gain = g; cutoff = 420; pitch = 1; }
    }
    gain *= scale;
    const tc = 0.08;
    this.master.gain.setTargetAtTime(Math.min(1, gain), now, tc);
    const [rumble, body, crackle] = this.layers;
    rumble.gain.gain.setTargetAtTime(rumble.weight, now, tc);
    body.gain.gain.setTargetAtTime(body.weight * Math.min(1, cutoff / 900), now, tc);
    body.filter.frequency.setTargetAtTime(Math.min(1400, cutoff), now, tc);
    crackle.gain.gain.setTargetAtTime(crackle.weight * Math.min(1, Math.max(0, (cutoff - 1500) / 4000)), now, tc);
    crackle.filter.frequency.setTargetAtTime(Math.min(2400, cutoff * 0.8), now, tc);
    for (const l of this.layers) l.src.playbackRate.setTargetAtTime(pitch, now, 0.2);
  }

  /** A one-shot sound, at a level for its distance (m) and the air around it (Pa). */
  cue(kind: SoundCue, distance: number, pressure: number, scale: number): void {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running' || scale <= 0) return;
    // treat each as a short burst of a source of a few meganewtons' worth of noise
    const thrustEquivalent = kind === 'explosion' ? 5e7 : kind === 'ignition' ? 5e6 : kind === 'landing' ? 1.5e6 : 3e5;
    const g = gainForLevel(soundPressureLevel(thrustEquivalent, distance, pressure)) * scale;
    if (g <= 0.003) return;
    const ctx = this.ctx, now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(this.cueBus);
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
    // a thump under the ignition and the landing: a falling sine
    if (kind === 'ignition' || kind === 'landing' || kind === 'explosion') {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(kind === 'landing' ? 70 : 55, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.5);
      const og = ctx.createGain();
      og.gain.setValueAtTime(peak * 0.8, now);
      og.gain.exponentialRampToValueAtTime(0.0005, now + 0.7);
      osc.connect(og).connect(this.cueBus);
      osc.start(now);
      osc.stop(now + 0.75);
    }
  }

  dispose(): void {
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.layers = [];
  }
}
