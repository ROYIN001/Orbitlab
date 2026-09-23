import { describe, expect, it } from 'vitest';
import { GlowGovernor, GLOW_TRIAL_FRAMES, GLOW_TRIAL_SETTLE, GLOW_WARMUP_FRAMES, type GlowAction } from '../src/render/glow-governor';

/** Run `n` frames of `dt` (or of whatever `dt(glowOn)` says) and collect the decisions. */
function run(g: GlowGovernor, n: number, dt: (glowOn: boolean) => number, state = { on: true }): GlowAction[] {
  const actions: GlowAction[] = [];
  for (let i = 0; i < n; i++) {
    const a = g.sample(dt(state.on), state.on);
    if (a === 'off') state.on = false;
    if (a === 'on') state.on = true;
    if (a) actions.push(a);
  }
  return actions;
}

describe('automatic glow cut-out', () => {
  it('leaves the glow on at a capped 30 fps', () => {
    const g = new GlowGovernor();
    expect(run(g, 5000, () => 1 / 30)).toEqual([]);
  });

  it('cuts the glow when it is what makes the frames slow', () => {
    const g = new GlowGovernor();
    const state = { on: true };
    // 18 fps with the glow, 45 fps without it
    const actions = run(g, GLOW_WARMUP_FRAMES + 2000, on => (on ? 1 / 18 : 1 / 45), state);
    expect(actions).toEqual(['off']);
    expect(state.on).toBe(false);
    expect(g.settled).toBe(true);
  });

  it('gives the glow back when turning it off did not help', () => {
    const g = new GlowGovernor();
    const state = { on: true };
    // 20 fps either way: something else is the bottleneck
    const actions = run(g, GLOW_WARMUP_FRAMES + 2000, () => 1 / 20, state);
    expect(actions).toEqual(['off', 'on']);
    expect(state.on).toBe(true);
    // ...and does not try again
    expect(run(g, 3000, () => 1 / 20, state)).toEqual([]);
  });

  it('decides only after the warm-up and a settled trial', () => {
    const g = new GlowGovernor();
    const state = { on: true };
    expect(run(g, GLOW_WARMUP_FRAMES, () => 1 / 10, state)).toEqual([]);
    expect(run(g, 1, () => 1 / 10, state)).toEqual(['off']);
    expect(run(g, GLOW_TRIAL_SETTLE + GLOW_TRIAL_FRAMES - 1, () => 1 / 10, state)).toEqual([]);
    expect(run(g, 2, () => 1 / 10, state)).toEqual(['on']);
  });

  it('ignores frames that are not measuring the renderer and a manual choice', () => {
    const g = new GlowGovernor();
    for (let i = 0; i < 5000; i++) expect(g.sample(0.1, true, false)).toBeNull();
    g.settle();
    expect(run(g, 5000, () => 0.1)).toEqual([]);
  });
});
