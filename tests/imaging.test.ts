/**
 * D06's camera (roadmap D06, docs/ROADMAP-PART2-3.md; Phase 4 map §2.2 F):
 * src/orbit/imaging.ts, with O04's `groundSampleDistance` and `swathWidth`
 * (src/orbit/applications.ts) that it builds on.
 *
 * - V-G1: Sentinel-2's MSI; V-G2: Landsat 8's OLI swath and TIRS sample;
 *   V-G3: the app's THEOS-2-like example camera; V-G4: TU Delft's image
 *   data-rate example. Published numbers.
 * - `offNadirGsd` and `diffractionGsd`: no free worked example exists (map
 *   §2.2 F), so SELF-CONSISTENCY ONLY — a ray traced to the sphere,
 *   `sideReach`'s slope, the Airy pattern's first zero, and the direction
 *   of Sentinel-2's published pupil against its published bands.
 *
 * Each tolerance is written in the comment above its comparisons, before the
 * first run.
 */
import { describe, expect, it } from 'vitest';
import { DEG, R_EARTH } from '../src/physics/constants';
import { groundSampleDistance, sideReach, swathWidth } from '../src/orbit/applications';
import { diffractionGsd, groundSpeed, imagingCore, imagingDataRate, offNadirGsd } from '../src/orbit/imaging';

const rel = (a: number, b: number) => Math.abs(a / b - 1);

/**
 * V-G1. Sentinel-2 MSI.
 * - ESA: Spoto & Martimort, "Sentinel-2", S2 for Science 2014, slides 17
 *   and 19: "Field of view: 21° resulting swath width 290 km"; "7.5 and
 *   15 µm pitch to cover 10 m, 20 m and 60 m SSD":
 *   https://seom.esa.int/S2forScience2014/files/03_S2forScience-Opening_SPOTO_MARTIMORT.pdf
 * - eoPortal (ESA-run): 786 km; swath 290 km, FOV 20.6°:
 *   https://www.eoportal.org/satellite-missions/copernicus-sentinel-2
 * - The focal length, about 600 mm, is not an ESA figure: SPIE ICSO paper
 *   https://doi.org/10.1117/12.2308278.
 * Tolerances, the map's, fixed before the first run: GSD ±3 % (the focal
 * length is "about" 600 mm); swath ±2 % (ESA's 21° and eoPortal's 20.6°
 * straddle the 290 km).
 */
describe('V-G1: Sentinel-2\'s 10 m and 20 m samples and 290 km swath (D06)', () => {
  const h = 786e3, f = 0.6;
  it('samples 10 m with 7.5 µm pixels and 20 m with 15 µm, within 3 %', () => {
    expect(rel(groundSampleDistance(h, 7.5e-6, f), 10)).toBeLessThan(0.03);
    expect(rel(groundSampleDistance(h, 15e-6, f), 20)).toBeLessThan(0.03);
  });
  it('lays a 290 km swath across 20.6° and 21°, within 2 %', () => {
    expect(rel(swathWidth(h, 20.6 * DEG)!, 290e3)).toBeLessThan(0.02);
    expect(rel(swathWidth(h, 21 * DEG)!, 290e3)).toBeLessThan(0.02);
  });
});

/**
 * V-G2. Landsat 8.
 * - NASA, OLI: "an 185 km swath from 705 km altitude":
 *   https://science.nasa.gov/mission/landsat/oli
 * - eoPortal, Landsat 8: OLI "Swath width (FOV=15º) 185 km"; TIRS "Pixel
 *   size of 25 µm producing an IFOV of 142 µrad", GSD "100 m (nominal)":
 *   https://www.eoportal.org/satellite-missions/landsat-8-ldcm
 * Tolerances, fixed before the first run: the swath ±1 % (the map's); TIRS's
 * sample ±0.35 %, half a unit in the printed IFOV (142 ± 0.5 µrad). (Its
 * 100.1 m was worked while reading the source; the bound is the IFOV's
 * printing, not a fit.) The focal length the IFOV implies, 25 µm / 142 µrad,
 * is 176 mm.
 */
