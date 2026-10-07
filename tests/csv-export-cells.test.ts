/**
 * M-LAUNCH-034 (FX-5), D-45: the app's CSV exports write a text cell so a
 * spreadsheet opens it as the same text — a cell holding a carriage return is
 * quoted (a spreadsheet reads a bare `\r` as the end of a row), and a text
 * cell starting with = + - or @ gets a leading ' so it is not run as a
 * formula. Numeric cells are written as they were, a minus sign and all.
 * The lesson re-check CSV already wrote its cells this way
 * (`tests/recheck-core.test.ts`); here the Monte Carlo and flight-data CSVs.
 * The Monte Carlo download also goes through the app's shared `downloadBlob`,
 * which keeps the file's URL for 5 s instead of revoking it after 1 s.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { monteCarloCsv, type MonteCarloRun } from '../src/physics/monte-carlo';
import type { MonteCarloJob } from '../src/physics/monte-carlo-job';
import { DEFAULT_DISPERSIONS } from '../src/physics/dispersion';
import { buildTelemetryCsv } from '../src/ui/csv';
import { MonteCarloWindow } from '../src/ui/monte-carlo';
import type { Simulation } from '../src/physics/simulation';
import type { RigidTelemetry } from '../src/physics/rigid/telemetry';

/** RFC 4180, read independently of the writers: quoted cells may hold , " \r and \n. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const lost = (index: number, reason: string): MonteCarloRun =>
  ({ index, law: 'peg', outcome: 'lost', reason, onTarget: false, maxQkPa: NaN, maxQAlpha: NaN, z: [], ms: 0 });

describe('the Monte Carlo CSV (M-LAUNCH-034, D-45)', () => {
  const reasons = ['=cmd|\' /C calc\'!A0', '+1', '-1', '@SUM(A1)', 'lost\rhere', '=a,b', 'evt.aeroBreakup', 'error: a, b'];
  const csv = monteCarloCsv([
    ...reasons.map((reason, i) => lost(i, reason)),
    { index: 9, law: 'peg', outcome: 'short', onTarget: false, cutoff: { perigeeKm: -5, apogeeKm: 120.25, inclinationDeg: 51.6, dvLeft: 0, t: 300 },
      maxQkPa: 31, maxQAlpha: -2.5, z: [], ms: 1 },
  ], [], DEFAULT_DISPERSIONS);
  const lines = csv.split('\n');
  const empty = ','.repeat(12); // the cut-off and final orbits and the two max-q columns of a run that left none

  it('keeps a reason starting with = + - or @ as text: a leading \' and nothing else', () => {
    expect(lines[1]).toBe(`0,peg,lost,'=cmd|' /C calc'!A0,0${empty}`);
    expect(lines[2]).toBe(`1,peg,lost,'+1,0${empty}`);
    expect(lines[3]).toBe(`2,peg,lost,'-1,0${empty}`);
    expect(lines[4]).toBe(`3,peg,lost,'@SUM(A1),0${empty}`);
    expect(lines[6]).toBe(`5,peg,lost,"'=a,b",0${empty}`);
  });

  it('quotes a reason holding a carriage return, so the row stays one row', () => {
    expect(lines[5]).toBe(`4,peg,lost,"lost\rhere",0${empty}`);
    expect(parseCsv(csv)[5][3]).toBe('lost\rhere');
  });

  it('leaves every other cell as it was: plain reasons, quoted commas, negative numbers', () => {
    expect(lines[7]).toBe(`6,peg,lost,evt.aeroBreakup,0${empty}`);
    expect(lines[8]).toBe(`7,peg,lost,"error: a, b",0${empty}`);
    expect(lines[9]).toBe('9,peg,short,,0,-5.000,120.250,51.6000,0.0,300.0,,,,,,31.00,-2.5');
    expect(lines[10]).toBe('');
    expect(lines).toHaveLength(11);
  });
});

describe('the flight-data CSV (M-LAUNCH-034, D-45)', () => {
  const rigid = (over: Partial<RigidTelemetry>): RigidTelemetry => ({
    modelVersion: 'sixdof-1', attitudeQ: { w: 1, x: 0, y: 0, z: 0 }, omegaBody: { x: -0.25, y: 0, z: 0 }, cgBody: { x: 20, y: 0, z: 0 },
    inertiaBody: [1, 0, 0, 0, 2, 0, 0, 0, 2], renderOffsetBody: { x: -20, y: 0, z: 0 }, controlMode: 'auto', engineDeflections: {},
    rcsPropellantKg: 0, saturated: false, angleOfAttack: 0, sideslip: 0, aeroWithinEnvelope: true, windECI: { x: -5, y: 0, z: 0 }, rawQuaternionNormError: 0,
    ...over,
  });
  const sample = { t: 0, alt: 0, vInertial: 0, vAir: 0, q: 0, mach: 0, gLoad: 1, mass: 1, thrust: 0, throttle: 0, pitch: 90, ap: 0, pe: -5, inc: 0,
    dvRemaining: 0, downrange: 0, lat: 0, lon: 0, stage: 1, phase: 'ascent' };
  const table = (over: Partial<RigidTelemetry>) => {
    const [head, row] = parseCsv(buildTelemetryCsv({ telemetry: [{ ...sample, rigid: rigid(over) }], events: [] } as unknown as Simulation));
    return (name: string) => row[head.indexOf(name)];
  };

  it('keeps a text cell starting with = + - or @ as text', () => {
    const at = table({ bodyId: '=cmd', configurationId: '@a|b', dataRevision: '-rev', modelVersion: '+v' });
    expect(at('body_id')).toBe("'=cmd");
    expect(at('configuration_id')).toBe("'@a|b");
    expect(at('rigid_data_revision')).toBe("'-rev");
    expect(at('rigid_model_version')).toBe("'+v");
  });

  it('leaves numeric cells and other text as they were', () => {
    const at = table({ bodyId: 'vehicle', configurationId: 's1|s2' });
    expect(at('body_id')).toBe('vehicle');
    expect(at('configuration_id')).toBe('s1|s2');
    expect(at('wind_eci_x_ms')).toBe('-5');
    expect(at('omega_body_x_rad_s')).toBe('-0.250000000000');
    expect(at('periapsis_m')).toBe('-5');
    expect(at('control_mode')).toBe('auto');
  });
});

describe('the Monte Carlo CSV download (M-LAUNCH-034)', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('keeps the file\'s URL for 5 s, as every other download in the app', async () => {
    vi.useFakeTimers();
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mc');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchor = { href: '', download: '', click: vi.fn() };
    vi.stubGlobal('document', { createElement: vi.fn(() => anchor) });
    const win = Object.create(MonteCarloWindow.prototype) as MonteCarloWindow;
    win.job = { csv: () => 'run\n0\n', cfg: { vehicleId: 'falcon9', orbit: { id: 'leo' } }, mc: { seed: 7 } } as unknown as MonteCarloJob;
    (win as unknown as { downloadCsv(): void }).downloadCsv();
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.download).toBe('orbitlab_montecarlo_falcon9_leo_seed7.csv');
    expect(await (create.mock.calls[0][0] as Blob).text()).toBe('run\n0\n');
    vi.advanceTimersByTime(4999);
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revoke).toHaveBeenCalledWith('blob:mc');
  });
});
