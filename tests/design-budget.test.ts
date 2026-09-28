/**
 * The shared budget core of roadmap D02–D05 (src/design/budget.ts).
 *
 * Three references, each independent of the module under test:
 *
 * 1. The model's own walk, `idealDeltaV` / `VehicleModel.deltaVRemaining`,
 *    which every recorded flight runs through and which this module must not
 *    contradict. Bound: relative 1e-9 (set by the Phase 3 map, §3.0, before any
 *    comparison). The module replays the walk's additions in the walk's order,
 *    so it is also expected to be exact; that is a separate assertion with a
 *    bound of zero, also fixed before running.
 * 2. The rocket equation worked by hand in this file from the spec's own
 *    numbers, Δv = G0·Isp_vac·ln(m0/mf), with m0 and mf summed here from the
 *    stage masses (the fleet harness grades without library code for the same
 *    reason, tests/fleet-harness.ts). Bound: relative 1e-12, fixed before the
 *    comparison: the two sides differ only in the order masses are summed, a
 *    few ulps on masses of 1e3–3e6 kg, amplified by 1/ln(m0/mf) ≤ ~25.
 * 3. The setup panel's liftoff T/W (src/ui/panel.ts `updateStats`), which the
 *    builder must show identically. Bound: zero (the same operations).
 */
import { describe, expect, it } from 'vitest';
import panelSource from '../src/ui/panel.ts?raw';
import { VEHICLES } from '../src/data/vehicles';
import { SATELLITES } from '../src/data/satellites';
import { G0 } from '../src/physics/constants';
import { VehicleModel, idealDeltaV, liftoffMass, liftoffThrust, solidProfile } from '../src/physics/vehicle';
import { phaseBudgets, stageBudgets, totalDv, vehicleFigures } from '../src/design/budget';
import type { VehicleSpec } from '../src/types';

const PAYLOAD = (v: VehicleSpec): number => v.payloadLEO / 2;
const rel = (a: number, b: number): number => Math.abs(a - b) / Math.abs(b);

describe('the phase walk against the model (D02–D05 budget core)', () => {
  it('covers the whole fleet', () => {
    // The map's correction: 21 vehicles, not 18 (phase3-synth §0).
    expect(VEHICLES.length).toBe(21);
  });

  it('sums to idealDeltaV within 1e-9 for all 21 vehicles at payloadLEO/2', () => {
    for (const v of VEHICLES) {
      const sum = stageBudgets(v, PAYLOAD(v)).reduce((s, p) => s + p.dv, 0);
      expect(rel(sum, idealDeltaV(v, PAYLOAD(v))), v.id).toBeLessThan(1e-9);
    }
  });

  it('is in fact exact: the phases are added in the walk\'s own order', () => {
    for (const v of VEHICLES) {
      expect(vehicleFigures(v, PAYLOAD(v)).totalDv, v.id).toBe(idealDeltaV(v, PAYLOAD(v)));
    }
  });

  it('matches deltaVRemaining from states other than the pad', () => {
    // Recovery reserves held back, part-burned tanks, the first stage gone (the
    // walk then drops the fairing before it starts). Same two bounds as above.
    for (const v of VEHICLES) {
      const states: [string, VehicleModel][] = [];
      states.push(['recovery reserves', new VehicleModel(v, PAYLOAD(v), true)]);
      const burned = new VehicleModel(v, PAYLOAD(v));
      burned.stages[0].propellant *= 0.7;
      for (const b of burned.stages[0].boosters) b.propellant *= 0.4;
      states.push(['part-burned', burned]);
      if (v.stages[0].boosters?.length) {
        const dropped = new VehicleModel(v, PAYLOAD(v));
        for (const b of dropped.stages[0].boosters) dropped.jettisonBooster(b, 100);
        states.push(['strap-ons jettisoned', dropped]);
      }
      if (v.stages.length > 1) {
        const upper = new VehicleModel(v, PAYLOAD(v));
        upper.separateStage(upper.stages[0], 150);
        states.push(['first stage gone', upper]);
      }
      // Paths the pad does not take: fewer engines (the walk's flow, and its
      // 1e-9 kg/s floor when none is left), the fairing already gone, and a
      // spacecraft stage on top, which the walk leaves out.
      const oneOut = new VehicleModel(v, PAYLOAD(v));
      const n0 = v.stages[0].engine.count;
      oneOut.stages[0].engineFraction = n0 > 1 ? (n0 - 1) / n0 : 0.5;
      states.push(['an engine out', oneOut]);
      const allOut = new VehicleModel(v, PAYLOAD(v));
      allOut.stages[0].engineFraction = 0;
      states.push(['every first-stage engine out', allOut]);
      const bare = new VehicleModel(v, PAYLOAD(v));
      bare.jettisonFairing();
      states.push(['fairing gone on the first stage', bare]);
      states.push(['spacecraft stage on top', new VehicleModel(v, PAYLOAD(v), false, SATELLITES.find((s) => s.propulsion)!)]);
      for (const [what, vm] of states) {
        const walk = vm.deltaVRemaining();
        const sum = totalDv(phaseBudgets(vm));
        expect(rel(sum, walk), `${v.id}, ${what}`).toBeLessThan(1e-9);
        expect(sum, `${v.id}, ${what}`).toBe(walk);
      }
      // With no engine running, what the first stage still holds cannot be
      // burned: its core (or serial) phase has no finite burn time.
      const dead = phaseBudgets(allOut).find((p) => p.stageIndex === 0 && p.phase !== 'parallel')!;
      if (dead.m0 > dead.mf) expect(dead.burnTime, v.id).toBe(Infinity);
      // The spacecraft's own propulsion is not the launcher's budget.
      const withCraft = new VehicleModel(v, PAYLOAD(v), false, SATELLITES.find((s) => s.propulsion)!);
      expect(withCraft.hasSpacecraftStage, v.id).toBe(true);
      expect(phaseBudgets(withCraft).every((p) => p.stageIndex < v.stages.length), v.id).toBe(true);
    }
  });

  it('lists a parallel and a core phase for strap-on vehicles, one serial phase per other stage', () => {
    for (const v of VEHICLES) {
      const kinds = stageBudgets(v, PAYLOAD(v)).map((p) => `${p.stageIndex}:${p.phase}`);
      const want = v.stages.flatMap((st, i) => (i === 0 && st.boosters?.length ? ['0:parallel', '0:core'] : [`${i}:serial`]));
      expect(kinds, v.id).toEqual(want);
    }
  });
});

