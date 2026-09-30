"""Independently verify a curated or copied evidence packet without modifying it."""
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

root = Path(sys.argv[1]).resolve()
manifest = json.loads((root / 'artifact-manifest.json').read_text(encoding='utf-8-sig'))
failures = []

def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

expected = set()
for row in manifest['files']:
    expected.add(row['path'])
    path = (root / row['path']).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        failures.append({'kind': 'missing-or-outside', 'path': row['path']})
    elif path.stat().st_size != row['bytes'] or digest(path) != row['sha256']:
        failures.append({'kind': 'manifest-mismatch', 'path': row['path']})
actual = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
if actual != expected | {'artifact-manifest.json', 'SHA256SUMS'}:
    failures.append({'kind': 'inventory', 'extra': sorted(actual - expected - {'artifact-manifest.json', 'SHA256SUMS'}), 'missing': sorted(expected - actual)})

sums = {}
for line in (root / 'SHA256SUMS').read_text(encoding='utf-8-sig').splitlines():
    value, relative = line.split('  ', 1)
    sums[relative] = value
    path = (root / relative).resolve()
    if not path.is_relative_to(root) or not path.is_file() or digest(path) != value:
        failures.append({'kind': 'checksum-mismatch', 'path': relative})
if set(sums) != actual - {'SHA256SUMS'}:
    failures.append({'kind': 'checksum-inventory'})

links = 0
for path in root.rglob('*.md'):
    for match in re.finditer(r'\[[^\]]*\]\((<[^>]*>|[^)]+)\)', path.read_text(encoding='utf-8-sig')):
        target = unquote(match.group(1).strip('<>').split('#', 1)[0])
        if not target or re.match(r'^(https?|mailto|codex|app):', target):
            continue
        links += 1
        resolved = (path.parent / target).resolve()
        if not resolved.is_relative_to(root) or not resolved.is_file():
            failures.append({'kind': 'local-link', 'file': path.relative_to(root).as_posix(), 'target': target})

result = {'checkedAtUTC': datetime.now(timezone.utc).isoformat(), 'packet': str(root), 'manifestSha256': digest(root / 'artifact-manifest.json'), 'payloadFiles': len(expected), 'checksumEntries': len(sums), 'totalFiles': len(actual), 'bytes': sum(p.stat().st_size for p in root.rglob('*') if p.is_file()), 'markdownLinks': links, 'failures': failures, 'passed': not failures}
if len(sys.argv) > 2:
    Path(sys.argv[2]).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))
raise SystemExit(bool(failures))
