/**
 * R3.5: where the mission on the launch screen comes from, said beside its
 * name, so it is always clear whether the flight is the user's own design, a
 * catalogue rocket, a lesson's mission or a launch the viewer prepared (which
 * is not the user's saved mission until they change it — the workspace's A1
 * rule in ./workspace-mission.ts).
 */
import type { MissionOrigin } from './workspace-mission';

export type MissionSource = 'viewer' | 'template' | 'lesson' | 'design' | 'catalogue';

export function missionSource(o: { origin: MissionOrigin; lesson: boolean; customVehicle: boolean; customSatellite: boolean }): MissionSource {
  if (o.lesson) return 'lesson';
  if (o.origin === 'template') return 'template';
  if (o.origin !== 'workspace') return 'viewer';
  return o.customVehicle || o.customSatellite ? 'design' : 'catalogue';
}

/** Dictionary key of each source's label. */
export const MISSION_SOURCE_KEY: Readonly<Record<MissionSource, string>> = {
  viewer: 'ctx.source.viewer', template: 'ctx.source.template', lesson: 'ctx.source.lesson', design: 'ctx.source.design', catalogue: 'ctx.source.catalogue',
};
