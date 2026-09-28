/**
 * The Watch level's tour of real satellites (roadmap P2.5, after O01's tour
 * of made-up orbits): each step picks a group of the catalogue, and in it a
 * satellite by its catalogue number, a view, a pace and, for a moment of
 * history, the element set and the date it happened — then says one thing in
 * plain words. Nothing in it computes anything of its own: the satellites are
 * SGP4's from the bundled catalogue, the passes R03's, the re-entries
 * M03's case study. The steps come after the playground's own (src/orbit/tour.ts).
 *
 * DOM-free: the playground reads the steps (src/ui/orbit/playground.ts), and
 * tests/sky-tour.test.ts holds every step to the catalogue and to the
 * dictionaries.
 */
import type { SatGroupId } from '../provider/satellites';

export interface SkyTourStep {
  id: string;
  titleKey: string;
  textKey: string;
  view: '3d' | 'track';
  /** the catalogue group on screen */
  group: SatGroupId;
  /** the satellite picked in it, by catalogue number; none: the whole group */
  satnum?: number;
  /** seconds of flight per second on screen */
  warp: number;
  /** what the step's card adds: the next passes over the place, or the Long March 5B stages' re-entries */
  show?: 'passes' | 'reentryCase';
}

export const SKY_TOUR: readonly SkyTourStep[] = [
  { id: 'iss', titleKey: 'skytour.iss.title', textKey: 'skytour.iss.text', view: '3d', group: 'stations', satnum: 25544, warp: 60 },
  { id: 'issPass', titleKey: 'skytour.issPass.title', textKey: 'skytour.issPass.text', view: 'track', group: 'stations', satnum: 25544, warp: 60, show: 'passes' },
  { id: 'theos2', titleKey: 'skytour.theos2.title', textKey: 'skytour.theos2.text', view: 'track', group: 'thai', satnum: 58016, warp: 300 },
  { id: 'gnss', titleKey: 'skytour.gnss.title', textKey: 'skytour.gnss.text', view: '3d', group: 'gnss', warp: 600 },
  { id: 'weather', titleKey: 'skytour.weather.title', textKey: 'skytour.weather.text', view: '3d', group: 'weather', warp: 600 },
  { id: 'imaging', titleKey: 'skytour.imaging.title', textKey: 'skytour.imaging.text', view: 'track', group: 'imaging', warp: 60 },
  { id: 'debris', titleKey: 'skytour.debris.title', textKey: 'skytour.debris.text', view: '3d', group: 'debris', warp: 60 },
  { id: 'reentry', titleKey: 'skytour.reentry.title', textKey: 'skytour.reentry.text', view: 'track', group: 'stations', warp: 60, show: 'reentryCase' },
];
