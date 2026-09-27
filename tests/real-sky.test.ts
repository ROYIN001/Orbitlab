/**
 * Real satellites for the page (roadmap R02, src/orbit/real-sky.ts): SGP4's answer
 * in the program's units and frame, the orbit through it, a group's points,
 * what an element set says, and the search.
 */
import { describe, expect, it } from 'vitest';
import json from './fixtures/gp/iss.json?raw';
import { readElementFile } from '../src/orbit/omm';
import { elementAge, searchSky, skyFacts, skyObjects, skyOrbit, skyPositions, skyState } from '../src/orbit/real-sky';
import { propagateTo, temeToEcef } from '../src/orbit/sgp4';
import { stateAt } from '../src/orbit/kepler';
import { parseTle } from '../src/orbit/tle';
import { gmst } from '../src/physics/orbital';

const iss = readElementFile(json).sets[0];
const epoch = iss.jdEpoch + iss.jdEpochFrac;
// a set SGP4 gives up on at its epoch: the verification's 33334 (mean motion 0.00001 rev/day)
const doomed = parseTle(
  '1 33334U 78066F   06174.85818871  .00000620  00000-0  10000-3 0  6809',
  '2 33334  68.4714 236.1303 5602877 123.7484 302.5767  0.00001000 67521',
).elements!;

describe('one real satellite', () => {
  const [o] = skyObjects([iss], 'stations');

  it('is where SGP4 puts it, in metres, the Earth turned by sidereal time', () => {
    const jd = epoch + 0.3;
    const s = skyState(o, jd);
    if (s.error !== 0) throw new Error('no state');
    const ref = propagateTo(o.sat, jd);
    expect(s.r.x).toBeCloseTo(ref.r[0], 6);
    expect(s.v.z).toBeCloseTo(ref.v[2], 9);
    expect(s.theta).toBe(gmst(jd));
    // the point below agrees with SGP4's own Earth-fixed turn to a few metres (the two sidereal-time formulas)
    const ecef = temeToEcef(ref.r, ref.v, jd);
    expect(Math.abs(s.lon - Math.atan2(ecef.r[1], ecef.r[0])) * 6378137).toBeLessThan(5);
    expect(s.alt).toBeGreaterThan(370e3);
  });

  it('draws as the Kepler orbit through where it is, which gives the same point back', () => {
    const jd = epoch + 0.3;
    const orbit = skyOrbit(o, jd)!;
    const s = skyState(o, jd);
    if (s.error !== 0) throw new Error('no state');
    const k = stateAt(orbit, 0, false);
    expect(Math.hypot(k.r.x - s.r.x, k.r.y - s.r.y, k.r.z - s.r.z)).toBeLessThan(1e-3);
    expect(orbit.jd0).toBe(jd);
  });

  it('says what its element set says: the ISS\'s period, height and inclination', () => {
    const f = skyFacts(o);
    // 15.48664613 rev/day (Kozai's); the theory's own mean motion is a hair different
    expect(f.period / 60).toBeCloseTo(1440 / 15.48664613, 0);
    expect(f.perigeeAlt).toBeGreaterThan(380e3);
    expect(f.apogeeAlt).toBeLessThan(440e3);
    expect(f.perigeeAlt).toBeLessThan(f.apogeeAlt);
    expect(f.inclination * 180 / Math.PI).toBeCloseTo(51.6292, 6);
    expect(f.deepSpace).toBe(false);
    expect(elementAge(iss, epoch + 1.5)).toBeCloseTo(1.5, 9);
  });

  it('says so when SGP4 cannot place it', () => {
    const [bad] = skyObjects([doomed], 'imported');
    expect(skyState(bad, doomed.jdEpoch + doomed.jdEpochFrac).error).not.toBe(0);
    expect(skyOrbit(bad, doomed.jdEpoch + doomed.jdEpochFrac)).toBeNull();
  });
});

describe('a group', () => {
  it('gives each object its own key, a file\'s repeated sets included', () => {
    const objs = skyObjects([iss, iss, { ...iss, satnum: 5 }], 'imported');
    expect(objs.map((x) => x.key)).toEqual(['imported:25544', 'imported:25544#2', 'imported:5']);
  });

  it('writes the points of every satellite SGP4 can place, and leaves out the rest', () => {
    const objs = skyObjects([iss, doomed, { ...iss, satnum: 7, mo: iss.mo + 1 }], 'imported');
    const xyz = new Float32Array(9), ll = new Float32Array(6);
    const jd = epoch + 0.1;
    expect(skyPositions(objs, jd, xyz, ll)).toBe(2);
    const s = skyState(objs[0], jd);
    if (s.error !== 0) throw new Error('no state');
    expect(xyz[0]).toBeCloseTo(s.r.x, -1);
    expect(ll[0]).toBeCloseTo(s.lat, 6);
    expect(ll[1]).toBeCloseTo(s.lon, 6);
  });

  it('is searched by name, catalogue number, or designator either way it is written', () => {
    const objs = skyObjects([iss, { ...iss, satnum: 58016, name: 'THEOS-2 (T2V)', intldesg: '23155A' }], 'thai');
    expect(searchSky(objs, '').length).toBe(2);
    expect(searchSky(objs, 'zarya').map((x) => x.el.satnum)).toEqual([25544]);
    expect(searchSky(objs, '58016').map((x) => x.el.satnum)).toEqual([58016]);
    expect(searchSky(objs, '025544').map((x) => x.el.satnum)).toEqual([25544]);
    expect(searchSky(objs, '1998-067A').map((x) => x.el.satnum)).toEqual([25544]);
    expect(searchSky(objs, '98067').map((x) => x.el.satnum)).toEqual([25544]);
    expect(searchSky(objs, 'nothing')).toEqual([]);
  });
});
