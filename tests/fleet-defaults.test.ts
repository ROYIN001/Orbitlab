/**
 * Fleet acceptance: every launcher must reach its reference orbits with the
 * DEFAULT guidance plus its own `guidanceDefaults` — no auto-tuning.
 *
 * Each vehicle flies from the first site it lists to
 *   - 'leo'  (500 km circular at the site's minimum inclination),
 *   - 'iss'  (420 km, 51.64°) when the site's range-safety minimum allows it,
 *   - 'sso'  (600 km, ~97.8°),
 *   - 'gto'  (250 × 35 786 km) for vehicles with a published GTO capability,
 * at 25 %, 50 % and 90 % of the reference payload for that orbit.
 *
 * The payload is the inert CubeSat dispenser, so nothing but the launcher's own
 * stages contributes: a spacecraft with an apogee engine would hide guidance
 * problems behind its own propulsion. The one mission flown with a live
 * spacecraft is the application's own default (Soyuz-2.1a + crew ship → ISS),
 * which has its own test at the bottom of this file.
 *
 * Combinations the model does not fly are listed in one of four tables in
 * `tests/fleet-harness.ts` — with the matrix they exclude, and where
 * `tests/panel-verdict.test.ts` can read them too, so that "the pre-flight
 * verdict never promises a row this suite excludes" can be checked against the
 * real lists instead of a copy of them. Every entry carries the *measured*
 * outcome. The tables are not interchangeable — which one a case lands in
 * follows a rule that can be checked against the flight, not from an opinion
 * about the vehicle:
 *
 *   1. `SITE_GEOMETRY` — the launch is not flyable from that site at all: the
 *      azimuth the orbit needs lies outside the site's range-safety window.
 *      Generated from the site data itself, so it cannot drift.
 *   2. `BEYOND_CAPABILITY` — the flight ends with the tanks empty, or the ideal
 *      delta-v of the stages that have to fly the ascent is below what the
 *      MISSION's orbit costs (perigee speed + `ASCENT_LOSS_ALLOWANCE` − the
 *      Earth-rotation credit + `ASCENT_MARGIN_REQUIRED` — the same test
 *      `planMission` itself uses, reported on the plan as `ascentMargin`).
 *
 *      That rule is now ENFORCED, not just stated: `every BEYOND_CAPABILITY
 *      entry satisfies the rule it is filed under` flies each key and fails if
 *      it is neither out of propellant nor short of margin. The rule was
 *      written down before this wave and four rows in the table broke it —
 *      `vulcan/leo/90`, `vulcan/iss/90`, `ariane64/iss/90` and `pslvxl/iss/90`
 *      all end destroyed with 1.0–2.9 km/s aboard and +188 to +1 865 m/s of
 *      margin, an order of magnitude over the threshold. Two of them had been
 *      MOVED here out of `KNOWN_GUIDANCE_FAILURES` by the previous wave, which
 *      is what let that wave report "six defects closed" when it had closed
 *      four (review follow-up). All four are back below, where they belong.
 *
 *      Several genuine entries end in a break-up rather than an empty tank, and
 *      that is the classification working, not failing: an underpowered stack
 *      flying a closed-loop ascent flattens, sinks back into dense air and
 *      passes its max-Q placard. The model throttles back on that placard
 *      (`loadReliefThrottle`, the load relief every real launcher has), which
 *      is what a vehicle does about it; it does not turn a delta-v shortfall
 *      into performance. The discriminator is the margin, not the event that
 *      ends the flight — which is exactly why the margin, and not the event,
 *      is what the enforcing test looks at.
 *   3. `ARCHITECTURE` — propellant is left and the orbit is reachable, but
 *      nothing in the stack can use it: no restart, no kick stage, no
 *      propulsion on the payload.
 *   4. `KNOWN_GUIDANCE_FAILURES` — everything else: the vehicle had both the
 *      delta-v and a way to spend it, and the guidance still lost or missed the
 *      orbit. These are defects, and `known guidance failures still fail`
 *      asserts they are all still broken so the list cannot rot. It holds FOUR
 *      entries; see the table's own comment for what closed, what was
 *      mis-filed, and what the count this file used to report actually was.
 *
 * See `docs/PHYSICS.md`, "Fleet acceptance and reference payloads", for the
 * numbers behind the classification.
 */
import { describe, it, expect } from 'vitest';
import { orbitById } from '../src/data/orbits';
import { siteById } from '../src/data/sites';
import { VEHICLES } from '../src/data/vehicles';
import { Simulation } from '../src/physics/simulation';
import { DEFAULT_GUIDANCE, DEFAULT_FAILURE } from '../src/physics/defaults';
import {
  azimuthAllowedFor, azimuthInWindow, planMission, resolveTarget, ASCENT_MARGIN_REQUIRED, DIRECT_INSERTION_CEILING,
  ORBIT_INSERTION_FLOOR, kickStageSink, launchWindows,
} from '../src/physics/mission';
import { probeInsertion } from '../src/physics/autotune';
import type { MissionConfig } from '../src/types';
import { RAD, DEG, R_EARTH, MU_EARTH } from '../src/physics/constants';
import {
  LAUNCH_TIME, allCases, caseKey, flyCase, acceptanceFailures, insertionTime, insertionLimit,
  achievedElements, fleetCases, TANKS_EMPTY_DV,
  SITE_GEOMETRY, BEYOND_CAPABILITY, KNOWN_GUIDANCE_FAILURES, EXCLUDED,
} from './fleet-harness';


/**
 * Vehicles whose every matrix row is excluded, and the real mission that is
 * flown instead. Both are single-shot stacks: no restartable stage anywhere, so
 * the orbit the ascent cuts off in is the final one, and the matrix's
 * 420-600 km circular presets flown with an INERT payload are not missions they
 * have. Flown with the payload class they really launch — a spacecraft with its
 * own propulsion — both complete.
 *
 * The map carries the flight itself, not the name of a test that claims to fly
 * it. `a fully excluded vehicle must have a dedicated mission that succeeds`
 * below flies every entry and asserts `evt.targetOrbit` and the absence of
 * `evt.offTargetOrbit` / `evt.insufficientDv`, so the gate cannot be satisfied
 * by a test of a flight the simulator classes as a failure — which is what
 * happened when this was a map of test names. `name` is documentation: it says
 * which `it` describes the same flight in full.
 */
interface DedicatedMission {
  name: string;
  fly: () => Simulation;
}

const DEDICATED_MISSIONS: Record<string, DedicatedMission> = {
  soyuz21a: {
    name: 'default mission › soyuz21a + crew ship reaches the ISS orbit from baikonur',
    fly: () => flySoyuzDefaultMission(),
  },
  longmarch2d: {
    name: 'real missions › Long March 2D delivers a sun-synchronous remote-sensing satellite from Jiuquan',
    fly: () => flyLongMarch2D(650),
  },
};


describe('fleet acceptance with default guidance', () => {
  for (const c of fleetCases()) {
    it(`${c.vehicle} → ${c.orbit} with ${c.percent} % payload (${c.mass} kg) from ${c.site}`, () => {
      const sim = flyCase(c);
      const log = sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
      const failures = acceptanceFailures(sim, c);
      expect(failures, `${failures.join('; ')} (${log})`).toEqual([]);
    }, 60000);
  }
});

