/**
 * R2.6 (M-LAUNCH-062): the event-jump menu in Explore and Engineer: an opener
 * in the transport row (#btn-jump) and the timeline's chooser as its list.
 *
 * (a) Explore 1280×800: no opener before launch; before the first key event
 *     (nothing to list) one in its place, disabled and dimmed as the disabled
 *     Live is, its word subject to the row's fit, so being enabled moves
 *     nothing in the row (but where the clock's change at T+0, as liftoff
 *     enables the opener, switches the row's fit to a level that shows or
 *     hides the warp's word or the opener's own, the opener moves in that
 *     frame: src/style.css); with its word after it, which its
 *     accessible name holds (WCAG 2.5.3; TH and RU in (c), and in
 *     r2-transport-fit's (g) where the row's fit hides the word), its title
 *     its description; a picked view
 *     and Cinematic off survive a jump to 5 s
 *     before Max-Q chosen in the menu with the mouse; that choice leaves the
 *     focus off the opener, so after ArrowRight (5 s forward) Space plays and
 *     pauses and opens no menu; with the cursor just past Max-Q the menu
 *     opens on Max Q, marked; 44 px items inside the window; the opener and
 *     the open menu are not rebuilt while paused; Escape closes the menu onto
 *     the opener; jumps chosen with the keyboard, to liftoff (Enter, Home,
 *     Enter) and back to Max-Q (Enter, End, Enter), each close it onto the
 *     opener, Enter then reopens it on the event jumped to, marked (not on
 *     the event before, nor, with no frame drawn since the jump, on the one
 *     the timeline last drew), and Enter lands 5 s before that event again;
 *     ArrowRight then seeks 5 s forward; G2 S1–S4.
 * (b) Cinematic on, flown into orbit: a jump keeps Cinematic on and the camera
 *     programme shows its view for the phase landed in; the scene is as tall
 *     after the ascent's last event as at T−2 s.
 * (c) TH and RU at 1181 and 861 px (Explore's narrowest transport rows), at
 *     853×533 (the opener mid-window, with room for the menu on neither side:
 *     it scrolls, and after End its last row is wholly in view) and at 390
 *     and 320 px: the opener and the menu are inside the window,
 *     the menu does not cover its opener, it lists as many events as at
 *     1280 px, nothing overflows, the Max-Q item carries that language's short
 *     label; wider than 860 px the transport row keeps one line (a second one
 *     takes its height from the scene).
 * (d) Engineer: a jump to liftoff lands at max(start, liftoff − 5 s); after New
 *     mission there is no opener in the setup, and before liftoff it is in its
 *     place, disabled, its word subject to the row's fit; Watch has no opener.
 * (i) Engineer's second launch in (d), a Falcon 9 whose booster lands on the
 *     drone ship (six key events), RU 911×512 with the opener mid-window: the
 *     menu does not cover its opener, and after End its last row is wholly in
 *     view; after a jump to the last event chosen with the keyboard, Enter
 *     reopens the menu on it, marked, and Enter lands 5 s before it again
 *     (no frame drawn in between, as in (a)).
 * The other legs are journeys of their own, each within half its time limit:
 * (e), F2's flight wall, is r2-flight-wall; the transport row's fit is
 * r2-transport-fit ((f), (g), (k)), r2-transport-fit-launch ((h), (j), (l))
 * and r2-transport-fit-clock ((l), (m)).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { press } from '../harness.mjs';
import { checkSceneFloor } from '../scene-floor.mjs';
import { pausedFlightSettles } from './r2-flight-shell.mjs';

export const smoke = true;
export const timeoutMs = 600_000;

const RESPOND_MS = 20_000;
const LEAD_S = 5;
const NEAR_S = 0.05;
// the app's arrow step (Timeline.onKey in src/ui/timeline.ts)
const STEP_S = 5;
const INSERTION = /^evt\.(parkingOrbit|targetOrbit|offTargetOrbit|suborbitalTarget|suborbitalOffTarget)$/;
// the camera programme's view for the ascent (DEFAULT_CAMERA_PLAN in src/ui/dialogs.ts)
const ASCENT_VIEW = 'exterior';

export default async function r2EventJump(t) {
  await explore(t);
  await engineer(t);
}

const opener = (page) => page.locator('#btn-jump');
const openerWord = (page) => page.locator('#btn-jump > :first-child');
const menu = (page) => page.locator('#event-jump-menu');
const exact = (text) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
/** The menu's item for the event whose short label is `label`. */
const item = (page, label) => menu(page).locator('.tl-chooser-item', { has: page.locator('.tl-chooser-name', { hasText: exact(label) }) });
const focusedId = (page) => page.evaluate(() => document.activeElement?.id || null);

