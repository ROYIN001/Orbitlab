/**
 * G2 hold / finding F5: the launch scene's minimum size and what may not cover
 * it, checked at one window size (r2-viewport-matrix for the Engineer flight,
 * r2-scene-floor for the Explore flight).
 *
 * Owner's note with the G2 hold (2026-10-05, verbatim): "ให้ฉากแสดงการปล่อยได้
 * ตามมาตรฐานขั้นต่ำในทั้งโหมด ทดลองและวิศวกร พวกเครื่องมืออื่นๆให้ย้ายออไปข้างหรือ
 * ไม่ก็ไว้ข้างล่างแบบเลื่อนลงไปดูเอง ต้องไม่มาบังพื้นที่หน้าจอหลักและแถบtimeline
 * สถานการณ์สำคัญ"
 *
 * - S1 the scene (#viewport) is at least sceneMin(h) tall, where h is the
 *   window's CSS height, and at least that much of it is on the first screen;
 * - S2 nothing covers the scene: a press at five points inside its visible
 *   part lands inside #viewport;
 * - S3 wider than 860 px with the guide closed, where the scene's minimum and
 *   its playback row (186 px) fit under the top of the stage: the key-events
 *   timeline (#timeline), play/pause and the clock are wholly on the first screen,
 *   inside every box that clips them, and a press at their centre lands on
 *   them — the tools that do not fit go beside or below, reached by scrolling;
 * - S4 otherwise (the stacked layout up to 860 px, the guide open, or a window
 *   too short for both): the timeline is reachable — scrolled to, a press at
 *   its centre lands on it.
 * - S5 a scene under SHORT_SCENE px tall shows the narration's phase name
 *   only: its prose and latest-event line (which covered half of a 260 px
 *   scene) are not drawn over the picture.
 * - S6 a scene under SHORT_SCENE px tall is compact (the owner's answer on the
 *   G2 card, 2026-10-06, option "compact": "ฉากเตี้ยกว่า 380 px: ย่อป้ายให้เหลือ
 *   บรรทัดเดียว และพับการ์ดเทเลเมทรีเป็นปุ่ม"): (a) the overlays drawn on it
 *   (OVERLAYS) cover at most SHORT_OVERLAY_SHARE of its area together
 *   (NARROW_OVERLAY_SHARE under NARROW_SCENE px wide); (b) the
 *   mission title block is one line; (c) a floating telemetry card is folded
 *   into a button (aria-controls="hud", aria-expanded) that opens it by mouse
 *   and by keyboard and closes it again. The check leaves the card open; the
 *   next short size must find it folded again (a resize closes it).

 *
 * The minimum is the owner's answer on the G2 card (2026-10-06, option b):
 * 50 % of the window's height, never less than 240 px and never asked to
 * exceed 400 px, on phones too. The owner accepted that on a short window the
 * playback row then sits below the first screen, reached by scrolling (S3 →
 * S4). It is the same formula as `--scene-min` in src/style.css.
 */
import { keyOn, press, viewportSize } from './harness.mjs';

/** Under this scene height the narration keeps its phase name only (src/main.ts SHORT_SCENE_PX). */
export const SHORT_SCENE = 380;

/**
 * S6(a): the most of a short scene's area the overlays may cover together,
 * from the measurements in docs/development/reports/G2-compact-overlay.md.
 * Before the compact layout they covered 21-53 % of a short scene (the card,
 * a three-line title, the tool column); after it 10-18 % of every short scene
 * at least NARROW_SCENE px wide, so a quarter is the ceiling there, with room
 * for a longer title or callout: three quarters of the picture clear. A
 * narrower short scene (601 px: Explore at 150 % zoom on 1366x768, the only
 * one in the matrices) cannot hold the Russian camera tabs and the tool row
 * on one line; the tabs wrap to two rows and the overlays cover 21-30 %
 * (41-53 % before), so it is held to a third.
 */
export const SHORT_OVERLAY_SHARE = 0.25;
export const NARROW_OVERLAY_SHARE = 1 / 3;
export const NARROW_SCENE = 700;

