/**
 * Explore's complete preflight warning is readable without a hover tooltip,
 * including combined failures on a phone. Launch exposes the same warning
 * to assistive technology, and the suggested window works by keyboard/touch.
 */
import { keyOn, press } from '../harness.mjs';

export const smoke = true;
export const timeoutMs = 300_000;

const MISSION = {
  vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', orbitId: 'iss',
  launchTimeIso: '2026-10-02T12:00:00Z', boosterRecovery: false,
  payloadMassKg: 30000, inclinationDeg: 90, raanMode: 'fixed', raanDeg: 180,
  failureMode: 'engineOut',
};
const normalize = (text) => text.replace(/\s+/g, ' ').trim();

export default async function preflight(t) {
  for (const [viewport, lang] of [['desktop', 'en'], ['mobile', 'en'], ['mobile', 'ru'], ['mobile', 'th']]) {
    const mobile = viewport === 'mobile';
    const where = `${viewport}/${lang}`;
    let step = 'open the app';
    try {
      const app = await t.open({ hash: '#/launch/explore', viewport, lang, touch: mobile, guide: true });
      const { page } = app;
      step = 'advance the guide';
      await checkGuide(t, app, where, mobile);
      if (mobile) {
        step = 'check the toolbar on a narrow phone';
        await checkNarrowToolbar(t, app, where, lang);
      }
      step = 'configure the combined warning';
      const configured = await app.mcp('configure_mission', MISSION);
      if (!t.check(configured.ok && configured.feasibility.cause === 'overCapacity' && configured.feasibility.offWindow,
        `${where}: did not configure the combined warning: ${JSON.stringify(configured.feasibility)}`)) {
        await app.shot(`${viewport}-${lang}-configuration-failed`);
        await app.context.close();
        continue;
      }
      step = 'read the full warning';
      await page.evaluate(() => document.fonts.ready);
      await checkVisible(t, app, where, configured.feasibility.text);

      // The longest translation must also fit a narrow, short phone.
      if (lang === 'ru') {
        await page.setViewportSize({ width: 320, height: 568 });
        await checkVisible(t, app, `${where}/320×568`, configured.feasibility.text);
      }

      step = 'check keyboard focus and accessible description';
      const launch = page.locator('#setup .launch-button');
      await launch.focus();
      t.check(await launch.evaluate((el) => document.activeElement === el), `${where}: Launch does not take keyboard focus`);
      const cdp = await app.context.newCDPSession(page);
      const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#setup .launch-button' });
      const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      const description = normalize(nodes[0]?.description?.value ?? '');
      t.check(description.includes(normalize(configured.feasibility.text)), `${where}: Launch's accessible description omits part of the warning: ${description}`);
      await cdp.detach();

      // Off-window is the first suggested fix; activation must actually change
      // the launch time and clear that warning, while retaining the others.
      step = 'apply the next-window fix';
      const windowFix = page.locator('#setup .verdict-fixes .fix').first();
      await windowFix.scrollIntoViewIfNeeded();
      const activated = mobile
        ? await press(t, app, windowFix, 'touch', `${where}: next window`)
        : await keyOn(t, app, windowFix, 'Enter', `${where}: next window`);
      if (activated) {
        const repaired = await t.until(() => page.evaluate(() => {
          const panel = window.orbitlab.panel;
          const verdict = panel.feasibility();
          return !verdict.offWindow && {
            launchTime: panel.state.launchTime.toISOString(),
            failureMode: panel.state.failure.mode,
            verdict,
          };
        }), { timeoutMs: 20_000 });
        if (t.check(repaired, `${where}: next window did not resolve the plane warning`)) {
          t.check(Date.parse(repaired.launchTime) !== Date.parse(MISSION.launchTimeIso) && repaired.failureMode === 'engineOut'
            && repaired.verdict.cause === 'overCapacity', `${where}: next window changed an unrelated mission choice: ${JSON.stringify(repaired)}`);
          await checkVisible(t, app, `${where}/repaired`, repaired.verdict.text);
        }
      }
      step = 'capture the result and check page errors';
      await app.shot(`${viewport}-${lang}`);
      app.checkErrors();
      await app.context.close();
    } catch (error) {
      // Keep the failed context open for the runner's screenshots and cleanup.
      const detail = String(error?.message ?? error).split('\n').map((line) => line.trim()).filter(Boolean).join(' | ');
      throw new Error(`${where}: ${step}: ${detail.slice(0, 3000)}`, { cause: error });
    }
  }
}

