/**
 * Repository hygiene (session 1, B3): a fitness test over what git tracks, the
 * guard that would have refused PR #41's evidence packet (hundreds of
 * screenshots and logs under docs/) and its workflows bound to one branch.
 * Evidence belongs in Release assets, scratch stays untracked.
 *
 * It asks git for the tracked files (`git ls-files`), so it reads the same list
 * in CI's checkout, in a clone and in a git worktree. The project has no node
 * types (tsconfig: vite/client only), so node's modules are loaded through a
 * non-literal dynamic import and typed here by the little that is used.
 */
import { describe, expect, it } from 'vitest';

interface ChildProcessModule {
  execSync(command: string, options: { cwd: string; encoding: 'utf8'; maxBuffer: number }): string;
}
interface FsModule {
  statSync(path: string, options: { throwIfNoEntry: false }): { size: number; isFile(): boolean } | undefined;
  readFileSync(path: string, encoding: 'utf8'): string;
}
interface UrlModule {
  fileURLToPath(url: string | URL): string;
}
const load = (id: string): Promise<unknown> => import(/* @vite-ignore */ id);
const { execSync } = (await load('node:child_process')) as ChildProcessModule;
const { statSync, readFileSync } = (await load('node:fs')) as FsModule;
const { fileURLToPath } = (await load('node:url')) as UrlModule;

