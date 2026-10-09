/**
 * FX-1 (M-BUILD-007, P1, data loss): opening a saved design, an imported file
 * or a requirements row put it on screen in place of the design there, with
 * no question, so changes no saved record kept were gone; and in a design
 * lesson it replaced the lesson's design the student was working on.
 *
 * Plan v2.0 S10 §10.4: when the design that would be replaced differs from
 * what is saved, the student chooses — save it first, open without saving,
 * or keep it (Cancel, Escape) — and nothing is dropped silently; a design
 * never saved and still as it started opens over at once; the lesson's design
 * is put aside and comes back when the student returns to the lesson; the
 * stored formats do not change. D-75: a difference in payload ratings only
 * is not a design edit.
 *
 * Vitest runs in `node` (no DOM), so the store's and the requirements page's
 * own methods are run on objects made from their prototypes, their drawing
 * stubbed; the satellite workspace, the design store and the explore model
 * are the real ones. The page itself is driven in the browser journey
 * tests/browser/journeys/build-unsaved-open.mjs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { julianDate } from '../src/physics/orbital';
import { LocalDesignStore, isDesignOf, type DesignKind, type DesignRecord, type DesignStorage } from '../src/design/design-store';
import { SATELLITE_DRAFT_KEY, designFromTemplate } from '../src/design/satellite-model';
import type { SatelliteDesign } from '../src/design/satellite-spec';
import { DEFAULT_GROUP, activeDraft, designResult, draftFromSpec, partsDraft, remixDraft, type ExploreState, type RemixEdit } from '../src/design/explore-model';
import { DEFAULT_FORM, missionRequirements, templateDesign, tradeOptionsFor } from '../src/design/requirements-page';
import { tradeRow } from '../src/design/requirement-trades';
import { setLang } from '../src/i18n';
import { ExploreStore, STORE_TEXTS, type ExploreStoreHost } from '../src/ui/build/explore-store';
import { ExploreLevel } from '../src/ui/build/explore-level';
import { RequirementsPage } from '../src/ui/build/requirements-page';
import { SatelliteWorkspace, defaultNameFor, type LessonDesk } from '../src/ui/build/satellite-workspace';
import { SatelliteLevel } from '../src/ui/build/satellite-level';
import type { VehicleSpec } from '../src/types';

const JD0 = julianDate(new Date(Date.UTC(2026, 8, 30)));

function memory(): DesignStorage {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
}

function storeWith(storage: DesignStorage): LocalDesignStore {
  let t = Date.parse('2026-10-06T12:00:00Z'), n = 0;
  return new LocalDesignStore(() => storage, () => new Date(t += 1000), () => `d${++n}`);
}

/** What the tests read of a store made from its prototype: its methods, and the question it asks (`opening`). */
interface StoreUnderTest<K extends DesignKind> {
  opening?: string | null;
  openRecord(id: string, sure?: boolean): Promise<unknown>;
  save(asNew: boolean): Promise<string | null | void>;
  saveFirst(rec?: DesignRecord<K>): Promise<string | null>;
  unsaved(rec?: DesignRecord<K>): Promise<boolean>;
  render: ReturnType<typeof vi.fn>;
}

/** An ExploreStore over `designs` without its page: everything but the drawing. */
function storeOf<K extends DesignKind>(kind: K, designs: LocalDesignStore, host: ExploreStoreHost<K>): StoreUnderTest<K> {
  return Object.assign(Object.create(ExploreStore.prototype), {
    host, store: designs, kind, texts: STORE_TEXTS[kind], list: [], message: null, renaming: null, deleting: null, opening: null, focusNext: null,
    render: vi.fn(),
  }) as StoreUnderTest<K>;
}

/** The satellite designer's store as SatelliteLevel makes it, over the shared workspace. */
function satelliteStore(ws: SatelliteWorkspace, designs: LocalDesignStore): StoreUnderTest<'satellite'> {
  return storeOf('satellite', designs, {
    current: () => (ws.worked().issues.length ? null : { spec: ws.design, name: ws.design.name.trim(), recordId: ws.recordId }),
    saved: (recordId, name) => ws.saved(recordId, name),
    open: (record) => ws.replace({ design: structuredClone(record.design), recordId: record.id, defaultName: '' }),
    forgotten: (recordId) => { if (ws.recordId === recordId) ws.saved(null); },
    replacing: () => (ws as unknown as { own(): unknown }).own() as never,
  });
}

