/**
 * R3.5: the mission's steps, Build → Check → Launch → Result → Orbit, shown
 * small under its name at the Explore and Engineer levels, so a learner can
 * see where the mission they are working on stands and step to the next part
 * of the experiment.
 *
 * Read off what the shell already knows — the lifecycle stage (R2.1's
 * `missionStage`), whether the setup's inputs are usable, whether the flight
 * on screen is in an orbit that can be carried on — and nothing else. Docking
 * joins the chain when the Orbit section can fly it (R5).
 *
 * DOM-free, so it can be tested.
 */
import type { MissionStage } from './flight-lifecycle';

export const MISSION_STEPS = ['build', 'check', 'launch', 'result', 'orbit'] as const;
export type MissionStep = typeof MISSION_STEPS[number];

/**
 * - `done`: behind the mission
 * - `current`: where it stands now
 * - `todo`: ahead of it, reachable
 * - `off`: this flight cannot get there (a flight that ended out of orbit has no Orbit)
 */
export type StepState = 'done' | 'current' | 'todo' | 'off';

export function missionSteps(o: { stage: MissionStage; valid: boolean; inOrbit: boolean }): Record<MissionStep, StepState> {
  if (o.stage === 'setup') {
    return { build: 'done', check: o.valid ? 'done' : 'current', launch: o.valid ? 'current' : 'todo', result: 'todo', orbit: 'todo' };
  }
  if (o.stage === 'flight') {
    return { build: 'done', check: 'done', launch: 'current', result: 'todo', orbit: 'todo' };
  }
  return { build: 'done', check: 'done', launch: 'done', result: 'current', orbit: o.inOrbit ? 'todo' : 'off' };
}

/**
 * Whether a step's chip does something now: Build opens the Build section,
 * Check the setup's verdict before launch, Result the result card once there is one, Orbit
 * the hand-off once the flight is in orbit. Launch is the screen it is on.
 */
export function stepActionable(step: MissionStep, o: { stage: MissionStage; inOrbit: boolean }): boolean {
  switch (step) {
    case 'build': return true;
    // the verdict is in the setup, open while the mission is being set up
    case 'check': return o.stage === 'setup';
    case 'launch': return false;
    case 'result': return o.stage === 'analysis';
    case 'orbit': return o.inOrbit;
  }
}

/** Dictionary key of each step's name. */
export const MISSION_STEP_KEY: Readonly<Record<MissionStep, string>> = {
  build: 'ctx.step.build', check: 'ctx.step.check', launch: 'ctx.step.launch', result: 'ctx.step.result', orbit: 'ctx.step.orbit',
};
