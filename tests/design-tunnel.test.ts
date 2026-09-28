/**
 * The wind tunnel (roadmap D04), src/design/tunnel.ts.
 *
 * Two kinds of reference. The first is the flight itself: the tunnel has to
 * return the coefficients the six-DOF flight flies with — the table's
 * small-angle normal-force slope and centre of pressure at every Mach number,
 * and at zero angle the generic drag curve the point-mass flight flies too.
 * The second is analytic: slender-body theory (Munk; Allen & Perkins, NACA
 * TR 1048) gives a body's small-angle normal force as 2α times the area of its
 * base, independent of its shape ahead of the base, so a nose on a cylinder,
 * referred to its own cross-section, has C_Nα = 2 per radian, and a stack under
 * a fairing wider than itself 2·(d_base/d_max)².
 *
 * The tables are estimates, not measurements (src/physics/rigid/aero-tables.ts);
 * nothing here claims they are right about a real vehicle, only that the
 * tunnel measures what the flight flies and that the method reproduces the
 * theory it is built on.
 *
 * Every tolerance was fixed before the comparison it bounds was run.
 */
import { describe, expect, it } from 'vitest';
import { tunnelSweep, type TunnelConfig } from '../src/design/tunnel';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { VehicleModel } from '../src/physics/vehicle';
import { buildRigidVehicle } from '../src/physics/rigid/mass';
import { AERO_MACH, atMach } from '../src/physics/rigid/aero-tables';
import { dragCoefficient } from '../src/physics/aero';
import { RAD } from '../src/physics/constants';
import type { VehicleSpec } from '../src/types';

const rel = (a: number, b: number): number => Math.abs(a / b - 1);

/** The same configuration built independently of the tunnel, for the table the flight flies. */
function flightSnapshot(spec: VehicleSpec, payloadKg: number, cfg: TunnelConfig) {
  const vm = new VehicleModel(spec, payloadKg);
  vm.stages[0].boosters.forEach((b, g) => { if (cfg.boostersOff[g]) vm.jettisonBooster(b, 0); });
  for (let i = 0; i < cfg.stagesGone; i++) vm.separateStage(vm.stages[i], 0);
  if (!cfg.fairing) vm.jettisonFairing();
  return { vm, snap: buildRigidVehicle(vm) };
}

/**
 * The small-angle limit, by Richardson extrapolation over α and 2α: the
 * crossflow term makes C_N/α = C_Nα + Kα + O(α²), and the centre of pressure
 * moves linearly in α for the same reason, so 2f(α) − f(2α) removes the
 * first-order term. At α = 1e-5 rad the remainder is of order 1e-10 relative.
 */
const ALPHA = 1e-5;
function smallAngle(spec: VehicleSpec, payloadKg: number, cfg: TunnelConfig, machs: readonly number[]) {
  const sweep = tunnelSweep(spec, payloadKg, cfg, machs, [ALPHA * RAD, 2 * ALPHA * RAD]);
  return machs.map((mach, i) => {
    const [a, b] = [sweep.points[2 * i], sweep.points[2 * i + 1]];
    return { mach, slope: 2 * (a.cN / ALPHA) - b.cN / (2 * ALPHA), xcp: 2 * a.xcpM - b.xcpM };
  });
}

const CASES: [string, number, TunnelConfig][] = [
  ['falcon9', 8000, { boostersOff: [], stagesGone: 0, fairing: true }],
  ['falcon9', 8000, { boostersOff: [], stagesGone: 1, fairing: true }],
  ['falcon9', 8000, { boostersOff: [], stagesGone: 1, fairing: false }],
  ['soyuz21a', 7000, { boostersOff: [false], stagesGone: 0, fairing: true }],
  ['soyuz21a', 7000, { boostersOff: [true], stagesGone: 0, fairing: true }],
  ['ariane64', 10000, { boostersOff: [false], stagesGone: 0, fairing: true }],
  ['pslvxl', 1000, { boostersOff: [false, false], stagesGone: 0, fairing: true }],
  ['saturnv', 40000, { boostersOff: [], stagesGone: 1, fairing: false }],
];
/** The breakpoints and a point inside each span, so interpolation is checked too. */
const MACHS = [...AERO_MACH, 0.3, 0.7, 0.9, 1.0, 1.1, 1.35, 1.75, 2.5, 3.5, 5, 8, 15];

