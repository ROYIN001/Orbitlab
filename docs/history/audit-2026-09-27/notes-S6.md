# S6 — Browser harness & CI: บันทึกเซสชัน

สาขา `claude/audit0927-s6-browser-ci` จาก `dba7b0a` (main) · รายการ CI ในแผน PLAN-2026-09-28

## สิ่งที่ทำ

| ส่วน | ไฟล์ | สรุป |
|---|---|---|
| devDependency | `package.json`, `package-lock.json` | `playwright` 1.63.0 (pin แบบ exact) ตาม D1; ไม่มี runtime dependency ใหม่; env `PLAYWRIGHT`/`CHROMIUM` ยังใช้แทนได้ |
| server | `tests/browser/serve.mjs` | `node:http` ล้วน เสิร์ฟ `dist/` ใต้ `/Orbitlab/`; route ที่ไม่มีนามสกุลได้ `index.html` (SPA fallback); ไฟล์ที่มีนามสกุลแต่ไม่มีจริงได้ 404 เพื่อให้ bundle/texture ที่หายล้มเหลวชัด; `Cache-Control: no-cache`; `override(path, body)` เสิร์ฟเนื้อหาอื่นแทนไฟล์โดยไม่เขียนลง `dist/` |
| harness | `tests/browser/harness.mjs` | launch Chromium (ANGLE/SwiftShader), context ใหม่ต่อหน้า พร้อม `navigator.modelContext` + `window.__mcp`, `ready()`, `fail()`/`check()` แบบสะสม, screenshot, preset `desktop` 1280×800 และ `mobile` 390×844, เลือกภาษา (localStorage + locale), touch, `press()` (mouse/touch ที่กึ่งกลางปุ่ม และล้มเหลวถ้ามีสิ่งอื่นบังจุดนั้น) และ `keyOn()` (focus จริงแล้วกดปุ่ม) |
| runner | `tests/browser/run.mjs` | รันทุกไฟล์ใน `journeys/`, `--smoke`, หรือชื่อที่ระบุ; เสิร์ฟ `dist/` เองถ้าไม่ให้ `--base`; timeout ต่อ journey; screenshot ทุกหน้าที่เปิดอยู่เมื่อ journey ล้ม; `::error` ใน GitHub Actions; exit code รวม |
| pwa-offline | `tests/browser/journeys/pwa-offline.mjs` + wrapper `tests/browser/pwa-offline.mjs` | ตรวจเหมือนเดิมทุกข้อ (precache, บินออฟไลน์, update toast) คำสั่งเดิมยังใช้ได้ (`tests/pwa.test.ts` อ้างชื่อไฟล์นี้อยู่); ขั้น "deploy ใหม่" ใช้ `override('sw.js')` แทนการเขียนทับไฟล์ใน dist (หรือ `DIST_SW` เมื่อรันกับ server ภายนอกเหมือนเดิม) |
| smoke journeys | `journeys/watch-controls.mjs`, `mobile-smoke.mjs`, `launch-explore.mjs` | ดูหัวข้อถัดไป |
| npm scripts | `test:browser` (build + ทุก journey), `test:browser:smoke` (ชุด smoke บน build ที่มีอยู่) | |
| CI | `.github/workflows/ci.yml` | job `browser-smoke` บน pull_request: `npm ci` → `npx playwright install --with-deps chromium` → `npm run build` → `npm run test:browser:smoke`; upload `tests/browser/screenshots/` เมื่อล้มเหลว |
| deploy | `.github/workflows/deploy.yml` | หลัง `npm run snapshots`: `vitest run tests/data-provider.test.ts tests/satellite-catalogue.test.ts`; หลัง build: ติดตั้ง Chromium แล้ว `node tests/browser/run.mjs` (ทุก journey บน dist ที่จะ publish จริง ไม่ build ซ้ำ) |
| README | หัวข้อ "Browser tests" ใต้ Quick start | วิธีรันในเครื่อง ตาราง journey และตัวแปร env |

## Journey และสิ่งที่ตรวจ

