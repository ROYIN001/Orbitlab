/**
 * The re-check against committed fixtures, the Node half of the
 * Node-against-Chromium test (roadmap T02; Phase 4 map §4.2). The Chromium
 * half is tests/browser/journeys/recheck.mjs: it loads the built app, calls
 * the `check_results` lesson tool through the harness's `app.mcp` on the same
 * files, and holds the answer to the same `expected.json` with the same table.
 *
 * The fixtures (tests/fixtures/recheck/, what each holds:
 * tests/recheck-fixture-build.ts) were written ONCE by
 * scripts/recheck-fixtures.ts in Node and are read here with `?raw` — never a
 * snapshot, never regenerated to make a test pass. The records in the results
 * file were flown live in Node; `expected.json` is Node's re-check of them.
 *
 * Acceptance, fixed before the first run: the same status and the same
 * verdict on every record and criterion that is not borderline, the grading
 * time reached and each re-checked value within this table of engine
 * tolerances. The table was FIXED ON 2026-09-30, BEFORE THE FIRST
 * NODE-AGAINST-CHROMIUM RUN (map §4.2's proposal, with the measures it does
 * not list derived in src/lessons/recheck.ts), and the journey carries the
 * same table (checked below). Each value is at most a hundredth of the
 * tightest tolerance a built-in lesson gives its measure
 * (tests/recheck-core.test.ts). A miss is recorded, never loosened.
 *
 *   | Measure                                                   | Engine tolerance |
 *   |-----------------------------------------------------------|------------------|
 *   | orbit.perigee, .apogee, .semiMajorAxis, .perigeeMiss      | 0.01 km          |
 *   | orbit.inclination, orbit.raanError                        | 1e-4 °           |
 *   | orbit.period                                              | 1e-3 min         |
 *   | orbit.speed                                               | 1e-5 km/s        |
 *   | orbit.eccentricity                                        | 2e-6             |
 *   | dvLeft, loss.gravity/.drag/.steering, burnDv, burnDv.raise| 0.01 m/s         |
 *   | insertionTime, maxQTime, abort.time; an event's time      | 0.01 s           |
 *   | maxQ                                                      | 1e-4 kPa         |
 *   | maxG                                                      | 1e-5 g           |
 *   | abort.maxG; the crewSafe hook's peak                      | 1e-4 g           |
 *   | payload                                                   | 0 kg             |
 *   | dock.hours                                                | 3e-6 h           |
 *   | stableOrbit hook (perigee)                                | 0.01 km          |
 *   | the grading time reached (flownTo)                        | 0.01 s           |
 *   | six-DOF only (not re-flown): nav.positionError 1e-3 m, loop.pm/gmAtMaxQ 1e-4, loop.wcAtMaxQ 1e-5 rad/s, step.overshoot 1e-3 % |
 *
 * Whether `Math.*` agrees bit for bit between Node 22 and Playwright's
 * Chromium is not established by anything else in the repository; the
 * journey is where it is measured, and its log prints the largest difference
 * of each measure.
 */
import { describe, expect, it } from 'vitest';
import scenarioText from './fixtures/recheck/scenario.orbitlab-lesson.json?raw';
import resultsText from './fixtures/recheck/results.orbitlab-results.json?raw';
import expectedText from './fixtures/recheck/expected.json?raw';
import journeyText from './browser/journeys/recheck.mjs?raw';
import { ENGINE_TOLERANCE, EVENT_TIME_TOLERANCE, HOOK_TOLERANCE, type CriterionCheck, type ResultsCheck } from '../src/lessons/recheck';
import { parseLessonFile } from '../src/lessons/lesson-file';
import { verifyResults, emptyProgress, type ResultsFile } from '../src/lessons/progress';
import { createLessonTools, type LessonToolsHost } from '../src/lessons/mcp-tools';
import { allLessons } from '../src/lessons/catalog';
import { CHECKER_APP, RESULTS_NAME, scenarioLessons } from './recheck-fixture-build';

