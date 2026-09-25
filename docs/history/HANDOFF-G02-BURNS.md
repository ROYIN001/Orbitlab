# คำสั่งสำหรับอีกเซสชัน: ให้การจุดเครื่องในวงโคจรใช้ค่าจากระบบนำร่อง (ต่อจาก G02)

เจ้าของโปรเจกต์ยืนยันแล้ว (2026-09-24) ว่าให้การวางแผนและบังคับทิศการจุดเครื่องในวงโคจรใช้ค่าที่ระบบนำร่องประมาณได้
งานนี้ต้องแก้ไฟล์ที่เซสชันของคุณดูแลอยู่ เซสชัน GNC จึงไม่ได้แก้เอง และเขียนคำสั่งนี้ไว้ให้

## บริบท
- branch `claude/dreamy-archimedes-r04m47` เพิ่มระบบนำร่องเฉื่อย (roadmap G02) ไว้ที่ `src/physics/nav/`
  - เป็นตัวเลือกใน `MissionConfig.dynamics.navigation` ซึ่งปิดอยู่เป็นค่าเริ่มต้น
  - เมื่อเปิด autopilot, ระบบนำทางช่วงขึ้นบิน, การดับเครื่องยนต์ขาขึ้น/ตอนจุดเครื่อง (`checkAscent`, `checkBurn`, `onCoreBurnout`) และการหันไปทาง prograde ในวงโคจร จะใช้ค่าประมาณ
- ส่วนที่ยังใช้ค่าจริง `this.sim.state` คือ `src/physics/sim/burns.ts` ทั้งไฟล์ และบางจุดใน `src/physics/sim/ascent.ts`
- G02 เพิ่ม accessor ไว้ให้ใช้แล้ว (อยู่ใน `src/physics/simulation.ts`):

  ```ts
  sim.knownState(): { r, v, dir, elements, attitudeQ?, omegaBody? }
  ```

  - **ถ้าไม่มีระบบนำร่อง** จะคืน object ของค่าจริงตัวเดิม (`state.r`, `state.v`, `state.dir`, `state.elements`, `state.rigid.attitudeQ/omegaBody`) การเปลี่ยนมาอ่านจากที่นี่จึงไม่เปลี่ยนผลการบินเลยแม้แต่บิตเดียว
  - **ถ้ามีระบบนำร่อง** จะคืนค่าประมาณ ส่วน `elements` คำนวณจากค่าประมาณและ cache ไว้ต่อหนึ่งการอัปเดต

## ก่อนเริ่ม
merge `origin/claude/dreamy-archimedes-r04m47` เข้า branch ของคุณก่อน (อย่างน้อยถึง commit ที่เพิ่ม `knownState`)

## สิ่งที่ต้องทำ
ในเส้นทาง "ตัดสินใจและบังคับทิศ" ของ `sim/burns.ts` ให้อ่านสถานะของยานผ่าน `const k = this.sim.knownState()` แทนการอ่าน `this.sim.state.r / .v / .dir / .elements / .rigid.omegaBody`

| ฟังก์ชัน | สิ่งที่ต้องเปลี่ยน |
|---|---|
| `rigidForecastAt` | `propagateJ2Coast(this.sim.state, …)` ให้ส่ง `{ r: k.r, v: k.v }` แทน |
| `judgedElements` | `s.r`, `s.v`, `s.dir` → `k.r`, `k.v`, `k.dir` |
| `failRigidOrbitPrediction` | `elementsFromState(s.r, s.v)` |
| `prepareRigidTransfer` | `physicalObjectiveShot(burn, s)` / `physicalApexShot(burn, s)` ให้ส่ง `{ r: k.r, v: k.v }`, และ `norm(s.v)` / `normalize(s.v)` → ของ `k` |
| `scheduleNextBurn` | ทุกจุดที่อ่าน `s` (`nextJ2Apsis`, `physicalApsides`, `propagateJ2Coast`, `propagateKepler`, `elementsFromState(now.r, now.v)`) ส่ง `{ r: k.r, v: k.v }` แทน |
| `alignmentAllowance` | `rigid.omegaBody` → `k.omegaBody` |
| `startBurn` | `elementsFromState(s.r, s.v)` และ `rigidForecastAt` / `propagateKepler(s.r, s.v, …)` |
| `finishBurnIncomplete` | `elementsFromState(s.r, s.v)` |
| `burnCommand` | `desiredVelocity(s.r, s.v, …)`, ทิศแรงขับจาก `s.v` / `s.dir`, เกณฑ์ตั้งแนวก่อนจุด `angleBetween(s.dir, dirCmd)`, `s.elements.periapsisAlt` → ของ `k` |
| `coastCommand` | `normalize(s.v)` / `s.dir` → ของ `k` |

