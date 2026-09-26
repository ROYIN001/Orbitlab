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
}
