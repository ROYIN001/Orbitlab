/**
 * Short ways to write the placement test's questions (roadmap E03). They
 * build the same plain objects a teacher's file holds; the bank is read
 * through `readQuestion`, so a question written here is held to the file
 * format.
 */
type Text = { en: string; ru: string; th: string };
type Kind = 'knowledge' | 'understanding';

/** A text in English, Russian and Thai. */
export const T = (en: string, ru: string, th: string): Text => ({ en, ru, th });

export interface Extra { lessons?: string[]; figure?: unknown; observe?: unknown; fixedOrder?: boolean }

/** An option; `miss` names the misunderstanding a wrong one reveals. */
export const O = (text: Text, correct = false, miss?: Text) => ({ text, ...(correct ? { correct: true } : {}), ...(miss ? { misconception: miss } : {}) });

export const K: Kind = 'knowledge';
export const U: Kind = 'understanding';

export const choice = (id: string, domain: number, level: number, kind: Kind, skill: string, prompt: Text,
  options: ReturnType<typeof O>[], explanation: Text, extra: Extra = {}) =>
  ({ id, domain, level, kind, skill, type: 'choice', prompt, options, explanation, ...extra });

export const numeric = (id: string, domain: number, level: number, kind: Kind, skill: string, prompt: Text,
  params: Array<{ name: string; min: number; max: number; step: number }>, answer: string, unit: string, tolPct: number,
  explanation: Text, extra: Extra = {}) =>
  ({ id, domain, level, kind, skill, type: 'numeric', prompt, params, answer, unit, tolPct, explanation, ...extra });

export const vehicle = (id: string, domain: number, level: number, skill: string, prompt: Text, vehicles: string[], explanation: Text) =>
  ({ id, domain, level, kind: 'knowledge' as Kind, skill, type: 'vehicle', prompt, vehicles, explanation });

/** The recorded flights' chart (`flights.json`). */
export const chart = (dataset: string, series: string, compare?: string[], tMax?: number) =>
  ({ kind: 'chart', dataset, series, ...(compare ? { compare } : {}), ...(tMax ? { tMax } : {}) });

/** Choose every right option: two or more are marked `correct`. */
export const multi = (id: string, domain: number, level: number, kind: Kind, skill: string, prompt: Text,
  options: ReturnType<typeof O>[], explanation: Text, extra: Extra = {}) =>
  ({ id, domain, level, kind, skill, type: 'multi', prompt, options, explanation, ...extra });

/** Put the items in order: they are written here in the right order. */
export const order = (id: string, domain: number, level: number, kind: Kind, skill: string, prompt: Text,
  items: Text[], explanation: Text, extra: Extra = {}) =>
  ({ id, domain, level, kind, skill, type: 'order', prompt, items, explanation, ...extra });

/** A diagram drawn for the question (`diagrams.ts`). */
export const diagram = (id: string) => ({ kind: 'diagram', id });

/** The four letters of a diagram's marks, as options in their own order; `right` is the correct one. */
export const letters = (right: string, miss: Partial<Record<string, Text>> = {}, all = ['A', 'B', 'C', 'D']) =>
  all.map((l) => O(T(l, l, l), l === right, miss[l]));
