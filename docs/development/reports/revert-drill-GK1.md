# Revert drill at GK1: FX-2 step 2b on candidate 1842a86 / ซ้อม revert ของขั้น 2b บน candidate 1842a86

> **Update 2026-11-25: the drill made again on the GK1 candidate `9b224ec`; GK1 is not signed.** On 2026-11-25 the owner answered "ย้าย HU-6 ไป GK2 (แนะนำ)" (07:21:22Z): there is no HU-6 session at GK1, and the session froze main after #234 as the candidate C, `9b224ece` (Pages 45615392290, published 13:04:34Z; [DECISIONS](../../DECISIONS.md), "Decided 2026-11-25 (the next work, HU-6 moved to GK2 …)"). The drill was run again on C on 2026-11-25, 19:20:35–19:24:01Z: **pass, 50 of 50 checks**, with variance V1 (the rollbacks go to `408ad16` and `c5da5bb`); the control re-check and the offline checks (5 of 5) passed after it. New for C, under "Limits": `src/pwa/manifest.ts` is no longer the same at `408ad16` and C (`'anatomy/'` and `'structure/'` are on-demand prefixes at C, from #184 and #217), and K2's new stored key `orbitlab.structure.v1` (#217) is outside the drill and carried to GK2. Its section, "The drill on the GK1 candidate 9b224ec (2026-11-25)", comes before "Why this drill"; the runs on `1842a86` (56 of 56) and `7263004` (48 of 48) stay as dated history. G7 item 1 is rated on C in [kpi-GK1.md](kpi-GK1.md), "Gates"; GK1 item 2, the sign-off, is the owner's.
>
> **อัปเดต 2026-11-25: ซ้อม revert ใหม่บนรุ่น GK1 `9b224ec` ยังไม่ได้ลงนาม GK1** เมื่อ 25 พ.ย. คุณตอบว่า "ย้าย HU-6 ไป GK2 (แนะนำ)" (07:21:22Z) ที่ GK1 จึงไม่มี session HU-6 และเซสชันตรึง main หลัง #234 เป็นรุ่นทดสอบ C คือ `9b224ece` การซ้อมจึงทำใหม่บน C เมื่อ 25 พ.ย. 19:20:35–19:24:01Z **ผ่าน ตรวจ 50 จุด ผ่าน 50** โดยยังมีความต่าง V1 (ย้อนไป `408ad16` และ `c5da5bb`) การตรวจควบคุมซ้ำและการตรวจแบบออฟไลน์ (5 จาก 5) ผ่านหลังการซ้อม สิ่งที่ใหม่สำหรับ C อยู่ในหัวข้อ "Limits": `src/pwa/manifest.ts` ที่ C ต่างจาก `408ad16` แล้ว (`'anatomy/'` และ `'structure/'` เป็น path ที่โหลดเมื่อใช้ จาก #184 และ #217) และคีย์ใหม่ของ K2 คือ `orbitlab.structure.v1` (#217) ไม่อยู่ในการซ้อมนี้ จึงยกไปตรวจที่ GK2 หัวข้อของรอบนี้อยู่ก่อน "Why this drill" ส่วนรอบบน `1842a86` (ผ่าน 56 จาก 56) และ `7263004` (ผ่าน 48 จาก 48) เก็บไว้เป็นบันทึกตามวันที่ การลงนาม GK1 เป็นของคุณ

> **Update 2026-11-07: #214 merged; it changes app code; GK1 is not signed.** In the chat of the session working on `claude/gifted-gauss-ojjpaj` the owner wrote "ตรวจ #214 แล้ว merge ให้เลยครับ" (03:53:17Z), and that session merged #214 (`cec4b572`, 04:13:32Z: the crew-safe end card times the escape system's flight to the touchdown, not to the card), after an independent review and after merging main `56887ba` (#215, records) into it; CI 42336107793, 9 of 9 jobs ([DECISIONS](../../DECISIONS.md), "Decided 2026-11-07 (#214 and the merged branches; chat)"). #214 was opened as a draft on 2026-11-06 at 22:20:01Z by the session "Fix the intermittent r3-first-launch journey". It changes `src/ui/watch.ts`. So main is `cec4b572`, and the HU-6 freeze will be taken from main at the time the owner sets the date (now `cec4b572` or later). No candidate has been frozen, so no evidence is lost. The live site is `cec4b572` from 04:38:40Z (Pages 42337488870, the push of #214: 11 of 11 jobs, 38 of 38 journeys); #215 (`56887ba`, Markdown only) started no run. The owner's request to delete the merged branches, "ลบ branch ที่ merge แล้วให้ด้วยครับ" (03:56:06Z), was refused with HTTP 403 by the session's git proxy; nothing was deleted, and the deletion is left to the owner. Lines in this file that call #214 open or the crew-safe card's time unfixed, or that give main or the live site as `d01019a4`, describe the time before; they are kept as a dated record. GK1 item 2, the sign-off, still waits for the HU-6 session, whose date is not set. What is left before K2: the owner's HU-6 session, the freeze and its three re-runs (the K2 session), GK1 item 2, and #206, a draft until the EQ-6 window opens after HU-6 (the only open PR).
>
> **อัปเดต 2026-11-07: #214 merge แล้ว #214 แก้โค้ดแอป และยังไม่ได้ลงนาม GK1** ในแชตของเซสชันที่ทำงานบน `claude/gifted-gauss-ojjpaj` คุณเขียนว่า "ตรวจ #214 แล้ว merge ให้เลยครับ" (03:53:17Z) เซสชันนั้นจึง merge #214 (`cec4b572`, 04:13:32Z: การ์ดจบ "The crew is safe" นับเวลาเที่ยวบินของระบบหนีภัยจนถึงตอนลงพื้น ไม่ใช่ถึงเฟรมที่การ์ดขึ้น) หลังการตรวจโดยผู้ตรวจอิสระ และหลัง merge main `56887ba` (#215 งานบันทึก) เข้า branch ก่อน CI 42336107793 ผ่านครบ 9 job (ดู DECISIONS หัวข้อ "Decided 2026-11-07 (#214 and the merged branches; chat)") #214 เปิดเป็น draft เมื่อ 6 พ.ย. 22:20:01Z โดยเซสชัน "Fix the intermittent r3-first-launch journey" และแก้ `src/ui/watch.ts` ตอนนี้ main คือ `cec4b572` การตรึงรุ่นทดสอบสำหรับ HU-6 จะใช้ main ตอนที่คุณนัดวัน (ตอนนี้ `cec4b572` หรือใหม่กว่า) ยังไม่มีการตรึง จึงไม่เสียหลักฐานอะไร เว็บจริงเป็น `cec4b572` ตั้งแต่ 04:38:40Z (Pages 42337488870 ของ #214 ผ่านครบ 11 job และ 38 journey) ส่วน #215 (`56887ba` มีแต่ Markdown) ไม่ได้เริ่ม run ใด คำขอของคุณ "ลบ branch ที่ merge แล้วให้ด้วยครับ" (03:56:06Z) ถูก git proxy ของเซสชันปฏิเสธด้วย HTTP 403 ยังไม่ได้ลบอะไร การลบจึงเป็นของคุณ ข้อความในไฟล์นี้ที่บอกว่า #214 ยังเปิด หรือเวลาบนการ์ด crew-safe ยังไม่ได้แก้ หรือว่า main หรือเว็บจริงเป็น `d01019a4` จึงเป็นสภาพก่อนหน้านี้ เก็บไว้เป็นบันทึกตามวันที่ ข้อ 2 คือการลงนาม GK1 ยังรอ HU-6 ซึ่งยังไม่ได้นัดวัน สิ่งที่เหลือก่อน K2: session HU-6 ของคุณ การตรึงรุ่นทดสอบกับการตรวจสามข้อ (เซสชัน K2) การลงนาม GK1 (ข้อ 2) และ #206 ที่เป็น draft รอหน้าต่าง EQ-6 หลัง HU-6 (PR เดียวที่ยังเปิด)

> **Update 2026-11-06: #210, #212 and #213 merged; #213 changes app code; GK1 is not signed.** In the chat of the session "Fix the intermittent r3-first-launch journey" the owner wrote "เปิด pr แล้ว merge เลย" (05:27:21Z), and that session merged #210 (`4476540`, 05:28:14Z: a unit test of Watch's picked speed and the report of `r3-first-launch`'s cause, no app code); then "ทำเลย ใช้ branch ชื่อใหม่" (14:49:13Z) and "merge เลย" (20:11:05Z) for #212 (`4b7b66c`, 20:12:21Z: `r2-flight-shell`'s Watch step presses Watch's own 25×, after the schedule Pages run 42124771467 at `b195875` failed on that journey and published nothing); then "ตอบข้อ B เลย แก้ที่แอป" (20:13:45Z), the answer to the report's question on a warp set from outside Watch, and "merge เลย" (21:57:31Z) for #213 (`d01019a4`, 21:58:22Z) ([DECISIONS](../../DECISIONS.md), "Decided 2026-11-06 (#210, #212, #213 and the warp set from outside Watch; chat)"). #213 changes `src/` (`src/ui/watch.ts`, `src/main.ts`, `src/mcp.ts`): a warp set from outside the launch viewer (WebMCP's `control_playback`, the `.` and `,` keys) now counts as a speed picked there. So main is `d01019a4`, with an app change since `fa3c486`, and the HU-6 freeze will be taken from main at the time the owner sets the date (now `d01019a4` or later). No candidate has been frozen, so no evidence is lost. The live site: `4476540` from 06:00:42Z (Pages 42168605010), `4b7b66c` from 20:43:36Z (Pages 42286344470), then `d01019a4` from 22:33:31Z (Pages 42301024823, the push of #213: 11 of 11 jobs, 38 of 38 journeys). Lines in this file that call #210 open or waiting for the owner, that leave the warp question open, or that give main or the live site as `fa3c486` describe the time before; they are kept as a dated record. GK1 item 2, the sign-off, still waits for the HU-6 session, whose date is not set. What is left before K2: the owner's HU-6 session, the freeze and its three re-runs (the K2 session), GK1 item 2, and #206, a draft until the EQ-6 window opens after HU-6.
>
> **อัปเดต 2026-11-06: #210, #212 และ #213 merge แล้ว #213 แก้โค้ดแอป และยังไม่ได้ลงนาม GK1** ในแชตของเซสชัน "Fix the intermittent r3-first-launch journey" คุณเขียนว่า "เปิด pr แล้ว merge เลย" (05:27:21Z) เซสชันนั้นจึง merge #210 (`4476540`, 05:28:14Z: เทสต์ความเร็วที่เลือกใน Watch และรายงานต้นเหตุของ `r3-first-launch` ไม่แตะโค้ดแอป) ต่อมาคุณเขียนว่า "ทำเลย ใช้ branch ชื่อใหม่" (14:49:13Z) และ "merge เลย" (20:11:05Z) สำหรับ #212 (`4b7b66c`, 20:12:21Z: ขั้น Watch ของ `r2-flight-shell` กดปุ่ม 25× ของ Watch เอง หลังจาก Pages รอบตามเวลา 42124771467 บน `b195875` ล้มที่ journey นี้และไม่ได้เผยแพร่) แล้วตอบคำถามในรายงานเรื่อง warp ที่ตั้งจากนอก Watch ว่า "ตอบข้อ B เลย แก้ที่แอป" (20:13:45Z) และ "merge เลย" (21:57:31Z) สำหรับ #213 (`d01019a4`, 21:58:22Z) (ดู DECISIONS หัวข้อ "Decided 2026-11-06 (#210, #212, #213 and the warp set from outside Watch; chat)") #213 แก้ `src/` (`src/ui/watch.ts`, `src/main.ts`, `src/mcp.ts`): warp ที่ตั้งจากนอกหน้าชมการปล่อย (WebMCP `control_playback`, ปุ่ม `.` และ `,`) นับเป็นการเลือกความเร็วในหน้านั้น ตอนนี้ main คือ `d01019a4` ซึ่งมีการแก้แอปหลัง `fa3c486` การตรึงรุ่นทดสอบสำหรับ HU-6 จะใช้ main ตอนที่คุณนัดวัน (ตอนนี้ `d01019a4` หรือใหม่กว่า) ยังไม่มีการตรึง จึงไม่เสียหลักฐานอะไร เว็บจริง: `4476540` ตั้งแต่ 06:00:42Z (Pages 42168605010), `4b7b66c` ตั้งแต่ 20:43:36Z (Pages 42286344470) แล้ว `d01019a4` ตั้งแต่ 22:33:31Z (Pages 42301024823 ของ #213 ผ่านครบ 11 job และ 38 journey) ข้อความในไฟล์นี้ที่บอกว่า #210 ยังเปิดหรือรอคุณ ว่าคำถามเรื่อง warp ยังเปิด หรือว่า main หรือเว็บจริงเป็น `fa3c486` จึงเป็นสภาพก่อนหน้านี้ เก็บไว้เป็นบันทึกตามวันที่ ข้อ 2 คือการลงนาม GK1 ยังรอ HU-6 ซึ่งยังไม่ได้นัดวัน สิ่งที่เหลือก่อน K2: session HU-6 ของคุณ การตรึงรุ่นทดสอบกับการตรวจสามข้อ (เซสชัน K2) การลงนาม GK1 (ข้อ 2) และ #206 ที่เป็น draft รอหน้าต่าง EQ-6 หลัง HU-6

> **Update 2026-11-05: four more PRs merged; GK1 is not signed.** #190 (`5588be1`, 10:14:10Z), #188 (`7d12951`, 16:27:11Z), #208 (`7af3b93`, 18:37:41Z) and #209 (`fa3c486`, 18:45:32Z) merged to main ([DECISIONS](../../DECISIONS.md), "Decided 2026-11-05 (the GK1 checks at the freeze, the r3-first-launch fix and the open replay PRs; chat)"). #190 and #188 change `src/physics/frame.ts`; #208 adds a test and changes only comments in `src/`; #209 changes the `r3-first-launch` journey only. The live site after them: `fa3c486` from 19:15:12Z (Pages [42087327369](https://github.com/ROYIN001/Orbitlab/actions/runs/42087327369), the push of #209: 11 of 11 jobs, 38 of 38 journeys; #208's run 42086061932 was cancelled by it). On the owner's answer of 14:33:34Z, "ทำใหม่บนรุ่นที่ตรึง (แนะนำ)", the three GK1 checks made on `7263004` (the K1 retrospective's M-PLAN-026 re-run, the hand-off check and the decision follow-through) are made again on the frozen candidate while the owner does HU-6; the revert drill in this file is made again at the freeze, by the answer of 2026-10-31, "ตรึงตอนนัด HU-6 (แนะนำ)" ([DECISIONS](../../DECISIONS.md), "Decided 2026-10-31 (the GK1 candidate after #187 and #193; chat)"). The candidate is still not set: it is frozen when the owner sets the HU-6 date.
>
> **อัปเดต 2026-11-05: merge เพิ่มอีก 4 PR แต่ยังไม่ได้ลงนาม GK1** #190 (`5588be1`), #188 (`7d12951`), #208 (`7af3b93`) และ #209 (`fa3c486`) merge เข้า main เมื่อ 5 พ.ย. (ดู DECISIONS หัวข้อ "Decided 2026-11-05 …") #190 และ #188 แก้ `src/physics/frame.ts` ส่วน #208 เพิ่มเทสต์และแก้เฉพาะคอมเมนต์ใน `src/` และ #209 แก้เฉพาะ journey `r3-first-launch` เว็บจริงหลังจากนั้น: `fa3c486` ตั้งแต่ 19:15:12Z (Pages 42087327369 ของ #209 ผ่านครบ 11 job และ 38 journey) ตามที่คุณตอบเมื่อ 14:33:34Z ว่า "ทำใหม่บนรุ่นที่ตรึง (แนะนำ)" การตรวจของ GK1 สามข้อ (retrospective ของ K1 (รัน M-PLAN-026 ใหม่) การตรวจงานส่งต่อ และการติดตามคำตัดสิน) ที่ทำไว้บน `7263004` จะทำใหม่บนรุ่นที่ตรึงระหว่างที่คุณทำ HU-6 ส่วนการซ้อม revert ในไฟล์นี้จะทำใหม่ตอนตรึงตามคำตอบ 31 ต.ค. ("ตรึงตอนนัด HU-6 (แนะนำ)") ยังไม่มีรุ่นทดสอบจนกว่าคุณจะนัดวัน HU-6

> **Update 2026-11-04: the GK1 record is merged; GK1 is not signed.** On the owner's chat answer of 2026-10-31 ("Q check ก่อนแล้ว merge (แนะนำ)", 12:06:37Z), GK1 item 1 was done on 2026-11-04, after the Q check (confirmed 3 684 of 4 347) and rule 3's check: #181 merged at 13:15:43Z as `3a0e3b9`, the GK1 record #182 at 13:16:52Z as `a5b9afe`, and #186 at 13:17:54Z as `ebddc7e` ([DECISIONS](../../DECISIONS.md), "Decided 2026-10-31 and 2026-11-04 (merging the GK1 records #181, #182 and #186; chat)"). In the K2 session's chat the owner answered on 2026-10-28 that there is no iPad yet and that a Windows computer with Chrome or Edge takes its place in HU-6, with the Android phone ("Decided 2026-10-28 (HU-6's devices and guide …)"), and on 2026-11-04 that the HU-6 date is "จะบอกอีกที" (17:32:56Z; no freeze yet, and bug-fix and docs PRs may still merge) and that Day 85 is 12 Feb 2027 ("ข 12 ก.พ. 2027", 17:32:56Z) ("Decided 2026-11-04 (#183's merge, the HU-6 date and Day 85; the K2 session's chat)"). GK1 item 2, the sign-off, waits for the HU-6 session. Lines in this file that say #181 or #182 is open, that their merge waits for HU-6, that the HU-6 devices are a low-end Android and an iPad, or that which date governs Day 85 was not asked describe the time before these answers; they are kept as a dated record. Later that day (20:20:40Z) the owner answered in the K2 session's chat "ข นับ Windows แทน iPad": the Windows computer's results count for D-56's iPad class at GK1, the CSV download included ("Decided 2026-11-04 (#204, #203, Day 35 and HU-6 without an iPad; the K2 session's chat)").
>
> **อัปเดต 2026-11-04: บันทึก GK1 merge แล้ว แต่ยังไม่ได้ลงนาม GK1** ตามที่คุณตอบในแชตเมื่อ 31 ต.ค. ("Q check ก่อนแล้ว merge (แนะนำ)") หลัง Q check (ยืนยัน 3 684 จาก 4 347) และการตรวจตามกฎข้อ 3 จึง merge #181, #182 (บันทึก GK1) และ #186 เมื่อ 4 พ.ย. (ดู DECISIONS หัวข้อ "Decided 2026-10-31 and 2026-11-04 (merging the GK1 records #181, #182 and #186; chat)") ในแชตของเซสชัน K2 คุณตอบเมื่อ 28 ต.ค. ว่ายังไม่มี iPad และใช้คอมพิวเตอร์ Windows กับ Chrome หรือ Edge แทน คู่กับโทรศัพท์ Android และเมื่อ 4 พ.ย. ตอบเรื่องวัน HU-6 ว่า "จะบอกอีกที" (ยังไม่ตรึง PR แก้บั๊กและเอกสารยัง merge ได้) และให้ Day 85 เป็น 12 ก.พ. 2027 ("ข 12 ก.พ. 2027") ข้อ 2 คือการลงนาม GK1 ยังรอ HU-6 ข้อความในไฟล์นี้ที่บอกว่า #181 หรือ #182 ยังเปิดอยู่ ว่าการ merge รอ HU-6 ว่าเครื่องของ HU-6 คือ Android ราคาประหยัดกับ iPad หรือว่ายังไม่ได้ถามว่า Day 85 ยึดวันไหน จึงเป็นสภาพก่อนคำตอบเหล่านี้ เก็บไว้เป็นบันทึกตามวันที่ ต่อมาในวันเดียวกัน (20:20:40Z) คุณตอบในแชตของเซสชัน K2 ว่า "ข นับ Windows แทน iPad" ผลบนคอมพิวเตอร์ Windows จึงนับแทนกลุ่ม iPad ของ D-56 ที่ GK1 รวมการดาวน์โหลด CSV ด้วย

