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
 * - S3 wider than 860 px with the guide closed: the key-events timeline
 *   (#timeline), play/pause and the clock are wholly on the first screen,
 *   inside every box that clips them, and a press at their centre lands on
 *   them — the tools that do not fit go beside or below, reached by scrolling;
 * - S4 otherwise (the stacked layout up to 860 px, or the guide open): the
 *   timeline is reachable — scrolled to, a press at its centre lands on it.
 * - S5 a scene under SHORT_SCENE px tall shows the narration's phase name
 *   only: its prose and latest-event line (which covered half of a 260 px
 *   scene) are not drawn over the picture.

 *
 * The minimum is the proposal on the G2 review page (the owner decides; D-36:
 * "minimum scene height measured at 1100×650 and 1280×720"): 40 % of the
 * window's height, never less than 200 px and never asked to exceed 320 px —
 * the floor the scene already had above 1180 px and on phones. It is the same
 * formula as `--scene-min` in src/style.css.
 */
import { viewportSize } from './harness.mjs';

/** Under this scene height the narration keeps its phase name only (src/main.ts SHORT_SCENE_PX). */
export const SHORT_SCENE = 380;

/** The proposed minimum scene height (CSS px) in a window `h` CSS px high: clamp(200px, 40vh, 320px). */
export function sceneMin(h) {
  return Math.min(320, Math.max(200, 0.4 * h));
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
    return { w: Math.round(b.width), h: Math.round(b.height), visible: Math.round(visible), y: Math.round(b.top), misses, prose };
  });
  t.check(m.h >= min - 0.5, `${where}: the scene is ${m.w}×${m.h}, under the minimum height ${Math.round(min)} px (S1)`);
  t.check(m.visible >= min - 0.5, `${where}: only ${m.visible} px of the scene (y ${m.y}, ${m.h} px tall) is on the first screen, under the minimum ${Math.round(min)} px (S1)`);
  if (m.h < SHORT_SCENE) t.check(m.prose.length === 0, `${where}: the scene is ${m.h} px tall but the narration still draws ${m.prose.join(', ')} over it (S5)`);
  t.check(m.misses.length === 0, `${where}: something covers the scene — a press at ${m.misses.join(', ')} (S2)`);
  const stacked = width <= 860;
  if (!stacked && state === 'closed') {
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

