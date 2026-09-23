/**
 * The orbital sequence after the ascent: scheduling, igniting, steering and
 * completing each planned burn, re-planning from the orbit actually achieved,
 * and the end of the mission.
 */
import { MU_EARTH, R_EARTH, DEG, RAD } from '../constants';
import { Vec3, sub, scale, dot, cross, norm, normalize, angleBetween } from '../vec3';
import { nextJ2Apsis, propagateJ2Coast, shootJ2ApsisVelocity } from '../rigid/orbit-prediction';
import { OrbitalElements, elementsFromState, timeToArgumentOfLatitude, timeToApoapsis, timeToPeriapsis, propagateKepler, planeNormal } from '../orbital';
import { desiredVelocity, planeNormalThrough } from '../guidance';
import { BurnPlan, replanBurns, orbitResiduals, apsisTolerance, ORBIT_INSERTION_FLOOR } from '../mission';
import type { Simulation } from '../simulation';
import { BURN_IGNITION_ALIGNMENT, BURN_PREORIENT_TIME, MAX_REPLANS } from './constants';

export class BurnSequencer {
  private lastBurnDv = Infinity;
  /** the current burn has lit (the attitude-alignment gate has been passed once) */
  burnIgnited = false;
  rigidBurnForecast: { burn: BurnPlan; time: number; context: string; r: Vec3; v: Vec3 } | null = null;
  rigidTransfer: { burn: BurnPlan; context: string; direction: Vec3; requiredDv: number; deliveredDv: number } | null = null;
  rigidScheduledContext: string | null = null;
  rigidCoastIntervened = false;
  rigidApexCorrections = 0;
  replans = 0;
  /** smallest apsis residual any replan has seen, m (progress detector) */
  lastResidual = Infinity;
  /** consecutive replans that did not improve the residual */
  stalledReplans = 0;

  constructor(readonly sim: Simulation) {}

  /** Longest single orbital burn before splitting it across perigee/apogee passes, s. */
  maxBurnDurationFor(burn: BurnPlan, el: OrbitalElements): number {
    const period = isFinite(el.period) ? el.period : 5400;
    if (burn.kind === 'raiseApoapsis') return Math.min(900, Math.max(300, 0.1 * period));
    return Math.min(3600, Math.max(400, 0.12 * period));
  }

  // ------------------------------------------------------------ orbital burns
  rigidOrbitContext(): string {
    return `${this.sim.state.rigid?.configurationId ?? ''}/${this.sim.vehicle.activeIndex}/${this.sim.vehicle.active?.engineFraction ?? 0}/${this.sim.failures.failureApplied}/${this.sim.rigidRuntime?.command.mode}`;
  }

  rigidForecastAt(burn: BurnPlan, time: number): { r: Vec3; v: Vec3 } | null {
    const context = this.rigidOrbitContext(), cached = this.rigidBurnForecast;
    if (cached?.burn === burn && cached.time === time && cached.context === context) return cached;
    const predicted = propagateJ2Coast(this.sim.state, Math.max(0, time - this.sim.state.t));
    this.rigidBurnForecast = predicted ? { ...predicted, burn, time, context } : null;
    return predicted;
  }

  failRigidOrbitPrediction(): void {
    const s = this.sim.state;
    this.sim.event('evt.burnPredictionUnavailable', 'warn');
    for (const burn of this.sim.plan.burns) burn.done = true;
    this.sim.pending = this.sim.pending.filter(action => action.label !== 'burnStart');
    this.rigidBurnForecast = null; this.rigidTransfer = null;
    s.currentBurn = null; s.nextBurnTime = -1; s.burnDvRemaining = 0; s.burnPlaneNormal = null;
    s.thrust = 0; s.throttle = 0; s.coreThrottle = 0; s.boosterThrottle = 0;
    if (this.sim.vehicle.active) this.sim.vehicle.cutoffStage(this.sim.vehicle.active, s.t);
    const el = elementsFromState(s.r, s.v);
    if (el.e < 1 && el.periapsisAlt > 120e3) this.reachTargetOrbit(el, false);
    else this.sim.failSuborbital();
  }

  physicalApexShot(burn: BurnPlan, state: { r: Vec3; v: Vec3 }) {
    const speed = norm(state.v);
    const width = Math.max(30, Math.min(1500, 2 * burn.dvEstimate + 20));
    return shootJ2ApsisVelocity(state, state.v, R_EARTH + burn.physicalApoapsis!, 'apoapsis', {
      minSpeedMS: Math.max(1, speed - width), maxSpeedMS: speed + width,
    });
  }

  prepareRigidTransfer(burn: BurnPlan): boolean {
    const s = this.sim.state, shot = this.physicalApexShot(burn, s);
    if (!shot) { this.failRigidOrbitPrediction(); return false; }
    const dv = shot.speedMS - norm(s.v);
    burn.lowering = dv < 0;
    this.rigidTransfer = { burn, context: this.rigidOrbitContext(), direction: scale(normalize(s.v), dv < 0 ? -1 : 1),
      requiredDv: Math.abs(dv), deliveredDv: 0 };
    s.burnDvRemaining = Math.abs(dv);
    return true;
  }

