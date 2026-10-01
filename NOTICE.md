# Notices and third-party credits

Orbitlab — Copyright 2026 Royin (ROYIN001).

Orbitlab is a personal educational project by a Thai Air Force cadet studying at a military
space academy, built from public sources. It is not a product of the Royal Thai Air Force or of
any academy, and no service or academy name or emblem is used without written permission.

## The project's own work

- **Code** — everything under `src/`, `scripts/` and `tests/`, the build configuration and the
  workflows — is licensed under the [Apache License 2.0](LICENSE).
- **Lesson texts, worksheets and documentation** — the lessons' briefs, criteria, hints and
  debriefs, the placement test's questions, the worksheets and their answer keys (including where
  they are written inside source files, under `src/lessons/` and `src/worksheets/`), `README.md`
  and everything under `docs/` — are licensed under
  [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).
  Attribute them to "Orbitlab (Royin, ROYIN001)" with a link to
  <https://github.com/ROYIN001/Orbitlab>.
- **The app's own pictures** — the Orbitlab mark (a delta in the Thai flag's stripes with an orbit
  across it, drawn in `index.html`) and the icons and favicon made from it (`public/icons/`,
  `npm run icons`), the landing page's screenshots (`public/home/`) and the link preview
  (`public/social/preview.jpg`), taken from the app itself with `npm run shots` — are the project's
  own work. The Earth imagery that appears in the
  screenshots is credited below.

How to cite the project: [CITATION.cff](CITATION.cff).

Everything below is someone else's work, with its own terms. Where this file says
"terms: see source", the licence is not stated here because it was not confirmed; the source's own
terms apply. The data sources are named for credit and for checking; none of them endorses Orbitlab.

## Software shipped in the app

| What | Used for | Licence | Source |
| --- | --- | --- | --- |
| three.js 0.186.0 | 3-D rendering; the only runtime dependency, bundled into the build | MIT | <https://threejs.org/>, <https://github.com/mrdoob/three.js> |

The development tools (Vite, TypeScript, Vitest, Playwright) build and test the app and are not
shipped in it; each carries its own licence in `node_modules/`.

## Media shipped in the app

### Earth textures — `public/textures/`

`earth_atmos_2048.jpg`, `earth_normal_2048.jpg`, `earth_specular_2048.jpg`: the planet textures
from the three.js examples (<https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets>),
derivatives of NASA's Blue Marble imagery (<https://visibleearth.nasa.gov/>). Terms: see source.

