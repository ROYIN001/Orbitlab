/**
 * Editorial provenance for the shipped curriculum packs. This registry is
 * maintained with the release, never trusted from an imported lesson file.
 * Automated grading tests and human review are separate evidence: a passing
 * simulation cannot approve a curriculum mapping or a translation.
 */
import type { Lang } from '../i18n';
import type { ResolvedPack } from './packs';

export type HumanReview =
  | { status: 'pending' }
  | {
    status: 'reviewed';
    reviewer: string;
    date: string;
    /** A committed review record or public review URL, including its scope. */
    evidence: string;
    /** Application commit reviewed: includes built-in lessons reused by the pack. */
    revision: string;
  };

export interface CurriculumSource {
  titleKey: string;
  url: string;
  locator?: { kind: 'bookPages' | 'pdfPages' | 'section'; value: string };
}

export interface PackReview {
  packId: string;
  /** Exact public JSON this metadata describes; tests fail when it changes. */
  contentSha256: string;
  objectiveKey: string;
  sources: readonly CurriculumSource[];
  owner: HumanReview;
  teacher: HumanReview;
  language: Readonly<Record<Lang, HumanReview>>;
  /** Coverage references, not a claim about the current test run. */
  automatedTests: readonly string[];
  /** No durations supplied until there is a documented estimation method. */
  duration?: { minutes: number; methodKey: string };
}

const IPST_CURRICULUM = 'https://www.ipst.ac.th/wp-content/uploads/2022/05/SciCurriculum_2560.pdf';
const pending = (): HumanReview => ({ status: 'pending' });
const common = () => ({
  owner: pending(), teacher: pending(), language: { en: pending(), ru: pending(), th: pending() },
  automatedTests: ['tests/lesson-packs.test.ts', 'tests/lesson-packs-design.test.ts'],
});
const source = (title: string, url: string, kind?: 'bookPages' | 'pdfPages' | 'section', value?: string): CurriculumSource => ({
  titleKey: `lesson.review.source.${title}`, url,
  ...(kind && value ? { locator: { kind, value } } : {}),
});

/**
 * Source locators come from T03-CURRICULA-RESEARCH.md (2026-10-01), not a new
 * teacher sign-off. None of the existing pending reviews has been promoted.
 */
