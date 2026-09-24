import { afterAll, describe, expect, it } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { satelliteById } from '../src/data/satellites';
import { VehicleModel } from '../src/physics/vehicle';
import { atmosphere } from '../src/physics/atmosphere';
import { DEG, OMEGA_EARTH, R_EARTH } from '../src/physics/constants';
import { norm, scale, sub, v3, type Vec3 } from '../src/physics/vec3';
import { allocateEngineGimbals } from '../src/physics/rigid/actuators';
import { aerodynamicWrench } from '../src/physics/rigid/aero';
import { buildMassProperties, buildRigidVehicle, cylinderInertia, stageMassComponents, type RigidVehicleSnapshot } from '../src/physics/rigid/mass';
import { quatAngularDistance, quatFromAxisAngle, quatIdentity, type Mat3 } from '../src/physics/rigid/math';
import { FLIGHT_CONTROL_GAINS, RigidRuntime } from '../src/physics/rigid/runtime';

type VehicleId = 'falcon9' | 'soyuz21a';
interface Variant {
  name: string; inertia?: number; cp?: number; gains?: number; gimbal?: number;
  vernierDeg?: number; windSeed?: number; failedEngine?: boolean; failedBooster?: boolean;
  cg?: number; swapUpperTanks?: boolean; uniformPropellant?: boolean; dryShellShare?: number;
  cd?: number; normalSlope?: number; damping?: number; lag?: number; slew?: number; genericGimbalDeg?: number;
  upperStage?: boolean;
}
const variants: Variant[] = [
  { name: 'nominal' }, { name: 'inertia -20%', inertia: 0.8 }, { name: 'inertia +20%', inertia: 1.2 },
  { name: 'CP aft 10% length', cp: -0.1 }, { name: 'CP forward 10% length', cp: 0.1 },
  { name: 'gains -20%', gains: 0.8 }, { name: 'gains +20%', gains: 1.2 },
  { name: 'gimbal travel -20%', gimbal: 0.8 }, { name: 'gimbal travel +20%', gimbal: 1.2 },
  { name: 'shear seed 42', windSeed: 42 }, { name: 'shear seed 43', windSeed: 43 },
  { name: 'extended inertia -25%', inertia: 0.75 }, { name: 'extended inertia +25%', inertia: 1.25 },
  { name: 'extended CG aft 1% length', cg: -0.01 }, { name: 'extended CG forward 1% length', cg: 0.01 },
  { name: 'extended upper tank geometry swapped', swapUpperTanks: true },
  { name: 'extended uniform liquid instead of settled', uniformPropellant: true },
  { name: 'extended dry shell share 60%', dryShellShare: 0.6 }, { name: 'extended dry shell share 90%', dryShellShare: 0.9 },
  { name: 'extended axial Cd -50%', cd: 0.5 }, { name: 'extended axial Cd +50%', cd: 1.5 },
  { name: 'extended normal slope -50%', normalSlope: 0.5 }, { name: 'extended normal slope +50%', normalSlope: 1.5 },
  { name: 'extended rate damping -50%', damping: 0.5 }, { name: 'extended rate damping +50%', damping: 1.5 },
  { name: 'extended servo lag 0.05 s', lag: 0.5 }, { name: 'extended servo lag 0.20 s', lag: 2 },
  { name: 'extended gimbal slew 10 degrees/s', slew: 0.5 }, { name: 'extended gimbal slew 40 degrees/s', slew: 2 },
  { name: 'extended generic TVC 3 degrees', genericGimbalDeg: 3 }, { name: 'extended generic TVC 8 degrees', genericGimbalDeg: 8 },
];
const axes = [v3(1, 0, 0), v3(0, 1, 0), v3(0, 0, 1)];
const reports: { vehicle: VehicleId; variant: string; axis: number; model: string; finalErrorDeg: number; finalRateDegS: number; peakErrorDeg: number; gasUsedKg: number; saturatedSeconds: number }[] = [];