  scheduleNextBurn(el: OrbitalElements): void {
    const s = this.sim.state;
    let burn = this.sim.plan.burns.find((b) => !b.done);
    if (!burn) {
      this.reachTargetOrbit(el);
      return;
    }
    // The mission may already be over. The planner's tolerance is deliberately a
    // little tighter than the acceptance band, so a residual can be inside the
    // band and still look worth a burn — and flying it costs a revolution (ten
    // and a half hours at a geostationary transfer) for an orbit that was
    // already the one that was asked for.
    if (orbitResiduals(this.sim.plan.target, el, this.sim.raanWasReachable()).onTarget) {
      for (const b of this.sim.plan.burns) b.done = true;
      this.reachTargetOrbit(el);
      return;
    }
    // ensure a stage with propellant is available (stage to the next one if needed)
    let stage = this.sim.vehicle.active;
    if (stage && (stage.burnedOut || !this.sim.vehicle.activeHasPropellant() || (!stage.spec.restartable && stage.ignited))) {
      if (stage.index + 1 < this.sim.vehicle.stages.length) {
        const next = this.sim.vehicle.stages[stage.index + 1];
        if (next.spec.isSpacecraft) {
          if (!s.payloadSeparated) this.sim.staging.separatePayload(false);
        } else if (stage.attached) {
          this.sim.staging.stageTo(stage.index + 1, false);
        }
        stage = next;
      } else {
        this.sim.event('evt.noStagesLeft', 'warn');
        this.finishBurnIncomplete();
        return;
      }
    }
    if (!stage) {
      this.finishBurnIncomplete();
      return;
    }
    this.rigidBurnForecast = null;
    this.rigidTransfer = null;
    // A frozen osculating ellipse can overestimate the physical J2 apex by
    // kilometres. Never circularize below a perigee that has not been reached.
    // First raise the actual ballistic apex with a bounded physical impulse.
    let physicalApex: ReturnType<typeof nextJ2Apsis> = null;
    if (this.sim.rigidRuntime && burn.kind !== 'raiseApoapsis' && el.e < 1 && el.periapsisAlt > 120e3) {
      physicalApex = nextJ2Apsis(s, 'apoapsis', { includeInitial: true });
      if (!physicalApex) { this.failRigidOrbitPrediction(); return; }
      const perigee = burn.targetPeriapsis ?? this.sim.plan.target.perigee;
      if (physicalApex.radiusM - R_EARTH < perigee - 0.5 * apsisTolerance(perigee)) {
        if (this.rigidApexCorrections >= 3) { this.failRigidOrbitPrediction(); return; }
        this.rigidApexCorrections++;
        const correction: BurnPlan = { id: `physical-apex-${this.rigidApexCorrections}`, kind: 'raiseApoapsis', atU: 'asap',
          targetApoapsis: this.sim.plan.target.apogee, physicalApoapsis: this.sim.plan.target.apogee, dvEstimate: 10, done: false };
        this.sim.plan.burns.splice(this.sim.plan.burns.indexOf(burn), 0, correction);
        burn = correction;
      }
    }
    let tGo: number;
    if (burn.kind === 'raiseApoapsis') {
      burn.lowering = burn.physicalApoapsis === undefined && (burn.targetApoapsis ?? 0) < el.apoapsisAlt;
      // An apoapsis change is made at the periapsis. On a circular parking
      // orbit any point will do when raising ('asap'), but a trim that has to
      // bring the apoapsis *down* must be flown at the periapsis or it digs
      // the opposite side of the orbit out instead.
      // `timeToPeriapsis` needs a line of apsides to exist. Below e ≈ 0.001 the
      // eccentricity vector is numerical noise, argp is arbitrary and the
      // function returns a time to a point that means nothing — which is how a
      // 4 m/s "periapsis trim" came to be flown at the apoapsis and ratchet the
      // periapsis DOWN one kilometre per revolution (audit items B6, B40(6)).
      const apsidesDefined = el.e > 1e-3;
      if (apsidesDefined && (el.e > 0.01 || burn.lowering)) {
        tGo = timeToPeriapsis(el);
        // Insertion happens at the periapsis, so `timeToPeriapsis` is almost a
        // whole revolution: burn now instead of wasting an orbit when the
        // periapsis has only just gone by.
        if (isFinite(el.period) && tGo > el.period - 150) tGo = 0;
      }
      else if (burn.atU === 'asap' || !apsidesDefined) tGo = 0;
      else if (burn.atU === 'node') tGo = Math.min(timeToArgumentOfLatitude(el, 0), timeToArgumentOfLatitude(el, Math.PI));
      else tGo = timeToArgumentOfLatitude(el, burn.atU);
    } else if (el.e > 1e-3) {
      tGo = physicalApex ? physicalApex.timeS : timeToApoapsis(el);
    } else {
      // Circular orbit: the "apoapsis" is a meaningless point on it, so a burn
      // that shapes the orbit AND changes the plane has to be flown at a node,
      // where a plane change is cheapest and well defined.
      tGo = burn.targetInclination !== undefined
        ? Math.min(timeToArgumentOfLatitude(el, 0), timeToArgumentOfLatitude(el, Math.PI))
        : 0;
    }
    if (this.sim.rigidRuntime && burn.kind === 'raiseApoapsis' && tGo > 0 && el.e > 1e-3 && (el.e > 0.01 || burn.lowering)) {
      const peri = nextJ2Apsis(s, 'periapsis', { includeInitial: true });
      if (!peri) { this.failRigidOrbitPrediction(); return; }
      // Keep explicit node/argument choices. Replace only the apsis-timed path.
      tGo = peri.timeS > el.period - 150 ? 0 : peri.timeS;
    }
    if (!isFinite(tGo)) tGo = 0;
    const at = this.sim.rigidRuntime ? propagateJ2Coast(s, tGo) : propagateKepler(s.r, s.v, tGo);
    if (!at) { this.failRigidOrbitPrediction(); return; }
    const vDes = desiredVelocity(at.r, at.v, burn.kind, burn.targetApoapsis, burn.targetPeriapsis, burn.targetInclination);
    let dv = norm(sub(vDes, at.v));
    if (this.sim.rigidRuntime && burn.physicalApoapsis !== undefined) {
      const shot = this.physicalApexShot(burn, at);
      if (!shot) { this.failRigidOrbitPrediction(); return; }
      const correction = shot.speedMS - norm(at.v);
      burn.lowering = correction < 0; dv = Math.abs(correction);
    }
    const e = stage.spec.engine;
    const thrust = e.count * e.thrustVac * stage.engineFraction;
    const tBurn = thrust > 0 ? this.sim.vehicle.burnTimeFor(dv, true) : 1e9;
    const maxDur = this.maxBurnDurationFor(burn, el);
    burn.maxDuration = maxDur;
    const tBurnThis = Math.min(tBurn, maxDur);
    const period = isFinite(el.period) ? el.period : 5400;
    let tStart = s.t + tGo - tBurnThis / 2;
    // `atU: 'asap'` means "any point on a circular parking orbit will do", and
    // for a burn that RAISES the apoapsis that is true. It is false for a
    // retrograde trim, and this override applying to one was the whole of the
    // B6 symptom that survived the last wave (audit item B6, review follow-up):
    // `planBurns` marks a circular target 'asap', `tGo` was correctly set to
    // `timeToPeriapsis`, and this line then threw it away and re-armed the burn
    // 30 s later — i.e. at the apoapsis the previous shape burn had just ended
    // at. The slew guard below then added a whole period, which preserves the
    // orbital position, so the trim ignited at the APOAPSIS every time: it dug
    // the periapsis out at ~19 km/s of apsis rate, the "never dig the periapsis
    // out" safety in `checkBurn` stopped it on its first or second step, the
    // apoapsis had not moved, and the re-planner scheduled the same burn again.
    // Measured on atlasv551/iss/50: burnStart 4793/10453/16033, two of them one
    // second long, apoapsis pinned at 480.0 km against a 420 km target for
    // 4.4 hours. (The audit's suggested cause — `desiredVelocity` clamping
    // rP = min(rP, rm) — is not it: that clamp only bites when the target
    // periapsis is ABOVE the current radius, which cannot happen at the point a
    // lowering burn is flown from. Instrumented per-step, `desiredVelocity`
    // returned the correct retrograde target throughout.)
    if (burn.kind === 'raiseApoapsis' && burn.atU === 'asap' && el.e <= 0.01 && !burn.lowering) {
      tStart = s.t + 30;
    } else if (burn.kind !== 'raiseApoapsis' && el.periapsisAlt < 120e3) {
      // suborbital: no second chance; burn now unless the apoapsis is clearly still ahead
      tStart = tGo < period / 2 ? Math.max(s.t + 1, s.t + tGo - tBurnThis / 2) : s.t + 1;
    } else if (tStart < s.t + 1) {
      if (tGo < 60) tStart = s.t + 1;
      else tStart = s.t + tGo + period - tBurnThis / 2;
    }
    // A retrograde trim has to be flown at the periapsis (anywhere else it
    // moves the periapsis instead), and the stack needs time to turn around
    // first — the attitude slew rate is a few degrees per second.
    if (burn.lowering && tStart - s.t < 120 && isFinite(period)) tStart += period;
    // Deadband (audit item B6). A burn whose velocity-to-be-gained is smaller
    // than what would move the apsis it is aiming at by a fifth of the
    // acceptance band does nothing useful: it ignites and reports
    // `evt.burnComplete` inside a single integration step, the apsis does not
    // move, and the re-planner schedules the same burn again next revolution.
    //
    // The threshold is derived, not guessed. Burning δv at radius r on an orbit
    // of semi-major axis a moves the OPPOSITE apsis by δr = 4a²vδv/μ, so the
    // impulse worth flying is δv = μ δr /(4 a² v). At a 500 km circular target
    // that makes a fifth of the 10 km band 0.55 m/s; at a geostationary
    // transfer's apogee, a fifth of the 2 km perigee band is 0.21 m/s — which is
    // exactly why a single fleet-wide "3 m/s" constant could not work for both.
    const bandM = apsisTolerance(burn.kind === 'raiseApoapsis' ? burn.targetApoapsis ?? 0 : burn.targetPeriapsis ?? 0);
    const aBurn = Math.max(1e6, isFinite(el.a) && el.a > 0 ? el.a : norm(at.r));
    const vBurn = Math.max(1, norm(at.v));
    const deadband = Math.max(0.05, Math.min(20, (MU_EARTH * 0.2 * bandM) / (4 * aBurn * aBurn * vBurn)));
    if (dv < deadband) {
      burn.done = true;
      s.currentBurn = null;
      const next = this.sim.plan.burns.find((b) => !b.done);
      if (next) this.scheduleNextBurn(el);
      else this.reachTargetOrbit(el);
      return;
    }
    s.nextBurnTime = tStart;
    s.currentBurn = burn;
    if (this.sim.rigidRuntime) {
      this.rigidScheduledContext = this.rigidOrbitContext();
      this.rigidCoastIntervened = false;
      if (!this.rigidForecastAt(burn, tStart)) { this.failRigidOrbitPrediction(); return; }
    }
    burn.dvEstimate = dv;
    this.sim.event('evt.burnScheduled', 'info', { kind: burn.kind, dv: Math.round(dv), tgo: Math.round(tStart - s.t), dur: Math.round(tBurnThis) });
    const stRef = stage;
    this.sim.schedule(tStart, 'burnStart', () => {
      const st = this.sim.vehicle.active;
      if (!st || st.index !== stRef.index) {
        // staging still pending; retry shortly
        this.sim.schedule(this.sim.state.t + 1, 'burnStart', () => this.startBurn(burn));
        return;
      }
      this.startBurn(burn);
    });
  }

