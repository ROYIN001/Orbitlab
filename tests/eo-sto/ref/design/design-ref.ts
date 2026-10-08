/**
 * R3.1: which design a mission flies, and which revision of it — carried from
 * the Build section to Launch ("Fly it") and on to Orbit (the hand-off,
 * "Send to Orbit"), so the learner can always tell what they are flying.
 *
 * A design's identity is its saved record (src/design/design-store.ts): the
 * record's id, and its revision the time it was last saved (`updated`), which
 * every save already writes — no new field in the store or its files. A design
 * flown with changes since that save says so (`edited`), and one never saved
 * has no revision at all; neither is passed off as the saved one.
 *
 * The reference rides beside a mission, never inside it: at the top level of
 * the stored mission document (`MissionDocument.design`), which the mission
 * parser ignores, so files and stores written before it read exactly as they
 * did, and an older build reading a newer document simply does not see it. It
 * holds while the mission still flies that design (`refFlies`: the custom
 * vehicle's or satellite's spec id); picking another vehicle drops it.
 *
 * DOM-free and dictionary-free.
 */
import type { DesignKind } from './design-store';

export interface DesignRef {
  kind: DesignKind;
  /** what its designer calls it, as flown */
  name: string;
  /** the saved record's id; null for a design never saved */
  recordId: string | null;
  /** the saved record's last save, ISO 8601 UTC — its revision; null for a design never saved */
  revision: string | null;
  /** what flies differs from that saved revision */
  edited: boolean;
  /** the id of the spec it flies as (`VehicleSpec.id`, `SatelliteSpec.id`) */
  specId: string;
}

export type DesignRefState = 'saved' | 'edited' | 'unsaved';

export function designRefState(ref: DesignRef): DesignRefState {
  if (ref.recordId === null || ref.revision === null) return 'unsaved';
  return ref.edited ? 'edited' : 'saved';
}

/** JSON with every object's keys in order, so two equal designs compare equal whatever order their fields were written in. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).filter((k) => obj[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * The reference for the design on screen as it is flown.
 *
 * @param record the saved record it came from, as kept now (null when it was never saved, or is no longer kept)
 */
export function designRefFor(kind: DesignKind, current: { name: string; recordId: string | null; design: unknown }, specId: string,
  record: { id: string; updated: string; design: unknown } | null): DesignRef {
  const saved = record && current.recordId !== null && record.id === current.recordId ? record : null;
  return {
    kind, name: current.name.trim(), specId,
    recordId: saved ? saved.id : null,
    revision: saved ? saved.updated : null,
    edited: saved ? canonicalJson(saved.design) !== canonicalJson(current.design) : false,
  };
}

/** Whether a mission still flies the design: its custom satellite's or vehicle's spec is the one the reference names. */
export function refFlies(ref: DesignRef, mission: { vehicleSpec?: { id: string }; satelliteSpec?: { id: string } }): boolean {
  return ref.kind === 'satellite' ? mission.satelliteSpec?.id === ref.specId : mission.vehicleSpec?.id === ref.specId;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/**
 * A reference read back from a stored document or a hand-off: undefined when
 * there is none, 'invalid' when one is there but cannot be trusted — the
 * caller refuses it rather than showing a design it cannot vouch for.
 */
export function parseDesignRef(raw: unknown): DesignRef | undefined | 'invalid' {
  if (raw === undefined) return undefined;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'invalid';
  const r = raw as Record<string, unknown>;
  const str = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
  if (r.kind !== 'vehicle' && r.kind !== 'satellite') return 'invalid';
  if (!str(r.name, 200) || !str(r.specId, 200) || typeof r.edited !== 'boolean') return 'invalid';
  const unsaved = r.recordId === null && r.revision === null;
  const saved = str(r.recordId, 200) && typeof r.revision === 'string' && ISO.test(r.revision) && Number.isFinite(Date.parse(r.revision));
  if (!unsaved && !saved) return 'invalid';
  if (unsaved && r.edited) return 'invalid';
  return { kind: r.kind, name: r.name as string, specId: r.specId as string, recordId: (r.recordId as string | null), revision: (r.revision as string | null), edited: r.edited };
}
