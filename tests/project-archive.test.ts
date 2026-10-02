import { describe, expect, it } from 'vitest';
import { missionDocument, MISSION_STORE_KEY } from '../src/config/mission-file';
import { defaultMissionState } from '../src/lessons/config';
import { emptyProgress, PROGRESS_STORAGE_KEY, type ProgressData } from '../src/lessons/progress';
import { DESIGN_STORE_KEY, LocalDesignStore } from '../src/design/design-store';
import { vehicleById } from '../src/data/vehicles';
import { designFromTemplate } from '../src/design/satellite-model';
import { NOTEBOOK_STORAGE_KEY, type NotebookData } from '../src/experiments/notebook';
import {
  PROJECT_FORMAT, PROJECT_MAX_BYTES, PROJECT_RECOVERY_KEY, PROJECT_SECTIONS, PROJECT_STORAGE_KEYS,
  exportProjectArchive, importProjectArchive, parseProjectArchive, previewProjectImport, projectArchiveText, projectCounts,
  recoverProjectImport, type ProjectArchive, type ProjectStorage,
} from '../src/projects/archive';
import { projectsEn, projectsRu, projectsTh } from '../src/i18n/projects';
import { BUILTIN_CASE_LESSONS, BUILTIN_LESSONS } from '../src/lessons/catalog';
import { BUILTIN_QUESTIONS } from '../src/lessons/assessment/bank';
import { caseWorksheet } from '../src/worksheets/cases';
import { readPackText } from '../src/lessons/packs';

const at = '2026-10-02T12:00:00.000Z';
const mission = () => missionDocument(defaultMissionState(new Date(at)));
const notebook = (): NotebookData => ({ version: 1, experiments: [{
  id: 'experiment-1', createdAt: at, title: 'Payload test', prediction: 'A lighter payload raises apogee', variable: 'payloadMass', conclusion: '',
  baseline: { label: 'Baseline', capturedAt: at, mission: mission(), actions: [], app: 'test-build', t: 1, clock: 1, status: 'ascent',
    complete: false, source: 'recorded-telemetry', sampleCount: 2, sampleStart: 0, sampleEnd: 1, figures: [] },
}] });
const archive = (): ProjectArchive => ({ format: PROJECT_FORMAT, version: 1, exportedAt: at,
  data: { mission: mission(), designs: { version: 1, designs: [] }, progress: emptyProgress(), notebook: notebook() } });
function memory() {
  const values = new Map<string, string>();
  const writes: string[] = [];
  const store: ProjectStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); writes.push(key); },
    removeItem: (key) => { values.delete(key); writes.push(key); },
  };
  return { values, writes, store };
}

/** A real frozen worksheet, serialized exactly as browser progress stores it. */
function caseArchive(): ProjectArchive {
  const data = emptyProgress();
  const source = { activity: { f107: 0, f107a: 0, ap: 0 }, theos2: null };
  data.lessons.case = { attempts: 1, passed: true, hintsShown: 0, last: {
    at, verdict: 'pass', criteria: [], answers: {}, hintsShown: 0,
    caseData: { case: 'iridium', snapshot: { version: 1, generatedAt: at, source,
      worksheet: caseWorksheet('iridium', { ...source, lang: 'en', generatedAt: new Date(at) })! } },
  } };
  return JSON.parse(JSON.stringify({ ...archive(), data: { progress: data } })) as ProjectArchive;
}

