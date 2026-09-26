/**
 * Published flight data the simulator is compared with (docs/VALIDATION.md).
 *
 * Every number below is copied from a named source; none is fitted, estimated
 * or rounded to suit the model. Where a value was derived from a source (for
 * example "the first time the webcast speed reaches its plateau") the
 * derivation is written next to it, and docs/VALIDATION.md repeats it.
 *
 * Falcon 9: webcast telemetry transcribed frame by frame (30 fps) from SpaceX's
 * launch webcasts and published in github.com/shahar603/Telemetry-Data, read
 * at commit b245d3b81aa36b7941ec10f3f4b508999d106a6d (24 January 2020). The
 * speed on a SpaceX webcast is relative to the rotating Earth, and it is
 * compared with the simulator's air-relative speed `vAir` (the same thing in a
 * calm atmosphere). The webcast shows altitude in whole kilometres and speed in
 * whole km/h, and the events file rounds each event to the nearest second.
 */
import type { SimMission } from './flight-harness';

/** One point of a webcast trace. */
export interface TracePoint {
  /** s after liftoff */
  t: number;
  /** m */
  alt: number;
  /** m/s, relative to the rotating Earth */
  v: number;
}

export interface Falcon9Reference {
  id: string;
  /** the mission's name in the data set (its folder name) */
  name: string;
  date: string;
  /** what the flight carried and how the booster came back, with where each fact comes from */
  notes: string;
  mission: SimMission;
  /** events.json: webcast "Max Q" callout, s */
  maxQ: number;
  /** events.json: first-stage engine cut-off, s */
  meco: number;
  /** events.json: second-stage ignition, s (absent where the file does not give it) */
  ses1?: number;
  /** the trace at T+60/100/140 s, from the raw file */
  trace: TracePoint[];
  /** the trace at `meco` */
  atMeco: TracePoint;
  /**
   * Second-stage cut-off into the parking orbit: the first sample of the raw
   * file at which the speed reaches (to within 1 m/s) its maximum before T+700 s.
   * Only given where the ascent the model flies ends at a comparable parking
   * orbit (see VALIDATION.md for the missions left out and why).
   */
  seco1?: TracePoint;
}

const DATASET = 'github.com/shahar603/Telemetry-Data @ b245d3b';
export const FALCON9_DATASET = DATASET;

/**
 * Launch time handed to the simulator. Every mission below uses a free
 * orbital plane, so the date only fixes the Sun and the Earth's angle, neither
 * of which the ascent depends on.
 */
const LAUNCH = new Date('2026-09-22T18:00:00Z');