/** The rocket designer's level without its page: its drafts, the design they make, and its store's host. */
function rocketLevel(state: ExploreState) {
  // the default names `fresh()` gives, which a language switch would give again
  const level = Object.assign(Object.create(ExploreLevel.prototype), { state, result: designResult(state), defaultNames: { remix: 'My Falcon 9', parts: 'My parts' } }) as {
    state: ExploreState; result: ReturnType<typeof designResult>; setMode(m: 'remix' | 'parts'): void;
    replacing(rec?: DesignRecord<'vehicle'>): { design: unknown; recordId: string | null } | null;
  };
  level.setMode = (m) => { level.state.mode = m; level.result = designResult(level.state); };
  const open = vi.fn();
  const host: ExploreStoreHost<'vehicle'> = {
    current: () => (level.result.ok ? { spec: level.result.spec, name: activeDraft(level.state).name, recordId: activeDraft(level.state).recordId } : null),
    saved: (recordId) => { activeDraft(level.state).recordId = recordId; },
    open,
    forgotten: vi.fn(),
    replacing: (rec) => level.replacing(rec),
  };
  return { level, host, open, changed: () => { level.result = designResult(level.state); } };
}

const fresh = (): ExploreState => ({ mode: 'remix', remix: remixDraft('falcon9', 'f9-remix', 'My Falcon 9'), parts: partsDraft('my-parts', 'My parts') });

/** A rocket as the Build page saves it: the spec of a draft. */
function specOf(state: ExploreState): VehicleSpec {
  const r = designResult(state);
  if (!r.ok) throw new Error('a rocket that flies');
  return r.spec;
}

const asVehicle = (rec: DesignRecord | null): DesignRecord<'vehicle'> => {
  if (!rec || !isDesignOf(rec, 'vehicle')) throw new Error('a kept rocket');
  return rec;
};

/** Every design of `kind` that `designs` keeps, read in full. */
const everyKept = async (designs: LocalDesignStore, kind: DesignKind): Promise<DesignRecord[]> =>
  Promise.all((await designs.list(kind)).map(async (d) => (await designs.get(d.id))!));

/** A lesson's desk on THEOS-2 (T01). */
const desk = (): LessonDesk => ({ start: designFromTemplate('theos2', 'slesson', 'Lesson start'), date: '2026-03-20', level: 'high', locked: ['orbit'] });

/** The same design with another array area: a change a student makes. */
const withArray = (d: SatelliteDesign, area: number): SatelliteDesign => ({ ...d, power: { ...d.power, arrayArea: area } });

