/**
 * The bending filter of the attitude loop (roadmap P05): a second-order notch
 *
 *   H(s) = (s² + 2ζ_z ω_n s + ω_n²) / (s² + 2ζ_p ω_n s + ω_n²),
 *
 * unity at zero frequency and at high frequency, ζ_z/ζ_p at ω_n, discretised
 * by the bilinear (Tustin) transform prewarped at ω_n so the notch sits exactly
 * where it is asked to (Franklin, Powell & Workman, Digital Control of Dynamic
 * Systems, 3rd ed., §6.3). Its centre is scheduled on the bending frequency the
 * flight software predicts for the current configuration, as real launchers
 * schedule theirs on time of flight from pre-flight modal analysis.
 */

export interface Biquad { b0: number; b1: number; b2: number; a1: number; a2: number }

/**
 * Past this fraction of the Nyquist frequency a notch cannot be placed on the
 * control clock (the prewarp tangent runs away); the filter passes its input.
 */
export const NOTCH_NYQUIST_LIMIT = 0.8;

export function notchCoefficients(centerRadS: number, zetaZero: number, zetaPole: number, dt: number): Biquad | null {
  if (![centerRadS, zetaZero, zetaPole, dt].every(Number.isFinite) || centerRadS <= 0 || dt <= 0 || zetaZero < 0 || zetaPole <= 0) {
    throw new RangeError('Invalid notch filter');
  }
  const half = centerRadS * dt / 2;
  if (half >= NOTCH_NYQUIST_LIMIT * Math.PI / 2) return null;
  const K = centerRadS / Math.tan(half), K2 = K * K, w2 = centerRadS * centerRadS;
  const a0 = K2 + 2 * zetaPole * centerRadS * K + w2;
  return {
    b0: (K2 + 2 * zetaZero * centerRadS * K + w2) / a0,
    b1: (2 * w2 - 2 * K2) / a0,
    b2: (K2 - 2 * zetaZero * centerRadS * K + w2) / a0,
    a1: (2 * w2 - 2 * K2) / a0,
    a2: (K2 - 2 * zetaPole * centerRadS * K + w2) / a0,
  };
}

/** Gain and phase (rad) of a discrete biquad at frequency ω, sampled every dt. */
export function biquadResponse(f: Biquad, omegaRadS: number, dt: number): { gain: number; phase: number } {
  const c1 = Math.cos(omegaRadS * dt), s1 = -Math.sin(omegaRadS * dt), c2 = Math.cos(2 * omegaRadS * dt), s2 = -Math.sin(2 * omegaRadS * dt);
  const nr = f.b0 + f.b1 * c1 + f.b2 * c2, ni = f.b1 * s1 + f.b2 * s2;
  const dr = 1 + f.a1 * c1 + f.a2 * c2, di = f.a1 * s1 + f.a2 * s2;
  const den = dr * dr + di * di;
  const re = (nr * dr + ni * di) / den, im = (ni * dr - nr * di) / den;
  return { gain: Math.hypot(re, im), phase: Math.atan2(im, re) };
}

/** One channel, transposed direct form II. */
export class BiquadChannel {
  private s1 = 0;
  private s2 = 0;
  step(input: number, f: Biquad): number {
    const output = f.b0 * input + this.s1;
    this.s1 = f.b1 * input - f.a1 * output + this.s2;
    this.s2 = f.b2 * input - f.a2 * output;
    return output;
  }
  /** Start from a steady input (no step transient). */
  settle(input: number, f: Biquad): void {
    // At rest y = x (unity DC gain): s2 = (b2 − a2)x, s1 = (b1 − a1)x + s2.
    this.s2 = (f.b2 - f.a2) * input;
    this.s1 = (f.b1 - f.a1) * input + this.s2;
  }
  reset(): void { this.s1 = 0; this.s2 = 0; }
}
