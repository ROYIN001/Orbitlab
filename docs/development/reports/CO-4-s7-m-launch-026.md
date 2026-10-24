---
package: CO-4
step: s7 (plan step 7)
items: [M-LAUNCH-026]
sources: [R2S:CSS duplication]
priority: P3
change_kind: identical output (quality)
owner_authorization: 'owner, 2026-10-09, K1 decision page 2, card q05 option B: "ทำ 032 และ 026 ใน K1 ส่วนที่เหลือไป K2" (DECISIONS "Decided 2026-10-09"); K1 on K0 verified (owner, 2026-10-05)'
base_sha_verified_on: {sha: 84da81e, date: 2026-10-23, recheck: "the plan's three blocks 7662ead:src/style.css:1084, 1381, 1413 are 84da81e:1103, 1444, 1476; its hide rules 7662ead:1372 and :1412 are :1435 and :1475; the orphan comment 7662ead:src/ui/telemetry.ts:218-224 is still at :218-224"}
branch: claude/happy-hawking-m71bk1-css (a second branch of this session, with the owner's leave in chat on 2026-10-23, because claude/happy-hawking-m71bk1 carries the open #172)
wave_lane: K1 / I
allowed_write_paths: [src/style.css, src/ui/telemetry.ts, changes/claude-happy-hawking-m71bk1-css.md, docs/development/reports/CO-4-s7-m-launch-026.md]
merge: waits for the owner (Merge Desk); an identical-output quality item is not a bug fix, so the standing approval does not cover it
status: In PR; not merged; not published
---

# CO-4 step 7 — one 861–1180 px block for the R2 telemetry rules (M-LAUNCH-026)

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - `src/style.css` มีบล็อก `@media (max-width: 1180px) and (min-width: 861px)` ซ้ำกันสามที่ตามที่แผนระบุ PR นี้ย้ายกฎสองข้อจากบล็อกที่สองและสามไปไว้ในบล็อกแรก แล้วลบสองบล็อกนั้น
> - กฎซ่อนของระดับ Engineer สำหรับ notation และชุดการ์ดรวมเป็นกฎเดียว และย้าย comment ของ notation ใน `telemetry.ts` ไปไว้เหนือฟังก์ชันของมัน (เดิมค้างอยู่เหนือฟังก์ชันอื่น และอ้างไฟล์ผิด)
> - หน้าเว็บไม่เปลี่ยน: ค่า style ที่คำนวณได้และกรอบของทุก element กับภาพของแต่ละหน้าเท่าเดิมที่ 860, 861, 1180, 1181, 1280 และ 390 px ทั้งภาษาอังกฤษและไทย (ผลตรวจอยู่ในหัวข้อ "Evidence")
> - CSS เล็กลง 132 ไบต์ (176,994 → 176,862 B) JavaScript ทุกไฟล์เหมือนเดิมเมื่อไม่นับชื่อไฟล์ที่มี hash
> - เป็นงานคุณภาพที่ผลเหมือนเดิม ไม่ใช่การแก้บั๊ก จึงรอคุณอนุมัติใน Merge Desk

## What changed

The plan (S06 CO-4 step 7, `7662ead:src/style.css:1084, 1381, 1413`) names three copies of the same media query. On `84da81e` they are at lines 1103, 1444 and 1476. The second and third hold one rule each:

```css
@media (max-width: 1180px) and (min-width: 861px) {
  #telemetry > .tel-display { order: 0; }
}
…
@media (max-width: 1180px) and (min-width: 861px) {
  #telemetry > .tel-cards { order: 0; }
}
```

Both rules now sit in the first block, as one rule after the `.events-head` order rule there, and the two blocks are gone:

```css
  #telemetry > .events-head, #telemetry > .events { order: 2; }
  /* R2.1's notation (.tel-display) and R2.3's card presets come first */
  #telemetry > .tel-display, #telemetry > .tel-cards { order: 0; }
```

The Engineer-only hide was split over two rules, one of them shared with the simple-charts hide (`7662ead:1372` and `:1412`). It is now one rule at the first one's place, and the shared rule keeps only its simple-charts half:

```css
body:not([data-mode='engineer']) :is(.tel-display, .tel-cards) { display: none; }
…
#telemetry.simple-charts .tel-cards { display: none; }
```

`src/ui/telemetry.ts`: the U07 notation doc comment sat above `cardsControl()`, stacked on that method's own comment. It moves above `notationControl()`, and "(modes.css)" becomes "(style.css)", where the hide rule is (`modes.css` has no `.tel-display` rule). No code changed.

## Why the cascade cannot change

Moving a rule earlier changes the result only if a rule between the old and new places sets the same property on the same element with the same or a lower specificity.

Line numbers are `84da81e`'s.

| Moved rule | Specificity | From → to | Rules in between that set the property on that element |
|---|---|---|---|
| `#telemetry > .tel-display { order: 0 }` | (1,1,0) | 1445 → after 1109, in the first block | none. The block's own `#telemetry > * { order: 3 }` (1,0,0, line 1106) comes before it and is weaker. Lines 1188–1191 set `order` on `.flight-column`, `#setup` and `#telemetry`, inside `@media (max-width: 860px)` |
| `#telemetry > .tel-cards { order: 0 }` | (1,1,0) | 1477 → after 1109 | none (as above) |
| `body:not([data-mode='engineer']) .tel-cards { display: none }` | (0,2,1); the `:is()` form is also (0,2,1) | 1475 → 1435 | none. `.tel-cards { margin }` (1469) sets no `display`; `#telemetry:not(.simple-charts) .card-off` (1474) matches cards, not the preset box |
| `body:not([data-mode='engineer']) .tel-display { display: none }` | (0,2,1) | stays at 1435, as the `:is()` rule | none |

Rules in the other stylesheets keep their order against `style.css`, because moving a rule inside one file does not change the file order.

A fourth copy of the same media query, `.workspace { grid-template-rows: … }` at line 1164, was added by #101 (G2 hold, `b2215da`) after the plan's base. The plan does not name it, so it stays. It follows the first block directly, so folding it in later would not move it past any rule.

## Evidence

The plan's oracle for this step (S06 CO-4 step 7) is a snapshot of `getComputedStyle` for every element and a pixel hash at 860/861/1180/1181 px in EN and TH, equal before and after, with CSS bytes not growing.

**Builds.** The base build is `11c4a7f`, whose app code is `84da81e`'s: #171 changed only `tests/browser/harness.mjs` and Markdown. The changed build is the same tree with this diff. Every JavaScript file is byte-identical once the content hashes in asset file names are replaced by a placeholder; the CSS file (176,994 → 176,862 B) and `sw.js` (its precache revisions and version) are the only other files that differ.

**Oracle.** A scratch Playwright script (not committed) uses the repository's browser harness and fonts and opens five routes: `#/launch/engineer`, `#/launch/explore`, `#/`, `#/build/watch` and `#/orbit/watch`. Each is read at six sizes (860, 861, 1180, 1181 and 1280 × 800, and 390 × 844) in English and Thai, which makes 60 views.

For every element in each view it records:
- a hash of its computed non-custom properties;
- a separate hash of its custom properties;
- its box, `order` and `display`;
- a SHA-256 of the page screenshot with the WebGL canvas hidden.

Each build was run twice. A field counts as changed only when the two base runs agree, the two changed runs agree, and base and changed differ.

Two run-to-run effects had to be removed first:
- **`--sb-h`.** `main.ts` measures the narration band and publishes its height on `<html>` (`observeSceneBottom`). That height follows the event caption on screen, so it changed with timing (25–133 px in these runs), and every element inherits it. The oracle pins `--sb-h` and `--guide-room` to fixed values while it reads styles, then restores them.
- **Custom-property order.** Chromium lists an element's custom properties in an order that differs between page loads: three orders were seen within one build. A hash built in that order therefore differs between loads with identical values, so it is reported but not used as evidence.

| Measure | Compared | Changed in both pairs | Unstable within one build (set aside) |
|---|---|---|---|
| Computed non-custom style, box, `order`, `display` | 486,600 field comparisons over 60 views | **0** | 40 |
| Screenshot hash | 60 views | 1 (`en #/build/watch` 861 × 800) | 41 |
| Custom-property hash | every element | not used (enumeration order varies) | — |

The one screenshot pair that differed was retaken twice with base and changed builds side by side, once going straight to the route and once in the oracle's route order. Both times the two pictures are pixel-identical (PIL `ImageChops.difference(...).getbbox()` is `None`). The root's custom properties on `#/` were also compared by value at all six sizes: identical. Across views, only `--sb-h` and the width-dependent `--stage-min` change.

## Checks run

The change map (`node scripts/verification/select-checks.mjs origin/main..HEAD`) selects typecheck, build, budget, 60 unit files and 20 journeys, and no heavy or fleet file.

- `npm run typecheck`, `npx vite build` and `node scripts/bundle-budget.mjs`: pass. The budget check reports `index-*.css` 176.9 / 178 kB.
- The 60 selected unit files: 694 tests passed.
- The selected journeys: 19/19 passed (2,575.8 s, local Chromium with the CI fonts). `case-worksheet-exports` has been held since #156 (teaching tools held back) and did not run.
- CI's plan-step checks: `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` and `npx vitest run tests/repo-hygiene.test.ts` pass on the commit.

## For the owner

This is an identical-output quality item (P3). The standing approval covers bug fixes and records only, so the PR waits for your approval on the Merge Desk. It is also the named offset of the q03 B CSS allowance (`budgets.json` `_notes`); with it merged the CSS is 176.9 kB against the 178 kB ceiling, and the GK1 lowering would set 177.

## Appendix: the oracle scripts

Run from any directory with `FONTCONFIG_FILE` pointing at the CI fonts: `node oracle2.mjs <dist> <label> <outdir>` twice per build, then `node compare2.mjs base1.json base2.json change1.json change2.json`. They import `tests/browser/harness.mjs` and `tests/browser/serve.mjs` from the checkout named in `ROOT`.

<details><summary><code>oracle2.mjs</code></summary>

```js
// M-LAUNCH-026 oracle (S06 CO-4 step 7): every element's computed style (custom properties
// hashed apart) and box, and a picture of the page with the WebGL canvas hidden, at
// 860/861/1180/1181 px (and 390, 1280) in EN and TH, on five routes, for a dist.
// The measured --sb-h and --guide-room are pinned while styles are read. Writes one JSON per run.
//
// usage: node oracle2.mjs <dist dir> <label> <out dir>
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const [DIST, LABEL, OUT] = process.argv.slice(2);
const ROOT = '/path/to/Orbitlab';
const H = await import(pathToFileURL(join(ROOT, 'tests/browser/harness.mjs')).href);
const { serve } = await import(pathToFileURL(join(ROOT, 'tests/browser/serve.mjs')).href);
const ROUTES = ['#/launch/engineer', '#/launch/explore', '#/', '#/build/watch', '#/orbit/watch'];
const SIZES = [[860, 800], [861, 800], [1180, 800], [1181, 800], [1280, 800], [390, 844]];
const LANGS = ['en', 'th'];

const server = await serve({ root: DIST });
const browser = await H.launchBrowser();
const t = H.createJourney({ name: `oracle-${LABEL}`, browser, base: server.url });
const frames = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
const result = {};
try {
  for (const lang of LANGS) for (const route of ROUTES) {
    const app = await t.open({ hash: route, viewport: 'desktop', lang });
    const { page } = app;
    await page.waitForTimeout(1500);
    for (const [width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      await frames(page); await page.waitForTimeout(400); await frames(page);
      await page.evaluate(() => window.__holdFrames?.(true));
      const snap = await page.evaluate(() => {
        // The app measures --sb-h (the narration band's height, which follows the event callout on screen)
        // and --guide-room at run time. Pin both while reading so a callout's length is not read as a style change.
        const root = document.documentElement, guide = document.querySelector('[style*="--guide-room"]');
        const keep = { sb: root.style.getPropertyValue('--sb-h'), gr: guide ? guide.style.getPropertyValue('--guide-room') : null };
        root.style.setProperty('--sb-h', '120px'); if (guide) guide.style.setProperty('--guide-room', '200px');
        const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
        const key = (el) => { const p = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { let i = 0; for (let s = e; (s = s.previousElementSibling);) i++; p.unshift(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}:${i}`); } return p.join('>'); };
        const out = {};
        for (const el of document.querySelectorAll('*')) {
          const cs = getComputedStyle(el);
          let s = '', c = '';
          for (let i = 0; i < cs.length; i++) { const n = cs[i]; if (n.startsWith('--')) c += `${n}:${cs.getPropertyValue(n)};`; else s += `${n}:${cs.getPropertyValue(n)};`; }
          const r = el.getBoundingClientRect();
          out[key(el)] = { style: fnv(s), custom: fnv(c), box: [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 100) / 100).join(','), order: cs.order, display: cs.display };
        }
        root.style.setProperty('--sb-h', keep.sb); if (guide) guide.style.setProperty('--guide-room', keep.gr);
        return { out, measured: keep };
      });
      await page.addStyleTag({ content: '#gl, canvas { visibility: hidden !important; }' }).catch(() => {});
      const png = await page.screenshot({ animations: 'disabled', timeout: 120000 });
      await page.evaluate(() => { const s = [...document.querySelectorAll('style')].pop(); if (s && s.textContent.includes('#gl, canvas')) s.remove(); });
      await page.evaluate(() => window.__holdFrames?.(false));
      result[`${lang} ${route} ${width}x${height}`] = { snap: snap.out, measured: snap.measured, png: createHash('sha256').update(png).digest('hex') };
      console.log(`${LABEL} ${lang} ${route} ${width}x${height}: ${Object.keys(snap.out).length} elements, --sb-h ${snap.measured.sb}`);
    }
    await app.context.close();
  }
} finally {
  await browser.close();
  await server.close();
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, `${LABEL}.json`), JSON.stringify(result));
console.log(`wrote ${join(OUT, `${LABEL}.json`)}`);
```

</details>

<details><summary><code>compare2.mjs</code></summary>

```js
// compare2.mjs <base1> <base2> <change1> <change2>: a field differs for real when both base runs agree,
// both change runs agree, and base != change. Fields: style (non-custom properties), box, order, display;
// custom properties and pictures reported apart.
import { readFileSync } from 'node:fs';
const [B1, B2, C1, C2] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')));
const F = ['style', 'box', 'order', 'display'];
let views = 0, cmp = 0, real = 0, unstable = 0, customReal = 0, pngReal = 0, pngUnstable = 0, missing = 0;
const shown = [];
for (const view of Object.keys(B1)) {
  views++;
  const b1 = B1[view], b2 = B2[view], c1 = C1[view], c2 = C2[view];
  if (!b2 || !c1 || !c2) { missing++; shown.push(`missing view ${view}`); continue; }
  const keys = new Set([...Object.keys(b1.snap), ...Object.keys(b2.snap), ...Object.keys(c1.snap), ...Object.keys(c2.snap)]);
  for (const k of keys) {
    for (const f of [...F, 'custom']) {
      const v = [b1, b2, c1, c2].map((r) => (r.snap[k] ? r.snap[k][f] : '<absent>'));
      if (f !== 'custom') cmp++;
      if (v[0] === v[2] && v[1] === v[3] && v[0] === v[1]) continue;
      const stable = v[0] === v[1] && v[2] === v[3];
      if (!stable) { if (f !== 'custom') unstable++; continue; }
      if (f === 'custom') { customReal++; continue; }
      real++;
      if (shown.length < 40) shown.push(`${view} | ${k} | ${f}: base ${v[0]} change ${v[2]}`);
    }
  }
  const p = [b1.png, b2.png, c1.png, c2.png];
  if (!(p[0] === p[2] && p[1] === p[3] && p[0] === p[1])) { if (p[0] === p[1] && p[2] === p[3]) { pngReal++; shown.push(`PNG differs: ${view}`); } else pngUnstable++; }
}
console.log(shown.join('\n'));
console.log(`views ${views} (missing ${missing}); field comparisons ${cmp}: ${real} differ in both pairs, ${unstable} unstable within a build (set aside); custom-property hashes differing stably: ${customReal}; pictures: ${pngReal} differ stably, ${pngUnstable} unstable`);
```

</details>
