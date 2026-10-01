/**
 * The satellite builder's templates (roadmap D06; Phase 4 map §2.5, track B):
 * src/data/satellite-templates.ts, held to where each figure comes from.
 *
 * Bounds, written here before this file's first run:
 * - the five catalogue templates take their class's mass, engine and size
 *   from `SATELLITES` EXACTLY (dry + propellant = mass; propellant =
 *   fraction × mass to 1e-9 kg), and `SATELLITES` itself does not change
 *   (tests/d06-satellites-identity.test.ts);
 * - their orbits are the presets' as `presetOrbit` places them: a, e, i and
 *   the node through `designOrbit` to 1e-9 relative, 1e-9 rad;
 * - NAPA-2's mass and edges are src/data/napa2.ts's exactly (GCAT, Janes),
 *   its orbit thai-satellites.ts's 520 × 540 km at 97.5°;
 * - THEOS-2's wet mass is eoPortal's 425 kg exactly, and labelled an
 *   estimate; its camera gives eoPortal's 0.5 m and 10.3 km from 621 km to
 *   the precision tests/applications.test.ts holds O04's example to
 *   (0.501 m, 3 decimals) and ±0.05 km on the swath (10.33 km computed);
 * - NAPA-2's camera gives the published 5 m from its mean 530 km within
 *   ±5 % (an estimate made to reproduce it, labelled one);
 * - every sourced default is the cores' own figure, exactly: the cell's
 *   29.5 %, SMAD's I_d, degradation, path efficiencies and battery
 *   efficiency (src/orbit/power.ts), the GEO depth of discharge, Palo's
 *   E_b/N₀ (src/orbit/link.ts REQUIRED_EBN0), TU Delft Fig. 11's apogee kick
 *   (the 1836.49 m/s A4 holds its budget to, to ±0.1);
 * - every power, attitude, radio and payload figure of every template is
 *   either sourced (a non-empty citation with a URL, or a path in this repo
 *   for the catalogue's classes and O04's example camera) or an estimate —
 *   no third state, and every source a template names is used by a field.
 */
import { describe, expect, it } from 'vitest';
import { SATELLITES } from '../src/data/satellites';
import { NAPA2 } from '../src/data/napa2';
import { thaiSatelliteById } from '../src/data/thai-satellites';
import { SATELLITE_TEMPLATES, SOURCE, THEOS2_CLASS_MASS, boxInertia, satelliteTemplateById } from '../src/data/satellite-templates';
import { SATELLITE_FIELDS, TEMPLATE_TEXT, designFromTemplate, fieldOrigin, presetDesignOrbit, valueAt } from '../src/design/satellite-model';
import { designOrbit } from '../src/design/satellite-handoff';
import { presetOrbit } from '../src/orbit/presets';
import { BATTERY_TO_LOAD_EFFICIENCY, CELL_DEGRADATION_PER_YEAR, DOD_GUIDANCE, INHERENT_DEGRADATION, PATH_EFFICIENCY } from '../src/orbit/power';
import { REQUIRED_EBN0 } from '../src/orbit/link';
import { groundSampleDistance, swathWidth } from '../src/orbit/applications';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';

const JD = 2461314.5; // 2026-10-01 00:00 UTC
const rel = (x: number, ref: number): number => Math.abs(x / ref - 1);

