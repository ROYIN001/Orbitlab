/**
 * M-LEARNING-047 (ED-INST-1): the privacy statement, public/privacy.html, lists
 * what Orbitlab keeps on the device and where it connects, and this file holds
 * that list to the code. It fails when the code gains a storage key, a
 * database, a cache, a host or a way to send data that the page does not name,
 * so the statement cannot quietly fall behind the app. The page opening offline
 * in each language is the browser journey `privacy-offline`.
 */
import { describe, expect, it } from 'vitest';
import PAGE from '../public/privacy.html?raw';
import INDEX from '../index.html?raw';
import { WORKSPACE_KEYS } from '../src/workspace/registry';
import { PROFILE_CATALOG_KEY, PROFILE_SELECTED_KEY, profileStorageKey } from '../src/workspace/repository';
import { MEDIA_DATABASE } from '../src/workspace/media';
import { CacheStorageRecent } from '../src/provider/data-provider';
import { DATASETS, DATASET_IDS, DATA_HOSTS as DATASET_HOSTS } from '../src/provider/datasets';
import { DATA_CACHE, DATA_HOSTS, PRECACHE_PREFIX, RUNTIME_CACHE, RUNTIME_HOSTS, routeFor } from '../src/pwa/sw-core';
import { onDemand, precacheable } from '../src/pwa/manifest';
import { WEB_FONTS_URL } from '../src/ui/web-fonts';

const LANGS = ['th', 'en', 'ru'] as const;

const decode = (html: string): string => html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function section(id: string): string {
  const m = PAGE.match(new RegExp(`<section id="${id}"[^>]*>([\\s\\S]*?)</section>`));
  if (!m) throw new Error(`public/privacy.html has no section #${id}`);
  return decode(m[1]);
}
/** The text inside every <code> of a part of the page. */
const codes = (html: string): string[] => [...html.matchAll(/<code>([\s\S]*?)<\/code>/g)].map((m) => m[1]);

/** Every name a reader of each language must find in their own section: the device stores and the hosts. */
const PER_LANGUAGE = [
  PROFILE_CATALOG_KEY, PROFILE_SELECTED_KEY, profileStorageKey('*'), MEDIA_DATABASE,
  `${PRECACHE_PREFIX}*`, RUNTIME_CACHE, DATA_CACHE, CacheStorageRecent.NAME,
  ...DATA_HOSTS, ...RUNTIME_HOSTS,
];

/**
 * Every `orbitlab.`/`orbitlab-`/`orbitlab:` string the source holds that is NOT
 * something kept on the device, each with why. A new literal must go either into
 * the page (if the app stores it) or here (with its reason): an unknown one fails.
 */
const NOT_STORED: Record<string, string> = {
  'orbitlab.design': 'file format of an exported design', 'orbitlab.flight': 'file format of an exported flight',
  'orbitlab.handoff': 'file format of a Build-to-Orbit hand-off', 'orbitlab.project': 'file format of a project backup',
  'orbitlab.results': 'file format of a results file', 'orbitlab.snapshot': 'file format of a data snapshot',
  'orbitlab.workspace': 'file format of a profile backup', 'orbitlab.scene': 'WebGL texture name',
  'orbitlab.build.': 'prefix test over the listed orbitlab.build.* keys',
  'orbitlab:': 'performance mark prefix', 'orbitlab:skip-waiting': 'service-worker message', 'orbitlab:offline-check': 'service-worker message',
  'orbitlab:offline-prepare': 'service-worker message',
  'orbitlab-': 'download file name prefix', 'orbitlab-case-': 'download file name prefix', 'orbitlab-project-': 'download file name prefix',
  'orbitlab-recheck-': 'download file name prefix', 'orbitlab-report-': 'download file name prefix', 'orbitlab-experiments.json': 'download file name',
  'orbitlab-bend': 'shader program cache key', 'orbitlab-bend-bell': 'shader program cache key',
  'orbitlab-profile-catalog-v1': 'Web Lock name (held while the tab runs, not stored)', 'orbitlab-profile-owner-v1:': 'Web Lock name prefix',
  'orbitlab-profile-conflict': 'DOM event name', 'orbitlab-profile-name-changed': 'DOM event name', 'orbitlab-workspace-storage-error': 'DOM event name',
};