function segment(id: VehicleId, axis: Vec3, variant: Variant, model: 'quasiSteady' | 'reducedFlux') {
  const vehicle = new VehicleModel(vehicleById(id), 7150);
  if (variant.upperStage) {
    vehicle.activeIndex = 1;
    vehicle.stages[0].attached = false;
    vehicle.stages[0].boosters.forEach(booster => { booster.attached = false; });
    vehicle.fairingAttached = false;
  }
  vehicle.active!.propellant *= 0.65;
  vehicle.active!.boosters.forEach(booster => { booster.propellant *= 0.65; });
  vehicle.igniteStage(vehicle.active!, 0);
  vehicle.active!.boosters.forEach(booster => vehicle.igniteBooster(booster));
  if (variant.failedEngine) vehicle.stages[0].engineFraction = 8 / 9;
  const initial = buildRigidVehicle(vehicle, { pressure: atmosphere(40000).p, coreThrottle: 1, boosterThrottle: 1 });
  const lowerOwners = new Set([vehicle.stages[0].spec.id, ...initial.geometry.boosters.filter(b => b.stageIndex === 0).map(b => b.id)]);
  const lowerFluid = initial.components.filter(part => lowerOwners.has(part.ownerId) && (part.kind === 'fuel' || part.kind === 'oxidizer'));
  // Fixed structural displacement of the lower tanks, chosen once to give the
  // requested initial stack-CG uncertainty. Subsequent burning retains that
  // same geometry, so the reduced model differentiates a consistent tensor.
  const lowerFluidMass = lowerFluid.reduce((sum, part) => sum + part.mass, 0);
  const fluidShift = lowerFluidMass > 0 ? (variant.cg ?? 0) * initial.aero.referenceLength * initial.mass / lowerFluidMass : 0;
  const tankGeometry = new Map(vehicle.stages.map(stage => [stage.spec.id, {
    base: initial.geometry.stageBases[stage.index], length: stage.spec.length, radius: stage.spec.diameter / 2,
  }]));
  for (const placement of initial.geometry.boosters) {
    const spec = vehicle.stages[placement.stageIndex].boosters[placement.groupIndex].spec;
    tankGeometry.set(placement.id, { base: placement.baseBody, length: spec.length, radius: spec.diameter / 2 });
  }
  const booster = vehicle.stages[0].boosters[0], frozenBoosterPropellant = booster?.propellant ?? 0;
  const gain = variant.gains ?? 1;
  const runtime = new RigidRuntime({ model: 'sixDof', wind: variant.windSeed !== undefined ? 'shear' : 'calm', seed: variant.windSeed ?? 42 }, id,
    { massFlowModel: model, controlGains: { ...FLIGHT_CONTROL_GAINS,
      attitudeGain: scale(FLIGHT_CONTROL_GAINS.attitudeGain, gain), rateGain: scale(FLIGHT_CONTROL_GAINS.rateGain, gain) } });
  let state = { r: v3(R_EARTH + 40000, 0, 0), v: v3(1000, (R_EARTH + 40000) * OMEGA_EARTH, 0),
    attitudeQ: quatFromAxisAngle(axis, DEG), omegaBody: scale(axis, 0.1 * DEG) };
  let peakError = 0, saturatedSeconds = 0, finalError = 0, finalRate = 0;
  const transform = (snapshot: RigidVehicleSnapshot): RigidVehicleSnapshot => {
    let changed = snapshot;
    if (variant.failedBooster) {
      // Synthetic off-axis whole-cluster fault: retain that booster's fuel;
      // every other owner's fuel still burns normally. No missing mass or
      // fictitious flow through the failed nozzles is allowed in this fixture.
      const placement = snapshot.geometry.boosters[0];
      const components = snapshot.components.filter(part => part.ownerId !== placement.id);
      components.push(...stageMassComponents(booster.spec, frozenBoosterPropellant, placement.baseBody, placement.id));
      changed = { ...snapshot, ...buildMassProperties(components), engines: snapshot.engines.map(engine => engine.id.startsWith(`${placement.id}.`)
        ? { ...engine, thrustBudgetN: 0, massFlowKgS: 0 } : engine) };
    }
    if (variant.cg || variant.swapUpperTanks || variant.uniformPropellant || variant.dryShellShare) {
      const parts = changed.components.map(part => {
        if (variant.cg && lowerOwners.has(part.ownerId) && (part.kind === 'fuel' || part.kind === 'oxidizer')) {
          return { ...part, centerBody: { ...part.centerBody, x: part.centerBody.x + fluidShift } };
        }
        if (variant.swapUpperTanks && part.ownerId === vehicle.stages[1].spec.id && (part.kind === 'fuel' || part.kind === 'oxidizer')) {
          const other = changed.components.find(candidate => candidate.ownerId === part.ownerId && candidate.kind === (part.kind === 'fuel' ? 'oxidizer' : 'fuel'))!;
          return { ...part, centerBody: { ...other.centerBody }, inertiaAtCenter: other.inertiaAtCenter.map(value => value * part.mass / other.mass) as unknown as Mat3 };
        }
        if (variant.uniformPropellant && (part.kind === 'fuel' || part.kind === 'oxidizer')) {
          const geometry = tankGeometry.get(part.ownerId)!;
          const length = geometry.length * (part.kind === 'fuel' ? 0.32 : 0.5);
          const aft = geometry.length * (part.kind === 'fuel' ? 0.1 : 0.42);
          return { ...part, centerBody: { ...part.centerBody, x: geometry.base.x + aft + length / 2 },
            inertiaAtCenter: cylinderInertia(part.mass, geometry.radius * 0.9, length) };
        }
        if (variant.dryShellShare && (part.kind === 'structure' || part.kind === 'equipment')) {
          const dry = changed.components.filter(candidate => candidate.ownerId === part.ownerId && (candidate.kind === 'structure' || candidate.kind === 'equipment')).reduce((sum, candidate) => sum + candidate.mass, 0);
          const mass = dry * (part.kind === 'structure' ? variant.dryShellShare : 1 - variant.dryShellShare);
          return { ...part, mass, inertiaAtCenter: part.inertiaAtCenter.map(value => value * mass / part.mass) as unknown as Mat3 };
        }
        return part;
      });
      const properties = buildMassProperties(parts);
      if (Math.abs(properties.mass - changed.mass) > 1e-8 * changed.mass) throw new Error('Sensitivity changed total mass');
      changed = { ...changed, ...properties };
    }
    return { ...changed, inertia: changed.inertia.map(value => value * (variant.inertia ?? 1)) as unknown as Mat3,
      aero: { ...changed.aero, cpBody: { ...changed.aero.cpBody, x: changed.aero.cpBody.x + (variant.cp ?? 0) * changed.aero.referenceLength },
        cdMach: changed.aero.cdMach.map(([mach, cd]) => [mach, cd * (variant.cd ?? 1)] as const),
        normalSlopePerRad: changed.aero.normalSlopePerRad * (variant.normalSlope ?? 1), rateDamping: scale(changed.aero.rateDamping, variant.damping ?? 1) },
      engines: changed.engines.map(engine => ({ ...engine, maxGimbalRad: engine.maxGimbalRad * (variant.gimbal ?? 1),
        timeConstantS: engine.timeConstantS * (variant.lag ?? 1), maxGimbalRateRadS: engine.maxGimbalRateRadS * (variant.slew ?? 1),
        ...(variant.genericGimbalDeg !== undefined && !(engine.kind === 'vernier' && !engine.id.startsWith('blokI.')) ? { maxGimbalRad: variant.genericGimbalDeg * DEG } : {}),
        ...(variant.vernierDeg !== undefined && engine.kind === 'vernier' && !engine.id.startsWith('blokI.') ? { maxGimbalRad: variant.vernierDeg * DEG } : {}) })) };
  };
  for (let tick = 0; tick < 1000; tick++) {
    const time = tick * 0.01, atm = atmosphere(norm(state.r) - R_EARTH), thrust = vehicle.thrust(time, atm.p, 1);
    const result = runtime.step(time, state, 0.01, v3(1, 0, 0), v3(0, 0, 1), (elapsed, consumed) => transform(buildRigidVehicle(vehicle,
      { pressure: atm.p, coreThrottle: thrust.coreThrottle, boosterThrottle: thrust.boosterThrottle,
        time, propellantOffsetSeconds: elapsed, rcsConsumedKgByStage: consumed })));
    state = result.state;
    vehicle.consume(time, 1, 0.01);
    finalError = quatAngularDistance(state.attitudeQ, quatIdentity()); finalRate = norm(state.omegaBody);
    peakError = Math.max(peakError, finalError);
    saturatedSeconds += result.telemetry.saturated ? 0.01 : 0;
    expect(Number.isFinite(finalError + finalRate + result.snapshot.mass)).toBe(true);
    expect(result.snapshot.mass).toBeGreaterThan(0);
    expect(result.telemetry.rawQuaternionNormError).toBeLessThan(1e-7);
    if (variant.failedBooster && peakError > 45 * DEG) break;
  }
  return { state, finalError, finalRate, peakError, saturatedSeconds, gasUsedKg: Object.values(runtime.consumed).reduce((sum, used) => sum + used, 0) };
}