ใน `sim/ascent.ts`:
- `abandonInsertion` อ่าน `s.elements` ให้เปลี่ยนเป็น `this.sim.knownState().elements`
- `effectiveGravity` อ่าน `s.r`, `s.speed`, `s.vz` ให้คำนวณจาก `k.r`, `k.v`

**ห้ามเปลี่ยน:**
- ฟิสิกส์และการบันทึกผลยังเป็นค่าจริง: `s.elements` ที่ HUD, telemetry และเหตุการณ์ใช้แสดงผล, การตรวจชนพื้น/กลับเข้าบรรยากาศ และ `accountDeliveredDv`
  - `accountDeliveredDv` ได้แรงขับจริงจาก `simulation.ts` แต่ถ้าจะให้สมจริงขึ้น ควรใช้ Δv ที่มาตรความเร่งวัดได้ ส่วนนี้ทำหรือไม่ทำก็ได้ ถ้าทำให้บอกเซสชัน GNC
- ค่าที่ `burns.ts` เขียนลง `state` (เช่น `burnDvRemaining`, `nextBurnTime`) ยังเป็นสถานะของภารกิจเหมือนเดิม

## เงื่อนไขการยอมรับ
1. **ไม่มีระบบนำร่อง ต้องเหมือนเดิมทุกบิต:**
   - `npm test` ผ่าน
   - fingerprint ใน `tests/heavy/flex-golden.test.ts` (`npx vitest run --config vitest.heavy.config.ts tests/heavy/flex-golden.test.ts`) ไม่เปลี่ยน
2. **เพิ่มเทสต์ภารกิจที่มีการจุดเครื่องในวงโคจร** (เช่น ISS หรือ GTO) เทียบสองกรณี:
   - `dynamics.navigation = { grade: 'tactical' }` (มี GNSS): วงโคจรสุดท้ายใกล้เป้าเท่ากับกรณีไม่มีระบบนำร่อง ภายในค่าคลาดที่สมเหตุผล
   - `dynamics.navigation = { grade: 'mems', gnss: false }`: การจุดเครื่องวางแผนจากค่าประมาณ วงโคจรจริงจึงคลาดจากเป้ามากกว่า และวงโคจรที่ระบบนำร่องเชื่อ (`knownState().elements`) ใกล้เป้ามากกว่าวงโคจรจริง
3. บันทึกผลใน `docs/history/PARALLEL-GNC-2026-09.md` ใต้หัวข้อ G02 และแก้ย่อหน้า "Who flies on it" ใน `docs/PHYSICS.md` §2h ที่ตอนนี้เขียนว่า in-orbit burns ยังใช้ค่าจริง

## วิธีดูผล
- เปิดโหมดวิศวกร แล้วเปิดส่วน "การนำร่อง (INS / GNSS)" ในการตั้งค่า
- บินแล้วเปิดแท็บ "การนำร่อง" ในหน้าต่างตัวตรวจลูป กราฟ "วงโคจรที่เชื่อลบวงโคจรจริง" จะแสดงผลต่าง
- MCP: `read_flight_state.navigation`