> **Update 2026-10-31: no GK1 candidate until the HU-6 session is scheduled.** After this file was brought to `1842a86` (2026-10-30), four more PRs merged to main on the owner's answers in other sessions' chats: #187 (`ef9d3f6`, 2026-10-30T19:39:12Z) and #193 (`dcfa065`, 20:23:22Z), then #184 (`f68faab`, 2026-10-31T00:01:34Z) and #189 (`089b34e`, 06:44:13Z). Each changes files under `src/physics`, and #184 also raises size ceilings. The owner then answered "ตรึงตอนนัด HU-6 (แนะนำ)": no candidate is frozen now, and bug-fix PRs may still merge; when the owner sets the HU-6 date, main at that time is frozen as the candidate, the evidence is made again on it, and nothing merges until the HU-6 session ends ([DECISIONS](../../DECISIONS.md), "Decided 2026-10-31 (the GK1 candidate after #187 and #193; chat)"). So "the candidate" and the build `1842a86` in this file describe 2026-10-30; they are kept as a dated record, not as the current state.
>
> **อัปเดต 2026-10-31: ยังไม่มี candidate จนกว่าจะนัด HU-6** หลังไฟล์นี้แก้ให้ตรงกับ `1842a86` (30 ต.ค.) มี PR merge เข้า main อีกสี่ตัวตามที่คุณอนุมัติในแชตของเซสชันอื่น คือ #187 และ #193 (30 ต.ค.) แล้ว #184 และ #189 (31 ต.ค.) ทั้งสี่ PR แก้ไฟล์ใน `src/physics` และ #184 ยังเพิ่มเพดานขนาดด้วย คุณตอบว่า "ตรึงตอนนัด HU-6 (แนะนำ)" ตอนนี้จึงยังไม่ตรึง candidate และ PR แก้บั๊กยัง merge ได้ เมื่อคุณนัดวัน HU-6 จะตรึง main ณ ตอนนั้นเป็น candidate ทำหลักฐานใหม่บนนั้น แล้วห้าม merge จน HU-6 จบ (ดู DECISIONS หัวข้อ "Decided 2026-10-31 (the GK1 candidate after #187 and #193; chat)") ข้อความเรื่อง candidate รุ่น `1842a86` ในไฟล์นี้จึงเป็นสภาพของวันที่ 30 ต.ค. ไม่ใช่ของปัจจุบัน

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - **ซ้อมใหม่บน candidate 1842a86:** วันที่ 2026-10-29 #185 ถูก merge เป็น `1842a86` (21:25:44Z) และ Pages 40957726247 เผยแพร่เมื่อ 21:49:41Z คุณตอบในแชตว่า "HU-6 ยังไม่ได้ทำ ใช้ 1842a86 เป็น candidate ใหม่ครับ" แล้วเลือก "Redo all (Recommended)" (ทำหลักฐานที่ตัวเลือกนั้นระบุใหม่บน `1842a86` ซึ่งมีการซ้อมนี้ด้วย) การซ้อมนี้จึงทำใหม่บน `1842a86` (2026-10-29 23:21–23:26Z) คำตอบ P2 เดิมของคุณ (2026-10-26) คือ "ข ซ้อมหนึ่งครั้ง" ครั้งนี้เป็นครั้งที่สอง ทำตามคำตอบ "Redo all (Recommended)"
> - `1842a86` ต่างจาก `7263004` แค่ #185 สี่ไฟล์: `src/physics/frame.ts` (ส่วน replay) เทสต์ใหม่หนึ่งไฟล์ รายงานหนึ่งไฟล์ และ fragment หนึ่งไฟล์
> - **ผล: ผ่านทุกขั้น** (ตรวจ 56 จุด ผ่าน 56) ใช้บิลด์จริงของแอปสามรุ่น เสิร์ฟที่ origin เดียวและ path เดียว (`/Orbitlab/`) และ browser profile เดียวตลอด การเปลี่ยนรุ่นทุกครั้งใช้ข้อความอัปเดตของแอปเอง ("A new version of Orbitlab is ready." แล้วกด Reload) แบบเดียวกับที่ผู้เรียนเห็นบน Pages
> - **ต่างจากถ้อยคำของกฎ (V1) เหมือนครั้งก่อน:** รุ่นที่เผยแพร่ก่อน candidate ตอนนี้คือ `7263004` โค้ดแอปของ `7263004` (และของ `a05ae70`) ต่างจาก candidate แค่ `src/physics/frame.ts` ซึ่งไม่มีโค้ดที่เก็บข้อมูล และทั้งสองรุ่นมีตัวเขียนของ 2b อยู่แล้ว การย้อนไปรุ่นนั้นจึงไม่ได้ย้อนรูปแบบข้อมูลเลย การซ้อมจึงย้อนไป `408ad16` (ก่อน 2a) และ `c5da5bb` (มีแค่ 2a ตัวอ่าน) เหมือนครั้งก่อน ซึ่งตรงกับตัวเลือก (ข) ของ P2 ตามที่ DECISIONS บันทึก (`DECISIONS.md:366` ที่ `5092ac9`) และซ้อมกับ `c5da5bb` เพิ่ม
> - ขั้น 1 (candidate 1842a86): ผู้เรียนทำแบบทดสอบวัดระดับครบ 25 ข้อด้วยปุ่มในหน้าเว็บ แบบทดสอบที่เก็บไว้มี `"revision":1` ตั้งแต่เริ่ม หน้าผลแสดง **11 %** (ถูก 3 จาก 25 ข้อ, misconception 4)
> - ขั้น 2 (ย้อนไป `408ad16` ซึ่งเป็นรุ่นก่อน 2a และไม่รู้จักช่อง `revision`):
>   - เปิดผู้เรียนคนเดิม ผลและคะแนนเหมือนเดิมทุกตัวเลข
>   - การโหลดและการดูผลไม่เขียนอะไรลงที่เก็บ (ค่าที่เก็บเท่าเดิมทุกไบต์ ไม่มีสำเนากู้คืน)
>   - จากนั้นบิลด์เก่าบันทึกเองสองครั้ง (เปิดบทเรียน 1.1 แล้วกดคำใบ้) ไบต์ของแบบทดสอบยังเท่าเดิม และยังมี `"revision":1`
> - ขั้น 3 (ย้อนไป `c5da5bb` ซึ่งมีแค่ 2a ตัวอ่าน): อ่านแบบทดสอบเป็น revision 1 คะแนนเดิม ผลตรวจควบคุม: ถ้าเปลี่ยนค่าเป็น revision 2 บิลด์นี้ไม่แสดงผลสอบเลย แปลว่ามันอ่านช่องนี้จริง ไม่ได้มองข้าม (ตรวจซ้ำหลังซ้อม: อ่านค่าที่เก็บกลับมาแล้วตรงกับที่ใส่ทุกไบต์ และค่าเดียวกันที่เป็น revision 1 แสดง 11 %)
> - ขั้น 4 (กลับไป candidate 1842a86): คะแนนเดิม ไบต์ของแบบทดสอบเท่ากับขั้น 1 ทุกไบต์ ค่าทั้งก้อนต่างจากขั้น 1 เฉพาะประวัติของบทเรียน 1.1 ที่สามบิลด์เขียนเองระหว่างการซ้อม
> - **สิ่งที่พบเพิ่ม:** ครั้งนี้อ่านค่าที่เก็บหลังเปิดบทเรียน 1.1 ก่อนกดคำใบ้ด้วย พบว่าการเปิดบทเรียนก็เป็นการบันทึกครั้งหนึ่ง (`408ad16` เขียนรายการ `orbit-first` ที่ยังไม่มีคำใบ้) ไบต์ของแบบทดสอบยังเท่าเดิม ผลจึงไม่เปลี่ยน แต่ประโยค "ทุกการเปลี่ยนค่าตามหลังการกดคำใบ้" ในการซ้อมบน 7263004 จริงเฉพาะจุดที่การซ้อมนั้นอ่าน (ใส่หมายเหตุไว้ที่ประโยคนั้นแล้ว)
> - ข้อจำกัด:
>   - ใช้บิลด์ในเครื่องกับข้อมูล snapshot ที่ commit ไว้ เสิร์ฟจาก 127.0.0.1 ไม่ใช่ github.io
>   - ทดสอบบน Chromium (headless) อย่างเดียว อุปกรณ์จริงอยู่ใน HU-6 (เพิ่ม 2026-11-04: ตามที่คุณตอบในแชตของเซสชัน K2 เมื่อ 28 ต.ค. ตอนนี้ HU-6 ไม่มี iPad ใช้โทรศัพท์ Android ราคาประหยัดกับคอมพิวเตอร์ Windows ที่ใช้ Chrome หรือ Edge จึงไม่มีเครื่องที่ใช้ Safari ส่วนที่ว่าแบบนี้ยังตรงกับ D-56 ที่ให้ Android ราคาประหยัดและ iPad เป็นด่านหรือไม่ ยังไม่ได้ถามคุณ เป็นคำถามใน kpi-GK1.md หัวข้อ "Questions for the owner" ต่อมาในวันเดียวกัน (20:20:40Z) คุณตอบในแชตของเซสชัน K2 ว่า "ข นับ Windows แทน iPad" ซึ่งไม่ใช่ข้อที่แนะนำ ตามข้อความของตัวเลือก "ให้ผลบนคอมพิวเตอร์นับแทนกลุ่ม iPad ที่ GK1 (เปลี่ยน D-56)" ที่ GK1 ผลบนคอมพิวเตอร์ Windows จึงนับแทนกลุ่ม iPad ของ D-56 รวมการดาวน์โหลด CSV ด้วย ตัวเลือกไม่ได้พูดถึงด่านหลังจากนั้น (ดู DECISIONS หัวข้อ "Decided 2026-11-04 (#204, #203, Day 35 and HU-6 without an iPad; the K2 session's chat)"))
>   - การ revert จริงบน main (ตอนนี้ `1842a86`) จะได้โค้ดแอปเดียวกับรุ่นที่ซ้อม ยกเว้น `src/physics/frame.ts` ของ #185 และ build stamp ต่างกัน
> - การซ้อมครั้งแรกบน `7263004` (2026-10-26 ผ่าน 48 จาก 48) เก็บไว้ท้ายไฟล์ตามที่เขียนไว้ ตอนนั้น `7263004` ยังเป็น candidate
> - ไม่มีคำถามใหม่ ความต่าง V1 จะอยู่ในรายการ variance ของ PR บันทึก GK1 ไฟล์นี้เข้า PR บันทึก GK1

```yaml
envelope: v2
package: GK1 record (revert drill; draft R7.2 pre-v1.0 rollback rule 4)
item: FX-2 step 2b (M-LEARNING-027, the writer of a test's `revision`)
wave: K1 (GK1 record)
lane: I (the integration session ran the drill; it checks lane L's stored format)
change_kind: docs (evidence only; no app code, test or build change)
owner_authorization: {date: 2026-10-26, via: chat, question: P2, answer: "ข ซ้อมหนึ่งครั้ง", where: "DECISIONS.md:366 at 5092ac9", scope: "one revert drill of 2b on the candidate, written up as revert-drill-GK1.md for the GK1 record PR"}
redo_authorization: {date: 2026-10-29, via: chat, new_candidate: "HU-6 ยังไม่ได้ทำ ใช้ 1842a86 เป็น candidate ใหม่ครับ", new_candidate_when: "before 22:19Z", answer: "Redo all (Recommended)", answered: "between 22:19:01Z and 22:26:15Z", scope: "redo on 1842a86 the evidence the option names: heavy and six-DOF fleet on GitHub; the held-journeys run, the KPI baselines and this revert drill locally", where: "DECISIONS.md, 'Decided 2026-10-29'"}
candidate: {label: candidate 1842a86, sha: 1842a86cee5a1dc4fd40d536d2bc882d31750021, pr: "#185", merged: "2026-10-29T21:25:44Z", published: "Pages 40957726247, deploy-pages 2026-10-29T21:49:41Z"}
previous_candidate: {sha: 72630046fc5eb56f1797e5363b6f9ad293ff9d38, pr: "#179", until: "2026-10-29", differs_by: "#185 only: src/physics/frame.ts, tests/debris-replay.test.ts, docs/development/reports/replay-debris-arc.md, changes/claude-gifted-gauss-ojjpaj.md"}
rolled_back_to:
  - {sha: 408ad16b90fd72b934f947afc2ed13efc4a7584a, what: "before 2a (#174)", published: "Pages 40228322904 (daily refresh at 408ad16, publish job end 2026-10-25T20:28:25Z)"}
  - {sha: c5da5bb4b7cd78e45d030b2747020e7e6ac9994e, what: "2a only (#176, the reader)", published: "Pages 40340692641, publish job end 2026-10-26T15:10:24Z"}
variance: {id: V1, what: "rolled back to 408ad16 and c5da5bb, not to the previously published build 7263004 (its app inputs differ from the candidate only in src/physics/frame.ts)", against: "draft S17 rule 4 (S17:171 at c2af8ae; GK1 row S17:327); P2's option as DECISIONS.md:366 at 5092ac9 records it names a build before 2a, which the drill used"}
departures: "D1–D12 from the 7263004 run's method (section \"Departures from the 7263004 method\")"
run: {date: 2026-10-29, start: "23:21:02Z", end: "23:26:44Z", checks: "56 of 56 pass", exit: 0}
after_run: {control_recheck: "2026-10-29 23:28:41–23:29:56Z, exit 0 (first attempt 23:26:59–23:28:16Z, exit 1: D8)", offline_checks: "post-run-checks.json, 6 of 6 pass, exit 0"}
result: pass (with variance V1)
evidence: local run, not committed (builds' file lists, browser profile, logs, screenshots)
earlier_run: {on: 7263004, date: 2026-10-26, checks: "48 of 48 pass", result: "pass (with variance V1)", kept_in: "The earlier run on 7263004 (2026-10-26)"}
```

**Why this is a second run.** On 2026-10-29 the GK1 candidate moved from `7263004` to `1842a86`. #185 merged as `1842a86` (21:25:44Z), and Pages 40957726247 published it (`deploy-pages` 21:49:41Z). The owner then answered in chat "HU-6 ยังไม่ได้ทำ ใช้ 1842a86 เป็น candidate ใหม่ครับ" and, to a question on the GK1 evidence, "Redo all (Recommended)": heavy and the six-DOF fleet, the held journeys, the KPI baselines and this drill are redone on `1842a86` ([DECISIONS.md](../../DECISIONS.md), "Decided 2026-10-29"). P2 asked for one drill ("ซ้อมหนึ่งครั้ง"); this second run is on "Redo all (Recommended)". `1842a86` differs from `7263004` only by #185: `src/physics/frame.ts` (+24 −18), a new test (`tests/debris-replay.test.ts`), a report (`docs/development/reports/replay-debris-arc.md`) and a fragment (`changes/claude-gifted-gauss-ojjpaj.md`); `git diff --stat 7263004 1842a86` lists these 4 files. The run of 2026-10-26 on `7263004` is kept as written under "The earlier run on 7263004 (2026-10-26)", at the end.

