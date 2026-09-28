/**
 * Apollo 11 from the S-IVB's ejection of the spacecraft on (roadmap C01): what
 * `ApolloFlight` flies and what it is judged against. Sources, as flown: the
 * Apollo 11 Mission Report MSC-00171 (MR) — the mass properties of Table A-I,
 * the maneuvers of Tables 7-III and 7-V, the timeline of Table 3-I — and
 * R. Orloff, *Apollo by the Numbers*, NASA SP-2000-4029 (ORL). Times are
 * ground elapsed time from range zero, 1969-07-16 13:32:00 UTC, in s.
 * docs/PHYSICS.md §13.10.
 */

/** h:mm:ss.s as seconds. */
export const get = (h: number, m: number, s: number): number => h * 3600 + m * 60 + s;

/** The service propulsion system: 20,500 lbf (Apollo 11 press kit), 314.2 s (Apollo 8's engine, measured; CSM-107's not published). */
export const SPS = { thrust: 91.19e3, isp: 314.2 };

/** Feet a second to metres. */
const FPS = 0.3048;

/** Nautical miles to metres. */
const NMI = 1852;

/** A predicted closest approach to the Moon: altitude, m; mission time, s; selenographic latitude and longitude, deg. */
export interface Pericynthion { alt: number; t: number; lat: number; lon: number }

export const APOLLO11 = {
  /** the CSM and LM docked, at the ejection, kg (MR Table A-I: 96,767.5 lb) */
  dockedMass: 43893.0,
  /** the SLA's panels and its fixed ring, left on the S-IVB with it, kg (1,792 kg; SP-4029) */
  slaMass: 1792,
  /**
   * The SPS evasive maneuver away from the S-IVB: 4:40:01.72, 2.93 s, 19.7 ft/s (ORL; MR Table 7-III),
   * planned to lower the pericynthion to 167.7 n mi (MR §7.4.2).
   */
  evasive: { t: get(4, 40, 1.72), dv: 19.7 * FPS, perilune: 167.7 * NMI },
  /**
   * The only translunar midcourse correction flown: 26:44:58.64, 3.13 s, 20.9 ft/s (ORL; MR Table 7-III),
   * aimed at a 60.0 n mi pericynthion and a node for the lunar orbit (MR §7.4.3). The node is not published:
   * the model aims at the pericynthion's latitude the burn gave, 0.17° N, and its time, 75:53:35 (MR Table 7-III).
   */
  mcc2: { t: get(26, 44, 58.64), dv: 20.9 * FPS, perilune: 60.0 * NMI, arrival: get(75, 53, 35), lat: 0.17 },
  /** the lunar sphere of influence entered, 61:39:55 (MR Table 3-I) */
  lunarSoi: get(61, 39, 55),
  /** lunar orbit insertion: LOI-1 ignition 75:49:50.37, 357.53 s, 2,917.5 ft/s, into 169.7 × 60.0 n mi (ORL; MR Table 7-V) */
  loi1: { t: get(75, 49, 50.37), duration: 357.53, dv: 2917.5 * FPS, apolune: 169.7 * NMI, perilune: 60.0 * NMI },
  /** Tranquility Base, selenographic, deg (MR: 0.67408° N, 23.47297° E) and the landing, 102:45:39.9 (MR Table 3-I) */
  landing: { lat: 0.67408, lon: 23.47297, t: get(102, 45, 39.9) },
  /**
   * The pericynthion predicted after each translunar maneuver (MR Table 7-III; altitudes above the landing
   * site's radius, 1,735.6 km): after the injection, the CSM's separation, the evasive maneuver and MCC-2.
   */
  pericynthion: {
    tli: { alt: 896.3 * NMI, t: get(75, 5, 21), lat: -0.11, lon: -174.13 },
    separation: { alt: 827.2 * NMI, t: get(75, 7, 47), lat: -0.09, lon: -174.89 },
    evasive: { alt: 180.8 * NMI, t: get(75, 39, 30), lat: 0.18, lon: 175.97 },
    mcc2: { alt: 61.5 * NMI, t: get(75, 53, 35), lat: 0.17, lon: 173.57 },
  } satisfies Record<string, Pericynthion>,
  /** the Moon's radius the Mission Report's lunar altitudes are above (the landing site's, PGNCS; MR Table 5-IV), m */
  siteRadius: 937.17 * NMI,
} as const;
