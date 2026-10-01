/**
 * Gagarin's own descent (C01: Vostok-1, src/physics/sim/crew-descent.ts),
 * flown from the hatch at 7 km in still air: the stabilising chute, the
 * seat let go under the main at 4 km, the reserve at 3 km, the ground at
 * about 5 m/s; the terminal speeds of each phase, the opening shock, and the
 * same flight every time. The flight with the sphere is tests/vostok1-harness.ts.
 */
import { describe, expect, it } from 'vitest';
import { CrewDescent, VOSTOK_CREW, fillTime } from '../src/physics/sim/crew-descent';
import { FallingBody } from '../src/physics/sim/fall';
import { canopy } from '../src/physics/rigid/escape';
import type { DebrisEnvironment, DebrisFlight, DebrisFlightEvent } from '../src/physics/sim/debris';
import type { Debris } from '../src/physics/sim/types';
import { geodeticHeight } from '../src/physics/geodesy';
import { atmosphere } from '../src/physics/atmosphere';
import { G0, OMEGA_EARTH, R_EARTH } from '../src/physics/constants';
import { cross, norm, sub, v3, type Vec3 } from '../src/physics/vec3';

function environment(): DebrisEnvironment {
  let ids = 100;
  return { groundElevation: () => 0, wind: () => v3(), theta: () => 0, nextId: () => ids++ };
}

/** Over the pole (where the ellipsoid's height is the radius less its polar radius, and the ground does not turn under him). */
const POLE = R_EARTH * (1 - 1 / 298.257223563);

/** Ejected at 7 km at 190 m/s, falling 20° below the horizontal; the sphere a kilometre off. */
function eject(): { d: Debris; flight: CrewDescent } {
  const r = v3(0, 0, POLE + 7000), speed = 190, g = 20 * Math.PI / 180;
  const v = v3(speed * Math.cos(g), 0, -speed * Math.sin(g));
  const flight = new CrewDescent(0, VOSTOK_CREW, () => v3(1000, 0, POLE));
  return { d: flight.debris(1, r, v), flight };
}

function flyAll(first: Debris, flight: DebrisFlight, env: DebrisEnvironment, every = 0.5) {
  const bodies = [first], flights = new Map<number, DebrisFlight>([[first.id, flight]]), events: DebrisFlightEvent[] = [];
  const track: { t: number; alt: number; speed: number; crew: Debris['crew'] }[] = [];
  for (let to = every; to < 2000; to += every) {
    const queue = bodies.filter((d) => d.alive && flights.has(d.id));
    while (queue.length > 0) {
      const d = queue.shift()!;
      const r = flights.get(d.id)!.step(d, to, env);
      events.push(...r.events);
      for (const s of r.spawn ?? []) { bodies.push(s.debris); if (s.flight) { flights.set(s.debris.id, s.flight); queue.push(s.debris); } }
    }
    track.push({ t: to, alt: geodeticHeight(first.r), speed: norm(sub(first.v, cross(v3(0, 0, OMEGA_EARTH), first.r))), crew: first.crew && { ...first.crew } });
    if (!bodies.some((d) => d.alive)) break;
  }
  return { bodies, events, track };
}

const terminal = (mass: number, cda: number, alt: number) => Math.sqrt(2 * mass * G0 / (atmosphere(alt).rho * cda));