describe('reference full-stack uncertainty response bands', () => {
  // Independent acceptance from the design proposal: 1°/.1°/s disturbances
  // must recover below .1°/.05°/s in 10 seconds in this feasible fixture.
  // The 5° peak limit stays well inside the declared 15° small-angle envelope.
  for (const vehicle of ['falcon9', 'soyuz21a'] as const) {
    // RD-0110's 3/8° range must be exercised while that stage is actually
    // powered; changing its inactive geometry in a full first-stage stack
    // would be a vacuous sensitivity check.
    const cases = vehicle === 'soyuz21a' ? [...variants.map(variant => variant.genericGimbalDeg === undefined ? variant
      : { ...variant, name: `${variant.name} (active upper stage)`, upperStage: true }), { name: 'vernier 10 degrees', vernierDeg: 10 }, { name: 'vernier 45 degrees', vernierDeg: 45 }]
      : [...variants, { name: 'off-axis Merlin failed', failedEngine: true }];
    it.each(cases)(`${vehicle}: $name, all axes and both mass-flow assumptions`, variant => {
      for (const [index, axis] of axes.entries()) {
        const outcomes = (['quasiSteady', 'reducedFlux'] as const).map(model => {
          const result = segment(vehicle, axis, variant, model);
          reports.push({ vehicle, variant: variant.name, axis: index, model, finalErrorDeg: result.finalError / DEG,
            finalRateDegS: result.finalRate / DEG, peakErrorDeg: result.peakError / DEG, gasUsedKg: result.gasUsedKg, saturatedSeconds: result.saturatedSeconds });
          expect(result.peakError, `${vehicle}/${variant.name}/${model}/axis${index} peak`).toBeLessThan(5 * DEG);
          expect(result.finalError, `${vehicle}/${variant.name}/${model}/axis${index} attitude`).toBeLessThan(0.1 * DEG);
          expect(result.finalRate, `${vehicle}/${variant.name}/${model}/axis${index} rate`).toBeLessThan(0.05 * DEG);
          return result;
        });
        expect(quatAngularDistance(outcomes[0].state.attitudeQ, outcomes[1].state.attitudeQ)).toBeLessThan(0.1 * DEG);
        expect(norm(sub(outcomes[0].state.omegaBody, outcomes[1].state.omegaBody))).toBeLessThan(0.05 * DEG);
      }
    }, 60000);
  }

  it('reports an underactuated off-axis Soyuz booster-cluster failure consistently, rather than forcing recovery', () => {
    for (const model of ['quasiSteady', 'reducedFlux'] as const) {
      const result = segment('soyuz21a', v3(0, 1, 0), { name: 'synthetic booster cluster out', failedBooster: true }, model);
      expect(result.peakError).toBeGreaterThan(5 * DEG);
      expect(result.saturatedSeconds).toBeGreaterThan(1);
    }
  }, 30000);
});