describe('excluded combinations', () => {
  it('every exclusion key names a real case', () => {
    const keys = new Set(allCases().map(caseKey));
    for (const k of Object.keys(EXCLUDED)) expect(keys, `${k} is not a fleet case`).toContain(k);
  });

  it('the vehicles that fly the sun-synchronous preset are the ones range safety and capability both allow', () => {
    // The flown set is an *intersection*, not a range-safety statement on its
    // own: a vehicle appears here only if (a) its first site's azimuth window
    // contains the retrograde launch — Plesetsk (330–90°), Vostochny (340–95°),
    // Vandenberg (147–201°), Mahia and Jiuquan (90–200°) and Taiyuan (144–200°)
    // are the sites in the data that qualify — and (b) at least one of its
    // three `sso` rows survives the capability and architecture tables.
    // Tanegashima, Sriharikota and Kourou fly it in reality with a dogleg this
    // model does not have, so they are not among them. Electron keeps all three (its rows
    // are graded against its own 200 kg sun-synchronous rating) and Angara-A5
    // keeps one. Long March 2D passes the range-safety half from Jiuquan and is
    // absent only because of (b): all three of its `sso` rows are excluded
    // above, architecturally — it has no restart, not too little delta-v.
    const flown = new Set(fleetCases().filter((c) => c.orbit === 'sso').map((c) => c.vehicle));
    expect([...flown].sort()).toEqual(['angaraa5', 'electron']);
    expect(azimuthAllowedFor(siteById('jiuquan'), resolveTarget(orbitById('sso'), siteById('jiuquan'), LAUNCH_TIME).inclination))
      .toBe(true);
    expect(SITE_GEOMETRY['longmarch2d/sso/25']).toBeUndefined();
  });

  // Audit item 10 (docs/AUDIT-2026-09-16.md): the fleet gate may not gain a
  // vehicle it never actually flies. A vehicle whose every matrix row is
  // excluded is allowed only when a dedicated mission flies it to an orbit it
  // really reaches AND SUCCEEDS there — the `default mission` precedent, which
  // is how Soyuz-2.1a has always been covered: `evt.targetOrbit` present, the
  // final orbit on target.
  //
  // The gate flies the mission itself rather than naming a test that claims to.
  // An earlier form of this gate only compared two lists of strings, and was
  // satisfied by a test of a flight whose own event log ended
  // `evt.noStagesLeft evt.insufficientDv evt.offTargetOrbit`.
  it('a fully excluded vehicle must have a dedicated mission that succeeds', () => {
    const flownVehicles = new Set(fleetCases().map((c) => c.vehicle));
    const fully = VEHICLES.map((v) => v.id).filter((id) => !flownVehicles.has(id));
    expect(fully.sort(), 'every vehicle here needs an entry in DEDICATED_MISSIONS')
      .toEqual(Object.keys(DEDICATED_MISSIONS).sort());
    for (const id of fully) {
      const sim = DEDICATED_MISSIONS[id].fly();
      const keys = sim.events.map((e) => e.key);
      const log = `${id} (${DEDICATED_MISSIONS[id].name}): ` + sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
      for (const k of [
        'evt.impact', 'evt.vehicleLost', 'evt.structuralFailure', 'evt.rangeSafety',
        'evt.offTargetOrbit', 'evt.insufficientDv',
      ]) {
        expect(keys, log).not.toContain(k);
      }
      expect(keys, log).toContain('evt.targetOrbit');
      expect(sim.state.status, log).toBe('orbit');
    }
  }, 120000);

  /**
   * The classification rule, enforced instead of stated.
   *
   * `BEYOND_CAPABILITY` claims something checkable about every key it holds:
   * either the flight ends out of propellant, or the stages that have to fly
   * the ascent never had the ideal delta-v for the mission's orbit. Until this
   * wave nothing checked it, and four rows broke it — two of them because they
   * were moved here out of `KNOWN_GUIDANCE_FAILURES` rather than fixed, which
   * is how a "six defects closed" headline was written for a wave that closed
   * four (review follow-up).
   *
   * Both halves of the rule come from the library, not from a number typed
   * here: `MissionPlan.ascentMargin` is computed by `planMission` with the
   * shipped `ASCENT_LOSS_ALLOWANCE`, and `ASCENT_MARGIN_REQUIRED` is the same
   * threshold the planner uses to decide what to aim at. A row that satisfies
   * neither half is not a statement about the vehicle, and it belongs in
   * `KNOWN_GUIDANCE_FAILURES`.
   */
  it('every BEYOND_CAPABILITY entry satisfies the rule it is filed under', () => {
    const byKey = new Map(allCases().map((c) => [caseKey(c), c]));
    const wrong: string[] = [];
    for (const k of Object.keys(BEYOND_CAPABILITY)) {
      const c = byKey.get(k)!;
      const sim = flyCase(c);
      const dvLeft = sim.vehicle.deltaVRemaining();
      const margin = sim.plan.ascentMargin;
      if (dvLeft < TANKS_EMPTY_DV || margin < ASCENT_MARGIN_REQUIRED) continue;
      wrong.push(`${k}: ${Math.round(dvLeft)} m/s still aboard AND +${Math.round(margin)} m/s of ascent margin`
        + ` (${sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ')})`);
    }
    expect(wrong, 'neither out of propellant nor short of delta-v — these are guidance defects, '
      + `not capability limits, and belong in KNOWN_GUIDANCE_FAILURES:\n${wrong.join('\n')}`).toEqual([]);
  }, 300000);

  // The to-do list must stay a to-do list: if one of these starts working, the
  // entry belongs in the acceptance set, not in a table of defects.
  it('known guidance failures still fail', () => {
    const byKey = new Map(allCases().map((c) => [caseKey(c), c]));
    const fixed: string[] = [];
    for (const k of Object.keys(KNOWN_GUIDANCE_FAILURES)) {
      const c = byKey.get(k)!;
      if (acceptanceFailures(flyCase(c), c).length === 0) fixed.push(k);
    }
    expect(fixed, `these now meet the acceptance criteria — move them out of KNOWN_GUIDANCE_FAILURES: ${fixed.join(', ')}`)
      .toEqual([]);
  }, 120000);

  /**
   * A retrograde apsis trim has to actually move the apsis.
   *
   * The acceptance matrix already covers these three rows, but it covers them
   * by their end state, and the defect this guards against has a distinctive
   * SHAPE: a burn that ignites and reports `evt.burnComplete` within a second or
   * two, leaving the apsis where it was, followed by the same burn again one
   * revolution later. That can come back without the final orbit changing (the
   * flight would just take four hours to give up), so it is asserted directly.
   */
  it('a retrograde apsis trim moves the apsis it was aimed at', () => {
    const byKey = new Map(allCases().map((c) => [caseKey(c), c]));
    for (const key of ['atlasv551/iss/50', 'vulcan/iss/50', 'h2a202/iss/90']) {
      const c = byKey.get(key)!;
      const sim = flyCase(c);
      const log = `${key}: ` + sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
      expect(acceptanceFailures(sim, c), log).toEqual([]);
      // Every completed burn has to leave the orbit measurably closer to the
      // target than the one before it. A burn's DURATION is not the test — the
      // H-IIA's final trim is a legitimate 0.4 s and moves the apogee 14 km —
      // the test is whether the apsis moved.
      const target = resolveTarget(orbitById(c.orbit), siteById(c.site), LAUNCH_TIME);
      const residual = (e: { params?: Record<string, string | number> }): number =>
        Math.abs(Number(e.params!.ap) * 1e3 - target.apogee) + Math.abs(Number(e.params!.pe) * 1e3 - target.perigee);
      const completions = sim.events.filter((e) => e.key === 'evt.burnComplete');
      let prev = residual(sim.events.find((e) => e.key === 'evt.parkingOrbit')!);
      for (const [i, e] of completions.entries()) {
        const now = residual(e);
        expect(prev - now, `burn ${i} left the residual at ${Math.round(now / 1e3)} km — ${log}`)
          .toBeGreaterThan(1e3);
        prev = now;
      }
      // ...and the whole mission fits inside a few revolutions, not the
      // 3.9-4.4 hours of hung coast the defect produced.
      expect(sim.state.t, log).toBeLessThan(10000);
    }
  }, 120000);

  /**
   * The insertion floor, over the whole matrix.
   *
   * The defect this guards against is not a bad orbit, it is a *lie about the
   * timeline*: Proton-M/Briz-M with the 7.15 t crew ship reported SECO at
   * T+570 s, "coasting to apoapsis", and then broke up at 46 kPa at T+1238 s —
   * 668 s of the user watching a flight that had already failed, ending in a
   * structural failure the vehicle had no business reaching. A break-up during
   * an ascent that is visibly sagging is an honest end for an underpowered
   * stack and several `BEYOND_CAPABILITY` rows have one; a break-up AFTER the
   * flight has announced that it is in an orbit is not, and no amount of
   * capability shortfall makes it one.
   *
   * So the rule is ordering, not outcome, and it is asserted over every row in
   * the matrix — accepted and excluded alike, because the excluded rows are
   * where the break-ups live.
   */
  it('no flight breaks up after it has reported an insertion', () => {
    const bad: string[] = [];
    for (const c of allCases()) {
      const key = caseKey(c);
      if (SITE_GEOMETRY[key]) continue;
      const sim = flyCase(c);
      const first = (k: string): number => sim.events.find((e) => e.key === k)?.t ?? Infinity;
      const insertion = Math.min(first('evt.seco'), first('evt.parkingOrbit'));
      const breakUp = first('evt.structuralFailure');
      // A break-up during an ascent that never announced an insertion is the
      // honest end of an underpowered stack and several excluded rows have one.
      if (!isFinite(breakUp) || !isFinite(insertion) || breakUp < insertion) continue;
      bad.push(`${key}: ${sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ')}`);
    }
    expect(bad, `a structural failure after evt.seco / evt.parkingOrbit: ${bad.join(' | ')}`).toEqual([]);
  }, 300000);

  /**
   * ...and nothing under the floor is reported as a parking orbit.
   *
   * The quieter half of the same defect. With 1.4 t less payload the Proton
   * flight above did not break up — it announced "parking orbit 94 × 94 km" and
   * flew a 43-minute transfer with a 94 km perigee to a perfectly good 498 km
   * orbit. The mission succeeded and the report of it was false.
   */
  it('no flight reports a parking orbit below the insertion floor', () => {
    const bad: string[] = [];
    for (const c of allCases()) {
      const key = caseKey(c);
      if (SITE_GEOMETRY[key]) continue;
      const sim = flyCase(c);
      for (const e of sim.events) {
        if (e.key !== 'evt.parkingOrbit') continue;
        const pe = Number(e.params!.pe) * 1e3;
        if (pe < ORBIT_INSERTION_FLOOR - 5e3) bad.push(`${key}: parking orbit at ${Math.round(pe / 1e3)} km (T+${Math.round(e.t)} s)`);
      }
    }
    expect(bad, `reported as a parking orbit below ${ORBIT_INSERTION_FLOOR / 1e3} km: ${bad.join(' | ')}`).toEqual([]);
  }, 300000);

  it('no more than a twentieth of the fleet matrix is a guidance defect', () => {
    // A ratchet, not a target: the wave that fixes these lowers the number.
    const total = allCases().length - Object.keys(SITE_GEOMETRY).length;
    expect(Object.keys(KNOWN_GUIDANCE_FAILURES).length / total).toBeLessThanOrEqual(0.05);
  });
});

// ---------------------------------------------------------------------------
// The application's own default mission
// ---------------------------------------------------------------------------

