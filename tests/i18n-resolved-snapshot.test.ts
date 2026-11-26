/**
 * EO-I18N-1, the per-PR form carried by EQ-6 step 2 (plan S07 §07.5; S09
 * rules 1 and 7): every key the three dictionaries hold, resolved in en, th
 * and ru, must read exactly as it did on the base the fixture was recorded
 * on. The step moves the six feature modules into per-language files and
 * changes no string; this test is what makes "no string" checkable.
 *
 * Two digests per language, over the sorted union of the keys of en, th and ru:
 * - raw: the dictionary's own entries, in the order the object holds them
 *   (`JSON.stringify(Object.entries(dict))`). A value, a key, the spread
 *   order of the feature modules or a duplicate key overriding another
 *   changes it, even where English fallback would read the same.
 * - resolved: one line per key, `JSON.stringify([key, tFor(lang, key,
 *   params), ...counted])`. Every `{name}` placeholder that the key's value
 *   has in any language is filled with the fixed text `<name>`. A key whose
 *   value contains "|" in any language also goes through `tCountFor` with
 *   counts 0, 1, 2 and 5 (no decimals) and 1.5 (one decimal).
 * Plus one SHA-256 per first key segment ("build", "hud", …) over the three
 * languages' own value and resolved line, so a failure names the area.
 *
 * The fixture is read and compared, never written: a mismatch fails, even
 * under `vitest -u`. With VITE_ORBITLAB_I18N_DUMP=1 the test also writes the
 * full dump (every resolved line, and the digests) under tests/probe/
 * (gitignored) for diffing a base against a head; nothing is committed from it.
 * The dump is written before the comparisons run, so it is there even when
 * they fail.
 *
 * Once merged, this file stays on main until kit 3d's EO-I18N-1 (M-PLAN-018,
 * lane Q) replaces it; the PR that brings the kit's form deletes this one
 * (S18 §18.11). Until then (lane I's proposal; Q, who reviews oracle files,
 * accepts or changes it):
 * - a PR that changes no string (EQ-6's worker-path and loader PRs, typed
 *   keys) leaves it green and does not touch the fixture;
 * - a PR that adds or changes strings is not identical-output (S07 §07.5) and
 *   re-records the fixture in the same PR. It writes the dump on its merge
 *   base and on its head and attaches the diff of the two: only its own keys
 *   may appear, which shows that every other key reads as before. It then
 *   copies the head's snapshot.json into the fixture, with `_recorded` naming
 *   the merge base and the PR. L-C reads the diff; Q reviews the fixture.
 */
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';
import { tCountFor, tFor, type Lang } from '../src/i18n';
import recorded from './fixtures/i18n/eo-i18n-1.json';

const LANGS: readonly Lang[] = ['en', 'th', 'ru'];
const DICTS: Record<Lang, Record<string, string>> = { en, ru, th };
/** [count, decimals] for every value with plural forms. */
const COUNTS: readonly (readonly [number, number])[] = [[0, 0], [1, 0], [2, 0], [5, 0], [1.5, 1]];
const PLACEHOLDER = /\{(\w+)\}/g;

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const KEYS = [...new Set(LANGS.flatMap((lang) => Object.keys(DICTS[lang])))].sort();

function values(key: string): string[] {
  return LANGS.map((lang) => DICTS[lang][key]).filter((v): v is string => typeof v === 'string');
}

/** The same fixed parameters for a key in every language. */
function params(key: string): Record<string, string> | undefined {
  const names = [...new Set(values(key).flatMap((v) => [...v.matchAll(PLACEHOLDER)].map((m) => m[1])))].sort();
  return names.length ? Object.fromEntries(names.map((name) => [name, `<${name}>`])) : undefined;
}

function resolvedLine(lang: Lang, key: string): string {
  const counted = values(key).some((v) => v.includes('|'))
    ? COUNTS.map(([count, digits]) => tCountFor(lang, key, count, digits))
    : [];
  return JSON.stringify([key, tFor(lang, key, params(key)), ...counted]);
}

interface Snapshot {
  unionKeys: number;
  languages: Record<string, { keys: number; ownKeys: number; raw: string; resolved: string }>;
  segments: Record<string, string>;
}

async function snapshot(): Promise<{ snap: Snapshot; lines: Record<string, string[]> }> {
  const lines: Record<string, string[]> = {};
  const languages: Snapshot['languages'] = {};
  for (const lang of LANGS) {
    lines[lang] = KEYS.map((key) => resolvedLine(lang, key));
    languages[lang] = {
      keys: KEYS.length,
      ownKeys: Object.keys(DICTS[lang]).length,
      raw: await sha256(JSON.stringify(Object.entries(DICTS[lang]))),
      resolved: await sha256(lines[lang].join('\n')),
    };
  }
  const bySegment = new Map<string, string[]>();
  KEYS.forEach((key, i) => {
    const segment = key.split('.')[0];
    const rows = bySegment.get(segment) ?? [];
    for (const lang of LANGS) rows.push(JSON.stringify([lang, key, DICTS[lang][key] ?? null, lines[lang][i]]));
    bySegment.set(segment, rows);
  });
  const segments: Record<string, string> = {};
  for (const segment of [...bySegment.keys()].sort()) segments[segment] = await sha256(bySegment.get(segment)!.join('\n'));
  return { snap: { unionKeys: KEYS.length, languages, segments }, lines };
}

/** tsconfig types only `vite/client` (no @types/node), so node:fs is loaded untyped. */
async function writeDump(snap: Snapshot, lines: Record<string, string[]>): Promise<void> {
  const name = 'node:fs';
  const fs = (await import(/* @vite-ignore */ name)) as {
    mkdirSync(path: URL, options: { recursive: true }): void;
    writeFileSync(path: URL, data: string): void;
  };
  const dir = new URL('./probe/eo-i18n-1/', import.meta.url);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(new URL('snapshot.json', dir), `${JSON.stringify(snap, null, 2)}\n`);
  for (const lang of LANGS) {
    fs.writeFileSync(new URL(`${lang}.resolved.jsonl`, dir), `${lines[lang].join('\n')}\n`);
    fs.writeFileSync(new URL(`${lang}.raw.jsonl`, dir), `${Object.entries(DICTS[lang]).map((e) => JSON.stringify(e)).join('\n')}\n`);
  }
}

describe('EO-I18N-1: every key in en, th and ru resolves as it did on the recorded base', async () => {
  const { snap, lines } = await snapshot();
  if (import.meta.env.VITE_ORBITLAB_I18N_DUMP === '1') await writeDump(snap, lines);

  it('holds the same number of keys in each language', () => {
    expect(snap.unionKeys).toBe(recorded.unionKeys);
    for (const lang of LANGS) {
      expect([snap.languages[lang].keys, snap.languages[lang].ownKeys], lang)
        .toEqual([recorded.languages[lang].keys, recorded.languages[lang].ownKeys]);
    }
  });

  it('has the same own entries, in the same order, in each language (raw)', () => {
    for (const lang of LANGS) expect(snap.languages[lang].raw, lang).toBe(recorded.languages[lang].raw);
  });

  it('resolves every key to the same text in each language (resolved)', () => {
    for (const lang of LANGS) expect(snap.languages[lang].resolved, lang).toBe(recorded.languages[lang].resolved);
  });

  it('has the same digest for every first key segment', () => {
    expect(snap.segments).toEqual(recorded.segments);
  });
});
