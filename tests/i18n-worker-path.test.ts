/**
 * EQ-6 step 1 (S09's PR1, the worker path), in the form S09 allows as "keep
 * the worker on static dictionaries" (`plan/S09-eq-identical-output.md:283`).
 *
 * The recheck worker's source graph reaches `src/i18n/index.ts` by two edges:
 * `lessons/text.ts` (`getLang`) and `ui/result-content.ts` (`tFor`, through
 * `lessons/grader.ts`). Today the bundler drops every `src/i18n` module from
 * that worker, as the dictionaries are static, side-effect-free imports and
 * the worker calls nothing that reads them (EO-BUN-1, the 12 worker maps).
 * A loader `import()` (S09's PR3) in a module a worker reaches would not be
 * dropped: it would bring a dictionary chunk into the worker build. So:
 *  - no module a worker reaches holds an `import()` into `src/i18n`, and no
 *    `src/i18n` module a worker reaches holds any `import()`: the loader goes
 *    in a module outside the workers' graph;
 *  - the edges from the workers' graph into `src/i18n` are the two above; a
 *    new one fails here, to be checked with EO-BUN-1 per worker first.
 * Cutting the two edges instead was measured on main `0b7b6e55` (2026-11-26):
 * `text.ts` through a dictionary-free `src/i18n/lang.ts` adds 4 to 53 B of
 * code by layout, as the i18n chunk's export names move; `judgedNote` in its
 * own module adds 141 B and a new `storage-*.js` chunk, with 1 B of precache
 * code left (`reports/EQ-6-i18n-split.md`, "Step 1").
 * Type-only imports are erased and do not count.
 */
import { describe, expect, it } from 'vitest';

// node's modules by dynamic import, as tests/css-motion.test.ts loads them (no @types/node here)
interface FsModule {
  readFileSync(path: string, encoding: 'utf8'): string;
  readdirSync(path: string): string[];
  existsSync(path: string): boolean;
  statSync(path: string): { isDirectory(): boolean; isFile(): boolean };
}
interface PathModule {
  dirname(path: string): string;
  join(...parts: string[]): string;
  relative(from: string, to: string): string;
  resolve(...parts: string[]): string;
}
interface UrlModule {
  fileURLToPath(url: string | URL): string;
}
const load = (id: string): Promise<unknown> => import(/* @vite-ignore */ id);
const { readFileSync, existsSync, readdirSync, statSync } = (await load('node:fs')) as FsModule;
const { dirname, join, relative, resolve } = (await load('node:path')) as PathModule;
const { fileURLToPath } = (await load('node:url')) as UrlModule;

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** The worker entries the app constructs (`new Worker(new URL('./x.worker.ts', import.meta.url))`). */
function workerEntries(): string[] {
  const out = new Set<string>();
  for (const file of walk(SRC).filter((f) => f.endsWith('.ts'))) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/new\s+Worker\(\s*new\s+URL\(\s*['"]([^'"]+)['"]/g)) out.add(resolve(dirname(file), m[1]));
  }
  return [...out].sort();
}

function resolveImport(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null; // packages: no dictionary lives there
  const base = resolve(dirname(from), spec);
  for (const p of [base, `${base}.ts`, join(base, 'index.ts')]) if (existsSync(p) && statSync(p).isFile()) return p;
  throw new Error(`${relative(ROOT, from)}: cannot resolve ${spec}`);
}

/** Runtime imports only: `import type`, and `import { type A, type B }` with every name a type, are erased. */
function runtimeImports(file: string): string[] {
  const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const specs: string[] = [];
  for (const m of text.matchAll(/^\s*(import|export)\s+([^;]*?)\s*from\s*['"]([^'"]+)['"]/gm)) {
    const clause = m[2];
    if (/^type\b/.test(clause)) continue;
    const braces = /^\{([\s\S]*)\}$/.exec(clause.trim());
    if (braces && braces[1].split(',').map((s) => s.trim()).filter(Boolean).every((s) => /^type\s/.test(s))) continue;
    specs.push(m[3]);
  }
  for (const m of text.matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm)) specs.push(m[1]);
  for (const m of text.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
  return specs;
}

/** Every file a worker entry reaches through runtime imports, with the chain to each. */
function graph(entry: string): Map<string, string[]> {
  const seen = new Map<string, string[]>([[entry, [entry]]]);
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift()!;
    for (const spec of runtimeImports(file)) {
      const dep = resolveImport(file, spec);
      if (!dep || seen.has(dep)) continue;
      seen.set(dep, [...seen.get(file)!, dep]);
      queue.push(dep);
    }
  }
  return seen;
}

const I18N = join(SRC, 'i18n');
const inI18n = (f: string): boolean => f.startsWith(`${I18N}/`);

/** The runtime edges from outside `src/i18n` into it, as "importer -> imported". */
const KNOWN_EDGES = [
  'src/lessons/text.ts -> src/i18n/index.ts',
  'src/ui/result-content.ts -> src/i18n/index.ts',
];

function dynamicImports(file: string): string[] {
  const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return [...text.matchAll(/\bimport\(\s*([^)]*?)\s*\)/g)].map((m) => m[1]);
}

describe('EQ-6 step 1: the workers stay on static dictionaries', () => {
  const entries = workerEntries();
  const graphs = new Map(entries.map((e) => [e, graph(e)]));

  it('finds the twelve workers the app constructs', () => {
    expect(entries).toHaveLength(12);
  });

  it.each(entries.map((e) => [relative(ROOT, e), e]))('%s: no import() into or inside the src/i18n modules it reaches', (_name, entry) => {
    const found: string[] = [];
    for (const file of graphs.get(entry)!.keys()) {
      for (const spec of dynamicImports(file)) {
        const literal = /^['"`]([^'"`$]+)['"`]$/.exec(spec)?.[1];
        const target = literal?.startsWith('.') ? resolveImport(file, literal) : null;
        if (inI18n(file) || (target && inI18n(target))) found.push(`${relative(ROOT, file)}: import(${spec})`);
      }
    }
    expect(found).toEqual([]);
  });

  it('the workers reach src/i18n by the two known edges only', () => {
    const edges = new Set<string>();
    for (const g of graphs.values()) {
      for (const file of g.keys()) {
        if (inI18n(file)) continue;
        for (const spec of runtimeImports(file)) {
          const dep = resolveImport(file, spec);
          if (dep && inI18n(dep)) edges.add(`${relative(ROOT, file)} -> ${relative(ROOT, dep)}`);
        }
      }
    }
    expect([...edges].sort()).toEqual(KNOWN_EDGES);
  });

  it('the recheck worker is the one that reaches src/i18n', () => {
    const reaching = entries.filter((e) => [...graphs.get(e)!.keys()].some(inI18n)).map((e) => relative(ROOT, e));
    expect(reaching).toEqual(['src/lessons/recheck.worker.ts']);
  });
});
