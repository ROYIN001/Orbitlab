/**
 * A designed satellite flies in Launch (roadmap D06; Phase 4 map §2.6 c, the
 * owner's option B): src/design/satellite-launch.ts turns a `SatelliteDesign`
 * into the `SatelliteSpec` a mission carries inline, picks the Launch target
 * for its orbit, and makes the mission "Fly it" hands over.
 *
 * CRITERIA, fixed before the first run:
 * - the spec: every figure is the design's own, exactly (`toBe`/`toEqual`) —
 *   the wet mass, the engine's thrust and Isp and its propellant's share
 *   (to 1e-12 relative, a division), the edges, `dragArea`, C_D, C_R, the
 *   kind, the template's catalogue origin, the name as typed; and the spec's
 *   checker takes it for every template and for 300 designs drawn at random
 *   within the design's bounds whose C_D·A/m is inside `B_RANGE` (the checker
 *   refuses the rest, and says so);
 * - an electric engine (Isp above 480 s) and empty tanks fly with no engine
 *   of their own, the propellant still in the mass;
 * - the target: a template on an orbit preset targets that preset; NAPA-2's
 *   and THEOS-2's own orbits a custom target with their apsides,
 *   sun-synchronous at their node's local time; a node fixed by right
 *   ascension a fixed node; nothing else changed;
 * - ADDED IN REVIEW, fixed before its first run: the site (`designSite`) is
 *   one whose range-safety corridor reaches the target's plane, by the
 *   Launch section's own verdict (`inclinationCorridor`), whenever one of the
 *   vehicle's sites does — the one asked for when it does, else the
 *   vehicle's first that does (a sun-synchronous design on Soyuz-2.1a asked
 *   from Baikonur, the Launch section's default, flies from Plesetsk; on
 *   Falcon 9, from Vandenberg) — and the one asked for when none does (a
 *   geostationary 0° from the Cape);
 * - the document: version 3, and read back through the Launch section's own
 *   parser (`parseMissionDocument`) after a JSON round trip it gives the same
 *   mission, exactly, with no issue;
 * - the flights, headless, point mass (the Launch section's default for a
 *   designed satellite): a designed NAPA-2 on Electron from Mahia and a
 *   THEOS-2-class design on Vega-C from Kourou (the launchers of their
 *   kinds: THEOS-2 flew on Vega VV23) reach orbit and separate the satellite;
 *   after separation the flight's mass is the design's wet mass (to 1e-6 kg);
 *   the orbit is the design's within 30 km in each apsis (the Explore journey's
 *   bound for a 500 km orbit, tests/browser/journeys/launch-explore.mjs) and
 *   0.3° in inclination (ADDED IN REVIEW, and in the node: the design's
 *   right ascension moved by the equation of time, since the Launch section
 *   aims a local time at the true Sun, `raanFromLtan`, and the design at the
 *   mean Sun, `raanForLocalTime` — the same 0.3°, written after NAPA-2's
 *   0.15° residual had been seen in review and before THEOS-2's was run);
 *   the flight carries the spec (its configuration, its
 *   payload's size in the frames, `satId` in the separation event) and the
 *   mission it records (`flownMission`) is version 3 with the spec in it.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { FlightRecorder } from '../src/replay/recorder';
import { DEG } from '../src/physics/constants';
import { sunRightAscension, wrapPi } from '../src/physics/orbital';
import { meanSunRightAscension } from '../src/orbit/kepler';
import { SATELLITE_TEMPLATES } from '../src/data/satellite-templates';
import { ORBIT_PRESETS } from '../src/data/orbits';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { siteById } from '../src/data/sites';
import { inclinationCorridor, resolveInclination } from '../src/physics/mission';
import { isCatalogueSatellite } from '../src/data/satellites';
import { satelliteDesignProblems } from '../src/config/satellite-design';
import { MISSION_FORMAT_VERSION, parseMissionDocument } from '../src/config/mission-file';
import { validateConfigInput } from '../src/config/validation';
import { defaultMissionState, missionConfigFromState } from '../src/lessons/config';
import { flownMission } from '../src/lessons/progress';
import { designFromTemplate, SATELLITE_FIELDS, withValue, withChoice } from '../src/design/satellite-model';
import { ballisticProblem, dragArea, wetMass } from '../src/design/satellite-area';
import { designOrbit } from '../src/design/satellite-handoff';
import {
  designLaunch, designMission, designMissionDocument, designMissionIssues, designSite, designTargetOrbit, launchSpecId, satelliteSpecFromDesign,
} from '../src/design/satellite-launch';
import type { SatelliteDesign } from '../src/design/satellite-spec';
import { ballisticDigits } from '../src/ui/build/satellite-text';

const FROM = new Date(Date.UTC(2026, 9, 1, 12));
const rel = (a: number, b: number): number => Math.abs(a - b) / Math.abs(b);

describe('a design as the satellite a mission carries (D06, integration)', () => {
  it('is the design\'s own, figure for figure, for every template, and the spec\'s checker takes it', () => {
    for (const tpl of SATELLITE_TEMPLATES) {
      const d = designFromTemplate(tpl.id, `s-${tpl.id}`, `  My ${tpl.id}  `);
      const { spec, engine, problems } = designLaunch(d);
      expect({ id: tpl.id, problems }).toEqual({ id: tpl.id, problems: [] });
      expect(spec.id).toBe(`s-${tpl.id}`);
      expect(spec.name).toBe(`My ${tpl.id}`);
      expect(spec.kind).toBe(d.kind);
      expect(spec.mass).toBe(wetMass(d));
      expect(spec.mass).toBe(d.bus.dryMass + (d.propulsion?.propellant ?? 0));
      expect(spec.size).toEqual(d.bus.size);
      expect(spec.crossSection).toBe('box');
      expect(spec.area).toBe(dragArea(d));
      expect(spec.cd).toBe(d.bus.cd);
      expect(spec.cr).toBe(d.bus.cr);
      expect(spec.crewed).toBeUndefined();
      // the catalogue class it was drawn from; the Thai templates have none
      expect(spec.derivedFrom).toBe(tpl.derivedFrom ?? undefined);
      if (d.propulsion) {
        expect(engine).toBe('own');
        expect(spec.propulsion!.thrust).toBe(d.propulsion.thrust);
        expect(spec.propulsion!.isp).toBe(d.propulsion.isp);
        expect(rel(spec.propulsion!.propellantFraction * spec.mass, d.propulsion.propellant)).toBeLessThanOrEqual(1e-12);
      } else {
        expect(engine).toBe('none');
        expect(spec.propulsion).toBeUndefined();
      }
      expect(satelliteSpecFromDesign(d)).toEqual(spec);
    }
  });

  it('flies an electric engine and empty tanks with no engine of its own, the propellant still in its mass', () => {
    const d = designFromTemplate('theos2', 's-ion', 'Ion');
    const ion = withValue(d, 'propulsion.isp', 3000);
    expect(satelliteDesignProblems(ion)).toEqual([]);
    const launch = designLaunch(ion);
    expect(launch.engine).toBe('electric');
    expect(launch.spec.propulsion).toBeUndefined();
    expect(launch.spec.mass).toBe(425);
    expect(launch.problems).toEqual([]);
    // at the chemical bound it is still its own engine
    expect(designLaunch(withValue(d, 'propulsion.isp', 480)).engine).toBe('own');
    const empty = designLaunch(withValue(d, 'propulsion.propellant', 0));
    expect(empty.engine).toBe('empty');
    expect(empty.spec.propulsion).toBeUndefined();
    expect(empty.spec.mass).toBe(385);
  });

  it('takes the design\'s id where a spec can have it, and makes one where it cannot', () => {
    expect(launchSpecId({ id: 'smb3k9xyz' })).toBe('smb3k9xyz');
    for (const id of ['comsat', 'crew', 'My satellite!', 'x'.repeat(41), 'ด']) {
      const made = launchSpecId({ id });
      expect(made).toMatch(/^design-[0-9a-z]+$/);
      expect(isCatalogueSatellite(made)).toBe(false);
      expect(launchSpecId({ id })).toBe(made);
    }
    expect(launchSpecId({ id: 'comsat' })).not.toBe(launchSpecId({ id: 'crew' }));
  });

  it('passes the spec\'s checker for random sound designs inside B_RANGE, and refuses the rest by their C_D·A/m', () => {
    let seed = 20260930;
    const next = (): number => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
    const numbers = SATELLITE_FIELDS.filter((f) => /^(bus\.|propulsion\.|power\.arrayArea)/.test(f.path));
    let flown = 0, refused = 0;
    for (let k = 0; k < 300; k++) {
      const tpl = SATELLITE_TEMPLATES[k % SATELLITE_TEMPLATES.length];
      let d: SatelliteDesign = designFromTemplate(tpl.id, `r${k}`, `Random ${k}`);
      for (const f of numbers) {
        if (next() < 0.5 || (f.group === 'propulsion' && !d.propulsion)) continue;
        // log-uniform between the field's bounds (a floor of 0 drawn from 1e-3 up)
        const lo = Math.max(f.min, 1e-3), v = lo * (f.max / lo) ** next();
        d = withValue(d, f.path, f.integer ? Math.round(v) : v);
      }
      if (next() < 0.3) d = withChoice(d, 'mount', ['tracking', 'body', 'spinner'][Math.floor(next() * 3)]);
      if (satelliteDesignProblems(d).length) continue;
      const { spec, problems } = designLaunch(d);
      if (ballisticProblem((spec.cd! * spec.area!) / spec.mass) === null) {
        expect({ k, problems }).toEqual({ k, problems: [] });
        flown++;
      } else {
        expect(problems.map((p) => p.path)).toEqual(['area']);
        refused++;
      }
    }
    // the draw reaches both sides
    expect(flown).toBeGreaterThan(50);
    expect(refused).toBeGreaterThan(5);
  });
});

describe('the C_D·A/m Fly it gives when it holds a design back (added in review)', () => {
  it('keeps three figures below 0.001 m²/kg, so a dense design\'s does not read as the 0.0001 it is held to', () => {
    expect(ballisticDigits(0.0134)).toBe(4);
    expect(ballisticDigits(1.009)).toBe(4);
    expect(ballisticDigits(1e-3)).toBe(4);
    expect(ballisticDigits(9.99e-4)).toBe(6);
    expect(ballisticDigits(4.1e-5)).toBe(7);
    expect((4.1e-5).toFixed(ballisticDigits(4.1e-5))).toBe('0.0000410');
    expect(ballisticDigits(1e-12)).toBe(10);
  });
});

describe('the Launch target for the design\'s orbit (D06, integration)', () => {
  it('is the orbit preset a template starts on, and a custom target for NAPA-2\'s and THEOS-2\'s own', () => {
    const target = (id: string) => designTargetOrbit(designFromTemplate(id, 'x', 'x'));
    expect(target('earthObs')).toEqual({ orbitId: 'sso', orbit: ORBIT_PRESETS.find((o) => o.id === 'sso') });
    expect(target('comsat').orbitId).toBe('geo');
    expect(target('weather').orbitId).toBe('geo');
    expect(target('navigation').orbitId).toBe('glonass');
    expect(target('science').orbitId).toBe('polar');
    expect(target('napa2')).toEqual({
      orbitId: 'custom',
      orbit: { ...ORBIT_PRESETS.find((o) => o.id === 'custom'), perigee: 520e3, apogee: 540e3, inclination: 'sso', argPerigee: 0, raanMode: 'ltan', ltan: 22.5 },
    });
    expect(target('theos2').orbit).toMatchObject({ perigee: 621e3, apogee: 621e3, inclination: 'sso', raanMode: 'ltan', ltan: 22.25 });
  });

  it('leaves a preset for a custom target as soon as the orbit differs, and fixes the node only where the design does', () => {
    const d = designFromTemplate('earthObs', 'x', 'x');
    expect(designTargetOrbit(withValue(d, 'orbit.ltan', 11)).orbit).toMatchObject({ raanMode: 'ltan', ltan: 11, inclination: 'sso' });
    expect(designTargetOrbit(withValue(d, 'orbit.perigee', 599e3)).orbitId).toBe('custom');
    const polar = designFromTemplate('science', 'x', 'x');
    expect(designTargetOrbit(withValue(polar, 'orbit.inclination', 89)).orbit).toMatchObject({ inclination: 89, raanMode: 'free', argPerigee: 0 });
    const fixed = designTargetOrbit(withValue(polar, 'orbit.raan', 40));
    expect(fixed.orbitId).toBe('custom');
    expect(fixed.orbit).toMatchObject({ inclination: 90, raanMode: 'fixed', raan: 40 });
    expect(fixed.orbit.ltan).toBeUndefined();
    // a Molniya's apsides are not the Molniya preset: that one puts its perigee at 270°, a design on the node
    const molniya = { ...polar, orbit: { perigee: 600e3, apogee: 39_750e3, inclination: 63.4, sso: false } };
    expect(designTargetOrbit(molniya).orbitId).toBe('custom');
    // nor the launch site's own LEO, whose inclination is the site's
    const leo = { ...polar, orbit: { perigee: 500e3, apogee: 500e3, inclination: 28.5, sso: false } };
    expect(designTargetOrbit(leo)).toMatchObject({ orbitId: 'custom', orbit: { inclination: 28.5 } });
  });
});

describe('the site a design flies from (D06, integration; added in review)', () => {
  const reaches = (design: SatelliteDesign, id: string): boolean => {
    const site = siteById(id);
    return inclinationCorridor(site, resolveInclination(designTargetOrbit(design).orbit, site)) === 'ok';
  };

  it('is one whose corridor reaches the plane: Plesetsk for NAPA-2 on Soyuz asked from Baikonur, Vandenberg on Falcon 9', () => {
    const napa = designFromTemplate('napa2', 'x', 'x');
    expect(designSite(napa, { vehicle: vehicleById('soyuz21a'), siteId: 'baikonur' })).toBe('plesetsk');
    expect(designSite(napa, { vehicle: vehicleById('falcon9') })).toBe('vandenberg');
    expect(designSite(napa, { vehicle: vehicleById('electron'), siteId: 'mahia' })).toBe('mahia');
    expect(designSite(designFromTemplate('theos2', 'x', 'x'), { vehicle: vehicleById('vegac') })).toBe('kourou');
    // a geostationary 0° no site reaches as it is: the one asked for
    expect(designSite(designFromTemplate('comsat', 'x', 'x'), { vehicle: vehicleById('falcon9'), siteId: 'ksc39a' })).toBe('ksc39a');
    expect(designMission(napa, { vehicle: vehicleById('soyuz21a'), siteId: 'baikonur', from: FROM }).siteId).toBe('plesetsk');
  });

  it('keeps the site asked for when it reaches the plane, and reaches it whenever one of the vehicle\'s sites does, for every template and vehicle', () => {
    for (const tpl of SATELLITE_TEMPLATES) {
      const d = designFromTemplate(tpl.id, 'x', 'x');
      for (const vehicle of VEHICLES) {
        const any = vehicle.sites.some((id) => reaches(d, id));
        for (const asked of [undefined, ...vehicle.sites]) {
          const got = designSite(d, { vehicle, siteId: asked });
          const where = `${tpl.id} on ${vehicle.id} asked ${asked}`;
          expect(vehicle.sites, where).toContain(got);
          if (asked !== undefined && reaches(d, asked)) expect(got, where).toBe(asked);
          else if (any) expect(reaches(d, got), where).toBe(true);
          else expect(got, where).toBe(asked ?? vehicle.sites[0]);
        }
      }
    }
  });
});

interface Flown {
  design: SatelliteDesign;
  vehicle: string;
  site: string;
}

/**
 * Fly the design's mission headless through the recorder (the animation
 * loop's path) to its end — the Launch section ends a flight to orbit at the
 * satellite's separation — and bring the recording level with the
 * simulation, which a point-mass flight runs up to a step ahead of (E1).
 */
