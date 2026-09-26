/**
 * The launch heard from the camera (roadmap V01), synthesised with the Web
 * Audio API — no sound files, so nothing to license and nothing to download.
 *
 * The roar is three layers: a deep rumble (brown noise, the part that
 * carries tens of kilometres), the body of the roar (pink noise) and the
 * crackle of the shock-laden exhaust — what makes a rocket sound unlike a
 * jet. The crackle is not smooth noise but a train of sharp compressive
 * impulses at random moments and of heavy-tailed strength (the skewed
 * pressure waveform measured in rocket and jet exhaust), bursting as a slow
 * random signal opens and shuts it. Their mix follows `acoustics.ts`: the
 * level from the thrust, the air and the range; the top of the band from the
 * range; the pitch from the Doppler shift; and everything from the retarded
 * time, so the sound arrives when it would. The rocket's own character
 * (`profile.ts`) weights the layers; its bearing from the camera places it
 * left or right; near the ground the pad and the land around it throw the
 * roar back (a synthesised room: decaying noise through a convolver).
 * Ignition, separation, landing and loss are one-shot sounds cued by the
 * flight's events, delayed the same way.
 *
 * Browsers only let a page make sound after a user gesture: the context is
 * created by the sound button's click, and a context restored from an
 * earlier visit waits for the first click or key press on the page.
 */
import { absorptionCutoff, dopplerFactor, gainForLevel, soundPressureLevel, type SoundCue } from './acoustics';
import { NEUTRAL_PROFILE, type SoundProfile } from './profile';

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

/**
 * Crackle: compressive impulses at random moments (Poisson, `rate` a second)
 * with heavy-tailed strengths (Pareto, α = 2.5), each a sharp rise and a
 * decay of a fraction of a millisecond, the train's mean taken out. `random`
 * is injectable for tests.
 */
export function crackleSamples(n: number, sampleRate: number, rate = 380, random: () => number = Math.random): Float32Array {
  const d = new Float32Array(n);
  const p = rate / sampleRate, decay = Math.exp(-1 / (0.00018 * sampleRate));
  let y = 0;
  for (let i = 0; i < n; i++) {
    let kick = 0;
    if (random() < p) kick = Math.min(10, Math.pow(1 - random() * 0.999, -1 / 2.5));
    y = y * decay + kick;
    d[i] = y;
  }
  let mean = 0;
  for (let i = 0; i < n; i++) mean += d[i];
  mean /= n || 1;
  let peak = 0;
  for (let i = 0; i < n; i++) { d[i] -= mean; peak = Math.max(peak, Math.abs(d[i])); }
  if (peak > 0) for (let i = 0; i < n; i++) d[i] /= peak;
  return d;
}

