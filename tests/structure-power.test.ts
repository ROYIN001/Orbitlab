/**
 * The Structure section's energy balance (src/structure/power-balance.ts)
 * against cases worked out apart from it: a constant load through the
 * shadow, a battery that fills or reaches its floor, Orbitlab's own SMAD
 * sizing (src/orbit/power.ts) at its balance points, and the EduSat cases the
 * section shows (src/structure/edusat-design.ts): the reference passes, the
 * night camera on one cell runs short every orbit, two cells fix it for 60 g.
 */
import { describe, expect, it } from 'vitest';
import { arrayPowerRequired, batteryCapacity } from '../src/orbit/power';
import { circularPeriod, eclipseDuration } from '../src/orbit/eclipse';
import { arrayPower, chargeAt, eduScenario, simulatePower, type PowerScenario } from '../src/structure/power-balance';
import { POWER_ENV } from '../src/structure-host/power-env';
import { REFERENCE_DESIGN, changesFrom, designKey, eduFigures, massOf, partsOf } from '../src/structure/edusat-design';
import { BATTERIES, CELL_AREA, CELL_WH, EDU_UNITS, PAYLOADS } from '../src/structure/edusat';

/** the section's scenario on the app's own power model, as the app gives it to the section */
const EDU_SCENARIO = eduScenario(POWER_ENV);
const S: PowerScenario = { ...EDU_SCENARIO };
const HOUR = 3600;

describe('the energy balance against worked cases', () => {
  it('drains a constant load through the shadow by P·t/η_BAT, with no panels', () => {
    // no cells at all: the battery alone, from full, a 2 W load always on
    const r = simulatePower({ ...S, orbits: 1, dod: 1 }, { cellArea: 0, batteryWh: 100, loads: [{ id: 'x', watts: 2, window: 'always' }] });
    const period = circularPeriod(S.altitude);
    expect(r.period).toBeCloseTo(period, 9);
    // 2 W for a whole orbit, out of the battery at η_BAT = 0.9
    expect(r.finalChargeWh).toBeCloseTo(100 - (2 * period) / HOUR / 0.9, 9);
    // the charge falls in a straight line: half way, half the energy
    expect(chargeAt(r, period / 2)).toBeCloseTo(100 - (2 * period / 2) / HOUR / 0.9, 9);
    expect(r.shortfalls).toEqual([]);
  });

  it('stops at the floor the depth of discharge allows and counts the loads it cannot power', () => {
    // 10 Wh, 30 % allowed: 3 Wh usable; a 9 W load drains it in 3·0.9/9 h = 1080 s, then nothing is delivered
    const r = simulatePower({ ...S, orbits: 1 }, { cellArea: 0, batteryWh: 10, loads: [{ id: 'x', watts: 9, window: 'always' }] });
    expect(r.floorWh).toBeCloseTo(7, 12);
    expect(r.minChargeWh).toBeCloseTo(7, 9);
    expect(r.shortfalls).toHaveLength(1);
    expect(r.shortfalls[0].start).toBeCloseTo(1080, 6);
    expect(r.shortfalls[0].end).toBeCloseTo(r.period, 6);
    expect(r.shortfalls[0].unmetWh).toBeCloseTo((9 * (r.period - 1080)) / HOUR, 9);
  });

  it('holds a full battery full and sheds what it cannot store', () => {
    // panels that give far more than a 1 W load: full from the start, so all the sunlit surplus is shed
    const r = simulatePower({ ...S, orbits: 1 }, { cellArea: 0.5, batteryWh: 50, loads: [{ id: 'x', watts: 1, window: 'always' }] });
    const bus = arrayPower(S, 0.5) * S.Xd;
    expect(r.busPower).toBeCloseTo(bus, 12);
    expect(r.shedWh).toBeCloseTo(((bus - 1) * r.daylight) / HOUR, 6);
    // through the shadow it drains, and it ends below full (the orbit ends at sunrise)
    expect(r.finalChargeWh).toBeCloseTo(50 - (1 * r.eclipse) / HOUR / 0.9, 9);
  });

  it('balances an orbit exactly at the array power SMAD asks for (X_d, X_e), and reaches the depth of discharge exactly with SMAD\'s battery', () => {
    const dayLoad = 3, eclipseLoad = 5;
    const period = circularPeriod(S.altitude), Te = eclipseDuration(S.altitude, S.beta), Td = period - Te;
    const Psa = arrayPowerRequired({ dayLoad, eclipseLoad, Td, Te, Xd: S.Xd, Xe: S.Xe });
    const battery = batteryCapacity({ eclipseLoad, Te, dod: S.dod, eff: S.batteryEff }) / HOUR;
    // the cell area that gives exactly Psa
    const cellArea = (Psa * S.mountFactor) / (S.flux * S.cellEff * S.Id);
    const loads = [
      { id: 'day', watts: dayLoad, window: 'sunlit' as const },
      { id: 'night', watts: eclipseLoad, window: 'eclipse' as const },
    ];
    // start at the floor at sunrise: one orbit of charging then the shadow comes back to exactly the floor
    const r = simulatePower({ ...S, orbits: 2, startCharge: 1 - S.dod }, { cellArea, batteryWh: battery, loads });
    expect(r.arrayPower).toBeCloseTo(Psa, 9);
    // after the sunlit part the battery is exactly full (it took exactly what the shadow will need)
    expect(chargeAt(r, Td)).toBeCloseTo(battery, 9);
    // and at the end of each shadow exactly at its floor, never below, with nothing short
    expect(chargeAt(r, period)).toBeCloseTo(battery * (1 - S.dod), 9);
    expect(r.finalChargeWh).toBeCloseTo(battery * (1 - S.dod), 9);
    expect(r.shortfalls).toEqual([]);
    expect(r.shedWh).toBeCloseTo(0, 9);
  });

  it('refuses a scenario that would make energy or loads below zero', () => {
    expect(() => simulatePower({ ...S, Xe: 0.95 }, { cellArea: 0.1, batteryWh: 10, loads: [] })).toThrow(RangeError);
    expect(() => simulatePower(S, { cellArea: 0.1, batteryWh: 10, loads: [{ id: 'x', watts: -1, window: 'always' }] })).toThrow(RangeError);
    expect(() => simulatePower({ ...S, dod: 0 }, { cellArea: 0.1, batteryWh: 10, loads: [] })).toThrow(RangeError);
  });

  it('places timed loads in their window, and refuses one that does not fit', () => {
    const r = simulatePower({ ...S, orbits: 1 }, { cellArea: 0, batteryWh: 100, loads: [{ id: 'x', watts: 6, window: 'eclipse', start: 5, minutes: 25 }] });
    const on = r.segments.filter((g) => g.demand > 0);
    expect(on).toHaveLength(1);
    expect(on[0].t0).toBeCloseTo(r.daylight + 300, 9);
    expect(on[0].t1 - on[0].t0).toBeCloseTo(1500, 9);
    expect(() => simulatePower(S, { cellArea: 0, batteryWh: 100, loads: [{ id: 'x', watts: 6, window: 'eclipse', start: 30, minutes: 25 }] })).toThrow(RangeError);
  });
});

