/**
 * FX-3 step 3 (plan v2.0 S10 §10.6, M-ORBIT-007): the satellite catalogue's
 * load state where Real satellites is shown, and a Retry after a failed load.
 *
 * Before: the Watch tour's real-satellite steps showed only their title and
 * text while the catalogue was loading or had failed (the panel that says
 * so, `RealSky.controls()`, is hidden at the Watch level), and the panel
 * itself said "could not be loaded: {reason}" with nothing to try again.
 *
 * After: the tour card and the panel say "Loading the element sets…" or
 * "could not be loaded: {reason}" with a Try again button. Try again loads
 * through the data provider, so CelesTrak's two-hour rule and the bundled
 * snapshot behind it hold (S02 §02.13 item 22): within two hours each
 * CelesTrak query is asked at most once, however often the load is retried,
 * and a second press while the first is loading asks nothing more.
 *
 * The network is a fetch double; the catalogue is the bundled snapshot.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealSky, type SkyHost } from '../src/ui/orbit/sky-panel';
import { OrbitPlayground } from '../src/ui/orbit/playground';
import { OfflineProvider, OnlineProvider, MemoryRecent, type DataProvider, type Fetcher } from '../src/provider/data-provider';
import { SATELLITE_URLS, SATELLITES_MIN_INTERVAL_MS } from '../src/provider/satellites';
import { TOUR } from '../src/orbit/tour';
import { SKY_TOUR } from '../src/orbit/sky-tour';
import { julianDate } from '../src/physics/orbital';
import { setLang, t } from '../src/i18n';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';

const SNAPSHOT_FILE = import.meta.glob('../public/data/satellites.json', { import: 'default', eager: true }) as Record<string, unknown>;
const SNAPSHOT = Object.values(SNAPSHOT_FILE)[0] as { asOf: string };

/** The few DOM calls the panel and the tour card make, read back as text. */
class Node {
  readonly tagName: string;
  children: Node[] = [];
  textContent = ''; className = ''; type = ''; value = ''; placeholder = ''; accept = ''; href = ''; target = ''; rel = '';
  hidden = false; disabled = false; open = false;
  files: null = null;
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  readonly attrs: Record<string, string> = {};
  private readonly listeners: Record<string, Array<() => void>> = {};
  readonly classList = {
    add: (...c: string[]) => { this.className = [...new Set([...this.className.split(' ').filter(Boolean), ...c])].join(' '); },
    remove: (...c: string[]) => { this.className = this.className.split(' ').filter((x) => x && !c.includes(x)).join(' '); },
    toggle: (c: string, on?: boolean) => { if (on ?? !this.className.split(' ').includes(c)) this.classList.add(c); else this.classList.remove(c); },
    contains: (c: string) => this.className.split(' ').includes(c),
  };
  constructor(tag: string) { this.tagName = tag.toUpperCase(); }
  append(...c: (Node | string)[]): void { this.children.push(...c.map(asNode)); }
  replaceChildren(...c: (Node | string)[]): void { this.children = c.map(asNode); }
  setAttribute(k: string, v: unknown): void { this.attrs[k] = String(v); }
  getAttribute(k: string): string | null { return this.attrs[k] ?? null; }
  addEventListener(type: string, fn: () => void): void { (this.listeners[type] ??= []).push(fn); }
  click(): void { for (const fn of this.listeners.click ?? []) fn(); }
  querySelectorAll(): Node[] { return []; }
  /** every node below this one */
  all(): Node[] { return this.children.flatMap((c) => [c, ...c.all()]); }
  text(): string { return this.textContent + this.children.map((c) => c.text()).join(''); }
  buttons(label: string): Node[] { return this.all().filter((n) => n.tagName === 'BUTTON' && n.text() === label); }
}
const asNode = (c: Node | string): Node => (typeof c === 'string' ? Object.assign(new Node('#text'), { textContent: c }) : c);

beforeEach(() => {
  vi.stubGlobal('document', { createElement: (tag: string) => new Node(tag), documentElement: { lang: 'en' } });
  setLang('en');
});
afterEach(() => {
  setLang('en');
  vi.unstubAllGlobals();
});

const BASE = 'https://app.test/Orbitlab/';
const SNAPSHOT_URL = new URL('data/satellites.json', BASE).href;
const isCelestrak = (url: string): boolean => new URL(url).hostname === 'celestrak.org';

