// R0.3r (M-PLAN-014): select the early checks for a change from scripts/verification/change-map.json.
//
//   node scripts/verification/select-checks.mjs <base>..<head>     changes since the merge base, as a PR sees them
//   node scripts/verification/select-checks.mjs --files a.ts b.ts  an explicit list of changed paths
//   git diff --name-only … | node scripts/verification/select-checks.mjs --stdin
//   add --json for machine-readable output
//
// A path's checks are the union of every matching rule. A path matched only by additive rules, or by
// none, has unknown impact and selects the full set. These are early checks; the complete PR and
// Pages gates still run.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { discoverFiles, readJSON, ROOT } from './lib.mjs';

export const MAP_FILE = resolve(ROOT, 'scripts/verification/change-map.json');
export const COMMANDS = ['typecheck', 'build', 'budget', 'node-verification'];
export const SUITES = ['commands', 'unit', 'browser', 'heavy', 'sixdof-fleet'];
const RUN = {
  typecheck: 'npm run -s typecheck',
  build: 'npx vite build',
  budget: 'node scripts/bundle-budget.mjs',
  'node-verification': 'node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs',
};

/** Glob to RegExp: `**` any depth, `*` and `?` within one segment, `{a,b}` alternatives. */
export function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      i++;
      if (glob[i + 1] === '/') { i++; out += '(?:.*/)?'; } else out += '.*';
    } else if (c === '*') out += '[^/]*';
    else if (c === '?') out += '[^/]';
    else if (c === '{') {
      const end = glob.indexOf('}', i);
      if (end < 0) throw new Error(`Unclosed { in ${glob}`);
      out += `(?:${glob.slice(i + 1, end).split(',').map(part => globToRegExp(part).source.slice(1, -1)).join('|')})`;
      i = end;
    } else out += /[\\^$.+()|[\]]/.test(c) ? `\\${c}` : c;
  }
  return new RegExp(`^${out}$`);
}
const matcher = globs => { const res = (globs ?? []).map(globToRegExp); return file => res.some(re => re.test(file)); };

export function loadMap(file = MAP_FILE) { return readJSON(file); }

/** Everything a check can name, discovered the same way the verification plans discover it. */
export function inventory(root = ROOT) {
  return {
    commands: [...COMMANDS],
    unit: discoverFiles('unit', root),
    browser: readdirSync(resolve(root, 'tests/browser/journeys')).filter(file => file.endsWith('.mjs')).sort().map(file => file.slice(0, -4)),
    heavy: discoverFiles('heavy', root),
    'sixdof-fleet': discoverFiles('sixdof-fleet', root),
  };
}

function expand(map, suite, entries, inv, ruleId) {
  const out = new Set();
  for (const entry of entries) {
    if (entry.startsWith('@')) {
      const set = map.sets?.[entry.slice(1)];
      if (!set) throw new Error(`Rule ${ruleId}: unknown set ${entry}`);
      for (const item of expand(map, suite, set, inv, ruleId)) out.add(item);
      continue;
    }
    const re = entry === '*' ? /^/ : globToRegExp(entry); // '*' alone is the whole suite
    const hits = inv[suite].filter(item => re.test(item));
    if (!hits.length) throw new Error(`Rule ${ruleId}: ${suite} entry ${entry} selects nothing`);
    for (const hit of hits) out.add(hit);
  }
  return out;
}

function selfChecks(file, inv) {
  for (const suite of ['unit', 'heavy', 'sixdof-fleet']) if (inv[suite].includes(file)) return { [suite]: [file] };
  const journey = /^tests\/browser\/journeys\/([^/]+)\.mjs$/.exec(file);
  if (journey && inv.browser.includes(journey[1])) return { browser: [journey[1]] };
  if (/^tests\/(?:verification\/[^/]+\.test\.mjs|browser\/shard\.test\.mjs)$/.test(file)) return { commands: ['node-verification'] };
  return {};
}

/** Throws if the map is malformed or a check entry names nothing in the current inventory. */
export function validateMap(map = loadMap(), inv = inventory()) {
  if (map.schema !== 1 || map.fallback?.all !== true || !Array.isArray(map.rules)) throw new Error('change-map: schema 1 with an explicit full-set fallback is required');
  const ids = new Set();
  for (const rule of map.rules) {
    if (!rule.id || ids.has(rule.id)) throw new Error(`change-map: missing or duplicate rule id ${rule.id}`);
    ids.add(rule.id);
    if (!rule.paths?.length) throw new Error(`Rule ${rule.id}: no paths`);
    rule.paths.forEach(globToRegExp);
    for (const [suite, entries] of Object.entries(rule.checks ?? {})) {
      if (!SUITES.includes(suite)) throw new Error(`Rule ${rule.id}: unknown suite ${suite}`);
      expand(map, suite, entries, inv, rule.id);
    }
  }
  return true;
}

const fullSet = inv => Object.fromEntries(SUITES.map(suite => [suite, new Set(inv[suite])]));

