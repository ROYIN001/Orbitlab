import { it } from 'vitest';
import { appendFileSync } from 'node:fs';
const OUT = process.env.PROBE_OUT ?? 'probe-out.txt';
import { Simulation } from '../../src/physics/simulation';
import { vehicleById } from '../../src/data/vehicles';
import { orbitById } from '../../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../../src/physics/defaults';
import { OMEGA_EARTH, R_EARTH } from '../../src/physics/constants';
import { norm, cross, v3 } from '../../src/physics/vec3';
import type { MissionConfig } from '../../src/types';
import { LAUNCH_TIME } from '../fleet-harness';
it('budget', { timeout: 600000 }, () => {
  for (const model of ['sixDof', 'pointMass'] as const) {
  const vehicle = vehicleById('falcon9');
  const cfg = { vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'), launchTime: LAUNCH_TIME,
    guidance: guidanceForVehicle(vehicle, DEFAULT_GUIDANCE, model), guidanceResolved: true, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    dynamics: model === 'sixDof' ? { model: 'sixDof', wind: 'crosswind', seed: 20260919 } : { model: 'pointMass', wind: 'calm', seed: 1 } } as MissionConfig;
  const sim = new Simulation(cfg, { headless: true });
  const v0 = OMEGA_EARTH * (R_EARTH + sim.site.altitude) * Math.cos(sim.site.latitude * Math.PI / 180);
  const vPad = norm(cross(v3(0, 0, OMEGA_EARTH), sim.state.r));
  let worst = 0, at = 0, res = 0, first: string | null = null;
  const rows: string[] = [];
  while (sim.state.t < 150) {
    sim.step(sim.suggestedDt());
    const e = sim.state.eom;
    if (!e || (e.integrator !== 'rigid' && e.integrator !== 'pointMass')) continue;
    const l = e.losses;
    const r = l.dvThrust - l.gravity - l.drag - l.steering - (e.speedEnd - v0);
    if (first === null) first = `t=${sim.state.t.toFixed(2)} r=${r.toFixed(3)} dvT=${l.dvThrust.toFixed(2)} g=${l.gravity.toFixed(3)} speedEnd=${e.speedEnd.toFixed(3)} v0=${v0.toFixed(3)} vPadTrue=${vPad.toFixed(3)}`;
    const b = Math.abs(r) / Math.max(100, l.dvThrust);
    if (Math.floor(sim.state.t / 10) !== Math.floor((sim.state.t - sim.suggestedDt()) / 10)) rows.push(`t=${sim.state.t.toFixed(1)} resid=${r.toFixed(3)} dvT=${l.dvThrust.toFixed(1)} grav=${l.gravity.toFixed(2)} b=${b.toExponential(2)}`);
    if (b > worst) { worst = b; at = sim.state.t; res = r; }
  }
  appendFileSync(OUT, [model, 'worst', worst.toExponential(3), 'at', at.toFixed(2), 'resid', res.toFixed(3), '\nfirst', first, '\n' + rows.join('\n'), '\n'].join(' '));
  }
});
