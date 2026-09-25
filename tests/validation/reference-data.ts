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
