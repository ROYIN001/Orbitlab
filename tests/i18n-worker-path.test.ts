/**
 * EQ-6 step 1 (S09's PR1, the worker path), in the form S09 allows as "keep
 * the worker on static dictionaries" (`plan/S09-eq-identical-output.md:283`).
 *
 * The recheck worker's source graph reaches `src/i18n/index.ts` by two edges:
 * `lessons/text.ts` (`getLang`) and `ui/result-content.ts` (`tFor`, through
 * `lessons/grader.ts`). Today the bundler drops every `src/i18n` module from
 * that worker, as the dictionaries are static, side-effect-free imports and
 * the worker calls nothing that reads them (EO-BUN-1, the 12 worker maps).
 * A dictionary loader (S09's PR3) in a module a worker reaches would not be
 * dropped: an `import()` or an `import.meta.glob` there brings dictionary
 * chunks, or the dictionaries themselves, into the worker build. So:
 *  - every worker is constructed as `new Worker(new URL('<literal>', import.meta.url))`,
 *    and no module imports a `?worker` or `?sharedworker` URL, so the walk
 *    below sees every worker;
 *  - the modules a worker reaches hold no dynamic import (`import()` or
 *    `import.meta.glob`) but the two JSON loads listed below: the loader
 *    goes in a module outside the workers' graph;
 *  - the edges from the workers' graph into `src/i18n` are the two above; a
 *    new one fails here, to be checked with EO-BUN-1 per worker first.
 * Cutting the two edges instead was measured on main `0b7b6e55` (2026-11-26):
 * `text.ts` through a dictionary-free `src/i18n/lang.ts` adds 4 to 53 B of
 * code by layout, as the i18n chunk's export names move; `judgedNote` in its
 * own module adds 141 B and a new `storage-*.js` chunk, with 1 B of precache
 * code left (`reports/EQ-6-i18n-split.md`, "Step 1").
 *
 * The files are parsed with the bundler's own parser (`parseAst`, oxc), so
 * comments, strings and multi-line statements are read as the build reads
 * them. Type-only imports and exports are erased and do not count.
 */
import { describe, expect, it } from 'vitest';
import { parseAst } from 'vite';

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
const I18N = join(SRC, 'i18n');
const rel = (f: string): string => relative(ROOT, f);
const inI18n = (f: string): boolean => f.startsWith(`${I18N}/`);

/** The dynamic imports a worker's graph may hold today: data loaded on first use, no dictionary. */
const ALLOWED_DYNAMIC = [
  "src/orbit/visibility.ts: import('../data/standard-magnitudes.json')",
  "src/physics/propagator/activity.ts: import('../../data/solar-daily.json')",
];
/** The runtime edges from outside `src/i18n` into it, as "importer -> imported". */
const KNOWN_EDGES = [
  'src/lessons/text.ts -> src/i18n/index.ts',
  'src/ui/result-content.ts -> src/i18n/index.ts',
];

type Node = { type: string; [key: string]: unknown };
const isNode = (v: unknown): v is Node => typeof v === 'object' && v !== null && typeof (v as Node).type === 'string';

function walkNodes(node: unknown, visit: (n: Node) => void): void {
  if (Array.isArray(node)) { for (const item of node) walkNodes(item, visit); return; }
  if (!isNode(node)) return;
  visit(node);
  for (const [key, value] of Object.entries(node)) if (key !== 'type' && typeof value === 'object') walkNodes(value, visit);
}

const literal = (n: unknown): string | null => (isNode(n) && n.type === 'Literal' && typeof n.value === 'string' ? n.value : null);
const source = (text: string, n: Node): string => text.slice(n.start as number, n.end as number);
const isImportMeta = (n: unknown): boolean => isNode(n) && n.type === 'MetaProperty' && (n.meta as Node).name === 'import' && (n.property as Node).name === 'meta';

interface Parsed {
  /** specifiers of static imports and re-exports that survive type erasure */
  imports: string[];
  /** `import()` and `import.meta.glob(...)`, as written, with the literal specifier of an `import()` when it has one */
  dynamic: { text: string; specifier: string | null }[];
  /** `new Worker(...)` / `new SharedWorker(...)`: the literal URL when in the `new URL('<literal>', import.meta.url)` form, else null */
  workers: (string | null)[];
}

