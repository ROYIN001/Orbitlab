/**
 * The satellite builder's model (roadmap D06; Phase 4 map §2.3, track B):
 * src/design/satellite-model.ts, and the air it reads (src/orbit/satellite-air.ts).
 *
 * WHAT IS HELD, AND HOW TIGHT — every bound below was written here before
 * this file's first run:
 *
 * 1. ONE NUMBER, ONE WAY (map §2.3). Every figure `designFigures` returns is
 *    the core's own answer for the design's inputs: each is recomputed here
 *    by calling that core (src/orbit/eclipse.ts, power.ts, disposal.ts,
 *    attitude.ts, link.ts, imaging.ts; src/design/satellite-area.ts) and
 *    must be IDENTICAL (`toBe`), not merely close — a figure that differs in
 *    the last bit was worked out another way.
 * 2. PUBLISHED FIGURES, through the model (the cores hold them already; here
 *    the model must read the right altitude, date and design):
 *    - the comsat template at GEO: SMAD's maximum eclipse 69.41 min at β = 0
 *      (TU Delft reader App. H, p. 274), ±0.01 min (V-E1's bound);
 *    - THEOS-2's 0.5 m and 10.3 km (eoPortal) from 621 km: 0.501 m to 3
 *      decimals (tests/applications.test.ts's bound for O04's example) and
 *      ±0.05 km;
 *    - NAPA-2's B = 0.0134 m²/kg ± 0.00005 (docs/VALIDATION.md §7);
 *    - the comsat against TU Delft Fig. 11 (map §2.2 C): its tanks cover the
 *      apogee kick (available > 1836.49 m/s) but not fifteen years in the box
 *      (margin below zero, and above −(682.0 + 19.9 + 10.88) m/s, the rest of
 *      Fig. 11's budget), and the builder says so.
 * 3. THE AIR (src/orbit/satellite-air.ts): the perigee density is
 *    `airDensity` itself at the perigee's position, identical; it rises from
 *    ECSS low to moderate to high; the default level is moderate.
 * 4. THE HAND-OFF: `designHandoff` reads back through `parseHandoff`, and the
 *    lifetime dialog's spacecraft (`lifetimeSpacecraft`) is the design's wet
 *    mass, drag area, C_D and C_R, exactly (the Chromium check sees the same).
 * 5. THE DRAFT a browser keeps round-trips exactly, an empty box (NaN) comes
 *    back NaN, and anything else is refused whole.
 */
import { describe, expect, it } from 'vitest';
import {
  DIFFRACTION_WAVELENGTH, GEO_EWSK_PER_YEAR, GEO_INCLINATION_DRIFT, GG_SIZING_ANGLE, OFF_NADIR_ANGLE, RX_DISH_EFFICIENCY,
  SATELLITE_FIELDS, SUNLIT_REFLECTANCE, TX_DISH_EFFICIENCY, beamwidthOf, designFigures, designFromTemplate, designHandoff, estimateTexts,
  fieldOrigin, keptSatelliteText, orbitRegion, problemTexts, restoreKeptSatellite, satelliteChecks, ssoInclinationDeg, valueAt, withCamera,
  withChoice, withEngine, withSso, withValue, worstEclipseOf,
} from '../src/design/satellite-model';
import { satelliteDesignProblems } from '../src/config/satellite-design';
import { SATELLITE_TEMPLATES } from '../src/data/satellite-templates';
import { designOrbit } from '../src/design/satellite-handoff';
import { ballisticCoefficient, dragArea, wetMass } from '../src/design/satellite-area';
import { orbitFacts, stateAt } from '../src/orbit/kepler';
import { betaAngle, eclipseDuration, sampledEclipse, worstEclipse } from '../src/orbit/eclipse';
import { PATH_EFFICIENCY, SOLAR_FLUX_1AU, WORST_SUN_ANGLE, arrayArea, arrayPowerRequired, batteryCapacity, cyclesPerYear } from '../src/orbit/power';
import { dvAllocation, dragMakeupPerYear, graveyardRaise, nsskPerYear, perigeeLowerDv, propellantFor } from '../src/orbit/disposal';
import { aeroTorque, dipoleField, gravityGradientTorque, magneticTorque, pointingLoss, solarTorque, wheelMomentumCyclic } from '../src/orbit/attitude';
import { LINK_MARGIN_THRESHOLD, designControlTable, eirp, maxDataRate, maxPassDuration, slantRange } from '../src/orbit/link';
import { diffractionGsd, imagingDataRate, offNadirGsd } from '../src/orbit/imaging';
import { dishGain, footprintAngle, groundSampleDistance, swathWidth } from '../src/orbit/applications';
import { DEFAULT_ACTIVITY_LEVEL, DESIGN_ACTIVITY_LEVELS, levelActivity, perigeeDensity } from '../src/orbit/satellite-air';
import { lifetimeSpacecraft, parseHandoff } from '../src/orbit/handoff';
import { airDensity } from '../src/physics/propagator/density';
import { ECSS_LEVELS } from '../src/physics/propagator/activity';
import { DEG, R_EARTH } from '../src/physics/constants';

