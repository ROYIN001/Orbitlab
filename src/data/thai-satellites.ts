/**
 * Thailand's satellites (roadmap O04): the national Earth-observation
 * satellites THEOS and THEOS-2 (GISTDA), the Royal Thai Air Force's NAPA-1
 * and NAPA-2, and the Thaicom geostationary fleet. Public sources only, each
 * fact with the source it was taken from; the orbits are the US Space
 * Force's catalogue as CelesTrak republishes it, read on `THAI_SATELLITES_AS_OF`
 * — a nominal orbit, not where the satellite is today (tracking one from
 * its element set is roadmap R01–R02).
 *
 * Where two sources differ the difference is kept, not averaged: THEOS-2's
 * mass is 417 kg in one report and 425 kg in another, so neither is shown.
 */

export const THAI_SATELLITES_AS_OF = '2026-09-26';

export interface Source {
  title: string;
  url: string;
}

export interface ThaiSatellite {
  id: string;
  name: string;
  /** i18n key of who runs it and what it is for */
  aboutKey: string;
  operator: string;
  builder: string;
  launch: { date: string; vehicle: string; site: string };
  /** the international designator and the catalogue number */
  cospar: string;
  norad: number;
  /** from the catalogue: a geostationary satellite's slot, deg east, or a low orbit's perigee × apogee, km, and inclination, deg */
  orbit: { kind: 'geo'; longitude: number } | { kind: 'leo'; perigee: number; apogee: number; inclination: number };
  /** Earth observation: what the camera sees — ground sample distance, m, and swath, km — as published */
  imaging?: { gsd: number; swath?: number };
  /** a sun-synchronous satellite's published local time at the descending node, hours: from, to */
  ltdn?: readonly [number, number];
  /** a published repeat cycle: `revs` revolutions in `days` days */
  repeat?: { revs: number; days: number };
  /** still up (per the catalogue), or down on this date */
  reentered?: string;
  sources: readonly Source[];
}

const CELESTRAK = (n: number): Source => ({ title: `CelesTrak SATCAT, NORAD ${n}`, url: `https://celestrak.org/satcat/records.php?CATNR=${n}` });

