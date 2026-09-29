"""Audit-only synthetic UI boundary files. Does not change production source."""
import copy, hashlib, json, re
from pathlib import Path

base = Path(__file__).resolve().parent
out = base / 'boundaries'
out.mkdir(exist_ok=True)
repo = base.parent / 'source-integrated'
downloads = Path('C:/Users/Royin/Downloads')
manifest = []
def save(name, value, ids, expected, source, synthetic=True):
    raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode() if not isinstance(value, bytes) else value
    (out / name).write_bytes(raw)
    manifest.append(dict(file=name, checklist=ids, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(), expected=expected, source=source, synthetic=synthetic))
def read(path): return json.loads(path.read_text(encoding='utf-8-sig'))

mission_path = downloads / 'falcon9-cape-2026-09-29-19-47.orbitlab.json'
design_path = downloads / 'qa-falcon-a-vehicle.orbitlab.json'
mission, design = read(mission_path), read(design_path)
negative = copy.deepcopy(mission); negative['mission']['payloadMass'] = -1
save('C02-mission-negative-payload.orbitlab.json', negative, ['C02'], 'Partial recovery with invalid payload field notice; never install negative mass.', str(mission_path))
newer = copy.deepcopy(mission); newer['version'] = 999
save('C02-mission-version999.orbitlab.json', newer, ['C02'], 'Accept known mission fields with newerVersion warning.', str(mission_path))
unknown = copy.deepcopy(mission); unknown['mission']['vehicleId'] = 'qa-does-not-exist'
save('C02-mission-unknown-vehicle.orbitlab.json', unknown, ['C02'], 'Partial recovery with invalid vehicleId notice; never retain unknown enum.', str(mission_path))
save('C03-broken.json', b'{broken', ['C03','C06','C15','C30'], 'Reject malformed JSON and preserve previously accepted state.', 'synthetic text')
save('C03-empty-object.json', {}, ['C03'], 'Reject wrong mission envelope; preserve mission.', 'synthetic object')
save('C03-design-wrong-mission-format.orbitlab.json', design, ['C03'], 'Mission importer rejects design format; preserve mission.', str(design_path))
save('C06-mission-wrong-flight-format.orbitlab.json', mission, ['C06','C15'], 'Flight importer rejects mission format; design importer rejects and directs user to Launch.', str(mission_path))

reference = read(base / 'valid-reference.orbitlab-flight.json')
mismatch = copy.deepcopy(reference); mismatch['flight']['path']['y'] = mismatch['flight']['path']['y'][:-1]
save('C06-flight-path-mismatch.orbitlab-flight.json', mismatch, ['C06'], 'Reject unequal path arrays; retain previous accepted reference.', 'valid-reference.orbitlab-flight.json')
overflow = copy.deepcopy(reference); overflow['flight']['events'][0]['t'] = '__OVERFLOW__'
overflow_text = (json.dumps(overflow, indent=2).replace('"__OVERFLOW__"', '1e309') + '\n').encode()
save('C07-flight-event-overflow.orbitlab-flight.json', overflow_text, ['C06','C07'], 'Reject nonfinite event time parsed from literal1e309; retain previous reference.', 'valid-reference.orbitlab-flight.json')

sat = copy.deepcopy(design); sat['kind'] = 'satellite'
save('C15-design-satellite.orbitlab.json', sat, ['C15'], 'Reject unsupported design kind; saved designs unchanged.', str(design_path))
empty = copy.deepcopy(design); empty['design']['stages'] = []
save('C15-design-empty-stages.orbitlab.json', empty, ['C15'], 'Reject no-stage vehicle; saved designs unchanged.', str(design_path))
newer = copy.deepcopy(design); newer['version'] = 999
save('C16-design-version999.orbitlab.json', newer, ['C16'], 'Accept valid vehicle as new record with newerVersion warning.', str(design_path))

