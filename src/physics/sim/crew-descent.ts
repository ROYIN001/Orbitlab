/**
 * Gagarin on his own, from his ejection at 7 km to the ground (C01:
 * Vostok-1; docs/PHYSICS.md §13.6): a point mass with the drag of whatever
 * he hangs from, its heights read on the WGS-84 ellipsoid as the sphere's
 * are. Under a canopy the drag is nearly all there is, so his attitude is
 * the air's direction, and nothing more than a point is needed.
 *
 * The sequence (Feoktistov (ed.), *Космические аппараты*, 1983, §9.6; GCTC;
 * Svergun and Baturin, 2021; RussianSpaceWeb): out of the hatch on the seat
 * at up to 20 m/s; the 2 m² stabilising chute 0.4–0.5 s later; on it, still
 * in the seat, down to 4 km, where the 83.5 m² main opened and he left the
 * seat, which fell on its own; the 56 m² reserve, on the seat back that went
 * with him, came out as well at about 3 km, hung, then filled, and he came
 * down under two canopies at about 5 m/s; the survival kit (NAZ), meant to
 * hang below him on a 15 m lanyard, was lost on the way.
 *
 * The seat system's 336 kg is sourced (astronautix: 7.1 % of the ship); how
 * it divides is not, except the SK-1 suit's 20 kg (Memorial Museum of
 * Cosmonautics) and Gagarin's own weight, about 70 kg (popular sources; low
 * confidence). The rest, the drag coefficients, the canopies' filling, the
 * reserve's part-filling and when the kit went are estimates.
 */
