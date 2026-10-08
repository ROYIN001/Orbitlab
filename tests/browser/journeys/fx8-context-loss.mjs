/**
 * FX-8 (M-PLAN-019, KPI-15): the GPU context is lost mid-flight and comes
 * back. `WEBGL_lose_context` drops the context of the Launch flight (Explore),
 * of the Orbit section's 3-D view and of the Home page's globe, then restores
 * it. While it is lost the loss is accepted (`preventDefault`, so the browser
 * may hand it back), a short status line says so, the mission clock and the
 * recording run on; after the restore every view draws again — the same
 * picture it drew before, not a blank or black canvas — with no WebGL errors,
 * and the flight's recording is byte for byte the recording of a flight that
 * lost nothing.
 */
export const timeoutMs = 600_000;

// A fixed launch epoch: the setup's default is the next five minutes of the
// wall clock, and two flights a minute apart could straddle one.
const MISSION = { vehicleId: 'falcon9', siteId: 'cape', orbitId: 'leo', launchTimeIso: '2026-09-20T12:00:00Z' };
const WARP = 10;
/**
 * The flight loses its context here, s after liftoff: the camera is more than
 * 30 km from the pad, so the shadow map is no longer drawn every frame
 * (`setShadowFocus`) and has to be primed again after a restore; and the
 * restore falls in the fastest change of the ascent's picture: at T+135 s the
 * dynamic pressure drops under 500 Pa, the load relief lets go, and the stack
 * pitches over from 20° to 6° above the horizon in 4 s. Both flights are
 * compared up to COMPARE_TO_S.
 */
const LOSE_AT_S = 133;
/**
 * At warp 10 the flight runs on past the poll that sees a time (each frame asks
 * the worker for up to 5 s, and two asks may still be out): the last LEAD_S
 * before LOSE_AT_S are flown at warp 1, so the loss lands within a frame of it.
 */
const LEAD_S = 25;
const COMPARE_TO_S = 160;
/** how long a context stays lost, ms of wall time */
const LOST_MS = 4000;

export default async function contextLoss(t) {
  const reference = await referenceFlight(t);
  await launch(t, reference);
  await orbit(t);
  await home(t);
}

/** In the page: the renderer of a view, and a coarse look at what its canvas shows. */
function helpers() {
  window.__fx8 = {
    renderer: (which) => which === 'launch' ? window.orbitlab.scene.renderer
      : which === 'orbit' ? window.orbitlab.playground.orbitView?.renderer
        : window.orbitlab.homeStage.globe?.view.renderer,
    /** after two animation frames: the canvas at 24 × 16, its mean and spread of luminance and its darkest tenth */
    async look(which) {
      for (let i = 0; i < 2; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
      const canvas = window.__fx8.renderer(which).domElement;
      const c = document.createElement('canvas');
      c.width = 24; c.height = 16;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(canvas, 0, 0, c.width, c.height);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const lum = [];
      for (let k = 0; k < d.length; k += 4) lum.push(0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2]);
      const mean = lum.reduce((a, b) => a + b, 0) / lum.length;
      const spread = Math.sqrt(lum.reduce((a, b) => a + (b - mean) ** 2, 0) / lum.length);
      const dark = [...lum].sort((a, b) => a - b)[lum.length / 10 | 0];
      // the flight time of the frame on the canvas, for the Launch flight
      return { mean, spread, dark, pixels: lum.map((v) => Math.round(v)), t: window.orbitlab.shown?.t ?? null };
    },
    lose(which) {
      const r = window.__fx8.renderer(which);
      const canvas = r.domElement;
      const s = window.__fx8.state = { lost: false, prevented: null, restored: false };
      // after the app's own listeners: whether one of them accepted the loss
      canvas.addEventListener('webglcontextlost', (e) => { s.lost = true; s.prevented = e.defaultPrevented; }, { once: true });
      canvas.addEventListener('webglcontextrestored', () => { s.restored = true; }, { once: true });
      window.__fx8.ext = r.getContext().getExtension('WEBGL_lose_context');
      if (!window.__fx8.ext) return false;
      window.__fx8.ext.loseContext();
      return true;
    },
    restore() { window.__fx8.ext.restoreContext(); },
    frame: (which) => window.__fx8.renderer(which).info.render.frame,
    status() {
      const el = document.querySelector('[role="status"].gl-lost');
      return el && !el.hidden && el.getClientRects().length > 0 ? el.textContent : null;
    },
  };
}