describe('V-G2: Landsat 8, OLI\'s 185 km swath and TIRS\'s 100 m sample (D06)', () => {
  const h = 705e3;
  it('lays OLI\'s 185 km across 15°, within 1 %', () => {
    expect(rel(swathWidth(h, 15 * DEG)!, 185e3)).toBeLessThan(0.01);
  });
  it('samples TIRS\'s 100 m from 25 µm pixels at 142 µrad, within 0.35 %', () => {
    const f = 25e-6 / 142e-6;
    expect(rel(groundSampleDistance(h, 25e-6, f), 100)).toBeLessThan(0.0035);
    expect(offNadirGsd(h, 25e-6, f, 0).along).toBe(groundSampleDistance(h, 25e-6, f));
  });
});

/**
 * V-G3. The app's example camera (src/ui/orbit/applications-panel.ts: 16.1 m,
 * 13 µm), labelled an example, not THEOS-2's real design; it gives
 * THEOS-2's published 0.5 m from 621 km (eoPortal:
 * https://www.eoportal.org/satellite-missions/theos-2). Kept as
 * tests/applications.test.ts holds it: 0.501 m to 3 decimals; and
 * `offNadirGsd` at nadir must be that number exactly (the map's rule).
 */
describe('V-G3: the example camera\'s 0.501 m at nadir, the same number both ways (D06)', () => {
  it('is groundSampleDistance at nadir, to the bit, along and across', () => {
    const g = groundSampleDistance(621e3, 13e-6, 16.1);
    expect(g).toBeCloseTo(0.501, 3);
    expect(offNadirGsd(621e3, 13e-6, 16.1, 0)).toEqual({ along: g, cross: g });
    expect(offNadirGsd(621e3, 13e-6, 16.1, -0)).toEqual({ along: g, cross: g });
    // and for any height and optics
    for (const [h, p, f] of [[400e3, 5.5e-6, 0.58], [786e3, 7.5e-6, 0.6], [35_786e3, 1e-5, 2]]) {
      const n = offNadirGsd(h, p, f, 0);
      expect(n.along).toBe(groundSampleDistance(h, p, f));
      expect(n.cross).toBe(groundSampleDistance(h, p, f));
    }
  });
});

/**
 * V-G4. B.T.C. Zandbergen, *Spacecraft bus design and sizing*, TU Delft
 * (2020), book p. 183 (PDF p. 197), "Example: Image data rate estimation":
 * https://repository.tudelft.nl/file/File_124a068a-158f-4b40-a44f-9ba407a14845
 *
 * Its inputs, taken from the PDF before this tolerance was fixed: an image
 * of 20 000 pixels (100 × 200) of 24 bits (480 000 bits); 500 km; "an
 * orbital velocity of 7.6 km/s (see syllabus, appendix H), which gives a
 * ground velocity of about 7.05 km/s"; 10 km along the track per image;
 * 7.05/10 = 0.705 images a second; 0.705 × 480 kb = 338.4 kbps. It does not
 * say which side of the image lies along the track; either way the pixels
 * per metre along it are 20 000/10 km, so the rate is the same.
 *
 * The same reader's App. H (book p. 274) prints 7.613 km/s at 500 km, and
 * its p. 161 solution turns that into a ground velocity of 7.06 km/s; the
 * p. 183 example rounds the orbital speed to 7.6 km/s first.
 *
 * Tolerances, fixed before the first run:
 * - the rate: ±0.7 %, the half-unit of the example's 7.6 km/s (0.05/7.6 =
 *   0.66 %), which the rate is proportional to;
 * - the formula's shape with the example's own 7.05 km/s: 338.4 kbit/s
 *   to 1e-9 relative;
 * - `groundSpeed`: App. H's 7.613 km/s (orbital) ±0.0005 km/s and p. 161's
 *   7.06 km/s (ground) ±0.005 km/s, half a unit in each printed digit.
 */
