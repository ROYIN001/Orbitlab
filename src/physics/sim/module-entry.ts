/**
 * Vostok-1's instrument module on its own, from the cables' parting to the
 * end of its pieces (C01; docs/PHYSICS.md §13.6). It was never meant to come
 * back and nothing of it is on record as found: it "burned up in the
 * atmosphere" (Siddiqi, *Challenge to Apollo*, 2000; GCAT: decayed about
 * 07:40 UTC). Where and how is not documented, so it is flown here the way
 * the re-entry survivability tools fly such a body (src/physics/sim/entry-heating.ts):
 *
 * - the module whole, tumbling as the venting left the pair spinning (it
 *   keeps the pair's spin, 30°/s, as it goes), as a rigid body with its drag
 *   on its mean projected area through its CG, and the heat at its
 *   stagnation point warming its skin;
 * - at 78 km, the tools' conventional break-up height, it comes apart into
 *   a handful of pieces;
 * - each piece a point mass that heats, melts and is gone, or slows down
 *   first and reaches the ground. Whichever the model gives is what is
 *   reported (`evt.moduleBurnedUp`); no piece is made to burn up.
 *
 * Only the module's mass is sourced: 2,265 kg less the TDU-1's 280 kg of
 * propellant (Feoktistov (ed.), *Космические аппараты*, 1983, table 3.2),
 * of which the TDU-1 unit is 396 kg dry (Feoktistov) and its engine about
 * 100 kg (astronautix: 98 kg). The other pieces, their materials, sizes and
 * places, the drag coefficients and the skin are estimates.
 */
import { atmosphere } from '../atmosphere';
import { geodeticHeight } from '../geodesy';
import { gravityJ2 } from '../gravity';
import { tumblingDragCoefficient } from '../aero';
import { integrateRigidStep, type RigidState } from '../rigid/integrator';
import { quatRotate, type Mat3 } from '../rigid/math';
import type { RigidTelemetry } from '../rigid/telemetry';
import { add, cross, norm, scale, v3 } from '../vec3';
import type { Debris } from './types';
import type { DebrisEnvironment, DebrisFlight, DebrisFlightEvent, DebrisFlightResult } from './debris';
import { BREAKUP_ALTITUDE, LumpedAblator, MATERIALS, stagnationHeatFlux, type MaterialId } from './entry-heating';
import { airVelocity, comeDown, fallStepToGround } from './fall';
import { mulberry32 } from './seed';

/**
 * One kind of piece the module comes apart into: `count` alike, flown
 * together as one debris record (alike in shape, mass and heating, they
 * would fall almost together; one record keeps the debris list, and every
 * recorded frame, short).
 */
export interface ModulePiece {
  /** its name on the debris list (`stageNameByLabel` names it) */
  id: string;
  count: number;
  /** kg each; absent, the pieces share what the others leave of the module's mass */
  mass?: number;
  material: MaterialId;
  /** a sphere (its diameter), a cylinder (diameter, length) or a box (three sides), m */
  shape: 'sphere' | 'cylinder' | 'box';
  size: readonly number[];
  /** where they sit, the module's axes from its CG (+x toward the engine), m */
  at: readonly [number, number, number];
}

export interface ModuleSpec {
  /** the module's size as a tumbling body, m: a cylinder of this diameter and length */
  diameter: number;
  length: number;
  /** its body x of the end in the sphere's cradle, from its CG, m */
  baseX: number;
  /** drag coefficient of the tumbling body, or of a piece, on its mean projected area, before `tumblingDragCoefficient`'s Mach shape */
  cd: number;
  /** its shell's mass per square metre, kg/m², whose temperature the heat at the stagnation point raises */
  skin: number;
  /** height of its break-up above WGS-84, m */
  breakup: number;
  /** the pieces' speed apart at the break-up, m/s, lowest and highest */
  spread: readonly [number, number];
  pieces: readonly ModulePiece[];
}

