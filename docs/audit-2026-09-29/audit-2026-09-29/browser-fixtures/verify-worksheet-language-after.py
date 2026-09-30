import json, re, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

folder = Path(__file__).resolve().parents[1] / 'browser-export-artifacts/docx-language-after'
rows = []
for path in sorted(folder.glob('*QAFINAL4*')):
    if path.suffix not in ('.docx', '.html'):
        continue
    lang = path.stem.rsplit('-', 1)[1]
    key = path.name.startswith('orbitlab-key-')
    if path.suffix == '.docx':
        with zipfile.ZipFile(path) as z:
            xml = ET.fromstring(z.read('word/document.xml'))
        content = '\n'.join(n.text or '' for n in xml.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'))
    else:
        content = re.sub('<[^>]+>', ' ', path.read_text(encoding='utf-8'))
    expected = (['ชื่อ:', 'รหัส:', 'เฉลย'] if key else ['ชื่อ:', 'รหัส:', 'วันที่:', 'คำตอบ:', 'วิธีทำ']) if lang == 'th' else (['Фамилия, имя:', 'Код:', 'Ключ ответов'] if key else ['Фамилия, имя:', 'Код:', 'Дата:', 'Ответ:', 'Решение'])
    forbidden = ['Фамилия, имя:', 'Код:', 'Ответ:', 'Решение', 'для учебных целей'] if lang == 'th' else ['ชื่อ:', 'รหัส:', 'คำตอบ:', 'วิธีทำ']
    checks = {f'contains:{label}': label in content for label in expected}
    checks.update({f'absent:{label}': label not in content for label in forbidden})
    rows.append({'name': path.name, 'lang': lang, 'checks': checks, 'passed': all(checks.values())})
assert len(rows) == 8 and all(row['passed'] for row in rows), rows
result = {
    'source': 'Actual browser4181 Downloads QAFINAL4, copied unchanged; SHA256 in manifest.json',
    'race': 'Root triggered TH DOCX at23:35:24 then immediately switched UI toRU; download completed23:35:31 Europe/Moscow',
    'files': rows,
    'render': {'converter': 'LibreOffice26.8.0.3 headless exit0; Poppler100dpi', 'docxFiles': 4, 'pages': 8, 'visualInspection': 'All8 PNG pages viewed: TH/RU worksheets3pages each and keys1page each. Generic labels, footer and title match requested language. Every displayed question/options block remains together. No clipped glyphs or text observed.', 'limitations': 'This is one browser-generated flight worksheet draw in each language and one LibreOffice rendering environment; not every Word version or all question draws.'},
    'passed': True,
}
(folder / 'render-validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'files': len(rows), 'pages': 8, 'passed': True}))