  startBurn(burn: BurnPlan): void {
    const s = this.sim.state;
    if (this.sim.rigidRuntime && (burn.done || s.status === 'orbit' || s.status === 'failed')) return;
    if (this.sim.rigidRuntime?.command.mode === 'manual') { this.rigidCoastIntervened = true; return; }
    if (this.sim.rigidRuntime && s.status === 'coast' && this.rigidScheduledContext !== null
      && (this.rigidCoastIntervened || this.rigidScheduledContext !== this.rigidOrbitContext())) {
      this.checkCoast(elementsFromState(s.r, s.v)); return;
    }
    const st = this.sim.vehicle.active;
    if (!st) {
      this.finishBurnIncomplete();
      return;
    }
    if (!st.ignited || st.cutoff) {
      this.sim.vehicle.igniteStage(st, s.t);
      this.sim.event('evt.ignition', 'major', this.sim.stageParams(st));
    }
    s.status = 'burn';
    s.note = 'burn';
    s.currentBurn = burn;
    s.burnStartTime = s.t;
    s.burnDvRemaining = Math.max(0.05, burn.dvEstimate);
    this.lastBurnDv = Infinity;
    this.burnIgnited = false;
    this.rigidTransfer = null;
    s.burnPlaneNormal = null;
    if (burn.kind === 'shapeAtApoapsis' && burn.targetInclination !== undefined) {
      const el = elementsFromState(s.r, s.v);
      if (Math.abs(burn.targetInclination - el.i) > 0.5 * DEG) {
        // Genuine plane change: keep the current line of nodes, rotate to the new inclination.
        s.burnPlaneNormal = planeNormal(burn.targetInclination, el.raan);
      } else {
        // Small correction: the plane through the apoapsis point closest to the current one.
        const tGo = Math.min(timeToApoapsis(el), (isFinite(el.period) ? el.period : 5400) / 2);
        const at = this.sim.rigidRuntime ? this.rigidForecastAt(burn, Math.max(s.t, s.nextBurnTime))
          : propagateKepler(s.r, s.v, tGo);
        if (!at) { this.failRigidOrbitPrediction(); return; }
        const curNormal = normalize(cross(at.r, at.v));
        s.burnPlaneNormal = planeNormalThrough(normalize(at.r), burn.targetInclination, curNormal);
      }
    }
    this.sim.event('evt.burnStart', 'major', { kind: burn.kind, ...this.sim.stageParams(st) });
  }