export const PACK_REVIEWS: Readonly<Record<string, PackReview>> = {
  'ipst-basic': {
    ...common(), packId: 'ipst-basic',
    contentSha256: 'a1b3ade82ea5e59b0c1cad4160d66f2dcc0c6e62c16deb4d0a0c8ccabe1ae4d4',
    objectiveKey: 'lesson.review.objective.ipst-basic',
    sources: [source('ipst', IPST_CURRICULUM, 'bookPages', '65–66, 78, 86–87')],
  },
  'ipst-earth-space': {
    ...common(), packId: 'ipst-earth-space',
    contentSha256: '794729b4403c2a7d64b3a150eb21e51ab481b203a618f86dfb4a6cd3fc8ff3ba',
    objectiveKey: 'lesson.review.objective.ipst-earth-space',
    sources: [
      source('ipst', IPST_CURRICULUM, 'bookPages', '234–237'),
      source('earthGuide', 'https://www.scimath.org/ebook-earthscience/item/8418-2-2560-2551', 'bookPages', '27–29'),
    ],
  },
  'ipst-physics': {
    ...common(), packId: 'ipst-physics',
    contentSha256: '12fabd7d2983c38a0b47197c9586cc4fa972bc41deba2a3ccb9bde55e9cd1539',
    objectiveKey: 'lesson.review.objective.ipst-physics',
    sources: [
      source('ipst', IPST_CURRICULUM, 'bookPages', '76, 192–197, 205, 210'),
      source('physics1', 'https://www.ipst.ac.th/wp-content/uploads/2022/05/PhysicsLO_Group_1.pdf', 'pdfPages', '4–9'),
      source('physics3', 'https://www.ipst.ac.th/wp-content/uploads/2022/05/PhysicsLO_Group_3.pdf', 'pdfPages', '6–7'),
    ],
  },
  'rtaf-academy': {
    ...common(), packId: 'rtaf-academy',
    contentSha256: '325e3843dc968e08a55f280e203f62ff7facf305c429f9b8c1f824a06156896b',
    objectiveKey: 'lesson.review.objective.rtaf-academy',
    sources: [
      source('nkrafa', 'https://nkrafa.rtaf.mi.th/curriculum'),
      source('aero2025', 'https://drive.google.com/file/d/15SNJaSOWqYxHStIKeoSSscdsjA8wii5p/view', 'pdfPages', '18, 118–123'),
      source('aero2020', 'https://drive.google.com/file/d/1DyIWnu86-V63gEAZmlT4z--TrqPkCsG7/view', 'pdfPages', '92'),
      source('electrical2025', 'https://drive.google.com/file/d/1NxWBgELhApDtgvkbgj7EUHsHU6mom8uZ/view', 'pdfPages', '109'),
      source('mechanical2020', 'https://coe.or.th/wp-content/uploads/2023/01/20.-เครื่องกล-ปป-พ.ศ.-2563-โรงเรียนนายเรืออากาศนวมินทกษัตริยาธิราช.pdf', 'pdfPages', '34–35'),
    ],
  },
  'ru-24-05-06': {
    ...common(), packId: 'ru-24-05-06',
    contentSha256: 'ecfa2550adde79a798e2356296f4b4905b7d499d5f57af3cf4f42096d4364197',
    objectiveKey: 'lesson.review.objective.ru-24-05-06',
    sources: [
      source('fgos06', 'https://fgosvo.ru/uploadfiles/FGOS%20VO%203++/Spec/24.05.06_C_3_19022024.pdf', 'pdfPages', '11–12'),
      source('fgos04', 'https://legalacts.ru/doc/prikaz-minobrnauki-rossii-ot-12082020-n-975-ob-utverzhdenii/', 'section', '3.3'),
      source('mai', 'https://priem.mai.ru/base/programs/sistemy-upravleniya-dvizheniem/'),
      source('bauman', 'https://mf.bmstu.ru/direction/?code=24.05.06&id=31'),
    ],
    automatedTests: [...common().automatedTests, 'tests/heavy/lesson-packs-sixdof.test.ts'],
  },
};

/** A boolean imported in a lesson file cannot confer editorial approval. */
export function packReviewStatus(review: PackReview): 'pending' | 'reviewed' {
  return [review.owner, review.teacher, ...Object.values(review.language)].every((r) => r.status === 'reviewed' && validSignoff(r))
    ? 'reviewed' : 'pending';
}

function validSignoff(review: Extract<HumanReview, { status: 'reviewed' }>): boolean {
  const date = new Date(`${review.date}T00:00:00Z`);
  return !!review.reviewer.trim() && !!review.evidence.trim() && /^[0-9a-f]{40}$/.test(review.revision)
    && /^\d{4}-\d{2}-\d{2}$/.test(review.date) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === review.date;
}

/** Release checks: metadata must describe the shipped, usable curriculum. */
export function validatePackReview(review: PackReview, pack: ResolvedPack): string[] {
  const issues: string[] = [];
  if (review.packId !== pack.pack.id) issues.push('packId');
  if (!/^[0-9a-f]{64}$/.test(review.contentSha256)) issues.push('contentSha256');
  if (!review.objectiveKey.trim()) issues.push('objective');
  if (!review.sources.length) issues.push('sources');
  for (const entry of review.sources) {
    try {
      const url = new URL(entry.url);
      if (url.protocol !== 'https:' || url.username || url.password || !entry.titleKey.trim()) issues.push('source');
    } catch { issues.push('source'); }
  }
  const reviews = [review.owner, review.teacher, review.language.en, review.language.ru, review.language.th];
  if (reviews.some((r) => r.status === 'reviewed' && !validSignoff(r))) issues.push('signoff');
  if (pack.pack.reviewed !== (packReviewStatus(review) === 'reviewed')) issues.push('reviewed');
  if (!review.automatedTests.length || review.automatedTests.some((path) => !/^tests\/.+\.test\.ts$/.test(path))) issues.push('automatedTests');
  if (pack.items.some((item) => !item.curriculum.length)) issues.push('curriculum');
  if (review.duration && (!Number.isFinite(review.duration.minutes) || review.duration.minutes <= 0 || !review.duration.methodKey.trim())) issues.push('duration');
  return issues;
}
