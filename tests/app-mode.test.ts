import { describe, expect, it } from 'vitest';
import {
  APP_LEVELS, APP_SECTIONS, HOME_ROUTE, MODE_STORAGE_KEY, SECTION_STORAGE_KEY, experienceForMode, hashForRoute, initialRoute,
  launchMode, loadRoute, route, routeFromHash, sameRoute, saveRoute, type AppRoute, type ModeStore,
} from '../src/ui/app-mode';

function memory(entries: Record<string, string> = {}): ModeStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(entries));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); } };
}

const ALL_ROUTES: AppRoute[] = [HOME_ROUTE, ...APP_SECTIONS.flatMap((s) => APP_LEVELS.map((l) => route(s, l)))];

describe('app routes (S01: section × level)', () => {
  it('round-trips every route through the URL hash', () => {
    expect(ALL_ROUTES).toHaveLength(10);
    for (const r of ALL_ROUTES) expect(routeFromHash(hashForRoute(r))).toEqual(r);
    expect(hashForRoute(HOME_ROUTE)).toBe('#/home');
    expect(hashForRoute(route('orbit', 'engineer'))).toBe('#/orbit/engineer');
  });

  it('opens the pre-section addresses as the launch section', () => {
    // U01 mission links, bookmarks and the README all carry these
    expect(routeFromHash('#/watch')).toEqual(route('launch', 'watch'));
    expect(routeFromHash('#/explore')).toEqual(route('launch', 'explore'));
    expect(routeFromHash('#/engineer')).toEqual(route('launch', 'engineer'));
    expect(routeFromHash('#watch')).toEqual(route('launch', 'watch'));
    expect(routeFromHash('#/ENGINEER')).toEqual(route('launch', 'engineer'));
    // …and the caller rewrites them to the one canonical form
    expect(hashForRoute(routeFromHash('#/watch')!)).toBe('#/launch/watch');
  });

  it('accepts a missing slash, any case, and a section alone', () => {
    expect(routeFromHash('#launch/watch')).toEqual(route('launch', 'watch'));
    expect(routeFromHash('#/Orbit/Watch')).toEqual(route('orbit', 'watch'));
    expect(routeFromHash('#/orbit')).toEqual(route('orbit', 'explore'));
    expect(routeFromHash('#/build', 'engineer')).toEqual(route('build', 'engineer'));
    expect(routeFromHash('#home')).toEqual(HOME_ROUTE);
  });

  it('ignores the in-page anchors of the narrow layout and anything else', () => {
    for (const hash of ['', '#', '#setup', '#viewport', '#telemetry', '#/astronaut', '#/watch/extra',
      '#/home/watch', '#/launch/home', '#/orbit/', '#/launch/watch/1', '#/moon/watch']) {
      expect(routeFromHash(hash)).toBeNull();
    }
  });

  it('opens on the hash first, then the last section and level, else the home page', () => {
    expect(initialRoute('#/engineer', memory({ [MODE_STORAGE_KEY]: 'explore' }))).toEqual(route('launch', 'engineer'));
    expect(initialRoute('#/orbit/watch', memory({ [MODE_STORAGE_KEY]: 'explore' }))).toEqual(route('orbit', 'watch'));
    expect(initialRoute('', memory({ [MODE_STORAGE_KEY]: 'explore' }))).toEqual(route('launch', 'explore'));
    expect(initialRoute('', memory({ [MODE_STORAGE_KEY]: 'engineer' }))).toEqual(route('launch', 'engineer'));
    expect(initialRoute('', memory({ [MODE_STORAGE_KEY]: 'engineer', [SECTION_STORAGE_KEY]: 'build' }))).toEqual(route('build', 'engineer'));
    // the viewer needs a launch picked, so a returning viewer lands on the home page…
    expect(initialRoute('', memory({ [MODE_STORAGE_KEY]: 'watch' }))).toEqual(HOME_ROUTE);
    expect(initialRoute('', memory({ [MODE_STORAGE_KEY]: 'watch', [SECTION_STORAGE_KEY]: 'launch' }))).toEqual(HOME_ROUTE);
    // …which the other sections' watch level does not need
    expect(initialRoute('', memory({ [MODE_STORAGE_KEY]: 'watch', [SECTION_STORAGE_KEY]: 'orbit' }))).toEqual(route('orbit', 'watch'));
    expect(initialRoute('', memory({ [MODE_STORAGE_KEY]: 'home', [SECTION_STORAGE_KEY]: 'orbit' }))).toEqual(HOME_ROUTE);
    expect(initialRoute('', memory({ [MODE_STORAGE_KEY]: 'stale' }))).toEqual(HOME_ROUTE);
    expect(initialRoute('', memory({ [MODE_STORAGE_KEY]: 'explore', [SECTION_STORAGE_KEY]: 'moon' }))).toEqual(route('launch', 'explore'));
    expect(initialRoute('#setup', memory())).toEqual(HOME_ROUTE);
    // a section alone opens at the last level
    expect(initialRoute('#/orbit', memory({ [MODE_STORAGE_KEY]: 'engineer', [SECTION_STORAGE_KEY]: 'launch' }))).toEqual(route('orbit', 'engineer'));
    expect(initialRoute('#/orbit', memory({ [MODE_STORAGE_KEY]: 'home' }))).toEqual(route('orbit', 'explore'));
  });

  it('remembers the route under its own keys only, and survives denied storage', () => {
    const store = memory({ 'orbitlab.lang': 'th', 'orbitlab.experience': 'advanced' });
    saveRoute(route('orbit', 'explore'), store);
    expect(loadRoute(store)).toEqual(route('orbit', 'explore'));
    // the landing page keeps the last section for the section links
    saveRoute(HOME_ROUTE, store);
    expect(loadRoute(store)).toEqual(HOME_ROUTE);
    expect(store.data.get(SECTION_STORAGE_KEY)).toBe('orbit');
    expect(store.data.get('orbitlab.lang')).toBe('th');
    expect(store.data.get('orbitlab.experience')).toBe('advanced');
    expect([...store.data.keys()].sort()).toEqual(['orbitlab.experience', 'orbitlab.lang', MODE_STORAGE_KEY, SECTION_STORAGE_KEY].sort());
    const denied: ModeStore = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(loadRoute(denied)).toBeNull();
    expect(() => saveRoute(route('launch', 'watch'), denied)).not.toThrow();
    expect(initialRoute('', denied)).toEqual(HOME_ROUTE);
    expect(initialRoute('#/build/watch', denied)).toEqual(route('build', 'watch'));
  });

  it('reads a store written before the sections as the launch section', () => {
    expect(loadRoute(memory({ [MODE_STORAGE_KEY]: 'engineer' }))).toEqual(route('launch', 'engineer'));
  });

  it('shows the launch simulator only in its own section', () => {
    for (const level of APP_LEVELS) {
      expect(launchMode(route('launch', level))).toBe(level);
      // another section covers the scene the way the landing page does
      expect(launchMode(route('orbit', level))).toBe('home');
      expect(launchMode(route('build', level))).toBe('home');
    }
    expect(launchMode(HOME_ROUTE)).toBe('home');
  });

  it('compares routes by value', () => {
    expect(sameRoute(route('orbit', 'watch'), routeFromHash('#/orbit/watch')!)).toBe(true);
    expect(sameRoute(route('orbit', 'watch'), route('build', 'watch'))).toBe(false);
    expect(sameRoute(HOME_ROUTE, { section: null, mode: 'home' })).toBe(true);
  });

  it('maps the workspace modes onto the mission builder layouts', () => {
    expect(experienceForMode('explore')).toBe('learning');
    expect(experienceForMode('engineer')).toBe('advanced');
    expect(experienceForMode('home')).toBeNull();
    expect(experienceForMode('watch')).toBeNull();
  });
});
