/**
 * The vehicles the Build section offers, in the order it offers them (the
 * Watch level picks a real rocket to take apart; D02's remix will pick the
 * one to start from, and its saved designs can join the list as `extra`).
 *
 * The catalogue's own order, grouped into the rockets of today's fleet and
 * the historical ones. "Historical" is the D01 catalogue's word: every engine
 * the vehicle flies is marked historical there (Sputnik, Vostok-K, Saturn V,
 * H-IIA 202), which the catalogue sets from the repo's own records.
 *
 * DOM-free: src/ui/build/vehicle-picker.ts draws it. tests/design-build-tour.test.ts.
 */
import type { VehicleSpec } from '../types';
import { vehicleParts } from './vehicle-parts';

export type PickerGroup = 'current' | 'historical' | 'design';

export interface PickerEntry {
  id: string;
  /** name and country code, as the setup panel lists vehicles */
  label: string;
  group: PickerGroup;
}

export const PICKER_GROUPS: readonly PickerGroup[] = ['current', 'historical', 'design'];

/** Every engine it flies is a historical catalogue part. */
export function isHistorical(spec: VehicleSpec): boolean {
  const cat = vehicleParts(spec);
  const engines = [...cat.stages, ...cat.boosters.flat()].map((p) => p.engine);
  return engines.length > 0 && engines.every((e) => !!e?.historical);
}

export function pickerEntries(vehicles: readonly VehicleSpec[], extra: readonly VehicleSpec[] = []): PickerEntry[] {
  const entry = (v: VehicleSpec, group: PickerGroup): PickerEntry => ({ id: v.id, label: `${v.name} (${v.country})`, group });
  const catalogue = vehicles.map((v) => entry(v, isHistorical(v) ? 'historical' : 'current'));
  // grouped, each group in the catalogue's order
  return [
    ...catalogue.filter((e) => e.group === 'current'),
    ...catalogue.filter((e) => e.group === 'historical'),
    ...extra.map((v) => entry(v, 'design')),
  ];
}

/** The entry `step` places after (or before) `id` in the list, wrapping round; from an id not in it, the first (or the last). */
export function stepEntry(entries: readonly PickerEntry[], id: string, step: number): string {
  if (!entries.length) return id;
  const k = entries.findIndex((e) => e.id === id);
  const n = entries.length;
  const from = k >= 0 ? k : step > 0 ? -1 : 0;
  return entries[(((from + step) % n) + n) % n].id;
}
