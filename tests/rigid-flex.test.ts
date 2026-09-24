import { describe, expect, it } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { add, cross, dot, norm, scale, sub, v3, type Vec3 } from '../src/physics/vec3';
import { buildDetachedStage, cylinderInertia, type MassComponent } from '../src/physics/rigid/mass';
import { sloshAnalog, sloshTanks, SLOSH_XI1 } from '../src/physics/rigid/slosh';
import { buildBeam, firstBendingMode, modeDeflection, modeSlope } from '../src/physics/rigid/bending';
import { FLEX_DEFAULTS, FlexBody, type FlexOptions } from '../src/physics/rigid/flex';
import { BiquadChannel, biquadResponse, notchCoefficients } from '../src/physics/rigid/notch';
import { integrateRigidStep, type RigidState } from '../src/physics/rigid/integrator';
import { matVecMul, quatIdentity, quatRotate, type Mat3 } from '../src/physics/rigid/math';

const options = (overrides: Partial<FlexOptions>): FlexOptions => ({ slosh: false, bending: false, notch: false, ...FLEX_DEFAULTS, ...overrides });

describe('slosh: first-mode mechanical analogue of an upright cylinder', () => {
  it('matches the closed forms of NASA SP-106 / Dodge (2000)', () => {
    for (const depth of [0.5, 1, 2, 5]) {
      const analog = sloshAnalog(depth), t = Math.tanh(SLOSH_XI1 * depth);
      expect(analog.massFraction).toBeCloseTo(2 * t / (SLOSH_XI1 * (SLOSH_XI1 ** 2 - 1) * depth), 12);
      expect(analog.frequencyParameter).toBeCloseTo(SLOSH_XI1 * t, 12);
      expect(analog.heightPerRadius).toBeCloseTo(depth - 2 / SLOSH_XI1 * Math.tanh(SLOSH_XI1 * depth / 2), 12);
    }
    // A tank as deep as it is wide (h = 2a): about 23 % of the liquid sloshes,
    // at ω² = 1.839 g/a, riding 1.03 a below the surface.
    const deep = sloshAnalog(2);
    expect(deep.massFraction).toBeCloseTo(0.227, 3);
    expect(deep.frequencyParameter).toBeCloseTo(1.8389, 4);
    expect(2 - deep.heightPerRadius).toBeCloseTo(1.033, 3);
  });

  it('carries 98.7 % of the liquid\'s quasi-static tilt moment in its first mode', () => {
    // A liquid held at a small lateral acceleration tilts its surface by a/g and
    // moves its centre of mass across by a²/(4h) per unit tilt; every mode's
    // pendulum contributes m_n·L_n of that, Σ 2/(ξ_n²(ξ_n² − 1)) = 1/4.
    for (const depth of [0.3, 1, 3]) {
      const analog = sloshAnalog(depth);
      expect(analog.massFraction * analog.pendulumPerRadius / (1 / (4 * depth))).toBeCloseTo(8 / (SLOSH_XI1 ** 2 * (SLOSH_XI1 ** 2 - 1)), 12);
    }
    expect(8 / (SLOSH_XI1 ** 2 * (SLOSH_XI1 ** 2 - 1))).toBeCloseTo(0.9874, 4);
  });

  it('finds each liquid tank of the mass model and no solid grain', () => {
    const f9 = vehicleById('falcon9').stages[0];
    const snap = buildDetachedStage('falcon9', f9, f9.propellantMass / 2, { coreThrottle: 1 });
    const tanks = sloshTanks(snap.components, 'falcon9');
    expect(tanks.map((t) => t.id).sort()).toEqual(['s1.fuel', 's1.oxidizer']);
    for (const tank of tanks) {
      expect(tank.massKg).toBeGreaterThan(0);
      expect(tank.massKg).toBeLessThan(tank.liquidMassKg);
      expect(tank.radiusM).toBeCloseTo(0.9 * f9.diameter / 2, 9);
    }
    const vega = vehicleById('vegac');
    const solid = vega.stages.filter((s) => s.engine.solid)[0];
    const snapSolid = buildDetachedStage('vegac', solid, solid.propellantMass / 2, {});
    expect(sloshTanks(snapSolid.components, 'vegac')).toEqual([]);
  });
});