export const FALCON9_REFERENCES: readonly Falcon9Reference[] = [
  {
    id: 'crs16', name: 'SpaceX CRS-16', date: '2018-12-05',
    notes: 'Cargo Dragon to the ISS from SLC-40, booster flown back to LZ-1 (RTLS). Payload = 2 573 kg of cargo (data set README) '
      + '+ 4 200 kg Dragon dry mass (Wikipedia, "SpaceX CRS-16"); Dragon\'s own propellant is not published and is left out.',
    mission: {
      vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'crew', orbitId: 'iss', orbit: { raanMode: 'free' },
      payloadMass: 2573 + 4200, recoveryPlan: { core: { kind: 'landingZone', zoneId: 'lz1' } }, launchTime: LAUNCH,
    },
    maxQ: 54, meco: 145, ses1: 156,
    trace: [{ t: 60, alt: 8.8e3, v: 318 }, { t: 100, alt: 27.1e3, v: 723 }, { t: 140, alt: 61.4e3, v: 1516 }],
    atMeco: { t: 145, alt: 66.9e3, v: 1624 },
    seco1: { t: 535.6, alt: 207e3, v: 7538 },
  },
  {
    id: 'ssoA', name: 'SSO-A', date: '2018-12-03',
    notes: 'Spaceflight SSO-A rideshare, 64 spacecraft, to a ~575 km sun-synchronous orbit from SLC-4E (Spaceflight Industries, '
      + 'spaceflightservices.com/sso-a), booster to a drone ship (data set README: ASDS). Payload 4 000 kg (data set README).',
    mission: {
      vehicleId: 'falcon9', siteId: 'vandenberg', satelliteId: 'cubesats', orbitId: 'sso',
      orbit: { perigee: 575e3, apogee: 575e3, raanMode: 'free' },
      payloadMass: 4000, recoveryPlan: { core: { kind: 'droneShip' } }, launchTime: LAUNCH,
    },
    maxQ: 58, meco: 143, ses1: 154,
    trace: [{ t: 60, alt: 9.3e3, v: 355 }, { t: 100, alt: 29.8e3, v: 778 }, { t: 140, alt: 70.1e3, v: 1591 }],
    atMeco: { t: 143, alt: 74.2e3, v: 1642 },
    // A single burn straight to ~575 km, which the model does not fly (it
    // parks at 200 km first): no SECO comparison.
  },
  {
    id: 'iridium8', name: 'Iridium NEXT 8', date: '2019-01-11',
    notes: 'Ten Iridium NEXT satellites to a 625 km, 86° parking orbit from SLC-4E (Spaceflight Now, 11 January 2019), booster to a '
      + 'drone ship (data set README: ASDS). Payload 9 600 kg (data set README). Stage-1 trace from "stage1 raw.json", '
      + 'SECO-1 from "stage2 raw.json".',
    mission: {
      vehicleId: 'falcon9', siteId: 'vandenberg', satelliteId: 'cubesats', orbitId: 'custom',
      orbit: { perigee: 625e3, apogee: 625e3, inclination: 86, raanMode: 'free' },
      payloadMass: 9600, recoveryPlan: { core: { kind: 'droneShip' } }, launchTime: LAUNCH,
    },
    maxQ: 61, meco: 150,
    trace: [{ t: 60, alt: 9.0e3, v: 343 }, { t: 100, alt: 27.5e3, v: 773 }, { t: 140, alt: 58.7e3, v: 1621 }],
    atMeco: { t: 150, alt: 68.5e3, v: 1896 },
    seco1: { t: 531.2, alt: 183e3, v: 7911 },
  },
  {
    id: 'bangabandhu1', name: 'Bangabandhu-1', date: '2018-05-11',
    notes: 'First Falcon 9 Block 5, to GTO from LC-39A, booster to a drone ship (data set README). Payload 3 750 kg (data set '
      + 'README). The real transfer orbit was 300 × 35 706 km at 19.3° (Spaceflight Now); the model flies its standard GTO at the '
      + 'site latitude, which changes the second burn but not the first stage.',
    mission: {
      vehicleId: 'falcon9', siteId: 'ksc39a', satelliteId: 'comsat', orbitId: 'gto',
      payloadMass: 3750, recoveryPlan: { core: { kind: 'droneShip' } }, launchTime: LAUNCH,
    },
    maxQ: 74, meco: 152, ses1: 163,
    trace: [{ t: 60, alt: 8.9e3, v: 337 }, { t: 100, alt: 25.5e3, v: 874 }, { t: 140, alt: 53.5e3, v: 1901 }],
    atMeco: { t: 152, alt: 64.5e3, v: 2259 },
    seco1: { t: 501.8, alt: 164e3, v: 7490 },
  },
  {
    id: 'gps3sv01', name: 'GPS III SV01', date: '2018-12-23',
    notes: 'First GPS III satellite from SLC-40, booster expended (data set README: landing "No"). Payload 4 400 kg (data set '
      + 'README). The only expendable Block 5 flight in the data set, so the only one whose MECO measures the full first-stage burn.',
    mission: {
      vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'navigation', orbitId: 'gps',
      payloadMass: 4400, launchTime: LAUNCH,
    },
    maxQ: 63, meco: 168, ses1: 179,
    trace: [{ t: 60, alt: 9.0e3, v: 359 }, { t: 100, alt: 27.1e3, v: 836 }, { t: 140, alt: 56.3e3, v: 1763 }],
    atMeco: { t: 168, alt: 82.8e3, v: 2653 },
    seco1: { t: 500.8, alt: 168e3, v: 7852 },
  },
];

