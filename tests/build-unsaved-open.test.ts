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
import { DEFAULT_GROUP, activeDraft, designResult, draftFromSpec, partsDraft, remixDraft, type ExploreState } from '../src/design/explore-model';
import { DEFAULT_FORM, missionRequirements, templateDesign, tradeOptionsFor } from '../src/design/requirements-page';
import { tradeRow } from '../src/design/requirement-trades';
import { setLang } from '../src/i18n';
import { ExploreStore, STORE_TEXTS, type ExploreStoreHost } from '../src/ui/build/explore-store';
import { ExploreLevel } from '../src/ui/build/explore-level';
import { RequirementsPage } from '../src/ui/build/requirements-page';
import { SatelliteWorkspace, type LessonDesk } from '../src/ui/build/satellite-workspace';
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
  saveFirst(): Promise<string | null>;
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
    }) as { openRow(row: typeof rowA, sure?: boolean): Promise<void> | void; asking: string | null };
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
  const desk = (): LessonDesk => ({ start: designFromTemplate('theos2', 'slesson', 'Lesson start'), date: '2026-03-20', level: 'high', locked: ['orbit'] });

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
