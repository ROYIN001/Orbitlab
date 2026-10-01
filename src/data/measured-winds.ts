/**
 * Winds measured on the day of a historical flight, flown on its way home
 * when the mission names them (C01: Vostok-1, `OrbitSpec.deorbit.wind`;
 * src/physics/measured-wind.ts; docs/PHYSICS.md §13.6). Each is one weather
 * station's record as the archives hold it: the radiosonde's winds at the
 * standard pressure levels, and the surface observer's wind at the synoptic
 * hours. Nothing here is a scenario: what the record lacks is said so.
 */

/** A wind: where it blows from, degrees clockwise from true north, and its speed, m/s. */
export interface WindReport {
  from: number;
  speed: number;
}

/** One radiosonde ascent: its nominal hour, and its levels that carry a wind. */
export interface WindSounding {
  /** UTC, ISO 8601 */
  time: string;
  /** each level's pressure, hPa, and its geopotential height above sea level, m, lowest first */
  levels: readonly (WindReport & { hPa: number; height: number })[];
}

export interface MeasuredWind {
  /** the station, its WMO index and where it stands, degrees */
  station: string;
  wmo: number;
  lat: number;
  lon: number;
  /** the height of the surface wind above sea level, m: the station's ground and the vane's mast */
  surfaceHeight: number;
  /** the surface observer's winds, at the synoptic hours (UTC, ISO 8601), oldest first */
  surface: readonly (WindReport & { time: string })[];
  /** the radiosonde's ascents, oldest first; the record is flown between the first and the last */
  upper: readonly WindSounding[];
  /**
   * Above the highest level any ascent gave a wind for, the record says
   * nothing: the wind is let fall off linearly from there to calm at this
   * height, m (an estimate; see the record).
   */
  calmAt: number;
}

/**
 * Saratov, 12 April 1961, the morning Vostok-1 came down 32 km south of the
 * station (Gagarin at 51.27° N 46.00° E, the sphere about 1.5 km away),
 * between 10:42 and 10:55 Moscow time, 07:42–07:55 UTC.
 *
 * Upper air: NOAA NCEI, Integrated Global Radiosonde Archive v2 (IGRA2),
 * station RSM00034172 "SARATOV (34170-1)", 51.5567° N 46.0394° E, 162.5 m,
 * file RSM00034172-data.txt (access/data-por), the ascents of 1961-04-12 at
 * 00 UTC (source ncar-ccd, the NCAR C-cards) and 12 UTC (ncdc6310, NCDC's
 * Global U/A Cards). Mandatory levels only; every height passed IGRA's two
 * climatology checks (flag B). The 00 UTC ascent's winds end at 400 hPa: its
 * 300, 200 and 100 hPa levels (8,750, 11,420 and 15,980 m) carry none. The
 * neighbours agree on the strong westerly aloft: at 400 hPa at 00 UTC
 * Volgograd (34467) had 44 m/s from 280°, Samara (28900) 30 m/s from 290°.
 *
 * Surface: NOAA NCEI Global Hourly (Integrated Surface Database), station
 * 34172099999 "TSENTRALNY", 51.565° N 46.047° E, 152 m, the synoptic reports
 * (FM-12) of 1961-04-12. The archive's speeds are whole knots converted
 * (3.1 m/s is 6 kn), good to about 0.5 m/s. The vane's 10 m above the
 * ground is the standard mast (WMO); the surface wind is taken at 162 m.
 * Gagarin: "Погода была отличная. Небольшая облачность, солнце, ветерок"
 * (Komsomolskaya Pravda, 15 April 1961).
 *
 * The 12 UTC wind at 100 hPa, 15,900 m, is the highest measured; above it
 * the wind is let fall to calm at 20 km. That is an estimate (in April the
 * westerlies over these latitudes weaken above the tropopause), which keeps
 * the air continuous where the sphere falls through it at some 300 m/s.
 * Calm straight above 15.9 km would put the sphere 0.3 km further west.
 */
export const SARATOV_1961_04_12: MeasuredWind = {
  station: 'Saratov', wmo: 34172, lat: 51.5567, lon: 46.0394,
  surfaceHeight: 162,
  surface: [
    { time: '1961-04-12T00:00:00Z', from: 290, speed: 7.2 },
    { time: '1961-04-12T03:00:00Z', from: 290, speed: 4.1 },
    { time: '1961-04-12T06:00:00Z', from: 270, speed: 3.1 },
    { time: '1961-04-12T09:00:00Z', from: 230, speed: 5.1 },
    { time: '1961-04-12T12:00:00Z', from: 180, speed: 8.2 },
  ],
  upper: [
    { time: '1961-04-12T00:00:00Z', levels: [
      { hPa: 850, height: 1404, from: 300, speed: 15 },
      { hPa: 700, height: 2876, from: 300, speed: 18 },
      { hPa: 500, height: 5300, from: 290, speed: 29 },
      { hPa: 400, height: 6830, from: 290, speed: 42 },
    ] },
    { time: '1961-04-12T12:00:00Z', levels: [
      { hPa: 850, height: 1428, from: 240, speed: 11 },
      { hPa: 700, height: 2912, from: 260, speed: 10 },
      { hPa: 500, height: 5340, from: 270, speed: 15 },
      { hPa: 400, height: 6860, from: 270, speed: 20 },
      { hPa: 300, height: 8740, from: 260, speed: 29 },
      { hPa: 200, height: 11390, from: 260, speed: 31 },
      { hPa: 100, height: 15900, from: 270, speed: 30 },
    ] },
  ],
  calmAt: 20000,
};

/** The records a mission can name, by id. */
export const MEASURED_WINDS: Readonly<Record<string, MeasuredWind>> = {
  'saratov-1961-04-12': SARATOV_1961_04_12,
};