/** What S6(a) counts as drawn over the scene: the scene-ui's surfaces, not its bands (spacers) or the canvases. */
export const OVERLAYS = '.mission-title, .sim-state, #camera-tabs, .camera-tools > *, #ticker > *, #narration, .scene-hint, #hud';

/** The minimum scene height (CSS px) in a window `h` CSS px high: clamp(240px, 50vh, 400px). */
export function sceneMin(h) {
  return Math.min(400, Math.max(240, 0.5 * h));
}

/** S1–S4 at one size, language and guide state; returns the scene's box. */
export async function checkSceneFloor(t, app, preset, state, where) {
  const { width, height } = viewportSize(preset);
  const min = sceneMin(height);
  await app.page.evaluate(async () => {
    // the first screen: every scroll container back at its start (an earlier
    // check may have scrolled the workspace or the flight column to a panel)
    window.scrollTo(0, 0);
    for (const n of document.querySelectorAll('*')) if (n.scrollTop) n.scrollTop = 0;
    // what follows the scroll (the phone's flight bar steps aside on the next
    // frames, src/main.ts watchBarStrip) settles before the scene is measured
    for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => setTimeout(r, 150));
  });
  const m = await app.page.evaluate(() => {
    const scene = document.getElementById('viewport');
    const b = scene.getBoundingClientRect();
    const h = document.scrollingElement.clientHeight;
    // the part of the scene inside the window and inside every box that clips it
    let top = Math.max(0, b.top);
    let bottom = Math.min(h, b.bottom);
    for (let p = scene.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (o.overflowY === 'visible' && o.overflowX === 'visible') continue;
      const c = p.getBoundingClientRect();
      top = Math.max(top, c.top);
      bottom = Math.min(bottom, c.bottom);
    }
    const visible = Math.max(0, bottom - top);
    // S2: five points inside the visible part of the scene, inset by a tenth
    const misses = [];
    if (visible > 0) {
      for (const [fx, fy] of [[0.5, 0.5], [0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]]) {
        const x = b.left + fx * b.width;
        const y = top + fy * visible;
        const hit = document.elementFromPoint(x, y);
        if (!hit || !document.getElementById('viewport').contains(hit)) {
          misses.push(`(${Math.round(x)},${Math.round(y)}) on ${hit ? `${hit.tagName.toLowerCase()}${hit.id ? `#${hit.id}` : ''}${hit.closest('[id]') && hit.closest('[id]') !== hit ? ` in #${hit.closest('[id]').id}` : ''}` : 'nothing'}`);
        }
      }
    }
    const prose = [...scene.querySelectorAll('.narration .phase-detail, .narration .latest-event')]
      .filter((n) => n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden').map((n) => n.className);
    const stage = document.querySelector('.flight-stage')?.getBoundingClientRect();
    return { w: Math.round(b.width), h: Math.round(b.height), visible: Math.round(visible), y: Math.round(b.top), misses, prose, stageTop: stage ? stage.top : b.top, winH: h };
  });
  t.check(m.h >= min - 0.5, `${where}: the scene is ${m.w}×${m.h}, under the minimum height ${Math.round(min)} px (S1)`);
  t.check(m.visible >= min - 0.5, `${where}: only ${m.visible} px of the scene (y ${m.y}, ${m.h} px tall) is on the first screen, under the minimum ${Math.round(min)} px (S1)`);
  if (m.h < SHORT_SCENE) t.check(m.prose.length === 0, `${where}: the scene is ${m.h} px tall but the narration still draws ${m.prose.join(', ')} over it (S5)`);
  t.check(m.misses.length === 0, `${where}: something covers the scene — a press at ${m.misses.join(', ')} (S2)`);
  if (m.h < SHORT_SCENE) await checkCompact(t, app, where);
  const stacked = width <= 860;
  // the playback row under the scene: 174 px with the achieved-speed line, plus the 12 px gap
  const fits = m.stageTop + min + 186 <= m.winH + 0.5;
  if (!stacked && state === 'closed' && fits) {
    for (const [what, sel] of [['timeline', '#timeline'], ['play/pause', '#btn-play'], ['clock', '#clock']]) {
      const r = await onFirstScreen(app, sel);
      t.check(r === null, `${where}: the ${what} (${sel}) is not wholly on the first screen — ${r} (S3)`);
    }
  } else {
    const r = await reachableByScrolling(app, '#timeline');
    t.check(r === null, `${where}: the timeline cannot be reached — ${r} (S4)`);
  }
  return m;
}