/**
 * The instrument module, after the burn 1,985 kg: a biconic 2.43 m across
 * and 2.25 m long (GCTC), flown as a tumbling cylinder of 2.2 m by 2.25 m
 * (an estimate of its mean projected area). Its pieces, all estimates but
 * the engine's mass and the TDU-1 unit's: the engine (steel; astronautix 98
 * kg, 1.13 m × 0.95 m); the unit's two toroidal tanks and its frame
 * (aluminium alloy), which with the engine and two of the gas bottles make
 * up its 396 kg (Feoktistov); eight ball-shaped gas bottles (steel), the
 * TDU-1's pressurant and the orientation system's nitrogen; six batteries; the equipment in
 * two dozen boxes; the shell (Al-Mg) in eight panels with their frames and
 * the radiator.
 */
export const VOSTOK_IM: ModuleSpec = {
  diameter: 2.2, length: 2.25, baseX: -1.1, cd: 1.0, skin: 8, breakup: BREAKUP_ALTITUDE, spread: [1, 3],
  pieces: [
    { id: 'im.tdu', count: 1, mass: 100, material: 'steel', shape: 'cylinder', size: [0.95, 1.13], at: [0.9, 0, 0] },
    { id: 'im.tanks', count: 2, mass: 64, material: 'aluminium', shape: 'cylinder', size: [1.6, 0.35], at: [0.45, 0, 0] },
    { id: 'im.frame', count: 8, mass: 16, material: 'aluminium', shape: 'box', size: [1.2, 0.15, 0.1], at: [0.2, 0, 0] },
    { id: 'im.bottle', count: 8, mass: 20, material: 'steel', shape: 'sphere', size: [0.45], at: [-0.85, 0, 0] },
    { id: 'im.battery', count: 6, mass: 50, material: 'aluminium', shape: 'box', size: [0.5, 0.4, 0.3], at: [-0.3, 0, 0.4] },
    { id: 'im.equipment', count: 24, material: 'aluminium', shape: 'box', size: [0.5, 0.4, 0.3], at: [-0.3, 0, -0.3] },
    { id: 'im.shell', count: 8, mass: 30, material: 'aluminium', shape: 'box', size: [2.0, 1.0, 0.02], at: [0, 0, 0] },
  ],
};

/** A piece's whole surface, m². */
export function pieceSurface(p: Pick<ModulePiece, 'shape' | 'size'>): number {
  const [a, b = a, c = b] = p.size;
  if (p.shape === 'sphere') return Math.PI * a * a;
  if (p.shape === 'cylinder') return Math.PI * a * b + Math.PI * a * a / 2;
  return 2 * (a * b + b * c + c * a);
}

/**
 * A piece's nose radius for its stagnation heating, m: its sphere's or
 * cylinder's radius; a box's middle side, halved (a plate's edge is not what
 * meets the flow as it tumbles; an estimate).
 */
export function pieceNoseRadius(p: Pick<ModulePiece, 'shape' | 'size'>): number {
  if (p.shape !== 'box') return p.size[0] / 2;
  return [...p.size].sort((x, y) => y - x)[1] / 2;
}

/** Each piece's mass, kg: given, or the share of what the module's mass leaves over. */
export function pieceMasses(spec: ModuleSpec, total: number): number[] {
  const fixed = spec.pieces.reduce((s, p) => s + (p.mass !== undefined ? p.mass * p.count : 0), 0);
  const shared = spec.pieces.reduce((s, p) => s + (p.mass === undefined ? p.count : 0), 0);
  const each = shared > 0 ? Math.max(0, total - fixed) / shared : 0;
  return spec.pieces.map((p) => p.mass ?? each);
}

const COLOR: Record<MaterialId, string> = { aluminium: '#b9bdc3', steel: '#7f8388', titanium: '#9c9a97' };

/** Stefan–Boltzmann constant, W/(m² K⁴). */
const SIGMA = 5.670374e-8;

