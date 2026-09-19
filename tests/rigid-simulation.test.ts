import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { norm } from '../src/physics/vec3';
import { rigidMission } from './rigid-harness';
import { orbitMisses } from './fleet-harness';

describe('6DOF reference mission acceptance', () => {
  for (const id of ['leo', 'iss'] as const) it(`${id}: completes the target using physical attitude and conservative staging`, () => {
    const sim = new Simulation(rigidMission(id), { headless: true });
    let maximumRate = 0, maximumNormError = 0, count = 0, last = -1;
    const checkpoints: unknown[] = [];
    while (!sim.done && sim.state.t < 7200 && count++ < 722000) {
      sim.step(sim.suggestedDt());
      maximumRate = Math.max(maximumRate, norm(sim.state.rigid!.omegaBody));
      maximumNormError = Math.max(maximumNormError, sim.state.rigid!.rawQuaternionNormError);
      const tick = Math.floor(sim.state.t / 30);
      if (tick > last) { last = tick;
        const s = sim.state;
        checkpoints.push({t:s.t,h:s.altitude,v:s.airspeed,pitchCmd:s.pitchCmd,attitude:s.rigid?.attitudeQ,
          omega:s.rigid?.omegaBody,q:s.q,thrust:s.thrust,mass:s.mass,aoa:s.rigid?.angleOfAttack,beta:s.rigid?.sideslip,sat:s.rigid?.saturated});
      }
    }
    const misses = orbitMisses(sim);
    console.log('RIGID_ACCEPTANCE', id, JSON.stringify({
      model: sim.cfg.dynamics, time: sim.state.t, status: sim.state.status, elements: sim.state.elements,
      maximumRate, maximumNormError, misses, events: sim.events, checkpoints }));
    expect(sim.state.status, JSON.stringify(sim.events.slice(-6))).toBe('orbit');
    expect(misses).toEqual([]);
    expect(sim.events.some(event => event.key === 'evt.targetOrbit')).toBe(true);
    expect(maximumNormError).toBeLessThan(1e-8);
    expect(sim.state.mass).toBeGreaterThan(0);
    expect(sim.debris.length).toBeGreaterThan(0);
    expect(sim.debris.every(debris => !!debris.rigid)).toBe(true);
  }, 600000);
});