const JD = 2461314.5; // 2026-10-01 00:00 UTC

describe('the air a design is read in', () => {
  it('is NRLMSISE-00 at the perigee, at a fixed ECSS level, moderate unless asked', () => {
    const o = designOrbit(designFromTemplate('theos2', 'x', 'x').orbit, JD);
    const { r } = stateAt(o, 0, true);
    for (const level of DESIGN_ACTIVITY_LEVELS) expect(perigeeDensity(o, level)).toBe(airDensity([r.x, r.y, r.z], JD, ECSS_LEVELS[level]));
    expect(perigeeDensity(o, 'low')).toBeLessThan(perigeeDensity(o, 'moderate'));
    expect(perigeeDensity(o, 'moderate')).toBeLessThan(perigeeDensity(o, 'high'));
    expect(DEFAULT_ACTIVITY_LEVEL).toBe('moderate');
    expect(DESIGN_ACTIVITY_LEVELS).toEqual(['low', 'moderate', 'high']);
    expect(levelActivity('high')).toBe(ECSS_LEVELS.high);
    expect(() => levelActivity('measured' as 'low')).toThrow(RangeError);
  });
});

describe('every figure is the core\'s own (one number, one way)', () => {
  for (const tpl of SATELLITE_TEMPLATES) {
    it(`${tpl.id}`, () => {
      const d = designFromTemplate(tpl.id, 'x', 'x');
      const fig = designFigures(d, JD);
      const o = designOrbit(d.orbit, JD);
      const facts = orbitFacts(o, true);
      const P = facts.nodalPeriod, hP = facts.perigeeAlt, hA = facts.apogeeAlt;
      expect(fig.orbit.perigee.value).toBe(hP);
      expect(fig.orbit.nodalPeriod).toEqual({ value: P, unit: 's' });
      expect(fig.orbit.region).toBe(orbitRegion(hP, hA, o.i));
      // eclipse
      expect(fig.eclipse.beta.value).toBe(betaAngle(o, JD, true));
      expect(fig.eclipse.now.value).toBe(sampledEclipse(o, JD, P / 360).duration);
      const worst = worstEclipse(o, JD, 365);
      expect(fig.eclipse.worst.value).toBe(worst.duration);
      expect(fig.eclipse.worstBeta.value).toBe(worst.beta);
      expect(fig.eclipse.cyclesPerYear.value).toBe(worst.duration > 0 ? cyclesPerYear(P) : 0);
      if (fig.eclipse.atBetaZero) expect(fig.eclipse.atBetaZero.value).toBe(eclipseDuration(o.a - R_EARTH, 0));
      // power
      const pw = d.power, load = pw.payloadW + pw.busW, Te = worst.duration;
      const { Xd, Xe } = PATH_EFFICIENCY[pw.regulation];
      const req = arrayPowerRequired({ dayLoad: load, eclipseLoad: load, Td: P - Te, Te, Xd, Xe });
      expect(fig.power.required.value).toBe(req);
      const sized = arrayArea({ Psa: req, flux: SOLAR_FLUX_1AU, cellEff: pw.cellEff, Id: pw.Id, sunAngle: pw.mount === 'tracking' ? 0 : WORST_SUN_ANGLE,
        degPerYear: pw.degPerYear, years: d.lifeYears, mount: pw.mount });
      expect(fig.power.areaNeeded.value).toBe(sized.area);
      expect(fig.power.pEol.value).toBe(sized.pEol);
      expect(fig.power.margin!.value).toBe(pw.arrayArea / sized.area - 1);
      expect(fig.power.batteryNeeded.value).toBe(batteryCapacity({ eclipseLoad: load, Te, dod: pw.dod, eff: pw.batteryEff }));
      expect(fig.power.depth.value).toBe(batteryCapacity({ eclipseLoad: load, Te, dod: 1, eff: pw.batteryEff }) / (pw.batteryWh * 3600));
      // mass and drag
      expect(fig.mass.wet.value).toBe(wetMass(d));
      expect(fig.drag.area.value).toBe(dragArea(d));
      expect(fig.drag.ballistic.value).toBe(ballisticCoefficient(d));
      // Δv
      const p = d.propulsion, sc = { mass: wetMass(d), area: dragArea(d), cd: d.bus.cd, cr: d.bus.cr };
      const geo = fig.orbit.region === 'geo';
      const makeup = p && !geo ? dragMakeupPerYear(o, sc, ECSS_LEVELS.moderate) : 0;
      const keep = p && geo ? nsskPerYear(GEO_INCLINATION_DRIFT) + GEO_EWSK_PER_YEAR : 0;
      const disposal = !p ? 0 : geo ? graveyardRaise(d.bus.cr, dragArea(d) / d.bus.dryMass).dv
        : fig.orbit.region === 'leo' ? perigeeLowerDv(hA, 50e3) - perigeeLowerDv(hA, hP) : 0;
      const alloc = dvAllocation({ insertion: p?.insertionDv ?? 0, disposal, stationKeepingPerYear: makeup + keep, years: d.lifeYears },
        p ? { mass: wetMass(d), propellant: p.propellant, isp: p.isp, thrust: p.thrust } : null);
      expect(fig.dv.dragMakeupPerYear.value).toBe(makeup);
      expect(fig.dv.disposal.value).toBe(alloc.disposal);
      expect(fig.dv.required.value).toBe(alloc.required);
      expect(fig.dv.available.value).toBe(alloc.available);
      expect(fig.dv.margin.value).toBe(alloc.margin);
      if (p) expect(fig.dv.propellantNeeded!.value).toBe(propellantFor(wetMass(d), alloc.required, p.isp));
      // attitude
      const rP = R_EARTH + hP, ad = d.adcs;
      expect(fig.attitude.gravityGradient.value).toBe(gravityGradientTorque(rP, Math.max(...ad.inertia), Math.min(...ad.inertia), GG_SIZING_ANGLE));
      const { width: w, height: h, depth: dp } = d.bus.size;
      const sunlit = Math.max(w * h, w * dp, h * dp) + (pw.mount === 'tracking' ? pw.arrayArea : 0);
      expect(fig.attitude.solar.value).toBe(solarTorque(SOLAR_FLUX_1AU, sunlit, SUNLIT_REFLECTANCE, 0, ad.cpOffset));
      expect(fig.attitude.aero.value).toBe(aeroTorque(perigeeDensity(o, 'moderate'), d.bus.cd, dragArea(d), facts.vPerigee, ad.cpOffset));
      expect(fig.attitude.magnetic.value).toBe(magneticTorque(ad.residualDipole, dipoleField(rP)));
      if (ad.mode === 'threeAxis') expect(fig.attitude.wheelNeeded!.value).toBe(wheelMomentumCyclic(fig.attitude.total.value, P));
      // link
      const c = d.comms;
      const g = c.txAntennaD > 0 ? dishGain(c.txAntennaD, c.frequency, TX_DISH_EFFICIENCY) : 0;
      const pl = c.txAntennaD > 0 ? pointingLoss(ad.pointingDeg * DEG, beamwidthOf(c.frequency, c.txAntennaD)) : 0;
      const e = eirp(c.txPowerW, c.lineLoss, g, pl);
      const table = designControlTable({
        eirp: e, frequency: c.frequency, range: slantRange(R_EARTH + hA, c.minElDeg * DEG), rxGain: dishGain(c.rxAntennaD!, c.frequency, RX_DISH_EFFICIENCY),
        systemTemperature: c.rxNoiseK!, losses: c.losses!, dataRate: c.dataRate, requiredEbN0: c.requiredEbN0, implementationLoss: 0,
      });
      expect(fig.link.eirp.value).toBe(e);
      expect(fig.link.margin.value).toBe(table.margin);
      expect(fig.link.maxRate.value).toBe(maxDataRate(table.ptOverN0, c.requiredEbN0, LINK_MARGIN_THRESHOLD));
      if (!geo) expect(fig.link.passMax!.value).toBe(maxPassDuration(P, footprintAngle(o.a, c.minElDeg * DEG)));
      // camera
      if (d.payload) {
        const cam = d.payload;
        expect(fig.camera!.gsd.value).toBe(groundSampleDistance(hP, cam.pixelPitch, cam.focalLength));
        expect(fig.camera!.offNadirCross.value).toBe(offNadirGsd(hP, cam.pixelPitch, cam.focalLength, OFF_NADIR_ANGLE).cross);
        expect(fig.camera!.diffraction.value).toBe(diffractionGsd(hP, cam.aperture, DIFFRACTION_WAVELENGTH));
        expect(fig.camera!.swath!.value).toBe(swathWidth(hP, 2 * Math.atan((cam.pixels * cam.pixelPitch) / (2 * cam.focalLength)))!);
        if (!geo) expect(fig.camera!.dataRate!.value).toBe(imagingDataRate(cam.pixels, cam.bits, fig.camera!.gsd.value, hP));
      } else expect(fig.camera).toBeNull();
    }, 20_000);
  }
});

