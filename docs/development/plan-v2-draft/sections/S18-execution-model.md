## S18 รูปแบบการทำงาน: เลนและเจ้าของไฟล์ ไฟล์ hotspot กฎ fold ขนาด PR หลักฐาน task envelope DoR/DoD และการตรวจทาน

> **ขอบเขต:** ส่วนนี้เป็นบ้านเดียวของรูปแบบการทำงาน ได้แก่ ผู้กระทำ, เลนและ write set, protocol ของไฟล์ hotspot, ตาราง fold, ชนิดและขนาดของ PR, WIP, ขั้นตอนหลักฐาน, task envelope v2, DoR/DoD และการตรวจทาน ส่วนนี้ไม่มีรายการงาน (M-id) และไม่มีแพ็กเกจ เกณฑ์ประตูและทะเบียนความเสี่ยงอยู่ใน S05, นิยาม KPI อยู่ใน S04, แคตตาล็อก oracle อยู่ใน S07, เนื้อหาการตัดสินใจอยู่ใน S08 และรายการห้ามทำอยู่ใน S02 §02.13
> **แทนที่:** PLAN:§6, PLAN:§9.1–9.2, PLAN:§10.2, ส่วนระดับ PR ของ PLAN:§10.3 และ PLAN:§12.1–12.2 (เกณฑ์ release/rollback ระดับประตูอยู่ที่ G7 ใน S05 และ R7.2 ใน S17)
> **ผลบังคับ:** กติกานี้มีผลเมื่อ CO-8 (M-PLATFORM-077, S06) merge หลังเจ้าของอนุมัติ v2.0 ก่อนหน้านั้นใช้ PLAN:§6 และกติกาใน PROGRESS.md เดิม PR ที่เปิดอยู่ในวันรับแผนทำต่อตามกติกาเดิมจนจบ ส่วนขั้นถัดไปใช้กติกาใหม่ นโยบายการกำกับโค้ดจาก AI (เพดานขนาด PR, ผู้ตรวจคนที่สอง, การอ่าน diff ของเจ้าของ) เป็นเนื้อหาของ D-23/D-25 (M-PLATFORM-078, S08) ส่วนนี้ใช้ค่าที่ S08 แนะนำจนกว่าเจ้าของจะตัดสิน
> **§18.0 ฐานข้อเท็จจริงของส่วนนี้: `5f9aa2e`** (อ่านอย่างเดียวผ่าน `gh api` และ `git show`, 2026-10-04 ราว 21:10Z): หลัง `7ddab75` มี #76 (เพดาน precache +320 kB), #77 (R3.5, +1,253/−39, 38 ไฟล์), #78 (R3.3 ท่าพับเก็บ, +150/−14), #79 (docs), #80 (R3.3 แผนภาพ + R3.1 DesignRef, +744/−25, 27 ไฟล์), #81 (start-up marks, +28/−2), #82 (diagnostics ใน harness +34 และ PROGRESS; รวม +36/−1) และ #83 (docs) Pages 37219398466 (#80) และ 37223857005 (#81) ล้มที่ journey `learner-profiles` (รอ `#loading.hidden` หลัง reload เกิน 120 s) แล้ว Pages 37230585947 ที่ `09cc2f5` ผ่านทุกด่านและเผยแพร่ #80–#82 (live = `09cc2f5`) เจ้าของประกาศ R3 ครบ 2026-10-04 ตอนตรวจไม่มี PR เปิดอยู่ ทุก PR ตั้งแต่ #74 มาจาก branch เดียวคือ `claude/funny-turing-vr4jbm` และ GitHub บันทึกว่าบัญชี `ROYIN001` เป็นผู้เปิดและ merge ทุก PR

### 18.1 ผู้กระทำ หน้าที่ และเซสชันจริง

| ผู้กระทำ | หน้าที่ | ห้าม | ใครทำจริง |
|---|---|---|---|
| **H เจ้าของ** | สั่งเริ่มหรือหยุดรายคลื่นหรือรายแพ็กเกจ (D-65) โดยบันทึกคำสั่งตรงตัวใน envelope; ตอบชุดการตัดสินใจ A–D (S08); อนุมัติภาพหน้าจอของทุกการเปลี่ยนภาพ; อนุมัติประตู (S05); อนุมัติ re-record ที่ระบุชื่อ; อนุมัติการขึ้นเพดานตาม D-38 | — (ทุกการอนุมัติต้องเป็นข้อความพร้อมวันที่) | บัญชี `ROYIN001` มีคนเดียว bus factor = 1 (D-23) |
| **I ผู้รวมงาน** | ถือไฟล์ hotspot (§18.3), ช่อง I หนึ่งช่อง และช่อง records (≤2 PR Markdown อย่างเดียว, §18.6); เดิน I-train; ก่อน merge ตรวจ write set, ชนิด, ขนาด และ envelope; merge เมื่อ CI เขียวและผู้ตรวจครบ; บันทึก DECISIONS.md, ส่วนหัวและแถว KPI ใน PROGRESS; ตรึง candidate ของ GK; ทำ PR บันทึกการเผยแพร่ | ตรวจ PR ของตัวเองแทนผู้ตรวจคนที่สอง; ตัดสินแทน H | เซสชัน AI หนึ่งเซสชันต่อคลื่น ระบุชื่อใน envelope ของคลื่น (R1 = เซสชัน Codex `codex/r1-*`; R2–R3.x = เซสชัน Claude บน `claude/funny-turing-vr4jbm` ที่ทำทั้ง I และทุกเลน) |
| **ผู้ประสานเซสชัน (coordinator)** | เปิดเซสชันเลนด้วย prompt ของ §18.11 เฉพาะ envelope ที่ `execution_authorized: true`; ติดตาม WIP, CI แดง, branch ค้าง และ hook ที่รอ; รวมแถวการตัดสินใจสถานะ proposed ที่เลนหยุดไว้เข้าชุดของ S08; เตรียมชุดภาพหน้าจอและรายการ GK ให้ H เวลาของเจ้าของจึงใช้เฉพาะชุดการตัดสินใจ ภาพหน้าจอ และประตู | อนุญาตแพ็กเกจแทน H; เปิดเซสชันให้แพ็กเกจที่ยังไม่ได้รับอนุญาต; merge ถ้าไม่ได้ถือบทบาท I | I หรือเซสชันเฉพาะหนึ่งเซสชัน ระบุชื่อใน envelope ของคลื่น งานนี้ไม่ใช่ PR จึงไม่ใช้ช่อง WIP แต่ใช้เวลา จึงนับใน S05 §05.9 |
| **เซสชันเลน (AI)** | ทำหนึ่งขั้นของแพ็กเกจ: หนึ่ง branch และหนึ่ง PR; เขียนเฉพาะ write set ของเลน (§18.2); ส่ง hook request ให้ I; เขียนรายงาน; ถามคำถามขอบเขตเป็นทางเลือกพร้อมข้อเสนอ | merge เอง; แก้ไฟล์ของเลนอื่น; ขยายขอบเขต; อนุมานว่าแพ็กเกจถัดไปได้รับอนุญาตแล้ว | เซสชัน Claude Code หรือ Codex แยกกัน ทำพร้อมกันได้ตาม WIP (§18.6) |
| **Q ผู้ตรวจยืนยัน** | oracle kit, reproducer, matrix ภาพหน้าจอ, journey ข้ามระบบ (R7.1), ตรวจหลักฐาน sabotage | แก้ `src/**`; ใช้ oracle ที่ตัวเองเขียนเป็นหลักฐานชิ้นเดียว | เซสชันที่แยกจากผู้เขียนโค้ด |
| **ผู้ตรวจ agent คนที่สอง** | ตรวจ PR ที่เป็น P0/P1, ฟิสิกส์ และ storage (§18.13); รายงานว่า "ยืนยันได้ N จาก M ข้อ" | อยู่ในเซสชันเดียวกับผู้เขียน; อนุมัติแทน H | เซสชันใหม่ที่อ่านอย่างเดียวและไม่มีบริบทของผู้เขียน |
| **ผู้ตรวจวิทยาศาสตร์อิสระ (D-55)** | รันตัวเลขหลักซ้ำเอง; ตัดสิน scientific acceptance ของงาน realism | เป็นคนเดียวกับผู้ fit | คนหรือ agent คนที่สองที่มีหน้าที่รันซ้ำ ตามคำตอบของ D-55 |
| **คนที่ระบุชื่อ (เลน H)** | ผู้ตรวจภาษา TH/RU (HU-3), ครูและผู้เรียน (HU-1, HU-4), ผู้ตรวจ pack (HU-2) | — | ตาม S16 |
| **เครื่อง** | CI (`ci.yml`, มัธยฐาน ~16.7 นาที), Pages (`deploy.yml`, 18–22 นาที), heavy/fleet (`heavy.yml`/`heavy-audit.yml`, 25–61 นาที / ~2 ชม. 40 นาที), perf (`measure.mjs` ~9 นาทีต่อ 3 รอบ เข้า repo ผ่าน R0.4) | ผลจากเครื่องเป็นหลักฐาน ไม่ใช่การอนุมัติ | GitHub Actions |

**กติกาการจับคู่บทบาทกับเซสชัน:** เซสชันหนึ่งถือหลายบทบาทตามลำดับได้ แต่ห้ามตรวจ PR ของตัวเอง ห้ามถือช่อง I พร้อมกับเปิด PR ของเลนอื่น และห้ามใช้ oracle ที่ตัวเองเขียนเป็นหลักฐานชิ้นเดียว คำอธิบาย PR ต้องระบุลิงก์เซสชันที่เขียนและผู้สั่ง merge เพราะบันทึกของ GitHub แยกไม่ออก ข้อนี้ตอบ PC:(c)6 (R1 ทั้งระยะทำโดย root agent ตัวเดียว ไม่มีแถว P-R และไม่ระบุผู้ตรวจอิสระ)

**ตารางเจ้าของจาก PLAN:§6 (คงไว้ เพิ่มแถวใหม่):** เจ้าของคือผู้มีสิทธิ์เขียนส่วนร่วมในรอบงานนั้น ผู้อื่นเสนอ interface หรือ patch และพัฒนาโมดูลแยกได้ แต่ไม่แก้ไฟล์ hotspot พร้อมกัน

| เจ้าของ | ส่วนที่รับผิดชอบ | ส่วนที่ต้องเข้าคิว / ผ่านใคร |
|---|---|---|
| I | `main.ts`, `index.html`, app routes, shared shell, global CSS และจุดต่อโมดูล | learner injection, layout, cameras, ลิงก์ Build/Orbit, routes ของ ISS/cockpit |
| U | layout, lifecycle, cards, HUD, telemetry UI และ scoped styles | การซ่อน setup, ตำแหน่ง notation, mobile controls และการจัด layout เป็น workstream เดียว |
| C | `render/cameras.ts`, ขอบเขต gesture ของ Orbit, CameraPolicy, infrastructure ของ render | wheel fix มาก่อน Watch manual; ความหมายของ phase/follow/drag รวมกัน |
| V | event chooser, event identity/seek/focus ใน `ui/timeline.ts` | การต่อเข้า shell/keyboard ผ่าน I/U; ไม่แก้ recorder หรือสัญญา clock เอง |
| L | progress, designs, mission, notebook, drafts, repository, reset, migration, archive, recovery | โปรไฟล์ทั้งแอป, version ของ backup และ async jobs ทุก domain เป็นงานข้อมูลเดียว |
| S | schema ของ mission/handoff/state, validators, provenance, ADR | สัญญา archive ของโปรไฟล์; ความเข้ากันได้ของสถานะ Docking/cockpit ร่วมกับเจ้าของ domain |
| B | Build shell, Engineer, Satellite UI, Build CSS | ภาพจรวด/ดาวเทียม และ readiness-to-edit รวมผ่าน B |
| B-R / B-S | โมดูลภาพจรวด/ดาวเทียมแบบ pure | ไม่แก้ Build shell, global styles หรือ physics core |
| P | simulation, burns, rigid runtime/control, rendezvous/contact | การเปลี่ยนเชื้อเพลิง/step/pointing/planner ทำทีละงาน และตรวจทุก family ที่กระทบ |
| P-D | ผู้เขียน engines/parts/vehicles และ source ledger | ค้นคว้ารายยานทำขนานได้ แต่การแก้ไฟล์ร่วมรวมโดยคนเดียว |
| T | YAML, audit manifests, test discovery/runner/aggregation, `budgets.json` | ความเร็ว CI, trigger policy และกติกา coverage อยู่ใน stream เดียว |
| Q | reproducer specs, reference อิสระ, หลักฐานและการตรวจ | ไม่แก้ source ระหว่างเก็บ baseline; defect ส่งกลับเจ้าของ domain |
| A | cockpit, instruments, audio, scenarios | systems → P; คะแนนผู้เรียน → L; cameras/routes → C/I |
| **L-UI** (มีใน R1.2 แต่ไม่มีแถว) | UI ผู้เรียน: บทเรียน, โปรไฟล์, worksheet, classroom | ข้อความผ่าน i18n protocol; storage ผ่าน L |
| **O** (ใหม่) | ส่วน Orbit: playground, sky, เครื่องมือ Orbit และ job ของ Orbit | `orbit/handoff.ts` → S; ฟิสิกส์ร่วม → P; บรรทัดใน `main.ts`/home → I |
| **L-C** (ใหม่) | เนื้อหาบทเรียน, pack, คลังข้อสอบ, คู่มือครู, ศัพท์ไทย | key ใหม่ผ่าน i18n protocol; `reviewed:true` เฉพาะผู้ตรวจที่เป็นคน |
| **W** (ใหม่) | `docs/**` ที่ไม่ใช่ไฟล์ของ I และไม่ใช่ Markdown ที่โค้ดอ่าน | PROGRESS/PLAN/DECISIONS → I; รายงานแพ็กเกจเขียนโดยเลนเจ้าของ |
| **H** (ใหม่) | การตัดสินใจ การอนุมัติ การศึกษาผู้ใช้ การตรวจโดยคน | บันทึกลงไฟล์โดย I |
| **P-R** (ใหม่; PLAN:R5.4 อ้างแต่ไม่มีแถว) | render ที่ต้องตรงกับสถานะฟิสิกส์: ยาน สถานี port, plume, debris | infrastructure ของ render → C; สถานะฟิสิกส์ → P |

