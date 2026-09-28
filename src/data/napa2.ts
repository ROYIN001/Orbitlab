/**
 * NAPA-2, the Royal Thai Air Force's second Earth-observation satellite
 * (roadmap P2.5, a second case study for M03): a 6U CubeSat launched on
 * 2021-06-30 on SpaceX's Transporter-2 into a sun-synchronous orbit of about
 * 530 km, released from its carrier on 2021-07-18, and left to decay; it came
 * down on 2026-07-05, five years later, through the maximum of solar cycle 25.
 * A lifetime of years, where the Long March 5B stages' were days.
 *
 * - First element set: CelesTrak's
 *   (https://celestrak.org/NORAD/elements/gp-first.php?INTDES=2021-059),
 *   fetched 2026-09-27; it carries a decay rate (ṅ/2 = 8.47 × 10⁻⁶ rev/day²)
 *   for the ballistic coefficient to be fitted to.
 * - Mass, release and re-entry: GCAT (https://planet4589.org/space/gcat/,
 *   satcat.tsv of 2026-09-24: 10 kg, separated "2021 Jul 18", re-entered
 *   "2026 Jul 5", day only).
 * - Size: Janes, "SpaceX launches Royal Thai Air Force's second
 *   Earth-observation satellite", 2021: 20 × 10 × 34.05 cm, 10 kg.
 */
import type { OmmRecord } from '../provider/satellites';

export const NAPA2 = {
  name: 'NAPA-2',
  norad: 48963,
  /** kg */
  mass: 10,
  /** its three edges, m */
  size: [0.2, 0.1, 0.3405] as const,
  /** the day it re-entered (GCAT gives no time) */
  decay: '2026-07-05',
  elements: {
    OBJECT_NAME: 'NAPA-2', OBJECT_ID: '2021-059CN', EPOCH: '2021-07-25T14:22:47.113824', MEAN_MOTION: 15.11989955, ECCENTRICITY: 0.0015097,
    INCLINATION: 97.5116, RA_OF_ASC_NODE: 334.986, ARG_OF_PERICENTER: 135.4238, MEAN_ANOMALY: 224.821, EPHEMERIS_TYPE: 0, CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 48963, ELEMENT_SET_NO: 999, REV_AT_EPOCH: 450, BSTAR: 5.3016e-05, MEAN_MOTION_DOT: 8.47e-06, MEAN_MOTION_DDOT: 0,
  } satisfies OmmRecord,
  sources: {
    elements: 'https://celestrak.org/NORAD/elements/gp-first.php?INTDES=2021-059&FORMAT=json',
    gcat: 'https://planet4589.org/space/gcat/',
    size: 'https://www.janes.com/defence-intelligence-insights/defence-news/spacex-launches-royal-thai-air-forces-second-earth-observation-satellite',
  },
};
