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
 * Combinations the model does not fly are listed in one of four tables below,
 * and every entry carries the *measured* outcome. The tables are not
 * interchangeable — which one a case lands in follows a rule that can be
 * checked against the flight, not from an opinion about the vehicle:
 *
 *   1. `SITE_GEOMETRY` — the launch is not flyable from that site at all: the
 *      azimuth the orbit needs lies outside the site's range-safety window.
 *      Generated from the site data itself, so it cannot drift.
 *   2. `BEYOND_CAPABILITY` — the flight ends with the tanks empty, or the ideal
 *      delta-v of the stages that have to fly the ascent is below what the
 *      insertion orbit costs (perigee speed + 1450 m/s of ascent losses − the
 *      Earth-rotation credit + 150 m/s of margin — the same test `planMission`
 *      itself uses). Each entry quotes the measured shortfall.
 *   3. `ARCHITECTURE` — propellant is left and the orbit is reachable, but
 *      nothing in the stack can use it: no restart, no kick stage, no
 *      propulsion on the payload.
 *   4. `KNOWN_GUIDANCE_FAILURES` — everything else: the vehicle had both the
 *      delta-v and a way to spend it, and the guidance still lost or missed the
 *      orbit. These are defects, and `known guidance failures still fail`
 *      asserts they are all still broken so the list cannot rot.
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
import { azimuthAllowedFor, resolveTarget } from '../src/physics/mission';
import type { MissionConfig } from '../src/types';
import { RAD, DEG } from '../src/physics/constants';
import {
  LAUNCH_TIME, allCases, caseKey, flyCase, acceptanceFailures, insertionTime, insertionLimit,
} from './fleet-harness';

function fill(table: Record<string, string>, reason: string, ...keys: string[]): void {
  for (const k of keys) table[k] = reason;
}

// ---------------------------------------------------------------------------
// 1. Not flyable from the site: range safety.
// The sun-synchronous preset needs a retrograde, roughly north-westerly or
// south-easterly azimuth. Only Plesetsk and Mahia have a range-safety window
// that contains it; from Baikonur, Cape Canaveral, Kourou, Wenchang,
// Tanegashima, Sriharikota and Starbase the azimuth points over populated land
// or over another country's territory, and the launch would not be licensed.
// The table is generated from the site data so it always describes the sites as
// they are, and `azimuthAllowedFor` is the single source of truth for it.
const SITE_GEOMETRY: Record<string, string> = {};
for (const v of VEHICLES) {
  const site = siteById(v.sites[0]);
  const inc = resolveTarget(orbitById('sso'), site, LAUNCH_TIME).inclination;
  if (azimuthAllowedFor(site, inc)) continue;
  const reason = `a ${(inc * RAD).toFixed(1)}° orbit from ${site.name} needs an azimuth outside the site's `
    + `${site.azimuthMin}–${site.azimuthMax}° range-safety window`;
  fill(SITE_GEOMETRY, reason, `${v.id}/sso/25`, `${v.id}/sso/50`, `${v.id}/sso/90`);
}