- **watch-controls** (smoke): 3 รอบ (mouse, keyboard, touch) รอบละหน้าใหม่: เลือกภารกิจจากรายการที่เปิดตอนเข้า → pause → play → 100× → Choose a launch → ภารกิจที่สอง (soyuzT10) ขณะภารกิจแรกบินอยู่ → 100× → รอการ์ดจบ → Another launch. ทุกผลตรวจจาก simulation ผ่าน WebMCP (playing, warp, vehicle, นาฬิกาเดิน/หยุดจริง) และจาก DOM (aria-label, aria-pressed, picker/end card). Keyboard ใช้ Enter บนปุ่มที่ focus, Space บน 100× (ตรวจว่าไม่ไป toggle playback), Space บน body (shortcut), Escape ปิดรายการ
- **mobile-smoke** (smoke): 390×844 + touch; `#/lessons/test` ภาษาไทย และ `#/orbit/engineer` ภาษารัสเซีย: document ไม่เลื่อนแนวนอน (วัด `scrollWidth` และลอง `scrollTo`), ลิงก์ใน `#section-nav`/`#mode-nav` อยู่ในจอทั้งหมด (เพิ่มเพราะ `#app` ตั้ง `overflow: hidden` ของที่ล้นจะถูกตัดหายแทนการล้น document), มี accessible name ที่ Chromium คำนวณเอง (DevTools accessibility tree ผ่าน CDP) เป็นอักษรของภาษานั้น และไม่ซ้ำกันในแถบเดียวกัน รวมลิงก์ที่ซ่อนข้อความ (ไทย 6/7 ลิงก์, รัสเซีย 6/7 ลิงก์ซ่อนข้อความ)
- **launch-explore** (smoke): `configure_mission` Falcon 9 / cape / leo (feasibility ok, อยู่บนแท่น) → `launch_mission` → warp 1000 → `read_flight_state` จน status = orbit, apsides 500 ± 30 km, มี liftoff/meco/stageSep/seco/targetOrbit → บินต่อ 120 s → `export_csv`: ชื่อ `orbitlab_falcon9_leo.csv`, > 1 MB (ได้ ~2.4 MB; audit ได้ 1.31 MB), ทุกแถวมีจำนวนช่องเท่า header, เวลาเพิ่มขึ้นตั้งแต่ countdown ถึงหลัง targetOrbit, แถวสุดท้ายอยู่ที่วงโคจรที่ถึง, event log ครบ
- **pwa-offline** (ชุดเต็ม ไม่อยู่ใน smoke): เหมือนเดิม

## ผลบนเครื่อง (main `dba7b0a` + สาขานี้, container 4 core, ไม่มี GPU)

| journey | ผล | เวลา |
|---|---|---|
| watch-controls | ผ่าน | 137 s |
| mobile-smoke | ผ่าน | 29 s |
| launch-explore | ผ่าน | 109 s |
| pwa-offline (ผ่าน harness ใหม่) | ผ่าน | 64 s |

`npm run test:browser:smoke` (build ใหม่ ไม่มีงานอื่นแย่ง CPU): **3/3 ผ่านใน 276 s** (launch-explore 108.7 s, mobile-smoke 27.9 s, watch-controls 139.3 s). `npm run typecheck` และ `npm test` เขียว (128 ไฟล์, 1 670 tests)

## Sabotage (ทดลองแล้วเอาออก; สคริปต์อยู่ใน tests/probe/ ซึ่งลบแล้ว)

ทุกกรณีฉีดความผิดพลาดเข้าหน้าเว็บด้วย init script หรือครอบผลของ WebMCP โดยไม่แตะไฟล์ journey

| journey | sabotage | ผล |
|---|---|---|
| watch-controls | ปุ่มความเร็วกลืน click (capture listener `stopImmediatePropagation`) | ล้ม 8 ข้อ: 100× ไม่ตั้ง warp ทั้ง mouse, keyboard, touch ทั้งสองเที่ยวบิน; ไม่ถึงการ์ดจบใน 120 s |
| watch-controls | ปุ่ม play กลืน click | ล้ม 6 ข้อ: pause ไม่หยุดทั้ง 3 แบบ (keyboard ยังใช้ space bar ได้ ซึ่งถูกต้อง) |
| watch-controls | ชั้นโปร่งใส `position:fixed` บังครึ่งล่างของจอ | ล้ม 8 ข้อ: mouse/touch "press at its centre lands on div" ทุกปุ่ม; keyboard ผ่าน (ถูกต้อง: ไม่ถูกบัง) |
| mobile-smoke | `#topbar{min-width:480px}` | ล้ม 6 ข้อ: ลิงก์ `#mode-nav` 3 ลิงก์อยู่นอกจอ ทั้งสองหน้า (document ไม่ล้นเพราะ `#app` ตัด overflow จึงเพิ่มการตรวจนี้) |
| mobile-smoke | `body::after` กว้าง 600 px | ล้ม 2 ข้อ: document กว้าง 600 px ใน viewport 390 px ทั้งสองหน้า |
| mobile-smoke | ลบ `title` และ `aria-label` ของลิงก์ (MutationObserver) | ล้ม 16 ข้อ: ลิงก์ที่ซ่อนข้อความไม่มี accessible name และชื่อซ้ำกัน |
| mobile-smoke | ตั้ง `aria-label` เป็นภาษาอังกฤษ | ล้ม 14 ข้อ: ชื่อไม่ใช่อักษรของภาษาหน้า |
| launch-explore | `failureMode: engineOut` ที่ T+20 s | ล้ม 1 ข้อ (feasibility = warn) แต่ Falcon 9 ยังถึงวงโคจร (engine-out capability จริง) จึงลองต่อ ↓ |
| launch-explore | `failureMode: rangeSafety` ที่ T+60 s | ล้ม 2 ข้อ: feasibility และ "did not reach orbit: status failed at T+60 s" |
| launch-explore | ผล `export_csv` ถูกตัดเหลือ 100 kB | ล้ม 2 ข้อ: ขนาด < 1 MB และโครงสร้าง CSV ไม่ครบ (ไม่มีส่วน `# events`) |

