/**
 * What the Structure section's DOM-free core is given by the app it runs in.
 *
 * The section is a part of its own: its code (src/structure, the
 * `structure-*` and `edusat-model` files of src/render, src/ui/structure)
 * imports nothing of the app at run time — only `three`, its own modules and
 * types — and takes what it needs of the app through values of these shapes,
 * which src/structure-host builds from the app's own modules. So it loads as
 * one chunk the first time the section opens, without the bundler regrouping
 * the app's shared chunks, and another model can be added, or the section
 * developed, without touching the app (tests/structure-boundary.test.ts holds
 * the rule; docs/development/reports/structure-assembly-pilot.md §2.1).
 *
 * DOM-free.
 */

/**
 * Orbitlab's power model as the satellite builder uses it (src/orbit/power.ts,
 * src/orbit/eclipse.ts): its sourced constants and its two steady-state
 * sizing rules, so the section's energy figures come from the same model.
 */
export interface PowerEnv {
  /** nominal solar flux at 1 AU, W/m² */
  readonly solarFlux: number;
  /** an assembled array's inherent degradation I_d, 0–1 */
  readonly inherentDegradation: number;
  /** a spinner's mount factor: its cells' area over the area that faces the Sun (π) */
  readonly spinnerFactor: number;
  /** peak-power-tracking path efficiencies, by day (X_d) and through the battery (X_e) */
  readonly Xd: number;
  readonly Xe: number;
  /** battery-to-load efficiency η_BAT */
  readonly batteryToLoad: number;
  /** a circular orbit's period at altitude `h` (m), s */
  circularPeriod(h: number): number;
  /** its time in the Earth's shadow at sun angle `beta` (rad), s */
  eclipseDuration(h: number, beta: number): number;
  /** SMAD's array power for an orbit's loads, W (loads in W, times in s) */
  arrayPowerRequired(i: { dayLoad: number; eclipseLoad: number; Td: number; Te: number; Xd: number; Xe: number }): number;
  /** SMAD's battery capacity for the shadow's load, J */
  batteryCapacity(i: { eclipseLoad: number; Te: number; dod: number; eff: number }): number;
}
