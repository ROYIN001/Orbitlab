/**
 * SGP4/SDP4 (roadmap R01) against the verification of Vallado, Crawford,
 * Hujsak and Kelso, "Revisiting Spacetrack Report #3" (AIAA 2006-6753): the
 * 33 element sets of SGP4-VER.TLE — near-Earth and deep-space, 12-hour and
 * 24-hour resonances, the Lyddane choice, drag, decay and the error cases —
 * run over the times each one names, every line of the paper's published
 * output (tcppver.out) held to what this propagator gives.
 *
 * The output is regenerated the way the paper's test driver makes it and
 * compared line for line: the times, the position and velocity (printed to
 * 10⁻⁸ km and 10⁻⁹ km/s), the calendar date of each line, and which element
 * sets stop, where, and with which error. The fixtures are in
 * tests/fixtures/sgp4/ with where they come from.
 */
import { describe, expect, it } from 'vitest';
import verText from './fixtures/sgp4/SGP4-VER.TLE?raw';
import tcppText from './fixtures/sgp4/tcppver.out?raw';
import {
  Satrec, gravConst, gstime, minutesSinceEpoch, propagateTo, satrecFrom, sgp4, temeToEcef, type Sgp4Error,
} from '../src/orbit/sgp4';
import { checksumOk, days2mdhms, invjday, jday, parseTle, parseTleFile, readSatnum, tleChecksum, writeSatnum } from '../src/orbit/tle';

interface OutLine {
  t: number;
  r: number[];
  v: number[];
  /** the calendar date and time the long lines print: year, month, day, seconds of the day */
  date?: { year: number; mon: number; day: number; secOfDay: number };
}
interface OutSat { satnum: number; lines: OutLine[] }

/** tcppver.out, read: a "<satnum> xx" header, then lines of time, r, v (and the elements and date). */
function readTcpp(text: string): OutSat[] {
  const sats: OutSat[] = [];
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    if (!raw.trim()) continue;
    const head = /^(\d+) xx$/.exec(raw.trim());
    if (head) { sats.push({ satnum: Number(head[1]), lines: [] }); continue; }
    const f = raw.trim().split(/\s+/).map(Number);
    const line: OutLine = { t: f[0], r: f.slice(1, 4), v: f.slice(4, 7) };
    const d = /(\d{4})\s+(\d+)\s+(\d+)\s+(\d+):\s*(\d+):\s*([\d.]+)\s*$/.exec(raw);
    if (d && f.length > 7) {
      line.date = { year: +d[1], mon: +d[2], day: +d[3], secOfDay: +d[4] * 3600 + +d[5] * 60 + +d[6] };
    }
    sats[sats.length - 1].lines.push(line);
  }
  return sats;
}

interface Run { satnum: number; lines: (OutLine & { failedAtStart?: boolean })[]; error: { code: Sgp4Error; t: number } | null }

/**
 * The paper's test driver: each set at 0, then from its start to its stop in
 * its step (the first line not repeated at 0), then at the stop time itself
 * if the steps did not land on it; a set stops at its first error.
 */
function runVerification(text: string): Run[] {
  const runs: Run[] = [];
  const lines = text.replace(/\r/g, '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l1 = lines[i];
    if (!l1.startsWith('1')) continue;
    const l2 = lines[++i];
    const parsed = parseTle(l1, l2.slice(0, 69));
    const el = parsed.elements!;
    const sat = satrecFrom(el);
    const run: Run = { satnum: el.satnum, lines: [], error: null };
    runs.push(run);
    const [tstart, tend, tstep] = l2.slice(69).trim().split(/\s+/).map(Number);

    const at = (t: number, long: boolean): boolean => {
      const r = [NaN, NaN, NaN], v = [NaN, NaN, NaN];
      const e = sgp4(sat, t, r, v);
      if (e !== 0) {
        run.error = { code: e, t };
        if (t === 0) run.lines.push({ t, r, v, failedAtStart: true });
        return false;
      }
      const line: OutLine = { t, r, v };
      if (long) {
        const d = invjday(sat.jdsatepoch, sat.jdsatepochF + t / 1440.0);
        line.date = { year: d.year, mon: d.mon, day: d.day, secOfDay: d.hr * 3600 + d.minute * 60 + d.sec };
      }
      run.lines.push(line);
      return true;
    };

    if (!at(0, false)) continue;
    let t = tstart;
    let stopped = false;
    while (t <= tend) {
      if (t === tstart && tstart === 0) { t += tstep; continue; }
      if (!at(t, true)) { stopped = true; break; }
      t += tstep;
    }
    if (!stopped && t - tend < tstep - 1e-6) at(tend, true);
  }
  return runs;
}

