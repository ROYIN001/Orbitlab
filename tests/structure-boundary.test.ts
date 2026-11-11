/**
 * The Structure section is a part of its own (src/structure/env.ts): its
 * code loads as one chunk the first time the section opens, and the app's
 * other chunks stay as they are. That holds only while two rules do, checked
 * here over the source text:
 *
 *  1. A file of the section imports, at run time, nothing but `three` and
 *     other files of the section. What it needs of the app it is given
 *     (`StructureEnv`). Type-only imports are free: they leave no code.
 *  2. No file of the app imports a file of the section at run time, except
 *     the one dynamic import that loads it (src/ui/structure-loader.ts). The
 *     app's side of the section (src/structure-host, the loader) uses its
 *     types only.
 *
 * The section's files: src/structure/**, src/ui/structure/**,
 * src/render/structure-*.ts and src/render/edusat-model.ts.
 *
 * A broken rule does not break the app: it moves code. Rule 1 broken, the
 * bundler pulls the app's modules the section now reaches out of the app's
 * chunks into new shared ones (measured: docs/development/reports/structure-assembly-pilot.md §8);
 * rule 2 broken, the section's code lands in the app's first download.
 * Either way budgets.json's groups no longer mean what they say.
 */
import { describe, expect, it } from 'vitest';
import { STRUCTURE_STORE_KEY } from '../src/structure/progress';
import { STRUCTURE_PROFILE_KEY } from '../src/ui/structure-loader';
import { WORKSPACE_KEYS } from '../src/workspace/registry';

