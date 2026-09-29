/**
 * Attitude determination and control, sized the way a first design sizes it
 * (roadmap D06, docs/ROADMAP-PART2-3.md; Phase 4 map §2.2 D): the four
 * disturbance torques from outside a satellite, the Earth's field as a
 * dipole, and the rules of thumb that turn the worst torque into a wheel, a
 * magnetic torquer or a thruster, plus the pointing loss an antenna suffers
 * when the attitude is off. Every one is a closed form a cadet can check by
 * hand, which is why the satellite builder uses them: they show which
 * disturbance matters for an orbit and how big the hardware must be, not how
 * the attitude moves.
 *
 * THESE ARE ESTIMATES. Each torque is a worst-case magnitude for a sizing
 * trade (the Sun square on the face, the air at a fixed density, the field at
 * its strongest), not the torque at a given moment; a satellite's real
 * torques vary round the orbit and partly cancel. The builder shows them as
 * estimates (Principle 4).
 *
 * SOURCE. S. R. Starin (NASA GSFC) and J. Eterno (SwRI), "Attitude
 * Determination and Control Systems", §19.1, NTRS 20110007070, the
 * manuscript of *The New SMAD*'s chapter:
 * https://ntrs.nasa.gov/api/citations/20110007070/downloads/20110007070.pdf.
 * Its Table 19-4 (disturbances), 19-11 (wheels and torquers) and 19-12
 * (thrusters) hold every function here, and tests/satellite-attitude.test.ts
 * holds each to them to ½ unit in the last printed digit. Five printed
 * figures do not follow from their own inputs (the FireSat aerodynamic and
 * solar torques, the 0.1° bias momentum, the SCS disturbance thruster force
 * and a wheel margin); the tests keep the equations and record those figures
 * as defects of the source. The pointing loss is not in that chapter: it is
 * the parabola that fits a main lobe, held to the half-power point and to a
 * Gaussian beam.
 *
 * MODEL CHOICES.
 * - The Earth's field is a centred dipole of moment `EARTH_DIPOLE_MOMENT`
 *   (the chapter's M = 7.8 × 10¹⁵ T·m³), not IGRF: Principle 8 (no data
 *   model that would need a dependency or a yearly refresh), and a sizing
 *   estimate needs only the field's peak at a radius. The dipole terms of
 *   IGRF-14 for 2025 give M = 7.69 × 10¹⁵ T·m³, so this M is about 1.4 %
 *   high, well inside what the dipole itself leaves out.
 * - μ is the code's `MU_EARTH` (the chapter prints 3.986 × 10¹⁴) and c is
 *   `C_LIGHT` (the chapter uses 3 × 10⁸ m/s): neither changes a printed digit.
 *
 * UNITS. SI inside, as everywhere in src/orbit: m, s, kg, N, N·m, N·m·s,
 * A·m², T, W/m², rad; the pointing loss in dB. DOM-free, `Math.*` only; it
 * implements `AttitudeCore` (src/orbit/satellite-cores.ts).
 */
import { MU_EARTH } from '../physics/constants';
import { C_LIGHT } from './applications';
import type { AttitudeCore } from './satellite-cores';

/**
 * The Earth's magnetic dipole moment m times μ₀/4π, T·m³: the M of
 * B = M·λ/r³ (Starin & Eterno, Table 19-4, p. 9, "M = 7.8 × 10¹⁵ tesla·m³",
 * SMAD's value). The chapter calls it the moment "multiplied by the magnetic
 * constant", which leaves out the 4π: μ₀·m would be about 10¹⁷ T·m³ for the
 * Earth's m ≈ 7.8 × 10²² A·m². At the surface M is a field of 3.0 × 10⁻⁵ T on
 * the magnetic equator.
 */
export const EARTH_DIPOLE_MOMENT = 7.8e15;

/**
 * Gravity-gradient torque, N·m (D06; Starin & Eterno Table 19-4):
 * (3μ/2r³)·|I_z − I_y|·|sin 2θ|, at radius `r` (m), with the moments of
 * inertia I_z and I_y (kg·m²) about the two axes in the plane of the tilt and
 * θ (rad) between the local vertical and the Z principal axis.
 *
 * Why: the near end of a satellite is pulled harder than the far end, so a
 * body tilted off the local vertical is turned back towards it. It needs no
 * air, no Sun and no field, only a difference of inertia, and it falls with
 * the cube of the radius. The torque peaks at θ = 45°; a magnitude is
 * returned, as sizing needs only its size.
 */
export function gravityGradientTorque(r: number, Iz: number, Iy: number, theta: number): number {
  return ((3 * MU_EARTH) / (2 * r ** 3)) * Math.abs(Iz - Iy) * Math.abs(Math.sin(2 * theta));
}

