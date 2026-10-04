/**
 * The satellite builder end to end (roadmap D06; the integration of Phase 4
 * stage 3, map §2.6): in the Build section's satellite designer, start from
 * NAPA-2, put its cells on wings and change the array, see the figures follow,
 * save the design and reload the page — the saved design and the draft are
 * still there — then send it to the Orbit section, where the lifetime
 * dialog takes the design's own mass and drag area (the body's tumbling
 * area plus half the wings, 0.111075 m² here, not a class's), and last "Fly
 * it": before the click the box gives the Launch section's verdict on the
 * Launch section's own Soyuz-2.1a ("Not flyable as set", task I2) and offers
 * the rockets that can fly it; Electron is chosen among them, and the Launch
 * section flies the design as the mission's own satellite, point mass, to
 * payload separation.
 *
 * Driven through the page's own controls, as a student would; the flight is
 * launched and fast-forwarded through WebMCP (`launch_mission`,
 * `control_playback` skip_next), as tests/browser/journeys/launch-explore.mjs
 * drives one.
 */
// 34–47 s here on a shared 4-core machine (software WebGL), so part of the smoke run
import { workspaceValue } from '../workspace-storage.mjs';

export const smoke = true;
export const timeoutMs = 300_000;

/** NAPA-2's 20 × 10 × 34.05 cm box tumbling (a quarter of its surface) plus half of 0.1 m² of wings, m². */
const AREA = (2 * (0.2 * 0.1 + 0.2 * 0.3405 + 0.1 * 0.3405)) / 4 + 0.1 / 2;