const kv = new Map<string, string>();
beforeEach(() => {
  kv.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 6, 15, 30));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => kv.get(k) ?? null, setItem: (k: string, v: string) => { kv.set(k, v); }, removeItem: (k: string) => { kv.delete(k); },
  });
  vi.stubGlobal('addEventListener', () => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('M-BUILD-007: opening a saved satellite design over the one on screen', () => {
  it('asks, and replaces nothing, when the design on screen has changes no saved record keeps', async () => {
    const ws = new SatelliteWorkspace();
    const designs = storeWith(memory());
    const kept = await designs.save({ kind: 'satellite', name: 'Kept THEOS-2', design: designFromTemplate('theos2', 'skept', 'Kept THEOS-2') });
    const s = satelliteStore(ws, designs);
    ws.change(withArray(ws.design, 0.123));
    const before = structuredClone(ws.design);

    await s.openRecord(kept.id);
    expect(ws.design).toEqual(before);
    expect(s.opening).toBe(kept.id);

    // "Open without saving": the student chose to drop the changes
    await s.openRecord(kept.id, true);
    expect(ws.design.id).toBe('skept');
    expect(ws.recordId).toBe(kept.id);
    expect(s.opening).toBeNull();
  }, 60_000);

  it('"Save, then open" keeps the changes in the design\'s own record, then opens the other', async () => {
    const ws = new SatelliteWorkspace();
    const designs = storeWith(memory());
    const s = satelliteStore(ws, designs);
    const kept = await designs.save({ kind: 'satellite', name: 'Kept THEOS-2', design: designFromTemplate('theos2', 'skept', 'Kept THEOS-2') });
    // the design on screen, saved once, then changed
    expect(await s.save(false)).toBeNull();
    const mine = ws.recordId!;
    expect(mine).not.toBeNull();
    ws.change(withArray(ws.design, 0.234));
    expect(await s.unsaved()).toBe(true);

    expect(await s.saveFirst()).toBeNull();
    const resaved = await designs.get(mine);
    expect((resaved!.design as SatelliteDesign).power.arrayArea).toBe(0.234);
    expect((await designs.list('satellite')).length).toBe(2);
    await s.openRecord(kept.id);
    expect(ws.recordId).toBe(kept.id);
  }, 60_000);

  it('opens at once over a design that is as it was saved, or never saved and as it started', async () => {
    const designs = storeWith(memory());
    const kept = await designs.save({ kind: 'satellite', name: 'Kept THEOS-2', design: designFromTemplate('theos2', 'skept', 'Kept THEOS-2') });
    const other = await designs.save({ kind: 'satellite', name: 'Kept NAPA-2', design: designFromTemplate('napa2', 'sother', 'Kept NAPA-2') });
    // a new template, untouched
    const ws = new SatelliteWorkspace();
    const s = satelliteStore(ws, designs);
    expect(await s.unsaved()).toBe(false);
    await s.openRecord(kept.id);
    expect(ws.recordId).toBe(kept.id);
    // a kept design, as kept: the name on screen is the record's, and a change made and undone is none
    ws.change(withArray(ws.design, 3));
    ws.change(withArray(ws.design, (kept.design as SatelliteDesign).power.arrayArea));
    await s.openRecord(other.id);
    expect(ws.recordId).toBe(other.id);
    // the next visit: the untouched template kept by this browser is still untouched
    const blank = new SatelliteWorkspace();
    blank.replace({ design: designFromTemplate('theos2', 'snew', 'My THEOS-2'), recordId: null, defaultName: 'My THEOS-2' });
    vi.advanceTimersByTime(1000);
    const next = new SatelliteWorkspace();
    expect(next.design.id).toBe('snew');
    expect(await satelliteStore(next, designs).unsaved()).toBe(false);
    // but the same draft changed before the reload is not
    next.change(withArray(next.design, 0.5));
    vi.advanceTimersByTime(1000);
    const later = new SatelliteWorkspace();
    expect(await satelliteStore(later, designs).unsaved()).toBe(true);
  }, 60_000);

  it('asks when the design\'s record is gone, or the design on screen was changed after it was saved', async () => {
    const designs = storeWith(memory());
    const ws = new SatelliteWorkspace();
    const s = satelliteStore(ws, designs);
    expect(await s.save(false)).toBeNull();
    expect(await s.unsaved()).toBe(false);
    ws.rename('Renamed on screen only');
    expect(await s.unsaved()).toBe(true);
    ws.rename((await designs.get(ws.recordId!))!.name);
    expect(await s.unsaved()).toBe(false);
    // deleted in another tab: the design on screen is the only copy now
    await designs.remove(ws.recordId!);
    expect(await s.unsaved()).toBe(true);
  }, 60_000);
});

describe('M-BUILD-007: a requirements row opened on the bench', () => {
  const tpl = templateDesign('theos2');
  const req = missionRequirements(DEFAULT_FORM);
  const opts = tradeOptionsFor(DEFAULT_FORM, JD0, null);
  const rowA = tradeRow(req, tpl, { revs: 15, days: 1 }, opts)!;
  const rowB = tradeRow(req, tpl, { revs: 29, days: 2 }, opts)!;

  function pageOf(ws: SatelliteWorkspace, designs: LocalDesignStore) {
    const satStore = satelliteStore(ws, designs);
    const opened = vi.fn();
    const page = Object.assign(Object.create(RequirementsPage.prototype), {
      ws, host: { toBench: vi.fn(), opened, designs: () => satStore },
      result: { template: tpl, req, jd: JD0, rows: [rowA, rowB], lifetime: null, formKey: '' },
      opened: null, refused: null, asking: null,
      renderResults: vi.fn(), results: { querySelector: () => null },
    }) as { openRow(row: typeof rowA, sure?: boolean): Promise<void> | void; saveThenOpen(row: typeof rowA): Promise<void>; asking: string | null };
    return { page, opened, satStore };
  }

  it('asks before the row\'s design replaces a bench design with unsaved changes; "Open without saving" opens it', async () => {
    expect(rowA && rowB).toBeTruthy();
    const ws = new SatelliteWorkspace();
    const { page, opened } = pageOf(ws, storeWith(memory()));
    ws.change(withArray(ws.design, 0.321));
    const before = structuredClone(ws.design);

    await page.openRow(rowA);
    expect(ws.design).toEqual(before);
    expect(opened).not.toHaveBeenCalled();
    expect(page.asking).toBe('15/1');

    await page.openRow(rowA, true);
    expect(ws.design.name).toMatch(/^From requirements: 15\/1 at /);
    expect(opened).toHaveBeenCalledTimes(1);
    expect(page.asking).toBeNull();
  }, 60_000);

  it('"Save it, then open" keeps the student\'s own design, though the lesson\'s was brought back before the answer (review of f00b288)', async () => {
    const ws = new SatelliteWorkspace();
    const designs = storeWith(memory());
    const { page, opened } = pageOf(ws, designs);
    ws.change(withArray(ws.design, 0.42));
    const own = ws.design.id;
    ws.enterLesson(desk());
    ws.change(withArray(ws.design, 0.88));
    await page.openRow(rowA);
    expect(page.asking).toBe('15/1');
    // the lesson strip's "open the design", before the answer
    ws.resumeLesson();
    expect(ws.lessonDesk).not.toBeNull();

    await page.saveThenOpen(rowA);
    const saved = await everyKept(designs, 'satellite');
    expect(saved.map((r) => (r.design as SatelliteDesign).id), 'the lesson\'s design kept as one of the student\'s').not.toContain('slesson');
    expect(saved.map((r) => [(r.design as SatelliteDesign).id, (r.design as SatelliteDesign).power.arrayArea])).toEqual([[own, 0.42]]);
    expect(opened).toHaveBeenCalledTimes(1);
    // the lesson's design is still aside, as the student left it
    ws.resumeLesson();
    expect(ws.design.power.arrayArea).toBe(0.88);
  }, 60_000);

  it('opens a row over an untouched row design, or an untouched template, without asking', async () => {
    const ws = new SatelliteWorkspace();
    const { page, opened } = pageOf(ws, storeWith(memory()));
    await page.openRow(rowA);
    expect(opened).toHaveBeenCalledTimes(1);
    await page.openRow(rowB);
    expect(opened).toHaveBeenCalledTimes(2);
    expect(ws.design.name).toMatch(/^From requirements: 29\/2 at /);
    expect(page.asking).toBeNull();
  }, 60_000);
});

describe('M-BUILD-007: a design lesson\'s design is put aside, not replaced', () => {

  it('opening a saved design during a lesson puts the lesson\'s design aside; back at the lesson, it is there as the student left it', async () => {
    const designs = storeWith(memory());
    const kept = await designs.save({ kind: 'satellite', name: 'Kept NAPA-2', design: designFromTemplate('napa2', 'skept', 'Kept NAPA-2') });
    const ws = new SatelliteWorkspace();
    const s = satelliteStore(ws, designs);
    const lesson = desk();
    ws.enterLesson(lesson);
    ws.change(withArray(ws.design, 0.77));
    const work = structuredClone(ws.design);

    // the student's own design (an untouched template) is what the kept one opens over: no question
    await s.openRecord(kept.id);
    expect(ws.lessonDesk).toBeNull();
    expect(ws.recordId).toBe(kept.id);
    expect(ws.locked('orbit')).toBe(false);

    // back to the lesson: its design, date, air and locks, as left
    (ws as unknown as { resumeLesson(): void }).resumeLesson();
    expect(ws.lessonDesk).toBe(lesson);
    expect(ws.design).toEqual(work);
    expect(ws.date).toBe('2026-03-20');
    expect(ws.activityLevel).toBe('high');
    expect(ws.locked('orbit')).toBe(true);
    // the browser keeps the student's own design (the one opened), never the lesson's, in the format it always had
    vi.advanceTimersByTime(1000);
    const keptDraft = JSON.parse(kv.get(SATELLITE_DRAFT_KEY)!);
    expect(Object.keys(keptDraft).sort()).toEqual(['date', 'defaultName', 'design', 'recordId', 'v']);
    expect(keptDraft.recordId).toBe(kept.id);

    // leaving the lesson brings the student's own design back: the one they opened
    ws.leaveLesson();
    expect(ws.lessonDesk).toBeNull();
    expect(ws.recordId).toBe(kept.id);
  }, 60_000);

  it('asks about the student\'s own unsaved design, put on screen with the lesson\'s aside', async () => {
    const designs = storeWith(memory());
    const kept = await designs.save({ kind: 'satellite', name: 'Kept NAPA-2', design: designFromTemplate('napa2', 'skept', 'Kept NAPA-2') });
    const ws = new SatelliteWorkspace();
    const s = satelliteStore(ws, designs);
    ws.change(withArray(ws.design, 0.42));
    const own = structuredClone(ws.design);
    ws.enterLesson(desk());
    ws.change(withArray(ws.design, 0.88));

    await s.openRecord(kept.id);
    expect(s.opening).toBe(kept.id);
    // the design Save would keep is the one at stake, on screen
    expect(ws.lessonDesk).toBeNull();
    expect(ws.design).toEqual(own);
    (ws as unknown as { resumeLesson(): void }).resumeLesson();
    expect(ws.design.power.arrayArea).toBe(0.88);
  }, 60_000);

  it('"Save, then open" keeps the student\'s own design, though the lesson\'s was brought back before the answer (review of f00b288)', async () => {
    const designs = storeWith(memory());
    const kept = await designs.save({ kind: 'satellite', name: 'Kept NAPA-2', design: designFromTemplate('napa2', 'skept', 'Kept NAPA-2') });
    const ws = new SatelliteWorkspace();
    const s = satelliteStore(ws, designs);
    ws.change(withArray(ws.design, 0.42));
    const own = ws.design.id;
    ws.enterLesson(desk());
    ws.change(withArray(ws.design, 0.88));
    await s.openRecord(kept.id);
    expect(s.opening).toBe(kept.id);
    // the lesson strip's "open the design", before the answer
    ws.resumeLesson();
    expect(ws.lessonDesk).not.toBeNull();

    // the answer, as the question's "Save it, then open" gives it
    expect(await s.saveFirst(kept)).toBeNull();
    const saved = (await everyKept(designs, 'satellite')).filter((r) => r.id !== kept.id);
    expect(saved.map((r) => (r.design as SatelliteDesign).id), 'the lesson\'s design kept as one of the student\'s').not.toContain('slesson');
    expect(saved.map((r) => [(r.design as SatelliteDesign).id, (r.design as SatelliteDesign).power.arrayArea])).toEqual([[own, 0.42]]);
    await s.openRecord(kept.id, true);
    expect(ws.recordId).toBe(kept.id);
    // the lesson's design is still aside, as the student left it
    ws.resumeLesson();
    expect(ws.design.power.arrayArea).toBe(0.88);
  }, 60_000);
});

describe('M-BUILD-007: opening a saved rocket over the rocket designer\'s draft', () => {
  async function kept() {
    const designs = storeWith(memory());
    const electron: ExploreState = { ...fresh(), remix: remixDraft('electron', 'my-electron', 'My Electron') };
    const e = asVehicle(await designs.save({ kind: 'vehicle', name: 'My Electron', design: specOf(electron) }));
    const partsState: ExploreState = { ...fresh(), mode: 'parts' };
    partsState.parts.edit.sites = ['vandenberg'];
    const p = asVehicle(await designs.save({ kind: 'vehicle', name: 'My parts', design: specOf(partsState) }));
    expect(draftFromSpec(p.design, p.id).mode).toBe('parts');
    const falcon = fresh();
    falcon.remix.edit.stages[1].stretch = 1.2;
    const f = asVehicle(await designs.save({ kind: 'vehicle', name: 'My Falcon 9', design: specOf(falcon) }));
    expect([draftFromSpec(e.design, e.id).mode, draftFromSpec(f.design, f.id).mode]).toEqual(['remix', 'remix']);
    return { designs, e, p, f };
  }

  it('opens at once over a remix of a catalogue rocket with nothing changed', async () => {
    const { designs, e } = await kept();
    const { host, open } = rocketLevel(fresh());
    await storeOf('vehicle', designs, host).openRecord(e.id);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('asks, and opens nothing, over a changed draft never saved', async () => {
    const { designs, e } = await kept();
    const state = fresh();
    const { host, open, changed } = rocketLevel(state);
    state.remix.edit.stages[0].stretch = 1.2;
    changed();
    const s = storeOf('vehicle', designs, host);
    await s.openRecord(e.id);
    expect(open).not.toHaveBeenCalled();
    expect(s.opening).toBe(e.id);
  });

  it('opens at once over a kept design as kept — a remix and a parts design — and over one whose ratings alone differ (D-75)', async () => {
    const { designs, e, p } = await kept();
    for (const rec of [e, p]) {
      // the draft opened from `rec`, which opening `rec` again replaces (CHANGED BEFORE THE FIX: the first version
      // opened the record of the other kind, which replaces the other draft and so rightly asks nothing)
      const o = draftFromSpec(rec.design, rec.id);
      const state = fresh();
      if (o.mode === 'remix') state.remix = o.draft; else { state.parts = o.draft; state.mode = 'parts'; }
      const { level, host, open, changed } = rocketLevel(state);
      expect(level.result.ok).toBe(true);
      const s = storeOf('vehicle', designs, host);
      await s.openRecord(rec.id);
      expect(open, rec.name).toHaveBeenCalledTimes(1);
      // ratings searched again for it: a rating is computed, not drawn; nor is the payload the figures are read at kept
      activeDraft(state).ratings = { signature: level.result.ok ? level.result.signature : '', payloadLEO: 321, payloadGTO: 54 };
      activeDraft(state).payloadKg += 100;
      changed();
      expect(level.result.ok && level.result.spec.payloadLEO).toBe(321);
      await s.openRecord(rec.id);
      expect(open, rec.name).toHaveBeenCalledTimes(2);
      // a part changed is an edit
      if (o.mode === 'remix') state.remix.edit.stages[0].stretch = 0.9; else state.parts.edit.sites = ['cape'];
      changed();
      await s.openRecord(rec.id);
      expect(open, rec.name).toHaveBeenCalledTimes(2);
      expect(s.opening).toBe(rec.id);
    }
  });

  it('asks about the draft the record would replace, and puts it on screen: a parts design changed while a remix is shown', async () => {
    const { designs, e, p } = await kept();
    const state = fresh();
    state.parts.edit.groups = [{ ...DEFAULT_GROUP }];
    const { level, host, open } = rocketLevel(state);
    const s = storeOf('vehicle', designs, host);
    // a remix opens over the untouched remix: the changed parts design is not touched
    await s.openRecord(e.id);
    expect(open).toHaveBeenCalledTimes(1);
    await s.openRecord(p.id);
    expect(open).toHaveBeenCalledTimes(1);
    expect(s.opening).toBe(p.id);
    expect(level.state.mode).toBe('parts');
  });

  it('"Save, then open" keeps the changed draft in its own record, then opens', async () => {
    // CHANGED BEFORE THE FIX: the first version opened the parts record `p`, which does not replace this remix
    const { designs, e, f } = await kept();
    const o = draftFromSpec(e.design, e.id);
    const state = fresh();
    if (o.mode !== 'remix') throw new Error('a remix');
    state.remix = o.draft;
    state.remix.edit.stages[0].stretch = 1.1;
    const { level, host, open, changed } = rocketLevel(state);
    changed();
    const s = storeOf('vehicle', designs, host);
    await s.openRecord(f.id);
    expect(open).not.toHaveBeenCalled();
    expect(await s.saveFirst()).toBeNull();
    const resaved = asVehicle(await designs.get(e.id));
    expect(level.result.ok && resaved.design).toEqual(level.result.ok ? level.result.spec : null);
    expect((await designs.list('vehicle')).length).toBe(3);
    expect(await s.unsaved(f)).toBe(false);
  });

  it('"Save, then open" keeps the draft the question was about, though the other draft was shown before the answer (review of f00b288)', async () => {
    const { designs, p } = await kept();
    const state = fresh();
    state.parts.edit.groups = [{ ...DEFAULT_GROUP }];
    const { level, host, open } = rocketLevel(state);
    const parts = specOf({ ...state, mode: 'parts' });
    const s = storeOf('vehicle', designs, host);
    await s.openRecord(p.id);
    expect(s.opening).toBe(p.id);
    // the student looks at the untouched remix before answering
    level.setMode('remix');

    // the answer, as the question's "Save it, then open" gives it
    expect(await s.saveFirst(p)).toBeNull();
    expect(state.remix.recordId, 'the untouched remix was saved in place of the changed parts design').toBeNull();
    expect(state.parts.recordId).not.toBeNull();
    expect(asVehicle(await designs.get(state.parts.recordId!)).design).toEqual(parts);
    expect((await designs.list('vehicle')).length).toBe(4);
    await s.openRecord(p.id, true);
    expect(open).toHaveBeenCalledTimes(1);
  });
});

describe('M-BUILD-007: a name typed is a change; a default name given again in another language is not', () => {
  it('in the satellite designer', async () => {
    const designs = storeWith(memory());
    const kept = await designs.save({ kind: 'satellite', name: 'Kept THEOS-2', design: designFromTemplate('theos2', 'skept', 'Kept THEOS-2') });
    const ws = new SatelliteWorkspace();
    const s = satelliteStore(ws, designs);
    ws.rename('My own satellite');
    await s.openRecord(kept.id);
    expect(s.opening).toBe(kept.id);
    expect(ws.design.name).toBe('My own satellite');
    // a new template's default name, given again in Thai, is still the default
    const fresh = new SatelliteWorkspace();
    vi.stubGlobal('document', { documentElement: {} });
    try {
      setLang('th');
      fresh.syncName();
      expect(fresh.design.name).not.toMatch(/^My /);
      expect(await satelliteStore(fresh, designs).unsaved()).toBe(false);
    } finally { setLang('en'); }
  }, 60_000);

  it('in the rocket designer', async () => {
    const designs = storeWith(memory());
    const electron: ExploreState = { ...fresh(), remix: remixDraft('electron', 'my-electron', 'My Electron') };
    const e = asVehicle(await designs.save({ kind: 'vehicle', name: 'My Electron', design: specOf(electron) }));
    const state = fresh();
    const { host, open, changed } = rocketLevel(state);
    state.remix.name = 'Falcon 9, my way';
    changed();
    const s = storeOf('vehicle', designs, host);
    await s.openRecord(e.id);
    expect(open).not.toHaveBeenCalled();
    expect(s.opening).toBe(e.id);
  });
});

/** The question a new start asks before it replaces a design (FX-1 s5), and its three answers. */
interface Asking {
  asking: { name: string } | null;
  answer(choice: 'save' | 'open' | 'cancel'): Promise<void>;
}

/**
 * The designer's question, read where it is kept: in its store ("Your designs"), whose buttons answer it —
 * "Save it, then open", "Open without saving", Cancel (`started(go, save)`).
 */
function withQuestion<T extends object>(level: T, store: object): T & Asking {
  const s = store as { asking?: { name: string } | null; started(go: boolean, save?: boolean): Promise<void> };
  return Object.defineProperties(level, {
    asking: { get: () => s.asking ?? null },
    answer: { value: (choice: 'save' | 'open' | 'cancel') => s.started(choice !== 'cancel', choice === 'save') },
  }) as T & Asking;
}

/** Every promise the level's question waits on, settled. */
const settle = async (): Promise<void> => { await vi.runAllTimersAsync(); };

/**
 * The rocket designer without its page, its store over `designs`: the vehicle picker (`pickBase`), "Start again"
 * (`startOver`) and the Engineer level's "open in Explore" (`openDesign`) are its own methods; the drawing is stubbed.
 */
function rocketDesigner(state: ExploreState, designs: LocalDesignStore) {
  const recompute = (): void => { level.result = designResult(level.state); };
  const level = Object.assign(Object.create(ExploreLevel.prototype), {
    state, result: designResult(state), defaultNames: { remix: 'My Falcon 9', parts: 'My parts' }, visible: false, selected: null,
    compute: recompute, reshaped: recompute,
  }) as Asking & {
    state: ExploreState; result: ReturnType<typeof designResult>; store: StoreUnderTest<'vehicle'>;
    pickBase(id: string): void; startOver(): void; openDesign(spec: VehicleSpec, payloadKg: number): void;
    replacing(rec?: DesignRecord<'vehicle'>): { design: unknown; recordId: string | null } | null;
  };
  level.store = storeOf('vehicle', designs, {
    current: () => (level.result.ok ? { spec: level.result.spec, name: activeDraft(level.state).name, recordId: activeDraft(level.state).recordId } : null),
    saved: (recordId) => { activeDraft(level.state).recordId = recordId; },
    // as Open puts a kept design on screen
    open: (rec) => {
      const o = draftFromSpec(rec.design, rec.id);
      if (o.mode === 'remix') level.state.remix = o.draft; else level.state.parts = o.draft;
      level.state.mode = o.mode;
      recompute();
    },
    forgotten: vi.fn(),
    replacing: (rec) => level.replacing(rec),
  });
  withQuestion(level, level.store);
  return { level, changed: recompute };
}

/** The satellite designer without its page, its store over `designs`: the template picker and "Start again from the template". */
function satelliteDesigner(ws: SatelliteWorkspace, designs: LocalDesignStore) {
  const store = satelliteStore(ws, designs);
  return withQuestion(Object.assign(Object.create(SatelliteLevel.prototype), { ws, store, orbitMessage: null, visible: false }) as {
    store: StoreUnderTest<'satellite'>; pickTemplate(id: string): void;
  }, store);
}

const baseOf = (state: ExploreState): unknown => (state.remix.edit as RemixEdit).base;

describe('M-BUILD-007 (FX-1 s5): the rocket designer\'s vehicle picker, "Start again" and a sized launcher ask too', () => {
  it('the vehicle picker asks before a new remix replaces a changed remix never saved; Cancel keeps it, "Open without saving" replaces it', async () => {
    const state = fresh();
    const { level, changed } = rocketDesigner(state, storeWith(memory()));
    state.remix.edit.stages[0].stretch = 1.2;
    changed();
    level.pickBase('electron');
    await settle();
    expect(baseOf(level.state), 'the changed remix was replaced without asking').toEqual({ kind: 'catalogue', id: 'falcon9' });
    expect(level.state.remix.edit.stages[0].stretch).toBe(1.2);
    expect(level.asking?.name).toBe('Electron remix');
    await level.answer('cancel');
    expect(level.asking).toBeNull();
    expect(level.state.remix.edit.stages[0].stretch).toBe(1.2);

    level.pickBase('electron');
    await settle();
    expect(level.asking).not.toBeNull();
    await level.answer('open');
    expect(baseOf(level.state)).toEqual({ kind: 'catalogue', id: 'electron' });
    expect(level.asking).toBeNull();
  });

  it('the vehicle picker and "Start again" still start at once over a remix as it started', async () => {
    const { level } = rocketDesigner(fresh(), storeWith(memory()));
    level.pickBase('electron');
    expect(baseOf(level.state)).toEqual({ kind: 'catalogue', id: 'electron' });
    level.startOver();
    expect(baseOf(level.state)).toEqual({ kind: 'catalogue', id: 'electron' });
    await settle();
    expect(level.asking).toBeNull();
  });

  it('"Start again" asks over a saved design changed since; "Save it, then open" keeps the change in its record, then starts again', async () => {
    const designs = storeWith(memory());
    const e = asVehicle(await designs.save({ kind: 'vehicle', name: 'My Electron', design: specOf({ ...fresh(), remix: remixDraft('electron', 'my-electron', 'My Electron') }) }));
    const o = draftFromSpec(e.design, e.id);
    if (o.mode !== 'remix') throw new Error('a remix');
    const state = fresh();
    state.remix = o.draft;
    const { level, changed } = rocketDesigner(state, designs);
    state.remix.edit.stages[0].stretch = 1.1;
    changed();
    const edited = specOf(state);
    level.startOver();
    await settle();
    expect(level.state.remix.edit.stages[0].stretch, 'the changed design was started again without asking').toBe(1.1);
    expect(level.asking?.name).toBe('Electron remix');
    await level.answer('save');
    await settle();
    expect(asVehicle(await designs.get(e.id)).design, 'the change was not kept in its record').toEqual(edited);
    expect(level.state.remix.recordId).toBeNull();
    expect(level.state.remix.edit).toEqual(remixDraft('electron', 'x', 'x').edit);
    expect(level.asking).toBeNull();
  });

  it('"Start again" starts at once over a design as it was saved', async () => {
    const designs = storeWith(memory());
    const e = asVehicle(await designs.save({ kind: 'vehicle', name: 'My Electron', design: specOf({ ...fresh(), remix: remixDraft('electron', 'my-electron', 'My Electron') }) }));
    const o = draftFromSpec(e.design, e.id);
    if (o.mode !== 'remix') throw new Error('a remix');
    const state = fresh();
    state.remix = o.draft;
    const { level } = rocketDesigner(state, designs);
    level.startOver();
    await settle();
    expect(level.asking).toBeNull();
    expect(level.state.remix.recordId).toBeNull();
  });

  it('a launcher sized on the Engineer level asks before it replaces a changed parts design; "Open without saving" opens it with its payload', async () => {
    const sized: ExploreState = { ...fresh(), mode: 'parts' };
    sized.parts.edit.sites = ['vandenberg'];
    const spec = specOf(sized);
    expect(draftFromSpec(spec, null).mode).toBe('parts');
    const state = fresh();
    state.parts.edit.groups = [{ ...DEFAULT_GROUP }];
    const { level } = rocketDesigner(state, storeWith(memory()));
    level.openDesign(spec, 500);
    await settle();
    expect(level.state.parts.edit.groups, 'the changed parts design was replaced without asking').toHaveLength(1);
    expect(level.state.mode, 'the parts design asked about is on screen').toBe('parts');
    expect(level.asking).not.toBeNull();
    await level.answer('open');
    expect(level.state.parts.edit.sites).toEqual(['vandenberg']);
    expect(level.state.parts.payloadKg).toBe(500);

    // over a parts design as it started, at once
    const untouched = rocketDesigner(fresh(), storeWith(memory())).level;
    untouched.openDesign(spec, 400);
    expect(untouched.state.mode).toBe('parts');
    expect(untouched.state.parts.payloadKg).toBe(400);
  });

  it('a question left open is about its draft only: once Open replaced that draft, "Open without saving" replaces nothing', async () => {
    const designs = storeWith(memory());
    const e = asVehicle(await designs.save({ kind: 'vehicle', name: 'My Electron', design: specOf({ ...fresh(), remix: remixDraft('electron', 'my-electron', 'My Electron') }) }));
    const state = fresh();
    const { level, changed } = rocketDesigner(state, designs);
    state.remix.edit.stages[0].stretch = 1.2;
    changed();
    level.pickBase('electron');
    await settle();
    expect(level.asking).not.toBeNull();
    // the student answers the store's own question instead: the saved Electron opened without saving
    await level.store.openRecord(e.id, true);
    expect(level.state.remix.recordId).toBe(e.id);
    await level.answer('open');
    expect(level.state.remix.recordId, 'the design opened since was replaced by the stale question').toBe(e.id);
  });
});

describe('M-BUILD-007 (FX-1 s5): the satellite designer\'s template picker and "Start again from the template" ask too', () => {
  it('the template picker asks before a template replaces a design with unsaved changes; Cancel keeps it, "Open without saving" puts the template on', async () => {
    const ws = new SatelliteWorkspace();
    const level = satelliteDesigner(ws, storeWith(memory()));
    const first = ws.design.template;
    expect(first).not.toBe('theos2');
    ws.change(withArray(ws.design, 0.2));
    level.pickTemplate('theos2');
    await settle();
    expect(ws.design.template, 'the changed design was replaced without asking').toBe(first);
    expect(ws.design.power.arrayArea).toBe(0.2);
    expect(level.asking?.name).toBe(defaultNameFor('theos2'));
    await level.answer('cancel');
    expect(level.asking).toBeNull();
    expect(ws.design.power.arrayArea).toBe(0.2);

    level.pickTemplate('theos2');
    await settle();
    await level.answer('open');
    expect(ws.design.template).toBe('theos2');
    expect(ws.recordId).toBeNull();
  });

  it('"Start again from the template" asks too; "Save it, then open" keeps the design first', async () => {
    const designs = storeWith(memory());
    const ws = new SatelliteWorkspace();
    const level = satelliteDesigner(ws, designs);
    const template = ws.design.template;
    const start = ws.design.power.arrayArea;
    ws.change(withArray(ws.design, 0.33));
    level.pickTemplate(template);
    await settle();
    expect(ws.design.power.arrayArea, 'the changed design was started again without asking').toBe(0.33);
    expect(level.asking).not.toBeNull();
    await level.answer('save');
    await settle();
    const all = await everyKept(designs, 'satellite');
    expect(all.map((d) => (d.design as SatelliteDesign).power.arrayArea), 'the change was not kept').toEqual([0.33]);
    expect(ws.design.power.arrayArea).toBe(start);
    expect(ws.recordId).toBeNull();
  });

  it('starts at once over a template as it started, and over a design as it was saved', async () => {
    const designs = storeWith(memory());
    const ws = new SatelliteWorkspace();
    const level = satelliteDesigner(ws, designs);
    level.pickTemplate('theos2');
    expect(ws.design.template).toBe('theos2');
    await level.store.save(false);
    expect(ws.recordId).not.toBeNull();
    level.pickTemplate(ws.design.template === 'napa2' ? 'theos2' : 'napa2');
    await settle();
    expect(level.asking).toBeNull();
    expect(ws.recordId).toBeNull();
  });
});
