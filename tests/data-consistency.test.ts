/**
 * Internal consistency of the fleet data (`src/data/*.ts`).
 *
 * These are cheap invariants that catch a mistyped digit long before a
 * trajectory test does: a rocket that cannot lift itself off the pad, a solid
 * motor whose grain and mass flow disagree with its published burn time, an
 * engine whose sea-level figures are above its vacuum ones, a vehicle pointing
 * at a launch site that does not exist, or a fairing narrower than the stage
 * underneath it.
 *
 * Nothing here is a judgement about how well a vehicle flies — that is
 * `fleet-defaults.test.ts`. This file only asks whether the numbers are
 * self-consistent and consistent with what was published.
 */
import { describe, it, expect } from 'vitest';
import { VEHICLES } from '../src/data/vehicles';
import { SITES } from '../src/data/sites';
import { SATELLITES } from '../src/data/satellites';
import { ORBIT_PRESETS } from '../src/data/orbits';
import { engineMassFlow, liftoffMass, liftoffThrust } from '../src/physics/vehicle';
import { G0 } from '../src/physics/constants';
import type { EngineSpec, StageSpec, VehicleSpec } from '../src/types';

const siteIds = new Set(SITES.map((s) => s.id));

/** Every distinct engine in the fleet, with the stage or booster it belongs to. */
function engines(): { owner: string; engine: EngineSpec }[] {
  const out: { owner: string; engine: EngineSpec }[] = [];
  for (const v of VEHICLES) {
    for (const st of v.stages) {
      out.push({ owner: `${v.id}/${st.id}`, engine: st.engine });
      for (const b of st.boosters ?? []) out.push({ owner: `${v.id}/${st.id}/${b.id}`, engine: b.engine });
    }
  }
  return out;
}

describe('engine specs', () => {
  it('sea-level thrust and Isp never exceed the vacuum values', () => {
    for (const { owner, engine: e } of engines()) {
      expect(e.thrustSL, `${owner} ${e.name}: thrustSL ${e.thrustSL} > thrustVac ${e.thrustVac}`)
        .toBeLessThanOrEqual(e.thrustVac);
      expect(e.ispSL, `${owner} ${e.name}: ispSL ${e.ispSL} > ispVac ${e.ispVac}`)
        .toBeLessThanOrEqual(e.ispVac);
    }
  });

  it('every engine has a positive thrust, Isp and count', () => {
    for (const { owner, engine: e } of engines()) {
      expect(e.count, owner).toBeGreaterThan(0);
      expect(e.thrustSL, owner).toBeGreaterThan(0);
      expect(e.ispSL, owner).toBeGreaterThan(0);
    }
  });

  it('a solid motor is never throttleable', () => {
    for (const { owner, engine: e } of engines()) {
      if (e.solid) expect(e.minThrottle, `${owner} ${e.name}`).toBeUndefined();
    }
  });
});

/**
 * Published burn times, seconds, against which `propellantMass / mdot` is
 * checked. `mdot` is `thrustVac / (g0 · ispVac)`, exactly what the simulation
 * uses, and for a solid motor the regressive profile averages to 1.0 over the
 * grain, so the quotient is the modelled burn time.
 *
 * Only figures that are actually published for the stage in question are
 * listed; a stage with no entry is not checked. Sources are cited next to the
 * stage in `src/data/vehicles.ts`.
 */
const PUBLISHED_BURN_TIME: Record<string, number> = {
  // Vega-C — https://en.wikipedia.org/wiki/Vega_C
  'vegac/p120c': 135.7,
  'vegac/z40': 92.9,
  'vegac/z9': 119.6,
  // Ariane 6 flies the same P120C as a strap-on, but quotes ~130 s for it
  // against Avio's 135.7 s on Vega-C: the same grain, two operators, two
  // published burn times. Both are listed as published, and the single mean
  // thrust in vehicles.ts sits between them (136.3 s here, 135.7 s on Vega-C).
  // docs/AUDIT-2026-09-16.md B22 uses the 130 s figure.
  'ariane64/llpm/p120c': 130,
  // Pre-existing solids. Published figures from docs/AUDIT-2026-09-16.md B22,
  // which measured the whole fleet against them.
  'atlasv551/ccb/gem63': 94,
  'vulcan/v1/gem63xl': 87.3,
  'h3/h3s1/srb3': 105,
  'pslvxl/ps1': 110,
  'pslvxl/ps1/psomg': 70,
  'pslvxl/ps1/psoma': 70,
  // PS3 was the other half of B22: 240 kN is the peak of the grain, and the
  // motor burned out 27.7 % early until the mean thrust was corrected.
  'pslvxl/ps3': 126.7,
  // Long March 2D — http://www.astronautix.com/c/changzheng2d.html
  'longmarch2d/cz2d1': 170,
  'longmarch2d/cz2d2': 135,
  // Long March 3B/E — https://en.wikipedia.org/wiki/Long_March_3B
  'longmarch3be/cz3b1/cz3bb': 140,
  'longmarch3be/cz3b1': 158,
  'longmarch3be/cz3b2': 185,
  'longmarch3be/cz3b3': 478,
  // H-IIA 202 — https://en.wikipedia.org/wiki/H-IIA plus the audited SRB-A figures
  'h2a202/h2a1/srba': 100,
  'h2a202/h2a1': 390,
  'h2a202/h2a2': 534,
};