/**
 * The agreement the model is expected to reach, fixed before any comparison
 * was flown and justified in docs/VALIDATION.md ("Tolerances"):
 *
 * - times: ±10 %, and never tighter than ±3 s. The vehicle data are public
 *   figures good to about ±10 % (docs/PHYSICS.md §10), and a burn time is a
 *   propellant mass over a mass flow; the events file rounds to 1 s and the
 *   model's own event detection adds up to a step or two.
 * - speeds: ±10 % + 5 m/s, the same data uncertainty, plus the webcast's
 *   whole-km/h display and the transcription.
 * - altitudes: ±15 % + 1 km. Altitude is the integral of the vertical speed,
 *   so the same ±10 % in thrust-to-weight grows in it; the webcast shows whole
 *   kilometres.
 */
export const TOLERANCE = {
  time: (ref: number): number => Math.max(3, 0.10 * ref),
  speed: (ref: number): number => 0.10 * ref + 5,
  altitude: (ref: number): number => 0.15 * ref + 1e3,
} as const;

/**
 * Severity label only: a disagreement of more than three tolerances is marked
 * "gross" in the report and in docs/VALIDATION.md. It is not a separate
 * pass/fail bound — every disagreement, gross or not, is pinned by name in the
 * tests, so any change to the set fails.
 */
export const GROSS_FACTOR = 3;

/**
 * One milestone of a published timeline. `event` names the simulator event it
 * is compared with; `nth` picks the n-th occurrence (1-based) where a key
 * repeats (the first `evt.stageSep` is the core's, the second the upper
 * stage's), and `afterEvent` takes the first occurrence after another event
 * (the second stage's `evt.ignition` after `evt.meco`).
 */
export interface TimelineMilestone {
  id: string;
  label: string;
  event: string;
  nth?: number;
  afterEvent?: string;
  /** s after liftoff */
  t: number;
  /** m, where the source gives it */
  alt?: number;
  /**
   * m/s, where the source gives it. Graded only when the source states its
   * frame (`vFrame`): most of these sources do not say whether their speed is
   * inertial or relative to the Earth, and at the Soyuz's staging the two
   * differ by ~0.3 km/s — more than the tolerance — so grading an unstated one
   * would mean choosing the frame after the fact.
   */
  v?: number;
  /** the frame the source states its speed in; absent, the speed is reported, not graded */
  vFrame?: 'inertial';
}

export interface TimelineReference {
  id: string;
  name: string;
  date: string;
  /** where each number comes from, and whether it is flown or planned */
  sources: string;
  mission: SimMission;
  milestones: TimelineMilestone[];
  /** the initial orbit, where the source gives it, m */
  insertion?: { perigee: number; apogee: number };
  /** s to keep flying after the first upper-stage cut-off, for a milestone that comes later (default 10) */
  after?: number;
}

/**
 * Soyuz MS-25, 23 March 2024, Baikonur Site 31 to the ISS. Every time is the
 * as-flown value (to 0.01 s) from Anatoly Zak, russianspaceweb.com/soyuz-ms-25.html,
 * which quotes Roskosmos; the spacecraft mass (~7 152 kg) and the 200.0 × 242.0 km
 * initial orbit are from the same page. The altitudes (45 / 79 / 157 km) are the
 * nominal profile that page repeats for every crewed flight since MS-16, not a
 * measurement of this one. The other crewed flights on the same site
 * (MS-21, -23, -24, -26) agree with these times to within 0.5 s.
 */
