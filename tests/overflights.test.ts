/**
 * When the imaging satellites pass over a place (roadmap M02): the same
 * passes as R03 finds for each satellite, the view from the satellite by the
 * closed form of the triangle it makes with the Earth's centre, and the local
 * time of sun-synchronous imagers' overflights against their published local
 * time at the descending node. That tolerance, 30 minutes either side, was
 * fixed before the comparison: the place is off the equator and off the
 * ground track, which moves its local time from the node's by up to about 25
 * minutes at 60° of elevation.
 */
import { describe, expect, it } from 'vitest';
import { overflights, overflightsInSlices } from '../src/orbit/overflights';
import { findPasses } from '../src/orbit/passes';
import { skyObjects } from '../src/orbit/real-sky';
import { elementsFromRecord } from '../src/orbit/omm';
import { stationOf } from '../src/orbit/applications-setup';
import { parseSnapshot } from '../src/provider/data-provider';

const SNAPSHOT_FILE = import.meta.glob('../public/data/satellites.json', { import: 'default', eager: true }) as Record<string, unknown>;
const snap = parseSnapshot(Object.values(SNAPSHOT_FILE)[0], 'satellites');
const group = (id: string) => skyObjects(snap.data.groups.find((g) => g.id === id)!.sets.map(elementsFromRecord), id as 'imaging');
const imaging = group('imaging');
const bangkok = stationOf('bangkok')!;
const jd0 = Date.parse('2026-09-26T12:00:00Z') / 86400000 + 2440587.5;
const DEG = Math.PI / 180;

describe('overflights of a place (M02)', () => {
  it('are each imaging satellite\'s R03 passes, all of them, in time order', () => {
    const minEl = 10 * DEG;
    const list = overflights(imaging, bangkok, jd0, jd0 + 1, minEl);
    const passes = imaging.flatMap((o) => findPasses(o, bangkok, jd0, jd0 + 1, minEl));
    expect(list.length).toBe(passes.length);
    expect(list.length).toBeGreaterThan(100);
    expect(list.map((f) => f.pass.top.jd)).toEqual(passes.map((p) => p.top.jd).sort((a, b) => a - b));
  });

  it('sees the place at the off-nadir angle the triangle with the Earth\'s centre gives', () => {
    // sin η = (|site| / |sat|) cos ε, with the elevation measured from the geocentric horizon; the geodetic one differs by under 0.1° at Bangkok
    for (const f of overflights(imaging.slice(0, 20), bangkok, jd0, jd0 + 1, 0)) {
      const r = f.pass.top.range, el = f.pass.top.el;
      // the satellite's distance from the centre, from the site's (6 377.4 km at Bangkok) by the law of cosines
      const rs = 6377.4e3, rsat = Math.sqrt(rs * rs + r * r + 2 * rs * r * Math.sin(el));
      expect(f.offNadir / DEG).toBeCloseTo(Math.asin((rs / rsat) * Math.cos(el)) / DEG, 0);
      expect(f.groundRange).toBeGreaterThan(0);
      expect(f.solarTime).toBeGreaterThanOrEqual(0);
      expect(f.solarTime).toBeLessThan(24);
    }
  });

  /** Published local times at the descending node, hours: from, to. */
  const LTDN: [string, number, [number, number], string][] = [
    ['Landsat 8', 39084, [10 + 7 / 60, 10 + 17 / 60], 'USGS, Landsat 8 and 9 Maneuvers: 10:12 a.m. (± 5 minutes)'],
    ['Landsat 9', 49260, [10 + 7 / 60, 10 + 17 / 60], 'USGS, Landsat 8 and 9 Maneuvers: 10:12 a.m. (± 5 minutes)'],
    ['Sentinel-2A', 40697, [10.5, 10.5], 'ESA SentiWiki, S2 Mission: 10:30 mean local solar time at the descending node'],
    ['Sentinel-2B', 42063, [10.5, 10.5], 'ESA SentiWiki, S2 Mission: 10:30 mean local solar time at the descending node'],
    ['Sentinel-2C', 60989, [10.5, 10.5], 'ESA SentiWiki, S2 Mission: 10:30 mean local solar time at the descending node'],
    // added after the first run, at the same tolerance: Thailand's own imager
    ['THEOS-2', 58016, [10, 10.5], 'eoPortal, THEOS-2: 10:00-10:30 hours'],
  ];

  it.each(LTDN)('%s comes over by day at its published local time, and by night twelve hours on', (_, norad, [from, to]) => {
    const o = [...imaging, ...group('thai')].find((x) => x.el.satnum === norad)!;
    const list = overflights([o], bangkok, jd0, jd0 + 16, 60 * DEG);
    expect(list.length).toBeGreaterThan(2);
    for (const f of list) {
      const t = f.northbound ? f.solarTime - 12 : f.solarTime;
      // descending by day, ascending by night
      expect(f.daylight, `${f.solarTime.toFixed(2)} h`).toBe(!f.northbound);
      expect(t, `${f.solarTime.toFixed(2)} h`).toBeGreaterThan(from - 0.5);
      expect(t, `${f.solarTime.toFixed(2)} h`).toBeLessThan(to + 0.5);
    }
  });

  it('can be found a few satellites at a time, and stopped', async () => {
    const all = await overflightsInSlices(imaging.slice(0, 30), bangkok, jd0, jd0 + 1, 10 * DEG, () => true, async () => {});
    expect(all).toEqual(overflights(imaging.slice(0, 30), bangkok, jd0, jd0 + 1, 10 * DEG));
    let calls = 0;
    const stopped = await overflightsInSlices(group('debris'), bangkok, jd0, jd0 + 1, 10 * DEG, () => ++calls < 2, async () => {});
    expect(stopped).toBeNull();
  }, 60_000);
});
