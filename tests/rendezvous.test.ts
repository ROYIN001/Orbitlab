/**
 * G07: the flight to the station — the plan and its phasing against the
 * windows the profiles are flown in, the targeting, a whole two-orbit flight
 * to docking against Soyuz MS-28's timeline, TORU by hand, the settings and
 * the viewer's ending. The other profiles, ports and the six-DOF ascent are
 * flown in tests/heavy/rendezvous.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { orbitById } from '../src/data/orbits';
import { siteById } from '../src/data/sites';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE } from '../src/physics/defaults';
import { launchWindows } from '../src/physics/mission';
import { DEG, MU_EARTH, R_EARTH } from '../src/physics/constants';
import { add, norm, scale } from '../src/physics/vec3';
import { brakeImpulse, leadAngle, planRendezvous } from '../src/physics/rendezvous/plan';
import { AIM_POINT, APPROACH, PROFILES, PROFILE_IDS, type RendezvousProfileId } from '../src/physics/rendezvous/profiles';
import { PORTS, PORT_IDS, TARGET_OFFSET, targetOffset, type PortId } from '../src/physics/rendezvous/ports';
import { STATION_RADIUS, circularState, toLvlh, type PointState } from '../src/physics/rendezvous/station';
import { apsisImpulse, coastJ2, interceptImpulse } from '../src/physics/rendezvous/targeting';
import { validateConfigInput } from '../src/config/validation';
import { watchMissionSettings } from '../src/ui/watch-missions';
import { flightEnding, watchBeat } from '../src/ui/watch-logic';
import { niceSpan } from '../src/ui/rendezvous-plot';
import { captureFrame } from '../src/physics/frame';
import { elementsFromState } from '../src/physics/orbital';
import { quatInverseRotate } from '../src/physics/rigid/math';
import type { MissionConfig } from '../src/types';

/** A 200 × 242 km orbit at 51.64°, at perigee: where Soyuz MS separates. */
function separation(): PointState {
  const rp = R_EARTH + 200e3, ra = R_EARTH + 242e3, a = (rp + ra) / 2;
  const s = circularState(rp, 51.64 * DEG, 1.0, 0.3);
  const vp = Math.sqrt(MU_EARTH * (2 / rp - 1 / a));
  return { r: s.r, v: scale(s.v, vp / norm(s.v)) };
}

function mission(profile: RendezvousProfileId = 'twoOrbit', port: PortId = 'rassvet', model: 'pointMass' | 'sixDof' = 'pointMass'): MissionConfig {
  const w = launchWindows(orbitById('iss'), siteById('baikonur'), new Date('2026-09-20T00:00:00Z'), 1)[0];
  return {
    vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbit: orbitById('iss'), launchTime: w.time,
    guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: 7150,
    dynamics: { model, wind: 'calm', seed: 1 }, rendezvous: { profile, port },
  };
}

/** Fly until `until` holds or the flight is over. */
function fly(sim: Simulation, until: (sim: Simulation) => boolean = () => false, limit = 60 * 3600): void {
  let guard = 0;
  while (!sim.done && sim.state.t < limit && !until(sim) && guard++ < 3e6) sim.step(sim.suggestedDt());
}

const at = (sim: Simulation, key: string) => sim.events.find((e) => e.key === key);

