/**
 * The placement test (roadmap E03): the bank reads cleanly in three languages,
 * every draw has the same shape, the seed re-creates a test exactly, a
 * post-test asks different questions, every calculation has an answer for
 * every number it can draw, and the scoring turns answers into levels,
 * misconceptions and a place to start.
 */
import { describe, expect, it } from 'vitest';
import { BANK_ISSUES, BUILTIN_QUESTIONS, FLIGHT_DATA, questionBank } from '../src/lessons/assessment/bank';
import { BLUEPRINT, DOMAIN_ORDER, TEST_LENGTH, drawTest, nextKind, prepareQuestion, rng } from '../src/lessons/assessment/draw';
import { compileExpression, evaluate } from '../src/lessons/assessment/expression';
import { DOMAIN_PREREQUISITES, domainLevel, gradeQuestion, numericExpected, scoreAttempt } from '../src/lessons/assessment/score';
import { BUILTIN_LESSONS } from '../src/lessons/catalog';
import { DOMAINS, type Domain } from '../src/lessons/types';
import type { Answer, AssessmentAttempt, PreparedQuestion, Question } from '../src/lessons/assessment/types';
import { VEHICLE_PHOTOS } from '../src/lessons/assessment/photos';
import { readQuestion, type FileIssue } from '../src/lessons/lesson-file';
import { DIAGRAM_IDS, diagramSvg } from '../src/lessons/assessment/diagrams';

const CYRILLIC = /\p{Script=Cyrillic}/u;
const THAI = /\p{Script=Thai}/u;
const byId = new Map(BUILTIN_QUESTIONS.map((q) => [q.id, q]));

/** A student who answers every question correctly (sure of it) or wrongly (sure of it). */
function answer(q: Question, p: PreparedQuestion, correct: boolean, confidence: Answer['confidence'] = 'sure'): Answer {
  switch (q.type) {
    case 'choice': {
      const right = q.options.findIndex((o) => o.correct);
      return { id: q.id, value: correct ? right : (right + 1) % q.options.length, confidence };
    }
    case 'vehicle': return { id: q.id, value: correct ? p.vehicle! : p.vehicleOptions!.find((v) => v !== p.vehicle)!, confidence };
    case 'numeric': return { id: q.id, value: (numericExpected(q, p) ?? 0) * (correct ? 1.001 : 1.5), confidence };
    case 'multi': {
      const right = q.options.flatMap((o, i) => (o.correct ? [i] : []));
      // wrong: the right ones and one more
      const wrong = [...right, q.options.findIndex((o) => !o.correct)].sort((a, b) => a - b);
      return { id: q.id, value: (correct ? right : wrong).join(','), confidence };
    }
    case 'order': {
      const right = q.items.map((_, i) => i);
      return { id: q.id, value: (correct ? right : [right[1], right[0], ...right.slice(2)]).join(','), confidence };
    }
  }
}

function attempt(seed: number, correctIn: (q: Question) => boolean, confidence: Answer['confidence'] = 'sure'): AssessmentAttempt {
  const questions = drawTest(BUILTIN_QUESTIONS, seed);
  return {
    kind: 'pre', seed, startedAt: '2026-09-25T00:00:00Z', finishedAt: '2026-09-25T00:15:00Z', questions,
    answers: questions.map((p) => answer(byId.get(p.id)!, p, correctIn(byId.get(p.id)!), confidence)),
  };
}

