/**
 * The canonical bytes of a value, and the digest of a sequence of values (plan S20-T1, Task A,
 * Step 1): what the T-1 checks hash a worker's answers with, so that two builds' answers can be
 * compared by one hash each. It runs unchanged in Node and in a page: no imports, only the
 * language, TextEncoder and Web Crypto. Loaded into a page as an inline module script, it also
 * puts its two functions on `window` (tests/browser/t1/worker-digests.mjs).
 *
 * The rule, each value written as a one-byte tag and what follows it:
 *   - `u` undefined, `n` null, `t` true, `f` false;
 *   - `d` a number: the sixteen hex digits (ASCII) of its IEEE-754 double, big-endian; every NaN
 *     is written as 7ff8000000000000, so NaN equals NaN; 0 and -0 differ;
 *   - `s` a string: its UTF-8 byte length as eight hex digits, then the bytes;
 *   - `D` a Date: its time value, written as a number (`d` and sixteen hex digits);
 *   - `B` a typed array, DataView or ArrayBuffer: the name of its type and its byte length, each
 *     as above, then the bytes of its own view;
 *   - `a` an array: its length as eight hex digits, then each element in order (a hole as undefined);
 *   - `o` any other object: its count of own enumerable string keys as eight hex digits, then for
 *     each key in sorted order the key as a string and its value;
 *   - a Map or a Set is an error, as are a function, a symbol and a bigint.
 * Every value's bytes say where they end, so a sequence of values cannot be read two ways.
 */

const encoder = new TextEncoder();
const scratch = new DataView(new ArrayBuffer(8));
const HEX = '0123456789abcdef';

/** A growing byte buffer. */
function writer() {
  let buf = new Uint8Array(1 << 16), len = 0;
  const room = (n) => {
    if (len + n <= buf.length) return;
    let size = buf.length * 2;
    while (size < len + n) size *= 2;
    const next = new Uint8Array(size);
    next.set(buf.subarray(0, len));
    buf = next;
  };
  return {
    byte(b) { room(1); buf[len++] = b; },
    bytes(u8) { room(u8.length); buf.set(u8, len); len += u8.length; },
    ascii(text) { room(text.length); for (let i = 0; i < text.length; i++) buf[len++] = text.charCodeAt(i); },
    done() { return buf.slice(0, len); },
  };
}

const tag = (c) => c.charCodeAt(0);

function hex8(n) {
  if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) throw new RangeError(`canonicalBytes: a length out of range: ${n}`);
  return n.toString(16).padStart(8, '0');
}

function numberHex(x) {
  if (Number.isNaN(x)) return '7ff8000000000000';
  scratch.setFloat64(0, x);
  let out = '';
  for (let i = 0; i < 8; i++) { const b = scratch.getUint8(i); out += HEX[b >> 4] + HEX[b & 15]; }
  return out;
}

function writeString(w, s) {
  const bytes = encoder.encode(s);
  w.byte(tag('s'));
  w.ascii(hex8(bytes.length));
  w.bytes(bytes);
}

function writeValue(w, v, path) {
  switch (typeof v) {
    case 'undefined': w.byte(tag('u')); return;
    case 'boolean': w.byte(tag(v ? 't' : 'f')); return;
    case 'number': w.byte(tag('d')); w.ascii(numberHex(v)); return;
    case 'string': writeString(w, v); return;
    case 'object': break;
    default: throw new TypeError(`canonicalBytes: a ${typeof v} at ${path} has no canonical form`);
  }
  if (v === null) { w.byte(tag('n')); return; }
  const kind = Object.prototype.toString.call(v).slice(8, -1);
  if (kind === 'Map' || kind === 'Set' || kind === 'WeakMap' || kind === 'WeakSet') {
    throw new TypeError(`canonicalBytes: a ${kind} at ${path} has no canonical form`);
  }
  if (kind === 'Date') {
    w.byte(tag('D'));
    w.byte(tag('d'));
    w.ascii(numberHex(v.getTime()));
    return;
  }
  if (ArrayBuffer.isView(v) || kind === 'ArrayBuffer' || kind === 'SharedArrayBuffer') {
    const view = ArrayBuffer.isView(v) ? new Uint8Array(v.buffer, v.byteOffset, v.byteLength) : new Uint8Array(v);
    w.byte(tag('B'));
    writeString(w, kind);
    w.ascii(hex8(view.length));
    w.bytes(view);
    return;
  }
  if (Array.isArray(v)) {
    w.byte(tag('a'));
    w.ascii(hex8(v.length));
    for (let i = 0; i < v.length; i++) writeValue(w, v[i], `${path}[${i}]`);
    return;
  }
  const keys = Object.keys(v).sort();
  w.byte(tag('o'));
  w.ascii(hex8(keys.length));
  for (const key of keys) {
    writeString(w, key);
    writeValue(w, v[key], `${path}.${key}`);
  }
}

/** The canonical bytes of `value`, as a Uint8Array. Throws on a Map, a Set or a value with no canonical form. */
export function canonicalBytes(value) {
  const w = writer();
  writeValue(w, value, '$');
  return w.done();
}

/** The SHA-256 of the canonical bytes of the sequence `values` (an array), as 64 hex digits. */
export async function digest(values) {
  if (!Array.isArray(values)) throw new TypeError('digest: the values must be an array, the sequence to hash');
  const hash = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', canonicalBytes(values)));
  let out = '';
  for (const b of hash) out += HEX[b >> 4] + HEX[b & 15];
  return out;
}

if (typeof window !== 'undefined') Object.assign(window, { canonicalBytes, digest });