/** Open the menu from its opener with the mouse; false (recorded) when it did not open. */
async function openMenu(t, app, what) {
  if (!await press(t, app, opener(app.page), 'mouse', `${what}: the jump opener`)) return false;
  return t.check(await t.until(() => menu(app.page).isVisible(), { timeoutMs: RESPOND_MS }), `${what}: the opener did not open the jump menu`);
}

/** Open the menu and choose the item labelled `label`, with the mouse. */
async function jump(t, app, label, what) {
  return await openMenu(t, app, what) && press(t, app, item(app.page, label), 'mouse', what);
}

/** How the open menu covers its opener, where a second press would choose a row and seek; null when it does not. */
const menuOverOpener = (page) => page.evaluate(() => {
  const o = document.getElementById('btn-jump').getBoundingClientRect();
  const l = document.getElementById('event-jump-menu').getBoundingClientRect();
  const y = (b) => `y ${Math.round(b.top)}…${Math.round(b.bottom)}`;
  return l.left < o.right && l.right > o.left && l.top < o.bottom && l.bottom > o.top ? `menu ${y(l)}, opener ${y(o)}` : null;
});

/**
 * The opener's accessible name, as Chromium computes it (CDP), holds the word it shows, tl.jump.short (WCAG 2.5.3
 * label in name), and its title, tl.jump.label, is its description.
 */
export async function openerNamed(t, app, lang, where) {
  const cdp = await app.context.newCDPSession(app.page);
  let ax;
  try {
    await cdp.send('Accessibility.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#btn-jump' });
    ax = (await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false })).nodes[0];
  } finally {
    await cdp.detach();
  }
  const [name, description] = [ax?.name?.value ?? '', ax?.description?.value ?? ''];
  const [word, label] = [shortLabel(lang, 'tl.jump.short'), shortLabel(lang, 'tl.jump.label')];
  t.check(name.includes(word), `${where}: the jump opener is named "${name}", which does not hold its word "${word}"`);
  t.check(description === label, `${where}: the jump opener is described as "${description}", not "${label}"`);
}

/** End in the open menu; then where its focused row lies against the list's visible box, or null when wholly inside it. */
async function endRowHidden(page) {
  await page.keyboard.press('End');
  return page.evaluate(() => {
    const list = document.getElementById('event-jump-menu');
    const row = document.activeElement;
    if (!list.contains(row)) return `the focus is on ${row?.id || row?.tagName}, not in the menu`;
    const box = list.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    const top = box.top + list.clientTop;
    const bottom = top + list.clientHeight;
    return r.top >= top - 0.5 && r.bottom <= bottom + 0.5 ? null
      : `"${row.querySelector('.tl-chooser-name')?.textContent}" at y ${Math.round(r.top)}…${Math.round(r.bottom)}, the menu shows ${Math.round(top)}…${Math.round(bottom)}`;
  });
}

/** ArrowRight seeks STEP_S on from `fromS`; false (recorded) when it did not. */
async function stepsForward(t, app, fromS, what) {
  await app.page.keyboard.press('ArrowRight');
  const at = () => app.mcp('read_flight_state').then((s) => s.cursorTimeS);
  const stepped = await t.until(async () => Math.abs(await at() - (fromS + STEP_S)) <= NEAR_S, { timeoutMs: RESPOND_MS });
  return t.check(stepped, `${what} moved the cursor ${fromS} → ${await at()}, not ${STEP_S} s forward`);
}

/** The focused element's menu row: its short label (else the element's id) and its aria-current. */
const focusedRow = (page) => page.evaluate(() => ({ name: document.activeElement?.querySelector('.tl-chooser-name')?.textContent ?? document.activeElement?.id,
  current: document.activeElement?.getAttribute('aria-current') }));