`earth_atmos_4096.jpg`: NASA Visible Earth, *Blue Marble: Land Surface, Ocean Color and Sea Ice*
(`land_ocean_ice_8192.png`, <https://visibleearth.nasa.gov/images/57730>), reduced to 4096 × 2048
and colour-matched to `earth_atmos_2048.jpg`. `earth_clouds_4096.jpg`: NASA Visible Earth, *Blue
Marble: Clouds* (`cloud_combined_8192.tif`, <https://visibleearth.nasa.gov/images/57747>), reduced
to 4096 × 2048 and its density curve matched to the three.js cloud map it replaces.
`earth_lights_4096.jpg`: `earth_night_4096.jpg` from the same three.js examples (NASA *Black
Marble* derivative, <https://earthobservatory.nasa.gov/features/NightLights>), colour-matched to
the 2048 night map it replaces. NASA imagery is not protected by copyright in the United States
(NASA Images and Media Usage Guidelines); NASA is credited as the source.

Used for the Earth in every 3-D view (the 4096 maps) and the 2-D ground-track maps (the 2048
colour map), and in the screenshots made from them.

### Launch audio — `public/audio/soyuz-ms-27-nasa.mp3`

NASA TV coverage of the launch of Soyuz MS-27 (NASA astronaut Jonny Kim, Roscosmos cosmonauts
Sergey Ryzhikov and Alexey Zubritsky), Baikonur Cosmodrome, 8 April 2025: 600 s from T-60 s to
T+540 s, mono, 48 kbit/s. Played by the Watch level in step with the Soyuz launch
(`src/audio/soundtrack.ts`). Source: NASA Image and Video Library, video
iss073m260980444_NASA_Astronaut_Jonny_Kim_Soyuz_MS-27_Launch_250408 (<https://images.nasa.gov>).
NASA material is not protected by copyright in the United States (NASA Images and Media Usage
Guidelines); the broadcast carries the
Roscosmos launch-control loop under NASA's commentary. Details: `public/audio/CREDITS.txt`.

The other launches play the simulator's own synthesised sound (`src/audio/engine-sound.ts`), or a
recording the user adds, which stays in that browser and is not part of the project.

### Launch-vehicle photographs — `public/lessons/vehicles/`

Shown by the placement test and the printed worksheets (`src/lessons/assessment/photos.ts`), each
with its author and licence. All from Wikimedia Commons, resized to at most 560 × 720 pixels; a
resized copy stays under its original licence (for CC BY-SA, the same licence). Details:
`public/lessons/vehicles/CREDITS.txt`.

| File | Original | Author | Licence |
| --- | --- | --- | --- |
| `soyuz21a.jpg` | [Expedition 50 Soyuz Rollout (NHQ201611140038).jpg](https://commons.wikimedia.org/wiki/File:Expedition_50_Soyuz_Rollout_(NHQ201611140038).jpg) | NASA/Victor Zelentsov | Public domain |
| `falcon9.jpg` | [NHQ202210010026 orig.jpg](https://commons.wikimedia.org/wiki/File:NHQ202210010026_orig.jpg) | NASA/Joel Kowsky | Public domain |
| `falconheavy.jpg` | [Falcon Heavy cropped.jpg](https://commons.wikimedia.org/wiki/File:Falcon_Heavy_cropped.jpg) | SpaceX | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| `starship.jpg` | [Starship full stack with Jeep.jpg](https://commons.wikimedia.org/wiki/File:Starship_full_stack_with_Jeep.jpg) | Hotel Pika | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) |
| `electron.jpg` | [Rocket Lab PREFIRE and Ice Launch (KSC-20240605-PH-RKL01 0004).jpg](https://commons.wikimedia.org/wiki/File:Rocket_Lab_PREFIRE_and_Ice_Launch_(KSC-20240605-PH-RKL01_0004).jpg) | NASA Kennedy Space Center / Rocket Lab | Public domain |
| `atlasv551.jpg` | [Atlas V 551 with New Horizons on Launch Pad 41.jpg](https://commons.wikimedia.org/wiki/File:Atlas_V_551_with_New_Horizons_on_Launch_Pad_41.jpg) | NASA | Public domain |
| `vulcan.jpg` | [Vulcan Centaur rollout (Peregrine) (cropped).jpg](https://commons.wikimedia.org/wiki/File:Vulcan_Centaur_rollout_(Peregrine)_(cropped).jpg) | NASA/Ben Smegelsky | Public domain |
| `longmarch5.jpg` | [Long March 5 rolling out at WSLS.jpg](https://commons.wikimedia.org/wiki/File:Long_March_5_rolling_out_at_WSLS.jpg) | Xiaojun Wang, China Academy of Launch Vehicle Technology | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| `angaraa5.jpg` | [Launch of Angara-A5 from Plesetsk Cosmodrome (2021-12-28) 2.jpg](https://commons.wikimedia.org/wiki/File:Launch_of_Angara-A5_from_Plesetsk_Cosmodrome_(2021-12-28)_2.jpg) | Russian Ministry of Defense | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| `longmarch2d.jpg` | [Long March 2D launching VRSS-1.jpg](https://commons.wikimedia.org/wiki/File:Long_March_2D_launching_VRSS-1.jpg) | Cristóbal Alvarado Minic | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| `protonm.jpg` | [On the launch pad.jpg](https://commons.wikimedia.org/wiki/File:On_the_launch_pad.jpg) | alexpgp | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) |

### Web fonts (online mode only, not shipped)

In online mode the interface asks Google Fonts for DM Sans, Space Grotesk and Noto Sans Thai
(`src/ui/web-fonts.ts`); offline, the default, it does not. The fonts are not bundled. They are
served under the SIL Open Font License 1.1 (<https://fonts.google.com/>).

## Data shipped in the app

| What | Where in Orbitlab | Terms | Source |
| --- | --- | --- | --- |
| Satellite element sets (GP data, TLE/OMM) | `public/data/satellites.json`; fetched online by `src/provider/satellites.ts`, at most once in two hours; the Orbit section's real satellites, passes, overflights, close approaches | Terms: see source | CelesTrak, <https://celestrak.org/NORAD/elements/> |
| Space weather: F10.7 flux, Kp/Ap, the solar-cycle record and forecast | `public/data/space-weather.json`; fetched online by `src/provider/space-weather.ts`; the orbit-lifetime and re-entry analysis | US Government (NOAA) data; terms: see source | NOAA Space Weather Prediction Center, <https://www.swpc.noaa.gov/> |
| Daily F10.7 and Ap since 1954 | `src/data/solar-daily.json`, made by `tests/fixtures/space-weather/make_solar_daily.py` | CC BY 4.0. Cite: Matzka, J., Bronkalla, O., Tornow, K., Elger, K. and Stolle, C. (2021), *Geomagnetic Kp index*, V. 1.0, GFZ Data Services, doi:10.5880/Kp.0001. The flux is the Dominion Radio Astrophysical Observatory's (Tapping 2013, doi:10.1002/swe.20064). The sunspot numbers in the same file (CC BY-NC 4.0) are not used. | GFZ Potsdam, <https://kp.gfz.de/>, <https://doi.org/10.5880/Kp.0001> |
| The months that began solar cycles 19 to 25 (seven dates, the minima of the smoothed sunspot number) | `src/physics/propagator/activity.ts`, the Sun beyond NOAA's forecast in the orbit-lifetime analysis | Facts only; terms: see source | SILSO, Royal Observatory of Belgium, <https://www.sidc.be/SILSO/cyclesminmax> |
| Earth orientation: UT1 − UTC and polar motion (Bulletin A, finals2000A) | `public/data/earth-orientation.json`; fetched online by `src/provider/earth-orientation.ts` | Terms: see source | IERS Earth Orientation Center, <https://datacenter.iers.org/> |
| NRLMSISE-00 atmosphere: the model and its coefficients | `src/physics/propagator/msis.ts`, `src/physics/propagator/msis-data.ts` (a port of the C release of 2004-12-27 by Dominik Brodowski) | Public domain: U.S. Government material, not subject to copyright in the United States (17 U.S.C. 403); NRL's notice says "the source code is in the public domain and not licensed or under copyright"; Brodowski's C release is placed in the public domain. No endorsement by or affiliation with the Naval Research Laboratory is implied. | M. Picone, A. Hedin and D. Drob, Naval Research Laboratory |
| Re-entry dates, masses and sizes of objects (Long March 5B core stages, NAPA-2, the re-entry cases) | `src/data/cz5b.ts`, `src/data/napa2.ts`, the re-entry lessons and worksheets | CC BY 4.0. Cite: McDowell, J., *General Catalog of Artificial Space Objects* | GCAT, <https://planet4589.org/space/gcat/> |
| Thailand's satellites (THEOS, THEOS-2, NAPA-1, NAPA-2, Thaicom) | `src/data/thai-satellites.ts`, each fact with its source | Facts only, each linked; terms: see source | eoPortal, Airbus, ISISPACE, Thaicom, Arianespace, Gunter's Space Page, Bangkok Post, Shephard, SatTrackCam Leiden, Wikipedia, the CelesTrak SATCAT |

## Published figures the model is built on and checked against

Vehicle, engine, site and satellite figures are facts taken from public documents, rounded and
recorded with their sources in `src/data/` and `docs/`. No manual, press kit or paper is bundled.
Terms: see each source.

- **Launch vehicles** (masses, thrust, specific impulse, timelines): SpaceX (Falcon 9, Falcon
  Heavy, <https://www.spacex.com/vehicles/falcon-9/>); Rocket Lab (Electron,
  <https://www.rocketlabusa.com/launch/electron/>, press kits and Payload User's Guide); ESA and
  Avio (Vega-C, <https://www.esa.int/Enabling_Support/Space_Transportation/Vega>); Arianespace
  (Ariane 64 launch kit, Soyuz CSG User's Manual); United Launch Alliance (Atlas V, Vulcan);
  International Launch Services (Proton-M); JAXA (H3 and H-IIA,
  <https://global.jaxa.jp/projects/rockets/h3/>); CGWIC (Long March user manuals,
  <http://www.cgwic.com/LaunchServices/LaunchVehicle/LM.html>); Roscosmos and RKTs Progress
  (Soyuz-2, <https://www.samspace.ru/products/launch_vehicles/rn_soyuz_2/>); ISRO (PSLV,
  <https://www.isro.gov.in/PSLV.html>); secondary sources as `docs/VALIDATION.md` and
  `docs/SIXDOF-VEHICLE-DATA.md` name them (Spaceflight Now, RussianSpaceWeb, Wikipedia).
- **Physics references**: US Standard Atmosphere 1976 (NASA-TM-X-74335,
  <https://ntrs.nasa.gov/citations/19770009539>); NASA Glenn, rocket thrust and the ideal rocket
  equation (<https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-thrust-equation/>);
  NASA, flight equations and reference frames (<https://ntrs.nasa.gov/citations/20160002944>);
  NASA, dynamics of variable-mass systems (<https://ntrs.nasa.gov/citations/19980210404>);
  ECSS-E-ST-10-04C (space environment).
- **Astrodynamics**: D. A. Vallado, *Fundamentals of Astrodynamics and Applications*, its worked
  examples and test vectors (<https://celestrak.org/software/vallado-sw.php>); H. D. Curtis,
  *Orbital Mechanics for Engineering Students*, worked examples; Vallado, Crawford, Hujsak and
  Kelso, "Revisiting Spacetrack Report #3", AIAA 2006-6753, whose reference implementation
  `src/orbit/sgp4.ts` follows (<https://celestrak.org/publications/AIAA/2006-6753/>).
- **Earth observation and missions**: eoPortal (<https://www.eoportal.org/>), USGS (Landsat,
  <https://www.usgs.gov/landsat-missions>), ESA (Sentinel missions), NASA — instrument swaths,
  fields of view, revisit periods and local times.
- **Studies cited for estimates**: Flohrer et al. 2008, Levit & Marshall 2011 and Kelso 2007
  (element-set accuracy); Klinkrad 2013 (re-entry windows); Shepperd, AMOS 2023 (the Iridium 33 –
  Cosmos 2251 conjunction); Alfano 2009 (test conjunctions); Kelso, AAS 09-368.

## Test fixtures (in the repository, not shipped in the app)

| What | Where | Terms | Source |
| --- | --- | --- | --- |
| SGP4 verification cases `SGP4-VER.TLE` and `tcppver.out` (AIAA 2006-6753) | `tests/fixtures/sgp4/` | As distributed with the `sgp4` package 2.27 (MIT licence) | <https://pypi.org/project/sgp4/>, <https://celestrak.org/publications/AIAA/2006-6753/> |
| The ISS element set in CelesTrak's six formats | `tests/fixtures/gp/` | Terms: see source | CelesTrak, <https://celestrak.org/NORAD/documentation/gp-data-formats.php> |
| Passes computed by Skyfield 1.55 with JPL DE421 | `tests/fixtures/passes/` | Skyfield: MIT licence; the fixture is its output | <https://rhodesmill.org/skyfield/> |
| NRLMSISE-00 reference points from NRL's Fortran via pymsis 0.13.0 | `tests/fixtures/msis/` | pymsis: MIT licence; NRLMSISE-00 as above | <https://github.com/SWxTREC/pymsis> |
| NASA CARA test conjunctions (the numbers only) | `tests/fixtures/conjunction/` | CARA Analysis Tools: NASA Open Source Agreement | <https://github.com/nasa/CARA_Analysis_Tools> |
| Re-entries of 1985–2004 with NORAD's element sets | `tests/fixtures/reentry/` | Re-entry dates: GCAT, CC BY 4.0. Element sets: J. McDowell's archive of historical element sets, only sets of NORAD origin before 2004, distributed without restriction; bundled with the owner's approval of 2026-09-27 | <https://planet4589.org/space/gcat/>, <https://planet4589.org/space/ele.html> |
| Seven spheres: element sets, masses and sizes, re-entries | `tests/fixtures/space-weather/spheres.json` | Element sets: CelesTrak, terms: see source; masses and sizes: Gunter's Space Page, Wikipedia, NASA ILRS documents, terms: see source; re-entries: GCAT, CC BY 4.0 | See `tests/fixtures/space-weather/README.md` |
| Rocket stages re-entered 2023–2025 | `tests/fixtures/reentry/stages.json` | GCAT, CC BY 4.0; CelesTrak's first element sets, terms: see source | See `tests/fixtures/space-weather/README.md` |