// ---------------------------------------------------------------------------
// 2. Beyond the modelled vehicle's delta-v. Either the flight ends with the
// tanks empty, or the stages that fly the ascent are short of the ideal
// delta-v the insertion orbit costs. The figure in brackets is
// (ideal Δv of the ascent stages) − (perigee speed + 1450 m/s of losses − the
// Earth-rotation credit), i.e. the margin the mission had: a negative number is
// the measured shortfall.
//
// `payloadLEO` / `payloadSSO` / `payloadGTO` are quoted for a low reference
// orbit (about 200 km), a reference sun-synchronous orbit and a reference GTO;
// the presets here are 420–600 km circular, which costs 150–300 m/s more, so
// 90 % of the quoted figure is out of reach for several launchers once the
// orbit is that high. Proton-M, Angara-A5 and Soyuz-2.1b additionally always
// carry their 22 t kick stage in this model, which is why their LEO capability
// here is a fraction of the published one.
//
// Every row is graded against the rating for ITS OWN orbit — `payloadSSO` for
// the sun-synchronous preset where the vehicle publishes one (see
// `payloadReference` in tests/fleet-harness.ts). Before that was wired up this
// table carried three exclusions that were artefacts of grading sun-synchronous
// rows against `payloadLEO`: Electron's `sso/90` (270 kg, 1.35× its own 200 kg
// sun-synchronous rating) and two of Long March 2D's, all of which now fly or
// fall under a different heading. A fourth, `ariane64/leo/90`, was simply
// stale: re-measured it inserts at 497 × 498 km and is accepted.
const BEYOND_CAPABILITY: Record<string, string> = {};
fill(BEYOND_CAPABILITY,
  'Blok I 990 m/s short of the parking orbit under a Fregat and 7.4 t: sags back and breaks up at 46 kPa (−990 m/s)',
  'soyuz21b/leo/90', 'soyuz21b/iss/90');
fill(BEYOND_CAPABILITY,
  'the three Proton stages are 553–1137 m/s short under a Briz-M and 11.5–20.7 t: break-up at 46 kPa',
  'protonm/leo/50', 'protonm/leo/90', 'protonm/iss/50', 'protonm/iss/90');
fill(BEYOND_CAPABILITY,
  'URM-1/URM-2 are 692–1519 m/s short under a Briz-M and 12.3–22 t: the ascent never leaves the atmosphere (break-up at 46 kPa by T+134–199 s)',
  'angaraa5/leo/50', 'angaraa5/leo/90', 'angaraa5/sso/50', 'angaraa5/sso/90');
fill(BEYOND_CAPABILITY,
  'second stage empty at T+533 s, still suborbital (published 22.8 t is for a ~200 km orbit)',
  'falcon9/leo/90', 'falcon9/iss/90');
fill(BEYOND_CAPABILITY,
  'second stage empty after raising the apogee to 21 397 km of the 35 786 km target',
  'falcon9/gto/90');
fill(BEYOND_CAPABILITY,
  'second stage empty at T+585 s, still suborbital',
  'falconheavy/leo/90', 'falconheavy/iss/90');
fill(BEYOND_CAPABILITY,
  'second stage empty at a 15 490 km apogee of the 35 786 km target',
  'falconheavy/gto/90');
fill(BEYOND_CAPABILITY,
  'Centaur III empty at 418 × 495 km (−403 m/s) and, to the ISS plane, at T+1237 s suborbital (−523 m/s)',
  'atlasv551/leo/90', 'atlasv551/iss/90');
fill(BEYOND_CAPABILITY,
  'the Vulcain core and Vinci are 230 m/s short into the ISS plane with 19.4 t: the ascent sags and breaks up at 63 kPa (the 500 km case at the same mass is accepted, 497 × 498 km)',
  'ariane64/iss/90');
fill(BEYOND_CAPABILITY,
  'PS1–PS4 have no margin at all with 3.42 t (+3 m/s to 500 km, −160 m/s to the ISS plane): break-up at 81 kPa',
  'pslvxl/leo/90', 'pslvxl/iss/90');
fill(BEYOND_CAPABILITY,
  'PS4 is a 7.3 kN stage: it runs dry at a 25 784 km apogee (50 %) and a 9 577 km one (90 %)',
  'pslvxl/gto/50', 'pslvxl/gto/90');
// Electron has no exclusion at all. Its `sso` rows are now graded against the
// published 200 kg sun-synchronous rating (50/100/180 kg) instead of the 300 kg
// LEO one, and all three are accepted at 594-596 × 596-598 km.
fill(BEYOND_CAPABILITY,
  'ship empty at a 31 633 km apogee of the 35 786 km target',
  'starship/gto/90');
