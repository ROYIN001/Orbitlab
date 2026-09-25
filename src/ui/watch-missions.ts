/**
 * The launches offered in the viewer.
 *
 * A viewer with no background in spaceflight must never be handed a mission
 * that fails for a reason nobody explained to them, so every entry here is a
 * vehicle, site, payload and orbit that flies to orbit with the default
 * guidance — `tests/watch-missions.test.ts` flies each one to prove it — and
 * none of them uses a site whose range-safety corridor the chosen orbit leaves.
 * The exceptions are the three launch aborts (G06), each a failure that really
 * happened, explained as it happens, and each flown to its crew at rest.
 *
 * Like the quick-start missions these only build settings; they never launch.
 */
import type { ConfigInput } from '../config/validation';
import { assertConfigInput } from '../config/validation';
import { orbitById } from '../data/orbits';
import { siteById } from '../data/sites';
import { DEFAULT_FAILURE } from '../physics/defaults';
import { launchWindows } from '../physics/mission';
import type { FailureConfig, OrbitSpec, RecoveryPlan } from '../types';

export type WatchMissionId = 'soyuzIss' | 'falcon9Bandwagon' | 'starshipFlight5' | 'falconHeavyArabsat' | 'ariane6AmazonLeo' | 'electronSso'
  | 'soyuzMs10' | 'soyuzT10' | 'soyuz18a';

export interface WatchMission {
  id: WatchMissionId;
  vehicleId: string;
  siteId: string;
  satelliteId: string;
  orbitId: string;
  payloadMass: number;
  /** changes to the orbit preset for this launch */
  orbit?: Partial<OrbitSpec>;
  /** i18n key of the card title ("Soyuz to the space station") */
  titleKey: string;
  /** i18n key of the one-line card blurb */
  blurbKey: string;
  /**
   * i18n key of the payload as flown ("Bandwagon-1 (11 satellites)"): the
   * catalogue entry in `satelliteId` only supplies its model and shape.
   */
  payloadKey?: string;
  /** stages flown back, which turns booster recovery on */
  recoveryPlan?: RecoveryPlan;
  /** the failure the flight met, for the launch aborts (G06) */
  failure?: FailureConfig;
  /** the pad it flew from, when not the site's first (`SiteExtra.pads`) */
  padId?: string;
}

/**
 * A sun-synchronous orbit with its descending node at 10:30 local time — the
 * usual choice for Earth observation, and the one whose launch windows fall in
 * the morning. The preset's ascending node at 10:30 puts every window of a
 * southbound launch late in the evening, in the dark.
 */
const MORNING_SSO: Partial<OrbitSpec> = { ltan: 22.5 };

/**
 * Each launch as it was really flown, except the date: the viewer launches in
 * daylight at the pad (`daylightLaunchTime`), and the historical dates are
 * item C01's to replay.
 */
export const WATCH_MISSIONS: readonly WatchMission[] = [
  { id: 'soyuzIss', vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', orbitId: 'iss', payloadMass: 7150,
    titleKey: 'watch.mission.soyuzIss', blurbKey: 'watch.mission.soyuzIssBlurb' },
  // Bandwagon-1, 7 April 2024: eleven rideshare satellites, about 1.3 t, to
  // ~590 km at 45.4° from LC-39A, the first stage back to Landing Zone 1.
  { id: 'falcon9Bandwagon', vehicleId: 'falcon9', siteId: 'ksc39a', satelliteId: 'cubesats', orbitId: 'custom', payloadMass: 1300,
    orbit: { perigee: 590e3, apogee: 590e3, inclination: 45.4, raanMode: 'free' },
    recoveryPlan: { core: { kind: 'landingZone', zoneId: 'lz1' } },
    titleKey: 'watch.mission.falcon9Bandwagon', blurbKey: 'watch.mission.falcon9BandwagonBlurb', payloadKey: 'watch.payload.bandwagon' },
  // Flight 5, 13 October 2024: Super Heavy caught by the tower's arms, the
  // ship cut off on a 213 × −15 km path to a splashdown in the Indian Ocean.
  // It carried no payload.
  { id: 'starshipFlight5', vehicleId: 'starship', siteId: 'starbase', satelliteId: 'cubesats', orbitId: 'custom', payloadMass: 0,
    orbit: { perigee: -15e3, apogee: 213e3, inclination: 26.2, raanMode: 'free', suborbital: true },
    recoveryPlan: { core: { kind: 'landingZone', zoneId: 'olm' } },
    titleKey: 'watch.mission.starshipFlight5', blurbKey: 'watch.mission.starshipFlight5Blurb', payloadKey: 'watch.payload.flight5' },
  // Arabsat-6A, 11 April 2019: 6,465 kg to GTO from LC-39A, the side
  // boosters back to Landing Zones 1 and 2, the core to Of Course I Still
  // Love You.
  { id: 'falconHeavyArabsat', vehicleId: 'falconheavy', siteId: 'ksc39a', satelliteId: 'comsat', orbitId: 'gto', payloadMass: 6465,
    recoveryPlan: { core: { kind: 'droneShip' }, boosters: [{ kind: 'landingZone', zoneId: 'lz1' }, { kind: 'landingZone', zoneId: 'lz2' }] },
    titleKey: 'watch.mission.falconHeavyArabsat', blurbKey: 'watch.mission.falconHeavyArabsatBlurb', payloadKey: 'watch.payload.arabsat' },
  // VA267 / LE-01, 12 February 2026: 32 Amazon Leo satellites, about 20 t,
  // to 465 km at 51.9°. The Starlink stack stands in for their dispenser.
  { id: 'ariane6AmazonLeo', vehicleId: 'ariane64', siteId: 'kourou', satelliteId: 'starlink', orbitId: 'custom', payloadMass: 20000,
    orbit: { perigee: 465e3, apogee: 465e3, inclination: 51.9, raanMode: 'free' },
    titleKey: 'watch.mission.ariane6AmazonLeo', blurbKey: 'watch.mission.ariane6AmazonLeoBlurb', payloadKey: 'watch.payload.amazonLeo' },
  { id: 'electronSso', vehicleId: 'electron', siteId: 'mahia', satelliteId: 'cubesats', orbitId: 'sso', payloadMass: 150, orbit: MORNING_SSO,
    titleKey: 'watch.mission.electronSso', blurbKey: 'watch.mission.electronSsoBlurb' },
  // G06: three crews saved by the escape system, flown on the Soyuz-2.1a
  // (MS-10 flew a Soyuz-FG, T-10-1 a Soyuz-U, 18a the original Soyuz).
  // Soyuz MS-10, 11 October 2018: a strap-on struck the core at separation,
  // T+118.6 s; the fairing's motors pulled the crew away at T+121.6 s.
  { id: 'soyuzMs10', vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', orbitId: 'iss', payloadMass: 7150, padId: 'site1',
    failure: { mode: 'boosterCollision', time: 0, stage: 0 },
    titleKey: 'watch.mission.soyuzMs10', blurbKey: 'watch.mission.soyuzMs10Blurb', payloadKey: 'watch.payload.soyuzMs10' },
  // Soyuz T-10-1, 26 September 1983: a fire at the foot of the rocket on the
  // pad; the tower pulled the crew away seconds before it exploded.
  { id: 'soyuzT10', vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', orbitId: 'iss', payloadMass: 7150, padId: 'site1',
    failure: { mode: 'padFire', time: -6, stage: 0 },
    titleKey: 'watch.mission.soyuzT10', blurbKey: 'watch.mission.soyuzT10Blurb', payloadKey: 'watch.payload.soyuzT10' },
  // Soyuz 18a, 5 April 1975: the core and the upper stage parted only half
  // way at T+288.6 s; the spacecraft fell back from 192 km to the Altai.
  { id: 'soyuz18a', vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', orbitId: 'iss', payloadMass: 7150, padId: 'site1',
    failure: { mode: 'stagingFailure', time: 0, stage: 0 },
    titleKey: 'watch.mission.soyuz18a', blurbKey: 'watch.mission.soyuz18aBlurb', payloadKey: 'watch.payload.soyuz18a' },
];

