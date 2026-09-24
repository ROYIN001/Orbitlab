/**
 * Starship Flight 5 in six-DOF, launch to splashdown: Super Heavy caught by
 * the tower's arms, the ship cut off on its 213 × −15 km trajectory, then an
 * hour later flown home belly first on its flaps, flipped upright on its
 * sea-level Raptors and set down on the Indian Ocean. About three minutes.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../../src/physics/simulation';
import { flight5Config, flyHome } from '../ship-descent-harness';

describe('six-DOF Starship Flight 5', () => {
  it('catches the booster and splashes the ship down intact in the Indian Ocean', { timeout: 900_000 }, () => {
    const sim = flyHome(new Simulation(flight5Config('sixDof'), { headless: true }));
    const at = (key: string) => sim.events.find((e) => e.key === key);
    const log = sim.events.map((e) => `${e.t.toFixed(1)} ${e.key} ${JSON.stringify(e.params ?? {})}`).join('\n');
    expect(at('evt.boosterCaught'), log).toBeDefined();
    expect(at('evt.suborbitalTarget'), log).toBeDefined();
    const down = at('evt.shipSplashdown');
    expect(down, log).toBeDefined();
    expect(down!.params!.speed as number).toBeLessThan(3);
    expect(down!.params!.across as number).toBeLessThan(2);
    expect(down!.params!.tilt as number).toBeLessThan(5);
    expect(down!.t).toBeGreaterThan(50 * 60);
    expect(down!.t).toBeLessThan(70 * 60);
    expect(down!.params!.lat as number).toBeGreaterThan(-35);
    expect(down!.params!.lat as number).toBeLessThan(-5);
    expect(down!.params!.lon as number).toBeGreaterThan(60);
    expect(down!.params!.lon as number).toBeLessThan(115);
    expect(sim.state.status).toBe('landed');
    // No flight-model warning on the way home: belly first is what the ship's table is for.
    const cutoff = at('evt.suborbitalTarget')!.t;
    expect(sim.events.filter((e) => e.key === 'evt.aeroEnvelopeExceeded' && e.t > cutoff), log).toEqual([]);
  });
});
