import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeJpegJs, jpegMetadata, jpegSegments, RECORD_PATH } from '../../scripts/jpeg-identical.mjs';

// T-offset (D-38): JPEGs re-encoded losslessly keep the pixels and metadata
// recorded from their bytes before the re-encode (scripts/jpeg-identical.mjs).
const recorded = JSON.parse(readFileSync(RECORD_PATH, 'utf8')).files;
const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url));

for (const [path, want] of Object.entries(recorded)) {
  test(`${path} decodes to the pixels recorded before its lossless re-encode, with the same metadata`, () => {
    const bytes = read(path);
    const meta = jpegMetadata(bytes);
    assert.equal(meta.sha256, want.metadataSha256, `frame header, quantisation tables or APPn/COM segments changed (${meta.segments.join(' ')})`);
    assert.equal(meta.trailing, 0, 'bytes after EOI');
    assert.deepEqual(decodeJpegJs(bytes), { width: want.width, height: want.height, sha256: want.rgbaSha256 });
  });
}

// The checks above catch what they claim to (sabotage), on the smallest
// photo in public/: baseline, two DQT segments, an ICC profile.
const sample = read('public/lessons/vehicles/longmarch2d.jpg');
const segmentOf = (bytes, marker) => jpegSegments(bytes).segments.find((s) => s.marker === marker);

test('a changed quantisation value changes the metadata hash and the pixels', () => {
  const sabotaged = Buffer.from(sample);
  sabotaged[segmentOf(sabotaged, 0xdb).start + 5] ^= 1; // the first table's first value
  assert.notEqual(jpegMetadata(sabotaged).sha256, jpegMetadata(sample).sha256);
  assert.notEqual(decodeJpegJs(sabotaged).sha256, decodeJpegJs(sample).sha256);
});

test('a changed ICC byte changes the metadata hash, which the pixels alone would miss', () => {
  const sabotaged = Buffer.from(sample);
  const icc = segmentOf(sabotaged, 0xe2);
  sabotaged[icc.end - 1] ^= 1;
  assert.notEqual(jpegMetadata(sabotaged).sha256, jpegMetadata(sample).sha256);
  assert.equal(decodeJpegJs(sabotaged).sha256, decodeJpegJs(sample).sha256);
});

test('a changed byte in the coded data changes the pixels', () => {
  const sabotaged = Buffer.from(sample);
  const scan = segmentOf(sabotaged, 0xda);
  let at = scan.end + Math.floor((sabotaged.length - scan.end) / 2);
  while (sabotaged[at - 1] === 0xff || sabotaged[at] === 0xff) at += 1; // not a marker or stuffed byte: keeps the marker structure
  sabotaged[at] = sabotaged[at] === 0x7f ? 0x7e : 0x7f;
  assert.equal(jpegMetadata(sabotaged).sha256, jpegMetadata(sample).sha256);
  let pixels;
  try { pixels = decodeJpegJs(sabotaged).sha256; } catch { pixels = 'undecodable'; }
  assert.notEqual(pixels, decodeJpegJs(sample).sha256);
});

test('two DQT segments written as one keep the metadata hash (the regrouping an encoder may do)', () => {
  const dqt = jpegSegments(sample).segments.filter((s) => s.marker === 0xdb);
  assert.equal(dqt.length, 2);
  const tables = Buffer.concat(dqt.map((s) => sample.subarray(s.start + 4, s.end)));
  const merged = Buffer.concat([
    sample.subarray(0, dqt[0].start),
    Buffer.from([0xff, 0xdb, (tables.length + 2) >> 8, (tables.length + 2) & 0xff]), tables,
    sample.subarray(dqt[0].end, dqt[1].start),
    sample.subarray(dqt[1].end),
  ]);
  assert.equal(jpegSegments(merged).segments.filter((s) => s.marker === 0xdb).length, 1);
  assert.equal(jpegMetadata(merged).sha256, jpegMetadata(sample).sha256);
  assert.equal(decodeJpegJs(merged).sha256, decodeJpegJs(sample).sha256);
});
