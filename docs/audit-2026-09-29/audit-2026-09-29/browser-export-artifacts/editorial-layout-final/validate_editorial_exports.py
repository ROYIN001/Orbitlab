"""Read-only validation/rendering of actual browser downloads; never edits a DOCX.

Run after the parent copies 24 case exports here. The result explicitly leaves
visual acceptance pending until a reviewer opens every generated page image.
"""
import argparse
import hashlib
import html
import json
import re
import subprocess
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

HERE = Path(__file__).resolve().parent
AUDIT = HERE.parents[1]
RUNTIME = Path('C:/Users/Royin/.cache/codex-runtimes/codex-primary-runtime/dependencies')
SOFFICE = Path('C:/Program Files/LibreOffice/program/soffice.exe')
POPPLER = RUNTIME / 'native/poppler/Library/bin'
NS = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
PATTERN = re.compile(r'orbitlab-case-(iridium|cz5b|theos2)(-key)?-(th|ru)(?: \(\d+\))?\.(html|docx)$')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--render', action='store_true')
    args = parser.parse_args()
    before = json.loads((AUDIT / 'worksheet-case-editorial-before.json').read_text(encoding='utf-8'))
    after = json.loads((AUDIT / 'worksheet-case-editorial-after.json').read_text(encoding='utf-8'))
    result = {'checkedAtUTC': datetime.now(timezone.utc).isoformat(), 'source': 'Actual Chromium downloads retrieved from GitHub Actions run 36640532239 and copied byte-for-byte after SHA verification; see artifact-retrieval-verification.json.', 'files': [], 'render': [], 'visualAcceptance': 'pending: each rendered page must be opened by reviewer'}
    pairs = set()
    for path in sorted(HERE.iterdir()):
        match = PATTERN.fullmatch(path.name)
        if not match:
            continue
        case, is_key, lang, kind = match.groups()
        is_key = bool(is_key)
        identity = (case, is_key, lang, kind)
        assert identity not in pairs, f'Duplicate export {identity}'
        pairs.add(identity)
        if kind == 'docx':
            with zipfile.ZipFile(path) as archive:
                xml = ET.fromstring(archive.read('word/document.xml'))
            content = '\n'.join(n.text or '' for n in xml.iter(NS + 't'))
        else:
            content = html.unescape(re.sub('<[^>]+>', ' ', path.read_text(encoding='utf-8')))
        text = lambda key: after['dictionaries'][lang][key]['text']
        required = ['ws.name', 'ws.code'] + ([] if is_key else ['ws.date', 'ws.answer', 'ws.working'])
        checks = {f'contains:{key}': text(key) in content for key in required}
        checks['title'] = text(f'wsc.{case}.title') in content
        checks['correctScript'] = bool(re.search('[ก-๙]' if lang == 'th' else '[А-Яа-яЁё]', content))
        checks['noOtherLanguageScript'] = not re.search('[А-Яа-яЁё]' if lang == 'th' else '[ก-๙]', content)
        changed = {
            ('iridium', False): 'wsc.iridium.why.b',
            ('cz5b', False): 'wsc.cz5b.qIntro',
            ('cz5b', True): 'wsc.cz5b.w.error',
            ('theos2', True): 'wsc.theos2.w.j2',
        }.get((case, is_key))
        if changed:
            checks[f'newEditorialText:{changed}'] = text(changed) in content
            checks[f'oldEditorialTextAbsent:{changed}'] = before['dictionaries'][lang][changed]['text'] not in content
        row = {'file': path.name, 'case': case, 'key': is_key, 'lang': lang, 'format': kind, 'bytes': path.stat().st_size, 'sha256': sha(path), 'checks': checks, 'passed': all(checks.values())}
        result['files'].append(row)
    assert len(pairs) == 24, f'Expected 24 distinct exports, got {len(pairs)}'
    assert all(row['passed'] for row in result['files']), result['files']
    result['structureAndLanguagePassed'] = True
    (HERE / 'editorial-structure-validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if args.render:
        assert SOFFICE.is_file() and (POPPLER / 'pdftoppm.exe').is_file()
        result['renderProvenance'] = {'converter': str(SOFFICE), 'converterVersion': '26.8.0.3 (Windows executable ProductVersion verified via filesystem)', 'rasterizer': str(POPPLER / 'pdftoppm.exe'), 'dpi': 120, 'mode': 'headless CLI, no Word COM or native UI automation; unique LibreOffice profile', 'packagedRenderer': 'documents skill render_docx.py absent from this installed Windows package; using documented manual headless fallback'}
        profile = HERE / 'lo-profile'
        profile.mkdir(exist_ok=True)
        for row in result['files']:
            if row['format'] != 'docx':
                continue
            docx = HERE / row['file']
            out = HERE / 'rendered' / docx.stem
            out.mkdir(parents=True, exist_ok=True)
            command = [str(SOFFICE), '--headless', f'-env:UserInstallation={profile.as_uri()}', '--convert-to', 'pdf', '--outdir', str(out), str(docx)]
            run = subprocess.run(command, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=90)
            (out / 'convert.log').write_text(run.stdout + run.stderr, encoding='utf-8')
            pdf = out / (docx.stem + '.pdf')
            assert run.returncode == 0 and pdf.is_file() and pdf.stat().st_size > 0, (docx.name, run.returncode, run.stdout, run.stderr)
            ppm = subprocess.run([str(POPPLER / 'pdftoppm.exe'), '-png', '-r', '120', str(pdf), str(out / 'page')], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=90)
            assert ppm.returncode == 0, ppm.stderr
            pages = sorted(out.glob('page-*.png'))
            assert pages, docx.name
            result['render'].append({'docx': docx.name, 'docxSha256': row['sha256'], 'pdf': str(pdf.relative_to(HERE)), 'pdfSha256': sha(pdf), 'pages': [{'file': str(p.relative_to(HERE)), 'bytes': p.stat().st_size, 'sha256': sha(p)} for p in pages], 'converterExit': run.returncode, 'rasterizerExit': ppm.returncode})
            (HERE / 'editorial-render-validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            print(f'Rendered {docx.name}: {len(pages)} pages', flush=True)
        print(f"Rendered {len(result['render'])} DOCX files / {sum(len(r['pages']) for r in result['render'])} pages; visual review pending.")
    print(f"Validated {len(result['files'])} actual exports. No source or downloaded file modified.")


if __name__ == '__main__':
    main()