/**
 * With the menu open on the row of the event `label` at `timeS`: Enter jumps LEAD_S before it and closes the menu onto
 * the opener, Enter then reopens the menu on that event, marked, not on the one before it, and Enter lands LEAD_S
 * before it again. The page's frames are held from the first Enter to the last (as a quick hand can press them), so no
 * frame is drawn in between: the menu marks its row by the app's cursor, not by the one the timeline last drew.
 */
async function keyboardJump(t, app, label, timeS, where) {
  const { page } = app;
  const landed = async (what) => {
    const at = (await app.mcp('read_flight_state')).cursorTimeS;
    t.check(Math.abs(at - (timeS - LEAD_S)) <= NEAR_S, `${where}: ${what} landed at T+${at}, not ${LEAD_S} s before "${label}" at T+${timeS}`);
  };
  await page.evaluate(() => window.__holdFrames(true));
  try {
    await page.keyboard.press('Enter');
    if (!t.check(await t.until(() => menu(page).isHidden(), { timeoutMs: RESPOND_MS }), `${where}: Enter on a row did not close the jump menu`)) return;
    await landed('the jump chosen with the keyboard');
    const focused = await focusedId(page);
    t.check(focused === 'btn-jump', `${where}: after a jump chosen with the keyboard the focus is on ${focused}, not the jump opener`);
    await page.keyboard.press('Enter');
    if (!t.check(await t.until(() => menu(page).isVisible(), { timeoutMs: RESPOND_MS }), `${where}: Enter after the keyboard jump did not reopen the jump menu`)) return;
    const row = await focusedRow(page);
    t.check(row.name === label && row.current === 'time',
      `${where}: after the keyboard jump to ${LEAD_S} s before "${label}" Enter, with no frame drawn since, reopened the menu on "${row.name}" (aria-current ${row.current})`);
    await page.keyboard.press('Enter');
    t.check(await t.until(() => menu(page).isHidden(), { timeoutMs: RESPOND_MS }), `${where}: Enter on a row did not close the jump menu`);
    await landed('Enter, Enter after the keyboard jump');
  } finally {
    await page.evaluate(() => window.__holdFrames(false));
  }
}

const sceneHeight = (page) => page.evaluate(() => document.getElementById('viewport').getBoundingClientRect().height);

