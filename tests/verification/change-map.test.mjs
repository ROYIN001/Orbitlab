import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ROOT } from '../../scripts/verification/lib.mjs';
import { globToRegExp, inventory, loadMap, matchingRules, selectChecks, validateMap } from '../../scripts/verification/select-checks.mjs';

const map = loadMap();
const inv = inventory();
const trials = JSON.parse(readFileSync(new URL('./change-map-trials.json', import.meta.url), 'utf8')).trials;
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
const consumedMarkdown = ['docs/ROADMAP-PART2-3.md', 'docs/SIXDOF-VEHICLE-DATA.md', 'docs/history/phase4-2026-10-01/T03-CURRICULA-RESEARCH.md'];

test('globs: ** spans directories, * and ? stay within one segment, braces alternate', () => {
  assert.ok(globToRegExp('src/**').test('src/a/b/c.ts'));
  assert.ok(globToRegExp('**/*.md').test('README.md'));
  assert.ok(globToRegExp('**/*.md').test('docs/a/b.md'));
  assert.ok(globToRegExp('src/ui/*.ts').test('src/ui/panel.ts'));
  assert.ok(!globToRegExp('src/ui/*.ts').test('src/ui/build/x.ts'));
  assert.ok(globToRegExp('tests/{a,b}.test.ts').test('tests/b.test.ts'));
  assert.ok(!globToRegExp('tests/a?.ts').test('tests/a/.ts'));
  assert.ok(!globToRegExp('src/main.ts').test('src/mainXts'));
});

test('the map is valid and every check entry names something in the current inventory', () => {
  assert.equal(validateMap(map, inv), true);
  assert.equal(map.fallback.all, true, 'unknown impact must select the full set');
});

test('every tracked src/** file matches at least one rule or the fallback', t => {
  const src = tracked.filter(file => file.startsWith('src/'));
  assert.ok(src.length > 400, `expected the whole src tree, got ${src.length}`);
  const selection = selectChecks(src, { map, inv });
  for (const entry of selection.files) assert.ok(entry.rules.length > 0 || entry.fallback, entry.file);
  // Today every src file has a domain rule; a new src area falls back to the full set until it gets one.
  t.diagnostic(`src files on the fallback: ${selection.fallbackFiles.length} of ${src.length}`);
  for (const file of src) {
    const own = selectChecks([file], { map, inv });
    assert.ok(own.full || own.ids.length > 0, `${file} selects no check`);
    assert.ok(own.ids.includes('commands:typecheck'), `${file} must at least typecheck`);
  }
});

test('every other tracked path is selected by a rule or by the full-set fallback', () => {
  const selection = selectChecks(tracked, { map, inv });
  for (const entry of selection.files) assert.ok(entry.rules.some(id => id !== 'always-repo-hygiene') || entry.fallback, entry.file);
  assert.ok(selection.ids.includes('unit:tests/repo-hygiene.test.ts'));
});

test('an unmatched path has unknown impact and selects the full set', () => {
  for (const file of ['brand-new-dir/x.ts', 'src/new-area/x.ts', 'docs/stage1-2026-10-02/performance.json', 'scripts/new-tool.mjs']) {
    const selection = selectChecks([file], { map, inv });
    assert.deepEqual(selection.fallbackFiles, [file]);
    assert.equal(selection.full, true);
    for (const suite of Object.keys(inv)) assert.deepEqual(selection.checks[suite].length, inv[suite].length, `${file}: ${suite}`);
  }
});

test('Markdown keeps the CI exemption, except the three Markdown files the app and tests consume', () => {
  const docs = selectChecks(['docs/development/PLAN.md', 'CHANGELOG.md', 'changes/README.md'], { map, inv });
  assert.equal(docs.full, false);
  assert.deepEqual(docs.ids, ['unit:tests/repo-hygiene.test.ts']);
  for (const file of consumedMarkdown) {
    const selection = selectChecks([file], { map, inv });
    assert.equal(selection.full, false, file);
    assert.ok(selection.ids.length > 1, `${file} must select its reader`);
    assert.ok(!matchingRules(file, map).some(rule => rule.id === 'markdown-only'), file);
  }
});

test('a changed test selects itself', () => {
  const selection = selectChecks(['tests/mission.test.ts', 'tests/heavy/rendezvous.test.ts', 'tests/sixdof-fleet/wind.test.ts', 'tests/browser/journeys/satellite.mjs'], { map, inv });
  assert.equal(selection.full, false);
  for (const id of ['unit:tests/mission.test.ts', 'heavy:tests/heavy/rendezvous.test.ts', 'sixdof-fleet:tests/sixdof-fleet/wind.test.ts', 'browser:satellite']) assert.ok(selection.ids.includes(id), id);
});

for (const trial of trials) {
  test(`trial ${trial.id}: ${trial.title}`, () => {
    const changed = trial.files.filter(file => !file.startsWith('tests/'));
    assert.ok(changed.length > 0);
    const selection = selectChecks(changed, { map, inv });
    for (const { check, culprits, evidence } of trial.expect) {
      assert.ok(selection.ids.includes(check), `${trial.id}: the PR's changes do not select ${check} (${evidence})`);
      for (const culprit of culprits) {
        assert.ok(trial.files.includes(culprit), `${trial.id}: culprit ${culprit} is not in the change`);
        // The culprit alone must select the check through a rule, not through the full-set fallback.
        const own = selectChecks([culprit], { map, inv });
        assert.deepEqual(own.fallbackFiles, [], `${trial.id}: ${culprit} has no rule (fallback)`);
        assert.equal(own.full, false, `${trial.id}: ${culprit} selects the full set, which proves nothing`);
        assert.ok(own.ids.includes(check), `${trial.id}: ${culprit} alone does not select ${check}`);
      }
    }
  });
}