/**
 * What the setup panel offers when the page is opened: Soyuz-2.1a with the
 * 7.15 t crew ship from Baikonur to the ISS. It is flown with the *unresolved*
 * library guidance, exactly as `SetupPanel.getConfig()` hands it over, so this
 * also pins the vehicle-default merge inside `Simulation`.
 *
 * The launcher's own job is the ~200 km circular parking orbit a crewed R-7
 * really flies (200 × 240 km in the published profile); the crew ship's own
 * propulsion raises that to the station altitude.
 */
function flySoyuzDefaultMission(): Simulation {
  const cfg: MissionConfig = {
    vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbit: orbitById('iss'),
    launchTime: launchWindows(orbitById('iss'), siteById('baikonur'), LAUNCH_TIME, 1)[0].time,
    guidance: { ...DEFAULT_GUIDANCE },
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: 7150,
  };
  const sim = new Simulation(cfg, { headless: true });
  let guard = 0;
  while (!sim.done && sim.state.t < 6 * 3600 && guard++ < 400000) sim.step(sim.suggestedDt());
  return sim;
}

/**
 * Proton-M / Briz-M with the application's own default satellite.
 *
 * The reported defect this section exists for: Proton-M / Briz-M + the 7.15 t
 * crew ship from Baikonur to the ISS, default guidance, no auto-tune. The
 * pre-flight verdict was amber — "the ascent stages are 393 m/s short of this
 * orbit: the upper stage has to make up the difference" — the flight reported
 * SECO at T+570 s and a coast to apoapsis, and then broke up at T+1238 s on the
 * max-Q placard at 46 kPa, 668 s later, with 3.6 km/s still in the Briz-M.
 *
 * MEASURED, and this is the whole reason the case is filed as a capability
 * limit rather than a guidance defect. The three Proton stages have to carry a
 * 22.17 t Briz-M as well as the payload, and at 7.15 t they cut off at
 * 210 × −1 733 km with 7 094 m/s, 690 m/s short of the 7 784 m/s a 200 km
 * circular orbit needs. The Briz-M has 3.6 km/s of ideal Δv and 19.6 kN of
 * thrust — 0.64 m/s² under 29.3 t — so closing 690 m/s takes it ~1 080 s, and
 * `kickStageSink` puts the drop over such a burn at ~250 km against the 60 km
 * the ascent can give it. `MissionPlan.ascentMargin` is −243 m/s, i.e. 393 m/s
 * below the margin the planner asks for, so the case satisfies the
 * `BEYOND_CAPABILITY` rule as written.
 *
 * A 48-point sweep of the tuning grid (kick 1.5-8°, turn rate 0.25-0.5 °/s,
 * pitch limit 20-35°, loft 0-150 km — 300 flights) is on the record: 24 of the
 * 300 reach the target, all of them at kick angles of 6-8° with turn rates the
 * fleet does not use, and none at or near the shipped programme. With the
 * DEFAULT guidance this combination does not fly, which is what this test
 * pins — together with the thing that had to change regardless: it now ends
 * honestly instead of being destroyed.
 */
describe('Proton-M / Briz-M with the crew ship', () => {
  const protonCrew = (mass: number): MissionConfig => ({
    vehicleId: 'protonm', satelliteId: 'crew', siteId: 'baikonur', orbit: orbitById('iss'),
    launchTime: launchWindows(orbitById('iss'), siteById('baikonur'), LAUNCH_TIME, 1)[0].time,
    guidance: { ...DEFAULT_GUIDANCE },
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: mass,
  });

  /** The flight, and the state the ascent handed the Briz-M. */
  function fly(mass: number): { sim: Simulation; seco: { t: number; alt: number; vh: number } } {
    const sim = new Simulation(protonCrew(mass), { headless: true });
    const seco = { t: -1, alt: 0, vh: 0 };
    let guard = 0;
    while (!sim.done && sim.state.t < 6 * 3600 && guard++ < 400000) {
      sim.step(sim.suggestedDt());
      if (seco.t < 0 && sim.events.some((e) => e.key === 'evt.seco')) {
        seco.t = sim.state.t;
        seco.alt = sim.state.altitude;
        seco.vh = Math.sqrt(Math.max(0, sim.state.speed ** 2 - sim.state.vz ** 2));
      }
    }
    return { sim, seco };
  }

  it('is beyond the stack at 7.15 t, and ends saying so instead of breaking up', () => {
    const { sim, seco } = fly(7150);
    const log = sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
    const keys = sim.events.map((e) => e.key);

    // The measured reason it is excluded, read off the plan rather than quoted.
    expect(sim.plan.ascentMargin, log).toBeLessThan(ASCENT_MARGIN_REQUIRED);
    expect(sim.plan.weakFinalStage).toBe(true);
    // ...and the term the delta-v budget alone cannot see: the Briz-M sinks
    // further closing the shortfall than the ascent can give it.
    expect(sim.plan.ascentMakeUp, log).toBeGreaterThan(300);
    // ...and the term the delta-v budget alone cannot see, measured off the
    // flight rather than off the plan. The plan's own `ascentMakeUp` is built
    // on the fleet-wide loss allowance and under-states this stack by ~300 m/s
    // (Proton spends 1 991 m/s against an allowance of 1 750), which is exactly
    // why the pre-flight verdict flies the insertion instead of computing it.
    const rSeco = R_EARTH + seco.alt;
    const shortfall = Math.sqrt(MU_EARTH / rSeco) - seco.vh;
    const sink = kickStageSink(shortfall, Math.sqrt(MU_EARTH / rSeco), sim.plan.kickStageAccel, MU_EARTH / (rSeco * rSeco));
    expect(shortfall, log).toBeGreaterThan(600);
    expect(sink, `sink ${Math.round(sink / 1e3)} km for ${Math.round(shortfall)} m/s at ${sim.plan.kickStageAccel.toFixed(2)} m/s² — ${log}`)
      .toBeGreaterThan(sim.plan.insertionAltitude - ORBIT_INSERTION_FLOOR);

    // The outcome is honest: no break-up, no impact, and the flight says what
    // happened rather than stopping at a reported insertion.
    expect(keys, log).not.toContain('evt.structuralFailure');
    expect(keys, log).not.toContain('evt.vehicleLost');
    expect(keys, log).toContain('evt.insertionAbandoned');
    expect(sim.state.status, log).toBe('failed');
    expect(sim.state.note, log).toBe('suborbital');
    // It gave up where the floor says to — the first measurable air — and not
    // at 45 km in 46 kPa against a 40 kPa placard, which is where it used to
    // end. The dynamic pressure at the moment it stops is a fortieth of the
    // placard and the stack is still above 70 km.
    const gaveUp = sim.events.find((e) => e.key === 'evt.insertionAbandoned')!;
    expect(Number(gaveUp.params!.alt), log).toBeGreaterThan(60);
    expect(sim.state.q, log).toBeLessThan(0.2 * sim.vehicleSpec.maxQ);

    // And the headless probe the pre-flight verdict uses agrees with the
    // flight, which is what makes the verdict red instead of amber.
    expect(probeInsertion(protonCrew(7150)).reachesOrbit, log).toBe(false);
  }, 60000);

  /**
   * The payload either side of it, so the exclusion is a measured boundary and
   * not a blanket statement about the vehicle. 5.75 t is the fleet matrix's own
   * `protonm/iss/25` row with a live spacecraft instead of the dispenser.
   */
  it('still flies 5.75 t to the same orbit, and no longer through a 94 km perigee', () => {
    const { sim } = fly(5750);
    const log = sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
    expect(sim.events.map((e) => e.key), log).toContain('evt.targetOrbit');
    const el = achievedElements(sim);
    expect(el.periapsisAlt / 1e3, log).toBeGreaterThan(410);
    expect(el.apoapsisAlt / 1e3, log).toBeLessThan(430);
    // The lofted hand-off to the Briz-M is what moved this: the insertion used
    // to bottom out at 93.9 km and be announced as a parking orbit there.
    expect(probeInsertion(protonCrew(5750)).reachesOrbit, log).toBe(true);
    const park = sim.events.find((e) => e.key === 'evt.parkingOrbit');
    if (park) expect(Number(park.params!.pe) * 1e3, log).toBeGreaterThanOrEqual(ORBIT_INSERTION_FLOOR - 5e3);
  }, 60000);
});

describe('default mission', () => {
  it('soyuz21a + crew ship reaches the ISS orbit from baikonur', () => {
    const sim = flySoyuzDefaultMission();
    const log = sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
    const keys = sim.events.map((e) => e.key);
    expect(keys, log).toContain('evt.parkingOrbit');
    expect(keys, log).toContain('evt.targetOrbit');
    expect(sim.state.status, log).toBe('orbit');
    const el = sim.state.elements;
    expect(Math.abs(el.periapsisAlt - 420e3), `perigee ${Math.round(el.periapsisAlt / 1e3)} km`).toBeLessThanOrEqual(10e3);
    expect(Math.abs(el.apoapsisAlt - 420e3), `apogee ${Math.round(el.apoapsisAlt / 1e3)} km`).toBeLessThanOrEqual(10e3);
    expect(Math.abs(el.i * RAD - 51.64)).toBeLessThanOrEqual(0.3);
    // The launcher's own job is a *circular* parking orbit at the planned
    // insertion altitude, on the published clock — not an ellipse with a
    // decaying perigee that the spacecraft has to rescue.
    const park = sim.events.find((e) => e.key === 'evt.parkingOrbit')!;
    expect(Number(park.params!.pe), log).toBeGreaterThanOrEqual(195);
    expect(Number(park.params!.pe), log).toBeLessThanOrEqual(215);
    expect(Number(park.params!.ap), log).toBeGreaterThanOrEqual(195);
    expect(Number(park.params!.ap), log).toBeLessThanOrEqual(215);
    expect(insertionTime(sim), log).toBeGreaterThan(500);
    expect(insertionTime(sim), log).toBeLessThan(570);
  }, 60000);

  it('the insertion clock limit is derived from the upper stage, not the stage count', () => {
    // Regression guard for the acceptance criteria themselves: a four-stage
    // stack whose orbit is made by a 19.6 kN kick stage gets the kick stage's
    // clock (1900 s), not a blanket exemption and not a Merlin Vacuum's 900 s.
    const proton = VEHICLES.find((v) => v.id === 'protonm')!;
    const falcon = VEHICLES.find((v) => v.id === 'falcon9')!;
    expect(insertionLimit(proton, 5750)).toBe(1900);
    expect(insertionLimit(falcon, 5700)).toBe(900);
  });
});

