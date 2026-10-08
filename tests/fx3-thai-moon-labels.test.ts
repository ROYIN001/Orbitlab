/**
 * FX-3 step 2 (plan v2.0 S10 §10.6): what the Orbit and Watch pages say
 * about real satellites and about the Moon.
 *
 * M-ORBIT-001: the Thai satellites panel said that following real satellites
 * "comes with the Orbit section's next phase", while Real satellites already
 * follows the Thai group. The note keeps "the catalogue's orbit as of {date},
 * its shape, not where it is now", drops the stale promise, and a button
 * opens Real satellites on the Thai group with the same satellite picked.
 * NAPA-2 has re-entered and is not in that group: no button for it.
 *
 * M-ORBIT-029 (D-11, docs/DECISIONS.md): the Moon is labelled "Apollo 11's
 * week only (DE441 table)" where it is shown — Watch's Apollo 11 flight,
 * the only flight that draws it (main.ts places it while the frame carries
 * `apollo`). No Orbit tool reads the Moon's ephemeris (D-11: none until L01).
 * README's sentence is not tested here: README is a Markdown file CI skips,
 * and a test may not import one unless it is gated
 * (tests/verification/workflow-paths.test.mjs); the plan leaves document
 * text to R7.5's tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import playgroundSource from '../src/ui/orbit/playground.ts?raw';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';
import { setLang } from '../src/i18n';
import * as model from '../src/orbit/playground-model';
import { defaultApps } from '../src/orbit/applications-setup';
import { THAI_SATELLITES, thaiSatelliteById } from '../src/data/thai-satellites';
import { THAI_NORAD_IDS } from '../src/provider/satellites';
import { appsResults, type AppsHost } from '../src/ui/orbit/applications-panel';
import { WatchView, type WatchHost } from '../src/ui/watch';
import { R_EARTH } from '../src/physics/constants';
import type { VisualFrame } from '../src/physics/frame';

/** The few DOM calls the two pages make, read back as text. */
class Node {
  readonly tagName: string;
  children: Node[] = [];
  textContent = ''; className = ''; id = ''; type = ''; title = ''; value = ''; href = ''; target = ''; rel = '';
  hidden = false;
  open = false;
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
  focus(): void {}
  /** every node below this one */
  all(): Node[] { return this.children.flatMap((c) => [c, ...c.all()]); }
  querySelectorAll(sel: string): Node[] { return sel.startsWith('.') ? this.all().filter((n) => n.classList.contains(sel.slice(1))) : this.all().filter((n) => n.tagName === sel.toUpperCase()); }
  querySelector(sel: string): Node | null { return this.querySelectorAll(sel)[0] ?? null; }
  text(): string { return this.textContent + this.children.map((c) => c.text()).join(''); }
  /** the text a viewer can see: nothing under a hidden node */
  shown(): string { return this.hidden ? '' : this.textContent + this.children.map((c) => c.shown()).join(' '); }
}
const asNode = (c: Node | string): Node => (typeof c === 'string' ? Object.assign(new Node('#text'), { textContent: c }) : c);

beforeEach(() => {
  vi.stubGlobal('document', { createElement: (tag: string) => new Node(tag), documentElement: { lang: 'en' } });
});
afterEach(() => {
  setLang('en');
  vi.unstubAllGlobals();
});

const DICTS = { en, th, ru } as const;
type Lang = keyof typeof DICTS;
const say = (lang: Lang, key: string): string => (DICTS[lang] as Record<string, string>)[key];

// ─── M-ORBIT-001 ──────────────────────────────────────────────────────────────

