/**
 * The launches offered in the viewer.
 *
 * A viewer with no background in spaceflight must never be handed a mission
 * that fails for a reason nobody explained to them, so every entry here is a
 * vehicle, site, payload and orbit that flies to orbit with the default
 * guidance — `tests/watch-missions.test.ts` flies each one to prove it — and
 * none of them uses a site whose range-safety corridor the chosen orbit leaves.
 *
 * Like the quick-start missions these only build settings; they never launch.
 */
import type { ConfigInput } from '../config/validation';
import { assertConfigInput } from '../config/validation';
import { orbitById } from '../data/orbits';
import { siteById } from '../data/sites';
import { DEFAULT_FAILURE } from '../physics/defaults';
import { launchWindows } from '../physics/mission';
import type { OrbitSpec } from '../types';

export type WatchMissionId = 'soyuzIss' | 'falcon9Leo' | 'starshipLeo' | 'falconHeavyGto' | 'ariane6Gto' | 'electronSso';

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
}

/**
 * A sun-synchronous orbit with its descending node at 10:30 local time — the
 * usual choice for Earth observation, and the one whose launch windows fall in
 * the morning. The preset's ascending node at 10:30 puts every window of a
 * southbound launch late in the evening, in the dark.
 */
const MORNING_SSO: Partial<OrbitSpec> = { ltan: 22.5 };

export const WATCH_MISSIONS: readonly WatchMission[] = [
  { id: 'soyuzIss', vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', orbitId: 'iss', payloadMass: 7150,
    titleKey: 'watch.mission.soyuzIss', blurbKey: 'watch.mission.soyuzIssBlurb' },
  { id: 'falcon9Leo', vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', orbitId: 'leo', payloadMass: 1000,
    titleKey: 'watch.mission.falcon9Leo', blurbKey: 'watch.mission.falcon9LeoBlurb' },
  { id: 'starshipLeo', vehicleId: 'starship', siteId: 'starbase', satelliteId: 'starlink', orbitId: 'leo', payloadMass: 15600,
    titleKey: 'watch.mission.starshipLeo', blurbKey: 'watch.mission.starshipLeoBlurb' },
  { id: 'falconHeavyGto', vehicleId: 'falconheavy', siteId: 'cape', satelliteId: 'comsat', orbitId: 'gto', payloadMass: 5500,
    titleKey: 'watch.mission.falconHeavyGto', blurbKey: 'watch.mission.falconHeavyGtoBlurb' },
  { id: 'ariane6Gto', vehicleId: 'ariane64', siteId: 'kourou', satelliteId: 'comsat', orbitId: 'gto', payloadMass: 5500,
    titleKey: 'watch.mission.ariane6Gto', blurbKey: 'watch.mission.ariane6GtoBlurb' },
  { id: 'electronSso', vehicleId: 'electron', siteId: 'mahia', satelliteId: 'cubesats', orbitId: 'sso', payloadMass: 150, orbit: MORNING_SSO,
    titleKey: 'watch.mission.electronSso', blurbKey: 'watch.mission.electronSsoBlurb' },
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
    guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
  };
  assertConfigInput(settings);
  return settings;
}
