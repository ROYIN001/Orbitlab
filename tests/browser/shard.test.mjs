import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectShard } from './shard.mjs';

test('partitions odd and even selections exactly once, preserving sorted order', () => {
  for (let length = 1; length <= 30; length++) {
    const journeys = Array.from({ length }, (_, index) => `journey-${index}`);
    assert.equal(selectShard(journeys), journeys);
    for (let total = 1; total <= length; total++) {
      const shards = Array.from({ length: total }, (_, index) => selectShard(journeys, `${index + 1}/${total}`));
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
  for (const shard of ['', '2', '1/0', '0/2', '3/2', '-1/2', '1.5/2', '1/3', '1/9007199254740992']) {
    assert.throws(() => selectShard(['a', 'b'], shard));
  }
  assert.throws(() => selectShard([], '1/1'));
});
