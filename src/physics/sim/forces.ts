/** Point-mass force model shared by powered flight, orbit and debris. */
import { OMEGA_EARTH, R_EARTH } from '../constants';
import { Vec3, v3, sub, cross, norm, addScaled } from '../vec3';
import { atmosphere } from '../atmosphere';
import { dragCoefficient, tumblingDragCoefficient } from '../aero';
import { gravity, gravityJ2 } from '../gravity';

  /**
 * Acceleration field for the integrator.
 *
 * `cd0` selects the drag law: undefined keeps the slender-body ascent curve
 * (`dragCoefficient(mach)`, 0.22–0.64), a number is the blunt-body drag
 * coefficient of a tumbling object and is flown through
 * `tumblingDragCoefficient`. Every `Debris` has carried a `cd` since the type
 * was written — 2.2 for a spent upper stage, 1.2 for a booster, 1.5 for a
 * fairing half — and nothing read it (audit item B15), so boosters, stages and
 * fairing halves all fell with 2–7× too little drag and landed too fast and
 * too far downrange.
 */
export function pointMassAcceleration(thrustAccel: number, dir: Vec3, mass0: number, mdot: number, t0: number, area: number, useJ2: boolean, cd0?: number,
  densityFactor?: number) {
  return (t: number, r: Vec3, v: Vec3): Vec3 => {
    const rm = norm(r);
    const alt = rm - R_EARTH;
    let a = useJ2 ? gravityJ2(r) : gravity(r);
    const m = Math.max(1, mass0 - mdot * (t - t0));
    if (thrustAccel > 0) {
      const T = thrustAccel * mass0; // thrust force
      a = addScaled(a, dir, T / m);
    }
    if (alt < 1000e3) {
      const atm = atmosphere(alt);
      const vAir = sub(v, cross(v3(0, 0, OMEGA_EARTH), r));
      const vAirMag = norm(vAir);
      if (vAirMag > 0.1 && atm.rho > 0) {
        const mach = vAirMag / atm.a;
        const cd = cd0 === undefined ? dragCoefficient(mach) : tumblingDragCoefficient(cd0, mach);
        // G05: a Monte Carlo run's density factor; absent, the standard atmosphere.
        const rho = densityFactor === undefined ? atm.rho : atm.rho * densityFactor;
        const D = 0.5 * rho * vAirMag * vAirMag * cd * area;
        a = addScaled(a, vAir, -D / (m * vAirMag));
      }
    }
    return a;
  };
}