/**
 * The network: the catalogue snapshot fails as `snapshotFails` says, then
 * answers; CelesTrak answers 503 (a server error: kept for two hours, as an
 * answer is); anything else is not there. Every request is counted.
 */
function network(snapshotFails: number) {
  const asked: string[] = [];
  let failures = snapshotFails;
  const fetcher: Fetcher = async (url) => {
    asked.push(url);
    if (url === SNAPSHOT_URL) {
      if (failures > 0) { failures--; throw new TypeError('Failed to fetch'); }
      return { ok: true, status: 200, json: async () => structuredClone(SNAPSHOT) };
    }
    if (isCelestrak(url)) return { ok: false, status: 503, json: async () => ({}) };
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return { fetcher, asked, count: (pred: (url: string) => boolean) => asked.filter(pred).length };
}

/** The playground at the Watch level, on the tour's first real-satellite step, its card drawn as the page draws it. */
function watchTour(provider: DataProvider) {
  type Tour = {
    tour: Node; level: string; live: object; tourIndex: number; handoff: null; mode: string; view: string; warp: number;
    playing: boolean; skyEntered: boolean; clock: Node; date: Node; sky: RealSky; orbitView: unknown; liveTick: number;
    applyTourStep(): void; renderTour(): void; skyFrame(dt: number): void;
  };
  const pg = Object.create(OrbitPlayground.prototype) as Tour;
  const host: SkyHost = {
    level: () => 'watch',
    provider: () => provider,
    // the playground's own: at the Watch level the tour card is drawn again with the panels
    refresh: () => pg.renderTour(),
    refreshFacts: () => {},
    toPlayground: () => {},
  };
  Object.assign(pg, {
    tour: new Node('div'), level: 'watch', live: {}, tourIndex: TOUR.length, handoff: null, mode: 'sky', view: '3d', warp: 60,
    playing: true, skyEntered: false, clock: new Node('span'), date: new Node('span'), sky: new RealSky(host),
    // the 3-D view, drawing nothing: a frame moves the sky and picks the step's satellite once the catalogue is in
    orbitView: new Proxy({}, { get: () => () => undefined }), liveTick: 0,
  });
  pg.applyTourStep();
  // the snapshot's own moment: SGP4 places the satellite wherever the test runs
  pg.sky.jd = julianDate(new Date(SNAPSHOT.asOf));
  pg.renderTour();
  return { pg, card: () => pg.tour, frame: () => pg.skyFrame(1 / 60) };
}

describe('the Watch tour\'s real-satellite steps say why they are empty (M-ORBIT-007)', () => {
  it('starts on a real-satellite step: the ISS, in the stations group', () => {
    expect(SKY_TOUR[0]).toMatchObject({ id: 'iss', group: 'stations', satnum: 25544 });
  });

  it('goes loading → failed → Try again → loading → ready, saying so on the card, the snapshot asked once a try', async () => {
    const net = network(1);
    const { pg, card, frame } = watchTour(new OfflineProvider(BASE, net.fetcher));
    const stepTitle = t(SKY_TOUR[0].titleKey);

    // loading: the card says so, not just the step's words
    expect(card().text()).toContain(stepTitle);
    expect(card().text(), 'loading').toContain(t('sky.loading'));
    expect(net.count((u) => u === SNAPSHOT_URL)).toBe(1);

    // failed: why, and a button to try again
    await pg.sky.ready();
    const reason = 'Failed to fetch';
    expect(card().text(), 'failed').toContain(t('sky.failed', { reason }));
    const retry = card().buttons(t('sky.retry'));
    expect(retry, 'a Try again button on the tour card').toHaveLength(1);
    expect(card().text()).not.toContain(t('pg.f.altNow'));
    // the card drawn again, and the sky's frames, ask nothing more by themselves
    pg.renderTour();
    for (let k = 0; k < 10; k++) frame();
    expect(net.count((u) => u === SNAPSHOT_URL)).toBe(1);

    // Try again, pressed twice before the answer: one request
    retry[0].click();
    retry[0].click();
    expect(card().text(), 'loading again').toContain(t('sky.loading'));
    expect(card().buttons(t('sky.retry'))).toHaveLength(0);
    expect(net.count((u) => u === SNAPSHOT_URL)).toBe(2);

    // ready: the satellite's readouts, and no state line
    await pg.sky.ready();
    frame();
    expect(pg.sky.dataset?.from).toBe('snapshot');
    const ready = card().text();
    expect(ready).toContain(t('pg.f.altNow'));
    expect(ready).toContain(t('pg.f.period'));
    expect(ready).not.toContain(t('sky.loading'));
    expect(ready).not.toContain(t('sky.failed', { reason }).split(':')[0]);
    expect(card().buttons(t('sky.retry'))).toHaveLength(0);
    expect(net.count((u) => u === SNAPSHOT_URL)).toBe(2);
    expect(net.count(isCelestrak), 'the offline mode asks CelesTrak nothing').toBe(0);
  });
});

describe('Real satellites\' panel offers Try again after a failed load (M-ORBIT-007)', () => {
  function panel(provider: DataProvider) {
    const host: SkyHost = { level: () => 'explore', provider: () => provider, refresh: vi.fn(), refreshFacts: () => {}, toPlayground: () => {} };
    const sky = new RealSky(host);
    return { sky, host, controls: () => sky.controls() as unknown as Node };
  }

  for (const [lang, dict] of [['en', en], ['th', th], ['ru', ru]] as const) {
    it(`says why, and Try again loads the catalogue (${lang})`, async () => {
      setLang(lang);
      const label = (dict as Record<string, string | undefined>)['sky.retry'] ?? 'sky.retry';
      const net = network(1);
      const { sky, host, controls } = panel(new OfflineProvider(BASE, net.fetcher));
      expect(controls().text()).toContain(t('sky.loading'));
      await sky.ready();
      const failed = controls();
      expect(failed.text()).toContain(t('sky.failed', { reason: 'Failed to fetch' }));
      const retry = failed.buttons(label);
      expect(retry, `a "${label}" button`).toHaveLength(1);
      const before = vi.mocked(host.refresh).mock.calls.length;
      retry[0].click();
      // the panel is drawn again at once, to say it is loading
      expect(vi.mocked(host.refresh).mock.calls.length).toBeGreaterThan(before);
      expect(controls().text()).toContain(t('sky.loading'));
      await sky.ready();
      expect(sky.dataset).not.toBeNull();
      expect(controls().buttons(label)).toHaveLength(0);
      expect(net.count((u) => u === SNAPSHOT_URL)).toBe(2);
      // the button's word is the language's own
      expect(label).not.toBe('sky.retry');
      if (lang !== 'en') expect(label).not.toBe(en['sky.retry' as keyof typeof en]);
    });
  }
});

describe('online, Try again keeps CelesTrak\'s two-hour rule (M-ORBIT-007; S02 §02.13 item 22)', () => {
  it('asks each CelesTrak query at most once in two hours, through failure and retries, and ends on the snapshot', async () => {
    let now = Date.parse('2026-10-06T12:00:00Z');
    const net = network(2);
    const provider = new OnlineProvider(new OfflineProvider(BASE, net.fetcher), net.fetcher, 1000, new MemoryRecent(), () => now);
    const { pg, card, frame } = watchTour(provider);

    // CelesTrak answered 503 and the snapshot behind it could not be read: failed
    await pg.sky.ready();
    expect(net.count(isCelestrak)).toBe(SATELLITE_URLS.length);
    const press = () => {
      const retry = card().buttons(t('sky.retry'));
      expect(retry, 'a Try again button').toHaveLength(1);
      retry[0].click();
    };
    // a minute later: still failed (the snapshot again), and CelesTrak not asked again
    now += 60_000;
    press();
    await pg.sky.ready();
    expect(card().text()).toContain(t('sky.failed', { reason: 'Failed to fetch' }));
    // an hour later: the snapshot answers; CelesTrak's refusal of then still stands
    now += 3600_000;
    press();
    await pg.sky.ready();
    frame();
    const set = pg.sky.dataset;
    expect(set?.from).toBe('snapshot');
    expect(set?.fallback).toMatch(/celestrak\.org answered 503/);
    expect(card().text()).toContain(t('pg.f.altNow'));
    expect(now - Date.parse('2026-10-06T12:00:00Z')).toBeLessThan(SATELLITES_MIN_INTERVAL_MS);
    for (const url of SATELLITE_URLS) expect(net.count((u) => u === url), url).toBeLessThanOrEqual(1);
    expect(net.count((u) => u === SNAPSHOT_URL)).toBe(3);
  });
});