describe('published figures, through the model', () => {
  it('the comsat at GEO: SMAD\'s 69.41 min at β = 0 (±0.01), and short of Δv as TU Delft Fig. 11 says', () => {
    const d = designFromTemplate('comsat', 'x', 'x');
    const fig = designFigures(d, JD);
    expect(fig.orbit.region).toBe('geo');
    expect(Math.abs(fig.eclipse.atBetaZero!.value / 60 - 69.41)).toBeLessThanOrEqual(0.01);
    expect(fig.dv.available.value).toBeGreaterThan(1836.49);
    expect(fig.dv.margin.value).toBeLessThan(0);
    expect(fig.dv.margin.value).toBeGreaterThan(-(682.0 + 19.9 + 10.88));
    expect(fig.dv.plan).toBe('graveyard');
    expect(satelliteChecks(d, fig).map((x) => x.key)).toContain('build.sat.warn.dv');
  }, 20_000);

  it('THEOS-2\'s camera: 0.501 m and 10.3 km from 621 km', () => {
    const fig = designFigures(designFromTemplate('theos2', 'x', 'x'), JD);
    expect(fig.camera!.gsd.value).toBeCloseTo(0.501, 3);
    expect(Math.abs(fig.camera!.swath!.value / 1e3 - 10.33)).toBeLessThan(0.05);
  }, 20_000);

  it('NAPA-2: B = 0.0134 m²/kg', () => {
    const fig = designFigures(designFromTemplate('napa2', 'x', 'x'), JD);
    expect(Math.abs(fig.drag.ballistic.value - 0.0134)).toBeLessThanOrEqual(0.00005);
    expect(fig.dv.plan).toBe('decay');
    expect(fig.dv.required.value).toBe(0);
  }, 20_000);
});

