# S7 — Engineer tools robustness: บันทึกเซสชัน

สาขา `claude/audit0927-s7-engineer-workers` จาก `origin/main` ที่ `9124682` · รายการ A17, A18 ในแผน PLAN-2026-09-28

ไม่แตะ `src/physics/rigid/tuning.ts`, `src/physics/autotune.ts` หรือฟิสิกส์ส่วนอื่น เที่ยวบิน built-in และผล Monte Carlo ใน `tests/heavy` จึงไม่เปลี่ยน ไม่ได้แก้ `src/main.ts`, `src/ui/monte-carlo.ts`, `src/ui/panel.ts`

## สิ่งที่ทำ

| รายการ | ไฟล์ | สรุป |
|---|---|---|
| A17 | ใหม่ `src/physics/attitude-tune-job.ts` | `runAttitudeTuneJob` ทำตามแบบ `tune-job.ts`: ปล่อย worker ทุกทางที่งานจบ (ผลลัพธ์ error ถอดข้อความไม่ได้ post ไม่ได้ ยกเลิก) และ AbortSignal สั่ง terminate · `AttitudeTuneRunner`: run id ให้เฉพาะ run ล่าสุดรายงาน และรายงานครั้งเดียว, `cancel()`, `invalidate(inputs)` และตรวจ signature ของ inputs อีกครั้งตอนผลมาถึง ถ้าเปลี่ยนแล้วจะทิ้งผลเป็น `stale` · `solveAttitudeTune` คือเนื้องานของ worker ย้ายมาไว้ที่นี่เพื่อทดสอบใน Node ได้ |
| A17 | ใหม่ `src/physics/attitude-tune.worker.ts` | เรียก `autoTune(cases, T, targets, ff, verify)` เหมือนเดิมทุกตัวอักษร ส่ง progress ก่อนเริ่มค้นหา (จำนวน model ที่ค้นหาและที่ใช้ตรวจ) |
| A17 | `src/ui/loop-tuning.ts` | ส่งงานให้ runner แทนการเรียก `autoTune` ใน `setTimeout` · มีบรรทัดความคืบหน้า (model ที่ค้นหา, model ที่ตรวจ, วินาทีที่ผ่านไป) เขียนลง `.lt-result` โดยตรงทุกวินาที ไม่ render แผงใหม่ทั้งแผง · ปุ่ม Cancel แสดงเฉพาะตอนกำลังค้นหา · `aria-live="polite"` บนบรรทัดผล · signature ของ inputs = channel, scope, เป้าหมาย PM/GM, feed-forward ทดลอง (หรือ "flown"), และค่าของ sample แรกของเที่ยวบิน |
| A17 | `src/i18n/{en,ru,th}.ts` | `tune.cancel`, `tune.progress`, `tune.cancelled`, `tune.stale`, `tune.error` |
| A17 | `tests/browser/journeys/pwa-offline.mjs` | เพิ่มหนึ่งบรรทัด: ตรวจว่า `attitude-tune.worker-*.js` อยู่ใน precache |
| A18 | `src/physics/monte-carlo-job.ts` | ดูหัวข้อ A18 |
| A18 | `src/i18n/{en,ru,th}.ts` | `mc.state.failed`, `mc.progress.failed` (หน้าต่าง Monte Carlo สร้าง key จากชื่อ state อยู่แล้ว จึงไม่ต้องแก้ `src/ui/monte-carlo.ts`) |
| test | `tests/tune-job.test.ts` | +11 test สำหรับ job และ runner ด้วย worker ปลอม และหนึ่ง test ที่ยืนยันว่าผ่าน structured clone แล้วคำตอบเท่ากับการเรียกบน main thread |
| test | `tests/monte-carlo.test.ts` | +5 test (A18) ทั้ง 5 ล้มบนโค้ดเดิม ผ่านบนโค้ดใหม่ |

## A17 — การตัดสินใจ

