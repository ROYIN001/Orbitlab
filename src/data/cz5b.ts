/**
 * The Long March 5B core stages (roadmap M03's case study): each reached
 * orbit with its payload and came down uncontrolled days later, a stage of
 * about 21.6 t — among the largest objects left to fall at random. Each is
 * kept here with its first element set and what is published of it.
 *
 * - Element sets: CelesTrak's first of each launch
 *   (https://celestrak.org/NORAD/elements/gp-first.php?INTDES=<launch>),
 *   fetched 2026-09-26.
 * - Mass, length, diameter and re-entry: GCAT, Jonathan McDowell's General
 *   Catalog of Artificial Space Objects (https://planet4589.org/space/gcat/,
 *   satcat.tsv of 2026-09-24: 21 600 kg, 31.7 m × 5.0 m, a cylinder; the
 *   DDate column for the re-entry, UTC to the minute).
 */
import type { OmmRecord } from '../provider/satellites';

export interface CoreStage {
  name: string;
  /** what it launched, as an i18n key */
  missionKey: string;
  elements: OmmRecord;
  /** kg */
  mass: number;
  /** m */
  length: number;
  diameter: number;
  /** re-entry, ISO 8601 UTC */
  reentry: string;
  /** where it came down, as GCAT gives it */
  where: string;
}

const CZ5B = { mass: 21600, length: 31.7, diameter: 5.0 };
const set = (e: Omit<OmmRecord, 'OBJECT_NAME' | 'EPHEMERIS_TYPE' | 'CLASSIFICATION_TYPE' | 'ELEMENT_SET_NO'>): OmmRecord =>
  ({ OBJECT_NAME: 'CZ-5B R/B', EPHEMERIS_TYPE: 0, CLASSIFICATION_TYPE: 'U', ELEMENT_SET_NO: 999, ...e });

export const CZ5B_STAGES: readonly CoreStage[] = [
  {
    name: 'CZ-5B Y1', missionKey: 'reentry.case.y1', ...CZ5B,
    elements: set({ OBJECT_ID: '2020-027C', EPOCH: '2020-05-05T14:12:34.828992', MEAN_MOTION: 16.03559389, ECCENTRICITY: 0.0161163, INCLINATION: 41.1011, RA_OF_ASC_NODE: 328.7321, ARG_OF_PERICENTER: 166.6361, MEAN_ANOMALY: 257.4141, NORAD_CAT_ID: 45601, REV_AT_EPOCH: 3, BSTAR: 0, MEAN_MOTION_DOT: -2.301e-05, MEAN_MOTION_DDOT: 7.2874e-06 }),
    reentry: '2020-05-11T15:34:00Z', where: '20° W 20° N (the Atlantic off West Africa)',
  },
  {
    name: 'CZ-5B Y2', missionKey: 'reentry.case.y2', ...CZ5B,
    elements: set({ OBJECT_ID: '2021-035B', EPOCH: '2021-04-29T09:08:16.520064', MEAN_MOTION: 16.00794398, ECCENTRICITY: 0.0154462, INCLINATION: 41.4803, RA_OF_ASC_NODE: 222.2892, ARG_OF_PERICENTER: 169.623, MEAN_ANOMALY: 265.048, NORAD_CAT_ID: 48275, REV_AT_EPOCH: 1, BSTAR: 0, MEAN_MOTION_DOT: -2.374e-05, MEAN_MOTION_DDOT: 7.5164e-06 }),
    reentry: '2021-05-09T02:14:00Z', where: '72.5° E 2.7° N (the Indian Ocean near the Maldives)',
  },
  {
    name: 'CZ-5B Y3', missionKey: 'reentry.case.y3', ...CZ5B,
    elements: set({ OBJECT_ID: '2022-085B', EPOCH: '2022-07-24T14:45:10.907712', MEAN_MOTION: 16.12160443, ECCENTRICITY: 0.0088901, INCLINATION: 41.4485, RA_OF_ASC_NODE: 350.9343, ARG_OF_PERICENTER: 168.3188, MEAN_ANOMALY: 191.994, NORAD_CAT_ID: 53240, REV_AT_EPOCH: 5, BSTAR: 0, MEAN_MOTION_DOT: -2.424e-05, MEAN_MOTION_DDOT: 7.6715e-06 }),
    reentry: '2022-07-30T16:51:00Z', where: '113° E 3° N (off Sarawak, Borneo)',
  },
  {
    name: 'CZ-5B Y4', missionKey: 'reentry.case.y4', ...CZ5B,
    elements: set({ OBJECT_ID: '2022-143B', EPOCH: '2022-10-31T13:01:40.143936', MEAN_MOTION: 16.11771814, ECCENTRICITY: 0.0106741, INCLINATION: 41.4662, RA_OF_ASC_NODE: 108.1202, ARG_OF_PERICENTER: 173.976, MEAN_ANOMALY: 186.2553, NORAD_CAT_ID: 54217, REV_AT_EPOCH: 3, BSTAR: 0.0004723, MEAN_MOTION_DOT: 0.01412633, MEAN_MOTION_DDOT: 7.589e-06 }),
    reentry: '2022-11-04T10:01:00Z', where: '114° W 2° S (the Pacific)',
  },
];