describe('the question bank', () => {
  it('reads without a single issue: 157 questions, at least 25 in every area', () => {
    expect(BANK_ISSUES).toEqual([]);
    expect(BUILTIN_QUESTIONS.length).toBe(157);
    expect(new Set(BUILTIN_QUESTIONS.map((q) => q.id)).size).toBe(157);
    for (const d of DOMAINS) expect(BUILTIN_QUESTIONS.filter((q) => q.domain === d).length, `area ${d}`).toBeGreaterThanOrEqual(25);
  });

  it('asks in every kind: choices, calculations, vehicles, orderings, several answers, charts and diagrams', () => {
    const types = new Set(BUILTIN_QUESTIONS.map((q) => q.type));
    expect([...types].sort()).toEqual(['choice', 'multi', 'numeric', 'order', 'vehicle']);
    const figures = new Set(BUILTIN_QUESTIONS.flatMap((q) => (q.figure ? [q.figure.kind] : [])));
    expect([...figures].sort()).toEqual(['chart', 'diagram']);
    // every diagram a question names is drawn, with the numbers a student may draw
    for (const q of BUILTIN_QUESTIONS) {
      if (q.figure?.kind !== 'diagram') continue;
      expect(DIAGRAM_IDS, q.id).toContain(q.figure.id);
      for (let seed = 1; seed <= 5; seed++) expect(diagramSvg(q.figure.id, prepareQuestion(q, rng(seed)).values)).toMatch(/^<svg[^]*<\/svg>$/);
    }
    // a multiple answer has two or more right and one or more wrong; an ordering is never shown already in order
    for (const q of BUILTIN_QUESTIONS) {
      if (q.type === 'multi') {
        const right = q.options.filter((o) => o.correct).length;
        expect(right >= 2 && right < q.options.length, q.id).toBe(true);
      }
      if (q.type === 'order') for (let seed = 1; seed <= 50; seed++) expect(prepareQuestion(q, rng(seed)).order!.every((v, i) => v === i), `${q.id} ${seed}`).toBe(false);
    }
  });

  it('carries Russian in Cyrillic and Thai in Thai script in every prompt, option and explanation', () => {
    for (const q of BUILTIN_QUESTIONS) {
      const options = q.type === 'choice' || q.type === 'multi' ? q.options : [];
      const texts = [q.prompt, q.explanation, ...options.flatMap((o) => [o.text, ...(o.misconception ? [o.misconception] : [])]), ...(q.type === 'order' ? q.items : [])];
      for (const t of texts) {
        // an option that is only a formula or a number reads the same in every language
        if (t.th === t.en) continue;
        expect(t.ru, `${q.id}: ${t.en}`).toMatch(CYRILLIC);
        expect(t.th, `${q.id}: ${t.en}`).toMatch(THAI);
      }
    }
  });

  it('holds at least twice as many questions as one test asks, at every area and level', () => {
    for (const domain of DOMAINS) {
      const levels = BLUEPRINT[domain];
      for (const level of [1, 2, 3] as const) {
        const need = levels.filter((l) => l === level).length;
        const have = BUILTIN_QUESTIONS.filter((q) => q.domain === domain && q.level === level).length;
        expect(have, `area ${domain} level ${level}`).toBeGreaterThanOrEqual(2 * need);
      }
    }
  });

  it('names only lessons that exist, and asks understanding questions with a misconception on a wrong option', () => {
    const lessons = new Set(BUILTIN_LESSONS.map((l) => l.id));
    for (const q of BUILTIN_QUESTIONS) {
      for (const id of q.lessons ?? []) expect(lessons.has(id), `${q.id} → ${id}`).toBe(true);
      if (q.kind === 'understanding' && (q.type === 'choice' || q.type === 'multi')) expect(q.options.some((o) => !o.correct && o.misconception), q.id).toBe(true);
      // an ordering has no wrong option to name a misunderstanding: it asks for knowledge
      if (q.type === 'order') expect(q.kind, q.id).toBe('knowledge');
    }
  });

  it('has an answer for every number a calculation can draw, and a placeholder in the prompt for each', () => {
    for (const q of BUILTIN_QUESTIONS) {
      if (q.type !== 'numeric') continue;
      // a number drawn into a diagram is read off it, not printed in the prompt
      if (q.figure?.kind !== 'diagram') for (const p of q.params) for (const lang of ['en', 'ru', 'th'] as const) expect(q.prompt[lang], `${q.id} ${lang}`).toContain(`{${p.name}}`);
      for (const corner of [0, 1]) {
        const values = Object.fromEntries(q.params.map((p) => [p.name, corner ? p.max : p.min]));
        const v = evaluate(q.answer, values);
        expect(Number.isFinite(v) && v > 0, `${q.id} at ${JSON.stringify(values)}: ${v}`).toBe(true);
      }
    }
  });

  it('shows only charts of flights that were recorded, with the series they hold', () => {
    for (const q of BUILTIN_QUESTIONS) {
      for (const fig of [q.figure, q.type === 'choice' ? q.observe : undefined]) {
        if (fig?.kind !== 'chart') continue;
        for (const id of [fig.dataset, ...(fig.compare ?? [])]) expect(FLIGHT_DATA[id]?.series[fig.series]?.length, `${q.id} ${id}.${fig.series}`).toBeGreaterThan(10);
      }
    }
  });

  it('has a picture of every vehicle a question can show', () => {
    const pictures = Object.keys(import.meta.glob('../public/lessons/vehicles/*.jpg')).map((p) => p.replace(/^.*\/(.+)\.jpg$/, '$1'));
    for (const q of BUILTIN_QUESTIONS) if (q.type === 'vehicle') for (const v of q.vehicles) expect(pictures, `${q.id}: ${v}`).toContain(v);
    // every photograph is credited, and every credit has its photograph
    expect(Object.keys(VEHICLE_PHOTOS).sort()).toEqual([...pictures].sort());
    for (const [id, c] of Object.entries(VEHICLE_PHOTOS)) {
      expect(c.source, id).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      if (/^CC BY/.test(c.license)) expect(c.licenseUrl, id).toMatch(/^https:\/\/creativecommons\.org\//);
    }
  });

  it('checks the numbers the charts are asked about: max-Q at about T+50 s, MECO later with an engine out', () => {
    const f9 = FLIGHT_DATA['f9-leo'];
    const q = f9.series.q!;
    const peak = f9.t[q.indexOf(Math.max(...q))];
    expect(peak).toBeGreaterThan(44);
    expect(peak).toBeLessThan(56);
    const meco = (d: typeof f9) => d.events.find(([, k]) => k === 'evt.meco')![0];
    expect(meco(FLIGHT_DATA['f9-leo-engine-out']) - meco(f9)).toBeGreaterThan(5);
    const soyuz = FLIGHT_DATA['soyuz-iss'];
    expect(soyuz.events.find(([, k]) => k === 'evt.boosterSep')![0]).toBeCloseTo(120, -1);
  });
});

describe('a draw', () => {
  it('asks 25 questions, the same number from each area at each level, in the areas\' order', () => {
    expect(TEST_LENGTH).toBe(25);
    for (const seed of [1, 2, 3, 42, 0xdeadbeef]) {
      const drawn = drawTest(BUILTIN_QUESTIONS, seed).map((p) => byId.get(p.id)!);
      expect(drawn.length).toBe(25);
      const shape = drawn.map((q) => `${q.domain}:${q.level}`);
      expect(shape).toEqual(DOMAIN_ORDER.flatMap((d) => BLUEPRINT[d].map((l) => `${d}:${l}`)));
      // no skill twice in one area while the bank allows it
      for (const d of DOMAINS) {
        const skills = drawn.filter((q) => q.domain === d).map((q) => q.skill);
        expect(new Set(skills).size, `seed ${seed} area ${d}: ${skills}`).toBe(skills.length);
      }
    }
  });

  it('is re-created exactly from its seed, and differs between seeds', () => {
    expect(drawTest(BUILTIN_QUESTIONS, 7)).toEqual(drawTest(BUILTIN_QUESTIONS, 7));
    const a = new Set(drawTest(BUILTIN_QUESTIONS, 7).map((p) => p.id));
    const b = drawTest(BUILTIN_QUESTIONS, 8).map((p) => p.id);
    expect(b.filter((id) => a.has(id)).length).toBeLessThan(20);
  });

  it('gives a post-test none of the placement test\'s questions', () => {
    const pre = drawTest(BUILTIN_QUESTIONS, 11);
    const post = drawTest(BUILTIN_QUESTIONS, 12, new Set(pre.map((p) => p.id)));
    expect(post.filter((p) => pre.some((x) => x.id === p.id))).toEqual([]);
    expect(nextKind([])).toBe('pre');
    expect(nextKind([{ kind: 'pre', finishedAt: 'x' }])).toBe('post');
  });

  it('draws each calculation\'s numbers on their steps, within their range', () => {
    const q = byId.get('r-tsiolkovsky-calc')!;
    if (q.type !== 'numeric') throw new Error();
    const random = rng(5);
    for (let i = 0; i < 50; i++) {
      const p = prepareQuestion(q, random);
      for (const def of q.params) {
        const v = p.values![def.name];
        expect(v).toBeGreaterThanOrEqual(def.min);
        expect(v).toBeLessThanOrEqual(def.max);
        expect(Math.abs((v - def.min) / def.step - Math.round((v - def.min) / def.step))).toBeLessThan(1e-9);
      }
    }
  });

  it('shows a vehicle among three others from its own list', () => {
    const q = byId.get('b-vehicle-distinct')!;
    const p = prepareQuestion(q, rng(3));
    expect(p.vehicleOptions).toHaveLength(4);
    expect(p.vehicleOptions).toContain(p.vehicle);
    if (q.type === 'vehicle') for (const v of p.vehicleOptions!) expect(q.vehicles).toContain(v);
  });
});

describe('scoring', () => {
  it('scores all right as strong everywhere, with nothing to recommend but skipping', () => {
    const r = scoreAttempt(attempt(3, () => true), BUILTIN_QUESTIONS, BUILTIN_LESSONS);
    expect(r.percent).toBe(100);
    expect(r.domains.every((d) => d.level === 'strong')).toBe(true);
    expect(r.start).toBeNull();
    expect(Object.values(r.advice).every((a) => a === 'skip')).toBe(true);
  });

  it('counts a lucky guess as half, and a wrong answer the student was sure of as a misconception', () => {
    const q = byId.get('b-float')!;
    const p = prepareQuestion(q, rng(1));
    expect(gradeQuestion(q, p, answer(q, p, true, 'guess')).credit).toBe(0.5);
    const wrong = gradeQuestion(q, p, { id: q.id, value: 1, confidence: 'sure' });
    expect(wrong.misconception).toBe(true);
    expect(wrong.misconceptionText?.en).toContain('gravity vanishes');
    expect(gradeQuestion(q, p, { id: q.id, value: 1, confidence: 'unsure' }).misconception).toBe(false);
    expect(gradeQuestion(q, p, { id: q.id, value: null }).unknown).toBe(true);
  });

  it('starts a student strong in orbits and weak in control at a written lesson on control, and has them skip the orbit lessons', () => {
    const r = scoreAttempt(attempt(9, (q) => q.domain !== 5), BUILTIN_QUESTIONS, BUILTIN_LESSONS);
    expect(r.domains.find((d) => d.domain === 5)!.level).toBe('beginner');
    expect(r.startDomain).toBe(5);
    const start = BUILTIN_LESSONS.find((l) => l.id === r.start)!;
    expect(start.comingSoon).toBeFalsy();
    expect(start.domains).toContain(5);
    expect(r.advice['orbit-first']).toBe('skip');
    expect(r.advice['ctl-margins']).toBe('review');
  });

  it('never starts at a lesson still to be written', () => {
    for (let seed = 1; seed < 40; seed++) {
      const r = scoreAttempt(attempt(seed, (q) => (q.id.length + seed) % 3 !== 0), BUILTIN_QUESTIONS, BUILTIN_LESSONS);
      if (r.start) expect(BUILTIN_LESSONS.find((l) => l.id === r.start)!.comingSoon, `seed ${seed}`).toBeFalsy();
    }
  });

  it('sends a student weak in the basics and in orbits back to the foundations first', () => {
    const r = scoreAttempt(attempt(9, (q) => q.domain !== 1 && q.domain !== 2 && q.domain !== 4), BUILTIN_QUESTIONS, BUILTIN_LESSONS);
    // area 4 rests on area 2, which rests on area 1: the start is the basics' first lesson
    expect(DOMAIN_PREREQUISITES[4]).toContain(2);
    expect(DOMAIN_PREREQUISITES[2]).toContain(1);
    expect(r.startDomain).toBe(1);
    expect(r.start).toBe('orbit-first');
  });

  it('grades several answers only when exactly the right ones are chosen, and an ordering only in full', () => {
    const multi = byId.get('o-multi-perigee-burn')! as Extract<Question, { type: 'multi' }>;
    const p = prepareQuestion(multi, rng(3));
    expect(gradeQuestion(multi, p, { id: multi.id, value: '0,1,2', confidence: 'sure' }).correct).toBe(true);
    expect(gradeQuestion(multi, p, { id: multi.id, value: '2,1,0', confidence: 'sure' }).correct).toBe(true);
    expect(gradeQuestion(multi, p, { id: multi.id, value: '0,1', confidence: 'sure' }).correct).toBe(false);
    // a wrong option chosen with certainty names its misunderstanding
    const wrong = gradeQuestion(multi, p, { id: multi.id, value: '0,1,2,3', confidence: 'sure' });
    expect(wrong.misconception).toBe(true);
    expect(wrong.misconceptionText?.en).toContain('where the engine fires');
    const order = byId.get('o-order-period')! as Extract<Question, { type: 'order' }>;
    const po = prepareQuestion(order, rng(3));
    expect(gradeQuestion(order, po, { id: order.id, value: '0,1,2,3,4' }).correct).toBe(true);
    expect(gradeQuestion(order, po, { id: order.id, value: '0,1,2,4,3' }).correct).toBe(false);
    expect(gradeQuestion(order, po, { id: order.id, value: '0,1,2' }).correct).toBe(false);
    expect(gradeQuestion(order, po, { id: order.id, value: null }).unknown).toBe(true);
  });

  it('marks an area with a misconception no better than basic, however high its score', () => {
    expect(domainLevel(90, 1)).toBe('basic');
    expect(domainLevel(90, 0)).toBe('strong');
    expect(domainLevel(40, 0)).toBe('beginner');
  });
});

describe('expressions', () => {
  it('evaluate arithmetic, powers, functions in degrees and the constants, and nothing else', () => {
    expect(evaluate('2 + 3 * 4^2 / 8', {})).toBe(8);
    expect(evaluate('-2^2', {})).toBe(-4);
    expect(evaluate('sin(30) * 2', {})).toBeCloseTo(1, 12);
    expect(evaluate('sqrt(mu / R) / 1000', {})).toBeCloseTo(7.905, 3);
    expect(evaluate('x * 2', { x: 4 })).toBe(8);
    expect(() => compileExpression('alert(1)', [])).toThrow(/unknown function/);
    expect(() => compileExpression('y + 1', ['x'])).toThrow(/unknown name/);
    expect(() => compileExpression('(1 + 2', [])).toThrow(/expected/);
    expect(Number.isNaN(evaluate('1 +', {}))).toBe(true);
  });
});

describe('a teacher\'s question', () => {
  it('is read with its calculation checked, and refused with the reason when it cannot be used', () => {
    const issues: FileIssue[] = [];
    const base = { id: 't1', domain: 2, level: 2, kind: 'knowledge', prompt: { en: 'Δv for {m}?' }, explanation: { en: 'Because.' } };
    expect(readQuestion({ ...base, type: 'numeric', params: [{ name: 'm', min: 1, max: 2, step: 1 }], answer: 'm * 2', unit: 'm/s', tolPct: 2 }, 'q', issues, new Set())).not.toBeNull();
    expect(readQuestion({ ...base, type: 'numeric', params: [{ name: 'm', min: 1, max: 2, step: 1 }], answer: 'n * 2', unit: '', tolPct: 2 }, 'q', issues, new Set())).toBeNull();
    expect(readQuestion({ ...base, type: 'choice', options: [{ text: { en: 'a' }, correct: true }, { text: { en: 'b' }, correct: true }] }, 'q', issues, new Set())).toBeNull();
    expect(readQuestion({ ...base, type: 'choice', options: [{ text: { en: 'a' }, correct: true }, { text: { en: 'b' } }], figure: { kind: 'chart', dataset: 'nope', series: 'q' } }, 'q', issues, new Set())).toBeNull();
    // several answers: two or more right, one or more wrong; an ordering: three or more items; a diagram that exists
    const opts = (right: number, n: number) => Array.from({ length: n }, (_, i) => ({ text: { en: `o${i}` }, ...(i < right ? { correct: true } : {}) }));
    expect(readQuestion({ ...base, type: 'multi', options: opts(2, 4) }, 'q', issues, new Set())).not.toBeNull();
    expect(readQuestion({ ...base, type: 'multi', options: opts(1, 4) }, 'q', issues, new Set())).toBeNull();
    expect(readQuestion({ ...base, type: 'order', items: [{ en: 'a' }, { en: 'b' }, { en: 'c' }] }, 'q', issues, new Set())).not.toBeNull();
    expect(readQuestion({ ...base, type: 'order', items: [{ en: 'a' }, { en: 'b' }] }, 'q', issues, new Set())).toBeNull();
    expect(readQuestion({ ...base, type: 'choice', options: opts(1, 3), figure: { kind: 'diagram', id: 'hohmann' } }, 'q', issues, new Set())).not.toBeNull();
    expect(readQuestion({ ...base, type: 'choice', options: opts(1, 3), figure: { kind: 'diagram', id: 'nope' } }, 'q', issues, new Set())).toBeNull();
    expect(issues.filter((i) => i.level === 'error').map((i) => i.code)).toEqual(['expression', 'invalid', 'invalid', 'invalid', 'invalid', 'invalid']);
    // a teacher's question joins the bank without replacing a built-in one
    const custom = { ...BUILTIN_QUESTIONS[0], id: 'teacher-q', custom: true } as Question;
    expect(questionBank([custom, BUILTIN_QUESTIONS[1]]).length).toBe(158);
  });
});

// the areas the recommendation walks through all have lessons or a fallback
it('has lessons for every area but the basics, which start at the first lesson', () => {
  for (const d of DOMAINS.filter((x) => x !== 1) as Domain[]) expect(BUILTIN_LESSONS.some((l) => l.domains.includes(d)), `area ${d}`).toBe(true);
});
