/**
 * Localized display names for the data files.
 *
 * `src/data/*` is the single source of truth for the fleet, it is written in
 * English, and it is not owned by the design wave — but the i18n contract
 * applies to everything the user reads, and a Russian panel that says
 * "Notes: The crew/cargo launcher for Soyuz MS and Progress…" fails it.
 *
 * So every data string that reaches the screen is passed through
 * `localized()`: it looks up a dictionary key derived from the record's own
 * id and falls back to the English literal in the data file when there is no
 * entry. Nothing in `src/data` changes, a missing key degrades to the English
 * figure rather than to a raw key, and `tests/data-consistency.test.ts` keeps
 * the ids that form the keys stable.
 *
 * What is deliberately NOT translated, in any language: vehicle names
 * (`Soyuz-2.1a`, `Falcon 9 Block 5`), engine names (`RD-0110`, `Merlin 1D`),
 * country codes and orbit designations. Those are proper names; the Russian
 * and Thai press write them the same way.
 */
import { t } from '../i18n';
import type { SatelliteSpec, VehicleSpec } from '../types';
import type { SiteExtra } from '../data/sites';

/** A dictionary entry, or the English literal from the data file when there is none. */
export function localized(key: string, fallback: string): string {
  const s = t(key);
  return s === key ? fallback : s;
}

export const vehicleNotes = (v: VehicleSpec): string => localized(`vehicle.${v.id}.notes`, v.notes ?? '');
export const vehicleManufacturer = (v: VehicleSpec): string => localized(`vehicle.${v.id}.manufacturer`, v.manufacturer);
export const satelliteName = (s: SatelliteSpec): string => localized(`sat.${s.id}.name`, s.name);
export const siteName = (s: SiteExtra): string => localized(`site.${s.id}.name`, s.name);

/** A stage or booster group of `vehicle`, by its id. */
export const stageName = (vehicleId: string, stageId: string, fallback: string): string =>
  localized(`stage.${vehicleId}.${stageId}.name`, fallback);

/**
 * A stage or booster group of `vehicle`, by the English name the physics
 * carries on its debris records (`Debris.name` is `spec.name`, and the
 * simulation is not allowed to know about dictionaries). Falls back to the
 * name itself when nothing matches, which is what happens for the fairing.
 */
/**
 * Event parameters with the stage/booster names translated.
 *
 * The simulation writes `{stage}` and `{name}` as the English literal from the
 * data file, because physics is not allowed to know about dictionaries. The
 * templates around them are translated, so without this an event log in
 * Russian reads "Отделение 1-й ступени" next to "First stage (9× Merlin 1D)".
 * Returns the same object when there is nothing to change, so the common case
 * allocates nothing.
 */
export function localizeEventParams(
  vehicle: VehicleSpec | null,
  params?: Record<string, string | number>,
): Record<string, string | number> | undefined {
  if (!params || !vehicle) return params;
  const stage = typeof params.stage === 'string' ? stageNameByLabel(vehicle, params.stage) : null;
  const name = typeof params.name === 'string' ? stageNameByLabel(vehicle, params.name) : null;
  if ((stage === null || stage === params.stage) && (name === null || name === params.name)) return params;
  const out = { ...params };
  if (stage !== null) out.stage = stage;
  if (name !== null) out.name = name;
  return out;
}

export function stageNameByLabel(vehicle: VehicleSpec | null, name: string): string {
  if (!vehicle) return name;
  for (const st of vehicle.stages) {
    if (st.name === name) return stageName(vehicle.id, st.id, name);
    if (!st.boosters) continue;
    for (const b of st.boosters) if (b.name === name) return stageName(vehicle.id, b.id, name);
  }
  return name;
}
