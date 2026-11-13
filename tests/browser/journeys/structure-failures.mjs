/**
 * The Structure & Assembly section when a fetch fails, in the built app
 * (src/ui/structure-loader.ts, src/ui/structure/stage.ts): each failure is
 * said where the picture would be, with a retry that works, and nothing is
 * offered that is not there —
 *
 * - the section's own code (the note's retry loads the page again at the same
 *   address: a browser keeps a module's failed fetch for the life of the page
 *   — but not while the page cannot be had, when the app is kept as it is);
 * - a model's data; its 3-D alone (the list and a side view then stand in);
 *   one of its layers (the rest goes on working);
 * - a model switched away from while it loads, which must open again later;
 * - a language's copy (the source language shows, and it is said in the app's
 *   own words for that language, with the page loaded again as the way out);
 * - no WebGL for the section's view (the side view, and assembling by it).
 *
 * Without the service worker, whose cache would answer for a fetch this
 * journey wants to fail.
 */
export const timeoutMs = 600_000;

const ready = (page) => page.waitForFunction(() => {
  const s = window.orbitlab?.structure?.section;
  return !!s && s.stage.ready() && s.store.load[s.store.model].state === 'ready' && ![...s.store.layerState[s.store.model].values()].includes('loading');
}, null, { timeout: 180_000 });