/**
 * Sunlight-pressure torque, N·m (D06; Starin & Eterno Table 19-4):
 * (Φ/c)·A·(1 + q)·cos i·L, with the solar flux Φ (W/m²; 1367 at 1 AU in the
 * chapter), the sunlit area A (m²), the reflectance q (0 absorbs everything,
 * 1 is a mirror, which doubles the push), the Sun's incidence i off the
 * surface's normal (rad) and the arm L (m) from the centre of mass to the
 * centre of pressure.
 *
 * Why: light carries momentum, so it pushes on the surface it strikes; when
 * that push is centred away from the centre of mass it turns the satellite.
 * It hardly changes with height, so above the air it is often the largest
 * torque. A surface the Sun lights from behind (cos i < 0) is not pushed.
 */
export function solarTorque(flux: number, area: number, q: number, incidence: number, arm: number): number {
  return (flux / C_LIGHT) * area * (1 + q) * Math.max(0, Math.cos(incidence)) * arm;
}

/**
 * Aerodynamic torque, N·m (D06; Starin & Eterno Table 19-4): ½ρ·C_D·A·v²·L,
 * with the air density ρ (kg/m³; from `airDensity` or a fixed ECSS level in
 * the satellite model), the drag coefficient C_D (2.0–2.5 for a satellite),
 * the ram area A (m²), the speed v through the air (m/s) and the arm L (m)
 * from the centre of mass to the centre of pressure.
 *
 * Why: the drag force of the orbit's decay also turns the satellite when its
 * centre of pressure is off the centre of mass. The density falls roughly
 * exponentially with height, so this torque dominates low orbits and
 * vanishes high ones.
 */
export function aeroTorque(rho: number, cd: number, area: number, v: number, arm: number): number {
  return 0.5 * rho * cd * area * v * v * arm;
}

/**
 * The dipole field's strength, T (D06; Starin & Eterno Table 19-4):
 * M·λ/r³ at radius `r` (m), M = `EARTH_DIPOLE_MOMENT`. λ is the chapter's
 * factor of magnetic latitude, 1 on the magnetic equator and 2 over a
 * magnetic pole (`dipoleLatitudeFactor`). The chapter takes λ = 2 for a polar
 * orbit and λ ≈ 1.2 for an equatorial one.
 */
export function dipoleFieldAt(r: number, latitudeFactor: number): number {
  return (EARTH_DIPOLE_MOMENT * latitudeFactor) / r ** 3;
}

/**
 * The strongest dipole field at radius `r` (m), T: 2M/r³, the field over a
 * magnetic pole, which a polar orbit meets (the `AttitudeCore` contract).
 * It takes `r` alone on purpose: with λ as an optional second argument,
 * `radii.map(dipoleField)` would pass each index as λ and give 0 T for the
 * first radius. `dipoleFieldAt` takes λ.
 */
export function dipoleField(r: number): number {
  return dipoleFieldAt(r, 2);
}

/**
 * The chapter's λ for a centred dipole: √(1 + 3·sin²φ) at magnetic latitude
 * φ (rad), 1 on the magnetic equator and 2 at a pole. It is the magnitude of
 * the dipole field, (M/r³)·[3(m̂·r̂)r̂ − m̂], over its equatorial value.
 */
export function dipoleLatitudeFactor(magneticLatitude: number): number {
  const s = Math.sin(magneticLatitude);
  return Math.sqrt(1 + 3 * s * s);
}

/**
 * A residual dipole's torque, N·m (D06; Starin & Eterno Table 19-4): D·B,
 * the dipole D (A·m²) square to the field B (T), its largest.
 *
 * Why: a satellite's wiring and parts leave it a weak magnet (0.1–20 A·m² in
 * the chapter), and the Earth's field turns it like a compass needle.
 */
export function magneticTorque(dipole: number, B: number): number {
  return dipole * B;
}

/**
 * The wheel momentum that stores a cyclic torque over an orbit, N·m·s (D06;
 * Starin & Eterno Table 19-11): T·P·0.707/4, the torque T (N·m) at its peak
 * and the period P (s).
 *
 * Why: a cyclic torque such as the gravity gradient builds momentum for a
 * quarter of an orbit and gives it back the next quarter; a reaction wheel
 * soaks up that swing so the body stays still. 0.707 is the rms of a sine
 * (√½ here; the chapter prints 0.707), times the quarter orbit. It is the
 * chapter's rule, not the exact swing: a sine at twice the orbital rate
 * builds T·P/(2π) over its half cycle, and the rule is π/(2√2) ≈ 1.11 times
 * that, a margin in the rule's favour.
 */
