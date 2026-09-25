/**
 * The two in-flight Soyuz aborts, flown in six-DOF to the crew at rest
 * (roadmap G06): Soyuz MS-10's strap-on striking the core at separation, the
 * fairing's motors pulling the crew away (2018), and Soyuz 18a's stage
 * separation that half-failed, the spacecraft released for a ballistic entry
 * (1975). About a minute.
 *
 * 18a comes out close to the flight: an apogee of 192 km, a landing 1 574 km
 * downrange at 50°50′N 83°25′E, 18–21 g. MS-10 does not: at T+120 s this
 * Soyuz-2.1a is some 16 km higher and 400 m/s faster than MS-10's Soyuz-FG
 * was, so its crew climbs to about 147 km (93 km in 2018), comes down about
 * 505 km downrange (402 km) at about 10.4 g (6.7 g). docs/PHYSICS.md §8.3.
 */
import { describe, expect, it } from 'vitest';
import { crewedSoyuz, flyAbort } from '../abort-harness';

const log = (sim: ReturnType<typeof crewedSoyuz>) => sim.events.map((e) => `${e.t.toFixed(1)} ${e.key} ${JSON.stringify(e.params ?? {})}`).join('\n');

describe('Soyuz MS-10: a strap-on strikes the core', () => {
  it('aborts on the fairing motors three seconds after the strap-ons separate and lands the crew', { timeout: 600_000 }, () => {
    const sim = crewedSoyuz('boosterCollision', 0);
    const { apogee, bodies } = flyAbort(sim);
    const sep = sim.events.find((e) => e.key === 'evt.boosterSep')!;
    const hit = sim.events.find((e) => e.key === 'evt.boosterCollision')!;
    const abort = sim.events.find((e) => e.key === 'evt.abort')!;
    expect(hit?.t, log(sim)).toBeCloseTo(sep.t, 6);
    expect(abort.params?.mode).toBe('fairing');
    expect(abort.t - hit.t).toBeCloseTo(3, 6);
    expect(bodies).toEqual(['head', 'capsule']);
    expect(sim.state.status).toBe('landed');
    expect(apogee).toBeGreaterThan(90e3);
    expect(apogee).toBeLessThan(170e3);
    expect(sim.state.downrange).toBeGreaterThan(350e3);
    expect(sim.state.downrange).toBeLessThan(600e3);
    expect(sim.state.abort!.maxG).toBeGreaterThan(6);
    expect(sim.state.abort!.maxG).toBeLessThan(12);
    expect(sim.state.abort!.touchdownSpeed).toBeLessThan(3);
    for (const key of ['evt.escapeFins', 'evt.escapeCapsule', 'evt.escapeDrogue', 'evt.escapeMain', 'evt.escapeHeatShield', 'evt.escapeSoftLanding', 'evt.abortCrewSafe']) {
      expect(sim.events.some((e) => e.key === key), `${key}\n${log(sim)}`).toBe(true);
    }
  });
});

describe('Soyuz 18a: a stage separation half-fails', () => {
  it('releases the spacecraft for a ballistic entry and lands the crew in the Altai, as in 1975', { timeout: 600_000 }, () => {
    const sim = crewedSoyuz('stagingFailure', 0);
    const { apogee, bodies } = flyAbort(sim);
    const sep = sim.events.find((e) => e.key === 'evt.stageSep')!;
    const abort = sim.events.find((e) => e.key === 'evt.abort')!;
    expect(sim.events.find((e) => e.key === 'evt.stagingFailure')?.t, log(sim)).toBeCloseTo(sep.t, 6);
    expect(abort.params?.mode).toBe('separation');
    expect(bodies).toEqual(['spacecraft', 'capsule']);
    // 18a: an apogee of 192 km, down 1 574 km downrange at 50.83°N 83.42°E, 18–21 g
    expect(apogee).toBeGreaterThan(175e3);
    expect(apogee).toBeLessThan(205e3);
    expect(sim.state.downrange).toBeGreaterThan(1450e3);
    expect(sim.state.downrange).toBeLessThan(1650e3);
    expect(Math.abs(sim.state.lat - 50.83)).toBeLessThan(1);
    expect(Math.abs(sim.state.lon - 83.42)).toBeLessThan(1.5);
    expect(sim.state.abort!.maxG).toBeGreaterThan(15);
    expect(sim.state.abort!.maxG).toBeLessThan(22);
    expect(sim.state.abort!.touchdownSpeed).toBeLessThan(3);
  });
});