export const SOYUZ_MS25: TimelineReference = {
  id: 'soyuzMs25', name: 'Soyuz MS-25', date: '2024-03-23',
  sources: 'russianspaceweb.com/soyuz-ms-25.html (secondary, quoting Roskosmos); flown times, nominal altitudes',
  mission: {
    vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', orbitId: 'iss', orbit: { raanMode: 'free' },
    payloadMass: 7152, launchTime: new Date('2026-09-22T18:00:00Z'),
  },
  milestones: [
    { id: 'boosterSep', label: 'strap-on separation', event: 'evt.boosterSep', t: 117.8 },
    // The model flies Soyuz's fairing on a fixed 157 s (`fairing.sepTime`,
    // PHYSICS.md §4), so this row agrees or not by construction; its
    // altitude is still a genuine comparison.
    { id: 'fairing', label: 'fairing jettison', event: 'evt.fairingSep', t: 153.33, alt: 79e3, v: 2200 },
    { id: 'coreSep', label: 'core (Blok A) separation', event: 'evt.stageSep', nth: 1, t: 287.70, alt: 157e3, v: 3800 },
    { id: 'seco', label: 'third-stage cut-off', event: 'evt.seco', t: 525.93 },
    { id: 'payloadSep', label: 'spacecraft separation', event: 'evt.payloadSep', t: 529.229 },
  ],
  insertion: { perigee: 200.0e3, apogee: 242.0e3 },
};

/**
 * Electron "No Time Toulouse", 20 June 2024, LC-1 Mahia: five Kinéis
 * satellites to 635 km at 98°. Times, orbit and inclination from Rocket Lab's
 * press kit (rocketlabcorp.com/assets/Uploads/No-Time-Toulouse-Press-Kit.pdf):
 * a pre-flight *planned* timeline, primary source. Payload 150 kg from Kinéis
 * ("each of the 5 launches will carry just 150kg of payload",
 * kineis.com/en/nanosatellites-kineis-size-doesnt-matter/).
 */
export const ELECTRON_NTT: TimelineReference = {
  id: 'electronNtt', name: 'Electron "No Time Toulouse"', date: '2024-06-20',
  sources: 'Rocket Lab press kit (primary, planned timeline); Kinéis (payload)',
  mission: {
    vehicleId: 'electron', siteId: 'mahia', satelliteId: 'cubesats', orbitId: 'custom',
    orbit: { perigee: 635e3, apogee: 635e3, inclination: 98, raanMode: 'free' },
    payloadMass: 150, launchTime: new Date('2026-09-22T18:00:00Z'),
  },
  milestones: [
    { id: 'meco', label: 'MECO', event: 'evt.meco', t: 144 },
    { id: 'stageSep', label: 'stage separation', event: 'evt.stageSep', nth: 1, t: 148 },
    { id: 'ses1', label: 'second-stage ignition', event: 'evt.ignition', afterEvent: 'evt.meco', t: 151 },
    { id: 'fairing', label: 'fairing separation', event: 'evt.fairingSep', t: 187 },
    { id: 'seco', label: 'SECO', event: 'evt.seco', t: 538 },
    { id: 'kickSep', label: 'kick stage separation', event: 'evt.stageSep', nth: 2, t: 542 },
  ],
};

/**
 * Ariane 64 VA267 (Amazon Leo LE-01), 12 February 2026, Kourou: 32 satellites,
 * "a total payload of approximately 20 tons", to ~465 km. Times and altitudes
 * from the "Flight sequence" page of the launch kit
 * (ariane.group/app/uploads/2026/02/LAUNCH-KIT-VA267-EN_FINAL.pdf): a planned
 * timeline, primary source. The kit gives no inclination; 51.9° is from
 * NASASpaceflight's launch report (nasaspaceflight.com/2026/02/le-01-launch/).
 */