describe('wind tunnel · the tables the flight flies', () => {
  /**
   * As α → 0, the tunnel's C_Nα and x_cp are the table's `normalSlope` and
   * `cpX` at that Mach number (scaled and shifted as the wrench scales and
   * shifts them, which as built is not at all). 1e-6 relative, fixed before
   * running, against an extrapolation remainder estimated at 1e-10.
   */
  it('gives the table’s normal-force slope and centre of pressure at every Mach number', () => {
    for (const [id, payload, cfg] of CASES) {
      const { snap } = flightSnapshot(vehicleById(id), payload, cfg);
      const table = snap.aero.table!;
      expect(snap.aero.normalSlopePerRad, 'as built, the potential lift is not scaled').toBe(2);
      expect(snap.aero.cpBody.x, 'as built, the centre of pressure is not shifted').toBe(table.cpX[0]);
      for (const { mach, slope, xcp } of smallAngle(vehicleById(id), payload, cfg, MACHS)) {
        const label = `${id} ${JSON.stringify(cfg)} M ${mach}`;
        expect(rel(slope, atMach(table, table.normalSlope, mach)), `${label}: C_Nα`).toBeLessThan(1e-6);
        expect(rel(xcp, atMach(table, table.cpX, mach)), `${label}: x_cp`).toBeLessThan(1e-6);
      }
    }
  });

  /**
   * At zero angle the axial coefficient is the snapshot's `cdMach` read through
   * the wrench, which samples `dragCoefficient` on `AERO_MACH` — the drag
   * curve's own breakpoints (src/physics/aero.ts) — so at every breakpoint it
   * is that curve's value, and the force is the point-mass drag ½ρv²·C_D·A on
   * the point-mass reference area `VehicleModel.frontalArea`. 1e-12 relative,
   * fixed before running: one more linear interpolation of the sampled values
   * and a division by qS are the only rounding.
   */
  it('gives C_A(0) = dragCoefficient(M) at every AERO_MACH point, on the point-mass reference area', () => {
    for (const [id, payload, cfg] of CASES) {
      const { vm } = flightSnapshot(vehicleById(id), payload, cfg);
      const sweep = tunnelSweep(vehicleById(id), payload, cfg, AERO_MACH, [0]);
      expect(sweep.referenceArea, `${id}: reference area`).toBe(vm.frontalArea());
      for (const p of sweep.points) {
        expect(rel(p.cA, dragCoefficient(p.mach)), `${id} M ${p.mach}`).toBeLessThan(1e-12);
        expect(Math.abs(p.cN)).toBe(0);
        expect(p.cD).toBe(p.cA);
        expect(Math.abs(p.cL)).toBe(0);
      }
    }
  });

  it('flags the points outside the 15° the tables are built for', () => {
    const sweep = tunnelSweep(vehicleById('falcon9'), 8000, CASES[0][2], [0.5, 2], [0, 5, 15, 15.01, 45, 90, 180]);
    expect(sweep.points.map((p) => p.withinEnvelope)).toEqual([true, true, true, false, false, false, false, true, true, true, false, false, false, false]);
  });

  /**
   * Broadside, nose-first and base-first flow meet: the potential lift and the
   * axial force both go to zero there (sin α |cos α|, cos²α) and the crossflow
   * is the same on both sides, so the loads and their centre are continuous.
   * The bounds were fixed before running from the slope of each term times
   * the 2e-4° step: C_N and C_A within 1e-4, x_cp within 1 mm
   * (tests/rigid-aero-tables.test.ts makes the same check on a detached body).
   */
  it('is continuous through 90° between nose-first and base-first flow', () => {
    for (const [id, payload, cfg] of CASES) {
      const sweep = tunnelSweep(vehicleById(id), payload, cfg, [0.5, 1.2, 2, 6], [90 - 1e-4, 90 + 1e-4]);
      for (let i = 0; i < sweep.points.length; i += 2) {
        const [before, after] = [sweep.points[i], sweep.points[i + 1]];
        const label = `${id} M ${before.mach}`;
        expect(Math.abs(after.cN - before.cN), `${label}: C_N`).toBeLessThan(1e-4);
        expect(Math.abs(after.cA - before.cA), `${label}: C_A`).toBeLessThan(1e-4);
        expect(Math.abs(after.xcpM - before.xcpM), `${label}: x_cp`).toBeLessThan(1e-3);
        expect(before.cN, `${label}: broadside is mostly crossflow`).toBeGreaterThan(1);
      }
    }
  });

  it('reports the static margin from the centre of mass it was given', () => {
    // Full tanks against nearly empty ones: the centre of mass moves, the
    // aerodynamics do not.
    const full = tunnelSweep(vehicleById('falcon9'), 8000, CASES[0][2], [1.5], [4]);
    const dry = tunnelSweep(vehicleById('falcon9'), 8000, { ...CASES[0][2], propellantFraction: 0.05 }, [1.5], [4]);
    expect(dry.cgX).not.toBe(full.cgX);
    expect(dry.points[0].cN).toBe(full.points[0].cN);
    expect(dry.points[0].xcpM).toBeCloseTo(full.points[0].xcpM, 9);
    for (const s of [full, dry]) {
      expect(s.points[0].staticMarginCal).toBeCloseTo((s.cgX - s.points[0].xcpM) / s.referenceDiameter, 12);
    }
  });

  it('refuses a configuration with no launcher stage left, and angles out of range', () => {
    const f9 = vehicleById('falcon9');
    expect(() => tunnelSweep(f9, 0, { boostersOff: [], stagesGone: 2, fairing: false }, [1], [0])).toThrow(RangeError);
    expect(() => tunnelSweep(f9, 0, { boostersOff: [], stagesGone: 0, fairing: true }, [1], [181])).toThrow(RangeError);
    expect(() => tunnelSweep(f9, 0, { boostersOff: [], stagesGone: 0, fairing: true }, [-1], [0])).toThrow(RangeError);
  });
});

