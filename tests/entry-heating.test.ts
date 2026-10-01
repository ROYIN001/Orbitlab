/**
 * Entry heating and burn-up (C01: Vostok-1's instrument module,
 * src/physics/sim/entry-heating.ts and module-entry.ts): the stagnation
 * flux, a lump that heats, melts and is gone, and the module flown from its
 * cables' parting through its break-up at the tools' 78 km to every piece
 * burned up or on the ground.
 */
import { describe, expect, it } from 'vitest';
import {
  BREAKUP_ALTITUDE, DEMISE_MASS, LumpedAblator, MATERIALS, SUTTON_GRAVES_K, TUMBLING_HEAT_SHARE, equilibriumTemperature, stagnationHeatFlux,
} from '../src/physics/sim/entry-heating';
import { ModuleEntry, VOSTOK_IM, pieceMasses, pieceNoseRadius, pieceSurface } from '../src/physics/sim/module-entry';
import type { DebrisEnvironment, DebrisFlight, DebrisFlightEvent } from '../src/physics/sim/debris';
import type { Debris } from '../src/physics/sim/types';
import { geodeticHeight } from '../src/physics/geodesy';
import { R_EARTH } from '../src/physics/constants';
import { norm, v3 } from '../src/physics/vec3';
import { quatFromAxisAngle } from '../src/physics/rigid/math';

const DEG = Math.PI / 180;

describe('stagnation heat flux', () => {
  it('is Sutton and Graves\'s in the continuum, k √(ρ/rₙ) v³', () => {
    // 60 km, 7 km/s, a metre's nose: 1.7415e-4 × √(3.1e-4) × 3.43e11 ≈ 1.05 MW/m²
    const q = stagnationHeatFlux(3.1e-4, 7000, 1);
    expect(q).toBeCloseTo(SUTTON_GRAVES_K * Math.sqrt(3.1e-4) * 7000 ** 3, 6);
    expect(q / 1e6).toBeCloseTo(1.05, 2);
    // a smaller nose heats harder, as 1/√rₙ
    expect(stagnationHeatFlux(3.1e-4, 7000, 0.25) / q).toBeCloseTo(2, 6);
  });

  it('never exceeds the free-molecular ½ρv³ high up', () => {
    const rho = 1e-10, v = 7800;
    expect(stagnationHeatFlux(rho, v, 1)).toBeCloseTo(0.5 * rho * v ** 3, 12);
    expect(stagnationHeatFlux(0, v, 1)).toBe(0);
    expect(stagnationHeatFlux(1e-3, 0, 1)).toBe(0);
  });

  it('gives a radiative-equilibrium temperature that radiates the flux away', () => {
    const t = equilibriumTemperature(2e5, 0.8);
    expect(0.8 * 5.670374e-8 * t ** 4).toBeCloseTo(2e5, 3);
  });
});

describe('a lumped piece', () => {
  it('warms by its heat capacity, then melts at its melting point by its heat of fusion', () => {
    const al = MATERIALS.aluminium;
    const lump = new LumpedAblator(al, 10, 1, 300);
    // 1 kW/m² absorbed for 1 s on 1 m² warms 10 kg of aluminium by the heat in less the radiation
    const q = 1e3 / TUMBLING_HEAT_SHARE;
    lump.step(q, 1);
    const radiated = al.emissivity * 5.670374e-8 * 300 ** 4;
    expect(lump.temperature - 300).toBeCloseTo((1e3 - radiated) / (10 * al.c), 9);
    expect(lump.mass).toBe(10);
    // a hard flux takes it to the melt and melts it away
    let t = 0;
    while (!lump.demised && t < 600) { lump.step(2e6, 0.05); t += 0.05; }
    expect(lump.demised).toBe(true);
    expect(lump.mass).toBeLessThan(DEMISE_MASS);
    expect(lump.temperature).toBe(al.meltK);
    // the heat it took in is what warming and melting it needed, and the radiation from its surface
    const needed = 10 * (al.c * (al.meltK - 300) + al.fusion);
    expect(lump.heatIn).toBeGreaterThan(needed * 0.95);
  });

  it('shrinks as it melts, keeping its shape', () => {
    const lump = new LumpedAblator(MATERIALS.aluminium, 8, 2, MATERIALS.aluminium.meltK);
    while (lump.mass > 1) lump.step(5e5, 0.01);
    expect(lump.shrink).toBeCloseTo(Math.cbrt(lump.mass / 8) ** 2, 9);
  });

  it('cools by radiation and never below the cold air', () => {
    const lump = new LumpedAblator(MATERIALS.steel, 5, 1, 1000);
    for (let i = 0; i < 100_000; i++) lump.step(0, 1);
    expect(lump.temperature).toBe(180);
  });

  it('breaks the module up at the tools\' conventional height', () => {
    expect(BREAKUP_ALTITUDE).toBe(78e3);
    expect(VOSTOK_IM.breakup).toBe(78e3);
  });
});

describe('the instrument module\'s pieces', () => {
  it('add up to the module after the burn, the TDU-1 unit to its 396 kg', () => {
    const masses = pieceMasses(VOSTOK_IM, 1985);
    const total = VOSTOK_IM.pieces.reduce((s, p, k) => s + p.count * masses[k], 0);
    expect(total).toBeCloseTo(1985, 9);
    const each = (id: string) => masses[VOSTOK_IM.pieces.findIndex((p) => p.id === id)];
    // the engine, its two tanks, its frame and its two gas bottles (Feoktistov: 396 kg dry)
    expect(each('im.tdu') + 2 * each('im.tanks') + 8 * each('im.frame') + 2 * each('im.bottle')).toBe(396);
    for (const p of VOSTOK_IM.pieces) {
      expect(pieceSurface(p)).toBeGreaterThan(0);
      expect(pieceNoseRadius(p)).toBeGreaterThan(0.05);
    }
  });
});

