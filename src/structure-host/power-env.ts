/**
 * Orbitlab's power model as the Structure section is given it
 * (`PowerEnv`, src/structure/env.ts): the satellite builder's sourced
 * constants and its two steady-state sizing rules (src/orbit/power.ts) and
 * the circular-orbit period and shadow (src/orbit/eclipse.ts), so the
 * section's energy figures are the same model's. In the app's own bundle;
 * the section itself imports none of this.
 *
 * DOM-free.
 */
import { BATTERY_TO_LOAD_EFFICIENCY, INHERENT_DEGRADATION, MOUNT_FACTOR, PATH_EFFICIENCY, SOLAR_FLUX_1AU, arrayPowerRequired, batteryCapacity } from '../orbit/power';
import { circularPeriod, eclipseDuration } from '../orbit/eclipse';
import type { PowerEnv } from '../structure/env';

export const POWER_ENV: PowerEnv = Object.freeze({
  solarFlux: SOLAR_FLUX_1AU,
  inherentDegradation: INHERENT_DEGRADATION,
  spinnerFactor: MOUNT_FACTOR.spinner,
  Xd: PATH_EFFICIENCY.PPT.Xd,
  Xe: PATH_EFFICIENCY.PPT.Xe,
  batteryToLoad: BATTERY_TO_LOAD_EFFICIENCY,
  circularPeriod,
  eclipseDuration,
  arrayPowerRequired,
  batteryCapacity,
});
