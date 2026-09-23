/**
 * Propellant slosh (roadmap P05): the first lateral sloshing mode of each
 * liquid tank as a spring-mass equivalent, the mechanical analogue of NASA
 * SP-106 (Abramson, 1966, ch. 6) and its revision (Dodge, SwRI, 2000, ch. 3),
 * for an upright flat-bottomed cylinder of radius a filled to depth h under an
 * axial acceleration g:
 *
 *   ω₁² = (ξ₁ g / a) tanh(ξ₁ h / a),                ξ₁ = 1.8412 (J₁′(ξ₁) = 0)
 *   m₁  = m_L · 2 tanh(ξ₁ h / a) / (ξ₁ (ξ₁² − 1) h / a)
 *   H₁  = h − (2a / ξ₁) tanh(ξ₁ h / 2a)                (above the tank bottom)
 *
 * m₁ moves across the tank on a spring k₁ = m₁ω₁² and rides along it with the
 * tank; the rest of the liquid, m_L − m₁, stays with the tank where it keeps the
 * liquid's centre of mass. The axial force that carries m₁ along the tank acts
 * where m₁ is, so a displaced m₁ turns the vehicle as the equivalent pendulum
 * (length g/ω₁², hinged H₁ + g/ω₁² above the bottom) does. H₁ is derived in
 * docs/PHYSICS.md §2b from the potential-flow pressure on the wall and bottom.
 *
 * The tanks are the ones the mass model already has (src/physics/rigid/mass.ts):
 * each liquid a solid cylinder settled at the bottom of its tank. A solid motor's
 * grain does not slosh.
 */
import { vehicleById } from '../../data/vehicles';
import { v3, type Vec3 } from '../vec3';
import type { MassComponent } from './mass';

/** First zero of J₁′. */
export const SLOSH_XI1 = 1.8411837813406593;

export interface SloshAnalog {
  /** m₁ / m_L */
  massFraction: number;
  /** H₁ / a: height of m₁ above the tank bottom, per tank radius */
  heightPerRadius: number;
  /** ω₁² a / g */
  frequencyParameter: number;
  /** g / (ω₁² a): the equivalent pendulum's length per tank radius */
  pendulumPerRadius: number;
}

/** The first-mode analogue of a flat-bottomed upright cylinder at fill depth h/a. */
export function sloshAnalog(depthPerRadius: number): SloshAnalog {
  if (!(depthPerRadius > 0) || !Number.isFinite(depthPerRadius)) throw new RangeError('Slosh depth must be finite and positive');
  const x = SLOSH_XI1 * depthPerRadius, t = Math.tanh(x);
  return {
    massFraction: 2 * t / (SLOSH_XI1 * (SLOSH_XI1 ** 2 - 1) * depthPerRadius),
    heightPerRadius: depthPerRadius - 2 / SLOSH_XI1 * Math.tanh(x / 2),
    frequencyParameter: SLOSH_XI1 * t,
    pendulumPerRadius: 1 / (SLOSH_XI1 * t),
  };
}

export interface SloshTank {
  /** the liquid component's id, stable across a flight */
  id: string;
  liquidMassKg: number;
  radiusM: number;
  depthM: number;
  /** the slosh mass m₁, kg */
  massKg: number;
  /** where m₁ rides, body coordinates (the tank's axis at height H₁) */
  stationBody: Vec3;
  /** ω₁² per unit axial acceleration, 1/m */
  stiffnessPerAccel: number;
}

/**
 * Below a depth of a twentieth of its radius a tank's liquid is a film the
 * spring-mass analogue does not describe (its frequency goes to zero); it is
 * carried with the tank, as all the liquid was before P05.
 */
export const SLOSH_MIN_DEPTH_PER_RADIUS = 0.05;

const solidIds = new Map<string, Set<string>>();
/** Stage and strap-on ids of a vehicle whose propellant is a solid grain. */
function solidPropellant(vehicleId: string): Set<string> {
  let ids = solidIds.get(vehicleId);
  if (!ids) {
    ids = new Set<string>();
    try {
      for (const stage of vehicleById(vehicleId).stages) {
        if (stage.engine.solid) ids.add(stage.id);
        for (const booster of stage.boosters ?? []) if (booster.engine.solid) ids.add(booster.id);
      }
    } catch { /* a synthetic test vehicle: every propellant is liquid */ }
    solidIds.set(vehicleId, ids);
  }
  return ids;
}

/**
 * The sloshing tanks of a mass model. A liquid is a uniform solid cylinder along
 * the body axis: I_x = m a²/2 and I_t = m(a²/4 + h²/12) give its radius and depth.
 */
export function sloshTanks(components: readonly MassComponent[], vehicleId: string): SloshTank[] {
  const solid = solidPropellant(vehicleId);
  const tanks: SloshTank[] = [];
  for (const part of components) {
    if ((part.kind !== 'fuel' && part.kind !== 'oxidizer') || !(part.mass > 0)) continue;
    // A strap-on unit's owner is `<group id>.<unit>`.
    if (solid.has(part.ownerId) || solid.has(part.ownerId.replace(/\.\d+$/, ''))) continue;
    const I = part.inertiaAtCenter, axial = I[0], transverse = (I[4] + I[8]) / 2;
    const radius = Math.sqrt(2 * axial / part.mass);
    const depth = Math.sqrt(Math.max(0, 12 * (transverse - axial / 2) / part.mass));
    if (!(radius > 0) || !(depth >= SLOSH_MIN_DEPTH_PER_RADIUS * radius)) continue;
    const analog = sloshAnalog(depth / radius);
    const bottom = part.centerBody.x - depth / 2;
    tanks.push({ id: part.id, liquidMassKg: part.mass, radiusM: radius, depthM: depth,
      massKg: part.mass * analog.massFraction,
      stationBody: v3(bottom + analog.heightPerRadius * radius, part.centerBody.y, part.centerBody.z),
      stiffnessPerAccel: analog.frequencyParameter / radius });
  }
  return tanks;
}
