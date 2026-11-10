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
  t.check(await page.locator('#section-nav .nav-tab[data-section="structure"][data-current]').count() === 1, 'the section switch marks this section as the one open');
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

  // assembling EduSat: a side panel goes on any face, and is drawn on the face it went on
  await k('mode:assemble').click();
  if (await k('restart').isEnabled()) await k('restart').click();
  for (const u of ['frame', 'stack', 'payload', 'battery', 'eps', 'adcs', 'obc', 'radio']) await fit(u, u, u === 'payload' ? 1 : 0);
  t.check((await fit('panel-px', 'face-nz', 1)).startsWith('ติดตั้ง'), `the +X panel on the −Z face: ${await msg()}`);
  const panelAt = await page.evaluate(() => {
    const s = window.orbitlab.structure;
    const b = s.viewer.boxOf([9], (i) => s.unitOfItem(i)); // EDU_UNITS[9] = 'panel-px'
    return b && [(b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2];
  });
  t.check(!!panelAt && Math.abs(panelAt[0]) < 0.01 && panelAt[1] < -0.04, `drawn on the −Z face, centre x, z = ${JSON.stringify(panelAt)}`);
  const fittedAt = await page.locator('.st-info dd').allTextContents();
  t.check(fittedAt.some((d) => d.includes('−Z')) && !fittedAt.some((d) => d.includes('+X')), `and its information says where it went: ${fittedAt.join(' | ')}`);
  await k('tray:panel-nx').click();
  t.check(await k('slot:face-px').count() === 1 && await k('slot:face-nz').count() === 0, 'the free +X face is offered, the taken −Z face is not');
  await app.shot('edusat-panel-swapped');
  await k('tray:panel-nx').click(); // put it down again
  // the other panels on the faces left, the antenna last: complete, panels swapped and all
  for (const [u, face] of [['panel-nx', 'face-nx'], ['panel-pz', 'face-pz'], ['panel-nz', 'face-px']]) await fit(u, face, 1);
  await fit('antenna', 'antenna');
  const eduDone = await page.locator('.st-asm .st-done').textContent().catch(() => '');
  t.check(eduDone.includes('13'), `EduSat complete with two panels on other faces: ${eduDone.slice(0, 120)} / ${await msg()}`);
  await k('mode:explore').click();
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
  // what Orbit's playground holds (`heldHandoff`: the orbit it loaded from the state vector, the masses its panel and analyses use),
  // and what it shows (rounded to the kilogram)
  const held = await page.evaluate(() => {
    const p = window.orbitlab.playground;
    const h = p.handoff;
    return h && { ...p.heldHandoff(), kind: h.spacecraft.kind, propulsion: h.spacecraft.propulsion, label: h.label };
  });
  t.check(!!held && Math.abs(held.mass - 2.07) < 5e-4 && Math.abs(held.analysisMass - 2.07) < 5e-4 && Math.abs(held.perigeeAlt - 500e3) < 1000
    && Math.abs(held.apogeeAlt - 500e3) < 1000 && Math.abs(held.inclination - 97.4) < 0.1 && held.kind === 'science' && held.propulsion === null && held.label.startsWith('EduSat-3U'),
    `Orbit holds ${JSON.stringify(held)}`);
  // Orbit rounds its figure to the kilogram: this only checks it is on screen; the playground's held values above check the figures
  const shown = Number((await text('#orbit-playground .pg-handoff dd')).replace(/[^\d.,]/g, '').replace(',', '.'));
  t.check(shown === 2, `Orbit shows ${shown} kg (2.07 kg rounded to the kilogram)`);
  await app.shot('orbit-received');
  await page.goBack();
  await t.until(async () => page.evaluate(() => location.hash.startsWith('#/structure')), { timeoutMs: 30_000 });
  t.check((await text('.st-go [data-held="orbit"]')).includes('2.070') && await page.locator('.st-go [data-check="ok"]').count() === 1,
    `the receipt, read back from Orbit: ${await text('.st-go [data-held]')} ${await text('.st-go .st-msg')}`);

  // sent to Launch, a hypothetical ride on Soyuz-2.1b/Fregat: its mission carries the same mass
  const launchMission = () => page.evaluate(() => {
    const m = window.orbitlab.panel.missionState();
    return { vehicle: m.vehicleId, site: m.siteId, orbit: m.orbitId, payload: m.payloadMass, satellite: m.satelliteId, at: new Date(m.launchTime).toISOString() };
  });
  const launchBefore = await launchMission();
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
  t.check((await text('.st-go [data-held="launch"]')).includes('2.070') && await page.locator('.st-go [data-check="ok"]').count() === 1,
    `the receipt, read back from Launch: ${await text('.st-go [data-held]')} ${await text('.st-go .st-msg')}`);
  // a change after sending: what was sent is the earlier design
  await k('payload:camera-day').check();
  await t.until(async () => (await fig('mass')).startsWith('1.870'));
  t.check((await page.locator('.st-go .st-msg-no').allTextContents()).some((s) => s.includes('แบบถูกแก้หลังส่ง')), 'a change after sending is flagged');
  // the mission Launch had before is put back with one press
  await k('go:undoLaunch').click();
  await t.until(async () => page.evaluate(() => location.hash.startsWith('#/launch')), { timeoutMs: 30_000 });
  const launchAfter = await t.until(async () => { const m = await launchMission(); return m.satellite === launchBefore.satellite ? m : null; }, { timeoutMs: 30_000 });
  t.check(JSON.stringify(launchAfter) === JSON.stringify(launchBefore), `Launch's earlier mission is back: ${JSON.stringify(launchAfter)} (was ${JSON.stringify(launchBefore)})`);
  await page.goBack();
  await t.until(async () => page.evaluate(() => location.hash.startsWith('#/structure')), { timeoutMs: 30_000 });
  t.check((await text('.st-go .st-msg-ok')).includes('นำภารกิจเดิมของส่วนปล่อยจรวดกลับมาแล้ว') && await k('go:undoLaunch').count() === 0, `after putting it back: ${await text('.st-go .st-msg')}`);
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
  // the keyboard on the 3-D view: each key moves it, 0 brings back the overview
  await p.locator('.st-canvas').focus();
  const view = () => p.evaluate(() => window.orbitlab.structure.viewer.view());
  await p.keyboard.press('0');
  const home = await view();
  const moved = [];
  for (const key of ['ArrowLeft', 'ArrowUp', 'Shift+ArrowRight', '+', '-']) {
    const before = await view();
    await p.keyboard.press(key);
    moved.push(JSON.stringify(await view()) !== JSON.stringify(before) ? key : `${key} (no change)`);
  }
  t.check(!moved.some((m) => m.endsWith('(no change)')), `keys on the view: ${moved.join(', ')}`);
  await p.keyboard.press('0');
  t.check(!!(await t.until(async () => JSON.stringify(await view()) === JSON.stringify(home), { timeoutMs: 5_000 })), '0 brought back the overview');
  t.check(pErrors.length === 0, `phone console errors: ${pErrors.join(' | ')}`);
  await phone.context.close();
}
