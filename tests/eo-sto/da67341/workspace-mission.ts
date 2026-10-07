/** da67341's mission-origin rules and Home's summary: lines 33-39 and 50-133 of da67341:src/ui/workspace-mission.ts, verbatim. */
import { MISSION_FORMAT } from './mission-file';

export type MissionOrigin =
  /** the user's: stored on every preview */
  | 'workspace'
  /** the featured launch the landing page and the viewers open on */
  | 'demo'
  /** a launch picked in the Watch viewer */
  | 'watch';

/**
 * The origin of the panel's mission. Missions are compared as their stored
 * document's text (`JSON.stringify(missionDocument(state))`), so any change
 * the stored copy would record counts as a change.
 */
export class WorkspaceMission {
  private currentOrigin: MissionOrigin = 'workspace';
  /** the viewer's mission as it was loaded; null while it is being loaded */
  private loadedDoc: string | null = null;

  get origin(): MissionOrigin {
    return this.currentOrigin;
  }

  /**
   * A viewer is about to load its mission into the panel. Until `loaded` is
   * called with the result, a preview of it does not count as a change.
   */
  viewing(origin: 'demo' | 'watch'): void {
    this.currentOrigin = origin;
    this.loadedDoc = null;
  }

  /** The viewer's mission, as the panel holds it once loaded. */
  loaded(doc: string): void {
    if (this.currentOrigin !== 'workspace') this.loadedDoc = doc;
  }

  /** The panel now holds the user's mission (the stored one, a link, a file, a lesson, a Monte Carlo run). */
  adopt(): void {
    this.currentOrigin = 'workspace';
    this.loadedDoc = null;
  }

  /** Whether the panel holds the user's mission, a changed viewer's mission becoming the user's. */
  private settle(doc: string): boolean {
    if (this.currentOrigin !== 'workspace' && this.loadedDoc !== null && doc !== this.loadedDoc) this.adopt();
    return this.currentOrigin === 'workspace';
  }

  /** A preview of `doc`: whether the page should store it. */
  persists(doc: string): boolean {
    return this.settle(doc);
  }

  /**
   * Explore or Engineer is being entered with `doc` in the panel: whether to
   * bring the stored mission back in its place.
   *
   * @param underway the panel's mission is flying, or has flown, rather than
   *   standing on its pad
   */
  entering(o: { doc: string; stored: boolean; underway: boolean }): boolean {
    if (this.settle(o.doc)) return false;
    return o.stored && !o.underway;
  }
}

/** A stored mission in a line: the vehicle, the payload and the orbit asked for. */
export interface MissionSummary {
  vehicleId: string;
  /** the custom vehicle's name (S02); a catalogue vehicle is named by its id */
  vehicleName: string | null;
  payloadKg: number;
  perigeeKm: number;
  apogeeKm: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * The summary Home's "continue" card shows, read straight off a stored
 * document; null when it does not look like a mission (it is fully checked,
 * with `parseMissionDocument`, when it is loaded).
 */
export function missionSummary(raw: unknown): MissionSummary | null {
  if (!isRecord(raw) || raw.format !== MISSION_FORMAT || !isRecord(raw.mission)) return null;
  const m = raw.mission;
  if (typeof m.vehicleId !== 'string' || !finite(m.payloadMass) || !isRecord(m.orbit)) return null;
  if (!finite(m.orbit.perigee) || !finite(m.orbit.apogee)) return null;
  const spec = isRecord(m.vehicleSpec) && typeof m.vehicleSpec.name === 'string' ? m.vehicleSpec.name : null;
  return { vehicleId: m.vehicleId, vehicleName: spec, payloadKg: m.payloadMass, perigeeKm: m.orbit.perigee / 1000, apogeeKm: m.orbit.apogee / 1000 };
}