// TOLERANCE BEGIN — the table above, as data; the journey carries the same text
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

const scenario = JSON.parse(scenarioText) as unknown;
const results = JSON.parse(resultsText) as ResultsFile;
const expected = JSON.parse(expectedText) as ResultsCheck;
const T = TOLERANCE as Record<string, number>;

/** The tolerance a criterion's re-checked value is held to, from the table; null for a state alone. */
function tolOf(c: CriterionCheck): number | null {
  if (c.measure) return T[c.measure];
  if (c.kind === 'event') return T.event;
  if (c.kind === 'hook' && c.hook) return T[`hook.${c.hook}`] ?? 0;
  return null;
}

const near = (a: number | null | undefined, b: number | null | undefined, tol: number): boolean =>
  (a ?? null) === null ? (b ?? null) === null : (b ?? null) !== null && Math.abs(a! - b!) <= tol;

/**
 * Every way `actual` misses `expected` under the acceptance above. The
 * journey has the same function (compare the two when changing either).
 */
function misses(actual: ResultsCheck, want: ResultsCheck): string[] {
  const out: string[] = [];
  if (actual.records.length !== want.records.length) return [`${actual.records.length} records, expected ${want.records.length}`];
  want.records.forEach((w, i) => {
    const a = actual.records[i];
    const at = `${w.lessonId}/${w.which.join('+')}`;
    if (a.lessonId !== w.lessonId || a.which.join() !== w.which.join()) { out.push(`${at}: record ${i} is ${a.lessonId}/${a.which.join('+')}`); return; }
    const border = w.status === 'borderline';
    if (!border && a.status !== w.status) out.push(`${at}: status ${a.status}, expected ${w.status}`);
    if (!border && a.recheckedVerdict !== w.recheckedVerdict) out.push(`${at}: verdict ${a.recheckedVerdict}, expected ${w.recheckedVerdict}`);
    if (!near(a.flownTo, w.flownTo, T.flownTo)) out.push(`${at}: flown to ${a.flownTo}, expected ${w.flownTo}`);
    w.criteria.forEach((wc, j) => {
      const ac = a.criteria[j];
      if (!ac || ac.id !== wc.id) { out.push(`${at}.${wc.id}: missing`); return; }
      if (wc.status !== 'borderline' && ac.status !== wc.status) out.push(`${at}.${wc.id}: ${ac.status}, expected ${wc.status}`);
      const tol = tolOf(wc);
      if (tol === null) return;
      if (!near(ac.rechecked?.value, wc.rechecked?.value, tol)) out.push(`${at}.${wc.id}: value ${ac.rechecked?.value}, expected ${wc.rechecked?.value} ± ${tol}`);
      if (!near(ac.rechecked?.expected, wc.rechecked?.expected, tol)) out.push(`${at}.${wc.id}: expected value ${ac.rechecked?.expected}, expected ${wc.rechecked?.expected} ± ${tol}`);
    });
  });
  return out;
}

/** A page with nothing open: the lesson tools' host as the check needs it. */
const host = (): LessonToolsHost => ({
  catalogue: () => allLessons(), progress: () => emptyProgress(), startLesson: () => ({ ok: false, reason: 'no' }),
  activeLesson: () => null, assessmentResult: () => null,
});

