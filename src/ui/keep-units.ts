/**
 * A sentence's numbers kept with their units on a narrow screen (task W,
 * Phase 4's last check: on a 375 px phone the Russian notes read
 * "потоке 1361 | Вт/м²" and "0,0189 м²/ | кг"). A number the sentence
 * itself writes was free to end a line, and a unit with a slash broke after
 * the slash. So the space after a digit becomes a no-break space, and a
 * slash between two letters takes a word joiner (U+2060), which nothing
 * shows. Both leave the text as it reads and as it copies.
 *
 * Its own module, with no imports, so the lesson strip (T01, T03: a pack's
 * brief "3.5 m²", a debrief's "5 400 times") uses it without pulling the
 * satellite builder's text into the lessons' chunk.
 */
export const keepUnits = (s: string): string =>
  s.replace(/(\d) (?=\S)/g, '$1 ').replace(/(?<=[^\s\d/])\/(?=[^\s\d/])/g, '/⁠');