  checkCoast(el: OrbitalElements): void {
    if (!this.sim.rigidRuntime) return; // legacy pending action starts the burn
    if (this.sim.rigidRuntime.command.mode === 'manual') { this.rigidCoastIntervened = true; return; }
    if (!this.sim.state.currentBurn || this.rigidScheduledContext === null) return;
    if (this.rigidCoastIntervened || this.rigidScheduledContext !== this.rigidOrbitContext()) {
      // A manual impulse, separation or engine failure invalidates both the
      // stored prediction and its delayed ignition callback.
      this.sim.pending = this.sim.pending.filter(action => action.label !== 'burnStart');
      this.rigidBurnForecast = null; this.rigidTransfer = null;
      this.sim.state.currentBurn = null; this.sim.state.nextBurnTime = -1;
      // A changed operator command/body/engine is a new planning context, not
      // a failed automatic burn. Do not consume stall or correction allowances
      // merely by switching modes while the engines remain off.
      this.replans = 0; this.stalledReplans = 0; this.lastResidual = Infinity;
      this.rigidApexCorrections = 0;
      this.replanRemainingBurns(el);
      this.scheduleNextBurn(el);
    }
  }

  checkBurn(el: OrbitalElements): void {
    const s = this.sim.state;
    const b = s.currentBurn;
    if (!b) return;
    // Six-DOF can genuinely lose coast pointing authority (for example, empty
    // RCS with the main engine held behind the alignment gate). The old small-
    // trim checks have no time limit below 40 m/s, so this otherwise waits
    // forever. Allow the same 240 s as preorientation, then report the actual
    // pointing failure without inventing a propulsive delta-v shortage.
    if (this.sim.rigidRuntime?.command.mode === 'auto' && !this.burnIgnited
      && s.t - s.burnStartTime >= BURN_PREORIENT_TIME
      && el.e < 1 && el.periapsisAlt > 120e3) {
      this.sim.event('evt.burnAlignmentTimeout', 'warn', { seconds: BURN_PREORIENT_TIME });
      for (const planned of this.sim.plan.burns) planned.done = true;
      s.burnDvRemaining = 0;
      s.burnPlaneNormal = null;
      s.thrust = 0; s.throttle = 0; s.coreThrottle = 0; s.boosterThrottle = 0;
      this.reachTargetOrbit(el, false);
      return;
    }
    let complete = false;
    if (this.sim.rigidRuntime && b.physicalApoapsis !== undefined) {
      complete = this.burnIgnited && !!this.rigidTransfer
        && this.rigidTransfer.deliveredDv >= this.rigidTransfer.requiredDv - 0.01;
      if (!complete && this.burnIgnited && s.t - s.burnStartTime > (b.maxDuration ?? 300)) {
        this.failRigidOrbitPrediction(); return;
      }
    } else if (b.kind === 'raiseApoapsis') {
      const target = b.targetApoapsis ?? 0;
      const tolA = Math.max(2e3, target * 0.002);
      if (el.e >= 1) complete = true; // escaped: stop before it gets worse
      // Completion is judged on the apoapsis itself. The velocity-to-be-gained
      // figure is only meaningful exactly at the periapsis, so it must not be
      // allowed to end the burn.
      else if (b.lowering ? el.apoapsisAlt <= target + tolA : el.apoapsisAlt >= target - tolA) complete = true;
      // Safety: a retrograde apoapsis trim must never dig the periapsis out of
      // the orbit — and never below the insertion floor whatever the target is.
      // The floor half is the same rule as `abandonInsertion`, stated where the
      // burn is commanded rather than where its consequences arrive; for every
      // target in the fleet the 20 km band below the target perigee is already
      // the binding one, so it is explicitness rather than a change.
      else if (b.lowering && el.periapsisAlt < Math.max(ORBIT_INSERTION_FLOOR, this.sim.plan.target.perigee - 20e3)) complete = true;
      else if (s.t - s.burnStartTime > (b.maxDuration ?? this.maxBurnDurationFor(b, el)) && el.e < 1 && el.periapsisAlt > 120e3) {
        // low-thrust stage: split the apogee-raising into several perigee burns
        const st = this.sim.vehicle.active;
        if (st) this.sim.vehicle.cutoffStage(st, s.t);
        this.sim.event('evt.burnPaused', 'info', { ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000) });
        s.currentBurn = null;
        s.status = 'coast';
        s.note = 'coast';
        // Re-plan from the orbit the paused burn actually left behind, exactly
        // as a completed burn does. Both pause branches used to go straight to
        // `scheduleNextBurn`, so a multi-pass Briz-M or Fregat kept flying the
        // burn list it had before the pass (audit item B6).
        this.replanRemainingBurns(el);
        if (!this.sim.plan.burns.some((x) => !x.done)) {
          this.reachTargetOrbit(el);
          return;
        }
        this.scheduleNextBurn(el);
        return;
      }
    } else {
      const dv = s.burnDvRemaining;
      // The cut-off floor has to be below the smallest burn the planner will
      // schedule, or a sub-metre-per-second apsis trim completes on its first
      // step having done nothing. `scheduleNextBurn`'s deadband is as low as
      // 0.05 m/s at a geostationary apogee, so this is too.
      if (dv < 0.05) complete = true;
      else if (dv < 40 && dv > this.lastBurnDv * 1.02 + 0.002) complete = true; // passed the minimum
      else if (dv > 40 && s.t - s.burnStartTime > (b.maxDuration ?? this.maxBurnDurationFor(b, el)) && el.e < 1 && el.periapsisAlt > 120e3) {
        // long low-thrust apogee burn: continue at the next apoapsis
        const st = this.sim.vehicle.active;
        if (st) this.sim.vehicle.cutoffStage(st, s.t);
        this.sim.event('evt.burnPaused', 'info', { ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000) });
        s.currentBurn = null;
        s.status = 'coast';
        s.note = 'coast';
        // Re-plan from the orbit the paused burn actually left behind, exactly
        // as a completed burn does. Both pause branches used to go straight to
        // `scheduleNextBurn`, so a multi-pass Briz-M or Fregat kept flying the
        // burn list it had before the pass (audit item B6).
        this.replanRemainingBurns(el);
        if (!this.sim.plan.burns.some((x) => !x.done)) {
          this.reachTargetOrbit(el);
          return;
        }
        this.scheduleNextBurn(el);
        return;
      }
      this.lastBurnDv = dv;
    }
    if (complete) {
      // A burn that ignited and finished inside two seconds cannot have moved
      // the apsis it was aimed at; `replanRemainingBurns` treats that as a
      // whole stall allowance rather than half of one.
      const noOpBurn = s.t - s.burnStartTime < 2;
      const st = this.sim.vehicle.active;
      if (st) this.sim.vehicle.cutoffStage(st, s.t);
      b.done = true;
      s.currentBurn = null;
      this.sim.event('evt.burnComplete', 'success', {
        kind: b.kind, ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000), inc: +(el.i * RAD).toFixed(2),
      });
      if (b.kind === 'circularize' && !this.sim.events.some((e) => e.key === 'evt.parkingOrbit')) {
        // Nothing under the insertion floor is a parking orbit. A circularise
        // burn flown from a trajectory that is still sinking ends when the
        // vehicle matches circular speed at whatever radius it has reached by
        // then, and that radius follows the vehicle down: Proton-M/Briz-M with
        // 5.75 t reported "parking orbit 94 × 94 km" and then flew a 43-minute
        // transfer with a 94 km perigee. The burn is complete either way and
        // the re-planner carries on from the orbit achieved, but calling that
        // an insertion is how a failed one came to look like a good one.
        if (el.periapsisAlt >= ORBIT_INSERTION_FLOOR) {
          this.sim.event('evt.parkingOrbit', 'success', {
            ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000), inc: +(el.i * RAD).toFixed(2),
            dv: Math.round(this.sim.vehicle.deltaVRemaining()),
          });
        } else {
          this.sim.event('evt.lowPerigee', 'warn', { pe: Math.round(el.periapsisAlt / 1000) });
        }
      }
      // A short physical-apex correction deliberately changes the temporary
      // conic before the original shape burn. Its real delivered impulse is
      // not a no-op and must not be rejected by the conic progress heuristic.
      if (!(this.sim.rigidRuntime && b.physicalApoapsis !== undefined)) this.replanRemainingBurns(el, noOpBurn);
      if (this.sim.plan.burns.some((x) => !x.done)) {
        s.status = 'coast';
        s.note = 'coast';
        this.scheduleNextBurn(el);
      } else {
        this.reachTargetOrbit(el);
      }
    }
  }

  /**
   * Re-plan the burns that are still outstanding from the orbit that was
   * actually achieved. Without this the sequence computed before liftoff is
   * flown even when the ascent inserted 300 km high or 100 m/s short, and the
   * mission ends "off target" although the propellant to fix it was there.
   */
  replanRemainingBurns(el: OrbitalElements, noOpBurn = false): void {
    if (!(el.e < 1) || !isFinite(el.apoapsisAlt) || el.periapsisAlt < 100e3) return;
    // Stop on the RESIDUAL, not on a counter (audit items B5/B6). The hard
    // `replans >= MAX_REPLANS` freeze left the outstanding burns in the plan and
    // returned, so the caller scheduled the same burn that had just failed to
    // converge, again, forever: `vulcan/leo` at 50 % payload sat in `coast`
    // indefinitely at 596 × 499 km. The counter is still a backstop, but when it
    // runs out — or when a whole replan cycle stopped making progress — the
    // outstanding burns are dropped so the mission ends and `reachTargetOrbit`
    // reports what it actually achieved.
    //
    // A NO-OP burn spends the whole allowance at once (review follow-up). The
    // stop was asked to trip after a single non-improving cycle so a stuck
    // mission ends in minutes rather than the measured 3.9–4.4 hours of hung
    // coast; flying that as a flat `stalledReplans >= 1` costs a real mission —
    // `tests/ascent.test.ts`'s equatorial GTO needs one cycle that does not
    // improve the summed residual and then converges, and with the flat rule it
    // ends at 28 754 × 35 667 km instead of on target (measured).
    //
    // So the discriminator is what the burn DID, not how many cycles have run.
    // A burn that ignited and reported complete inside two seconds moved
    // nothing — that is the exact B6 signature — and one of those is enough.
    // A burn that ran for a meaningful time and still did not help keeps the
    // two-cycle allowance it had.
    const residual = Math.abs(el.apoapsisAlt - this.sim.plan.target.apogee)
      + Math.abs(el.periapsisAlt - this.sim.plan.target.perigee)
      + Math.abs(el.i - this.sim.plan.target.inclination) * 1e6;
    if (residual > this.lastResidual - 1e3) this.stalledReplans += noOpBurn ? 2 : 1;
    else this.stalledReplans = 0;
    this.lastResidual = Math.min(this.lastResidual, residual);
    if (this.replans >= MAX_REPLANS || this.stalledReplans >= 2) {
      for (const b of this.sim.plan.burns) b.done = true;
      return;
    }
    this.replans++;
    // The 2 m/s floor this filter used to carry threw away real corrections: at
    // a geostationary transfer's apogee, 1.1 m/s is 11 km of perigee — the whole
    // acceptance band — so every GTO mission kept whatever perigee the ascent
    // happened to give it (audit item B5). Whether a burn is worth flying is
    // decided in `scheduleNextBurn` against the apsis it would move, not here.
    const fresh = replanBurns(this.sim.plan.target, el)
      .filter((b) => b.dvEstimate > 0.05)
      .map((b) => (b.kind === 'raiseApoapsis' ? { ...b, lowering: (b.targetApoapsis ?? 0) < el.apoapsisAlt } : b));
    this.sim.plan.burns = [...this.sim.plan.burns.filter((b) => b.done), ...fresh];
  }

  finishBurnIncomplete(): void {
    const s = this.sim.state;
    const el = elementsFromState(s.r, s.v);
    if (s.currentBurn) s.currentBurn.done = true;
    s.currentBurn = null;
    if (el.e < 1 && el.periapsisAlt > 120e3) {
      this.sim.event('evt.insufficientDv', 'warn', { ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000), inc: +(el.i * RAD).toFixed(2) });
      this.reachTargetOrbit(el, false);
    } else {
      this.sim.event('evt.outOfPropellant', 'fail', { ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000) });
      this.sim.failSuborbital();
    }
  }

  /**
   * End of mission. `onTarget` is now only a *veto*: a caller that already knows
   * the mission fell short (a burn that could not be completed) passes false,
   * and everything else is decided by comparing the orbit with the target
   * (audit item B5). Before this, `evt.targetOrbit` was emitted unconditionally
   * from four call sites and the HUD said "target orbit achieved" on orbits that
   * were not — a 95 km high perigee at GTO, a quarter of a degree of plane error
   * on a geostationary mission, or simply whatever the plan happened to contain
   * when the re-planner ran out of budget.
   */
  reachTargetOrbit(el: OrbitalElements, onTarget = true): void {
    const s = this.sim.state;
    const res = orbitResiduals(this.sim.plan.target, el, true);
    const hit = onTarget && res.onTarget;
    s.status = 'orbit';
    s.note = hit ? 'orbit' : 'orbitOffTarget';
    s.currentBurn = null;
    s.nextBurnTime = -1;
    this.sim.event(hit ? 'evt.targetOrbit' : 'evt.offTargetOrbit', hit ? 'success' : 'warn', {
      ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000), inc: +(el.i * RAD).toFixed(2),
      raan: +(el.raan * RAD).toFixed(1), period: Math.round(el.period / 60),
      dv: Math.round(this.sim.vehicle.deltaVRemaining()),
      // `res.misses` is deliberately NOT put on the event. It used to be
      // joined into an English `miss` clause here — built inside
      // `orbitResiduals`, in physics — and no dictionary in en/ru/th declared
      // the placeholder, so it was dead payload that would have rendered as an
      // English fragment inside a Russian or Thai sentence the day one did
      // (review follow-up). Everything a presentation layer needs to say which
      // parameter missed is already here as numbers: `ap` / `pe` / `inc` /
      // `raan` against `sim.plan.target`, or `orbitResiduals` itself, which now
      // returns `OrbitMiss[]`.
    });
    const st = this.sim.vehicle.active;
    if (st) this.sim.vehicle.cutoffStage(st, s.t);
    if (!s.payloadSeparated) this.sim.schedule(s.t + 15, 'payloadSep', () => this.sim.staging.separatePayload(false));
  }

  /**
   * Steering and throttle during a burn. Null when the burn cannot go on (the
   * six-DOF transfer solution failed and the mission has been ended).
   */
  burnCommand(thrustFullVac: number, mass: number, maxAccel: number, up: Vec3): { dir: Vec3; throttle: number } | null {
    const s = this.sim.state;
    let dirCmd = s.dir;
    let throttleCmd = 0;
    const b = s.currentBurn!;
    const vDes = desiredVelocity(s.r, s.v, b.kind, b.targetApoapsis, b.targetPeriapsis, b.targetInclination, s.burnPlaneNormal ?? undefined);
    const dvVec = sub(vDes, s.v);
    const dvMag = norm(dvVec);
    s.burnDvRemaining = dvMag;
    if (b.kind === 'raiseApoapsis') {
      // apoapsis adjustment: thrust along (or against) the velocity vector.
      // Velocity-to-be-gained steering would fight the radial velocity away
      // from periapsis and waste propellant moving the periapsis instead.
      const need = norm(vDes) - norm(s.v);
      const sign = b.lowering ? -1 : 1;
      dirCmd = norm(s.v) > 1 ? scale(normalize(s.v), sign) : s.dir;
      s.burnDvRemaining = Math.abs(need);
      if (this.sim.rigidRuntime && b.physicalApoapsis !== undefined) {
        if (this.rigidTransfer && this.rigidTransfer.context !== this.rigidOrbitContext()) {
          this.rigidTransfer = null; this.burnIgnited = false;
        }
        s.burnDvRemaining = this.rigidTransfer
          ? Math.max(0, this.rigidTransfer.requiredDv - this.rigidTransfer.deliveredDv) : Math.max(0.05, b.dvEstimate);
      }
    } else {
      dirCmd = dvMag > 0.01 ? scale(dvVec, 1 / dvMag) : s.dir;
    }
    // Light the engine only once the stack is pointing where the burn wants
    // to push. The pre-orient above covers a burn that was scheduled minutes
    // ahead, but several paths arm one for `s.t + 1` — a re-planned trim, a
    // remainder finished on the same pass — and a 3°/s slew cannot turn a
    // prograde stack round for a retrograde trim in one second: the first
    // seconds of thrust went in at ninety degrees to the commanded direction,
    // moving the wrong element and ending the burn on the "passed the
    // minimum" test. Suborbital is the exception, where every second of
    // thrust is worth more than its direction. Once lit, the burn stays lit
    // even if the command swings as the remaining Δv goes to zero.
    let aligned = angleBetween(s.dir, dirCmd) < BURN_IGNITION_ALIGNMENT;
    if (this.sim.rigidRuntime?.command.mode === 'auto' && b.physicalApoapsis !== undefined
      && !this.rigidTransfer && aligned) {
      // Solve at the actual aligned ignition state, including any time spent
      // waiting for attitude. The solution only commands finite thrust.
      if (!this.prepareRigidTransfer(b)) return null;
      dirCmd = this.rigidTransfer!.direction;
      aligned = angleBetween(s.dir, dirCmd) < BURN_IGNITION_ALIGNMENT;
      if (!aligned) this.rigidTransfer = null;
    }
    if (!this.burnIgnited && !aligned && s.elements.periapsisAlt > 120e3) {
      throttleCmd = 0;
    } else {
      this.burnIgnited = true;
      throttleCmd = 1;
      if (thrustFullVac / mass > maxAccel && maxAccel > 0) throttleCmd = maxAccel / (thrustFullVac / mass);
    }
    s.ascentPhase = null;
    s.pitchCmd = Math.asin(Math.max(-1, Math.min(1, dot(dirCmd, up)))) * RAD;
    return { dir: dirCmd, throttle: throttleCmd };
  }

  /**
   * Attitude during a coast: prograde, or the next burn's attitude once it is
   * close. Null when the six-DOF forecast failed and the mission has been ended.
   */
  coastCommand(): Vec3 | null {
    const s = this.sim.state;
    let dirCmd = norm(s.v) > 1 ? normalize(s.v) : s.dir;
    const nb = s.currentBurn;
    if (nb && s.nextBurnTime > s.t && s.nextBurnTime - s.t < BURN_PREORIENT_TIME) {
      // Point at the attitude the burn needs AT ITS OWN IGNITION POINT, not at
      // the one it would need here (audit item B6, review follow-up).
      //
      // `desiredVelocity` for a shaping burn means "make the radius I am at
      // now the apoapsis", so evaluating it minutes short of the apoapsis
      // describes a different orbit and returns a nearly RADIAL correction.
      // Measured on vulcan/iss/50: 240 s out the pre-orient asked for 166 m/s
      // at 96° to the velocity vector, the stack dutifully turned there, and
      // at ignition the burn wanted 9 m/s at 178° — which a 3°/s slew cannot
      // cover in the 0.7 s such a trim lasts. The impulse went in almost
      // radially, moved the periapsis 6 km instead of 25, the "passed the
      // minimum" clause ended the burn, and the re-planner scheduled the same
      // trim one revolution later, five times over, until the flight ran out
      // of horizon. Propagating to the ignition point first is the whole fix:
      // attitude is an inertial quantity, so the direction computed there is
      // the one to hold now.
      const at = this.sim.rigidRuntime ? this.rigidForecastAt(nb, s.nextBurnTime)
        : propagateKepler(s.r, s.v, Math.max(0, s.nextBurnTime - s.t));
      if (!at) { this.failRigidOrbitPrediction(); return null; }
      const vAt = norm(at.v) > 1 ? normalize(at.v) : dirCmd;
      if (nb.kind === 'raiseApoapsis') {
        dirCmd = nb.lowering ? scale(vAt, -1) : vAt;
      } else {
        const vDesPre = desiredVelocity(at.r, at.v, nb.kind, nb.targetApoapsis, nb.targetPeriapsis, nb.targetInclination);
        const dvPre = sub(vDesPre, at.v);
        if (norm(dvPre) > 0.01) dirCmd = normalize(dvPre);
      }
    }
    return dirCmd;
  }

  /** Six-DOF transfer burns count the impulse actually delivered along the burn direction. */
  accountDeliveredDv(propulsionECI: Vec3, burning: boolean, dt: number): void {
    const s = this.sim.state;
    if (this.rigidTransfer && this.sim.rigidRuntime!.command.mode === 'auto' && this.burnIgnited && burning
      && this.rigidTransfer.burn === s.currentBurn) {
      this.rigidTransfer.deliveredDv += dot(propulsionECI, this.rigidTransfer.direction) * dt;
      s.burnDvRemaining = Math.max(0, this.rigidTransfer.requiredDv - this.rigidTransfer.deliveredDv);
    }
  }
}
