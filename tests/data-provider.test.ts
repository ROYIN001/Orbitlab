/**
 * Offline and online data (roadmap S04), against fakes of `fetch`, as
 * tests/pwa.test.ts runs the service worker: the preference and its default,
 * the bundled snapshot read back, the online source parsed into the same
 * dataset, and every way online can fail falling back to the snapshot.
 */
import { describe, expect, it } from 'vitest';
import { DATA_MODE_KEY, DEFAULT_DATA_MODE, loadDataMode, saveDataMode, type DataModeStore } from '../src/provider/data-mode';
import {
  OfflineProvider, OnlineProvider, SNAPSHOT_FORMAT, createDataProvider, makeSnapshot, parseSnapshot, type Fetcher,
} from '../src/provider/data-provider';
import { DATASETS, DATA_HOSTS } from '../src/provider/datasets';
import { SWPC_F107_URL, SWPC_FORECAST_URL, SWPC_KP_URL, SWPC_MONTHLY_URL, parseSwpc, validSpaceWeather } from '../src/provider/space-weather';

const SNAPSHOT_FILE = import.meta.glob('../public/data/space-weather.json', { import: 'default', eager: true }) as Record<string, unknown>;
const bundled = Object.values(SNAPSHOT_FILE)[0];
const BASE = 'https://example.github.io/Orbitlab/';

/** SWPC's answers, as they come (2026-09-26): F10.7 three times a day, Kp every three hours. */
const F107 = [
  { time_tag: '2026-09-25T22:00:00', frequency: 2800, flux: 104.0, reporting_schedule: 'Afternoon' },
  { time_tag: '2026-09-25T20:00:00', frequency: 2800, flux: 105.0, reporting_schedule: 'Noon' },
  { time_tag: '2026-09-25T17:00:00', frequency: 2800, flux: 106.0, reporting_schedule: 'Morning' },
  { time_tag: '2026-09-24T20:00:00', frequency: 2800, flux: 112.0, reporting_schedule: 'Noon' },
];
const KP = [
  { time_tag: '2026-09-26T06:00:00', Kp: 2.0, a_running: 7, station_count: 8 },
  { time_tag: '2026-09-26T09:00:00', Kp: 2.67, a_running: 12, station_count: 8 },
];
/** R05: the solar-cycle products — monthly indices, −1 where SWPC has none, and the predicted cycle. */
const MONTHLY = [
  { 'time-tag': '1749-01', ssn: 96.7, smoothed_ssn: -1.0, 'f10.7': -1.0, 'smoothed_f10.7': -1.0 },
  { 'time-tag': '2026-08', ssn: 76.0, smoothed_ssn: -1.0, 'f10.7': 116.22, 'smoothed_f10.7': -1.0 },
  { 'time-tag': '2026-07', ssn: 97.5, smoothed_ssn: -1.0, 'f10.7': 136.01, 'smoothed_f10.7': -1.0 },
];
const FORECAST = [
  { 'time-tag': '2026-10', 'predicted_f10.7': 131.4, 'high_f10.7': 140.0, 'low_f10.7': 124.3, 'high25_f10.7': 136.0, 'low25_f10.7': 127.9 },
  { 'time-tag': '2026-11', 'predicted_f10.7': 129.8, 'high_f10.7': 138.9, 'low_f10.7': 122.4, 'high25_f10.7': 135.0, 'low25_f10.7': 126.1 },
];
const SWPC = { [SWPC_F107_URL]: F107, [SWPC_KP_URL]: KP, [SWPC_MONTHLY_URL]: MONTHLY, [SWPC_FORECAST_URL]: FORECAST };

function memory(entries: Record<string, string> = {}): DataModeStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(entries));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); } };
}

/** A fake network: answers by URL; `null` refuses the connection; `'hang'` never answers. */
function fakeFetch(answers: Record<string, unknown>): Fetcher & { asked: string[] } {
  const asked: string[] = [];
  const f = (async (url: string, init: { signal: AbortSignal }) => {
    asked.push(url);
    const a = answers[url];
    if (a === undefined) return { ok: false, status: 404, json: async () => ({}) };
    if (a === null) throw new TypeError('Failed to fetch');
    if (a === 'hang') return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)));
    if (a instanceof Response) return a;
    return { ok: true, status: 200, json: async () => structuredClone(a) };
  }) as Fetcher & { asked: string[] };
  f.asked = asked;
  return f;
}

