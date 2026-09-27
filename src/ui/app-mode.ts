/**
 * Which face of the application is showing.
 *
 * One app, one scene, one simulation: a mode only decides how much of the
 * interface is on screen and who is driving. `home` is the landing page over
 * the live scene, `watch` is the lean-back launch viewer for someone with no
 * background in spaceflight, `explore` is the mission builder in its learning
 * layout and `engineer` is the full workspace (every guidance parameter, the
 * telemetry panel, 6-DOF controls).
 *
 * Since roadmap S01 the app has two axes (docs/ROADMAP-PART2-3.md): a
 * **section** — launch, orbit or build — and a **level** inside it — watch,
 * explore or engineer, the three non-home modes above. The launch simulator is
 * the launch section; orbit and build are the parts being built. A route is
 * a section and a level, or the landing page, which belongs to no section.
 *
 * The route is carried in the URL hash (`#/launch/watch`), so every face can
 * be linked to and the browser's back button moves between them, and the last
 * section and level are remembered for the next visit. The addresses from
 * before the sections (`#/watch`, `#/explore`, `#/engineer`) still open —
 * as the launch section, and the address is rewritten to the new form.
 */
export type AppMode = 'home' | 'watch' | 'explore' | 'engineer';
export const APP_MODES: readonly AppMode[] = ['home', 'watch', 'explore', 'engineer'];

/** S01: the three parts of the program. */
export type AppSection = 'launch' | 'orbit' | 'build';
export const APP_SECTIONS: readonly AppSection[] = ['launch', 'orbit', 'build'];

/** S01: the levels every section offers — the modes other than the landing page. */
export type AppLevel = Exclude<AppMode, 'home'>;
export const APP_LEVELS: readonly AppLevel[] = ['watch', 'explore', 'engineer'];

/** Where the app is: the landing page, or one level of one section. */
export type AppRoute = { section: null; mode: 'home' } | { section: AppSection; mode: AppLevel };
export const HOME_ROUTE: AppRoute = { section: null, mode: 'home' };

/** The level a section opens at when nothing says otherwise. */
export const DEFAULT_LEVEL: AppLevel = 'explore';

export const MODE_STORAGE_KEY = 'orbitlab.mode';
export const SECTION_STORAGE_KEY = 'orbitlab.section';
export interface ModeStore { getItem(key: string): string | null; setItem(key: string, value: string): void }

const isMode = (value: string | null | undefined): value is AppMode => APP_MODES.includes(value as AppMode);
const isLevel = (value: string | null | undefined): value is AppLevel => APP_LEVELS.includes(value as AppLevel);
const isSection = (value: string | null | undefined): value is AppSection => APP_SECTIONS.includes(value as AppSection);

export function route(section: AppSection, mode: AppLevel): AppRoute {
  return { section, mode };
}

export function sameRoute(a: AppRoute, b: AppRoute): boolean {
  return a.section === b.section && a.mode === b.mode;
}

/**
 * The route a location hash names, or null for any other hash.
 *
 * `#/<section>/<level>` and `#/home` are the canonical forms. Also accepted,
 * and rewritten by the caller to the canonical form (`hashForRoute`):
 * a missing slash (`#launch/watch`), any letter case, the pre-S01 addresses
 * `#/watch`, `#/explore` and `#/engineer` (the launch section), and a
 * section alone (`#/orbit`), which opens at `level` — the caller's last
 * level, else `DEFAULT_LEVEL`. Anything else — including the in-page anchors
 * the narrow layout uses (`#setup`, `#viewport`, `#telemetry`) — is not a
 * route and must leave the route alone.
 */
export function routeFromHash(hash: string, level: AppLevel = DEFAULT_LEVEL): AppRoute | null {
  const parts = hash.replace(/^#\/?/, '').toLowerCase().split('/');
  if (parts.length === 1) {
    const [name] = parts;
    if (name === 'home') return HOME_ROUTE;
    if (isLevel(name)) return route('launch', name); // the pre-S01 addresses
    if (isSection(name)) return route(name, level);
    return null;
  }
  if (parts.length === 2) {
    const [section, mode] = parts;
    if (isSection(section) && isLevel(mode)) return route(section, mode);
  }
  return null;
}

export function hashForRoute(r: AppRoute): string {
  return r.section === null ? '#/home' : `#/${r.section}/${r.mode}`;
}

/**
 * The route to open with: the hash wins, then the last section and level.
 *
 * The launch viewer is not restored: it needs a mission picked before it
 * shows anything, so a returning viewer lands on the home page, which leads
 * to it in one press, rather than on an empty viewer. The watch level of the
 * other sections has no such state, and is restored like any other.
 */
export function initialRoute(hash: string, store?: ModeStore): AppRoute {
  const stored = loadRoute(store);
  const fromHash = routeFromHash(hash, stored?.section ? stored.mode as AppLevel : DEFAULT_LEVEL);
  if (fromHash) return fromHash;
  if (!stored || stored.section === null) return HOME_ROUTE;
  if (stored.section === 'launch' && stored.mode === 'watch') return HOME_ROUTE;
  return stored;
}

/**
 * The route last shown, or null. A store written before S01 holds a mode
 * only, which was always the launch simulator's.
 */
export function loadRoute(store?: ModeStore): AppRoute | null {
  try {
    const s = store ?? localStorage;
    const mode = s.getItem(MODE_STORAGE_KEY);
    if (!isMode(mode)) return null;
    if (mode === 'home') return HOME_ROUTE;
    const section = s.getItem(SECTION_STORAGE_KEY);
    return route(isSection(section) ? section : 'launch', mode);
  } catch { return null; }
}

export function saveRoute(r: AppRoute, store?: ModeStore): void {
  try {
    const s = store ?? localStorage;
    s.setItem(MODE_STORAGE_KEY, r.mode);
    // the landing page belongs to no section: the last one is kept for the section links
    if (r.section !== null) s.setItem(SECTION_STORAGE_KEY, r.section);
  } catch { /* preference is optional */ }
}

/**
 * The launch simulator's own mode for a route. Another section covers the
 * launch scene the way the landing page does — nothing of the launch
 * workspace is on screen or takes keys — so to the launch simulator it is
 * the landing page.
 */
export function launchMode(r: AppRoute): AppMode {
  return r.section === 'launch' ? r.mode : 'home';
}

/** The mission builder's layout for a workspace mode. */
export function experienceForMode(mode: AppMode): 'learning' | 'advanced' | null {
  return mode === 'engineer' ? 'advanced' : mode === 'explore' ? 'learning' : null;
}
