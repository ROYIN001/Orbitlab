/**
 * The Orbit section's Watch level (roadmap O01): a narrated tour of the
 * playground, step by step — Newton's cannon, then real orbits and why they
 * are shaped the way they are. Each step sets the playground up (an orbit, a
 * view, a pace, what is drawn) and says one thing in plain words; nothing in
 * it changes the physics, which is the playground's own.
 *
 * DOM-free: the playground reads the steps (src/ui/orbit/playground.ts), and
 * tests/orbit-tour.test.ts holds every step to a real orbit and to the
 * dictionaries.
 */
import { DEG } from '../physics/constants';

export type TourView = '3d' | 'track' | 'cannon';

export interface TourStep {
  id: string;
  /** i18n keys of the step's title and narration */
  titleKey: string;
  textKey: string;
  view: TourView;
  /** a playground preset (src/orbit/presets.ts), for the 3-D and ground-track views */
  preset?: string;
  /** start with the satellite over this longitude, rad east (the orbit turned about the pole to put it there) */
  lon?: number;
  /** Newton's cannon: the shot, m/s from a mountain `cannonAltitude` m high */
  cannonSpeed?: number;
  cannonAltitude?: number;
  /** seconds of orbit per second on screen */
  warp: number;
  /** draw Kepler's equal-time sectors */
  sectors?: boolean;
  /** carry J2's drift */
  j2?: boolean;
}

export const TOUR: readonly TourStep[] = [
  { id: 'cannonFalls', titleKey: 'tour.cannonFalls.title', textKey: 'tour.cannonFalls.text', view: 'cannon', cannonSpeed: 4000, cannonAltitude: 100e3, warp: 60 },
  { id: 'cannonOrbits', titleKey: 'tour.cannonOrbits.title', textKey: 'tour.cannonOrbits.text', view: 'cannon', cannonSpeed: 7850, cannonAltitude: 100e3, warp: 300 },
  { id: 'iss', titleKey: 'tour.iss.title', textKey: 'tour.iss.text', view: '3d', preset: 'iss', warp: 300 },
  { id: 'molniya', titleKey: 'tour.molniya.title', textKey: 'tour.molniya.text', view: '3d', preset: 'molniya', warp: 1800, sectors: true },
  // over 78.5° E, the orbital slot Thaicom's satellites use (roadmap O04 cites it)
  { id: 'geo', titleKey: 'tour.geo.title', textKey: 'tour.geo.text', view: 'track', preset: 'geo', lon: 78.5 * DEG, warp: 1800 },
  { id: 'sso', titleKey: 'tour.sso.title', textKey: 'tour.sso.text', view: 'track', preset: 'sso', warp: 600, j2: true },
];
