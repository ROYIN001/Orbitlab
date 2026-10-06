/**
 * ResultSlot (audit 2026-09-27 A4, A5, A14, A15): a result is shown with the
 * inputs that produced it, marked stale when the controls have moved on, and
 * an answer to an earlier run never replaces a later one.
 */
import { describe, expect, it } from 'vitest';
import { changedKeys, deepEqual, frozenCopy, Latest, positiveNumber, ResultSlot } from '../src/ui/result-slot';
import { RealSky } from '../src/ui/orbit/sky-panel';
import { parseSnapshot, type Dataset, type DataProvider } from '../src/provider/data-provider';
import type { DatasetId, DatasetTypes } from '../src/provider/datasets';
import type { SatelliteCatalog } from '../src/provider/satellites';
import { skyObjects } from '../src/orbit/real-sky';
import { elementsFromRecord } from '../src/orbit/omm';
import { stationOf } from '../src/orbit/applications-setup';
import { predictFromRequest } from '../src/orbit/reentry-job';
import { loadSolarDaily, measuredActivity } from '../src/physics/propagator/activity';
import { describeLifetime, type LifetimeInputs } from '../src/ui/lifetime';
import { getLang } from '../src/i18n';

type Over = { place: string; lat: number; minEl: number; days: number; data: string; groups: string[] };
const bangkok: Over = { place: 'Bangkok', lat: 0.2427, minEl: 60, days: 1, data: 'snapshot|2026-09-26T16:10:54Z', groups: ['stations'] };

const slot = () => new ResultSlot<Over, string[]>((i) => [i.place, `≥ ${i.minEl}°`, i.days === 1 ? '24 h' : `${i.days} days`, `data ${i.data.split('|')[1].slice(0, 10)}`]);

describe('ResultSlot', () => {
  it('has no result and says so before any run', () => {
    const s = slot();
    expect(s.state).toBe('idle');
    expect(s.status(bangkok)).toBe('none');
    expect(s.describe()).toBe('');
  });

  it('is fresh for the inputs it ran on, and stale once any of them changes', () => {
    const s = slot();
    const gen = s.start(bangkok, 2461000.5);
    expect(s.status(bangkok)).toBe('fresh');
    expect(s.accept(gen, ['ISS'])).toBe(true);
    expect(s.state).toBe('done');
    expect(s.status({ ...bangkok })).toBe('fresh');
    // A4: the city, the elevation, the duration, the group each make it stale
    expect(s.status({ ...bangkok, place: 'Moscow', lat: 0.9750 })).toBe('stale');
    expect(s.status({ ...bangkok, minEl: 45 })).toBe('stale');
    expect(s.status({ ...bangkok, days: 3 })).toBe('stale');
    expect(s.status({ ...bangkok, groups: ['stations', 'thai'] })).toBe('stale');
    // A14: so does a new element set of the same catalogue
    expect(s.status({ ...bangkok, data: 'online|2026-09-27T08:00:00Z' })).toBe('stale');
    expect(s.changed({ ...bangkok, minEl: 45, days: 3 })).toEqual(['minEl', 'days']);
    expect(s.startedAt).toBe(2461000.5);
  });

  it('keeps a frozen copy of its inputs: editing the object it was given changes nothing', () => {
    const s = slot();
    const form = { ...bangkok, groups: [...bangkok.groups] };
    s.start(form);
    form.minEl = 30;
    form.groups.push('debris');
    expect(s.inputs!.minEl).toBe(60);
    expect(s.inputs!.groups).toEqual(['stations']);
    expect(Object.isFrozen(s.inputs)).toBe(true);
    expect(Object.isFrozen(s.inputs!.groups)).toBe(true);
    expect(s.status(form)).toBe('stale');
  });

  it('drops the answer of an earlier run, however late it comes (A15)', () => {
    const s = slot();
    const first = s.start(bangkok);
    const second = s.start({ ...bangkok, place: 'Moscow' });
    expect(s.current(first)).toBe(false);
    expect(s.accept(first, ['from Bangkok'])).toBe(false);
    expect(s.report(first, 0.5)).toBe(false);
    expect(s.stop(first)).toBe(false);
    expect(s.fail(first, 'late')).toBe(false);
    expect(s.state).toBe('running');
    expect(s.result).toBeNull();
    expect(s.report(second, 0.5)).toBe(true);
    expect(s.progress).toBe(0.5);
    expect(s.accept(second, ['from Moscow'])).toBe(true);
    expect(s.result).toEqual(['from Moscow']);
    expect(s.inputs!.place).toBe('Moscow');
    // an answer comes once
    expect(s.accept(second, ['again'])).toBe(false);
  });

  it('stops when asked, fails and clears', () => {
    const s = slot();
    let gen = s.start(bangkok);
    expect(s.report(gen, 0.2)).toBe(true);
    s.requestStop();
    expect(s.report(gen, 0.3)).toBe(false);
    expect(s.progress).toBe(0.2);
    expect(s.stop(gen)).toBe(true);
    // a stop asked of one run is not carried to the next
    const next = s.start(bangkok);
    expect(s.report(next, 0.1)).toBe(true);
    expect(s.stop(next)).toBe(true);
    gen = next;
    expect(s.state).toBe('stopped');
    expect(s.status(bangkok)).toBe('fresh');
    gen = s.start(bangkok);
    expect(s.fail(gen, 'no data')).toBe(true);
    expect(s.state).toBe('failed');
    expect(s.reason).toBe('no data');
    gen = s.start(bangkok);
    s.clear();
    expect(s.state).toBe('idle');
    expect(s.status(bangkok)).toBe('none');
    expect(s.accept(gen, ['x'])).toBe(false);
  });

  it('puts its inputs in words: its own by default, or any others', () => {
    const s = slot();
    s.start(bangkok);
    expect(s.describe()).toBe('Bangkok · ≥ 60° · 24 h · data 2026-09-26');
    expect(s.describe({ ...bangkok, place: 'Moscow', days: 3 })).toBe('Moscow · ≥ 60° · 3 days · data 2026-09-26');
    const blanks = new ResultSlot<{ a: string }, number>((i) => [i.a, '', 'x']);
    blanks.start({ a: 'A' });
    expect(blanks.describe()).toBe('A · x');
  });
});

