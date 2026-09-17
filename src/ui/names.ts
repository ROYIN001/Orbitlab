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
import { SATELLITES } from '../data/satellites';

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
 * Event parameters with the stage, booster and spacecraft names translated.
 *
 * The simulation writes `{stage}` and `{name}` as the English literal from the
 * data file, because physics is not allowed to know about dictionaries. The
 * templates around them are translated, so without this an event log in
 * Russian reads "Отделение 1-й ступени" next to "First stage (9× Merlin 1D)".
 * Returns the same object when there is nothing to change, so the common case
 * allocates nothing.
 *
 * Hardware reaches these params two ways, because there are two kinds of it:
 *
 * - a stage or booster, matched by its English name against the vehicle's own
 *   stage list (`stageNameByLabel`);
 * - the SPACECRAFT, which that list can never contain — `VehicleModel`
 *   synthesises its stage from the satellite record — so every event about it
 *   carries `satId` (`evt.payloadSep`, and the ignition, burn-start, cut-off
 *   and propellant-out events of the spacecraft's own engine) and the name is
 *   looked up from the id. That is release review 2's major #1: the Russian and
 *   Thai event log, HUD ticker, narration and timeline tooltip all printed
 *   "CubeSat rideshare dispenser" and "Crewed spacecraft" inside a translated
 *   sentence.
 *
 * `satId` fills whichever of `{name}` and `{stage}` the event used for it, and
 * needs no `vehicle`, so it resolves even when the caller has no vehicle spec
 * to hand.
 *
 * `{kind}` is the third English literal the event stream carries — a `BurnKind`
 * enum id — and is translated here through the same `tel.burn.*` labels the
 * flight-plan list uses.
 */
export function localizeEventParams(
  vehicle: VehicleSpec | null,
  params?: Record<string, string | number>,
): Record<string, string | number> | undefined {
  if (!params) return params;
  const sat = typeof params.satId === 'string' ? satelliteNameById(params.satId) : null;
  const hardware = (v: string | number | undefined): string | null =>
    typeof v !== 'string' ? null : sat ?? (vehicle ? stageNameByLabel(vehicle, v) : null);
  const stage = hardware(params.stage);
  const name = hardware(params.name);
  // `{kind}` is a `BurnKind` — an enum id, not a data name — and the dictionary
  // has carried a label for each one since wave 2 (`tel.burn.*`, used by the
  // flight-plan list). Without this the event log reads "Burn planned:
  // raiseApoapsis" in every language, English included.
  const kind = typeof params.kind === 'string' ? localized(`tel.burn.${params.kind}`, params.kind) : null;
  if ((stage === null || stage === params.stage)
    && (name === null || name === params.name)
    && (kind === null || kind === params.kind)) return params;
  const out = { ...params };
  if (stage !== null) out.stage = stage;
  if (name !== null) out.name = name;
  if (kind !== null) out.kind = kind;
  return out;
}

/**
 * The localized name of a spacecraft by its `src/data/satellites.ts` id, or
 * null when no such record exists — an event stream is data, and an id that
 * has been renamed since a recording was made must not throw in a renderer.
 */
export function satelliteNameById(id: string): string | null {
  const sat = SATELLITES.find((s) => s.id === id);
  return sat ? satelliteName(sat) : null;
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
