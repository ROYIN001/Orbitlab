/**
 * The R-7's flight sequence as Soyuz-2.1a flies it (src/data/vehicles.ts): the
 * engines' start on the pad (`VehicleSpec.padBurnS`), the strap-ons' step to
 * their intermediate level and their commanded cut-off (`BoosterGroupSpec.thrustSteps`),
 * the core's GK-2 cut-off (`StageSpec.cutoffAt`), the escape tower carried to
 * its jettison on a crewed flight, Blok I's aft skirt, and the stored pitch
 * programme (`GuidanceParams.pitchProgram`) that an operator's own pitch-over
 * replaces. The point mass, so that the sequence is checked apart from the
 * attitude loop (tests/rigid-soyuz-programme.test.ts flies it as a rigid body).
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { guidanceForVehicle, programmeOverridden } from '../src/physics/defaults';
import { programmePitch } from '../src/physics/guidance';
import { VehicleModel, boosterCutoffAt, boosterStepLevel, engineMassFlow, liftoffMass } from '../src/physics/vehicle';
import { watchMissionSettings } from '../src/ui/watch-missions';
import { vehicleSpecProblems } from '../src/config/vehicle-spec';
import { ESCAPE } from '../src/physics/rigid/escape';
import type { AscentPhase } from '../src/physics/guidance';

function crewedFlight(guidance = guidanceForVehicle(vehicleById('soyuz21a'))) {
  const s = watchMissionSettings('soyuzMs25', new Date('2026-09-22T03:00:00Z'));
  return new Simulation({
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, padId: s.padId,
    launchTime: s.launchTime, payloadMassOverride: s.payloadMass, guidance, guidanceResolved: true,
    failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 20260919 },
  }, { headless: true });
}

describe('Soyuz-2.1a’s flight sequence', () => {
  it('steps the strap-ons to 81 % at T+112 s and cuts them off by command at T+117.45 s', () => {
    const b = vehicleById('soyuz21a').stages[0].boosters![0];
    expect(boosterStepLevel(b, 111.9)).toBe(1);
    // over a quarter of a second, as Arianespace's acceleration trace shows
    expect(boosterStepLevel(b, 112)).toBe(1);
    expect(boosterStepLevel(b, 112.25)).toBeCloseTo(0.81, 12);
    // the cut-off is not a level: past it the group is shut down, not throttled
    expect(boosterStepLevel(b, 118)).toBeCloseTo(0.81, 12);
    expect(boosterCutoffAt(b)).toBe(117.45);
    expect(boosterCutoffAt(vehicleById('soyuz21b').stages[0].boosters![0])).toBe(117.7);
    expect(boosterCutoffAt(vehicleById('falcon9').stages[0].boosters?.[0] ?? { thrustSteps: undefined } as never)).toBe(Infinity);
  });

  it('flies the published sequence: pad start, step, cut-offs, tower, fairing, skirt', () => {
    const sim = crewedFlight();
    const spec = vehicleById('soyuz21a');
    const core = spec.stages[0], booster = core.boosters![0];
    const at = (key: string) => sim.events.find((e) => e.key === key)?.t;
    let liftoffM: number | undefined, beforeStep = 0, afterStep = 0, beforeTower = 0, afterTower = 0;
    let boosterLeft: number | undefined, coreLeft: number | undefined;
    while (!sim.isFailed() && sim.state.t < 310) {
      const t0 = sim.state.t;
      const v0 = sim.vehicle;
      if (t0 > 111.5 && t0 < 112) beforeStep = v0.stages[0].boosters[0].level;
      sim.step(sim.suggestedDt());
      const t = sim.state.t;
      if (liftoffM === undefined && sim.state.liftoff) liftoffM = sim.state.mass;
      if (t > 112.2 && t < 112.5) afterStep = v0.stages[0].boosters[0].level;
      if (t < 113) beforeTower = v0.escapeTowerMass;
      if (t > 114 && t < 115) afterTower = v0.escapeTowerMass;
      if (boosterLeft === undefined && v0.stages[0].boosters[0].burnedOut) boosterLeft = v0.stages[0].boosters[0].propellant;
      if (coreLeft === undefined && v0.stages[0].burnedOut) coreLeft = v0.stages[0].propellant;
    }
    expect(sim.isFailed()).toBe(false);

    // Two seconds of full flow on the pad: the stack lifts off below its loaded mass.
    const padFlow = 2 * (core.engine.count * engineMassFlow(core.engine) + 4 * booster.engine.count * engineMassFlow(booster.engine));
    const loaded = liftoffMass(spec, 7152) + ESCAPE.tower.mass;
    expect(liftoffM!).toBeLessThan(loaded - 0.9 * padFlow);
    expect(liftoffM!).toBeGreaterThan(loaded - padFlow - 6000);

    // the step: the strap-ons go from full to 81 % in one step, the core unchanged
    expect(beforeStep).toBeCloseTo(1, 3);
    expect(afterStep).toBeCloseTo(0.81, 3);
    // commanded, with propellant aboard (measured 1 032 kg each): not run dry
    expect(boosterLeft!).toBeGreaterThan(300);
    expect(boosterLeft!).toBeLessThan(1500);
    // separated 0.4 s after the cut-off, the flown T+117.85 s
    expect(Math.abs(at('evt.boosterSep')! - 117.85)).toBeLessThan(0.1);

    // the tower: carried from the pad and dropped on the flown time
    expect(at('evt.towerJettison')!).toBeCloseTo(ESCAPE.towerJettison, 1);
    expect(beforeTower).toBe(ESCAPE.tower.mass);
    expect(afterTower).toBe(0);
    // the fairing on its published time, not held by its altitude floor
    expect(at('evt.fairingSep')!).toBeCloseTo(153.3, 0);

    // the core shut down by GK-2 with about 1 % of its load (measured 1.3 %)
    expect(coreLeft! / core.propellantMass).toBeGreaterThan(0.002);
    expect(coreLeft! / core.propellantMass).toBeLessThan(0.03);
    const blokI = sim.events.find((e) => e.key === 'evt.ignition' && e.t > 200)?.t;
    expect(blokI!).toBeCloseTo(285.05, 1);
    // the aft skirt 11.07 s after Blok I lights, 430 kg off its dry mass
    expect(at('evt.aftSkirtSep')! - blokI!).toBeCloseTo(11.07, 1);
    expect(sim.vehicle.jettisoned.aftSkirt).toBe(true);
    expect(sim.vehicle.stages[1].spec.dryMass).toBe(spec.stages[1].dryMass - 430);
  }, 120_000);

  it('cuts a throttled strap-on off later, on its integrator, with what a nominal flight leaves', () => {
    const burn = (throttle: number) => {
      const vm = new VehicleModel(vehicleById('soyuz21a'), 7000);
      const st = vm.active!;
      vm.igniteStage(st, -2.5);
      for (const b of st.boosters) vm.igniteBooster(b, -2.5);
      const dt = 0.01;
      for (let t = -2.5; t < 400; t += dt) {
        vm.thrust(t, 0, throttle, dt);
        const res = vm.consume(t, throttle, dt);
        if (res.boosterBurnout.length) return { t: t + dt, left: st.boosters[0].propellant };
      }
      return { t: NaN, left: NaN };
    };
    const nominal = burn(1), held = burn(0.7);
    // on the published time at full thrust
    expect(nominal.t).toBeCloseTo(117.45, 1);
    // held to 70 %: 120 s of integrator at 0.7 per second
    expect(held.t).toBeCloseTo(-2.5 + 119.95 / 0.7, 0);
    expect(Math.abs(held.left - nominal.left)).toBeLessThan(150);
    expect(nominal.left).toBeGreaterThan(300);
  });

  it('carries no tower on an uncrewed flight', () => {
    const s = watchMissionSettings('soyuzMs25', new Date('2026-09-22T03:00:00Z'));
    const sim = new Simulation({
      vehicleId: 'soyuz21a', satelliteId: 'science', siteId: s.siteId, orbit: s.orbit,
      launchTime: s.launchTime, guidance: guidanceForVehicle(vehicleById('soyuz21a')), guidanceResolved: true,
      failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 20260919 },
    }, { headless: true });
    expect(sim.vehicle.escapeTowerMass).toBe(0);
  });
});

describe('the stored pitch programme', () => {
  const prog: [number, number][] = [[0, 90], [5, 90], [15, 80], [100, 40]];

  it('interpolates linearly and holds the ends', () => {
    expect(programmePitch(prog, -1)).toBe(90);
    expect(programmePitch(prog, 5)).toBe(90);
    expect(programmePitch(prog, 10)).toBe(85);
    expect(programmePitch(prog, 100)).toBe(40);
    expect(programmePitch(prog, 400)).toBe(40);
  });

  it('is the Soyuz-2’s in both flight models, handed over as Blok I lights', () => {
    for (const model of ['pointMass', 'sixDof'] as const) {
      const g = guidanceForVehicle(vehicleById('soyuz21a'), undefined, model);
      expect(g.pitchProgram, model).toBeDefined();
      expect(g.pitchProgram!.at(-1)![0]).toBeCloseTo(285.1, 6);
      expect(programmeOverridden(g, vehicleById('soyuz21a'), model)).toBe(false);
    }
    // 2.1b flies the same first two stages, and their programme
    expect(guidanceForVehicle(vehicleById('soyuz21b')).pitchProgram).toBe(guidanceForVehicle(vehicleById('soyuz21a')).pitchProgram);
    expect(guidanceForVehicle(vehicleById('falcon9')).pitchProgram).toBeUndefined();
  });

  it('flies the programme to the hand-over, then the closed loop', () => {
    const sim = crewedFlight();
    const phases = new Map<AscentPhase, number>();
    while (!sim.isFailed() && sim.state.t < 290) {
      sim.step(sim.suggestedDt());
      const p = sim.state.ascentPhase as AscentPhase;
      if (!phases.has(p)) phases.set(p, sim.state.t);
    }
    expect([...phases.keys()]).toEqual(['vertical', 'pitchProgram', 'closedLoop']);
    expect(phases.get('pitchProgram')!).toBeLessThan(6);
    // the closed loop's first command comes as Blok I's thrust builds
    expect(phases.get('closedLoop')!).toBeGreaterThanOrEqual(285.1);
    expect(phases.get('closedLoop')!).toBeLessThan(286);
  }, 60_000);

  it('gives way to an operator’s own pitch-over, or an acceleration limit', () => {
    const v = vehicleById('soyuz21a');
    // the throttle off the thrust it was computed for
    expect(programmeOverridden({ ...guidanceForVehicle(v), maxAccel: 18 }, v, 'pointMass')).toBe(true);
    expect(programmeOverridden({ ...guidanceForVehicle(v), pitchMax: 30 }, v, 'pointMass')).toBe(false);
    const own = { ...guidanceForVehicle(v), kickAngle: 4 };
    expect(programmeOverridden(own, v, 'pointMass')).toBe(true);
    const sim = crewedFlight(own);
    const seen = new Set<string>();
    while (!sim.isFailed() && sim.state.t < 60) {
      sim.step(sim.suggestedDt());
      if (sim.state.ascentPhase) seen.add(sim.state.ascentPhase);
    }
    expect(seen.has('pitchProgram')).toBe(false);
    expect(seen.has('kick')).toBe(true);
  }, 60_000);
});

describe('the sequence fields in a vehicle file', () => {
  const base = (id = 'soyuz21a') => JSON.parse(JSON.stringify(vehicleById(id)));
  const copy = () => ({ ...base(), id: 'soyuz21a-copy', derivedFrom: 'soyuz21a' });
  const messages = (v: unknown) => vehicleSpecProblems(v).map((p) => `${p.path}: ${p.message}`);

  it('accepts copies of Soyuz-2.1a and 2.1b as they are', () => {
    for (const id of ['soyuz21a', 'soyuz21b']) expect(messages({ ...base(id), id: `${id}-copy`, derivedFrom: id }), id).toEqual([]);
  });

  it('rejects a programme whose times do not rise, or a pitch past the vertical', () => {
    const v = copy();
    v.guidanceDefaults.pitchProgram = [[0, 90], [10, 95], [5, 80]];
    const m = messages(v).join('\n');
    expect(m).toMatch(/pitchProgram\[1\].*within ±90/);
    expect(m).toMatch(/pitchProgram\[2\].*time must rise/);
  });

  it('rejects a cut-off that is not the last thrust step, and a level above 1', () => {
    const v = copy();
    v.stages[0].boosters[0].thrustSteps = [{ t: 100, level: 0 }, { t: 110, level: 1.2 }];
    const m = messages(v).join('\n');
    expect(m).toMatch(/thrustSteps\[0\]\.level.*last step/);
    expect(m).toMatch(/thrustSteps\[1\]/);
  });

  it('rejects a skirt heavier than the stage, and a pad start of minutes', () => {
    const v = copy();
    v.stages[1].jettisons = [{ t: 11, mass: 5000, part: 'aftSkirt' }];
    v.padBurnS = 120;
    const m = messages(v).join('\n');
    expect(m).toMatch(/jettisons.*less than the stage's dry mass/);
    expect(m).toMatch(/padBurnS/);
  });
});
