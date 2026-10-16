/**
 * The smoke a flight leaves (roadmap V03, src/render/trails.ts,
 * src/render/exhaust.ts, src/render/vapour.ts): each engine's kind of
 * exhaust, the trail built from the recording alone — the same whether it is
 * fed at once or frame by frame, and scrubbing back draws what it drew then —
 * carried by the flight's own wind and by nothing when it is calm, and the
 * vapour cone's Mach, altitude and humidity band.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { exhaustKind } from '../src/render/exhaust';
import { ExhaustTrails, SITE_HUMIDITY } from '../src/render/trails';
import { vapourStrength } from '../src/render/vapour';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { Simulation } from '../src/physics/simulation';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE } from '../src/physics/defaults';
import { captureFrame, type VisualFrame } from '../src/physics/frame';
import { SITES } from '../src/data/sites';
import { ENGINE_PARTS, engineSpec } from '../src/data/parts';
import type { DynamicsConfig, EngineSpec } from '../src/types';
import type { Vec3 } from '../src/physics/vec3';

const kindOf = (vehicleId: string, stageId: string) => {
  for (const st of vehicleById(vehicleId).stages) {
    if (st.id === stageId) return exhaustKind(st);
    for (const b of st.boosters ?? []) if (b.id === stageId) return exhaustKind(b);
  }
  throw new Error(`${vehicleId} has no ${stageId}`);
};

/** Ariane 64's first minute, recorded every 0.1 s: four P120C solids and a hydrogen core. */
function arianeFrames(until = 60): VisualFrame[] {
  const sim = new Simulation({ vehicleId: 'ariane64', satelliteId: 'cubesats', siteId: 'kourou', orbit: orbitById('leo'),
    launchTime: new Date('2026-09-20T13:00:00Z'), guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false }, { headless: true });
  const frames: VisualFrame[] = [captureFrame(sim)];
  while (sim.state.t < until) {
    sim.step(0.1);
    if (sim.state.t - frames[frames.length - 1].t >= 0.1 - 1e-9) frames.push(captureFrame(sim));
  }
  return frames;
}

const MAP = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
const trails = (dynamics?: DynamicsConfig) => new ExhaustTrails(vehicleById('ariane64'), 'kourou', dynamics, 0, MAP);
const identity = (p: Vec3, out: THREE.Vector3) => out.set(p.x, p.y, p.z);
const drawn = (tr: ExhaustTrails) => { const d = tr.drawn(); return { count: d.count, positions: Array.from(d.positions) }; };

describe('exhaust kinds', () => {
  it('follow each engine and its propellant', () => {
    expect(kindOf('soyuz21a', 'blokA')).toBe('kerolox');
    expect(kindOf('falcon9', 's1')).toBe('keroloxGG');
    expect(kindOf('ariane64', 'p120c')).toBe('solid');
    expect(kindOf('ariane64', 'llpm')).toBe('hydrolox');
    expect(kindOf('h3', 'srb3')).toBe('solid');
    expect(kindOf('starship', 'superheavy')).toBe('methalox');
    expect(kindOf('longmarch2d', 'cz2d1')).toBe('hypergolic');
  });

  it('darken behind an open-cycle gas generator only', () => {
    // fuel-rich turbine exhaust thrown overboard: Merlin, F-1, RD-0109, RD-0110
    for (const [vehicle, stage] of [['falcon9', 's1'], ['falconheavy', 'core'], ['falconheavy', 'side'], ['saturnv', 'sic'],
      ['saturnv506', 'sic506'], ['vostok8k72k', 'blokE'], ['vostokk', 'blokE1961'], ['soyuz21a', 'blokI']]) {
      expect(kindOf(vehicle, stage), `${vehicle} ${stage}`).toBe('keroloxGG');
    }
    // oxidiser-rich staged combustion (YF-100, RD-180, RD-191, RD-0124), and the R-7's peroxide-driven turbines
    for (const [vehicle, stage] of [['longmarch5', 'k3'], ['atlasv551', 'ccb'], ['angaraa5', 'urm1'], ['soyuz21b', 'blokI'],
      ['soyuz21a', 'blokBVGD'], ['vostokk', 'blokA']]) {
      expect(kindOf(vehicle, stage), `${vehicle} ${stage}`).toBe('kerolox');
    }
  });

  it('know a custom build\'s stage by its engine\'s name, variant letters and all', () => {
    // a designer's stage gets an id of its own (src/design/assemble.ts), with no propellant entry
    const custom = (engine: EngineSpec) => exhaustKind({ id: 'stage1-r1', engine });
    const named = (name: string) => custom({ name, count: 1, thrustSL: 1e5, thrustVac: 1.1e5, ispSL: 300, ispVac: 330 });
    const expected: Record<string, string> = {
      'RL10C-1': 'hydrolox', 'LE-5B-3': 'hydrolox', 'LE-7A': 'hydrolox', 'YF-75D': 'hydrolox',
      'Raptor 2': 'methalox', 'BE-4': 'methalox', 'YF-209': 'methalox',
      'RD-276': 'hypergolic', 'S5.98M': 'hypergolic', 'YF-21C': 'hypergolic', 'RD-0210/0211': 'hypergolic',
      'Merlin 1D': 'keroloxGG', 'Rocketdyne F-1': 'keroloxGG',
      'RD-180': 'kerolox', 'YF-100': 'kerolox', 'RD-0124': 'kerolox',
    };
    for (const [name, kind] of Object.entries(expected)) expect(named(name), name).toBe(kind);
    // every engine part, as the designer installs it: its own family (a gas generator's kerosene darker)
    for (const part of ENGINE_PARTS) {
      const kind = custom(engineSpec(part, 1));
      expect(kind === 'keroloxGG' ? 'kerolox' : kind, `${part.id}: src/render/exhaust.ts's lists should know ${part.name}`).toBe(part.family);
    }
  });

  it('give every launch site a humidity', () => {
    for (const s of SITES) expect(SITE_HUMIDITY[s.id], s.id).toBeGreaterThan(0);
    expect(SITE_HUMIDITY.kourou).toBeGreaterThan(SITE_HUMIDITY.baikonur);
  });
});

