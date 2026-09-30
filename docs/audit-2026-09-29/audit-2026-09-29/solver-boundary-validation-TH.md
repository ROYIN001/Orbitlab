# ตรวจขอบเขต Kepler และ Lambert พร้อมแก้ข้อผิดพลาดที่ยืนยัน

เริ่ม 29 กันยายน–เสร็จ 30 กันยายน 2026 เวลา 00:03 Moscow ใน `source-integrated` หลังฐาน `9811233` ใช้โมดูลจริงที่ bundle ด้วย Vite โดยไม่เปิด server/browser ผลนี้เป็น numerical/source acceptance ไม่ใช่การตรวจภาพ UI หรือการรับรองความถูกต้องทุกคำตอบของ solver

## ขอบเขตและเกณฑ์

- `stateAt`: วงรี e<1 และไฮเพอร์โบลา e>1 ตาม conic เดิม; ไม่เพิ่ม exact-parabolic e=1. Direct Orbit slider จำกัด e≤0.95 แต่โมดูลและเส้นทาง handoff/maneuver รับ conic ที่ใกล้1ได้ จึงระบุ near1เป็น module stress แยกจากการใช้ slider โดยตรง
- Lambert: positive finiteTOF, short/long way, น้อยกว่าหนึ่งรอบ ตาม sourcecontract; UIรับ60วินาทีถึง30วัน. Exactcollinear ไม่มีระนาบวงโคจรเฉพาะจึงคืนnull. ไม่สรุปว่าทุกnullหมายถึงไม่มี mathematicalsolution โดยไม่พิสูจน์ existence
- เกณฑ์ Lambert: ตำแหน่งปลายทาง≤1m, ความเร็ว≤0.001m/s โดยไม่ผ่อนเกณฑ์. Keplerเทียบตำแหน่ง≤max(1m,1e-8×radius), ความเร็ว≤0.001m/s. มีRK4อิสระพร้อมลดstepครึ่งหนึ่งยืนยันoracle และมีclosed-formapsides

## Lambert: ยืนยันและแก้สองจุดที่สูญเสียความแม่นยำ

Fixture: r1=(6778137,0,0)m; r2=7078137×(cos179.999999°,sin179.999999°,0)m; TOF2800s shortway. ก่อนแก้คืนv1≈(−147.590623,9078.669657,0)m/s ซึ่งพลาดเป้าหมาย **9,633,504.96m** และความเร็ว8,690.34m/s. Perigee6,775,014.86mอยู่เหนือโลก จึงไม่ใช่เพียงtrajectoryทะลุโลก. Universal-variableoracleและCartesianRK4ต่างกันเพียงระดับ1e-8m; RK4step0.25/0.5sต่าง3.36e-8m

สาเหตุแรกคือ `1+cos(theta)` ใกล้π สูญเสียมุม; เปลี่ยนสาขามุมป้านเป็นสูตรเทียบเท่าจากcrossproduct. พบต่อว่าการลบpositionvectorsในf/gก่อนหารด้วยgที่เล็กยังสูญเสียradialvelocity: TOF86400sยังพลาด92.98mหลังแก้เฉพาะA. จึงจัดสมการvelocityเดิมเป็นradial/transversecomponents ซึ่งรักษาทิศshort/longwayและไม่เปลี่ยนวิธีแก้สมการเวลา

Regressionใหม่ `tests/lambert-boundary.test.ts` มี5cases: RK4ปลายทาง2800sทั้งสองทิศ,86400s shortway และexactcollinearทั้งสองทิศ. 4casesแรกที่เพิ่มล้มก่อนแก้;86400sล้มหลังแก้เฉพาะAและผ่านหลังแก้velocity. ไม่เปลี่ยนgoldenexpectedหรือผ่อน tolerance

Outer matrix **120cases** =10angles×6TOFs×2directions. ก่อนแก้คืน80คำตอบ:56ผ่าน,24ผิดเกณฑ์ และ40null. หลังแก้คืน **72คำตอบ/72ผ่าน**, maxpositionerror **0.2610996m**, maxvelocityerror **0.000196580m/s**; อีก48null (24exactcollinear/antipodal และ24สาขาที่ไม่ได้พิสูจน์existence). ไม่รวมnullเหล่านี้เป็นresidualpass. Zero/negative/NaN TOF3checksคืนnull

