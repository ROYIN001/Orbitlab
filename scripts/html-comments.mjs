/**
 * index.html's comments are for the people who read the source; the built
 * page every visitor downloads and the app precaches leaves them out (D-38
 * offset for the G2 layout fix, F5). Used by vite.config.ts at build time;
 * tests/verification/html-comments.test.mjs checks that it changes nothing
 * else.
 */

/** Every comment, as [start, end) offsets into `html`. */
export function htmlComments(html) {
  const spans = [];
  const re = /<!--[\s\S]*?-->/g;
  for (let m; (m = re.exec(html));) spans.push([m.index, m.index + m[0].length]);
  return spans;
}

/**
 * The page without its comments. Only the comment itself goes; the whitespace
 * around it stays, so no two elements or words that were apart come together.
 */
export function stripHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}