/** Lose the view's context, run `during` while it is lost, restore it, and check it draws as before. */
async function loseAndRestore(t, app, which, during, { still, go } = {}) {
  const { page } = app;
  const warnings = app.glWarnings;
  // the pictures are taken with the flight paused (`still`), and of one flight time, so they do not drift apart
  await still?.();
  const before = await page.evaluate((w) => window.__fx8.look(w), which);
  if (which === 'launch') await page.evaluate(() => { window.__fx8.env = window.orbitlab.scene.envRT; });
  await go?.();
  t.check(before.spread > 2, `${which}: the view was blank before the loss (${JSON.stringify({ mean: before.mean, spread: before.spread })})`);
  if (!t.check(await page.evaluate((w) => window.__fx8.lose(w), which), `${which}: no WEBGL_lose_context`)) return false;
  const lost = await t.until(() => page.evaluate(() => window.__fx8.state.lost), { timeoutMs: 10_000 });
  if (!t.check(lost, `${which}: the context was not lost`)) return false;
  // from the loss on: every WebGL error of the restore and of the frames after it counts
  warnings.length = 0;
  // A regression guard: three's own listener calls preventDefault as well, so
  // this fails only if both stop accepting the loss.
  t.check(await page.evaluate(() => window.__fx8.state.prevented), `${which}: the context loss was not accepted (no preventDefault): the browser will not restore it`);
  const notice = await t.until(() => page.evaluate(() => window.__fx8.status()), { timeoutMs: 5000 });
  t.check(notice, `${which}: no status line while the 3-D view is lost`);
  if (notice) t.log(`${which}: status while lost: "${notice}"`);
  await during?.();
  await page.evaluate(() => window.__fx8.restore());
  const restored = await t.until(() => page.evaluate(() => window.__fx8.state.restored), { timeoutMs: 20_000 });
  if (!t.check(restored, `${which}: the context was not restored`)) return false;
  const firstFrame = await page.evaluate((w) => window.__fx8.frame(w), which);
  const drawing = await t.until(async () => (await page.evaluate((w) => window.__fx8.frame(w), which)) > firstFrame + 2, { timeoutMs: 30_000, intervalMs: 250 });
  t.check(drawing, `${which}: the renderer does not draw after the restore`);
  t.check(await t.until(async () => !(await page.evaluate(() => window.__fx8.status())), { timeoutMs: 10_000 }), `${which}: the status line stays after the restore`);
  // a few frames for the scene to settle (the sky tables, the environment probe, the shadow map)
  await page.waitForTimeout(1500);
  await still?.(before.t);
  const after = await page.evaluate((w) => window.__fx8.look(w), which);
  if (still) {
    t.log(`${which}: pictures at T+${before.t?.toFixed(2)} and T+${after.t?.toFixed(2)} s`);
    t.check(before.t !== null && Math.abs(after.t - before.t) < 0.01, `${which}: the two pictures show different moments of the flight (T+${before.t} and T+${after.t} s)`);
  }
  // the probe is drawn once per sky, not every frame: it has to be drawn again into the new context
  if (which === 'launch') {
    t.check(await page.evaluate(() => window.orbitlab.scene.envRT !== window.__fx8.env), 'launch: the environment probe was not rebuilt after the restore');
    // the shadow map, sampled whether or not it is drawn each frame (`shadowOn`), has a texture in the new context
    const shadow = await page.evaluate(() => {
      const s = window.orbitlab.scene, map = s.sun.shadow.map;
      return { drawnEachFrame: s.shadowOn, primed: !map || !!s.renderer.properties.get(map.texture).__webglTexture };
    });
    t.log(`launch: shadow map drawn each frame: ${shadow.drawnEachFrame}`);
    t.check(shadow.primed, 'launch: the shadow map was not drawn into the restored context');
  }
  await go?.();
  t.log(`${which}: luminance before ${before.mean.toFixed(1)} ± ${before.spread.toFixed(1)}, after ${after.mean.toFixed(1)} ± ${after.spread.toFixed(1)}`);
  t.check(after.spread > 2, `${which}: the view is blank after the restore (mean ${after.mean.toFixed(1)}, spread ${after.spread.toFixed(1)})`);
  // the same picture, give or take how far it moved: a lost table or probe is far darker
  const ratio = (after.mean + 1) / (before.mean + 1);
  t.check(ratio > 0.85 && ratio < 1.2, `${which}: the restored picture is not the one drawn before (mean luminance ${before.mean.toFixed(1)} → ${after.mean.toFixed(1)})`);
  // three pixels in four barely changed: a part of the picture gone dark shows here
  const deltas = before.pixels.map((v, k) => Math.abs(v - after.pixels[k])).sort((a, b) => a - b);
  const p75 = deltas[deltas.length * 3 >> 2];
  t.log(`${which}: pixel change median ${deltas[deltas.length >> 1]}, 75th percentile ${p75}, 90th ${deltas[deltas.length * 9 / 10 | 0]}`);
  t.check(p75 < 12, `${which}: the restored picture differs from the one before (75th percentile pixel change ${p75} of 255)`);
  // the orbit views' space is their own clear colour, not black
  if (which !== 'launch') t.check(Math.abs(after.dark - before.dark) < 2, `${which}: the background changed after the restore (luminance ${before.dark.toFixed(1)} → ${after.dark.toFixed(1)})`);
  t.check(warnings.length === 0, `${which}: WebGL errors after the restore: ${[...new Set(warnings)].slice(0, 3).join(' | ')}`);
  return true;
}

