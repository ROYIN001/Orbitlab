/**
 * Soyuz-2.1a in six-DOF, Soyuz MS-25 as the viewer flies it, from the pad to
 * T+300 s: its stored pitch programme (`SOYUZ_21A_PROGRAMME` in
 * src/data/vehicles.ts) flown by the attitude loop through max Q, the strap-on
 * and core phases and the hand-over to Blok I. What a real R-7 cannot do it
 * must not do here: hold a large angle in dense air, or turn fast. The heights
 * at T+153.3 s and T+287.7 s are the programme's fit targets (docs/VALIDATION.md,
 * "Fitted and derived values"), checked here so a change elsewhere that moves
 * them is seen; the rest of the flight to orbit is in
 * tests/watch-missions-flights-g.test.ts.
 *
 * Before the programme (audit PHY-01) the strap-ons flew a zero-lift turn from
 * a 6° kick, which held the angle under 2° but, on the lighter stages of the
 * time, put the fairing at 102 km and the core's separation at 199 km against
 * the flown 79 and 157 km (docs/VALIDATION.md, the MS-25 table).
 */
import { describe, expect, it } from 'vitest';
import { watchMissionSettings } from '../src/ui/watch-missions';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { guidanceForVehicle } from '../src/physics/defaults';
import { defaultDynamics } from '../src/physics/rigid/config';
import { DEFAULT_FAILURE } from '../src/physics/defaults';
import { orbitById } from '../src/data/orbits';

const RAD = 180 / Math.PI;