/** The world as the tracker gives it, calm and flat. */
function environment(): DebrisEnvironment {
  let ids = 100;
  return { groundElevation: () => 0, wind: () => v3(), theta: () => 0, nextId: () => ids++ };
}

/** Fly a body and everything it lets go to `until`, as `DebrisTracker.stepFlown` does, in 1 s steps. */
function flyAll(first: Debris, flight: DebrisFlight, until: number, env: DebrisEnvironment): { bodies: Debris[]; events: DebrisFlightEvent[] } {
  const bodies = [first], flights = new Map<number, DebrisFlight>([[first.id, flight]]), events: DebrisFlightEvent[] = [];
  for (let to = first.createdAt + 1; to <= until; to += 1) {
    const queue = bodies.filter((d) => d.alive && flights.has(d.id));
    while (queue.length > 0) {
      const d = queue.shift()!;
      const r = flights.get(d.id)!.step(d, to, env);
      events.push(...r.events);
      for (const s of r.spawn ?? []) { bodies.push(s.debris); if (s.flight) { flights.set(s.debris.id, s.flight); queue.push(s.debris); } }
    }
    if (!bodies.some((d) => d.alive)) break;
  }
  return { bodies, events };
}

/** The module 140 km up, 7.6 km/s at 2.2° down, tumbling at 30°/s. */
function module(seed = 7): { d: Debris; flight: ModuleEntry } {
  const r = v3(R_EARTH + 140e3, 0, 0), speed = 7600, g = -2.2 * DEG;
  const v = v3(speed * Math.sin(g), speed * Math.cos(g) * Math.cos(65 * DEG), speed * Math.cos(g) * Math.sin(65 * DEG));
  const flight = new ModuleEntry({ r, v, attitudeQ: quatFromAxisAngle(v3(0, 0, 1), 0), omegaBody: v3(0, 0, 30 * DEG) }, 0, 1985, seed);
  return { d: flight.debris(1), flight };
}

describe('the instrument module flown', () => {
  const env = environment();
  const { d, flight } = module();
  const { bodies, events } = flyAll(d, flight, 4000, env);
  const pieces = bodies.filter((b) => b.fragmentOf === d.id);

  it('tumbles on as the pair spun, and heats its skin to the melt before it breaks up', () => {
    expect(d.rigid?.bodyId).toBe('vostok.instrumentModule');
    expect(d.rigid?.aeroWithinEnvelope).toBe(true);
    expect(norm(d.rigid!.omegaBody) / DEG).toBeCloseTo(30, 6);
    expect(d.entry!.heatFlux).toBeGreaterThan(1e5);
    expect(d.entry!.temperature).toBe(MATERIALS.aluminium.meltK);
  });

  it('breaks up at 78 km, its pieces carrying its whole mass, and no stage impact', () => {
    const breakup = events.find((e) => e.key === 'evt.moduleBreakup')!;
    expect(breakup).toBeDefined();
    expect(Math.abs(Number(breakup.params!.alt) - 78)).toBeLessThan(0.1);
    expect(breakup.params!.n).toBe(VOSTOK_IM.pieces.reduce((s, p) => s + p.count, 0));
    expect(d.alive).toBe(false);
    expect(d.outcome).toBe('burnup');
    expect(pieces).toHaveLength(VOSTOK_IM.pieces.length);
    expect(pieces.reduce((s, p) => s + p.entry!.initialMass, 0)).toBeCloseTo(1985, 6);
    expect(events.some((e) => e.key === 'evt.stageImpact')).toBe(false);
  });

  it('ends with every piece burned up or on the ground, and says how many of each', () => {
    for (const p of pieces) {
      expect(p.alive, p.name).toBe(false);
      expect(['burnup', 'impact']).toContain(p.outcome);
      if (p.outcome === 'impact') expect(geodeticHeight(p.r)).toBeLessThan(1);
    }
    const gone = events.filter((e) => e.key === 'evt.moduleBurnedUp');
    expect(gone).toHaveLength(1);
    const n = Number(gone[0].params!.n), burnt = Number(gone[0].params!.burnt), survived = Number(gone[0].params!.survived);
    expect(burnt + survived).toBe(n);
    const down = pieces.filter((p) => p.outcome === 'impact');
    expect(survived).toBe(down.reduce((s, p) => s + VOSTOK_IM.pieces.find((x) => x.id === p.name)!.count, 0));
    expect(Number(gone[0].params!.kg)).toBeCloseTo(down.reduce((s, p) => s + p.mass, 0), -1);
    // the light aluminium frame members melt away; the steel engine does not get that far
    expect(pieces.find((p) => p.name === 'im.frame')!.outcome).toBe('burnup');
    expect(pieces.find((p) => p.name === 'im.tdu')!.outcome).toBe('impact');
  });

  it('is the same flight every time, its spread from the seed', () => {
    const again = module();
    const second = flyAll(again.d, again.flight, 4000, environment());
    expect(second.events).toEqual(events);
    const other = module(8);
    const third = flyAll(other.d, other.flight, 4000, environment());
    expect(third.bodies.find((b) => b.name === 'im.tdu')!.impact).not.toEqual(bodies.find((b) => b.name === 'im.tdu')!.impact);
  });
});