import { atmosphere } from '../atmosphere';
import { G0, OMEGA_EARTH } from '../constants';
import { geodeticHeight } from '../geodesy';
import { canopy } from '../rigid/escape';
import { quatFromAxisAngle, quatRotate } from '../rigid/math';
import { cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import type { CrewState, Debris } from './types';
import type { DebrisEnvironment, DebrisFlight, DebrisFlightEvent, DebrisFlightResult } from './debris';
import { FallingBody, airVelocity, comeDown, fallStepToGround } from './fall';

/** A canopy: its area, m², drag coefficient, and its fill constant (fill time = `fill` × diameter / speed at opening). */
export interface CanopySpec { area: number; cd: number; fill: number }

export interface CrewSpec {
  /** the seat system as it leaves the sphere, kg */
  mass: number;
  /** what goes on with him when he leaves the seat, kg: himself, his suit, his two parachutes, the seat back they are packed on, the survival kit */
  pilot: number;
  suit: number;
  parachutes: number;
  seatBack: number;
  naz: number;
  /** drag area of the seat with him in it, m² */
  seatCda: number;
  /** of the empty seat as it falls on its own, m² */
  emptySeatCda: number;
  /** of him hanging under his canopies, m² */
  bodyCda: number;
  /** the stabilising chute, `delay` s after the ejection */
  stabiliser: CanopySpec & { delay: number };
  /** the main, and his leaving the seat, at `altitude` m by the barometric sensor */
  main: CanopySpec & { altitude: number };
  /** the reserve, out at `altitude` m, filling to `filled` of its drag area */
  reserve: CanopySpec & { altitude: number; filled: number };
  /** seconds after he left the seat that the survival kit was gone; absent, he kept it */
  nazLost?: number;
}

/**
 * Gagarin's seat system on Vostok-1. Sourced: the 336 kg, the 20 kg suit, the
 * 2 m², 83.5 m² and 56 m² canopies, the stabiliser's 0.4–0.5 s and the
 * main's 4 km, the reserve at about 3 km; Gagarin's 70 kg with low
 * confidence; the kit 43 kg (Baturin; 30 kg in another account). Estimates:
 * the two parachutes' 20 kg and the seat back's 10 kg, the seat's 173 kg
 * that is left, the drag areas of the seat and of a man under a canopy, the
 * canopies' drag coefficients (0.6 for the small stabiliser, 0.75 for a flat
 * circular canopy) and fill constant (8, Knacke, *Parachute Recovery Systems
 * Design Manual*, 1992, for solid canopies), the reserve's 60 % (it hung,
 * then filled, beside the main), and the kit gone 10 s after he left the
 * seat, when it should have dropped to the end of its lanyard.
 */
export const VOSTOK_CREW: CrewSpec = {
  mass: 336, pilot: 70, suit: 20, parachutes: 20, seatBack: 10, naz: 43,
  seatCda: 0.6, emptySeatCda: 0.5, bodyCda: 0.5,
  stabiliser: { area: 2, cd: 0.6, fill: 8, delay: 0.45 },
  main: { area: 83.5, cd: 0.75, fill: 8, altitude: 4000 },
  reserve: { area: 56, cd: 0.75, fill: 8, altitude: 3000, filled: 0.6 },
  nazLost: 10,
};

/** The fill time of a canopy opened at `speed` m/s, s: its fill constant times its nominal diameter over the speed. */
export function fillTime(c: CanopySpec, speed: number): number {
  return c.fill * Math.sqrt(4 * c.area / Math.PI) / Math.max(5, speed);
}

const EARTH_RATE = v3(0, 0, OMEGA_EARTH);

/**
 * The pilot's own flight (`DebrisFlight`): the seat on its stabilising
 * chute, the main and the seat let go, the reserve, the ground. The landing
 * reports how far he came down from the sphere, which is wherever
 * `sphere()` says it is at the end of the step.
 */
export class CrewDescent implements DebrisFlight {
  private readonly crew: CrewState = { phase: 'seat', stabiliser: 0, main: 0, reserve: 0, seat: true, naz: true };
  private stabiliserAt: number;
  private stabiliserFill = 0.1;
  private seatLeftAt?: number;
  private mainFill = 1;
  private reserveAt?: number;
  private reserveFill = 1;
  private mainLogged = false;
  private mass: number;
  /** peak specific force since the main came out, g */
  private openingG = 0;

  /**
   * @param t the ejection's mission time
   * @param sphere where the sphere is now, ECI
   */
  constructor(private t: number, readonly spec: CrewSpec, private readonly sphere: () => Vec3 | null) {
    this.stabiliserAt = t + spec.stabiliser.delay;
    this.mass = spec.mass;
  }

  /** The debris record he flies as, from his state leaving the hatch. */
  debris(id: number, r: Vec3, v: Vec3): Debris {
    return {
      id, name: 'pilot', r: { ...r }, v: { ...v }, dir: scale(r, 1 / norm(r)), mass: this.mass, area: this.spec.seatCda, cd: 1,
      visual: { diameter: 0.6, length: 1.8, color: '#e8641e', kind: 'pilot' }, alive: true, createdAt: this.t, crew: { ...this.crew },
    };
  }

  /** His drag area at `t`, m². */
  private cda(t: number): number {
    const sp = this.spec;
    if (this.seatLeftAt === undefined) {
      return sp.seatCda + canopy(sp.stabiliser.area, sp.stabiliser.cd, this.stabiliserAt, this.stabiliserFill, t, 0, 0);
    }
    const main = canopy(sp.main.area, sp.main.cd, this.seatLeftAt, this.mainFill, t, 0, 0);
    const reserve = sp.reserve.filled * canopy(sp.reserve.area, sp.reserve.cd, this.reserveAt, this.reserveFill, t, 0, 0);
    return sp.bodyCda + main + reserve;
  }

  /** A canopy filling now: step finely through it. */
  private inflating(t: number): boolean {
    const within = (at: number | undefined, fill: number) => at !== undefined && t >= at - 0.02 && t <= at + fill + 0.5;
    return within(this.stabiliserAt, this.stabiliserFill) || within(this.seatLeftAt, this.mainFill) || within(this.reserveAt, this.reserveFill);
  }

  step(d: Debris, to: number, env: DebrisEnvironment): DebrisFlightResult {
    const sp = this.spec, events: DebrisFlightEvent[] = [], spawn: NonNullable<DebrisFlightResult['spawn']> = [];
    while (this.t < to - 1e-9 && d.alive) {
      const alt0 = geodeticHeight(d.r);
      const speed0 = norm(airVelocity(d.r, d.v, v3()));
      let h = this.inflating(this.t) ? 0.005 : this.seatLeftAt === undefined ? (alt0 < sp.main.altitude + 300 ? 0.02 : 0.05) : speed0 > 15 ? 0.05 : 0.1;
      // land on the stabiliser's opening
      if (this.t < this.stabiliserAt) h = Math.min(h, this.stabiliserAt - this.t);
      h = Math.min(h, to - this.t);
      const step = fallStepToGround({ r: d.r, v: d.v }, this.t, h, this.mass, (tt) => this.cda(tt), env);
      d.r = step.state.r; d.v = step.state.v;
      this.t += step.h;
      const alt = geodeticHeight(d.r), atm = atmosphere(Math.max(0, alt));
      const u = airVelocity(d.r, d.v, env.wind(d.r, this.t)), speed = norm(u);
      if (speed > 0.5) d.dir = scale(u, -1 / speed);
      const g = 0.5 * atm.rho * speed * speed * this.cda(this.t) / this.mass / G0;
      if (this.seatLeftAt !== undefined && !this.mainLogged) this.openingG = Math.max(this.openingG, g);
      if (step.contact) { this.land(d, env, to, events); break; }
      // the stabilising chute, out of its container on the seat
      if (this.crew.phase === 'seat' && this.t >= this.stabiliserAt - 1e-9) {
        this.stabiliserFill = fillTime(sp.stabiliser, speed);
        this.crew.phase = 'stabiliser';
      }
      // at 4 km: the main comes out, and he leaves the seat with the seat back, the reserve and the kit
      if (this.crew.phase === 'stabiliser' && alt <= sp.main.altitude) {
        this.seatLeftAt = this.t;
        this.mainFill = fillTime(sp.main, speed);
        const seatMass = sp.mass - (sp.pilot + sp.suit + sp.parachutes + sp.seatBack + sp.naz);
        this.mass -= seatMass;
        this.crew.phase = 'main'; this.crew.seat = false;
        const seat: Debris = {
          id: env.nextId(), name: 'seat', r: { ...d.r }, v: { ...d.v }, dir: { ...d.dir }, mass: seatMass, area: sp.emptySeatCda, cd: 1,
          visual: { diameter: 0.7, length: 1.4, color: '#6f7568', kind: 'seat' }, alive: true, createdAt: this.t,
        };
        spawn.push({ debris: seat, flight: new FallingBody(this.t, sp.emptySeatCda) });
        events.push({ key: 'evt.seatSeparation', severity: 'info', t: this.t, params: { alt: Math.round(alt), speed: Math.round(speed) } });
      }
      if (this.seatLeftAt !== undefined && !this.mainLogged && this.t >= this.seatLeftAt + this.mainFill + 1) {
        this.mainLogged = true;
        events.push({ key: 'evt.pilotMain', severity: 'info', t: this.t, params: { alt: Math.round(alt), g: +this.openingG.toFixed(1) } });
      }
      if (this.seatLeftAt !== undefined && this.reserveAt === undefined && alt <= sp.reserve.altitude) {
        this.reserveAt = this.t;
        this.reserveFill = fillTime(sp.reserve, speed);
        events.push({ key: 'evt.pilotReserve', severity: 'warn', t: this.t, params: { alt: Math.round(alt) } });
      }
      if (this.crew.naz && this.seatLeftAt !== undefined && sp.nazLost !== undefined && this.t >= this.seatLeftAt + sp.nazLost) {
        this.crew.naz = false;
        this.mass -= sp.naz;
      }
    }
    this.publish(d);
    return { events, spawn };
  }

  /** On the ground: where, how fast, and how far from the sphere. */
  private land(d: Debris, env: DebrisEnvironment, to: number, events: DebrisFlightEvent[]): void {
    // his speed down onto the ground, against the turning Earth
    const vertical = -dot(sub(d.v, cross(EARTH_RATE, d.r)), normalize(d.r));
    comeDown(d, this.t, env, 'landed');
    this.crew.phase = 'landed';
    // both on the turning ground: carry his place on to the end of the step, where the sphere's is
    const here = quatRotate(quatFromAxisAngle(v3(0, 0, 1), OMEGA_EARTH * (to - this.t)), d.r);
    const sphere = this.sphere();
    const km = sphere ? norm(sub(sphere, here)) / 1000 : NaN;
    events.push({ key: 'evt.pilotLanding', severity: 'success', t: this.t, params: {
      speed: +vertical.toFixed(1), ...(Number.isFinite(km) ? { km: +km.toFixed(2) } : {}),
      lat: +d.impact!.lat.toFixed(4), lon: +d.impact!.lon.toFixed(4) } });
  }

  /** His canopies and his mass on the debris record. */
  private publish(d: Debris): void {
    const sp = this.spec, t = this.t;
    this.crew.stabiliser = this.seatLeftAt === undefined
      ? canopy(sp.stabiliser.area, sp.stabiliser.cd, this.stabiliserAt, this.stabiliserFill, t, 0, 0) / (sp.stabiliser.area * sp.stabiliser.cd) : 0;
    this.crew.main = canopy(sp.main.area, sp.main.cd, this.seatLeftAt, this.mainFill, t, 0, 0) / (sp.main.area * sp.main.cd);
    this.crew.reserve = sp.reserve.filled * canopy(sp.reserve.area, sp.reserve.cd, this.reserveAt, this.reserveFill, t, 0, 0) / (sp.reserve.area * sp.reserve.cd);
    if (this.crew.phase === 'landed') { this.crew.main = 0; this.crew.reserve = 0; }
    d.crew = { ...this.crew };
    d.mass = this.mass;
    d.area = this.cda(t);
  }
}
