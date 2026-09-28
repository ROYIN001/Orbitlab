/**
 * The test stand (roadmap D04), src/design/static-fire.ts, held to what the
 * engine model and the data promise.
 *
 * The stand is the flight's own `VehicleModel`, so most of what is checked
 * here are identities of that model that a firing must reproduce: the vacuum
 * and sea-level thrust exactly, every newton-second paid for at the delivered
 * Isp, the start-up and tail-off integrals in closed form (vehicle.ts,
 * `riseIntegral` and `tailoffFactor`). The rest is held to PUBLISHED numbers:
 * the burn times of tests/data-consistency.test.ts and the solid-motor peaks
 * tabulated with their sources in src/data/vehicles.ts.
 *
 * Every tolerance below was fixed before the comparison it bounds was run,
 * and each says where it comes from.
 */
import { describe, expect, it } from 'vitest';
import { staticFire } from '../src/design/static-fire';
import { VEHICLES } from '../src/data/vehicles';
import { G0, P0 } from '../src/physics/constants';
import {
  engineMassFlow, engineStartupS, engineTailoffS, TAILOFF_SPAN,
} from '../src/physics/vehicle';
import type { EngineSpec } from '../src/types';

const rel = (a: number, b: number): number => Math.abs(a / b - 1);

/**
 * The effective exhaust velocity G0·Isp(p), N·s/kg, worked out here from the
 * data rather than taken from the engine model the stand runs on: the thrust
 * falls linearly from the vacuum figure to the sea-level one as the pressure
 * rises to P0 (a vacuum-only engine keeps its vacuum figure, since its
 * sea-level pair is a placeholder), and the mass flow is the vacuum pair's,
 * thrustVac/(G0·ispVac), at every pressure (src/physics/vehicle.ts documents
 * that convention; this restates it independently of its code).
 */
function exhaustVelocity(e: EngineSpec, p: number): number {
  const seaLevel = e.vacuumOnly ? e.thrustVac : e.thrustSL;
  const thrust = e.thrustVac - (e.thrustVac - seaLevel) * Math.min(1, p / P0);
  return thrust / (e.thrustVac / (G0 * e.ispVac));
}

/** Every engine installation in the fleet, once per distinct object, with the propellant it burns and where. */
function installations(): { owner: string; engine: EngineSpec; propellant: number; groundLit: boolean }[] {
  const seen = new Set<EngineSpec>();
  const out: { owner: string; engine: EngineSpec; propellant: number; groundLit: boolean }[] = [];
  for (const v of VEHICLES) {
    v.stages.forEach((st, i) => {
      const parts = [{ owner: `${v.id}/${st.id}`, engine: st.engine, propellant: st.propellantMass, groundLit: i === 0 },
        ...(st.boosters ?? []).map((b) => ({ owner: `${v.id}/${st.id}/${b.id}`, engine: b.engine, propellant: b.propellantMass, groundLit: true }))];
      for (const p of parts) {
        if (seen.has(p.engine)) continue;
        seen.add(p.engine);
        out.push(p);
      }
    });
  }
  return out;
}

const merlin = VEHICLES.find((v) => v.id === 'falcon9')!.stages[0].engine;
const p120c = VEHICLES.find((v) => v.id === 'vegac')!.stages[0].engine;
const centaurRl10 = VEHICLES.find((v) => v.id === 'atlasv551')!.stages[1].engine;

