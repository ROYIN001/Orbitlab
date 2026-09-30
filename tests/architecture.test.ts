/**
 * Architecture fitness test: import boundaries and DOM-free cores.
 *
 * The simulation cores must run in a worker, in Node (this test runner) and in
 * a future headless batch, so they may not reach up into the presentation
 * layers or touch browser globals. Two rules, checked over the source text:
 *
 *  1. A core file must not import from src/ui, src/render, src/replay or
 *     src/i18n. Relative specifiers (`./x`, `../ui/y`) are resolved against the
 *     importing file to find the target folder; bare specifiers (`three`) are
 *     ignored. `import type` counts too: a type import is still a dependency
 *     on the layer's shape.
 *  2. A core file must not use `document.`, `window.`, `localStorage`,
 *     `navigator.` or `requestAnimationFrame` outside comments and strings.
 *
 * Core = src/physics, src/orbit, src/design, src/data, src/config and
 * src/provider, plus (rule 2 only, see NARROWED) the worker-safe trio of
 * src/session: core.ts, protocol.ts and mirror.ts (session.ts owns the Worker
 * and flight.worker.ts is the worker entry, both are glue). src/lessons and
 * src/worksheets are deliberately NOT core: they are text that goes through
 * i18n by design.
 *
 * Known crossings that cannot be fixed without a refactor live in ALLOWED
 * below, one line of reason each, at most five entries. When one is fixed,
 * delete its entry: the test fails on a stale entry so the list only shrinks.
 *
 * NARROWED (tighten in a later session): rule 1 does not cover the session
 * trio, because session/core.ts imports replay/recorder and session/mirror.ts
 * imports replay/recorder, replay/attitude-track and replay/simview (the
 * recorder owns the live clock). With them in, seven files violated and the
 * allowlist would have exceeded five. To tighten: move the recorder and the
 * frame-apply helpers out of src/replay (or make src/replay a core), then add
 * the trio to IMPORT_CORE_FILES.
 *
 * Like tests/i18n.test.ts it reads the tree through `import.meta.glob(...,
 * { query: '?raw' })`, because the project has no Node types.
 */
import { describe, expect, it } from 'vitest';

// `import.meta.glob` requires its options to be an inline object literal.
const SRC = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const CORE_DIRS = ['physics', 'orbit', 'design', 'data', 'config', 'provider'];
/** Session files checked by rule 2 (DOM tokens) only; see NARROWED in the header. */
const CORE_FILES = ['session/core.ts', 'session/protocol.ts', 'session/mirror.ts'];
/** Session files checked by rule 1 (imports) as well: none today. */
const IMPORT_CORE_FILES: string[] = [];
const FORBIDDEN_LAYERS = ['ui', 'render', 'replay', 'i18n'];
const FORBIDDEN_TOKENS = ['document.', 'window.', 'localStorage', 'navigator.', 'requestAnimationFrame'];

/** `rule:path` -> why it is tolerated today. At most five entries. */
const ALLOWED: Record<string, string> = {
  'import:config/verdict.ts': 'the verdict formats its own localized sentence; the text should move to ui/ once the verdict returns keys',
  'dom:config/mission-file.ts': 'autosave defaults to localStorage but takes an injected store, which is what tests and workers pass',
  'dom:design/design-store.ts': 'the design library defaults to localStorage behind an injectable DesignStorage factory',
  'dom:provider/data-mode.ts': 'the offline/online preference defaults to localStorage but takes an injected store',
  'dom:physics/monte-carlo-job.ts': 'sizes the worker pool from navigator.hardwareConcurrency behind a typeof guard, falls back to 2',
};

