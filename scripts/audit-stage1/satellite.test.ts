import { it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { designFigures, designFromTemplate, satelliteChecks } from '../../src/design/satellite-model';
import { designOrbit } from '../../src/design/satellite-handoff';
import { designMissionDocument } from '../../src/design/satellite-launch';
import { parseMissionDocument } from '../../src/config/mission-file';
import { defaultMissionState, missionConfigFromState } from '../../src/lessons/config';
import { vehicleById } from '../../src/data/vehicles';
import { Simulation } from '../../src/physics/simulation';
import { FlightRecorder } from '../../src/replay/recorder';
import { DEG } from '../../src/physics/constants';
import { sunRightAscension, wrapPi } from '../../src/physics/orbital';
import { meanSunRightAscension, raanForLocalTime, nodeLocalTime } from '../../src/orbit/kepler';
import { raanFromLtan } from '../../src/physics/mission';

// Run from the repository root with scripts/audit-stage1/vitest.config.ts.
// This records current behavior. Scientific acceptance thresholds remain in
// the existing validation tests; negative budgets and shifted nodes are findings.
const outputDirectory = resolve(process.env.ORBITLAB_AUDIT_DIR ?? 'tests/browser/artifacts/stage1');

it('records existing satellite findings without treating them as scientific acceptance', () => {
  const jd = 2461314.5; // 2026-10-01 00:00 UTC, matching docs/VALIDATION.md §9.
  const budgets = ['comsat', 'weather', 'science'].map((id) => {
    const design = designFromTemplate(id, `stage1-${id}`, id);
    const fig = designFigures(design, jd, { level: 'moderate' });
    return {
      template: id,
      inputs: { design, jd, activity: 'ECSS moderate' },
      outputs: { region: fig.orbit.region, dv: fig.dv, warnings: satelliteChecks(design, fig) },
      scientificAcceptance: 'negative margin is an existing design shortfall, not a passed mission requirement',
    };
  });

  const cases = [
    { template: 'napa2', vehicle: 'electron', site: 'mahia' },
    { template: 'theos2', vehicle: 'vegac', site: 'kourou' },
  ];
  const flights = cases.map((c) => {
    const design = designFromTemplate(c.template, `stage1-${c.template}`, c.template);
    const from = new Date(Date.UTC(2026, 9, 1, 12));
    const doc = designMissionDocument(design, {
      vehicle: vehicleById(c.vehicle), siteId: c.site, from,
    });
    const parsed = parseMissionDocument(JSON.parse(JSON.stringify(doc)), defaultMissionState());
    expect(parsed.issues).toEqual([]);
    const cfg = missionConfigFromState(parsed.state);
    const sim = new Simulation(cfg, { headless: true });
    const rec = new FlightRecorder();
    rec.start(sim);
    let guard = 0;
    // Match tests/d06-satellite-launch.test.ts's existing recorder path.
    while (!sim.done && sim.state.t < 4 * 3600 && guard++ < 200_000) rec.advance(5, 1e9);
    if (rec.clock < sim.state.t) rec.advance(sim.state.t - rec.clock, 1e9);
    const last = rec.frames.at(-1)!;
    const launchJd = cfg.launchTime.getTime() / 86400e3 + 2440587.5;
    const want = designOrbit(design.orbit, launchJd);
    const got = last.elements;
    const offset = wrapPi(meanSunRightAscension(launchJd) - sunRightAscension(launchJd));
    const raw = wrapPi(got.raan - want.raan) / DEG;
    const residual = wrapPi(got.raan - (want.raan - offset)) / DEG;
    return {
      template: c.template,
      inputs: {
        design, from: from.toISOString(), vehicle: c.vehicle, site: c.site, mission: doc,
        launchTime: cfg.launchTime.toISOString(), launchJd,
        headless: true, recorderAdvanceSeconds: 5,
      },
      outputs: {
        status: sim.state.status,
        payloadSeparated: last.payloadSeparated,
        separationTime: sim.events.find((e) => e.key === 'evt.payloadSep')?.t,
        desired: {
          perigeeKm: design.orbit.perigee / 1e3,
          apogeeKm: design.orbit.apogee / 1e3,
          inclinationDegrees: want.i / DEG,
          nodeDegrees: want.raan / DEG,
        },
        actual: {
          perigeeKm: got.periapsisAlt / 1e3,
          apogeeKm: got.apoapsisAlt / 1e3,
          inclinationDegrees: got.i / DEG,
          nodeDegrees: got.raan / DEG,
          meanLocalTimeHours: nodeLocalTime(got.raan, launchJd),
          massKg: last.mass,
        },
        errors: {
          perigeeKm: (got.periapsisAlt - design.orbit.perigee) / 1e3,
          apogeeKm: (got.apoapsisAlt - design.orbit.apogee) / 1e3,
          inclinationDegrees: (got.i - want.i) / DEG,
          uncorrectedNodeDegrees: raw,
          equationOfTimeDegrees: offset / DEG,
          equationOfTimeMinutes: (offset / DEG) * 4,
          correctedNodeResidualDegrees: residual,
        },
        existingTestBound: {
          apsidesKm: 30, inclinationDegrees: 0.3, nodeResidualAfterEquationOfTimeDegrees: 0.3,
        },
        uncorrectedNodeWithin03Degrees: Math.abs(raw) <= 0.3,
      },
      scientificAcceptance: 'existing test checks node after subtracting equation of time; it does not require preserving design mean LTAN',
    };
  });

  // Explain why a fixed-noon calculation differs slightly from flown nodes:
  // designMissionDocument selects the next launch window after that time.
  const date = new Date('2026-10-01T12:00:00.000Z');
  const directJd = date.getTime() / 86400e3 + 2440587.5;
  const designNode = raanForLocalTime(22.5, directJd);
  const launchNode = raanFromLtan(date, 22.5);
  const directNode = {
    input: { date: date.toISOString(), jd: directJd, ltanHours: 22.5 },
    output: {
      designMeanSunNodeDegrees: designNode / DEG,
      launchTrueSunNodeDegrees: launchNode / DEG,
      launchMinusDesignDegrees: wrapPi(launchNode - designNode) / DEG,
      launchNodeAsMeanTimeHours: nodeLocalTime(launchNode, directJd),
    },
  };
  const annual = Array.from({ length: 365 }, (_, day) => {
    const date = new Date(Date.UTC(2026, 0, 1 + day, 12));
    const jd = date.getTime() / 86400e3 + 2440587.5;
    return {
      date: date.toISOString(),
      minutes: (wrapPi(meanSunRightAscension(jd) - sunRightAscension(jd)) / DEG) * 4,
    };
  });
  const evidence = {
    head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    recordedAt: new Date().toISOString(),
    node: process.version,
    method: 'Vitest probe reading current cores and using existing d06-satellite-launch recorder path; descriptive reproduction, not new acceptance thresholds',
    budgets, flights, directNode,
    annualEquationOfTimeDailySamples: {
      min: annual.reduce((a, b) => a.minutes < b.minutes ? a : b),
      max: annual.reduce((a, b) => a.minutes > b.minutes ? a : b),
    },
  };
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(join(outputDirectory, 'satellite-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  expect(flights.every((f) => f.outputs.payloadSeparated)).toBe(true);
}, 240_000);
