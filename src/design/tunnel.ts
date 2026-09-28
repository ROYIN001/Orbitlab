/**
 * The wind tunnel (roadmap D04): a vehicle's aerodynamic coefficients over a
 * grid of Mach number and angle, in any configuration it flies through.
 *
 * It measures the six-DOF flight's own aerodynamics, through the flight's own
 * code. The configuration is made on a `VehicleModel` with the calls the
 * flight makes at each event (`jettisonBooster`, `separateStage`,
 * `jettisonFairing`); `buildRigidVehicle` then builds the snapshot the six-DOF
 * runtime flies, with its reference area, its centre of mass and its
 * aerodynamic table; and each point is one call of `aerodynamicWrench` on that
 * snapshot's `aero` at a synthetic 300 m/s in air of unit density, the recipe
 * of tests/rigid-aero-tables.test.ts's `normalAt`. So the nose-first axial
 * coefficient is the snapshot's `cdMach` read through the wrench, as the
 * flight reads it (never the table's `axial` column), and the normal force
 * carries the wrench's own potential-lift scale and centre-of-pressure shift.
 *
 * THESE ARE ESTIMATES, NOT MEASURED DATA. No vehicle has wind-tunnel data in
 * this program: every table is computed from the vehicle's layout by the
 * classical low-order method for bodies of revolution — slender-body theory
 * plus viscous crossflow (Allen & Perkins, NACA TR 1048; Jorgensen, NASA
 * TR R-474) — as src/physics/rigid/aero-tables.ts says of itself. The axial
 * coefficient is one generic launcher curve (`dragCoefficient`) for every
 * vehicle, so fins, nose shape and a per-part drag coefficient change nothing
 * here, as they change nothing in either flight model.
 *
 * What the tunnel does not cover: Reynolds-number effects, roll orientation of
 * strap-ons, control surfaces, power-on base flow, and dynamic derivatives (the
 * damping is zero here: no body rate). The stack's tables are cached per spec
 * object and configuration (src/physics/rigid/mass.ts, `ascentTables`, the
 * Phase 3 map §4.3 item 2), so an edited design — always a new spec object —
 * gets the table of its own shape, whatever its id.
 *
 * DOM-free, SI units: angles in degrees only at the interface (`alphaDeg`),
 * lengths in m along the body x axis (the structural datum: +x towards the
 * nose, origin at the bottom of the full stack).
 */
import type { VehicleSpec } from '../types';
import { VehicleModel } from '../physics/vehicle';
import { buildRigidVehicle } from '../physics/rigid/mass';
import { aerodynamicWrench } from '../physics/rigid/aero';
import { atMach } from '../physics/rigid/aero-tables';
import { DEG } from '../physics/constants';
import { v3 } from '../physics/vec3';

/** The configuration in the tunnel: what the flight has dropped by then. */
export interface TunnelConfig {
  /** per strap-on group of the first stage: already jettisoned */
  boostersOff: readonly boolean[];
  /** stages already separated, from the bottom (0: the whole stack) */
  stagesGone: number;
  /** the fairing is still on */
  fairing: boolean;
  /**
   * Propellant left in the active stage and its strap-ons, as a fraction of
   * their load, 0–1 (default 1, full). It moves the centre of mass, so the
   * moment and the static margin, and nothing aerodynamic.
   */
  propellantFraction?: number;
  /** the payload's size, m, as the flight takes it from the satellite (default the flight's 2 m × 3 m estimate) */
  payload?: { diameter: number; length: number };
}

export interface TunnelPoint {
  mach: number;
  alphaDeg: number;
  /** axial-force coefficient, −F_x/(qS), cos²α included as the flight flies it; negative base first */
  cA: number;
  /** normal-force coefficient, −F_z/(qS), for an angle in the x–z plane */
  cN: number;
  /** pitching-moment coefficient about the centre of mass, M_y/(qS·d), d the reference diameter */
  cm: number;
  /** body x of the resultant normal force, m (at a zero normal force, where the wrench places it) */
  xcpM: number;
  /** drag coefficient along the airflow, cA·cos α + cN·sin α */
  cD: number;
  /** lift coefficient across it, cN·cos α − cA·sin α */
  cL: number;
  /** (x_cg − x_cp)/d, calibres: positive when the centre of pressure is behind the centre of mass (stable) */
  staticMarginCal: number;
  /** the angle is within the 15° the tables are built for and the Mach number within the table (the wrench's flag) */
  withinEnvelope: boolean;
}

export interface TunnelResult {
  /** S, m²: the flight's own reference area for this configuration (`VehicleModel.frontalArea`) */
  referenceArea: number;
  /** d = √(4S/π), m: the diameter of that area, the calibre of the static margin and of `cm` */
  referenceDiameter: number;
  /** body x of the centre of mass, m */
  cgX: number;
  /** body x of the bottom of what is in the tunnel, m (the lowest stage still attached) */
  baseX: number;
  /** body x of its nose tip, m: `baseX` plus the flight's reference length (the top of the fairing, or of the payload once it is off) */
  noseX: number;
  points: TunnelPoint[];
}

