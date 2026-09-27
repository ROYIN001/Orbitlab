/**
 * From SGP4's TEME to the Earth-fixed frame (roadmap P2.5): the sidereal time
 * of UT1 and the pole's wander, against the worked example of Vallado,
 * Crawford, Hujsak and Kelso ("Revisiting Spacetrack Report #3", AIAA
 * 2006-6753, Appendix C, https://celestrak.org/publications/AIAA/2006-6753/),
 * and the IERS data behind them: the file's reading, the days in between, a
 * leap second. The example's tolerance, a metre, was fixed before the
 * comparison.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { earthAngle, eopAt, setEarthOrientation, temeToItrf } from '../src/orbit/earth-orientation';
import { EOP_FROM, parseIersFinals, validEarthOrientation, type EarthOrientation } from '../src/provider/earth-orientation';
import { parseSnapshot } from '../src/provider/data-provider';
import { gmst } from '../src/physics/orbital';
import { v3 } from '../src/physics/vec3';

const SNAPSHOT_FILE = import.meta.glob('../public/data/earth-orientation.json', { import: 'default', eager: true }) as Record<string, unknown>;
const bundled = parseSnapshot(Object.values(SNAPSHOT_FILE)[0], 'earthOrientation');
const ARCSEC = Math.PI / (180 * 3600);
const jdOf = (iso: string): number => Date.parse(iso) / 86400000 + 2440587.5;

afterEach(() => setEarthOrientation(null));

describe('TEME to the Earth-fixed frame (P2.5)', () => {
  // 2004 April 6, 07:51:28.386 UTC; ΔUT1 = −0.439 961 s, x_p = −0.140 682″, y_p = 0.333 309″
  const day: EarthOrientation = { from: '2004-04-06', dut1: [-0.439961, -0.439961], xp: [-0.140682, -0.140682], yp: [0.333309, 0.333309], predictedFrom: '2004-04-08' };
  const jd = jdOf('2004-04-06T07:51:28.386Z');
  const teme = v3(5094.18010720, 6127.64470520, 6380.34453270);
  const itrf = v3(-1033.47938300, 7901.29527540, 6380.35659580);
  const off = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

  it('gives the paper\'s Earth-fixed position for its TEME one, to within a metre', () => {
    const got = temeToItrf(teme, jd, day);
    expect(off(got, itrf) * 1000).toBeLessThan(1);
  });

  it('is off by some 260 m there with UT1 taken for UTC and the pole left alone, as before', () => {
    const before = temeToItrf(teme, jd, null);
    expect(off(before, itrf) * 1000).toBeGreaterThan(200);
    expect(off(before, itrf) * 1000).toBeLessThan(300);
  });

  it('reads the dataset set for the page', () => {
    setEarthOrientation(day);
    expect(off(temeToItrf(teme, jd), itrf) * 1000).toBeLessThan(1);
    expect(earthAngle(jd)).toBeCloseTo(gmst(jd - 0.439961 / 86400), 12);
    setEarthOrientation(null);
    expect(earthAngle(jd)).toBe(gmst(jd));
  });
});

describe('the IERS data (P2.5)', () => {
  const e: EarthOrientation = { from: '2016-12-30', dut1: [0.40, 0.39, -0.59, -0.60], xp: [0.1, 0.2, 0.3, 0.4], yp: [0.3, 0.3, 0.3, 0.3], predictedFrom: '2017-01-02' };

  it('reads between its days, holds its ends, and keeps a leap second\'s day to itself', () => {
    const at = (iso: string) => eopAt(jdOf(iso), e);
    expect(at('2016-12-30T12:00:00Z').xp / ARCSEC).toBeCloseTo(0.15, 12);
    expect(at('2016-12-30T12:00:00Z').dut1).toBeCloseTo(0.395, 12);
    // the leap second at the end of 2016-12-31: that day keeps +0.39 s to midnight
    expect(at('2016-12-31T23:59:00Z').dut1).toBe(0.39);
    expect(at('2017-01-01T12:00:00Z').dut1).toBeCloseTo(-0.595, 12);
    expect(at('2010-01-01T00:00:00Z').dut1).toBe(0.40);
    expect(at('2030-01-01T00:00:00Z').yp / ARCSEC).toBeCloseTo(0.3, 12);
    expect(eopAt(jdOf('2017-01-01T00:00:00Z'), null)).toEqual({ dut1: 0, xp: 0, yp: 0 });
  });

  it('reads the IERS file: measured, then predicted, to the last day with every value', () => {
    const csv = [
      'MJD;Year;Month;Day;Type;x_pole;sigma_x_pole;y_pole;sigma_y_pole;x_rate;sigma_x_rate;y_rate;sigma_y_rate;Type;UT1-UTC;sigma_UT1-UTC;LOD',
      '58483;2018;12;31;final;0.1;0;0.2;0;;;;;final;-0.03;0;0',
      '58484;2019;01;01;final;0.100001;0;0.300002;0;;;;;final;-0.036226;0;0',
      '58485;2019;01;02;final;0.2;0;0.4;0;;;;;final;-0.037;0;0',
      '58486;2019;01;03;prediction;0.3;0;0.5;0;;;;;prediction;-0.038;0;0',
      '58487;2019;01;04;;;;;;;;;;;;;',
    ].join('\n');
    const { data, asOf } = parseIersFinals(csv);
    expect(data).toEqual({ from: '2019-01-01', dut1: [-0.0362, -0.037, -0.038], xp: [0.1, 0.2, 0.3], yp: [0.3, 0.4, 0.5], predictedFrom: '2019-01-03' });
    expect(asOf).toBe('2019-01-02T00:00:00Z');
    expect(() => parseIersFinals('MJD;Year\n1;2')).toThrow();
  });

  it('comes in the snapshot from 2019, measured to its date and predicted months beyond', () => {
    const d = bundled.data;
    expect(validEarthOrientation(d)).toBe(true);
    expect(d.from).toBe(EOP_FROM);
    const last = jdOf(`${d.from}T00:00:00Z`) + d.dut1.length - 1;
    expect(last - jdOf(bundled.asOf)).toBeGreaterThan(180);
    for (const v of d.dut1) expect(Math.abs(v)).toBeLessThan(0.9);
  });
});
