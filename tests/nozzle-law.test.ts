/**
 * The thrust law (src/physics/nozzle.ts, src/data/nozzles.ts): the owner's
 * decision of 2026-10-17 — option (b) on the throttle and the ambient-pressure
 * term, and real physics for a vacuum engine lit in the air.
 *
 * - Attached flow: F = λ·F_vac − p_a·A_e, the exit-area term whatever the level.
 * - Every engine with a sea-level operating point gives the catalogue's
 *   sea-level thrust at full throttle at p₀, with the flow attached.
 * - Deep throttle low in the air lies between the attached-flow law and the
 *   old λ·F(p) once the flow separates (separation raises it).
 * - A vacuum engine at sea level gives its separated thrust, not its vacuum
 *   thrust and not its placeholder sea-level figure.
 * - Never negative, rising with the level, falling with the pressure.
 * - Every number in the nozzle table has a source or an estimate flag.
 */
import { describe, expect, it } from 'vitest';
import { ALL_VEHICLES } from '../src/data/vehicles';
import { ENGINE_PARTS, engineSpec } from '../src/data/parts';
import { NOZZLES, NOZZLE_GAMMA, NOZZLE_GAMMA_SOURCES, NOZZLE_SOURCES, type Provenance } from '../src/data/nozzles';
import {
  areaRatioAt, engineLevelFor, engineThrustAt, machAt, nozzleFlow, nozzleModel, pressureRatioAt, schmuckerRatio, separationPressure,
  vacuumThrustCoefficient,
} from '../src/physics/nozzle';
import { engineIsp, engineMassFlow, engineThrustSL } from '../src/physics/vehicle';
import { atmosphere } from '../src/physics/atmosphere';
import { P0 } from '../src/physics/constants';
import type { EngineSpec } from '../src/types';

/** Every engine a built-in vehicle flies (the historical ones too), stage and strap-on, once per name. */
function fleetEngines(): EngineSpec[] {
  const out = new Map<string, EngineSpec>();
  for (const v of ALL_VEHICLES) {
    for (const st of v.stages) {
      for (const e of [st.engine, ...(st.boosters ?? []).map((b) => b.engine)]) if (!out.has(e.name)) out.set(e.name, e);
    }
  }
  return [...out.values()];
}
const partEngines = (): EngineSpec[] => ENGINE_PARTS.map((p) => engineSpec(p, 1));
const allEngines = (): EngineSpec[] => [...fleetEngines(), ...partEngines()];
const groundLit = (e: EngineSpec): boolean => !e.vacuumOnly && e.thrustSL < e.thrustVac;
const part = (id: string): EngineSpec => engineSpec(id, 1);

describe('one-dimensional nozzle relations', () => {
  it('inverts the area–Mach relation on the supersonic branch', () => {
    for (const g of [1.18, 1.22, 1.26]) {
      for (const a of [1.5, 16, 58.2, 165, 240]) expect(areaRatioAt(machAt(a, g), g)).toBeCloseTo(a, 6);
    }
    expect(machAt(1, 1.22)).toBe(1);
  });

  it('closes the vacuum thrust coefficient at the throat and grows with the area ratio', () => {
    // at the throat C_F = Γ·√(2γ/(γ+1)) + p*/p_c, with Γ = √γ·(2/(γ+1))^((γ+1)/(2(γ−1)))
    const g = 1.2, big = Math.sqrt(g) * (2 / (g + 1)) ** ((g + 1) / (2 * (g - 1)));
    expect(vacuumThrustCoefficient(1, g)).toBeCloseTo(big * Math.sqrt(2 * g / (g + 1)) + (2 / (g + 1)) ** (g / (g - 1)), 9);
    let last = 0;
    for (const a of [1, 2, 5, 16, 50, 165, 500]) {
      const cf = vacuumThrustCoefficient(a, 1.22);
      expect(cf).toBeGreaterThan(last);
      last = cf;
    }
  });

  it("is Schmucker's criterion (NASA TM-77396, eq. 11), capped at Mach 5 and at 1", () => {
    expect(schmuckerRatio(4.5)).toBeCloseTo((1.88 * 4.5 - 1) ** -0.64, 12);
    expect(schmuckerRatio(4.5)).toBeCloseTo(0.276, 3);
    // Schmucker's own SSME figure, 0.28–0.29 at M_i 4.5, is the same curve
    expect(schmuckerRatio(4.5)).toBeGreaterThan(0.27);
    expect(schmuckerRatio(8)).toBe(schmuckerRatio(5));
    expect(schmuckerRatio(1)).toBe(1);
  });
});