## Kepler: near1 propagation และ handoff

Fixture: e=0.999999999, rp=7e6m, a=rp/(1−e), m0=0. ก่อนแก้ที่t=−3600/+3600sพลาด **81,029.28/26,293.19m**. Monotonebisectionด้วยeccentric-anomalyCartesianformulaและRK4อิสระตรงกัน<5e-8m; ไม่ใช่การเทียบproductionกับตัวเอง

แก้เฉพาะ `src/orbit/kepler.ts` เมื่อ0<|e−1|<1e-4: เก็บmeananomalyเล็กแบบมีเครื่องหมาย,แก้สมการmonotoneด้วยbisectionและstable x−sinx / sinhx−x,ใช้Cartesianeccentric/hyperbolicanomalyโดยตรงเพื่อหลีกเลี่ยงการหารด้วย1+e cosνใกล้asymptote. Ordinaryellipse/hyperbola pathsและsharedflighthelpersไม่เปลี่ยน

ตรวจcallerพบ `stateAt→orbitFromState→stateAt` ยังพลาด26.3kmจากmeanphaseที่ถูกwrapรอบ2π. แก้near1conversionให้เก็บsignedphaseแบบstableและคำนวณaจากangularmomentumกับe ให้พารามิเตอร์สอดคล้องกัน แทนการหารด้วยenergyซึ่งได้จากผลต่างใกล้กัน. Sixroundtripsสุดท้ายมีpositionerrorสูงสุด **2.05e-8m**

Regressionใหม่ `tests/kepler-boundary.test.ts` มี16cases: signed±3600sสำหรับ4ค่าe,analyticperiapsis/apoapsisสองค่าe และstatehandoffที่ตั้งต้นจากRK4อิสระ6cases. 8/10casesแรกล้มก่อนแก้stateAt; handoffที่e=.999999999อีก2casesล้มก่อนแก้conversion

Outer Kepler matrix **108cases** =9e×3m0(0,1e-8,π)×4times(0,−3600,3600,30days). หลังปรับความแม่นยำของreferenceบันทึกbefore95ผ่าน/13ผิดเกณฑ์; หลังแก้ **108/108ผ่าน**, maxpositionerror5.66mm, maxvelocityerror1.68e-8m/s. สูตรreferenceและproductionสุดท้ายมีalgebraร่วมกัน จึงใช้RK4และanalyticapsidesเป็นหลักฐานอิสระเพิ่ม ไม่อ้างว่า108casesเป็น108independentphysicaloracles

## การยืนยันและไฟล์หลักฐาน

- Relatedsuite7files **91/91ผ่าน** (30กันยายน00:03:29Moscow,7.44s): Keplerboundary,Lambertboundary,maneuvers,maneuver-setup,kepler,orbit-playground,orbit-handoff
- TypeScriptผ่าน(exit0),gitdiff--checkผ่าน. ไม่มีการแก้shared `src/physics/orbital.ts`,ไม่มีgoldenexpectedเปลี่ยน ไม่มีnewparabolicfeature
- `solver-boundary-entry.ts` exportsactualmodules; `solver-boundary-check.mjs` builds/runsอิสระและบันทึกsourceSHA256
- `solver-boundary-results-before.json` เก็บbaselineก่อนLambertfix; `solver-boundary-results.json` เก็บfinalmatrix/roundtrips; `solver-boundary-summary.json` เป็นฉบับย่อสำหรับpublish
- `solver-boundary-modules.mjs` เป็นgeneratedbundleและ`solver-boundary-run-after.txt`เป็นlogประกอบ ไม่จำเป็นต้องpublishซ้ำ

Rootรับช่วงfinalbuild/browser/commitและheavyCIจากsourceที่นิ่งแล้ว งานย่อยนี้ไม่publishเอง