describe('what the builder says', () => {
  it('a smaller array fails the power budget, and names what is needed', () => {
    const d = withValue(designFromTemplate('napa2', 'x', 'x'), 'power.arrayArea', 0.03);
    const fig = designFigures(d, JD);
    const says = satelliteChecks(d, fig);
    const power = says.find((x) => x.key === 'build.sat.warn.power')!;
    expect(power.level).toBe('fail');
    expect(power.values.need).toEqual(fig.power.required);
    expect(power.values.area).toEqual(fig.power.areaNeeded);
    // a bigger array clears it
    const big = withValue(d, 'power.arrayArea', 0.2);
    expect(satelliteChecks(big, designFigures(big, JD)).map((x) => x.key)).not.toContain('build.sat.warn.power');
  }, 20_000);

  it('a battery too small for the eclipse fails; one drained past its depth of discharge warns', () => {
    const d = designFromTemplate('napa2', 'x', 'x');
    const tiny = withValue(d, 'power.batteryWh', 1);
    expect(satelliteChecks(tiny, designFigures(tiny, JD)).find((x) => x.key === 'build.sat.warn.battery')?.level).toBe('fail');
    const deep = withValue(d, 'power.batteryWh', 8);
    const fig = designFigures(deep, JD);
    expect(fig.power.depth.value).toBeGreaterThan(0.3);
    expect(fig.power.depth.value).toBeLessThan(1);
    expect(satelliteChecks(deep, fig).find((x) => x.key === 'build.sat.warn.batteryDeep')?.level).toBe('warn');
  }, 20_000);

  it('a link without margin fails, one under 3 dB warns, and the highest rate at 3 dB is offered', () => {
    const d = designFromTemplate('napa2', 'x', 'x');
    const fig = designFigures(d, JD);
    expect(fig.link.margin.value).toBeGreaterThan(LINK_MARGIN_THRESHOLD);
    const fast = withValue(d, 'comms.dataRate', fig.link.maxRate.value * 4);
    const f2 = designFigures(fast, JD);
    expect(f2.link.margin.value).toBeLessThan(0);
    expect(satelliteChecks(fast, f2).find((x) => x.key === 'build.sat.warn.linkNone')?.level).toBe('fail');
    // at the offered rate the margin is the threshold, to rounding
    const at = withValue(d, 'comms.dataRate', fig.link.maxRate.value);
    expect(Math.abs(designFigures(at, JD).link.margin.value - LINK_MARGIN_THRESHOLD)).toBeLessThan(1e-9);
    const thin = withValue(d, 'comms.dataRate', fig.link.maxRate.value * 1.5);
    expect(satelliteChecks(thin, designFigures(thin, JD)).find((x) => x.key === 'build.sat.warn.linkThin')?.level).toBe('warn');
  }, 20_000);

  it('says the drag area is an estimate that also drives sunlight pressure, every time', () => {
    for (const id of ['napa2', 'comsat']) {
      const d = designFromTemplate(id, 'x', 'x');
      const fig = designFigures(d, JD);
      expect(estimateTexts(d, fig)[0]).toEqual({ key: 'build.sat.est.dragArea', level: 'note', values: { area: fig.drag.area, b: fig.drag.ballistic } });
    }
  }, 20_000);

  it('turns the checker\'s problems into sentences naming the field, with its words as detail', () => {
    const d = withValue(designFromTemplate('theos2', 'x', 'x'), 'power.cellEff', 29.5);
    const says = problemTexts(satelliteDesignProblems(d));
    expect(says).toEqual([{ key: 'build.sat.warn.field', level: 'fail', values: { field: { key: 'build.sat.f.cellEff' } }, detail: 'power.cellEff must be at most 0.5 (got 29.5)' }]);
    expect(() => designFigures(d, JD)).toThrow(RangeError);
  });
});

