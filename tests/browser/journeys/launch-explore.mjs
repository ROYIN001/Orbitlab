/**
 * A Falcon 9 to low Earth orbit from Explore, driven the way an assistant
 * drives it (WebMCP): configure, launch, warp, fly until the flight itself
 * reports the orbit, then export the whole flight as CSV — more than 1 MB,
 * as the audit's export was (live-evidence.json: orbitlab_falcon9_leo.csv,
 * 1 308 674 bytes) — and check the file is this flight's, to the end.
 * Then the mission's Orbit step carries the orbit on into the Orbit section,
 * which says it is a continued flight, not an orbit placed directly (R3.5).
 */
export const smoke = true;
export const timeoutMs = 360_000;

const TARGET_KM = 500; // the "leo" preset: 500 × 500 km
const TOLERANCE_KM = 30;

export default async function launchExplore(t) {
  const app = await t.open({ hash: '#/launch/explore' });
  const { page } = app;

  const setup = await app.mcp('configure_mission', { vehicleId: 'falcon9', siteId: 'cape', orbitId: 'leo' });
  t.check(setup.ok && setup.config.vehicleId === 'falcon9' && setup.config.orbit.id === 'leo', `configure_mission did not take Falcon 9 to LEO: ${JSON.stringify(setup.config)}`);
  t.check(setup.feasibility.level === 'ok', `the mission is not feasible as configured: ${JSON.stringify(setup.feasibility)}`);
  const pad = await app.mcp('read_flight_state');
  t.check(pad.hasMission && pad.vehicle.id === 'falcon9' && pad.frame.status === 'prelaunch' && !pad.frame.liftoff,
    `the configured mission is not on the pad: ${pad.vehicle?.id} ${pad.frame?.status}`);

  const launched = await app.mcp('launch_mission', {});
  if (!t.check(launched.ok && launched.mode === 'live' && launched.playing, `launch_mission: ${JSON.stringify(launched)}`)) return;
  const warp = await app.mcp('control_playback', { action: 'warp', warp: 1000 });
  t.check(warp.ok && warp.warp === 1000, `the warp did not take: ${JSON.stringify(warp)}`);

  // fly until the flight reports the orbit (or fails); about a minute and a half of wall time with software WebGL
  let last = null;
  const reached = await t.until(async () => {
    last = await app.mcp('read_flight_state');
    return last.frame.status === 'orbit' || last.frame.status === 'failed' || last.frame.destroyed;
  }, { timeoutMs: 240_000, intervalMs: 2000 });
  const f = last.frame;
  t.log(`T+${f.timeS.toFixed(0)} s: ${f.status}, ${f.periapsisKm.toFixed(0)} × ${f.apoapsisKm.toFixed(0)} km, ${f.inclinationDeg.toFixed(1)}°`);
  if (!t.check(reached && f.status === 'orbit', `the flight did not reach orbit: status ${f.status} at T+${f.timeS.toFixed(0)} s, ${f.periapsisKm.toFixed(0)} × ${f.apoapsisKm.toFixed(0)} km${reached ? '' : ' (timed out)'}`)) return;
  t.check(Math.abs(f.periapsisKm - TARGET_KM) < TOLERANCE_KM && Math.abs(f.apoapsisKm - TARGET_KM) < TOLERANCE_KM,
    `the orbit is not the ${TARGET_KM} km one asked for: ${f.periapsisKm.toFixed(1)} × ${f.apoapsisKm.toFixed(1)} km`);
  t.check(!f.destroyed, 'the vehicle was lost on the way');
  const events = await app.mcp('get_events', {});
  const keys = events.events.map((e) => e.key);
  const targetEvent = events.events.find((e) => e.key === 'evt.targetOrbit');
  for (const key of ['evt.liftoff', 'evt.meco', 'evt.stageSep', 'evt.seco', 'evt.targetOrbit']) t.check(keys.includes(key), `no ${key} in the event log`);

  // the whole-flight telemetry is sampled sparsely in orbit and arrives from the physics worker in batches:
  // fly on a little so the recording holds the finished orbit before exporting it
  const settleTo = (targetEvent?.timeS ?? f.timeS) + 120;
  t.check(await t.until(async () => (await app.mcp('read_flight_state')).headTimeS >= settleTo, { timeoutMs: 60_000, intervalMs: 1000 }),
    `the flight stopped short of T+${settleTo.toFixed(0)} s after the orbit`);

  // export the whole flight
  // the event log either side of the export (an event may land in between)
  const logBefore = await app.mcp('get_events', {});
  const csv = await app.mcp('export_csv');
  const logAfter = await app.mcp('get_events', {});
  if (!t.check(csv.ok && typeof csv.csv === 'string', `export_csv: ${JSON.stringify(csv).slice(0, 200)}`)) return;
  const bytes = Buffer.byteLength(csv.csv);
  t.log(`${csv.filename}: ${(bytes / 1e6).toFixed(2)} MB`);
  t.check(csv.filename === 'orbitlab_falcon9_leo.csv', `the CSV is named ${csv.filename}`);
  t.check(bytes > 1_000_000, `the CSV is only ${bytes} bytes (the audit's was 1 308 674)`);
  // telemetry rows, a blank line, then "# events" (src/ui/csv.ts)
  const lines = csv.csv.split('\n');
  const blank = lines.indexOf('');
  const header = splitCsv(lines[0]);
  const col = (name) => header.indexOf(name);
  if (t.check(col('t_s') === 0 && col('alt_m') > 0 && col('periapsis_m') > 0 && blank > 0 && lines[blank + 1] === '# events',
    `unexpected CSV layout: ${lines[0].slice(0, 120)} … line ${blank + 2}: ${lines[blank + 1]}`)) {
    const rows = lines.slice(1, blank).map(splitCsv);
    const ragged = rows.findIndex((r) => r.length !== header.length);
    t.check(ragged < 0, `CSV row ${ragged + 2} has ${rows[ragged]?.length} fields for ${header.length} columns`);
    const times = rows.map((r) => Number(r[0]));
    t.check(rows.length > 500, `the CSV has only ${rows.length} samples`);
    t.check(times.every((v, i) => Number.isFinite(v) && (i === 0 || v >= times[i - 1])), 'the CSV time column is not a rising series of numbers');
    t.check(times[0] <= 0 && times.at(-1) >= (targetEvent?.timeS ?? Infinity) - 1,
      `the CSV does not cover the flight: T${times[0]} … T+${times.at(-1)} s, target orbit at T+${targetEvent?.timeS?.toFixed(0)} s`);
    const lastPeri = Number(rows.at(-1)[col('periapsis_m')]) / 1000;
    t.check(Math.abs(lastPeri - TARGET_KM) < TOLERANCE_KM, `the CSV ends at a ${lastPeri.toFixed(1)} km periapsis, not the orbit reached`);
    const logged = lines.slice(blank + 3).map((l) => splitCsv(l)[1]);
    t.check(logged.includes('evt.targetOrbit') && logged.length >= logBefore.totalCount && logged.length <= logAfter.totalCount,
      `the CSV event log has ${logged.length} events (the flight has ${logBefore.totalCount}–${logAfter.totalCount}), target orbit ${logged.includes('evt.targetOrbit') ? 'present' : 'missing'}`);
  }
  t.check(await page.evaluate(() => location.hash) === '#/launch/explore', 'the page left Explore');

  // R3.5: the Orbit step, then the Orbit section's words for a continued flight
  const orbitStep = page.locator('#mission-steps [data-step="orbit"] button');
  if (t.check(await t.until(() => orbitStep.isVisible(), { timeoutMs: 5000 }), 'the steps offer no way on to Orbit for a flight in orbit')) {
    await orbitStep.click();
    t.check(await t.until(async () => (await page.evaluate(() => location.hash)) === '#/orbit/explore', { timeoutMs: 15_000 }), 'the Orbit step did not open the Orbit section');
    const kind = page.locator('.pg-handoff-kind');
    t.check(await t.until(async () => /Where the flight got to/.test((await kind.textContent().catch(() => '')) ?? ''), { timeoutMs: 15_000 }),
      'the Orbit section does not say the orbit is the flight carried on');
    const groups = await page.evaluate(() => [...document.querySelectorAll('optgroup')].map((g) => [g.label, [...g.querySelectorAll('option')].map((o) => o.value)]));
    t.check(groups.some(([label, values]) => label === 'Continue from a flight' && values.join() === 'handoff'), `the picker does not set the flight apart: ${JSON.stringify(groups)}`);
    t.check(groups.some(([label, values]) => label === 'Place an orbit directly' && values.includes('custom') && !values.includes('handoff')), `the placed orbits are not grouped apart: ${JSON.stringify(groups)}`);
  }
  app.checkErrors();
}

/** One CSV line into fields ("…" quoting with "" for a quote, as src/ui/csv.ts writes it). */
function splitCsv(line) {
  const out = [];
  let field = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(field); field = ''; } else field += c;
  }
  out.push(field);
  return out;
}
