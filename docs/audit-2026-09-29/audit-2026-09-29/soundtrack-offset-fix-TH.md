# แก้เวลายกตัวของไฟล์เสียงที่บันทึกแล้ว

29 กันยายน 2026: root ทำซ้ำใน browser ว่า upload MP3 ที่ Liftoff at 0:00 แล้วแก้เป็น 1:00 ด้วยการพิมพ์จริงและ Tab เมื่อปิด/เปิด menu ค่าเด้งกลับ 0:00 เพราะเดิมบันทึก t0 เฉพาะตอนเลือกไฟล์ใหม่

แก้ `source-integrated/src/ui/soundtrack-panel.ts` ให้ event `change` บันทึก offset ใหม่โดยรักษา blob/name เดิม, แจ้งผู้ใช้เมื่อเวลาไม่ถูกต้องด้วย `snd.badT0`, ปฏิเสธค่าที่คำนวณแล้วเป็น Infinity และแสดง `snd.saveFailed` ใน EN/TH/RU เมื่อ save ปฏิเสธ หากยังไม่มี recording เวลาเป็น draft สำหรับ upload ครั้งถัดไป

คำสั่งเขียนต่อแถวเรียงหลัง initial read และเรียง save/edit/remove/replacement ตามลำดับ ป้องกัน slow offset save คืน recording ที่ลบไปหรือทับไฟล์ใหม่; initial read ที่มาช้าไม่ทับค่าที่ผู้ใช้กำลังพิมพ์. revision guard กัน status เก่าทับ validation error ล่าสุด

เพิ่ม `tests/soundtrack-panel.test.ts` 9 tests: existing edit+reopen, draft then upload, malformed/2 numeric overflow paths, late initial read, pending save then remove, pending save then replacement, failed save+retry. ก่อนแก้ production ล้มเหลว 6 tests; หลังแก้รวม existing `audio.test.ts` **23/23 ผ่าน** (23:15:24 Moscow, 2.14 s); `tsc --noEmit` ผ่าน

ทบทวนขอบเขตอีกครั้ง: regression ใช้ native panel handlers จริงกับ DOM/IndexedDB-boundary mocks ไม่ใช่ playback จริงหรือ storage quota จริง ไม่รับรอง concurrency ข้ามหลาย browser tabs หรือ crash durability ของ browser

Root ตรวจซ้ำผ่าน UI หลัง build แล้ว: เปลี่ยนไฟล์เสียงเดิม 0:00→1:00 ปิด/เปิด picker ค่ายังคงอยู่; bad text และ 310 digits ถูกปฏิเสธโดยค่าที่บันทึกยังเป็น 1:00; Remove กลับเป็น bundled soundtrack ได้

## แก้ผลสำเร็จของ storage ให้ตรง transaction — 23:24 Moscow

การตรวจผ่าน production functions กับ injected IndexedDB boundary ยืนยันบั๊กที่มีอยู่: save resolve ทันทีที่ request success ทั้งที่ transaction ยังไม่ complete และไม่มี abort listener; delete error ถูก catch แล้วคืน success. Parent อนุมัติแก้จุดนี้ซึ่งเกี่ยวกับการบันทึก offset โดยตรง

แก้ `src/audio/soundtrack.ts` ให้รอ transaction complete ก่อน resolve, reject เมื่อ error/abort, ปิด DB connection หลัง success/failure รวม synchronous transaction/request setup throw; `loadUserSoundtrack` ยังคง fallback null เมื่ออ่านไม่ได้/ไม่มี IndexedDB; `removeUserSoundtrack` ส่ง error ให้ panel แสดงผลและรักษา recording/remove button เดิม. ข้อความ `snd.saveFailed` ปรับเป็นการบันทึกการเปลี่ยนแปลงไฟล์เสียงเพื่อครอบคลุมการลบด้วย

ใหม่ `tests/soundtrack-storage.test.ts` 9 tests ล้มเหลวทั้ง 9 ก่อนแก้; เพิ่ม panel regression ของ delete failure+retry อีก 1. หลังแก้รวม storage/panel/audio **33/33 ผ่าน**, TypeScript ผ่าน (เริ่ม 23:24:06 Moscow, 3.30 s). ครอบคลุม late abort หลัง request success, undefined result ของ delete, read completion/failure, unavailable IndexedDB, synchronous setup failures และปิด connection ครั้งเดียว

Root ต้อง rebuild สำหรับ storage patch ล่าสุดก่อน browser acceptance รุ่นสุดท้าย; tests เหล่านี้ไม่จำลอง quota/crash จริงของเครื่องผู้ใช้