/** A free Falcon 9 first stage, half full, with its two tanks sloshing and nothing pushing it. */
function freeStage(damping = 0) {
  const f9 = vehicleById('falcon9').stages[0];
  const snapshot = buildDetachedStage('falcon9', f9, f9.propellantMass / 2, { coreThrottle: 1 });
  const body = new FlexBody(options({ slosh: true, sloshDamping: damping }));
  const flex = body.begin(0, 0.01, snapshot, v3());
  expect(flex.length).toBe(8);
  const input = (state: RigidState) => ({ snapshot, attitudeQ: state.attitudeQ, omegaBody: state.omegaBody, flex: state.flex!,
    engine: { forceBody: v3(), momentBody: v3(), engines: [] }, enginePositions: [], rcsJets: [], rcsDuties: [],
    rcsForceBody: v3(), rcsMomentBody: v3(), aeroForceBody: v3(), aeroMomentBody: v3(), gravityECI: v3(), flowMomentBody: v3() });
  const tanks = sloshTanks(snapshot.components, 'falcon9');
  // The springs are set by the thrust the step started with.
  const axial = snapshot.engines.reduce((sum, engine) => sum + engine.thrustBudgetN * engine.directionBody.x, 0) / snapshot.mass;
  return { snapshot, body, flex, input, tanks, axial };
}

describe('slosh coupled to the rigid body', () => {
  it('conserves momentum, angular momentum and energy with no damping and no external load', () => {
    const { snapshot, body, flex, input, tanks, axial } = freeStage();
    let state: RigidState = { r: v3(), v: v3(3, -2, 1), attitudeQ: quatIdentity(), omegaBody: v3(0.02, -0.03, 0.05),
      flex: [0.4, -0.2, 0.05, 0.1, -0.3, 0.25, 0, -0.05] };
    void flex;
    const cg = snapshot.cg;
    const mB = snapshot.mass - tanks.reduce((sum, t) => sum + t.massKg, 0);
    const p = tanks.map((t) => sub(t.stationBody, cg));
    const b = scale(p.reduce((acc, pi, i) => add(acc, scale(pi, tanks[i].massKg)), v3()), -1 / mB);
    const shift = (d: Vec3, m: number) => { const d2 = dot(d, d), q = [d.x, d.y, d.z]; return [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => m * ((r === c ? d2 : 0) - q[r] * q[c]))); };
    const IB = [...snapshot.inertia] as number[];
    shift(b, mB).forEach((x, i) => { IB[i] -= x; });
    tanks.forEach((t, k) => shift(p[k], t.massKg).forEach((x, i) => { IB[i] -= x; }));
    const invariants = (s: RigidState) => {
      const R = (u: Vec3) => quatRotate(s.attitudeQ, u), w = s.omegaBody, f = s.flex!;
      const parts: { m: number; r: Vec3; v: Vec3 }[] = [{ m: mB, r: add(s.r, R(b)), v: add(s.v, R(cross(w, b))) }];
      let energy = 0.5 * dot(w, matVecMul(IB as unknown as Mat3, w));
      tanks.forEach((t, i) => {
        const sl = v3(0, f[4 * i], f[4 * i + 1]), ds = v3(0, f[4 * i + 2], f[4 * i + 3]), rho = add(p[i], sl);
        parts.push({ m: t.massKg, r: add(s.r, R(rho)), v: add(s.v, R(add(cross(w, rho), ds))) });
        energy += 0.5 * t.massKg * t.stiffnessPerAccel * axial * dot(sl, sl);
      });
      let momentum = v3(), angular = R(matVecMul(IB as unknown as Mat3, w));
      for (const part of parts) {
        momentum = add(momentum, scale(part.v, part.m));
        angular = add(angular, cross(part.r, scale(part.v, part.m)));
        energy += 0.5 * part.m * dot(part.v, part.v);
      }
      return { momentum, angular, energy };
    };
    const before = invariants(state);
    for (let i = 0; i < 2000; i++) {
      state = integrateRigidStep(i * 0.005, state, 0.005, (_t, trial) => {
        const result = body.loads(input(trial as RigidState));
        return { mass: snapshot.mass, inertiaBody: snapshot.inertia, forceECI: v3(), momentBody: v3(), externalAccelerationECI: v3(),
          flex: { accelerationECI: result.accelerationECI, omegaDotBody: result.omegaDotBody, rates: result.rates } };
      }).state;
    }
    const after = invariants(state);
    expect(norm(sub(after.momentum, before.momentum)) / norm(before.momentum)).toBeLessThan(1e-9);
    expect(norm(sub(after.angular, before.angular)) / norm(before.angular)).toBeLessThan(1e-7);
    expect(Math.abs(after.energy - before.energy) / before.energy).toBeLessThan(1e-7);
    // …and the liquid did move.
    expect(Math.abs(state.flex![0] - 0.4)).toBeGreaterThan(0.01);
  });

  it('oscillates against the free stage at the reduced-mass frequency', () => {
    // With the stage free, a slosh mass m on its spring k at distance d from the
    // rest of the stage's centre accelerates at −k u (1/m + 1/m_B + d²/I_B).
    const { snapshot, body, input, tanks, axial } = freeStage();
    const t = tanks[0], mB = snapshot.mass - tanks.reduce((sum, x) => sum + x.massKg, 0);
    const p = tanks.map((x) => sub(x.stationBody, snapshot.cg));
    const b = scale(add(scale(p[0], tanks[0].massKg), scale(p[1], tanks[1].massKg)), -1 / mB);
    const IByy = snapshot.inertia[4] - mB * b.x ** 2 - tanks.reduce((sum, x, i) => sum + x.massKg * p[i].x ** 2, 0);
    const k = t.massKg * t.stiffnessPerAccel * axial;
    const result = body.loads(input({ r: v3(), v: v3(), attitudeQ: quatIdentity(), omegaBody: v3(), flex: [1e-3, 0, 0, 0, 0, 0, 0, 0] }));
    const expected = -k * 1e-3 * (1 / t.massKg + 1 / mB + (p[0].x - b.x) ** 2 / IByy);
    expect(result.rates[2] / expected).toBeCloseTo(1, 9);
    // Its reaction turns the stage about z and pushes it along +y.
    expect(result.omegaDotBody.z).not.toBe(0);
  });
});

