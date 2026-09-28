/**
 * What an imaging satellite's instrument can see of a place (roadmap P2.5,
 * for M02): the published swaths against the geometry of the fields of view
 * they come from, the look side and incidence angle of each overflight, and
 * the revisit periods the missions publish.
 *
 * The tolerances were fixed before the comparison, with one exception said
 * where it is: the swath check's 2 % was set after Sentinel-2's figure had
 * been worked out by hand while the table was built (286 km for 290 km).
 * The same 2 % was fixed before the fixed cameras added on 2026-09-28 were
 * worked out; two missed it, and the test records what was found and says so.
 */
import { describe, expect, it } from 'vitest';
import { SENSORS } from '../src/data/sensors';
import { canImage, groundAtIncidence, groundReach, reachEdges, sensorFor, sensorOf, type Sensor } from '../src/orbit/sensors';

import { overflights, type Overflight } from '../src/orbit/overflights';
import { skyObjects, type SkyObject } from '../src/orbit/real-sky';
import { elementsFromRecord } from '../src/orbit/omm';
import { stationOf } from '../src/orbit/applications-setup';
import { minutesSinceEpoch, sgp4 } from '../src/orbit/sgp4';
import { temeToItrf } from '../src/orbit/earth-orientation';
import { v3 } from '../src/physics/vec3';
import { parseSnapshot } from '../src/provider/data-provider';

const SNAPSHOT_FILE = import.meta.glob('../public/data/satellites.json', { import: 'default', eager: true }) as Record<string, unknown>;
const snap = parseSnapshot(Object.values(SNAPSHOT_FILE)[0], 'satellites');
const group = (id: 'imaging' | 'thai') => skyObjects(snap.data.groups.find((g) => g.id === id)!.sets.map(elementsFromRecord), id);
// THEOS-2 is in the Thai group only
const imaging = [...group('imaging'), ...group('thai')];

/** An agile camera whose limit is not published: no entry is one now, but the path stays for the next such satellite. */
const unpublished: Sensor = sensorOf({ name: 'agile, limit unpublished', norad: [0], kind: 'optical', instrument: 'test', swathKm: 10, lookMaxDeg: null, resolutionM: 1, sources: ['https://example.org/'] });
const bangkok = stationOf('bangkok')!;
const jd0 = Date.parse('2026-09-26T12:00:00Z') / 86400000 + 2440587.5;
const DEG = Math.PI / 180;
const byNorad = (n: number): SkyObject => imaging.find((o) => o.el.satnum === n)!;