describe('test stand · refusals and inputs', () => {
  it('refuses a vacuum-only engine at any pressure above zero, and fires it in a vacuum cell', () => {
    expect(centaurRl10.vacuumOnly).toBe(true);
    for (const p of [1, 1000, P0]) {
      const r = staticFire(centaurRl10, { count: 1, propellantKg: 1000, pressurePa: p, throttle: 1, dt: 0.1 });
      expect(r.refused).toBe('vacuumOnlyAtPressure');
      expect(r.samples).toEqual([]);
      expect(r.impulse).toBe(0);
    }
    const vac = staticFire(centaurRl10, { count: 1, propellantKg: 1000, pressurePa: 0, throttle: 1, dt: 0.1 });
    expect(vac.refused).toBeUndefined();
    expect(vac.impulse).toBeGreaterThan(0);
  });

  it('refuses to shut a solid motor down, and burns it to depletion otherwise', () => {
    expect(staticFire(p120c, { count: 1, propellantKg: 1000, pressurePa: 0, throttle: 1, cutoffS: 5, dt: 0.1 }).refused).toBe('solidShutdown');
    expect(staticFire(p120c, { count: 1, propellantKg: 1000, pressurePa: 0, throttle: 1, dt: 0.1 }).refused).toBeUndefined();
  });

  it('rejects inputs no stand could run', () => {
    const ok = { count: 1, propellantKg: 1000, pressurePa: 0, throttle: 1, dt: 0.1 };
    for (const bad of [{ count: 0 }, { count: 1.5 }, { propellantKg: 0 }, { pressurePa: -1 }, { throttle: 0 }, { throttle: 1.2 },
      { dt: 0 }, { dt: Number.NaN }, { cutoffS: 0 }]) {
      expect(() => staticFire(merlin, { ...ok, ...bad }), JSON.stringify(bad)).toThrow(RangeError);
    }
  });
});