const PACK_FILES = import.meta.glob('../public/lessons/packs/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('versioned project backup', () => {
  it('round-trips actual saved rocket, satellite, mission, progress and notebook data through existing stores', async () => {
    const source = memory(), designs = new LocalDesignStore(() => source.store, () => new Date(at), (() => { let i = 0; return () => `d${++i}`; })());
    await designs.save({ kind: 'vehicle', name: 'Rocket', design: { ...structuredClone(vehicleById('falcon9')), id: 'my-falcon', derivedFrom: 'falcon9' } });
    await designs.save({ kind: 'satellite', name: 'Satellite', design: designFromTemplate('napa2', 'my-sat', 'Satellite') });
    const progress: ProgressData = { ...emptyProgress(), lessons: { test: { attempts: 1, passed: true, hintsShown: 0,
      last: { at, verdict: 'pass', criteria: [{ id: 'orbit', state: 'pass', value: 1 }], answers: {}, hintsShown: 0, mission: mission() } } },
      assessments: [{ kind: 'pre', seed: 5, startedAt: at, questions: [{ id: 'q1', order: [1, 0] }], answers: [{ id: 'q1', value: 1, confidence: 'sure' }] }] };
    source.store.setItem(MISSION_STORE_KEY, JSON.stringify(mission()));
    source.store.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    source.store.setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify(notebook()));
    const saved = exportProjectArchive(source.store, new Date(at));
    const parsed = parseProjectArchive(projectArchiveText(saved));
    expect(projectCounts(parsed.data)).toEqual({ mission: 1, designs: 2, lessons: 1, assessments: 1, customLessons: 0, customQuestions: 0, experiments: 1 });
    const target = memory();
    expect(importProjectArchive(previewProjectImport(parsed, target.store), PROJECT_SECTIONS, target.store)).toEqual(PROJECT_SECTIONS);
    expect(exportProjectArchive(target.store, new Date(at))).toEqual(saved);
    expect(await new LocalDesignStore(() => target.store).list()).toHaveLength(2);
    expect(target.values.has(PROJECT_RECOVERY_KEY)).toBe(false);
  });

  it('exports only exact supported keys, excluding preferences, recovery copies and unrelated browser data', () => {
    const { store, values } = memory();
    values.set('account-token', 'private'); values.set('orbitlab.glow', 'off');
    values.set('orbitlab.lessons.recovery', 'old work'); values.set('orbitlab.mission.extra', 'unknown');
    values.set(MISSION_STORE_KEY, JSON.stringify(mission()));
    const out = exportProjectArchive(store, new Date(at));
    expect(Object.keys(out.data)).toEqual(['mission']);
    expect(JSON.stringify(out)).not.toMatch(/private|old work|unknown|glow/);
  });

  it('preserves custom teaching material and frozen case worksheets, rejecting malformed nested worksheet data', () => {
    const data = emptyProgress();
    data.customLessons = [{ ...structuredClone(BUILTIN_LESSONS[0]), id: 'my-lesson' }];
    data.customQuestions = [{ ...structuredClone(BUILTIN_QUESTIONS[0]), id: 'my-question', custom: true }];
    data.lessons.case = { attempts: 1, passed: true, hintsShown: 0, last: {
      at, verdict: 'pass', criteria: [], answers: {}, hintsShown: 0, caseData: { case: 'iridium', snapshot: {
        version: 1, generatedAt: at, source: { activity: { f107: 0, f107a: 0, ap: 0 }, theos2: null },
        worksheet: { lang: 'en', title: 'Case', subtitle: '', student: '', code: 'A', seed: 1, generatedAt: new Date(at),
          sections: [{ title: 'Question', figures: [{ svg: '<svg><path d="M0 0L1 1"/></svg>' }], items: [{ kind: 'number', prompt: 'Distance?', answer: { text: '1 m', value: 1 } }] }] },
      } },
    } };
    const raw = JSON.parse(JSON.stringify({ ...archive(), data: { progress: data } }));
    expect(parseProjectArchive(JSON.stringify(raw)).data.progress).toEqual(JSON.parse(JSON.stringify(data)));
    raw.data.progress.lessons.case.last.caseData.snapshot.worksheet.sections[0].figures[0].svg = '<svg onload="alert(1)"/>';
    expect(() => parseProjectArchive(JSON.stringify(raw))).toThrowError(expect.objectContaining({ code: 'invalid', section: 'progress' }));
  });

  it('preserves all actual lesson/question shapes and real generated worksheet SVG without normalization', () => {
    const incoming = caseArchive(), progress = incoming.data.progress!;
    progress.customLessons = [
      ...BUILTIN_LESSONS, ...BUILTIN_CASE_LESSONS,
      ...Object.entries(PACK_FILES).flatMap(([path, file]) => readPackText(file, path)!.lessons),
    ].map((lesson) => ({ ...structuredClone(lesson), id: `copied-${lesson.id}` }));
    progress.customQuestions = BUILTIN_QUESTIONS.map((question) => ({ ...structuredClone(question), id: `copied-${question.id}`, custom: true }));
    const raw = JSON.stringify(incoming);
    expect(parseProjectArchive(raw)).toEqual(JSON.parse(raw));
  });

  it.each([
    ['locked', null], ['hints', null], ['track', 'bad'], ['order', 1.5], ['mode', 'unknown'],
    ['title', { en: 'Title', ru: 42 }], ['domains', [1, 999]], ['curriculum', [{ code: 'bad', kind: 'unknown' }]],
  ])('rejects a custom lesson when the forgiving reader would repair %s', (key, value) => {
    const incoming = archive();
    const lesson = { ...structuredClone(BUILTIN_LESSONS[0]), id: 'custom-fixture', [key]: value };
    incoming.data.progress!.customLessons = [lesson as typeof BUILTIN_LESSONS[number]];
    expect(() => parseProjectArchive(JSON.stringify(incoming))).toThrowError(expect.objectContaining({ code: 'invalid', section: 'progress' }));
  });

  it('rejects repairs to question metadata while allowing absent optional translations and explicit false values', () => {
    const incoming = archive();
    const original = structuredClone(BUILTIN_QUESTIONS.find((question) => question.type === 'choice')!);
    for (const changes of [{ kind: 'invalid' }, { skill: null }, { lessons: ['valid', 42] }, { custom: 'yes' }, { prompt: { en: 'Prompt', th: 42 } }]) {
      incoming.data.progress!.customQuestions = [{ ...original, ...changes } as typeof original];
      expect(() => parseProjectArchive(JSON.stringify(incoming))).toThrowError(expect.objectContaining({ code: 'invalid', section: 'progress' }));
    }
    incoming.data.progress!.customQuestions = [{ ...original, custom: true, fixedOrder: false, prompt: { en: 'English-only prompt' },
      options: original.options.map((option) => ({ ...option, correct: option.correct === true })) }];
    expect(parseProjectArchive(JSON.stringify(incoming)).data.progress!.customQuestions).toEqual(incoming.data.progress!.customQuestions);
  });

  it.each([
    '<svg><a href="jav&#x61;script:alert(1)">link</a></svg>',
    '<svg><a href="java&#9;script:alert(1)">link</a></svg>',
    '<svg><animate attributeName="href" values="javascript:alert(1)"/></svg>',
    '<svg><set attributeName="onload" to="alert(1)"/></svg>',
    '<svg><style>@import url(https://example.com/style.css)</style></svg>',
    '<svg><path fill="url(https://example.com/image.svg#id)" d="M0 0"/></svg>',
    '<svg><path fill="u&#114;l(https://example.com/image.svg#id)" d="M0 0"/></svg>',
    '<svg><image href="https://example.com/image.png"/></svg>',
    '<svg><foreignObject><div>HTML</div></foreignObject></svg>',
    '<svg></svg><img src="https://example.com/image.png">',
    '<svg><g></svg>',
    '<svg xmlns="http://www.w3.org/1999/xhtml"><text>HTML namespace</text></svg>',
  ])('rejects active, resource-loading or malformed stored SVG: %s', (svg) => {
    const incoming = caseArchive();
    incoming.data.progress!.lessons.case.last!.caseData!.snapshot!.worksheet.sections[0].figures = [{ svg }];
    expect(() => parseProjectArchive(JSON.stringify(incoming))).toThrowError(expect.objectContaining({ code: 'invalid', section: 'progress' }));
  });

  it.each(['javascript:alert(1)', 'java\tscript:alert(1)', 'data:image/svg+xml,<svg onload="alert(1)"/>', 'https://user:password@example.com/image.png'])('rejects unsafe worksheet image references: %s', (image) => {
    const incoming = caseArchive();
    incoming.data.progress!.lessons.case.last!.caseData!.snapshot!.worksheet.sections[0].figures = [{ image }];
    expect(() => parseProjectArchive(JSON.stringify(incoming))).toThrowError(expect.objectContaining({ code: 'invalid', section: 'progress' }));
  });

  it.each(['{', 'null', '[]', '{"format":"other","version":1}'])('rejects malformed/wrong schema input %s', (raw) => {
    expect(() => parseProjectArchive(raw)).toThrowError(expect.objectContaining({ code: 'invalid' }));
  });

  it('rejects future archive versions and invalid nested mission/design/progress/notebook data without repair', () => {
    expect(() => parseProjectArchive(JSON.stringify({ ...archive(), version: 2 }))).toThrowError(expect.objectContaining({ code: 'newer' }));
    const invalid = [
      { mission: { ...mission(), version: 100 } },
      { mission: { ...mission(), mission: { ...mission().mission, payloadMass: -1 } } },
      { designs: { version: 1, designs: [{ id: 'bad', kind: 'vehicle' }] } },
      { progress: { ...emptyProgress(), lessons: { x: { attempts: 'one', passed: true, hintsShown: 0 } } } },
      { progress: { ...emptyProgress(), assessments: [{ kind: 'pre', questions: null }] } },
      { progress: { ...emptyProgress(), customLessons: [{ id: 'bad' }] } },
      { notebook: { version: 2, experiments: [] } },
      { notebook: { version: 1, experiments: [{ title: 'missing evidence' }] } },
    ];
    for (const data of invalid) expect(() => parseProjectArchive(JSON.stringify({ ...archive(), data }))).toThrowError(expect.objectContaining({ code: 'invalid' }));
  });

  it('rejects custom specifications that an older mission version would silently discard', () => {
    const incoming = archive();
    incoming.data.mission = { ...mission(), version: 1, mission: { ...mission().mission, vehicleSpec: structuredClone(vehicleById('falcon9')) } };
    expect(() => parseProjectArchive(JSON.stringify(incoming))).toThrowError(expect.objectContaining({ code: 'invalid', section: 'mission' }));
  });

  it('rejects unknown storage sections, dangerous property names, excessive depth and byte oversize', () => {
    expect(() => parseProjectArchive(JSON.stringify({ ...archive(), data: { arbitrary: {} } }))).toThrow();
    const poisoned = JSON.stringify(archive()).replace('"data":{', '"data":{"__proto__":{},');
    expect(() => parseProjectArchive(poisoned)).toThrow();
    const deep = archive() as unknown as { data: { nested: unknown } };
    deep.data.nested = JSON.parse(`${'['.repeat(80)}0${']'.repeat(80)}`);
    expect(() => parseProjectArchive(JSON.stringify(deep))).toThrow();
    expect(() => parseProjectArchive(' '.repeat(PROJECT_MAX_BYTES + 1))).toThrowError(expect.objectContaining({ code: 'oversize' }));
    expect(() => parseProjectArchive('ก'.repeat(Math.ceil(PROJECT_MAX_BYTES / 3)))).toThrowError(expect.objectContaining({ code: 'oversize' }));
  });

  it('refuses to export corrupted browser data without touching its original bytes', () => {
    const { values, writes, store } = memory();
    values.set(PROGRESS_STORAGE_KEY, '{broken');
    expect(() => exportProjectArchive(store)).toThrowError(expect.objectContaining({ code: 'invalid', section: 'progress' }));
    expect(values.get(PROGRESS_STORAGE_KEY)).toBe('{broken'); expect(writes).toEqual([]);
  });

  it('previews counts and preserves all conflicting sections until an explicit replacement is selected', () => {
    const { values, writes, store } = memory();
    const original = JSON.stringify({ ...mission(), mission: { ...mission().mission, payloadMass: 500 } }, null, 2);
    values.set(MISSION_STORE_KEY, original);
    values.set(PROGRESS_STORAGE_KEY, '{broken progress');
    const preview = previewProjectImport(archive(), store);
    expect(preview.unreadable).toEqual(['progress']);
    expect(preview.before.mission).toBe(original);
    expect(importProjectArchive(preview, [], store)).toEqual([]);
    expect(writes).toEqual([]);
    importProjectArchive(preview, ['notebook'], store);
    expect(values.get(MISSION_STORE_KEY)).toBe(original);
    expect(values.get(PROGRESS_STORAGE_KEY)).toBe('{broken progress');
    expect(JSON.parse(values.get(NOTEBOOK_STORAGE_KEY)!)).toEqual(notebook());
  });

  it('replaces only selected collections and cannot delete sections absent from a backup', () => {
    const { values, store } = memory();
    values.set(PROGRESS_STORAGE_KEY, JSON.stringify({ ...emptyProgress(), lessons: { old: { attempts: 3, passed: false, hintsShown: 0 } } }));
    values.set(MISSION_STORE_KEY, 'preserve exact mission bytes');
    const incoming = { ...archive(), data: { progress: emptyProgress() } };
    const preview = previewProjectImport(incoming, store);
    expect(importProjectArchive(preview, ['mission', 'progress'], store)).toEqual(['progress']);
    expect(values.get(MISSION_STORE_KEY)).toBe('preserve exact mission bytes');
    expect(JSON.parse(values.get(PROGRESS_STORAGE_KEY)!)).toEqual(emptyProgress());
  });

  it('rejects modified invalid preview contents and stale browser data with zero writes', () => {
    const { values, writes, store } = memory();
    const preview = previewProjectImport(archive(), store);
    values.set(MISSION_STORE_KEY, 'another tab changed the mission');
    expect(() => importProjectArchive(preview, ['mission'], store)).toThrowError(expect.objectContaining({ code: 'changed' }));
    preview.archive.data.progress!.version = 2 as 1;
    expect(() => importProjectArchive(preview, ['progress'], store)).toThrowError(expect.objectContaining({ code: 'invalid' }));
    expect(writes).toEqual([]);
  });

  it('keeps all originals unchanged if quota prevents creating the recovery journal', () => {
    const { values, store } = memory();
    values.set(MISSION_STORE_KEY, 'original bytes');
    const full: ProjectStorage = { ...store, setItem: () => { throw new DOMException('full', 'QuotaExceededError'); } };
    expect(() => importProjectArchive(previewProjectImport(archive(), full), PROJECT_SECTIONS, full)).toThrowError(expect.objectContaining({ code: 'storage' }));
    expect([...values]).toEqual([[MISSION_STORE_KEY, 'original bytes']]);
  });

  it('rolls back every earlier write byte for byte after a later quota failure, including originally absent keys', () => {
    const { values, store } = memory();
    values.set(MISSION_STORE_KEY, '  original malformed mission bytes  ');
    values.set(PROGRESS_STORAGE_KEY, JSON.stringify(emptyProgress(), null, 2));
    values.set('unrelated', 'untouched');
    const originals = new Map(values);
    let failed = false;
    const quota: ProjectStorage = { ...store, setItem: (key, value) => {
      if (key === NOTEBOOK_STORAGE_KEY && !failed) { failed = true; throw new DOMException('full', 'QuotaExceededError'); }
      store.setItem(key, value);
    } };
    expect(() => importProjectArchive(previewProjectImport(archive(), quota), PROJECT_SECTIONS, quota)).toThrowError(expect.objectContaining({ code: 'storage' }));
    expect(values).toEqual(originals);
  });

  it('retains original bytes in its journal if storage denies rollback, then recovers on retry', () => {
    const { values, store } = memory();
    values.set(MISSION_STORE_KEY, 'original bytes');
    let blocked = false;
    const denied: ProjectStorage = { ...store,
      setItem: (key, value) => { if (key === DESIGN_STORE_KEY) blocked = true; if (blocked) throw new Error('storage disabled'); store.setItem(key, value); },
      removeItem: (key) => { if (blocked) throw new Error('storage disabled'); store.removeItem(key); },
    };
    expect(() => importProjectArchive(previewProjectImport(archive(), denied), PROJECT_SECTIONS, denied)).toThrowError(expect.objectContaining({ code: 'rollback' }));
    expect(JSON.parse(values.get(PROJECT_RECOVERY_KEY)!).before.mission).toBe('original bytes');
    expect(() => exportProjectArchive(store)).toThrowError(expect.objectContaining({ code: 'pending' }));
    expect(recoverProjectImport(store)).toBe(true);
    expect([...values]).toEqual([[MISSION_STORE_KEY, 'original bytes']]);
    expect(recoverProjectImport(store)).toBe(false);
  });

  it('never applies arbitrary keys from a forged recovery journal', () => {
    const { values, store } = memory();
    values.set(PROJECT_RECOVERY_KEY, JSON.stringify({ version: 1, before: { 'unrelated': 'overwrite' } }));
    values.set('unrelated', 'original');
    expect(() => recoverProjectImport(store)).toThrow();
    expect(values.get('unrelated')).toBe('original');
    expect(PROJECT_STORAGE_KEYS).toEqual({ mission: 'orbitlab.mission', designs: 'orbitlab.designs', progress: 'orbitlab.lessons', notebook: 'orbitlab.experiments.v1' });
  });

  it('provides matching English, Russian and Thai keys and interpolation placeholders', () => {
    const keys = Object.keys(projectsEn).sort();
    for (const locale of [projectsRu, projectsTh]) {
      expect(Object.keys(locale).sort()).toEqual(keys);
      for (const key of keys) expect(locale[key].match(/\{\w+\}/g) ?? []).toEqual(projectsEn[key].match(/\{\w+\}/g) ?? []);
    }
  });
});