- **แหล่งของ progress.** `autoTune` ใน `rigid/tuning.ts` ไม่มี callback ภายใน และการเพิ่ม callback แปลว่าต้องแก้ไฟล์อัลกอริทึม worker จึงส่ง progress ได้ครั้งเดียวตอนเริ่ม (จำนวน model) ส่วน UI นับวินาทีเอง ถ้าต้องการเปอร์เซ็นต์จริง ต้องเพิ่ม `onProgress?` แบบ optional ให้ `autoTune`/`searchGains` (รอบของ grid และรอบ verify) ซึ่งไม่เปลี่ยนผลลัพธ์ แต่อยู่นอกไฟล์ที่เซสชันนี้เป็นเจ้าของ
- **identity ของ plane หลัง clone.** `autoTune` ข้าม case ที่อยู่ในชุดค้นหาแล้วโดยเทียบ `x.plane === c.plane` คำขอจึงส่งเป็น message เดียว (`cases` และ `verify` อยู่ใน object เดียวกัน) structured clone จะคงการอ้างอิงร่วมไว้ มี test ยืนยัน
- **ระบุเที่ยวบินด้วยค่า ไม่ใช่ identity.** เมื่อฟิสิกส์รันใน worker และ telemetry ถูก thin, mirror จะรับ sample ชุดใหม่ (reset) เป็น object ใหม่ แต่ sample แรกยังอยู่เสมอ (`simulation.ts` เก็บ index คู่ ซึ่งรวม 0) จึงใช้ `[t, mass, lat, lon, alt]` ของ sample แรก ถ้าบินภารกิจเดิมซ้ำแบบ deterministic ค่าจะเหมือนกัน แต่คำตอบก็จะเหมือนกันด้วย จึงไม่เป็นปัญหา
- **feed-forward ใน signature.** ถ้าไม่ได้ตั้งค่าทดลอง ใช้คำว่า `'flown'` แทนค่าที่อ่านจาก model ที่ cursor เพราะหลังจากไม่มีการ linearise แล้ว 30 วินาที model ที่ cursor จะหายไป และจะทำให้ run ที่ยังใช้ได้ถูกทิ้งผิด ๆ
- **ไม่ถือว่าการเลื่อน slider เกนเป็น input.** เกนไม่ได้เป็น argument ของการค้นหา และผลลัพธ์ตั้งใจเขียนทับเกนทดลองอยู่แล้ว (เหมือนเดิม)
- **เวลาที่ตรวจจับ stale.** ตรวจใน `renderTuning` (ทุก refresh ของ inspector) และตรวจอีกครั้งตอนผลมาถึง การปิด inspector หรือเปลี่ยนแท็บไม่ยกเลิกงาน ผลจะแสดงเมื่อกลับมา

## A17 — ผลในเบราว์เซอร์

Probe ชั่วคราวใน `tests/probe/` (ลบแล้ว): Chromium 1194 (`CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`) บน `dist/` · `#/launch/engineer` · Falcon 9 / cape / leo, six-DOF, crosswind, flex slosh + bending + notch · warp 100 จนถึง T+140 s แล้ว pause · เปิด inspector แท็บ Tuning (pitch, ทั้งเที่ยวบิน) · กด Auto-tune · วัด PerformanceObserver `longtask` และช่องว่างของ `setInterval(20 ms)`

| build | เวลาค้นหา | long task ที่ยาวสุดบน main thread | ช่องว่าง timer 20 ms ที่ยาวสุด | ข้อความระหว่างค้นหา |
|---|---|---|---|---|
| `origin/main` (ก่อนแก้, T+144 s, verify 586 model) | 4.5 s | **3101 ms** | 3131 ms | "Searching…" อย่างเดียว |
| สาขานี้ (T+140 s, verify 572 model) | 4.6 s ใน worker | **69 ms** | 128 ms | "Searching over 16 models, then checking the answer on 572… 0–3 s" |

- ยกเลิก: กด Auto-tune แล้วกด Cancel หลัง 0.5 s: ข้อความ "Auto-tune cancelled…", ปุ่ม Auto-tune กดได้อีก, ปุ่ม Cancel ซ่อน
- stale: กด Auto-tune แล้วเปลี่ยนแกนเป็น roll ระหว่างค้นหา: "Auto-tune stopped: the axis, span, targets, feed-forward or flight changed…"
- ไม่มี page error · `vite build` emit `attitude-tune.worker-*.js` และอยู่ใน `sw.js`

## A18 — กติกาใหม่ของ `MonteCarloJob`

