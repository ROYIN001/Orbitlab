/**
 * The satellite catalogue as a dataset (roadmap R02): the bundled snapshot
 * (public/data/satellites.json, CelesTrak's answers of 2026-09-26), the parser
 * the online provider and the snapshot script share, CelesTrak asked at most
 * once in two hours, and the real satellites in it where their published
 * orbits put them.
 */
import { describe, expect, it } from 'vitest';
import { CacheStorageRecent, MemoryRecent, OfflineProvider, OnlineProvider, parseSnapshot, type Fetcher, type RecentCaches } from '../src/provider/data-provider';
import { DATASETS } from '../src/provider/datasets';
import {
  SATELLITES_MIN_INTERVAL_MS, SATELLITE_URLS, SAT_GROUPS, THAI_NORAD_IDS, parseCelestrakGp, validOmm, type OmmRecord,
} from '../src/provider/satellites';
import { elementsFromRecord } from '../src/orbit/omm';
import { skyFacts, skyObjects, skyState } from '../src/orbit/real-sky';
import { THAI_SATELLITES } from '../src/data/thai-satellites';

const SNAPSHOT_FILE = import.meta.glob('../public/data/satellites.json', { import: 'default', eager: true }) as Record<string, unknown>;
const bundled = Object.values(SNAPSHOT_FILE)[0];
const BASE = 'https://example.github.io/Orbitlab/';
const SNAP_URL = new URL(DATASETS.satellites.snapshot, BASE).href;
const snap = parseSnapshot(bundled, 'satellites');
const group = (id: string) => snap.data.groups.find((g) => g.id === id)!.sets;