describe('the exhaust trail', () => {
  const frames = arianeFrames();

  it('is built from the recording alone: fed at once or frame by frame, and scrubbed back', () => {
    const all = trails();
    all.update(frames, 45, identity, 0);
    const byFrame = trails();
    for (let i = 1; i <= frames.length; i += 7) byFrame.update(frames.slice(0, i), frames[i - 1].t, identity, 0);
    byFrame.update(frames, 45, identity, 0);
    expect(drawn(byFrame)).toEqual(drawn(all));
    // back to T+20: what it drew at T+20, nothing carried over from T+45
    const fresh = trails();
    fresh.update(frames, 20, identity, 0);
    all.update(frames, 20, identity, 0);
    expect(drawn(all)).toEqual(drawn(fresh));
    expect(drawn(fresh).count).toBeGreaterThan(100);
    // a new, shorter recording (a relaunch) starts the trail again
    all.update(frames.slice(0, 50), frames[49].t, identity, 0);
    const short = trails();
    short.update(frames.slice(0, 50), frames[49].t, identity, 0);
    expect(drawn(all)).toEqual(drawn(short));
  });

  it('leaves nothing before liftoff', () => {
    const tr = trails();
    const pad = frames.filter((f) => !f.liftoff);
    expect(pad.length).toBeGreaterThan(0);
    tr.update(pad, pad[pad.length - 1].t, identity, 0);
    expect(tr.drawn().count).toBe(0);
  });

  it('drifts with the flight\'s wind, and stands still when it is calm', () => {
    const calm = trails({ model: 'sixDof', wind: 'calm', seed: 1 });
    const pointMass = trails();
    const windy = trails({ model: 'sixDof', wind: 'crosswind', seed: 1 });
    for (const tr of [calm, pointMass, windy]) tr.update(frames, 55, identity, 0);
    const a = drawn(calm), b = drawn(windy);
    expect(drawn(pointMass)).toEqual(a);
    expect(b.count).toBe(a.count);
    // the crosswind's 8 m/s (±2 m/s of gusts), over each puff's age: the oldest have moved furthest
    let most = 0;
    for (let i = 0; i < a.count; i++) {
      const d = Math.hypot(b.positions[3 * i] - a.positions[3 * i], b.positions[3 * i + 1] - a.positions[3 * i + 1], b.positions[3 * i + 2] - a.positions[3 * i + 2]);
      most = Math.max(most, d);
    }
    expect(most).toBeGreaterThan(6 * 45);
    expect(most).toBeLessThan(10.5 * 55);
  });
});

describe('the vapour cone', () => {
  it('forms through Mach 1 in moist air low down, most in the humid tropics', () => {
    expect(vapourStrength(0.7, 5e3, 0.9)).toBe(0);
    expect(vapourStrength(1.4, 5e3, 0.9)).toBe(0);
    expect(vapourStrength(1.0, 16e3, 0.9)).toBe(0);
    const kourou = vapourStrength(1.0, 5e3, SITE_HUMIDITY.kourou), baikonur = vapourStrength(1.0, 5e3, SITE_HUMIDITY.baikonur);
    expect(kourou).toBeGreaterThan(0.8);
    expect(baikonur).toBeGreaterThan(0);
    expect(baikonur).toBeLessThan(kourou / 1.8);
  });
});