export const ARIANE64_VA267: TimelineReference = {
  id: 'ariane64Va267', name: 'Ariane 64 VA267', date: '2026-02-12',
  sources: 'Arianespace launch kit (primary, planned timeline); NASASpaceflight (inclination)',
  mission: {
    vehicleId: 'ariane64', siteId: 'kourou', satelliteId: 'starlink', orbitId: 'custom',
    orbit: { perigee: 465e3, apogee: 465e3, inclination: 51.9, raanMode: 'free' },
    payloadMass: 20000, launchTime: new Date('2026-09-22T18:00:00Z'),
  },
  milestones: [
    { id: 'boosterSep', label: 'P120C separation', event: 'evt.boosterSep', t: 145, alt: 87e3 },
    { id: 'fairing', label: 'fairing separation', event: 'evt.fairingSep', t: 191, alt: 127e3 },
    { id: 'coreSep', label: 'main-stage separation', event: 'evt.stageSep', nth: 1, t: 463, alt: 265e3 },
    { id: 'vinci', label: 'Vinci first ignition', event: 'evt.ignition', afterEvent: 'evt.meco', t: 472, alt: 269e3 },
  ],
};

/**
 * Atlas V 551, Juno, 5 August 2011, SLC-41. Times from ULA's mission booklet
 * (ulalaunch.com/docs/default-source/news-items/av_juno_mob.pdf), a planned
 * sequence, primary. Juno's 3 625 kg launch mass is from Wikipedia
 * (secondary); it went to Earth escape, which the model does not fly, so the
 * stack flies its standard GTO from SLC-40 (1 km away): the first stage and
 * the strap-ons do not depend on it.
 */
export const ATLASV_JUNO: TimelineReference = {
  id: 'atlasJuno', name: 'Atlas V 551 Juno', date: '2011-08-05',
  sources: 'ULA mission booklet (primary, planned); Wikipedia (payload mass)',
  mission: { vehicleId: 'atlasv551', siteId: 'cape', satelliteId: 'science', orbitId: 'gto', payloadMass: 3625, launchTime: LAUNCH },
  milestones: [
    { id: 'maxQ', label: 'max Q', event: 'evt.maxQ', t: 46.4 },
    { id: 'srbSep', label: 'SRB jettison', event: 'evt.boosterSep', t: 104.0 },
    { id: 'fairing', label: 'payload fairing jettison', event: 'evt.fairingSep', t: 204.9 },
    { id: 'beco', label: 'BECO', event: 'evt.meco', t: 267.2 },
    { id: 'sep', label: 'Atlas/Centaur separation', event: 'evt.stageSep', nth: 1, t: 273.2 },
    { id: 'mes1', label: 'Centaur first ignition (MES-1)', event: 'evt.ignition', afterEvent: 'evt.meco', t: 283.2 },
  ],
};

/**
 * PSLV-XL C52 / EOS-04, 14 February 2022, First Launch Pad: 1 710 kg EOS-04 +
 * 17.5 kg INS-2TD + 8.1 kg INSPIREsat-1 to 529 km at 97.514°. Times, altitudes
 * and INERTIAL velocities from ISRO's mission brochure
 * (isro.gov.in/media_isro/pdf/Missions/pslv-c52-eos-04-v4.pdf), a planned
 * "typical flight profile", primary. The date is from Wikipedia.
 */