/**
 * An independent restatement of the one-dimensional nozzle, written here and
 * not taken from src/physics/nozzle.ts: the supersonic Mach number by Newton's
 * method on the area–Mach relation, and the vacuum thrust coefficient as the
 * throat's momentum and pressure, (γ+1)·(2/(γ+1))^(γ/(γ−1)), plus the wall
 * pressure integrated over the bell, ∫₁^ε p_w/p_c dε (Simpson in the Mach number) — the
 * axial force the wall takes, which is what the "nozzle cut off at the
 * separation point" of the separated law means. The code closes C_F in the
 * closed form; the two agreeing is the check.
 */
const indep = {
  mach(a: number, g: number): number {
    const f = (m: number) => Math.log((1 / m) * ((2 / (g + 1)) * (1 + ((g - 1) / 2) * m * m)) ** ((g + 1) / (2 * (g - 1)))) - Math.log(a);
    let m = 2 + Math.log(a);
    for (let i = 0; i < 60; i++) {
      const h = 1e-6 * m, d = (f(m + h) - f(m - h)) / (2 * h);
      m = Math.max(1 + 1e-9, m - f(m) / d);
    }
    return m;
  },
  wall(a: number, g: number): number {
    return a <= 1 ? (2 / (g + 1)) ** (g / (g - 1)) : (1 + ((g - 1) / 2) * indep.mach(a, g) ** 2) ** (-g / (g - 1));
  },
  cf(a: number, g: number): number {
    // in the Mach number, where the integrand is smooth (dε/dM = ε·(M²−1)/(M·(1 + (γ−1)M²/2)))
    const top = a <= 1 ? 1 : indep.mach(a, g), n = 2000, h = (top - 1) / n;
    let sum = 0;
    for (let i = 0; i <= n; i++) {
      const m = 1 + i * h, w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2, t = 1 + ((g - 1) / 2) * m * m;
      const eps = (1 / m) * ((2 / (g + 1)) * t) ** ((g + 1) / (2 * (g - 1)));
      sum += w * t ** (-g / (g - 1)) * eps * (m * m - 1) / (m * t);
    }
    return (g + 1) * (2 / (g + 1)) ** (g / (g - 1)) + (sum * h) / 3;
  },
  /** Schmucker: p_i/p_a = (1.88 M − 1)^−0.64, M held at 5 above it */
  k(m: number): number { return Math.min(1, (1.88 * Math.min(5, m) - 1) ** -0.64); },
  /**
   * One engine at ambient p and level λ, from a throat area, an ε, a chamber
   * pressure and γ: attached λ·p_c·A_t·C_F(ε) − p·A_t·ε, or, where the wall
   * pressure at the exit is below Schmucker's figure, the nozzle cut off at the
   * area ratio where λ·p_c·p̂ = k(M)·p, found by bisection.
   */
  thrust(throat: number, eps: number, pc: number, g: number, p: number, level: number): number {
    const below = (a: number) => level * pc * indep.wall(a, g) < indep.k(indep.mach(a, g)) * p;
    let cut = eps;
    if (below(eps)) {
      let lo = 1, hi = eps;
      for (let i = 0; i < 60; i++) { const mid = Math.sqrt(lo * hi); if (below(mid)) hi = mid; else lo = mid; }
      cut = Math.sqrt(lo * hi);
    }
    return Math.max(0, level * pc * throat * indep.cf(cut, g) - p * throat * cut);
  },
};

