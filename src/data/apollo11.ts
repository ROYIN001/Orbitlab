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

/**
 * The service propulsion system as it flew on Apollo 11: its specific impulse
 * and flow from the lunar orbit insertion, the flight's longest burn — the
 * spacecraft weighed 43,572.8 kg at its ignition and 32,675.7 kg at its
 * cut-off 357.53 s later, for 2,917.5 ft/s (MR Table A-I; ORL): 315.1 s and
 * 30.48 kg/s, 94.18 kN. (Rated 20,500 lbf, 91.19 kN: the propellant
 * utilisation valve, moved to "increase" 76 s into that burn, raised the
 * thrust; MR §8.8.)
 */
export const SPS = { thrust: 94.18e3, isp: 315.1 };

/** Feet a second to metres. */
const FPS = 0.3048;
/** Pounds of thrust to newtons. */
const LBF = 4.4482216;

/**
 * The lunar module's descent engine (LMDE): 9,870 lbf at its fixed throttle
 * position, throttleable between 1,050 and 6,300 lbf and not between that and
 * the fixed position (press kit; AER-DPS); 300.5 s, the vehicle's specific
 * impulse the LM data book predicted for LM-5's engine; and the throttle at
 * which the guidance leaves the fixed position for the throttle — its
 * "throttle recovery" — 57 % of the 10,500 lbf rating.
 */
export const DPS = { ftp: 9870 * LBF, max: 6300 * LBF, min: 1050 * LBF, recovery: 0.57 * 10500 * LBF, rated: 10500 * LBF, isp: 300.5 };

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
  /**
   * the circularization, LOI-2: 80:11:36.75, 16.88 s, 158.8 ft/s, aimed at 65.7 × 53.7 n mi and reaching
   * 65.7 × 53.8 (MR §7.4.4; ORL: 66.1 × 54.5)
   */
  loi2: { t: get(80, 11, 36.75), duration: 16.88, dv: 158.8 * FPS, apolune: 65.7 * NMI, perilune: 53.7 * NMI },
  /**
   * What the spacecraft weighed at each of its burns' ignitions, kg (MR Table A-I): what the reaction control
   * system, the crew and the venting used between the burns, which the model does not fly, is taken from it.
   */
  mass: { mcc2: 43734.6, loi1: 43572.8, loi2: 32667.7 },
  /** Tranquility Base, selenographic, deg (MR: 0.67408° N, 23.47297° E) and the landing, 102:45:39.9 (MR Table 3-I) */
  landing: { lat: 0.67408, lon: 23.47297, t: get(102, 45, 39.9) },
  /**
   * Undocking, 100:12:00.0; the LM then weighed 15,278.6 kg and the CSM 16,817.7 kg (MR Tables 3-I, A-I). The
   * CSM's separation maneuver, 100:39:52.9, 2.7 ft/s radially down with its service module's thrusters, 9.0 s
   * (MR §7.4.5; press kit: 2.5 ft/s radially downward, for a 2.2 n mi separation half a revolution later).
   */
  undocking: { t: get(100, 12, 0), lm: 15278.6, csm: 16817.7 },
  csmSep: { t: get(100, 39, 52.9), dv: 2.7 * FPS, duration: 9.0 },
  /**
   * Descent orbit insertion with the descent engine: 101:36:14, 30.0 s, 76.4 ft/s, 15 s at 10 % throttle then
   * 40 %, targeted to 60 × 8.2 n mi with the pericynthion 260 n mi up range of the landing site, into
   * 58.5 × 7.8 n mi (ORL; MR §5.1, §9.8.1; press kit); 15,272.3 kg at ignition, 15,150.7 kg after.
   */
  doi: { t: get(101, 36, 14), duration: 30.0, dv: 76.4 * FPS, perilune: 8.2 * NMI, low: 15, lowThrottle: 0.10, highThrottle: 0.40, mass: 15272.3 },
  /**
   * Powered descent: ignition 102:33:05.01 at the pericynthion, 26 s at the minimum throttle, then the fixed
   * throttle position to the throttle recovery at 102:39:31; the approach phase (P64) from 102:41:32 at high
   * gate, 7,129 ft up and descending at 125 ft/s; manual control, and the rate-of-descent mode (P66) from
   * 102:43:22 at about 400 ft; the landing 102:45:39.9, the engine off 102:45:41.4 (MR Table 5-I, §5.3; ORL).
   * The LM weighed 15,150.7 kg at ignition and 7,327.0 kg on the surface (MR Table A-I). The ignition was at
   * 1.02° N 39.39° E (MR Table 7-II), 482.3 km round the Moon from where Eagle landed: the guidance computer
   * timed it by the LM's position (P63's ignition algorithm), the model by that distance.
   */
  pdi: { t: get(102, 33, 5.01), ullage: 26, mass: 15150.7, landedMass: 7327.0, range: 482.3e3 },
  highGate: { t: get(102, 41, 32), alt: 7129 * 0.3048, vz: -125 * FPS },
  lowGate: { t: get(102, 43, 22), alt: 400 * 0.3048 },
  engineOff: get(102, 45, 41.4),
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