function flyDesign({ design, vehicle, site }: Flown) {
  const flight = { vehicle: vehicleById(vehicle), siteId: site, from: FROM };
  expect(designMissionIssues(design, flight)).toEqual([]);
  const state = designMission(design, flight);
  const doc = designMissionDocument(design, flight);
  const parsed = parseMissionDocument(JSON.parse(JSON.stringify(doc)), defaultMissionState());
  const cfg = missionConfigFromState(parsed.state);
  const sim = new Simulation(cfg, { headless: true });
  const rec = new FlightRecorder();
  rec.start(sim);
  let guard = 0;
  while (!sim.done && sim.state.t < 4 * 3600 && guard++ < 200_000) rec.advance(5, 1e9);
  if (rec.clock < sim.state.t) rec.advance(sim.state.t - rec.clock, 1e9);
  const sepAt = sim.events.find((e) => e.key === 'evt.payloadSep')?.t ?? Infinity;
  return { state, doc, parsed, cfg, sim, rec, sepAt };
}

describe('a designed satellite flown in Launch (D06, integration)', () => {
  const cases: Flown[] = [
    { design: designFromTemplate('napa2', 'napa2-design', 'NAPA-2 (ours)'), vehicle: 'electron', site: 'mahia' },
    { design: designFromTemplate('theos2', 'theos2-design', 'THEOS-2 class'), vehicle: 'vegac', site: 'kourou' },
  ];
  for (const c of cases) {
    it(`flies ${c.design.name} on ${c.vehicle} to its orbit with its own mass, and the flight carries its spec`, () => {
      const { state, doc, parsed, cfg, sim, rec, sepAt } = flyDesign(c);
      const spec = satelliteSpecFromDesign(c.design);
      expect(state.siteId).toBe(c.site);
      // the document: version 3, read back equal by the Launch section's own parser
      expect(doc.version).toBe(MISSION_FORMAT_VERSION);
      expect(doc.version).toBe(3);
      expect(doc.mission.satelliteSpec).toEqual(spec);
      expect(parsed.usable).toBe(true);
      expect(parsed.issues).toEqual([]);
      expect(parsed.state).toEqual(state);
      expect(validateConfigInput(parsed.state)).toEqual([]);
      // the flight
      expect(cfg.satelliteSpec).toEqual(spec);
      expect(sim.satellite).toEqual(spec);
      expect(sim.state.status).not.toBe('failed');
      expect(Number.isFinite(sepAt)).toBe(true);
      const sep = sim.events.find((e) => e.key === 'evt.payloadSep')!;
      expect(sep.params).toMatchObject({ name: spec.name, satId: spec.id });
      const last = rec.frames[rec.frames.length - 1];
      expect(last.t).toBeGreaterThanOrEqual(sepAt);
      expect(last.payloadSeparated).toBe(true);
      expect(sim.state.status).toBe('orbit');
      expect(Math.abs(last.mass - wetMass(c.design))).toBeLessThanOrEqual(1e-6);
      expect(rec.frames[0].payloadHeight).toBe(c.design.bus.size.height);
      const want = designOrbit(c.design.orbit, cfg.launchTime.getTime() / 86400e3 + 2440587.5);
      const got = last.elements;
      expect(Math.abs(got.periapsisAlt - c.design.orbit.perigee) / 1e3).toBeLessThanOrEqual(30);
      expect(Math.abs(got.apoapsisAlt - c.design.orbit.apogee) / 1e3).toBeLessThanOrEqual(30);
      expect(Math.abs(got.i - want.i) / DEG).toBeLessThanOrEqual(0.3);
      // the node: the design's, moved by the equation of time (Launch aims its local time at the true Sun, the design at the mean Sun)
      const jd = cfg.launchTime.getTime() / 86400e3 + 2440587.5;
      const node = want.raan - (meanSunRightAscension(jd) - sunRightAscension(jd));
      expect(Math.abs(wrapPi(got.raan - node)) / DEG).toBeLessThanOrEqual(0.3);
      // the mission the flight records: version 3, the spec in it
      const flown = flownMission(sim.cfg);
      expect(flown.version).toBe(3);
      expect(flown.mission.satelliteSpec).toEqual(spec);
      expect(flown.mission.satelliteId).toBe(spec.id);
      expect(flown.mission.payloadMass).toBe(spec.mass);
    }, 240_000);
  }
});
