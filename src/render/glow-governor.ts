/**
 * Whether the machine can afford the bloom, decided from the frame rate.
 *
 * Bloom is eleven extra full-screen passes, and on an integrated GPU at a high
 * pixel ratio that is the difference between a smooth launch and a slideshow.
 * The first version of this decision cut the glow whenever the smoothed frame
 * time passed 32 ms and never looked again, which misread two things:
 *
 * - A display or a power mode that caps the frame rate at 30 fps — iPhone Low
 *   Power Mode, Chrome's energy saver, a 30 Hz external screen — always runs
 *   at 33.3 ms, however little the GPU is doing. Every such device lost the
 *   glow a few seconds after the page opened, permanently.
 * - A slow frame is not necessarily the bloom's fault. When turning it off
 *   does not make the frames faster, the glow was costing nothing and was
 *   lost for nothing.
 *
 * So the threshold is below 30 fps, and the cut-out is a trial: the glow is
 * switched off, the frame time is measured again, and if it did not get
 * meaningfully faster the glow comes back and the question is closed. The
 * governor is pure — frame times in, a decision out — so the rule is tested
 * without a GPU (tests/glow-governor.test.ts).
 */

/** Smoothed frame time above which the glow is put on trial, s (24 fps). */
export const GLOW_SLOW_FRAME = 1 / 24;
/** Frames ignored after the page opens: uploads, compiles, the first mission. */
export const GLOW_WARMUP_FRAMES = 240;
/** Frames the trial waits for the smoothing to settle, then measures over. */
export const GLOW_TRIAL_SETTLE = 60;
export const GLOW_TRIAL_FRAMES = 120;
/** The trial keeps the glow off only if the frames got this much faster. */
export const GLOW_TRIAL_GAIN = 0.15;

export type GlowAction = 'off' | 'on' | null;

export class GlowGovernor {
  /** smoothed frame time, s */
  frameTime = 1 / 60;
  private frames = 0;
  /** frame time with the glow on when the trial started */
  private before = 0;
  private trialFrame = -1;
  private trialSum = 0;
  private trialCount = 0;
  /** the question is answered: leave the glow as it is */
  settled = false;

  /**
   * Feed one frame interval. `measuring` is false for frames that say nothing
   * about the steady rendering cost — a fast-forward spending its 30 ms
   * physics budget, a tab that was in the background. Returns what to do with
   * the glow, if anything.
   */
  sample(dt: number, glowOn: boolean, measuring = true): GlowAction {
    if (!measuring || !(dt > 0)) return null;
    this.frameTime += (dt - this.frameTime) * 0.05;
    if (this.frames++ < GLOW_WARMUP_FRAMES || this.settled) return null;
    if (this.trialFrame >= 0) {
      const age = this.frames - this.trialFrame;
      if (age > GLOW_TRIAL_SETTLE) { this.trialSum += dt; this.trialCount++; }
      if (this.trialCount < GLOW_TRIAL_FRAMES) return null;
      const without = this.trialSum / this.trialCount;
      this.trialFrame = -1;
      this.settled = true;
      // Faster without it: the glow really was the cost, and it stays off.
      if (without < this.before * (1 - GLOW_TRIAL_GAIN)) return null;
      this.frameTime = this.before;
      return 'on';
    }
    if (glowOn && this.frameTime > GLOW_SLOW_FRAME) {
      this.before = this.frameTime;
      this.trialFrame = this.frames;
      this.trialSum = 0;
      this.trialCount = 0;
      return 'off';
    }
    return null;
  }

  /** Someone pressed the button: their opinion outranks the heuristic. */
  settle(): void {
    this.settled = true;
    this.trialFrame = -1;
  }
}