// Long March 2D is rated 3 500 kg to a ~200 km LEO; the matrix asks for
// 3 150 kg into 420-500 km circular orbits, which costs ~250 m/s more. The
// second stage runs dry. (Its `sso` rows are graded against the 1 300 kg
// sun-synchronous rating and are NOT a capability problem — see `ARCHITECTURE`.)
fill(BEYOND_CAPABILITY,
  'second stage empty at T+289 s at 195 × 297 km (LEO) and 36 × 278 km (ISS plane)',
  'longmarch2d/leo/90', 'longmarch2d/iss/90');
// H-IIA 202 has no exclusion: with the sourced 100 000 / 16 600 kg propellant
// loads (see vehicles.ts) all twelve of its cases are accepted.
// Long March 3B/E's `sso/90` used to be listed here as well; it is redundant,
// because Xichang's 94-104° azimuth corridor already puts every one of its
// sun-synchronous rows in `SITE_GEOMETRY`.

// ---------------------------------------------------------------------------
// 3. Architectural limits: propellant left, nothing that can use it.
// Soyuz-2.1a's Blok I fires once and the CubeSat dispenser has no propulsion,
// so the orbit the stack is in at cut-off is final. `planMission` now asks that
// question (`canBurnAfterAscent`) before it chooses the insertion orbit, and
// for this stack the answer changes nothing above 300 km: aiming the ascent
// straight at 500 × 500 km was measured at 497 × 2474 km and at 420 × 420 km at
// 417 × 441 km, because a stage that burns continuously into a circular orbit
// that high arrives with its apoapsis already past the target. The launcher is
// therefore aimed at the transfer orbit it can fly accurately, reaches
// 200 × 417–499 km with 0.3–2.6 km/s still in the Blok I, and ends `off
// target`. Its real profile — insert at ~200 km and let the spacecraft raise
// itself — is the `default mission` test at the bottom of this file.
const ARCHITECTURE: Record<string, string> = {};
fill(ARCHITECTURE,
  'inserts at 200 × 417–499 km with 0.3–2.6 km/s left in the Blok I: no restart, no kick stage and an inert payload, so nothing can raise the perigee (direct insertion measured at 497 × 2474 km)',
  'soyuz21a/leo/25', 'soyuz21a/leo/50', 'soyuz21a/leo/90',
  'soyuz21a/iss/25', 'soyuz21a/iss/50', 'soyuz21a/iss/90');
// Long March 2D is the second stack in the fleet with no restart anywhere: two
// hypergolic stages, no kick stage, and the acceptance payload is the inert
// dispenser. Every preset here sits above `DIRECT_INSERTION_CEILING` (300 km),
// so `planMission` aims the ascent at the transfer orbit it can fly accurately
// and the second stage cuts off with the perigee still at ~198 km and
// 0.3-2.0 t of propellant it has no way to relight. This is the real vehicle's
// limitation too — a CZ-2D mission is a single-burn insertion into a low orbit
// and the spacecraft raises itself, and the matrix's 420-600 km circular
// presets flown with an INERT payload are not missions it has.
//
// It is exactly the exclusion Soyuz-2.1a has carried since before this wave,
// down to the numbers, and like Soyuz-2.1a the vehicle is NOT left unflown:
// `real missions` at the bottom of this file flies it with a spacecraft that
// has propulsion — the payload class the real CZ-2D launches — all the way to
// `evt.targetOrbit` at 596-597 km sun-synchronous, and
// `a fully excluded vehicle must have a dedicated mission that succeeds` makes
// that pairing a gate rather than a convention.
//
// An earlier pass of this wave tried to cover the vehicle with a 200 km
// circular `ssolow` preset and an inert payload instead. That was wrong twice
// over and has been removed: the preset existed only to make one test
// expressible, and the flight it described was not a success — the simulator
// logged `evt.offTargetOrbit`, `evt.insufficientDv` and `evt.noStagesLeft` on
// every one of its cases, and the test asserted neither `evt.targetOrbit` nor
// the absence of those three.
//
// The reason a low circular preset cannot work is measured, not assumed, which
// is why this is an architectural limit and not a tuning one. Over a 360-flight
// grid (pitchMin -15/-25/-35/-45/-60° × kickAngle 1.5/3° × maxTurnRate
// 0.25/0.3/0.4 °/s × gravityTurnEnd 65/90 km × 325/650/1170 kg against a 200 km
// circular sun-synchronous target, all with the default guidance merge) the
// best combination in the whole grid inserts at 197 × 435 km and the worst at
// 193 × 5 008 km. The perigee is pinned at 197 km because that is the cut-off
// gate; the apogee has already run 240 km past the target by the time the
// perigee reaches it, because for a single-shot stack `checkAscent` has no
// apoapsis guard at all (both the guard and the `stalled` clause require
// `canReigniteAfterCutoff`). Closing that is a planner/guidance capability —
// single-shot direct insertion — not a number in this file.
fill(ARCHITECTURE,
  'inserts at 197-198 × 417-606 km with 0.3-2.0 t left in the second stage: no restart, no kick stage and an inert payload, so nothing can raise the perigee',
  'longmarch2d/leo/25', 'longmarch2d/leo/50',
  'longmarch2d/iss/25', 'longmarch2d/iss/50',
  'longmarch2d/sso/25', 'longmarch2d/sso/50', 'longmarch2d/sso/90');