async function openApp(t, hash, contextOptions = {}) {
  const app = await t.open({ hash, contextOptions });
  app.glWarnings = [];
  app.page.on('console', (m) => {
    const text = m.text();
    // Harmless, and the only error a restore may raise: a target made in the
    // lost context (the old environment probe) is disposed after the restore,
    // and three asks the new context to delete the old context's texture.
    if (text === 'WebGL: INVALID_OPERATION: delete: object does not belong to this context') return;
    if (/GL_INVALID|WebGL: INVALID|GL ERROR/i.test(text)) app.glWarnings.push(text);
  });
  await app.page.evaluate(helpers);
  return app;
}

const state = (app) => app.mcp('read_flight_state');

/** Fly the mission to T+COMPARE_TO_S, pause, and hand back its CSV. */
async function flyTo(t, app, label, midway) {
  const launched = await app.mcp('launch_mission', MISSION);
  if (!t.check(launched.ok && launched.playing, `${label}: launch_mission: ${JSON.stringify(launched).slice(0, 200)}`)) return null;
  await app.mcp('control_playback', { action: 'warp', warp: WARP });
  if (midway) {
    if (!t.check(await t.until(async () => (await state(app)).cursorTimeS > LOSE_AT_S - LEAD_S, { timeoutMs: 180_000, intervalMs: 500 }),
      `${label}: the flight did not reach T+${LOSE_AT_S - LEAD_S} s`)) return null;
    // real time to the loss and through it
    await app.mcp('control_playback', { action: 'warp', warp: 1 });
    if (!t.check(await t.until(async () => (await state(app)).cursorTimeS >= LOSE_AT_S, { timeoutMs: 60_000, intervalMs: 100 }),
      `${label}: the flight did not reach T+${LOSE_AT_S} s`)) return null;
    await midway();
    await app.mcp('control_playback', { action: 'warp', warp: WARP });
  }
  if (!t.check(await t.until(async () => (await state(app)).headTimeS > COMPARE_TO_S + 5, { timeoutMs: 240_000, intervalMs: 500 }),
    `${label}: the flight did not reach T+${COMPARE_TO_S} s`)) return null;
  await app.mcp('control_playback', { action: 'pause' });
  const csv = await app.mcp('export_csv');
  if (!t.check(csv.ok, `${label}: export_csv: ${JSON.stringify(csv).slice(0, 200)}`)) return null;
  return csv.csv;
}

/** The recording up to T+COMPARE_TO_S: the telemetry rows and the events. */
function upTo(csv) {
  const lines = csv.split('\n');
  const blank = lines.indexOf('');
  const within = (line) => Number(line.split(',')[0]) <= COMPARE_TO_S;
  return {
    telemetry: [lines[0], ...lines.slice(1, blank).filter(within)].join('\n'),
    events: lines.slice(blank + 3).filter(within).join('\n'),
  };
}

async function referenceFlight(t) {
  const app = await openApp(t, '#/launch/explore');
  const csv = await flyTo(t, app, 'reference flight');
  app.checkErrors();
  await app.context.close();
  return csv;
}

