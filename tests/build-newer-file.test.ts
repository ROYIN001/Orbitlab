/**
 * FX-1 (M-BUILD-008, P2; D-22): a design file saved by a newer version of
 * Orbitlab. Any field of the design this version does not know refuses the
 * whole file (`known` in src/config/vehicle-spec.ts and
 * src/config/satellite-design.ts), yet a newer file the import took said, in
 * all three languages, that "anything this version does not know was left
 * out" (nothing was), and a newer file it refused for a field it did not know
 * said only that the design could not be used, the field named in English
 * under "Technical detail".
 *
 * Plan v2.0 S10 §10.4 and D-22 (b, "refuse the file, and correct the
 * message"): the behaviour stays — such a file is refused, nothing kept — and
 * the message matches it. A newer file taken whole says this version read
 * every part of its design; a newer file refused says so, and names the
 * fields this version does not know, in the reader's language.
 *
 * Vitest runs in `node` (no DOM): the store is made from its prototype, its
 * drawing stubbed, over the real design store (as in build-unsaved-open).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DESIGN_FORMAT_VERSION, LocalDesignStore, designDocument, parseDesignDocument, type DesignKind, type DesignKinds, type DesignStorage,
} from '../src/design/design-store';
import { vehicleById } from '../src/data/vehicles';
import { designFromTemplate } from '../src/design/satellite-model';
import { setLang, type Lang } from '../src/i18n';
import { ExploreStore, STORE_TEXTS, type ExploreStoreHost } from '../src/ui/build/explore-store';
import type { VehicleSpec } from '../src/types';

function memory(): DesignStorage {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
}

const designsIn = (): LocalDesignStore => {
  const storage = memory();
  let n = 0;
  return new LocalDesignStore(() => storage, () => new Date('2026-10-07T12:00:00Z'), () => `d${++n}`);
};

const rocket = (): VehicleSpec => ({ ...structuredClone(vehicleById('falcon9')), id: 'my-falcon', name: 'My Falcon', derivedFrom: 'falcon9' });
const satellite = () => designFromTemplate('napa2', 'my-napa', 'My NAPA-2');

/** A design file as a newer version of Orbitlab would write it: the next format version. */
function newerFile<K extends DesignKind>(kind: K, name: string, design: DesignKinds[K], change?: (d: Record<string, unknown>) => void): File {
  const doc = { ...designDocument({ id: 'x', kind, name, created: 'c', updated: 'u', design }), version: DESIGN_FORMAT_VERSION + 1 };
  const raw = JSON.parse(JSON.stringify(doc)) as { design: Record<string, unknown> };
  change?.(raw.design);
  return { text: async () => JSON.stringify(raw) } as unknown as File;
}

/** A rocket with a field this version does not know at the top and one in an engine. */
const twoNewFields = (d: Record<string, unknown>): void => {
  d.hull = 'composite';
  ((d.stages as Record<string, unknown>[])[1].engine as Record<string, unknown>).cooling = 'regenerative';
};
/** A satellite with a field this version does not know in its power system. */
const newPowerField = (d: Record<string, unknown>): void => { (d.power as Record<string, unknown>).tracking = true; };

type Message = { level: 'ok' | 'warn' | 'error'; text: string; extra?: string };
interface StoreUnderTest { message: Message | null; importFile(file: File): Promise<void> }

/** A designer's store over `designs` without its page, and what it handed on. */
function storeOf<K extends DesignKind>(kind: K, designs: LocalDesignStore) {
  const open = vi.fn(), other = vi.fn();
  const host: ExploreStoreHost<K> = { current: () => null, saved: vi.fn(), open, forgotten: vi.fn(), replacing: () => null, other };
  const store = Object.assign(Object.create(ExploreStore.prototype), {
    host, store: designs, kind, texts: STORE_TEXTS[kind], list: [], message: null, renaming: null, deleting: null, opening: null, focusNext: null,
    render: vi.fn(),
  }) as StoreUnderTest;
  return { store, open, other };
}

/** The old message's claim that unknown parts were left out, in each language. */
const LEFT_OUT: Record<Lang, RegExp> = { en: /left out/, th: /ข้ามไป/, ru: /пропущен/ };
/** That the file comes from a newer version, in each language. */
const NEWER: Record<Lang, RegExp> = { en: /newer version/, th: /ใหม่กว่า/, ru: /более новой версией/ };
/** That nothing was imported, in each language. */
const NOTHING: Record<Lang, RegExp> = { en: /nothing was imported/, th: /ไม่ได้นำเข้าอะไร/, ru: /ничего не импортировано/ };
const LANGS: readonly Lang[] = ['en', 'th', 'ru'];

beforeEach(() => {
  vi.stubGlobal('document', { documentElement: {} });
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
});
afterEach(() => {
  setLang('en');
  vi.unstubAllGlobals();
});