describe('test stand · the engine model reproduced', () => {
  /**
   * At steady state (start-up over, tank far from empty, full throttle) the
   * stand delivers `count · thrustVac` in a vacuum cell and `count · thrustSL`
   * at standard sea-level pressure, EXACTLY: `engineThrust` is
   * F_vac − (F_vac − F_SL)·(p/P0), which at p = 0 is F_vac with no rounding and
   * at p = P0 is F_SL with none either (F_vac − F_SL is exact by Sterbenz's
   * lemma for F_SL ≥ F_vac/2, and the second subtraction then returns the
   * representable F_SL). Isp is a quotient of two rounded numbers, so it is
   * held to 1e-12 relative, fixed before running.
   *
   * Liquid engines only: a solid has no steady state (its regressive profile
   * moves every step); solids are held to their peak and burn time below.
   */
  it('gives thrustVac and ispVac in vacuum and thrustSL at sea level, at steady state', () => {
    let checked = 0;
    for (const { owner, engine: e } of installations()) {
      if (e.solid) continue;
      const pressures = e.vacuumOnly ? [0] : [0, P0];
      for (const p of pressures) {
        const r = staticFire(e, { count: e.count, propellantKg: 1e6, pressurePa: p, throttle: 1, cutoffS: 5, dt: 0.1 });
        const steady = r.samples.filter((s) => s.t >= engineStartupS(e) && s.t + s.dt <= 5);
        expect(steady.length, owner).toBeGreaterThan(10);
        for (const s of steady) {
          expect(s.thrust, `${owner} at ${p} Pa`).toBe(e.count * (p === 0 ? e.thrustVac : e.thrustSL));
          if (p === 0) expect(rel(s.isp, e.ispVac), `${owner} Isp`).toBeLessThan(1e-12);
        }
        checked++;
      }
    }
    // the fleet's liquids, most at both pressures (the vacuum-only ones at 0 only)
    expect(checked).toBeGreaterThan(60);
  });

  /**
   * The delivered sea-level Isp is back-solved from `thrustSL` and the vacuum
   * mass flow (vehicle.ts, `engineIsp`), so it need not equal the `ispSL` a
   * data file quotes. The bound is tests/physics-core.test.ts's 8 %, the
   * fleet's measured worst case, and the engines more than 2 % off must be
   * exactly the four that test names — the stand has to agree with it, not
   * find a different list. Ground-lit engines only (the first stage and its
   * strap-ons), as there: an upper stage's sea-level pair may be a placeholder.
   */
  it('delivers each ground-lit engine’s sea-level Isp within 8 % of the quoted ispSL, with the four known exceptions', () => {
    const off: string[] = [];
    for (const { owner, engine: e, groundLit } of installations()) {
      if (!groundLit || e.vacuumOnly) continue;
      const r = staticFire(e, { count: e.count, propellantKg: 1e6, pressurePa: P0, throttle: 1, ...(e.solid ? {} : { cutoffS: 5 }), dt: 0.1 });
      const s = r.samples[Math.floor(r.samples.length / 2)];
      expect(rel(s.isp, exhaustVelocity(e, P0) / G0), `${owner}: the stand is the model`).toBeLessThan(1e-12);
      const err = rel(s.isp, e.ispSL);
      expect(err, `${owner} ${e.name}: delivers ${s.isp.toFixed(1)} s against a quoted ${e.ispSL} s`).toBeLessThan(0.08);
      if (err > 0.02) off.push(`${e.name} ${(err * 100).toFixed(1)} %`);
    }
    expect([...new Set(off)].sort()).toEqual(['RD-108A 6.9 %', 'Raptor 2 2.4 %', 'Rutherford 2.6 %', 'Vulcain 2.1 5.0 %']);
  });

  /**
   * Impulse = propellant burned × G0·Isp(p), whatever the step, the pressure,
   * the engine kind or the part of the burn (start-up, the burn, the depletion
   * shutdown and its tail-off): thrust and flow are one level times F(p) and
   * ṁ. The invariant of tests/engine-transients.test.ts, through the stand.
   * 1e-9 relative, fixed before running (rounding over up to 10⁵ steps).
   */
  it('pays for every newton-second at the delivered Isp, and empties the tank', () => {
    const cases: [string, EngineSpec, number][] = [
      ['Merlin 1D, vacuum', merlin, 0], ['Merlin 1D, sea level', merlin, P0],
      // between the two, where the pressure blend is not at an end point (added in review)
      ['Merlin 1D, 40 kPa', merlin, 40e3], ['P120C, 40 kPa', p120c, 40e3],
      ['P120C, vacuum', p120c, 0], ['P120C, sea level', p120c, P0],
      ['RL10 (vacuum-only), vacuum', centaurRl10, 0],
    ];
    for (const [name, e, p] of cases) {
      for (const dt of [0.01, 0.1, 0.5]) {
        const load = 20 * e.count * engineMassFlow(e) + 1234.5;
        const r = staticFire(e, { count: e.count, propellantKg: load, pressurePa: p, throttle: 1, dt });
        expect(rel(r.impulse / r.propellantUsed, exhaustVelocity(e, p)), `${name}, dt ${dt}`).toBeLessThan(1e-9);
        expect(load - r.propellantUsed, `${name}, dt ${dt}: tank left`).toBeLessThan(1e-6 * load);
      }
    }
  });

  /**
   * Closed forms from vehicle.ts: the smoothstep start-up x²(3 − 2x) integrates
   * to half its length, so a burn cut at t_c delivers F·(t_c − T_start/2) up to
   * the cut; the tail-off exp(−t/τ), stopped at `TAILOFF_SPAN` τ, delivers
   * F·τ·(1 − e⁻⁵) after it. Both exact whatever the step (the model averages
   * each step analytically), so 1e-9 relative, fixed before running. On a fleet
   * engine and on one that sets its own transients.
   */
  it('loses T_start/2 of full thrust to the start-up and adds F·τ·(1 − e⁻⁵) in the tail-off', () => {
    const custom: EngineSpec = { name: 'Test engine', count: 3, thrustSL: 400e3, thrustVac: 450e3, ispSL: 280, ispVac: 315, minThrottle: 0.5, startupS: 2.5, tailoffS: 0.6 };
    for (const e of [merlin, custom]) {
      const F = e.count * e.thrustVac, T = engineStartupS(e), tau = engineTailoffS(e);
      for (const [dt, cut] of [[0.01, 10], [0.1, 10], [0.3, 10], [1, 7.25]] as const) {
        const r = staticFire(e, { count: e.count, propellantKg: 1e6, pressurePa: 0, throttle: 1, cutoffS: cut, dt });
        const before = r.samples.filter((s) => s.t < cut).reduce((a, s) => a + s.thrust * s.dt, 0);
        const after = r.samples.filter((s) => s.t >= cut).reduce((a, s) => a + s.thrust * s.dt, 0);
        expect(rel(before, F * (cut - T / 2)), `${e.name}, dt ${dt}: start-up`).toBeLessThan(1e-9);
        expect(rel(after, F * tau * (1 - Math.exp(-TAILOFF_SPAN))), `${e.name}, dt ${dt}: tail-off`).toBeLessThan(1e-9);
        expect(r.burnTime).toBe(cut);
        // The firing ends with the step in which the tail-off does, so its
        // duration is the tail-off's end rounded up to the step. (Corrected
        // after the first run, which expected the end of the tail-off itself
        // and got 11.30 s for 11.25 s at a 0.3 s step: an error in this test's
        // expectation, not in the model.)
        const end = cut + TAILOFF_SPAN * tau;
        expect(r.duration, `${e.name}, dt ${dt}: duration`).toBeGreaterThanOrEqual(end - 1e-9);
        expect(r.duration, `${e.name}, dt ${dt}: duration`).toBeLessThan(end + dt);
      }
    }
  });

  it('flies a throttled burn at the clamped level, with the Isp unchanged', () => {
    // Merlin 1D throttles to 0.4 (vehicles.ts); asking for 0.2 gets 0.4, asking
    // for 0.7 gets 0.7. The Isp does not depend on throttle in this model.
    expect(merlin.minThrottle).toBeDefined();
    for (const [cmd, level] of [[0.2, merlin.minThrottle!], [0.7, 0.7]] as const) {
      const r = staticFire(merlin, { count: 1, propellantKg: 1e5, pressurePa: 0, throttle: cmd, cutoffS: 5, dt: 0.1 });
      const s = r.samples.find((x) => x.t >= 2)!;
      expect(rel(s.thrust, level * merlin.thrustVac)).toBeLessThan(1e-12);
      expect(rel(s.isp, merlin.ispVac)).toBeLessThan(1e-12);
    }
  });
});