async function launch(t, reference) {
  const app = await openApp(t, '#/launch/explore');
  const { page } = app;
  const csv = await flyTo(t, app, 'Launch', async () => {
    // The flight plays on through the loss (its clock and its recording must
    // run on), and the picture changes as it flies: from T+135 s, where the
    // dynamic pressure drops under 500 Pa and the load relief lets go, the
    // stack pitches over from 20° to 6° above the horizon in 4 s. So the after
    // picture is taken back at the before picture's flight time, from the
    // recording, by the restored context.
    const still = async (at) => {
      await app.mcp('control_playback', { action: 'pause' });
      if (at != null) await app.mcp('seek', { timeS: at });
      await page.waitForTimeout(1500);
    };
    // back to the head (if the picture was taken behind it) and on
    const go = async () => {
      await app.mcp('control_playback', { action: 'live' });
      await app.mcp('control_playback', { action: 'play' });
    };
    await loseAndRestore(t, app, 'launch', async () => {
      const a = await state(app);
      await page.waitForTimeout(LOST_MS);
      const b = await state(app);
      t.log(`launch: while lost, T+${a.cursorTimeS.toFixed(1)} → T+${b.cursorTimeS.toFixed(1)} s, recorded to T+${a.headTimeS.toFixed(1)} → T+${b.headTimeS.toFixed(1)} s`);
      t.check(b.playing && b.cursorTimeS > a.cursorTimeS + 1, `launch: the mission clock stopped while the context was lost (T+${a.cursorTimeS} → T+${b.cursorTimeS} s)`);
      t.check(b.headTimeS > a.headTimeS + 1, `launch: the recording stopped while the context was lost (T+${a.headTimeS} → T+${b.headTimeS} s)`);
    }, { still, go });
  });
  if (csv && reference) {
    const lost = upTo(csv), kept = upTo(reference);
    const rows = lost.telemetry.split('\n').length - 1;
    t.log(`launch: ${rows} telemetry rows to T+${COMPARE_TO_S} s compared with the reference flight`);
    t.check(rows > 50, `launch: only ${rows} telemetry rows to compare`);
    const a = lost.telemetry.split('\n'), b = kept.telemetry.split('\n');
    const k = a.findIndex((line, i) => line !== b[i]);
    t.check(lost.telemetry === kept.telemetry, `launch: the recording differs from the flight that lost no context (${a.length} and ${b.length} lines; first at line ${k + 1}:\n${a[k]?.slice(0, 160)}\n${b[k]?.slice(0, 160)})`);
    t.check(lost.events === kept.events, `launch: the events differ from the flight that lost no context:\n${lost.events}\n---\n${kept.events}`);
  }
  app.checkErrors();
  await app.context.close();
}

async function orbit(t) {
  const app = await openApp(t, '#/orbit/explore');
  const { page } = app;
  await page.locator('.pg-canvas-3d').first().waitFor({ state: 'visible', timeout: 60_000 });
  if (!t.check(await t.until(() => page.evaluate(() => (window.__fx8.renderer('orbit')?.info.render.frame ?? 0) > 3), { timeoutMs: 60_000 }),
    'orbit: the 3-D view does not draw')) return;
  await loseAndRestore(t, app, 'orbit', async () => {
    const a = await page.evaluate(() => window.orbitlab.playground.time);
    await page.waitForTimeout(LOST_MS);
    const b = await page.evaluate(() => window.orbitlab.playground.time);
    t.check(b > a, `orbit: the orbit's clock stopped while the context was lost (${a} → ${b} s)`);
  });
  app.checkErrors();
  await app.context.close();
}

async function home(t) {
  // with less motion asked for, the globe's camera stands still and its Earth turns at its own pace
  const app = await openApp(t, '#/home', { reducedMotion: 'reduce' });
  const { page } = app;
  // the Launch scene behind the top of the page
  await page.waitForTimeout(1500);
  await loseAndRestore(t, app, 'launch', () => page.waitForTimeout(LOST_MS));
  // the globe at the page's end
  await page.evaluate(() => { const s = document.querySelector('.home-scroll'); s.scrollTop = s.scrollHeight; });
  if (!t.check(await t.until(() => page.evaluate(() => (window.__fx8.renderer('home')?.info.render.frame ?? 0) > 3), { timeoutMs: 60_000 }),
    'home: the globe does not draw')) return;
  await page.waitForTimeout(3000);
  await loseAndRestore(t, app, 'home', async () => {
    const a = await page.evaluate(() => window.orbitlab.homeStage.globe.jd);
    await page.waitForTimeout(LOST_MS);
    const b = await page.evaluate(() => window.orbitlab.homeStage.globe.jd);
    t.check(b > a, `home: the globe's clock stopped while the context was lost (${a} → ${b})`);
  });
  app.checkErrors();
  await app.context.close();
}