describe('the law against an independent restatement of the nozzle', () => {
  it('the closed-form vacuum thrust coefficient is the wall-pressure integral', () => {
    for (const g of [1.18, 1.22, 1.26]) for (const a of [1, 4, 16, 37, 80, 165, 250]) {
      expect(vacuumThrustCoefficient(a, g) / indep.cf(a, g) - 1, `γ ${g}, ε ${a}`).toBeCloseTo(0, 6);
    }
  });

  it('a vacuum engine at sea level: Merlin Vacuum from its ε 165 and 9.7 MPa, the RL10C-1 from its 57 in exit', () => {
    // Merlin Vacuum (src/data/nozzles.ts): F_vac = p_c·A_t·C_F(165) fixes the throat
    const mvac = part('mvac'), g = 1.22, pc = 9.7e6, eps = 165;
    const throat = mvac.thrustVac / (pc * indep.cf(eps, g));
    expect(nozzleModel(mvac).exitArea / (eps * throat) - 1).toBeCloseTo(0, 5);
    for (const [p, level] of [[P0, 1], [P0, 0.6], [atmosphere(5e3).p, 1], [atmosphere(12e3).p, 1], [atmosphere(20e3).p, 1]] as const) {
      const want = indep.thrust(throat, eps, pc, g, p, level);
      expect(engineThrustAt(mvac, p, level) / want - 1, `${p.toFixed(0)} Pa, level ${level}`).toBeCloseTo(0, 3);
    }
    // RL10C-1: the exit is the data, the chamber pressure the one that closes F_vac
    const rl10 = part('rl10c1'), gh = 1.26, exit = Math.PI * (57 * 0.0254) ** 2 / 4, e2 = 130;
    const pc2 = rl10.thrustVac / ((exit / e2) * indep.cf(e2, gh));
    expect(nozzleModel(rl10).chamberPressure / pc2 - 1).toBeCloseTo(0, 5);
    expect(engineThrustAt(rl10, P0, 1) / indep.thrust(exit / e2, e2, pc2, gh, P0, 1) - 1).toBeCloseTo(0, 3);
  });

  it('attached flow, by hand: RD-180 at its 47 % at 10 km and a P120C at its liftoff peak', () => {
    const rd180 = part('rd180'), p = atmosphere(10e3).p;
    const exit = (4152e3 - 3827e3) / 101325;
    expect(engineThrustAt(rd180, p, 0.47)).toBeCloseTo(0.47 * 4152e3 - p * exit, 3);
    // a solid's profile is a level: the air takes p₀·A_e off the peak, not a share of it
    const p120 = part('p120c'), peak = 1.52;
    expect(engineThrustAt(p120, P0, peak)).toBeCloseTo(peak * p120.thrustVac - (p120.thrustVac - p120.thrustSL), 3);
  });
});