describe('M-ORBIT-001: the Thai satellites panel and Real satellites', () => {
  it('no longer says that following real satellites is still to come, in any language', () => {
    expect(say('en', 'use.thai.nominal')).not.toMatch(/next phase|comes with/i);
    expect(say('th', 'use.thai.nominal')).not.toMatch(/ระยะถัดไป|จะมาใน/);
    expect(say('ru', 'use.thai.nominal')).not.toMatch(/следующий этап/);
  });

  it('keeps "the catalogue\'s orbit as of {date}: its shape, not where the satellite is now"', () => {
    expect(say('en', 'use.thai.nominal')).toMatch(/catalogue.*\{date\}.*its shape, not where the satellite is now/);
    expect(say('th', 'use.thai.nominal')).toMatch(/แคตตาล็อก.*\{date\}.*ไม่ใช่ตำแหน่งของดาวเทียมในขณะนี้/);
    expect(say('ru', 'use.thai.nominal')).toMatch(/каталога.*\{date\}.*а не нынешнее положение спутника/);
  });

  it('knows which Thai satellites Real satellites shows: the Thai group, by catalogue number', () => {
    const inSky = (model as Record<string, unknown>).thaiInSky as ((id: string) => { group: string; satnum: number } | null) | undefined;
    expect(typeof inSky, 'playground-model exports thaiInSky').toBe('function');
    for (const s of THAI_SATELLITES) {
      const f = inSky!(s.id);
      if (THAI_NORAD_IDS.includes(s.norad)) expect(f, s.id).toEqual({ group: 'thai', satnum: s.norad });
      else expect(f, `${s.id} is not in the catalogue's Thai group`).toBeNull();
    }
    // NAPA-2 re-entered on 2026-07-05: the group leaves it out, so there is nothing to open
    expect(inSky!('napa2')).toBeNull();
    expect(inSky!('nope')).toBeNull();
  });

  const results = (id: string, calls: string[]): Node => {
    const a = { ...defaultApps('thai'), thaiId: id };
    const host = {
      level: () => 'explore', apps: () => a, choose: () => {}, change: () => {}, showThai: () => {},
      showInSky: (x: string) => { calls.push(x); },
    } as unknown as AppsHost;
    return appsResults(host, a, { comms: null, eo: null, thai: thaiSatelliteById(id)! }) as unknown as Node;
  };

  for (const lang of ['en', 'th', 'ru'] as const) {
    it(`offers "Show in Real satellites" for each satellite in the Thai group, and it opens that one (${lang})`, () => {
      setLang(lang);
      const real = say(lang, 'sky.mode.sky');
      for (const s of THAI_SATELLITES.filter((x) => THAI_NORAD_IDS.includes(x.norad))) {
        const calls: string[] = [];
        const box = results(s.id, calls);
        const buttons = box.all().filter((n) => n.tagName === 'BUTTON' && n.text().includes(real));
        expect(buttons, `${s.id}: one button naming ${real}`).toHaveLength(1);
        buttons[0].click();
        expect(calls, s.id).toEqual([s.id]);
        // the catalogue note stays, with its date
        expect(box.text(), s.id).toContain(say(lang, 'use.thai.nominal').split('{date}')[0]);
      }
    });
  }

  it('offers no Real satellites button for NAPA-2, which has re-entered', () => {
    const calls: string[] = [];
    const box = results('napa2', calls);
    expect(box.all().filter((n) => n.tagName === 'BUTTON' && n.text().includes(en['sky.mode.sky']))).toHaveLength(0);
    expect(box.text()).not.toMatch(/next phase/i);
  });

  it('the playground opens Real satellites on the Thai group with that satellite picked (source)', () => {
    const handler = playgroundSource.match(/showInSky: \(id: string\) => \{[\s\S]*?\n {4}\},/)?.[0] ?? '';
    expect(handler, 'the apps host has a showInSky handler').not.toBe('');
    expect(handler).toMatch(/thaiInSky\(id\)/);
    expect(handler).toMatch(/this\.enterSkyNow\(\)/);
    expect(handler).toMatch(/this\.sky\.showForTour\(f\.group, f\.satnum\)/);
  });
});