describe('Gagarin from the hatch to the ground', () => {
  const { d, flight } = eject();
  const { bodies, events, track } = flyAll(d, flight, environment());
  const at = (key: string) => events.find((e) => e.key === key)!;

  it('opens the stabilising chute 0.45 s out and falls on it, in the seat, at its terminal speed', () => {
    expect(track.find((s) => s.t === 0.5)!.crew!.phase).toBe('stabiliser');
    const sp = VOSTOK_CREW;
    const s = track.find((x) => x.alt < 5000)!;
    expect(s.crew!.seat).toBe(true);
    expect(s.speed / terminal(sp.mass, sp.seatCda + sp.stabiliser.area * sp.stabiliser.cd, s.alt)).toBeCloseTo(1, 1);
  });

  it('leaves the seat at 4 km under the main, which opens with a shock of a few g', () => {
    const seat = at('evt.seatSeparation'), main = at('evt.pilotMain');
    expect(Math.abs(Number(seat.params!.alt) - 4000)).toBeLessThan(5);
    expect(main.t).toBeGreaterThan(seat.t);
    // opening shocks of personnel canopies at this speed are some 5–15 g
    expect(Number(main.params!.g)).toBeGreaterThan(4);
    expect(Number(main.params!.g)).toBeLessThan(15);
    // the seat falls on its own, without an event on the ground
    const seatBody = bodies.find((b) => b.name === 'seat')!;
    expect(seatBody.createdAt).toBeCloseTo(seat.t, 9);
    expect(seatBody.mass).toBe(VOSTOK_CREW.mass - 163);
    expect(seatBody.outcome).toBe('impact');
    expect(seatBody.alive).toBe(false);
  });

  it('puts the reserve out at 3 km and lands under both at about 5 m/s, a kilometre or so from the sphere', () => {
    expect(Math.abs(Number(at('evt.pilotReserve').params!.alt) - 3000)).toBeLessThan(5);
    const home = at('evt.pilotLanding');
    expect(Number(home.params!.speed)).toBeGreaterThan(4);
    expect(Number(home.params!.speed)).toBeLessThan(6);
    const sp = VOSTOK_CREW, mass = sp.pilot + sp.suit + sp.parachutes + sp.seatBack;
    const cda = sp.bodyCda + sp.main.area * sp.main.cd + sp.reserve.filled * sp.reserve.area * sp.reserve.cd;
    expect(Number(home.params!.speed) / terminal(mass, cda, 0)).toBeCloseTo(1, 1);
    expect(Number(home.params!.km)).toBeLessThan(3);
    expect(d.alive).toBe(false);
    expect(d.outcome).toBe('landed');
    expect(d.crew!.phase).toBe('landed');
    expect(d.crew!.naz).toBe(false);
    expect(d.mass).toBeCloseTo(mass, 9);
    expect(events.map((e) => e.key)).toEqual(['evt.seatSeparation', 'evt.pilotMain', 'evt.pilotReserve', 'evt.pilotLanding']);
  });

  it('is the same descent every time, whatever steps it is asked to take', () => {
    const again = eject();
    const second = flyAll(again.d, again.flight, environment(), 0.1);
    expect(second.events.map((e) => e.key)).toEqual(events.map((e) => e.key));
    // its own steps, not the caller's, decide when things happen (to rounding)
    second.events.forEach((e, i) => expect(e.t).toBeCloseTo(events[i].t, 6));
    const third = eject();
    expect(flyAll(third.d, third.flight, environment()).events).toEqual(events);
  });
});

describe('the canopies', () => {
  it('fill from nothing as the square of the time over their fill time', () => {
    const c = VOSTOK_CREW.main;
    const fill = fillTime(c, 70);
    expect(fill).toBeCloseTo(8 * Math.sqrt(4 * 83.5 / Math.PI) / 70, 9);
    expect(canopy(c.area, c.cd, 10, fill, 10 + fill / 2, 0, 0)).toBeCloseTo(c.area * c.cd / 4, 9);
    expect(canopy(c.area, c.cd, 10, fill, 10 + 2 * fill, 0, 0)).toBeCloseTo(c.area * c.cd, 9);
    expect(canopy(c.area, c.cd, 10, fill, 9, 0, 0)).toBe(0);
  });
});

describe('a plain falling body', () => {
  it('falls at its terminal speed and comes to rest where it lands, with no event', () => {
    const r: Vec3 = v3(0, 0, POLE + 2000);
    const d: Debris = { id: 5, name: 'hatch', r, v: v3(), dir: v3(1, 0, 0), mass: 25, area: 0.39, cd: 1.2,
      visual: { diameter: 1, length: 0.1, color: '#999', kind: 'hatch' }, alive: true, createdAt: 0 };
    const cda = 1.2 * 0.39;
    const flight = new FallingBody(0, cda);
    const out = flyAll(d, flight, environment());
    expect(out.events).toEqual([]);
    expect(d.outcome).toBe('impact');
    expect(d.restT).toBeDefined();
    expect(geodeticHeight(d.r)).toBeLessThan(0.01);
    const last = out.track[out.track.length - 2];
    expect(last.speed / terminal(25, cda, last.alt)).toBeCloseTo(1, 1);
  });
});
