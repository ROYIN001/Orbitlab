/**
 * Staging: booster burnout and separation, stage cut-off and separation, the
 * choice between flying on and coasting to apoapsis at a core burnout,
 * fairing jettison and payload separation.
 */
import { MU_EARTH, R_EARTH } from '../constants';
import { Vec3, v3, add, sub, scale, dot, cross, norm, normalize, addScaled, clone } from '../vec3';
import { detachedOwnerPartitions, fairingHalfPartitions } from '../rigid/partition';
import { quatFromAxisAngle } from '../rigid/math';
import { elementsFromState } from '../orbital';
import { TAILOFF_SPAN, engineTailoffS, type StageState, type BoosterState } from '../vehicle';
import type { Simulation } from '../simulation';
import { FAIRING_ALTITUDE_FLOOR, FAIRING_HEAT_FLUX_LIMIT, FAIRING_Q_LIMIT } from './constants';

/** Most speed an ascent separation gives either body, m/s (springs, not retro-rockets). */
const SEPARATION_SPEED = 2;

export class Staging {
  stagingInProgress = false;
  circularizeInserted = false;
  secoReported = false;

  constructor(readonly sim: Simulation) {}

  detachBooster(b: BoosterState): void {
    const before = this.sim.rigidLink.currentRigidSnapshot();
    const placements = before?.geometry.boosters.filter(p => p.id.startsWith(`${b.spec.id}.`)) ?? [];
    const partitions = before ? detachedOwnerPartitions(before, placements.map(p => ({ id: p.id, ownerIds: [p.id], datumBody: p.baseBody,
      bodyToParentQ: quatFromAxisAngle(v3(1, 0, 0), p.rotationAboutX) }))) : [];
    // A real strap-on releases in two stages: the lower thrust strut lets go at
    // burnout while the upper node (a ball joint plus the oxidizer transfer
    // line) still holds, so the freed base swings outward under the core's
    // continued acceleration while the nose stays close; the upper node
    // releases a beat later, by which point the booster already carries the
    // rotation that pivot gave it — which is what actually sets the Korolev
    // cross's splay, not a clean push through the CG. This model has no
    // articulated joint to hold the nose fixed for that interval, but the same
    // kinematic OUTCOME is reachable as a single instantaneous impulse: solve
    // for the linear+angular kick that leaves the nose's velocity unchanged
    // and gives the base attachment a `kickSpeed` outward kick, and apply that
    // once, at burnout+sepDelay, instead of a plain CG-centred push.
    const kickSpeed = 4.5; // m/s at the base attachment, relative to the retained stack — estimated, not measured
    // The empty booster's own CG, as a fraction of its length from the base:
    // structure (75% of dry mass) centred at 0.5·L, equipment (25%) at 0.06·L
    // — the same split `stageMassComponents` builds the body from. Propellant
    // is ignored: separation is scheduled at burnout, so there is essentially
    // none left to shift it.
    const cgFraction = 0.39;
    const impulses = placements.map(p => {
      const L = b.spec.length;
      const radial = normalize(v3(0, p.baseBody.y, p.baseBody.z));
      const axial = v3(1, 0, 0);
      const tangential = cross(radial, axial);
      const mass = b.spec.dryMass + b.propellant;
      const cg = add(p.baseBody, scale(axial, cgFraction * L));
      const radius = b.spec.diameter / 2;
      // Transverse moment of inertia of a uniform cylinder about its own CG.
      const inertiaTransverse = (mass * (3 * radius * radius + L * L)) / 12;
      const omega = kickSpeed / L;
      return {
        childAId: p.id, childBId: 'active', pointDatumBody: cg,
        impulseOnABody: scale(radial, mass * kickSpeed * (1 - cgFraction)),
        angularImpulseOnABody: scale(tangential, inertiaTransverse * omega),
      };
    });
    const split = this.sim.rigidLink.rigidSplit(before, partitions, impulses);
    this.sim.vehicle.jettisonBooster(b, this.sim.state.t);
    const first = this.sim.debris.length;
    this.sim.debrisTracker.spawnBoosterDebris(b);
    if (before) {
      this.sim.rigidLink.applyRetainedRigid(split);
      placements.forEach((p, i) => this.sim.debrisTracker.attachRigidDebris(this.sim.debris[first + i], split.find(part => part.id === p.id)!, before, b.spec));
    }
  }