describe('Soyuz max-Q authority boundary regression', () => {
  it('distinguishes insufficient 5° steering travel from feasible 10° travel using actual force/moment', () => {
    const vehicle = new VehicleModel(vehicleById('soyuz21a'), 7150, false, satelliteById('crew'));
    vehicle.igniteStage(vehicle.stages[0], 0);
    vehicle.stages[0].boosters.forEach(booster => vehicle.igniteBooster(booster));
    vehicle.consume(0, 1, 42.5);
    const snapshot = buildRigidVehicle(vehicle, { pressure: atmosphere(4470).p, coreThrottle: 1, boosterThrottle: 1 });
    // Measured-regime fixture, not an expected mission trace: q=25 kPa,
    // 250 m/s, .6° flow angle and .005 rad/s steady turning rate. Required
    // TVC trim must oppose the independent CP and damping wrench. The flow
    // angle is what the calm ISS reference mission flies here with the
    // per-vehicle aerodynamic tables (0.61° at T+40 s, 4.4 km, 24 kPa); with
    // the earlier single-slope estimate it flew 0.3°.
    const speed = 250, flowAngle = 0.6 * DEG;
    const aero = aerodynamicWrench(snapshot.aero, { density: 2 * 25000 / speed ** 2, speedOfSound: 320,
      airVelocityBody: v3(speed * Math.cos(flowAngle), speed * Math.sin(flowAngle), 0), omegaBody: v3(0, 0, 0.005), cgBody: snapshot.cg });
    const required = scale(aero.momentBody, -1);
    const allocate = (angle: number) => {
      const specs = snapshot.engines.map(engine => ({ ...engine, maxThrust: engine.thrustBudgetN,
        maxGimbalRad: engine.kind === 'vernier' ? angle * DEG : engine.maxGimbalRad }));
      return allocateEngineGimbals(specs, specs.map(spec => spec.maxThrust > 0 ? 1 : 0), required, snapshot.cg);
    };
    const five = allocate(5), ten = allocate(10);
    expect(required.z).toBeGreaterThan(250000);
    expect(five.saturated).toBe(true);
    expect(five.residualMomentBody.z / required.z).toBeGreaterThan(0.1);
    expect(Math.abs(ten.residualMomentBody.z) / required.z).toBeLessThan(0.005);
    expect(ten.saturated).toBe(false);
  });
});

afterAll(() => {
  if (reports.length === 0) return;
  console.log(JSON.stringify({ label: '10 s reference-configuration sensitivity evidence; not full missions', cases: reports.length,
    maxFinalErrorDeg: Math.max(...reports.map(row => row.finalErrorDeg)), maxFinalRateDegS: Math.max(...reports.map(row => row.finalRateDegS)),
    maxPeakErrorDeg: Math.max(...reports.map(row => row.peakErrorDeg)), maxGasUsedKg: Math.max(...reports.map(row => row.gasUsedKg)) }));
});