describe('the bundled catalogue (R02)', () => {
  it('holds every group, in order, dated by its newest element set', () => {
    expect(snap.data.groups.map((g) => g.id)).toEqual(SAT_GROUPS.map((g) => g.id));
    for (const g of snap.data.groups) expect(g.sets.length, g.id).toBeGreaterThan(0);
    const newest = Math.max(...snap.data.groups.flatMap((g) => g.sets.map((s) => Date.parse(`${s.EPOCH}Z`))));
    expect(snap.asOf).toBe(new Date(newest).toISOString());
    expect(Date.parse(snap.fetched)).toBeGreaterThanOrEqual(Date.parse(snap.asOf));
    expect(snap.source.url).toMatch(/^https:\/\/celestrak\.org\//);
  });

  it('has Thailand\'s seven satellites in orbit, and each of O04\'s catalogue entries that is up', () => {
    expect(group('thai').map((s) => s.NORAD_CAT_ID).sort()).toEqual([...THAI_NORAD_IDS].sort());
    for (const s of THAI_SATELLITES.filter((x) => !x.reentered)) expect(THAI_NORAD_IDS, s.name).toContain(s.norad);
  });

  it('keeps the debris group to Fengyun-1C\'s fragments, from its 1999 launch', () => {
    for (const s of group('debris')) {
      expect(s.OBJECT_NAME).toMatch(/^FENGYUN 1C/);
      expect(s.OBJECT_ID).toMatch(/^1999-025/);
    }
  });

  it('puts its satellites where their published orbits are (SGP4 at each set\'s epoch)', () => {
    const at = (norad: number) => {
      const rec = snap.data.groups.flatMap((g) => g.sets).find((s) => s.NORAD_CAT_ID === norad)!;
      const o = skyObjects([elementsFromRecord(rec)], 'thai')[0];
      const s = skyState(o, o.el.jdEpoch + o.el.jdEpochFrac);
      if (s.error !== 0) throw new Error(`error ${s.error}`);
      return { s, f: skyFacts(o) };
    };
    // the ISS: 51.6°, about 420 km (NASA)
    const iss = at(25544);
    expect(iss.f.inclination * 180 / Math.PI).toBeCloseTo(51.6, 0);
    expect(iss.s.alt).toBeGreaterThan(380e3);
    expect(iss.s.alt).toBeLessThan(440e3);
    // Thaicom 8 over its slot, 78.5° E (Thaicom), and geostationary
    const tc8 = at(41552);
    expect(Math.abs(tc8.s.lon * 180 / Math.PI - 78.5)).toBeLessThan(0.2);
    expect(Math.abs(tc8.s.lat * 180 / Math.PI)).toBeLessThan(0.2);
    expect(tc8.f.deepSpace).toBe(true);
    // THEOS-2: sun-synchronous at 621 km, 97.9° (eoPortal, O04)
    const t2 = at(58016);
    expect(t2.f.inclination * 180 / Math.PI).toBeCloseTo(97.9, 0);
    expect((t2.f.perigeeAlt + t2.f.apogeeAlt) / 2 / 1000).toBeGreaterThan(610);
    expect((t2.f.perigeeAlt + t2.f.apogeeAlt) / 2 / 1000).toBeLessThan(635);
    // every GPS satellite goes round twice a sidereal day
    const gps = group('gnss').filter((s) => /^GPS /.test(s.OBJECT_NAME));
    expect(gps.length).toBeGreaterThan(20);
    for (const rec of gps) {
      const f = skyFacts(skyObjects([elementsFromRecord(rec)], 'gnss')[0]);
      expect(Math.abs(f.period - 86164.1 / 2), rec.OBJECT_NAME).toBeLessThan(120);
    }
  });
});

/** CelesTrak's answers, one set each (the groups' queries in order). */
const REC = (norad: number, name = `SAT ${norad}`): OmmRecord => ({
  OBJECT_NAME: name, OBJECT_ID: '2000-001A', EPOCH: '2026-09-26T09:35:46.493952', MEAN_MOTION: 15.5, ECCENTRICITY: 0.0007,
  INCLINATION: 51.6, RA_OF_ASC_NODE: 159.2, ARG_OF_PERICENTER: 184.2, MEAN_ANOMALY: 175.9, EPHEMERIS_TYPE: 0,
  CLASSIFICATION_TYPE: 'U', NORAD_CAT_ID: norad, ELEMENT_SET_NO: 999, REV_AT_EPOCH: 58744, BSTAR: 0.00059, MEAN_MOTION_DOT: 0.0003,
  MEAN_MOTION_DDOT: 0,
});
const answersFor = (): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  let k = 0;
  for (const g of SAT_GROUPS) {
    for (const q of g.queries) {
      const url = SATELLITE_URLS[k++];
      // the Thai name queries also find satellites that are not in the list
      out[url] = g.id === 'thai' ? [REC(58016), REC(22931, `other ${q}`)] : [REC(1000 + k), REC(1000 + k)];
    }
  }
  return out;
};

function fakeFetch(answers: Record<string, unknown>): Fetcher & { asked: string[] } {
  const asked: string[] = [];
  const f = (async (url: string) => {
    asked.push(url);
    const a = answers[url];
    if (a === undefined) return { ok: false, status: 404, json: async () => ({}) };
    if (typeof a === 'number') return { ok: false, status: a, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => structuredClone(a) };
  }) as unknown as Fetcher & { asked: string[] };
  f.asked = asked;
  return f;
}

describe('the catalogue from CelesTrak\'s answers', () => {
  it('keeps each group\'s sets once, sorted, Thailand\'s by number only', () => {
    const answers = answersFor();
    const { data } = parseCelestrakGp(SATELLITE_URLS.map((u) => answers[u]));
    expect(data.groups.find((g) => g.id === 'thai')!.sets.map((s) => s.NORAD_CAT_ID)).toEqual([58016]);
    expect(data.groups.find((g) => g.id === 'stations')!.sets).toHaveLength(1);
    expect(DATASETS.satellites.valid(data)).toBe(true);
  });

  it('throws — so online falls back — on anything but lists of element sets, or on an empty group', () => {
    const answers = SATELLITE_URLS.map((u) => answersFor()[u]);
    expect(() => parseCelestrakGp(answers.slice(1))).toThrow('answers');
    expect(() => parseCelestrakGp(answers.map((a, k) => (k === 0 ? 'No GP data found' : a)))).toThrow('stations: not a list');
    expect(() => parseCelestrakGp(answers.map((a, k) => (k === 0 ? [] : a)))).toThrow('stations: no element sets');
    expect(() => parseCelestrakGp(answers.map((a, k) => (k === 0 ? [{ ...REC(1), MEAN_MOTION: 'x' }] : a)))).toThrow('keywords');
    expect(validOmm({ ...REC(1), ECCENTRICITY: 1 })).toBe(false);
    expect(validOmm({ ...REC(1), EPOCH: '2026-09-26' })).toBe(false);
  });
});

