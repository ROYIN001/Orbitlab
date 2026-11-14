/**
 * The Structure & Assembly section (src/ui/structure/, owner 2026-11-09), end
 * to end in the built app:
 *
 * - a section of its own: not fetched until it is opened, opened by a direct
 *   link, one screen tall with the model's picture its largest part, left and
 *   come back to with Back;
 * - Soyuz-2.1b/Fregat ST31 explored: assemblies picked by their names on the
 *   picture and by a press on the model; what each depth shows and which
 *   tools it has, with the selection kept from one depth to the next; the
 *   page's cutaway and its inside fetched only when asked for; a group and a
 *   single part; an internal circuit followed step by step; the flight
 *   sequence as an optional guide;
 * - assembled to the reference: at a first look one press a part, on the
 *   reference's outline; from the middle depth picked up, its place chosen
 *   from the numbered names on the picture and its way round by hand — a step
 *   out of order, another block's place and the wrong way round each refused
 *   with its reason; undone; complete by its relations; the picture still
 *   drawn when its box changes size;
 * - EduSat-3U: a side panel on another face, drawn on that face; "my
 *   experiment" changed with the changed part marked on the picture and the
 *   result under it, the night camera short on one cell and powered on two,
 *   for 60 g more; sent to Orbit and to Launch, each reading back the mass;
 *   Launch's earlier mission put back; kept across a reload;
 * - the English draft, fetched when English is on screen and marked a draft;
 * - a phone-sized touch screen with reduced motion: the picture kept in
 *   sight, assembling with taps, and the keyboard on the 3-D view.
 *
 * Console errors (shader failures among them) fail it.
 */
// a smoke journey since 2026-11-14 (owner): it failed only at the Pages gate before (#217-#219)
export const smoke = true;
export const timeoutMs = 900_000;

const ready = (page) => page.waitForFunction(() => {
  const s = window.orbitlab?.structure?.section;
  return !!s && s.stage.ready() && s.store.load[s.store.model].state === 'ready' && s.stage.viewer.settled()
    && ![...s.store.layerState[s.store.model].values()].includes('loading') && !document.querySelector('.structure-screen .st-status')?.textContent;
}, null, { timeout: 180_000 });

/** How much of the 3-D canvas is drawn on (not its background), 0–1, as the browser shows it now: the picture alone, without what is laid over it. */
async function ink(page) {
  await page.addStyleTag({ content: '.st-overlay, .st-status, .st-hint { visibility: hidden !important; }' }).then((tag) => { page.__inkTag = tag; });
  const png = await page.locator('.st-canvas').screenshot({ animations: 'disabled' });
  await page.__inkTag.evaluate((e) => e.remove());
  return page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const g = c.getContext('2d');
    g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data;
    let n = 0;
    // the picture's background is #0a1018
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 10) + Math.abs(d[i + 1] - 16) + Math.abs(d[i + 2] - 24) > 40) n++;
    return n / (d.length / 4);
  }, png.toString('base64'));
}

