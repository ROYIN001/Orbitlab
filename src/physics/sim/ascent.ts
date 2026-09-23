/**
 * Powered ascent: when to cut the ascent stage off and hand over to the
 * orbital sequence, max-Q and the structural placard, and the insertion floor.
 */
import { MU_EARTH, R_EARTH, RAD } from '../constants';
import { norm } from '../vec3';
import type { OrbitalElements } from '../orbital';
import { orbitResiduals, apsisTolerance, ORBIT_INSERTION_FLOOR } from '../mission';
import type { Simulation } from '../simulation';
import { ASCENT_MIN_PERIAPSIS, FAIRING_Q_LIMIT, SINGLE_SHOT_CUTOFF_BAND } from './constants';

export class AscentMonitor {
  /** the vehicle's quoted structural max-Q, Pa */
  readonly maxQAscent: number;
  /** perigee speed of the insertion orbit, m/s (fixed by the plan) */
  readonly insertionSpeed: number;
  constructor(readonly sim: Simulation) {
    this.maxQAscent = sim.vehicleSpec.maxQ;
    const rIns = R_EARTH + sim.plan.insertionAltitude;
    this.insertionSpeed = Math.sqrt(MU_EARTH * (2 / rIns - 2 / (2 * R_EARTH + sim.plan.insertionAltitude + sim.plan.insertionApoapsis)));
  }

  bestAscentResidual = Infinity;
  maxQReported = false;
  structuralFailed = false;
  /** ascent max-Q peak is final (the vehicle is falling back through the air) */
  maxQLatched = false;
  sinkingSince = -1;

  /**
   * Whether the vehicle could still light an engine after shutting the current
   * one down: the active stage restarts, or a later stage (launcher or
   * spacecraft) still has propellant. Cutting off a stage that cannot be
   * relit — Soyuz-2.1a's Blok I, a solid upper stage — ends the mission, so a
   * guard that trades a cut-off for a coast must not fire for those vehicles.
   * What such a stack needs instead is `singleShotCutoff`.
   */
  canReigniteAfterCutoff(): boolean {
    const act = this.sim.vehicle.active;
    if (!act) return false;
    if (act.spec.restartable && this.sim.vehicle.usablePropellant(act) > 0) return true;
    for (let i = act.index + 1; i < this.sim.vehicle.stages.length; i++) {
      const st = this.sim.vehicle.stages[i];
      if (st.attached && this.sim.vehicle.usablePropellant(st) > 0) return true;
    }
    return false;
  }

