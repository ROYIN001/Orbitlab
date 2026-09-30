# ดัชนีหลักฐานที่เก็บเฉพาะในเครื่อง

ชุดเผยแพร่นี้คงรายงาน ผลสรุปที่ตรวจย้อนกลับได้ และภาพตรวจรับขนาดพอเหมาะ ไฟล์rawขนาดใหญ่ยังอยู่ในworkspaceเดิม ไม่ได้ถูกลบและไม่ได้อ้างว่าอยู่ในแพ็กเกจนี้ รายการรายไฟล์พร้อมขนาด/SHA256อยู่ใน [local-only-evidence.json](local-only-evidence.json)

| กลุ่ม | ตำแหน่งเดิมเทียบworkspace | สิ่งที่อยู่ในชุดเผยแพร่แทน |
|---|---|---|
| Build matrix6542rows | `audit-2026-09-29/build-catalogue-matrix-results.json` | [summaryและrawhash](audit-2026-09-29/build-catalogue-matrix-summary.json), [รายงาน](audit-2026-09-29/build-catalogue-matrix-TH.md) |
| CSVsix-DOF3ไฟล์/point-mass2ไฟล์/HTMLreport/FlightJSON | `audit-2026-09-29/browser-export-artifacts/` | parser,structure,notationvalidationและhash; ไม่ทำสำเนาCSVที่เหมือนกันซ้ำ |
| Case exports TH/RU หลัง layout fix | `audit-2026-09-29/browser-export-artifacts/editorial-layout-final/` | รวม final 24 HTML/DOCX และ 18 PNG ทั้งหมด พร้อม manifests/visual review; PDF ที่ใช้ render คงในเครื่อง |
| Case exports before277 และ local module proof | `audit-2026-09-29/browser-export-artifacts/editorial-final/`, `editorial-layout-local/` | รวม metadata และภาพ before 7 หน้าที่แสดงข้อผิดพลาด; raw exports/ภาพ before อีก 11 หน้า/ไฟล์ local-generated คงในเครื่องและมี SHA ในดัชนี JSON |
| DOCX/PDFรุ่นก่อนแก้และPDFที่renderใหม่ | `audit-2026-09-29/browser-export-artifacts/` | finalTH/RU8HTML/DOCX,8pagePNG,manifest/render-validation; THmixedก่อนแก้มีภาพตัวอย่างและmanifestแยก |
| Syntheticboundaryinputs | `audit-2026-09-29/browser-fixtures/boundaries/` | manifest/parser-validation/browser-boundary-validation; ไม่รวมไฟล์30MiBและ2MiB |
| Cloudnestedrecovery/rawshards | `audit-2026-09-29/cloud-numerical-shards/recovered-*/` | uniqueunion2544assertions/source/runtimehashesและfocusedfollowup; rawshardsไม่ซ้ำหลายsnapshot |
| GitHub Actions raw artifacts | `audit-2026-09-29/actions-heavy-results/` | final summary/union และ provenance พร้อม browser CI logs; raw ต่อไฟล์และ ZIP เก็บในเครื่อง |
| Source/patches/node_modules/dist/runtimecache | source/source-integrated,patch/ZIPที่workspaceเดิม | productionอยู่ในrepositoryต่างหาก; ไม่แถมcheckout,bundle,node_modulesหรือLibreOfficeprofileในaudit |

ชื่อไฟล์ในcode spansของรายงานเก่าอาจอ้างrawเหล่านี้ ให้ค้นในJSONดัชนีนี้; ลิงก์Markdownไปยังartifactที่อยู่ในชุดได้รับการตรวจว่าresolveได้. รายงานhistorical/checkpointใช้ประกอบที่มา ไม่แทนผลตรวจรับล่าสุด