  detachStage(st: StageState, relativeSeparationSpeed?: number): void {
    if (this.sim.rigidRuntime) for (const booster of st.boosters) if (booster.attached) this.detachBooster(booster);
    const before = this.sim.rigidLink.currentRigidSnapshot();
    const datum = before?.geometry.stageBases[st.index] ?? v3();
    const partitions = before ? detachedOwnerPartitions(before, [{ id: 'stage', ownerIds: [st.spec.id], datumBody: datum }]) : [];
    let impulse = SEPARATION_SPEED * (st.spec.dryMass + st.propellant);
    if (before) {
      // Use the component ledger so spent RCS gas is not silently restored in
      // the two-body momentum balance. J = reduced mass * relative speed.
      const stageMass = before.components.filter(part => part.ownerId === st.spec.id)
        .reduce((sum, part) => sum + part.mass, 0);
      const reducedMass = stageMass * (before.mass - stageMass) / before.mass;
      // Payload release specifies the extra RELATIVE speed, not a stage delta-v.
      // An ascent separation gives the spent stage SEPARATION_SPEED, and never
      // gives the stack it leaves more: a heavy stage cut off with propellant
      // aboard pushed Electron's 0.25 t Curie stack forward by 13.5 m/s and
      // raised its apoapsis 16 km.
      impulse = relativeSeparationSpeed !== undefined ? relativeSeparationSpeed * reducedMass
        : Math.min(impulse, SEPARATION_SPEED * (before.mass - stageMass));
    }
    const split = this.sim.rigidLink.rigidSplit(before, partitions, before ? [{ childAId: 'stage', childBId: 'active', pointDatumBody: datum,
      impulseOnABody: v3(-impulse, 0, 0) }] : []);
    this.sim.vehicle.separateStage(st, this.sim.state.t);
    this.sim.debrisTracker.spawnStageDebris(st);
    if (before) {
      this.sim.rigidLink.applyRetainedRigid(split);
      this.sim.debrisTracker.attachRigidDebris(this.sim.debris[this.sim.debris.length - 1], split.find(part => part.id === 'stage')!, before, st.spec, st.engineFraction);
    }
  }

  // ------------------------------------------------------------ staging
  onBoosterBurnout(b: BoosterState): void {
    const s = this.sim.state;
    this.sim.event('evt.boosterBurnout', 'info', { name: b.spec.name });
    const delay = b.spec.sepDelay ?? 2;
    this.sim.schedule(s.t + delay, 'boosterSep', () => {
      if (!b.attached) return;
      this.detachBooster(b);
      this.sim.event('evt.boosterSep', 'success', { name: b.spec.name, alt: Math.round(this.sim.state.altitude / 1000), speed: Math.round(this.sim.state.speed) });
      this.sim.failures.onBoosterSeparation();
    });
  }

  /**
   * Shut the ascent stage down and log SECO.
   *
   * Every path that ends the powered ascent goes through here, so the marquee
   * milestone the event bar is built around cannot go missing on one of them:
   * before this existed `evt.seco` was emitted from `checkAscent` only, and the
   * natural-depletion branch of `onCoreBurnout` — which hands the insertion to
   * the coast-to-apoapsis + circularise machinery — logged `evt.coastToApoapsis`
   * and `evt.burnComplete` but never a SECO (audit item B20).
   */
  cutoffAscentStage(st: StageState | null): void {
    const s = this.sim.state;
    if (st) this.sim.vehicle.cutoffStage(st, s.t);
    if (this.secoReported) return;
    this.secoReported = true;
    this.sim.event('evt.seco', 'major', st ? this.sim.stageParams(st) : { stage: '' });
  }