  /**
   * Cut-off test for a stack that cannot light anything again — Soyuz-2.1a's
   * Blok I, Long March 2D's second stage, a solid upper stage (audit wave-1
   * hand-off (a)).
   *
   * Everything else in `checkAscent` assumes a later burn exists: the apoapsis
   * guard and the "stalled" clause both trade a cut-off for a coast and are
   * gated on `canReigniteAfterCutoff`, and the periapsis gate waits for an
   * orbit that a stack like this may never reach. A single-burn insertion is a
   * different problem with a different answer, and it has only two moments
   * worth stopping at:
   *
   *  1. **The orbit is already the mission's** — and comfortably so, not
   *     barely. There is nothing left to gain, and every further second of
   *     thrust takes it back off target. This is the whole of single-shot
   *     direct insertion: Soyuz-2.1a with an inert payload aimed at a 200 km
   *     circular orbit now cuts off at 197.2 × 200.4 km (1.755 t) with 2.7 km/s
   *     still in the tanks, where it used to burn on to 197 × 695 km and be
   *     reported off target. The full grid is measured in exactly one place —
   *     the `single-shot direct insertion` section of
   *     tests/fleet-defaults.test.ts.
   *
   *     The band this clause asks about is `SINGLE_SHOT_CUTOFF_BAND` of the
   *     acceptance band, and the fraction is the point. Asking at the full band
   *     stops the burn the first instant the orbit is legal: the perigee is
   *     still climbing at cut-off, so it stops at the low EDGE and the mission
   *     is declared on target with a few hundred metres to spare (measured
   *     190.4 × 200.1 km against a 10 km band — 395 m of margin, which any
   *     change to the atmosphere or the loss bookkeeping would flip to a miss).
   *     Cutting off at a quarter of the band leaves the mission near the middle
   *     of it, and clause 2 still catches the stack that cannot get there.
   *  2. **The orbit has stopped getting better.** The apsis residual against
   *     the plan falls while the stage is closing the gap and rises once it is
   *     only adding energy to an orbit that is already too big. Cutting off at
   *     that minimum is the best a single burn can do, and it is the difference
   *     between Long March 2D's 197 × 695 km and the 197 × 5 147 km it reaches
   *     by simply burning to depletion. The orbit still has to be one worth
   *     being in — above the 140 km floor, out of the atmosphere — or an early
   *     wobble in the residual would cut a healthy ascent off at 120 km.
   */
  singleShotCutoff(el: OrbitalElements, alt: number): boolean {
    if (el.e >= 1 || this.canReigniteAfterCutoff()) return false;
    if (!this.sim.state.liftoff || alt < 100e3) return false;
    if (orbitResiduals(this.sim.plan.target, el, this.sim.raanWasReachable(), SINGLE_SHOT_CUTOFF_BAND).onTarget) return true;
    if (el.periapsisAlt < Math.min(this.sim.plan.insertionAltitude, ASCENT_MIN_PERIAPSIS)) return false;
    const residual = Math.abs(el.apoapsisAlt - this.sim.plan.insertionApoapsis)
      + Math.abs(el.periapsisAlt - this.sim.plan.insertionAltitude);
    if (residual < this.bestAscentResidual) {
      this.bestAscentResidual = residual;
      return false;
    }
    // Ignore the numerical noise of a residual sitting at its minimum; only a
    // clear, sustained rise means the burn has started undoing its own work.
    return residual > this.bestAscentResidual + apsisTolerance(this.sim.plan.insertionApoapsis);
  }

