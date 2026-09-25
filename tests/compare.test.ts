/** Comparing two flights (roadmap U02): the reference kept of a flight, its file, its path and the table. */
import { describe, expect, it } from 'vitest';
import {
  REFERENCE_PATH_POINTS, REFERENCE_SAMPLES, alignTrajectory, compareFlights, flightFileName, flightFileText,
  parseFlightFile, referenceFromFlight, referenceWindow, type ReferenceFlight,
} from '../src/replay/reference';
import { missionDocument, type MissionState } from '../src/config/mission-file';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE } from '../src/physics/defaults';
import { gmst } from '../src/physics/orbital';
import { referenceSeries, REFERENCE_DASH } from '../src/ui/telemetry-charts';
import type { TelemetrySample } from '../src/physics/sim/types';
import type { SimEvent } from '../src/physics/simulation';

const MISSION: MissionState = {
  vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbitId: 'starlink', orbit: { ...orbitById('starlink') },
  launchTime: new Date('2026-10-01T13:37:00Z'), guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMass: 5000,
};

function telemetry(n: number, scale = 1): TelemetrySample[] {
  return Array.from({ length: n }, (_, i) => {
    const t = -10 + i * 0.1;
    return {
      t, alt: Math.max(0, t) * 60, vInertial: 400 + Math.max(0, t) * 12 * scale, vAir: 0, q: t > 0 && t < 160 ? 30000 * scale * Math.sin((t / 160) * Math.PI) : 0,
      mach: 0, gLoad: 1 + Math.max(0, t) / 300, mass: 5e5, thrust: 0, throttle: 1, pitch: 90, ap: t > 500 ? 550e3 * scale : 0, pe: t > 500 ? 540e3 * scale : -6.4e6,
      inc: 53, dvRemaining: 9000 - Math.max(0, t) * scale, downrange: 0, lat: 0, lon: 0, stage: 0, phase: 'ascent',
    };
  });
}

const EVENTS: SimEvent[] = [
  { t: 0, key: 'evt.liftoff', severity: 'info' },
  { t: 72, key: 'evt.maxQ', severity: 'info' },
  { t: 150, key: 'evt.meco', severity: 'info' },
  { t: 520, key: 'evt.targetOrbit', severity: 'success' },
];

function reference(n = 20000, scale = 1): ReferenceFlight {
  const tel = telemetry(n, scale);
  return referenceFromFlight({
    label: 'Falcon 9 · PEG', mission: missionDocument(MISSION), launchJd: 2461315.07,
    telemetry: tel, events: EVENTS,
    path: tel.map((s) => ({ t: s.t, r: { x: 6.4e6 + s.alt, y: s.t * 1000, z: 1e5 } })),
  });
}

