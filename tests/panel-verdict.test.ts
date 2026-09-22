/**
 * The pre-flight feasibility verdict (audit B12).
 *
 * `missionVerdict` is the pure half of `SetupPanel.feasibility()` so that it
 * can be pinned without a DOM — the suite runs in `environment: 'node'`, and
 * the panel needs a document the moment it is constructed.
 *
 * The specs here are **synthetic on purpose**. The first version of this
 * feature was demonstrated against `soyuz21a`'s shipping `payloadLEO`, and the
 * demonstration stopped reproducing the moment another wave revised that
 * number from 7 020 to 7 430 kg: the feature was fine, the evidence was not.
 * A verdict test should pin the rule, not a figure owned by `src/data`.
 *
 * The two exceptions are at the bottom, and both are deliberate: the
 * range-safety corridor and the capability arithmetic are claims ABOUT the
 * shipped data and about the mission planner, so they are tested against the
 * real sites, the real fleet and the real `planMission` — down to the fleet
 * matrix's own exclusion tables, which is the only way "the verdict agrees with
 * the acceptance suite" can be checked rather than asserted (release review 2,
 * majors #2 and #3).
 */
import { describe, expect, it } from 'vitest';
import { missionVerdict, missionCapability, orbitClassOf, ratedPayload, reachableFromSite, type VerdictInput } from '../src/ui/panel';
import { siteById, type SiteExtra } from '../src/data/sites';
import { vehicleById } from '../src/data/vehicles';
import { satelliteById } from '../src/data/satellites';
import { orbitById } from '../src/data/orbits';
import { planMission, resolveTarget, launchWindows } from '../src/physics/mission';
import { probeInsertion } from '../src/physics/autotune';
import { guidanceForVehicle, DEFAULT_FAILURE } from '../src/physics/defaults';
import { RAD } from '../src/physics/constants';
import { allCases, caseKey, fleetCases, BEYOND_CAPABILITY, ARCHITECTURE, LAUNCH_TIME } from './fleet-harness';
import type { MissionConfig, OrbitSpec, VehicleSpec } from '../src/types';

const spec = { id: 'testbed', name: 'Testbed-1', payloadLEO: 10000, payloadGTO: 3000, payloadSSO: 8000 } as unknown as VehicleSpec;
// A synthetic range with a corridor about as wide as the widest real one
// (Vandenberg's reaches 105.0°), so the rating rules below are never decided by
// geometry. It needs a real azimuth window: the corridor is measured from the
// window (`corridorReach`), and at 28° N a 340–120° window reaches 105.1°.
const site = {
  id: 'testrange', name: 'Test Range', latitude: 28, minInclination: 28.5, maxInclination: 105.1,
  azimuthMin: 340, azimuthMax: 120, descendingForPolar: false,
} as unknown as SiteExtra;
const leo = { id: 'leo', name: 'LEO', perigee: 500e3, apogee: 500e3, inclination: 45, argPerigee: 0, raanMode: 'free' } as unknown as OrbitSpec;
const gto = { ...leo, id: 'gto', apogee: 35786e3 } as OrbitSpec;
const sso = { ...leo, id: 'sso', inclination: 97.8, raanMode: 'ltan' } as OrbitSpec;

const base = {
  spec, site, orbit: leo, satellite: satelliteById('cubesats'), payloadMass: 4000, inclinationDeg: 45,
  // No plan: the verdict then judges the mass and the corridor only, which is
  // exactly what `SetupPanel` does when `planMission` throws.
  plan: null, failureMode: 'none' as const, siteReassigned: false,
};