describe('the templates the builder starts from', () => {
  it('are the five classes of the map, NAPA-2 and a THEOS-2-class imager, and nothing the map excludes', () => {
    expect(SATELLITE_TEMPLATES.map((t) => t.id)).toEqual(['napa2', 'theos2', 'earthObs', 'comsat', 'weather', 'navigation', 'science']);
    for (const t of SATELLITE_TEMPLATES) expect(['cubesats', 'starlink', 'crew', 'sputnik1', 'vostok3ka', 'apollo']).not.toContain(t.derivedFrom);
    expect(satelliteTemplateById('cubesats')).toBeUndefined();
  });

  it('take a class\'s mass, engine and size from SATELLITES, never changing it', () => {
    for (const t of SATELLITE_TEMPLATES.filter((x) => x.derivedFrom)) {
      const c = SATELLITES.find((s) => s.id === t.derivedFrom)!;
      const d = t.design;
      expect(t.kind).toBe(c.kind);
      expect(t.typicalOrbit).toBe(c.typicalOrbit);
      expect(d.bus.size).toEqual(c.size);
      expect(d.bus.size).not.toBe(c.size);
      expect(Math.abs(d.bus.dryMass + d.propulsion!.propellant - c.mass)).toBeLessThan(1e-9);
      expect(Math.abs(d.propulsion!.propellant - c.mass * c.propulsion!.propellantFraction)).toBeLessThan(1e-9);
      expect(d.propulsion!.thrust).toBe(c.propulsion!.thrust);
      expect(d.propulsion!.isp).toBe(c.propulsion!.isp);
    }
  });

  it('place a class on its preset as presetOrbit does', () => {
    for (const t of SATELLITE_TEMPLATES.filter((x) => x.derivedFrom)) {
      const mine = designOrbit(presetDesignOrbit(t.typicalOrbit), JD), theirs = presetOrbit(t.typicalOrbit, JD);
      expect(rel(mine.a, theirs.a)).toBeLessThan(1e-9);
      expect(Math.abs(mine.e - theirs.e)).toBeLessThan(1e-12);
      expect(Math.abs(mine.i - theirs.i)).toBeLessThan(1e-9);
      expect(Math.abs(mine.raan - theirs.raan)).toBeLessThan(1e-9);
    }
  });

  it('give NAPA-2 its published mass, edges and orbit, and cells on its body so it adds no wings', () => {
    const t = satelliteTemplateById('napa2')!;
    expect(t.derivedFrom).toBeNull();
    expect(t.kind).toBe('science');
    expect(t.design.bus.dryMass).toBe(NAPA2.mass);
    expect([t.design.bus.size.width, t.design.bus.size.height, t.design.bus.size.depth]).toEqual([...NAPA2.size]);
    expect(t.design.propulsion).toBeNull();
    expect(t.design.power.mount).toBe('body');
    const flown = thaiSatelliteById('napa2')!.orbit;
    expect(flown.kind === 'leo' && [flown.perigee * 1e3, flown.apogee * 1e3, flown.inclination]).toEqual([t.orbit!.perigee, t.orbit!.apogee, t.orbit!.inclination]);
    // its camera: made to give the published 5 m from 530 km (an estimate, and labelled one)
    const cam = t.design.payload!;
    expect(rel(groundSampleDistance(530e3, cam.pixelPitch, cam.focalLength), thaiSatelliteById('napa2')!.imaging!.gsd)).toBeLessThan(0.05);
    const d = designFromTemplate('napa2', 'x', 'x');
    expect(fieldOrigin(d, 'payload.focalLength').kind).toBe('estimate');
    expect(fieldOrigin(d, 'bus.dryMass')).toEqual({ kind: 'sourced', source: SOURCE.napa2Mass });
  });

  it('give the THEOS-2 class eoPortal\'s 425 kg as an estimate, and O04\'s camera its 0.5 m and 10.3 km', () => {
    const t = satelliteTemplateById('theos2')!;
    expect(THEOS2_CLASS_MASS).toBe(425);
    expect(t.design.bus.dryMass + t.design.propulsion!.propellant).toBe(425);
    const d = designFromTemplate('theos2', 'x', 'x');
    expect(fieldOrigin(d, 'bus.dryMass')).toEqual({ kind: 'estimate', source: SOURCE.theos2 });
    expect(SOURCE.theos2).toContain('425 kg');
    expect(t.orbit).toMatchObject({ perigee: 621e3, apogee: 621e3, sso: true, ltan: 22.25 });
    expect(thaiSatelliteById('theos2')!.ltdn).toEqual([10, 10.5]);
    const cam = t.design.payload!;
    expect(groundSampleDistance(621e3, cam.pixelPitch, cam.focalLength)).toBeCloseTo(0.501, 3);
    const swath = swathWidth(621e3, 2 * Math.atan((cam.pixels * cam.pixelPitch) / (2 * cam.focalLength)))!;
    expect(Math.abs(swath / 1e3 - 10.33)).toBeLessThan(0.05);
    expect(t.design.comms.dataRate).toBe(140e6);
    expect(t.design.lifeYears).toBe(10);
  });

  it('take the cores\' own sourced defaults, exactly', () => {
    for (const t of SATELLITE_TEMPLATES) {
      const p = t.design.power;
      expect(p.cellEff).toBe(0.295);
      expect(SOURCE.cell).toContain('29.5 %');
      expect(p.Id).toBe(INHERENT_DEGRADATION);
      expect(p.degPerYear).toBe(CELL_DEGRADATION_PER_YEAR.multijunction);
      expect(p.batteryEff).toBe(BATTERY_TO_LOAD_EFFICIENCY);
      expect(PATH_EFFICIENCY[p.regulation]).toBeDefined();
      expect(t.design.comms.requiredEbN0).toBe(REQUIRED_EBN0.find((r) => r.id === 'oqpsk-conv')!.ebN0);
      if (t.typicalOrbit === 'geo') {
        expect(p.dod).toBe(DOD_GUIDANCE.geo);
        expect(Math.abs(t.design.propulsion!.insertionDv! - 1836.49)).toBeLessThan(0.1);
      }
    }
  });

  it('source or label as an estimate every figure of every template, with nothing left over', () => {
    const numbers = SATELLITE_FIELDS.map((f) => f.path);
    for (const t of SATELLITE_TEMPLATES) {
      const d = designFromTemplate(t.id, 'x', 'x');
      for (const path of numbers) {
        const v = valueAt(d, path);
        if (v === undefined) continue; // no engine, no camera, a node the orbit does not fix
        const o = fieldOrigin(d, path);
        expect(o.kind, `${t.id} ${path}`).not.toBe('yours');
        if (o.kind !== 'yours' && o.source !== undefined) {
          // a published source carries its address; the catalogue's class and O04's example name their file
          expect(o.source, `${t.id} ${path}`).toMatch(/https:\/\/|src\/(data|ui)\//);
        }
      }
      // every source named belongs to a field
      for (const path of Object.keys(t.sources)) expect(valueAt(d, path), `${t.id} ${path}`).not.toBeUndefined();
      for (const path of t.estimates ?? []) expect(t.sources[path], `${t.id} ${path}`).toBeDefined();
    }
  });

  it('size a class\'s inertia as a uniform box of its mass and edges (an estimate)', () => {
    expect(boxInertia(12, { width: 1, height: 2, depth: 3 })).toEqual([13, 10, 5]);
    const t = satelliteTemplateById('comsat')!;
    expect(t.design.adcs.inertia).toEqual(boxInertia(5500, t.design.bus.size));
    expect(fieldOrigin(designFromTemplate('comsat', 'x', 'x'), 'adcs.inertia.0').kind).toBe('estimate');
  });

  it('have a name and a description in all three languages', () => {
    for (const t of SATELLITE_TEMPLATES) {
      const text = TEMPLATE_TEXT[t.id];
      for (const dict of [en, ru, th] as Record<string, string>[]) {
        expect(dict[text.name], `${t.id} name`).toBeTruthy();
        expect(dict[text.about], `${t.id} about`).toBeTruthy();
      }
    }
  });
});