หมายเหตุ: รอบแรกของ sabotage mobile-smoke ไม่ล้ม เพราะสคริปต์ทดลองเปลี่ยนแค่ hash (ไม่ reload หน้า init script จึงไม่ทำงาน) และเพราะแอปตั้ง `aria-label` ด้วย JS นอกจาก `title`; แก้ที่สคริปต์ทดลองแล้วได้ผลตามตาราง ไม่ใช่ journey ที่ผิด

## Deploy: เลือกไฟล์ทดสอบที่อ่าน public/data

ดึง snapshot ใหม่จริง (`npm run snapshots` วันที่ 2026-09-28) แล้วรันผู้สมัครทั้ง 6 ไฟล์: ผ่านทั้งหมด (72 tests) จากนั้นตรวจแต่ละไฟล์:

| ไฟล์ | อ่านอะไร | ในเกต deploy | เหตุผล |
|---|---|---|---|
| `tests/data-provider.test.ts` | `space-weather.json` ผ่าน `parseSnapshot` + ขนาดขั้นต่ำ + ลำดับวันที่ | ใช่ | ตรวจ schema และความครบของ space weather โดยตรง |
| `tests/satellite-catalogue.test.ts` | `satellites.json`: ทุกกลุ่ม ไม่ว่าง, asOf, ดาวเทียมไทย 7 ดวง, debris Fengyun-1C, ISS/Thaicom 8/THEOS-2/GPS ด้วย SGP4 ที่ epoch ของแต่ละชุด | ใช่ | ตรวจ schema + ความครบ + ความสมเหตุสมผลทางกายภาพ ไม่ผูกวันที่ |
| `tests/activity.test.ts` | `space-weather.json` | **ไม่** | ผูก `measuredTo` = `'2026-08'`; ทดลองเพิ่มเดือน 2026-09 ใน monthly แล้ว test ล้ม (`expected '2026-09' to be '2026-08'`) จะหยุด deploy ทุกวันเมื่อ SWPC ออกค่าเดือนกันยายน ทั้งที่ข้อมูลถูก |
| `tests/pwa.test.ts` | ไม่อ่านเนื้อหา ตรวจเพียงว่า precache มี `data/space-weather.json` | ไม่ | ไม่ไวต่อเนื้อหา; journey `pwa-offline` ตรวจ precache ของ dist จริงใน deploy อยู่แล้ว |
| `tests/conjunction.test.ts` | `satellites.json` เป็น fixture ของอัลกอริทึม | ไม่ | ใช้ jd0 คงที่ 2026-09-26; เมื่อ snapshot ใหม่ห่างหลายเดือนจะกลายเป็นทดสอบการ propagate ย้อนหลังไกล ไม่ใช่ schema ของข้อมูล เสี่ยงหยุด deploy ด้วยเหตุที่ไม่เกี่ยวกับความถูกต้องของข้อมูล |
| `tests/overflights.test.ts` | `satellites.json` กลุ่ม imaging เป็น fixture | ไม่ | เหตุผลเดียวกัน (jd0 คงที่); schema ของกลุ่ม imaging ถูกตรวจใน satellite-catalogue แล้ว |

ทดลองเกต: ลบ `kp` จาก space weather และลบกลุ่ม `thai` จาก satellites → ทั้งสองไฟล์ล้ม (3 tests + ทั้งไฟล์ satellite-catalogue) แล้ว `git checkout public/data` คืนค่า

## เวลา CI ที่เพิ่มขึ้น

(เติมหลัง CI รอบแรกบน PR)

## บั๊ก/ข้อสังเกตที่ journey พบแต่ไม่ได้แก้ (ห้ามแก้ src ในเซสชันนี้)

ไม่พบบั๊กที่ทำให้ journey smoke ล้มบน main ข้อที่ควรส่งต่อ:

1. **Watch click failure (code-review "Watch click failure") ไม่เกิดซ้ำ**: ปุ่ม play/pause, 100×, Choose a launch, Another launch ตอบสนองทั้ง mouse, keyboard, touch ขณะ simulation เดินใน Chromium headless ทุกรอบที่รัน (รวมรอบ sabotage ที่ไม่ได้แตะปุ่มเหล่านั้น) จึงไม่มีหลักฐานว่าเป็นบั๊กของ source ปัจจุบัน สอดคล้องกับ code-review ที่ให้ตรวจเครื่องมือ/เวอร์ชันที่ deploy ก่อน; journey นี้จะจับได้ถ้าเกิดขึ้นจริงในอนาคต (sabotage ยืนยันแล้ว) ข้อจำกัด: ทดสอบเฉพาะ Chromium
2. **`tests/activity.test.ts` จะล้มเมื่อ commit snapshot เดือนถัดไป** (ไม่ใช่เฉพาะใน deploy): `measuredTo` ผูกกับ `'2026-08'` ของ snapshot ที่ commit ไว้; ใครรัน `npm run snapshots` แล้ว commit หลัง SWPC ออกค่าเดือน 2026-09 จะทำให้ `npm test` แดง ควรให้ test อ่านเดือนสุดท้ายจาก `bundled.monthly` แทนค่าคงที่ (ไฟล์ `tests/*.test.ts` อยู่นอกขอบเขต S6) แล้วจึงเพิ่มเข้าเกต deploy ได้
3. **CSV ที่ export ตอนประกาศ orbit ยังไม่มีแถวของวงโคจรสุดท้าย**: ครั้งหนึ่ง status เป็น `orbit` ที่ T+3274 s แต่แถวสุดท้ายของ CSV อยู่ที่ T+3269.8 s (ก่อน `evt.targetOrbit` ที่ T+3272 s, periapsis ในแถวสุดท้าย 413 km กลาง burn) เพราะ telemetry ทั้งเที่ยวบินสุ่มห่างในช่วง coast/orbit และมาจาก worker เป็นชุด ผู้ใช้ที่กด export ทันทีเมื่อเห็นข้อความถึงวงโคจรจะได้ไฟล์ที่จบก่อนเหตุการณ์นั้น ไม่ร้ายแรง แต่อาจทำให้กราฟ/รายงานไม่แสดงวงโคจรสุดท้าย (ข้อสังเกต ยังไม่ยืนยันว่าเป็นบั๊ก)
4. **ประสิทธิภาพเมื่อไม่มี GPU**: SwiftShader วาดฉากได้ ~1 frame/s ที่ 1280×800 (0.5 s/frame ที่ scale 0.5) แม้หน้า Home ที่ไม่มีเที่ยวบิน เพราะ render loop วาดต่อเนื่อง และ event `load` ของ `#/orbit/engineer` บนมือถือเกิน 30 s หนึ่งครั้ง อุปกรณ์เรียนราคาถูก/ไม่มี GPU น่าจะได้ประสบการณ์คล้ายกัน (ข้อสังเกต ไม่ใช่บั๊กที่ยืนยัน)
5. **แถบแท็บของ Orbit engineer ภาษารัสเซียที่ 390 px** (`.pg-tab` ขวาสุดถึง ~457 px) ล้นในกล่องที่เลื่อนเองได้ ไม่ทำให้ document ล้น ตรงกับรายงานหลัก ("เมนูย่อยบางส่วนเลื่อนแนวนอน") เป็นเรื่องของ S8/S16

## การตัดสินใจภายในขอบเขต

- **Chromium เท่านั้น** ตามคำสั่ง (ไม่ได้เพิ่ม WebKit/Firefox); `mobile-smoke` ใช้ CDP accessibility tree ซึ่งมีเฉพาะ Chromium ถ้าจะเพิ่ม WebKit ต้องเปลี่ยนวิธีอ่าน accessible name
- **deviceScaleFactor 0.5 เป็นค่าเริ่มต้น**: layout CSS, viewport และ hit-testing เท่าเดิม แต่ canvas มีพิกเซล 1/4 เร็วขึ้น ~1.8× (1.0 → 1.8 fps); `BROWSER_SCALE=1` สำหรับภาพคมชัด
- **ธง GL**: `--use-gl=angle --use-angle=swiftshader` บูตเร็วกว่า `--use-gl=swiftshader` เดิม (~15 s เทียบ ~25 s ที่ 1280×800)
- **ชุดเต็มใน deploy รัน `node tests/browser/run.mjs` ไม่ใช่ `npm run test:browser`** เพื่อทดสอบ dist เดียวกับที่ publish ไม่ build ซ้ำ
- `goto` รอ `domcontentloaded` แล้วรอ `#loading.hidden` (event `load` ช้าเกิน 30 s ได้บนหน้า Orbit)

## ตรวจรับ

```bash
npm ci
npx playwright install chromium        # หรือ CHROMIUM=/path/to/chrome
npm run build && npm run test:browser:smoke
node tests/browser/pwa-offline.mjs     # pwa-offline บน harness ใหม่
npm run typecheck && npm test
```
