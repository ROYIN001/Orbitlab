# Orbitlab — งานกราฟิกและจุดส่งต่อ 29 กันยายน 2026

**สถานะล่าสุด 23:20 Moscow:** integrated source มี shared soft stars, DPR correction, camera-relative Orbit stars, sector material disposal และแก้ label ซ้อนใน exported chart แล้ว focused tests ผ่าน พร้อมภาพ PNG หลังแก้ที่ดาวน์โหลดจาก UI จริง ดูหัวข้อท้ายและ `browser-export-artifacts/README-TH.md`. Browser Launch/Orbit/Build ตรวจโดย root แยก; ไม่อ้างว่าทุก GPU/ทุกเอฟเฟกต์ผ่าน หรือมี graphics redesign ครบทุก workspace

**บันทึกส่งต่อเดิมก่อนย้าย Cloud (เก็บเป็นประวัติ):** ณ เวลานั้นมี source edits และ existing tests แต่ยังไม่มี browser QA. ขั้นทำต่อด้านล่างเป็นรายการเสนอใน checkpoint เดิม ไม่ใช่ผลที่สำเร็จแล้วหรืออนุมัติให้เพิ่มฟีเจอร์โดยอัตโนมัติ ไม่มี push/deploy จากงานย่อยนี้

## ขอบเขตที่อ่าน

อ่านรายงาน 28 กันยายน และ source ของ Launch (`src/render/scene.ts`, `sky.ts`, `lines.ts`), Orbit (`src/render/orbit-view.ts`), Build (`src/ui/build/stack-svg.ts`, `build.css`) รวมถึง render tests ที่เกี่ยวข้อง ผู้ใช้อนุญาตแก้บั๊กและปรับคุณภาพกราฟิกที่มีอยู่ ส่วนฟีเจอร์ใหม่ต้องรายงานก่อน

Launch มี physical atmosphere, ACES, bloom, MSAA 4 samples, Earth relief, เงาและ Earth-shine อยู่แล้ว จึงรักษาระบบเหล่านี้ไว้ Orbit มี renderer ของตัวเอง ส่วน Build ใช้ SVG ตามสัดส่วน

## สิ่งที่แก้แล้วใน working tree

| ไฟล์ | การเปลี่ยนแปลง | เหตุผลและขอบเขตยืนยัน |
|---|---|---|
| `source/src/render/stars.ts` (ใหม่) | ย้าย deterministic star field และ shaders เดิมของ Launch มารวมเป็นโมดูล ใช้ radius ที่ส่งเข้าได้ เพิ่ม `uPixelRatio` ให้ point sizes เป็น CSS pixels | ข้อมูลตำแหน่ง สี และ magnitude เดิมของ Launch ไม่เปลี่ยน; เป็นภาพประกอบ ไม่ใช่ star catalogue ทางดาราศาสตร์ |
| `source/src/render/scene.ts` | ใช้โมดูลดาวร่วม ตั้ง/อัปเดต `uPixelRatio` ให้ตรง renderer | แก้ `gl_PointSize` เดิมที่เป็น device pixels ทำให้ CSS size เล็กลงเมื่อ DPR สูง; pipeline แสงและฟิสิกส์ไม่เปลี่ยน |
| `source/src/render/orbit-view.ts` | ใช้ดาวขอบนุ่ม/สีและความสว่างหลายระดับจากโมดูลเดียวกับ Launch แทนจุดสี่เหลี่ยม 1,800 จุดสีเดียว | เปลี่ยนเป็น 6,000 จุดตามชุด Launch เดิม; ยังต้องประเมินภาพและประสิทธิภาพจริง โดยเฉพาะเครื่องช้า |
| `source/src/render/orbit-view.ts` | อ่าน DPR ใน `render()` และปรับ renderer/ดาวเมื่อค่าเปลี่ยน | เดิมอ่านครั้งเดียวตอน constructor; ครอบคลุมย้ายจอที่ CSS box ไม่เปลี่ยน ซึ่ง ResizeObserver ไม่เรียก |
| `source/src/render/orbit-view.ts` | dispose material พร้อม geometry ของ equal-time sectors ก่อนสร้างใหม่ | แก้ทรัพยากรเก่าที่ไม่ได้ dispose เมื่อเปลี่ยนวงโคจรหรือสลับ sectors |

ยังไม่มีการแก้ `stack-svg.ts` หรือ CSS ของ Build และยังไม่ปรับ Earth shader ของ Orbit

## ผลตรวจที่รันจริงหลังแก้

รันจาก `audit-2026-09-29/source` ด้วย Node `C:/Program Files/nodejs/node.exe`:

- `node node_modules/typescript/bin/tsc --noEmit` — ผ่าน exit 0
- `node node_modules/vitest/vitest.mjs run tests/rigid-render.test.ts tests/ship-render.test.ts tests/soyuz-render.test.ts tests/sky.test.ts` — **4 ไฟล์ 22 tests ผ่านทั้งหมด**, 3.49 วินาที เริ่ม 02:53:15 ตามนาฬิกาเครื่อง

นี่เป็น existing regression ของ transforms/geometry/sky helpers ไม่ได้ทดสอบ WebGL shader compilation, DPR, sectors disposal หรือคุณภาพภาพโดยตรง จึงห้ามตีความเป็นการตรวจรับภาพใหม่ครบถ้วน

## สิ่งที่ค้างและขั้นทำต่อใน Cloud

1. อ่าน diff ของสามไฟล์ด้านบนก่อนแก้เพิ่ม; อย่าย้อนทับ dirty changes ของงานอื่น
2. เพิ่ม focused tests ของ DPR lifecycle และ material disposal โดยเรียก production methods พร้อม renderer stub; ทดสอบว่าดาวคงตำแหน่งเมื่อใช้ radius ต่างกัน และมี finite values ทุก attribute
3. เริ่ม local preview ของ snapshot ใช้ browser ที่ Cloud รองรับ ตรวจ Launch, Orbit, Home globe, Build ทั้ง desktop/mobile; ตรวจ console ว่าไม่มี shader errors และ canvas ไม่ดำ
4. ตรวจภาพ DPR 1/2 และเปลี่ยน DPR หลังสร้าง renderer; ขนาดดาว/เส้นควรอ่านได้โดยไม่ขยายมากผิดสัดส่วน ทดสอบเล่น/หยุดและสลับ workspace ซ้ำ
5. ตรวจ Orbit ทั้งวงโคจรกลม/รี, Kepler sectors เปิดปิด, ghost transfer และ catalogue เพื่อดูว่าดาวพื้นหลังไม่บดบัง marker/เส้นสำคัญ
6. เทียบกับ source ก่อนแก้หรือเว็บเดิม บันทึกภาพก่อน/หลังและหลักฐานการทำซ้ำ; ปรับจำนวน/ความเข้มดาวหากภาพรกหรือช้าลง
7. ปรับ Build SVG แบบบาง ๆ ให้เห็นทรงกระบอก/engine bell โดยคงสีเดิม สัดส่วน selection และ keyboard focus; ทดสอบ geometry/label รวมทั้งทุก vehicle 21 รุ่น
8. ปรับ Launch/Earth เฉพาะจุดที่ภาพจริงยืนยันว่ามีประโยชน์ ไม่เพิ่มเอฟเฟกต์ซ้ำหรือเปลี่ยนฟิสิกส์
9. อัปเดตรายงานนี้และรายงานหลักว่าอะไรผ่านจริง อะไรยังจำกัด พร้อมตำแหน่งไฟล์ภาพ/ผลทดสอบ

## สิ่งที่ไม่ควรกล่าวอ้าง ณ จุดส่งต่อ

- ยังไม่มีภาพ before/after หรือ browser validation จาก source รอบนี้
- ยังไม่ทดสอบความเร็ว GPU/อุปกรณ์จริงหลายรุ่น
- ยังไม่ปรับกราฟิกครบทุก simulation/ทุก workspace
- ยังไม่ deploy รุ่นใหม่ จึงไม่มีหลักฐานว่าเว็บจริงแสดงการแก้เหล่านี้แล้ว

ไม่มี server หรือ background process ที่เริ่มโดยงานกราฟิกนี้ คำสั่งตรวจสองชุดจบแล้ว

## ตรวจ regression เพิ่มใน integrated source — 29 กันยายน 2026 เวลา 22:49 Moscow

ตรวจ `source-integrated` หลัง Cloud แก้ให้ดาว Orbit เคลื่อนตามตำแหน่งกล้อง โดยเพิ่ม `tests/render-stars-regression.test.ts` เท่านั้น ไม่มี production graphics edit เพิ่มในรอบนี้

ผลรอบสุดท้าย `vitest run tests/render-stars-regression.test.ts tests/design-stack-drawing.test.ts`: **2 ไฟล์ 50 tests ผ่าน** ภายใน 3.86 วินาที; `tsc --noEmit` ผ่านตามหลัง

