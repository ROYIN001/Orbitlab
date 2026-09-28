/**
 * The imaging instruments of the catalogue's Earth-imaging satellites, as
 * their operators and the mission handbooks publish them (roadmap P2.5, for
 * M02): what src/orbit/sensors.ts needs to judge whether a satellite passing
 * over a place can image it.
 *
 * The figures are in the units they are published in (km, degrees, m) and
 * turned into SI where they are read. Their conventions:
 *
 * - `swathKm`: the ground width of the standard mode at nadir.
 * - `lookMaxDeg`, optical: the largest off-nadir angle it turns its camera
 *   to, either side, by turning the satellite, the camera (Resourcesat-2's
 *   LISS-4) or a mirror (CBERS-4's PAN); 0 for an instrument fixed to look
 *   straight down, which sees its swath and nothing else (Oceansat-2's OCM-2
 *   tilts along the track only, and is fixed across it); null where the
 *   satellite is agile but no angle is published (it is then not judged).
 *   For HJ-1 and HY-1B the 0 is inferred from what the sources describe, and
 *   the entry says so. For the Maxar (Vantor) satellites and SkySat it is the
 *   operator's tasking limit, not what the satellite could turn to: eoPortal
 *   gives ±40° for WorldView-1/2 and ±60° for GeoEye-1 as body-pointing
 *   limits. For CO3D it is likewise a planning limit, its mission's
 *   acquisition plan, and for Cartosat-2C to 2F the figure its operator
 *   gives for the Cartosat-2 series. Where the along- and across-track limits
 *   differ it is the across-track one: src/orbit/sensors.ts judges a pass at
 *   its highest point, where the place is square to the track: the satellite
 *   rolls to see it there, and the along-track limit decides only how early
 *   or late in the pass it could.
 * - `incidenceDeg`, radar: the incidence angles of the mode given, at the
 *   ground between the vertical and the beam. SWOT's are worked out from the
 *   ground band its operator publishes, and its entry says so.
 * - `side`, radar: the side of the track it looks to, only where a source
 *   says so; elsewhere it is not judged by side.
 * - `resolutionM`: the finest ground resolution of any of its modes (radar:
 *   the finer of range and azimuth), at nadir for a camera. Where a camera's
 *   pixel differs across and along the track, or between its cameras, the
 *   entry says which figure it is.
 * - `retired`: the date its operator ended it, or as near as a source gives
 *   it (a year or a month where that is all; the entry says whose date it is
 *   and what it marks), for a satellite the catalogue still lists in orbit.
 *
 * Collected 2026-09-27, and for 44 satellites more on 2026-09-28, from the
 * sources each entry lists; where two disagree, the operator's figure is used
 * and the other is noted beside it, with one exception, left for the owner:
 * Cartosat-2C to 2F keep eoPortal's 0.65 m against the 0.6 m of NRSC's
 * product sheet for the series. The satellites without an operator's page
 * giving their geometry rest on eoPortal alone: THEOS, the Gaofen,
 * Deimos-2, VNREDSat-1, FORMOSAT-5, KOMPSAT-3, KOMPSAT-5, KazEOSat-1,
 * DubaiSat-1 and -2, Göktürk-1A, HJ-1A and -1B, TechSat-1B (MBRSC's page
 * gives the DubaiSats' orbits, not their cameras' figures); CSG's figures
 * are eoPortal's too (ESA agrees, and ASI's page for CSG-3 gives none).
 * Where the operator, builder or distributor publishes some figures but no
 * pointing angle, the limit is eoPortal's alone, and the entry says so:
 * KazEOSat-2, KazSTSAT, RASAT, ASNARO-1, Resurs-DK1, Resurs-P No.4.
 */

export interface SensorSpec {
  /** a name for the set of satellites */
  name: string;
  /** their NORAD catalogue numbers */
  norad: readonly number[];
  kind: 'optical' | 'sar';
  /** the instrument, by its own name */
  instrument: string;
  swathKm: number;
  /** optical, fixed: how far the swath's centre is to the right of the track in daylight, km (Sentinel-3's OLCI) */
  shiftKm?: number;
  lookMaxDeg?: number | null;
  incidenceDeg?: readonly [number, number];
  side?: 'right' | 'left' | 'both';
  resolutionM: number;
  retired?: string;
  sources: readonly string[];
}

