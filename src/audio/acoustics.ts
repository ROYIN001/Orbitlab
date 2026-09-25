/**
 * What a listener at the camera hears of a rocket (roadmap V01), as numbers:
 * how loud the exhaust is, how much of it the air carries, how late it
 * arrives, how its pitch shifts. Pure, so it is tested (tests/audio.test.ts);
 * `src/audio/engine-sound.ts` turns it into sound.
 *
 * The model, in the order the sound travels:
 *
 * 1. **Source.** A rocket's exhaust radiates a fraction η of its mechanical
 *    power ½·F·vₑ as sound — η ≈ 0.5 % for large chemical rockets (Eldred,
 *    NASA SP-8072, 1971; the figure acoustic loads on pads are still sized
 *    by). So the sound power level is L_W = 10·log₁₀(η·½·F·vₑ / 10⁻¹² W).
 *    Saturn V's 34 MN at 2.6 km/s gives ≈ 204 dB re 1 pW.
 * 2. **Thin air.** A source radiating into air of density ρ_s couples less of
 *    its power into sound: the level is scaled by ρ_s/ρ₀ (the acoustic
 *    impedance ρc goes with it), and above ~ 100 km, where the ambient
 *    pressure is under a pascal, nothing is carried at all. The rocket goes
 *    quiet as it climbs even for a listener who could follow it.
 * 3. **Spreading.** Spherical spreading from a point source over a
 *    hemisphere: L_p = L_W − 20·log₁₀ r − 8 dB.
 * 4. **Absorption.** Air absorbs high frequencies first (ISO 9613-1: some
 *    dB/km at 1 kHz, tens at 8 kHz), which is why a distant launch is a low
 *    rumble: the audible band is cut above a corner that falls with range.
 * 5. **Delay and Doppler.** Sound arrives at the speed of sound c, so what
 *    is heard at t left the rocket at the retarded time t − r(t−τ)/c — at
 *    T+60 s, 20 km away, the listener still hears T+1 s; and its pitch is
 *    scaled by c / (c + v_r) as the rocket recedes at v_r.
 *
 * Levels are mapped to the loudspeaker's gain around a reference: 120 dB,
 * what the launch is at the press site 5 km from a heavy vehicle, plays at
 * full scale; every 20 dB below it is a tenth of the gain.
 */

/** Acoustic efficiency of a rocket exhaust. */
export const ACOUSTIC_EFFICIENCY = 0.005;
/** Exhaust velocity assumed where a stage's own is not at hand, m/s. */
export const DEFAULT_EXHAUST_VELOCITY = 2800;
/** Sea-level density, kg/m³, and speed of sound, m/s. */
export const RHO_0 = 1.225;
export const SPEED_OF_SOUND_0 = 340.3;
/** Pressure below which no sound is carried, Pa: the edge of the atmosphere for this purpose. */
export const SILENT_PRESSURE = 1;
/** The level that plays at full scale, dB re 20 µPa. */
export const REFERENCE_LEVEL = 120;
/** Quietest level worth playing, dB. */
export const FLOOR_LEVEL = 40;

/** Sound power level of an exhaust, dB re 1 pW. */
export function soundPowerLevel(thrustN: number, exhaustVelocity = DEFAULT_EXHAUST_VELOCITY): number {
  const power = ACOUSTIC_EFFICIENCY * 0.5 * Math.max(0, thrustN) * exhaustVelocity;
  return power > 0 ? 10 * Math.log10(power / 1e-12) : -Infinity;
}

/**
 * Sound pressure level at a distance, dB re 20 µPa, from a source in air of
 * `sourcePressure` Pa (the ratio to sea level stands in for the density ratio).
 */
export function soundPressureLevel(thrustN: number, distanceM: number, sourcePressure: number, exhaustVelocity?: number): number {
  if (sourcePressure < SILENT_PRESSURE || thrustN <= 0) return -Infinity;
  const lw = soundPowerLevel(thrustN, exhaustVelocity) + 10 * Math.log10(Math.min(1, sourcePressure / 101325));
  return lw - 20 * Math.log10(Math.max(1, distanceM)) - 8;
}

/** Loudspeaker gain for a level: 1 at `REFERENCE_LEVEL`, ×0.1 per 20 dB, 0 below the floor. */
export function gainForLevel(levelDb: number): number {
  if (!(levelDb > FLOOR_LEVEL)) return 0;
  return Math.min(1.6, 10 ** ((levelDb - REFERENCE_LEVEL) / 20));
}

/**
 * Upper corner of what the air still carries after `distanceM`, Hz: ~ 8 kHz
 * close by, a few hundred Hz at tens of kilometres (a fit to ISO 9613-1's
 * absorption at 20 °C and 50 % humidity for a 6 dB loss).
 */
export function absorptionCutoff(distanceM: number): number {
  return Math.max(120, Math.min(9000, 9000 / (1 + distanceM / 1500) ** 0.8));
}

/**
 * The retarded time: the instant, s, the sound heard at `t` left the source,
 * where `distanceAt(τ)` is the source's distance at time τ. Fixed-point
 * iteration converges because the source moves slower than sound through
 * the part of the flight that is audible; a few passes are enough.
 */
export function retardedTime(t: number, distanceAt: (tau: number) => number, c = SPEED_OF_SOUND_0): number {
  let tau = t - distanceAt(t) / c;
  for (let i = 0; i < 8; i++) {
    const next = t - distanceAt(tau) / c;
    if (Math.abs(next - tau) < 1e-3) return next;
    tau = next;
  }
  return tau;
}

/** Pitch factor for a source receding at `radialSpeed` m/s (negative: approaching). */
export function dopplerFactor(radialSpeed: number, c = SPEED_OF_SOUND_0): number {
  return c / (c + Math.max(-0.5 * c, Math.min(4 * c, radialSpeed)));
}

/**
 * How time warp treats sound: real time is heard as it is; any warp plays
 * without the propagation delay (the picture would be minutes ahead of it)
 * and quieter, so it reads as a sketch rather than as the event; a paused
 * flight is silent.
 */
export function warpGain(warp: number, playing: boolean): { gain: number; delayed: boolean } {
  if (!playing || !(warp > 0)) return { gain: 0, delayed: false };
  if (warp <= 1.001) return { gain: 1, delayed: true };
  return { gain: warp <= 5 ? 0.35 : warp <= 50 ? 0.18 : 0, delayed: false };
}

/** A one-shot sound the flight's events trigger. */
export type SoundCue = 'ignition' | 'separation' | 'landing' | 'explosion';

/** Which event makes which sound (the engine's own roar follows its thrust, not an event). */
export const EVENT_CUES: Readonly<Record<string, SoundCue>> = {
  'evt.ignition': 'ignition', 'evt.boosterIgnition': 'ignition', 'evt.burnStart': 'ignition',
  'evt.stageSep': 'separation', 'evt.boosterSep': 'separation', 'evt.fairingSep': 'separation', 'evt.payloadSep': 'separation',
  'evt.boosterLanded': 'landing', 'evt.boosterLandedZone': 'landing', 'evt.boosterLandedShip': 'landing', 'evt.boosterCaught': 'landing',
  'evt.shipSplashdown': 'landing',
  'evt.aeroBreakup': 'explosion', 'evt.structuralFailure': 'explosion', 'evt.vehicleLost': 'explosion', 'evt.rangeSafety': 'explosion',
};
