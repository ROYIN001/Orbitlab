/**
 * The precache manifest the build writes into `sw.js` (roadmap U03): pure, so
 * the Vite plugin in `vite.config.ts` and tests/pwa.test.ts share it.
 */
export interface PrecacheEntry {
  /** relative to the worker's scope, e.g. `assets/index-3f2a.js` */
  url: string;
  /** content hash: a file is downloaded again only when this changes */
  revision: string;
}

export interface PrecacheManifest {
  /** one hash of every entry's revision: the cache's name */
  version: string;
  entries: PrecacheEntry[];
}

/** What in the build output is not precached: the worker itself, source maps, dotfiles. */
export function precacheable(path: string): boolean {
  return path !== 'sw.js' && !path.endsWith('.map') && !path.split('/').some((part) => part.startsWith('.'));
}

/** A short, stable hash of a string (cyrb53), as hex. */
export function shortHash(text: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

/** The manifest of these files, in a stable order, versioned by every revision in it. */
export function precacheManifest(entries: PrecacheEntry[]): PrecacheManifest {
  const sorted = entries.filter((e) => precacheable(e.url)).sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
  return { version: shortHash(sorted.map((e) => `${e.url}@${e.revision}`).join('\n')), entries: sorted };
}

/** The placeholder `sw.ts` parses its manifest from. */
export const PRECACHE_PLACEHOLDER = '__ORBITLAB_PRECACHE__';

/** Write the manifest over the placeholder in the built worker; throws if it is not there. */
export function injectPrecacheManifest(code: string, manifest: PrecacheManifest): string {
  const re = new RegExp(`(['"\`])${PRECACHE_PLACEHOLDER}\\1`);
  if (!re.test(code)) throw new Error('sw.js: the precache placeholder is missing');
  return code.replace(re, () => JSON.stringify(JSON.stringify(manifest)));
}
