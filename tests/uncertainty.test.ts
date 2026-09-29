/**
 * The estimated uncertainty of an element set's satellite (roadmap R04),
 * held to the studies it is taken from: Flohrer, Krag and Klinkrad (AMOS
 * 2008), Tables 1 and 2, at the epoch; Levit and Marshall (Advances in Space
 * Research 47, 2011), 1.5 km a day of growth.
 */
import { describe, expect, it } from 'vitest';
import json from './fixtures/gp/iss.json?raw';
import { GROWTH_PER_DAY, epochSigma, uncertaintyAt } from '../src/orbit/uncertainty';
import { readElementFile } from '../src/orbit/omm';
import { skyObjects } from '../src/orbit/real-sky';
import { DEG } from '../src/physics/constants';

const km = 1e3;

describe('the error at the epoch: Flohrer et al. (2008)', () => {
  it('reads Table 2 by eccentricity, perigee and inclination', () => {
    // the ISS: circular, below 800 km, 51.6°
    expect(epochSigma(416 * km, 426 * km, 0.0007, 51.6 * DEG)).toEqual({ sigma: { radial: 107, along: 308, cross: 169 }, from: { table: 2, shape: 'circular', band: 'low', inclination: 1 } });
    // THEOS-2, sun-synchronous at 620 km
    expect(epochSigma(620 * km, 622 * km, 0.0001, 97.9 * DEG).sigma).toEqual({ radial: 115, along: 517, cross: 137 });
    // a GPS satellite
    expect(epochSigma(19870 * km, 20495 * km, 0.012, 54.8 * DEG).sigma).toEqual({ radial: 71, along: 228, cross: 95 });
    // Thaicom 8, geostationary
    expect(epochSigma(35780 * km, 35792 * km, 0.0002, 0.02 * DEG).sigma).toEqual({ radial: 357, along: 432, cross: 83 });
    // Molniya, and a transfer orbit to GEO
    expect(epochSigma(600 * km, 39750 * km, 0.72, 63.4 * DEG).sigma).toEqual({ radial: 494, along: 814, cross: 1337 });
    expect(epochSigma(250 * km, 35786 * km, 0.73, 28 * DEG).sigma).toEqual({ radial: 2252, along: 4270, cross: 1421 });
  });

  it('falls back on Table 1\'s regime where Table 2 has no entry', () => {
    // circular, above 25 000 km, 45°: MEO by Flohrer's regimes
    expect(epochSigma(30000 * km, 30100 * km, 0.001, 45 * DEG)).toEqual({ sigma: { radial: 73, along: 131, cross: 54 }, from: { table: 1, regime: 'MEO' } });
    // circular, geostationary height, 70°: GEO's
    expect(epochSigma(35780 * km, 35792 * km, 0.0002, 70 * DEG).from).toEqual({ table: 1, regime: 'GEO' });
  });
});

describe('the growth with age: Levit and Marshall (2011)', () => {
  const [iss] = skyObjects(readElementFile(json).sets, 'stations');
  const epoch = iss.el.jdEpoch + iss.el.jdEpochFrac;

  it('adds 1.5 km a day along the track, either side of the epoch', () => {
    expect(GROWTH_PER_DAY).toBe(1500);
    const u0 = uncertaintyAt(iss, epoch), u2 = uncertaintyAt(iss, epoch + 2), ub = uncertaintyAt(iss, epoch - 2);
    expect(u0.sigma.radial).toBe(107);
    expect(u0.sigma.along).toBeCloseTo(308, 3);
    expect(u0.sigma.cross).toBe(169);
    expect(u0.total).toBeCloseTo(Math.hypot(107, 308, 169), 3);
    expect(u2.sigma.along).toBeCloseTo(308 + 3000, 3);
    expect(u2.sigma.radial).toBe(107);
    expect(ub.sigma.along).toBeCloseTo(u2.sigma.along, 3);
    expect(u2.age).toBeCloseTo(2, 9);
  });

  it('says it as time along the track: a day-old ISS set is a quarter of a second early or late', () => {
    const u = uncertaintyAt(iss, epoch + 1);
    expect(u.timing).toBeCloseTo((308 + 1500) / 7660, 2);
  });
});
