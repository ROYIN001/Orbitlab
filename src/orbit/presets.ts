/**
 * The orbit playground's starting orbits (roadmap O01): the launch section's
 * orbit presets (src/data/orbits.ts), as orbits with every element set. A
 * preset whose inclination the launch site decides is put at 28.5°, due east
 * from Cape Canaveral; a sun-synchronous one gets the inclination that turns
 * its node with the Sun, from J2, at its size, and the node that puts its
 * ascending pass at the local time the preset names (10:30); the ISS preset
 * is put in the station's plane of that day, as the launch planner models it.
 */
import { ORBIT_PRESETS } from '../data/orbits';
import { DEG } from '../physics/constants';
import { issRaanAt } from '../physics/mission';
import { apsidesToAE, raanForLocalTime, sunSynchronousInclination, type Orbit } from './kepler';

/** The inclination a "site" preset is shown at in the playground: due east from Cape Canaveral, deg. */
export const SITE_INCLINATION_DEG = 28.5;

export const PLAYGROUND_PRESET_IDS: readonly string[] = ORBIT_PRESETS.filter((o) => o.id !== 'custom' && !o.suborbital).map((o) => o.id);

/** A preset as a playground orbit at epoch `jd0`, the satellite at perigee. */
export function presetOrbit(id: string, jd0: number): Orbit {
  const spec = ORBIT_PRESETS.find((o) => o.id === id);
  if (!spec) throw new Error(`Unknown orbit preset ${id}`);
  const { a, e } = apsidesToAE(spec.perigee, spec.apogee);
  const i = spec.inclination === 'sso' ? sunSynchronousInclination({ a, e }) ?? Math.PI / 2
    : spec.inclination === 'site' ? SITE_INCLINATION_DEG * DEG : spec.inclination * DEG;
  const raan = spec.raanMode === 'ltan' && spec.ltan !== undefined ? raanForLocalTime(spec.ltan, jd0)
    : spec.raanMode === 'iss' ? issRaanAt(new Date((jd0 - 2440587.5) * 86400e3))
      : (spec.raan ?? 0) * DEG;
  return { a, e, i, raan, argp: spec.argPerigee * DEG, m0: 0, jd0 };
}