const expected = readTcpp(tcppText);
const actual = runVerification(verText);

describe('SGP4 against the AIAA 2006-6753 verification (tcppver.out)', () => {
  it('runs the same 33 element sets, in order, to the same number of lines', () => {
    expect(actual.map((s) => s.satnum)).toEqual(expected.map((s) => s.satnum));
    expect(expected.length).toBe(33);
    expect(expected.reduce((n, s) => n + 1 + s.lines.length, 0)).toBe(700);
    for (let k = 0; k < expected.length; k++) {
      expect({ satnum: expected[k].satnum, lines: actual[k].lines.length }).toEqual({ satnum: expected[k].satnum, lines: expected[k].lines.length });
    }
  });

  it('stops the same element sets with the same errors: [1, 1, 6, 6, 4, 3, 6]', () => {
    const errors = actual.filter((s) => s.error).map((s) => s.error!.code);
    expect(errors).toEqual([1, 1, 6, 6, 4, 3, 6]);
  });

  it('matches every position and velocity to 2 × 10⁻⁷ km and km/s, at the same times', () => {
    let worstR = 0, worstV = 0, compared = 0;
    for (let k = 0; k < expected.length; k++) {
      for (let j = 0; j < expected[k].lines.length; j++) {
        const e = expected[k].lines[j], a = actual[k].lines[j];
        expect(Math.abs(a.t - e.t)).toBeLessThan(1e-6);
        // a set that fails at its epoch prints the previous set's last line (the driver's leftover); nothing to compare
        if ((a as { failedAtStart?: boolean }).failedAtStart) continue;
        for (let c = 0; c < 3; c++) {
          worstR = Math.max(worstR, Math.abs(a.r[c] - e.r[c]));
          worstV = Math.max(worstV, Math.abs(a.v[c] - e.v[c]));
        }
        compared++;
      }
    }
    // 666 lines; the worst is satellite 20413 three and a half years out (1.2 × 10⁻⁷ km), the rest under 3 × 10⁻⁸ km
    expect(compared).toBe(666);
    expect(worstR).toBeLessThan(2e-7);
    expect(worstV).toBeLessThan(2e-7);
  });

  // the reference dates each line from one Julian date in a double, which resolves 40 µs
  it('dates every line as the paper does, to 0.1 ms', () => {
    for (let k = 0; k < expected.length; k++) {
      for (let j = 0; j < expected[k].lines.length; j++) {
        const e = expected[k].lines[j].date, a = actual[k].lines[j].date;
        if (!e) continue;
        expect(a).toBeDefined();
        expect([a!.year, a!.mon, a!.day]).toEqual([e.year, e.mon, e.day]);
        expect(Math.abs(a!.secOfDay - e.secOfDay)).toBeLessThan(1e-4);
      }
    }
  });

  it('runs the same in the AFSPC operation mode where the two agree (near-Earth sets)', () => {
    const set = parseTle(
      '1 06251U 62025E   06176.82412014  .00008885  00000-0  12808-3 0  3985',
      '2 06251  58.0579  54.0425 0030035 139.1568 221.1854 15.56387291  6774',
    ).elements!;
    const i = satrecFrom(set), a = satrecFrom(set, { opsmode: 'a' });
    const ri = [0, 0, 0], vi = [0, 0, 0], ra = [0, 0, 0], va = [0, 0, 0];
    sgp4(i, 2880, ri, vi);
    sgp4(a, 2880, ra, va);
    // the modes differ only in the epoch's sidereal time, which a near-Earth orbit does not use
    for (let c = 0; c < 3; c++) expect(ra[c]).toBeCloseTo(ri[c], 9);
  });
});

describe('the deep-space resonance integrator', () => {
  it('gives the same answer run forward in steps as run once from the epoch', () => {
    // Molniya 2-14, a 12-hour resonant orbit: the integrator keeps its last step
    const set = parseTle(
      '1 08195U 75081A   06176.33215444  .00000099  00000-0  11873-3 0   813',
      '2 08195  64.1586 279.0717 6877146 264.7651  20.2257  2.00491383225656',
    ).elements!;
    const stepped = satrecFrom(set), fresh = satrecFrom(set);
    const r1 = [0, 0, 0], v1 = [0, 0, 0], r2 = [0, 0, 0], v2 = [0, 0, 0];
    for (let t = 0; t <= 2880; t += 60) sgp4(stepped, t, r1, v1);
    sgp4(fresh, 2880, r2, v2);
    for (let c = 0; c < 3; c++) {
      expect(r1[c]).toBe(r2[c]);
      expect(v1[c]).toBe(v2[c]);
    }
    // and going back before the last step restarts from the epoch
    sgp4(stepped, 100, r1, v1);
    sgp4(satrecFrom(set), 100, r2, v2);
    for (let c = 0; c < 3; c++) expect(r1[c]).toBe(r2[c]);
  });
});