const SNAP_URL = new URL(DATASETS.spaceWeather.snapshot, BASE).href;

describe('the data mode (S04)', () => {
  it('is offline unless the user chose online, and survives denied storage', () => {
    expect(DEFAULT_DATA_MODE).toBe('offline');
    expect(loadDataMode(memory())).toBe('offline');
    const store = memory({ 'orbitlab.lang': 'th' });
    saveDataMode('online', store);
    expect(loadDataMode(store)).toBe('online');
    expect(store.data.get(DATA_MODE_KEY)).toBe('online');
    expect(store.data.get('orbitlab.lang')).toBe('th');
    expect(loadDataMode(memory({ [DATA_MODE_KEY]: 'sometimes' }))).toBe('offline');
    const denied: DataModeStore = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(loadDataMode(denied)).toBe('offline');
    expect(() => saveDataMode('online', denied)).not.toThrow();
  });
});

describe('the bundled snapshot (S04)', () => {
  it('is a dated space-weather snapshot the offline provider can read', () => {
    const snap = parseSnapshot(bundled, 'spaceWeather');
    expect(snap.format).toBe(SNAPSHOT_FORMAT);
    expect(Date.parse(snap.asOf)).toBeLessThanOrEqual(Date.parse(snap.fetched));
    expect(snap.data.f107.length).toBeGreaterThanOrEqual(20);
    expect(snap.data.kp.length).toBeGreaterThanOrEqual(8);
    // R05: SWPC's monthly flux from 2004-10, and its forecast past the newest month
    expect(snap.data.monthly[0].month).toBe('2004-10');
    expect(snap.data.forecast.at(-1)!.month > snap.data.monthly.at(-1)!.month).toBe(true);
    for (const f of snap.data.forecast) expect(f.low <= f.f107 && f.f107 <= f.high, f.month).toBe(true);
    expect(snap.source.url).toMatch(/^https:\/\//);
    // the "as of" is its newest reading
    expect(snap.asOf).toBe(new Date(Math.max(Date.parse(snap.data.kp.at(-1)!.time), Date.parse(`${snap.data.f107.at(-1)!.date}T20:00:00Z`))).toISOString());
  });

  it('refuses a file that is not one', () => {
    const snap = structuredClone(bundled) as Record<string, any>;
    expect(() => parseSnapshot({ ...snap, format: 'other' }, 'spaceWeather')).toThrow('not a snapshot');
    expect(() => parseSnapshot({ ...snap, version: 2 }, 'spaceWeather')).toThrow('snapshot version 2');
    expect(() => parseSnapshot({ ...snap, asOf: 'yesterday' }, 'spaceWeather')).toThrow('dates');
    expect(() => parseSnapshot({ ...snap, data: { ...snap.data, f107: [{ date: '2026-09-25', flux: NaN }] } }, 'spaceWeather')).toThrow('malformed');
    // one from before R05, without the monthly flux and the forecast
    expect(() => parseSnapshot({ ...snap, data: { f107: snap.data.f107, kp: snap.data.kp } }, 'spaceWeather')).toThrow('malformed');
  });
});

describe('space weather from SWPC (S04)', () => {
  it('keeps the noon F10.7 of each day and every Kp, oldest first, dated by the newest', () => {
    const { data, asOf } = parseSwpc(F107, KP, MONTHLY, FORECAST);
    expect(data.f107).toEqual([{ date: '2026-09-24', flux: 112 }, { date: '2026-09-25', flux: 105 }]);
    expect(data.kp).toEqual([{ time: '2026-09-26T06:00:00.000Z', kp: 2 }, { time: '2026-09-26T09:00:00.000Z', kp: 2.67 }]);
    expect(asOf).toBe('2026-09-26T09:00:00.000Z');
    expect(validSpaceWeather(data)).toBe(true);
  });

  it('keeps the months with a flux, sorted, and the forecast with its range (R05)', () => {
    const { data } = parseSwpc(F107, KP, MONTHLY, FORECAST);
    expect(data.monthly).toEqual([{ month: '2026-07', f107: 136.01 }, { month: '2026-08', f107: 116.22 }]);
    expect(data.forecast).toEqual([
      { month: '2026-10', f107: 131.4, high: 140, low: 124.3 },
      { month: '2026-11', f107: 129.8, high: 138.9, low: 122.4 },
    ]);
  });

  it('reads SWPC\'s older table layout too, and throws on anything else', () => {
    const table = [['time_tag', 'Kp', 'a_running'], ['2026-09-26 09:00:00.000', '2.67', '12']];
    expect(parseSwpc(F107, table, MONTHLY, FORECAST).data.kp).toEqual([{ time: '2026-09-26T09:00:00.000Z', kp: 2.67 }]);
    expect(() => parseSwpc({ error: 'maintenance' }, KP, MONTHLY, FORECAST)).toThrow();
    expect(() => parseSwpc([], KP, MONTHLY, FORECAST)).toThrow('no readings');
    expect(() => parseSwpc(F107, [{ time_tag: 'soon', Kp: 3 }], MONTHLY, FORECAST)).toThrow('no readings');
    expect(() => parseSwpc(F107, KP, MONTHLY.slice(0, 1), FORECAST)).toThrow('no readings');
    expect(() => parseSwpc(F107, KP, MONTHLY, [{ 'time-tag': '2026-10', 'predicted_f10.7': 131 }])).toThrow('no readings');
  });
});

describe('the providers (S04)', () => {
  it('offline: reads the bundled snapshot and nothing else', async () => {
    const net = fakeFetch({ [SNAP_URL]: bundled });
    const set = await new OfflineProvider(BASE, net).load('spaceWeather');
    expect(set.from).toBe('snapshot');
    expect(set.asOf).toBe((bundled as { asOf: string }).asOf);
    expect(net.asked).toEqual([SNAP_URL]);
    expect(createDataProvider('offline', BASE, net).mode).toBe('offline');
  });

  it('online: reads the sources, into the same dataset the snapshot holds', async () => {
    const net = fakeFetch({ [SNAP_URL]: bundled, ...SWPC });
    const provider = createDataProvider('online', BASE, net);
    expect(provider.mode).toBe('online');
    const set = await provider.load('spaceWeather');
    expect(set).toMatchObject({ from: 'online', asOf: '2026-09-26T09:00:00.000Z' });
    expect(set.fallback).toBeUndefined();
    expect(set.data.f107.at(-1)).toEqual({ date: '2026-09-25', flux: 105 });
    expect(net.asked.sort()).toEqual(Object.keys(SWPC).sort());
  });

  it('online: falls back to the snapshot on every failure, and says why', async () => {
    const cases: [string, Record<string, unknown>, RegExp][] = [
      ['no network', { ...SWPC, [SWPC_F107_URL]: null }, /Failed to fetch/],
      ['a refusal', { ...SWPC, [SWPC_F107_URL]: undefined }, /services\.swpc\.noaa\.gov answered 404/],
      ['a changed format', { ...SWPC, [SWPC_F107_URL]: { error: 'down' } }, /not a list/],
      ['a slow source', { ...SWPC, [SWPC_F107_URL]: 'hang' }, /no answer within 0\.05 s/],
    ];
    for (const [what, answers, why] of cases) {
      const net = fakeFetch({ [SNAP_URL]: bundled, ...answers });
      const offline = new OfflineProvider(BASE, net);
      const set = await new OnlineProvider(offline, net, 50).load('spaceWeather');
      expect(set.from, what).toBe('snapshot');
      expect(set.fallback, what).toMatch(why);
      expect(set.asOf, what).toBe((bundled as { asOf: string }).asOf);
    }
  });

  it('online: stops when the caller does, without falling back', async () => {
    const net = fakeFetch({ [SNAP_URL]: bundled, ...Object.fromEntries(Object.keys(SWPC).map((u) => [u, 'hang'])) });
    const ctl = new AbortController();
    const pending = new OnlineProvider(new OfflineProvider(BASE, net), net, 10_000).load('spaceWeather', ctl.signal);
    ctl.abort(new Error('closed'));
    await expect(pending).rejects.toThrow('closed');
    expect(net.asked).not.toContain(SNAP_URL);
  });

  it('writes the snapshot the offline provider reads', () => {
    const { data, asOf } = parseSwpc(F107, KP, MONTHLY, FORECAST);
    const snap = makeSnapshot('spaceWeather', data, asOf, new Date('2026-09-26T13:00:00Z'));
    expect(parseSnapshot(JSON.parse(JSON.stringify(snap)), 'spaceWeather')).toEqual(snap);
  });

  it('names the hosts online mode reaches, for the service worker and the window', () => {
    expect(DATA_HOSTS).toEqual(['services.swpc.noaa.gov', 'celestrak.org']);
  });
});
