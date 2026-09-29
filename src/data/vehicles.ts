/**
 * Launch vehicle definitions.
 *
 * Numbers are drawn from public sources (manufacturer user guides, press kits,
 * encyclopedic summaries) and rounded. Solid motors use an average thrust so
 * that propellant mass / mass-flow gives the published burn time; the
 * simulation applies a regressive thrust profile on top of that. Where dry
 * masses are not published they are estimated from stage mass fractions.
 * Treat every figure as approximate (±10 %). The hardware figures and their
 * sources live in the parts catalogue, src/data/parts.ts (roadmap D01).
 *
 * FAIRING JETTISON. Eight vehicles carry a `fairing.sepTime`, the operator's own
 * published callout, because their operators publish one and fly it: Soyuz-2.1a
 * and 2.1b 157 s, Ariane 64 200 s, Vega-C 220 s, Long March 2D 220 s, Long
 * March 3B/E 215 s, H-IIA 202 250 s, Vostok-K 156 s. The rest stay on the physical
 * free-molecular-heating placard, and the altitude floor applies to both, so a
 * trajectory still deep in the atmosphere at its published time does not shed
 * the fairing there. See `FairingSpec.sepTime` in src/types.ts for why a
 * published time is modelled instead of a back-solved heat-flux limit.
 *
 * Solid-booster jettison delays follow audit item B24
 * (docs/history/AUDIT-2026-09-16.md): Atlas V GEM-63 5 s, Vulcan GEM-63XL 6 s, H3
 * SRB-3 6 s, Long March 5 kerolox strap-ons 3 s, H-IIA SRB-A 8 s. Ariane 6's
 * P120C keeps 2 s: its separation gap was burn duration, not delay, and was
 * fixed by the B22 mean-thrust correction on the motor itself.
 */
import type { BoosterGroupSpec, EngineSpec, SatelliteSpec, StageSpec, VehicleSpec } from '../types';
import { boosterSpec, fairingSpec, stageSpec } from './parts';

// ---------------------------------------------------------------- the fleet
//
// Roadmap D01: every vehicle is assembled from the parts catalogue in
// src/data/parts.ts. A part holds the hardware (an engine's thrust and Isp, a
// stage's or strap-on's masses, size and engines, a fairing's mass and size)
// with its source; what belongs to the installation stays here: staging
// delays, restart, the throttle while strap-ons burn, ignition times, how many
// strap-ons, livery and drawing hints, and when the fairing is jettisoned.
// The emitters copy an optional field only when it is set and never fill a
// default, so the specs below are value for value the literals this file held
// before the catalogue (tests/d01-vehicles-identity.test.ts), and the fleet
// flies as it did (tests/d01-fleet-fingerprint.test.ts).

/** Soyuz-2's four strap-ons, the same on 2.1a and 2.1b. */
const soyuzBoosters = (): BoosterGroupSpec[] => [boosterSpec('blokBVGD-soyuz2', 4, { sepDelay: 1, conicalTop: true, color: '#c9c7bd' })];
/** Briz-M, on Proton-M and Angara-A5. */
const briz = (): StageSpec => stageSpec('brizm', { restartable: true, sepDelay: 2, ignitionDelay: 3, color: '#d8d8d8' });
/** Falcon 9's second stage, on Falcon 9 and Falcon Heavy. */
const f9Stage2 = (): StageSpec => stageSpec('s2', { restartable: true, sepDelay: 3, ignitionDelay: 4, color: '#f2f2f2', accentColor: '#222' });

/**
 * The reference orbit each `payload*` rating is quoted FOR.
 *
 * Audit item B26 (docs/history/AUDIT-2026-09-16.md): the setup panel shows a bare
 * "Rated LEO payload" and the fleet matrix grades against the same number, but a
 * rating is meaningless without the orbit it was measured to — Soyuz-2.1a's
 * 7 430 kg is to 240 km × 51.6° FROM BAIKONUR and drops to 6 800 kg from
 * Plesetsk, and the fleet matrix's own presets are 420-600 km, which costs
 * 150-300 m/s more than any of them. Where the model cannot reach a published
 * rating, this is the field that says what the rating was actually a rating for.
 *
 * Exported as data rather than as a `VehicleSpec` field because `src/types.ts`
 * belongs to another wave; the UI can render it by id, and the wave that owns
 * types.ts can fold it into `VehicleSpec` unchanged. Altitudes in km,
 * inclination in degrees, `site` is the launch site the rating is quoted from.
 */
export interface RatingOrbit {
  /** which rating this describes */
  rating: 'LEO' | 'SSO' | 'GTO';
  perigeeKm: number;
  apogeeKm: number;
  inclinationDeg: number;
  siteId: string;
  source: string;
}

export const RATING_ORBITS: Record<string, RatingOrbit[]> = {
  soyuz21a: [{ rating: 'LEO', perigeeKm: 240, apogeeKm: 240, inclinationDeg: 51.6, siteId: 'baikonur', source: 'https://en.wikipedia.org/wiki/Soyuz-2_(rocket)' }],
  soyuz21b: [{ rating: 'LEO', perigeeKm: 240, apogeeKm: 240, inclinationDeg: 51.6, siteId: 'baikonur', source: 'https://en.wikipedia.org/wiki/Soyuz-2_(rocket)' }],
  vulcan: [
    { rating: 'LEO', perigeeKm: 420, apogeeKm: 420, inclinationDeg: 51.6, siteId: 'cape', source: 'https://en.wikipedia.org/wiki/Vulcan_Centaur' },
    { rating: 'SSO', perigeeKm: 800, apogeeKm: 800, inclinationDeg: 98.6, siteId: 'vandenberg', source: 'https://en.wikipedia.org/wiki/Vulcan_Centaur' },
  ],
  vegac: [
    { rating: 'SSO', perigeeKm: 700, apogeeKm: 700, inclinationDeg: 98.2, siteId: 'kourou', source: 'https://www.esa.int/Enabling_Support/Space_Transportation/Vega/Vega-C' },
  ],
  longmarch2d: [
    { rating: 'LEO', perigeeKm: 200, apogeeKm: 200, inclinationDeg: 41, siteId: 'jiuquan', source: 'http://www.astronautix.com/c/changzheng2d.html' },
  ],
  longmarch5: [
    { rating: 'LEO', perigeeKm: 200, apogeeKm: 200, inclinationDeg: 19.5, siteId: 'wenchang', source: 'https://en.wikipedia.org/wiki/Long_March_5' },
    { rating: 'SSO', perigeeKm: 700, apogeeKm: 700, inclinationDeg: 98.2, siteId: 'wenchang', source: 'https://en.wikipedia.org/wiki/Long_March_5' },
  ],
};