describe('V-G4: TU Delft\'s image data rate, 338.4 kbit/s at 500 km (D06)', () => {
  const h = 500e3;
  it('makes 338.4 kbit/s within 0.7 %, whichever side of the image lies along the track', () => {
    const a = imagingDataRate(200, 24, 10e3 / 100, h);
    const b = imagingDataRate(100, 24, 10e3 / 200, h);
    expect(rel(a, 338.4e3)).toBeLessThan(0.007);
    expect(rel(b, a)).toBeLessThan(1e-12);
    // the book's arithmetic, with its own ground speed
    expect(rel((a / groundSpeed(h)) * 7.05e3, 338.4e3)).toBeLessThan(1e-9);
  });
  it('moves over the ground at App. H\'s speed scaled to the surface', () => {
    expect(Math.abs((groundSpeed(h) * (R_EARTH + h)) / R_EARTH / 1e3 - 7.613)).toBeLessThan(0.0005);
    expect(Math.abs(groundSpeed(h) / 1e3 - 7.06)).toBeLessThan(0.005);
  });
});

/**
 * `offNadirGsd`: SELF-CONSISTENCY (no free worked example; map §2.2 F).
 *
 * 1. A ray trace, independent of the closed form: from the satellite at
 *    radius r, rays one IFOV (p/f) apart, tilted η across the track, are
 *    intersected with the sphere of radius R_EARTH; the distance between
 *    the two ground points is the sample. Across the track the two rays
 *    differ in tilt, along it they differ square to the tilt's plane.
 *    Tolerance, fixed before the first run: 1e-6 relative (the IFOV's
 *    second-order term is ~1e-12, the rounding of two 6 400 km vectors
 *    ~1e-8 of a 0.5 m sample).
 * 2. `sideReach` (O04) is the ground distance to the target at tilt η, so
 *    its slope times the IFOV is the cross-track sample. Tolerance 1e-6
 *    relative (a central difference of 1e-5 rad).
 * 3. Its shape: even in η; growing with η; across ≥ along; ~η² near nadir
 *    (1e-9 relative at 1e-6 rad); unbounded at the horizon (across, over a
 *    thousand times the nadir sample 1e-9 rad inside it), Infinity past it.
 */