async function explore(t) {
  const app = await t.open({ hash: '#/launch/explore', viewport: 'laptop-1280x800' });
  const { page } = app;
  const state = () => app.mcp('read_flight_state');
  try {
    // (a)
    await page.locator('#setup .launch-button').waitFor();
    t.check(await opener(page).isHidden(), '(a) the jump opener is displayed before launch');
    const launched = await app.mcp('launch_mission', {});
    if (!t.check(launched.ok, `(a) launch_mission ${JSON.stringify(launched)}`)) return;
    const atT2 = await t.until(async () => {
      const m = await page.evaluate(async () => ({ s: await window.__mcp('read_flight_state'), h: document.getElementById('viewport').getBoundingClientRect().height }));
      return m.s.cursorTimeS >= -2 ? m : null;
    }, { timeoutMs: 60_000, intervalMs: 50 });
    if (!t.check(atT2 && atT2.s.cursorTimeS < 0, `(a) no reading of the scene at T−2 s (${atT2?.s.cursorTimeS})`)) return;
    t.check(await opener(page).isDisabled(), '(a) the jump opener is enabled at T−2 s, before any key event');
    // with nothing to list it is shown in its place, disabled, so being enabled moves nothing in the row
    // (src/style.css; where the clock's change at T+0 switches the fit to a level that shows or hides the warp's
    // word or the opener's, the opener moves in that frame): dimmed as the disabled Live is (there is no live flight
    // to go back to), its word subject to the row's fit
    const cd = await opener(page).evaluate((o) => {
      const look = (e) => { const s = getComputedStyle(e); return `opacity ${s.opacity}, cursor ${s.cursor}`; };
      const live = document.getElementById('btn-live');
      return { shown: o.getClientRects().length > 0, word: o.firstElementChild.getClientRects().length > 0, fit: o.closest('.ctl-row').dataset.fit,
        look: look(o), live: live.disabled ? look(live) : 'enabled' };
    });
    t.check(cd.shown, '(a) at T−2 s, before any key event, the jump opener is not displayed');
    t.check(cd.shown && cd.look === cd.live, `(a) at T−2 s the disabled jump opener ${cd.shown ? `looks ${cd.look}, not as the disabled Live (${cd.live})` : 'is not displayed'}`);
    t.check(cd.shown && cd.word === (cd.fit !== '3'), `(a) at T−2 s the disabled jump opener ${cd.shown ? `${cd.word ? 'shows' : 'hides'} its word at data-fit ${cd.fit}` : 'is not displayed'}`);

    await app.mcp('control_playback', { action: 'warp', warp: 10 });
    let maxQ = null;
    const past = await t.until(async () => {
      maxQ = (await app.mcp('get_events', {})).events.find((e) => e.key === 'evt.maxQ') ?? null;
      return maxQ && (await state()).headTimeS > maxQ.timeS + 15;
    }, { timeoutMs: 180_000, intervalMs: 500 });
    if (!t.check(past, '(a) the flight never got 15 s past Max-Q')) return;
    t.check(await opener(page).isVisible(), '(a) the jump opener is not displayed in flight after liftoff');
    await app.mcp('control_playback', { action: 'pause' });
    if (!await pausedFlightSettles(t, app)) return;
    await press(t, app, page.locator('.cam-btn[data-cam="space"]'), 'mouse', '(a) space view');
    if (!await jump(t, app, shortLabel('en', 'tl.evt.maxQ'), '(a) Max-Q jump')) return;
    let s = await state();
    t.check(s.mode === 'replay', `(a) the jump did not go to replay (${s.mode})`);
    t.check(Math.abs(s.cursorTimeS - (maxQ.timeS - LEAD_S)) <= NEAR_S, `(a) the jump landed at T+${s.cursorTimeS}, not ${LEAD_S} s before Max-Q at T+${maxQ.timeS}`);
    t.check(s.camera === 'space', `(a) the jump changed the picked view to ${s.camera}`);
    t.check(await page.locator('#btn-cinematic').getAttribute('aria-pressed') === 'false', '(a) the jump turned Cinematic on');
    t.check(await t.until(() => menu(page).isHidden(), { timeoutMs: RESPOND_MS }), '(a) choosing Max Q did not close the jump menu');
    // a choice with the mouse does not hand the focus to the opener (src/ui/timeline.ts), where Space would open the menu
    let focused = await focusedId(page);
    t.check(focused !== 'btn-jump', '(a) after the Max-Q jump chosen with the mouse the focus is on the jump opener');
    t.check(await openerWord(page).isVisible(), '(a) the enabled jump opener does not show its word');
    await openerNamed(t, app, 'en', '(a) EN 1280×800');

    // the teaching flow: after the jump ArrowRight seeks 5 s (src/main.ts onKey), then Space plays and pauses
    await stepsForward(t, app, s.cursorTimeS, '(a) ArrowRight after the Max-Q jump');
    for (const playing of [true, false]) {
      await page.keyboard.press(' ');
      t.check(await t.until(async () => (await state()).playing === playing, { timeoutMs: RESPOND_MS }),
        `(a) Space after the mouse jump and ArrowRight did not ${playing ? 'play' : 'pause'} the replay`);
      t.check(await menu(page).isHidden(), `(a) Space after the mouse jump and ArrowRight opened the jump menu (playing ${(await state()).playing})`);
    }
    if (await menu(page).isVisible()) await page.keyboard.press('Escape');

    if (!await openMenu(t, app, '(a) 44 px items')) return;
    // the cursor is just past Max-Q: the menu marks that row and opens on it, as a cluster's chooser does
    const onRow = await focusedRow(page);
    const atS = (await state()).cursorTimeS;
    t.check(onRow.name === shortLabel('en', 'tl.evt.maxQ') && onRow.current === 'time',
      `(a) with the cursor at T+${atS} just past Max-Q (T+${maxQ.timeS}) the menu opened on "${onRow.name}" (aria-current ${onRow.current}), not on Max Q`);
    const items = await page.evaluate(() => [...document.querySelectorAll('#event-jump-menu .tl-chooser-item')].map((b) => {
      const r = b.getBoundingClientRect();
      return { text: b.querySelector('.tl-chooser-name')?.textContent ?? '', w: r.width, h: r.height, inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight };
    }));
    t.check(items.some((b) => b.text === shortLabel('en', 'tl.evt.maxQ')), `(a) the menu lists no Max Q: ${items.map((b) => b.text).join(', ')}`);
    const small = items.filter((b) => b.w < 44 || b.h < 44).map((b) => `${b.text} ${b.w}×${b.h}`);
    t.check(small.length === 0, `(a) jump items under 44 × 44 px: ${small.join(', ')}`);
    const outside = items.filter((b) => !b.inside).map((b) => b.text);
    t.check(outside.length === 0, `(a) jump items outside the window: ${outside.join(', ')}`);

    const mutations = await page.evaluate(() => new Promise((done) => {
      let n = 0;
      const o = new MutationObserver((list) => { n += list.length; });
      for (const id of ['btn-jump', 'event-jump-menu']) o.observe(document.getElementById(id), { subtree: true, childList: true, attributes: true, characterData: true });
      setTimeout(() => { o.disconnect(); done(n); }, 2000);
    }));
    t.check(mutations === 0, `(a) the paused opener and its open menu changed ${mutations} times in 2 s`);
    await page.keyboard.press('Escape');
    t.check(await t.until(() => menu(page).isHidden(), { timeoutMs: RESPOND_MS }), '(a) Escape did not close the jump menu');
    focused = await focusedId(page);
    t.check(focused === 'btn-jump', `(a) after Escape the focus is on ${focused}, not the jump opener`);
    // with the keyboard: Enter opens the menu on Max Q, Home and Enter jump to liftoff, the focus comes back to the
    // opener, Enter opens the menu on Liftoff, End and Enter jump back to Max Q, and the arrows still seek from there
    // (the opener is a plain button)
    const liftoff = (await app.mcp('get_events', {})).events.find((e) => e.key === 'evt.liftoff');
    for (const [key, label, ev] of [['Home', shortLabel('en', 'tl.evt.liftoff'), liftoff], ['End', shortLabel('en', 'tl.evt.maxQ'), maxQ]]) {
      await page.keyboard.press('Enter');
      if (!t.check(await t.until(() => menu(page).isVisible(), { timeoutMs: RESPOND_MS }), '(a) Enter on the jump opener did not open the jump menu')) return;
      await page.keyboard.press(key);
      const row = await focusedRow(page);
      if (!t.check(row.name === label, `(a) ${key} in the jump menu focused "${row.name}", not "${label}"`)) return;
      await keyboardJump(t, app, label, ev.timeS, `(a) ${key}: ${label}`);
    }
    await stepsForward(t, app, (await state()).cursorTimeS, '(a) ArrowRight after the keyboard jump');
    focused = await focusedId(page);
    t.check(focused === 'btn-jump', `(a) after ArrowRight the focus is on ${focused}, not the jump opener`);
    await checkSceneFloor(t, app, 'laptop-1280x800', 'closed', '(a) explore 1280×800 with the jump opener');

    // (b)
    await press(t, app, page.locator('#btn-cinematic'), 'mouse', '(b) Cinematic');
    t.check(await page.locator('#btn-cinematic').getAttribute('aria-pressed') === 'true', '(b) Cinematic is not on');
    await app.mcp('control_playback', { action: 'live' });
    await app.mcp('control_playback', { action: 'play' });
    await app.mcp('control_playback', { action: 'warp', warp: 50 });
    let insertion = null;
    const inOrbit = await t.until(async () => {
      insertion = (await app.mcp('get_events', {})).events.find((e) => INSERTION.test(e.key)) ?? null;
      return insertion && (await state()).headTimeS > insertion.timeS + 5;
    }, { timeoutMs: 300_000, intervalMs: 1000 });
    if (!t.check(inOrbit, '(b) the flight did not reach orbit')) return;
    // measured still flying, as at T−2 s: pausing hides the achieved-speed line under the controls, which is not the opener's
    const h = await sceneHeight(page);
    t.check(Math.abs(h - atT2.h) < 0.5, `(a) the scene was ${atT2.h} px tall at T−2 s and is ${h} px after insertion`);
    await app.mcp('control_playback', { action: 'pause' });
    if (!await pausedFlightSettles(t, app)) return;
    if (!await jump(t, app, shortLabel('en', 'tl.evt.maxQ'), '(b) Max-Q jump with Cinematic on')) return;
    t.check(await t.until(async () => (await state()).camera === ASCENT_VIEW, { timeoutMs: RESPOND_MS }),
      `(b) with Cinematic on the camera is ${(await state()).camera}, not the programme's ${ASCENT_VIEW} for the ascent`);
    t.check(await page.locator('#btn-cinematic').getAttribute('aria-pressed') === 'true', '(b) the jump turned Cinematic off');
    s = await state();
    t.check(Math.abs(s.cursorTimeS - (maxQ.timeS - LEAD_S)) <= NEAR_S, `(b) the jump landed at T+${s.cursorTimeS}, not ${LEAD_S} s before Max-Q`);
    // the menu's length at 1280 px with the whole ascent recorded, for (c): a menu has no width-driven rule
    if (!await openMenu(t, app, '(b) the menu at 1280 px')) return;
    const desktopCount = await menu(page).locator('.tl-chooser-item').count();
    await page.keyboard.press('Escape');
    t.check(await t.until(() => menu(page).isHidden(), { timeoutMs: RESPOND_MS }), '(b) Escape did not close the jump menu');

    // (c)
    for (const lang of ['th', 'ru']) {
      await setLanguage(t, app, lang);
      await openerNamed(t, app, lang, `(c) ${lang.toUpperCase()} 1280×800`);
      const label = shortLabel(lang, 'tl.evt.maxQ');
      for (const [width, height] of [[1181, 800], [861, 800], [853, 533], [390, 800], [320, 800]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const where = `(c) ${lang.toUpperCase()} ${width}×${height}`;
        // on a phone the playback row is below the scene: bring the opener up as a person would (at 853×533 it is
        // then mid-window, with room for the whole menu on neither side)
        await opener(page).evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
        if (!await openMenu(t, app, where)) continue;
        const over = await menuOverOpener(page);
        t.check(!over, `${where}: the jump menu covers its opener (${over})`);
        const m = await page.evaluate(() => {
          const btn = document.getElementById('btn-jump').getBoundingClientRect();
          const list = document.getElementById('event-jump-menu');
          const box = list.getBoundingClientRect();
          const items = [...list.querySelectorAll('.tl-chooser-item')];
          const root = document.scrollingElement;
          const play = document.getElementById('btn-play').getBoundingClientRect();
          // one line: every item of the transport row shares a line with play/pause
          const oneLine = [...document.querySelectorAll('.ctl-row :is(.ctl-group > *, .mission-clock, .jump-btn, .warp)')].filter((e) => e.getClientRects().length > 0)
            .every((e) => { const r = e.getBoundingClientRect(); return r.top < play.bottom && r.bottom > play.top; });
          return { oneLine, opener: btn.left >= 0 && btn.right <= root.clientWidth, inside: box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight,
            n: items.length, small: items.filter((b) => b.getBoundingClientRect().height < 44).length,
            over: items.filter((b) => b.scrollWidth > b.clientWidth).map((b) => b.textContent), listSW: list.scrollWidth, listCW: list.clientWidth,
            docSW: root.scrollWidth, docCW: root.clientWidth, names: items.map((b) => b.querySelector('.tl-chooser-name')?.textContent ?? ''),
            scrolls: list.scrollHeight > list.clientHeight + 1 };
        });
        t.check(width <= 860 || m.oneLine, `${where}: the transport row takes more than one line`);
        t.check(m.opener, `${where}: the jump opener is cut off at the window's edge`);
        t.check(m.inside, `${where}: the jump menu is not inside the window`);
        t.check(m.n === desktopCount, `${where}: the menu lists ${m.n} events, not the ${desktopCount} it lists at 1280 px`);
        t.check(m.small === 0, `${where}: ${m.small} jump items under 44 px tall`);
        t.check(m.listSW <= m.listCW && m.over.length === 0, `${where}: the menu overflows (${m.listSW}/${m.listCW}; ${m.over.join(' | ')})`);
        t.check(m.docSW <= m.docCW, `${where}: the page scrolls sideways (${m.docSW}/${m.docCW})`);
        t.check(m.names.includes(label), `${where}: no jump item reads "${label}" (${m.names.join(', ')})`);
        // at 853×533 the menu has less room than its rows take, so it scrolls; wherever it scrolls, End shows the last row
        if (m.scrolls || height === 533) {
          t.check(m.scrolls, `${where}: the jump menu does not scroll, with less room beside its opener than its rows take`);
          const hidden = await endRowHidden(page);
          t.check(!hidden, `${where}: after End the focused row is not wholly in the menu's view (${hidden})`);
        }
        await page.keyboard.press('Escape');
        t.check(await t.until(() => menu(page).isHidden(), { timeoutMs: RESPOND_MS }), `${where}: Escape did not close the jump menu`);
      }
    }
  } finally {
    app.checkErrors();
    await app.context.close();
  }
}

async function engineer(t) {
  const app = await t.open({ hash: '#/launch/engineer', viewport: 'laptop-1280x800' });
  const { page } = app;
  const state = () => app.mcp('read_flight_state');
  try {
    const first = await liftoffJump(t, app);
    if (!first) return;
    const s = await state();
    const want = Math.max(first.settled.startTimeS, first.liftoff.timeS - LEAD_S);
    t.check(Math.abs(s.cursorTimeS - want) <= NEAR_S, `(d) the liftoff jump landed at T+${s.cursorTimeS}, not T+${want}`);
    // New mission and a second launch, a Falcon 9 landing its booster on the drone ship ((i): six key events):
    // the setup has no opener, and before liftoff the opener has none of the first flight's events to list
    await page.evaluate((text) => { [...document.querySelectorAll('#setup button')].find((b) => b.textContent?.trim() === text)?.click(); }, shortLabel('en', 'setup.reset'));
    t.check(await t.until(() => page.evaluate(() => document.body.dataset.flightStage === 'setup'), { timeoutMs: RESPOND_MS }), '(d) New mission did not return to the setup');
    t.check(await opener(page).isHidden(), '(d) after New mission the jump opener is displayed in the setup');
    const relaunched = await app.mcp('launch_mission', { vehicleId: 'falcon9', boosterRecovery: true, recoveryPlan: { core: { kind: 'droneShip' } } });
    if (!t.check(relaunched.ok, `(d) second launch_mission ${JSON.stringify(relaunched)}`)) return;
    await t.until(() => page.evaluate(() => document.body.dataset.flightStage === 'flight'), { timeoutMs: RESPOND_MS });
    const stale = await opener(page).evaluate((o) => ({ enabled: !o.disabled, open: !!document.getElementById('event-jump-menu'),
      shown: o.getClientRects().length > 0, word: o.firstElementChild.getClientRects().length > 0, fit: o.closest('.ctl-row').dataset.fit }));
    const again = await state();
    // in the count-down it is in its place, disabled, its word subject to the row's fit
    t.check(again.cursorTimeS < 0 && !stale.enabled && !stale.open && stale.shown && stale.word === (stale.fit !== '3'),
      `(d) after New mission the opener is ${stale.enabled ? 'enabled' : 'disabled'}${stale.shown ? `, its word ${stale.word ? 'shown' : 'hidden'} at data-fit ${stale.fit}` : ', not displayed'}${stale.open ? ' with its menu open' : ''} at T${again.cursorTimeS}`);
    await sixEvents(t, app);
    await page.evaluate(() => { location.hash = '#/launch/watch'; });
    t.check(await t.until(() => page.evaluate(() => document.body.dataset.mode === 'watch'), { timeoutMs: RESPOND_MS }), '(d) Watch did not open');
    t.check(await opener(page).isHidden(), '(d) the jump opener is visible in Watch');
  } finally {
    app.checkErrors();
    await app.context.close();
  }
}

/**
 * (d) Engineer's first launch at warp 5, paused 6 s past liftoff once the paused flight has settled, and a jump to
 * liftoff chosen in the menu with the mouse, where r2-flight-wall's (e) and r2-transport-fit's Engineer legs start
 * too: the paused flight's start and the liftoff event, or null (recorded) when it did not get there.
 */
export async function liftoffJump(t, app) {
  const { page } = app;
  await page.locator('#setup .launch-button').waitFor();
  const launched = await app.mcp('launch_mission', {});
  if (!t.check(launched.ok, `(d) launch_mission ${JSON.stringify(launched)}`)) return null;
  await app.mcp('control_playback', { action: 'warp', warp: 5 });
  let liftoff = null;
  const past = await t.until(async () => {
    liftoff = (await app.mcp('get_events', {})).events.find((e) => e.key === 'evt.liftoff') ?? null;
    return liftoff && (await app.mcp('read_flight_state')).headTimeS > liftoff.timeS + 6;
  }, { timeoutMs: 120_000, intervalMs: 500 });
  if (!t.check(past, '(d) the Engineer flight never got 6 s past liftoff')) return null;
  await app.mcp('control_playback', { action: 'pause' });
  const settled = await pausedFlightSettles(t, app);
  if (!settled) return null;
  if (!await jump(t, app, shortLabel('en', 'tl.evt.liftoff'), '(d) liftoff jump')) return null;
  return { settled, liftoff };
}

/**
 * (i) The Falcon 9 relaunched in (d), flown on as Engineer flies it (six-DOF) until its booster has landed on the
 * drone ship: six key events. At RU 911×512, with the opener as far up the window as the page scrolls it, the menu
 * fits on neither side of it, and opens on the roomier one, scrolling, never over the opener.
 */
async function sixEvents(t, app) {
  const { page } = app;
  await app.mcp('control_playback', { action: 'warp', warp: 1000 });
  const landed = await t.until(async () => (await app.mcp('get_events', {})).events.some((e) => e.key === 'evt.boosterLandedShip'),
    { timeoutMs: 180_000, intervalMs: 500 });
  await app.mcp('control_playback', { action: 'pause' });
  if (!t.check(landed, `(i) the Falcon 9's booster did not land on the drone ship (T+${(await app.mcp('read_flight_state')).cursorTimeS})`)) return;
  await setLanguage(t, app, 'ru');
  await page.setViewportSize({ width: 911, height: 512 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await opener(page).evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  const where = '(i) Engineer RU 911×512, six key events';
  if (!await openMenu(t, app, where)) return;
  const n = await menu(page).locator('.tl-chooser-item').count();
  t.check(n === 6, `${where}: the menu lists ${n} events, not 6`);
  const over = await menuOverOpener(page);
  t.check(!over, `${where}: the jump menu covers its opener (${over})`);
  const hidden = await endRowHidden(page);
  t.check(!hidden, `${where}: after End the focused row is not wholly in the menu's view (${hidden})`);
  await page.keyboard.press('Escape');
  t.check(await t.until(() => menu(page).isHidden(), { timeoutMs: RESPOND_MS }), `${where}: Escape did not close the jump menu`);
  // a jump to the last event chosen with the keyboard (Enter, End, Enter), then Enter, Enter
  await page.keyboard.press('Enter');
  if (t.check(await t.until(() => menu(page).isVisible(), { timeoutMs: RESPOND_MS }), `${where}: Enter on the jump opener did not open the jump menu`)) {
    await page.keyboard.press('End');
    const label = (await focusedRow(page)).name;
    const last = (await app.mcp('get_events', {})).events.find((e) => shortLabel('ru', `tl.${e.key}`) === label);
    if (t.check(last, `${where}: End focused "${label}", which names no recorded event`)) await keyboardJump(t, app, label, last.timeS, `${where}, the last event`);
  }
  await setLanguage(t, app, 'en');
  await page.setViewportSize({ width: 1280, height: 800 });
}

/** A short label straight from the dictionary source, so the check does not go through the app. */
export function shortLabel(lang, key) {
  const src = readFileSync(fileURLToPath(new URL(`../../../src/i18n/${lang}.ts`, import.meta.url)), 'utf8');
  const m = src.match(new RegExp(`'${key.replace(/\./g, '\\.')}': '([^']*)'`));
  return m ? m[1] : null;
}

export async function setLanguage(t, app, lang) {
  await app.page.evaluate((l) => {
    const select = document.getElementById('lang-select');
    if (select.value === l) return;
    select.value = l;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, lang);
  t.check(await t.until(() => app.page.evaluate((l) => document.documentElement.lang === l, lang), { timeoutMs: 5000 }), `the page did not switch to ${lang}`);
}