describe('EduSat-3U: the cases the section shows', () => {
  it('sums its mass from its parts list, one part per unit, and changes it by the parts changed', () => {
    const parts = partsOf(REFERENCE_DESIGN);
    expect(parts.map((p) => p.unit)).toEqual([...EDU_UNITS]);
    expect(new Set(parts.map((p) => p.id)).size).toBe(parts.length);
    expect(massOf(REFERENCE_DESIGN)).toBeCloseTo(parts.reduce((s, p) => s + p.massKg, 0), 12);
    expect(massOf(REFERENCE_DESIGN)).toBeCloseTo(1.81, 9);
    const both = { battery: 'battery-2cell', payload: 'camera-night' } as const;
    expect(massOf(both) - massOf(REFERENCE_DESIGN)).toBeCloseTo(
      BATTERIES['battery-2cell'].massKg - BATTERIES['battery-1cell'].massKg + PAYLOADS['camera-night'].massKg - PAYLOADS['camera-day'].massKg, 12);
    expect(changesFrom(both).map((c) => c.unit)).toEqual(['battery', 'payload']);
    expect(changesFrom(REFERENCE_DESIGN)).toEqual([]);
  });

  it('the reference (one cell, day camera) powers every load through three orbits', () => {
    const f = eduFigures(REFERENCE_DESIGN, POWER_ENV);
    expect(f.key).toBe(designKey(REFERENCE_DESIGN));
    expect(f.cellArea).toBeCloseTo(28 * CELL_AREA, 12);
    expect(f.batteryWh).toBeCloseTo(CELL_WH, 12);
    expect(f.powered).toBe(true);
    expect(f.power.minChargeWh).toBeGreaterThan(f.power.floorWh);
    // SMAD's steady state agrees: the array gives more than it needs, the battery is larger than the shadow needs
    expect(f.steady.arrayGiven).toBeGreaterThan(f.steady.arrayNeeded);
    expect(f.steady.batteryFitted).toBeGreaterThan(f.steady.batteryNeeded);
  });

  it('the night camera on one cell runs short near the end of every shadow; two cells power it, for 60 g more', () => {
    const short = eduFigures({ battery: 'battery-1cell', payload: 'camera-night' }, POWER_ENV);
    expect(short.powered).toBe(false);
    expect(short.power.shortfalls).toHaveLength(EDU_SCENARIO.orbits);
    for (const [k, s] of short.power.shortfalls.entries()) {
      // inside the k-th shadow, ending as the Sun comes back
      expect(s.start).toBeGreaterThan(k * short.power.period + short.power.daylight);
      expect(s.end).toBeCloseTo((k + 1) * short.power.period, 6);
      expect(s.unmetWh).toBeGreaterThan(0);
    }
    // worked apart: from full, the shadow takes (1.3 W·Te + 6 W·25 min)/0.9 out of the battery; one cell gives 30 % of 9.36 Wh
    const drawWh = ((1.3 * short.power.eclipse) / HOUR + (6 * 25) / 60) / 0.9;
    expect(drawWh).toBeGreaterThan(0.3 * CELL_WH);
    expect(short.steady.batteryNeeded).toBeGreaterThan(short.steady.batteryFitted);
    const fixed = eduFigures({ battery: 'battery-2cell', payload: 'camera-night' }, POWER_ENV);
    expect(fixed.powered).toBe(true);
    expect(fixed.power.minChargeWh).toBeCloseTo(2 * CELL_WH - drawWh, 6);
    expect(fixed.steady.batteryNeeded).toBeLessThan(fixed.steady.batteryFitted);
    // the panels still make enough over the orbit: full again before each shadow, the same low point after each
    for (let k = 0; k < EDU_SCENARIO.orbits; k++) {
      expect(chargeAt(fixed.power, k * fixed.power.period + fixed.power.daylight)).toBeCloseTo(2 * CELL_WH, 9);
      expect(chargeAt(fixed.power, (k + 1) * fixed.power.period)).toBeCloseTo(2 * CELL_WH - drawWh, 6);
    }
    expect(fixed.massKg - short.massKg).toBeCloseTo(0.06, 12);
  });

  it('is under the pilot\'s 3U mass bound in every combination', () => {
    for (const battery of ['battery-1cell', 'battery-2cell'] as const) {
      for (const payload of ['camera-day', 'camera-night'] as const) expect(eduFigures({ battery, payload }, POWER_ENV).massKg).toBeLessThan(4);
    }
  });
});