const parsedCache = new Map<string, Parsed>();
function parse(file: string): Parsed {
  const cached = parsedCache.get(file);
  if (cached) return cached;
  const text = readFileSync(file, 'utf8');
  const ast = parseAst(text, { lang: 'ts' }) as unknown as { body: Node[] };
  const out: Parsed = { imports: [], dynamic: [], workers: [] };
  for (const stmt of ast.body) {
    const spec = literal(stmt.source);
    if (spec === null) continue;
    if (stmt.type === 'ImportDeclaration') {
      if (stmt.importKind === 'type') continue;
      const specs = stmt.specifiers as Node[];
      if (specs.length > 0 && specs.every((s) => s.type === 'ImportSpecifier' && s.importKind === 'type')) continue;
      out.imports.push(spec);
    } else if (stmt.type === 'ExportNamedDeclaration' || stmt.type === 'ExportAllDeclaration') {
      if (stmt.exportKind === 'type') continue;
      const specs = (stmt.specifiers as Node[] | undefined) ?? [];
      if (specs.length > 0 && specs.every((s) => s.exportKind === 'type')) continue;
      out.imports.push(spec);
    }
  }
  walkNodes(ast.body, (n) => {
    if (n.type === 'ImportExpression') out.dynamic.push({ text: source(text, n), specifier: literal(n.source) });
    if (n.type === 'CallExpression') {
      const callee = n.callee as Node;
      if (callee.type === 'MemberExpression' && isImportMeta(callee.object) && (callee.property as Node).name === 'glob') {
        out.dynamic.push({ text: source(text, n), specifier: null });
      }
    }
    if (n.type === 'NewExpression') {
      const callee = n.callee as Node;
      if (callee.type !== 'Identifier' || (callee.name !== 'Worker' && callee.name !== 'SharedWorker')) return;
      const url = (n.arguments as Node[])[0];
      const args = isNode(url) && url.type === 'NewExpression' && (url.callee as Node).name === 'URL' ? (url.arguments as Node[]) : [];
      const meta = args[1];
      const metaUrl = isNode(meta) && meta.type === 'MemberExpression' && isImportMeta(meta.object) && (meta.property as Node).name === 'url';
      out.workers.push(metaUrl ? literal(args[0]) : null);
    }
  });
  parsedCache.set(file, out);
  return out;
}

function walkDir(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walkDir(p) : [p];
  });
}
const SOURCES = walkDir(SRC).filter((f) => f.endsWith('.ts')).sort();

function resolveImport(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null; // packages: no dictionary lives there
  const base = resolve(dirname(from), spec);
  for (const p of [base, `${base}.ts`, join(base, 'index.ts')]) if (existsSync(p) && statSync(p).isFile()) return p;
  throw new Error(`${rel(from)}: cannot resolve ${spec}`);
}

/** The worker entries the app constructs. */
function workerEntries(): string[] {
  const out = new Set<string>();
  for (const file of SOURCES) for (const url of parse(file).workers) if (url) out.add(resolve(dirname(file), url));
  return [...out].sort();
}

/** Every file a worker entry reaches through runtime imports, static and literal dynamic. */
function graph(entry: string): Set<string> {
  const seen = new Set<string>([entry]);
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift()!;
    if (!file.endsWith('.ts')) continue; // JSON and other assets import nothing
    const p = parse(file);
    const specs = [...p.imports, ...p.dynamic.flatMap((d) => (d.specifier ? [d.specifier] : []))];
    for (const spec of specs) {
      const dep = resolveImport(file, spec);
      if (!dep || seen.has(dep)) continue;
      seen.add(dep);
      queue.push(dep);
    }
  }
  return seen;
}

describe('EQ-6 step 1: the workers stay on static dictionaries', () => {
  const entries = workerEntries();
  const graphs = new Map(entries.map((e) => [e, graph(e)]));

  it('finds the twelve workers, every one in the new Worker(new URL(<literal>, import.meta.url)) form', () => {
    const other = SOURCES.flatMap((f) => (parse(f).workers.some((u) => u === null) ? [rel(f)] : []));
    const workerUrls = SOURCES.flatMap((f) => parse(f).imports.filter((s) => /\?(shared)?worker\b/.test(s)).map((s) => `${rel(f)}: ${s}`));
    expect({ other, workerUrls }).toEqual({ other: [], workerUrls: [] });
    expect(entries).toHaveLength(12);
  });

  it.each(entries.map((e) => [rel(e), e]))('%s: no dynamic import in its graph but the two JSON loads', (_name, entry) => {
    const found: string[] = [];
    for (const file of graphs.get(entry)!) {
      if (!file.endsWith('.ts')) continue;
      for (const d of parse(file).dynamic) found.push(`${rel(file)}: ${d.text.replace(/\s+/g, ' ')}`);
    }
    const unexpected = found.filter((f) => !ALLOWED_DYNAMIC.includes(f));
    expect(unexpected).toEqual([]);
  });

  it('the workers reach src/i18n by the two known edges only', () => {
    const edges = new Set<string>();
    for (const g of graphs.values()) {
      for (const file of g) {
        if (inI18n(file) || !file.endsWith('.ts')) continue;
        const p = parse(file);
        for (const spec of [...p.imports, ...p.dynamic.flatMap((d) => (d.specifier ? [d.specifier] : []))]) {
          const dep = resolveImport(file, spec);
          if (dep && inI18n(dep)) edges.add(`${rel(file)} -> ${rel(dep)}`);
        }
      }
    }
    expect([...edges].sort()).toEqual(KNOWN_EDGES);
  });

  it('the recheck worker is the one that reaches src/i18n', () => {
    const reaching = entries.filter((e) => [...graphs.get(e)!].some(inI18n)).map(rel);
    expect(reaching).toEqual(['src/lessons/recheck.worker.ts']);
  });

  it('the allowed dynamic imports are still there (the list does not go stale)', () => {
    const all = new Set<string>();
    for (const g of graphs.values()) for (const file of g) {
      if (!file.endsWith('.ts')) continue;
      for (const d of parse(file).dynamic) all.add(`${rel(file)}: ${d.text.replace(/\s+/g, ' ')}`);
    }
    expect(ALLOWED_DYNAMIC.filter((a) => !all.has(a))).toEqual([]);
  });
});
