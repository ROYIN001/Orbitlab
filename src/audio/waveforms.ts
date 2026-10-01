/**
 * Sample generators for the launch sound (roadmap V01): the crackle of a
 * shock-laden exhaust and the impulse response of the open air round a pad.
 * Pure functions of a sample count or rate and a random stream, so they are
 * tested (tests/audio.test.ts) and `src/audio/engine-sound.ts` loads them
 * into buffers.
 *
 * **Crackle.** What makes a rocket sound unlike a jet is crackle: the
 * exhaust's turbulence throws off weak shocks, and the pressure at the
 * listener is a train of sudden rises, each followed by a slower fall.
 * Ffowcs Williams, Simson and Virchis (*Crackle: an annoying component of jet
 * noise*, J. Fluid Mech. 71, 1975) defined it by its waveform rather than its
 * spectrum: the pressure's skewness is above 0.4. So the generator draws
 * shocks, not noise — events at a rate that rises and falls with the
 * turbulence (a Poisson process thinned by a slow random intensity), each an
 * instant compression decaying in a fraction of a millisecond and paid back
 * by a shallow rarefaction so that it carries no net pressure, with a
 * log-normal strength, as the few strong shocks are what is heard.
 *
 * **Outdoor reverberation.** Silence for the pre-delay, a handful of discrete
 * echoes from the pad's towers and buildings, then a diffuse tail that builds
 * up over the first ~100 ms and dies away over a few seconds, losing its
 * treble as it goes (the air absorbs the high frequencies of the longer paths
 * first). Scaled to unit energy, so it passes noise at the level it receives it.
 */

/** Mean number of shocks a second. */
export const CRACKLE_RATE = 1500;
/** RMS of the crackle buffer. */
export const CRACKLE_RMS = 0.2;
/** Silence before the first echo of the outdoor reverberation, s. */
export const REVERB_PRE_DELAY = 0.025;
/** Length of the outdoor impulse response, s, and its reverberation time (60 dB of decay), s. */
export const REVERB_SECONDS = 3.2;
export const REVERB_RT60 = 2.6;

/** A standard normal deviate (Box–Muller). */
function gaussian(random: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
}

/**
 * `n` samples of crackle at `sampleRate`, looping without a seam (a shock
 * running off the end wraps round to the start).
 */
export function crackleSamples(n: number, sampleRate: number, random: () => number): Float32Array {
  const out = new Float32Array(n);
  if (n <= 0) return out;
  // the turbulence's slow swell: the mean of three random sinusoids between ~0.3 and ~3 Hz
  const swell = [0.4, 1.1, 2.7].map((f) => ({ f: f * (0.7 + 0.6 * random()), phase: 2 * Math.PI * random() }));
  const intensity = (t: number): number => {
    let s = 0;
    for (const w of swell) s += Math.sin(2 * Math.PI * w.f * t + w.phase);
    return Math.max(0.1, Math.min(2, 1 + 1.4 * s / swell.length));
  };
  // thinning (Lewis & Shedler): candidates at the peak rate, each kept with probability intensity / peak
  const peak = 2;
  let t = 0;
  for (;;) {
    t += -Math.log(1 - random()) / (CRACKLE_RATE * peak);
    const start = Math.floor(t * sampleRate);
    if (start >= n) break;
    if (random() * peak > intensity(t)) continue;
    const amp = Math.exp(0.5 * gaussian(random));
    // the compression decays with a time constant of 0.15–0.6 ms; the rarefaction lasts six of them
    const tau = Math.max(1, (0.15 + 0.45 * random()) * 1e-3 * sampleRate);
    const len = Math.max(2, Math.ceil(6 * tau));
    const decay = Math.exp(-1 / tau);
    // the window's mean of the decay, subtracted so the shock carries no net pressure
    const mean = (1 - decay ** len) / (1 - decay) / len;
    let e = 1;
    for (let k = 0; k < len; k++) {
      out[(start + k) % n] += amp * (e - mean);
      e *= decay;
    }
  }
  let sum = 0, sq = 0;
  for (let i = 0; i < n; i++) sum += out[i];
  const dc = sum / n;
  for (let i = 0; i < n; i++) { out[i] -= dc; sq += out[i] * out[i]; }
  const scale = sq > 0 ? CRACKLE_RMS / Math.sqrt(sq / n) : 0;
  for (let i = 0; i < n; i++) out[i] *= scale;
  return out;
}

/** Two channels of the outdoor impulse response at `sampleRate`, decorrelated, each of unit energy. */
export function outdoorImpulse(sampleRate: number, random: () => number, seconds = REVERB_SECONDS): [Float32Array, Float32Array] {
  const n = Math.max(1, Math.round(seconds * sampleRate));
  const channel = (): Float32Array => {
    const h = new Float32Array(n);
    const pre = Math.round(REVERB_PRE_DELAY * sampleRate);
    let lp = 0;
    for (let i = pre; i < n; i++) {
      const t = i / sampleRate, since = t - REVERB_PRE_DELAY;
      // the treble dies first: a one-pole low-pass whose corner falls from ~6 kHz to 400 Hz
      const corner = 400 + 5600 * Math.exp(-t / 0.6);
      const a = 1 - Math.exp(-2 * Math.PI * corner / sampleRate);
      lp += a * ((random() * 2 - 1) - lp);
      const envelope = Math.exp(-6.91 * t / REVERB_RT60) * (1 - Math.exp(-since / 0.08));
      h[i] = envelope * lp;
    }
    // discrete echoes off the pad's structures, 30–380 ms, each a 0.5 ms raised-cosine burst standing
    // out of the diffuse sound round it
    const burst = Math.max(2, Math.round(0.5e-3 * sampleRate));
    for (let k = 0; k < 7; k++) {
      const at = 0.03 + 0.35 * random();
      const amp = 3 * Math.exp(-at / 0.2) * (0.6 + 0.4 * random());
      const start = Math.round(at * sampleRate);
      for (let j = 0; j < burst && start + j < n; j++) h[start + j] += amp * 0.5 * (1 - Math.cos(2 * Math.PI * j / burst));
    }
    let energy = 0;
    for (let i = 0; i < n; i++) energy += h[i] * h[i];
    const scale = energy > 0 ? 1 / Math.sqrt(energy) : 0;
    for (let i = 0; i < n; i++) h[i] *= scale;
    return h;
  };
  return [channel(), channel()];
}