describe('mission verdict', () => {
  it('measures the payload against the rating of the orbit class', () => {
    expect(orbitClassOf(leo)).toBe('leo');
    expect(orbitClassOf(gto)).toBe('gto');
    expect(orbitClassOf(sso)).toBe('sso');
    expect(ratedPayload(spec, 'sso')).toEqual({ cap: 8000, cls: 'sso' });
    // no published SSO figure: judged on LEO and says which figure it used
    expect(ratedPayload({ ...spec, payloadSSO: undefined } as VehicleSpec, 'sso')).toEqual({ cap: 10000, cls: 'leo' });
  });

  it('reports a comfortable margin as ready', () => {
    const v = missionVerdict(base);
    expect(v.level).toBe('ok');
    expect(v.text).toContain('Ready to simulate');
  });

  it('fails a payload over the rating for that class', () => {
    const v = missionVerdict({ ...base, orbit: gto, payloadMass: 4000 });
    expect(v.level).toBe('fail');
    expect(v.text).toContain('exceeds');
  });

  it('warns at and above 90 % of the rating', () => {
    const v = missionVerdict({ ...base, payloadMass: 9500 });
    expect(v.level).toBe('warn');
    expect(v.text).toContain('Tight margin');
    // Inclusive: the fleet matrix's own 90 % rows land exactly on this line and
    // several of them are `BEYOND_CAPABILITY`, so 90.0 % is already tight.
    expect(missionVerdict({ ...base, payloadMass: 9000 }).level).toBe('warn');
    expect(missionVerdict({ ...base, payloadMass: 8999 }).level).toBe('ok');
  });

  it('warns about an unreachable inclination and about an armed failure', () => {
    expect(reachableFromSite(site, 20)).toBe(false);
    expect(reachableFromSite(site, 97.8)).toBe(true); // 82.2° plane, seen from the south
    const inc = missionVerdict({ ...base, inclinationDeg: 20 });
    expect(inc.level).toBe('warn');
    expect(inc.text).toContain('unreachable');
    const armed = missionVerdict({ ...base, failureMode: 'engineOut' });
    expect(armed.level).toBe('warn');
    expect(armed.text).toContain('Failure armed');
  });

  /**
   * Release review 2, minor #4. The `tight` branch used to return before the
   * `failureArmed` one, so the shipped default mission — permanently tight at
   * 96 % of the rating — never reported an armed failure at all: arming
   * "Range-safety destruct" left the note reading "Tight margin…" and the
   * flight then ended with `evt.ftsCommanded` at T+70 s. The armed failure is
   * now written first and every other clause follows it.
   */
  it('always reports an armed failure, whatever else the verdict says', () => {
    const tightAndArmed = missionVerdict({ ...base, payloadMass: 9500, failureMode: 'rangeSafety' });
    expect(tightAndArmed.level).toBe('warn');
    expect(tightAndArmed.text).toContain('Failure armed');
    expect(tightAndArmed.text).toContain('Tight margin');
    // …including on the verdicts that are already failures
    const overAndArmed = missionVerdict({ ...base, payloadMass: 12000, failureMode: 'engineOut' });
    expect(overAndArmed.level).toBe('fail');
    expect(overAndArmed.text).toContain('Failure armed');
    expect(overAndArmed.text).toContain('exceeds');
  });

  /**
   * The regression this file exists for. `siteReassigned` used to be set when
   * a vehicle change forced a different launch site and then never cleared,
   * which pinned the note to "this vehicle does not fly from the previous
   * site" for the rest of the session: every later tight margin, armed failure
   * or ready verdict was masked. The panel now clears the flag at the end of
   * `changed()`, i.e. as soon as the note has been rendered once, so the very
   * next edit reports the mission again.
   */
  it('reports the site change once and then reports the mission again', () => {
    const notice = missionVerdict({ ...base, payloadMass: 9500, siteReassigned: true });
    expect(notice.level).toBe('warn');
    expect(notice.text).toContain('does not fly from the previous site');
    // same state, notice consumed: the margin is visible again
    const after = missionVerdict({ ...base, payloadMass: 9500, siteReassigned: false });
    expect(after.text).toContain('Tight margin');
    const armed = missionVerdict({ ...base, failureMode: 'engineOut', siteReassigned: false });
    expect(armed.text).toContain('Failure armed');
  });

  it('never lets the site notice outrank a mission that cannot fly', () => {
    const over = missionVerdict({ ...base, payloadMass: 12000, siteReassigned: true });
    expect(over.level).toBe('fail');
    const none = missionVerdict({ ...base, spec: { ...spec, payloadGTO: 0 } as VehicleSpec, orbit: gto, payloadMass: 100, siteReassigned: true });
    expect(none.level).toBe('fail');
    expect(none.text).toContain('no published');
  });
});

// ---------------------------------------------------------------------------
// Against the real data: the range-safety corridor and the capability tables
// ---------------------------------------------------------------------------