describe('burn times', () => {
  it('propellant / mass flow is within 10 % of every published burn time', () => {
    const seen = new Set<string>();
    for (const v of VEHICLES) {
      for (const st of v.stages) {
        const entries: { key: string; prop: number; engine: EngineSpec }[] = [
          { key: `${v.id}/${st.id}`, prop: st.propellantMass, engine: st.engine },
          ...(st.boosters ?? []).map((b) => ({ key: `${v.id}/${st.id}/${b.id}`, prop: b.propellantMass, engine: b.engine })),
        ];
        for (const { key, prop, engine } of entries) {
          const published = PUBLISHED_BURN_TIME[key];
          if (published === undefined) continue;
          seen.add(key);
          const modelled = prop / (engine.count * engineMassFlow(engine));
          const error = Math.abs(modelled - published) / published;
          expect(
            error,
            `${key}: ${modelled.toFixed(1)} s modelled against ${published} s published (${(error * 100).toFixed(1)} % off)`,
          ).toBeLessThanOrEqual(0.1);
        }
      }
    }
    // The table must not accumulate keys that no longer name anything.
    expect([...seen].sort()).toEqual(Object.keys(PUBLISHED_BURN_TIME).sort());
  });

  /**
   * Coverage, so the invariant cannot be satisfied by omission.
   *
   * A solid motor has no throttle and no shutdown: its burn time IS its
   * propellant divided by its mass flow, so a published burn time is the one
   * number that pins the mean thrust the file's own convention asks for. Every
   * solid in the fleet must therefore be in the table — the first pass of this
   * wave listed only the new vehicles plus Ariane's P120C, which happened to
   * leave out PSLV's HPS3, the single motor in the fleet that would have failed
   * the 10 % rule (91.6 s modelled against 126.7 s published, 27.7 % off,
   * audit item B22). Liquid stages are not required: they throttle, they shut
   * down early, and their published burn time is a mission profile rather than
   * a property of the stage.
   */
  it('every solid motor in the fleet has a published burn time', () => {
    const missing: string[] = [];
    for (const v of VEHICLES) {
      for (const st of v.stages) {
        const entries = [
          { key: `${v.id}/${st.id}`, engine: st.engine },
          ...(st.boosters ?? []).map((b) => ({ key: `${v.id}/${st.id}/${b.id}`, engine: b.engine })),
        ];
        for (const { key, engine } of entries) {
          if (engine.solid && PUBLISHED_BURN_TIME[key] === undefined) missing.push(key);
        }
      }
    }
    expect(missing, `add a published burn time for: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('liftoff', () => {
  /**
   * Thrust-to-weight at liftoff with half the rated payload.
   *
   * `liftoffThrust` counts every ground-lit engine at sea level (air-lit
   * strap-ons such as PSLV's two upper PSOM-XL are excluded, and a solid gets
   * its 1.2 ignition-transient factor). A core that throttles down while
   * parallel boosters burn — Angara-A5, Falcon Heavy, Long March 5 — is counted
   * at full thrust, because that throttling is commanded in flight and not off
   * the pad.
   *
   * Below ~1.15 a vehicle spends its first seconds barely accelerating and the
   * gravity losses run away; above ~2.6 nothing in this fleet exists, and a
   * number that high means a thrust or a mass is wrong by a factor.
   */
  it('thrust-to-weight is between 1.15 and 2.6 at 50 % payload', () => {
    for (const v of VEHICLES) {
      const payload = 0.5 * Math.max(v.payloadLEO, v.payloadGTO);
      const tw = liftoffThrust(v) / (liftoffMass(v, payload) * G0);
      expect(tw, `${v.id}: T/W ${tw.toFixed(2)} with ${Math.round(payload)} kg`).toBeGreaterThanOrEqual(1.15);
      expect(tw, `${v.id}: T/W ${tw.toFixed(2)} with ${Math.round(payload)} kg`).toBeLessThanOrEqual(2.6);
    }
  });

  /**
   * KNOWN GAP, recorded rather than asserted away: a launcher whose FIRST STAGE
   * is a large solid lifts off in this model at about two thirds of its real
   * acceleration.
   *
   * The mean thrusts in `vehicles.ts` are right — grain mass divided by
   * published burn time — and a solid's thrust profile belongs on top of that.
   * `solidProfile` in src/physics/vehicle.ts supplies a fixed 1.2 → 0.8 ramp
   * for every solid in the fleet, which is close enough for SRB-A
   * (2 260 / 1 858 = 1.22) and Zefiro 40 (1 304 / 1 123 = 1.16) but not for the
   * P120C, whose published peak/mean is 4 323 / 2 846 = 1.52.
   *
   * On Ariane 64 the P120C is a strap-on and `liftoffThrust` applies the 1.2
   * factor; on Vega-C it is the first stage and `liftoffThrust` applies no
   * factor at all, so the two paths disagree about the same motor. The measured
   * result is a Vega-C liftoff T/W of 1.32 against a real ~2.1 — inside the
   * 1.15 floor above by 0.17, which is why that test does not catch it.
   *
   * This is data recorded for the physics owner, not a target: the fix is a
   * per-motor peak factor in `solidProfile` (and `liftoffThrust` applying it to
   * solid first stages as well as solid boosters), after which these numbers
   * move and this test is updated with them.
   */
  it('a solid-first-stage launcher lifts off well below its published thrust-to-weight', () => {
    const vegac = VEHICLES.find((v) => v.id === 'vegac')!;
    const tw = liftoffThrust(vegac) / (liftoffMass(vegac, 0.5 * vegac.payloadLEO) * G0);
    expect(tw, `Vega-C liftoff T/W ${tw.toFixed(3)}`).toBeGreaterThan(1.28);
    expect(tw, `Vega-C liftoff T/W ${tw.toFixed(3)}`).toBeLessThan(1.36);
    // The published figure this is measured against, kept next to it so the gap
    // cannot be read as agreement: P120C peak 4 323 kN over a ~210 t stack.
    const published = 4323e3 / (liftoffMass(vegac, 0.5 * vegac.payloadLEO) * G0);
    expect(published).toBeGreaterThan(2.0);
  });
});

describe('geometry and references', () => {
  const widestUpperStage = (v: VehicleSpec): StageSpec => v.stages
    .slice(1)
    .reduce((a, b) => (b.diameter > a.diameter ? b : a), v.stages[1] ?? v.stages[0]);

  it('the fairing is at least as wide as the widest stage it sits on', () => {
    for (const v of VEHICLES) {
      if (!v.fairing) continue; // Starship has an integrated payload bay
      const upper = widestUpperStage(v);
      expect(
        v.fairing.diameter,
        `${v.id}: ${v.fairing.diameter} m fairing over the ${upper.diameter} m ${upper.id}`,
      ).toBeGreaterThanOrEqual(upper.diameter);
    }
  });

  it('every vehicle flies from at least one site, and every site it names exists', () => {
    for (const v of VEHICLES) {
      expect(v.sites.length, `${v.id} has no launch site`).toBeGreaterThan(0);
      for (const s of v.sites) expect(siteIds, `${v.id} names unknown site ${s}`).toContain(s);
      expect(new Set(v.sites).size, `${v.id} lists a site twice`).toBe(v.sites.length);
    }
  });

  it('a site can reach the minimum inclination it claims', () => {
    // A launch cannot reach an inclination below the site's latitude without a
    // dog-leg, which this model does not fly. The 0.3° slack is for sites whose
    // published minimum is quoted for a pad slightly south of the coordinates
    // used here (Plesetsk: 62.8° against 62.925° N); `ascentInclinationFor`
    // raises the ascent inclination to the latitude anyway.
    for (const s of SITES) {
      expect(s.minInclination, `${s.id}: minInclination ${s.minInclination}° below latitude ${s.latitude}°`)
        .toBeGreaterThanOrEqual(Math.abs(s.latitude) - 0.3);
      expect(s.azimuthMin, s.id).toBeGreaterThanOrEqual(0);
      expect(s.azimuthMax, s.id).toBeLessThanOrEqual(360);
    }
  });

  it('ids are unique across vehicles, sites, satellites and orbits', () => {
    for (const list of [VEHICLES, SITES, SATELLITES, ORBIT_PRESETS]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size, `duplicate id in ${ids.join(', ')}`).toBe(ids.length);
    }
  });

  it('every stage and booster has a positive dry and propellant mass', () => {
    for (const v of VEHICLES) {
      for (const st of v.stages) {
        expect(st.dryMass, `${v.id}/${st.id}`).toBeGreaterThan(0);
        expect(st.propellantMass, `${v.id}/${st.id}`).toBeGreaterThan(0);
        for (const b of st.boosters ?? []) {
          expect(b.dryMass, `${v.id}/${st.id}/${b.id}`).toBeGreaterThan(0);
          expect(b.propellantMass, `${v.id}/${st.id}/${b.id}`).toBeGreaterThan(0);
          expect(b.count, `${v.id}/${st.id}/${b.id}`).toBeGreaterThan(0);
        }
      }
    }
  });
});