describe('plain-data helpers', () => {
  it('compares deeply, whatever the key order, NaN included', () => {
    expect(deepEqual({ a: 1, b: [1, { c: 'x' }] }, { b: [1, { c: 'x' }], a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([1], { 0: 1 })).toBe(false);
    expect(deepEqual(NaN, NaN)).toBe(true);
    expect(deepEqual(null, {})).toBe(false);
    expect(changedKeys({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual(['b']);
  });

  it('freezes a copy, not the original', () => {
    const o = { a: { b: [1] } };
    const f = frozenCopy(o);
    expect(Object.isFrozen(o)).toBe(false);
    expect(Object.isFrozen(f.a.b)).toBe(true);
    expect(frozenCopy(5)).toBe(5);
  });

  it('reads a positive number from a box, and nothing else (A5)', () => {
    expect(positiveNumber('101')).toBe(101);
    expect(positiveNumber(' 2.5 ')).toBe(2.5);
    expect(positiveNumber('1e3')).toBe(1000);
    for (const bad of ['', '  ', '0', '-5', 'abc', 'NaN', 'Infinity']) expect(positiveNumber(bad)).toBeNull();
  });

  it('lets only the latest request answer (A14)', () => {
    const l = new Latest();
    const a = l.next();
    const b = l.next();
    expect(l.isLatest(a)).toBe(false);
    expect(l.isLatest(b)).toBe(true);
  });
});

// ─── the real-satellite page's results, at model level (A4, A14, A15) ──────────

const SNAP = Object.values(import.meta.glob('../public/data/satellites.json', { import: 'default', eager: true }) as Record<string, unknown>)[0];
const catalogue = parseSnapshot(SNAP, 'satellites');
const setOf = (from: 'snapshot' | 'online', asOf: string): Dataset<SatelliteCatalog> =>
  ({ id: 'satellites', data: catalogue.data, asOf, from, source: catalogue.source });
const OFFLINE = setOf('snapshot', catalogue.asOf);
const ONLINE = setOf('online', '2026-09-27T08:00:00.000Z');

/** A promise and the hands that settle it: a provider that answers when the test says. */
function later<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
  let resolve!: (v: T) => void, reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
/** Let the promise callbacks run. */
const settle = () => new Promise((r) => setTimeout(r, 0));

class SlowProvider implements DataProvider {
  readonly asked: { id: string; answer: ReturnType<typeof later<Dataset<unknown>>> }[] = [];
  constructor(readonly mode: 'online' | 'offline') {}
  load<K extends DatasetId>(id: K): Promise<Dataset<DatasetTypes[K]>> {
    // the Earth's orientation is not what these tests are about: none, at once (UT1 is taken for UTC)
    if (id === 'earthOrientation') return Promise.reject(new Error('not in this test'));
    const answer = later<Dataset<unknown>>();
    this.asked.push({ id, answer });
    return answer.promise as Promise<Dataset<DatasetTypes[K]>>;
  }
  answer(id: string, v: Dataset<unknown>): void { this.asked.find((a) => a.id === id)!.answer.resolve(v); }
  refuse(id: string, e: unknown): void { this.asked.find((a) => a.id === id)!.answer.reject(e); }
}

function skyWith(first: DataProvider): { sky: RealSky; use: (p: DataProvider) => void } {
  let provider = first;
  const sky = new RealSky({ level: () => 'explore', provider: () => provider, refresh: () => {}, refreshFacts: () => {}, toPlayground: () => {} });
  return { sky, use: (p) => { provider = p; } };
}

describe('RealSky: only the latest data mode\'s catalogue is taken (A14)', () => {
  it('Online still loading, then Offline: Offline\'s answer stays, however late Online\'s comes', async () => {
    const online = new SlowProvider('online'), offline = new SlowProvider('offline');
    const { sky, use } = skyWith(online);
    sky.load();
    use(offline);
    sky.reset();
    sky.load();
    offline.answer('satellites', OFFLINE);
    await settle();
    expect(sky.dataset).toBe(OFFLINE);
    online.answer('satellites', ONLINE);
    await settle();
    expect(sky.dataset).toBe(OFFLINE);
  });

  it('nor does a late failure of the earlier mode replace the later one\'s answer', async () => {
    const online = new SlowProvider('online'), offline = new SlowProvider('offline');
    const { sky, use } = skyWith(online);
    sky.load();
    use(offline);
    sky.reset();
    sky.load();
    online.refuse('satellites', new Error('no answer within 8 s'));
    await settle();
    offline.answer('satellites', OFFLINE);
    await settle();
    expect(sky.dataset).toBe(OFFLINE);
  });
});

describe('RealSky: results keep what they were found from (A4, A14, A15)', () => {
  const jd0 = Date.parse(catalogue.asOf) / 86400000 + 2440587.5;
  const DEG = Math.PI / 180;

  async function loaded(set: Dataset<SatelliteCatalog>, mode: 'online' | 'offline' = 'offline') {
    const p = new SlowProvider(mode);
    const made = skyWith(p);
    made.sky.jd = jd0;
    made.sky.load();
    p.answer('satellites', set);
    await settle();
    return { ...made, provider: p };
  }

  it('overflights: fresh for the search run, stale for another city, elevation, time or element sets', async () => {
    const { sky, use } = await loaded(OFFLINE);
    await sky.findOverflights();
    const slot = sky.results.over;
    expect(slot.state).toBe('done');
    expect(slot.inputs!.stationId).toBe('bangkok');
    expect(slot.status(sky.overInputs())).toBe('fresh');
    // A4: Moscow is chosen after the search
    const moscow = stationOf('moscow') ?? { lat: 55.75 * DEG, lon: 37.62 * DEG, alt: 0 };
    const page = sky as unknown as { place: { stationId: string; station: typeof moscow }; over: { minEl: number; days: number } };
    page.place = { stationId: 'moscow', station: moscow };
    expect(slot.status(sky.overInputs())).toBe('stale');
    expect(slot.changed(sky.overInputs()).sort()).toEqual(['lat', 'lon', 'stationId']);
    expect(slot.inputs!.stationId).toBe('bangkok');
    page.place = { stationId: 'bangkok', station: stationOf('bangkok')! };
    expect(slot.status(sky.overInputs())).toBe('fresh');
    const minEl = page.over.minEl;
    page.over.minEl = 45 * DEG;
    expect(slot.status(sky.overInputs())).toBe('stale');
    page.over.minEl = minEl;
    page.over.days = 3;
    expect(slot.status(sky.overInputs())).toBe('stale');
    page.over.days = 1;
    // A14: newer element sets arrive for the same group
    const online = new SlowProvider('online');
    use(online);
    sky.reset();
    sky.load();
    online.answer('satellites', ONLINE);
    await settle();
    expect(sky.dataset).toBe(ONLINE);
    expect(slot.status(sky.overInputs())).toBe('stale');
    expect(slot.changed(sky.overInputs())).toEqual(['data']);
  });

  it('re-entry: a mass typed in while the space weather loads is not the one used, and makes the answer stale (A15)', async () => {
    const { sky, provider } = await loaded(OFFLINE);
    const objects = skyObjects(catalogue.data.groups.find((g) => g.id === 'stations')!.sets.map(elementsFromRecord), 'stations');
    const o = objects.find((x) => x.el.satnum === 25544)!;
    // the drag from a mass and size given, the inputs this test changes
    sky.reentry.from = 'size';
    const pending = sky.runReentry(o);
    expect(sky.results.reentry.state).toBe('running');
    sky.reentry.mass = 450000;
    const withFallback = { id: 'spaceWeather', data: null, asOf: '2026-09-26T00:00:00.000Z', from: 'snapshot', source: { name: 'NOAA SWPC', url: '' }, fallback: 'no answer within 8 s' } as unknown as Dataset<unknown>;
    provider.answer('spaceWeather', withFallback);
    await pending;
    const slot = sky.results.reentry;
    expect(slot.state).toBe('done');
    expect(slot.inputs!.mass).toBe(1000);
    const expected = predictFromRequest({
      sets: [o.el], from: 'size', craft: { mass: 1000, area: 5, cd: 2.2 }, activity: measuredActivity(await loadSolarDaily(), null).series, horizonDays: 365,
    }, () => {});
    expect(slot.result!.reentry).toEqual(expected.reentry);
    expect(slot.result!.b).toBeCloseTo(2.2 * 5 / 1000, 12);
    expect(slot.status(sky.reentryInputs(o))).toBe('stale');
    expect(slot.changed(sky.reentryInputs(o))).toEqual(['mass']);
    // where its space weather came from is kept with it
    expect(slot.result!.sun).toMatchObject({ asOf: '2026-09-26T00:00:00.000Z', from: 'snapshot', fallback: 'no answer within 8 s' });
    sky.reentry.mass = 1000;
    expect(slot.status(sky.reentryInputs(o))).toBe('fresh');
  });

  it('re-entry: a second run started while the first waits is the one kept', async () => {
    const { sky, provider } = await loaded(OFFLINE);
    const objects = skyObjects(catalogue.data.groups.find((g) => g.id === 'stations')!.sets.map(elementsFromRecord), 'stations');
    const o = objects.find((x) => x.el.satnum === 25544)!;
    sky.reentry.from = 'size';
    const first = sky.runReentry(o);
    sky.reentry.mass = 2000;
    const second = sky.runReentry(o);
    for (const a of provider.asked.filter((x) => x.id === 'spaceWeather')) a.answer.reject(new Error('offline'));
    await Promise.all([first, second]);
    expect(sky.results.reentry.inputs!.mass).toBe(2000);
    expect(sky.results.reentry.status(sky.reentryInputs(o))).toBe('fresh');
  });
});

describe('orbit lifetime: the result is shown with what it was made from (A5)', () => {
  const inputs: LifetimeInputs = {
    start: 2461310.2, forces: { j2: true, j3j4: true, drag: true, sun: true, moon: true, srp: true },
    activity: 'measured', method: 'mean', horizon: 25 * 365, mass: 101, area: 2, cd: 2.2, cr: 1.3,
  };

  it('a lifetime of a 101 kg satellite is stale under 10 001 kg, and under any other change of the form', () => {
    const s = new ResultSlot<LifetimeInputs, string>(describeLifetime);
    const gen = s.start(inputs);
    s.accept(gen, '3.0 years');
    expect(s.status(inputs)).toBe('fresh');
    expect(s.status({ ...inputs, mass: 10001 })).toBe('stale');
    expect(s.status({ ...inputs, forces: { ...inputs.forces, drag: false } })).toBe('stale');
    expect(s.status({ ...inputs, activity: 'high' })).toBe('stale');
    expect(s.status({ ...inputs, method: 'cowell' })).toBe('stale');
    expect(s.status({ ...inputs, horizon: 365 })).toBe('stale');
    expect(s.status({ ...inputs, cr: 1.5 })).toBe('stale');
    expect(s.changed({ ...inputs, mass: 10001 })).toEqual(['mass']);
  });

  it('names every input of the run', () => {
    expect(getLang()).toBe('en');
    const words = new ResultSlot<LifetimeInputs, string>(describeLifetime);
    words.start({ ...inputs, forces: { ...inputs.forces, sun: false, moon: false } });
    const d = words.describe();
    for (const part of ['101 kg', '2 m²', 'C_D 2.2', 'C_R 1.3', 'Oblateness (J2)', 'Atmospheric drag', 'Mean elements', '25.0 years', 'Measured, then NOAA']) expect(d).toContain(part);
    expect(d).not.toContain('The Moon');
  });
});

describe('RealSky: NAPA-2\'s case is kept with the data mode it ran in (M-ORBIT-002)', () => {
  it('is fresh in the mode it ran in, and stale, not current, once the mode changes', async () => {
    const offline = new SlowProvider('offline');
    const { sky, use } = skyWith(offline);
    const slot = sky.results.napaCase;
    expect(slot.status(sky.caseInputs())).toBe('none');
    const run = sky.runNapaCase();
    expect(slot.state).toBe('running');
    for (const a of offline.asked.filter((x) => x.id === 'spaceWeather')) a.answer.reject(new Error('offline'));
    await run;
    expect(slot.state).toBe('done');
    expect(slot.inputs).toEqual({ sw: 'offline' });
    expect(slot.result!.box.jd).not.toBeNull();
    expect(slot.status(sky.caseInputs())).toBe('fresh');
    use(new SlowProvider('online'));
    expect(slot.status(sky.caseInputs())).toBe('stale');
    expect(slot.changed(sky.caseInputs())).toEqual(['sw']);
  }, 30_000);
});