export function wheelMomentumCyclic(torque: number, period: number): number {
  return (torque * period * Math.SQRT1_2) / 4;
}

/**
 * The torque to slew `angle` rad in `time` s about an axis of inertia
 * `inertia` kg·m², N·m (D06; Starin & Eterno Table 19-11): 4θI/t².
 *
 * Why: the quickest slew a torque T can make accelerates for half the time
 * and brakes for the other half, so θ/2 = ½(T/I)(t/2)². It sizes a reaction
 * wheel's torque when the mission must turn the satellite quickly, as
 * FireSat's 30° target-of-opportunity slews do.
 */
export function slewTorque(angle: number, inertia: number, time: number): number {
  return (4 * angle * inertia) / (time * time);
}

/**
 * The bias momentum that holds an attitude to `accuracy` rad against a
 * torque over a quarter orbit, N·m·s (D06; Starin & Eterno Table 19-11):
 * h = (T/θ_a)·(P/4), torque T (N·m), period P (s).
 *
 * Why: a spinning wheel (or a spinning satellite) is stiff; a torque T
 * applied for a quarter orbit tips its momentum h by T·(P/4)/h, so h must be
 * large enough to keep that tip inside the allowed motion θ_a. Holding an
 * attitude ten times tighter needs ten times the momentum.
 */
export function biasMomentum(torque: number, period: number, accuracy: number): number {
  return (torque / accuracy) * (period / 4);
}

/**
 * The magnetic torquer dipole that gives `torque` N·m in a field of `B` T,
 * A·m² (D06; Starin & Eterno Table 19-11): D = T/B.
 *
 * Why: a torquer (a coil round a rod) pushes on the Earth's field to unload
 * the wheels without propellant. It can only push square to the field, and
 * the field is weaker high up, so the chapter takes 3–10 times this minimum.
 */
export function torquerDipole(torque: number, B: number): number {
  return torque / B;
}

/**
 * Thruster force for a torque on an arm, N (D06; Starin & Eterno Table
 * 19-12): F = T/L. For a disturbance T is the worst disturbance; for a slew
 * it is I·α, or `slewTorque`'s torque for the quickest slew. A zero arm gives
 * Infinity: a thruster through the centre of mass cannot turn the satellite.
 */
export function thrusterForce(torque: number, arm: number): number {
  return torque / arm;
}

/**
 * Thruster force to dump a wheel's momentum `h` (N·m·s) on an arm `arm` (m)
 * in bursts of `burnTime` s, N (D06; Starin & Eterno Table 19-12): h/(L·t).
 *
 * Why: a wheel that has soaked up a steady torque spins ever faster; firing a
 * thruster lets it slow down again. The same law, read the other way, gives
 * how short a burn must be to control the momentum finely (the chapter's
 * 50 N thruster on a 1 m arm must fire for 20 ms to give 1 N·m·s, p. 19).
 */
export function momentumDumpForce(h: number, arm: number, burnTime: number): number {
  return h / (arm * burnTime);
}

/**
 * The gain an antenna loses when it points `error` rad off the target, dB (a
 * positive loss; D06, fed into the link budget): 12·(e/θ₃dB)², θ₃dB the
 * half-power beamwidth (rad).
 *
 * Why: the attitude's pointing accuracy costs link margin, and a narrow beam
 * (a big dish, a high frequency) costs more for the same error. The law is
 * the parabola that fits the main lobe: it gives exactly 3 dB at e = θ₃dB/2,
 * which is what the half-power beamwidth means, and it is a Gaussian beam's
 * 12.04·(e/θ₃dB)² with the constant rounded. It holds inside the main lobe;
 * past about e = θ₃dB a real antenna's pattern has nulls and side lobes that
 * the parabola does not know. Form as in MIT OCW 16.851 (2003), lecture
 * "Satellite Communication", slide 23: L_θ = −12(e/θ)² dB,
 * https://ocw.mit.edu/courses/16-851-satellite-engineering-fall-2003/818606568cbb5f2e4116783f6eb0573e_l21satelitecomm2_done.pdf.
 */
export function pointingLoss(error: number, beamwidth: number): number {
  const x = error / beamwidth;
  return 12 * x * x;
}

/** The module as the satellite model and D07 take it (src/orbit/satellite-cores.ts). */
export const attitudeCore = {
  gravityGradientTorque,
  solarTorque,
  aeroTorque,
  dipoleField,
  magneticTorque,
  wheelMomentumCyclic,
  slewTorque,
  biasMomentum,
  torquerDipole,
  thrusterForce,
  momentumDumpForce,
  pointingLoss,
} satisfies AttitudeCore;