describe('the re-check fixtures (T02)', () => {
  it('are what they say: a scenario that reads, a results file whose checksum holds, three records', async () => {
    const parsed = parseLessonFile(scenario, new Set());
    expect(parsed.issues).toEqual([]);
    expect(parsed.lessons.map((l) => l.id)).toEqual(['class-leo', 'class-abort']);
    // written by the authoring page's own writer from the build-time definition
    expect(parsed.lessons).toEqual(scenarioLessons());
    expect(await verifyResults(results)).toBe(true);
    expect(expected.app).toBe(CHECKER_APP);
    expect(expected.files).toEqual([{ index: 0, name: RESULTS_NAME, readable: true, student: 'Student A (fixture)', exportedAt: '2026-10-06T08:00:00.000Z', checksum: true }]);
    expect(expected.records.map((r) => [r.lessonId, r.which.join('+'), r.status, r.recordedVerdict, r.recheckedVerdict, r.missing.length, r.sameBuild])).toEqual([
      ['class-leo', 'passed', 'borderline', 'pass', 'pass', 0, false],
      ['class-leo', 'last', 'match', 'fail', 'fail', 0, false],
      ['class-abort', 'passed+last', 'match', 'pass', 'pass', 0, false],
    ]);
    // the borderline is the typed period, 0.0004 min inside its band's edge; the abort was journaled
    expect(expected.records[0].criteria.find((c) => c.id === 'c3')).toMatchObject({ status: 'borderline' });
    expect(results.progress.lessons['class-abort'].last!.actions).toHaveLength(1);
  });

  it('carries one engine tolerance table: this header\'s, the journey\'s and the checker\'s', () => {
    const journey = /TOLERANCE BEGIN[^\n]*\n\s*const TOLERANCE = (\{[\s\S]*?\});\s*\n\s*\/\/ TOLERANCE END/.exec(journeyText);
    expect(journey).not.toBeNull();
    expect(JSON.parse(journey![1])).toEqual(TOLERANCE);
    for (const [m, tol] of Object.entries(ENGINE_TOLERANCE)) expect(T[m], m).toBe(tol);
    expect(T.event).toBe(EVENT_TIME_TOLERANCE);
    for (const [h, tol] of Object.entries(HOOK_TOLERANCE)) expect(T[`hook.${h}`], h).toBe(tol);
  });

  it('checks the same in Node through the check_results lesson tool, within the table and bit for bit', async () => {
    const tool = createLessonTools(host()).find((x) => x.name === 'check_results')!;
    expect(tool.annotations.readOnlyHint).toBe(true);
    const out = JSON.parse(JSON.stringify(await tool.execute({ results: [results], lessons: scenario, names: [RESULTS_NAME] }))) as ResultsCheck & { counts: Record<string, number>; lessonFileIssues: string[] };
    expect(out.counts).toEqual({ match: 2, borderline: 1, differs: 0, cannotRefly: 0 });
    expect(out.lessonFileIssues).toEqual([]);
    expect(misses(out, expected)).toEqual([]);
    // Node against the Node that wrote the fixture: nothing may move at all
    const { app: _a, counts: _c, lessonFileIssues: _i, ...rest } = out;
    const { app: _b, ...want } = expected;
    expect({ ...rest, records: rest.records.map((r) => ({ ...r, sameBuild: false })) }).toEqual(want);
  }, 120_000);

  it('says what it cannot do without the instructor\'s lesson file, and refuses what is not a file', async () => {
    const tool = createLessonTools(host()).find((x) => x.name === 'check_results')!;
    const out = await tool.execute({ results: [results] }) as ResultsCheck;
    expect(out.records.map((r) => [r.status, r.reason])).toEqual([['cannotRefly', 'noLesson'], ['cannotRefly', 'noLesson'], ['cannotRefly', 'noLesson']]);
    await expect(Promise.resolve().then(() => tool.execute({ results: [] }))).rejects.toThrow(/results/);
    await expect(Promise.resolve().then(() => tool.execute({ results: [results], lessons: { format: 'nope' } }))).rejects.toThrow(/lesson files/);
    // a lesson file the page opened earlier stands in for the one not given
    const withCustom = { ...host(), catalogue: () => allLessons(scenarioLessons()) };
    const again = await createLessonTools(withCustom).find((x) => x.name === 'check_results')!.execute({ results: [results] }) as ResultsCheck;
    expect(again.records.map((r) => r.status)).toEqual(['borderline', 'match', 'match']);
  }, 120_000);
});
