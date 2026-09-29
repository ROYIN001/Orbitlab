/**
 * The placement test's recorded flights (roadmap E03, src/lessons/assessment/
 * flights.json) are this simulator's own flights: flown again here, they must
 * come out as the file holds them. `npx vitest run tests/assessment-flights.test.ts -u`
 * rewrites the file after a deliberate change to the physics.
 */
import { describe, expect, it } from 'vitest';
import { recordAll } from '../src/lessons/assessment/record';

describe('the placement test\'s recorded flights', () => {
  it('are the flights this simulator flies', { timeout: 120_000 }, async () => {
    const data = recordAll();
    await expect(`${JSON.stringify(data)}\n`).toMatchFileSnapshot('../src/lessons/assessment/flights.json');
  });
});
