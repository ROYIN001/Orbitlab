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

/**
 * The ascent engine (APS), not throttleable: the predicted steady-state
 * operating points 10 s and 400 s into the ascent (MR Table 9.9-I; the measured
 * pressures matched them), linear between.
 */
export const APS = [{ t: 10, thrust: 3464 * LBF, isp: 309.4 }, { t: 400, thrust: 3439 * LBF, isp: 308.8 }] as const;

/**
 * The LM's reaction control system for the rendezvous: two 100-lbf thrusters
 * along the axis (CSI's 51.6 ft/s took 47.0 s on 2.67 t: 0.34 m/s², MR Table 5-VI,
 * §5.7); 290 s, the thrusters' steady-state specific impulse (approximate).
 */
export const LM_RCS = { thrust: 2 * 100 * LBF, isp: 290 };

/**
 * The service module's reaction control system for the transearth correction:
 * four 100-lbf thrusters along the axis (MCC-5's 4.8 ft/s took 11.2 s on 12 t,
 * MR Table 7-VI); 290 s (approximate).
 */
export const SM_RCS = { thrust: 4 * 100 * LBF, isp: 290 };

/** Pounds to kilograms. */
const LB = 0.45359237;

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
  /**
   * The ascent: lift-off 124:22:00.79 and the ascent engine's cut-off at 124:29:15.67 (MR Table 3-I, §5.6); 10 s of
   * vertical rise to 50 ft/s, then the pitch-over (press kit); aimed at 60,000 ft, climbing at 32 ft/s, 5,534.9 ft/s
   * down range — flown 60,300 ft, 32 ft/s, 5,537.0 ft/s — into 47.3 × 9.5 n mi (MR Table 5-V). The ascent stage
   * weighed 10,776.6 lb at lift-off and 5,928.6 lb at insertion (MR Table A-I). The lift-off was timed for the
   * CSM: the insertion 166 n mi west of the landing site, the CSM then about 255 n mi ahead (press kit).
   */
  ascent: { t: get(124, 22, 0.79), cutoff: get(124, 29, 15.67), vertical: 10, alt: 60000 * FPS, vr: 32 * FPS, vh: 5534.9 * FPS,
    apolune: 47.3 * NMI, perilune: 9.5 * NMI, mass: 10776.6 * LB, insertionMass: 5928.6 * LB, downrange: 166 * NMI, lead: 255 * NMI },
  /**
   * The rendezvous, all on the LM's thrusters (MR §5.7, Tables 3-I, 5-VI; press kit): CSI at 125:19:35, 51.6 ft/s
   * posigrade in 47.0 s, targeted to put the LM 15 n mi under the CSM at CDH; CDH at 126:17:49.6, 19.9 ft/s in all,
   * the orbits made coelliptic; TPI at 127:03:51.8, 25.4 ft/s, when the CSM stood 26.6° above the LM's horizon,
   * for an intercept 130° of the CSM's orbit later; two midcourse corrections, 127:18:30.8 and 127:33:30.8;
   * braking from 127:36:57.3, station-keeping from 127:52:05.3, docking at 128:03:00.0. The LM weighed 5,881.5 lb
   * at CSI and 5,738.0 lb at the docking, the CSM 36,847.4 lb (MR Table A-I).
   */
  csi: { t: get(125, 19, 35), dv: 51.6 * FPS, dh: 15 * NMI, mass: 5881.5 * LB },
  cdh: { t: get(126, 17, 49.6), dv: 19.9 * FPS },
  tpi: { t: get(127, 3, 51.8), dv: Math.hypot(22.9, 1.4, 11.0) * FPS, elevation: 26.6, transfer: 130 },
  lmMcc: [get(127, 18, 30.8), get(127, 33, 30.8)],
  braking: get(127, 36, 57.3),
  stationkeeping: get(127, 52, 5.3),
  redocking: { t: get(128, 3, 0), lm: 5738.0 * LB, csm: 36847.4 * LB },
  /**
   * The ascent stage jettisoned at 130:09:31.2, the CSM then 37,100.5 lb with the crew, the samples and the film
   * in it; the final separation at 130:30:01.0, 2.2 ft/s in 7.2 s (MR Tables 3-I, 7-V, A-I; flown retrograde by
   * the CSM in the model, as the press kit planned it).
   */
  jettison: { t: get(130, 9, 31.2), csm: 37100.5 * LB, lm: 5462.5 * LB },
  separation: { t: get(130, 30, 1), dv: 2.2 * FPS, duration: 7.2 },
  /**
   * The transearth injection: 135:23:42.3, 151.4 s, 3,279.0 ft/s on the service engine; the CSM weighed
   * 36,965.7 lb at its ignition (MR Tables 7-VI, A-I). It left the flight 0.79° from entering the air; the one
   * correction, MCC-5 at 150:29:57.4, 4.8 ft/s in 11.2 s on the service module's thrusters, put it on the entry
   * flown: 195:03:05.7, 400,000 ft up at 3.19° S 171.96° E, 36,194.4 ft/s, −6.48°, heading 50.18° (MR Tables 7-VI,
   * 7-VII).
   */
  tei: { t: get(135, 23, 42.3), duration: 151.4, dv: 3279.0 * FPS, mass: 36965.7 * LB },
  mcc5: { t: get(150, 29, 57.4), dv: 4.8 * FPS, duration: 11.2 },
  entryInterface: { t: get(195, 3, 5.7), fpa: -6.48, heading: 50.18, lat: -3.19, lon: 171.96, speed: 36194.4 * FPS },
  /** The CM's separation from the SM, 194:49:12.7; the CM 12,107.4 lb after it, 12,095.5 at the entry interface (MR Tables 3-I, A-I). */
  cmSep: { t: get(194, 49, 12.7), cm: 12107.4 * LB, ei: 12095.5 * LB },
  /**
   * The parachutes and the splashdown: drogues at 195:12:06.9, the landing at 195:18:35 at 13.30° N 169.15° W —
   * the target moved 215 n mi down range for the weather — 1,285 n mi from the entry interface; the CM weighed
   * 11,601.7 lb at the drogues, 11,318.9 at the mains and 10,873.0 lb in the water (MR Tables 3-I, 7-VII, A-I, §3).
   */
  splashdown: { drogue: get(195, 12, 6.9), t: get(195, 18, 35), lat: 13.30, lon: -169.15,
    drogueMass: 11601.7 * LB, mainMass: 11318.9 * LB, mass: 10873.0 * LB },
  /** the Moon's radius the Mission Report's lunar altitudes are above (the landing site's, PGNCS; MR Table 5-IV), m */
  siteRadius: 937.17 * NMI,
} as const;
