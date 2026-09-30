import { describe, expect, it } from 'vitest';
import { emptyProgress, loadProgress, PROGRESS_STORAGE_KEY, recordGrade, recordRevealed, saveProgress, type KeyValueStore, type LessonRecord } from '../src/lessons/progress';

const grade: LessonRecord & { lessonId: string } = {
  lessonId: 'case-theos2', at: '2026-09-29T20:00:00Z', verdict: 'pass', criteria: [], answers: {}, hintsShown: 0,
};
function memory(raw: string) {
  const values = new Map([[PROGRESS_STORAGE_KEY, raw]]);
  const store: KeyValueStore = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); } };
  return { values, store };
}
const saved = (lessons: unknown) => JSON.stringify({ ...emptyProgress(), lessons });

describe('damaged lesson progress recovery', () => {
  it.each([7, 'wrong', [], null].map((entry) => ({ entry })))('can grade and reveal after loading a malformed lesson entry $entry', ({ entry }) => {
    const raw = saved({ 'case-theos2': entry });
    const { values, store } = memory(raw);
    const data = loadProgress(store);
    expect(values.get(PROGRESS_STORAGE_KEY)).toBe(raw); // loading is read-only
    expect(() => recordGrade(data, grade)).not.toThrow();
    expect(() => recordRevealed(data, grade.lessonId, { radius: 12 })).not.toThrow();
    expect(data.lessons[grade.lessonId]).toMatchObject({ attempts: 0, hintsShown: 0, passed: true, revealed: { radius: [12] } });
    expect(saveProgress(data, store)).toBe(true);
    expect([...values.entries()].filter(([k]) => k !== PROGRESS_STORAGE_KEY).map(([, v]) => v)).toContain(raw);
    const { lessonId: _, ...record } = grade;
    expect(loadProgress(store).lessons[grade.lessonId].last).toEqual(record);
  });

  it.each([7, [], { radius: 7, speed: [2, 'bad', null, 3] }].map((revealed) => ({ revealed })))('repairs malformed revealed collections $revealed without losing valid values', ({ revealed }) => {
    const raw = saved({ 'case-theos2': { attempts: 4, hintsShown: 2, passed: false, revealed } });
    const { store } = memory(raw);
    const data = loadProgress(store);
    expect(() => recordRevealed(data, grade.lessonId, { radius: 12, speed: 3 })).not.toThrow();
    expect(data.lessons[grade.lessonId].revealed!.radius).toEqual([12]);
    expect(data.lessons[grade.lessonId].revealed!.speed).toEqual(typeof revealed === 'object' && !Array.isArray(revealed) ? [2, 3] : [3]);
  });

  it('keeps valid legacy records without snapshots and valid revealed values unchanged', () => {
    const { lessonId: _, ...record } = grade;
    record.caseData = { case: 'theos2', theos2Epoch: '2026-09-26T00:00:00Z' };
    const valid = { attempts: 3, hintsShown: 1, passed: true, passedRecord: record, last: record, revealed: { radius: [12] } };
    const { values, store } = memory(saved({ old: valid, damaged: 7 }));
    const data = loadProgress(store);
    expect(data.lessons.old).toEqual(valid);
    expect(saveProgress(data, store)).toBe(true);
    expect(loadProgress(store).lessons.old).toEqual(valid);
    expect(values.size).toBe(2);
  });

  it('normalizes nonnumeric counts and nonboolean pass flags conservatively', () => {
    const { store } = memory(saved({ a: { attempts: '4', hintsShown: -2, passed: 'false' } }));
    expect(loadProgress(store).lessons.a).toMatchObject({ attempts: 0, hintsShown: 0, passed: false });
  });

  it.each(['{', '{"version":999,"future":"keep me"}'])('preserves unreadable/unsupported original storage before saving: %s', (raw) => {
    const { values, store } = memory(raw);
    const data = loadProgress(store);
    recordGrade(data, grade);
    expect(saveProgress(data, store)).toBe(true);
    expect([...values.entries()].filter(([k]) => k !== PROGRESS_STORAGE_KEY).map(([, v]) => v)).toContain(raw);
  });

  it('does not overwrite the original if recovery storage is unavailable', () => {
    const raw = saved({ 'case-theos2': 7 });
    const { values, store } = memory(raw);
    const data = loadProgress(store);
    recordGrade(data, grade);
    const full: KeyValueStore = { getItem: store.getItem, setItem: (k, v) => { if (k !== PROGRESS_STORAGE_KEY) throw new Error('quota'); store.setItem(k, v); } };
    expect(saveProgress(data, full)).toBe(false);
    expect(values.get(PROGRESS_STORAGE_KEY)).toBe(raw);
  });

  it('preserves earlier recovery records and reuses its own backup on retry', () => {
    const raw = saved({ 'case-theos2': 7 });
    const { values, store } = memory(raw);
    values.set(`${PROGRESS_STORAGE_KEY}.recovery`, 'older recovery evidence');
    const data = loadProgress(store);
    recordGrade(data, grade);
    expect(saveProgress(data, store)).toBe(true);
    expect(saveProgress(data, store)).toBe(true);
    expect(values.get(`${PROGRESS_STORAGE_KEY}.recovery`)).toBe('older recovery evidence');
    expect([...values.values()].filter((v) => v === raw)).toHaveLength(1);
    expect(values.size).toBe(3);
  });

  it('keeps the backup when the active write fails and reuses it on retry', () => {
    const raw = saved({ 'case-theos2': 7 });
    const { values, store } = memory(raw);
    const data = loadProgress(store);
    recordGrade(data, grade);
    const failActive: KeyValueStore = { getItem: store.getItem, setItem: (k, v) => { if (k === PROGRESS_STORAGE_KEY) throw new Error('write failed'); store.setItem(k, v); } };
    expect(saveProgress(data, failActive)).toBe(false);
    expect(values.get(PROGRESS_STORAGE_KEY)).toBe(raw);
    expect(saveProgress(data, store)).toBe(true);
    expect(values.size).toBe(2);
    expect([...values.values()].filter((v) => v === raw)).toHaveLength(1);
  });

  it('does not create recovery copies for valid unchanged data', () => {
    const raw = saved({ a: { attempts: 4, hintsShown: 2, passed: false, revealed: { radius: [12] } } });
    const { values, store } = memory(raw);
    expect(saveProgress(loadProgress(store), store)).toBe(true);
    expect(values.size).toBe(1);
    expect(values.get(PROGRESS_STORAGE_KEY)).toBe(raw);
  });

  it('does not overwrite storage whose contents could not be read', () => {
    let writes = 0;
    const store: KeyValueStore = { getItem: () => { throw new Error('unreadable'); }, setItem: () => { writes++; } };
    expect(saveProgress(loadProgress(store), store)).toBe(false);
    expect(writes).toBe(0);
  });
});
