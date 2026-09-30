/**
 * Eagle's powered descent to Tranquility Base (roadmap C01, docs/PHYSICS.md
 * §13.12): the guidance and the throttle of the lunar module's descent engine
 * from the powered descent's ignition to the touchdown.
 *
 * The Apollo guidance computer flew the descent in three programs, each
 * steering the LM onto a target state at a target time — the braking phase
 * (P63) to "high gate", the approach phase (P64) to "low gate", the landing
 * phase (P66, flown by hand on Apollo 11) to the surface — and throttled the
 * engine to the thrust its steering asked for: at the fixed throttle position
 * while that was more than the engine could give below it, then, from the
 * "throttle recovery", in the throttle's range. So does this, with the
 * energy-optimal law that meets a position and a velocity at a time (the
 * acceleration 6 (r_T − r − v T)/T² − 2 (v_T − v)/T, less gravity), at the
 * flown times of high gate, low gate and the touchdown, and targets placed on
 * the landing site's own frame: high gate 7,129 ft up and 7.9 km short of the
 * site, low gate 400 ft up and 400 m short, then a hover 20 m over it and the
 * last metres straight down at 1 m/s, as the rate-of-descent mode flew them.
 * The target positions and speeds at the gates beyond the flown heights and
 * descent rate are the model's (§13.12).
 */
import { DPS } from '../../data/apollo11';
import { add, dot, norm, normalize, scale, sub, type Vec3 } from '../vec3';
import { MU_MOON } from '../lunar/ephemeris';

/** What the descent is doing: the three programs and the final vertical descent. */
export type DescentPhase = 'braking' | 'approach' | 'landing' | 'vertical';

/** A state the guidance aims the LM at, relative to the Moon's centre (ECI of date): position, velocity, and its time. */
export interface DescentAim { t: number; r: Vec3; v: Vec3 }

/** The landing site, relative to the Moon's centre, at a mission time: its position and velocity (ECI). */
export type SiteAt = (t: number) => { r: Vec3; v: Vec3 };

/** High gate: 7.9 km short of the site, 145 m/s over the ground (the model's), 7,129 ft up, 125 ft/s down (flown). */
const HIGH_GATE = { range: 7900, vh: 145 };
/** Low gate: 400 m short of the site, 12 m/s over the ground, 4 m/s down (the model's), 400 ft up (flown). */
const LOW_GATE = { range: 400, vh: 12, vz: -4 };
/** The hover over the site the last metres descend from, m and s before the touchdown. */
const HOVER = { alt: 20, before: 20, vz: -1 };
/** The rate-of-descent mode's rate, m/s (3 ft/s: the press kit's). */
const VERTICAL_RATE = -1;
/** The guidance's cycle, s: the throttle is set once a cycle. */
const CYCLE = 2;

export interface DescentCommand {
  /** thrust direction (ECI, unit) */
  dir: Vec3;
  /** thrust, N */
  thrust: number;
}

export class PoweredDescent {
  phase: DescentPhase = 'braking';
  /** before the throttle recovery, at the fixed throttle position */
  ftp = true;
  /** the mission time of the throttle recovery, once it has come */
  recovery?: number;
  private down: Vec3 | null = null;
  /** the thrust set at the last cycle, and when the next is due */
  private thrust = 0;
  private next = -Infinity;

  constructor(
    private readonly site: SiteAt,
    private readonly times: { ignition: number; ullage: number; highGate: number; lowGate: number; touchdown: number },
    private readonly gates: { highGateAlt: number; highGateVz: number; lowGateAlt: number },
  ) {}

  /** The downrange direction at the site: the LM's velocity over it, horizontal there, fixed at the first call. */
  private downrange(v: Vec3, up: Vec3): Vec3 {
    if (!this.down) this.down = normalize(sub(v, scale(up, dot(v, up))));
    return this.down;
  }

  /** Where the phase now aims, relative to the Moon's centre; `v` the LM's velocity, for the downrange direction. */
  aim(v: Vec3): DescentAim {
    const at = (tt: number, alt: number, range: number, vh: number, vz: number): DescentAim => {
      const s = this.site(tt), up = normalize(s.r), d = this.downrange(v, up);
      return { t: tt, r: add(add(s.r, scale(up, alt)), scale(d, -range)), v: add(add(s.v, scale(d, vh)), scale(up, vz)) };
    };
    switch (this.phase) {
      case 'braking': return at(this.times.highGate, this.gates.highGateAlt, HIGH_GATE.range, HIGH_GATE.vh, this.gates.highGateVz);
      case 'approach': return at(this.times.lowGate, this.gates.lowGateAlt, LOW_GATE.range, LOW_GATE.vh, LOW_GATE.vz);
      default: return at(this.times.touchdown - HOVER.before, HOVER.alt, 0, 0, HOVER.vz);
    }
  }

  /**
   * The engine's command now, for the LM at `r`, `v` (relative to the Moon's
   * centre) of mass `m`: the phase moved on at its gate's time.
   */
  command(t: number, r: Vec3, v: Vec3, m: number): DescentCommand {
    if (this.phase === 'braking' && t >= this.times.highGate) this.phase = 'approach';
    if (this.phase === 'approach' && t >= this.times.lowGate) this.phase = 'landing';
    if (this.phase === 'landing' && t >= this.times.touchdown - HOVER.before) this.phase = 'vertical';
    const g = scale(r, -MU_MOON / Math.pow(dot(r, r), 1.5));
    let a: Vec3;
    if (this.phase === 'vertical') {
      // straight down at the rate, the speed over the ground and the drift from the site taken out
      const s = this.site(t), up = normalize(s.r), rel = sub(r, s.r), vRel = sub(v, s.v);
      const vz = dot(vRel, up), hv = sub(vRel, scale(up, vz)), hx = sub(rel, scale(up, dot(rel, up)));
      a = add(add(scale(up, (VERTICAL_RATE - vz) / 1.5), scale(hv, -1 / 2)), scale(hx, -1 / 25));
    } else {
      // (the last seconds to a gate aimed at as if eight were left: the law's gains grow without bound as the
      // time does to nothing)
      const aim = this.aim(v), T = Math.max(8, aim.t - t);
      a = add(scale(sub(sub(aim.r, r), scale(v, T)), 6 / (T * T)), scale(sub(aim.v, v), -2 / T));
      if (this.phase === 'landing') {
        // P66, the rate-of-descent mode: over the ground as the law has it, down at the steady rate that brings
        // it to the hover when the hover is due — never up
        const up = normalize(r), vz = dot(sub(v, this.site(t).v), up), h = dot(sub(r, aim.r), up);
        const rate = Math.min(-0.15, Math.max(-3, -h / T));
        a = add(sub(a, scale(up, dot(a, up))), scale(up, (rate - vz) / 3));
      }
    }
    const want = sub(a, g);
    const need = norm(want) * m;
    const dir = need > 1e-6 ? scale(want, 1 / norm(want)) : normalize(scale(r, 1));
    // the first 26 s at the minimum throttle, the propellant settled and the engine's gimbal trimmed
    if (t - this.times.ignition < this.times.ullage) return { dir, thrust: DPS.min };
    if (t >= this.next) {
      this.next = t + CYCLE;
      if (this.ftp && need < DPS.recovery) { this.ftp = false; this.recovery = t; }
      // at the fixed throttle position until the throttle recovery, and back at it whenever the thrust asked for
      // is past the throttle's range — the engine is never run between the two
      this.thrust = this.ftp || need > DPS.max ? DPS.ftp : Math.max(DPS.min, need);
    }
    return { dir, thrust: this.thrust };
  }
}
