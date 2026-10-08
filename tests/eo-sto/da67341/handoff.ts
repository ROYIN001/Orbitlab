/** da67341's hand-off reader: lines 21-27 and 174-199 of da67341:src/orbit/handoff.ts, verbatim. */
import type { SatelliteKind } from '../../../src/types';
import type { V3 } from '../../../src/physics/propagator/ephemeris';
import { handoffElements, type OrbitHandoff } from '../../../src/orbit/handoff';

export const HANDOFF_FORMAT = 'orbitlab.handoff';
export const HANDOFF_FORMAT_VERSION = 1;

/** The orbit a hand-off needs: a perigee above this altitude, m (the lifetime analysis's own floor). */
export const HANDOFF_MIN_PERIGEE = 100e3;

const SATELLITE_KINDS: readonly SatelliteKind[] = ['comsat', 'earthObs', 'weather', 'navigation', 'science', 'cubesats', 'starlink', 'crew'];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const vec = (v: unknown): v is V3 => Array.isArray(v) && v.length === 3 && v.every(finite);
const positive = (v: unknown): v is number => finite(v) && v > 0;

/**
 * A hand-off read back from JSON (a file or a link, later), or null when it
 * is not one: every number finite, masses and areas positive, a known payload
 * class, a bound orbit above the atmosphere. A newer version is refused
 * rather than half-read: a state vector is all or nothing.
 */
export function parseHandoff(raw: unknown): OrbitHandoff | null {
  if (!isObj(raw) || raw.format !== HANDOFF_FORMAT || raw.version !== HANDOFF_FORMAT_VERSION) return null;
  if (!vec(raw.r) || !vec(raw.v) || !finite(raw.jd) || typeof raw.label !== 'string') return null;
  const sc = raw.spacecraft, origin = raw.origin;
  if (!isObj(sc) || !positive(sc.mass) || !positive(sc.area) || !positive(sc.cd) || !positive(sc.cr)) return null;
  if (!SATELLITE_KINDS.includes(sc.kind as SatelliteKind)) return null;
  const p = sc.propulsion;
  if (p !== null && (!isObj(p) || !positive(p.thrust) || !positive(p.isp) || !finite(p.propellantMass) || p.propellantMass < 0)) return null;
  if (!isObj(origin) || typeof origin.vehicleName !== 'string' || !finite(origin.missionTime)) return null;
  if (origin.mission !== null && !isObj(origin.mission)) return null;
  const h = raw as unknown as OrbitHandoff;
  const el = handoffElements(h);
  if (!(el.e < 1) || !(el.periapsisAlt > HANDOFF_MIN_PERIGEE)) return null;
  return JSON.parse(JSON.stringify(h)) as OrbitHandoff;
}
