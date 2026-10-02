import { it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { orbitById } from '../../src/data/orbits';
import { vehicleById } from '../../src/data/vehicles';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE } from '../../src/physics/defaults';
import { flyToTarget, probeInsertion } from '../../src/physics/autotune';
import { computedRatings, delivers, type RatingOrbitRef } from '../../src/design/ratings';
import { sizeVehicle, type SizingRequest } from '../../src/design/sizing';
import { vehicleFigures } from '../../src/design/budget';
import { Simulation } from '../../src/physics/simulation';
import type { MissionConfig, VehicleSpec } from '../../src/types';

// Observations, not new accuracy gates: a passing runner means collection completed.
// This file is included only by the explicit Stage 1 audit configuration.
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const outputDir = resolve(
  process.env.ORBITLAB_AUDIT_DIR ?? resolve(repositoryRoot, 'tests/browser/artifacts/stage1'),
  'rocket',
);

it('records scientific baseline without changing implementation or accuracy thresholds', () => {
  const launchTime = new Date('2026-09-15T12:00:00.000Z');
  const small: SizingRequest = {
    payloadKg: 1000, orbit: orbitById('leo'), siteId: 'kourou', id: 'sized-1t', name: 'Sized 1 t',
    stages: [
      { enginePart: 'rutherford', epsilon: 0.08, diameterM: 1.8, targetTW: 1.3 },
      { enginePart: 'rutherford-vac', epsilon: 0.09, diameterM: 1.8, targetTW: 0.7 },
    ],
  };
  const requests: SizingRequest[] = [
    small,
    {
      payloadKg: 8000, orbit: orbitById('iss'), siteId: 'baikonur', launchTime,
      stages: [
        { enginePart: 'rd191', epsilon: 0.07, diameterM: 3.6, targetTW: 1.35 },
        { enginePart: 'rl10c11', epsilon: 0.1, diameterM: 3.6, targetTW: 0.6 },
      ],
    },
    {
      payloadKg: 3000, orbit: orbitById('sso'), siteId: 'vandenberg', launchTime,
      stages: [
        { enginePart: 'merlin1d', epsilon: 0.06, diameterM: 3.66, targetTW: 1.3 },
        { enginePart: 'mvac', epsilon: 0.07, diameterM: 3.66, targetTW: 0.8 },
        { enginePart: 'rl10c1', epsilon: 0.12, diameterM: 3.05, targetTW: 0.4 },
      ],
    },
  ];
  const missionFor = (req: SizingRequest, spec: VehicleSpec): MissionConfig => ({
    vehicleId: spec.id, vehicleSpec: spec, satelliteId: 'cubesats', siteId: req.siteId,
    orbit: req.orbit, launchTime, guidance: { ...DEFAULT_GUIDANCE },
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: req.payloadKg,
    dynamics: { model: 'pointMass', wind: 'calm', seed: 20260919 },
  });

  const sizing = [];
  for (const [requestIndex, req] of requests.entries()) {
    const variations = requestIndex === 0
      ? [
        { extraDvMps: 0 }, { extraDvMps: 220 }, { extraDvMps: 500 },
        { extraDvMps: 0, fairing: null }, { extraDvMps: 100, fairing: null },
        { extraDvMps: 200, fairing: null },
      ]
      : [{ extraDvMps: 0 }];
    for (const variation of variations) {
      const result = sizeVehicle({ ...req, ...variation });
      const figures = vehicleFigures(result.spec, req.payloadKg);
      sizing.push({
        requestIndex, payloadKg: req.payloadKg, siteId: req.siteId, orbit: req.orbit, variation,
        designDvMps: result.designDv, liftoffKg: figures.liftoffMass, heightM: result.spec.height,
        engines: result.stages.map(stage => stage.engines), fairing: result.spec.fairing,
        probe: probeInsertion(missionFor(req, result.spec)),
      });
    }
  }

  const base = sizeVehicle(small);
  const sim = new Simulation(missionFor(small, base.spec), { headless: true, equations: false });
  const timeline = [];
  let steps = 0;
  let seen = 0;
  while (!sim.done && sim.state.t < 2400 && steps++ < 200000) {
    sim.step(sim.suggestedDt());
    for (const event of sim.events.slice(seen)) {
      if (['evt.meco', 'evt.stageSep', 'evt.ignition', 'evt.fairingSep', 'evt.outOfPropellant'].includes(event.key)) {
        timeline.push({
          key: event.key, t: event.t, params: event.params, altitudeM: sim.state.altitude,
          fairingAttached: sim.vehicle.fairingAttached, orbit: sim.state.elements,
        });
      }
    }
    seen = sim.events.length;
  }

  const vehicle = vehicleById('vegac');
  // Fix the search budget in flights, not wall time, for reproducible science output.
  const rating = computedRatings(vehicle, { timeBudgetMs: Infinity, maxFlights: 40 });
  const reference: RatingOrbitRef = {
    rating: 'LEO', siteId: 'kourou', from: 'ratingOrbits',
    orbit: {
      ...orbitById('custom'), perigee: 700e3, apogee: 700e3, inclination: 98.2,
      argPerigee: 0, raanMode: 'free',
    },
  };
  const ssoProbes: { kg: number; ok: boolean; flew: boolean; cause: string }[] = [];
  const check = (kg: number): boolean => {
    const result = delivers(vehicle, reference, kg, launchTime);
    ssoProbes.push({ kg, ...result });
    return result.ok;
  };
  for (const kg of [2300, 2400, 2906, 3000]) check(kg);
  let low = 2300;
  let high = 3300;
  const highDelivered = check(high);
  // If a future build changes either endpoint, report the observations instead
  // of inventing a delivery boundary from an invalid bisection bracket.
  const validBracket = ssoProbes[0].ok && !highDelivered;
  if (validBracket) {
    while (high - low > 1) {
      const kg = Math.floor((low + high) / 2);
      if (check(kg)) low = kg;
      else high = kg;
    }
  }

  const fullMissionSized = sizeVehicle({ ...small, extraDvMps: 500 });
  const fullMissionConfig = missionFor(small, fullMissionSized.spec);
  const evidence = {
    sha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim(),
    launchTime, dynamics: { model: 'pointMass', wind: 'calm', seed: 20260919 },
    sizing, fairingTimeline: timeline,
    fullMission: {
      request: { payloadKg: 1000, extraDvMps: 500, siteId: 'kourou', perigeeKm: 500, apogeeKm: 500 },
      mission: flyToTarget(fullMissionConfig, fullMissionConfig.guidance),
    },
    vegac: {
      publishedLEOKg: vehicle.payloadLEO, publishedSSOKg: vehicle.payloadSSO,
      rating, ssoRef: reference, ssoProbes,
      ssoBracket: validBracket ? {
        deliveredKg: low, failsAtKg: high,
        ratioToPublished: vehicle.payloadSSO ? low / vehicle.payloadSSO : null,
      } : null,
    },
  };
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(resolve(outputDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence));
}, 60000);