/**
 * The share of the scene's box covered by the union of the OVERLAYS' boxes
 * (each clipped to the scene), the boxes themselves, and the number of lines
 * the mission title block is drawn on.
 */
export function overlayShare(app) {
  return app.page.evaluate((sel) => {
    const scene = document.getElementById('viewport');
    const s = scene.getBoundingClientRect();
    const boxes = [];
    for (const n of scene.querySelectorAll(sel)) {
      if (n.getClientRects().length === 0 || getComputedStyle(n).visibility === 'hidden') continue;
      const b = n.getBoundingClientRect();
      const x0 = Math.max(b.left, s.left), x1 = Math.min(b.right, s.right), y0 = Math.max(b.top, s.top), y1 = Math.min(b.bottom, s.bottom);
      if (x1 > x0 && y1 > y0) boxes.push({ what: n.id ? `#${n.id}` : `.${[...n.classList].join('.')}`, x0, x1, y0, y1 });
    }
    // the union's area, exactly: cut the scene at every box edge and add up the covered cells
    const xs = [...new Set(boxes.flatMap((b) => [b.x0, b.x1]))].sort((a, b) => a - b);
    const ys = [...new Set(boxes.flatMap((b) => [b.y0, b.y1]))].sort((a, b) => a - b);
    let area = 0;
    for (let i = 0; i + 1 < xs.length; i++) {
      for (let j = 0; j + 1 < ys.length; j++) {
        const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
        if (boxes.some((b) => cx > b.x0 && cx < b.x1 && cy > b.y0 && cy < b.y1)) area += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]);
      }
    }
    // the title block's lines: its text's line boxes, grouped where they overlap vertically
    const title = scene.querySelector('.mission-title');
    const lines = [];
    if (title) {
      const range = document.createRange();
      range.selectNodeContents(title);
      for (const r of range.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        const line = lines.find((l) => Math.min(l.b, r.bottom) - Math.max(l.t, r.top) > 0.5 * Math.min(l.b - l.t, r.height));
        if (line) { line.t = Math.min(line.t, r.top); line.b = Math.max(line.b, r.bottom); } else lines.push({ t: r.top, b: r.bottom });
      }
    }
    return {
      share: area / (s.width * s.height),
      width: s.width,
      boxes: boxes.map((b) => `${b.what} ${Math.round(b.x1 - b.x0)}×${Math.round(b.y1 - b.y0)}`),
      titleLines: lines.length,
    };
  }, OVERLAYS);
}