describe('each phase against the rocket equation worked by hand from the spec', () => {
  it('serial stages: m0, mf and G0·Isp_vac·ln(m0/mf), the fairing dropped at the first boundary', () => {
    let checked = 0;
    for (const v of VEHICLES) {
      const pay = PAYLOAD(v);
      const phases = stageBudgets(v, pay);
      v.stages.forEach((st, i) => {
        if (i === 0 && st.boosters?.length) return; // the strap-on phases have their own test below
        let m0 = pay;
        for (let j = i; j < v.stages.length; j++) m0 += v.stages[j].dryMass + v.stages[j].propellantMass;
        if (i === 0 && v.fairing) m0 += v.fairing.mass; // on the stack for the first stage only
        const mf = m0 - st.propellantMass;
        const dv = G0 * st.engine.ispVac * Math.log(m0 / mf);
        const p = phases.find((x) => x.stageIndex === i && x.phase === 'serial');
        expect(p, `${v.id} stage ${i}`).toBeDefined();
        expect(rel(p!.m0, m0), `${v.id}/${st.id} m0`).toBeLessThan(1e-12);
        expect(rel(p!.mf, mf), `${v.id}/${st.id} mf`).toBeLessThan(1e-12);
        expect(rel(p!.ve, G0 * st.engine.ispVac), `${v.id}/${st.id} ve`).toBeLessThan(1e-12);
        expect(rel(p!.dv, dv), `${v.id}/${st.id} dv`).toBeLessThan(1e-12);
        // burn time: propellant over the full-throttle flow F/(G0·Isp) of every engine
        const flow = st.engine.count * st.engine.thrustVac / (G0 * st.engine.ispVac);
        expect(rel(p!.burnTime, st.propellantMass / flow), `${v.id}/${st.id} burn time`).toBeLessThan(1e-12);
        checked++;
      });
    }
    // every stage that is not a strap-on first stage
    expect(checked).toBe(VEHICLES.reduce((n, v) => n + v.stages.length - (v.stages[0].boosters?.length ? 1 : 0), 0));
  });

  it('strap-on first stages: a parallel phase at the flow-averaged exhaust speed, casings dropped, the core alone', () => {
    // By hand: thrust over flow is the effective exhaust speed of two engines
    // burning together, ve = ΣF_vac / Σṁ with ṁ = F_vac/(G0·Isp_vac); the
    // strap-ons run for their propellant over their flow; the core burns alongside
    // at full flow, then on alone after the casings go. Like the model's walk,
    // this counts PSLV's two air-lit PSOM-XLs from liftoff (an ideal budget's
    // simplification, stated in src/design/budget.ts). A core cannot burn more
    // than it carries: Falcon Heavy's and Angara A5's cores have their strap-ons'
    // flow and load, so at full throttle they run dry with them and the
    // core-alone phase is empty. That phase is compared with an added absolute 1e-9 m/s, fixed
    // before the comparison: a core left of a few ulps of 4e5 kg is worth
    // ~1e-11 m/s either way.
    const near = (a: number, b: number): number => Math.abs(a - b) - 1e-12 * Math.abs(b);
    let checked = 0;
    for (const v of VEHICLES) {
      const s0 = v.stages[0];
      if (!s0.boosters?.length) continue;
      const pay = PAYLOAD(v);
      const [par, core] = stageBudgets(v, pay);
      let m0 = pay + (v.fairing?.mass ?? 0);
      for (const st of v.stages) m0 += st.dryMass + st.propellantMass;
      let bProp = 0, bFlow = 0, bThrust = 0, bDry = 0;
      for (const g of s0.boosters) {
        bProp += g.count * g.propellantMass;
        bFlow += g.count * g.engine.count * g.engine.thrustVac / (G0 * g.engine.ispVac);
        bThrust += g.count * g.engine.count * g.engine.thrustVac;
        bDry += g.count * g.dryMass;
        m0 += g.count * (g.dryMass + g.propellantMass);
      }
      const cFlow = s0.engine.count * s0.engine.thrustVac / (G0 * s0.engine.ispVac);
      const cThrust = s0.engine.count * s0.engine.thrustVac;
      const tPar = bProp / bFlow;
      const coreInPar = Math.min(s0.propellantMass, cFlow * tPar);
      const ve = (bThrust + cThrust) / (bFlow + cFlow);
      const mf = m0 - bProp - coreInPar;
      expect(par.phase).toBe('parallel');
      expect(rel(par.m0, m0), `${v.id} parallel m0`).toBeLessThan(1e-12);
      expect(rel(par.mf, mf), `${v.id} parallel mf`).toBeLessThan(1e-12);
      expect(rel(par.ve, ve), `${v.id} parallel ve`).toBeLessThan(1e-12);
      expect(rel(par.dv, ve * Math.log(m0 / mf)), `${v.id} parallel dv`).toBeLessThan(1e-12);
      expect(rel(par.burnTime, tPar), `${v.id} parallel burn time`).toBeLessThan(1e-12);
      const m0c = mf - bDry;
      const mfc = m0c - (s0.propellantMass - coreInPar);
      expect(core.phase).toBe('core');
      expect(rel(core.m0, m0c), `${v.id} core m0`).toBeLessThan(1e-12);
      expect(rel(core.mf, mfc), `${v.id} core mf`).toBeLessThan(1e-12);
      expect(near(core.dv, G0 * s0.engine.ispVac * Math.log(m0c / mfc)), `${v.id} core dv`).toBeLessThan(1e-9);
      expect(rel(par.burnTime + core.burnTime, Math.max(tPar, s0.propellantMass / cFlow)), `${v.id} stage burn time`).toBeLessThan(1e-12);
      checked++;
    }
    expect(checked).toBe(VEHICLES.filter((v) => v.stages[0].boosters?.length).length);
  });

  it('burn times agree with published ones within the fleet\'s 10 % (tests/data-consistency.test.ts)', () => {
    // A few of data-consistency's published figures, with its bound (10 %) and
    // its sources: Vega C, https://en.wikipedia.org/wiki/Vega_C; Long March 3B,
    // https://en.wikipedia.org/wiki/Long_March_3B; H-IIA,
    // https://en.wikipedia.org/wiki/H-IIA; GEM-63, docs/history/AUDIT-2026-09-16.md B22.
    const published: [string, number, 'serial' | 'parallel', number][] = [
      ['vegac', 1, 'serial', 92.9],
      ['vegac', 2, 'serial', 119.6],
      ['longmarch3be', 2, 'serial', 478],
      ['h2a202', 1, 'serial', 534],
      ['atlasv551', 0, 'parallel', 94],
      ['longmarch3be', 0, 'parallel', 140],
    ];
    for (const [id, stage, phase, seconds] of published) {
      const v = VEHICLES.find((x) => x.id === id)!;
      const p = stageBudgets(v, PAYLOAD(v)).find((x) => x.stageIndex === stage && x.phase === phase)!;
      expect(rel(p.burnTime, seconds), `${id} stage ${stage}: ${p.burnTime.toFixed(1)} s against ${seconds} s`).toBeLessThanOrEqual(0.1);
    }
  });
});