export default async function satellite(t) {
  const app = await t.open({ hash: '#/build/explore' });
  const { page } = app;

  // the satellite side of the Explore level
  await page.click('[data-k="craft:satellite"]');
  const grid = '.bsat-grid:not([hidden])';
  if (!t.check(await page.waitForSelector(`${grid} .bsat-summary`, { timeout: 60_000 }).catch(() => null), 'the satellite designer did not open')) return;

  // start from NAPA-2 (from another template first, so the pick is a change)
  await page.selectOption(`${grid} [data-k="sx:template"]`, 'theos2');
  await page.selectOption(`${grid} [data-k="sx:template"]`, 'napa2');
  await page.fill(`${grid} [data-k="sx:name"]`, 'Journey NAPA-2');
  const glance = async () => page.locator(`${grid} .bsat-summary`).innerText();
  const before = await glance();
  t.check(/10\.0\s*kg/.test(before), `NAPA-2's glance does not show its 10 kg: ${before}`);

  // the array: cells on wings that track the Sun, 0.1 m² of them
  await page.selectOption(`${grid} [data-k="sx:mount"]`, 'tracking');
  const areaBox = page.locator(`${grid} [data-k="sx:power.arrayArea"]`);
  // emptied on the way to a new number, as a student retypes it: a NaN the Fly it box must not try to fly (no page error)
  await areaBox.fill('');
  t.check(await page.locator(`${grid} [data-k="sx:fly"]`).isDisabled(), 'Fly it is offered for a design with an empty array area');
  await areaBox.fill('0.1');
  await areaBox.press('Tab');
  const after = await t.until(async () => { const g = await glance(); return g !== before && !(await page.$(`${grid} .bsat-glance.stale`)) ? g : null; }, { timeoutMs: 10_000 });
  t.check(after, 'the figures did not follow the new array');
  const sections = await page.locator(`${grid} .bsat-figures .bsat-section`).count();
  t.check(sections >= 5, `only ${sections} figure sections are shown`);
  // the drag area at a glance: the body tumbling and half the wings
  t.check(/0[.,]111/.test(after ?? ''), `the drag area of the wings and body (${AREA.toFixed(6)} m²) is not at a glance: ${after}`);

  // save it, and reload: the saved design and the draft come back
  await page.click(`${grid} [data-k="store:save"]`);
  t.check(await t.until(async () => (await page.locator(`${grid} .bsat-store`).innerText()).includes('Journey NAPA-2')), 'the saved design is not listed');
  await page.waitForTimeout(700); // the draft is kept a moment after the last change
  await page.reload({ waitUntil: 'domcontentloaded' });
  await app.ready();
  if (!t.check(await page.waitForSelector(`${grid} .bsat-summary`, { timeout: 60_000 }).catch(() => null), 'the satellite designer did not come back after the reload')) return;
  t.check((await page.locator(`${grid} .bsat-store`).innerText()).includes('Journey NAPA-2'), 'the saved design is gone after the reload');
  t.check(await page.inputValue(`${grid} [data-k="sx:mount"]`) === 'tracking', 'the draft lost its wings after the reload');
  t.check(/^0[.,]1$/.test(await page.inputValue(`${grid} [data-k="sx:power.arrayArea"]`)), 'the draft lost its array area after the reload');

  // send it to the Orbit section; its lifetime dialog takes the design's mass and area
  await page.click(`${grid} [data-k="sx:toOrbit"]`);
  t.check(await t.until(async () => (await page.evaluate(() => location.hash)) === '#/orbit/explore'), 'Send to Orbit did not open the Orbit section');
  // R3.1: the hand-off names the saved design and its revision
  t.check(await t.until(async () => /Journey NAPA-2, saved /.test((await page.locator('.pg-handoff-design').textContent().catch(() => '')) ?? ''), { timeoutMs: 15_000 }),
    `the Orbit section does not name the saved design: "${await page.locator('.pg-handoff-design').textContent().catch(() => '')}"`);
  // R3.5: a design is placed in its orbit directly, and the Orbit section says so
  t.check(await t.until(async () => /Placed directly/.test((await page.locator('.pg-handoff-kind').textContent().catch(() => '')) ?? ''), { timeoutMs: 15_000 }),
    'the Orbit section does not say the design was placed directly');
  const placedGroup = await page.evaluate(() => [...document.querySelectorAll('optgroup')].map((g) => [g.label, [...g.querySelectorAll('option')].map((o) => o.value)]));
  t.check(placedGroup.some(([label, values]) => label === 'Place an orbit directly' && values[0] === 'handoff')
    && !placedGroup.some(([label]) => label === 'Continue from a flight'), `the design is not among the orbits placed directly: ${JSON.stringify(placedGroup)}`);
  const life = page.locator('button:visible', { hasText: 'Orbit lifetime' }).first();
  if (!t.check(await life.waitFor({ timeout: 30_000 }).then(() => true).catch(() => false), 'no lifetime button in the Orbit section')) return;
  await life.click();
  const area = page.locator('.life-settings input[aria-label="Cross-section (m²)"]');
  if (t.check(await area.waitFor({ timeout: 15_000 }).then(() => true).catch(() => false), 'the lifetime dialog has no cross-section box')) {
    const shown = Number((await area.inputValue()).replace(',', '.'));
    t.check(Math.abs(shown - AREA) < 1e-9, `the lifetime dialog took ${shown} m², not the design's ${AREA}`);
    const values = await page.evaluate(() => [...document.querySelectorAll('.life-settings input')].map((i) => `${i.getAttribute('aria-label')}=${i.value}`));
    t.check(values.some((v) => /=10$/.test(v)), `the lifetime dialog does not fly the design's 10 kg: ${values.join(' ')}`);
  }
  await page.keyboard.press('Escape');

  // Fly it on Electron, point mass, to payload separation
  await page.evaluate(() => { location.hash = '#/build/explore'; });
  if (!t.check(await page.waitForSelector(`${grid} [data-k="sx:fly"]`, { timeout: 30_000 }).catch(() => null), 'no Fly it in the satellite designer')) return;
  // before the click (task I2): the Launch section's verdict on its own Soyuz-2.1a, in the setup panel's words —
  // not flyable as set, since with no restartable upper stage its insertion is final — and the rockets that can fly it
  const verdictOf = () => page.$eval(`${grid} .bsat-fly-verdict`, (e) => `${e.dataset.verdict} ${e.dataset.cause}`).catch(() => null);
  const verdictBefore = await t.until(verdictOf, { timeoutMs: 15_000 });
  t.check(verdictBefore === 'fail noRestart', `Fly it does not say NAPA-2 on Soyuz-2.1a is not flyable as set: ${verdictBefore}`);
  t.check((await page.locator(`${grid} .bsat-fly-verdict .status-title`).innerText().catch(() => '')).includes('Not flyable as set'),
    'the verdict is not in the setup panel\'s words');
  const offered = await t.until(async () => (await page.$(`${grid} [data-k="sx:flyOn:electron"]`)) !== null, { timeoutMs: 60_000 });
  t.check(offered, 'Electron is not offered among the rockets that can fly it');
  t.check(!(await page.$(`${grid} [data-k="sx:flyOn:soyuz21a"]`)), 'Soyuz-2.1a is offered as a rocket that can fly it');
  if (offered) await page.click(`${grid} [data-k="sx:flyOn:electron"]`);
  else await page.selectOption(`${grid} [data-k="sx:flyVehicle"]`, 'electron');
  t.check(await page.inputValue(`${grid} [data-k="sx:flyVehicle"]`) === 'electron', 'choosing Electron among them did not pick it');
  t.check(await t.until(async () => (await verdictOf()) === 'ok ready'), `the verdict on Electron is ${await verdictOf()}, not ready`);
  const fit = await page.getAttribute(`${grid} .bsat-fly [data-fairing-fit]`, 'data-fairing-fit');
  t.check(fit === 'fits', `the fairing note on Electron says ${fit}`);
  const saidBefore = await page.locator(`${grid} .bsat-fly-verdict .status-text`).innerText().catch(() => '');
  await page.click(`${grid} [data-k="sx:fly"]`);
  t.check(await t.until(async () => (await page.evaluate(() => location.hash)) === '#/launch/explore'), 'Fly it did not open the Launch section');
  // what was said before the click is what the Launch section's own panel says of the mission it opened (the review's check)
  const panelSays = await t.until(() => page.evaluate(() => {
    const n = document.querySelector('#mission-note');
    const text = n?.querySelector('.status-text')?.textContent;
    return text ? { level: n.className.replace('status-note', '').trim(), text } : null;
  }), { timeoutMs: 30_000 });
  t.check(panelSays?.level === 'ok' && panelSays.text === saidBefore,
    `the Launch section's verdict (${panelSays?.level}: ${panelSays?.text}) is not the one Fly it gave (ok: ${saidBefore})`);
  const stored = await workspaceValue(page, 'orbitlab.mission');
  t.check(stored?.version === 3 && stored.mission.vehicleId === 'electron' && stored.mission.satelliteSpec?.name === 'Journey NAPA-2',
    `the Launch section's mission is not the design on Electron (v3): ${JSON.stringify(stored?.mission ?? null).slice(0, 300)}`);
  t.check(Math.abs((stored?.mission?.satelliteSpec?.area ?? 0) - AREA) < 1e-12, 'the mission does not carry the design\'s drag area');
  // R3.1: the mission says which design it flies and which revision, and keeps it with the stored mission
  t.check(await t.until(async () => /your design · Journey NAPA-2, saved /.test(await page.locator('#mission-eyebrow').textContent() ?? ''), { timeoutMs: 10_000 }),
    `the mission does not name the design and its revision: "${await page.locator('#mission-eyebrow').textContent()}"`);
  const kept = await t.until(async () => { const s2 = await workspaceValue(page, 'orbitlab.mission'); return s2?.design?.recordId && s2.design.name === 'Journey NAPA-2' && !s2.design.edited ? s2.design : null; }, { timeoutMs: 10_000 });
  t.check(!!kept && /^\d{4}-\d{2}-\d{2}T/.test(kept.revision), `the stored mission does not keep the design's revision: ${JSON.stringify(kept)}`);

  const launched = await app.mcp('launch_mission', {});
  if (!t.check(launched.ok && launched.config?.customSatellite?.name === 'Journey NAPA-2', `launch_mission: ${JSON.stringify(launched).slice(0, 300)}`)) return;
  t.check(launched.config.dynamics?.model === 'pointMass', `the flight is not point mass: ${JSON.stringify(launched.config.dynamics)}`);
  await app.mcp('control_playback', { action: 'warp', warp: 1000 });
  let sep = null;
  const reached = await t.until(async () => {
    const ev = await app.mcp('get_events', {});
    sep = ev.events.find((e) => e.key === 'evt.payloadSep') ?? null;
    if (sep || ev.events.some((e) => e.key === 'evt.vehicleLost' || e.severity === 'fail')) return true;
    await app.mcp('control_playback', { action: 'skip_next' }).catch(() => {});
    return false;
  }, { timeoutMs: 150_000, intervalMs: 1000 });
  t.check(reached && sep, `the flight did not reach payload separation${reached ? '' : ' (timed out)'}`);
  if (sep) {
    t.log(`payload separation at T+${sep.timeS.toFixed(0)} s`);
    t.check(sep.params?.name === 'Journey NAPA-2', `the separation event names ${sep.params?.name}`);
  }
  const state = await app.mcp('read_flight_state');
  t.check(state.satellite?.name === 'Journey NAPA-2', `the flight's satellite is ${state.satellite?.name}`);
  t.check(state.frame?.status !== 'failed' && !state.frame?.destroyed, `the flight failed: ${state.frame?.status}`);
  app.checkErrors();
}
