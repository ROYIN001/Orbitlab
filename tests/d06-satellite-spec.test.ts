/**
 * A custom satellite's checker and its fit in the fairing (roadmap D06; Phase
 * 4 map §2.6 c): src/config/satellite-spec.ts.
 *
 * The checker is held as the custom vehicle's is (tests/custom-vehicle.test.ts):
 * every catalogue satellite, copied under an id of its own, passes; each kind
 * of slip is refused with a message naming its path. The fairing fit is an
 * estimate with no published figure to hold it to, so it is checked for what
 * it claims — its geometry, exactly — and against the pairings the built-in
 * missions fly, which the criterion (fixed before the first run) says must
 * never come out larger than the fairing itself.
 */
import { describe, expect, it } from 'vitest';
import {
  FAIRING_ENVELOPE, SATELLITE_KIND_IDS, SATELLITE_LIMITS, assertSatelliteSpec, fairingFit, satelliteSpecProblems,
} from '../src/config/satellite-spec';
import { SATELLITES, satelliteById } from '../src/data/satellites';
import { NUMBER_FIELDS } from '../src/config/validation';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { WATCH_MISSIONS } from '../src/ui/watch-missions';
import { quickstartMission } from '../src/ui/quickstart';
import { BUILTIN_LESSONS } from '../src/lessons/catalog';
import type { SatelliteSpec } from '../src/types';
import { satelliteCopyOf } from './custom-satellite-harness';

const problems = (mutate: (spec: Record<string, any>) => void, from = 'comsat'): string[] => {
  const spec = structuredClone(satelliteCopyOf(from)) as unknown as Record<string, any>;
  mutate(spec);
  return satelliteSpecProblems(spec).map((i) => `${i.path} ${i.message}`);
};

