/**
 * The instructor's re-check in Chromium, the browser half of the
 * Node-against-Chromium test (roadmap T02; Phase 4 map §4.2; the Node half is
 * tests/recheck.test.ts, which holds the acceptance and this table in its
 * header). The built app opens on the checking page (`#/lessons/check`); the
 * `check_results` lesson tool is called through the harness's `app.mcp` with
 * the committed results file and the instructor's scenario file
 * (tests/fixtures/recheck/), so each record is flown again in the page's own
 * re-check worker; the answer is held to `expected.json` (Node's re-check,
 * written once) under the engine tolerances below, FIXED ON 2026-09-30 BEFORE
 * THE FIRST RUN. A miss fails the journey and is recorded, never loosened.
 * The log prints the largest difference of each measure and how long the
 * check took. Point-mass only, so it runs in well under two minutes: smoke.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const smoke = true;
export const timeoutMs = 240_000;

const FIXTURES = fileURLToPath(new URL('../../fixtures/recheck/', import.meta.url));
const read = (name) => JSON.parse(readFileSync(`${FIXTURES}${name}`, 'utf8'));

// TOLERANCE BEGIN — tests/recheck.test.ts checks this text equals its own table
const TOLERANCE = {
  "orbit.perigee": 0.01, "orbit.apogee": 0.01, "orbit.semiMajorAxis": 0.01, "orbit.perigeeMiss": 0.01,
  "orbit.inclination": 1e-4, "orbit.raanError": 1e-4,
  "orbit.period": 1e-3, "orbit.speed": 1e-5, "orbit.eccentricity": 2e-6,
  "maxQ": 1e-4, "maxQTime": 0.01, "maxG": 1e-5,
  "dvLeft": 0.01, "loss.gravity": 0.01, "loss.drag": 0.01, "loss.steering": 0.01, "burnDv": 0.01, "burnDv.raise": 0.01,
  "payload": 0,
  "insertionTime": 0.01, "abort.time": 0.01, "abort.maxG": 1e-4,
  "nav.positionError": 1e-3, "loop.pmAtMaxQ": 1e-4, "loop.gmAtMaxQ": 1e-4, "loop.wcAtMaxQ": 1e-5, "step.overshoot": 1e-3,
  "dock.hours": 3e-6,
  "event": 0.01, "hook.crewSafe": 1e-4, "hook.stableOrbit": 0.01, "hook.dispersedRun": 0,
  "flownTo": 0.01
};
// TOLERANCE END

/** The tolerance a criterion's re-checked value is held to; null for a state alone. */
function tolOf(c) {
  if (c.measure) return TOLERANCE[c.measure];
  if (c.kind === 'event') return TOLERANCE.event;
  if (c.kind === 'hook' && c.hook) return TOLERANCE[`hook.${c.hook}`] ?? 0;
  return null;
}
const near = (a, b, tol) => ((a ?? null) === null ? (b ?? null) === null : (b ?? null) !== null && Math.abs(a - b) <= tol);

/** Every way `actual` misses `want` (tests/recheck.test.ts has the same function), and the largest difference of each measure. */
function compare(actual, want) {
  const out = [];
  const largest = {};
  const note = (key, a, b) => { if (typeof a === 'number' && typeof b === 'number') largest[key] = Math.max(largest[key] ?? 0, Math.abs(a - b)); };
  if (actual.records.length !== want.records.length) return { misses: [`${actual.records.length} records, expected ${want.records.length}`], largest };
  want.records.forEach((w, i) => {
    const a = actual.records[i];
    const at = `${w.lessonId}/${w.which.join('+')}`;
    if (a.lessonId !== w.lessonId || a.which.join() !== w.which.join()) { out.push(`${at}: record ${i} is ${a.lessonId}/${a.which.join('+')}`); return; }
    const border = w.status === 'borderline';
    if (!border && a.status !== w.status) out.push(`${at}: status ${a.status}, expected ${w.status}`);
    if (!border && a.recheckedVerdict !== w.recheckedVerdict) out.push(`${at}: verdict ${a.recheckedVerdict}, expected ${w.recheckedVerdict}`);
    note('flownTo', a.flownTo, w.flownTo);
    if (!near(a.flownTo, w.flownTo, TOLERANCE.flownTo)) out.push(`${at}: flown to ${a.flownTo}, expected ${w.flownTo}`);
    if (a.steps !== w.steps) largest.stepsDiffer = [...(largest.stepsDiffer ?? []), `${at}: ${a.steps} against ${w.steps}`];
    w.criteria.forEach((wc, j) => {
      const ac = a.criteria[j];
      if (!ac || ac.id !== wc.id) { out.push(`${at}.${wc.id}: missing`); return; }
      if (wc.status !== 'borderline' && ac.status !== wc.status) out.push(`${at}.${wc.id}: ${ac.status}, expected ${wc.status}`);
      const tol = tolOf(wc);
      if (tol === null) return;
      const key = wc.measure ?? (wc.kind === 'event' ? 'event' : `hook.${wc.hook}`);
      note(key, ac.rechecked?.value, wc.rechecked?.value);
      note(key, ac.rechecked?.expected, wc.rechecked?.expected);
      if (!near(ac.rechecked?.value, wc.rechecked?.value, tol)) out.push(`${at}.${wc.id}: value ${ac.rechecked?.value}, expected ${wc.rechecked?.value} ± ${tol}`);
      if (!near(ac.rechecked?.expected, wc.rechecked?.expected, tol)) out.push(`${at}.${wc.id}: expected value ${ac.rechecked?.expected}, expected ${wc.rechecked?.expected} ± ${tol}`);
    });
  });
  return { misses: out, largest };
}

export default async function recheck(t) {
  const results = read('results.orbitlab-results.json');
  const scenario = read('scenario.orbitlab-lesson.json');
  const expected = read('expected.json');
  const app = await t.open({ hash: '#/lessons/check', viewport: 'desktop' });
  t.check(await app.page.locator('body[data-lessons-page="check"]').count() === 1, 'the checking page is open');
  const t0 = Date.now();
  const out = await app.mcp('check_results', { results: [results], lessons: scenario, names: ['results.orbitlab-results.json'] });
  const seconds = (Date.now() - t0) / 1000;
  t.log(`check_results: ${out.records.length} records in ${seconds.toFixed(1)} s; counts ${JSON.stringify(out.counts)}; the page's build ${out.app}`);
  t.check(out.files?.[0]?.checksum === true, `the results file's checksum holds in Chromium (got ${out.files?.[0]?.checksum})`);
  t.check(JSON.stringify(out.counts) === JSON.stringify({ match: 2, borderline: 1, differs: 0, cannotRefly: 0 }), `counts ${JSON.stringify(out.counts)}`);
  const { misses, largest } = compare(out, expected);
  t.log(`largest |Chromium − Node| by measure: ${JSON.stringify(largest)}`);
  for (const m of misses) t.fail(`Chromium against Node: ${m}`);
  await app.shot('check-page');
  app.checkErrors();
}
