/**
 * Apollo 11 flies to the Moon from any launch the model can really fly (roadmap C01): the owner's decision of
 * 2026-10-17 (docs/DECISIONS.md, "Apollo 11 dates"), verbatim "ถ้าบินได้จริงในทางฟิสิกส์ในอนุญาตให้บินได้แต่คำนวนเส้นทาง
 * และค่าต่างๆตามจริง" — a launch the model can really fly is allowed to fly to the Moon, its trajectory and figures
 * computed for that launch, not replayed. It replaces the one-second rule of 1293372. Apollo 11's own launch, at
 * range zero into the flown parking orbit, flies the injection flown; another one has its injection worked out for
 * it (`ApolloFlight.planInjection`, src/physics/sim/tli-target.ts) and flies on from there. A launch that cannot be
 * flown stays in its parking orbit, and says why: another spacecraft; a mission running past the Moon's table; no
 * injection found from its parking orbit; or none the S-IVB has the propellant for. Before the rule such launches
 * flew the lunar profile anyway and logged a lunar orbit insertion tens of thousands of kilometres from the Moon.
 * The Moon's table holds Apollo 11's week only (D-11; the owner's answer 8.2 (ข) of 2026-10-18), so the whole
 * mission fits in it for launches from 13:32:00 to 13:40:45 UTC on 16 July 1969 alone, the parking orbit edited or
 * not; the cases below that fly, or stop for want of an injection, are launched in that window.
 * The figures: docs/development/reports/argon4-fu-apollo.md.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { APOLLO11, RANGE_ZERO_MS } from '../src/data/apollo11';
import { guidanceForVehicle } from '../src/physics/defaults';
import { captureFrame } from '../src/physics/frame';
import { watchMissionById, watchMissionSettings } from '../src/ui/watch-missions';
import type { OrbitSpec } from '../src/types';

const s = watchMissionSettings('apollo11');

function launch(change: { launchTime?: Date; vehicleId?: string; satelliteId?: string; orbit?: Partial<OrbitSpec> }): Simulation {
  const vehicleId = change.vehicleId ?? s.vehicleId;
  return new Simulation({
    vehicleId, satelliteId: change.satelliteId ?? s.satelliteId, siteId: s.siteId, orbit: { ...s.orbit, ...change.orbit } as OrbitSpec,
    launchTime: change.launchTime ?? s.launchTime, padId: s.padId,
    ...(change.satelliteId ? {} : { payloadMassOverride: s.payloadMass }),
    guidance: guidanceForVehicle(vehicleById(vehicleId), undefined, 'pointMass'), guidanceResolved: true,
    failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
  }, { headless: true });
}

/** To `until`, as the app steps it; Apollo's flight goes on past the parking orbit, where `done` is already true. */
function fly(sim: Simulation, until: number): Simulation {
  while (!sim.isFailed() && sim.state.status !== 'landed' && (!sim.done || sim.apollo.active) && sim.state.t < until - 1e-6) sim.advance(until - sim.state.t, 100_000);
  return sim;
}

const at = (minutes: number) => new Date(RANGE_ZERO_MS + minutes * 60e3);
const lunarKeys = ['evt.tli', 'evt.tliShort', 'evt.loi', 'evt.lunarOrbit'];
const why = ['evt.lunarProfileOff', 'evt.tliUnsolved', 'evt.tliPropellant'];

describe('Apollo 11\'s lunar profile: its own launch as flown, another computed for itself, or none', () => {
  it('counts from range zero, the second the flight was launched', () => {
    expect(RANGE_ZERO_MS).toBe(new Date(watchMissionById('apollo11')!.launchTime!).getTime());
  });

  it('starts from the parking orbit on the day as flown, its injection the flown one', { timeout: 120_000 }, () => {
    const sim = fly(launch({}), 800);
    expect(sim.apollo.active).toBe(true);
    expect(sim.events.filter((e) => why.includes(e.key) || e.key === 'evt.tliPlanned')).toEqual([]);
  });

  // launches the model cannot fly to the Moon: each stays in its parking orbit with the reason
  for (const [name, change, key] of [
    ['launched in 2026, outside the Moon\'s table', { launchTime: new Date('2026-07-16T13:32:00Z') }, 'evt.lunarProfileOff'],
    ['launched on 24 July 1969, its mission running past the table\'s end', { launchTime: new Date('1969-07-24T13:32:00Z') }, 'evt.lunarProfileOff'],
    ['flown on another Saturn V with another spacecraft', { vehicleId: 'saturnv', satelliteId: 'crew' }, 'evt.lunarProfileOff'],
    ['launched at 13:40:46, a second too late for its mission to end inside the table', { launchTime: new Date('1969-07-16T13:40:46Z') }, 'evt.lunarProfileOff'],
    ['launched forty minutes late, its mission past the table\'s end', { launchTime: at(40) }, 'evt.lunarProfileOff'],
    ['launched at range zero for a 29° parking orbit, the ascent off the plane and the S-IVB with less Δv left than an injection takes', { orbit: { inclination: 29 } }, 'evt.tliUnsolved'],
    ['launched at range zero into a parking plane its node at 1.0°, not 359.6°, the turn into the Moon\'s plane past the steering\'s yaw', { orbit: { raan: 1 } }, 'evt.tliUnsolved'],
    ['launched at range zero into a 300 km parking orbit, the S-IVB short of propellant for the injection it needs', { orbit: { perigee: 300e3, apogee: 300e3 } }, 'evt.tliPropellant'],
  ] as const) {
    it(`stays in its parking orbit, and says why, when ${name}`, { timeout: 120_000 }, () => {
      const sim = fly(launch(change), 10_500);
      expect(sim.apollo.active).toBe(false);
      expect(sim.events.filter((e) => why.includes(e.key)).map((e) => e.key)).toEqual([key]);
      expect(sim.events.filter((e) => lunarKeys.includes(e.key))).toEqual([]);
      expect(captureFrame(sim).apollo).toBeUndefined();
      if (key === 'evt.tliPropellant') {
        const p = sim.events.find((e) => e.key === key)!.params as { kg: number; need: number };
        expect(p.kg).toBeLessThan(p.need);
      }
    });
  }

  it('plans its own injection when launched at 13:40:45, the last second whose mission ends inside the table', { timeout: 120_000 }, () => {
    const sim = fly(launch({ launchTime: new Date('1969-07-16T13:40:45Z') }), 10_500);
    expect(sim.apollo.active).toBe(true);
    expect(sim.events.filter((e) => why.includes(e.key))).toEqual([]);
    expect(sim.events.filter((e) => e.key === 'evt.tliPlanned')).toHaveLength(1);
  });
});