/**
 * The pieces of one break-up, and what came of them: the last of them to
 * burn up or come down reports the module's end, counting every piece.
 */
class FragmentGroup {
  private survived = 0;
  private survivedMass = 0;
  /** @param records how many debris records carry the `n` pieces */
  constructor(readonly n: number, private records: number) {}

  /** A record's `count` pieces are done at `t`: burned up, or on the ground with `mass` kg left in all. */
  done(t: number, ground: boolean, count: number, mass: number): DebrisFlightEvent | null {
    if (ground) { this.survived += count; this.survivedMass += mass; }
    if (--this.records > 0) return null;
    return { key: 'evt.moduleBurnedUp', severity: 'info', t,
      params: { n: this.n, burnt: this.n - this.survived, survived: this.survived, kg: Math.round(this.survivedMass) } };
  }
}

/** Pieces after the break-up: `count` alike, each a heated, melting point mass, flown as one. */
class FragmentEntry implements DebrisFlight {
  private heatLoad = 0;
  private q = 0;
  /**
   * @param ablator one piece's heat and mass
   * @param cda0 one piece's mean projected area, m²
   */
  constructor(private t: number, private readonly count: number, private readonly ablator: LumpedAblator, private readonly cda0: number,
    private readonly cd: number, private readonly noseRadius: number, private readonly group: FragmentGroup) {}

  step(d: Debris, to: number, env: DebrisEnvironment): DebrisFlightResult {
    const events: DebrisFlightEvent[] = [];
    const cda = (_t: number, mach: number) => tumblingDragCoefficient(this.cd, mach) * this.cda0 * this.ablator.shrink;
    while (this.t < to - 1e-9 && d.alive) {
      const speed0 = norm(airVelocity(d.r, d.v, v3()));
      // fine while it is hot and fast, coarser once it falls slowly
      const h = Math.min(to - this.t, speed0 > 1500 ? 0.05 : speed0 > 300 ? 0.1 : 0.5);
      const step = fallStepToGround({ r: d.r, v: d.v }, this.t, h, Math.max(this.ablator.mass, 0.1), cda, env);
      d.r = step.state.r; d.v = step.state.v;
      this.t += step.h;
      const u = airVelocity(d.r, d.v, env.wind(d.r, this.t)), speed = norm(u);
      const alt = geodeticHeight(d.r);
      const q = alt < 1000e3 ? stagnationHeatFlux(atmosphere(Math.max(0, alt)).rho, speed, this.noseRadius) : 0;
      this.ablator.step((this.q + q) / 2, step.h);
      this.heatLoad += (this.q + q) / 2 * step.h;
      this.q = q;
      d.mass = this.count * this.ablator.mass;
      if (speed > 1) d.dir = scale(u, -1 / speed);
      d.entry = { heatFlux: q, heatLoad: this.heatLoad, temperature: this.ablator.temperature, ablating: this.ablator.ablating,
        initialMass: d.entry?.initialMass ?? d.mass };
      if (this.ablator.demised) {
        d.alive = false;
        d.outcome = 'burnup';
        d.entry.ablating = false;
        const e = this.group.done(this.t, false, this.count, 0);
        if (e) events.push(e);
      } else if (step.contact) {
        comeDown(d, this.t, env, 'impact');
        d.entry.ablating = false;
        const e = this.group.done(this.t, true, this.count, d.mass);
        if (e) events.push(e);
      }
    }
    return { events };
  }
}

/**
 * The module whole, from the cables' parting to its break-up: a rigid body
 * tumbling freely (no aerodynamic moment: a tumbling body's averages out)
 * with its drag through its CG, the heat on its stagnation point warming a
 * thin skin, and at `spec.breakup` its pieces let go.
 */
export class ModuleEntry implements DebrisFlight {
  private state: RigidState;
  private readonly inertia: Mat3;
  private readonly area: number;
  private heatLoad = 0;
  private q = 0;
  /** the skin at the stagnation point, K (at about room temperature from orbit: an estimate) */
  private skinT = 300;
  private quaternionError = 0;
  private wind = v3();