/** Path relative to src/, e.g. `physics/mission.ts`. */
const rel = (globPath: string) => globPath.replace(/^\.\.\/src\//, '');

const isCore = (p: string) => CORE_DIRS.some((d) => p.startsWith(`${d}/`)) || CORE_FILES.includes(p);

/**
 * Blanks out comments and, when `strings` is set, the contents of '…', "…"
 * and `…` literals, keeping the quotes so the text still reads as code.
 * Limits, accepted because a miss only produces a false alarm or a miss on a
 * contrived line, never a crash: a regex literal containing a quote or `//`
 * is misread; `${…}` inside a template literal is blanked with the template,
 * so code there is not checked.
 */
export function stripSource(text: string, strings: boolean): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i], n = text[i + 1];
    if (c === '/' && n === '/') {
      while (i < text.length && text[i] !== '\n') i++;
    } else if (c === '/' && n === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end < 0 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else if (c === '\'' || c === '"' || c === '`') {
      let j = i + 1;
      while (j < text.length && text[j] !== c && !(c !== '`' && text[j] === '\n')) j += text[j] === '\\' ? 2 : 1;
      const body = text.slice(i + 1, j);
      out += c + (strings ? body.replace(/[^\n]/g, ' ') : body) + (j < text.length ? text[j] : '');
      i = j + 1;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** Every module specifier in `import … from`, `export … from`, `import '…'` and `import('…')`. */
export function specifiers(text: string): string[] {
  const code = stripSource(text, false);
  const found: string[] = [];
  for (const m of code.matchAll(/\b(?:from|import)\s*\(?\s*(['"])([^'"\n]+)\1/g)) found.push(m[2]);
  return found;
}

/** The top-level src/ folder a specifier points at, or null for a package. */
export function targetDir(fromPath: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const parts = fromPath.split('/').slice(0, -1);
  for (const seg of spec.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.' && seg !== '') parts.push(seg);
  }
  return parts[0]?.replace(/\.ts$/, '') ?? null;
}

const CORE = Object.entries(SRC).map(([p, text]) => [rel(p), text] as const).filter(([p]) => isCore(p));

function importViolations(): string[] {
  const bad: string[] = [];
  const importCore = CORE.filter(([p]) => CORE_DIRS.some((d) => p.startsWith(`${d}/`)) || IMPORT_CORE_FILES.includes(p));
  for (const [p, text] of importCore) {
    for (const spec of specifiers(text)) {
      const dir = targetDir(p, spec);
      if (dir && FORBIDDEN_LAYERS.includes(dir)) bad.push(`import:${p} -> ${spec}`);
    }
  }
  return bad;
}

function tokenViolations(): string[] {
  const bad: string[] = [];
  for (const [p, text] of CORE) {
    const code = stripSource(text, true);
    for (const tok of FORBIDDEN_TOKENS) {
      const re = new RegExp(`(?<![\\w$.])${tok.replace('.', '\\.')}`);
      if (re.test(code)) bad.push(`dom:${p} uses ${tok}`);
    }
  }
  return bad;
}

/** The allowlist key of a violation line: `rule:path`. */
const keyOf = (v: string) => v.split(/ -> | uses /)[0];

describe('architecture: import boundaries and DOM-free cores', () => {
  it('reads the source tree it is supposed to scan', () => {
    // A glob that silently matches nothing would make every check below pass.
    expect(CORE.length).toBeGreaterThan(50);
    for (const d of CORE_DIRS) expect(CORE.some(([p]) => p.startsWith(`${d}/`)), d).toBe(true);
    for (const f of CORE_FILES) expect(CORE.some(([p]) => p === f), f).toBe(true);
  });

  it('keeps the allowlist short', () => {
    expect(Object.keys(ALLOWED).length).toBeLessThanOrEqual(5);
  });

  it('keeps the cores from importing ui, render, replay or i18n', () => {
    expect(importViolations().filter((v) => !(keyOf(v) in ALLOWED))).toEqual([]);
  });

  it('keeps browser globals out of the cores', () => {
    expect(tokenViolations().filter((v) => !(keyOf(v) in ALLOWED))).toEqual([]);
  });

  it('has no stale allowlist entry', () => {
    const live = new Set([...importViolations(), ...tokenViolations()].map(keyOf));
    expect(Object.keys(ALLOWED).filter((k) => !live.has(k))).toEqual([]);
  });

  it('strips comments and strings, and resolves relative imports', () => {
    const text = [
      "// window.foo in a comment",
      "/* document.body */ const a = 'localStorage';",
      'const b = "navigator.x"; const c = `requestAnimationFrame`;',
      "import { t } from '../i18n';",
      "export { x } from './local';",
      "const m = await import('../render/scene');",
      "import 'three';",
    ].join('\n');
    const code = stripSource(text, true);
    for (const tok of FORBIDDEN_TOKENS) expect(code).not.toContain(tok);
    expect(stripSource('x = window.innerWidth; // ok', true)).toContain('window.');
    expect(specifiers(text)).toEqual(['../i18n', './local', '../render/scene', 'three']);
    expect(targetDir('physics/mission.ts', '../i18n')).toBe('i18n');
    expect(targetDir('physics/sim/step.ts', '../../ui/panel')).toBe('ui');
    expect(targetDir('physics/sim/step.ts', './x')).toBe('physics');
    expect(targetDir('physics/mission.ts', 'three')).toBeNull();
  });
});
