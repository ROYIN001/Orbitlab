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
import { RATING_ORBITS, VEHICLES } from '../src/data/vehicles';
import { SITES, type SiteExtra } from '../src/data/sites';
import { SATELLITES } from '../src/data/satellites';
import { ORBIT_PRESETS } from '../src/data/orbits';
import { engineMassFlow, liftoffMass, liftoffThrust, solidProfile } from '../src/physics/vehicle';
import { circularSpeed, rotatingLaunchAzimuth } from '../src/physics/orbital';
import { corridorReach } from '../src/physics/mission';
import { G0, DEG, R_EARTH } from '../src/physics/constants';
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

  /**
   * Every solid motor states its own published peak/mean thrust ratio.
   *
   * `solidProfile` flies a regressive ramp whose head is `peakFactor`, and
   * `liftoffThrust` counts a solid at the head of that ramp — so the factor is
   * not decoration, it is the thrust the vehicle leaves the pad with. Until the
   * fleet-data wave only three of the ten solids in the file carried one and the
   * other seven fell back on a 1.2 default that is nobody's published figure:
   * PSLV-XL's S139 is 4 846.9 / 3 400 = 1.43 and its PSOM-XL 703.5 / 460 = 1.53,
   * so that vehicle left the pad with a fifth less thrust than its own sources
   * give it. The range below is the physics of a regressive grain — a factor at
   * or under 1 would mean a progressive one, and nothing in the fleet is past
   * 1.55 — and the requirement that EVERY solid declares one is what stops a
   * new motor inheriting a default silently.
   */
  it('every solid motor declares its published peak/mean thrust ratio', () => {
    const missing: string[] = [];
    for (const { owner, engine: e } of engines()) {
      if (!e.solid) continue;
      if (e.peakFactor === undefined) { missing.push(`${owner} ${e.name}`); continue; }
      expect(e.peakFactor, `${owner} ${e.name}`).toBeGreaterThan(1);
      expect(e.peakFactor, `${owner} ${e.name}`).toBeLessThanOrEqual(1.6);
    }
    expect(missing, `no published peak/mean ratio for: ${missing.join(', ')}`).toEqual([]);
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
   * A launcher whose FIRST STAGE is a large solid now lifts off at its real
   * acceleration — the gap this test used to record is closed.
   *
   * Two things were wrong. `solidProfile` applied a fixed 1.2 → 0.8 ramp to
   * every motor in the fleet, which is close enough for SRB-A3
   * (2 260 / 1 858 = 1.22) and Zefiro 40 (1 304 / 1 123 = 1.16) but not for the
   * P120C, whose published peak/mean is 4 323 / 2 846 = 1.52; and
   * `liftoffThrust` applied the ignition factor to solid BOOSTERS only, so the
   * same P120C counted at 1.2 × mean as an Ariane 6 strap-on and at 1.0 × mean
   * as Vega-C's first stage. Both are fixed (`peakFactor` in `EngineSpec`, and
   * `liftoffThrust` treating a solid first stage like a solid booster), and
   * Vega-C's liftoff T/W moves from 1.32 to 2.00 against the ~2.06 its published
   * 4 323 kN peak implies over the same stack.
   *
   * The remaining 3 % is the sea-level/vacuum blend, not the profile.
   */
  it('a solid-first-stage launcher lifts off at its published thrust-to-weight', () => {
    const vegac = VEHICLES.find((v) => v.id === 'vegac')!;
    const m0 = liftoffMass(vegac, 0.5 * vegac.payloadLEO);
    const tw = liftoffThrust(vegac) / (m0 * G0);
    const published = 4323e3 / (m0 * G0);
    expect(published, 'the published peak thrust over the same stack').toBeGreaterThan(2.0);
    expect(tw, `Vega-C liftoff T/W ${tw.toFixed(3)} vs published ${published.toFixed(3)}`)
      .toBeGreaterThan(published * 0.9);
    expect(tw, `Vega-C liftoff T/W ${tw.toFixed(3)} vs published ${published.toFixed(3)}`)
      .toBeLessThanOrEqual(published);
  });

  /**
   * The same motor must be counted the same way whether it is a first stage or
   * a strap-on. That was the asymmetry behind the test above, and it is the
   * kind of thing that comes back, so it is asserted directly: the P120C is
   * Vega-C's first stage and Ariane 6's booster.
   */
  it('a solid motor contributes the same liftoff thrust as a stage and as a booster', () => {
    const vegac = VEHICLES.find((v) => v.id === 'vegac')!;
    const ariane = VEHICLES.find((v) => v.id === 'ariane64')!;
    const perMotorAsStage = liftoffThrust(vegac);
    const boosters = ariane.stages[0].boosters![0];
    const perMotorAsBooster = boosters.count * boosters.engine.count * boosters.engine.thrustSL
      * solidProfile(0, boosters.engine.peakFactor) / boosters.count;
    expect(perMotorAsStage / perMotorAsBooster, 'same motor, same ignition factor').toBeCloseTo(1, 2);
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

  const LATITUDE_SLACK_DEG = 0.3;

  /**
   * The declared inclination pair and the azimuth corridor describe the same
   * site (audit item B25).
   *
   * `minInclination` / `maxInclination` and `azimuthMin` / `azimuthMax` are two
   * statements about one range-safety window, and before this wave they
   * contradicted each other: Vandenberg declared a 60 deg minimum against a
   * 147-201 deg corridor that reaches nothing below 61.6 deg, so the default
   * `leo` preset — which aims straight at `minInclination` — planned an ascent
   * on a heading the site's own data forbids and reported it as reachable.
   * Baikonur and Vostochny carried a byte-identical 30-200 deg placeholder that
   * implied a 46 deg inclination from Baikonur, below its own declared minimum.
   *
   * So the pair is re-measured here from the corridor itself, with the app's own
   * `rotatingLaunchAzimuth` at a 300 km circular orbit and both the ascending
   * and the descending solution, and the rule is one-sided in each direction: a
   * site may fly LESS than its geometry allows (Taiyuan declares 63 deg against
   * a corridor that reaches 61.2 deg — an operational limit, not a geometric
   * one), but it may never declare a target no azimuth in its own window can
   * fly. `maxInclination` is held to a kilometre-scale 0.2 deg of the measured
   * edge, because unlike `minInclination` it has no operational meaning to
   * diverge towards yet.
   *
   * The 0.3 deg slack on the low side is the same one `a site can reach the
   * minimum inclination it claims` already carries, for the same reason: a
   * site's published minimum is quoted for a pad that is not exactly at the
   * coordinates used here — Plesetsk declares 62.8 deg at 62.925 deg N — and at
   * those sites the binding limit is the latitude rather than the corridor.
   */
  it('the declared inclination pair is inside the site azimuth corridor', () => {
    const vOrb = circularSpeed(R_EARTH + 300e3);
    const inCorridor = (s: SiteExtra, deg: number): boolean => {
      const d = ((deg % 360) + 360) % 360;
      const lo = ((s.azimuthMin % 360) + 360) % 360;
      const hi = ((s.azimuthMax % 360) + 360) % 360;
      return lo <= hi ? d >= lo && d <= hi : d >= lo || d <= hi;
    };
    /** [lowest, highest] inclination the corridor reaches, deg. */
    const reach = (s: SiteExtra): [number, number] => {
      let lo = NaN; let hi = NaN;
      for (let i = 0; i <= 180; i += 0.05) {
        const hit = [false, true].some((descending) => {
          const az = rotatingLaunchAzimuth(s.latitude * DEG, i * DEG, vOrb, descending);
          return az !== null && inCorridor(s, az / DEG);
        });
        if (!hit) continue;
        if (isNaN(lo)) lo = i;
        hi = i;
      }
      return [lo, hi];
    };
    for (const s of SITES) {
      const [lo, hi] = reach(s);
      expect(isNaN(lo), `${s.id}: its azimuth corridor reaches no inclination at all`).toBe(false);
      expect(s.minInclination, `${s.id}: declared minimum ${s.minInclination}° below the ${lo.toFixed(1)}° its `
        + `${s.azimuthMin}-${s.azimuthMax}° corridor reaches`).toBeGreaterThanOrEqual(lo - LATITUDE_SLACK_DEG);
      expect(s.minInclination, `${s.id}: declared minimum ${s.minInclination}° above the ${hi.toFixed(1)}° its corridor reaches`)
        .toBeLessThanOrEqual(hi);
      expect(Math.abs(s.maxInclination - hi), `${s.id}: declared maximum ${s.maxInclination}° against a measured ${hi.toFixed(1)}°`)
        .toBeLessThanOrEqual(0.2);
      expect(s.maxInclination, s.id).toBeGreaterThan(s.minInclination);
      // The planner's own reach (`corridorReach`, closed form) is what the
      // verdict and the heading choice read; this sweep is the independent
      // instrument it is held to, to within the sweep's own 0.05° step.
      const reachDeg = corridorReach(s);
      expect(Math.abs(reachDeg.lo / DEG - lo), `${s.id}: corridorReach lo`).toBeLessThanOrEqual(0.051);
      expect(Math.abs(reachDeg.hi / DEG - hi), `${s.id}: corridorReach hi`).toBeLessThanOrEqual(0.051);
    }
  });

  /**
   * A `dragArea` override is a reference area, not a free parameter.
   *
   * Proton-M is the only vehicle that needs one (audit item B23: its 7.4 m
   * figure is the span across six outboard tanks, and the model turns the widest
   * stage diameter into a full circle), and the failure mode to guard against is
   * someone later tuning drag with it. The override has to be at least the
   * circle around the widest thing on the stack and no more than twice it —
   * which is exactly the band a core-plus-outboard-tanks cross-section sits in.
   */
  it('a dragArea override is between one and two times the widest circular section', () => {
    for (const v of VEHICLES) {
      if (v.dragArea === undefined) continue;
      const maxD = Math.max(...v.stages.map((s) => s.diameter), v.fairing?.diameter ?? 0);
      const circle = Math.PI * (maxD / 2) ** 2;
      expect(v.dragArea, `${v.id}: ${v.dragArea} m² against a ${circle.toFixed(1)} m² circle at ${maxD} m`)
        .toBeGreaterThanOrEqual(circle);
      expect(v.dragArea, `${v.id}: ${v.dragArea} m² is more than twice the ${circle.toFixed(1)} m² circle at ${maxD} m`)
        .toBeLessThanOrEqual(2 * circle);
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

  /**
   * `RATING_ORBITS` is the table that says what a published payload rating was
   * a rating FOR. It was exported with no consumer at all for two waves while
   * README.md advertised it, so it could have rotted against the fleet without
   * anything noticing. The setup panel reads it now (`updateStats`), which
   * means a stale key or an unknown site id is a visible defect, and these are
   * the invariants that catch one first.
   */
  it('every RATING_ORBITS entry points at a real vehicle, a real site and a rating the vehicle publishes', () => {
    const vehicleIds = new Set(VEHICLES.map((v) => v.id));
    for (const [id, refs] of Object.entries(RATING_ORBITS)) {
      expect(vehicleIds.has(id), `RATING_ORBITS key ${id} is not a vehicle`).toBe(true);
      const v = VEHICLES.find((x) => x.id === id)!;
      expect(refs.length, `${id}: empty rating list`).toBeGreaterThan(0);
      for (const o of refs) {
        expect(siteIds.has(o.siteId), `${id}/${o.rating}: unknown site ${o.siteId}`).toBe(true);
        const rated = o.rating === 'GTO' ? v.payloadGTO : o.rating === 'SSO' ? v.payloadSSO ?? 0 : v.payloadLEO;
        expect(rated, `${id}: a ${o.rating} reference orbit with no published ${o.rating} rating`).toBeGreaterThan(0);
        expect(o.apogeeKm, `${id}/${o.rating}: apogee below perigee`).toBeGreaterThanOrEqual(o.perigeeKm);
        expect(o.perigeeKm, `${id}/${o.rating}`).toBeGreaterThan(100);
        // A rating cannot be quoted for a plane the site cannot reach.
        const site = SITES.find((s) => s.id === o.siteId)!;
        expect(o.inclinationDeg, `${id}/${o.rating}: ${o.inclinationDeg}° is below ${o.siteId}'s minimum ${site.minInclination}°`)
          .toBeGreaterThanOrEqual(site.minInclination - 0.3);
        expect(o.source, `${id}/${o.rating}: no source`).toMatch(/^https?:\/\//);
      }
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
