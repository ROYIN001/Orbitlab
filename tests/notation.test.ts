import { afterEach, describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { DEG } from '../src/physics/constants';
import { cross, dot, normalize, v3 } from '../src/physics/vec3';
import { quatRotate } from '../src/physics/rigid/math';
import {
  aeroAngles, bodyRates, getNotation, initNotation, notationFor, onNotationChange, setNotationPreference, simulatorRates,
  symbolText, withSymbol,
} from '../src/ui/notation';
import { buildTelemetryCsv } from '../src/ui/csv';
import { setLang } from '../src/i18n';
import { LAUNCH_TIME } from './fleet-harness';
import type { Simulation as Sim } from '../src/physics/simulation';

function withLang(lang: 'en' | 'ru' | 'th'): void {
  const g = globalThis as { document?: unknown };
  if (!g.document) g.document = { documentElement: {} };
  setLang(lang);
}
const memory = (): Storage => { const map = new Map<string, string>(); return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); } } as Storage; };
afterEach(() => { setNotationPreference('auto', memory()); withLang('en'); });

describe('notation (roadmap U07)', () => {
  it('is ГОСТ 20058-80 in Russian and ISO 1151 in English and Thai, unless chosen', () => {
    expect(notationFor('ru', 'auto')).toBe('gost');
    expect(notationFor('en', 'auto')).toBe('iso');
    expect(notationFor('th', 'auto')).toBe('iso');
    expect(notationFor('ru', 'iso')).toBe('iso');
    expect(notationFor('th', 'gost')).toBe('gost');
  });

  it('follows a stored choice and tells its listeners only when the notation in force changes', () => {
    const store = memory(), seen: string[] = [];
    onNotationChange((n) => seen.push(n));
    withLang('en');
    initNotation(store);
    expect(getNotation()).toBe('iso');
    setNotationPreference('iso', store);
    expect(seen).toEqual([]);
    setNotationPreference('gost', store);
    expect(getNotation()).toBe('gost');
    expect(store.getItem('orbitlab.notation')).toBe('gost');
    setNotationPreference('auto', store);
    withLang('ru');
    expect(seen).toEqual(['gost', 'iso', 'gost']);
    initNotation(store);
    expect(getNotation()).toBe('gost');
  });

  it('writes each standard\'s symbols', () => {
    expect(['rollRate', 'pitchRate', 'yawRate'].map((q) => symbolText(q as 'rollRate', 'iso'))).toEqual(['p', 'q', 'r']);
    expect(['rollRate', 'pitchRate', 'yawRate'].map((q) => symbolText(q as 'rollRate', 'gost'))).toEqual(['ωx', 'ωz', 'ωy']);
    expect(symbolText('pitchAngle', 'iso')).toBe('Θ');
    expect(symbolText('pitchAngle', 'gost')).toBe('ϑ');
    expect(symbolText('pathAngle', 'iso')).toBe('γ');
    expect(symbolText('pathAngle', 'gost')).toBe('θ');
    expect(symbolText('dynamicPressure', 'gost')).toBe('q');
    expect(withSymbol('Altitude (km)', 'altitude', 'iso')).toBe('Altitude h (km)');
    expect(withSymbol('Высота', 'altitude', 'gost')).toBe('Высота H');
  });

  it('relabels the simulator\'s body rates into each standard\'s axes and back', () => {
    // The simulator: x the nose, y the belly side, z the left.
    const omega = v3(0.1, 0.2, 0.3);
    expect(bodyRates(omega, 'iso')).toEqual({ roll: 0.1, pitch: -0.3, yaw: 0.2 });
    expect(bodyRates(omega, 'gost')).toEqual({ roll: 0.1, pitch: -0.3, yaw: -0.2 });
    for (const n of ['iso', 'gost'] as const) expect(simulatorRates(bodyRates(omega, n), n)).toEqual(omega);
    expect(Object.is(bodyRates(v3(), 'gost').yaw, -0)).toBe(false);
  });

  it('takes α in the plane of symmetry and β across it', () => {
    // The simulator's pair: α' in its x–z plane (across the flight path), β' in x–y.
    const inPlane = aeroAngles(0, 5 * DEG), across = aeroAngles(5 * DEG, 0);
    expect(inPlane.alpha / DEG).toBeCloseTo(5, 12); expect(inPlane.beta).toBeCloseTo(0, 12);
    expect(across.alpha).toBeCloseTo(0, 12); expect(across.beta / DEG).toBeCloseTo(-5, 12);
  });
});

describe('the standards\' axes on a flying Falcon 9', () => {
  const sim = new Simulation({ vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'), launchTime: LAUNCH_TIME,
    guidance: guidanceForVehicle(vehicleById('falcon9'), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, dynamics: { model: 'sixDof', wind: 'calm', seed: 20260919 } }, { headless: true });
  const samples: { t: number; iso: ReturnType<typeof bodyRates>; gost: ReturnType<typeof bodyRates>; right: number; top: number; alpha: number }[] = [];
  while (sim.state.t < 120) {
    sim.step(sim.suggestedDt());
    const r = sim.state.rigid!, up = normalize(sim.state.r), q = r.attitudeQ;
    const heading = normalize(cross(cross(up, sim.state.v), up));
    // ISO y (right) = −z of the simulator, ГОСТ y (top) = −y of the simulator.
    const isoY = quatRotate(q, v3(0, 0, -1)), gostY = quatRotate(q, v3(0, -1, 0));
    samples.push({ t: sim.state.t, iso: bodyRates(r.omegaBody, 'iso'), gost: bodyRates(r.omegaBody, 'gost'),
      right: dot(isoY, normalize(cross(heading, up))), top: dot(gostY, up), alpha: aeroAngles(r.angleOfAttack, r.sideslip).alpha });
  }

  it('reads the pitch-over as nose-down pitch in both standards', { timeout: 60_000 }, () => {
    const turn = samples.filter((s) => s.t > 10 && s.t < 60);
    const meanQ = turn.reduce((sum, s) => sum + s.iso.pitch, 0) / turn.length;
    const meanWz = turn.reduce((sum, s) => sum + s.gost.pitch, 0) / turn.length;
    expect(meanQ).toBeLessThan(-0.001);
    expect(meanWz).toBeCloseTo(meanQ, 12);
    // …and the out-of-plane rate (the guidance steering its heading) is the smaller one.
    expect(Math.abs(turn.reduce((sum, s) => sum + s.iso.yaw, 0) / turn.length)).toBeLessThan(0.5 * Math.abs(meanQ));
  });

  it('puts ISO y to the right of the flight path and ГОСТ y above it once the stack has pitched over', () => {
    const late = samples.filter((s) => s.t > 100);
    expect(Math.min(...late.map((s) => s.right))).toBeGreaterThan(0.95);
    expect(Math.min(...late.map((s) => s.top))).toBeGreaterThan(0.5);
  });

  it('flies the gravity turn at a small angle of attack', () => {
    const turn = samples.filter((s) => s.t > 30 && s.t < 90);
    expect(Math.max(...turn.map((s) => Math.abs(s.alpha)))).toBeLessThan(5 * DEG);
  });

  it('writes the CSV\'s rate and angle columns in the standard of the interface', () => {
    withLang('ru');
    const csv = buildTelemetryCsv(sim as unknown as Sim).split('\n')[0].split(',');
    expect(csv).toContain('gost_omega_z_rad_s');
    expect(csv).toContain('gost_alpha_rad');
    withLang('th');
    expect(buildTelemetryCsv(sim as unknown as Sim).split('\n')[0].split(',')).toContain('iso_q_rad_s');
  });
});