**How to read this file.** `file:n` is the file at the candidate `1842a86`, unless marked "at `5092ac9`" (#181's commit of 2026-10-26, which records the owner's answers P1–P5) or "at `408ad16`". Plan drafts (`S07`, `S17`) are at `c2af8ae` (`docs/development/plan-v2-draft/sections/` on the plan branch). Apart from `src/physics/frame.ts`, #185 changes none of the files cited here by line, so those lines read the same at `7263004`. The drill's builds, tools, logs and screenshots are local, not committed; their names are given so a rerun can match them. This run repeats the method of the run on `7263004` (as written in #182 at `ac6f2c6`); each place it departs from it is listed under "Departures from the 7263004 method".

## The drill on the GK1 candidate 9b224ec (2026-11-25)

Added by the GK1 close-out records PR. It is HANDOVER-K2 §16.4, step 7, on the owner's "ย้าย HU-6 ไป GK2 (แนะนำ)" (2026-11-25T07:21:22Z), by which the session froze C and made the GK1 evidence again on it; P2 asked for one drill ("ซ้อมหนึ่งครั้ง"), and this third run, like the second, rests on the evidence being made again on a new candidate. The sections after this one, from "Why this drill" to the end, describe the run on `1842a86` (2026-10-29) and the first run on `7263004` (2026-10-26); they stay as dated history. It repeats the 1842a86 run's method, with the departures listed under "Departures from the 1842a86 method" below. The candidate is C = `9b224ece67e8d9167ce67230cd5f4d4d7581bbf0` (#234). Variance V1 stays: the drill rolls back to `408ad16` (before 2a) and `c5da5bb` (2a only).

The run was local and is not committed. The repository checkout was used read only: `git worktree add` only, and the three worktrees were removed at the end. `git status --short` was empty before and after. `HEAD` was `ccc0254b` before and after. `git worktree list` was the same before and after.

```yaml
run: {date: 2026-11-25, start: "19:20:35Z", end: "19:24:01Z", checks: "50 of 50 pass", exit: 0}
after_run: {control_recheck: "19:24:10–19:24:43Z, exit 0", offline_checks: "post-run-checks.json, 5 of 5 pass, exit 0"}
trials: {trial1: "18:58–19:08Z, 20 of 23, exit 1 (E2, E4)", trial2: "19:15:12–19:19:57Z, 50 of 50, exit 0 (E8)"}
result: pass (with variance V1)
```

### What is the same at 408ad16, c5da5bb and C, and what is not

These are re-checks, made with git, of the 1842a86 run's lines `:107`, `:126` and `:154` for C. The commands and their exit codes are in `app-input-diffs.txt`.

- **`src/pwa/` is no longer byte-identical.** `git diff --quiet 408ad16 9b224ece -- src/pwa` exits 1, and so does the same command from `c5da5bb`. The only file that differs is `src/pwa/manifest.ts` (+9 −1).
  - #184 (`f68faabe`) and #217 (`1ddf187b`) added `'anatomy/'` and `'structure/'` to `ON_DEMAND_PREFIXES`, with their comment. The list is `['home/', 'social/', 'audio/', 'privacy.html']` at `408ad16` and `c5da5bb`, and `['home/', 'social/', 'audio/', 'privacy.html', 'anatomy/', 'structure/']` at C (`src/pwa/manifest.ts:38`).
  - `git diff --quiet <408ad16|c5da5bb> 9b224ece -- src/pwa/sw-core.ts src/pwa/sw.ts src/pwa/register.ts src/pwa/offline-protocol.ts` exits 0. `git log 408ad16..9b224ece` on those four files is empty.
  - So the FX-7 flow below is unchanged since `408ad16`: registration, install, the update offer, Reload and prune. What changed is only which paths the worker treats as on-demand.
- **The storage paths are not all the same now.**
  - `git diff --quiet 408ad16 9b224ece -- src/lessons/progress.ts src/projects/validation.ts src/projects/archive.ts` exits 0.
  - The 1842a86 run's wider set (`… src/workspace/ src/pwa/ src/ui/lessons/lesson-mode.ts`) exits 1 at C:
    - `src/workspace/registry.ts` (+2): #217 adds `'orbitlab.structure.v1'` to `WORKSPACE_KEYS`, at `:12`.
    - `src/workspace/repository.ts` (+1 −1): #217 adds `'orbitlab.structure.v1': 1` to the versioned keys of `preserveUnreadableOverwrite`, at `:71`.
    - `src/ui/lessons/lesson-mode.ts` (+7 −2): #223 changes the icon and adds the `lesson-study` class, which is looks only. `startLesson`, `showHint` and `save` are unchanged.
    - `src/pwa/manifest.ts`, as above.
- **The assessment code is the same as at 1842a86.** `git diff --quiet 1842a86 9b224ece -- src/lessons/assessment src/ui/lessons/assessment-view.ts` exits 0. `BANK_REVISION` is 1 at C (`src/lessons/assessment/bank.ts:35`). `git grep -c BANK_REVISION 408ad16 -- src` finds nothing (exit 1).
- **The app source moved a lot.** `git diff --stat <sha> 9b224ece -- src` lists:
  - from `408ad16`: 106 files, +15 140 −669;
  - from `c5da5bb`: 105 files, +15 043 −655;
  - from `1842a86`: 102 files, +15 029 −651.

  `index.html`, `vite.config.ts` and `public/` differ too (`public/` gains 29 files: the `anatomy/` and `structure/` models and the `home/structure.*` pictures).
- **Packages.** `package-lock.json` is the same at all three: `git diff --quiet <408ad16|c5da5bb> 9b224ece -- package-lock.json` exits 0. `package.json` differs only by three `scripts` entries (`anatomy`, `anatomy:terms`, `structure`; #184, #217, #221). No dependency differs.

### Builds

```sh
G=<scratchpad>/gk1
git -C /home/user/Orbitlab worktree add --detach $G/wt/rd-9b224ec 9b224ece67e8d9167ce67230cd5f4d4d7581bbf0
git -C /home/user/Orbitlab worktree add --detach $G/wt/rd-408ad16 408ad16b90fd72b934f947afc2ed13efc4a7584a
git -C /home/user/Orbitlab worktree add --detach $G/wt/rd-c5da5bb c5da5bb4b7cd78e45d030b2747020e7e6ac9994e
# each: ln -s /home/user/Orbitlab/node_modules node_modules
cd <wt-each> && npx vite build      # exit 0 for each: 2.4 s, 2.4 s, 2.4 s (2026-11-25 18:50:53–18:51:01Z)
```

Node v22.23.5, Vite 8.3.0. The C build was made fresh in its own worktree. The earlier `<scratchpad>/wt-C` build was not used, because its `dist` had been rebuilt with a local switch.

| Build | Stamp (`build-info.json` `commit`, `<html data-build>`) | Files in `dist` | `sw.js` SHA-256 | Precache version (entries) | Page script |
|---|---|---|---|---|---|
| candidate 9b224ec | `9b224ece` | 107 | `e1a939db…1133a3f9` | `0016d202bac189` (72) | `assets/index-Drjh8c8i.js` |
| `c5da5bb` | `c5da5bb4` | 90 | `28c065fc…e05ffecc` | `0eed9ed5c1b44e` (68) | `assets/index-pz2TzFwk.js` |
| `408ad16` | `408ad16b` | 90 | `d19a235f…e71b429d` | `0fc2847196867c` (68) | `assets/index-BtIg8Rqm.js` |

Full `sw.js` hashes: `c5da5bb` `28c065fcefbdcc985df5bc553611bb91f081cd80ead0f084e2df73b9e05ffecc`; `408ad16` `d19a235f53b5e7a0290527d161f0532af1724b0c6a4b9e6ebfddf0a9e71b429d`; C `e1a939db0a9d9b5efc320c014aad9953f47755144e3ebacdda3da1081133a3f9`.

- **What C precaches beyond the old builds.** With the content hashes taken out of the names, C's precache holds four entries that the old builds' does not: `assets/structure.js`, `assets/structure-en.js`, `assets/structure-ru.js` and `assets/structure.css`. Every entry in the old builds is also in C's.
- **On-demand files** (never precached; in `builds/ondemand-*.txt`):
  - `408ad16` and `c5da5bb`: 19 files, namely `home/` (15), `social/` (1), `audio/` (2) and `privacy.html`.
  - C: 32 files, the same 19 plus `home/structure.{en,ru,th}.webp`, `anatomy/` (6: three Soyuz pages and three `*.exterior.bin` meshes) and `structure/` (4: `soyuz-2-1b-fregat-st31.r4.json` and three layer `.bin` files).

### Tools

The tools are local and not committed. They were written again on 2026-11-25 from this file's "Setup" (E1).

| File | SHA-256 |
|---|---|
| `server.mjs` | `38278a0e5834622ce54c2033ca43a179a6d993435766e2be4ad48f1bf4f3ad19` |
| `drill.mjs` | `c39c00403ea5bfee144b7252848a1fa9c9921a2b1bc6af3d725b4b0d116afdd1` |
| `common.mjs` (shared by the three scripts) | `6a91a835c55b4fa09ed0796b1680fba1b0632be19bc0e4cf75489c39acf3bdcf` |
| `control-recheck.mjs` | `91e69fc1afb0ab48a61881225cc083c906c3d4c5d0f4cb9c76407499f8227689` |
| `post-run-checks.mjs` | `eb27f8d420dc4801ab63e3fe85f09418441a42b52b9172d05b1dd7af0d87fb70` |
| `fonts.conf` (`<scratchpad>/fonts.conf`; the copy in the tools folder is identical) | `a60015358b11152917a9613f34f733c1ab884d140fb9c5be15fb1cc58085593a` |

`tools.sha256` was written just before the run. `sha256sum -c` against it after the run reported every file OK.

- **The server** serves one `dist` under `http://127.0.0.1:4391/Orbitlab/`.
  - Headers: `Cache-Control: max-age=600`, `ETag` (the first 16 hex characters of the file's SHA-256), `Last-Modified` (the file's mtime), `Accept-Ranges`, `Access-Control-Allow-Origin: *` and `Vary: Accept-Encoding`.
  - It answers 304 on a matching `If-None-Match`. There is no SPA fallback: a path with no file gets 404.
  - `deploy()` switches the folder it serves. It logs every request with the build being served.
- **The browser.**
  - Playwright 1.63.0 (`/opt/node-tools/node_modules/playwright`), `chromium.launchPersistentContext` on one user-data folder (`run-candidate-9b224ec/profile/`). The browser is closed after each step and opened again on the same folder.
  - Chrome for Testing 158.0.8127.36 headless shell, with the harness's flags `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`.
  - Viewport 1280×900, scale 1, locale en-GB, service workers allowed.
  - With `FONTCONFIG_FILE`, `fc-match system-ui` gives DejaVu Sans; without it, Inter.
  - The machine: 4 CPUs, Intel Xeon @ 2.10GHz, KVM.
- **The init script** is the harness's WebMCP stand-in. On the first visit only, when `localStorage` is empty, it sets the guide to dismissed and the language to English (`orbitlab.lang` `en`). Later visits write nothing.
- **What the drill does not do.** It presses the FX-7 Reload button. It never calls `skipWaiting` and never clears caches or storage.
- **What is recorded** is what this file's "What is recorded" lists. Two additions:
  - the route at each worker reading;
  - the paths in `orbitlab-runtime`, read only: `caches.has` is checked first, because `caches.open` would create the cache.

```sh
# T = <scratchpad>/gk1/tools/revert-drill, R = <scratchpad>/gk1/revert-drill
cd $T && OUT=$R/run-candidate-9b224ec PORT=4391 FONTCONFIG_FILE=<scratchpad>/fonts.conf \
  timeout 3000 node drill.mjs > $R/run-candidate-9b224ec.out 2>&1      # exit 0, 2026-11-25 19:20:35–19:24:01Z
```

### Steps and evidence (candidate 9b224ec, run of 2026-11-25 19:20–19:24Z)

#### Step 1: candidate 9b224ec, a learner takes the placement test

- **The first visit.** The visit at `#/lessons` installed the candidate's worker, which took the page:
  - `data-build` `9b224ece`, worker version `0016d202bac189`, complete 72 of 72, `pageMatches` true;
  - caches: `orbitlab-precache-0016d202bac189`.
- **A new learner.** The app opened on `legacy-v1` ("Learner 1"), the only one, with no `orbitlab.lessons` yet. The record's `revision` was 1.
- **The test begun.** Lessons → "Take the placement test" → "Start the test". At once the stored test carried `"revision":1` with 0 answers:
  - value SHA-256 `3367cacc…2b8e3f54`, 1 211 bytes;
  - test bytes `76f808a3…9f205138`, 1 128 bytes.
- **The answers.** All 25 questions were answered with the page's own controls, in a fixed pattern of options, numbers, orderings and confidences. The confidence cycle was sure, unsure, sure, guess. Each question's Next/Finish button was used. No predict-then-observe screen came up with this draw (E9).
- **The finished value** is 2 369 bytes, SHA-256 `85a4f6d6bdbb3d302289a7ca21c47d2c6c2faa7200a2d36bb3aa5e929e9a9943`.
  - The test's bytes are 2 286 bytes, SHA-256 `114df700116fbfe1766d4ff93464b53d913a33e63ff4015922dd26cbd2005c5c`. They begin `{"revision":1,"kind":"pre","seed":464526272,…`.
  - `finishedAt` is `2026-11-25T19:20:50.286Z`.
- **Result page.** "Score 16 % — start with Space basics", then "4 of 25 questions right · misconceptions: 4.". The eyebrow reads "Placement test · 11/25/2026". The area bars:

  | Area | Right | Misconceptions | Score | Level |
  |---|---|---|---|---|
  | 1 Space basics | 0 of 5 | 2 | 0 % | Beginner |
  | 2 Orbital mechanics | 1 of 4 | – | 33 % | Beginner |
  | 3 Rocket performance and the atmosphere | 0 of 4 | 1 | 0 % | Beginner |
  | 4 Guidance and navigation | 1 of 4 | – | 25 % | Beginner |
  | 5 Attitude control | 1 of 4 | – | 25 % | Beginner |
  | 6 Failures and safety | 1 of 4 | 1 | 17 % | Beginner |

  - The catalogue card read "Latest test: 16 %. Recommended start: 1.1 Your first orbit.".
  - WebMCP `get_assessment_result` gave `taken` true, `percent` 16, `start` `orbit-first`, `startArea` 1, and 4 misconceptions (`b-what-holds`, `b-multi-freefall`, `r-g-peak`, `f-maxq-danger`).
  - The four cards:
    - Strengths: "No area is at the proficient level yet."
    - To work on: 6 lines.
    - Misconceptions (wrong, and sure of it): 4 lines.
    - Recommended path: 24 chips (★ 1.1 `start`, the rest `review`).
- **Reload.** A reload left the value byte for byte (`85a4f6d6…`).

The full stored value at the end of step 1 (`stored/step1-finished.json`):

```json
{"version":1,"lessons":{},"assessments":[{"revision":1,"kind":"pre","seed":464526272,"startedAt":"2026-11-25T19:20:47.672Z","questions":[{"id":"b-order-altitude","order":[1,0,4,3,2]},{"id":"b-what-holds","order":[1,0,3,2]},{"id":"b-black-sky","order":[2,3,1,0]},{"id":"b-kepler2","order":[2,3,1,0]},{"id":"b-multi-freefall","order":[3,2,4,1,0]},{"id":"o-order-period","order":[1,0,3,4,2]},{"id":"o-ellipse-raise","order":[0,1,2,3]},{"id":"o-molniya","order":[2,1,3,0]},{"id":"o-nodal-regression","order":[0,2,1,3]},{"id":"r-tsiolkovsky","order":[1,0,3,2]},{"id":"r-gravity-loss","order":[1,0,2,3]},{"id":"r-g-peak","order":[0,3,1,2]},{"id":"r-q-calc","values":{"v":550,"rho":0.24}},{"id":"g-gravity-turn","order":[2,0,3,1]},{"id":"g-kalman","order":[0,1,3,2]},{"id":"g-monte-carlo","order":[1,0,3,2]},{"id":"g-gyro-bias","order":[3,2,1,0]},{"id":"c-pid-d","order":[2,3,0,1]},{"id":"c-step-terms","order":[0,2,1,3]},{"id":"c-phase-margin","order":[3,0,1,2]},{"id":"c-multi-phase","order":[2,1,3,0,4]},{"id":"f-fts","order":[3,1,2,0]},{"id":"f-challenger","order":[2,0,1,3]},{"id":"f-maxq-danger","order":[2,3,1,0]},{"id":"f-common-mode","order":[3,1,2,0]}],"answers":[{"id":"b-order-altitude","value":"0,4,3,2,1"},{"id":"b-what-holds","value":2,"confidence":"sure"},{"id":"b-black-sky","value":1},{"id":"b-kepler2","value":3,"confidence":"unsure"},{"id":"b-multi-freefall","value":"3,4","confidence":"sure"},{"id":"o-order-period","value":"0,3,4,2,1"},{"id":"o-ellipse-raise","value":2,"confidence":"guess"},{"id":"o-molniya","value":1},{"id":"o-nodal-regression","value":0,"confidence":"sure"},{"id":"r-tsiolkovsky","value":2},{"id":"r-gravity-loss","value":2,"confidence":"unsure"},{"id":"r-g-peak","value":3,"confidence":"sure"},{"id":"r-q-calc","value":7.8},{"id":"g-gravity-turn","value":1},{"id":"g-kalman","value":3,"confidence":"guess"},{"id":"g-monte-carlo","value":0,"confidence":"sure"},{"id":"g-gyro-bias","value":3,"confidence":"unsure"},{"id":"c-pid-d","value":1},{"id":"c-step-terms","value":1},{"id":"c-phase-margin","value":0,"confidence":"sure"},{"id":"c-multi-phase","value":"0,1","confidence":"guess"},{"id":"f-fts","value":0},{"id":"f-challenger","value":1},{"id":"f-maxq-danger","value":3,"confidence":"sure"},{"id":"f-common-mode","value":3,"confidence":"unsure"}],"finishedAt":"2026-11-25T19:20:50.286Z"}],"customLessons":[],"customQuestions":[]}
```

#### Step 2: roll back to `408ad16` (before 2a)

- **Deploy and update.** The server switched to `408ad16`'s `dist` at 19:21:03Z, and the browser was opened again on the same profile at `#/lessons`.
  - **The first page** still ran the candidate from its precache: `data-build` `9b224ece`, worker `0016d202bac189`. The caches were `orbitlab-precache-0016d202bac189` and `orbitlab-runtime`.
  - **The new worker.** The new `sw.js` was fetched (200 at 19:21:17Z), and the `408ad16` worker installed and waited: version `0fc2847196867c`. The caches were then `orbitlab-precache-0016d202bac189`, `orbitlab-precache-0fc2847196867c` and `orbitlab-runtime`.
  - **What the install downloaded:** 25 files besides `sw.js`, namely `index.html` and 24 changed files under `assets/` (23 scripts and `index-*.css`). The list is in `drill-log.jsonl` (`install-downloads`). Every other file came from the old cache.
  - **The offer.** The page offered "A new version of Orbitlab is ready. Reload" at 19:21:18Z.
  - **After Reload** the page ran `408ad16`, with worker `0fc2847196867c` complete 68 of 68 and `pageMatches` true.
  - **The old precache was deleted.** The caches were `orbitlab-precache-0fc2847196867c` and `orbitlab-runtime`.
  - **Later requests.** The page then fetched `home/lessons.en.webp` (19:21:20Z) and `home/orbit.en.webp` (19:21:41Z), which are on demand. A later `sw.js` check answered 304 (19:21:32Z).
- **Reads, no writes.**
  - The same learner opened (`legacy-v1`, the only one).
  - The stored value on opening, after loading `408ad16` and after showing the result was `85a4f6d6…` every time: step 1's bytes exactly. No recovery copy was made.
- **Same result.** The card, eyebrow, headline, summary, six area bars, four cards and the whole WebMCP answer were identical to step 1. Only the path card's legend text differs, as a static string (E4).
- **The old build saves, twice.**
  - **Lesson 1.1 opened.** Lessons → 1.1 Your first orbit (the page went to `#/launch/explore`). Opening the lesson saved.
    - The value became 2 427 bytes, SHA-256 `80c6002f…e50a55be`.
    - `lessons` is now `{"orbit-first":{"attempts":0,"hintsShown":0,"passed":false}}`.
  - **The hint.** Then "💡 Hint 1/3"; the button then read "💡 Hint 2/3". The value is 2 427 bytes, SHA-256 `784aeab6…a97ceaa3`, with `hintsShown` 1.
  - **The test at both saves.** Its bytes are unchanged (`114df700…`), appear literally in the value and still hold `"revision":1`. No recovery key appeared.
  - So `408ad16`, which has no `revision` in its types, kept a field it does not know.
- **After the save.** The result was the same after the hint save, and the value was the same after a reload (`784aeab6…`).

#### Step 3: roll back to `c5da5bb` (2a only)

- **Deploy and update** (19:22:08Z), the same flow as step 2.
  - The first page ran `408ad16` (worker `0fc2847196867c`).
  - The new `sw.js` was fetched (200 at 19:22:17Z). The install downloaded 15 files besides `sw.js`: `index.html` and 14 scripts.
  - The offer came at 19:22:18Z. After Reload the page ran `c5da5bb` with worker `0eed9ed5c1b44e`, complete 68 of 68, `pageMatches` true.
  - Caches: `orbitlab-precache-0eed9ed5c1b44e` and `orbitlab-runtime`.
- **Reads, no writes.**
  - The same learner opened.
  - The value on opening, after loading and after showing the result was `784aeab6…` each time (what `408ad16` left).
  - Opening lesson 1.1 did not change it, because its entry already existed.
- **Same result**: the same card, eyebrow, headline, summary, bars, four cards and WebMCP answer as step 1. This build's reader reads `"revision":1` as revision 1, and the control below shows that it does read the field.
- **The 2a build saves.** Hint 2/3; the button then read "💡 Hint 3/3".
  - The value is SHA-256 `80980b8c…6e83b562` with `hintsShown` 2.
  - The test's bytes are unchanged (`114df700…`) with `"revision":1`, and there is no recovery key.
  - The result was the same after the save, and the value was the same after a reload.

#### Step 4: roll forward to candidate 9b224ec

- **Deploy and update** (19:23:00Z).
  - The first page ran `c5da5bb` (worker `0eed9ed5c1b44e`).
  - The install downloaded only `sw.js` (200 at 19:23:09Z) and `index.html` (19:23:10Z). The candidate's other files were still in the profile's HTTP cache from step 1 and matched their revisions.
  - The offer came at 19:23:10Z. After Reload the page ran `9b224ece` with worker `0016d202bac189`, complete 72 of 72, `pageMatches` true.
  - Caches: `orbitlab-precache-0016d202bac189` and `orbitlab-runtime`.
- **Reads, no writes.** The same learner opened. The value on opening, after loading, after showing the result and after opening lesson 1.1 was `80980b8c…` each time (what `c5da5bb` left).
- **Same result** as step 1 on every field compared.
- **The candidate saves.** Hint 3/3; the button then read "No more hints".
  - The value is SHA-256 `6958b9194122e5b0fd3dcbaa3b30369dd2b0ae6dbcfe8a28ff0ac4393914f392` with `hintsShown` 3.
  - The test's bytes are unchanged (`114df700…`): the writer stamps new tests only.
  - The result was the same, and the value was the same after a reload.

#### The on-demand files and `orbitlab-runtime` across the rollbacks

This subsection is new for C (§16.4 step 7).

- **What step 1 put in the runtime cache.** During the first visit on C, the page fetched `anatomy/soyuz-2-1a-soyuz-ms.exterior.bin` (313 200 B, 19:20:36.883Z) and four landing pictures (`home/{watch,explore,engineer,structure}.en.webp`). At the opening of step 2, `orbitlab-runtime` held these five files.
- **On the old builds.** Their activations deleted only the other precaches (`prune`, `src/pwa/sw-core.ts`, unchanged). So `orbitlab-runtime` kept C's `anatomy/` mesh and `home/structure.en.webp` through `408ad16` and `c5da5bb`.
  - Those builds route `anatomy/` and `structure/` to the network, because these are not on-demand prefixes there (`routeFor`). Their `dist` has neither folder.
  - The server log shows no request for `anatomy/` or `structure/` after step 1. So nothing read or refreshed those entries on the old builds or after the roll forward.
- **At the end of step 4**, `orbitlab-runtime` held `anatomy/soyuz-2-1a-soyuz-ms.exterior.bin` and `home/{engineer,explore,lessons,orbit,structure,watch}.en.webp`.
- **No `structure/` file was fetched**, because the Structure section was never opened.

#### The round trip, end to end

- **Test bytes.** The test's bytes at the end equal step 1's: SHA-256 `114df700116fbfe1766d4ff93464b53d913a33e63ff4015922dd26cbd2005c5c` at all 20 reads from the finish to the end.
- **The whole value.** At the end it equals step 1's value except `lessons`, which holds the history that the lesson opening and the three hint saves wrote.
  - The drill compares the parsed values with `lessons` set aside (`isDeepStrictEqual`).
  - Offline (`post-run-checks.json`), step 1's `"lessons":{}` (it occurs once) was replaced with `"lessons":{"orbit-first":{"attempts":0,"hintsShown":3,"passed":false}}`. That gives the end value byte for byte: 2 369 → 2 427 bytes, `85a4f6d6…` → `6958b919…`.
- **The result.** All seven readings of the result were identical: step 1, then steps 2, 3 and 4 each before and after that build's own saves. `sameScore` compares the card, eyebrow, headline, summary, six bars, four cards and the whole WebMCP answer. The offline check found every recorded field identical in all seven, apart from the path legend (E4).
- **No write on read.** No build wrote `orbitlab.lessons` on opening, on loading, on showing the result or on reloading. That is 13 reads, each compared with the read before it.
- **The record.** It held one learner throughout, with no `orbitlab.structure.v1` key and no recovery key at any of the 21 reads with a value. Its keys were `orbitlab.guide.v1`, `orbitlab.lang`, `orbitlab.lessons`, `orbitlab.mode`, then `orbitlab.mission` and `orbitlab.section` from the lesson opening on.
- **Other keys.** The record's own `revision` counter rose on page loads as well as on saves: 29 at the end of step 1, 63 at the end. `orbitlab.lessons` did not change on those loads.

| Read | Build running | `orbitlab.lessons` SHA-256 | Test bytes SHA-256 | `"revision":1` | Recovery key |
|---|---|---|---|---|---|
| step 1, test begun | candidate 9b224ec | `3367cacc…` (1 211 B) | `76f808a3…` (no answers) | yes | none |
| step 1, finished | candidate 9b224ec | `85a4f6d6…` (2 369 B) | `114df700…` | yes | none |
| step 1, after reload | candidate 9b224ec | `85a4f6d6…` | `114df700…` | yes | none |
| step 2, opened (before Reload) | candidate 9b224ec | `85a4f6d6…` | `114df700…` | yes | none |
| step 2, loaded | `408ad16` | `85a4f6d6…` | `114df700…` | yes | none |
| step 2, after showing the result | `408ad16` | `85a4f6d6…` | `114df700…` | yes | none |
| step 2, lesson 1.1 opened | `408ad16` | `80c6002f…` (2 427 B) | `114df700…` | yes | none |
| step 2, after its own save (hint 1) | `408ad16` | `784aeab6…` (2 427 B) | `114df700…` | yes | none |
| step 2, after reload | `408ad16` | `784aeab6…` | `114df700…` | yes | none |
| step 3, opened (before Reload) | `408ad16` | `784aeab6…` | `114df700…` | yes | none |
| step 3, loaded | `c5da5bb` | `784aeab6…` | `114df700…` | yes | none |
| step 3, after showing the result | `c5da5bb` | `784aeab6…` | `114df700…` | yes | none |
| step 3, lesson 1.1 opened | `c5da5bb` | `784aeab6…` | `114df700…` | yes | none |
| step 3, after its own save (hint 2) | `c5da5bb` | `80980b8c…` | `114df700…` | yes | none |
| step 3, after reload | `c5da5bb` | `80980b8c…` | `114df700…` | yes | none |
| step 4, opened (before Reload) | `c5da5bb` | `80980b8c…` | `114df700…` | yes | none |
| step 4, loaded | candidate 9b224ec | `80980b8c…` | `114df700…` | yes | none |
| step 4, after showing the result | candidate 9b224ec | `80980b8c…` | `114df700…` | yes | none |
| step 4, lesson 1.1 opened | candidate 9b224ec | `80980b8c…` | `114df700…` | yes | none |
| step 4, after its own save (hint 3) | candidate 9b224ec | `6958b919…` | `114df700…` | yes | none |
| step 4, after reload | candidate 9b224ec | `6958b919…` | `114df700…` | yes | none |

#### Control: the 2a build reads the field

- **The setup.** After step 4 the drill switched the server to `c5da5bb` (19:23:53Z). It opened a separate, throwaway browser context with its own storage and service workers blocked, not the drill's profile.
- **The seed.** It seeded that context with the drill's final storage (`stored/step4-localStorage.json`), changing only the test's `"revision":1` (it occurs once) to `"revision":2`. The seed's SHA-256 is `2101f44071a0a93d9e9a76f5aad237c802bc2882400a59195beae22acb3f32fe`, 2 427 B.
- **What the page showed.** The `c5da5bb` page (`data-build` `c5da5bb4`) did not show the test:
  - the card offered "Not sure where to start? A 25-question test …";
  - WebMCP gave `{"taken":false}`.

**The control re-check** added a storage read-back and a revision-1 twin:

```sh
cd $T && OUT=$R/control-recheck PORT=4392 FONTCONFIG_FILE=<scratchpad>/fonts.conf \
  timeout 900 node control-recheck.mjs $R/run-candidate-9b224ec/stored/step4-localStorage.json legacy-v1 > $R/control-recheck/run.out 2>&1
# exit 0, 2026-11-25 19:24:10–19:24:43Z
```

It served the same `c5da5bb` `dist` (`sw.js` `28c065fc…e05ffecc`), with the same browser, flags and throwaway context, workers blocked. Each seeding was in a fresh context, followed by a reload and a read back:

| Seeded revision | Page | Seed landed before the reload | Stored value after the reload | Card | WebMCP |
|---|---|---|---|---|---|
| 2 | `c5da5bb4` | yes | the seed byte for byte (`2101f440…`, 2 427 B), revision 2, no recovery key | "Not sure where to start? …" | `taken:false` |
| 1 | `c5da5bb4` | yes | the seed byte for byte (`6958b919…`, the drill's final value), revision 1, no recovery key | "Latest test: 16 %. Recommended start: 1.1 Your first orbit." | `taken:true`, `percent` 16, `start` `orbit-first` |

There was no page error in either context. Eight console messages were set aside (Playwright's blocked-worker note and SwiftShader GL notes, E5). Same storage, same seeding, and only the revision differs. So the 2a build shows the revision-1 test and hides the revision-2 one while keeping its bytes.

### Result

| Step (S17 rule 4) | Check | Build used | Result | Evidence |
|---|---|---|---|---|
| 1 | Install the candidate and create a test that has a revision. | candidate 9b224ec | **pass** | test begun and finished with `"revision":1`; score 16 %, 4 of 25, misconceptions 4 |
| 2 | Install the previously published build. The data must read, or open read-only, not be overwritten, and keep unknown fields. | `408ad16` (before 2a), in place of the build published before C: **variance V1** | **pass** on `408ad16` | worker `0fc2847196867c` through the app's update offer; same learner, same result and score; no write on load or view (`85a4f6d6…`); after its own saves (lesson opening, hint 1) the test bytes are unchanged with `"revision":1` (`114df700…`) |
| 2 | (same item) | `c5da5bb` (2a only): **variance V1** | **pass** on `c5da5bb` | worker `0eed9ed5c1b44e`; same result and score, read as revision 1; control: a revision-2 test is hidden, and the re-check with read-back and a revision-1 twin shows the seed landed and the field is read; after its own save the test bytes are unchanged |
| 3 | Go back to the candidate. The stored bytes must be equal. | candidate 9b224ec | **pass** for what was shown: no build wrote on load or view, and the test's bytes are equal; the whole value is not byte-equal to step 1's, because the drill's own saves changed `lessons` | worker `0016d202bac189`; value on opening = what `c5da5bb` left (`80980b8c…`), unchanged after loading and showing the result; test bytes = step 1's (`114df700…`) at all 20 reads from the finish; whole value = step 1's plus the drill's lesson history, byte for byte by replacing `lessons` (`post-run-checks.json`) |

**Checks.** 50 of 50 checks passed.

- **By part:** step 1, 8; steps 2, 3 and 4, 12 each; round trip, 4; control, 1; page errors and console, 1. Every check is named in `steps.json`; E6 says how the list differs from the 56 of the 1842a86 run.
- **Errors and requests.** There was no page error. There was no console error or warning other than 17 that were set aside: 16 SwiftShader "GL Driver Message (OpenGL, Performance …)" notes and Playwright's blocked-worker note in the control (E5). No request left 127.0.0.1.
- **Earlier runs.** Two full trial runs came first (E2, E8). The control re-check (2 of 2 rows) and the offline post-run checks (5 of 5) came after the run and are not among the 50.

2b's rollback line holds as written in its report (`FX-2-s2b-m-learning-027-writer.md:150`): "Revert the fix commit. Tests begun while it was live keep `"revision": 1`. Every build reads that as revision 1 or keeps it unread, … so nothing needs migrating." This was shown for the test and the lesson progress. For K2's new Structure record, see "Limits".

### Departures from the 1842a86 method

- **E1. Tools written again.** The tools of the earlier runs were never committed. They were written again from this file's text, so their hashes differ (table above).
  - Shared code is in `common.mjs`.
  - The ETag is a content hash, as in D3.
  - The fontconfig file is the one the session gave, `<scratchpad>/fonts.conf` (`a6001535…`). Its behaviour is the same: `system-ui` and `sans-serif` map to DejaVu Sans, and Inter is rejected. It is not the 1842a86 run's file (`31ff3213…`).
- **E2. Each visit opens at `#/lessons`.** In the 1842a86 run each visit opened the bare URL.
  - **What trial 1 showed.** Trial 1 (18:58–19:08Z) used the bare URL. In its step 3 the `408ad16` page opened on lesson 1.1's flight view (`#/launch/explore`), as the app restores it. Chromium then sent no request for `sw.js` for 300 s, so no update offer came and the run stopped (`trial1.out`).
  - **The probes.** On copies of trial 1's profile, a probe opening the bare URL saw no `sw.js` request in 146 s. A probe opening `#/lessons` fetched it within seconds (`tools/revert-drill/probe/`).
  - **Why, and what it means.** Chromium's update check on navigation is likely held back while the flight view keeps the page busy, but that was not shown. In the field, a learner whose app opens into a flight may not see the offer until the hourly `registration.update()` (`src/pwa/register.ts:44`). That was not tested here.
- **E3. Stamps have 8 characters** (`9b224ece`, `408ad16b`, `c5da5bb4`): `git rev-parse --short` gives 8 in this clone now. The 1842a86 run had 7 (its D1).
- **E4. The path card's legend is left out of `sameScore`.** #223 changed the static text `assess.pathLegend` from "… gold ★: start here …" (`408ad16`, `c5da5bb`) to "… ★: start here …" (C). Trial 1's result comparison failed on that alone. The legend is now recorded separately (`legend`) and is outside the comparison. Every scored field, the cards, the chips and the WebMCP answer included, is still compared.
- **E5. Console messages set aside.** As in D8, Playwright's "Service Worker registration blocked by Playwright" is set aside: once in the drill's control, and in the re-check's eight. SwiftShader's "GL Driver Message (OpenGL, Performance, …): GPU stall due to ReadPixels" notes from the WebGL scene are also set aside (16 in the run). Neither comes from the app's code.
- **E6. The check list.** There are 50 checks, not 56. The `sw.js` downloads and runtime-cache contents are recorded but are not checks. The no-write comparison covers 13 reads, one more than the 1842a86 run's 12, because it includes step 1's reload. The counts cannot be compared one for one.
- **E7. No reference build compared.** The 1842a86 run compared its fresh candidate build with another stage's build (D2). Here the only other C build (`<scratchpad>/wt-C`) had been rebuilt with a local switch, so it was not used. File lists are in `builds/files-*.sha256`.
- **E8. Trials.**
  - **Trial 1** (exit 1, 20 of 23) failed on E2 and E4. Its Node process (an idle browser context, its server closed) lingered until 19:20:24Z, when it was killed before the run.
  - **Trial 2** (19:15:12–19:19:57Z, 50 of 50, exit 0) passed with a different test (7 %, 2 of 25). It ran while trial 1's process was still alive, and before the runtime-cache read was added to `drill.mjs`.
  - **The run** is the third full run and was alone on the host. The control re-check and the post-run checks followed it one at a time.
- **E9. The test.** A new seed and the pattern gave 16 % (4 of 25, misconceptions 4), with every area at "Beginner". No predict-then-observe screen came up in this draw, so the drill's path through one was not exercised.
- **E10. Browser.** Chrome for Testing 158.0.8127.36 headless shell. The 1842a86 run used 153.0.8010.12.
- **E11. Pages bytes not compared**, as in D11: this run did not read the Pages build of C.

### Limits

- **Local builds, not the Pages bytes.** The three builds were made from the committed data snapshots (`build-info.json` data dates 2026-09-26 and 2026-09-24). Their stamps are compiled in, as before.
- **Not github.io.** The builds were served from `127.0.0.1:4391` by a server that copies Pages' caching headers. A real rollback goes through a revert on main and a Pages run, and would carry a new stamp. A revert of 2b on main now would publish `c5da5bb`'s assessment code inside K2's app: 105 files of `src/` differ from `c5da5bb`.
- **One browser.** Chromium 158 headless shell only, one learner, English. Each step closed the browser and came back. A tab left open would get the offer from the hourly check, which was not waited for.
- **Two kinds of old-build save**, as before: the lesson opening and a hint, both through `lesson-mode`. Resuming an unfinished test on an old build, follow-up tests, project archives, profile backups and the results file were not exercised in the browser.
- **Revision 1 only.** `BANK_REVISION` is 1 at `c5da5bb` and at C. No build here writes a revision another cannot read. The control shows only that the 2a build hides a revision-2 test.
- **`src/pwa/manifest.ts` differs at C.**
  - C treats `anatomy/` and `structure/` as on-demand, so it keeps them in `orbitlab-runtime` once fetched. `408ad16` and `c5da5bb` do not; to them those paths are network paths that their `dist` lacks.
  - In the drill, C's runtime copy of `anatomy/soyuz-2-1a-soyuz-ms.exterior.bin` survived both rollbacks unused and was still there after the roll forward.
  - Offline behaviour on an old build of a page that C had fetched on demand, and a fetch of those paths while an old build is served, were not exercised.
- **K2's new stored key `orbitlab.structure.v1`** (#217; `src/workspace/registry.ts:12`, `src/workspace/repository.ts:71`) is outside the drill and carried to GK2. S17 rule 4 is not in force while the rest of R7.2 is not authorized.
  - **Not exercised.** The drill never opened the Structure section, and no record held the key at any read.
  - **By reading the code only.** At `408ad16` (and `c5da5bb`) `parseRecord` treats a profile record whose `values` hold a key not in their `WORKSPACE_KEYS` as `invalid` (`src/workspace/repository.ts:52` at `408ad16`). On opening, such a record is left as it is and the visit opens on another learner, or on a new "Learner 1" if no other is readable (`:262-292` at `408ad16`). So a learner who used Structure on C and was then rolled back past #217 would probably not see their test or progress on the old build, though the bytes would not be overwritten. This is a question for GK2's drill, not a result.
- **Pattern answers.** The answers followed a fixed pattern through the page's controls, not a real learner. The score is low (16 %), every area is "Beginner", and it has four misconceptions to compare.
- **Owner checks.** This is not a gate decision. G7 item 2's old-worker reload on the live site stays the owner's.

### Files (local, not committed)

In `<scratchpad>/gk1/revert-drill/`:

- **The run:**
  - `run-candidate-9b224ec.out` (with `.start`, `.end`, `.exit`): the console of the run, with every check line;
  - `run-candidate-9b224ec/drill-log.jsonl`: each record with its time: deploys, service-worker states with the route and `orbitlab-runtime`, stored reads, results, update offers, install downloads, hints, console messages;
  - `run-candidate-9b224ec/steps.json`: everything above, with the 50 checks;
  - `run-candidate-9b224ec/stored/`: the exact `orbitlab.lessons` string and the test's bytes at each of the 21 reads with a value (`<step>-<moment>.json`, `.test.json`), each step's full `localStorage` (`step2..4-localStorage.json`, `final-localStorage.json`) and `control-seed.json`;
  - `run-candidate-9b224ec/shots/`: 16 screenshots: the catalogue and first question, each result reading, each update offer, each hint save and the control;
  - `run-candidate-9b224ec/server.log` and `server-log-summary.json`: every request with the build served, the deploys and the `sw.js` fetches;
  - `run-candidate-9b224ec/profile/`: the browser profile (62 MB).
- **The builds:** `builds/` holds the build logs and times, `files-*.sha256`, `precache-*.json`, `ondemand-*.txt` and `builds-summary.txt`. The worktrees and their `dist` folders were removed.
- **The git checks:** `app-input-diffs.txt` holds the `git diff`/`log`/`grep` commands of "What is the same …", with their output and exit codes.
- **The trials:** `trial1/` and `trial1.out` (with `.start`, `.end`, `.exit`, `.note`): 20 of 23. `trial2/`, `trial2.out` and `trial2-post.json`: 50 of 50.
- **After the run:**
  - `control-recheck/`: `control-recheck.json`, `run.out`, `server.log`, two screenshots, `start`/`end`/`exit`;
  - `post-run-checks/`: `post-run-checks.json` (5 of 5: whole value by byte replacement, all seven readings on every field, the legends, the whitespace sabotage, the record keys), `start`/`end`/`exit` and `tools.sha256`.
- **The sabotage check.** One space added inside the stored test changes the value's SHA-256 (`85a4f6d6…` → `3a347246…`) and makes the literal check fail (true → false). The test's own SHA-256 (`114df700…`) does not change, because the test is re-serialized before hashing. So the value hash, not the test hash alone, is what sees it.
- **Tools and host:**
  - `tools.sha256`: the hashes of every tool and of `fonts.conf`. The tools are in `<scratchpad>/gk1/tools/revert-drill/`, with the probes of E2 in `probe/`.
  - `host.txt`, `main-status-*.txt`, `main-head-*.txt`, `worktrees-*.txt` and `cleanup.log`.

## Why this drill

- **G7 item 1** (adopted, `S05:192` on main): "storage migration and old-cache compatibility pass before a release that changes the schema". 2b is the first writer of a new stored field in K1 (`revision` on a placement test).
  - This drill is not that before-release pass. The writer `a05ae70` was already published (Pages 40357991698, publish job end 2026-10-26T16:55:53Z), three days before this run (2026-10-29T23:21Z).
  - G7 item 1's evidence is 2b's pre-merge report (`docs/development/reports/FX-2-s2b-m-learning-027-writer.md`) and 2a's old-record tests passing on the candidate (`tests/assessment-revision*.test.ts`, in the unit jobs of Pages 40957726247 at `1842a86`: 334 files, 10 526 tests; 11 of 11 jobs passed).
  - The drill on `1842a86` (2026-10-29 23:21–23:26Z) repeats on the candidate the drill that draft S17 rule 4 asks for at the wave's GK: "ที่ GK ของคลื่นนั้นต้องซ้อมซ้ำบน candidate ที่ตรึง" (at the wave's GK, the drill is repeated on the frozen candidate). `1842a86` is the candidate by the owner's answer of 2026-10-29; no freeze is recorded for it. It was run on the owner's "Redo all (Recommended)" (2026-10-29). The run of 2026-10-26 on `7263004` was that repeat until the candidate moved.
- **Draft S17 at `c2af8ae`** (`docs/development/plan-v2-draft/sections/S17-r7-quality-release.md`): pre-v1.0 rollback rule 4 (`S17:171`) asks for a revert drill on the frozen candidate for every schema bump, "โดยใช้ `dist` ของ candidate และของ SHA ที่เผยแพร่ก่อนหน้า" (using the `dist` of the candidate and of the previously published SHA).
  - Its steps: install the candidate and make N+1 data; install the previous build, where the data must read (or open read-only), not be overwritten, and keep unknown fields; go back to the candidate, where "ค่าที่เก็บต้องเท่าเดิมทุกไบต์ (วิธีของ EO-STO-2)" (the stored value must be unchanged byte for byte, by EO-STO-2's method).
  - The results go in "`revert-drill-<GK>.md` และ `R7.1-<GK>.md`".
  - Its GK1 row (`S17:327`) names `revert-drill-GK1.md` "if R1.6 or FX-2 starts writing a new format in the wave".
  - The rule applies from when the owner authorizes R7.2 (`S17:163`, `S17:177`), and R7.2 is not authorized. The owner asked for the drill anyway (P2 ข), and for its redo on `1842a86` ("Redo all (Recommended)").
- **EO-STO-2 is not built.** S07 defines it as a diff of the storage record after a journey, with a sabotage check that adds whitespace to the record (`S07:310`). `docs/development/reports/R1.6-pr4-read-once.md:48` says it is not built yet, and `R7.1-GK1.md:75` says it is not merged.
  - Here a SHA-256 of the raw stored string stands in for it, with a check that the test's bytes appear literally in that string.
  - After the run, the stand-in was tried against EO-STO-2's sabotage on step 1's saved value (`post-run-checks.json`). One space added inside the stored test changes the value's SHA-256 (`437dc4fe…` → `65feb31e…`) and makes the literal check fail. The test's own SHA-256 (`da9e8c32…`) does not change, because the drill re-serializes the test before hashing it, so it alone would not see the sabotage.
- **`R7.1-GK1.md` gets no line.** The rule is not in force (R7.2 is not authorized), and the owner's answer P2 asks for `revert-drill-GK1.md` only (`DECISIONS.md:366` at `5092ac9`).
- The table under "Result" gives rule 4's three steps in English and maps them to the steps below.

## What was rolled back to, and why these builds

| Build | SHA | What it is | Published |
|---|---|---|---|
| candidate 1842a86 | `1842a86cee5a1dc4fd40d536d2bc882d31750021` | #185 on #179, #180 and #177 (2b) | Pages 40957726247, `deploy-pages` 2026-10-29T21:49:41Z |
| 2a only | `c5da5bb4b7cd78e45d030b2747020e7e6ac9994e` | #176, the reader | Pages 40340692641, publish job end 2026-10-26T15:10:24Z |
| before 2a | `408ad16b90fd72b934f947afc2ed13efc4a7584a` | #174 | Pages 40228322904 (daily refresh at `408ad16`, publish job end 2026-10-25T20:28:25Z) |

The live site is still Pages 40957726247's build of `1842a86` (2026-11-04: it is `bc63d8a` now, "Owner checks" below; later that day it became `8dcc4b2`, published by Pages 41908317604 at 21:03:22Z; 2026-11-05: `5588be1` from 10:52:24Z (Pages 42009007666), `7d12951` from 18:00:02Z (Pages 42064589225, attempt 3), then `fa3c486` from 19:15:12Z (Pages [42087327369](https://github.com/ROYIN001/Orbitlab/actions/runs/42087327369), the push of #209: 11 of 11 jobs, 38 of 38 journeys; #208's run 42086061932 was cancelled by it)) (2026-11-06: main is `d01019a4` after #210, #212 and #213, and #213 changes `src/`; the live site became `4476540` at 06:00:42Z (Pages 42168605010) and `4b7b66c` at 20:43:36Z (Pages 42286344470), then `d01019a4` from 22:33:31Z (Pages 42301024823, the push of #213: 11 of 11 jobs, 38 of 38 journeys); the schedule run 42124771467 at `b195875` published nothing. No candidate is frozen.) (2026-11-07: main is `cec4b572` after #214, and #214 changes `src/`; #215 (`56887ba`, Markdown only) started no run, and the live site became `cec4b572` from 04:38:40Z (Pages 42337488870, the push of #214: 11 of 11 jobs, 38 of 38 journeys). No candidate is frozen.) The scheduled refresh at `1842a86` (Pages 40962284621) failed in browser shard 2 (`r3-first-launch`), so its `verify` ran and failed (its `aggregate.mjs` step, 22:39:29Z) and `publish` was skipped.

- **Variance V1 (build choice), kept.** The rule names one build to go back to (`7263004` for candidate `1842a86`), and the drill on `1842a86` used two others, as the run on `7263004` did.
  - Draft S17 rule 4 says the `dist` "ของ SHA ที่เผยแพร่ก่อนหน้า" (of the previously published SHA). The wording of the question prepared for P2 is quoted under the earlier run.
  - The P2 row in DECISIONS (`DECISIONS.md:366` at `5092ac9`) records option (ข) as "open the new build, take a test, then open it with a build from before 2a", and its effect column says the drill opens the test "with a build from before 2a (2a is #176, `c5da5bb`), not with `a05ae70`".
  - The build Pages published before the candidate is `7263004`: push run 40385448079, then daily refreshes at `7263004` through 40775643293 (run end 2026-10-28T22:31:16Z).
  - `git diff --stat 7263004 1842a86 -- src public index.html vite.config.ts package.json package-lock.json` lists `src/physics/frame.ts` only (+24 −18), and `git diff --quiet` on the same paths exits 1. `git diff --stat a05ae70 1842a86 -- …` lists the same single file. (`git diff --quiet a05ae70 72630046 -- …` still exits 0.)
  - `frame.ts` is the replay's frame code (#185). Every module it imports is under `src/physics/`, apart from the type-only `../types` (`src/physics/frame.ts:27`–`:41`). It imports no storage code.
  - Both `7263004` and `a05ae70` carry the 2b writer. Going back to either is not a schema rollback and would test nothing.
  - So the drill on `1842a86` again went back to the two published builds before the writer, `408ad16` (before 2a) and `c5da5bb` (2a only). This departs from the rule's wording and from the prepared question's wording. It matches the option as DECISIONS records it, and adds `c5da5bb`. The GK1 record lists it in PROGRESS, "Variances for GK1".
- **A revert of 2b.** `git diff --stat c5da5bb 1842a86 -- src` lists 4 files, +32 −22: 2b's three files (`revision.ts`, `types.ts`, `assessment-view.ts`) and `src/physics/frame.ts`. A revert of 2b on main would therefore publish `c5da5bb`'s assessment code with #185's `frame.ts`. A revert of 2a and 2b would publish `408ad16`'s, also with #185's `frame.ts`. The build stamp would differ as well. (On `7263004` such a revert gave `c5da5bb`'s app code with only the stamp different; on `1842a86` it no longer does.)
- **What is the same in all three builds.** `git diff --quiet 408ad16 1842a86 -- src/lessons/progress.ts src/projects/validation.ts src/projects/archive.ts src/workspace/ src/pwa/ src/ui/lessons/lesson-mode.ts` exits 0.
  - So the storage readers and writers, the service worker and the lesson code that saves in steps 2–4 are the same in all three builds.
  - `git diff --stat 408ad16 1842a86 -- src` lists 5 files (+129 −36): the assessment code (2a's reader, 2b's writer, `bank.ts`) and #185's `frame.ts`. With the stamp, that is what differs.

## Setup

Everything below ran on 2026-10-29 (local run, not committed). The repository checkout was used read only (`git worktree add` only). Its `git status --short`, `HEAD` and worktree list were the same before and after.

### Builds

```sh
G=<scratchpad>/gk1
git -C /home/user/Orbitlab worktree add --detach $G/wt/rd-1842a86 1842a86cee5a1dc4fd40d536d2bc882d31750021
git -C /home/user/Orbitlab worktree add --detach $G/wt/rd-408ad16 408ad16b90fd72b934f947afc2ed13efc4a7584a
git -C /home/user/Orbitlab worktree add --detach $G/wt/rd-c5da5bb c5da5bb4b7cd78e45d030b2747020e7e6ac9994e
# each worktree links the checkout's node_modules: `git diff --quiet <sha> 1842a86 -- package.json package-lock.json` exits 0 for all three
cd <wt-each> && npx vite build      # exit 0 for each: 5.5 s, 3.8 s, 3.7 s (2026-10-29 23:06:44–23:06:57Z)
```

`git diff --quiet 408ad16 1842a86 -- package.json package-lock.json vite.config.ts index.html public src/pwa` exits 0. Node v22.22.0, Vite 8.3.0.

| Build | Stamp (`build-info.json`, `<html data-build>`) | Files in `dist` | `sw.js` SHA-256 | Precache version (manifest in `sw.js`) |
|---|---|---|---|---|
| candidate 1842a86 | `1842a86` | 90 | `582ddceb…d093cc4f` | `1b6c3265aaea76` |
| `c5da5bb` | `c5da5bb` | 90 | `c9c27a52…8d2cd4b1` | `1669d7cebd0eb3` |
| `408ad16` | `408ad16` | 90 | `cc4aaf5f…f63c8fd8` | `17dae7af62f55f` |

Each precache lists 68 files. The fresh candidate build equals another GK1 stage's local `1842a86` build (the held-journeys run, built 2026-10-29T22:32:21Z) in all 88 files other than `build-info.json` and `SHA256SUMS` (`sha256sum` lists compared with `cmp`, exit 0).

### One origin, one path, a "deploy"

- `server.mjs` (local, not committed; SHA-256 `6b884762…c8cd8212`) serves one build's `dist` under `http://127.0.0.1:4391/Orbitlab/`.
  - It sends GitHub Pages' caching headers: `Cache-Control: max-age=600`, `ETag`, `Last-Modified`, and 304 on `If-None-Match`. There is no SPA fallback.
  - Switching the folder it serves is the deploy. It logs every request with the build being served.
- The drill script `drill.mjs` (local, not committed; SHA-256 `e37b25c2…fe95e3b4`) runs the server in the same Node process and drives Chromium with Playwright.

### Browser

- Playwright 1.63.0 `chromium.launchPersistentContext` on **one user-data folder** for steps 1–4. The browser is closed at the end of each step and opened again on the same folder for the next, as a learner coming back.
- Chrome for Testing 153.0.8010.12, headless shell (`HeadlessChrome/153.0.8010.12`), with SwiftShader WebGL through the harness's flags `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`. Viewport 1280×900, scale 1, locale en-GB, service workers allowed.
- The CI runners' font: a fontconfig file that maps `system-ui` and `sans-serif` to DejaVu Sans and rejects Inter (SHA-256 `31ff3213…922ce67a`). With it, `fc-match system-ui` gives DejaVu Sans; without it, Inter. The machine has 4 CPUs (Intel Xeon @ 2.80GHz, KVM).
- An init script installs the harness's WebMCP stand-in (`tests/browser/harness.mjs`), so the app's own read-only tool `get_assessment_result` can be called.
  - On the very first visit only (an empty `localStorage` at the origin), it sets the guide to dismissed and the language to English.
  - Later visits write nothing to storage.

### How the app moves to a new build

This is the FX-7 flow, unchanged since `408ad16` (`src/pwa/` is byte-identical at `408ad16` and `1842a86`):

1. A new deploy is a new `sw.js` (a new precache manifest). `src/pwa/register.ts` registers it on every page load. The browser also checks on navigation.
2. The new worker installs beside the running one. It copies every file whose revision is unchanged from the old cache and fetches the rest, checking each against its revision.
3. The new worker waits. The page shows "A new version of Orbitlab is ready." with a Reload button.
4. Reload posts `orbitlab:skip-waiting`. The worker activates, deletes every other precache and claims the page. `controllerchange` reloads the page.

The drill presses that Reload button. It never calls `skipWaiting` itself and never clears caches or storage.

### What is recorded

- **Stored value:** the active learner's `orbitlab.lessons`. The learner id comes from `sessionStorage['orbitlab.profiles.selected.v1']` and the value from `localStorage['orbitlab.profile.v1.<id>'].values['orbitlab.lessons']`. Each read saves:
  - the exact string and its SHA-256;
  - the test's own bytes (`JSON.stringify(assessments[0])`);
  - whether those bytes appear literally in the stored string and contain `"revision":1`;
  - any `orbitlab.lessons.recovery*` key, in the record's values or in `localStorage`.
- **Service worker:** `<html data-build>`, the page's module script, the controller, the registration's active, waiting and installing workers, and `caches.keys()`. It also records the worker's own `orbitlab:offline-check` reply: precache version, `complete`, files cached, `pageMatches`. The waiting worker is asked the same question, for its version.
- **Result:** the lessons catalogue's test card, the result page (eyebrow, headline, summary, the six area bars, the four cards), WebMCP `get_assessment_result`, and screenshots. The drill's comparison of readings (`sameScore`) includes the four cards this time (D4).

### Commands

```sh
# T = <scratchpad>/gk1/tools/revert-drill (the drill's tools), R = <scratchpad>/gk1/revert-drill (its results); local, not committed
cd $T && OUT=$R/run-candidate-1842a86 PORT=4391 FONTCONFIG_FILE=$T/fonts.conf \
  timeout 3000 node drill.mjs > $R/run-candidate-1842a86.out 2>&1    # exit 0, 2026-10-29 23:21:02–23:26:44Z
```

## Steps and evidence (candidate 1842a86, run of 2026-10-29 23:21–23:26Z)

### Step 1: candidate 1842a86, a learner takes the placement test

- The first visit installed the candidate's worker, which took the page: `data-build` `1842a86`, worker version `1b6c3265aaea76`, complete 68 of 68, `pageMatches` true. Caches: `orbitlab-precache-1b6c3265aaea76`.
- The app opened on a new learner, `legacy-v1` ("Learner 1"), the only one, with no `orbitlab.lessons` yet.
- Lessons → "Take the placement test" → "Start the test". As soon as the test began, the stored test carried `"revision":1` with 0 answers: value SHA-256 `4cc763c9…8255e443`, 1 282 bytes; test bytes `9d5f9d89…84b879ee`.
- All 25 questions were answered with the page's own controls, in a fixed pattern of options, numbers, orderings and confidences. The drill used each question's Next/Finish button, and Next on the predict-then-observe screens.
- The finished value is 2 350 bytes, SHA-256 `437dc4fe…e766227c`.
  - The test's bytes are 2 267 bytes, SHA-256 `da9e8c32…b0328697`, and begin `{"revision":1,"kind":"pre","seed":3168255331,…`.
  - `finishedAt` is `2026-10-29T23:21:29.421Z`.
- Result page: "Score 11 % — start with Space basics", "3 of 25 questions right · misconceptions: 4.". The area bars:

  | Area | Right | Misconceptions | Score | Level |
  |---|---|---|---|---|
  | 1 Space basics | 1 of 5 | 1 | 21 % | Beginner |
  | 2 Orbital mechanics | 2 of 4 | 1 | 42 % | Beginner |
  | 3 Rocket performance and the atmosphere | 0 of 4 | – | 0 % | Beginner |
  | 4 Guidance and navigation | 0 of 4 | – | 0 % | Beginner |
  | 5 Attitude control | 0 of 4 | 1 | 0 % | Beginner |
  | 6 Failures and safety | 0 of 4 | 1 | 0 % | Beginner |

  - The catalogue card read "Latest test: 11 %. Recommended start: 1.1 Your first orbit.".
  - WebMCP gave `percent` 11, `start` `orbit-first` and 4 misconceptions.
  - The four cards: Strengths, "No area is at the proficient level yet."; To work on, 6 lines; Misconceptions, 4 lines; Recommended path, 24 chips (★ 1.1, the rest "review").
- A reload left the value byte for byte (`437dc4fe…`).

The full stored value at the end of step 1:

```json
{"version":1,"lessons":{},"assessments":[{"revision":1,"kind":"pre","seed":3168255331,"startedAt":"2026-10-29T23:21:24.669Z","questions":[{"id":"b-vehicle-distinct","vehicle":"longmarch5","vehicleOptions":["starship","electron","longmarch5","soyuz21a"]},{"id":"b-launch-east","order":[3,0,1,2]},{"id":"b-leo-speed","order":[1,3,2,0]},{"id":"b-ellipse-slow","order":[0,1,2,3]},{"id":"b-opposite-side","order":[0,2,3,1]},{"id":"o-kepler3","order":[0,3,2,1]},{"id":"o-two-burns","order":[2,1,3,0]},{"id":"o-molniya","order":[0,2,3,1]},{"id":"o-geo-latitude","order":[3,1,0,2]},{"id":"r-order-events","order":[1,4,3,0,2,5]},{"id":"r-read-meco","values":{}},{"id":"r-maxq-chart","order":[3,2,1,0]},{"id":"r-mass-ratio","values":{"dv":2700,"isp":290}},{"id":"g-open-loop","order":[2,0,3,1]},{"id":"g-peg-igm","order":[1,3,0,2]},{"id":"g-kalman","order":[2,0,3,1]},{"id":"g-order-kalman","order":[1,4,3,0,2]},{"id":"c-order-loop","order":[4,1,2,0,3]},{"id":"c-tvc-sign","order":[3,2,0,1]},{"id":"c-gain-margin","order":[0,3,1,2]},{"id":"c-slosh","order":[2,3,1,0]},{"id":"f-les","order":[2,1,3,0]},{"id":"f-series-reliability","values":{"n":8,"p":97}},{"id":"f-fdir","order":[1,0,3,2]},{"id":"f-engine-out-timing","order":[2,1,0,3]}],"answers":[{"id":"b-vehicle-distinct","value":"electron"},{"id":"b-launch-east","value":3,"confidence":"unsure"},{"id":"b-leo-speed","value":0},{"id":"b-ellipse-slow","value":2,"confidence":"guess"},{"id":"b-opposite-side","value":2,"confidence":"sure"},{"id":"o-kepler3","value":0},{"id":"o-two-burns","value":0,"confidence":"sure"},{"id":"o-molniya","value":3},{"id":"o-geo-latitude","value":1,"confidence":"sure"},{"id":"r-order-events","value":"0,2,5,1,4,3"},{"id":"r-read-meco","value":3.5},{"id":"r-maxq-chart","value":1,"confidence":"guess"},{"id":"r-mass-ratio","value":0.9},{"id":"g-open-loop","value":2},{"id":"g-peg-igm","value":2},{"id":"g-kalman","value":3,"confidence":"guess"},{"id":"g-order-kalman","value":"4,1,2,0,3"},{"id":"c-order-loop","value":"2,0,3,4,1"},{"id":"c-tvc-sign","value":1,"confidence":"sure"},{"id":"c-gain-margin","value":1},{"id":"c-slosh","value":3},{"id":"f-les","value":2},{"id":"f-series-reliability","value":100},{"id":"f-fdir","value":3},{"id":"f-engine-out-timing","value":1,"confidence":"sure"}],"finishedAt":"2026-10-29T23:21:29.421Z"}],"customLessons":[],"customQuestions":[]}
```

### Step 2: roll back to `408ad16` (before 2a)

- **Deploy and update.** The server switched to `408ad16`'s `dist` (23:21:49Z), and the browser was opened again on the same profile.
  - The first page still ran the candidate from its precache: `data-build` `1842a86`, worker `1b6c3265aaea76`. Caches: `orbitlab-precache-1b6c3265aaea76`, `orbitlab-runtime`. This is the FX-7 behavior: a deploy reaches an installed app only through the update offer.
  - `register()` and the navigation fetched the new `sw.js` (200 at 23:22:09Z). The `408ad16` worker installed and waited: version `17dae7af62f55f`; caches `orbitlab-precache-17dae7af62f55f`, `orbitlab-precache-1b6c3265aaea76`, `orbitlab-runtime`.
  - The install downloaded 16 files besides `sw.js` (23:22:10Z): `index.html` and 15 changed scripts. Among them is `flight.worker`, which #185's `frame.ts` changed; the run on `7263004` downloaded one file fewer here.
  - No other request reached the server, so every other file came from the old cache. After the Reload, at 23:22:35Z, the page fetched one landing picture, `home/orbit.en.webp`, which is never precached. Later `sw.js` checks answered 304.
  - The page offered "A new version of Orbitlab is ready. Reload" at 23:22:11Z. After Reload the page ran `408ad16`, with worker `17dae7af62f55f` complete 68 of 68 and `pageMatches` true.
  - The old precache was deleted. Caches: `orbitlab-precache-17dae7af62f55f`, `orbitlab-runtime`.
- **Reads, no writes.**
  - The same learner opened (`legacy-v1`, the only one).
  - The stored value on opening, after loading `408ad16` and after showing the result was `437dc4fe…` every time: step 1's bytes exactly. No recovery copy was made.
- **Same result.** The card, eyebrow, headline, summary, six area bars, four cards and the WebMCP answer were identical to step 1.
- **The old build saves, twice.**
  - Lessons → 1.1 Your first orbit. Opening the lesson already saved (a read added in this run, D5). This is `lesson-mode`'s `startLesson` (`src/ui/lessons/lesson-mode.ts:382`), which calls `lessonProgress` and then `save` (`:394`–`:395`).
    - The value became 2 408 bytes, SHA-256 `325a0b32…36163746`.
    - `lessons` is now `{"orbit-first":{"attempts":0,"hintsShown":0,"passed":false}}`.
  - Then "💡 Hint 1/3" (the button then read "💡 Hint 2/3"). This is `showHint` (`:874`) → `save` (`:879`) → `saveProgress` (`:338`), which writes the whole progress value back. The value is 2 408 bytes, SHA-256 `f60e2734…6f95a2fb`, with `hintsShown` 1.
  - At both saves the test's bytes are unchanged (`da9e8c32…`), appear literally in the value and still hold `"revision":1`. No recovery key appeared.
  - This build has no `revision` in its types, so it kept a field it does not know.
- After the hint save the result was the same, and after a reload the value was the same (`f60e2734…`).

### Step 3: roll back to `c5da5bb` (2a only)

- **Deploy and update** (23:23:22Z), the same flow as step 2.
  - The first page ran `408ad16` (worker `17dae7af62f55f`).
  - The new `sw.js` was fetched (200 at 23:23:38Z). The install downloaded 14 files besides `sw.js`: `index.html` and 13 scripts.
  - The offer came at 23:23:39Z. After Reload the page ran `c5da5bb` with worker `1669d7cebd0eb3`, complete 68 of 68, `pageMatches` true. Caches: `orbitlab-precache-1669d7cebd0eb3`, `orbitlab-runtime`.
- **Reads, no writes.**
  - The same learner opened. The value on opening, after loading and after showing the result was `f60e2734…` each time (what `408ad16` left).
  - Opening lesson 1.1 did not change it this time, because its entry already existed.
- **Same result**: the same card, eyebrow, headline, summary, bars, four cards and WebMCP answer as step 1. This build's reader reads `"revision":1` as revision 1. The control below shows that it does read the field.
- **The 2a build saves.** Hint 2/3 (the button then read "💡 Hint 3/3").
  - The value is SHA-256 `d7a697e0…f19c649d` with `hintsShown` 2.
  - The test's bytes are unchanged (`da9e8c32…`) with `"revision":1`, and there is no recovery key.
  - The result was the same after the save, and the value was the same after a reload.

### Step 4: roll forward to candidate 1842a86

- **Deploy and update** (23:24:41Z).
  - The first page ran `c5da5bb` (worker `1669d7cebd0eb3`).
  - The install downloaded only `sw.js` (200 at 23:24:57Z) and `index.html` (23:24:58Z). The candidate's other changed files were still in the profile's HTTP cache from step 1 and matched their revisions. `index.html` (one URL, different bytes per build) did not, and was downloaded again.
  - The offer came at 23:24:58Z. After Reload the page ran `1842a86` with worker `1b6c3265aaea76`, complete 68 of 68, `pageMatches` true. Caches: `orbitlab-precache-1b6c3265aaea76`, `orbitlab-runtime`.
- **Reads, no writes.** The same learner opened. The value on opening, after loading, after showing the result and after opening lesson 1.1 was `d7a697e0…` each time (what `c5da5bb` left).
- **Same result** as step 1 on every field compared.
- **The candidate saves.** Hint 3/3 (the button then read "No more hints").
  - The value is SHA-256 `54fb414d…b1366e1b` with `hintsShown` 3.
  - The test's bytes are unchanged (`da9e8c32…`): the writer stamps new tests only and did not touch this one.
  - The result was the same, and the value was the same after a reload.

### The round trip, end to end

- **Test bytes.** The test's bytes at the end equal step 1's: SHA-256 `da9e8c3244a6d274716e1d558a740e6389a3550b71d24fc7dcdc9196b0328697` at all 20 reads from the finish to the end. These are the 17 reads of the method plus the 3 added lesson-opening reads (D5).
- **The whole value.** At the end it equals step 1's except `lessons`, which holds the history that the lesson opening and the three hint saves wrote. It is not byte-equal to step 1's value.
  - The drill's own check compares the parsed values with `lessons` set aside (`isDeepStrictEqual` in `drill.mjs`). It does not compare bytes.
  - The byte-level claim was checked after the run, offline, on the saved files (`post-run-checks.json`). Replacing step 1's `"lessons":{}` (it occurs once) with `"lessons":{"orbit-first":{"attempts":0,"hintsShown":3,"passed":false}}` gives the end value byte for byte (2 350 → 2 408 bytes, `437dc4fe…` → `54fb414d…`).
- **The result.** All seven readings of the result were identical: step 1, then steps 2, 3 and 4 each before and after that build's own saves.
  - `sameScore` compared the card, eyebrow, headline, summary, six bars, four cards and the whole WebMCP answer.
  - The offline check (`post-run-checks.json`) also found the four cards and every other recorded field identical in all seven readings.
- **No write on read.** No build wrote `orbitlab.lessons` on opening, on loading, on showing the result or on reloading (12 reads, each compared with the read before it). Every change of value in the table below follows a save: the lesson opening in step 2, and the three hint saves.
- **Other keys.** The learner record's own `revision` counter rose on page loads as well as on saves (29 at the end of step 1, 63 at the end), because the app saves other keys of the record when a page loads. `orbitlab.lessons` did not change on those loads.

| Read | Build running | `orbitlab.lessons` SHA-256 | Test bytes SHA-256 | `"revision":1` | Recovery key |
|---|---|---|---|---|---|
| step 1, test begun | candidate 1842a86 | `4cc763c9…` (1 282 B) | `9d5f9d89…` (no answers) | yes | none |
| step 1, finished | candidate 1842a86 | `437dc4fe…` (2 350 B) | `da9e8c32…` | yes | none |
| step 1, after reload | candidate 1842a86 | `437dc4fe…` | `da9e8c32…` | yes | none |
| step 2, opened (before Reload) | candidate 1842a86 | `437dc4fe…` | `da9e8c32…` | yes | none |
| step 2, loaded | `408ad16` | `437dc4fe…` | `da9e8c32…` | yes | none |
| step 2, after showing the result | `408ad16` | `437dc4fe…` | `da9e8c32…` | yes | none |
| step 2, lesson 1.1 opened (added read) | `408ad16` | `325a0b32…` (2 408 B) | `da9e8c32…` | yes | none |
| step 2, after its own save (hint 1) | `408ad16` | `f60e2734…` (2 408 B) | `da9e8c32…` | yes | none |
| step 2, after reload | `408ad16` | `f60e2734…` | `da9e8c32…` | yes | none |
| step 3, opened (before Reload) | `408ad16` | `f60e2734…` | `da9e8c32…` | yes | none |
| step 3, loaded | `c5da5bb` | `f60e2734…` | `da9e8c32…` | yes | none |
| step 3, after showing the result | `c5da5bb` | `f60e2734…` | `da9e8c32…` | yes | none |
| step 3, lesson 1.1 opened (added read) | `c5da5bb` | `f60e2734…` | `da9e8c32…` | yes | none |
| step 3, after its own save (hint 2) | `c5da5bb` | `d7a697e0…` | `da9e8c32…` | yes | none |
| step 3, after reload | `c5da5bb` | `d7a697e0…` | `da9e8c32…` | yes | none |
| step 4, opened (before Reload) | `c5da5bb` | `d7a697e0…` | `da9e8c32…` | yes | none |
| step 4, loaded | candidate 1842a86 | `d7a697e0…` | `da9e8c32…` | yes | none |
| step 4, after showing the result | candidate 1842a86 | `d7a697e0…` | `da9e8c32…` | yes | none |
| step 4, lesson 1.1 opened (added read) | candidate 1842a86 | `d7a697e0…` | `da9e8c32…` | yes | none |
| step 4, after its own save (hint 3) | candidate 1842a86 | `54fb414d…` | `da9e8c32…` | yes | none |
| step 4, after reload | candidate 1842a86 | `54fb414d…` | `da9e8c32…` | yes | none |

### Control: the 2a build reads the field

After step 4, the drill switched the server to `c5da5bb` and opened a separate, throwaway browser context with its own storage and service workers blocked, not the drill's profile (D7). It seeded its learner with the drill's final value, changing only the test's `"revision":1` (it occurs once) to `"revision":2` (seed SHA-256 `6256d547…e1eb0849`).

The `c5da5bb` page did not show the test:
- the catalogue card offered "Not sure where to start? A 25-question test …" (no result);
- WebMCP gave `{"taken":false}`.

This is 2a's newer-test rule ("ไม่แสดง และเก็บไบต์ไว้"). So step 3's same score comes from `c5da5bb` reading the test as revision 1. It does not come from ignoring the field.

As in the run on `7263004`, the drill's control alone cannot rule out a seed that never landed or was overwritten, which would also give "Not sure where to start?" and `taken:false`: it does not read storage back after its reload, and it has no revision-1 twin. So the control was run again after the drill, with both added.

```sh
# in $T; control-recheck.mjs, SHA-256 22bf7b62…8247e521 (tools-final.sha256)
cd $T && OUT=$R/control-recheck PORT=4392 FONTCONFIG_FILE=$T/fonts.conf \
  timeout 900 node control-recheck.mjs $R/run-candidate-1842a86/stored/step4-after-reload.json > $R/control-recheck/run.out 2>&1
# exit 0, 2026-10-29 23:28:41–23:29:56Z (first attempt 23:26:59–23:28:16Z exited 1: D8)
```

It served the same `c5da5bb` `dist` (`sw.js` `c9c27a52…8d2cd4b1`), with the same browser, flags and throwaway context as the drill's control. It seeded the drill's final value twice, each in a fresh context, once with the test at revision 2 and once left at revision 1, then reloaded and read storage back.

| Seeded revision | Page | Seed landed before the reload | Stored value after the reload | Card | WebMCP |
|---|---|---|---|---|---|
| 2 | `c5da5bb` | yes | the seed byte for byte (`6256d547…`, 2 408 B), revision 2, no recovery key | "Not sure where to start? …" | `taken:false` |
| 1 | `c5da5bb` | yes | the seed byte for byte (`54fb414d…`, the drill's final value), revision 1, no recovery key | "Latest test: 11 %. Recommended start: 1.1 Your first orbit." | `taken:true`, `percent` 11, `start` `orbit-first` |

Same storage, same seeding, and only the revision differs: the 2a build shows the revision-1 test and hides the revision-2 one while keeping its bytes. There was no page error in either context. The drill's conclusion holds.

## Result

The check column gives draft S17 rule 4's three steps in English (`S17:171`; the Thai is quoted under "Why this drill").

| Step (S17 rule 4) | Check | Build used | Result | Evidence |
|---|---|---|---|---|
| 1 | Install the candidate and create a test that has a revision. | candidate 1842a86 | **pass** | test begun and finished with `"revision":1`. Score 11 %, 3 of 25, misconceptions 4 |
| 2 | Install the previously published build. The data must read, or open read-only, not be overwritten, and keep unknown fields. | `408ad16` (before 2a), in place of `7263004`: **variance V1** | **pass** on `408ad16` | worker `17dae7af62f55f` through the app's update offer. Same learner, same result and score. No write on load or view (`437dc4fe…`). After its own saves (lesson opening, hint 1) the test bytes are unchanged with `"revision":1` (`da9e8c32…`) |
| 2 | (same item) | `c5da5bb` (2a only), in place of `7263004`: **variance V1** | **pass** on `c5da5bb` | worker `1669d7cebd0eb3`. Same result and score, read as revision 1. Control: a revision-2 test is hidden, and its re-check with read-back and a revision-1 twin shows the seed landed and the field is read. After its own save the test bytes are unchanged |
| 3 | Go back to the candidate. The stored bytes must be equal. | candidate 1842a86 | **pass** for what was shown: no build wrote on load or view, and the test's bytes are equal. The whole value is not byte-equal to step 1's, because the drill's own saves changed `lessons` | worker `1b6c3265aaea76`. Value on opening = what `c5da5bb` left (`d7a697e0…`), unchanged after loading and showing the result. Test bytes = step 1's (`da9e8c32…`) at all 20 reads from the finish. Whole value = step 1's plus the drill's own lesson history: shown byte for byte after the run by replacing `lessons` (`post-run-checks.json`); the drill's own check compares parsed values |

**Checks.** 56 of 56 checks passed: step 1, 8; steps 2, 3 and 4, 14 each; round trip, 4; control, 1; page errors, 1.
- There was no page error and no console error or warning, apart from two warnings that Playwright itself logs in the control's blocked context ("Service Worker registration blocked by Playwright", D8).
- An earlier full run of the same drill (trial, 23:13:26–23:18:56Z, exit 1) passed 54 of 56 with another test (4 %, 1 of 25). Its two failures were in the drill's own checks and were fixed before this run (D5, D8, D9).
- The control re-check and the offline post-run checks (6 of 6) came after the run and are not among the 56.

2b's rollback line holds as written in its report (`FX-2-s2b-m-learning-027-writer.md:150`): "Revert the fix commit. Tests begun while it was live keep `"revision": 1`. Every build reads that as revision 1 or keeps it unread, as above, so nothing needs migrating." There is no orphaned data on `1842a86` either, so a revert stays possible and a forward-fix is not the only path (draft S17 rules 2 and 5).

## Departures from the 7263004 method

The method is the one written for the run on `7263004` (below, and in #182 at `ac6f2c6`). This run kept V1 (see "What was rolled back to") and departed from it in these places:

- **D1. Stamps.** `git rev-parse --short HEAD` gives 7 characters in this clone, so the local stamps are `1842a86`, `408ad16` and `c5da5bb`. The run on `7263004` had 8-character local stamps. Pages' stamp also has 7 characters.
- **D2. Reference build.** The run on `7263004` compared its fresh candidate build with the `dist` of the freeze's KPI baselines. Here the reference is the held-journeys run's local `1842a86` build: 88 of 88 files equal outside `build-info.json` and `SHA256SUMS`.
- **D3. Tools recreated.** The `server.mjs`, `drill.mjs`, `control-recheck.mjs` and `post-run-checks.mjs` of the run on `7263004` were local and were not available. They were written again from that run's description, so their hashes differ (`tools.sha256`, `tools-final.sha256`).
  - The server's `ETag` is a content hash of each file. The server also sends `Accept-Ranges`, `Access-Control-Allow-Origin: *` and `Vary: Accept-Encoding`.
  - The fontconfig file is the held-journeys run's, copied unchanged.
- **D4. `sameScore` includes the four cards**, as the earlier write-up recommended for a rerun. The offline cards check was kept as well.
- **D5. Added read after opening lesson 1.1, before the hint**, in each of steps 2–4 (3 reads; 21 reads with a value instead of 18).
  - It showed that opening the lesson is itself a save (`startLesson` → `lessonProgress` → `save`, `lesson-mode.ts:382`, `:394`–`:395`). `lesson-mode.ts` is byte-identical in the three builds.
  - In step 2, `408ad16` wrote the `orbit-first` entry with `hintsShown` 0 before the hint. The test's bytes were unchanged there too.
  - This corrects the earlier write-up: its "Every change of value in the table below follows a hint save" holds only for the reads it took, and its limit "the old builds saved through `lesson-mode` (a hint)" leaves out the lesson opening. Both places below carry a dated note, and so does step 2 of the earlier Thai summary.
  - The no-write check covers the method's moments: on opening, after loading, after showing the result and after a reload. It does not cover the lesson opening.
- **D6. Check list.** The earlier write-up does not list its 48 checks. This drill's 56 are named in `steps.json`, so the counts cannot be compared one for one.
- **D7. Control timing.** The drill's control ran after step 4 with the server switched to `c5da5bb`. That is how this run reads "With `c5da5bb` served, it seeded its learner with the drill's final value".
- **D8. Playwright's own warning set aside.** In a context with service workers blocked, Playwright logs "Service Worker registration blocked by Playwright" when the app calls `register()`: 2 in the drill's control, 4 in the control re-check.
  - The drill records them and leaves them out of the "no console warning" check.
  - The first control re-check attempt (23:26:59–23:28:16Z, `control-recheck.mjs` `08907922…fd33b0f1`, as `tools.sha256` gives it; the rerun's is in `tools-final.sha256`) exited 1 only because it counted these 4. Its two rows were the same as the rerun's.
  - The script was given the same rule and run again (23:28:41–23:29:56Z, exit 0). Both attempts are kept.
- **D9. Trial and answer pattern.** The trial failed 2 of 56: the no-write check then included the lesson-opening read (D5), and the Playwright warnings were counted (D8).
  - Between the trial and this run, the confidence cycle of the answer pattern was changed from sure, unsure, guess to sure, unsure, sure, guess, to give more misconceptions to compare.
  - A log field was also renamed.
- **D10. The test.** A new seed and the pattern gave 11 % (3 of 25, misconceptions 4), with every area at "Beginner". The test of the run on `7263004` was 23 % with a "Basic" area and six misconceptions.
- **D11. Pages bytes not compared.** The Pages build job's log (Pages 40957726247, job 123743001076) could not be read here: the redirect to the Actions log storage host was refused. So the local chunk names (`index-ByQ1zpgu.js`, `assessment-view-Cmll4OAX.js`) were not compared with the published ones, and the published `distSha256` of `1842a86` is not given here.
- **D12. First-visit seeding.** The init script sets the guide and the language only when `localStorage` at the origin is empty. The earlier write-up does not say how its drill detected the first visit.

## Limits

- **Local builds, not the Pages bytes.**
  - The three builds were made here from the committed data snapshots. Pages runs `npm run snapshots` before building, which rewrites `public/data/`, so its `dist` differs in the data files.
  - The build stamp is compiled into the code (`define: { __ORBITLAB_BUILD__ … }`, `vite.config.ts:111`), so the content-hashed chunk names depend on it.
  - Whether the local JavaScript equals Pages' was not checked (D11).
- **Not github.io.**
  - The builds were served from `127.0.0.1:4391` by a local server that copies Pages' caching headers.
  - A real rollback reaches users through a revert on main and a Pages run. The `deploy.yml` tip guard never publishes an old SHA directly (draft S17 rollback rule 1). The reverted build would carry a new stamp and #185's `frame.ts`.
  - The drill swapped the served folder instead. The pipeline was not part of it.
- **One browser.**
  - Chromium 153 headless shell only, one learner, English. Safari, Firefox, iPad and Android are HU-6's. (2026-11-04: in the K2 session's chat the owner answered on 2026-10-28 "ยังไม่มีไอแพด" (13:34:15Z; no iPad yet), then "ข ใช้เครื่องอื่นแทน iPad" (13:40:53Z), "คอมพิวเตอร์/โน้ตบุ๊ก" (13:41:13Z) and "Windows + Chrome/Edge" (13:42:04Z). HU-6 now runs on a low-cost Android phone and a Windows computer with Chrome or Edge, so it has no iPad, and no device in it runs Safari ([DECISIONS.md](../../DECISIONS.md), "Decided 2026-10-28 (HU-6's devices and guide …)"). Whether HU-6 without an iPad meets D-56's gate classes (low-end Android and iPad, `DECISIONS.md:51`) was not asked; it is a question for the owner ([kpi-GK1.md](kpi-GK1.md), "Questions for the owner"). Later that day the owner answered it in the K2 session's chat, "ข นับ Windows แทน iPad" (20:20:40Z), not the recommended option: by the option's text, "ให้ผลบนคอมพิวเตอร์นับแทนกลุ่ม iPad ที่ GK1 (เปลี่ยน D-56)", at GK1 the Windows computer's results count for D-56's iPad class, the CSV download included; the option says nothing about later gates ([DECISIONS.md](../../DECISIONS.md), "Decided 2026-11-04 (#204, #203, Day 35 and HU-6 without an iPad; the K2 session's chat)").)
  - The learner closed the browser and came back for each step. A tab left open would get the same offer from the hourly `registration.update()` (`src/pwa/register.ts:44`, `UPDATE_CHECK_MS` at `:18`); that timer was not waited for.
- **Two kinds of old-build save.** Both went through `lesson-mode` (opening a lesson and a hint), which rewrites the whole `orbitlab.lessons` value.
  - Other writers that carry tests were not exercised in the browser here: resuming on an old build a test begun but not finished on the candidate, starting a follow-up test on an old build, a project archive, a profile backup and the results file. 2a's round-trip tests cover the last four (`tests/assessment-revision.test.ts`), and those readers are unchanged since `408ad16`.
  - Resuming is the most direct of these, because it rewrites the test object itself. At `408ad16`, `src/ui/lessons/assessment-view.ts:139` resumes the parsed test in place (`this.attempt = open`), `:382` sets `a.answers[this.index] = answer` on it and `:402` sets `finishedAt`, each followed by a save. So `revision` is expected to survive, but the drill used only a finished test.
- **Revision 1 only.**
  - `BANK_REVISION` is 1 at `c5da5bb` and at the candidate (`src/lessons/assessment/bank.ts:35`). `408ad16` has none: `git grep -c BANK_REVISION 408ad16 -- src` finds nothing. So no build here writes a revision another cannot read.
  - The read-only path for a newer record (draft S17 rule 3's "read-only message") does not arise for revision 1. The control shows only that the 2a build hides a revision-2 test.
- **Pattern answers.** The answers followed a fixed pattern through the page's controls, not a real learner. The score is low (11 %), every area is "Beginner", and it has four misconceptions to compare.
- **Owner checks.** Not a gate decision. G7 item 2's old-worker reload on the live site stays the owner's to check: it waits for the owner's HU-6 session (2026-11-25: no session at GK1, by the owner's "ย้าย HU-6 ไป GK2 (แนะนำ)", 07:21:22Z). The live site serves `1842a86` (Pages 40957726247). (2026-11-04: the live site is `bc63d8a`, from the schedule run 41239939305 of 2026-10-31; the three schedule runs at `0fa25ad` since then, 41351606271, 41549816410 and 41731265523, failed and did not publish. No candidate is frozen: asked the HU-6 day, the owner answered "จะบอกอีกที" (17:32:56Z; [DECISIONS.md](../../DECISIONS.md), "Decided 2026-11-04 (#183's merge, the HU-6 date and Day 85; the K2 session's chat)").) (Later on 2026-11-04 the live site became `8dcc4b2`: Pages 41908317604 (push of #203) passed all 11 jobs and published at 21:03:22Z, and the schedule run 41928871108 published it again at 23:16:15Z; #204's push run 41905840442 was cancelled. No candidate is frozen.) (2026-11-05: the live site became `5588be1` at 10:52:24Z (Pages 42009007666, push of #190), then `7d12951` at 18:00:02Z (Pages 42064589225, push of #188, attempt 3), then `fa3c486` at 19:15:12Z (Pages [42087327369](https://github.com/ROYIN001/Orbitlab/actions/runs/42087327369), the push of #209: 11 of 11 jobs, 38 of 38 journeys; #208's run 42086061932 was cancelled by it). No candidate is frozen.) (2026-11-06: main is `d01019a4` after #210, #212 and #213, and #213 changes `src/`; the live site became `4476540` at 06:00:42Z (Pages 42168605010) and `4b7b66c` at 20:43:36Z (Pages 42286344470), then `d01019a4` from 22:33:31Z (Pages 42301024823, the push of #213: 11 of 11 jobs, 38 of 38 journeys); the schedule run 42124771467 at `b195875` published nothing. No candidate is frozen.) (2026-11-07: main is `cec4b572` after #214, and #214 changes `src/`; #215 (`56887ba`, Markdown only) started no run, and the live site became `cec4b572` from 04:38:40Z (Pages 42337488870, the push of #214: 11 of 11 jobs, 38 of 38 journeys). No candidate is frozen.)

## Files (local, not committed)

In `<scratchpad>/gk1/revert-drill/`:

- `run-candidate-1842a86.out` (with `.start`, `.end`, `.exit`): the console of the run, with every check line;
- `run-candidate-1842a86/drill-log.jsonl`: each record with its time: builds, service-worker states, stored reads, results, the update offers, the hints;
- `run-candidate-1842a86/steps.json`: everything above, with the 56 checks;
- `run-candidate-1842a86/stored/`: the exact `orbitlab.lessons` string and the test's bytes at each of the 21 reads with a value (`<step>-<moment>.json`, `.test.json`);
- `run-candidate-1842a86/shots/`: 17 screenshots: the catalogue and first question, each result reading, each update offer, each hint save and the control;
- `run-candidate-1842a86/server.log` and `server-log-summary.json`: every request with the build served, the deploys, the `sw.js` fetches and what each install downloaded;
- `run-candidate-1842a86/profile/`: the browser profile;
- `builds/`: the build logs and times, file lists, precache manifests, `builds-summary.txt`, the comparison with the held-journeys build, and `pages-build-log-unreachable.txt` (D11);
- `app-input-diffs.txt`: the `git diff` commands of "What was rolled back to", with their output and exit codes;
- `trial1/` (with `trial1.out`, `.start`, `.end`, `.exit`): the earlier full run (54 of 56);
- `control-recheck/` and `control-recheck-attempt1/`: `control-recheck.json`, `run.out`, `server.log`, two screenshots, `start`/`end`/`exit`;
- `post-run-checks/`: `post-run-checks.json` (whole value by byte replacement, the cards and every field of all seven readings, the whitespace sabotage) from `node post-run-checks.mjs $R/run-candidate-1842a86 > $R/post-run-checks/post-run-checks.json` in `$T` (exit 0), `start`/`end`/`exit`, and `tools.sha256` with the hashes of `control-recheck.mjs` (`22bf7b62…8247e521`) and `post-run-checks.mjs` (`8242f444…00638adc`);
- `tools.sha256` (as at the drill run) and `tools-final.sha256` (after D8's change to `control-recheck.mjs`); the tools are in `<scratchpad>/gk1/tools/revert-drill/`;
- `host.txt`, `main-status-*.txt`, `main-head-*.txt`, `worktrees-*.txt`, `cleanup.log`.

## The earlier run on 7263004 (2026-10-26)

This run was the GK1 revert-drill evidence until the candidate moved to `1842a86` on 2026-10-29. It is kept as written on 2026-10-26 (title "Revert drill at GK1: FX-2 step 2b on candidate 7263004 / ซ้อม revert ของขั้น 2b บน candidate 7263004"), with its headings one level down and dated notes in square brackets. In it, "the candidate" is `7263004`.

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ทำตามคำตอบข้อ P2 ของคุณ (แชต 2026-10-26) "ข ซ้อมหนึ่งครั้ง": ซ้อม revert ของขั้น 2b (ตัวเขียน `revision`) หนึ่งครั้งบน candidate 7263004
> - **ผล: ผ่านทุกขั้น** (ตรวจ 48 จุด ผ่าน 48) ใช้บิลด์จริงของแอปสามรุ่น เสิร์ฟที่ origin เดียวและ path เดียว (`/Orbitlab/`) และ browser profile เดียวตลอด การเปลี่ยนรุ่นทุกครั้งใช้ข้อความอัปเดตของแอปเอง ("A new version of Orbitlab is ready." แล้วกด Reload) แบบเดียวกับที่ผู้เรียนเห็นบน Pages
> - **ต่างจากถ้อยคำของกฎ (V1):** ร่าง S17 ข้อ 4 ให้ย้อนไป "รุ่นที่เผยแพร่ก่อนหน้า" ซึ่งคือ `a05ae70` (#177 คือ 2b เอง) แต่โค้ดแอปของ `a05ae70` เหมือน candidate ทุกไบต์ (ต่างกันแค่ `budgets.json` และไฟล์ Markdown) การย้อนไปรุ่นนั้นจึงไม่ได้ย้อนรูปแบบข้อมูลเลย การซ้อมจึงย้อนไปสองรุ่นที่เผยแพร่ก่อนตัวเขียนแทน คือ `408ad16` และ `c5da5bb`
>   - ตัวเลือก (ข) ของ P2 ตามที่ DECISIONS บันทึก (`DECISIONS.md:366` ที่ `5092ac9`) ระบุให้เปิดแบบทดสอบด้วยบิลด์ก่อน 2a ซึ่งตรงกับที่ซ้อม (และซ้อมกับ `c5da5bb` เพิ่ม) ส่วนใบคำถามที่เตรียมไว้ก่อน (ในเครื่อง ไม่ commit) เขียนว่า "ย้อนไปรุ่นที่เผยแพร่ก่อนหน้า" V1 จึงเป็นความต่างจากถ้อยคำของกฎ ไม่ใช่จากตัวเลือกที่ DECISIONS บันทึก
> - ขั้น 1 (candidate 7263004): ผู้เรียนทำแบบทดสอบวัดระดับครบ 25 ข้อด้วยปุ่มในหน้าเว็บ แบบทดสอบที่เก็บไว้มี `"revision":1` ตั้งแต่เริ่ม หน้าผลแสดง **23 %** (ถูก 7 จาก 25 ข้อ, misconception 6)
> - ขั้น 2 (ย้อนไป `408ad16` ซึ่งเป็นรุ่นก่อน 2a และไม่รู้จักช่อง `revision`):
>   - เปิดผู้เรียนคนเดิม ผลและคะแนนเหมือนเดิมทุกตัวเลข
>   - การโหลดและการดูผลไม่เขียนอะไรลงที่เก็บ (ค่าที่เก็บเท่าเดิมทุกไบต์ ไม่มีสำเนากู้คืน)
>   - จากนั้นบิลด์เก่าบันทึกความคืบหน้าเอง (เปิดคำใบ้ของบทเรียน 1.1) ไบต์ของแบบทดสอบยังเท่าเดิม และยังมี `"revision":1` [หมายเหตุ 2026-10-29: การซ้อมบน 1842a86 พบว่าการเปิดบทเรียน 1.1 ก็เป็นการบันทึกครั้งหนึ่งด้วย ดู D5 ข้างบน]
> - ขั้น 3 (ย้อนไป `c5da5bb` ซึ่งมีแค่ 2a ตัวอ่าน): อ่านแบบทดสอบเป็น revision 1 คะแนนเดิม ผลตรวจควบคุม: ถ้าเปลี่ยนค่าเป็น revision 2 บิลด์นี้ไม่แสดงผลสอบเลย แปลว่ามันอ่านช่องนี้จริง ไม่ได้มองข้าม (ตรวจซ้ำหลังซ้อม: อ่านค่าที่เก็บกลับมาแล้วตรงกับที่ใส่ทุกไบต์ และค่าเดียวกันที่เป็น revision 1 แสดง 23 %)
> - ขั้น 4 (กลับไป candidate 7263004): คะแนนเดิม ไบต์ของแบบทดสอบเท่ากับขั้น 1 ทุกไบต์ ค่าทั้งก้อนต่างจากขั้น 1 เฉพาะประวัติคำใบ้ของบทเรียน 1.1 ที่สามบิลด์เขียนเองระหว่างการซ้อม
> - ข้อจำกัด:
>   - ใช้บิลด์ในเครื่องกับข้อมูล snapshot ที่ commit ไว้ เสิร์ฟจาก 127.0.0.1 ไม่ใช่ github.io
>   - ทดสอบบน Chromium (headless) อย่างเดียว อุปกรณ์จริงอยู่ใน HU-6
>   - การ revert จริงบน main จะได้โค้ดแอปเดียวกับรุ่นที่ซ้อม แต่ build stamp ต่างกัน [หมายเหตุ 2026-10-29: ตอนนั้น main คือ 7263004 บน 1842a86 จะมี `src/physics/frame.ts` ของ #185 ติดไปด้วย]
> - ไม่มีคำถามใหม่ ความต่าง V1 จะอยู่ในรายการ variance ของ PR บันทึก GK1 ไฟล์นี้เข้า PR บันทึก GK1

```yaml
envelope: v2
package: GK1 record (revert drill; draft R7.2 pre-v1.0 rollback rule 4)
item: FX-2 step 2b (M-LEARNING-027, the writer of a test's `revision`)
wave: K1 (GK1 record)
lane: I (the integration session ran the drill; it checks lane L's stored format)
change_kind: docs (evidence only; no app code, test or build change)
owner_authorization: {date: 2026-10-26, via: chat, question: P2, answer: "ข ซ้อมหนึ่งครั้ง", where: "DECISIONS.md:366 at 5092ac9", scope: "one revert drill of 2b on the candidate, written up as revert-drill-GK1.md for the GK1 record PR"}
candidate: {label: candidate 7263004, sha: 72630046fc5eb56f1797e5363b6f9ad293ff9d38, pr: "#179", published: "Pages 40385448079, deploy-pages 2026-10-26T19:41:58Z"}  # [the candidate until 2026-10-29, when #185 merged as 1842a86]
rolled_back_to:
  - {sha: 408ad16b90fd72b934f947afc2ed13efc4a7584a, what: "before 2a (#174; its app code is 3644749's)", published: "Pages 40228322904 (daily refresh at 408ad16, run end 2026-10-25T20:28:26Z)"}
  - {sha: c5da5bb4b7cd78e45d030b2747020e7e6ac9994e, what: "2a only (#176, the reader)", published: "Pages 40340692641, 2026-10-26T15:10:22Z"}
variance: {id: V1, what: "rolled back to 408ad16 and c5da5bb, not to the previously published build a05ae70 (same app code as the candidate)", against: "draft S17 rule 4 (S17:171 at c2af8ae; GK1 row S17:327); P2's option as DECISIONS.md:366 at 5092ac9 records it names a build before 2a, which the drill used"}
run: {date: 2026-10-26, start: "21:39:20Z", end: "21:44:41Z", checks: "48 of 48 pass", exit: 0}
after_run: {control_recheck: "2026-10-26 22:18:40–22:19:57Z, exit 0", offline_checks: "post-run-checks.json, exit 0"}
result: pass (with variance V1)
evidence: local run, not committed (builds, browser profile, logs, screenshots)
```

**How to read this file.** `file:n` is the file at the candidate `7263004` [the candidate until 2026-10-29], unless marked "at `5092ac9`" (#181's commit [of 2026-10-26], which records the owner's answers P1–P5). Plan drafts are at `c2af8ae` (`docs/development/plan-v2-draft/sections/` on the plan branch). The drill's builds, tools, logs and screenshots are local, not committed; their names are given so a rerun can match them.

### Why this drill

- **G7 item 1** (adopted, `S05:192` on main): "storage migration and old-cache compatibility pass before a release that changes the schema". 2b is the first writer of a new stored field in K1 (`revision` on a placement test).
  - This drill is not that before-release pass. The writer `a05ae70` was already published (Pages 40357991698, `deploy-pages` done 2026-10-26T16:55:51Z) almost five hours before the drill ran (21:39Z).
  - G7 item 1's evidence is 2b's pre-merge report (`docs/development/reports/FX-2-s2b-m-learning-027-writer.md`) and 2a's old-record tests passing on the candidate (`tests/assessment-revision*.test.ts`, unit shards 1 and 3 of Pages 40385448079).
  - This drill is the repeat at the wave's GK on the frozen candidate that draft S17 rule 4 describes: "ที่ GK ของคลื่นนั้นต้องซ้อมซ้ำบน candidate ที่ตรึง" (at the wave's GK, the drill is repeated on the frozen candidate). [2026-10-29 note: until the candidate moved on 2026-10-29. The repeat on `1842a86` is above.]
- **Draft S17 at `c2af8ae`** (`docs/development/plan-v2-draft/sections/S17-r7-quality-release.md`): pre-v1.0 rollback rule 4 (`S17:171`) asks for a revert drill on the frozen candidate for every schema bump, "โดยใช้ `dist` ของ candidate และของ SHA ที่เผยแพร่ก่อนหน้า" (using the `dist` of the candidate and of the previously published SHA).
  - Its steps: install the candidate and make N+1 data; install the previous build, where the data must read (or open read-only), not be overwritten, and keep unknown fields; go back to the candidate, where "ค่าที่เก็บต้องเท่าเดิมทุกไบต์ (วิธีของ EO-STO-2)" (the stored value must be unchanged byte for byte, by EO-STO-2's method).
  - The results go in "`revert-drill-<GK>.md` และ `R7.1-<GK>.md`".
  - Its GK1 row (`S17:327`) names `revert-drill-GK1.md` "if R1.6 or FX-2 starts writing a new format in the wave".
  - The rule applies from when the owner authorizes R7.2 (`S17:163`, `S17:177`), and R7.2 is not authorized. The owner asked for the drill anyway (P2 ข).
- **EO-STO-2 is not built.** S07 defines it as a diff of the storage record after a journey, with a sabotage check that adds whitespace to the record (`S07:310`). `docs/development/reports/R1.6-pr4-read-once.md:48` says it is not built yet, and `R7.1-GK1.md:75` (at `7263004`) says it is not merged.
  - Here a SHA-256 of the raw stored string stands in for it, with a check that the test's bytes appear literally in that string.
  - After the run, the stand-in was tried against EO-STO-2's sabotage on step 1's saved value (`post-run-checks.json`). One space added inside the stored test changes the value's SHA-256 and makes the literal check fail. The test's own SHA-256 alone would not see it, because the drill re-serializes the test before hashing it.
- **`R7.1-GK1.md` gets no line.** The rule is not in force (R7.2 is not authorized), and the owner's answer P2 asks for `revert-drill-GK1.md` only (`DECISIONS.md:366` at `5092ac9`).
- The table under "Result" gives rule 4's three steps in English and maps them to the steps below.

### What was rolled back to, and why these builds

| Build | SHA | What it is | Published |
|---|---|---|---|
| candidate 7263004 | `72630046fc5eb56f1797e5363b6f9ad293ff9d38` | #179 on #180 and #177 (2b) | Pages 40385448079, 2026-10-26T19:41:58Z |
| 2a only | `c5da5bb4b7cd78e45d030b2747020e7e6ac9994e` | #176, the reader | Pages 40340692641, 2026-10-26T15:10:22Z |
| before 2a | `408ad16b90fd72b934f947afc2ed13efc4a7584a` | #174 (Markdown only; app code = `3644749`) | Pages 40228322904 (daily refresh at `408ad16`, run end 2026-10-25T20:28:26Z) |

- **Variance V1 (build choice).** The rule names one build to go back to, and this drill used two others.
  - Draft S17 rule 4 says the `dist` "ของ SHA ที่เผยแพร่ก่อนหน้า" (of the previously published SHA). The question sheet prepared for P2 (local, not committed) says "ใช้ candidate → ย้อนไปรุ่นที่เผยแพร่ก่อนหน้า → กลับมา" (use the candidate → go back to the previously published build → come back).
  - The P2 row in DECISIONS (`DECISIONS.md:366` at `5092ac9`) records option (ข) as "open the new build, take a test, then open it with a build from before 2a", and its effect column says the drill opens the test "with a build from before 2a (2a is #176, `c5da5bb`), not with `a05ae70`".
  - The build published just before the candidate is `a05ae70` (#177, 2b itself; Pages 40357991698, 16:55:51Z). Its app inputs equal the candidate's: `git diff --quiet a05ae70 72630046 -- src public index.html vite.config.ts package.json package-lock.json` exits 0, and only `budgets.json` and Markdown differ. Going back to it is not a schema rollback and would test nothing. [2026-10-29 note: for candidate `1842a86` the build published before it is `7263004`; see "What was rolled back to" above.]
  - So the drill went back to the two published builds before the writer, `408ad16` (before 2a) and `c5da5bb` (2a only). This departs from the rule's wording and from the prepared question's wording. It matches the option as DECISIONS records it, and adds `c5da5bb`. The GK1 record lists it in PROGRESS, "Variances for GK1".
- `git diff --stat c5da5bb 72630046 -- src` is 2b's three files only (`revision.ts`, `types.ts`, `assessment-view.ts`, +8 −4). A revert of 2b on main would therefore publish `c5da5bb`'s app code. A revert of 2a and 2b would publish `408ad16`'s. Only the build stamp would differ. [2026-10-29 note: main was `7263004` then. On `1842a86` either revert keeps #185's `src/physics/frame.ts`; see above.]
- Between `408ad16` and the candidate, `src/lessons/progress.ts`, `src/projects/validation.ts`, `src/projects/archive.ts`, `src/workspace/`, `src/pwa/` and `src/ui/lessons/lesson-mode.ts` are byte-identical (`git diff --quiet 408ad16 72630046 -- …`). The storage readers and writers, the service worker and the lesson code that saves in step 2 are the same in all three builds. What differs is the assessment code (2a's reader, 2b's writer) and the stamp.

### Setup

Everything below ran in the integration session on 2026-10-26 (local run, not committed). The repository checkout was used read only (`git worktree add` only).

#### Builds

```sh
git worktree add --detach <wt-408ad16> 408ad16b90fd72b934f947afc2ed13efc4a7584a
git worktree add --detach <wt-c5da5bb> c5da5bb4b7cd78e45d030b2747020e7e6ac9994e
git worktree add --detach <wt-cand>    72630046fc5eb56f1797e5363b6f9ad293ff9d38
# each worktree links one shared node_modules: package.json and package-lock.json are the same at all three
cd <wt-each> && npx vite build      # exit 0 for each, 5–6 s each (2026-10-26 21:29:10–21:29:26Z)
```

`package.json`, `package-lock.json`, `vite.config.ts`, `index.html`, `public/` and `src/pwa/` are identical at `408ad16` and `72630046`. Node v22.22.0 (CI pins 22.23.3), Vite 8.3.0.

| Build | Stamp (`build-info.json`, `<html data-build>`) | Files in `dist` | `sw.js` SHA-256 | Precache version (manifest in `sw.js`) |
|---|---|---|---|---|
| candidate 7263004 | `72630046` | 90 | `121b3d27…0a61f19` | `0b9ffbcb4c7564` |
| `c5da5bb` | `c5da5bb4` | 90 | `28c065fc…05ffecc` | `0eed9ed5c1b44e` |
| `408ad16` | `408ad16b` | 90 | `d19a235f…e71b429d` | `0fc2847196867c` |

Each precache lists 68 files. The fresh candidate build equals the candidate `dist` that the freeze's KPI baselines [of 2026-10-26, on `7263004`] measured (local) in all 88 files other than `build-info.json` and `SHA256SUMS` (`sha256sum` lists compared with `cmp`).

#### One origin, one path, a "deploy"

- `server.mjs` (local, not committed; SHA-256 `619d098a…b58321`) serves one build's `dist` under `http://127.0.0.1:4391/Orbitlab/`, with GitHub Pages' caching headers (`Cache-Control: max-age=600`, `ETag`, `Last-Modified`, 304 on `If-None-Match`) and no SPA fallback. Switching the folder it serves is the deploy. It logs every request with the build being served.
- The drill script `drill.mjs` (local, not committed; SHA-256 `b539df0b…5d95b3b`) runs the server in the same Node process and drives Chromium with Playwright.

#### Browser

- Playwright 1.63.0 `chromium.launchPersistentContext` on **one user-data folder** for steps 1–4. The browser is closed at the end of each step and opened again on the same folder for the next, as a learner coming back.
- Chrome for Testing 153.0.8010.12, headless shell (`HeadlessChrome/153.0.8010.12`), SwiftShader WebGL (the harness's flags `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`). Viewport 1280×900, scale 1, locale en-GB, service workers allowed.
- The CI runners' font: a fontconfig file that maps `system-ui` and `sans-serif` to DejaVu Sans and rejects Inter, as in `R7.1-GK1.md`'s local runs. The machine has 4 CPUs.
- An init script installs the harness's WebMCP stand-in (`tests/browser/harness.mjs`), so the app's own read-only tool `get_assessment_result` can be called. On the very first visit only, it sets the guide to dismissed and the language to English. Later visits write nothing to storage.

#### How the app moves to a new build

This is the FX-7 flow, unchanged since `408ad16`:

1. A new deploy is a new `sw.js` (a new precache manifest). `src/pwa/register.ts` registers it on every page load. The browser also checks on navigation.
2. The new worker installs beside the running one. `precache()` copies every file whose revision is unchanged from the old cache and fetches the rest, checking each against its revision.
3. The new worker waits. The page shows "A new version of Orbitlab is ready." with a Reload button.
4. Reload posts `orbitlab:skip-waiting`. The worker activates, deletes every other precache and claims the page. `controllerchange` reloads the page.

The drill presses that Reload button. It never calls `skipWaiting` itself and never clears caches or storage.

#### What is recorded

- **Stored value:** the active learner's `orbitlab.lessons`. The learner id comes from `sessionStorage['orbitlab.profiles.selected.v1']` and the value from `localStorage['orbitlab.profile.v1.<id>'].values['orbitlab.lessons']`. Each read saves the exact string and its SHA-256. It also saves the test's own bytes (`JSON.stringify(assessments[0])`), checks that those bytes appear literally in the stored string and contain `"revision":1`, and lists any `orbitlab.lessons.recovery*` key.
- **Service worker:** `<html data-build>`, the page's module script, `navigator.serviceWorker.controller`, the registration's active, waiting and installing workers, and `caches.keys()`. It also sends the worker's own `orbitlab:offline-check` message, which returns the controlling worker's precache version, whether all 68 files are cached with their revisions (`complete`), and whether this page's script is in that worker's manifest (`pageMatches`).
- **Result:** the lessons catalogue's test card, the result page (eyebrow, headline, summary, the six area bars, the four cards), WebMCP `get_assessment_result`, and screenshots. The drill's comparison of readings leaves out the four cards (see "The round trip").

#### Commands

```sh
# in the drill's tool folder (local, not committed); OUT is a local results folder
OUT=<out>/run-candidate-7263004 PORT=4391 FONTCONFIG_FILE=<fonts.conf> \
  timeout 3000 node drill.mjs > <out>/run-candidate-7263004.out 2>&1    # exit 0, 21:39:20–21:44:41Z
```

### Steps and evidence (candidate 7263004, run of 2026-10-26 21:39–21:44Z)

#### Step 1: candidate 7263004, a learner takes the placement test

- The first visit installed the candidate's worker, which took the page: `data-build` `72630046`, worker version `0b9ffbcb4c7564`, complete 68 of 68, `pageMatches` true; caches `orbitlab-precache-0b9ffbcb4c7564`.
- The app opened on a new learner, `legacy-v1` ("Learner 1"), with no `orbitlab.lessons` yet.
- Lessons → "Take the placement test" → "Start the test". As soon as the test began, the stored test carried `"revision":1` with 0 answers (value SHA-256 `bfd36d80…76216ec`, 1 280 bytes).
- All 25 questions were answered with the page's own controls: a spread of options, numbers, orderings and confidences, each question's Next/Finish button.
- The finished value is 2 429 bytes, SHA-256 `c127d875…454660bc2`. The test's bytes are SHA-256 `875246cd…9bff261d` and begin `{"revision":1,"kind":"pre","seed":381309865,…`; `finishedAt` is `2026-10-26T21:39:48.653Z`.
- Result page: "Score 23 % — start with Space basics", "7 of 25 questions right · misconceptions: 6.". The area bars:

  | Area | Right | Misconceptions | Score | Level |
  |---|---|---|---|---|
  | 1 Space basics | 1 of 5 | 2 | 14 % | Beginner |
  | 2 Orbital mechanics | 1 of 4 | 1 | 17 % | Beginner |
  | 3 Rocket performance and the atmosphere | 1 of 4 | 1 | 17 % | Beginner |
  | 4 Guidance and navigation | 2 of 4 | – | 42 % | Beginner |
  | 5 Attitude control | 2 of 4 | 1 | 50 % | Basic |
  | 6 Failures and safety | 0 of 4 | 1 | 0 % | Beginner |

  The catalogue card read "Latest test: 23 %. Recommended start: 1.1 Your first orbit.". WebMCP gave `percent` 23, `start` `orbit-first` and 6 misconceptions.
- A reload left the value byte for byte (`c127d875…`).

The full stored value at the end of step 1:

```json
{"version":1,"lessons":{},"assessments":[{"revision":1,"kind":"pre","seed":381309865,"startedAt":"2026-10-26T21:39:43.639Z","questions":[{"id":"b-vacuum-thrust","order":[1,0,3,2]},{"id":"b-vehicle-distinct","vehicle":"electron","vehicleOptions":["falconheavy","protonm","longmarch5","electron"]},{"id":"b-stages","order":[0,2,3,1]},{"id":"b-multi-leo","order":[0,4,2,1,3]},{"id":"b-higher-slower","order":[0,2,3,1]},{"id":"o-perigee","order":[3,1,0,2]},{"id":"o-plane-burn","order":[0,1,3,2]},{"id":"o-two-burns","order":[2,0,1,3]},{"id":"o-period-height","values":{"T":12}},{"id":"r-tsiolkovsky","order":[1,2,0,3]},{"id":"r-read-meco","values":{}},{"id":"r-multi-solid","order":[1,3,4,0,2]},{"id":"r-hydrogen-first","order":[0,2,1,3]},{"id":"g-turn-early","order":[2,1,0,3]},{"id":"g-peg-igm","order":[1,3,2,0]},{"id":"g-multi-peg","order":[1,3,4,0,2]},{"id":"g-3sigma","order":[2,3,0,1]},{"id":"c-multi-actuators","order":[2,3,0,1,4]},{"id":"c-crossover","order":[3,2,1,0]},{"id":"c-notch","order":[0,1,2,3]},{"id":"c-maxq-margins","order":[2,1,0,3]},{"id":"f-three-imus","order":[1,3,2,0]},{"id":"f-proton2013","order":[1,2,0,3]},{"id":"f-engine-out-thrust","order":[2,3,1,0]},{"id":"f-multi-voting","order":[3,0,2,1,4]}],"answers":[{"id":"b-vacuum-thrust","value":0,"confidence":"sure"},{"id":"b-vehicle-distinct","value":"longmarch5"},{"id":"b-stages","value":1,"confidence":"sure"},{"id":"b-multi-leo","value":"3"},{"id":"b-higher-slower","value":2,"confidence":"sure"},{"id":"o-perigee","value":0},{"id":"o-plane-burn","value":2,"confidence":"sure"},{"id":"o-two-burns","value":2,"confidence":"unsure"},{"id":"o-period-height","value":7.8},{"id":"r-tsiolkovsky","value":0},{"id":"r-read-meco","value":100},{"id":"r-multi-solid","value":"4"},{"id":"r-hydrogen-first","value":2,"confidence":"sure"},{"id":"g-turn-early","value":0,"confidence":"unsure"},{"id":"g-peg-igm","value":0},{"id":"g-multi-peg","value":"3","confidence":"unsure"},{"id":"g-3sigma","value":3},{"id":"c-multi-actuators","value":"1"},{"id":"c-crossover","value":0},{"id":"c-notch","value":0,"confidence":"unsure"},{"id":"c-maxq-margins","value":1,"confidence":"sure"},{"id":"f-three-imus","value":2,"confidence":"unsure"},{"id":"f-proton2013","value":3},{"id":"f-engine-out-thrust","value":2,"confidence":"unsure"},{"id":"f-multi-voting","value":"3","confidence":"sure"}],"finishedAt":"2026-10-26T21:39:48.653Z"}],"customLessons":[],"customQuestions":[]}
```

#### Step 2: roll back to `408ad16` (before 2a)

- **Deploy and update.** The server switched to `408ad16`'s `dist` (21:40:07Z), and the browser was opened again on the same profile.
  - The first page still ran the candidate from its precache (`data-build` `72630046`, worker `0b9ffbcb4c7564`). This is the FX-7 behavior: a deploy reaches an installed app only through the update offer.
  - The navigation and `register()` fetched the new `sw.js` (200 at 21:40:28Z). The `408ad16` worker installed and waited (caches `orbitlab-precache-0b9ffbcb4c7564`, `orbitlab-precache-0fc2847196867c`, `orbitlab-runtime`).
  - The install downloaded 15 files besides `sw.js` (21:40:28–29Z): `index.html` and 14 changed scripts. Every other file was copied from the old cache. (Later, at 21:40:52Z, the page fetched one landing picture, `home/orbit.en.webp`, which is never precached.)
  - The page offered "A new version of Orbitlab is ready. Reload". After Reload the page ran `408ad16b`, with worker `0fc2847196867c` complete 68 of 68 and `pageMatches` true. The old precache was deleted (caches: `orbitlab-precache-0fc2847196867c`, `orbitlab-runtime`).
- **Reads, no writes.**
  - The same learner opened (`legacy-v1`, the only one).
  - The stored value on opening, after loading `408ad16` and after showing the result was `c127d875…` every time, step 1's bytes exactly. No recovery copy was made: `408ad16`'s `loadProgress` keeps the test object as parsed and the bytes round-trip.
- **Same result.** The card read "Latest test: 23 %. Recommended start: 1.1 Your first orbit.". The headline, summary, six area bars and the WebMCP result were identical to step 1.
- **The old build saves.**
  - Lessons → 1.1 Your first orbit → "💡 Hint 1/3" (the button then read "💡 Hint 2/3"). This is `lesson-mode`'s `showHint` → `saveProgress`, which writes the whole progress value back.
  - The value became 2 487 bytes, SHA-256 `1ebff792…dacaf330`. `lessons` is now `{"orbit-first":{"attempts":0,"hintsShown":1,"passed":false}}`.
  - The test's bytes are unchanged (`875246cd…`), appear literally in the value and still hold `"revision":1`. No recovery key appeared. This build has no `revision` in its types, so it kept a field it does not know.
- After the save the result page was the same, and after a reload the value was the same (`1ebff792…`).

#### Step 3: roll back to `c5da5bb` (2a only)

- **Deploy and update** (21:41:36Z), the same flow as step 2.
  - The first page ran `408ad16b` (worker `0fc2847196867c`).
  - The new `sw.js` was fetched, and the install downloaded 14 files besides `sw.js`.
  - After Reload the page ran `c5da5bb4` with worker `0eed9ed5c1b44e`, complete 68 of 68, `pageMatches` true. Caches: `orbitlab-precache-0eed9ed5c1b44e`, `orbitlab-runtime`.
- **Reads, no writes.** The same learner opened. The value on opening, after loading and after showing the result was `1ebff792…` each time (what `408ad16` left).
- **Same result**: the same headline, summary, bars, card and WebMCP result as step 1. This build's reader (`attemptRevision`) reads `"revision":1` as revision 1 and grades the test with the revision-1 bank. The control below shows that it does read the field.
- **The 2a build saves.** Hint 2/3 (the button then read "💡 Hint 3/3"). The value is SHA-256 `2793b2db…a44229af` with `hintsShown` 2. The test's bytes are unchanged (`875246cd…`) with `"revision":1`, and there is no recovery key. The score was the same after the save, and the value was the same after a reload.

#### Step 4: roll forward to candidate 7263004

- **Deploy and update** (21:42:49Z).
  - The first page ran `c5da5bb4` (worker `0eed9ed5c1b44e`).
  - The install downloaded only `sw.js` and `index.html`. The candidate's other changed files were still in the profile's HTTP cache from step 1 and matched their revisions, so `fetchVerified` used them. `index.html` (one URL, different bytes per build) failed the revision check and was downloaded again.
  - After Reload the page ran `72630046` with worker `0b9ffbcb4c7564`, complete 68 of 68, `pageMatches` true. Caches: `orbitlab-precache-0b9ffbcb4c7564`, `orbitlab-runtime`.
- **Reads, no writes.** The same learner opened. The value on opening, after loading and after showing the result was `2793b2db…` each time (what `c5da5bb` left).
- **Same result** as step 1 on every field compared.
- **The candidate saves.** Hint 3/3 (the button then read "No more hints"). The value is SHA-256 `dfc9c763…253abfacd` with `hintsShown` 3. The test's bytes are unchanged (`875246cd…`). The writer stamps new tests only and did not touch this one. The score was the same, and the value was the same after a reload.

#### The round trip, end to end

- **Test bytes.** The test's bytes at the end equal step 1's: SHA-256 `875246cd9d6a08e177c7be4eeddfe2a35018854e19eb13528b1dc3b09bff261d` at all 17 reads from the finish to the end.
- **The whole value.** At the end it equals step 1's except `lessons`, which holds the history the three hint saves wrote, one per build. It is not byte-equal to step 1's value.
  - The drill's own check (one of the 48) compares the parsed values with `lessons` set aside (`isDeepStrictEqual` in `drill.mjs`). It does not compare bytes.
  - The byte-level claim was checked after the run, offline, on the saved files (`post-run-checks.json`). Replacing step 1's `"lessons":{}` (it occurs once) with `"lessons":{"orbit-first":{"attempts":0,"hintsShown":3,"passed":false}}` gives the end value byte for byte (2 429 → 2 487 bytes, `c127d875…` → `dfc9c763…`).
- **The result.** All seven readings of the result were identical: step 1, then steps 2, 3 and 4 each before and after that build's own save.
  - The drill's checks (`sameScore` in `drill.mjs`) compared the card, the eyebrow, the headline, the summary, the six bars and the whole WebMCP answer.
  - The four cards (strengths, to work on, misconceptions, recommended path) were recorded in each reading but are not in `sameScore`. They were compared after the run from `drill-log.jsonl` (`post-run-checks.json`): identical in all seven readings, as is every other recorded field. A rerun should add `cards` to `sameScore`.
- **No write on read.** No build wrote `orbitlab.lessons` on loading, on showing the result or on reloading. Every change of value in the table below follows a hint save. [2026-10-29 note: this holds only for the reads taken here. The run on `1842a86` also read storage after opening lesson 1.1 and before the hint, and found that opening the lesson is itself a save (`startLesson`, `lesson-mode.ts:394`–`:395`): in its step 2, `408ad16` wrote the `orbit-first` entry with `hintsShown` 0 before the hint (D5 above).]
- **Other keys.** The learner record's own `revision` counter rose on page loads as well as on saves (29 at the end of step 1, 63 at the end), because the app saves other keys of the record when a page loads. `orbitlab.lessons` did not change on those loads.

| Read | Build running | `orbitlab.lessons` SHA-256 | Test bytes SHA-256 | `"revision":1` | Recovery key |
|---|---|---|---|---|---|
| step 1, test begun | candidate 7263004 | `bfd36d80…` (1 280 B) | `7879411a…` (no answers) | yes | none |
| step 1, finished | candidate 7263004 | `c127d875…` (2 429 B) | `875246cd…` | yes | none |
| step 1, after reload | candidate 7263004 | `c127d875…` | `875246cd…` | yes | none |
| step 2, opened (before Reload) | candidate 7263004 | `c127d875…` | `875246cd…` | yes | none |
| step 2, loaded | `408ad16` | `c127d875…` | `875246cd…` | yes | none |
| step 2, after showing the result | `408ad16` | `c127d875…` | `875246cd…` | yes | none |
| step 2, after its own save (hint 1) | `408ad16` | `1ebff792…` (2 487 B) | `875246cd…` | yes | none |
| step 2, after reload | `408ad16` | `1ebff792…` | `875246cd…` | yes | none |
| step 3, opened (before Reload) | `408ad16` | `1ebff792…` | `875246cd…` | yes | none |
| step 3, loaded | `c5da5bb` | `1ebff792…` | `875246cd…` | yes | none |
| step 3, after showing the result | `c5da5bb` | `1ebff792…` | `875246cd…` | yes | none |
| step 3, after its own save (hint 2) | `c5da5bb` | `2793b2db…` | `875246cd…` | yes | none |
| step 3, after reload | `c5da5bb` | `2793b2db…` | `875246cd…` | yes | none |
| step 4, opened (before Reload) | `c5da5bb` | `2793b2db…` | `875246cd…` | yes | none |
| step 4, loaded | candidate 7263004 | `2793b2db…` | `875246cd…` | yes | none |
| step 4, after showing the result | candidate 7263004 | `2793b2db…` | `875246cd…` | yes | none |
| step 4, after its own save (hint 3) | candidate 7263004 | `dfc9c763…` | `875246cd…` | yes | none |
| step 4, after reload | candidate 7263004 | `dfc9c763…` | `875246cd…` | yes | none |

#### Control: the 2a build reads the field

The control used a separate, throwaway browser context with its own storage and service workers blocked, not the drill's profile. With `c5da5bb` served, it seeded its learner with the drill's final value, changing only the test's `"revision":1` to `"revision":2`.

The `c5da5bb4` page did not show the test:
- the catalogue card offered "Not sure where to start? A 25-question test …" (no result);
- WebMCP gave `{"taken":false}`.

This is 2a's newer-test rule ("ไม่แสดง และเก็บไบต์ไว้"). So step 3's same score comes from `c5da5bb` reading the test as revision 1. It does not come from ignoring the field.

On its own, the drill's control cannot rule out a seed that never landed or was overwritten, which would also give "Not sure where to start?" and `taken:false`: it does not read storage back after its reload, and it has no revision-1 twin. So the control was run again after the drill, with both added.

```sh
# in the drill's tool folder (local, not committed); control-recheck.mjs, SHA-256 abeb7b2b…6c803cd1eb
OUT=<out>/control-recheck PORT=4392 FONTCONFIG_FILE=<fonts.conf> \
  timeout 900 node control-recheck.mjs > <out>/control-recheck/run.out 2>&1    # exit 0, 2026-10-26 22:18:40–22:19:57Z
```

It served the same `c5da5bb` `dist` (`sw.js` `28c065fc…05ffecc`), with the same browser, flags and throwaway context as the drill's control. It seeded the drill's final value twice, once with the test at revision 2 and once left at revision 1, then reloaded and read storage back.

| Seeded revision | Page | Seed landed before the reload | Stored value after the reload | Card | WebMCP |
|---|---|---|---|---|---|
| 2 | `c5da5bb4` | yes | the seed byte for byte (`8c4c6aa5…`, 2 487 B), revision 2, no recovery key | "Not sure where to start? …" | `taken:false` |
| 1 | `c5da5bb4` | yes | the seed byte for byte (`dfc9c763…`, the drill's final value), revision 1, no recovery key | "Latest test: 23 %. Recommended start: 1.1 Your first orbit." | `taken:true`, `percent` 23, `start` `orbit-first` |

Same storage, same seeding, and only the revision differs: the 2a build shows the revision-1 test and hides the revision-2 one while keeping its bytes. No page error in either. The drill's conclusion holds.

### Result

The check column gives draft S17 rule 4's three steps in English (`S17:171`; the Thai is quoted under "Why this drill").

| Step (S17 rule 4) | Check | Build used | Result | Evidence |
|---|---|---|---|---|
| 1 | Install the candidate and create a test that has a revision. | candidate 7263004 | **pass** | test begun and finished with `"revision":1`. Score 23 %, 7 of 25, misconceptions 6 |
| 2 | Install the previously published build. The data must read, or open read-only, not be overwritten, and keep unknown fields. | `408ad16` (before 2a), in place of `a05ae70`: **variance V1** | **pass** on `408ad16` | worker `0fc2847196867c` through the app's update offer. Same learner, same result and score. No write on load or view (`c127d875…`). After its own save the test bytes are unchanged with `"revision":1` (`875246cd…`) |
| 2 | (same item) | `c5da5bb` (2a only), in place of `a05ae70`: **variance V1** | **pass** on `c5da5bb` | worker `0eed9ed5c1b44e`. Same result and score, read as revision 1. Control: a revision-2 test is hidden, and its re-check with read-back and a revision-1 twin shows the seed landed and the field is read. After its own save the test bytes are unchanged |
| 3 | Go back to the candidate. The stored bytes must be equal. | candidate 7263004 | **pass** for what was shown: no build wrote on load or view, and the test's bytes are equal. The whole value is not byte-equal to step 1's, because the drill's own hint saves changed `lessons` | worker `0b9ffbcb4c7564`. Value on opening = what `c5da5bb` left (`2793b2db…`), unchanged after loading and showing the result. Test bytes = step 1's (`875246cd…`) at all 17 reads from the finish. Whole value = step 1's plus the drill's own hint history: shown byte for byte after the run by replacing `lessons` (`post-run-checks.json`); the drill's own check compares parsed values |

48 of 48 checks passed, with no page error and no console error or warning. An earlier full run of the same drill (21:33–21:38Z, without the candidate's own save in step 4) passed 45 of 45 with another test (16 %, 4 of 25). The control re-check and the offline post-run checks came after the run and are not among the 48.

2b's rollback line holds as written in its report (`FX-2-s2b-m-learning-027-writer.md:150`): "Revert the fix commit. Tests begun while it was live keep `"revision": 1`. Every build reads that as revision 1 or keeps it unread … so nothing needs migrating." There is no orphaned data, so a revert stays possible and a forward-fix is not the only path (draft S17 rules 2 and 5).

### Limits

- **Local builds, not the Pages bytes.**
  - The three builds were made here from the committed data snapshots. Pages runs `npm run snapshots` before building, which rewrites `public/data/`, so its `dist` (candidate `distSha256` `e4f37fce…b72f`) differs in the data files.
  - The app source built from each SHA is the same, but the JavaScript bytes are not. The build stamp is compiled into the code (`define: { __ORBITLAB_BUILD__ … }`, `vite.config.ts:111`). The local stamps have 8 characters (`72630046`, `408ad16b`, `c5da5bb4`); Pages checks out at depth 1 and its stamp has 7 (`7263004`).
  - So the content-hashed chunk names differ too. The local candidate has `index-BU-tJaNU.js` and `assessment-view-C8YvzY2e.js`; the Pages build has `index-DuQmqZnL.js` and `assessment-view-CVOvnaFe.js` (the `build` job log of Pages 40385448079, job 121793105792). The precache manifest and the worker version differ with them.
- **Not github.io.**
  - The builds were served from `127.0.0.1:4391` by a local server that copies Pages' caching headers. The live site cannot be reached from here (the proxy refuses `royin001.github.io`).
  - A real rollback reaches users through a revert on main and a Pages run. The `deploy.yml` tip guard never publishes an old SHA directly (draft S17 rollback rule 1), and the reverted build would carry a new stamp.
  - The drill swapped the served folder instead. The pipeline was not part of it.
- **One browser.**
  - Chromium 153 headless shell only, one learner, English. Safari, Firefox, iPad and Android are HU-6's.
  - The learner closed the browser and came back for each step. A tab left open would get the same offer from the hourly `registration.update()` in `register.ts`; that timer was not waited for.
- **One kind of old-build save.**
  - The old builds saved through `lesson-mode` (a hint), which rewrites the whole `orbitlab.lessons` value. [2026-10-29 note: opening the lesson is a save as well (`startLesson`); the run on `1842a86` saw it (D5 above).]
  - Other writers that carry tests were not exercised in the browser here: resuming on an old build a test begun but not finished on the candidate, starting a follow-up test on an old build, a project archive, a profile backup and the results file. 2a's round-trip tests cover the last four (`tests/assessment-revision.test.ts`, storage, archive, import check and results file), and those readers are unchanged since `408ad16`.
  - Resuming is the most direct of these, because it rewrites the test object itself. At `408ad16`, `src/ui/lessons/assessment-view.ts:139` resumes the parsed test in place (`this.attempt = open`), `:382` sets `a.answers[this.index] = answer` on it and `:402` sets `finishedAt`, each followed by a save. So `revision` is expected to survive, but the drill used only a finished test and hint saves.
- **Revision 1 only.**
  - `BANK_REVISION` is 1 at `c5da5bb` and at the candidate (`src/lessons/assessment/bank.ts:35`). `408ad16` has no revision concept (`git grep BANK_REVISION 408ad16` finds nothing) and writes none. So no build here writes a revision another cannot read.
  - The read-only path for a newer record (draft S17 rule 3's "read-only message") does not arise for revision 1. The control shows only that the 2a build hides a revision-2 test.
- **Pattern answers.** The answers followed a fixed pattern through the page's controls, not a real learner. The score is low (23 %) but has every area, a "Basic" level and six misconceptions to compare.
- **Owner checks.** Not a gate decision. G7 item 2's old-worker reload on the live site stays the owner's to check: it waits for the owner's HU-6 session (2026-11-25: no session at GK1, by the owner's "ย้าย HU-6 ไป GK2 (แนะนำ)", 07:21:22Z).

### Files (local, not committed)

In the drill's local results folder:

- `run-candidate-7263004.out`: the console of the run, with every check line;
- `run-candidate-7263004/drill-log.jsonl`: each record with its time: builds, service-worker states, stored reads, results, the update offer;
- `run-candidate-7263004/steps.json`: everything above, with the 48 checks;
- `run-candidate-7263004/stored/`: the exact `orbitlab.lessons` string and the test's bytes at each of the 18 reads (`<step>-<moment>.json`, `.test.json`);
- `run-candidate-7263004/shots/`: 22 screenshots, including the update offer of each roll, each result page before and after the save, the hint saves and the control;
- `run-candidate-7263004/server.log`: every request with the build served, the deploys and the `sw.js` fetches;
- `run-candidate-7263004/profile/`: the browser profile;
- `builds/`: the build logs, times and file lists (`cand-files.sha256` = `wtcand-files.sha256`);
- `trial1/`: the earlier full run (45 of 45);
- `tools.sha256`: the hashes of `drill.mjs` and `server.mjs` (in the drill's local tool folder);
- `control-recheck/`: the control re-check after the run (`control-recheck.json`, `run.out`, `server.log`, two screenshots, `start`/`end`/`exit`);
- `post-run-checks/`: `post-run-checks.json` (whole value by byte replacement, the cards of all seven readings, the whitespace sabotage) from `node post-run-checks.mjs <out>/run-candidate-7263004 > <out>/post-run-checks/post-run-checks.json`, run in the drill's tool folder (exit 0), and `tools.sha256` with the hashes of `control-recheck.mjs` (`abeb7b2b…6c803cd1eb`) and `post-run-checks.mjs` (`caa06a0d…fb26397990`).