// ---------------------------------------------------------------------------
// Real missions for the single-shot stacks
// ---------------------------------------------------------------------------

/**
 * Long March 2D's real mission, and the reason it is in the fleet at all.
 *
 * CZ-2D is two hypergolic stages with no restart: the second stage fires once
 * and the orbit it cuts off in is the orbit the payload is released into. The
 * acceptance matrix flies an INERT dispenser into 420-600 km circular orbits,
 * which such a stack cannot make (see the `ARCHITECTURE` table above for the
 * exclusion and the 360-flight grid behind it) — but that is not the mission
 * the vehicle has. China's workhorse for sun-synchronous remote sensing
 * launches spacecraft that carry their own propulsion, and flown that way the
 * mission completes: the launcher puts the spacecraft on a 198 x 601-606 km
 * sun-synchronous transfer inside five minutes, and the spacecraft circularises
 * itself at apogee.
 *
 * This is the same pairing `default mission` has always been for Soyuz-2.1a —
 * launcher to ~200 km, spacecraft the rest of the way — and
 * `a fully excluded vehicle must have a dedicated mission that succeeds` flies
 * both of them and requires `evt.targetOrbit`.
 *
 * Measured at 25/50/90 % of the published 1 300 kg sun-synchronous rating, and
 * at the full rating: `evt.targetOrbit` at T+9 451 / 24 485 / 43 074 / 48 782 s
 * into 590-596 x 591-597 km at i = 97.79 deg. The clock is long because the
 * spacecraft's own engine is 22 N; that is the spacecraft, not the launcher,
 * and the launcher's own milestones are the ones asserted tightly below.
 */
function flyLongMarch2D(mass: number): Simulation {
  return flyReference('longmarch2d', 'jiuquan', 'sso', 'earthObs', mass, 24 * 3600);
}

describe('real missions', () => {
  it('Long March 2D delivers a sun-synchronous remote-sensing satellite from Jiuquan', () => {
    const site = siteById('jiuquan');
    const orbit = orbitById('sso');
    for (const mass of [325, 650, 1170]) { // 25 / 50 / 90 % of the 1 300 kg SSO rating
      const sim = flyLongMarch2D(mass);
      const log = `${mass} kg: ` + sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
      const keys = sim.events.map((e) => e.key);
      for (const k of [
        'evt.impact', 'evt.vehicleLost', 'evt.structuralFailure', 'evt.rangeSafety',
        'evt.offTargetOrbit', 'evt.insufficientDv',
      ]) {
        expect(keys, log).not.toContain(k);
      }
      // The mission is delivered, not merely survived.
      expect(keys, log).toContain('evt.targetOrbit');
      expect(sim.state.status, log).toBe('orbit');
      const el = sim.state.elements;
      expect(Math.abs(el.periapsisAlt - 600e3) / 1e3, log).toBeLessThanOrEqual(15);
      expect(Math.abs(el.apoapsisAlt - 600e3) / 1e3, log).toBeLessThanOrEqual(15);
      // The plane is the mission: a sun-synchronous launch that misses the
      // inclination has delivered nothing, whatever its altitude.
      const target = resolveTarget(orbit, site, LAUNCH_TIME);
      expect(Math.abs(el.i - target.inclination) * RAD, log).toBeLessThanOrEqual(0.3);
      // The launcher's own job, on the published CZ-2D clock: first-stage
      // cut-off ~T+160 s, insertion inside five and a half minutes, and the
      // spacecraft released on a transfer whose perigee is above the atmosphere
      // and whose apogee is the mission's own altitude.
      const park = sim.events.find((e) => e.key === 'evt.parkingOrbit')!;
      expect(park, log).toBeDefined();
      expect(Number(park.params!.pe), log).toBeGreaterThanOrEqual(190);
      expect(Number(park.params!.pe), log).toBeLessThanOrEqual(210);
      expect(Number(park.params!.ap), log).toBeGreaterThanOrEqual(590);
      expect(Number(park.params!.ap), log).toBeLessThanOrEqual(615);
      expect(insertionTime(sim), log).toBeGreaterThan(270);
      expect(insertionTime(sim), log).toBeLessThan(300);
    }
  }, 120000);
});

// ---------------------------------------------------------------------------
// Reference timelines
// ---------------------------------------------------------------------------

/**
 * Published ascent milestones and the band the model is held to.
 *
 * TWO COLUMNS OF INTENT, because they are two different claims and this table
 * used to blur them (review follow-up):
 *
 *   `published`   — the operator's callout. Documentation, and the source of
 *                   the numeric window below.
 *   `regression`  — the band that is ASSERTED. It is drawn around the MEASURED
 *                   value (±8 or ±10 s by convention), so any change to the
 *                   model shows up as a test failure. It is a self-consistency
 *                   band and says nothing about fidelity.
 *
 * A table headed "published vs model" whose assertion excludes the published
 * number is asserting the model's agreement with itself, so every milestone
 * whose MEASURED time falls outside its published callout is named in
 * `disagreements with the published callout` below, and that test fails if the
 * set changes — a new disagreement has to be acknowledged, and one that gets
 * fixed has to be removed. There are SEVEN of them, listed with their causes in
 * that test's own comment — the same seven docs/PHYSICS.md §6a tabulates, and
 * the same seven the assertion at the bottom of this file spells out. It
 * reported two until the wave before last, because it compared the published
 * callout with the ±8-10 s `regression` band rather than with the model, and a
 * band drawn around the measured value absorbs up to 10 s of real disagreement;
 * comparing the model's own number gave nine, of which two (Soyuz-2.1a's and
 * Long March 3B/E's fairing jettison) have since closed by flying their
 * operators' published jettison time. This paragraph still said "nine" after
 * they closed (release review 2, minor #6).
 *
 * The oldest of the seven is Falcon 9's max Q: T+50.3 s at 22.6 kPa against a
 * published 65-80 s at ~33 kPa. It is a DATA disagreement — `maxQThrottle`
 * starts the throttle bucket at 22 kPa and pins q there from T+45 s — and
 * PHYSICS.md §6a carries the measured sweep showing that raising `qStart`
 * moves MECO and fairing jettison out of their own windows instead of closing
 * it. The marker itself is correctly stamped at the peak; the q curve is what
 * is early and low. No code or data change: it is disclosed, not fixed.
 *
 * Mirrored in the "Reference timelines" section of docs/PHYSICS.md.
 */
interface Milestone {
  label: string;
  at: (sim: Simulation) => number;
  /** the operator's published callout, e.g. '65-80 s', '~460 s', 'MECO + 3 s' */
  published: string;
  /** regression band around the measured value, s — this is what is asserted */
  regression: [number, number];
}

/**
 * How much either side of a POINT callout ('~157 s') still counts as agreement:
 * 2 % of the callout, never less than 5 s.
 *
 * A range callout ('105-115 s') is the operator's own statement of the spread
 * and is used exactly as published. A point callout is a single rounded number
 * on a press-kit timeline, so comparing a continuous model to it needs a stated
 * band — and the point of this table is that the band is STATED, out here,
 * rather than smuggled in as the width of a regression guard. 2 % is the
 * precision these timelines are quoted to (a 5 s floor covers the sub-minute
 * callouts, where 2 % would be a second or less).
 */
const PUBLISHED_POINT_BAND = (t: number): number => Math.max(5, 0.02 * t);

/**
 * The published callout as a numeric window, parsed from the text so the two
 * cannot drift apart. `null` for a callout quoted relative to another event
 * ('MECO + 3 s'), which this table does not hold the model to on its own.
 */
function publishedWindow(published: string): [number, number] | null {
  const range = /^(\d+)\s*[-–]\s*(\d+)\s*s$/.exec(published);
  if (range) return [Number(range[1]), Number(range[2])];
  const point = /^~\s*(\d+)\s*s$/.exec(published);
  if (point) {
    const t = Number(point[1]);
    const band = PUBLISHED_POINT_BAND(t);
    return [t - band, t + band];
  }
  return null;
}

/**
 * Whether the MEASURED milestone agrees with the published callout.
 *
 * It used to compare the published window with the `regression` band instead,
 * and returned true on any overlap. Since `regression` is deliberately the
 * measured value ±8-10 s, that absorbed up to 10 s of real disagreement: two
 * rows whose own adjacent comments admitted they were outside the published
 * window (Electron's max Q and its MECO) were counted as agreeing, and the
 * "disagreements" list under-reported by design (review follow-up). The model
 * is what is being compared to the operator, so the model's number is what goes
 * in.
 */
function agreesWithPublished(m: Milestone, measured: number): boolean {
  const p = publishedWindow(m.published);
  if (p === null) return true;
  return measured >= p[0] && measured <= p[1];
}