describe('the thrust law', () => {
  it('attached flow: λ·F_vac − p_a·A_e, the exit-area term at any level', () => {
    // RD-180 at its 47 % floor at 10 km, Merlin 1D at 70 % at sea level, a Raptor at 60 % at 5 km: all attached
    for (const [id, level, h] of [['rd180', 0.47, 10e3], ['merlin1d', 0.7, 0], ['raptor2', 0.6, 5e3], ['rd191', 1, 0]] as const) {
      const e = part(id), p = atmosphere(h).p, m = nozzleModel(e);
      expect(nozzleFlow(e, p, level).separated, id).toBe(false);
      expect(engineThrustAt(e, p, level), id).toBeCloseTo(level * e.thrustVac - p * m.exitArea, 6);
      expect(m.exitArea, id).toBeCloseTo((e.thrustVac - e.thrustSL) / P0, 9);
    }
    // in vacuum it is λ·F_vac exactly, for every engine
    for (const e of allEngines()) for (const level of [0.3, 1, 1.5]) expect(engineThrustAt(e, 0, level)).toBe(level * e.thrustVac);
  });

  it('every engine with a sea-level point gives its catalogue sea-level thrust at full throttle at p₀, attached', () => {
    const checked: string[] = [];
    for (const e of allEngines()) {
      if (!groundLit(e)) continue;
      const flow = nozzleFlow(e, P0, 1);
      expect(flow.separated, `${e.name} separates at full thrust at sea level`).toBe(false);
      expect(flow.thrust / e.thrustSL - 1, e.name).toBeCloseTo(0, 9);
      expect(engineThrustSL(e) / e.thrustSL - 1, e.name).toBeCloseTo(0, 9);
      checked.push(e.name);
    }
    expect(checked.length).toBeGreaterThan(35);
  });

  it('keeps the qualified point attached only where the one-dimensional wall pressure needs help, and says which', () => {
    // The engines whose one-dimensional exit pressure fails Schmucker's
    // criterion at full thrust at sea level, and so carry a wall factor: the
    // high-expansion hydrogen engines and the R-7's chambers. Measured on
    // 2026-10-17; a change to the data that moves an engine in or out of this
    // list is a change to where it separates when throttled.
    const helped = [...new Set(allEngines().filter((e) => groundLit(e) && nozzleModel(e).wallFactor > 1).map((e) => e.name))].sort();
    expect(helped).toEqual(expect.arrayContaining(['LE-7A', 'LE-9', 'Vulcain 2.1', 'YF-77']));
    for (const name of helped) {
      const e = allEngines().find((x) => x.name === name)!;
      // just enough: separation starts at λ = 1 at sea level
      expect(nozzleFlow(e, P0, 0.999).separated, name).toBe(true);
      expect(nozzleModel(e).wallFactor, name).toBeLessThan(3);
    }
    // a vacuum engine has no qualified sea-level point, and no help
    for (const e of allEngines()) if (e.vacuumOnly) expect(nozzleModel(e).wallFactor, e.name).toBe(1);
  });

  it('deep throttle at sea level lies between the attached-flow law and the old λ·F(p) once the flow separates', () => {
    const cases: [string, number, number][] = [['rd191', 0.3, 0], ['rd191', 0.3, 2e3], ['vulcain21', 0.5, 0], ['le7a', 0.4, 0], ['merlin1d', 0.4, 0],
      ['raptor2', 0.4, 0], ['le9', 0.63, 0], ['be4', 0.4, 0]];
    for (const [id, level, h] of cases) {
      const e = part(id), p = atmosphere(h).p, m = nozzleModel(e);
      const flow = nozzleFlow(e, p, level);
      const attached = level * e.thrustVac - p * m.exitArea;
      const old = level * (e.thrustVac - (e.thrustVac - e.thrustSL) * p / P0);
      expect(flow.separated, `${id} at ${level} and ${h} m`).toBe(true);
      expect(flow.thrust, id).toBeGreaterThan(attached);
      expect(flow.thrust, id).toBeLessThan(old);
      expect(flow.separationAreaRatio, id).toBeLessThan(m.expansionRatio);
    }
    // Angara-A5's core at 30 % at sea level: 11 % below the old figure, not the attached law's 21 %
    const rd191 = part('rd191');
    expect(engineThrustAt(rd191, P0, 0.3) / (0.3 * rd191.thrustSL)).toBeGreaterThan(0.85);
    expect((0.3 * rd191.thrustVac - (rd191.thrustVac - rd191.thrustSL)) / (0.3 * rd191.thrustSL)).toBeLessThan(0.8);
  });

  it('a vacuum engine at sea level gives its separated thrust: not its vacuum figure, not its placeholder', () => {
    const mvac = part('mvac'), rl10 = part('rl10c1'), vinci = part('vinci');
    for (const e of [mvac, rl10, vinci]) {
      const flow = nozzleFlow(e, P0, 1), m = nozzleModel(e);
      expect(flow.separated, e.name).toBe(true);
      expect(flow.thrust, e.name).toBeLessThan(0.85 * e.thrustVac);
      expect(flow.thrust, e.name).toBeGreaterThan(Math.max(0, e.thrustVac - P0 * m.exitArea));
      expect(flow.thrust, e.name).not.toBeCloseTo(e.thrustSL, 0);
      // the flow separates far inside the bell
      expect(flow.separationAreaRatio / m.expansionRatio, e.name).toBeLessThan(0.3);
    }
    // the Merlin Vacuum: its 3.3 m nozzle (from ε 165 and p_c 9.7 MPa) and about 775 kN, Isp about 275 s, at sea level
    expect(Math.sqrt(4 * nozzleModel(mvac).exitArea / Math.PI)).toBeCloseTo(3.3, 1);
    expect(engineThrustAt(mvac, P0, 1) / 1e3).toBeGreaterThan(740);
    expect(engineThrustAt(mvac, P0, 1) / 1e3).toBeLessThan(810);
    expect(engineIsp(mvac, P0)).toBeLessThan(290);
    // the RL10C-1's published exit diameter is what it flies
    expect(nozzleModel(rl10).exitArea).toBeCloseTo(Math.PI * (57 * 0.0254) ** 2 / 4, 9);
    // high up the same nozzle runs full: the Merlin Vacuum at 40 km
    expect(nozzleFlow(mvac, atmosphere(40e3).p, 1).separated).toBe(false);
  });

  it('is never negative, rises with the level and falls with the pressure, for every engine', () => {
    for (const e of allEngines()) {
      let lastP = Infinity;
      for (const p of [0, 1, 50, 1000, 5000, 20e3, 50e3, P0, 1.1 * P0]) {
        let lastL = -1;
        for (const level of [0, 0.001, 0.02, 0.1, 0.2, 0.3, 0.4, 0.5, 0.63, 0.8, 1, 1.25, 1.53]) {
          const f = engineThrustAt(e, p, level);
          expect(Number.isFinite(f) && f >= 0, `${e.name} at ${p} Pa, level ${level}: ${f}`).toBe(true);
          expect(f, `${e.name} at ${p} Pa: falls from level ${level}`).toBeGreaterThanOrEqual(lastL - 1e-6 * e.thrustVac);
          lastL = f;
        }
        const full = engineThrustAt(e, p, 1);
        expect(full, `${e.name}: rises with the pressure at ${p} Pa`).toBeLessThanOrEqual(lastP + 1e-6 * e.thrustVac);
        lastP = full;
      }
    }
  });

  it('meets the attached law where the flow separates: no step in thrust at the separation boundary', () => {
    for (const id of ['rd191', 'merlin1d', 'mvac', 'rl10c1', 'raptor2']) {
      const e = part(id), m = nozzleModel(e);
      // the level at which separation reaches the exit at sea level, and either side of it
      const edge = schmuckerRatio(m.exitMach) * P0 / (m.wallFactor * m.exitPressure);
      const below = engineThrustAt(e, P0, edge * (1 - 1e-7)), above = engineThrustAt(e, P0, edge * (1 + 1e-7));
      expect(Math.abs(above - below) / e.thrustVac, id).toBeLessThan(1e-5);
    }
  });

  it('the level for a thrust inverts the law, attached or separated', () => {
    for (const id of ['rd191', 'merlin1d', 'mvac', 'raptor2', 'le7a']) {
      const e = part(id);
      for (const p of [0, 30e3, P0]) {
        for (const level of [0.2, 0.4, 0.7, 1]) {
          const f = engineThrustAt(e, p, level);
          if (f > 1e-3 * e.thrustVac) expect(engineLevelFor(e, p, f), `${id} ${p} ${level}`).toBeCloseTo(level, 5);
        }
      }
    }
    expect(engineLevelFor(part('merlin1d'), P0, 0)).toBe(0);
  });

  it('the Isp falls with the throttle in air and not in vacuum', () => {
    const e = part('rd191');
    expect(engineIsp(e, 0, 0.3)).toBeCloseTo(e.ispVac, 9);
    expect(engineIsp(e, 0, 1)).toBeCloseTo(e.ispVac, 9);
    expect(engineIsp(e, P0, 0.3)).toBeLessThan(engineIsp(e, P0, 0.7));
    expect(engineIsp(e, P0, 0.7)).toBeLessThan(engineIsp(e, P0, 1));
    // F = λ·ṁ·g₀·Isp at every level
    expect(engineThrustAt(e, P0, 0.45)).toBeCloseTo(0.45 * engineMassFlow(e) * 9.80665 * engineIsp(e, P0, 0.45), 6);
  });

  it('separates below the altitude its exit pressure sets, and only there', () => {
    const mvac = part('mvac');
    const pSep = separationPressure(mvac);
    expect(nozzleFlow(mvac, pSep * 1.01, 1).separated).toBe(true);
    expect(nozzleFlow(mvac, pSep * 0.99, 1).separated).toBe(false);
    expect(separationPressure(part('merlin1d'), 0.5)).toBeCloseTo(0.5 * separationPressure(part('merlin1d')), 9);
  });

  it('falls back to a flagged estimate for an engine the table does not know', () => {
    const custom: EngineSpec = { name: 'my engine', count: 1, thrustSL: 800e3, thrustVac: 900e3, ispSL: 280, ispVac: 315 };
    const m = nozzleModel(custom);
    expect(m.basis).toBe('estimate');
    expect(engineThrustAt(custom, P0, 1)).toBeCloseTo(800e3, 3);
    const vac: EngineSpec = { ...custom, name: 'my vacuum engine', vacuumOnly: true };
    expect(nozzleModel(vac).basis).toBe('estimate');
    expect(engineThrustAt(vac, P0, 1)).toBeLessThan(900e3);
    expect(nozzleModel(part('mvac')).basis).toBe('data');
    // equal thrusts: no exit-area term at all
    expect(engineThrustAt({ ...custom, thrustSL: 900e3 }, P0, 0.4)).toBe(0.4 * 900e3);
  });
});