describe('editing a design', () => {
  it('lists every number with the checker\'s bounds and a label', () => {
    const paths = SATELLITE_FIELDS.map((f) => f.path);
    expect(new Set(paths).size).toBe(paths.length);
    const d = designFromTemplate('theos2', 'x', 'x');
    for (const f of SATELLITE_FIELDS) {
      expect(f.key.startsWith('build.sat.f.'), f.path).toBe(true);
      expect(f.min).toBeLessThan(f.max);
      const v = valueAt(d, f.path);
      if (typeof v === 'number') expect(v >= f.min && v <= f.max, f.path).toBe(true);
    }
  });

  it('keeps a sun-synchronous orbit\'s inclination J2\'s as its height changes, and leaves the design it was given alone', () => {
    const d = designFromTemplate('theos2', 'x', 'x');
    const lower = withValue(d, 'orbit.perigee', 500e3);
    expect(lower.orbit.inclination).toBe(ssoInclinationDeg(500e3, 621e3));
    expect(d.orbit.perigee).toBe(621e3);
    const off = withSso(d, false);
    expect(off.orbit.sso).toBe(false);
    expect(off.orbit.ltan).toBeUndefined();
    expect(withSso(off, true).orbit.ltan).toBe(22.5);
  });

  it('adds and removes an engine and a camera, and sets the menus it has', () => {
    const d = designFromTemplate('napa2', 'x', 'x');
    const engine = withEngine(d, true);
    expect(engine.propulsion).toEqual({ thrust: 1, isp: 223, propellant: 0.5 });
    expect(withEngine(engine, false).propulsion).toBeNull();
    expect(withCamera(withCamera(d, false), true).payload).toEqual(d.payload);
    expect(withChoice(d, 'mount', 'tracking').power.mount).toBe('tracking');
    expect(withChoice(d, 'mount', 'toString').power.mount).toBe('body');
    expect(withChoice(d, 'station', 'moscow').comms.station).toBe('moscow');
  });

  it('says where each number comes from: the template\'s source, an estimate, or yours', () => {
    const d = designFromTemplate('napa2', 'x', 'x');
    expect(fieldOrigin(d, 'power.cellEff').kind).toBe('sourced');
    expect(fieldOrigin(d, 'power.payloadW').kind).toBe('estimate');
    expect(fieldOrigin(withValue(d, 'power.payloadW', 6), 'power.payloadW').kind).toBe('yours');
    expect(fieldOrigin({ ...d, template: 'gone' }, 'power.cellEff').kind).toBe('yours');
  });

  it('keeps the year\'s worst eclipse per orbit, so a change to the array does not walk the year again', () => {
    const d = designFromTemplate('theos2', 'x', 'x');
    const o = designOrbit(d.orbit, JD);
    expect(worstEclipseOf(o, JD)).toBe(worstEclipseOf({ ...o }, JD));
  }, 20_000);
});