export const PSLV_C52: TimelineReference = {
  id: 'pslvC52', name: 'PSLV-XL C52 / EOS-04', date: '2022-02-14',
  sources: 'ISRO mission brochure (primary, planned; velocities inertial)',
  mission: { vehicleId: 'pslvxl', siteId: 'sriharikota', satelliteId: 'earthObs', orbitId: 'custom',
    orbit: { perigee: 529e3, apogee: 529e3, inclination: 97.514, raanMode: 'free' }, payloadMass: 1710 + 17.5 + 8.1, launchTime: LAUNCH },
  milestones: [
    { id: 'glSep', label: 'ground-lit PSOM-XL separation', event: 'evt.boosterSep', nth: 1, t: 69.9, alt: 26.943e3, v: 1304.2, vFrame: 'inertial' },
    { id: 'alSep', label: 'air-lit PSOM-XL separation', event: 'evt.boosterSep', nth: 2, t: 92.0, alt: 47.956e3, v: 1865.8, vFrame: 'inertial' },
    { id: 'ps1Sep', label: 'PS1 separation', event: 'evt.stageSep', nth: 1, t: 109.68, alt: 68.937e3, v: 2143.3, vFrame: 'inertial' },
    { id: 'ps2Ign', label: 'PS2 ignition', event: 'evt.ignition', afterEvent: 'evt.meco', t: 109.88 },
    { id: 'heatShield', label: 'heat shield separation', event: 'evt.fairingSep', t: 150.28, alt: 115.505e3, v: 2380.9, vFrame: 'inertial' },
    { id: 'ps2Sep', label: 'PS2 separation', event: 'evt.stageSep', nth: 2, t: 262.46, alt: 237.047e3, v: 4033.4, vFrame: 'inertial' },
    { id: 'ps3Sep', label: 'PS3 separation', event: 'evt.stageSep', nth: 3, t: 493.60, alt: 450.692e3, v: 5815.1, vFrame: 'inertial' },
    { id: 'ps4Cutoff', label: 'PS4 cut-off', event: 'evt.seco', t: 1020.36, alt: 533.967e3, v: 7592.0, vFrame: 'inertial' },
  ],
};

/**
 * H3-22S F3 / ALOS-4, 1 July 2024, Yoshinobu LP2: about 3 t to a 613 km,
 * 97.9° sun-synchronous orbit. Times and altitudes from JAXA's launch plan
 * (jaxa.jp/press/2024/04/files/20240426-1_01.pdf), planned, primary; its
 * speeds (km/s, frame not stated) are reported only.
 */
export const H3_F3: TimelineReference = {
  id: 'h3F3', name: 'H3-22S F3 / ALOS-4', date: '2024-07-01',
  sources: 'JAXA launch plan (primary, planned)',
  mission: { vehicleId: 'h3', siteId: 'tanegashima', satelliteId: 'earthObs', orbitId: 'custom',
    orbit: { perigee: 613e3, apogee: 613e3, inclination: 97.9, raanMode: 'free' }, payloadMass: 3000, launchTime: LAUNCH },
  milestones: [
    { id: 'srbSep', label: 'SRB-3 separation', event: 'evt.boosterSep', t: 116, alt: 44e3, v: 1500 },
    { id: 'fairing', label: 'fairing separation', event: 'evt.fairingSep', t: 210, alt: 120e3, v: 2100 },
    { id: 'meco', label: 'MECO', event: 'evt.meco', t: 303, alt: 278e3, v: 3600 },
    { id: 'stageSep', label: 'stage separation', event: 'evt.stageSep', nth: 1, t: 311, alt: 296e3, v: 3500 },
    { id: 'seli1', label: 'second-stage ignition', event: 'evt.ignition', afterEvent: 'evt.meco', t: 324, alt: 324e3, v: 3500 },
    { id: 'seco1', label: 'SECO-1', event: 'evt.seco', t: 985, alt: 613e3, v: 7500 },
  ],
};

/**
 * H-IIA 202 F50 / GOSAT-GW, 29 June 2025: about 2.6 t to 666 km at 97.03°.
 * AS-FLOWN times from the JAXA/MHI results report to MEXT
 * (mext.go.jp/content/20250703-mxt_uchukai01-000043486_000002.pdf), primary;
 * mass and orbit from the JAXA press kit. The model flies this fairing on a
 * fixed 250 s (`fairing.sepTime`), so that row is not independent.
 */
