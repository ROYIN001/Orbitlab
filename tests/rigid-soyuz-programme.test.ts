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

    // max Q under the R-7's 3 700 kgf/m² (36.3 kPa, SoyCOM) near T+65 s: measured 35.7 kPa at T+63 s
    expect(qMax).toBeLessThan(36.3e3);
    expect(qMax).toBeGreaterThan(33e3);
    expect(qMaxAt).toBeGreaterThan(55);
    expect(qMaxAt).toBeLessThan(72);
    // the angle while the air loads the stack: measured 1.4° (T+71 s)
    expect(maxAngle, `at T+${maxAngleAt.toFixed(1)} s`).toBeLessThan(1.6);
    // q·α: measured 47 kPa·deg at max Q, against the 120 kPa·deg the steering is allowed
    expect(maxQAlpha / 1e3, `at T+${maxQAlphaAt.toFixed(1)} s`).toBeLessThan(52);
    // measured 1.1 °/s, Blok I's closed loop after the hand-over
    expect(peakRate, `at T+${peakRateAt.toFixed(1)} s`).toBeLessThan(1.5);

    // the flown sequence
    expect(Math.abs(at('evt.boosterSep')! - 117.85)).toBeLessThan(0.1);
    expect(at('evt.fairingSep')!).toBeCloseTo(153.3, 0);
    // the fit targets (russianspaceweb, Soyuz MS-16 to MS-28): 79 and 157 km; measured 78.8 and 157.3 km
    expect(h153! / 1e3).toBeGreaterThan(77.5);
    expect(h153! / 1e3).toBeLessThan(80.5);
    expect(h288! / 1e3).toBeGreaterThan(155);
    expect(h288! / 1e3).toBeLessThan(159.5);
    // Every six-DOF flight leaves the 15° table once its steering is out of the
    // air (PHYSICS.md §13.8); here after the hand-over, at under 1 Pa.
    if (envelopeQ !== undefined) expect(envelopeQ).toBeLessThan(10);
  }, 600_000);
});