const USGS_L8 = 'https://www.usgs.gov/landsat-missions/landsat-8';
const L9_HANDBOOK = 'https://d9-wret.s3.us-west-2.amazonaws.com/assets/palladium/production/s3fs-public/media/files/LSDS-2082_L9-Data-Users-Handbook_v1.pdf';
const S2 = 'https://sentiwiki.copernicus.eu/web/s2-mission';
const MODIS_SPEC = 'https://modis.gsfc.nasa.gov/about/specifications.php';
const MODIS_DESIGN = 'https://modis.gsfc.nasa.gov/about/design.php';
const OLCI = 'https://sentiwiki.copernicus.eu/web/s3-olci-instrument';
const SPOT_GUIDE = 'https://earth.esa.int/eogateway/documents/20142/37627/SPOT-6-7-imagery-user-guide.pdf';
const PLEIADES_GUIDE = 'https://www.rymdstyrelsen.se/contentassets/de0a9d767f6644389feab11535c91530/airbus-pleiades-imagery-user-guide-15042021.pdf';
const NEO_GUIDE = 'https://wp-cdn.apollomapping.com/web_assets/user_uploads/2021/11/08103301/2021.10_PleiadesNeo_UserGuide-EarlyRelease_20211015.pdf';
const VANTOR_SHEET = 'https://satpalda.co/wp-content/uploads/2025/12/Vantor-Constellation-Datasheet.pdf_geosmart-1.pdf-1.pdf.pdf-1.pdf';
const MAXAR_TASKING = 'https://pro-docs.maxar.com/en-us/Tasking/Tasking_requests_EO.htm';
const CSK = 'https://www.asi.it/wp-content/uploads/2019/08/COSMO-SkyMed-Mission-and-Products-Description_rev3-1.pdf';
const EOPORTAL = (id: string) => `https://www.eoportal.org/satellite-missions/${id}`;
const NRSC_C3 = 'https://www.nrsc.gov.in/nrscnew/assets/pdf/announcements/C3_BROCHURE_JAN2021_modified.pdf';
/** Lebègue, Cazala-Hourcade, Languille, Artigues, Melet (CNES), "CO3D, a worldwide one-meter accuracy DEM for 2025", ISPRS Archives XLIII-B1-2020, 299–304 */
const CO3D_ISPRS = 'https://doi.org/10.5194/isprs-archives-XLIII-B1-2020-299-2020';
const ESA_MISSION = (id: string) => `https://earth.esa.int/eogateway/missions/${id}`;
const LEGION_SHEET = 'https://pacgeo.com/wp-content/uploads/2025/12/Vantor_WorldView-Legion_25AUG2025_Datasheet_PacGeo.pdf';
/** Jiang, Lin, Zhang (NSOAS), "中国海洋卫星及应用进展", Journal of Remote Sensing 20(5), 2016, 1185–1198 */
const NSOAS_HY = 'https://www.ygxb.ac.cn/rc-pub/front/front-article/download/10665844/lowqualitypdf/%E4%B8%AD%E5%9B%BD%E6%B5%B7%E6%B4%8B%E5%8D%AB%E6%98%9F%E5%8F%8A%E5%BA%94%E7%94%A8%E8%BF%9B%E5%B1%95.pdf';
/** Khamsah, Utama, Surayuda, Hakim (LAPAN), "The Development of LAPAN-A3 Satellite Off-Nadir Imaging Mission", IEEE ICARES 2019 */
const LAPAN_A3_ICARES = 'https://doi.org/10.1109/ICARES.2019.8914347';

