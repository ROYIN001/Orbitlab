/**
 * The two in-flight Soyuz aborts, flown in six-DOF to the crew at rest
 * (roadmap G06): Soyuz MS-10's strap-on striking the core at separation, the
 * fairing's motors pulling the crew away (2018), and Soyuz 18a's stage
 * separation that half-failed, the spacecraft released for a ballistic entry
 * (1975). About a minute.
 *
 * Flown on Soyuz-2.1a's crewed profile (2026-10-01, second pass: the 3.0 m
 * crewed payload section, its refitted programme and the hot staging), which
 * puts the launcher on its flown heights. MS-10's abort comes at T+121.4 s
 * (Roscosmos: T+121.57 s), 3.57 s after the strike (`COLLISION_TO_LOSS`); the
 * crew climbs to 102 km (93 km in 2018) and comes down 411 km downrange
 * (402 km) at 7.9 g (6.7 g): no head mass gives 93 km, the motorless coast
 * alone reaches 97.6 km, and what is left is in the escape's estimates.
 * 18a's crew climbs to 169 km (192 km), comes down 1 535 km downrange at
 * 50.84°N 82.81°E (1 574 km, 50°50′N 83°25′E) at 17.0 g (18–21 g): the 1975
 * 11A511's Blok I pushing the core it could not shed is not modelled.
 * docs/PHYSICS.md §8.3.
 *
 * The bands are regression bands around these figures. Under the zero-lift
 * strap-on turn of audit PHY-01 the apogees were 162 and 206 km; on the
 * first stored programme 108 and 167 km.
 */
import { describe, expect, it } from 'vitest';
import { crewedSoyuz, flyAbort } from '../abort-harness';
import { COLLISION_TO_LOSS } from '../../src/physics/sim/failures';

const log = (sim: ReturnType<typeof crewedSoyuz>) => sim.events.map((e) => `${e.t.toFixed(1)} ${e.key} ${JSON.stringify(e.params ?? {})}`).join('\n');

describe('Soyuz MS-10: a strap-on strikes the core', () => {
  it('aborts on the fairing motors 3.57 s after the strap-ons separate and lands the crew', { timeout: 600_000 }, () => {
    const sim = crewedSoyuz('boosterCollision', 0);
    const { apogee, bodies } = flyAbort(sim);
    const sep = sim.events.find((e) => e.key === 'evt.boosterSep')!;
    const hit = sim.events.find((e) => e.key === 'evt.boosterCollision')!;
    const abort = sim.events.find((e) => e.key === 'evt.abort')!;
    expect(hit?.t, log(sim)).toBeCloseTo(sep.t, 6);
    expect(abort.params?.mode).toBe('fairing');
    expect(abort.t - hit.t).toBeCloseTo(COLLISION_TO_LOSS, 6);
    expect(bodies).toEqual(['head', 'capsule']);
    expect(sim.state.status).toBe('landed');
    // 2018: an apogee of 93 km, down 402 km downrange, 6.7 g
    expect(apogee).toBeGreaterThan(90e3);
    expect(apogee).toBeLessThan(125e3);
    expect(sim.state.downrange).toBeGreaterThan(350e3);
    expect(sim.state.downrange).toBeLessThan(500e3);
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
    expect(apogee).toBeGreaterThan(155e3);
    expect(apogee).toBeLessThan(185e3);
    expect(sim.state.downrange).toBeGreaterThan(1380e3);
    expect(sim.state.downrange).toBeLessThan(1650e3);
    expect(Math.abs(sim.state.lat - 50.83)).toBeLessThan(1);
    expect(Math.abs(sim.state.lon - 83.42)).toBeLessThan(2.2);
    expect(sim.state.abort!.maxG).toBeGreaterThan(15);
    expect(sim.state.abort!.maxG).toBeLessThan(22);
    expect(sim.state.abort!.touchdownSpeed).toBeLessThan(3);
  });
});
