import { describe, expect, it } from 'vitest';
import { subjectOf, subjectRef } from '../src/design/warning-text';

describe('R3.5 a check\'s part, as the builder card it is about', () => {
  it('a stage its own card, every strap-on group the strap-ons\' card, the fairing its card', () => {
    expect(subjectRef({ kind: 'stage', n: 1 })).toBe('stage:0');
    expect(subjectRef({ kind: 'stage', n: 3 })).toBe('stage:2');
    expect(subjectRef({ kind: 'strapOns', n: 2 })).toBe('strapons');
    expect(subjectRef({ kind: 'fairing' })).toBe('fairing');
  });

  it('round-trips the subjects the checks are given', () => {
    expect(subjectRef(subjectOf({ stage: 2 })!)).toBe('stage:2');
    expect(subjectRef(subjectOf({ booster: 0 })!)).toBe('strapons');
  });
});
