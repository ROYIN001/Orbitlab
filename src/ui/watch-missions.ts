/**
 * The launches offered in the viewer.
 *
 * A viewer with no background in spaceflight must never be handed a mission
 * that fails for a reason nobody explained to them, so every entry here is a
 * vehicle, site, payload and orbit that flies to orbit with the default
 * guidance — `tests/watch-missions-flights-*.test.ts` fly each one to prove it — and
 * none of them uses a site whose range-safety corridor the chosen orbit leaves.
 * The exceptions are the three launch aborts (G06), each a failure that really
 * happened, explained as it happens, and each flown to its crew at rest.
 *
 * Like the quick-start missions these only build settings; they never launch.
 */
import type { ConfigInput } from '../config/validation';
import { assertConfigInput } from '../config/validation';
import { getLang } from '../i18n';
import { orbitById } from '../data/orbits';
import { siteById } from '../data/sites';
import { DEFAULT_FAILURE } from '../physics/defaults';
import { launchWindows } from '../physics/mission';
import type { FailureConfig, MissionConfig, OrbitSpec, RecoveryPlan } from '../types';
import type { FlownRecord } from './flown';

export type WatchMissionId = 'soyuzIss' | 'falcon9Bandwagon' | 'starshipFlight5' | 'falconHeavyArabsat' | 'ariane6AmazonLeo' | 'electronSso'
  | 'soyuzMs10' | 'soyuzT10' | 'soyuz18a' | 'soyuzMsDocking'
  | 'soyuzMs16' | 'soyuzMs25' | 'falcon9Orbcomm2' | 'angaraA5Flight1' | 'h2aHayabusa2' | 'falcon9Demo2'
  | 'sputnik1' | 'vostok1' | 'mr3' | 'apollo11';

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
  /** the flight on to the station (G07) */
  rendezvous?: MissionConfig['rendezvous'];
  /**
   * The real liftoff, ISO 8601 UTC, for a flight replayed on its own day
   * (roadmap C01): it launches at this instant, in whatever light the pad had,
   * instead of at a daylight window.
   */
  launchTime?: string;
  /** the real flight's event times and orbit, to compare with (C01; sources in docs/PHYSICS.md §13) */
  flown?: FlownRecord;
}

/** A flight replayed on its own day and second (roadmap C01). */
export const isHistorical = (m: WatchMission): boolean => m.launchTime !== undefined;

/**
 * The historical flight a mission's settings are, if they are one unchanged:
 * the same vehicle, site, payload and mass, launched at the same second. Its
 * flown record is then a fair comparison; anything edited is a different flight.
 */
export function historicalFor(cfg: { vehicleId: string; siteId: string; satelliteId: string; payloadMass?: number; launchTime: Date }): WatchMission | undefined {
  return WATCH_MISSIONS.find((m) => m.launchTime !== undefined && m.vehicleId === cfg.vehicleId && m.siteId === cfg.siteId
    && m.satelliteId === cfg.satelliteId && (cfg.payloadMass === undefined || m.payloadMass === cfg.payloadMass)
    && Math.abs(new Date(m.launchTime).getTime() - cfg.launchTime.getTime()) < 1000);
}

/** A historical flight's date, UTC, in the reader's language ("23 March 2024"). */
export function historicalDate(iso: string): string {
  const locale = { en: 'en-GB', ru: 'ru-RU', th: 'th-TH-u-ca-gregory' }[getLang()];
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
}

/**
 * A sun-synchronous orbit with its descending node at 10:30 local time — the
 * usual choice for Earth observation, and the one whose launch windows fall in
 * the morning. The preset's ascending node at 10:30 puts every window of a
 * southbound launch late in the evening, in the dark.
 */
const MORNING_SSO: Partial<OrbitSpec> = { ltan: 22.5 };