describe('the plan', () => {
  it.each(PROFILE_IDS)('%s: phases the station inside the flown window and arrives at the aim point', (id) => {
    const s0 = separation();
    const plan = planRendezvous(id, 530, s0, STATION_RADIUS);
    const lead = leadAngle(s0, plan.station.at(530)) / DEG;
    // lozga.livejournal.com, Roscosmos; SoyCOM's 240°–30° for the two-day
    if (id === 'twoOrbit') expect(lead).toBeGreaterThan(8), expect(lead).toBeLessThan(18);
    if (id === 'fourOrbit') expect(lead).toBeGreaterThan(18), expect(lead).toBeLessThan(40);
    if (id === 'twoDay') expect(lead).toBeGreaterThan(-120), expect(lead).toBeLessThan(30);
    // the plan flown impulsively ends at the aim point, at rest there before the braking
    let st = s0, t = 530;
    for (const b of plan.burns.filter((x) => x.kind !== 'brake')) {
      st = coastJ2(st, b.t - t);
      t = b.t;
      st = { r: st.r, v: add(st.v, b.dv) };
    }
    st = coastJ2(st, plan.tArrive - t);
    const rel = toLvlh(plan.station.at(plan.tArrive), st);
    expect(Math.abs(rel.r.x - AIM_POINT.x)).toBeLessThan(1);
    expect(Math.abs(rel.r.z - AIM_POINT.z)).toBeLessThan(1);
    // the station stays at its own height
    const alt = (norm(plan.station.at(plan.tArrive).r) - R_EARTH) / 1e3;
    expect(alt).toBeGreaterThan(405);
    expect(alt).toBeLessThan(430);
    // the phasing burns are the flight's own; the whole plan costs what the flown ones did (114–117 m/s)
    for (const b of PROFILES[id].burns.filter((x) => x.kind === 'phasing')) {
      expect(norm(plan.burns.find((x) => x.id === b.id)!.dv)).toBeCloseTo(b.dv!, 6);
    }
    const total = plan.burns.reduce((sum, b) => sum + norm(b.dv), 0);
    expect(total).toBeGreaterThan(95);
    expect(total).toBeLessThan(135);
  });

  it('brakes to the approach speed, straight at the station', () => {
    const plan = planRendezvous('twoOrbit', 530, separation(), STATION_RADIUS);
    const st = plan.station.at(plan.tArrive), sc = plan.nominal.brake!;
    const after = { r: sc.r, v: add(sc.v, brakeImpulse(st, sc)) };
    const rel = toLvlh(st, after);
    const closing = -(rel.r.x * rel.v.x + rel.r.y * rel.v.y + rel.r.z * rel.v.z) / norm(rel.r);
    expect(closing).toBeCloseTo(APPROACH.farSpeed, 6);
  });

  it('refuses a profile whose burns run backwards', () => {
    const saved = PROFILES.twoOrbit.burns[1].t;
    (PROFILES.twoOrbit.burns[1] as { t: number }).t = 100;
    try {
      expect(() => planRendezvous('twoOrbit', 530, separation(), STATION_RADIUS)).toThrow(RangeError);
    } finally {
      (PROFILES.twoOrbit.burns[1] as { t: number }).t = saved;
    }
  });
});

describe('targeting on the J2 coast', () => {
  it('shoots an impulse onto a point and arrives level at a height', () => {
    const s0 = separation();
    const target = coastJ2({ r: s0.r, v: add(s0.v, scale(s0.v, 5 / norm(s0.v))) }, 2000).r;
    const shot = interceptImpulse(s0, 2000, target, scale(s0.v, 3 / norm(s0.v)));
    expect(shot).not.toBeNull();
    expect(shot!.miss).toBeLessThan(1);
    const r = R_EARTH + 300e3;
    const dv = apsisImpulse(s0, 2700, r, scale(s0.v, 20 / norm(s0.v)));
    expect(dv).not.toBeNull();
    const end = coastJ2({ r: s0.r, v: add(s0.v, dv!) }, 2700);
    expect(Math.abs(norm(end.r) - r)).toBeLessThan(1);
    expect(Math.abs((end.r.x * end.v.x + end.r.y * end.v.y + end.r.z * end.v.z) / norm(end.r))).toBeLessThan(1e-3);
  });
});

describe('the ports', () => {
  it('trail the centre of mass as the Russian segment does, each target beside its port', () => {
    for (const id of PORT_IDS) {
      const p = PORTS[id];
      expect(p.position.x).toBeLessThan(-10);
      expect(Math.hypot(p.axis.x, p.axis.y, p.axis.z)).toBeCloseTo(1, 12);
      const o = targetOffset(p);
      expect(Math.hypot(o.x, o.y, o.z)).toBeCloseTo(TARGET_OFFSET, 12);
      expect(o.x * p.axis.x + o.y * p.axis.y + o.z * p.axis.z).toBeCloseTo(0, 12);
    }
    expect(PORTS.rassvet.axis.z).toBe(1);
    expect(PORTS.poisk.axis.z).toBe(-1);
    expect(PORTS.zvezdaAft.axis.x).toBe(-1);
  });
});

