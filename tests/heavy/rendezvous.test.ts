/**
 * G07: every rendezvous profile flown to docking against the flight it is
 * copied from, every port reached, and the two-orbit flight with the six-DOF
 * ascent (about a minute: the ascent is the slow part). docs/PHYSICS.md §9.2.
 *
 * | Profile | Contact, model | Contact, flight |
 * |---|---|---|
 * | two-orbit | 3:13 | Soyuz MS-28 3:10:33 (MS-17 3:03:38) |
 * | four-orbit | 6:22 | Soyuz TMA-19M 6:20:59 |
 * | two-day | 2 d 02:37 | Soyuz MS-01 2 d 02:35 |
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../../src/physics/simulation';
import { orbitById } from '../../src/data/orbits';
import { siteById } from '../../src/data/sites';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE } from '../../src/physics/defaults';
import { launchWindows } from '../../src/physics/mission';
import { APPROACH, type RendezvousProfileId } from '../../src/physics/rendezvous/profiles';
import { PORT_IDS, type PortId } from '../../src/physics/rendezvous/ports';
import type { MissionConfig } from '../../src/types';

function mission(profile: RendezvousProfileId, port: PortId, model: 'pointMass' | 'sixDof'): MissionConfig {
  const w = launchWindows(orbitById('iss'), siteById('baikonur'), new Date('2026-09-20T00:00:00Z'), 1)[0];
  return {
    vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbit: orbitById('iss'), launchTime: w.time,
    guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: 7150,
    dynamics: { model, wind: 'calm', seed: 1 }, rendezvous: { profile, port },
  };
}

function flyToDocking(cfg: MissionConfig): Simulation {
  const sim = new Simulation(cfg, { headless: true });
  let guard = 0;
  while (!sim.done && sim.state.t < 60 * 3600 && guard++ < 5e6) sim.step(sim.suggestedDt());
  return sim;
}

const log = (sim: Simulation) => sim.events.filter((e) => /rendezvous|kurs|contact|dock|toru|parking/i.test(e.key))
  .map((e) => `${(e.t / 60).toFixed(1)} min ${e.key} ${JSON.stringify(e.params ?? {})}`).join('\n');

/** Contact, minutes after liftoff, and how far it may be from the flight's. */
const FLOWN: Record<RendezvousProfileId, { contact: number; within: number }> = {
  twoOrbit: { contact: 190.55, within: 8 },
  fourOrbit: { contact: 380.98, within: 8 },
  twoDay: { contact: 3035, within: 20 },
};

describe('each profile, to Rassvet', () => {
  it.each(Object.keys(FLOWN) as RendezvousProfileId[])('%s docks on the flight\'s timeline', { timeout: 300_000 }, (profile) => {
    const sim = flyToDocking(mission(profile, 'rassvet', 'pointMass'));
    const rv = sim.state.rendezvous!;
    expect(sim.state.note, log(sim)).toBe('docked');
    expect(rv.contact!.captured).toBe(true);
    expect(Math.abs(rv.contact!.t / 60 - FLOWN[profile].contact), log(sim)).toBeLessThan(FLOWN[profile].within);
    // one contact, no retreat
    expect(sim.events.filter((e) => e.key === 'evt.contactFailed')).toEqual([]);
    // the burns in order, the braking last
    const burns = sim.events.filter((e) => e.key === 'evt.rendezvousBurn').map((e) => e.params!.burn);
    expect(burns[burns.length - 1]).toBe('brake');
  });
});

describe('each port, on the two-orbit profile', () => {
  it.each(PORT_IDS)('%s', { timeout: 300_000 }, (port) => {
    const sim = flyToDocking(mission('twoOrbit', port, 'pointMass'));
    const rv = sim.state.rendezvous!;
    expect(sim.state.note, log(sim)).toBe('docked');
    expect(rv.port).toBe(port);
    expect(rv.contact!.lateral).toBeLessThan(APPROACH.captureLateral);
    expect(rv.contact!.angle).toBeLessThan(APPROACH.captureAngle);
  });
});

describe('the six-DOF ascent', () => {
  it('flies the two-orbit profile to Rassvet like the point-mass one', { timeout: 900_000 }, () => {
    const sim = flyToDocking(mission('twoOrbit', 'rassvet', 'sixDof'));
    const rv = sim.state.rendezvous!;
    expect(sim.state.note, log(sim)).toBe('docked');
    const e = sim.events.find((x) => x.key === 'evt.parkingOrbit')!;
    expect(e.params!.pe).toBeGreaterThanOrEqual(197);
    expect(e.params!.ap).toBeGreaterThanOrEqual(235);
    expect(Math.abs(rv.contact!.t / 60 - FLOWN.twoOrbit.contact)).toBeLessThan(FLOWN.twoOrbit.within);
  });
});