describe('bending: the first free-free mode', () => {
  it('reproduces a uniform beam, 22.373/(2π L²)·√(EI/μ), within 0.1 %', () => {
    const m = 20000, r = 1.8, L = 40;
    const shell: MassComponent = { id: 'tube.structure', ownerId: 'tube', mass: m, centerBody: v3(L / 2), inertiaAtCenter: cylinderInertia(m, r, L, true), kind: 'structure' };
    const beam = buildBeam([shell]);
    const mode = firstBendingMode(beam);
    const EI = 70e9 / 2700 * m * r * r / (2 * L), mu = m / L;
    const exact = 4.730040745 ** 2 / L ** 2 * Math.sqrt(EI / mu);
    expect(Math.abs(mode.frequencyRadS / exact - 1)).toBeLessThan(1e-3);
    // Free ends move most, in phase, and the two nodes sit 22.4 % in from each end.
    expect(modeDeflection(mode, 0)).toBeCloseTo(1, 9);
    expect(modeDeflection(mode, L)).toBeCloseTo(1, 6);
    expect(Math.abs(modeDeflection(mode, 0.2242 * L))).toBeLessThan(2e-3);
    // Slope is the derivative of deflection.
    const h = 1e-4;
    expect(modeSlope(mode, 13)).toBeCloseTo((modeDeflection(mode, 13 + h) - modeDeflection(mode, 13 - h)) / (2 * h), 6);
  });

  it('is orthogonal to the rigid translation and rotation of a real stack', () => {
    const f9 = vehicleById('falcon9').stages[0];
    const snap = buildDetachedStage('falcon9', f9, f9.propellantMass, { coreThrottle: 1 });
    const mode = firstBendingMode(buildBeam(snap.components));
    const { mass, dof, x } = mode.beam;
    const phi = new Float64Array(dof);
    mode.w.forEach((w, i) => { phi[2 * i] = w; phi[2 * i + 1] = mode.theta[i]; });
    const Mphi = new Float64Array(dof);
    for (let i = 0; i < dof; i++) for (let j = 0; j < dof; j++) Mphi[i] += mass[i * dof + j] * phi[j];
    let translation = 0, rotation = 0;
    for (let i = 0; i < x.length; i++) { translation += Mphi[2 * i]; rotation += Mphi[2 * i] * x[i] + Mphi[2 * i + 1]; }
    expect(Math.abs(translation) / mode.generalizedMassKg).toBeLessThan(1e-9);
    expect(Math.abs(rotation) / (mode.generalizedMassKg * (x[x.length - 1] - x[0]))).toBeLessThan(1e-9);
    expect(mode.frequencyRadS / (2 * Math.PI)).toBeGreaterThan(1);
    expect(mode.frequencyRadS / (2 * Math.PI)).toBeLessThan(20);
  });
});