  onCoreBurnout(st: StageState, rNext: Vec3, vNext: Vec3): void {
    const s = this.sim.state;
    const isLast = st.index >= this.sim.vehicle.lastLauncherIndex;
    if (st.spec.isSpacecraft) this.sim.event('evt.spacecraftPropellantOut', 'warn', this.sim.stageParams(st));
    else this.sim.event(st.index === 0 ? 'evt.meco' : 'evt.stageCutoff', 'major', { stage: st.spec.name, n: st.index + 1 });
    if (s.status === 'burn' && s.currentBurn) {
      // stage exhausted mid-burn
      if (st.index === this.sim.vehicle.stages.length - 1) {
        this.sim.burns.finishBurnIncomplete();
        return;
      }
      if (isLast && this.sim.vehicle.hasSpacecraftStage) {
        this.separatePayload(true);
        return;
      }
      this.stageTo(st.index + 1, true);
      return;
    }
    if (s.status === 'ascent') {
      const el = elementsFromState(rNext, vNext);
      const hIns = this.sim.plan.insertionAltitude;
      // Decide between continuing the powered ascent with the next stage or coasting
      // to apoapsis and circularising there. Coasting is preferred when the apoapsis
      // is already at the parking altitude and either the next stage is too weak to
      // hold altitude or the remaining delta-v is small.
      let nearApo = false;
      const haIns = this.sim.plan.insertionApoapsis;
      if (!isLast && el.apoapsisAlt >= haIns - 3e3 && el.periapsisAlt < hIns - 3e3 && s.altitude > 120e3 && el.e < 1) {
        const next = this.sim.vehicle.stages[st.index + 1];
        const massAfter = this.sim.vehicle.totalMass() - (st.spec.dryMass + st.propellant);
        const aNext = (next.spec.engine.count * next.spec.engine.thrustVac) / Math.max(1, massAfter);
        const rm = norm(rNext);
        const up = normalize(rNext);
        const vzN = dot(vNext, up);
        const vh = norm(sub(vNext, scale(up, vzN)));
        const gEff = MU_EARTH / (rm * rm) - (vh * vh) / rm;
        const aIns = (2 * R_EARTH + hIns + haIns) / 2;
        const vPer = Math.sqrt(MU_EARTH * (2 / (R_EARTH + hIns) - 1 / aIns));
        // Coast + circularise only when the shortfall is small; a large shortfall is
        // better flown with the closed-loop ascent law (which lofts as required).
        const shortfall = vPer - vh;
        nearApo = shortfall < (aNext < 0.9 * gEff ? 700 : 400);
      }
      if (isLast) {
        if (el.periapsisAlt > 100e3 && el.apoapsisAlt >= hIns - 3e3 && el.e < 1) {
          this.cutoffAscentStage(st);
          this.sim.event('evt.lowPerigee', 'warn', { pe: Math.round(el.periapsisAlt / 1000) });
          this.sim.ascent.finishAscent(el);
        } else {
          this.sim.event('evt.outOfPropellant', 'fail', { ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000) });
          this.sim.failSuborbital();
        }
        return;
      }
      if (nearApo && !this.circularizeInserted) {
        // coast to apoapsis and circularise with the next stage (more efficient than continuing to push)
        this.circularizeInserted = true;
        this.sim.plan.burns.unshift({ id: 'circ', kind: 'circularize', atU: 0, targetPeriapsis: hIns, dvEstimate: 0, done: false });
        this.cutoffAscentStage(st);
        this.sim.event('evt.coastToApoapsis', 'info', { ap: Math.round(el.apoapsisAlt / 1000) });
        this.stageTo(st.index + 1, false);
        s.status = 'coast';
        s.note = 'coast';
        this.sim.burns.scheduleNextBurn(el);
        return;
      }
      this.stageTo(st.index + 1, true);
    }
  }

  /** Separate the stage below `nextIndex` and (optionally) ignite the next stage after its delays. */
  stageTo(nextIndex: number, igniteNext: boolean): void {
    const s = this.sim.state;
    const prev = this.sim.vehicle.stages[nextIndex - 1];
    const next = this.sim.vehicle.stages[nextIndex];
    const sepDelay = next.spec.sepDelay ?? 2;
    const ignDelay = next.spec.ignitionDelay ?? 2;
    this.stagingInProgress = true;
    this.sim.schedule(s.t + sepDelay, 'stageSep', () => {
      if (!prev.attached) return;
      this.detachStage(prev);
      this.sim.event('evt.stageSep', 'success', { stage: prev.spec.name, n: prev.index + 1, alt: Math.round(this.sim.state.altitude / 1000), speed: Math.round(this.sim.state.speed) });
      this.sim.failures.onStageSeparation(prev.index);
      if (igniteNext) {
        this.sim.schedule(this.sim.state.t + ignDelay, 'ignition', () => {
          this.sim.vehicle.igniteStage(next, this.sim.state.t);
          this.sim.event('evt.ignition', 'major', { stage: next.spec.name });
          this.stagingInProgress = false;
        });
      } else {
        this.stagingInProgress = false;
      }
    });
  }

  /**
   * Fairing jettison criterion. Payload fairings are dropped on a thermal
   * placard, not at a fixed altitude: the usual one is free-molecular heating
   * q̇ = ½ρv³ below 1135 W/m² (0.1 BTU/ft²·s) together with a dynamic pressure
   * below about 1.1 kPa, which on a normal ascent happens around 95–120 km. The
   * vehicle's `sepAltitude` is kept as a fallback ceiling for trajectories that
   * never satisfy the placard (a slow, very lofted climb).
   */
  fairingReleased(alt: number, q: number, rho: number, airspeed: number): boolean {
    const f = this.sim.vehicleSpec.fairing;
    if (!f) return false;
    if (alt < Math.min(f.sepAltitude, FAIRING_ALTITUDE_FLOOR)) return false;
    // An operator who publishes a jettison TIME flies it: Ariane 6, Vega-C,
    // H-IIA and Long March 2D all do, and the altitude floor above is what
    // stops a slow trajectory from shedding the fairing in dense air anyway.
    // This replaces four per-vehicle `heatFluxLimit` values that had been
    // back-solved from these same times — see `FairingSpec.sepTime` in
    // src/types.ts for why that was not a placard (audit hand-off d, review
    // follow-up).
    if (f.sepTime !== undefined) return this.sim.state.t >= f.sepTime;
    const heatFlux = 0.5 * rho * airspeed * airspeed * airspeed;
    // The placard is an operator's choice, not a law of nature, but 1135 W/m²
    // (0.1 BTU/ft²·s) is the common one and it is the only one in the model.
    if (heatFlux < FAIRING_HEAT_FLUX_LIMIT && q < FAIRING_Q_LIMIT) return true;
    // Backstop for a trajectory that never satisfies the placard (a slow,
    // heavily lofted climb): drop it well above the vehicle's quoted altitude.
    return alt >= f.sepAltitude + 40e3;
  }

  /**
   * Separate the spacecraft from the last launcher stage. The spent stage becomes
   * debris drifting behind; the spacecraft (with its own propulsion stage, if any)
   * is what the simulation continues to track.
   */
  separatePayload(igniteSpacecraft: boolean): void {
    const s = this.sim.state;
    if (s.payloadSeparated) return;
    const st = this.sim.vehicle.active;
    // Not while the stage is still tailing off. The cut-off was timed on the
    // orbit its tail-off leaves the stack in, so releasing the payload in the
    // middle of it hands that impulse to the spent stage instead — 26 m/s,
    // 117 km of apoapsis, for Long March 2D's second stage at 10 g. Real
    // sequences separate seconds after the shutdown for the same reason.
    if (st && st.attached && !st.spec.isSpacecraft && this.sim.vehicle.coreTailingOff(st, s.t)) {
      if (!this.sim.pending.some((p) => p.label === 'payloadSep')) {
        this.sim.schedule(st.cutoffTime + TAILOFF_SPAN * engineTailoffS(st.spec.engine), 'payloadSep',
          () => this.separatePayload(igniteSpacecraft));
      }
      return;
    }
    if (st && st.attached && !st.spec.isSpacecraft && this.sim.rigidRuntime) {
      // Estimated 0.5 m/s relative release speed; no manufacturer spring model.
      this.detachStage(st, 0.5);
      this.sim.debris[this.sim.debris.length - 1].visual.kind = 'upperStage';
    } else if (st && st.attached && !st.spec.isSpacecraft) {
      const vDir = norm(s.v) > 1 ? normalize(s.v) : s.dir;
      // The spent stage is only orbital debris if the orbit it is left in is one:
      // hard-coding `outcome: 'orbit'` propagated it on a Kepler arc straight
      // through the planet whenever the payload was released off a marginal
      // ascent (audit item B28).
      const elNow = elementsFromState(s.r, s.v);
      const orbital = elNow.e < 1 && elNow.periapsisAlt > 120e3;
      this.sim.debris.push({
        id: this.sim.nextDebrisId(), name: st.spec.name, r: clone(s.r), v: addScaled(s.v, vDir, -0.5), dir: clone(s.dir),
        mass: st.spec.dryMass + st.propellant, area: Math.PI * (st.spec.diameter / 2) ** 2, cd: 2.2,
        visual: { diameter: st.spec.diameter, length: st.spec.length, color: st.spec.color ?? '#ccc', kind: 'upperStage' },
        alive: true, createdAt: s.t, outcome: orbital ? 'orbit' : undefined,
      });
      this.sim.vehicle.separateStage(st, s.t);
    }
    s.payloadSeparated = true;
    s.mass = this.sim.vehicle.totalMass();
    // `satId` is what the presentation layer resolves the localized spacecraft
    // name from (`localizeEventParams` in src/ui/names.ts). `name` stays on the
    // event as the English literal from src/data: physics is not allowed to
    // know about dictionaries, the CSV export is a data file, and a renderer
    // that has no dictionary entry for this spacecraft falls back to it.
    this.sim.event('evt.payloadSep', 'success', { name: this.sim.satellite.name, satId: this.sim.satellite.id });
    if (igniteSpacecraft) {
      const sc = this.sim.vehicle.active;
      if (sc && sc.spec.isSpacecraft) {
        this.sim.schedule(s.t + (sc.spec.ignitionDelay ?? 5), 'ignition', () => {
          this.sim.vehicle.igniteStage(sc, this.sim.state.t);
          this.sim.event('evt.ignition', 'major', this.sim.stageParams(sc));
        });
      }
    }
  }

  /** Jettison the fairing once its placard allows (or report a stuck one). */
  checkFairing(alt: number, q: number, rho: number, vAirMag: number): void {
    const s = this.sim.state;
    // --- fairing: jettisoned on the free-molecular heating / dynamic-pressure
    // placard rather than at a fixed altitude (see fairingReleased).
    if (this.sim.vehicleSpec.fairing && s.liftoff && this.fairingReleased(alt, q, rho, vAirMag)) {
      if (this.sim.vehicle.fairingAttached && !this.sim.failures.fairingStuck) {
        const before = this.sim.rigidLink.currentRigidSnapshot();
        const fairingParts = before ? fairingHalfPartitions(before).map(part => part.id === 'active' ? part : { ...part, datumBody: before.geometry.fairingBase }) : [];
        const split = this.sim.rigidLink.rigidSplit(before, fairingParts, before ? [{ childAId: 'fairing.0', childBId: 'fairing.1',
          pointDatumBody: before.components.find(part => part.kind === 'fairing')!.centerBody,
          impulseOnABody: v3(0, this.sim.vehicleSpec.fairing!.mass / 2 * 2.5, 0) }] : []);
        this.sim.vehicle.jettisonFairing();
        this.sim.event('evt.fairingSep', 'success', { alt: Math.round(alt / 1000) });
        const debrisStart = this.sim.debris.length;
        this.sim.debrisTracker.spawnFairing(s.r, s.v);
        if (before) {
          this.sim.rigidLink.applyRetainedRigid(split);
          for (let i = 0; i < 2; i++) this.sim.debrisTracker.attachRigidDebris(this.sim.debris[debrisStart + i], split.find(part => part.id === `fairing.${i}`)!, before);
        }
      } else if (this.sim.failures.fairingStuck && !this.sim.events.some((e) => e.key === 'evt.fairingStuck')) {
        this.sim.event('evt.fairingStuck', 'warn');
      }
    }
  }
}