describe('Soyuz-2.1a in six-DOF: the stored pitch programme', () => {
  it('flies the flown heights with a small angle in the air and a slow turn', () => {
    const s = watchMissionSettings('soyuzMs25', new Date('2026-09-22T03:00:00Z'));
    const dynamics = defaultDynamics(s.vehicleId);
    expect(dynamics.model).toBe('sixDof');
    const sim = new Simulation({
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, padId: s.padId,
      launchTime: s.launchTime, payloadMassOverride: s.payloadMass,
      guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, dynamics.model), guidanceResolved: true,
      failure: s.failure, boosterRecovery: s.boosterRecovery, recoveryPlan: s.recoveryPlan, dynamics,
    }, { headless: true });
    let qMax = 0, qMaxAt = 0, maxAngle = 0, maxAngleAt = 0, maxQAlpha = 0, maxQAlphaAt = 0, peakRate = 0, peakRateAt = 0;
    let envelopeQ: number | undefined, h153: number | undefined, h288: number | undefined;
    while (sim.state.t < 300 && !sim.isFailed()) {
      sim.step(sim.suggestedDt());
      const { t, q, rigid, altitude } = sim.state;
      if (h153 === undefined && t >= 153.3) h153 = altitude;
      if (h288 === undefined && t >= 287.7) h288 = altitude;
      if (!rigid) continue;
      if (q > qMax) { qMax = q; qMaxAt = t; }
      const angle = Math.hypot(rigid.angleOfAttack, rigid.sideslip) * RAD;
      if (t > 15 && q > 2000 && angle > maxAngle) { maxAngle = angle; maxAngleAt = t; }
      if (t > 15 && q * angle > maxQAlpha) { maxQAlpha = q * angle; maxQAlphaAt = t; }
      if (t > 20) {
        const rate = Math.hypot(rigid.omegaBody.y, rigid.omegaBody.z) * RAD;
        if (rate > peakRate) { peakRate = rate; peakRateAt = t; }
      }
      if (envelopeQ === undefined && sim.events.some((e) => e.key === 'evt.aeroEnvelopeExceeded')) envelopeQ = q;
    }
    expect(sim.isFailed()).toBe(false);
    const at = (key: string) => sim.events.find((e) => e.key === key)?.t;

    // max Q near T+65 s: measured 37.2 kPa at T+62 s, 2.5 % over the R-7's 3 700 kgf/m² (36.3 kPa,
    // SoyCOM, the Soyuz-U's). With the crewed payload section's 3.0 m fairing, a turn that stays
    // under it climbs 9 km above the flown 79 km at the fairing (docs/VALIDATION.md §3); it stays
    // under the 38 kPa where the model's load relief would throttle an R-7 that never throttles.
    expect(qMax).toBeLessThan(37.6e3);
    expect(qMax).toBeGreaterThan(33e3);
    expect(qMaxAt).toBeGreaterThan(55);
    expect(qMaxAt).toBeLessThan(72);
    // the angle while the air loads the stack: measured 1.5°
    expect(maxAngle, `at T+${maxAngleAt.toFixed(1)} s`).toBeLessThan(1.7);
    // q·α: measured 55 kPa·deg at max Q, against the 120 kPa·deg the steering is allowed
    expect(maxQAlpha / 1e3, `at T+${maxQAlphaAt.toFixed(1)} s`).toBeLessThan(58);
    // measured 1.1 °/s, Blok I's closed loop after the hand-over
    expect(peakRate, `at T+${peakRateAt.toFixed(1)} s`).toBeLessThan(1.5);

    // the flown sequence
    expect(Math.abs(at('evt.boosterSep')! - 117.85)).toBeLessThan(0.1);
    expect(at('evt.fairingSep')!).toBeCloseTo(153.3, 0);
    // the fit targets (russianspaceweb, Soyuz MS-16 to MS-28): 79 and 157 km; measured 79.0 and 157.0 km
    expect(h153! / 1e3).toBeGreaterThan(77.5);
    expect(h153! / 1e3).toBeLessThan(80.5);
    expect(h288! / 1e3).toBeGreaterThan(155);
    expect(h288! / 1e3).toBeLessThan(159.5);
    // Every six-DOF flight leaves the 15° table once its steering is out of the
    // air (PHYSICS.md §13.8); here after the hand-over, at under 1 Pa.
    if (envelopeQ !== undefined) expect(envelopeQ).toBeLessThan(10);
  }, 600_000);

  it('flies Progress MS on the cargo programme: the core’s 143 km, under the load-relief placard', () => {
    const dynamics = defaultDynamics('soyuz21a');
    const sim = new Simulation({
      vehicleId: 'soyuz21a', satelliteId: 'progress', siteId: 'baikonur', orbit: { ...orbitById('iss'), raanMode: 'free' },
      launchTime: new Date('2026-09-22T18:00:00Z'),
      guidance: guidanceForVehicle(vehicleById('soyuz21a'), undefined, dynamics.model), guidanceResolved: true,
      failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, dynamics,
    }, { headless: true });
    let qMax = 0, maxAngle = 0, throttled = false, h288: number | undefined, h183: number | undefined;
    while (!sim.isFailed() && !sim.state.payloadSeparated && sim.state.t < 600) {
      sim.step(sim.suggestedDt());
      const { t, q, rigid, altitude, throttle, thrust } = sim.state;
      if (h183 === undefined && t >= 183.2) h183 = altitude;
      if (h288 === undefined && t >= 287.42) h288 = altitude;
      qMax = Math.max(qMax, q);
      if (thrust > 0 && sim.state.status === 'ascent' && throttle < 0.999) throttled = true;
      if (rigid && t > 15 && q > 2000) maxAngle = Math.max(maxAngle, Math.hypot(rigid.angleOfAttack, rigid.sideslip) * RAD);
    }
    expect(sim.isFailed()).toBe(false);
    // measured 37.9 kPa, 1.8°; never throttled for it
    expect(qMax).toBeLessThan(38e3);
    expect(throttled).toBe(false);
    expect(maxAngle).toBeLessThan(2);
    // the fit target, 143 km at the separation (Progress MS-19 to MS-34); the fairing comes out 7 km
    // over the flown 91 km, recorded in docs/VALIDATION.md §3
    expect(h288! / 1e3).toBeGreaterThan(141.5);
    expect(h288! / 1e3).toBeLessThan(144.5);
    expect(h183! / 1e3).toBeGreaterThan(95);
    expect(h183! / 1e3).toBeLessThan(101);
    const el = sim.state.elements;
    expect(el.periapsisAlt / 1e3).toBeCloseTo(193, 0);
  }, 600_000);
});