describe('a two-orbit flight to Rassvet', () => {
  const sim = new Simulation(mission(), { headless: true });
  fly(sim);

  it('is inserted where Soyuz MS is', () => {
    const e = at(sim, 'evt.parkingOrbit')!;
    expect(e.params!.pe).toBeGreaterThanOrEqual(197);
    expect(e.params!.ap).toBeGreaterThanOrEqual(235);
    expect(e.params!.ap).toBeLessThanOrEqual(247);
  });

  it('docks on the Soyuz MS-28 timeline', () => {
    expect(sim.state.status).toBe('orbit');
    expect(sim.state.note).toBe('docked');
    const rv = sim.state.rendezvous!;
    expect(rv.phase).toBe('docked');
    // MS-28 touched Rassvet at 3:10:33, MS-17 at 3:03:38
    const contact = rv.contact!;
    expect(contact.captured).toBe(true);
    expect(contact.t / 60).toBeGreaterThan(180);
    expect(contact.t / 60).toBeLessThan(200);
    expect(rv.dockedAt! - contact.t).toBeCloseTo(APPROACH.hooks, 0);
    // inside the docking system's limits
    expect(contact.speed).toBeGreaterThanOrEqual(APPROACH.captureSpeed[0]);
    expect(contact.speed).toBeLessThanOrEqual(APPROACH.captureSpeed[1]);
    expect(contact.lateral).toBeLessThanOrEqual(APPROACH.captureLateral);
  });

  it('flies the burns at MS-28\'s times, in the order of the approach', () => {
    const burns = sim.events.filter((e) => e.key === 'evt.rendezvousBurn');
    expect(burns.map((e) => e.params!.burn)).toEqual(['dv1', 'dv2', 'dv3', 'brake']);
    // DV1 ≈ 0:34, the first rendezvous burn 1:05:38, the transfer 1:55:49 (burn starts)
    expect(burns[0].t / 60).toBeCloseTo(34, 0);
    expect(burns[1].t / 60).toBeCloseTo(65.8, 0);
    expect(burns[2].t / 60).toBeCloseTo(115.8, 0);
    expect(burns[0].params!.dv).toBeCloseTo(22, 0);
    expect(burns[1].params!.dv).toBeCloseTo(50.9, 0);
    const keys = sim.events.map((e) => e.key);
    const order = ['evt.rendezvousPlan', 'evt.kursApproach', 'evt.kursFlyaround', 'evt.kursStationkeeping', 'evt.kursFinal', 'evt.contact', 'evt.docked'];
    const idx = order.map((k) => keys.indexOf(k));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    // the braking burn is at the aim point, 2.2 km out, as MS-28's first was (2.27 km)
    expect(at(sim, 'evt.kursApproach')!.params!.range).toBeGreaterThan(2000);
    expect(at(sim, 'evt.kursApproach')!.params!.range).toBeLessThan(2400);
  });

  it('spends about what Soyuz MS does, and keeps the rest', () => {
    const used = 858 - sim.state.rendezvous!.propellant;
    expect(used).toBeGreaterThan(200);
    expect(used).toBeLessThan(400);
  });

  it('stays on the port once docked', () => {
    const before = sim.state.rendezvous!;
    const t0 = sim.state.t;
    for (let i = 0; i < 50; i++) sim.step(sim.suggestedDt());
    const after = sim.state.rendezvous!;
    expect(sim.state.t).toBeGreaterThan(t0 + 100);
    expect(after.phase).toBe('docked');
    expect(after.range).toBeCloseTo(before.range, 3);
    // and the frame carries it for the drawing
    const frame = captureFrame(sim);
    expect(frame.rendezvous?.phase).toBe('docked');
    expect(flightEnding(frame, sim.events)).toBe('docked');
  });
});

