/**
 * O04: what satellites are for, as numbers.
 *
 * - Pointing a dish: exact cases (overhead at the point below; due south on
 *   the satellite's meridian), the textbook spherical-Earth closed form
 *   tan el = (cos γ − R/r)/sin γ, and the edge of a geostationary
 *   satellite's view at 81.3°.
 * - Coverage: 42.4 % of the Earth above 0° elevation from GEO.
 * - Delay: 238.7 ms up and down beneath a geostationary satellite.
 * - The link budget: free-space loss 195.6 dB over 36 000 km at 4 GHz,
 *   Boltzmann's −228.6 dBW/(K·Hz), and C/N₀ = EIRP − L + G/T − k.
 * - Earth observation: the swath geometry against its flat-Earth limit, and
 *   Thailand's own satellites — THEOS's and THEOS-2's published heights
 *   follow from their published 26-day repeat cycles (369 and 385
 *   revolutions: 822 km and 621 km, eoPortal).
 * - The Thai satellites' data: every entry sourced, dated, consistent.
 */
import { describe, expect, it } from 'vitest';
import { DEG, R_EARTH } from '../src/physics/constants';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';
import {
  BOLTZMANN_DB, C_LIGHT, GEO_RADIUS, coverageFraction, dishGain, fovForSwath, footprintAngle, footprintCircle, freeSpaceLoss,
  geoEcef, geodeticToEcef, groundSampleDistance, linkBudget, lookAngles, repeatGridSpacing, sideReach, signalDelay, swathWidth,
} from '../src/orbit/applications';
import { STATIONS, commsReport, defaultApps, eoReport, stationOf, thaiOrbit } from '../src/orbit/applications-setup';
import { orbitFacts, repeatOrbit, stateAt } from '../src/orbit/kepler';
import { THAI_SATELLITES, THAI_SATELLITES_AS_OF, thaiSatelliteById } from '../src/data/thai-satellites';

const JD = 2461309.5;
const BANGKOK = { lat: 13.7563 * DEG, lon: 100.5018 * DEG, h: 0 };

/** The textbook look angles to GEO from a spherical Earth (Pratt & Bostian; Maral & Bousquet). */
function sphericalLook(lat: number, dLon: number): { el: number; gamma: number } {
  const gamma = Math.acos(Math.cos(lat) * Math.cos(dLon));
  return { gamma, el: Math.atan((Math.cos(gamma) - R_EARTH / GEO_RADIUS) / Math.sin(gamma)) };
}

describe('pointing a dish at a satellite (O04)', () => {
  it('looks straight up under a geostationary satellite, and due south on its meridian', () => {
    const under = lookAngles({ lat: 0, lon: 78.5 * DEG, h: 0 }, geoEcef(78.5 * DEG));
    expect(under.elevation / DEG).toBeCloseTo(90, 6);
    expect(under.range).toBeCloseTo(GEO_RADIUS - R_EARTH, 0);
    for (const lat of [13.75, 40, 60]) {
      const l = lookAngles({ lat: lat * DEG, lon: 100 * DEG, h: 0 }, geoEcef(100 * DEG));
      expect(l.azimuth / DEG).toBeCloseTo(180, 6);
      // the ellipsoid's vertical leans a little from the centre's: within 0.2° of the spherical closed form
      expect(Math.abs(l.elevation - sphericalLook(lat * DEG, 0).el) / DEG).toBeLessThan(0.2);
    }
    // south of the equator the dish looks north
    expect(lookAngles({ lat: -30 * DEG, lon: 100 * DEG, h: 0 }, geoEcef(100 * DEG)).azimuth / DEG).toBeCloseTo(0, 6);
  });

  it('agrees with the spherical closed form everywhere, west and east', () => {
    for (const lat of [5, 13.75, 35, 55]) {
      for (const dLon of [-60, -21, 0.5, 19, 45]) {
        const l = lookAngles({ lat: lat * DEG, lon: 100 * DEG, h: 0 }, geoEcef((100 + dLon) * DEG));
        const s = sphericalLook(lat * DEG, dLon * DEG);
        expect(Math.abs(l.elevation - s.el) / DEG, `${lat} ${dLon}`).toBeLessThan(0.2);
        // a satellite to the west is to the south-west from the north
        if (dLon < 0) expect(l.azimuth / DEG).toBeGreaterThan(180);
        if (dLon > 0) expect(l.azimuth / DEG).toBeLessThan(180);
      }
    }
  });

  it('points Bangkok\'s dishes at Thaicom: south-west to 78.5° E, south-east to 119.5° E, high in the sky', () => {
    const west = lookAngles(BANGKOK, geoEcef(78.5 * DEG)), east = lookAngles(BANGKOK, geoEcef(119.5 * DEG));
    expect(west.azimuth / DEG).toBeGreaterThan(225);
    expect(west.azimuth / DEG).toBeLessThan(250);
    expect(east.azimuth / DEG).toBeGreaterThan(115);
    expect(east.azimuth / DEG).toBeLessThan(135);
    expect(west.elevation / DEG).toBeGreaterThan(55);
    expect(east.elevation / DEG).toBeGreaterThan(55);
  });

  it('sees 81.3° round the Earth from GEO, 42.4 % of its surface', () => {
    expect(GEO_RADIUS / 1e3).toBeCloseTo(42164.2, 0);
    expect(footprintAngle(GEO_RADIUS, 0) / DEG).toBeCloseTo(81.3, 1);
    expect(coverageFraction(footprintAngle(GEO_RADIUS, 0))).toBeCloseTo(0.424, 3);
    // above 10°, less
    expect(footprintAngle(GEO_RADIUS, 10 * DEG) / DEG).toBeCloseTo(71.4, 1);
    // the footprint's edge is where the elevation is the minimum
    const edge = footprintCircle(0, 78.5 * DEG, footprintAngle(GEO_RADIUS, 10 * DEG), 24);
    for (const p of edge) {
      const l = lookAngles({ lat: p.lat, lon: p.lon, h: 0 }, geoEcef(78.5 * DEG));
      expect(Math.abs(l.elevation / DEG - 10)).toBeLessThan(0.3);
    }
  });

  it('takes 238.7 ms up and down beneath GEO, and about half a second for a question and its answer', () => {
    const h = GEO_RADIUS - R_EARTH;
    expect(signalDelay(h, h) * 1e3).toBeCloseTo(238.7, 1);
    expect(signalDelay(h, h, h, h) * 1e3).toBeCloseTo(477.5, 1);
    expect(C_LIGHT).toBe(299_792_458);
  });
});