// ─── M-ORBIT-029 ──────────────────────────────────────────────────────────────

const WATCH_HOST: WatchHost = { start: () => {}, togglePlay: () => {}, setWarp: () => {}, explore: () => {}, follow: () => {} };

/** A frame of a flight: Apollo 11 on its way to the Moon (`apollo` set: main.ts draws the Moon), or not. */
function frame(apollo: boolean): VisualFrame {
  return {
    t: 20_000, status: 'coast', ascentPhase: null, note: '', liftoff: true, liftoffT: 0.8, destroyed: false,
    r: { x: R_EARTH + 100e6, y: 0, z: 0 }, v: { x: 0, y: 2000, z: 0 }, dir: { x: 1, y: 0, z: 0 },
    altitude: 100e6, altitudeAGL: 100e6, activeStageIndex: 2, payloadSeparated: false, nextBurnTime: -1,
    elements: { period: 5400 }, debris: [], eventCount: 0,
    ...(apollo ? { apollo: { phase: 'translunar' } } : {}),
  } as unknown as VisualFrame;
}

/** Where the scope label would be: any text on the page naming DE441. */
const moonLabels = (root: Node): string[] => root.all().filter((n) => !n.hidden && n.children.length === 0 && /DE441/.test(n.textContent) && !hiddenAbove(root, n)).map((n) => n.textContent);
function hiddenAbove(root: Node, target: Node): boolean {
  const walk = (n: Node, hidden: boolean): boolean | null => {
    if (n === target) return hidden;
    for (const c of n.children) { const r = walk(c, hidden || c.hidden); if (r !== null) return r; }
    return null;
  };
  return walk(root, root.hidden) ?? true;
}

describe('M-ORBIT-029: the Moon is Apollo 11\'s week only (D-11)', () => {
  it('Watch labels the Moon while it is on screen, and only then', () => {
    const root = new Node('div');
    const view = new WatchView(root as unknown as HTMLElement, WATCH_HOST);
    view.update(frame(false), [], { playing: false, vehicle: null });
    expect(moonLabels(root), 'no Moon, no label').toEqual([]);
    view.update(frame(true), [], { playing: false, vehicle: null });
    const shown = moonLabels(root);
    expect(shown, 'the Moon is drawn: its scope is said').toHaveLength(1);
    expect(shown[0]).toContain('Apollo 11\'s week only (DE441 table)');
    view.update(frame(false), [], { playing: false, vehicle: null });
    expect(moonLabels(root)).toEqual([]);
  });

  it('says it in Thai and Russian too', () => {
    const english = moonLabelIn('en');
    for (const [lang, apollo] of [['th', 'อะพอลโล 11'], ['ru', 'Аполлон-11']] as const) {
      const shown = moonLabelIn(lang);
      expect(shown, lang).toContain(apollo);
      expect(shown, lang).not.toBe(english);
    }
  });

  it('no Orbit tool reads the Moon\'s ephemeris (D-11: none until L01)', () => {
    const sources = {
      ...import.meta.glob('../src/orbit/**/*.ts', { query: '?raw', import: 'default', eager: true }),
      ...import.meta.glob('../src/ui/orbit/**/*.ts', { query: '?raw', import: 'default', eager: true }),
    } as Record<string, string>;
    expect(Object.keys(sources).length).toBeGreaterThan(20);
    for (const [path, text] of Object.entries(sources)) expect(text, path).not.toMatch(/moonState|moonPosition|lunar\/ephemeris/);
  });
});

/** The label as Watch shows it in a language, with the Moon on screen ('' with none). */
function moonLabelIn(lang: Lang): string {
  setLang(lang);
  const root = new Node('div');
  new WatchView(root as unknown as HTMLElement, WATCH_HOST).update(frame(true), [], { playing: false, vehicle: null });
  const shown = moonLabels(root);
  expect(shown, lang).toHaveLength(1);
  return shown[0];
}