function evTime(key: string, n = 0): (sim: Simulation) => number {
  return (sim) => {
    const hits = sim.events.filter((e) => e.key === key);
    return hits.length > n ? hits[n].t : -1;
  };
}
// `evt.maxQ` is now stamped with the time of the PEAK, not the time the peak was
// detected (audit item B40(5)). The detection lags by the width of the q
// plateau, which on a vehicle that flies a throttle bucket is tens of seconds:
// Falcon 9's peak is at T+50 s and the old marker fired at T+69 s, close to the
// published T+72 s BY ACCIDENT. Correcting the timestamp therefore makes the
// disagreement visible instead of cancelling it, and the windows below moved
// with it. What is left is a real calibration gap in the q profile itself — the
// modelled peak is ~20 s early and ~25 % low, because the throttle bucket in
// src/data/vehicles.ts starts at 22 kPa and pins q there. That is vehicle data,
// not a guidance defect, and it is recorded here rather than hidden in a window.
const maxQTime = evTime('evt.maxQ');

function flyReference(vehicle: string, site: string, orbit: string, satellite: string, mass: number, maxTime = 2 * 3600): Simulation {
  const spec = VEHICLES.find((v) => v.id === vehicle)!;
  const cfg: MissionConfig = {
    vehicleId: vehicle, satelliteId: satellite, siteId: site, orbit: orbitById(orbit),
    launchTime: orbitById(orbit).raanMode === 'free' ? LAUNCH_TIME
      : launchWindows(orbitById(orbit), siteById(site), LAUNCH_TIME, 1)[0].time,
    guidance: { ...DEFAULT_GUIDANCE, ...(spec.guidanceDefaults ?? {}) },
    guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: mass,
  };
  const sim = new Simulation(cfg, { headless: true });
  let guard = 0;
  while (!sim.done && sim.state.t < maxTime && guard++ < 400000) sim.step(sim.suggestedDt());
  return sim;
}

const REFERENCE_MISSIONS: { name: string; fly: () => Simulation; milestones: Milestone[] }[] = [
  {
    name: 'Falcon 9, Starlink-class 15.6 t to the ISS plane',
    fly: () => flyReference('falcon9', 'cape', 'iss', 'starlink', 15600),
    milestones: [
      { label: 'max Q', at: maxQTime, published: '65-80 s', regression: [44, 58] },
      { label: 'MECO', at: evTime('evt.meco'), published: '150-165 s', regression: [145, 165] },
      { label: 'stage separation', at: evTime('evt.stageSep'), published: 'MECO + 3 s', regression: [148, 168] },
      { label: 'MVac ignition', at: evTime('evt.ignition', 1), published: 'MECO + 7 s', regression: [152, 172] },
      { label: 'fairing jettison', at: evTime('evt.fairingSep'), published: '190-230 s', regression: [185, 235] },
      { label: 'SECO', at: evTime('evt.seco'), published: '500-560 s', regression: [495, 565] },
    ],
  },
  {
    name: 'Soyuz-2.1a, 7.15 t crew ship from Baikonur to the ISS',
    fly: () => flyReference('soyuz21a', 'baikonur', 'iss', 'crew', 7150, 6 * 3600),
    milestones: [
      { label: 'booster separation', at: evTime('evt.boosterSep'), published: '~118 s', regression: [112, 128] },
      // The heating placard drops the fairing at ~105 km, which this trajectory
      // reaches about 12 % later than the published callout.
      { label: 'fairing jettison', at: evTime('evt.fairingSep'), published: '~157 s', regression: [148, 185] },
      { label: 'core cut-off', at: evTime('evt.meco'), published: '~287 s', regression: [275, 305] },
      { label: 'third-stage cut-off (SECO)', at: evTime('evt.seco'), published: '~528 s', regression: [500, 570] },
    ],
  },
  {
    name: 'H3-22, 5 t to 500 km',
    fly: () => flyReference('h3', 'tanegashima', 'leo', 'cubesats', 5000),
    milestones: [
      { label: 'SRB-3 burnout', at: evTime('evt.boosterBurnout'), published: '105-115 s', regression: [100, 118] },
      { label: 'SRB-3 separation', at: evTime('evt.boosterSep'), published: '107-117 s', regression: [102, 120] },
      { label: 'MECO', at: evTime('evt.meco'), published: '300-330 s', regression: [295, 335] },
    ],
  },
  {
    name: 'Electron, 200 kg to sun-synchronous orbit',
    fly: () => flyReference('electron', 'mahia', 'sso', 'cubesats', 200),
    milestones: [
      // This wave corrected Rutherford from the file's old 24.9 / 27.5 kN to
      // the published 24 kN sea level / 25.8 kN vacuum (see vehicles.ts), which
      // is a change to an existing vehicle: the nine-engine mean mass flow is
      // 68.4 kg/s, the 9.7 t first stage burns 142 s instead of 132 s, and
      // measured MECO moves from T+129 s (pre-wave, docs/AUDIT-2026-09-16.md
      // line 509) to T+138 s against the published 145-155 s — still 7 s
      // (5 %) early, and recorded as such rather than papered over. Max Q is
      // early too, at T+55 s against a published 60-70 s; that one is the drag
      // model, not the engine.
      //
      // Every window here is the measured value ±8 s, so a change of any kind
      // shows up. Closing the remaining gap to the published callouts is a
      // separate job, and when it happens these numbers move and this table is
      // updated with them.
      { label: 'max Q', at: maxQTime, published: '60-70 s', regression: [47, 63] },
      { label: 'MECO', at: evTime('evt.meco'), published: '145-155 s', regression: [130, 146] },
      { label: 'fairing jettison', at: evTime('evt.fairingSep'), published: '~190 s', regression: [178, 194] },
    ],
  },
  {
    name: 'PSLV-XL, 1.75 t to sun-synchronous orbit',
    fly: () => flyReference('pslvxl', 'sriharikota', 'sso', 'cubesats', 1750),
    milestones: [
      { label: 'PS1 separation', at: evTime('evt.stageSep'), published: '~110 s', regression: [100, 122] },
      { label: 'PS2 cut-off', at: evTime('evt.stageCutoff'), published: '~260 s', regression: [240, 285] },
      // PS3 is a fixed-impulse solid: its burn time follows from the modelled
      // grain, and it ends earlier than the published window.
      { label: 'PS3 cut-off', at: evTime('evt.stageCutoff', 1), published: '400-600 s', regression: [330, 600] },
    ],
  },
  {
    name: 'Ariane 64, 5.75 t to GTO',
    fly: () => flyReference('ariane64', 'kourou', 'gto', 'cubesats', 5750),
    milestones: [
      // The P120C mean thrust is now derived from the grain mass and the
      // published 135 s burn time (see the engine table in vehicles.ts), so
      // separation lands inside the published band instead of ~24 s early.
      { label: 'P120C separation', at: evTime('evt.boosterSep'), published: '130-140 s', regression: [130, 145] },
      // Flown on the published TIMELINE, not on the heating placard: Ariane 6
      // publishes a jettison callout and Arianespace flies it, so
      // `fairing.sepTime` is 200 s in vehicles.ts and the model reproduces it
      // by construction (measured T+200.1 s). This band is therefore a
      // regression guard on the mechanism, not evidence about the trajectory.
      //
      // It replaces a `heatFluxLimit: 900` W/m². That one was at least within
      // sight of the 1135 W/m² industry criterion; the three other vehicles
      // that carried the field were not, and the whole set is gone — see
      // `FairingSpec.sepTime` in src/types.ts.
      { label: 'fairing jettison', at: evTime('evt.fairingSep'), published: '~200 s', regression: [193, 209] },
      { label: 'core cut-off', at: evTime('evt.meco'), published: '~460 s', regression: [435, 455] },
    ],
  },
  {
    name: 'Vega-C, 1.65 t to 500 km from Kourou',
    fly: () => flyReference('vegac', 'kourou', 'leo', 'cubesats', 1650),
    milestones: [
      { label: 'P120C burnout / separation', at: evTime('evt.meco'), published: '~135 s', regression: [130, 142] },
      { label: 'Zefiro 40 ignition', at: evTime('evt.ignition', 1), published: 'burnout + ~2 s', regression: [132, 146] },
      // Flown on the published timeline (`fairing.sepTime` = 220 s), like
      // Ariane 64 above and for the same reason: measured T+220.0 s. The
      // `heatFluxLimit: 75` W/m² this replaces was 15x below the industry
      // 1135 W/m² criterion and had been back-solved from this same callout.
      { label: 'fairing jettison', at: evTime('evt.fairingSep'), published: '~220 s', regression: [208, 224] },
      { label: 'Zefiro 40 cut-off', at: evTime('evt.stageCutoff'), published: '~228 s', regression: [225, 241] },
      { label: 'Zefiro 9 ignition', at: evTime('evt.ignition', 2), published: '~231 s', regression: [229, 245] },
      // AVUM+ is NOT in this table: the real Vega-C lights it about a minute
      // after Zefiro 9 separation (published first ignition ~T+5 min), while
      // this model coasts to first apogee and lights it at ~T+49 min. That is a
      // deviation from the published profile, not fidelity to it, so it is
      // pinned as a regression guard below instead of being dressed up as a
      // reference milestone.
    ],
  },
  {
    name: 'Long March 2D, 1.3 t to sun-synchronous orbit from Jiuquan',
    fly: () => flyReference('longmarch2d', 'jiuquan', 'sso', 'cubesats', 1300),
    milestones: [
      { label: 'first-stage cut-off', at: evTime('evt.meco'), published: '~160 s', regression: [148, 163] },
      { label: 'stage separation', at: evTime('evt.stageSep'), published: 'cut-off + ~1 s', regression: [149, 164] },
      // Flown on the published timeline (`fairing.sepTime` = 220 s): measured
      // T+220.2 s. The `heatFluxLimit: 50` W/m² this replaces was 23x below the
      // industry criterion and back-solved from this same callout.
      { label: 'fairing jettison', at: evTime('evt.fairingSep'), published: '~220 s', regression: [209, 225] },
    ],
  },
  {
    name: 'Long March 3B/E, 5.5 t to GTO from Xichang',
    fly: () => flyReference('longmarch3be', 'xichang', 'gto', 'cubesats', 5500),
    milestones: [
      { label: 'booster separation', at: evTime('evt.boosterSep'), published: '~140 s', regression: [135, 147] },
      { label: 'first/second stage separation', at: evTime('evt.stageSep'), published: '~158 s', regression: [153, 165] },
      { label: 'fairing jettison', at: evTime('evt.fairingSep'), published: '~215 s', regression: [215, 231] },
      { label: 'second-stage cut-off', at: evTime('evt.stageCutoff'), published: '~345 s', regression: [336, 350] },
    ],
  },
  {
    name: 'H-IIA 202, 4.1 t to GTO from Tanegashima',
    fly: () => flyReference('h2a202', 'tanegashima', 'gto', 'cubesats', 4100),
    milestones: [
      { label: 'SRB-A burnout', at: evTime('evt.boosterBurnout'), published: '~100 s', regression: [96, 106] },
      { label: 'SRB-A separation', at: evTime('evt.boosterSep'), published: '~108 s', regression: [104, 114] },
      // The worst of the four: a `heatFluxLimit` of 14 W/m², 81x below the
      // 1135 W/m² industry criterion and about 0.0012 BTU/ft²·s, back-solved so
      // that a placard this trajectory clears at ~115 km would fire at the
      // published time. Now flown on the published timeline
      // (`fairing.sepTime` = 250 s): measured T+250.2 s, and this row no longer
      // appears in `disagreements with the published callout` below.
      { label: 'fairing jettison', at: evTime('evt.fairingSep'), published: '~250 s', regression: [242, 258] },
      { label: 'core cut-off (MECO)', at: evTime('evt.meco'), published: '~396 s', regression: [383, 397] },
    ],
  },
];

