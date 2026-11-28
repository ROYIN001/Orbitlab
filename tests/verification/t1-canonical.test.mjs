// The canonical bytes that the T-1 checks hash a worker's answers with (plan S20-T1, Task A, Step 1;
// tests/browser/t1/canonical.mjs). Each case is a property of the rule, so that two answers the rule
// calls different cannot share a digest, and two it calls the same cannot have two.
import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalBytes, digest } from '../browser/t1/canonical.mjs';

const hex = (bytes) => Buffer.from(bytes).toString('hex');
const same = (a, b) => assert.equal(hex(canonicalBytes(a)), hex(canonicalBytes(b)));
const differ = (a, b) => assert.notEqual(hex(canonicalBytes(a)), hex(canonicalBytes(b)));

test('canonicalBytes gives bytes, and the same bytes for the same value twice', () => {
  const value = { a: [1, 'x', null, true, false, undefined], b: { c: new Date(0) } };
  assert.ok(canonicalBytes(value) instanceof Uint8Array);
  same(value, structuredClone(value));
});

test('0 and -0 differ', () => {
  differ(0, -0);
  differ([0], [-0]);
});

test('NaN equals NaN, however it was made', () => {
  same(NaN, NaN);
  same(NaN, 0 / 0);
  same(NaN, Math.sqrt(-1));
  same({ x: NaN }, { x: Number('not a number') });
});

test('Infinity and -Infinity differ from each other and from any finite number', () => {
  differ(Infinity, -Infinity);
  for (const finite of [0, -0, 1, -1, Number.MAX_VALUE, -Number.MAX_VALUE, Number.MIN_VALUE, 1e308]) {
    differ(Infinity, finite);
    differ(-Infinity, finite);
  }
  differ(Infinity, NaN);
  differ(-Infinity, NaN);
});

test('a number is its IEEE-754 double: one bit apart is different', () => {
  differ(0.1 + 0.2, 0.3);
  differ(1, 1 + Number.EPSILON);
  same(0.1 + 0.2, 0.30000000000000004);
});

test('an object\'s keys are taken in sorted order', () => {
  same({ a: 1, b: 2 }, { b: 2, a: 1 });
  same({ z: { y: 1, x: 2 }, a: 0 }, { a: 0, z: { x: 2, y: 1 } });
});

test('a key holding undefined differs from no key', () => {
  differ({ a: undefined }, {});
  differ({ a: undefined }, { a: null });
});

test('an array is taken in order, and its length counts', () => {
  differ([1, 2], [2, 1]);
  differ([1, 2], [1, 2, undefined]);
  differ([[1], 2], [1, [2]]);
});

test('a number differs from the string of its digits', () => {
  differ(1, '1');
  differ({ a: 1 }, { a: '1' });
});

test('true, false, null and undefined are four distinct values', () => {
  const tags = [true, false, null, undefined, 0, '', [], {}];
  for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) differ(tags[i], tags[j]);
});

test('a string is its UTF-8 bytes with their length: no two sequences of strings run together', () => {
  differ(['ab', 'c'], ['a', 'bc']);
  differ('é', 'é');
  same('ไทย русский', 'ไทย русский');
  differ({ ab: 'c' }, { a: 'bc' });
});

test('two Dates of one instant are equal; a Date differs from its time value as a number', () => {
  same(new Date(Date.UTC(2026, 8, 15, 12)), new Date('2026-09-15T12:00:00Z'));
  differ(new Date(0), new Date(1));
  differ(new Date(0), 0);
  differ(new Date(0), { $date: 0 });
});

test('a Float64Array differs from the plain array of its numbers, and from another typed array of the same bytes', () => {
  const numbers = [1, 2.5, -3];
  differ(new Float64Array(numbers), numbers);
  same(new Float64Array(numbers), new Float64Array(numbers));
  differ(new Float64Array(numbers), new Float64Array([1, 2.5, -4]));
  const bytes = new Uint8Array(new Float64Array(numbers).buffer);
  differ(new Float64Array(numbers), bytes);
  differ(new Float64Array(numbers), bytes.buffer);
  differ(new Int32Array([1, 2]), new Uint32Array([1, 2]));
});

test('a typed array is the bytes of its own view, not of the whole buffer under it', () => {
  const buffer = new Float64Array([9, 1, 2, 9]).buffer;
  same(new Float64Array(buffer, 8, 2), new Float64Array([1, 2]));
});

test('a change at depth three changes the digest', async () => {
  const a = { flight: { stage: { thrust: 1000 } }, list: [1, 2, 3] };
  const b = { flight: { stage: { thrust: 1000.0000000000001 } }, list: [1, 2, 3] };
  assert.notEqual(await digest([a]), await digest([b]));
  const c = structuredClone(a);
  c.flight.stage.thrust = 1000;
  assert.equal(await digest([a]), await digest([c]));
});

test('digest is the SHA-256 of the sequence, in hex, and depends on the order of the sequence', async () => {
  const d = await digest([1, 'two', { three: 3 }]);
  assert.match(d, /^[0-9a-f]{64}$/);
  assert.equal(d, await digest([1, 'two', { three: 3 }]));
  assert.notEqual(d, await digest(['two', 1, { three: 3 }]));
  assert.notEqual(d, await digest([1, 'two']));
  assert.notEqual(await digest([]), await digest([undefined]));
});

test('a Map or a Set is an error', () => {
  assert.throws(() => canonicalBytes(new Map([[1, 2]])), /Map/);
  assert.throws(() => canonicalBytes(new Set([1])), /Set/);
  assert.throws(() => canonicalBytes({ deep: [{ s: new Set() }] }), /Set/);
});

// Review round: three values whose bytes could be shared with another's are refused.
test('a string holding a lone surrogate is an error (its UTF-8 bytes would be those of U+FFFD)', () => {
  assert.throws(() => canonicalBytes('\uD800'), /surrogate/);
  assert.throws(() => canonicalBytes({ key: 'a\uDC00b' }), /surrogate/);
  assert.throws(() => canonicalBytes({ ['\uD83D']: 1 }), /surrogate/);
  same('🚀', '\u{1F680}');
});

test('an object of a kind the rule does not name is an error: an Error, a RegExp, a boxed number', () => {
  assert.throws(() => canonicalBytes(new Error('x')), /no canonical form/);
  assert.throws(() => canonicalBytes(/x/g), /no canonical form/);
  assert.throws(() => canonicalBytes(Object(1)), /no canonical form/);
  assert.throws(() => canonicalBytes({ deep: [new Boolean(false)] }), /no canonical form/);
  same(Object.create(null), {});
});

test('an array with a hole is an error (a hole would read as undefined)', () => {
  // eslint-disable-next-line no-sparse-arrays
  assert.throws(() => canonicalBytes([1, , 3]), /hole/);
  assert.throws(() => canonicalBytes(new Array(2)), /hole/);
  same([1, undefined, 3], [1, undefined, 3]);
});