/** The launch the home page's big button plays. */
export const FEATURED_WATCH_MISSION: WatchMissionId = 'soyuzIss';

export function watchMissionById(id: string): WatchMission | undefined {
  return WATCH_MISSIONS.find((m) => m.id === id);
}

export interface WatchMissionSettings extends ConfigInput { orbitId: string }

/** Approximate local solar time at a longitude, hours 0..24. */
export function localSolarHour(date: Date, longitudeDeg: number): number {
  const h = date.getUTCHours() + date.getUTCMinutes() / 60 + longitudeDeg / 15;
  return ((h % 24) + 24) % 24;
}

const DAY_START = 8;
const DAY_END = 16;
const isDaytime = (date: Date, longitudeDeg: number): boolean => {
  const h = localSolarHour(date, longitudeDeg);
  return h >= DAY_START && h <= DAY_END;
};

/**
 * A launch time the pad sees in daylight.
 *
 * The viewer is about the picture, and a night launch shows a plume in a black
 * frame. An orbit with a free node launches now if it is day at the pad, else
 * at the next 10:00 local solar time; an orbit whose plane is fixed (the space
 * station's, a sun-synchronous one) takes the first real launch window that
 * falls in the day, which can be a few weeks out — the date means nothing to
 * the viewer, the light does.
 */
export function daylightLaunchTime(orbit: OrbitSpec, siteId: string, from: Date): Date {
  const site = siteById(siteId);
  const start = new Date(from.getTime());
  start.setUTCSeconds(0, 0);
  if (orbit.raanMode === 'free') {
    if (isDaytime(start, site.longitude)) return start;
    const wait = (((10 - localSolarHour(start, site.longitude)) % 24) + 24) % 24;
    const t = new Date(start.getTime() + wait * 3600e3);
    t.setUTCSeconds(0, 0);
    return t;
  }
  const windows = launchWindows(orbit, site, start, 45);
  const day = windows.find((w) => isDaytime(w.time, site.longitude)) ?? windows[0];
  if (!day) throw new Error('No matching launch window was found');
  return new Date(day.time.getTime());
}

/** Mission settings for one viewer launch. */
export function watchMissionSettings(id: WatchMissionId, from: Date = new Date()): WatchMissionSettings {
  if (!Number.isFinite(from.getTime())) throw new Error('A viewer mission requires a valid date');
  const m = watchMissionById(id);
  if (!m) throw new Error(`Unknown viewer mission: ${id}`);
  const orbit = { ...orbitById(m.orbitId), ...m.orbit };
  const settings: WatchMissionSettings = {
    vehicleId: m.vehicleId, siteId: m.siteId, satelliteId: m.satelliteId, payloadMass: m.payloadMass,
    orbitId: m.orbitId, orbit, launchTime: daylightLaunchTime(orbit, m.siteId, from),
    guidanceOverrides: {}, failure: { ...(m.failure ?? DEFAULT_FAILURE) },
    boosterRecovery: !!m.recoveryPlan, recoveryPlan: m.recoveryPlan,
    ...(m.padId ? { padId: m.padId } : {}),
  };
  assertConfigInput(settings);
  return settings;
}
