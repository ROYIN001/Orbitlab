/**
 * One text cell of a CSV export, written so a spreadsheet opens it as the
 * same text. The one writer of a text cell for every CSV the app exports: the
 * flight data (`ui/csv.ts`), the Monte Carlo set (`physics/monte-carlo.ts`) and
 * the lesson re-check (`lessons/recheck.ts`). Numbers are not text cells:
 * each export formats its own and writes them as they are, a minus sign and all.
 *
 * - Quoted when it holds a comma, a quote, a carriage return or a line feed
 *   (a spreadsheet ends a row at a bare `\r` as at `\n`).
 * - D-45 (owner, 2026-10-05): a text cell starting with = + - or @ gets a
 *   leading ', so a spreadsheet keeps it as text instead of running it as a
 *   formula. Nothing else is changed.
 *
 * DOM-free and dependency-free, so the simulation core may use it.
 */
export function csvText(v: string): string {
  const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
