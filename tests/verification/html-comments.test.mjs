import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { htmlComments, stripHtmlComments } from '../../scripts/html-comments.mjs';

const source = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

/** Tags and the text between them, whitespace runs collapsed to one space (as the page lays text out). */
function tokens(html) {
  return html.split(/(<[^>]*>)/).map((part) => part.replace(/\s+/g, ' ')).filter((part) => part !== '' && part !== ' ');
}

test('every comment in index.html sits between elements, never inside text, a script, a style or a tag', () => {
  const spans = htmlComments(source);
  assert.ok(spans.length > 0, 'index.html has comments to strip');
  for (const [start, end] of spans) {
    const before = source.slice(0, start).replace(/\s+$/, '');
    const after = source.slice(end).replace(/^\s+/, '');
    const where = `comment at offset ${start}: ${source.slice(start, start + 60)}`;
    assert.ok(before.endsWith('>'), `${where} does not follow a tag`);
    assert.ok(after.startsWith('<'), `${where} is not followed by a tag`);
    const open = (tag) => (before.match(new RegExp(`<${tag}[\\s>]`, 'gi')) ?? []).length - (before.match(new RegExp(`</${tag}>`, 'gi')) ?? []).length;
    for (const tag of ['script', 'style', 'textarea', 'title', 'template']) assert.equal(open(tag), 0, `${where} is inside <${tag}>`);
  }
});

test('the built page is the source without its comments and nothing else', () => {
  const built = stripHtmlComments(source);
  assert.equal(htmlComments(built).length, 0, 'a comment is left');
  // the source with its comments cut out by offset, independently of the replacement
  let cut = '';
  let at = 0;
  for (const [start, end] of htmlComments(source)) { cut += source.slice(at, start); at = end; }
  cut += source.slice(at);
  assert.equal(built, cut);
  // same tags in the same order, same text: whitespace kept where a comment stood
  assert.deepEqual(tokens(built), tokens(cut));
  assert.ok(source.length - built.length > 2000, `strips ${source.length - built.length} bytes`);
  assert.match(built, /^<!doctype html>/i, 'the doctype is kept');
});