describe('M-BUILD-008: a design file from a newer version that this version reads whole', () => {
  for (const lang of LANGS) {
    it(`is kept and opened, and says it is newer without claiming anything was left out (${lang})`, async () => {
      setLang(lang);
      const designs = designsIn();
      const { store, open } = storeOf('vehicle', designs);
      await store.importFile(newerFile('vehicle', 'From the future', rocket()));
      expect(open).toHaveBeenCalledTimes(1);
      expect(await designs.list()).toHaveLength(1);
      expect(store.message!.level).toBe('warn');
      expect(store.message!.text).toMatch(NEWER[lang]);
      expect(store.message!.text).not.toMatch(LEFT_OUT[lang]);
    });
  }

  it('says the same when it holds the other kind of design, handed to its own designer', async () => {
    setLang('th');
    const designs = designsIn();
    const { store, other } = storeOf('vehicle', designs);
    await store.importFile(newerFile('satellite', 'Future NAPA', satellite()));
    expect(other).toHaveBeenCalledTimes(1);
    const text = other.mock.calls[0][1] as string;
    expect(text).toMatch(NEWER.th);
    expect(text).not.toMatch(LEFT_OUT.th);
  });
});

describe('M-BUILD-008: a design file from a newer version with fields this version does not know', () => {
  it('is refused whole, its unknown fields named by the parser', () => {
    const doc = { ...designDocument({ id: 'x', kind: 'vehicle', name: 'X', created: 'c', updated: 'u', design: rocket() }), version: DESIGN_FORMAT_VERSION + 1 };
    const raw = JSON.parse(JSON.stringify(doc)) as { design: Record<string, unknown> };
    twoNewFields(raw.design);
    const parsed = parseDesignDocument(raw);
    expect(parsed.input).toBeNull();
    expect(parsed.issues.find((i) => i.code === 'invalid')).toMatchObject({ fields: ['hull', 'stages[1].engine.cooling'] });
    // a file of this version with a field it does not know was not written by Orbitlab: refused, no newer version to blame
    const own = JSON.parse(JSON.stringify({ ...doc, version: DESIGN_FORMAT_VERSION })) as { design: Record<string, unknown> };
    twoNewFields(own.design);
    const ownParsed = parseDesignDocument(own);
    expect(ownParsed.input).toBeNull();
    expect(ownParsed.issues.find((i) => i.code === 'invalid')).not.toHaveProperty('fields');
  });

  for (const lang of LANGS) {
    it(`keeps nothing, and says so in the reader's language, naming the fields (${lang})`, async () => {
      setLang(lang);
      const designs = designsIn();
      const { store, open } = storeOf('vehicle', designs);
      await store.importFile(newerFile('vehicle', 'From the future', rocket(), twoNewFields));
      expect(open).not.toHaveBeenCalled();
      expect(await designs.list()).toEqual([]);
      const message = store.message!;
      expect(message.level).toBe('error');
      // the fields are named in the message itself, not only in the English technical detail
      expect(message.text).toContain('hull');
      expect(message.text).toContain('stages[1].engine.cooling');
      expect(message.text).toMatch(NEWER[lang]);
      expect(message.text).toMatch(NOTHING[lang]);
      expect(message.text).not.toMatch(LEFT_OUT[lang]);
      expect(message.extra).toBe('hull is not a field of this version; stages[1].engine.cooling is not a field of this version');
    });
  }

  it('names a satellite\'s, in its own designer and in the rocket designer', async () => {
    setLang('ru');
    for (const kind of ['satellite', 'vehicle'] as const) {
      const designs = designsIn();
      const { store, open, other } = storeOf(kind, designs);
      await store.importFile(newerFile('satellite', 'Future NAPA', satellite(), newPowerField));
      expect(open).not.toHaveBeenCalled();
      expect(other).not.toHaveBeenCalled();
      expect(await designs.list()).toEqual([]);
      expect(store.message!.level).toBe('error');
      expect(store.message!.text).toContain('power.tracking');
      expect(store.message!.text).toMatch(NEWER.ru);
      expect(store.message!.text).toMatch(NOTHING.ru);
    }
  });

  it('a newer file refused for a value, not a field, is still called a design this version cannot use', async () => {
    const designs = designsIn();
    const { store } = storeOf('vehicle', designs);
    await store.importFile(newerFile('vehicle', 'Too hot', rocket(), (d) => {
      ((d.stages as Record<string, unknown>[])[1].engine as Record<string, unknown>).ispVac = 3000;
    }));
    expect(await designs.list()).toEqual([]);
    expect(store.message).toMatchObject({ level: 'error', text: 'The rocket in this file is not one this version can fly, so nothing was imported.' });
  });
});
