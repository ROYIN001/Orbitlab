/**
 * What the lesson packs' sources share (roadmap T03, Phase 4 map §4.3).
 *
 * The files in this folder are the source of the packs the app ships,
 * public/lessons/packs/<id>.orbitlab-lesson.json: `scripts/lesson-packs.ts`
 * writes those files from them, and tests/lesson-packs.test.ts holds the
 * committed files to what these sources write, then flies each lesson's
 * worked solution. The app itself never imports this folder: it fetches the
 * files (src/lessons/packs.ts), so the packs' texts stay out of its bundle.
 */
import { LESSON_LAUNCH, missionDoc } from '../builtin/common';
import { launchWindows } from '../../physics/mission';
import { orbitById } from '../../data/orbits';
import { siteById } from '../../data/sites';
import type { LessonPack, LockKey } from '../types';

export { missionDoc };

export const POINT_MASS = { model: 'pointMass', wind: 'calm', seed: 20260919 } as const;
export const SIX_DOF = { model: 'sixDof', wind: 'calm', seed: 20260919 } as const;

/** Every setting of the mission held: a lesson whose task is to fly and read, not to choose. */
export const ALL_LOCKS: readonly LockKey[] = [
  'setup.vehicle', 'setup.site', 'setup.satellite', 'setup.payloadMass', 'setup.orbit', 'setup.launchTime',
  'setup.failure', 'setup.dynamics.model', 'setup.guidance', 'setup.boosterRecovery', 'setup.faults',
];

/** All but the given settings held. */
export const locksBut = (...free: LockKey[]): LockKey[] => ALL_LOCKS.filter((k) => !free.includes(k));

/**
 * The first launch window after the built-in lessons' common launch moment
 * for a plane that is fixed in space (the station's, a sun-synchronous
 * orbit's), as the setup panel's "Next window" computes it: a lesson whose
 * task is not the window flies from it, so its target orbit is reached.
 */
export function windowAfter(orbitId: string, siteId: string): string {
  return launchWindows(orbitById(orbitId), siteById(siteId), new Date(LESSON_LAUNCH), 1)[0].time.toISOString();
}

/** A pack's source: the pack, and its own lessons as plain data, read by the same reader as any lesson file. */
export interface PackSource {
  pack: LessonPack;
  lessons: readonly unknown[];
}
