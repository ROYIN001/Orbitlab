/**
 * A computed Apollo 11 flight (the owner's decision of 2026-10-17: another launch flies to the Moon on its own
 * figures, tests/apollo-own-launch.test.ts) that goes wrong on the way stops at a sound state and says so, never at
 * a nonsense one: the lunar orbit insertion only inside the Moon's sphere of influence, on the approach it was
 * planned for; an insertion cut short leaves the flight coasting, not "in a lunar orbit" with no apolune; a flight
 * aimed into the Moon or back into the Earth's air is lost there. Each case is the 13:35:56 launch (the setup
 * panel's window for the flown plane) disturbed at one point, as a failed burn would.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { APOLLO11, RANGE_ZERO_MS } from '../src/data/apollo11';
import { guidanceForVehicle } from '../src/physics/defaults';
import { targetMidcourse } from '../src/physics/lunar/cislunar';
import { add, normalize, scale } from '../src/physics/vec3';
import { watchMissionSettings } from '../src/ui/watch-missions';

const s = watchMissionSettings('apollo11');

function launch(): Simulation {
  return new Simulation({
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: new Date(RANGE_ZERO_MS + 236e3), padId: s.padId,
    payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
    failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
  }, { headless: true });
}

function fly(sim: Simulation, until: number, stop?: () => boolean): Simulation {
  while (!sim.isFailed() && sim.state.status !== 'landed' && sim.state.t < until - 1e-6 && !stop?.()) sim.step(sim.suggestedDt());
  return sim;
}

/** Every number the frame carries is a number. */
const finite = (sim: Simulation) => !JSON.stringify(sim.apollo.frame(), (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? 'NaN' : v)).includes('"NaN"');
const keys = (sim: Simulation, k: string) => sim.events.filter((e) => e.key === k);

describe('a computed flight gone wrong stops at a sound state', () => {
  it('flies no lunar orbit insertion off the approach it was planned for (a midcourse correction 20 m/s off)', { timeout: 120_000 }, () => {
    const sim = fly(launch(), APOLLO11.mcc2.t + 3600);
    expect(keys(sim, 'evt.tliPlanned')).toHaveLength(1);
    expect(keys(sim, 'evt.mcc')).toHaveLength(1);
    sim.state.v = add(sim.state.v, scale(normalize(sim.state.v), 20));
    fly(sim, APOLLO11.loi1.t + 3 * 3600);
    expect(keys(sim, 'evt.burnSkipped').map((e) => e.params?.burn)).toEqual(['LOI']);
    expect(keys(sim, 'evt.loi')).toEqual([]);
    expect(keys(sim, 'evt.lunarOrbit')).toEqual([]);
    expect(sim.apollo.frame()?.lunar).toBeUndefined();
    expect(finite(sim)).toBe(true);
  });

  it('leaves an insertion cut short coasting past the Moon, never in a lunar orbit with no apolune', { timeout: 120_000 }, () => {
    const sim = fly(launch(), APOLLO11.loi1.t + 30);
    expect(sim.apollo.phase).toBe('loi');
    // the service engine stops after 150 m/s, as a failed one would (the burn's own safeguard ends it at 1.5 × its Δv)
    (sim.apollo as unknown as { sps: { dv: number } }).sps.dv = 100;
    fly(sim, APOLLO11.loi1.t + 3600);
    expect(sim.apollo.phase).toBe('coast');
    expect(keys(sim, 'evt.spsCutoff').at(-1)!.severity).toBe('warn');
    expect(keys(sim, 'evt.lunarOrbit')).toEqual([]);
    expect(sim.apollo.frame()?.lunar).toBeUndefined();
    fly(sim, APOLLO11.loi2.t + 3600);
    expect(keys(sim, 'evt.circularize')).toEqual([]);
    expect(finite(sim)).toBe(true);
  });

  it('is lost on the Moon\'s ground when its correction aims it 20 km below the surface', { timeout: 120_000 }, () => {
    const sim = fly(launch(), APOLLO11.mcc2.t + 3600);
    const aim = { perilune: -20e3, time: APOLLO11.mcc2.arrival, lat: APOLLO11.mcc2.lat };
    const dv = targetMidcourse(sim.plan.jd0, sim.state.t, { r: sim.state.r, v: sim.state.v }, aim)!;
    expect(dv).not.toBeNull();
    sim.state.v = add(sim.state.v, dv);
    fly(sim, APOLLO11.loi1.t + 3600);
    expect(keys(sim, 'evt.burnSkipped').map((e) => e.params?.burn)).toEqual(['LOI']);
    expect(keys(sim, 'evt.loi')).toEqual([]);
    expect(keys(sim, 'evt.impact')).toHaveLength(1);
    expect(sim.isFailed()).toBe(true);
  });

  it('is lost in the Earth\'s air when it falls back short of the Moon', { timeout: 120_000 }, () => {
    const sim = fly(launch(), 16_000);
    expect(sim.apollo.phase).toBe('extracted');
    // 3 km/s taken off the way out: the perigee now inside the air
    sim.state.v = add(sim.state.v, scale(normalize(sim.state.v), -3000));
    fly(sim, 16_000 + 2 * 86400);
    expect(keys(sim, 'evt.stackReentry')).toHaveLength(1);
    expect(sim.isFailed()).toBe(true);
  });
});
