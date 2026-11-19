import { readdirSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { browserInventory } from '../../scripts/verification/lib.mjs';
import { JOURNEY_SECONDS, selectShard } from './shard.mjs';

test('partitions odd and even selections exactly once, preserving sorted order', () => {
  for (let length = 1; length <= 30; length++) {
    const journeys = Array.from({ length }, (_, index) => `journey-${index}`);
    const seconds = Object.fromEntries(journeys.map((name, index) => [name, 1 + (index * 7) % 5]));
    assert.equal(selectShard(journeys), journeys);
    for (let total = 1; total <= length; total++) {
      const shards = Array.from({ length: total }, (_, index) => selectShard(journeys, `${index + 1}/${total}`, seconds));
      const union = shards.flat();
      assert.equal(union.length, length);
      assert.equal(new Set(union).size, length);
      assert.deepEqual([...union].sort(), [...journeys].sort());
      for (const shard of shards) {
        assert.ok(shard.length > 0);
        assert.deepEqual(shard, journeys.filter(item => shard.includes(item)));
      }
    }
  }
});

test('rejects malformed, out-of-range and empty shard configurations', () => {
  const seconds = { a: 1, b: 1 }; // both have seconds, so a case can only throw on the check it is there for
  for (const [shards, message] of [
    [['', '2', '-1/2', '1.5/2'], 'shard must be N/M, for example 1/2'],
    [['1/0', '0/2', '3/2', '1/9007199254740992'], 'shard requires 1 <= N <= M'],
    [['1/3'], 'shard count exceeds selected journeys'],
  ]) {
    for (const shard of shards) assert.throws(() => selectShard(['a', 'b'], shard, seconds), { message }, JSON.stringify(shard));
  }
  assert.throws(() => selectShard([], '1/1', seconds), { message: 'shard count exceeds selected journeys' });
});

test('balances by seconds: longest first, ties by name, each to the lightest shard, ties to the lowest', () => {
  const seconds = { a: 1, b: 4, c: 4, d: 9, e: 2, f: 3 };
  const journeys = Object.keys(seconds);
  // d 9 -> 1; b 4 -> 2 (before c, by name); c 4 -> 3; f 3 -> 2 (2 and 3 both at 4); e 2 -> 3; a 1 -> 3 (9, 7, 6)
  const layout = [['d'], ['b', 'f'], ['a', 'c', 'e']];
  assert.deepEqual([1, 2, 3].map(part => selectShard(journeys, `${part}/3`, seconds)), layout);
  // run.mjs passes { name, mod } where the plan has names; neither the shape nor the input order moves a journey
  assert.deepEqual([1, 2, 3].map(part => selectShard(journeys.map(name => ({ name, mod: {} })), `${part}/3`, seconds).map(journey => journey.name)), layout);
  assert.deepEqual([1, 2, 3].map(part => selectShard([...journeys].reverse(), `${part}/3`, seconds)), layout.map(shard => [...shard].reverse()));
  // ties by name in file-name order, as run.mjs lists them: fit-clock.mjs before fit.mjs
  assert.deepEqual(['1/2', '2/2'].map(shard => selectShard(['fit-clock', 'fit'], shard, { fit: 2, 'fit-clock': 2 })), [['fit-clock'], ['fit']]);
  // a missing or zero entry, and a string or array, which passes > 0 but adds as a string
  for (const table of [seconds, { ...seconds, z: 0 }, { ...seconds, z: '30' }, { ...seconds, z: [30] }]) {
    assert.throws(() => selectShard(['a', 'z'], '1/2', table), /^Error: z has no recorded seconds: add its seconds to tests\/browser\/shard-seconds\.json/);
  }
});

test('no shard is empty while there are at least as many journeys as shards, however uneven their seconds', () => {
  const seconds = { a: 1, b: 1, c: 1, d: 1, matrix: 1000 };
  const journeys = Object.keys(seconds);
  for (let total = 1; total <= journeys.length; total++) {
    for (let part = 1; part <= total; part++) assert.ok(selectShard(journeys, `${part}/${total}`, seconds).length > 0, `${part}/${total}`);
  }
});

test('the seconds table has every journey that is not held and only journeys (a held one may keep its entry), each with a positive number of seconds', async () => {
  const journeys = await browserInventory();
  const files = readdirSync(new URL('./journeys', import.meta.url)).filter(file => file.endsWith('.mjs')).map(file => file.slice(0, -4));
  const add = journeys.filter(name => !Object.hasOwn(JOURNEY_SECONDS, name));
  const remove = Object.keys(JOURNEY_SECONDS).filter(name => !files.includes(name));
  assert.deepEqual({ add, remove }, { add: [], remove: [] }, `tests/browser/shard-seconds.json: add ${add.join(', ') || 'nothing'} (its CI seconds; until CI has timed it, half its timeoutMs, or half of 180 s when it exports none); remove ${remove.join(', ') || 'nothing'}`);
  for (const [name, value] of Object.entries(JOURNEY_SECONDS)) assert.ok(Number.isFinite(value) && value > 0, `${name}: ${JSON.stringify(value)} is not a positive number of seconds`);
});