export const H2A_F50: TimelineReference = {
  id: 'h2aF50', name: 'H-IIA 202 F50 / GOSAT-GW', date: '2025-06-29',
  sources: 'JAXA/MHI flight results (primary, as flown); JAXA press kit (payload, orbit)',
  mission: { vehicleId: 'h2a202', siteId: 'tanegashima', satelliteId: 'earthObs', orbitId: 'custom',
    orbit: { perigee: 666e3, apogee: 666e3, inclination: 97.03, raanMode: 'free' }, payloadMass: 2600, launchTime: LAUNCH },
  milestones: [
    { id: 'srbSep', label: 'SRB-A separation', event: 'evt.boosterSep', t: 124 },
    { id: 'fairing', label: 'fairing separation', event: 'evt.fairingSep', t: 266 },
    { id: 'meco', label: 'MECO', event: 'evt.meco', t: 400 },
    { id: 'stageSep', label: 'stage separation', event: 'evt.stageSep', nth: 1, t: 408 },
    { id: 'seli', label: 'second-stage ignition', event: 'evt.ignition', afterEvent: 'evt.meco', t: 417 },
    { id: 'seco', label: 'SECO', event: 'evt.seco', t: 916 },
  ],
};

/**
 * Vega-C VV25 / Sentinel-1C, 5 December 2024, Kourou: 2 286 kg total to a
 * ~700 km, 98.19° sun-synchronous orbit. Times from the Arianespace/Avio
 * launch kit (newsroom.arianespace.com, VV25), planned, primary. The model
 * flies this fairing on a fixed 220 s (`fairing.sepTime`).
 */
export const VEGAC_VV25: TimelineReference = {
  id: 'vegaVV25', name: 'Vega-C VV25 / Sentinel-1C', date: '2024-12-05',
  sources: 'Arianespace/Avio launch kit (primary, planned)',
  mission: { vehicleId: 'vegac', siteId: 'kourou', satelliteId: 'earthObs', orbitId: 'custom',
    orbit: { perigee: 700e3, apogee: 700e3, inclination: 98.19, raanMode: 'free' }, payloadMass: 2286, launchTime: LAUNCH },
  milestones: [
    { id: 'p120Sep', label: 'P120C separation', event: 'evt.stageSep', nth: 1, t: 142 },
    { id: 'z40Sep', label: 'Zefiro 40 separation', event: 'evt.stageSep', nth: 2, t: 272 },
    { id: 'fairing', label: 'fairing separation', event: 'evt.fairingSep', t: 304 },
    { id: 'z9Sep', label: 'Zefiro 9 separation', event: 'evt.stageSep', nth: 3, t: 428 },
  ],
};

/**
 * Proton-M / Briz-M, Telstar 14R, 20 May 2011, Baikonur Pad 39: separated mass
 * ~5 000 kg, to GTO through a 173 km, 51.5° parking orbit. Ascent times from
 * ILS's mission overview (ilslaunch.com, T-14R), planned, primary; the date is
 * from Wikipedia.
 */
export const PROTON_T14R: TimelineReference = {
  id: 'protonT14R', name: 'Proton-M / Briz-M Telstar 14R', date: '2011-05-20',
  sources: 'ILS mission overview (primary, planned); Wikipedia (date)',
  mission: { vehicleId: 'protonm', siteId: 'baikonur', satelliteId: 'comsat', orbitId: 'gto', payloadMass: 5000, launchTime: LAUNCH },
  milestones: [
    { id: 'maxQ', label: 'max Q', event: 'evt.maxQ', t: 62 },
    { id: 'sep12', label: 'first/second stage separation', event: 'evt.stageSep', nth: 1, t: 120 },
    { id: 'sep23', label: 'second/third stage separation', event: 'evt.stageSep', nth: 2, t: 327 },
    { id: 'fairing', label: 'payload fairing jettison', event: 'evt.fairingSep', t: 347 },
    { id: 'sep3b', label: 'third stage / Briz-M separation', event: 'evt.stageSep', nth: 3, t: 582 },
  ],
};

