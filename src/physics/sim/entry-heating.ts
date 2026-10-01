/**
 * Entry heating and burn-up of the hardware that falls back from orbit with
 * no heat shield (C01: Vostok-1's instrument module), in the way the
 * re-entry survivability tools do it (NASA's DAS and ORSAT; ESA's DRAMA):
 * the body breaks up at a conventional height, and each piece is then a
 * lump of one material that takes in a share of the stagnation-point heat
 * flux over its surface, radiates from it, warms to its melting point and
 * then melts away. A piece that loses all its mass has burned up; one that
 * slows down before it does reaches the ground. Nothing here is fitted to an
 * outcome: no recovered pieces of a Vostok instrument module are on record.
 *
 * Opt-in: only the bodies that ask for it (src/physics/sim/module-entry.ts)
 * are heated; the rest of the debris falls as before.
 */

/**
 * Sutton and Graves's constant for air, kg^½/m: the convective heat flux at
 * the stagnation point of a body of nose radius rₙ is k·√(ρ/rₙ)·v³ (Sutton
 * and Graves, *A general stagnation-point convective-heating equation for
 * arbitrary gas mixtures*, NASA TR R-376, 1971).
 */
export const SUTTON_GRAVES_K = 1.7415e-4;

/** Stefan–Boltzmann constant, W/(m² K⁴). */
const SIGMA = 5.670374e-8;

/**
 * The height the main structure of a body falling from orbit is taken to
 * break up at, m: 78 km, the conventional value of NASA's DAS and ORSAT and
 * ESA's DRAMA (a convention of the tools, not a measurement for Vostok).
 */
export const BREAKUP_ALTITUDE = 78e3;

/**
 * Below this mass, kg, a melting piece is counted as gone: what is left is
 * drops of metal and slag (an estimate; the tools stop at a demise
 * criterion of this order).
 */
export const DEMISE_MASS = 0.5;

/**
 * The share of the stagnation-point flux a tumbling piece takes in on
 * average over its whole surface (an estimate: Lees's laminar distribution
 * over a sphere's front half, which receives nearly all of it, averages
 * about half the stagnation value, so a quarter over the whole surface).
 */
export const TUMBLING_HEAT_SHARE = 0.25;

/**
 * The stagnation-point heat flux, W/m², on a body of nose radius `rn` m at
 * airspeed `v` m/s in air of density `rho` kg/m³: the smaller of the
 * continuum (Sutton–Graves) and the free-molecular values. In free-molecular
 * flow every molecule hitting the body gives up its kinetic energy, ½ρv³ at
 * an accommodation of one (an upper bound); the continuum value exceeds it
 * high up, where the formula no longer applies, so the smaller of the two
 * bridges the transition (an approximation).
 */
export function stagnationHeatFlux(rho: number, v: number, rn: number): number {
  if (!(rho > 0) || !(v > 0)) return 0;
  const v3 = v * v * v;
  return Math.min(SUTTON_GRAVES_K * Math.sqrt(rho / Math.max(1e-3, rn)) * v3, 0.5 * rho * v3);
}

/** The radiative-equilibrium temperature of a surface under `q` W/m² at emissivity `emissivity`, K. */
export function equilibriumTemperature(q: number, emissivity: number): number {
  return q > 0 ? (q / (emissivity * SIGMA)) ** 0.25 : 0;
}

/** A material as the survivability tools describe it. */
export interface Material {
  /** melting point, K */
  meltK: number;
  /** specific heat, J/(kg K), averaged from room temperature to the melt */
  c: number;
  /** heat of fusion, J/kg */
  fusion: number;
  /** emissivity of the oxidised surface */
  emissivity: number;
}

export type MaterialId = 'aluminium' | 'steel' | 'titanium';

/**
 * The three materials of the instrument module's pieces, approximately as
 * ORSAT's and DAS's material tables give them for aluminium 6061-T6 (the
 * Soviet AMg-6 is close), stainless steel AISI 316 and Ti-6Al-4V (NASA,
 * *Debris Assessment Software user's guide*, NASA/TP-2015-218597, and ORSAT
 * papers). The averaged specific heats and the emissivities are estimates.
 */
export const MATERIALS: Readonly<Record<MaterialId, Material>> = {
  aluminium: { meltK: 867, c: 1000, fusion: 3.86e5, emissivity: 0.3 },
  steel: { meltK: 1644, c: 600, fusion: 2.86e5, emissivity: 0.35 },
  titanium: { meltK: 1943, c: 700, fusion: 3.93e5, emissivity: 0.3 },
};

/**
 * One piece as a single lump of one material: m·c·dT/dt = F·q·S − εσT⁴·S
 * until it reaches its melting point, then the net heat melts it away at
 * its heat of fusion, dm/dt = −(F·q·S − εσT⁴·S)/h_f. S is its whole surface
 * and F the share of the stagnation flux a tumbling piece takes in
 * (`TUMBLING_HEAT_SHARE`). As it melts it keeps its shape, so its surface
 * goes as the mass to the 2/3 (the meteor-ablation rule, Ceplecha et al.,
 * *Space Sci. Rev.* 84, 1998); held at its first value instead, a melting
 * plate's last few per cent would float down for an hour.
 */
export class LumpedAblator {
  /** K */
  temperature: number;
  /** kg */
  mass: number;
  /** melting at this instant */
  ablating = false;
  /** heat taken in so far, J */
  heatIn = 0;

  /**
   * @param surface whole surface, m²
   * @param temperature at the start, K (the hardware in orbit at about room temperature: an estimate)
   */
  constructor(readonly material: Material, mass: number, readonly surface: number, temperature = 300,
    readonly share = TUMBLING_HEAT_SHARE) {
    this.mass = mass;
    this.initialMass = mass;
    this.temperature = temperature;
  }
  readonly initialMass: number;

  /** What is left of its first size, as a share of its first surface (and of its drag area). */
  get shrink(): number {
    return this.initialMass > 0 ? Math.cbrt(this.mass / this.initialMass) ** 2 : 0;
  }

  /** Advance by `dt` s under a stagnation-point flux of `q` W/m². */
  step(q: number, dt: number): void {
    const m = this.material, s = this.surface * this.shrink;
    const gain = this.share * q * s, loss = m.emissivity * SIGMA * this.temperature ** 4 * s;
    const net = gain - loss;
    this.heatIn += gain * dt;
    if (this.temperature >= m.meltK && net > 0) {
      this.mass = Math.max(0, this.mass - net * dt / m.fusion);
      this.ablating = true;
      return;
    }
    this.ablating = false;
    this.temperature += net * dt / (Math.max(1e-6, this.mass) * m.c);
    // the heat past the melting point goes into melting
    if (this.temperature > m.meltK) {
      const excess = (this.temperature - m.meltK) * this.mass * m.c;
      this.temperature = m.meltK;
      this.mass = Math.max(0, this.mass - excess / m.fusion);
      this.ablating = true;
    }
    // radiating to space and to the cold upper air, never below the air's own temperature (roughly)
    if (this.temperature < 180) this.temperature = 180;
  }

  get demised(): boolean { return this.mass < DEMISE_MASS; }
}
