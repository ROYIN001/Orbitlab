/**
 * Audit PHY-01: Soyuz-2.1a in six-DOF, Soyuz MS-25 as the viewer flies it,
 * from the pad to T+170 s. Its strap-ons fly a zero-lift turn and the steering
 * closes the loop at T+140 s (`guidanceDefaultsSixDof.closedLoopStart` in
 * src/data/vehicles.ts). Handed over at the usual ~4 kPa it asked for a nose far
 * below the vehicle: 14° of angle held at the aerodynamic table's edge from
 * T+90 s with the strap-ons still on, a 3 °/s pitch-down, and 25° past the
 * table after they left, recorded as `evt.aeroEnvelopeExceeded` at 380 Pa on a
 * crewed flight. The whole flight to orbit is in tests/watch-missions-flights-g.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { watchMissionSettings } from '../src/ui/watch-missions';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { guidanceForVehicle } from '../src/physics/defaults';
import { defaultDynamics } from '../src/physics/rigid/config';
import { dot, normalize } from '../src/physics/vec3';

const RAD = 180 / Math.PI;

describe('Soyuz-2.1a in six-DOF: the strap-ons fly a zero-lift turn (PHY-01)', () => {
  it('keeps the flow angle small in the air, turns slowly, and leaves the aerodynamic table only in thin air', () => {
    const s = watchMissionSettings('soyuzMs25', new Date('2026-09-22T03:00:00Z'));
    const dynamics = defaultDynamics(s.vehicleId);
    const sim = new Simulation({
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, padId: s.padId,
      launchTime: s.launchTime, payloadMassOverride: s.payloadMass,
      guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, dynamics.model), guidanceResolved: true,
      failure: s.failure, boosterRecovery: s.boosterRecovery, recoveryPlan: s.recoveryPlan, dynamics,
    }, { headless: true });
    let maxAngle = 0, maxAngleAt = 0, peakRate = 0, peakRateAt = 0, pastMaxQ = false;
    let envelopeQ: number | undefined, pitchAtHandover: number | undefined;
    while (sim.state.t < 170 && !sim.isFailed()) {
      sim.step(sim.suggestedDt());
      const { t, q, rigid, r, dir } = sim.state;
      if (!rigid) continue;
      if (q > 30e3) pastMaxQ = true;
      // the flow angle while the air still loads the stack: after the kick,
      // until the dynamic pressure has fallen to 100 Pa
      if (t > 20 && (!pastMaxQ || q > 100)) {
        const angle = Math.hypot(rigid.angleOfAttack, rigid.sideslip) * RAD;
        if (angle > maxAngle) { maxAngle = angle; maxAngleAt = t; }
      }
      if (t > 60) {
        const rate = Math.hypot(rigid.omegaBody.y, rigid.omegaBody.z) * RAD;
        if (rate > peakRate) { peakRate = rate; peakRateAt = t; }
      }
      if (envelopeQ === undefined && sim.events.some((e) => e.key === 'evt.aeroEnvelopeExceeded')) envelopeQ = q;
      if (pitchAtHandover === undefined && sim.state.ascentPhase === 'closedLoop') {
        pitchAtHandover = Math.asin(dot(normalize(dir), normalize(r))) * RAD;
      }
    }
    expect(sim.isFailed()).toBe(false);
    const boosterSep = sim.events.find((e) => e.key === 'evt.boosterSep')?.t;
    // the strap-ons still leave on the flown clock (117.8 s)
    expect(boosterSep).toBeGreaterThan(115);
    expect(boosterSep).toBeLessThan(125);
    // measured 1.2° (at max Q) with the 6° kick; 14.3° handed over at ~4 kPa
    expect(maxAngle, `at T+${maxAngleAt.toFixed(1)} s`).toBeLessThan(2);
    // measured 1.0 °/s (the command's rate limit above the air, at T+158 s); 3.0 °/s at T+92 s before
    expect(peakRate, `at T+${peakRateAt.toFixed(1)} s`).toBeLessThan(1.5);
    // handed over still climbing steeply (measured 32° above the horizon)
    expect(pitchAtHandover).toBeGreaterThan(20);
    // Every six-DOF flight leaves the 15° table once its steering is out of the
    // air (PHYSICS.md §13.8); here at T+161 s, under 1 Pa. It was at 380 Pa.
    if (envelopeQ !== undefined) expect(envelopeQ).toBeLessThan(10);
  }, 300_000);
});
