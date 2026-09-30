"""Independent byte/field validation of actual browser mission-file -> URL -> new-tab QA."""
import base64
import hashlib
import json
import shutil
import zlib
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

audit = Path(__file__).resolve().parents[1]
original = Path('C:/Users/Royin/Downloads/falcon9-cape-2026-09-29-19-47.orbitlab.json')
link_path = audit / 'browser-mission-link-roundtrip.json'
import_path = audit / 'browser-mission-roundtrip.json'
link = json.loads(link_path.read_text(encoding='utf-8-sig'))
imported = json.loads(import_path.read_text(encoding='utf-8-sig'))
param = parse_qs(urlsplit(link['sharedUrl']).query)['m'][0]
assert param[0] == 'z'
compressed = base64.urlsafe_b64decode(param[1:] + '=' * ((4 - len(param[1:]) % 4) % 4))
decoded = json.loads(zlib.decompress(compressed, -15))
source = json.loads(original.read_text(encoding='utf-8-sig'))

def flatten(value, prefix=''):
    if isinstance(value, dict) and value:
        return {path: item for key, nested in value.items() for path, item in flatten(nested, f'{prefix}.{key}' if prefix else key).items()}
    if isinstance(value, list) and value:
        return {path: item for index, nested in enumerate(value) for path, item in flatten(nested, f'{prefix}[{index}]').items()}
    return {prefix: value}

left, right = flatten(source), flatten(decoded)
missing = sorted(left.keys() - right.keys())
extra = sorted(right.keys() - left.keys())
different = [{'path': path, 'source': left[path], 'decoded': right[path]} for path in left.keys() & right.keys() if left[path] != right[path] or type(left[path]) is not type(right[path])]
assert not missing and not extra and not different
assert source == decoded
assert link['importedControls'] == link['linkedControls']
assert len(link['importedControls']) == 46
assert imported['sharedUrl'] == link['sharedUrl']
assert imported['state']['vehicle']['id'] == source['mission']['vehicleId']
assert imported['state']['site']['id'] == source['mission']['siteId']
assert imported['state']['satellite']['id'] == source['mission']['satelliteId']
assert imported['state']['frame']['rigid']['windProfile'] == {'kind': source['mission']['dynamics']['wind'], 'seed': source['mission']['dynamics']['seed']}
dest = audit / 'browser-mission-roundtrip-artifacts'
dest.mkdir(exist_ok=True)
shutil.copyfile(original, dest / original.name)

def checksum(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

report = {
    'sourceFile': {'downloadName': original.name, 'copy': f'browser-mission-roundtrip-artifacts/{original.name}', 'bytes': original.stat().st_size, 'sha256': checksum(original)},
    'browserEvidence': [{'path': p.name, 'sha256': checksum(p)} for p in [link_path, import_path]],
    'decoder': 'Independent Python base64url + raw DEFLATE (zlib wbits=-15), matching z-prefix contract read from integrated src/config/mission-file.ts:325-341',
    'codecSourceSha256': checksum(audit / 'source-integrated/src/config/mission-file.ts'),
    'shareHandlerSourceSha256': checksum(audit / 'source-integrated/src/ui/mission-share.ts'),
    'allDocumentFieldsEqual': source == decoded,
    'comparedLeafOrEmptyContainerPaths': sorted(left),
    'comparedFieldCount': len(left), 'missing': missing, 'extra': extra, 'different': different,
    'launchTimePreservedExactly': decoded['mission']['launchTime'],
    'decodedDocument': decoded,
    'browserControls': {'count': 46, 'allEqual': True, 'excludedOtherPanel': link['excludedOtherPanel']},
    'clipboard': {'observed': imported['clipboardFallback'], 'claim': 'Address-bar fallback used; clipboard write success is NOT claimed'},
    'scope': 'One actual saved mission imported via UI, shared via address-bar fallback, opened in new tab. Complete encoded document equals original file, including UTC milliseconds and absent/empty fields. Not every possible mission combination.',
    'passed': True,
}
(audit / 'browser-mission-roundtrip-validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed': True, 'fields': len(left), 'controls': 46, 'sourceBytes': original.stat().st_size, 'sourceSha256': checksum(original)}))
