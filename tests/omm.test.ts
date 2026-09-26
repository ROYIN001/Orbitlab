/**
 * Element sets in every form CelesTrak documents (roadmap R02): the ISS's
 * element set as CelesTrak served it on 2026-09-26 in TLE, 2LE, JSON, CSV,
 * XML and KVN (tests/fixtures/gp/), read by src/orbit/omm.ts and tle.ts into
 * the same elements and propagated by SGP4 to the same place; Space-Track's
 * JSON (numbers as text), the six-digit catalogue numbers only OMM can hold,
 * and what is refused and why.
 */
import { describe, expect, it } from 'vitest';
import tle from './fixtures/gp/iss.tle?raw';
import tle2 from './fixtures/gp/iss.2le?raw';
import json from './fixtures/gp/iss.json?raw';
import csv from './fixtures/gp/iss.csv?raw';
import xml from './fixtures/gp/iss.xml?raw';
import kvn from './fixtures/gp/iss.kvn?raw';
import { detectFormat, elementsFromOmm, readElementFile, type ElementFormat } from '../src/orbit/omm';
import { propagateTo, satrecFrom } from '../src/orbit/sgp4';
import type { ElementSet } from '../src/orbit/tle';

const FILES: [string, string, ElementFormat][] = [
  ['TLE', tle, 'tle'], ['2LE', tle2, 'tle'], ['JSON', json, 'json'], ['CSV', csv, 'csv'], ['XML', xml, 'xml'], ['KVN', kvn, 'kvn'],
];

const only = (text: string): ElementSet => {
  const r = readElementFile(text);
  expect(r.rejected).toEqual([]);
  expect(r.sets).toHaveLength(1);
  return r.sets[0];
};

describe('one element set in CelesTrak\'s six formats', () => {
  it('is recognised in each', () => {
    for (const [name, text, format] of FILES) expect(detectFormat(text), name).toBe(format);
  });

  it('reads the same elements from each OMM form, to the bit', () => {
    const [j, c, x, k] = [json, csv, xml, kvn].map(only);
    for (const other of [c, x, k]) {
      expect({ ...other, name: null }).toEqual({ ...j, name: null });
    }
    expect([j.name, c.name, x.name, k.name]).toEqual(['ISS (ZARYA)', 'ISS (ZARYA)', 'ISS (ZARYA)', 'ISS (ZARYA)']);
    expect(j.satnum).toBe(25544);
    expect(j.intldesg).toBe('98067A');
    expect(j.elnum).toBe(999);
    expect(j.revnum).toBe(58744);
    expect(j.epochYear).toBe(2026);
    // 2026-09-26T09:35:46.493952 is day 269.39984368…
    expect(j.epochDays).toBeCloseTo(269.39984368, 8);
  });

  it('reads the two-line forms to the same elements as far as their columns print them', () => {
    const j = only(json), t3 = only(tle), t2 = only(tle2);
    expect(t3.name).toBe('ISS (ZARYA)');
    expect(t2.name).toBeNull();
    for (const t of [t3, t2]) {
      expect(t.satnum).toBe(j.satnum);
      for (const k of ['inclo', 'nodeo', 'ecco', 'argpo', 'mo', 'noKozai', 'bstar', 'ndot', 'nddot'] as const) {
        expect(t[k], k).toBeCloseTo(j[k], 14);
      }
      // the two-line epoch is printed to 10⁻⁸ day: 0.86 ms
      expect(Math.abs((t.jdEpoch - j.jdEpoch) + (t.jdEpochFrac - j.jdEpochFrac)) * 86400).toBeLessThan(0.001);
    }
  });

  it('puts the ISS in the same place a day later from every form', () => {
    const at = only(json).jdEpoch + only(json).jdEpochFrac + 1;
    const where = FILES.map(([name, text]) => [name, propagateTo(satrecFrom(only(text)), at)] as const);
    const ref = where.find(([n]) => n === 'JSON')![1];
    for (const [name, s] of where) {
      expect(s.error, name).toBe(0);
      const d = Math.hypot(s.r[0] - ref.r[0], s.r[1] - ref.r[1], s.r[2] - ref.r[2]);
      // the OMM forms are the same numbers; the two-line epoch's last digit is worth metres at 7.7 km/s
      if (['CSV', 'XML', 'KVN'].includes(name)) expect(d, name).toBe(0);
      else expect(d, name).toBeLessThan(10);
    }
    // and where it should be: low Earth orbit
    const r = Math.hypot(...ref.r);
    expect(r - 6378137).toBeGreaterThan(370e3);
    expect(r - 6378137).toBeLessThan(460e3);
  });
});

