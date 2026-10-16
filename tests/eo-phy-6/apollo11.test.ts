/**
 * EO-PHY-6 (b): Apollo 11, point-mass, from the TLI ignition to the entry
 * interface, bit for bit (R0.4 step 4, M-PHYSICS-002; plan S07 §07.4 step
 * 4(b)). Header, recording and the hex format: tests/eo-phy-6/harness.ts.
 *
 * The flight is the viewer's (`watchMissionSettings('apollo11')`, calm,
 * seed 1), flown from the pad as tests/historical-vehicles.test.ts flies it,
 * one `step(suggestedDt())` at a time. From the step that relights the S-IVB
 * to the one that logs `evt.entryInterface` it keeps `[t, r, v]` in hex at
 * the first step past each whole second after the ignition (one sample a
 * step while steps are longer than a second), and the event log from that
 * step on — key, time and every number of its params, in hex, the params'
 * keys sorted so that their order in a literal does not count. Both are hashed with SHA-256 apart, so
 * a mismatch says which one moved. The targeting the flight does on the way
 * (the midcourse corrections, the rendezvous's CSI/CDH/TPI impulses, the
 * entry corridor) is kept call by call, every number in hex: equal hex is
 * `Object.is` for every number.
 *
 * Measures, never gated (KPI-11, EQ-11): how many times the Moon's and the
 * Sun's ephemerides are evaluated on the way, and the step count.
 */
import { describe, expect, it, vi } from 'vitest';
import { Simulation } from '../../src/physics/simulation';
import { guidanceForVehicle } from '../../src/physics/defaults';
import { vehicleById } from '../../src/data/vehicles';
import { watchMissionSettings } from '../../src/ui/watch-missions';
import { RECORDING, hex, hexDeep, sha256, writeReference } from './harness';
import REF from './ref/apollo11.json';

const seen = vi.hoisted(() => ({ targeting: [] as unknown[], counting: false, moonState: 0, sunState: 0 }));

/** A pass-through that keeps each call's result (the targeting's answers). */
function keep<F extends (...args: never[]) => unknown>(name: string, f: F): F {
  return ((...args: Parameters<F>) => {
    const out = f(...args);
    if (seen.counting) seen.targeting.push([name, hexDeep(out)]); // hex now: a reused scratch result must not alias
    return out;
  }) as F;
}

vi.mock('../../src/physics/lunar/cislunar', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/physics/lunar/cislunar')>();
  return { ...real, targetMidcourse: keep('targetMidcourse', real.targetMidcourse) };
});
vi.mock('../../src/physics/sim/apollo-entry', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/physics/sim/apollo-entry')>();
  return { ...real, targetEntry: keep('targetEntry', real.targetEntry) };
});
vi.mock('../../src/physics/sim/apollo-rendezvous', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/physics/sim/apollo-rendezvous')>();
  return {
    ...real,
    csiImpulse: keep('csiImpulse', real.csiImpulse),
    cdhImpulse: keep('cdhImpulse', real.cdhImpulse),
    interceptImpulse: keep('interceptImpulse', real.interceptImpulse),
  };
});
vi.mock('../../src/physics/lunar/ephemeris', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/physics/lunar/ephemeris')>();
  return {
    ...real,
    moonState: (jd: number) => { if (seen.counting) seen.moonState++; return real.moonState(jd); },
    sunState: (jd: number) => { if (seen.counting) seen.sunState++; return real.sunState(jd); },
  };
});

interface Recorded {
  tliIgnition: string;
  entryInterface: string;
  samples: number;
  stateDigest: string;
  firstSample: string[];
  lastSample: string[];
  events: number;
  eventDigest: string;
  targeting: unknown[];
  measures: { steps: number; moonState: number; sunState: number; seconds?: number };
}

async function fly(): Promise<Recorded> {
  const s = watchMissionSettings('apollo11');
  const sim = new Simulation({
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
    payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
    failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
  }, { headless: true });
  const rows: string[] = [];
  let from = -1, next = 0, steps = 0, tli = Number.NaN;
  const t0 = performance.now();
  for (;;) {
    if (sim.isFailed() || sim.state.t > 800_000) throw new Error(`Apollo 11 did not reach the entry interface: t ${sim.state.t}, failed ${sim.isFailed()}`);
    const before = sim.events.length;
    sim.step(sim.suggestedDt());
    if (from < 0 && sim.apollo.phase === 'tli') {
      from = before;
      tli = sim.state.t;
      next = tli;
      seen.counting = true;
    }
    if (from < 0) continue;
    steps++;
    if (sim.state.t >= next) {
      const { r, v } = sim.state;
      rows.push(JSON.stringify([sim.state.t, r.x, r.y, r.z, v.x, v.y, v.z].map(hex)));
      while (next <= sim.state.t) next += 1;
    }
    if (sim.events.slice(before).some((e) => e.key === 'evt.entryInterface')) break;
  }
  seen.counting = false;
  const seconds = (performance.now() - t0) / 1000;
  const sorted = (p: Record<string, unknown> | undefined) => (p ? Object.fromEntries(Object.entries(p).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : null);
  const events = sim.events.slice(from).map((e) => [e.key, hex(e.t), hexDeep(sorted(e.params))]);
  const entry = sim.events.find((e) => e.key === 'evt.entryInterface')!;
  return {
    tliIgnition: hex(tli),
    entryInterface: hex(entry.t),
    samples: rows.length,
    stateDigest: await sha256(rows.join('\n')),
    firstSample: JSON.parse(rows[0]) as string[],
    lastSample: JSON.parse(rows[rows.length - 1]) as string[],
    events: events.length,
    eventDigest: await sha256(JSON.stringify(events)),
    targeting: seen.targeting,
    measures: { steps, moonState: seen.moonState, sunState: seen.sunState, seconds: +seconds.toFixed(2) },
  };
}

describe('EO-PHY-6 (b): Apollo 11 point-mass, TLI to entry, bit for bit as on the CO-6 base', () => {
  it('flies the same states, events and targeting', async () => {
    const got = await fly();
    if (RECORDING) {
      await writeReference('apollo11.json', { ...got, measures: { ...got.measures, seconds: undefined } });
      return;
    }
    const want = REF as unknown as Recorded;
    console.info(`EO-PHY-6 (b) measures: ${JSON.stringify(got.measures)} (base ${JSON.stringify(want.measures)})`);
    const { measures: _m, ...gotSame } = got;
    const { measures: _w, ...wantSame } = want;
    expect(gotSame).toEqual(wantSame);
    // the run covers what the plan names: the TLI's ignition to the entry interface, targeting on the way
    expect(want.targeting.length).toBeGreaterThan(0);
  }, 300_000);
});