describe('the element-set format (tle.ts)', () => {
  const ISS1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
  const ISS2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';

  it('checks the check digit of CelesTrak\'s documented example', () => {
    // https://celestrak.org/NORAD/documentation/tle-fmt.php
    expect(tleChecksum(ISS1)).toBe(7);
    expect(tleChecksum(ISS2)).toBe(7);
    expect(checksumOk(ISS1)).toBe(true);
    expect(checksumOk(ISS1.slice(0, 68) + '3')).toBe(false);
  });

  it('reads every field of the documented example', () => {
    const { elements: el, problems } = parseTle(ISS1, ISS2, 'ISS (ZARYA)', true);
    expect(problems).toEqual([]);
    expect(el).not.toBeNull();
    expect(el!.name).toBe('ISS (ZARYA)');
    expect(el!.satnum).toBe(25544);
    expect(el!.classification).toBe('U');
    expect(el!.intldesg).toBe('98067A');
    expect(el!.epochYear).toBe(2008);
    expect(el!.epochDays).toBeCloseTo(264.51782528, 12);
    // 2008 September 20, 12:25:40.104 UTC
    expect(el!.jdEpoch + el!.jdEpochFrac).toBeCloseTo(2454730.01782528, 8);
    const xpdotp = 1440 / (2 * Math.PI);
    expect(el!.ndot * xpdotp * 1440).toBeCloseTo(-0.00002182, 12);
    expect(el!.nddot).toBe(0);
    expect(el!.bstar).toBeCloseTo(-0.11606e-4, 12);
    expect(el!.inclo * 180 / Math.PI).toBeCloseTo(51.6416, 10);
    expect(el!.nodeo * 180 / Math.PI).toBeCloseTo(247.4627, 10);
    expect(el!.ecco).toBeCloseTo(0.0006703, 12);
    expect(el!.argpo * 180 / Math.PI).toBeCloseTo(130.536, 10);
    expect(el!.mo * 180 / Math.PI).toBeCloseTo(325.0288, 10);
    expect(el!.noKozai * xpdotp).toBeCloseTo(15.72125391, 10);
    expect(el!.revnum).toBe(56353);
    expect(el!.elnum).toBe(292);
  });

  it('rejects a set whose lines are of two satellites, or broken, and says which', () => {
    expect(parseTle(ISS1, ISS2.replace('25544', '25545')).problems).toEqual([{ kind: 'mismatch' }]);
    expect(parseTle(ISS1.slice(0, 30), ISS2).elements).toBeNull();
    expect(parseTle(ISS1, ISS2.replace('0006703', '00x6703')).problems[0]).toEqual({ kind: 'line2', detail: 'eccentricity' });
    const bad = parseTle(ISS1.slice(0, 68) + '3', ISS2, null, true);
    expect(bad.elements).toBeNull();
    expect(bad.problems).toEqual([{ kind: 'checksum', line: 1 }]);
  });

  it('reads Alpha-5 catalogue numbers both ways', () => {
    expect(readSatnum('00005')).toBe(5);
    expect(readSatnum('A0000')).toBe(100000);
    expect(readSatnum('E8493')).toBe(148493);
    expect(readSatnum('Z9999')).toBe(339999);
    expect(readSatnum('I0000')).toBeNull();
    for (const n of [5, 99999, 100000, 148493, 339999]) expect(readSatnum(writeSatnum(n))).toBe(n);
  });

  it('reads a file of two- and three-line sets, CelesTrak\'s "0 NAME" form, and reports what it cannot', () => {
    const text = [
      'ISS (ZARYA)', ISS1, ISS2,
      '', '# a comment',
      ISS1.replace('25544', '25545'), ISS2,
      '0 VANGUARD 1',
      '1 00005U 58002B   20287.20333880 -.00000016  00000-0 -22483-4 0  9998',
      '2 00005  34.2443 225.5254 1845686 162.2516 205.2356 10.84869164218149',
      '1 00005U 58002B   20287.20333880 -.00000016  00000-0 -22483-4 0  9998',
      '2 00005  34.2443 225.5254 1845686 162.2516 205.2356 10.84869164218149',
    ].join('\r\n');
    const { sets, rejected } = parseTleFile(text);
    expect(sets.map((s) => [s.satnum, s.name])).toEqual([[25544, 'ISS (ZARYA)'], [5, 'VANGUARD 1'], [5, null]]);
    expect(rejected).toEqual([{ line: 6, problems: [{ kind: 'mismatch' }] }]);
  });

  it('turns a day of the year into a date as the reference does, leap years included', () => {
    expect(days2mdhms(2000, 179.78495062)).toMatchObject({ mon: 6, day: 27, hr: 18 });
    expect(days2mdhms(2004, 60.5)).toMatchObject({ mon: 2, day: 29, hr: 12, minute: 0 });
    expect(days2mdhms(2005, 60.5)).toMatchObject({ mon: 3, day: 1 });
    // J2000.0
    const { jd, jdFrac } = jday(2000, 1, 1, 12, 0, 0);
    expect(jd + jdFrac).toBe(2451545.0);
    expect(invjday(2451544.5, 0.5)).toMatchObject({ year: 2000, mon: 1, day: 1, hr: 12, minute: 0 });
  });
});