describe('other writers of the OMM', () => {
  const base = JSON.parse(json)[0] as Record<string, unknown>;

  it('reads Space-Track\'s JSON, whose numbers are text, as CelesTrak\'s', () => {
    const spaceTrack = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, String(v)]));
    Object.assign(spaceTrack, {
      CCSDS_OMM_VERS: '2.0', CENTER_NAME: 'EARTH', REF_FRAME: 'TEME', TIME_SYSTEM: 'UTC', MEAN_ELEMENT_THEORY: 'SGP4',
      TLE_LINE1: tle2.split('\n')[0], TLE_LINE2: tle2.split('\n')[1],
    });
    const a = elementsFromOmm(spaceTrack), b = elementsFromOmm(base as never);
    expect(a.problems).toEqual([]);
    expect(a.elements).toEqual(b.elements);
    expect(readElementFile(JSON.stringify([spaceTrack])).sets).toHaveLength(1);
  });

  it('reads a six-digit catalogue number, which the two-line format cannot hold', () => {
    const r = elementsFromOmm({ ...base, NORAD_CAT_ID: 100828, OBJECT_ID: '2026-150B' } as never);
    expect(r.elements!.satnum).toBe(100828);
    expect(r.elements!.intldesg).toBe('26150B');
    expect(propagateTo(satrecFrom(r.elements!), r.elements!.jdEpoch + r.elements!.jdEpochFrac).error).toBe(0);
  });

  it('refuses an element set made for SGP4-XP, and says so', () => {
    expect(elementsFromOmm({ ...base, EPHEMERIS_TYPE: 4 } as never).problems).toEqual([{ kind: 'theory', theory: 'EPHEMERIS_TYPE 4' }]);
    expect(elementsFromOmm({ ...base, MEAN_ELEMENT_THEORY: 'SGP4-XP' } as never).problems).toEqual([{ kind: 'theory', theory: 'SGP4-XP' }]);
    // the KVN's "SGP/SGP4" is SGP4
    expect(elementsFromOmm({ ...base, MEAN_ELEMENT_THEORY: 'SGP/SGP4' } as never).elements).not.toBeNull();
  });

  it('names a missing or unreadable keyword, and a set in a file by its place', () => {
    const { BSTAR: _b, ...noBstar } = base;
    expect(elementsFromOmm(noBstar as never).problems).toEqual([{ kind: 'missing', field: 'BSTAR' }]);
    expect(elementsFromOmm({ ...base, ECCENTRICITY: 1.2 } as never).problems).toEqual([{ kind: 'value', field: 'ECCENTRICITY' }]);
    expect(elementsFromOmm({ ...base, EPOCH: 'yesterday' } as never).problems).toEqual([{ kind: 'value', field: 'EPOCH' }]);
    const file = readElementFile(JSON.stringify([base, { ...base, MEAN_MOTION: 'fast' }, base]));
    expect(file.sets).toHaveLength(2);
    expect(file.rejected).toEqual([{ at: 2, problems: [{ kind: 'value', field: 'MEAN_MOTION' }] }]);
  });

  it('reads an ordinal-date epoch, and a CSV name with a comma in quotes', () => {
    const ordinal = elementsFromOmm({ ...base, EPOCH: '2026-269T09:35:46.493952' } as never).elements!;
    const cal = elementsFromOmm(base as never).elements!;
    expect(ordinal.jdEpoch + ordinal.jdEpochFrac).toBe(cal.jdEpoch + cal.jdEpochFrac);
    const lines = csv.trim().split('\n');
    const quoted = `${lines[0]}\n${lines[1].replace('ISS (ZARYA)', '"ISS, ZARYA ""MODULE"""')}\n`;
    expect(readElementFile(quoted).sets[0].name).toBe('ISS, ZARYA "MODULE"');
  });

  it('says so of a file that is none of the formats', () => {
    expect(detectFormat('hello')).toBeNull();
    expect(readElementFile('hello')).toEqual({ format: null, sets: [], rejected: [] });
    expect(readElementFile('[not json').rejected).toEqual([{ at: 1, problems: [{ kind: 'value', field: 'JSON' }] }]);
  });
});