  /**
   * @param state its CG's state as the cables part, with the pair's attitude and spin
   * @param t mission time of `state`
   * @param seed for the pieces' spread (`hashSeed`): the same flight breaks up the same way
   */
  constructor(state: RigidState, private t: number, readonly mass: number, private readonly seed: number, readonly spec: ModuleSpec = VOSTOK_IM) {
    this.state = { r: { ...state.r }, v: { ...state.v }, attitudeQ: { ...state.attitudeQ }, omegaBody: { ...state.omegaBody } };
    const r = spec.diameter / 2, l = spec.length;
    // a uniform cylinder's moments of inertia (an estimate of the module's)
    const ixx = 0.5 * mass * r * r, iyy = mass * (3 * r * r + l * l) / 12;
    this.inertia = [ixx, 0, 0, 0, iyy, 0, 0, 0, iyy];
    this.area = pieceSurface({ shape: 'cylinder', size: [spec.diameter, spec.length] }) / 4;
  }

  /** The debris record it starts as. */
  debris(id: number): Debris {
    const d: Debris = {
      id, name: 'instrumentModule', r: { ...this.state.r }, v: { ...this.state.v }, dir: quatRotate(this.state.attitudeQ, v3(1, 0, 0)),
      mass: this.mass, area: this.area, cd: this.spec.cd,
      visual: { diameter: 2.43, length: this.spec.length, color: '#8f9a8c', kind: 'instrumentModule' },
      alive: true, createdAt: this.t,
    };
    this.publish(d);
    return d;
  }

  step(d: Debris, to: number, env: DebrisEnvironment): DebrisFlightResult {
    const spec = this.spec;
    while (this.t < to - 1e-9 && d.alive) {
      const alt0 = geodeticHeight(this.state.r);
      const h = Math.min(to - this.t, alt0 > 120e3 ? 0.2 : 0.05);
      this.wind = env.wind(this.state.r, this.t);
      const result = integrateRigidStep(this.t, this.state, h, (_t, st) => {
        const alt = geodeticHeight(st.r);
        let force = v3();
        if (alt < 1000e3) {
          const atm = atmosphere(Math.max(0, alt)), air = airVelocity(st.r, st.v, this.wind), speed = norm(air);
          if (atm.rho > 0 && speed > 1e-3) force = scale(air, -0.5 * atm.rho * speed * tumblingDragCoefficient(spec.cd, speed / atm.a) * this.area);
        }
        return { mass: this.mass, inertiaBody: this.inertia, forceECI: force, momentBody: v3(), externalAccelerationECI: gravityJ2(st.r) };
      });
      this.quaternionError = Math.abs(result.quaternionNormBeforeNormalize - 1);
      this.state = result.state;
      this.t += h;
      const alt = geodeticHeight(this.state.r);
      const speed = norm(airVelocity(this.state.r, this.state.v, this.wind));
      const q = alt < 1000e3 ? stagnationHeatFlux(atmosphere(Math.max(0, alt)).rho, speed, spec.diameter / 2) : 0;
      this.heatLoad += (this.q + q) / 2 * h;
      // the skin where the flow stops on it: a thin aluminium shell warmed by the flux and radiating, held at its melting point
      const al = MATERIALS.aluminium;
      this.skinT = Math.min(al.meltK, this.skinT + ((this.q + q) / 2 - al.emissivity * SIGMA * this.skinT ** 4) * h / (spec.skin * al.c));
      this.q = q;
      this.publish(d);
      const vz = this.state.v.x * this.state.r.x + this.state.v.y * this.state.r.y + this.state.v.z * this.state.r.z;
      if (alt <= spec.breakup && vz < 0) return this.breakUp(d, env);
      if (alt - env.groundElevation(this.state.r) <= 0) { comeDown(d, this.t, env, 'impact'); break; }
    }
    return { events: [] };
  }