const SRC = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const FILES = Object.entries(SRC).map(([p, text]) => ({ file: p.replace(/^\.\.\/src\//, ''), text }));

/** A path relative to src/ (with or without its extension) is one of the section's files. */
export const inSection = (p: string): boolean =>
  p.startsWith('structure/') || p.startsWith('ui/structure/') || /^render\/(?:structure-[^/]+|edusat-model)(?:\.ts)?$/.test(p);

/** The section's one way in, and the file that takes it. */
const LOADER = 'ui/structure-loader.ts';
const ENTRY = 'ui/structure/structure';

/** Comments blanked out (strings kept: the specifiers are strings). */
function withoutComments(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i], n = text[i + 1];
    if (c === '/' && n === '/') { while (i < text.length && text[i] !== '\n') i++; }
    else if (c === '/' && n === '*') { const end = text.indexOf('*/', i + 2); i = end < 0 ? text.length : end + 2; }
    else if (c === '\'' || c === '"' || c === '`') {
      let j = i + 1;
      while (j < text.length && text[j] !== c && !(c !== '`' && text[j] === '\n')) j += text[j] === '\\' ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
    } else { out += c; i++; }
  }
  return out;
}

/** A relative specifier resolved against the importing file, as a path relative to src/; null for a package. */
function resolve(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const parts = from.split('/').slice(0, -1);
  for (const seg of spec.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.' && seg !== '') parts.push(seg);
  }
  return parts.join('/');
}

export interface Import { spec: string; kind: 'static' | 'dynamic'; typeOnly: boolean }

/**
 * Every import of a module: `import … from`, `export … from`, `import '…'`
 * and `import('…')`. Type-only: `import type`, `export type`, a clause whose
 * every name is marked `type`, and `typeof import('…')` or an `import('…')`
 * used as a type (`import('…').Name`).
 */
export function importsOf(text: string): Import[] {
  const code = withoutComments(text);
  const found: Import[] = [];
  for (const m of code.matchAll(/\b(?:import|export)\s+(type\s+)?([^'";]*?)\bfrom\s*(['"])([^'"\n]+)\3/g)) {
    const clause = m[2].trim();
    const braces = /^\{([^}]*)\}$/.exec(clause);
    const names = braces ? braces[1].split(',').map((s) => s.trim()).filter(Boolean) : null;
    const allTyped = !!names && names.length > 0 && names.every((n) => n.startsWith('type '));
    found.push({ spec: m[4], kind: 'static', typeOnly: !!m[1] || allTyped });
  }
  for (const m of code.matchAll(/\bimport\s*(['"])([^'"\n]+)\1/g)) found.push({ spec: m[2], kind: 'static', typeOnly: false });
  for (const m of code.matchAll(/(typeof\s+)?\bimport\s*\(\s*(['"])([^'"\n]+)\2\s*\)(\s*\.\s*[A-Z])?/g)) {
    found.push({ spec: m[3], kind: 'dynamic', typeOnly: !!m[1] || !!m[4] });
  }
  return found;
}

describe('the Structure section is a part of its own', () => {
  it('reads the files it is supposed to scan', () => {
    const section = FILES.filter((f) => inSection(f.file)).map((f) => f.file);
    expect(section.length).toBeGreaterThan(12);
    for (const must of ['structure/assembly.ts', 'structure/env.ts', 'ui/structure/structure.ts', 'render/structure-viewer.ts', 'render/edusat-model.ts']) expect(section).toContain(must);
    expect(inSection(LOADER)).toBe(false);
    expect(inSection('structure-host/handoff.ts')).toBe(false);
    expect(FILES.some((f) => f.file === LOADER)).toBe(true);
  });

  it('imports nothing of the app at run time: only three and its own files', () => {
    const bad: string[] = [];
    for (const { file, text } of FILES) {
      if (!inSection(file)) continue;
      for (const i of importsOf(text)) {
        if (i.typeOnly) continue;
        const to = resolve(file, i.spec);
        if (to === null ? i.spec !== 'three' : !inSection(to)) bad.push(`${file} -> ${i.spec}`);
      }
    }
    expect(bad, 'the section must be given this through StructureEnv (src/ui/structure/env.ts), not import it').toEqual([]);
  });

  it('is imported by the app only as types, and loaded by one dynamic import', () => {
    const bad: string[] = [];
    const ways: string[] = [];
    for (const { file, text } of FILES) {
      if (inSection(file)) continue;
      for (const i of importsOf(text)) {
        const to = resolve(file, i.spec);
        if (to === null || !inSection(to) || i.typeOnly) continue;
        if (file === LOADER && i.kind === 'dynamic' && to === ENTRY) ways.push(`${file} -> ${i.spec}`);
        else bad.push(`${file} -> ${i.spec}`);
      }
    }
    expect(bad, 'a run-time import of the section from the app puts the section\'s code in the app\'s first download').toEqual([]);
    expect(ways).toEqual([`${LOADER} -> ./structure/structure`]);
  });

  it('keeps its record under the key the profile lists', () => {
    // the app's side cannot import the section's constant (rule 2): the two are held equal here
    expect(STRUCTURE_PROFILE_KEY).toBe(STRUCTURE_STORE_KEY);
    expect(WORKSPACE_KEYS as readonly string[]).toContain(STRUCTURE_STORE_KEY);
  });

  it('tells a type-only import from one that leaves code', () => {
    const got = importsOf([
      'import type { A } from \'./a\';',
      'import { type B, type C } from "./b";',
      'import { type D, e } from \'./d\';',
      'import F from \'./f\';',
      'import * as G from \'./g\';',
      'export type { H } from \'./h\';',
      'export { i } from \'./i\';',
      'import \'./j.css\';',
      'const k = () => import(\'./k\');',
      'type L = typeof import(\'./l\');',
      'let m: import(\'./m\').Name;',
      '// import { n } from \'./n\';',
      '/* import(\'./o\') */',
    ].join('\n'));
    expect(got.map((i) => `${i.spec}:${i.kind}:${i.typeOnly ? 'type' : 'code'}`).sort()).toEqual([
      './a:static:type', './b:static:type', './d:static:code', './f:static:code', './g:static:code', './h:static:type', './i:static:code',
      './j.css:static:code', './k:dynamic:code', './l:dynamic:type', './m:dynamic:type',
    ]);
  });
});