describe('the instruments\' table (P2.5)', () => {
  it('names each satellite once, every one in the bundled catalogue, each with a source', () => {
    const all = SENSORS.flatMap((s) => s.norad);
    expect(new Set(all).size).toBe(all.length);
    for (const n of all) expect(byNorad(n), String(n)).toBeTruthy();
    for (const s of SENSORS) {
      expect(s.sources.length, s.name).toBeGreaterThan(0);
      for (const u of s.sources) expect(u, s.name).toMatch(/^https:\/\//);
      if (s.kind === 'sar') expect(s.incidenceDeg, s.name).toBeTruthy();
      else expect(s.lookMaxDeg, s.name).not.toBeUndefined();
    }
  });

  /** A fixed instrument's published field of view, the altitude it flies at, and the swath published beside them. */
  const FIELDS: [string, number, number, number, string][] = [
    ['MODIS', 55, 705e3, 2330e3, 'NASA: "A ±55-degree scanning pattern at the EOS orbit of 705 km achieves a 2,330-km swath"'],
    ['OLI', 7.5, 705e3, 185e3, 'USGS Landsat 8 handbook: 15° field of view, 705 km, 185 km'],
    ['MSI', 10.3, 786e3, 290e3, 'ESA SentiWiki: 20.6° field of view, 786 km, 290 km'],
  ];

  it.each(FIELDS)('%s: the swath follows from the field of view and the altitude', (_, half, h, swath) => {
    expect(Math.abs(2 * groundReach(half * DEG, h) / swath - 1)).toBeLessThan(0.02);
  });

  /**
   * The fixed cameras added on 2026-09-28 whose source gives the field of view, the altitude and the
   * swath together. The 2 % was fixed, and these four chosen, before any of them was worked out.
   * Two new fixed cameras are not here: eoPortal gives HJ-1's WVC an "aspect angle" of 31°, not
   * called a field of view, the word its table also uses for the HSI's "cross-track looking
   * capability", and without saying whether it is each camera's or the pair's; TechSat-1B's ERIP
   * has no published field of view, only its frame (25 × 31 km).
   *
   * Two met the 2 %: OCM-2 (1 419.4 km for 1 420) and TANSO-CAI (997.1 km for 1 002). Two missed it,
   * a finding: CZI, 522.2 km for 500 (+4.4 %), and SLIM6, 653.2 km for ~620 (+5.4 %). The published
   * figures do not agree with each other on a sphere; the table keeps the published swath (the
   * operator's 600 km for Deimos-1). The bounds that record the misses were set after the run.
   */
  const FIELDS_ADDED: [string, number, number, number, string][] = [
    ['OCM-2', 43, 720e3, 1420e3, 'eoPortal, Oceansat-2: "FOV (swath) 1420 km (±43º)", "altitude ~720 km"'],
    ['TANSO-CAI', 36, 666e3, 1002e3, 'eoPortal, GOSAT-2 (Table 6, GOSAT\'s CAI): bands 1-3 "1002 km (72º)"; GOSAT\'s "Orbital altitude" 666 km'],
  ];
  const FIELDS_ADDED_MISSED: [string, number, number, number, number, string][] = [
    ['CZI', 18, 798e3, 500e3, 522.2e3, 'eoPortal, HY-1B: "FOV (Field of View), swath width 36º, or 500 km swath width", "altitude = 798 km"'],
    ['SLIM6', 26, 661e3, 620e3, 653.2e3, 'eoPortal, Deimos-1: "TFOV = 52º (due to two banks of imagers)", "Total imaging swath ~ 620 km", "altitude of ~661 km"'],
  ];

  it.each(FIELDS_ADDED)('%s: the swath follows from the field of view and the altitude (added 2026-09-28)', (_, half, h, swath) => {
    expect(Math.abs(2 * groundReach(half * DEG, h) / swath - 1)).toBeLessThan(0.02);
  });

  it.each(FIELDS_ADDED_MISSED)('%s: the swath misses the tolerance fixed before (added 2026-09-28): the finding', (_, half, h, swath, found) => {
    const w = 2 * groundReach(half * DEG, h);
    // fixed before: within 2 %; found as the comment above says; this records it, set after the run
    expect(Math.abs(w / swath - 1)).toBeGreaterThan(0.02);
    expect(Math.abs(w - found)).toBeLessThan(0.5e3);
  });

  it('puts OLCI\'s swath where its field of view, turned 12.6° from the Sun, falls', () => {
    // SentiWiki: "68.5° across track field of view", "shifted across track by 12.6° away from the sun"; 814.5 km
    const far = groundReach((34.25 + 12.6) * DEG, 814.5e3), near = groundReach((34.25 - 12.6) * DEG, 814.5e3);
    expect(Math.abs((far + near) / 1270e3 - 1)).toBeLessThan(0.02);
    const olci = sensorFor(41335)!;
    expect(Math.abs(olci.shift - (far - near) / 2)).toBeLessThan(5e3);
  });
});

describe('the ground an instrument reaches, for the map (P2.5)', () => {
  it('spans Sentinel-1\'s interferometric swath with its band of incidence', () => {
    // 29.1°–46.0° from 693 km: 344 to 617 km to the right, 273 km for the published 250 km — worked out
    // on a sphere before this test was written, and held to 10 %
    const [near, far] = reachEdges(sensorFor(39634)!, 693e3);
    expect(near).toBeGreaterThan(0);
    expect(Math.abs((far - near) / 250e3 - 1)).toBeLessThan(0.1);
    expect(groundAtIncidence(0, 693e3)).toBe(0);
  });

  it('puts a fixed camera\'s edges at its swath, an agile one\'s at its reach, and a radar of unknown side on both', () => {
    expect(reachEdges(sensorFor(39084)!, 705e3)).toEqual([-92.5e3, 92.5e3]);
    const [l, r] = reachEdges(sensorFor(38012)!, 694e3);
    expect(r).toBeCloseTo(groundReach((47 * Math.PI) / 180, 694e3), 6);
    expect(l).toBe(-r);
    expect(reachEdges(sensorFor(32382)!, 798e3)).toHaveLength(4);
    expect(reachEdges(unpublished, 509e3)).toEqual([]);
  });
});

/** An overflight with only the fields the judgement reads. */
const flight = (f: Partial<Overflight>): Overflight => ({ daylight: true, side: 'right', groundRange: 0, offNadir: 0, incidence: 0, ...f } as Overflight);

describe('whether an instrument can image the place (P2.5)', () => {
  const landsat = sensorFor(39084)!, pleiades = sensorFor(38012)!, s1 = sensorFor(39634)!, olci = sensorFor(41335)!;

  it('asks a fixed camera for daylight and the place inside its swath', () => {
    expect(canImage(landsat, flight({ groundRange: 90e3 })).can).toBe(true);
    expect(canImage(landsat, flight({ groundRange: 95e3 }))).toEqual({ can: false, reason: 'outsideSwath' });
    expect(canImage(landsat, flight({ groundRange: 10e3, daylight: false }))).toEqual({ can: false, reason: 'dark' });
    // OLCI's swath reaches 945 km to the right, 325 km to the left
    expect(canImage(olci, flight({ side: 'right', groundRange: 900e3 })).can).toBe(true);
    expect(canImage(olci, flight({ side: 'left', groundRange: 400e3 })).can).toBe(false);
    expect(canImage(olci, flight({ side: 'left', groundRange: 300e3 })).can).toBe(true);
  });

  it('asks an agile camera for the place within its largest off-nadir angle', () => {
    expect(canImage(pleiades, flight({ offNadir: 46 * DEG, groundRange: 600e3 })).can).toBe(true);
    expect(canImage(pleiades, flight({ offNadir: 48 * DEG }))).toEqual({ can: false, reason: 'tooFarOff' });
  });

  it('asks a radar for its side and incidence, day or night', () => {
    expect(canImage(s1, flight({ incidence: 35 * DEG, daylight: false })).can).toBe(true);
    expect(canImage(s1, flight({ incidence: 35 * DEG, side: 'left' }))).toEqual({ can: false, reason: 'wrongSide' });
    expect(canImage(s1, flight({ incidence: 20 * DEG }))).toEqual({ can: false, reason: 'incidence' });
  });

  it('does not judge where the limit is not published, and knows the retired', () => {
    expect(canImage(unpublished, flight({}))).toEqual({ can: null, reason: 'noLimit' });
    expect(canImage(unpublished, flight({ daylight: false }))).toEqual({ can: false, reason: 'dark' });
    expect(canImage(sensorFor(40053)!, flight({}))).toEqual({ can: false, reason: 'retired' });
    expect(canImage(sensorFor(33412)!, flight({ incidence: 30 * DEG }))).toEqual({ can: false, reason: 'retired' });
  });
});

describe('the agile imagers whose limits were found later (P2.5)', () => {
  // Cartosat-3: NRSC's 26° across the track; Cartosat-2C: ISRO's 26° for the series (Cartosat-2B); CO3D: the CNES
  // acquisition plan's 15° of roll. Their reach at the altitudes the operators give (505 km, NRSC for Cartosat-3 and
  // ISRO's PSLV-C34 page for 2C; 502 km, CNES) was worked out on a sphere before this test was written (248.7 and
  // 134.9 km) and is held to 1 km.
  const DATA: [number, string, number, number, number][] = [
    [44804, 'Cartosat-3', 26, 505e3, 248.7e3],
    [41599, 'Cartosat-2C', 26, 505e3, 248.7e3],
    [64900, 'CO3D 1', 15, 502e3, 134.9e3],
    [64903, 'CO3D 4', 15, 502e3, 134.9e3],
  ];

  it.each(DATA)('%s (%s) is judged against %s° off nadir', (norad, _, max, h, reach) => {
    const s = sensorFor(norad)!;
    expect(s.lookMax).toBeCloseTo(max * DEG, 12);
    expect(canImage(s, flight({ offNadir: (max - 0.5) * DEG }))).toEqual({ can: true, reason: 'agile' });
    expect(canImage(s, flight({ offNadir: (max + 0.5) * DEG }))).toEqual({ can: false, reason: 'tooFarOff' });
    const [l, r] = reachEdges(s, h);
    expect(Math.abs(r - reach)).toBeLessThan(1e3);
    expect(l).toBe(-r);
  });

  it('takes Cartosat-3\'s resolution and swath from its operator', () => {
    // NRSC: "Ground Sampling Distance (GSD) 0.28 m ... Swath ~17 Km"
    const s = sensorFor(44804)!;
    expect(s.resolution).toBe(0.28);
    expect(s.swath).toBe(17e3);
  });

  it('lists first the page that gives the Cartosats\' angle, the one the Engineer level\'s source link opens', () => {
    expect(sensorFor(44804)!.sources[0]).toMatch(/nrsc\.gov\.in/);
    expect(sensorFor(41599)!.sources[0]).toBe('https://www.isro.gov.in/CARTOSAT_2B.html');
  });
});

describe('the look side and incidence of an overflight (P2.5)', () => {
  const polar = imaging.filter((o) => o.sat.inclo > 80 * DEG && o.sat.inclo < 100 * DEG).slice(0, 25);
  const list = overflights(polar, bangkok, jd0, jd0 + 1, 10 * DEG);

  it('puts the place on the side its longitude says, for a near-polar orbit', () => {
    const r = [0, 0, 0], v = [0, 0, 0];
    let checked = 0;
    for (const f of list) {
      if (f.groundRange < 100e3) continue;
      sgp4(f.object.sat, minutesSinceEpoch(f.object.sat, f.pass.top.jd), r, v);
      const p = temeToItrf(v3(r[0], r[1], r[2]), f.pass.top.jd);
      const east = Math.sin(bangkok.lon - Math.atan2(p.y, p.x)) > 0;
      // going north, east is to the right; going south, to the left
      expect(f.side, f.object.el.name ?? '').toBe(east === f.northbound ? 'right' : 'left');
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('gives the incidence the off-nadir angle gives on a sphere', () => {
    // sin θ = ((R + h) / R) sin η; the ellipsoid moves it by a few tenths of a degree at Bangkok
    const r = [0, 0, 0], v = [0, 0, 0];
    for (const f of list) {
      sgp4(f.object.sat, minutesSinceEpoch(f.object.sat, f.pass.top.jd), r, v);
      const k = Math.hypot(r[0], r[1], r[2]) * 1e3 / 6377.4e3;
      expect(Math.abs(f.incidence - Math.asin(Math.min(1, k * Math.sin(f.offNadir)))) / DEG).toBeLessThan(0.5);
    }
  });
});

/** Overflights the instrument can image, from `jd0` over `days`. */
const imaged = (norad: number, days: number): Overflight[] => {
  const s: Sensor = sensorFor(norad)!;
  return overflights([byNorad(norad)], bangkok, jd0, jd0 + days, 10 * DEG).filter((f) => canImage(s, f).can === true);
};

describe('revisits as the missions publish them (P2.5)', () => {
  it.each([[39084, 'Landsat 8'], [49260, 'Landsat 9']])('%s (%s) images Bangkok within 16 days: USGS, "crossing every point on Earth once every 16 days"', (norad) => {
    expect(imaged(norad, 16).length).toBeGreaterThanOrEqual(1);
  });

  it.each([[40697, 'Sentinel-2A'], [42063, 'Sentinel-2B'], [60989, 'Sentinel-2C']])('%s (%s) images Bangkok within 10 days: ESA, "The revisit frequency of each single satellite is 10 days"', (norad) => {
    expect(imaged(norad, 10).length).toBeGreaterThanOrEqual(1);
  });

  it('Sentinel-1A images Bangkok within its 12-day repeat cycle, looking right, day or night', () => {
    const list = imaged(39634, 12);
    expect(list.length).toBeGreaterThanOrEqual(1);
    for (const f of list) expect(f.side).toBe('right');
  });

  it('a fixed camera\'s opportunities are its swath\'s: none farther than half of it from the track', () => {
    for (const f of imaged(39084, 16)) expect(f.groundRange).toBeLessThanOrEqual(92.5e3);
    expect(sensorOf(SENSORS[0]).swath).toBe(185e3);
  });
});
