import { describe, expect, it } from 'vitest';
import { BUNDLED_PACKS, packPath, readPackText, type ResolvedPack } from '../src/lessons/packs';
import { PACK_REVIEWS, packReviewStatus, validatePackReview, type HumanReview } from '../src/lessons/review';
import { reviewEn, reviewRu, reviewTh } from '../src/i18n/review';

const FILES = import.meta.glob('../public/lessons/packs/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const TESTS = import.meta.glob('./**/*.test.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const RESEARCH = import.meta.glob('../docs/history/phase4-2026-10-01/T03-CURRICULA-RESEARCH.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const packs = BUNDLED_PACKS.map((id) => readPackText(FILES[`../public/${packPath(id)}`], packPath(id))!);

describe('curriculum pack review provenance', () => {
  it('describes every shipped pack, retaining pending human reviews and actual curriculum codes', () => {
    expect(Object.keys(PACK_REVIEWS).sort()).toEqual([...BUNDLED_PACKS].sort());
    for (const pack of packs) {
      expect(pack).not.toBeNull();
      const review = PACK_REVIEWS[pack.pack.id];
      expect(validatePackReview(review, pack), pack.pack.id).toEqual([]);
      expect(packReviewStatus(review)).toBe('pending');
      expect([review.owner, review.teacher, ...Object.values(review.language)]).toEqual(Array(5).fill({ status: 'pending' }));
      expect(review.duration).toBeUndefined();
      for (const test of review.automatedTests) expect(TESTS[`./${test.slice('tests/'.length)}`], test).toBeDefined();
    }
  });

  it('binds provenance to the released bytes so edits require a deliberate metadata update', async () => {
    for (const id of BUNDLED_PACKS) {
      const bytes = new TextEncoder().encode(FILES[`../public/${packPath(id)}`]);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      expect(hex, id).toBe(PACK_REVIEWS[id].contentSha256);
    }
  });

  it('cites actual documented URLs and localizes each goal, source and review label', () => {
    const research = Object.values(RESEARCH).join('\n');
    for (const dictionary of [reviewRu, reviewTh]) expect(Object.keys(dictionary).sort()).toEqual(Object.keys(reviewEn).sort());
    for (const review of Object.values(PACK_REVIEWS)) {
      for (const key of [review.objectiveKey, ...review.sources.map((source) => source.titleKey)]) {
        for (const dictionary of [reviewEn, reviewRu, reviewTh]) expect(dictionary[key], key).toBeTruthy();
      }
      for (const source of review.sources) expect(research, source.url).toContain(source.url);
    }
    for (const [key, value] of Object.entries(reviewEn)) {
      for (const dictionary of [reviewRu, reviewTh]) {
        const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        expect(placeholders(dictionary[key]), key).toEqual(placeholders(value));
      }
      expect(reviewRu[key], key).toMatch(/\p{Script=Cyrillic}/u);
      expect(reviewTh[key], key).toMatch(/\p{Script=Thai}/u);
    }
  });

  it('never treats the old reviewed boolean or partial sign-offs as completed human review', () => {
    const review = structuredClone(PACK_REVIEWS['ipst-basic']);
    const pack = structuredClone(packs.find((p) => p.pack.id === 'ipst-basic')!) as ResolvedPack;
    pack.pack.reviewed = true;
    expect(validatePackReview(review, pack)).toContain('reviewed');
    // Synthetic reviewer evidence exercises the gate; it is never shipped as a sign-off.
    const signoff: HumanReview = { status: 'reviewed', reviewer: 'Test fixture', date: '2026-10-01', evidence: 'tests/fixture-review.md', revision: 'a'.repeat(40) };
    review.owner = signoff;
    expect(packReviewStatus(review)).toBe('pending');
    review.teacher = signoff;
    review.language = { en: signoff, ru: signoff, th: signoff };
    expect(packReviewStatus(review)).toBe('reviewed');
    expect(validatePackReview(review, pack)).toEqual([]);
    review.owner = { ...signoff, evidence: '' };
    expect(packReviewStatus(review)).toBe('pending');
    expect(validatePackReview(review, pack)).toContain('signoff');
    review.owner = { ...signoff, date: '2026-02-30' };
    expect(validatePackReview(review, pack)).toContain('signoff');
  });

  it('rejects unsafe source URLs, unidentified revisions and unsupported time estimates', () => {
    const review = structuredClone(PACK_REVIEWS['ipst-basic']);
    const pack = packs.find((p) => p.pack.id === review.packId)!;
    review.sources = [{ titleKey: 'test', url: 'javascript:alert(1)' }];
    review.contentSha256 = 'unknown';
    review.duration = { minutes: 0, methodKey: '' };
    expect(validatePackReview(review, pack)).toEqual(expect.arrayContaining(['source', 'contentSha256', 'duration']));
    review.sources = [{ titleKey: 'test', url: 'https://user:password@example.com/' }];
    expect(validatePackReview(review, pack)).toContain('source');
  });
});