describe('the energy balance against a brute-force integration written apart from it', () => {
  /**
   * One-second steps, the rules restated from the scenario's text: the bus
   * gets S·A·η·I_d/π·X_d in sunlight; a surplus charges at X_e/(X_d·η_BAT) up to
   * full; a deficit draws /η_BAT down to the floor, below which the loads go
   * unpowered.
   */
  function bruteForce(cellArea: number, batteryWh: number, loads: Parameters<typeof simulatePower>[1]['loads']) {
    const period = circularPeriod(S.altitude), Te = eclipseDuration(S.altitude, S.beta), Td = period - Te;
    const bus = (S.flux * cellArea * S.cellEff * S.Id / S.mountFactor) * S.Xd;
    const cap = batteryWh * HOUR, floor = cap * (1 - S.dod), etaC = S.Xe / (S.Xd * S.batteryEff);
    let e = cap, min = e, unmet = 0, shortS = 0;
    const dt = 1;
    for (let t = 0; t < S.orbits * period; t += dt) {
      const phase = (t + dt / 2) % period, sun = phase < Td;
      let demand = 0;
      for (const l of loads) {
        if (l.window === 'always') { demand += l.watts; continue; }
        const from = l.window === 'sunlit' ? 0 : Td, to = l.window === 'sunlit' ? Td : period;
        const a = from + (l.start ?? 0) * 60, b = l.minutes === undefined ? to : a + l.minutes * 60;
        if (phase >= a && phase < b) demand += l.watts;
      }
      const net = (sun ? bus : 0) - demand;
      if (net >= 0) e = Math.min(cap, e + net * etaC * dt);
      else {
        const want = (-net / S.batteryEff) * dt;
        const give = Math.min(want, Math.max(0, e - floor));
        e -= give;
        if (give < want - 1e-9) { unmet += ((want - give) * S.batteryEff) / HOUR; shortS += dt * (1 - give / want); }
      }
      min = Math.min(min, e);
    }
    return { minWh: min / HOUR, finalWh: e / HOUR, unmetWh: unmet, shortS };
  }

  it('agrees on all four EduSat designs to within a one-second step', () => {
    for (const battery of ['battery-1cell', 'battery-2cell'] as const) {
      for (const payload of ['camera-day', 'camera-night'] as const) {
        const f = eduFigures({ battery, payload }, POWER_ENV);
        const loads = partsOf({ battery, payload }).flatMap((p) => p.loads);
        const b = bruteForce(f.cellArea, f.batteryWh, loads);
        const tag = `${battery} + ${payload}`;
        expect(f.power.minChargeWh, tag).toBeCloseTo(b.minWh, 2);
        expect(f.power.finalChargeWh, tag).toBeCloseTo(b.finalWh, 2);
        const unmet = f.power.shortfalls.reduce((s, x) => s + x.unmetWh, 0);
        const shortS = f.power.shortfalls.reduce((s, x) => s + (x.end - x.start), 0);
        expect(Math.abs(unmet - b.unmetWh), tag).toBeLessThan(0.01);
        expect(Math.abs(shortS - b.shortS), tag).toBeLessThan(S.orbits * 2);
      }
    }
  });
});