### 18.2 ตารางเลน: write set, สิ่งที่ห้ามแตะ และแพ็กเกจหลัก

write set เป็นสิทธิ์เฉพาะตัวตลอดเวลาที่ PR ของเลนนั้นเปิดอยู่ ไฟล์นอก write set ต้องใช้ hook request (ไฟล์ hotspot, §18.3) หรือส่งต่อให้เลนเจ้าของ แต่ละเลนเขียน test ของ feature ตัวเองในไฟล์ของตัวเองได้ (PLAN:§6 กติกา 6) ส่วนรูปแบบ fixture ร่วมและ harness เป็นของ T หรือ Q envelope "ยืม" path ของเลนอื่นได้เมื่อเลนนั้นไม่มี PR เปิดอยู่บน path นั้น และเลนเจ้าของเป็นผู้ตรวจ โดยต้องบันทึกใน `borrowed_paths` (§18.11)

| เลน | บทบาท | write set (ตัวอย่าง path บน `da67341`) | ห้ามแตะ | แพ็กเกจหลัก |
|---|---|---|---|---|
| I | ผู้รวมงาน | `src/main.ts`, `index.html`, `src/style.css`, `src/ui/modes.css`, `src/i18n/index.ts` และโครงของ `en/th/ru.ts` นอกบล็อกของเลน, `src/ui/home*.ts`, seam ที่ EQ-15 ถอดออก, `docs/development/{PROGRESS,PLAN}.md`, `docs/DECISIONS.md`, `CHANGELOG.md`, `docs/README.md` | `src/physics/**`, `src/data/**`, `budgets.json`, `.github/**` | CO-2/4/8, ส่วน I ของ FX-5, EQ-6/7/12 (ส่วน `main.ts`), EQ-15, hook ของ R2.1r/R2.5, ส่วน I ของ R3.1r (M-LAUNCH-030, ผู้เขียนเดียวของ M-PLAN-028), hook Home ของ R3.5r (M-LAUNCH-067), R5.1, routes ของ R6 |
| U | UI งาน Launch | `src/ui/{panel,hud,hudlayout,hudmode,telemetry,telemetry-layout,telemetry-charts,charts,engine-levels,flight-lifecycle,onboard,narration,rigid-controls,toru-controls,notation,csv,compare,monte-carlo,dialogs}.ts`, `src/ui/loop-*.ts` และ CSS เฉพาะของไฟล์เหล่านั้น | hotspot ของ I, `src/render/**`, `src/replay/**`, `src/physics/**` | ส่วนหนึ่งของ CO-4, EQ-12, R2.1r, R2.3s2 |
| V | timeline | `src/ui/{timeline,timeline-chooser,timeaxis}.ts` | recorder (`src/replay/**`) และสัญญา clock ใน `main.ts` | R2.6 |
| C | infrastructure ของ render และกล้อง | `src/render/**` (เช่น `scene`, `webgl-renderer`, `cameras`, `camera-policy`, `gestures`, `glow-governor`, `dispose`, `rocket`, `trails`) ยกเว้นไฟล์ที่ P-R ได้รับมอบภายในแพ็กเกจของตน และ `orbit-view.ts` ในช่วงที่มอบให้ O | `src/physics/**`, `src/ui/**`, hotspot ของ I | EQ-2, ส่วน render ของ EQ-3, FX-8, R2.2r, reduced motion ของ R2.5, R3.0, R4.7 |
| P-R | render ที่ผูกกับสถานะฟิสิกส์ | ไฟล์ใน `src/render/**` ที่แพ็กเกจของ P-R ระบุ (เช่น `{soyuz,station,ship,dragon,apollo,apollo-cm,plume,exhaust,debris}.ts`) เฉพาะช่วงของแพ็กเกจนั้น | `scene.ts`/`webgl-renderer.ts`/กล้อง (C), สถานะฟิสิกส์ (P) | R4.7 (ร่วมกับ C), R5.4, EQ-14 (M-LAUNCH-047/048) |
| O | ส่วน Orbit | `src/ui/orbit/**`, `src/orbit/**` ยกเว้น `handoff.ts`, job/worker ของ Orbit (`src/orbit/*-job.ts`, `*.worker.ts`) | `src/physics/**` (P ตรวจ), `orbit/handoff.ts` (S), hotspot ของ I | FX-3, EQ-4, EQ-5, R4.6, เครื่องมือของ ED-MIL-1 |
| B | Build | `src/ui/build/**` (รวม CSS ของ Build), `src/design/**`, `src/config/**` ยกเว้นไฟล์ schema ของ S | global CSS, `main.ts`, `src/physics/**`, `src/data/**` | FX-1, EQ-13, R3.2r–R3.4r, R3.6 |
| B-R / B-S | ภาพจรวด / ภาพดาวเทียม | `src/design/{stack-drawing,exploded,part-card}.ts` / `src/design/satellite-*.ts` ที่เป็นภาพ, `src/ui/build/satellite-svg.ts` | Build shell, global styles, physics core | R3.2r / R3.3r |
| L | storage | `src/workspace/**`, `src/lessons/progress.ts`, `src/projects/{archive,validation}.ts`, `src/design/design-store.ts`, ที่เก็บ soundtrack | UI (L-UI), `main.ts` | R1.6 |
| L-UI | UI ผู้เรียน | `src/ui/{lessons,profiles,projects,classroom,experiments}/**`, `src/worksheets/**`, `src/experiments/**`, `src/classroom/**` | internals ของ storage (L), `main.ts` | FX-2, ED-CLASS-1, ED-LES-2 |
| L-C | เนื้อหาการเรียน | `src/lessons/{builtin,pack-sources,assessment}/**`, pack ที่สร้างด้วย `scripts/lesson-packs.ts --check`, `docs/GLOSSARY.md` (ใหม่), คู่มือครู, key ศัพท์ไทยผ่าน i18n protocol | โค้ดนอกไฟล์เนื้อหา; เปลี่ยน `reviewed:false` เป็น true | CO-7, ED-* |
| S | สัญญาข้อมูล | `src/types.ts`, `src/orbit/handoff.ts`, `src/design/{build,satellite}-handoff.ts`, `src/design/design-ref.ts` (#80), `src/config/{validation,mission-file}.ts`, `docs/development/adr/**` (ตำแหน่งที่เสนอ, D-59) | implementation ของเลนอื่น, `main.ts` | R0.2r, R3.1r |
| P | ฟิสิกส์ (ทีละ PR) | `src/physics/**`, `src/session/**`, `src/replay/**` (recorder; schema ผ่าน S), `tests/heavy/**`, `tests/sixdof-fleet/**` | `src/data/**` (P-D), UI และ render | CO-6, harness ของ R0.4, EQ-9 → EQ-10 → EQ-11, R4.2/R4.3/R4.5, R5.2/R5.3, R8 |
| P-D | ข้อมูลยาน | `src/data/**`, source ledger, `docs/SIXDOF-VEHICLE-DATA.md` (แก้ในรูปแบบเดิมเท่านั้น) | runtime (P); golden (re-record ที่ระบุชื่อทำผ่าน P) | R4.1, ข้อมูลของ R4.2 |
| T | แพลตฟอร์ม | `.github/**`, `scripts/**`, `vite.config.ts`, `budgets.json`, `package.json` และ lockfile, `tsconfig.json`, `tests/browser/{harness,serve,run,shard}.mjs`, `tests/verification/**`, `src/pwa/**`, `src/build-info.ts`, การ bundle worker และ job runner ร่วม (FX-4) | โค้ดแอปนอกรายการ; assertion ของ domain อื่น | CO-1, CO-5, เครื่องมือของ R0.3r/R0.4, EQ-1, FX-4, FX-6, FX-7, EQ-8, R7.3, R7.4 |
| Q | การตรวจยืนยัน | `tests/**` ที่เป็น oracle, fixture ร่วม และ journey ข้ามระบบ | `src/**` ทั้งหมด | R0.4 (oracle kit), ภาพหน้าจอของ CO-3, ด่าน R2.5, R7.1 |
| A | cockpit | `src/cockpit/**` (ใหม่) และ asset ของ cockpit | systems (P), คะแนน (L), routes/กล้อง (I/C) | R6.1–R6.3 |
| W | เอกสาร | `docs/**` นอกไฟล์ของ I และนอก Markdown ที่ถูกอ่าน (ตาราง §18.8) | PROGRESS (ยกเว้นแถวตาม §18.3.4), PLAN, DECISIONS, รายงานของแพ็กเกจอื่น | ร่าง CO-8, R7.5 (ร่วมกับ I) |
| H | เจ้าของและคนที่ระบุชื่อ | ไม่เขียนไฟล์โดยตรง | — | ชุด DEC, G2, HU-1…HU-6, การตรวจ |

**ขนาดไฟล์ hotspot** (นับบรรทัดด้วย `git show <sha>:<path> | wc -l` และ `gh api` แบบอ่านอย่างเดียว; คอลัมน์ `fbefa18` ตรงกับตัวเลขใน PC:(c)7)

| ไฟล์ | เจ้าของ | `fbefa18` (ก่อน R2) | `da67341` (R2) | `5f9aa2e` (ฐาน §18.0) | แพ็กเกจที่จะแตะ (ตัวอย่าง) |
|---|---|---|---|---|---|
| `src/main.ts` | I | 2,274 | 2,408 | 2,635 | CO-4, EQ-2/3/4/5/6/7/12, EQ-15, FX-5, FX-8, R2.1r, R2.5, R2.6, R3.0, R3.1r (030, M-PLAN-028), R3.5r (067 hook), R5.1, R6 |
| `src/ui/panel.ts` | U (I เฉพาะหน้าต่าง EQ-15) | 2,440 | 2,426 | 2,517 | CO-4 ขั้น 8, FX-5, R2.1r, R2.5, EQ-15 (หลัง “R2 complete”), M-PLAN-030 (focus hook) |
| `src/style.css` | I | 1,306 | 1,393 | 1,418 | CO-4 ขั้น 6–7, R2.1r, R2.5 |
| `src/ui/hud.ts` | U | 990 | 994 | 994 | CO-4 ขั้น 9, R2.1r |
| `src/ui/telemetry.ts` | U | 825 | 932 | 932 | CO-4 ขั้น 4b/5/10, EQ-12, R2.3s2 |
| `src/ui/timeline.ts` | V | 573 | 750 | 750 | R2.6, EQ-3 |
| `src/ui/modes.css` | I | 370 | 370 | 370 | R2.1r, R2.5 |
| `index.html` | I | 208 | 220 | 221 | CO-4 ขั้น 2, R2.5, R7.4 (CSP) |
| `src/i18n/*` (10 ไฟล์) | I + บล็อกของเลน | 15,435 | 15,483 (en 4,902 / th 4,879 / ru 4,878) | 15,780 (en 5,001 / th 4,978 / ru 4,977) | ทุก feature; EQ-6, ED-I18N-1 |
| `src/physics/simulation.ts`, `rigid/runtime.ts` | P | 1,601 / 659 | 1,601 / 659 | 1,601 / 659 | EQ-10, R4.2, R4.3 |
| `src/data/vehicles.ts`, `parts.ts` | P-D | 1,138 / 1,052 | 1,138 / 1,052 | 1,138 / 1,052 | R4.1, R4.2 |

`main.ts` โตขึ้น 227 บรรทัด (2,408 → 2,635) และ `panel.ts` 91 บรรทัดภายในวันเดียวหลัง R2 (#75–#83) ขณะที่ไฟล์ฟิสิกส์และข้อมูลไม่เปลี่ยนเลย ข้อนี้คือเหตุผลของ I-train และหน้าต่าง EQ-15 (D-62)

### 18.3 Protocol ของไฟล์ hotspot

#### 18.3.1 I-train สำหรับ `main.ts`, `index.html`, `style.css`, `modes.css` และการประกอบ i18n

1. **ลำดับในเลน:** เลนส่ง PR ของโมดูลตัวเองนอกไฟล์ hotspot ก่อน (พร้อม test ของตัวเอง) จากนั้น hook ที่ต่อโมดูลเข้าไฟล์ hotspot ไปกับ train ถัดไปของ I โมดูลที่ merge แล้วแต่ยังไม่ได้ต่อ รอได้ไม่เกินหนึ่ง train (ราว 1 วันทำการ) และห้ามใช้ feature flag เป็นที่พัก (§18.6)
2. **รูปแบบ hook request** (วางในคำอธิบาย PR ของเลน หรือส่งเป็น comment ถึง I):

```yaml
hook_request: HR-EQ-4-1            # <แพ็กเกจ>-<ลำดับ>
lane: O
package: EQ-4
step: 1
change_kind: identical-output      # ต้องตรงกับชนิดของ train ที่จะขึ้น
target: src/main.ts#ensureOrbitView # ไฟล์ + ฟังก์ชันหรือ selector
patch_intent: "สร้าง OrbitView เมื่อเปิดหน้า Orbit ครั้งแรก แทนการสร้างตอน init"
size_estimate: "~20 บรรทัด"
after_merged: ["PR โมดูลของ EQ-4 ขั้น 1"]
test: [EO-UI-1 Orbit ที่หยุด, EO-UI-2 draw ต่อเฟรม, จำนวน context (KPI-07), journey ที่ระบุชื่อ]
i18n_keys: none                     # หรือรายการ key ครบสามภาษา
needed_by: K2
```

3. **การจัด train:** หนึ่ง train คือหนึ่ง PR ของ I ที่มีชนิดเดียว hook ต่างชนิดขึ้นคนละ train ราว 2 train ต่อวันทำการ hook ที่รออยู่มีได้ไม่เกิน 3 รายการ เลนที่เข้าคิวไม่ได้ต้องรอ (นับใน KPI-34) ถ้า hook ใดทำให้ train ล้ม ให้ถอด hook นั้นคืนเลน แล้ว train ที่เหลือเดินต่อ
4. **ช่อง I มีช่องเดียว:** train กับ PR ของแพ็กเกจที่ I เป็นเจ้าของ (CO-4, EQ-15, R5.1 ฯลฯ) ใช้ช่องเดียวกัน จึงสลับกัน (PR บันทึกที่เป็น Markdown อย่างเดียวใช้ช่อง records แยก §18.6) ลำดับความสำคัญของช่อง: บั๊ก P0/P1 ที่ทำข้อมูลหายหรือแสดงผลเท็จ (D-63) → critical path → hook ที่รอนานที่สุด → อื่น ๆ (สอดคล้อง S05 §05.6)
5. **หน้าต่างพิเศษ:** ระหว่างหน้าต่าง EQ-6 ไม่มี hook ด้าน i18n และระหว่างหน้าต่าง EQ-15 train หยุดทั้งหมด (S05 §05.7)
6. I นับ PR ที่ต้อง rebase เพราะ conflict ที่ไฟล์ hotspot และ PR ที่ทำเพื่อแก้งานก่อนหน้า แล้วรายงานเป็น KPI-34 ทุก GK

#### 18.3.2 i18n

- **ก่อน EQ-6** (จนถึงหน้าต่าง K2 วันที่ 1–2): key ใหม่ลงในบล็อกของเลนแบบต่อท้ายอย่างเดียว I เป็นผู้วาง anchor ของบล็อกไว้ใน `en.ts`, `th.ts` และ `ru.ts` เมื่อเริ่มคลื่น (`// lane:<เลน> package:<แพ็กเกจ>` … `// end lane:<เลน>`) เลนเขียนเฉพาะในบล็อกของตัวเอง จึงไม่มีบรรทัดติดกันที่ชนกับเลนอื่น ถ้ามีมากกว่าราว 20 key ให้ใช้โมดูลรายฟีเจอร์ตามแบบที่มีอยู่ (`src/i18n/workspace.ts`: `workspaceEn/Ru/Th` แบบ `typeof` เดียวกัน) แล้ว I เพิ่มบรรทัด spread หนึ่งบรรทัดผ่าน train
- **ทุก PR ที่เพิ่ม key ต้องมีครบสามภาษาใน PR เดียวกัน** (`tests/i18n.test.ts` เขียว) ศัพท์ไทยใช้ ER-6 ในทะเบียนของ S08 (เดิมเรียก "D5" ซึ่งชนกับ DEC:D-5: guidance = การนำวิถี, navigation = การนำร่อง) การแก้ถ้อยคำของ key เดิมไม่ใช่ identical-output และแก้ผ่าน L-C/ED-I18N เท่านั้น การลบหรือเปลี่ยนชื่อ key ทำโดย I
- **หลัง EQ-6:** key อยู่ในโมดูลรายฟีเจอร์ที่เลนเจ้าของ feature เป็นเจ้าของ และ I ประกอบครั้งเดียว โครงสร้างของโมดูลรายภาษาเป็นของ EQ-6 (S09) ขั้นที่ 2 คือ typed keys (M-LEARNING-036)

#### 18.3.3 `budgets.json`

- T เขียนไฟล์นี้คนเดียว ถ้า PR ของ EQ ทำให้ chunk เล็กลง T เปิด PR ลดเพดาน (ชนิด quality-improving) ตามมา
- การขึ้นเพดานทำได้ทางเดียวคือ D-38 โดยต้องมีสี่อย่างใน PR เดียวกันตาม S04 §04.3 ข้อ 2: ขนาดที่วัด, ฟีเจอร์และแพ็กเกจที่ทำให้โต, แพ็กเกจ identical-output ที่ชดเชย (named offset) และการอนุมัติของเจ้าของ hunk ใน `budgets.json` ของ PR feature ให้ T เป็นผู้เขียน (commit โดยเซสชัน T หรือ patch ที่ T ส่งให้) ขาดข้อใดนับเข้า KPI-30 การแยกเพดานโค้ดกับเพดาน data snapshot เป็นงานของ CO-1

#### 18.3.4 PROGRESS.md และ CHANGELOG.md

- หลัง CO-8 PROGRESS มีหนึ่งแถวต่อแพ็กเกจ แถวสร้างไว้ล่วงหน้าโดย I **PR ของแพ็กเกจแก้เฉพาะแถวของตัวเองใน PR ที่จะ merge** (KPI-31) ส่วนอื่นของไฟล์เป็นของ I เพียงผู้เดียว ข้อยกเว้นนี้จำกัดอยู่ที่แถวของตัวเอง จึงไม่ชนกับเลนอื่น และ I ตรวจ diff ของแถวก่อน merge
- **ขั้นที่ 1 (ใน PR ที่ merge):** แถวเขียนสถานะที่จะเป็นจริงทันทีที่ merge คือ "merged, รอ publish" พร้อมเลข PR และ CI run ถ้า PR ไม่ถูก merge ข้อความนี้ก็ไม่ลง main
- **ขั้นที่ 2 (ภายใน 1 วันทำการหลัง Pages เสร็จ):** I เปิด PR Markdown อย่างเดียวในช่อง records (§18.6) รวมทุก PR ที่เผยแพร่ในวันนั้น (ไม่ trigger CI หรือ redeploy ตาม path filter ของ `ci.yml`/`deploy.yml`) ระบุ squash SHA, Pages run, deployment record และสถานะ "published" ตามกติกาของ VERIFICATION ที่ให้ publish แอปก่อน merge follow-up ที่เป็นรายงานอย่างเดียว (แบบเดียวกับ #79) ถ้า Pages ล้ม (เช่น #80) แถวคงเป็น "merged, รอ publish" พร้อมเลข run ที่ล้ม
- ทุก PR เพิ่มบรรทัด CHANGELOG หนึ่งบรรทัดใน PR ของตัวเอง ถ้า conflict ให้ rebase แล้วนับใน KPI-34

#### 18.3.5 ไฟล์ที่มีผู้เขียนคนเดียวอื่น ๆ

| ไฟล์หรือส่วน | ผู้เขียน | กติกา |
|---|---|---|
| `src/data/**` | P-D เท่านั้น | เลนอื่นขอผ่าน P-D; PR ข้อมูลแยกจาก PR runtime ของ P; การ re-record golden ที่ตามมาทำผ่าน P (§18.9) |
| runtime ฟิสิกส์ (`src/physics/**`, `src/session/**`, recorder) | P ทีละ PR | ทีละ PR ไม่มีข้อยกเว้น; หน้าต่าง re-baseline (S05 §05.7) ห้ามมี PR EQ ฟิสิกส์เปิดพร้อมกัน; ถ้าแตะ rigid runtime หรือ `targetAttitude` ต้องรัน `rigid-flex-golden` |
| browser harness, shard, verification scripts | T | journey ใหม่ของ feature เขียนโดยเลนเจ้าของ ส่วน inventory, smoke flag และการจัด shard ทำโดย T |
| fixture ร่วมและ oracle kit | Q (รูปแบบ) / T (การต่อเข้า runner) | ห้าม re-record ใน PR ของ EQ (S07 §07.5) |
| schema และ migration (`types.ts`, envelope, telemetry-layout schema) | S | ต้องเพิ่ม version และมี migration เสมอ; schema ลงก่อน integration (PLAN:§6 กติกา 4) ข้อยกเว้นที่เสนอใน S12 §12.3: field ไม่บังคับที่ไม่เปลี่ยนความหมายของ field เดิม (เช่น `DesignRef` ของ #80) ใช้ migration แบบ identity ที่มีเทสต์และกติกา reader-before-writer (S10 §10.1 ข้อ 9) แทนการขึ้น version ข้อยกเว้นนี้มีผลเมื่อเจ้าของยืนยันพร้อม D-22 เท่านั้น |
| Markdown ที่โค้ดหรือ test อ่าน (รายการและผู้เขียนอยู่ในตารางห้ามย้ายของ §18.8) | ตามตาราง §18.8 | ห้ามย้ายหรือจัดรูปแบบใหม่; แก้ได้เฉพาะ prose ในรูปแบบเดิมพร้อมรัน test ที่อ่านไฟล์; ไฟล์เหล่านี้เป็นส่วนหนึ่งของ build และ CI ไม่ยกเว้นให้ (process lesson 17) |

### 18.4 ตาราง fold (จาก `final/folds.tsv`)

งานที่ fold แล้วทำโดยเลนเดียวกันใน PR ที่ติดกัน และ**ไม่รวมเป็น PR เดียว** แถวที่เป็น "ข้ามเลน" เป็นข้อบังคับลำดับผ่าน dependency ไม่ใช่การทำร่วมกัน I ตรวจตาราง fold ใหม่ทุก GK

| รายการ | แพ็กเกจเจ้าของ | ทำติดกับ | ลำดับ | เหตุผล | แบบ |
|---|---|---|---|---|---|
| M-PLATFORM-037 | CO-4 | M-LAUNCH-025 (CO-4) | PR 4a (identical-output) ติดก่อน PR 4b ที่เป็น bug-fix ของ 025 ทันที และทั้งสองอยู่ก่อน 006 | `applyLanguage` ที่ซ้ำตอนเริ่มกับการกระจาย notation ใช้โค้ดร่วมกัน ส่วน identical-output ไปก่อนแล้วส่วนบั๊กเป็น PR ถัดไป | เลนเดียว (I) |
| M-LAUNCH-022 | CO-4 | M-LAUNCH-024 (EQ-3) | 022 คือ CO-4 ขั้น 10 แล้ว 024 (งานต่อเฟรมจาก R2) เป็น PR EQ ถัดไปใน train เดียวกัน | ลบต้นทุนต่อเฟรมของ R2 ด้วยกันโดยใช้ oracle ร่วมกัน | เลนเดียว (I) |
| M-LAUNCH-038 | EQ-12 | M-LAUNCH-014 (R2.3s2) | PR1 ของชุด R2.3s2 (registry `CHART_DEFS`, กราฟเหมือนเดิม) | registry นี้คือ card registry ที่ R2.3 ขั้น 2 ต้องใช้ | เลนเดียว (U) |
| M-LAUNCH-023 | EQ-12 | M-LAUNCH-014 (R2.3s2) | PR หลัง feature ของ R2.3s2 เมื่อ API show/hide นิ่งแล้ว | memo ต้องตรงกับ API ของ layout ฉบับสุดท้าย | เลนเดียว (U) |
| M-LAUNCH-041, 042, 049 | EQ-2 | M-LAUNCH-046 (R3.0) | ก่อน R3.0 และก่อนภาพตัวอย่าง 3 มิติใด ๆ ใน R3.2r/R3.3r | ภาพตัวอย่างใช้ cache เดียวกัน ไม่เพิ่มสำเนา | เลนเดียว (C) |
| M-BUILD-014, 026, 027, 028, M-PLAN-029 | EQ-13 | R3.4r | PR แรกของเลน B ก่อน PR feature ของ R3.4r/R3.2r/R3.3r | R3.4r เขียนไฟล์เดียวกันใหม่ | เลนเดียว (B) |
| M-LEARNING-002 | FX-2 | M-LEARNING-001 (FX-2) | หลัง 001 ในเลน L-UI | ตัวสร้างฟอร์มคำตอบร่วม ทำหลังแก้ caret | เลนเดียว (L-UI) |
| M-LEARNING-006 | EQ-14 | M-LAUNCH-034 (FX-5) | ลดโค้ดซ้ำของ export helper (oracle ระดับไบต์) ก่อน CSV formula guard | guard เปลี่ยนไบต์ ทำ dedupe ก่อนจึงเหลือการเปลี่ยนเดียว | ข้ามเลน |
| M-PLATFORM-012, 013, 014, 015 | R1.6 | R1.6 ขั้น c/d | ภายใน R1.6 ก่อนเสียงของ R6 | ลดฐานข้อมูล soundtrack ที่ซ้ำก่อนเสียงใน cockpit | เลนเดียว (L) |
| M-PHYSICS-015 | EQ-10 | M-PHYSICS-020 (R4.5) | ก่อน re-baseline ของ R4.5 อย่างเคร่งครัด | รวมค่าคงที่ที่ค่าเท่ากันพร้อมพิสูจน์ bit-identical ก่อน | เลนเดียว (P) |
| M-LAUNCH-045 | EQ-7 | M-PHYSICS-026 (R4.5) | ส่วนท้าย `propagateKepler` ร่วม ก่อน Kepler แบบ universal variable | ส่วนท้ายเดียวก่อน แล้วจึงเปลี่ยนความสมจริง | ข้ามเลน |
| M-PHYSICS-010 | EQ-9 | M-PHYSICS-020 (R4.5), M-ORBIT-022/023 (R4.6) | ก่อน | propagator no-op ก่อนงาน realism บนไฟล์เดียวกัน | เลนเดียว (P) |
| M-PHYSICS-012, 013, 014 | EQ-10 | R4.2, R4.3 | ก่อน PR ใดของ R4.2/R4.3 ที่แตะ `rigid/runtime.ts`, `simulation.ts`, `sim/forces.ts` | E ก่อน F | เลนเดียว (P) |
| M-PHYSICS-011 | EQ-11 | R5.2, R8 | ก่อน | memo ดวงจันทร์ก่อนงาน ISS และดวงจันทร์ | เลนเดียว (P) |
| M-LAUNCH-047, 048 | EQ-14 | R5.4 | PR แรกของ R5.4 | R5.4 เขียน render helper เหล่านี้ใหม่ | เลนเดียว (P-R) |
| M-PLATFORM-054 | R7.3 | EQ-15 | fitness test ลงก่อนหน้าต่าง | ตรึงขนาดโมดูลและรายการ guard ที่หน้าต่างต้องรักษา | ข้ามเลน |
| M-PLATFORM-055 | EQ-15 | R5.1, R6 (และ PR ของ R3+ ที่แตะ `main.ts` เกิน hook) | สาม seam ก่อน R5.1 และ R6 (D-62); sub-panel ของ `panel.ts`/SectionModule หลัง “R2 complete” | R5.1 และ R6 ต่อบน seam เหล่านี้ (R3.5 ลงแล้วใน #77/#80 โดยไม่ผ่าน EQ-15; `main.ts` 2,635 บรรทัดบน `5f9aa2e`; S02 §02.3, S05 §05.7) | เลนเดียว (I) |
| M-LEARNING-036 | EQ-6 | M-PLATFORM-031 (EQ-6) | ขั้น 2 หลังแยกรายภาษา | typed keys ทำหลังแยก | เลนเดียว (I) |
| M-BUILD-030 | EQ-8 | M-PLATFORM-035 (FX-4) | หลัง job runner | การใช้ worker ซ้ำต้องใช้ job runner | เลนเดียว (T) |
| M-PHYSICS-052 | R4.2 | M-LAUNCH-004 (CO-4) | ใช้ `ui/engine-levels.ts` จาก R2/CO-4 | helper ระดับเครื่องยนต์มีตัวเดียว | ข้ามเลน |
| M-PLAN-013 | R0.2r | R3.1r, R5.1, R5.2 | ADR ของ FlightLifecycle/CameraPolicy/Handoff/DesignPreview/ResultAction ใน K1–K2 บันทึกสัญญาที่ส่งแล้ว (hand-off v1 + DesignRef ไม่บังคับ, typed cause → field) ก่อน R3.1r และ R5.1; ADR สถานะทางฟิสิกส์ของ CraftState ย้ายออกจาก R0.2r ไปเป็น PR1 (docs) ของ R5.2 นับใน R5.2 และอยู่ก่อน PR realism ของ R5.2 | เขียน ADR เมื่อผู้ใช้ ADR คนถัดไปจะเริ่ม ไม่เขียนทั้งหมดล่วงหน้า | ข้ามเลน |
| M-PLATFORM-038 | EQ-14 | แพ็กเกจใดก็ได้ | ทำเฉพาะในไฟล์ที่กำลังแก้อยู่แล้ว | ไม่มี PR ที่แก้เพื่อเปลี่ยนโค้ดอย่างเดียว | เลนเดียว |
| M-PLAN-028 | R3.1r | M-PLAN-031 (R1.6 PR 2b, S10 §10.3.1) | หลัง R1.6 ขั้น b และหลัง M-PLAN-031 (PR 2b) | แตะเส้นทางคืน mission เดียวกัน (`mission-share.ts:71` → `panel.ts:552` → `main.ts:560` → `main.ts:1759`); oracle EO-STO-1 ชุดเดียว | ข้ามเลน (I/L/B) |

fold M-ORBIT-018 ↔ R3.3r ถูกตัดออกจาก `folds.tsv` หลังตรวจซ้ำ เพราะแผนภาพ eclipse/power ส่งแล้วใน #80 และไม่ import core ของคราส (S12 §12.5) ถ้า PR ของ R3.3r ที่เหลือจะเรียก core นั้น ให้เพิ่ม fold กลับ

### 18.5 ชนิดการเปลี่ยนและขนาดของ PR

**หนึ่ง PR มีชนิดเดียว** แพ็กเกจหนึ่งเป็นลำดับของ PR ต่างชนิดได้ แต่ identical-output ไม่รวมกับชนิดอื่นเลย

| ชนิด | นิยาม (หนึ่งบรรทัด) | OR ที่รับใช้ | หลักฐานขั้นต่ำ |
|---|---|---|---|
| identical-output | ผลที่สังเกตได้เท่าเดิมทุกบิต ไบต์ หรือพิกเซลตามนิยามรายโดเมนใน S02 §02.3 ลดเฉพาะงานที่ซ้ำหรือโครงสร้าง | OR-1 (+OR-2) | oracle ที่บันทึกบนฐาน + `--compare` 3 รอบเมื่ออ้าง KPI (§18.9) |
| bug-fix | ทำให้พฤติกรรมตรงกับสัญญาหรือข้อกำหนดที่มีอยู่ | OR-2 | test ที่ล้มก่อนแก้ พร้อมผลการล้มบนฐาน |
| quality-improving | ยกคุณภาพภาพ UX การเข้าถึง test หรือเครื่องมือ โดยไม่เปลี่ยนฟิสิกส์หรือความหมายของข้อมูลที่เก็บ (PR ที่เพิ่มแค่ test หรือ journey นับเป็นชนิดนี้) | OR-2, OR-6 | ภาพก่อน/หลังพร้อมเจ้าของอนุมัติถ้าเปลี่ยนภาพ; หลักฐาน sabotage ถ้าเพิ่ม test |
| realism-changing | เปลี่ยนผลของแบบจำลองให้ใกล้ข้อมูลอ้างอิง | OR-3 | ขอบเขตกำหนดก่อนรัน, ตาราง before/after, held-out (§18.9; S14 §14.6) |
| feature | ความสามารถใหม่ตามแพ็กเกจในส่วนบ้านของมัน | OR-4, OR-6 | เกณฑ์รับของส่วนบ้าน, key ครบสามภาษา, journey, ไม่มี flag |
| docs | PR ที่แก้ Markdown ที่โค้ดไม่ได้อ่านอย่างเดียว (ถ้าแก้ Markdown ที่ถูกอ่านในตาราง §18.8 ให้นับเป็นซอร์ส) | OR-4, OR-6 | ลิงก์ถูก; ไม่มีข้อความที่ขัดกับโค้ดหรือ GitHub |
| human | หลักฐานจากคน (การศึกษาผู้ใช้, การตรวจ, session บนอุปกรณ์) บันทึกเป็นรายงานที่ลงวันที่ | OR-6 | แบบฟอร์มและผล; ห้ามกรอกแทนผู้อื่น |
| decision | บันทึกคำตอบของเจ้าของใน DECISIONS.md โดย I พร้อมวันที่และข้อความตรงตัว | OR-5 | ข้อความของเจ้าของ; ตรวจการปฏิบัติตาม (§18.14) |

**ขนาด:** ไม่เกินราว 400 บรรทัดซอร์สที่เปลี่ยนต่อ PR จนกว่า D-23/D-25 จะกำหนดค่า นับจาก `git diff --numstat` บน `src/**`, `index.html`, CSS, `scripts/**` และ `.github/**` ไม่นับ test, fixture, ไฟล์ที่สร้างอัตโนมัติ (pack JSON, snapshot), lockfile และเอกสาร key i18n นับครั้งเดียว (ภาษาเดียว) และงานต้องจบในหนึ่ง session-day ถ้าเกินต้องแตก PR หรือเขียนเหตุผลใน PR ซึ่งผู้ตรวจคนที่สองต้องเห็นด้วย (ตอบข้อค้นพบ PC:(c)5 ว่า R2.1, R3.5, R4.2, R5.3 และ R6 เคยเป็น epic ที่ไม่มีเพดานขนาด; ตอนนี้ทุก PR ใช้เพดานนี้)

**ย้ำการจัดชนิด:** PR ที่เพิ่มเฉพาะ test หรือ journey (รวม oracle เฉพาะ PR ที่ย้ายเข้า kit) เป็นชนิด quality-improving เอกสารที่แก้ภายใน PR (รายงาน, บรรทัด CHANGELOG, แถว PROGRESS, คู่มือ) เป็น commit หนึ่งของ PR นั้น ไม่ใช่ชนิด docs และไม่ทำให้ PR มีสองชนิด ชนิด docs ใช้กับ PR ที่แก้ Markdown อย่างเดียวเท่านั้น

**การแตกงาน XL:** แตกตามลำดับนี้ แต่ละข้อเป็น PR แยก: (1) สัญญา ADR หรือ type (S); (2) โมดูล pure + unit test นอกไฟล์ hotspot; (3) PR identical-output ที่เตรียมไฟล์ในเลนเดียวกัน (fold); (4) การต่อเข้าแอปผ่าน I-train; (5) journey, ภาพหน้าจอ และการอนุมัติ; (6) รายงาน หรือแตกเป็นชิ้นตามแกนธรรมชาติ เช่น ยานละ PR (R4.2), route ละ PR หรือ seam ละ PR (EQ-15) ไฟล์ที่สร้างอัตโนมัติอยู่ใน commit แยกของ PR เดียวกัน ตัวอย่างจากแผน: R2.3s2 เป็น 3 PR, R3.4r เป็น 11 PR, R4.2 เป็น 14 PR (`packages.tsv`, ค่าประมาณหยาบ)

### 18.6 WIP และกติกาของ branch

- **WIP ของ PR โค้ด** (PR ที่ trigger CI คือแก้ไฟล์ที่ไม่ใช่ `.md` หรือแก้ Markdown ที่ถูกอ่านใน §18.8 และนับรวม PR เอกสารเนื้อหาของเลน W เพราะเจ้าของต้องอ่าน): เลนละไม่เกิน 1 PR ที่เปิดอยู่ (นับ draft ด้วย); เลน P ทำทีละ PR อย่างเคร่งครัด; PR ที่ I เป็นเจ้าของเปิดได้ไม่เกิน 1 (ช่อง I); ทั้งโครงการเปิดพร้อมกันไม่เกิน 5 PR ตามความจุการตรวจของเจ้าของ (ไม่เปลี่ยน) เมื่อมีเลนพร้อมเกินจำนวนช่อง ใช้ลำดับความสำคัญใน S05 §05.6 และปรับเพดานทุก GK จาก KPI-33/34/35
- **ช่อง records (ของ I แยกจากช่องโค้ด):** PR ที่แก้ Markdown อย่างเดียวเพื่อบันทึก ได้แก่ PROGRESS (ขั้นที่ 2 ของ §18.3.4), DECISIONS.md (คำตอบของ H) และรายงาน HU เปิดพร้อมกันได้ไม่เกิน 2 PR และไม่นับในเพดาน 5 เพราะ path filter ของ `ci.yml` (`pull_request` และ `push`) และ `deploy.yml` ข้าม `**/*.md` ยกเว้น Markdown สามไฟล์ที่ถูกอ่าน (ตรวจบน `5f9aa2e`) PR เหล่านี้จึงไม่ใช้เวลาเครื่อง แต่ยังใช้เวลาตรวจของเจ้าของ (นับใน S05 §05.9) PR ที่แตะ Markdown ที่ถูกอ่านหรือไฟล์อื่นใดไม่ใช่ PR records และใช้ช่องโค้ด
- **ไม่นับในเพดานใด:** เซสชันของคน (เลน H: ชุดการตัดสินใจ, HU-1…HU-6, การตรวจ) และงานของผู้ประสานที่ไม่ใช่ PR (§18.1)
- **เซสชันขนาน (เดิมคือเซสชัน R3):** เซสชัน R3 จบงานแล้ว (เจ้าของประกาศ R3 ครบ 2026-10-04; ทางเลือก (1)/(2)/(3) ของ D-65 ยกเลิกแล้ว, S08) ถ้ามีเซสชันขนานใหม่ ใช้กติกาฐานของ D-65 เหมือนเลนอื่น: ใช้ช่องโค้ด 1 ช่อง (เปิดได้ครั้งละ 1 PR) และสละช่อง I ให้ CO-4 ขั้น 1 (M-LAUNCH-027) คือไม่เปิด PR ที่ใช้ช่อง I หรือแตะไฟล์ hotspot ของ I จนกว่า CO-4 ขั้น 1 จะ merge หลังจากนั้น hook ของเซสชันนั้นเข้า I-train ตาม §18.3.1
- **ลำดับในเลน (D-63):** งาน identical-output ไปก่อนในเลน ยกเว้นบั๊ก P0/P1 ที่ทำข้อมูลหายหรือแสดงผลเท็จในไฟล์เดียวกัน ซึ่งไปก่อน งานที่เพิ่มการเขียนข้อมูลรอ R1.6 (S10)
- **CI แดง:** ห้ามเปิด PR ใหม่ในเลนที่ CI ของ PR ล่าสุด หรือ main บนไฟล์ของเลนนั้นยังแดง ให้แก้หรือ revert ก่อน
- **rebase:** อย่างน้อยทุก 2 วันทำการ และก่อนขอตรวจหรือก่อน merge ทุกครั้ง แล้วอัปเดต `base_sha_verified_on`
- **branch ค้าง:** branch ที่ไม่ขยับ 14 วัน ต้องปิดโดยย้าย notes ไปไว้ในรายงานหรือ handoff หรือ rebase แล้วเดินต่อ (M-PLATFORM-077)
- **หนึ่งขั้นหนึ่ง branch หนึ่ง PR:** ตั้งชื่อ `<agent>/<lane>-<package>-s<step>` ถ้าสภาพแวดล้อมของเซสชันให้ push ได้ branch เดียว (ประวัติ #74–#83) ใช้ branch เดิมได้เฉพาะเมื่อ PR ก่อนหน้า merge แล้ว และหนึ่ง PR ยังเท่ากับหนึ่งขั้น
- **feature flag:** ห้ามส่ง flag ที่ซ่อนเส้นทางโค้ดไปกับรุ่นจริงโดยไม่มีการอนุมัติของเจ้าของ ตัวเลือกที่ผู้ใช้เห็น (เช่น low-graphics แบบ opt-in ตาม D-43) เป็นการตัดสินใจด้าน product ไม่ใช่ flag

### 18.7 กติกางานร่วม

**กติกาจาก PLAN:§6 (คงไว้)**
1. ทุก task ระบุ owner, allowed paths, dependencies, base SHA และ expected output ก่อนเริ่ม (ใน envelope §18.11)
2. งานที่แชร์ `main.ts`, global CSS, schema หรือ runtime ฟิสิกส์ต้องเข้า I-train หรือคิว ห้ามคิดว่าต่าง feature แล้วจะไม่ชนไฟล์ (process lesson 1)
3. i18n ใช้โมดูลของ feature แล้วเจ้าของ composition รวม EN/TH/RU ครั้งเดียว browser runner และ shared manifest ให้ T รวม
4. สัญญาฟิสิกส์ร่วมลงก่อน rendering/UI ที่พึ่งมัน; migration ของ schema/archive ลงก่อน integration ของโปรไฟล์
5. ห้าม agent ใด re-record golden, ผ่อน tolerance, ขยายเพดาน หรือทิ้ง test ของ domain อื่นเอง ต้องมีเหตุผล ผลกระทบ และหลักฐานที่ผ่านการตรวจ (KPI-21, KPI-30)
6. test ของ feature เขียนในไฟล์ของตัวเองได้ ส่วน config, discovery และรูปแบบ fixture ร่วมผ่าน T/S/Q
7. ตรึง integration candidate ก่อน heavy run ยาว การเปลี่ยนที่กระทบหลักฐานทำให้รายงานเดิมเป็นประวัติ ไม่ใช่หลักฐานปัจจุบันของ source นั้น

**กติกาที่เพิ่ม (process lessons ที่ PLAN ยังไม่มี)**

| กติกา | process lesson |
|---|---|
| scratch probe อยู่นอกขอบเขต `tsconfig` (เช่น scratchpad ของเซสชัน) ห้ามลบ scratch ของ agent อื่น | 2 |
| รายการ "ส่งต่อ/นอกขอบเขต" ทุกรายการมีเจ้าของ และ I ตรวจซ้ำที่ GK ถัดไป (ช่อง `handoff` ใน envelope) | 3 |
| คำถามขอบเขตต้องถามเป็นทางเลือกพร้อมข้อเสนอ ไม่ขยายขอบเขตเอง (§18.14) | 4 |
| การตัดสินใจทุกข้อมีจุดตรวจว่าปฏิบัติตามแล้ว (§18.14; S08 §08.6) | 5 |
| devDependency เพิ่มได้ทีละตัวพร้อมเหตุผลเป็นลายลักษณ์อักษร (D-17); three.js เป็น runtime dependency ตัวเดียว (M-PLATFORM-079) | 6 |
| ผู้ตรวจอิสระรันตัวเลขหลักซ้ำเอง ห้ามให้ gate อ้างตัวเอง และห้ามเสนอค่าที่ fit ว่าเป็นค่ามีที่มา (§18.13) | 10 |
| รายงานการตรวจระบุจำนวนข้อที่ยืนยันได้จริง ("N จาก M") | 11 |
| ห้ามกรอกการอนุมัติของคนแทนคนอื่น: pack คง `reviewed:false`, checklist การตรวจที่ยังไม่ได้ตรวจเว้นว่าง, G2 เซ็นโดย H เท่านั้น | 12 |
| ห้ามเก็บ evidence packet (log, zip, docx, pdf) ใน `docs/` ให้ใช้ Release asset หรือ CI artifact; ภาพไม่เกิน 200 kB; ลิงก์ที่ชี้ไฟล์ที่ย้ายต้องแก้ใน PR เดียวกัน (`tests/repo-hygiene.test.ts`) | 15 |
| ทุก PR มีบรรทัด "docs ที่แก้ หรือ N/A" | 16 |
| Markdown ที่โค้ดอ่านเป็นส่วนหนึ่งของ build (§18.3.5) | 17 |
| journey ต้องพิสูจน์ด้วย sabotage run: ทุก assertion ใหม่ต้องล้มบน branch ทิ้ง โดยไม่ commit ตัว sabotage และ pattern ต้อง anchor | 20 |
| runner ที่ใช้ WebGL แบบ software: DPR 0.5 (`RENDER_SCALE`), flag ของ ANGLE/SwiftShader, ได้ 1–13 fps จึงห้ามอ้างประสิทธิภาพจาก fps; pane ที่ไม่ได้อยู่ด้านหน้าจะถูกลด `requestAnimationFrame` ห้ามใช้จับเวลา; ให้เทียบตัวเลขที่ไม่ขึ้นกับ hardware | 19 |
| สัญญาสถาปัตยกรรม (S02 §02.9) บังคับด้วย `tests/architecture.test.ts` ห้ามผ่อน | 25 |

**การครอบคลุม process lessons 1–26:** 1 → §18.3, §18.7; 2, 6, 10–12, 15, 16, 19, 20, 25 → ตารางข้างบน; 3 → §18.6, §18.11; 4, 5, 23 → §18.14; 7, 8, 13, 14, 18, 21 → §18.8; 9, 24 → §18.9; 17 → §18.3.5; 22 → §18.12; 26 → ระบบรหัสใน S00 และช่อง `sources` ของ envelope

### 18.8 หลักฐาน (สรุปจาก VERIFICATION.md บน main)

- **ตรึง source ก่อนเก็บ plan หรือรัน:** หนึ่งชุดหลักฐานต่อหนึ่ง source ห้ามรวม artifact ข้าม commit, attempt, runtime หรือ build ใช้ไฟล์ `plan.json`, `collection.json`, `*.report.json` และ `union.json` ต้องไม่มี case หาย ซ้ำ หรือข้าม ใช้ Node 22.23.3 กับ `npm ci` และบันทึก SHA, Node/Chromium และ hash ของ snapshot ทุกครั้ง (process lesson 13; การย้าย Node เปลี่ยน fingerprint ได้ จึงต้องรอ D-3/D-4)
- **บั๊กทุกตัวมี test ที่ล้มก่อนแก้:** แนบผลการล้มบนฐาน run ก่อนแก้ห้ามนับเป็นผ่าน และ run ซ้ำห้ามนับรวมเป็นจำนวน "unique" (process lesson 8)
- **ด่านถูกไปก่อน:** hygiene preflight, typecheck, build, budget และ journey export ที่กระทบ รันก่อน physics sweep ที่แพง PR ที่แตะฟิสิกส์ร่วมต้องรัน heavy ที่กระทบและแถว fleet ก่อน merge (process lesson 21)
- **หลักฐานสามชนิดแยกกัน:** execution (test, CI, journey), scientific (เทียบข้อมูลอ้างอิง, held-out) และ human (การศึกษาผู้ใช้, การตรวจ, session บนอุปกรณ์, การเซ็นภาพหน้าจอ) การจำลอง viewport ไม่ใช่โทรศัพท์จริง และ run อัตโนมัติไม่ใช่การสังเกตผู้เรียน (process lesson 7) scientific miss รายงานแยกจาก execution pass
- **merged ≠ published ≠ live:** published คือ Pages สำเร็จบน exact source พร้อม deployment record ส่วน live คือ About/build stamp แสดง SHA นั้น scheduled run อาจเริ่มช้าได้ราว 6.5 ชม. (process lesson 14)
- **browser determinism:** รอ readiness ที่ระบุชัด (helper `reloadDocument`), ห้ามขยาย timeout หรือ retry แบบไม่รู้สาเหตุ, บรรทัดแรกของ error ต้องบอก case และ action ที่ล้ม, ใช้ browser ใหม่ทุก journey (process lesson 18)
- **การอ้างความเร็ว:** เวลาของ workflow ใช้ 3–5 run ที่เทียบกันได้ (median/p90) ส่วนประสิทธิภาพของแอปใช้ `--compare` 3 รอบที่ช่วงไม่ทับกัน และอย่างน้อย 5 รอบสำหรับคำกล่าวต่อสาธารณะ (S04 §04.1) ถ้ายังไม่วัดให้เขียนว่า "ต้องวัด"
- **ที่เพิ่มใน v2.0** (R7.3 นำเข้า VERIFICATION.md; ตอบ PC:(c)8 เรื่องการรันซ้ำและ heavy ที่ไม่มีการเลือกตามผลกระทบ):
  - EQ: บันทึก oracle บนฐานตามแคตตาล็อก S07 §07.5 แล้วตามด้วย `--compare` (§18.9)
  - ฟิสิกส์: PR ใช้เฉพาะแถว fleet ของยานที่แตะ (vehicle-scoped) ส่วน fleet เต็มชุดรันครั้งเดียวต่อ candidate ของคลื่น (GK, KPI-22)
  - เลือก suite ตามผลกระทบด้วย map ของ R0.3r ถ้าไม่รู้ผลกระทบให้รันเต็มชุด
  - ใช้ผลซ้ำด้วย content hash ตาม D-64 เฉพาะ heavy/fleet เมื่อ hash ของ `src/physics`, `src/data`, workers, `tests/heavy`, `tests/sixdof-fleet`, lockfile และ Node ตรงกัน ห้ามใช้กับ journey และห้ามใช้กับ unit gate บน Pages (M-PLAN-012 ยังถูกปฏิเสธ) ใช้ได้หลัง D-64 ได้รับการยอมรับเท่านั้น

**ตารางห้ามย้าย: Markdown ที่โค้ดหรือ test อ่าน** (บ้านเดียวของรายการนี้; §18.3.5 ใช้ตารางนี้) ไฟล์เหล่านี้เป็นส่วนหนึ่งของ build จึงห้ามย้าย เปลี่ยนชื่อ หรือจัดรูปแบบใหม่ แก้ได้เฉพาะ prose ในรูปแบบเดิมพร้อมรัน test ที่อ่านไฟล์ (S02 §02.13 ข้อ 28) รายการปัจจุบันบน `5f9aa2e` ต้องตรงกันสี่ที่: path filter ของ `ci.yml` (`pull_request`, `push`), `deploy.yml`, `sourceIdentity()` ใน `scripts/verification/lib.mjs` และ `consumed` ใน `tests/verification/workflow-paths.test.mjs` ซึ่งล้มถ้ามี Markdown ที่ถูก import แต่ไม่อยู่ในรายการ

| ไฟล์ | ผู้อ่าน | ผู้เขียน | มีผลตั้งแต่ |
|---|---|---|---|
| `docs/ROADMAP-PART2-3.md` | `tests/section-plan.test.ts`, `tests/section-nav-model.test.ts` (ผูกกับรายการ "ถัดไป" ในแอปของ `src/ui/section-plan.ts`) | I/W ผ่าน R7.5 | ตอนนี้ |
| `docs/SIXDOF-VEHICLE-DATA.md` | แอป (`src/ui/dialogs.ts` import แบบ `?url`) | P-D | ตอนนี้ |
| `docs/history/phase4-2026-10-01/T03-CURRICULA-RESEARCH.md` | `tests/lesson-review.test.ts` | อ่านอย่างเดียว | ตอนนี้ |
| `docs/IMPLEMENTATION-STATUS.md` | test ป้ายเทียบ Known limitations ของ M-LAUNCH-072 (R4.4, S13) | I/W ผ่าน R7.5 (P สำหรับข้อจำกัดฟิสิกส์) | เมื่อ PR ของ M-LAUNCH-072 merge โดย PR นั้นเพิ่มไฟล์นี้ใน path filter ของ `ci.yml` และ `deploy.yml` และในรายการของ `lib.mjs` กับ `workflow-paths.test.mjs` ใน PR เดียวกัน ก่อนหน้านั้นห้ามเปลี่ยน path อยู่แล้วเพราะ comment ใน `src/` อ้างถึง แต่การแก้แบบ Markdown ล้วนยังข้าม CI |

### 18.9 ขั้นตอนพิสูจน์ผลเท่าเดิม และขั้นตอนของการเปลี่ยนพฤติกรรม/ความสมจริง

**ขั้นตอนพิสูจน์ identical-output (ทุก PR ชนิดนี้)**
1. **บันทึก oracle บนฐาน:** เลือก oracle จาก S07 §07.5 ให้ครอบทุกโดเมนที่แตะ แล้วระบุใน envelope oracle แบบ R ต้องเขียวบนฐาน ส่วนแบบ D รันฐานกับ head ใน harness เดียวกันและรอบเดียวกัน บันทึก `--compare` ของฐาน 3 รอบตาม scenario ที่เกี่ยวข้อง (เฉพาะเมื่ออ้าง KPI) oracle เฉพาะ PR ได้รหัส `EO-PR-…` ในช่อง `oracle` (§18.11) และต้องพิสูจน์ด้วย sabotage
2. **ทำการเปลี่ยน:** ลดเฉพาะงานที่ซ้ำ ห้ามมีการเปลี่ยนชนิดอื่นปน
3. **ยืนยันว่า oracle เท่าเดิม:** บิต ไบต์ พิกเซล DOM และข้อความต้องเท่ากัน ทั้งใน Node และ Chromium เมื่อเกี่ยว โดย tolerance ข้าม engine ของ T02 ไม่เปลี่ยน
4. **รัน `--compare` 3 รอบ:** KPI ที่อ้างต้องมีช่วงไม่ทับกัน ถ้าทับให้ไม่อ้างและเขียนว่า "ต้องวัด" ใช้ตัวเลขที่ไม่ขึ้นกับ hardware ก่อน
5. **เขียนรายงาน:** รหัส oracle พร้อม hash ของฐานและ head, ตาราง compare, KPI ที่ขยับ, test ที่รันจริง และหลักฐาน sabotage

**ถ้าล้ม:** ใช้กฎหยุดของ S07 รันฐานซ้ำสองครั้ง ถ้าฐานไม่เสถียร ให้แก้ oracle ใน PR quality-improving แยก ถ้าฐานเสถียรแต่ head ต่าง ให้**ทิ้งการเปลี่ยน** หรือ**จัดชนิดใหม่โดยเจ้าของอนุมัติ** (bug-fix, quality-improving หรือ realism-changing) แล้วใช้หลักฐานของชนิดนั้น ห้าม re-record และห้ามเพิ่ม tolerance (KPI-21)

**ขั้นตอนของการเปลี่ยนพฤติกรรมหรือความสมจริง**
1. ข้อมูลอ้างอิง ขอบเขต และชุด held-out เขียนไว้ใน envelope ก่อนรัน tolerance ที่ตั้งหลังเห็นผลต้องเปิดเผยในบทเรียนหรือเอกสาร (process lesson 9)
2. ใช้ฐานของ CO-6 และผล heavy/fleet "ก่อน" บน source ที่ตรึงไว้
3. ทำตาราง before/after ของทั้ง point-mass และ six-DOF และตรึงรายการที่ไม่ตรงด้วยชื่อ
4. ตรวจ held-out โดยไม่ fit ใหม่เพื่อให้ผ่าน และทำตามวิธี flight-profile (FLIGHT-PROFILE-METHOD; process lesson 24)
5. re-record ที่ระบุชื่อเท่านั้น เขียนเหตุผลไว้ข้าง golden และบันทึกใน VALIDATION §10 เจ้าของอนุมัติก่อน merge แล้วรันซ้ำบน SHA ที่ merge
6. รัน `rigid-flex-golden` ทุกครั้งที่แตะ rigid runtime หรือ `targetAttitude`
7. งานในขอบเขต R4.4 ต้องมีการรันซ้ำโดยผู้ตรวจอิสระ (D-55) ขั้นตอนตรวจครบชุดอยู่ใน S14 §14.6

### 18.10 รายการตรวจของ PR

ใช้ checklist ของ `.github/pull_request_template.md` (แบบที่ PR #75 ใช้) แล้วเพิ่มบรรทัดของ v2.0 การแก้ template เป็นงานของ T ภายใน CO-8

- [ ] Built-in flights unchanged หรือ re-record ที่ระบุชื่อพร้อมเหตุผลข้าง golden และ VALIDATION §10
- [ ] dictionary en/ru/th ครบ (`tests/i18n.test.ts` เขียว)
- [ ] ไม่มี runtime dependency ใหม่; devDependency มีเหตุผลเป็นลายลักษณ์อักษร (D-17)
- [ ] การเปลี่ยนฟิสิกส์หรือข้อมูลอ้างแหล่งที่เผยแพร่ และเพิ่มหรือปรับ test
- [ ] docs ที่แก้ หรือ N/A (README, IMPLEMENTATION-STATUS, USER-GUIDE)
- [ ] ลบ probe และ scratch แล้ว; ไม่มี evidence binary (ไม่มีไฟล์เกิน 1 MB นอก `public/`)
- [ ] รายงาน `docs/development/reports/<package>.md` (ใช้แทน session note ใต้ `docs/history/<date>/`)
- [ ] บรรทัด CHANGELOG หนึ่งบรรทัด
- [ ] test ที่รันจริงระบุชื่อพร้อมจำนวนที่ผ่าน
- [ ] การเปลี่ยน UI: journey ที่กระทบผ่าน
- [ ] **แพ็กเกจ ขั้น และชนิด (หนึ่งชนิด)** พร้อม `or_ids`; ลิงก์ envelope; `execution_authorized: true` พร้อมคำสั่งเจ้าของและวันที่; ทางถอย (`rollback`: method, data_compat, verified_by)
- [ ] **ผล oracle** (รหัส EO และ hash ฐาน = head) หรือ test ที่ล้มก่อนแก้ หรือตารางขอบเขต before/after
- [ ] **KPI ที่ขยับ** (ผล `--compare`) หรือ "ไม่อ้าง"
- [ ] **งบขนาด:** ไม่เปลี่ยน / ลดเพดาน / ขอขึ้นพร้อมสี่อย่างตาม D-38 และ offset ที่ระบุชื่อ (KPI-30)
- [ ] **แถว PROGRESS ของแพ็กเกจ** เขียนสถานะที่เป็นจริงเมื่อ merge (KPI-31)
- [ ] ขนาด: บรรทัดซอร์สที่เปลี่ยน ≤ ราว 400 หรือมีเหตุผล; hook request (รหัส HR) หรือ "ไม่มี"; fold ตาม §18.4; `base_sha_verified_on`
- [ ] ผู้ตรวจ: agent คนที่สอง (P0/P1/ฟิสิกส์/storage), เจ้าของอนุมัติภาพ (การเปลี่ยนภาพ), ผู้ตรวจวิทยาศาสตร์ (realism); ระบุ "ยืนยันได้ N จาก M"
- [ ] เซสชันที่เขียน (ลิงก์) และรายการส่งต่อพร้อมเจ้าของ

### 18.11 Task envelope v2 (แทน PLAN:§12.1)

envelope เป็นบล็อกแรกในคำอธิบาย PR และรายงานของแพ็กเกจเก็บ envelope ฉบับสุดท้าย ฟิลด์ระดับแพ็กเกจสะท้อนอยู่ใน `docs/development/registry.tsv` ที่ CO-8 เสนอ (ตอบ PC:(c)10) รหัสเดิมในช่อง `sources` ต้องมี prefix ตาม S00 ฟิลด์ของ v1.2 (PC:(b)) คงไว้ทั้งหมดโดยเปลี่ยนชื่อ: `task_id` → `package` + `step`, `baseline_commit` → `base_sha_verified_on`, `requirement_ids` → `items` + `sources`, `owner` → `lane`, `pending_decisions` → `decisions_needed`, `shared_edits_via_owner` → `hook_requests` + `borrowed_paths` ส่วน `inputs`, `deliverables` และ `evidence` ยังใช้ได้เมื่อแพ็กเกจต้องการ **ค่าเริ่มต้นของ `execution_authorized` คือ false** และมีเพียง H ที่เปลี่ยนได้ผ่านคำสั่งตรงตัวใน `owner_authorization`

**ฟิลด์ที่เพิ่มใน v2 นอกจากการเปลี่ยนชื่อ** (ทุกฟิลด์อยู่ในตัวอย่างด้านล่าง)
- `oracle`: รายการรหัส EO เท่านั้น ไม่ใช่คำบรรยาย (S07 §07.5) oracle เฉพาะ PR ได้รหัส `EO-PR-<แพ็กเกจ>-s<ขั้น>-<n>` และนิยามใน `pr_oracles` ว่าเทียบอะไร บันทึกเป็น commit แรกของ PR ที่เขียวบน merge-base และพิสูจน์ด้วย sabotage อย่างไร ถ้าใช้ได้ทั่วไปให้ย้ายเข้า kit พร้อมรหัสถาวรใน PR quality-improving ถัดไป PR ชนิดอื่นใช้ `oracle: []` (bug-fix ใช้ `failing_before_fix`, realism ใช้ขอบเขตที่ตรึงก่อนรัน)
- `rollback: {method: revert | forward-fix, data_compat, verified_by}`: ใช้ `revert` เมื่อ revert squash commit แล้วผลกลับเป็นเดิมโดยข้อมูลผู้เรียนไม่หาย และใช้ `forward-fix` เมื่อ revert ไม่ปลอดภัย เช่น migration หรือรูปแบบใหม่ที่เขียนลงเครื่องแล้ว `data_compat` บอกว่า build ก่อนหน้า (รวมเครื่องที่ PWA ยัง cache รุ่นเก่า) อ่านข้อมูลที่ build นี้เขียนได้หรือไม่ และ field ที่ build เก่าไม่รู้จักจะหายเมื่อเขียนซ้ำหรือไม่ (S10 §10.1 ข้อ 9, S12 §12.3) ส่วน `verified_by` คือ test หรือผู้ตรวจที่ยืนยันทางถอย กติกา rollback ระดับรุ่นอยู่ใน R7.2 (S17, D-19/D-20)
- `reading_list`: ช่วงบรรทัดของบล็อกแพ็กเกจใน PLAN.md และกติกาที่ขั้นนี้ต้องใช้เท่านั้น (เช่น §18.9, แถว EO ที่ใช้ใน S07 §07.5, ข้อห้ามที่เกี่ยวใน S02 §02.13) เซสชันเลนไม่ต้องอ่านแผนทั้งเล่ม

**การสร้าง envelope (CO-8):** CO-8 สร้าง envelope YAML หนึ่งไฟล์ต่อหนึ่งขั้นของแพ็กเกจ **เฉพาะคลื่นที่เจ้าของอนุญาตแล้ว** ไว้ที่ `docs/development/envelopes/<แพ็กเกจ>-s<ขั้น>.yml` ด้วยสคริปต์จาก `assignment.tsv`, `packages.tsv` และ `folds.tsv` (ชุดเดียวกับที่สร้าง `registry.tsv`) `reading_list` คำนวณจากบรรทัดของบล็อกแพ็กเกจใน PLAN.md v2.0 ที่ merge แล้ว สคริปต์ไม่เขียน `owner_authorization` เอง I คัดคำสั่งของ H มาตรงตัว envelope ของคลื่นถัดไปสร้างใน PR ของ I เมื่อ H อนุญาตคลื่นนั้น (ไฟล์ `.yml` ผ่าน CI ตามปกติ) ก่อน CO-8 merge envelope ของ K0 อยู่ในคำอธิบาย PR เท่านั้น

**ผู้ประสานและ prompt เปิดเซสชัน:** ผู้ประสาน (§18.1; I หรือเซสชันเฉพาะ) เปิดหนึ่งเซสชันต่อหนึ่งขั้นด้วย prompt ด้านล่าง โดยแทนค่าในวงเล็บมุม แล้วติดตามจนขั้นนั้น merge หรือถูกถอน (`withdrawn`) แถวการตัดสินใจที่เลนเขียนไว้ ผู้ประสานรวมเข้าชุดของ S08 และ I บันทึกผ่านช่อง records (§18.6) เวลาของบทบาทนี้นับใน S05 §05.9

```text
คุณคือเซสชันเลน <เลน> ของ Orbitlab ทำงานนี้งานเดียวตาม envelope: docs/development/envelopes/<แพ็กเกจ>-s<ขั้น>.yml
1. อ่าน envelope แล้วอ่านเฉพาะ reading_list ถ้า execution_authorized ไม่ใช่ true หรือ owner_authorization ไม่มีวันที่และคำพูดของเจ้าของ ให้หยุด
2. ตรวจ base_sha_verified_on.recheck ซ้ำบน main ปัจจุบัน ถ้าไม่ตรง ให้บันทึกส่วนต่างในรายงาน
3. เขียนเฉพาะ allowed_write_paths และ borrowed_paths; ไฟล์ hotspot ส่งเป็น hook_request; ทำ change_kind เดียว; commit แรกคือ oracle เฉพาะ PR (ถ้ามี) หรือ test ที่ล้มก่อนแก้
4. ถ้างานต้องออกนอกขอบเขตของ envelope หรือต้องมีคำตอบที่ envelope ไม่ให้: หยุดขั้นนั้น แล้วเขียนแถวการตัดสินใจสถานะ proposed (คำถาม, 2–3 ทางเลือกพร้อมผลต่อคุณภาพ ประสิทธิภาพ และกำหนดเวลา, ข้อเสนอ, ค่าเริ่มต้น = งานรอ) ในรายงาน ห้ามตัดสินเองและห้ามขยายขอบเขต
5. เปิด PR หนึ่งตัว: envelope เป็นบล็อกแรก ตามด้วย checklist ของ PLAN.md S18 §18.10; แก้เฉพาะแถว PROGRESS ของแพ็กเกจและบรรทัด CHANGELOG; ห้าม merge เอง
6. เขียนรายงานที่ docs/development/reports/<ชื่อตามช่อง report ของ envelope>.md พร้อม test ที่รันจริงและจำนวนที่ผ่าน (ถ้าหยุดตามข้อ 1, 2 หรือ 4 ก็ยังเขียนรายงานนี้)
```

**ตัวอย่าง 1: CO-4 ขั้น 1 (bug-fix ข้อมูลหาย P0)**

```yaml
envelope: v2
package: CO-4
step: 1                          # จาก 11 PR (ขั้น 1–10, ขั้น 4 เป็น 4a/4b) ใน S06 §06.3
family: CO
wave: K0
lane: I                          # main.ts เป็นไฟล์ของ I จึงเป็น PR ของ I เอง
items: [M-LAUNCH-027]
sources: [RW:LUI-01, DP:LUI-01, RW:§12:LUI-01]
change_kind: bug-fix
fold_of: null
or_ids: [OR-2]
status: proposed
scientific_acceptance: not-applicable
execution_authorized: false
owner_authorization: {date: null, quote: null, scope: null}   # ใส่คำสั่งเจ้าของตรงตัว (D-65)
base_sha_verified_on: {sha: 7662ead, date: 2026-10-04, recheck: "main.ts:560 onChange: if (!this.playing) this.preview(cfg)"}
reading_list: ["docs/development/PLAN.md:L<a>-L<b> (S06 §06.3 บล็อก CO-4 ขั้น 1; สคริปต์ของ CO-8 ใส่เลขบรรทัด)", "PLAN.md S18 §18.3.1, §18.8, §18.12 (DoD ความปลอดภัยข้อมูล)"]
dependencies: [D-63]
decisions_needed: [D-65]
allowed_write_paths: [src/main.ts, tests/flight-lifecycle*.test.ts, tests/browser/journeys/r2-flight-shell.mjs]
borrowed_paths: ["src/ui/flight-lifecycle.ts <- U (ไม่มี PR ของ U เปิดอยู่; U ตรวจ)"]
hook_requests: []
oracle: []                       # bug-fix ใช้ test ที่ล้มก่อนแก้แทน
failing_before_fix:
  - "unit: shouldPreview(stage='flight') ต้องคืน false (บนฐานไม่มีสัญญานี้)"
  - "journey: หยุดกลางบิน → loop inspector → Use for the next launch → frame ที่บันทึก, timeline และ HUD ไม่เปลี่ยน"
perf_evidence: none              # ไม่อ้างความเร็ว
kpi_targets: {KPI-14: "M-LAUNCH-027 ปิด"}
acceptance: ["ขณะ stage = flight (เล่น หยุด หรือ replay) onChange ไม่เรียก preview()", "ค่าที่ตั้งเก็บไว้ใช้ตอน New mission/Relaunch", "ไบต์ recorder เท่าเดิมสำหรับเที่ยวบินที่ไม่ใช้ action นี้"]
rollback: {method: revert, data_compat: "ไม่เปลี่ยนรูปแบบข้อมูลที่เก็บหรือ recorder; build ก่อนหน้าอ่านทุกอย่างที่ build นี้เขียนได้", verified_by: "second-agent: diff ไม่แตะ src/workspace/** หรือ key ของ storage"}
reviewers: [second-agent, H อ่านสรุป]
report: docs/development/reports/CO-4-r2-fixes.md
handoff:
  - {what: "สัญญา shouldPreview ใน docstring", to: S, item: M-PLAN-013, owner: S, recheck_at: GK1}
```

**ตัวอย่าง 2: EQ-2 ขั้น 1 (identical-output พร้อม oracle เฉพาะ PR)**

```yaml
envelope: v2
package: EQ-2
step: 1                          # PR1 ใน S09: replaceView + M-LAUNCH-041 ขั้น 1
family: EQ
wave: K1
lane: I                          # setupViews อยู่ใน main.ts; C เป็นผู้ตรวจ
items: [M-LAUNCH-049, M-LAUNCH-041]
sources: [CR:D25, CR:P11, CR:NEW-render-1, PB:launchEnter, PB:flightStart]
change_kind: identical-output
fold_of: "EQ-2 ก่อน R3.0 (M-LAUNCH-046) และก่อนภาพตัวอย่าง 3 มิติใน R3.2r/R3.3r"
or_ids: [OR-1, OR-2, OR-3]
status: proposed
scientific_acceptance: not-applicable
execution_authorized: false
owner_authorization: {date: null, quote: null, scope: null}
base_sha_verified_on: {sha: 7662ead, date: 2026-10-04, recheck: "main.ts:1834 setupViews() dispose ชุดเดิมก่อนสร้างชุดใหม่"}
reading_list: ["docs/development/PLAN.md:L<a>-L<b> (S09 §09.5 บล็อก EQ-2 และแถว M-LAUNCH-041/049)", "PLAN.md S07 §07.5 แถว EO-UI-1/2/5 และกฎหยุด; S18 §18.9; S02 §02.13 ข้อ 4, 6, 7"]
dependencies: [R0.4 (EO-UI-1, EO-UI-2, EO-UI-5, M-PLAN-003, M-PLATFORM-041), FX-8, CO-6]
decisions_needed: []
allowed_write_paths: ["src/main.ts (setupViews และ helper replaceView ภายในไฟล์)", tests/render-rebuild*.test.ts]
borrowed_paths: []
hook_requests: []
oracle: [EO-UI-1, EO-UI-2, EO-UI-5, EO-PR-EQ-2-s1-1]   # รหัส EO เท่านั้น; ฉากและเวลาตาม S07 §07.5
pr_oracles:
  - id: EO-PR-EQ-2-s1-1
    what: "dump ของ scene graph (ลำดับลูก, visibility, transform) ทุกเฟส APOLLO_* (S09 แถว M-LAUNCH-049)"
    recorded: "commit แรกของ PR เขียวบน merge-base ก่อนมีโค้ดเปลี่ยน"
    sabotage: "สลับลำดับ scene.add ของ rocket กับ trails บน branch ทิ้ง (ไม่ commit) แล้ว oracle ต้องล้ม; ผลแนบในรายงาน"
perf_evidence: {tool: "measure.mjs --compare", scenarios: [launchEnter, flightStart], runs: 3, rule: "ช่วงไม่ทับกัน ถ้าทับให้เขียนว่า ต้องวัด"}
kpi_targets: {KPI-05: "18/19 → 0/0 (สมมติฐาน)", KPI-06: "< 500 ms (สมมติฐาน)", KPI-32: "ค่าสูงสุดของหน่วยความจำช่วงสองชุด ≤ ค่าสูงสุดเดิมของภารกิจ ถ้าเกินให้ไม่ merge แล้วไปขั้น 2"}
stop_rule: "S07 §07.5: ถ้า oracle ขยับ PR นี้ไม่ใช่ EQ"
rollback: {method: revert, data_compat: "ไม่แตะข้อมูลที่เก็บ", verified_by: "I: oracle ทุกตัวเท่ากันระหว่าง base กับ head จึง revert ได้โดยผลไม่ขยับ"}
reviewers: [C, second-agent ไม่บังคับ]
report: docs/development/reports/EQ-2-render-rebuild.md
handoff: []
```

**วงจรสถานะ:** proposed → ready (ผ่าน DoR, ตรวจโดยเลนและ I) → authorized (H เท่านั้น พร้อมคำสั่งตรงตัว) → in_progress (เลน) → review (เปิด PR) → verified (CI เขียวบน candidate ปัจจุบันและผู้ตรวจครบ) → merged (I/H merge) → published (Pages สำเร็จบน exact source พร้อม deployment record และบันทึกโดย I) งานที่ถูกทิ้งตามกฎหยุดใช้ `withdrawn` พร้อมเหตุผล **merged ไม่ใช่ published** **scientific acceptance ติดตามแยก:** not-applicable / not-started / pending-review / accepted / accepted-with-limits / rejected และมีเพียงผู้ตรวจวิทยาศาสตร์ (D-55) กับ H ที่เปลี่ยนได้ ไม่มี agent ใดเปลี่ยนสถานะเพื่อข้ามประตู

### 18.12 Definition of Ready และ Definition of Done (แทน PLAN:§12.2)

**DoR (ทุกแพ็กเกจและทุกขั้น)**
- เจ้าของสั่งเริ่มแพ็กเกจหรือคลื่นนี้แล้ว (คำสั่งและวันที่อยู่ใน envelope) ห้ามอนุมานจากแพ็กเกจก่อนหน้า (D-65)
- การตัดสินใจที่ต้องใช้ตอบแล้ว (S08) ถ้ายังไม่ตอบ งานรอ
- dependencies merge แล้ว ช่อง WIP ของเลนว่าง และ CI ของเลนเขียว
- ตรวจสถานะรายการซ้ำบน main ปัจจุบันแล้ว: ledger ตรวจบน `da67341` และข้อเท็จจริงของ R3 ตรวจบน `5f9aa2e` (`refresh/r3-audit.tsv`) ซึ่งครอบการเปลี่ยนของ #75–#83 แล้ว จึงต้องตรวจใหม่สำหรับทุก PR ที่ merge หลัง `5f9aa2e` ก่อนตรึงฐาน (Day 0, S05 §05.0; เช่น M-LAUNCH-030/076, M-PLAN-028, M-BUILD-015) แล้วบันทึกใน `base_sha_verified_on`
- allowed paths, hook, สัญญาหรือ ADR, เกณฑ์รับ, oracle (EQ) หรือขอบเขต (realism) ตรึงแล้ว
- รายการบทเรียน: วัดเกณฑ์บนเที่ยวบินจริงก่อน แล้วจึงทดสอบในเบราว์เซอร์จริง และให้คะแนนที่เวลาสิ้นสุดที่นิยามไว้ (process lesson 22)
- งานเนื้อหามากต้องมีหลักฐาน HU-1 ตามขอบเขตของ D-54

**DoD ทั่วไป:** พฤติกรรมตรงข้อกำหนด; check ที่มีความหมายและ reference gate ที่เกี่ยวข้องผ่านบน candidate ปัจจุบัน; หลักฐานตรงกับ source; ตรวจทานแล้ว; docs, ความเข้ากันได้ และข้อจำกัดครบ; merge และ publish ยืนยันจากผลจริง ไม่ใช่การเปลี่ยนสถานะเอง และต้องมีครบสี่อย่าง:
- แถว PROGRESS ของแพ็กเกจใน PR ที่ merge (§18.3.4, KPI-31) และบรรทัด CHANGELOG
- รายงาน `docs/development/reports/<package>.md`: ขอบเขต, ไฟล์ที่แก้, test ที่รันจริงพร้อมจำนวน, ผล, ผลการล้มก่อนแก้, ข้อจำกัดที่ยังไม่แก้, ผลกระทบต่อแพ็กเกจถัดไป, รายการส่งต่อพร้อมเจ้าของ, จำนวนข้อที่ยืนยันได้ และชั่วโมงของเจ้าของถ้ามี
- docs ที่แก้ หรือ N/A
- แถว KPI ใน PROGRESS ที่ GK ซึ่ง I เป็นผู้ลง (S04 §04.5)

| DoD เพิ่มตามชนิด | ต้องมี |
|---|---|
| **EQ (identical-output)** | oracle เท่าเดิม (รหัสและ hash); `--compare` 3 รอบ; ไม่ขึ้นเพดาน; ไม่ re-record oracle; ไม่มีชนิดอื่นปน; T เปิด PR ลดเพดานเมื่อ chunk เล็กลง |
| **ความปลอดภัยข้อมูล** | test ที่ล้มก่อนแก้พร้อม fixture ที่เกี่ยว (สองแท็บ, quota, โปรไฟล์เสีย, รูปแบบใหม่กว่า); ไบต์ที่เก็บเท่าเดิมเมื่อเปลี่ยนแค่ความเร็ว (EO-STO-1); กักแยก ไม่ทิ้ง; migration และความเข้ากันได้กับ cache เก่า; `rollback.data_compat` ตรวจแล้ว และใช้ forward-fix เมื่อ build ก่อนหน้าอ่านข้อมูลที่เขียนใหม่ไม่ได้; ผู้ตรวจคนที่สอง; อัปเดตจำนวนใน KPI-14 |
| **ความสมจริง** | ขอบเขตกำหนดก่อนรัน; before/after ทั้งสองแบบจำลอง; held-out; re-record ที่ระบุชื่อและเจ้าของอนุมัติ; heavy และแถว fleet ของยานบน source ที่ตรึง; `rigid-flex-golden` เมื่อเกี่ยว; scientific acceptance แยกจาก execution; ป้ายและ Known limitations อัปเดต |
| **ภาพ** | ภาพก่อน/หลังตาม matrix ย่อยของ S04 §04.4 และเจ้าของอนุมัติ |

### 18.13 การตรวจทาน

| PR หรืองาน | ผู้ตรวจ | สิ่งที่ตรวจ | บันทึกที่ |
|---|---|---|---|
| ทุก PR | I + CI | write set, ชนิดเดียว, ขนาด, envelope, CI เขียวบน candidate ปัจจุบัน; check ที่ pending/ล้ม/ยกเลิก หรือหลักฐานที่หมดอายุเพราะ base เปลี่ยน ใช้แทนไม่ได้ (PLAN:§10.2) | PR |
| P0/P1, ฟิสิกส์, storage | agent คนที่สอง (เซสชันใหม่ ไม่ใช่ผู้เขียนหรือเลนเดียวกัน) | ความถูกต้องและข้ออ้าง "ทำแล้ว" เทียบกับ file:line; ระบุ "ยืนยันได้ N จาก M" (process lesson 11) | รายงานแพ็กเกจ |
| ทุกการเปลี่ยนภาพ | H | ภาพก่อน/หลังตาม matrix ย่อย | PR (ข้อความอนุมัติพร้อมวันที่) |
| realism | ผู้ตรวจวิทยาศาสตร์ (D-55) | รันตัวเลขหลักซ้ำเอง, held-out, ความแยกจากผู้ fit (process lesson 10) | `scientific_acceptance` |
| ฟิสิกส์และข้อมูล | H | อ่านสรุปและ diff ของ `src/physics/**`, `src/data/**` และรูปแบบ storage ตามข้อเสนอของ D-23/D-25 | PR |
| เนื้อหาและภาษา | คนที่ระบุชื่อ (HU-2, HU-3) | `reviewed:false` คงไว้จนกว่าจะเซ็น | pack และ checklist |

agent ห้ามอนุมัติแทนคน ห้ามเขียนว่า "decided" หรือ "accepted" แทน H หรือผู้ตรวจวิทยาศาสตร์ และห้าม merge ก่อนแล้วไปตรวจส่วนที่จำเป็นภายหลังใน R7 (PLAN:§10.2)

### 18.14 การไหลของการตัดสินใจ

- คำถามที่พบระหว่างงานเขียนเป็น 2–3 ทางเลือก พร้อมผลต่อคุณภาพ ประสิทธิภาพ และกำหนดเวลา และมีข้อเสนอ (process lesson 4) เลนหยุดเฉพาะขั้นที่ขึ้นกับคำตอบ ส่วนขั้นอื่นทำต่อได้ ไม่ขยายขอบเขตเอง
- I รวมคำถามเป็นชุดต่อคลื่น (ชุด A–D ใน S08 §08.5) พร้อม needed-by เจ้าของใช้ราว 1–2 ชม. ต่อชุด
- **ถ้ายังไม่ตอบ: งานที่ขึ้นกับคำตอบรอ ไม่มี agent ตัดสินแทน** ความหน่วงเทียบกับ needed-by วัดเป็น KPI-35
- คำตอบลง DECISIONS.md โดย I พร้อมวันที่และข้อความตรงตัว แถวที่ยังไม่ได้รับการยืนยันใช้สถานะ proposed หรือ adopted-awaiting-confirmation เท่านั้น
- ทุกแถวระบุจุดตรวจว่าปฏิบัติตามแล้ว และ I ตรวจซ้ำทุก GK (S08 §08.6) เพื่อแก้ความล้มเหลวแบบ D-12/D-13 (process lesson 5)
- ขอบเขตที่ต้องอาศัยหลักฐานจากผู้ใช้: เกณฑ์ตรึงก่อน session ถ้าเจ้าของข้ามประตูต้องบันทึกการข้าม (process lesson 23; D-54)
- การกำกับโค้ดจาก AI (D-23/D-25, M-PLATFORM-078) อยู่ใน S08 ส่วนระบบติดตามงานและ session protocol (M-PLATFORM-077) ลงมือใน CO-8 (S06)

### 18.14a โต๊ะอนุมัติ merge ของเจ้าของ (คำสั่งเจ้าของ 2026-10-05, ใช้กับทุกคลื่นจากนี้)

**คำสั่งเจ้าของตรงตัว (2026-10-05):** "งานแต่ละส่วนเมื่อทำเสร็จแล้วทำสรุปมาว่าทำอะไรบ้าง แล้วทำแบบให้ผมกดเลือกได้เลยว่าให้กด merge มั้ย บันทึกเข้าไปในวิธีทำงานต่อจากนี้ของทั้งงานด้วยครับ"

**หน้า:** Orbitlab Merge Desk (claude.ai artifact `https://claude.ai/artifact/77kbiVNddHUixiZ7aXJSxB`) มีการ์ดหนึ่งใบต่อ PR และปุ่มสองปุ่ม คือ "อนุมัติ merge" กับ "ยังไม่ merge" พร้อมช่องข้อความ ฐานข้อมูลของหน้ามี collection `prs` (I เป็นผู้เขียน; Editor ขึ้นไปเขียนได้) และ `decisions` (เขียนได้เฉพาะเจ้าของ artifact) ผู้อื่นที่เจ้าของแชร์ให้ดูได้อย่างเดียว

**ขั้นตอนต่อ PR (ทุกเลน ทุกคลื่น):**
1. เมื่อ PR ครบ DoD (§18.12) ได้แก่ CI เขียวบน head ปัจจุบัน, agent ตัวที่สองตรวจและข้อที่พบแก้แล้ว (P0/P1, ฟิสิกส์, storage) และรายงานกับแถว PROGRESS อยู่ใน PR แล้ว I จึงเขียนการ์ดลง `prs` ใช้ภาษาไทยที่อ่านง่าย มีหัวข้อดังนี้
   - **ทำอะไรไป:** ผลที่ผู้ใช้เห็นหรือที่เปลี่ยน ไม่ใช่รายชื่อไฟล์
   - **ผลตรวจ:** run id ของ CI, test ที่ล้มก่อนแก้และผ่านหลังแก้, ผลของ agent ตัวที่สองแบบ "ยืนยัน N จาก M"
   - **สิ่งที่ควรรู้ก่อนตัดสิน:** ข้อจำกัด, ลำดับ merge, และคำถามถึงเจ้าของ
   - สถานะ: `ready` / `waiting` (รอสิ่งอื่นก่อน เช่น ลำดับ merge) / `blocked` / `merged` พร้อม `head` ที่สรุปนั้นอ้างถึง
   ส่งข้อความสรุปภาษาไทยสั้น ๆ ในแชทพร้อมลิงก์หน้าด้วย
2. เจ้าของกดปุ่ม I อ่าน `decisions` ทุกครั้งที่ตื่นจากเหตุการณ์หรือ check-in และทุกครั้งที่เจ้าของบอกในแชท
3. **การ merge:** เมื่อมีแถว `decisions/<pr>` ที่ `choice: "merge"` และ head ที่อนุมัติเท่ากับ head ปัจจุบัน, CI เขียว, merge ได้ไม่มีข้อขัดแย้ง และลำดับ merge ครบ (เช่น CO-2 หลัง CO-1 เผยแพร่) I จะ squash-merge ตามปกติ ห้ามใช้ admin override แล้วบันทึก SHA และติดตาม Pages ถ้า head เปลี่ยนหลังเจ้าของกด (เช่น merge main เข้าเพื่อแก้ข้อขัดแย้ง) ให้ถามเจ้าของอีกครั้งพร้อมบอกว่าเปลี่ยนอะไร
4. `choice: "hold"` หรือข้อความในช่อง: ไม่ merge ให้ทำตามข้อความ แล้วอัปเดตการ์ด การพิมพ์อนุมัติในแชทยังใช้ได้ทุกเมื่อ และมีน้ำหนักเท่ากับการกดปุ่ม
5. หลัง merge เปลี่ยนการ์ดเป็น `merged` พร้อม SHA, run ของ Pages และผลการเผยแพร่ (merged ≠ published ≠ live)

**ข้อจำกัด:** หน้าไม่แจ้ง I ทันทีที่มีการกด I จะเห็นเมื่อตื่นจากเหตุการณ์ GitHub, check-in ตามกำหนด หรือข้อความในแชท ถ้าเจ้าของต้องการให้ merge ทันที ให้บอกในแชทว่า "กดแล้ว" CO-8 ย้ายกติกานี้ลง `docs/development/SESSION-PROTOCOL.md` และกติกาการรวมงานใน PROGRESS

### 18.15 สิ่งที่ไม่ควรทำ (PLAN:§9.2 คงไว้)

ห้ามลดจำนวน case, ห้ามยืด timeout เป็นการแก้หลัก, ห้าม rerun แบบไม่รู้สาเหตุ, ห้ามตัด heavy ของงานฟิสิกส์ร่วม, ห้ามตัด browser ของงาน migration/PWA, ห้ามผสมผลของ source เก่ากับใหม่ และห้ามขยายงบโดยไม่ระบุสาเหตุ (v2.0 เพิ่ม: และไม่มี offset ที่ระบุชื่อ, D-38)

ข้อ 1–10 ของ PLAN:§9.2 ไปอยู่ที่: 1 fast feedback ตามผลกระทบ → R0.3r (S07); 2–3 หนึ่งหลักฐานต่อ source และ discovery ไม่ตกหล่น → §18.8; 4–6 release ขนาน, run coordination และ failure evidence → ทำแล้วใน R1.5 และดูแลต่อใน R7.3 (S17); 7 browser determinism → §18.8; 8 scientific gate ก่อน golden → §18.9; 9 ลดการทดสอบซ้ำอย่างมีเงื่อนไข → D-64; 10 ประเมินผล process → KPI-28 และ KPI-33…35

### 18.16 ประวัติ workflow และบทเรียน (PLAN:§9.1 + เหตุการณ์ใหม่)

| เหตุการณ์ | หลักฐาน | บทเรียน → กติกาใน v2.0 |
|---|---|---|
| Soyuz #63 budget | CI 36884215504 ล้มที่ build/budget; 36884357092 ผ่านใน ~16 นาที | เช็ก type/build/budget ก่อน physics sweep → §18.8 |
| #63 deploy | Pages 36886828921 ล้มหลัง 50:05 (worksheet click timeout) | ย้าย export check ที่กระทบมาไว้ก่อน → §18.8 |
| Soyuz #64 | CI 36918069063 ผ่าน 12:42; fleet รันซ้ำก่อน/หลัง merge main | สอง branch ฟิสิกส์บนฐานร่วมทำให้รันซ้ำ → P ทีละ PR, ตรึง candidate |
| Stage 2 | PR CI 37063706462 ผ่าน แต่ scheduled Pages 37066834767 ล้ม | PR ผ่าน ≠ live → §18.8 |
| WebGL/browser | 37070737313 timeout; 37073349169 `Target crashed` | annotation ต้องระบุ action; ห้าม retry แบบไม่รู้สาเหตุ → §18.15 |
| Stage 3–4 รอบแรก | CI 37080233899: RU 320 px ล้นจอ + assertion รอ worker ผิด | แยก regression ของ product กับ defect ของ test |
| Stage 3–4 รอบสุดท้าย | CI 37081940631 ผ่าน 14:05; browser 11:39/11:06 | browser เป็น critical path ของ PR → KPI-28 |
| Release เดิม | Pages 37084189532 ผ่าน 39:24 (unit แล้ว browser ต่อกัน) | ทำ gate ขนาน (ทำแล้วใน R1.5: 18–22 นาที) |
| Heavy | 36804343856 46:55; 36942933112 60:45 | sweep ใช้เวลาจริง → แถว fleet ตามยาน + D-64 |
| inventory คลาด | `tests/heavy` 33 ไฟล์ แต่ audit คาด 27 | discovery และ manifest เดียว (ทำแล้วใน R1.5) |
| agent ขนาน 2026-09 | OD:HANDOFFS Report 1, 2, 4, 6, 9: gate ของกันและกันพัง; probe ทำ build พัง; ลบ probe ของกันและกัน | ผู้เขียนคนเดียวต่อ hotspot, scratch นอก tsconfig → §18.3, §18.7 |
| R1 ล้มตอน release | Pages 37100771200 บล็อกการเผยแพร่ (journey `project-backups` timeout ที่ navigation barrier 30 s) → PR #72 → Pages 37103651001 เผยแพร่ `472645f` | รอ readiness ที่ระบุชัด; release ที่ล้มเป็นหลักฐาน; publish ก่อน follow-up ที่เป็นรายงาน → §18.8, §18.3.4 |
| R1 ส่งโดยไม่แก้เอกสาร | #71–#73 ไม่มี CHANGELOG, README, USER-GUIDE หรือ IMPLEMENTATION-STATUS (process lesson 16) | บรรทัด "docs ที่แก้ หรือ N/A" → §18.10 |
| R2 merge โดย journey ของตัวเองไม่ได้รันใน PR CI | PR CI 37168554643 มีแค่ smoke; `r2-flight-shell` รันครั้งแรกใน Pages 37169459230 หลัง merge | journey ใหม่ต้องมี smoke slice ใน PR CI และพิสูจน์ด้วย sabotage → CO-5, §18.7 |
| R3 package 1 ติดเพราะข้อมูลโต | Pages 37172926281: precache 15,787.4 > 15,783 kB ขณะที่ PR CI วัดได้ 15,778.7 kB; #76 ขึ้นเพดาน +320 kB ตาม "measured + 2 %" โดยไม่มี offset; Pages 37193082491 เผยแพร่เสร็จ 10:07Z ราว 7 ชม. หลัง #75 merge | แยกเพดานโค้ด/ข้อมูล (CO-1, D-38); การขึ้นเพดานนับใน KPI-30 → §18.3.3 |
| แถวสถานะล้าหลังทุกครั้งที่ merge | R2 เขียน "not merged" บน `da67341`; R3 เขียน "in PR" บน `7ddab75`/`1d5b76b`; ตั้งแต่ #77 PR ถัดไปบันทึกการเผยแพร่ของ PR ก่อนหน้า และ #79 เป็น follow-up Markdown อย่างเดียว | สองขั้น: แถวใน PR ที่ merge + follow-up หลัง publish → §18.3.4, KPI-31 |
| PR ใหญ่และ merge เร็ว | #74 +1,520/−75 (29 ไฟล์), #75 +1,067/−19, #77 +1,253/−39 (38 ไฟล์) merge ภายใน 15–29 นาทีหลังเปิด จาก branch เดียว (ตัวเลขรวม test; บรรทัดซอร์สอย่างเดียว: ต้องวัด) | เพดาน ~400 บรรทัด, ผู้ตรวจคนที่สอง, หนึ่งขั้นหนึ่ง PR → §18.5, §18.6, §18.13; ความเร็วของ R1–R3 ใช้เป็นฐาน KPI-33 ไม่ได้ |
| เพดานยังขึ้นหลัง `7ddab75` | `budgets.json` บน `7662ead`: #77 ขึ้น index/CSS/i18n +12/+2/+9 kB (2,600 → 2,612, 173 → 175, 1,702 → 1,711; เป็นสองส่วนตามสองส่วนของ R3.5: +8/+2/+5 แล้ว +4/0/+4) และ #80 ขึ้นอีก +10/+2/+9 kB (→ 2,622, 177, 1,720) ทั้งหมดโดยไม่มี offset ที่ระบุชื่อ; #81/#82 ไม่ขึ้นเพดาน (`budgets.json` บน `5f9aa2e` เท่ากับบน `7662ead`; #78 ก็ไม่แตะเพดาน) | นับใน KPI-30 และให้ S04 §04.3 อัปเดตตารางประวัติ → §18.3.3 |
| merge แล้วแต่เผยแพร่ไม่ได้ (#80) | PR CI 37218178884 ผ่าน แต่ Pages 37219398466 ล้มที่ journey `learner-profiles` (reload ไม่พ้น `#loading` ใน 120 s; สาเหตุยังไม่ทราบ); #81 เพิ่ม start-up marks แล้ว Pages 37223857005 ล้มที่จุดเดิม; #82 เพิ่ม CPU/GPU ของ browser process แล้ว Pages 37230585947 ผ่านและเผยแพร่ #80–#82 (live ค้างที่ `f30590e` ราว 8 ชม. 23 นาที, 12:06:51Z–20:29:40Z) ไม่ยืด timeout ไม่ retry แบบไม่ดูสาเหตุ | PR CI ผ่าน ≠ published; main ที่ release ล้มนับเป็น CI แดงของเลนที่เกี่ยว (§18.6) แก้ด้วย diagnostics/สาเหตุ หรือ revert ก่อนงานใหม่ ห้ามยืด timeout (§18.15); แถว PROGRESS คง “merged, รอ publish” จนมี Pages ที่สำเร็จ (§18.3.4) → §18.6, §18.8, S05 ความเสี่ยงข้อ 28 |