describe('the link budget (O04)', () => {
  it('loses 195.6 dB over 36 000 km at 4 GHz, and knows Boltzmann in decibels', () => {
    expect(freeSpaceLoss(36_000e3, 4e9)).toBeCloseTo(195.6, 1);
    expect(BOLTZMANN_DB).toBeCloseTo(-228.6, 1);
    // doubling the distance or the frequency costs 6 dB
    expect(freeSpaceLoss(72_000e3, 4e9) - freeSpaceLoss(36_000e3, 4e9)).toBeCloseTo(6.02, 2);
    // a 1.2 m dish at 12 GHz, 65 % efficient: 41.7 dBi
    expect(dishGain(1.2, 12e9, 0.65)).toBeCloseTo(41.7, 1);
  });

  it('adds up: C/N₀ = EIRP − L − losses + G/T − k, Eb/N₀ = C/N₀ − 10 log R', () => {
    const b = linkBudget({ eirp: 52, frequency: 12e9, range: 37_500e3, diameter: 0.75, efficiency: 0.65, noiseTemperature: 150, losses: 3, dataRate: 30e6 });
    expect(b.gOverT).toBeCloseTo(b.gain - 10 * Math.log10(150), 9);
    expect(b.cOverN0).toBeCloseTo(52 - b.pathLoss - 3 + b.gOverT + 228.6, 1);
    expect(b.ebOverN0).toBeCloseTo(b.cOverN0 - 10 * Math.log10(30e6), 9);
    // a direct-to-home link of this kind closes with margin for a common modulation
    expect(b.ebOverN0).toBeGreaterThan(5);
  });
});

describe('Earth observation (O04)', () => {
  it('lays a swath that tends to 2h·tan(fov/2) for a narrow view, and inverts', () => {
    const h = 621e3;
    for (const fov of [0.5 * DEG, 1 * DEG, 20 * DEG]) {
      const w = swathWidth(h, fov)!;
      expect(fovForSwath(h, w) / fov).toBeCloseTo(1, 9);
    }
    expect(swathWidth(h, 1 * DEG)! / (2 * h * Math.tan(0.5 * DEG))).toBeCloseTo(1, 3);
    // the curved Earth widens a wide view
    expect(swathWidth(h, 60 * DEG)!).toBeGreaterThan(2 * h * Math.tan(30 * DEG));
    // a view wider than the horizon has no swath
    expect(swathWidth(h, 170 * DEG)).toBeNull();
    expect(groundSampleDistance(621e3, 13e-6, 16.1)).toBeCloseTo(0.501, 3);
  });

  it('finds THEOS and THEOS-2 at their published heights from their 26-day repeat cycles', () => {
    const theos = repeatOrbit(369, 26, true), theos2 = repeatOrbit(385, 26, true);
    // eoPortal: THEOS 822 km, 98.7°; THEOS-2 621 km
    expect(Math.abs((theos.a - R_EARTH) / 1e3 - 822)).toBeLessThan(1);
    expect(Math.abs(theos.i / DEG - 98.7)).toBeLessThan(0.05);
    expect(Math.abs((theos2.a - R_EARTH) / 1e3 - 621)).toBeLessThan(1);
    // and the catalogue's inclination for THEOS-2, 97.91°
    expect(Math.abs(theos2.i / DEG - 97.91)).toBeLessThan(0.1);
    // its repeat grid at the equator: 40 075 km / 385
    expect(repeatGridSpacing(385) / 1e3).toBeCloseTo(104.1, 1);
  });

  it('shows why THEOS-2 tilts: a 10.3 km strip covers a tenth of its repeat grid, tilting 45° reaches 650 km aside', () => {
    const reach = sideReach(621e3, 45 * DEG)!;
    expect(reach / 1e3).toBeGreaterThan(640);
    expect(reach / 1e3).toBeLessThan(670);
    expect(10.3e3 / repeatGridSpacing(385)).toBeLessThan(0.11);
    const sat = thaiSatelliteById('theos2')!;
    const o = thaiOrbit(sat, JD), s = stateAt(o, 0, true);
    const r = eoReport(defaultApps('eo'), o, s, true, sat.repeat!.revs, 22.25);
    expect(r.swath).toBe(10.3e3);
    expect(r.pixels).toBeCloseTo(20_600, 0);
    expect(r.nadirShare).toBeLessThan(0.01);
    expect(r.closesGap).toBe(false);
    expect(r.ltdn).toBeCloseTo(10.25, 9);
  });
});