/** Rules matching one path, in map order. */
export function matchingRules(file, map = loadMap()) {
  return map.rules.filter(rule => matcher(rule.paths)(file) && !matcher(rule.exclude)(file));
}

export function selectChecks(files, { map = loadMap(), inv = inventory() } = {}) {
  const picked = Object.fromEntries(SUITES.map(suite => [suite, new Set()]));
  const reasons = {};
  const perFile = [];
  let all = false;
  for (const file of [...new Set(files)].sort()) {
    const rules = matchingRules(file, map);
    const fallback = !rules.some(rule => !rule.additive);
    perFile.push({ file, rules: rules.map(rule => rule.id), fallback });
    const record = (checks, source) => {
      for (const suite of SUITES) for (const item of checks[suite] ?? []) {
        picked[suite].add(item);
        (reasons[`${suite}:${item}`] ??= new Set()).add(source);
      }
    };
    if (fallback || rules.some(rule => rule.all)) { all = true; record(fullSet(inv), fallback ? 'fallback' : rules.find(rule => rule.all).id); }
    for (const rule of rules) {
      if (rule.self) record(selfChecks(file, inv), rule.id);
      const checks = {};
      for (const [suite, entries] of Object.entries(rule.checks ?? {})) checks[suite] = [...expand(map, suite, entries, inv, rule.id)];
      record(checks, rule.id);
    }
  }
  const checks = Object.fromEntries(SUITES.map(suite => [suite, suite === 'commands' ? COMMANDS.filter(c => picked.commands.has(c)) : [...picked[suite]].sort()]));
  return {
    files: perFile,
    full: all,
    fallbackFiles: perFile.filter(entry => entry.fallback).map(entry => entry.file),
    checks,
    ids: SUITES.flatMap(suite => checks[suite].map(item => `${suite}:${item}`)),
    reasons: Object.fromEntries(Object.entries(reasons).map(([key, set]) => [key, [...set].sort()])),
    totals: Object.fromEntries(SUITES.map(suite => [suite, inv[suite].length])),
  };
}

/** Paths changed between the merge base of `base` and `head` (both sides of renames, deletions included). */
export function changedFiles(range, root = ROOT) {
  const match = /^(.+?)\.{2,3}(.*)$/.exec(range);
  if (!match) throw new Error(`Expected <base>..<head>, got ${range}`);
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const head = match[2] || 'HEAD';
  const base = git('merge-base', match[1], head);
  return git('diff', '--name-only', '--no-renames', base, head).split('\n').filter(Boolean);
}

export function commandsFor(selection) {
  const { checks, totals, full } = selection;
  const lines = checks.commands.map(c => RUN[c]);
  if (checks.unit.length) lines.push(checks.unit.length === totals.unit ? 'npx vitest run' : `npx vitest run ${checks.unit.join(' ')}`);
  if (checks.browser.length) lines.push(checks.browser.length === totals.browser ? 'node tests/browser/run.mjs   # after a build' : `node tests/browser/run.mjs ${checks.browser.join(' ')}   # after a build`);
  if (checks.heavy.length) lines.push(checks.heavy.length === totals.heavy ? 'npm run test:heavy' : `npm run test:heavy -- ${checks.heavy.join(' ')}`);
  if (checks['sixdof-fleet'].length) lines.push(checks['sixdof-fleet'].length === totals['sixdof-fleet'] ? 'npm run test:sixdof-fleet' : `npm run test:sixdof-fleet -- ${checks['sixdof-fleet'].join(' ')}`);
  if (full) lines.push('# full set: also see VERIFICATION.md for the CI/Pages plans');
  return lines;
}

function format(selection) {
  const out = [`${selection.files.length} changed path(s)${selection.full ? '; FULL SET selected' : ''}`];
  for (const entry of selection.files) out.push(`  ${entry.file}  ← ${entry.fallback ? 'FALLBACK (unknown impact); ' : ''}${entry.rules.join(', ')}`);
  out.push('Checks:');
  for (const suite of SUITES) out.push(`  ${suite} (${selection.checks[suite].length}/${selection.totals[suite]}): ${selection.checks[suite].join(' ') || '—'}`);
  out.push('Run:', ...commandsFor(selection).map(line => `  ${line}`));
  return out.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const rest = args.filter(arg => arg !== '--json');
  let files;
  if (rest[0] === '--files') files = rest.slice(1);
  else if (rest[0] === '--stdin') files = readFileSync(0, 'utf8').split('\n').map(line => line.trim()).filter(Boolean);
  else if (rest.length === 1) files = changedFiles(rest[0]);
  else {
    console.error('usage: node scripts/verification/select-checks.mjs <base>..<head> | --files <path>… | --stdin  [--json]');
    process.exit(2);
  }
  const map = loadMap();
  const inv = inventory();
  validateMap(map, inv);
  const selection = selectChecks(files, { map, inv });
  console.log(json ? JSON.stringify(selection, null, 2) : format(selection));
}
