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
import { designDateJd, designFromTemplate, withValue } from '../../design/satellite-model';
import { gmst } from '../../physics/orbital';
import type { SatelliteDesign } from '../../design/satellite-spec';
import { DESIGN_LOCK_KEYS } from '../design-lesson';
import type { DesignLockKey, LessonPack, LockKey } from '../types';

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

// ─── design lessons (T03b: B6, P5, P6, R6, S6) ──────────────────────────────

/**
 * The day and the air every pack design lesson reads its figures on (T01:
 * fixed in the file, never the measured series, so a grade reproduces on any
 * day; map R6): the day the design lessons were added to the packs, and
 * ECSS's moderate level. None of the five asks for the lifetime, so the level
 * only sets the air the torques and the drag make-up are read in.
 */
export const PACK_DESIGN_DATE = '2026-10-01';
export const PACK_DESIGN_LEVEL = 'moderate';

/** Every part of a design locked but the given ones: a lesson that names what the student may change. */
export const designLocksBut = (...free: DesignLockKey[]): DesignLockKey[] => DESIGN_LOCK_KEYS.filter((k) => !free.includes(k));

/**
 * A lesson's whole start design: template `template` as the designer makes it
 * (`designFromTemplate`), with the numbers in `changes` (paths as the
 * satellite model's fields name them, stored units) set as a student would
 * type them (`withValue`). The file then holds the whole design, so a later
 * change to a template does not change the lesson (the T01 review's doubt 3);
 * tests/lesson-packs.test.ts fails if the regenerated file would differ.
 */
export function designFrom(template: string, id: string, name: string, changes: Readonly<Record<string, number>> = {}): SatelliteDesign {
  let d = designFromTemplate(template, id, name);
  for (const [path, value] of Object.entries(changes)) d = withValue(d, path, value);
  return d;
}

/**
 * The right ascension of the node, deg (to 0.001°), that puts a geostationary
 * design over longitude `lonDeg` (east positive) on design date `date`: a
 * design's orbit starts with the satellite on its node (ω = 0, M₀ = 0,
 * src/design/satellite-handoff.ts `designOrbit`) at 0 h UT of the date, so
 * its right ascension there is the node's, and the longitude below it is that
 * less the Greenwich sidereal time (`gmst`).
 */
export function geoRaan(lonDeg: number, date: string): number {
  const jd = designDateJd(date);
  if (jd === null) throw new RangeError(`not a design date: ${date}`);
  const raan = (((lonDeg + (gmst(jd) * 180) / Math.PI) % 360) + 360) % 360;
  return Math.round(raan * 1000) / 1000;
}

/** A pack's source: the pack, and its own lessons as plain data, read by the same reader as any lesson file. */
export interface PackSource {
  pack: LessonPack;
  lessons: readonly unknown[];
}