/** S6 in a short scene: (a) the overlays' share, (b) a one-line title, (c) the telemetry card folded into a button. */
async function checkCompact(t, app, where) {
  const o = await overlayShare(app);
  const most = o.width < NARROW_SCENE ? NARROW_OVERLAY_SHARE : SHORT_OVERLAY_SHARE;
  t.log(`${where}: overlays cover ${(100 * o.share).toFixed(1)} % of the short scene (${o.boxes.join(', ')})`);
  t.check(o.share <= most, `${where}: the overlays cover ${(100 * o.share).toFixed(1)} % of the ${Math.round(o.width)} px wide short scene, over ${(100 * most).toFixed(1)} % (S6a: ${o.boxes.join(', ')})`);
  t.check(o.titleLines <= 1, `${where}: the mission title block is drawn on ${o.titleLines} lines in a short scene (S6b)`);
  const card = () => app.page.evaluate(() => {
    const hud = document.getElementById('hud');
    const btn = document.querySelector('#viewport button[aria-controls="hud"]');
    return {
      floating: document.getElementById('viewport').contains(hud),
      drawn: hud.getClientRects().length > 0,
      button: !!btn && btn.getClientRects().length > 0,
      expanded: btn?.getAttribute('aria-expanded') ?? null,
      name: (btn?.getAttribute('aria-label') || btn?.textContent || '').trim(),
    };
  });
  const c = await card();
  if (!c.floating) return; // docked in the telemetry panel: nothing of it is over the scene
  t.check(!c.drawn, `${where}: the telemetry card is drawn over the short scene, not folded into a button (S6c)`);
  if (!t.check(c.button && c.expanded === 'false' && c.name !== '',
    `${where}: no folded telemetry card button (aria-controls="hud", aria-expanded="false", named) — ${JSON.stringify(c)} (S6c)`)) return;
  const btn = app.page.locator('#viewport button[aria-controls="hud"]');
  const opened = async (how, want) => {
    const now = await card();
    t.check(now.drawn === want && now.expanded === String(want), `${where}: by ${how}, the telemetry card did not ${want ? 'open' : 'close'} — ${JSON.stringify(now)} (S6c)`);
  };
  if (await press(t, app, btn, 'mouse', `${where}: the telemetry card button`)) {
    await opened('mouse', true);
    await press(t, app, btn, 'mouse', `${where}: the telemetry card button`);
    await opened('mouse', false);
  }
  if (await keyOn(t, app, btn, 'Enter', `${where}: the telemetry card button`)) {
    await opened('keyboard (Enter)', true);
    await app.page.keyboard.press(' ');
    await opened('keyboard (Space)', false);
    // left open: the next resize must fold it again (checked on arrival at the next short size)
    await app.page.keyboard.press('Enter');
    await opened('keyboard (Enter)', true);
  }
}

/** null when the element is wholly inside the window, inside every box that clips it, and a press at its centre lands on it. */
function onFirstScreen(app, sel) {
  return app.page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return 'not in the page';
    const b = el.getBoundingClientRect();
    if (b.width === 0 || b.height === 0) return `not rendered (${Math.round(b.width)}×${Math.round(b.height)})`;
    const root = document.scrollingElement;
    if (b.top < -0.5 || b.left < -0.5 || b.bottom > root.clientHeight + 0.5 || b.right > root.clientWidth + 0.5) {
      return `outside the window (y ${Math.round(b.top)}…${Math.round(b.bottom)} of ${root.clientHeight})`;
    }
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (o.overflowY === 'visible' && o.overflowX === 'visible') continue;
      const c = p.getBoundingClientRect();
      if (b.top < c.top - 0.5 || b.bottom > c.bottom + 0.5) return `clipped by ${p.tagName.toLowerCase()}${p.id ? `#${p.id}` : `.${[...p.classList].join('.')}`} (y ${Math.round(b.top)}…${Math.round(b.bottom)}, box ${Math.round(c.top)}…${Math.round(c.bottom)})`;
    }
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    if (!hit || !(hit === el || el.contains(hit))) return `covered: a press at its centre lands on ${hit ? `${hit.tagName.toLowerCase()}${hit.id ? `#${hit.id}` : ''}` : 'nothing'}`;
    return null;
  }, sel);
}

/** null when, scrolled into the middle of the window, a press at the element's centre lands on it; scrolls everything back. */
function reachableByScrolling(app, sel) {
  return app.page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return 'not in the page';
    const scrolled = [];
    for (let p = el.parentElement; p; p = p.parentElement) scrolled.push([p, p.scrollTop]);
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    const b = el.getBoundingClientRect();
    const hit = b.width && b.height ? document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) : null;
    for (const [p, top] of scrolled) p.scrollTop = top;
    window.scrollTo(0, 0);
    if (!b.width || !b.height) return `not rendered (${Math.round(b.width)}×${Math.round(b.height)})`;
    if (!hit || !(hit === el || el.contains(hit))) return `covered: a press at its centre lands on ${hit ? `${hit.tagName.toLowerCase()}${hit.id ? `#${hit.id}` : ''}` : 'nothing'}`;
    return null;
  }, sel);
}