// `import.meta.glob` requires its options to be an inline object literal.
const RAW = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
/** Source without comments, so a comment that mentions an API is not a use of it. */
const code = (text: string): string => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\'"`])\/\/[^\n]*/g, '$1');
const SRC = Object.entries(RAW).map(([path, text]) => ({ file: path.replace(/^\.\.\//, ''), raw: text, text: code(text) }));
const filesUsing = (re: RegExp): string[] => SRC.filter((s) => re.test(s.text)).map((s) => s.file).sort();

describe('privacy statement (M-LEARNING-047): the page names what the code stores and where it connects', () => {
  it('has a section in Thai, English and Russian, each naming every device store and host', () => {
    for (const lang of LANGS) {
      const named = codes(section(lang));
      for (const name of PER_LANGUAGE) expect(named, `#${lang} does not name ${name}`).toContain(name);
    }
  });

  it('lists every workspace key a profile can hold, and the device-level keys', () => {
    const named = codes(section('keys'));
    for (const key of WORKSPACE_KEYS) expect(named, `technical list misses ${key}`).toContain(key);
    expect(named).toContain('orbitlab.lessons.recovery.N');
    for (const name of [PROFILE_CATALOG_KEY, PROFILE_SELECTED_KEY, profileStorageKey('<id>'), MEDIA_DATABASE, `${PRECACHE_PREFIX}<version>`,
      RUNTIME_CACHE, DATA_CACHE, CacheStorageRecent.NAME]) expect(named, `technical list misses ${name}`).toContain(name);
  });

  it('knows every orbitlab.* string in the source: listed on the page, or known not to be stored', () => {
    const listed = new Set([...codes(section('keys')), ...LANGS.flatMap((l) => codes(section(l)))]);
    const unknown = new Set<string>();
    for (const { file, text } of SRC) {
      for (const m of text.matchAll(/['"`](orbitlab[.:-][A-Za-z0-9._:-]*)/g)) {
        const name = m[1];
        if (listed.has(name) || Object.hasOwn(NOT_STORED, name)) continue;
        if (name === 'orbitlab.profile.v1.' || name === 'orbitlab-precache-') continue; // prefixes of listed names
        unknown.add(`${name} (${file})`);
      }
    }
    expect([...unknown], 'a new orbitlab.* string: name it in public/privacy.html if the app stores it, else add it to NOT_STORED with why').toEqual([]);
  });

  it('touches browser storage only through the files the statement was written from', () => {
    // A new file here can store something the page does not describe: read it, then update the page and this list.
    expect(filesUsing(/\b(localStorage|sessionStorage)\b/)).toEqual(['src/workspace/session.ts', 'src/workspace/storage.ts']);
    expect(filesUsing(/\bindexedDB\.open\(/)).toEqual(['src/audio/soundtrack.ts', 'src/workspace/media.ts']);
    expect(filesUsing(/\bcaches\.(open|keys|delete)\(/)).toEqual(['src/provider/data-provider.ts', 'src/pwa/sw-core.ts']);
    for (const file of ['src/audio/soundtrack.ts', 'src/workspace/media.ts']) {
      const names = [...SRC.find((s) => s.file === file)!.text.matchAll(/indexedDB\.open\(([^,)]+)/g)].map((m) => m[1].trim());
      expect(names.length, file).toBeGreaterThan(0);
      for (const n of names as string[]) expect(['DB', 'MEDIA_DATABASE'], `${file} opens ${n}`).toContain(n);
    }
    expect(SRC.find((x) => x.file === 'src/audio/soundtrack.ts')!.raw).toContain(`const DB = '${MEDIA_DATABASE}'`);
  });

  it('sends nothing on its own: no analytics, beacons or sockets, and fetches only from the listed places', () => {
    expect(filesUsing(/sendBeacon|new WebSocket|new EventSource|XMLHttpRequest|document\.cookie/)).toEqual([]);
    // main.ts: the data provider (DATASETS); lesson-mode and worksheet-view: files of the app itself; sw-core: the worker
    expect(filesUsing(/\bfetch\(/)).toEqual(['src/main.ts', 'src/pwa/sw-core.ts', 'src/ui/lessons/lesson-mode.ts', 'src/ui/lessons/worksheet-view.ts']);
    const hosts = new Set(DATASET_IDS.flatMap((id) => DATASETS[id].online?.urls.map((u) => new URL(u).hostname) ?? []));
    expect([...hosts].sort()).toEqual([...DATASET_HOSTS].sort());
    expect([...hosts].sort()).toEqual([...DATA_HOSTS].sort());
    expect(RUNTIME_HOSTS).toContain(new URL(WEB_FONTS_URL).hostname);
    // the page's only outside requests are the web fonts, added in online mode by src/ui/web-fonts.ts
    expect(INDEX.match(/<(?:script|link)\b[^>]*\b(?:src|href)="https?:/g) ?? []).toEqual([]);
  });

  it('itself loads nothing from outside and runs no script', () => {
    expect(PAGE).not.toMatch(/<script\b/i);
    expect(PAGE.match(/\b(?:src|href)="https?:\/\/[^"]+"/g)?.every((m) => m.includes('github.com/ROYIN001/Orbitlab/issues'))).toBe(true);
    expect(PAGE).not.toMatch(/@import|url\(/);
  });

  it('is precached and opens as itself offline, while every other navigation still opens the app', () => {
    expect(precacheable('privacy.html')).toBe(true);
    expect(onDemand('privacy.html')).toBe(false);
    const scope = new URL('https://example.github.io/Orbitlab/');
    const pre = new Set(['index.html', 'privacy.html', 'assets/index-a.js']);
    expect(routeFor(new URL('privacy.html', scope), 'navigate', scope, pre)).toBe('precache');
    expect(routeFor(new URL('privacy.html?x=1#th', scope), 'navigate', scope, pre)).toBe('precache');
    expect(routeFor(new URL('index.html', scope), 'navigate', scope, pre)).toBe('page');
    expect(routeFor(new URL('missing.html', scope), 'navigate', scope, pre)).toBe('page');
    expect(routeFor(new URL('assets/index-a.js', scope), 'navigate', scope, pre)).toBe('page');
    expect(routeFor(scope, 'navigate', scope, pre)).toBe('page');
  });
});