/** The tunnel's air: any speed and density give the same coefficients; these are `normalAt`'s. */
const SPEED = 300, DENSITY = 1;
/**
 * The wrench needs a finite speed of sound, so Mach 0 is evaluated at this
 * Mach number instead. Every column the wrench reads is flat from 0 to at
 * least Mach 0.4 (drag to 0.6, afterbody lift to 0.8, crossflow drag to 0.4),
 * so the coefficients are Mach 0's exactly.
 */
const MACH_FLOOR = 1e-9;

/**
 * Sweep `machs` × `alphasDeg` (total angle, 0–180°: 0 nose first, 90 broadside,
 * 180 base first) on `spec` carrying `payloadKg`, in configuration `cfg`.
 * Points come Mach-major, in the order given.
 */
export function tunnelSweep(spec: VehicleSpec, payloadKg: number, cfg: TunnelConfig,
  machs: readonly number[], alphasDeg: readonly number[]): TunnelResult {
  const vm = new VehicleModel(spec, payloadKg);
  const launcherStages = vm.stages.filter((st) => !st.spec.isSpacecraft).length;
  if (!Number.isInteger(cfg.stagesGone) || cfg.stagesGone < 0 || cfg.stagesGone >= launcherStages) {
    throw new RangeError(`stagesGone must leave a launcher stage in the tunnel: 0 to ${launcherStages - 1} (got ${cfg.stagesGone})`);
  }
  const fraction = cfg.propellantFraction ?? 1;
  if (!(fraction >= 0 && fraction <= 1)) throw new RangeError(`propellantFraction must be in [0, 1] (got ${fraction})`);
  for (const m of machs) if (!(m >= 0) || !Number.isFinite(m)) throw new RangeError(`a Mach number must be 0 or more (got ${m})`);
  for (const a of alphasDeg) if (!(a >= 0 && a <= 180)) throw new RangeError(`an angle must be in [0°, 180°] (got ${a})`);
  // The flight's own separation events, in its order: strap-ons, then stages, then the fairing.
  vm.stages[0].boosters.forEach((b, g) => { if (cfg.boostersOff[g]) vm.jettisonBooster(b, 0); });
  for (let i = 0; i < cfg.stagesGone; i++) vm.separateStage(vm.stages[i], 0);
  if (!cfg.fairing) vm.jettisonFairing();
  const active = vm.active!;
  active.propellant *= fraction;
  for (const b of active.boosters) b.propellant *= fraction;

  const snap = buildRigidVehicle(vm, cfg.payload ? { payloadDiameter: cfg.payload.diameter, payloadLength: cfg.payload.length } : {});
  const aero = snap.aero;
  const S = aero.referenceArea;
  const d = Math.sqrt(4 * S / Math.PI);
  const cgX = snap.cg.x;
  const qS = 0.5 * DENSITY * SPEED * SPEED * S;
  const table = aero.table;
  const shift = table ? aero.cpBody.x - table.cpX[0] : 0;
  const points: TunnelPoint[] = [];
  for (const mach of machs) {
    for (const alphaDeg of alphasDeg) {
      const a = alphaDeg * DEG;
      const w = aerodynamicWrench(aero, {
        density: DENSITY, speedOfSound: SPEED / Math.max(mach, MACH_FLOOR), omegaBody: v3(), cgBody: snap.cg,
        airVelocityBody: v3(SPEED * Math.cos(a), 0, SPEED * Math.sin(a)),
      });
      const cA = -w.forceBody.x / qS, cN = -w.forceBody.z / qS;
      // x_cp from the moment the wrench puts about the centre of mass. The
      // force acts at r = (x_cp, cp_y, cp_z), so M_y = (cp_z − cg_z)·F_x −
      // (x_cp − x_cg)·F_z; the centre of mass of a symmetric stack is on the
      // axis and the first term vanishes, but it is kept for one that is not.
      // With no normal force there is nothing to place, and the wrench's rule
      // (`tabulatedLoads`) puts it at the table's small-angle centre of
      // pressure for the side the flow meets.
      const xcpM = w.forceBody.z !== 0
        ? cgX + ((aero.cpBody.z - snap.cg.z) * w.forceBody.x - w.momentBody.y) / w.forceBody.z
        : table ? (Math.cos(a) >= 0 ? atMach(table, table.cpX, mach) : table.baseCpX) + shift : aero.cpBody.x;
      points.push({
        mach, alphaDeg, cA, cN, cm: w.momentBody.y / (qS * d), xcpM,
        cD: cA * Math.cos(a) + cN * Math.sin(a), cL: cN * Math.cos(a) - cA * Math.sin(a),
        staticMarginCal: (cgX - xcpM) / d, withinEnvelope: w.withinEnvelope,
      });
    }
  }
  return { referenceArea: S, referenceDiameter: d, cgX, baseX: snap.activeBase.x, noseX: snap.activeBase.x + aero.referenceLength, points };
}