export default async function structureFailures(t) {
  const open = (lang = 'th') => t.open({ hash: '#/home', viewport: { width: 1280, height: 800 }, lang, contextOptions: { serviceWorkers: 'block', reducedMotion: 'reduce' } });
  const k = (page, key) => page.locator(`.structure-screen [data-k="${key}"]`);
  const status = (page) => page.locator('.structure-screen .st-status').innerText().catch(() => '');
  const layers = (page) => page.evaluate(() => window.orbitlab.structure.section.stage.debug().layers.slice().sort().join(','));
  const go = (page, hash) => page.evaluate((h) => { location.hash = h; }, hash);
  /** Fail every request matching `pattern` until the returned function is called. */
  const block = async (page, pattern) => { await page.route(pattern, (r) => r.abort('failed')); return () => page.unroute(pattern); };

  // ── the section's own code cannot be fetched
  {
    const app = await open();
    const { page } = app;
    const unblock = await block(page, /\/assets\/structure-[\w-]+\.js$/);
    await go(page, '#/structure/watch/edusat');
    const note = page.locator('#structure-screen');
    await note.locator('button').waitFor({ timeout: 60_000 });
    t.check((await note.innerText()).includes('ไม่สามารถโหลด'), `the section's code failed to load: “${(await note.innerText()).replace(/\s+/g, ' ').slice(0, 90)}”`);
    // still offline, with no worker to answer for the page: trying again must not put the browser's error page in the app's place
    await app.context.setOffline(true);
    await note.locator('button').click();
    await page.waitForTimeout(1500);
    t.check(page.url().includes('#/structure/watch/edusat') && (await note.innerText()).includes('ไม่สามารถโหลด') && await note.locator('button').count() === 1, `offline, a retry keeps the app and the note: ${page.url().slice(-40)}`);
    await app.context.setOffline(false);
    await unblock();
    await note.locator('button').click();
    await page.waitForSelector('#loading.hidden', { state: 'attached', timeout: 120_000 });
    await ready(page);
    t.check(await page.locator('.structure-screen .st-canvas').count() === 1 && await page.evaluate(() => location.hash) === '#/structure/watch/edusat', 'the retry brought the section, at the same address');
    await app.context.close();
  }

  // ── a model's data, its 3-D, one layer
  {
    const app = await open();
    const { page } = app;
    let unblock = await block(page, /soyuz-2-1b-fregat-st31\.r\d+\.json$/);
    await go(page, '#/structure/explore/soyuz-st31');
    await page.locator('.structure-screen .st-status .st-fail').waitFor({ timeout: 60_000 });
    t.check((await status(page)).includes('โหลดข้อมูลโมเดลไม่สำเร็จ') && await k(page, 'retry').isVisible(), `the model's data failed: “${(await status(page)).replace(/\s+/g, ' ').slice(0, 80)}”`);
    t.check(await page.locator('.structure-screen .st-fallback:not([hidden])').count() === 0 && await page.locator('.structure-screen .st-tools').count() === 0, 'nothing is offered that is not there (no side view, no tools)');
    await unblock();
    await k(page, 'retry').click();
    await ready(page);
    t.check((await layers(page)) === 'outer' && (await status(page)).trim() === '', 'the retry loaded the model');

    // one layer fails: said on the picture with its own retry, the rest goes on working
    unblock = await block(page, /soyuz-2-1b-fregat-st31\.r\d+\.inner\.bin$/);
    await k(page, 'cutaway').click();
    await page.locator('.structure-screen .st-status .st-fail').waitFor({ timeout: 60_000 });
    t.check((await status(page)).includes('โหลดชั้นภายในไม่สำเร็จ') && await k(page, 'retry:inner').isVisible(), `a failed layer: “${(await status(page)).replace(/\s+/g, ' ').slice(0, 80)}”`);
    await k(page, 'name:core').click();
    t.check((await page.locator('.structure-screen .st-info h2').textContent()).includes('แกนกลาง'), 'the model goes on working');
    await unblock();
    await k(page, 'retry:inner').click();
    await ready(page);
    t.check((await layers(page)).includes('inner') && (await status(page)).trim() === '', 'the retry fetched the layer');
    app.checkErrors();
    await app.context.close();
  }
  {
    // the 3-D alone fails (the data is here): the list and a side view stand in, with the note and its retry in sight
    const app = await open();
    const { page } = app;
    const unblock = await block(page, /soyuz-2-1b-fregat-st31\.r\d+\.outer\.bin$/);
    await go(page, '#/structure/explore/soyuz-st31');
    await page.locator('.structure-screen .st-fallback:not([hidden]) .st-side-box').first().waitFor({ timeout: 60_000 });
    t.check((await status(page)).includes('โหลดภาพสามมิติของโมเดลไม่สำเร็จ') && await k(page, 'retry').isVisible(), `the 3-D failed, said where the picture would be: “${(await status(page)).replace(/\s+/g, ' ').slice(0, 80)}”`);
    t.check(await page.locator('.structure-screen .st-side-box').count() === 11, 'the side view shows the eleven assemblies');
    // (a strap-on's box lies over the core's middle from the side: the press is sent to the core's own box)
    await page.locator('.structure-screen .st-side-box').first().dispatchEvent('click');
    t.check((await page.locator('.structure-screen .st-info h2').textContent()).includes('แกนกลาง'), 'a press on the side view picks an assembly');
    await k(page, 'side:list').click();
    t.check(await page.locator('.structure-screen .st-list .st-list-body > .st-tree > li').count() === 11, 'the list works');
    await app.shot('no-3d');
    await unblock();
    await k(page, 'retry').click();
    await ready(page);
    t.check(await page.locator('.structure-screen .st-canvas:not([hidden])').count() === 1 && await page.locator('.structure-screen .st-fallback:not([hidden])').count() === 0, 'the retry brought the 3-D back');
    await app.context.close();
  }

  // ── a model switched away from while it loads
  {
    const app = await open();
    const { page } = app;
    let release;
    const held = new Promise((r) => { release = r; });
    await page.route(/soyuz-2-1b-fregat-st31\.r\d+\.outer\.bin$/, async (route) => { await held; await route.continue().catch(() => {}); });
    await go(page, '#/structure/watch/soyuz-st31');
    await page.waitForFunction(() => window.orbitlab?.structure?.section?.store.load['soyuz-st31'].state === 'loading', null, { timeout: 60_000 });
    await go(page, '#/structure/watch/edusat');
    await page.waitForFunction(() => { const s = window.orbitlab.structure.section; return s.store.model === 'edusat' && s.stage.ready(); }, null, { timeout: 60_000 });
    const drawn = await page.evaluate(() => { const s = window.orbitlab.structure.section; return { model: s.store.model, items: s.viewer.itemCount, soyuz: s.store.load['soyuz-st31'].state }; });
    t.check(drawn.model === 'edusat' && drawn.items === 77 && drawn.soyuz === 'idle', `the satellite is what is drawn, the rocket no longer "loading": ${JSON.stringify(drawn)}`);
    release();
    await page.waitForTimeout(1000);
    t.check(await page.evaluate(() => window.orbitlab.structure.section.viewer.itemCount) === 77, 'the rocket\'s late file changed nothing on screen');
    await go(page, '#/structure/watch/soyuz-st31');
    await ready(page);
    t.check(await page.evaluate(() => window.orbitlab.structure.section.viewer.itemCount) === 2069, 'and the rocket opens when it is asked for again');
    app.checkErrors();
    await app.context.close();
  }

  // ── a language's copy cannot be fetched: the source language shows
  {
    const app = await open('en');
    const { page } = app;
    const unblock = await block(page, /\/assets\/structure-en-[\w-]+\.js$/);
    await go(page, '#/structure/watch/edusat');
    await ready(page);
    t.check((await k(page, 'mode:assemble').textContent()).includes('ประกอบ') && await page.evaluate(() => document.querySelector('.structure-screen').lang) === 'th', 'without its copy the section shows the Thai, and tells the browser so');
    // and it is said, in the app's own English, with the way to get the copy (a browser keeps a module's failed fetch: the page loaded again)
    const langNote = page.locator('.structure-screen .st-lang-note');
    await langNote.waitFor({ timeout: 30_000 });
    t.check((await langNote.innerText()).includes('could not be loaded') && await langNote.getAttribute('lang') === 'en' && await k(page, 'lang:reload').isVisible(), `the missing copy is said: “${(await langNote.innerText()).replace(/\s+/g, ' ').slice(0, 90)}”`);
    await unblock();
    await k(page, 'lang:reload').click();
    await page.waitForSelector('#loading.hidden', { state: 'attached', timeout: 120_000 });
    await ready(page);
    await page.waitForFunction(() => document.querySelector('.structure-screen')?.lang === 'en', null, { timeout: 60_000 });
    t.check((await k(page, 'mode:assemble').textContent()).includes('Assemble') && await page.locator('.structure-screen .st-lang-note').count() === 0, 'loading the page again brought the English copy');
    app.checkErrors();
    await app.context.close();
  }

  // ── no WebGL for the section's view
  {
    const app = await open();
    const { page } = app;
    await app.context.addInitScript(() => {
      const real = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return this.classList.contains('st-canvas') && /webgl/.test(type) ? null : real.call(this, type, ...rest); };
    });
    await page.reload();
    await page.waitForSelector('#loading.hidden', { state: 'attached', timeout: 120_000 });
    await go(page, '#/structure/watch/edusat');
    await page.locator('.structure-screen .st-fallback:not([hidden]) .st-side-box').first().waitFor({ timeout: 60_000 });
    t.check((await status(page)).includes('เบราว์เซอร์นี้แสดงภาพสามมิติไม่ได้'), `without WebGL: “${(await status(page)).replace(/\s+/g, ' ').slice(0, 80)}”`);
    t.check(await page.locator('.structure-screen .st-side-box').count() === 13, 'the side view shows the thirteen units');
    await k(page, 'mode:assemble').click();
    await page.waitForFunction(() => document.querySelector('.structure-screen').dataset.mode === 'assemble');
    if (await k(page, 'restart').isEnabled()) await k(page, 'restart').click();
    await k(page, 'asm-next').click();
    await k(page, 'asm-next').click();
    t.check((await page.locator('.structure-screen .st-asm .st-progress').textContent()).includes('2/13') && await page.locator('.structure-screen .st-side-box').count() === 2, 'assembling works without the 3-D, the side view showing what is in place');
    app.checkErrors();
    await app.context.close();
  }
}