  // ------------------------------------------------------------ ascent
  checkAscent(el: OrbitalElements, alt: number, vz: number): void {
    const s = this.sim.state;
    const hIns = this.sim.plan.insertionAltitude;
    const haIns = this.sim.plan.insertionApoapsis;
    const tol = 3e3;
    if (this.singleShotCutoff(el, alt)) {
      this.sim.staging.cutoffAscentStage(this.sim.vehicle.active);
      this.finishAscent(el);
      return;
    }
    // Cut-off. When the insertion orbit is an ellipse (a transfer whose apogee
    // is the target), what has to be right at cut-off is the *apoapsis*: the
    // following burn at apogee sets the periapsis anyway. Waiting for the
    // periapsis to climb all the way to the insertion altitude lets the
    // apoapsis run 15–20 km past the target, which is outside the accuracy the
    // mission is judged on. A periapsis high enough to coast one revolution
    // without decaying is enough — but only in that case. A *circular*
    // insertion orbit has no later burn to fix its perigee with: cutting a
    // 200 km parking orbit off at a 140 km perigee is not a parking orbit, it
    // is a decaying ellipse, so there the gate is the insertion altitude
    // itself.
    const elliptical = haIns > hIns + 1e3;
    const peSafe = Math.min(hIns, ASCENT_MIN_PERIAPSIS);
    const peGate = elliptical ? peSafe : hIns;
    const margin = Math.max(25e3, 0.05 * haIns);
    // Degradation clause for a circular insertion plan. Thrust applied at the
    // periapsis raises the apoapsis, not the periapsis: a stage that has ended
    // up *at* its own periapsis (or whose apoapsis has already run past what
    // the plan asked for) cannot close the remaining perigee gap by burning
    // on, and every second it keeps thrusting makes the orbit more eccentric,
    // not less. Cut off there instead, provided the orbit is already safe to
    // coast and a later burn can raise the perigee at apogee — which is where
    // it is cheapest anyway. `finishAscent` re-plans from the orbit actually
    // achieved, so the following burns aim at the real shortfall.
    // "At the periapsis" is tested against the *apoapsis* as well: on a nearly
    // circular orbit the vehicle is a few kilometres from both apsides at once,
    // and a healthy insertion spends its last seconds exactly there, flying
    // level at the apoapsis while the periapsis climbs to meet it. Only a
    // vehicle sinking at the low point of an orbit whose apoapsis is far above
    // it has nothing left to gain.
    const atPeriapsis = vz <= 0 && alt - el.periapsisAlt < 15e3 && el.apoapsisAlt - alt > 50e3;
    const stalled = el.periapsisAlt >= peSafe - tol
      && (atPeriapsis || el.apoapsisAlt > haIns + margin)
      && this.canReigniteAfterCutoff();
    if (el.e < 1 && (el.periapsisAlt >= peGate - tol || stalled) && el.apoapsisAlt >= haIns - tol) {
      const act = this.sim.vehicle.active;
      this.sim.staging.cutoffAscentStage(act);
      this.finishAscent(el);
      return;
    }
    // Apoapsis guard. The periapsis-based cut-off above never fires on a lofted
    // trajectory: the apoapsis runs away while the periapsis is still deep
    // inside the Earth, and the stage burns to depletion in a 200 × 20 000 km
    // "parking orbit". When the osculating apoapsis overshoots the insertion
    // apoapsis by more than the margin, cut off and hand the rest to the
    // coast-to-apoapsis + circularise machinery.
    // Margin: a healthy ascent to a circular insertion orbit reaches the target
    // apoapsis a little before the periapsis catches up, so the guard must sit
    // well above the natural overshoot and only catch a genuine runaway.
    // The signature of a runaway is a vehicle that is *still climbing*, already
    // above the insertion altitude, with an apoapsis well past the target and a
    // periapsis that is not following. A healthy ascent into a transfer ellipse
    // also has a high apoapsis and a low periapsis, but it is flying level by
    // then, so the vertical-speed test is what separates the two.
    if (
      el.e < 1 && alt > 110e3 && !this.sim.staging.circularizeInserted
      && el.apoapsisAlt > haIns + margin && el.periapsisAlt < peSafe - tol
      && alt > hIns - 30e3 && vz > 120
      && this.sim.vehicle.activeHasPropellant() && s.thrust > 0 && this.canReigniteAfterCutoff()
      // Only worth it while there is still propellant to save: a stage seconds
      // from depletion should simply finish the job.
      && this.sim.vehicle.stageBurnTimeLeft() > 20
      // ...and only when the stack could actually finish at the apoapsis. A
      // weak hydrogen stage under a heavy payload (Centaur V or Vinci at
      // 0.25–0.3 g) climbs on purpose: its lofted arc is how it keeps altitude
      // while it builds three kilometres per second of horizontal speed, and
      // the apoapsis running past the target on the way up is not a runaway.
      // Cut off there, it was handed a circularisation it could not fly — the
      // same shortfall test `onCoreBurnout` applies before it trades a burn for
      // a coast — and sank from 450 km back into the air.
      && this.circularizeShortfall(el, Math.max(hIns, haIns)) < (s.thrust / s.mass < 0.9 * this.effectiveGravity() ? 700 : 400)
    ) {
      const act = this.sim.vehicle.active;
      this.sim.staging.cutoffAscentStage(act);
      this.sim.staging.circularizeInserted = true;
      this.sim.plan.burns.unshift({
        id: 'circ', kind: 'circularize', atU: 0,
        targetPeriapsis: Math.min(el.apoapsisAlt, Math.max(hIns, haIns)), dvEstimate: 0, done: false,
      });
      this.sim.event('evt.coastToApoapsis', 'info', { ap: Math.round(el.apoapsisAlt / 1000) });
      s.status = 'coast';
      s.note = 'coast';
      this.sim.burns.scheduleNextBurn(el);
      return;
    }
    // range safety / loss of vehicle: falling back without thrust below 100 km
    const thrusting = s.thrust > 0;
    if (!thrusting && !this.sim.staging.stagingInProgress && this.sim.pending.every((p) => p.label !== 'ignition' && p.label !== 'stageSep') && vz < -50 && alt < 100e3 && s.t > 5) {
      if (!this.sim.vehicle.activeHasPropellant() || (this.sim.vehicle.active?.engineFraction ?? 1) === 0) {
        this.sim.event('evt.rangeSafety', 'fail', { alt: Math.round(alt / 1000) });
        this.sim.destroy();
      }
    }
  }

