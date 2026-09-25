/**
 * Deterministic failure injection (engine-out, thrust loss, premature
 * separation, stuck fairing, range safety), the three historical failures of a
 * crewed R-7 (a pad fire, a strap-on striking the core, a stage separation
 * that half-fails) and a commanded launch abort (roadmap G06).
 */
import type { MissionConfig, FailureMode } from '../../types';
import type { Simulation } from '../simulation';
import { hashSeed, mulberry32 } from './seed';

/** From a strap-on striking the core to the vehicle out of control, s (Soyuz MS-10: T+118.6 s to the abort at T+121.6 s). */
export const COLLISION_TO_LOSS = 3;
/** From a stage separation that half-fails to the attitude limit, s (Soyuz 18a: T+288.6 s, the abort some 6 s later; estimate). */
export const STAGING_TO_LOSS = 6;

export class FailureInjector {
  failureApplied = false;
  failureMode: FailureMode;
  failureTime: number;
  failureStage: number;
  fairingStuck = false;

  constructor(readonly sim: Simulation, cfg: MissionConfig) {
    this.failureMode = cfg.failure.mode;
    this.failureTime = cfg.failure.time;
    this.failureStage = cfg.failure.stage;
    if (this.failureMode === 'random') {
      // Deterministic: the seed is the launch epoch, so replaying a recorded
      // flight injects exactly the same failure at exactly the same time.
      const rnd = mulberry32(hashSeed(cfg.launchTime.getTime(), cfg.vehicleId));
      const modes: FailureMode[] = ['engineOut', 'thrustLoss', 'prematureSep', 'fairingStuck'];
      this.failureMode = modes[Math.min(modes.length - 1, Math.floor(rnd() * modes.length))];
      this.failureTime = 10 + rnd() * 140;
      this.failureStage = 0;
    }
    if (this.failureMode === 'fairingStuck') this.fairingStuck = true;
  }

  /** Queue the injected failure (after the launch actions, as before). */
  arm(): void {
    const mode = this.failureMode;
    // the historical failures of a strap-on and of a stage are set off by their separations
    if (mode === 'none' || mode === 'fairingStuck' || mode === 'boosterCollision' || mode === 'stagingFailure') return;
    this.sim.schedule(this.failureTime, 'failure', () => this.applyFailure());
  }

  /** The strap-ons have separated: one of them strikes the core, which soon goes out of control. */
  onBoosterSeparation(): void {
    if (this.failureMode !== 'boosterCollision' || this.failureApplied) return;
    this.failureApplied = true;
    this.sim.event('evt.boosterCollision', 'fail');
    this.sim.schedule(this.sim.state.t + COLLISION_TO_LOSS, 'failure', () => {
      this.sim.event('evt.attitudeLost', 'fail');
      this.sim.destroy();
    });
  }

  /** Stage `index` has separated: the chosen one only half-lets go, and the next stage lights still attached. */
  onStageSeparation(index: number): void {
    if (this.failureMode !== 'stagingFailure' || this.failureApplied || index !== this.failureStage) return;
    this.failureApplied = true;
    this.sim.event('evt.stagingFailure', 'fail', { stage: this.sim.vehicle.stages[index]?.spec.name ?? '' });
    this.sim.schedule(this.sim.state.t + STAGING_TO_LOSS, 'failure', () => {
      this.sim.event('evt.attitudeLost', 'fail');
      this.sim.destroy();
    });
  }


  // ------------------------------------------------------------ failures
  applyFailure(): void {
    if (this.failureApplied) return;
    this.failureApplied = true;
    const s = this.sim.state;
    const st = this.sim.vehicle.stages[Math.min(this.failureStage, this.sim.vehicle.stages.length - 1)] ?? this.sim.vehicle.active;
    const target = st && st.attached && st.index >= this.sim.vehicle.activeIndex ? st : this.sim.vehicle.active;
    if (!target) return;
    switch (this.failureMode) {
      case 'engineOut': {
        const n = target.spec.engine.count;
        target.engineFraction = Math.max(0, (n - 1) / n);
        this.sim.event('evt.engineOut', 'warn', { stage: target.spec.name, n: n - 1, total: n });
        break;
      }
      case 'thrustLoss':
        target.engineFraction = 0;
        this.sim.event('evt.thrustLoss', 'fail', { stage: target.spec.name });
        // a crew does not wait for the rocket to fall back
        if (this.sim.escape.available) this.sim.escape.begin('evt.thrustLoss', true);
        break;
      case 'prematureSep': {
        // A stage that has not lit yet cannot separate prematurely — it is
        // still bolted to the stack. Asking for one at T+60 on stage 3 used to
        // announce the failure and then do nothing at all, because the guard
        // below only fired for the active stage: the flight carried on
        // nominally after a "PREMATURE SEPARATION" callout. The break-up
        // happens where the thrust is, so the stage that is burning is the one
        // that comes apart.
        const victim = target.index === this.sim.vehicle.activeIndex ? target : this.sim.vehicle.active;
        if (!victim) break;
        this.sim.event('evt.prematureSep', 'fail', { stage: victim.spec.name });
        victim.burnedOut = true;
        victim.cutoffTime = s.t;
        if (this.sim.escape.available) { this.sim.escape.begin('evt.prematureSep', true); break; }
        for (const b of victim.boosters) if (b.attached) { b.burnedOut = true; this.sim.staging.detachBooster(b); }
        this.sim.staging.onCoreBurnout(victim, s.r, s.v);
        break;
      }
      case 'launchAbort':
        if (!this.sim.commandAbort()) this.sim.event('evt.abortUnavailable', 'warn');
        break;
      case 'padFire':
        this.sim.event('evt.padFire', 'fail');
        this.sim.destroy();
        break;
      case 'rangeSafety':
        this.sim.event('evt.ftsCommanded', 'fail');
        this.sim.destroy();
        break;
      default:
        break;
    }
  }
}