// ---------------------------------------------------------------------------
// 4. Guidance defects: delta-v available, a stage able to spend it, and the
// orbit still missed. These are the remaining scope of the guidance work, not
// capability statements.
const KNOWN_GUIDANCE_FAILURES: Record<string, string> = {};
// 4a. Lost in the atmosphere with a real margin on board.
fill(KNOWN_GUIDANCE_FAILURES,
  'Centaur V lights at 0.26 g with 22 t and the lofted arc falls back before it reaches orbital speed: break-up at 52 kPa (placard 45 kPa) with 2.7–2.8 km/s unused and +646/+743 m/s of margin. No kick angle, turn rate, loft or pitch limit in the tuning grid recovers it; the fix is a profile that trades the loft for horizontal speed at MECO.',
  'vulcan/leo/90', 'vulcan/iss/90');
// 4b. Insertion accuracy on a transfer orbit. The orbit is reached, the apogee
// is within 71 km of the 35 786 km target and the plane is right, but the
// ascent cuts off above the 250 km insertion altitude, so the perigee lands
// high — outside even the (already generous) 40 km band.
fill(KNOWN_GUIDANCE_FAILURES,
  'transfer orbit reached but the perigee is 60 km high (310 km against 250 km)',
  'soyuz21b/gto/90');
fill(KNOWN_GUIDANCE_FAILURES,
  'transfer orbit reached but the perigee is 101 km high (351 km) and the Briz-M needs four perigee passes, so the parking orbit is only complete at T+6435 s',
  'protonm/gto/50');
fill(KNOWN_GUIDANCE_FAILURES,
  'transfer orbit reached but the perigee is 112–126 km high (362/376 km against 250 km)',
  'vulcan/gto/25', 'vulcan/gto/50');

const EXCLUDED: Record<string, string> = {
  ...SITE_GEOMETRY, ...BEYOND_CAPABILITY, ...ARCHITECTURE, ...KNOWN_GUIDANCE_FAILURES,
};

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