describe('the applications\' settings (O04)', () => {
  it('stands in Bangkok to begin with, and knows its cities', () => {
    const a = defaultApps('comms');
    expect(a.stationId).toBe('bangkok');
    expect(a.station.lat / DEG).toBeCloseTo(13.7563, 9);
    expect(stationOf('stPetersburg')!.lat / DEG).toBeCloseTo(59.94, 2);
    expect(stationOf('nowhere')).toBeNull();
    expect(new Set(STATIONS.map((s) => s.id)).size).toBe(STATIONS.length);
  });

  it('reports a Thaicom satellite from Bangkok, and a satellite below the horizon as such', () => {
    const t8 = thaiOrbit(thaiSatelliteById('thaicom8')!, JD);
    const s = stateAt(t8, 0, false);
    expect(s.lon / DEG).toBeCloseTo(78.5, 6);
    const r = commsReport(defaultApps('comms'), s);
    expect(r.visible).toBe(true);
    expect(r.look.elevation / DEG).toBeGreaterThan(55);
    expect(r.hop * 1e3).toBeGreaterThan(238);
    expect(r.hop * 1e3).toBeLessThan(250);
    expect(r.leoHop * 1e3).toBeCloseTo(3.67, 2);
    // Thaicom from St Petersburg: 60° north, 48° of longitude away — low in the south
    const spb = commsReport({ ...defaultApps('comms'), station: stationOf('stPetersburg')! }, s);
    expect(spb.visible).toBe(true);
    expect(spb.look.elevation / DEG).toBeLessThan(15);
    // Thaicom 4 at 119.5° E is below St Petersburg's horizon
    const t4 = stateAt(thaiOrbit(thaiSatelliteById('thaicom4')!, JD), 0, false);
    expect(commsReport({ ...defaultApps('comms'), station: stationOf('stPetersburg')! }, t4).visible).toBe(false);
  });

  it('puts a Thai satellite\'s catalogue orbit in the playground', () => {
    const t2 = thaiOrbit(thaiSatelliteById('theos2')!, JD);
    const f = orbitFacts(t2, true);
    expect(f.perigeeAlt / 1e3).toBeCloseTo(623, 6);
    expect(f.apogeeAlt / 1e3).toBeCloseTo(625, 6);
    expect(f.sunSynchronous).toBe(true);
    const t4 = thaiOrbit(thaiSatelliteById('thaicom4')!, JD);
    expect(stateAt(t4, 0, false).lon / DEG).toBeCloseTo(119.5, 6);
    expect(Math.abs(stateAt(t4, 86400, false).lon / DEG - 119.5)).toBeLessThan(0.05);
  });
});

describe('Thailand\'s satellites, as published (O04)', () => {
  it('sources every entry, dates the catalogue, and keeps the facts consistent', () => {
    expect(THAI_SATELLITES_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Set(THAI_SATELLITES.map((s) => s.id)).size).toBe(THAI_SATELLITES.length);
    for (const s of THAI_SATELLITES) {
      expect(s.sources.length, s.id).toBeGreaterThan(0);
      for (const src of s.sources) expect(src.url, s.id).toMatch(/^https:\/\//);
      expect(s.sources.some((src) => src.url.includes('celestrak.org')), `${s.id} in the catalogue`).toBe(true);
      expect(s.launch.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.cospar.startsWith(s.launch.date.slice(0, 4)), s.id).toBe(true);
      if (s.orbit.kind === 'leo') expect(s.orbit.perigee).toBeLessThanOrEqual(s.orbit.apogee);
      for (const [name, dict] of Object.entries({ en, ru, th })) expect(dict[s.aboutKey], `${name} ${s.aboutKey}`).toBeTruthy();
    }
    expect(thaiSatelliteById('napa2')!.reentered).toBe('2026-07-05');
    expect(thaiSatelliteById('napa1')!.reentered).toBeUndefined();
    // the three geostationary slots Thaicom's satellites use
    expect(THAI_SATELLITES.filter((s) => s.orbit.kind === 'geo').map((s) => s.orbit.kind === 'geo' && s.orbit.longitude).sort()).toEqual([119.5, 120, 78.5, 78.5]);
    expect(geodeticToEcef({ lat: 0, lon: 0, h: 0 }).x).toBe(6_378_137);
  });
});