- ดาว 6,000 ดวงมี position/color/size เป็น finite ทุกค่า และ deterministic ทั้งรัศมี Orbit 3,000 กับ Launch 4×10⁸; รัศมีคลาดไม่เกิน 10⁻⁶ ของค่ากำหนด
- เรียก `OrbitView.render()` จริงผ่าน renderer stub พร้อม PerspectiveCamera จริง: เปลี่ยนระยะกล้อง 50→2,000 แล้วทิศดาวบนภาพไม่เปลี่ยนเมื่อมุมกล้องคงเดิม และ star shell มีศูนย์กลางตรงกล้องทุกเฟรม
- ใช้ aspect มือถือ **357.33/480 ตามขนาด canvas ที่ root วัดจริง** กับ desktop 700/440 ใน regression; ไม่ใช้ viewport 390/844 แทน canvas
- เปลี่ยน DPR โดยไม่เปลี่ยน CSS canvas 1→3→1.25: renderer และ shader uniform เปลี่ยนเป็น 1→2→1.25 ตาม cap; ไม่มีการตั้ง DPR ซ้ำเมื่อค่าเดิม
- เรียก `SceneManager.setPixelRatio()` ของ Launch จริงผ่าน renderer/composer stub: ทั้ง renderer, composer และ star uniform มีค่าเดียวกันตาม cap2 และ fallback1; เรียกซ้ำด้วยค่าเดิมไม่ตั้งใหม่
- เรียก `OrbitView.rebuildShape()` จริง: sector เดิม dispose ทั้ง geometry และ material ครั้งเดียวเมื่อเปลี่ยนวงโคจร และ dispose ทั้งคู่เมื่อปิด sectors; object เดิมไม่ค้างในกลุ่ม
- Existing drawing tests ตรวจ Build catalogue 21 vehicles ในกล่องมือถือ/desktop ว่าชิ้นส่วนอยู่ภายในกรอบและ labels ไม่ซ้อนกัน

การตรวจนี้เป็น source/model-level regression จึงไม่ยืนยัน WebGL shader compilation, rasterized appearance, GPU performance หรือความอ่านง่ายของภาพจริง Root ตรวจ browser และเก็บหลักฐานการแสดงผลแยกต่างหาก ข้อจำกัดด้านอุปกรณ์จริงหลายรุ่นยังคงอยู่

## ปิดงานทบทวน diff และ exported chart — 23:20 Moscow

อ่าน diff จริงของ `src/render/stars.ts`, `scene.ts`, `orbit-view.ts`, `ui/charts.ts`, `ui/chart-export.ts` ใน `source-integrated`: การย้าย field ดาวคงสูตร seed/ตำแหน่ง/สีเดิมของ Launch, scale point-size ตาม DPR ที่ renderer ใช้; Orbit shell radius 3,000 อยู่ภายใน far plane 10,000 และย้ายศูนย์กลางตามกล้องก่อน render โดยคง depth testing ให้ Earth บังดาว; sectors สร้าง single material จึง dispose geometry/material ตรงชนิด ไม่พบ regression แน่ชัดเพิ่มใน diff นี้

ไม่มี production edit ของ Build `stack-svg.ts` ในงานนี้; geometry/label coverage 21 vehicles และ catalogue matrix ตรวจแยกจากภาพ browser. การเพิ่มวัสดุ/แสง/เอฟเฟกต์ใหม่ที่ไม่มี visual defect รองรับยังเป็นข้อเสนอ ไม่อ้างว่าลงมือแล้ว

ดาวมี 6,000 points แทน Orbit เดิม 1,800; ยังไม่มี benchmark GPU ต่ำหลายรุ่น ผล unit tests ไม่แทน performance acceptance. ชุดนี้ไม่ปรับ Earth shaders หรือ physics

PNG ที่ root export จริงก่อนแก้มี event labels ซ้อนกัน. `chartImage` จึงเปิดการแยก labels เป็นแถวและจำกัดใน plot เฉพาะ export path; interactive chart ไม่เปลี่ยนการจัด label. ใหม่ `tests/chart-marker-export.test.ts` รวม existing chart/report tests **14/14 ผ่าน**, TypeScript ผ่าน

หลัง rebuild root ส่งออก Downloads `orbitlab-altitude-h-km (2).png` เก็บเป็น `browser-export-artifacts/orbitlab-altitude-h-km-after-browser.png` 2,400×1,200: ตรวจด้วยตาแล้วทั้ง 5 visible labels อ่านได้ MECO/Stage sep ไม่ชนกัน ไม่มีข้อความตัดขอบ. ภาพใหม่มี ascent markers เท่านั้น; กลุ่ม reference/orbit 4 labels ในภาพเดิมตรวจเพิ่มด้วย production renderer+actual exported Flight JSON ใน `chart-reconstructed-after.png` แล้วแยกกันครบ แต่เป็น reconstructed fixture ไม่ใช่ browser screenshot เดิมเดียวกัน

รายละเอียด before/after, SHA-256, artifact provenance และขอบเขตอยู่ `browser-export-artifacts/README-TH.md` กับ `artifact-structure-validation.json` ไม่มีการแก้ภาพด้วย image tool เพื่อสร้างผลผ่าน