export function fleetCases(): ReturnType<typeof allCases> {
  return allCases().filter((c) => !EXCLUDED[caseKey(c)]);
}

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
    // contains the retrograde launch — Plesetsk (330–90°), Mahia (90–200°),
    // Jiuquan (90–200°) and Taiyuan (144–200°) are the four sites in the data
    // that qualify — and (b) at least one of its three `sso` rows survives the
    // capability and architecture tables. Electron keeps all three (its rows
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
    launchTime: LAUNCH_TIME,
    guidance: { ...DEFAULT_GUIDANCE },
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: 7150,
  };
  const sim = new Simulation(cfg, { headless: true });
  let guard = 0;
  while (!sim.done && sim.state.t < 6 * 3600 && guard++ < 400000) sim.step(sim.suggestedDt());
  return sim;
}

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
 * Published ascent milestones and the window the model is held to. Where the
 * asserted window is wider than the published one the comment says why.
 * Mirrored in the "Reference timelines" section of docs/PHYSICS.md.
 */
interface Milestone {
  label: string;
  at: (sim: Simulation) => number;
  /** published figure or window (documentation only) */
  published: string;
  /** asserted window, s */
  window: [number, number];
}

function evTime(key: string, n = 0): (sim: Simulation) => number {
  return (sim) => {
    const hits = sim.events.filter((e) => e.key === key);
    return hits.length > n ? hits[n].t : -1;
  };
}
// The `evt.maxQ` event fires once the dynamic pressure has clearly fallen away
// from its peak. On a vehicle that flies a throttle bucket (Falcon 9) q sits on
// a plateau, so the event time is the meaningful comparison with the published
// "max Q" callout, not the first instant of the plateau.
const maxQTime = evTime('evt.maxQ');