describe('reference timelines', () => {
  for (const mission of REFERENCE_MISSIONS) {
    it(mission.name, () => {
      const sim = mission.fly();
      const log = sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
      for (const m of mission.milestones) {
        const t = m.at(sim);
        const note = agreesWithPublished(m, t) ? '' : ' [the model does NOT agree with the published callout]';
        expect(t, `${m.label} not reached (${log})`).toBeGreaterThan(0);
        expect(t, `${m.label} at T+${t.toFixed(1)} s, published ${m.published}${note}`).toBeGreaterThanOrEqual(m.regression[0]);
        expect(t, `${m.label} at T+${t.toFixed(1)} s, published ${m.published}${note}`).toBeLessThanOrEqual(m.regression[1]);
      }
    }, 60000);
  }

  /**
   * Every milestone whose MEASURED time falls outside the published callout.
   *
   * Listing them is the point: a reader of the table above cannot then mistake
   * a green test for agreement with the published profile.
   *
   * This list was two entries long, and that was an artefact of how it was
   * computed rather than a statement about the model. It compared the published
   * window with the ±8-10 s REGRESSION band around the measured value, so a
   * milestone up to 10 s outside the callout still "overlapped" it; two rows
   * whose own comments in the table above say they are outside the published
   * window (Electron's max Q at T+51 s against 60-70 s, and its MECO at T+138 s
   * against 145-155 s) were counted as agreeing (review follow-up). Comparing
   * the model's own number instead gave nine, and every one of them was
   * already there. Seven are left; the two that closed are at the bottom of
   * this comment.
   *
   * What each is, with what is known about the cause:
   *
   *  - Falcon 9 max Q (T+50 s vs 65-80 s) and Electron max Q (T+51 s vs
   *    60-70 s) — `evt.maxQ` is stamped at the PEAK, not at the time the peak
   *    was detected, so the ~20 s the old marker lagged by no longer cancels the
   *    model's early, low q profile. On Falcon 9 the throttle bucket in
   *    vehicles.ts starts at 22 kPa and pins q there; on Electron it is the drag
   *    model. Both are data, not guidance.
   *
   *    Raising Falcon 9's `qStart` to the real ~33 kPa peak was tried and
   *    measured (the table is in docs/PHYSICS.md §6a and next to the value in
   *    vehicles.ts): the marker moves to T+57.6 s and still misses 65-80 s,
   *    while MECO moves to T+145.0 s and fairing jettison to T+188.8 s, both
   *    outside their own published windows. Removing the bucket entirely puts
   *    max Q at T+59.2 s — the peak TIME is a property of the ascent profile,
   *    not of the bucket — so no value of `qStart` takes this row off the list
   *    and three values put two more rows on it.
   *  - Electron MECO (T+138 s vs 145-155 s) — the corrected 24 kN / 25.8 kN
   *    Rutherford gives a 142 s first-stage burn; still ~5 % early.
   *  - Ariane 64 core cut-off (T+445 s vs ~460 s) — the Vulcain phase runs ~15 s
   *    short with the corrected P120C mean thrust and peak factor.
   *  - Soyuz-2.1a core cut-off (T+294 s vs ~287 s) — ~2.5 % late, i.e. just
   *    outside the 2 % band a point callout is given. Small, and it is the one
   *    Soyuz row left: the 87 000 kg Blok A load that produces it is
   *    deliberately kept on 2.1a for exactly that reason, while the audited
   *    90 100 kg went to 2.1b, which has no published clock to move (see the
   *    core helpers in src/data/vehicles.ts).
   *  - H3-22 SRB-3 burnout (T+104.3 s vs 105-115 s) — 0.7 s early, the smallest
   *    disagreement in the table and the one most likely to flip. It is listed
   *    rather than rounded away because the rule here is the published window,
   *    not a judgement about which misses are interesting.
   *  - PSLV-XL PS3 cut-off (T+386 s vs 400-600 s) — PS3 is a fixed-impulse
   *    solid, so its burn time follows from the modelled grain.
   *
   * That is seven, which is the number the file header and docs/PHYSICS.md §6a
   * both quote.
   *
   * TWO ROWS LEFT THIS LIST in the fleet-data wave, and both left it the way
   * H-IIA's did — by changing the mechanism, not by widening a band. Soyuz-2.1a
   * (T+176 s vs ~157 s) and Long March 3B/E (T+223 s vs ~215 s) both dropped
   * their fairings on the heating placard, which those two trajectories reach
   * 4-12 % later than the operator's callout. Both operators publish a jettison
   * TIME and fly it, so both now carry `fairing.sepTime` like Ariane 6, Vega-C,
   * H-IIA and Long March 2D before them, and both agree by construction.
   * Falcon 9 and Electron stay on the physical placard: neither is outside its
   * published window, so there is nothing to model around.
   *
   * H-IIA 202's fairing jettison used to be on this list. It is gone because
   * the mechanism changed, not because a band was widened: the four fitted
   * `heatFluxLimit` values (down to 14 W/m² against a 1135 W/m² criterion) were
   * replaced by `fairing.sepTime`, the published jettison time these operators
   * actually fly. That makes those four rows agree by construction, which is
   * why their comments say so instead of claiming a trajectory result.
   */
  it('disagreements with the published callout', () => {
    const disagree: string[] = [];
    for (const mission of REFERENCE_MISSIONS) {
      const sim = mission.fly();
      for (const m of mission.milestones) {
        if (!agreesWithPublished(m, m.at(sim))) disagree.push(`${mission.name} › ${m.label}`);
      }
    }
    expect(disagree.sort()).toEqual([
      'Ariane 64, 5.75 t to GTO › core cut-off',
      'Electron, 200 kg to sun-synchronous orbit › MECO',
      'Electron, 200 kg to sun-synchronous orbit › max Q',
      'Falcon 9, Starlink-class 15.6 t to the ISS plane › max Q',
      'H3-22, 5 t to 500 km › SRB-3 burnout',
      'PSLV-XL, 1.75 t to sun-synchronous orbit › PS3 cut-off',
      'Soyuz-2.1a, 7.15 t crew ship from Baikonur to the ISS › core cut-off',
    ]);
  }, 180000);
});

/**
 * Not a published reference: a pin on a known deviation.
 *
 * Vega-C's AVUM+ really ignites a few minutes after Zefiro 9 separation and
 * flies several burns. In this model the 2.4 kN stage (0.06 g under a 1.65 t
 * payload) does not fly the ascent at all — the planner coasts it to first
 * apogee and circularises there, which is why the first ignition is measured at
 * T+2958 s. The assertion exists so that a wave which teaches the planner to
 * light a low-thrust kick stage early sees this change, and so that nobody
 * reads T+49 min as agreement with the published callout.
 */
