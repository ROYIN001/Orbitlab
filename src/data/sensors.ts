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
 * - `lookMaxDeg`, optical: the largest off-nadir angle the satellite turns
 *   its camera to, either side; 0 for an instrument fixed to look straight
 *   down, which sees its swath and nothing else; null where the satellite is
 *   agile but no angle is published (it is then not judged). For the Maxar
 *   (Vantor) satellites and SkySat it is the operator's tasking limit, not
 *   what the satellite could turn to: eoPortal gives ±40° for WorldView-1/2
 *   and ±60° for GeoEye-1 as body-pointing limits.
 * - `incidenceDeg`, radar: the incidence angles of the mode given, at the
 *   ground between the vertical and the beam.
 * - `side`, radar: the side of the track it looks to, only where a source
 *   says so; elsewhere it is not judged by side.
 * - `resolutionM`: the finest ground resolution of any of its modes (radar:
 *   the finer of range and azimuth), at nadir for a camera.
 * - `retired`: the date the operator ended it, where a source records that
 *   the catalogue still lists as in orbit.
 *
 * Collected 2026-09-27 from the sources each entry lists; where two disagree,
 * the operator's figure is used and the other is noted beside it. The
 * satellites without an operator's page (THEOS, the Gaofen, Deimos-2,
 * VNREDSat-1, FORMOSAT-5, CSG, KOMPSAT-5) rest on eoPortal alone.
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
  // its native 30 cm class only within 24° of nadir
  { name: 'WorldView Legion 1', norad: [59625], kind: 'optical', instrument: 'WorldView Legion', swathKm: 10, lookMaxDeg: 45, resolutionM: 0.34, sources: ['https://pacgeo.com/wp-content/uploads/2025/12/Vantor_WorldView-Legion_25AUG2025_Datasheet_PacGeo.pdf', MAXAR_TASKING] },
  // Planet's figures (eoPortal's older ones: 8 km, 0.9 m); 30° is Planet's default tasking limit
  { name: 'SkySat-C1', norad: [41601], kind: 'optical', instrument: 'SkySat', swathKm: 5.73, lookMaxDeg: 30, resolutionM: 0.65, sources: ['https://docs.planet.com/data/imagery/skysat/', 'https://docs.planet.com/platform/get-started/access-data/task-imagery/create_orders/'] },
  // eoPortal 15 km, elsewhere 16.8 km; roll ±45°, pitch ±30°
  { name: 'KOMPSAT-3', norad: [38338], kind: 'optical', instrument: 'AEISS', swathKm: 15, lookMaxDeg: 45, resolutionM: 0.7, sources: [EOPORTAL('kompsat-3')] },
  { name: 'KOMPSAT-3A', norad: [40536], kind: 'optical', instrument: 'AEISS-A', swathKm: 12, lookMaxDeg: 45, resolutionM: 0.55, sources: [EOPORTAL('kompsat-3a'), 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5087559/'] },
  // agile ("rapid fore-aft and cross-track steering"), no angle published
  { name: 'Cartosat-3', norad: [44804], kind: 'optical', instrument: 'PAN', swathKm: 16, lookMaxDeg: null, resolutionM: 0.25, sources: [EOPORTAL('cartosat-3'), 'https://www.isro.gov.in/Cartosat_3.html'] },
  // the figures of its identical sister, Cartosat-2D; its reach is given as a 400 km field of regard, not an angle
  { name: 'Cartosat-2C', norad: [41599], kind: 'optical', instrument: 'PAN', swathKm: 9.6, lookMaxDeg: null, resolutionM: 0.65, sources: [EOPORTAL('cartosat-2d')] },
  // roll about 25° normally, 35° at most
  { name: 'Gaofen-1', norad: [39150], kind: 'optical', instrument: 'PMC', swathKm: 69, lookMaxDeg: 35, resolutionM: 2, sources: [EOPORTAL('gaofen-1')] },
  { name: 'Gaofen-2', norad: [40118], kind: 'optical', instrument: 'PMC-2', swathKm: 45, lookMaxDeg: 35, resolutionM: 0.8, sources: [EOPORTAL('gaofen-2')] },
  { name: 'Deimos-2', norad: [40013], kind: 'optical', instrument: 'HiRAS', swathKm: 12, lookMaxDeg: 45, resolutionM: 1, sources: [EOPORTAL('deimos-2-geosat-2')] },
  { name: 'VNREDSat-1', norad: [39160], kind: 'optical', instrument: 'NAOMI', swathKm: 17.5, lookMaxDeg: 30, resolutionM: 2.5, sources: [EOPORTAL('vnredsat-1')] },
  { name: 'FORMOSAT-5', norad: [42920], kind: 'optical', instrument: 'RSI', swathKm: 24, lookMaxDeg: 45, resolutionM: 2, sources: [EOPORTAL('formosat-5')] },
  // step and stare: 7 km frames, strips of 14 to 28 km; agile, no angle published
  { name: 'CO3D', norad: [64900, 64901, 64902, 64903], kind: 'optical', instrument: 'CO3D', swathKm: 7, lookMaxDeg: null, resolutionM: 0.5, sources: [EOPORTAL('co3d-constellation'), 'https://cnes.fr/en/projects/co3d'] },

  // ─── radar ───
  // interferometric wide swath, its main mode over land; "The SENTINEL-1 C-band radar antenna beam illuminates the ground to the right side of the satellite"
  { name: 'Sentinel-1A', norad: [39634], kind: 'sar', instrument: 'C-SAR', swathKm: 250, incidenceDeg: [29.1, 46], side: 'right', resolutionM: 5, sources: ['https://sentiwiki.copernicus.eu/web/s1-mission', 'https://sentinel.esa.int/web/sentinel/technical-guides/sentinel-1-sar/sar-instrument/description'] },
  // StripMap at full performance (reachable 15–60°); staring spotlight 0.24 m in azimuth
  { name: 'TerraSAR-X and TanDEM-X', norad: [31698, 36605], kind: 'sar', instrument: 'TSX-SAR', swathKm: 30, incidenceDeg: [20, 45], resolutionM: 0.24, sources: [EOPORTAL('terrasar-x'), 'https://www.dlr.de/en/research-and-transfer/projects-and-missions/terrasar-x/synthetic-aperture-radar-sar'] },
  // HIMAGE stripmap; ASI 20–59° (eoPortal 25–57°)
  { name: 'COSMO-SkyMed', norad: [32376, 37216], kind: 'sar', instrument: 'SAR-2000', swathKm: 40, incidenceDeg: [20, 59], resolutionM: 1, sources: [CSK, EOPORTAL('cosmo-skymed')] },
  { name: 'COSMO-SkyMed 1', norad: [31598], kind: 'sar', instrument: 'SAR-2000', swathKm: 40, incidenceDeg: [20, 59], resolutionM: 1, retired: '2025-04-13', sources: [CSK, EOPORTAL('cosmo-skymed')] },
  { name: 'COSMO-SkyMed 3', norad: [33412], kind: 'sar', instrument: 'SAR-2000', swathKm: 40, incidenceDeg: [20, 59], resolutionM: 1, retired: '2022-04-30', sources: [CSK, EOPORTAL('cosmo-skymed')] },
  // stripmap 40 km to 50° of incidence, 30 km beyond
  { name: 'COSMO-SkyMed Second Generation', norad: [44873, 51444], kind: 'sar', instrument: 'CSG-SAR', swathKm: 40, incidenceDeg: [20, 60], resolutionM: 0.35, sources: [EOPORTAL('cosmo-skymed-second-generation')] },
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
];