describe('CelesTrak asked at most once in two hours (R02)', () => {
  it('uses the answers of less than two hours ago, and says when they were fetched', async () => {
    let now = Date.parse('2026-09-26T12:00:00Z');
    const net = fakeFetch({ ...answersFor(), [SNAP_URL]: bundled });
    const recent = new MemoryRecent();
    const provider = new OnlineProvider(new OfflineProvider(BASE, net), net, 1000, recent, () => now);
    const first = await provider.load('satellites');
    expect(first.from).toBe('online');
    expect(first.fetched).toBeUndefined();
    expect(net.asked).toHaveLength(SATELLITE_URLS.length);
    now += SATELLITES_MIN_INTERVAL_MS - 60_000;
    const again = await provider.load('satellites');
    expect(net.asked).toHaveLength(SATELLITE_URLS.length);
    expect(again.from).toBe('online');
    expect(again.fetched).toBe('2026-09-26T12:00:00.000Z');
    expect(again.data).toEqual(first.data);
    now += 120_000;
    await provider.load('satellites');
    expect(net.asked).toHaveLength(2 * SATELLITE_URLS.length);
    // space weather has no such rule: asked every time
    expect(DATASETS.spaceWeather.minIntervalMs).toBeUndefined();
  });

  it('does not ask again after a refusal, and falls back to the snapshot saying why', async () => {
    let now = Date.parse('2026-09-26T12:00:00Z');
    const answers = { ...answersFor(), [SATELLITE_URLS[0]]: 403, [SNAP_URL]: bundled };
    const net = fakeFetch(answers);
    const provider = new OnlineProvider(new OfflineProvider(BASE, net), net, 1000, new MemoryRecent(), () => now);
    const first = await provider.load('satellites');
    expect(first.from).toBe('snapshot');
    expect(first.fallback).toMatch(/celestrak\.org answered 403/);
    const asked = net.asked.filter((u) => u === SATELLITE_URLS[0]).length;
    now += 3600_000;
    const second = await provider.load('satellites');
    expect(net.asked.filter((u) => u === SATELLITE_URLS[0]).length).toBe(asked);
    expect(second.fallback).toMatch(/not asked again before 2026-09-26T14:00:00\.000Z/);
  });

  it('keeps the answers across reloads in the browser\'s Cache Storage, and in memory without one', async () => {
    const store = new Map<string, string>();
    const caches: RecentCaches = {
      open: async () => ({
        match: async (url: string) => (store.has(url) ? { json: async () => JSON.parse(store.get(url)!) } : undefined),
        put: async (url: string, res: Response) => { store.set(url, await res.text()); },
      }),
    };
    await new CacheStorageRecent(caches).put('https://celestrak.org/x', { at: 5, body: [1, 2] });
    expect(await new CacheStorageRecent(caches).get('https://celestrak.org/x')).toEqual({ at: 5, body: [1, 2], status: undefined });
    const none = new CacheStorageRecent(null);
    await none.put('u', { at: 1, status: 403 });
    expect(await none.get('u')).toEqual({ at: 1, status: 403 });
    const broken = new CacheStorageRecent({ open: async () => { throw new Error('denied'); } });
    await broken.put('u', { at: 2, body: 'kept' });
    expect(await broken.get('u')).toEqual({ at: 2, body: 'kept' });
  });
});
