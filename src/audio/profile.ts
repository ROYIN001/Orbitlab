/**
 * What a rocket sounds like, from what it burns at liftoff: solid motors
 * crackle hardest (their exhaust is loaded with alumina and shocks), and a
 * rocket with many engines has a deeper, thicker rumble — the mixing noise of
 * a wider jet sits lower in frequency (Strouhal scaling: the peak falls as the
 * jet's diameter grows).
 */
import type { VehicleSpec } from '../types';

export interface SoundProfile {
  /** weight of the deep rumble */
  rumble: number;
  /** weight of the roar's body */
  body: number;
  /** weight of the crackle */
  crackle: number;
  /** multiplies the roar's frequencies: below 1 is deeper */
  pitch: number;
}

export const NEUTRAL_PROFILE: SoundProfile = { rumble: 1, body: 1, crackle: 1, pitch: 1 };

export function soundProfile(spec: Pick<VehicleSpec, 'stages'> | null | undefined): SoundProfile {
  const first = spec?.stages[0];
  if (!first) return { ...NEUTRAL_PROFILE };
  const parts = [
    { thrust: first.engine.thrustSL * first.engine.count, engines: first.engine.count, solid: !!first.engine.solid },
    ...(first.boosters ?? []).map((b) => ({ thrust: b.engine.thrustSL * b.engine.count * b.count, engines: b.engine.count * b.count, solid: !!b.engine.solid })),
  ];
  const total = parts.reduce((s, p) => s + p.thrust, 0) || 1;
  const solidShare = parts.reduce((s, p) => s + (p.solid ? p.thrust : 0), 0) / total;
  const engines = parts.reduce((s, p) => s + p.engines, 0);
  // the jet's size: grows with the thrust (≈ the nozzle exit area) — a 75 MN
  // Starship sits about 0.8 of a 3.5 MN rocket's peak, a 1 MN one a little above
  const size = Math.log10(Math.max(1e5, total) / 1e7);
  return {
    rumble: 1 + Math.min(0.35, Math.max(-0.2, 0.25 * size)) + Math.min(0.15, 0.04 * Math.log2(Math.max(1, engines))),
    body: 1,
    crackle: 0.7 + 0.8 * solidShare,
    pitch: Math.min(1.15, Math.max(0.78, 1 - 0.12 * size)),
  };
}