/**
 * The verdict for a real mission, planned by the real planner — and, when the
 * static budget calls it marginal, flown by the real simulation.
 *
 * The probe gate here is `SetupPanel.refreshInsertionProbe`'s gate, written out
 * rather than imported so that this file keeps saying what the panel does
 * instead of agreeing with it by construction: the insertion is flown when the
 * ascent stages are short of the orbit they are aimed at, or when the payload
 * is at 90 % of the rating or above.
 */
function verdictFor(vehicleId: string, siteId: string, orbitId: string, satelliteId: string, mass?: number, extra: Partial<VerdictInput> = {}) {
  const spec = vehicleById(vehicleId);
  const site = siteById(siteId);
  const orbit = orbitById(orbitId);
  const satellite = satelliteById(satelliteId);
  const payloadMass = mass ?? satellite.mass;
  const cfg: MissionConfig = {
    vehicleId, satelliteId, siteId, orbit,
    // These cases isolate vehicle capability; plane-window warnings have a
    // dedicated test, so use a valid window when the preset constrains it.
    launchTime: orbit.raanMode === 'free' ? LAUNCH_TIME : (launchWindows(orbit, site, LAUNCH_TIME, 1)[0]?.time ?? LAUNCH_TIME),
    guidance: guidanceForVehicle(spec), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: payloadMass,
  };
  const plan = planMission(cfg, site, spec);
  const capability = missionCapability(spec, satellite, payloadMass, plan);
  const { cap } = ratedPayload(spec, orbitClassOf(orbit));
  const marginal = capability.ascentShortfall > 0 || (cap > 0 && payloadMass >= cap * 0.9);
  const insertion = marginal ? probeInsertion(cfg) : null;
  return {
    plan,
    insertion,
    verdict: missionVerdict({
      spec, site, orbit, satellite, payloadMass,
      inclinationDeg: resolveTarget(orbit, site, LAUNCH_TIME).inclination * RAD,
      plan, insertion, failureMode: 'none', siteReassigned: false, ...extra,
    }),
  };
}

describe('mission verdict · range-safety corridor', () => {
  /**
   * Release review 2, major #2, with the two cases it names.
   *
   * Starbase declares 26–31.8° behind an 80–110° azimuth window; Xichang
   * 28.5–31° behind 94–104°, which is why it is the geostationary site and
   * never flies polar. Both were reachable through the normal UI with no state
   * poking — pick Starship, pick Starbase, click the ISS preset — and the app
   * planned the 51.64° mission, inserted at 420 × 410 km and called it
   * "Ready to simulate · 7 150 kg of 100 000 kg rated to LEO".
   */
  it('fails a target above the site corridor, for the planner and the verdict alike', () => {
    for (const [vehicle, siteId, orbit] of [['starship', 'starbase', 'iss'], ['longmarch3be', 'xichang', 'sso']] as const) {
      const { plan, verdict } = verdictFor(vehicle, siteId, orbit, 'cubesats');
      const s = siteById(siteId);
      expect(plan.inclinationReachable, `${vehicle}/${siteId}/${orbit}`).toBe(false);
      expect(verdict.level, `${vehicle}/${siteId}/${orbit}: ${verdict.text}`).toBe('fail');
      expect(verdict.text).toContain('range-safety corridor');
      expect(verdict.text).toContain(s.maxInclination.toFixed(1));
    }
  });

  it('leaves the missions those sites really fly alone', () => {
    // Starbase flies Starship to its own 26-31.8° band; Xichang is the GTO site.
    expect(verdictFor('starship', 'starbase', 'leo', 'cubesats').verdict.text).not.toContain('range-safety corridor');
    expect(verdictFor('longmarch3be', 'xichang', 'gto', 'cubesats').verdict.text).not.toContain('range-safety corridor');
    // …and so is the app's own default mission, from a site whose corridor
    // reaches 91.8°.
    const dflt = verdictFor('soyuz21a', 'baikonur', 'iss', 'crew');
    expect(dflt.plan.inclinationReachable).toBe(true);
    expect(dflt.verdict.text).not.toContain('range-safety corridor');
  });

  it('does not call a target BELOW the minimum a corridor violation', () => {
    // Plesetsk declares 62.8° and the ISS plane is 51.64°: unreachable from
    // there, but as a plane change at apogee rather than as a heading the range
    // forbids. (What this particular stack then says is that it cannot AFFORD
    // the 11° plane change — 1 571 m/s of burns against the crew ship's 379 —
    // which is the capability check doing its job on top of the geometry.)
    const { plan, verdict } = verdictFor('soyuz21a', 'plesetsk', 'iss', 'crew');
    expect(plan.inclinationReachable).toBe(false);
    expect(plan.planeChangeDeg).toBeGreaterThan(10);
    expect(verdict.text).not.toContain('range-safety corridor');
  });
});

