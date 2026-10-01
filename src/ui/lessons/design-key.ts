/**
 * A design lesson's key as the page builds it (roadmap T01): the design's
 * figures at the lesson's date and level (src/design/design-lesson-key.ts),
 * the lifetime flown in the lifetime worker (`runLifetimeJob`, inline where
 * there is none) — the satellite bench's own run — and the locks it broke.
 * DOM-free, so the re-check fixtures (tests/recheck-fixture-build.ts) hand a
 * design in exactly as the strip does.
 */
import { runLifetimeJob } from '../../physics/lifetime-job';
import { designLessonStart, designValues } from '../../design/design-lesson-key';
import { brokenDesignLocks, designLessonOptions } from '../../lessons/design-lesson';
import type { DesignKey, DesignLesson } from '../../lessons/types';
import type { SatelliteDesign } from '../../design/satellite-spec';

export async function designLessonKey(lesson: DesignLesson, design: SatelliteDesign, signal: AbortSignal,
  onProgress: (fraction: number) => void = () => {}): Promise<DesignKey> {
  const values = await designValues(design, designLessonOptions(lesson), (req) => runLifetimeJob(req, signal, onProgress).then((r) => r.lifetime));
  return { ...values, lockBroken: brokenDesignLocks(lesson.locked, designLessonStart(lesson.start), design) };
}