describe('custom satellite checker (D06)', () => {
  it('accepts a copy of every catalogue satellite, with its own drag figures or without an origin', () => {
    for (const s of SATELLITES) {
      expect({ [s.id]: satelliteSpecProblems(satelliteCopyOf(s.id)) }).toEqual({ [s.id]: [] });
      expect({ [s.id]: satelliteSpecProblems(satelliteCopyOf(s.id, { area: 12, cd: 2.2, cr: 1.3 })) }).toEqual({ [s.id]: [] });
      // without an origin, unless it claims a crew
      const { derivedFrom: _, crewed, ...plain } = satelliteCopyOf(s.id);
      expect({ [s.id]: satelliteSpecProblems(plain) }).toEqual({ [s.id]: [] });
      if (crewed) expect(satelliteSpecProblems({ ...plain, crewed }).map((i) => i.path)).toEqual(['crewed']);
    }
    // the kinds list is the type's (a compile-time check holds the other direction)
    expect(new Set(SATELLITES.map((s) => s.kind))).toEqual(new Set(SATELLITE_KIND_IDS));
  });

  it('rejects NaN, Infinity, wrong types and figures that are not positive, naming the field', () => {
    expect(problems((s) => { s.mass = NaN; })).toEqual(['mass must be a finite number (got NaN)']);
    expect(problems((s) => { s.mass = 0; })).toEqual(['mass must be at least 1 (got 0)']);
    expect(problems((s) => { s.mass = '5500'; })).toEqual(['mass must be a finite number (got string)']);
    expect(problems((s) => { s.propulsion.thrust = Infinity; })).toEqual(['propulsion.thrust must be a finite number (got Infinity)']);
    expect(problems((s) => { s.propulsion.thrust = 0; })).toEqual(['propulsion.thrust must be more than 0 (got 0)']);
    expect(problems((s) => { s.size.height = -5; })).toEqual(['size.height must be more than 0 (got -5)']);
    expect(problems((s) => { s.area = 0; })).toEqual(['area must be more than 0 (got 0)']);
    expect(problems((s) => { s.cd = null; })).toEqual(['cd must be a finite number (got null)']);
    expect(problems((s) => { s.propulsion = 'hydrazine'; })).toEqual(['propulsion must be an engine, or left out for none (got string)']);
    expect(problems((s) => { s.size = [1, 2, 3]; })).toEqual(['size must be a width, height and depth (got an array)']);
  });

  it('rejects an engine no chemical engine is, and the other slips the bounds are for', () => {
    expect(problems((s) => { s.propulsion.isp = 3000; })).toEqual([`propulsion.isp must be at most ${SATELLITE_LIMITS.isp[1]} (got 3000)`]);
    expect(problems((s) => { s.propulsion.isp = 10; })).toEqual([`propulsion.isp must be at least ${SATELLITE_LIMITS.isp[0]} (got 10)`]);
    expect(problems((s) => { s.propulsion.propellantFraction = 1; })).toEqual(['propulsion.propellantFraction must be at most 0.95 (got 1)']);
    expect(problems((s) => { s.propulsion.propellantFraction = 0; })).toEqual(['propulsion.propellantFraction must be more than 0 (got 0)']);
    expect(problems((s) => { s.propulsion.thrust = 490e3; })).toEqual(['propulsion.thrust must be at most 100000 (got 490000)']);
    expect(problems((s) => { s.mass = 5.5e6; })).toEqual(['mass must be at most 500000 (got 5500000)']);
    // lighter than the payload-mass field takes: it could never fly at its own mass (review, 2026-09-30)
    expect(problems((s) => { s.mass = 0.25; })).toEqual(['mass must be at least 1 (got 0.25)']);
    expect(SATELLITE_LIMITS.minMass).toBe(NUMBER_FIELDS['setup.payloadMass'].min);
    expect(problems((s) => { s.mass = SATELLITE_LIMITS.minMass; })).toEqual([]);
    expect(problems((s) => { s.size.width = 25; })).toEqual(['size.width must be at most 15 (got 25)']);
    expect(problems((s) => { s.cr = 0.5; })).toEqual(['cr must be at least 1 (got 0.5)']);
    expect(problems((s) => { s.cr = 2.5; })).toEqual(['cr must be at most 2 (got 2.5)']);
    expect(problems((s) => { s.cd = 22; })).toEqual(['cd must be at most 5 (got 22)']);
    expect(problems((s) => { s.area = 3500; })).toEqual(['area must be at most 1000 (got 3500)']);
  });

  it('rejects ids, kinds, orbits, origins and fields it does not know', () => {
    expect(problems((s) => { s.id = 'comsat'; })).toEqual(['id "comsat" is a catalogue satellite\'s id: a custom satellite needs an id of its own']);
    expect(problems((s) => { s.id = 'My Satellite'; })).toEqual([expect.stringMatching(/^id must be Latin letters, digits/)]);
    expect(problems((s) => { s.kind = 'spaceStation'; })).toEqual([expect.stringMatching(/^kind must be one of comsat, earthObs, .* \(got "spaceStation"\)$/)]);
    expect(problems((s) => { delete s.kind; })).toEqual(['kind is required']);
    expect(problems((s) => { s.typicalOrbit = 'moon'; })).toEqual(['typicalOrbit must be an orbit preset\'s id (got "moon")']);
    expect(problems((s) => { s.derivedFrom = 'hubble'; })).toEqual(['derivedFrom must name a catalogue satellite (got "hubble")']);
    expect(problems((s) => { s.crewed = true; })).toEqual(['crewed only a satellite derived from a crewed catalogue one carries a crew']);
    expect(problems((s) => { s.crewed = 'yes'; }, 'crew')).toEqual(['crewed must be true or false (got string)']);
    expect(problems((s) => { s.propulsion.specificImpulse = 300; })).toEqual(['propulsion.specificImpulse is not a field of this version']);
    expect(problems((s) => { s.dragArea = 12; })).toEqual(['dragArea is not a field of this version']);
    expect(problems((s) => { s.name = ''; })).toEqual(['name must not be empty']);
    expect(problems((s) => { s.description = ''; })).toEqual([]);
    expect(satelliteSpecProblems(null)).toEqual([{ path: '', message: 'must be a satellite (got null)' }]);
    expect(() => assertSatelliteSpec({ ...satelliteCopyOf('comsat'), mass: -1 })).toThrow('Invalid custom satellite: mass must be at least 1 (got -1)');
  });

  it('leaves the catalogue as it was (no entry has the fields a custom satellite may add)', () => {
    for (const s of SATELLITES) for (const key of ['area', 'cd', 'cr', 'derivedFrom'] as const) expect(s[key], `${s.id}.${key}`).toBeUndefined();
  });
});