describe('vehicle figures', () => {
  it('liftoff T/W is the setup panel\'s own figure', () => {
    // The panel (src/ui/panel.ts `updateStats`) shows num(T0 / (m0 * G0), 2)
    // with m0 = liftoffMass(spec, s.payloadMass) and T0 = liftoffThrust(spec).
    // Its class needs a DOM, so its expression is pinned in its source and
    // evaluated here with the same calls.
    expect(panelSource).toContain('const m0 = liftoffMass(spec, s.payloadMass);');
    expect(panelSource).toContain('const T0 = liftoffThrust(spec);');
    expect(panelSource).toContain("box.appendChild(this.statCell(t('setup.info.twr'), num(T0 / (m0 * G0), 2)));");
    for (const v of VEHICLES) {
      const pay = PAYLOAD(v);
      const panel = liftoffThrust(v) / (liftoffMass(v, pay) * G0);
      const f = vehicleFigures(v, pay);
      expect(f.liftoffTW, v.id).toBe(panel);
      expect(f.stages[0].twIgnition, v.id).toBe(panel);
      expect(f.liftoffMass, v.id).toBe(liftoffMass(v, pay));
      expect(f.liftoffThrust, v.id).toBe(liftoffThrust(v));
      expect(f.payloadFraction, v.id).toBe(pay / liftoffMass(v, pay));
    }
  });

  it('second-stage T/W is nextStageAccel from the pad, a solid\'s head-end peak applied', () => {
    // nextStageAccel = count·thrustVac / (stack above stage 0 + payload + fairing).
    // Bound 1e-12 relative (one division and one multiplication by G0 apart).
    for (const v of VEHICLES) {
      if (v.stages.length < 2) continue;
      const e = v.stages[1].engine;
      const head = e.solid ? solidProfile(0, e.peakFactor) : 1;
      const accel = new VehicleModel(v, PAYLOAD(v)).nextStageAccel();
      expect(rel(vehicleFigures(v, PAYLOAD(v)).stages[1].twIgnition * G0, accel * head), v.id).toBeLessThan(1e-12);
    }
  });

  it('upper-stage T/W, structural ratio and propellant fraction by hand', () => {
    for (const v of VEHICLES) {
      const pay = PAYLOAD(v);
      const f = vehicleFigures(v, pay);
      v.stages.forEach((st, i) => {
        const s = f.stages[i];
        expect(s.stageId).toBe(st.id);
        expect(rel(s.structuralRatio, st.dryMass / (st.dryMass + st.propellantMass)), `${v.id}/${st.id} ε`).toBeLessThan(1e-15);
        expect(Math.abs(s.structuralRatio + s.propellantFraction - 1), `${v.id}/${st.id} ε + ζ`).toBeLessThan(1e-15);
        expect(s.boosters.map((b) => b.id)).toEqual((st.boosters ?? []).map((b) => b.id));
        (st.boosters ?? []).forEach((b, k) => {
          expect(rel(s.boosters[k].structuralRatio, b.dryMass / (b.dryMass + b.propellantMass)), `${v.id}/${b.id} ε`).toBeLessThan(1e-15);
        });
        if (i < 2) return;
        let m = pay; // no fairing from the third stage on
        for (let j = i; j < v.stages.length; j++) m += v.stages[j].dryMass + v.stages[j].propellantMass;
        const head = st.engine.solid ? (st.engine.peakFactor ?? 1.2) : 1;
        expect(rel(s.ignitionMass, m), `${v.id}/${st.id} ignition mass`).toBeLessThan(1e-12);
        expect(rel(s.twIgnition, st.engine.count * st.engine.thrustVac * head / (m * G0)), `${v.id}/${st.id} T/W`).toBeLessThan(1e-12);
      });
    }
  });

  it('leaves the catalogue spec untouched', () => {
    const v = VEHICLES.find((x) => x.id === 'ariane64')!;
    const before = JSON.stringify(v);
    vehicleFigures(v, 5000);
    stageBudgets(v, 5000);
    expect(JSON.stringify(v)).toBe(before);
  });
});
