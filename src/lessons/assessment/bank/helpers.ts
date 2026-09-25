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