/**
 * Rows the fleet matrix excludes that a pre-flight verdict cannot see, with the
 * measurement that says why. The list is asserted to be exactly right in both
 * directions below, so it cannot quietly grow.
 *
 * `pslvxl/gto/50` is short of NOTHING the planner computes: +346 m/s of ascent
 * margin, a restartable PS4 whose own ideal Δv (2.8 km/s with 713 kg) covers
 * the 2.0 km/s the plan asks of it, and an insertion orbit the ascent is aimed
 * straight at. It runs dry all the same, because a four-stage stack with this
 * much drag spends more than `ASCENT_LOSS_ALLOWANCE` — and the losses are the
 * one term in the budget that only a flight can measure. The verdict is
 * deliberately not a flight (see `missionVerdict`), so this is a stated limit
 * of the check rather than a hole in it.
 */
const STATICALLY_INVISIBLE: Record<string, string> = {
  'pslvxl/gto/50': 'short only in the ascent losses, which no static budget carries',
};

describe('mission verdict · agrees with the fleet acceptance suite', () => {
  const byKey = new Map(allCases().map((c) => [caseKey(c), c]));
  const rows = (table: Record<string, string>): string[] => Object.keys(table).sort();

  /**
   * Release review 2, major #3: the verdict showed a green "Ready to simulate"
   * for combinations the project's own suite already classifies as unable to
   * reach the target, so the user was promised success and handed a miss. Long
   * March 2D / Jiuquan / SSO 600 km with the 300 kg dispenser was the measured
   * case: verdict level 'ok', flight ending at 607 × 187 km with
   * `evt.noStagesLeft`, `evt.insufficientDv` and `evt.offTargetOrbit`.
   *
   * Both exclusion tables are iterated, not a hand-picked case: every row the
   * suite files as beyond the vehicle (`BEYOND_CAPABILITY`) or beyond the
   * architecture (`ARCHITECTURE`) has to come out as something other than
   * ready.
   */
  for (const [name, table] of [['BEYOND_CAPABILITY', BEYOND_CAPABILITY], ['ARCHITECTURE', ARCHITECTURE]] as const) {
    it(`is never 'ready' for a ${name} row`, () => {
      const ready: string[] = [];
      for (const key of rows(table)) {
        if (key in STATICALLY_INVISIBLE) continue;
        const c = byKey.get(key)!;
        const { verdict } = verdictFor(c.vehicle, c.site, c.orbit, 'cubesats', c.mass);
        if (verdict.level === 'ok') ready.push(`${key}: ${verdict.text}`);
      }
      expect(ready, `the suite excludes these, the verdict promises them:\n${ready.join('\n')}`).toEqual([]);
    });
  }

  it('keeps the list of rows it cannot see honest', () => {
    // An entry that HAS become visible must leave the list, and an entry that
    // names a row the suite no longer excludes must leave with it.
    for (const key of Object.keys(STATICALLY_INVISIBLE)) {
      expect(BEYOND_CAPABILITY[key] ?? ARCHITECTURE[key], `${key} is no longer an exclusion`).toBeDefined();
      const c = byKey.get(key)!;
      const { verdict } = verdictFor(c.vehicle, c.site, c.orbit, 'cubesats', c.mass);
      expect(verdict.level, `${key} is visible after all — remove it from STATICALLY_INVISIBLE`).toBe('ok');
    }
  });

  /**
   * The Long March 2D case from the review, in full: the same vehicle, site and
   * orbit the app offers, with the payload the panel defaults to for a
   * sun-synchronous mission.
   */
  it('reports Long March 2D to a 600 km sun-synchronous orbit as beyond the stack', () => {
    const { plan, verdict } = verdictFor('longmarch2d', 'jiuquan', 'sso', 'cubesats');
    const cap = missionCapability(vehicleById('longmarch2d'), satelliteById('cubesats'), 300, plan);
    expect(cap.singleShot).toBe(true);   // two hypergolic stages, no restart, inert payload
    expect(cap.stranded).toBe(true);     // …and direct insertion closes at 200 km, not 600
    expect(verdict.level).toBe('fail');
    expect(verdict.text).toContain('no restartable upper stage');
    // The same launcher with the payload class it really flies — a spacecraft
    // with its own engine — is a mission, and says so.
    const real = verdictFor('longmarch2d', 'jiuquan', 'sso', 'earthObs', 650);
    expect(real.verdict.level, real.verdict.text).toBe('ok');
  });

  /**
   * The reported defect, on the verdict side.
   *
   * Proton-M / Briz-M + the 7.15 t crew ship from Baikonur to the ISS used to
   * read amber — "the ascent stages are 393 m/s short of this orbit: the upper
   * stage has to make up the difference" — and the flight then broke up at
   * 46 kPa 668 s after its own SECO. The note was not merely optimistic, it was
   * making a claim (that the Briz-M can make up the difference) that is true at
   * 5.75 t and false at 7.15 t, and nothing in the static budget separates
   * those two: the plan's `ascentMakeUp` is 247 and 370 m/s against a 3.6 km/s
   * kick stage, and the term that decides it — how far 19.6 kN sinks closing
   * the gap — is CUBIC in a shortfall the loss allowance only knows to ±500 m/s.
   *
   * So the verdict flies it. Both halves are asserted, because a red verdict
   * that is red for everything would be no better than an amber one that is
   * amber for everything.
   */
  it('reports Proton-M with the crew ship to the ISS as beyond the stack, and 5.75 t as a mission', () => {
    const heavy = verdictFor('protonm', 'baikonur', 'iss', 'crew', 7150);
    expect(heavy.insertion?.reachesOrbit, 'the probe should have been run and should fail').toBe(false);
    expect(heavy.verdict.level, heavy.verdict.text).toBe('fail');
    expect(heavy.verdict.text).toContain('does not reach orbit');
    // …and it is the plan that says it is marginal enough to be worth flying.
    expect(heavy.plan.ascentMargin).toBeLessThan(0);
    expect(heavy.plan.weakFinalStage).toBe(true);

    const light = verdictFor('protonm', 'baikonur', 'iss', 'crew', 5750);
    expect(light.insertion?.reachesOrbit, 'the same stack 1.4 t lighter').toBe(true);
    expect(light.verdict.level, light.verdict.text).toBe('warn');
    // The amber note is now only said when it is true.
    expect(light.verdict.text).toContain('upper stage has to make up the difference');
  }, 60000);

  /**
   * The probe can only ever make a verdict worse, so the thing to guard is the
   * other direction: every row the acceptance suite FLIES has to survive it.
   * Two of them are the reason the verdict does not compute this statically —
   * `angaraa5/leo/25` and `angaraa5/sso/25` are both called beyond capability
   * by the static sink arithmetic and both deliver their orbit.
   */
  it('never fails a row the acceptance suite flies', () => {
    const wrong: string[] = [];
    for (const c of fleetCases()) {
      const { verdict, insertion } = verdictFor(c.vehicle, c.site, c.orbit, 'cubesats', c.mass);
      if (verdict.level === 'fail') wrong.push(`${caseKey(c)}: ${verdict.text}`);
      if (insertion && !insertion.reachesOrbit) wrong.push(`${caseKey(c)}: the probe says it does not reach orbit`);
    }
    expect(wrong, `the suite flies these, the verdict refuses them:\n${wrong.join('\n')}`).toEqual([]);
  }, 300000);

  it('leaves the app default and the accepted fleet rows alone', () => {
    // The default mission is tight (7 150 of 7 430 kg) and nothing else.
    const dflt = verdictFor('soyuz21a', 'baikonur', 'iss', 'crew');
    expect(dflt.verdict.level).toBe('warn');
    expect(dflt.verdict.text).toContain('Tight margin');
    // A flagship accepted row is not a capability failure.
    for (const [v, s, o, m] of [['falcon9', 'cape', 'iss', 7800], ['electron', 'mahia', 'sso', 100]] as const) {
      const { verdict } = verdictFor(v, s, o, 'cubesats', m);
      expect(verdict.level, `${v}/${o}: ${verdict.text}`).not.toBe('fail');
    }
  });
});
