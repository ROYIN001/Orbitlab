/**
 * index.html's comments and line indentation are for the people who read the
 * source; the built page every visitor downloads and the app precaches leaves
 * them out (builtPage; D-38 offsets for the G2 layout fix, F5, and redesign A).
 * Used by vite.config.ts at build time; tests/verification/html-comments.test.mjs
 * checks that the layout sees nothing else.
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

/**
 * The built page: no comments, and no indentation at the start of a line (a
 * line break stays wherever one was). index.html has nothing whitespace-
 * sensitive (tests/verification/html-comments.test.mjs).
 */
export function builtPage(html) {
  return stripHtmlComments(html).replace(/\n[ \t]+/g, '\n');
}
