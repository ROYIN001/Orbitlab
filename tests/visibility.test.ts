/**
 * How a satellite looks from the ground (roadmap P2.5): the air's lift
 * against Skyfield's (an independent implementation, Bennett's formula solved
 * for the apparent altitude; tests/fixtures/passes/skyfield-refraction.json),
 * within 0.005° (0.3′), a tolerance fixed before the comparison; and the
 * brightness against the conventions it is defined by.
 */
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/passes/skyfield-refraction.json';
import passFixture from './fixtures/passes/skyfield-passes.json';
import { apparentElevation, loadStandardMagnitudes, phaseAngle, refraction, visualMagnitude } from '../src/orbit/visibility';
import { brightest, findPasses, magnitudeAt } from '../src/orbit/passes';
import { skyObjects } from '../src/orbit/real-sky';
import { elementsFromRecord } from '../src/orbit/omm';
import type { OmmRecord } from '../src/provider/satellites';
import { v3 } from '../src/physics/vec3';

const DEG = Math.PI / 180;

describe('refraction (P2.5)', () => {
  it.each(fixture.rows.map((r) => [r.true, r.apparent] as const))('lifts %f° to Skyfield\'s apparent elevation', (trueEl, apparent) => {
    expect(Math.abs(apparentElevation(trueEl * DEG) / DEG - apparent)).toBeLessThan(0.005);
  });

  it('is half a degree on the horizon and scales with the air\'s density', () => {
    // Meeus: 28.98′ at a true elevation of 0 for 1010 hPa, 10 °C
    expect(refraction(0) / DEG * 60).toBeCloseTo(28.98, 1);
    expect(refraction(90 * DEG) / DEG * 3600).toBeLessThan(1);
    expect(refraction(0, 505, 10) / refraction(0)).toBeCloseTo(0.5, 12);
    expect(refraction(0, 1010, 283 - 273 + 30) / refraction(0)).toBeCloseTo(283 / 313, 12);
    expect(refraction(-10 * DEG)).toBe(refraction(-2 * DEG));
  });
});

describe('brightness (P2.5)', () => {
  it('is the standard magnitude fully lit at 1000 km, 0.75 fainter half lit, 1.5 fainter at twice the range', () => {
    expect(visualMagnitude(4, 1e6, 0)).toBeCloseTo(4, 12);
    // the 0.8 magnitude between McCants's (fully lit) and Molczan's (half lit) conventions
    expect(visualMagnitude(4, 1e6, 90 * DEG) - 4).toBeCloseTo(0.753, 3);
    expect(visualMagnitude(4, 2e6, 0) - 4).toBeCloseTo(1.505, 3);
    // the ISS (−2.5) overhead at 420 km, the Sun 30° from behind the observer: about −4.3
    expect(visualMagnitude(-2.5, 420e3, 30 * DEG)).toBeCloseTo(-4.31, 2);
  });

  it('measures the phase at the satellite between the Sun and the observer', () => {
    const sat = v3(0, 0, 7e6), observer = v3(0, 0, 6.4e6);
    // the Sun straight behind the observer, beyond the Earth: fully lit
    expect(phaseAngle(sat, observer, v3(0, 0, -1)) / DEG).toBeCloseTo(0, 9);
    // the Sun to the side: half lit
    expect(phaseAngle(sat, observer, v3(1, 0, 0)) / DEG).toBeCloseTo(90, 9);
  });

  it('has the standard magnitudes of McCants\'s table', async () => {
    const m = await loadStandardMagnitudes();
    expect(m['25544']).toBe(-2.5);
    expect(m['33396']).toBe(5.5);
    expect(Object.keys(m).length).toBeGreaterThan(3000);
  });
});

describe('passes as they are seen (P2.5)', () => {
  const rec = (passFixture.sets as OmmRecord[]).find((s) => s.NORAD_CAT_ID === 25544)!;
  const [iss] = skyObjects([elementsFromRecord(rec)], 'imported');
  const bangkok = { lat: 13.7563 * DEG, lon: 100.5018 * DEG, h: 0 };
  const t0 = Date.parse(`${rec.EPOCH}Z`) / 86400e3 + 2440587.5;

  it('rises seconds earlier and sets later above the horizon one sees (a minute or more for a grazing pass)', () => {
    const plain = findPasses(iss, bangkok, t0, t0 + 3);
    const seen = findPasses(iss, bangkok, t0, t0 + 3, 0, { refraction: true });
    // a grazing pass the air lifts over the horizon can be one more
    expect(seen.length).toBeGreaterThanOrEqual(plain.length);
    plain.forEach((p) => {
      if (!p.rise || !p.set) return;
      const same = seen.find((q) => Math.abs(q.top.jd - p.top.jd) < 60 / 86400)!;
      const early = (p.rise.jd - same.rise!.jd) * 86400, late = (same.set!.jd - p.set.jd) * 86400;
      expect(early).toBeGreaterThan(1);
      expect(early).toBeLessThan(120);
      expect(late).toBeGreaterThan(1);
      expect(late).toBeLessThan(120);
    });
  });

  const stPetersburg = { lat: 59.9386 * DEG, lon: 30.3141 * DEG, h: 0 };
  it('gives the ISS\'s visible passes a brightness of the eye\'s range, and none in the Earth\'s shadow', () => {
    const visible = [bangkok, stPetersburg].flatMap((st) => findPasses(iss, st, t0, t0 + 3).filter((p) => p.visible).map((p) => ({ st, p })));
    expect(visible.length).toBeGreaterThan(0);
    for (const { st, p } of visible) {
      const b = brightest(iss, st, p, -2.5)!;
      expect(b.magnitude).toBeGreaterThan(-5);
      expect(b.magnitude).toBeLessThan(1);
    }
    // in the shadow it is not lit at all
    const dark = findPasses(iss, bangkok, t0, t0 + 3, 10 * DEG).find((p) => !p.visible && !p.top.sunlit);
    if (dark) expect(magnitudeAt(iss, bangkok, dark.top.jd, -2.5)).toBeNull();
  });
});