export const VEHICLES: VehicleSpec[] = [
  {
    id: 'soyuz21a', name: 'Soyuz-2.1a', country: 'RU', manufacturer: 'RKTs Progress',
    // 7 430 kg to 240 km / 51.6 deg FROM BAIKONUR (6 800 kg from Plesetsk,
    // 7 460 kg from Vostochny). The file carried 7 020 kg, which matches no
    // published site; see RATING_ORBITS above and audit item B26.
    // https://en.wikipedia.org/wiki/Soyuz-2_(rocket)
    height: 46.3, payloadLEO: 7430, payloadGTO: 0,
    // Soyuz publishes a fairing callout and flies it: T+157 s on the crewed
    // profile. On the heating placard alone this trajectory shed it at T+176 s,
    // ~12 % late, which was one of the recorded disagreements with the published
    // timeline. See `FairingSpec.sepTime` in src/types.ts for why the published
    // TIME is modelled rather than a back-solved heat-flux placard.
    // The 4.11 m fairing, 11.43 m long with its own adapter cone down to Blok I
    // (TASS/RIA: the 4.11 × 11.43 m payload unit), for the crewed and the cargo
    // flights alike; with the escape tower on its nose the head of a crewed
    // stack is 15.59 m, and the stack 46.3–51.4 m (owner's figures,
    // 2026-09-25): 46.85 m drawn, 51.0 m with the tower. It was drawn and flown
    // at 3.7 × 10.1 m on a 1.7 m adapter of its own.
    fairing: fairingSpec('soyuz21a', { sepAltitude: 95e3, sepTime: 157, color: '#e8e8e8' }),
    // A crewed launch carries the escape tower and the fairing's abort motors (G06).
    escapeSystem: 'soyuz',
    stages: [
      // Blok A as flown by Soyuz-2.1a: 87 000 kg, held to the published 2.1a
      // clock (the two R-7 core bodies in src/data/parts.ts say why).
      stageSpec('blokA-soyuz21a', { color: '#c9c7bd', accentColor: '#5a6b4c', profile: 'r7Core', boosters: soyuzBoosters() }),
      stageSpec('blokI-rd0110', { sepDelay: 0, ignitionDelay: 0, color: '#c9c7bd', profile: 'r7Upper' }),
    ],
    sites: ['baikonur', 'plesetsk', 'vostochny'], maxQ: 40e3, maxAccel: 60,
    crewCapable: true,
    // The R-7 has no upper stage that can make up a slow start: its Blok I fires
    // once and whatever orbit it is in at cut-off is final. A 1.5 deg kick costs
    // about 450 m/s of gravity and steering loss against a 3 deg one (measured
    // 1211 + 364 m/s vs 1105 + 260 m/s on the 7.15 t crew mission), which is the
    // difference between reaching the parking orbit and falling 30 km short of
    // it. 3 deg / 0.3 deg/s keeps max Q at 34 kPa, inside the 40 kPa placard,
    // and holds booster separation, core cut-off and SECO on their published
    // times (120 / 294 / 535 s against 118 / 287 / 528 s).
    guidanceDefaults: { kickAngle: 3, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    // Flown as a rigid body: an early, longer kick and a faster turn allowance, the
    // programme that passed the calm, crosswind and shear reference missions with
    // the actuator limits unchanged (docs/SIXDOF-ACCEPTANCE.md).
    guidanceDefaultsSixDof: { pitchOverAltitude: 50, kickAngle: 4, kickDuration: 12, maxTurnRate: 0.5 },
    notes: 'The crew/cargo launcher for Soyuz MS and Progress: R-7 boosters and core with the RD-0110 third stage, direct insertion.',
  },
  {
    id: 'soyuz21b', name: 'Soyuz-2.1b / Fregat-M', country: 'RU', manufacturer: 'RKTs Progress',
    // 8 670 kg to 240 km / 51.6 deg from Baikonur (was 8 200 kg, which is no
    // published site's figure). https://en.wikipedia.org/wiki/Soyuz-2_(rocket)
    height: 46.3, payloadLEO: 8670, payloadGTO: 1900, payloadSSO: 4900,
    fairing: fairingSpec('soyuz21b', { sepAltitude: 95e3, sepTime: 157, color: '#e8e8e8' }),
    stages: [
      // The audited 90 100 kg Blok A load — see the two R-7 core bodies in
      // src/data/parts.ts for why 2.1a keeps 87 000 kg and only 2.1b takes this.
      stageSpec('blokA-soyuz21b', { color: '#c9c7bd', accentColor: '#5a6b4c', profile: 'r7Core', boosters: soyuzBoosters() }),
      stageSpec('blokI-rd0124', { sepDelay: 0, ignitionDelay: 0, color: '#c9c7bd', profile: 'r7Upper' }),
      stageSpec('fregat', { restartable: true, sepDelay: 2, ignitionDelay: 3, color: '#b8b0a0' }),
    ],
    sites: ['baikonur', 'plesetsk', 'vostochny'], maxQ: 40e3, maxAccel: 60,
    // As Soyuz-2.1a; the Fregat finishes the orbit so the Blok I hands over on a shallow arc.
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    notes: 'R-7 family; four conical strap-on boosters, hot-staged third stage, restartable Fregat upper stage.',
  },
  {
    id: 'protonm', name: 'Proton-M / Briz-M', country: 'RU', manufacturer: 'Khrunichev',
    height: 58.2, payloadLEO: 23000, payloadGTO: 6920,
    fairing: fairingSpec('protonm', { sepAltitude: 120e3, color: '#e8e8e8' }),
    stages: [
      // The first stage is 4.1 m, its core, not the 7.4 m span across the six
      // outboard tanks (audit item B23; the body in src/data/parts.ts). With
      // the span it flew with 70 % too much drag through the whole atmospheric
      // phase, which is also part of why it is destroyed at 50 % payload. The
      // tanks are not strap-ons, so the vehicle carries a `dragArea` override
      // below instead — the first use of a field that had been declared and set
      // by nothing (audit item B39).
      stageSpec('p1', { color: '#d9d9d9', accentColor: '#7a7a7a' }),
      stageSpec('p2', { sepDelay: 0, ignitionDelay: 0, color: '#d9d9d9' }),
      stageSpec('p3', { sepDelay: 1, ignitionDelay: 1, color: '#d9d9d9' }),
      briz(),
    ],
    sites: ['baikonur'], maxQ: 40e3, maxAccel: 55,
    // The 4.1 m core plus six 1.6 m outboard tanks, as a reference area rather
    // than as a circle around the span (audit item B23). It is dropped once the
    // first stage separates in the sense that matters — the override is only
    // ever wider than what is left above it — and the fairing (4.35 m,
    // 14.9 m^2) is inside it too.
    dragArea: 25,
    // Heavy and draggy: it needs a fast pitch-over or it climbs too steeply and
    // falls back through the atmosphere.
    //
    // The loft follows the fleet's own rule — set for a stack whose next stage
    // lights below 0.4 g — applied to the stage that was exempt from it by
    // accident. The Briz-M lights at 19.6 kN under 22-30 t, i.e. 0.065-0.09 g,
    // by far the weakest hand-over in the fleet, and the lofted hand-off used to
    // skip it because `nextStageAccel` excludes a weak final stage (see
    // `GuidanceInputs.kickStageAccel`). Without it the third stage cut off level
    // at the insertion altitude and the Briz-M sank out of the orbit it was
    // meant to close: with 5.75 t aboard the insertion bottomed out at 94 km,
    // with 7.15 t the stack was destroyed at 46 kPa. With it the same 5.75 t
    // insertion bottoms out at 139 km. 150 km is the figure Angara-A5 already
    // carries for the same hardware above the same kind of hand-over.
    guidanceDefaults: { kickAngle: 6, maxTurnRate: 0.3, pitchMax: 25, loftAltitude: 150e3 },
    notes: 'Hypergolic heavy-lift launcher; Briz-M performs multi-burn GTO/GEO insertions.',
  },
  {
    id: 'angaraa5', name: 'Angara-A5 / Briz-M', country: 'RU', manufacturer: 'Khrunichev',
    height: 55.4, payloadLEO: 24500, payloadGTO: 5400,
    fairing: fairingSpec('protonm', { sepAltitude: 120e3, color: '#e8e8e8' }),
    stages: [
      stageSpec('urm1core', {
        color: '#f0f0f0', accentColor: '#c33', throttleWithBoosters: 0.3,
        boosters: [boosterSpec('urm1', 4, { sepDelay: 1, color: '#f0f0f0' })],
      }),
      stageSpec('urm2', { sepDelay: 1, ignitionDelay: 1, color: '#f0f0f0' }),
      briz(),
    ],
    sites: ['plesetsk', 'vostochny'], maxQ: 40e3, maxAccel: 50,
    // Low liftoff T/W with the core throttled to 30 %; lofts so that the URM-2 takes over climbing.
    guidanceDefaults: { kickAngle: 4, maxTurnRate: 0.3, pitchMax: 25, loftAltitude: 150e3 },
    notes: 'Modular kerolox launcher; core throttles to 30 % while four identical URM-1 boosters burn.',
  },
  {
    id: 'falcon9', name: 'Falcon 9 Block 5', country: 'US', manufacturer: 'SpaceX',
    height: 70, payloadLEO: 22800, payloadGTO: 8300, payloadSSO: 15000,
    fairing: fairingSpec('falcon9', { sepAltitude: 110e3, color: '#f4f4f4' }),
    stages: [
      // The published first-stage masses (docs/VALIDATION.md, F1; the body in
      // src/data/parts.ts). Falcon Heavy's cores keep their own figures.
      stageSpec('s1', { color: '#f2f2f2', accentColor: '#1a1a1a', gridFins: true, legs: true }),
      f9Stage2(),
    ],
    sites: ['cape', 'ksc39a', 'vandenberg'], maxQ: 40e3, maxAccel: 45,
    // 22 kPa, not the real ~33 kPa peak. Raising it was measured across
    // 26/30/33 kPa and with the bucket removed (table in docs/PHYSICS.md §6a):
    // the max-Q marker only reaches T+61 s even with no throttle-down at all,
    // still short of the published 65-80 s, because when q peaks is set by the
    // ascent profile rather than by the bucket. With the published first-stage
    // masses MECO and fairing jettison stay inside their windows either way,
    // but a later, deeper bucket moves the early ascent further from five
    // flights' webcast telemetry (docs/VALIDATION.md), so it stays.
    maxQThrottle: { qStart: 22e3, qEnd: 22e3, throttle: 0.75 },
    // A return to the launch site keeps 15 % instead: measured on Bandwagon-1
    // (1.3 t to 590 km at 45.4°), 13 % is the least that lands on LZ-1 in the
    // point-mass model, and 15 % touches down with 13.0 t to spare (both with
    // the published first-stage masses above).
    recoverable: true, recoveryReserve: 0.12, returnReserve: 0.15, crewCapable: true,
    // Shallow kick and a slow pitch program put MECO near 65 km, which is what the published timeline implies.
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    // Flown as a rigid body the stack cannot make the point-mass program's late
    // dive (the load relief holds it within 15° of the wind), so the 1.5° kick
    // left it climbing too steeply: the flight-path angle 5-20° above five
    // flights' webcast telemetry from T+40 s and ~10 km high by T+140 s. A 3.5°
    // kick was fitted on CRS-16, Iridium NEXT 8 and GPS III SV01 and checked on
    // SSO-A and Bangabandhu-1 (docs/VALIDATION.md, F5).
    guidanceDefaultsSixDof: { kickAngle: 3.5 },
    notes: 'Partially reusable; enabling booster recovery reserves propellant for the boost-back/landing burns.',
  },
  {
    id: 'falconheavy', name: 'Falcon Heavy', country: 'US', manufacturer: 'SpaceX',
    height: 70, payloadLEO: 63800, payloadGTO: 26700,
    fairing: fairingSpec('falcon9', { sepAltitude: 110e3, color: '#f4f4f4' }),
    stages: [
      // The centre core's real differences from a side booster are its heavier
      // structure (its body) and the throttle-down while the sides burn (this
      // installation); it used to point at a `MERLIN1D_FH_CORE` alias that was
      // `{ ...MERLIN1D }` with no overrides, implying a distinction in the
      // engine that the data did not carry.
      stageSpec('core', {
        color: '#f2f2f2', accentColor: '#1a1a1a', gridFins: true, legs: true,
        throttleWithBoosters: 0.55,
        boosters: [boosterSpec('side', 2, { sepDelay: 2, color: '#f2f2f2' })],
      }),
      f9Stage2(),
    ],
    sites: ['cape', 'ksc39a'], maxQ: 40e3, maxAccel: 45,
    // Falcon 9's bucket. Falcon Heavy Demo 1's webcast telemetry shows the whole
    // vehicle throttled down from T+38 to T+72 s, holding the dynamic pressure
    // on a 20-23 kPa plateau (peak 22.9 kPa); without a bucket the model peaked
    // at 34 kPa (docs/VALIDATION.md, F11).
    maxQThrottle: { qStart: 22e3, qEnd: 22e3, throttle: 0.75 },
    // Side boosters flown back to LZ-1 and LZ-2 keep 15 %: at 12 % they run
    // into their landing reserve before the boostback is done (Arabsat-6A,
    // 6.5 t to GTO, point-mass model).
    recoverable: true, recoveryReserve: 0.12, returnReserve: 0.15,
    // As Falcon 9, with a loft for the long second-stage burn under a heavy payload.
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.3, pitchMax: 25, loftAltitude: 150e3 },
    notes: 'Three Falcon 9 cores; the center core throttles down until side-booster separation.',
  },
  {
    id: 'atlasv551', name: 'Atlas V 551', country: 'US', manufacturer: 'ULA',
    height: 62.2, payloadLEO: 18850, payloadGTO: 8900,
    fairing: fairingSpec('atlasv551', { sepAltitude: 110e3, color: '#f4f4f4' }),
    stages: [
      stageSpec('ccb', {
        color: '#c8792a', accentColor: '#7a4a17',
        boosters: [boosterSpec('gem63', 5, { sepDelay: 5, color: '#f4f4f4' })],
      }),
      stageSpec('centaur3', { restartable: true, sepDelay: 3, ignitionDelay: 10, color: '#e5e5e5' }),
    ],
    sites: ['cape', 'vandenberg'], maxQ: 45e3, maxAccel: 49,
    maxQThrottle: { qStart: 22e3, qEnd: 22e3, throttle: 0.6 },
    // Five solids give a high initial T/W so it turns early; the loft is what the low-thrust Centaur III needs.
    guidanceDefaults: { kickAngle: 6, maxTurnRate: 0.3, pitchMax: 25, loftAltitude: 150e3 },
    // As a rigid body the booster cannot hold the 25-35° angle of attack the point
    // mass pitches over at near max-Q, and hands the Centaur a flatter arc; a
    // larger kick gives the same hand-off without it (docs/SIXDOF-ACCEPTANCE.md).
    guidanceDefaultsSixDof: { kickAngle: 8 },
    notes: 'Five solid boosters, kerolox core and a high-Isp hydrogen Centaur upper stage. The RD-180 throttles down through max-Q.',
  },
  {
    id: 'vulcan', name: 'Vulcan Centaur VC4', country: 'US', manufacturer: 'ULA',
    // VC4 ratings, which is what the record is named for. 24 400 / 12 100 kg is
    // the VC6 class (25 600 / 14 400 with six GEM-63XL); VC4 is 21 400 kg to the
    // ISS orbit, 11 600 kg to GTO and 18 500 kg to sun-synchronous.
    // https://en.wikipedia.org/wiki/Vulcan_Centaur  — audit item B26.
    height: 61.6, payloadLEO: 21400, payloadGTO: 11600, payloadSSO: 18500,
    fairing: fairingSpec('vulcan', { sepAltitude: 110e3, color: '#f4f4f4' }),
    stages: [
      // The 481 700 kg core load is audit item B21, decided from the primary
      // evidence against the 353 400 kg candidate; the argument is with the
      // body in src/data/parts.ts.
      stageSpec('v1', {
        color: '#f4f4f4', accentColor: '#c0392b',
        boosters: [boosterSpec('gem63xl', 4, { sepDelay: 6, color: '#f4f4f4' })],
      }),
      stageSpec('centaur5', { restartable: true, sepDelay: 3, ignitionDelay: 10, color: '#e5e5e5' }),
    ],
    sites: ['cape', 'vandenberg'], maxQ: 45e3, maxAccel: 49,
    maxQThrottle: { qStart: 25e3, qEnd: 25e3, throttle: 0.7 },
    // Centaur V has a thrust-to-weight near 0.3, so the booster has to hand over
    // climbing — but with the audited 481.7 t first stage (B21, in
    // src/data/parts.ts) the booster now burns 309 s instead of 276 s, and a
    // 150 km loft on top of that is more than the Centaur can hold:
    // vulcan/iss/50 flattened and broke up at T+1233 s. Measured over kick 1.5-6 deg x rate 0.3/0.45 x loft 0-250 km x
    // pitch ceiling 25/35 deg (96 guidance points x 9 fleet rows), 80 km is the
    // loft that takes every row the vehicle has the delta-v for: leo and iss at
    // 25 % and 50 %, all three GTO rows, insertion T+999-1182 s. The two 90 %
    // rows stay lost at every point in that grid, which is why they are still
    // KNOWN_GUIDANCE_FAILURES rather than a tuning gap.
    //
    // `parkingAltitude: 250e3` is the other half, and it is a statement about
    // the stage rather than a fitted constant. The library default asks every
    // vehicle for a 200 km parking orbit; Centaur V is a high-energy hydrogen
    // stage that arrives fast and shallow, and aimed at 200 km it cut off on the
    // apoapsis with the perigee still at 137-150 km — 50-60 km under the orbit
    // it had been asked for, on every one of the 96 guidance points swept. Aimed
    // at 250 km, which is where ULA's own low-orbit insertions sit, it closes
    // the transfer it was given: measured 238-250 x 497 km. The 9-row matrix is
    // unchanged by it (leo/iss 25-50 % and all three GTO rows accepted) and the
    // ascent auto-tuner, which grades a candidate against the orbit the PLAN
    // asked for, stops reporting every point in its grid as an insertion miss.
    // Centaur V lights at 0.27-0.3 g under a near-rated payload and cannot hold
    // altitude at any attitude, so the core has to hand it a high, climbing
    // arc: 40° of pitch authority and a 150 km loft. At 30° / 80 km the 90 %
    // LEO and ISS rows fell back into the air with 3.4-3.6 km/s aboard.
    guidanceDefaults: { kickAngle: 3, maxTurnRate: 0.3, pitchMax: 40, loftAltitude: 150e3, parkingAltitude: 250e3 },
    notes: 'Methalox first stage with up to six solids; Centaur V is a long-coast hydrogen upper stage.',
  },
  {
    id: 'ariane64', name: 'Ariane 64', country: 'EU', manufacturer: 'ArianeGroup',
    height: 62, payloadLEO: 21600, payloadGTO: 11500, payloadSSO: 15000,
    fairing: fairingSpec('ariane64', { sepAltitude: 115e3, sepTime: 200, color: '#f4f4f4' }),
    stages: [
      stageSpec('llpm', {
        color: '#f4f4f4', accentColor: '#1d4f91',
        boosters: [boosterSpec('p120c', 4, { sepDelay: 2, color: '#f4f4f4' })],
      }),
      stageSpec('ulpm', { restartable: true, sepDelay: 3, ignitionDelay: 6, color: '#f4f4f4' }),
    ],
    sites: ['kourou'], maxQ: 55e3, maxAccel: 45,
    // P120C solids turn the vehicle quickly; the Vinci upper stage needs the loft.
    // pitchMin 10: with the P120Cs still burning the closed loop used to
    // command the stack level or slightly nose-down at 70 km (it sees the
    // boosters' thrust, not the 0.84 g core that is left after they drop), and
    // the Vulcain then spent its burn climbing back — handing Vinci a sagging
    // arc under 13.5-19.4 t. Never pitching below 10° keeps that altitude.
    guidanceDefaults: { kickAngle: 6, maxTurnRate: 0.3, pitchMax: 35, pitchMin: 10, loftAltitude: 150e3 },
    notes: 'Hydrogen core with four P120C solids; the Vinci upper stage restarts for multi-orbit missions.',
  },
  {
    // Avio / ESA Vega-C. Stage masses, thrusts, Isp and burn times:
    // https://en.wikipedia.org/wiki/Vega_C  (P120C 141 400 kg / 135.7 s,
    // Z40 36 239 kg / 92.9 s, Z9 10 567 kg / 119.6 s, AVUM+ 740 kg / 2.42 kN /
    // 315.8 s, liftoff 210 t, 3.3 m fairing, 2 300 kg to the 700 km polar
    // reference orbit). Motor qualification: https://www.esa.int/Enabling_Support/Space_Transportation/Vega/Vega-C
    id: 'vegac', name: 'Vega-C', country: 'EU', manufacturer: 'Avio / ESA',
    // `payloadLEO` is the fleet-wide convention: the capability to a LOW (about
    // 200 km) reference orbit, which ESA quotes as 3.3 t
    // (https://www.esa.int/Enabling_Support/Space_Transportation/Vega/Vega-C).
    // The widely-quoted 2 300 kg is the *reference mission*, 700 km polar, and
    // is carried in `payloadSSO` where it belongs — grading Vega-C's fleet
    // matrix against 2 300 kg would have made its acceptance record look better
    // than every other vehicle's for no physical reason.
    height: 34.8, payloadLEO: 3300, payloadGTO: 0, payloadSSO: 2300,
    // Vega-C drops the fairing at about T+3:40. `sepAltitude` is only the
    // fallback ceiling — the simulation jettisons on the free-molecular heating
    // placard, which this trajectory clears at T+187 s and ~112 km.
    fairing: fairingSpec('vegac', { sepAltitude: 120e3, sepTime: 220, color: '#f0f0f0' }),
    stages: [
      // published burn time 135.7 s (booster burnout ~T+135 s)
      stageSpec('p120c', { color: '#f0f0f0', accentColor: '#1d4f91' }),
      // published burn time 92.9 s
      stageSpec('z40', { sepDelay: 1, ignitionDelay: 1, color: '#f0f0f0' }),
      // published burn time 119.6 s
      stageSpec('z9', { sepDelay: 2, ignitionDelay: 2, color: '#f0f0f0' }),
      stageSpec('avum', { restartable: true, sepDelay: 2, ignitionDelay: 4, color: '#d8d8d8' }),
    ],
    sites: ['kourou'], maxQ: 55e3, maxAccel: 60,
    // Three solid stages that cannot throttle or shut down, then a 2.4 kN kick
    // stage at 0.06 g. The stack has to arrive at Z9 burnout already high and
    // fast, so it lofts; the P120C turns quickly (high T/W) and the pitch
    // ceiling is left wide so closed-loop guidance can hold the arc up.
    guidanceDefaults: { kickAngle: 6, maxTurnRate: 0.45, pitchMax: 35, loftAltitude: 150e3 },
    notes: 'Three solid stages (P120C, Zefiro 40, Zefiro 9) and the restartable liquid AVUM+ kick stage. The P120C is shared with Ariane 6 as a strap-on.',
  },
  {
    // SAST Long March 2D. Stage data: Encyclopedia Astronautica CZ-2D
    // (stage 1 L-180 gross 192 700 / empty 9 500 / 170 s, stage 2 L-35 gross
    // 39 550 / empty 4 000 / 135 s) cross-checked against
    // https://en.wikipedia.org/wiki/Long_March_2D (232 250 kg liftoff,
    // 2 961.6 kN, 41.056 m, 3.35 m, 3 500 kg LEO / 1 300 kg SSO, flies from
    // Jiuquan, Taiyuan and Xichang). http://www.astronautix.com/c/changzheng2d.html
    id: 'longmarch2d', name: 'Long March 2D', country: 'CN', manufacturer: 'SAST',
    height: 41.06, payloadLEO: 3500, payloadGTO: 0, payloadSSO: 1300,
    fairing: fairingSpec('longmarch2d', { sepAltitude: 120e3, sepTime: 220, color: '#f0f0f0' }),
    stages: [
      // published burn time 170 s (first/second stage separation ~T+160 s)
      stageSpec('cz2d1', { color: '#f0f0f0', accentColor: '#b0332a' }),
      // published burn time 135 s
      stageSpec('cz2d2', { sepDelay: 1, ignitionDelay: 1, color: '#f0f0f0' }),
    ],
    sites: ['jiuquan', 'taiyuan', 'xichang'], maxQ: 45e3, maxAccel: 60,
    // Two hypergolic stages with no restart: the second stage has to fly the
    // insertion in one burn, so the ascent stays shallow and finishes climbing
    // on the second stage rather than lofting.
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    notes: "China's workhorse for sun-synchronous remote-sensing satellites: two hypergolic stages, flown from all three inland launch centres.",
  },
  {
    // CALT Long March 3B/E. https://en.wikipedia.org/wiki/Long_March_3B
    // 458 970 kg liftoff, 56.3 m; 4 boosters of 41 100 kg at 740.4 kN / 140 s;
    // first stage 186 200 kg at 2 961.6 kN / 158 s; second stage 49 400 kg at
    // 742 kN, Isp 298 s / 185 s; third stage 2× YF-75 at 167.17 kN, Isp 438 s /
    // 478 s; 5 500 kg to GTO from Xichang.
    id: 'longmarch3be', name: 'Long March 3B/E', country: 'CN', manufacturer: 'CALT',
    height: 56.3, payloadLEO: 11500, payloadGTO: 5500,
    // CZ-3B/E drops the fairing at about T+215 s. On the heating placard alone
    // this trajectory shed it at T+223 s, ~4 % late and outside the 2 % band a
    // point callout is quoted to; flown on the published time, like the other
    // operators who publish one.
    fairing: fairingSpec('longmarch3be', { sepAltitude: 115e3, sepTime: 215, color: '#f0f0f0' }),
    stages: [
      // published burn time 158 s (stage separation ~T+158 s); boosters 140 s, separation ~T+140 s
      stageSpec('cz3b1', {
        color: '#f0f0f0', accentColor: '#b0332a',
        boosters: [boosterSpec('cz3bb', 4, { sepDelay: 2, conicalTop: true, color: '#f0f0f0' })],
      }),
      // published burn time 185 s
      stageSpec('cz3b2', { sepDelay: 1, ignitionDelay: 1, color: '#f0f0f0' }),
      // published burn time 478 s
      stageSpec('cz3b3', { restartable: true, sepDelay: 2, ignitionDelay: 4, color: '#f0f0f0' }),
    ],
    sites: ['xichang'], maxQ: 45e3, maxAccel: 55,
    // Four liquid strap-ons give a 1.34 liftoff T/W, so the turn starts early;
    // the hydrogen third stage is a long, gentle burn that needs the ascent
    // handed over high, hence the loft and the tighter pitch ceiling.
    guidanceDefaults: { kickAngle: 4, maxTurnRate: 0.3, pitchMax: 25, loftAltitude: 150e3 },
    notes: "China's main geostationary launcher: four liquid strap-ons, two hypergolic stages and a restartable YF-75 hydrogen third stage.",
  },
  {
    // MHI / JAXA H-IIA 202, retired after flight 50 on 28 June 2025.
    // https://en.wikipedia.org/wiki/H-IIA  (LE-7A 1 098 kN / 440 s / 390 s burn,
    // first stage 100 t propellant of a 113.6 t stage; SRB-A 2 260 kN peak,
    // 120 s quoted burn; LE-5B 137 kN / 447 s / 534 s; 53 m; 4.1 t to GTO from
    // Tanegashima). SRB-A grain and inert masses, burnout ~100 s and separation
    // ~108 s are the audited figures.
    id: 'h2a202', name: 'H-IIA 202 (historical)', country: 'JP', manufacturer: 'MHI / JAXA',
    height: 53, payloadLEO: 10000, payloadGTO: 4100, payloadSSO: 3600,
    // 4S fairing; H-IIA jettisons it at about T+4:05 near 150 km. As elsewhere
    // this is only the fallback ceiling: the heating placard fires first, at
    // T+164-172 s on these trajectories.
    fairing: fairingSpec('h2a202', { sepAltitude: 150e3, sepTime: 250, color: '#f4f4f4' }),
    stages: [
      // published core cut-off ~396 s (390 s quoted burn time). The published
      // stage masses, and why the file once carried 12 000 kg: the body in
      // src/data/parts.ts.
      stageSpec('h2a1', {
        color: '#e2762a', accentColor: '#f4f4f4',
        // published burnout ~100 s, separation ~108 s
        boosters: [boosterSpec('srba', 2, { sepDelay: 8, color: '#f4f4f4' })],
      }),
      // published burn time 534 s; published masses (src/data/parts.ts)
      stageSpec('h2a2', { restartable: true, sepDelay: 6, ignitionDelay: 6, color: '#f4f4f4' }),
    ],
    sites: ['tanegashima'], maxQ: 40e3, maxAccel: 50,
    // Two SRB-A give a 1.75 liftoff T/W and burn out at T+100 s, after which the
    // LE-7A pushes a light core for another five minutes: the vehicle has to be
    // well over on its side before the solids go, or the core spends its whole
    // burn climbing and the 137 kN LE-5B is handed a steep, slow trajectory. A
    // 4° kick was measured at 11 of the 12 fleet cases against 7 for 1.5°; with
    // the sourced propellant loads it now takes all nine of its non-geometry
    // cases (the three sun-synchronous rows are ruled out by Tanegashima's
    // azimuth corridor). No loft: the core burn is long enough to place the
    // apogee by itself.
    guidanceDefaults: { kickAngle: 4, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    notes: 'Retired 28 June 2025 after 50 flights. Hydrogen LE-7A core with two SRB-A solids and a restartable LE-5B upper stage; the direct ancestor of H3.',
  },
  {
    // https://en.wikipedia.org/wiki/Long_March_5 — core CZ-5-500 gross
    // 186 900 kg / propellant 165 300 kg / 492 s; booster CZ-5-300 gross
    // 156 600 kg each / 173 s; liftoff 851 800 kg; 25 t to a 200 km LEO,
    // 14 t to GTO, 15 t to a 700 km sun-synchronous orbit.
    id: 'longmarch5', name: 'Long March 5', country: 'CN', manufacturer: 'CALT',
    height: 57, payloadLEO: 25000, payloadGTO: 14000, payloadSSO: 15000,
    fairing: fairingSpec('longmarch5', { sepAltitude: 120e3, color: '#f4f4f4' }),
    stages: [
      // Core and boosters on the published gross masses, which put the stack
      // at 846.8 t dry of payload (the bodies in src/data/parts.ts).
      stageSpec('cz5core', {
        color: '#f4f4f4', accentColor: '#1f5fbf',
        boosters: [boosterSpec('k3', 4, { sepDelay: 3, color: '#f4f4f4' })],
      }),
      stageSpec('cz5s2', { restartable: true, sepDelay: 2, ignitionDelay: 4, color: '#f4f4f4' }),
    ],
    sites: ['wenchang'], maxQ: 40e3, maxAccel: 45,
    // Hydrogen core with kerolox boosters: a gentle turn keeps the long core burn efficient.
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.45, pitchMax: 35, loftAltitude: 0 },
    notes: "China's heavy-lift launcher: hydrogen core with four kerolox boosters.",
  },
  {
    id: 'h3', name: 'H3-22', country: 'JP', manufacturer: 'MHI / JAXA',
    height: 63, payloadLEO: 10000, payloadGTO: 4000, payloadSSO: 4000,
    fairing: fairingSpec('h3', { sepAltitude: 120e3, color: '#f4f4f4' }),
    stages: [
      stageSpec('h3s1', {
        color: '#f4f4f4', accentColor: '#d35400',
        boosters: [boosterSpec('srb3', 2, { sepDelay: 6, color: '#f4f4f4' })],
      }),
      stageSpec('h3s2', { restartable: true, sepDelay: 3, ignitionDelay: 5, color: '#f4f4f4' }),
    ],
    sites: ['tanegashima'], maxQ: 40e3, maxAccel: 45,
    // Two SRB-3 and a high-Isp core; the shallow kick matches the published SRB separation time.
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    notes: 'Expander-bleed LE-9 hydrogen engines with two SRB-3 solids.',
  },
  {
    id: 'pslvxl', name: 'PSLV-XL', country: 'IN', manufacturer: 'ISRO',
    height: 44, payloadLEO: 3800, payloadGTO: 1425, payloadSSO: 1750,
    fairing: fairingSpec('pslvxl', { sepAltitude: 115e3, color: '#f4f4f4' }),
    stages: [
      stageSpec('ps1', {
        color: '#f4f4f4', accentColor: '#e67e22',
        boosters: [
          boosterSpec('psomg', 4, { sepDelay: 2, color: '#f4f4f4' }),
          boosterSpec('psoma', 2, { igniteAt: 25, sepDelay: 2, color: '#f4f4f4' }),
        ],
      }),
      stageSpec('ps2', { sepDelay: 1, ignitionDelay: 1, color: '#f4f4f4' }),
      stageSpec('ps3', { sepDelay: 2, ignitionDelay: 2, color: '#f4f4f4' }),
      stageSpec('ps4', { restartable: true, sepDelay: 2, ignitionDelay: 3, color: '#f4f4f4' }),
    ],
    sites: ['sriharikota'], maxQ: 70e3, maxAccel: 60,
    // Four alternating stages; a gentle turn keeps PS2 high enough for the solid PS3.
    // An 80 km loft: the 0.2 g PS4 cannot hold altitude, so PS3 hands it over
    // climbing instead of level at 210 km.
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.3, pitchMax: 25, loftAltitude: 80e3 },
    notes: 'Four alternating solid/liquid stages; two of six strap-ons are air-lit at T+25 s.',
  },
  {
    id: 'electron', name: 'Electron', country: 'NZ/US', manufacturer: 'Rocket Lab',
    height: 18, payloadLEO: 300, payloadGTO: 0, payloadSSO: 200,
    fairing: fairingSpec('electron', { sepAltitude: 105e3, color: '#111' }),
    stages: [
      stageSpec('e1', { color: '#111', accentColor: '#333' }),
      stageSpec('e2', { sepDelay: 1, ignitionDelay: 2, color: '#111' }),
      stageSpec('curie', { restartable: true, sepDelay: 2, ignitionDelay: 3, color: '#222' }),
    ],
    sites: ['mahia', 'wallops'], maxQ: 50e3, maxAccel: 60,
    // Small and high T/W: it turns over quickly, which is why max-Q comes at about 65 s.
    guidanceDefaults: { kickAngle: 6, maxTurnRate: 0.45, pitchMax: 35, loftAltitude: 0 },
    notes: 'Small carbon-composite launcher with electric-pump Rutherford engines and a Curie kick stage.',
  },
  {
    id: 'starship', name: 'Starship (Super Heavy)', country: 'US', manufacturer: 'SpaceX',
    height: 123, payloadLEO: 100000, payloadGTO: 27000,
    fairing: null,
    stages: [
      stageSpec('superheavy', { color: '#a8a9ad', accentColor: '#3b3b3b', gridFins: true }),
      stageSpec('ship', { restartable: true, sepDelay: 0, ignitionDelay: 0, color: '#a8a9ad', accentColor: '#1c1c1c', flaps: true }),
    ],
    sites: ['starbase', 'cape'], maxQ: 35e3, maxAccel: 40,
    maxQThrottle: { qStart: 25e3, qEnd: 25e3, throttle: 0.8 },
    // Flown back to the tower's arms Super Heavy keeps 11 %: 9 % is the least
    // the arms catch it with (point-mass, 15.6 t to a 500 km orbit), 11 %
    // arrives with 72 t to spare.
    recoverable: true, recoveryReserve: 0.07, returnReserve: 0.11, crewCapable: true,
    // Very high T/W and a hot-staged ship; a shallow kick keeps max-Q inside the 35 kPa placard.
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    notes: 'Fully reusable two-stage methalox system; hot-staged ship, integrated payload bay (no fairing).',
  },
  // ------------------------------------------------------------ C01: history
  {
    // The rocket that launched Sputnik-1 on 4 October 1957 from Site 1: the
    // R-7 ICBM lightened for the job, four strap-ons and the core, nothing
    // above it. The core itself went into orbit, 7.5 t of it, with PS-1 on its
    // nose. 267 t at lift-off; boosters 43 t each, the core 97.5 t (90 t of it propellant: the load that puts it on the
    // 215 × 939 km orbit it reached, 270 t in all against the 267 t quoted).
    // http://www.astronautix.com/s/sputnik8k71ps.html
    id: 'sputnik8k71ps', name: 'Sputnik (R-7 8K71PS)', country: 'SU', manufacturer: 'OKB-1 (Korolev)',
    height: 29.2, payloadLEO: 500, payloadGTO: 0,
    // PS-1's conical nose shroud, dropped when the core reached orbit.
    fairing: fairingSpec('sputnik8k71ps', { sepAltitude: 120e3, color: '#d9d9d2' }),
    stages: [
      stageSpec('blokA-8k71ps', {
        color: '#c9c7bd', accentColor: '#5a6b4c', profile: 'r7Core',
        boosters: [boosterSpec('blokBVGD-8k71ps', 4, { sepDelay: 1, conicalTop: true, color: '#c9c7bd' })],
      }),
    ],
    sites: ['baikonur'], maxQ: 45e3, maxAccel: 70,
    guidanceDefaults: { kickAngle: 3, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    // As a rigid body the 4° kick of Soyuz-2.1a leaves the one-stage stack
    // at 211 × 771 km; 5° puts it on the 215 × 939 km orbit (measured, calm).
    guidanceDefaultsSixDof: { pitchOverAltitude: 50, kickAngle: 5, kickDuration: 12, maxTurnRate: 0.5 },
    notes: 'Sputnik-1, 4 October 1957: the R-7 with no upper stage, its core flown into a 215 × 939 km orbit.',
  },
  {
    // Vostok-1, 12 April 1961, Site 1: the R-7 with Blok E on top, which put
    // Gagarin's 4.7 t Vostok 3KA straight into a 181 × 327 km orbit. 287 t at
    // lift-off. Blok E: 1.44 t dry, 7.78 t of propellant, RD-0109.
    // http://www.astronautix.com/v/vostok8k72k.html
    id: 'vostok8k72k', name: 'Vostok-K (8K72K)', country: 'SU', manufacturer: 'OKB-1 (Korolev)',
    height: 38.4, payloadLEO: 4730, payloadGTO: 0,
    // The shroud over the spacecraft's instrument section, dropped at T+156 s.
    fairing: fairingSpec('vostok8k72k', { sepAltitude: 100e3, sepTime: 156, color: '#d9d9d2' }),
    stages: [
      stageSpec('blokA-8k72k', {
        color: '#c9c7bd', accentColor: '#5a6b4c', profile: 'r7Core',
        boosters: [boosterSpec('blokBVGD-8k72k', 4, { sepDelay: 1, conicalTop: true, color: '#c9c7bd' })],
      }),
      stageSpec('blokE', { sepDelay: 0, ignitionDelay: 0, color: '#c9c7bd', profile: 'r7Upper' }),
    ],
    sites: ['baikonur'], maxQ: 45e3, maxAccel: 70,
    guidanceDefaults: { kickAngle: 3, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    guidanceDefaultsSixDof: { pitchOverAltitude: 50, kickAngle: 4, kickDuration: 12, maxTurnRate: 0.5 },
    notes: 'Vostok-1, 12 April 1961: the R-7 with Blok E, inserting Vostok 3KA directly into a 181 × 327 km orbit.',
  },
  {
    // Saturn V SA-506, Apollo 11, 16 July 1969, LC-39A: 2 938 t at lift-off.
    // S-IC 135 t dry + 2 145 t; S-II 40 t dry (with its aft interstage) +
    // 443 t; S-IVB 15.3 t dry (with the instrument unit) + 109 t. The S-IVB
    // put the stack into a 186 km parking orbit and relit for the
    // translunar injection. 118 t to a 185 km orbit.
    // https://en.wikipedia.org/wiki/Saturn_V , AS-506 flight evaluation report
    id: 'saturnv', name: 'Saturn V', country: 'US', manufacturer: 'Boeing / North American / Douglas (NASA MSFC)',
    height: 110.6, payloadLEO: 118000, payloadGTO: 0,
    // No fairing: the lunar module rides inside the spacecraft-LM adapter,
    // part of the payload. The 4.2 t escape tower, dropped at T+197 s, is not
    // modelled (a fairing narrower than the S-II below it is not a shape this
    // model takes).
    fairing: null,
    stages: [
      stageSpec('sic', { fins: true, color: '#f4f4f4', accentColor: '#1a1a1a' }),
      stageSpec('sii', { sepDelay: 1, ignitionDelay: 2, color: '#f4f4f4', accentColor: '#1a1a1a' }),
      stageSpec('sivb', { restartable: true, sepDelay: 1, ignitionDelay: 3, color: '#f4f4f4', accentColor: '#1a1a1a' }),
    ],
    sites: ['ksc39a'], maxQ: 40e3, maxAccel: 45,
    crewCapable: true,
    guidanceDefaults: { kickAngle: 1.5, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    notes: 'Apollo 11, 16 July 1969: S-IC, S-II and a restartable S-IVB, which relit in orbit for the translunar injection.',
  },
];

// ── Roadmap C01: the vehicles of historical flights ─────────────────────────
// Kept apart from the fleet (`VEHICLES`): each is flown to the one flight it is
// here for and held to it (tests/historical-vehicles.test.ts), not put through
// the fleet's generic orbit matrix, which asks of a 1957 rocket what it never
// flew. The setup panel lists them after the fleet. Sources and the values
// taken where they disagree: docs/PHYSICS.md §13.6.
//
// The R-7s reuse the fleet's R-7 stage ids (`blokBVGD`, `blokA`): the same
// hardware family, drawn, laid out and flown as a rigid body the same way —
// four main chambers and two verniers on each strap-on, four and four on the
// core. Their 1957 and 1961 engines are older: the RD-107 and RD-108 below.

const kN = 1000;

/** RD-107 8D74PS and RD-108 8D75PS as flown on Sputnik 1 (Zak, russianspaceweb.com/sputnik_lv.html). */
const RD107_1957: EngineSpec = { name: 'RD-107 (8D74PS)', count: 1, thrustSL: 793 * kN, thrustVac: 975 * kN, ispSL: 247.6, ispVac: 304.2, minThrottle: 0.7 };
// The vacuum figures are Zak's; the sea level ones scale them by the ratio en.wikipedia gives (241 / 308 s).
const RD108_1957: EngineSpec = { name: 'RD-108 (8D75PS)', count: 1, thrustSL: 715 * kN, thrustVac: 914 * kN, ispSL: 237.2, ispVac: 303.1, minThrottle: 0.7 };
/** RD-107 8D74-1959 and RD-108 8D75-1959 as on Vostok-K (astronautix.com; en.wikipedia, Vostok-K). */
const RD107_1959: EngineSpec = { name: 'RD-107 (8D74-1959)', count: 1, thrustSL: 793 * kN, thrustVac: 970 * kN, ispSL: 256, ispVac: 313, minThrottle: 0.7 };
const RD108_1959: EngineSpec = { name: 'RD-108 (8D75-1959)', count: 1, thrustSL: 718 * kN, thrustVac: 912 * kN, ispSL: 248, ispVac: 315, minThrottle: 0.7 };
/** RD-0109 of Blok E (en.wikipedia RD-0109, Blok E): 54.52 kN, 323.5 s, no verniers. */
/** Rocketdyne A-7 of the Mercury-Redstone as flown on MR-3 (NASA TM X-53107, Table 8-1; vacuum thrust from thisdayinaviation.com). */
const A7_REDSTONE: EngineSpec = { name: 'Rocketdyne A-7', count: 1, thrustSL: 350.8 * kN, thrustVac: 395.9 * kN, ispSL: 214.8, ispVac: 242.4 };
/**
 * Saturn V AS-506 (Apollo 11), from the flight evaluation report MPR-SAT-FE-69-9
 * (FER) and NASA SP-4029. F-1: 6,719 kN and 264.5 s at sea level, the flight's
 * average (FER); its 304 s in vacuum (en.wikipedia) with the same flow, 2,590 kg/s.
 */
const F1_AS506: EngineSpec = { name: 'Rocketdyne F-1', count: 5, thrustSL: 6719 * kN, thrustVac: 7722 * kN, ispSL: 264.5, ispVac: 304 };
/**
 * The S-II's five J-2s at the high mixture ratio (5.5): 5,141.5 kN for the stage
 * and 423.2 s at ESC +61 s (FER §6.3). The J-2 never ran at sea level; its
 * sea-level pair is a placeholder (`vacuumOnly`).
 */
const J2_SII: EngineSpec = { name: 'Rocketdyne J-2', count: 5, thrustSL: 486 * kN, thrustVac: 1028.3 * kN, ispSL: 200, ispVac: 423.2, vacuumOnly: true };
/** The S-IVB's J-2, first burn: 901.2 kN, 428.7 s (FER). */
const J2_SIVB: EngineSpec = { name: 'Rocketdyne J-2', count: 1, thrustSL: 426 * kN, thrustVac: 901.2 * kN, ispSL: 200, ispVac: 428.7, vacuumOnly: true };
const RD0109: EngineSpec = { name: 'RD-0109', count: 1, thrustSL: 40 * kN, thrustVac: 54.52 * kN, ispSL: 240, ispVac: 323.5, vacuumOnly: true };

export const HISTORICAL_VEHICLES: VehicleSpec[] = [
  {
    id: 'r7sputnik', name: 'R-7 Sputnik (8K71PS)', country: 'SU', manufacturer: 'OKB-1',
    // 29.167 m (Zak; ru.wikipedia); the core 28.0 m under a 1.17 m nose cone over PS-1.
    height: 29.2, payloadLEO: 1327, payloadGTO: 0,
    // A small cone over PS-1, released with it at T+314.5 s (en.wikipedia,
    // Sputnik 1). Its base and mass are not published: sized to the core's
    // top and estimated.
    fairing: { mass: 40, diameter: 1.0, length: 1.17, sepAltitude: 150e3, sepTime: 314.5, color: '#d9d9d6' },
    stages: [
      // Zak: stage I 168.0 t with 153.2 t of propellant (38.3 t a block), the
      // core 99.1 t with 91.8 t — which burn out at 117 s and 298 s on these
      // engines, against 116.38 s and 295.4 s flown.
      { id: 'blokA', name: 'Blok A (core)', dryMass: 7300, propellantMass: 91800, engine: RD108_1957,
        diameter: 2.95, length: 28.0, color: '#d3d3cf', accentColor: '#6a6d70', profile: 'r7Core',
        boosters: [{ id: 'blokBVGD', name: 'Blok B/V/G/D boosters', count: 4, dryMass: 3700, propellantMass: 38300,
          engine: RD107_1957, diameter: 2.68, length: 19.2, sepDelay: 1, conicalTop: true, color: '#d3d3cf' }] },
    ],
    sites: ['baikonur'], maxQ: 45e3, maxAccel: 60,
    // With no upper stage the core's cut-off orbit is final, so the kick sets
    // the apogee: 3° leaves the point-mass flight 130 km short of the flown
    // 938 km, 4° reaches 214 × 937 km; the rigid body, Soyuz's 4°, only
    // 208 × 424 km, and 5° 214 × 949 km.
    guidanceDefaults: { kickAngle: 4, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    guidanceDefaultsSixDof: { pitchOverAltitude: 50, kickAngle: 5, kickDuration: 12, maxTurnRate: 0.5 },
    notes: 'The R-7 that launched Sputnik 1: four strap-ons and the core, no upper stage — the core itself reached orbit.',
  },
  {
    id: 'vostokk', name: 'Vostok-K (8K72K)', country: 'SU', manufacturer: 'OKB-1',
    // 38.36 m (ru.wikipedia; Zak), 287 t at liftoff.
    height: 38.4, payloadLEO: 4725, payloadGTO: 0,
    // The shroud over Vostok 3KA, 0.8 t and 2.7 m across (Zak), off at
    // T+156 s (ESA, *The flight of Vostok 1*). Its length is the head of the
    // 38.36 m stack less Blok A and Blok E: estimated.
    fairing: { mass: 800, diameter: 2.7, length: 6.8, sepAltitude: 70e3, sepTime: 156, color: '#d9d9d6' },
    stages: [
      // astronautix: strap-ons 43.3 t (3.71 t dry), the core 100.4 t (6.8 t dry)
      { id: 'blokA', name: 'Blok A (core)', dryMass: 6800, propellantMass: 93600, engine: RD108_1959,
        diameter: 2.95, length: 28.75, color: '#d3d3cf', accentColor: '#6a6d70', profile: 'r7Core',
        boosters: [{ id: 'blokBVGD', name: 'Blok B/V/G/D boosters', count: 4, dryMass: 3710, propellantMass: 39590,
          engine: RD107_1959, diameter: 2.68, length: 19.8, sepDelay: 1, conicalTop: true, color: '#d3d3cf' }] },
      // Blok E: 7,775 kg, 1,440 kg dry (astronautix), 2.84 × 2.56 m; lit
      // through the truss before Blok A is let go.
      { id: 'blokE1961', name: 'Blok E (RD-0109)', dryMass: 1440, propellantMass: 6335, engine: RD0109,
        diameter: 2.56, length: 2.84, sepDelay: 0, ignitionDelay: 0, color: '#d3d3cf' },
    ],
    sites: ['baikonur'], maxQ: 45e3, maxAccel: 60,
    crewCapable: true,
    guidanceDefaults: { kickAngle: 3, maxTurnRate: 0.3, pitchMax: 35, loftAltitude: 0 },
    guidanceDefaultsSixDof: { pitchOverAltitude: 50, kickAngle: 4, kickDuration: 12, maxTurnRate: 0.5 },
    notes: 'The R-7 that flew Gagarin: the Sputnik core and strap-ons with Blok E, a small third stage hot-staged through a truss.',
  },
  {
    id: 'mercuryredstone', name: 'Mercury-Redstone (MRLV)', country: 'US', manufacturer: 'Chrysler / ABMA',
    // 83.38 ft (25.41 m) with the capsule and its tower; the booster 59.0 ft,
    // 70 in across (NASA TM X-53107, *The Mercury-Redstone Project*, 1964).
    height: 25.4, payloadLEO: 0, payloadGTO: 0,
    // no fairing: the capsule and its escape tower are the nose
    fairing: null,
    stages: [
      // MR-3's booster: 29,982 kg at liftoff with Freedom 7 (1,832.6 kg), 3,717 kg
      // dry (TM X-53107, Table 8-1 and §4.2.1), so 24,432 kg of alcohol, LOX,
      // peroxide and residuals. The A-7 as flown on MR-3: 78,860 lbf, 214.8 s at
      // sea level (Table 8-1); 89,000 lbf in vacuum (thisdayinaviation), 242.4 s
      // from the same flow. Graphite jet vanes and air rudders on its four fins.
      { id: 'redstone', name: 'Redstone (A-7)', dryMass: 3717, propellantMass: 24432, engine: A7_REDSTONE,
        diameter: 1.778, length: 17.98, fins: true, color: '#f0f0ee', accentColor: '#1d1d1f' },
    ],
    sites: ['cape'], maxQ: 45e3, maxAccel: 80,
    crewCapable: true,
    guidanceDefaults: { kickAngle: 3, maxTurnRate: 0.34, pitchMax: 50, loftAltitude: 0 },
    guidanceDefaultsSixDof: { pitchOverAltitude: 50, kickAngle: 3, kickDuration: 12, maxTurnRate: 0.34 },
    notes: 'The Redstone missile lengthened for the Mercury capsule: one alcohol/LOX engine, jet vanes and fins, 141 s of burn — enough to throw a capsule 187 km up and 487 km down range.',
  },
  {
    id: 'saturnv506', name: 'Saturn V (AS-506)', country: 'US', manufacturer: 'Boeing / North American / Douglas / IBM',
    // 110.6 m with the Apollo spacecraft and its escape tower (SP-4029).
    height: 110.6, payloadLEO: 140000, payloadGTO: 0,
    // no fairing: the Apollo spacecraft, its adapter and the escape tower are the nose
    fairing: null,
    stages: [
      // S-IC (FER Table 20-9, SP-4029 Table 23): 130,423 kg dry, 2,145,798 kg of
      // RP-1 and LOX, 2,468 kg of other fluids; the interstage's small ring (614 kg)
      // stays with it, and 28.4 t of propellant was left at the separation — all
      // carried here as dry mass. The propellant is what the five F-1s burn from
      // ignition, 2.5 s before liftoff here, to the LOX running out at T+161.63 s,
      // the centre engine shut down at T+135.20 s to hold the acceleration under 4 g.
      { id: 'sic506', name: 'S-IC', dryMass: 152250, propellantMass: 2053900, engine: F1_AS506,
        diameter: 10.06, length: 42.06, fins: true, color: '#f2f2ef', accentColor: '#121214', nozzleLength: 5.8,
        engineEvents: [{ t: 137.7, shutdown: [4] }] },
      // S-II: 36,158 kg dry, 443,236 kg of LOX and LH2, 572 kg other; the S-II/S-IVB
      // interstage (3,663 kg) goes with it, and the S-IC/S-II aft interstage ring
      // (3,982 kg, with its 609 kg of spent ullage-motor propellant) until it is
      // dropped 30 s into the burn (T+192.3 s, "second-plane separation"); 3.3 t
      // left at the cut-off. Engine start command 0.74 s after the separation
      // (T+163.04 s); the centre engine off at ESC +297.58 s against pogo; the
      // mixture ratio shifted to 4.3 at about ESC +335 s: 3,082.8 kN on four
      // engines (FER §6.3), at 427 s (the J-2's rating at that ratio; estimated).
      { id: 'sii506', name: 'S-II', dryMass: 45654, propellantMass: 442530, engine: J2_SII,
        diameter: 10.06, length: 24.84, color: '#f2f2ef', accentColor: '#121214', nozzleLength: 3.4, sepDelay: 0.67, ignitionDelay: 0.74,
        engineEvents: [{ t: 297.58, shutdown: [4] }, { t: 335, mixture: { thrustVac: 770.7 * kN, thrustSL: 364 * kN, ispVac: 427, ispSL: 200 } }],
        // the aft interstage ring, then the escape tower (T+197.9 s)
        jettisons: [{ t: 29.26, mass: 4591, part: 'interstage' }, { t: 34.86, mass: 4042, part: 'tower' }] },
      // S-IVB with the instrument unit: 11,273 kg dry, 751 kg other, IU 1,939 kg;
      // 107,095 kg of LOX and LH2, of which the two burns use 105.3 t (FER). Start
      // command 3.2 s after the separation (T+552.2 s). Restarts for the
      // translunar injection.
      { id: 'sivb506', name: 'S-IVB', dryMass: 15758, propellantMass: 105300, engine: J2_SIVB, restartable: true,
        diameter: 6.604, length: 18.77, color: '#f2f2ef', accentColor: '#121214', nozzleLength: 3.4, sepDelay: 0.78, ignitionDelay: 3.2 },
    ],
    sites: ['ksc39a'], maxQ: 45e3, maxAccel: 40,
    crewCapable: true,
    guidanceDefaults: { kickAngle: 3, maxTurnRate: 0.5, pitchMax: 40, loftAltitude: 0, closedLoopStart: 204.1 },
    targetPlane: true,
    guidanceDefaultsSixDof: { pitchOverAltitude: 50, kickAngle: 3, kickDuration: 12, maxTurnRate: 0.5 },
    notes: 'The Moon rocket: five F-1s, five J-2s and one restartable J-2 on three stages, 2,938 t at ignition. Apollo 11\'s flew on 16 July 1969.',
  },
];

/** The fleet and the historical vehicles together: everything a mission can name. */
export const ALL_VEHICLES: readonly VehicleSpec[] = [...VEHICLES, ...HISTORICAL_VEHICLES];

export const vehicleById = (id: string): VehicleSpec => {
  const v = ALL_VEHICLES.find((x) => x.id === id);
  if (!v) throw new Error(`Unknown vehicle ${id}`);
  return v;
};

/** A vehicle of the catalogue above, the fleet or the historical ones (as against a custom one, roadmap S02). */
export const isCatalogueVehicle = (id: string): boolean => ALL_VEHICLES.some((x) => x.id === id);

/**
 * The vehicle a mission flies (roadmap S02): its inline spec when it carries a
 * custom vehicle, else the catalogue's. The one way to resolve a mission's
 * vehicle — the simulation, the flight worker, the auto-tuner and the Monte
 * Carlo workers (which get the spec inside the config they are sent), the
 * setup panel and WebMCP all come through here.
 */
export function missionVehicle(cfg: { vehicleId: string; vehicleSpec?: VehicleSpec }): VehicleSpec {
  if (!cfg.vehicleSpec) return vehicleById(cfg.vehicleId);
  if (cfg.vehicleSpec.id !== cfg.vehicleId) throw new Error(`The mission's vehicle ${cfg.vehicleId} is not its custom vehicle ${cfg.vehicleSpec.id}`);
  return cfg.vehicleSpec;
}

/**
 * The id a vehicle's id-keyed data are looked up by (roadmap S02): its own,
 * or, for a custom vehicle made from a catalogue one, that vehicle's
 * (`VehicleSpec.derivedFrom`). A custom vehicle with no origin keys nothing
 * and gets the generic behaviour.
 */
export const vehicleDataId = (spec: VehicleSpec): string => spec.derivedFrom ?? spec.id;

/**
 * The vehicle as a mission flies it with its payload: the vehicle's own, except
 * that a payload flown in the open (Crew Dragon) takes the fairing's place, so
 * the fairing is left off and the payload's own shape is the nose (roadmap C01).
 */
export function openTopVehicle(v: VehicleSpec, sat: Pick<SatelliteSpec, 'exposed'>): VehicleSpec {
  if (!sat.exposed) return v;
  // one object per combination, so caches keyed by the spec (`stackLayout`) keep hitting
  const { diameter, length, noseLength } = sat.exposed;
  const key = `${diameter}|${length}|${noseLength}`;
  let byShape = OPEN_TOP.get(v);
  if (!byShape) OPEN_TOP.set(v, byShape = new Map());
  let open = byShape.get(key);
  if (!open) byShape.set(key, open = { ...v, fairing: null, exposedPayload: { diameter, length, noseLength } });
  return open;
}
const OPEN_TOP = new WeakMap<VehicleSpec, Map<string, VehicleSpec>>();