export const THAI_SATELLITES: readonly ThaiSatellite[] = [
  {
    id: 'theos2', name: 'THEOS-2', aboutKey: 'thai.theos2.about', operator: 'GISTDA', builder: 'Airbus Defence and Space (AstroBus-S)',
    launch: { date: '2023-10-09', vehicle: 'Vega (VV23)', site: 'Kourou, French Guiana' },
    cospar: '2023-155A', norad: 58016,
    orbit: { kind: 'leo', perigee: 623, apogee: 625, inclination: 97.91 },
    imaging: { gsd: 0.5, swath: 10.3 },
    // "10:00-10:30 hours"
    ltdn: [10, 10.5],
    // "26 days"; 385 revolutions is the one whole number that puts a 26-day repeat at its published 621 km (tests/applications.test.ts)
    repeat: { revs: 385, days: 26 },
    sources: [
      { title: 'eoPortal: THEOS-2', url: 'https://www.eoportal.org/satellite-missions/theos-2' },
      { title: 'Airbus: THEOS-2 successfully launched (9 Oct 2023)', url: 'https://www.airbus.com/en/newsroom/press-releases/2023-10-theos-2-airbus-built-satellite-for-thailand-successfully-launched' },
      CELESTRAK(58016),
    ],
  },
  {
    id: 'theos', name: 'THEOS', aboutKey: 'thai.theos.about', operator: 'GISTDA', builder: 'EADS Astrium',
    launch: { date: '2008-10-01', vehicle: 'Dnepr', site: 'Yasny (Dombarovsky), Russia' },
    cospar: '2008-049A', norad: 33396,
    orbit: { kind: 'leo', perigee: 824, apogee: 826, inclination: 98.55 },
    imaging: { gsd: 2, swath: 22 },
    ltdn: [10, 10],
    // "26 days (14 5/26 orbits per day)"
    repeat: { revs: 369, days: 26 },
    sources: [
      { title: 'eoPortal: THEOS', url: 'https://www.eoportal.org/satellite-missions/theos' },
      CELESTRAK(33396),
    ],
  },
  {
    id: 'napa1', name: 'NAPA-1', aboutKey: 'thai.napa1.about', operator: 'Royal Thai Air Force', builder: 'ISISPACE (6U CubeSat)',
    launch: { date: '2020-09-03', vehicle: 'Vega (VV16)', site: 'Kourou, French Guiana' },
    cospar: '2020-061BA', norad: 46320,
    orbit: { kind: 'leo', perigee: 307, apogee: 310, inclination: 97.23 },
    imaging: { gsd: 39 },
    sources: [
      { title: 'ISISPACE: NAPA-1', url: 'https://www.isispace.nl/project/napa-1/' },
      { title: 'Bangkok Post: Air force satellite Napa-1 launched', url: 'https://www.bangkokpost.com/thailand/general/1979315/air-force-satellite-napa-1-launched' },
      { title: "Gunter's Space Page: NAPA 1, 2 (RTAF-SAT 1, 2)", url: 'https://space.skyrocket.de/doc_sdat/napa-1.htm' },
      CELESTRAK(46320),
    ],
  },
  {
    id: 'napa2', name: 'NAPA-2', aboutKey: 'thai.napa2.about', operator: 'Royal Thai Air Force', builder: 'ISISPACE (6U CubeSat)',
    launch: { date: '2021-06-30', vehicle: 'Falcon 9 (Transporter-2)', site: 'Cape Canaveral, Florida' },
    cospar: '2021-059CN', norad: 48963,
    // the orbit it flew in, as observed a month after launch (SatTrackCam Leiden); the catalogue's last is its decay
    orbit: { kind: 'leo', perigee: 520, apogee: 540, inclination: 97.5 },
    imaging: { gsd: 5 },
    reentered: '2026-07-05',
    sources: [
      { title: "Gunter's Space Page: NAPA 1, 2 (RTAF-SAT 1, 2)", url: 'https://space.skyrocket.de/doc_sdat/napa-1.htm' },
      { title: 'Shephard: Thailand launches second military satellite', url: 'https://www.shephardmedia.com/news/digital-battlespace/thailand-launches-second-military-satellite/' },
      { title: 'SatTrackCam Leiden (M. Langbroek), August 2021', url: 'https://sattrackcam.blogspot.com/2021/08/' },
      CELESTRAK(48963),
    ],
  },
  {
    id: 'thaicom4', name: 'Thaicom 4 (IPSTAR)', aboutKey: 'thai.thaicom4.about', operator: 'National Telecom (NT)', builder: 'Space Systems/Loral (LS-1300)',
    launch: { date: '2005-08-11', vehicle: 'Ariane 5G', site: 'Kourou, French Guiana' },
    cospar: '2005-028A', norad: 28786,
    orbit: { kind: 'geo', longitude: 119.5 },
    sources: [
      { title: 'Thaicom: Thaicom 4 (IPSTAR)', url: 'https://www.thaicom.net/satellites/thaicom-4-ipstar/' },
      { title: 'Arianespace: Ariane 5 successfully launches THAICOM 4 (IPSTAR)', url: 'https://www.arianespace.com/press-release/ariane-5-successfully-launches-thaicom-4-ipstar-for-thailand/' },
      CELESTRAK(28786),
    ],
  },
  {
    id: 'thaicom6', name: 'Thaicom 6', aboutKey: 'thai.thaicom6.about', operator: 'Thaicom', builder: 'Orbital Sciences (GEOStar-2)',
    launch: { date: '2014-01-06', vehicle: 'Falcon 9 v1.1', site: 'Cape Canaveral, Florida' },
    cospar: '2014-002A', norad: 39500,
    orbit: { kind: 'geo', longitude: 78.5 },
    sources: [
      { title: 'Wikipedia: Thaicom 6', url: 'https://en.wikipedia.org/wiki/Thaicom_6' },
      CELESTRAK(39500),
    ],
  },
  {
    id: 'thaicom7', name: 'Thaicom 7', aboutKey: 'thai.thaicom7.about', operator: 'Thaicom and AsiaSat (as AsiaSat 6)', builder: 'Space Systems/Loral (LS-1300)',
    launch: { date: '2014-09-07', vehicle: 'Falcon 9 v1.1', site: 'Cape Canaveral, Florida' },
    cospar: '2014-052A', norad: 40141,
    orbit: { kind: 'geo', longitude: 120 },
    sources: [
      { title: 'Wikipedia: Thaicom 7', url: 'https://en.wikipedia.org/wiki/Thaicom_7' },
      CELESTRAK(40141),
    ],
  },
  {
    id: 'thaicom8', name: 'Thaicom 8', aboutKey: 'thai.thaicom8.about', operator: 'Thaicom', builder: 'Orbital ATK (GEOStar-2)',
    launch: { date: '2016-05-27', vehicle: 'Falcon 9 Full Thrust', site: 'Cape Canaveral, Florida' },
    cospar: '2016-031A', norad: 41552,
    orbit: { kind: 'geo', longitude: 78.5 },
    sources: [
      { title: 'Thaicom: satellites (Thaicom 8 at 78.5° E)', url: 'https://www.thaicom.net/satellites/' },
      { title: 'Wikipedia: Thaicom 8', url: 'https://en.wikipedia.org/wiki/Thaicom_8' },
      CELESTRAK(41552),
    ],
  },
];

export const thaiSatelliteById = (id: string): ThaiSatellite | undefined => THAI_SATELLITES.find((s) => s.id === id);
