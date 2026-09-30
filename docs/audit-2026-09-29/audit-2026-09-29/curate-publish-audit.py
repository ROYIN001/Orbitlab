"""Make the reviewable audit packet only; never touch the production checkout."""
import hashlib
import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
A = ROOT / 'audit-2026-09-29'
OUT = A / 'publish-audit-final'
OUT.mkdir(exist_ok=True)
selected = set()
derived = {}
transformed = {}
local_only = {}

# Evidence hashes describe file bytes, including original line endings.
# A nested attribute overrides the product repository's text=auto only here.
(OUT / '.gitattributes').write_text('# Preserve the exact evidence bytes recorded in SHA256SUMS.\n* -text\n', encoding='utf-8')
derived['.gitattributes'] = 'Disable Git line-ending conversion only inside this evidence packet so committed/downloaded bytes retain their recorded SHA256'

def sha(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()

def add(path):
    p = (ROOT / path).resolve()
    if not p.is_file():
        raise FileNotFoundError(path)
    if not p.is_relative_to(ROOT) or any(x in p.parts for x in ('node_modules', 'lo-profile', 'source', 'source-integrated', 'publish-audit-final')):
        raise ValueError(f'Excluded source: {p}')
    selected.add(p)

def keep_local(path, reason):
    p = path.resolve()
    if p.is_file() and p not in selected:
        local_only[p.relative_to(ROOT).as_posix()] = {'bytes': p.stat().st_size, 'sha256': sha(p), 'reason': reason}

def local_target(parent, target):
    target = unquote(target.strip('<>').split('#', 1)[0])
    target = re.sub(r'^/([A-Za-z]:[/\\])', r'\1', target)
    target = re.sub(r':\d+$', '', target)
    return (Path(target) if re.match(r'^[A-Za-z]:[/\\]', target) else parent / target).resolve()

reports = '''Orbitlab-acceptance-TH.md import-export-checklist-TH.md learning-followup-review-TH.md
ui-case-export-validation-TH.md docx-pagination-validation-TH.md worksheet-language-validation-TH.md
runtime-fingerprint-validation-TH.md graphics-validation-TH.md build-catalogue-matrix-TH.md
physics-validation-TH.md orbit-background-followup-TH.md soundtrack-offset-fix-TH.md
progress-storage-recovery-TH.md coordination-focused-review-findings.md final-coverage-draft-TH.md
RESUME-CHECKPOINT-TH.md solver-boundary-validation-TH.md final-integration-review-TH.md build-visual-42-validation-TH.md
worksheet-case-editorial-TH.md worksheet-case-export-layout-TH.md editorial-basics-failures-TH.md browser-flight-draft-final-TH.md'''.split()
for name in reports:
    add(f'audit-2026-09-29/{name}')
for name in ['curate-publish-audit.py', 'verify-published-packet.py']:
    add(f'audit-2026-09-29/{name}')
for p in (ROOT / 'audit-2026-09-28').glob('*.md'):
    add(p)

small = '''assessment-th-constant-after.json browser-assessment-path.json browser-assessment-review-dom.txt
browser-audio-validation.json browser-boundary-validation.json browser-build-21-diagrams.json
browser-audio-final4-keyboard-reopen.txt browser-audio-final4-invalid.txt browser-audio-final4-reload-confirmed.txt browser-audio-final4-removed.txt
browser-orbit-narrow-final5.json orbit-narrow-final5-fit.png orbit-narrow-final5-maxzoom.png orbit-narrow-final5-sectors.png orbit-final5-molniya-sectors.png
browser-build-export-selection.json browser-import-evidence.json browser-invalid-mission-link.json
browser-lesson-link.json browser-maneuver-smoke.json browser-monte-carlo-20.json browser-persistence-dom.txt
browser-custom-lesson-language.json
browser-assessment-multi-final6.json browser-flight-draft-final-validation.json
browser-assessment-vehicle-final6.json assessment-vehicle-photo-final6.jpg
browser-key-gating-final6.json browser-maneuver-boundary-final6.json browser-png-keyboard-final6.json
browser-mission-link-roundtrip.json browser-mission-roundtrip.json browser-mission-roundtrip-validation.json browser-build-saved-a-roundtrip.json
browser-replay-600-900-600.json browser-six-element-formats.json build-catalogue-matrix-run-final.txt
build-catalogue-matrix-edge-confirm.txt build-catalogue-matrix-rating-followup.txt
case-export-race-after.json case-export-race-before.json case-export-race-browser-after.json
case-snapshot-acceptance-results.json docx-pagination-after.json docx-pagination-before.json
fingerprint-node22-d01-full-20260929.json fingerprint-node22-d01-full-20260929.log
fingerprint-node22-rigid-flex-20260929.json fingerprint-node22-rigid-flex-20260929.log
fingerprint-node22-probe-20260929.json fingerprint-node22-probe-20260929.log
fingerprint-node24-probe-20260929.json fingerprint-node24-probe-20260929.log
fingerprint-node24-jitless-probe-20260929.json fingerprint-node24-jitless-probe-20260929.log
fleet-inventory.json fleet-results.json fleet-run.log heavy-inventory.json
integrated-focused-results.json integrated-final-regressions.json integrated-final-regressions2.json
integrated-final-regressions4.json integrated-final-regressions4.exit integrated-build-final4.log
integrated-final-regressions5.json integrated-final-regressions5.exit integrated-build-final5.log integrated-build-final5.exit
integrated-final-regressions6.json integrated-final-regressions6.exit integrated-build-final6.log integrated-build-final6.exit
solver-boundary-summary.json solver-boundary-results.json solver-boundary-results-before.json solver-boundary-check.mjs solver-boundary-entry.ts solver-boundary-run-after.txt
learning-bank-compatibility.json learning-bank-final-compatibility.json lessons-sixdof-results.json
mission-result-cursor-regression-20260929.json monte-carlo-job-failures-results.json
orbit-background-depth-results.json progress-storage-recovery-after.json progress-storage-recovery-before.json
reference-overflow-after-fixed-fixture-20260929.json reference-overflow-after-fixed-fixture-20260929.log
ui-assessment-export-validation.json ui-case-export-validation.json
worksheet-language-after.json worksheet-language-before.json
orbitlab-QA-Test-2026-09-29-19-39.orbitlab-results.json orbitlab-QA-Test-2026-09-29-19-56.orbitlab-results.json
orbit-desktop-final.png orbit-mobile-final.png launch-mobile-final.png launch-space-final.png
build-mobile-final.png build-saturn-mobile-final.png orbit-porkchop-final.png lessons-three-cases-saved.png'''.split()
for name in small:
    add(f'audit-2026-09-29/{name}')
for name in ['assessment-systematic-results.json', 'lesson-flight-tests.json', 'lesson-rubric-probes.json', 'assessment-recommendation-probe.json', 'live-evidence.json', 'mobile-build-th.png', 'mobile-watch-th.png']:
    add(f'audit-2026-09-28/{name}')
for folder in ['browser-mission-roundtrip-artifacts', 'browser-build-export-selection']:
    for p in (A / folder).glob('*.json'):
        add(p)
for name in ['manifest.json', 'standard-coverage-union.json', 'standard-failures-focused.json', 'standard-failures-focused.log', 'standard-failures-focused.exit', 'standard-failures-focused-runtime.jsonl', 'heavy-expected-coverage.json', 'heavy-progress-observations.json', 'explore-integration-verification.json']:
    add(f'audit-2026-09-29/cloud-numerical-shards/{name}')
for name in ['README-TH.md', 'artifact-structure-validation.json', 'production-parser-validation.json', 'csv-notation-validation.json', 'chart-regression-snapshot.json', 'orbitlab-altitude-h-km-after-browser.png', 'chart-reconstructed-before.png', 'chart-reconstructed-after.png', 'check-artifact-structure.py', 'check-csv-notation.py', 'check-production-parsers.mjs', 'production-parser-run.txt', 'orbitlab-engineering-massflow-th-final6.png', 'orbitlab-engineering-isp-keyboard-final6.png', 'engineering-png-final6-validation.json']:
    add(f'audit-2026-09-29/browser-export-artifacts/{name}')
for name in ['README.md', 'ci-architecture-diagnosis-TH.md', 'ci-36628517818-summary.json', 'ci-36628517818-failure-excerpt.log', 'ci-count-difference.json', 'architecture-before.json', 'architecture-before.log', 'architecture-before.exit', 'propagator-after.json', 'propagator-after.log', 'propagator-after.exit', 'installed-script-self-check.json', 'script-self-check.json']:
    add(f'audit-2026-09-29/actions-heavy-fallback/{name}')
for name in ['summary.json', 'result.json', 'worker-runtime.jsonl', 'run.log', 'exit.txt']:
    add(f'audit-2026-09-29/actions-heavy-fallback/worker-runtime-probe/{name}')
add('audit-2026-09-29/actions-heavy-results/36631307401/partial-summary.json')
for name in ['vehicle-coverage-union.json', 'partial-union.json', 'monte-carlo-outcomes.json', 'final-summary.json', 'final-union.json', 'final-heavy-acceptance-TH.md', 'actions-collector-excerpt.log', 'collected-heavy/heavy-union.json']:
    add(f'audit-2026-09-29/actions-heavy-results/36631307401/{name}')
for name in ['ci-4cf-standard-summary.json', 'ci-36640538286-final-excerpt.log', 'ci-36640532218-final-excerpt.log', 'ci-36638699357-final-excerpt.log', 'ci-4cf-merge-provenance.json', 'ci-36640538286-browser-smoke-excerpt.log', 'ci-765-standard-summary.json', 'ci-36638705308-final-excerpt.log', 'ci-36637123429-final-excerpt.log', 'ci-36638705308-browser-smoke-excerpt.log', 'ci-c146-standard-summary.json', 'ci-36637128631-final-excerpt.log', 'source-provenance-bridge.json', 'ci-final-standard-summary.json', 'ci-36631307359-final-excerpt.log', 'ci-36631312923-final-excerpt.log', 'ci-36637128631-browser-smoke-excerpt.log']:
    add(f'audit-2026-09-29/actions-heavy-results/{name}')
standard_final = json.loads((A / 'actions-heavy-results/ci-4cf-standard-summary.json').read_text(encoding='utf-8-sig'))
assert standard_final['complete'] and not standard_final['pendingRunIds']
assert standard_final['acceptance']['head'] == '4cf7e3fe6e5ef36bea37a4b1d275d3e56e7dd58c'
assert standard_final['acceptance']['passed'] == standard_final['acceptance']['distinctTests'] == 9259
assert standard_final['acceptance']['distinctFiles'] == 191 and standard_final['acceptance']['failed'] == 0
assert all(standard_final['acceptance'][key] == 0 for key in ('typecheckExit', 'testExit', 'buildExit'))
for p in (A / 'actions-heavy-results/browser-36634805813').rglob('*'):
    if p.is_file() and p.suffix in ('.md', '.txt', '.log', '.png'):
        add(p)
for name in ['worksheet-case-editorial-before.json', 'worksheet-case-editorial-after.json']:
    add(f'audit-2026-09-29/{name}')
for p in (A / 'editorial-audit').iterdir():
    if p.is_file() and p.suffix in ('.json', '.md', '.mjs', '.log', '.exit', '.ps1'):
        add(p)
for name in ['result.json', 'provenance.json', 'worker-runtime.jsonl', 'run.log', 'exit.txt', 'command.json', 'checkpoint.json']:
    add(f'audit-2026-09-29/actions-heavy-results/36631307401/collected-heavy/lessons-sixdof/{name}')
for p in (A / 'browser-build-visual-final6-settled').glob('*.jpg'):
    add(p)
for name in ['capture-manifest.json', 'review-matrix.json', 'independent-review-notes.json', 'hash-reviewed-images.py']:
    add(f'audit-2026-09-29/browser-build-visual-final6-settled/{name}')
for p in (A / 'browser-export-artifacts/editorial-desktop-probe').glob('*'):
    if p.is_file() and p.suffix in ('.html', '.json'):
        add(p)
case_final = A / 'browser-export-artifacts/editorial-layout-final'
case_visual = json.loads((case_final / 'visual-review.json').read_text(encoding='utf-8-sig'))
case_retrieval = json.loads((case_final / 'artifact-retrieval-verification.json').read_text(encoding='utf-8-sig'))
case_text = json.loads((case_final / 'text-content-preserved.json').read_text(encoding='utf-8-sig'))
assert case_visual['visualPassed'] and case_visual['pagesViewed'] == 18 and case_visual['docxCount'] == 12
assert case_retrieval['filesVerified'] == 24 and case_retrieval['apiDigestMatched'] and case_retrieval['allCopiedBytesIdentical']
assert case_text['all24TextContentsIdentical'] and case_visual['sourceSha'] == '4cf7e3fe6e5ef36bea37a4b1d275d3e56e7dd58c'
for p in case_final.iterdir():
    if p.is_file() and p.suffix in ('.html', '.docx', '.json', '.png', '.py'):
        add(p)
for p in (case_final / 'rendered').glob('*/page-*.png'):
    add(p)
for name in ['manifest.json', 'artifact-retrieval-verification.json', 'editorial-render-validation.json', 'editorial-structure-validation.json', 'visual-review.json']:
    add(f'audit-2026-09-29/browser-export-artifacts/editorial-final/{name}')
for stem, pages in [('orbitlab-case-cz5b-th', [1, 2]), ('orbitlab-case-cz5b-ru', [1, 2]), ('orbitlab-case-iridium-ru', [1, 2]), ('orbitlab-case-iridium-th', [1])]:
    for page in pages:
        add(f'audit-2026-09-29/browser-export-artifacts/editorial-final/rendered/{stem}/page-{page}.png')
for name in ['manifest.json', 'render-validation.json']:
    add(f'audit-2026-09-29/browser-export-artifacts/editorial-layout-local/{name}')
for name in ['case-export-layout-focused-validation.json', 'case-export-layout-focused-after.log', 'case-export-layout-typecheck.log', 'case-export-layout-build.log', 'docx-numeric-pagination-before.log', 'encounter-labels-before.log']:
    add(f'audit-2026-09-29/{name}')
for folder in ['docx-language-after', 'docx-after-pagination']:
    for p in (A / 'browser-export-artifacts' / folder).iterdir():
        if p.is_file() and p.suffix in ('.png', '.json'):
            add(p)
for p in (A / 'browser-export-artifacts/docx-language-after').iterdir():
    if p.is_file() and p.suffix in ('.html', '.docx'):
        add(p)
for name in ['manifest.json', 'before-language-fix-validation.json', 'worksheets-th-1.png']:
    add(f'audit-2026-09-29/browser-export-artifacts/docx-multilang-final/{name}')
for name in ['manifest.json', 'parser-validation.json']:
    add(f'audit-2026-09-29/browser-fixtures/boundaries/{name}')
for p in (A / 'browser-fixtures').iterdir():
    if p.is_file() and (p.name.startswith(('verify-', 'after-race-', 'before-race-')) or p.name in ['generate-boundaries.py', 'validate-boundaries.mjs', 'custom-lesson.json', 'valid-reference.orbitlab-flight.json', 'reference-overflow.json', 'valid-cdm-alfano-1.cdm']):
        add(p)

# Copy Markdown-link targets recursively. Absolute workspace links become portable.
link = re.compile(r'\[([^\]]*)\]\(([^)]+)\)')
seen = set()
while True:
    todo = [p for p in selected if p.suffix == '.md' and p not in seen]
    if not todo:
        break
    for p in todo:
        seen.add(p)
        content = p.read_text(encoding='utf-8-sig')
        for _, target in link.findall(content):
            target = unquote(target.strip('<>').split('#', 1)[0])
            if not target or target.startswith(('http:', 'https:', 'mailto:', 'codex:', 'app:')):
                continue
            q = local_target(p.parent, target)
            if q.is_file() and q.is_relative_to(ROOT) and not any(x in q.parts for x in ('source', 'source-integrated', 'node_modules', 'publish-audit-final')) and q.stat().st_size <= 1_000_000:
                selected.add(q)
            else:
                keep_local(q, f'Linked by {p.relative_to(ROOT).as_posix()}; not bundled')

for p in sorted(selected):
    dest = OUT / p.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if p.suffix == '.md':
        content = p.read_text(encoding='utf-8-sig')
        def rewrite(match):
            label, target = match.groups()
            if target.startswith(('http:', 'https:', 'mailto:', 'codex:', 'app:', '#')):
                return match.group(0)
            q = local_target(p.parent, target)
            if q in selected:
                return f'[{label}]({Path(os.path.relpath(q, p.parent)).as_posix()})'
            if q.is_relative_to(ROOT):
                index_rel = Path(os.path.relpath(OUT / 'LOCAL-EVIDENCE-INDEX.md', dest.parent)).as_posix()
                return f'[{label}]({index_rel}) (local-only: `{q.relative_to(ROOT).as_posix()}`)'
            return match.group(0)
        updated = link.sub(rewrite, content)
        if updated != content:
            dest.write_text(updated, encoding='utf-8')
            transformed[p.relative_to(ROOT).as_posix()] = 'Portable relative Markdown links; omitted source links explicitly redirected to local-only index; substantive report text unchanged'
        else:
            shutil.copyfile(p, dest)
    else:
        shutil.copyfile(p, dest)

# Keep a compact Build result including counts/provenance/known rating limitation.
matrix_path = A / 'build-catalogue-matrix-results.json'
matrix = json.loads(matrix_path.read_text(encoding='utf-8-sig'))
summary = {k: v for k, v in matrix.items() if k != 'rows'}
summary['rawEvidence'] = {'path': matrix_path.relative_to(ROOT).as_posix(), 'bytes': matrix_path.stat().st_size, 'sha256': sha(matrix_path), 'rowsOmitted': len(matrix['rows']), 'availability': 'local-only; see LOCAL-EVIDENCE-INDEX.md'}
summary_rel = 'audit-2026-09-29/build-catalogue-matrix-summary.json'
(OUT / summary_rel).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
derived[summary_rel] = 'Copied all top-level fields from raw matrix except6542 rows; raw SHA256 retained'

# Large raw exports, reconstructed bundles and test fixtures remain local.
for p in (A / 'browser-export-artifacts').rglob('*'):
    if p.is_file() and not any(x in p.parts for x in ('lo-profile', '__pycache__')):
        keep_local(p, 'Raw export/render or older evidence omitted from compact publication; validation/manifests included where selected')
for p in (A / 'browser-fixtures/boundaries').iterdir():
    if p.is_file():
        keep_local(p, 'Synthetic boundary input; do not add30MiB/2MiB fixtures to repository')
for pattern in ['*.patch', '*.zip', 'heavy-run.log', 'build-catalogue-matrix-results.json', 'build-catalogue-matrix-run.txt']:
    for p in A.glob(pattern):
        keep_local(p, 'Large or historical raw evidence; compact report/provenance retained')
for p in (A / 'cloud-numerical-shards').rglob('*'):
    if p.is_file() and 'recovered-' in p.as_posix() and p.suffix in ('.json', '.log', '.md', '.jsonl'):
        keep_local(p, 'Recovered nested Cloud evidence; final unique union/provenance included without duplicate snapshots')
for p in (A / 'actions-heavy-results').rglob('*'):
    if p.is_file():
        keep_local(p, 'GitHub Actions raw result/log/archive retained locally; the selected summary and provenance are included in this packet')

local_rel = 'local-only-evidence.json'
(OUT / local_rel).write_text(json.dumps({'scope': 'Files retained only in original local workspace; not included in this publication packet', 'rootHint': 'Original Orbitlab workspace; paths below are relative to it', 'files': [{'path': k, **v} for k, v in sorted(local_only.items())]}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
derived[local_rel] = 'Local-only file inventory with SHA256, not copied file contents'

index = '''# ดัชนีหลักฐานที่เก็บเฉพาะในเครื่อง

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
'''
(OUT / 'LOCAL-EVIDENCE-INDEX.md').write_text(index, encoding='utf-8')
derived['LOCAL-EVIDENCE-INDEX.md'] = 'Publication availability index'

final = json.loads((A / 'integrated-final-regressions6.json').read_text(encoding='utf-8-sig'))
assert final['success'] and final['numFailedTests'] == 0
assert (A / 'integrated-final-regressions6.exit').read_text(encoding='utf-8-sig').strip() == '0'
assert (A / 'integrated-build-final6.exit').read_text(encoding='utf-8-sig').strip() == '0'
heavy = json.loads((A / 'actions-heavy-results/36631307401/final-summary.json').read_text(encoding='utf-8-sig'))
assert heavy['complete'] and heavy['independentCollectorMatchesActions'] and heavy['passed'] == 246 and heavy['files'] == 27 and heavy['failed'] == 0
editorial = json.loads((A / 'editorial-audit/final-focused.json').read_text(encoding='utf-8-sig'))
assert editorial['success'] and editorial['numPassedTests'] == 165 and editorial['numFailedTests'] == 0
editorial_runtime = json.loads((A / 'editorial-audit/final-runtime.json').read_text(encoding='utf-8-sig'))
assert all(editorial_runtime[k] == 0 for k in ('testExit', 'typecheckExit', 'buildExit'))
generated = datetime.now(timezone.utc).isoformat()
readme = f'''# Orbitlab: ชุดรายงานและหลักฐานที่คัดสำหรับเผยแพร่

ชุดนี้รวบรวมผลตรวจและการแก้ข้อผิดพลาดตามคำขอ โดยแยกงานพัฒนาใหม่ไว้เป็นข้อเสนอ เริ่มอ่านที่ [รายงานตรวจรับรวม](audit-2026-09-29/Orbitlab-acceptance-TH.md) แล้วตรวจหลักฐานรายเส้นทางใน [รายการ C01–C34](audit-2026-09-29/import-export-checklist-TH.md) รายงานต้นฉบับยังคงประวัติไว้ใน [ฉบับวันที่ 28 กันยายน พร้อมส่วนติดตาม](audit-2026-09-28/Orbitlab-audit-TH.md)

งานอยู่ใน [PR #41](https://github.com/ROYIN001/Orbitlab/pull/41) และ [branch codex/audit-acceptance](https://github.com/ROYIN001/Orbitlab/tree/codex/audit-acceptance) งานรวมใช้ checkout `source-integrated` แยกจาก `source` เดิมที่เก็บไว้ ไม่ได้นำ final changes ไปเขียนทับ checkout เก่า

**ผลล่าสุด:** source สุดท้าย `4cf7e3f` ผ่าน standard CI **9,259/9,259 รายการใน 191 ไฟล์** ทั้ง PR และ push พร้อม typecheck/build บน Node 22.23.3 ส่วน heavy ผ่านครบ **{heavy['passed']}/{heavy['tests']} ใน {heavy['files']}/27 ไฟล์** บนฐาน numerical `0b844f7` มีการบินอ้างอิงครบ **21 รุ่น** และบทเรียน 6-DOF รันใหม่ผ่าน **7/7** อ่านความหมายครบ **ข้อสอบ 157 ข้อ + บทเรียน 24 บท** แล้ว Browser acceptance ผ่าน **4/4 เส้นทาง** บน `9737f21`; รุ่นสุดท้ายผ่าน smoke ใหม่ **3/3** และ case exports **24 ไฟล์ / 12 DOCX / 18 หน้าที่ตรวจภาพครบ**

การแก้ข้อความถึง `76534dc1` รวม **60 strings ใน 11 production files** มี AST อื่นเท่าเดิมเฉพาะรอบข้อความนี้ โดยรอบเนื้อหา 57 strings ผ่าน focused **165/165 ใน 13 ไฟล์** พร้อม typecheck/build exit 0 บน Node 22.23.3 การทดสอบ 165 นี้ใช้ working changes ที่ commit ต่อเป็น `c146a699`; ต่อมา `76534dc1` แก้ status export เพิ่ม 3 strings และผ่าน focused **29/29** กับ build exit 0 แยกใน [หลักฐาน status wording](audit-2026-09-29/editorial-audit/status-wording-tests.json) ส่วน `4cf7e3f` แก้ rendering/layout สองไฟล์ภายหลังและผ่าน full CI **9,259/9,259** แล้ว ไม่อยู่ในคำอ้าง AST text-only ของรอบก่อน จัดชุดเวลา UTC `{generated}` การตรวจใน local preview และ CI ไม่ใช่หลักฐานว่าเว็บสาธารณะได้รับการ deploy แล้ว

| สิ่งที่ทำเสร็จ | ผลที่ตรวจได้ |
|---|---|
| แก้บั๊กบทเรียน แบบประเมิน และการเก็บข้อมูล | รักษาคำตอบเมื่อเปลี่ยนภาษา คืนรูปในหน้า review แก้เงื่อนไข rubric ที่ขัดกับโจทย์ และสำรองข้อมูล progress ที่อ่านไม่ได้ก่อนเขียนข้อมูลที่กู้กลับ ดู [รายงานรวม](audit-2026-09-29/Orbitlab-acceptance-TH.md) และ [การกู้ progress](audit-2026-09-29/progress-storage-recovery-TH.md) |
| แก้การส่งออกและกราฟิก | ชื่อไฟล์ตรงกรณีศึกษาเมื่อสลับเมนูเร็ว ใบงานคงภาษาเมื่อสลับ TH → RU ระหว่างรอส่งออก ตัวเลือกไม่แยกกลางข้อ กราฟ PNG อ่านป้ายได้ และภาพวงโคจรแสดงบนจอแคบได้ ดู [ใบงาน 8 ไฟล์และ 8 หน้าที่ตรวจ](audit-2026-09-29/browser-export-artifacts/docx-language-after/render-validation.json) และ [PNG จากการคลิกและแป้นพิมพ์](audit-2026-09-29/browser-export-artifacts/engineering-png-final6-validation.json); case exports รุ่นสุดท้าย [24 ไฟล์/18 หน้าผ่าน](audit-2026-09-29/worksheet-case-export-layout-TH.md) รวม workbox และป้าย 3σ ที่แก้ท้ายรอบ |
| ตรวจเส้นทางใช้งานจริง | กรณีศึกษา 3 บทผ่านการบันทึก เปิดใหม่ และส่งออก; [flight numeric/hint/language/focus](audit-2026-09-29/browser-flight-draft-final-TH.md) ตัวอย่างบท 1.1 ผ่านโดยคง raw text/caret; assessment ตอบตัวแทนครบ 5 รูปแบบ รวม multi และภาพ Starship โดยรักษา draft ข้ามภาษา; mission ผ่านไฟล์และลิงก์; Build แยกแบบบันทึกกับ draft ถูกต้อง; การปิดเฉลยตรวจเฉพาะ active Iridium และกรณียังไม่มีเที่ยวบินที่จบ ดู [C01–C34](audit-2026-09-29/import-export-checklist-TH.md) |
| ตรวจภาพ Build ครบ catalogue | เปิดดูภาพต้นฉบับครบ 21 แบบ × 2 โหมด รวม 42/42 ภาพที่เก็บหลัง animation จบ บน desktop 1280×720 ภาษาอังกฤษ ธีมมืด ไม่พบภาพว่าง ชิ้นส่วนหลุดกรอบ หรือป้ายอ่านไม่ได้ในขอบเขตที่ตรวจ ดู [รายงานและภาพทั้ง 42](audit-2026-09-29/build-visual-42-validation-TH.md) |
| แก้ข้อผิดพลาดเชิงตัวเลขที่ยืนยันได้ | Kepler ใกล้ e = 1 ผ่านชุดขอบเขต 108/108; Lambert คืนคำตอบ 72 กรณีและผ่านการตรวจ residual ทั้ง 72 ส่วน 48 กรณีที่คืน null ยังไม่ถือว่าพิสูจน์การไม่มีคำตอบ ดู [รายงาน solver](audit-2026-09-29/solver-boundary-validation-TH.md) |
| ตรวจความถดถอยหลังรวมการแก้ | [final6 JSON](audit-2026-09-29/integrated-final-regressions6.json) ผ่านทั้งหมดและ [build log](audit-2026-09-29/integrated-build-final6.log) จบด้วย exit 0; [การอ่าน diff รอบสุดท้าย](audit-2026-09-29/final-integration-review-TH.md) แยกจากการทดสอบจริง |

ผลที่ปิดช่องว่างเดิมและตรวจย้อนกลับได้:

- [Standard CI ของ source สุดท้าย](audit-2026-09-29/actions-heavy-results/ci-4cf-standard-summary.json): PR และ exact-head push บน `4cf7e3f` ผ่าน **9,259/9,259 ใน 191 ไฟล์** ทั้งคู่ บน Node 22.23.3 พร้อม typecheck/build; [PR log](audit-2026-09-29/actions-heavy-results/ci-36640538286-final-excerpt.log) และ [push log](audit-2026-09-29/actions-heavy-results/ci-36640532218-final-excerpt.log) ระบุ checkout และผลจริง รอบก่อน `76534dc1`, `c146a699` และ `0b844f7` ผ่าน 9,241/9,241 แยกไว้ในหลักฐาน ไม่บวกยอดรันซ้ำ
- [Browser acceptance](audit-2026-09-29/actions-heavy-results/browser-36634805813/audit-browser-logs/summary.md): launch-explore, mobile-smoke, pwa-offline และ watch-controls ผ่านครบ 4/4 บน `9737f21`; หลัง rendering รุ่นสุดท้าย `4cf7e3f` มี [smoke ใหม่ 3/3](audit-2026-09-29/actions-heavy-results/ci-36640538286-browser-smoke-excerpt.log) ผ่านอีกครั้ง แยกจาก full browser สี่เส้นทาง
- [Vehicle union](audit-2026-09-29/actions-heavy-results/36631307401/vehicle-coverage-union.json): 22 tests ครอบคลุม 21 รุ่นจริง แยกจาก fleet163 เดิมที่มี 18 รุ่น ไม่หมายถึงทุกภารกิจ on target
- [7 บท 6-DOF](audit-2026-09-29/actions-heavy-results/36631307401/collected-heavy/lessons-sixdof/result.json): รันใหม่ 7/7 ผ่านบน `0b844f7` และ worker Node 22.22.2 เป็น headless ไม่ใช่ browser 7 บท
- [Editorial bank 157 ข้อ](audit-2026-09-29/editorial-audit/bank-editorial-review-TH.md): อ่าน 926 triples / 2,778 strings ครบทุก prompt/options/misconceptions/explanations; [24 บทเรียน](audit-2026-09-29/editorial-audit/lesson-editorial-review-TH.md) อีก 528 strings พร้อม track labels 36 strings และ [ใบงานกรณีศึกษา](audit-2026-09-29/worksheet-case-editorial-TH.md) 99 keys / 297 strings
- [Focused หลังแก้ข้อความ](audit-2026-09-29/editorial-audit/final-focused.json) ผ่าน 165/165 และ [runtime/build/typecheck](audit-2026-09-29/editorial-audit/final-runtime.json) สำเร็จ รอบแรก 164/165 เก็บไว้โดยไม่ลบ: assertion ของ V1 fixture เทียบกับข้อความ builtin ใหม่ทั้งที่ parser รักษาข้อความเก่าถูกต้อง จึงแก้ test ให้เทียบต้นฉบับและคง exact roundtrip ไม่แก้ fixture/golden

[Heavy Actions จบครบแล้ว](audit-2026-09-29/actions-heavy-results/36631307401/final-heavy-acceptance-TH.md): [final union](audit-2026-09-29/actions-heavy-results/36631307401/final-union.json) ไม่มี missing/duplicate/skipped/failed ทุกไฟล์ exit 0, actual workers Node 22.22.2, source `0b844f7` การตรวจอิสระตรงกับ collector บน Actions ไม่เปลี่ยน golden เพื่อให้ผ่าน MC 170 เที่ยวบินมี 142 ตรงเป้า, 10 เข้าวงโคจรแต่คลาดเป้า และ 18 สูญเสียตาม [outcomes](audit-2026-09-29/actions-heavy-results/36631307401/monte-carlo-outcomes.json) จึงไม่ใช้ test ผ่านรับรองทุกเที่ยวบินหรือข้อมูลโลกจริง

การตรวจรับรอบนี้ปิดครบแล้ว ไม่มีผล CI ที่ยังรอ ส่วน [case exports หลังแก้ layout](audit-2026-09-29/worksheet-case-export-layout-TH.md) ยืนยัน **24 ไฟล์จริง / 12 DOCX / 18 หน้า** บน source `4cf7e3f` ตรวจ hashes และเปิดภาพครบทุกหน้า ผ่านทั้งหมด ข้อความเหมือนก่อนแก้ 24/24 ไฟล์ ดู [visual review](audit-2026-09-29/browser-export-artifacts/editorial-layout-final/visual-review.json) งานพัฒนาที่เสนอไว้และข้อจำกัดด้านอุปกรณ์จริงยังแยกตามรายงาน

เก็บความผิดพลาดก่อนแก้ไว้แยก: desktop ได้ไฟล์เดียวแล้วรายการถัดไปไม่มีไฟล์แม้ UI เดิมแจ้ง saved จึงไม่ใช้ป้ายสถานะรับรอง disk save; Actions รุ่น `277f41d` ดาวน์โหลด 24 ไฟล์ได้จริงและเนื้อหาผ่าน แต่พบ workbox แยกหน้า 3 จุดกับป้าย 3σ ทับ Cosmos 2251 ใน TH/RU ชุดก่อนแก้นี้ไม่ถูกเรียกว่าผ่าน layout ผลหลังแก้ใช้ Chromium ดาวน์โหลดจริงและ LibreOffice/Poppler ตรวจภาพ ไม่ใช่การรับรองทุกเวอร์ชันของ Word/Google Docs หรือการพิมพ์ HTML ทุก browser

ผลเก่าเก็บแยกเพื่อไม่ให้ตัวเลขชวนเข้าใจผิด: Cloud standard เดิมผ่าน 2,542 และไม่ผ่าน 2 จาก 2,544 รายการ; GitHub CI รอบก่อนผ่าน 9,187/9,188 โดยรายการเดียวที่ไม่ผ่านเป็นตัวตรวจ import type ใน architecture test ซึ่งแก้แล้วและทดสอบไฟล์นั้นแยกผ่าน 26/26 ผลรันซ้ำเหล่านี้ไม่ถูกบวกเป็นยอด unique ใหม่ ดู [ที่มาและการรับช่วง CI](audit-2026-09-29/actions-heavy-fallback/ci-architecture-diagnosis-TH.md)

ข้อเสนอที่ยังไม่ลงมือ ได้แก่ การเพิ่มหรือเปลี่ยนนโยบาย rubric การเปิดเฉลย การรับรองคุณภาพข้อสอบด้วยสถิติ และการขยายความสามารถ solver ที่ยังไม่มีคำตอบ ส่วนอุปกรณ์จริงหลายรุ่น การฟังและซิงก์เสียง การตรวจ screen reader เต็มรูปแบบ และการเทียบข้อมูลติดตามจริง ยังมีข้อจำกัดตามรายงาน การอ่านความหมายครบ 157 ข้อครั้งนี้ไม่ใช่การรับรองโดยคณะบรรณาธิการมนุษย์หรือคุณภาพข้อสอบทางสถิติ และผล QA ไม่ใช่คะแนนเจ้าของเว็บ

ไฟล์ขนาดใหญ่และต้นฉบับบางรายการคงไว้ในเครื่องเดิม โดยมีขนาดและ SHA256 ใน [ดัชนีหลักฐานเฉพาะในเครื่อง](LOCAL-EVIDENCE-INDEX.md) ชุดเผยแพร่ไม่รวม fixture ขนาด 30 MiB, node_modules, checkout ซ้อน หรือ CSV ที่ซ้ำกัน `artifact-manifest.json` ระบุเส้นทางสัมพัทธ์ ขนาด และ SHA256 ของทุกไฟล์ ส่วน `SHA256SUMS` รวม manifest ด้วย และ `.gitattributes` ภายในชุดนี้ปิดการเปลี่ยน line endings เฉพาะไฟล์หลักฐาน เพื่อรักษาไบต์และ SHA256 เมื่อนำเข้า Git โดยไม่เปลี่ยนกติกา source ของผลิตภัณฑ์ รายงาน checkpoint และบันทึกเก่าต้องอ่านคู่สถานะล่าสุดข้างต้น

รุ่นข้อความและสถานะคือ `76534dc1d171726cb3d5eadc82d1ac77b629376b` ซึ่งเปลี่ยนเพียง status export อีก 3 strings จาก `277f41d`; รุ่น `277f41d` เพิ่ม browser journey/workflow และมี production source เหมือน `c146a699` ทุกไบต์ ข้อความภายใน worksheet exports ไม่เปลี่ยนโดย status fix ผล numerical acceptance มาจาก `0b844f7`; ความสัมพันธ์ของแต่ละ source อยู่ใน [source provenance](audit-2026-09-29/actions-heavy-results/source-provenance-bridge.json) และ manifest ไม่เหมารวมว่าผลทุกชุดรันบน HEAD ล่าสุดโดยตรง

Source สุดท้ายคือ `4cf7e3fe6e5ef36bea37a4b1d275d3e56e7dd58c` เพิ่มการแก้สองไฟล์ rendering/layout และ tests สองไฟล์หลัง `76534dc1` เทียบ diff แล้ว ellipse/radius/simulation source คงเดิม แต่เป็นการเปลี่ยน code จึงไม่อยู่ในคำอ้าง text-only AST 60 strings ของรอบก่อน

การทดสอบผลิตภัณฑ์ให้ checkout source commit ที่ต้องการจาก repository ใช้ Node 22 ตาม runtime ของผลอ้างอิง และรันคำสั่งต่อไปนี้ **จาก root ของ repository ผลิตภัณฑ์** ไม่ใช่จากโฟลเดอร์รายงาน:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:heavy
```

`npm run test:heavy` เป็นชุดที่ใช้เวลานาน หากต้องทำซ้ำรูปแบบ GitHub Actions ให้ใช้ workflow และ `scripts/audit-heavy/` ที่อยู่ใน repository commit นั้น ซึ่งบันทึก exact source SHA, runtime ของ worker และคำสั่งจริงไว้แล้ว [หลักฐาน heavy](audit-2026-09-29/actions-heavy-results/36631307401/final-summary.json) จึงเป็นจุดอ้างอิง provenance ไม่ใช้เวลารันหรือจำนวนผ่านของเครื่องหนึ่งรับรองอีกเครื่องโดยอัตโนมัติ

สคริปต์ในชุด **evidence** เช่น `editorial-audit/extract-bank.mjs`, `extract-lessons.mjs`, `verify-text-only.mjs` และ helper บางชุดยังอ้างตำแหน่ง `../source-integrated` หรือเครื่องมือ/ไฟล์ใน workspace เดิม เก็บไว้เพื่ออธิบายและตรวจย้อนกลับวิธีทำ ไม่ได้อ้างว่าเป็นแพ็กเกจ standalone ที่ย้ายโฟลเดอร์แล้วรันทุกสคริปต์ได้ทันที ให้ใช้ source/runtime ที่ระบุและปรับ path ให้ตรงโครงสร้างจริงก่อนทำซ้ำ โดยคงผลเดิมและ SHA256 ไว้

หากต้องการตรวจเฉพาะความครบและแฮชของชุดรายงานนี้ สามารถใช้สคริปต์ที่ไม่พึ่ง source checkout โดยรันจาก root ของชุดรายงาน: `python audit-2026-09-29/verify-published-packet.py .` คำสั่งนี้ตรวจไฟล์ แฮช และลิงก์ภายใน ไม่รันทดสอบผลิตภัณฑ์และไม่ยืนยันข้อเท็จจริงแทนหลักฐานต้นทาง

ชุด case final มี 24 HTML/DOCX และ 18 PNG ครบในโฟลเดอร์ `editorial-layout-final` ส่วนชุดก่อนแก้ `editorial-final` เก็บเฉพาะ metadata และภาพแสดงข้อผิดพลาด 7 หน้าใน packet; metadata ของ before ยังบันทึกการตรวจเดิมครบ 18 หน้า ไฟล์ที่ไม่ได้คัดให้ใช้ [ดัชนี local-only](LOCAL-EVIDENCE-INDEX.md) ไม่สมมติว่าทุก path ใน JSON ของรอบก่อนมีไฟล์แนบอยู่ด้วย

ภาพ mission ใบงานชุดก่อนหน้าที่ตรวจ: [TH หน้า 1](audit-2026-09-29/browser-export-artifacts/docx-language-after/worksheets-th-1.png), [TH หน้า 2](audit-2026-09-29/browser-export-artifacts/docx-language-after/worksheets-th-2.png), [TH หน้า 3](audit-2026-09-29/browser-export-artifacts/docx-language-after/worksheets-th-3.png), [เฉลย TH](audit-2026-09-29/browser-export-artifacts/docx-language-after/key-th-1.png), [RU หน้า 1](audit-2026-09-29/browser-export-artifacts/docx-language-after/worksheets-ru-1.png), [RU หน้า 2](audit-2026-09-29/browser-export-artifacts/docx-language-after/worksheets-ru-2.png), [RU หน้า 3](audit-2026-09-29/browser-export-artifacts/docx-language-after/worksheets-ru-3.png), [เฉลย RU](audit-2026-09-29/browser-export-artifacts/docx-language-after/key-ru-1.png)
'''
(OUT / 'README-TH.md').write_text(readme, encoding='utf-8')
derived['README-TH.md'] = 'Final publication entrypoint verified from standard9259 at source4cf, heavy246 at numerical0b, browser4 at9737, latest smoke3, editorial165, actual case24 downloads and 18 visual pages; no pending acceptance CI'

# Validate local Markdown links in the whole packet, not merely the entrypoint.
broken = []
checked = 0
for p in OUT.rglob('*.md'):
    for _, target in link.findall(p.read_text(encoding='utf-8-sig')):
        target = unquote(target.strip('<>').split('#', 1)[0])
        if not target or target.startswith(('http:', 'https:', 'mailto:', 'codex:', 'app:')):
            continue
        checked += 1
        q = (p.parent / target).resolve()
        if not q.is_file() or not q.is_relative_to(OUT):
            broken.append({'file': p.relative_to(OUT).as_posix(), 'target': target})
(OUT / 'link-validation.json').write_text(json.dumps({'markdownLinksChecked': checked, 'broken': broken, 'scope': 'Markdown links and image targets; code-span raw evidence paths documented in local-only index'}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
derived['link-validation.json'] = 'Link resolution check for this publication packet'
if broken:
    raise RuntimeError(json.dumps(broken, ensure_ascii=False))

entries = []
for p in sorted(OUT.rglob('*')):
    if p.is_file() and p.name not in ('artifact-manifest.json', 'SHA256SUMS'):
        rel = p.relative_to(OUT).as_posix()
        row = {'path': rel, 'bytes': p.stat().st_size, 'sha256': sha(p)}
        source = ROOT / rel
        if source.is_file() and source in selected:
            row.update(sourceRelativePath=rel, sourceSha256=sha(source), copy='transformed Markdown links' if rel in transformed else 'byte-identical')
            if rel not in transformed and row['sha256'] != row['sourceSha256']:
                raise RuntimeError(f'Source changed while curating: {rel}; retry after the writer is finished')
        else:
            row['derivation'] = derived.get(rel, 'Generated publication metadata')
        entries.append(row)
manifest = {'generatedAtUTC': generated, 'status': 'Final acceptance packet; standard9259 at4cf/heavy246 at0b/browser4 at9737/latest smoke3/editorial165/status29/graphics42 verified; actual case24 downloads and 18 visual pages verified; no pending acceptance CI; deployment is separate', 'productionBaseAtCuration': '0b844f77f5f0ffdeb7274642ddf74a57c2ee230b', 'textFollowupCommit': 'c146a699f01bb5d299af39e3ca9742445442b474', 'reviewedRepositoryHead': '4cf7e3fe6e5ef36bea37a4b1d275d3e56e7dd58c', 'statusWordingCommit': '76534dc1d171726cb3d5eadc82d1ac77b629376b', 'caseExportBeforeCommit': '277f41dd6cbd46d1b03d97bcc060258ec8c7554a', 'caseExportAcceptanceCommit': '4cf7e3fe6e5ef36bea37a4b1d275d3e56e7dd58c', 'files': entries, 'fileCountExcludingThisManifestAndSums': len(entries), 'bytesExcludingThisManifestAndSums': sum(x['bytes'] for x in entries), 'transformedReports': transformed, 'localOnlyIndex': 'local-only-evidence.json', 'excluded': ['node_modules', 'source checkouts', 'dist/generated bundles', 'LibreOffice profiles/caches', 'large raw exports', '30MiB/2MiB boundary fixtures', 'nested recovered duplicate snapshots', 'synthetic collector fixtures']}
(OUT / 'artifact-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
all_files = sorted(p for p in OUT.rglob('*') if p.is_file() and p.name != 'SHA256SUMS')
(OUT / 'SHA256SUMS').write_text(''.join(f'{sha(p)}  {p.relative_to(OUT).as_posix()}\n' for p in all_files), encoding='utf-8')
print(json.dumps({'destination': str(OUT), 'files': len(all_files) + 1, 'bytes': sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file()), 'markdownLinksChecked': checked, 'brokenLinks': len(broken), 'localOnlyFiles': len(local_only)}))