  /**
   * Speed the stack would still have to gain at its apoapsis to raise the
   * periapsis to `targetPeriapsis` there, m/s.
   */
  private circularizeShortfall(el: OrbitalElements, targetPeriapsis: number): number {
    const ra = R_EARTH + el.apoapsisAlt;
    const rp = Math.min(ra, R_EARTH + targetPeriapsis);
    const vWanted = Math.sqrt(MU_EARTH * (2 / ra - 2 / (ra + rp)));
    return vWanted - el.h / ra;
  }

  /** Gravity less the centrifugal term of the horizontal speed, m/s². */
  private effectiveGravity(): number {
    const s = this.sim.state;
    const rm = norm(s.r);
    const vh2 = Math.max(0, s.speed * s.speed - s.vz * s.vz);
    return MU_EARTH / (rm * rm) - vh2 / rm;
  }

  finishAscent(el: OrbitalElements): void {
    const s = this.sim.state;
    // Nothing under the insertion floor is a parking orbit (the same rule the
    // circularise branch of `checkBurn` states), less the 3 km the cut-off
    // gate in `checkAscent` allows under it. A last stage that burns out with
    // its periapsis inside the air has already said `evt.lowPerigee`; calling
    // that a parking orbit too is how a decaying 107 km arc came to be
    // announced as an insertion.
    if (el.periapsisAlt >= ORBIT_INSERTION_FLOOR - 3e3) {
      this.sim.event('evt.parkingOrbit', 'success', {
        ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000), inc: +(el.i * RAD).toFixed(2),
        dv: Math.round(this.sim.vehicle.deltaVRemaining()),
      });
    }
    // The mission may already be over. A direct insertion that meets the
    // acceptance band at cut-off has nothing left to do, and the plan it was
    // given before liftoff must not be flown anyway: Falcon 9 to the ISS inserts
    // at 419 × 419 km at T+526 s and then spent most of a revolution flying a
    // sub-tolerance circularisation trim, so `evt.targetOrbit` — the moment the
    // user is waiting for, and the moment the payload is deployed — landed at
    // T+53 min instead of T+9 min (audit item B6).
    if (orbitResiduals(this.sim.plan.target, el, this.sim.raanWasReachable()).onTarget) {
      for (const b of this.sim.plan.burns) b.done = true;
      this.sim.burns.reachTargetOrbit(el);
      return;
    }
    this.sim.burns.replanRemainingBurns(el);
    if (this.sim.plan.burns.some((b) => !b.done)) {
      s.status = 'coast';
      s.note = 'coast';
      this.sim.burns.scheduleNextBurn(el);
    } else {
      this.sim.burns.reachTargetOrbit(el);
    }
  }

  /**
   * The insertion floor: the post-ascent sequence may not fly a stack that is
   * still meant to reach orbit back into the atmosphere.
   *
   * `ORBIT_INSERTION_FLOOR` is the perigee below which the sequencer does not
   * consider the vehicle to be in an orbit at all. Everything in `checkCoast` /
   * `checkBurn` above it assumes there is an orbit to shape: the burn-pause
   * clauses are gated on a periapsis above 120 km, `desiredVelocity` for a
   * shaping burn aims at "make the radius I am at now an apsis", and neither
   * has a stopping condition for a trajectory whose perigee is a thousand
   * kilometres inside the Earth. So a kick stage handed one simply thrusts
   * until something else ends the flight, and what ended it was the structural
   * placard — Proton-M/Briz-M with the 7.15 t crew ship burned for 666 s from
   * 199 km down to 45 km and broke up at 46 kPa, 668 s after its own SECO.
   *
   * The rule is therefore: while the payload is still aboard and the mission is
   * still trying to reach orbit, a perigee below the floor is only survivable
   * as long as the stack is not in air. The line is `FAIRING_Q_LIMIT` — the
   * model's own "this is meaningful air" placard, 1.1 kPa, the pressure below
   * which a fairing may be released — and it is forty times below the softest
   * structural placard in the fleet, so a healthy flight can never reach it:
   * measured, every insertion in the fleet that works stays under 0.05 kPa, and
   * the one that does not passes 1.1 kPa 86 s before it is destroyed.
   *
   * Reaching it means the insertion has failed. The stack is shut down and the
   * mission ends saying so, which is the honest outcome — a suborbital
   * trajectory — rather than a break-up several minutes after a reported
   * insertion. Nothing is rescued by continuing: the same flight with the
   * engines left running is the one that broke up.
   */
  abandonInsertion(q: number, vz: number): boolean {
    const s = this.sim.state;
    if (s.payloadSeparated || !s.liftoff) return false;
    if (s.status !== 'burn' && s.status !== 'coast') return false;
    const el = s.elements;
    if (!(el.e < 1) || el.periapsisAlt >= ORBIT_INSERTION_FLOOR) return false;
    if (!(q >= FAIRING_Q_LIMIT && vz < 0)) return false;
    const st = this.sim.vehicle.active;
    if (st) this.sim.vehicle.cutoffStage(st, s.t);
    s.currentBurn = null;
    s.nextBurnTime = -1;
    s.thrust = 0;
    s.throttle = 0;
    for (const b of this.sim.plan.burns) b.done = true;
    this.sim.event('evt.insertionAbandoned', 'fail', {
      alt: Math.round(s.altitude / 1000),
      pe: Math.round(el.periapsisAlt / 1000),
      dv: Math.round(this.sim.vehicle.deltaVRemaining()),
    });
    this.sim.failSuborbital();
    return true;
  }

  /**
   * Track the ascent's peak dynamic pressure.
   */
  trackMaxQ(alt: number, vz: number, q: number): void {
    const s = this.sim.state;
    // Max Q is the peak of the ASCENT. A trajectory that lofts and falls back is
    // still `ascent`, and its re-entry dynamic pressure would otherwise replace
    // the real peak in the field the HUD, the telemetry and every captured frame
    // read (audit item B4). Once the vehicle has been sinking through the
    // atmosphere for a few seconds the ascent is over, whatever the status says.
    if (alt < 100e3 && vz < -20) {
      if (this.sinkingSince < 0) this.sinkingSince = s.t;
      if (s.t - this.sinkingSince > 3) this.maxQLatched = true;
    } else {
      this.sinkingSince = -1;
    }
    if (s.status === 'ascent' && !this.maxQLatched && alt < 100e3 && q > s.maxQ.value) s.maxQ = { value: q, t: s.t, alt };
  }

  /** Log the max-Q event once the peak has clearly passed. */
  reportMaxQ(q: number): void {
    const s = this.sim.state;
    // --- max-Q event (detect peak). Informational only: it fires at the first
    // local maximum of the dynamic pressure, which on a vehicle that flies a
    // throttle bucket is a plateau rather than a single spike.
    if (s.status === 'ascent' && s.maxQ.value > 0 && q < s.maxQ.value * 0.97 && !this.maxQReported && s.t > 5) {
      this.maxQReported = true;
      // Stamped with the time of the PEAK, not the time it was detected: the
      // detection lags by the width of the plateau, which on Falcon 9 is 19 s.
      this.sim.event('evt.maxQ', 'info',
        { q: Math.round(s.maxQ.value / 100) / 10, alt: Math.round(s.maxQ.alt / 100) / 10 }, s.maxQ.t);
    }
  }

  /** True when the structural placard has just destroyed the vehicle. */
  checkStructural(q: number): boolean {
    const s = this.sim.state;
    // --- structural placard. Armed continuously from liftoff until the payload
    // separates, and tested on *every* step of powered or coasting flight
    // against the vehicle's quoted max-Q limit (audit item B4). Testing it only
    // at the detected max-Q peak let a trajectory that dives back into the
    // atmosphere fly at tens of times its limit and simply hit the ground
    // instead of breaking up; restricting it to `ascent` let the same thing
    // happen to a stack that had already been handed to the coast/burn logic.
    // It is deliberately NOT tested in `stepOrbit`, where `orbitArea()` models a
    // small satellite and a stacked launcher's placard is meaningless.
    if (s.liftoff && !s.payloadSeparated && !this.structuralFailed && q > this.maxQAscent * 1.15) {
      this.structuralFailed = true;
      this.sim.event('evt.structuralFailure', 'fail', { q: Math.round(q / 1000) });
      this.sim.destroy();
      return true;
    }
    return false;
  }
}