describe('reference flight (U02)', () => {
  it('keeps a decimated copy of the telemetry, the events and the path', () => {
    const ref = reference();
    expect(ref.telemetry.length).toBeLessThanOrEqual(REFERENCE_SAMPLES + 1);
    expect(ref.path.t.length).toBeLessThanOrEqual(REFERENCE_PATH_POINTS + 1);
    expect(ref.telemetry[0].t).toBe(-10);
    expect(ref.telemetry[ref.telemetry.length - 1].t).toBeCloseTo(-10 + 19999 * 0.1, 3);
    expect(ref.events).toEqual(EVENTS);
    expect(Object.keys(ref.telemetry[0]).sort()).toEqual(['alt', 'ap', 'downrange', 'dvRemaining', 'gLoad', 'inc', 'mass', 'pe', 'pitch', 'q', 't', 'vAir', 'vInertial']);
  });

  it('saves to a file and reads it back, gaps included', () => {
    const ref = reference(2000);
    ref.telemetry[5].ap = NaN;
    const back = parseFlightFile(flightFileText(ref));
    expect(back).not.toBeNull();
    expect(back!.telemetry[5].ap).toBeNaN();
    expect(back!.telemetry[6]).toEqual(ref.telemetry[6]);
    expect(back!.path).toEqual(ref.path);
    expect(back!.mission).toEqual(ref.mission);
    expect(flightFileName(ref)).toBe('falcon9-cape-2026-10-01-13-37.orbitlab-flight.json');
  });

  it('refuses what is not a saved flight', () => {
    const ok = JSON.parse(flightFileText(reference(100)));
    const bad = [
      'not json', '{}', JSON.stringify({ ...ok, format: 'orbitlab.mission' }),
      JSON.stringify({ ...ok, flight: { ...ok.flight, telemetry: [{ t: 'x' }] } }),
      JSON.stringify({ ...ok, flight: { ...ok.flight, path: { ...ok.flight.path, x: [1] } } }),
      JSON.stringify({ ...ok, flight: { ...ok.flight, mission: { format: 'other' } } }),
    ];
    for (const text of bad) expect(parseFlightFile(text), text.slice(0, 40)).toBeNull();
  });

  it('turns its path to the launch on screen: same ground, any day', () => {
    const ref = reference(100);
    // same launch instant: unchanged
    const same = alignTrajectory(ref, ref.launchJd);
    expect(same[10].x).toBeCloseTo(ref.path.x[10], 3);
    // a launch a quarter of a sidereal turn later: the path turns with the Earth
    const later = ref.launchJd + 0.25 * 0.99726957;
    const turned = alignTrajectory(ref, later);
    const d = gmst(later) - gmst(ref.launchJd);
    const i = 50;
    expect(Math.hypot(turned[i].x, turned[i].y)).toBeCloseTo(Math.hypot(ref.path.x[i], ref.path.y[i]), 3);
    expect(turned[i].z).toBe(ref.path.z[i]);
    expect(Math.atan2(turned[i].y, turned[i].x) - Math.atan2(ref.path.y[i], ref.path.x[i])).toBeCloseTo(d, 6);
    expect(Math.abs(d)).toBeCloseTo(Math.PI / 2, 2);
  });

  it('tabulates what both flights have, with the difference to take', () => {
    const rows = compareFlights({ telemetry: telemetry(8000, 1.1), events: EVENTS }, reference(8000));
    const row = (key: string) => rows.find((r) => r.key === key)!;
    expect(row('insertion')).toMatchObject({ current: 520, reference: 520, unit: 's' });
    expect(row('maxQ').current! / row('maxQ').reference!).toBeCloseTo(1.1, 3);
    expect(row('perigee')).toMatchObject({ unit: 'km' });
    expect(row('perigee').current! - row('perigee').reference!).toBeCloseTo(54, 3);
    expect(row('event:evt.meco')).toMatchObject({ current: 150, reference: 150 });
    // an event neither flew is left out
    expect(rows.some((r) => r.key === 'event:evt.fairingSep')).toBe(false);
  });

  it('draws the reference inside a chart window, dashed, in the flight’s own colours', () => {
    const ref = reference(8000);
    const rows = referenceWindow(ref.telemetry, 0, 100);
    expect(rows[0].t).toBeGreaterThanOrEqual(0);
    expect(rows[rows.length - 1].t).toBeLessThanOrEqual(100);
    const series = referenceSeries('velocity', rows, [{ x: [], y: [], color: '#8be5cd' }, { x: [], y: [], color: '#96a3b4' }]);
    expect(series).toHaveLength(2);
    expect(series.map((s) => s.color)).toEqual(['#8be5cd', '#96a3b4']);
    expect(series.every((s) => s.dash === REFERENCE_DASH)).toBe(true);
    expect(series[0].label).toBeTruthy();
    expect(series[1].label).toBeUndefined();
  });
});

describe('comparison table formatting (U02)', () => {
  it('shows a difference that rounds to nothing as a plain zero', async () => {
    const g = globalThis as { document?: unknown };
    if (!g.document) g.document = { documentElement: {} };
    const { formatFigure } = await import('../src/ui/compare');
    expect(formatFigure(-0.001, 'g', true)).toBe('0.00 g');
    expect(formatFigure(0.04, 's', true)).toBe('0.0 s');
    expect(formatFigure(7, 'm/s', true)).toBe('+7 m/s');
    expect(formatFigure(-2.26, 'km', true)).toBe('-2.3 km');
    expect(formatFigure(null, 'km')).toBe('—');
  });
});