describe('nozzle data (src/data/nozzles.ts)', () => {
  const FIELDS = ['expansionRatio', 'chamberPressure', 'exitDiameter'] as const;
  /** the numbers of one record, by field */
  const figures = (name: string): [(typeof FIELDS)[number], number][] => {
    const r = NOZZLES[name];
    return FIELDS.map((f) => [f, f === 'exitDiameter' ? r.exitDiameter?.value : r[f]] as [(typeof FIELDS)[number], number | undefined])
      .filter((x): x is [(typeof FIELDS)[number], number] => x[1] !== undefined);
  };
  const says = (p: Provenance): string => ('source' in p ? p.source : p.estimate);

  it('holds every engine a built-in vehicle or a catalogue part flies', () => {
    const missing = [...new Set(allEngines().map((e) => e.name))].filter((n) => !Object.prototype.hasOwnProperty.call(NOZZLES, n));
    expect(missing).toEqual([]);
  });

  it('every number has a source or an estimate flag, and is a positive number; every source has its number', () => {
    expect(Object.keys(NOZZLE_SOURCES).sort()).toEqual(Object.keys(NOZZLES).sort());
    for (const name of Object.keys(NOZZLES)) {
      const p = NOZZLE_SOURCES[name];
      for (const [field, value] of figures(name)) {
        expect(value > 0 && Number.isFinite(value), `${name}.${field}`).toBe(true);
        const f = p[field];
        expect(f, `${name}.${field} says where it comes from`).toBeDefined();
        expect(says(f!).length, `${name}.${field} says where it comes from`).toBeGreaterThan(10);
        expect('source' in f! && 'estimate' in f!, `${name}.${field} is not both`).toBe(false);
      }
      // no source for a number the record does not hold
      for (const field of FIELDS) if (p[field]) expect(figures(name).some(([f]) => f === field), `${name}.${field} has a number`).toBe(true);
    }
    for (const [family, g] of Object.entries(NOZZLE_GAMMA)) {
      expect(g > 1 && g < 1.4, family).toBe(true);
      expect(says(NOZZLE_GAMMA_SOURCES[family as keyof typeof NOZZLE_GAMMA]).length, family).toBeGreaterThan(10);
    }
  });

  it("writes the J-2's exit out as its 170.4 in² throat times its ε 27.5", () => {
    const d = Math.sqrt((4 * 170.4 * 27.5) / Math.PI) * 0.0254;
    for (const name of ['J-2', 'Rocketdyne J-2']) expect(NOZZLES[name].exitDiameter!.value / d - 1, name).toBeCloseTo(0, 12);
  });

  it('gives each engine what its kind needs: a vacuum engine its exit size, a sea-level one its ε or chamber pressure', () => {
    const engines = new Map(allEngines().map((e) => [e.name, e]));
    for (const [name, r] of Object.entries(NOZZLES)) {
      const e = engines.get(name);
      expect(e, `${name} is flown by something`).toBeDefined();
      if (e!.vacuumOnly) expect(!!r.exitDiameter || (!!r.expansionRatio && !!r.chamberPressure), name).toBe(true);
      else expect(!!r.expansionRatio || !!r.chamberPressure, name).toBe(true);
      if (r.exitDiameter) expect(r.exitDiameter.nozzles >= 1 && Number.isInteger(r.exitDiameter.nozzles), name).toBe(true);
    }
  });

  it('closes the vacuum thrust with the geometry, so the chamber pressure it flies is near the published one', () => {
    // where both a published ε and a published p_c exist, the p_c that closes F_vac
    // with the exit area is within a quarter of the published figure (the exit
    // area of a sea-level engine is its pair's, the C_F ideal)
    for (const e of allEngines()) {
      const r = NOZZLES[e.name];
      const p = NOZZLE_SOURCES[e.name];
      if (!r?.expansionRatio || !r.chamberPressure || !p.chamberPressure || !('source' in p.chamberPressure) || !p.expansionRatio || !('source' in p.expansionRatio)) continue;
      const m = nozzleModel(e);
      expect(Math.abs(m.chamberPressure / r.chamberPressure - 1), e.name).toBeLessThan(0.25);
      expect(pressureRatioAt(m.exitMach, m.gamma) * m.chamberPressure).toBeCloseTo(m.exitPressure, 6);
    }
  });
});