function flyReference(vehicle: string, site: string, orbit: string, satellite: string, mass: number, maxTime = 2 * 3600): Simulation {
  const spec = VEHICLES.find((v) => v.id === vehicle)!;
  const cfg: MissionConfig = {
    vehicleId: vehicle, satelliteId: satellite, siteId: site, orbit: orbitById(orbit),
    launchTime: LAUNCH_TIME,
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
      { label: 'max Q', at: maxQTime, published: '65-80 s', window: [62, 80] },
      { label: 'MECO', at: evTime('evt.meco'), published: '150-165 s', window: [145, 165] },
      { label: 'stage separation', at: evTime('evt.stageSep'), published: 'MECO + 3 s', window: [148, 168] },
      { label: 'MVac ignition', at: evTime('evt.ignition', 1), published: 'MECO + 7 s', window: [152, 172] },
      { label: 'fairing jettison', at: evTime('evt.fairingSep'), published: '190-230 s', window: [185, 235] },
      { label: 'SECO', at: evTime('evt.seco'), published: '500-560 s', window: [495, 565] },
    ],
  },
  {
    name: 'Soyuz-2.1a, 7.15 t crew ship from Baikonur to the ISS',
    fly: () => flyReference('soyuz21a', 'baikonur', 'iss', 'crew', 7150, 6 * 3600),
    milestones: [
      { label: 'booster separation', at: evTime('evt.boosterSep'), published: '~118 s', window: [112, 128] },
      // The heating placard drops the fairing at ~105 km, which this trajectory
      // reaches about 12 % later than the published callout.
      { label: 'fairing jettison', at: evTime('evt.fairingSep'), published: '~157 s', window: [148, 185] },
      { label: 'core cut-off', at: evTime('evt.meco'), published: '~287 s', window: [275, 305] },
      { label: 'third-stage cut-off (SECO)', at: evTime('evt.seco'), published: '~528 s', window: [500, 570] },
    ],
  },
  {
    name: 'H3-22, 5 t to 500 km',
    fly: () => flyReference('h3', 'tanegashima', 'leo', 'cubesats', 5000),
    milestones: [
      { label: 'SRB-3 burnout', at: evTime('evt.boosterBurnout'), published: '105-115 s', window: [100, 118] },
      { label: 'SRB-3 separation', at: evTime('evt.boosterSep'), published: '107-117 s', window: [102, 120] },
      { label: 'MECO', at: evTime('evt.meco'), published: '300-330 s', window: [295, 335] },
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
      { label: 'max Q', at: maxQTime, published: '60-70 s', window: [47, 63] },
      { label: 'MECO', at: evTime('evt.meco'), published: '145-155 s', window: [130, 146] },
      { label: 'fairing jettison', at: evTime('evt.fairingSep'), published: '~190 s', window: [178, 194] },
    ],
  },
  {
    name: 'PSLV-XL, 1.75 t to sun-synchronous orbit',
    fly: () => flyReference('pslvxl', 'sriharikota', 'sso', 'cubesats', 1750),
    milestones: [
      { label: 'PS1 separation', at: evTime('evt.stageSep'), published: '~110 s', window: [100, 122] },
      { label: 'PS2 cut-off', at: evTime('evt.stageCutoff'), published: '~260 s', window: [240, 285] },
      // PS3 is a fixed-impulse solid: its burn time follows from the modelled
      // grain, and it ends earlier than the published window.
      { label: 'PS3 cut-off', at: evTime('evt.stageCutoff', 1), published: '400-600 s', window: [330, 600] },
    ],
  },
  {
    name: 'Ariane 64, 5.75 t to GTO',
    fly: () => flyReference('ariane64', 'kourou', 'gto', 'cubesats', 5750),
    milestones: [
      // The P120C mean thrust is now derived from the grain mass and the
      // published 135 s burn time (see the engine table in vehicles.ts), so
      // separation lands inside the published band instead of ~24 s early.
      { label: 'P120C separation', at: evTime('evt.boosterSep'), published: '130-140 s', window: [130, 145] },
      // Consequence of the same correction, and the cause is the solid thrust
      // PROFILE, not the heating placard.
      //
      // Measured (tests/probe): reverting only the P120C thrust to the pre-wave
      // 3 200 / 3 400 kN moves fairing jettison from T+255 s to T+150 s — a
      // 105 s swing from the motor data alone, with the published ~200 s
      // between the two. The mean thrust in vehicles.ts is right (141.4 t of
      // grain in 135 s is a 2 846 kN mean); what is wrong is that
      // `solidProfile` in src/physics/vehicle.ts uses a fixed 1.2 → 0.8 ramp
      // for every solid, while the P120C's published peak/mean is
      // 4 323 / 2 846 = 1.52. Under-thrusting the first 40 s of a P120C is what
      // puts the trajectory 55 s late at the placard altitude. SRB-A (1.22) and
      // Zefiro 40 (1.16) are close enough to 1.2 that they do not show it.
      //
      // Filed against the physics owner as "solidProfile's 1.2 peak factor is
      // too low for large solids"; the window here is the measured value ±10 s
      // so that the fix, when it lands, is visible as a change.
      { label: 'fairing jettison', at: evTime('evt.fairingSep'), published: '~200 s', window: [245, 265] },
      { label: 'core cut-off', at: evTime('evt.meco'), published: '~460 s', window: [435, 455] },
    ],
  },
  {
    name: 'Vega-C, 1.65 t to 500 km from Kourou',
    fly: () => flyReference('vegac', 'kourou', 'leo', 'cubesats', 1650),
    milestones: [
      { label: 'P120C burnout / separation', at: evTime('evt.meco'), published: '~135 s', window: [130, 142] },
      { label: 'Zefiro 40 ignition', at: evTime('evt.ignition', 1), published: 'burnout + ~2 s', window: [132, 146] },
      // The published callout is ~T+3:40; the heating placard on this
      // trajectory is cleared at ~112 km, about 30 s earlier. Window = measured
      // ±8 s, as everywhere else in this table.
      { label: 'fairing jettison', at: evTime('evt.fairingSep'), published: '~220 s', window: [181, 197] },
      { label: 'Zefiro 40 cut-off', at: evTime('evt.stageCutoff'), published: '~228 s', window: [225, 241] },
      { label: 'Zefiro 9 ignition', at: evTime('evt.ignition', 2), published: '~231 s', window: [229, 245] },
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
      { label: 'first-stage cut-off', at: evTime('evt.meco'), published: '~160 s', window: [148, 163] },
      { label: 'stage separation', at: evTime('evt.stageSep'), published: 'cut-off + ~1 s', window: [149, 164] },
      // Measured T+177 s against a published ~220 s: the heating placard is
      // cleared early on this flat trajectory. Window = measured ±8 s.
      { label: 'fairing jettison', at: evTime('evt.fairingSep'), published: '~220 s', window: [169, 185] },
    ],
  },
  {
    name: 'Long March 3B/E, 5.5 t to GTO from Xichang',
    fly: () => flyReference('longmarch3be', 'xichang', 'gto', 'cubesats', 5500),
    milestones: [
      { label: 'booster separation', at: evTime('evt.boosterSep'), published: '~140 s', window: [135, 147] },
      { label: 'first/second stage separation', at: evTime('evt.stageSep'), published: '~158 s', window: [153, 165] },
      { label: 'fairing jettison', at: evTime('evt.fairingSep'), published: '~215 s', window: [215, 231] },
      { label: 'second-stage cut-off', at: evTime('evt.stageCutoff'), published: '~345 s', window: [336, 350] },
    ],
  },
  {
    name: 'H-IIA 202, 4.1 t to GTO from Tanegashima',
    fly: () => flyReference('h2a202', 'tanegashima', 'gto', 'cubesats', 4100),
    milestones: [
      { label: 'SRB-A burnout', at: evTime('evt.boosterBurnout'), published: '~100 s', window: [96, 106] },
      { label: 'SRB-A separation', at: evTime('evt.boosterSep'), published: '~108 s', window: [104, 114] },
      // Published ~250 s; measured T+163 s, because the heating placard is
      // cleared at ~115 km and this (flatter, kick-4) trajectory reaches that
      // 87 s earlier. The earlier form of this entry ran to [150, 255] so that
      // a future placard fix would read as a pass; that is a 105 s window that
      // asserts nothing, and it is now measured ±8 s like the rest. The
      // deviation stays recorded in `published` and here, not in the tolerance.
      { label: 'fairing jettison', at: evTime('evt.fairingSep'), published: '~250 s', window: [155, 171] },
      { label: 'core cut-off (MECO)', at: evTime('evt.meco'), published: '~396 s', window: [383, 397] },
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
        expect(t, `${m.label} not reached (${log})`).toBeGreaterThan(0);
        expect(t, `${m.label} at T+${t.toFixed(1)} s, published ${m.published}`).toBeGreaterThanOrEqual(m.window[0]);
        expect(t, `${m.label} at T+${t.toFixed(1)} s, published ${m.published}`).toBeLessThanOrEqual(m.window[1]);
      }
    }, 60000);
  }
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
   * The other visible consequence of the P120C mean-thrust correction, pinned
   * because it is a user-facing change and was not obvious from the ascent
   * milestones.
   *
   * Ariane 64's reference GTO mission used to reach `evt.targetOrbit` at
   * T+1067 s with the old (peak-as-mean) 3 200 / 3 400 kN P120C. With the
   * corrected mean thrust the ascent hands the Vinci a slightly different
   * orbit, the apogee burn is scheduled a whole revolution later, and the
   * mission now completes at T+7191 s — the same orbit, seven times the clock,
   * and a user watching the ticker sees two hours instead of eighteen minutes.
   *
   * The root cause is the same 1.2 peak factor in `solidProfile` as the fairing
   * note above; this assertion is here so that the physics fix shows up as a
   * change in mission duration rather than silently.
   */
  it("Ariane 64's GTO mission completes a revolution later than it did before the P120C correction", () => {
    const sim = flyReference('ariane64', 'kourou', 'gto', 'cubesats', 5750);
    const t = evTime('evt.targetOrbit')(sim);
    const log = sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
    expect(t, log).toBeGreaterThan(6500);
    expect(t, log).toBeLessThan(7900);
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
});
