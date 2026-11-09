/**
 * The Structure & Assembly section (src/ui/structure/, owner 2026-11-09), end
 * to end in the built app:
 *
 * - opened by a direct link, and left and come back to with Back;
 * - Soyuz-2.1b/Fregat ST31: a part picked in the list and in the 3-D view,
 *   the page's own cutaway (its inside layer fetched on demand), taken apart
 *   and reset; the depth changed with the selection kept; assembled to the
 *   reference, a step out of order, in another block's place and the wrong
 *   way round each refused with its reason, undone, and the result checked by
 *   its relations and with nothing left apart;
 * - EduSat-3U: straight to "my experiment", the night camera running short on
 *   one cell and powered on two, for 60 g more; sent to Orbit and to Launch,
 *   each reading back the design's mass; a change after sending flagged;
 * - a phone-sized touch screen with reduced motion: assembling with taps and
 *   buttons only, and the keyboard on the 3-D view.
 *
 * Console errors (shader failures among them) fail it.
 */
export const timeoutMs = 600_000;

const ready = (page) => page.waitForFunction(() => {
  const home = document.querySelector('.structure-screen [data-k="home"]');
  return home && !home.disabled && !document.querySelector('.structure-screen .st-status')?.textContent;
}, null, { timeout: 180_000 });

