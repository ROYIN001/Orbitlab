/**
 * A CSV with names in it as a spreadsheet reads it (task W): a UTF-8 byte
 * order mark first. Without it Excel opens a CSV in the computer's own code
 * page, and a Thai or Russian student's name in the check page's CSV
 * («สมชาย ใจดี», «Иван Петров») comes out as other characters. Google
 * Sheets and LibreOffice read the mark and drop it.
 */
export const spreadsheetCsv = (csv: string): string => `\ufeff${csv}`;

/** Hand the user a file: the one way every export in the app saves (CSV, PNG, reports, missions). */
export function downloadBlob(blob: Blob, filename: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