export const SENSORS: readonly SensorSpec[] = [
  // ─── optical, fixed to look straight down ───
  // the Landsat handbooks: nadir in normal operations; special collections roll up to 15°, not routinely
  { name: 'Landsat 8', norad: [39084], kind: 'optical', instrument: 'OLI', swathKm: 185, lookMaxDeg: 0, resolutionM: 15, sources: [USGS_L8] },
  { name: 'Landsat 9', norad: [49260], kind: 'optical', instrument: 'OLI-2', swathKm: 185, lookMaxDeg: 0, resolutionM: 15, sources: ['https://science.nasa.gov/mission/landsat-9/', L9_HANDBOOK] },
  // a 20.6° field of view, fixed; 10 m is its finest band (it has no panchromatic one)
  { name: 'Sentinel-2', norad: [40697, 42063, 60989], kind: 'optical', instrument: 'MSI', swathKm: 290, lookMaxDeg: 0, resolutionM: 10, sources: [S2] },
  // a ±55° scan; its thermal bands see at night too, the rest by day
  { name: 'Terra and Aqua', norad: [25994, 27424], kind: 'optical', instrument: 'MODIS', swathKm: 2330, lookMaxDeg: 0, resolutionM: 250, sources: [MODIS_SPEC, MODIS_DESIGN] },
  // "The whole field of view is shifted across track by 12.6° away from the sun": 68.5° wide, so from 21.65° on one side to
  // 46.85° on the other, which at 814.5 km is 327 km and 947 km of ground (tests/sensors.test.ts); by day, going south, west is right
  { name: 'Sentinel-3', norad: [41335, 43437], kind: 'optical', instrument: 'OLCI', swathKm: 1270, shiftKm: 310, lookMaxDeg: 0, resolutionM: 300, sources: [OLCI] },
  // ISRO's PSLV-C14 brochure: "a ground IFOV of 360 m in across track and 246 m in along track directions covering a swath of
  // 1420 km" (eoPortal and ESA: 360 × 236 m); 360 m, across the track, is the figure given. Its only tilt is along the track,
  // "±20º ... to avoid sun glint" (eoPortal), so it is fixed across it, "FOV (swath) 1420 km (±43º)". Retired: ESA's month
  // only, "ceased operations in December 2022" (eoPortal's summary line gives an end of life of 31 May 2023); ISRO records
  // that it "was disposed in an orbit at 900 km altitude" (ISSAR-2023)
  { name: 'Oceansat-2', norad: [35931], kind: 'optical', instrument: 'OCM-2', swathKm: 1420, lookMaxDeg: 0, resolutionM: 360, retired: '2022-12', sources: ['https://www.isro.gov.in/media_isro/pdf/PSLVC14/pslvc14_brochr.pdf', EOPORTAL('oceansat-2'), ESA_MISSION('oceansat-2'), 'https://www.isro.gov.in/Indian_Space_Situational_Assessment_Report_ISSAR2023.html', 'https://www.isro.gov.in/Oceansat_2.html'] },
  // GEOSAT's user guide (the operator's): "up to 20m resolution over a 600km swath", "22.0m ... considering Nadir observation
  // conditions"; eoPortal gives 660, 650, "> 600" and "~ 620 km", ESA 600 and "650 km (325 per bank)". Fixed: eoPortal's
  // "nadir-viewing" camera, two banks "angled away from nadir by approximately 13º" either side (so the swath is centred), on a
  // gravity-gradient platform; no source gives an angle to turn to. eoPortal's 52° field at ~661 km gives 653 km, not its
  // ~620 km (tests/sensors.test.ts, a finding)
  { name: 'Deimos-1 (GEOSAT-1)', norad: [35681], kind: 'optical', instrument: 'SLIM6', swathKm: 600, lookMaxDeg: 0, resolutionM: 22, sources: ['https://earth.esa.int/eogateway/documents/20142/37627/GEOSAT-1-Imagery-User-Guide.pdf', EOPORTAL('deimos-1'), ESA_MISSION('geosat-1')] },
  // eoPortal alone (CRESDA's pages could not be reached): "The two CCD cameras work together to form a 700 km wide swath" (its
  // WVC table: "360 km x 2 = 720 km"; 700 km, the smaller, is used), "The spatial resolution of the CCD camera is 30 m". Fixed
  // is INFERRED: "parallel camera mounts", and nothing on the page turns the satellite or these cameras (the HSI alone has
  // "±30º" of cross-track looking); the WVC's "aspect angle 31º" is not said to be a field or a pointing range. One
  // instrument a satellite: HJ-1A's HSI (100 m, 50 km) is not entered. Retired: eoPortal, "December 31, 2018: HJ-1A and HJ-1B
  // ended their mission"
  { name: 'HJ-1A and HJ-1B', norad: [33320, 33321], kind: 'optical', instrument: 'WVC', swathKm: 700, lookMaxDeg: 0, resolutionM: 30, retired: '2018-12-31', sources: [EOPORTAL('hj-1')] },
  // A paper by NSOAS, the operator (its director first), table 1: "海岸带成像仪(CZI)：4个波段，幅宽500 km"; eoPortal and WMO OSCAR
  // agree, and give 250 m at nadir. Fixed is INFERRED: an Earth-pointing, bias-momentum platform and no pointing mechanism for
  // the CZI in any source. eoPortal's "36º" field at 798 km gives 522 km (tests/sensors.test.ts, a finding). Retired: OSCAR's
  // end of life, "13 Feb 2016" (eoPortal's summary line gives 11 April 2011, four years to the day after launch)
  { name: 'HY-1B', norad: [31113], kind: 'optical', instrument: 'CZI', swathKm: 500, lookMaxDeg: 0, resolutionM: 250, retired: '2016-02-13', sources: [NSOAS_HY, EOPORTAL('hy-1b'), 'https://space.oscar.wmo.int/satellites/view/hy_1b', 'https://space.oscar.wmo.int/instruments/view/czi'] },
  // TANSO-CAI, the cloud and aerosol imager, bands 1–3: eoPortal, "a swath width of 1000 km and 0.5 km resolution" (ESA
  // agrees); its GOSAT-2 article's table lists GOSAT's CAI as "Nadir viewing", "1002 km (72º)". By day only. JAXA, the
  // operator, publishes no CAI figures. Still operating: eoPortal, "February 4, 2026: TANSO-FTS was restarted"
  { name: 'GOSAT', norad: [33492], kind: 'optical', instrument: 'TANSO-CAI', swathKm: 1000, lookMaxDeg: 0, resolutionM: 500, sources: [EOPORTAL('gosat'), EOPORTAL('gosat-2'), ESA_MISSION('gosat'), 'https://www.eorc.jaxa.jp/GOSAT/mission.html'] },
  // eoPortal alone: ERIP, a snapshot camera on "the fifth panel, pointing toward Earth", of a satellite stabilised "with
  // nadir-pointing accuracy of about 2º-2.5º": fixed. "Image size 25 km (along-track) x 31 km (cross-track)", "52 m along-track
  // x 60 m cross-track" (52 m, the finer, is given). Retired in March 2010, the month only: "the project decided to retire the
  // remarkably successful Gurwin-TechSat mission" (eoPortal, citing a message from the head of ASRI, its operator)
  { name: 'TechSat-1B (Gurwin-II)', norad: [25397], kind: 'optical', instrument: 'ERIP', swathKm: 31, lookMaxDeg: 0, resolutionM: 52, retired: '2010-03', sources: [EOPORTAL('techsat')] },

  // ─── optical, agile ───
  // ±45° in roll and pitch; ±30° of roll gives the 1000 km corridor
  { name: 'THEOS', norad: [33396], kind: 'optical', instrument: 'TOP', swathKm: 22, lookMaxDeg: 45, resolutionM: 2, sources: [EOPORTAL('theos')] },
  // eoPortal and GISTDA's user guide agree: 0.5 m, 10.3 km, ±45°
  { name: 'THEOS-2', norad: [58016], kind: 'optical', instrument: 'NAOMI', swathKm: 10.3, lookMaxDeg: 45, resolutionM: 0.5, sources: [EOPORTAL('theos-2'), 'https://gistda.or.th/download/ebookguide/UserGuideTHEOS-2_2A/files/basic-html/page5.html'] },
  // ±30° standard, ±45° extended; 2 m native, sold resampled to 1.5 m
  { name: 'SPOT 6', norad: [38755], kind: 'optical', instrument: 'NAOMI', swathKm: 60, lookMaxDeg: 45, resolutionM: 2, sources: [SPOT_GUIDE, EOPORTAL('spot-6-7')] },
  { name: 'SPOT 7', norad: [40053], kind: 'optical', instrument: 'NAOMI', swathKm: 60, lookMaxDeg: 45, resolutionM: 2, retired: '2023-03-17', sources: [SPOT_GUIDE, EOPORTAL('spot-6-7')] },
  // ±30° standard, ±47° at most; 0.7 m native, sold resampled to 0.5 m
  { name: 'Pléiades', norad: [38012, 39019], kind: 'optical', instrument: 'HiRI', swathKm: 20, lookMaxDeg: 47, resolutionM: 0.7, sources: [PLEIADES_GUIDE, EOPORTAL('pleiades')] },
  { name: 'Pléiades Neo', norad: [48268, 49070], kind: 'optical', instrument: 'Pléiades Neo', swathKm: 14, lookMaxDeg: 52, resolutionM: 0.3, sources: [NEO_GUIDE, EOPORTAL('pleiades-neo')] },
  { name: 'WorldView-1', norad: [32060], kind: 'optical', instrument: 'WV60', swathKm: 17.7, lookMaxDeg: 45, resolutionM: 0.5, sources: [VANTOR_SHEET, MAXAR_TASKING] },
  { name: 'WorldView-2', norad: [35946], kind: 'optical', instrument: 'WV110', swathKm: 16.4, lookMaxDeg: 45, resolutionM: 0.46, sources: [VANTOR_SHEET, MAXAR_TASKING] },
  // 13.1 km on its own sheet, 13.2 km on the constellation's
  { name: 'WorldView-3', norad: [40115], kind: 'optical', instrument: 'WV110', swathKm: 13.1, lookMaxDeg: 45, resolutionM: 0.31, sources: ['https://pacgeo.com/wp-content/uploads/2025/12/Vantor_WorldView-3_25AUG2025_Datasheet_PacGeo.pdf', MAXAR_TASKING] },
  // eoPortal: 15.2 km
  { name: 'GeoEye-1', norad: [33331], kind: 'optical', instrument: 'GIS', swathKm: 15.3, lookMaxDeg: 45, resolutionM: 0.41, sources: [VANTOR_SHEET, 'https://www.euspaceimaging.com/wp-content/uploads/GeoEye-1-Data-Sheet-2020.pdf', MAXAR_TASKING] },
  // its native 30 cm class only within 24° of nadir. Legion 2, 3 and 4 joined Legion 1 on 2026-09-28: the operator's one
  // datasheet is for the "fleet" ("Type: Sun-synchronous and mid-inclination": 1 and 2, then 3 and 4), and its tasking page
  // takes "Worldview Legion" as one
  { name: 'WorldView Legion', norad: [59625, 59626, 60452, 60453], kind: 'optical', instrument: 'WorldView Legion', swathKm: 10, lookMaxDeg: 45, resolutionM: 0.34, sources: [LEGION_SHEET, MAXAR_TASKING] },
  // Planet's swath and its default tasking limit, 30°, for the whole C generation ("multiple launches of the Planet SkySat-C
  // generation satellites", one telescope design); 0.65 m is ESA's, for SkySat-3 to -15, C1 to C13 (Planet's page gives only
  // "sampled at 50 centimeters per pixel when orthorectified"). ESA: "5.9 km at nadir"; eoPortal's older figures, 8 km and
  // 0.9 m. C2 to C11 joined C1 on 2026-09-28 (ESA's list of launches). Planet reported two decommissioned SkySats re-entered in
  // 2024 without naming them; no source says which of C1 to C11 are still tasked, so none is marked retired
  { name: 'SkySat-C1 to C11', norad: [41601, 41773, 41774, 41771, 41772, 42992, 42991, 42990, 42989, 42988, 42987], kind: 'optical', instrument: 'SkySat', swathKm: 5.73, lookMaxDeg: 30, resolutionM: 0.65, sources: ['https://docs.planet.com/data/imagery/skysat/', 'https://docs.planet.com/platform/get-started/access-data/task-imagery/create_orders/', ESA_MISSION('skysat')] },
  // eoPortal 15 km, elsewhere 16.8 km; roll ±45°, pitch ±30°
  { name: 'KOMPSAT-3', norad: [38338], kind: 'optical', instrument: 'AEISS', swathKm: 15, lookMaxDeg: 45, resolutionM: 0.7, sources: [EOPORTAL('kompsat-3')] },
  { name: 'KOMPSAT-3A', norad: [40536], kind: 'optical', instrument: 'AEISS-A', swathKm: 12, lookMaxDeg: 45, resolutionM: 0.55, sources: [EOPORTAL('kompsat-3a'), 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5087559/'] },
  // NRSC, ISRO's data centre: "a resolution of 0.28m ... a nominal swath of ~17 Km. The satellite is capable of steering up to
  // +45° and +26 ° along and across the track respectively" (its specification sheet: 0.28 m, 17 × 17 km). 26° is the
  // across-track limit, the one a pass is judged by at its highest point. eoPortal and Gunter's Space Page: 0.25 m and 16 km,
  // the design figures
  { name: 'Cartosat-3', norad: [44804], kind: 'optical', instrument: 'PAN', swathKm: 17, lookMaxDeg: 26, resolutionM: 0.28, sources: [NRSC_C3, 'https://bhoonidhi.nrsc.gov.in/bhoonidhi_resources/help/sampleprods/Cartosat-3/C3-Specs.pdf', EOPORTAL('cartosat-3'), 'https://www.isro.gov.in/Cartosat_3.html'] },
  // swath and resolution: its identical sister Cartosat-2D's. ISRO gives no angle for 2C, only that it "is similar to the earlier
  // Cartosat-2, 2A and 2B"; 26° is the series' figure, ISRO's for 2B: "steerable up to ± 26o along as well as across track".
  // eoPortal's 2D page says 45° ("off-nadir angles of up to 45 degrees"), as eoPortal and a Department of Space paper
  // (Radhadevi et al.) say for the first Cartosat-2 (2007) and eoPortal for 2B itself (±45° along and across, against
  // ISRO's ±26°); eoPortal's 2E page gives ±45° along the track and ±26° across. The operator's figure is used, and its
  // page comes first, so the source a user opens gives the angle the pass is judged by. The "field of regard of 400 km"
  // on eoPortal's 2D page is WMO OSCAR's text, which OSCAR gives for Cartosat-3's camera too.
  // 2D, 2E and 2F joined 2C on 2026-09-28: ISRO calls each "similar to the earlier" four, five and six "satellites of the
  // Cartosat-2 series" (its PSLV-C37 page, C38 and C40 brochures), eoPortal's 2E page says "steerable by ±45° along the track
  // and ±26° across the track", and NRSC sells the series as one product, "Cartosat-2S", from June 2016. NRSC's sheet for it
  // gives "Resolution: 0.6 mtrs" (and a 9 × 9 km scene, not the swath): eoPortal's 0.65 m is kept for the owner to decide,
  // the one place the operator's figure is not yet used
  { name: 'Cartosat-2C to 2F', norad: [41599, 41948, 42767, 43111], kind: 'optical', instrument: 'PAN', swathKm: 9.6, lookMaxDeg: 26, resolutionM: 0.65, sources: ['https://www.isro.gov.in/CARTOSAT_2B.html', 'https://www.isro.gov.in/CARTOSAT_2_PSLVC34.html', 'https://www.isro.gov.in/CARTOSAT_2_PSLVC37.html', 'https://www.isro.gov.in/CARTOSAT_2_PSLVC38.html', 'https://www.isro.gov.in/CARTOSAT_2_PSLVC40.html', 'https://www.isro.gov.in/media_isro/pdf/Missions/PSLV-C38.pdf', 'https://www.isro.gov.in/media_isro/pdf/Missions/PSLVC40/PSLV_C40.pdf', 'https://bhoonidhi.nrsc.gov.in/bhoonidhi_resources/help/sampleprods/Cartosat-2S/C2S-Specs.pdf', EOPORTAL('cartosat-2d'), EOPORTAL('cartosat-2e'), EOPORTAL('cartosat-2')] },
  // NRSC's handbook (the operator's): "off-nadir capability upto +/- 23 deg by providing roll biasing", "a swath of about 30 km"
  // (the Fore camera's; the Aft camera's 26.8 km, a stereo pair's 26 km), 2.5 m (ISRO and NRSC's headline figure; the
  // handbook's table gives 2.452 m for the Fore camera and 2.187 m for the Aft). eoPortal: a field of regard of ±26°, not used.
  // Retired: ESA's date, "ended operations on 5 May 2019"; no ISRO page gives one, and NRSC's archive runs to February 2019.
  // The Fore camera, canted 26° along the track, looks some 300 km ahead (618 km × tan 26°, worked out, not published), so
  // it images a place before the pass's highest point; the judgement across the track there still holds
  { name: 'Cartosat-1', norad: [28649], kind: 'optical', instrument: 'PAN-F, PAN-A', swathKm: 30, lookMaxDeg: 23, resolutionM: 2.5, retired: '2019-05-05', sources: ['https://bhuvan.nrsc.gov.in/bhuvan/PDF/cartosat1.pdf', 'https://www.isro.gov.in/CARTOSAT_1.html', 'https://bhoonidhi.nrsc.gov.in/bhoonidhi_resources/help/sampleprods/Cartosat-1/C1-Specs.txt', EOPORTAL('irs-p5'), ESA_MISSION('irs-p5')] },
  // ISRO's PSLV-C9 brochure: "can be steered ± 26 deg across-track nominally"; ISRO: "better than 1m and swath of 9.6 km".
  // 0.8 m is eoPortal's, along the track only, with the ground speed slowed 2.5 times ("< 1 m resolution across track").
  // eoPortal: ±45° along and across, not used. Retired in 2025, the year only: ISRO's ISSAR-2025, "became non-operational in 2025"
  { name: 'Cartosat-2A', norad: [32783], kind: 'optical', instrument: 'PAN', swathKm: 9.6, lookMaxDeg: 26, resolutionM: 0.8, retired: '2025', sources: ['https://www.isro.gov.in/media_isro/pdf/Cartosat-2A/CARTOSAT_2A_PUBLICATION.pdf', 'https://www.isro.gov.in/CARTOSAT_2A.html', EOPORTAL('cartosat-2a'), 'https://www.isro.gov.in/Indian_Space_Situational_Awareness_Report_2025.html'] },
  // ISRO: "steerable up to ± 26o along as well as across track", "a swath ... of 9.6 km with a resolution of better than 1
  // metre"; 0.8 m as for 2A (eoPortal, along the track only); eoPortal: ±45°, not used. The older, PAN-only camera, not 2C's
  // (eoPortal's table groups "CartoSat-2, -2A, -2B"). ISRO's ISSAR-2023 to -2025 record no end for it
  { name: 'Cartosat-2B', norad: [36795], kind: 'optical', instrument: 'PAN', swathKm: 9.6, lookMaxDeg: 26, resolutionM: 0.8, sources: ['https://www.isro.gov.in/CARTOSAT_2B.html', EOPORTAL('cartosat-2b')] },
  // LISS-4, on its payload steering motor: NRSC's handbook, "can be tilted up to ± 26° in the across track direction", "the full
  // swath of 70 Km" (in mono mode; in multispectral mode 70 km only over India, 23.5 km elsewhere), "5.8 m (at Nadir)"; ISRO
  // gives 2A the same, its payloads "similar to those of RESOURCESAT-1 and RESOURCESAT-2"; eoPortal agrees. LISS-3 and AWiFS
  // (740 km) are fixed and see less far: a 26° look from 817 km reaches 405 km from the track (on a sphere, not published)
  { name: 'Resourcesat-2 and 2A', norad: [37387, 41877], kind: 'optical', instrument: 'LISS-4', swathKm: 70, lookMaxDeg: 26, resolutionM: 5.8, sources: ['https://www.nrsc.gov.in/nrscnew/assets/pdf/handbooks/Rs2_handbook.pdf', 'https://www.isro.gov.in/RESOURCESAT_2A.html', 'https://www.isro.gov.in/media_isro/pdf/Missions/PSLV-C36.pdf', 'https://www.isro.gov.in/RESOURCESAT_2.html', EOPORTAL('resourcesat-2')] },
  // roll about 25° normally, 35° at most
  { name: 'Gaofen-1', norad: [39150], kind: 'optical', instrument: 'PMC', swathKm: 69, lookMaxDeg: 35, resolutionM: 2, sources: [EOPORTAL('gaofen-1')] },
  { name: 'Gaofen-2', norad: [40118], kind: 'optical', instrument: 'PMC-2', swathKm: 45, lookMaxDeg: 35, resolutionM: 0.8, sources: [EOPORTAL('gaofen-2')] },
  { name: 'Deimos-2', norad: [40013], kind: 'optical', instrument: 'HiRAS', swathKm: 12, lookMaxDeg: 45, resolutionM: 1, sources: [EOPORTAL('deimos-2-geosat-2')] },
  { name: 'VNREDSat-1', norad: [39160], kind: 'optical', instrument: 'NAOMI', swathKm: 17.5, lookMaxDeg: 30, resolutionM: 2.5, sources: [EOPORTAL('vnredsat-1')] },
  { name: 'FORMOSAT-5', norad: [42920], kind: 'optical', instrument: 'RSI', swathKm: 24, lookMaxDeg: 45, resolutionM: 2, sources: [EOPORTAL('formosat-5')] },
  // step and stare: 7 km frames, strips of 14 to 28 km. No operator publishes how far it can turn; 15° is a planning limit, from
  // the CNES paper of 2020 (before launch): "the CO3D acquisition plan limits roll angles to 15° and pitch angles to 20° for each
  // satellite of a stereo pair" (Lebègue et al., ISPRS Archives XLIII-B1-2020, 299–304): the 3D mission's limit, not what the satellites can turn to
  { name: 'CO3D', norad: [64900, 64901, 64902, 64903], kind: 'optical', instrument: 'CO3D', swathKm: 7, lookMaxDeg: 15, resolutionM: 0.5, sources: [EOPORTAL('co3d-constellation'), 'https://cnes.fr/en/projects/co3d', CO3D_ISPRS] },
  // KARI's image data manual: "a roll capability of ±56 degrees to support special imaging revisit cases", the largest, as for
  // SPOT and Pléiades ("Roll tilt: ±30°" for routine imaging); eoPortal agrees on 56° (its platform paragraph says ±45°, not
  // used). "a GSD of 1 meter for PAN ... a swath width of approximately 15 km". Retired: eoPortal, "December 30, 2024: ...
  // KOMPSAT-2 has now officially been retired" (KARI publishes no date)
  { name: 'KOMPSAT-2', norad: [29268], kind: 'optical', instrument: 'MSC', swathKm: 15, lookMaxDeg: 56, resolutionM: 1, retired: '2024-12-30', sources: ['https://earth.esa.int/eogateway/documents/20142/37627/KOMPSAT-2%20Image%20Data%20Manual', EOPORTAL('kompsat-2')] },
  // eoPortal alone: "Up the 35º off-nadir angle into any direction", "1 m (Pan) ... on a swath of 20 km" ("the swath is fixed
  // (20 km for KazEOSat-1)"). Its operator swapped the two KazEOSat names before launch; under the final names this is the
  // Astrium 1 m satellite, launched on Vega (2014-024A)
  { name: 'KazEOSat-1', norad: [39731], kind: 'optical', instrument: 'NAOMI', swathKm: 20, lookMaxDeg: 35, resolutionM: 1, sources: [EOPORTAL('kazeosat-1')] },
  // eoPortal: "an off-nadir body-pointing capability of ±35º", strips "at roll angles of up to 35º from nadir", 6.5 m on 77 km
  // (78 km in its instrument section); SSTL, its builder, gives "77km swath" and no angle
  { name: 'KazEOSat-2', norad: [40010], kind: 'optical', instrument: 'KEIS', swathKm: 77, lookMaxDeg: 35, resolutionM: 6.5, sources: [EOPORTAL('kazeosat-2'), 'https://www.sstl.co.uk/media-hub/latest-news/2014/sstl-announces-successful-launch-of-kazeosat-2'] },
  // SSTL, which built it with Ghalam, the operator: "18.7 m GSD with a swath width of 275 km"; eoPortal: "Up to 30º off-nadir
  // angle" (SSTL gives none), 275 km a channel and "~600 km" for its two banks (and 17.5 m, before launch)
  { name: 'KazSTSAT', norad: [43783], kind: 'optical', instrument: 'SLIM6 (EarthMapper)', swathKm: 275, lookMaxDeg: 30, resolutionM: 18.7, sources: ['https://www.sstl.co.uk/space-portfolio/launched-missions/2010-2019/kazstsat-launched-2018', EOPORTAL('kazstsat')] },
  // eoPortal alone (MBRSC's page gives no geometry): "2.5 m (Pan) ... Swath width 20 km at nadir", "a body pointing capability
  // of up to ±45º in along-track as well as in cross-track"; its "FOR (Field of Regard) 720 km" would be ±27.5° from MBRSC's
  // 682 km (on a sphere, not published). Retired: the date of MBRSC's report, quoted by eoPortal, that it "stopped imaging",
  // not the day it stopped, which no status report gives (eoPortal, "March 2017: ... has come to the end of its operational
  // life"); eoPortal's summary line gives an end of life of 29 July 2013, four years to the day after launch, but its own
  // status reports have it imaging in July 2015
  { name: 'DubaiSat-1', norad: [35682], kind: 'optical', instrument: 'DMAC', swathKm: 20, lookMaxDeg: 45, resolutionM: 2.5, retired: '2016-05-09', sources: [EOPORTAL('dubaisat-1'), 'https://www.mbrsc.ae/satellites/'] },
  // eoPortal alone (MBRSC's page gives no geometry): "1 m GSD ... The swath width of the generated image is 12 km", "up to
  // ±45º roll tilt, ±30º pitch tilt"
  { name: 'DubaiSat-2', norad: [39419], kind: 'optical', instrument: 'HiRAIS', swathKm: 12, lookMaxDeg: 45, resolutionM: 1, sources: [EOPORTAL('dubaisat-2')] },
  // TÜBİTAK UZAY, its builder and operator: "7.5 m Panchromatic", retired "August 23, 2022" (eoPortal's August 28 is its news
  // report's date); eoPortal: "Swath width 30 km", "an off-nadir body-pointing capability of ±30º in all directions"
  { name: 'RASAT', norad: [37791], kind: 'optical', instrument: 'OIS', swathKm: 30, lookMaxDeg: 30, resolutionM: 7.5, retired: '2022-08-23', sources: ['https://uzay.tubitak.gov.tr/en/rasat/', EOPORTAL('rasat')] },
  // eoPortal alone (Telespazio and CNES material): "a ground swath of 20 km at nadir and ... off-nadir imaging at angles of 30º
  // to either side", "0.7 m for Pan"; its summary's "swath width of 29 km" disagrees with its table and text. A military
  // satellite whose figures are public
  { name: 'Göktürk-1A', norad: [41875], kind: 'optical', instrument: 'HiRI', swathKm: 20, lookMaxDeg: 30, resolutionM: 0.7, sources: [EOPORTAL('gokturk-1')] },
  // eoPortal: "Pan: ≤ 0.5 m ... Swath width 10 km at nadir", "body pointing capability ±45º from nadir in any direction";
  // Tellus (data from PASCO and NEC) gives 0.5 m and 10 km and no angle; NEC and PASCO, 2024-11-07: still operating normally
  // (eoPortal's summary line gives an end of life of 11 June 2019; the operators' later statement is used)
  { name: 'ASNARO-1', norad: [40298], kind: 'optical', instrument: 'OPS', swathKm: 10, lookMaxDeg: 45, resolutionM: 0.5, sources: [EOPORTAL('asnaro'), 'https://www.tellusxdp.com/ja/catalog/data/asnaro-1_l1b.html', 'https://www.pasco.co.jp/press/2024/download/PPR20241107.pdf'] },
  // LAPAN's own authors: "15 meter resolution, 120 km swath-width" (Hakim et al., IJASCSE 2018), and "off-nadir imaging up to
  // 34.5° roll angle" (Khamsah et al., IEEE ICARES 2019, its abstract read through Semantic Scholar); eoPortal's 18 m and
  // 123 km are not used
  { name: 'LAPAN-A3', norad: [41603], kind: 'optical', instrument: 'LISA', swathKm: 120, lookMaxDeg: 34.5, resolutionM: 15, sources: ['https://arxiv.org/pdf/1901.09189', LAPAN_A3_ICARES, EOPORTAL('lapan-a3'), 'https://api.semanticscholar.org/graph/v1/paper/DOI:10.1109/ICARES.2019.8914347?fields=title,abstract'] },
  // NTs OMZ, the operator (its page as archived in 2016): "Swath width (at nadir): with H=350km ... up to28.3km", "No worse
  // than 1m", a 448 km field of regard; eoPortal: "± 30o into the cross-track direction". Its orbit was raised to some 570 km in
  // 2010 (eoPortal), where the swath is wider, but no figure is published for it. Retired: tracking stopped "due to
  // deactivation of onboard systems" from 7 February 2016 (RussianSpaceWeb, of the Russian tracking service, not the operator)
  { name: 'Resurs-DK1', norad: [29228], kind: 'optical', instrument: 'Geoton-1', swathKm: 28.3, lookMaxDeg: 30, resolutionM: 1, retired: '2016-02-07', sources: ['https://web.archive.org/web/20160414213214/http://eng.ntsomz.ru/ks_dzz/satellites/resurs_dk1', EOPORTAL('resurs-dk1'), 'https://www.russianspaceweb.com/resurs_dk.html', 'https://arxiv.org/pdf/1801.10310'] },
  // NTs OMZ, the operator: "полоса захвата (в надире) — 38 км" (eoPortal 38.6 km), "от 0,7 м" once in service ("не хуже 1 м"
  // at launch), and a "Ширина полосы обзора — 950 км"; eoPortal, citing Russian Space Systems: "roll and pitch can deviate from
  // nadir by up to ± 45°"
  { name: 'Resurs-P No.4', norad: [59371], kind: 'optical', instrument: 'Geoton-L1', swathKm: 38, lookMaxDeg: 45, resolutionM: 0.7, sources: ['https://ntsomz.ru/%D1%80%D0%B5%D1%81%D1%83%D1%80%D1%81-%D0%BF-%E2%84%96-4-%D0%BD%D0%B0-%D0%BE%D1%80%D0%B1%D0%B8%D1%82%D0%B5/', 'https://ntsomz.ru/rp4/', EOPORTAL('resurs-p')] },
  // INPE, one of its two operators: the PAN camera, "Largura da Faixa Imageada: 60 km", "5 m", "Visada Lateral de Espelho: ±
  // 32º" (a side-looking mirror); eoPortal agrees. PAN is the finest camera and the only one that points; WFI (866 km, 64 m)
  // is fixed
  { name: 'CBERS-4', norad: [40336], kind: 'optical', instrument: 'PAN', swathKm: 60, lookMaxDeg: 32, resolutionM: 5, sources: ['https://www.gov.br/inpe/pt-br/programas/cbers/sobre-o-cbers-1/cbers-3-e-4/cameras-imageadoras', EOPORTAL('cbers-3-4')] },
  // The operator's page (资源一号02C卫星): the two HR cameras, "2.36米分辨率 ... 幅宽达到54km", side swing "±25º" (the P/MS
  // camera: 5 m, 60 km, ±32° by a swing mirror), the high-resolution camera entered, as for Gaofen-1; eoPortal: 2.36 m on
  // 57 km, not used. Retired: eoPortal's and CEOS's end of life, 31 December 2018, perhaps a year's-end placeholder (WMO
  // OSCAR: "EOL: ≥2019", estimated)
  { name: 'ZY-1 02C', norad: [38038], kind: 'optical', instrument: 'HR', swathKm: 54, lookMaxDeg: 25, resolutionM: 2.36, retired: '2018-12-31', sources: ['https://www.sasclouds.com/satellite/chinese/zy102c', EOPORTAL('zy-1-02c'), 'https://database.eohandbook.com/database/missionsummary.aspx?missionID=731'] },

  // ─── radar ───
  // interferometric wide swath, its main mode over land; "The SENTINEL-1 C-band radar antenna beam illuminates the ground to the right side of the satellite"
  { name: 'Sentinel-1A', norad: [39634], kind: 'sar', instrument: 'C-SAR', swathKm: 250, incidenceDeg: [29.1, 46], side: 'right', resolutionM: 5, sources: ['https://sentiwiki.copernicus.eu/web/s1-mission', 'https://sentinel.esa.int/web/sentinel/technical-guides/sentinel-1-sar/sar-instrument/description'] },
  // StripMap at full performance (reachable 15–60°); staring spotlight 0.24 m in azimuth
  { name: 'TerraSAR-X and TanDEM-X', norad: [31698, 36605], kind: 'sar', instrument: 'TSX-SAR', swathKm: 30, incidenceDeg: [20, 45], resolutionM: 0.24, sources: [EOPORTAL('terrasar-x'), 'https://www.dlr.de/en/research-and-transfer/projects-and-missions/terrasar-x/synthetic-aperture-radar-sar'] },
  // HIMAGE stripmap; ASI 20–59° (eoPortal 25–57°)
  { name: 'COSMO-SkyMed', norad: [32376, 37216], kind: 'sar', instrument: 'SAR-2000', swathKm: 40, incidenceDeg: [20, 59], resolutionM: 1, sources: [CSK, EOPORTAL('cosmo-skymed')] },
  { name: 'COSMO-SkyMed 1', norad: [31598], kind: 'sar', instrument: 'SAR-2000', swathKm: 40, incidenceDeg: [20, 59], resolutionM: 1, retired: '2025-04-13', sources: [CSK, EOPORTAL('cosmo-skymed')] },
  { name: 'COSMO-SkyMed 3', norad: [33412], kind: 'sar', instrument: 'SAR-2000', swathKm: 40, incidenceDeg: [20, 59], resolutionM: 1, retired: '2022-04-30', sources: [CSK, EOPORTAL('cosmo-skymed')] },
  // stripmap 40 km to 50° of incidence, 30 km beyond. CSG-3 joined on 2026-09-28: ESA, "CSG-3, the third satellite, launched
  // on 3 January 2026", its stripmap "40 x 40 km"; CEOS lists it with the same "CSG SAR"; ASI, the operator, gives its new
  // antenna no figures of its own. It looks either way ("right and left looking modes", eoPortal), as an unset side is judged
  { name: 'COSMO-SkyMed Second Generation', norad: [44873, 51444, 67304], kind: 'sar', instrument: 'CSG-SAR', swathKm: 40, incidenceDeg: [20, 60], resolutionM: 0.35, sources: [EOPORTAL('cosmo-skymed-second-generation'), ESA_MISSION('cosmo-skymed-second-generation'), 'https://database.eohandbook.com/database/missionsummary.aspx?missionID=966', 'https://www.asi.it/2026/01/lanciato-con-successo-cosmo-skymed-csg-fm3-potenziato-il-sistema-italiano-di-osservazione-della-terra/'] },
  // standard beams (extended ones 10–60°)
  { name: 'RADARSAT-2', norad: [32382], kind: 'sar', instrument: 'C-band SAR', swathKm: 100, incidenceDeg: [20, 52], resolutionM: 0.8, sources: ['https://earth.esa.int/eogateway/documents/20142/0/Radarsat-2-Product-description.pdf/f2783c7b-6a22-cbe4-f4c1-6992f9926dca'] },
  // ultrafine stripmap; JAXA: "right-and-left looking"
  { name: 'ALOS-2', norad: [39766], kind: 'sar', instrument: 'PALSAR-2', swathKm: 50, incidenceDeg: [8, 70], side: 'both', resolutionM: 1, sources: ['https://www.eorc.jaxa.jp/ALOS/en/alos-2/a2_sensor_e.htm'] },
  // the 200 km stripmap; JAXA: "Regular stripmap mode observation is right-side, incidence angle of 30-44 degrees"
  { name: 'ALOS-4', norad: [60182], kind: 'sar', instrument: 'PALSAR-3', swathKm: 200, incidenceDeg: [30, 56], side: 'right', resolutionM: 1, sources: ['https://www.eorc.jaxa.jp/ALOS/en/alos-4/a4_sensor_e.htm'] },
  // standard mode (extended to 55°)
  { name: 'KOMPSAT-5', norad: [39227], kind: 'sar', instrument: 'COSI', swathKm: 30, incidenceDeg: [20, 45], resolutionM: 1, sources: [EOPORTAL('kompsat-5')] },
  // standard stripmap (other modes 10–60°)
  { name: 'Gaofen-3', norad: [41727], kind: 'sar', instrument: 'C-SAR', swathKm: 130, incidenceDeg: [17, 50], resolutionM: 1, sources: [EOPORTAL('gaofen-3')] },
  // P band; ESA's three sub-swaths 23–33.9° (eoPortal 23–35°); 12.5 m in azimuth is a design estimate (2012)
  { name: 'BIOMASS', norad: [63772], kind: 'sar', instrument: 'P-SAR', swathKm: 50, incidenceDeg: [23, 33.9], resolutionM: 12.5, sources: ['https://earth.esa.int/eogateway/missions/biomass/description', EOPORTAL('biomass')] },
  // KaRIn, a Ka-band interferometer for the heights of water, not a general imager. JPL's handbook: "two 50 km swaths from 10
  // to 60 km on each side of the nadir ground track", at 891 km. The incidence band is WORKED OUT from that on a sphere
  // (0.73° gives 10.0 km, 4.39° 60.0 km), not published: CNES's look angles, "-0.65° to 3.9°" (the minus sign presumably a
  // slip: a look past nadir would cross the gap), give 10.1 to 60.8 km, and eoPortal's "0.6-4.1º incidence" 8 to 56 km.
  // 5 m along the track (10 to 70 m across), and only where the high-rate data are downlinked, over target areas. The panel
  // shows the band rounded, as 1°–4°
  { name: 'SWOT', norad: [54754], kind: 'sar', instrument: 'KaRIn', swathKm: 50, incidenceDeg: [0.73, 4.39], side: 'both', resolutionM: 5, sources: ['https://www.earthdata.nasa.gov/s3fs-public/2024-06/D-109532_SWOT_UserHandbook_20240502.pdf', 'https://swot.jpl.nasa.gov/mission/flight-systems/', 'https://www.aviso.altimetry.fr/en/missions/current-missions/swot/instruments/karin-wide-swath-altimeter-in-ka-band.html', EOPORTAL('swot')] },
];