describe('the hand-off to the Orbit section', () => {
  it('reads back, and gives the lifetime dialog the design\'s mass, drag area, C_D and C_R', () => {
    for (const tpl of SATELLITE_TEMPLATES) {
      const d = designFromTemplate(tpl.id, 'x', 'My satellite');
      const h = designHandoff(d, JD, 'label')!;
      expect(parseHandoff(JSON.parse(JSON.stringify(h)))).toEqual(h);
      expect(lifetimeSpacecraft(h)).toEqual({ mass: wetMass(d), area: dragArea(d), cd: d.bus.cd, cr: d.bus.cr });
      expect(h.spacecraft.kind).toBe(d.kind);
    }
    expect(designHandoff(withValue(designFromTemplate('napa2', 'x', 'x'), 'bus.cd', Number.NaN), JD, 'x')).toBeNull();
  });
});

describe('the draft a browser keeps', () => {
  it('round-trips, empty boxes and all', () => {
    const d = withValue(designFromTemplate('napa2', 'x', 'NAPA-2'), 'power.batteryWh', Number.NaN);
    const back = restoreKeptSatellite(keptSatelliteText({ design: d, recordId: 'r1', defaultName: 'NAPA-2' }))!;
    expect(back.recordId).toBe('r1');
    expect(back.defaultName).toBe('NAPA-2');
    expect(Number.isNaN(back.design.power.batteryWh)).toBe(true);
    expect({ ...back.design, power: { ...back.design.power, batteryWh: 40 } }).toEqual({ ...d, power: { ...d.power, batteryWh: 40 } });
    // no engine, no camera: null stays null
    const bare = withCamera(designFromTemplate('napa2', 'x', 'x'), false);
    expect(restoreKeptSatellite(keptSatelliteText({ design: bare, recordId: null, defaultName: 'x' }))!.design).toEqual(bare);
  });

  it('refuses another version, another shape, an unknown template, and text that is not JSON', () => {
    const d = designFromTemplate('napa2', 'x', 'x');
    const ok = JSON.parse(keptSatelliteText({ design: d, recordId: null, defaultName: 'x' }));
    for (const bad of [null, '', 'not json', JSON.stringify({ ...ok, v: 2 }), JSON.stringify({ ...ok, design: { ...d, template: 'gone' } }),
      JSON.stringify({ ...ok, design: { ...d, power: 'none' } }), JSON.stringify({ ...ok, design: { ...d, extra: 1 } }), JSON.stringify({ ...ok, recordId: 5 })]) {
      expect(restoreKeptSatellite(bad)).toBeNull();
    }
  });
});
