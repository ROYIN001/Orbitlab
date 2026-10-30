# Replay: a seek's frame is its own copy, Apollo and recoveries included / เฟรมที่ seek ได้เป็นสำเนาของตัวเองทั้งหมด รวมถึง Apollo และจุดลงจอด

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ปัญหา: `cloneFrame` สัญญาว่าเฟรมที่ seek ได้เป็นสำเนาลึกทุกชั้นที่โค้ดอื่นเขียนทับได้ เพราะเฟรมนั้นถูกส่งต่อไปยังแผนที่และหน้าจอ onboard แต่มีสามส่วนที่ยังใช้วัตถุเดียวกับเฟรมที่บันทึกไว้: ชิ้นส่วนที่ทิ้งระหว่างขึ้น (`jettisoned`), สถานะของ Apollo ทั้งก้อน (`apollo`) และจุดที่บูสเตอร์บินกลับไปลง (`debris[].recovery.target`) ถ้าโค้ดใดเขียนทับ ข้อมูลที่บันทึกไว้จะเปลี่ยนไปด้วย และสำหรับจุดลงจอด ค่าที่ simulation ใช้นำทางบูสเตอร์ก็เปลี่ยนด้วย ตอนนี้ยังไม่มีโค้ดไหนเขียนทับ แต่สัญญาไม่เป็นจริง
> - ตัดสินทีละส่วน:
>   - `jettisoned` เปลี่ยนระหว่างเที่ยวบิน (แต่ละตัวพลิกจาก false เป็น true หนึ่งครั้ง) จึงไม่ใช่ข้อมูลคงที่ → คัดลอก
>   - `apollo` เปลี่ยนทุกเฟรม (ความสูงและความเร็วเทียบดวงจันทร์ เหตุการณ์ถัดไป ตำแหน่ง CSM/LM) และแผนเปลี่ยนตอนจุดเครื่อง → คัดลอกทั้งก้อน ข้อความใน #187 ที่ว่า "ตัวเลขของดวงจันทร์คงที่ทั้งภารกิจ" ไม่ถูก
>   - `recovery.target` ตั้งครั้งเดียวตอนแยกตัวและ simulation ไม่เคยเขียนทับ (ถ้าต้องย้ายเรือ จะสร้างวัตถุใหม่) จึงเป็นข้อมูลคงที่แบบเดียวกับ `visual` แต่มีแค่ 6–7 ตัวเลข คัดลอกตอน seek ได้ถูก → คัดลอกตอน seek; ส่วนเฟรมที่บันทึกไว้ยังใช้ร่วมกับ simulation ตามเดิม เพราะการคัดลอกลงทุกเฟรมจะเพิ่มหน่วยความจำ 120–144 B ต่อบูสเตอร์ต่อเฟรม
> - ค่าทุกค่าที่ seek ได้เหมือนเดิมทุกบิต เปลี่ยนเฉพาะว่าเป็นวัตถุใหม่ (ตรวจกับ main ทุกภารกิจ watch ทั้ง 20 ภารกิจ)
> - ขนาด: เล็กลง 274 B ต่อไฟล์ (`index-*.js` และ `flight.worker-*.js`) เพราะเขียนการ blend ของ CSM, ascent stage และ service module เป็น loop แทนสามชุดซ้ำ ที่ว่างของ precache code เพิ่มจาก 98 B เป็น 646 B #187 ใช้ได้พอทั้งสองลำดับการ merge
> - หน่วยความจำของการบันทึก (`FRAME_BYTES`) ไม่เปลี่ยน เพราะ `captureFrame` ไม่เปลี่ยน
> - การ merge: แก้จากผิดเป็นถูก มีเทสต์ที่ fail ก่อนแก้ ไม่ได้ขึ้นเพดาน ไม่ได้เปลี่ยน assertion เดิม (รอผลตรวจของ agent ตัวที่สองและ CI) ถ้า #187 merge หลัง PR นี้ ต้องลบประโยคใน docstring ของ `interpolateFrames` ที่ #187 เพิ่มว่า "ข้อมูลเหล่านี้ใช้ร่วมกัน" ออก เพราะจะไม่จริงแล้ว

```yaml
item: replay frame copies (aliasing on main, PR #187's "Not changed, for later")
change_kind: bug fix (the deep copy cloneFrame promises); values unchanged, no assertion changed, no ceiling raised
owner_authorization: 'owner in chat to this session, 2026-10-30: "Task: decide per field whether it is immutable mission data (then document it as deliberately shared, as `debris[].visual` already is) or could be written by a consumer (then deep-copy it in `cloneFrame` and in `interpolateFrames`, e.g. a `cloneApollo`, `jettisoned: { ...f.jettisoned }`, and a copy of `recovery.target`)."'
app_code: src/physics/frame.ts
tests: tests/replay-copies.test.ts (new)
base_sha_verified_on: {sha: 1842a86, date: 2026-10-30}
branch: claude/great-mayer-6kapau
pr: TBD
second_agent_review: TBD
```

_Draft: the sections below (cause, decision per field, change, measurements, second-agent review) are being filled in from runs still in progress._