describe('wind tunnel · slender-body theory', () => {
  /**
   * A constructed stack with no catalogue id (so it shares no cached table:
   * see the module comment) and nothing but a cylinder under an ogive of the
   * same diameter. Subsonic up to Mach 0.8 the tables add no afterbody lift
   * (aero-tables.ts, `afterbodyLiftSlope`), so slender-body theory is the
   * whole of the small-angle answer: C_Nα = 2·A_base/S. The table must hold it
   * to 1e-12 (two roundings of π d²/4), the tunnel to 1e-6 (the
   * extrapolation's bound above); both fixed before running.
   */
  const base = vehicleById('electron');
  const stack = (id: string, stageD: number, fairingD: number): VehicleSpec => ({
    ...structuredClone(base), id,
    stages: [{ id: `${id}-core`, name: 'Core', dryMass: 3000, propellantMass: 40000, diameter: stageD, length: 30,
      engine: { name: 'Test engine', count: 1, thrustSL: 700e3, thrustVac: 780e3, ispSL: 280, ispVac: 310 } }],
    fairing: { mass: 400, diameter: fairingD, length: 10, sepAltitude: 110e3 },
  });
  const SUBSONIC = [0, 0.3, 0.6, 0.8];
  const cfg: TunnelConfig = { boostersOff: [], stagesGone: 0, fairing: true };

  it('gives C_Nα = 2 per radian for a nose on a cylinder, referred to its cross-section', () => {
    for (const d of [1.2, 3.7, 5.4]) {
      const spec = stack(`tunnel-cyl-${d}`, d, d);
      const { snap } = flightSnapshot(spec, 500, cfg);
      expect(rel(snap.aero.referenceArea, Math.PI * d * d / 4)).toBeLessThan(1e-12);
      const table = snap.aero.table!;
      for (const { mach, slope } of smallAngle(spec, 500, cfg, SUBSONIC)) {
        expect(rel(atMach(table, table.normalSlope, mach), 2), `d ${d} M ${mach}: table`).toBeLessThan(1e-12);
        expect(rel(slope, 2), `d ${d} M ${mach}: tunnel`).toBeLessThan(1e-6);
      }
    }
  });

  it('gives 2·(d_base/d_max)² under a fairing wider than the stack (the boat-tail loses its lift)', () => {
    for (const [stageD, fairingD] of [[3, 4], [1.2, 2.5]] as const) {
      const spec = stack(`tunnel-hammer-${stageD}-${fairingD}`, stageD, fairingD);
      const expected = 2 * (stageD / fairingD) ** 2;
      for (const { mach, slope } of smallAngle(spec, 500, cfg, SUBSONIC)) {
        expect(rel(slope, expected), `${stageD} under ${fairingD} M ${mach}`).toBeLessThan(1e-6);
      }
    }
  });

  it('adds lift carried over behind the nose above Mach 0.8, and only there', () => {
    const spec = stack('tunnel-cyl-super', 3.7, 3.7);
    const [sub, trans, sup] = smallAngle(spec, 500, cfg, [0.8, 1.2, 2]).map((p) => p.slope);
    expect(rel(sub, 2)).toBeLessThan(1e-6);
    expect(trans).toBeGreaterThan(2);
    expect(sup).toBeGreaterThan(trans);
  });
});

describe('wind tunnel · the whole fleet', () => {
  it('sweeps every catalogue vehicle at lift-off to finite coefficients', () => {
    for (const v of VEHICLES) {
      const cfg: TunnelConfig = { boostersOff: (v.stages[0].boosters ?? []).map(() => false), stagesGone: 0, fairing: v.fairing !== null };
      const sweep = tunnelSweep(v, 0.5 * v.payloadLEO, cfg, [0, 0.9, 1.5, 4], [0, 2, 10, 45, 90, 135, 180]);
      for (const p of sweep.points) {
        for (const x of [p.cA, p.cN, p.cm, p.xcpM, p.cD, p.cL, p.staticMarginCal]) expect(Number.isFinite(x), `${v.id} M ${p.mach} α ${p.alphaDeg}`).toBe(true);
      }
    }
  });
});