// ---------------------------------------------------------------------------
// Against published figures
// ---------------------------------------------------------------------------

/**
 * `PUBLISHED_BURN_TIME`, read from tests/data-consistency.test.ts's own
 * source rather than copied, so the stand is held to exactly the table the
 * fleet data is held to (every key, including any added later) without the
 * table moving out of the file its owner keeps it in.
 */
const DATA_CONSISTENCY = import.meta.glob('./data-consistency.test.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
function publishedBurnTimes(): Record<string, number> {
  const src = Object.values(DATA_CONSISTENCY)[0] ?? '';
  const block = /const PUBLISHED_BURN_TIME: Record<string, number> = \{([\s\S]*?)\n\};/.exec(src)?.[1] ?? '';
  const table: Record<string, number> = {};
  for (const m of block.matchAll(/^\s*'([^']+)':\s*([0-9.]+),/gm)) table[m[1]] = Number(m[2]);
  // every entry line was understood: none in a form the pattern skips
  expect(Object.keys(table).length).toBe(block.split('\n').filter((l) => /^\s*'/.test(l)).length);
  return table;
}

describe('test stand · published burn times and solid-motor peaks', () => {
  /**
   * Every published burn time, fired on the stand at full throttle to
   * depletion, within the fleet's 10 % (data-consistency.test.ts's bound,
   * fixed there). `burnTime` runs to the depletion sensor's trip, so it is the
   * data's propellant/flow plus half the start-up and less the tail-off reserve
   * (vehicle.ts: `riseIntegral`, `tailoffReserve`); that closed form is
   * asserted too, to within the 0.1 s step plus 0.01 s (an estimate of the
   * second-order coupling between a solid's start-up and its regressive
   * profile, fixed before running).
   */
  it('burns within 10 % of every published burn time, and as the closed form says', () => {
    const table = publishedBurnTimes();
    // 20 entries when this was written, so a parse that finds nothing cannot
    // pass. (First written as 21 from a miscount; the table has 20 keys.)
    expect(Object.keys(table).length).toBeGreaterThanOrEqual(20);
    const dt = 0.1;
    const report: string[] = [];
    for (const [key, published] of Object.entries(table)) {
      const [vid, sid, bid] = key.split('/');
      const st = VEHICLES.find((v) => v.id === vid)?.stages.find((s) => s.id === sid);
      const part = bid === undefined ? st : st?.boosters?.find((b) => b.id === bid);
      expect(part, `${key} names nothing`).toBeDefined();
      const e = part!.engine;
      const r = staticFire(e, { count: e.count, propellantKg: part!.propellantMass, pressurePa: 0, throttle: 1, dt });
      const err = rel(r.burnTime, published);
      report.push(`${key} ${r.burnTime.toFixed(1)} s vs ${published} s (${(err * 100).toFixed(1)} %)`);
      expect(err, `${key}: ${r.burnTime.toFixed(1)} s on the stand against ${published} s published`).toBeLessThanOrEqual(0.1);
      const closed = part!.propellantMass / (e.count * engineMassFlow(e)) + engineStartupS(e) / 2
        - engineTailoffS(e) * (1 - Math.exp(-TAILOFF_SPAN));
      expect(Math.abs(r.burnTime - closed), `${key}: closed form`).toBeLessThanOrEqual(dt + 0.01);
    }
    expect(report.length).toBe(Object.keys(table).length);
  });

  /**
   * The published peak thrust of every solid motor in the fleet, from the
   * table in src/data/vehicles.ts (motor, published peak, and the sources
   * listed under it: Wikipedia's Vega C, Graphite-Epoxy Motor, H3, PSLV and
   * H-IIA pages), in kN.
   *
   * Two bounds, both fixed before running:
   * - the DATA: thrustVac · peakFactor within 0.5 % of the published peak.
   *   `peakFactor` is the published ratio rounded to two decimals, which is
   *   off by at most 0.005/1.16 = 0.43 % (Zefiro 40 has the smallest factor);
   * - the STAND: its peak within 1 % of the published peak and never above
   *   the head of the profile. The stand's peak is lower than the head by the
   *   grain burned during the 0.3 s start-up (an estimate of 0.1–0.3 %), on
   *   top of the rounding.
   */
  const PUBLISHED_PEAK_KN: Record<string, number> = {
    'P120C': 4323, 'Zefiro 40': 1304, 'Zefiro 9': 317, 'SRB-A3': 2260, 'SRB-3': 2300,
    'GEM-63': 1649.6, 'GEM-63XL': 2061, 'S139': 4846.9, 'PSOM-XL': 703.5, 'HPS3': 250,
  };

  it('peaks at each solid motor’s published peak thrust', () => {
    const solids = installations().filter((i) => i.engine.solid);
    // every solid in the fleet has a published peak, and every published peak a motor
    expect([...new Set(solids.map((s) => s.engine.name))].sort()).toEqual(Object.keys(PUBLISHED_PEAK_KN).sort());
    for (const { owner, engine: e, propellant } of solids) {
      const published = PUBLISHED_PEAK_KN[e.name] * 1000;
      const head = e.thrustVac * e.peakFactor!;
      expect(rel(head, published), `${owner} ${e.name}: data`).toBeLessThan(0.005);
      const r = staticFire(e, { count: 1, propellantKg: propellant, pressurePa: 0, throttle: 1, dt: 0.01 });
      expect(r.peakThrust, `${owner} ${e.name}: stand above the head of its profile`).toBeLessThanOrEqual(head);
      expect(rel(r.peakThrust, published), `${owner} ${e.name}: stand ${(r.peakThrust / 1000).toFixed(1)} kN against ${published / 1000} kN`).toBeLessThan(0.01);
    }
  });
});