describe('known profile deviations', () => {
  it("Vega-C's AVUM+ first ignition is at first apogee, not the published few minutes after Z9", () => {
    const sim = flyReference('vegac', 'kourou', 'leo', 'cubesats', 1650);
    const t = evTime('evt.ignition', 3)(sim);
    const log = sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
    expect(t, log).toBeGreaterThan(2400);
    expect(t, log).toBeLessThan(3600);
  }, 60000);

  /**
   * A geostationary transfer takes a revolution to close, and the clock is a
   * user-facing fact rather than a defect.
   *
   * Ariane 64's reference GTO mission reached `evt.targetOrbit` at T+1067 s with
   * the old (peak-as-mean) 3 200 / 3 400 kN P120C, which burned the grain out
   * 20 s early. With the corrected mean thrust and the motor's own 1.52 peak
   * factor the ascent hands the Vinci a slightly different orbit, the apogee
   * burn falls a whole revolution later, and the mission completes around
   * T+7 000 s — the same orbit, two hours instead of eighteen minutes.
   *
   * The horizon matters as much as the window: the burn ignites at T+6 972 s,
   * so a two-hour flight stops mid-burn and measures nothing. Pinned here so
   * that a wave which changes either the motor or the apogee-burn scheduling
   * sees the mission duration move rather than discovering it in the UI.
   */
  it("Ariane 64's GTO mission completes a revolution after insertion", () => {
    const sim = flyReference('ariane64', 'kourou', 'gto', 'cubesats', 5750, 4 * 3600);
    const t = evTime('evt.targetOrbit')(sim);
    const log = sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
    expect(t, log).toBeGreaterThan(6500);
    expect(t, log).toBeLessThan(8500);
  }, 60000);
});