describe('the IMU on a bending stack', () => {
  it('reads the rigid rate plus the local slope times the modal rate', () => {
    const f9 = vehicleById('falcon9').stages[0];
    const snap = buildDetachedStage('falcon9', f9, f9.propellantMass, { coreThrottle: 1 });
    const body = new FlexBody(options({ bending: true, imuStation: 0.9 }));
    const flex = body.begin(0, 0.01, snap, v3());
    expect(flex).toEqual([0, 0, 0, 0]);
    body.end(0.01, [0.02, -0.01, 0.3, 0.5]);
    body.begin(0.01, 0.01, snap, v3());
    const telemetry = body.telemetry().bending!;
    const slope = telemetry.imuSlope;
    expect(slope).not.toBe(0);
    const sensed = body.sensed(quatIdentity(), v3(0.1, 0.2, 0.3));
    expect(sensed.omegaBody.x).toBe(0.1);
    expect(sensed.omegaBody.y).toBeCloseTo(0.2 - slope * 0.5, 12);
    expect(sensed.omegaBody.z).toBeCloseTo(0.3 + slope * 0.3, 12);
    // The attitude it reads is turned by the local slope: the body x axis tips
    // toward +y by v′ = φ′η_y and toward +z by w′ = φ′η_z.
    const nose = quatRotate(sensed.attitudeQ, v3(1, 0, 0));
    expect(nose.y).toBeCloseTo(slope * 0.02, 6);
    expect(nose.z).toBeCloseTo(slope * -0.01, 6);
  });
});

describe('notch filter', () => {
  const dt = 0.01, center = 2 * Math.PI * 2.5;
  const f = notchCoefficients(center, 0.05, 0.3, dt)!;
  it('passes zero frequency and the Nyquist frequency, and is ζ_z/ζ_p deep exactly at its centre', () => {
    expect(biquadResponse(f, 1e-9, dt).gain).toBeCloseTo(1, 12);
    expect(biquadResponse(f, Math.PI / dt, dt).gain).toBeCloseTo(1, 9);
    expect(biquadResponse(f, center, dt).gain).toBeCloseTo(0.05 / 0.3, 9);
    // Its cost: phase lag below the notch, here at the rigid loop's half hertz.
    const lag = -biquadResponse(f, 2 * Math.PI * 0.5, dt).phase * 180 / Math.PI;
    expect(lag).toBeGreaterThan(3);
    expect(lag).toBeLessThan(15);
  });
  it('filters a sinusoid by its computed response and starts without a transient', () => {
    const channel = new BiquadChannel();
    channel.settle(4, f);
    expect(channel.step(4, f)).toBeCloseTo(4, 12);
    const wave = new BiquadChannel();
    let peak = 0;
    for (let i = 0; i < 4000; i++) {
      const y = wave.step(Math.sin(center * i * dt), f);
      if (i > 3000) peak = Math.max(peak, Math.abs(y));
    }
    expect(peak).toBeCloseTo(0.05 / 0.3, 3);
  });
  it('steps aside when the centre is too close to the Nyquist frequency', () => {
    expect(notchCoefficients(0.9 * Math.PI / dt, 0.05, 0.3, dt)).toBeNull();
  });
});

describe('shell loads', () => {
  it('carry the thrust through the base as axial stress at liftoff', () => {
    const f9 = vehicleById('falcon9').stages[0];
    const snapshot = buildDetachedStage('falcon9', f9, f9.propellantMass, { coreThrottle: 1, pressure: 101325 });
    const body = new FlexBody(options({ bending: true }));
    const flex = body.begin(0, 0.01, snapshot, v3());
    const thrust = snapshot.engines.reduce((sum, engine) => sum + engine.thrustBudgetN, 0);
    const input = { snapshot, attitudeQ: quatIdentity(), omegaBody: v3(), flex,
      engine: { forceBody: v3(thrust), momentBody: v3(),
        engines: snapshot.engines.map((engine) => ({ id: engine.id, forceBody: v3(engine.thrustBudgetN), momentBody: v3(), directionBody: v3(1), thrust: engine.thrustBudgetN, deflections: [] })) },
      enginePositions: snapshot.engines.map((engine) => engine.positionBody), rcsJets: [], rcsDuties: [],
      rcsForceBody: v3(), rcsMomentBody: v3(), aeroForceBody: v3(), aeroMomentBody: v3(), gravityECI: v3(), flowMomentBody: v3() };
    const result = body.loads(input, true);
    // Just above the engines the whole stage above is pushed by the thrust:
    // σ ≈ T/A of the shell, a quarter or so of the allowable.
    const mode = firstBendingMode(buildBeam(snapshot.components));
    expect(result.loadRatio!).toBeCloseTo(thrust * (1 - mode.beam.lineMass[0] * mode.beam.elementLength / 2 / snapshot.mass) / mode.beam.wallArea[0] / 250e6, 2);
    expect(result.loadStationX!).toBeLessThan(2);
    // A rigid stack with no lateral load has no bending.
    expect(Math.abs(result.omegaDotBody.y) + Math.abs(result.omegaDotBody.z)).toBeLessThan(1e-12);
  });
});
