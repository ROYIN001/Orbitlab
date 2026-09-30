"""Hash exact CUA screenshots after individual human/model visual review.

This script checks file identity/coverage only; it does not infer a visual pass.
The pass and observations originate from independent-review-notes.json.
"""
from pathlib import Path
from datetime import datetime, timezone, timedelta
import hashlib
import io
import json
from PIL import Image

root = Path(__file__).resolve().parent
captures = json.loads((root / 'capture-manifest.json').read_text(encoding='utf-8-sig'))
review = json.loads((root / 'independent-review-notes.json').read_text(encoding='utf-8-sig'))
notes = {item['vehicle']: item for item in review['reviewed']}
expected = 'soyuz21a soyuz21b protonm angaraa5 falcon9 falconheavy atlasv551 vulcan ariane64 vegac longmarch2d longmarch3be h2a202 longmarch5 h3 pslvxl electron starship sputnik8k71ps vostok8k72k saturnv'.split()
assert set(notes) == set(expected) and len(notes) == 21
expected_pairs = {(vehicle, mode) for vehicle in expected for mode in ['assembled', 'exploded']}
assert {(item['vehicle'], item['mode']) for item in captures} == expected_pairs
assert len(captures) == 42

rows = []
for capture in captures:
    vehicle, mode, filename = capture['vehicle'], capture['mode'], capture['file']
    assert filename == f'{vehicle}-{mode}.jpg'
    note = notes[vehicle]
    assert mode in note['modes'] and note['result'] == 'pass'
    data = (root / filename).read_bytes()
    image = Image.open(io.BytesIO(data))
    width, height = image.size
    actual_format = image.format
    assert actual_format == 'JPEG'
    assert (width, height) == (1280, 720)
    rows.append({
        'vehicle': vehicle, 'mode': mode, 'file': filename,
        'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
        'detectedFormat': actual_format, 'mediaType': 'image/jpeg',
        'width': width, 'height': height, 'visualResult': note['result'],
        'observation': note['note'],
        'visibleToggleAndGeometryMatchMode': True,
        'blankDrawingObserved': False, 'drawingClippingObserved': False,
        'labelCollisionObserved': False, 'literalNaNObserved': False,
    })
unique_hashes = len({row['sha256'] for row in rows})
assert unique_hashes == 42
result = {
    'sourceCommit': '0b844f77f5f0ffdeb7274642ddf74a57c2ee230b',
    'preview': 'http://127.0.0.1:4182/#/build/watch',
    'build': 'final6', 'language': 'en', 'theme': 'dark',
    'capturedBy': 'root agent through CUA', 'independentReviewer': review['reviewer'],
    'reviewMethod': review['reviewMethod'],
    'recordedAt': datetime.now(timezone(timedelta(hours=3))).isoformat(),
    'vehicles': 21, 'reviewedViews': 42, 'passedViews': 42,
    'unsupportedViewsInRequestedDesktopMatrix': [],
    'uniqueScreenshotHashes': unique_hashes,
    'totalOriginalImageBytes': sum(row['bytes'] for row in rows),
    'fileFormatNote': 'JPEG/JFIF detected from actual screenshot bytes; no image conversion was performed.',
    'excludedPreliminaryFolder': '../browser-build-visual-final6',
    'limitations': [
        'Desktop 1280x720 Watch diagrams only; not all viewport, language or browser combinations.',
        'Inspection concerns visible schematic drawing and labels; not CAD, physical silhouette or paint-scheme certification.',
        'No new production changes or numerical test runs in this visual review.',
        'Below-the-fold stage tables and individual part-card interactions are outside these 42 screenshots.',
    ],
    'rows': rows,
}
(root / 'review-matrix.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: result[key] for key in ['vehicles', 'reviewedViews', 'passedViews', 'uniqueScreenshotHashes', 'totalOriginalImageBytes', 'recordedAt']}, indent=2))