/**
 * Each launch as it was really flown. The first ten keep everything but the
 * date: the viewer launches them in daylight at the pad (`daylightLaunchTime`).
 * The historical flights (roadmap C01, the ones with a `launchTime`) keep the
 * date too, to the second; sources for every value in docs/PHYSICS.md §13.
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
  // G07: Soyuz MS-28, 27 November 2025, from Site 31/6 — the two-orbit
  // profile, docked at Rassvet 3 h 10 min after liftoff.
  { id: 'soyuzMsDocking', vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', orbitId: 'iss', payloadMass: 7150,
    rendezvous: { profile: 'twoOrbit', port: 'rassvet' },
    titleKey: 'watch.mission.soyuzMsDocking', blurbKey: 'watch.mission.soyuzMsDockingBlurb', payloadKey: 'watch.payload.soyuzMsDocking' },
  // C01 — historical flights on the vehicles of the fleet.
  // Soyuz MS-16, 9 April 2020: the first crew on a Soyuz-2.1a, from Site 31/6;
  // the four-orbit profile, docked at Poisk 6 h 08 min after liftoff.
  { id: 'soyuzMs16', vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', orbitId: 'iss', payloadMass: 7218,
    rendezvous: { profile: 'fourOrbit', port: 'poisk' }, launchTime: '2020-04-09T08:05:06.463Z',
    // RSW gives the ascent in prose ("slightly less than two minutes", "about
    // 4.8 min"); separation from GCAT, docking 14:13:21 UTC (RSW, JSR 777)
    flown: { events: [
      { key: 'evt.boosterSep', t: 118, approx: true }, { key: 'evt.fairingSep', t: 153, approx: true },
      { key: 'evt.stageSep', t: 288, approx: true }, { key: 'evt.payloadSep', t: 530 },
      { key: 'evt.contact', t: 22095 },
    ], orbit: { perigee: 192, apogee: 218, inclination: 51.66 } },
    titleKey: 'watch.mission.soyuzMs16', blurbKey: 'watch.mission.soyuzMs16Blurb', payloadKey: 'watch.payload.soyuzMs16' },
  // Soyuz MS-25, 23 March 2024, two days after an automatic cut-off at T−20 s:
  // the two-day profile, docked at Prichal on 25 March.
  { id: 'soyuzMs25', vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', orbitId: 'iss', payloadMass: 7152,
    rendezvous: { profile: 'twoDay', port: 'prichal' }, launchTime: '2024-03-23T12:36:10.573Z',
    // the telemetry times RSW publishes; docking 2024-03-25 15:02:50 UTC (JSR 831)
    flown: { events: [
      { key: 'evt.boosterSep', t: 117.8 }, { key: 'evt.fairingSep', t: 153.33 }, { key: 'evt.stageSep', t: 287.7 },
      { key: 'evt.seco', t: 525.93 }, { key: 'evt.payloadSep', t: 529.229 }, { key: 'evt.contact', t: 181599.4 },
    ], orbit: { perigee: 193, apogee: 218, inclination: 51.65 } },
    titleKey: 'watch.mission.soyuzMs25', blurbKey: 'watch.mission.soyuzMs25Blurb', payloadKey: 'watch.payload.soyuzMs25' },
  // Falcon 9 flight 20, 22 December 2015 (the evening of the 21st at the Cape):
  // eleven ORBCOMM OG2 satellites to ~613 × 657 km at 47°, and the first
  // orbital booster to land, at Landing Zone 1. It was the first Falcon 9
  // "Full Thrust"; the fleet's Block 5 stands in for it.
  { id: 'falcon9Orbcomm2', vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', orbitId: 'custom', payloadMass: 2553,
    orbit: { perigee: 613e3, apogee: 657e3, inclination: 47.0, raanMode: 'free' },
    recoveryPlan: { core: { kind: 'landingZone', zoneId: 'lz1' } }, launchTime: '2015-12-22T01:29:00Z',
    // the pre-launch timeline (Spaceflight Now); the landing 01:39 UTC (JSR
    // 721), the first satellite out at 01:44 (GCAT, to the minute)
    flown: { events: [
      { key: 'evt.maxQ', t: 84, approx: true }, { key: 'evt.meco', t: 140, approx: true },
      { key: 'evt.stageSep', t: 144, approx: true }, { key: 'evt.fairingSep', t: 175, approx: true },
      { key: 'evt.boosterLandedZone', t: 604, approx: true }, { key: 'evt.payloadSep', t: 900, approx: true },
    ], orbit: { perigee: 613, apogee: 657, inclination: 47.0 } },
    titleKey: 'watch.mission.falcon9Orbcomm2', blurbKey: 'watch.mission.falcon9Orbcomm2Blurb', payloadKey: 'watch.payload.orbcomm2' },
  // Angara-A5 1L, 23 December 2014: the first flight, from Plesetsk, a 2,042 kg
  // dummy taken to geostationary altitude by four Briz-M burns over nine hours.
  { id: 'angaraA5Flight1', vehicleId: 'angaraa5', siteId: 'plesetsk', satelliteId: 'comsat', orbitId: 'geo', payloadMass: 2042,
    launchTime: '2014-12-23T05:57:00Z',
    // the telemetry table RSW publishes; the upper stage's cut-off from the
    // Novosti Kosmonavtiki timeline; the dummy's simulated release at 9:00:37
    flown: { events: [
      { key: 'evt.boosterSep', t: 213.7 }, { key: 'evt.stageSep', t: 330.924 }, { key: 'evt.fairingSep', t: 345.075 },
      { key: 'evt.seco', t: 733, approx: true }, { key: 'evt.stageSep', n: 2, t: 738.412 },
      { key: 'evt.payloadSep', t: 32437, approx: true },
    ], orbit: { perigee: 35625, apogee: 36946, inclination: 0.49, approx: true } },
    titleKey: 'watch.mission.angaraA5Flight1', blurbKey: 'watch.mission.angaraA5Flight1Blurb', payloadKey: 'watch.payload.angaraDummy' },
  // Crew Dragon Demo-2, 30 May 2020: the first crew launched from the United
  // States since 2011, Crew Dragon "Endeavour" on top of Falcon 9 without a
  // fairing, to 190 × 211 km in the station's plane (JSR 779); the booster to
  // Of Course I Still Love You. Dragon flew itself to the station, docked 19 h
  // later; the model's flight ends at separation.
  { id: 'falcon9Demo2', vehicleId: 'falcon9', siteId: 'ksc39a', satelliteId: 'crewDragon', orbitId: 'iss', payloadMass: 13055,
    orbit: { perigee: 190e3, apogee: 211e3 },
    recoveryPlan: { core: { kind: 'droneShip' } }, launchTime: '2020-05-30T19:22:45Z',
    // NASA's launch timeline
    flown: { events: [
      { key: 'evt.maxQ', t: 58 }, { key: 'evt.meco', t: 153 }, { key: 'evt.stageSep', t: 156 },
      { key: 'evt.seco', t: 527 }, { key: 'evt.boosterLandedShip', t: 562 }, { key: 'evt.payloadSep', t: 720 },
    ], orbit: { perigee: 190, apogee: 211, inclination: 51.6 } },
    titleKey: 'watch.mission.falcon9Demo2', blurbKey: 'watch.mission.falcon9Demo2Blurb', payloadKey: 'watch.payload.demo2' },
  // Sputnik 1, 4 October 1957, from Site 1/5: PS-1 to 214 × 938 km at 65.1°
  // (GCAT). The core itself reached orbit; the strap-ons fell away at
  // T+116.38 s, the core cut off at T+295.4 s and PS-1 was pushed off with
  // its nose cone at T+314.5 s (en.wikipedia, from the flight records).
  { id: 'sputnik1', vehicleId: 'r7sputnik', siteId: 'baikonur', satelliteId: 'ps1', orbitId: 'custom', payloadMass: 83.6, padId: 'site1',
    orbit: { perigee: 214e3, apogee: 938e3, inclination: 65.1, argPerigee: 0, raanMode: 'free' }, launchTime: '1957-10-04T19:28:34Z',
    flown: { events: [
      { key: 'evt.boosterSep', t: 116.38 }, { key: 'evt.seco', t: 295.4 }, { key: 'evt.payloadSep', t: 314.5 },
    ], orbit: { perigee: 214, apogee: 938, inclination: 65.1 } },
    titleKey: 'watch.mission.sputnik1', blurbKey: 'watch.mission.sputnik1Blurb', payloadKey: 'watch.payload.sputnik1' },
  // Vostok 1, 12 April 1961, from Site 1/5: Yuri Gagarin, once round the
  // Earth, 168 × 314 km at 64.95° (GCAT; 181 × 327 km in the older figures).
  // Strap-ons T+119 s, shroud T+156 s, Blok A off and Blok E lit T+300 s,
  // Blok E off T+676 s, the spacecraft off ten seconds later (ESA). The orbit
  // planned was 168 × 230 km (Baturin 2021; Kommersant gives 180 × 235): the
  // radio command to shut the core down did not pass, and the backups stopped
  // the core and Blok E 25.43 m/s late (`aim`, `backupCutoff`; docs/PHYSICS.md
  // §13.6). Home: the TDU-1 lit at 10:25:34 Moscow time,
  // T+78:34 (ru.wikipedia's chronology), and the descent flown from there
  // (`VOSTOK_CAPSULE`, src/physics/rigid/escape.ts; docs/PHYSICS.md §13.6).
  { id: 'vostok1', vehicleId: 'vostokk', siteId: 'baikonur', satelliteId: 'vostok1', orbitId: 'custom', payloadMass: 4725, padId: 'site1',
    orbit: { perigee: 168e3, apogee: 314e3, inclination: 64.95, argPerigee: 0, raanMode: 'free', deorbit: { time: 4714 },
      aim: { apogee: 230e3 }, backupCutoff: { dv: 25.43 } }, launchTime: '1961-04-12T06:07:00Z',
    flown: { events: [
      // the core's cut-off is quoted rounded (Zak gives 299 s; on the December 1960 flight its command was due at
      // T+308–309 s); the spacecraft's separation is ESA's "ten seconds later"
      { key: 'evt.boosterSep', t: 119 }, { key: 'evt.fairingSep', t: 156 }, { key: 'evt.meco', t: 300, approx: true },
      { key: 'evt.seco', t: 676 }, { key: 'evt.payloadSep', t: 686, approx: true },
      // the retro-fire to the second; the separation over the Mediterranean at 10:36, the ejection at 10:42 and
      // the sphere on the ground at 10:48, each to the minute (ru.wikipedia; Zak, RussianSpaceWeb)
      { key: 'evt.retroFire', t: 4714 }, { key: 'evt.vostokSeparation', t: 5340, approx: true },
      { key: 'evt.ejection', t: 5700, approx: true }, { key: 'evt.capsuleLanding', t: 6060, approx: true },
    ], orbit: { perigee: 168, apogee: 314, inclination: 64.95 } },
    titleKey: 'watch.mission.vostok1', blurbKey: 'watch.mission.vostok1Blurb', payloadKey: 'watch.payload.vostok1' },
  // Mercury-Redstone 3, 5 May 1961: Alan Shepard in Freedom 7, lobbed from
  // LC-5 on azimuth 105° to a 187.5 km apogee and a splashdown 487 km
  // downrange after 15 min 22 s. The arc is the conic through the flown
  // separation state (74.3 km, 2,252 m/s inertial at 39.0° up): perigee
  // −6,214 km; the plane between the flown heading and the recovery point
  // (docs/PHYSICS.md §13.7). Postlaunch report (June 1961) and NASA TM X-53107.
  { id: 'mr3', vehicleId: 'mercuryredstone', siteId: 'cape', satelliteId: 'mercury', orbitId: 'custom', payloadMass: 1832.6, padId: 'lc5',
    orbit: { perigee: -6214e3, apogee: 187.5e3, inclination: 30.3, raanMode: 'free', suborbital: true, descending: true }, launchTime: '1961-05-05T14:34:13Z',
    flown: { events: [
      { key: 'evt.maxQ', t: 84 }, { key: 'evt.seco', t: 141.8 }, { key: 'evt.payloadSep', t: 152.3 },
    ], orbit: { perigee: -6214, apogee: 187.5, inclination: 30.55, approx: true } },
    titleKey: 'watch.mission.mr3', blurbKey: 'watch.mission.mr3Blurb', payloadKey: 'watch.payload.mr3' },
  // Apollo 11, 16 July 1969, 13:32:00 UTC (range zero) from LC-39A: the Saturn V
  // AS-506 on azimuth 72.058° into a 183.2 × 186.0 km parking orbit at 32.521°
  // (FER MPR-SAT-FE-69-9; docs/PHYSICS.md §13.8). The flight goes on from
  // there — the S-IVB's restart for the Moon — in the parts that follow.
  { id: 'apollo11', vehicleId: 'saturnv506', siteId: 'ksc39a', satelliteId: 'apollo11', orbitId: 'custom', payloadMass: 49735,
    // the parking orbit's plane: its node 123.088° east of the launch meridian at guidance reference release,
    // T−17 s (FER Table 4-5) — 359.624° from the mean equinox of date
    orbit: { perigee: 183.2e3, apogee: 186.0e3, inclination: 32.521, argPerigee: 0, raanMode: 'fixed', raan: 359.624, flightAzimuth: 72.058,
      // the translunar injection. The S-IVB relit at T+2:44:16.2 (STDV open), at 795 kN and 432.4 s for its
      // first two minutes on a lean mixture, then 894.4 kN and 428.7 s (FER Figure 7-7, Table 7-2; the first
      // figures and the shift's time read off the plot). Onto the conic the state ten seconds after the
      // cut-off gives (Orloff, "Translunar Injection", from the FER): C3 −1.3916 km²/s², e 0.97696, 31.383°,
      // the node 121.847° east of the launch meridian at T−17 s (358.383° of date) and perigee 4.410° past it
      // (computed from that state) — at the cut-off signal, before the thrust's 239 kN·s decay, the FER's
      // −1.4875 and 0.97537 (Table 4-6)
      injection: { time: 9856.2, c3: -1391609, eccentricity: 0.97696, inclination: 31.383, raan: 358.383, argPerigee: 4.410,
        thrustVac: 795e3, ispVac: 432.4, mixture: { t: 9976.7, thrustVac: 894.4e3, ispVac: 428.7 },
        // the S-IVB's continuous hydrogen vent in the parking orbit, 758.5 s to 9,320.4 s, its thrust read off
        // FER Figure 7-3 (the valve's cycling at its mean), and the 1,053 kg the coast lost (Table 20-10)
        vent: { mass: 1053, thrust: [[758.5, 300], [800, 200], [900, 130], [1000, 105], [1200, 125], [2200, 130],
          [2400, 110], [3100, 105], [3150, 75], [3950, 75], [4000, 45], [5000, 45], [5050, 62], [5300, 62], [5350, 70],
          [6600, 70], [6650, 118], [7900, 118], [7950, 70], [9320.4, 70]] },
        // the SLA's panels at 3:15:23.0 (Orloff); the CSM's separation at 3:17:04.6, docking at 3:24:03.1 and the
        // ejection from the S-IVB at 4:16:59.1 (Apollo 11 Mission Report MSC-00171, Table 3-I)
        sequence: { panels: 11723.0, separation: 11824.6, docking: 12243.1, extraction: 15419.1 } } },
    launchTime: '1969-07-16T13:32:00Z',
    flown: { events: [
      { key: 'evt.maxQ', t: 83.0 }, { key: 'evt.ceco', t: 135.20 }, { key: 'evt.meco', t: 161.63 }, { key: 'evt.stageSep', t: 162.30 },
      { key: 'evt.interstageSep', t: 192.3 }, { key: 'evt.towerJettison', t: 197.9 }, { key: 'evt.ceco', n: 2, t: 460.62 },
      { key: 'evt.mixtureShift', t: 498.0, approx: true }, { key: 'evt.stageCutoff', t: 548.22 }, { key: 'evt.stageSep', n: 2, t: 549.00 },
      { key: 'evt.seco', t: 699.33 },
      // the restart and the translunar injection (FER), the transposition (Orloff; Mission Report Table 3-I)
      { key: 'evt.ignition', n: 4, t: 9856.2 }, { key: 'evt.mixtureShift', n: 2, t: 9976.7, approx: true }, { key: 'evt.tli', t: 10203.07 }, { key: 'evt.slaPanels', t: 11723.0 },
      { key: 'evt.csmSeparation', t: 11824.6 }, { key: 'evt.csmDocked', t: 12243.1 }, { key: 'evt.lmExtraction', t: 15419.1 },
      // on to the Moon: the evasive burn, MCC-2 (the only correction flown: the model's first), the sphere of
      // influence (Orloff; Mission Report Tables 7-III and 3-I; the Public Affairs commentary)
      { key: 'evt.evasive', t: 16801.72 }, { key: 'evt.mcc', t: 96298.64 }, { key: 'evt.lunarSoi', t: 221995 },
      // into lunar orbit: LOI-1's ignition and cut-off, LOI-2's (Orloff)
      { key: 'evt.loi', t: 272990.37 }, { key: 'evt.lunarOrbit', t: 273347.90 },
      { key: 'evt.circularize', t: 288696.75 }, { key: 'evt.lunarOrbit', n: 2, t: 288713.63 },
      // Eagle down to Tranquility Base: the undocking, Columbia's separation, DOI's ignition and cut-off, the
      // powered descent, its throttle recovery and gates, the contact light and the engine off (Mission Report
      // Tables 3-I, 5-I; Orloff)
      { key: 'evt.undocking', t: 360720 }, { key: 'evt.separationBurn', t: 362392.9 },
      { key: 'evt.doi', t: 365774 }, { key: 'evt.lunarOrbit', n: 3, t: 365804 },
      { key: 'evt.pdi', t: 369185.01 }, { key: 'evt.throttleRecovery', t: 369571 }, { key: 'evt.highGate', t: 369692 },
      { key: 'evt.lowGate', t: 369802 }, { key: 'evt.lunarLanding', t: 369939.9 }, { key: 'evt.lmEngineOff', t: 369941.4 },
      // back to Columbia: the lift-off and the insertion, the coelliptic sequence, the terminal phase, the docking,
      // the ascent stage's jettison and the CSM's separation from it (Mission Report Tables 3-I, 5-VI; Figure 5-19)
      { key: 'evt.lunarLiftoff', t: 447720.79 }, { key: 'evt.lmInsertion', t: 448155.67 },
      { key: 'evt.csi', t: 451175 }, { key: 'evt.cdh', t: 454669.6 }, { key: 'evt.tpi', t: 457431.8 },
      { key: 'evt.lmMcc', t: 458310.8 }, { key: 'evt.lmMcc', n: 2, t: 459210.8 }, { key: 'evt.braking', t: 459417.3 },
      { key: 'evt.stationkeeping', t: 460325.3 }, { key: 'evt.lmDocked', t: 460980 },
      { key: 'evt.lmJettison', t: 468571.2 }, { key: 'evt.asSeparation', t: 469801 },
      // home: the transearth injection and its cut-off, MCC-5, the CM's separation, the entry interface, the
      // drogues and the splash (Mission Report Tables 3-I, 7-VI, 7-VII)
      { key: 'evt.tei', t: 487422.3 }, { key: 'evt.transearth', t: 487573.7 }, { key: 'evt.transearthMcc', t: 541797.4 },
      { key: 'evt.cmSmSeparation', t: 701352.7 }, { key: 'evt.entryInterface', t: 702185.7 }, { key: 'evt.drogues', t: 702726.9 },
      { key: 'evt.cmSplashdown', t: 703115 },
    ], orbit: { perigee: 183.2, apogee: 186.0, inclination: 32.521 } },
    titleKey: 'watch.mission.apollo11', blurbKey: 'watch.mission.apollo11Blurb', payloadKey: 'watch.payload.apollo11' },
  // H-IIA F26, 3 December 2014: Hayabusa2 and three small passengers to a
  // 250 × 254 km parking orbit at 30.0°, below the pad's 30.4° latitude — a
  // yaw the model does not fly, so it aims at the lowest plane it can reach.
  // The second stage's restart towards the asteroid, 1 h 39 min later, is not
  // flown either: the model has no escape target. Hayabusa2 alone (600 kg);
  // the three passengers, about a tenth of a tonne, are left out.
  { id: 'h2aHayabusa2', vehicleId: 'h2a202', siteId: 'tanegashima', satelliteId: 'science', orbitId: 'custom', payloadMass: 600,
    orbit: { perigee: 250e3, apogee: 254e3, inclination: 30.4, raanMode: 'free' }, launchTime: '2014-12-03T04:22:04Z',
    // MHI's quick review of the flight
    flown: { events: [
      { key: 'evt.boosterSep', t: 107 }, { key: 'evt.fairingSep', t: 251 }, { key: 'evt.meco', t: 396 },
      { key: 'evt.stageSep', t: 404 }, { key: 'evt.seco', t: 680 },
    ], orbit: { perigee: 250, apogee: 254, inclination: 30.0 } },
    titleKey: 'watch.mission.h2aHayabusa2', blurbKey: 'watch.mission.h2aHayabusa2Blurb', payloadKey: 'watch.payload.hayabusa2' },
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
    orbitId: m.orbitId, orbit, launchTime: m.launchTime ? new Date(m.launchTime) : daylightLaunchTime(orbit, m.siteId, from),
    guidanceOverrides: {}, failure: { ...(m.failure ?? DEFAULT_FAILURE) },
    boosterRecovery: !!m.recoveryPlan, recoveryPlan: m.recoveryPlan,
    ...(m.padId ? { padId: m.padId } : {}),
    ...(m.rendezvous ? { rendezvous: { ...m.rendezvous } } : {}),
  };
  assertConfigInput(settings);
  return settings;
}