- **ตอนสร้าง (constructor).** ถ้า `createWorker` หรือ `postMessage` ของ run แรก throw: terminate ทุก worker ที่สร้างแล้ว ล้าง `onmessage`/`onerror`, ล้าง run ที่กำลังบิน, ตั้ง `state = 'failed'` และ `error` แล้ว throw error เดิมครั้งเดียว ไม่เรียก `onChange` (UI ไม่ได้ job นี้อยู่แล้ว) หน้าต่าง Monte Carlo จับ error นี้และแสดงข้อความอยู่แล้ว (`monte-carlo.ts` 293-298)
- **worker ตายและสร้างตัวแทนไม่ได้.** run ที่ worker นั้นบินอยู่บันทึกเป็น `lost` (เหมือนเดิม) และบินต่อด้วย worker ที่เหลือ ถ้าเป็นตัวสุดท้ายและยังมี run ค้าง ชุดจบเป็น `failed` พร้อม `onChange` ครั้งเดียว หลังจากนั้นไม่มี callback อีก
- **post run ถัดไปไม่ได้ (หลังเริ่มแล้ว).** run นั้นเป็น `lost` และ worker นั้นถูกปลด (run ถัดไปก็จะ post ไม่ได้เช่นกัน) ใช้กติกาตัวสุดท้ายเดียวกัน
- **แก้เพิ่มเล็กน้อย.** ถ้า pool แบบ synchronous บินจบชุดไปแล้วระหว่าง constructor, loop จะหยุดสร้าง worker (เดิมจะสร้าง worker หลัง `finish()` แล้วไม่มีใคร terminate)
- `MonteCarloState` มี `'failed'` เพิ่ม: WebMCP `run_monte_carlo`/สถานะจะคืน `state: 'failed'` ได้ ป้ายสถานะใน CSS ยังไม่มีสีเฉพาะสำหรับ `failed` (`src/ui/monte-carlo.css` มีแค่ running/done) จึงแสดงสีปกติเหมือน stopped

## ตรวจแล้ว

- `npm run typecheck` ผ่าน
- `npm test` (ทั้งชุด ไม่แบ่ง shard, container 4 core, 2472 s): 181/182 ไฟล์ผ่านในรอบแรก ล้มหนึ่งข้อคือ `tests/i18n.test.ts > has a call site for every key` เพราะ `mc.*.failed` ถูกเรียกผ่าน template `mc.state.${job.state}` แก้โดยเพิ่ม `failed` ใน DYNAMIC_FAMILIES บรรทัด 181 (ไฟล์นอกรายการเจ้าของ แต่เป็นทะเบียนของ key ที่เซสชันนี้เพิ่ม แก้คำเดียว) แล้วรัน i18n + monte-carlo + tune-job ซ้ำ ผ่าน 65/65
- test ใหม่ของ A18 ทั้ง 5 ล้มบนโค้ดเดิม (`git stash` เฉพาะ `monte-carlo-job.ts`) และผ่านบนโค้ดใหม่

## สิ่งที่ส่งต่อ / นอกขอบเขต

- **regex เดิมใน pwa-offline** `/tune\.worker-[^/]+\.js$/` ไม่มี anchor หน้า จึงผ่านได้ด้วย `attitude-tune.worker-*.js` แม้ `tune.worker` จะหายไป ถ้าต้องการให้เข้ม ควรเปลี่ยนเป็น `/\/tune\.worker-/` (เกินหนึ่งบรรทัดที่อนุญาต จึงไม่ได้แก้)
- **`monte-carlo.ts` 294** ตั้ง `this.config` ก่อน `new MonteCarloJob` ถ้า constructor throw ฟอร์มจะเก็บค่าใหม่ไว้ขณะที่ job เดิมยังอยู่ ไม่ใช่การรั่วของ worker แต่ควรดูใน S4c (เจ้าของ `src/ui/monte-carlo.ts`)
- **สีของสถานะ failed** ใน `src/ui/monte-carlo.css` (ไม่ใช่ไฟล์ของเซสชันนี้)
- progress แบบเปอร์เซ็นต์ของ attitude auto-tune ต้องแก้ `rigid/tuning.ts` (ดู A17 การตัดสินใจ ข้อ 1)
- ไม่ได้เพิ่ม journey ถาวรสำหรับ inspector auto-tune ใน `tests/browser/journeys/` (S10 เป็นเจ้าของ) ขั้นตอนของ probe ด้านบนใช้เป็นต้นแบบได้
