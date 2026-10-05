/**
 * A lesson pack's displayed identity (its title, audience and curriculum
 * label, in every language) carries no military service or academy name
 * (DEC:D-2; plan v2.0 D-42 (ก), CO-7). The pack id `rtaf-academy`, its lesson
 * ids and its source citations (the description's bibliography and the
 * curriculum codes) are not displayed identity and are left as they are.
 * Both the pack sources and the generated files under public/lessons/packs/
 * are held to it.
 */
import { describe, expect, it } from 'vitest';
import { PACK_SOURCES } from '../src/lessons/pack-sources/index';
import { classroomEn, classroomRu, classroomTh } from '../src/i18n/classroom';

/**
 * Names that may not appear in a pack's displayed identity, in EN, TH and RU:
 * the academy's full and short names, its acronym, and the service's name.
 */
const DENIED: readonly RegExp[] = [
  /air\s*force/i,
  /\bRTAF\b/i,
  /NKRAFA/i,
  /Navaminda/i,
  /Kasatriyadhiraj/i,
  /academy/i,
  /นายเรืออากาศ/,
  /นวมินทกษัตริยาธิราช/,
  /กองทัพอากาศ/,
  /ทอ\./,
  /ВВС/,
  /военно-воздушн/i,
  /академи/i,
  /Навамин/i,
];

/**
 * Pack ids whose displayed identity may carry an institution's name because
 * docs/DECISIONS.md records the institution's written permission. Empty: no
 * such permission exists (DEC:D-2; D-42 (ก): the name returns only when it does).
 */
const PERMITTED_PACKS: readonly string[] = [];

const FIELDS = ['title', 'audience', 'framework'] as const;
const LANGS = ['en', 'th', 'ru'] as const;

type Localised = Partial<Record<(typeof LANGS)[number], string>>;
type PackIdentity = { id: string } & Partial<Record<(typeof FIELDS)[number], Localised>>;

function hits(pack: PackIdentity): string[] {
  if (PERMITTED_PACKS.includes(pack.id)) return [];
  const found: string[] = [];
  for (const field of FIELDS) {
    for (const lang of LANGS) {
      const text = pack[field]?.[lang] ?? '';
      for (const re of DENIED) if (re.test(text)) found.push(`${pack.id}.${field}.${lang} matches ${re}: ${text}`);
    }
  }
  return found;
}

/** The generated pack files, as the app ships them. */
const FILES = import.meta.glob('../public/lessons/packs/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('lesson pack names (DEC:D-2, D-42)', () => {
  it('every pack shows its title, audience and framework in all three languages', () => {
    for (const source of Object.values(PACK_SOURCES)) {
      for (const field of FIELDS) for (const lang of LANGS) expect(source.pack[field]?.[lang], `${source.pack.id}.${field}.${lang}`).toBeTruthy();
    }
  });

  it('no pack source names a service or academy in its displayed identity', () => {
    const found = Object.values(PACK_SOURCES).flatMap((s) => hits(s.pack as PackIdentity));
    expect(found).toEqual([]);
  });

  it('no generated pack file names a service or academy in its displayed identity', () => {
    const texts = Object.values(FILES);
    expect(texts.length).toBe(Object.keys(PACK_SOURCES).length);
    const found = texts.flatMap((text) => hits(JSON.parse(text).pack as PackIdentity));
    expect(found).toEqual([]);
  });

  it('keeps the pack id and its lesson ids (stored progress is keyed by them)', () => {
    const rtaf = PACK_SOURCES['rtaf-academy'];
    expect(rtaf.pack.id).toBe('rtaf-academy');
    expect(rtaf.pack.reviewed).toBe(false);
    expect(rtaf.pack.contents.map((c) => c.id)).toEqual(['rtaf-napa1-sso', 'rtaf-elements', 'ctl-inspector', 'ctl-margins', 'adv-docking', 'rtaf-6u-adcs']);
    expect(rtaf.lessons.map((l) => (l as { id: string }).id)).toEqual(['rtaf-napa1-sso', 'rtaf-elements', 'rtaf-6u-adcs']);
  });

  // the classroom panel's own label for each pack (shown when its file has not loaded)
  it('no classroom pack label names a service or academy', () => {
    const found: string[] = [];
    for (const [lang, dict] of [['en', classroomEn], ['ru', classroomRu], ['th', classroomTh]] as const) {
      for (const [key, text] of Object.entries(dict)) {
        const id = key.startsWith('classroom.pack.') ? key.slice('classroom.pack.'.length) : null;
        if (!id || PERMITTED_PACKS.includes(id)) continue;
        for (const re of DENIED) if (re.test(text)) found.push(`${key}.${lang} matches ${re}: ${text}`);
      }
    }
    expect(found).toEqual([]);
  });
});