/** The land's answer to a roar on the pad: 2.6 s of decaying, darkening noise, the two ears decorrelated. */
function reflectionImpulse(ctx: BaseAudioContext): AudioBuffer {
  const seconds = 2.6, n = Math.round(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buffer.getChannelData(ch);
    let lp = 0;
    // the first reflections (the pad's deck and the flame trench) come in the first 60 ms
    const early = Math.round(0.06 * ctx.sampleRate);
    for (let i = 0; i < n; i++) {
      const t = i / ctx.sampleRate;
      const w = Math.random() * 2 - 1;
      // high frequencies die first: the filter closes as the tail goes on
      const k = 0.5 + 0.45 * Math.min(1, t / seconds);
      lp = lp * k + w * (1 - k);
      const env = Math.exp(-t / 0.55) * (i < early ? 0.6 + 0.4 * Math.random() : 1);
      d[i] = lp * env * 2.2;
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
  /** where it is heard from: −1 full left, +1 full right */
  pan?: number;
  /** how much of it the ground throws back, 0–1 (a rocket on and just above the pad) */
  reflection?: number;
}

/** The roar's settings for a frame: what `EngineSound.update` sets its graph to. Pure, for tests. */
export interface RoarMix {
  gain: number;
  rumble: number;
  body: number;
  bodyCutoff: number;
  crackle: number;
  crackleFrom: number;
  pitch: number;
  pan: number;
  reflection: number;
}

export function mixFor(sources: readonly HeardSource[], onboard: { throttle: number } | null, scale: number, profile: SoundProfile = NEUTRAL_PROFILE): RoarMix {
  let gain = 0, cutoff = 120, pitch = 1, weight = 0, pan = 0, reflection = 0;
  for (const s of sources) {
    const g = gainForLevel(soundPressureLevel(s.thrust, s.distance, s.pressure));
    if (g <= 0) continue;
    gain = Math.hypot(gain, g);
    // the loudest source sets the colour of the sound and where it is heard from
    if (g > weight) {
      weight = g; cutoff = absorptionCutoff(s.distance); pitch = dopplerFactor(s.radialSpeed);
      pan = s.pan ?? 0; reflection = s.reflection ?? 0;
    }
  }
  let inside = false;
  if (onboard && onboard.throttle > 0.01) {
    // structure-borne: a muffled, steady rumble in the cabin, from all round
    const g = 0.55 * Math.min(1, onboard.throttle);
    if (g > gain) { gain = g; cutoff = 420; pitch = 1; pan = 0; reflection = 0; inside = true; }
  }
  gain = Math.min(1, gain * scale);
  const bright = Math.min(1, Math.max(0, (cutoff - 1500) / 4000));
  return {
    gain,
    rumble: profile.rumble,
    body: profile.body * Math.min(1, cutoff / 900),
    bodyCutoff: Math.min(1400 * profile.pitch, cutoff),
    crackle: inside ? 0 : profile.crackle * bright,
    crackleFrom: Math.min(1800, Math.max(500, cutoff * 0.3)),
    pitch: pitch * profile.pitch,
    pan: Math.max(-1, Math.min(1, pan)) * 0.85,
    reflection: Math.max(0, Math.min(1, reflection)) * 0.55,
  };
}

export class EngineSound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  /** one-shot cues, beside the roar rather than under its level */
  private cueBus!: GainNode;
  private layers: { src: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode; weight: number }[] = [];
  private crackleGate!: GainNode;
  private panner: StereoPannerNode | null = null;
  private reflectSend!: GainNode;
  private output!: GainNode;
  private buffers = new Map<Colour, AudioBuffer>();
  private crackleBuffer: AudioBuffer | null = null;
  private enabled = false;
  private profile: SoundProfile = { ...NEUTRAL_PROFILE };
  private volume = 1;

  get on(): boolean { return this.enabled; }

  /** The rocket's character (`profile.ts`). */
  setProfile(p: SoundProfile): void { this.profile = { ...p }; }

  /** The rocket's loudness in the mix, a gain (the slider's taper applied). */
  setVolume(gain: number): void {
    this.volume = Math.max(0, gain);
    if (this.ctx) this.output.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
  }

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
    this.output = ctx.createGain();
    this.output.gain.value = this.volume;
    compressor.connect(this.output).connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    // left or right by the rocket's bearing; older browsers without a panner hear it centred
    this.panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    const placed: AudioNode = this.panner ?? this.master;
    if (this.panner) this.master.connect(this.panner);
    placed.connect(compressor);
    // the ground's reflection, fed from the placed roar
    const convolver = ctx.createConvolver();
    convolver.buffer = reflectionImpulse(ctx);
    this.reflectSend = ctx.createGain();
    this.reflectSend.gain.value = 0;
    placed.connect(this.reflectSend).connect(convolver).connect(compressor);
    this.cueBus = ctx.createGain();
    this.cueBus.connect(compressor);
    for (const c of ['white', 'pink', 'brown'] as Colour[]) this.buffers.set(c, noiseBuffer(ctx, c));
    const crackle = ctx.createBuffer(2, Math.round(ctx.sampleRate * NOISE_SECONDS), ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) crackle.getChannelData(ch).set(crackleSamples(crackle.length, ctx.sampleRate));
    this.crackleBuffer = crackle;
    const layer = (colour: Colour | 'crackle', type: BiquadFilterType, freq: number, q: number, weight: number, into: AudioNode = this.master) => {
      const src = ctx.createBufferSource();
      src.buffer = colour === 'crackle' ? this.crackleBuffer! : this.buffers.get(colour)!;
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
    // the crackle: the impulse train, above the roar's body, through a gate
    // that a slow random signal half opens and shuts — it comes in bursts
    this.crackleGate = ctx.createGain();
    this.crackleGate.gain.value = 0.6;
    this.crackleGate.connect(this.master);
    layer('crackle', 'highpass', 700, 0.5, 0.6, this.crackleGate);
    const lfo = ctx.createBufferSource();
    lfo.buffer = this.buffers.get('white')!;
    lfo.loop = true;
    lfo.playbackRate.value = 0.0035;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.45;
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
    const m = mixFor(sources, onboard, scale, this.profile);
    const tc = 0.08;
    this.master.gain.setTargetAtTime(m.gain, now, tc);
    const [rumble, body, crackle] = this.layers;
    rumble.gain.gain.setTargetAtTime(rumble.weight * m.rumble, now, tc);
    rumble.filter.frequency.setTargetAtTime(180 * this.profile.pitch, now, tc);
    body.gain.gain.setTargetAtTime(body.weight * m.body, now, tc);
    body.filter.frequency.setTargetAtTime(m.bodyCutoff, now, tc);
    crackle.gain.gain.setTargetAtTime(crackle.weight * m.crackle, now, tc);
    crackle.filter.frequency.setTargetAtTime(m.crackleFrom, now, tc);
    for (const l of this.layers) l.src.playbackRate.setTargetAtTime(m.pitch, now, 0.2);
    this.panner?.pan.setTargetAtTime(m.pan, now, 0.12);
    this.reflectSend.gain.setTargetAtTime(m.reflection, now, 0.25);
  }

  /** A one-shot sound, at a level for its distance (m) and the air around it (Pa). */
  cue(kind: SoundCue, distance: number, pressure: number, scale: number, pan = 0): void {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running' || scale <= 0) return;
    // treat each as a short burst of a source of a few meganewtons' worth of noise
    const thrustEquivalent = kind === 'explosion' ? 5e7 : kind === 'ignition' ? 5e6 : kind === 'landing' ? 1.5e6 : 3e5;
    const g = gainForLevel(soundPressureLevel(thrustEquivalent, distance, pressure)) * scale;
    if (g <= 0.003) return;
    const ctx = this.ctx, now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0;
    // placed on its own: a stage falling away is heard where it is, whatever the roar
    const place = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    if (place) { place.pan.value = Math.max(-1, Math.min(1, pan)); out.connect(place).connect(this.cueBus); } else out.connect(this.cueBus);
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
      osc.connect(og).connect(place ?? this.cueBus);
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