// The sun-synchronous exclusion table above is only honest if the azimuth it
// quotes is the one the mission planner would actually fly.
describe('range safety', () => {
  it('azimuthAllowedFor agrees with the planned azimuth', () => {
    for (const v of VEHICLES) {
      const site = siteById(v.sites[0]);
      const inc = resolveTarget(orbitById('sso'), site, LAUNCH_TIME).inclination;
      const allowed = azimuthAllowedFor(site, inc);
      expect(allowed, `${v.id} from ${site.id}`).toBe(!SITE_GEOMETRY[`${v.id}/sso/25`]);
      expect(inc, 'the sso preset must be retrograde').toBeGreaterThan(90 * DEG);
    }
  });

  /**
   * ...for every row of the matrix, not only the sun-synchronous ones, and
   * against the heading the plan FLIES rather than one recomputed here.
   *
   * Until this wave 38 accepted rows flew a heading outside their own site's
   * window while the plan called them reachable: the planner always took the
   * northbound solution below 75°, so H3 and H-IIA left Tanegashima on 88.1°
   * against a 90–190° window, and every ISS-plane row from Tanegashima,
   * Wenchang, Sriharikota and Mahia went north-east into a sector those ranges
   * close. They now fly the mirror heading, which the window licenses and which
   * reaches the same plane (tests/range-safety.test.ts has the measurement).
   */
  it('every row the matrix flies leaves on a heading its site licenses', () => {
    const outside: string[] = [];
    for (const c of fleetCases()) {
      const site = siteById(c.site);
      const orbit = orbitById(c.orbit);
      const spec = VEHICLES.find((v) => v.id === c.vehicle)!;
      const plan = planMission({
        vehicleId: c.vehicle, satelliteId: 'cubesats', siteId: c.site, orbit,
        launchTime: orbit.raanMode === 'free' ? LAUNCH_TIME : launchWindows(orbit, site, LAUNCH_TIME, 1)[0].time,
        guidance: { ...DEFAULT_GUIDANCE, ...(spec.guidanceDefaults ?? {}) }, guidanceResolved: true,
        failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: c.mass,
      }, site, spec);
      expect(plan.inclinationReachable, caseKey(c)).toBe(true);
      if (!azimuthInWindow(site, plan.azimuthRotating)) {
        outside.push(`${caseKey(c)}: ${(plan.azimuthRotating * RAD).toFixed(2)}° from ${site.id} (${site.azimuthMin}–${site.azimuthMax}°)`);
      }
    }
    expect(outside, outside.join('\n')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Single-shot direct insertion (wave-1 hand-off (a))
// ---------------------------------------------------------------------------

/**
 * A stack with no restartable stage anywhere cuts off ON the mission orbit.
 *
 * Everything else in `checkAscent` assumes a later burn exists: the apoapsis
 * guard and the "stalled" clause are both gated on `canReigniteAfterCutoff`,
 * and the periapsis gate waits for an orbit such a stack may never reach. So
 * Soyuz-2.1a with an inert payload used to burn its Blok I to depletion and end
 * off target with kilometres per second unused, whatever it was aimed at.
 * `singleShotCutoff` gives it the two stopping conditions a single burn has:
 * the orbit is already the mission's, or the residual has stopped improving.
 */
function flyCircular(vehicle: string, site: string, mass: number, hKm: number, inc: number | 'sso' | 'site'): Simulation {
  const spec = VEHICLES.find((v) => v.id === vehicle)!;
  const orbit = {
    id: 'direct', name: 'direct', perigee: hKm * 1000, apogee: hKm * 1000,
    inclination: inc, argPerigee: 0, raanMode: 'free' as const, description: '',
  };
  const sim = new Simulation({
    vehicleId: vehicle, satelliteId: 'cubesats', siteId: site, orbit,
    launchTime: LAUNCH_TIME,
    guidance: { ...DEFAULT_GUIDANCE, ...(spec.guidanceDefaults ?? {}) }, guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: mass,
  }, { headless: true });
  let guard = 0;
  while (!sim.done && sim.state.t < 3 * 3600 && guard++ < 400000) sim.step(sim.suggestedDt());
  return sim;
}

/**
 * The measured grid behind `DIRECT_INSERTION_CEILING`, in ONE place — and, as
 * of this wave, MEASURED BY A TEST rather than written down next to one.
 *
 * mission.ts used to carry its own copy of this grid in the constant's doc
 * comment, and the two disagreed by 31 000 km of apoapsis on the 300 km row
 * because that copy was never re-measured after the guidance changed under it.
 * De-duplicating it did not fix the failure mode, only its address: the single
 * surviving copy was a prose table that nothing asserted, and it was already
 * 3-6 km stale in its Long March 2D column on the day it shipped (review
 * follow-up).
 *
 * So the grid is now data, and `the grid behind DIRECT_INSERTION_CEILING`
 * below flies every cell and checks both the verdict and the orbit. A cell
 * cannot drift from the constant it justifies without turning a test red.
 *
 * What the numbers say: 200 km closes on every Soyuz-2.1a row; 250 km is where
 * the profile stops closing (the heaviest row misses on the apogee by 15 km,
 * the lighter ones by 50-100 km); 300 km is well past it, and the heaviest row
 * there does not even survive. Long March 2D does not close at any altitude
 * with an inert payload, which is why all seven of its matrix rows are
 * ARCHITECTURE exclusions and why its dedicated mission flies a spacecraft with
 * its own propulsion.
 */
interface DirectInsertionCell {
  vehicle: string;
  site: string;
  /** payload, kg */
  mass: number;
  /** circular target, km */
  hKm: number;
  /** whether the single burn cuts off ON the target orbit (`evt.targetOrbit`) */
  closes: boolean;
  /** measured periapsis × apoapsis at the end of the flight, km */
  pe: number;
  ap: number;
}

/** Band each measured cell is held to, km — a regression guard, not a tolerance. */
const GRID_BAND = 3;

const DIRECT_INSERTION_GRID: DirectInsertionCell[] = [
  // Soyuz-2.1a from Baikonur at 1.755 / 3.51 / 6.318 t. Those were 25 / 50 /
  // 90 % of a 7.02 t LEO rating; the rating is now the published 7.43 t to
  // 240 km x 51.6 deg from Baikonur (audit item B26), and the masses are left
  // where they are ON PURPOSE — this grid is a measurement of where the
  // single-burn profile closes as a function of payload and target altitude, so
  // re-scaling it to a new percentage would throw away the measurement and
  // change the constant it justifies for a reason that has nothing to do with
  // the trajectory. Every cell below was re-measured after that wave's data
  // changes; the fairing now leaves on Soyuz's published T+157 s callout rather
  // than on the heating placard, which moves the heaviest 300 km cell from
  // 110.7 x 745.3 km to 114.6 x 754.5 km and the rest by under a kilometre.
  { vehicle: 'soyuz21a', site: 'baikonur', mass: 1755, hKm: 200, closes: true, pe: 197.2, ap: 200.4 },
  { vehicle: 'soyuz21a', site: 'baikonur', mass: 3510, hKm: 200, closes: true, pe: 198.7, ap: 200.6 },
  { vehicle: 'soyuz21a', site: 'baikonur', mass: 6318, hKm: 200, closes: true, pe: 197.5, ap: 200.1 },
  { vehicle: 'soyuz21a', site: 'baikonur', mass: 1755, hKm: 250, closes: false, pe: 219.5, ap: 346.4 },
  { vehicle: 'soyuz21a', site: 'baikonur', mass: 3510, hKm: 250, closes: false, pe: 241.2, ap: 299.2 },
  { vehicle: 'soyuz21a', site: 'baikonur', mass: 6318, hKm: 250, closes: false, pe: 247.1, ap: 265.5 },
  { vehicle: 'soyuz21a', site: 'baikonur', mass: 1755, hKm: 300, closes: false, pe: 143.8, ap: 895.4 },
  { vehicle: 'soyuz21a', site: 'baikonur', mass: 3510, hKm: 300, closes: false, pe: 144.0, ap: 873.2 },
  // The one cell that does not survive: the heaviest Soyuz row aimed a hundred
  // kilometres above where the profile closes ends `failed`, with the tanks dry.
  { vehicle: 'soyuz21a', site: 'baikonur', mass: 6318, hKm: 300, closes: false, pe: 114.6, ap: 754.5 },
  // Long March 2D from Jiuquan at 25 / 50 / 90 % of its 1.3 t sun-synchronous
  // rating. Nothing closes, at any altitude or any payload.
  //
  // Re-measured when the planner started flying the heading the site's window
  // licenses: the 'site' inclination (41.0°) used to leave Jiuquan on 87.7°,
  // north of its 90–200° window, and now leaves on the 92.3° southbound mirror
  // (tests/range-safety.test.ts). Every verdict is unchanged; the apoapses moved
  // by up to 6.2 km, which is this 3 km band doing its job.
  { vehicle: 'longmarch2d', site: 'jiuquan', mass: 325, hKm: 200, closes: false, pe: 151.2, ap: 357.3 },
  { vehicle: 'longmarch2d', site: 'jiuquan', mass: 650, hKm: 200, closes: false, pe: 155.8, ap: 336.2 },
  { vehicle: 'longmarch2d', site: 'jiuquan', mass: 1170, hKm: 200, closes: false, pe: 167.7, ap: 304.5 },
  { vehicle: 'longmarch2d', site: 'jiuquan', mass: 325, hKm: 250, closes: false, pe: 140.6, ap: 2411.8 },
  { vehicle: 'longmarch2d', site: 'jiuquan', mass: 650, hKm: 250, closes: false, pe: 140.7, ap: 2395.8 },
  { vehicle: 'longmarch2d', site: 'jiuquan', mass: 1170, hKm: 250, closes: false, pe: 140.5, ap: 2372.3 },
  { vehicle: 'longmarch2d', site: 'jiuquan', mass: 325, hKm: 300, closes: false, pe: 140.9, ap: 2424.8 },
  { vehicle: 'longmarch2d', site: 'jiuquan', mass: 650, hKm: 300, closes: false, pe: 140.9, ap: 2404.8 },
  { vehicle: 'longmarch2d', site: 'jiuquan', mass: 1170, hKm: 300, closes: false, pe: 141.1, ap: 2391.1 },
];

describe('single-shot direct insertion', () => {
  it('the grid behind DIRECT_INSERTION_CEILING', () => {
    for (const cell of DIRECT_INSERTION_GRID) {
      const sim = flyCircular(cell.vehicle, cell.site, cell.mass, cell.hKm, 'site');
      const el = achievedElements(sim);
      const closes = sim.events.some((e) => e.key === 'evt.targetOrbit');
      const where = `${cell.vehicle} + ${cell.mass} kg at ${cell.hKm} km: measured `
        + `${(el.periapsisAlt / 1e3).toFixed(1)} x ${(el.apoapsisAlt / 1e3).toFixed(1)} km, closes=${closes}`;
      expect(closes, where).toBe(cell.closes);
      expect(Math.abs(el.periapsisAlt / 1e3 - cell.pe), where).toBeLessThanOrEqual(GRID_BAND);
      expect(Math.abs(el.apoapsisAlt / 1e3 - cell.ap), where).toBeLessThanOrEqual(GRID_BAND);
    }
    // The shape the constant rests on, asserted as a shape and not only cell by
    // cell: 200 km is the only row where a Soyuz-2.1a single burn closes, and
    // the ceiling in mission.ts must sit above it and at or below the first row
    // that does not.
    const closing = DIRECT_INSERTION_GRID.filter((c) => c.closes);
    expect(new Set(closing.map((c) => c.hKm))).toEqual(new Set([200]));
    expect(new Set(closing.map((c) => c.vehicle))).toEqual(new Set(['soyuz21a']));
    expect(DIRECT_INSERTION_CEILING).toBeGreaterThanOrEqual(200e3);
  }, 180000);

  it('Soyuz-2.1a with an inert payload cuts off on a 200 km circular orbit', () => {
    for (const mass of [1755, 3510, 6318]) {
      const sim = flyCircular('soyuz21a', 'baikonur', mass, 200, 'site');
      const log = `${mass} kg: ` + sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
      // Nothing above the Blok I can burn, so the plan must contain no burns at
      // all: this is a direct insertion, not a parking orbit.
      expect(sim.plan.insertionAltitude, log).toBe(200e3);
      expect(sim.plan.insertionApoapsis, log).toBe(200e3);
      expect(sim.plan.burns.length, log).toBe(0);
      expect(sim.events.map((e) => e.key), log).toContain('evt.targetOrbit');
      expect(sim.events.map((e) => e.key), log).not.toContain('evt.offTargetOrbit');
      expect(sim.state.status, log).toBe('orbit');
      const el = sim.state.elements;
      // Two-sided, and with the MARGIN asserted rather than discovered.
      //
      // This row used to read 190.4 x 200.1 km against a 10 km band — 395 m of
      // margin, 4 % of the tolerance, while four places in the tree (this test,
      // mission.ts, simulation.ts and docs/PHYSICS.md) all quoted it as
      // "198 x 201" (review follow-up). Any change to the atmosphere, the loss
      // bookkeeping or the guidance would have flipped it to
      // `evt.offTargetOrbit` and this test to red, and nobody would have
      // expected it to.
      //
      // The cause was `singleShotCutoff` asking "is the orbit the mission's?"
      // at the full acceptance band, so it shut the engine down the instant the
      // still-climbing perigee crossed the LOW EDGE of the band. It now asks at
      // a quarter of the band (`SINGLE_SHOT_CUTOFF_BAND`), the measurement is
      // 197.2-198.7 x 200.1-200.6 km, and the margin below is the assertion
      // that keeps it honest.
      const peMiss = Math.abs(el.periapsisAlt - 200e3) / 1e3;
      const apMiss = Math.abs(el.apoapsisAlt - 200e3) / 1e3;
      expect(peMiss, log).toBeLessThanOrEqual(10);
      expect(apMiss, log).toBeLessThanOrEqual(10);
      expect(10 - Math.max(peMiss, apMiss), `margin to the acceptance band, ${log}`).toBeGreaterThan(5);
      // The point of the fix: it stops with propellant left instead of burning
      // the orbit past the target.
      expect(sim.vehicle.deltaVRemaining(), log).toBeGreaterThan(300);
    }
  }, 60000);

  /**
   * ...and the same stack aimed far above the band the profile closes in is
   * aimed at the transfer orbit it CAN fly, not at a runaway.
   *
   * This is the guard on `DIRECT_INSERTION_CEILING`: when it was lifted to
   * 1000 km the same flight inserted at 271 x 32 564 km. The mission is still
   * off target — nothing can raise the perigee — but the orbit it ends in is
   * the best one a single burn reaches, not an accident.
   */
  it('a single-shot stack aimed above the ceiling flies the transfer orbit instead of a runaway', () => {
    const sim = flyCircular('soyuz21a', 'baikonur', 1755, 500, 'site');
    const log = sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
    expect(sim.plan.insertionAltitude, log).toBe(200e3);
    expect(sim.plan.insertionApoapsis, log).toBe(500e3);
    const el = sim.state.elements;
    expect(el.apoapsisAlt / 1e3, log).toBeGreaterThan(480);
    expect(el.apoapsisAlt / 1e3, log).toBeLessThan(520);
    expect(el.periapsisAlt / 1e3, log).toBeGreaterThan(190);
    expect(sim.events.map((e) => e.key), log).toContain('evt.offTargetOrbit');
  }, 60000);
});

// ---------------------------------------------------------------------------
// The configuration the application ships with
// ---------------------------------------------------------------------------

/**
 * `SetupPanel` initialises to soyuz21a + crew + baikonur + iss with an
 * untouched `DEFAULT_GUIDANCE`. That exact configuration is flown by
 * `default mission` above; this pins the parts of it that are the APPLICATION's
 * defaults rather than the mission's, so that a change to the panel's initial
 * state or to `DEFAULT_GUIDANCE` cannot quietly ship a first-load mission that
 * does not fly.
 */
describe('the shipped default mission', () => {
  it('is soyuz21a + crew + baikonur + iss on untouched library guidance, and reaches the target at the next launch window', () => {
    const cfg: MissionConfig = {
      vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbit: orbitById('iss'),
      launchTime: launchWindows(orbitById('iss'), siteById('baikonur'), LAUNCH_TIME, 1)[0].time,
      guidance: { ...DEFAULT_GUIDANCE },
      failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: 7150,
    };
    // Not `guidanceResolved`: the panel hands the library defaults over and the
    // simulation merges the vehicle's own program in. That merge is part of what
    // ships, so it is part of what is tested.
    expect(cfg.guidanceResolved).toBeUndefined();
    const sim = new Simulation(cfg, { headless: true });
    expect(sim.cfg.guidance.kickAngle, 'the R-7 program, not the library 2.5 deg').toBe(3);
    let guard = 0;
    while (!sim.done && sim.state.t < 6 * 3600 && guard++ < 400000) sim.step(sim.suggestedDt());
    const log = sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
    const keys = sim.events.map((e) => e.key);
    for (const k of ['evt.impact', 'evt.vehicleLost', 'evt.structuralFailure', 'evt.rangeSafety', 'evt.offTargetOrbit']) {
      expect(keys, log).not.toContain(k);
    }
    expect(keys, log).toContain('evt.targetOrbit');
    expect(sim.state.status, log).toBe('orbit');
    // A crewed launch is flown into a circular parking orbit, not a transfer
    // ellipse: the abort options depend on it.
    expect(sim.plan.insertionApoapsis, log).toBe(sim.plan.insertionAltitude);
  }, 60000);
});
