/**
 * Separated hardware starts where the stack let it go (src/physics/sim/debris.ts,
 * `DebrisTracker.stepDebris`). The fairing halves are dropped once a step has
 * moved the stack to the step's end (`Staging.checkFairing`), and the point-mass
 * debris used to fly every live piece a whole step after that, the newborn
 * halves included: they appeared 224 m ahead of a crewed Soyuz-2.1a and 616 m
 * ahead of a 2.1b, and were never seen opening round the payload. Strap-ons
 * and stages, let go of at a step's start, fly the whole step as before; the
 * rocket a crewed Soyuz leaves behind when its escape fires inside a step
 * (`Simulation.destroy` -> `Escape.shedRocket`, the stack at the step's end)
 * flew a step ahead too. Point-mass flights, as tests/anatomy.test.ts flies them.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, guidanceForVehicle } from '../src/physics/defaults';
import { addScaled, cross, dist, normalize } from '../src/physics/vec3';
import type { Vec3 } from '../src/physics/vec3';
import { crewedSoyuz } from './abort-harness';

const simulation = (vehicleId: string, satelliteId: string, orbitId: string) => new Simulation({
  vehicleId, satelliteId, siteId: 'baikonur', orbit: orbitById(orbitId),
  launchTime: new Date('2026-09-22T15:00:00Z'), guidance: guidanceForVehicle(vehicleById(vehicleId), undefined, 'pointMass'),
  guidanceResolved: true, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
}, { headless: true });

describe('separated hardware starts at its release point', () => {
  it.each([['soyuz21a', 'crew', 'iss', 153.3], ['soyuz21a', 'progress', 'iss', 183.2], ['soyuz21b', 'weather', 'sso', 208.4]] as const)(
    '%s %s: the fairing halves beside the stack, the strap-ons and Blok A as before', (vehicleId, satelliteId, orbitId, sepTime) => {
      const sim = simulation(vehicleId, satelliteId, orbitId);
      const f = sim.vehicleSpec.fairing!;
      /** each piece where it was first seen, and the stack then */
      const first = new Map<number, { t: number; r: Vec3; stack: Vec3 }>();
      /** …and how much farther from the stack it was one step later, m */
      const next = new Map<number, number>();
      let halvesAt: number | undefined;
      let parted: { after: number; apart: number } | undefined;
      while (!sim.done && sim.state.t < 300) {
        sim.step(sim.suggestedDt());
        const s = sim.state;
        for (const d of sim.debris) {
          const seen = first.get(d.id);
          if (!seen) {
            first.set(d.id, { t: s.t, r: { ...d.r }, stack: { ...s.r } });
            if (d.visual.kind !== 'fairing') continue;
            halvesAt ??= s.t;
            // where spawnFairing lays it: beside the stack, half the diameter and a metre out, parting at 2.5 m/s
            const side = normalize(cross(normalize(s.dir), normalize(s.r)));
            const off = f.diameter / 2 + 1;
            expect(Math.min(dist(d.r, addScaled(s.r, side, off)), dist(d.r, addScaled(s.r, side, -off)))).toBeLessThan(10);
            expect(dist(d.v, s.v)).toBeCloseTo(2.5, 1);
          } else if (!next.has(d.id) && s.t > seen.t) next.set(d.id, dist(d.r, s.r) - dist(seen.r, seen.stack));
        }
        if (halvesAt !== undefined && !parted && s.t >= halvesAt + 5) {
          const [a, b] = sim.debris.filter((d) => d.visual.kind === 'fairing');
          parted = { after: s.t - halvesAt, apart: dist(a.r, b.r) - (f.diameter + 2) };
        }
      }
      expect(halvesAt).toBeGreaterThanOrEqual(sepTime);
      expect(halvesAt).toBeLessThan(sepTime + 0.5);
      expect(sim.debris.filter((d) => d.visual.kind === 'fairing')).toHaveLength(2);
      // five seconds on, the halves have parted at 2.5 m/s each
      expect(Math.abs(parted!.apart - 5 * parted!.after)).toBeLessThan(1);
      // the four strap-ons beside the core, and Blok A at the stack's base, flying the step after with it
      const boosters = sim.debris.filter((d) => d.visual.kind === 'booster');
      const core = sim.debris.filter((d) => d.visual.kind === 'stage' && d.name.startsWith('Blok A'));
      expect(boosters).toHaveLength(4);
      expect(core).toHaveLength(1);
      const strapOn = vehicleById(vehicleId).stages[0].boosters![0];
      for (const d of boosters) {
        const seen = first.get(d.id)!;
        expect(dist(seen.r, seen.stack)).toBeCloseTo(strapOn.diameter + 2, 1);
        expect(Math.abs(next.get(d.id)!)).toBeLessThan(1);
      }
      expect(dist(first.get(core[0].id)!.r, first.get(core[0].id)!.stack)).toBeLessThan(1);
      expect(Math.abs(next.get(core[0].id)!)).toBeLessThan(1);
    }, 60_000);

  it.each([[1, 'evt.structuralFailure'], [20, 'evt.rangeSafety']] as const)(
    'a crewed abort set off inside a step (engine out at T+%d, %s): Blok A and Blok I start at the stack', (time, cause) => {
      const sim = crewedSoyuz('engineOut', time, 'pointMass');
      while (!sim.state.abort && !sim.done && sim.state.t < 300) sim.step(sim.suggestedDt());
      expect(sim.events.find((e) => e.key === 'evt.abort')?.t).toBe(sim.events.find((e) => e.key === cause)?.t);
      // the stages hang below the ship by their tops, 6–15 m from it (55–127 m, a step ahead, before)
      const stages = sim.debris.filter((d) => d.visual.kind === 'stage');
      expect(stages.map((d) => d.name.slice(0, 6))).toEqual(['Blok A', 'Blok I']);
      for (const d of stages) {
        expect(d.createdAt).toBe(sim.state.t);
        expect(dist(d.r, sim.state.r)).toBeLessThan(20);
      }
    }, 60_000);
});
