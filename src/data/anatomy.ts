/**
 * The owner's Soyuz Anatomy pages (public/anatomy/): three self-contained 3-D
 * models of the vehicle, its tanks, engines and plumbing, with their Thai
 * guide, made apart from Orbitlab and brought in as they are (owner,
 * 2026-10-28). Build shows a page whole (src/ui/build/anatomy-dialog.ts); the
 * flight draws the outside of the vehicle from the exterior meshes
 * scripts/anatomy-meshes.mjs derives from each page (src/render/anatomy.ts).
 *
 * Pure data: which page goes with which vehicle and payload.
 */
import type { SatelliteSpec, VehicleSpec } from '../types';

export type AnatomyVariant = 'soyuz-ms' | 'progress-ms-26' | 'fregat-st31';

export interface AnatomyPage {
  variant: AnatomyVariant;
  /** the catalogue vehicle it draws */
  vehicle: 'soyuz21a' | 'soyuz21b';
  /** the page, relative to the app (served from public/) */
  page: string;
  /** its exterior meshes (scripts/anatomy-meshes.mjs) */
  meshes: string;
  /** the catalogue spacecraft it draws, if the flight should fly its shape */
  spacecraft: 'soyuz-ms' | 'progress' | null;
}

export const ANATOMY_PAGES: readonly AnatomyPage[] = [
  { variant: 'soyuz-ms', vehicle: 'soyuz21a', page: 'anatomy/soyuz-2-1a-soyuz-ms.html', meshes: 'anatomy/soyuz-2-1a-soyuz-ms.exterior.bin', spacecraft: 'soyuz-ms' },
  { variant: 'progress-ms-26', vehicle: 'soyuz21a', page: 'anatomy/soyuz-2-1a-progress-ms-26.html', meshes: 'anatomy/soyuz-2-1a-progress-ms-26.exterior.bin', spacecraft: 'progress' },
  { variant: 'fregat-st31', vehicle: 'soyuz21b', page: 'anatomy/soyuz-2-1b-fregat-st31.html', meshes: 'anatomy/soyuz-2-1b-fregat-st31.exterior.bin', spacecraft: null },
];

export const anatomyPage = (variant: AnatomyVariant): AnatomyPage => ANATOMY_PAGES.find((p) => p.variant === variant)!;

/** The pages of a catalogue vehicle, in the order Build offers them (none for any other vehicle). */
export const anatomyPagesFor = (vehicleId: string): AnatomyPage[] => ANATOMY_PAGES.filter((p) => p.vehicle === vehicleId);

/**
 * The page whose outside a flight draws, or null to draw the vehicle as
 * before. Only the catalogue Soyuz-2.1a and 2.1b as they stand: a remix that
 * changed their stages (`derivedFrom`) flies the drawing its own figures make.
 * A crewed 2.1a carries the crewed payload section and its escape tower (the
 * Soyuz MS page); any other 2.1a payload flies under the cargo section
 * (the Progress MS-26 page), drawn as the Progress only when it is one.
 */
export function flightAnatomy(spec: VehicleSpec, sat: Pick<SatelliteSpec, 'crewed' | 'cargoShip'>): AnatomyVariant | null {
  if (spec.derivedFrom || !spec.fairing) return null;
  const [core, upper, third] = spec.stages;
  const boosters = core?.boosters ?? [];
  const r7 = core?.profile === 'r7Core' && upper?.profile === 'r7Upper'
    && boosters.length === 1 && boosters[0].count === 4 && !!boosters[0].conicalTop;
  if (!r7) return null;
  if (spec.id === 'soyuz21a' && spec.stages.length === 2) return sat.crewed ? 'soyuz-ms' : 'progress-ms-26';
  if (spec.id === 'soyuz21b' && spec.stages.length === 3 && third.id.startsWith('fregat')) return 'fregat-st31';
  return null;
}