/**
 * Falcon Heavy, Arabsat-6A, 11 April 2019, LC-39A: 6 465 kg to a 200 ×
 * 90 000 km, 23° transfer orbit. SpaceX's planned timeline as transcribed by
 * Spaceflight Now (spaceflightnow.com/2019/04/10/launch-timeline-for-falcon-
 * heavys-second-flight/), secondary. The model flies its standard GTO.
 */
export const FH_ARABSAT: TimelineReference = {
  id: 'fhArabsat', name: 'Falcon Heavy Arabsat-6A', date: '2019-04-11',
  sources: 'SpaceX timeline via Spaceflight Now (secondary, planned)',
  mission: { vehicleId: 'falconheavy', siteId: 'ksc39a', satelliteId: 'comsat', orbitId: 'gto', payloadMass: 6465, launchTime: LAUNCH,
    recoveryPlan: { core: { kind: 'droneShip' }, boosters: [{ kind: 'landingZone', zoneId: 'lz1' }, { kind: 'landingZone', zoneId: 'lz2' }] } },
  milestones: [
    { id: 'maxQ', label: 'max Q', event: 'evt.maxQ', t: 69 },
    { id: 'beco', label: 'BECO', event: 'evt.boosterBurnout', t: 150 },
    { id: 'boosterSep', label: 'side-booster separation', event: 'evt.boosterSep', t: 154 },
    { id: 'meco', label: 'MECO', event: 'evt.meco', t: 211 },
    { id: 'stageSep', label: 'stage separation', event: 'evt.stageSep', nth: 1, t: 215 },
    { id: 'ses1', label: 'second-stage ignition', event: 'evt.ignition', afterEvent: 'evt.meco', t: 222 },
    { id: 'fairing', label: 'fairing deploy', event: 'evt.fairingSep', t: 247 },
    { id: 'seco1', label: 'SECO-1', event: 'evt.seco', t: 528 },
  ],
};

/**
 * Angara-A5 / Briz-M flight 2, 14 December 2020, Plesetsk Site 35: a 2 406 kg
 * payload simulator. The planned timeline from Anatoly Zak's RussianSpaceWeb
 * (russianspaceweb.com/angara5-flight2.html), secondary; Spaceflight Now
 * confirms the Briz-M separation at T+12:28.
 */
export const ANGARA_F2: TimelineReference = {
  id: 'angaraF2', name: 'Angara-A5 flight 2', date: '2020-12-14',
  sources: 'RussianSpaceWeb (secondary, planned); Spaceflight Now (cross-check)',
  mission: { vehicleId: 'angaraa5', siteId: 'plesetsk', satelliteId: 'comsat', orbitId: 'gto', payloadMass: 2406, launchTime: LAUNCH },
  milestones: [
    { id: 'stage1Cutoff', label: 'first-stage (URM-1 boosters) cut-off', event: 'evt.boosterBurnout', t: 206 },
    { id: 'stage1Sep', label: 'first-stage separation', event: 'evt.boosterSep', t: 209 },
    { id: 'stage2Cutoff', label: 'second-stage (core) cut-off', event: 'evt.meco', t: 323 },
    { id: 'stage2Sep', label: 'second-stage separation', event: 'evt.stageSep', nth: 1, t: 326 },
    { id: 'stage3Ign', label: 'third-stage ignition', event: 'evt.ignition', afterEvent: 'evt.meco', t: 328 },
    { id: 'fairing', label: 'payload fairing jettison', event: 'evt.fairingSep', t: 340 },
    { id: 'stage3Cutoff', label: 'third-stage cut-off', event: 'evt.seco', t: 746 },
    { id: 'brizSep', label: 'Briz-M separation', event: 'evt.stageSep', nth: 2, t: 748 },
  ],
};

export const TIMELINE_REFERENCES: readonly TimelineReference[] = [SOYUZ_MS25, ELECTRON_NTT, ARIANE64_VA267,
  ATLASV_JUNO, PSLV_C52, H3_F3, H2A_F50, VEGAC_VV25, PROTON_T14R, FH_ARABSAT, ANGARA_F2];
