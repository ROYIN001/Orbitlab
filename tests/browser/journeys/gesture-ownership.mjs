/** Native page scroll belongs to Build/Orbit text; only each viewer's own
 * canvas rotates/zooms. Exercise real mouse wheel, keyboard and touch input. */
import assert from 'node:assert/strict';

export const smoke = true;
export const timeoutMs = 180_000;

export default async function gestureOwnership(t) {
  const app = await t.open({ hash: '#/build/engineer', viewport: { width: 1024, height: 700 }, touch: true,
    // Reduced motion holds the landing-page cinematic camera still, so an
    // input-induced change is distinguishable from its automatic slow pan.
    contextOptions: { serviceWorkers: 'block', reducedMotion: 'reduce' } });
  const { page } = app;
  const camera = () => page.evaluate(() => {
    const c = window.orbitlab.cams;
    return [c.zoom, c.spaceDist, c.az, c.userEl];
  });
  const settle = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const route = async (hash, visible) => {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await page.locator(visible).first().waitFor({ state: 'visible' });
    await settle();
  };
  const wheelScroll = async (scrollSelector, textSelector, label) => {
    const scrolling = page.locator(scrollSelector);
    await scrolling.evaluate((el) => { el.scrollTop = 0; });
    const range = await scrolling.evaluate((el) => el.scrollHeight - el.clientHeight);
    assert.ok(range > 100, `${label}: the real page has a scrollable text range`);
    await page.locator(textSelector).first().hover();
    const before = await camera();
    await page.mouse.wheel(0, 450);
    assert.ok(await t.until(() => scrolling.evaluate((el) => el.scrollTop > 10)), `${label}: actual wheel scrolls the text`);
    assert.deepEqual(await camera(), before, `${label}: the covered Launch camera stays unchanged`);
    t.log(`${label}: scrolled to ${await scrolling.evaluate((el) => el.scrollTop)}px`);
  };

  await wheelScroll('#build-screen', '.be-head-text .bs-lead:visible', 'Build Engineer');
  await page.locator('#build-screen').evaluate((el) => { el.scrollTop = 0; });
  await page.locator('.bs-title:visible').first().click();
  const keyboardCamera = await camera();
  await page.keyboard.press('PageDown');
  assert.ok(await t.until(() => page.locator('#build-screen').evaluate((el) => el.scrollTop > 10)), 'PageDown scrolls Build text');
  assert.deepEqual(await camera(), keyboardCamera, 'text keyboard input does not rotate the covered scene');

  await page.locator('#build-screen').evaluate((el) => { el.scrollTop = 0; });
  const textBox = await page.locator('.be-head-text .bs-lead:visible').boundingBox();
  const cdp = await app.context.newCDPSession(page);
  const touchCamera = await camera();
  // Dispatch actual touch points: Chromium's synthesizeScrollGesture can
  // produce pointer moves without touch moves in desktop touch emulation.
  const tx = textBox.x + textBox.width / 2, ty = textBox.y + textBox.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty, id: 1 }] });
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove', touchPoints: [{ x: tx, y: ty - i * 20, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.ok(await t.until(() => page.locator('#build-screen').evaluate((el) => el.scrollTop > 10)), 'touch drag scrolls Build text');
  assert.deepEqual(await camera(), touchCamera, 'native text touch does not rotate the covered scene');

  for (const level of ['watch', 'explore']) {
    await route(`#/build/${level}`, '#build-screen .bs-title:visible');
    await wheelScroll('#build-screen', '#build-screen .bs-title:visible', `Build ${level}`);
  }
  await route('#/build/engineer', '.be-head-text .bs-lead:visible');
  await page.locator('[data-k="craft:satellite"]:visible').click();
  await wheelScroll('#build-screen', '#build-screen .bs-title:visible', 'Satellite Engineer');

  // Below 1180px, Orbit's text panels share their parent page's scroll.
  await page.setViewportSize({ width: 1024, height: 560 });
  await route('#/orbit/engineer', '.pg-canvas-3d:visible');
  await wheelScroll('#orbit-playground', '.pg-controls .pg-title', 'Orbit controls');
  const orbitCamera = () => page.evaluate(() => {
    const view = window.orbitlab.playground.orbitView;
    return { dist: view.dist, az: view.az, el: view.el };
  });
  const canvas = page.locator('.pg-canvas-3d');
  const hiddenBefore = await camera();
  const orbitBefore = await orbitCamera();
  await canvas.hover();
  await page.mouse.wheel(0, 120);
  assert.ok(await t.until(async () => (await orbitCamera()).dist > orbitBefore.dist), 'Orbit canvas wheel zooms its own view');
  assert.deepEqual(await camera(), hiddenBefore, 'Orbit wheel does not also zoom the hidden Launch view');
  await canvas.focus();
  const keyboardOrbit = await orbitCamera();
  await page.keyboard.press('ArrowRight');
  assert.notEqual((await orbitCamera()).az, keyboardOrbit.az, 'focused Orbit canvas keeps keyboard rotation');

  const point = await exposedPoint(page, '.pg-canvas-3d');
  await page.mouse.move(point.x, point.y);
  const rightBefore = await orbitCamera();
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(point.x + 30, point.y + 20);
  await page.mouse.up({ button: 'right' });
  assert.deepEqual(await orbitCamera(), rightBefore, 'secondary mouse button leaves the Orbit camera alone');
  const pinchBefore = await orbitCamera();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
    { x: point.x - 30, y: point.y, id: 1 }, { x: point.x + 30, y: point.y, id: 2 },
  ] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [
    { x: point.x - 60, y: point.y, id: 1 }, { x: point.x + 60, y: point.y, id: 2 },
  ] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.ok((await orbitCamera()).dist < pinchBefore.dist, 'two-finger Orbit pinch zoom remains available');
  assert.deepEqual(await camera(), hiddenBefore, 'Orbit pointer/touch input leaves the covered Launch camera alone');

  // On a wide desktop the text panel itself owns its independent scroll.
  await page.setViewportSize({ width: 1280, height: 800 });
  await settle();
  await wheelScroll('.pg-controls', '.pg-controls .pg-title', 'Orbit wide controls');
  await route('#/launch/engineer', '#camera-tabs');
  await page.locator('[data-cam="exterior"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#btn-reset-cam').count(), 0, 'the visible Launch camera reset button is removed');
  const launchPoint = await exposedPoint(page, '#gl');
  await page.mouse.move(launchPoint.x, launchPoint.y);
  const launchBefore = await camera();
  await page.mouse.wheel(0, 120);
  assert.ok(await t.until(async () => (await camera())[0] > launchBefore[0]), 'Launch canvas wheel still zooms');
  const dragBefore = await camera();
  await page.mouse.down();
  await page.mouse.move(launchPoint.x + 25, launchPoint.y + 10);
  await page.mouse.up();
  assert.notEqual((await camera())[2], dragBefore[2], 'Launch canvas primary drag still rotates');
  app.checkErrors();
}

async function exposedPoint(page, selector) {
  const point = await page.locator(selector).evaluate((el) => {
    const r = el.getBoundingClientRect();
    for (const fy of [0.5, 0.4, 0.6, 0.3, 0.7]) for (const fx of [0.5, 0.4, 0.6, 0.3, 0.7]) {
      const x = r.x + r.width * fx, y = r.y + r.height * fy;
      if (document.elementFromPoint(x, y) === el) return { x, y };
    }
    return null;
  });
  assert.ok(point, `${selector}: a real input point lands on the canvas`);
  return point;
}
