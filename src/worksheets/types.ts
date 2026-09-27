/**
 * Worksheets (roadmap E05): a printable sheet of questions about a flight
 * flown in this simulator, one per student with their own numbers, and an
 * answer key in a separate file. Plain data, built DOM-free (`build.ts`) and
 * rendered to HTML (`html.ts`) or DOCX (`docx.ts`).
 */
import type { Lang } from '../i18n';

/** A picture: an SVG drawn for the sheet, or an image file the page embeds. */
export interface WsFigure {
  caption?: string;
  svg?: string;
  /** an image by its address (a vehicle's photograph); the page supplies its bytes */
  image?: string;
}

/** How the student answers. */
export type WsKind = 'number' | 'choice' | 'multi' | 'order';

export interface WsItem {
  kind: WsKind;
  /** a stable name for the question, where something reads its answer (a case sheet's, graded as a lesson: src/worksheets/case-ids.ts) */
  id?: string;
  prompt: string;
  /** for a number: its unit, printed after the answer box */
  unit?: string;
  /** a choice or several answers: the options, lettered; an ordering: the items to number */
  options?: string[];
  figure?: WsFigure;
  answer: {
    /** the answer as the key prints it */
    text: string;
    /** a number's value, and how close counts as right */
    value?: number;
    tolerance?: string;
    /** the tolerance as a number, in the unit of `value` */
    tol?: number;
    /** a choice's right option, counted from 0 */
    index?: number;
    /** how it is worked out, with the flight's own numbers */
    working?: string;
  };
}

export interface WsSection {
  title: string;
  intro?: string;
  /** a two-column table printed before the items (the mission, the events) */
  table?: Array<[string, string]>;
  /** pictures printed before the items (the flight's charts) */
  figures?: WsFigure[];
  items: WsItem[];
}

export interface Worksheet {
  lang: Lang;
  title: string;
  subtitle: string;
  /** the student it was drawn for ('' for a sheet without a name) */
  student: string;
  /** the class code and the seed drawn from it: the key is found by them */
  code: string;
  seed: number;
  generatedAt: Date;
  sections: WsSection[];
  /** the line at the foot of the sheet, where it is not the flight's (P2.5: a case from the record) */
  footer?: string;
}
