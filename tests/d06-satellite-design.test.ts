/**
 * The designed satellite's checker (roadmap D06; Phase 4 map §2.3, track B):
 * src/config/satellite-design.ts. What a design file, the store or a mission
 * file may hold, held to plausibility bounds, each problem named by its path.
 * No reference to validate against: the bounds are the file's own, and the
 * checks are exact (a design is sound, or it is refused by name).
 */
import { describe, expect, it } from 'vitest';
import {
  SATELLITE_DESIGN_KINDS, SATELLITE_LIMITS, isSatelliteDesign, satelliteDesignProblems, satelliteDesignText,
} from '../src/config/satellite-design';
import { SATELLITE_TEMPLATES } from '../src/data/satellite-templates';
import { designFromTemplate, designHandoff } from '../src/design/satellite-model';
import type { SatelliteDesign } from '../src/design/satellite-spec';
import { STATIONS } from '../src/orbit/applications-setup';

const base = (): SatelliteDesign => designFromTemplate('theos2', 'sat-1', 'Test');
const paths = (raw: unknown): string[] => satelliteDesignProblems(raw).map((i) => i.path);
const edit = (fn: (d: Record<string, any>) => void): unknown => { const d = structuredClone(base()) as Record<string, any>; fn(d); return d; };

describe('the satellite checker', () => {
  it('takes every template as it starts', () => {
    for (const t of SATELLITE_TEMPLATES) {
      const d = designFromTemplate(t.id, `id-${t.id}`, t.id);
      expect({ id: t.id, issues: satelliteDesignProblems(d) }).toEqual({ id: t.id, issues: [] });
      expect(isSatelliteDesign(d)).toBe(true);
    }
  });

  it('refuses what is not a design at all', () => {
    for (const raw of [null, 42, 'a satellite', [], undefined]) expect(paths(raw)).toEqual(['']);
    expect(satelliteDesignText(satelliteDesignProblems(null))).toBe('the satellite must be a satellite design (got null)');
  });

  it('names every field it needs, by its path', () => {
    const p = paths({});
    for (const k of ['id', 'name', 'template', 'kind', 'orbit', 'lifeYears', 'bus', 'power', 'propulsion', 'adcs', 'comms', 'payload']) expect(p).toContain(k);
  });

  it('refuses NaN, Infinity and text where a number goes, naming the field', () => {
    expect(paths(edit((d) => { d.power.arrayArea = Number.NaN; }))).toEqual(['power.arrayArea']);
    expect(paths(edit((d) => { d.orbit.perigee = Infinity; }))).toEqual(['orbit.perigee']);
    expect(paths(edit((d) => { d.comms.frequency = '8.2 GHz'; }))).toEqual(['comms.frequency']);
    expect(paths(edit((d) => { d.adcs.inertia = [1, 2]; }))).toEqual(['adcs.inertia']);
    expect(paths(edit((d) => { d.adcs.inertia[2] = -1; }))).toEqual(['adcs.inertia.2']);
  });

  it('holds each number to its bounds, both ends, and catches the unit slips they are there for', () => {
    // a cell efficiency typed as a percentage, a frequency in GHz, a perigee in km, a pitch in µm
    expect(paths(edit((d) => { d.power.cellEff = 29.5; }))).toEqual(['power.cellEff']);
    expect(paths(edit((d) => { d.comms.frequency = 8.2; }))).toEqual(['comms.frequency']);
    expect(paths(edit((d) => { d.orbit.perigee = 621; d.orbit.apogee = 621; }))).toEqual(['orbit.perigee', 'orbit.apogee']);
    expect(paths(edit((d) => { d.payload.pixelPitch = 13; }))).toEqual(['payload.pixelPitch']);
    const L = SATELLITE_LIMITS;
    expect(paths(edit((d) => { d.power.dod = L.dod[0]; d.power.batteryEff = L.batteryEff[1]; }))).toEqual([]);
    expect(paths(edit((d) => { d.power.dod = L.dod[0] * 0.99; }))).toEqual(['power.dod']);
    expect(paths(edit((d) => { d.power.batteryEff = 1.045; }))).toEqual(['power.batteryEff']);
    // the hand-off's floor, exclusive as the hand-off's is: a perigee at 100 km is refused by name (the hand-off would
    // refuse it without a reason), one a millimetre above is taken and handed on, below it is refused
    expect(satelliteDesignProblems(edit((d) => { d.orbit.perigee = 100e3; }))).toEqual([{ path: 'orbit.perigee', message: 'must be above 100000 (got 100000)' }]);
    expect(designHandoff({ ...base(), orbit: { ...base().orbit, perigee: 100e3 } }, 2461314.5, 'x')).toBeNull();
    const floor = edit((d) => { d.orbit.perigee = 100e3 + 1e-3; }) as SatelliteDesign;
    expect(paths(floor)).toEqual([]);
    expect(designHandoff(floor, 2461314.5, 'x')).not.toBeNull();
    expect(paths(edit((d) => { d.orbit.perigee = 99e3; }))).toEqual(['orbit.perigee']);
  });

  it('refuses an apogee below the perigee', () => {
    expect(paths(edit((d) => { d.orbit.apogee = d.orbit.perigee - 1; }))).toEqual(['orbit.apogee']);
  });

  it('takes only the kinds, stations, mounts, regulators and modes there are', () => {
    expect(SATELLITE_DESIGN_KINDS).toEqual(['comsat', 'earthObs', 'weather', 'navigation', 'science', 'cubesats', 'starlink', 'crew',
      'crewDragon', 'ps1', 'vostok', 'mercury', 'apollo']);
    expect(paths(edit((d) => { d.kind = 'rocket'; }))).toEqual(['kind']);
    expect(paths(edit((d) => { d.kind = 'toString'; }))).toEqual(['kind']);
    expect(paths(edit((d) => { d.comms.station = 'mars'; }))).toEqual(['comms.station']);
    for (const s of STATIONS) expect(paths(edit((d) => { d.comms.station = s.id; }))).toEqual([]);
    expect(paths(edit((d) => { d.power.mount = 'toString'; }))).toEqual(['power.mount']);
    expect(paths(edit((d) => { d.power.regulation = 'MPPT'; }))).toEqual(['power.regulation']);
    expect(paths(edit((d) => { d.adcs.mode = 'magnetic'; }))).toEqual(['adcs.mode']);
  });

  it('takes a satellite with no engine and no camera, and refuses anything else there', () => {
    expect(paths(edit((d) => { d.propulsion = null; d.payload = null; }))).toEqual([]);
    expect(paths(edit((d) => { d.propulsion = 'none'; }))).toEqual(['propulsion']);
    expect(paths(edit((d) => { delete d.payload; }))).toEqual(['payload']);
  });

  it('reports a field this version does not know, anywhere', () => {
    expect(paths(edit((d) => { d.colour = 'gold'; }))).toEqual(['colour']);
    expect(paths(edit((d) => { d.power.solarWings = 2; }))).toEqual(['power.solarWings']);
    expect(paths(edit((d) => { d.bus.size.length = 2; }))).toEqual(['bus.size.length']);
  });

  it('takes the optional fields absent, and holds them to bounds when present', () => {
    expect(paths(edit((d) => { delete d.orbit.ltan; delete d.comms.rxAntennaD; delete d.comms.rxNoiseK; delete d.comms.losses; delete d.propulsion.insertionDv; }))).toEqual([]);
    expect(paths(edit((d) => { d.orbit.ltan = 25; }))).toEqual(['orbit.ltan']);
    expect(paths(edit((d) => { d.comms.losses = -1; }))).toEqual(['comms.losses']);
  });

  it('keeps the tanks within what the planner flies', () => {
    expect(paths(edit((d) => { d.bus.dryMass = 15_000; d.propulsion.propellant = 10_000; }))).toEqual(['propulsion.propellant']);
  });

  it('wants whole pixels and bits, and texts where texts go', () => {
    expect(paths(edit((d) => { d.payload.pixels = 20_600.5; }))).toEqual(['payload.pixels']);
    expect(paths(edit((d) => { d.name = '   '; }))).toEqual(['name']);
    expect(paths(edit((d) => { d.sources = ['ok', 5]; }))).toEqual(['sources[1]']);
  });

  it('says every problem in one line for a caller', () => {
    const text = satelliteDesignText(satelliteDesignProblems(edit((d) => { d.power.cellEff = 29.5; d.comms.station = 'mars'; })));
    expect(text).toBe('power.cellEff must be at most 0.5 (got 29.5); comms.station must be one of "bangkok", "chiangMai", "hatYai", "ubon", "stPetersburg", "moscow" (got "mars")');
  });
});
