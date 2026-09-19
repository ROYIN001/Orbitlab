import { afterAll, describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { rigidMission } from './rigid-harness';
import { cross, dot, lerp, norm, normalize, sub, v3, type Vec3 } from '../src/physics/vec3';
import { DEG, OMEGA_EARTH, R_EARTH } from '../src/physics/constants';
import { quatAngularDistance, quatSlerp, type Quat } from '../src/physics/rigid/math';

type Sample = { t: number; r: Vec3; v: Vec3; q: Quat };
const results: { dt: number; contactTime: number; outcome?: string; samples: Sample[] }[] = [];

afterAll(() => {
  const fine = results.find(result => result.dt === 0.0025);
  if (!fine) return;
  const comparison = results.filter(result => result !== fine).map(result => ({
    dt: result.dt, sameClassification: result.outcome === fine.outcome,
    contactTimeDelta: result.contactTime - fine.contactTime,
    checkpoints: result.samples.map(sample => {
      const reference = fine.samples.find(other => other.t === sample.t)!;
      return { t: sample.t, positionDeltaM: norm(sub(sample.r, reference.r)),
        velocityDeltaMs: norm(sub(sample.v, reference.v)), attitudeDeltaDeg: quatAngularDistance(sample.q, reference.q) / DEG };
    }),
  }));
  console.log('RECOVERY_CONVERGENCE', JSON.stringify({ referenceDt: 0.0025, controlPeriodS: 0.01, comparison }));
  const reference = results.find(result => result.dt === 0.005)!;
  const nominal = results.find(result => result.dt === 0.01)!;
  expect(nominal.outcome).toBe(reference.outcome);
  expect(Math.abs(nominal.contactTime - reference.contactTime), 'fixed-clock contact-time convergence').toBeLessThan(0.02);
  expect(nominal.samples).toHaveLength(3);
  for (const sample of nominal.samples) {
    const target = reference.samples.find(other => other.t === sample.t)!;
    expect(norm(sub(sample.r, target.r)), `position convergence at T${sample.t}`).toBeLessThan(10);
    expect(norm(sub(sample.v, target.v)), `velocity convergence at T${sample.t}`).toBeLessThan(0.1);
    expect(quatAngularDistance(sample.q, target.q) / DEG, `attitude convergence at T${sample.t}`).toBeLessThan(0.1);
  }
});

describe('Falcon physical recovery acceptance', () => {
  // Controller/guidance run at 10ms in every case. 20ms maximum integration
  // is capped to10ms, so 2.5ms supplies a genuine third plant refinement.
  for (const dt of [0.0025, 0.005, 0.01]) it(`lands the reference returning body with maximum RK step=${dt} and the strict contact gate`, () => {
    const cfg = rigidMission(); cfg.boosterRecovery = true;
    const sim = new Simulation(cfg, { headless: true, rigidDt: dt });
    const checkpoints: unknown[] = [];
    const samples: Sample[] = [];
    let previous: Sample | undefined;
    let last = -1, phase = '', previousFuel = Infinity, previousGas = Infinity;
    let finite = true, monotone = true, maxGimbal = 0, maxNormError = 0, ticks = 0;
    while (sim.state.t < 600 && !sim.isFailed() && ticks++ < Math.ceil(610 / dt)) {
      sim.step(sim.suggestedDt());
      const d = sim.debris.find(body => !!body.recovery);
      if (!d) continue;
      const rc = d.recovery!, rigid = d.rigid!;
      const current: Sample = { t: sim.state.t, r: { ...d.r }, v: { ...d.v }, q: { ...rigid.attitudeQ } };
      for (const t of [300, 400, 500]) if (previous && previous.t < t && current.t >= t) {
        const fraction = (t - previous.t) / (current.t - previous.t);
        samples.push({ t, r: lerp(previous.r, current.r, fraction), v: lerp(previous.v, current.v, fraction),
          q: quatSlerp(previous.q, current.q, fraction) });
      }
      previous = current;
      const velocity = sub(d.v, cross(v3(0, 0, OMEGA_EARTH), d.r));
      monotone &&= rc.propellant <= previousFuel + 1e-8 && rigid.rcsPropellantKg <= previousGas + 1e-8;
      previousFuel = rc.propellant; previousGas = rigid.rcsPropellantKg;
      finite &&= [d.mass, rc.propellant, rigid.rcsPropellantKg, ...Object.values(d.r), ...Object.values(d.v),
        ...Object.values(rigid.attitudeQ), ...Object.values(rigid.omegaBody)].every(Number.isFinite);
      maxGimbal = Math.max(maxGimbal, ...Object.values(rigid.engineDeflections).map(angles => Math.hypot(...angles)));
      maxNormError = Math.max(maxNormError, rigid.rawQuaternionNormError);
      const tick = Math.floor(sim.state.t / 10);
      if (tick > last || phase !== rc.phase || !d.alive) {
        last = tick; phase = rc.phase;
        checkpoints.push({ t: sim.state.t, h: norm(d.r) - R_EARTH, speed: norm(velocity), vz: dot(velocity, normalize(d.r)),
          tiltDeg: Math.acos(Math.max(-1, Math.min(1, dot(d.dir, normalize(d.r))))) / DEG,
          rates: rigid.omegaBody, fuel: rc.propellant, gas: rigid.rcsPropellantKg, phase: rc.phase,
          burning: rc.burning, engines: rigid.engineThrottles, saturation: rigid.saturated,
          aoa: rigid.angleOfAttack, withinEnvelope: rigid.aeroWithinEnvelope, outcome: d.outcome });
        console.log('RECOVERY_CHECKPOINT', JSON.stringify(checkpoints[checkpoints.length - 1]));
      }
      if (!d.alive) break;
    }
    const returning = sim.debris.find(body => !!body.recovery);
    results.push({ dt, contactTime: sim.state.t, outcome: returning?.outcome, samples });
    console.log('RIGID_RECOVERY', JSON.stringify({ dt, t: sim.state.t, missionStatus: sim.state.status,
      outcome: returning?.outcome, recovery: returning?.recovery, finite, monotone, maxGimbal, maxNormError,
      checkpoints, samples, events: sim.events.filter(event => ['evt.stageSep', 'evt.boosterLanded', 'evt.stageImpact', 'evt.vehicleLost'].includes(event.key)) }));
    expect(returning).toBeDefined();
    expect(returning!.outcome).toBe('landed');
    const landing = sim.events.find(event => event.key === 'evt.boosterLanded');
    expect(landing).toBeDefined();
    expect(Math.abs(Number(landing!.params!.verticalSpeed))).toBeLessThanOrEqual(5);
    expect(Number(landing!.params!.horizontalSpeed)).toBeLessThanOrEqual(3);
    expect(Number(landing!.params!.tiltDeg)).toBeLessThanOrEqual(10);
    expect(finite).toBe(true); expect(monotone).toBe(true);
    expect(maxGimbal).toBeLessThanOrEqual(5 * DEG + 1e-9);
    expect(maxNormError).toBeLessThan(1e-8);
  }, 300000);
});