describe('off-nadir GSD, self-consistency only (D06)', () => {
  const cameras = [
    { name: 'the example camera at 621 km', h: 621e3, p: 13e-6, f: 16.1 },
    { name: 'Sentinel-2 at 786 km', h: 786e3, p: 7.5e-6, f: 0.6 },
    { name: 'a CubeSat camera at 500 km', h: 500e3, p: 5.5e-6, f: 0.58 },
  ];

  /** Where a ray from (0, r, 0) along `d` meets the sphere first. */
  function hit(r: number, d: [number, number, number]): [number, number, number] {
    const n = Math.hypot(...d), u = d.map((x) => x / n) as [number, number, number];
    const b = r * u[1]; // S·u
    const t = -b - Math.sqrt(b * b - (r * r - R_EARTH * R_EARTH));
    return [t * u[0], r + t * u[1], t * u[2]];
  }
  const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  for (const c of cameras) {
    it(`agrees with a ray traced to the sphere, ${c.name}`, () => {
      const r = R_EARTH + c.h, ifov = c.p / c.f;
      const horizon = Math.asin(R_EARTH / r);
      for (const deg of [0, 1, 5, 15, 30, 45, 55]) {
        const eta = deg * DEG;
        if (eta > horizon - 2 * DEG) continue;
        const g = offNadirGsd(c.h, c.p, c.f, eta);
        const across = dist(
          hit(r, [Math.sin(eta - ifov / 2), -Math.cos(eta - ifov / 2), 0]),
          hit(r, [Math.sin(eta + ifov / 2), -Math.cos(eta + ifov / 2), 0]),
        );
        const s = Math.sin(ifov / 2), k = Math.cos(ifov / 2);
        const along = dist(
          hit(r, [k * Math.sin(eta), -k * Math.cos(eta), -s]),
          hit(r, [k * Math.sin(eta), -k * Math.cos(eta), s]),
        );
        expect(rel(g.cross, across), `${deg}° across`).toBeLessThan(1e-6);
        expect(rel(g.along, along), `${deg}° along`).toBeLessThan(1e-6);
      }
    });

    it(`is sideReach's slope times the IFOV across the track, ${c.name}`, () => {
      const d = 1e-5;
      for (const deg of [2, 10, 25, 40, 50]) {
        const eta = deg * DEG;
        const slope = (sideReach(c.h, eta + d)! - sideReach(c.h, eta - d)!) / (2 * d);
        expect(rel(offNadirGsd(c.h, c.p, c.f, eta).cross, (slope * c.p) / c.f), `${deg}°`).toBeLessThan(1e-6);
      }
    });
  }

  it('is even, grows with the tilt, coarser across than along, smooth at nadir, unbounded at the horizon', () => {
    const { h, p, f } = cameras[0];
    const nadir = groundSampleDistance(h, p, f);
    let last = offNadirGsd(h, p, f, 0);
    for (let deg = 1; deg <= 60; deg++) {
      const g = offNadirGsd(h, p, f, deg * DEG);
      expect(offNadirGsd(h, p, f, -deg * DEG)).toEqual(g);
      expect(g.along).toBeGreaterThan(last.along);
      expect(g.cross).toBeGreaterThan(last.cross);
      expect(g.cross).toBeGreaterThan(g.along);
      last = g;
    }
    expect(rel(offNadirGsd(h, p, f, 1e-6).along, nadir)).toBeLessThan(1e-9);
    expect(rel(offNadirGsd(h, p, f, 1e-6).cross, nadir)).toBeLessThan(1e-9);
    const horizon = Math.asin(R_EARTH / (R_EARTH + h));
    expect(offNadirGsd(h, p, f, horizon - 1e-9).cross).toBeGreaterThan(1e3 * nadir);
    expect(offNadirGsd(h, p, f, horizon + 1e-3)).toEqual({ along: Infinity, cross: Infinity });
  });

  it('sees no ground, Infinity, when the camera points away from the Earth, however far round', () => {
    // Past 90° from nadir the line of sight climbs away from the sphere; near
    // 180° |sin| is small again, so the horizon test on sin alone passes and
    // the near root is negative. Expected exactly Infinity, fixed before the run.
    for (const { h, p, f } of cameras) {
      for (const deg of [90, 100, 120, 150, 170, 179, 180, -120, -175, -180, 200]) {
        expect(offNadirGsd(h, p, f, deg * DEG), `${h / 1e3} km, ${deg}°`).toEqual({ along: Infinity, cross: Infinity });
      }
    }
  });
});

/**
 * `diffractionGsd`: SELF-CONSISTENCY (no free worked example; map §2.2 F).
 *
 * 1. The 1.22 is the first zero of the Airy pattern, x₁/π with J₁(x₁) = 0,
 *    x₁ = 3.8317 (Airy 1835; any optics text): found here from J₁'s power
 *    series by bisection. Tolerance, fixed before the first run: 0.03 %
 *    (1.22 is 1.2197 to three figures).
 * 2. Its scaling, and the inverse D07 will use, D_min = 1.22·λ·h/GSD:
 *    1e-12 relative.
 * 3. Direction only, against published inputs: Sentinel-2's MSI, a 150 mm
 *    pupil at 786 km (eoPortal,
 *    https://www.eoportal.org/satellite-missions/copernicus-sentinel-2),
 *    samples every one of its 13 bands (centre wavelengths and 10/20/60 m,
 *    eoPortal's band table) coarser than the diffraction limit — its pixels,
 *    not its aperture, set its resolution.
 */