describe('TORU', () => {
  it('docks by hand from the stationkeeping point, the station crew flying it', () => {
    const sim = new Simulation(mission(), { headless: true });
    fly(sim, (s) => s.state.rendezvous?.phase === 'stationkeeping');
    expect(sim.state.rendezvous?.phase).toBe('stationkeeping');
    // settle, then take over and close along the axis at 0.3 m/s, slowing to 0.15 inside 20 m
    fly(sim, (s) => s.state.t > (at(s, 'evt.kursStationkeeping')!.t + 30));
    expect(sim.commandToru({ translate: { x: 0.3, y: 0, z: 0 }, rotate: { x: 0, y: 0, z: 0 } })).toBe(true);
    expect(sim.state.rendezvous?.manual).toBe(true);
    expect(at(sim, 'evt.toruOn')).toBeDefined();
    // the operator keeps the target's cross on its disc: for Rassvet the controller's "up" is the
    // station's x and its "left" the station's y, so the offset from the axis is steered out along them
    const port = PORTS.rassvet;
    let tick = 0;
    fly(sim, (s) => {
      const rv = s.state.rendezvous!;
      if (++tick % 20 === 0) {
        const dx = rv.rel.r.x - port.position.x, dy = rv.rel.r.y - port.position.y;
        const across = (d: number) => Math.max(-0.05, Math.min(0.05, -0.05 * d));
        s.commandToru({ translate: { x: (rv.axial ?? 1e9) < 20 ? 0.15 : 0.3, y: across(dy), z: across(dx) }, rotate: { x: 0, y: 0, z: 0 } });
      }
      return rv.phase === 'capture' || rv.phase === 'retreat' || rv.phase === 'aborted';
    });
    const rv = sim.state.rendezvous!;
    expect(rv.phase).toBe('capture');
    expect(rv.contact!.captured).toBe(true);
    expect(rv.contact!.speed).toBeCloseTo(0.15, 1);
    fly(sim);
    expect(sim.state.note).toBe('docked');
  });

  it('misses a contact outside the limits, and Kurs backs away to try again', () => {
    const sim = new Simulation(mission(), { headless: true });
    fly(sim, (s) => s.state.rendezvous?.phase === 'stationkeeping');
    // straight in at 0.5 m/s: faster than the probe can take
    sim.commandToru({ translate: { x: 0.5, y: 0, z: 0 }, rotate: { x: 0, y: 0, z: 0 } });
    fly(sim, (s) => !!s.state.rendezvous?.contact);
    const rv = sim.state.rendezvous!;
    expect(rv.contact!.captured).toBe(false);
    expect(rv.contact!.speed).toBeGreaterThan(APPROACH.captureSpeed[1]);
    expect(rv.phase).toBe('retreat');
    expect(rv.manual).toBe(false);
    expect(at(sim, 'evt.contactFailed')).toBeDefined();
    // Kurs brings it back and docks at the second try
    fly(sim);
    expect(sim.state.note).toBe('docked');
  });

  it('turns the spacecraft at the rate asked and holds the attitude when released', () => {
    const sim = new Simulation(mission(), { headless: true });
    // settled on the port's axis first
    fly(sim, (s) => s.state.rendezvous?.phase === 'stationkeeping');
    fly(sim, (s) => s.state.t > at(s, 'evt.kursStationkeeping')!.t + 90);
    // the nose in the station's frame (which turns once an orbit)
    const nose = (s: Simulation) => quatInverseRotate(s.state.rendezvous!.station.q, s.state.dir);
    const angle = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.acos(Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z)) / DEG;
    sim.commandToru({ translate: { x: 0, y: 0, z: 0 }, rotate: { x: 0.5 * DEG, y: 0, z: 0 } });
    const d0 = nose(sim);
    const t0 = sim.state.t;
    fly(sim, (s) => s.state.t > t0 + 60);
    // a roll leaves the nose where it was
    expect(angle(d0, nose(sim))).toBeLessThan(1);
    sim.commandToru({ translate: { x: 0, y: 0, z: 0 }, rotate: { x: 0, y: -0.5 * DEG, z: 0 } });
    const t1 = sim.state.t;
    fly(sim, (s) => s.state.t > t1 + 40);
    const turned = angle(d0, nose(sim));
    // 0.5 °/s for 40 s
    expect(turned).toBeGreaterThan(16);
    expect(turned).toBeLessThan(24);
    // handed back, Kurs retreats to the stationkeeping point and flies in again
    expect(sim.commandToru(null)).toBe(true);
    expect(sim.state.rendezvous?.phase).toBe('retreat');
    fly(sim);
    expect(sim.state.note).toBe('docked');
  });

  it('is refused outside the approach', () => {
    const sim = new Simulation(mission(), { headless: true });
    fly(sim, (s) => s.state.rendezvous?.phase === 'coast');
    expect(sim.commandToru({ translate: { x: 0.1, y: 0, z: 0 }, rotate: { x: 0, y: 0, z: 0 } })).toBe(false);
  });
});