export default async function structureAssembly(t) {
  // ── a desktop, in Thai, opened by its own address
  const app = await t.open({ hash: '#/structure/explore/soyuz-st31', viewport: { width: 1440, height: 900 }, lang: 'th' });
  const { page } = app;
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  const k = (key) => page.locator(`.structure-screen [data-k="${key}"]`);
  const text = async (sel) => (await page.locator(sel).first().textContent())?.trim() ?? '';
  const msg = () => text('.st-asm .st-msg');
  const screen = () => page.evaluate(() => ({ ...document.querySelector('.structure-screen')?.dataset }));

  await ready(page);
  const s0 = await screen();
  t.check(s0.model === 'soyuz-st31' && s0.mode === 'explore' && s0.level === 'explore', `the direct link opened ${JSON.stringify(s0)}`);
  t.check(await page.locator('#section-nav [aria-current="page"], #section-nav .nav-current').count() >= 0, 'the section switch is there');
  await app.shot('soyuz-explore');

  // a part from the list: its name and its relations
  await k('unit:core').click();
  t.check((await text('.st-info h2')) === 'แกนกลาง Block A', `the list's pick shows ${await text('.st-info h2')}`);
  t.check((await page.locator('.st-info .st-links li').count()) === 5, 'the core lists its five relations (four strap-ons and the truss)');
  // …and from the 3-D view: the part under the press, as the depth picks it (a subsystem at ทดลอง)
  const box = await page.locator('.st-canvas').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.6);
  await t.until(async () => (await text('.st-info h2')) !== 'แกนกลาง Block A', { timeoutMs: 10_000 });
  const picked = await text('.st-info h2');
  t.check(picked.length > 0 && picked !== 'แกนกลาง Block A', `a press on the model picked "${picked}"`);
  t.check(await page.locator('.st-tree [aria-pressed="true"]').count() > 0, 'the list marks what the view picked');

  // the page's own cutaway: its inside layer comes on demand
  await k('cutaway').click();
  await ready(page);
  t.check(await k('inner').getAttribute('aria-pressed') === 'true', 'the cutaway opened the inside');
  await app.shot('soyuz-cutaway');
  await k('explode').fill('100');
  await k('explode').dispatchEvent('change');
  await app.shot('soyuz-apart');
  await k('reset').click();
  t.check(await k('cutaway').getAttribute('aria-pressed') === 'false' && (await k('explode').inputValue()) === '0', 'reset put the view back');

  // the depth changes, the selection stays
  await k('unit:fregat').click();
  await page.locator('.st-depth-link', { hasText: 'วิศวกร' }).click();
  await t.until(async () => (await screen()).level === 'engineer');
  t.check((await text('.st-info h2')) === 'ขั้นส่งวงโคจร Fregat', `at วิศวกร the selection is ${await text('.st-info h2')}`);
  t.check(await page.locator('.st-info .st-sources li').count() > 0, 'the engineer depth names the sources');
  await page.locator('.st-depth-link', { hasText: 'ทดลอง' }).click();
  await t.until(async () => (await screen()).level === 'explore');

  // ── assembling Soyuz-2.1b/Fregat to its reference
  await k('mode:assemble').click();
  if (await k('restart').isEnabled()) await k('restart').click();
  const fit = async (unit, slot, turns = 0) => {
    await k(`tray:${unit}`).click();
    await k(`slot:${slot}`).click();
    for (let i = 0; i < turns; i++) await k('turn').click();
    await k('install').click();
    return msg();
  };
  t.check((await fit('stage3', 'stage3')).includes('ต้องติดตั้ง โครงถักระหว่างขั้น ก่อน'), `out of order: ${await msg()}`);
  await k('tray:stage3').click(); // put it down again
  t.check((await fit('core', 'core')).startsWith('ติดตั้ง'), `the core: ${await msg()}`);
  t.check((await fit('booster-b', 'booster-v')).includes('เป็นของ'), `another block's place: ${await msg()}`);
  await k('slot:booster-b').click();
  await app.shot('assemble-preview');
  await k('install').click();
  t.check((await msg()).startsWith('ทิศทางยังไม่ตรงแบบ'), `the wrong way round: ${await msg()}`);
  await k('turn').click(); await k('turn').click(); await k('install').click();
  t.check((await msg()).startsWith('ติดตั้ง'), `turned right: ${await msg()}`);
  for (const [u, turns] of [['booster-v', 3], ['booster-g', 1], ['booster-d', 2]]) await fit(u, u, turns);
  await fit('interstage', 'interstage');
  await fit('stage3', 'stage3');
  await fit('fregat', 'fregat', 3);
  await fit('payload', 'payload');
  await k('undo').click();
  t.check((await text('.st-asm .st-progress')).includes('8/11'), `undo: ${await text('.st-asm .st-progress')}`);
  await fit('payload', 'payload');
  await fit('fairing-left', 'fairing-left');
  await fit('fairing-right', 'fairing-right');
  const done = await page.locator('.st-asm .st-done').textContent().catch(() => '');
  t.check(done.includes('ประกอบครบตามแบบอ้างอิงแล้ว') && done.includes('11 ชุด'), `complete: ${done.slice(0, 160)}`);
  await app.shot('assemble-complete');

  // ── Back leaves the section and comes back to it as it was
  await page.evaluate(() => { location.hash = '#/launch/explore'; });
  await t.until(async () => page.evaluate(() => location.hash.startsWith('#/launch')));
  await page.goBack();
  await t.until(async () => page.evaluate(() => location.hash.startsWith('#/structure')), { timeoutMs: 30_000 });
  await ready(page);
  t.check((await screen()).mode === 'assemble' && (await text('.st-asm .st-progress')).includes('11/11'), 'Back came back to the finished assembly');

  // ── EduSat-3U: straight to my experiment
  await k('model:edusat').click();
  await t.until(async () => (await screen()).model === 'edusat');
  await ready(page);
  t.check(await page.evaluate(() => location.hash) === '#/structure/explore/edusat', 'the model has its own address');
  await k('skip').click();
  await t.until(async () => (await screen()).mode === 'experiment');
  const fig = (f) => text(`.st-results [data-fig="${f}"]`);
  t.check((await fig('mass')).startsWith('1.810') && (await fig('shortfall')) === 'ไม่มี', `the reference: ${await fig('mass')}, ${await fig('shortfall')}`);
  await k('payload:camera-night').check();
  await t.until(async () => (await fig('mass')).startsWith('2.010'));
  t.check((await text('.st-verdict')).startsWith('จ่ายไฟไม่พอ') && (await fig('shortfall')).startsWith('10.9'), `the night camera on one cell: ${await text('.st-verdict')} ${await fig('shortfall')}`);
  t.check(await page.locator('.st-chart .st-chart-short').count() === 3, 'the chart marks a shortfall in each of the three orbits');
  await app.shot('experiment-short');
  await k('battery:battery-2cell').check();
  await t.until(async () => (await fig('mass')).startsWith('2.070'));
  t.check((await text('.st-verdict')).startsWith('จ่ายไฟได้ครบ') && (await fig('shortfall')) === 'ไม่มี', `two cells: ${await text('.st-verdict')}`);
  t.check((await text('.st-go [data-send="mass"]')).startsWith('2.070'), `what would be sent: ${await text('.st-go [data-send="mass"]')}`);
  await app.shot('experiment-powered');

  // sent to Orbit: Orbit holds the design's mass
  await k('go:orbit').click();
  await t.until(async () => page.evaluate(() => location.hash.startsWith('#/orbit')), { timeoutMs: 30_000 });
  await page.locator('#orbit-playground .pg-handoff dd').first().waitFor({ timeout: 60_000 });
  // what Orbit holds (its lifetime and planner read this), and what it shows (rounded to the kilogram)
  const held = await page.evaluate(() => {
    const h = window.orbitlab.handoff;
    return h && { mass: h.spacecraft.mass, kind: h.spacecraft.kind, propulsion: h.spacecraft.propulsion, label: h.label };
  });
  t.check(!!held && Math.abs(held.mass - 2.07) < 5e-4 && held.kind === 'science' && held.propulsion === null && held.label.startsWith('EduSat-3U'),
    `Orbit holds ${JSON.stringify(held)}`);
  const shown = Number((await text('#orbit-playground .pg-handoff dd')).replace(/[^\d.,]/g, '').replace(',', '.'));
  t.check(Math.abs(shown - 2.07) < 0.5, `Orbit shows ${shown} kg`);
  await app.shot('orbit-received');
  await page.goBack();
  await t.until(async () => page.evaluate(() => location.hash.startsWith('#/structure')), { timeoutMs: 30_000 });
  t.check((await text('.st-go .st-msg-ok')).includes('2.070'), `the receipt: ${await text('.st-go')}`);

  // sent to Launch, a hypothetical ride on Soyuz-2.1b/Fregat: its mission carries the same mass
  await k('go:launch').click();
  await t.until(async () => page.evaluate(() => location.hash.startsWith('#/launch')), { timeoutMs: 30_000 });
  const mission = await t.until(() => page.evaluate(() => {
    const m = window.orbitlab.panel.missionState();
    return m.satelliteSpec ? { payload: m.payloadMass, spec: m.satelliteSpec.mass, name: m.satelliteSpec.name, vehicle: m.vehicleId, site: m.siteId } : null;
  }), { timeoutMs: 30_000 });
  t.check(!!mission && Math.abs(mission.payload - 2.07) < 5e-4 && Math.abs(mission.spec - 2.07) < 5e-4 && mission.vehicle === 'soyuz21b' && mission.site === 'vostochny',
    `Launch holds ${JSON.stringify(mission)}`);
  await app.shot('launch-received');
  await page.goBack();
  await t.until(async () => page.evaluate(() => location.hash.startsWith('#/structure')), { timeoutMs: 30_000 });
  t.check((await text('.st-go .st-msg-ok')).includes('2.070'), `Launch's receipt: ${await text('.st-go')}`);
  // a change after sending: what was sent is the earlier design
  await k('payload:camera-day').check();
  await t.until(async () => (await fig('mass')).startsWith('1.870'));
  t.check((await page.locator('.st-go .st-msg-no').allTextContents()).some((s) => s.includes('แบบถูกแก้หลังส่ง')), 'a change after sending is flagged');
  // the reference stays as it was
  await k('show:reference').click();
  t.check((await fig('mass')).startsWith('1.810'), `the reference after all that: ${await fig('mass')}`);

  // kept across a reload, in the profile
  await page.reload();
  await page.waitForSelector('#loading.hidden', { state: 'attached', timeout: 120_000 });
  await ready(page);
  await k('show:mine').click();
  t.check((await fig('mass')).startsWith('1.870'), `my experiment after a reload: ${await fig('mass')}`);
  t.check(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);
  await app.context.close();

  // ── a phone, touch, reduced motion: assembling with taps and buttons only
  const phone = await t.open({ hash: '#/structure/watch/edusat', viewport: 'mobile', lang: 'th', touch: true, contextOptions: { reducedMotion: 'reduce' } });
  const p = phone.page;
  const pErrors = [];
  p.on('console', (m) => { if (m.type() === 'error') pErrors.push(m.text().slice(0, 300)); });
  const pk = (key) => p.locator(`.structure-screen [data-k="${key}"]`);
  await ready(p);
  const wide = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  t.check(wide, 'no sideways scrolling on a phone');
  await pk('unit:battery').tap();
  t.check((await p.locator('.st-info h2').first().textContent())?.trim() === 'แบตเตอรี่', 'a tap on the list picks the battery');
  await pk('mode:assemble').tap();
  for (const u of ['frame', 'stack']) { await pk(`tray:${u}`).tap(); await pk(`slot:${u}`).tap(); await pk('install').tap(); }
  t.check((await p.locator('.st-asm .st-progress').textContent()).includes('2/13'), 'assembled by taps');
  await phone.shot('phone-assemble');
  // the keyboard on the 3-D view
  await p.locator('.st-canvas').focus();
  for (const key of ['ArrowLeft', 'ArrowUp', '+', '-', '0']) await p.keyboard.press(key);
  t.check(pErrors.length === 0, `phone console errors: ${pErrors.join(' | ')}`);
  await phone.context.close();
}