iss_path = repo / 'tests/fixtures/gp/iss.json'
iss = read(iss_path)[0]
bad = copy.deepcopy(iss); bad.pop('BSTAR')
second = copy.deepcopy(iss); second['NORAD_CAT_ID'] = 90002; second['OBJECT_NAME'] = 'QA SYNTHETIC SECOND ISS COPY'
save('C24-mixed-valid-missing-bstar-valid.json', [iss, bad, second], ['C24'], 'Read two valid element sets and reject record2 for missingBSTAR; third is a labeled synthetic copy, not a real satellite.', str(iss_path))
xp = copy.deepcopy(iss); xp['EPHEMERIS_TYPE'] = 4; xp['MEAN_ELEMENT_THEORY'] = 'SGP4-XP'
save('C24-unsupported-type4.json', [xp], ['C24'], 'Reject unsupported SGP4-XP/type4; previous accepted satellite data retained.', str(iss_path))
tle_path = repo / 'tests/fixtures/gp/iss.tle'
lines = tle_path.read_text().splitlines()
at = next(i for i, line in enumerate(lines) if line.startswith('1 '))
assert len(lines[at]) == 69 and lines[at][-1].isdigit()
lines[at] = lines[at][:-1] + str((int(lines[at][-1]) + 1) % 10)
save('C25-bad-checksum.tle', ('\n'.join(lines)+'\n').encode(), ['C25'], 'Current compatibility parser intentionally accepts bad checksum (requireChecksum=false); record UI behavior and lack of warning as a limitation, not strict-rejection acceptance.', str(tle_path))
save('C25-plain-text.txt', b'hello synthetic boundary fixture\n', ['C25'], 'Unrecognized element format; retain accepted satellite data.', 'synthetic text')
save('C25-malformed-json.json', b'[not json', ['C25'], 'Reject JSON syntax; retain accepted satellite data.', 'synthetic text')
save('C26-omm-over-30MiB.txt', b'Q' * (30 * 1024 * 1024 + 1), ['C26'], 'UI file size guard rejects30MiB+1before parsing and keeps accepted data.', 'synthetic repeated ASCII Q')
save('C26-cdm-over-2MiB.cdm', b'Q' * (2 * 1024 * 1024 + 1), ['C26'], 'UI file size guard rejects2MiB+1before parsing; do not display oldPc as this file result.', 'synthetic repeated ASCII Q')

cdm_path = base / 'valid-cdm-alfano-1.cdm'
cdm = cdm_path.read_text(encoding='utf-8-sig')
missing = re.sub(r'^CN_N\s*=.*\n', '', cdm, count=1, flags=re.M)
assert missing != cdm
save('C28-cdm-missing-CN_N.cdm', missing.encode(), ['C28'], 'Reject missing covariance CN_N inOBJECT1; no stalePc displayed.', str(cdm_path))
tod = re.sub(r'REF_FRAME\s*=\s*EME2000', 'REF_FRAME = TOD', cdm)
save('C28-cdm-unsupported-TOD.cdm', tod.encode(), ['C28'], 'Reject unsupportedTODframe (bothobjects); no stalePc displayed.', str(cdm_path))
save('C28-cdm-wrong-json.json', {'CCSDS_CDM_VERS':'1.0','TCA':'2000-01-01T00:00:00.000'}, ['C28'], 'Reject JSON instead of supportedKVNCDM; no stalePc displayed.', 'synthetic object')
save('C30-lessons-missing-array.orbitlab-lesson.json', {'format':'orbitlab.lessons','version':1}, ['C30'], 'Unusable empty lesson package; keep existing library.', 'synthetic envelope')
lesson = copy.deepcopy(read(base / 'custom-lesson.json')['lessons'][0])
lesson['id'] = 'qa-boundary-partial'; lesson['title'] = {'en':'QA Boundary Partial Lesson','th':'บทเรียนทดสอบรับบางรายการ','ru':'Тест частичного импорта'}
save('C30-lessons-partial-duplicate.orbitlab-lesson.json', {'format':'orbitlab.lessons','version':1,'lessons':[lesson,{'id':'qa-invalid'},copy.deepcopy(lesson)]}, ['C30'], 'Import exactly1valid newlesson; report invalidseconditem and duplicate thirditem; no duplicate libraryentry.', 'custom-lesson.json')

(out / 'manifest.json').write_text(json.dumps({'scope':'Synthetic boundary fixtures only; no browser acceptance claimed.','files':manifest}, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'files':len(manifest),'bytes':sum(x['bytes'] for x in manifest),'manifest':str(out/'manifest.json')}, ensure_ascii=False))