  /** The debris record from the state. */
  private publish(d: Debris): void {
    const st = this.state;
    d.r = { ...st.r }; d.v = { ...st.v };
    d.dir = quatRotate(st.attitudeQ, v3(1, 0, 0));
    d.rigid = this.telemetry();
    d.entry = { heatFlux: this.q, heatLoad: this.heatLoad, temperature: this.skinT,
      ablating: this.skinT >= MATERIALS.aluminium.meltK - 1e-6, initialMass: this.mass };
  }

  /** The tumbling module as rigid-body telemetry, its own body (never the escape's). */
  private telemetry(): RigidTelemetry {
    return {
      modelVersion: 'module-entry-1', bodyId: 'vostok.instrumentModule', configurationId: 'vostok.instrumentModule',
      attitudeQ: { ...this.state.attitudeQ }, omegaBody: { ...this.state.omegaBody }, cgBody: v3(), inertiaBody: this.inertia,
      renderOffsetBody: v3(this.spec.baseX, 0, 0), controlMode: 'auto', engineDeflections: {}, rcsPropellantKg: 0, saturated: false,
      angleOfAttack: 0, sideslip: 0, aeroWithinEnvelope: true, windECI: { ...this.wind }, rawQuaternionNormError: this.quaternionError,
    };
  }

  /**
   * At the break-up height: the module ends (`burnup`: as a body it is gone)
   * and its pieces take its place, each where it sat in it with the
   * tumble's velocity there and a small spread in a direction of its own.
   */
  private breakUp(d: Debris, env: DebrisEnvironment): DebrisFlightResult {
    const spec = this.spec, st = this.state, t = this.t;
    const alt = geodeticHeight(st.r);
    const masses = pieceMasses(spec, this.mass);
    const n = spec.pieces.reduce((s, p) => s + p.count, 0);
    const group = new FragmentGroup(n, spec.pieces.length);
    const rnd = mulberry32(this.seed);
    const spin = quatRotate(st.attitudeQ, st.omegaBody);
    const spawn: NonNullable<DebrisFlightResult['spawn']> = [];
    spec.pieces.forEach((p, k) => {
      const surface = pieceSurface(p), material = MATERIALS[p.material];
      {
        const [x, y, z] = p.at;
        const arm = quatRotate(st.attitudeQ, v3(x, y, z));
        // a direction evenly over the sphere, and a speed in the spread
        const cz = 2 * rnd() - 1, phi = 2 * Math.PI * rnd(), sz = Math.sqrt(1 - cz * cz);
        const kick = scale(v3(sz * Math.cos(phi), sz * Math.sin(phi), cz), spec.spread[0] + (spec.spread[1] - spec.spread[0]) * rnd());
        // the shell starts as hot as its skin; what was inside it at about room temperature
        const ablator = new LumpedAblator(material, masses[k], surface, p.id === 'im.shell' ? this.skinT : 300);
        const fragment: Debris = {
          id: env.nextId(), name: p.id, r: add(st.r, arm), v: add(add(st.v, cross(spin, arm)), kick), dir: { ...d.dir },
          mass: p.count * masses[k], area: surface / 4, cd: spec.cd,
          visual: { diameter: p.size[0], length: Math.max(...p.size), color: COLOR[p.material], kind: 'imFragment', material: p.material },
          alive: true, createdAt: t, fragmentOf: d.id,
          entry: { heatFlux: this.q, heatLoad: 0, temperature: ablator.temperature, ablating: false, initialMass: p.count * masses[k] },
        };
        spawn.push({ debris: fragment, flight: new FragmentEntry(t, p.count, ablator, surface / 4, spec.cd, pieceNoseRadius(p), group) });
      }
    });
    d.alive = false;
    d.outcome = 'burnup';
    d.entry = { ...d.entry!, ablating: false };
    return { events: [{ key: 'evt.moduleBreakup', severity: 'info', t, params: { alt: +(alt / 1000).toFixed(1), n } }], spawn };
  }
}