export default async function structureAssembly(t) {
  // ── a section of its own: nothing of it is fetched until it is opened
  const app = await t.open({ hash: '#/home', viewport: { width: 1440, height: 900 }, lang: 'th' });
  const { page } = app;
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  const fetched = () => page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name).filter((n) => /\/assets\/structure-|\/structure\/soyuz/.test(n)).map((n) => n.split('/').pop()));
  t.check((await fetched()).length === 0, `at Home nothing of the section is fetched: ${(await fetched()).join(', ')}`);
  const k = (key) => page.locator(`.structure-screen [data-k="${key}"]`);
  const text = async (sel) => (await page.locator(sel).first().textContent())?.trim() ?? '';
  const title = () => text('.st-info h2');
  const msg = () => text('.st-bar [data-role="asm-msg"]');
  const progress = () => text('.st-asm .st-progress');
  const screen = () => page.evaluate(() => ({ ...document.querySelector('.structure-screen')?.dataset, hash: location.hash }));
  const layers = () => page.evaluate(() => window.orbitlab.structure.section.stage.debug().layers.slice().sort().join(','));
  const go = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await t.until(async () => (await screen()).hash === hash, { timeoutMs: 30_000 }); await ready(page); };

  // ── opened by its own address, at a first look
  await go('#/structure/watch/soyuz-st31');
  const s0 = await screen();
  t.check(s0.model === 'soyuz-st31' && s0.mode === 'explore' && s0.level === 'watch', `the direct link opened ${JSON.stringify(s0)}`);
  t.check(await page.locator('#section-nav .nav-tab[data-section="structure"][data-current]').count() === 1, 'the section switch marks this section as the one open');
  const names = await fetched();
  t.check(names.some((n) => /^structure-[\w-]+\.js$/.test(n)) && names.some((n) => /\.r\d+\.json$/.test(n)) && names.some((n) => /\.r\d+\.outer\.bin$/.test(n)), `opening it fetched its code and the model: ${names.join(', ')}`);
  t.check(!names.some((n) => /inner|engine|structure-en|structure-ru/.test(n)), `and not the model's inside, nor a language not on screen: ${names.join(', ')}`);
  // one screen tall, the picture its largest part
  const layout = await page.evaluate(() => {
    const s = document.querySelector('.structure-screen'), c = document.querySelector('.st-canvas-box').getBoundingClientRect();
    return { scrolls: s.scrollHeight > s.clientHeight + 1 || document.documentElement.scrollHeight > innerHeight + 1, share: (c.width * c.height) / (innerWidth * innerHeight), ofSection: (c.width * c.height) / (s.clientWidth * s.clientHeight) };
  });
  t.check(!layout.scrolls, 'the section is one screen tall on a wide display: the page does not scroll');
  t.check(layout.share > 0.55 && layout.ofSection > 0.58, `the picture is the page's largest part: ${(100 * layout.share).toFixed(1)} % of the window, ${(100 * layout.ofSection).toFixed(1)} % of the section`);
  t.check(await ink(page) > 0.01, `the model is drawn: ${(100 * await ink(page)).toFixed(2)} % of the picture`);
  t.check(await page.locator('.st-names .st-name').count() === 11 && await page.locator('.st-scale').isVisible(), 'the eleven assemblies are named on the picture, with a scale');
  await app.shot('soyuz-watch');

  // three assemblies picked by their names on the picture
  for (const [node, name, relations] of [['core', 'ท่อนกลาง บล็อก A', 5], ['fregat', 'ท่อนบน Fregat', 4], ['booster-b', 'บูสเตอร์ B', 1]]) {
    await k(`name:${node}`).click();
    t.check((await title()) === name, `the name on the picture picked ${await title()}`);
    t.check(await page.locator('.st-info .st-links').first().locator('li').count() === relations, `${name} lists its ${relations} relations`);
    t.check(await k(`name:${node}`).getAttribute('aria-pressed') === 'true', `${node}'s name is marked as picked`);
  }
  // and a press on the model itself: the assembly under it, at this depth
  const box = await page.locator('.st-canvas').boundingBox();
  await page.mouse.click(box.x + box.width / 2 + 2, box.y + box.height * 0.34);
  await t.until(async () => (await title()) !== 'บูสเตอร์ B', { timeoutMs: 10_000 });
  const pressed = await page.evaluate(() => window.orbitlab.structure.section.store.shown()?.id ?? null);
  t.check(pressed === 'stage3', `a press on the model's third stage picked ${pressed}`);
  t.check((await layers()) === 'outer', `picking assemblies fetched none of the inside: ${await layers()}`);

  // what a first look has: a few tools, plain words, no figures to cite
  for (const tool of ['home', 'focus', 'apart', 'open', 'cutaway', 'labels', 'reset']) t.check(await k(tool).count() === 1, `a first look has the tool ${tool}`);
  for (const tool of ['hide', 'isolate', 'colour', 'ghost', 'inner', 'engine', 'explode', 'filter', 'side:systems']) t.check(await k(tool).count() === 0, `a first look does not have ${tool}`);
  await k('name:core').click();
  t.check(await page.locator('.st-info .st-sources').count() === 0 && await page.locator('.st-info .st-facts').count() === 0, 'a first look says what it is and does, without figures or sources');

  // the middle depth: the same assembly, the page's own account, its facts and the systems through it; more tools
  await k('depth:explore').click();
  await t.until(async () => (await screen()).level === 'explore');
  t.check((await screen()).hash === '#/structure/explore/soyuz-st31' && (await title()) === 'ท่อนกลาง บล็อก A', `the depth changed, the selection stayed: ${await title()}`);
  for (const tool of ['hide', 'isolate', 'colour', 'ghost', 'explode', 'side:systems']) t.check(await k(tool).count() === 1, `the middle depth adds ${tool}`);
  t.check(await page.locator('.st-info .st-facts').count() > 0 && await page.locator('.st-info .st-sources').count() === 0, 'the middle depth gives the facts, not yet the sources');

  // a group of the page's, from the list: its inside layer is fetched for it, and what covers it is seen through
  await k('side:list').click();
  await k('expand:core').click();
  await k('node:core/tanks').click();
  await ready(page);
  t.check((await text('.st-list .st-picked')).includes('ถังออกซิเจนเหลวและถังเคโรซีน'), `the list says what is picked: ${await text('.st-list .st-picked')}`);
  await k('list:info').click();
  t.check((await title()).startsWith('ถังออกซิเจนเหลวและถังเคโรซีน') && (await layers()) === 'inner,outer', `the tanks: ${await title()}, layers ${await layers()}`);
  await k('side:list').click();
  await k('eye:fairing-left').click();
  t.check(await page.evaluate(() => window.orbitlab.structure.section.store.view.hidden.has('fairing-left')), 'the list hides an assembly');
  await k('showAll').click();

  // an internal circuit of the page's, followed step by step
  await k('side:systems').click();
  await k('sys:rd107108-main-oxidizer').click();
  await ready(page);
  t.check((await layers()).includes('engine'), `following a circuit fetched the engines' layer: ${await layers()}`);
  await k('sys:step:1').click();
  const lit = await page.evaluate(() => { const v = window.orbitlab.structure.section.stage.viewer; let n = 0; for (let i = 0; i < v.itemCount; i++) if (v.flagsOf(i) & 4) n++; return n; });
  t.check(lit === 40, `the circuit's second step lights its ${lit} parts`);
  await app.shot('soyuz-circuit');
  await k('sys:stop').click();

  // the page's cutaway, and reset
  await k('cutaway').click();
  await ready(page);
  t.check(await k('cutaway').getAttribute('aria-pressed') === 'true' && await ink(page) > 0.01, 'the cutaway is on and drawn');
  await app.shot('soyuz-cutaway');
  await k('explode').fill('100');
  await k('explode').dispatchEvent('change');
  await ready(page);
  await k('reset').click();
  t.check(await k('cutaway').getAttribute('aria-pressed') === 'false' && (await k('explode').inputValue()) === '0', 'reset put the view back');

  // the deepest depth: a single part with its own id, and the sources
  await k('name:fregat').click();
  await k('depth:engineer').click();
  await t.until(async () => (await screen()).level === 'engineer');
  // its sources are there, folded away at the foot of the card until asked for (owner, 2026-11-13)
  const fold = page.locator('.st-info details[data-fold="provenance"]');
  t.check((await title()) === 'ท่อนบน Fregat' && await fold.count() === 1 && !(await fold.evaluate((d) => d.open)) && await page.locator('.st-info > .st-sources').count() === 0,
    `at the deepest depth ${await title()} keeps its sources folded away`);
  await fold.locator('summary').click();
  t.check(await fold.locator('.st-sources li').count() > 0 && await fold.locator('.st-sources li').first().isVisible(), 'opened, the fold names the sources');
  // and it stays as the learner left it across a redraw
  await k('side:list').click();
  await k('side:info').click();
  t.check(await fold.evaluate((d) => d.open), 'the fold stays open across a redraw');
  // the focus on it survives a redraw (its key is on the summary), and it is this card's alone: the next card's is shut
  await fold.locator('summary').focus();
  await page.evaluate(() => window.orbitlab.structure.section.store.emit('panels'));
  t.check(await page.evaluate(() => document.activeElement?.tagName === 'SUMMARY'), 'the fold keeps the focus across a redraw');
  await k('name:core').click();
  t.check(!(await fold.evaluate((d) => d.open)), 'a fold opened on one card is not found open on the next');
  await k('name:fregat').click();
  t.check(await fold.evaluate((d) => d.open), 'and is as it was left on the card it was opened on');
  await fold.locator('summary').click();
  for (const tool of ['inner', 'engine']) t.check(await k(tool).count() === 1, `the deepest depth can ask for the ${tool} layer by name`);
  const part = await page.evaluate(() => { const s = window.orbitlab.structure.section.store, tree = s.adapter.tree(); const id = tree.leafOf[tree.nodes.get('stage3/engine-system').items[3]]; s.select(id, true); return id; });
  await ready(page);
  t.check((await title()) === part.split('.').slice(1).join('.') && (await text('.st-info .st-path')).includes('ท่อนที่สาม'), `a single part: ${await title()} under ${await text('.st-info .st-path')}`);
  t.check(await page.locator('.st-info dd.st-mono, .st-info dd .st-mono').filter({ hasText: part }).count() === 1, 'it shows its own permanent id');
  await app.shot('soyuz-part');

  // the flight sequence, as an optional guide: closed until asked for, never in the way
  await k('depth:watch').click();
  await t.until(async () => (await screen()).level === 'watch');
  t.check(await k('guide:open').count() === 1 && await k('guide:next').count() === 0, 'the helper is closed until asked for');
  await k('guide:open').click();
  await k('guide:start:soyuz-flight').click();
  for (let i = 0; i < 3; i++) await k('guide:next').click();
  await ready(page);
  const flown = await page.evaluate(() => [...window.orbitlab.structure.section.stage.viewer.unitOffsets()].filter(([, o]) => !o.visible).map(([u]) => u).sort().join(','));
  t.check(flown === 'booster-b,booster-d,booster-g,booster-v,fairing-left,fairing-right', `the fourth step of the flight has dropped ${flown}`);
  await k('name:core').click(); // anything else still works while it is open
  t.check((await title()) === 'ท่อนกลาง บล็อก A', 'the helper locks nothing');
  await app.shot('soyuz-flight');
  await k('guide:close').click();
  t.check(await page.evaluate(() => [...window.orbitlab.structure.section.stage.viewer.unitOffsets()].every(([, o]) => o.visible)), 'closing the helper puts the whole vehicle back');

  // ── assembling at a first look: one press a part, on the reference's outline
  await k('mode:assemble').click();
  await t.until(async () => (await screen()).mode === 'assemble');
  await ready(page);
  t.check((await screen()).hash === '#/structure/watch/soyuz-st31/assemble', `the activity has its own address: ${(await screen()).hash}`);
  if (await k('restart').isEnabled()) await k('restart').click();
  t.check(await k('outline').getAttribute('aria-pressed') === 'true' && (await text('.st-step-card h3')) === 'ท่อนกลาง บล็อก A', `a first look starts on the outline, led to ${await text('.st-step-card h3')}`);
  const waiting = await text('.st-tray-list li.is-waiting');
  t.check(waiting.includes('รอ ท่อนกลาง'), `a part that cannot go in yet says what it waits for: ${waiting}`);
  for (let i = 0; i < 11; i++) await k('asm-next').click();
  await ready(page);
  const done = await text('.st-asm .st-done');
  t.check(done.includes('ประกอบครบตามแบบอ้างอิงแล้ว') && done.includes('11 ชุด') && (await progress()).includes('11/11'), `complete: ${done.slice(0, 140)}`);
  // the bar under the picture changed height as the last part went in: the picture is still drawn
  t.check(await ink(page) > 0.01, `the finished vehicle is drawn: ${(100 * await ink(page)).toFixed(2)} % of the picture`);
  t.check(await k('mode:assemble').locator('.st-ok-mark').count() === 1, 'the activity\'s tab says it is complete');
  await app.shot('assemble-complete');

  // ── from the middle depth: picked up, its place and its way round chosen by hand
  await k('depth:explore').click();
  await t.until(async () => (await screen()).level === 'explore');
  await k('restart').click();
  await ready(page);
  t.check(await k('outline').getAttribute('aria-pressed') === 'false', 'from the middle depth the parts lie apart, to be picked up');
  const STRAIGHT = 'ทิศตรงแบบ';
  /** Pick a unit up, choose its place by the place's name on the picture, turn it until it is the reference's way round (or `turns` times), fit it. */
  const fit = async (unit, slot, turns = null) => {
    await k(`tray:${unit}`).click();
    await k(`mark:${slot}`).click();
    if (turns === null) for (let i = 0; i < 4 && await k('turn').count() && !(await text('.st-bar .st-turned')).includes(STRAIGHT); i++) await k('turn').click();
    else for (let i = 0; i < turns; i++) await k('turn').click();
    await k('install').click();
    return msg();
  };
  await k('tray:stage3').click();
  t.check(await page.locator('.st-places .st-mark').count() === 11, `with a part in hand the eleven free places are named on the picture: ${await page.locator('.st-places .st-mark').count()}`);
  t.check((await k('mark:core').textContent()).includes('ฐานกลางของจรวด'), `a place is named for where it is: ${await k('mark:core').textContent()}`);
  await k('install').isDisabled().then((off) => t.check(off, 'nothing can be fitted before a place is chosen'));
  await k('mark:stage3').click();
  await k('install').click();
  t.check((await msg()).includes('ต้องติดตั้ง โครงถักระหว่างท่อน ก่อน') && (await msg()).includes('ท่อนที่สามตั้งอยู่บนวงแหวนบนของโครงถัก'), `out of order, with the reason: ${await msg()}`);
  await k('putDown').click();
  await k('tray:core').click();
  await k('mark:booster-b').click();
  await k('install').click();
  t.check((await msg()).includes('ฐานกลางของจรวด'), `another block's place, naming the right one: ${await msg()}`);
  await k('mark:core').click();
  await k('install').click();
  t.check((await msg()).startsWith('ติดตั้ง ท่อนกลาง'), `the core: ${await msg()}`);
  // a strap-on lies turned when picked up: fitted as it lies it is refused, with what must face where
  t.check((await fit('booster-b', 'booster-b', 0)).startsWith('ทิศทางยังไม่ตรงแบบ') && (await msg()).includes('ครีบต้องอยู่ด้านนอก'), `the wrong way round: ${await msg()}`);
  for (let i = 0; i < 4 && !(await text('.st-bar .st-turned')).includes(STRAIGHT); i++) await k('turn').click();
  await app.shot('assemble-in-hand');
  await k('install').click();
  t.check((await msg()).startsWith('ติดตั้ง บูสเตอร์') && (await msg()).includes('ข้อต่อลูกหมาก'), `turned right, the joint named: ${await msg()}`);
  // ── dragging: the part itself, on the picture, onto its place (pressing "install" is the other way, for touch and keys)
  const at = (fn, arg) => page.evaluate(([f, a]) => window.orbitlab.structure.section.stage[f](a), [fn, arg]);
  const inHand = () => page.evaluate(() => { const s = window.orbitlab.structure.section.store; return s.held[s.model] && { ...s.held[s.model], dragged: !!s.drag }; });
  /** Press on a loose unit, drag it to `to` (a place's id, or a point of the page) and let go; what was in hand just before letting go. */
  const drag = async (unit, to) => {
    await ready(page); // the view at rest: a part is where it is drawn
    const from = await at('where', unit);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 10, from.y + 6, { steps: 2 });
    const end = typeof to === 'string' ? await at('wherePlace', to) : to;
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.waitForTimeout(60); // the page takes the pointer's moves in its own time
    const held = await inHand();
    await page.mouse.up();
    return held;
  };
  await ready(page);
  const viewBefore = await page.evaluate(() => JSON.stringify(window.orbitlab.structure.section.viewer.view()));
  // over a place it cannot take yet: it settles there, and letting go is refused with the reason, the part still in hand
  const overPlace = await drag('stage3', 'stage3');
  t.check(overPlace?.unit === 'stage3' && overPlace.slot === 'stage3' && overPlace.dragged, `a dragged part settles on the place it is over: ${JSON.stringify(overPlace)}`);
  t.check((await msg()).includes('ต้องติดตั้ง โครงถักระหว่างท่อน ก่อน') && (await inHand())?.unit === 'stage3', `dropped out of order: ${await msg()}`);
  t.check(await page.evaluate(() => JSON.stringify(window.orbitlab.structure.section.viewer.view())) === viewBefore, 'dragging a part does not turn the view');
  await k('putDown').click();
  // let go of away from every place: put down again, nothing fitted
  const canvasBox = await page.locator('.st-canvas').boundingBox();
  const nowhere = await drag('booster-v', { x: canvasBox.x + 60, y: canvasBox.y + 60 });
  t.check(nowhere?.unit === 'booster-v' && nowhere.slot === null && (await inHand()) === null && (await progress()).includes('2/11'), `dropped away from every place: ${JSON.stringify(nowhere)}, ${await progress()}`);
  // with motion on, a dragged part is drawn where the hand has it at every move (an ease begun again on each move would leave it behind)
  {
    await ready(page);
    const from = await at('where', 'booster-v');
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    let worst = 0, moved = 0;
    for (let i = 1; i <= 14; i++) {
      await page.mouse.move(from.x + (canvasBox.x + 60 - from.x) * i / 14, from.y + (canvasBox.y + 60 - from.y) * i / 14);
      await page.waitForTimeout(16);
      const lag = await page.evaluate(() => {
        const s = window.orbitlab.structure.section, v = s.viewer, d = s.store.drag;
        if (!d || s.store.held[s.store.model]?.slot) return null;
        const g = v.units.get(d.unit).matrix.elements, to = v.unitTargets.get(d.unit).elements;
        return { lag: Math.hypot(g[12] - to[12], g[13] - to[13], g[14] - to[14]), moved: Math.hypot(...d.move) };
      });
      if (lag) { worst = Math.max(worst, lag.lag); moved = Math.max(moved, lag.moved); }
    }
    await page.mouse.up();
    const motionOn = await page.evaluate(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
    t.check(motionOn && moved > 1 && worst < 1e-6, `with motion on a dragged part follows the hand: moved ${moved.toFixed(2)} m, drawn at most ${worst.toFixed(4)} m behind`);
    // the browser's own keys are left to the browser while the 3-D view has the focus
    const taken = await page.evaluate(() => {
      const c = document.querySelector('.structure-screen .st-canvas');
      const fire = (init) => { const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }); c.dispatchEvent(e); return e.defaultPrevented; };
      return { zoom: fire({ key: '0', ctrlKey: true }), plus: fire({ key: '=', metaKey: true }), back: fire({ key: 'ArrowLeft', altKey: true }), own: fire({ key: 'ArrowLeft' }) };
    });
    t.check(!taken.zoom && !taken.plus && !taken.back && taken.own, `the view takes its own keys and leaves Ctrl/⌘/Alt combinations to the browser: ${JSON.stringify(taken)}`);
  }
  // a strap-on dragged onto its place as it lies is refused for its way round; turned, it goes in
  await drag('booster-v', 'booster-v');
  t.check((await msg()).startsWith('ทิศทางยังไม่ตรงแบบ') && (await inHand())?.slot === 'booster-v', `dropped the wrong way round: ${await msg()}`);
  for (let i = 0; i < 4 && !(await text('.st-bar .st-turned')).includes(STRAIGHT); i++) await k('turn').click();
  await k('install').click();
  t.check((await progress()).includes('3/11'), `turned and fitted: ${await progress()}`);
  await fit('interstage', 'interstage');
  // and a drag that fits: the third stage onto the truss
  await ready(page);
  await drag('stage3', 'stage3');
  t.check((await msg()).startsWith('ติดตั้ง ท่อนที่สาม') && (await progress()).includes('5/11') && (await inHand()) === null, `dragged into place: ${await msg()}`);
  await app.shot('assemble-dragged');
  for (const u of ['booster-g', 'booster-d', 'fregat', 'payload']) await fit(u, u);
  t.check((await progress()).includes('9/11'), `nine in: ${await progress()}`);
  await k('undo').click();
  t.check((await progress()).includes('8/11'), `undo: ${await progress()}`);
  await fit('payload', 'payload');
  // a part in place can be read about and taken off, unless something rests on it
  await k('placed:stage3').click();
  t.check(await k('remove').isDisabled() && (await text('.st-hand')).includes('Fregat'), `the third stage cannot come off while Fregat rests on it: ${await text('.st-hand')}`);
  await fit('fairing-left', 'fairing-left');
  await fit('fairing-right', 'fairing-right');
  await ready(page);
  t.check((await text('.st-asm .st-done')).includes('ความสัมพันธ์ตามแบบครบ 15 รายการ') && await ink(page) > 0.01, `complete by its relations, and drawn: ${(await text('.st-asm .st-done')).slice(0, 120)}`);

  // a visit begun again with parts in place: the panel is first drawn before the model is fetched, and the section must still come
  await page.reload();
  await page.waitForSelector('#loading.hidden', { state: 'attached', timeout: 120_000 });
  await ready(page);
  t.check((await progress()).includes('11/11') && await ink(page) > 0.01, `after a reload the finished assembly is there and drawn: ${await progress()}`);

  // ── the same rocket in the order of the launch site (owner, 2026-11-13): lying, in two separate places, docked, rolled out, erected
  await k('plan:site').click();
  await ready(page);
  t.check((await progress()).includes('0/13') && await k('outline').count() === 0 && await k('plan:site').getAttribute('aria-pressed') === 'true',
    `the site's order starts with nothing in place and has thirteen steps: ${await progress()}`);
  // (measured on what is drawn: the outlines themselves, not the marks of their places)
  const lies = await page.evaluate(() => { const st = window.orbitlab.structure.section.stage; const a = st.where('core'), b = st.where('fregat'); return { dx: Math.round(Math.abs(b.x - a.x)), dy: Math.round(Math.abs(b.y - a.y)) }; });
  t.check(lies.dx > 2 * lies.dy && lies.dx > 150, `the vehicle lies across the picture, Fregat far along it from the core: ${JSON.stringify(lies)}`);
  const faint = await page.evaluate(() => { const s = window.orbitlab.structure.section; const tree = s.store.adapter.tree(); const v = s.stage.viewer; return ['core', 'fregat', 'stage3'].map((u) => v.flagsOf(tree.nodes.get(u).items[0]) & 32); });
  t.check(faint.every((f) => f === 32), `the parts wait as outlines where they belong: ${JSON.stringify(faint)}`);
  // a part in hand is offered the eleven places, in the list as on the picture — never a step's slot
  await k('tray:core').click();
  const offered = await page.locator('.st-bar select[data-k="slot"] option').evaluateAll((list) => list.map((o) => o.textContent));
  t.check(offered.length === 12 && offered.every((o) => !/site\.|soyuz\.place|^0 ·/.test(o)) && await page.locator('.st-places .st-mark').count() === 11, `eleven places in the list and on the picture: ${offered.length - 1}`);
  await k('putDown').click();
  // the head unit is begun with nothing of the package there; the third stage waits for the fairing to be closed
  await fit('fregat', 'fregat');
  t.check((await msg()).startsWith('ติดตั้ง ท่อนบน Fregat') && (await progress()).includes('1/13'), `Fregat first, in its own hall: ${await msg()}`);
  await k('tray:stage3').click();
  await k('mark:stage3').click();
  await k('install').click();
  t.check((await msg()).includes('แฟริ่ง ST ซีกซ้าย, แฟริ่ง ST ซีกขวา') && (await msg()).includes('ปิดแฟริ่งให้เสร็จ'), `the third stage waits for both halves of the fairing, and says why: ${await msg()}`);
  await k('putDown').click();
  t.check((await text('.st-tray-list li.is-ready .st-site-note')).length > 20, 'a step that can be taken says what is really done there');
  for (const u of ['payload', 'fairing-left', 'fairing-right', 'stage3', 'core', 'booster-b', 'booster-v', 'booster-g', 'booster-d', 'interstage']) await fit(u, u);
  t.check((await progress()).includes('11/13') && (await text('.st-tray-list')).includes('ประกอบรวม'), `every assembly in place, two steps left: ${await progress()}`);
  await app.shot('site-before-docking');
  // the two steps that fit no part: each a press, in order
  t.check((await text('.st-hint')).includes('ทุกชุดอยู่ในที่แล้ว'), `with every part in, the line under the picture says a step is next, not a part: ${await text('.st-hint')}`);
  await k('tray:site-erect').click();
  t.check((await msg()).startsWith('ยังทำขั้น') && (await msg()).includes('ประกอบรวม') && !(await msg()).includes('ติดตั้งไม่ได้') && (await progress()).includes('11/13'), `erection waits for the docking, said as a step: ${await msg()}`);
  const gap = async () => page.evaluate(() => { const st = window.orbitlab.structure.section.stage; const a = st.where('interstage'), b = st.where('stage3'); return Math.round(Math.hypot(b.x - a.x, b.y - a.y)); });
  const apart = await gap();
  await k('tray:site-dock').click();
  await ready(page);
  const docked = await gap();
  t.check((await msg()).startsWith('ทำแล้ว: ประกอบรวม') && (await progress()).includes('12/13'), `docked with a press: ${await msg()}`);
  t.check(docked < apart, `the upper part came to the package: ${apart} px apart, then ${docked} px`);
  // a step done is listed, and its chip takes it back (named for what it does): the halves part again, and it can be done again
  t.check((await k('placed:site-dock').getAttribute('aria-label')).startsWith('ย้อนขั้น'), `the chip of a step done says it takes it back: ${await k('placed:site-dock').getAttribute('aria-label')}`);
  await k('placed:site-dock').click();
  await ready(page);
  t.check((await progress()).includes('11/13') && (await msg()).startsWith('ย้อนขั้น') && await gap() > docked, `taken back by its chip: ${await msg()}`);
  await k('tray:site-dock').click();
  await ready(page);
  t.check((await progress()).includes('12/13'), `and done again: ${await progress()}`);
  await k('tray:site-erect').click();
  await ready(page);
  const stands = await page.evaluate(() => { const st = window.orbitlab.structure.section.stage; const a = st.where('core'), b = st.where('fregat'); return { dx: Math.round(Math.abs(b.x - a.x)), dy: Math.round(Math.abs(b.y - a.y)) }; });
  const siteDone = await text('.st-asm .st-done');
  t.check(siteDone.includes('ตั้งอยู่บนฐานปล่อยแล้ว') && (await progress()).includes('13/13') && stands.dy > 2 * stands.dx, `rolled out and erected: ${siteDone.slice(0, 80)} ${JSON.stringify(stands)}`);
  await app.shot('site-erected');
  // its sources are at the foot of the panel, folded; and the reference's order is as it was left
  const siteFold = page.locator('.st-asm details[data-fold="site-sources"]');
  t.check(await siteFold.locator('.st-sources li').count() === 3 && !(await siteFold.evaluate((d) => d.open)), 'the site\'s order names its three sources, folded away');
  // come back to by its address, the site's order is as it was left and framed as it stands
  await page.reload();
  await page.waitForSelector('#loading.hidden', { state: 'attached', timeout: 120_000 });
  await ready(page);
  t.check(await k('plan:site').getAttribute('aria-pressed') === 'true' && (await progress()).includes('13/13') && await ink(page) > 0.01, `after a reload the site's order is on, complete and drawn: ${await progress()}`);
  // and from nothing at a first look: led step by step, the last two with their own button
  await k('depth:watch').click();
  await t.until(async () => (await screen()).level === 'watch');
  await k('restart').click();
  await ready(page);
  for (let i = 0; i < 11; i++) await k('asm-next').click();
  t.check((await text('.st-step-card h3')).startsWith('ประกอบรวม') && (await k('asm-next').textContent()).includes('ทำขั้นนี้'), `led to the docking, with its own button: ${await text('.st-step-card h3')}`);
  await k('asm-next').click();
  await k('asm-next').click();
  await ready(page);
  t.check((await progress()).includes('13/13'), `a first look takes the site's order to its end: ${await progress()}`);
  await k('depth:explore').click();
  await t.until(async () => (await screen()).level === 'explore');
  await k('plan:reference').click();
  await ready(page);
  t.check((await progress()).includes('11/11') && (await text('.st-asm .st-done')).includes('ประกอบครบตามแบบอ้างอิงแล้ว'), `the reference's order is as it was left: ${await progress()}`);

  // ── Back leaves the section and comes back to it as it was
  await page.evaluate(() => { location.hash = '#/launch/explore'; });
  await t.until(async () => page.evaluate(() => location.hash.startsWith('#/launch')));
  await page.goBack();
  await t.until(async () => page.evaluate(() => location.hash.startsWith('#/structure')), { timeoutMs: 30_000 });
  await ready(page);
  t.check((await screen()).mode === 'assemble' && (await progress()).includes('11/11') && await ink(page) > 0.01, 'Back came back to the finished assembly, drawn');
  // what comes next is offered: into what was built, and on to the other model
  await k('next:edusat').click();
  await t.until(async () => (await screen()).model === 'edusat');
  await ready(page);
  t.check((await screen()).hash === '#/structure/explore/edusat/assemble', `on to the next model's assembly: ${(await screen()).hash}`);

  // ── EduSat-3U assembled: a side panel goes on any face, and is drawn on the face it went on
  if (await k('restart').isEnabled()) await k('restart').click();
  for (const u of ['frame', 'stack', 'payload', 'battery', 'eps', 'adcs', 'obc', 'radio']) await fit(u, u);
  t.check((await progress()).includes('8/13'), `the stack is in: ${await progress()} / ${await msg()}`);
  t.check((await fit('panel-px', 'face-ny')).startsWith('ติดตั้ง'), `the +X panel on the −Y face: ${await msg()}`);
  await ready(page); // moved into place
  const panelAt = await page.evaluate(() => {
    const s = window.orbitlab.structure.section;
    const b = s.viewer.boxOf(s.store.adapter.tree().nodes.get('panel-px').items, (i) => s.unitOfItem(i));
    return b && [(b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2];
  });
  // the −Y face of the CubeSat frame is the picture's +z side
  t.check(!!panelAt && Math.abs(panelAt[0]) < 0.01 && panelAt[1] > 0.04, `drawn on the −Y face, centre x, z = ${JSON.stringify(panelAt)}`);
  await k('placed:panel-px').click();
  const fittedAt = await page.locator('.st-side .st-info dd').allTextContents();
  t.check(fittedAt.some((d) => d.includes('−Y')) && !fittedAt.some((d) => d.includes('ด้านข้าง +X')), `and its information says where it went: ${fittedAt.join(' | ')}`);
  await k('tray:panel-nx').click();
  t.check(await k('mark:face-px').count() === 1 && await k('mark:face-ny').count() === 0, 'the free +X face is offered, the taken −Y face is not');
  await app.shot('edusat-panel-swapped');
  await k('putDown').click();
  for (const [u, face] of [['panel-nx', 'face-nx'], ['panel-py', 'face-py'], ['panel-ny', 'face-px']]) await fit(u, face);
  await fit('antenna', 'antenna');
  await ready(page);
  const eduDone = await text('.st-asm .st-done');
  t.check(eduDone.includes('13 ชุด') && await ink(page) > 0.01, `EduSat complete with two panels on other faces: ${eduDone.slice(0, 120)} / ${await msg()}`);

  // ── "my experiment": straight to it, no lesson or test in the way
  await k('create').click();
  await t.until(async () => (await screen()).mode === 'experiment');
  await ready(page);
  t.check((await screen()).hash === '#/structure/explore/edusat/experiment', `the experiment has its own address: ${(await screen()).hash}`);
  const fig = (f) => text(`.st-strip [data-fig="${f}"]`);
  const badge = () => page.locator('.st-design').getAttribute('data-design');
  t.check((await fig('mass')).startsWith('1.810') && (await fig('shortfall')) === 'ไม่มี' && (await badge()) === 'reference', `the reference: ${await fig('mass')}, ${await fig('shortfall')}, shown as ${await badge()}`);
  t.check(await k('payload:camera-night').isDisabled(), 'the reference itself cannot be changed');
  await k('create').click();
  t.check((await badge()) === 'mine' && await k('payload:camera-night').isEnabled(), 'a copy of the reference is mine to change');
  await k('payload:camera-night').check();
  await t.until(async () => (await fig('mass')).startsWith('2.010'));
  await ready(page);
  t.check((await text('.st-verdict strong')).startsWith('จ่ายไฟไม่พอ') && (await fig('shortfall')).startsWith('10.9'), `the night camera on one cell: ${await text('.st-verdict strong')} ${await fig('shortfall')}`);
  t.check(await page.locator('.st-strip .st-chart .st-chart-short').count() === 3, 'the chart under the picture marks a shortfall in each of the three orbits');
  // the changed part is marked on the picture, and named by what is fitted
  const painted = await page.evaluate(() => { const s = window.orbitlab.structure.section, v = s.stage.viewer; const items = s.store.adapter.tree().nodes.get('payload').items; return items.every((i) => v.state[i * 4 + 3] > 0); });
  t.check(painted && (await page.locator('.st-names .st-name.is-changed').textContent()).includes('กล้องถ่ายภาพแสงไฟกลางคืน'), `the changed camera is painted and named on the picture: ${await page.locator('.st-names .st-name.is-changed').textContent()}`);
  const strip = await page.evaluate(() => { const c = document.querySelector('.st-canvas-box').getBoundingClientRect(), s = document.querySelector('.st-strip').getBoundingClientRect(); return { below: s.top >= c.bottom - 1, seen: s.bottom <= innerHeight + 1 }; });
  t.check(strip.below && strip.seen, `the result is under the picture and in sight with it: ${JSON.stringify(strip)}`);
  await app.shot('experiment-short');
  await k('battery:battery-2cell').check();
  await t.until(async () => (await fig('mass')).startsWith('2.070'));
  t.check((await text('.st-verdict strong')).startsWith('จ่ายไฟได้ครบ') && (await fig('shortfall')) === 'ไม่มี', `two cells: ${await text('.st-verdict strong')}`);
  t.check((await text('.st-bom [data-fig="bomMass"]')) === '2.07' && (await text('.st-go [data-send="mass"]')).startsWith('2.070'), `the equipment list sums to ${await text('.st-bom [data-fig="bomMass"]')} kg, and ${await text('.st-go [data-send="mass"]')} would be sent`);
  t.check(await page.locator('.st-grid td').count() === 4 && await page.locator('.st-grid td.is-now.st-cell-ok').count() === 1, 'every combination is laid out, the one on screen marked');
  await app.shot('experiment-powered');

  // sent to Orbit: Orbit holds the design's mass
  await k('go:orbit').click();
  await t.until(async () => page.evaluate(() => location.hash.startsWith('#/orbit')), { timeoutMs: 30_000 });
  await page.locator('#orbit-playground .pg-handoff dd').first().waitFor({ timeout: 60_000 });
  // what Orbit's playground holds (`heldHandoff`: the orbit it loaded from the state vector, the masses its panel and analyses use)
  const held = await page.evaluate(() => {
    const p = window.orbitlab.playground;
    const h = p.handoff;
    return h && { ...p.heldHandoff(), kind: h.spacecraft.kind, propulsion: h.spacecraft.propulsion, label: h.label };
  });
  t.check(!!held && Math.abs(held.mass - 2.07) < 5e-4 && Math.abs(held.analysisMass - 2.07) < 5e-4 && Math.abs(held.perigeeAlt - 500e3) < 1000
    && Math.abs(held.apogeeAlt - 500e3) < 1000 && Math.abs(held.inclination - 97.4) < 0.1 && held.kind === 'science' && held.propulsion === null && held.label.startsWith('EduSat-3U'),
    `Orbit holds ${JSON.stringify(held)}`);
  await app.shot('orbit-received');
  await page.goBack();
  await t.until(async () => page.evaluate(() => location.hash.startsWith('#/structure')), { timeoutMs: 30_000 });
  await ready(page);
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
  await ready(page);
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
  await ready(page);
  t.check((await text('.st-go .st-msg-ok')).includes('นำภารกิจเดิมของส่วนปล่อยจรวดกลับมาแล้ว') && await k('go:undoLaunch').count() === 0, `after putting it back: ${await text('.st-go .st-msg')}`);
  // the reference stays as it was, and exploring always shows it
  await k('show:reference').click();
  t.check((await fig('mass')).startsWith('1.810') && (await badge()) === 'reference', `the reference after all that: ${await fig('mass')}`);
  await k('mode:explore').click();
  await t.until(async () => (await screen()).mode === 'explore');
  await ready(page);
  t.check(await page.evaluate(() => window.orbitlab.structure.section.store.pictureDesign()) === null && await page.locator('.st-names .st-name.is-changed').count() === 0, 'exploring shows the reference design, whatever my experiment is');

  // kept across a reload, in the profile
  await go('#/structure/explore/edusat/experiment');
  await page.reload();
  await page.waitForSelector('#loading.hidden', { state: 'attached', timeout: 120_000 });
  await ready(page);
  await k('show:mine').click();
  t.check((await fig('mass')).startsWith('1.870'), `my experiment after a reload: ${await fig('mass')}`);
  // every control has a name a screen reader can say
  const nameless = await page.evaluate(() => [...document.querySelectorAll('.structure-screen button, .structure-screen a, .structure-screen select, .structure-screen input')]
    .filter((e) => !(e.textContent.trim() || e.getAttribute('aria-label') || e.labels?.length || e.closest('label'))).map((e) => e.dataset.k ?? e.outerHTML.slice(0, 60)));
  t.check(nameless.length === 0, `controls without a name: ${nameless.join(', ')}`);
  // Escape lets go of the selection
  await k('bom:battery').click();
  t.check((await title()) === 'แบตเตอรี่', `the equipment list picks ${await title()}`);
  await page.locator('.st-canvas').focus();
  await page.keyboard.press('Escape');
  t.check(await page.evaluate(() => window.orbitlab.structure.section.store.shown()) === null, 'Escape clears the selection');
  t.check(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);
  await app.context.close();

  // ── the English draft: fetched when English is on screen, and marked a draft
  const english = await t.open({ hash: '#/structure/watch/edusat', viewport: { width: 1280, height: 800 }, lang: 'en' });
  const e = english.page;
  const eErrors = [];
  e.on('console', (m) => { if (m.type() === 'error') eErrors.push(m.text().slice(0, 300)); });
  await ready(e);
  await t.until(async () => (await e.locator('.structure-screen [data-k="mode:assemble"]').textContent()).includes('Assemble'), { timeoutMs: 30_000 });
  const eFetched = await e.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name.split('/').pop()).filter((n) => /^structure-(en|ru)-/.test(n)));
  t.check(eFetched.length === 1 && eFetched[0].startsWith('structure-en-'), `English fetched its own copy and no other: ${eFetched.join(', ')}`);
  t.check((await e.locator('.structure-screen .st-draft').textContent()).toLowerCase().includes('draft') && await e.evaluate(() => document.querySelector('.structure-screen').lang) === 'en', 'the English says it is a draft');
  t.check(!/[฀-๿]/.test(await e.locator('.structure-screen .st-side').innerText()), 'the satellite\'s side column has no Thai left in it');
  await english.shot('english-draft');
  t.check(eErrors.length === 0, `English console errors: ${eErrors.join(' | ')}`);
  await english.context.close();

  // ── a phone, touch, reduced motion: the picture kept in sight, assembling with taps
  const phone = await t.open({ hash: '#/structure/watch/edusat', viewport: 'mobile', lang: 'th', touch: true, contextOptions: { reducedMotion: 'reduce' } });
  const p = phone.page;
  const pErrors = [];
  p.on('console', (m) => { if (m.type() === 'error') pErrors.push(m.text().slice(0, 300)); });
  const pk = (key) => p.locator(`.structure-screen [data-k="${key}"]`);
  await ready(p);
  t.check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.querySelector('.structure-screen').scrollWidth <= window.innerWidth + 1), 'no sideways scrolling on a phone');
  const share = await p.evaluate(() => { const c = document.querySelector('.st-canvas-box').getBoundingClientRect(); return (c.width * c.height) / (innerWidth * innerHeight); });
  // (half of what the section has under the app's header: about 42 % of this window)
  t.check(share > 0.38, `the picture takes ${(100 * share).toFixed(1)} % of a phone's window`);
  // a subsystem picked by its name on the picture
  await pk('name:sys:power').tap();
  t.check((await p.locator('.st-info h2').first().textContent())?.trim() === 'ระบบพลังงาน', `a tap on a name picks ${await p.locator('.st-info h2').first().textContent()}`);
  // the panels scroll under the picture, which stays
  await p.evaluate(() => { document.querySelector('.structure-screen').scrollTop = 700; });
  const stuck = await p.evaluate(() => { const s = document.querySelector('.structure-screen').getBoundingClientRect(), c = document.querySelector('.st-canvas-box').getBoundingClientRect(); return { top: Math.round(c.top - s.top), height: Math.round(c.height), scrolled: document.querySelector('.structure-screen').scrollTop }; });
  t.check(stuck.scrolled > 300 && stuck.top === 0 && stuck.height > 240, `the picture stays in sight while the panels scroll: ${JSON.stringify(stuck)}`);
  await phone.shot('phone-explore');
  // assembling with taps: a first look fits a part with one tap
  await pk('mode:assemble').tap();
  await t.until(async () => p.evaluate(() => document.querySelector('.structure-screen').dataset.mode === 'assemble'));
  await ready(p);
  if (await pk('restart').isEnabled()) await pk('restart').tap();
  await pk('asm-next').tap();
  await pk('asm-next').tap();
  t.check((await p.locator('.st-asm .st-progress').textContent()).includes('2/13'), 'two parts fitted by taps');
  // deeper, a place is chosen by its number on the picture
  await pk('depth:explore').tap();
  await t.until(async () => p.evaluate(() => document.querySelector('.structure-screen').dataset.level === 'explore'));
  await ready(p);
  await pk('tray:payload').tap();
  t.check(await p.locator('.st-places .st-mark').count() === 11 && await p.locator('.st-overlay.is-narrow').count() === 1, `the free places are numbered on a phone's picture: ${await p.locator('.st-places .st-mark').count()}`);
  await pk('mark:payload').tap();
  for (let i = 0; i < 4 && !(await p.locator('.st-bar .st-turned').textContent()).includes('ทิศตรงแบบ'); i++) await pk('turn').tap();
  await pk('install').tap();
  t.check((await p.locator('.st-asm .st-progress').textContent()).includes('3/13'), `the camera fitted by taps: ${await p.locator('.st-bar [data-role="asm-msg"]').textContent()}`);
  // a finger drags a part onto its place too, once the parts lie apart (the assembly was begun on the outline, at a first look)
  t.check(await pk('outline').getAttribute('aria-pressed') === 'true', 'an assembly begun on the outline stays on it at the next depth');
  await pk('outline').tap();
  await ready(p);
  const cdp = await p.context().newCDPSession(p);
  const finger = (type, pt) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pt ? [{ x: Math.round(pt.x), y: Math.round(pt.y) }] : [] });
  const from = await p.evaluate(() => window.orbitlab.structure.section.stage.where('battery'));
  const under = await p.evaluate((f) => document.elementFromPoint(f.x, f.y)?.className ?? '', from);
  t.check(under === 'st-canvas', `the loose battery can be reached on the picture: ${under} at ${JSON.stringify(from)}`);
  await finger('touchStart', from);
  await finger('touchMove', { x: from.x + 8, y: from.y + 8 });
  const to = await p.evaluate(() => window.orbitlab.structure.section.stage.wherePlace('battery'));
  for (let i = 1; i <= 6; i++) await finger('touchMove', { x: from.x + 8 + ((to.x - from.x - 8) * i) / 6, y: from.y + 8 + ((to.y - from.y - 8) * i) / 6 });
  // (the page takes the finger's moves in its own time: wait for the last of them)
  const fingerHeld = await t.until(() => p.evaluate(() => { const s = window.orbitlab.structure.section.store; const h = s.held[s.model]; return h && h.slot === 'battery' ? { ...h, dragged: !!s.drag } : null; }), { timeoutMs: 10_000 });
  await finger('touchEnd');
  t.check(fingerHeld?.unit === 'battery' && fingerHeld.dragged, `a finger drags the battery over its place: ${JSON.stringify(fingerHeld)}`);
  await t.until(async () => (await p.locator('.st-asm .st-progress').textContent()).includes('4/13'), { timeoutMs: 10_000 });
  t.check((await p.locator('.st-asm .st-progress').textContent()).includes('4/13'), `and letting go fits it: ${await p.locator('.st-bar [data-role="asm-msg"]').textContent()}`);
  const handy = await p.evaluate(() => { const b = document.querySelector('.st-hand-box').getBoundingClientRect(), c = document.querySelector('.st-canvas-box').getBoundingClientRect(); return Math.round(b.top - c.bottom); });
  t.check(Math.abs(handy) <= 2, `what is in hand stays right under the picture: ${handy} px apart`);
  await phone.shot('phone-assemble');
  // the keyboard on the 3-D view: each key moves it, 0 brings back the overview
  await p.locator('.st-canvas').focus();
  const view = () => p.evaluate(() => window.orbitlab.structure.section.viewer.view());
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

  // ── a small phone (the browser's own bars leave about 660 px): nothing needed lies off the screen
  const small = await t.open({ hash: '#/structure/watch/soyuz-st31', viewport: { width: 390, height: 664 }, lang: 'th', touch: true, contextOptions: { reducedMotion: 'reduce' } });
  const q = small.page;
  await ready(q);
  const sk = (key) => q.locator(`.structure-screen [data-k="${key}"]`);
  // Brought into sight in the page, at one instant. The section draws its panels again when its state changes, also a
  // moment after `ready` (the picture settling), and an element taken before that is no longer in the page: Playwright's
  // own scrollIntoViewIfNeeded then throws "Element is not attached to the DOM" where a click would look again
  // (Pages run 43564094307; it lost its element in 5 of 25 tries here).
  const reveal = async (key) => {
    await sk(key).waitFor();
    await q.evaluate((k) => {
      const e = document.querySelector(`.structure-screen [data-k="${k}"]`);
      if (e?.scrollIntoViewIfNeeded) e.scrollIntoViewIfNeeded(true); else e?.scrollIntoView({ block: 'center' });
    }, key);
  };
  const rectOf = (sel) => q.evaluate((x) => { const e = document.querySelector(x); if (!e) return null; const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }, sel);
  const inSight = (r) => !!r && r.left >= 0 && r.right <= 390 + 1 && r.top >= 0 && r.bottom <= 664 + 1;
  // the activities and the first look's tools are all on the screen, none past its edge
  const across = await q.evaluate(() => [...document.querySelectorAll('.structure-screen .st-tab, .structure-screen .st-model, .structure-screen .st-bar-explore .st-tools > *')].map((e) => { const r = e.getBoundingClientRect(); return { k: e.dataset.k, left: Math.round(r.left), right: Math.round(r.right) }; }).filter((r) => r.left < 0 || r.right > 391));
  t.check(across.length === 0, `on a small phone every model, activity and first-look tool is within the screen's width: ${JSON.stringify(across)}`);
  const half = await q.evaluate(() => document.querySelector('.st-canvas-box').getBoundingClientRect().height / document.querySelector('.structure-screen').clientHeight);
  t.check(half > 0.45 && half < 0.55, `the picture takes half of what the section has: ${half.toFixed(2)}`);
  // changing the design: the verdict stays under the picture while an option far down the page is chosen
  await q.evaluate(() => { location.hash = '#/structure/watch/edusat/experiment'; });
  await q.waitForFunction(() => document.querySelector('.structure-screen').dataset.mode === 'experiment');
  await ready(q);
  if (await sk('create').count()) await sk('create').click();
  await reveal('payload:camera-night');
  await sk('payload:camera-night').click();
  await q.waitForFunction(() => document.querySelector('.st-verdict')?.classList.contains('st-short'));
  const verdict = await rectOf('.structure-screen .st-verdict'), pic = await rectOf('.structure-screen .st-canvas-box'), option = await rectOf('.structure-screen [data-k="payload:camera-night"]');
  t.check(inSight(verdict) && Math.abs(verdict.top - pic.bottom) <= 2 && option.top < 664 && option.bottom > verdict.bottom, `on a small phone the verdict stays under the picture beside the option chosen: verdict ${Math.round(verdict.top)}–${Math.round(verdict.bottom)}, option ${Math.round(option.top)}–${Math.round(option.bottom)}`);
  await small.shot('small-phone-experiment');
  // assembling: a refusal is read under the picture, and the tools are reached by scrolling back
  await q.evaluate(() => { location.hash = '#/structure/explore/edusat/assemble'; });
  await q.waitForFunction(() => document.querySelector('.structure-screen').dataset.mode === 'assemble');
  await ready(q);
  if (await sk('restart').isEnabled()) await sk('restart').click();
  await reveal('tray:stack');
  await sk('tray:stack').click();
  t.check(await q.evaluate(() => document.activeElement?.dataset.k) === 'slot', 'a part picked up from the list puts the focus on its place to choose');
  await sk('slot').selectOption('stack');
  await sk('install').click();
  const refusal = await rectOf('.structure-screen .st-hand-box .st-msg'), hand = await rectOf('.structure-screen .st-hand-box');
  t.check(inSight(refusal) && inSight(hand), `on a small phone the refusal is read under the picture: ${JSON.stringify(hand && { top: Math.round(hand.top), bottom: Math.round(hand.bottom) })}`);
  await q.evaluate(() => document.querySelector('.structure-screen').scrollTo(0, 0));
  await reveal('undo');
  t.check(inSight(await rectOf('.structure-screen [data-k="hint"]')), 'and the tools are reached by scrolling');
  await small.shot('small-phone-assemble');
  small.checkErrors();
  await small.context.close();
}