describe('the diffraction limit, self-consistency only (D06)', () => {
  it('is Rayleigh\'s 1.22: the Airy pattern\'s first dark ring, within 0.03 %', () => {
    const j1 = (x: number) => {
      let term = x / 2, sum = term;
      for (let k = 1; k < 40; k++) {
        term *= -((x / 2) ** 2) / (k * (k + 1));
        sum += term;
      }
      return sum;
    };
    let a = 3, b = 4.5; // J₁(3) > 0 > J₁(4.5)
    for (let k = 0; k < 100; k++) {
      const m = (a + b) / 2;
      if (j1(m) > 0) a = m; else b = m;
    }
    const firstZero = (a + b) / 2;
    expect(firstZero).toBeCloseTo(3.8317, 4);
    // diffractionGsd over h·λ/D is the coefficient itself
    expect(rel(diffractionGsd(1, 1, 1), firstZero / Math.PI)).toBeLessThan(3e-4);
  });

  it('scales with height and wavelength, against the aperture, and inverts', () => {
    const g = diffractionGsd(600e3, 0.2, 550e-9);
    expect(rel(diffractionGsd(1200e3, 0.2, 550e-9), 2 * g)).toBeLessThan(1e-12);
    expect(rel(diffractionGsd(600e3, 0.4, 550e-9), g / 2)).toBeLessThan(1e-12);
    expect(rel(diffractionGsd(600e3, 0.2, 1100e-9), 2 * g)).toBeLessThan(1e-12);
    for (const gsd of [0.3, 0.5, 2, 10]) {
      const dMin = (1.22 * 650e-9 * 621e3) / gsd;
      expect(rel(diffractionGsd(621e3, dMin, 650e-9), gsd)).toBeLessThan(1e-12);
    }
  });

  it('leaves every Sentinel-2 band sampled coarser than its 150 mm pupil resolves', () => {
    const bands: [string, number, number][] = [
      ['B1', 443, 60], ['B2', 490, 10], ['B3', 560, 10], ['B4', 665, 10], ['B5', 705, 20], ['B6', 740, 20], ['B7', 775, 20],
      ['B8', 842, 10], ['B8a', 865, 20], ['B9', 940, 60], ['B10', 1375, 60], ['B11', 1610, 20], ['B12', 2190, 20],
    ];
    for (const [id, nm, ssd] of bands) expect(diffractionGsd(786e3, 0.15, nm * 1e-9), id).toBeLessThan(ssd);
  });
});

/**
 * `imagingDataRate`'s shape (V-G4 holds its value): linear in the pixels and
 * the bits, one line per GSD, so a swath W sampled at GSD g makes
 * W·bits·v/g² — the area swept a second over each pixel's area. 1e-12
 * relative.
 */
describe('the camera\'s data rate, its shape (D06)', () => {
  it('is pixels × bits × lines a second, and so the area swept over a pixel\'s area', () => {
    const h = 621e3, r = imagingDataRate(20_600, 12, 0.5, h);
    expect(rel(imagingDataRate(41_200, 12, 0.5, h), 2 * r)).toBeLessThan(1e-12);
    expect(rel(imagingDataRate(20_600, 24, 0.5, h), 2 * r)).toBeLessThan(1e-12);
    expect(rel(imagingDataRate(20_600, 12, 1, h), r / 2)).toBeLessThan(1e-12);
    const swath = 20_600 * 0.5;
    expect(rel(r, (swath * 12 * groundSpeed(h)) / 0.5 ** 2)).toBeLessThan(1e-12);
  });

  it('is what the core exports', () => {
    expect(Object.keys(imagingCore).sort()).toEqual(['diffractionGsd', 'imagingDataRate', 'offNadirGsd']);
  });
});