describe('fairing fit, an estimate (D06)', () => {
  it('takes the satellite as a cylinder and the usable space as fixed shares of the shell above its adapter cone', () => {
    const soyuz = vehicleById('soyuz21a');
    const fit = fairingFit(soyuz, satelliteById('crew'));
    // Soyuz-2.1a's 4.11 × 11.43 m unit with its 2.2 m adapter cone (src/data/parts.ts)
    expect(fit.shell).toEqual({ diameter: 4.11, length: 11.43 - 2.2 });
    expect(fit.envelope).toEqual({ diameter: 4.11 * FAIRING_ENVELOPE.diameter, length: (11.43 - 2.2) * FAIRING_ENVELOPE.length });
    expect(fit.payload).toEqual({ diameter: 2.7, length: 7 });
    expect(fit.verdict).toBe('fits');
    const box = (width: number, height: number, depth: number): Pick<SatelliteSpec, 'size'> => ({ size: { width, height, depth } });
    const f9 = vehicleById('falcon9'); // 5.2 × 13.1 m, no adapter cone
    expect(fairingFit(f9, box(3, 5, 4.4)).verdict).toBe('fits');
    // the larger of width and depth is the diameter
    expect(fairingFit(f9, box(3, 5, 4.5)).verdict).toBe('tight');
    expect(fairingFit(f9, box(4.5, 5, 3)).verdict).toBe('tight');
    expect(fairingFit(f9, box(3, 11, 3)).verdict).toBe('tight');
    expect(fairingFit(f9, box(5.3, 5, 3)).verdict).toBe('tooBig');
    expect(fairingFit(f9, box(3, 13.2, 3)).verdict).toBe('tooBig');
    expect(fairingFit(f9, {}).verdict).toBe('noSize');
    expect(fairingFit(vehicleById('starship'), box(3, 5, 3))).toEqual({ verdict: 'noFairing' });
  });

  it('never finds a satellite a built-in mission flies larger than its fairing', () => {
    const pairs = new Set<string>();
    for (const m of WATCH_MISSIONS) pairs.add(`${m.vehicleId}|${m.satelliteId}`);
    for (const q of ['leo', 'iss', 'gto'] as const) { const m = quickstartMission(q); pairs.add(`${m.vehicleId}|${m.satelliteId}`); }
    for (const l of BUILTIN_LESSONS) {
      const m = 'mission' in l ? l.mission.mission : null;
      if (m) pairs.add(`${m.vehicleId}|${m.satelliteId}`);
    }
    const verdicts = Object.fromEntries([...pairs].sort().map((p) => {
      const [v, s] = p.split('|');
      return [p, fairingFit(vehicleById(v), satelliteById(s)).verdict];
    }));
    expect(Object.values(verdicts)).not.toContain('tooBig');
    // Recorded, not tuned: every pairing fits the estimate but Vostok's, whose
    // 2.43 m body is wider than 85 % of its 2.6 m shroud — flown, so the
    // estimate is only "tight" there — and the two with their own payload bay.
    expect(verdicts).toEqual({
      'electron|cubesats': 'fits', 'falcon9|comsat': 'fits', 'falcon9|cubesats': 'fits', 'falconheavy|comsat': 'fits',
      'ariane64|starlink': 'fits', 'saturnv|apollo': 'noFairing', 'soyuz21a|crew': 'fits', 'soyuz21a|cubesats': 'fits',
      'sputnik8k71ps|sputnik1': 'fits', 'starship|cubesats': 'noFairing', 'vostok8k72k|vostok3ka': 'tight',
    });
  });

  it('gives every vehicle and satellite a verdict', () => {
    for (const v of VEHICLES) for (const s of SATELLITES) expect(['fits', 'tight', 'tooBig', 'noFairing']).toContain(fairingFit(v, s).verdict);
  });
});