async function checkNarrowToolbar(t, app, where, lang) {
  const { page } = app;
  const size = page.viewportSize();
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => document.fonts.ready);
  const controls = await page.evaluate(() => {
    scrollTo(0, 0);
    return ['btn-lessons', 'btn-data-mode', 'btn-help', 'btn-work', 'btn-about', 'btn-camera-plan', 'lang-select'].map((id) => {
      const el = document.getElementById(id);
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return {
        id, left: r.left, right: r.right,
        onScreen: r.width > 0 && r.height > 0 && r.left >= 0 && r.right <= document.documentElement.clientWidth
          && r.top >= 0 && r.bottom <= innerHeight,
        hit: hit === el || el.contains(hit),
      };
    });
  });
  for (const control of controls) {
    t.check(control.onScreen && control.hit,
      `${where}/320×568: toolbar control #${control.id} is outside the screen or covered (${Math.round(control.left)}–${Math.round(control.right)} px)`);
  }
  await app.shot(`mobile-${lang}-toolbar-320`);
  await page.setViewportSize(size);
}

async function checkGuide(t, app, where, mobile) {
  const { page } = app;
  const read = () => page.evaluate(() => ({
    progress: document.querySelector('.help-guide-progress').textContent,
    guideNext: document.querySelector('.help-guide-next').textContent,
    setupNext: document.querySelector('.explore-step:not([hidden]) .step-nav .next').textContent,
    step: document.querySelector('.explore-step-tab[aria-current="step"]').dataset.step,
    mission: JSON.stringify(window.orbitlab.panel.state),
  }));
  const before = await read();
  t.check(before.guideNext !== before.setupNext, `${where}: tips and mission setup use the same Next label`);
  const next = page.locator('.help-guide-next');
  await next.scrollIntoViewIfNeeded();
  const activated = mobile
    ? await press(t, app, next, 'touch', `${where}: next tip`)
    : await keyOn(t, app, next, 'Enter', `${where}: next tip`);
  if (!activated) return;
  const after = await read();
  t.check(after.progress !== before.progress, `${where}: the next tip did not advance`);
  t.check(after.step === before.step && after.mission === before.mission,
    `${where}: reading the next tip changed mission setup`);
}

async function checkVisible(t, app, where, expected) {
  const note = app.page.locator('#mission-note');
  await note.scrollIntoViewIfNeeded();
  const view = await note.evaluate((el) => {
    const text = el.querySelector('.status-text');
    const rect = text.getBoundingClientRect();
    return {
      text: text.textContent,
      clientHeight: text.clientHeight, scrollHeight: text.scrollHeight,
      clientWidth: text.clientWidth, scrollWidth: text.scrollWidth,
      top: rect.top, bottom: rect.bottom, height: innerHeight,
      documentWidth: document.scrollingElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    };
  });
  t.check(view.text === expected, `${where}: the displayed warning differs from the mission verdict`);
  t.check(view.clientHeight > 0 && view.scrollHeight <= view.clientHeight + 1
    && view.scrollWidth <= view.clientWidth + 1,
  `${where}: the warning is clipped (${view.clientWidth}×${view.clientHeight} px for ${view.scrollWidth}×${view.scrollHeight} px of text)`);
  t.check(view.top >= -1 && view.bottom <= view.height + 1,
    `${where}: the warning cannot be read on screen (${Math.round(view.top)}–${Math.round(view.bottom)} px in ${view.height} px)`);
  t.check(view.documentWidth <= view.viewportWidth, `${where}: the warning makes the document scroll sideways`);
}