describe('the propagator in the program\'s units and frames', () => {
  const set = parseTle(
    '1 00005U 58002B   00179.78495062  .00000023  00000-0  28098-4 0  4753',
    '2 00005  34.2682 348.7242 1859667 331.7664  19.3264 10.82419157413667',
  ).elements!;

  it('gives SI units at a Julian date, and the verification\'s first line at the epoch', () => {
    const s = satrecFrom(set);
    const st = propagateTo(s, s.jdsatepoch + s.jdsatepochF);
    expect(st.error).toBe(0);
    // tcppver.out, satellite 5 at 0 minutes: 7022.46529266 −1400.08296755 0.03995155 km; a Julian date
    // in one double resolves 40 µs, which is a few millimetres at 7 km/s
    expect(Math.abs(st.r[0] - 7022465.29266)).toBeLessThan(0.05);
    expect(Math.abs(st.r[1] - -1400082.96755)).toBeLessThan(0.05);
    expect(Math.abs(st.v[0] - 1893.841015)).toBeLessThan(1e-4);
    expect(minutesSinceEpoch(s, s.jdsatepoch + s.jdsatepochF + 0.25)).toBeCloseTo(360, 5);
  });

  it('uses WGS-72 by default, and WGS-84 when asked', () => {
    expect(gravConst('wgs72')).toMatchObject({ mu: 398600.8, radiusearthkm: 6378.135 });
    expect(gravConst('wgs84').radiusearthkm).toBe(6378.137);
    const r72 = propagateTo(satrecFrom(set), 2451725), r84 = propagateTo(satrecFrom(set, { gravity: 'wgs84' }), 2451725);
    // the two constant sets move the satellite by metres, not kilometres
    const d = Math.hypot(r72.r[0] - r84.r[0], r72.r[1] - r84.r[1], r72.r[2] - r84.r[2]);
    expect(d).toBeGreaterThan(1);
    expect(d).toBeLessThan(5000);
  });

  it('turns TEME to Earth-fixed about the pole by sidereal time: Vallado Example 3-5\'s GMST', () => {
    // 1992 August 20, 12:14 UT1: GMST 152.578 787 810°
    const { jd, jdFrac } = jday(1992, 8, 20, 12, 14, 0);
    expect(gstime(jd + jdFrac) * 180 / Math.PI).toBeCloseTo(152.578787810, 6);
    // a point over the pole does not move; one on the x axis turns by −GMST
    const g = gstime(jd + jdFrac);
    const pole = temeToEcef([0, 0, 7000e3], [0, 0, 0], jd + jdFrac);
    expect(Math.abs(pole.r[0]) + Math.abs(pole.r[1])).toBe(0);
    expect(pole.r[2]).toBe(7000e3);
    const x = temeToEcef([7000e3, 0, 0], [0, 0, 0], jd + jdFrac);
    expect(Math.atan2(x.r[1], x.r[0])).toBeCloseTo(-(g > Math.PI ? g - 2 * Math.PI : g), 12);
    // a geostationary satellite's Earth-fixed velocity is nearly zero
    const w = 7.29211514670698e-5, rg = 42164e3;
    const geo = temeToEcef([rg, 0, 0], [0, w * rg, 0], jd + jdFrac);
    expect(Math.hypot(...geo.v)).toBeLessThan(1e-6);
  });

  it('keeps the error of a decayed satellite', () => {
    const s = new Satrec();
    expect(s.error).toBe(0);
    const decay = runVerification(verText).find((x) => x.satnum === 28872)!;
    expect(decay.error).toEqual({ code: 6, t: expect.any(Number) });
  });
});
