/**
 * The app's side of the Structure section's hand-off (`HandoffEnv`,
 * src/structure/handoff.ts): the educational satellite made into the app's
 * own satellite record, checked as the Build section checks a design before
 * it hands one on, and given to the Orbit or Launch section through the
 * app's own doors (`StructureAppHost`, which src/main.ts provides).
 *
 * A send to Launch replaces the mission open there, as Build's hand-off
 * does. What Launch had before this section first replaced it is kept (its
 * panel's mission and its stored copy, byte for byte), together with what
 * its panel held right after the last send: while Launch still holds that, a
 * later send keeps the first "before", and "put back" is offered; once the
 * learner has made another mission there, it is not (it would replace
 * theirs). In memory only: it ends with the page.
 *
 * In the app's own bundle. The section's files are imported as types only,
 * so the section stays one chunk of its own.
 */
import { satelliteDesignProblems } from '../config/satellite-design';
import type { MissionDocument, MissionState } from '../config/mission-file';
import { vehicleById } from '../data/vehicles';
import { designLaunch, designMissionDocument, designMissionIssues } from '../design/satellite-launch';
import { designDateJd, designHandoff } from '../design/satellite-model';
import type { OrbitHandoff } from '../orbit/handoff';
import type { HandoffEnv, HandoffReceipt, SendResult } from '../structure/handoff';
import type { AppLevel } from '../ui/app-mode';
import { handoffPreview, satelliteDesign } from './satellite';

/** The Launch section's mission as kept before a send: on its panel, and as stored (byte for byte, null with none). */
export interface LaunchKept { shown: MissionDocument; stored: string | null }

/** The app's own doors the hand-off goes through (src/main.ts). */
export interface StructureAppHost {
  /** hand a satellite to the Orbit section and open it at `level`: what Orbit now holds, read back from it, or null when it holds none */
  toOrbit(h: OrbitHandoff, level: AppLevel): HandoffReceipt | null;
  /** hand a mission to the Launch section and open it at `level`: the mission Launch now holds, read back after its checks, or null */
  toLaunch(doc: MissionDocument, level: AppLevel): HandoffReceipt | null;
  /** what the Launch section has now, kept before a send replaces it: its panel's mission and the stored copy's exact text (null with none) */
  launchMission(): LaunchKept;
  /** put what was kept back in the Launch section (stored copy first) and open it at `level`; false when Launch could not use it */
  restoreLaunch(kept: LaunchKept, level: AppLevel): boolean;
}

/** What the Launch section holds of a mission, read from its state after its checks: the payload, the target, the values it put back. */
export function launchReceipt(m: Pick<MissionState, 'payloadMass' | 'orbit' | 'siteId'>, replaced: number): HandoffReceipt {
  return { mass: m.payloadMass, perigeeAlt: m.orbit.perigee, apogeeAlt: m.orbit.apogee, inclination: m.orbit.inclination, replaced, siteId: m.siteId };
}

/** The vehicle and site a hypothetical launch of the educational satellite uses: the section's own reference rocket, from Vostochny. */
export const STRUCTURE_FLIGHT = { vehicleId: 'soyuz21b', siteId: 'vostochny' } as const;

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

export function structureHandoff(host: StructureAppHost, now: () => Date = () => new Date()): HandoffEnv {
  let kept: { before: LaunchKept; after: MissionDocument } | null = null;
  const canRestoreLaunch = (): boolean => !!kept && same(host.launchMission().shown, kept.after);
  return {
    preview: (record) => handoffPreview(satelliteDesign(record)),
    send(where, record, level): SendResult {
      const sat = satelliteDesign(record);
      const sent = handoffPreview(sat);
      if (where === 'orbit') {
        const jd = designDateJd(now().toISOString().slice(0, 10));
        const h = jd === null ? null : designHandoff(sat, jd, record.name);
        // handed over once Orbit has it: no read-back is then said as such, not as a refusal
        return h ? { ok: true, sent, receipt: host.toOrbit(h, level) } : { ok: false, reason: 'design' };
      }
      // the checks the Build section runs before it hands a design to Launch: a design or mission with issues is not handed over.
      // The design's own first: the launch checks work a design out, and throw on one that is not sound.
      const flight = { vehicle: vehicleById(STRUCTURE_FLIGHT.vehicleId), siteId: STRUCTURE_FLIGHT.siteId, from: now() };
      let issues = satelliteDesignProblems(sat).length;
      if (!issues) {
        try { issues = designLaunch(sat).problems.length + designMissionIssues(sat, flight).length; } catch { return { ok: false, reason: 'design' }; }
      }
      if (issues) return { ok: false, reason: 'checks', issues };
      // what Launch has now, kept so it can be put back: the learner's, unless Launch still holds our last send
      const shown = host.launchMission();
      const before = kept && same(shown.shown, kept.after) ? kept.before : shown;
      const receipt = host.toLaunch(designMissionDocument(sat, flight), level);
      if (!receipt) return { ok: false, reason: 'launch' };
      kept = { before, after: host.launchMission().shown };
      return { ok: true, sent, receipt };
    },
    canRestoreLaunch,
    restoreLaunch(level): boolean {
      if (!kept) return false;
      // Launch holds another mission now (the learner's): nothing is put back over it, and the offer ends
      if (!canRestoreLaunch()) { kept = null; return false; }
      if (!host.restoreLaunch(kept.before, level)) return false;
      kept = null;
      return true;
    },
  };
}
