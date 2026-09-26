import type { LaunchSiteSpec } from '../types';

/** One launch pad of a site, as the drawing tells it apart (roadmap V05). */
export interface LaunchPad {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface SiteExtra extends LaunchSiteSpec {
  /**
   * The site's customary solution for polar / sun-synchronous targets: the
   * southbound heading when true. A preference only — `launchDirection` in
   * src/physics/mission.ts flies whichever heading the azimuth window licenses
   * and falls back on this when the window licenses both or neither.
   */
  descendingForPolar: boolean;
  /**
   * Highest inclination the range-safety corridor reaches, deg — the retrograde
   * end of the pair whose prograde end is `minInclination`.
   *
   * Audit item B25 asked for the azimuth corridor to be either wired into the
   * mission planner or removed, because `azimuthMin`/`azimuthMax` had no
   * consumer at all and `minInclination` contradicted them (Vandenberg declared
   * 60 deg against a corridor that reaches nothing below 61.6 deg). Both halves
   * are now real: `launchDirection` in src/physics/mission.ts flies the launch
   * solution the window licenses, or a dogleg from its edge, and
   * `azimuthAllowedFor` — the boolean form of `inclinationCorridor` — is the
   * sun-synchronous gate in tests/fleet-defaults.test.ts.
   *
   * Every value here is MEASURED from the site's own corridor with the app's own
   * `rotatingLaunchAzimuth` at a 300 km circular orbit — both the ascending and
   * the descending solution, since the retrograde end always comes from the
   * descending one — and `tests/data-consistency.test.ts` re-measures the whole
   * table so the pair cannot drift from the corridor it describes.
   *
   * It is the corridor stated for a reader, not the number the planner tests.
   * `inclinationCorridor` (and with it `planMission`, the setup panel's verdict
   * and `azimuthAllowedFor`) takes the upper end from the azimuth window
   * itself, in closed form (`corridorReach`), because a figure held to the
   * window "within 0.2°" and a heading chosen from the window disagreed inside
   * that 0.2°. The lower end is still the declared `minInclination` — the
   * OPERATIONAL minimum, which a site may set above what its geometry allows
   * (Taiyuan: corridor 61.2°, declared 63°) but never below it.
   *
   * This comment used to explain why the panel did NOT call `azimuthAllowedFor`:
   * it flagged ordinary missions at every site whose declared minimum is a
   * nearly due-east launch just outside a window that starts at 90° (Jiuquan,
   * Wallops, Tanegashima, Mahia). That was the function testing only the
   * northbound heading, not a property of those sites — the southbound mirror
   * is inside every one of those windows — and it is fixed at the source.
   */
  maxInclination: number;
  /**
   * The site's launch pads, where the drawing tells them apart (V05); the
   * first is the one a mission flies from unless it names another. Only the
   * drawing reads them: every pad is launched from the site's own point above,
   * so the choice changes no trajectory.
   */
  pads?: readonly LaunchPad[];
}

export const SITES: SiteExtra[] = [
  // Baikonur and Vostochny used to carry a byte-identical `azimuthMin: 30,
  // azimuthMax: 200` placeholder, which implied a 200 deg departure over
  // Uzbekistan, Turkmenistan and Iran that has never been flown, and a 46 deg
  // reachable inclination below Baikonur's own declared 51.6 deg minimum. The
  // real bands are the north-easterly ones the R-7 and Proton corridors use.
  //
  // Baikonur 355-65 deg. The eastern edge is the 63.3 deg azimuth of a 51.6 deg
  // station launch; the northern edge is set by the highest plane the site
  // actually flies, the 64.8-70.4 deg GLONASS and Molniya inclinations at
  // 29-38 deg of azimuth. It is deliberately NOT widened to the 340 deg the
  // audit suggested: 340 deg reaches 102.2 deg of inclination, which would make
  // a sun-synchronous launch from Baikonur "allowed" — over Russia, on a
  // heading the site has never flown — and would quietly move three fleet rows
  // out of the range-safety exclusion table for a corridor edge nobody uses.
  //
  // Vostochny 340-95 deg, which is a genuinely wider site: it flies both the
  // 51.7 deg Soyuz plane (89.9 deg of azimuth, essentially due east down the
  // Sea of Okhotsk) and sun-synchronous Meteor-M/Kanopus missions on a
  // ~347 deg heading. The old placeholder could not express either edge.
  // Audit item B25.
  { id: 'baikonur', name: 'Baikonur Cosmodrome', country: 'KZ', latitude: 45.965, longitude: 63.305, altitude: 90, minInclination: 51.6, maxInclination: 91.8, azimuthMin: 355, azimuthMax: 65, tz: 'UTC+5', descendingForPolar: false,
    // Site 31/6 has flown every crewed Soyuz since MS-16 (2020); Gagarin's
    // Start, Site 1/5, flew them from Vostok 1 to MS-15 (2019), T-10-1, 18a and
    // MS-10 among them. Coordinates: en.wikipedia (Gagarin's Start, Site 31).
    pads: [
      { id: 'site31', name: 'Site 31/6', latitude: 45.996, longitude: 63.564 },
      { id: 'site1', name: "Gagarin's Start (Site 1/5)", latitude: 45.920, longitude: 63.342 },
    ] },
  { id: 'plesetsk', name: 'Plesetsk Cosmodrome', country: 'RU', latitude: 62.925, longitude: 40.578, altitude: 100, minInclination: 62.8, maxInclination: 102.6, azimuthMin: 330, azimuthMax: 90, tz: 'UTC+3', descendingForPolar: false },
  { id: 'vostochny', name: 'Vostochny Cosmodrome', country: 'RU', latitude: 51.884, longitude: 128.334, altitude: 250, minInclination: 51.7, maxInclination: 100.9, azimuthMin: 340, azimuthMax: 95, tz: 'UTC+9', descendingForPolar: false },
  { id: 'cape', name: 'Cape Canaveral SLC-40', country: 'US', latitude: 28.562, longitude: -80.577, altitude: 3, minInclination: 28.5, maxInclination: 57.6, azimuthMin: 35, azimuthMax: 120, tz: 'UTC-5', descendingForPolar: false,
    // C01: Launch Complex 5, where Mercury-Redstone 3 flew from (en.wikipedia,
    // Cape Canaveral Launch Complex 5; GCAT) — drawn there; the flight starts
    // from the site's own point, 14 km north, as every pad's does.
    pads: [
      { id: 'slc40', name: 'SLC-40', latitude: 28.562, longitude: -80.577 },
      { id: 'lc5', name: 'LC-5', latitude: 28.43944, longitude: -80.57333 },
    ] },
  // Kennedy LC-39A, 6 km north of SLC-40 on the same coast and the same range
  // corridor. The pad stands on a hardstand some 15 m above the marsh; that
  // mound is drawn (src/render/pads.ts) but the site keeps the ground level,
  // which is also where the ground under Landing Zones 1 and 2 is taken to be
  // (`Simulation.groundElevation` holds a site's altitude out to 50 km).
  { id: 'ksc39a', name: 'Kennedy LC-39A', country: 'US', latitude: 28.60833, longitude: -80.60444, altitude: 3, minInclination: 28.6, maxInclination: 57.7, azimuthMin: 35, azimuthMax: 120, tz: 'UTC-5', descendingForPolar: false },
  // minInclination 61.6, not 60: at 34.742 deg N the 147-201 deg corridor
  // reaches nothing below 61.6 deg on the app's own rotating-frame azimuth, so
  // 60 deg was a target no azimuth in the site's own window could fly — and the
  // default `leo` preset aims straight at `minInclination`, which meant picking
  // Vandenberg silently planned an ascent on a ~142 deg heading outside the
  // corridor and called it reachable. The 53 deg Starlink launches from here
  // fly a dogleg this model does not have; if they are wanted, that is a
  // `minInclinationWithDogleg` and an explicit dogleg model, not a lower
  // geometric limit. Audit item B25.
  { id: 'vandenberg', name: 'Vandenberg SFB', country: 'US', latitude: 34.742, longitude: -120.573, altitude: 100, minInclination: 61.6, maxInclination: 104.9, azimuthMin: 147, azimuthMax: 201, tz: 'UTC-8', descendingForPolar: true },
  { id: 'wallops', name: 'Wallops Flight Facility', country: 'US', latitude: 37.84, longitude: -75.47, altitude: 3, minInclination: 38, maxInclination: 72.3, azimuthMin: 90, azimuthMax: 160, tz: 'UTC-5', descendingForPolar: true },
  { id: 'starbase', name: 'Starbase (Boca Chica)', country: 'US', latitude: 25.997, longitude: -97.155, altitude: 5, minInclination: 26, maxInclination: 31.8, azimuthMin: 80, azimuthMax: 110, tz: 'UTC-6', descendingForPolar: false },
  { id: 'kourou', name: 'Guiana Space Centre (Kourou)', country: 'FR', latitude: 5.239, longitude: -52.768, altitude: 10, minInclination: 5.2, maxInclination: 96.5, azimuthMin: 350, azimuthMax: 94, tz: 'UTC-3', descendingForPolar: false },
  { id: 'wenchang', name: 'Wenchang Space Launch Site', country: 'CN', latitude: 19.614, longitude: 110.951, altitude: 10, minInclination: 19.5, maxInclination: 86.9, azimuthMin: 60, azimuthMax: 180, tz: 'UTC+8', descendingForPolar: true },
  { id: 'tanegashima', name: 'Tanegashima Space Center', country: 'JP', latitude: 30.4, longitude: 130.97, altitude: 10, minInclination: 30.4, maxInclination: 96, azimuthMin: 90, azimuthMax: 190, tz: 'UTC+9', descendingForPolar: true },
  { id: 'sriharikota', name: 'Satish Dhawan Space Centre', country: 'IN', latitude: 13.72, longitude: 80.23, altitude: 10, minInclination: 13.7, maxInclination: 86.7, azimuthMin: 90, azimuthMax: 180, tz: 'UTC+5:30', descendingForPolar: true },
  // Chinese inland launch centres. Coordinates and elevations:
  // https://en.wikipedia.org/wiki/Jiuquan_Satellite_Launch_Center ,
  // https://en.wikipedia.org/wiki/Taiyuan_Satellite_Launch_Center ,
  // https://en.wikipedia.org/wiki/Xichang_Satellite_Launch_Center
  // Azimuth corridors: Jiuquan flies south-east to due south over China (the
  // north-eastern sector is closed by Mongolia and Russia), which gives it
  // everything from the 41° minimum of the crewed Shenzhou flights to the ~190°
  // descending azimuth of a sun-synchronous launch. Taiyuan is the polar/SSO
  // site and only flies the southern sector. Xichang's downrange safety window
  // is quoted as 94-104° about a 97° nominal, i.e. a 28.5-31° band — which is
  // why it is the geostationary site and never flies polar.
  // http://www.satobs.org/faq/Chapter-09.txt , https://www.globalsecurity.org/space/world/china/xichang.htm
  { id: 'jiuquan', name: 'Jiuquan Satellite Launch Center', country: 'CN', latitude: 40.958, longitude: 100.291, altitude: 1000, minInclination: 41, maxInclination: 103.1, azimuthMin: 90, azimuthMax: 200, tz: 'UTC+8', descendingForPolar: true },
  // Taiyuan's corridor reaches 61.2 deg; the declared 63 deg minimum is the
  // operational one and is left where it is, because a site may fly less than
  // its geometry allows. The pair is only wrong when it points the other way,
  // which is what Vandenberg's did.
  { id: 'taiyuan', name: 'Taiyuan Satellite Launch Center', country: 'CN', latitude: 38.849, longitude: 111.608, altitude: 1500, minInclination: 63, maxInclination: 103.5, azimuthMin: 144, azimuthMax: 200, tz: 'UTC+8', descendingForPolar: true },
  { id: 'xichang', name: 'Xichang Satellite Launch Center', country: 'CN', latitude: 28.246, longitude: 102.027, altitude: 1825, minInclination: 28.5, maxInclination: 31, azimuthMin: 94, azimuthMax: 104, tz: 'UTC+8', descendingForPolar: false },
  { id: 'mahia', name: 'Rocket Lab LC-1 (Mahia)', country: 'NZ', latitude: -39.26, longitude: 177.865, altitude: 40, minInclination: 39, maxInclination: 103.4, azimuthMin: 90, azimuthMax: 200, tz: 'UTC+12', descendingForPolar: true },

  // ── Roadmap C04: sites no vehicle in the fleet flies from yet ──────────────
  // They are here for the vehicles that will: Dnepr from Yasny first, which
  // put Thailand's THEOS-1 into orbit on 1 October 2008. Until then the setup
  // panel lists them greyed out and validation refuses them, because
  // `VehicleSpec.sites` is what licenses a launch. Every azimuth window below
  // is DERIVED from the inclinations the site has flown, with the app's own
  // `rotatingLaunchAzimuth` at the 300 km reference orbit, not quoted from a
  // range document (none was reachable); `tests/data-consistency.test.ts`
  // holds `maxInclination` to the window, as for every other site.
  //
  // Yasny (Dombarovsky), Orenburg oblast: the Dnepr silo launches of ISC
  // Kosmotras, 2006–2015. Flown: Genesis I/II at 64.5° (41.7° or 138.3° of
  // azimuth); THEOS-1 at 98.8°, Sich-2 and others at 98.2°, KOMPSAT-3A at 97.5°
  // (343.8–345.9° north or 194.1–196.2° south). THEOS-1 lifted off at 06:37 UTC,
  // 10:36 local solar time, for a 10:00 descending node — a southbound launch,
  // so the window is the southern one that holds both families, 130–200°.
  // Coordinates from ru.wikipedia (the launch base; the silo itself is not
  // published); the elevation of the steppe there, about 300 m, is estimated.
  // https://ru.wikipedia.org/wiki/Ясный_(пусковая_база) ,
  // https://directory.eoportal.org/web/eoportal/satellite-missions/t/theos ,
  // https://www.eoportal.org/satellite-missions/genesis-complex ,
  // https://spaceflightnow.com/2015/03/26/south-korean-satellite-launched-by-dnepr-rocket/
  { id: 'yasny', name: 'Yasny (Dombarovsky)', country: 'RU', latitude: 51.0939, longitude: 59.8422, altitude: 300, minInclination: 64.5, maxInclination: 101.2, azimuthMin: 130, azimuthMax: 200, tz: 'UTC+5', descendingForPolar: true },
  // Kapustin Yar, Astrakhan oblast: Kosmos-3M from site 107, 1973–1999 and
  // 2008 (the pad was dismantled by 2021). Flown: 48.5° (Orbcomm 2008, MegSat)
  // and 50.7° (Kosmos-1374, BOR-4) — due east to 72.5° or 107.5° of azimuth,
  // eastward over Kazakhstan, so 70–110°. The declared floor is the latitude
  // (a 48.5° plane is 48.57° from here). Coordinates: the range's, from
  // ru.wikipedia; the Caspian lowland is near sea level, 20 m estimated.
  // https://ru.wikipedia.org/wiki/Капустин_Яр , https://en.wikipedia.org/wiki/Kosmos-3M ,
  // https://en.wikinews.org/wiki/Kosmos-3M_rocket_launches_six_Orbcomm_satellites ,
  // https://ru.wikipedia.org/wiki/Космос-1374
  { id: 'kapustinyar', name: 'Kapustin Yar', country: 'RU', latitude: 48.5667, longitude: 46.2952, altitude: 20, minInclination: 48.6, maxInclination: 51.3, azimuthMin: 70, azimuthMax: 110, tz: 'UTC+4', descendingForPolar: false },
  // Svobodny, Amur oblast: five Start-1 launches 1997–2006 (Zeya, Early Bird,
  // EROS-A, Odin, EROS-B), all sun-synchronous at 97.3–97.8°, and closed in
  // 2007 in favour of Vostochny, 50 km away. Its launches went north, over the
  // taiga (345.3–346.1° of azimuth), so the window is 340–20°: the
  // sun-synchronous planes and nothing the site never flew. Elevation
  // (about 200 m) estimated.
  // https://ru.wikipedia.org/wiki/Свободный_(космодром) , https://en.wikipedia.org/wiki/Svobodny_Cosmodrome ,
  // https://www.eoportal.org/satellite-missions/eros-a , https://en.wikipedia.org/wiki/Odin_(satellite)
  { id: 'svobodny', name: 'Svobodny Cosmodrome', country: 'RU', latitude: 51.8167, longitude: 128.3, altitude: 200, minInclination: 76.7, maxInclination: 101, azimuthMin: 340, azimuthMax: 20, tz: 'UTC+9', descendingForPolar: false },
  // Palmachim, Israel: Shavit, 1988 to date. Every other direction crosses a
  // neighbour, so it launches west over the Mediterranean, against the
  // Earth's rotation: Ofeq planes of 141.7–143.5° (287.9–291.4° of azimuth,
  // north of west). Window 280–300°, and the floor is retrograde — the one
  // site `retrogradeOnly` (src/physics/mission.ts) applies to. Pad
  // coordinates and the airbase's 10 m from en.wikipedia.
  // https://en.wikipedia.org/wiki/Palmachim_Airbase , http://astronauticsnow.com/israelspace/index.html ,
  // https://en.wikipedia.org/wiki/Ofeq-9 , https://en.wikipedia.org/wiki/Ofek-16 ,
  // https://spaceflightnow.com/2023/03/30/israel-launches-radar-spy-satellite-into-retrograde-orbit/
  { id: 'palmachim', name: 'Palmachim Airbase', country: 'IL', latitude: 31.8844, longitude: 34.6803, altitude: 10, minInclination: 141.5, maxInclination: 146.6, azimuthMin: 280, azimuthMax: 300, tz: 'UTC+2', descendingForPolar: false },
];

export const siteById = (id: string): SiteExtra => {
  const s = SITES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown site ${id}`);
  return s;
};