describe('a launch the model can fly: 13:35:56, the setup panel\'s window for the flown plane, computed to the Moon and home', () => {
  const sim = launch({ launchTime: at(3 + 56 / 60) });
  const ev = (key: string) => sim.events.filter((e) => e.key === key);
  const num = (key: string, p: string, n = 0) => Number((ev(key)[n]?.params as Record<string, number> | undefined)?.[p]);

  it('plans its own injection, flies it with propellant to spare, and leaves on the conic it planned', { timeout: 120_000 }, () => {
    // past the LM's extraction, 4:16:59 after a flown restart
    fly(sim, 15_500);
    expect(ev('evt.tliPlanned')).toHaveLength(1);
    expect(ev('evt.tli')).toHaveLength(1);
    expect(ev('evt.tliShort')).toEqual([]);
    expect(num('evt.tliPlanned', 'kg')).toBeGreaterThan(0);
    // the cut-off lands on the planned energy to within its last step (0.01 s at 14 m/s², 0.1 m/s at 10.9 km/s:
    // 0.003 km²/s²) and the plan's figure is rounded to 0.001
    expect(Math.abs(num('evt.tli', 'c3') - num('evt.tliPlanned', 'c3'))).toBeLessThan(0.005);
    // out of the S-IVB, on the way to the perilune it was aimed at (60 n mi, 75:53:35): within 150 km and 5 minutes
    expect(ev('evt.lmExtraction')).toHaveLength(1);
    const p = sim.apollo.frame()!.perilune!;
    expect(Math.abs(p.alt - APOLLO11.mcc2.perilune)).toBeLessThan(150e3);
    expect(Math.abs(p.t - APOLLO11.mcc2.arrival)).toBeLessThan(300);
  });

  it('needs a midcourse correction of metres a second, and goes into lunar orbit inside the Moon\'s sphere of influence', { timeout: 120_000 }, () => {
    fly(sim, APOLLO11.loi2.t + 3600);
    expect(ev('evt.mcc')).toHaveLength(1);
    expect(num('evt.mcc', 'dv')).toBeLessThan(10);
    const soi = ev('evt.lunarSoi')[0], loi = ev('evt.loi')[0];
    expect(soi.t).toBeLessThan(loi.t);
    expect(ev('evt.burnSkipped')).toEqual([]);
    // 169.7 × 60.0 n mi aimed at (314 × 111 km), then rounded off
    expect(num('evt.lunarOrbit', 'pe')).toBeGreaterThan(80);
    expect(num('evt.lunarOrbit', 'pe')).toBeLessThan(140);
    expect(Number.isFinite(num('evt.lunarOrbit', 'ap'))).toBe(true);
    expect(sim.apollo.phase).toBe('lunarOrbit');
  });

  it('lands at Tranquility Base and comes home to its own recovery point', { timeout: 120_000 }, () => {
    fly(sim, 800_000);
    expect(num('evt.lmEngineOff', 'miss')).toBeLessThan(50);
    expect(ev('evt.burnSkipped')).toEqual([]);
    expect(ev('evt.tei')).toHaveLength(1);
    const ei = ev('evt.entryInterface')[0].params as { fpa: number };
    expect(ei.fpa).toBeGreaterThan(-7.5);
    expect(ei.fpa).toBeLessThan(-5.5);
    expect(sim.apollo.phase).toBe('splashdown');
    expect(sim.events.filter((e) => e.severity === 'warn' || e.severity === 'fail')).toEqual([]);
  });
});