describe('settings', () => {
  const base = { ...mission(), orbitId: 'iss', payloadMass: 7150, guidanceOverrides: {} };

  it('accepts a flight to the station and refuses one that cannot be flown', () => {
    expect(validateConfigInput(base)).toEqual([]);
    const leo = { ...base, orbitId: 'leo', orbit: orbitById('leo') };
    expect(validateConfigInput(leo).map((i) => i.code)).toContain('rendezvousUnavailable');
    const wrong = { ...base, rendezvous: { profile: 'oneOrbit' as RendezvousProfileId } };
    expect(validateConfigInput(wrong).map((i) => i.code)).toContain('selection');
    const noEngine = { ...base, satelliteId: 'cubesats' };
    expect(validateConfigInput(noEngine).map((i) => i.code)).toContain('rendezvousUnavailable');
  });

  it('builds the viewer\'s docking flight', () => {
    const s = watchMissionSettings('soyuzMsDocking', new Date('2026-09-22T03:00:00Z'));
    expect(s.rendezvous).toEqual({ profile: 'twoOrbit', port: 'rassvet' });
    expect(validateConfigInput(s)).toEqual([]);
  });

  it('leaves a mission without one flying as before', () => {
    const { rendezvous: _none, ...cfg } = mission();
    const sim = new Simulation(cfg, { headless: true });
    expect(sim.rendezvous.enabled).toBe(false);
    expect(sim.plan.insertionApoapsis).toBeLessThan(230e3);
  });
});

describe('the viewer and the plot', () => {
  it('narrates the phases and ends only when docked', () => {
    const sim = new Simulation(mission(), { headless: true });
    // separating, before the plan: already on the way, not an ending
    fly(sim, (s) => s.state.status === 'rendezvous');
    expect(sim.state.rendezvous).toBeUndefined();
    expect(flightEnding(captureFrame(sim), sim.events)).toBeNull();
    fly(sim, (s) => s.state.rendezvous?.phase === 'coast' && s.state.t > 1200);
    // coasting in free fall, not at the third stage's last g
    expect(sim.state.gLoad).toBe(0);
    let frame = captureFrame(sim);
    expect(watchBeat(frame, sim.events)).toBe('rvPhasing');
    expect(flightEnding(frame, sim.events)).toBeNull();
    fly(sim, (s) => s.state.rendezvous?.phase === 'final');
    frame = captureFrame(sim);
    expect(watchBeat(frame, sim.events)).toBe('rvFinal');
    expect(flightEnding(frame, sim.events)).toBeNull();
  });

  it('picks round plot spans', () => {
    expect(niceSpan(0.9)).toBe(1);
    expect(niceSpan(130)).toBe(200);
    expect(niceSpan(2750)).toBe(5000);
    expect(niceSpan(1e6)).toBe(1e6);
  });

  it('keeps the station in the spacecraft\'s plane, at the ISS\'s inclination', () => {
    const plan = planRendezvous('twoOrbit', 530, separation(), STATION_RADIUS);
    const el = elementsFromState(plan.station.at(3000).r, plan.station.at(3000).v);
    expect(el.i / DEG).toBeCloseTo(51.64, 1);
  });
});