const testsDir = fileURLToPath(new URL('.', import.meta.url));
const git = (args: string, cwd: string) => execSync(`git ${args}`, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const root = git('rev-parse --show-toplevel', testsDir).trim();
const tracked = git('ls-files -z', root).split('\0').filter((p) => p.length > 0);

/** Size in bytes of a tracked file, or undefined when it is deleted in the working tree (or is not a file). */
function sizeOf(path: string): number | undefined {
  const stat = statSync(`${root}/${path}`, { throwIfNoEntry: false });
  return stat?.isFile() ? stat.size : undefined;
}
const kB = (bytes: number) => `${(bytes / 1024).toFixed(0)} kB`;

/**
 * Tracked files that break a size or type rule on purpose, path -> one-line reason.
 * Empty on purpose: add an entry only for a legitimate file, never to silence a packet.
 */
const ALLOWED: Record<string, string> = {};

const MAX_FILE = 1024 * 1024; // 1 MB, outside public/ (the app's shipped assets live there)
const MAX_DOCS_IMAGE = 200 * 1024; // 200 kB, for an image under docs/

describe('repository hygiene (B3)', () => {
  it('lists the tracked files through git', () => {
    expect(tracked.length).toBeGreaterThan(100);
    expect(tracked).toContain('package.json');
  });

  it('tracks no file over 1 MB outside public/', () => {
    const offenders = tracked
      .filter((p) => !p.startsWith('public/') && !(p in ALLOWED))
      .map((p) => ({ p, size: sizeOf(p) }))
      .filter(({ size }) => size !== undefined && size > MAX_FILE)
      .map(({ p, size }) => `${p} (${kB(size!)})`);
    expect(offenders, `tracked files over 1 MB outside public/ (put evidence in Release assets): ${offenders.join(', ')}`)
      .toEqual([]);
  });

  it('tracks no image over 200 kB under docs/', () => {
    const offenders = tracked
      .filter((p) => p.startsWith('docs/') && /\.(png|jpe?g|webp|gif)$/i.test(p) && !(p in ALLOWED))
      .map((p) => ({ p, size: sizeOf(p) }))
      .filter(({ size }) => size !== undefined && size > MAX_DOCS_IMAGE)
      .map(({ p, size }) => `${p} (${kB(size!)})`);
    expect(offenders, `images over 200 kB under docs/ (shrink them or put them in Release assets): ${offenders.join(', ')}`)
      .toEqual([]);
  });

  it('tracks no archive, log, Word or PDF file under docs/', () => {
    const offenders = tracked.filter((p) => p.startsWith('docs/') && /\.(zip|log|docx|pdf)$/i.test(p) && !(p in ALLOWED));
    expect(offenders, `evidence packets under docs/ belong in Release assets: ${offenders.join(', ')}`).toEqual([]);
  });

  it('has no focused test (.only) in tests/', () => {
    // the pattern is spelled so that this file does not match itself
    const focused = /\b(?:it|describe|test)\.only\(/;
    const offenders = tracked
      .filter((p) => p.startsWith('tests/') && /\.(?:[cm]?[jt]s)$/.test(p))
      .filter((p) => sizeOf(p) !== undefined && focused.test(readFileSync(`${root}/${p}`, 'utf8')));
    expect(offenders, `a focused test skips the rest of the suite: ${offenders.join(', ')}`).toEqual([]);
  });

  it('has no workflow that runs only on pushes to a branch other than main', () => {
    const workflows = tracked.filter((p) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(p) && sizeOf(p) !== undefined);
    const offenders = workflows
      .map((p) => ({ p, problem: branchBoundProblem(readFileSync(`${root}/${p}`, 'utf8')) }))
      .filter(({ problem }) => problem !== undefined)
      .map(({ p, problem }) => `${p}: ${problem}`);
    expect(offenders, `workflows bound to a feature branch never run once it is merged: ${offenders.join('; ')}`)
      .toEqual([]);
  });

  it('tracks no probe or scratch file', () => {
    const offenders = tracked.filter((p) =>
      p.startsWith('tests/probe/') ||
      p === 'probe-out.txt' || p.endsWith('/probe-out.txt') ||
      (p.endsWith('.probe.ts') && !p.startsWith('tests/')));
    expect(offenders, `scratch files are gitignored and must not be tracked: ${offenders.join(', ')}`).toEqual([]);
  });
});

/**
 * The workflow check, on the file's text (no YAML dependency). It understands
 * the usual block form only:
 *
 *   on:
 *     push:
 *       branches: [a, b]      (or a `- a` list on the following lines)
 *     pull_request:
 *
 * Limits, on purpose: an inline `on: push` or `on: [push, ...]` has no branch
 * filter and passes; flow mappings (`on: { push: ... }`), anchors and quoted
 * multi-line keys are not read and pass; a branch pattern containing `*` is
 * taken as one that may match main; `branches-ignore` is not a branch list.
 * Returns why the workflow is branch-bound, or undefined when it is not.
 */
function branchBoundProblem(text: string): string | undefined {
  const lines = text.split(/\r?\n/);
  const indent = (line: string) => line.length - line.trimStart().length;
  const meaningful = (line: string) => line.trim() !== '' && !line.trimStart().startsWith('#');

  const onAt = lines.findIndex((l) => /^["']?on["']?:\s*(#.*)?$/.test(l));
  if (onAt < 0) return undefined; // missing, or inline `on: ...`: no branch filter to read
  const block: string[] = [];
  for (const line of lines.slice(onAt + 1)) {
    if (meaningful(line) && indent(line) === 0) break;
    if (meaningful(line)) block.push(line);
  }
  if (block.length === 0) return undefined;
  const triggerIndent = indent(block[0]);
  const triggers = new Map<string, string[]>();
  let current: string[] | undefined;
  for (const line of block) {
    if (indent(line) === triggerIndent) {
      const key = /^\s*["']?([\w-]+)["']?:/.exec(line)?.[1];
      current = [];
      if (key) triggers.set(key, current);
    } else current?.push(line);
  }

  const push = triggers.get('push');
  if (!push) return undefined;
  const branchesAt = push.findIndex((l) => /^\s*branches:/.test(l));
  if (branchesAt < 0) return undefined;
  const inline = /^\s*branches:\s*\[([^\]]*)\]/.exec(push[branchesAt]);
  const unquote = (s: string) => s.trim().replace(/^["']|["']$/g, '');
  let branches: string[] = [];
  if (inline) branches = inline[1].split(',').map(unquote).filter((b) => b !== '');
  else {
    // the `- name` lines that follow, as deep as or deeper than `branches:` (YAML allows either)
    for (const line of push.slice(branchesAt + 1)) {
      const item = /^\s*-\s*(.+?)\s*(#.*)?$/.exec(line);
      if (!item || indent(line) < indent(push[branchesAt])) break;
      branches.push(unquote(item[1]));
    }
  }
  if (branches.length === 0 || branches.some((b) => b === 'main' || b.includes('*'))) return undefined;
  const others = ['pull_request', 'pull_request_target', 'schedule', 'workflow_dispatch'];
  if (others.some((t) => triggers.has(t))) return undefined;
  return `on.push.branches is only [${branches.join(', ')}] and there is no pull_request, schedule or workflow_dispatch`;
}

describe('repository hygiene: the workflow check itself', () => {
  it('refuses a workflow that runs only on pushes to a feature branch', () => {
    expect(branchBoundProblem('name: x\non:\n  push:\n    branches: [claude/evidence-packet]\njobs: {}\n'))
      .toContain('claude/evidence-packet');
    expect(branchBoundProblem("on:\n  push:\n    branches:\n      - 'feature/a'\n      - feature/b\njobs:\n"))
      .toContain('feature/a, feature/b');
  });

  it('accepts main, a wildcard, another trigger, or no branch filter', () => {
    expect(branchBoundProblem('on:\n  push:\n    branches: [main]\n')).toBeUndefined();
    expect(branchBoundProblem('on:\n  push:\n    branches: [release/*]\n')).toBeUndefined();
    expect(branchBoundProblem('on:\n  push:\n    branches: [dev]\n  workflow_dispatch:\n')).toBeUndefined();
    expect(branchBoundProblem('on:\n  pull_request:\n  push:\n    branches-ignore: [main]\n')).toBeUndefined();
    expect(branchBoundProblem('on: [push, pull_request]\n')).toBeUndefined();
  });
});
